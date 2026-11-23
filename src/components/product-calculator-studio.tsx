'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  ChefHat,
  Bath,
  DraftingCompass,
  Wind,
  Ruler,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
} from 'lucide-react';
import type { Marble, MarbleVariant, RequirementType } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { useCalculation } from '@/context/calculation-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SimpleCalculator } from '@/components/simple-calculator';
import { KitchenDesigner } from '@/components/kitchen-designer';
import { VanityDesigner } from '@/components/vanity-designer';
import { StairDesigner } from '@/components/stair-designer';
import { OrderForm } from '@/components/order-form';
import { FloorPlanner } from '@/components/floor-planner';
import {
  CalculatorVoiceGuide,
  type GuidedCalculatorType,
} from '@/components/calculator-voice-guide';
import { cn } from '@/lib/utils';

type StudioCalcTab = 'simple' | 'kitchen' | 'vanity' | 'stairs' | 'window-sill' | 'floor';

const STUDIO_CALCULATOR_TABS: Array<{
  id: StudioCalcTab;
  labelEn: string;
  labelUr: string;
  subEn: string;
  subUr: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'simple',
    labelEn: 'Simple Area',
    labelUr: 'سادہ کیلکولیٹر',
    subEn: 'Length × Width',
    subUr: 'لمبائی × چوڑائی',
    icon: Calculator,
  },
  {
    id: 'kitchen',
    labelEn: 'Kitchen',
    labelUr: 'کچن کاؤنٹر',
    subEn: 'Slab, Sink & Gola',
    subUr: 'سلیب، سنک و بارڈر',
    icon: ChefHat,
  },
  {
    id: 'vanity',
    labelEn: 'Vanity',
    labelUr: 'باتھ روم وینٹی',
    subEn: 'Basin & Lutak',
    subUr: 'بیسن اور لٹک',
    icon: Bath,
  },
  {
    id: 'stairs',
    labelEn: 'Stairs',
    labelUr: 'سیڑھیاں',
    subEn: 'Steps & Risers',
    subUr: 'اسٹیپس اور گولہ',
    icon: DraftingCompass,
  },
  {
    id: 'window-sill',
    labelEn: 'Window Sill',
    labelUr: 'کھڑکی سِل',
    subEn: 'Frames & Sills',
    subUr: 'کھڑکی چوکھٹ',
    icon: Wind,
  },
  {
    id: 'floor',
    labelEn: 'Floor Rooms',
    labelUr: 'کمرہ فلورنگ',
    subEn: 'Multi-Room Plan',
    subUr: 'تمام کمروں کا حساب',
    icon: Ruler,
  },
];

interface ProductCalculatorStudioProps {
  marble: Marble;
  selectedVariant: MarbleVariant;
  initialTab?: StudioCalcTab;
}

export function ProductCalculatorStudio({
  marble,
  selectedVariant,
  initialTab = 'simple',
}: ProductCalculatorStudioProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { addRequirement, updateRequirement, requirements } = useCalculation();
  const { toast } = useToast();

  const [activeCalc, setActiveCalc] = useState<StudioCalcTab>(initialTab);
  const [savedNotice, setSavedNotice] = useState<{
    calcLabel: string;
    total: number;
  } | null>(null);
  const calcBodyRef = useRef<HTMLDivElement | null>(null);

  const validVariant = useMemo<MarbleVariant>(() => {
    if (selectedVariant && selectedVariant.id) return selectedVariant;
    if (marble.variants && marble.variants.length > 0) return marble.variants[0];
    return {
      id: `${marble.id}-default`,
      size: 'Standard',
      thickness: '6-Sutar',
      price: 0,
    };
  }, [marble, selectedVariant]);

  const handleSaveCalculation = (data: {
    total: number;
    details: any;
    variant: MarbleVariant;
  }) => {
    const reqType = activeCalc as RequirementType;
    const targetVariant = data.variant || validVariant;
    const reqId = addRequirement(reqType, marble, targetVariant);
    updateRequirement(reqId, {
      total: Math.round(data.total || 0),
      details: data.details,
      variant: targetVariant,
      isConfigured: true,
    });

    const tabMeta = STUDIO_CALCULATOR_TABS.find((t) => t.id === activeCalc);
    const label =
      language === 'ur' ? tabMeta?.labelUr || activeCalc : tabMeta?.labelEn || activeCalc;
    setSavedNotice({
      calcLabel: label,
      total: Math.round(data.total || 0),
    });

    toast({
      title:
        language === 'ur'
          ? 'کوٹیشن میں شامل ہو گیا! (Added to Quotation)'
          : 'Added to Your Quotation!',
      description:
        language === 'ur'
          ? `${marble.name} (${label}) — کل رقم: PKR ${Math.round(data.total || 0).toLocaleString()}`
          : `${marble.name} (${label}) — PKR ${Math.round(data.total || 0).toLocaleString()} saved.`,
    });
  };

  const commonProps = {
    marble,
    variant: validVariant,
    initialState: null as any,
    onSave: handleSaveCalculation,
    onCancel: () => {
      setSavedNotice(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  return (
    <section
      id="product-calculators"
      className="mt-10 pt-8 border-t border-border space-y-6 scroll-mt-24"
    >
      {/* Section Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {language === 'ur'
              ? 'اس پتھر کے تمام آسان کیلکولیٹرز'
              : 'All-in-One Guided Stone Calculators'}
          </p>
          <h2 className="font-headline text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {language === 'ur'
              ? `${marble.name} — قیمت اور پیمائش معلوم کریں`
              : `Calculate ${marble.name} Cost Instantly`}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {language === 'ur'
              ? 'اپنی ضرورت کے مطابق نیچے سے کوئی بھی کیلکولیٹر چنیں (سادہ، کچن، وینٹی، سیڑھیاں، کھڑکی یا فلور) اور وائس گائیڈ کے ساتھ آسانی سے مکمل قیمت معلوم کریں۔'
              : 'Choose what you are building below (Simple Area, Kitchen, Vanity, Stairs, Window Sill, or Floor). The voice & step guide shows you exactly what to enter.'}
          </p>
        </div>

        {requirements.length > 0 && (
          <Button
            type="button"
            size="lg"
            onClick={() => router.push(`/order/${marble.id}`)}
            className="min-h-[48px] px-5 font-extrabold gap-2 shrink-0 shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {language === 'ur'
                ? `کوٹیشن دیکھیں (${requirements.length})`
                : `View Quotation (${requirements.length})`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Clear Mobile + Desktop Calculator Switcher Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {STUDIO_CALCULATOR_TABS.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeCalc === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCalc(tab.id);
                setSavedNotice(null);
              }}
              className={cn(
                'flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[82px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.01]'
                  : 'bg-card text-foreground border-border hover:border-primary/60 hover:bg-muted/40'
              )}
            >
              <IconComp
                className={cn(
                  'w-5 h-5 sm:w-6 sm:h-6 mb-1.5 shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-primary'
                )}
              />
              <span className="text-xs sm:text-sm font-extrabold leading-tight">
                {language === 'ur' ? tab.labelUr : tab.labelEn}
              </span>
              <span
                className={cn(
                  'text-[11px] mt-0.5 leading-tight',
                  isActive ? 'text-primary-foreground/85' : 'text-muted-foreground'
                )}
              >
                {language === 'ur' ? tab.subUr : tab.subEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Voiceover & Step-by-Step Guide */}
      <CalculatorVoiceGuide
        calculatorType={activeCalc as GuidedCalculatorType}
        containerRef={calcBodyRef}
      />

      {/* Saved Confirmation Bar */}
      {savedNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-sm sm:text-base text-foreground">
                {language === 'ur'
                  ? `${savedNotice.calcLabel} آپ کے کوٹیشن میں محفوظ ہو گیا — PKR ${savedNotice.total.toLocaleString()}`
                  : `${savedNotice.calcLabel} Saved to Quotation — PKR ${savedNotice.total.toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ur'
                  ? 'آپ مزید پیمائش شامل کر سکتے ہیں یا ابھی اپنا مکمل آرڈر/کوٹیشن دیکھ سکتے ہیں۔'
                  : 'You can add another room/item or proceed to your full printable quotation & WhatsApp order.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => router.push(`/order/${marble.id}`)}
            className="min-h-[44px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-2"
          >
            <span>{language === 'ur' ? 'مکمل کوٹیشن اور آرڈر' : 'Open Full Quotation'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Active Calculator Workspace */}
      <div
        ref={calcBodyRef}
        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-2 sm:p-4"
      >
        {activeCalc === 'simple' && (
          <SimpleCalculator key={`simple-${validVariant.id}`} {...commonProps} />
        )}
        {activeCalc === 'kitchen' && (
          <KitchenDesigner key={`kitchen-${validVariant.id}`} {...commonProps} />
        )}
        {activeCalc === 'vanity' && (
          <VanityDesigner key={`vanity-${validVariant.id}`} {...commonProps} />
        )}
        {activeCalc === 'stairs' && (
          <StairDesigner key={`stairs-${validVariant.id}`} {...commonProps} />
        )}
        {activeCalc === 'window-sill' && (
          <OrderForm
            key={`window-sill-${validVariant.id}`}
            {...commonProps}
            applicationType="window-sill"
          />
        )}
        {activeCalc === 'floor' && (
          <FloorPlanner key={`floor-${validVariant.id}`} {...commonProps} />
        )}
      </div>
    </section>
  );
}
