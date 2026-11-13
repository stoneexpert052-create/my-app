'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/context/language-context';
import { getRepresentatives, type Representative } from '@/lib/admin-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Phone, 
  Search, 
  Building2, 
  CheckCircle2, 
  Compass, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Filter,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

interface RepresentativesSectionProps {
  initialRegion?: string;
  showTitle?: boolean;
}

export function RepresentativesSection({ initialRegion, showTitle = true }: RepresentativesSectionProps) {
  const { language } = useLanguage();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion || 'All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getRepresentatives();
        if (isMounted) {
          setRepresentatives(data.filter(r => r.isActive));
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading representatives:', err);
        if (isMounted) setLoading(false);
      }
    }
    load();

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setRepresentatives(e.detail.filter((r: Representative) => r.isActive));
      }
    };
    window.addEventListener('representatives_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('representatives_updated', handleUpdate);
    };
  }, []);

  // Compute unique regions list
  const regionOptions = useMemo(() => {
    const list: { id: string; labelEn: string; labelUr: string }[] = [
      { id: 'All', labelEn: 'All Regions (تمام علاقے)', labelUr: 'تمام علاقے (پاکستان بھر)' }
    ];

    const seen = new Set<string>();
    representatives.forEach(rep => {
      if (rep.regionEn && !seen.has(rep.regionEn)) {
        seen.add(rep.regionEn);
        list.push({
          id: rep.regionEn,
          labelEn: rep.regionEn,
          labelUr: rep.regionUr || rep.regionEn
        });
      }
    });

    return list;
  }, [representatives]);

  // Filtered representatives
  const filteredReps = useMemo(() => {
    return representatives.filter(rep => {
      // Region filter
      if (selectedRegion !== 'All' && rep.regionEn !== selectedRegion) {
        return false;
      }

      // Search query (names, cities, region, designation)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = (rep.nameEn?.toLowerCase() || '').includes(q) || (rep.nameUr || '').includes(q);
        const inRegion = (rep.regionEn?.toLowerCase() || '').includes(q) || (rep.regionUr || '').includes(q);
        const inCities = rep.cities?.some(c => c.toLowerCase().includes(q));
        const inDesignation = (rep.designationEn?.toLowerCase() || '').includes(q) || (rep.designationUr || '').includes(q);
        const inPhone = (rep.phone || '').includes(q);

        if (!inName && !inRegion && !inCities && !inDesignation && !inPhone) {
          return false;
        }
      }

      return true;
    });
  }, [representatives, selectedRegion, searchQuery]);

  return (
    <div id="representatives-section" className="space-y-6 scroll-mt-24">
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
              <Compass className="w-3.5 h-3.5" />
              <span>{language === 'ur' ? 'ملک گیر نیٹ ورک و ریجنل نمائندے' : 'Nationwide Network & Regional Representatives'}</span>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <Users className="h-7 w-7 text-primary" />
              <span>{language === 'ur' ? 'اپنے علاقے کے نمائندے سے رابطہ کریں' : 'Connect with Your Regional Representative'}</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {language === 'ur'
                ? 'اپنے شہر یا صوبے کا انتخاب کریں اور ماربل کی سپلائی، ریٹس، سائٹ وزٹ اور کوالٹی معائنے کے لیے براہِ راست ہمارے بااختیار نمائندے سے رابطہ کریں۔'
                : 'Select your region or city to directly contact our authorized stone consultant for instant quotations, site measurements, and doorstep delivery.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{language === 'ur' ? 'مفت سائٹ وزٹ و کوٹیشن' : 'Free Site Measurement & Consultation'}</span>
          </div>
        </div>
      )}

      {/* Representatives Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 h-64 animate-pulse bg-muted/40 rounded-2xl" />
          ))}
        </div>
      ) : representatives.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-border bg-card/60 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="font-bold text-xl text-foreground">
              {language === 'ur' ? 'مرکزی کسٹمر سپورٹ و ہیلپ لائن' : 'Head Office Central Helpline'}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {language === 'ur'
                ? 'پاکستان بھر سے ماربل و گرینائٹ کی سپلائی، ریٹس، سائٹ وزٹ اور کوٹیشن کے لیے براہِ راست ہمارے مرکزی دفتر سے رابطہ کریں۔'
                : 'For stone orders, price quotations, and inquiries across Pakistan, connect directly with our central helpline.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-2 shadow-sm">
              <a href="tel:03399991052">
                <Phone className="w-4 h-4" />
                <span>0339-9991052</span>
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl gap-2">
              <a href="https://wa.me/923399991052" target="_blank" rel="noopener noreferrer">
                <span>WhatsApp: 0339-9991052</span>
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Region Selector Filter Bar */}
          <div className="bg-card/70 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={language === 'ur' ? 'شہر، نمائندے کا نام یا فون تلاش کریں...' : 'Search city, representative or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 bg-background rounded-xl border-border/80 focus-visible:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground self-start md:self-auto">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>
                  {language === 'ur' 
                    ? `${filteredReps.length} نمائندے دستیاب ہیں` 
                    : `${filteredReps.length} representatives found`}
                </span>
              </div>
            </div>

            {/* Region Pills / Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {language === 'ur' ? 'علاقہ منتخب کریں (Select Region):' : 'Select Region:'}
                </span>
                {selectedRegion !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedRegion('All')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {language === 'ur' ? 'تمام دیکھیں' : 'Reset to All'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                {regionOptions.map((opt) => {
                  const isSelected = selectedRegion === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedRegion(opt.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-md scale-[1.02]'
                          : 'bg-muted/70 hover:bg-muted text-foreground/80 border border-border/60 hover:border-border'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                      <span>{language === 'ur' ? opt.labelUr : opt.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Representatives Cards Grid */}
          {filteredReps.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/40">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="font-bold text-lg text-foreground mb-1">
                {language === 'ur' ? 'اس علاقے کے لیے کوئی نمائندہ نہیں ملا' : 'No representative found'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                {language === 'ur'
                  ? 'برائے مہربانی اپنا سرچ فلٹر تبدیل کریں یا ہمارے مرکزی ہیلپ لائن نمبر پر رابطہ کریں۔'
                  : 'Try clearing your search query or contact our central helpline for instant assistance across any location in Pakistan.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedRegion('All'); setSearchQuery(''); }}
                  className="rounded-xl"
                >
                  {language === 'ur' ? 'تمام نمائندے دیکھیں' : 'View All Representatives'}
                </Button>
                <Button asChild size="sm" className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold rounded-xl gap-2">
                  <a href="tel:03399991052">
                    <Phone className="w-3.5 h-3.5" />
                    <span>0339-9991052</span>
                  </a>
                </Button>
              </div>
            </div>
          ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReps.map((rep) => {
            const rawPhone = rep.phone.replace(/[^0-9]/g, '');
            const whatsappNumber = rep.whatsapp ? rep.whatsapp.replace(/[^0-9]/g, '') : (rawPhone.startsWith('0') ? '92' + rawPhone.slice(1) : rawPhone);
            const waText = encodeURIComponent(
              language === 'ur'
                ? `السلام علیکم جناب ${rep.nameUr}، مجھے Stone Expert سے اپنے علاقے (${rep.regionUr}) میں ماربل، گرینائٹ اور ریٹس کے حوالے سے معلومات درکار ہیں۔`
                : `Hello ${rep.nameEn}, I found your contact on Stone Expert regarding marble supply and inquiry for ${rep.regionEn}. Please share rates and availability.`
            );

            return (
              <Card 
                key={rep.id} 
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-amber-500/50 hover:shadow-xl transition-all duration-300"
              >
                <div>
                  {/* Card Header Top Banner */}
                  <div className="p-4 bg-gradient-to-r from-amber-500/10 via-background to-background border-b border-border/60 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{language === 'ur' ? rep.regionUr : rep.regionEn}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {language === 'ur' ? (rep.designationUr || 'علاقائی نمائندہ') : (rep.designationEn || 'Regional Consultant')}
                      </p>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                      {language === 'ur' ? 'فعال' : 'Active'}
                    </Badge>
                  </div>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Representative profile info */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-muted shrink-0 shadow-xs flex items-center justify-center">
                        {rep.avatarUrl ? (
                          <Image src={rep.avatarUrl} alt={rep.nameEn} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center font-bold text-lg">
                            {rep.nameEn.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="font-bold text-base text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {rep.nameEn}
                        </h4>
                        {rep.nameUr && (
                          <p className="text-xs font-semibold text-muted-foreground font-urdu" dir="rtl">
                            {rep.nameUr}
                          </p>
                        )}
                        <p className="text-xs font-bold text-primary flex items-center gap-1 pt-0.5" dir="ltr">
                          <Phone className="w-3 h-3 text-amber-500" />
                          <span>{rep.phone}</span>
                        </p>
                      </div>
                    </div>

                    {/* Covered Cities Badges */}
                    {rep.cities && rep.cities.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-500" />
                          {language === 'ur' ? 'احاطہ کردہ شہر / علاقے:' : 'Covered Cities / Yards:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rep.cities.map((city, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground/85 border border-border/50"
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Office / Yard Address */}
                    {(rep.officeAddressEn || rep.officeAddressUr) && (
                      <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                        <span className="font-semibold text-foreground block mb-0.5">
                          {language === 'ur' ? 'ماربل یارڈ / رابطہ دفتر:' : 'Yard / Office:'}
                        </span>
                        <p className="line-clamp-2">
                          {language === 'ur' ? (rep.officeAddressUr || rep.officeAddressEn) : (rep.officeAddressEn || rep.officeAddressUr)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Action Buttons */}
                <CardFooter className="p-4 pt-0 gap-2 border-t border-border/40 bg-muted/10">
                  <Button 
                    asChild 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl gap-1.5 shadow-sm text-xs sm:text-sm"
                  >
                    <a href={`tel:${rep.phone}`}>
                      <Phone className="w-3.5 h-3.5" />
                      <span>{language === 'ur' ? 'کال کریں' : 'Call Now'}</span>
                    </a>
                  </Button>

                  <Button 
                    asChild 
                    variant="outline" 
                    className="flex-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold h-10 rounded-xl gap-1.5 text-xs sm:text-sm"
                  >
                    <a 
                      href={`https://wa.me/${whatsappNumber}?text=${waText}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-emerald-600 dark:fill-emerald-400">
                        <title>WhatsApp</title>
                        <path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/>
                        <path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4"/>
                      </svg>
                      <span>WhatsApp</span>
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Bottom assurance banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-card to-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-foreground">
              {language === 'ur' ? 'ہر نمائندے کے ذریعے اسٹون ایکسپرٹ تصدیق شدہ کوالٹی' : 'Stone Expert Quality Assurance Guaranteed'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {language === 'ur' 
                ? 'تمام آرڈرز اور پیمائش ہمارے باقاعدہ انوائس اور کوالٹی چیک کے ساتھ فراہم کیے جاتے ہیں۔' 
                : 'All orders, slab selections, and measurements are coordinated with verified invoices and genuine stone guarantees.'}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-bold shrink-0">
          <a href="https://wa.me/923399991052" target="_blank" rel="noopener noreferrer">
            <span>{language === 'ur' ? 'مرکزی کسٹمر سپورٹ' : 'Head Office Support'}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
