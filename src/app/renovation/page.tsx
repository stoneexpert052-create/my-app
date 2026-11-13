'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  getRenovationRatesConfig, 
  defaultRenovationRatesConfig,
  subscribeToAppUpdates,
  type RenovationRatesConfig,
  type RenovationSpaceRate,
  type RenovationTradeRate
} from '@/lib/admin-actions';
import { 
  Home, 
  Wrench, 
  Sparkles, 
  Layers, 
  Layout, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  Gem,
  Building2,
  Calculator,
  PhoneCall,
  Clock,
  HardHat,
  ChevronRight,
  Check,
  Paintbrush,
  Hammer,
  Droplets,
  Plug,
  AppWindow,
  Trees,
  Send,
  MessageSquare,
  Search,
  Phone,
  Sparkle,
  Bath,
  Tv,
  Utensils,
  Car,
  Palmtree,
  Maximize2,
  DollarSign,
  Briefcase,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';

export default function RenovationPage() {
  const { t, language } = useLanguage();
  const isUrdu = language === 'ur';
  const { toast } = useToast();
  const db = useFirestore();

  // Config State (from Firestore or default)
  const [ratesConfig, setRatesConfig] = useState<RenovationRatesConfig>(defaultRenovationRatesConfig);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Active View Tab
  const [mainTab, setMainTab] = useState<'spaces' | 'trades' | 'estimator' | 'inquiry'>('spaces');
  const [spaceSearchQuery, setSpaceSearchQuery] = useState('');
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');

  // Interactive Rate Estimator State
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(['bathroom', 'kitchen', 'bedroom']);
  const [selectedTrades, setSelectedTrades] = useState<string[]>(['trade_marble_fixing', 'trade_color', 'trade_electrical']);
  const [estimatedSqFt, setEstimatedSqFt] = useState<number>(1200);
  const [qualityGrade, setQualityGrade] = useState<'standard' | 'premium' | 'luxury'>('premium');

  // Custom Items added by user in estimator
  const [customItems, setCustomItems] = useState<{ id: string; name: string; rate: number; qty: number }[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemRate, setCustomItemRate] = useState(100);
  const [customItemQty, setCustomItemQty] = useState(1);

  // Form State for Inquiry
  const [selectedFormCategory, setSelectedFormCategory] = useState<string>('Full House Renovation');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [propertyType, setPropertyType] = useState<'house' | 'plaza' | 'office' | 'other'>('house');
  const [estimatedArea, setEstimatedArea] = useState('1200');
  const [userMessage, setUserMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact Phone Number
  const whatsappNumber = '923005550212';

  // Fetch live rates from Firestore
  useEffect(() => {
    async function loadRates(showSpinner = true) {
      if (showSpinner) setLoadingConfig(true);
      try {
        const config = await getRenovationRatesConfig();
        if (config) {
          setRatesConfig(config);
        }
      } catch (err) {
        console.warn("Could not fetch renovation rates from Firestore, using default:", err);
      } finally {
        if (showSpinner) setLoadingConfig(false);
      }
    }
    loadRates(true);

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'costs_updated' || event.type === 'app_data_sync') {
        loadRates(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter Spaces
  const filteredSpaces = useMemo(() => {
    if (!spaceSearchQuery.trim()) return ratesConfig.spaces;
    const q = spaceSearchQuery.toLowerCase();
    return ratesConfig.spaces.filter(s =>
      s.nameEn.toLowerCase().includes(q) ||
      s.nameUr.includes(q) ||
      s.descriptionEn.toLowerCase().includes(q)
    );
  }, [ratesConfig.spaces, spaceSearchQuery]);

  // Filter Trades
  const filteredTrades = useMemo(() => {
    if (!tradeSearchQuery.trim()) return ratesConfig.trades;
    const q = tradeSearchQuery.toLowerCase();
    return ratesConfig.trades.filter(t =>
      t.nameEn.toLowerCase().includes(q) ||
      t.nameUr.includes(q) ||
      t.descriptionEn.toLowerCase().includes(q) ||
      t.category.includes(q)
    );
  }, [ratesConfig.trades, tradeSearchQuery]);

  // Calculate Estimator Totals
  const estimatorCalculation = useMemo(() => {
    const gradeMultiplier = ratesConfig.gradeMultipliers[qualityGrade] || 1.5;

    // Selected Spaces Total
    let spacesTotal = 0;
    const spaceBreakdown = selectedSpaces.map(spaceId => {
      const spaceObj = ratesConfig.spaces.find(s => s.id === spaceId);
      if (!spaceObj) return null;
      let baseRate = spaceObj.baseRateBudget;
      if (qualityGrade === 'premium') baseRate = spaceObj.baseRatePremium;
      if (qualityGrade === 'luxury') baseRate = spaceObj.baseRateLuxury;

      const sqft = spaceObj.defaultSqFt || 150;
      const cost = Math.round(baseRate * sqft);
      spacesTotal += cost;
      return {
        id: spaceObj.id,
        nameEn: spaceObj.nameEn,
        nameUr: spaceObj.nameUr,
        rate: baseRate,
        sqft,
        cost
      };
    }).filter(Boolean);

    // Selected Trades Total
    let tradesTotal = 0;
    const tradeBreakdown = selectedTrades.map(tradeId => {
      const tradeObj = ratesConfig.trades.find(t => t.id === tradeId);
      if (!tradeObj) return null;

      const effectiveRate = Math.round(tradeObj.ratePKR * gradeMultiplier);
      const cost = Math.round(effectiveRate * (estimatedSqFt / 10)); // proportional allocation
      tradesTotal += cost;
      return {
        id: tradeObj.id,
        nameEn: tradeObj.nameEn,
        nameUr: tradeObj.nameUr,
        unitRate: effectiveRate,
        unit: tradeObj.unit,
        cost
      };
    }).filter(Boolean);

    // Custom items total
    let customTotal = 0;
    customItems.forEach(item => {
      customTotal += item.rate * item.qty;
    });

    const grandTotalPKR = Math.round(spacesTotal + tradesTotal + customTotal);

    return {
      spacesTotal,
      tradesTotal,
      customTotal,
      grandTotalPKR,
      spaceBreakdown,
      tradeBreakdown,
      gradeMultiplier
    };
  }, [selectedSpaces, selectedTrades, estimatedSqFt, qualityGrade, ratesConfig, customItems]);

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    setCustomItems(prev => [
      ...prev,
      {
        id: `cust_${Date.now()}`,
        name: customItemName,
        rate: Number(customItemRate) || 100,
        qty: Number(customItemQty) || 1
      }
    ]);
    setCustomItemName('');
    setCustomItemRate(100);
    setCustomItemQty(1);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      toast({
        title: isUrdu ? 'براہ کرم تمام معلومات درج کریں' : 'Required Information Missing',
        description: isUrdu ? 'نام اور فون نمبر فراہم کرنا ضروری ہے۔' : 'Please provide your name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (db) {
        await addDoc(collection(db, 'renovation_inquiries'), {
          category: selectedFormCategory,
          clientName,
          clientPhone,
          clientCity,
          propertyType,
          estimatedArea,
          estimatedTotalPKR: estimatorCalculation.grandTotalPKR,
          selectedSpaces,
          selectedTrades,
          qualityGrade,
          userMessage,
          createdAt: serverTimestamp(),
        });
      }

      toast({
        title: isUrdu ? 'درخواست جمع ہو گئی ہے!' : 'Inquiry Submitted Successfully!',
        description: isUrdu
          ? 'ہمارے پروجیکٹ انجینئر جلد آپ سے رابطہ کریں گے۔'
          : 'Our site engineer will contact you shortly regarding your renovation project.',
      });

      // Auto open WhatsApp with summary
      const text = encodeURIComponent(
        `Hello Stone Expert Team! I submitted a House Renovation inquiry:\n` +
        `👤 Name: ${clientName}\n` +
        `📞 Phone: ${clientPhone}\n` +
        `📍 City: ${clientCity}\n` +
        `🏠 Property: ${propertyType} (${estimatedArea} sq.ft)\n` +
        `🛠️ Category: ${selectedFormCategory}\n` +
        `💎 Grade: ${qualityGrade.toUpperCase()}\n` +
        `💰 Est Total: PKR ${estimatorCalculation.grandTotalPKR.toLocaleString()}\n` +
        `💬 Note: ${userMessage || 'Please visit my site for survey.'}`
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');

      // Reset form
      setClientName('');
      setClientPhone('');
      setClientCity('');
      setUserMessage('');
    } catch (err) {
      console.error('Error submitting renovation inquiry:', err);
      toast({
        title: isUrdu ? 'ارسال نہیں ہو سکا' : 'Submission Failed',
        description: isUrdu ? 'کوئی خرابی پیش آئی۔ دوبارہ کوشش کریں۔' : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Header />

      {/* HERO BANNER */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-[#dfb96c]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dfb96c]/20 via-slate-950/80 to-slate-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-5">
          <Badge className="bg-[#dfb96c]/20 text-[#dfb96c] border-[#dfb96c]/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline-block text-[#dfb96c]" />
            {isUrdu ? 'گھر، ولا اور پلازہ کی مکمل ری نوویشن' : 'Complete House & Plaza Renovation Services'}
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            {isUrdu ? (
              <span>گھروں، کچن، باتھ رومز اور تمام حصوں کی <span className="text-[#dfb96c]">جدید ترین ری نوویشن</span></span>
            ) : (
              <span>Transform Your Home with <span className="text-[#dfb96c]">Expert Architectural Renovation</span></span>
            )}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
            {isUrdu
              ? 'باتھ روم، کچن، بیڈ رومز، ٹی وی لاؤنج، پورچ اور ایلیویشن کی مکمل تزئین و آرائش۔ ماربل فٹنگ، پالش، فلورنگ، الیکٹرک، ونڈوز، کارپینٹری اور کلر ٹیکسچرز کے باضابطہ ریٹس۔'
              : 'End-to-end renovation for Bathrooms, Kitchens, Bedrooms, TV Lounges, Porches, & Front Elevation. Complete sections for Marble, Tiles, Electrical, Windows, Woodwork, Color, & Designer Finishes.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Button
              onClick={() => setMainTab('spaces')}
              size="lg"
              className={`font-semibold text-sm ${mainTab === 'spaces' ? 'bg-[#dfb96c] text-slate-950 hover:bg-[#c9a358]' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              <Home className="h-4 w-4 mr-2" />
              {isUrdu ? 'ری نوویشن حصے (Spaces)' : 'Explore Spaces'}
            </Button>

            <Button
              onClick={() => setMainTab('trades')}
              size="lg"
              className={`font-semibold text-sm ${mainTab === 'trades' ? 'bg-[#dfb96c] text-slate-950 hover:bg-[#c9a358]' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {isUrdu ? 'ری نوویشن شعبہ جات (Trades)' : 'Work Sections / Trades'}
            </Button>

            <Button
              onClick={() => setMainTab('estimator')}
              size="lg"
              className={`font-semibold text-sm ${mainTab === 'estimator' ? 'bg-[#dfb96c] text-slate-950 hover:bg-[#c9a358]' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'}`}
            >
              <Calculator className="h-4 w-4 mr-2 text-amber-400" />
              {isUrdu ? 'ریٹ کیلکولیٹر (Estimator)' : 'Rate Calculator'}
            </Button>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

        {/* NAVIGATION TABS */}
        <div className="flex justify-center border-b pb-4">
          <Tabs value={mainTab} onValueChange={(val: any) => setMainTab(val)} className="w-full max-w-4xl">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1.5 bg-muted/60 rounded-xl">
              <TabsTrigger value="spaces" className="py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Home className="h-4 w-4 text-[#dfb96c]" />
                {isUrdu ? '۱۔ ری نوویشن حصے' : '1. Renovation Spaces'}
              </TabsTrigger>
              <TabsTrigger value="trades" className="py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-[#dfb96c]" />
                {isUrdu ? '۲۔ کام کے شعبہ جات' : '2. Work Sections'}
              </TabsTrigger>
              <TabsTrigger value="estimator" className="py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-emerald-500" />
                {isUrdu ? '۳۔ ریٹس اور تخمینہ' : '3. Rates & Estimator'}
              </TabsTrigger>
              <TabsTrigger value="inquiry" className="py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Send className="h-4 w-4 text-indigo-500" />
                {isUrdu ? '۴۔ سائٹ وزٹ فارم' : '4. Request Quote'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: RENOVATION SPACES (Ghar kay Mukhtalif Hissay)      */}
        {/* ========================================================= */}
        {mainTab === 'spaces' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Home className="h-6 w-6 text-[#dfb96c]" />
                  {isUrdu ? 'گھر کے تمام حصوں کی ری نوویشن' : 'All House Renovation Spaces & Areas'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isUrdu
                    ? 'باتھ روم، کچن، بیڈ رومز، ٹی وی لاؤنج، ڈائننگ، کار پورچ، فرنٹ ایلیویشن اور دیگر حصوں کے باضابطہ منصوبے۔'
                    : 'Select any space in your house, plaza, or office to explore specialized renovation solutions, quality materials, and rates.'}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isUrdu ? "حصہ تلاش کریں..." : "Search space e.g. Bathroom, Kitchen..."}
                  value={spaceSearchQuery}
                  onChange={(e) => setSpaceSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSpaces.map((space) => {
                const isSelectedForEstimate = selectedSpaces.includes(space.id);
                return (
                  <Card key={space.id} className="group hover:border-[#dfb96c]/60 transition-all duration-300 shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3 bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[11px] bg-background border-[#dfb96c]/30 text-[#dfb96c] font-bold">
                          {space.unit}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          PKR {space.baseRateBudget} - {space.baseRateLuxury}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold group-hover:text-[#dfb96c] transition-colors flex items-center gap-2">
                        {space.id === 'bathroom' && <Bath className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'kitchen' && <Utensils className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'bedroom' && <Home className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'tv_lounge' && <Tv className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'dining_room' && <Utensils className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'porch' && <Car className="h-5 w-5 text-[#dfb96c]" />}
                        {space.id === 'front_elevation' && <Palmtree className="h-5 w-5 text-[#dfb96c]" />}
                        {(!['bathroom','kitchen','bedroom','tv_lounge','dining_room','porch','front_elevation'].includes(space.id)) && (
                          <Home className="h-5 w-5 text-[#dfb96c]" />
                        )}
                        {space.nameEn}
                      </CardTitle>
                      <CardDescription className="text-xs font-urdu text-muted-foreground mt-0.5">
                        {space.nameUr}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-2 text-xs space-y-3 flex-1">
                      <p className="text-muted-foreground leading-relaxed">
                        {isUrdu ? space.descriptionUr : space.descriptionEn}
                      </p>

                      <div className="bg-muted/30 p-2.5 rounded-lg border text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Standard Rate:</span>
                          <span className="font-semibold font-mono">PKR {space.baseRateBudget} / sq.ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Premium Executive:</span>
                          <span className="font-semibold font-mono text-indigo-600 dark:text-indigo-400">PKR {space.baseRatePremium} / sq.ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Luxury Deluxe:</span>
                          <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">PKR {space.baseRateLuxury} / sq.ft</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4 border-t bg-muted/10 gap-2">
                      <Button
                        onClick={() => {
                          if (isSelectedForEstimate) {
                            setSelectedSpaces(prev => prev.filter(id => id !== space.id));
                          } else {
                            setSelectedSpaces(prev => [...prev, space.id]);
                          }
                          setMainTab('estimator');
                        }}
                        size="sm"
                        className={`w-full text-xs font-semibold ${isSelectedForEstimate ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-primary text-primary-foreground'}`}
                      >
                        {isSelectedForEstimate ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {isUrdu ? 'تخمینہ میں شامل ہے (Calculate)' : 'Included in Estimator'}
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            {isUrdu ? 'تخمینہ میں شامل کریں' : 'Add to Estimator'}
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 2: WORK SECTIONS / TRADES                             */}
        {/* ========================================================= */}
        {mainTab === 'trades' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-[#dfb96c]" />
                  {isUrdu ? 'تمام ری نوویشن شعبہ جات (Work Sections & Trades)' : 'All Renovation Trade Work Sections'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isUrdu
                    ? 'ماربل فٹنگ، ٹائلز، الیکٹرک، ونڈوز، کارپینٹری، پینٹ، فینسی ٹیکسچر پینٹ، جپسم سیلنگ، پلمبنگ، اور فیبریکیشن لوہے کے کام۔'
                    : 'Full execution breakdown including Marble Fixing, Tile Work, Electrical, UPVC Windows, Carpenter Woodwork, Plastic Emulsion Paint, Designer Texture Color, Ceiling, Plumbing, & Steel Fabrication.'}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isUrdu ? "کام تلاش کریں..." : "Search work section e.g. Color, Window..."}
                  value={tradeSearchQuery}
                  onChange={(e) => setTradeSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTrades.map((trade) => {
                const isSelected = selectedTrades.includes(trade.id);
                return (
                  <Card key={trade.id} className="group hover:border-[#dfb96c]/60 transition-all shadow-xs flex flex-col justify-between">
                    <CardHeader className="pb-3 bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className="bg-muted text-foreground border text-[10px] uppercase font-bold">
                          {trade.category.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          PKR {trade.ratePKR} {trade.unit.replace('PKR / ', '/ ')}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 group-hover:text-[#dfb96c] transition-colors">
                        {trade.category === 'marble' && <Gem className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'tile' && <Layout className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'electrical' && <Plug className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'window' && <AppWindow className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'carpenter' && <Trees className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'color' && <Paintbrush className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'designer_color' && <Sparkle className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'ceiling' && <Layers className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'plumbing' && <Droplets className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'steel' && <Hammer className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.category === 'civil' && <HardHat className="h-5 w-5 text-[#dfb96c]" />}
                        {trade.nameEn}
                      </CardTitle>
                      <CardDescription className="text-xs font-urdu text-muted-foreground mt-0.5">
                        {trade.nameUr}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-2 text-xs space-y-3 flex-1">
                      <p className="text-muted-foreground leading-relaxed">
                        {isUrdu ? trade.descriptionUr : trade.descriptionEn}
                      </p>

                      <div className="bg-muted/30 p-2 rounded-lg border text-[11px] flex justify-between items-center">
                        <span className="text-muted-foreground">Standard Baseline Rate:</span>
                        <span className="font-mono font-bold">PKR {trade.ratePKR} {trade.unit.replace('PKR / ', '/ ')}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4 border-t bg-muted/10">
                      <Button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTrades(prev => prev.filter(id => id !== trade.id));
                          } else {
                            setSelectedTrades(prev => [...prev, trade.id]);
                          }
                          setMainTab('estimator');
                        }}
                        size="sm"
                        className={`w-full text-xs font-semibold ${isSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-primary text-primary-foreground'}`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {isUrdu ? 'تخمینہ میں شامل ہے' : 'Selected in Estimator'}
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            {isUrdu ? 'تخمینہ میں شامل کریں' : 'Add to Estimator'}
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 3: INTERACTIVE RATE CALCULATOR & ESTIMATOR           */}
        {/* ========================================================= */}
        {mainTab === 'estimator' && (
          <section className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-emerald-500" />
                    {isUrdu ? 'گھر کی ری نوویشن کا انٹرایکٹو ریٹ کیلکولیٹر' : 'House Renovation Cost & Rate Calculator'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isUrdu
                      ? 'اپنے منتخب حصے، شعبہ جات، کورڈ ایریا اور کوالٹی گریڈ منتخب کریں اور فوراً تخمینہ دیکھیں۔'
                      : 'Customize your house renovation project parameters to calculate instant, itemized material & labor estimates.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border">
                  <span className="text-xs font-bold px-2">{isUrdu ? 'کوالٹی گریڈ:' : 'Quality Grade:'}</span>
                  <Button
                    size="sm"
                    variant={qualityGrade === 'standard' ? 'default' : 'ghost'}
                    onClick={() => setQualityGrade('standard')}
                    className="h-7 text-xs"
                  >
                    Standard
                  </Button>
                  <Button
                    size="sm"
                    variant={qualityGrade === 'premium' ? 'default' : 'ghost'}
                    onClick={() => setQualityGrade('premium')}
                    className="h-7 text-xs"
                  >
                    Premium Executive
                  </Button>
                  <Button
                    size="sm"
                    variant={qualityGrade === 'luxury' ? 'default' : 'ghost'}
                    onClick={() => setQualityGrade('luxury')}
                    className="h-7 text-xs"
                  >
                    Luxury Deluxe
                  </Button>
                </div>
              </div>

              {/* COVERED AREA INPUT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <Label className="text-xs font-bold">Covered Renovation Area (Sq. Ft)</Label>
                  <Input
                    type="number"
                    value={estimatedSqFt}
                    onChange={(e) => setEstimatedSqFt(Number(e.target.value))}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    e.g. 5 Marla = ~1200 sq.ft covered area
                  </p>
                </div>

                <div className="md:col-span-2 bg-muted/30 p-3 rounded-xl border text-xs flex flex-col justify-center">
                  <span className="font-bold text-muted-foreground">Summary of Included Items:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedSpaces.length} Spaces Selected
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedTrades.length} Trades Selected
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {customItems.length} Custom Rates Added
                    </Badge>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Grade: {qualityGrade.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* SELECTION GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* SPACES SELECTOR */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center justify-between border-b pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-[#dfb96c]" /> Select Spaces to Renovate
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({selectedSpaces.length} chosen)
                    </span>
                  </h3>

                  <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 text-xs">
                    {ratesConfig.spaces.map((sp) => {
                      const checked = selectedSpaces.includes(sp.id);
                      return (
                        <div
                          key={sp.id}
                          onClick={() => {
                            if (checked) setSelectedSpaces(prev => prev.filter(i => i !== sp.id));
                            else setSelectedSpaces(prev => [...prev, sp.id]);
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${checked ? 'bg-[#dfb96c]/15 border-[#dfb96c]' : 'bg-background hover:bg-muted/40'}`}
                        >
                          <div>
                            <span className="font-bold">{sp.nameEn}</span>
                            <span className="text-[11px] text-muted-foreground block font-urdu">{sp.nameUr}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="h-4 w-4 accent-[#dfb96c]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TRADES SELECTOR */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center justify-between border-b pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-[#dfb96c]" /> Select Work Sections / Trades
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({selectedTrades.length} chosen)
                    </span>
                  </h3>

                  <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 text-xs">
                    {ratesConfig.trades.map((tr) => {
                      const checked = selectedTrades.includes(tr.id);
                      return (
                        <div
                          key={tr.id}
                          onClick={() => {
                            if (checked) setSelectedTrades(prev => prev.filter(i => i !== tr.id));
                            else setSelectedTrades(prev => [...prev, tr.id]);
                          }}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${checked ? 'bg-[#dfb96c]/15 border-[#dfb96c]' : 'bg-background hover:bg-muted/40'}`}
                        >
                          <div>
                            <span className="font-bold">{tr.nameEn}</span>
                            <span className="text-[11px] text-muted-foreground block font-urdu">{tr.nameUr}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="h-4 w-4 accent-[#dfb96c]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CUSTOM RATE ADDITION SECTION */}
              <div className="bg-muted/20 p-4 rounded-xl border space-y-3 mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-[#dfb96c]" /> Add Custom Renovation Item or Specific Rate
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Input
                    placeholder="Item name (e.g. Custom Onyx Backlight)"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Rate (PKR)"
                    value={customItemRate}
                    onChange={(e) => setCustomItemRate(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                  <Button
                    onClick={handleAddCustomItem}
                    size="sm"
                    className="bg-[#dfb96c] text-slate-950 font-bold text-xs"
                  >
                    Add Custom Rate
                  </Button>
                </div>

                {customItems.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {customItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-background p-2 rounded border">
                        <span className="font-semibold">{item.name} ({item.qty} x PKR {item.rate})</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600">PKR {(item.rate * item.qty).toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomItem(item.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ESTIMATED GRAND TOTAL BOX */}
              <div className="bg-slate-950 text-white p-6 rounded-2xl border border-[#dfb96c]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#dfb96c] font-bold">Estimated House Renovation Cost</span>
                    <h3 className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
                      PKR {estimatorCalculation.grandTotalPKR.toLocaleString()}
                    </h3>
                  </div>

                  <Button
                    onClick={() => {
                      setMainTab('inquiry');
                      setSelectedFormCategory(`Custom Renovation (${selectedSpaces.length} Spaces)`);
                    }}
                    className="bg-[#dfb96c] text-slate-950 hover:bg-[#c9a358] font-bold text-xs gap-2"
                  >
                    <Send className="h-4 w-4" /> Request Site Engineer Survey & Quote
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Spaces Renovation Total:</span>
                    <strong className="text-white font-mono text-sm">PKR {estimatorCalculation.spacesTotal.toLocaleString()}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Work Trades Allocation:</span>
                    <strong className="text-white font-mono text-sm">PKR {estimatorCalculation.tradesTotal.toLocaleString()}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Custom Items Added:</span>
                    <strong className="text-white font-mono text-sm">PKR {estimatorCalculation.customTotal.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 4: REQUEST SITE VISIT & QUOTE FORM                    */}
        {/* ========================================================= */}
        {mainTab === 'inquiry' && (
          <section className="max-w-3xl mx-auto">
            <Card className="border-[#dfb96c]/40 shadow-lg">
              <CardHeader className="bg-slate-950 text-white rounded-t-xl">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#dfb96c]" />
                  {isUrdu ? 'ری نوویشن سائٹ وزٹ اور باضابطہ کوٹیشن فارم' : 'Request On-Site Engineer Survey & Quotation'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  {isUrdu
                    ? 'ہمارے تجربہ کار سائٹ انجینئرز آپ کی سائٹ کا معائنہ کر کے تفصیلی پلان فراہم کریں گے۔'
                    : 'Get a formal architectural site inspection and material estimation directly from our civil engineers.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Client Full Name *</Label>
                      <Input
                        required
                        placeholder="e.g. Muhammad Ali"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">WhatsApp / Phone Number *</Label>
                      <Input
                        required
                        placeholder="e.g. 0300 1234567"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold">City / Location</Label>
                      <Input
                        placeholder="e.g. Islamabad, Lahore, Rawalpindi"
                        value={clientCity}
                        onChange={(e) => setClientCity(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Property Type</Label>
                      <select
                        value={propertyType}
                        onChange={(e: any) => setPropertyType(e.target.value)}
                        className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="house">House / Villa</option>
                        <option value="plaza">Commercial Plaza</option>
                        <option value="office">Office Workspace</option>
                        <option value="other">Other Building</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Approx Covered Sq.Ft</Label>
                      <Input
                        value={estimatedArea}
                        onChange={(e) => setEstimatedArea(e.target.value)}
                        className="mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Renovation Details & Special Instructions</Label>
                    <Textarea
                      placeholder="Mention specific details like bathroom tiles, marble polishing, electrical wiring requirements, kitchen cabinets..."
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      className="mt-1 text-xs h-24"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#dfb96c] text-slate-950 hover:bg-[#c9a358] font-bold py-6 gap-2"
                  >
                    {isSubmitting ? (
                      <span>Submitting Request...</span>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        {isUrdu ? 'درخواست جمع کریں اور واٹس ایپ پر پیغام دیں' : 'Submit & Connect on WhatsApp'}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
