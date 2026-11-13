'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 backdrop-blur-md bg-opacity-95 text-white">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{
          scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
          opacity: { duration: 0.4 }
        }}
        className="flex flex-col items-center space-y-6"
      >
        {/* Animated Sparkle Welcome Container */}
        <div className="relative inline-flex items-center justify-center px-8 py-2 rounded-full bg-[#dfb96c]/10 border border-[#dfb96c]/30 overflow-hidden shadow-lg">
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 text-[#dfb96c] pointer-events-none z-10"
            animate={{
              left: ["2%", "92%", "2%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="h-5 w-5 text-[#dfb96c] drop-shadow-[0_0_12px_rgba(223,185,108,1)]" />
          </motion.div>

          <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-wide px-4" style={{ color: '#dfb96c' }}>
            Welcome to Stone Expert
          </h2>
        </div>

        {/* Loading Description */}
        <div className="text-center space-y-2 px-4">
          <p className="text-xs sm:text-sm text-slate-300 animate-pulse max-w-sm mx-auto">
            Loading premium stone collection & live prices...
          </p>
          <p className="text-sm text-[#dfb96c]/90 font-bold mt-1" dir="rtl">
            سٹون ایکسپرٹ میں خوش آمدید...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
