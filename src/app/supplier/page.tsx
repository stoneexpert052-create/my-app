'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { verifySupplierPassword, Supplier } from '@/lib/admin-actions';
import { 
  KeyRound, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Package, 
  Phone, 
  AlertCircle, 
  Building2, 
  Eye, 
  EyeOff,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function UniversalSupplierLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">
          Loading Supplier Portal...
        </span>
      </div>
    }>
      <UniversalSupplierLoginContent />
    </Suspense>
  );
}

function UniversalSupplierLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedSupplier, setMatchedSupplier] = useState<Supplier | null>(null);

  // Auto-verify if PIN or password passed via query param (e.g. /supplier?pin=1234)
  useEffect(() => {
    const pinParam = searchParams?.get('pin') || searchParams?.get('key') || searchParams?.get('password');
    if (pinParam) {
      setPassword(pinParam);
      handleVerify(pinParam);
    }
  }, [searchParams]);

  const handleVerify = async (passToTest?: string) => {
    const targetPass = (passToTest !== undefined ? passToTest : password).trim();
    if (!targetPass) {
      setError("براہ کرم اپنا پاسورڈ یا پن درج کریں۔ (Please enter your password.)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifySupplierPassword(targetPass);
      if (res.success && res.supplier) {
        setMatchedSupplier(res.supplier);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`vendor_session_${res.supplier.id}`, targetPass);
          sessionStorage.setItem('active_vendor_id', res.supplier.id);
        }
        const supplierId = res.supplier.id;
        // Redirect to their specific supplier portal
        setTimeout(() => {
          router.push(`/supplier/${encodeURIComponent(supplierId)}?unlocked=true`);
        }, 600);
      } else {
        setError(res.error || "غلط پاسورڈ! براہ کرم درست پاسورڈ درج کریں۔");
      }
    } catch (err: any) {
      setError(err.message || "لاگ ان کے دوران خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
      
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
            <Building2 className="h-4 w-4 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
              STONE EXPERT
            </span>
            <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
              Vendor & Supplier Portal
            </span>
          </div>
        </Link>

        <Link href="/">
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5">
            <span>Main Website</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden"
          >
            {/* Subtle Amber Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge & Title */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1 shadow-inner">
                {matchedSupplier ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-pulse" />
                ) : (
                  <KeyRound className="h-8 w-8" />
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                  Universal Supplier Access
                </Badge>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                سپلائر و وینڈر پورٹل
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                اسٹون ایکسپرٹ سے دیا گیا اپنا مخصوص پاسورڈ یا پن درج کر کے اپنے ریٹس اور اسٹاک اپلوڈ کریں۔
              </p>
            </div>

            {/* Successful Match Notification */}
            {matchedSupplier && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-3"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{matchedSupplier.name}</div>
                  <div className="text-emerald-300/90 text-xs mt-0.5">تصدیق کامیاب! پورٹل کھل رہا ہے...</div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {/* Password Entry Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>سپلائر پاسورڈ یا پن (Access Password)</span>
                  <span className="text-[11px] text-slate-400 font-normal">جیسے: 7861 یا مخصوص پاسورڈ</span>
                </label>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="اپنا خفیہ پاسورڈ درج کریں..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    autoFocus
                    disabled={loading || !!matchedSupplier}
                    className="h-11 bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 pr-10 text-sm tracking-wider font-mono rounded-xl focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !password.trim() || !!matchedSupplier}
                className="w-full h-11 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    <span>تصدیق ہو رہی ہے...</span>
                  </>
                ) : matchedSupplier ? (
                  <>
                    <Unlock className="h-4 w-4 text-slate-950" />
                    <span>پورٹل کھل رہا ہے...</span>
                  </>
                ) : (
                  <>
                    <span>پورٹل کھولیں (Unlock Portal)</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Security / Help Notice */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>محفوظ انکرپٹڈ کنکشن اور انفرادی پاسورڈ سسٹم</span>
              </div>
              <p className="text-[11px] text-slate-500">
                اگر آپ کے پاس اپنا پاسورڈ نہیں ہے یا آپ پاسورڈ بھول گئے ہیں تو براہ کرم اسٹون ایکسپرٹ ایڈمن سے نیا پن حاصل کریں۔
              </p>
            </div>

          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-3 text-center text-xs text-slate-400">
        Stone Expert Management System • All Rights Reserved
      </footer>
    </div>
  );
}
