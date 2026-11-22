'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Clock,
  CalendarClock,
  Sparkles,
  Send,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Save,
  Loader2,
  Power,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Smartphone,
  Flame,
  Gem,
  Tag,
  Home,
  History,
  Eye,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import {
  clearDataCaches,
  getMarbles,
  getFixingMaterials,
  getHomepageConfig,
  subscribeToAppUpdates,
} from '@/lib/admin-actions';
import { getPublicOrigin, OFFICIAL_CARD_QR_URL, OFFICIAL_CARD_QR_OPTIONS } from '@/lib/utils';
import config from '@/lib/config.json';
import type { Marble, FixingMaterial } from '@/lib/types';
import {
  type SocialAutoPostConfig,
  type SocialPlatform,
  type SocialPostSlot,
  type SocialPostType,
  type SocialPublishLogEntry,
  SOCIAL_POST_TYPE_META,
  OFFICIAL_ADDRESS_EN,
  OFFICIAL_ADDRESS_UR,
  buildDailyRoutineSlots,
  formatTime12h,
  generateSocialPostContent,
  getActiveAppMarbles,
  getDefaultSocialAutoPostConfig,
  getLocalTodayDateKey,
  getSocialAutoPostConfig,
  saveSocialAutoPostConfig,
} from '@/lib/social-autopost';

const PLATFORM_OPTIONS: Array<{
  id: SocialPlatform;
  label: string;
  labelUr: string;
  activeClass: string;
}> = [
  { id: 'facebook', label: 'Facebook', labelUr: 'فیس بک', activeClass: 'bg-blue-600 text-white border-blue-600' },
  { id: 'instagram', label: 'Instagram', labelUr: 'انسٹاگرام', activeClass: 'bg-pink-600 text-white border-pink-600' },
  { id: 'tiktok', label: 'TikTok', labelUr: 'ٹک ٹاک', activeClass: 'bg-slate-900 text-white border-slate-900' },
  { id: 'whatsapp', label: 'WhatsApp', labelUr: 'واٹس ایپ', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
];

interface SocialAccountState {
  connected: boolean;
  name: string | null;
  connectedAt: string | null;
}

interface SocialAuthStatusResponse {
  appsConfigured: {
    meta: boolean;
    tiktok: boolean;
  };
  callbackUrls: {
    meta: string;
    tiktok: string;
  };
  accounts: {
    facebook: SocialAccountState;
    instagram: SocialAccountState;
    tiktok: SocialAccountState;
  };
}

const DEFAULT_AUTH_STATUS: SocialAuthStatusResponse = {
  appsConfigured: { meta: false, tiktok: false },
  callbackUrls: { meta: '', tiktok: '' },
  accounts: {
    facebook: { connected: false, name: null, connectedAt: null },
    instagram: { connected: false, name: null, connectedAt: null },
    tiktok: { connected: false, name: null, connectedAt: null },
  },
};

export function SocialAutoPostScheduler() {
  const { toast } = useToast();

  const [schedule, setSchedule] = useState<SocialAutoPostConfig>(getDefaultSocialAutoPostConfig());
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // IMPORTANT: Start empty (NEVER pre-fill stale marbles-data.json rates) until live Firestore rates load
  const [marblesList, setMarblesList] = useState<Marble[]>([]);
  const [fixingList, setFixingList] = useState<FixingMaterial[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(true);
  const [ratesSyncedAt, setRatesSyncedAt] = useState<string>('');

  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl || '/logo.svg');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [storeUrl, setStoreUrl] = useState<string>('https://stoneexpert.net');

  const [authStatus, setAuthStatus] = useState<SocialAuthStatusResponse>(DEFAULT_AUTH_STATUS);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [setupNoticeProvider, setSetupNoticeProvider] = useState<{
    provider: 'facebook' | 'instagram' | 'tiktok';
    redirectUri: string;
  } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState<boolean>(false);
  const [publishingSlotId, setPublishingSlotId] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<string>('');

  const autoRunInFlightRef = useRef<Set<string>>(new Set());

  const refreshSocialAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/social-auth/status', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as SocialAuthStatusResponse;
        setAuthStatus(data);
      }
    } catch {
      // ignore transient errors
    }
  }, []);

  const syncLiveAppRates = useCallback(
    async (showToast: boolean = false) => {
      try {
        setIsLoadingRates(true);
        // Always bypass 30s cache so post cards display 100% live Firestore app prices
        clearDataCaches('marbles');
        clearDataCaches('fixingMaterials');
        const [liveMarbles, liveFixing] = await Promise.all([
          getMarbles().catch(() => []),
          getFixingMaterials().catch(() => []),
        ]);
        if (Array.isArray(liveMarbles)) {
          setMarblesList(liveMarbles);
        }
        if (Array.isArray(liveFixing)) {
          setFixingList(liveFixing);
        }
        setRatesSyncedAt(
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        );
        if (showToast) {
          toast({
            title: 'ایپ کے اصل ریٹس اپڈیٹ ہو گئے! (Live Rates Synced)',
            description: 'پوسٹ میں اب وہی اصل ریٹس نظر آ رہے ہیں جو آپ کی مین ایپ میں موجود ہیں۔',
          });
        }
      } finally {
        setIsLoadingRates(false);
      }
    },
    [toast]
  );

  // Initial load + subscribe to real-time app price updates + OAuth popup postMessage listener
  useEffect(() => {
    let cancelled = false;

    if (typeof window !== 'undefined') {
      setStoreUrl(getPublicOrigin() || window.location.origin);
      QRCode.toDataURL(OFFICIAL_CARD_QR_URL, {
        ...OFFICIAL_CARD_QR_OPTIONS,
        width: 200,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => {
          if (!cancelled) setQrCodeUrl(url);
        })
        .catch(() => {});
    }

    Promise.all([
      getSocialAutoPostConfig(),
      syncLiveAppRates(false),
      getHomepageConfig().catch(() => null),
      refreshSocialAuthStatus(),
    ]).then(([savedCfg, , hpCfg]) => {
      if (cancelled) return;
      setSchedule(savedCfg);
      if (savedCfg.slots.length > 0) {
        setSelectedSlotId(savedCfg.slots[0].id);
      }
      if (hpCfg?.logoUrl) {
        setLogoUrl(hpCfg.logoUrl);
      }
      setIsLoading(false);
    });

    // Keep rates 100% synced whenever admin edits any price anywhere in the app
    const unsubscribe = subscribeToAppUpdates(() => {
      syncLiveAppRates(false);
    });

    // Listen for OAuth popup completion
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setConnectingProvider(null);
        setSetupNoticeProvider(null);
        refreshSocialAuthStatus();
        toast({
          title: 'سوشل میڈیا اکاؤنٹ لاگ ان ہو گیا! (Connected)',
          description:
            event.data?.provider === 'tiktok'
              ? `TikTok (${event.data?.username ? `@${event.data.username}` : event.data?.displayName || 'Account'}) کامیابی سے منسلک ہو گیا۔`
              : `Facebook (${event.data?.pageName || 'Page'})${event.data?.instagramUsername ? ` اور Instagram (@${event.data.instagramUsername})` : ''} کامیابی سے منسلک ہو گیا!`,
        });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setConnectingProvider(null);
        toast({
          title: 'لاگ ان مکمل نہیں ہو سکا',
          description: event.data?.error || 'براہ کرم دوبارہ کوشش کریں۔',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [refreshSocialAuthStatus, syncLiveAppRates, toast]);

  const activeAppMarbles = useMemo(() => getActiveAppMarbles(marblesList), [marblesList]);
  const activeSaleMarblesCount = useMemo(
    () =>
      activeAppMarbles.filter(
        (m) => Boolean(m.onSale && typeof m.discount === 'number' && m.discount > 0)
      ).length,
    [activeAppMarbles]
  );

  const selectedSlotIndex = useMemo(() => {
    const idx = schedule.slots.findIndex((s) => s.id === selectedSlotId);
    return idx >= 0 ? idx : 0;
  }, [schedule.slots, selectedSlotId]);

  const activeSlot: SocialPostSlot = schedule.slots[selectedSlotIndex] || schedule.slots[0];

  const activeGeneratedPost = useMemo(() => {
    if (!activeSlot || activeAppMarbles.length === 0) return null;
    return generateSocialPostContent(
      activeSlot,
      activeAppMarbles,
      fixingList,
      storeUrl,
      selectedSlotIndex
    );
  }, [activeSlot, activeAppMarbles, fixingList, storeUrl, selectedSlotIndex]);

  // Connect Social Account via direct OAuth provider popup
  const handleConnectSocialAccount = async (provider: 'facebook' | 'instagram' | 'tiktok') => {
    try {
      setConnectingProvider(provider);
      setSetupNoticeProvider(null);

      const res = await fetch(`/api/social-auth/url?provider=${encodeURIComponent(provider)}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!data?.configured || !data?.url) {
        setConnectingProvider(null);
        setSetupNoticeProvider({
          provider,
          redirectUri: data?.redirectUri || authStatus.callbackUrls.meta,
        });
        toast({
          title: 'صرف 1 مرتبہ ایپ کی (App Key) سیٹ کرنی ہوگی',
          description:
            provider === 'tiktok'
              ? 'TikTok لاگ ان فعال کرنے کے لیے نیچے دی گئی آسان ہدایات دیکھیں۔'
              : 'Facebook اور Instagram لاگ ان فعال کرنے کے لیے نیچے دی گئی آسان ہدایات دیکھیں۔',
        });
        return;
      }

      // Open OAuth provider URL directly in popup (never container route)
      const popup = window.open(
        data.url,
        `stone_expert_${provider}_oauth`,
        'width=600,height=720,noopener=no'
      );

      if (!popup) {
        setConnectingProvider(null);
        toast({
          title: 'Popup بلاک ہو گیا',
          description: 'براہ کرم براؤزر میں Popups کی اجازت دیں اور دوبارہ کلک کریں۔',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setConnectingProvider(null);
      toast({
        title: 'رابطے میں خرابی',
        description: err?.message || 'لاگ ان ونڈو کھولنے میں مسئلہ آیا۔',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectSocialAccount = async (provider: 'facebook' | 'instagram' | 'tiktok') => {
    try {
      const res = await fetch('/api/social-auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        await refreshSocialAuthStatus();
        toast({
          title: 'اکاؤنٹ لاگ آؤٹ ہو گیا',
          description: `${provider.toUpperCase()} اکاؤنٹ پورٹل سے ہٹا دیا گیا ہے۔`,
        });
      }
    } catch {
      toast({ title: 'Disconnect failed', variant: 'destructive' });
    }
  };

  const dispatchSlot = useCallback(
    async (slot: SocialPostSlot, slotIdx: number, triggeredByAuto: boolean = false) => {
      if (activeAppMarbles.length === 0) return;
      const todayKey = getLocalTodayDateKey();
      const post = generateSocialPostContent(slot, activeAppMarbles, fixingList, storeUrl, slotIdx);

      try {
        setPublishingSlotId(slot.id);
        const res = await fetch('/api/social-autopost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            slotId: slot.id,
            postType: slot.postType,
            title: `${post.titleEn} | ${post.titleUr}`,
            caption: post.caption,
            platforms: slot.platforms,
            linkUrl: `${storeUrl}/brochure?type=price-list`,
            imageUrl: post.imageUrl,
          }),
        });
        const data = await res.json().catch(() => ({}));

        const logStatus: SocialPublishLogEntry['status'] =
          data?.mode === 'published_live'
            ? 'published_live'
            : data?.mode === 'ready_manual'
            ? 'ready_manual'
            : 'failed';

        const logEntry: SocialPublishLogEntry = {
          id: `log_${Date.now()}_${slot.id}`,
          slotId: slot.id,
          slotTime: slot.time,
          postType: slot.postType,
          title: `${post.titleEn} • ${post.titleUr}`,
          platforms: slot.platforms,
          status: logStatus,
          message: data?.messageEn || data?.error || 'Processed',
          timestamp: new Date().toISOString(),
        };

        setSchedule((prev) => {
          const updated: SocialAutoPostConfig = {
            ...prev,
            slots: prev.slots.map((s) =>
              s.id === slot.id ? { ...s, lastPublishedDate: todayKey } : s
            ),
            history: [logEntry, ...(prev.history || [])].slice(0, 30),
            updatedAt: new Date().toISOString(),
          };
          saveSocialAutoPostConfig(updated).catch(() => {});
          return updated;
        });

        if (logStatus === 'published_live') {
          toast({
            title: triggeredByAuto
              ? `آٹو پوسٹ مکمل (${formatTime12h(slot.time)})`
              : 'پوسٹ کامیابی سے پبلش ہو گئی!',
            description: data?.messageUr || data?.messageEn,
          });
        } else if (logStatus === 'ready_manual') {
          toast({
            title: triggeredByAuto
              ? `شیڈول پوسٹ تیار ہے (${formatTime12h(slot.time)})`
              : 'پوسٹ کارڈ اور اصل ریٹس کیپشن تیار ہے!',
            description:
              'خودکار پوسٹنگ کے لیے اوپر پورٹل میں Facebook / Instagram / TikTok لاگ ان کریں، یا ابھی 1 کلک میں ڈاؤنلوڈ/واٹس ایپ شیئر کریں۔',
          });
        } else {
          toast({
            title: 'پوسٹ بھیجنے میں مسئلہ',
            description: data?.messageEn || data?.error || 'براہ کرم دوبارہ کوشش کریں۔',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        toast({
          title: 'نیٹ ورک خرابی',
          description: err?.message || 'سرور سے رابطہ نہیں ہو سکا۔',
          variant: 'destructive',
        });
      } finally {
        setPublishingSlotId(null);
      }
    },
    [activeAppMarbles, fixingList, storeUrl, toast]
  );

  // Live clock + automatic scheduler ticker (runs every 30s while Admin Panel is open)
  useEffect(() => {
    const updateClockAndCheckDue = () => {
      const now = new Date();
      setCurrentTimeLabel(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );

      if (!schedule.enabled || isLoading || activeAppMarbles.length === 0) return;

      const todayKey = getLocalTodayDateKey(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      schedule.slots.forEach((slot, idx) => {
        if (!slot.enabled) return;
        if (slot.lastPublishedDate === todayKey) return;

        const [h, m] = slot.time.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        const slotMinutes = h * 60 + m;

        if (currentMinutes >= slotMinutes && currentMinutes <= slotMinutes + 15) {
          const runKey = `${todayKey}_${slot.id}`;
          if (autoRunInFlightRef.current.has(runKey)) return;
          autoRunInFlightRef.current.add(runKey);
          dispatchSlot(slot, idx, true);
        }
      });
    };

    updateClockAndCheckDue();
    const timer = setInterval(updateClockAndCheckDue, 30000);
    return () => clearInterval(timer);
  }, [schedule.enabled, schedule.slots, isLoading, activeAppMarbles.length, dispatchSlot]);

  const nextScheduledSlot = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const todayKey = getLocalTodayDateKey(now);

    const enabledSlots = schedule.slots
      .filter((s) => s.enabled)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (enabledSlots.length === 0) return null;

    const upcomingToday = enabledSlots.find((s) => {
      const [h, m] = s.time.split(':').map(Number);
      const mins = h * 60 + m;
      return mins > nowMins && s.lastPublishedDate !== todayKey;
    });

    return upcomingToday || enabledSlots[0];
  }, [schedule.slots]);

  const handleRegenerateRoutine = () => {
    const newSlots = buildDailyRoutineSlots(
      schedule.startTime,
      schedule.postsPerDay,
      schedule.intervalHours,
      schedule.defaultPlatforms
    );
    setSchedule((prev) => ({ ...prev, slots: newSlots }));
    if (newSlots.length > 0) setSelectedSlotId(newSlots[0].id);
    toast({
      title: 'روزانہ شیڈول تیار ہو گیا!',
      description: `دن میں ${newSlots.length} پوسٹس (ہر ${schedule.intervalHours} گھنٹے بعد، آغاز ${formatTime12h(schedule.startTime)}) سیٹ کر دی گئی ہیں۔ محفوظ کرنے کے لیے "سیو کریں" دبائیں۔`,
    });
  };

  const handleSaveSchedule = async () => {
    try {
      setIsSaving(true);
      const res = await saveSocialAutoPostConfig(schedule);
      setSchedule(res.config);
      toast({
        title: 'شیڈول محفوظ ہو گیا! (Schedule Saved)',
        description: 'آپ کا روزانہ سوشل میڈیا آٹو پوسٹ شیڈول محفوظ ہو چکا ہے۔',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDefaultPlatform = (platform: SocialPlatform) => {
    setSchedule((prev) => {
      const exists = prev.defaultPlatforms.includes(platform);
      const next = exists
        ? prev.defaultPlatforms.filter((p) => p !== platform)
        : [...prev.defaultPlatforms, platform];
      if (next.length === 0) return prev;
      return { ...prev, defaultPlatforms: next };
    });
  };

  const updateSlot = (slotId: string, patch: Partial<SocialPostSlot>) => {
    setSchedule((prev) => ({
      ...prev,
      slots: prev.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
    }));
  };

  const toggleSlotPlatform = (slotId: string, platform: SocialPlatform) => {
    const slot = schedule.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const exists = slot.platforms.includes(platform);
    const next = exists
      ? slot.platforms.filter((p) => p !== platform)
      : [...slot.platforms, platform];
    if (next.length === 0) return;
    updateSlot(slotId, { platforms: next });
  };

  const toggleDailyRateStone = (slotId: string, marbleId: string) => {
    const slot = schedule.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const current = Array.isArray(slot.selectedMarbleIds) ? slot.selectedMarbleIds : [];
    const exists = current.includes(marbleId);
    const next = exists
      ? current.filter((id) => id !== marbleId)
      : [...current, marbleId].slice(0, 6);
    updateSlot(slotId, { selectedMarbleIds: next });
  };

  const handleAddCustomSlot = () => {
    const lastSlot = schedule.slots[schedule.slots.length - 1];
    const [lastH, lastM] = (lastSlot?.time || '17:00').split(':').map(Number);
    const nextH = ((isNaN(lastH) ? 17 : lastH) + 2) % 24;
    const newTime = `${String(nextH).padStart(2, '0')}:${String(isNaN(lastM) ? 0 : lastM).padStart(2, '0')}`;
    const newSlot: SocialPostSlot = {
      id: `slot_custom_${Date.now()}`,
      time: newTime,
      enabled: true,
      postType: 'featured-stone',
      marbleId: 'auto',
      selectedMarbleIds: [],
      discountPercent: 0,
      platforms: [...schedule.defaultPlatforms],
    };
    setSchedule((prev) => ({
      ...prev,
      postsPerDay: Math.min(8, prev.slots.length + 1),
      slots: [...prev.slots, newSlot],
    }));
    setSelectedSlotId(newSlot.id);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (schedule.slots.length <= 1) {
      toast({
        title: 'کم از کم 1 سلاٹس ضروری ہے',
        description: 'شیڈول میں کم از کم ایک پوسٹ ٹائم رہنا چاہیے۔',
      });
      return;
    }
    setSchedule((prev) => {
      const remaining = prev.slots.filter((s) => s.id !== slotId);
      if (selectedSlotId === slotId && remaining.length > 0) {
        setSelectedSlotId(remaining[0].id);
      }
      return { ...prev, postsPerDay: remaining.length, slots: remaining };
    });
  };

  const handleDownloadPostPng = async () => {
    const el = document.getElementById('stone-expert-social-post-card');
    if (!el) return;
    try {
      setIsDownloadingPng(true);
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `Stone_Expert_Social_${activeSlot?.postType || 'post'}_${getLocalTodayDateKey()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({
        title: 'پوسٹ تصویر ڈاؤنلوڈ ہو گئی!',
        description: 'ہائی کوالٹی PNG پوسٹ کارڈ تیار ہے۔',
      });
    } catch (err: any) {
      toast({
        title: 'ڈاؤنلوڈ میں خرابی',
        description: err?.message || 'دوبارہ کوشش کریں۔',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!activeGeneratedPost) return;
    try {
      await navigator.clipboard.writeText(activeGeneratedPost.caption);
      setCopiedCaption(true);
      toast({
        title: 'کیپشن کاپی ہو گیا!',
        description: 'مکمل اردو + انگلش کیپشن اصل ایپ ریٹس کے ساتھ کاپی ہو چکا ہے۔',
      });
      setTimeout(() => setCopiedCaption(false), 3000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleWhatsAppDirectShare = () => {
    if (!activeGeneratedPost) return;
    const text = encodeURIComponent(activeGeneratedPost.caption);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyCallbackUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCallback(true);
      toast({ title: 'لنک کاپی ہو گیا!' });
      setTimeout(() => setCopiedCallback(false), 2500);
    } catch {
      // ignore
    }
  };

  const todayKey = getLocalTodayDateKey();
  const activeMeta = activeSlot
    ? SOCIAL_POST_TYPE_META[activeSlot.postType]
    : SOCIAL_POST_TYPE_META['daily-rates'];

  const connectedCount = [
    authStatus.accounts.facebook.connected,
    authStatus.accounts.instagram.connected,
    authStatus.accounts.tiktok.connected,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ================= 1. SIMPLE SOCIAL MEDIA LOGIN PORTAL (FACEBOOK, INSTAGRAM, TIKTOK) ================= */}
      <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Stone Expert Social Login Portal • سوشل میڈیا اکاؤنٹ لاگ ان پورٹل</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    {connectedCount} / 3 Connected • منسلک اکاؤنٹس
                  </span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                اپنے Facebook، Instagram اور TikTok اکاؤنٹس یہاں لاگ ان کریں
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl" dir="rtl">
                کوئی مشکل سیٹنگ یا ویب ہُک کی ضرورت نہیں — بس نیچے اپنے سٹون ایکسپرٹ کے سوشل میڈیا اکاؤنٹس پر کلک کر کے لاگ ان کریں۔ لاگ ان کے بعد سسٹم آپ کے مقرر کردہ وقت پر **آپ کی ایپ کے عین اصل ریٹس** کے ساتھ خودکار پوسٹ کرتا رہے گا۔
              </p>
            </div>

            {/* Master Engine ON/OFF + Save + Sync Rates */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => syncLiveAppRates(true)}
                disabled={isLoadingRates}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/25 font-bold gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin' : ''}`} />
                <span>اصل ریٹس ریفریش</span>
              </Button>

              <Button
                type="button"
                onClick={() => setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`font-bold gap-1.5 text-xs shadow-md ${
                  schedule.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{schedule.enabled ? 'آٹو پوسٹ: ON' : 'آٹو پوسٹ: OFF'}</span>
              </Button>

              <Button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold gap-1.5 text-xs shadow-md"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>شیڈول سیو کریں</span>
              </Button>
            </div>
          </div>

          {/* 3 SIMPLE SOCIAL ACCOUNT LOGIN CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. FACEBOOK CARD */}
            <div className="rounded-2xl bg-slate-900/90 border border-blue-500/35 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    Facebook Page
                  </span>
                  <h3 className="text-base font-black text-white">فیس بک پیج</h3>
                </div>
                {authStatus.accounts.facebook.connected ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-600">
                    Not Logged In
                  </Badge>
                )}
              </div>

              {authStatus.accounts.facebook.connected ? (
                <div className="space-y-2">
                  <div className="text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                    ✓ {authStatus.accounts.facebook.name || 'Stone Expert Facebook Page'}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDisconnectSocialAccount('facebook')}
                    className="w-full text-xs font-bold border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>لاگ آؤٹ / Disconnect</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    اپنے سٹون ایکسپرٹ فیس بک پیج کو 1 کلک میں لاگ ان کر کے خودکار پوسٹنگ آن کریں۔
                  </p>
                  <Button
                    type="button"
                    disabled={connectingProvider === 'facebook'}
                    onClick={() => handleConnectSocialAccount('facebook')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-xs h-9"
                  >
                    {connectingProvider === 'facebook' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Facebook سے لاگ ان کریں</span>
                  </Button>
                </div>
              )}
            </div>

            {/* 2. INSTAGRAM CARD */}
            <div className="rounded-2xl bg-slate-900/90 border border-pink-500/35 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                    Instagram Business
                  </span>
                  <h3 className="text-base font-black text-white">انسٹاگرام اکاؤنٹ</h3>
                </div>
                {authStatus.accounts.instagram.connected ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-600">
                    Not Logged In
                  </Badge>
                )}
              </div>

              {authStatus.accounts.instagram.connected ? (
                <div className="space-y-2">
                  <div className="text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                    ✓ {authStatus.accounts.instagram.name || '@STONEEXPERT052'}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDisconnectSocialAccount('instagram')}
                    className="w-full text-xs font-bold border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>لاگ آؤٹ / Disconnect</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    اپنا @STONEEXPERT052 انسٹاگرام بزنس اکاؤنٹ لاگ ان کریں تاکہ روزانہ پوسٹ خود اپلوڈ ہو۔
                  </p>
                  <Button
                    type="button"
                    disabled={connectingProvider === 'instagram'}
                    onClick={() => handleConnectSocialAccount('instagram')}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-bold gap-2 text-xs h-9"
                  >
                    {connectingProvider === 'instagram' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Instagram سے لاگ ان کریں</span>
                  </Button>
                </div>
              )}
            </div>

            {/* 3. TIKTOK CARD */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-600 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                    TikTok Business
                  </span>
                  <h3 className="text-base font-black text-white">ٹک ٹاک اکاؤنٹ</h3>
                </div>
                {authStatus.accounts.tiktok.connected ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-600">
                    Not Logged In
                  </Badge>
                )}
              </div>

              {authStatus.accounts.tiktok.connected ? (
                <div className="space-y-2">
                  <div className="text-xs text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                    ✓ {authStatus.accounts.tiktok.name || '@stoneexpert.islamabad052'}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDisconnectSocialAccount('tiktok')}
                    className="w-full text-xs font-bold border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>لاگ آؤٹ / Disconnect</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">
                    اپنا @stoneexpert.islamabad052 ٹک ٹاک اکاؤنٹ یہاں لاگ ان کریں۔
                  </p>
                  <Button
                    type="button"
                    disabled={connectingProvider === 'tiktok'}
                    onClick={() => handleConnectSocialAccount('tiktok')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-500 font-bold gap-2 text-xs h-9"
                  >
                    {connectingProvider === 'tiktok' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>TikTok سے لاگ ان کریں</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Friendly 1-Time App Activation Card (only shown when user clicks Connect before Meta/TikTok App ID is added in AI Studio Secrets) */}
          {setupNoticeProvider && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/50 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {setupNoticeProvider.provider === 'tiktok'
                      ? 'TikTok لاگ ان بٹن کو 1 مرتبہ فعال کریں (1-Time Activation)'
                      : 'Facebook & Instagram لاگ ان بٹن کو 1 مرتبہ فعال کریں (1-Time Activation)'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSetupNoticeProvider(null)}
                  className="text-slate-300 hover:text-white text-xs font-bold"
                >
                  بند کریں ✕
                </button>
              </div>
              <p className="text-slate-200 leading-relaxed" dir="rtl">
                {setupNoticeProvider.provider === 'tiktok'
                  ? 'TikTok کی طرف سے سیکیورٹی اصول کے مطابق لاگ ان پوپ اپ کھولنے کے لیے AI Studio کے Secrets میں صرف ایک بار TIKTOK_CLIENT_KEY اور TIKTOK_CLIENT_SECRET شامل کرنا ہوتا ہے، اور نیچے والا Callback لنک TikTok Developer App میں پیسٹ کرنا ہوتا ہے۔ اس کے بعد ہمیشہ 1 کلک میں سیدھا لاگ ان کھلے گا۔'
                  : 'Facebook اور Instagram کی طرف سے سیکیورٹی اصول کے مطابق لاگ ان پوپ اپ کھولنے کے لیے AI Studio کے Secrets میں صرف ایک بار META_APP_ID اور META_APP_SECRET شامل کرنا ہوتا ہے، اور نیچے والا Callback لنک Meta Developer App میں پیسٹ کرنا ہوتا ہے۔ اس کے بعد ہمیشہ 1 کلک میں سیدھا فیس بک اور انسٹاگرام لاگ ان کھلے گا۔'}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <code className="flex-1 bg-slate-950/90 text-emerald-300 px-3 py-2 rounded-lg border border-white/15 font-mono text-[11px] break-all">
                  {setupNoticeProvider.redirectUri}
                </code>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleCopyCallbackUrl(setupNoticeProvider.redirectUri)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shrink-0"
                >
                  {copiedCallback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCallback ? 'کاپی ہو گیا' : 'لنک کاپی کریں'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Status Footer Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300 font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-400 font-bold">
                ✓ 100% Live App Rates Synced ({activeAppMarbles.length} Active Products
                {ratesSyncedAt ? ` • ${ratesSyncedAt}` : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Now: {currentTimeLabel || '--:--'}</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">
                Next Post / اگلی پوسٹ:{' '}
                {nextScheduledSlot ? formatTime12h(nextScheduledSlot.time) : 'None'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= 2. DAILY ROUTINE & TIME SELECTOR ================= */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>روزانہ کا ٹائم اور تعداد سیٹ کریں • Daily Routine &amp; Frequency</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            صبح ڈیلی ریٹس کا وقت، دن میں کل پوسٹس کی تعداد اور وقفہ (1 سے 4 گھنٹے) منتخب کریں۔ تمام ریٹس خودکار طریقے سے آپ کی ایپ کے اصل ریٹس سے آئیں گے۔
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Morning Daily Rates Time / صبح ڈیلی ریٹس ٹائم
              </label>
              <Input
                type="time"
                value={schedule.startTime}
                onChange={(e) =>
                  setSchedule((prev) => ({ ...prev, startTime: e.target.value || '09:00' }))
                }
                className="h-10 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Posts Per Day / دن میں کتنی بار پوسٹ؟
              </label>
              <select
                value={schedule.postsPerDay}
                onChange={(e) =>
                  setSchedule((prev) => ({ ...prev, postsPerDay: Number(e.target.value) || 4 }))
                }
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 8].map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt} Posts / Day — دن میں {cnt} بار
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Gap Between Posts / ہر پوسٹ کا وقفہ
              </label>
              <select
                value={schedule.intervalHours}
                onChange={(e) =>
                  setSchedule((prev) => ({ ...prev, intervalHours: Number(e.target.value) || 2 }))
                }
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-bold"
              >
                <option value={1}>Every 1 Hour — ہر 1 گھنٹے بعد</option>
                <option value={2}>Every 2 Hours — ہر 2 گھنٹے بعد</option>
                <option value={3}>Every 3 Hours — ہر 3 گھنٹے بعد</option>
                <option value={4}>Every 4 Hours — ہر 4 گھنٹے بعد</option>
                <option value={6}>Every 6 Hours — ہر 6 گھنٹے بعد</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <Button
                type="button"
                onClick={handleRegenerateRoutine}
                className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 w-full"
              >
                <RefreshCw className="w-4 h-4" />
                <span>روٹین جنریٹ کریں</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground mr-1">
              Target Platforms / پلیٹ فارمز:
            </span>
            {PLATFORM_OPTIONS.map((p) => {
              const active = schedule.defaultPlatforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleDefaultPlatform(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    active
                      ? p.activeClass
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {active ? '✓ ' : ''}
                  {p.label} ({p.labelUr})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ================= 3. MAIN 2-COLUMN WORKSPACE: TIMELINE + LIVE EXACT-RATE POST CARD ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): DAILY TIMELINE SLOTS */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-600" />
              <span>
                آج کا پوسٹنگ شیڈول ({schedule.slots.length} Slots) • Today&apos;s Schedule
              </span>
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddCustomSlot}
              className="gap-1.5 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>نیا وقت شامل کریں</span>
            </Button>
          </div>

          <div className="space-y-3">
            {schedule.slots.map((slot, idx) => {
              const isSelected = slot.id === activeSlot?.id;
              const isPublishedToday = slot.lastPublishedDate === todayKey;

              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl border p-4 transition-all bg-card ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                      : 'border-border hover:border-slate-400'
                  } ${!slot.enabled ? 'opacity-60' : ''}`}
                >
                  {/* Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30">
                        {idx + 1}
                      </span>
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateSlot(slot.id, { time: e.target.value || '09:00' })}
                        className="w-32 h-8 text-xs font-mono font-bold"
                      />
                      <span className="text-xs font-bold text-muted-foreground">
                        ({formatTime12h(slot.time)})
                      </span>
                      {isPublishedToday ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> آج ہو گئی
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400">
                          شیڈول ہے
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`h-8 text-xs font-bold gap-1 ${
                          isSelected ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>پریویو</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={publishingSlotId === slot.id || isLoadingRates}
                        onClick={() => {
                          setSelectedSlotId(slot.id);
                          dispatchSlot(slot, idx, false);
                        }}
                        className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {publishingSlotId === slot.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>ابھی پوسٹ</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateSlot(slot.id, { enabled: !slot.enabled })}
                        className={`h-8 px-2 text-xs font-bold ${
                          slot.enabled ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}
                      >
                        {slot.enabled ? 'ON' : 'OFF'}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Middle Row: Post Type + Live Stone Selector + Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground block">
                        Post Type / پوسٹ کی قسم
                      </label>
                      <select
                        value={slot.postType}
                        onChange={(e) =>
                          updateSlot(slot.id, { postType: e.target.value as SocialPostType })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-bold"
                      >
                        <option value="daily-rates">📊 Today&apos;s Exact Rates / آج کے اصل ریٹس</option>
                        <option value="featured-stone">💎 Featured Stone / خصوصی پتھر</option>
                        <option value="special-discount">🔥 App Sale Offers / ایپ سیل آفرز</option>
                        <option value="new-arrival">✨ New Stock Arrival / نیا مٹیریل</option>
                        <option value="home-package">🏠 Home Package / اپنا گھر پیکیج</option>
                      </select>
                    </div>

                    {slot.postType !== 'daily-rates' && slot.postType !== 'home-package' ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block">
                          Select Stone / ایپ سے پتھر چنیں
                        </label>
                        <select
                          value={slot.marbleId}
                          onChange={(e) => updateSlot(slot.id, { marbleId: e.target.value })}
                          className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
                        >
                          <option value="auto">🔄 Auto from Live App (خودکار انتخاب)</option>
                          {activeAppMarbles.map((m) => {
                            const minP = Math.min(
                              ...m.variants.filter((v) => v.price > 0).map((v) => v.price)
                            );
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name} — PKR {minP.toLocaleString()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground block">
                          Rates Source / ریٹس کا ذریعہ
                        </label>
                        <div className="h-9 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 flex items-center text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                          ✓ 100% اصل لائیو ایپ ریٹس
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground block">
                        Custom Note / خاص نوٹ (اختیاری)
                      </label>
                      <Input
                        placeholder="مثلاً فری لوڈنگ / Fresh Lot..."
                        value={slot.customNote || ''}
                        onChange={(e) => updateSlot(slot.id, { customNote: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* For Daily Rates slot when selected: optional custom stone picker (up to 6) */}
                  {isSelected && slot.postType === 'daily-rates' && activeAppMarbles.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground">
                          ڈیلی ریٹس پوسٹ میں کون سے پتھر دکھائیں؟ (زیادہ سے زیادہ 6 منتخب کریں یا خالی چھوڑیں):
                        </span>
                        {slot.selectedMarbleIds && slot.selectedMarbleIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => updateSlot(slot.id, { selectedMarbleIds: [] })}
                            className="text-amber-600 hover:underline font-bold"
                          >
                            Reset Auto
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {activeAppMarbles.slice(0, 24).map((m) => {
                          const picked = (slot.selectedMarbleIds || []).includes(m.id);
                          const minP = Math.min(
                            ...m.variants.filter((v) => v.price > 0).map((v) => v.price)
                          );
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleDailyRateStone(slot.id, m.id)}
                              className={`px-2 py-1 rounded-md text-[10.5px] font-bold border transition-colors ${
                                picked
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {m.name} (Rs.{minP})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notice on Special Discount if no app product is on sale */}
                  {slot.postType === 'special-discount' && activeSaleMarblesCount === 0 && (
                    <div className="mt-2.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5" dir="rtl">
                      نوٹ: اس وقت آپ کی ایپ میں کسی پروڈکٹ پر سیل آن نہیں ہے، اس لیے کسٹمر کو غلط یا کم ریٹ نہیں دکھایا جائے گا — ایپ کے اصل ریٹس ہی شائع ہوں گے۔
                    </div>
                  )}

                  {/* Platform Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-3">
                    {PLATFORM_OPTIONS.map((p) => {
                      const active = slot.platforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSlotPlatform(slot.id, p.id)}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-colors ${
                            active
                              ? p.activeClass
                              : 'bg-muted/40 text-muted-foreground border-border'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): LIVE VISUAL POST PREVIEW WITH 100% EXACT APP RATES */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>تیار پوسٹ پریویو (اصل ایپ ریٹس)</span>
            </h3>
            {activeSlot && (
              <Badge variant="secondary" className="font-mono text-xs font-bold">
                {formatTime12h(activeSlot.time)}
              </Badge>
            )}
          </div>

          {isLoadingRates || !activeGeneratedPost ? (
            <div className="rounded-2xl border bg-slate-950 text-white p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-sm font-bold">آپ کی ایپ کے اصل لائیو ریٹس لوڈ ہو رہے ہیں...</p>
              <p className="text-xs text-slate-400">Syncing exact live prices from Firestore...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                id="stone-expert-social-post-card"
                className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${activeMeta.gradientClass} text-white border-2 border-amber-500/60 shadow-2xl p-5 sm:p-6 space-y-4`}
              >
                <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Brand Bar with Official App Logo */}
                <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-xl bg-slate-900 border border-amber-400/70 shadow shrink-0">
                      <Icons.logo
                        src={logoUrl}
                        alt="Stone Expert Official Logo"
                        crossOrigin="anonymous"
                        className="h-11 w-11 object-contain rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="font-black text-base tracking-tight leading-none flex items-center gap-1.5">
                        <span className="text-amber-400">STONE EXPERT</span>
                        <span className="text-slate-200 font-bold text-sm">سٹون ایکسپرٹ</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
                        Official Live App Rates • ایپ کے اصل ریٹس
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border text-center leading-tight ${activeMeta.accentClass}`}
                  >
                    {activeMeta.badgeEn}
                    <span className="block text-[9.5px]" dir="rtl">
                      {activeMeta.badgeUr}
                    </span>
                  </span>
                </div>

                {/* Headline + Date */}
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2 text-[10.5px] font-mono text-amber-300 font-bold">
                    {activeGeneratedPost.hasActiveAppSale ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : activeSlot.postType === 'home-package' ? (
                      <Home className="w-3.5 h-3.5 text-purple-300" />
                    ) : activeSlot.postType === 'daily-rates' ? (
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Gem className="w-3.5 h-3.5 text-sky-300" />
                    )}
                    <span>
                      {activeGeneratedPost.dateEn} • {activeGeneratedPost.dateUr}
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white leading-snug">
                    {activeGeneratedPost.titleEn}
                  </h4>
                  <p className="text-sm sm:text-base font-extrabold text-amber-300 leading-snug" dir="rtl">
                    {activeGeneratedPost.titleUr}
                  </p>
                  <p className="text-[11px] text-slate-300">{activeGeneratedPost.subtitleEn}</p>
                </div>

                {/* Featured Stone Photo */}
                {activeSlot.postType !== 'daily-rates' &&
                  activeSlot.postType !== 'home-package' &&
                  activeGeneratedPost.imageUrl && (
                    <div className="relative z-10 rounded-xl overflow-hidden border border-white/20 h-36 bg-slate-900">
                      <img
                        src={activeGeneratedPost.imageUrl}
                        alt={activeGeneratedPost.featuredMarble?.name || 'Stone Preview'}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                      {activeGeneratedPost.hasActiveAppSale &&
                        activeGeneratedPost.highlightRows[0]?.saleLabel && (
                          <div className="absolute top-2 right-2 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg border border-white/40">
                            {activeGeneratedPost.highlightRows[0].saleLabel}
                          </div>
                        )}
                    </div>
                  )}

                {/* EXACT LIVE APP PKR RATES BOX */}
                <div className="relative z-10 bg-slate-950/75 border border-white/15 rounded-xl p-3 space-y-1.5">
                  {activeGeneratedPost.highlightRows.slice(0, 6).map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-xs py-1 border-b border-white/10 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{row.name}</span>
                        <span className="text-[10px] text-slate-300 font-mono block truncate">
                          {row.detail}
                        </span>
                      </div>
                      <div className="shrink-0 text-right font-mono">
                        {row.discountedPrice ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 line-through">
                              PKR {row.price.toLocaleString()}
                              {row.maxPrice && row.maxPrice > row.price
                                ? `–${row.maxPrice.toLocaleString()}`
                                : ''}
                            </span>
                            <span className="font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-400/40">
                              PKR {row.discountedPrice.toLocaleString()}
                              {row.maxDiscountedPrice && row.maxDiscountedPrice > row.discountedPrice
                                ? `–${row.maxDiscountedPrice.toLocaleString()}`
                                : ''}
                              {row.unitLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-400/30">
                            PKR {row.price.toLocaleString()}
                            {row.maxPrice && row.maxPrice > row.price
                              ? `–${row.maxPrice.toLocaleString()}`
                              : ''}
                            {row.unitLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {activeSlot.customNote?.trim() && (
                  <div className="relative z-10 bg-amber-500/20 border border-amber-400/40 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-200 text-center">
                    {activeSlot.customNote.trim()}
                  </div>
                )}

                {/* Bottom Footer: ONLY Official I-9/3 Address + Contacts + QR */}
                <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between gap-3">
                  <div className="space-y-1 text-[10.5px] flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-mono font-bold">
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span>0300-3634052 / 0303-1512554</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="block font-bold text-white">{OFFICIAL_ADDRESS_EN}</span>
                        <span className="block text-[10px] text-slate-300" dir="rtl">
                          {OFFICIAL_ADDRESS_UR}
                        </span>
                      </div>
                    </div>
                  </div>

                  {qrCodeUrl && (
                    <div className="bg-white p-1.5 rounded-lg shrink-0 text-center shadow">
                      <img src={qrCodeUrl} alt="Stone Expert QR" className="w-14 h-14 object-contain" />
                      <span className="text-[7.5px] font-black text-slate-900 block">
                        stoneexpert.net
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 1-CLICK ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={handleDownloadPostPng}
                  disabled={isDownloadingPng}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 text-xs"
                >
                  {isDownloadingPng ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>ڈاؤنلوڈ PNG پوسٹ</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCaption}
                  className="font-bold gap-1.5 text-xs"
                >
                  {copiedCaption ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>کیپشن کاپی / Copy</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleWhatsAppDirectShare}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5 text-xs"
                >
                  <Share2 className="w-4 h-4" />
                  <span>واٹس ایپ شیئر</span>
                </Button>

                <Button
                  type="button"
                  disabled={publishingSlotId === activeSlot.id}
                  onClick={() => dispatchSlot(activeSlot, selectedSlotIndex, false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 text-xs"
                >
                  {publishingSlotId === activeSlot.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>آٹو پوسٹ چلائیں</span>
                </Button>
              </div>

              {/* Bilingual Caption Box */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                    <span>تیار اردو + انگریزی کیپشن (اصل ایپ ریٹس کے ساتھ)</span>
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="text-amber-600 hover:underline font-bold"
                    >
                      {copiedCaption ? 'Copied ✓' : 'Copy All'}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <pre className="whitespace-pre-wrap text-[11px] font-sans bg-muted/60 p-3 rounded-lg border max-h-56 overflow-y-auto leading-relaxed text-foreground">
                    {activeGeneratedPost.caption}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ================= 4. RECENT PUBLISH HISTORY LOG ================= */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600" />
            <span>حالیہ پوسٹس کا ریکارڈ • Recent Auto-Post Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedule.history.length === 0 ? (
            <div className="text-center py-5 text-xs text-muted-foreground space-y-1">
              <p>ابھی کوئی پوسٹ نہیں چلائی گئی۔ ٹیسٹ کرنے کے لیے کسی بھی سلاٹس پر &quot;ابھی پوسٹ&quot; دبائیں۔</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {schedule.history.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-lg border bg-muted/30 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{entry.title}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {formatTime12h(entry.slotTime)} • {entry.platforms.join(', ')} •{' '}
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1">
                      {entry.message}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      entry.status === 'published_live'
                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                        : entry.status === 'ready_manual'
                        ? 'border-amber-500 text-amber-700 bg-amber-50'
                        : 'border-rose-500 text-rose-700 bg-rose-50'
                    }`}
                  >
                    {entry.status === 'published_live'
                      ? 'Live'
                      : entry.status === 'ready_manual'
                      ? 'Ready'
                      : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
