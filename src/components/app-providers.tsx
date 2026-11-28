'use client';

import React from 'react';
import { FirebaseClientProvider } from '@/firebase/provider';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { AdminBackgroundProvider } from '@/context/admin-background-context';
import { PwaProvider } from '@/components/pwa-provider';
import { OrderSummaryProvider } from '@/context/order-summary-context';
import { CalculationProvider } from '@/context/calculation-context';
import { FullscreenImageProvider } from '@/context/fullscreen-image-context';
import { AppBackground } from '@/components/app-background';
import dynamic from 'next/dynamic';
import { Toaster } from '@/components/ui/toaster';
import { SharedDomainRedirect } from '@/components/shared-domain-redirect';

const GeminiLiveConcierge = dynamic(
  () => import('@/components/gemini-live-concierge').then((m) => m.GeminiLiveConcierge),
  { ssr: false }
);

const AppPreloader = dynamic(
  () => import('@/components/app-preloader').then((m) => m.AppPreloader),
  { ssr: false }
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AdminBackgroundProvider>
            <PwaProvider>
              <OrderSummaryProvider>
                <CalculationProvider>
                  <FullscreenImageProvider>
                    <SharedDomainRedirect />
                    <AppBackground />
                    <AppPreloader />
                    {children}
                    <GeminiLiveConcierge />
                    <Toaster />
                  </FullscreenImageProvider>
                </CalculationProvider>
              </OrderSummaryProvider>
            </PwaProvider>
          </AdminBackgroundProvider>
        </ThemeProvider>
      </LanguageProvider>
    </FirebaseClientProvider>
  );
}
