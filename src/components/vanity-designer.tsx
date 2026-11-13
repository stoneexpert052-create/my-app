

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Square, Minus, DraftingCompass, Trash2, Bath, Calculator, PlusCircle, ZoomIn, ZoomOut, RotateCw, ChevronDown, Wand2, Settings, Scissors, Move, Home, Pencil, Save } from 'lucide-react';
import { VanityLayout } from './vanity-layout';
import { edgeProfiles, type ProfileType } from './order-form';
import { useLanguage } from '@/context/language-context';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { marbles as initialMarbles } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCalculation } from '@/context/calculation-context';


interface VanityDesignerProps {
  onSave: (data: { total: number; details: any; variant: MarbleVariant; }) => void;
  initialState: any;
  marble: Marble;
  variant: MarbleVariant;
  onCancel: () => void;
}


export type LayoutType = 'straight' | 'l-shape' | 'cut-corner';

const layoutOptions: {
  id: LayoutType;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'straight', label: 'Straight', icon: Minus },
  { id: 'l-shape', label: 'L-Shape', icon: DraftingCompass },
  { id: 'cut-corner', label: 'Cut Corner', icon: Square },
];

export type SinkCutout = {
  id: number;
  type: 'undermount' | 'drop-in';
  shape: 'rectangle' | 'circle';
  width: string;
  length: string;
  x: string;
  y: string;
  radius?: string;
  alignment?: 'centered' | 'up' | 'down';
};

export type VanityState = {
  id: number;
  name: string;
  layout: LayoutType;
  length: string;
  width: string;
  lShapeSideA: string;
  lShapeSideB: string;
  cutCornerX: string;
  cutCornerY: string;
  backsplash: { back: boolean; left: boolean; right: boolean; height: string };
  lutak: { front: boolean; left: boolean; right: boolean; height: string };
  sinks: SinkCutout[];
  profileType: ProfileType;
  jointType: ProfileType;
  selectedEdges: Record<string, boolean>;
};

let nextVanityId = 1;

export const createNewVanity = (name: string = 'New Vanity'): VanityState => {
    const newId = Date.now();
    return {
        id: newId,
        name: name || `Vanity #${newId}`,
        layout: 'straight',
        length: '48',
        width: '22',
        lShapeSideA: '48',
        lShapeSideB: '36',
        cutCornerX: '12',
        cutCornerY: '12',
        backsplash: { back: false, left: false, right: false, height: '4' },
        lutak: { front: true, left: false, right: false, height: '4' },
        sinks: [],
        profileType: 'tukker',
        jointType: 'litacGroove',
        selectedEdges: {
            'straight_front': true, 
            'l_shape_front_a': true,
            'l_shape_front_b': true,
            'cut_corner_front': true,
            'cut_corner_cut': true,
        },
    }
};

export const recalculateSinks = (
  sinks: SinkCutout[],
  layout: LayoutType,
  vLength: string,
  vWidth: string,
  lShapeSideA: string,
  unit: 'inches' | 'feet' | 'cm' | 'mm'
): SinkCutout[] => {
  const vanityWidth = parseFloat(vWidth) || 0;
  const vanityLength = parseFloat(layout === 'l-shape' ? lShapeSideA : vLength) || 0;
  
  return sinks.map(s => {
    const align = s.alignment || 'centered';
    const w = parseFloat(s.width) || 0;
    const l = parseFloat(s.length) || 0;
    
    // Recalculate x (centered horizontally)
    const x = Math.max(0, (vanityLength - w) / 2).toFixed(1);
    
    // Recalculate y based on alignment
    let yVal = 0;
    if (align === 'centered') {
      yVal = Math.max(0, (vanityWidth - l) / 2);
    } else if (align === 'up') {
      let margin = 2.5; // inches
      if (unit === 'feet') margin = 2.5 / 12;
      else if (unit === 'cm') margin = 2.5 * 2.54;
      else if (unit === 'mm') margin = 2.5 * 25.4;
      yVal = margin;
    } else if (align === 'down') {
      let margin = 2.5; // inches
      if (unit === 'feet') margin = 2.5 / 12;
      else if (unit === 'cm') margin = 2.5 * 2.54;
      else if (unit === 'mm') margin = 2.5 * 25.4;
      yVal = Math.max(0, vanityWidth - l - margin);
    }
    const y = yVal.toFixed(1);
    
    return {
      ...s,
      alignment: align,
      x,
      y
    };
  });
};


export function VanityDesigner({ onSave, initialState, marble, variant, onCancel }: VanityDesignerProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [vanities, setVanities] = useState<VanityState[]>(initialState?.vanities || []);
  const [activeVanityId, setActiveVanityId] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAddVanityDialogOpen, setIsAddVanityDialogOpen] = useState(false);
  const [newVanityName, setNewVanityName] = useState('');

  const [selectedUnit, setSelectedUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'inches');
  const [lastConfiguredUnit, setLastConfiguredUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'inches');

  const convertUnitValue = useCallback((value: number, from: string, to: string): number => {
    if (from === to) return value;
    let inches = value;
    if (from === 'feet') inches = value * 12;
    else if (from === 'cm') inches = value / 2.54;
    else if (from === 'mm') inches = value / 25.4;

    if (to === 'inches') return inches;
    if (to === 'feet') return inches / 12;
    if (to === 'cm') return inches * 2.54;
    if (to === 'mm') return inches * 25.4;
    return value;
  }, []);

  const getInches = useCallback((valueStr: string, unit: 'inches' | 'feet' | 'cm' | 'mm') => {
    const val = parseFloat(valueStr) || 0;
    if (unit === 'inches') return val;
    if (unit === 'feet') return val * 12;
    if (unit === 'cm') return val / 2.54;
    if (unit === 'mm') return val / 25.4;
    return val;
  }, []);

  const fitMeasurement = useCallback(() => {
    const fromUnit = lastConfiguredUnit;
    const toUnit = selectedUnit;
    if (fromUnit === toUnit) return;

    const convertStr = (valStr: string) => {
      const val = parseFloat(valStr) || 0;
      return convertUnitValue(val, fromUnit, toUnit).toFixed(1);
    };

    setVanities(prev => prev.map(v => {
      const convertedLength = convertStr(v.length);
      const convertedWidth = convertStr(v.width);
      const convertedSideA = convertStr(v.lShapeSideA);
      
      const convertedSinks = v.sinks.map(s => ({
        ...s,
        width: convertStr(s.width),
        length: convertStr(s.length),
        x: convertStr(s.x),
        y: convertStr(s.y)
      }));
      
      const recalculatedSinksList = recalculateSinks(
        convertedSinks,
        v.layout,
        convertedLength,
        convertedWidth,
        convertedSideA,
        toUnit
      );
      
      return {
        ...v,
        length: convertedLength,
        width: convertedWidth,
        lShapeSideA: convertedSideA,
        lShapeSideB: convertStr(v.lShapeSideB),
        cutCornerX: convertStr(v.cutCornerX),
        cutCornerY: convertStr(v.cutCornerY),
        backsplash: {
          ...v.backsplash,
          height: convertStr(v.backsplash.height)
        },
        lutak: {
          ...v.lutak,
          height: convertStr(v.lutak.height)
        },
        sinks: recalculatedSinksList
      };
    }));

    setLastConfiguredUnit(toUnit);
  }, [selectedUnit, lastConfiguredUnit, convertUnitValue]);
  
  useEffect(() => {
    if (initialState?.vanities) {
        setVanities(initialState.vanities);
        if (initialState.vanities.length > 0) {
            setActiveVanityId(initialState.vanities[0].id);
        }
        if (initialState.selectedUnit) {
            setSelectedUnit(initialState.selectedUnit);
            setLastConfiguredUnit(initialState.selectedUnit);
        }
    } else {
        const newVanity = createNewVanity('Vanity 1');
        setVanities([newVanity]);
        setActiveVanityId(newVanity.id);
    }
  }, [initialState]);

  const updateVanity = (id: number, newProps: Partial<VanityState> | ((prevState: VanityState) => Partial<VanityState>)) => {
    setVanities(prev => 
      prev.map(v => {
        if (v.id === id) {
          const updates = typeof newProps === 'function' ? newProps(v) : newProps;
          const merged = { ...v, ...updates };
          
          const sinksNeedRecalc = (
            updates.sinks !== undefined || 
            updates.width !== undefined || 
            updates.length !== undefined || 
            updates.layout !== undefined ||
            updates.lShapeSideA !== undefined
          );
          
          if (sinksNeedRecalc) {
            merged.sinks = recalculateSinks(
              merged.sinks, 
              merged.layout, 
              merged.length, 
              merged.width, 
              merged.lShapeSideA, 
              selectedUnit
            );
          }
          
          return merged;
        }
        return v;
      })
    );
  };

  const addSink = (vanityId: number) => {
    const defaultW = parseFloat(convertUnitValue(18, 'inches', lastConfiguredUnit).toFixed(1));
    const defaultL = parseFloat(convertUnitValue(12, 'inches', lastConfiguredUnit).toFixed(1));
    const defaultX = parseFloat(convertUnitValue(15, 'inches', lastConfiguredUnit).toFixed(1));
    const defaultY = parseFloat(convertUnitValue(5, 'inches', lastConfiguredUnit).toFixed(1));

    updateVanity(vanityId, (prev) => ({
      sinks: [...prev.sinks, {
        id: Date.now(),
        type: 'undermount',
        shape: 'rectangle',
        width: String(defaultW),
        length: String(defaultL),
        x: String(defaultX),
        y: String(defaultY),
        alignment: 'centered',
      }]
    }));
  };

  const updateSink = (vanityId: number, sinkId: number, newProps: Partial<SinkCutout>) => {
    updateVanity(vanityId, (prev) => ({
      sinks: prev.sinks.map(s => s.id === sinkId ? { ...s, ...newProps } : s)
    }));
  };

  const removeSink = (vanityId: number, sinkId: number) => {
    updateVanity(vanityId, (prev) => ({
      sinks: prev.sinks.filter(s => s.id !== sinkId)
    }));
  };
  
  const handleBacksplashChange = (vanityId: number, side: 'back' | 'left' | 'right', value: boolean) => {
    updateVanity(vanityId, (prevVanity) => {
        const newBacksplash = { ...prevVanity.backsplash, [side]: value };
        return { backsplash: newBacksplash };
    });
  };

 const handleLutakChange = (vanityId: number, side: 'front' | 'left' | 'right', value: boolean) => {
    updateVanity(vanityId, (prevVanity) => {
        const newLutak = { ...prevVanity.lutak, [side]: value };
        let newSelectedEdges = { ...prevVanity.selectedEdges };
        
        if (side === 'front') {
            if (prevVanity.layout === 'straight') newSelectedEdges['straight_front'] = value;
            if (prevVanity.layout === 'l-shape') {
                newSelectedEdges['l_shape_front_a'] = value;
                newSelectedEdges['l_shape_front_b'] = value;
            }
            if (prevVanity.layout === 'cut-corner') {
                newSelectedEdges['cut_corner_front'] = value;
                newSelectedEdges['cut_corner_cut'] = value;
            }
        } else if (side === 'left') {
            if (prevVanity.layout === 'straight') newSelectedEdges['straight_left'] = value;
            if (prevVanity.layout === 'l-shape') newSelectedEdges['l_shape_end_b'] = value;
            if (prevVanity.layout === 'cut-corner') newSelectedEdges['cut_corner_left'] = value;
        } else if (side === 'right') {
            if (prevVanity.layout === 'straight') newSelectedEdges['straight_right'] = value;
            if (prevVanity.layout === 'l-shape') newSelectedEdges['l_shape_end_a'] = value;
            if (prevVanity.layout === 'cut-corner') newSelectedEdges['cut_corner_top_right'] = value;
        }

        return { lutak: newLutak, selectedEdges: newSelectedEdges };
    });
  };


  const calculations = useMemo(() => {
    let grandTotal = 0;
    const vanityCalculations = vanities.map(activeVanity => {
        if (!activeVanity) return null;

        const { layout, length, width, lShapeSideA, lShapeSideB, cutCornerX, cutCornerY, backsplash, lutak, sinks, profileType, jointType, selectedEdges } = activeVanity;
        
        const mainLength = getInches(length, lastConfiguredUnit);
        const mainWidth = getInches(width, lastConfiguredUnit);
        const sideA = getInches(lShapeSideA, lastConfiguredUnit);
        const sideB = getInches(lShapeSideB, lastConfiguredUnit);
        const cornerX = getInches(cutCornerX, lastConfiguredUnit);
        const cornerY = getInches(cutCornerY, lastConfiguredUnit);
        const backsplashHeight = getInches(backsplash.height, lastConfiguredUnit);
        const lutakHeight = getInches(lutak.height, lastConfiguredUnit);

        let mainAreaIn = 0;
        let backsplashAreaIn = 0;
        let lutakAreaIn = 0;
        let cuttingRft = 0;

        switch (layout) {
            case 'straight':
                mainAreaIn = mainLength * mainWidth;
                cuttingRft += (2 * mainLength + 2 * mainWidth);
                break;
            case 'l-shape':
                mainAreaIn = (sideA * mainWidth) + (sideB * mainWidth) - (mainWidth * mainWidth);
                cuttingRft += (sideA + sideB + (sideA - mainWidth) + (sideB - mainWidth));
                break;
            case 'cut-corner':
                mainAreaIn = (mainLength * mainWidth) - (0.5 * cornerX * cornerY);
                const cutEdgeLength = Math.sqrt(cornerX**2 + cornerY**2);
                cuttingRft += (mainLength + mainWidth + (mainLength-cornerX) + (mainWidth-cornerY) + cutEdgeLength);
                break;
        }

        if (backsplash.back) {
          const pieceLength = layout === 'l-shape' ? sideA : layout === 'cut-corner' ? mainLength - cornerX : mainLength;
          backsplashAreaIn += pieceLength * backsplashHeight;
          cuttingRft += (2 * pieceLength + 2 * backsplashHeight);
        }
        if (backsplash.left) {
           const pieceLength = layout === 'l-shape' ? sideB : mainWidth;
           backsplashAreaIn += pieceLength * backsplashHeight;
           cuttingRft += (2 * pieceLength + 2 * backsplashHeight);
        }
        if (backsplash.right) {
           const pieceLength = mainWidth;
           backsplashAreaIn += pieceLength * backsplashHeight;
           cuttingRft += (2 * pieceLength + 2 * backsplashHeight);
        }

        let lutakLengthIn = 0;
        if (lutak.front) {
          switch (layout) {
            case 'straight': lutakAreaIn += mainLength * lutakHeight; cuttingRft += (2*mainLength + 2*lutakHeight); lutakLengthIn += mainLength; break;
            case 'l-shape': 
                lutakAreaIn += (sideA - mainWidth) * lutakHeight; cuttingRft += (2*(sideA-mainWidth) + 2*lutakHeight);
                lutakAreaIn += (sideB - mainWidth) * lutakHeight; cuttingRft += (2*(sideB-mainWidth) + 2*lutakHeight);
                lutakLengthIn += (sideA-mainWidth) + (sideB-mainWidth);
                break;
            case 'cut-corner': 
                const cutEdge = Math.sqrt(cornerX ** 2 + cornerY ** 2);
                lutakAreaIn += (mainLength - cornerX) * lutakHeight; cuttingRft += (2*(mainLength-cornerX) + 2*lutakHeight);
                lutakAreaIn += cutEdge * lutakHeight; cuttingRft += (2*cutEdge + 2*lutakHeight);
                lutakLengthIn += (mainLength - cornerX) + cutEdge;
                break;
          }
        }
        if (lutak.left) {
            const pieceLength = layout === 'l-shape' ? sideB : mainWidth;
            lutakAreaIn += pieceLength * lutakHeight;
            cuttingRft += (2*pieceLength + 2*lutakHeight);
            lutakLengthIn += pieceLength;
        }
        if (lutak.right) {
            const pieceLength = layout === 'cut-corner' ? mainWidth - cornerY : mainWidth;
            lutakAreaIn += pieceLength * lutakHeight;
            cuttingRft += (2*pieceLength + 2*lutakHeight);
            lutakLengthIn += pieceLength;
        }

        const sinkAreaIn = sinks.reduce((acc, sink) => {
            const w = getInches(sink.width, lastConfiguredUnit);
            const l = getInches(sink.length, lastConfiguredUnit);
            if (sink.type === 'drop-in') return acc + (w * l);
            return acc;
        }, 0);

        const totalSqFt = (mainAreaIn + backsplashAreaIn + lutakAreaIn - sinkAreaIn) / 144;
        
        let edgeLengthIn = 0;
        const profile = edgeProfiles[profileType];
        if (profile && profile.price > 0) {
            Object.keys(selectedEdges).forEach(edgeId => {
                if (selectedEdges[edgeId]) {
                    switch (edgeId) {
                        case 'straight_front': edgeLengthIn += mainLength; break;
                        case 'straight_left': edgeLengthIn += mainWidth; break;
                        case 'straight_right': edgeLengthIn += mainWidth; break;
                        case 'l_shape_front_a': edgeLengthIn += sideA - mainWidth; break;
                        case 'l_shape_front_b': edgeLengthIn += sideB - mainWidth; break;
                        case 'l_shape_end_a': edgeLengthIn += mainWidth; break;
                        case 'l_shape_end_b': edgeLengthIn += mainWidth; break;
                        case 'cut_corner_front': edgeLengthIn += mainLength - cornerX; break;
                        case 'cut_corner_left': edgeLengthIn += mainWidth; break;
                        case 'cut_corner_top_right': edgeLengthIn += mainWidth - cornerY; break;
                        case 'cut_corner_cut': edgeLengthIn += Math.sqrt(cornerX**2 + cornerY**2); break;
                    }
                }
            });
        }

        const wastage = totalSqFt * (costs.wastagePercentage / 100);
        const finalSqFt = totalSqFt + wastage;
        const materialCost = finalSqFt * (selectedVariant.price ?? 0); 
        const edgeCost = (edgeLengthIn / 12) * profile.price;
        const sinkCost = sinks.length * costs.sinkCutCost;
        const jointProfile = edgeProfiles[jointType];
        const lutakCost = (lutakLengthIn / 12) * (jointProfile?.price || 0);
        const cuttingCost = (cuttingRft / 12) * 30; // Assuming 30 per RFT for cutting
        
        const totalCost = materialCost + edgeCost + sinkCost + lutakCost + cuttingCost;
        grandTotal += totalCost;

        return {
          ...activeVanity,
          calculations: {
            totalArea: totalSqFt,
            edgeRft: edgeLengthIn / 12,
            lutakRft: lutakLengthIn / 12,
            cuttingRft: cuttingRft / 12,
            wastage,
            finalSqFt,
            materialCost,
            edgeCost,
            sinkCost,
            lutakCost,
            cuttingCost,
            totalCost,
          }
        };
    });

    return { vanityCalculations: vanityCalculations.filter(v => v !== null), grandTotal };
  }, [vanities, (selectedVariant.price ?? 0), costs.wastagePercentage, costs.sinkCutCost, lastConfiguredUnit, getInches]);
  
  const handleSave = () => {
    const vanitiesWithCalculations = calculations.vanityCalculations.map(vc => ({ ...vc }));
    onSave({ 
      total: calculations.grandTotal, 
      details: { 
        vanities: vanitiesWithCalculations, 
        ...calculations, 
        rate: (selectedVariant.price ?? 0),
        selectedUnit: lastConfiguredUnit
      }, 
      variant: selectedVariant 
    });
};


  const handleAddVanity = () => {
    const newVanity = createNewVanity(newVanityName);
    setVanities([...vanities, newVanity]);
    setActiveVanityId(newVanity.id);
    setNewVanityName('');
    setIsAddVanityDialogOpen(false);
  };

  const removeVanity = (id: number) => {
    setVanities(vanities.filter(v => v.id !== id));
    if (activeVanityId === id) {
        setActiveVanityId(vanities.length > 1 ? vanities.find(v => v.id !== id)!.id : null);
    }
  };
  
  const activeVanity = useMemo(() => vanities.find(v => v.id === activeVanityId), [vanities, activeVanityId]);
  const activeVanityCalculations = useMemo(() => calculations.vanityCalculations.find(vc => vc && vc.id === activeVanityId), [calculations, activeVanityId]);

  return (
    <>
        <Card className="flex-1 flex flex-col h-full">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                <CardTitle>Vanity Designer</CardTitle>
                <CardDescription>Design and get an instant estimate for your vanity tops.</CardDescription>
                </div>
                 <Button variant="outline" onClick={() => setIsAddVanityDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Vanity</Button>
            </CardHeader>
            <CardContent className="flex-1 relative bg-muted/30 rounded-b-lg flex flex-col items-center justify-center p-4 min-h-[500px]">
                {vanities.length > 0 && (
                     <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"><Settings className="mr-2"/>Vanity Details</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Active Vanity</h4>
                                    <p className="text-sm text-muted-foreground">Select and name the vanity you are editing.</p>
                                </div>
                                <div className="grid gap-2">
                                     <Select value={activeVanityId !== null ? String(activeVanityId) : ""} onValueChange={(v) => setActiveVanityId(Number(v))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {vanities.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {activeVanity && (
                                        <div className="relative">
                                            <Input value={activeVanity.name} onChange={e => updateVanity(activeVanity.id, { name: e.target.value })} placeholder="Vanity Name" inputMode='text'/>
                                            {vanities.length > 1 && <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-destructive" onClick={() => removeVanity(activeVanity.id)}><Trash2/></Button>}
                                        </div>
                                    )}
                                </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {activeVanity && (
                            <>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" size="sm"><Move className="mr-2"/>Dimensions</Button></PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="grid gap-4">
                                            <div className="space-y-2"><h4 className="font-medium leading-none">Layout & Dimensions</h4><p className="text-sm text-muted-foreground">Adjust layout and sizes.</p></div>
                                             <div className="grid grid-cols-3 gap-2">
                                                {layoutOptions.map((option) => (
                                                    <Button key={option.id} variant={activeVanity.layout === option.id ? 'secondary' : 'outline'} className="flex h-16 flex-col items-center justify-center gap-1" onClick={() => updateVanity(activeVanity.id, { layout: option.id })}>
                                                        <option.icon className="h-5 w-5" /><span className="text-xs text-center">{option.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                            {activeVanity.layout === 'straight' && (<div className="grid grid-cols-2 gap-2"><div><Label>Width</Label><Input value={isNaN(parseFloat(activeVanity.width)) ? '' : activeVanity.width} onChange={e => updateVanity(activeVanity.id, { width: e.target.value })} inputMode="decimal"/></div><div><Label>Length</Label><Input value={isNaN(parseFloat(activeVanity.length)) ? '' : activeVanity.length} onChange={e => updateVanity(activeVanity.id, { length: e.target.value })} inputMode="decimal"/></div></div>)}
                                            {activeVanity.layout === 'l-shape' && (<div className="grid grid-cols-3 gap-2"><div><Label>Side A</Label><Input value={isNaN(parseFloat(activeVanity.lShapeSideA)) ? '' : activeVanity.lShapeSideA} onChange={e => updateVanity(activeVanity.id, { lShapeSideA: e.target.value })} inputMode="decimal"/></div><div><Label>Side B</Label><Input value={isNaN(parseFloat(activeVanity.lShapeSideB)) ? '' : activeVanity.lShapeSideB} onChange={e => updateVanity(activeVanity.id, { lShapeSideB: e.target.value })} inputMode="decimal"/></div><div><Label>Width</Label><Input value={isNaN(parseFloat(activeVanity.width)) ? '' : activeVanity.width} onChange={e => updateVanity(activeVanity.id, { width: e.target.value })} inputMode="decimal"/></div></div>)}
                                            {activeVanity.layout === 'cut-corner' && (<div className="grid grid-cols-2 gap-2"><div><Label>Width</Label><Input value={isNaN(parseFloat(activeVanity.width)) ? '' : activeVanity.width} onChange={e => updateVanity(activeVanity.id, { width: e.target.value })} inputMode="decimal"/></div><div><Label>Length</Label><Input value={isNaN(parseFloat(activeVanity.length)) ? '' : activeVanity.length} onChange={e => updateVanity(activeVanity.id, { length: e.target.value })} inputMode="decimal"/></div><div><Label>Cut X</Label><Input value={isNaN(parseFloat(activeVanity.cutCornerX)) ? '' : activeVanity.cutCornerX} onChange={e => updateVanity(activeVanity.id, { cutCornerX: e.target.value })} inputMode="decimal"/></div><div><Label>Cut Y</Label><Input value={isNaN(parseFloat(activeVanity.cutCornerY)) ? '' : activeVanity.cutCornerY} onChange={e => updateVanity(activeVanity.id, { cutCornerY: e.target.value })} inputMode="decimal"/></div></div>)}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                 <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" size="sm"><Scissors className="mr-2"/>{language === 'ur' ? 'کٹ آؤٹ' : 'Cutouts'}</Button></PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="space-y-2 mb-4">
                                            <h4 className="font-medium">{language === 'ur' ? 'سنک کٹ آؤٹ' : 'Sink Cutouts'}</h4>
                                            <p className="text-sm text-muted-foreground">{language === 'ur' ? 'سنک کٹ آؤٹ شامل یا ختم کریں۔' : 'Add or remove sink cutouts.'}</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => addSink(activeVanity.id)} className="w-full">
                                            <Bath className="mr-2 h-4 w-4"/>{language === 'ur' ? 'سنک شامل کریں' : 'Add Sink'}
                                        </Button>
                                        {activeVanity.sinks.length > 0 && (
                                            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-2">
                                                {activeVanity.sinks.map(s => (
                                                    <div key={s.id} className="p-3 border rounded-md text-xs space-y-3 bg-muted/20">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-[11px] text-muted-foreground">{language === 'ur' ? 'قسم' : 'Type'}</Label>
                                                                <Select value={s.type} onValueChange={(v) => updateSink(activeVanity.id, s.id, {type: v as any})}>
                                                                    <SelectTrigger className="h-8 mt-1"><SelectValue/></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="undermount">{language === 'ur' ? 'انڈرماؤنٹ' : 'Undermount'}</SelectItem>
                                                                        <SelectItem value="drop-in">{language === 'ur' ? 'ڈراپ ان' : 'Drop-in'}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px] text-muted-foreground">{language === 'ur' ? 'شکل' : 'Shape'}</Label>
                                                                <Select value={s.shape} onValueChange={(v) => updateSink(activeVanity.id, s.id, {shape: v as any})}>
                                                                    <SelectTrigger className="h-8 mt-1"><SelectValue/></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="rectangle">{language === 'ur' ? 'مستطیل' : 'Rectangle'}</SelectItem>
                                                                        <SelectItem value="circle">{language === 'ur' ? 'گول' : 'Circle'}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px] text-muted-foreground">{language === 'ur' ? 'چوڑائی' : 'Width'}</Label>
                                                                <Input className="h-8 mt-1" value={s.width} onChange={e=>updateSink(activeVanity.id, s.id, {width: e.target.value})} inputMode="decimal"/>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px] text-muted-foreground">{language === 'ur' ? 'لمبائی' : 'Length'}</Label>
                                                                <Input className="h-8 mt-1" value={s.length} onChange={e=>updateSink(activeVanity.id, s.id, {length: e.target.value})} inputMode="decimal"/>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Label className="text-[11px] text-muted-foreground">{language === 'ur' ? 'سوراخ کی پوزیشن' : 'Cutout Position'}</Label>
                                                                <Select value={s.alignment || 'centered'} onValueChange={(v) => updateSink(activeVanity.id, s.id, {alignment: v as any})}>
                                                                    <SelectTrigger className="h-8 mt-1"><SelectValue/></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="centered">{language === 'ur' ? 'درمیان میں' : 'Centered'}</SelectItem>
                                                                        <SelectItem value="up">{language === 'ur' ? 'اوپر کی طرف' : 'Moved Up'}</SelectItem>
                                                                        <SelectItem value="down">{language === 'ur' ? 'نیچے کی طرف' : 'Moved Down'}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end pt-1 border-t border-muted">
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-destructive/10 text-[10px] font-bold" onClick={()=>removeSink(activeVanity.id, s.id)}>
                                                                <Trash2 className="mr-1 h-3.5 w-3.5"/> {language === 'ur' ? 'سنک ختم کریں' : 'Remove Sink'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                                
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" size="sm"><Wand2 className="mr-2"/>Edges & More</Button></PopoverTrigger>
                                    <PopoverContent>
                                        <div className="space-y-2 mb-4"><h4 className="font-medium">Edges, Backsplash, Lutak</h4><p className="text-sm text-muted-foreground">Configure finishes.</p></div>
                                        <div className="space-y-4">
                                            <div><Label>Edge Profile</Label><Select value={activeVanity.profileType} onValueChange={(v) => updateVanity(activeVanity.id, { profileType: v as ProfileType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(edgeProfiles).filter(([k])=>!k.includes('litac')).map(([key, p]) => <SelectItem key={key} value={key}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                            <div><Label>Backsplash Joint</Label><Select value={activeVanity.jointType} onValueChange={(v) => updateVanity(activeVanity.id, { jointType: v as ProfileType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(edgeProfiles).filter(([k])=>k==='none'||k.includes('litac')).map(([key, p]) => <SelectItem key={key} value={key}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                            <div><Label className="font-semibold">Backsplash</Label><div className="flex gap-4 items-center"><Checkbox id={`bs-b-${activeVanity.id}`} checked={activeVanity.backsplash.back} onCheckedChange={c=>handleBacksplashChange(activeVanity.id, 'back', !!c)}/><Label htmlFor={`bs-b-${activeVanity.id}`}>Back</Label><Checkbox id={`bs-l-${activeVanity.id}`} checked={activeVanity.backsplash.left} onCheckedChange={c=>handleBacksplashChange(activeVanity.id, 'left', !!c)}/><Label htmlFor={`bs-l-${activeVanity.id}`}>Left</Label><Checkbox id={`bs-r-${activeVanity.id}`} checked={activeVanity.backsplash.right} onCheckedChange={c=>handleBacksplashChange(activeVanity.id, 'right', !!c)}/><Label htmlFor={`bs-r-${activeVanity.id}`}>Right</Label></div><Input placeholder="Height (in)" className="mt-2 h-8" value={activeVanity.backsplash.height} onChange={e=>updateVanity(activeVanity.id, {backsplash: {...activeVanity.backsplash, height: e.target.value}})} inputMode="decimal"/></div>
                                            <div><Label className="font-semibold">Lutak (Apron)</Label><div className="flex gap-4 items-center"><Checkbox id={`lt-f-${activeVanity.id}`} checked={activeVanity.lutak.front} onCheckedChange={c=>handleLutakChange(activeVanity.id, 'front', !!c)}/><Label htmlFor={`lt-f-${activeVanity.id}`}>Front</Label><Checkbox id={`lt-l-${activeVanity.id}`} checked={activeVanity.lutak.left} onCheckedChange={c=>handleLutakChange(activeVanity.id, 'left', !!c)}/><Label htmlFor={`lt-l-${activeVanity.id}`}>Left</Label><Checkbox id={`lt-r-${activeVanity.id}`} checked={activeVanity.lutak.right} onCheckedChange={c=>handleLutakChange(activeVanity.id, 'right', !!c)}/><Label htmlFor={`lt-r-${activeVanity.id}`}>Right</Label></div><Input placeholder="Height (in)" className="mt-2 h-8" value={activeVanity.lutak.height} onChange={e=>updateVanity(activeVanity.id, {lutak: {...activeVanity.lutak, height: e.target.value}})} inputMode="decimal"/></div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </>
                        )}
                        <div className="flex items-center gap-2">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoomLevel(z => z + 0.1)}><ZoomIn /></Button>
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.1))}><ZoomOut /></Button>
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoomLevel(1)}><RotateCw /></Button>
                        </div>
                    </div>
                )}
               
                {activeVanity ? (
                <VanityLayout 
                    layout={activeVanity.layout}
                    dimensions={activeVanity}
                    profileType={activeVanity.profileType}
                    selectedEdges={activeVanity.selectedEdges}
                    onEdgeToggle={(edgeId) => {
                    updateVanity(activeVanity.id, (prevState) => ({
                        selectedEdges: {...prevState.selectedEdges, [edgeId]: !prevState.selectedEdges[edgeId]}
                    }));
                    }}
                    marbleImageUrl={marble.imageUrl}
                    sinks={activeVanity.sinks}
                    backsplash={activeVanity.backsplash}
                    lutak={activeVanity.lutak}
                    zoom={zoomLevel}
                    unit={selectedUnit}
                />
                ) : (
                <div className="text-center text-muted-foreground">
                    <p>No vanities added yet.</p>
                    <Button variant="link" onClick={() => setIsAddVanityDialogOpen(true)}>Add your first vanity</Button>
                </div>
                )}
            </CardContent>
        </Card>
        
        <div className="mt-6 border-t pt-4">
             {activeVanityCalculations && activeVanityCalculations.calculations && (
                  <div className="p-4 border rounded-lg bg-muted/30 mb-4">
                      <h4 className="font-bold text-center mb-2">Cost Breakdown for {activeVanityCalculations.name}</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-4">
                                <Image src={marble.imageUrl} alt={marble.name} width={64} height={64} className="rounded-md object-cover" />
                                <div className='w-full'>
                                    <p className="font-semibold text-base">{marble.name}</p>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Final Area (incl. {costs.wastagePercentage}% wastage): {activeVanityCalculations.calculations.finalSqFt.toFixed(2)} sq.ft @ PKR {(selectedVariant.price ?? 0).toLocaleString()}/sq.ft</span>
                                        <span className="font-semibold">PKR {activeVanityCalculations.calculations.materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <Separator className="my-2" />
                            
                          {activeVanityCalculations.calculations.edgeCost > 0 && (
                              <div className="flex justify-between text-xs">
                                  <span>{edgeProfiles[activeVanityCalculations.profileType]?.name} ({activeVanityCalculations.calculations.edgeRft.toFixed(2)} rft @ PKR {edgeProfiles[activeVanityCalculations.profileType]?.price}/rft):</span>
                                  <span className="font-medium">PKR {activeVanityCalculations.calculations.edgeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          )}

                           {activeVanityCalculations.calculations.lutakCost > 0 && (
                              <div className="flex justify-between text-xs">
                                  <span>Lutak/Apron Jointing ({activeVanityCalculations.calculations.lutakRft.toFixed(2)} rft @ PKR {edgeProfiles[activeVanityCalculations.jointType]?.price}/rft):</span>
                                  <span className="font-medium">PKR {activeVanityCalculations.calculations.lutakCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          )}

                          {activeVanityCalculations.calculations.sinkCost > 0 && (
                              <div className="flex justify-between text-xs">
                                  <span>Sink Cutouts ({activeVanityCalculations.sinks.length}x @ PKR {costs.sinkCutCost}):</span>
                                  <span className="font-medium">PKR {activeVanityCalculations.calculations.sinkCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          )}
                          
                          {activeVanityCalculations.calculations.cuttingCost > 0 && (
                              <div className="flex justify-between text-xs">
                                  <span>Piece Cutting ({activeVanityCalculations.calculations.cuttingRft.toFixed(2)} rft @ PKR 30/rft):</span>
                                  <span className="font-medium">PKR {activeVanityCalculations.calculations.cuttingCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          )}

                           <Separator className="my-2"/>
                           <div className="flex justify-between text-lg font-bold">
                              <span>Total for this Vanity:</span>
                              <span className='text-primary'>PKR {activeVanityCalculations.calculations.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                      </div>
                  </div>
             )}
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={vanities.length === 0}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Requirement
                </Button>
            </div>
        </div>
    
        <Dialog open={isAddVanityDialogOpen} onOpenChange={setIsAddVanityDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Name Your New Vanity</DialogTitle>
                    <DialogDescription>
                        Give this vanity a unique name to easily identify it (e.g., Master Bed, Powder Room, GF Bed 1).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="vanity-name">Vanity Name</Label>
                    <Input 
                        id="vanity-name" 
                        value={newVanityName}
                        onChange={(e) => setNewVanityName(e.target.value)}
                        placeholder="e.g., Master Bedroom"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddVanity}>Add Vanity</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
