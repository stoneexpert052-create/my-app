'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Mic, FileSpreadsheet, BellRing } from 'lucide-react';
import { AdminAiChatInterface } from './chat-interface';
import { AdminLiveSupervisor } from './admin-live-supervisor';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

interface FloatingAdminAiWidgetProps {
  hideFloatingButton?: boolean;
  defaultFocusTarget?: 'sale-ribbon' | null;
}

export function FloatingAdminAiWidget({
  hideFloatingButton = false,
  defaultFocusTarget = null,
}: FloatingAdminAiWidgetProps) {
  const isStorefrontBannerCustomizer = defaultFocusTarget === 'sale-ribbon';
  const [isOpen, setIsOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'sale-ribbon' | null>(defaultFocusTarget);
  const [activeTab, setActiveTab] = useState<'live' | 'chat'>(
    isStorefrontBannerCustomizer ? 'chat' : 'live'
  );
  const [newOrderBadge, setNewOrderBadge] = useState(0);

  const firestore = useFirestore();
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Track incoming customer orders even while floating drawer is minimized inside Admin Panel
  useEffect(() => {
    if (isStorefrontBannerCustomizer || isOpen) return;

    let unsub: (() => void) | null = null;
    if (firestore) {
      try {
        unsub = onSnapshot(
          collection(firestore, 'orders'),
          (snap) => {
            const ids = snap.docs.map((d) => (d.data() as any)?.id || d.id);
            if (!initializedRef.current) {
              ids.forEach((id) => knownIdsRef.current.add(id));
              initializedRef.current = true;
              return;
            }
            const fresh = ids.filter((id) => !knownIdsRef.current.has(id));
            if (fresh.length > 0) {
              fresh.forEach((id) => knownIdsRef.current.add(id));
              setNewOrderBadge((c) => c + fresh.length);
            }
          },
          () => {}
        );
      } catch {
        // ignore offline fallback
      }
    }

    const onLocalOrder = () => {
      setNewOrderBadge((c) => c + 1);
    };
    window.addEventListener('orders_updated', onLocalOrder);
    return () => {
      unsub?.();
      window.removeEventListener('orders_updated', onLocalOrder);
    };
  }, [firestore, isOpen, isStorefrontBannerCustomizer]);

  useEffect(() => {
    const handleOpenScanner = () => {
      setFocusTarget(null);
      setActiveTab('chat');
      setIsOpen(true);
    };
    const handleOpenSaleRibbon = () => {
      setFocusTarget('sale-ribbon');
      setActiveTab('chat');
      setIsOpen(true);
    };
    const handleOpenLiveSupervisor = () => {
      setFocusTarget(null);
      setActiveTab('live');
      setNewOrderBadge(0);
      setIsOpen(true);
    };
    window.addEventListener('open-admin-ai-scanner', handleOpenScanner);
    window.addEventListener('open-admin-ai-sale-ribbon', handleOpenSaleRibbon);
    window.addEventListener('open-admin-live-supervisor', handleOpenLiveSupervisor);
    return () => {
      window.removeEventListener('open-admin-ai-scanner', handleOpenScanner);
      window.removeEventListener('open-admin-ai-sale-ribbon', handleOpenSaleRibbon);
      window.removeEventListener('open-admin-live-supervisor', handleOpenLiveSupervisor);
    };
  }, []);

  return (
    <>
      {/* Floating Trigger Button (hidden when storefront uses inline banner trigger unless open) */}
      {(!hideFloatingButton || isOpen) && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            type="button"
            onClick={() => {
              setIsOpen((prev) => {
                const next = !prev;
                if (next) setNewOrderBadge(0);
                return next;
              });
            }}
            className={cn(
              'relative h-11 px-4 rounded-full shadow-2xl transition-all duration-300 gap-2 border-2 cursor-pointer',
              isOpen
                ? 'bg-muted text-foreground border-border hover:bg-muted/80'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black border-amber-300 shadow-amber-500/30 hover:scale-105'
            )}
            title="Open AI Operations Supervisor"
          >
            {isOpen ? (
              <>
                <X className="h-4 w-4" />
                <span className="text-xs font-bold">بند کریں</span>
              </>
            ) : (
              <>
                {newOrderBadge > 0 ? (
                  <BellRing className="h-4 w-4 animate-bounce text-slate-950" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="text-xs font-black tracking-wide">
                  {isStorefrontBannerCustomizer ? 'StoneBot AI ایڈمن' : 'لائیو ایڈمن سپروائزر'}
                </span>
                {newOrderBadge > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black tabular-nums">
                    {newOrderBadge}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Floating Drawer / Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[470px] max-w-[500px] shadow-2xl rounded-2xl overflow-hidden border border-amber-500/35 bg-background"
          >
            {!isStorefrontBannerCustomizer && (
              <div
                className="flex items-center gap-1 p-1.5 bg-slate-950 border-b border-white/10"
                dir="rtl"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-extrabold transition-colors cursor-pointer',
                    activeTab === 'live'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10'
                  )}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>لائیو نگران (وائس و آرڈرز)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-extrabold transition-colors cursor-pointer',
                    activeTab === 'chat'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10'
                  )}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>ریٹ لسٹ OCR و چیٹ</span>
                </button>
              </div>
            )}

            {activeTab === 'live' && !isStorefrontBannerCustomizer ? (
              <AdminLiveSupervisor
                compact={true}
                onNewOrderAlertCountChange={(cnt) => {
                  if (!isOpen) setNewOrderBadge(cnt);
                }}
              />
            ) : (
              <AdminAiChatInterface
                key={focusTarget || 'default'}
                compact={true}
                focusTarget={focusTarget}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
