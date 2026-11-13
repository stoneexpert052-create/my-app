'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/header';
import { useCalculation } from '@/context/calculation-context';
import { useLanguage } from '@/context/language-context';
import { marbles } from '@/lib/data';
import { findMatchingVariant, calculateCostForMarble } from '@/components/requirement-card';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Scale, Check, RefreshCw, AlertCircle, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMarbles, getHomepageConfig } from '@/lib/admin-actions';
import type { Marble } from '@/lib/types';
import {
  DEFAULT_CALCULATOR_CATEGORIES,
  filterMarblesForRequirement,
  getMarbleCategory,
  getRequirementRecommendationTitle,
  getRecommendedCategoriesForRequirement,
  isFacadeItem
} from '@/lib/calculator-categories';

export default function CompareClient({ marbleId: propMarbleId }: { marbleId?: string } = {}) {
  const router = useRouter();
  const params = useParams();
  const { requirements, updateRequirement } = useCalculation();
  const { language } = useLanguage();
  const { toast } = useToast();

  const marbleId = propMarbleId || (params?.marbleId as string) || '';
  const [marblesList, setMarblesList] = useState<Marble[]>(marbles);
  const [calcCategories, setCalcCategories] = useState<Record<string, string[]>>(DEFAULT_CALCULATOR_CATEGORIES);
  const [reqFilters, setReqFilters] = useState<Record<number, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [dbMarbles, homepageConfig] = await Promise.all([
          getMarbles().catch(() => null),
          getHomepageConfig().catch(() => null)
        ]);

        if (dbMarbles && dbMarbles.length > 0) {
          setMarblesList(dbMarbles);
        }

        if (homepageConfig && homepageConfig.calculatorCategories) {
          setCalcCategories(prev => ({
            ...prev,
            ...homepageConfig.calculatorCategories
          }));
        }
      } catch (e) {
        console.warn("Using fallback data for compare page:", e);
      }
    }

    loadData();

    // Listen for live updates when admin edits categories in Admin Settings
    const handleUpdate = (e: any) => {
      if (e.detail?.calculatorCategories) {
        setCalcCategories(prev => ({
          ...prev,
          ...e.detail.calculatorCategories
        }));
      }
    };
    window.addEventListener('homepage_updated', handleUpdate);
    return () => {
      window.removeEventListener('homepage_updated', handleUpdate);
    };
  }, []);

  const getOriginLabel = (origin: string) => {
    if (language === 'ur') {
      return origin === 'Imported' ? 'امپورٹڈ (غیر ملکی)' : 'لوکل (ملکی)';
    }
    return origin === 'Imported' ? 'Imported' : 'Local';
  };

  const getArtificialLabel = (materialType: string, name: string = '') => {
    const isArtificial = materialType === 'Artificial Stone' || materialType === 'Corian' || name.toLowerCase().includes('artificial');
    if (language === 'ur') {
      return isArtificial ? 'مصنوعی (Artificial)' : 'قدرتی (Natural)';
    }
    return isArtificial ? 'Artificial' : 'Natural';
  };

  const getMaterialLabel = (materialType: string) => {
    if (language === 'ur') {
      switch (materialType) {
        case 'Marble': return 'ماربل';
        case 'Granite': return 'گرینائٹ';
        case 'Limestone': return 'لائم اسٹون';
        case 'Artificial Stone': return 'مصنوعی پتھر';
        case '12x24 Tiles': return 'ٹائلز';
        case 'Corian': return 'کوریان';
        case 'Facade Stone': return 'فیساڈ پتھر';
        case 'Inlay': return 'انلے';
        case 'Antique': return 'اینٹیک';
        case 'Vanity': return 'وینیٹی';
        case 'MDM Material': return 'ایم ڈی ایم مٹیریل';
        default: return materialType;
      }
    }
    return materialType;
  };

  // Filter requirements that are actual marble selections (not fixing materials or labor quotes)
  const compareRequirements = useMemo(() => {
    return requirements.filter(req => req.type !== 'fixing_material' && req.type !== 'labor_quote' && req.marble);
  }, [requirements]);

  const handleSwapMaterial = (
    reqId: number,
    targetMarble: Marble,
    targetVariant: any,
    calculatedTotal: number,
    calculatedDetails: any
  ) => {
    updateRequirement(reqId, {
      marble: targetMarble,
      marbleId: targetMarble.id,
      variant: targetVariant,
      variantId: targetVariant.id,
      total: calculatedTotal,
      details: calculatedDetails,
    });
    
    toast({
      title: language === 'ur' ? 'مواد کامیابی سے تبدیل ہو گیا!' : 'Material Successfully Swapped!',
      description: language === 'ur' 
        ? `اس آئٹم کے لیے مواد کو "${targetMarble.name}" میں تبدیل کر دیا گیا ہے۔` 
        : `Swapped this item to "${targetMarble.name}". Quotation has been recomputed.`,
    });

    // Return to the quotation page
    router.push(`/order/${marbleId}`);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-6xl">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-background p-4 md:p-6 rounded-xl border shadow-sm">
              <div className="flex items-start gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push(`/order/${marbleId}`)}
                  className="border-border text-foreground hover:bg-muted font-semibold mt-0.5 shrink-0"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {language === 'ur' ? 'بلڈر پر واپس جائیں' : 'Back to Builder'}
                </Button>
                <div>
                  <h1 className="font-headline text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-6 w-6 text-blue-600 shrink-0" />
                    {language === 'ur' ? 'موزوں مٹیریل کا لاگت موازنہ' : 'Material Cost & Design Comparison'}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    {language === 'ur' 
                      ? 'ایڈمن پینل کی تجویز کردہ کیٹیگریز کے مطابق اپنی پیمائش پر مختلف پتھروں کی قیمت اور لاگت کا موازنہ کریں۔' 
                      : 'Compare costs for materials recommended by the Admin Panel based on your configured measurements.'}
                  </p>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900/50">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {language === 'ur' ? 'ایڈمن سیٹنگز کے مطابق خودکار فلٹرنگ فعال ہے' : 'Admin recommended filtering active'}
                </span>
              </div>
            </div>

            {compareRequirements.length === 0 ? (
              <Card className="p-8 text-center border-gray-200">
                <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/60" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {language === 'ur' ? 'کوئی موزوں آئٹم نہیں ملا' : 'No Items Found to Compare'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {language === 'ur' 
                        ? 'موازنہ کرنے سے پہلے براہ کرم کوٹیشن بلڈر میں کوئی کچن، سیڑھیاں، فلورنگ یا فیساڈ آئٹم شامل کریں۔' 
                        : 'Please add a Kitchen, Stairs, Floor or Facade item in the Quotation Builder to compare alternative materials.'}
                    </p>
                  </div>
                  <Button onClick={() => router.push(`/order/${marbleId}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    {language === 'ur' ? 'بلڈر پر واپس جائیں' : 'Go to Builder'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-12">
                {compareRequirements.map((req) => {
                  const activeFilter = reqFilters[req.id] || 'recommended';
                  const recommendation = getRequirementRecommendationTitle(req, language);
                  const allowedCategories = getRecommendedCategoriesForRequirement(req, calcCategories);

                  // Filter marbles strictly for this requirement based on active filter
                  const displayedMarbles = filterMarblesForRequirement(marblesList, req, calcCategories, activeFilter);
                  const recommendedMarbles = filterMarblesForRequirement(marblesList, req, calcCategories, 'recommended');
                  const allCompatibleMarbles = filterMarblesForRequirement(marblesList, req, calcCategories, 'all');

                  // Extract all available categories for the pills
                  const availableCategories = Array.from(
                    new Set(allCompatibleMarbles.map(m => getMarbleCategory(m)))
                  ).filter(Boolean);

                  // Calculate comparisons
                  const reqComparisons = displayedMarbles
                    .map(m => {
                      const variant = findMatchingVariant(req.variant, m);
                      const { total, details: calcDetails } = calculateCostForMarble(req, m, variant);
                      return {
                        marble: m,
                        variant,
                        total,
                        details: calcDetails,
                      };
                    })
                    .filter(item => item.variant && item.total > 0)
                    .sort((a, b) => a.total - b.total);

                  const isFacade = isFacadeItem(req);

                  return (
                    <div key={req.id} className="space-y-5 bg-background p-5 md:p-6 rounded-2xl border shadow-sm">
                      {/* Requirement Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-foreground">
                              {req.name}
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                              {req.type}
                            </span>
                            {isFacade && (
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                {language === 'ur' ? 'فیساڈ اسٹون' : 'Facade Cladding'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="font-medium text-foreground">
                              {language === 'ur' ? 'موجودہ انتخاب:' : 'Current Selection:'}
                            </span>
                            <span className="font-bold text-blue-600">{req.marble?.name}</span>
                            {req.variant && (
                              <span className="text-muted-foreground">
                                ({req.variant.size} - {req.variant.thickness} @ PKR {req.variant.price?.toLocaleString()}/sq.ft)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 bg-muted/40 px-4 py-2 rounded-xl border shrink-0">
                          <div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {language === 'ur' ? 'موجودہ کل رقم' : 'Current Item Total'}
                            </p>
                            <p className="text-lg font-black text-foreground">
                              PKR <span className="text-blue-600">{req.total.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Admin Recommendation Context Banner */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-foreground">
                              {recommendation.label}
                            </h3>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {recommendation.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground mr-1">
                                {language === 'ur' ? 'ایڈمن تجویز کردہ کیٹیگریز:' : 'Admin Categories:'}
                              </span>
                              {allowedCategories.map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {activeFilter !== 'recommended' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setReqFilters(prev => ({ ...prev, [req.id]: 'recommended' }))}
                            className="text-xs font-bold text-blue-700 bg-white dark:bg-slate-800 border shadow-2xs hover:bg-blue-50 self-start sm:self-center shrink-0"
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            {language === 'ur' ? 'تجویز کردہ پر واپس جائیں' : 'Back to Recommended'}
                          </Button>
                        )}
                      </div>

                      {/* Filter Pills Bar */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                          <Filter className="w-3.5 h-3.5" />
                          <span>{language === 'ur' ? 'فلٹر منتخب کریں:' : 'Filter Categories:'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Recommended Option (Default) */}
                          <button
                            type="button"
                            onClick={() => setReqFilters(prev => ({ ...prev, [req.id]: 'recommended' }))}
                            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              activeFilter === 'recommended'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${activeFilter === 'recommended' ? 'text-amber-300' : 'text-blue-600'}`} />
                            <span>
                              {language === 'ur' ? 'تجویز کردہ مواد' : 'Recommended'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              activeFilter === 'recommended' ? 'bg-blue-700 text-white' : 'bg-muted text-foreground'
                            }`}>
                              {recommendedMarbles.length}
                            </span>
                          </button>

                          {/* All Compatible Option */}
                          <button
                            type="button"
                            onClick={() => setReqFilters(prev => ({ ...prev, [req.id]: 'all' }))}
                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              activeFilter === 'all'
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            <span>{language === 'ur' ? 'تمام موزوں مواد' : 'All Compatible'}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              activeFilter === 'all' ? 'bg-background/20 text-background' : 'bg-muted text-foreground'
                            }`}>
                              {allCompatibleMarbles.length}
                            </span>
                          </button>

                          {/* Specific Category Pills */}
                          {availableCategories.map(cat => {
                            const count = allCompatibleMarbles.filter(m => getMarbleCategory(m) === cat).length;
                            const isSelected = activeFilter === cat;
                            const isRecommendedCat = allowedCategories.includes(cat);

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setReqFilters(prev => ({ ...prev, [req.id]: cat }))}
                                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold'
                                    : isRecommendedCat
                                    ? 'bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100/50'
                                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                <span>{cat}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  isSelected ? 'bg-blue-700 text-white' : 'bg-muted text-foreground'
                                }`}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comparisons Results Counter */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>
                          {language === 'ur'
                            ? `دستیاب مواد: ${reqComparisons.length} (قیمت کے لحاظ سے ترتیب شدہ)`
                            : `Showing ${reqComparisons.length} materials (Sorted by lowest to highest total)`}
                        </span>
                        <span className="text-[11px] text-blue-600 font-medium hidden sm:inline">
                          {language === 'ur' ? 'تبدیل کرنے کے لیے بٹن پر کلک کریں' : 'Click "Swap" to apply changes to quotation'}
                        </span>
                      </div>

                      {/* Comparison Grid */}
                      {reqComparisons.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-semibold">
                            {language === 'ur' ? 'اس فلٹر کے لیے کوئی مواد دستیاب نہیں ہے' : 'No materials found for this filter'}
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setReqFilters(prev => ({ ...prev, [req.id]: 'recommended' }))}
                            className="text-xs text-blue-600 font-bold mt-1"
                          >
                            {language === 'ur' ? 'تجویز کردہ مواد دیکھیں' : 'View Recommended Materials'}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {reqComparisons.map((item) => {
                            const isCurrent = item.marble.id === req.marbleId;
                            const diff = item.total - req.total;
                            const percentDiff = req.total > 0 ? (diff / req.total) * 100 : 0;
                            const details = item.details || {};

                            const materialCost = details.materialCost || details.floorMaterialCost || details.marbleTotal || 0;
                            const edgeCost = details.edgeProfileCost || 0;
                            const otherCost = (details.sinkCost || 0) + (details.stoveCost || 0) + (details.innerCutCost || 0) + (details.skirtingPolishCost || 0) + (details.lutakCost || 0) + (details.cuttingCost || 0);

                            return (
                              <Card 
                                key={item.marble.id} 
                                className={`overflow-hidden transition-all duration-300 flex flex-col justify-between border-2 ${
                                  isCurrent 
                                    ? 'border-blue-600 shadow-md ring-2 ring-blue-600/20 bg-blue-50/10' 
                                    : 'border-border/80 hover:border-blue-400 hover:shadow-lg bg-card'
                                }`}
                              >
                                <div>
                                  {/* Card Image and Header */}
                                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                                    {item.marble.imageUrl ? (
                                      <Image
                                        src={item.marble.imageUrl}
                                        alt={item.marble.name}
                                        fill
                                        className="object-cover transition-transform duration-500 hover:scale-105"
                                        referrerPolicy="no-referrer"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                                        NO IMG
                                      </div>
                                    )}

                                    {/* Badges on Image */}
                                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                                      {isCurrent && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white shadow-md">
                                          {language === 'ur' ? 'موجودہ انتخاب' : 'Current'}
                                        </span>
                                      )}
                                      {!isCurrent && diff < 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-md">
                                          {language === 'ur' ? `${Math.abs(percentDiff).toFixed(0)}% بچت` : `Save ${Math.abs(percentDiff).toFixed(0)}%`}
                                        </span>
                                      )}
                                      {!isCurrent && diff > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 text-white shadow-md">
                                          {language === 'ur' ? `+${percentDiff.toFixed(0)}% زائد` : `+${percentDiff.toFixed(0)}%`}
                                        </span>
                                      )}
                                    </div>

                                    <div className="absolute top-2.5 right-2.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/70 text-white backdrop-blur-xs">
                                        {getOriginLabel(item.marble.origin)}
                                      </span>
                                    </div>
                                  </div>

                                  <CardHeader className="p-4 pb-2 space-y-2">
                                    <div className="space-y-1">
                                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1" title={item.marble.name}>
                                        {item.marble.name}
                                      </CardTitle>
                                      
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                                          {getMarbleCategory(item.marble)}
                                        </span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                                          {getMaterialLabel(item.marble.materialType)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {getArtificialLabel(item.marble.materialType, item.marble.name)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pt-2 border-t flex items-baseline justify-between">
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {language === 'ur' ? 'فی اسکوائر فٹ ریٹ:' : 'Rate per sq.ft:'}
                                      </span>
                                      <span className="text-xs font-bold text-foreground">
                                        PKR <span className="text-blue-600 font-extrabold text-sm">{item.variant?.price?.toLocaleString() || 0}</span>
                                      </span>
                                    </div>
                                  </CardHeader>
                                  
                                  <CardContent className="p-4 pt-1 space-y-3">
                                    {/* Cost Breakdown Details */}
                                    <div className="space-y-1.5 text-xs bg-muted/30 p-2.5 rounded-lg border">
                                      {materialCost > 0 && (
                                        <div className="flex justify-between items-center text-muted-foreground">
                                          <span>{language === 'ur' ? 'مواد لاگت:' : 'Material Cost:'}</span>
                                          <span className="text-foreground font-semibold">PKR {materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                      )}
                                      
                                      {edgeCost > 0 && (
                                        <div className="flex justify-between items-center text-muted-foreground">
                                          <span>{language === 'ur' ? 'ایج پروفائل:' : 'Edge Profile:'}</span>
                                          <span className="text-foreground font-semibold">PKR {edgeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                      )}

                                      {otherCost > 0 && (
                                        <div className="flex justify-between items-center text-muted-foreground">
                                          <span>{language === 'ur' ? 'کٹنگ و سوراخ:' : 'Cutting & Sinks:'}</span>
                                          <span className="text-foreground font-semibold">PKR {otherCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                      )}

                                      <Separator className="my-1" />
                                      
                                      <div className="flex justify-between items-center text-sm font-bold text-foreground pt-0.5">
                                        <span>{language === 'ur' ? 'کل متوقع رقم:' : 'Total Calculated:'}</span>
                                        <span className="text-foreground font-bold">
                                          PKR <span className="text-blue-600 font-black text-base">{item.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </div>

                                <div className="p-4 pt-0">
                                  {isCurrent ? (
                                    <Button 
                                      className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-600 font-bold h-9 text-xs" 
                                      variant="ghost"
                                      disabled
                                    >
                                      <Check className="mr-1.5 h-3.5 w-3.5" />
                                      {language === 'ur' ? 'موجودہ انتخاب ہے' : 'Active Selection'}
                                    </Button>
                                  ) : (
                                    <Button 
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs cursor-pointer shadow-sm hover:shadow"
                                      onClick={() => handleSwapMaterial(req.id, item.marble, item.variant, item.total, item.details)}
                                    >
                                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                      {language === 'ur' ? 'یہ مواد تبدیل کریں' : 'Swap to this Material'}
                                      <ChevronRight className="ml-1 h-3.5 w-3.5 opacity-70" />
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}