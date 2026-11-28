
'use client';

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDoc,
  setDoc,
  serverTimestamp,
  where,
  addDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { initializeFirebase, handleFirestoreError, OperationType } from '@/firebase';
import type {
  Order,
  Marble,
  FixingMaterial,
  ServiceProvider,
  GalleryImage,
  Representative,
  DailyRates,
  SiteVisitJob,
  SiteMeasurementSection,
  SiteMeasurementRow,
  SiteMeasurementCategory,
  SiteVisitJobStatus,
  SiteVisitPhoto,
  SiteVisitPhotoCategory,
  PriceHistoryEntry
} from './types';
export type {
  Representative,
  DailyRates,
  SiteVisitJob,
  SiteMeasurementSection,
  SiteMeasurementRow,
  SiteMeasurementCategory,
  SiteVisitJobStatus,
  SiteVisitPhoto,
  SiteVisitPhotoCategory,
  PriceHistoryEntry
};
import initialMarbles from '@/lib/marbles-data.json';
import initialFixingMaterials from '@/lib/fixing-materials-data.json';
import initialServiceProviders from '@/lib/service-providers-data.json';
import { defaultDailyRates } from './data';
import costsConfig from './costs.json';
import config from './config.json';

export const getDb = () => {
  try {
    const { firestore } = initializeFirebase();
    return firestore;
  } catch (e: any) {
    const errMsg = e?.message || e?.toString() || '';
    if (errMsg.includes('remixed-project-id') || errMsg.includes('offline')) {
      console.warn("Firebase initialization skipped or running offline/placeholder:", errMsg);
    } else {
      console.error("Firebase init failed:", e);
    }
    return null;
  }
};

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const errMsg = error?.message || error?.toString() || '';
  return (
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Free daily read units') ||
    error?.code === 'resource-exhausted'
  );
}

let quotaExceededState = false;

export function isFirestoreQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function logFetchError(context: string, error: any) {
  const errMsg = error?.message || error?.toString() || '';
  const isQuota = isQuotaExceededError(error);
  const isOffline = 
    errMsg.includes('offline') || 
    errMsg.includes('timed out') ||
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('Failed to get document') || 
    error?.code === 'unavailable' || 
    error?.code === 'failed-precondition';
  
  if (isQuota) {
    quotaExceededState = true;
    console.warn(`${context}: Firestore free-tier daily read quota reached (50,000 reads/day limit). Serving cached and local fallback data seamlessly.`);
  } else if (isOffline) {
    console.warn(`${context}: Firestore is currently offline or client is using local cache. Detail: ${errMsg}`);
  } else {
    console.warn(`${context}:`, errMsg);
  }
}

// In-memory cache to prevent repeated read queries from exhausting the Firestore daily free quota
const inMemoryCache: {
  marbles: { data: Marble[]; timestamp: number } | null;
  fixingMaterials: { data: FixingMaterial[]; timestamp: number } | null;
  serviceProviders: { data: ServiceProvider[]; timestamp: number } | null;
  partnerCompanies: { data: any[]; timestamp: number } | null;
  costsConfig: { data: any; timestamp: number } | null;
  adminBackground: { data: AdminBackgroundConfig; timestamp: number } | null;
  homepageConfig: { data: any; timestamp: number } | null;
  homepageContent: { data: any; timestamp: number } | null;
  dailyRates: { data: any; timestamp: number } | null;
  representatives: { data: Representative[]; timestamp: number } | null;
  buildYourHomeRates: { data: any; timestamp: number } | null;
  renovationRates: { data: any; timestamp: number } | null;
} = {
  marbles: null,
  fixingMaterials: null,
  serviceProviders: null,
  partnerCompanies: null,
  costsConfig: null,
  adminBackground: null,
  homepageConfig: null,
  homepageContent: null,
  dailyRates: null,
  representatives: null,
  buildYourHomeRates: null,
  renovationRates: null,
};

const CACHE_TTL_MS = 300_000;
const inFlightRequests: Partial<Record<keyof typeof inMemoryCache, Promise<any>>> = {};

function cleanMarbleImage(url?: string): string {
  const brokenUrl = "https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5";
  const validUrl = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a";
  if (url && (url.includes(brokenUrl) || url.includes("502005229762-fc1b2b812ca5"))) {
    return url.replace(brokenUrl, validUrl).replace("502005229762-fc1b2b812ca5", "1584622650111-993a426fbf0a");
  }
  return url || '';
}

export function getInstantMarbles(): Marble[] {
  if (inMemoryCache.marbles?.data?.length) {
    return inMemoryCache.marbles.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_marbles_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeWithInitial(parsed);
          inMemoryCache.marbles = { data: merged, timestamp: 0 };
          return merged;
        }
      }
    } catch (e) {}
  }
  return (initialMarbles as Marble[]).map(m => ({ ...m, imageUrl: cleanMarbleImage(m.imageUrl) }));
}

export function getInstantFixingMaterials(): FixingMaterial[] {
  if (inMemoryCache.fixingMaterials?.data?.length) {
    return inMemoryCache.fixingMaterials.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_fixing_materials_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCache.fixingMaterials = { data: parsed, timestamp: 0 };
          return parsed;
        }
      }
    } catch (e) {}
  }
  return initialFixingMaterials as FixingMaterial[];
}

export function getInstantServiceProviders(): ServiceProvider[] {
  if (inMemoryCache.serviceProviders?.data?.length) {
    return inMemoryCache.serviceProviders.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_service_providers_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCache.serviceProviders = { data: parsed, timestamp: 0 };
          return parsed;
        }
      }
    } catch (e) {}
  }
  return initialServiceProviders as ServiceProvider[];
}

export function clearDataCaches(specific?: keyof typeof inMemoryCache) {
  if (specific) {
    inMemoryCache[specific] = null;
  } else {
    for (const key of Object.keys(inMemoryCache) as (keyof typeof inMemoryCache)[]) {
      inMemoryCache[key] = null;
    }
  }
  if (typeof window !== 'undefined') {
    try {
      if (!specific || specific === 'marbles') {
        localStorage.removeItem('cached_marbles_data');
      }
      if (!specific || specific === 'fixingMaterials') {
        localStorage.removeItem('cached_fixing_materials_data');
      }
      if (!specific || specific === 'serviceProviders') {
        localStorage.removeItem('cached_service_providers_data');
      }
      if (!specific || specific === 'buildYourHomeRates') {
        localStorage.removeItem('cached_build_your_home_rates');
      }
      if (!specific || specific === 'renovationRates') {
        localStorage.removeItem('cached_renovation_rates');
      }
    } catch (e) {}
  }
}

export type AppSyncEventType = 
  | 'category_order_updated' 
  | 'products_updated' 
  | 'homepage_updated' 
  | 'costs_updated' 
  | 'suppliers_updated'
  | 'representatives_updated'
  | 'rep_jobs_updated'
  | 'partner_companies_updated';

/**
 * Broadcasts an update across the current window, all browser tabs/windows,
 * and localStorage so every view immediately reflects changes.
 */
export function broadcastAppUpdate(type: AppSyncEventType, detail?: any) {
  // Invalidate in-memory caches based on update type
  if (type === 'products_updated') {
    clearDataCaches('marbles');
    clearDataCaches('fixingMaterials');
  } else if (type === 'category_order_updated' || type === 'homepage_updated') {
    clearDataCaches('homepageConfig');
    clearDataCaches('homepageContent');
    clearDataCaches('adminBackground');
  } else if (type === 'costs_updated') {
    clearDataCaches('costsConfig');
    clearDataCaches('dailyRates');
    clearDataCaches('buildYourHomeRates');
    clearDataCaches('renovationRates');
  } else {
    clearDataCaches();
  }

  if (typeof window === 'undefined') return;
  try {
    // 1. Dispatch custom events in the current window
    window.dispatchEvent(new CustomEvent(type, { detail }));
    window.dispatchEvent(new CustomEvent('app_data_sync', { detail: { type, detail, timestamp: Date.now() } }));

    // 2. Broadcast across tabs via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('stone_expert_sync_channel');
        channel.postMessage({ type, detail, timestamp: Date.now() });
        channel.close();
      } catch (e) {}
    }

    // 3. Update localStorage timestamp to trigger storage event on other tabs
    try {
      localStorage.setItem(`app_sync_${type}`, String(Date.now()));
      localStorage.setItem('app_sync_last_change', String(Date.now()));
    } catch (e) {}
  } catch (err) {
    console.warn("broadcastAppUpdate error:", err);
  }
}

/**
 * Subscribes to live app updates from any tab or component.
 */
export function subscribeToAppUpdates(
  callback: (event: { type: string; detail?: any }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    callback({ type: e.type, detail: custom.detail });
  };

  const types: AppSyncEventType[] = [
    'category_order_updated',
    'products_updated',
    'homepage_updated',
    'costs_updated',
    'suppliers_updated',
    'representatives_updated',
    'rep_jobs_updated'
  ];

  types.forEach(t => window.addEventListener(t, handleCustomEvent));
  window.addEventListener('app_data_sync', handleCustomEvent);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('stone_expert_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type) {
          callback(event.data);
        }
      };
    } catch (e) {}
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith('app_sync_')) {
      const type = e.key.replace('app_sync_', '');
      callback({ type });
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    types.forEach(t => window.removeEventListener(t, handleCustomEvent));
    window.removeEventListener('app_data_sync', handleCustomEvent);
    if (channel) {
      try { channel.close(); } catch (e) {}
    }
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Robust Client-Side Image Compressor to fit within Firebase 1MB limit.
 */
export async function processImageFile(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.5): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new (window as any).Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Orders Management
 */
export async function saveOrder(orderData: any): Promise<{ success: boolean; order?: any; error?: string }> {
  const orderId = orderData.id || `ORD-${Date.now()}`;
  const cleanData = JSON.parse(JSON.stringify({
    ...orderData,
    id: orderId,
    date: orderData.date || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('stone_expert_orders_cache');
      const existing: Order[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter(o => o && o.id !== orderId);
      localStorage.setItem('stone_expert_orders_cache', JSON.stringify([cleanData, ...filtered].slice(0, 150)));
      window.dispatchEvent(new CustomEvent('orders_updated', { detail: cleanData }));
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return { success: true, order: cleanData };

  try {
    const docRef = doc(db, 'orders', orderId);
    await withFastTimeout(setDoc(docRef, cleanData, { merge: true }), 2500);
    return { success: true, order: cleanData };
  } catch (error: any) {
    return { success: true, order: cleanData };
  }
}

export async function getOrders(limitCount: number = 100): Promise<Order[]> {
  let localOrders: Order[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('stone_expert_orders_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localOrders = parsed;
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return localOrders;
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, limit(limitCount));
    const snapshot = await withFastTimeout(getDocs(q), 2800);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    const mergedMap = new Map<string, Order>();
    localOrders.forEach(o => { if (o && o.id) mergedMap.set(o.id, o); });
    results.forEach(o => { if (o && o.id) mergedMap.set(o.id, o); });
    const sorted = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (typeof window !== 'undefined' && sorted.length > 0) {
      try {
        localStorage.setItem('stone_expert_orders_cache', JSON.stringify(sorted.slice(0, 150)));
      } catch (e) {}
    }
    return sorted;
  } catch (error: any) {
    logFetchError("Error fetching orders", error);
    return localOrders;
  }
}

export async function getOrdersByUser(userId: string, limitCount: number = 50): Promise<Order[]> {
    const db = getDb();
    if (!db || !userId) return [];
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', userId), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    } catch (error: any) {
        logFetchError("Error fetching orders by user", error);
        return [];
    }
}

export async function getOrdersByIds(ids: string[]): Promise<Order[]> {
  const db = getDb();
  if (!db || !ids || ids.length === 0) return [];
  try {
    const orders: Order[] = [];
    const validIds = ids.filter(id => typeof id === 'string' && id.trim() !== '');
    for (const id of validIds) {
      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      }
    }
    return orders;
  } catch (error: any) {
    logFetchError("Error fetching orders by IDs", error);
    return [];
  }
}

export async function deleteOrder(orderId: string) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    return { success: true };
  } catch (e) {
    console.error("Error deleting order:", e);
    return { success: false, error: "Failed to delete" };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('stone_expert_orders_cache');
      const existing: Order[] = raw ? JSON.parse(raw) : [];
      const updated = existing.map(o =>
        o && o.id === orderId ? { ...o, status: status as Order['status'] } : o
      );
      localStorage.setItem('stone_expert_orders_cache', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('orders_updated', { detail: { id: orderId, status } }));
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return { success: true };
  try {
    await withFastTimeout(
      setDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date().toISOString() }, { merge: true }),
      2500
    );
    return { success: true };
  } catch (e) {
    console.error("Error updating order status:", e);
    return { success: true };
  }
}

/**
 * Product Management
 */
function mergeWithInitial(currentList: Marble[], deletedIds?: Set<string>): Marble[] {
  const cleanImage = (url?: string): string => {
    const brokenUrl = "https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5";
    const validUrl = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a";
    if (url && (url.includes(brokenUrl) || url.includes("502005229762-fc1b2b812ca5"))) {
      return url.replace(brokenUrl, validUrl).replace("502005229762-fc1b2b812ca5", "1584622650111-993a426fbf0a");
    }
    return url || '';
  };

  const initial = (initialMarbles as Marble[]).map(m => ({
    ...m,
    imageUrl: cleanImage(m.imageUrl)
  }));
  const existingIds = new Set(currentList.map(m => m.id));
  const missing = initial.filter(initM => !existingIds.has(initM.id) && (!deletedIds || !deletedIds.has(initM.id)));
  if (missing.length > 0) {
    return [...currentList, ...missing];
  }
  return currentList;
}

function updateLocalMarbleCache(id: string, updatedMarble: Marble) {
  if (inMemoryCache.marbles?.data) {
    inMemoryCache.marbles.data = inMemoryCache.marbles.data.map(m => m.id === id ? { ...m, ...updatedMarble } : m);
    inMemoryCache.marbles.timestamp = Date.now();
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_marbles_data');
      if (cached) {
        const parsed: Marble[] = JSON.parse(cached);
        const index = parsed.findIndex(m => m.id === id);
        if (index > -1) {
          parsed[index] = { ...parsed[index], ...updatedMarble };
        } else {
          parsed.unshift(updatedMarble);
        }
        localStorage.setItem('cached_marbles_data', JSON.stringify(parsed));
      }
    } catch (e) {}
  }
}

function addLocalMarbleCache(newMarble: Marble) {
  if (inMemoryCache.marbles?.data) {
    inMemoryCache.marbles.data = [newMarble, ...inMemoryCache.marbles.data];
    inMemoryCache.marbles.timestamp = Date.now();
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_marbles_data');
      if (cached) {
        const parsed: Marble[] = JSON.parse(cached);
        localStorage.setItem('cached_marbles_data', JSON.stringify([newMarble, ...parsed]));
      }
    } catch (e) {}
  }
}

function deleteLocalMarbleCache(id: string) {
  if (inMemoryCache.marbles?.data) {
    inMemoryCache.marbles.data = inMemoryCache.marbles.data.filter(m => m.id !== id);
    inMemoryCache.marbles.timestamp = Date.now();
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_marbles_data');
      if (cached) {
        const parsed: Marble[] = JSON.parse(cached);
        localStorage.setItem('cached_marbles_data', JSON.stringify(parsed.filter(m => m.id !== id)));
      }
    } catch (e) {}
  }
}

export async function getMarbles(): Promise<Marble[]> {
  const getCleanedInitial = (): Marble[] => {
    return (initialMarbles as Marble[]).map(m => ({
      ...m,
      imageUrl: cleanMarbleImage(m.imageUrl)
    }));
  };

  // 1. Check in-memory TTL cache
  const now = Date.now();
  if (inMemoryCache.marbles && inMemoryCache.marbles.timestamp > 0 && (now - inMemoryCache.marbles.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.marbles.data;
  }

  if (inFlightRequests.marbles) {
    return inFlightRequests.marbles;
  }

  const db = getDb();
  if (!db) {
    if (inMemoryCache.marbles?.data) {
      const merged = mergeWithInitial(inMemoryCache.marbles.data);
      inMemoryCache.marbles.data = merged;
      return merged;
    }
    return getCleanedInitial();
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'marbles');
      const [snapshot, delSnap] = await Promise.all([
        withFastTimeout(getDocs(colRef), 2500),
        withFastTimeout(getDoc(doc(db, 'config', 'deleted_items')), 1500).catch(() => null),
      ]);
      const dbMarbles = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          imageUrl: cleanMarbleImage(data.imageUrl as string)
        } as Marble;
      });

      const deletedIds = new Set<string>();
      if (delSnap && delSnap.exists()) {
        const delData = delSnap.data();
        Object.keys(delData).forEach(k => {
          if (k.startsWith('marble_') && delData[k] === true) {
            deletedIds.add(k.replace('marble_', ''));
          }
        });
      }

      const mergedList = getCleanedInitial().filter((m) => !deletedIds.has(m.id));
      const indexById = new Map<string, number>();
      mergedList.forEach((m, idx) => indexById.set(m.id, idx));

      dbMarbles.forEach(dbM => {
        if (deletedIds.has(dbM.id) || (dbM as any).isDeleted) return;
        const index = indexById.get(dbM.id);
        if (index !== undefined) {
          const localImg = mergedList[index].imageUrl;
          mergedList[index] = { ...mergedList[index], ...dbM };
          if (!mergedList[index].imageUrl || mergedList[index].imageUrl.trim() === "") {
            mergedList[index].imageUrl = localImg;
          }
        } else {
          indexById.set(dbM.id, mergedList.length);
          mergedList.push(dbM);
        }
      });

      inMemoryCache.marbles = { data: mergedList, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_marbles_data', JSON.stringify(mergedList));
        } catch (e) {}
      }
      return mergedList;
    } catch (error) {
      logFetchError("Error fetching marbles", error);
      return getInstantMarbles();
    } finally {
      delete inFlightRequests.marbles;
    }
  })();

  inFlightRequests.marbles = promise;
  return promise;
}

export async function addMarble(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  
  const name = formData.get('name') as string;
  const imageFile = formData.get('image') as File | null;
  
  let imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(name || 'Marble')}`;
  if (imageFile) {
    imageUrl = await processImageFile(imageFile);
  }

  // Process gallery images if present
  const galleryImages: GalleryImage[] = [];
  const galleryFiles = formData.getAll('galleryImages') as File[];
  const galleryTitles = formData.getAll('galleryTitles') as string[];
  
  for (let i = 0; i < galleryFiles.length; i++) {
    const file = galleryFiles[i];
    if (file && file.size > 0) {
      try {
        const url = await processImageFile(file);
        const altText = galleryTitles[i] || `Gallery Image ${i + 1}`;
        galleryImages.push({
          id: `gal-${Date.now()}-${i}`,
          url,
          altText
        });
      } catch (err) {
        console.error("Error processing gallery file:", err);
      }
    }
  }

  const ratingVal = formData.get('rating') ? Number(formData.get('rating')) : 5;
  const reviewsStr = formData.get('reviews') as string;
  const reviewsVal = reviewsStr ? JSON.parse(reviewsStr) : [];
  const rawCategory = (formData.get('category') as string)?.trim() || (formData.get('materialType') as string)?.trim();
  if (rawCategory) {
    await ensureCategoryExists(rawCategory);
  }

  const newMarble: Omit<Marble, 'id'> = {
    name,
    materialType: formData.get('materialType') as any,
    category: rawCategory,
    origin: formData.get('origin') as any,
    description: formData.get('description') as string,
    imageUrl,
    imageHint: 'marble texture',
    uses: formData.get('uses') as string || '',
    characteristics: formData.get('characteristics') as string || '',
    variants: JSON.parse(formData.get('variants') as string),
    gallery: galleryImages,
    isFeatured: formData.get('isFeatured') === 'true',
    isHidden: false,
    unit: formData.get('unit') as string || 'Square feet',
    rating: ratingVal,
    reviews: reviewsVal,
    onSale: formData.get('onSale') === 'true',
    discount: formData.get('discount') ? Number(formData.get('discount')) : 0,
    discountType: (formData.get('discountType') as 'percentage' | 'fixed') || 'percentage',
    saleBadgeText: (formData.get('saleBadgeText') as string) || '',
    heroHighlightOnSale: formData.get('heroHighlightOnSale') !== null ? formData.get('heroHighlightOnSale') === 'true' : true
  };

  try {
    const docRef = await addDoc(collection(db, 'marbles'), newMarble);
    const addedMarble = { id: docRef.id, ...newMarble } as Marble;
    addLocalMarbleCache(addedMarble);
    broadcastAppUpdate('products_updated', { entity: 'marble', id: docRef.id });
    return { success: true, newMarble: addedMarble };
  } catch (e: any) {
    console.warn("Firestore addMarble failed, saving locally:", e);
    const localId = `marble-local-${Date.now()}`;
    const addedMarble = { id: localId, ...newMarble } as Marble;
    addLocalMarbleCache(addedMarble);
    broadcastAppUpdate('products_updated', { entity: 'marble', id: localId });
    return { success: true, newMarble: addedMarble };
  }
}

export async function updateMarbleDetails(id: string, data: any) {
  const rawCat = data.category || data.materialType;
  if (rawCat) {
    try { await ensureCategoryExists(rawCat); } catch (e) {}
  }
  const finalData = { ...data, updatedAt: new Date().toISOString() };
  const updatedMarble = { id, ...finalData } as Marble;
  updateLocalMarbleCache(id, updatedMarble);

  const db = getDb();
  if (!db) {
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true, updatedMarble };
  }
  try {
    const docRef = doc(db, 'marbles', id);
    await setDoc(docRef, finalData, { merge: true });
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true, updatedMarble };
  } catch (e: any) {
    console.warn("Firestore updateMarbleDetails failed, saved locally:", e);
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true, updatedMarble };
  }
}

export async function updateMarbleImage(formData: FormData) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    const id = formData.get('id') as string;
    const file = formData.get('image') as File;
    if (!file) return { success: false, error: "No file" };

    try {
        const imageUrl = await processImageFile(file);
        updateLocalMarbleCache(id, { id, imageUrl, updatedAt: new Date().toISOString() } as unknown as Marble);
        await updateDoc(doc(db, 'marbles', id), { imageUrl, updatedAt: new Date().toISOString() });
        broadcastAppUpdate('products_updated', { entity: 'marble', id });
        return { success: true, imageUrl };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMarble(id: string) {
  deleteLocalMarbleCache(id);
  const db = getDb();
  if (!db) {
    clearDataCaches('marbles');
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true };
  }
  try {
    await setDoc(doc(db, 'config', 'deleted_items'), {
      [`marble_${id}`]: true
    }, { merge: true });
    await deleteDoc(doc(db, 'marbles', id));
    clearDataCaches('marbles');
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true };
  } catch (e: any) {
    console.warn("Firestore deleteMarble failed, deleted locally:", e);
    clearDataCaches('marbles');
    broadcastAppUpdate('products_updated', { entity: 'marble', id });
    return { success: true };
  }
}

/**
 * Fixing Materials
 */
export async function getFixingMaterials(): Promise<FixingMaterial[]> {
    const now = Date.now();
    if (inMemoryCache.fixingMaterials && inMemoryCache.fixingMaterials.timestamp > 0 && (now - inMemoryCache.fixingMaterials.timestamp < CACHE_TTL_MS)) {
        return inMemoryCache.fixingMaterials.data;
    }
    if (inFlightRequests.fixingMaterials) {
        return inFlightRequests.fixingMaterials;
    }

    const db = getDb();
    if (!db) {
        return getInstantFixingMaterials();
    }

    const promise = (async () => {
      try {
          const [snapshot, delSnap] = await Promise.all([
            withFastTimeout(getDocs(collection(db, 'fixing_materials')), 2500),
            withFastTimeout(getDoc(doc(db, 'config', 'deleted_items')), 1500).catch(() => null),
          ]);
          const dbItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FixingMaterial));

          const deletedIds = new Set<string>();
          if (delSnap && delSnap.exists()) {
            const delData = delSnap.data();
            Object.keys(delData).forEach(k => {
              if (k.startsWith('fixing_') && delData[k] === true) {
                deletedIds.add(k.replace('fixing_', ''));
              }
            });
          }

          const merged = (initialFixingMaterials as FixingMaterial[])
            .map(m => ({ ...m }))
            .filter(m => !deletedIds.has(m.id));
          const indexById = new Map<string, number>();
          merged.forEach((m, idx) => indexById.set(m.id, idx));

          dbItems.forEach(dbItem => {
              if (deletedIds.has(dbItem.id) || (dbItem as any).isDeleted) return;
              const index = indexById.get(dbItem.id);
              if (index !== undefined) {
                  const localImg = merged[index].imageUrl;
                  merged[index] = { ...merged[index], ...dbItem };
                  if (!merged[index].imageUrl || merged[index].imageUrl.trim() === "") {
                      merged[index].imageUrl = localImg;
                  }
              } else {
                  indexById.set(dbItem.id, merged.length);
                  merged.push(dbItem);
              }
          });

          inMemoryCache.fixingMaterials = { data: merged, timestamp: Date.now() };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('cached_fixing_materials_data', JSON.stringify(merged));
            } catch (e) {}
          }
          return merged;
      } catch (e) {
          logFetchError("Error fetching fixing materials", e);
          return getInstantFixingMaterials();
      } finally {
          delete inFlightRequests.fixingMaterials;
      }
    })();

    inFlightRequests.fixingMaterials = promise;
    return promise;
}

export async function addFixingMaterial(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  const imageFile = formData.get('image') as File | null;
  let imageUrl = 'https://placehold.co/600x400?text=Fixing+Material';
  if (imageFile) imageUrl = await processImageFile(imageFile);

  const rawCat = (formData.get('category') as string)?.trim();
  if (rawCat) {
    await ensureCategoryExists(rawCat);
  }

  const material = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    price: Number(formData.get('price')),
    unit: formData.get('unit') as string,
    category: formData.get('category') as any,
    imageUrl,
    isFeatured: formData.get('isFeatured') === 'true',
    onSale: formData.get('onSale') === 'true',
    discount: formData.get('discount') ? Number(formData.get('discount')) : 0,
    discountType: (formData.get('discountType') as 'percentage' | 'fixed') || 'percentage',
    saleBadgeText: (formData.get('saleBadgeText') as string) || '',
    heroHighlightOnSale: formData.get('heroHighlightOnSale') !== null ? formData.get('heroHighlightOnSale') === 'true' : true
  };

  try {
    const docRef = await addDoc(collection(db, 'fixing_materials'), material);
    clearDataCaches('fixingMaterials');
    broadcastAppUpdate('products_updated', { entity: 'fixing_material', id: docRef.id });
    return { success: true, newMaterial: { id: docRef.id, ...material } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateFixingMaterialDetails(formData: FormData) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    const id = formData.get('id') as string;
    const rawCat = (formData.get('category') as string)?.trim();
    if (rawCat) {
      await ensureCategoryExists(rawCat);
    }
    const updateData: any = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        price: Number(formData.get('price')),
        unit: formData.get('unit') as string,
        category: formData.get('category') as any,
        isFeatured: formData.get('isFeatured') === 'true',
        updatedAt: new Date().toISOString()
    };
    if (formData.get('onSale') !== null) {
      updateData.onSale = formData.get('onSale') === 'true';
    }
    if (formData.get('discount') !== null) {
      updateData.discount = Number(formData.get('discount')) || 0;
    }
    if (formData.get('discountType') !== null) {
      updateData.discountType = formData.get('discountType') as 'percentage' | 'fixed';
    }
    if (formData.get('saleBadgeText') !== null) {
      updateData.saleBadgeText = formData.get('saleBadgeText') as string;
    }
    if (formData.get('heroHighlightOnSale') !== null) {
      updateData.heroHighlightOnSale = formData.get('heroHighlightOnSale') === 'true';
    }
    const imageFile = formData.get('image') as File | null;
    if (imageFile) updateData.imageUrl = await processImageFile(imageFile);

    try {
        await setDoc(doc(db, 'fixing_materials', id), updateData, { merge: true });
        clearDataCaches('fixingMaterials');
        broadcastAppUpdate('products_updated', { entity: 'fixing_material', id });
        return { success: true, updatedMaterial: { id, ...updateData } as FixingMaterial };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFixingMaterial(id: string) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    try {
        await setDoc(doc(db, 'config', 'deleted_items'), {
          [`fixing_${id}`]: true
        }, { merge: true });
        await deleteDoc(doc(db, 'fixing_materials', id));
        clearDataCaches('fixingMaterials');
        broadcastAppUpdate('products_updated', { entity: 'fixing_material', id });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Service Providers
 */
export async function getServiceProviders(): Promise<ServiceProvider[]> {
  const now = Date.now();
  if (inMemoryCache.serviceProviders && (now - inMemoryCache.serviceProviders.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.serviceProviders.data;
  }
  if (inFlightRequests.serviceProviders) {
    return inFlightRequests.serviceProviders;
  }

  const db = getDb();
  if (!db) {
    return getInstantServiceProviders();
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'service_providers');
      const snapshot = await withFastTimeout(getDocs(colRef), 2500);
      const dbProviders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceProvider));

      const mergedList = (initialServiceProviders as ServiceProvider[]).map(p => ({ ...p }));
      dbProviders.forEach(dbP => {
        const index = mergedList.findIndex((p) => p.id === dbP.id);
        if (index > -1) {
          const localImg = mergedList[index].imageUrl;
          mergedList[index] = { ...mergedList[index], ...dbP };
          if (!mergedList[index].imageUrl || mergedList[index].imageUrl.trim() === "") {
            mergedList[index].imageUrl = localImg;
          }
        } else {
          mergedList.push(dbP);
        }
      });
      inMemoryCache.serviceProviders = { data: mergedList, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_service_providers_data', JSON.stringify(mergedList));
        } catch (e) {}
      }
      return mergedList;
    } catch (error) {
      logFetchError("Error fetching service providers", error);
      return getInstantServiceProviders();
    } finally {
      delete inFlightRequests.serviceProviders;
    }
  })();

  inFlightRequests.serviceProviders = promise;
  return promise;
}

export async function addServiceProvider(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  const imageFile = formData.get('image') as File | null;
  let imageUrl = 'https://placehold.co/100x100?text=SP';
  if (imageFile) imageUrl = await processImageFile(imageFile);

  const jobsData = formData.get('jobs') ? JSON.parse(formData.get('jobs') as string) : [];

  const provider = {
    name: formData.get('name') as string,
    service: formData.get('service') as any,
    phone: formData.get('phone') as string,
    status: formData.get('status') as any,
    rating: Number(formData.get('rating')),
    imageUrl,
    gallery: [],
    socials: {
        whatsapp: formData.get('whatsapp') as string,
        facebook: formData.get('facebook') as string,
        instagram: formData.get('instagram') as string,
    },
    jobs: jobsData
  };

  try {
    const docRef = await addDoc(collection(db, 'service_providers'), provider);
    return { success: true, newProvider: { id: docRef.id, ...provider } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateServiceProvider(formData: FormData) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    const id = formData.get('id') as string;
    
    const jobsData = formData.get('jobs') ? JSON.parse(formData.get('jobs') as string) : [];

    const updateData: any = {
        name: formData.get('name') as string,
        service: formData.get('service') as any,
        phone: formData.get('phone') as string,
        status: formData.get('status') as any,
        rating: Number(formData.get('rating')),
        updatedAt: new Date().toISOString(),
        socials: {
            whatsapp: formData.get('whatsapp') as string,
            facebook: formData.get('facebook') as string,
            instagram: formData.get('instagram') as string,
        },
        jobs: jobsData
    };

    const imageUrl = formData.get('imageUrl') as string;
    if (imageUrl) updateData.imageUrl = imageUrl;

    const galleryStr = formData.get('gallery') as string;
    if (galleryStr) {
        try {
            updateData.gallery = JSON.parse(galleryStr);
        } catch (err) {
            console.error("Error parsing gallery JSON:", err);
        }
    }

    const imageFile = formData.get('image') as File | null;
    if (imageFile) updateData.imageUrl = await processImageFile(imageFile);

    try {
        await setDoc(doc(db, 'service_providers', id), updateData, { merge: true });
        return { success: true, updatedProvider: { id, ...updateData } as ServiceProvider };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteServiceProvider(id: string) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    try {
        await deleteDoc(doc(db, 'service_providers', id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addProviderGalleryImage(formData: FormData) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    const providerId = formData.get('providerId') as string;
    const file = formData.get('image') as File;
    const title = (formData.get('title') as string) || "Work sample";
    const priceStr = formData.get('price');
    const price = priceStr ? Number(priceStr) : undefined;
    const unit = (formData.get('unit') as string) || "";
    
    try {
        const url = await processImageFile(file);
        const newImage: any = { 
            id: `img-${Date.now()}`, 
            url, 
            altText: title 
        };
        if (price !== undefined && !isNaN(price)) {
            newImage.price = price;
        }
        if (unit) {
            newImage.unit = unit;
        }
        
        await updateDoc(doc(db, 'service_providers', providerId), {
            gallery: arrayUnion(newImage),
            updatedAt: new Date().toISOString()
        });
        return { success: true, newImage };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteProviderGalleryImage(providerId: string, imageId: string) {
    const db = getDb();
    if (!db) return { success: false, error: "Database not connected" };
    try {
        const docRef = doc(db, 'service_providers', providerId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const gallery = snap.data().gallery as GalleryImage[];
            const imageToRemove = gallery.find(img => img.id === imageId);
            if (imageToRemove) await updateDoc(docRef, { gallery: arrayRemove(imageToRemove) });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Settings & Config
 */
export async function updateLetterhead(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  const file = formData.get('letterhead') as File;
  try {
    let url = await processImageFile(file, 1200, 1600, 0.4);
    
    // Safety check: Firestore document max is 1MB. Let's auto-downscale if size exceeds ~950KB
    if (url.length > 950000) {
      url = await processImageFile(file, 900, 1200, 0.25);
    }
    
    if (url.length > 1000000) {
      return { success: false, error: "The uploaded letterhead file is too large to store. Please use a smaller file or crop it first." };
    }

    await setDoc(doc(db, 'config', 'homepage'), { letterheadUrl: url, lastUpdate: new Date().toISOString() }, { merge: true });
    broadcastAppUpdate('homepage_updated', { letterheadUrl: url });
    return { success: true, newUrl: url }; 
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateLogo(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  const file = formData.get('logo') as File;
  try {
    let url = await processImageFile(file, 400, 400, 0.6);
    
    if (url.length > 950000) {
      url = await processImageFile(file, 300, 300, 0.4);
    }
    
    if (url.length > 1000000) {
      return { success: false, error: "The uploaded logo file is too large to store. Please use a smaller file." };
    }

    await setDoc(doc(db, 'config', 'homepage'), { logoUrl: url, lastUpdate: new Date().toISOString() }, { merge: true });
    broadcastAppUpdate('homepage_updated', { logoUrl: url });
    return { success: true, newUrl: url }; 
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function clearLogo() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { logoUrl: "", lastUpdate: new Date().toISOString() }, { merge: true });
    broadcastAppUpdate('homepage_updated', { logoUrl: "" });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function clearLetterhead() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { letterheadUrl: "", lastUpdate: new Date().toISOString() }, { merge: true });
    broadcastAppUpdate('homepage_updated', { letterheadUrl: "" });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getHomepageContent() {
  const now = Date.now();
  if (inMemoryCache.homepageContent && (now - inMemoryCache.homepageContent.timestamp < CACHE_TTL_MS)) {
    return { success: true, content: inMemoryCache.homepageContent.data };
  }
  if (inFlightRequests.homepageContent) {
    return inFlightRequests.homepageContent;
  }
  const db = getDb();
  if (!db) return { success: true, content: inMemoryCache.homepageContent?.data || null };
  const promise = (async () => {
    try {
      const snap = await withFastTimeout(getDoc(doc(db, 'config', 'homepage_content')), 2000);
      const content = snap.exists() ? snap.data() : null;
      inMemoryCache.homepageContent = { data: content, timestamp: Date.now() };
      if (typeof window !== 'undefined' && content) {
        try {
          localStorage.setItem('cached_homepage_content', JSON.stringify(content));
        } catch (e) {}
      }
      return { success: true, content };
    } catch (error: any) {
      logFetchError("Error fetching homepage content", error);
      let fallback = inMemoryCache.homepageContent?.data || null;
      if (!fallback && typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('cached_homepage_content');
          if (cached) fallback = JSON.parse(cached);
        } catch (e) {}
      }
      return { success: true, content: fallback };
    } finally {
      delete inFlightRequests.homepageContent;
    }
  })();
  inFlightRequests.homepageContent = promise;
  return promise;
}

export async function updateHomepageContent(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const galleryData = JSON.parse(formData.get('galleryData') as string);
    const processedGallery = await Promise.all(galleryData.map(async (item: any) => {
      const beforeFile = formData.get(`before_${item.id}`) as File | null;
      const afterFile = formData.get(`after_${item.id}`) as File | null;
      if (beforeFile) item.before = await processImageFile(beforeFile, 800, 600);
      if (afterFile) item.after = await processImageFile(afterFile, 800, 600);
      return item;
    }));

    const content = {
      hero: {
        en: { heading: formData.get('heroHeadingEn'), subheading: formData.get('heroSubheadingEn') },
        ur: { heading: formData.get('heroHeadingUr'), subheading: formData.get('heroSubheadingUr') }
      },
      buildWithUs: {
        en: { heading: formData.get('headingEn'), subheading: formData.get('subheadingEn') },
        ur: { heading: formData.get('headingUr'), subheading: formData.get('subheadingUr') },
        gallery: processedGallery
      },
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'config', 'homepage_content'), content, { merge: true });
    broadcastAppUpdate('homepage_updated', content);
    return { success: true, updatedContent: content };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function deduplicateCategories(cats: any[]): string[] {
  if (!Array.isArray(cats)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of cats) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === 'marble') continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

export function getAllCategoriesList(): string[] {
  let categories: string[] = config.categoryOrder || [];
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          categories = parsed;
        }
      }
    } catch (e) {}
  }
  return deduplicateCategories(categories);
}

export async function ensureCategoryExists(catName?: string | null) {
  if (!catName) return;
  const trimmed = catName.trim();
  if (!trimmed || trimmed.toLowerCase() === 'marble') return;
  
  const current = getAllCategoriesList();
  if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    const updated = deduplicateCategories([...current, trimmed]);
    await updateCategoryOrder(updated);
  }
}

export async function addCategory(categoryName: string) {
  const trimmed = categoryName.trim();
  if (!trimmed) return { success: false, error: 'Category name is required' };
  
  const current = getAllCategoriesList();
  if (current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    return { success: true, categories: current };
  }
  const updated = deduplicateCategories([...current, trimmed]);
  await updateCategoryOrder(updated);
  return { success: true, categories: updated };
}

export async function removeCategory(categoryToDelete: string) {
  const current = getAllCategoriesList();
  const updated = deduplicateCategories(current.filter(c => c.toLowerCase() !== categoryToDelete.toLowerCase()));
  await updateCategoryOrder(updated);
  return { success: true, categories: updated };
}

export async function updateCategoryOrder(categories: string[]) {
  const cleanCategories = deduplicateCategories(categories);
  // Sync to local storage for immediate persistence
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('local_category_order', JSON.stringify(cleanCategories));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  // Keep inMemoryCache in sync immediately
  if (inMemoryCache.homepageConfig) {
    inMemoryCache.homepageConfig.data = {
      ...(inMemoryCache.homepageConfig.data || {}),
      categoryOrder: cleanCategories
    };
    inMemoryCache.homepageConfig.timestamp = Date.now();
  } else {
    inMemoryCache.homepageConfig = {
      data: { categoryOrder: cleanCategories },
      timestamp: Date.now()
    };
  }

  broadcastAppUpdate('category_order_updated', cleanCategories);

  const db = getDb();
  if (!db) return { success: true };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { categoryOrder: cleanCategories }, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.error("Error updating category order in Firestore:", e);
    return { success: true }; // Local cache succeeded
  }
}

export async function updateCalculatorCategories(mapping: Record<string, string[]>) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { calculatorCategories: mapping }, { merge: true });
    broadcastAppUpdate('homepage_updated', { calculatorCategories: mapping });
    return { success: true };
  } catch (e: any) {
    console.error("Error updating calculator categories:", e);
    return { success: false, error: e.message || "Failed to save calculator categories" };
  }
}

export async function updateServiceTypes(types: string[]) {
  const db = getDb();
  if (!db) return { success: false, error: "No DB" };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { serviceTypes: types }, { merge: true });
    broadcastAppUpdate('homepage_updated', { serviceTypes: types });
    return { success: true };
  } catch (e) {
    console.error("Error updating service types:", e);
    return { success: false, error: "Fail" };
  }
}

export async function updateCosts(newCosts: any) {
  const db = getDb();
  if (!db) return { success: false, error: "No DB" };
  try {
    await setDoc(doc(db, 'config', 'costs'), { ...newCosts }, { merge: true });
    broadcastAppUpdate('costs_updated', newCosts);
    return { success: true, updatedCosts: newCosts };
  } catch (e) {
    console.error("Error updating costs:", e);
    return { success: false, error: "Fail" };
  }
}

export async function updateBusinessContact(data: any) {
  const db = getDb();
  if (!db) return { success: false, error: "No DB" };
  try {
    await setDoc(doc(db, 'config', 'homepage'), { 
        businessPhoneNumber: data.phoneNumber,
        businessWhatsAppNumber: data.whatsappNumber,
        googleMapsUrl: data.mapsUrl
    }, { merge: true });
    broadcastAppUpdate('homepage_updated', data);
    return { success: true };
  } catch (e) {
    console.error("Error updating business contact:", e);
    return { success: false, error: "Fail" };
  }
}

export async function logSearchTerm(term: string, found: boolean = false, source: 'text' | 'voice' = 'text') {
  const db = getDb();
  if (!db || !term || !term.trim()) return;
  try {
    const cleanTerm = term.trim().toLowerCase();
    await addDoc(collection(db, 'searches'), {
      term: cleanTerm,
      rawTerm: term.trim(),
      found: Boolean(found),
      source: source,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error logging search term:", e);
  }
}

export async function getSearchLogs(): Promise<Array<{ id: string; term: string; rawTerm?: string; found?: boolean; source?: string; timestamp: string }>> {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(collection(db, 'searches'), orderBy('timestamp', 'desc'), limit(500));
    const snap = await withFastTimeout(getDocs(q), 4000);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as { term: string; rawTerm?: string; found?: boolean; source?: string; timestamp: string })
    }));
  } catch (e) {
    logFetchError("Error getting search logs", e);
    // Fallback if index missing or error
    try {
      const snap = await withFastTimeout(getDocs(collection(db, 'searches')), 3000);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as { term: string; rawTerm?: string; found?: boolean; source?: string; timestamp: string })
      }));
      return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    } catch (err) {
      logFetchError("Fallback error getting search logs", err);
      return [];
    }
  }
}

export async function deleteSearchLog(id: string) {
  const db = getDb();
  if (!db || !id) return { success: false, error: "No DB or ID" };
  try {
    await deleteDoc(doc(db, 'searches', id));
    return { success: true };
  } catch (e: any) {
    console.error("Error deleting search log:", e);
    return { success: false, error: e.message };
  }
}

export async function clearAllSearchLogs() {
  const db = getDb();
  if (!db) return { success: false, error: "No DB" };
  try {
    const snap = await getDocs(collection(db, 'searches'));
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'searches', d.id)));
    await Promise.all(deletePromises);
    return { success: true };
  } catch (e: any) {
    console.error("Error clearing search logs:", e);
    return { success: false, error: e.message };
  }
}

export async function addGalleryImage(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "No DB" };
  const mId = formData.get('marbleId') as string;
  try {
    const url = await processImageFile(formData.get('image') as File);
    const newImage = { id: `gal-${Date.now()}`, url, altText: "Gallery" };
    await updateDoc(doc(db, 'marbles', mId), { gallery: arrayUnion(newImage) });
    return { success: true, newImage };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteGalleryImage(mId: string, imgId: string) {
    const db = getDb();
    if (!db) return { success: false, error: "No DB" };
    try {
        const snap = await getDoc(doc(db, 'marbles', mId));
        if (snap.exists()) {
            const img = (snap.data().gallery as any[]).find(i => i.id === imgId);
            if (img) await updateDoc(doc(db, 'marbles', mId), { gallery: arrayRemove(img) });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getHomepageConfig() {
  const now = Date.now();
  if (inMemoryCache.homepageConfig && (now - inMemoryCache.homepageConfig.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.homepageConfig.data;
  }
  if (inFlightRequests.homepageConfig) {
    return inFlightRequests.homepageConfig;
  }

  let localCategoryOrder: string[] | null = null;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        localCategoryOrder = JSON.parse(cached);
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) {
    const fallback = localCategoryOrder ? { categoryOrder: localCategoryOrder } : null;
    if (fallback) inMemoryCache.homepageConfig = { data: fallback, timestamp: Date.now() };
    return fallback;
  }

  const promise = (async () => {
    try {
      const snap = await withFastTimeout(getDoc(doc(db, 'config', 'homepage')), 2000);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.categoryOrder && Array.isArray(data.categoryOrder)) {
          const cleanOrder = deduplicateCategories(data.categoryOrder);
          data.categoryOrder = cleanOrder;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('local_category_order', JSON.stringify(cleanOrder));
            } catch (e) {}
          }
          inMemoryCache.homepageConfig = { data, timestamp: Date.now() };
          return data;
        }
        const res = localCategoryOrder ? { ...data, categoryOrder: localCategoryOrder } : data;
        inMemoryCache.homepageConfig = { data: res, timestamp: Date.now() };
        return res;
      }
      const fallback = localCategoryOrder ? { categoryOrder: localCategoryOrder } : null;
      inMemoryCache.homepageConfig = { data: fallback, timestamp: Date.now() };
      return fallback;
    } catch (e: any) {
      logFetchError("Error fetching homepage config", e);
      return localCategoryOrder ? { categoryOrder: localCategoryOrder } : (inMemoryCache.homepageConfig?.data || null);
    } finally {
      delete inFlightRequests.homepageConfig;
    }
  })();

  inFlightRequests.homepageConfig = promise;
  return promise;
}

export async function saveSaleRibbonStyle(style: Record<string, any>): Promise<{ success: boolean; saleRibbonStyle?: Record<string, any>; error?: string }> {
  const merged = {
    ...style,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_sale_ribbon_style', JSON.stringify(merged));
    } catch (e) {}
  }

  if (inMemoryCache.homepageConfig?.data) {
    inMemoryCache.homepageConfig = {
      data: { ...inMemoryCache.homepageConfig.data, saleRibbonStyle: merged },
      timestamp: Date.now()
    };
  }

  broadcastAppUpdate('sale_ribbon_style_updated', merged);

  const db = getDb();
  if (!db) return { success: true, saleRibbonStyle: merged };
  try {
    await setDoc(
      doc(db, 'config', 'homepage'),
      { saleRibbonStyle: merged, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { success: true, saleRibbonStyle: merged };
  } catch (e: any) {
    console.error("Error saving sale ribbon style:", e);
    return { success: false, error: e?.message || "Failed to save sale ribbon style" };
  }
}

export async function getCostsConfig() {
  const now = Date.now();
  if (inMemoryCache.costsConfig && (now - inMemoryCache.costsConfig.timestamp < 30000)) {
    return inMemoryCache.costsConfig.data;
  }

  const db = getDb();
  if (!db) return costsConfig;
  try {
    const snap = await withFastTimeout(getDoc(doc(db, 'config', 'costs')), 2000);
    const data = snap.exists() ? snap.data() : costsConfig;
    inMemoryCache.costsConfig = { data, timestamp: Date.now() };
    if (typeof window !== 'undefined' && data) {
      try {
        localStorage.setItem('cached_costs_config', JSON.stringify(data));
      } catch (e) {}
    }
    return data;
  } catch (e: any) {
    logFetchError("Error fetching costs config", e);
    return inMemoryCache.costsConfig?.data || costsConfig;
  }
}

/**
 * Admin Panel Custom Background & Visual Controls
 */
export interface AdminBackgroundConfig {
  imageUrl: string;
  highlight: number; // Brightness / Highlight percentage: 0 - 200 (default 100)
  blur: number; // Blur in pixels: 0 - 30 (default 4)
  opacity: number; // Opacity percentage: 5 - 100 (default 25)
  contrast: number; // Contrast percentage: 50 - 200 (default 105)
  updatedAt?: string;
}

export const defaultAdminBackgroundConfig: AdminBackgroundConfig = {
  imageUrl: '',
  highlight: 100,
  blur: 4,
  opacity: 25,
  contrast: 105,
};

export async function getAdminBackgroundConfig(): Promise<AdminBackgroundConfig> {
  const now = Date.now();
  if (inMemoryCache.adminBackground && (now - inMemoryCache.adminBackground.timestamp < 30000)) {
    return inMemoryCache.adminBackground.data;
  }

  const db = getDb();
  if (!db) return defaultAdminBackgroundConfig;
  try {
    const snap = await withFastTimeout(getDoc(doc(db, 'config', 'admin_background')), 2000);
    if (snap.exists()) {
      const data = { ...defaultAdminBackgroundConfig, ...snap.data() } as AdminBackgroundConfig;
      inMemoryCache.adminBackground = { data, timestamp: Date.now() };
      return data;
    }
    return defaultAdminBackgroundConfig;
  } catch (e: any) {
    logFetchError("Error fetching admin background config", e);
    return inMemoryCache.adminBackground?.data || defaultAdminBackgroundConfig;
  }
}

export async function updateAdminBackgroundConfig(configData: Partial<AdminBackgroundConfig>) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const cleanData = {
      ...configData,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'config', 'admin_background'), cleanData, { merge: true });
    return { success: true, updatedConfig: cleanData };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to update background configuration" };
  }
}

export async function uploadAdminBackgroundImage(formData: FormData) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  const file = formData.get('image') as File;
  if (!file) return { success: false, error: "No image file provided" };
  try {
    let url = await processImageFile(file, 1920, 1080, 0.6);
    if (url.length > 900000) {
      url = await processImageFile(file, 1280, 720, 0.45);
    }
    if (url.length > 1000000) {
      return { success: false, error: "The uploaded image is too large to store in database. Please choose a smaller file." };
    }
    await setDoc(doc(db, 'config', 'admin_background'), { imageUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true, newUrl: url };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to upload image" };
  }
}

export async function clearAdminBackgroundImage() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'admin_background'), { imageUrl: '', updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to clear background image" };
  }
}

/**
 * Build Your Home Page Rates Configuration
 */
export interface CustomRenovationItem {
  id: string;
  nameEn: string;
  nameUr?: string;
  rate: number;
  unit: string;
  descriptionEn?: string;
  descriptionUr?: string;
}

export interface CustomRenovationCategory {
  id: string;
  titleEn: string;
  titleUr?: string;
  descriptionEn?: string;
  descriptionUr?: string;
  items: CustomRenovationItem[];
}

export interface BuildYourHomeRates {
  maintenance: {
    polishing: number;
    repair: number;
    cleaning: number;
    sealing: number;
    alignment: number;
    urgencyMultipliers: {
      standard: number;
      priority: number;
      emergency: number;
    };
  };
  newProjects: {
    baseCostPerSqFt?: number;
    gradeRates: {
      budget: number;
      premium: number;
      luxury: number;
    };
    gradeMultipliers?: {
      standard: number;
      premium: number;
      luxury: number;
    };
    scopeMultipliers: {
      base: number;
      flooring: number;
      stairs: number;
      kitchen: number;
      elevation: number;
      bathrooms: number;
    };
    baseAreaSqFt: {
      marla5: number;
      marla10: number;
      kanal1: number;
      kanal2: number;
      commercial: number;
    };
    floorDefaults?: {
      marla5: { ground: number; first: number; mezzanine: number; second: number; basement: number };
      marla10: { ground: number; first: number; mezzanine: number; second: number; basement: number };
      kanal1: { ground: number; first: number; mezzanine: number; second: number; basement: number };
      kanal2: { ground: number; first: number; mezzanine: number; second: number; basement: number };
      commercial: { ground: number; first: number; mezzanine: number; second: number; basement: number };
    };
    floorRateMultipliers?: {
      ground: number;
      first: number;
      mezzanine: number;
      second: number;
      basement: number;
    };
  };
  interior: {
    techniques: {
      bookmatched: number;
      backlitOnyx: number;
      cncCarved: number;
      waterjetBrass: number;
      flutedStone: number;
    };
    finishes: {
      mirrorGloss: number;
      honedSatin: number;
      flutedTextured: number;
      leathered: number;
    };
    lighting: {
      warmLed: number;
      rgbAccent: number;
      spotlights: number;
      none: number;
    };
  };
  customCategories?: CustomRenovationCategory[];
}

export const defaultBuildYourHomeRates: BuildYourHomeRates = {
  maintenance: {
    polishing: 38,
    repair: 45,
    cleaning: 28,
    sealing: 50,
    alignment: 65,
    urgencyMultipliers: {
      standard: 1.0,
      priority: 1.15,
      emergency: 1.30,
    },
  },
  newProjects: {
    baseCostPerSqFt: 120,
    gradeRates: {
      budget: 120,
      premium: 220,
      luxury: 450,
    },
    gradeMultipliers: {
      standard: 1.0,
      premium: 1.83,
      luxury: 3.75,
    },
    scopeMultipliers: {
      base: 0.40,
      flooring: 0.35,
      stairs: 0.15,
      kitchen: 0.15,
      elevation: 0.20,
      bathrooms: 0.15,
    },
    baseAreaSqFt: {
      marla5: 1100,
      marla10: 2200,
      kanal1: 4500,
      kanal2: 9000,
      commercial: 6000,
    },
    floorDefaults: {
      marla5: { ground: 1100, first: 1100, mezzanine: 350, second: 800, basement: 1000 },
      marla10: { ground: 2200, first: 2200, mezzanine: 600, second: 1500, basement: 2000 },
      kanal1: { ground: 4500, first: 4200, mezzanine: 1200, second: 3000, basement: 4000 },
      kanal2: { ground: 8500, first: 8000, mezzanine: 2500, second: 6000, basement: 7500 },
      commercial: { ground: 6000, first: 6000, mezzanine: 3000, second: 6000, basement: 6000 },
    },
    floorRateMultipliers: {
      ground: 1.0,
      first: 0.95,
      mezzanine: 0.90,
      second: 0.95,
      basement: 1.15,
    },
  },
  interior: {
    techniques: {
      bookmatched: 850,
      backlitOnyx: 1600,
      cncCarved: 750,
      waterjetBrass: 1200,
      flutedStone: 650,
    },
    finishes: {
      mirrorGloss: 50,
      honedSatin: 0,
      flutedTextured: 120,
      leathered: 80,
    },
    lighting: {
      warmLed: 150,
      rgbAccent: 200,
      spotlights: 100,
      none: 0,
    },
  },
  customCategories: [
    {
      id: 'marble-installation',
      titleEn: 'Marble & Granite Installation',
      titleUr: 'ماربل اور گرینائٹ انسٹالیشن',
      descriptionEn: 'Flooring, stairs, vanity tops, and border inlay fitting works',
      descriptionUr: 'فلورنگ، سیڑھیاں، وینیٹی ٹاپس، اور بارڈر انلے کی فٹنگ',
      items: [
        { id: 'm-floor', nameEn: 'Standard Marble Flooring Fitting', nameUr: 'اسٹینڈرڈ ماربل فلورنگ فٹنگ', rate: 45, unit: 'PKR / Sq. Ft', descriptionEn: 'Precision leveling and mortar bedding' },
        { id: 'm-granite', nameEn: 'Granite Countertop & Double Edge', nameUr: 'گرینائٹ کاؤنٹر ٹاپ و ڈبل ایجنگ', rate: 120, unit: 'PKR / RFT', descriptionEn: 'Kitchen island and vanity fitting' },
        { id: 'm-border', nameEn: 'Marble Border & Pattern Inlay', nameUr: 'ماربل بارڈر اور پیٹرن انلے', rate: 85, unit: 'PKR / RFT', descriptionEn: 'Decorative border strip installation' },
        { id: 'm-stairs', nameEn: 'Staircase Step & Skirting Fitting', nameUr: 'سیڑھیوں کے قدم اور بارڈر', rate: 150, unit: 'PKR / Step', descriptionEn: 'Bullnose profiling and anti-slip groove' }
      ]
    },
    {
      id: 'mushroom',
      titleEn: 'Mushroom & Ceiling Work',
      titleUr: 'مشروم اور سیلنگ کا کام',
      descriptionEn: 'False ceiling, mushroom texture spray, and sound insulation',
      descriptionUr: 'فالس سیلنگ، مشروم ٹیکسچر اسپرے، اور ساؤنڈ انسولیشن',
      items: [
        { id: 'mush-coating', nameEn: 'Mushroom Texture Ceiling Spray', nameUr: 'مشروم ٹیکسچر سیلنگ اسپرے', rate: 65, unit: 'PKR / Sq. Ft', descriptionEn: 'Seamless acoustic & thermal spray' },
        { id: 'mush-gypsum', nameEn: 'Gypsum False Ceiling Grid', nameUr: 'جپسم بورڈ فالس سیلنگ', rate: 110, unit: 'PKR / Sq. Ft', descriptionEn: 'Gypboard ceiling with cove lighting channel' }
      ]
    },
    {
      id: 'tile-flooring',
      titleEn: 'Tile Flooring & Wall Cladding',
      titleUr: 'ٹائل فلورنگ اور وال کلیڈنگ',
      descriptionEn: 'Porcelain tiles, ceramic floor tiles, and bathroom walls',
      descriptionUr: 'پورسلین اور سیرامک ٹائلیں، باتھ رومز کی دیواریں',
      items: [
        { id: 'tile-floor', nameEn: 'Porcelain Floor Tile Fixing', nameUr: 'پورسلین فلور ٹائل فٹنگ', rate: 55, unit: 'PKR / Sq. Ft', descriptionEn: 'Bonded with high-strength tile adhesive' },
        { id: 'tile-bath', nameEn: 'Bathroom Wall Tile Cladding', nameUr: 'باتھ روم وال ٹائل فٹنگ', rate: 65, unit: 'PKR / Sq. Ft', descriptionEn: 'Full height wall tile installation' },
        { id: 'tile-outdoor', nameEn: 'Outdoor Terrace Anti-Slip Tiling', nameUr: 'آؤٹ ڈور ٹیرس اینٹی سلپ ٹائلنگ', rate: 50, unit: 'PKR / Sq. Ft', descriptionEn: 'Weatherproof exterior tile laying' }
      ]
    },
    {
      id: 'paint',
      titleEn: 'Paint & Surface Finishes',
      titleUr: 'پینٹ اور وال فنشنگ',
      descriptionEn: 'Weather shield, plastic emulsion, texture, and matte finishes',
      descriptionUr: 'ویدر شیلڈ، پلاسٹک ایملشن، ٹیکسچر اور میٹ فنشنگ',
      items: [
        { id: 'p-weather', nameEn: 'Weather Shield Outer Paint', nameUr: 'ویدر شیلڈ بیرونی پینٹ', rate: 35, unit: 'PKR / Sq. Ft', descriptionEn: '3 coat waterproof exterior paint' },
        { id: 'p-interior', nameEn: 'Plastic Emulsion Interior Paint', nameUr: 'پلاسٹک ایملشن اندرونی پینٹ', rate: 28, unit: 'PKR / Sq. Ft', descriptionEn: 'Smooth wall putty and double coat' },
        { id: 'p-velvet', nameEn: 'Velvet Soft Matt Finish', nameUr: 'ویلویٹ سارٹ میٹ فنش', rate: 45, unit: 'PKR / Sq. Ft', descriptionEn: 'Luxury washable interior wall coat' }
      ]
    },
    {
      id: 'plumbing',
      titleEn: 'Plumbing & Sanitary Work',
      titleUr: 'پلمبنگ اور سینیٹری کا کام',
      descriptionEn: 'Underground piping, PPRC fitting, sanitary fixtures, and pumps',
      descriptionUr: 'انڈر گراؤنڈ پائپنگ، پی پی آر سی فٹنگ، سینیٹری فٹنگز',
      items: [
        { id: 'plumb-pipe', nameEn: 'Bathroom Piping & Drain Laying', nameUr: 'باتھ روم پائپنگ و ڈرین ہول', rate: 15000, unit: 'PKR / Bath', descriptionEn: 'Complete PPRC hot/cold & UPVC drain lines' },
        { id: 'plumb-fit', nameEn: 'Sanitary Fixture & Tap Fitting', nameUr: 'سینیٹری فکسچر اور ٹوٹی فٹنگ', rate: 3500, unit: 'PKR / Point', descriptionEn: 'Commode, vanity mixer, and shower panel' },
        { id: 'plumb-tank', nameEn: 'Water Tank & Motor Pump System', nameUr: 'واٹر ٹینک اور موٹر پمپ انسٹالیشن', rate: 12000, unit: 'PKR / Job', descriptionEn: 'Overhead tank & pressure pump hookup' }
      ]
    },
    {
      id: 'electric',
      titleEn: 'Electrical Work & Wiring',
      titleUr: 'الیکٹرک ورک اور وائرنگ',
      descriptionEn: 'Conduit piping, copper wiring, breaker DB box, and LED lights',
      descriptionUr: 'کنڈیوٹ پائپنگ، کاپر وائرنگ، بریکر ڈی بی باکس، اور ایل ای ڈی',
      items: [
        { id: 'elec-wire', nameEn: 'Complete Electrical Wiring', nameUr: 'کامل الیکٹرک وائرنگ', rate: 120, unit: 'PKR / Point', descriptionEn: 'Pakistan Cables 7/29 & 3/29 copper wire' },
        { id: 'elec-db', nameEn: 'Main Distribution DB Box Panel', nameUr: 'مین ڈی بی باکس پینل انسٹالیشن', rate: 8500, unit: 'PKR / Unit', descriptionEn: 'Schneider breakers & earth leakage' },
        { id: 'elec-smd', nameEn: 'SMD Downlights & Strip Lighting', nameUr: 'ایس ایم ڈی ڈاون لائٹس و اسٹرپ فٹنگ', rate: 150, unit: 'PKR / Light', descriptionEn: 'False ceiling light fixtures installation' }
      ]
    },
    {
      id: 'windows',
      titleEn: 'Windows & Glass Work',
      titleUr: 'کھڑکیاں اور شیشہ ورک',
      descriptionEn: 'Aluminum windows, UPVC double glazing, and tempered glass partitions',
      descriptionUr: 'ایلومینیم کھڑکیاں، یو پی وی سی ڈبل گلیزنگ، اور ٹمپرڈ گلاس',
      items: [
        { id: 'win-alum', nameEn: 'Prime Aluminum Windows', nameUr: 'پرائم ایلومینیم ونڈوز (1.6mm)', rate: 450, unit: 'PKR / Sq. Ft', descriptionEn: 'Powder coated section with 5mm glass' },
        { id: 'win-upvc', nameEn: 'UPVC Double Glazed Windows', nameUr: 'یو پی وی سی ڈبل گلیزڈ ونڈوز', rate: 750, unit: 'PKR / Sq. Ft', descriptionEn: 'Acoustic soundproof profile with vacuum glass' },
        { id: 'win-glass', nameEn: '12mm Tempered Glass Partition', nameUr: '12mm ٹمپرڈ گلاس پارٹیشن', rate: 650, unit: 'PKR / Sq. Ft', descriptionEn: 'Shower cabinet or office glass enclosure' }
      ]
    },
    {
      id: 'woodwork',
      titleEn: 'Wood Work & Joinery',
      titleUr: 'ووڈ ورک اور دروازے',
      descriptionEn: 'Solid ash doors, kitchen cabinets, wardrobes, and paneling',
      descriptionUr: 'ایش ووڈ دروازے، کچن کیبینٹس، الماریاں اور پینلنگ',
      items: [
        { id: 'w-door', nameEn: 'Solid Ash Wood Main Door', nameUr: 'سولڈ ایش ووڈ مین ڈور', rate: 35000, unit: 'PKR / Leaf', descriptionEn: 'Carved frame with polish finish' },
        { id: 'w-kitchen', nameEn: 'UV Sheet / Acrylic Kitchen Cabinets', nameUr: 'یو وی شیٹ / ایکریلک کچن کیبینٹس', rate: 1800, unit: 'PKR / Sq. Ft', descriptionEn: 'Soft close hydraulic hinges & handles' },
        { id: 'w-wardrobe', nameEn: 'Tactile Wardrobes & Closet', nameUr: 'ٹیکٹائل فل ہائٹ الماریاں', rate: 1400, unit: 'PKR / Sq. Ft', descriptionEn: 'Internal drawers and hanging rods' }
      ]
    },
    {
      id: 'fabricator',
      titleEn: 'Steel & Iron Fabricator',
      titleUr: 'سٹیل اور آئرن فیبریکیٹر',
      descriptionEn: 'MS safety grills, stainless steel railings, and main entrance gates',
      descriptionUr: 'سیفٹی گرلز، سٹینلیس سٹیل ریلنگ، اور مین گیٹ',
      items: [
        { id: 'fab-grill', nameEn: 'MS Safety Window Grill', nameUr: 'ایم ایس سیفٹی ونڈو گرل', rate: 280, unit: 'PKR / Sq. Ft', descriptionEn: 'Heavy gauge steel grill with antirust coat' },
        { id: 'fab-railing', nameEn: 'Stainless Steel 304 Stair Railing', nameUr: 'سٹینلیس سٹیل 304 ریلنگ', rate: 650, unit: 'PKR / RFT', descriptionEn: 'Glass or pipe pipe balustrade' },
        { id: 'fab-gate', nameEn: 'Laser Cut Main Steel Gate', nameUr: 'لیزر کٹ ڈیزائنر مین گیٹ', rate: 450, unit: 'PKR / Sq. Ft', descriptionEn: 'Heavy sheet with motor gate preparation' }
      ]
    }
  ]
};

export function getInstantBuildYourHomeRatesConfig(): BuildYourHomeRates {
  if (inMemoryCache.buildYourHomeRates?.data) {
    return inMemoryCache.buildYourHomeRates.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_build_your_home_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed as BuildYourHomeRates;
        }
      }
    } catch (e) {}
  }
  return defaultBuildYourHomeRates;
}

function mergeBuildYourHomeRates(data: any): BuildYourHomeRates {
  return {
    maintenance: { ...defaultBuildYourHomeRates.maintenance, ...data.maintenance, urgencyMultipliers: { ...defaultBuildYourHomeRates.maintenance.urgencyMultipliers, ...data.maintenance?.urgencyMultipliers } },
    newProjects: { 
      ...defaultBuildYourHomeRates.newProjects, 
      ...data.newProjects, 
      gradeRates: { ...defaultBuildYourHomeRates.newProjects.gradeRates, ...data.newProjects?.gradeRates }, 
      scopeMultipliers: { ...defaultBuildYourHomeRates.newProjects.scopeMultipliers, ...data.newProjects?.scopeMultipliers }, 
      baseAreaSqFt: { ...defaultBuildYourHomeRates.newProjects.baseAreaSqFt, ...data.newProjects?.baseAreaSqFt },
      floorDefaults: {
        marla5: { ...defaultBuildYourHomeRates.newProjects.floorDefaults?.marla5, ...data.newProjects?.floorDefaults?.marla5 },
        marla10: { ...defaultBuildYourHomeRates.newProjects.floorDefaults?.marla10, ...data.newProjects?.floorDefaults?.marla10 },
        kanal1: { ...defaultBuildYourHomeRates.newProjects.floorDefaults?.kanal1, ...data.newProjects?.floorDefaults?.kanal1 },
        kanal2: { ...defaultBuildYourHomeRates.newProjects.floorDefaults?.kanal2, ...data.newProjects?.floorDefaults?.kanal2 },
        commercial: { ...defaultBuildYourHomeRates.newProjects.floorDefaults?.commercial, ...data.newProjects?.floorDefaults?.commercial },
      },
      floorRateMultipliers: { ...defaultBuildYourHomeRates.newProjects.floorRateMultipliers, ...data.newProjects?.floorRateMultipliers },
      gradeMultipliers: { ...defaultBuildYourHomeRates.newProjects.gradeMultipliers, ...data.newProjects?.gradeMultipliers },
      baseCostPerSqFt: data.newProjects?.baseCostPerSqFt ?? defaultBuildYourHomeRates.newProjects.baseCostPerSqFt,
    },
    interior: { ...defaultBuildYourHomeRates.interior, ...data.interior, techniques: { ...defaultBuildYourHomeRates.interior.techniques, ...data.interior?.techniques }, finishes: { ...defaultBuildYourHomeRates.interior.finishes, ...data.interior?.finishes }, lighting: { ...defaultBuildYourHomeRates.interior.lighting, ...data.interior?.lighting } },
    customCategories: data.customCategories && Array.isArray(data.customCategories) && data.customCategories.length > 0 ? data.customCategories : defaultBuildYourHomeRates.customCategories
  };
}

export async function getBuildYourHomeRatesConfig(): Promise<BuildYourHomeRates> {
  const now = Date.now();
  if (inMemoryCache.buildYourHomeRates && inMemoryCache.buildYourHomeRates.timestamp > 0 && (now - inMemoryCache.buildYourHomeRates.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.buildYourHomeRates.data;
  }
  if (inFlightRequests.buildYourHomeRates) {
    return inFlightRequests.buildYourHomeRates;
  }

  const db = getDb();
  if (!db) return getInstantBuildYourHomeRatesConfig();

  const promise = (async () => {
    try {
      const snap = await withFastTimeout(getDoc(doc(db, 'config', 'build_your_home_rates')), 2000);
      const result = snap.exists() ? mergeBuildYourHomeRates(snap.data()) : defaultBuildYourHomeRates;
      inMemoryCache.buildYourHomeRates = { data: result, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_build_your_home_rates', JSON.stringify(result));
        } catch (e) {}
      }
      return result;
    } catch (e: any) {
      logFetchError("Error fetching build_your_home_rates config", e);
      return getInstantBuildYourHomeRatesConfig();
    } finally {
      delete inFlightRequests.buildYourHomeRates;
    }
  })();

  inFlightRequests.buildYourHomeRates = promise;
  return promise;
}

export async function updateBuildYourHomeRates(rates: BuildYourHomeRates) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'build_your_home_rates'), rates, { merge: true });
    clearDataCaches('buildYourHomeRates');
    broadcastAppUpdate('costs_updated', rates);
    return { success: true };
  } catch (e: any) {
    console.error("Error updating build_your_home_rates:", e);
    return { success: false, error: e.message || "Failed to save rates" };
  }
}

/**
 * Supplier & Rate Management
 */
export interface SupplierRate {
  id: string;
  materialId: string; // Marble ID, Marble Variant ID, or Fixing Material ID
  materialName: string;
  materialType: 'marble' | 'fixing_material' | string;
  categoryGroup?: string; // e.g. 'Imported Granite', 'Local Granites 24"', 'Local Marble 24"', 'Silbata', 'Ice White Series', 'Artificial Marble\'s', 'Natural Marble\'s'
  isHighlighted?: boolean; // Yellow highlighted row in printed sheet
  thickness?: string; // e.g. '4-Sutar', '5-Sutar', '6-Sutar', '8-Sutar', '12mm', '15mm', '18mm', '20mm'
  imageUrl?: string; // Optional supplier-uploaded preview image for this material
  rate: number; // Cost price from supplier
  previousRate?: number;
  lastUpdated?: string;
  updatedAt?: string;
  unit?: string;
  status?: 'active' | 'paused';
}

export interface ProductCategoryOption {
  id: string;
  labelEn: string;
  labelUr: string;
  group: 'stone' | 'fixing' | 'service';
  defaultUnit: string;
}

export const APP_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: 'Sale & Discount', labelEn: 'Sale & Discount / سیل و رعایت', labelUr: 'سیل اور خصوصی ڈسکاؤنٹ', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Local Marble', labelEn: 'Local Marble / لوکل سنگ مرمر', labelUr: 'لوکل سنگ مرمر اور ماربل', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Imported Marble', labelEn: 'Imported Marble / امپورٹڈ ماربل', labelUr: 'امپورٹڈ سنگ مرمر', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Local Granite', labelEn: 'Local Granite / لوکل گرینائٹ', labelUr: 'لوکل گرینائٹ', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Imported Granite', labelEn: 'Imported Granite / امپورٹڈ گرینائٹ', labelUr: 'امپورٹڈ گرینائٹ', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'MDM Material', labelEn: 'MDM Material / ایم ڈی ایم مٹیریل', labelUr: 'ایم ڈی ایم مٹیریل اور سلیبس', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Marble Tiles', labelEn: 'Marble Tiles / ماربل ٹائلز', labelUr: 'ماربل ٹائلز اور فرش', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Limestone', labelEn: 'Limestone / چونا پتھر', labelUr: 'چونا پتھر (لائم اسٹون)', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Artificial Stone', labelEn: 'Artificial & Quartz / مصنوعی پتھر', labelUr: 'مصنوعی اور کوارٹز اسٹون', group: 'stone', defaultUnit: 'Square feet' },
  { id: '12x24 Tiles', labelEn: '12x24 Tiles & Porcelain / ٹائلز', labelUr: '12x24 ٹائلز اور پورسلیٹ', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Corian', labelEn: 'Corian & Acrylic / کوریان', labelUr: 'کوریان اور ایکریلک شیٹس', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Facade Stone', labelEn: 'Facade Stone / بیرونی وال پتھر', labelUr: 'فرنٹ ایلیویشن اور وال اسٹون', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Inlay', labelEn: 'Inlay & Waterjet / ان لے کٹنگ', labelUr: 'ان لے ماربل ڈیزائننگ', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Antique', labelEn: 'Antique Finish / اینٹیک پتھر', labelUr: 'اینٹیک اور ٹمبلڈ فنش', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Vanity', labelEn: 'Vanity Tops / وینیٹی کاؤنٹرز', labelUr: 'باتھ روم وینیٹی و کچن سلیب', group: 'stone', defaultUnit: 'Square feet' },
  { id: 'Chemical', labelEn: 'Chemicals & Epoxies / کیمیکلز', labelUr: 'ماربل کیمیکل، سیلر و ایلوپینٹ', group: 'fixing', defaultUnit: 'Liters' },
  { id: 'Adhesive', labelEn: 'Bond & Adhesives / ٹائل بانڈ و گلو', labelUr: 'ٹائل بانڈ، گلو اور گراؤٹ', group: 'fixing', defaultUnit: 'Kilograms' },
  { id: 'Abrasive', labelEn: 'Polishing & Abrasives / پالش مسالہ', labelUr: 'ڈائمنڈ پیڈز، بٹی اور رگڑائی مسالہ', group: 'fixing', defaultUnit: 'Pieces' },
  { id: 'Tool', labelEn: 'Tools & Blades / ڈائمنڈ بلیڈ و اوزار', labelUr: 'کٹنگ بلیڈز، کٹر مشین و اوزار', group: 'fixing', defaultUnit: 'Units' },
  { id: 'Over-Expert Team', labelEn: 'Installation & Labor / فکسنگ ٹیم', labelUr: 'اوور ایکسپرٹ کاریگر و فکسنگ لیبر', group: 'service', defaultUnit: 'Square feet' },
  { id: 'Other', labelEn: 'Other Materials / متفرق سامان', labelUr: 'دیگر مٹیریلز اور اسیسریز', group: 'fixing', defaultUnit: 'Units' },
];

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  email?: string;
  factoryImageUrl?: string; // Uploaded factory/showroom image from onboarding
  profileCompleted?: boolean; // Whether supplier has completed first-time factory setup
  status: 'active' | 'inactive';
  materialsSupplied: string[];
  allowedCategories?: string[]; // Restricted category IDs allowed for this supplier
  accessPassword?: string; // Secret access PIN or password for vendor portal
  allowCuttingOptimizer?: boolean; // Whether this supplier / special partner can access Cutting Optimizer Pro in their portal (default: true)
  sheetVersion?: string; // Official printed rate sheet version e.g. '21-10-2026'
  rates: SupplierRate[];
  createdAt?: string;
  updatedAt?: string;
}

export function enrichAlMajeedSupplierData(existing: Supplier, forceOfficialRates: boolean = false): { supplier: Supplier; needsSave: boolean } {
  const latestSheetRates = getAlMajeedRates();
  const isNewSheetVersion = existing.sheetVersion !== '21-10-2026' || forceOfficialRates;
  let needsSave = isNewSheetVersion;

  if (!existing.rates || existing.rates.length === 0 || forceOfficialRates) {
    existing.rates = latestSheetRates;
    needsSave = true;
  } else {
    const existingMap = new Map<string, SupplierRate>();
    for (const r of existing.rates) {
      existingMap.set(r.materialId, r);
    }
    const orderedMerged: SupplierRate[] = [];
    const seenIds = new Set<string>();

    // Keep official sheet order first so the matrix matches the printed sheet row-by-row
    for (const sheetRate of latestSheetRates) {
      const prev = existingMap.get(sheetRate.materialId);
      seenIds.add(sheetRate.materialId);
      if (!prev) {
        orderedMerged.push(sheetRate);
        needsSave = true;
      } else {
        orderedMerged.push({
          ...sheetRate,
          ...prev,
          id: prev.id || sheetRate.id,
          materialName: sheetRate.materialName, // Use standardized multi-size name
          rate: isNewSheetVersion ? sheetRate.rate : prev.rate,
          categoryGroup: sheetRate.categoryGroup || prev.categoryGroup,
          isHighlighted: sheetRate.isHighlighted ?? prev.isHighlighted
        });
      }
    }

    // Append any custom items added by admin/supplier that weren't on the default sheet
    for (const r of existing.rates) {
      if (!seenIds.has(r.materialId)) {
        orderedMerged.push(r);
      }
    }
    existing.rates = orderedMerged;
  }

  if (!existing.phone || existing.phone === '0333-5184573, 0312-5050649') {
    existing.phone = '0333-5184573, 0312-5050649, 0333-1827909';
    needsSave = true;
  }
  if (!existing.contactPerson || existing.contactPerson === 'Representative' || existing.contactPerson === 'Sadeeq Shah / Shehzad Ul Haq') {
    existing.contactPerson = 'Sadeeq Shah Khattak / Shehzad Ul Haq / M.Yousaf';
    needsSave = true;
  }
  if (!existing.accessPassword) {
    existing.accessPassword = '7861';
    needsSave = true;
  }
  if (existing.sheetVersion !== '21-10-2026') {
    existing.sheetVersion = '21-10-2026';
    needsSave = true;
  }

  return { supplier: existing, needsSave };
}

function getDefaultAlMajeedSupplier(): Supplier {
  return {
    id: 'al-majeed-marble-granite-factory',
    name: 'Al Majeed Marble & Granite Factory',
    contactPerson: 'Sadeeq Shah Khattak / Shehzad Ul Haq / M.Yousaf',
    phone: '0333-5184573, 0312-5050649, 0333-1827909',
    address: 'Factory Road, Industrial Area',
    email: 'contact@almajeedfactory.com',
    status: 'active',
    materialsSupplied: ['marble', 'granite'],
    accessPassword: '7861',
    sheetVersion: '21-10-2026',
    rates: getAlMajeedRates()
  };
}

let inMemorySuppliersCache: { data: Supplier[]; timestamp: number } | null = null;

function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map(item => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    return trimmed
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (val && typeof val === 'object') {
    return Object.values(val as Record<string, unknown>)
      .map(item => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
      .filter(Boolean);
  }
  return [];
}

export function normalizeSupplierRecord(raw: any): Supplier {
  const allowedArr =
    raw?.allowedCategories !== undefined && raw?.allowedCategories !== null
      ? normalizeStringArray(raw.allowedCategories)
      : undefined;
  const materialsArr = normalizeStringArray(raw?.materialsSupplied);
  const ratesArr = Array.isArray(raw?.rates)
    ? raw.rates
    : raw?.rates && typeof raw.rates === 'object'
      ? Object.values(raw.rates)
      : [];

  return {
    ...raw,
    id: String(raw?.id || ''),
    name: String(raw?.name || ''),
    contactPerson: String(raw?.contactPerson || ''),
    phone: String(raw?.phone || ''),
    address: String(raw?.address || ''),
    status: raw?.status === 'inactive' ? 'inactive' : 'active',
    materialsSupplied: materialsArr,
    ...(allowedArr !== undefined ? { allowedCategories: allowedArr } : {}),
    rates: ratesArr as SupplierRate[],
  } as Supplier;
}

function readCachedSuppliers(): Supplier[] {
  if (inMemorySuppliersCache && inMemorySuppliersCache.data.length > 0) {
    return inMemorySuppliersCache.data.map(normalizeSupplierRecord);
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('stone_expert_suppliers_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeSupplierRecord);
        }
      }
    } catch (e) {}
  }
  return [getDefaultAlMajeedSupplier()];
}

function writeCachedSuppliers(suppliers: Supplier[]) {
  inMemorySuppliersCache = { data: suppliers, timestamp: Date.now() };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_suppliers_cache', JSON.stringify(suppliers));
    } catch (e) {}
  }
}

function withFastTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firestore operation timed out (using local cache)'));
    }, ms);
    promise
      .then(val => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function getSuppliers(): Promise<Supplier[]> {
  if (inMemorySuppliersCache && Date.now() - inMemorySuppliersCache.timestamp < 5000) {
    return inMemorySuppliersCache.data;
  }

  const db = getDb();
  if (!db) {
    return readCachedSuppliers();
  }

  try {
    const colRef = collection(db, 'suppliers');
    const snapshot = await withFastTimeout(getDocs(colRef), 3200);
    const suppliers = snapshot.docs.map(doc => normalizeSupplierRecord({ id: doc.id, ...doc.data() }));
    
    // Auto-seed or update Al Majeed Marble & Granite Factory
    const alMajeedIndex = suppliers.findIndex(s => (s.name || '').toLowerCase().includes("al majeed") || s.id === 'al-majeed-marble-granite-factory');
    if (alMajeedIndex === -1) {
      const alMajeedSupplier = getDefaultAlMajeedSupplier();
      saveSupplier(alMajeedSupplier).catch(() => {});
      suppliers.push(alMajeedSupplier);
    } else {
      const { supplier: enriched, needsSave } = enrichAlMajeedSupplierData(suppliers[alMajeedIndex]);
      suppliers[alMajeedIndex] = enriched;
      if (needsSave) {
        saveSupplier(enriched).catch(() => {});
      }
    }
    
    // Ensure every supplier has an active access password / PIN
    for (const sup of suppliers) {
      if (!sup.accessPassword) {
        const digits = (sup.phone || '').replace(/[^0-9]/g, '');
        const autoPin = digits.length >= 4 ? digits.slice(-4) : `${Math.floor(1000 + Math.random() * 9000)}`;
        sup.accessPassword = autoPin;
        saveSupplier({ id: sup.id, accessPassword: autoPin }).catch(() => {});
      }
    }
    
    writeCachedSuppliers(suppliers);
    return suppliers;
  } catch (error) {
    logFetchError("Error fetching suppliers", error);
    const cached = readCachedSuppliers();
    const alMajeedIdx = cached.findIndex(s => (s.name || '').toLowerCase().includes('al majeed') || s.id === 'al-majeed-marble-granite-factory');
    if (alMajeedIdx === -1) {
      cached.unshift(getDefaultAlMajeedSupplier());
    } else {
      cached[alMajeedIdx] = enrichAlMajeedSupplierData(cached[alMajeedIdx]).supplier;
    }
    writeCachedSuppliers(cached);
    return cached;
  }
}

export function getAlMajeedRates(): SupplierRate[] {
  const rawRates: Array<{
    materialId: string;
    materialName: string;
    rate: number;
    categoryGroup: string;
    isHighlighted?: boolean;
  }> = [
    // =========================================================================
    // 1. Imported Granite (24", 36", 48", 52") - Exact 21-10-2026 Rate Sheet
    // =========================================================================
    // Emerald Pearl New: 24"=1450, 36"=1700, 48"=2000, 52"=2300
    { materialId: 'emerald-pearl-new_variant-emerald-pearl-new-1769368266875-0', materialName: 'Emerald Pearl New - 24" (6-Sutar)', rate: 1450, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-new_variant-emerald-pearl-new-1769368266875-1', materialName: 'Emerald Pearl New - 36" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-new_variant-emerald-pearl-new-1769368266875-2', materialName: 'Emerald Pearl New - 48" (6-Sutar)', rate: 2000, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-new_variant-emerald-pearl-new-1769368266875-3', materialName: 'Emerald Pearl New - 52" (6-Sutar)', rate: 2300, categoryGroup: 'Imported Granite' },

    // Emerald Pearl Old: 24"=1730, 36"=1900, 48"=2300, 52"=2500
    { materialId: 'emerald-pearl-old_variant-emerald-pearl-old-0', materialName: 'Emerald Pearl Old - 24" (6-Sutar)', rate: 1730, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-old_variant-emerald-pearl-old-1', materialName: 'Emerald Pearl Old - 36" (6-Sutar)', rate: 1900, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-old_variant-emerald-pearl-old-2', materialName: 'Emerald Pearl Old - 48" (6-Sutar)', rate: 2300, categoryGroup: 'Imported Granite' },
    { materialId: 'emerald-pearl-old_variant-emerald-pearl-old-3', materialName: 'Emerald Pearl Old - 52" (6-Sutar)', rate: 2500, categoryGroup: 'Imported Granite' },

    // Blue Pearl: 24"=1550, 36"=1700, 48"=2200
    { materialId: 'blue-pearl_variant-blue-pearl-0', materialName: 'Blue Pearl - 24" (6-Sutar)', rate: 1550, categoryGroup: 'Imported Granite' },
    { materialId: 'blue-pearl_variant-blue-pearl-1', materialName: 'Blue Pearl - 36" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'blue-pearl_variant-blue-pearl-2', materialName: 'Blue Pearl - 48" (6-Sutar)', rate: 2200, categoryGroup: 'Imported Granite' },

    // Silver Pearl: 24"=1500, 36"=1800, 48"=2300, 52"=2500
    { materialId: 'silver-pearl_variant-silver-pearl-0', materialName: 'Silver Pearl - 24" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },
    { materialId: 'silver-pearl_variant-silver-pearl-1', materialName: 'Silver Pearl - 36" (6-Sutar)', rate: 1800, categoryGroup: 'Imported Granite' },
    { materialId: 'silver-pearl_variant-silver-pearl-2', materialName: 'Silver Pearl - 48" (6-Sutar)', rate: 2300, categoryGroup: 'Imported Granite' },
    { materialId: 'silver-pearl_variant-silver-pearl-3', materialName: 'Silver Pearl - 52" (6-Sutar)', rate: 2500, categoryGroup: 'Imported Granite' },

    // Ten Brown: 24"=1330, 36"=1600, 48"=1800
    { materialId: 'ten-brown_variant-ten-brown-0', materialName: 'Ten Brown - 24" (6-Sutar)', rate: 1330, categoryGroup: 'Imported Granite' },
    { materialId: 'tin-brown_variant-tin-brown-0', materialName: 'Ten Brown - 36" (6-Sutar)', rate: 1600, categoryGroup: 'Imported Granite' },
    { materialId: 'tin-brown_variant-tin-brown-1', materialName: 'Ten Brown - 48" (6-Sutar)', rate: 1800, categoryGroup: 'Imported Granite' },

    // Baltic Brown: 24"=1060, 36"=1400, 48"=1800, 52"=2200
    { materialId: 'baltic-brown_variant-baltic-brown-1770154597294-0', materialName: 'Baltic Brown - 24" (6-Sutar)', rate: 1060, categoryGroup: 'Imported Granite' },
    { materialId: 'baltic-brown_variant-baltic-brown-1770154597294-1', materialName: 'Baltic Brown - 36" (6-Sutar)', rate: 1400, categoryGroup: 'Imported Granite' },
    { materialId: 'baltic-brown_variant-baltic-brown-1770154597294-2', materialName: 'Baltic Brown - 48" (6-Sutar)', rate: 1800, categoryGroup: 'Imported Granite' },
    { materialId: 'baltic-brown_variant-baltic-brown-1770154597294-3', materialName: 'Baltic Brown - 52" (6-Sutar)', rate: 2200, categoryGroup: 'Imported Granite' },

    // Ukraine Red: 24"=1500, 36"=1700
    { materialId: 'ukraine-red_variant-ukraine-red-0', materialName: 'Ukraine Red - 24" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },
    { materialId: 'ukraine-red_variant-ukraine-red-1', materialName: 'Ukraine Red - 36" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },

    // Labrador: 24"=1700, 36"=1900, 48"=2700, 52"=3000
    { materialId: 'labrador_variant-labrador-0', materialName: 'Labrador - 24" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'labrador_variant-labrador-1', materialName: 'Labrador - 36" (6-Sutar)', rate: 1900, categoryGroup: 'Imported Granite' },
    { materialId: 'labrador_variant-labrador-2', materialName: 'Labrador - 48" (6-Sutar)', rate: 2700, categoryGroup: 'Imported Granite' },
    { materialId: 'labrador_variant-labrador-3', materialName: 'Labrador - 52" (6-Sutar)', rate: 3000, categoryGroup: 'Imported Granite' },

    // Indian Galaxy: 24"=1580, 36"=1800, 48"=2700
    { materialId: 'indian-galaxy_variant-indian-galaxy-0', materialName: 'Indian Galaxy - 24" (6-Sutar)', rate: 1580, categoryGroup: 'Imported Granite' },
    { materialId: 'indian-galaxy_variant-indian-galaxy-1', materialName: 'Indian Galaxy - 36" (6-Sutar)', rate: 1800, categoryGroup: 'Imported Granite' },
    { materialId: 'galaxy_variant-galaxy-0', materialName: 'Indian Galaxy - 48" (6-Sutar)', rate: 2700, categoryGroup: 'Imported Granite' },

    // Egypt Green: 24"=1100, 36"=1500
    { materialId: 'egypt-green_variant-egypt-green-1761732429704-0', materialName: 'Egypt Green - 24" (6-Sutar)', rate: 1100, categoryGroup: 'Imported Granite' },
    { materialId: 'egypt-green_variant-egypt-green-1761732429704-1', materialName: 'Egypt Green - 36" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },

    // California Gold: 24"=1950, 48"=2700
    { materialId: 'california-gold_variant-california-gold-0', materialName: 'California Gold - 24" (6-Sutar)', rate: 1950, categoryGroup: 'Imported Granite' },
    { materialId: 'california-gold_variant-california-gold-1', materialName: 'California Gold - 48" (6-Sutar)', rate: 2700, categoryGroup: 'Imported Granite' },

    // Single-size 24" Imported Granites
    { materialId: 'tiger-skin_variant-tiger-skin-0', materialName: 'Tiger Skin - 24" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },
    { materialId: 'raw-silk_variant-raw-silk-0', materialName: 'Raw Silk - 24" (6-Sutar)', rate: 1400, categoryGroup: 'Imported Granite' },
    { materialId: 'uba-tuba_variant-uba-tuba-0', materialName: 'Uba Tuba - 24" (6-Sutar)', rate: 1300, categoryGroup: 'Imported Granite' },
    { materialId: 'ornamental-brown_variant-ornamental-brown-0', materialName: 'Ornamental Brown - 24" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'ornamental-white_variant-ornamental-white-0', materialName: 'Ornamental White - 24" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'chilli-red_variant-chilli-red-0', materialName: 'Chilli Red - 24" (6-Sutar)', rate: 1300, categoryGroup: 'Imported Granite' },
    { materialId: 'fantasy-blue_variant-fantasy-blue-0', materialName: 'Fantasy Blue - 24" (6-Sutar)', rate: 1700, categoryGroup: 'Imported Granite' },
    { materialId: 'cherry-brown_variant-cherry-brown-0', materialName: 'Cherry Brown - 24" (6-Sutar)', rate: 1200, categoryGroup: 'Imported Granite' },
    { materialId: 'indian-red-ruby_variant-indian-red-ruby-0', materialName: 'Indian Red Ruby - 24" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },
    { materialId: 'red-rubby-new_variant-red-rubby-new-0', materialName: 'Indian Red Ruby - 36" (6-Sutar)', rate: 1600, categoryGroup: 'Imported Granite' },
    { materialId: 'imported-paradeso_variant-imported-paradeso-0', materialName: 'Imported Paradiso - 24" (6-Sutar)', rate: 1500, categoryGroup: 'Imported Granite' },

    // =========================================================================
    // 2. Local Granites 24"
    // =========================================================================
    { materialId: 'local-paradiso-wave_variant-local-paradiso-wave-0', materialName: 'Paradiso Wave - 24" (4-Sutar)', rate: 440, categoryGroup: 'Local Granites 24"' },
    { materialId: 'sadow-pink_variant-sadow-pink-0', materialName: 'Sadow Pink - 24" (4-Sutar)', rate: 400, categoryGroup: 'Local Granites 24"' },
    { materialId: 'emperial-white_variant-emperial-white-0', materialName: 'Emperial White - 24" (4-Sutar)', rate: 390, categoryGroup: 'Local Granites 24"' },
    { materialId: 'indus-gold-local_variant-indus-gold-local-0', materialName: 'Indus Gold - 24" (4-Sutar)', rate: 350, categoryGroup: 'Local Granites 24"' },
    { materialId: 'dir-white_variant-dir-white-0', materialName: 'Dir White - 24" (4-Sutar)', rate: 370, categoryGroup: 'Local Granites 24"' },
    { materialId: 'chitral-white_variant-chitral-white-0', materialName: 'Chitral white - 24" (4-Sutar)', rate: 400, categoryGroup: 'Local Granites 24"' },
    { materialId: 'hunza-green_variant-hunza-green-0', materialName: 'Hunza Green - 24" (4-Sutar)', rate: 580, categoryGroup: 'Local Granites 24"' },
    { materialId: 'cheetah-green_variant-cheetah-green-0', materialName: 'Cheetah green - 24" (4-Sutar)', rate: 650, categoryGroup: 'Local Granites 24"', isHighlighted: true },

    // =========================================================================
    // 3. Local Marble 24"
    // =========================================================================
    { materialId: 'loralai-cream_variant-loralai-cream-0', materialName: 'Loralai Cream - 24" (6-Sutar)', rate: 625, categoryGroup: 'Local Marble 24"' },
    { materialId: 'tarvatine_variant-tarvatine-0', materialName: 'Tervertine - 24" (6-Sutar)', rate: 650, categoryGroup: 'Local Marble 24"' },
    { materialId: 'royal-cream-slab_variant-royal-cream-slab-0', materialName: 'Royal Cream Slab - 24" (6-Sutar)', rate: 650, categoryGroup: 'Local Marble 24"' },
    { materialId: 'local-armani-grey_variant-local-armani-grey-0', materialName: 'Local Armani Grey - 24" (6-Sutar)', rate: 1000, categoryGroup: 'Local Marble 24"' },
    { materialId: 'local-coffee-brown_variant-local-coffee-brown-0', materialName: 'Local Coffee Brown - 24" (6-Sutar)', rate: 1000, categoryGroup: 'Local Marble 24"' },

    // =========================================================================
    // 4. Silbata
    // =========================================================================
    { materialId: 'silbata-24_variant-silbata-24-0', materialName: 'Silbata Polished - 24" (4-Sutar)', rate: 470, categoryGroup: 'Silbata' },
    { materialId: 'silbata-12_variant-silbata-12-0', materialName: 'Silbata Polished - 12" (4-Sutar)', rate: 370, categoryGroup: 'Silbata' },
    { materialId: 'silbata-plain-4_variant-silbata-plain-4-0', materialName: 'Silbata Plain - 4" (4-Sutar)', rate: 210, categoryGroup: 'Silbata' },
    { materialId: 'silbata-mate-polish-4_variant-silbata-mate-polish-4-0', materialName: 'Silbata Mate Polish - 4" (4-Sutar)', rate: 250, categoryGroup: 'Silbata' },
    { materialId: 'silbata-full-polish-4_variant-silbata-full-polish-4-0', materialName: 'Silbata Full Polish - 4" (4-Sutar)', rate: 260, categoryGroup: 'Silbata' },

    // =========================================================================
    // 5. Gangsaw's - Ice White Series
    // =========================================================================
    { materialId: 'ice-blue_variant-ice-blue-0', materialName: 'Ice Blue - Gangsaws (6-Sutar)', rate: 2700, categoryGroup: 'Ice White Series' },
    { materialId: 'ice-green_variant-ice-green-0', materialName: 'Ice Green - Gangsaws (6-Sutar)', rate: 2700, categoryGroup: 'Ice White Series' },
    { materialId: 'ice-pearl-flower_variant-ice-pearl-flower-0', materialName: 'Ice Pearl Flower - Gangsaws (6-Sutar)', rate: 2700, categoryGroup: 'Ice White Series' },
    { materialId: 'ice-white_variant-ice-white-0', materialName: 'Ice White - Gangsaws (6-Sutar)', rate: 1760, categoryGroup: 'Ice White Series' },
    { materialId: 'ice-white-wave_variant-ice-white-wave-0', materialName: 'Ice White Wave - Gangsaws (6-Sutar)', rate: 2300, categoryGroup: 'Ice White Series' },
    { materialId: 'kolkata-gold_variant-kolkata-gold-0', materialName: 'Kolkata Gold - Gangsaws (6-Sutar)', rate: 2700, categoryGroup: 'Ice White Series' },
    { materialId: 'ice-white-golden-line_variant-ice-white-golden-line-0', materialName: 'Ice White Golden Line - Gangsaws (6-Sutar)', rate: 2700, categoryGroup: 'Ice White Series' },
    { materialId: 'panda-white_variant-panda-white-0', materialName: 'Panda White - Gangsaws (6-Sutar)', rate: 2300, categoryGroup: 'Ice White Series' },

    // =========================================================================
    // 6. Gangsaw's - Artificial Marble's
    // =========================================================================
    { materialId: 'fish-belly_variant-fish-belly-0', materialName: 'Fish belly - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's" },
    { materialId: 'mehran-green_variant-mehran-green-0', materialName: 'Mehran green - Gangsaws (6-Sutar)', rate: 1200, categoryGroup: "Artificial Marble's" },
    { materialId: 'ash-grey_variant-ash-grey-0', materialName: 'Ash Grey - Gangsaws (6-Sutar)', rate: 1200, categoryGroup: "Artificial Marble's" },
    { materialId: 'indus-grey_variant-indus-grey-0', materialName: 'Indus Grey - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's" },
    { materialId: 'venus-gold_variant-venus-gold-0', materialName: 'Venus Gold - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's" },
    { materialId: 'panda-black-karara_variant-panda-black-karara-0', materialName: 'Panda Black Karara - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's", isHighlighted: true },
    { materialId: 'panda-karara-snow_variant-panda-karara-snow-0', materialName: 'Panda Karara(snow quality) - Gangsaws (6-Sutar)', rate: 1275, categoryGroup: "Artificial Marble's" },
    { materialId: 'artificial-karara_variant-artificial-karara-0', materialName: 'Artificial Karara - Gangsaws (6-Sutar)', rate: 1100, categoryGroup: "Artificial Marble's" },
    { materialId: 'artificial-cream_variant-artificial-cream-0', materialName: 'Artificial Cream - Gangsaws (6-Sutar)', rate: 1150, categoryGroup: "Artificial Marble's" },
    { materialId: 'snow-white_variant-snow-white-0', materialName: 'Snow White - Gangsaws (6-Sutar)', rate: 1000, categoryGroup: "Artificial Marble's" },
    { materialId: 'supreme-white_variant-supreme-white-0', materialName: 'Supreme White - Gangsaws (6-Sutar)', rate: 1130, categoryGroup: "Artificial Marble's" },
    { materialId: 'starlet-white_variant-starlet-white-0', materialName: 'Starlet White - Gangsaws (6-Sutar)', rate: 1150, categoryGroup: "Artificial Marble's" },
    { materialId: 'artificial-red_variant-artificial-red-0', materialName: 'Artificial Red - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's" },
    { materialId: 'artificial-blue_variant-artificial-blue-0', materialName: 'Artificial Blue - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's" },
    { materialId: 'star-gold_variant-star-gold-0', materialName: 'Star Gold - Gangsaws (6-Sutar)', rate: 1400, categoryGroup: "Artificial Marble's" },
    { materialId: 'black-dragon_variant-black-dragon-0', materialName: 'Black Dragon - Gangsaws (6-Sutar)', rate: 1250, categoryGroup: "Artificial Marble's", isHighlighted: true },

    // =========================================================================
    // 7. Gangsaw's - Natural Marble's
    // =========================================================================
    { materialId: 'brown-wood_variant-brown-wood-0', materialName: 'Brown Wood according Size - Gangsaws (6-Sutar)', rate: 1900, categoryGroup: "Natural Marble's" },
    { materialId: 'white-wood_variant-white-wood-0', materialName: 'White Wood According Size - Gangsaws (6-Sutar)', rate: 2100, categoryGroup: "Natural Marble's" },
    { materialId: 'sofital-gold_variant-sofital-gold-0', materialName: 'Sofital Gold - Gangsaws (6-Sutar)', rate: 2500, categoryGroup: "Natural Marble's" },
    { materialId: 'vietnam-white_variant-vietnam-white-0', materialName: 'Vietnam White - Gangsaws (6-Sutar)', rate: 3300, categoryGroup: "Natural Marble's" },
    { materialId: 'emprador-light_variant-emprador-light-0', materialName: 'Emprador Light - Gangsaws (6-Sutar)', rate: 1600, categoryGroup: "Natural Marble's" },
    { materialId: 'emprador-dark_variant-emprador-dark-0', materialName: 'Emprador Dark - Gangsaws (6-Sutar)', rate: 1700, categoryGroup: "Natural Marble's" },
    { materialId: 'indian-green_variant-indian-green-0', materialName: 'Indian Green - Gangsaws (6-Sutar)', rate: 1600, categoryGroup: "Natural Marble's" },
    { materialId: 'sardinia_variant-sardinia-0', materialName: 'Sardinia - Gangsaws (6-Sutar)', rate: 2000, categoryGroup: "Natural Marble's" },
    { materialId: 'black-marquina_variant-black-marquina-0', materialName: 'Black Marquino - Gangsaws (6-Sutar)', rate: 1500, categoryGroup: "Natural Marble's" },
    { materialId: 'black-forest_variant-black-forest-0', materialName: 'Black Forest - Gangsaws (6-Sutar)', rate: 2100, categoryGroup: "Natural Marble's" },
    { materialId: 'red-tervertine_variant-red-tervertine-0', materialName: 'Red Tervertine - Gangsaws (6-Sutar)', rate: 1450, categoryGroup: "Natural Marble's" },
    { materialId: 'silver-tervertine_variant-silver-tervertine-0', materialName: 'Silver Tervertine - Gangsaws (6-Sutar)', rate: 1600, categoryGroup: "Natural Marble's" },
    { materialId: 'wave-brown_variant-wave-brown-1763103088686-0', materialName: 'Wave Brown(Natural granite) - Gangsaws (6-Sutar)', rate: 2600, categoryGroup: "Natural Marble's" },
    { materialId: 'creama-marfil_variant-creama-marfil-0', materialName: 'Creama Marfil - Gangsaws (6-Sutar)', rate: 2500, categoryGroup: "Natural Marble's", isHighlighted: true },
    { materialId: 'tassus-white_variant-tassus-white-0', materialName: 'Tassus White - Gangsaws (6-Sutar)', rate: 3000, categoryGroup: "Natural Marble's", isHighlighted: true },
    { materialId: 'karara-white-natural_variant-karara-white-natural-0', materialName: 'Karara white Natural - Gangsaws (6-Sutar)', rate: 2500, categoryGroup: "Natural Marble's", isHighlighted: true }
  ];

  return rawRates.map((r, idx) => ({
    id: `al-majeed-rate-${idx}`,
    materialId: r.materialId,
    materialName: r.materialName,
    materialType: 'marble' as const,
    categoryGroup: r.categoryGroup,
    isHighlighted: r.isHighlighted,
    rate: r.rate,
    lastUpdated: new Date().toISOString()
  }));
}

export async function applySupplierMarkupToApp(
  supplierId?: string,
  markupPercentage: number = 15
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    const currentMarbles = await getMarbles();
    const suppliers = await getSuppliers();

    const targetSupplier = supplierId 
      ? suppliers.find(s => s.id === supplierId || (s.name || '').toLowerCase().includes(supplierId.toLowerCase()))
      : suppliers.find(s => (s.name || '').toLowerCase().includes('al majeed') || s.id === 'al-majeed-marble-granite-factory');

    const rates = targetSupplier?.rates || getAlMajeedRates();
    if (!rates || rates.length === 0) {
      return { success: false, updatedCount: 0, message: "No rates found for supplier." };
    }

    let updatedCount = 0;
    const updatedMarblesMap = new Map<string, Marble>();

    for (const r of rates) {
      const [mId, vId] = r.materialId.includes('_') ? r.materialId.split('_') : [r.materialId, r.materialId];
      const marble = currentMarbles.find(m => m.id === mId || m.id === r.materialId);
      if (!marble || !marble.variants) continue;

      const variant = marble.variants.find(v => v.id === vId || v.id === r.materialId);
      if (variant) {
        const newPrice = Math.round(r.rate * (1 + markupPercentage / 100));
        if (variant.price !== newPrice) {
          variant.price = newPrice;
          updatedCount++;
          updatedMarblesMap.set(marble.id, marble);
        }
      }
    }

    // Update in-memory cache and localStorage
    inMemoryCache.marbles = { data: currentMarbles, timestamp: Date.now() };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cached_marbles_data', JSON.stringify(currentMarbles));
      } catch (e) {}
    }
    broadcastAppUpdate('products_updated', { entity: 'marbles', count: updatedCount });

    // Sync to Firestore if available
    const db = getDb();
    if (db && updatedMarblesMap.size > 0) {
      try {
        for (const [id, m] of updatedMarblesMap.entries()) {
          await setDoc(doc(db, 'marbles', id), {
            variants: m.variants,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.warn("Could not sync all marble prices to firestore:", err);
      }
    }

    return {
      success: true,
      updatedCount,
      message: `Successfully applied +${markupPercentage}% markup on ${rates.length} rates from ${targetSupplier?.name || 'Al Majeed'}.`
    };
  } catch (err: any) {
    return {
      success: false,
      updatedCount: 0,
      message: err.message || "Failed to apply supplier markup"
    };
  }
}

export async function saveSupplier(supplierData: Partial<Supplier>): Promise<{ success: boolean; supplier?: Supplier; error?: string }> {
  const id = supplierData.id || `SUP-${Date.now()}`;
  const normalizedPayload: Record<string, any> = {
    ...supplierData,
    id,
    updatedAt: new Date().toISOString(),
  };
  if (supplierData.allowedCategories !== undefined) {
    normalizedPayload.allowedCategories = normalizeStringArray(supplierData.allowedCategories);
  }
  if (supplierData.materialsSupplied !== undefined) {
    normalizedPayload.materialsSupplied = normalizeStringArray(supplierData.materialsSupplied);
  }
  if (supplierData.rates !== undefined && !Array.isArray(supplierData.rates)) {
    normalizedPayload.rates = [];
  }
  const cleanData = JSON.parse(JSON.stringify(normalizedPayload));

  // Optimistically update local supplier cache immediately
  try {
    const existingList = readCachedSuppliers();
    const idx = existingList.findIndex(s => s.id === id);
    if (idx > -1) {
      existingList[idx] = { ...existingList[idx], ...cleanData };
    } else if (cleanData.name) {
      existingList.push(cleanData as Supplier);
    }
    writeCachedSuppliers(existingList);
  } catch (e) {}

  const db = getDb();
  if (!db) return { success: true, supplier: cleanData };
  try {
    const docRef = doc(db, 'suppliers', id);
    await withFastTimeout(setDoc(docRef, cleanData, { merge: true }), 2500);
    return { success: true, supplier: cleanData };
  } catch (error: any) {
    // Even if Firestore is temporarily offline, setDoc is queued in the SDK and cached locally
    return { success: true, supplier: cleanData };
  }
}

/**
 * Quick Supplier Onboarding: creates a new supplier with name, phone, and restricted allowed categories
 */
export async function createQuickSupplier(data: {
  name: string;
  phone: string;
  contactPerson?: string;
  address?: string;
  accessPassword?: string;
  allowedCategories: string[];
  allowCuttingOptimizer?: boolean;
}): Promise<{ success: boolean; supplier?: Supplier; shareUrl?: string; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Supplier name is required" };
    }
    if (!data.phone || !data.phone.trim()) {
      return { success: false, error: "Phone number is required" };
    }

    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();
    const id = `sup-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${Date.now().toString().slice(-4)}`;

    // Ensure unique password across existing suppliers
    const existingSuppliers = await getSuppliers().catch(() => []);
    const usedPins = new Set(
      existingSuppliers.map(s => (s.accessPassword || '').trim().toLowerCase()).filter(Boolean)
    );

    const digits = cleanPhone.replace(/[^0-9]/g, '');
    let chosenPin = (data.accessPassword || '').trim();
    if (!chosenPin) {
      chosenPin = digits.length >= 4 ? digits.slice(-4) : `${Math.floor(1000 + Math.random() * 9000)}`;
    }
    let attempts = 0;
    while (usedPins.has(chosenPin.toLowerCase()) && attempts < 20) {
      chosenPin = `${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }

    const newSupplier: Supplier = {
      id,
      name: cleanName,
      contactPerson: data.contactPerson?.trim() || '',
      phone: cleanPhone,
      address: data.address?.trim() || '',
      email: '',
      factoryImageUrl: '',
      profileCompleted: false,
      status: 'active',
      materialsSupplied: data.allowedCategories.length > 0 ? data.allowedCategories : ['Marble', 'Granite'],
      allowedCategories: data.allowedCategories.length > 0 ? data.allowedCategories : ['All'],
      accessPassword: chosenPin,
      allowCuttingOptimizer: data.allowCuttingOptimizer !== false,
      rates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, 'suppliers', id);
    await setDoc(docRef, newSupplier);

    return {
      success: true,
      supplier: newSupplier,
      shareUrl: `/supplier/${id}`
    };
  } catch (error: any) {
    console.error("Error creating quick supplier:", error);
    return { success: false, error: error.message || "Failed to register supplier" };
  }
}

export async function deleteSupplier(id: string) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await deleteDoc(doc(db, 'suppliers', id));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Universal Supplier Password Verification:
 * Allows any supplier to enter their unique password/PIN on a single unified link (/supplier)
 * and immediately opens that supplier's active portal.
 */
export async function verifySupplierPassword(password: string): Promise<{
  success: boolean;
  supplier?: Supplier;
  error?: string;
}> {
  if (!password || !password.trim()) {
    return { success: false, error: "براہ کرم اپنا سپلائر پاسورڈ یا پن درج کریں۔ (Please enter your password.)" };
  }
  const cleanPass = password.trim().toLowerCase();
  try {
    const suppliers = await getSuppliers();
    const matched = suppliers.find(s => {
      if (!s) return false;
      const supPass = (s.accessPassword || '').trim().toLowerCase();
      if (supPass && supPass === cleanPass) return true;

      // Fallback: match by last 4 or 6 digits of phone number
      const phoneDigits = (s.phone || '').replace(/[^0-9]/g, '');
      if (cleanPass.length >= 4 && phoneDigits.endsWith(cleanPass)) return true;

      // Match by exact supplier ID
      if (s.id && s.id.toLowerCase() === cleanPass) return true;

      // Match by exact phone digits
      if (phoneDigits && phoneDigits === cleanPass.replace(/[^0-9]/g, '')) return true;

      return false;
    });

    if (!matched) {
      return {
        success: false,
        error: "غلط پاسورڈ! یہ پاسورڈ کسی رجسٹرڈ سپلائر سے مطابقت نہیں رکھتا۔ براہ کرم ایڈمن سے رابطہ کریں۔ (Invalid password. Not found.)"
      };
    }

    if (matched.status === 'inactive') {
      return {
        success: false,
        error: `اکاؤنٹ غیر فعال ہے: "${matched.name}" کا سپلائر اکاؤنٹ ایڈمن کی طرف سے بند ہے۔ (This supplier account is currently inactive.)`
      };
    }

    return { success: true, supplier: matched };
  } catch (err: any) {
    console.error("Failed to verify supplier password:", err);
    return { success: false, error: "سرور سے رابطہ نہ ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔" };
  }
}

/**
 * Verifies access for a specific supplier by ID and password
 */
export async function verifySupplierAccess(supplierId: string, password: string): Promise<{
  success: boolean;
  supplier?: Supplier;
  error?: string;
}> {
  if (!password || !password.trim()) {
    return { success: false, error: "براہ کرم پاسورڈ درج کریں۔" };
  }
  const cleanPass = password.trim().toLowerCase();
  try {
    const supplier = await getSupplierById(supplierId);
    if (!supplier) {
      return { success: false, error: "سپلائر نہیں ملا۔" };
    }

    const supPass = (supplier.accessPassword || '').trim().toLowerCase();
    const phoneDigits = (supplier.phone || '').replace(/[^0-9]/g, '');

    const isMatch = (supPass && supPass === cleanPass) ||
      (cleanPass.length >= 4 && phoneDigits.endsWith(cleanPass));

    if (!isMatch) {
      return { success: false, error: "غلط پاسورڈ! براہ کرم درست پاسورڈ درج کریں۔" };
    }

    return { success: true, supplier };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to verify access" };
  }
}

/**
 * Updates or sets a supplier's access password
 */
export async function updateSupplierPassword(supplierId: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  if (!newPassword || !newPassword.trim()) {
    return { success: false, error: "Password cannot be empty" };
  }
  try {
    const docRef = doc(db, 'suppliers', supplierId);
    await setDoc(docRef, {
      accessPassword: newPassword.trim(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update password" };
  }
}

export async function updateFixingMaterialFields(id: string, fields: any) {
  clearDataCaches('fixingMaterials');
  const db = getDb();
  if (!db) {
    broadcastAppUpdate('products_updated', { entity: 'fixing_material', id });
    return { success: true };
  }
  try {
    const docRef = doc(db, 'fixing_materials', id);
    const data = { ...fields, updatedAt: new Date().toISOString() };
    await setDoc(docRef, data, { merge: true });
    clearDataCaches('fixingMaterials');
    broadcastAppUpdate('products_updated', { entity: 'fixing_material', id });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Sale & Discount Management
 */
export interface ProductSaleDiscountPayload {
  onSale: boolean;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  salePrice?: number | null;
  saleBadgeText?: string;
  saleStartDate?: string;
  saleEndDate?: string;
  heroHighlightOnSale?: boolean;
}

export async function updateProductSaleDiscount(
  productId: string,
  type: 'marble' | 'fixing_material',
  data: ProductSaleDiscountPayload
) {
  if (type === 'marble') {
    return await updateMarbleDetails(productId, data);
  } else {
    return await updateFixingMaterialFields(productId, data);
  }
}

export async function applyBulkSaleDiscount({
  target,
  discountPercent,
  saleBadgeText,
}: {
  target: 'all' | 'marbles' | 'fixing_materials' | string;
  discountPercent: number;
  saleBadgeText?: string;
}) {
  const badge = saleBadgeText || `${discountPercent}% OFF`;
  
  const allMarbles = await getMarbles();
  const allFixing = await getFixingMaterials();

  const targetLower = target.toLowerCase();

  const marblesToUpdate = allMarbles.filter(m => {
    if (target === 'all' || target === 'marbles') return true;
    if (target === 'fixing_materials') return false;
    return (
      (m.category && m.category.toLowerCase() === targetLower) ||
      (m.materialType && m.materialType.toLowerCase() === targetLower)
    );
  });

  const fixingToUpdate = allFixing.filter(f => {
    if (target === 'all' || target === 'fixing_materials') return true;
    if (target === 'marbles') return false;
    return f.category && f.category.toLowerCase() === targetLower;
  });

  for (const marble of marblesToUpdate) {
    await updateMarbleDetails(marble.id, {
      onSale: true,
      discount: discountPercent,
      discountType: 'percentage',
      saleBadgeText: badge,
    });
  }

  for (const item of fixingToUpdate) {
    await updateFixingMaterialFields(item.id, {
      onSale: true,
      discount: discountPercent,
      discountType: 'percentage',
      saleBadgeText: badge,
    });
  }

  broadcastAppUpdate('products_updated', { entity: 'all' });
  return { success: true, updatedCount: marblesToUpdate.length + fixingToUpdate.length };
}

export async function clearBulkSaleDiscount({
  target,
}: {
  target: 'all' | 'marbles' | 'fixing_materials' | string;
}) {
  const allMarbles = await getMarbles();
  const allFixing = await getFixingMaterials();

  const targetLower = target.toLowerCase();

  const marblesToUpdate = allMarbles.filter(m => {
    if (target === 'all' || target === 'marbles') return true;
    if (target === 'fixing_materials') return false;
    return (
      (m.category && m.category.toLowerCase() === targetLower) ||
      (m.materialType && m.materialType.toLowerCase() === targetLower)
    );
  });

  const fixingToUpdate = allFixing.filter(f => {
    if (target === 'all' || target === 'fixing_materials') return true;
    if (target === 'marbles') return false;
    return f.category && f.category.toLowerCase() === targetLower;
  });

  for (const marble of marblesToUpdate) {
    await updateMarbleDetails(marble.id, {
      onSale: false,
      discount: 0,
      saleBadgeText: '',
      salePrice: null,
    });
  }

  for (const item of fixingToUpdate) {
    await updateFixingMaterialFields(item.id, {
      onSale: false,
      discount: 0,
      saleBadgeText: '',
      salePrice: null,
    });
  }

  broadcastAppUpdate('products_updated', { entity: 'all' });
  return { success: true, clearedCount: marblesToUpdate.length + fixingToUpdate.length };
}

/**
 * Supplier Portal Proposals
 */
export interface SupplierProposal {
  id: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  materialType: string;
  origin: 'Local' | 'Imported';
  description: string;
  thickness: string;
  size: string;
  rate: number;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  unit?: string;
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const db = getDb();
  if (!id || typeof id !== 'string') return null;
  const cleanId = decodeURIComponent(id).trim();

  // 1. Direct Firestore Document lookup with fast timeout
  if (db) {
    try {
      const docRef = doc(db, 'suppliers', cleanId);
      const snap = await withFastTimeout(getDoc(docRef), 2800);
      if (snap.exists()) {
        let sup = normalizeSupplierRecord({ id: snap.id, ...snap.data() });
        if (sup.id === 'al-majeed-marble-granite-factory' || (sup.name || '').toLowerCase().includes('al majeed')) {
          const { supplier: enriched, needsSave } = enrichAlMajeedSupplierData(sup);
          sup = normalizeSupplierRecord(enriched);
          if (needsSave) {
            saveSupplier(sup).catch(() => {});
          }
        }
        return sup;
      }
    } catch (error) {
      // Fall through to cached/collection lookup
    }
  }

  // 2. Fallback: Search all suppliers in Firestore (handles lowercase, slug, phone, and partial ID matches)
  try {
    const allSuppliers = await getSuppliers();
    const normalizedTarget = cleanId.toLowerCase();
    const targetDigits = cleanId.replace(/[^0-9]/g, '');

    const found = allSuppliers.find(sup => {
      if (!sup) return false;
      const supId = (sup.id || '').toLowerCase();
      const supName = (sup.name || '').toLowerCase();
      const supNameSlug = supName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const supPhoneDigits = (sup.phone || '').replace(/[^0-9]/g, '');
      const supPin = (sup.accessPassword || '').trim().toLowerCase();

      // Exact or case-insensitive match
      if (supId === normalizedTarget) return true;
      
      // Match by PIN or access password directly
      if (supPin && supPin === normalizedTarget) return true;

      // Match by slugified name (e.g. "al-majeed-granite-wholesalers")
      if (supNameSlug && (supNameSlug === normalizedTarget || normalizedTarget.includes(supNameSlug) || supNameSlug.includes(normalizedTarget))) return true;

      // Special match for Al Majeed
      if ((supId.includes('al-majeed') || supName.includes('al majeed')) && (normalizedTarget.includes('majeed') || normalizedTarget.includes('al-majeed'))) return true;

      // Match by phone number digits if ID was passed as phone or contains phone (e.g., last 4+ digits)
      if (targetDigits.length >= 4 && supPhoneDigits.length >= 4) {
        if (supPhoneDigits.endsWith(targetDigits) || supPhoneDigits.includes(targetDigits) || targetDigits.includes(supPhoneDigits)) return true;
      }

      // Substring match for generated prefix (e.g., 'sup-al-makkah' matching 'sup-al-makkah-3982')
      if (supId.startsWith(normalizedTarget) || normalizedTarget.startsWith(supId)) return true;

      return false;
    });

    if (found) {
      return found;
    }

    // Default or generic fallback
    if (normalizedTarget === 'default' || normalizedTarget === 'portal' || normalizedTarget === 'general') {
      return allSuppliers[0] || null;
    }
  } catch (error) {
    logFetchError("Error finding supplier in collection scan", error);
  }

  return null;
}

export async function submitSupplierProposal(proposalData: Omit<SupplierProposal, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; proposal?: SupplierProposal; error?: string }> {
  const id = `PROP-${Date.now()}`;
  const cleanData: SupplierProposal = {
    ...proposalData,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const db = getDb();
  if (!db) return { success: true, proposal: cleanData };
  try {
    await withFastTimeout(setDoc(doc(db, 'supplier_proposals', id), cleanData), 2500);
    return { success: true, proposal: cleanData };
  } catch (error: any) {
    return { success: true, proposal: cleanData };
  }
}

export async function getSupplierProposals(limitCount: number = 50): Promise<SupplierProposal[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const colRef = collection(db, 'supplier_proposals');
    const q = query(colRef, limit(limitCount));
    const snapshot = await withFastTimeout(getDocs(q), 2800);
    const proposals = snapshot.docs.map(doc => doc.data() as SupplierProposal);
    // Sort by createdAt desc
    return proposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return [];
  }
}

export async function approveSupplierProposal(
  proposalId: string,
  customSellingPrice?: number
): Promise<{
  success: boolean;
  isNewProduct?: boolean;
  productName?: string;
  marbleId?: string;
  sellingPrice?: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    // 1. Get proposal
    const propRef = doc(db, 'supplier_proposals', proposalId);
    const propSnap = await getDoc(propRef);
    if (!propSnap.exists()) return { success: false, error: "Proposal not found" };
    const proposal = propSnap.data() as SupplierProposal;

    // 2. Load marbles to find match or create new
    const colRef = collection(db, 'marbles');
    const snapshot = await getDocs(colRef);
    const marbles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Marble));

    const propName = (proposal.productName || '').trim();
    const normalizedPropName = propName.toLowerCase();
    const targetMarble = marbles.find(m => (m.name || '').trim().toLowerCase() === normalizedPropName);

    let marbleId = '';
    let variantId = '';
    let isNewProduct = false;
    const defaultSellingPrice =
      typeof customSellingPrice === 'number' && !Number.isNaN(customSellingPrice) && customSellingPrice > 0
        ? Math.round(customSellingPrice)
        : Math.round(proposal.rate * 1.2);
    let finalSellingPrice = defaultSellingPrice;

    if (targetMarble) {
      // Existing product stays intact — only link rate (or add missing size variant)
      marbleId = targetMarble.id;
      const propSize = (proposal.size || '').trim().toLowerCase();
      const propThickness = (proposal.thickness || '').trim().toLowerCase();
      const existingVar = targetMarble.variants?.find(v => {
        const vSize = (v.size || '').trim().toLowerCase();
        const vThick = (v.thickness || '').trim().toLowerCase();
        return vSize === propSize && (!propThickness || vThick === propThickness);
      }) || targetMarble.variants?.find(v => (v.size || '').trim().toLowerCase() === propSize) || targetMarble.variants?.[0];

      if (existingVar && (!propSize || (existingVar.size || '').trim().toLowerCase() === propSize || targetMarble.variants?.length === 1)) {
        variantId = existingVar.id;
        finalSellingPrice = existingVar.price || defaultSellingPrice;
        // Only update selling price if admin explicitly entered a custom rate
        if (
          typeof customSellingPrice === 'number' &&
          !Number.isNaN(customSellingPrice) &&
          customSellingPrice > 0 &&
          Math.round(customSellingPrice) !== existingVar.price
        ) {
          finalSellingPrice = Math.round(customSellingPrice);
          const updatedVariants = (targetMarble.variants || []).map(v =>
            v.id === variantId ? { ...v, price: finalSellingPrice } : v
          );
          await updateDoc(doc(db, 'marbles', marbleId), { variants: updatedVariants });
        }
      } else {
        // Add new size/thickness variant to existing product without touching existing variants
        const safePropNameLower = propName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        variantId = `variant-${safePropNameLower}-${Date.now()}`;
        const newVariant = {
          id: variantId,
          thickness: proposal.thickness || '6-Sutar',
          size: proposal.size || '24"',
          price: defaultSellingPrice
        };
        const updatedVariants = [...(targetMarble.variants || []), newVariant];
        await updateDoc(doc(db, 'marbles', marbleId), { variants: updatedVariants });
      }
    } else {
      // Brand-new product — automatically create in app catalog with supplier's photo & admin's rate
      isNewProduct = true;
      const safePropNameLower = propName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      variantId = `variant-${safePropNameLower}-${Date.now()}`;
      const newMarble = {
        name: propName,
        materialType: proposal.materialType || 'Local Marble',
        origin: proposal.origin || 'Local',
        description: proposal.description || `Supplied by ${proposal.supplierName}`,
        imageUrl: proposal.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(propName)}`,
        imageHint: 'marble texture',
        uses: 'Flooring, Stairs, Kitchen Countertops, Wall Facade',
        characteristics: 'Durable, premium look, supplied live',
        variants: [
          {
            id: variantId,
            thickness: proposal.thickness || '6-Sutar',
            size: proposal.size || '24"',
            price: defaultSellingPrice
          }
        ],
        gallery: [],
        isHidden: false,
        stockStatus: 'in_stock',
        inStock: true,
        isNewFromSupplier: true,
        createdAt: new Date().toISOString()
      };
      const newDocRef = await addDoc(collection(db, 'marbles'), newMarble);
      marbleId = newDocRef.id;
    }

    // 3. Link active rate to supplier
    const supRef = doc(db, 'suppliers', proposal.supplierId);
    const supSnap = await getDoc(supRef);
    if (supSnap.exists()) {
      const supplier = { id: supSnap.id, ...supSnap.data() } as Supplier;
      const targetId = `${marbleId}_${variantId}`;
      const existingRateIdx = (supplier.rates || []).findIndex(r => r.materialId === targetId);

      const newRate: SupplierRate = {
        id: `rate-${proposal.supplierId}-${Date.now()}`,
        materialId: targetId,
        materialName: `${propName}${proposal.size ? ` - ${proposal.size}` : ''}${proposal.thickness ? ` (${proposal.thickness})` : ''}`,
        materialType: proposal.materialType || 'marble',
        thickness: proposal.thickness || undefined,
        imageUrl: proposal.imageUrl && !proposal.imageUrl.includes('placehold.co') ? proposal.imageUrl : undefined,
        rate: proposal.rate,
        status: 'active',
        unit: proposal.unit || 'Square feet',
        lastUpdated: new Date().toISOString()
      };

      const updatedRates = [...(supplier.rates || [])];
      if (existingRateIdx > -1) {
        updatedRates[existingRateIdx] = newRate;
      } else {
        updatedRates.push(newRate);
      }

      const materials = new Set(supplier.materialsSupplied || []);
      materials.add(proposal.materialType || 'marble');

      await updateDoc(supRef, {
        rates: updatedRates,
        materialsSupplied: Array.from(materials),
        updatedAt: new Date().toISOString()
      });

      // Also persist the supplier's real stock photo into supplier_rate_photos gallery
      if (proposal.imageUrl && !proposal.imageUrl.includes('placehold.co')) {
        const sizeRaw = (proposal.size || '').toLowerCase();
        const inferredSlot = sizeRaw.includes('12x24') || sizeRaw.includes('12"x24') || sizeRaw.includes('12×24')
          ? '12x24'
          : sizeRaw.includes('12x12') || sizeRaw.includes('12"x12') || sizeRaw.includes('12×12')
          ? '12x12'
          : sizeRaw.includes('24')
          ? '24"'
          : sizeRaw.includes('36')
          ? '36"'
          : sizeRaw.includes('48')
          ? '48"'
          : sizeRaw.includes('52')
          ? '52"'
          : sizeRaw.includes('gangsaw') || sizeRaw.includes('slab')
          ? 'Gangsaw'
          : 'Standard';
        await addSupplierRatePhoto({
          supplierId: proposal.supplierId,
          supplierName: proposal.supplierName || supplier.name || 'Supplier',
          materialId: targetId,
          baseName: propName,
          sizeSlot: inferredSlot,
          thickness: proposal.thickness || undefined,
          imageUrl: proposal.imageUrl,
          uploadedBy: 'supplier'
        }).catch(() => {});
      }
    }

    // 4. Update proposal status
    await updateDoc(propRef, {
      status: 'approved',
      resolvedAt: new Date().toISOString()
    });

    return {
      success: true,
      isNewProduct,
      productName: targetMarble ? targetMarble.name : propName,
      marbleId,
      sellingPrice: finalSellingPrice
    };
  } catch (error: any) {
    console.error("Error approving proposal:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectSupplierProposal(proposalId: string) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const propRef = doc(db, 'supplier_proposals', proposalId);
    await updateDoc(propRef, { 
      status: 'rejected', 
      resolvedAt: new Date().toISOString() 
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting proposal:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Direct Service Provider Portal Actions
 */
export async function getServiceProviderById(id: string): Promise<ServiceProvider | null> {
  const db = getDb();
  
  // 1. Try fetching from Firestore first
  if (db) {
    try {
      const docRef = doc(db, 'service_providers', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as ServiceProvider;
      }
    } catch (error) {
      logFetchError("Error fetching provider from firestore", error);
    }
  }

  // 2. Fallback to static initial providers list
  const found = (initialServiceProviders as ServiceProvider[]).find(p => p.id === id);
  if (found) {
    return found;
  }

  // 3. Try fallback search in Firestore collection
  if (db) {
    try {
      const colRef = collection(db, 'service_providers');
      const snapshot = await getDocs(colRef);
      const matched = snapshot.docs.find(doc => doc.id === id || doc.data().name?.toLowerCase().replace(/\s+/g, '-') === id);
      if (matched) {
        return { id: matched.id, ...matched.data() } as ServiceProvider;
      }
    } catch (err) {
      logFetchError("Error searching in service_providers collection", err);
    }
  }

  return null;
}

export async function saveServiceProviderDirect(providerData: Partial<ServiceProvider> & { id: string }) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const docRef = doc(db, 'service_providers', providerData.id);
    const cleanData = JSON.parse(JSON.stringify({
      ...providerData,
      updatedAt: new Date().toISOString(),
    }));
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true, provider: cleanData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supplier Rate Adjustment Requests
 */
export interface SupplierRateRequest {
  id: string;
  supplierId: string;
  supplierName: string;
  materialId: string; // Marble ID + Variant ID or Fixing Material ID
  materialName: string;
  materialType: string;
  currentRate: number;
  proposedRate: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export async function getSupplierRateRequests(limitCount: number = 50): Promise<SupplierRateRequest[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const colRef = collection(db, 'supplier_rate_requests');
    const q = query(colRef, limit(limitCount));
    const snapshot = await withFastTimeout(getDocs(q), 2800);
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierRateRequest));
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    return [];
  }
}

export async function submitSupplierRateRequest(requestData: Omit<SupplierRateRequest, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; request?: SupplierRateRequest; error?: string }> {
  const id = `RATE-REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cleanData: SupplierRateRequest = {
    ...requestData,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const db = getDb();
  if (!db) return { success: true, request: cleanData };
  try {
    await withFastTimeout(setDoc(doc(db, 'supplier_rate_requests', id), cleanData), 2500);
    return { success: true, request: cleanData };
  } catch (error: any) {
    return { success: true, request: cleanData };
  }
}

export async function approveSupplierRateRequest(requestId: string) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const reqRef = doc(db, 'supplier_rate_requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return { success: false, error: "Request not found" };
    const request = reqSnap.data() as SupplierRateRequest;

    // Load supplier
    const supRef = doc(db, 'suppliers', request.supplierId);
    const supSnap = await getDoc(supRef);
    if (!supSnap.exists()) return { success: false, error: "Supplier not found" };
    const supplier = supSnap.data() as Supplier;

    // Update rates
    const updatedRates = (supplier.rates || []).map(r => {
      if (r.materialId === request.materialId) {
        return {
          ...r,
          rate: request.proposedRate,
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    });

    await updateDoc(supRef, {
      rates: updatedRates,
      updatedAt: new Date().toISOString()
    });

    // Update request status
    await updateDoc(reqRef, {
      status: 'approved',
      resolvedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving rate request:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectSupplierRateRequest(requestId: string) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const reqRef = doc(db, 'supplier_rate_requests', requestId);
    await updateDoc(reqRef, {
      status: 'rejected',
      resolvedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting rate request:", error);
    return { success: false, error: error.message };
  }
}

export async function seedDatabase() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  
  try {
    // 1. Seed marbles
    const marblesCol = collection(db, 'marbles');
    for (const marble of initialMarbles as Marble[]) {
      const { id, ...marbleWithoutId } = marble;
      await setDoc(doc(marblesCol, id), {
        ...marbleWithoutId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // 2. Seed fixing materials
    const materialsCol = collection(db, 'fixing_materials');
    for (const material of initialFixingMaterials as FixingMaterial[]) {
      const { id, ...materialWithoutId } = material;
      await setDoc(doc(materialsCol, id), {
        ...materialWithoutId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // 3. Seed service providers
    const providersCol = collection(db, 'service_providers');
    for (const provider of initialServiceProviders as ServiceProvider[]) {
      const { id, ...providerWithoutId } = provider;
      await setDoc(doc(providersCol, id), {
        ...providerWithoutId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // 4. Seed basic configs
    // Seed default daily rates
    await setDoc(doc(db, 'rates', 'daily'), defaultDailyRates, { merge: true });

    // Seed default costs
    await setDoc(doc(db, 'config', 'costs'), costsConfig, { merge: true });

    // Seed default homepage config
    await setDoc(doc(db, 'config', 'homepage'), {
      categoryOrder: config.categoryOrder,
      businessPhoneNumber: config.businessPhoneNumber,
      businessWhatsAppNumber: config.businessWhatsAppNumber,
      googleMapsUrl: config.googleMapsUrl,
      serviceTypes: config.serviceTypes || ["Marble & Tile Fixing", "Marble Polishing", "suzuki wala"]
    }, { merge: true });

    // 5. Seed renovation rates config
    await setDoc(doc(db, 'settings', 'renovation_rates'), {
      ...defaultRenovationRatesConfig,
      updatedAt: new Date().toISOString()
    }, { merge: false });

    // 6. Seed build your home rates config
    await setDoc(doc(db, 'config', 'build_your_home_rates'), {
      ...defaultBuildYourHomeRates,
      updatedAt: new Date().toISOString()
    }, { merge: false });

    // 7. Reset deleted_items config so all previously fixed items are restored!
    await setDoc(doc(db, 'config', 'deleted_items'), {}, { merge: false });

    // Clear caches and broadcast sync
    clearDataCaches();
    broadcastAppUpdate('products_updated');
    broadcastAppUpdate('costs_updated');
    broadcastAppUpdate('homepage_updated');
    broadcastAppUpdate('category_order_updated');

    return { success: true };
  } catch (error: any) {
    console.error("Error seeding database:", error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Resets the deleted items list so all previously hidden or soft-deleted items reappear
 */
export async function clearAllDeletedItems() {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    await setDoc(doc(db, 'config', 'deleted_items'), {});
    clearDataCaches();
    broadcastAppUpdate('products_updated');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Restores a specific deleted marble or fixing material
 */
export async function restoreDeletedItem(id: string, type: 'marble' | 'fixing') {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const key = `${type}_${id}`;
    await setDoc(doc(db, 'config', 'deleted_items'), {
      [key]: false
    }, { merge: true });
    clearDataCaches();
    broadcastAppUpdate('products_updated', { entity: type, id });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Dynamic Size Formats Management
 */
export async function getSizeFormats(): Promise<string[]> {
  const db = getDb();
  const defaultFormats = [
    "Gangsaw",
    "Counter",
    "24 inches",
    "36-inch counter",
    "42-inch counter",
    "52-inch counter",
    "Block"
  ];
  if (!db) return defaultFormats;
  try {
    const colRef = collection(db, 'size_formats');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      // If collection is empty, seed with defaults in Firestore
      for (const format of defaultFormats) {
        await addDoc(colRef, { name: format, createdAt: new Date().toISOString() });
      }
      return defaultFormats;
    }
    const formats = snapshot.docs.map(doc => doc.data().name as string);
    // Remove duplicates and clean
    const uniqueFormats = Array.from(new Set([...formats]));
    return uniqueFormats.length > 0 ? uniqueFormats : defaultFormats;
  } catch (error) {
    logFetchError("Error fetching size formats", error);
    return defaultFormats;
  }
}

export async function addSizeFormat(formatName: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: "Database offline" };
  try {
    const trimmed = formatName.trim();
    if (!trimmed) return { success: false, error: "Size cannot be empty" };
    const colRef = collection(db, 'size_formats');
    // Check if it already exists
    const snapshot = await getDocs(colRef);
    const exists = snapshot.docs.some(doc => doc.data().name?.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: true }; // Already exists, treat as success
    }
    await addDoc(colRef, { name: trimmed, createdAt: new Date().toISOString() });
    return { success: true };
  } catch (error: any) {
    console.error("Error adding size format:", error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Renovation Management & Rates Interfaces & Functions
 */
export interface RenovationSpaceRate {
  id: string;
  nameEn: string;
  nameUr: string;
  defaultSqFt: number;
  baseRateBudget: number;
  baseRatePremium: number;
  baseRateLuxury: number;
  unit: string;
  descriptionEn: string;
  descriptionUr: string;
  iconName?: string;
}

export interface RenovationTradeRate {
  id: string;
  nameEn: string;
  nameUr: string;
  ratePKR: number;
  unit: string;
  descriptionEn: string;
  descriptionUr: string;
  category: 'marble' | 'tile' | 'electrical' | 'window' | 'carpenter' | 'color' | 'designer_color' | 'ceiling' | 'plumbing' | 'steel' | 'civil';
}

export interface RenovationCustomItem {
  id: string;
  nameEn: string;
  nameUr?: string;
  ratePKR?: number;
  rate?: number;
  unit: string;
  spaceOrTrade?: string;
  descriptionEn?: string;
  descriptionUr?: string;
}

export interface RenovationRatesConfig {
  gradeMultipliers: {
    standard: number;
    premium: number;
    luxury: number;
  };
  spaces: RenovationSpaceRate[];
  trades: RenovationTradeRate[];
  customItems: RenovationCustomItem[];
}

export const defaultRenovationRatesConfig: RenovationRatesConfig = {
  gradeMultipliers: {
    standard: 1.0,
    premium: 1.5,
    luxury: 2.2,
  },
  spaces: [
    {
      id: 'bathroom',
      nameEn: 'Bathroom Renovation',
      nameUr: 'باتھ روم کی جدید ترین تزئین و آرائش',
      defaultSqFt: 60,
      baseRateBudget: 350,
      baseRatePremium: 650,
      baseRateLuxury: 1200,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Complete bathroom overhaul: tile/marble fitting, concealed plumbing, vanity setup, glass shower cabin & sanitary fixtures.',
      descriptionUr: 'مکمل باتھ روم ری نوویشن: ٹائل اور ماربل، پائپنگ، وینٹی، شاور گلاس اور سینیٹری فیٹنگز۔'
    },
    {
      id: 'kitchen',
      nameEn: 'Kitchen Renovation',
      nameUr: 'کچن کی ری ماڈلنگ اور کیبنٹس',
      defaultSqFt: 120,
      baseRateBudget: 450,
      baseRatePremium: 850,
      baseRateLuxury: 1600,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Modern kitchen makeover: UV/Acrylic cabinets, marble/granite countertops, exhaust backsplash, and LED profile lighting.',
      descriptionUr: 'جدید کچن میک اوور: یو وی/ایکرائلک الماریاں، گرینائٹ کاؤنٹر ٹاپس، بیک سلیش اور لائٹنگ۔'
    },
    {
      id: 'bedroom',
      nameEn: 'Room / Bedroom Renovation',
      nameUr: 'بیڈ روم کی تزئین و آرائش',
      defaultSqFt: 220,
      baseRateBudget: 180,
      baseRatePremium: 350,
      baseRateLuxury: 700,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Full room design: marble flooring, false ceiling, plastic emulsion/velvet paint, floor-to-ceiling wardrobes & smart switches.',
      descriptionUr: 'کمرے کی سجاوت: ماربل یا ٹائل فلورنگ، فالز سیلنگ، پلاسٹک ایملشن، الماری اور الیکٹرک پورٹس۔'
    },
    {
      id: 'tv_lounge',
      nameEn: 'TV Lounge Renovation',
      nameUr: 'ٹی وی لاؤنج اور میڈیا وال',
      defaultSqFt: 300,
      baseRateBudget: 220,
      baseRatePremium: 420,
      baseRateLuxury: 850,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Family TV lounge: Backlit Onyx / Marble media wall, fluted wood panels, POP false ceiling, and luxury ambient lighting.',
      descriptionUr: 'ٹی وی لاؤنج: ماربل بیک لٹ میڈیا وال، ووڈن پینلنگ، سیلنگ اور ڈائمنڈ پالش فرش۔'
    },
    {
      id: 'dining_room',
      nameEn: 'Dining Room Renovation',
      nameUr: 'ڈائننگ روم اور ہال تزئین',
      defaultSqFt: 180,
      baseRateBudget: 200,
      baseRatePremium: 380,
      baseRateLuxury: 750,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Sophisticated dining area: Premium flooring, chandelier profile ceiling, washable emulsion & marble serving counters.',
      descriptionUr: 'ڈائننگ ہال: شاندار فلورنگ، فانوس کی جگہ، واشیبل پینٹ اور سرونگ ماربل کاؤنٹرز۔'
    },
    {
      id: 'porch',
      nameEn: 'Car Porch & Driveway Renovation',
      nameUr: 'کار پورچ اور ڈرائیو وے تزئین',
      defaultSqFt: 250,
      baseRateBudget: 150,
      baseRatePremium: 280,
      baseRateLuxury: 550,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Heavy duty car porch: Rough anti-skid granite/tile flooring, steel canopy/trusses, main CNC gate & security lights.',
      descriptionUr: 'کار پورچ: پختہ اینٹی سلپ ماربل یا ٹائلز، سٹیل شیڈ، سی این سی گیٹ اور سیکیورٹی لائٹس۔'
    },
    {
      id: 'front_elevation',
      nameEn: 'Front Elevation Renovation',
      nameUr: 'فرنٹ ایلیویشن اور بیرونی وال کلَیڈنگ',
      defaultSqFt: 400,
      baseRateBudget: 250,
      baseRatePremium: 500,
      baseRateLuxury: 1100,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Exterior facade transformation: Weather Shield paint, natural stone / marble tile cladding, glass balconies & spot floodlights.',
      descriptionUr: 'گھر کا خوبصورت بیرونی محاذ: ویذر شیلڈ، نیچرل سٹون کلَیڈنگ، گلاس ہینڈ ریلنگ اور اسپاٹ لائٹس۔'
    },
    {
      id: 'drawing_room',
      nameEn: 'Drawing Room / Guest Lounge',
      nameUr: 'ڈرائنگ روم کی ڈیکوریشن و سیٹنگ',
      defaultSqFt: 250,
      baseRateBudget: 220,
      baseRatePremium: 400,
      baseRateLuxury: 800,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Guest lounge renovation: Mirror polish marble, 3D feature wall, velvet texture paint, acoustic ceiling & UPVC window.',
      descriptionUr: 'مہمان خانہ: ڈائمنڈ پالش ماربل، تھری ڈی وال پینلنگ، پینٹ اور انسولیٹڈ کھڑکیاں۔'
    },
    {
      id: 'terrace_roof',
      nameEn: 'Terrace & Rooftop Renovation',
      nameUr: 'ٹیرس، باؤنڈری وال اور واٹر پروپنگ',
      defaultSqFt: 350,
      baseRateBudget: 130,
      baseRatePremium: 240,
      baseRateLuxury: 480,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Open terrace upgrade: Water-proof membrane base, anti-heat marble chips / tile flooring, parapet safety railings & outdoor lights.',
      descriptionUr: 'چھت اور ٹیرس: واٹر پروپنگ شیٹ، اینٹی ہیٹ چپس یا ٹائلز، باؤنڈری وال اور لائٹ۔'
    },
    {
      id: 'office_commercial',
      nameEn: 'Office & Commercial Space',
      nameUr: 'دفتر اور کمرشل پلازہ کی ری نوویشن',
      defaultSqFt: 500,
      baseRateBudget: 200,
      baseRatePremium: 390,
      baseRateLuxury: 850,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Commercial interior revamp: Heavy porcelain tiles, glass partitions, DB board electrical setup & modern reception desk.',
      descriptionUr: 'کمرشل دفتر: ہیوی ڈیوٹی پورسلیٹ ٹائلز، گلاس پارٹیشنز، الیکٹرک ڈی بی بورڈ اور جدید کاؤنٹر۔'
    }
  ],
  trades: [
    {
      id: 'trade_marble_fixing',
      nameEn: 'Marble Fixing & Diamond Polishing',
      nameUr: 'ماربل کی فٹنگ اور ڈائمنڈ کرسٹل پالش',
      ratePKR: 65,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Slab fitting, zero-gap joints, double-fire laser leveling, 8-stage diamond grit mirror polishing.',
      descriptionUr: 'ماربل سلیب فٹنگ، زیرو جوڑ الائنمنٹ اور 8 مرحلہ وار ڈائمنڈ کرسٹل پالش۔',
      category: 'marble'
    },
    {
      id: 'trade_marble_tile',
      nameEn: 'Marble and Tile Flooring',
      nameUr: 'ماربل اور پورسلین ٹائل فرش',
      ratePKR: 85,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Large format porcelain 60x120cm, wall tiles, anti-skid bathroom tiles, epoxy bond chemical grout.',
      descriptionUr: 'بڑے سائز 60x120 پورسلیٹ ٹائلز، اینٹی سلپ باتھ روم ٹائلز اور واٹر پروپنگ گراؤٹنگ۔',
      category: 'tile'
    },
    {
      id: 'trade_electrical',
      nameEn: 'Electrical Work & Concealed Wiring',
      nameUr: 'الیکٹرک ورکس، ڈی بی پینل اور لائٹنگ',
      ratePKR: 45,
      unit: 'PKR / sq.ft',
      descriptionEn: '99.9% pure copper cabling, breaker DB board setup, SMD spotlights, profile track lights & ATS wiring.',
      descriptionUr: 'پیویر کاپر کنسیلڈ وائرنگ، مین ڈی بی بورڈ، اسپاٹ لائٹس اور چینل ٹریک کنکشنز۔',
      category: 'electrical'
    },
    {
      id: 'trade_window',
      nameEn: 'Window & UPVC / Aluminum Glass',
      nameUr: 'ایلومینیم اور یو پی وی سی کھڑکیاں',
      ratePKR: 550,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Thermal insulated UPVC window frames, double-glazed soundproof glass, tempered shower doors.',
      descriptionUr: 'یو پی وی سی فریمز، ساؤنڈ پروپ ڈبل گلاس کھڑکیاں اور ٹیمپرڈ گلاس شاور پارٹیشنز۔',
      category: 'window'
    },
    {
      id: 'trade_carpenter',
      nameEn: 'Carpenter & Woodwork',
      nameUr: 'کارپینٹری، کچن الماریاں اور ڈورز',
      ratePKR: 1200,
      unit: 'PKR / running ft',
      descriptionEn: 'Tactile & UV high-gloss kitchen cabinets, ash wood solid doors, sliding bedroom wardrobes, TV walls.',
      descriptionUr: 'یو وی اور ایکریلک ہائی گلوس کچن کابینہ، سالڈ ووڈن ڈورز اور سلائیڈنگ الماریاں۔',
      category: 'carpenter'
    },
    {
      id: 'trade_color',
      nameEn: 'Color & Plastic Emulsion Paint',
      nameUr: 'پلاسٹک ایملشن پینٹ اور ویذر شیلڈ',
      ratePKR: 35,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Exterior Weather Shield coating, interior plastic emulsion, anti-seep wall treatment, smooth putty coats.',
      descriptionUr: 'بیرونی ویذر شیلڈ پینٹ، اندرونی پلاسٹک ایملشن اور سیم ختم کرنے والا ٹریٹمنٹ۔',
      category: 'color'
    },
    {
      id: 'trade_designer_color',
      nameEn: 'Designer Color & Velvet Texture Paint',
      nameUr: 'فینسی ٹیکسچر پینٹ اور وال پینلنگ',
      ratePKR: 75,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Decorative metallic velvet textures, rock finish coats, feature wall stencil designs, marbleized paint.',
      descriptionUr: 'فینسی ویلوٹ فنش ٹیکسچر پینٹ، میٹالک راک فنش اور فیچر وال ڈیزائننگ۔',
      category: 'designer_color'
    },
    {
      id: 'trade_ceiling',
      nameEn: 'False Ceiling & Gypsum / POP',
      nameUr: 'جپسم، پاپ اور مشروم فالز سیلنگ',
      ratePKR: 140,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Heat insulation Mushroom POP ceiling, high-density gypsum false ceiling, LED profile channels.',
      descriptionUr: 'مشروم پاپ انسولیشن سیلنگ، واٹر ریزسٹنٹ جپسم بورڈ اور ایل ای ڈی پروفائل لائٹنگ۔',
      category: 'ceiling'
    },
    {
      id: 'trade_plumbing',
      nameEn: 'Plumbing & Sanitary Works',
      nameUr: 'پی پی آر سی پائپنگ اور سینیٹری فیٹنگ',
      ratePKR: 55,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Underground PPRC water supply piping, heavy gauge PVC drainage, concealed mixers, tank leak repair.',
      descriptionUr: 'پی پی آر سی واٹر نالی و پائپنگ، باتھ روم سینیٹری اور واٹر ٹینک سیکیورٹی۔',
      category: 'plumbing'
    },
    {
      id: 'trade_steel',
      nameEn: 'Steel Fabrication & CNC Gates',
      nameUr: 'لوہے کے گیٹ، جنگلے اور سیکیورٹی گرل',
      ratePKR: 350,
      unit: 'PKR / sq.ft',
      descriptionEn: 'CNC laser-cut steel main gates, SS 304 stair railings, iron security grills, car porch steel sheds.',
      descriptionUr: 'سی این سی لیزر کٹ مین گیٹ، سٹینلیس سٹیل ہینڈ ریلنگ اور ونڈوز سیکیورٹی گرل۔',
      category: 'steel'
    },
    {
      id: 'trade_civil',
      nameEn: 'Civil Work, Demolition & Structure',
      nameUr: 'پرانے توڑ پھوڑ، پلستر اور ریپیئرنگ',
      ratePKR: 40,
      unit: 'PKR / sq.ft',
      descriptionEn: 'Old tile/plaster dismantling, wall brickwork alterations, damp proof course (DPC), concrete levelling.',
      descriptionUr: 'پرانی ٹائلز و پلستر توڑ پھوڑ، نئی دیوار کی چنائی اور کنکریٹ فلور لیولنگ۔',
      category: 'civil'
    }
  ],
  customItems: []
};

export function getInstantRenovationRatesConfig(): RenovationRatesConfig {
  if (inMemoryCache.renovationRates?.data) {
    return inMemoryCache.renovationRates.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cached_renovation_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed as RenovationRatesConfig;
        }
      }
    } catch (e) {}
  }
  return defaultRenovationRatesConfig;
}

export async function getRenovationRatesConfig(): Promise<RenovationRatesConfig> {
  const now = Date.now();
  if (inMemoryCache.renovationRates && inMemoryCache.renovationRates.timestamp > 0 && (now - inMemoryCache.renovationRates.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.renovationRates.data;
  }
  if (inFlightRequests.renovationRates) {
    return inFlightRequests.renovationRates;
  }

  const db = getDb();
  if (!db) return getInstantRenovationRatesConfig();

  const promise = (async () => {
    try {
      const docRef = doc(db, 'settings', 'renovation_rates');
      const docSnap = await withFastTimeout(getDoc(docRef), 2000);
      const result: RenovationRatesConfig = docSnap.exists()
        ? (() => {
            const data = docSnap.data() as Partial<RenovationRatesConfig>;
            return {
              gradeMultipliers: { ...defaultRenovationRatesConfig.gradeMultipliers, ...data.gradeMultipliers },
              spaces: data.spaces && data.spaces.length > 0 ? data.spaces : defaultRenovationRatesConfig.spaces,
              trades: data.trades && data.trades.length > 0 ? data.trades : defaultRenovationRatesConfig.trades,
              customItems: data.customItems || [],
            };
          })()
        : defaultRenovationRatesConfig;
      inMemoryCache.renovationRates = { data: result, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_renovation_rates', JSON.stringify(result));
        } catch (e) {}
      }
      return result;
    } catch (error) {
      logFetchError("Failed to fetch renovation rates config from Firestore, using cached/default:", error);
      return getInstantRenovationRatesConfig();
    } finally {
      delete inFlightRequests.renovationRates;
    }
  })();

  inFlightRequests.renovationRates = promise;
  return promise;
}

export async function updateRenovationRates(configData: RenovationRatesConfig) {
  const db = getDb();
  if (!db) return { success: false, error: "Database not connected" };
  try {
    const docRef = doc(db, 'settings', 'renovation_rates');
    await setDoc(docRef, { ...configData, updatedAt: new Date().toISOString() }, { merge: false });
    clearDataCaches('costsConfig');
    clearDataCaches('renovationRates');
    broadcastAppUpdate('costs_updated', configData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

export async function getRenovationInquiries(): Promise<any[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const colRef = collection(db, 'renovation_inquiries');
    const q = query(colRef, limit(100));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    return results.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    logFetchError("Error fetching renovation inquiries", err);
    return [];
  }
}

/* ==========================================
   PARTNER MARBLE COMPANIES & LOGO MANAGEMENT
   ========================================== */

export interface PartnerCompany {
  id: string;
  nameEn: string;
  nameUr?: string;
  logoUrl: string;
  descriptionEn?: string;
  descriptionUr?: string;
  isWorkingWith: boolean; // Indicates active relationship with this marble brand
  showInHeader: boolean;  // Display company logo in main heading section / header
  websiteUrl?: string;
  contactPhone?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const defaultPartnerCompanies: PartnerCompany[] = [
  {
    id: 'partner_pak_royal',
    nameEn: 'Pak Royal Marbles',
    nameUr: 'پاک رائل ماربلز',
    logoUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&auto=format&fit=crop&q=80',
    descriptionEn: 'Premium Ziarat White & Badal Grey marble quarry processors and exporters.',
    descriptionUr: 'زیارت وائٹ اور بادل گرے ماربل کے بہترین کوالٹی سپلائر۔',
    isWorkingWith: true,
    showInHeader: true,
    websiteUrl: 'https://pakroyalmarbles.com',
    order: 1
  },
  {
    id: 'partner_topsun_stone',
    nameEn: 'Topsun Stone Industries',
    nameUr: 'ٹاپ سن اسٹون انڈسٹریز',
    logoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80',
    descriptionEn: 'Official distributor for imported Italian Granite, Onyx, and composite quartz.',
    descriptionUr: 'امپورٹڈ اطالوی گرینائٹ، اونیکس اور کوارٹز کے منظور شدہ ڈسٹریبیوٹر۔',
    isWorkingWith: true,
    showInHeader: true,
    websiteUrl: 'https://topsunstone.com',
    order: 2
  },
  {
    id: 'partner_national_granite',
    nameEn: 'National Granite & Marble',
    nameUr: 'نیشنل گرینائٹ اینڈ ماربل',
    logoUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=200&auto=format&fit=crop&q=80',
    descriptionEn: 'Heavy duty commercial black granite slab cutting & custom edge profiling.',
    descriptionUr: 'بلیک گرینائٹ سلیب کٹنگ اور کسٹم ایج ڈیزائننگ کے ماہر۔',
    isWorkingWith: true,
    showInHeader: true,
    websiteUrl: 'https://nationalgranite.com',
    order: 3
  },
  {
    id: 'partner_master_stone',
    nameEn: 'Master Marble & Tile Co.',
    nameUr: 'ماسٹر ماربل اینڈ ٹائل کو',
    logoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
    descriptionEn: 'High-end residential marble flooring and CNC jet cutting designs.',
    descriptionUr: 'رہائشی فلورنگ اور سی این سی واٹر جیٹ ماربل ڈیزائنز۔',
    isWorkingWith: false,
    showInHeader: false,
    websiteUrl: '',
    order: 4
  }
];

export async function getPartnerCompanies(): Promise<PartnerCompany[]> {
  const now = Date.now();
  if (inMemoryCache.partnerCompanies && (now - inMemoryCache.partnerCompanies.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.partnerCompanies.data;
  }
  if (inFlightRequests.partnerCompanies) {
    return inFlightRequests.partnerCompanies;
  }

  const db = getDb();
  if (!db) return defaultPartnerCompanies;

  const promise = (async () => {
    try {
      const colRef = collection(db, 'partner_companies');
      const snapshot = await withFastTimeout(getDocs(colRef), 2500);
      if (snapshot.empty) {
        inMemoryCache.partnerCompanies = { data: defaultPartnerCompanies, timestamp: Date.now() };
        return defaultPartnerCompanies;
      }
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerCompany));
      const sorted = items.sort((a, b) => (a.order || 99) - (b.order || 99));
      inMemoryCache.partnerCompanies = { data: sorted, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_partner_companies', JSON.stringify(sorted));
        } catch (e) {}
      }
      return sorted;
    } catch (err) {
      logFetchError('getPartnerCompanies', err);
      if (inMemoryCache.partnerCompanies?.data) return inMemoryCache.partnerCompanies.data;
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('cached_partner_companies');
          if (cached) return JSON.parse(cached);
        } catch (e) {}
      }
      return defaultPartnerCompanies;
    } finally {
      delete inFlightRequests.partnerCompanies;
    }
  })();

  inFlightRequests.partnerCompanies = promise;
  return promise;
}

export async function getDailyRates(): Promise<DailyRates> {
  const now = Date.now();
  if (inMemoryCache.dailyRates && (now - inMemoryCache.dailyRates.timestamp < CACHE_TTL_MS)) {
    return inMemoryCache.dailyRates.data;
  }
  if (inFlightRequests.dailyRates) {
    return inFlightRequests.dailyRates;
  }

  const db = getDb();
  if (!db) return defaultDailyRates;

  const promise = (async () => {
    try {
      const docSnap = await withFastTimeout(getDoc(doc(db, 'rates', 'daily')), 2000);
      if (docSnap.exists()) {
        const data = docSnap.data() as DailyRates;
        inMemoryCache.dailyRates = { data, timestamp: Date.now() };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_daily_rates', JSON.stringify(data));
          } catch (e) {}
        }
        return data;
      }
      return defaultDailyRates;
    } catch (error) {
      logFetchError("Error fetching daily rates", error);
      if (inMemoryCache.dailyRates?.data) return inMemoryCache.dailyRates.data;
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('cached_daily_rates');
          if (cached) return JSON.parse(cached);
        } catch (e) {}
      }
      return defaultDailyRates;
    } finally {
      delete inFlightRequests.dailyRates;
    }
  })();

  inFlightRequests.dailyRates = promise;
  return promise;
}

export async function saveDailyRates(rates: Partial<DailyRates>): Promise<{ success: boolean; error?: string }> {
  clearDataCaches('dailyRates');
  const db = getDb();
  if (!db) return { success: true };
  try {
    const current = await getDailyRates();
    const merged = { ...current, ...rates, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'rates', 'daily'), merged, { merge: true });
    inMemoryCache.dailyRates = { data: merged as DailyRates, timestamp: Date.now() };
    broadcastAppUpdate('products_updated', { entity: 'daily_rates' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface ExtractedSupplierRateItem {
  itemId?: string;
  variantId?: string;
  itemName: string;
  variantName?: string;
  supplierRate: number;
  appPrice?: number;
  category?: string;
  thickness?: string;
  size?: string;
}

export async function getAdminAiContext() {
  const [marbles, fixingMaterials, buildRates, dailyRates, suppliers, orders, serviceProviders, searchLogs] = await Promise.all([
    getMarbles().catch(() => []),
    getFixingMaterials().catch(() => []),
    getBuildYourHomeRatesConfig().catch(() => getInstantBuildYourHomeRatesConfig()),
    getDailyRates().catch(() => defaultDailyRates),
    getSuppliers().catch(() => []),
    getOrders(40).catch(() => []),
    getServiceProviders().catch(() => []),
    getSearchLogs().catch(() => [])
  ]);

  const safeMarbles = Array.isArray(marbles) ? marbles : [];
  const safeFixing = Array.isArray(fixingMaterials) ? fixingMaterials : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProviders = Array.isArray(serviceProviders) ? serviceProviders : [];
  const safeSearches = Array.isArray(searchLogs) ? searchLogs : [];

  return {
    marbles: safeMarbles.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category || m.materialType || 'Marble',
      origin: m.origin,
      variants: (Array.isArray(m.variants) ? m.variants : []).map(v => ({
        id: v.id,
        name: `${v.size || 'Standard'} (${v.thickness || '16mm'})`,
        size: v.size,
        thickness: v.thickness,
        price: v.price
      })),
      stockStatus: (m as any).stockStatus || ((m as any).inStock !== false ? 'in_stock' : 'out_of_stock'),
      isHidden: Boolean(m.isHidden),
      onSale: !!m.onSale,
      discount: m.discount || 0,
      discountType: m.discountType || 'percentage',
      saleBadgeText: m.saleBadgeText || '',
      imageUrl: m.imageUrl
    })),
    fixingMaterials: safeFixing.map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      price: f.price,
      unit: f.unit,
      stockStatus: (f as any).stockStatus || ((f as any).inStock !== false ? 'in_stock' : 'out_of_stock'),
      isHidden: Boolean(f.isHidden),
      onSale: !!f.onSale,
      discount: f.discount || 0,
      discountType: f.discountType || 'percentage',
      saleBadgeText: f.saleBadgeText || '',
      imageUrl: f.imageUrl
    })),
    suppliers: safeSuppliers.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      contactPerson: s.contactPerson,
      status: s.status,
      ratesCount: Array.isArray(s.rates) ? s.rates.length : 0,
      rates: (Array.isArray(s.rates) ? s.rates : []).slice(0, 60).map(r => ({
        materialId: r.materialId,
        materialName: r.materialName,
        rate: r.rate
      }))
    })),
    orders: safeOrders.slice(0, 40).map(o => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.calculationDetails?.customerInfo?.phone || '',
      marbleName: o.marbleName,
      quantity: o.quantity,
      totalPrice: o.totalPrice,
      status: o.status,
      date: o.date
    })),
    serviceProviders: safeProviders.map(p => ({
      id: p.id,
      name: p.name,
      service: p.service,
      phone: p.phone,
      status: p.status
    })),
    missedSearches: safeSearches.filter(s => !s?.found).slice(0, 20).map(s => s.term),
    buildRatesSummary: {
      baseCostPerSqFt: buildRates?.newProjects?.baseCostPerSqFt ?? defaultBuildYourHomeRates.newProjects.baseCostPerSqFt,
      gradeRates: buildRates?.newProjects?.gradeRates ?? defaultBuildYourHomeRates.newProjects.gradeRates,
      gradeMultipliers: buildRates?.newProjects?.gradeMultipliers ?? defaultBuildYourHomeRates.newProjects.gradeMultipliers,
      floorRateMultipliers: buildRates?.newProjects?.floorRateMultipliers ?? defaultBuildYourHomeRates.newProjects.floorRateMultipliers
    },
    dailyRates: dailyRates || defaultDailyRates
  };
}

function normalizeMatchKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .trim();
}

export async function updateSupplierRateListAndSyncApp(params: {
  supplierId?: string;
  supplierName: string;
  syncToApp?: boolean;
  markupPercentage?: number;
  rates: ExtractedSupplierRateItem[];
}): Promise<{
  success: boolean;
  supplierId?: string;
  supplierName?: string;
  updatedSupplierRatesCount: number;
  updatedAppProductsCount: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) return { success: false, updatedSupplierRatesCount: 0, updatedAppProductsCount: 0, error: 'Database not connected' };

  try {
    const [suppliers, marbles, fixingMaterials] = await Promise.all([
      getSuppliers(),
      getMarbles(),
      getFixingMaterials()
    ]);

    const normTargetSup = normalizeMatchKey(params.supplierName || '');
    let targetSupplier = suppliers.find(s =>
      (params.supplierId && s.id === params.supplierId) ||
      normalizeMatchKey(s.name) === normTargetSup ||
      (normTargetSup.length > 3 && normalizeMatchKey(s.name).includes(normTargetSup)) ||
      (normTargetSup.length > 3 && normTargetSup.includes(normalizeMatchKey(s.name)))
    );

    if (!targetSupplier) {
      const newSupId = params.supplierId || `sup-${Date.now()}`;
      targetSupplier = {
        id: newSupId,
        name: params.supplierName || 'Marble Supplier',
        contactPerson: 'Representative',
        phone: '',
        address: '',
        email: '',
        status: 'active',
        materialsSupplied: ['marble'],
        rates: []
      };
    }

    const existingRatesMap = new Map<string, SupplierRate>();
    for (const r of targetSupplier.rates || []) {
      existingRatesMap.set(r.materialId, { ...r });
    }

    const syncToApp = params.syncToApp !== false;
    const markupPct = Number(params.markupPercentage) || 0;
    const nowIso = new Date().toISOString();

    let updatedSupplierRatesCount = 0;
    let updatedAppProductsCount = 0;

    const modifiedMarblesMap = new Map<string, Marble>();
    const modifiedFixingMap = new Map<string, FixingMaterial>();

    for (const item of params.rates || []) {
      const supRate = Number(item.supplierRate);
      if (isNaN(supRate) || supRate <= 0) continue;

      const computedAppPrice = item.appPrice && Number(item.appPrice) > 0
        ? Math.round(Number(item.appPrice))
        : Math.round(supRate * (1 + markupPct / 100));

      const rawItemName = item.itemName || '';
      const normName = normalizeMatchKey(rawItemName);

      // 1. Try matching to a Marble product
      let matchedMarble = marbles.find(m =>
        (item.itemId && m.id === item.itemId) ||
        normalizeMatchKey(m.name) === normName
      );

      if (!matchedMarble && normName.length >= 3) {
        matchedMarble = marbles.find(m => {
          const mNorm = normalizeMatchKey(m.name);
          return mNorm.includes(normName) || normName.includes(mNorm);
        });
      }

      if (matchedMarble) {
        const workingMarble = modifiedMarblesMap.get(matchedMarble.id) || {
          ...matchedMarble,
          variants: matchedMarble.variants.map(v => ({ ...v }))
        };

        const normVariantHint = normalizeMatchKey(`${item.variantName || ''} ${item.size || ''} ${item.thickness || ''} ${rawItemName}`);
        let targetVariants = workingMarble.variants;

        if (item.variantId) {
          const exactVar = workingMarble.variants.filter(v => v.id === item.variantId);
          if (exactVar.length > 0) targetVariants = exactVar;
        } else if (workingMarble.variants.length > 1 && normVariantHint) {
          const hintedVars = workingMarble.variants.filter(v => {
            const vKey = normalizeMatchKey(`${v.size || ''} ${v.thickness || ''}`);
            if (normVariantHint.includes('12') && vKey.includes('12')) return true;
            if (normVariantHint.includes('24') && vKey.includes('24')) return true;
            if (normVariantHint.includes('slab') && vKey.includes('slab')) return true;
            if (normVariantHint.includes('tile') && vKey.includes('tile')) return true;
            return false;
          });
          if (hintedVars.length > 0) targetVariants = hintedVars;
        }

        for (const v of targetVariants) {
          const compositeId = `${workingMarble.id}_${v.id}`;
          const prevRateObj = existingRatesMap.get(compositeId);
          existingRatesMap.set(compositeId, {
            id: prevRateObj?.id || `rate-${compositeId}-${Date.now()}`,
            materialId: compositeId,
            materialName: `${workingMarble.name} - ${v.size || 'Standard'} (${v.thickness || '16mm'})`,
            materialType: 'marble',
            rate: supRate,
            previousRate: prevRateObj ? prevRateObj.rate : supRate,
            lastUpdated: nowIso,
            updatedAt: nowIso
          });
          updatedSupplierRatesCount++;

          if (syncToApp) {
            v.price = computedAppPrice;
          }
        }

        if (syncToApp) {
          modifiedMarblesMap.set(workingMarble.id, workingMarble);
        }
        continue;
      }

      // 2. Try matching to a Fixing Material
      let matchedFixing = fixingMaterials.find(f =>
        (item.itemId && f.id === item.itemId) ||
        normalizeMatchKey(f.name) === normName ||
        (normName.length >= 3 && (normalizeMatchKey(f.name).includes(normName) || normName.includes(normalizeMatchKey(f.name))))
      );

      if (matchedFixing) {
        const prevRateObj = existingRatesMap.get(matchedFixing.id);
        existingRatesMap.set(matchedFixing.id, {
          id: prevRateObj?.id || `rate-${matchedFixing.id}-${Date.now()}`,
          materialId: matchedFixing.id,
          materialName: matchedFixing.name,
          materialType: 'fixing_material',
          rate: supRate,
          previousRate: prevRateObj ? prevRateObj.rate : supRate,
          lastUpdated: nowIso,
          updatedAt: nowIso
        });
        updatedSupplierRatesCount++;

        if (syncToApp) {
          modifiedFixingMap.set(matchedFixing.id, {
            ...matchedFixing,
            price: computedAppPrice
          });
        }
        continue;
      }

      // 3. Unmatched item: still record in supplier's rate sheet so nothing from the image is lost
      const customMatId = item.itemId || `custom_${normName.replace(/\s+/g, '_')}`;
      const prevRateObj = existingRatesMap.get(customMatId);
      existingRatesMap.set(customMatId, {
        id: prevRateObj?.id || `rate-${customMatId}-${Date.now()}`,
        materialId: customMatId,
        materialName: item.variantName ? `${rawItemName} (${item.variantName})` : rawItemName,
        materialType: 'marble',
        rate: supRate,
        previousRate: prevRateObj ? prevRateObj.rate : supRate,
        lastUpdated: nowIso,
        updatedAt: nowIso
      });
      updatedSupplierRatesCount++;
    }

    // Save updated supplier rates
    targetSupplier.rates = Array.from(existingRatesMap.values());
    await saveSupplier(targetSupplier);

    // Save all modified Marbles and Fixing Materials to Firestore so the entire app updates
    if (syncToApp) {
      const marbleSavePromises = Array.from(modifiedMarblesMap.values()).map(m =>
        setDoc(doc(db, 'marbles', m.id), { ...m, updatedAt: nowIso }, { merge: true })
      );
      const fixingSavePromises = Array.from(modifiedFixingMap.values()).map(f =>
        setDoc(doc(db, 'fixing_materials', f.id), { ...f, updatedAt: nowIso }, { merge: true })
      );
      await Promise.all([...marbleSavePromises, ...fixingSavePromises]);
      updatedAppProductsCount = modifiedMarblesMap.size + modifiedFixingMap.size;
    }

    inMemoryCache.marbles = null;
    inMemoryCache.fixingMaterials = null;
    broadcastAppUpdate('products_updated', {
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      updatedSupplierRatesCount,
      updatedAppProductsCount
    });

    return {
      success: true,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      updatedSupplierRatesCount,
      updatedAppProductsCount
    };
  } catch (err: any) {
    console.error('Error in updateSupplierRateListAndSyncApp:', err);
    return {
      success: false,
      updatedSupplierRatesCount: 0,
      updatedAppProductsCount: 0,
      error: err.message || String(err)
    };
  }
}

export async function syncSupplierRatesToEntireApp(params: {
  supplierId?: string;
  supplierName: string;
  markupPercentage?: number;
}): Promise<{
  success: boolean;
  supplierName?: string;
  updatedAppProductsCount: number;
  error?: string;
}> {
  const suppliers = await getSuppliers();
  const normTarget = normalizeMatchKey(params.supplierName || '');
  const targetSupplier = suppliers.find(s =>
    (params.supplierId && s.id === params.supplierId) ||
    normalizeMatchKey(s.name) === normTarget ||
    (normTarget.length > 3 && normalizeMatchKey(s.name).includes(normTarget)) ||
    (normTarget.length > 3 && normTarget.includes(normalizeMatchKey(s.name)))
  );

  if (!targetSupplier || !targetSupplier.rates || targetSupplier.rates.length === 0) {
    return {
      success: false,
      updatedAppProductsCount: 0,
      error: `Supplier "${params.supplierName}" not found or has no saved rates.`
    };
  }

  const extractedItems: ExtractedSupplierRateItem[] = targetSupplier.rates.map(r => {
    const parts = (r.materialId || '').split('_');
    const hasComposite = parts.length >= 2 && r.materialId.includes('_variant');
    return {
      itemId: hasComposite ? parts[0] : r.materialId,
      variantId: hasComposite ? parts.slice(1).join('_') : undefined,
      itemName: (r.materialName || '').split(' - ')[0].trim(),
      supplierRate: r.rate
    };
  });

  const res = await updateSupplierRateListAndSyncApp({
    supplierId: targetSupplier.id,
    supplierName: targetSupplier.name,
    syncToApp: true,
    markupPercentage: params.markupPercentage || 0,
    rates: extractedItems
  });

  return {
    success: res.success,
    supplierName: res.supplierName,
    updatedAppProductsCount: res.updatedAppProductsCount,
    error: res.error
  };
}

export async function savePartnerCompany(company: PartnerCompany): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database connection failed' };
  try {
    const compId = company.id || `partner_${Date.now()}`;
    const payload = {
      ...company,
      id: compId,
      updatedAt: new Date().toISOString(),
    };
    if (!company.createdAt) {
      payload.createdAt = new Date().toISOString();
    }
    await setDoc(doc(db, 'partner_companies', compId), payload, { merge: true });
    return { success: true, id: compId };
  } catch (err: any) {
    console.error('Error saving partner company:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function deletePartnerCompany(id: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database connection failed' };
  try {
    await deleteDoc(doc(db, 'partner_companies', id));
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting partner company:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function togglePartnerWorkingStatus(id: string, isWorkingWith: boolean, showInHeader?: boolean): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database connection failed' };
  try {
    const updateData: Record<string, any> = {
      isWorkingWith,
      updatedAt: new Date().toISOString()
    };
    if (showInHeader !== undefined) {
      updateData.showInHeader = showInHeader;
    }
    await updateDoc(doc(db, 'partner_companies', id), updateData);
    return { success: true };
  } catch (err: any) {
    console.error('Error updating partner company status:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Regional Representatives (علاقائی نمائندے) Management
 */
export const defaultRepresentatives: Representative[] = [
  {
    id: 'rep-fayyaz-hussain-dha2',
    nameEn: 'Fayyaz Hussain',
    nameUr: 'فیاض حسین',
    phone: '0303-5190554',
    whatsapp: '923035190554',
    regionEn: 'Islamabad DHA Phase 2 & Surrounding Areas',
    regionUr: 'اسلام آباد ڈی ایچ اے ٹو اور اس کے آس پاس کے علاقے',
    cities: ['Islamabad', 'DHA Phase 2', 'Potohar Road I-9/3', 'Bahria Town', 'Rawalpindi'],
    designationEn: 'Regional Representative & Coordinator (DHA 2)',
    designationUr: 'علاقائی نمائندہ و پراجیکٹ کوآرڈینیٹر',
    officeAddressEn: 'Plot # 375-A, Potohar Road, I-9/3, Islamabad',
    officeAddressUr: 'پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد',
    portalPin: 'FH-1052',
    isActive: true,
    order: 1
  }
];

function ensureRepPortalPin(rep: Representative): Representative {
  if (rep.portalPin && rep.portalPin.trim()) return rep;
  if (rep.id === 'rep-fayyaz-hussain-dha2') {
    return { ...rep, portalPin: 'FH-1052' };
  }
  const initials = (rep.nameEn || 'RP')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .replace(/[^A-Z]/g, '')
    .slice(0, 2) || 'RP';
  const digits = (rep.phone || rep.id || '1052').replace(/\D/g, '').slice(-4).padStart(4, '5');
  return { ...rep, portalPin: `${initials}-${digits}` };
}

// Known dummy / demo IDs that must never be shown or re-seeded
export const LEGACY_FAKE_REP_IDS = new Set([
  'rep-punjab-central',
  'rep-punjab-north',
  'rep-punjab-south',
  'rep-kpk',
  'rep-sindh',
  'rep-balochistan',
  'rep-ajk-gb'
]);

export function isLegacyFakeRep(r: Partial<Representative>): boolean {
  if (!r) return true;
  if (r.id && LEGACY_FAKE_REP_IDS.has(r.id)) return true;
  const legacyPhones = ['0300-4567890', '0333-5123456', '0301-7890123', '0315-9876543', '0321-2345678', '0334-7654321'];
  if (r.phone && legacyPhones.includes(r.phone.trim())) return true;
  return false;
}

export function getInstantRepresentatives(): Representative[] {
  if (inMemoryCache.representatives?.data?.length) {
    const list = inMemoryCache.representatives.data.filter(r => r && !isLegacyFakeRep(r));
    if (list.length > 0) return list;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('stone_expert_representatives');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleanParsed = parsed.filter((r: Representative) => r && r.id && !isLegacyFakeRep(r));
          if (cleanParsed.length > 0) {
            return cleanParsed;
          }
        }
      }
    } catch (e) {}
  }
  return defaultRepresentatives;
}

export async function getRepresentatives(): Promise<Representative[]> {
  const now = Date.now();
  if (inMemoryCache.representatives && inMemoryCache.representatives.timestamp > 0 && (now - inMemoryCache.representatives.timestamp < CACHE_TTL_MS)) {
    const list = inMemoryCache.representatives.data.filter(r => r && !isLegacyFakeRep(r));
    return list.length > 0 ? list : defaultRepresentatives;
  }

  if (inFlightRequests.representatives) {
    return inFlightRequests.representatives;
  }

  const db = getDb();
  if (!db) {
    const finalList = getInstantRepresentatives();
    inMemoryCache.representatives = { data: finalList, timestamp: Date.now() };
    return finalList;
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'representatives');
      const snapshot = await withFastTimeout(getDocs(colRef), 2000);
      if (snapshot.empty) {
        const fayyaz = defaultRepresentatives[0];
        try {
          await setDoc(doc(db, 'representatives', fayyaz.id), {
            ...fayyaz,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (e) {}
        inMemoryCache.representatives = { data: defaultRepresentatives, timestamp: Date.now() };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('stone_expert_representatives', JSON.stringify(defaultRepresentatives));
          } catch (e) {}
        }
        return defaultRepresentatives;
      }

      const items: Representative[] = [];
      const deletePromises: Promise<any>[] = [];

      for (const d of snapshot.docs) {
        const rep = { id: d.id, ...d.data() } as Representative;
        if (isLegacyFakeRep(rep)) {
          deletePromises.push(deleteDoc(doc(db, 'representatives', d.id)).catch(() => {}));
        } else {
          items.push(rep);
        }
      }

      if (deletePromises.length > 0) {
        Promise.all(deletePromises).catch(() => {});
      }

      if (items.length === 0) {
        const fayyaz = defaultRepresentatives[0];
        try {
          await setDoc(doc(db, 'representatives', fayyaz.id), {
            ...fayyaz,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (e) {}
        items.push(fayyaz);
      }

      const sorted = items
        .map(ensureRepPortalPin)
        .sort((a, b) => (a.order || 99) - (b.order || 99));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('stone_expert_representatives', JSON.stringify(sorted));
        } catch (e) {}
      }

      inMemoryCache.representatives = { data: sorted, timestamp: Date.now() };
      return sorted;
    } catch (err) {
      logFetchError('getRepresentatives', err);
      return getInstantRepresentatives();
    } finally {
      delete inFlightRequests.representatives;
    }
  })();

  inFlightRequests.representatives = promise;
  return promise;
}

export async function clearAllRepresentatives(): Promise<{ success: boolean; error?: string }> {
  inMemoryCache.representatives = { data: [], timestamp: Date.now() };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_representatives', JSON.stringify([]));
    } catch (e) {}
  }
  broadcastAppUpdate('representatives_updated', []);

  const db = getDb();
  if (!db) return { success: true };

  try {
    const colRef = collection(db, 'representatives');
    const snapshot = await getDocs(colRef);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'representatives', d.id)));
    await Promise.all(deletePromises);
    return { success: true };
  } catch (err: any) {
    console.error('Error clearing representatives:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function saveRepresentative(rep: Partial<Representative>): Promise<{ success: boolean; id?: string; error?: string }> {
  const db = getDb();
  const repId = rep.id || `rep_${Date.now()}`;
  const existingRep = (inMemoryCache.representatives?.data || []).find(r => r.id === repId);
  const autoPin = (() => {
    const raw = (rep.portalPin || existingRep?.portalPin || '').trim();
    if (raw) return raw.toUpperCase();
    const initials = (rep.nameEn || 'RP')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase())
      .join('')
      .replace(/[^A-Z]/g, '')
      .slice(0, 2) || 'RP';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${initials}-${rand}`;
  })();

  const payload: Representative = {
    id: repId,
    nameEn: rep.nameEn || '',
    nameUr: rep.nameUr || rep.nameEn || '',
    phone: rep.phone || '',
    whatsapp: rep.whatsapp || rep.phone?.replace(/[^0-9]/g, '') || '',
    regionEn: rep.regionEn || 'General Region',
    regionUr: rep.regionUr || 'علاقہ',
    cities: rep.cities || [],
    designationEn: rep.designationEn || 'Regional Representative',
    designationUr: rep.designationUr || 'علاقائی نمائندہ',
    officeAddressEn: rep.officeAddressEn || '',
    officeAddressUr: rep.officeAddressUr || '',
    avatarUrl: rep.avatarUrl || '',
    portalPin: autoPin,
    email: rep.email || '',
    isActive: rep.isActive !== undefined ? rep.isActive : true,
    order: rep.order || 99
  };

  // Update in memory and local storage
  const current = inMemoryCache.representatives?.data || [];
  const existingIdx = current.findIndex(r => r.id === repId);
  let updatedList: Representative[];
  if (existingIdx !== -1) {
    updatedList = [...current];
    updatedList[existingIdx] = payload;
  } else {
    updatedList = [...current, payload];
  }
  updatedList.sort((a, b) => (a.order || 99) - (b.order || 99));
  inMemoryCache.representatives = { data: updatedList, timestamp: Date.now() };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_representatives', JSON.stringify(updatedList));
    } catch (e) {}
  }
  broadcastAppUpdate('representatives_updated', updatedList);

  if (!db) return { success: true, id: repId };

  try {
    await setDoc(doc(db, 'representatives', repId), {
      ...payload,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true, id: repId };
  } catch (err: any) {
    console.error('Error saving representative to Firestore:', err);
    return { success: true, id: repId }; // Optimistic success via local sync
  }
}

export async function deleteRepresentative(id: string): Promise<{ success: boolean; error?: string }> {
  const current = inMemoryCache.representatives?.data || [];
  const updatedList = current.filter(r => r.id !== id);
  inMemoryCache.representatives = { data: updatedList, timestamp: Date.now() };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_representatives', JSON.stringify(updatedList));
    } catch (e) {}
  }
  broadcastAppUpdate('representatives_updated', updatedList);

  const db = getDb();
  if (!db) return { success: true };

  try {
    await deleteDoc(doc(db, 'representatives', id));
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting representative from Firestore:', err);
    return { success: true };
  }
}

export async function toggleRepresentativeStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const current = inMemoryCache.representatives?.data || [];
  const updatedList = current.map(r => r.id === id ? { ...r, isActive } : r);
  inMemoryCache.representatives = { data: updatedList, timestamp: Date.now() };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('stone_expert_representatives', JSON.stringify(updatedList));
    } catch (e) {}
  }
  broadcastAppUpdate('representatives_updated', updatedList);

  const db = getDb();
  if (!db) return { success: true };

  try {
    await updateDoc(doc(db, 'representatives', id), {
      isActive,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error updating representative status:', err);
    return { success: true };
  }
}

// ============================================================================
// REPRESENTATIVE FIELD PORTAL & ISOLATED SITE VISIT JOBS / BILLS
// ============================================================================

export async function getRepresentativeById(id: string): Promise<Representative | null> {
  if (!id || !id.trim()) return null;
  const targetId = id.trim();
  const list = await getRepresentatives();
  const found = list.find(r => r.id === targetId);
  if (found) return ensureRepPortalPin(found);

  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'representatives', targetId));
    if (snap.exists()) {
      const rep = ensureRepPortalPin({ id: snap.id, ...snap.data() } as Representative);
      if (!isLegacyFakeRep(rep)) return rep;
    }
  } catch (err) {
    logFetchError('getRepresentativeById', err);
  }
  return null;
}

export async function verifyRepresentativePin(
  pin: string,
  expectedRepId?: string
): Promise<{ success: boolean; representative?: Representative; error?: string }> {
  const cleanPin = (pin || '').trim().toUpperCase();
  if (!cleanPin) {
    return { success: false, error: 'براہ کرم اپنا نمائندہ پن / پاسورڈ درج کریں۔ (Please enter your Representative PIN.)' };
  }

  // Force refresh representative list from Firestore if possible
  const list = await getRepresentatives();
  const normalizedList = list.map(ensureRepPortalPin);

  if (expectedRepId) {
    const target = normalizedList.find(r => r.id === expectedRepId);
    if (!target) {
      return { success: false, error: 'یہ نمائندہ اکاؤنٹ موجود نہیں ہے۔ (Representative account not found.)' };
    }
    if (!target.isActive) {
      return { success: false, error: 'یہ نمائندہ اکاؤنٹ فی الحال غیر فعال ہے۔ ایڈمن سے رابطہ کریں۔' };
    }
    if ((target.portalPin || '').trim().toUpperCase() !== cleanPin) {
      return { success: false, error: 'غلط پن! یہ پن اس نمائندے کے اکاؤنٹ سے مطابقت نہیں رکھتا۔' };
    }
    return { success: true, representative: target };
  }

  const matched = normalizedList.find(
    r => r.isActive && (r.portalPin || '').trim().toUpperCase() === cleanPin
  );
  if (!matched) {
    return { success: false, error: 'غلط پن یا غیر فعال اکاؤنٹ! درست نمائندہ پن درج کریں۔ (Invalid PIN.)' };
  }
  return { success: true, representative: matched };
}

export function computeSiteMeasurementSection(section: SiteMeasurementSection): SiteMeasurementSection {
  const divisor = section.unit === 'inches' ? 144 : 1;
  const rows: SiteMeasurementRow[] = (section.rows || []).map(row => {
    const w = Number(row.width) || 0;
    const l = Number(row.length) || 0;
    const q = Math.max(0, Number(row.qty) || 0);
    const sqFt = Number(((w * l * q) / divisor).toFixed(2));
    return { ...row, width: w, length: l, qty: q, sqFt };
  });
  const totalSqFt = Number(rows.reduce((sum, r) => sum + r.sqFt, 0).toFixed(2));
  const wastagePercent = Math.max(0, Math.min(50, Number(section.wastagePercent) || 0));
  const finalSqFt = Number((totalSqFt * (1 + wastagePercent / 100)).toFixed(2));
  const ratePerSqFt = Math.max(0, Number(section.ratePerSqFt) || 0);
  const extraCharges = Math.max(0, Number(section.extraCharges) || 0);
  const subtotal = Math.round(finalSqFt * ratePerSqFt + extraCharges);

  return {
    ...section,
    rows,
    totalSqFt,
    wastagePercent,
    finalSqFt,
    ratePerSqFt,
    extraCharges,
    subtotal
  };
}

function getRepJobsCacheKey(representativeId?: string): string {
  return representativeId
    ? `stone_expert_rep_jobs_${representativeId}`
    : 'stone_expert_all_rep_jobs_admin';
}

export async function getRepresentativeJobs(representativeId?: string): Promise<SiteVisitJob[]> {
  const targetRepId = representativeId?.trim() || undefined;
  const cacheKey = getRepJobsCacheKey(targetRepId);

  let localFallback: SiteVisitJob[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localFallback = targetRepId
            ? parsed.filter((j: SiteVisitJob) => j && j.representativeId === targetRepId)
            : parsed.filter((j: SiteVisitJob) => j && j.id);
        }
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) {
    return localFallback.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  try {
    const colRef = collection(db, 'representative_jobs');
    const q = targetRepId
      ? query(colRef, where('representativeId', '==', targetRepId))
      : colRef;
    const snap = await getDocs(q);
    const items: SiteVisitJob[] = [];
    snap.forEach(d => {
      const data = { id: d.id, ...d.data() } as SiteVisitJob;
      // Strict isolation guard: if a specific representativeId was requested, never allow any other rep's job
      if (targetRepId && data.representativeId !== targetRepId) return;
      items.push(data);
    });

    items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(items));
      } catch (e) {}
    }

    return items;
  } catch (err) {
    logFetchError('getRepresentativeJobs', err);
    return localFallback.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
}

export async function saveRepresentativeJob(
  jobInput: Partial<SiteVisitJob>,
  options?: { syncToOrders?: boolean }
): Promise<{ success: boolean; job?: SiteVisitJob; error?: string }> {
  const repId = (jobInput.representativeId || '').trim();
  const customerName = (jobInput.customerName || '').trim();
  const customerPhone = (jobInput.customerPhone || '').trim();

  if (!repId) {
    return { success: false, error: 'Representative ID is required.' };
  }
  if (!customerName || !customerPhone) {
    return { success: false, error: 'کسٹمر کا نام اور فون نمبر لازمی ہیں۔ (Customer name and phone are required.)' };
  }

  const now = new Date().toISOString();
  const jobId = jobInput.id?.trim() || `SITE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const normalizedSections = (jobInput.siteMeasurements || []).map(computeSiteMeasurementSection);
  const grandTotalSqFt = Number(
    normalizedSections.reduce((sum, s) => sum + (s.finalSqFt || 0), 0).toFixed(2)
  );
  const grandTotalPKR = Math.round(
    normalizedSections.reduce((sum, s) => sum + (s.subtotal || 0), 0)
  );

  const linkedOrderId =
    options?.syncToOrders && grandTotalPKR > 0
      ? (jobInput.linkedOrderId || `REP-ORD-${jobId.replace(/^SITE-/, '')}`)
      : jobInput.linkedOrderId;

  const job: SiteVisitJob = {
    id: jobId,
    representativeId: repId,
    representativeName: (jobInput.representativeName || 'Representative').trim(),
    customerName,
    customerPhone,
    customerAddress: (jobInput.customerAddress || '').trim(),
    customerCity: (jobInput.customerCity || '').trim(),
    customerNotes: (jobInput.customerNotes || '').trim(),
    requestedCategories: Array.isArray(jobInput.requestedCategories) ? jobInput.requestedCategories : [],
    preferredVisitDate: jobInput.preferredVisitDate || '',
    status: jobInput.status || (normalizedSections.length > 0 && grandTotalPKR > 0 ? 'quoted' : 'assigned'),
    siteMeasurements: normalizedSections,
    grandTotalSqFt,
    grandTotalPKR,
    ...(typeof jobInput.photoCount === 'number' ? { photoCount: jobInput.photoCount } : {}),
    linkedOrderId,
    createdBy: jobInput.createdBy || 'representative',
    createdAt: jobInput.createdAt || now,
    updatedAt: now
  };

  // Update isolated per-rep cache AND admin cache cleanly without leaking across reps
  if (typeof window !== 'undefined') {
    try {
      const repKey = getRepJobsCacheKey(repId);
      const existingRepJobs: SiteVisitJob[] = JSON.parse(localStorage.getItem(repKey) || '[]');
      const nextRepJobs = [
        job,
        ...existingRepJobs.filter(j => j.id !== job.id && j.representativeId === repId)
      ];
      localStorage.setItem(repKey, JSON.stringify(nextRepJobs));

      const adminKey = getRepJobsCacheKey();
      const existingAdminJobsRaw = localStorage.getItem(adminKey);
      if (existingAdminJobsRaw) {
        const existingAdminJobs: SiteVisitJob[] = JSON.parse(existingAdminJobsRaw);
        const nextAdminJobs = [job, ...existingAdminJobs.filter(j => j.id !== job.id)];
        localStorage.setItem(adminKey, JSON.stringify(nextAdminJobs));
      }
    } catch (e) {}
  }

  broadcastAppUpdate('rep_jobs_updated', { representativeId: repId, jobId: job.id });

  const db = getDb();
  if (!db) {
    return { success: true, job };
  }

  try {
    await setDoc(doc(db, 'representative_jobs', job.id), job, { merge: true });

    // Optional sync to Main Admin Orders collection so it also appears in /dashboard/orders
    if (options?.syncToOrders && linkedOrderId && grandTotalPKR > 0) {
      const materialSummary = Array.from(
        new Set(normalizedSections.map(s => s.materialName).filter(Boolean))
      ).join(', ') || 'On-Site Marble Quote';

      const orderDoc = {
        id: linkedOrderId,
        customerName: job.customerName,
        customerContact: job.customerPhone,
        marbleName: `${materialSummary} (Site Quote)`,
        quantity: grandTotalSqFt,
        totalPrice: grandTotalPKR,
        status: job.status === 'approved' ? 'Confirmed' : 'Pending',
        applicationType: `Representative Site Bill — ${job.representativeName}`,
        date: now,
        calculationDetails: {
          source: 'representative_portal',
          representativeId: job.representativeId,
          representativeName: job.representativeName,
          siteJobId: job.id,
          address: job.customerAddress,
          sections: normalizedSections
        }
      };
      await setDoc(doc(db, 'orders', linkedOrderId), orderDoc, { merge: true });
    }

    return { success: true, job };
  } catch (err: any) {
    logFetchError('saveRepresentativeJob', err);
    return { success: true, job };
  }
}

export async function deleteRepresentativeJob(
  jobId: string,
  representativeId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!jobId) return { success: false, error: 'Missing job ID' };

  if (typeof window !== 'undefined') {
    try {
      if (representativeId) {
        const repKey = getRepJobsCacheKey(representativeId);
        const list: SiteVisitJob[] = JSON.parse(localStorage.getItem(repKey) || '[]');
        localStorage.setItem(repKey, JSON.stringify(list.filter(j => j.id !== jobId)));
      }
      const adminKey = getRepJobsCacheKey();
      const adminRaw = localStorage.getItem(adminKey);
      if (adminRaw) {
        const adminList: SiteVisitJob[] = JSON.parse(adminRaw);
        localStorage.setItem(adminKey, JSON.stringify(adminList.filter(j => j.id !== jobId)));
      }
    } catch (e) {}
  }

  broadcastAppUpdate('rep_jobs_updated', { representativeId, jobId });

  const db = getDb();
  if (!db) return { success: true };

  try {
    await deleteDoc(doc(db, 'representative_jobs', jobId));
    // Also clean up any verification photos associated with this job
    try {
      const photosSnap = await getDocs(query(collection(db, 'site_visit_photos'), where('jobId', '==', jobId)));
      await Promise.all(photosSnap.docs.map(d => deleteDoc(d.ref)));
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getSiteVisitPhotosCacheKey(jobId));
      }
    } catch {}
    return { success: true };
  } catch (err: any) {
    logFetchError('deleteRepresentativeJob', err);
    return { success: true };
  }
}

// ============================================================================
// SITE VISIT MULTI-PHOTO VERIFICATION (stored separately per doc < 1MB)
// ============================================================================

function getSiteVisitPhotosCacheKey(jobId: string) {
  return `stone_expert_site_visit_photos_${jobId}`;
}

export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.6
): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new (window as any).Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function updateCachedJobPhotoCount(jobId: string, representativeId: string | undefined, count: number) {
  if (typeof window === 'undefined') return;
  try {
    if (representativeId) {
      const repKey = getRepJobsCacheKey(representativeId);
      const repList: SiteVisitJob[] = JSON.parse(localStorage.getItem(repKey) || '[]');
      if (Array.isArray(repList) && repList.length > 0) {
        localStorage.setItem(
          repKey,
          JSON.stringify(repList.map(j => (j.id === jobId ? { ...j, photoCount: count } : j)))
        );
      }
    }
    const adminKey = getRepJobsCacheKey();
    const adminRaw = localStorage.getItem(adminKey);
    if (adminRaw) {
      const adminList: SiteVisitJob[] = JSON.parse(adminRaw);
      if (Array.isArray(adminList)) {
        localStorage.setItem(
          adminKey,
          JSON.stringify(adminList.map(j => (j.id === jobId ? { ...j, photoCount: count } : j)))
        );
      }
    }
  } catch {}
}

export async function getSiteVisitPhotos(
  jobId: string,
  representativeId?: string
): Promise<SiteVisitPhoto[]> {
  const targetJobId = (jobId || '').trim();
  if (!targetJobId) return [];

  const cacheKey = getSiteVisitPhotosCacheKey(targetJobId);
  let localFallback: SiteVisitPhoto[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localFallback = parsed.filter(
            (p: SiteVisitPhoto) =>
              p && p.id && p.jobId === targetJobId && (!representativeId || p.representativeId === representativeId)
          );
        }
      }
    } catch {}
  }

  const db = getDb();
  if (!db) {
    return localFallback.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || ''));
  }

  try {
    const q = query(collection(db, 'site_visit_photos'), where('jobId', '==', targetJobId));
    const snap = await getDocs(q);
    const items: SiteVisitPhoto[] = [];
    snap.forEach(d => {
      const data = { id: d.id, ...d.data() } as SiteVisitPhoto;
      if (representativeId && data.representativeId !== representativeId) return;
      items.push(data);
    });

    items.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || ''));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(items));
      } catch {}
    }

    return items;
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, `site_visit_photos (jobId=${targetJobId})`);
    }
    logFetchError('getSiteVisitPhotos', err);
    return localFallback.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || ''));
  }
}

export async function addSiteVisitPhotos(
  photosInput: Array<{
    jobId: string;
    representativeId: string;
    representativeName?: string;
    category: SiteVisitPhotoCategory;
    caption?: string;
    imageUrl: string;
    capturedAt?: string;
    uploadedBy?: 'representative' | 'admin';
  }>
): Promise<{ success: boolean; photos?: SiteVisitPhoto[]; totalCount?: number; error?: string }> {
  if (!Array.isArray(photosInput) || photosInput.length === 0) {
    return { success: false, error: 'کوئی تصویر منتخب نہیں کی گئی۔' };
  }

  const targetJobId = (photosInput[0]?.jobId || '').trim();
  const targetRepId = (photosInput[0]?.representativeId || '').trim();
  if (!targetJobId || !targetRepId) {
    return { success: false, error: 'Missing Site Visit Job or Representative ID.' };
  }

  const now = Date.now();
  const createdPhotos: SiteVisitPhoto[] = photosInput.map((item, idx) => ({
    id: `SVP-${now}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    jobId: item.jobId.trim(),
    representativeId: item.representativeId.trim(),
    representativeName: (item.representativeName || '').trim(),
    category: item.category || 'site-overview',
    caption: (item.caption || '').trim().slice(0, 240),
    imageUrl: item.imageUrl,
    capturedAt: item.capturedAt || new Date(now + idx).toISOString(),
    uploadedBy: item.uploadedBy || 'representative'
  }));

  let existingCachedCount = 0;
  if (typeof window !== 'undefined') {
    try {
      const cacheKey = getSiteVisitPhotosCacheKey(targetJobId);
      const existingRaw = localStorage.getItem(cacheKey);
      const existing: SiteVisitPhoto[] = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = [...createdPhotos, ...existing.filter(p => !createdPhotos.some(c => c.id === p.id))];
      existingCachedCount = merged.length;
      localStorage.setItem(cacheKey, JSON.stringify(merged));
    } catch {}
  }

  const db = getDb();
  if (!db) {
    updateCachedJobPhotoCount(targetJobId, targetRepId, existingCachedCount || createdPhotos.length);
    broadcastAppUpdate('rep_jobs_updated', { jobId: targetJobId, representativeId: targetRepId });
    return { success: true, photos: createdPhotos, totalCount: existingCachedCount || createdPhotos.length };
  }

  try {
    await Promise.all(createdPhotos.map(photo => setDoc(doc(db, 'site_visit_photos', photo.id), photo)));

    // Sync accurate photoCount onto the parent job document for quick billing audit overview
    let totalCount = existingCachedCount || createdPhotos.length;
    try {
      const snap = await getDocs(query(collection(db, 'site_visit_photos'), where('jobId', '==', targetJobId)));
      totalCount = snap.size;
      await setDoc(
        doc(db, 'representative_jobs', targetJobId),
        { photoCount: totalCount, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}

    updateCachedJobPhotoCount(targetJobId, targetRepId, totalCount);
    broadcastAppUpdate('rep_jobs_updated', { jobId: targetJobId, representativeId: targetRepId });
    return { success: true, photos: createdPhotos, totalCount };
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, `site_visit_photos`);
    }
    logFetchError('addSiteVisitPhotos', err);
    return {
      success: false,
      error: err?.message || 'تصاویر محفوظ کرنے میں خرابی پیش آئی۔'
    };
  }
}

export async function updateSiteVisitPhotoMeta(
  photoId: string,
  jobId: string,
  patch: { category?: SiteVisitPhotoCategory; caption?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!photoId || !jobId) return { success: false, error: 'Missing photo ID' };

  const cleanPatch: Partial<SiteVisitPhoto> = {};
  if (patch.category) cleanPatch.category = patch.category;
  if (typeof patch.caption === 'string') cleanPatch.caption = patch.caption.trim().slice(0, 240);

  if (typeof window !== 'undefined') {
    try {
      const cacheKey = getSiteVisitPhotosCacheKey(jobId);
      const list: SiteVisitPhoto[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(
        cacheKey,
        JSON.stringify(list.map(p => (p.id === photoId ? { ...p, ...cleanPatch } : p)))
      );
    } catch {}
  }

  const db = getDb();
  if (!db) return { success: true };

  try {
    await updateDoc(doc(db, 'site_visit_photos', photoId), cleanPatch as any);
    broadcastAppUpdate('rep_jobs_updated', { jobId });
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.UPDATE, `site_visit_photos/${photoId}`);
    }
    logFetchError('updateSiteVisitPhotoMeta', err);
    return { success: true };
  }
}

export async function deleteSiteVisitPhoto(
  photoId: string,
  jobId: string,
  representativeId?: string
): Promise<{ success: boolean; totalCount?: number; error?: string }> {
  if (!photoId || !jobId) return { success: false, error: 'Missing photo ID' };

  let remainingCount = 0;
  if (typeof window !== 'undefined') {
    try {
      const cacheKey = getSiteVisitPhotosCacheKey(jobId);
      const list: SiteVisitPhoto[] = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const next = list.filter(p => p.id !== photoId);
      remainingCount = next.length;
      localStorage.setItem(cacheKey, JSON.stringify(next));
    } catch {}
  }

  const db = getDb();
  if (!db) {
    updateCachedJobPhotoCount(jobId, representativeId, remainingCount);
    broadcastAppUpdate('rep_jobs_updated', { jobId, representativeId });
    return { success: true, totalCount: remainingCount };
  }

  try {
    await deleteDoc(doc(db, 'site_visit_photos', photoId));
    try {
      const snap = await getDocs(query(collection(db, 'site_visit_photos'), where('jobId', '==', jobId)));
      remainingCount = snap.size;
      await setDoc(
        doc(db, 'representative_jobs', jobId),
        { photoCount: remainingCount, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
    updateCachedJobPhotoCount(jobId, representativeId, remainingCount);
    broadcastAppUpdate('rep_jobs_updated', { jobId, representativeId });
    return { success: true, totalCount: remainingCount };
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.DELETE, `site_visit_photos/${photoId}`);
    }
    logFetchError('deleteSiteVisitPhoto', err);
    return { success: false, error: err?.message || 'Failed to delete photo' };
  }
}

// ============================================================================
// SUPPLIER RATE CELL MULTI-PHOTO GALLERY (stored separately to stay under 1MB)
// ============================================================================

export interface SupplierRatePhoto {
  id: string;
  supplierId: string;
  supplierName: string;
  materialId?: string;
  baseName: string;
  sizeSlot: string;
  thickness?: string;
  imageUrl: string;
  uploadedBy: 'supplier' | 'admin';
  createdAt: string;
}

export async function getSupplierRatePhotos(supplierId: string): Promise<SupplierRatePhoto[]> {
  if (!supplierId) return [];
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'supplier_rate_photos'),
      where('supplierId', '==', supplierId)
    );
    const snap = await withFastTimeout(getDocs(q), 5000);
    const list: SupplierRatePhoto[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Omit<SupplierRatePhoto, 'id'>;
      list.push({ id: docSnap.id, ...data });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (err) {
    logFetchError('Error fetching supplier rate photos', err);
    return [];
  }
}

export async function addSupplierRatePhoto(data: {
  supplierId: string;
  supplierName: string;
  materialId?: string;
  baseName: string;
  sizeSlot: string;
  thickness?: string;
  imageUrl: string;
  uploadedBy: 'supplier' | 'admin';
}): Promise<{ success: boolean; photo?: SupplierRatePhoto; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    const id = `srp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const photo: SupplierRatePhoto = {
      id,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      materialId: data.materialId || '',
      baseName: data.baseName.trim(),
      sizeSlot: data.sizeSlot,
      ...(data.thickness ? { thickness: data.thickness } : {}),
      imageUrl: data.imageUrl,
      uploadedBy: data.uploadedBy,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'supplier_rate_photos', id), photo);
    return { success: true, photo };
  } catch (err: any) {
    console.error('Error saving supplier rate photo:', err);
    return { success: false, error: err?.message || 'Failed to upload photo' };
  }
}

export async function deleteSupplierRatePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    await deleteDoc(doc(db, 'supplier_rate_photos', photoId));
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting supplier rate photo:', err);
    return { success: false, error: err?.message || 'Failed to delete photo' };
  }
}

/**
 * Allows Admin to optionally apply any supplier-uploaded material photo directly
 * to the matching Marble product in the live storefront (either as main image or in gallery).
 */
export async function applySupplierPhotoToAppProduct(
  baseName: string,
  imageUrl: string,
  mode: 'main' | 'gallery'
): Promise<{ success: boolean; marbleName?: string; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    const cleanTarget = (baseName || '').trim().toLowerCase();
    if (!cleanTarget) return { success: false, error: 'Material name is empty' };

    const allMarbles = await getMarbles();
    let matched = allMarbles.find(m => (m.name || '').trim().toLowerCase() === cleanTarget);
    if (!matched) {
      matched = allMarbles.find(m => {
        const mName = (m.name || '').trim().toLowerCase();
        return mName.includes(cleanTarget) || cleanTarget.includes(mName);
      });
    }

    if (!matched) {
      return {
        success: false,
        error: `ایپ میں "${baseName}" کے نام سے کوئی پروڈکٹ نہیں ملا۔ پہلے یہ پروڈکٹ ایپ میں شامل کریں یا اسے پورٹل میں محفوظ رہنے دیں۔`
      };
    }

    if (mode === 'main') {
      const existingGallery = Array.isArray(matched.gallery) ? [...matched.gallery] : [];
      if (matched.imageUrl && !existingGallery.includes(matched.imageUrl)) {
        existingGallery.unshift(matched.imageUrl);
      }
      await updateMarbleDetails(matched.id, {
        imageUrl,
        gallery: existingGallery
      });
    } else {
      const existingGallery = Array.isArray(matched.gallery) ? [...matched.gallery] : [];
      if (!existingGallery.includes(imageUrl)) {
        existingGallery.push(imageUrl);
      }
      await updateMarbleDetails(matched.id, {
        gallery: existingGallery
      });
    }

    return { success: true, marbleName: matched.name };
  } catch (err: any) {
    console.error('Error applying supplier photo to app product:', err);
    return { success: false, error: err?.message || 'Failed to apply photo to app product' };
  }
}

// ============================================================================
// PARTNER WITH US / BECOME A SUPPLIER APPLICATIONS
// ============================================================================

export interface SupplierApplication {
  id: string;
  factoryName: string;
  contactPerson: string;
  phone: string;
  city: string;
  address: string;
  categories: string[];
  factoryImageUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedSupplierId?: string;
  issuedPin?: string;
}

export async function submitSupplierApplication(data: {
  factoryName: string;
  contactPerson: string;
  phone: string;
  city: string;
  address: string;
  categories: string[];
  factoryImageUrl?: string;
  notes?: string;
}): Promise<{ success: boolean; application?: SupplierApplication; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    if (!data.factoryName.trim() || !data.phone.trim()) {
      return { success: false, error: 'فیکٹری کا نام اور فون نمبر درج کرنا ضروری ہے۔' };
    }
    const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const application: SupplierApplication = {
      id,
      factoryName: data.factoryName.trim(),
      contactPerson: data.contactPerson.trim(),
      phone: data.phone.trim(),
      city: data.city.trim(),
      address: data.address.trim(),
      categories: data.categories.length > 0 ? data.categories : ['Marble', 'Granite'],
      factoryImageUrl: data.factoryImageUrl || '',
      notes: data.notes?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'supplier_applications', id), application);
    return { success: true, application };
  } catch (err: any) {
    console.error('Error submitting supplier application:', err);
    return { success: false, error: err?.message || 'درخواست بھیجنے میں مسئلہ پیش آیا۔' };
  }
}

export async function getSupplierApplications(): Promise<SupplierApplication[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await withFastTimeout(getDocs(collection(db, 'supplier_applications')), 5000);
    const list: SupplierApplication[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Omit<SupplierApplication, 'id'>;
      list.push({ id: docSnap.id, ...data });
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (err) {
    logFetchError('Error loading supplier applications', err);
    return [];
  }
}

export async function approveSupplierApplication(
  applicationId: string,
  customPin?: string
): Promise<{ success: boolean; supplier?: Supplier; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    const appSnap = await getDoc(doc(db, 'supplier_applications', applicationId));
    if (!appSnap.exists()) {
      return { success: false, error: 'Application not found' };
    }
    const appData = appSnap.data() as SupplierApplication;
    const fullAddress = [appData.address, appData.city].filter(Boolean).join(', ');

    const createRes = await createQuickSupplier({
      name: appData.factoryName,
      phone: appData.phone,
      contactPerson: appData.contactPerson,
      address: fullAddress,
      accessPassword: customPin?.trim() || undefined,
      allowedCategories: appData.categories && appData.categories.length > 0 ? appData.categories : ['Marble', 'Granite']
    });

    if (!createRes.success || !createRes.supplier) {
      return { success: false, error: createRes.error || 'Failed to create supplier account' };
    }

    const enrichedSupplier: Supplier = {
      ...createRes.supplier,
      factoryImageUrl: appData.factoryImageUrl || '',
      profileCompleted: true
    };
    await saveSupplier(enrichedSupplier);

    await updateDoc(doc(db, 'supplier_applications', applicationId), {
      status: 'approved',
      approvedSupplierId: enrichedSupplier.id,
      issuedPin: enrichedSupplier.accessPassword || '',
      updatedAt: new Date().toISOString()
    });

    return { success: true, supplier: enrichedSupplier };
  } catch (err: any) {
    console.error('Error approving supplier application:', err);
    return { success: false, error: err?.message || 'Approval failed' };
  }
}

export async function rejectSupplierApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    await updateDoc(doc(db, 'supplier_applications', applicationId), {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error rejecting supplier application:', err);
    return { success: false, error: err?.message || 'Rejection failed' };
  }
}

// ============================================================================
// PRODUCT PRICE HISTORY LEDGER (Manage Stock Sparkline Chart)
// ============================================================================

const PRICE_HISTORY_STORAGE_KEY = 'stone_expert_price_history_v1';

function readLocalPriceHistory(): PriceHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPriceHistory(entries: PriceHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = entries.slice(-1500);
    localStorage.setItem(PRICE_HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function recordProductPriceHistory(input: {
  rowId: string;
  productId: string;
  variantId?: string;
  productName: string;
  productType: 'marble' | 'fixing_material';
  previousPrice: number | null;
  newPrice: number;
  source?: 'manual' | 'bulk' | 'supplier_markup' | 'initial';
  note?: string;
  recordedAt?: string;
}): Promise<{ success: boolean; entry?: PriceHistoryEntry; error?: string }> {
  const newPriceNum = Number(input.newPrice);
  if (!input.rowId || !input.productId || Number.isNaN(newPriceNum) || newPriceNum < 0) {
    return { success: false, error: 'Invalid price history payload.' };
  }

  const entry: PriceHistoryEntry = {
    id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    rowId: input.rowId,
    productId: input.productId,
    variantId: input.variantId || undefined,
    productName: input.productName || 'Product',
    productType: input.productType,
    previousPrice:
      typeof input.previousPrice === 'number' && !Number.isNaN(input.previousPrice)
        ? input.previousPrice
        : null,
    newPrice: newPriceNum,
    source: input.source || 'manual',
    note: input.note || undefined,
    recordedAt: input.recordedAt || new Date().toISOString()
  };

  const local = readLocalPriceHistory();
  writeLocalPriceHistory([...local.filter(e => e.id !== entry.id), entry]);

  const db = getDb();
  if (!db) {
    return { success: true, entry };
  }

  try {
    const firestorePayload: Record<string, any> = {
      id: entry.id,
      rowId: entry.rowId,
      productId: entry.productId,
      productName: entry.productName,
      productType: entry.productType,
      previousPrice: entry.previousPrice,
      newPrice: entry.newPrice,
      source: entry.source,
      recordedAt: entry.recordedAt
    };
    if (entry.variantId) firestorePayload.variantId = entry.variantId;
    if (entry.note) firestorePayload.note = entry.note;

    await setDoc(doc(db, 'price_history', entry.id), firestorePayload);
    return { success: true, entry };
  } catch (err: any) {
    logFetchError('recordProductPriceHistory', err);
    return { success: true, entry };
  }
}

export async function getProductPriceHistory(
  rowId: string,
  productId?: string
): Promise<PriceHistoryEntry[]> {
  if (!rowId) return [];

  const localMatches = readLocalPriceHistory().filter(
    e => e && (e.rowId === rowId || (!e.variantId && productId && e.productId === productId && e.rowId === productId))
  );

  const db = getDb();
  if (!db) {
    return localMatches.sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || ''));
  }

  try {
    const colRef = collection(db, 'price_history');
    const q = query(colRef, where('rowId', '==', rowId));
    const snap = await withFastTimeout(getDocs(q), 5000);
    const byId = new Map<string, PriceHistoryEntry>();

    localMatches.forEach(item => {
      byId.set(item.id, item);
    });

    snap.forEach(d => {
      const data = { id: d.id, ...d.data() } as PriceHistoryEntry;
      if (data && typeof data.newPrice === 'number') {
        byId.set(data.id, data);
      }
    });

    const merged = Array.from(byId.values()).sort((a, b) =>
      (a.recordedAt || '').localeCompare(b.recordedAt || '')
    );

    if (merged.length > 0) {
      const others = readLocalPriceHistory().filter(e => e.rowId !== rowId);
      writeLocalPriceHistory([...others, ...merged]);
    }

    return merged;
  } catch (err) {
    logFetchError('getProductPriceHistory', err);
    return localMatches.sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || ''));
  }
}

let warmupPromise: Promise<void> | null = null;

/**
 * Single upfront data warmup triggered right after app load.
 * Fetches & caches all public catalog, rate, representative, and configuration
 * datasets once in parallel so every subsequent page & AI lookup renders at 0ms.
 */
export async function warmupAllAppData(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = Promise.allSettled([
    getMarbles(),
    getFixingMaterials(),
    getServiceProviders(),
    getHomepageConfig(),
    getHomepageContent(),
    getPartnerCompanies(),
    getDailyRates(),
    getCostsConfig(),
    getRepresentatives(),
    getBuildYourHomeRatesConfig(),
    getRenovationRatesConfig(),
  ])
    .then(() => undefined)
    .finally(() => {
      // Allow re-warming if explicitly triggered after 5 minutes
      setTimeout(() => {
        warmupPromise = null;
      }, CACHE_TTL_MS);
    });

  return warmupPromise;
}

