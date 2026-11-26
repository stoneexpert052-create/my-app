'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  verifyRepresentativePin,
  type Representative
} from '@/lib/admin-actions';
import {
  UserCheck,
  KeyRound,
  Unlock,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  ClipboardList,
  Ruler,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function UniversalRepresentativeLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">
            Loading Representative Portal...
          </span>
        </div>
      }
    >
      <RepresentativeLoginContent />
    </Suspense>
  );
}

function RepresentativeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedRep, setMatchedRep] = useState<Representative | null>(null);

  const handleVerify = async (pinOverride?: string) => {
    const cleanPin = (pinOverride !== undefined ? pinOverride : pin).trim();
    if (!cleanPin) {
      setError('براہ کرم اپنا نمائندہ پن درج کریں۔ (Please enter your Representative PIN.)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyRepresentativePin(cleanPin);
      if (res.success && res.representative) {
        setMatchedRep(res.representative);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`rep_portal_pin_${res.representative.id}`, cleanPin.toUpperCase());
        }
        const repId = res.representative.id;
        setTimeout(() => {
          router.push(`/representative/${encodeURIComponent(repId)}?unlocked=true`);
        }, 450);
      } else {
        setError(res.error || 'غلط پن! براہ کرم ایڈمن سے جاری کردہ درست پن درج کریں۔');
      }
    } catch (err: any) {
      setError(err?.message || 'لاگ ان کے دوران خرابی پیش آئی۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pinParam = searchParams?.get('pin');
    if (pinParam) {
      setPin(pinParam);
      handleVerify(pinParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/75 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
            <UserCheck className="h-4 w-4 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
              STONE EXPERT
            </span>
            <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
              Representative Field Portal • نمائندہ پورٹل
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/representatives">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            >
              <span>Public Directory</span>
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            >
              <span>Main Website</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Center Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="text-center space-y-2 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] uppercase tracking-wider">
                Isolated Representative Workspace
              </Badge>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                نمائندہ پورٹل لاگ ان
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed" dir="rtl">
                ہر نمائندے کا اپنا محفوظ پورٹل ہے — کسٹمر کی تفصیلات دیکھیں، سائٹ پر پیمائشیں درج کریں اور آن لائن بل بنائیں جو براہِ راست مین ایڈمن پینل سے منسلک ہو گا۔
              </p>
            </div>

            {matchedRep ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-base font-bold text-white">
                  خوش آمدید، {matchedRep.nameUr || matchedRep.nameEn}
                </p>
                <p className="text-xs text-emerald-300">
                  {matchedRep.regionEn} — پورٹل کھولا جا رہا ہے...
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Representative PIN
                    </span>
                    <span className="font-urdu text-amber-400" dir="rtl">
                      اپنا خفیہ پن درج کریں
                    </span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. FH-1052"
                      className="h-12 bg-slate-950 border-slate-700 text-white font-mono text-base tracking-widest pr-11 focus-visible:ring-amber-500"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span dir="rtl">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm gap-2 shadow-lg cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>تصدیق ہو رہی ہے...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>میرا پورٹل کھولیں (Open My Portal)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Feature Highlights */}
            <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/80">
                <Lock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-200">100% پرائیویٹ</p>
                <p className="text-[9px] text-slate-400">الگ ڈیٹا</p>
              </div>
              <div className="rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/80">
                <Ruler className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-200">سائٹ پیمائش</p>
                <p className="text-[9px] text-slate-400">سٹیئر، ونڈو، فلور</p>
              </div>
              <div className="rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/80">
                <ClipboardList className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-slate-200">آن لائن بل</p>
                <p className="text-[9px] text-slate-400">ایڈمن سنک</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-[11px] text-slate-500">
        Stone Expert • Plot # 375-A, Potohar Road, I-9/3, Islamabad • Authorized Representative Portal
      </footer>
    </div>
  );
}
