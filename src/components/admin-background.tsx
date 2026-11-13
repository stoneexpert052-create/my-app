'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/theme-context';
import { useAdminBackground } from '@/context/admin-background-context';

export function AdminBackground() {
  const { theme, hydrated } = useTheme();
  const { config, hydrated: bgHydrated } = useAdminBackground();
  const [imgError, setImgError] = useState(false);

  // Default authentic high-resolution marble factory image
  const defaultFactoryUrl = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=2560&q=85';
  const fallbackUrl = 'https://picsum.photos/seed/marblefactory/1920/1080?blur=1';

  // Strictly use defaultFactoryUrl and default filters until hydrated to guarantee identical SSR output
  const activeImageUrl = (bgHydrated && config.imageUrl && config.imageUrl.trim() !== '') 
    ? config.imageUrl 
    : defaultFactoryUrl;
  const isLight = hydrated && theme === 'light';

  // Extract calibrated properties
  const highlightVal = bgHydrated && typeof config.highlight === 'number' ? config.highlight : 100;
  const blurVal = bgHydrated && typeof config.blur === 'number' ? config.blur : 4;
  const opacityVal = bgHydrated && typeof config.opacity === 'number' ? config.opacity : 25;
  const contrastVal = bgHydrated && typeof config.contrast === 'number' ? config.contrast : 105;

  return (
    <div 
      aria-hidden="true" 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none print:hidden"
    >
      {/* Background Image with Dynamic Filter & Volume Adjustments */}
      <img
        src={imgError ? fallbackUrl : activeImageUrl}
        alt="Marble Factory Admin Background"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        suppressHydrationWarning
        style={{
          filter: `blur(${blurVal}px) brightness(${highlightVal}%) contrast(${contrastVal}%)`,
          opacity: opacityVal / 100,
          transform: `scale(${blurVal > 0 ? 1.05 + (blurVal * 0.003) : 1})`,
        }}
        className="w-full h-full object-cover object-center transition-all duration-300 ease-out"
      />

      {/* Theme-Adaptive Ambient Overlay Gradients */}
      <div 
        className={`absolute inset-0 transition-colors duration-500 ${
          isLight
            ? 'bg-gradient-to-b from-[#faf8f5]/85 via-[#f5f1ea]/75 to-[#fdfcfa]/85'
            : 'bg-gradient-to-b from-slate-950/85 via-stone-950/80 to-slate-950/90'
        }`} 
      />

      {/* Subtle Warm Industrial Ambient Accent */}
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
