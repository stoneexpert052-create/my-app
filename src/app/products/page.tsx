'use client';

import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { useState, useEffect, useMemo } from 'react';
import { getMarbles, getFixingMaterials, getServiceProviders, subscribeToAppUpdates } from '@/lib/admin-actions';
import type { Marble, FixingMaterial, ServiceProvider } from '@/lib/types';
import { MarbleCard } from '@/components/marble-card';
import { FixingMaterialCard } from '@/components/fixing-material-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  ArrowLeft, 
  Star, 
  Phone, 
  Users, 
  Tag, 
  Facebook, 
  Instagram, 
  Calculator,
  ShoppingCart,
  Layers,
  Wrench,
  Gem,
  Info,
  Calendar,
  X,
  FileText,
  Maximize
} from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFullscreenImage } from '@/context/fullscreen-image-context';

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const { openImage } = useFullscreenImage();
  
  // Data States
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [fixingMaterials, setFixingMaterials] = useState<FixingMaterial[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [activeCategory, setActiveCategory] = useState<'stone' | 'tool_chemical' | 'business'>('stone');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoneType, setSelectedStoneType] = useState('All');
  const [selectedToolChemicalType, setSelectedToolChemicalType] = useState('All');

  // Popup Detail States
  const [selectedMarble, setSelectedMarble] = useState<Marble | null>(null);
  const [isMarbleDialogOpen, setIsMarbleDialogOpen] = useState(false);
  const [activeMarbleImage, setActiveMarbleImage] = useState('');

  const [selectedFixingMaterial, setSelectedFixingMaterial] = useState<FixingMaterial | null>(null);
  const [isFixingMaterialDialogOpen, setIsFixingMaterialDialogOpen] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

  // Load Data
  useEffect(() => {
    async function loadAllData(showLoading = true) {
      if (showLoading) setIsLoading(true);
      try {
        const [marblesData, fixingData, providersData] = await Promise.all([
          getMarbles(),
          getFixingMaterials(),
          getServiceProviders()
        ]);
        setMarbles(marblesData || []);
        setFixingMaterials(fixingData || []);
        // Only active service providers
        setServiceProviders((providersData || []).filter(p => p.status === 'active'));
      } catch (e) {
        console.error("Failed to load catalog data", e);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    }
    loadAllData(true);

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'products_updated' || event.type === 'category_order_updated') {
        loadAllData(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Stone Sub-Types Memo
  const stoneTypes = useMemo(() => {
    const types = new Set(
      marbles.map(m => m.materialType)
    );
    return ['All', ...Array.from(types)];
  }, [marbles]);

  // Tool & Chemical Types Memo
  const toolChemicalTypes = useMemo(() => {
    const types = new Set(fixingMaterials.map(m => m.category));
    return ['All', ...Array.from(types)];
  }, [fixingMaterials]);

  // Handle Stone Selection Click to open popup
  const handleMarbleClick = (marble: Marble) => {
    setSelectedMarble(marble);
    setActiveMarbleImage(marble.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(marble.name)}`);
    setIsMarbleDialogOpen(true);
  };

  // Handle Fixing Material Click to open popup
  const handleFixingMaterialClick = (material: FixingMaterial) => {
    setSelectedFixingMaterial(material);
    setIsFixingMaterialDialogOpen(true);
  };

  // Handle Provider Click to open popup
  const handleProviderClick = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setIsProviderDialogOpen(true);
  };

  // Filtering Logic
  const filteredStones = useMemo(() => {
    if (activeCategory !== 'stone') return [];
    return marbles.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.materialType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (m.origin && m.origin.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedStoneType === 'All' || m.materialType === selectedStoneType;
      return matchesSearch && matchesType && !m.isHidden;
    });
  }, [marbles, searchQuery, selectedStoneType, activeCategory]);

  const filteredToolsAndChemicals = useMemo(() => {
    if (activeCategory !== 'tool_chemical') return [];
    return fixingMaterials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedToolChemicalType === 'All' || m.category === selectedToolChemicalType;
      return matchesSearch && matchesType;
    });
  }, [fixingMaterials, searchQuery, selectedToolChemicalType, activeCategory]);

  const filteredBusinesses = useMemo(() => {
    if (activeCategory !== 'business') return [];
    return serviceProviders.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.phone.includes(searchQuery);
      return matchesSearch;
    });
  }, [serviceProviders, searchQuery, activeCategory]);

  // Current active results count
  const resultsCount = useMemo(() => {
    if (activeCategory === 'stone') return filteredStones.length;
    if (activeCategory === 'tool_chemical') return filteredToolsAndChemicals.length;
    if (activeCategory === 'business') return filteredBusinesses.length;
    return 0;
  }, [activeCategory, filteredStones, filteredToolsAndChemicals, filteredBusinesses]);

  // Clear search or filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStoneType('All');
    setSelectedToolChemicalType('All');
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background mt-16 md:mt-24">
        {/* Back and Navigation Header */}
        <div className="container px-4 md:px-6 max-w-6xl mx-auto pt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-full font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            asChild
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span>{language === 'ur' ? 'مرکزی صفحہ پر واپس' : 'Back to Home'}</span>
            </Link>
          </Button>
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:block">
            {language === 'ur' ? 'پتھر اور مٹیریلز کیٹلاگ' : 'Stones & Supplies Catalog'}
          </div>
        </div>

        {/* Hero Section */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6 text-center max-w-4xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{language === 'ur' ? 'ہمارا پروڈکٹ کیٹلاگ' : 'Premium Catalogue'}</span>
            </div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-foreground">
              {language === 'ur' ? 'ہمارے پریمیم مصنوعات اور خدمات' : 'Our Premium Products & Services'}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-md max-w-2xl mx-auto leading-relaxed">
              {language === 'ur'
                ? 'بہترین معیار کے حامل سنگِ مرمر، گرینائٹ، کارآمد کیمیکلز، اوزار اور ہماری ٹیم کے ماہرین کی خدمات، سب ایک ہی جگہ۔'
                : 'Browse our exquisite selection of stones, professional chemical formulations, specialized tools, and connect with verified local business experts.'}
            </p>
          </div>
        </section>

        {/* Main Category Selection Tabs & Filters */}
        <section className="border-y py-6 bg-muted/20">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto space-y-6">
            
            {/* Category Button Group */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center sm:text-left">
                {language === 'ur' ? 'اہم کیٹیگری منتخب کریں:' : 'Select Main Category:'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant={activeCategory === 'stone' ? 'default' : 'outline'}
                  onClick={() => { setActiveCategory('stone'); resetFilters(); }}
                  className={cn(
                    "h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all",
                    activeCategory === 'stone' ? "scale-102 ring-2 ring-primary/20" : "hover:bg-background"
                  )}
                >
                  <span className="text-base sm:text-lg">🪨</span>
                  <span>{language === 'ur' ? 'پتھر کولیکشن' : 'Stone Collection'}</span>
                </Button>
                <Button
                  variant={activeCategory === 'tool_chemical' ? 'default' : 'outline'}
                  onClick={() => { setActiveCategory('tool_chemical'); resetFilters(); }}
                  className={cn(
                    "h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all",
                    activeCategory === 'tool_chemical' ? "scale-102 ring-2 ring-primary/20" : "hover:bg-background"
                  )}
                >
                  <span className="text-base sm:text-lg">🛠️</span>
                  <span>{language === 'ur' ? 'ٹولز اور کیمیکلز' : 'Tools & Chemicals'}</span>
                </Button>
                <Button
                  variant={activeCategory === 'business' ? 'default' : 'outline'}
                  onClick={() => { setActiveCategory('business'); resetFilters(); }}
                  className={cn(
                    "h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all",
                    activeCategory === 'business' ? "scale-102 ring-2 ring-primary/20" : "hover:bg-background"
                  )}
                >
                  <span className="text-base sm:text-lg">💼</span>
                  <span>{language === 'ur' ? 'سروس فراہم کنندگان' : 'Expert Businesses'}</span>
                </Button>
              </div>
            </div>

            {/* Search Input & Sub-filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-border/40">
              
              {/* Dynamic Search Bar */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={
                    activeCategory === 'stone'
                      ? (language === 'ur' ? 'ماربل، گرینائٹ یا ملک تلاش کریں...' : 'Search marble, granite, origin...')
                      : activeCategory === 'tool_chemical'
                      ? (language === 'ur' ? 'ٹولز، اوزار یا کیمیکلز تلاش کریں...' : 'Search tools, epoxies, chemicals...')
                      : (language === 'ur' ? 'ماہر، کمپنی یا سروس تلاش کریں...' : 'Search providers, teams, services...')
                  }
                  className="pl-10 h-11 rounded-xl bg-background border-border/80 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sub-Type Filters (Only for Stones category) */}
              {activeCategory === 'stone' && (
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden lg:block shrink-0 mr-1" />
                  {stoneTypes.map((type) => (
                    <Button
                      key={type}
                      variant={selectedStoneType === type ? 'secondary' : 'outline'}
                      size="sm"
                      className={cn(
                        "rounded-full font-semibold h-8 px-4 shrink-0 transition-all text-xs",
                        selectedStoneType === type ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/25" : ""
                      )}
                      onClick={() => setSelectedStoneType(type)}
                    >
                      {type === 'All' ? (language === 'ur' ? 'تمام پتھر' : 'All Stones') : type}
                    </Button>
                  ))}
                </div>
              )}

              {/* Sub-Type Filters (Only for Tools & Chemicals category) */}
              {activeCategory === 'tool_chemical' && (
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden lg:block shrink-0 mr-1" />
                  {toolChemicalTypes.map((type) => (
                    <Button
                      key={type}
                      variant={selectedToolChemicalType === type ? 'secondary' : 'outline'}
                      size="sm"
                      className={cn(
                        "rounded-full font-semibold h-8 px-4 shrink-0 transition-all text-xs",
                        selectedToolChemicalType === type ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/25" : ""
                      )}
                      onClick={() => setSelectedToolChemicalType(type)}
                    >
                      {type === 'All' ? (language === 'ur' ? 'تمام مٹیریل' : 'All Materials') : type}
                    </Button>
                  ))}
                </div>
              )}

              {/* Results status indicator */}
              <div className="text-xs text-muted-foreground font-medium shrink-0 self-start sm:self-center">
                {language === 'ur' 
                  ? `کل نتائج: ${resultsCount}`
                  : `Found ${resultsCount} matching item${resultsCount === 1 ? '' : 's'}`
                }
              </div>
            </div>

          </div>
        </section>

        {/* Catalog Grid Section */}
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-3 border rounded-xl p-4">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : resultsCount > 0 ? (
              <>
                {/* 1. Stone Catalog */}
                {activeCategory === 'stone' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filteredStones.map((marble) => (
                      <MarbleCard 
                        key={marble.id} 
                        marble={marble} 
                        onImageClick={handleMarbleClick}
                      />
                    ))}
                  </div>
                )}

                {/* 3. Tools & Chemicals Catalog */}
                {activeCategory === 'tool_chemical' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filteredToolsAndChemicals.map((material) => (
                      <FixingMaterialCard 
                        key={material.id} 
                        material={material} 
                        onImageClick={handleFixingMaterialClick}
                      />
                    ))}
                  </div>
                )}

                {/* 4. Service Providers / Businesses Catalog */}
                {activeCategory === 'business' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filteredBusinesses.map((provider) => (
                      <Card 
                        key={provider.id} 
                        className="group flex flex-col hover:shadow-xl transition-all duration-300 border border-border/85 cursor-pointer rounded-2xl overflow-hidden hover:-translate-y-1"
                        onClick={() => handleProviderClick(provider)}
                      >
                        <CardHeader className="flex flex-row items-center gap-4 p-5">
                          <Image 
                            src={provider.imageUrl || '/images/placeholder-avatar.png'} 
                            alt={provider.name} 
                            width={70} 
                            height={70} 
                            className="rounded-full object-cover border-4 border-secondary shrink-0"
                          />
                          <div className="space-y-1">
                            <CardTitle className="font-headline font-bold text-base md:text-lg group-hover:text-primary transition-colors">
                              {provider.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                              {provider.service}
                            </CardDescription>
                            {provider.rating && (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={cn(
                                      "h-3.5 w-3.5", 
                                      i < provider.rating! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                                    )} 
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        
                        {provider.gallery && provider.gallery.length > 0 && (
                          <CardContent className="p-0 border-y border-border/40">
                            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                              <Image 
                                src={provider.gallery[0].url} 
                                alt={provider.gallery[0].altText || 'Work sample'} 
                                fill 
                                className="object-cover transition-transform duration-500 group-hover:scale-105" 
                              />
                            </div>
                          </CardContent>
                        )}

                        <CardContent className="p-5 pt-4 flex-grow">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {language === 'ur'
                              ? 'سنگ مرمر اور گرینائٹ کی کٹنگ، پالشنگ اور فکسنگ کی اعلیٰ ترین اور پریمیم خدمات فراہم کرنے والی تصدیق شدہ ماہر ٹیم۔'
                              : 'Professional team specializing in quality marble installation, diamond polishing, and custom edge profiling services.'}
                          </p>
                        </CardContent>

                        <CardFooter className="p-5 pt-0 flex items-center justify-between mt-auto gap-2">
                          <div className="flex items-center gap-1 shrink-0">
                            {provider.socials?.whatsapp && (
                              <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={e => e.stopPropagation()}>
                                <a href={`https://wa.me/${provider.socials.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp Chat">
                                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-green-500"><title>WhatsApp</title><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/></svg>
                                </a>
                              </Button>
                            )}
                            {provider.socials?.facebook && (
                              <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-blue-600" onClick={e => e.stopPropagation()}>
                                <a href={provider.socials.facebook} target="_blank" rel="noopener noreferrer" title="Facebook Page">
                                  <Facebook className="h-5 w-5" />
                                </a>
                              </Button>
                            )}
                            {provider.socials?.instagram && (
                              <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-pink-500" onClick={e => e.stopPropagation()}>
                                <a href={provider.socials.instagram} target="_blank" rel="noopener noreferrer" title="Instagram Profile">
                                  <Instagram className="h-5 w-5" />
                                </a>
                              </Button>
                            )}
                          </div>
                          
                          <Button asChild variant="secondary" size="sm" className="rounded-full font-semibold px-4" onClick={e => e.stopPropagation()}>
                            <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{language === 'ur' ? 'ابھی کال کریں' : 'Call Now'}</span>
                            </a>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 max-w-xl mx-auto text-center">
                <Card className="border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-xl overflow-hidden rounded-3xl text-left p-6 sm:p-8 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-15 text-amber-500 pointer-events-none">
                    <Sparkles className="h-24 w-24" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1 text-xs uppercase tracking-wider">
                      {language === 'ur' ? 'عنقریب دستیاب' : 'Product Coming Soon'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3.5 w-3.5 text-amber-500" />
                      {language === 'ur' ? 'انوینٹری کی ریکویسٹ لاگ ہو گئی ہے' : 'Log added to system'}
                    </span>
                  </div>

                  <h3 className="font-headline text-2xl font-extrabold tracking-tight text-foreground mb-3">
                    {searchQuery ? `"${searchQuery}" is Coming Soon!` : 'No items match your filter'}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {language === 'ur'
                      ? `ہم نے آپ کے سرچ کی ورڈ کا نوٹ لے لیا ہے۔ ہماری پروکیورمنٹ ٹیم جلد ہی اسے انوینٹری میں لائے گی۔ اگر آپ کو فوری ضرورت ہے تو ہمارے سیلز نمائندے سے واٹس ایپ پر بات کریں۔`
                      : `We don't have this item in stock right now, but your search has been recorded for our inventory team! Contact our sales desk on WhatsApp for custom availability.`}
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    {searchQuery && (
                      <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-6 shadow-md gap-2 flex-1">
                        <a 
                          href={`https://wa.me/923005220000?text=${encodeURIComponent(`Hello Stone Expert team, I am searching for "${searchQuery}". Is this available for custom order or coming soon?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Phone className="h-4 w-4" />
                          {language === 'ur' ? 'واٹس ایپ پر پوچھیں' : 'Inquire on WhatsApp'}
                        </a>
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      className="rounded-xl h-11 px-5 font-semibold gap-2 border-border/80"
                      onClick={resetFilters}
                    >
                      {language === 'ur' ? 'تمام فلٹرز ختم کریں' : 'Reset Filters'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="flex w-full shrink-0 flex-col sm:flex-row items-center justify-between gap-4 border-t px-4 py-6 md:px-8 bg-muted/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 relative flex items-center justify-center rounded-full overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
            <Icons.logo alt="Stone Expert Logo" className="object-contain h-full w-full p-0.5" />
          </div>
          <span className="font-headline text-lg font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
        </Link>
        <p className="text-xs text-foreground/70">{t('footer_text')}</p>
      </footer>

      {/* =========================================================================
          POPUPS / DETAILED DIALOGS
          ========================================================================= */}

      {/* 1. Stone details Dialog */}
      <Dialog open={isMarbleDialogOpen} onOpenChange={setIsMarbleDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
          {selectedMarble && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side: Images */}
              <div className="relative bg-muted flex flex-col justify-between">
                <div 
                  className="relative aspect-video md:aspect-auto md:h-full min-h-[250px] w-full overflow-hidden cursor-pointer hover:opacity-95 transition-opacity group/image"
                  onClick={() => openImage(activeMarbleImage, selectedMarble.name)}
                  title="Click to view full screen"
                >
                  <Image 
                    src={activeMarbleImage} 
                    alt={selectedMarble.name} 
                    fill 
                    className="object-cover transition-transform duration-300 group-hover/image:scale-102" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-xs text-white px-2.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                    <Maximize className="h-3 w-3" /> Full Screen
                  </div>
                </div>
                {/* Image Gallery thumbnails */}
                {selectedMarble.gallery && selectedMarble.gallery.length > 0 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                    <div className="flex gap-1.5 p-1.5 rounded-xl bg-black/60 backdrop-blur-md max-w-full overflow-x-auto no-scrollbar">
                      <button 
                        onClick={() => setActiveMarbleImage(selectedMarble.imageUrl)}
                        className={cn(
                          "relative h-10 w-15 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                          activeMarbleImage === selectedMarble.imageUrl ? "border-primary scale-105" : "border-transparent opacity-70"
                        )}
                      >
                        <Image src={selectedMarble.imageUrl} alt={selectedMarble.name} fill className="object-cover" />
                      </button>
                      {selectedMarble.gallery.map((img) => (
                        <button 
                          key={img.id}
                          onClick={() => setActiveMarbleImage(img.url)}
                          className={cn(
                            "relative h-10 w-15 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                            activeMarbleImage === img.url ? "border-primary scale-105" : "border-transparent opacity-70"
                          )}
                        >
                          <Image src={img.url} alt={img.altText || selectedMarble.name} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Details */}
              <div className="p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full">
                        {selectedMarble.materialType}
                      </Badge>
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full">
                        {selectedMarble.origin}
                      </Badge>
                    </div>
                    <DialogTitle className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                      {selectedMarble.name}
                    </DialogTitle>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedMarble.description || (language === 'ur' ? 'یہ بہترین کوالٹی کا سنگِ مرمر ہے جو اعلیٰ ترین پالش اور خوبصورت بناوٹ کے لیے موزوں ہے۔' : 'Premium quality stone inspected carefully for unmatched texture and structure.')}
                  </p>

                  {/* Characteristics & Uses */}
                  <div className="space-y-4 pt-3 border-t border-border/45">
                    {selectedMarble.uses && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{language === 'ur' ? 'استعمال کی جگہیں:' : 'Best Uses:'}</span>
                        <p className="text-xs text-foreground font-medium">{selectedMarble.uses}</p>
                      </div>
                    )}
                    {selectedMarble.characteristics && (
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{language === 'ur' ? 'خصوصیات:' : 'Characteristics:'}</span>
                        <p className="text-xs text-foreground font-medium">{selectedMarble.characteristics}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border/45 flex flex-col sm:flex-row gap-3">
                  <DialogClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold">
                      {language === 'ur' ? 'بند کریں' : 'Close'}
                    </Button>
                  </DialogClose>
                  <Button asChild className="flex-1 rounded-xl font-bold gap-2">
                    <Link href={`/order/${selectedMarble.id}`}>
                      <Calculator className="h-4 w-4" />
                      <span>{language === 'ur' ? 'ڈیزائن اور قیمت حاصل کریں' : 'Design & Calculate'}</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Fixing Material details Dialog */}
      <Dialog open={isFixingMaterialDialogOpen} onOpenChange={setIsFixingMaterialDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
          {selectedFixingMaterial && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div 
                className="relative aspect-video md:aspect-auto md:h-full min-h-[220px] bg-muted cursor-pointer hover:opacity-95 transition-opacity group/fiximage"
                onClick={() => openImage(selectedFixingMaterial.imageUrl, selectedFixingMaterial.name)}
                title="Click to view full screen"
              >
                <Image 
                  src={selectedFixingMaterial.imageUrl} 
                  alt={selectedFixingMaterial.name} 
                  fill 
                  className="object-cover transition-transform duration-300 group-hover/fiximage:scale-102" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-xs text-white px-2.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1 opacity-0 group-hover/fiximage:opacity-100 transition-opacity">
                  <Maximize className="h-3 w-3" /> Full Screen
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedFixingMaterial.category}
                    </Badge>
                    <DialogTitle className="font-headline text-xl md:text-2xl font-bold text-foreground">
                      {selectedFixingMaterial.name}
                    </DialogTitle>
                  </div>

                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-[250px] overflow-y-auto pr-1">
                    {selectedFixingMaterial.description}
                  </p>

                  <div className="py-2.5 px-4 bg-muted/50 rounded-xl flex items-baseline justify-between border">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{language === 'ur' ? 'قیمت' : 'Pricing'}</span>
                    <span className="font-bold text-lg text-primary">
                      PKR {selectedFixingMaterial.price.toLocaleString()}
                      <span className="text-xs font-semibold text-muted-foreground"> / {selectedFixingMaterial.unit}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border/45 flex gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1 rounded-xl font-bold text-xs">
                      {language === 'ur' ? 'بند کریں' : 'Close'}
                    </Button>
                  </DialogClose>
                  {selectedFixingMaterial.dataSheetUrl && (
                    <Button asChild variant="secondary" className="flex-1 rounded-xl font-bold text-xs gap-1.5">
                      <a href={selectedFixingMaterial.dataSheetUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span>Data Sheet</span>
                      </a>
                    </Button>
                  )}
                  <Button asChild className="flex-1 rounded-xl font-bold text-xs gap-1.5">
                    <Link href="/order/general-supplies-order">
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span>{language === 'ur' ? 'ارڈر اور کوٹیشن' : 'Quotation'}</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Service Provider details Dialog */}
      <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
          {selectedProvider && (
            <div className="max-h-[85vh] overflow-y-auto">
              {/* Header profile view */}
              <div className="p-6 md:p-8 border-b bg-muted/20 flex flex-col sm:flex-row items-center gap-5">
                <Image 
                  src={selectedProvider.imageUrl || '/images/placeholder-avatar.png'} 
                  alt={selectedProvider.name} 
                  width={90} 
                  height={90} 
                  className="rounded-full object-cover border-4 border-secondary shadow-md shrink-0"
                />
                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                    <Badge variant="secondary" className="bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedProvider.service}
                    </Badge>
                  </div>
                  <DialogTitle className="font-headline text-xl md:text-2xl font-bold text-foreground">
                    {selectedProvider.name}
                  </DialogTitle>
                  {selectedProvider.rating && (
                    <div className="flex items-center justify-center sm:justify-start gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-4 w-4", 
                            i < selectedProvider.rating! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                      <span className="text-xs text-muted-foreground font-semibold ml-1">({selectedProvider.rating}.0 Rating)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Jobs and Services list */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Services/Jobs list */}
                {selectedProvider.jobs && selectedProvider.jobs.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <span>{language === 'ur' ? 'خدمات اور نرخ' : 'Offered Services & Rates'}</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProvider.jobs.map((job) => (
                        <div 
                          key={job.id} 
                          className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors"
                        >
                          <div className="font-semibold text-foreground text-xs md:text-sm">{job.title}</div>
                          <div className="font-bold text-primary text-xs md:text-sm whitespace-nowrap">
                            PKR {job.price.toLocaleString()}
                            <span className="text-[10px] text-muted-foreground font-normal"> / {job.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <span>{language === 'ur' ? 'تفصیلات' : 'Service Details'}</span>
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {language === 'ur' 
                        ? 'ماربل اور گرینائٹ کی کٹنگ، پالشنگ، کونہ رگڑائی، سیڑھیوں کی فٹنگ، اور کچن کاؤنٹرٹاپ ڈیزائننگ کی خدمات مارکیٹ کے سب سے مناسب نرخوں پر دستیاب ہیں۔'
                        : 'Custom marble work, stairs fitting, diamond floor polishing, and kitchen top edge profiling available at competitive rates.'}
                    </p>
                  </div>
                )}

                {/* Team Work Samples / Gallery */}
                {selectedProvider.gallery && selectedProvider.gallery.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Gem className="h-4 w-4 text-primary shrink-0" />
                      <span>{language === 'ur' ? 'پچھلے کام کے نمونے' : 'Our Work Portfolio'}</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedProvider.gallery.map((img) => (
                        <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden bg-muted group/gallery border border-border/40">
                          <Image src={img.url} alt={img.altText || 'Portfolio item'} fill className="object-cover transition-transform duration-300 group-hover/gallery:scale-105" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact and close */}
                <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
                    {selectedProvider.socials?.whatsapp && (
                      <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full">
                        <a href={`https://wa.me/${selectedProvider.socials.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp Chat">
                          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-green-500"><title>WhatsApp</title><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/></svg>
                        </a>
                      </Button>
                    )}
                    {selectedProvider.socials?.facebook && (
                      <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full text-blue-600">
                        <a href={selectedProvider.socials.facebook} target="_blank" rel="noopener noreferrer" title="Facebook Page">
                          <Facebook className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                    {selectedProvider.socials?.instagram && (
                      <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full text-pink-500">
                        <a href={selectedProvider.socials.instagram} target="_blank" rel="noopener noreferrer" title="Instagram Profile">
                          <Instagram className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <DialogClose asChild>
                      <Button variant="outline" className="flex-1 sm:flex-initial rounded-xl font-bold text-xs px-5">
                        {language === 'ur' ? 'بند کریں' : 'Close'}
                      </Button>
                    </DialogClose>
                    <Button asChild className="flex-1 sm:flex-initial rounded-xl font-bold text-xs gap-1.5 px-6">
                      <a href={`tel:${selectedProvider.phone}`}>
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{language === 'ur' ? 'ابھی رابطہ کریں' : 'Contact Expert'}</span>
                      </a>
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
