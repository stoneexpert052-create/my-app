'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Info, Briefcase, Globe, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';

interface LaborQuoteCalculatorProps {
  onSave: (data: { total: number; details: any }) => void;
  initialState?: any;
  marble?: Marble;
  variant?: MarbleVariant;
  onCancel: () => void;
}

export function LaborQuoteCalculator({ onSave, initialState, marble, variant, onCancel }: LaborQuoteCalculatorProps) {
  const { language } = useLanguage();

  // Stone Expert Labor fields
  const [expertLaborRate, setExpertLaborRate] = useState<string>('150'); // PKR/sqft
  const [expertLaborArea, setExpertLaborArea] = useState<string>('100'); // sqft
  const [useExpertFlat, setUseExpertFlat] = useState<boolean>(false);
  const [expertLaborFlatCost, setExpertLaborFlatCost] = useState<string>('15000');

  // Fixing Labor fields
  const [fixingLaborRate, setFixingLaborRate] = useState<string>('80'); // PKR/sqft
  const [fixingLaborArea, setFixingLaborArea] = useState<string>('100'); // sqft
  const [useFixingFlat, setUseFixingFlat] = useState<boolean>(false);
  const [fixingLaborFlatCost, setFixingLaborFlatCost] = useState<string>('8000');

  // Additional services
  const [grindingCost, setGrindingCost] = useState<string>('5000');
  const [foldingCost, setFoldingCost] = useState<string>('3000');
  const [foldingIncluded, setFoldingIncluded] = useState<string>('included'); // included, not_included, na

  // Site logistics
  const [isResidential, setIsResidential] = useState<string>('yes'); // yes, no
  const [waterSupply, setWaterSupply] = useState<string>('client'); // client, vendor, na
  const [electricity, setElectricity] = useState<string>('client'); // client, vendor, na

  // International Pound-based setting
  const [enablePoundLabor, setEnablePoundLabor] = useState<boolean>(false);
  const [poundRate, setPoundRate] = useState<string>('15'); // GBP per hour or flat
  const [poundHours, setPoundHours] = useState<string>('10'); // hours
  const [poundExchangeRate, setPoundExchangeRate] = useState<string>('350'); // PKR per GBP

  useEffect(() => {
    if (initialState) {
      setExpertLaborRate(String(initialState.expertLaborRate ?? '150'));
      setExpertLaborArea(String(initialState.expertLaborArea ?? '100'));
      setUseExpertFlat(!!initialState.useExpertFlat);
      setExpertLaborFlatCost(String(initialState.expertLaborFlatCost ?? '15000'));

      setFixingLaborRate(String(initialState.fixingLaborRate ?? '80'));
      setFixingLaborArea(String(initialState.fixingLaborArea ?? '100'));
      setUseFixingFlat(!!initialState.useFixingFlat);
      setFixingLaborFlatCost(String(initialState.fixingLaborFlatCost ?? '8000'));

      setGrindingCost(String(initialState.grindingCost ?? '5000'));
      setFoldingCost(String(initialState.foldingCost ?? '3000'));
      setFoldingIncluded(String(initialState.foldingIncluded ?? 'included'));

      setIsResidential(String(initialState.isResidential ?? 'yes'));
      setWaterSupply(String(initialState.waterSupply ?? 'client'));
      setElectricity(String(initialState.electricity ?? 'client'));

      setEnablePoundLabor(!!initialState.enablePoundLabor);
      setPoundRate(String(initialState.poundRate ?? '15'));
      setPoundHours(String(initialState.poundHours ?? '10'));
      setPoundExchangeRate(String(initialState.poundExchangeRate ?? '350'));
    }
  }, [initialState]);

  // Calculations
  const calculations = useMemo(() => {
    const expertRateVal = parseFloat(expertLaborRate) || 0;
    const expertAreaVal = parseFloat(expertLaborArea) || 0;
    const expertFlatVal = parseFloat(expertLaborFlatCost) || 0;
    const expertTotal = useExpertFlat ? expertFlatVal : expertRateVal * expertAreaVal;

    const fixingRateVal = parseFloat(fixingLaborRate) || 0;
    const fixingAreaVal = parseFloat(fixingLaborArea) || 0;
    const fixingFlatVal = parseFloat(fixingLaborFlatCost) || 0;
    const fixingTotal = useFixingFlat ? fixingFlatVal : fixingRateVal * fixingAreaVal;

    const grindingVal = parseFloat(grindingCost) || 0;
    const foldingVal = parseFloat(foldingCost) || 0;

    const pRateVal = parseFloat(poundRate) || 0;
    const pHoursVal = parseFloat(poundHours) || 0;
    const pExRateVal = parseFloat(poundExchangeRate) || 0;
    const poundTotalGBP = pRateVal * pHoursVal;
    const poundTotalPKR = enablePoundLabor ? poundTotalGBP * pExRateVal : 0;

    const grandTotal = expertTotal + fixingTotal + grindingVal + foldingVal + poundTotalPKR;

    return {
      expertTotal,
      fixingTotal,
      grindingVal,
      foldingVal,
      poundTotalGBP,
      poundTotalPKR,
      grandTotal,
    };
  }, [
    expertLaborRate,
    expertLaborArea,
    useExpertFlat,
    expertLaborFlatCost,
    fixingLaborRate,
    fixingLaborArea,
    useFixingFlat,
    fixingLaborFlatCost,
    grindingCost,
    foldingCost,
    enablePoundLabor,
    poundRate,
    poundHours,
    poundExchangeRate,
  ]);

  const handleSave = () => {
    onSave({
      total: calculations.grandTotal,
      details: {
        expertLaborRate: parseFloat(expertLaborRate) || 0,
        expertLaborArea: parseFloat(expertLaborArea) || 0,
        useExpertFlat,
        expertLaborFlatCost: parseFloat(expertLaborFlatCost) || 0,
        expertLaborTotal: calculations.expertTotal,

        fixingLaborRate: parseFloat(fixingLaborRate) || 0,
        fixingLaborArea: parseFloat(fixingLaborArea) || 0,
        useFixingFlat,
        fixingLaborFlatCost: parseFloat(fixingLaborFlatCost) || 0,
        fixingLaborTotal: calculations.fixingTotal,

        grindingCost: parseFloat(grindingCost) || 0,
        foldingCost: parseFloat(foldingCost) || 0,
        foldingIncluded,

        isResidential,
        waterSupply,
        electricity,

        enablePoundLabor,
        poundRate: parseFloat(poundRate) || 0,
        poundHours: parseFloat(poundHours) || 0,
        poundExchangeRate: parseFloat(poundExchangeRate) || 0,
        poundTotalGBP: calculations.poundTotalGBP,
        poundTotalPKR: calculations.poundTotalPKR,
        
        isLaborQuote: true,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1 text-foreground" id="labor-quote-panel">
      <Card className="border shadow-md">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {language === 'ur' ? 'لیبر کوٹیشن کیلکولیٹر' : 'Labor Quote Calculator'}
              </CardTitle>
              <CardDescription>
                {language === 'ur'
                  ? 'سٹون ایکسپرٹ کے لیے لیبر ریٹس اور سروسز کی تفصیلات درج کریں۔'
                  : 'Specify professional labor rates and site details for the quotation.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Section 1: Stone Expert Labor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <span>1. {language === 'ur' ? 'سٹون ایکسپرٹ لیبر ریٹ' : 'Stone Expert Labor'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-expert-flat"
                  checked={useExpertFlat}
                  onCheckedChange={(checked) => setUseExpertFlat(!!checked)}
                />
                <Label htmlFor="use-expert-flat" className="text-xs cursor-pointer select-none">
                  {language === 'ur' ? 'فلیٹ ریٹ استعمال کریں' : 'Use Flat/Fixed Cost'}
                </Label>
              </div>
            </div>

            {useExpertFlat ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expert-flat-cost">
                    {language === 'ur' ? 'کل لیبر لاگت (PKR):' : 'Total Labor Cost (PKR)'}
                  </Label>
                  <Input
                    id="expert-flat-cost"
                    type="number"
                    value={expertLaborFlatCost}
                    onChange={(e) => setExpertLaborFlatCost(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expert-rate">
                    {language === 'ur' ? 'لیبر ریٹ (PKR / sq.ft):' : 'Labor Rate (PKR / sq.ft)'}
                  </Label>
                  <Input
                    id="expert-rate"
                    type="number"
                    value={expertLaborRate}
                    onChange={(e) => setExpertLaborRate(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expert-area">
                    {language === 'ur' ? 'کل رقبہ (Sq.Ft):' : 'Total Area (Sq.Ft)'}
                  </Label>
                  <Input
                    id="expert-area"
                    type="number"
                    value={expertLaborArea}
                    onChange={(e) => setExpertLaborArea(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
            )}
            <div className="text-right text-sm font-bold text-muted-foreground">
              {language === 'ur' ? 'مجموعی ایکسپرٹ لیبر:' : 'Expert Labor Subtotal:'}{' '}
              <span className="text-primary font-mono text-base">PKR {calculations.expertTotal.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Section 2: Labor Fixing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-primary">
                2. {language === 'ur' ? 'فکسنگ کی مزدوری (Fixing Labor)' : 'Labor Fixing'}
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-fixing-flat"
                  checked={useFixingFlat}
                  onCheckedChange={(checked) => setUseFixingFlat(!!checked)}
                />
                <Label htmlFor="use-fixing-flat" className="text-xs cursor-pointer select-none">
                  {language === 'ur' ? 'فلیٹ ریٹ استعمال کریں' : 'Use Flat/Fixed Cost'}
                </Label>
              </div>
            </div>

            {useFixingFlat ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixing-flat-cost">
                    {language === 'ur' ? 'کل فکسنگ لاگت (PKR):' : 'Total Fixing Cost (PKR)'}
                  </Label>
                  <Input
                    id="fixing-flat-cost"
                    type="number"
                    value={fixingLaborFlatCost}
                    onChange={(e) => setFixingLaborFlatCost(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 8000"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixing-rate">
                    {language === 'ur' ? 'فکسنگ ریٹ (PKR / sq.ft):' : 'Fixing Rate (PKR / sq.ft)'}
                  </Label>
                  <Input
                    id="fixing-rate"
                    type="number"
                    value={fixingLaborRate}
                    onChange={(e) => setFixingLaborRate(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixing-area">
                    {language === 'ur' ? 'کل رقبہ (Sq.Ft):' : 'Total Area (Sq.Ft)'}
                  </Label>
                  <Input
                    id="fixing-area"
                    type="number"
                    value={fixingLaborArea}
                    onChange={(e) => setFixingLaborArea(e.target.value)}
                    className="h-10"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
            )}
            <div className="text-right text-sm font-bold text-muted-foreground">
              {language === 'ur' ? 'مجموعی فکسنگ لیبر:' : 'Fixing Labor Subtotal:'}{' '}
              <span className="text-primary font-mono text-base">PKR {calculations.fixingTotal.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Section 3: Grinding & Folding */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-primary border-b pb-2">
              3. {language === 'ur' ? 'رگڑائی اور فولڈنگ (Grinding & Folding)' : 'Grinding & Folding'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grinding-cost">
                  {language === 'ur' ? 'گرائنڈنگ / رگڑائی لاگت (PKR):' : 'Grinding Cost (PKR)'}
                </Label>
                <Input
                  id="grinding-cost"
                  type="number"
                  value={grindingCost}
                  onChange={(e) => setGrindingCost(e.target.value)}
                  className="h-10"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folding-cost">
                  {language === 'ur' ? 'فولڈنگ لاگت (PKR):' : 'Folding Cost (PKR)'}
                </Label>
                <Input
                  id="folding-cost"
                  type="number"
                  value={foldingCost}
                  onChange={(e) => setFoldingCost(e.target.value)}
                  className="h-10"
                  placeholder="e.g. 3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folding-included">
                  {language === 'ur' ? 'کیا فولڈنگ شامل ہے؟' : 'Is Folding Included?'}
                </Label>
                <Select value={foldingIncluded} onValueChange={setFoldingIncluded}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">{language === 'ur' ? 'ہاں، شامل ہے' : 'Yes, Included'}</SelectItem>
                    <SelectItem value="not_included">{language === 'ur' ? 'نہیں، علیحدہ چارجز' : 'No, Separate'}</SelectItem>
                    <SelectItem value="na">{language === 'ur' ? 'قابلِ اطلاق نہیں (N/A)' : 'Not Applicable (N/A)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Site Logistics */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-primary border-b pb-2">
              4. {language === 'ur' ? 'سائٹ کے انتظامات اور یوٹیلیٹیز' : 'Site Logistics & Utilities'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="is-residential">
                  {language === 'ur' ? 'رہائشی جگہ (Residential)?' : 'Residential Job?'}
                </Label>
                <Select value={isResidential} onValueChange={setIsResidential}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{language === 'ur' ? 'رہائشی (Residential)' : 'Yes (Residential)'}</SelectItem>
                    <SelectItem value="no">{language === 'ur' ? 'کمرشل (Commercial)' : 'No (Commercial)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="water-supply">
                  {language === 'ur' ? 'پانی کی فراہمی (Water Supply):' : 'Water Supply:'}
                </Label>
                <Select value={waterSupply} onValueChange={setWaterSupply}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">{language === 'ur' ? 'کسٹمر کی طرف سے (By Client)' : 'By Client'}</SelectItem>
                    <SelectItem value="vendor">{language === 'ur' ? 'ہماری طرف سے (By Us)' : 'By Us / Contractor'}</SelectItem>
                    <SelectItem value="na">{language === 'ur' ? 'مطلوب نہیں (N/A)' : 'Not Required (N/A)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricity-supply">
                  {language === 'ur' ? 'بجلی کی فراہمی (Electricity):' : 'Electricity:'}
                </Label>
                <Select value={electricity} onValueChange={setElectricity}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">{language === 'ur' ? 'کسٹمر کی طرف سے (By Client)' : 'By Client'}</SelectItem>
                    <SelectItem value="vendor">{language === 'ur' ? 'ہماری طرف سے (By Us)' : 'By Us / Contractor'}</SelectItem>
                    <SelectItem value="na">{language === 'ur' ? 'مطلوب نہیں (N/A)' : 'Not Required (N/A)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: International Pound-based labor settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span>5. {language === 'ur' ? 'بین الاقوامی پاؤنڈ پر مبنی لیبر ریٹ' : 'International Pound-Based Setting'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable-pound-labor"
                  checked={enablePoundLabor}
                  onCheckedChange={(checked) => setEnablePoundLabor(!!checked)}
                />
                <Label htmlFor="enable-pound-labor" className="text-xs font-bold cursor-pointer select-none">
                  {language === 'ur' ? 'پاؤنڈ لیبر فعال کریں' : 'Enable Pound-Based settings'}
                </Label>
              </div>
            </div>

            {enablePoundLabor && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-primary/5 border animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label htmlFor="pound-rate">
                    {language === 'ur' ? 'لیبر ریٹ پاؤنڈز میں (£/hr):' : 'Labor Rate (£/hr)'}
                  </Label>
                  <Input
                    id="pound-rate"
                    type="number"
                    value={poundRate}
                    onChange={(e) => setPoundRate(e.target.value)}
                    className="h-10 bg-background"
                    placeholder="e.g. 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pound-hours">
                    {language === 'ur' ? 'کل گھنٹے (Hours):' : 'Total Hours'}
                  </Label>
                  <Input
                    id="pound-hours"
                    type="number"
                    value={poundHours}
                    onChange={(e) => setPoundHours(e.target.value)}
                    className="h-10 bg-background"
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchange-rate">
                    {language === 'ur' ? 'ایکسچینج ریٹ (PKR / £):' : 'Exchange Rate (PKR / £)'}
                  </Label>
                  <Input
                    id="exchange-rate"
                    type="number"
                    value={poundExchangeRate}
                    onChange={(e) => setPoundExchangeRate(e.target.value)}
                    className="h-10 bg-background"
                    placeholder="e.g. 350"
                  />
                </div>
                <div className="col-span-1 md:col-span-3 text-right text-xs text-muted-foreground font-semibold">
                  {language === 'ur' ? 'کل پاؤنڈ لیبر:' : 'Pound Labor total:'}{' '}
                  <span className="text-foreground font-bold">£{calculations.poundTotalGBP}</span> ={' '}
                  <span className="text-primary font-bold">PKR {calculations.poundTotalPKR.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subtotal Display */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/40 p-5 rounded-lg border border-border/60">
        <div>
          <span className="text-sm font-semibold text-muted-foreground block">
            {language === 'ur' ? 'کل لیبر کوٹیشن لاگت:' : 'Total Labor Quote Cost:'}
          </span>
          <span className="text-3xl font-extrabold text-primary font-mono">
            PKR {calculations.grandTotal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-initial h-11 px-6 font-semibold" onClick={onCancel}>
            {language === 'ur' ? 'منسوخ کریں' : 'Cancel'}
          </Button>
          <Button className="flex-1 sm:flex-initial h-11 px-8 font-bold text-base" onClick={handleSave}>
            <Save className="mr-2 h-5 w-5" />
            {language === 'ur' ? 'کوٹیشن محفوظ کریں' : 'Save Labor Quote'}
          </Button>
        </div>
      </div>
    </div>
  );
}
