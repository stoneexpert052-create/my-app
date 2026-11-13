'use client';

import React, { useEffect, useState } from 'react';
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
  Layers, 
  Award, 
  Gem, 
  Package, 
  Check, 
  Smartphone, 
  QrCode as QrIcon, 
  Calendar, 
  Tag, 
  Search, 
  FileSpreadsheet,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { getPublicOrigin } from '@/lib/utils';
import config from '@/lib/config.json';
import initialMarbles from '@/lib/marbles-data.json';
import initialFixing from '@/lib/fixing-materials-data.json';
import { getMarbles, getFixingMaterials } from '@/lib/admin-actions';
import type { Marble, FixingMaterial } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PriceListBrochureProps {
  id?: string;
  className?: string;
  compact?: boolean;
  showSearch?: boolean;
}

export function PriceListBrochure({
  id = 'stone-expert-price-list-sheet',
  className = '',
  compact = false,
  showSearch = true
}: PriceListBrochureProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [tiktokQrUrl, setTiktokQrUrl] = useState<string>('');
  const [instaQrUrl, setInstaQrUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('https://stoneexpert.net');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [marblesList, setMarblesList] = useState<Marble[]>(initialMarbles as unknown as Marble[]);
  const [fixingList, setFixingList] = useState<FixingMaterial[]>(initialFixing as unknown as FixingMaterial[]);
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [currentUrduDate, setCurrentUrduDate] = useState<string>('');

  useEffect(() => {
    // Dynamic Current Date formatting (always updated for the exact day it is opened or downloaded)
    const today = new Date();
    const formattedEn = today.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    setCurrentDateFormatted(formattedEn);

    const urduMonths = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    const urduDateStr = `${today.getDate()} ${urduMonths[today.getMonth()]} ${today.getFullYear()}`;
    setCurrentUrduDate(urduDateStr);

    if (typeof window !== 'undefined') {
      const origin = getPublicOrigin() || window.location.origin;
      setWebsiteUrl(origin);

      // 1. Generate Web App Store QR Code (From Front of Card)
      QRCode.toDataURL(origin, {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating Web QR:', err));

      // 2. Generate TikTok QR Code (From Back of Card)
      QRCode.toDataURL('https://www.tiktok.com/@stoneexpert.islamabad052', {
        width: 220,
        margin: 1,
        color: { dark: '#010101', light: '#ffffff' }
      })
      .then(url => setTiktokQrUrl(url))
      .catch(err => console.error('Error generating TikTok QR:', err));

      // 3. Generate Instagram QR Code (From Back of Card)
      QRCode.toDataURL('https://www.instagram.com/STONEEXPERT052', {
        width: 220,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' }
      })
      .then(url => setInstaQrUrl(url))
      .catch(err => console.error('Error generating Instagram QR:', err));
    }

    // Always fetch freshest real-time prices from Firestore or local cache
    getMarbles().then(data => {
      if (data && data.length > 0) setMarblesList(data);
    }).catch(() => {});

    getFixingMaterials().then(data => {
      if (data && data.length > 0) setFixingList(data);
    }).catch(() => {});
  }, []);

  // Card Contact Information from user visiting card & official record
  const ceoName = config.ceoName || 'FIDA HUSSAIN';
  const ceoPhone = config.ceoPhone || '0300-3634052';
  const headOfficeAddress = 'Plot # 375-A, Potohar Road, I-9/3, Islamabad';
  const headOfficeAddressUr = 'پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد';
  const cardRawalpindiAddress = 'Dhok Chaudhrian Bangash Colony Near Car Chowk Chaklala Scheme III Rawalpindi';
  const cardRawalpindiAddressUr = 'ڈھوک چوہدریاں، بنگش کالونی، نزد کار چوک، چکلالہ سکیم 3، راولپنڈی';
  const cardDhaAddress = 'DHA Phase 2, Main GT Road, Islamabad';
  const cardDhaAddressUr = 'ڈی ایچ اے فیز 2، مین جی ٹی روڈ، اسلام آباد';
  const affiliationText = config.affiliation || 'Sales Affiliation with MDM';

  const contactList = [
    {
      name: 'Fida Hussain',
      nameUr: 'فدا حسین',
      role: 'CEO STONE EXPERT',
      roleUr: 'سی ای او سٹون ایکسپرٹ',
      phone: '0300-3634052',
      whatsapp: '923003634052'
    },
    {
      name: 'Fayyaz Hussain',
      nameUr: 'فیاض حسین',
      role: 'Regional Representative (Islamabad DHA 2 & Surrounding Areas)',
      roleUr: 'علاقائی نمائندہ (اسلام آباد ڈی ایچ اے ٹو اور ملحقہ علاقے)',
      phone: '0303-1512554',
      whatsapp: '923031512554'
    }
  ];

  // Categorize Marble Variants dynamically
  const categorizedProducts = React.useMemo(() => {
    const importedGranite: Array<{
      id: string;
      marbleId: string;
      name: string;
      thickness: string;
      size: string;
      price: number;
      materialType: string;
    }> = [];

    const localGraniteAndMarble: Array<{
      id: string;
      marbleId: string;
      name: string;
      thickness: string;
      size: string;
      price: number;
      materialType: string;
    }> = [];

    const silbataAndCounters: Array<{
      id: string;
      marbleId: string;
      name: string;
      thickness: string;
      size: string;
      price: number;
      materialType: string;
    }> = [];

    const gangsawsAndSlabs: Array<{
      id: string;
      marbleId: string;
      name: string;
      thickness: string;
      size: string;
      price: number;
      materialType: string;
    }> = [];

    marblesList.forEach(m => {
      if (!m.variants || m.variants.length === 0) return;
      const lowerName = m.name.toLowerCase();
      const origin = (m.origin || '').toLowerCase();
      const cat = (m.category || m.materialType || '').toLowerCase();

      m.variants.forEach(v => {
        const item = {
          id: `${m.id}_${v.id}`,
          marbleId: m.id,
          name: m.name,
          thickness: v.thickness || '6-Sutar',
          size: v.size || 'Standard',
          price: v.price || 0,
          materialType: m.materialType || 'Marble'
        };

        const sizeLower = item.size.toLowerCase();
        const thickLower = item.thickness.toLowerCase();

        // Check Silbata
        if (lowerName.includes('silbata') || lowerName.includes('سل بٹہ')) {
          silbataAndCounters.push(item);
        }
        // Check Gangsaw
        else if (sizeLower.includes('gangsaw') || sizeLower.includes('گینگ') || lowerName.includes('gangsaw') || thickLower.includes('gangsaw')) {
          gangsawsAndSlabs.push(item);
        }
        // Check Counters or Slabs
        else if (sizeLower.includes('counter') || sizeLower.includes('slab') || lowerName.includes('counter') || lowerName.includes('slab')) {
          silbataAndCounters.push(item);
        }
        // Check Imported Granite
        else if (origin.includes('imported') || cat.includes('granite') || lowerName.includes('pearl') || lowerName.includes('galaxy') || lowerName.includes('granite')) {
          importedGranite.push(item);
        }
        // Default to Local Granite and Pakistani Marble
        else {
          localGraniteAndMarble.push(item);
        }
      });
    });

    return {
      importedGranite,
      localGraniteAndMarble,
      silbataAndCounters,
      gangsawsAndSlabs,
      fixing: fixingList.map(f => ({
        id: f.id,
        name: f.name,
        category: f.category || 'Fixing Material',
        unit: f.unit || 'Bag',
        price: f.price || 0
      }))
    };
  }, [marblesList, fixingList]);

  // Filter items if searching
  const filterList = <T extends { name: string; size?: string; thickness?: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.size && i.size.toLowerCase().includes(q)) ||
      (i.thickness && i.thickness.toLowerCase().includes(q))
    );
  };

  const filteredImportedGranite = filterList(categorizedProducts.importedGranite);
  const filteredLocal = filterList(categorizedProducts.localGraniteAndMarble);
  const filteredSilbata = filterList(categorizedProducts.silbataAndCounters);
  const filteredGangsaws = filterList(categorizedProducts.gangsawsAndSlabs);
  const filteredFixing = categorizedProducts.fixing.filter(f => 
    !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div
      id={id}
      className={`bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none max-w-5xl mx-auto print:max-w-none ${className}`}
      style={{ fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)' }}
    >
      {/* ================= CARD FRONT HEADER BANNER ================= */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/95 text-white p-6 sm:p-10 border-b-4 border-amber-500 overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            {/* Top Affiliation & Brand Pill from Card */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                STONE EXPERT
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                <span>{affiliationText} (Mohmand Dada Minerals)</span>
              </span>
            </div>

            {/* Main Brand Title & CEO Details (As Printed on Card Front) */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3 flex-wrap">
                <span className="text-amber-400">STONE EXPERT</span>
                <span className="text-lg sm:text-2xl font-light text-slate-300 border-l border-slate-700 pl-3">
                  آفیشل پرائس لسٹ و ریٹ بروشر
                </span>
              </h1>
              
              {/* Card Front: FIDA HUSSAIN - CEO STONE EXPERT */}
              <div className="pt-1 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <span className="text-amber-300 tracking-wider font-extrabold uppercase text-base">
                  {ceoName}
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                  CEO STONE EXPERT
                </span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  {ceoPhone}
                </span>
              </div>
            </div>

            {/* Official Visiting Card Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200 max-w-3xl">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">مرکزی آفس و ماربل یارڈ:</span>
                  <p className="font-bold text-white tracking-wide">{headOfficeAddress}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5" dir="rtl">{headOfficeAddressUr}</p>
                </div>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-300 block">راولپنڈی آفس (کارڈ ایڈریس):</span>
                  <p className="font-bold text-white tracking-wide">{cardRawalpindiAddress}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5" dir="rtl">{cardRawalpindiAddressUr}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Date & Rate Verification Badge */}
            <div className="flex items-center gap-3 text-xs text-slate-300 pt-1 flex-wrap font-mono">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاریخ: {currentDateFormatted || 'Today'} ({currentUrduDate})</span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>آج کے تصدیق شدہ لائیو ریٹس (Live Rates Valid Today)</span>
              </span>
            </div>
          </div>

          {/* ================= CARD FRONT QR CODE & BARCODE ================= */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl text-slate-950 shrink-0 shadow-2xl border-2 border-amber-400/80 max-w-[230px] text-center">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="Stone Expert Web App QR Code" 
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
            <div className="mt-1 space-y-0.5">
              <span className="text-[10px] font-extrabold text-slate-900 block">
                اسکین کریں اور لائیو ایپ پر جائیں
              </span>
              <p className="text-[8.5px] font-semibold text-slate-600 leading-tight">
                ریٹس چیک کریں اور کوٹیشن حاصل کریں
              </p>
              <span className="text-[9px] font-mono font-bold text-amber-700 block">
                stoneexpert.net
              </span>
            </div>

            {/* Official Barcode Visual */}
            <div className="mt-2 pt-2 border-t border-slate-200 w-full flex flex-col items-center">
              <svg className="w-36 h-7 text-slate-900" viewBox="0 0 140 28" fill="currentColor">
                <rect x="2" y="0" width="3" height="20"/>
                <rect x="7" y="0" width="1.5" height="20"/>
                <rect x="11" y="0" width="3" height="20"/>
                <rect x="16" y="0" width="1" height="20"/>
                <rect x="19" y="0" width="4" height="20"/>
                <rect x="25" y="0" width="2" height="20"/>
                <rect x="29" y="0" width="1.5" height="20"/>
                <rect x="33" y="0" width="3" height="20"/>
                <rect x="38" y="0" width="2" height="20"/>
                <rect x="42" y="0" width="4" height="20"/>
                <rect x="48" y="0" width="1.5" height="20"/>
                <rect x="52" y="0" width="3" height="20"/>
                <rect x="57" y="0" width="2" height="20"/>
                <rect x="61" y="0" width="1" height="20"/>
                <rect x="64" y="0" width="4" height="20"/>
                <rect x="70" y="0" width="2" height="20"/>
                <rect x="74" y="0" width="3" height="20"/>
                <rect x="79" y="0" width="1" height="20"/>
                <rect x="82" y="0" width="4" height="20"/>
                <rect x="88" y="0" width="2" height="20"/>
                <rect x="92" y="0" width="1.5" height="20"/>
                <rect x="96" y="0" width="3" height="20"/>
                <rect x="101" y="0" width="2" height="20"/>
                <rect x="105" y="0" width="4" height="20"/>
                <rect x="111" y="0" width="1.5" height="20"/>
                <rect x="115" y="0" width="3" height="20"/>
                <rect x="120" y="0" width="2" height="20"/>
                <rect x="124" y="0" width="4" height="20"/>
                <rect x="130" y="0" width="2" height="20"/>
                <rect x="134" y="0" width="3" height="20"/>
                <text x="70" y="27" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#0f172a" fontFamily="monospace">03031512554 • 03003634052</text>
              </svg>
              <span className="text-[7.5px] font-bold tracking-wider text-slate-500 uppercase">
                Official Card &amp; Rate Barcode
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CARD DIRECTORY STRIP (KEY CONTACTS FROM CARD) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 bg-slate-900 text-slate-100 border-b border-slate-800 divide-y sm:divide-y-0 sm:divide-x sm:divide-slate-800 text-xs">
        {contactList.map((c, idx) => (
          <div key={idx} className="p-3.5 flex items-center justify-between sm:justify-start gap-4 px-6">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="leading-tight flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">{c.name}</span>
                <span className="text-amber-300 font-bold text-sm">({c.nameUr})</span>
              </div>
              <span className="text-xs text-slate-300 font-medium block mt-0.5">{c.role}</span>
              <div className="flex items-center gap-3 mt-1">
                <a href={`tel:${c.phone.replace(/[^0-9]/g, '')}`} className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 hover:underline">
                  <Smartphone className="w-3.5 h-3.5" />
                  {c.phone}
                </a>
                <span className="text-slate-600">•</span>
                <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-300 hover:underline">
                  WhatsApp Direct
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= SEARCH & CATEGORY FILTER BAR (ON SCREEN) ================= */}
      {showSearch && (
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 print:hidden space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="پتھر کا نام، سائز یا کیٹگری تلاش کریں (Search Marble, Granite, Silbata)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white border-slate-300 text-sm"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-amber-700 hover:underline font-semibold shrink-0"
              >
                فلٹر کلیئر کریں (Clear Search)
              </button>
            )}
          </div>

          {/* Quick Category Jump Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">کیٹگری انتخاب:</span>
            {[
              { id: 'all', label: 'تمام ریٹس (All Rates)' },
              { id: 'imported', label: 'امپورٹڈ گرینائٹ' },
              { id: 'local', label: 'لوکل و پاکستانی ماربل' },
              { id: 'silbata', label: 'سل بَٹہ و کاؤنٹرز' },
              { id: 'gangsaw', label: 'گینگ سا سلیبز' },
              { id: 'fixing', label: 'فکسنگ میٹریل و کیمیکل' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors ${
                  activeCategoryFilter === cat.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= MAIN TABLES CONTAINER (DYNAMIC RATES) ================= */}
      <div className="p-4 sm:p-8 space-y-8">

        {/* 1. IMPORTED GRANITES SECTION */}
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'imported') && filteredImportedGranite.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-amber-500 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg sm:text-xl">
                <Gem className="w-5 h-5 text-amber-600" />
                <span>امپورٹڈ گرینائٹ (Imported Granites)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Updated: {currentDateFormatted}
                </span>
                <Badge variant="outline" className="text-xs font-bold border-amber-300 text-amber-800 bg-amber-50">
                  {filteredImportedGranite.length} سائزز
                </Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">#</th>
                      <th className="py-2.5 px-3 sm:px-4">مٹیریل کا نام (Product Name)</th>
                      <th className="py-2.5 px-3 sm:px-4">سائز (Size)</th>
                      <th className="py-2.5 px-3 sm:px-4">موٹائی (Thickness)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">سیلنگ ریٹ (Rate / Sq.Ft)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-center">اسٹیٹس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredImportedGranite.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                          {item.size}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.thickness}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <span className="font-mono font-extrabold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                            PKR {item.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> دستیاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. LOCAL GRANITES & PAKISTANI MARBLE */}
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'local') && filteredLocal.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg sm:text-xl">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>پاکستانی و لوکل ماربل و گرینائٹ (Pakistani & Local Stone)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Updated: {currentDateFormatted}
                </span>
                <Badge variant="outline" className="text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50">
                  {filteredLocal.length} اقسام
                </Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">#</th>
                      <th className="py-2.5 px-3 sm:px-4">ماربل کا نام (Marble Name)</th>
                      <th className="py-2.5 px-3 sm:px-4">سائز (Size)</th>
                      <th className="py-2.5 px-3 sm:px-4">موٹائی (Thickness)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">سیلنگ ریٹ (Rate / Sq.Ft)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-center">اسٹیٹس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLocal.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                          {item.size}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.thickness}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <span className="font-mono font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                            PKR {item.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> دستیاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 3. SILBATA & COUNTERTOPS */}
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'silbata') && filteredSilbata.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg sm:text-xl">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>سل بَٹہ، چوکھٹ و کچن کاؤنٹرز (Silbata & Counters)</span>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-indigo-300 text-indigo-800 bg-indigo-50">
                {filteredSilbata.length} ورائٹی
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">#</th>
                      <th className="py-2.5 px-3 sm:px-4">پتھر / آئٹم (Item)</th>
                      <th className="py-2.5 px-3 sm:px-4">سائز / فنش</th>
                      <th className="py-2.5 px-3 sm:px-4">موٹائی</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">ریٹ (Rate / Sq.Ft)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-center">اسٹیٹس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSilbata.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                          {item.size}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.thickness}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <span className="font-mono font-extrabold text-indigo-900 bg-indigo-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                            PKR {item.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> دستیاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 4. GANGSAW SLABS */}
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'gangsaw') && filteredGangsaws.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-purple-600 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg sm:text-xl">
                <Award className="w-5 h-5 text-purple-600" />
                <span>گینگ سا امپورٹڈ و پرائم سلیبز (Gangsaw Full Slabs)</span>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-purple-300 text-purple-800 bg-purple-50">
                {filteredGangsaws.length} پریمیم سلیبز
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">#</th>
                      <th className="py-2.5 px-3 sm:px-4">سلیب کا نام (Slab Name)</th>
                      <th className="py-2.5 px-3 sm:px-4">کٹنگ سائز</th>
                      <th className="py-2.5 px-3 sm:px-4">موٹائی</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">ریٹ (Rate / Sq.Ft)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-center">اسٹیٹس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredGangsaws.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                          {item.size}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.thickness}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <span className="font-mono font-extrabold text-purple-900 bg-purple-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                            PKR {item.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> دستیاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 5. FIXING MATERIALS & CHEMICALS */}
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'fixing') && filteredFixing.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-rose-600 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg sm:text-xl">
                <Package className="w-5 h-5 text-rose-600" />
                <span>فکسنگ میٹریلز، ٹائل بانڈ و کیمیکل (Fixing & Chemicals)</span>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-rose-300 text-rose-800 bg-rose-50">
                {filteredFixing.length} پروڈکٹس
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 sm:px-4">#</th>
                      <th className="py-2.5 px-3 sm:px-4">پروڈکٹ کا نام</th>
                      <th className="py-2.5 px-3 sm:px-4">کیٹگری</th>
                      <th className="py-2.5 px-3 sm:px-4">یونٹ (Packing)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">قیمت (Price)</th>
                      <th className="py-2.5 px-3 sm:px-4 text-center">اسٹیٹس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFixing.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-rose-50/40 transition-colors">
                        <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-slate-600">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right">
                          <span className="font-mono font-extrabold text-rose-900 bg-rose-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                            PKR {item.price.toLocaleString()} / {item.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-center">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> دستیاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= ORDERING TERMS & NOTES ================= */}
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700 space-y-2">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>اہم ہدایات و آرڈر پالیسی / Rate Terms:</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
            <li>مندرجہ بالا تمام ریٹس ماربل و گرینائٹ سلیبز کے نیٹ فی مربع فٹ (Sq.Ft) کے حساب سے ہیں۔</li>
            <li>کسٹم کٹنگ اور پروفائل ڈیزائننگ گاہک کی مانگ کے مطابق تیار کی جاتی ہے۔</li>
            <li>ٹرانسپورٹ اور ان لوڈنگ چارجز رقبہ اور مسافت کے مطابق طے کیے جائیں گے۔</li>
            <li>فری ایسٹیمیٹ، بلڈنگ پیکیجز اور ماہر کاریگروں کے لیے ہماری ویب ایپ وزٹ کریں یا ہیلپ لائن پر رابطہ فرمائیں۔</li>
          </ul>
        </section>

        {/* ================= CARD BACK SIDE: DIGITAL CONNECT & BARCODES HUB ================= */}
        <section className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 space-y-6 border-2 border-amber-500/40">
          
          {/* Top Title & Google Search Bar from Card */}
          <div className="space-y-4 text-center">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              Stone Expert Official Directory & Barcodes
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black text-white">
              سٹون ایکسپرٹ ڈیجیٹل بار کوڈز و سوشل میڈیا لنکس
            </h3>
            
            {/* Google Search Bar Replica from Card */}
            <div className="max-w-xl mx-auto bg-white rounded-full p-2.5 px-5 flex items-center justify-between shadow-lg border border-slate-200 text-slate-900">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <span className="font-black text-blue-600 text-base tracking-tighter">
                  G<span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-emerald-500">l</span><span className="text-red-500">e</span>
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                  Stone Expert Marble &amp; Construction Solution
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs shrink-0">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[11px] text-slate-300">
              گوگل پر تلاش کر کے ہمارے کسٹمر ریویوز، پروجیکٹس اور شو روم لوکیشن دیکھیں۔
            </p>
          </div>

          {/* 3 QR Barcode Cards: TikTok, Web App, Instagram (As on Card) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            {/* 1. TikTok Card */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>TikTok QR</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow">
                {tiktokQrUrl ? (
                  <img src={tiktokQrUrl} alt="TikTok QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">TikTok QR</div>
                )}
              </div>
              <span className="text-xs font-bold text-white block">
                @stoneexpert.islamabad052
              </span>
              <span className="text-[10px] text-slate-400 block">
                ماربل ویڈیوز و سائٹ وزٹ
              </span>
            </div>

            {/* 2. Web App Store QR Code (Card Center) */}
            <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 p-4 rounded-xl border-2 border-amber-500/50 text-center space-y-2 flex flex-col items-center shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase">
                <QrIcon className="w-3.5 h-3.5" />
                <span>Web App Store</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-md border border-amber-400">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Stone Expert Store QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Store QR</div>
                )}
              </div>
              <span className="text-xs font-black text-amber-300 block">
                stoneexpert.net
              </span>
              <span className="text-[10px] text-slate-200 block">
                آن لائن کیلکولیٹر و آرڈر بکنگ
              </span>
            </div>

            {/* 3. Instagram Card */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-[11px] font-bold">
                <span>Instagram QR</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow">
                {instaQrUrl ? (
                  <img src={instaQrUrl} alt="Instagram QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Insta QR</div>
                )}
              </div>
              <span className="text-xs font-bold text-white block">
                @STONEEXPERT052
              </span>
              <span className="text-[10px] text-slate-400 block">
                پروجیکٹ گیلری و کیٹلاگ
              </span>
            </div>
          </div>

          {/* Card Direct Contacts & All Official Card Addresses Grid */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Showroom, Rawalpindi & DHA 2 Addresses */}
            <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase text-[11px]">
                <MapPin className="w-3.5 h-3.5" />
                <span>تمام دفاتر و کارڈ کے تصدیق شدہ پتے (Official Card Addresses)</span>
              </span>
              
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="border-l-2 border-amber-500 pl-2">
                  <span className="text-amber-300 font-bold block text-[10px]">1. مرکزی شو روم و ماربل یارڈ:</span>
                  <p className="font-bold text-white text-xs">{headOfficeAddress}</p>
                  <p className="text-slate-300 text-[10px]" dir="rtl">{headOfficeAddressUr}</p>
                </div>

                <div className="border-l-2 border-rose-500 pl-2">
                  <span className="text-rose-300 font-bold block text-[10px]">2. راولپنڈی آفس (کارڈ پر درج پتہ):</span>
                  <p className="font-bold text-white text-xs">{cardRawalpindiAddress}</p>
                  <p className="text-slate-300 text-[10px]" dir="rtl">{cardRawalpindiAddressUr}</p>
                </div>

                <div className="border-l-2 border-emerald-500 pl-2">
                  <span className="text-emerald-300 font-bold block text-[10px]">3. ریجنل کوآرڈینیشن آفس (ڈی ایچ اے 2):</span>
                  <p className="font-bold text-white text-xs">{cardDhaAddress}</p>
                  <p className="text-slate-300 text-[10px]" dir="rtl">{cardDhaAddressUr}</p>
                </div>
              </div>
            </div>

            {/* Direct Phone Numbers (Only Fida Hussain & Fayyaz Hussain) */}
            <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase text-[11px]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>براہِ راست فون و واٹس ایپ نمبرز (Official Direct Numbers)</span>
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  ماربل خریداری، فیکٹری ریٹس اور آرڈر بکنگ کے لیے رابطہ فرمائیں:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="text-amber-400 block text-[10px] font-bold">Fida Hussain (CEO):</span>
                  <span className="text-[10px] text-slate-400 block">فدا حسین (مرکزی ایڈمن)</span>
                  <a href="tel:03003634052" className="font-bold text-white font-mono hover:text-amber-300 text-sm block mt-1">
                    0300-3634052
                  </a>
                  <a href="https://wa.me/923003634052" target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 font-semibold block mt-0.5 hover:underline">
                    WhatsApp Chat ↗
                  </a>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="text-amber-400 block text-[10px] font-bold">Fayyaz Hussain:</span>
                  <span className="text-[10px] text-slate-400 block">فیاض حسین (DHA 2 و اسلام آباد)</span>
                  <a href="tel:03031512554" className="font-bold text-white font-mono hover:text-amber-300 text-sm block mt-1">
                    0303-1512554
                  </a>
                  <a href="https://wa.me/923031512554" target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 font-semibold block mt-0.5 hover:underline">
                    WhatsApp Chat ↗
                  </a>
                </div>
              </div>

              <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 p-2 rounded text-slate-300 text-center">
                <span className="text-amber-300 font-semibold">نوٹ:</span> اس پی ڈی ایف بروشر کے تمام ریٹس روزانہ کی بنیاد پر اپ ڈیٹ ہوتے ہیں اور جاری کردہ تاریخ کے لیے معتبر ہیں۔
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= FOOTER STRIP ================= */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-600 font-medium">
        <div>
          © {new Date().getFullYear()} <strong>STONE EXPERT</strong> • {affiliationText}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-700">
          <span>Islamabad: Plot 375-A, Potohar Rd</span>
          <span>•</span>
          <span>Rawalpindi: Dhok Chaudhrian, Chaklala Scheme III</span>
          <span>•</span>
          <span>DHA 2 Islamabad</span>
          <span>•</span>
          <span className="font-bold text-slate-900">0300-3634052 / 0303-1512554</span>
        </div>
      </div>
    </div>
  );
}
