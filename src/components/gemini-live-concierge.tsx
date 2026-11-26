'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  X,
  Minimize2,
  Maximize2,
  Send,
  Sparkles,
  Scale,
  Compass,
  Calculator,
  Layers,
  AlertCircle,
  Loader2,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Wrench,
  UserCheck,
  Phone,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/context/language-context';
import { useCalculation } from '@/context/calculation-context';
import {
  getMarbles,
  getFixingMaterials,
  getServiceProviders,
  getRepresentatives,
  getPartnerCompanies,
  getBuildYourHomeRatesConfig,
  getRenovationRatesConfig,
  defaultRepresentatives,
  defaultPartnerCompanies,
} from '@/lib/admin-actions';
import {
  getClientInstantMarbles,
  getClientInstantFixingMaterials,
  getClientInstantServiceProviders,
  getBundledBusinessConfig,
  getBundledCostsConfig,
} from '@/lib/instant-catalog';
import { getPortalGuide, type PortalGuidePayload } from '@/lib/live-guide-data';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

interface ComparisonCardItem {
  id: string;
  name: string;
  materialType: string;
  origin: string;
  ratePerSqFt: number;
  variantLabel: string;
  estimatedTotalPKR: number;
  uses: string;
}

interface ComparisonCardData {
  areaSqFt: number;
  items: ComparisonCardItem[];
}

interface ProductPreviewItem {
  id: string;
  name: string;
  materialType: string;
  origin: string;
  imageUrl: string;
  priceRangePKR: string;
}

interface AppInfoChemicalItem {
  id: string;
  name: string;
  category: string;
  pricePKR: number;
  unit?: string;
}

interface AppInfoProviderItem {
  id: string;
  name: string;
  service: string;
  phone: string;
  jobs?: Array<{ title: string; pricePKR?: number; price?: number; unit: string }>;
}

interface AppInfoRepItem {
  id: string;
  nameEn: string;
  nameUr?: string;
  phone: string;
  regionEn: string;
}

interface ActiveAppInfoState {
  chemicals: AppInfoChemicalItem[];
  serviceProviders: AppInfoProviderItem[];
  representatives: AppInfoRepItem[];
}

function downsampleFloat32To16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return input;
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : input[start] || 0;
  }
  return result;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToPcm24kFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/representative', '/supplier'];

export function GeminiLiveConcierge() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { requirements } = useCalculation();

  const isInternalPortal = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [activeGuide, setActiveGuide] = useState<PortalGuidePayload | null>(null);
  const [activeComparison, setActiveComparison] = useState<ComparisonCardData | null>(null);
  const [activeProducts, setActiveProducts] = useState<ProductPreviewItem[]>([]);
  const [activeAppInfo, setActiveAppInfo] = useState<ActiveAppInfoState | null>(null);
  const [lastNavLabel, setLastNavLabel] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isMutedRef = useRef<boolean>(false);
  const isConnectedRef = useRef<boolean>(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const autoConnectAttemptedRef = useRef<boolean>(false);

  const pathnameRef = useRef(pathname);
  const languageRef = useRef(language);
  const reqCountRef = useRef(requirements.length);
  const requirementsRef = useRef(requirements);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    reqCountRef.current = requirements.length;
    requirementsRef.current = requirements;
  }, [requirements]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('stone_expert_welcome_dismissed') === 'true';
      if (dismissed) setIsWelcomeDismissed(true);
    }
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, activeGuide, activeComparison, activeProducts, activeAppInfo]);

  // Send updated route & quotation context whenever user navigates
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const qItems = requirements.map((r) => ({
        name: r.name,
        type: r.type,
        total: Number(r.total) || 0,
      }));
      const qTotal = qItems.reduce((sum, item) => sum + item.total, 0);
      wsRef.current.send(
        JSON.stringify({
          type: 'page_context',
          currentPath: pathname,
          quotationCount: requirements.length,
          quotationItems: qItems,
          quotationTotalPKR: qTotal,
        })
      );
    }
  }, [pathname, requirements]);

  const stopAudioPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsModelSpeaking(false);
  }, []);

  const cleanupSession = useCallback(() => {
    isConnectedRef.current = false;
    stopAudioPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setStatus('idle');
    setIsModelSpeaking(false);
  }, [stopAudioPlayback]);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  const appendTranscript = useCallback((role: 'user' | 'assistant' | 'system', chunk: string) => {
    const text = chunk;
    if (!text) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && role !== 'system') {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text}${text}`,
        };
        return updated;
      }
      return [
        ...prev.slice(-24),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: text.trimStart(),
        },
      ];
    });
  }, []);

  const playPcm24kChunk = useCallback((base64Audio: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    if (outCtx.state === 'suspended') {
      outCtx.resume().catch(() => {});
    }

    const float32 = base64ToPcm24kFloat32(base64Audio);
    if (float32.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startAt = Math.max(now + 0.01, nextStartTimeRef.current);
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    setIsModelSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsModelSpeaking(false);
      }
    };

    source.start(startAt);
  }, []);

  const startLiveSession = useCallback(
    async (initialTopic?: string) => {
      if (status === 'connecting' || status === 'connected') {
        if (initialTopic && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'text', text: initialTopic }));
        }
        setIsDrawerOpen(true);
        return;
      }

      setErrorMessage(null);
      setStatus('connecting');
      setIsDrawerOpen(true);
      setIsWelcomeDismissed(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('stone_expert_welcome_dismissed', 'true');
      }

      try {
        // Create 24kHz playback context inside user gesture
        const OutputAudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const outCtx = new OutputAudioCtx({ sampleRate: 24000 });
        if (outCtx.state === 'suspended') {
          await outCtx.resume().catch(() => {});
        }
        outputAudioCtxRef.current = outCtx;
        nextStartTimeRef.current = 0;

        // Capture microphone at 16kHz (or downsample if hardware forces 44.1/48kHz)
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = micStream;
          setMicAvailable(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('stone_expert_live_autostart', 'true');
          }
        } catch {
          setMicAvailable(false);
          setIsMuted(true);
          isMutedRef.current = true;
        }

        // Instant full-app catalog snapshot so Live Voice connects immediately without waiting on Firestore
        const instantMarbles = getClientInstantMarbles();
        const instantFixings = getClientInstantFixingMaterials();
        const instantProviders = getClientInstantServiceProviders();
        const instantBusinessConfig = getBundledBusinessConfig();
        const instantCostsConfig = getBundledCostsConfig();

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${window.location.host}/api/live-ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          // Wait for server 'ready' event once Gemini Live session connects
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'ready') {
              isConnectedRef.current = true;
              setStatus('connected');

              const qItems = requirementsRef.current.map((r) => ({
                name: r.name,
                type: r.type,
                total: Number(r.total) || 0,
              }));
              const qTotal = qItems.reduce((sum, item) => sum + item.total, 0);

              // Send instant full-app snapshot & trigger warm shopkeeper Welcome Note immediately
              ws.send(
                JSON.stringify({
                  type: 'init',
                  currentPath: pathnameRef.current,
                  language: languageRef.current,
                  quotationCount: reqCountRef.current,
                  initialTopic,
                  catalog: {
                    marbles: instantMarbles,
                    fixingMaterials: instantFixings,
                    serviceProviders: instantProviders,
                    representatives: defaultRepresentatives,
                    partnerCompanies: defaultPartnerCompanies,
                    costsConfig: instantCostsConfig,
                    businessConfig: instantBusinessConfig,
                    quotationItems: qItems,
                    quotationTotalPKR: qTotal,
                  },
                })
              );

              // Refresh latest live Firestore prices, providers, reps, partners & build/renovation rates silently
              Promise.all([
                getMarbles().catch(() => null),
                getFixingMaterials().catch(() => null),
                getServiceProviders().catch(() => null),
                getRepresentatives().catch(() => null),
                getPartnerCompanies().catch(() => null),
                getBuildYourHomeRatesConfig().catch(() => null),
                getRenovationRatesConfig().catch(() => null),
              ]).then(
                ([
                  freshMarbles,
                  freshFixings,
                  freshProviders,
                  freshReps,
                  freshPartners,
                  freshBuild,
                  freshRenovation,
                ]) => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(
                      JSON.stringify({
                        type: 'catalog_sync',
                        catalog: {
                          marbles: freshMarbles || instantMarbles,
                          fixingMaterials: freshFixings || instantFixings,
                          serviceProviders: freshProviders || instantProviders,
                          representatives: freshReps || defaultRepresentatives,
                          partnerCompanies: freshPartners || defaultPartnerCompanies,
                          buildYourHome: freshBuild || undefined,
                          renovation: freshRenovation || undefined,
                        },
                      })
                    );
                  }
                }
              );

              // Start mic streaming once Gemini Live session is ready
              if (micStream) {
                const InputAudioCtx =
                  window.AudioContext ||
                  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                const inCtx = new InputAudioCtx({ sampleRate: 16000 });
                inputAudioCtxRef.current = inCtx;

                const source = inCtx.createMediaStreamSource(micStream);
                const processor = inCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                source.connect(processor);
                processor.connect(inCtx.destination);

                processor.onaudioprocess = (e) => {
                  if (!isConnectedRef.current || isMutedRef.current) return;
                  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                  const rawChannel = e.inputBuffer.getChannelData(0);
                  const downsampled = downsampleFloat32To16k(rawChannel, inCtx.sampleRate);
                  const base64 = float32ToPcm16Base64(downsampled);
                  wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64 }));
                };
              }
            } else if (msg.type === 'audio' && msg.audio) {
              playPcm24kChunk(msg.audio);
            } else if (msg.type === 'interrupted') {
              stopAudioPlayback();
            } else if (msg.type === 'inputTranscript' && msg.text) {
              appendTranscript('user', msg.text);
            } else if (msg.type === 'outputTranscript' && msg.text) {
              appendTranscript('assistant', msg.text);
            } else if (msg.type === 'ui_action') {
              if (msg.action === 'navigate' && msg.url) {
                setLastNavLabel(languageRef.current === 'ur' ? msg.labelUr : msg.labelEn);
                if (msg.guideTopic) {
                  setActiveGuide(getPortalGuide(msg.guideTopic));
                }
                router.push(msg.url);

                // Ensure same-page scroll targets (e.g. Imported Marble row or Products grid) scroll cleanly into view
                if (msg.scrollTarget && typeof document !== 'undefined') {
                  const targetId = String(msg.scrollTarget);
                  setTimeout(() => {
                    const el = document.getElementById(targetId);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 260);
                }

                // Auto-minimize drawer on small screens or full-screen photo/product navigation
                // so the stone photo/page opens unobstructed right in front of the customer
                if (
                  typeof window !== 'undefined' &&
                  (msg.openLightbox ||
                    (msg.shouldMinimizeDrawer &&
                      (window.innerWidth < 1024 || String(msg.url).startsWith('/product-detail/'))))
                ) {
                  setIsDrawerOpen(false);
                }
              } else if (msg.action === 'show_products' && Array.isArray(msg.products)) {
                setActiveProducts(msg.products);
              } else if (msg.action === 'show_app_info') {
                setActiveAppInfo({
                  chemicals: Array.isArray(msg.chemicals) ? msg.chemicals : [],
                  serviceProviders: Array.isArray(msg.serviceProviders) ? msg.serviceProviders : [],
                  representatives: Array.isArray(msg.representatives) ? msg.representatives : [],
                });
              } else if (msg.action === 'show_comparison' && msg.comparison) {
                setActiveComparison(msg.comparison);
              } else if (msg.action === 'show_guide' && msg.topic) {
                setActiveGuide(getPortalGuide(msg.topic));
              } else if (msg.action === 'set_language' && (msg.language === 'ur' || msg.language === 'en')) {
                setLanguage(msg.language);
              }
            } else if (msg.type === 'error') {
              setErrorMessage(msg.message || 'Live voice session encountered an error.');
              setStatus('error');
            } else if (msg.type === 'closed') {
              cleanupSession();
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          setErrorMessage(
            languageRef.current === 'ur'
              ? 'لائیو وائس کنکشن قائم نہ ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔'
              : 'Could not connect to Live Voice server. Please try again.'
          );
          setStatus('error');
        };

        ws.onclose = () => {
          if (isConnectedRef.current) {
            cleanupSession();
          }
        };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to initialize Live Voice session.');
        setStatus('error');
      }
    },
    [
      appendTranscript,
      cleanupSession,
      playPcm24kChunk,
      router,
      setLanguage,
      status,
      stopAudioPlayback,
    ]
  );

  // Auto-connect if visitor previously opted in and browser mic permission is already granted
  useEffect(() => {
    if (isInternalPortal || autoConnectAttemptedRef.current) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('stone_expert_live_autostart') !== 'true') return;

    autoConnectAttemptedRef.current = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted') {
            startLiveSession();
          }
        })
        .catch(() => {});
    }
  }, [isInternalPortal, startLiveSession]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed) return;
    setTextInput('');

    if (status !== 'connected' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startLiveSession(trimmed);
      return;
    }

    appendTranscript('user', trimmed);
    wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
  };

  const dismissWelcomeCard = () => {
    setIsWelcomeDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('stone_expert_welcome_dismissed', 'true');
    }
  };

  if (isInternalPortal) return null;

  const isUr = language === 'ur';

  return (
    <>
      {/* Welcome Note Prompt Card on first portal entry */}
      <AnimatePresence>
        {!isDrawerOpen && !isWelcomeDismissed && status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-4 left-4 z-50 w-[92vw] max-w-[370px] rounded-2xl border border-amber-500/40 bg-slate-950/95 text-white shadow-2xl backdrop-blur-md p-4"
            dir={isUr ? 'rtl' : 'ltr'}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                  <Volume2 className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-amber-400">
                      {isUr ? 'جیمنی لائیو دکاندار گائیڈ' : 'Gemini Live Concierge'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold leading-snug text-white">
                    {isUr
                      ? 'السلام علیکم! سٹون ایکسپرٹ میں خوش آمدید'
                      : 'Welcome to Stone Expert Portal!'}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissWelcomeCard}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Minimize welcome card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
              {isUr
                ? 'آپ کو ماربل، گرینائٹ، کچن، سیڑھیوں کا ریٹ چاہیے یا قیمتوں کا موازنہ کرنا ہے؟ بات شروع کریں — میں آپ کو درست پیج پر لے جا کر پورا طریقہ سمجھاؤں گا۔'
                : 'Looking for Marble, Granite, Kitchen/Stair calculators, or price comparisons? Talk live to get instant navigation and step-by-step guidance.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: isUr ? 'ماربل و گرینائٹ' : 'Marble & Granite', topic: 'مجھے ماربل اور گرینائٹ دکھائیں اور ریٹ بتائیں' },
                { label: isUr ? 'کچن / سیڑھی حساب' : 'Calculators', topic: 'مجھے کچن اور سیڑھیوں کے کیلکولیٹر کا طریقہ بتائیں' },
                { label: isUr ? 'قیمتوں کا موازنہ' : 'Compare Rates', topic: 'مجھے ماربل اور گرینائٹ کا کمپیریزن کر کے دکھائیں' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => startLiveSession(chip.topic)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/50 text-amber-200 transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={() => startLiveSession()}
              className="mt-3 w-full h-10 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs gap-2 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>
                {isUr ? 'لائیو وائس گفتگو شروع کریں' : 'Start Live Voice Conversation'}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Floating Trigger Pill when Welcome Card is dismissed or Drawer is minimized */}
      {!isDrawerOpen && (isWelcomeDismissed || status !== 'idle') && (
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            type="button"
            onClick={() => {
              if (status === 'idle') {
                startLiveSession();
              } else {
                setIsDrawerOpen(true);
              }
            }}
            className={cn(
              'h-11 px-4 rounded-full shadow-2xl border-2 gap-2 transition-all cursor-pointer',
              status === 'connected'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 animate-pulse'
                : 'bg-slate-950 hover:bg-slate-900 text-amber-300 border-amber-500/60 hover:scale-105'
            )}
          >
            {status === 'connecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'connected' ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="text-xs font-extrabold">
              {status === 'connected'
                ? isModelSpeaking
                  ? isUr
                    ? 'گائیڈ بول رہا ہے...'
                    : 'Guide Speaking...'
                  : isUr
                    ? 'لائیو وائس آن ہے'
                    : 'Live Voice Active'
                : isUr
                  ? 'لائیو صوتی گائیڈ'
                  : 'Live Voice Guide'}
            </span>
          </Button>
        </div>
      )}

      {/* Expanded Live Voice Concierge Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 z-50 w-[93vw] sm:w-[410px] max-h-[82vh] flex flex-col rounded-2xl border border-amber-500/40 bg-slate-950/95 text-white shadow-2xl backdrop-blur-md overflow-hidden"
            dir={isUr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                    status === 'connected'
                      ? isModelSpeaking
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-emerald-500 text-slate-950'
                      : status === 'connecting'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                  )}
                >
                  {status === 'connecting' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : status === 'connected' ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-amber-400 truncate">
                    {isUr ? 'سٹون ایکسپرٹ لائیو گائیڈ' : 'Stone Expert Live Voice'}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {status === 'connecting'
                      ? isUr
                        ? 'کنکشن قائم ہو رہا ہے...'
                        : 'Connecting to Gemini Live...'
                      : status === 'connected'
                        ? isModelSpeaking
                          ? isUr
                            ? 'جواب دے رہے ہیں...'
                            : 'Speaking...'
                          : isMuted || !micAvailable
                            ? isUr
                              ? 'مائیک میوٹ ہے (ٹائپ کریں)'
                              : 'Mic muted (type below)'
                            : isUr
                              ? 'آپ کی بات سنی جا رہی ہے...'
                              : 'Listening to you...'
                        : status === 'error'
                          ? isUr
                            ? 'کنکشن میں مسئلہ'
                            : 'Connection Error'
                          : isUr
                            ? 'بند ہے'
                            : 'Disconnected'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {status === 'connected' && micAvailable && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className={cn(
                      'h-8 w-8 rounded-full',
                      isMuted
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                {status === 'connected' && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={cleanupSession}
                    className="h-8 w-8 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white"
                    title={isUr ? 'گفتگو ختم کریں' : 'End Voice Call'}
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsDrawerOpen(false)}
                  className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                  title={isUr ? 'چھوٹا کریں' : 'Minimize'}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Active Page / Action Strip */}
            {lastNavLabel && (
              <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-1.5 text-[11px] text-amber-200">
                <Compass className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="truncate">
                  {isUr ? `موجودہ صفحہ: ${lastNavLabel}` : `Opened: ${lastNavLabel}`}
                </span>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="m-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-2 flex-1">
                  <p>{errorMessage}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startLiveSession()}
                    className="h-7 px-3 bg-amber-500 text-slate-950 font-bold text-[11px]"
                  >
                    {isUr ? 'دوبارہ کوشش کریں' : 'Retry Connection'}
                  </Button>
                </div>
              </div>
            )}

            {/* Visual Guide / Comparison Cards + Live Transcripts */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[340px] min-h-[180px]">
              {!micAvailable && status === 'connected' && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                  {isUr
                    ? 'مائیکروفون کی اجازت نہیں ملی — آپ آواز سن سکتے ہیں اور نیچے لکھ کر بات جاری رکھ سکتے ہیں۔'
                    : 'Microphone permission unavailable — you can still hear voice responses and type messages below.'}
                </div>
              )}

              {transcripts.length === 0 && status === 'connecting' && (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-400" />
                  <p>
                    {isUr
                      ? 'سٹون ایکسپرٹ لائیو وائس شروع ہو رہی ہے...'
                      : 'Starting Stone Expert Live Voice...'}
                  </p>
                </div>
              )}

              {transcripts.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex',
                    entry.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                      entry.role === 'user'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-900 border border-white/10 text-slate-100'
                    )}
                  >
                    {entry.text}
                  </div>
                </div>
              ))}

              {/* Interactive Stone Preview Cards with Photo + Direct Page/Lightbox Links */}
              {activeProducts.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span>
                        {isUr ? 'منتخب ماربل و گرینائٹ' : 'Matched Stones'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveProducts([])}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {activeProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center gap-2.5 rounded-lg bg-slate-950/85 border border-white/10 p-2"
                      >
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-md object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {prod.origin} • {prod.materialType} • {prod.priceRangePKR}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDrawerOpen(false);
                                router.push(`/product-detail/${encodeURIComponent(prod.id)}`);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                            >
                              {isUr ? 'مکمل صفحہ کھولیں' : 'View Page'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDrawerOpen(false);
                                router.push(`/product-detail/${encodeURIComponent(prod.id)}?lightbox=1`);
                              }}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 text-amber-200 hover:bg-white/20 cursor-pointer"
                            >
                              {isUr ? 'بڑی تصویر' : 'Full Photo'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Material Comparison Card */}
              {activeComparison && activeComparison.items.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-slate-900/95 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Scale className="h-3.5 w-3.5" />
                      <span>
                        {isUr
                          ? `قیمتوں کا موازنہ (${activeComparison.areaSqFt} Sq.Ft)`
                          : `Price Comparison (${activeComparison.areaSqFt} Sq.Ft)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveComparison(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {activeComparison.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/80 border border-white/10 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.origin} • {item.materialType} • Rs. {item.ratePerSqFt}/sqft
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <div className="text-xs font-extrabold text-emerald-400">
                            Rs. {item.estimatedTotalPKR.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDrawerOpen(false);
                                router.push(`/product-detail/${encodeURIComponent(item.id)}`);
                              }}
                              className="text-[10px] text-sky-300 hover:underline cursor-pointer"
                            >
                              {isUr ? 'تصویر / تفصیل' : 'Photo'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDrawerOpen(false);
                                router.push(`/order/${encodeURIComponent(item.id)}?calc=simple`);
                              }}
                              className="text-[10px] text-amber-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isUr ? 'حساب لگائیں' : 'Calculate'}</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Step-by-Step Guide Card */}
              {activeGuide && (
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                      <Calculator className="h-3.5 w-3.5" />
                      <span>{isUr ? activeGuide.titleUr : activeGuide.titleEn}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveGuide(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-200 leading-relaxed">
                    {(isUr ? activeGuide.stepsUr : activeGuide.stepsEn).map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Chemicals, Service Providers & Regional Representatives Card */}
              {activeAppInfo &&
                (activeAppInfo.chemicals.length > 0 ||
                  activeAppInfo.serviceProviders.length > 0 ||
                  activeAppInfo.representatives.length > 0) && (
                  <div className="rounded-xl border border-sky-500/40 bg-slate-900/95 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-300">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>
                          {isUr ? 'کیمیکلز، کاریگر اور علاقائی نمائندے' : 'Chemicals, Fixers & Representatives'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveAppInfo(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {activeAppInfo.chemicals.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                          <span>{isUr ? 'فکسنگ کیمیکلز و ٹولز' : 'Fixing Chemicals & Tools'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDrawerOpen(false);
                              router.push('/products?tab=tool_chemical');
                            }}
                            className="text-sky-300 hover:underline cursor-pointer"
                          >
                            {isUr ? 'سب دیکھیں' : 'View All'}
                          </button>
                        </div>
                        {activeAppInfo.chemicals.map((ch) => (
                          <div
                            key={ch.id}
                            className="flex items-center justify-between text-[11px] rounded-lg bg-slate-950/80 border border-white/10 px-2.5 py-1.5"
                          >
                            <span className="font-semibold text-white truncate">{ch.name}</span>
                            <span className="font-bold text-emerald-400 shrink-0 tabular-nums">
                              Rs. {Number(ch.pricePKR || 0).toLocaleString()}/{ch.unit || 'unit'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeAppInfo.serviceProviders.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                          <span>{isUr ? 'ماہر فکسرز، پالشرز و سوزوکی' : 'Fixers, Polishers & Drivers'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDrawerOpen(false);
                              router.push('/services');
                            }}
                            className="text-sky-300 hover:underline cursor-pointer"
                          >
                            {isUr ? 'سروسز پیج' : 'Services Page'}
                          </button>
                        </div>
                        {activeAppInfo.serviceProviders.map((sp) => (
                          <div
                            key={sp.id}
                            className="rounded-lg bg-slate-950/80 border border-white/10 px-2.5 py-1.5 space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-white">{sp.name}</span>
                              <span className="text-[10px] text-amber-300">{sp.service}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-300">
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 text-emerald-400" />
                                {sp.phone}
                              </span>
                              {sp.jobs && sp.jobs[0] && (
                                <span className="text-emerald-400 font-semibold">
                                  {sp.jobs[0].title}: Rs. {sp.jobs[0].pricePKR ?? sp.jobs[0].price}/{sp.jobs[0].unit}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeAppInfo.representatives.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                          <span>{isUr ? 'علاقائی نمائندے' : 'Regional Representatives'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDrawerOpen(false);
                              router.push('/representatives');
                            }}
                            className="text-sky-300 hover:underline cursor-pointer"
                          >
                            {isUr ? 'وزٹ بک کریں' : 'Book Visit'}
                          </button>
                        </div>
                        {activeAppInfo.representatives.map((rep) => (
                          <div
                            key={rep.id}
                            className="flex items-center justify-between text-[11px] rounded-lg bg-slate-950/80 border border-white/10 px-2.5 py-1.5"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {isUr && rep.nameUr ? rep.nameUr : rep.nameEn}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{rep.regionEn}</div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                              {rep.phone}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              <div ref={scrollEndRef} />
            </div>

            {/* Quick Action Bar + Text Input Fallback */}
            <div className="p-2.5 border-t border-white/10 bg-slate-900/80 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {[
                  { icon: Layers, label: isUr ? 'ماربل ریٹ' : 'Marble', msg: 'لوکل اور امپورٹڈ ماربل کے ریٹ بتائیں' },
                  { icon: Sparkles, label: isUr ? 'گرینائٹ' : 'Granite', msg: 'کچن اور سیڑھی کے لیے گرینائٹ دکھائیں' },
                  { icon: Wrench, label: isUr ? 'کیمیکلز و کاریگر' : 'Chemicals & Fixers', msg: 'فکسنگ کیمیکلز، ٹولز اور ماہر فکسرز و پالشرز کی تفصیل دکھائیں' },
                  { icon: UserCheck, label: isUr ? 'نمائندے / بلڈ' : 'Reps & Build', msg: 'علاقائی نمائندے، بلڈ یور ہوم اور ایپ کے تمام فیچرز بتائیں' },
                  { icon: Calculator, label: isUr ? 'سیڑھی / کچن' : 'Calculators', msg: 'مجھے سیڑھیوں کے کیلکولیٹر پر لے جائیں اور طریقہ سمجھائیں' },
                  { icon: Scale, label: isUr ? 'موازنہ' : 'Compare', msg: 'زیارت وائٹ اور سنی وائٹ کا موازنہ کر کے دکھائیں' },
                ].map((q) => {
                  const IconComp = q.icon;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        if (status === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
                          appendTranscript('user', q.msg);
                          wsRef.current.send(JSON.stringify({ type: 'text', text: q.msg }));
                        } else {
                          startLiveSession(q.msg);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-amber-500/20 border border-white/10 text-[10px] font-semibold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <IconComp className="h-3 w-3 text-amber-400" />
                      <span>{q.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSendText} className="flex items-center gap-1.5">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    isUr
                      ? 'بولیں یا یہاں اپنا سوال لکھیں...'
                      : 'Speak or type your question here...'
                  }
                  className="h-9 bg-slate-950 border-white/15 text-xs text-white placeholder:text-slate-400"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950"
                  title={isUr ? 'بھیجیں' : 'Send'}
                >
                  <Send className="h-4 w-4" />
                </Button>
                {status !== 'connected' && status !== 'connecting' && (
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => startLiveSession()}
                    className="h-9 w-9 shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    title={isUr ? 'لائیو شروع کریں' : 'Start Live Voice'}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
