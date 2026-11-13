'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { 
  Building2, 
  Phone, 
  Mail, 
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
  ArrowRight,
  Clock,
  Gem,
  PackageCheck,
  Check,
  Smartphone
} from 'lucide-react';
import { getPublicOrigin } from '@/lib/utils';
import config from '@/lib/config.json';

interface CompanyBrochureProps {
  id?: string;
  className?: string;
  compact?: boolean;
}

export function CompanyBrochure({ id = 'stone-expert-brochure-sheet', className = '', compact = false }: CompanyBrochureProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('https://stone-expert.pk');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = getPublicOrigin() || window.location.origin;
      setWebsiteUrl(origin);
      QRCode.toDataURL(origin, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating QR Code:', err));
    }
  }, []);

  const businessPhone = config.businessPhoneNumber || '+92 339 9991052';
  const businessWhatsApp = config.businessWhatsAppNumber || '923399991052';

  return (
    <div 
      id={id} 
      className={`bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none max-w-4xl mx-auto ${className}`}
      style={{ fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)' }}
    >
      {/* COVER / HEADER BANNER */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 text-white p-8 sm:p-12 overflow-hidden border-b-4 border-amber-500">
        {/* Background Subtle Patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold tracking-wide uppercase">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Company Profile & Brochure</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="text-amber-400">Stone</span> Expert
              <span className="text-xl sm:text-2xl font-light text-slate-300 border-l border-slate-700 pl-3">
                سٹون ایکسپرٹ
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
              پاکستان کا قابلِ اعتماد ڈیجیٹل نیٹ ورک برائے اعلیٰ معیار کا ماربل، گرینائٹ، فکسنگ میٹریل اور پروفیشنل لیبر سروسز۔
            </p>
          </div>

          {/* Quick Contact & Verification Pill */}
          <div className="flex flex-col items-start md:items-end gap-1.5 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-xl border border-white/15">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Business & Direct Supply</span>
            </div>
            <div className="text-sm font-bold text-white tracking-wide font-mono">
              0300-3634052 / 0303-1512554
            </div>
            <div className="text-[11px] text-slate-300">
              Plot 375-A, Potohar Rd, I-9/3, Islamabad
            </div>
          </div>
        </div>
      </div>

      {/* CORE HIGHLIGHTS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-900 text-slate-100 border-b border-slate-800 divide-x divide-slate-800 text-center">
        <div className="p-4 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-amber-400">100%</span>
          <span className="text-xs text-slate-300 mt-0.5">شفاف فیکٹری ریٹس</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-amber-400">50+</span>
          <span className="text-xs text-slate-300 mt-0.5">ماربل و گرینائٹ اقسام</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-amber-400">24/7</span>
          <span className="text-xs text-slate-300 mt-0.5">آن لائن ویب پورٹل</span>
        </div>
        <div className="p-4 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-amber-400">Nationwide</span>
          <span className="text-xs text-slate-300 mt-0.5">محفوظ ترسیل و فکسنگ</span>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="p-6 sm:p-10 space-y-10">

        {/* SECTION 1: ABOUT US */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Building2 className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              ہمارا تعارف و مشن / About Stone Expert
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
              <p>
                <strong>سٹون ایکسپرٹ (Stone Expert)</strong> پاکستان کا اولین جامع ڈیجیٹل پلیٹ فارم ہے جو ماربل، گرینائٹ، اور کنسٹرکشن فنشنگ کی صنعت میں شفافیت، آسانی اور جدید ترین ٹیکنالوجی فراہم کرتا ہے۔ ہم کسٹمرز، وینڈرز، اور سپلائرز کو براہِ راست باہم منسلک کرتے ہیں۔
              </p>
              <p>
                ہماری ویب سائٹ پر آپ کسی بھی وقت ماربل کے روزانہ کے اپڈیٹڈ ریٹس دیکھ سکتے ہیں، اپنے گھر یا پروجیکٹ کا فری ایسٹیمیٹ جنریٹ کر سکتے ہیں، ماہر کاریگر منتخب کر سکتے ہیں، اور براہِ راست فیکٹری سے کوالٹی مٹیریل اپنے گھر کی دہلیز پر منگوا سکتے ہیں۔
              </p>
            </div>

            {/* Key Value Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>ہماری بنیادی ترجیحات</span>
              </h3>
              <ul className="text-xs space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>براہِ راست فیکٹری سپلائی بغیر کسی درمیانی کمیشن کے۔</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>آرڈر کے بعد ترسیل اور فکسنگ کی مکمل نگرانی۔</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>جدید کمپیوٹرائزڈ بلنگ اور ریئل ٹائم ٹریکنگ۔</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 2: SERVICES OFFERED */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Layers className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              ہماری اہم خدمات / Core Services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Service 1 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3">
                <Gem className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">ماربل و گرینائٹ سپلائی</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تمام اقسام کے لوکل اور امپورٹڈ ماربل، گرینائٹ سلیبز، اور فلورنگ ٹائلز اعلیٰ معیار کی پالش کے ساتھ۔
              </p>
            </div>

            {/* Service 2 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3">
                <Hammer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">اپنا گھر بنائیں (Build Your Home)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                5 مرلہ، 10 مرلہ یا کنال کے گھروں کے لیے ماربل، چوکھٹ، سیڑھیاں اور کچن کاؤنٹر کی مکمل پیکیج ڈیلز۔
              </p>
            </div>

            {/* Service 3 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">تزئین و آرائش و رینوویشن</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                پرانے گھروں، پلازوں اور دفاتر کی رینوویشن، واش رومز میک اوور، اور کسٹم ماربل وینیٹیز کی انسٹالیشن۔
              </p>
            </div>

            {/* Service 4 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">آن لائن فری ایسٹیمیٹر</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ویب سائٹ پر اپنے رقبے اور پسندیدہ پتھر کا سائز درج کریں اور چند سیکنڈز میں مستند بجٹ تخمینہ حاصل کریں۔
              </p>
            </div>

            {/* Service 5 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-3">
                <PackageCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">فکسنگ میٹریل و کیمیکلز</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                اعلیٰ کوالٹی ٹائل بانڈ، ماربل فکسنگ ایڈہیسیو، ایپوکسی، گروٹ، اور ڈائمنڈ کٹنگ و پالشنگ پیڈز۔
              </p>
            </div>

            {/* Service 6 */}
            <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all bg-white">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">محفوظ ڈیلیوری و ٹریکنگ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                لوڈنگ سے لے کر سائٹ پر ان لوڈنگ تک کی ذمہ داری اور لائیو آرڈر اسٹیٹس ٹریکنگ کی مکمل سہولت۔
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: PRODUCT CATALOG HIGHLIGHTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2">
            <Gem className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              دستیاب مصنوعات و اقسام / Product Portfolio
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Left Col: Local & Imported Marble */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center justify-between border-b pb-1.5">
                <span>مقامی و امپورٹڈ ماربل (Marble)</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">لوکل و بین الاقوامی</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>زیارت وائٹ (Ziarat White):</strong> سپر وائٹ، فرسٹ کوالٹی، اور پرائم سلیکشن۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>بادل ماربل (Badal):</strong> منفرد نیچرل ٹیکسچر اور پائیدار فلوورنگ۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>سنی گرے و سنی وائٹ (Sunny Grey):</strong> کلاسک اور بجٹ فرینڈلی انتخاب۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>بلیک اینڈ گولڈ (Black & Gold):</strong> پرتعیش اور شاہانہ لک کے لیے۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                  <span><strong>امپورٹڈ سلیبز:</strong> بوٹیکینو، کریما مارفل، ترکش اور اطالوی ماربل۔</span>
                </li>
              </ul>
            </div>

            {/* Right Col: Granite & Modern Materials */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center justify-between border-b pb-1.5">
                <span>گرینائٹ، وینٹی و فکسنگ (Granite & Accessories)</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">پائیداری کی ضمانت</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>بلیک گلیکسی (Black Galaxy):</strong> امپورٹڈ گولڈن فلیکس گرینائٹ کچن ٹاپس۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>تپنو و بیلا گرے (Local Granite):</strong> سیڑھیوں اور بھاری استعمال کے لیے موزوں۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>ڈیزائنر وینیٹیز (Vanities):</strong> جدید کسٹم سائز ماربل و گرینائٹ وینیٹیز۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>کورین و کوارٹز (Corian):</strong> جوائنٹ لیس اور ماڈرن ہائیجینک کاؤنٹر ٹاپس۔</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>ٹائل بانڈ و کیمیکل:</strong> اعلیٰ چپکنے کی صلاحیت کے ساتھ فکسنگ سامان۔</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW THE WEBSITE WORKS */}
        <section className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-700" />
            <span>ہماری ویب سائٹ پر آرڈر اور رابطہ کا طریقہ کار / How to Order</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 shadow-sm">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-2">1</div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">ویب سائٹ کھولیں</h4>
              <p className="text-[11px] text-slate-600">کیٹلاگ، روزانہ کے ریٹس اور رقبہ ایسٹیمیٹ دیکھیں۔</p>
            </div>

            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 shadow-sm">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-2">2</div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">پسندیدہ پتھر منتخب کریں</h4>
              <p className="text-[11px] text-slate-600">سائز، کوالٹی اور مقدار کے حساب سے آرڈر تیار کریں۔</p>
            </div>

            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 shadow-sm">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-2">3</div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">فوری کوٹیشن و تصدیق</h4>
              <p className="text-[11px] text-slate-600">واٹس ایپ یا کال کے ذریعے فوری آرڈر فائنل کروائیں۔</p>
            </div>

            <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 shadow-sm">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-2">4</div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">سائٹ ڈیلیوری و فکسنگ</h4>
              <p className="text-[11px] text-slate-600">محفوظ ترسیل اور تسلی بخش کاریگر سپورٹ حاصل کریں۔</p>
            </div>
          </div>
        </section>

        {/* SECTION 5: CONTACT & DIGITAL PRESENCE (WITH QR CODE) */}
        <section className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-amber-500/40">
          <div className="space-y-3 flex-1">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase">
              Get in Touch / ہم سے رابطہ کریں
            </div>
            <h3 className="text-2xl font-bold text-white">
              سٹون ایکسپرٹ کسٹمر سپورٹ ڈیسک
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              گھر کی تعمیر، ماربل کی خریداری، یا کوٹیشن کے لیے ہماری ہیلپ لائن پر رابطہ کریں۔ ہماری ٹیم آپ کی مکمل رہنمائی کے لیے ہمہ وقت حاضر ہے۔
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Fida Hussain (CEO):</strong> 0300-3634052</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Fayyaz Hussain (DHA 2):</strong> 0303-1512554</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong>Head Office:</strong> Plot # 375-A, Potohar Road, I-9/3, Islamabad</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Rawalpindi:</strong> Dhok Chaudhrian, Chaklala Scheme III</span>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate"><strong>Online Portal:</strong> {websiteUrl}</span>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl text-slate-950 shrink-0 shadow-lg">
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
            <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
              Scan to Visit Website
            </span>
            <span className="text-[9px] text-slate-500">
              سٹون ایکسپرٹ ویب سائٹ وزٹ کریں
            </span>
          </div>
        </section>

      </div>

      {/* FOOTER STRIP */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          © {new Date().getFullYear()} <strong>Stone Expert</strong>. All Rights Reserved.
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span>Daily Rates</span>
          <span>•</span>
          <span>Cost Estimator</span>
          <span>•</span>
          <span>Order Tracking</span>
          <span>•</span>
          <span>Verified Labor</span>
        </div>
      </div>
    </div>
  );
}
