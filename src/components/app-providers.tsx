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
import { Toaster } from '@/components/ui/toaster';

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
                    <AppBackground />
                    {children}
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
