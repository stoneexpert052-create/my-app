import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/lib/admin-actions';
import type { Marble, FixingMaterial } from '@/lib/types';

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp';

export type SocialPostType =
  | 'daily-rates'
  | 'featured-stone'
  | 'special-discount'
  | 'new-arrival'
  | 'home-package';

export interface SocialPostSlot {
  id: string;
  time: string; // "HH:MM" 24-hour format
  enabled: boolean;
  postType: SocialPostType;
  marbleId: string; // 'auto' or specific marble.id
  selectedMarbleIds?: string[]; // Optional custom list of marbles for daily-rates
  discountPercent: number; // Unused for faking prices; kept for schema compatibility
  customHeadlineEn?: string;
  customHeadlineUr?: string;
  customNote?: string;
  platforms: SocialPlatform[];
  lastPublishedDate?: string; // "YYYY-MM-DD"
}

export interface SocialPublishLogEntry {
  id: string;
  slotId: string;
  slotTime: string;
  postType: SocialPostType;
  title: string;
  platforms: SocialPlatform[];
  status: 'published_live' | 'dispatched_webhook' | 'ready_manual' | 'failed';
  message: string;
  timestamp: string;
}

export interface SocialAutoPostConfig {
  enabled: boolean;
  startTime: string;
  postsPerDay: number;
  intervalHours: number;
  defaultPlatforms: SocialPlatform[];
  slots: SocialPostSlot[];
  history: SocialPublishLogEntry[];
  updatedAt: string;
}

export const SOCIAL_POST_TYPE_META: Record<
  SocialPostType,
  {
    labelEn: string;
    labelUr: string;
    badgeEn: string;
    badgeUr: string;
    accentClass: string;
    gradientClass: string;
  }
> = {
  'daily-rates': {
    labelEn: "Today's Exact App Rates",
    labelUr: 'آج کے اصل ماربل ریٹس',
    badgeEn: 'OFFICIAL APP RATES',
    badgeUr: 'آج کے اصل ریٹس',
    accentClass: 'text-amber-400 border-amber-400/50 bg-amber-500/20',
    gradientClass: 'from-slate-950 via-slate-900 to-amber-950',
  },
  'featured-stone': {
    labelEn: 'Featured Stone Spotlight',
    labelUr: 'خصوصی پتھر کی پوسٹ',
    badgeEn: 'FEATURED STONE',
    badgeUr: 'خصوصی ماربل و گرینائٹ',
    accentClass: 'text-sky-300 border-sky-400/50 bg-sky-500/20',
    gradientClass: 'from-slate-950 via-slate-900 to-indigo-950',
  },
  'special-discount': {
    labelEn: 'App Active Sale Deals',
    labelUr: 'ایپ سیل و ڈسکاؤنٹ آفر',
    badgeEn: 'OFFICIAL SALE OFFER',
    badgeUr: 'آفیشل سیل آفر',
    accentClass: 'text-rose-300 border-rose-400/50 bg-rose-500/20',
    gradientClass: 'from-slate-950 via-rose-950/90 to-amber-950',
  },
  'new-arrival': {
    labelEn: 'Fresh Factory Stock / New Arrival',
    labelUr: 'نیا مٹیریل اور تازہ اسٹاک',
    badgeEn: 'NEW ARRIVAL STOCK',
    badgeUr: 'تازہ فیکٹری اسٹاک',
    accentClass: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/20',
    gradientClass: 'from-slate-950 via-slate-900 to-emerald-950',
  },
  'home-package': {
    labelEn: 'Build Your Home Package',
    labelUr: 'اپنا گھر بنائیں پیکیج',
    badgeEn: 'HOME MARBLE DEAL',
    badgeUr: 'مکمل گھر پیکیج',
    accentClass: 'text-purple-300 border-purple-400/50 bg-purple-500/20',
    gradientClass: 'from-slate-950 via-purple-950/85 to-slate-900',
  },
};

export const OFFICIAL_ADDRESS_EN = 'Plot # 375-A, Potohar Road, I-9/3, Islamabad';
export const OFFICIAL_ADDRESS_UR = 'پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد';

const STORAGE_KEY = 'stone_expert_social_autopost_config_v1';

const ROTATION_TYPES: SocialPostType[] = [
  'daily-rates',
  'featured-stone',
  'special-discount',
  'new-arrival',
  'home-package',
  'featured-stone',
  'special-discount',
  'daily-rates',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function getLocalTodayDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = (time24 || '09:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad2(m)} ${suffix}`;
}

/**
 * Exact same price helper used on the main app (MarbleCard & homepage).
 * NEVER invents a lower price than what is live in the app.
 */
export function computeExactAppVariantPrice(
  marble: Marble,
  basePrice: number
): { originalPrice: number; finalPrice: number; isOnSale: boolean; saleLabel?: string } {
  const cleanBase = Math.round(Number(basePrice) || 0);
  const discountVal = typeof marble.discount === 'number' ? marble.discount : 0;
  // Match MarbleCard exactly: active whenever discount > 0 (onSale flag or explicit discount)
  const isOnSale = Boolean((marble.onSale || discountVal > 0) && discountVal > 0);

  if (!isOnSale || cleanBase <= 0) {
    return { originalPrice: cleanBase, finalPrice: cleanBase, isOnSale: false };
  }

  const finalPrice =
    marble.discountType === 'fixed'
      ? Math.max(1, cleanBase - discountVal)
      : Math.round(cleanBase * (1 - discountVal / 100));

  const saleLabel =
    marble.discountType === 'fixed' ? `PKR ${discountVal} OFF` : `${discountVal}% OFF`;

  return {
    originalPrice: cleanBase,
    finalPrice,
    isOnSale: finalPrice < cleanBase,
    saleLabel,
  };
}

/**
 * Filter marbles identically to the live storefront: visible, non-deleted, with positive variant prices.
 */
export function getActiveAppMarbles(marbles: Marble[]): Marble[] {
  return (marbles || []).filter((m) => {
    if (!m || !m.name) return false;
    if (m.isHidden || (m as any).isDeleted) return false;
    if (!Array.isArray(m.variants)) return false;
    return m.variants.some((v) => typeof v?.price === 'number' && v.price > 0);
  });
}

export function buildDailyRoutineSlots(
  startTime: string = '09:00',
  postsPerDay: number = 4,
  intervalHours: number = 2,
  defaultPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'tiktok', 'whatsapp']
): SocialPostSlot[] {
  const [rawH, rawM] = (startTime || '09:00').split(':').map(Number);
  const startMinutes = (isNaN(rawH) ? 9 : rawH) * 60 + (isNaN(rawM) ? 0 : rawM);
  const clampedCount = Math.max(1, Math.min(8, Math.round(postsPerDay || 4)));
  const clampedInterval = Math.max(1, Math.min(6, Math.round(intervalHours || 2)));
  const platforms: SocialPlatform[] =
    defaultPlatforms.length > 0 ? [...defaultPlatforms] : ['facebook', 'instagram', 'whatsapp'];

  const slots: SocialPostSlot[] = [];
  for (let i = 0; i < clampedCount; i++) {
    const totalMins = (startMinutes + i * clampedInterval * 60) % (24 * 60);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const postType = ROTATION_TYPES[i % ROTATION_TYPES.length];

    slots.push({
      id: `slot_${i + 1}_${pad2(hh)}${pad2(mm)}`,
      time: `${pad2(hh)}:${pad2(mm)}`,
      enabled: true,
      postType,
      marbleId: 'auto',
      selectedMarbleIds: [],
      discountPercent: 0,
      platforms: [...platforms],
    });
  }
  return slots;
}

export function getDefaultSocialAutoPostConfig(): SocialAutoPostConfig {
  const defaultPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'tiktok', 'whatsapp'];
  return {
    enabled: true,
    startTime: '09:00',
    postsPerDay: 4,
    intervalHours: 2,
    defaultPlatforms,
    slots: buildDailyRoutineSlots('09:00', 4, 2, defaultPlatforms),
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeConfig(raw: any): SocialAutoPostConfig {
  const fallback = getDefaultSocialAutoPostConfig();
  if (!raw || typeof raw !== 'object') return fallback;

  const validPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'tiktok', 'whatsapp'];
  const sanitizePlatforms = (arr: any): SocialPlatform[] => {
    if (!Array.isArray(arr)) return fallback.defaultPlatforms;
    const cleaned = arr.filter((p): p is SocialPlatform => validPlatforms.includes(p));
    return cleaned.length > 0 ? cleaned : ['facebook', 'whatsapp'];
  };

  const slots: SocialPostSlot[] =
    Array.isArray(raw.slots) && raw.slots.length > 0
      ? raw.slots.map((s: any, idx: number) => ({
          id: typeof s?.id === 'string' && s.id ? s.id : `slot_${idx + 1}`,
          time: typeof s?.time === 'string' && /^\d{2}:\d{2}$/.test(s.time) ? s.time : '09:00',
          enabled: typeof s?.enabled === 'boolean' ? s.enabled : true,
          postType: (
            [
              'daily-rates',
              'featured-stone',
              'special-discount',
              'new-arrival',
              'home-package',
            ] as SocialPostType[]
          ).includes(s?.postType)
            ? s.postType
            : 'daily-rates',
          marbleId: typeof s?.marbleId === 'string' && s.marbleId ? s.marbleId : 'auto',
          selectedMarbleIds: Array.isArray(s?.selectedMarbleIds)
            ? s.selectedMarbleIds.filter((id: any) => typeof id === 'string')
            : [],
          discountPercent: 0,
          customHeadlineEn: typeof s?.customHeadlineEn === 'string' ? s.customHeadlineEn : '',
          customHeadlineUr: typeof s?.customHeadlineUr === 'string' ? s.customHeadlineUr : '',
          customNote: typeof s?.customNote === 'string' ? s.customNote : '',
          platforms: sanitizePlatforms(s?.platforms),
          lastPublishedDate: typeof s?.lastPublishedDate === 'string' ? s.lastPublishedDate : undefined,
        }))
      : fallback.slots;

  const history: SocialPublishLogEntry[] = Array.isArray(raw.history)
    ? raw.history.slice(0, 30)
    : [];

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    startTime:
      typeof raw.startTime === 'string' && /^\d{2}:\d{2}$/.test(raw.startTime)
        ? raw.startTime
        : '09:00',
    postsPerDay: Number.isFinite(Number(raw.postsPerDay))
      ? Math.max(1, Math.min(8, Number(raw.postsPerDay)))
      : 4,
    intervalHours: Number.isFinite(Number(raw.intervalHours))
      ? Math.max(1, Math.min(6, Number(raw.intervalHours)))
      : 2,
    defaultPlatforms: sanitizePlatforms(raw.defaultPlatforms),
    slots,
    history,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export async function getSocialAutoPostConfig(): Promise<SocialAutoPostConfig> {
  let localFallback: SocialAutoPostConfig | null = null;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        localFallback = normalizeConfig(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }

  const db = getDb();
  if (!db) {
    return localFallback || getDefaultSocialAutoPostConfig();
  }

  try {
    const snap = await getDoc(doc(db, 'config', 'social_autopost_schedule'));
    if (snap.exists()) {
      const normalized = normalizeConfig(snap.data());
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
      return normalized;
    }
    return localFallback || getDefaultSocialAutoPostConfig();
  } catch (err) {
    console.warn('Could not read social_autopost_schedule from Firestore:', err);
    return localFallback || getDefaultSocialAutoPostConfig();
  }
}

export async function saveSocialAutoPostConfig(
  cfg: SocialAutoPostConfig
): Promise<{ success: boolean; config: SocialAutoPostConfig; error?: string }> {
  const sanitized = normalizeConfig({
    ...cfg,
    history: (cfg.history || []).slice(0, 30),
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore
    }
  }

  const db = getDb();
  if (!db) {
    return { success: true, config: sanitized };
  }

  try {
    await setDoc(doc(db, 'config', 'social_autopost_schedule'), sanitized, { merge: true });
    return { success: true, config: sanitized };
  } catch (err: any) {
    console.error('Failed saving social_autopost_schedule to Firestore:', err);
    return { success: false, config: sanitized, error: err?.message || 'Firestore write failed' };
  }
}

export interface GeneratedSocialPost {
  titleEn: string;
  titleUr: string;
  subtitleEn: string;
  subtitleUr: string;
  featuredMarble: Marble | null;
  hasActiveAppSale: boolean;
  highlightRows: Array<{
    name: string;
    detail: string;
    price: number;
    maxPrice?: number;
    discountedPrice?: number;
    maxDiscountedPrice?: number;
    saleLabel?: string;
    unitLabel: string;
  }>;
  caption: string;
  hashtags: string;
  dateEn: string;
  dateUr: string;
  imageUrl?: string;
}

export function generateSocialPostContent(
  slot: SocialPostSlot,
  marbles: Marble[],
  fixingMaterials: FixingMaterial[],
  storeUrl: string = 'https://stoneexpert.net',
  slotIndex: number = 0
): GeneratedSocialPost {
  const today = new Date();
  const dateEn = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const urduMonths = [
    'جنوری',
    'فروری',
    'مارچ',
    'اپریل',
    'مئی',
    'جون',
    'جولائی',
    'اگست',
    'ستمبر',
    'اکتوبر',
    'نومبر',
    'دسمبر',
  ];
  const dateUr = `${today.getDate()} ${urduMonths[today.getMonth()]} ${today.getFullYear()}`;

  const activeMarbles = getActiveAppMarbles(marbles);
  const onSaleMarbles = activeMarbles.filter(
    (m) => typeof m.discount === 'number' && m.discount > 0
  );
  const featuredCatalog = activeMarbles.filter((m) => m.isFeatured);
  const prioritizedPool = featuredCatalog.length >= 6 ? featuredCatalog : activeMarbles;

  const daySeed = today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate();

  let featuredMarble: Marble | null = null;
  if (slot.marbleId && slot.marbleId !== 'auto') {
    featuredMarble = activeMarbles.find((m) => m.id === slot.marbleId) || null;
  }
  if (!featuredMarble) {
    if (slot.postType === 'special-discount' && onSaleMarbles.length > 0) {
      featuredMarble = onSaleMarbles[(daySeed + slotIndex) % onSaleMarbles.length];
    } else if (prioritizedPool.length > 0) {
      featuredMarble = prioritizedPool[(daySeed + slotIndex * 3) % prioritizedPool.length];
    }
  }

  let titleEn = slot.customHeadlineEn?.trim() || '';
  let titleUr = slot.customHeadlineUr?.trim() || '';
  let subtitleEn = '';
  let subtitleUr = '';
  let highlightRows: GeneratedSocialPost['highlightRows'] = [];
  let bodyLines: string[] = [];
  let hasActiveAppSale = false;

  const getUnitLabel = (m: Marble): string =>
    ['Vanity', 'Inlay', 'Antique'].includes(m.materialType) ? '/Pc' : '/Sq.Ft';

  const getVariantRangeSummary = (m: Marble) => {
    const validVars = (m.variants || []).filter((v) => typeof v?.price === 'number' && v.price > 0);
    if (validVars.length === 0) return null;
    const minVar = validVars.reduce((best, cur) => (cur.price < best.price ? cur : best), validVars[0]);
    const maxVar = validVars.reduce((best, cur) => (cur.price > best.price ? cur : best), validVars[0]);
    const minPricing = computeExactAppVariantPrice(m, minVar.price);
    const maxPricing = computeExactAppVariantPrice(m, maxVar.price);
    const hasRange = maxPricing.originalPrice > minPricing.originalPrice;
    return {
      minVar,
      maxVar,
      minPricing,
      maxPricing,
      hasRange,
      variantCount: validVars.length,
    };
  };

  const formatRowPriceText = (r: GeneratedSocialPost['highlightRows'][number]) => {
    const origRange =
      r.maxPrice && r.maxPrice > r.price
        ? `PKR ${r.price.toLocaleString()}–${r.maxPrice.toLocaleString()}`
        : `PKR ${r.price.toLocaleString()}`;
    if (r.discountedPrice) {
      const discRange =
        r.maxDiscountedPrice && r.maxDiscountedPrice > r.discountedPrice
          ? `PKR ${r.discountedPrice.toLocaleString()}–${r.maxDiscountedPrice.toLocaleString()}`
          : `PKR ${r.discountedPrice.toLocaleString()}`;
      return `~${origRange}~ ➝ *${discRange}${r.unitLabel}*${r.saleLabel ? ` (${r.saleLabel})` : ''}`;
    }
    return `*${origRange}${r.unitLabel}*`;
  };

  if (slot.postType === 'daily-rates') {
    titleEn = titleEn || `Today's Official Marble & Granite Rates`;
    titleUr = titleUr || `آج کے آفیشل ماربل و گرینائٹ ریٹس (ایپ کے اصل ریٹس)`;
    subtitleEn = `100% Live App Rates Updated for ${dateEn}`;
    subtitleUr = `تاریخ ${dateUr} — ایپ کے عین مطابق اصل ریٹس`;

    // Use admin's hand-picked stones if selected, otherwise active app catalog
    let chosenMarbles: Marble[] = [];
    if (Array.isArray(slot.selectedMarbleIds) && slot.selectedMarbleIds.length > 0) {
      chosenMarbles = slot.selectedMarbleIds
        .map((id) => activeMarbles.find((m) => m.id === id))
        .filter((m): m is Marble => Boolean(m))
        .slice(0, 6);
    }
    if (chosenMarbles.length === 0) {
      chosenMarbles = prioritizedPool.slice(0, 6);
    }

    highlightRows = chosenMarbles
      .map((m) => {
        const range = getVariantRangeSummary(m);
        if (!range) return null;
        if (range.minPricing.isOnSale) hasActiveAppSale = true;
        return {
          name: m.name,
          detail: range.hasRange
            ? `${range.minVar.size || 'Tile'} to ${range.maxVar.size || 'Slab'} (${range.variantCount} Sizes)`
            : `${range.minVar.size || 'Standard'} • ${range.minVar.thickness || '6-Sutar'}`,
          price: range.minPricing.originalPrice,
          maxPrice: range.hasRange ? range.maxPricing.originalPrice : undefined,
          discountedPrice: range.minPricing.isOnSale ? range.minPricing.finalPrice : undefined,
          maxDiscountedPrice:
            range.minPricing.isOnSale && range.hasRange ? range.maxPricing.finalPrice : undefined,
          saleLabel: range.minPricing.saleLabel,
          unitLabel: getUnitLabel(m),
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    bodyLines = [
      `📅 *Date / تاریخ:* ${dateEn} (${dateUr})`,
      ``,
      `💎 *Today's Exact Live App Rates / آج کے اصل ایپ ریٹس:*`,
      ...highlightRows.map((r) => `• ${r.name} (${r.detail}) — ${formatRowPriceText(r)}`),
    ];
  } else if (slot.postType === 'special-discount') {
    // STRICT RULE: Only show discounts that are ACTUALLY live in the app. NEVER fabricate lower prices!
    if (onSaleMarbles.length > 0) {
      hasActiveAppSale = true;
      const saleTarget =
        featuredMarble &&
        featuredMarble.onSale &&
        typeof featuredMarble.discount === 'number' &&
        featuredMarble.discount > 0
          ? featuredMarble
          : onSaleMarbles[0];

      featuredMarble = saleTarget;
      const validVars = (saleTarget.variants || [])
        .filter((v) => typeof v?.price === 'number' && v.price > 0)
        .slice(0, 5);

      const firstPricing = validVars[0]
        ? computeExactAppVariantPrice(saleTarget, validVars[0].price)
        : null;

      titleEn =
        titleEn ||
        `Official Sale: ${saleTarget.name}${firstPricing?.saleLabel ? ` (${firstPricing.saleLabel})` : ''}`;
      titleUr =
        titleUr ||
        `آفیشل ایپ سیل آفر: ${saleTarget.name}${firstPricing?.saleLabel ? ` (${firstPricing.saleLabel})` : ''}`;
      subtitleEn = `Exact Active Sale Prices Live on Stone Expert App`;
      subtitleUr = `سٹون ایکسپرٹ ایپ پر جاری اصل سیل ریٹس`;

      highlightRows = validVars.map((v) => {
        const p = computeExactAppVariantPrice(saleTarget, v.price);
        return {
          name: saleTarget.name,
          detail: `${v.size || 'Standard'} • ${v.thickness || '6-Sutar'}`,
          price: p.originalPrice,
          discountedPrice: p.isOnSale ? p.finalPrice : undefined,
          saleLabel: p.saleLabel,
          unitLabel: getUnitLabel(saleTarget),
        };
      });

      bodyLines = [
        `🔥 *OFFICIAL APP SALE / سٹون ایکسپرٹ آفیشل سیل!*`,
        `🪨 *Stone / مٹیریل:* ${saleTarget.name}`,
        ``,
        ...highlightRows.map((r) =>
          r.discountedPrice
            ? `• ${r.detail}: ~PKR ${r.price.toLocaleString()}~ ➝ *PKR ${r.discountedPrice.toLocaleString()}${r.unitLabel}*`
            : `• ${r.detail}: *PKR ${r.price.toLocaleString()}${r.unitLabel}*`
        ),
      ];
    } else {
      // No active sale in app -> show exact regular app prices without faking any reduction
      const targetName = featuredMarble?.name || 'Premium Marble & Granite';
      titleEn = titleEn || `Official Factory Rates: ${targetName}`;
      titleUr = titleUr || `آفیشل فیکٹری ریٹس: ${targetName}`;
      subtitleEn = `Exact Verified Prices Direct from Stone Expert App`;
      subtitleUr = `سٹون ایکسپرٹ ایپ کے عین مطابق اصل ریٹس`;

      const validVars = (featuredMarble?.variants || [])
        .filter((v) => typeof v?.price === 'number' && v.price > 0)
        .slice(0, 5);

      highlightRows = validVars.map((v) => ({
        name: targetName,
        detail: `${v.size || 'Standard'} • ${v.thickness || '6-Sutar'}`,
        price: Math.round(v.price),
        unitLabel: featuredMarble ? getUnitLabel(featuredMarble) : '/Sq.Ft',
      }));

      bodyLines = [
        `💎 *OFFICIAL APP RATES / آفیشل ایپ ریٹس*`,
        `🪨 *Stone / مٹیریل:* ${targetName}`,
        ``,
        ...highlightRows.map(
          (r) => `• ${r.detail} — *PKR ${r.price.toLocaleString()}${r.unitLabel}*`
        ),
      ];
    }
  } else if (slot.postType === 'new-arrival') {
    const targetName = featuredMarble?.name || 'Fresh Factory Marble Stock';
    titleEn = titleEn || `New Stock Arrival: ${targetName}`;
    titleUr = titleUr || `نیا تازہ اسٹاک آ گیا: ${targetName}`;
    subtitleEn = `Fresh Cut & Polished Lot Available at I-9/3 Islamabad Yard`;
    subtitleUr = `تازہ کٹائی اور بہترین پالش والا لاٹ ہمارے آئی نائن (I-9/3) یارڈ پر دستیاب ہے`;

    const validVars = (featuredMarble?.variants || [])
      .filter((v) => typeof v?.price === 'number' && v.price > 0)
      .slice(0, 5);

    highlightRows = validVars.map((v) => {
      const p = featuredMarble
        ? computeExactAppVariantPrice(featuredMarble, v.price)
        : { originalPrice: Math.round(v.price), finalPrice: Math.round(v.price), isOnSale: false };
      if (p.isOnSale) hasActiveAppSale = true;
      return {
        name: targetName,
        detail: `${v.size || 'Standard'} • ${v.thickness || '6-Sutar'}`,
        price: p.originalPrice,
        discountedPrice: p.isOnSale ? p.finalPrice : undefined,
        saleLabel: p.saleLabel,
        unitLabel: featuredMarble ? getUnitLabel(featuredMarble) : '/Sq.Ft',
      };
    });

    bodyLines = [
      `✨ *NEW STOCK ARRIVAL / نیا تازہ فیکٹری اسٹاک!*`,
      `🪨 *Material / پتھر:* ${targetName}`,
      ``,
      ...highlightRows.map((r) =>
        r.discountedPrice
          ? `• ${r.detail} — ~PKR ${r.price.toLocaleString()}~ ➝ *PKR ${r.discountedPrice.toLocaleString()}${r.unitLabel}*`
          : `• ${r.detail} — *PKR ${r.price.toLocaleString()}${r.unitLabel}*`
      ),
    ];
  } else if (slot.postType === 'home-package') {
    titleEn = titleEn || `Build Your Home — Complete Marble & Fixing Deals`;
    titleUr = titleUr || `اپنا گھر بنائیں — ماربل، سیڑھیوں اور کچن کے مکمل پیکیجز`;
    subtitleEn = `5 Marla, 10 Marla & 1 Kanal Official App Rates + Free Estimator`;
    subtitleUr = `5 مرلہ، 10 مرلہ اور 1 کنال گھروں کے لیے آفیشل ایپ ریٹس اور فری ایسٹیمیٹر`;

    const visibleFixing = (fixingMaterials || [])
      .filter((f) => f && !f.isHidden && typeof f.price === 'number' && f.price > 0)
      .slice(0, 3);
    const marbleTop = prioritizedPool.slice(0, 3);

    highlightRows = [
      ...marbleTop
        .map((m) => {
          const range = getVariantRangeSummary(m);
          if (!range) return null;
          if (range.minPricing.isOnSale) hasActiveAppSale = true;
          return {
            name: m.name,
            detail: range.hasRange
              ? `${range.minVar.size || 'Tile'} to ${range.maxVar.size || 'Slab'}`
              : `${range.minVar.size || 'Standard'} • ${range.minVar.thickness || '6-Sutar'}`,
            price: range.minPricing.originalPrice,
            maxPrice: range.hasRange ? range.maxPricing.originalPrice : undefined,
            discountedPrice: range.minPricing.isOnSale ? range.minPricing.finalPrice : undefined,
            maxDiscountedPrice:
              range.minPricing.isOnSale && range.hasRange ? range.maxPricing.finalPrice : undefined,
            unitLabel: getUnitLabel(m),
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r)),
      ...visibleFixing.map((f) => ({
        name: f.name,
        detail: `${f.category || 'Fixing'} (${f.unit || 'Bag'})`,
        price: Math.round(f.price),
        unitLabel: `/${f.unit || 'Bag'}`,
      })),
    ];

    bodyLines = [
      `🏠 *BUILD YOUR HOME PACKAGES / اپنا گھر بنائیں پیکیجز*`,
      `✅ 5 Marla, 10 Marla & 1 Kanal Complete Flooring, Stairs & Kitchen Counter Deals`,
      `✅ 5 مرلہ، 10 مرلہ اور کنال کے گھروں کے لیے ماربل، سیڑھیوں اور کچن کے مکمل پیکیجز`,
      ``,
      ...highlightRows.map((r) => `• ${r.name} (${r.detail}) — ${formatRowPriceText(r)}`),
    ];
  } else {
    // featured-stone
    const targetName = featuredMarble?.name || 'Premium Stone';
    titleEn = titleEn || `Stone Spotlight: ${targetName}`;
    titleUr = titleUr || `خصوصی پتھر تعارف: ${targetName}`;
    subtitleEn = `Exact Live App Rates • Direct Supply Across Pakistan`;
    subtitleUr = `ایپ کے اصل ریٹس • پورے پاکستان میں براہِ راست سپلائی`;

    const validVars = (featuredMarble?.variants || [])
      .filter((v) => typeof v?.price === 'number' && v.price > 0)
      .slice(0, 5);

    highlightRows = validVars.map((v) => {
      const p = featuredMarble
        ? computeExactAppVariantPrice(featuredMarble, v.price)
        : { originalPrice: Math.round(v.price), finalPrice: Math.round(v.price), isOnSale: false };
      if (p.isOnSale) hasActiveAppSale = true;
      return {
        name: targetName,
        detail: `${v.size || 'Standard'} • ${v.thickness || '6-Sutar'}`,
        price: p.originalPrice,
        discountedPrice: p.isOnSale ? p.finalPrice : undefined,
        saleLabel: p.saleLabel,
        unitLabel: featuredMarble ? getUnitLabel(featuredMarble) : '/Sq.Ft',
      };
    });

    bodyLines = [
      `⭐ *FEATURED STONE SPOTLIGHT / خصوصی پتھر*`,
      `🪨 *${targetName}*`,
      ``,
      ...highlightRows.map((r) =>
        r.discountedPrice
          ? `• ${r.detail} — ~PKR ${r.price.toLocaleString()}~ ➝ *PKR ${r.discountedPrice.toLocaleString()}${r.unitLabel}*`
          : `• ${r.detail} — *PKR ${r.price.toLocaleString()}${r.unitLabel}*`
      ),
    ];
  }

  const customNoteBlock = slot.customNote?.trim()
    ? ['', `📌 *Special Note / خاص نوٹ:* ${slot.customNote.trim()}`]
    : [];

  const hashtags =
    '#StoneExpert #MarbleRatesPakistan #IslamabadMarble #I9Islamabad #GranitePakistan #ZiaratWhite #BlackGalaxy #ConstructionPakistan #HomeFlooring';

  const caption = [
    `🏛️ *STONE EXPERT | سٹون ایکسپرٹ*`,
    `📢 *${titleEn}*`,
    `📢 *${titleUr}*`,
    ``,
    ...bodyLines,
    ...customNoteBlock,
    ``,
    `🌐 *Live Rates & Free Estimator / لائیو ریٹس و فری ایسٹیمیٹر:* ${storeUrl}`,
    `📄 *Official Price List Brochure / پرائس لسٹ بروشر:* ${storeUrl}/brochure?type=price-list`,
    `📞 *Fida Hussain (CEO):* 0300-3634052 | *Fayyaz Hussain:* 0303-1512554`,
    `📍 *Head Office / مرکزی دفتر:* ${OFFICIAL_ADDRESS_EN}`,
    `📍 ${OFFICIAL_ADDRESS_UR}`,
    ``,
    hashtags,
  ].join('\n');

  const safeImageUrl =
    featuredMarble?.imageUrl && featuredMarble.imageUrl.startsWith('http')
      ? featuredMarble.imageUrl
      : undefined;

  return {
    titleEn,
    titleUr,
    subtitleEn,
    subtitleUr,
    featuredMarble,
    hasActiveAppSale,
    highlightRows,
    caption,
    hashtags,
    dateEn,
    dateUr,
    imageUrl: safeImageUrl,
  };
}
