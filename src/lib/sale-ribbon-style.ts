export type SaleRibbonGradientPreset =
  | 'crimson-amber'
  | 'royal-obsidian'
  | 'emerald-gold'
  | 'sunset-copper'
  | 'sapphire-gold'
  | 'ruby-violet'
  | 'custom';

export type SaleRibbonShadowLevel =
  | 'none'
  | 'soft'
  | 'elevated'
  | 'dramatic'
  | 'glow';

export type SaleRibbonEntranceAnimation =
  | 'none'
  | 'slide-down'
  | 'fade-scale'
  | 'spring-drop'
  | 'shimmer-sweep';

export interface SaleRibbonStyleConfig {
  gradientPreset: SaleRibbonGradientPreset;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  gradientAngle?: number;
  shadowLevel: SaleRibbonShadowLevel;
  shadowColor?: string;
  entranceAnimation: SaleRibbonEntranceAnimation;
  shimmerOverlay?: boolean;
  headlineEn?: string;
  headlineUr?: string;
  updatedAt?: string;
}

export const DEFAULT_SALE_RIBBON_STYLE: SaleRibbonStyleConfig = {
  gradientPreset: 'crimson-amber',
  gradientFrom: '#b91c1c',
  gradientVia: '#e11d48',
  gradientTo: '#d97706',
  gradientAngle: 95,
  shadowLevel: 'elevated',
  shadowColor: 'rgba(185, 28, 28, 0.42)',
  entranceAnimation: 'slide-down',
  shimmerOverlay: true,
};

export const SALE_RIBBON_PRESETS: Record<
  Exclude<SaleRibbonGradientPreset, 'custom'>,
  { label: string; from: string; via: string; to: string; angle: number; glow: string; border: string }
> = {
  'crimson-amber': {
    label: 'Crimson Amber',
    from: '#b91c1c',
    via: '#e11d48',
    to: '#d97706',
    angle: 95,
    glow: 'rgba(225, 29, 72, 0.42)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
  'royal-obsidian': {
    label: 'Royal Obsidian & Gold',
    from: '#0f172a',
    via: '#1e1b4b',
    to: '#92400e',
    angle: 100,
    glow: 'rgba(217, 119, 6, 0.4)',
    border: 'rgba(245, 158, 11, 0.45)',
  },
  'emerald-gold': {
    label: 'Emerald & Gold',
    from: '#065f46',
    via: '#047857',
    to: '#b45309',
    angle: 95,
    glow: 'rgba(16, 185, 129, 0.38)',
    border: 'rgba(52, 211, 153, 0.38)',
  },
  'sunset-copper': {
    label: 'Sunset Copper',
    from: '#9a3412',
    via: '#ea580c',
    to: '#ca8a04',
    angle: 105,
    glow: 'rgba(234, 88, 12, 0.45)',
    border: 'rgba(253, 186, 116, 0.4)',
  },
  'sapphire-gold': {
    label: 'Sapphire & Champagne',
    from: '#1e3a8a',
    via: '#312e81',
    to: '#b45309',
    angle: 95,
    glow: 'rgba(59, 130, 246, 0.4)',
    border: 'rgba(147, 197, 253, 0.38)',
  },
  'ruby-violet': {
    label: 'Ruby Velvet',
    from: '#881337',
    via: '#9d174d',
    to: '#6d28d9',
    angle: 100,
    glow: 'rgba(157, 23, 77, 0.45)',
    border: 'rgba(244, 114, 182, 0.38)',
  },
};

export function normalizeSaleRibbonStyle(
  raw?: Partial<SaleRibbonStyleConfig> | null
): SaleRibbonStyleConfig {
  if (!raw) return { ...DEFAULT_SALE_RIBBON_STYLE };
  const preset = raw.gradientPreset && (raw.gradientPreset === 'custom' || raw.gradientPreset in SALE_RIBBON_PRESETS)
    ? raw.gradientPreset
    : DEFAULT_SALE_RIBBON_STYLE.gradientPreset;

  const presetDef =
    preset !== 'custom'
      ? SALE_RIBBON_PRESETS[preset]
      : SALE_RIBBON_PRESETS['crimson-amber'];

  return {
    gradientPreset: preset,
    gradientFrom: raw.gradientFrom || presetDef.from,
    gradientVia: raw.gradientVia !== undefined ? raw.gradientVia : presetDef.via,
    gradientTo: raw.gradientTo || presetDef.to,
    gradientAngle: typeof raw.gradientAngle === 'number' && !isNaN(raw.gradientAngle) ? raw.gradientAngle : presetDef.angle,
    shadowLevel: raw.shadowLevel || DEFAULT_SALE_RIBBON_STYLE.shadowLevel,
    shadowColor: raw.shadowColor || presetDef.glow,
    entranceAnimation: raw.entranceAnimation || DEFAULT_SALE_RIBBON_STYLE.entranceAnimation,
    shimmerOverlay: raw.shimmerOverlay !== undefined ? Boolean(raw.shimmerOverlay) : true,
    headlineEn: raw.headlineEn,
    headlineUr: raw.headlineUr,
    updatedAt: raw.updatedAt,
  };
}

export function resolveSaleRibbonInlineStyle(style: SaleRibbonStyleConfig): {
  backgroundImage: string;
  boxShadow: string;
  borderColor: string;
} {
  const s = normalizeSaleRibbonStyle(style);
  const angle = s.gradientAngle ?? 95;
  const from = s.gradientFrom || '#b91c1c';
  const via = s.gradientVia;
  const to = s.gradientTo || '#d97706';

  const backgroundImage = via
    ? `linear-gradient(${angle}deg, ${from} 0%, ${via} 52%, ${to} 100%)`
    : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;

  const glow = s.shadowColor || 'rgba(185, 28, 28, 0.42)';
  let boxShadow = 'none';
  switch (s.shadowLevel) {
    case 'none':
      boxShadow = 'none';
      break;
    case 'soft':
      boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.22)';
      break;
    case 'elevated':
      boxShadow = `0 10px 26px -6px ${glow}, 0 4px 10px -4px rgba(0, 0, 0, 0.35)`;
      break;
    case 'dramatic':
      boxShadow = `0 18px 40px -8px rgba(0, 0, 0, 0.55), 0 8px 20px -4px ${glow}`;
      break;
    case 'glow':
      boxShadow = `0 0 28px 2px ${glow}, 0 10px 24px -6px rgba(0, 0, 0, 0.4)`;
      break;
  }

  const borderColor =
    s.gradientPreset !== 'custom' && s.gradientPreset in SALE_RIBBON_PRESETS
      ? SALE_RIBBON_PRESETS[s.gradientPreset].border
      : 'rgba(255, 255, 255, 0.25)';

  return { backgroundImage, boxShadow, borderColor };
}

export function resolveSaleRibbonMotionProps(animation: SaleRibbonEntranceAnimation) {
  switch (animation) {
    case 'none':
      return {
        initial: { opacity: 1, y: 0, scale: 1 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0 },
      };
    case 'fade-scale':
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
      };
    case 'spring-drop':
      return {
        initial: { opacity: 0, y: -28 },
        animate: { opacity: 1, y: 0 },
        transition: { type: 'spring' as const, stiffness: 320, damping: 24, mass: 0.9 },
      };
    case 'shimmer-sweep':
      return {
        initial: { opacity: 0, x: -24 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };
    case 'slide-down':
    default:
      return {
        initial: { opacity: 0, y: -16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      };
  }
}
