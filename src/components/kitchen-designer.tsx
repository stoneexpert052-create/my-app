
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Trash2, PlusCircle, ZoomIn, ZoomOut, Save, Settings, Scissors, LayoutGrid, Box, RotateCw, MapPin, AlignCenter, ArrowLeftRight } from 'lucide-react';
import { KitchenLayout } from './kitchen-layout';
import { edgeProfiles, type ProfileType } from './order-form';
import { useCalculation } from '@/context/calculation-context';
import { Slider } from './ui/slider';
import { KitchenDesignerState } from '@/context/calculation-context';
import { cn } from '@/lib/utils';

export type LayoutType = 'straight' | 'l-shape-right' | 'l-shape-left' | 'u-shape';

export type Cutout = {
  id: string;
  type: 'sink' | 'stove';
  x: number;
  y: number;
  width: number;
  depth: number;
}

export type Piece = {
  length: string;
  width: string;
  cutouts: Cutout[];
};

export type Island = { id: number; length: string; width: string; cutouts: Cutout[] };

interface KitchenDesignerProps {
  marble: Marble;
  variant: MarbleVariant;
  onSave: (data: { total: number; details: any; variant: MarbleVariant; }) => void;
  initialState: Partial<KitchenDesignerState>;
  onCancel: () => void;
}

export function KitchenDesigner({ marble, variant, onSave, initialState, onCancel }: KitchenDesignerProps) {
  const { costs } = useCalculation();
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [layout, setLayout] = useState<LayoutType>(initialState?.layout || 'straight');
  const [profileType, setProfileType] = useState<ProfileType>(initialState?.profileType || 'tukker');
  const [selectedEdges, setSelectedEdges] = useState<Record<string, boolean>>(initialState?.selectedEdges || {
    'top_front': true,
    'top_left': false,
    'top_right': false,
    'left_front': true,
    'left_end': true,
    'left_left': false,
    'right_front': true,
    'right_end': true,
    'right_right': false,
  });
  
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

    const convert = (valStr: string) => {
      const val = parseFloat(valStr) || 0;
      return convertUnitValue(val, fromUnit, toUnit).toFixed(1);
    };

    setTopPiece(prev => ({
      ...prev,
      length: convert(prev.length),
      width: convert(prev.width),
      cutouts: prev.cutouts.map(c => ({
        ...c,
        width: parseFloat(convertUnitValue(c.width, fromUnit, toUnit).toFixed(1)),
        depth: parseFloat(convertUnitValue(c.depth, fromUnit, toUnit).toFixed(1)),
        x: parseFloat(convertUnitValue(c.x, fromUnit, toUnit).toFixed(1)),
        y: parseFloat(convertUnitValue(c.y, fromUnit, toUnit).toFixed(1))
      }))
    }));

    setLeftPiece(prev => ({
      ...prev,
      length: convert(prev.length),
      width: convert(prev.width),
      cutouts: prev.cutouts.map(c => ({
        ...c,
        width: parseFloat(convertUnitValue(c.width, fromUnit, toUnit).toFixed(1)),
        depth: parseFloat(convertUnitValue(c.depth, fromUnit, toUnit).toFixed(1)),
        x: parseFloat(convertUnitValue(c.x, fromUnit, toUnit).toFixed(1)),
        y: parseFloat(convertUnitValue(c.y, fromUnit, toUnit).toFixed(1))
      }))
    }));

    setRightPiece(prev => ({
      ...prev,
      length: convert(prev.length),
      width: convert(prev.width),
      cutouts: prev.cutouts.map(c => ({
        ...c,
        width: parseFloat(convertUnitValue(c.width, fromUnit, toUnit).toFixed(1)),
        depth: parseFloat(convertUnitValue(c.depth, fromUnit, toUnit).toFixed(1)),
        x: parseFloat(convertUnitValue(c.x, fromUnit, toUnit).toFixed(1)),
        y: parseFloat(convertUnitValue(c.y, fromUnit, toUnit).toFixed(1))
      }))
    }));

    setIslands(prev => prev.map(i => ({
      ...i,
      length: convert(i.length),
      width: convert(i.width),
      cutouts: i.cutouts.map(c => ({
        ...c,
        width: parseFloat(convertUnitValue(c.width, fromUnit, toUnit).toFixed(1)),
        depth: parseFloat(convertUnitValue(c.depth, fromUnit, toUnit).toFixed(1)),
        x: parseFloat(convertUnitValue(c.x, fromUnit, toUnit).toFixed(1)),
        y: parseFloat(convertUnitValue(c.y, fromUnit, toUnit).toFixed(1))
      }))
    })));

    setLastConfiguredUnit(toUnit);
  }, [selectedUnit, lastConfiguredUnit, convertUnitValue]);

  const [topPiece, setTopPiece] = useState<Piece>(initialState?.topPiece || { length: '120', width: '24', cutouts: [] });
  const [leftPiece, setLeftPiece] = useState<Piece>(initialState?.leftPiece || { length: '96', width: '24', cutouts: [] });
  const [rightPiece, setRightPiece] = useState<Piece>(initialState?.rightPiece || { length: '96', width: '24', cutouts: [] });
  const [islands, setIslands] = useState<Island[]>(initialState?.islands || []);

  const [activePieceId, setActivePieceId] = useState<'top' | 'left' | 'right' | number>('top');
  const [activeCutout, setActiveCutout] = useState<Cutout | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const activePiece = useMemo(() => {
    if (activePieceId === 'top') return topPiece;
    if (activePieceId === 'left') return leftPiece;
    if (activePieceId === 'right') return rightPiece;
    return islands.find(i => i.id === activePieceId) || null;
  }, [activePieceId, topPiece, leftPiece, rightPiece, islands]);

  const handlePieceChange = useCallback((id: 'top' | 'left' | 'right' | number, field: string, value: any) => {
    const cleanValue = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : value;
    if (id === 'top') setTopPiece(prev => ({ ...prev, [field]: cleanValue }));
    else if (id === 'left') setLeftPiece(prev => ({ ...prev, [field]: cleanValue }));
    else if (id === 'right') setRightPiece(prev => ({ ...prev, [field]: cleanValue }));
    else setIslands(prev => prev.map(i => i.id === id ? { ...i, [field]: cleanValue } : i));
  }, []);

  const addIsland = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newId = Date.now();
    setIslands(prev => [...prev, { id: newId, length: '72', width: '36', cutouts: [] }]);
    setActivePieceId(newId);
  };

  const removeIsland = (id: number) => {
    setIslands(prev => prev.filter(i => i.id !== id));
    if (activePieceId === id) setActivePieceId('top');
  };

  const addCutout = (e: React.MouseEvent, type: 'sink' | 'stove') => {
    e.preventDefault();
    e.stopPropagation();
    if (!activePiece) return;
    const pLen = parseFloat(activePiece.length) || 120;
    const pWid = parseFloat(activePiece.width) || 24;
    
    const isVertical = activePieceId === 'left' || activePieceId === 'right';
    const tW = parseFloat(topPiece.width) || 24;

    const initialCutoutWidth = parseFloat(convertUnitValue(18, 'inches', lastConfiguredUnit).toFixed(1));
    const initialCutoutDepth = parseFloat(convertUnitValue(16, 'inches', lastConfiguredUnit).toFixed(1));
    
    const initialX = isVertical 
      ? tW + (pLen - tW) / 2 - (initialCutoutWidth / 2) 
      : (pLen / 2) - (initialCutoutWidth / 2);

    const newCutout: Cutout = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        width: initialCutoutWidth,
        depth: initialCutoutDepth,
        x: Math.max(isVertical ? tW : 0, initialX),
        y: (pWid / 2) - (initialCutoutDepth / 2),
    };
    handlePieceChange(activePieceId, 'cutouts', [...activePiece.cutouts, newCutout]);
  };

  const removeCutout = (id: string) => {
    if (!activePiece) return;
    handlePieceChange(activePieceId, 'cutouts', activePiece.cutouts.filter(c => c.id !== id));
  };

  const calculations = useMemo(() => {
    const rate = selectedVariant?.price || 0;
    const getArea = (p: Piece | Island) => getInches(p.length, lastConfiguredUnit) * getInches(p.width, lastConfiguredUnit);
    
    let areaIn = 0;
    const tL = parseFloat(topPiece.length) || 0;
    const tW = parseFloat(topPiece.width) || 0;
    const lL = parseFloat(leftPiece.length) || 0;
    const lW = parseFloat(leftPiece.width) || 0;
    const rL = parseFloat(rightPiece.length) || 0;
    const rW = parseFloat(rightPiece.width) || 0;

    const topInWidth = getInches(topPiece.width, lastConfiguredUnit);
    const leftInWidth = getInches(leftPiece.width, lastConfiguredUnit);
    const rightInWidth = getInches(rightPiece.width, lastConfiguredUnit);

    if (layout === 'straight') areaIn = getArea(topPiece);
    else if (layout === 'l-shape-left') areaIn = getArea(topPiece) + getArea(leftPiece) - (topInWidth * leftInWidth);
    else if (layout === 'l-shape-right') areaIn = getArea(topPiece) + getArea(rightPiece) - (topInWidth * rightInWidth);
    else if (layout === 'u-shape') areaIn = getArea(topPiece) + getArea(leftPiece) + getArea(rightPiece) - (topInWidth * leftInWidth) - (topInWidth * rightInWidth);

    islands.forEach(i => areaIn += getArea(i));
    
    const sqFt = areaIn / 144;
    const finalSqFt = sqFt * (1 + (costs.wastagePercentage || 15)/100);
    const matCost = finalSqFt * rate;

    const allPieces = [topPiece, leftPiece, rightPiece, ...islands];
    const cutouts = allPieces.flatMap(p => p.cutouts);
    const sinkCost = cutouts.filter(c => c.type === 'sink').length * (costs.sinkCutCost || 3000);
    const stoveCost = cutouts.filter(c => c.type === 'stove').length * (costs.stoveCutCost || 3000);
    
    let totalEdgeInches = 0;
    const profile = edgeProfiles[profileType];
    if (profile && profile.price > 0) {
        let totalEdgesInConfiguredUnit = 0;
        Object.entries(selectedEdges).forEach(([edgeId, isSelected]) => {
            if (!isSelected) return;
            if (edgeId.startsWith('island_')) {
                const parts = edgeId.split('_');
                const islId = Number(parts[1]);
                const side = parts[2];
                const isl = islands.find(i => i.id === islId);
                if (isl) {
                    if (side === 'top' || side === 'bottom') totalEdgesInConfiguredUnit += parseFloat(isl.length) || 0;
                    if (side === 'left' || side === 'right') totalEdgesInConfiguredUnit += parseFloat(isl.width) || 0;
                }
            } else {
                if (edgeId === 'top_front') totalEdgesInConfiguredUnit += (layout === 'straight' ? tL : layout === 'l-shape-left' ? tL - lW : layout === 'l-shape-right' ? tL - rW : tL - lW - rW);
                if (edgeId === 'top_left') totalEdgesInConfiguredUnit += tW;
                if (edgeId === 'top_right') totalEdgesInConfiguredUnit += tW;
                if (edgeId === 'left_front') totalEdgesInConfiguredUnit += lL - tW;
                if (edgeId === 'left_end') totalEdgesInConfiguredUnit += lW;
                if (edgeId === 'left_left') totalEdgesInConfiguredUnit += lL;
                if (edgeId === 'right_front') totalEdgesInConfiguredUnit += rL - tW;
                if (edgeId === 'right_end') totalEdgesInConfiguredUnit += rW;
                if (edgeId === 'right_right') totalEdgesInConfiguredUnit += rL;
            }
        });
        totalEdgeInches = getInches(totalEdgesInConfiguredUnit.toString(), lastConfiguredUnit);
    }

    const edgeProfileCost = (totalEdgeInches / 12) * profile.price;

    return { 
        finalSqFt, 
        materialCost: matCost, 
        sinkCost, 
        stoveCost, 
        total: matCost + sinkCost + stoveCost + edgeProfileCost, 
        rate,
        totalSqFt: sqFt,
        wastagePercentage: costs.wastagePercentage || 15,
        edgeProfileCost
    };
  }, [layout, topPiece, leftPiece, rightPiece, islands, selectedVariant.price, profileType, selectedEdges, costs.wastagePercentage, costs.sinkCutCost, costs.stoveCutCost, lastConfiguredUnit, getInches]);

  const handleSave = useCallback(() => {
    onSave({ 
      total: calculations.total, 
      details: { 
        ...calculations, 
        layout, 
        profileType, 
        selectedEdges, 
        topPiece, 
        leftPiece, 
        rightPiece, 
        islands,
        selectedUnit: lastConfiguredUnit
      }, 
      variant: selectedVariant 
    });
  }, [calculations, layout, profileType, selectedEdges, topPiece, leftPiece, rightPiece, islands, selectedVariant, lastConfiguredUnit, onSave]);

  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex-1 relative bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center p-4 min-h-[400px] border shadow-inner overflow-hidden">
           <KitchenLayout
              layout={layout}
              dimensions={{ top: topPiece, left: leftPiece, right: rightPiece, islands }}
              textureUrl={marble.imageUrl}
              selectedEdges={selectedEdges}
              onEdgeToggle={(id) => setSelectedEdges(p => ({...p, [id]: !p[id]}))}
              onCutoutChange={(id, props) => {
                const update = (p: Piece | Island) => ({...p, cutouts: p.cutouts.map(c => c.id === id ? {...c, ...props} : c)});
                if (topPiece.cutouts.some(c => c.id === id)) setTopPiece(update(topPiece) as Piece);
                else if (leftPiece.cutouts.some(c => c.id === id)) setLeftPiece(update(leftPiece) as Piece);
                else if (rightPiece.cutouts.some(c => c.id === id)) setRightPiece(update(rightPiece) as Piece);
                else setIslands(prev => prev.map(i => i.cutouts.some(c => c.id === id) ? update(i) as Island : i));
              }}
              activeCutout={activeCutout}
              setActiveCutout={setActiveCutout}
              zoom={zoomLevel}
              isDimensioningMode={true}
              unit={lastConfiguredUnit}
            />
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4"/>Shape & Polish</span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => z + 0.1)}><ZoomIn className="h-3 w-3"/></Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.1))}><ZoomOut className="h-3 w-3"/></Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)}><RotateCw className="h-3 w-3"/></Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                {/* Unit Selection */}
                <div className="space-y-2 p-3 bg-muted/40 rounded-md border border-dashed">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                      Measurement Unit
                    </Label>
                    {selectedUnit !== lastConfiguredUnit && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold animate-pulse uppercase tracking-wider">
                        Click Fit Measurement
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(['inches', 'feet', 'cm', 'mm'] as const).map((unit) => {
                      const displayLabel = unit === 'inches' ? 'In' : unit === 'feet' ? 'Ft' : unit === 'cm' ? 'CM' : 'MM';
                      return (
                        <Button
                          key={unit}
                          type="button"
                          variant={selectedUnit === unit ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedUnit(unit)}
                          className="h-7 px-2.5 text-[10px] font-bold"
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={fitMeasurement}
                      disabled={selectedUnit === lastConfiguredUnit}
                      className={cn(
                        "h-7 px-2 text-[10px] font-bold transition-all ml-auto",
                        selectedUnit !== lastConfiguredUnit 
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse shadow-sm" 
                          : "text-muted-foreground cursor-not-allowed opacity-50"
                      )}
                    >
                      Fit Measurement
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60 font-bold">Kitchen Layout</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {(['straight', 'l-shape-left', 'l-shape-right', 'u-shape'] as LayoutType[]).map(l => (
                        <Button key={l} size="sm" variant={layout === l ? 'default' : 'outline'} onClick={() => setLayout(l)} className="h-8 text-[10px] uppercase font-bold">{l.replace('-shape-', ' ')}</Button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60 font-bold">Edge Polish Style</Label>
                    <Select value={profileType} onValueChange={(v: ProfileType) => setProfileType(v)}>
                        <SelectTrigger className="h-10 font-bold"><SelectValue placeholder="Select Profile" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(edgeProfiles).map(([k, p]) => (
                            <SelectItem key={k} value={k}>{p.name} (PKR {p.price}/rft)</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="sm" className="w-full h-10 font-bold" onClick={addIsland}>
                    <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                    Add Island (Chowki)
                </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2"><Settings className="h-4 w-4"/>Piece Dimensions</span>
                    <Box className="h-4 w-4 opacity-30" />
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex flex-wrap gap-1">
                    <Button variant={activePieceId === 'top' ? 'secondary' : 'outline'} size="sm" className="h-8 text-[10px] uppercase font-bold flex-1" onClick={() => setActivePieceId('top')}>Center</Button>
                    {(['l-shape-left', 'u-shape']).includes(layout) && <Button variant={activePieceId === 'left' ? 'secondary' : 'outline'} size="sm" className="h-8 text-[10px] uppercase font-bold flex-1" onClick={() => setActivePieceId('left')}>Left Wing</Button>}
                    {(['l-shape-right', 'u-shape']).includes(layout) && <Button variant={activePieceId === 'right' ? 'secondary' : 'outline'} size="sm" className="h-8 text-[10px] uppercase font-bold flex-1" onClick={() => setActivePieceId('right')}>Right Wing</Button>}
                    {islands.map((isl, idx) => (
                        <Button key={isl.id} variant={activePieceId === isl.id ? 'secondary' : 'outline'} size="sm" className="h-8 text-[10px] uppercase font-bold flex-1" onClick={() => setActivePieceId(isl.id)}>Island {idx+1}</Button>
                    ))}
                </div>

                {activePiece && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</Label>
                            <Input value={activePiece.length} onChange={e => handlePieceChange(activePieceId, 'length', e.target.value)} className="h-10 font-bold text-lg" inputMode="decimal" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Width ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</Label>
                            <Input value={activePiece.width} onChange={e => handlePieceChange(activePieceId, 'width', e.target.value)} className="h-10 font-bold text-lg" inputMode="decimal" />
                        </div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase font-bold opacity-60">Cutouts (Sink/Stove)</Label>
                            <div className="flex gap-1">
                                <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold" onClick={(e) => addCutout(e, 'sink')}>+ Sink</Button>
                                <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold" onClick={(e) => addCutout(e, 'stove')}>+ Stove</Button>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {activePiece.cutouts.map(c => {
                              const isVertical = ['left', 'right'].includes(activePieceId as string);
                              const minX = isVertical ? parseFloat(topPiece.width) || 24 : 0;
                              const pLength = parseFloat(activePiece.length) || 120;
                              const maxX = Math.max(minX, pLength - (parseFloat(c.width.toString()) || 0));
                              const unitLabel = lastConfiguredUnit === 'inches' ? 'in' : lastConfiguredUnit === 'feet' ? 'ft' : lastConfiguredUnit;
                              const remainingDist = Math.max(0, pLength - c.x - c.width);

                              return (
                                <div 
                                  key={c.id} 
                                  className={cn(
                                    "p-3 border rounded-lg text-xs space-y-3 transition-all cursor-pointer", 
                                    activeCutout?.id === c.id 
                                      ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm" 
                                      : "bg-muted/30 border-border hover:border-muted-foreground/30"
                                  )}
                                  onClick={() => setActiveCutout(c)}
                                >
                                    <div className="flex justify-between items-center pb-1 border-b border-border/60">
                                        <span className="font-extrabold uppercase text-[11px] flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                          <Scissors className="h-3.5 w-3.5 text-blue-600"/>
                                          {c.type} Cutout
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeCutout(c.id); }}>
                                          <Trash2 className="h-3.5 w-3.5"/>
                                        </Button>
                                    </div>

                                    {/* 3 Input fields: Width, Depth, and Position (Pos / Distance from Corner) */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-[10px] font-semibold text-muted-foreground">Width ({unitLabel})</Label>
                                        <Input 
                                          type="number"
                                          step="0.5"
                                          value={c.width} 
                                          onChange={v => {
                                            const val = parseFloat(v.target.value) || 0;
                                            const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, width: val} : cut);
                                            handlePieceChange(activePieceId, 'cutouts', updated);
                                          }} 
                                          className="h-8 text-xs font-bold" 
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] font-semibold text-muted-foreground">Depth ({unitLabel})</Label>
                                        <Input 
                                          type="number"
                                          step="0.5"
                                          value={c.depth} 
                                          onChange={v => {
                                            const val = parseFloat(v.target.value) || 0;
                                            const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, depth: val} : cut);
                                            handlePieceChange(activePieceId, 'cutouts', updated);
                                          }} 
                                          className="h-8 text-xs font-bold" 
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Pos (Corner) ({unitLabel})</Label>
                                        <Input 
                                          type="number"
                                          step="0.5"
                                          value={c.x} 
                                          onChange={v => {
                                            const val = parseFloat(v.target.value) || 0;
                                            const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, x: val} : cut);
                                            handlePieceChange(activePieceId, 'cutouts', updated);
                                          }} 
                                          className="h-8 text-xs font-extrabold border-blue-500/60 bg-blue-100/50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 focus:ring-blue-500" 
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>

                                    {/* Prominent Live Position Readout Banner */}
                                    <div className="bg-background/80 border rounded-md p-2 flex flex-wrap items-center justify-between gap-1 text-[11px] shadow-2xs">
                                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                                        <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0"/>
                                        <span>Fitted at:</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-black text-xs bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700">
                                          {c.x.toFixed(1)} {unitLabel} from corner
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-medium">
                                        Remaining: <span className="font-bold text-foreground">{remainingDist.toFixed(1)} {unitLabel}</span>
                                      </div>
                                    </div>

                                    {/* Position Slider with Live Value Badge */}
                                    <div className="space-y-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>Start: {minX.toFixed(1)} {unitLabel}</span>
                                        <span className="font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/80 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700 shadow-2xs">
                                          {c.x.toFixed(1)} {unitLabel}
                                        </span>
                                        <span>End: {maxX.toFixed(1)} {unitLabel}</span>
                                      </div>
                                      <Slider 
                                          value={[c.x]}
                                          onValueChange={(val) => {
                                              const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, x: val[0]} : cut);
                                              handlePieceChange(activePieceId, 'cutouts', updated);
                                          }}
                                          min={minX}
                                          max={maxX}
                                          step={0.5}
                                          className="py-1"
                                      />
                                    </div>

                                    {/* Quick Alignment Preset Buttons */}
                                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2 font-bold flex-1 bg-background hover:bg-muted"
                                        onClick={() => {
                                          const centeredX = parseFloat(((pLength - c.width) / 2).toFixed(1));
                                          const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, x: Math.max(minX, centeredX)} : cut);
                                          handlePieceChange(activePieceId, 'cutouts', updated);
                                        }}
                                      >
                                        <AlignCenter className="mr-1 h-3 w-3 text-blue-600" /> Center {c.type === 'sink' ? 'Sink' : 'Stove'}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2 font-bold bg-background hover:bg-muted"
                                        onClick={() => {
                                          const posX = Math.max(minX, 12);
                                          const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, x: posX} : cut);
                                          handlePieceChange(activePieceId, 'cutouts', updated);
                                        }}
                                      >
                                        12" Left
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] px-2 font-bold bg-background hover:bg-muted"
                                        onClick={() => {
                                          const posX = Math.max(minX, parseFloat((pLength - c.width - 12).toFixed(1)));
                                          const updated = activePiece!.cutouts.map(cut => cut.id === c.id ? {...cut, x: posX} : cut);
                                          handlePieceChange(activePieceId, 'cutouts', updated);
                                        }}
                                      >
                                        12" Right
                                      </Button>
                                    </div>
                                </div>
                              );
                            })}
                        </div>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
       </div>
      
      <div className="mt-auto border-t pt-4">
          <div className="p-3 border rounded-lg bg-primary/5 mb-4">
              <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Estimated Kitchen Total:</span>
                  <span>PKR {calculations.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={calculations.total <= 0}>
              <Save className="mr-2 h-4 w-4" /> Save to Quotation
            </Button>
          </div>
      </div>
    </div>
  );
}
