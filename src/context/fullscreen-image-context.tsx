'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
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

function upgradeUrlForLightbox(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed.startsWith('data:')) return trimmed;

  const upgradeUnsplash = (u: string): string => {
    try {
      const parsed = new URL(u);
      if (parsed.hostname === 'images.unsplash.com') {
        parsed.searchParams.set('w', '1600');
        parsed.searchParams.set('q', '85');
        parsed.searchParams.set('auto', 'format');
        return parsed.toString();
      }
    } catch {
      // ignore malformed URL
    }
    return u;
  };

  if (trimmed.startsWith('/api/stone-image/')) {
    try {
      const parsed = new URL(trimmed, 'https://stoneexpert.net');
      const src = parsed.searchParams.get('src');
      if (src) {
        parsed.searchParams.set('src', upgradeUnsplash(src));
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // ignore
    }
    return trimmed;
  }

  return upgradeUnsplash(trimmed);
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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fillMode, setFillMode] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [fallbackUrls, setFallbackUrls] = useState<Record<number, boolean>>({});

  const touchStartX = useRef<number | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const didDragRef = useRef(false);

  const resetView = useCallback(() => {
    setScale(1);
    setRotate(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const openImage = useCallback((url: string, alt?: string) => {
    const cleaned = url?.trim();
    if (!cleaned) return;
    setImages([{ url: cleaned, alt: alt || 'Material Preview', caption: alt }]);
    setCurrentIndex(0);
    setFallbackUrls({});
    setFillMode(false);
    resetView();
    setIsOpen(true);
  }, [resetView]);

  const openGallery = useCallback((galleryImages: LightboxImage[], startIndex = 0) => {
    const validImages = galleryImages.filter((img) => img && img.url && img.url.trim() !== '');
    if (validImages.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, validImages.length - 1));
    setImages(validImages);
    setCurrentIndex(safeIndex);
    setFallbackUrls({});
    setFillMode(false);
    resetView();
    setIsOpen(true);
  }, [resetView]);

  const closeImage = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    resetView();
  }, [images.length, resetView]);

  const goToPrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    resetView();
  }, [images.length, resetView]);

  const selectIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    resetView();
  }, [resetView]);

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
        setScale((prev) => Math.min(Number((prev + 0.4).toFixed(2)), 4));
      } else if (e.key === '-') {
        setScale((prev) => {
          const next = Math.max(Number((prev - 0.4).toFixed(2)), 1);
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeImage, goToNext, goToPrev, resetView]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(Number((prev + 0.5).toFixed(2)), 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(2)), 1);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotate((prev) => (prev + 90) % 360);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFillMode(false);
    resetView();
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (scale > 1.05) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.max(1, Math.min(4, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
    setIsInteracting(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current || scale <= 1) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      didDragRef.current = true;
    }
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    dragStart.current = null;
    setIsInteracting(false);
  };

  const getPinchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDist.current = getPinchDistance(e.touches);
      pinchStartScale.current = scale;
      setIsInteracting(true);
      touchStartX.current = null;
      dragStart.current = null;
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        didDragRef.current = false;
        setIsInteracting(true);
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
      } else {
        touchStartX.current = e.touches[0].clientX;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      const dist = getPinchDistance(e.touches);
      const ratio = dist / pinchStartDist.current;
      const next = Math.max(1, Math.min(4, Number((pinchStartScale.current * ratio).toFixed(2))));
      setScale(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        didDragRef.current = true;
      }
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    pinchStartDist.current = null;
    dragStart.current = null;
    setIsInteracting(false);

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
  const activeUrl = currentImage
    ? fallbackUrls[currentIndex]
      ? currentImage.url
      : upgradeUrlForLightbox(currentImage.url)
    : '';

  return (
    <FullscreenImageContext.Provider value={{ openImage, openGallery, closeImage }}>
      {children}
      <AnimatePresence>
        {isOpen && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black/97 select-none overflow-hidden"
            onClick={closeImage}
            onWheel={handleWheel}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label={currentImage.alt || 'Image Lightbox'}
          >
            {/* Full-Viewport Seamless Edge-to-Edge Image Stage */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
              <motion.div
                key={`${currentImage.url}-${currentIndex}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full h-full flex items-center justify-center"
              >
                <div
                  onClick={handleImageClick}
                  onMouseDown={handleMouseDown}
                  className={`w-full h-full flex items-center justify-center ${
                    scale > 1
                      ? isInteracting
                        ? 'cursor-grabbing'
                        : 'cursor-grab'
                      : 'cursor-zoom-in'
                  }`}
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale}) rotate(${rotate}deg)`,
                    transition: isInteracting ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={activeUrl}
                    alt={currentImage.alt || 'Material Preview'}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onError={() => {
                      if (!fallbackUrls[currentIndex]) {
                        setFallbackUrls((prev) => ({ ...prev, [currentIndex]: true }));
                      }
                    }}
                    className={
                      fillMode
                        ? 'w-full h-full object-cover select-none'
                        : 'w-full h-full object-contain select-none'
                    }
                  />
                </div>
              </motion.div>
            </div>

            {/* Floating Translucent Top Controls Bar (Never shrinks the image area) */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
              <div className="flex items-center gap-2 min-w-0 max-w-[58%]">
                {hasMultiple && (
                  <span className="shrink-0 text-xs font-bold text-white bg-primary/90 px-2.5 py-1 rounded-md shadow-sm tabular-nums">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
                <span className="text-white font-headline text-xs sm:text-base font-semibold drop-shadow-md truncate bg-black/55 px-3 py-1.5 rounded-lg border border-white/15">
                  {currentImage.caption || currentImage.alt || 'Material Preview'}
                </span>
              </div>

              <div
                className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto bg-black/70 p-1 sm:p-1.5 rounded-xl border border-white/15 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFillMode((prev) => !prev);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    fillMode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/90 hover:text-white hover:bg-white/15'
                  }`}
                  title={fillMode ? 'Fit Entire Image' : 'Fill Full Screen'}
                  aria-label={fillMode ? 'Fit entire image' : 'Fill full screen'}
                >
                  {fillMode ? (
                    <Minimize2 className="h-4 w-4 md:h-5 md:w-5" />
                  ) : (
                    <Maximize2 className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                  <span className="hidden md:inline text-[11px]">
                    {fillMode ? 'Fit' : 'Fill'}
                  </span>
                </button>
                <div className="w-[1px] h-5 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors tabular-nums hidden sm:inline-flex cursor-pointer"
                  title="Reset Zoom (0)"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In (+)"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer hidden sm:inline-flex"
                  title="Rotate 90°"
                  aria-label="Rotate image"
                >
                  <RotateCw className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {(scale !== 1 || rotate !== 0 || fillMode) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                    title="Reset View"
                    aria-label="Reset view"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                )}
                <div className="w-[1px] h-5 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={closeImage}
                  className="p-1.5 text-white/90 hover:text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Close (ESC)"
                  aria-label="Close lightbox"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            </div>

            {/* Floating Left / Right Gallery Arrows */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 hover:bg-white/25 hover:scale-105 transition-all shadow-2xl cursor-pointer"
                  title="Previous Image (←)"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 hover:bg-white/25 hover:scale-105 transition-all shadow-2xl cursor-pointer"
                  title="Next Image (→)"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
                </button>
              </>
            )}

            {/* Floating Bottom Thumbnail Strip & Seamless Hint */}
            <div
              className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center gap-2 px-3 pb-3 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none"
            >
              {hasMultiple && (
                <div
                  className="flex items-center gap-2 overflow-x-auto max-w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 pointer-events-auto shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((img, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={`${img.url}-${idx}`}
                        type="button"
                        onClick={() => selectIndex(idx)}
                        className={`relative h-11 w-16 sm:h-13 sm:w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          isActive
                            ? 'border-primary ring-2 ring-primary/40 opacity-100 scale-105'
                            : 'border-white/20 opacity-60 hover:opacity-100'
                        }`}
                        title={img.caption || img.alt || `Image ${idx + 1}`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt || `Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-white/70 tracking-wide font-medium bg-black/55 px-3.5 py-1 rounded-full border border-white/10">
                {scale > 1
                  ? 'Drag to pan • Tap or scroll to adjust zoom • ESC to close'
                  : hasMultiple
                    ? 'Tap image to zoom • Swipe or ← / → for next • Fill button for full screen'
                    : 'Tap image or pinch/scroll to zoom • Fill button for full screen'}
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
