'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { AdminAiChatInterface } from './chat-interface';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingAdminAiWidgetProps {
  hideFloatingButton?: boolean;
  defaultFocusTarget?: 'sale-ribbon' | null;
}

export function FloatingAdminAiWidget({
  hideFloatingButton = false,
  defaultFocusTarget = null
}: FloatingAdminAiWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'sale-ribbon' | null>(defaultFocusTarget);

  useEffect(() => {
    const handleOpenScanner = () => {
      setFocusTarget(null);
      setIsOpen(true);
    };
    const handleOpenSaleRibbon = () => {
      setFocusTarget('sale-ribbon');
      setIsOpen(true);
    };
    window.addEventListener('open-admin-ai-scanner', handleOpenScanner);
    window.addEventListener('open-admin-ai-sale-ribbon', handleOpenSaleRibbon);
    return () => {
      window.removeEventListener('open-admin-ai-scanner', handleOpenScanner);
      window.removeEventListener('open-admin-ai-sale-ribbon', handleOpenSaleRibbon);
    };
  }, []);

  return (
    <>
      {/* Floating Trigger Button (hidden when storefront uses inline banner trigger unless open) */}
      {(!hideFloatingButton || isOpen) && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className={`h-11 px-4 rounded-full shadow-2xl transition-all duration-300 gap-2 border-2 cursor-pointer ${
              isOpen
                ? 'bg-muted text-foreground border-border hover:bg-muted/80'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black border-amber-300 shadow-amber-500/30 hover:scale-105'
            }`}
            title="Open AI Operations Manager"
          >
            {isOpen ? (
              <>
                <X className="h-4 w-4" />
                <span className="text-xs font-bold">بند کریں</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-black tracking-wide">StoneBot AI ایڈمن</span>
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
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[480px] max-w-[500px] shadow-2xl rounded-2xl overflow-hidden border border-amber-500/30 bg-background"
          >
            <AdminAiChatInterface
              key={focusTarget || 'default'}
              compact={true}
              focusTarget={focusTarget}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
