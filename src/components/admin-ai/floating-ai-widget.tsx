'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { AdminAiChatInterface } from './chat-interface';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingAdminAiWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenScanner = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-admin-ai-scanner', handleOpenScanner);
    return () => {
      window.removeEventListener('open-admin-ai-scanner', handleOpenScanner);
    };
  }, []);

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`h-12 px-4 rounded-full shadow-2xl transition-all duration-300 gap-2 border-2 ${
            isOpen 
              ? 'bg-muted text-foreground border-border hover:bg-muted/80' 
              : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black border-amber-300 shadow-amber-500/30 hover:scale-105'
          }`}
          title="Open AI Operations Manager"
        >
          {isOpen ? (
            <>
              <X className="h-5 w-5" />
              <span className="text-xs font-bold">بند کریں</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-xs font-black tracking-wide">StoneBot AI ایڈمن</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </>
          )}
        </Button>
      </div>

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
            <AdminAiChatInterface compact={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
