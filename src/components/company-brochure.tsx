'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Truck,
  Calculator,
  Layers,
  Hammer,
  Wrench,
  Award,
  Gem,
  PackageCheck,
  Check,
  Smartphone,
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { getHomepageConfig } from '@/lib/admin-actions';
import { getPublicOrigin, OFFICIAL_CARD_QR_URL, OFFICIAL_CARD_QR_OPTIONS } from '@/lib/utils';
import config from '@/lib/config.json';

interface CompanyBrochureProps {
  id?: string;
  className?: string;
  compact?: boolean;
}

const OFFICIAL_ADDRESS_EN = 'Plot # 375-A, Potohar Road, I-9/3, Islamabad';
const OFFICIAL_ADDRESS_UR = 'پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد';

export function CompanyBrochure({
  id = 'stone-expert-brochure-sheet',
  className = '',
}: CompanyBrochureProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('https://stoneexpert.net');
  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl || '/logo.svg');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = getPublicOrigin() || window.location.origin;
      setWebsiteUrl(origin);
      QRCode.toDataURL(OFFICIAL_CARD_QR_URL, {
        ...OFFICIAL_CARD_QR_OPTIONS,
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Error generating QR Code:', err));
    }

    getHomepageConfig()
      .then((cfg) => {
        if (cfg?.logoUrl) {
          setLogoUrl(cfg.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div
      id={id}
      className={`bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none max-w-4xl mx-auto ${className}`}
      style={{ fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)' }}
    >
      {/* COVER / HEADER BANNER */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 text-white p-7 sm:p-10 overflow-hidden border-b-4 border-amber-500">
        {/* Background Subtle Patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold tracking-wide">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Official Company Profile &amp; Brochure • آفیشل کمپنی تعارف و بروشر</span>
            </div>

            {/* Official App Logo + Brand Name */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="p-1.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400/70 shadow-xl shrink-0">
                <Icons.logo
                  src={logoUrl}
                  alt="Stone Expert Official Logo"
                  crossOrigin="anonymous"
                  className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 object-contain rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white flex items-center gap-2.5 flex-wrap leading-none">
                  <span>
                    <span className="text-amber-400">Stone</span> Expert
                  </span>
                  <span className="text-lg sm:text-2xl font-bold text-slate-200 border-l-2 border-amber-500/50 pl-3">
                    سٹون ایکسپرٹ
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-amber-300/90 uppercase tracking-wider">
                  Marble, Granite &amp; Construction Solutions • ماربل، گرینائٹ و کنسٹرکشن سلوشنز
                </p>
              </div>
            </div>

            <div className="space-y-1 max-w-xl pt-1">
              <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                Pakistan&apos;s trusted digital network for premium marble, granite, fixing materials, and professional labor services.
              </p>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed" dir="rtl">
                پاکستان کا قابلِ اعتماد ڈیجیٹل نیٹ ورک برائے اعلیٰ معیار کا ماربل، گرینائٹ، فکسنگ میٹریل اور پروفیشنل لیبر سروسز۔
              </p>
            </div>
          </div>

          {/* Quick Contact & Official I-9/3 Address Card */}
          <div className="flex flex-col items-start md:items-end gap-1.5 bg-white/10 backdrop-blur-md px-5 py-4 rounded-xl border border-white/15 w-full md:w-auto max-w-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Verified Direct Supply • براہِ راست سپلائی</span>
            </div>
            <div className="text-sm font-bold text-white tracking-wide font-mono">
              0300-3634052 / 0303-1512554
            </div>
            <div className="text-[11px] text-amber-200 font-semibold md:text-right leading-snug pt-0.5">
              {OFFICIAL_ADDRESS_EN}
            </div>
            <div className="text-[11px] text-slate-200 md:text-right leading-snug" dir="rtl">
              {OFFICIAL_ADDRESS_UR}
            </div>
          </div>
        </div>
      </div>

      {/* CORE HIGHLIGHTS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-900 text-slate-100 border-b border-slate-800 divide-x divide-slate-800 text-center">
        <div className="p-4 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl font-bold text-amber-400">100%</span>
          <span className="text-[11px] font-semibold text-white">Direct Factory Rates</span>
          <span className="text-[11px] text-slate-300">شفاف فیکٹری ریٹس</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl font-bold text-amber-400">50+</span>
          <span className="text-[11px] font-semibold text-white">Marble &amp; Granite Varieties</span>
          <span className="text-[11px] text-slate-300">ماربل و گرینائٹ اقسام</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl font-bold text-amber-400">24/7</span>
          <span className="text-[11px] font-semibold text-white">Online Web Portal</span>
          <span className="text-[11px] text-slate-300">آن لائن ویب پورٹل</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl font-bold text-amber-400">Nationwide</span>
          <span className="text-[11px] font-semibold text-white">Safe Delivery &amp; Fixing</span>
          <span className="text-[11px] text-slate-300">محفوظ ترسیل و فکسنگ</span>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="p-6 sm:p-10 space-y-10">
        {/* SECTION 1: ABOUT US */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Building2 className="w-6 h-6 text-amber-600 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              About Stone Expert &amp; Our Mission • ہمارا تعارف و مشن
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
              <div className="space-y-1.5">
                <p>
                  <strong>Stone Expert</strong> is Pakistan&apos;s pioneering digital platform bringing transparency, convenience, and modern technology to the marble, granite, and construction finishing industry. We connect customers, builders, and factories directly without middlemen.
                </p>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100" dir="rtl">
                  <strong>سٹون ایکسپرٹ (Stone Expert)</strong> پاکستان کا اولین جامع ڈیجیٹل پلیٹ فارم ہے جو ماربل، گرینائٹ، اور کنسٹرکشن فنشنگ کی صنعت میں شفافیت، آسانی اور جدید ترین ٹیکنالوجی فراہم کرتا ہے۔ ہم کسٹمرز، بلڈرز اور فیکٹریوں کو براہِ راست باہم منسلک کرتے ہیں۔
                </p>
              </div>
              <div className="space-y-1.5">
                <p>
                  On our web app, you can check daily updated marble rates anytime, generate instant free cost estimates for your home or project, hire verified fixing experts, and order factory-grade stone delivered right to your site.
                </p>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100" dir="rtl">
                  ہماری ویب ایپ پر آپ کسی بھی وقت ماربل کے روزانہ اپڈیٹڈ ریٹس دیکھ سکتے ہیں، اپنے گھر یا پروجیکٹ کا فری ایسٹیمیٹ تیار کر سکتے ہیں، ماہر کاریگر منتخب کر سکتے ہیں اور براہِ راست فیکٹری سے کوالٹی مٹیریل اپنی سائٹ پر منگوا سکتے ہیں۔
                </p>
              </div>
            </div>

            {/* Key Value Box */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Our Core Priorities / ہماری ترجیحات</span>
              </h3>
              <ul className="text-xs space-y-2.5 text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">Direct factory supply with zero middleman commission.</span>
                    <span className="text-slate-600 block" dir="rtl">براہِ راست فیکٹری سپلائی بغیر کسی درمیانی کمیشن کے۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">End-to-end supervision from order to delivery &amp; fixing.</span>
                    <span className="text-slate-600 block" dir="rtl">آرڈر کے بعد ترسیل اور فکسنگ کی مکمل نگرانی۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">Computerized billing &amp; real-time order tracking.</span>
                    <span className="text-slate-600 block" dir="rtl">جدید کمپیوٹرائزڈ بلنگ اور ریئل ٹائم ٹریکنگ۔</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 2: SERVICES OFFERED */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Layers className="w-6 h-6 text-amber-600 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              Core Services • ہماری اہم خدمات
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Service 1 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Gem className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Marble &amp; Granite Supply</h3>
                <p className="text-xs font-bold text-amber-700" dir="rtl">ماربل و گرینائٹ سپلائی</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                All varieties of local &amp; imported marble, granite slabs, and flooring tiles with mirror polish.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                تمام اقسام کے لوکل اور امپورٹڈ ماربل، گرینائٹ سلیبز اور فلورنگ ٹائلز اعلیٰ معیار کی پالش کے ساتھ۔
              </p>
            </div>

            {/* Service 2 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Build Your Home Packages</h3>
                <p className="text-xs font-bold text-emerald-700" dir="rtl">اپنا گھر بنائیں پیکیجز</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Complete marble, doorframe, stairs &amp; kitchen counter deals for 5 Marla, 10 Marla &amp; 1 Kanal homes.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                5 مرلہ، 10 مرلہ یا کنال کے گھروں کے لیے ماربل، چوکھٹ، سیڑھیاں اور کچن کاؤنٹر کی مکمل پیکیج ڈیلز۔
              </p>
            </div>

            {/* Service 3 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Renovation &amp; Interior Finishing</h3>
                <p className="text-xs font-bold text-blue-700" dir="rtl">تزئین و آرائش و رینوویشن</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Home, plaza &amp; office renovations, washroom makeovers, and custom marble vanity installations.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                پرانے گھروں، پلازوں اور دفاتر کی رینوویشن، واش رومز میک اوور اور کسٹم ماربل وینیٹیز کی انسٹالیشن۔
              </p>
            </div>

            {/* Service 4 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Free Online Cost Estimator</h3>
                <p className="text-xs font-bold text-purple-700" dir="rtl">آن لائن فری ایسٹیمیٹر</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Enter your area &amp; preferred stone size on our portal and get an accurate budget estimate in seconds.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                ویب سائٹ پر اپنا رقبہ اور پسندیدہ پتھر کا سائز درج کریں اور چند سیکنڈز میں مستند بجٹ تخمینہ حاصل کریں۔
              </p>
            </div>

            {/* Service 5 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Fixing Materials &amp; Chemicals</h3>
                <p className="text-xs font-bold text-rose-700" dir="rtl">فکسنگ میٹریل و کیمیکلز</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                High-strength tile bond, marble fixing adhesives, epoxy, grout, and diamond cutting &amp; polishing pads.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                اعلیٰ کوالٹی ٹائل بانڈ، ماربل فکسنگ ایڈہیسیو، ایپوکسی، گروٹ اور ڈائمنڈ کٹنگ و پالشنگ پیڈز۔
              </p>
            </div>

            {/* Service 6 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Safe Delivery &amp; Live Tracking</h3>
                <p className="text-xs font-bold text-amber-700" dir="rtl">محفوظ ڈیلیوری و ٹریکنگ</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Careful factory loading to safe site unloading with real-time order status tracking at every step.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5" dir="rtl">
                لوڈنگ سے لے کر سائٹ پر ان لوڈنگ تک کی ذمہ داری اور لائیو آرڈر اسٹیٹس ٹریکنگ کی مکمل سہولت۔
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: PRODUCT CATALOG HIGHLIGHTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Gem className="w-6 h-6 text-amber-600 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              Product Portfolio • دستیاب مصنوعات و اقسام
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Left Col: Local & Imported Marble */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center justify-between gap-2 border-b pb-2 flex-wrap">
                <span>Local &amp; Imported Marble / مقامی و امپورٹڈ ماربل</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  Local &amp; Global • لوکل و امپورٹڈ
                </span>
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Ziarat White (زیارت وائٹ):</strong> Super white, first quality &amp; prime selection.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">سپر وائٹ، فرسٹ کوالٹی اور پرائم سلیکشن۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Badal Marble (بادل ماربل):</strong> Natural cloud texture for durable flooring.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">منفرد نیچرل ٹیکسچر اور پائیدار فلورنگ۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Sunny Grey &amp; Sunny White (سنی گرے و وائٹ):</strong> Classic &amp; budget-friendly choice.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">کلاسک اور بجٹ فرینڈلی انتخاب۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Black &amp; Gold (بلیک اینڈ گولڈ):</strong> Luxury royal finish with gold veins.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">پرتعیش اور شاہانہ لک کے لیے بہترین انتخاب۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Imported Slabs (امپورٹڈ سلیبز):</strong> Botticino, Crema Marfil, Turkish &amp; Italian marble.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">بوٹیکینو، کریما مارفل، ترکش اور اطالوی ماربل۔</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Right Col: Granite & Modern Materials */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center justify-between gap-2 border-b pb-2 flex-wrap">
                <span>Granite, Vanities &amp; Fixing / گرینائٹ و فکسنگ</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Quality Assured • پائیداری کی ضمانت
                </span>
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Black Galaxy (بلیک گلیکسی):</strong> Imported golden-fleck granite kitchen tops.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">امپورٹڈ گولڈن فلیکس گرینائٹ کچن ٹاپس۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Local Granite — Tapno &amp; Bela Grey (تپنو و بیلا گرے):</strong> Ideal for stairs &amp; heavy use.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">سیڑھیوں اور بھاری استعمال کے لیے موزوں۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Designer Vanities (ڈیزائنر وینیٹیز):</strong> Custom-sized marble &amp; granite bathroom vanities.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">جدید کسٹم سائز ماربل و گرینائٹ وینیٹیز۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Corian &amp; Quartz (کورین و کوارٹز):</strong> Seamless &amp; modern hygienic countertops.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">جوائنٹ لیس اور ماڈرن ہائیجینک کاؤنٹر ٹاپس۔</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block"><strong>Tile Bond &amp; Chemicals (ٹائل بانڈ و کیمیکل):</strong> High-adhesion stone fixing supplies.</span>
                    <span className="text-[11px] text-slate-500 block" dir="rtl">اعلیٰ چپکنے کی صلاحیت کے ساتھ فکسنگ سامان۔</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW THE WEBSITE WORKS */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-700 shrink-0" />
            <span>How to Order Online • آن لائن آرڈر اور رابطے کا طریقہ کار</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-1">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-1.5">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Visit Web Portal</h4>
              <p className="text-[11px] font-bold text-amber-700" dir="rtl">ویب سائٹ کھولیں</p>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                Explore catalog, daily live rates &amp; area estimator.
              </p>
              <p className="text-[10.5px] text-slate-500 leading-snug" dir="rtl">
                کیٹلاگ، روزانہ کے ریٹس اور رقبہ ایسٹیمیٹ دیکھیں۔
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-1">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-1.5">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Select Your Stone</h4>
              <p className="text-[11px] font-bold text-amber-700" dir="rtl">پسندیدہ پتھر منتخب کریں</p>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                Choose size, thickness, quality &amp; required quantity.
              </p>
              <p className="text-[10.5px] text-slate-500 leading-snug" dir="rtl">
                سائز، کوالٹی اور مقدار کے حساب سے آرڈر تیار کریں۔
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-1">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-1.5">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Instant Quotation</h4>
              <p className="text-[11px] font-bold text-amber-700" dir="rtl">فوری کوٹیشن و تصدیق</p>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                Confirm your order instantly via WhatsApp or Call.
              </p>
              <p className="text-[10.5px] text-slate-500 leading-snug" dir="rtl">
                واٹس ایپ یا کال کے ذریعے فوری آرڈر فائنل کروائیں۔
              </p>
            </div>

            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-1">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-1.5">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Delivery &amp; Fixing</h4>
              <p className="text-[11px] font-bold text-amber-700" dir="rtl">سائٹ ڈیلیوری و فکسنگ</p>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                Receive safe site delivery &amp; skilled artisan support.
              </p>
              <p className="text-[10.5px] text-slate-500 leading-snug" dir="rtl">
                محفوظ ترسیل اور تسلی بخش کاریگر سپورٹ حاصل کریں۔
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: CONTACT & DIGITAL PRESENCE (WITH QR CODE) */}
        <section className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-amber-500/40">
          <div className="space-y-3 flex-1">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase">
              Get in Touch • ہم سے رابطہ کریں
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Stone Expert Customer Support Desk
              </h3>
              <p className="text-sm sm:text-base font-bold text-amber-300 mt-0.5" dir="rtl">
                سٹون ایکسپرٹ کسٹمر سپورٹ ڈیسک
              </p>
            </div>
            <div className="space-y-1 max-w-lg">
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Contact our helpline for home construction, direct marble purchasing, or instant quotations. Our team is ready to assist you.
              </p>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed" dir="rtl">
                گھر کی تعمیر، ماربل کی خریداری یا کوٹیشن کے لیے ہماری ہیلپ لائن پر رابطہ کریں۔ ہماری ٹیم آپ کی مکمل رہنمائی کے لیے ہمہ وقت حاضر ہے۔
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/10">
                <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">Fida Hussain (CEO) • فدا حسین</span>
                  <span className="font-mono text-amber-300 font-bold">0300-3634052</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/10">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">Fayyaz Hussain (Sales Rep) • فیاض حسین</span>
                  <span className="font-mono text-emerald-300 font-bold">0303-1512554</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 sm:col-span-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">
                    Head Office &amp; Marble Yard • مرکزی دفتر و ماربل یارڈ
                  </span>
                  <span className="block font-bold text-white">{OFFICIAL_ADDRESS_EN}</span>
                  <span className="block text-slate-200 text-[11px]" dir="rtl">
                    {OFFICIAL_ADDRESS_UR}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">
                  <strong>Online Portal / آن لائن ویب پورٹل:</strong> {websiteUrl}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl text-slate-950 shrink-0 shadow-lg border-2 border-amber-400/70">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Stone Expert Website QR Code"
                className="w-32 h-32 object-contain"
              />
            ) : (
              <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-800 mt-1.5 uppercase tracking-wider">
              Scan to Visit Website
            </span>
            <span className="text-[10px] font-semibold text-amber-700" dir="rtl">
              سٹون ایکسپرٹ ویب سائٹ وزٹ کریں
            </span>
          </div>
        </section>
      </div>

      {/* FOOTER STRIP */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <Icons.logo
            src={logoUrl}
            alt="Stone Expert Logo"
            crossOrigin="anonymous"
            className="h-7 w-7 object-contain rounded-md p-0.5 bg-slate-900 border border-amber-500/40 shrink-0"
          />
          <span>
            © {new Date().getFullYear()} <strong>Stone Expert (سٹون ایکسپرٹ)</strong> • All Rights Reserved.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-medium">
          <span>Daily Rates / روزانہ ریٹس</span>
          <span>•</span>
          <span>Cost Estimator / ایسٹیمیٹر</span>
          <span>•</span>
          <span>I-9/3, Islamabad</span>
        </div>
      </div>
    </div>
  );
}
