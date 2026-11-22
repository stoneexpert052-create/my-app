'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface LightboxImage {
  url: string;
  alt?: string;
  caption?: string;
}

export function buildProductGallery(
  primaryUrl: string | undefined,
  productName: string,
  gallery?: Array<{ url?: string; altText?: string; label?: string }>
): LightboxImage[] {
  const items: LightboxImage[] = [];
  const seen = new Set<string>();

  const pushItem = (url: string | undefined, alt?: string, caption?: string) => {
    const cleaned = url?.trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    items.push({
      url: cleaned,
      alt: alt || productName,
      caption,
    });
  };

  pushItem(primaryUrl, productName, productName);

  if (Array.isArray(gallery)) {
    gallery.forEach((img, index) => {
      const caption = img.altText?.trim() || img.label?.trim() || `${productName} — View ${index + 2}`;
      pushItem(img.url, caption, caption);
    });
  }

  return items;
}

interface FullscreenImageContextType {
  openImage: (url: string, alt?: string) => void;
  openGallery: (images: LightboxImage[], startIndex?: number) => void;
  closeImage: () => void;
}

const FullscreenImageContext = createContext<FullscreenImageContextType | undefined>(undefined);

export function FullscreenImageProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const openImage = useCallback((url: string, alt?: string) => {
    const cleaned = url?.trim();
    if (!cleaned) return;
    setImages([{ url: cleaned, alt: alt || 'Material Preview', caption: alt }]);
    setCurrentIndex(0);
    setScale(1);
    setRotate(0);
    setIsOpen(true);
  }, []);

  const openGallery = useCallback((galleryImages: LightboxImage[], startIndex = 0) => {
    const validImages = galleryImages.filter((img) => img && img.url && img.url.trim() !== '');
    if (validImages.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, validImages.length - 1));
    setImages(validImages);
    setCurrentIndex(safeIndex);
    setScale(1);
    setRotate(0);
    setIsOpen(true);
  }, []);

  const closeImage = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
    setRotate(0);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
    setRotate(0);
  }, [images.length]);

  const selectIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setScale(1);
    setRotate(0);
  }, []);

  const resetTransform = useCallback(() => {
    setScale(1);
    setRotate(0);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImage();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeImage, goToNext, goToPrev, resetTransform]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotate((prev) => (prev + 90) % 360);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetTransform();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => (prev > 1 ? 1 : 1.75));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || scale > 1 || images.length <= 1) {
      touchStartX.current = null;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  return (
    <FullscreenImageContext.Provider value={{ openImage, openGallery, closeImage }}>
      {children}
      <AnimatePresence>
        {isOpen && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-3 sm:p-6"
            onClick={closeImage}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label={currentImage.alt || 'Image Lightbox'}
          >
            {/* Header / Controls bar */}
            <div className="w-full max-w-6xl z-50 flex items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
                {hasMultiple && (
                  <span className="shrink-0 text-xs font-bold text-white bg-primary/80 px-2.5 py-1 rounded-md shadow-sm tabular-nums">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
                <span className="text-white/90 font-headline text-sm md:text-base font-semibold drop-shadow-md truncate bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
                  {currentImage.caption || currentImage.alt || 'Material Preview'}
                </span>
              </div>

              <div
                className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto bg-black/60 backdrop-blur-xs p-1.5 rounded-xl border border-white/15 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                  title="Zoom Out (-)"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs font-semibold text-white/85 hover:text-white hover:bg-white/15 rounded-lg transition-colors tabular-nums hidden sm:inline-flex"
                  title="Reset Zoom (0)"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                  title="Zoom In (+)"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                  title="Rotate 90°"
                  aria-label="Rotate image"
                >
                  <RotateCw className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {(scale !== 1 || rotate !== 0) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-white/85 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                    title="Reset View"
                    aria-label="Reset view"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                )}
                <div className="w-[1px] h-5 bg-white/20 mx-1" />
                <button
                  type="button"
                  onClick={closeImage}
                  className="p-1.5 text-white/85 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors"
                  title="Close (ESC)"
                  aria-label="Close lightbox"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>

            {/* Main Lightbox Stage with Prev / Next Navigation */}
            <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center my-2 sm:my-4 min-h-0">
              {hasMultiple && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className="absolute left-1 sm:left-3 z-40 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/65 text-white border border-white/15 hover:bg-white/20 hover:scale-105 transition-all shadow-xl backdrop-blur-sm"
                  title="Previous Image (←)"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              <motion.div
                key={`${currentImage.url}-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="relative w-full h-full max-w-5xl max-h-[72vh] flex items-center justify-center pointer-events-none px-10 sm:px-16"
              >
                <div
                  onClick={handleImageClick}
                  className={`relative w-full h-full pointer-events-auto transition-transform duration-200 ${
                    scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                  }}
                >
                  <Image
                    src={currentImage.url}
                    alt={currentImage.alt || 'Material Preview'}
                    fill
                    className="object-contain select-none"
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    priority
                    referrerPolicy="no-referrer"
                    unoptimized={currentImage.url.startsWith('data:')}
                  />
                </div>
              </motion.div>

              {hasMultiple && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-1 sm:right-3 z-40 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/65 text-white border border-white/15 hover:bg-white/20 hover:scale-105 transition-all shadow-xl backdrop-blur-sm"
                  title="Next Image (→)"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip & Help Hint */}
            <div
              className="w-full max-w-4xl z-50 flex flex-col items-center gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              {hasMultiple && (
                <div className="flex items-center gap-2 overflow-x-auto max-w-full px-3 py-2 rounded-xl bg-black/65 border border-white/10 backdrop-blur-md">
                  {images.map((img, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={`${img.url}-${idx}`}
                        type="button"
                        onClick={() => selectIndex(idx)}
                        className={`relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                          isActive
                            ? 'border-primary ring-2 ring-primary/40 opacity-100 scale-105'
                            : 'border-white/15 opacity-55 hover:opacity-95'
                        }`}
                        title={img.caption || img.alt || `Image ${idx + 1}`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt || `Thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="80px"
                          referrerPolicy="no-referrer"
                          unoptimized={img.url.startsWith('data:')}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-white/60 tracking-wider font-medium pointer-events-none bg-black/40 px-3.5 py-1 rounded-full border border-white/10">
                {hasMultiple
                  ? 'Click image to zoom • ← / → to navigate • Click outside or ESC to close'
                  : 'Click image to zoom • Click outside or ESC to close'}
              </div>
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
