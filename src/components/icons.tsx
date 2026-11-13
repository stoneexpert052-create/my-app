'use client';

import React, { ImgHTMLAttributes, useState } from 'react';

function LogoComponent({ alt = "Stone Expert Logo", src, className, onError, ...props }: ImgHTMLAttributes<HTMLImageElement> & { [key: string]: any }) {
  const [hasError, setHasError] = useState(false);
  const logoSrc = src && src.trim() !== '' ? src : '/logo.svg';

  if (hasError) {
    return (
      <span className={`inline-flex items-center justify-center font-extrabold text-amber-500 bg-slate-900 rounded-lg border border-amber-500/30 text-[10px] px-2 py-1 shrink-0 uppercase tracking-widest ${className || ''}`}>
        STONE EXPERT
      </span>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (!hasError) {
          const target = e.currentTarget as HTMLImageElement;
          if (logoSrc !== '/logo.svg' && target.src.indexOf('/logo.svg') === -1) {
            target.src = '/logo.svg';
          } else if (target.src.indexOf('/logo.png') === -1) {
            target.src = '/logo.png';
          } else {
            setHasError(true);
          }
        }
        if (onError) onError(e);
      }}
      {...props}
    />
  );
}

export const Icons = {
  logo: LogoComponent,
};

