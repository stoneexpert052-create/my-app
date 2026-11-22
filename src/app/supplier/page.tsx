'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  verifySupplierPassword,
  submitSupplierApplication,
  processImageFile,
  Supplier,
  SupplierApplication
} from '@/lib/admin-actions';
import {
  KeyRound,
  Unlock,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Phone,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink,
  Handshake,
  MapPin,
  User,
  Camera,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import config from '@/lib/config.json';

const PARTNER_CATEGORIES = [
  { id: 'Marble', label: 'ماربل (Marble)' },
  { id: 'Granite', label: 'گرینائٹ (Granite)' },
  { id: '12x12 & 12x24 Tiles', label: '12×12 / 12×24 ٹائلز (4-Sutar)' },
  { id: 'Gangsaw Slabs', label: 'گینگ ساؤ شیٹس (Gangsaw)' },
  { id: 'Artificial Stone', label: 'آرٹیفیشل / کوارٹز (Quartz)' },
  { id: 'Chemical & Tools', label: 'کیمیکلز و ٹولز (Chemicals)' }
];

export default function UniversalSupplierLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">
            Loading Supplier Portal...
          </span>
        </div>
      }
    >
      <UniversalSupplierLoginContent />
    </Suspense>
  );
}

function UniversalSupplierLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'partner' ? 'partner' : 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'partner'>(initialTab);

  // Tab 1: Existing Supplier PIN Login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedSupplier, setMatchedSupplier] = useState<Supplier | null>(null);

  // Tab 2: Partner With Us / New Supplier Application
  const [factoryName, setFactoryName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Marble', 'Granite']);
  const [factoryImageUrl, setFactoryImageUrl] = useState<string>('');
  const [uploadingFactoryPhoto, setUploadingFactoryPhoto] = useState(false);
  const [notes, setNotes] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<SupplierApplication | null>(null);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'partner') {
      setActiveTab('partner');
    } else if (tabParam === 'login') {
      setActiveTab('login');
    }

    const pinParam =
      searchParams?.get('pin') ||
      searchParams?.get('key') ||
      searchParams?.get('password');
    if (pinParam) {
      setActiveTab('login');
      setPassword(pinParam);
      handleVerify(pinParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleVerify = async (passToTest?: string) => {
    const targetPass = (passToTest !== undefined ? passToTest : password).trim();
    if (!targetPass) {
      setError('براہ کرم اپنا پاسورڈ یا پن درج کریں۔ (Please enter your password.)');
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
        setTimeout(() => {
          router.push(`/supplier/${encodeURIComponent(supplierId)}?unlocked=true`);
        }, 600);
      } else {
        setError(res.error || 'غلط پاسورڈ! براہ کرم درست پاسورڈ درج کریں۔');
      }
    } catch (err: any) {
      setError(err.message || 'لاگ ان کے دوران خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleFactoryPhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingFactoryPhoto(true);
    try {
      const compressed = await processImageFile(file, 720, 720, 0.55);
      setFactoryImageUrl(compressed);
    } finally {
      setUploadingFactoryPhoto(false);
    }
  };

  const handlePartnerApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppError(null);
    if (!factoryName.trim() || !phone.trim()) {
      setAppError('براہ کرم فیکٹری کا نام اور فون / واٹس ایپ نمبر لازمی درج کریں۔');
      return;
    }
    setSubmittingApp(true);
    try {
      const res = await submitSupplierApplication({
        factoryName,
        contactPerson,
        phone,
        city,
        address,
        categories: selectedCategories,
        factoryImageUrl,
        notes
      });
      if (res.success && res.application) {
        setSubmittedApp(res.application);
      } else {
        setAppError(res.error || 'درخواست محفوظ نہیں ہو سکی، براہ کرم دوبارہ کوشش کریں۔');
      }
    } catch (err: any) {
      setAppError(err?.message || 'نیٹ ورک خرابی پیش آئی۔');
    } finally {
      setSubmittingApp(false);
    }
  };

  const whatsappNotifyUrl = submittedApp
    ? `https://wa.me/${config.businessWhatsAppNumber}?text=${encodeURIComponent(
        `*السلام علیکم اسٹون ایکسپرٹ!*\nمیں بطور سپلائر / بزنس پارٹنر شامل ہونا چاہتا ہوں۔\n\n*فیکٹری کا نام:* ${submittedApp.factoryName}\n*رابطہ کار:* ${submittedApp.contactPerson || 'N/A'}\n*فون:* ${submittedApp.phone}\n*شہر / پتہ:* ${[submittedApp.address, submittedApp.city].filter(Boolean).join(', ') || 'N/A'}\n*مٹیریلز:* ${submittedApp.categories.join(', ')}\n\nبراہ کرم میرا سپلائر پورٹل PIN جاری فرمائیں۔`
      )}`
    : '#';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
            <Building2 className="h-4 w-4 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
              STONE EXPERT
            </span>
            <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
              Business Partner &amp; Supplier Portal
            </span>
          </div>
        </Link>

        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>Main Website</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className={activeTab === 'partner' ? 'w-full max-w-xl' : 'w-full max-w-md'}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-5 sm:p-7 relative overflow-hidden"
          >
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>سپلائر لاگ ان (Login)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('partner')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'partner'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Handshake className="h-3.5 w-3.5" />
                <span>پارٹنر بنیں (Partner With Us)</span>
              </button>
            </div>

            {activeTab === 'login' ? (
              <>
                {/* LOGIN TAB */}
                <div className="text-center space-y-2 mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
                    {matchedSupplier ? (
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    ) : (
                      <KeyRound className="h-7 w-7" />
                    )}
                  </div>

                  <div className="flex items-center justify-center">
                    <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                      Authorized Supplier &amp; Special Partner Portal
                    </Badge>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    سپلائر اور خصوصی پارٹنر پورٹل
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    اسٹون ایکسپرٹ سے دیا گیا اپنا مخصوص پاسورڈ یا پن درج کر کے اپنے ریٹس، مٹیریل کی تصاویر اور خصوصی ٹولز (کٹنگ آپٹیمائزر) تک رسائی حاصل کریں۔
                  </p>
                </div>

                {matchedSupplier && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-3"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{matchedSupplier.name}</div>
                      <div className="text-emerald-300/90 text-xs mt-0.5">
                        تصدیق کامیاب! پورٹل کھل رہا ہے...
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>سپلائر پاسورڈ یا پن (Access PIN)</span>
                      <span className="text-[11px] text-slate-400 font-normal">اپنا خفیہ پن درج کریں</span>
                    </label>

                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="اپنا خفیہ پاسورڈ درج کریں..."
                        value={password}
                        onChange={e => {
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
                    className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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

                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>محفوظ انفرادی پاسورڈ سسٹم</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    کیا آپ نئے سپلائر یا فیکٹری مالک ہیں؟{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('partner')}
                      className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                    >
                      ہمارے ساتھ شامل ہونے کی درخواست دیں
                    </button>
                  </p>
                </div>
              </>
            ) : submittedApp ? (
              /* PARTNER APPLICATION SUCCESS STATE */
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="text-xl font-black text-white">
                  آپ کی پارٹنرشپ درخواست موصول ہو گئی!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  شکریہ <strong className="text-amber-300">{submittedApp.factoryName}</strong>! اسٹون ایکسپرٹ ایڈمن آپ کی تفصیلات چیک کر کے آپ کو آپ کا مخصوص <strong>Supplier Portal PIN</strong> واٹس ایپ کر دیں گے، جس کے بعد آپ اپنے تمام ماربل، گرینائٹ اور ٹائلز کے ریٹس اور تصاویر براہ راست اپلوڈ کر سکیں گے۔
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <a
                    href={whatsappNotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    <span>واٹس ایپ پر فوری تصدیق کریں</span>
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSubmittedApp(null);
                      setFactoryName('');
                      setContactPerson('');
                      setPhone('');
                      setCity('');
                      setAddress('');
                      setFactoryImageUrl('');
                      setNotes('');
                      setActiveTab('login');
                    }}
                    className="w-full sm:w-auto h-10 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
                  >
                    سپلائر لاگ ان پر واپس جائیں
                  </Button>
                </div>
              </div>
            ) : (
              /* PARTNER WITH US / BECOME A SUPPLIER REGISTRATION FORM */
              <div className="space-y-5">
                <div className="text-center space-y-1.5">
                  <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Handshake className="h-7 w-7" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    ہمارے ساتھ بزنس کریں (Partner With Us)
                  </h1>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    اپنی ماربل / گرینائٹ فیکٹری یا شوروم کو اسٹون ایکسپرٹ نیٹ ورک میں شامل کریں۔ منظوری کے بعد آپ کو اپنا ذاتی پورٹل PIN ملے گا۔
                  </p>
                </div>

                {appError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{appError}</span>
                  </div>
                )}

                <form onSubmit={handlePartnerApplicationSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-amber-400" />
                        <span>فیکٹری / کمپنی کا نام *</span>
                      </label>
                      <Input
                        required
                        value={factoryName}
                        onChange={e => setFactoryName(e.target.value)}
                        placeholder="مثلاً: Al-Noor Marble Factory"
                        className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-amber-400" />
                        <span>رابطہ کار / مالک کا نام</span>
                      </label>
                      <Input
                        value={contactPerson}
                        onChange={e => setContactPerson(e.target.value)}
                        placeholder="مثلاً: حاجی محمد احمد"
                        className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>فون / واٹس ایپ نمبر *</span>
                      </label>
                      <Input
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0300-1234567"
                        className="h-10 bg-slate-950 border-slate-700 text-white text-xs font-mono rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400" />
                        <span>شہر (City)</span>
                      </label>
                      <Input
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="مثلاً: راولپنڈی، اسلام آباد، مردان، بونیر"
                        className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      فیکٹری / گودام کا مکمل پتہ (Factory Address)
                    </label>
                    <Input
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="مین روڈ، انڈسٹریل ایریا، ماربل مارکیٹ..."
                      className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                    />
                  </div>

                  {/* Supplied Categories */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      آپ کون سے مٹیریلز سپلائی کرتے ہیں؟
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PARTNER_CATEGORIES.map(cat => {
                        const active = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Factory Photo */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      {factoryImageUrl ? (
                        <img
                          src={factoryImageUrl}
                          alt="Factory preview"
                          className="h-11 w-11 rounded-lg object-cover border border-amber-500/40 shrink-0"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <Camera className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200">
                          فیکٹری یا کارڈ کی تصویر (اختیاری)
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          اپنی فیکٹری، گودام یا وزٹنگ کارڈ کی تصویر شامل کریں
                        </div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 cursor-pointer shrink-0">
                      {uploadingFactoryPhoto ? 'اپلوڈ...' : factoryImageUrl ? 'تبدیل کریں' : 'تصویر لگائیں'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFactoryPhotoUpload(e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      اضافی تفصیل (اختیاری)
                    </label>
                    <Input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="مثلاً: ہم زیارت وائٹ، بادل اور 12×24 ٹائلز کے ہول سیل سپلائر ہیں..."
                      className="h-10 bg-slate-950 border-slate-700 text-white text-xs rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingApp || uploadingFactoryPhoto}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingApp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>درخواست بھیجی جا رہی ہے...</span>
                      </>
                    ) : (
                      <>
                        <Handshake className="h-4 w-4" />
                        <span>درخواست جمع کرائیں (Submit Partner Application)</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
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
