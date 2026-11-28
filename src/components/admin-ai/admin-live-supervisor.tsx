'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Send,
  Sparkles,
  ShoppingCart,
  Layers,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Loader2,
  Compass,
  PackageX,
  Search,
  ExternalLink,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ActionConfirmationCard } from './action-confirmation-card';
import type { AdminActionProposal } from '@/app/api/admin-ai/chat/route';
import {
  getAdminAiContext,
  getSupplierRateRequests,
  getSupplierApplications,
} from '@/lib/admin-actions';
import {
  getClientInstantOrders,
  getClientInstantMarbles,
  getClientInstantFixingMaterials,
} from '@/lib/instant-catalog';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

interface AdminOrderItem {
  id: string;
  customerName: string;
  customerPhone?: string;
  marbleName: string;
  quantity?: number;
  totalPrice: number;
  status: string;
  date: string;
}

interface AdminStockItem {
  itemType: 'marble' | 'fixing_material';
  id: string;
  name: string;
  category: string;
  pricePKR: number;
  stockStatus: string;
  onSale?: boolean;
  discount?: number;
  isHidden?: boolean;
  imageUrl?: string;
}

interface AdminLiveSupervisorProps {
  compact?: boolean;
  onNewOrderAlertCountChange?: (count: number) => void;
  onNavigate?: () => void;
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

function toMillis(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().getTime() || 0;
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function playOrderChime() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const playTone = (freq: number, startOffset: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + dur);
    };
    playTone(587.33, 0, 0.16);
    playTone(880, 0.14, 0.24);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore autoplay restriction errors
  }
}

export function AdminLiveSupervisor({
  compact = false,
  onNewOrderAlertCountChange,
  onNavigate,
}: AdminLiveSupervisorProps) {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const firestore = useFirestore();

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [activeOrders, setActiveOrders] = useState<AdminOrderItem[]>([]);
  const [activeStockItems, setActiveStockItems] = useState<AdminStockItem[]>([]);
  const [activeProposal, setActiveProposal] = useState<AdminActionProposal | null>(null);
  const [lastNavLabel, setLastNavLabel] = useState<string | null>(null);
  const [latestOrderAlert, setLatestOrderAlert] = useState<AdminOrderItem | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [isRefreshingState, setIsRefreshingState] = useState(false);

  const [stats, setStats] = useState({
    pendingOrders: 0,
    totalOrders: 0,
    outOfStock: 0,
    limitedStock: 0,
    pendingRequests: 0,
  });

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
  const pathnameRef = useRef(pathname);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersInitializedRef = useRef<boolean>(false);
  const latestAdminStateRef = useRef<Record<string, any>>({});
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'page_context',
          currentAdminPath: pathname,
        })
      );
    }
  }, [pathname]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    onNewOrderAlertCountChange?.(unreadAlerts);
  }, [unreadAlerts, onNewOrderAlertCountChange]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, activeOrders, activeStockItems, activeProposal, latestOrderAlert]);

  const recomputeStatsFromState = useCallback((stateObj: Record<string, any>) => {
    const orders: AdminOrderItem[] = Array.isArray(stateObj.orders) ? stateObj.orders : [];
    const marbles: any[] = Array.isArray(stateObj.marbles) ? stateObj.marbles : [];
    const fixings: any[] = Array.isArray(stateObj.fixingMaterials) ? stateObj.fixingMaterials : [];
    const requests: any[] = Array.isArray(stateObj.rateRequests) ? stateObj.rateRequests : [];
    const apps: any[] = Array.isArray(stateObj.partnerApplications)
      ? stateObj.partnerApplications
      : [];

    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const outOfStock =
      marbles.filter((m) => m.stockStatus === 'out_of_stock').length +
      fixings.filter((f) => f.stockStatus === 'out_of_stock').length;
    const limitedStock =
      marbles.filter((m) => m.stockStatus === 'limited_stock').length +
      fixings.filter((f) => f.stockStatus === 'limited_stock').length;
    const pendingRequests =
      requests.filter((r) => !r.status || r.status === 'pending').length +
      apps.filter((a) => !a.status || a.status === 'pending').length;

    setStats({
      pendingOrders,
      totalOrders: orders.length,
      outOfStock,
      limitedStock,
      pendingRequests,
    });
  }, []);

  const handleIncomingOrdersList = useCallback(
    (incomingOrders: AdminOrderItem[]) => {
      const sorted = [...incomingOrders].sort(
        (a, b) => toMillis(b.date) - toMillis(a.date)
      );

      if (!ordersInitializedRef.current) {
        sorted.forEach((o) => knownOrderIdsRef.current.add(o.id));
        ordersInitializedRef.current = true;
      } else {
        const brandNewOrders = sorted.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (brandNewOrders.length > 0) {
          brandNewOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
          const newest = brandNewOrders[0];
          setLatestOrderAlert(newest);
          setUnreadAlerts((c) => c + brandNewOrders.length);
          playOrderChime();

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'new_order_alert',
                order: newest,
              })
            );
          }
        }
      }

      latestAdminStateRef.current = {
        ...latestAdminStateRef.current,
        orders: sorted,
      };
      recomputeStatsFromState(latestAdminStateRef.current);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'admin_sync',
            adminState: { orders: sorted },
          })
        );
      }
    },
    [recomputeStatsFromState]
  );

  const syncFullAdminContext = useCallback(async () => {
    setIsRefreshingState(true);
    try {
      const instantOrders = getClientInstantOrders() as AdminOrderItem[];
      const instantMarbles = getClientInstantMarbles();
      const instantFixings = getClientInstantFixingMaterials();

      if (Object.keys(latestAdminStateRef.current).length === 0) {
        latestAdminStateRef.current = {
          orders: instantOrders,
          marbles: instantMarbles,
          fixingMaterials: instantFixings,
          currentAdminPath: pathnameRef.current,
        };
        recomputeStatsFromState(latestAdminStateRef.current);
      }

      const [ctx, rateRequests, partnerApplications] = await Promise.all([
        getAdminAiContext().catch(() => null),
        getSupplierRateRequests(40).catch(() => []),
        getSupplierApplications().catch(() => []),
      ]);

      const mergedOrders =
        ctx?.orders && ctx.orders.length > 0 ? (ctx.orders as AdminOrderItem[]) : instantOrders;

      const nextState = {
        orders: mergedOrders,
        marbles: ctx?.marbles || instantMarbles,
        fixingMaterials: ctx?.fixingMaterials || instantFixings,
        suppliers: ctx?.suppliers || [],
        serviceProviders: ctx?.serviceProviders || [],
        missedSearches: ctx?.missedSearches || [],
        buildRatesSummary: ctx?.buildRatesSummary || {},
        dailyRates: ctx?.dailyRates || {},
        rateRequests,
        partnerApplications,
        currentAdminPath: pathnameRef.current,
      };

      if (!isMountedRef.current) return;
      latestAdminStateRef.current = nextState;
      handleIncomingOrdersList(mergedOrders);
      recomputeStatsFromState(nextState);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'admin_sync',
            adminState: nextState,
          })
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshingState(false);
      }
    }
  }, [handleIncomingOrdersList, recomputeStatsFromState]);

  useEffect(() => {
    syncFullAdminContext();

    let unsubscribeOrders: (() => void) | null = null;
    if (firestore) {
      try {
        unsubscribeOrders = onSnapshot(
          collection(firestore, 'orders'),
          (snapshot) => {
            const liveOrders: AdminOrderItem[] = snapshot.docs.map((d) => {
              const data = d.data() as Record<string, any>;
              return {
                id: data.id || d.id,
                customerName: data.customerName || 'Customer',
                customerPhone: data.calculationDetails?.customerInfo?.phone || '',
                marbleName: data.marbleName || 'Marble Order',
                quantity: Number(data.quantity) || 0,
                totalPrice: Number(data.totalPrice) || 0,
                status: data.status || 'Pending',
                date: data.date || new Date().toISOString(),
              };
            });
            if (liveOrders.length > 0) {
              handleIncomingOrdersList(liveOrders);
            }
          },
          () => {}
        );
      } catch {
        // Ignore offline fallback
      }
    }

    const handleOrdersUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail && detail.id && detail.customerName) {
        const current = (latestAdminStateRef.current.orders || []) as AdminOrderItem[];
        const exists = current.some((o) => o.id === detail.id);
        const updated = exists
          ? current.map((o) => (o.id === detail.id ? { ...o, ...detail } : o))
          : [detail as AdminOrderItem, ...current];
        handleIncomingOrdersList(updated);
      } else {
        syncFullAdminContext();
      }
    };

    const handleProductsUpdated = () => {
      syncFullAdminContext();
    };

    window.addEventListener('orders_updated', handleOrdersUpdated);
    window.addEventListener('products_updated', handleProductsUpdated);
    return () => {
      unsubscribeOrders?.();
      window.removeEventListener('orders_updated', handleOrdersUpdated);
      window.removeEventListener('products_updated', handleProductsUpdated);
    };
  }, [firestore, handleIncomingOrdersList, syncFullAdminContext]);

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
    if (!chunk) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && role !== 'system') {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: `${last.text}${chunk}` };
        return updated;
      }
      return [
        ...prev.slice(-24),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text: chunk.trimStart(),
        },
      ];
    });
  }, []);

  const playPcm24kChunk = useCallback((base64Audio: string) => {
    try {
      const outCtx = outputAudioCtxRef.current;
      if (!outCtx || outCtx.state === 'closed') return;

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
        if (activeSourcesRef.current.size === 0 && isMountedRef.current) {
          setIsModelSpeaking(false);
        }
      };

      source.start(startAt);
    } catch {
      // Ignore audio decoding/playback frame errors cleanly
    }
  }, []);

  const startLiveSession = useCallback(
    async (initialCommand?: string) => {
      if (status === 'connecting' || status === 'connected') {
        if (initialCommand && wsRef.current?.readyState === WebSocket.OPEN) {
          appendTranscript('user', initialCommand);
          wsRef.current.send(JSON.stringify({ type: 'text', text: initialCommand }));
        }
        return;
      }

      setErrorMessage(null);
      setStatus('connecting');
      setUnreadAlerts(0);

      try {
        const OutputAudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!OutputAudioCtx) {
          throw new Error('Audio playback is not supported in this browser.');
        }
        let outCtx: AudioContext;
        try {
          outCtx = new OutputAudioCtx({ sampleRate: 24000 });
        } catch {
          outCtx = new OutputAudioCtx();
        }
        if (outCtx.state === 'suspended') {
          await outCtx.resume().catch(() => {});
        }
        outputAudioCtxRef.current = outCtx;
        nextStartTimeRef.current = 0;

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
        } catch {
          setMicAvailable(false);
          setIsMuted(true);
          isMutedRef.current = true;
        }

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${window.location.host}/api/admin-live-ws`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'ready') {
              isConnectedRef.current = true;
              setStatus('connected');

              ws.send(
                JSON.stringify({
                  type: 'init',
                  currentAdminPath: pathnameRef.current,
                  initialCommand,
                  adminState: latestAdminStateRef.current,
                })
              );

              syncFullAdminContext();

              if (micStream) {
                try {
                  const InputAudioCtx =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                  let inCtx: AudioContext;
                  try {
                    inCtx = new InputAudioCtx({ sampleRate: 16000 });
                  } catch {
                    inCtx = new InputAudioCtx();
                  }
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
                } catch {
                  setMicAvailable(false);
                }
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
                setLastNavLabel(msg.labelUr || msg.labelEn || msg.url);
                router.push(msg.url);
                onNavigate?.();
              } else if (msg.action === 'show_orders' && Array.isArray(msg.orders)) {
                setActiveOrders(msg.orders);
              } else if (msg.action === 'show_stock_items' && Array.isArray(msg.items)) {
                setActiveStockItems(msg.items);
              } else if (msg.action === 'propose_action' && msg.proposal) {
                setActiveProposal(msg.proposal as AdminActionProposal);
              }
            } else if (msg.type === 'error') {
              setErrorMessage(msg.message || 'Admin Live Supervisor error.');
              setStatus('error');
            } else if (msg.type === 'closed') {
              cleanupSession();
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onerror = () => {
          setErrorMessage('ایڈمن لائیو وائس کنکشن قائم نہ ہو سکا۔ دوبارہ کوشش کریں۔');
          setStatus('error');
        };

        ws.onclose = () => {
          if (isConnectedRef.current) {
            cleanupSession();
          }
        };
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to start Admin Live Supervisor.');
        setStatus('error');
      }
    },
    [
      appendTranscript,
      cleanupSession,
      onNavigate,
      playPcm24kChunk,
      router,
      status,
      stopAudioPlayback,
      syncFullAdminContext,
    ]
  );

  const sendCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    if (status !== 'connected' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startLiveSession(trimmed);
      return;
    }
    appendTranscript('user', trimmed);
    wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput;
    setTextInput('');
    sendCommand(msg);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    isMutedRef.current = next;
  };

  const proposeOrderStatusQuickly = (order: AdminOrderItem, nextStatus: string) => {
    setActiveProposal({
      actionType: 'UPDATE_ORDER_STATUS',
      title: `آرڈر #${order.id} کا اسٹیٹس تبدیل کریں`,
      description: `کسٹمر "${order.customerName}" (${order.marbleName}) کا آرڈر اسٹیٹس "${order.status}" سے "${nextStatus}" پر اپ ڈیٹ کریں۔`,
      targetId: order.id,
      targetName: order.customerName,
      previousValue: order.status,
      newValue: nextStatus,
      badgeLabel: 'آرڈر اسٹیٹس اپ ڈیٹ',
      payload: {
        orderId: order.id,
        status: nextStatus,
      },
    });
  };

  const proposeStockToggleQuickly = (item: AdminStockItem, nextStock: string) => {
    setActiveProposal({
      actionType: 'UPDATE_STOCK_STATUS',
      title: `"${item.name}" کا اسٹاک اسٹیٹس بدلیں`,
      description: `پروڈکٹ "${item.name}" کا اسٹاک "${item.stockStatus}" سے "${nextStock}" پر اپ ڈیٹ کریں۔`,
      targetId: item.id,
      targetName: item.name,
      previousValue: item.stockStatus,
      newValue: nextStock,
      badgeLabel: 'اسٹاک کنٹرول',
      payload: {
        itemType: item.itemType,
        itemId: item.id,
        stockStatus: nextStock,
      },
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-slate-950 text-white overflow-hidden',
        compact ? 'h-[540px]' : 'h-[680px] rounded-2xl border border-amber-500/35 shadow-2xl'
      )}
      dir="rtl"
    >
      {/* Top Supervisor Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-l from-slate-900 via-slate-900 to-amber-950/50 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
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
                : 'bg-white/10 text-amber-400'
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
              ایڈمن لائیو سپروائزر (آرڈرز و اسٹاک نگران)
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              {status === 'connected'
                ? isModelSpeaking
                  ? 'سپروائزر بول رہا ہے...'
                  : isMuted || !micAvailable
                  ? 'مائیک میوٹ — نیچے ٹائپ کریں یا کمانڈ دبائیں'
                  : 'لائیو نگرانی جاری — حکم دیں...'
                : status === 'connecting'
                ? 'لائیو سپروائزر سے جڑ رہا ہے...'
                : 'اسٹاک، آرڈرز اور ریٹس کی نگرانی کے لیے شروع کریں'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => syncFullAdminContext()}
            disabled={isRefreshingState}
            className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
            title="Refresh live data"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshingState && 'animate-spin')} />
          </Button>
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
          {status === 'connected' ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={cleanupSession}
              className="h-8 w-8 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white"
              title="Stop Voice Supervisor"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => startLiveSession()}
              disabled={status === 'connecting'}
              className="h-8 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[11px] gap-1.5 rounded-full cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>لائیو شروع کریں</span>
            </Button>
          )}
        </div>
      </div>

      {/* Live Operations KPI Strip */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-white/10 grid grid-cols-3 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => sendCommand('تمام پینڈنگ اور نئے آرڈرز دکھائیں')}
          className="rounded-lg bg-slate-950/90 border border-white/10 hover:border-amber-400/50 px-2.5 py-1.5 text-right transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>پینڈنگ آرڈرز</span>
            <ShoppingCart className="h-3 w-3 text-amber-400" />
          </div>
          <div className="text-sm font-black text-amber-300 tabular-nums">
            {stats.pendingOrders} / {stats.totalOrders}
          </div>
        </button>

        <button
          type="button"
          onClick={() => sendCommand('آؤٹ آف اسٹاک اور کم اسٹاک آئٹمز کی لسٹ دکھائیں')}
          className="rounded-lg bg-slate-950/90 border border-white/10 hover:border-rose-400/50 px-2.5 py-1.5 text-right transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>ختم / کم اسٹاک</span>
            <PackageX className="h-3 w-3 text-rose-400" />
          </div>
          <div className="text-sm font-black text-rose-300 tabular-nums">
            {stats.outOfStock} ختم • {stats.limitedStock} کم
          </div>
        </button>

        <button
          type="button"
          onClick={() => sendCommand('سپلائر درخواستوں اور آج کی سرچز کا خلاصہ بتائیں')}
          className="rounded-lg bg-slate-950/90 border border-white/10 hover:border-sky-400/50 px-2.5 py-1.5 text-right transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>سپلائر درخواستیں</span>
            <Layers className="h-3 w-3 text-sky-400" />
          </div>
          <div className="text-sm font-black text-sky-300 tabular-nums">
            {stats.pendingRequests} زیر التوا
          </div>
        </button>
      </div>

      {/* Live Incoming Order Banner */}
      {latestOrderAlert && (
        <div className="px-3.5 py-2 bg-emerald-500/15 border-b border-emerald-500/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BellRing className="h-4 w-4 text-emerald-400 animate-bounce shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-emerald-300 truncate">
                نیا آرڈر موصول: #{latestOrderAlert.id} — {latestOrderAlert.customerName}
              </div>
              <div className="text-[10px] text-slate-200 truncate">
                {latestOrderAlert.marbleName} • PKR{' '}
                {Number(latestOrderAlert.totalPrice || 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setUnreadAlerts(0);
                router.push('/dashboard/orders');
                onNavigate?.();
              }}
              className="h-6 px-2 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            >
              آرڈرز کھولیں
            </Button>
            <button
              type="button"
              onClick={() => {
                setLatestOrderAlert(null);
                setUnreadAlerts(0);
              }}
              className="text-slate-300 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {lastNavLabel && (
        <div className="px-3.5 py-1 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-1.5 text-[11px] text-amber-200 shrink-0">
          <Compass className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="truncate">کھولا گیا صفحہ: {lastNavLabel}</span>
        </div>
      )}

      {/* Main Scrollable Area: Transcripts, Live Orders, Stock Cards & Approval Gate */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1.5 flex-1">
              <p>{errorMessage}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => startLiveSession()}
                className="h-7 px-3 bg-amber-500 text-slate-950 font-bold text-[11px]"
              >
                دوبارہ کنیکٹ کریں
              </Button>
            </div>
          </div>
        )}

        {status === 'idle' && transcripts.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-extrabold text-white">
              لائیو ایڈمن سپروائزر اسٹاک اور آرڈرز کی نگرانی کے لیے تیار ہے
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              نیا آرڈر آتے ہی یہ آپ کو آواز اور الرٹ کے ذریعے فوراً اطلاع دے گا، اسٹاک (ختم/محدود/سیل) چیک کرے گا، اور آپ کی اجازت (Confirm) کے بعد ریٹ یا آرڈر اسٹیٹس اپ ڈیٹ کرے گا۔
            </p>
            <Button
              type="button"
              onClick={() => startLiveSession()}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs gap-2 rounded-xl cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>لائیو وائس سپروائزر آن کریں</span>
            </Button>
          </div>
        )}

        {transcripts.map((entry) => (
          <div
            key={entry.id}
            className={cn('flex', entry.role === 'user' ? 'justify-end' : 'justify-start')}
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

        {/* Interactive Orders Cards */}
        {activeOrders.length > 0 && (
          <div className="rounded-xl border border-amber-500/35 bg-slate-900/95 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>لائیو آرڈرز ({activeOrders.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push('/dashboard/orders');
                    onNavigate?.();
                  }}
                  className="text-[10px] text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>آرڈرز پیج</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrders([])}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {activeOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-lg bg-slate-950/90 border border-white/10 p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        #{ord.id} • {ord.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {ord.marbleName} {ord.quantity ? `• ${ord.quantity} sq.ft` : ''}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-xs font-black text-emerald-400 tabular-nums">
                        PKR {Number(ord.totalPrice || 0).toLocaleString()}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-400/40 text-amber-200 px-1.5 py-0"
                      >
                        {ord.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ord.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => proposeOrderStatusQuickly(ord, 'In Progress')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                      >
                        In Progress کریں
                      </button>
                    )}
                    {ord.status !== 'Delivered' && ord.status !== 'Canceled' && (
                      <button
                        type="button"
                        onClick={() => proposeOrderStatusQuickly(ord, 'Delivered')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        Delivered کریں
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Stock Cards */}
        {activeStockItems.length > 0 && (
          <div className="rounded-xl border border-sky-500/35 bg-slate-900/95 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-300">
                <Layers className="h-3.5 w-3.5" />
                <span>اسٹاک و پروڈکٹس ({activeStockItems.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveStockItems([])}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {activeStockItems.slice(0, 8).map((item) => (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/90 border border-white/10 p-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded object-cover shrink-0 border border-white/10"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.category} • Rs. {Number(item.pricePKR || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        proposeStockToggleQuickly(
                          item,
                          item.stockStatus === 'out_of_stock' ? 'in_stock' : 'out_of_stock'
                        )
                      }
                      className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded cursor-pointer',
                        item.stockStatus === 'out_of_stock'
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30'
                      )}
                    >
                      {item.stockStatus === 'out_of_stock' ? 'In Stock کریں' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human Approval Gate Card */}
        {activeProposal && (
          <div className="bg-background text-foreground rounded-xl">
            <ActionConfirmationCard
              proposal={activeProposal}
              language="ur"
              onExecuted={(res) => {
                syncFullAdminContext();
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'action_completed',
                      confirmed: true,
                      actionType: activeProposal.actionType,
                      message: res.messageUr || res.messageEn || '',
                    })
                  );
                }
                setTimeout(() => setActiveProposal(null), 1600);
              }}
              onCancelled={() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'action_completed',
                      confirmed: false,
                      actionType: activeProposal.actionType,
                    })
                  );
                }
                setActiveProposal(null);
              }}
            />
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Bottom Quick Command Bar & Text Fallback */}
      <div className="p-2.5 border-t border-white/10 bg-slate-900/90 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            {
              icon: ShoppingCart,
              label: 'پینڈنگ آرڈرز',
              cmd: 'تمام پینڈنگ اور نئے آرڈرز دکھائیں',
            },
            {
              icon: PackageX,
              label: 'اسٹاک آڈٹ',
              cmd: 'اسٹاک آڈٹ کریں اور آؤٹ آف اسٹاک یا کم اسٹاک پروڈکٹس دکھائیں',
            },
            {
              icon: CheckCircle2,
              label: 'آج کا خلاصہ',
              cmd: 'ایڈمن پینل کی مکمل صورتحال، آرڈرز اور سپلائر درخواستیں بتائیں',
            },
            {
              icon: Search,
              label: 'مسڈ سرچز',
              cmd: 'کسٹمرز نے کون سے پتھر سرچ کیے جو ایپ میں نہیں ملے؟',
            },
            {
              icon: Layers,
              label: 'اسٹاک پیج',
              cmd: 'مجھے اسٹاک مینجمنٹ پیج پر لے جائیں',
            },
          ].map((btn) => {
            const IconComp = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                onClick={() => sendCommand(btn.cmd)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500/20 border border-white/10 text-[10px] font-semibold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <IconComp className="h-3 w-3 text-amber-400" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSendText} className="flex items-center gap-1.5">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="بولیں یا یہاں ایڈمن حکم لکھیں (مثلاً آرڈر #...، اسٹاک، سیل)..."
            className="h-9 bg-slate-950 border-white/15 text-xs text-white placeholder:text-slate-400"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            title="بھیجیں"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
