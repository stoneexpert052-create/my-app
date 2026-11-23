'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw } from 'lucide-react';
import { useCalculation } from '@/context/calculation-context';
import { useLanguage } from '@/context/language-context';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

interface SimpleCalculatorProps {
  onSave: (data: { total: number; details: any; variant: MarbleVariant }) => void;
  initialState: any;
  marble: Marble;
  variant: MarbleVariant;
  onCancel: () => void;
}

type MeasurementUnit = 'feet' | 'inches' | 'cm' | 'mm';

export function SimpleCalculator({
  onSave,
  initialState,
  marble,
  variant,
  onCancel,
}: SimpleCalculatorProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  const isUr = language === 'ur';

  const [selectedVariant, setSelectedVariant] = useState<MarbleVariant>(variant);
  const [selectedUnit, setSelectedUnit] = useState<MeasurementUnit>(
    initialState?.selectedUnit || 'feet'
  );
  const [length, setLength] = useState<string>(String(initialState?.length || '12'));
  const [width, setWidth] = useState<string>(String(initialState?.width || '10'));
  const [totalArea, setTotalArea] = useState<string>(String(initialState?.totalArea || '120'));
  const [skirtingRft, setSkirtingRft] = useState<string>(String(initialState?.skirtingRft || ''));
  const [skirtingHeight, setSkirtingHeight] = useState<string>(
    String(initialState?.skirtingHeight || '4')
  );

  useEffect(() => {
    setSelectedVariant(variant);
  }, [variant]);

  useEffect(() => {
    if (initialState) {
      setSelectedUnit(initialState.selectedUnit || 'feet');
      setLength(String(initialState.length || '12'));
      setWidth(String(initialState.width || '10'));
      setTotalArea(String(initialState.totalArea || '120'));
      setSkirtingRft(String(initialState.skirtingRft || ''));
      setSkirtingHeight(String(initialState.skirtingHeight || '4'));
    }
  }, [initialState]);

  const convertUnitValue = (
    valueStr: string,
    fromUnit: MeasurementUnit,
    toUnit: MeasurementUnit
  ): string => {
    if (!valueStr) return '';
    const numValue = parseFloat(valueStr);
    if (isNaN(numValue) || numValue <= 0) return valueStr;

    let inches = numValue;
    if (fromUnit === 'feet') inches = numValue * 12;
    else if (fromUnit === 'cm') inches = numValue / 2.54;
    else if (fromUnit === 'mm') inches = numValue / 25.4;

    let resultNum = inches;
    let decimals = 2;
    if (toUnit === 'feet') {
      resultNum = inches / 12;
      decimals = 2;
    } else if (toUnit === 'cm') {
      resultNum = inches * 2.54;
      decimals = 1;
    } else if (toUnit === 'mm') {
      resultNum = inches * 25.4;
      decimals = 0;
    }
    return parseFloat(resultNum.toFixed(decimals)).toString();
  };

  const getAreaInSqFt = (lStr: string, wStr: string, unit: MeasurementUnit): number => {
    const l = parseFloat(lStr) || 0;
    const w = parseFloat(wStr) || 0;
    if (l <= 0 || w <= 0) return 0;

    let lInches = l;
    let wInches = w;
    if (unit === 'feet') {
      lInches = l * 12;
      wInches = w * 12;
    } else if (unit === 'cm') {
      lInches = l / 2.54;
      wInches = w / 2.54;
    } else if (unit === 'mm') {
      lInches = l / 25.4;
      wInches = w / 25.4;
    }
    return (lInches * wInches) / 144;
  };

  const handleUnitChange = (nextUnit: MeasurementUnit) => {
    if (nextUnit === selectedUnit) return;
    const nextLength = convertUnitValue(length, selectedUnit, nextUnit);
    const nextWidth = convertUnitValue(width, selectedUnit, nextUnit);
    setSelectedUnit(nextUnit);
    setLength(nextLength);
    setWidth(nextWidth);
    const area = getAreaInSqFt(nextLength, nextWidth, nextUnit);
    if (area > 0) setTotalArea(area.toFixed(2));
  };

  const handleLengthChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setLength(cleanVal);
    const area = getAreaInSqFt(cleanVal, width, selectedUnit);
    setTotalArea(area > 0 ? area.toFixed(2) : '');
  };

  const handleWidthChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setWidth(cleanVal);
    const area = getAreaInSqFt(length, cleanVal, selectedUnit);
    setTotalArea(area > 0 ? area.toFixed(2) : '');
  };

  const calculations = useMemo(() => {
    const area = parseFloat(totalArea) || 0;
    const skirtingLength = parseFloat(skirtingRft) || 0;
    const height = parseFloat(skirtingHeight) || 0;

    let materialCost = 0;
    let wastage = 0;
    let finalSqFt = 0;

    if (area > 0) {
      wastage = area * (costs.wastagePercentage / 100);
      finalSqFt = area + wastage;
      materialCost = finalSqFt * (selectedVariant.price ?? 0);
    }

    const skirtingPolishCost = skirtingLength * 40;
    const grandTotal = materialCost + skirtingPolishCost;

    return {
      totalArea: area,
      wastage,
      finalSqFt,
      materialCost,
      skirtingRft: skirtingLength,
      skirtingHeight: height,
      skirtingPolishCost,
      grandTotal,
      wastagePercentage: costs.wastagePercentage,
      rate: selectedVariant.price,
    };
  }, [totalArea, skirtingRft, skirtingHeight, selectedVariant.price, costs.wastagePercentage]);

  const handleSave = () => {
    onSave({
      total: calculations.grandTotal,
      details: {
        ...calculations,
        length,
        width,
        selectedUnit,
      },
      variant: selectedVariant,
    });
  };

  const unitShortLabel =
    selectedUnit === 'feet'
      ? isUr
        ? 'فٹ (ft)'
        : 'ft'
      : selectedUnit === 'inches'
        ? isUr
          ? 'انچ (in)'
          : 'in'
        : selectedUnit;

  return (
    <div className="p-2 sm:p-4 space-y-5">
      <Card className="border-border shadow-none">
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Step 1: Stone Size & Format */}
          {marble.variants.length > 0 && (
            <div data-guide-step="1" className="space-y-2 rounded-xl p-1 transition-all">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm sm:text-base font-extrabold text-foreground">
                  {isUr ? '1. پتھر کا سائز اور موٹائی چنیں' : '1. Select Stone Size & Thickness'}
                </Label>
                <span className="text-xs font-mono font-bold text-primary tabular-nums">
                  PKR {(selectedVariant.price ?? 0).toLocaleString()}/sq.ft
                </span>
              </div>
              <Select
                value={selectedVariant.id}
                onValueChange={(variantId) => {
                  const newVariant = marble.variants.find((v) => v.id === variantId);
                  if (newVariant) setSelectedVariant(newVariant);
                }}
              >
                <SelectTrigger className="text-sm sm:text-base h-12 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {marble.variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.size} — {v.thickness} @ PKR {(v.price ?? 0).toLocaleString()}/sq.ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Measurement Unit */}
          <div
            data-guide-step="2"
            className="space-y-2.5 p-4 bg-muted/40 rounded-xl border border-border transition-all"
          >
            <Label className="text-sm sm:text-base font-extrabold text-foreground block">
              {isUr
                ? '2. پیمائش کا پیمانہ چنیں (فٹ یا انچ)'
                : '2. Choose Measurement Unit (Feet or Inches)'}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'feet', en: 'Feet (فٹ)', ur: 'فٹ (Feet)' },
                  { id: 'inches', en: 'Inches (انچ)', ur: 'انچ (Inches)' },
                  { id: 'cm', en: 'CM', ur: 'سینٹی میٹر (CM)' },
                  { id: 'mm', en: 'MM', ur: 'ملی میٹر (MM)' },
                ] as const
              ).map((unit) => (
                <Button
                  key={unit.id}
                  type="button"
                  variant={selectedUnit === unit.id ? 'default' : 'outline'}
                  onClick={() => handleUnitChange(unit.id)}
                  className={cn(
                    'min-h-[44px] text-xs sm:text-sm font-bold',
                    selectedUnit === unit.id && 'shadow-md'
                  )}
                >
                  {isUr ? unit.ur : unit.en}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 3: Length × Width & Direct Total Area */}
          <div data-guide-step="3" className="space-y-4 rounded-xl p-1 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="simple-length" className="text-sm sm:text-base font-extrabold">
                  {isUr ? `3A. لمبائی لکھیں (${unitShortLabel})` : `3A. Length (${unitShortLabel})`}
                </Label>
                <Input
                  id="simple-length"
                  value={length}
                  onChange={(e) => handleLengthChange(e.target.value)}
                  className="text-lg font-extrabold h-12 tabular-nums"
                  placeholder={selectedUnit === 'feet' ? '12' : '144'}
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="simple-width" className="text-sm sm:text-base font-extrabold">
                  {isUr ? `3B. چوڑائی لکھیں (${unitShortLabel})` : `3B. Width (${unitShortLabel})`}
                </Label>
                <Input
                  id="simple-width"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="text-lg font-extrabold h-12 tabular-nums"
                  placeholder={selectedUnit === 'feet' ? '10' : '120'}
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="simple-total-area" className="text-sm sm:text-base font-extrabold">
                {isUr
                  ? 'کل رقبہ — اسکوائر فٹ (خود بخود بن جاتا ہے یا براہِ راست لکھیں)'
                  : 'Total Area in Sq.Ft (Auto-calculated or enter directly)'}
              </Label>
              <Input
                id="simple-total-area"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value.replace(/[^0-9.]/g, ''))}
                className="text-lg font-extrabold h-12 tabular-nums bg-primary/5 border-primary/30"
                placeholder="120"
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground">
                {isUr
                  ? `کٹنگ کے لیے ${costs.wastagePercentage}% ویسٹیج خود بخود شامل کی جاتی ہے۔`
                  : `Standard ${costs.wastagePercentage}% cutting wastage is added automatically.`}
              </p>
            </div>
          </div>

          <Separator />

          {/* Step 4: Optional Skirting */}
          <div data-guide-step="4" className="space-y-2 rounded-xl p-1 transition-all">
            <Label htmlFor="skirting-rft" className="text-sm sm:text-base font-extrabold">
              {isUr
                ? '4. دیوار اسکرٹنگ پٹی — اختیاری (Skirting RFT)'
                : '4. Wall Skirting / Baseboard (Optional)'}
            </Label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                id="skirting-rft"
                value={skirtingRft}
                onChange={(e) => setSkirtingRft(e.target.value.replace(/[^0-9.]/g, ''))}
                className="text-base font-bold h-12 flex-1 tabular-nums"
                placeholder={
                  isUr
                    ? 'مثال: 40 رننگ فٹ (خالی بھی چھوڑ سکتے ہیں)'
                    : 'e.g., 40 RFT (leave blank if not needed)'
                }
                inputMode="decimal"
              />
              <Select value={skirtingHeight} onValueChange={setSkirtingHeight}>
                <SelectTrigger className="w-full sm:w-[160px] text-base font-bold h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 inches</SelectItem>
                  <SelectItem value="4">4 inches</SelectItem>
                  <SelectItem value="5">5 inches</SelectItem>
                  <SelectItem value="6">6 inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instant Live Cost Breakdown */}
      {calculations.grandTotal > 0 && (
        <Card className="border-primary/35 bg-primary/5 shadow-sm">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3.5">
              <Image
                src={
                  marble.imageUrl ||
                  `https://placehold.co/120x120?text=${encodeURIComponent(marble.name)}`
                }
                alt={marble.name}
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="rounded-lg object-cover h-14 w-14 shrink-0 border"
                unoptimized={(marble.imageUrl || '').startsWith('data:')}
              />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-base truncate">{marble.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {calculations.finalSqFt.toFixed(2)} sq.ft (incl. {costs.wastagePercentage}%
                  wastage) × PKR {(selectedVariant.price ?? 0).toLocaleString()}
                </p>
              </div>
              <span className="font-bold text-sm sm:text-base tabular-nums shrink-0">
                PKR {Math.round(calculations.materialCost).toLocaleString()}
              </span>
            </div>

            {calculations.skirtingPolishCost > 0 && (
              <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-border/60 tabular-nums">
                <span className="text-muted-foreground">
                  {isUr
                    ? `اسکرٹنگ پالش (${calculations.skirtingRft.toFixed(1)} رننگ فٹ)`
                    : `Skirting Polish (${calculations.skirtingRft.toFixed(1)} RFT)`}
                </span>
                <span className="font-bold">
                  PKR {Math.round(calculations.skirtingPolishCost).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-primary/20">
              <span className="text-base sm:text-lg font-extrabold text-foreground">
                {isUr ? 'مکمل تخمینہ (Total):' : 'Total Estimated Cost:'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-primary tabular-nums">
                PKR {Math.round(calculations.grandTotal).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clear Mobile + Desktop Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setLength('');
            setWidth('');
            setTotalArea('');
            setSkirtingRft('');
          }}
          className="min-h-[46px] px-4 font-bold gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isUr ? 'صاف کریں (Clear)' : 'Clear'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-[46px] px-5 font-bold"
        >
          {isUr ? 'بند کریں' : 'Cancel'}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={calculations.grandTotal <= 0}
          className="min-h-[48px] px-6 font-extrabold text-base gap-2 shadow-md"
        >
          <Save className="h-5 w-5" />
          <span>{isUr ? 'کوٹیشن میں محفوظ کریں (Save)' : 'Save to Quotation'}</span>
        </Button>
      </div>
    </div>
  );
}
