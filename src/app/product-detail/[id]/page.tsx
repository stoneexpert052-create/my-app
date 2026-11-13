'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { getMarbles, getFixingMaterials } from '@/lib/admin-actions';
import type { Marble, FixingMaterial } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Gem, 
  Globe, 
  Truck, 
  Tag, 
  Calculator, 
  ShoppingCart, 
  FileText, 
  Maximize2, 
  CheckCircle, 
  Activity, 
  Layers, 
  Ruler,
  Flame
} from 'lucide-react';
import { formatSaleBadgeText } from '@/lib/utils';
import { useFullscreenImage } from '@/context/fullscreen-image-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { openImage } = useFullscreenImage();
  const id = params?.id as string;

  const [item, setItem] = useState<Marble | FixingMaterial | null>(null);
  const [itemType, setItemType] = useState<'stone' | 'fixing' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setIsLoading(true);
      try {
        const [marbles, fixingMaterials] = await Promise.all([
          getMarbles(),
          getFixingMaterials()
        ]);

        const foundMarble = marbles.find(m => m.id === id);
        if (foundMarble) {
          setItem(foundMarble);
          setItemType('stone');
          setActiveImage(foundMarble.imageUrl);
        } else {
          const foundFixing = fixingMaterials.find(f => f.id === id);
          if (foundFixing) {
            setItem(foundFixing);
            setItemType('fixing');
            setActiveImage(foundFixing.imageUrl);
          }
        }
      } catch (error) {
        console.error("Failed to load product details:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  // Localized dictionaries
  const labels = useMemo(() => {
    if (language === 'ur') {
      return {
        back: 'واپس جائیں',
        materialType: 'مٹیریل کی قسم',
        origin: 'اصل ملک / جگہ',
        description: 'تفصیل',
        bestUses: 'بہترین استعمال',
        characteristics: 'خصوصیات',
        pricing: 'قیمتوں کی تفصیل',
        price: 'قیمت',
        unit: 'اکائی',
        calculate: 'ڈیزائن اور قیمت معلوم کریں',
        quotation: 'کوٹیشن تیار کریں',
        specifications: 'مصنوعات کی تفصیلات',
        size: 'سائز',
        thickness: 'موٹائی',
        gallery: 'مزید تصاویر',
        dataSheet: 'ڈیٹا شیٹ ڈاؤن لوڈ کریں',
        notFound: 'پروڈکٹ نہیں مل سکی۔',
        viewCatalog: 'کیٹلاگ دیکھیں',
        perPiece: 'فی پیس',
        perSqft: 'فی اسکوائر فٹ'
      };
    }
    return {
      back: 'Back to Catalogue',
      materialType: 'Material Type',
      origin: 'Origin',
      description: 'Description',
      bestUses: 'Best Uses',
      characteristics: 'Characteristics',
      pricing: 'Formats & Pricing',
      price: 'Price',
      unit: 'Unit',
      calculate: 'Design & Calculate',
      quotation: 'Create Quotation',
      specifications: 'Specifications',
      size: 'Size',
      thickness: 'Thickness',
      gallery: 'Gallery Images',
      dataSheet: 'Download Data Sheet',
      notFound: 'Product not found.',
      viewCatalog: 'View All Products',
      perPiece: '/pc',
      perSqft: '/sqft'
    };
  }, [language]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-grow container max-w-6xl mx-auto px-4 py-24 space-y-8">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-grow container max-w-4xl mx-auto px-4 py-24 text-center flex flex-col items-center justify-center space-y-6">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full">
            <Gem className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold font-headline">{labels.notFound}</h1>
          <Button asChild rounded-xl>
            <Link href="/products">{labels.viewCatalog}</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isStone = itemType === 'stone';
  const stoneItem = item as Marble;
  const fixingItem = item as FixingMaterial;
  const isPerPiece = isStone && ['Vanity', 'Inlay', 'Antique'].includes(stoneItem.materialType);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-grow mt-20 md:mt-28">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-8 rounded-full font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{labels.back}</span>
          </Button>

          {/* Core Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
            
            {/* Left Column: Full-size Image Showcase */}
            <div className="space-y-4">
              <div 
                className="relative aspect-square md:aspect-[4/3] w-full overflow-hidden bg-muted rounded-2xl border shadow-lg cursor-pointer group/showcase"
                onClick={() => openImage(activeImage, item.name)}
                title="Click to view full screen"
              >
                <Image
                  src={activeImage || `https://placehold.co/800x600?text=${encodeURIComponent(item.name)}`}
                  alt={item.name}
                  fill
                  priority
                  className="object-cover transition-transform duration-500 group-hover/showcase:scale-103"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 opacity-90 shadow-md">
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Click to Zoom</span>
                </div>
              </div>

              {/* Multi-image Gallery Thumbnails if available */}
              {isStone && stoneItem.gallery && stoneItem.gallery.length > 0 && (
                <div className="flex flex-wrap gap-2.5 p-2 bg-muted/40 rounded-xl border">
                  <button 
                    onClick={() => setActiveImage(stoneItem.imageUrl)}
                    className={`relative h-16 w-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === stoneItem.imageUrl ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={stoneItem.imageUrl} alt={stoneItem.name} fill className="object-cover" />
                  </button>
                  {stoneItem.gallery.map((img) => (
                    <button 
                      key={img.id}
                      onClick={() => setActiveImage(img.url)}
                      className={`relative h-16 w-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                        activeImage === img.url ? "border-primary scale-105 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={img.url} alt={img.altText || stoneItem.name} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Detailed Product Information */}
            <div className="space-y-6 lg:space-y-8">
              {/* Product Header Badges and Title */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs py-1 px-3.5 rounded-full border border-primary/10 flex items-center gap-1.5">
                    <Gem className="h-3.5 w-3.5" />
                    <span>{isStone ? (stoneItem.materialType === '12x24 Tiles' ? 'Marble Tiles' : stoneItem.materialType) : fixingItem.category}</span>
                  </Badge>
                  {isStone && (
                    <Badge variant="outline" className="border-border text-muted-foreground font-semibold text-xs py-1 px-3.5 rounded-full flex items-center gap-1.5">
                      {stoneItem.origin === 'Local' ? <Truck className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                      <span>{stoneItem.origin}</span>
                    </Badge>
                  )}
                  {/* Dynamic Sale Badge */}
                  {(() => {
                    const isSale = !!(item && ((item as any).onSale || (typeof (item as any).discount === 'number' && (item as any).discount > 0)));
                    if (!isSale) return null;
                    const discountVal = typeof (item as any).discount === 'number' ? (item as any).discount : 0;
                    const discountType = (item as any).discountType || 'percentage';
                    const badgeText = formatSaleBadgeText({
                      discount: discountVal,
                      discountType,
                      saleBadgeText: (item as any).saleBadgeText,
                      isUrdu: language === 'ur'
                    });
                    return (
                      <Badge className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-black text-xs py-1 px-3.5 rounded-full border border-white/20 shadow-md flex items-center gap-1.5 animate-pulse">
                        <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-200" />
                        <span>{badgeText}</span>
                      </Badge>
                    );
                  })()}
                </div>
                <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                  {item.name}
                </h1>
              </div>

              {/* Description Box */}
              <div className="space-y-3 pt-6 border-t border-border/60">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80">
                  {labels.description}
                </h3>
                <p className="text-foreground/90 text-sm md:text-base leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-xl border border-border/40 font-medium">
                  {item.description || (language === 'ur' ? 'یہ بہترین کوالٹی کا پریمیم مٹیریل ہے جو خوبصورتی اور پائیداری کا امتزاج فراہم کرتا ہے۔' : 'Premium selected materials chosen specifically for ultimate durability, refined style, and professional grade application.')}
                </p>
              </div>

              {/* Stone Specific fields: Characteristics and Uses */}
              {isStone && (stoneItem.uses || stoneItem.characteristics) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-border/60">
                  {stoneItem.uses && (
                    <div className="space-y-2 p-4 bg-muted/10 rounded-xl border border-border/30">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                        <span>{labels.bestUses}</span>
                      </h4>
                      <p className="text-sm text-foreground font-semibold">{stoneItem.uses}</p>
                    </div>
                  )}
                  {stoneItem.characteristics && (
                    <div className="space-y-2 p-4 bg-muted/10 rounded-xl border border-border/30">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        <span>{labels.characteristics}</span>
                      </h4>
                      <p className="text-sm text-foreground font-semibold">{stoneItem.characteristics}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Formats & Pricing for Stone */}
              {isStone && (
                <div className="space-y-3 pt-6 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80">
                      {labels.pricing}
                    </h3>
                    {(() => {
                      const isSale = !!(stoneItem.onSale || (typeof stoneItem.discount === 'number' && stoneItem.discount > 0));
                      if (!isSale) return null;
                      const discountVal = typeof stoneItem.discount === 'number' ? stoneItem.discount : 0;
                      const isFixed = stoneItem.discountType === 'fixed';
                      return (
                        <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {isFixed ? `PKR ${discountVal.toLocaleString()} OFF` : `${discountVal}% OFF`}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-2.5">
                    {stoneItem.variants && stoneItem.variants.length > 0 ? (
                      stoneItem.variants.map((variant, idx) => {
                        const isSale = !!(stoneItem.onSale || (typeof stoneItem.discount === 'number' && stoneItem.discount > 0));
                        const discountVal = typeof stoneItem.discount === 'number' ? stoneItem.discount : 0;
                        const originalPrice = variant.price || 0;
                        const discountedPrice = (isSale && originalPrice > 0)
                          ? (stoneItem.discountType === 'fixed' ? Math.max(1, originalPrice - discountVal) : Math.round(originalPrice * (1 - discountVal / 100)))
                          : originalPrice;

                        return (
                          <div 
                            key={variant.id || idx} 
                            className="flex items-center justify-between py-3 px-5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 hover:border-primary/20 transition-all shadow-xs"
                          >
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-bold text-foreground text-sm md:text-base">{(variant.size || '').split('(')[0].trim()}</span>
                              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{variant.thickness}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              {originalPrice > 0 ? (
                                isSale ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground line-through font-semibold">
                                      PKR {originalPrice.toLocaleString()}
                                    </span>
                                    <span className="font-black text-red-600 dark:text-red-400 text-base md:text-lg">
                                      PKR {discountedPrice.toLocaleString()}
                                      {isPerPiece ? <span className="text-xs font-medium"> /pc</span> : <span className="text-xs font-medium"> /sqft</span>}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-extrabold text-primary text-base md:text-lg">
                                    PKR {originalPrice.toLocaleString()}
                                    {isPerPiece ? <span className="text-xs text-muted-foreground font-medium"> /pc</span> : <span className="text-xs text-muted-foreground font-medium"> /sqft</span>}
                                  </span>
                                )
                              ) : (
                                <span className="text-destructive font-bold text-sm">N/A</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-4 text-center text-muted-foreground text-sm italic">
                        Contact for pricing
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price block for Fixing Material */}
              {!isStone && (
                <div className="space-y-3 pt-6 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80">
                      {labels.pricing}
                    </h3>
                    {(() => {
                      const isSale = !!(fixingItem.onSale || (typeof fixingItem.discount === 'number' && fixingItem.discount > 0));
                      if (!isSale) return null;
                      const discountVal = typeof fixingItem.discount === 'number' ? fixingItem.discount : 0;
                      const isFixed = fixingItem.discountType === 'fixed';
                      return (
                        <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {isFixed ? `PKR ${discountVal.toLocaleString()} OFF` : `${discountVal}% OFF`}
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const isSale = !!(fixingItem.onSale || (typeof fixingItem.discount === 'number' && fixingItem.discount > 0));
                    const discountVal = typeof fixingItem.discount === 'number' ? fixingItem.discount : 0;
                    const originalPrice = fixingItem.price || 0;
                    const discountedPrice = (isSale && originalPrice > 0)
                      ? (fixingItem.discountType === 'fixed' ? Math.max(1, originalPrice - discountVal) : Math.round(originalPrice * (1 - discountVal / 100)))
                      : originalPrice;

                    return (
                      <div className="flex items-center justify-between py-4 px-6 bg-primary/5 border border-primary/25 rounded-xl">
                        <span className="text-sm text-foreground font-bold">{labels.price}</span>
                        <div className="flex flex-col items-end">
                          {isSale ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through font-semibold">
                                PKR {originalPrice.toLocaleString()}
                              </span>
                              <span className="font-extrabold text-2xl text-red-600 dark:text-red-400">
                                PKR {discountedPrice.toLocaleString()}
                                <span className="text-sm font-semibold text-muted-foreground"> / {fixingItem.unit}</span>
                              </span>
                            </>
                          ) : (
                            <span className="font-extrabold text-2xl text-primary">
                              PKR {originalPrice.toLocaleString()}
                              <span className="text-sm font-semibold text-muted-foreground"> / {fixingItem.unit}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Call-to-Action Action Buttons */}
              <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row gap-4">
                {isStone ? (
                  <Button asChild size="lg" className="flex-1 font-bold h-12 shadow-md hover:shadow-lg transition-all rounded-xl gap-2 text-base">
                    <Link href={`/order/${stoneItem.id}`}>
                      {isPerPiece ? <ShoppingCart className="h-5 w-5" /> : <Calculator className="h-5 w-5" />}
                      <span>{labels.calculate}</span>
                    </Link>
                  </Button>
                ) : (
                  <>
                    {fixingItem.dataSheetUrl && (
                      <Button asChild variant="outline" size="lg" className="font-bold h-12 rounded-xl gap-2">
                        <a href={fixingItem.dataSheetUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-5 w-5 text-primary" />
                          <span>{labels.dataSheet}</span>
                        </a>
                      </Button>
                    )}
                    <Button asChild size="lg" className="flex-1 font-bold h-12 shadow-md hover:shadow-lg transition-all rounded-xl gap-2 text-base">
                      <Link href="/order/general-supplies-order">
                        <Calculator className="h-5 w-5" />
                        <span>{labels.quotation}</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
