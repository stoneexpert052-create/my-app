'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { warmupAllAppData } from '@/lib/admin-actions';
import { getClientInstantMarbles } from '@/lib/instant-catalog';
import { getSeoImageUrl } from '@/lib/seo';

const PRODUCTION_PUBLIC_ROUTES = [
  '/',
  '/products',
  '/services',
  '/build-your-home',
  '/renovation',
  '/representatives',
  '/track-order',
  '/order/general-supplies-order',
  '/product-detail/mdm-classic-composite',
  '/brochure',
  '/contact',
];

const DEV_PRIORITY_ROUTES = [
  '/products',
  '/order/general-supplies-order',
];

export function AppPreloader() {
  const router = useRouter();
  const pathname = usePathname();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (typeof window === 'undefined') return;
    if (pathname?.startsWith('/dashboard')) return;

    startedRef.current = true;
    let cancelled = false;

    const runWarmup = async () => {
      if (cancelled) return;

      // 1. Single upfront batch: preload all catalog, pricing, rep & config data into RAM + localStorage
      warmupAllAppData().catch(() => {});

      // 2. Ask active Service Worker to cache primary product thumbnails locally
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          const topImageUrls = getClientInstantMarbles()
            .slice(0, 16)
            .map((m) => (m.imageUrl ? getSeoImageUrl(m.imageUrl, m.name, { productId: m.id }) : ''))
            .filter(Boolean);
          if (topImageUrls.length > 0) {
            navigator.serviceWorker.controller.postMessage({
              type: 'WARM_URLS',
              urls: topImageUrls,
            });
          }
        } catch {
          // Non-critical warmup failure
        }
      }

      // 3. Prefetch App Router routes:
      //    - In production, routes are prebuilt so prefetching all core routes is instantaneous.
      //    - In dev preview, stagger only the top 2 routes gently so on-demand compilation stays fast & light.
      const isProd = process.env.NODE_ENV === 'production';
      const routesToPrefetch = isProd ? PRODUCTION_PUBLIC_ROUTES : DEV_PRIORITY_ROUTES;
      const initialDelay = isProd ? 100 : 2500;
      const stepDelay = isProd ? 160 : 1500;

      await new Promise((resolve) => setTimeout(resolve, initialDelay));

      for (let i = 0; i < routesToPrefetch.length; i++) {
        if (cancelled) return;
        const route = routesToPrefetch[i];
        if (route !== pathname) {
          try {
            router.prefetch(route);
          } catch {
            // Ignore transient prefetch errors
          }
        }
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(() => {
        runWarmup();
      }, { timeout: 900 });
      return () => {
        cancelled = true;
        if (typeof win.cancelIdleCallback === 'function') {
          win.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = setTimeout(() => {
      runWarmup();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, router]);

  return null;
}
