'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  Phone,
  MapPin,
  Layers,
  Award,
  Gem,
  Package,
  Check,
  Smartphone,
  QrCode as QrIcon,
  Calendar,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { getPublicOrigin, OFFICIAL_CARD_QR_URL, OFFICIAL_CARD_QR_OPTIONS } from '@/lib/utils';
import config from '@/lib/config.json';
import initialMarbles from '@/lib/marbles-data.json';
import initialFixing from '@/lib/fixing-materials-data.json';
import { getMarbles, getFixingMaterials, getHomepageConfig } from '@/lib/admin-actions';
import type { Marble, FixingMaterial } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PriceListBrochureProps {
  id?: string;
  className?: string;
  compact?: boolean;
  showSearch?: boolean;
}

const HEAD_OFFICE_ADDRESS_EN = 'Plot # 375-A, Potohar Road, I-9/3, Islamabad';
const HEAD_OFFICE_ADDRESS_UR = 'پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد';

export function PriceListBrochure({
  id = 'stone-expert-price-list-sheet',
  className = '',
  showSearch = true,
}: PriceListBrochureProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [tiktokQrUrl, setTiktokQrUrl] = useState<string>('');
  const [instaQrUrl, setInstaQrUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl || '/logo.svg');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [marblesList, setMarblesList] = useState<Marble[]>(initialMarbles as unknown as Marble[]);
  const [fixingList, setFixingList] = useState<FixingMaterial[]>(
    initialFixing as unknown as FixingMaterial[]
  );
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [currentUrduDate, setCurrentUrduDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const formattedEn = today.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentDateFormatted(formattedEn);

    const urduMonths = [
      'جنوری',
      'فروری',
      'مارچ',
      'اپریل',
      'مئی',
      'جون',
      'جولائی',
      'اگست',
      'ستمبر',
      'اکتوبر',
      'نومبر',
      'دسمبر',
    ];
    const urduDateStr = `${today.getDate()} ${urduMonths[today.getMonth()]} ${today.getFullYear()}`;
    setCurrentUrduDate(urduDateStr);

    if (typeof window !== 'undefined') {
      // Ensure origin helper stays warmed for URL sharing
      getPublicOrigin();

      // 1. Official Web App QR Code (Redirects to stoneexpert.net)
      QRCode.toDataURL(OFFICIAL_CARD_QR_URL, {
        ...OFFICIAL_CARD_QR_OPTIONS,
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Error generating Web QR:', err));

      // 2. TikTok QR Code
      QRCode.toDataURL('https://www.tiktok.com/@stoneexpert.islamabad052', {
        width: 220,
        margin: 1,
        color: { dark: '#010101', light: '#ffffff' },
      })
        .then((url) => setTiktokQrUrl(url))
        .catch((err) => console.error('Error generating TikTok QR:', err));

      // 3. Instagram QR Code
      QRCode.toDataURL('https://www.instagram.com/STONEEXPERT052', {
        width: 220,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
      })
        .then((url) => setInstaQrUrl(url))
        .catch((err) => console.error('Error generating Instagram QR:', err));
    }

    getHomepageConfig()
      .then((cfg) => {
        if (cfg?.logoUrl) setLogoUrl(cfg.logoUrl);
      })
      .catch(() => {});

    getMarbles()
      .then((data) => {
        if (data && data.length > 0) setMarblesList(data);
      })
      .catch(() => {});

    getFixingMaterials()
      .then((data) => {
        if (data && data.length > 0) setFixingList(data);
      })
      .catch(() => {});
  }, []);

  const ceoName = config.ceoName || 'FIDA HUSSAIN';
  const ceoPhone = config.ceoPhone || '0300-3634052';
  const affiliationText = config.affiliation || 'Sales Affiliation with MDM';

  const contactList = [
    {
      name: 'Fida Hussain',
      nameUr: 'فدا حسین',
      role: 'CEO — Stone Expert',
      roleUr: 'سی ای او — سٹون ایکسپرٹ',
      phone: '0300-3634052',
      whatsapp: '923003634052',
    },
    {
      name: 'Fayyaz Hussain',
      nameUr: 'فیاض حسین',
      role: 'Regional Representative (Islamabad & Rawalpindi)',
      roleUr: 'علاقائی نمائندہ (اسلام آباد و راولپنڈی)',
      phone: '0303-1512554',
      whatsapp: '923031512554',
    },
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

    marblesList.forEach((m) => {
      if (!m.variants || m.variants.length === 0) return;
      const lowerName = m.name.toLowerCase();
      const origin = (m.origin || '').toLowerCase();
      const cat = (m.category || m.materialType || '').toLowerCase();

      m.variants.forEach((v) => {
        const item = {
          id: `${m.id}_${v.id}`,
          marbleId: m.id,
          name: m.name,
          thickness: v.thickness || '6-Sutar',
          size: v.size || 'Standard',
          price: v.price || 0,
          materialType: m.materialType || 'Marble',
        };

        const sizeLower = item.size.toLowerCase();
        const thickLower = item.thickness.toLowerCase();

        if (lowerName.includes('silbata') || lowerName.includes('سل بٹہ')) {
          silbataAndCounters.push(item);
        } else if (
          sizeLower.includes('gangsaw') ||
          sizeLower.includes('گینگ') ||
          lowerName.includes('gangsaw') ||
          thickLower.includes('gangsaw')
        ) {
          gangsawsAndSlabs.push(item);
        } else if (
          sizeLower.includes('counter') ||
          sizeLower.includes('slab') ||
          lowerName.includes('counter') ||
          lowerName.includes('slab')
        ) {
          silbataAndCounters.push(item);
        } else if (
          origin.includes('imported') ||
          cat.includes('granite') ||
          lowerName.includes('pearl') ||
          lowerName.includes('galaxy') ||
          lowerName.includes('granite')
        ) {
          importedGranite.push(item);
        } else {
          localGraniteAndMarble.push(item);
        }
      });
    });

    return {
      importedGranite,
      localGraniteAndMarble,
      silbataAndCounters,
      gangsawsAndSlabs,
      fixing: fixingList.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category || 'Fixing Material',
        unit: f.unit || 'Bag',
        price: f.price || 0,
      })),
    };
  }, [marblesList, fixingList]);

  const filterList = <T extends { name: string; size?: string; thickness?: string }>(items: T[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.size && i.size.toLowerCase().includes(q)) ||
        (i.thickness && i.thickness.toLowerCase().includes(q))
    );
  };

  const filteredImportedGranite = filterList(categorizedProducts.importedGranite);
  const filteredLocal = filterList(categorizedProducts.localGraniteAndMarble);
  const filteredSilbata = filterList(categorizedProducts.silbataAndCounters);
  const filteredGangsaws = filterList(categorizedProducts.gangsawsAndSlabs);
  const filteredFixing = categorizedProducts.fixing.filter(
    (f) => !searchQuery.trim() || f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div
      id={id}
      className={`bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none max-w-5xl mx-auto print:max-w-none ${className}`}
      style={{ fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)' }}
    >
      {/* ================= CARD FRONT HEADER BANNER ================= */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/95 text-white p-6 sm:p-10 border-b-4 border-amber-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3.5 flex-1">
            {/* Top Affiliation & Official Price List Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Official Price List Brochure • آفیشل پرائس لسٹ بروشر
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                <span>{affiliationText} (Mohmand Dada Minerals)</span>
              </span>
            </div>

            {/* Official App Logo + Brand Title */}
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
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap leading-none">
                  <span className="text-amber-400">STONE EXPERT</span>
                  <span className="text-lg sm:text-2xl font-bold text-slate-200 border-l-2 border-amber-500/50 pl-3">
                    سٹون ایکسپرٹ
                  </span>
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  Official Marble &amp; Granite Rate List • آفیشل ماربل و گرینائٹ ریٹ لسٹ
                </p>
              </div>
            </div>

            {/* CEO Details */}
            <div className="flex flex-wrap items-center gap-2.5 text-sm font-semibold">
              <span className="text-amber-300 tracking-wider font-extrabold uppercase text-base">
                {ceoName} (فدا حسین)
              </span>
              <span className="text-xs bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded border border-slate-700">
                CEO STONE EXPERT • سی ای او
              </span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                {ceoPhone}
              </span>
            </div>

            {/* ONLY Official Latest I-9/3 Address */}
            <div className="bg-white/10 p-3 rounded-xl border border-amber-400/35 flex items-start gap-2.5 max-w-2xl">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">
                  Head Office &amp; Marble Yard • مرکزی آفس و ماربل یارڈ (I-9/3 Islamabad)
                </span>
                <p className="font-bold text-white text-xs sm:text-sm tracking-wide">
                  {HEAD_OFFICE_ADDRESS_EN}
                </p>
                <p className="text-xs text-slate-200" dir="rtl">
                  {HEAD_OFFICE_ADDRESS_UR}
                </p>
              </div>
            </div>

            {/* Dynamic Date & Rate Verification Badge */}
            <div className="flex items-center gap-2.5 text-xs text-slate-300 pt-0.5 flex-wrap font-mono">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Date / تاریخ: {currentDateFormatted || 'Today'} ({currentUrduDate})
                </span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Verified Live Rates Valid Today • آج کے تصدیق شدہ لائیو ریٹس</span>
              </span>
            </div>
          </div>

          {/* ================= CARD FRONT QR CODE & BARCODE ================= */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl text-slate-950 shrink-0 shadow-2xl border-2 border-amber-400/80 max-w-[235px] text-center">
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
                Scan for Live App &amp; Rates
              </span>
              <span className="text-[10px] font-extrabold text-amber-700 block" dir="rtl">
                اسکین کریں اور لائیو ایپ پر جائیں
              </span>
              <p className="text-[8.5px] font-semibold text-slate-600 leading-tight">
                Check live rates &amp; get instant quotes • ریٹس چیک کریں اور کوٹیشن حاصل کریں
              </p>
              <span className="text-[9px] font-mono font-bold text-amber-700 block">
                stoneexpert.net
              </span>
            </div>

            {/* Official Barcode Visual */}
            <div className="mt-2 pt-2 border-t border-slate-200 w-full flex flex-col items-center">
              <svg className="w-36 h-7 text-slate-900" viewBox="0 0 140 28" fill="currentColor">
                <rect x="2" y="0" width="3" height="20" />
                <rect x="7" y="0" width="1.5" height="20" />
                <rect x="11" y="0" width="3" height="20" />
                <rect x="16" y="0" width="1" height="20" />
                <rect x="19" y="0" width="4" height="20" />
                <rect x="25" y="0" width="2" height="20" />
                <rect x="29" y="0" width="1.5" height="20" />
                <rect x="33" y="0" width="3" height="20" />
                <rect x="38" y="0" width="2" height="20" />
                <rect x="42" y="0" width="4" height="20" />
                <rect x="48" y="0" width="1.5" height="20" />
                <rect x="52" y="0" width="3" height="20" />
                <rect x="57" y="0" width="2" height="20" />
                <rect x="61" y="0" width="1" height="20" />
                <rect x="64" y="0" width="4" height="20" />
                <rect x="70" y="0" width="2" height="20" />
                <rect x="74" y="0" width="3" height="20" />
                <rect x="79" y="0" width="1" height="20" />
                <rect x="82" y="0" width="4" height="20" />
                <rect x="88" y="0" width="2" height="20" />
                <rect x="92" y="0" width="1.5" height="20" />
                <rect x="96" y="0" width="3" height="20" />
                <rect x="101" y="0" width="2" height="20" />
                <rect x="105" y="0" width="4" height="20" />
                <rect x="111" y="0" width="1.5" height="20" />
                <rect x="115" y="0" width="3" height="20" />
                <rect x="120" y="0" width="2" height="20" />
                <rect x="124" y="0" width="4" height="20" />
                <rect x="130" y="0" width="2" height="20" />
                <rect x="134" y="0" width="3" height="20" />
                <text
                  x="70"
                  y="27"
                  fontSize="5.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontFamily="monospace"
                >
                  03031512554 • 03003634052
                </text>
              </svg>
              <span className="text-[7.5px] font-bold tracking-wider text-slate-500 uppercase">
                Official Barcode • آفیشل بار کوڈ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CARD DIRECTORY STRIP (KEY CONTACTS) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 bg-slate-900 text-slate-100 border-b border-slate-800 divide-y sm:divide-y-0 sm:divide-x sm:divide-slate-800 text-xs">
        {contactList.map((c, idx) => (
          <div key={idx} className="p-3.5 flex items-center justify-between sm:justify-start gap-4 px-6">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="leading-tight flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-base">{c.name}</span>
                <span className="text-amber-300 font-bold text-sm">({c.nameUr})</span>
              </div>
              <span className="text-xs text-slate-200 font-medium block mt-0.5">{c.role}</span>
              <span className="text-[11px] text-slate-400 block" dir="rtl">
                {c.roleUr}
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <a
                  href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}
                  className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 hover:underline"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {c.phone}
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-300 hover:underline"
                >
                  WhatsApp Direct / واٹس ایپ
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
                placeholder="Search Marble, Granite, Silbata / پتھر کا نام، سائز یا کیٹگری تلاش کریں..."
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
                Clear Search / فلٹر کلیئر کریں
              </button>
            )}
          </div>

          {/* Quick Category Jump Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">
              Category / کیٹگری:
            </span>
            {[
              { id: 'all', label: 'All Rates / تمام ریٹس' },
              { id: 'imported', label: 'Imported Granite / امپورٹڈ گرینائٹ' },
              { id: 'local', label: 'Pakistani Marble / پاکستانی ماربل' },
              { id: 'silbata', label: 'Silbata & Counters / سل بَٹہ و کاؤنٹرز' },
              { id: 'gangsaw', label: 'Gangsaw Slabs / گینگ سا سلیبز' },
              { id: 'fixing', label: 'Fixing & Chemicals / فکسنگ میٹریل' },
            ].map((cat) => (
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
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'imported') &&
          filteredImportedGranite.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-amber-500 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-xl">
                  <Gem className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Imported Granites • امپورٹڈ گرینائٹ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Updated / اپڈیٹ: {currentDateFormatted}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-bold border-amber-300 text-amber-800 bg-amber-50"
                  >
                    {filteredImportedGranite.length} Sizes / سائزز
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">#</th>
                        <th className="py-2.5 px-3 sm:px-4">Product Name / مٹیریل کا نام</th>
                        <th className="py-2.5 px-3 sm:px-4">Size / سائز</th>
                        <th className="py-2.5 px-3 sm:px-4">Thickness / موٹائی</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Rate (Sq.Ft) / سیلنگ ریٹ</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Status / اسٹیٹس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredImportedGranite.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
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
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3 h-3" /> In Stock / دستیاب
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
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'local') &&
          filteredLocal.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-emerald-600 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-xl">
                  <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Pakistani &amp; Local Marble &amp; Granite • پاکستانی و لوکل ماربل و گرینائٹ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Updated / اپڈیٹ: {currentDateFormatted}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50"
                  >
                    {filteredLocal.length} Varieties / اقسام
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">#</th>
                        <th className="py-2.5 px-3 sm:px-4">Marble Name / ماربل کا نام</th>
                        <th className="py-2.5 px-3 sm:px-4">Size / سائز</th>
                        <th className="py-2.5 px-3 sm:px-4">Thickness / موٹائی</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Rate (Sq.Ft) / سیلنگ ریٹ</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Status / اسٹیٹس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredLocal.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
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
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3 h-3" /> In Stock / دستیاب
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
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'silbata') &&
          filteredSilbata.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-indigo-600 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-xl">
                  <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Silbata, Doorframes &amp; Counters • سل بَٹہ، چوکھٹ و کچن کاؤنٹرز</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-indigo-300 text-indigo-800 bg-indigo-50"
                >
                  {filteredSilbata.length} Varieties / ورائٹی
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">#</th>
                        <th className="py-2.5 px-3 sm:px-4">Item / پتھر / آئٹم</th>
                        <th className="py-2.5 px-3 sm:px-4">Size &amp; Finish / سائز</th>
                        <th className="py-2.5 px-3 sm:px-4">Thickness / موٹائی</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Rate (Sq.Ft) / ریٹ</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Status / اسٹیٹس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredSilbata.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
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
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3 h-3" /> In Stock / دستیاب
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
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'gangsaw') &&
          filteredGangsaws.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-purple-600 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-xl">
                  <Award className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Gangsaw Full Slabs • گینگ سا امپورٹڈ و پرائم سلیبز</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-purple-300 text-purple-800 bg-purple-50"
                >
                  {filteredGangsaws.length} Slabs / پریمیم سلیبز
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">#</th>
                        <th className="py-2.5 px-3 sm:px-4">Slab Name / سلیب کا نام</th>
                        <th className="py-2.5 px-3 sm:px-4">Cutting Size / کٹنگ سائز</th>
                        <th className="py-2.5 px-3 sm:px-4">Thickness / موٹائی</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Rate (Sq.Ft) / ریٹ</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Status / اسٹیٹس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredGangsaws.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
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
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3 h-3" /> In Stock / دستیاب
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
        {(activeCategoryFilter === 'all' || activeCategoryFilter === 'fixing') &&
          filteredFixing.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-rose-600 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base sm:text-xl">
                  <Package className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Fixing Materials &amp; Chemicals • فکسنگ میٹریلز، ٹائل بانڈ و کیمیکل</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-rose-300 text-rose-800 bg-rose-50"
                >
                  {filteredFixing.length} Products / پروڈکٹس
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">#</th>
                        <th className="py-2.5 px-3 sm:px-4">Product Name / پروڈکٹ کا نام</th>
                        <th className="py-2.5 px-3 sm:px-4">Category / کیٹگری</th>
                        <th className="py-2.5 px-3 sm:px-4">Unit (Packing) / یونٹ</th>
                        <th className="py-2.5 px-3 sm:px-4 text-right">Price / قیمت</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Status / اسٹیٹس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredFixing.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-slate-600">{item.category}</td>
                          <td className="py-2.5 px-3 sm:px-4 font-mono font-medium text-slate-700">
                            {item.unit}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-right">
                            <span className="font-mono font-extrabold text-rose-900 bg-rose-100/80 px-2.5 py-1 rounded-md text-xs sm:text-sm">
                              PKR {item.price.toLocaleString()} / {item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-center">
                            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3 h-3" /> In Stock / دستیاب
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

        {/* ================= ORDERING TERMS & NOTES (BILINGUAL) ================= */}
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700 space-y-3">
          <h4 className="font-bold text-sm flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Rate Terms &amp; Order Policy • اہم ہدایات و آرڈر پالیسی</span>
          </h4>
          <ul className="space-y-2.5 text-slate-600 leading-relaxed">
            <li className="border-l-2 border-amber-400 pl-3">
              <span className="block font-medium text-slate-800">
                1. All listed prices for marble &amp; granite slabs are net per square foot (Sq.Ft).
              </span>
              <span className="block text-slate-600" dir="rtl">
                مندرجہ بالا تمام ریٹس ماربل و گرینائٹ سلیبز کے نیٹ فی مربع فٹ (Sq.Ft) کے حساب سے ہیں۔
              </span>
            </li>
            <li className="border-l-2 border-amber-400 pl-3">
              <span className="block font-medium text-slate-800">
                2. Custom cutting, edge profiling, and chamfer designs are prepared per client specifications.
              </span>
              <span className="block text-slate-600" dir="rtl">
                کسٹم کٹنگ اور پروفائل ڈیزائننگ گاہک کی مانگ کے مطابق تیار کی جاتی ہے۔
              </span>
            </li>
            <li className="border-l-2 border-amber-400 pl-3">
              <span className="block font-medium text-slate-800">
                3. Transport and site unloading charges depend on total quantity and delivery distance.
              </span>
              <span className="block text-slate-600" dir="rtl">
                ٹرانسپورٹ اور ان لوڈنگ چارجز رقبہ اور مسافت کے مطابق طے کیے جائیں گے۔
              </span>
            </li>
            <li className="border-l-2 border-amber-400 pl-3">
              <span className="block font-medium text-slate-800">
                4. Visit our web app or contact our helpline for free cost estimates, home packages, and certified fixing experts.
              </span>
              <span className="block text-slate-600" dir="rtl">
                فری ایسٹیمیٹ، بلڈنگ پیکیجز اور ماہر کاریگروں کے لیے ہماری ویب ایپ وزٹ کریں یا ہیلپ لائن پر رابطہ فرمائیں۔
              </span>
            </li>
          </ul>
        </section>

        {/* ================= CARD BACK SIDE: DIGITAL CONNECT & BARCODES HUB ================= */}
        <section className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 space-y-6 border-2 border-amber-500/40">
          {/* Top Title & Google Search Bar */}
          <div className="space-y-3 text-center">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              Stone Expert Official Directory &amp; QR Codes • آفیشل ڈیجیٹل ڈائریکٹری
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              Digital Barcodes &amp; Social Media Links • ڈیجیٹل بار کوڈز و سوشل میڈیا لنکس
            </h3>

            {/* Google Search Bar Replica */}
            <div className="max-w-xl mx-auto bg-white rounded-full p-2.5 px-5 flex items-center justify-between shadow-lg border border-slate-200 text-slate-900">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <span className="font-black text-blue-600 text-base tracking-tighter">
                  G<span className="text-red-500">o</span>
                  <span className="text-yellow-500">o</span>
                  <span className="text-blue-500">g</span>
                  <span className="text-emerald-500">l</span>
                  <span className="text-red-500">e</span>
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
            <div className="space-y-0.5">
              <p className="text-[11px] text-slate-300">
                Search us on Google to view customer reviews, completed projects &amp; our I-9/3 Islamabad showroom location.
              </p>
              <p className="text-[11px] text-slate-400" dir="rtl">
                گوگل پر تلاش کر کے ہمارے کسٹمر ریویوز، پروجیکٹس اور آئی نائن تھری (I-9/3) شو روم لوکیشن دیکھیں۔
              </p>
            </div>
          </div>

          {/* 3 QR Barcode Cards: TikTok, Web App, Instagram */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* 1. TikTok Card */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>TikTok QR • ٹک ٹاک</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow">
                {tiktokQrUrl ? (
                  <img src={tiktokQrUrl} alt="TikTok QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    TikTok QR
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-white block">@stoneexpert.islamabad052</span>
              <span className="text-[10px] text-slate-300 block">
                Marble Videos &amp; Site Visits
              </span>
              <span className="text-[10px] text-slate-400 block" dir="rtl">
                ماربل ویڈیوز و سائٹ وزٹ
              </span>
            </div>

            {/* 2. Web App Store QR Code */}
            <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 p-4 rounded-xl border-2 border-amber-500/50 text-center space-y-2 flex flex-col items-center shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase">
                <QrIcon className="w-3.5 h-3.5" />
                <span>Web App Store • ویب ایپ</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow-md border border-amber-400">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Stone Expert Store QR"
                    className="w-24 h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    Store QR
                  </div>
                )}
              </div>
              <span className="text-xs font-black text-amber-300 block">stoneexpert.net</span>
              <span className="text-[10px] text-slate-200 block">
                Online Calculator &amp; Order Booking
              </span>
              <span className="text-[10px] text-slate-300 block" dir="rtl">
                آن لائن کیلکولیٹر و آرڈر بکنگ
              </span>
            </div>

            {/* 3. Instagram Card */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-[11px] font-bold">
                <span>Instagram QR • انسٹاگرام</span>
              </div>
              <div className="p-2 bg-white rounded-lg shadow">
                {instaQrUrl ? (
                  <img src={instaQrUrl} alt="Instagram QR" className="w-24 h-24 object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    Insta QR
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-white block">@STONEEXPERT052</span>
              <span className="text-[10px] text-slate-300 block">Project Gallery &amp; Catalog</span>
              <span className="text-[10px] text-slate-400 block" dir="rtl">
                پروجیکٹ گیلری و کیٹلاگ
              </span>
            </div>
          </div>

          {/* Official I-9/3 Head Office Address & Direct Phone Numbers Grid */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* ONLY Latest I-9/3 Address */}
            <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase text-[11px]">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Official Head Office Address • مرکزی آفس کا پتہ</span>
                </span>

                <div className="border-l-2 border-amber-500 pl-3 py-1 space-y-1">
                  <span className="text-amber-300 font-bold block text-[11px]">
                    Head Office, Showroom &amp; Marble Yard • مرکزی شو روم و ماربل یارڈ
                  </span>
                  <p className="font-extrabold text-white text-sm leading-snug">
                    {HEAD_OFFICE_ADDRESS_EN}
                  </p>
                  <p className="text-slate-200 text-xs leading-snug" dir="rtl">
                    {HEAD_OFFICE_ADDRESS_UR}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-2.5 text-[11px] text-slate-300 space-y-0.5">
                <span className="block font-semibold text-amber-300">
                  Visiting Hours: Mon – Sat (9:00 AM – 7:00 PM)
                </span>
                <span className="block text-slate-400" dir="rtl">
                  اوقاتِ کار: پیر تا ہفتہ (صبح 9 بجے سے شام 7 بجے تک)
                </span>
              </div>
            </div>

            {/* Direct Phone Numbers */}
            <div className="space-y-2.5 bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase text-[11px]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Official Direct Numbers • براہِ راست فون و واٹس ایپ نمبرز</span>
                </span>
                <p className="text-[10.5px] text-slate-300 mt-1">
                  Contact us for marble purchasing, factory rates &amp; order booking:
                </p>
                <p className="text-[10.5px] text-slate-400" dir="rtl">
                  ماربل خریداری، فیکٹری ریٹس اور آرڈر بکنگ کے لیے رابطہ فرمائیں:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="text-amber-400 block text-[10px] font-bold">
                    Fida Hussain (CEO)
                  </span>
                  <span className="text-[10px] text-slate-400 block">فدا حسین (سی ای او)</span>
                  <a
                    href="tel:03003634052"
                    className="font-bold text-white font-mono hover:text-amber-300 text-sm block mt-1"
                  >
                    0300-3634052
                  </a>
                  <a
                    href="https://wa.me/923003634052"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 font-semibold block mt-0.5 hover:underline"
                  >
                    WhatsApp Chat / واٹس ایپ ↗
                  </a>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="text-amber-400 block text-[10px] font-bold">
                    Fayyaz Hussain (Sales Rep)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    فیاض حسین (علاقائی نمائندہ)
                  </span>
                  <a
                    href="tel:03031512554"
                    className="font-bold text-white font-mono hover:text-amber-300 text-sm block mt-1"
                  >
                    0303-1512554
                  </a>
                  <a
                    href="https://wa.me/923031512554"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 font-semibold block mt-0.5 hover:underline"
                  >
                    WhatsApp Chat / واٹس ایپ ↗
                  </a>
                </div>
              </div>

              <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 p-2 rounded text-slate-300 text-center space-y-0.5">
                <span className="block">
                  <strong className="text-amber-300">Note:</strong> All rates are updated daily and valid for the issued date.
                </span>
                <span className="block text-slate-400" dir="rtl">
                  <strong className="text-amber-300">نوٹ:</strong> اس بروشر کے تمام ریٹس روزانہ اپ ڈیٹ ہوتے ہیں اور جاری کردہ تاریخ کے لیے معتبر ہیں۔
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= FOOTER STRIP ================= */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2.5">
          <Icons.logo
            src={logoUrl}
            alt="Stone Expert Logo"
            crossOrigin="anonymous"
            className="h-7 w-7 object-contain rounded-md p-0.5 bg-slate-900 border border-amber-500/40 shrink-0"
          />
          <span>
            © {new Date().getFullYear()} <strong>STONE EXPERT (سٹون ایکسپرٹ)</strong> •{' '}
            {affiliationText}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-mono text-slate-700">
          <span>{HEAD_OFFICE_ADDRESS_EN}</span>
          <span>•</span>
          <span className="font-bold text-slate-900">0300-3634052 / 0303-1512554</span>
        </div>
      </div>
    </div>
  );
}
