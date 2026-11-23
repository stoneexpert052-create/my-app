'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  Scissors,
  AlignCenter,
  X,
  Droplets,
  Flame,
  Square,
  Layers,
} from 'lucide-react';
import { KitchenLayout } from './kitchen-layout';
import { edgeProfiles, type ProfileType } from './order-form';
import { useCalculation, KitchenDesignerState } from '@/context/calculation-context';
import { useLanguage } from '@/context/language-context';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';

export type LayoutType = 'straight' | 'l-shape-right' | 'l-shape-left' | 'u-shape';

export type Cutout = {
  id: string;
  type: 'sink' | 'stove';
  x: number;
  y: number;
  width: number;
  depth: number;
};

export type Piece = {
  length: string;
  width: string;
  cutouts: Cutout[];
};

export type Island = { id: number; length: string; width: string; cutouts: Cutout[] };

interface KitchenDesignerProps {
  marble: Marble;
  variant: MarbleVariant;
  onSave: (data: { total: number; details: any; variant: MarbleVariant }) => void;
  initialState: Partial<KitchenDesignerState>;
  onCancel: () => void;
}

const LAYOUT_OPTIONS: Array<{ id: LayoutType; en: string; ur: string }> = [
  { id: 'straight', en: 'Straight', ur: 'سیدھا' },
  { id: 'l-shape-left', en: 'L-Left', ur: 'ایل بائیں' },
  { id: 'l-shape-right', en: 'L-Right', ur: 'ایل دائیں' },
  { id: 'u-shape', en: 'U-Shape', ur: 'یو شیپ' },
];

const UNIT_OPTIONS: Array<{ id: 'inches' | 'feet' | 'cm' | 'mm'; label: string }> = [
  { id: 'inches', label: 'In' },
  { id: 'feet', label: 'Ft' },
  { id: 'cm', label: 'CM' },
];

export function KitchenDesigner({
  marble,
  variant,
  onSave,
  initialState,
  onCancel,
}: KitchenDesignerProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  const isUr = language === 'ur';

  const [selectedVariant] = useState(variant);
  const [layout, setLayout] = useState<LayoutType>(initialState?.layout || 'straight');
  const [profileType, setProfileType] = useState<ProfileType>(initialState?.profileType || 'tukker');
  const [selectedEdges, setSelectedEdges] = useState<Record<string, boolean>>(
    initialState?.selectedEdges || {
      top_front: true,
      top_left: false,
      top_right: false,
      left_front: true,
      left_end: true,
      left_left: false,
      right_front: true,
      right_end: true,
      right_right: false,
    }
  );

  const [selectedUnit, setSelectedUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(
    initialState?.selectedUnit || 'inches'
  );

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

  const [topPiece, setTopPiece] = useState<Piece>(
    initialState?.topPiece || { length: '120', width: '24', cutouts: [] }
  );
  const [leftPiece, setLeftPiece] = useState<Piece>(
    initialState?.leftPiece || { length: '96', width: '24', cutouts: [] }
  );
  const [rightPiece, setRightPiece] = useState<Piece>(
    initialState?.rightPiece || { length: '96', width: '24', cutouts: [] }
  );
  const [islands, setIslands] = useState<Island[]>(initialState?.islands || []);

  const [activePieceId, setActivePieceId] = useState<'top' | 'left' | 'right' | number>('top');
  const [activeCutoutId, setActiveCutoutId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleUnitChange = useCallback(
    (toUnit: 'inches' | 'feet' | 'cm' | 'mm') => {
      if (toUnit === selectedUnit) return;
      const fromUnit = selectedUnit;
      const formatVal = (valStr: string) => {
        const val = parseFloat(valStr) || 0;
        const converted = convertUnitValue(val, fromUnit, toUnit);
        return Number(converted.toFixed(1)).toString();
      };
      const convertCutouts = (cutouts: Cutout[]) =>
        cutouts.map((c) => ({
          ...c,
          width: parseFloat(convertUnitValue(c.width, fromUnit, toUnit).toFixed(1)),
          depth: parseFloat(convertUnitValue(c.depth, fromUnit, toUnit).toFixed(1)),
          x: parseFloat(convertUnitValue(c.x, fromUnit, toUnit).toFixed(1)),
          y: parseFloat(convertUnitValue(c.y, fromUnit, toUnit).toFixed(1)),
        }));

      setTopPiece((prev) => ({
        ...prev,
        length: formatVal(prev.length),
        width: formatVal(prev.width),
        cutouts: convertCutouts(prev.cutouts),
      }));
      setLeftPiece((prev) => ({
        ...prev,
        length: formatVal(prev.length),
        width: formatVal(prev.width),
        cutouts: convertCutouts(prev.cutouts),
      }));
      setRightPiece((prev) => ({
        ...prev,
        length: formatVal(prev.length),
        width: formatVal(prev.width),
        cutouts: convertCutouts(prev.cutouts),
      }));
      setIslands((prev) =>
        prev.map((i) => ({
          ...i,
          length: formatVal(i.length),
          width: formatVal(i.width),
          cutouts: convertCutouts(i.cutouts),
        }))
      );
      setSelectedUnit(toUnit);
    },
    [selectedUnit, convertUnitValue]
  );

  const handleLayoutChange = useCallback(
    (nextLayout: LayoutType) => {
      setLayout(nextLayout);
      if (activePieceId === 'left' && !['l-shape-left', 'u-shape'].includes(nextLayout)) {
        setActivePieceId('top');
      }
      if (activePieceId === 'right' && !['l-shape-right', 'u-shape'].includes(nextLayout)) {
        setActivePieceId('top');
      }
    },
    [activePieceId]
  );

  const activePiece = useMemo(() => {
    if (activePieceId === 'top') return topPiece;
    if (activePieceId === 'left') return leftPiece;
    if (activePieceId === 'right') return rightPiece;
    return islands.find((i) => i.id === activePieceId) || topPiece;
  }, [activePieceId, topPiece, leftPiece, rightPiece, islands]);

  const liveActiveCutout = useMemo(() => {
    if (!activeCutoutId) return null;
    const allPieces = [topPiece, leftPiece, rightPiece, ...islands];
    for (const p of allPieces) {
      const found = p.cutouts.find((c) => c.id === activeCutoutId);
      if (found) return found;
    }
    return null;
  }, [activeCutoutId, topPiece, leftPiece, rightPiece, islands]);

  const handleSelectCutoutFromDiagram = useCallback(
    (cutout: Cutout | null) => {
      if (!cutout) {
        setActiveCutoutId(null);
        return;
      }
      setActiveCutoutId(cutout.id);
      if (topPiece.cutouts.some((c) => c.id === cutout.id)) setActivePieceId('top');
      else if (leftPiece.cutouts.some((c) => c.id === cutout.id)) setActivePieceId('left');
      else if (rightPiece.cutouts.some((c) => c.id === cutout.id)) setActivePieceId('right');
      else {
        const isl = islands.find((i) => i.cutouts.some((c) => c.id === cutout.id));
        if (isl) setActivePieceId(isl.id);
      }
    },
    [topPiece.cutouts, leftPiece.cutouts, rightPiece.cutouts, islands]
  );

  const handlePieceChange = useCallback(
    (id: 'top' | 'left' | 'right' | number, field: string, value: any) => {
      const cleanValue = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : value;
      if (id === 'top') setTopPiece((prev) => ({ ...prev, [field]: cleanValue }));
      else if (id === 'left') setLeftPiece((prev) => ({ ...prev, [field]: cleanValue }));
      else if (id === 'right') setRightPiece((prev) => ({ ...prev, [field]: cleanValue }));
      else setIslands((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: cleanValue } : i)));
    },
    []
  );

  const addIsland = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newId = Date.now();
    const defaultLen = Number(convertUnitValue(72, 'inches', selectedUnit).toFixed(1)).toString();
    const defaultWid = Number(convertUnitValue(36, 'inches', selectedUnit).toFixed(1)).toString();
    setIslands((prev) => [...prev, { id: newId, length: defaultLen, width: defaultWid, cutouts: [] }]);
    setActivePieceId(newId);
    setActiveCutoutId(null);
  };

  const removeIsland = (id: number) => {
    setIslands((prev) => prev.filter((i) => i.id !== id));
    if (activePieceId === id) setActivePieceId('top');
    setActiveCutoutId(null);
  };

  const addCutout = (e: React.MouseEvent, type: 'sink' | 'stove') => {
    e.preventDefault();
    e.stopPropagation();
    if (!activePiece) return;
    const pLen = parseFloat(activePiece.length) || 120;
    const pWid = parseFloat(activePiece.width) || 24;

    const isVertical = activePieceId === 'left' || activePieceId === 'right';
    const tW = parseFloat(topPiece.width) || 24;

    const initialCutoutWidth = parseFloat(convertUnitValue(18, 'inches', selectedUnit).toFixed(1));
    const initialCutoutDepth = parseFloat(convertUnitValue(16, 'inches', selectedUnit).toFixed(1));

    const initialX = isVertical
      ? tW + (pLen - tW) / 2 - initialCutoutWidth / 2
      : pLen / 2 - initialCutoutWidth / 2;

    const newCutout: Cutout = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      width: initialCutoutWidth,
      depth: initialCutoutDepth,
      x: Math.max(isVertical ? tW : 0, Number(initialX.toFixed(1))),
      y: Math.max(0, Number(((pWid - initialCutoutDepth) / 2).toFixed(1))),
    };
    handlePieceChange(activePieceId, 'cutouts', [...activePiece.cutouts, newCutout]);
    setActiveCutoutId(newCutout.id);
  };

  const removeCutout = (id: string) => {
    const strip = (p: Piece | Island) => ({ ...p, cutouts: p.cutouts.filter((c) => c.id !== id) });
    if (topPiece.cutouts.some((c) => c.id === id)) setTopPiece(strip(topPiece) as Piece);
    else if (leftPiece.cutouts.some((c) => c.id === id)) setLeftPiece(strip(leftPiece) as Piece);
    else if (rightPiece.cutouts.some((c) => c.id === id)) setRightPiece(strip(rightPiece) as Piece);
    else setIslands((prev) => prev.map((i) => (i.cutouts.some((c) => c.id === id) ? (strip(i) as Island) : i)));
    if (activeCutoutId === id) setActiveCutoutId(null);
  };

  const updateCutout = useCallback(
    (id: string, props: Partial<Cutout>) => {
      const update = (p: Piece | Island) => ({
        ...p,
        cutouts: p.cutouts.map((c) => (c.id === id ? { ...c, ...props } : c)),
      });
      if (topPiece.cutouts.some((c) => c.id === id)) setTopPiece(update(topPiece) as Piece);
      else if (leftPiece.cutouts.some((c) => c.id === id)) setLeftPiece(update(leftPiece) as Piece);
      else if (rightPiece.cutouts.some((c) => c.id === id)) setRightPiece(update(rightPiece) as Piece);
      else
        setIslands((prev) =>
          prev.map((i) => (i.cutouts.some((c) => c.id === id) ? (update(i) as Island) : i))
        );
    },
    [topPiece, leftPiece, rightPiece]
  );

  const calculations = useMemo(() => {
    const rate = selectedVariant?.price || 0;
    const getArea = (p: Piece | Island) =>
      getInches(p.length, selectedUnit) * getInches(p.width, selectedUnit);

    let areaIn = 0;
    const tL = parseFloat(topPiece.length) || 0;
    const tW = parseFloat(topPiece.width) || 0;
    const lL = parseFloat(leftPiece.length) || 0;
    const lW = parseFloat(leftPiece.width) || 0;
    const rL = parseFloat(rightPiece.length) || 0;
    const rW = parseFloat(rightPiece.width) || 0;

    const topInWidth = getInches(topPiece.width, selectedUnit);
    const leftInWidth = getInches(leftPiece.width, selectedUnit);
    const rightInWidth = getInches(rightPiece.width, selectedUnit);

    if (layout === 'straight') areaIn = getArea(topPiece);
    else if (layout === 'l-shape-left')
      areaIn = getArea(topPiece) + getArea(leftPiece) - topInWidth * leftInWidth;
    else if (layout === 'l-shape-right')
      areaIn = getArea(topPiece) + getArea(rightPiece) - topInWidth * rightInWidth;
    else if (layout === 'u-shape')
      areaIn =
        getArea(topPiece) +
        getArea(leftPiece) +
        getArea(rightPiece) -
        topInWidth * leftInWidth -
        topInWidth * rightInWidth;

    islands.forEach((i) => (areaIn += getArea(i)));

    const sqFt = areaIn / 144;
    const finalSqFt = sqFt * (1 + (costs.wastagePercentage || 15) / 100);
    const matCost = finalSqFt * rate;

    const activePieces: Array<Piece | Island> = [topPiece, ...islands];
    if (layout === 'l-shape-left' || layout === 'u-shape') activePieces.push(leftPiece);
    if (layout === 'l-shape-right' || layout === 'u-shape') activePieces.push(rightPiece);

    const cutouts = activePieces.flatMap((p) => p.cutouts);
    const sinkCost = cutouts.filter((c) => c.type === 'sink').length * (costs.sinkCutCost || 3000);
    const stoveCost = cutouts.filter((c) => c.type === 'stove').length * (costs.stoveCutCost || 3000);

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
          const isl = islands.find((i) => i.id === islId);
          if (isl) {
            if (side === 'top' || side === 'bottom') totalEdgesInConfiguredUnit += parseFloat(isl.length) || 0;
            if (side === 'left' || side === 'right') totalEdgesInConfiguredUnit += parseFloat(isl.width) || 0;
          }
        } else {
          if (edgeId === 'top_front')
            totalEdgesInConfiguredUnit +=
              layout === 'straight'
                ? tL
                : layout === 'l-shape-left'
                  ? tL - lW
                  : layout === 'l-shape-right'
                    ? tL - rW
                    : tL - lW - rW;
          if (edgeId === 'top_left' && (layout === 'straight' || layout === 'l-shape-right'))
            totalEdgesInConfiguredUnit += tW;
          if (edgeId === 'top_right' && (layout === 'straight' || layout === 'l-shape-left'))
            totalEdgesInConfiguredUnit += tW;
          if (edgeId === 'left_front' && (layout === 'l-shape-left' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += lL - tW;
          if (edgeId === 'left_end' && (layout === 'l-shape-left' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += lW;
          if (edgeId === 'left_left' && (layout === 'l-shape-left' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += lL;
          if (edgeId === 'right_front' && (layout === 'l-shape-right' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += rL - tW;
          if (edgeId === 'right_end' && (layout === 'l-shape-right' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += rW;
          if (edgeId === 'right_right' && (layout === 'l-shape-right' || layout === 'u-shape'))
            totalEdgesInConfiguredUnit += rL;
        }
      });
      totalEdgeInches = getInches(totalEdgesInConfiguredUnit.toString(), selectedUnit);
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
      edgeProfileCost,
    };
  }, [
    layout,
    topPiece,
    leftPiece,
    rightPiece,
    islands,
    selectedVariant.price,
    profileType,
    selectedEdges,
    costs.wastagePercentage,
    costs.sinkCutCost,
    costs.stoveCutCost,
    selectedUnit,
    getInches,
  ]);

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
        selectedUnit,
      },
      variant: selectedVariant,
    });
  }, [
    calculations,
    layout,
    profileType,
    selectedEdges,
    topPiece,
    leftPiece,
    rightPiece,
    islands,
    selectedVariant,
    selectedUnit,
    onSave,
  ]);

  const unitShort =
    selectedUnit === 'inches' ? '"' : selectedUnit === 'feet' ? "'" : ` ${selectedUnit}`;
  const unitText =
    selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit;

  const hasLeftWing = layout === 'l-shape-left' || layout === 'u-shape';
  const hasRightWing = layout === 'l-shape-right' || layout === 'u-shape';

  const activePieceLabel = useMemo(() => {
    if (activePieceId === 'top') return isUr ? 'سینٹر' : 'Center';
    if (activePieceId === 'left') return isUr ? 'بائیں سائیڈ' : 'Left Wing';
    if (activePieceId === 'right') return isUr ? 'دائیں سائیڈ' : 'Right Wing';
    const idx = islands.findIndex((i) => i.id === activePieceId);
    return idx >= 0 ? (isUr ? `آئی لینڈ ${idx + 1}` : `Island ${idx + 1}`) : isUr ? 'سینٹر' : 'Center';
  }, [activePieceId, islands, isUr]);

  // Live cutout bounds for the compact center cutout bar
  const cutoutMetrics = useMemo(() => {
    if (!liveActiveCutout || !activePiece) return null;
    const isVertical = activePieceId === 'left' || activePieceId === 'right';
    const minX = isVertical ? parseFloat(topPiece.width) || 24 : 0;
    const pLength = parseFloat(activePiece.length) || 120;
    const maxX = Math.max(minX, pLength - (parseFloat(liveActiveCutout.width.toString()) || 0));
    const snap12 = parseFloat(convertUnitValue(12, 'inches', selectedUnit).toFixed(1));
    return { minX, pLength, maxX, snap12 };
  }, [liveActiveCutout, activePiece, activePieceId, topPiece.width, convertUnitValue, selectedUnit]);

  return (
    <div className="flex flex-col w-full">
      {/* Unified Full-Stage Kitchen Diagram with All Compact Controls Inside (Top, Left, Right, Center, Bottom) */}
      <div className="relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-sm min-h-[540px] sm:min-h-[600px] lg:min-h-[650px]">
        {/* TOP INSIDE BAR: Shape Switcher + Units + Zoom */}
        <div
          data-guide-step="1"
          className="relative z-20 flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800"
        >
          {/* Shape Segmented Controls */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
            {LAYOUT_OPTIONS.map((opt) => {
              const active = layout === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleLayoutChange(opt.id)}
                  className={cn(
                    'h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {isUr ? opt.ur : opt.en}
                </button>
              );
            })}
          </div>

          {/* Right Side of Top Bar: Instant Unit Switch + Zoom */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
              {UNIT_OPTIONS.map((u) => {
                const active = selectedUnit === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUnitChange(u.id)}
                    className={cn(
                      'h-7 px-2 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                onClick={() => setZoomLevel(1)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCw className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN EXPANSIVE DIAGRAM STAGE WITH LEFT, RIGHT & CENTER INSIDE OVERLAYS */}
        <div
          className="relative flex-1 min-h-[390px] sm:min-h-[455px] lg:min-h-[505px] overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Quiet Top Hint Inside Canvas */}
          <div className="pointer-events-none absolute top-1.5 inset-x-0 z-10 flex justify-center px-3">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center truncate max-w-full">
              {isUr
                ? 'کسی بھی سلیب پر کلک کر کے سائز بدلیں · کنارے پر کلک کر کے پالش آن/آف کریں'
                : 'Tap any slab to edit size · Tap slab edges to toggle polish'}
            </span>
          </div>

          {/* THE MAXIMIZED LIVE SVG BLUEPRINT */}
          <div className="absolute inset-0 flex items-center justify-center px-[78px] sm:px-[104px] pt-6 pb-12">
            <KitchenLayout
              layout={layout}
              dimensions={{ top: topPiece, left: leftPiece, right: rightPiece, islands }}
              textureUrl={marble.imageUrl}
              selectedEdges={selectedEdges}
              onEdgeToggle={(id) => setSelectedEdges((p) => ({ ...p, [id]: !p[id] }))}
              onCutoutChange={updateCutout}
              activeCutout={liveActiveCutout}
              setActiveCutout={handleSelectCutoutFromDiagram}
              zoom={zoomLevel}
              isDimensioningMode={true}
              unit={selectedUnit}
              activePieceId={activePieceId}
              onSelectPiece={(pieceId) => {
                setActivePieceId(pieceId);
                setActiveCutoutId(null);
              }}
            />
          </div>

          {/* LEFT INSIDE DOCK: Left Wing (when visible) + Edge Polish Selector */}
          <div className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[70px] sm:w-[92px]">
            {hasLeftWing && (
              <button
                type="button"
                onClick={() => {
                  setActivePieceId('left');
                  setActiveCutoutId(null);
                }}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-2 rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePieceId === 'left'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-sm'
                    : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-500/70'
                )}
              >
                <span className="text-[10px] sm:text-[11px] font-bold leading-tight whitespace-nowrap">
                  {isUr ? 'بائیں' : 'Left'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 whitespace-nowrap',
                    activePieceId === 'left'
                      ? 'text-slate-900'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {leftPiece.length}×{leftPiece.width}
                  {unitShort}
                </span>
              </button>
            )}

            {/* Compact Edge Polish Picker on Left Edge */}
            <div className="flex flex-col gap-0.5">
              <Select value={profileType} onValueChange={(v: ProfileType) => setProfileType(v)}>
                <SelectTrigger
                  aria-label={isUr ? 'کنارے کی پالش' : 'Edge Polish Style'}
                  className="h-auto min-h-[42px] px-1.5 py-1.5 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 [&>svg]:hidden cursor-pointer hover:border-primary/70"
                >
                  <span className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                    <Layers className="h-2.5 w-2.5 text-primary shrink-0" />
                    {isUr ? 'گولہ' : 'Edge'}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[60px] sm:max-w-[80px] leading-tight">
                    <SelectValue placeholder="Polish" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(edgeProfiles).map(([k, p]) => (
                    <SelectItem key={k} value={k} className="text-xs font-semibold">
                      {p.name} (PKR {p.price}/rft)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RIGHT INSIDE DOCK: Right Wing (when visible) + Sink / Stove / Island Quick Buttons */}
          <div
            data-guide-step="3"
            className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[70px] sm:w-[92px]"
          >
            {hasRightWing && (
              <button
                type="button"
                onClick={() => {
                  setActivePieceId('right');
                  setActiveCutoutId(null);
                }}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-2 rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePieceId === 'right'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-sm'
                    : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-500/70'
                )}
              >
                <span className="text-[10px] sm:text-[11px] font-bold leading-tight whitespace-nowrap">
                  {isUr ? 'دائیں' : 'Right'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 whitespace-nowrap',
                    activePieceId === 'right'
                      ? 'text-slate-900'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {rightPiece.length}×{rightPiece.width}
                  {unitShort}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => addCutout(e, 'sink')}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-white/95 dark:bg-slate-900/95 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <Droplets className="h-3 w-3 shrink-0" />
              <span>{isUr ? '+ سنک' : '+ Sink'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => addCutout(e, 'stove')}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-white/95 dark:bg-slate-900/95 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/60 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <Flame className="h-3 w-3 shrink-0" />
              <span>{isUr ? '+ چولہا' : '+ Stove'}</span>
            </button>

            <button
              type="button"
              onClick={addIsland}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:border-primary/70 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3 text-primary shrink-0" />
              <span>{isUr ? 'آئی لینڈ' : 'Island'}</span>
            </button>
          </div>

          {/* CENTER FLOATING CUTOUT MINI-EDITOR (only visible when a Sink/Stove is clicked) */}
          {liveActiveCutout && cutoutMetrics && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-156px)] sm:w-[340px] max-w-[360px] rounded-xl border border-blue-400/70 dark:border-blue-600/70 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md shadow-lg p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  <Scissors className="h-3 w-3" />
                  {liveActiveCutout.type === 'sink'
                    ? isUr
                      ? 'سنک کٹ آؤٹ'
                      : 'Sink Cutout'
                    : isUr
                      ? 'چولہا کٹ آؤٹ'
                      : 'Stove Cutout'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Delete cutout"
                    onClick={() => removeCutout(liveActiveCutout.id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Close cutout editor"
                    onClick={() => setActiveCutoutId(null)}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>{isUr ? `چوڑائی (${unitText})` : `W (${unitText})`}</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={liveActiveCutout.width}
                    onChange={(e) =>
                      updateCutout(liveActiveCutout.id, { width: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 px-1.5 text-xs font-bold tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>{isUr ? `گہرائی (${unitText})` : `D (${unitText})`}</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={liveActiveCutout.depth}
                    onChange={(e) =>
                      updateCutout(liveActiveCutout.id, { depth: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 px-1.5 text-xs font-bold tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                  <span>{isUr ? `کونے سے (${unitText})` : `Pos (${unitText})`}</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={liveActiveCutout.x}
                    onChange={(e) =>
                      updateCutout(liveActiveCutout.id, { x: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 px-1.5 text-xs font-extrabold tabular-nums border-blue-400/70"
                  />
                </label>
              </div>

              <Slider
                value={[liveActiveCutout.x]}
                onValueChange={(val) => updateCutout(liveActiveCutout.id, { x: val[0] })}
                min={cutoutMetrics.minX}
                max={cutoutMetrics.maxX}
                step={0.5}
                className="py-0.5"
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const centeredX = parseFloat(
                      ((cutoutMetrics.pLength - liveActiveCutout.width) / 2).toFixed(1)
                    );
                    updateCutout(liveActiveCutout.id, {
                      x: Math.max(cutoutMetrics.minX, centeredX),
                    });
                  }}
                  className="flex-1 h-6 px-1.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  <AlignCenter className="h-3 w-3 text-blue-600" />
                  <span>{isUr ? 'درمیان' : 'Center'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCutout(liveActiveCutout.id, {
                      x: Math.max(cutoutMetrics.minX, cutoutMetrics.snap12),
                    })
                  }
                  className="h-6 px-2 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  {isUr ? 'بائیں' : 'Left'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rightPos = parseFloat(
                      (
                        cutoutMetrics.pLength -
                        liveActiveCutout.width -
                        cutoutMetrics.snap12
                      ).toFixed(1)
                    );
                    updateCutout(liveActiveCutout.id, {
                      x: Math.max(cutoutMetrics.minX, rightPos),
                    });
                  }}
                  className="h-6 px-2 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  {isUr ? 'دائیں' : 'Right'}
                </button>
              </div>
            </div>
          )}

          {/* CENTER INSIDE DOCK: Center Slab + Islands + Active Cutout Selectors */}
          <div className="absolute left-1/2 bottom-2 -translate-x-1/2 z-20 flex items-center gap-1 max-w-[calc(100%-160px)] overflow-x-auto no-scrollbar px-1">
            <button
              type="button"
              onClick={() => {
                setActivePieceId('top');
                setActiveCutoutId(null);
              }}
              className={cn(
                'h-7 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm transition-all cursor-pointer',
                activePieceId === 'top'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                  : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-500/70'
              )}
            >
              <Square className="h-3 w-3 shrink-0" />
              <span>{isUr ? 'سینٹر' : 'Center'}</span>
              <span
                className={cn(
                  'text-[10px] font-mono tabular-nums',
                  activePieceId === 'top' ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {topPiece.length}×{topPiece.width}
                {unitShort}
              </span>
            </button>

            {islands.map((isl, idx) => {
              const active = activePieceId === isl.id;
              return (
                <div key={isl.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePieceId(isl.id);
                      setActiveCutoutId(null);
                    }}
                    className={cn(
                      'h-7 pl-2 pr-1 rounded-l-lg border text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-sm transition-all cursor-pointer',
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                        : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-amber-500/70'
                    )}
                  >
                    <span>{isUr ? `آئی لینڈ ${idx + 1}` : `Island ${idx + 1}`}</span>
                    <span className="text-[10px] font-mono tabular-nums opacity-80">
                      {isl.length}×{isl.width}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove Island ${idx + 1}`}
                    onClick={() => removeIsland(isl.id)}
                    className="h-7 px-1.5 rounded-r-lg border border-l-0 border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {activePiece &&
              activePiece.cutouts.map((c, i) => {
                const isSelected = liveActiveCutout?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCutoutId(isSelected ? null : c.id)}
                    className={cn(
                      'h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm transition-all cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-blue-50/95 dark:bg-blue-950/90 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-100'
                    )}
                  >
                    {c.type === 'sink' ? (
                      <Droplets className="h-3 w-3 shrink-0" />
                    ) : (
                      <Flame className="h-3 w-3 shrink-0" />
                    )}
                    <span>
                      {c.type === 'sink' ? (isUr ? 'سنک' : 'Sink') : isUr ? 'چولہا' : 'Stove'}
                      {activePiece.cutouts.length > 1 ? ` ${i + 1}` : ''}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* BOTTOM INSIDE BAR: Active Piece Length & Width + Live Total & Save */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200/80 dark:border-slate-800">
          {/* Active Piece Quick Dimensions */}
          <div data-guide-step="2" className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 whitespace-nowrap">
              {activePieceLabel}
            </span>

            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span>{isUr ? 'لمبائی' : 'L'}</span>
              <Input
                value={activePiece?.length || ''}
                onChange={(e) => handlePieceChange(activePieceId, 'length', e.target.value)}
                inputMode="decimal"
                aria-label="Piece length"
                className="h-8 w-16 sm:w-20 px-2 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 dark:bg-slate-950"
              />
              <span className="text-[10px] text-slate-500">{unitText}</span>
            </label>

            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span>{isUr ? 'چوڑائی' : 'W'}</span>
              <Input
                value={activePiece?.width || ''}
                onChange={(e) => handlePieceChange(activePieceId, 'width', e.target.value)}
                inputMode="decimal"
                aria-label="Piece width"
                className="h-8 w-16 sm:w-20 px-2 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 dark:bg-slate-950"
              />
              <span className="text-[10px] text-slate-500">{unitText}</span>
            </label>
          </div>

          {/* Total Cost & Save Action */}
          <div data-guide-step="4" className="flex items-center gap-2 ml-auto">
            <div className="flex items-baseline gap-1.5 text-right whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums hidden sm:inline">
                {calculations.finalSqFt.toFixed(1)} Sq.Ft ·
              </span>
              <span className="text-sm sm:text-base font-black text-primary tabular-nums">
                PKR {calculations.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 px-2.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {isUr ? 'بند' : 'Cancel'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={calculations.total <= 0}
              className="h-8 px-3 text-xs font-extrabold gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isUr ? 'محفوظ کریں' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

