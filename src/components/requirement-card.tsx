'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, RefreshCw, Scale, Globe, Briefcase } from 'lucide-react';
import type { Requirement, Marble, MarbleVariant } from '@/lib/types';
import { requirementConfig } from '@/lib/requirements-config';
import { edgeProfiles } from './order-form';
import { Input } from './ui/input';
import { useCalculation } from '@/context/calculation-context';
import { useLanguage } from '@/context/language-context';
import { marbles } from '@/lib/data';
import { filterMarblesForRequirement } from '@/lib/calculator-categories';

interface RequirementCardProps {
  req: Requirement;
  onEdit: (id: number) => void;
  onRemove: (id: number) => void;
  onMaterialChange?: (id: number) => void;
  marblesList?: Marble[];
}

// Helper to find a matching variant by size and thickness or fall back to the first one
export const findMatchingVariant = (currentVariant: MarbleVariant | undefined, targetMarble: Marble): MarbleVariant | undefined => {
  if (!currentVariant) return targetMarble.variants[0];
  const match = targetMarble.variants.find(
    v => v.size === currentVariant.size && v.thickness === currentVariant.thickness
  );
  return match || targetMarble.variants[0];
};

// Helper to calculate cost for a target marble based on existing requirement specifications
export const calculateCostForMarble = (
  req: Requirement, 
  targetMarble: Marble, 
  targetVariant: MarbleVariant | undefined
): { total: number; details: any } => {
  if (!targetVariant) return { total: 0, details: {} };

  const details = JSON.parse(JSON.stringify(req.details || {}));
  const newRate = targetVariant.price || 0;
  let newTotal = 0;

  if (details.isPerPiece) {
    newTotal = newRate * (req.quantity || 1);
    details.pricePerPiece = newRate;
  } else {
    switch (req.type) {
      case 'simple': {
        const finalSqFt = details.finalSqFt || 0;
        const materialCost = finalSqFt * newRate;
        const skirtingPolishCost = details.skirtingPolishCost || 0;
        newTotal = materialCost + skirtingPolishCost;
        
        details.materialCost = materialCost;
        details.grandTotal = newTotal;
        details.rate = newRate;
        break;
      }
      case 'floor': {
        const finalFloorSqFt = details.finalFloorSqFt || 0;
        const floorMaterialCost = finalFloorSqFt * newRate;
        
        let skirtingMaterialCost = 0;
        if (details.includeSkirting && (details.skirtingHeight || 0) > 0) {
          const finalSkirtingSqFt = details.finalSkirtingSqFt || 0;
          skirtingMaterialCost = finalSkirtingSqFt * newRate;
        }
        
        const skirtingPolishCost = details.skirtingPolishCost || 0;
        newTotal = floorMaterialCost + skirtingMaterialCost + skirtingPolishCost;
        
        details.floorMaterialCost = floorMaterialCost;
        details.skirtingMaterialCost = skirtingMaterialCost;
        details.materialCost = floorMaterialCost + skirtingMaterialCost;
        details.grandTotal = newTotal;
        details.rate = newRate;
        break;
      }
      case 'kitchen': {
        const finalSqFt = details.finalSqFt || 0;
        const materialCost = finalSqFt * newRate;
        const sinkCost = details.sinkCost || 0;
        const stoveCost = details.stoveCost || 0;
        const edgeProfileCost = details.edgeProfileCost || 0;
        
        newTotal = materialCost + sinkCost + stoveCost + edgeProfileCost;
        
        details.materialCost = materialCost;
        details.total = newTotal;
        details.rate = newRate;
        break;
      }
      case 'vanity': {
        let grandTotal = 0;
        let totalMaterialCost = 0;
        let totalEdgeCost = 0;
        let totalSinkCost = 0;
        let totalLutakCost = 0;
        let totalCuttingCost = 0;

        const updatedVanities = (details.vanities || []).map((vanity: any) => {
          const calc = vanity.calculations || {};
          const finalSqFt = calc.finalSqFt !== undefined ? calc.finalSqFt : (vanity.finalSqFt || 0);
          const materialCost = finalSqFt * newRate;
          const edgeCost = calc.edgeCost !== undefined ? calc.edgeCost : (vanity.edgeCost || 0);
          const sinkCost = calc.sinkCost !== undefined ? calc.sinkCost : (vanity.sinkCost || 0);
          const lutakCost = calc.lutakCost !== undefined ? calc.lutakCost : (vanity.lutakCost || 0);
          const cuttingCost = calc.cuttingCost !== undefined ? calc.cuttingCost : (vanity.cuttingCost || 0);
          const totalCost = materialCost + edgeCost + sinkCost + lutakCost + cuttingCost;
          
          grandTotal += totalCost;
          totalMaterialCost += materialCost;
          totalEdgeCost += edgeCost;
          totalSinkCost += sinkCost;
          totalLutakCost += lutakCost;
          totalCuttingCost += cuttingCost;

          return {
            ...vanity,
            calculations: {
              ...calc,
              materialCost,
              totalCost
            },
            materialCost,
            totalCost
          };
        });
        
        newTotal = grandTotal;
        details.vanities = updatedVanities;
        details.grandTotal = grandTotal;
        details.materialCost = totalMaterialCost;
        details.edgeProfileCost = totalEdgeCost;
        details.sinkCost = totalSinkCost;
        details.lutakCost = totalLutakCost;
        details.cuttingCost = totalCuttingCost;
        details.rate = newRate;
        break;
      }
      case 'stairs':
      case 'window-sill': {
        const finalSqFt = details.finalSqFt || 0;
        const marbleTotal = finalSqFt * newRate;
        const innerCutCost = details.innerCutCost || 0;
        
        let edgeProfileCost = 0;
        if (details.edgeProfilingCosts) {
          edgeProfileCost = Object.values(details.edgeProfilingCosts).reduce(
            (sum: number, p: any) => sum + (p?.cost || 0), 
            0
          );
        }
        
        newTotal = marbleTotal + innerCutCost + edgeProfileCost;
        
        details.marbleTotal = marbleTotal;
        details.edgeProfileCost = edgeProfileCost;
        details.rate = newRate;
        break;
      }
      case 'cutting-optimizer': {
        const totalSlabArea = details.totalSlabAreaSqFt || details.totalUsedAreaSqFt || details.finalSqFt || 0;
        newTotal = Math.round(totalSlabArea * newRate);
        details.materialCost = newTotal;
        details.rate = newRate;
        break;
      }
      default: {
        if (details.finalSqFt) {
          details.materialCost = details.finalSqFt * newRate;
          details.rate = newRate;
          const otherCosts = (details.edgeProfileCost || 0) + (details.sinkCost || 0) + (details.stoveCost || 0) + (details.innerCutCost || 0) + (details.skirtingPolishCost || 0) + (details.lutakCost || 0) + (details.cuttingCost || 0);
          newTotal = details.materialCost + otherCosts;
        } else {
          newTotal = req.total;
        }
      }
    }
  }

  return { total: newTotal, details };
};

const RequirementCard = ({ req, onEdit, onRemove, onMaterialChange, marblesList }: RequirementCardProps) => {
  const { updateRequirement } = useCalculation();
  const { language } = useLanguage();
  const [isComparing, setIsComparing] = useState(false);
  
  const details = req.details || {};
  const isFixingMaterial = req.type === 'fixing_material';
  const isPerPiece = details.isPerPiece === true;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value) || 0;
    updateRequirement(req.id, { quantity: newQuantity });
  };
  
  const requirementTypeInfo = req.type ? requirementConfig[req.type] : null;
  const requirementTypeName = requirementTypeInfo ? requirementTypeInfo.name : req.type;

  // Business logic filters based on requirement compatibility and recommended categories
  const availableMarbles = useMemo(() => {
    const list = (marblesList || marbles);
    return filterMarblesForRequirement(list, req, null, 'recommended');
  }, [req, marblesList]);

  // Calculate comparison costs for each compatible marble
  const comparisons = useMemo(() => {
    if (isFixingMaterial || req.type === 'labor_quote' || !req.marble) return [];
    
    return availableMarbles.map(m => {
      const variant = findMatchingVariant(req.variant, m);
      const { total, details: calcDetails } = calculateCostForMarble(req, m, variant);
      return {
        marble: m,
        variant,
        total,
        details: calcDetails
      };
    }).sort((a, b) => a.total - b.total); // Sort by total cost so user sees budget options clearly
  }, [availableMarbles, req, isFixingMaterial]);

  const handleSwapMaterial = (targetMarble: Marble, calculatedTotal: number, calculatedDetails: any) => {
    const targetVariant = findMatchingVariant(req.variant, targetMarble);
    if (!targetVariant) return;
    
    updateRequirement(req.id, {
      marble: targetMarble,
      marbleId: targetMarble.id,
      variant: targetVariant,
      variantId: targetVariant.id,
      total: calculatedTotal,
      details: calculatedDetails
    });
  };

  const canCompare = !isFixingMaterial && req.type !== 'labor_quote' && req.marble && comparisons.length > 0;

  return (
    <Card className="print-section overflow-hidden border-2 hover:border-muted-foreground/20 transition-all duration-300 shadow-sm hover:shadow-md">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <Image 
              src={req.marble?.imageUrl || req.fixingMaterial?.imageUrl || ''} 
              alt={req.name} 
              width={64} 
              height={64} 
              className="rounded-md object-cover border" 
              referrerPolicy="no-referrer"
            />
            {onMaterialChange && !isFixingMaterial && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity print-hidden"
                onClick={() => onMaterialChange(req.id)}
                title="Change Material / Check other price"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div>
            <CardTitle className="text-base md:text-lg font-bold text-foreground">{req.name}</CardTitle>
            {isFixingMaterial ? (
              <CardDescription className="text-sm text-foreground/80 font-semibold">PKR <span className="text-blue-600 font-bold">{req.fixingMaterial?.price.toLocaleString()}</span> / {req.fixingMaterial?.unit}</CardDescription>
            ) : isPerPiece ? (
              <CardDescription className="text-sm text-foreground/80 font-semibold">PKR <span className="text-blue-600 font-bold">{details.pricePerPiece?.toLocaleString()}</span> / piece</CardDescription>
            ) : req.type === 'labor_quote' ? (
              <CardDescription className="space-y-0.5 text-muted-foreground">
                <span className="font-semibold text-foreground block">
                  {language === 'ur' ? 'سٹون ایکسپرٹ ٹیم سروسز' : 'Stone Expert Team Services'}
                </span>
                <span className="text-xs block">
                  {language === 'ur' ? 'لیبر کوٹیشن، رگڑائی، فکسنگ اور یوٹیلیٹی تفصیلات' : 'Labor Quote, Grinding, Fixing & Site Logistics'}
                </span>
              </CardDescription>
            ) : (
              <CardDescription className="space-y-0.5 text-muted-foreground">
                <span className="font-semibold text-foreground block">{req.marble?.name}</span>
                <span className="text-xs block">{requirementTypeName}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {req.variant && <span className="inline-block text-[10px] text-foreground/85 font-semibold bg-muted px-2 py-0.5 rounded-full">{req.variant.size} - {req.variant.thickness}</span>}
                  {req.type === 'stairs' && details.stairLocation && (
                    <span className="inline-block text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full capitalize">
                      Location: {details.stairLocation === 'other' ? (details.customStairLocation || 'Other') : (details.stairLocation === 'ground' ? 'Ground floor' : details.stairLocation === 'first' ? 'First floor' : details.stairLocation)}
                    </span>
                  )}
                  {req.type === 'stairs' && details.selectedUnit && (
                    <span className="inline-block text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
                      Unit: {details.selectedUnit}
                    </span>
                  )}
                </div>
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 print-hidden">
          {!(isFixingMaterial || isPerPiece) && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(req.id)}><Pencil className="h-4 w-4" /></Button>}
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => onRemove(req.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      {req.total > 0 && (
        <CardContent className="space-y-4">
          {isFixingMaterial || isPerPiece ? (
            <div className="space-y-2 text-sm text-foreground">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor={`qty-${req.id}`} className="font-semibold text-foreground">Quantity:</label>
                  <Input 
                    id={`qty-${req.id}`}
                    type="number" 
                    value={req.quantity || ''} 
                    onChange={handleQuantityChange}
                    className="h-8 w-20 text-blue-600 border-blue-200"
                  />
                  {isFixingMaterial && <span className="text-foreground font-medium">{req.fixingMaterial?.unit}</span>}
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-foreground">
                  <span>Total:</span>
                  <span className="text-foreground ml-2 font-bold">PKR <span className="text-blue-600 font-extrabold">{req.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-foreground">
              {req.type === 'labor_quote' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
                    {/* Stone Expert Labor */}
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">
                        {language === 'ur' ? 'سٹون ایکسپرٹ لیبر:' : 'Stone Expert Labor:'}
                      </span>
                      <span className="font-bold">
                        {details.useExpertFlat ? (
                          <span>PKR {details.expertLaborFlatCost?.toLocaleString()} ({language === 'ur' ? 'فکسڈ' : 'Fixed'})</span>
                        ) : (
                          <span>
                            {details.expertLaborArea} sq.ft @ PKR {details.expertLaborRate}/sqft
                            <span className="text-blue-600 block text-[11px] text-right font-semibold">PKR {details.expertLaborTotal?.toLocaleString()}</span>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Labor Fixing */}
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">
                        {language === 'ur' ? 'لیبر فکسنگ:' : 'Labor Fixing:'}
                      </span>
                      <span className="font-bold">
                        {details.useFixingFlat ? (
                          <span>PKR {details.fixingLaborFlatCost?.toLocaleString()} ({language === 'ur' ? 'فکسڈ' : 'Fixed'})</span>
                        ) : (
                          <span>
                            {details.fixingLaborArea} sq.ft @ PKR {details.fixingLaborRate}/sqft
                            <span className="text-blue-600 block text-[11px] text-right font-semibold">PKR {details.fixingLaborTotal?.toLocaleString()}</span>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Grinding Cost */}
                    {details.grindingCost > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">
                          {language === 'ur' ? 'گرائنڈنگ / رگڑائی:' : 'Grinding Cost:'}
                        </span>
                        <span className="font-bold text-foreground">
                          PKR {details.grindingCost?.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Folding Cost */}
                    {details.foldingCost > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span className="text-muted-foreground font-medium">
                          {language === 'ur' ? 'فولڈنگ لاگت:' : 'Folding Cost:'}
                        </span>
                        <span className="font-bold text-foreground">
                          PKR {details.foldingCost?.toLocaleString()} ({details.foldingIncluded === 'included' ? (language === 'ur' ? 'شامل ہے' : 'Included') : (language === 'ur' ? 'علیحدہ' : 'Separate')})
                        </span>
                      </div>
                    )}

                    {/* Site Type / Residential */}
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">
                        {language === 'ur' ? 'سائٹ قسم (Residential):' : 'Residential Job:'}
                      </span>
                      <span className="font-bold text-foreground capitalize">
                        {details.isResidential === 'yes' ? (language === 'ur' ? 'رہائشی' : 'Yes') : (language === 'ur' ? 'کمرشل' : 'No')}
                      </span>
                    </div>

                    {/* Water Supply */}
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">
                        {language === 'ur' ? 'پانی کا انتظام:' : 'Water Supply:'}
                      </span>
                      <span className="font-bold text-foreground capitalize">
                        {details.waterSupply === 'client' ? (language === 'ur' ? 'کسٹمر کی طرف سے' : 'By Client') : details.waterSupply === 'vendor' ? (language === 'ur' ? 'ہماری طرف سے' : 'By Us') : 'N/A'}
                      </span>
                    </div>

                    {/* Electricity Supply */}
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">
                        {language === 'ur' ? 'بجلی کا انتظام:' : 'Electricity:'}
                      </span>
                      <span className="font-bold text-foreground capitalize">
                        {details.electricity === 'client' ? (language === 'ur' ? 'کسٹمر کی طرف سے' : 'By Client') : details.electricity === 'vendor' ? (language === 'ur' ? 'ہماری طرف سے' : 'By Us') : 'N/A'}
                      </span>
                    </div>

                    {/* Pound Based Settings */}
                    {details.enablePoundLabor && (
                      <div className="flex justify-between items-center py-1 border-b border-border/40 sm:col-span-2 bg-primary/5 p-1.5 rounded">
                        <span className="text-primary font-bold flex items-center gap-1 text-xs">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {language === 'ur' ? 'بین الاقوامی پاؤنڈ ریٹ:' : 'Pound-Based Labor:'}
                        </span>
                        <span className="font-bold text-foreground text-right text-xs">
                          {details.poundHours} hrs @ £{details.poundRate}/hr (Exchange: PKR {details.poundExchangeRate})
                          <span className="text-primary block text-xs font-bold mt-0.5">£{details.poundTotalGBP} = PKR {details.poundTotalPKR?.toLocaleString()}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : req.type === 'cutting-optimizer' ? (
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-foreground">
                    <span>
                      {language === 'ur' ? 'سلیب کٹنگ اور 3D آپٹیمائزیشن:' : 'Slab Cutting & 3D Optimization:'}{' '}
                      <span className="text-blue-600 font-bold">
                        {details.totalSlabsUsed || 1} {language === 'ur' ? 'سلیبیں' : 'Slabs'}
                      </span>{' '}
                      ({(details.totalSlabAreaSqFt || 0).toFixed(2)} sq.ft Total Slab /{' '}
                      {(details.totalUsedAreaSqFt || 0).toFixed(2)} sq.ft Net Pieces)
                    </span>
                    <span className="font-semibold text-foreground">
                      PKR <span className="text-blue-600 font-bold">{req.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-foreground text-xs sm:text-sm">
                  <span className="text-foreground">Area (incl. {details.wastagePercentage || details.wastagePercent || 0}% wastage): <span className="text-blue-600 font-semibold">{(details.finalSqFt || 0).toFixed(2)}</span> sq.ft @ PKR <span className="text-blue-600 font-semibold">{details.rate?.toLocaleString()}</span>/sq.ft</span>
                  <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{(details.materialCost || details.tileCost)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
              )}
              <Separator />
              <div className="text-xs text-foreground space-y-1.5 font-medium">
                 {details.edgeProfilingCosts && Object.entries(details.edgeProfilingCosts).map(([key, value]: [string, any]) => {
                  const profile = edgeProfiles[key as keyof typeof edgeProfiles];
                  if (!value || value.cost <= 0 || !profile) return null;
                  return (
                    <div key={key} className="flex justify-between items-center text-foreground">
                      <span>{profile.name} ({value.rft.toFixed(2)} rft @ PKR {profile.price}/rft):</span>
                      <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{value.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                    </div>
                  );
                })}
                {details.innerCutCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Inner Cutting ({details.innerCutRft?.toFixed(2)} rft):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.innerCutCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.skirtingPolishCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Skirting Polish ({details.skirtingRft?.toFixed(2)} rft):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.skirtingPolishCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.sinkCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Sink Cutouts ({(details.sinkCutouts || (details.sinks && details.sinks.length)) || 0}x):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.sinkCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.stoveCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Stove Cutouts ({details.stoveCutouts || 0}x):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.stoveCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.lutakCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Lutak/Apron Jointing ({details.lutakRft?.toFixed(2)} rft):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.lutakCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.cuttingCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>Piece Cutting ({details.cuttingRft?.toFixed(2)} rft):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.cuttingCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.groutCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>{language === 'ur' ? 'گراؤٹ / فلنگ میٹریل:' : 'Grout Filling Compound:'}</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.groutCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
                {details.laborCost > 0 && (
                  <div className="flex justify-between items-center text-foreground">
                    <span>{language === 'ur' ? 'تنصیب کی مزدوری:' : 'Tiling Installation Labor:'} ({details.roomAreaSqFt || 0} sq.ft @ PKR {details.laborRate}/sqft):</span>
                    <span className="font-semibold text-foreground">PKR <span className="text-blue-600 font-bold">{details.laborCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center text-base sm:text-lg font-bold pt-1 text-foreground">
                <span>{language === 'ur' ? 'کل رقم:' : 'Total for this item:'}</span>
                <span className="text-foreground font-bold">PKR <span className="text-blue-600 font-extrabold text-xl">{req.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              </div>
            </div>
          )}

          {/* Interactive Cost Comparison Strip Section */}
          {canCompare && (
            <div className="pt-2">
              <Separator className="my-3 print-hidden" />
              <div className="flex justify-end print-hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 text-xs cursor-pointer select-none"
                  onClick={() => setIsComparing(!isComparing)}
                >
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {isComparing 
                      ? (language === 'ur' ? 'موازنہ چھپائیں' : 'Hide Comparisons') 
                      : (language === 'ur' ? 'دیگر مواد سے موازنہ کریں' : 'Compare with other materials')}
                  </span>
                </Button>
              </div>

              {isComparing && (
                <div className="mt-4 pt-3 border-t border-dashed border-blue-200 space-y-3 print-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-bold text-foreground tracking-wider uppercase">
                      {language === 'ur' ? 'پیمائش کی بنیاد پر لاگت کا موازنہ' : 'Cost Comparison based on Measurement'}
                    </h4>
                    <span className="text-[10px] text-blue-600 italic font-medium">
                      {language === 'ur' ? 'تبدیل کرنے کے لیے کسی بھی مواد پر کلک کریں' : 'Click any material to swap'}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                    {comparisons.map((item) => {
                      const isCurrent = item.marble.id === req.marbleId;
                      const diff = item.total - req.total;
                      const percentDiff = req.total > 0 ? (diff / req.total) * 100 : 0;
                      
                      return (
                        <button
                          key={item.marble.id}
                          type="button"
                          onClick={() => handleSwapMaterial(item.marble, item.total, item.details)}
                          className={`flex-shrink-0 flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all duration-200 w-[240px] focus:outline-none cursor-pointer ${
                            isCurrent
                              ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600'
                              : 'border-border bg-card/50 hover:bg-muted/50 hover:border-blue-300'
                          }`}
                        >
                          <div className="relative h-12 w-12 rounded-md overflow-hidden shrink-0 border border-muted/50 bg-muted">
                            {item.marble.imageUrl ? (
                              <Image
                                src={item.marble.imageUrl}
                                alt={item.marble.name}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-xs font-bold text-foreground truncate" title={item.marble.name}>
                              {item.marble.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {language === 'ur' ? 'ریٹ:' : 'Rate:'} <span className="text-foreground font-semibold">PKR <span className="text-blue-600 font-bold">{item.variant?.price?.toLocaleString() || 0}</span>/sq.ft</span>
                            </p>
                            <p className="text-xs font-bold text-foreground">
                              PKR <span className="text-blue-600 font-extrabold">{item.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isCurrent ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-500">
                                  {language === 'ur' ? 'موجودہ' : 'Current'}
                                </span>
                              ) : diff < 0 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-600">
                                  {language === 'ur' ? `${Math.abs(percentDiff).toFixed(0)}% بچت` : `Save ${Math.abs(percentDiff).toFixed(0)}%`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-600">
                                  {language === 'ur' ? `${percentDiff.toFixed(0)}% زائد` : `+${percentDiff.toFixed(0)}% more`}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default React.memo(RequirementCard);
