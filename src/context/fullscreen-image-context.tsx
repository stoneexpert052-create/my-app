'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface FullscreenImageContextType {
  openImage: (url: string, alt?: string) => void;
  closeImage: () => void;
}

const FullscreenImageContext = createContext<FullscreenImageContextType | undefined>(undefined);

export function FullscreenImageProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const openImage = (url: string, alt?: string) => {
    setImageUrl(url);
    setImageAlt(alt || 'Material Preview');
    setScale(1);
    setRotate(0);
    setIsOpen(true);
  };

  const closeImage = () => {
    setIsOpen(false);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImage();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotate(prev => (prev + 90) % 360);
  };

  return (
    <FullscreenImageContext.Provider value={{ openImage, closeImage }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8"
            onClick={closeImage}
          >
            {/* Header/Controls bar */}
            <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
              <span className="text-white/80 font-headline text-sm md:text-base font-semibold drop-shadow-md truncate max-w-[60%] bg-black/40 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
                {imageAlt}
              </span>
              <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-xs p-1.5 rounded-lg border border-white/10">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <div className="w-[1px] h-4 bg-white/20 mx-1" />
                <button
                  onClick={closeImage}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>

            {/* Main Image Container */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center pointer-events-none"
            >
              <div 
                className="relative w-full h-full pointer-events-auto transition-transform duration-200"
                style={{ 
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                }}
              >
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-contain select-none"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>

            {/* Instruction tooltip */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/60 tracking-wider font-medium pointer-events-none bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
              Click anywhere to dismiss • ESC to exit
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FullscreenImageContext.Provider>
  );
}

export function useFullscreenImage() {
  const context = useContext(FullscreenImageContext);
  if (context === undefined) {
    throw new Error('useFullscreenImage must be used within a FullscreenImageProvider');
  }
  return context;
}
