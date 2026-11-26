import type { Marble, FixingMaterial, ServiceProvider, Order } from './types';
import initialMarbles from '@/lib/marbles-data.json';
import initialFixingMaterials from '@/lib/fixing-materials-data.json';
import initialServiceProviders from '@/lib/service-providers-data.json';
import initialOrders from '@/lib/orders-data.json';
import businessConfig from '@/lib/config.json';
import costsConfig from '@/lib/costs.json';

const BROKEN_IMAGE_URL = 'https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5';
const VALID_IMAGE_URL = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a';

export function cleanMarbleImageUrl(url?: string): string {
  if (url && (url.includes(BROKEN_IMAGE_URL) || url.includes('502005229762-fc1b2b812ca5'))) {
    return url
      .replace(BROKEN_IMAGE_URL, VALID_IMAGE_URL)
      .replace('502005229762-fc1b2b812ca5', '1584622650111-993a426fbf0a');
  }
  return url || '';
}

const BUNDLED_MARBLES: Marble[] = (initialMarbles as Marble[]).map((m) => ({
  ...m,
  imageUrl: cleanMarbleImageUrl(m.imageUrl),
}));

const BUNDLED_FIXING_MATERIALS: FixingMaterial[] = initialFixingMaterials as FixingMaterial[];
const BUNDLED_SERVICE_PROVIDERS: ServiceProvider[] = initialServiceProviders as ServiceProvider[];
const BUNDLED_ORDERS: Order[] = (Array.isArray(initialOrders) ? initialOrders : []) as Order[];

/**
 * Pure deterministic snapshot getters (safe for React SSR & initial hydration).
 * Never accesses window or localStorage so Server & Client HTML always match.
 */
export function getBundledMarbles(): Marble[] {
  return BUNDLED_MARBLES;
}

export function getBundledFixingMaterials(): FixingMaterial[] {
  return BUNDLED_FIXING_MATERIALS;
}

export function getBundledServiceProviders(): ServiceProvider[] {
  return BUNDLED_SERVICE_PROVIDERS;
}

export function getBundledBusinessConfig() {
  return businessConfig;
}

export function getBundledCostsConfig() {
  return costsConfig;
}

/**
 * Client-only snapshot getters that check localStorage after mount/hydration
 * for instant display of recently synced prices without blocking on Firestore.
 */
export function getClientInstantMarbles(): Marble[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_marbles_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanedParsed: Marble[] = parsed.map((m: Marble) => ({
            ...m,
            imageUrl: cleanMarbleImageUrl(m.imageUrl),
          }));
          const existingIds = new Set(cleanedParsed.map((m) => m.id));
          const missing = BUNDLED_MARBLES.filter((m) => !existingIds.has(m.id));
          return missing.length > 0 ? [...cleanedParsed, ...missing] : cleanedParsed;
        }
      }
    } catch {
      // Ignore invalid localStorage payload
    }
  }
  return BUNDLED_MARBLES;
}

export function getClientInstantFixingMaterials(): FixingMaterial[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_fixing_materials_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as FixingMaterial[];
        }
      }
    } catch {
      // Ignore invalid localStorage payload
    }
  }
  return BUNDLED_FIXING_MATERIALS;
}

export function getClientInstantServiceProviders(): ServiceProvider[] {
  return BUNDLED_SERVICE_PROVIDERS;
}

export function getClientInstantOrders(): Order[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('stone_expert_orders_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Order[];
        }
      }
    } catch {
      // Ignore invalid localStorage payload
    }
  }
  return BUNDLED_ORDERS;
}
