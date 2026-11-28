'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/theme-context';
import { useAdminBackground } from '@/context/admin-background-context';

export function AppBackground() {
  const { theme, hydrated } = useTheme();
  const [imgError, setImgError] = useState(false);

  // Safe access to context
  let bgConfig = {
    imageUrl: '',
    highlight: 100,
    blur: 4,
    opacity: 25,
    contrast: 105
  };
  let isBgHydrated = false;

  try {
    const ctx = useAdminBackground();
    if (ctx) {
      isBgHydrated = ctx.hydrated;
      if (ctx.hydrated && ctx.config) {
        bgConfig = ctx.config;
      }
    }
  } catch (e) {
    // Context might not be wrapped in some isolated components
  }

  // Lightweight marble processing factory image for fast loading and smooth scrolling
  const defaultFactoryUrl = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1080&q=65';
  const fallbackFactoryUrl = 'https://picsum.photos/seed/marblefactory/1080/608?blur=1';

  // Strictly use defaultFactoryUrl and default filters until hydrated to guarantee identical SSR output
  const activeImageUrl = (isBgHydrated && bgConfig.imageUrl && bgConfig.imageUrl.trim() !== '') 
    ? bgConfig.imageUrl 
    : defaultFactoryUrl;
  const isLight = hydrated && theme === 'light';

  const highlightVal = isBgHydrated && typeof bgConfig.highlight === 'number' ? bgConfig.highlight : 100;
  const blurVal = isBgHydrated && typeof bgConfig.blur === 'number' ? Math.min(bgConfig.blur, 4) : 3;
  const opacityVal = isBgHydrated && typeof bgConfig.opacity === 'number' ? bgConfig.opacity : 25;
  const contrastVal = isBgHydrated && typeof bgConfig.contrast === 'number' ? bgConfig.contrast : 105;

  return (
    <div 
      aria-hidden="true" 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none print:hidden"
    >
      {/* Background Marble Factory Photo with Dynamic Volume & Filters */}
      <img
        src={imgError ? fallbackFactoryUrl : activeImageUrl}
        alt="Marble Factory and Stone Processing Plant"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        suppressHydrationWarning
        style={{
          filter: `blur(${blurVal}px) brightness(${highlightVal}%) contrast(${contrastVal}%)`,
          opacity: opacityVal / 100,
          transform: `scale(${blurVal > 0 ? 1.04 : 1})`,
        }}
        className="w-full h-full object-cover object-center transition-opacity duration-300 ease-out"
      />

      {/* Theme-Adaptive Ambient Overlay Gradients */}
      <div 
        className={`absolute inset-0 transition-colors duration-500 ${
          isLight
            ? 'bg-gradient-to-b from-[#faf8f5]/85 via-[#f5f1ea]/75 to-[#fdfcfa]/85'
            : 'bg-gradient-to-b from-slate-950/85 via-stone-950/80 to-slate-950/90'
        }`} 
      />

      {/* Subtle Warm Industrial Lighting Accent */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isLight 
            ? 'bg-radial from-amber-500/5 via-transparent to-transparent opacity-60' 
            : 'bg-radial from-amber-500/10 via-transparent to-transparent opacity-40'
        }`} 
      />
    </div>
  );
}
