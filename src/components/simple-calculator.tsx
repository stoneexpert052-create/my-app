
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { useCalculation } from '@/context/calculation-context';
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

export function SimpleCalculator({ onSave, initialState, marble, variant, onCancel }: SimpleCalculatorProps) {
  const { costs } = useCalculation();
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [selectedUnit, setSelectedUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'feet');
  const [lastConfiguredUnit, setLastConfiguredUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'feet');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [totalArea, setTotalArea] = useState<string>('');
  const [skirtingRft, setSkirtingRft] = useState<string>('');
  const [skirtingHeight, setSkirtingHeight] = useState<string>('4');
  
  useEffect(() => {
    if (initialState) {
      setSelectedUnit(initialState.selectedUnit || 'feet');
      setLastConfiguredUnit(initialState.selectedUnit || 'feet');
      setLength(String(initialState.length || '12'));
      setWidth(String(initialState.width || '10'));
      setTotalArea(String(initialState.totalArea || '120'));
      setSkirtingRft(String(initialState.skirtingRft || ''));
      setSkirtingHeight(String(initialState.skirtingHeight || '4'));
    } else {
      setLength('12');
      setWidth('10');
      setTotalArea('120');
    }
  }, [initialState]);

  const convertUnitValue = (valueStr: string, fromUnit: 'inches' | 'feet' | 'cm' | 'mm', toUnit: 'inches' | 'feet' | 'cm' | 'mm'): string => {
    if (!valueStr) return '';
    const numValue = parseFloat(valueStr);
    if (isNaN(numValue) || numValue <= 0) return valueStr;

    // Convert fromUnit value to base inches
    let inches = 0;
    if (fromUnit === 'inches') {
      inches = numValue;
    } else if (fromUnit === 'feet') {
      inches = numValue * 12;
    } else if (fromUnit === 'cm') {
      inches = numValue / 2.54;
    } else if (fromUnit === 'mm') {
      inches = numValue / 25.4;
    }

    // Convert base inches to toUnit
    let resultNum = 0;
    let decimals = 2;
    if (toUnit === 'inches') {
      resultNum = inches;
      decimals = 2;
    } else if (toUnit === 'feet') {
      resultNum = inches / 12;
      decimals = 3;
    } else if (toUnit === 'cm') {
      resultNum = inches * 2.54;
      decimals = 2;
    } else if (toUnit === 'mm') {
      resultNum = inches * 25.4;
      decimals = 1;
    }

    return parseFloat(resultNum.toFixed(decimals)).toString();
  };

  const getAreaInSqFt = (lStr: string, wStr: string, unit: 'inches' | 'feet' | 'cm' | 'mm'): number => {
    const l = parseFloat(lStr) || 0;
    const w = parseFloat(wStr) || 0;
    if (l <= 0 || w <= 0) return 0;

    let lInches = 0;
    let wInches = 0;

    if (unit === 'inches') {
      lInches = l;
      wInches = w;
    } else if (unit === 'feet') {
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

  const handleFitMeasurement = () => {
    if (selectedUnit === lastConfiguredUnit) return;

    const newLength = convertUnitValue(length, lastConfiguredUnit, selectedUnit);
    const newWidth = convertUnitValue(width, lastConfiguredUnit, selectedUnit);

    setLength(newLength);
    setWidth(newWidth);
    setLastConfiguredUnit(selectedUnit);
  };

  const handleLengthChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setLength(cleanVal);
    const area = getAreaInSqFt(cleanVal, width, selectedUnit);
    if (area > 0) {
      setTotalArea(area.toFixed(2));
    } else {
      setTotalArea('');
    }
  };

  const handleWidthChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setWidth(cleanVal);
    const area = getAreaInSqFt(length, cleanVal, selectedUnit);
    if (area > 0) {
      setTotalArea(area.toFixed(2));
    } else {
      setTotalArea('');
    }
  };

  const calculations = useMemo(() => {
    const area = parseFloat(totalArea) || 0;
    const skirtingLength = parseFloat(skirtingRft) || 0;
    const height = parseFloat(skirtingHeight) || 0;

    let materialCost = 0;
    let wastage = 0;
    let finalSqFt = 0;
    let skirtingSqFt = 0;

    if (area > 0) {
      wastage = area * (costs.wastagePercentage / 100);
      finalSqFt = area + wastage;
      materialCost = finalSqFt * (selectedVariant.price ?? 0);
    }
    
    const skirtingPolishCost = skirtingLength * 40; // Assuming 40/rft for polish

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
        selectedUnit
      }, 
      variant: selectedVariant 
    });
  };

  return (
    <div className="p-2 sm:p-6 space-y-6">
       <h3 className="font-bold text-xl uppercase tracking-wider text-center">Simple Calculator</h3>
      
      <Card>
         <CardContent className="p-6 space-y-6">
            {marble.variants.length > 1 && (
                <div>
                    <Label className="text-lg font-semibold">Material Format</Label>
                    <Select value={selectedVariant.id} onValueChange={(variantId) => {
                        const newVariant = marble.variants.find(v => v.id === variantId);
                        if (newVariant) setSelectedVariant(newVariant);
                    }}>
                        <SelectTrigger className="mt-2 text-base h-12">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {marble.variants.map(v => (
                                <SelectItem key={v.id} value={v.id}>
                                    {v.size} - {v.thickness} @ PKR {v.price?.toLocaleString()}/sq.ft
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Unit Selection */}
            <div className="space-y-2 p-4 bg-muted/40 rounded-md border border-dashed">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Measurement Unit
                </Label>
                {selectedUnit !== lastConfiguredUnit && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold animate-pulse uppercase tracking-wider">
                    Unit changed! Please click Fit Measurement
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {(['inches', 'feet', 'cm', 'mm'] as const).map((unit) => {
                  const displayLabel = unit === 'inches' ? 'Inches' : unit === 'feet' ? 'Feet' : unit === 'cm' ? 'Centimeters' : 'Millimeters';
                  return (
                    <Button
                      key={unit}
                      type="button"
                      variant={selectedUnit === unit ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedUnit(unit)}
                      className="h-8 px-3 text-xs"
                    >
                      {displayLabel}
                    </Button>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFitMeasurement}
                  disabled={selectedUnit === lastConfiguredUnit}
                  className={cn(
                    "h-8 px-3 text-xs font-bold transition-all ml-auto md:ml-0",
                    selectedUnit !== lastConfiguredUnit 
                      ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse shadow-md" 
                      : "text-muted-foreground cursor-not-allowed opacity-50"
                  )}
                >
                  Fit Measurement
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="length" className="text-lg font-semibold">
                      Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})
                    </Label>
                    <Input 
                      id="length"
                      value={length}
                      onChange={e => handleLengthChange(e.target.value)}
                      className="text-lg font-bold h-12 mt-2"
                      placeholder={`e.g., ${selectedUnit === 'feet' ? '12' : selectedUnit === 'inches' ? '144' : selectedUnit === 'cm' ? '365' : '3650'}`}
                      inputMode="decimal"
                    />
                </div>
                <div>
                    <Label htmlFor="width" className="text-lg font-semibold">
                      Width ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})
                    </Label>
                    <Input 
                      id="width"
                      value={width}
                      onChange={e => handleWidthChange(e.target.value)}
                      className="text-lg font-bold h-12 mt-2"
                      placeholder={`e.g., ${selectedUnit === 'feet' ? '10' : selectedUnit === 'inches' ? '120' : selectedUnit === 'cm' ? '304' : '3040'}`}
                      inputMode="decimal"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="total-area" className="text-lg font-semibold">Total Area (sq.ft)</Label>
                <Input 
                  id="total-area"
                  value={totalArea}
                  onChange={e => setTotalArea(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="text-lg font-bold h-12 mt-2"
                  placeholder="e.g., 120"
                  inputMode="decimal"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter or edit total required area. We'll add {costs.wastagePercentage}% wastage automatically.
                </p>
            </div>
            <Separator />
            <div>
                <Label htmlFor="skirting-rft" className="text-lg font-semibold">Skirting / Baseboard (optional)</Label>
                <div className="flex gap-2 mt-2">
                    <Input 
                      id="skirting-rft"
                      value={skirtingRft}
                      onChange={e => setSkirtingRft(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="text-lg font-bold h-12"
                      placeholder="Length in RFT"
                      inputMode="decimal"
                    />
                     <Select value={skirtingHeight} onValueChange={setSkirtingHeight}>
                        <SelectTrigger className="w-[180px] text-lg font-bold h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">3 inches</SelectItem>
                            <SelectItem value="4">4 inches</SelectItem>
                            <SelectItem value="5">5 inches</SelectItem>
                            <SelectItem value="6">6 inches</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter total running feet (RFT) for skirting. Polish charges will be calculated.
                </p>
            </div>
        </CardContent>
      </Card>

      {calculations.grandTotal > 0 && (
        <div className="mt-6 border-t pt-4">
            <Card>
              <CardContent className="p-4">
                  <h4 className="font-bold text-center mb-2">Cost Breakdown</h4>
                  <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-4">
                          <Image src={marble.imageUrl} alt={marble.name} width={64} height={64} className="rounded-md object-cover" />
                          <div className="w-full">
                              <p className="font-semibold text-base">{marble.name}</p>
                               <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Final Area (incl. {costs.wastagePercentage}% wastage): {calculations.finalSqFt.toFixed(2)} sq.ft @ PKR {(selectedVariant.price ?? 0).toLocaleString()}/sq.ft</span>
                                    <span className="font-semibold">PKR {calculations.materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                          </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="pt-1 space-y-1 text-xs">
                         {calculations.skirtingPolishCost > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Skirting Polish ({calculations.skirtingRft.toFixed(2)} rft):</span>
                                <span className="font-semibold">PKR {calculations.skirtingPolishCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                         )}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-lg font-bold pt-1">
                          <span>Total for this item:</span>
                          <span className="text-primary">PKR {calculations.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                  </div>
              </CardContent>
            </Card>
        </div>
      )}
       
        <div className="mt-6 border-t pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={calculations.grandTotal <= 0}>
                 <Save className="mr-2 h-4 w-4" />
                Save Requirement
            </Button>
        </div>
    </div>
  );
}
