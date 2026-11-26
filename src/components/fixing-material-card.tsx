
'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FixingMaterial } from '@/lib/types';
import { Badge } from './ui/badge';
import { Tag, Calculator, Globe, Flame, Maximize2 } from 'lucide-react';
import { formatSaleBadgeText } from '@/lib/utils';
import { useFullscreenImage } from '@/context/fullscreen-image-context';
import { getSeoImageUrl, getSeoImageAlt } from '@/lib/seo';
import Link from 'next/link';
import React from 'react';

interface FixingMaterialCardProps {
  material: FixingMaterial;
  onImageClick: (material: FixingMaterial) => void;
}

export const FixingMaterialCard = React.memo(function FixingMaterialCard({ material, onImageClick }: FixingMaterialCardProps) {
  const { openImage } = useFullscreenImage();
  const isSale = !!(material.onSale || (typeof material.discount === 'number' && material.discount > 0));
  const discountVal = typeof material.discount === 'number' ? material.discount : 0;
  const discountedPrice = isSale
    ? (material.discountType === 'fixed' ? Math.max(1, material.price - discountVal) : Math.round(material.price * (1 - discountVal / 100)))
    : material.price;

  const seoImageUrl = getSeoImageUrl(material.imageUrl, material.name, { productId: material.id });
  const seoImageAlt = getSeoImageAlt(material.name, material.category);

  return (
    <Card className="group flex h-full w-full flex-col overflow-hidden border border-border/80 bg-card transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1.5 hover:border-primary/30">
      
      {/* Material Image - aspect-square for a significantly larger, clearer, and premium display */}
      <Link 
        href={`/product-detail/${material.id}`}
        className="aspect-square overflow-hidden block relative w-full"
      >
        <Image
          src={seoImageUrl}
          alt={seoImageAlt}
          width={600}
          height={600}
          referrerPolicy="no-referrer"
          unoptimized={seoImageUrl.startsWith('data:') || seoImageUrl.startsWith('/api/stone-image/')}
          className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-105 saturate-102"
        />
        
        {/* Top-Left Category Overlay Badge */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <Badge className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide uppercase py-1 px-2.5 bg-black/65 backdrop-blur-xs text-white border border-white/10 rounded-full shadow-md">
            <Tag className="h-3 w-3 text-primary" />
            <span>{material.category}</span>
          </Badge>
        </div>

        {/* Top-Right Origin Overlay Badge */}
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <Badge className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide uppercase py-1 px-2.5 bg-black/65 backdrop-blur-xs text-white border border-white/10 rounded-full shadow-md">
            <Globe className="h-3 w-3 text-primary" />
            <span>{(material as any).origin || 'Local'}</span>
          </Badge>
        </div>

        {/* Sale & Discount Overlay Badge */}
        {isSale && (
          <div className="absolute top-10 left-3 z-10 pointer-events-none">
            <Badge className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase py-1 px-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border border-white/20 rounded-full shadow-lg">
              <Flame className="h-3 w-3 fill-amber-300 text-amber-200" />
              <span>
                {formatSaleBadgeText({
                  discount: material.discount,
                  discountType: material.discountType,
                  saleBadgeText: material.saleBadgeText,
                  isUrdu: false
                })}
              </span>
            </Badge>
          </div>
        )}

        {/* Gradient Overlay and Product Name at the Bottom */}
        <div className="absolute bottom-0 left-0 w-full p-4 pt-12 pb-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex flex-col gap-1 z-10">
          <h3 className="font-headline text-lg sm:text-xl font-black text-white leading-tight tracking-tight drop-shadow-md group-hover:text-primary transition-colors duration-300">
            {material.name}
          </h3>
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-90 group-hover:opacity-100 transition-opacity">
            Click to View Details
          </span>
        </div>

        {/* Quick Fullscreen Lightbox Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openImage(seoImageUrl, material.name);
          }}
          title={`View ${material.name} full size`}
          aria-label={`View ${material.name} full size`}
          className="absolute bottom-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/65 text-white border border-white/15 backdrop-blur-xs shadow-md transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105 cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        {/* Subtle Hover Overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Link>

      {/* Structured Details and Compact Price below Image */}
      <CardContent className="flex-grow p-4 pt-4 flex flex-col justify-end">
        <div className="flex-grow space-y-3 mb-3">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 font-medium">
            {material.description}
          </p>
        </div>
        
        {isSale ? (
          <div className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/30">
            <div className="flex flex-col">
              <span className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-3 w-3 fill-red-500 text-red-500" /> Sale Price
              </span>
              <span className="text-[10px] text-muted-foreground line-through font-semibold">
                PKR {material.price.toLocaleString()}
              </span>
            </div>
            <div className="font-black text-base text-red-600 dark:text-red-400 whitespace-nowrap">
              PKR {discountedPrice.toLocaleString()}
              <span className="text-xs font-semibold text-muted-foreground"> / {material.unit}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2.5 border-t border-border">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Pricing</span>
            <div className="font-extrabold text-base text-primary whitespace-nowrap">
              PKR {material.price.toLocaleString()}
              <span className="text-xs font-semibold text-muted-foreground"> / {material.unit}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full font-bold text-sm h-11 group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl">
          <Link href="/order/general-supplies-order" className="flex items-center justify-center">
            <Calculator className="mr-2 h-4 w-4" />
            Create Quotation
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
});
