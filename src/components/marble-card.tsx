'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Marble } from '@/lib/types';
import { Calculator, Gem, Truck, Globe, ShoppingCart, Flame, Percent } from 'lucide-react';
import { Badge } from './ui/badge';
import { formatSaleBadgeText } from '@/lib/utils';
import React from 'react';

interface MarbleCardProps {
  marble: Marble;
  onImageClick?: (marble: Marble) => void;
  onDesignClick?: (id: string) => void;
  itemNumber?: number;
}

export const MarbleCard = React.memo(function MarbleCard({ marble, onImageClick, onDesignClick, itemNumber }: MarbleCardProps) {
  const OriginIcon = marble.origin === 'Local' ? Truck : Globe;
  const isPerPiece = ['Vanity', 'Inlay', 'Antique'].includes(marble.materialType);
  
  // Safe Image URL with fallback to prevent crashes when imageUrl is missing or empty
  const imageUrl = (marble.imageUrl && marble.imageUrl.trim() !== "") 
    ? marble.imageUrl 
    : `https://placehold.co/600x400?text=${encodeURIComponent(marble.name || 'Marble')}`;

  return (
    <>
      <Card className="group flex h-full w-full flex-col overflow-hidden border border-border/80 bg-card transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1.5 hover:border-primary/30">
        
        {/* Material Image - aspect-square for a significantly larger, clearer, and premium display */}
        <Link 
          href={`/product-detail/${marble.id}`}
          className="aspect-square w-full overflow-hidden relative block"
        >
          <Image
            src={imageUrl}
            alt={`Image of ${marble.name}`}
            width={600}
            height={600}
            data-ai-hint={marble.imageHint}
            className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-105 saturate-102"
            unoptimized={imageUrl.startsWith('data:')}
          />
          
          {/* Top-Left Category Overlay Badge */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <Badge className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide uppercase py-1 px-2.5 bg-black/65 backdrop-blur-xs text-white border border-white/10 rounded-full shadow-md">
              <Gem className="h-3 w-3 text-primary" />
              <span>{marble.materialType === '12x24 Tiles' ? 'Marble Tiles' : marble.materialType}</span>
            </Badge>
          </div>

          {/* Top-Right Origin Overlay Badge */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <Badge className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide uppercase py-1 px-2.5 bg-black/65 backdrop-blur-xs text-white border border-white/10 rounded-full shadow-md">
              <OriginIcon className="h-3 w-3 text-primary" />
              <span>{marble.origin}</span>
            </Badge>
          </div>

          {/* Sale & Discount Overlay Badge */}
          {(marble.onSale || (typeof marble.discount === 'number' && marble.discount > 0)) && (
            <div className="absolute top-10 left-3 z-10 pointer-events-none">
              <Badge className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase py-1 px-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border border-white/20 rounded-full shadow-lg">
                <Flame className="h-3 w-3 fill-amber-300 text-amber-200" />
                <span>
                  {formatSaleBadgeText({
                    discount: marble.discount,
                    discountType: marble.discountType,
                    saleBadgeText: marble.saleBadgeText,
                    isUrdu: false
                  })}
                </span>
              </Badge>
            </div>
          )}

          {/* Gradient Overlay and Product Name at the Bottom */}
          <div className="absolute bottom-0 left-0 w-full p-4 pt-12 pb-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex flex-col gap-1 z-10">
            <h3 className="font-headline text-lg sm:text-xl font-black text-white leading-tight tracking-tight drop-shadow-md group-hover:text-primary transition-colors duration-300">
              {marble.name}
            </h3>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-90 group-hover:opacity-100 transition-opacity">
              Click to View Details
            </span>
          </div>

          {/* Subtle Hover Overlay */}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </Link>

        {/* Compact pricing below the larger image */}
        <CardContent className="flex-grow p-4 pt-4 flex flex-col justify-end">
          <div className="space-y-3">
            {(() => {
              const prices = marble.variants?.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0) || [];
              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const isSale = !!(marble.onSale || (typeof marble.discount === 'number' && marble.discount > 0));
              const discountVal = typeof marble.discount === 'number' ? marble.discount : 0;
              
              if (minPrice) {
                const discountedMinPrice = isSale
                  ? (marble.discountType === 'fixed' ? Math.max(1, minPrice - discountVal) : Math.round(minPrice * (1 - discountVal / 100)))
                  : minPrice;

                if (isSale) {
                  return (
                    <div className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/30">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Flame className="h-3 w-3 fill-red-500 text-red-500" /> Sale Price
                        </span>
                        <span className="text-[10px] text-muted-foreground line-through font-semibold">
                          PKR {minPrice.toLocaleString()}
                        </span>
                      </div>
                      <span className="font-black text-red-600 dark:text-red-400 text-sm sm:text-base whitespace-nowrap">
                        PKR {discountedMinPrice.toLocaleString()}
                        {!isPerPiece ? ' / sqft' : ' / pc'}
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-primary/10 bg-primary/5">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Starting Price</span>
                    <span className="font-extrabold text-primary text-sm whitespace-nowrap">
                      PKR {minPrice.toLocaleString()}
                      {!isPerPiece ? ' / sqft' : ' / pc'}
                    </span>
                  </div>
                );
              }
              return (
                <div className="py-2 px-3.5 text-center text-muted-foreground text-xs italic font-medium bg-muted/30 rounded-xl border">
                  Contact for pricing
                </div>
              );
            })()}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          {onDesignClick ? (
            <Button 
              className="w-full font-bold text-sm h-11 group-hover:bg-primary group-hover:text-primary-foreground transition-all flex items-center justify-center cursor-pointer rounded-xl"
              onClick={() => onDesignClick(marble.id)}
            >
              {isPerPiece ? <ShoppingCart className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
              {isPerPiece ? 'Add to Quotation' : 'Design & Calculate'}
            </Button>
          ) : (
            <Button asChild className="w-full font-bold text-sm h-11 group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl">
              <Link href={`/order/${marble.id}`} className="flex items-center justify-center">
                {isPerPiece ? <ShoppingCart className="mr-2 h-4 w-4" /> : <Calculator className="mr-2 h-4 w-4" />}
                {isPerPiece ? 'Add to Quotation' : 'Design & Calculate'}
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
});
