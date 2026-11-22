import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the public app origin. Returns the current window origin so that
 * copied links and shared WhatsApp links always open directly on the active site.
 */
export const OFFICIAL_CARD_QR_URL = 'https://stoneexpert.net';
export const OFFICIAL_CARD_QR_OPTIONS = {
  version: 3,
  errorCorrectionLevel: 'H' as const,
  maskPattern: 2 as const,
};

export function getPublicOrigin(): string {
  if (typeof window === 'undefined') return 'https://stoneexpert.net';
  const hostname = window.location.hostname.toLowerCase();
  if (
    hostname.startsWith('ais-pre-') ||
    hostname.startsWith('ais-dev-') ||
    hostname.endsWith('.ai.studio') ||
    hostname === 'ai.studio'
  ) {
    return 'https://stoneexpert.net';
  }
  return window.location.origin;
}

export interface FormatSaleBadgeOptions {
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  saleBadgeText?: string;
  isUrdu?: boolean;
}

/**
 * Accurately formats the discount badge text.
 * When discountType === 'fixed' (Rupees), it returns e.g. "PKR 1,000 OFF" or "1,000 روپے رعایت"
 * When discountType === 'percentage', it returns e.g. "15% OFF" or "15% رعایت"
 * Never mistakes fixed PKR as a percentage!
 */
export function formatSaleBadgeText(options: FormatSaleBadgeOptions): string {
  const { discount, discountType, saleBadgeText, isUrdu = false } = options;
  if (saleBadgeText && saleBadgeText.trim()) {
    return saleBadgeText.trim();
  }
  const val = typeof discount === 'number' ? discount : 0;
  if (val <= 0) {
    return isUrdu ? 'سیل' : 'SALE';
  }
  if (discountType === 'fixed') {
    return isUrdu ? `${val.toLocaleString()} روپے رعایت` : `PKR ${val.toLocaleString()} OFF`;
  }
  return isUrdu ? `${val}% رعایت` : `${val}% OFF`;
}

