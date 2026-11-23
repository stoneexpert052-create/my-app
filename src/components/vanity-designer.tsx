'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
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
import {
  Trash2,
  Bath,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  Layers,
  PanelTop,
  PanelBottom,
  Link2,
  X,
  Pencil,
} from 'lucide-react';
import { VanityLayout } from './vanity-layout';
import { edgeProfiles, type ProfileType } from './order-form';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCalculation } from '@/context/calculation-context';

interface VanityDesignerProps {
  onSave: (data: { total: number; details: any; variant: MarbleVariant }) => void;
  initialState: any;
  marble: Marble;
  variant: MarbleVariant;
  onCancel: () => void;
}

export type LayoutType = 'straight' | 'l-shape' | 'cut-corner';

const LAYOUT_OPTIONS: Array<{ id: LayoutType; en: string; ur: string }> = [
  { id: 'straight', en: 'Straight', ur: 'سیدھی' },
  { id: 'l-shape', en: 'L-Shape', ur: 'ایل شیپ' },
  { id: 'cut-corner', en: 'Cut Corner', ur: 'کونے والی' },
];

const UNIT_OPTIONS: Array<{ id: 'inches' | 'feet' | 'cm' | 'mm'; label: string }> = [
  { id: 'inches', label: 'In' },
  { id: 'feet', label: 'Ft' },
  { id: 'cm', label: 'CM' },
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

export const createNewVanity = (name: string = 'New Vanity'): VanityState => {
  const newId = Date.now() + Math.floor(Math.random() * 1000);
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
      straight_front: true,
      l_shape_front_a: true,
      l_shape_front_b: true,
      cut_corner_front: true,
      cut_corner_cut: true,
    },
  };
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

  return sinks.map((s) => {
    const align = s.alignment || 'centered';
    const w = parseFloat(s.width) || 0;
    const l = parseFloat(s.length) || 0;

    const x = Math.max(0, (vanityLength - w) / 2).toFixed(1);

    let yVal = 0;
    if (align === 'centered') {
      yVal = Math.max(0, (vanityWidth - l) / 2);
    } else if (align === 'up') {
      let margin = 2.5;
      if (unit === 'feet') margin = 2.5 / 12;
      else if (unit === 'cm') margin = 2.5 * 2.54;
      else if (unit === 'mm') margin = 2.5 * 25.4;
      yVal = margin;
    } else if (align === 'down') {
      let margin = 2.5;
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
      y,
    };
  });
};

type MiniPanelType = 'backsplash' | 'lutak' | 'sink' | null;

export function VanityDesigner({
  onSave,
  initialState,
  marble,
  variant,
  onCancel,
}: VanityDesignerProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  const isUr = language === 'ur';

  const [selectedVariant] = useState(variant);
  const [vanities, setVanities] = useState<VanityState[]>(initialState?.vanities || []);
  const [activeVanityId, setActiveVanityId] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [activePanel, setActivePanel] = useState<MiniPanelType>(null);
  const [activeSinkId, setActiveSinkId] = useState<number | null>(null);

  const [isAddVanityDialogOpen, setIsAddVanityDialogOpen] = useState(false);
  const [editingVanityNameId, setEditingVanityNameId] = useState<number | null>(null);
  const [newVanityName, setNewVanityName] = useState('');

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

  const handleUnitChange = useCallback(
    (toUnit: 'inches' | 'feet' | 'cm' | 'mm') => {
      if (toUnit === selectedUnit) return;
      const fromUnit = selectedUnit;
      const convertStr = (valStr: string) => {
        const val = parseFloat(valStr) || 0;
        return Number(convertUnitValue(val, fromUnit, toUnit).toFixed(1)).toString();
      };

      setVanities((prev) =>
        prev.map((v) => {
          const convertedLength = convertStr(v.length);
          const convertedWidth = convertStr(v.width);
          const convertedSideA = convertStr(v.lShapeSideA);

          const convertedSinks = v.sinks.map((s) => ({
            ...s,
            width: convertStr(s.width),
            length: convertStr(s.length),
            x: convertStr(s.x),
            y: convertStr(s.y),
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
              height: convertStr(v.backsplash.height),
            },
            lutak: {
              ...v.lutak,
              height: convertStr(v.lutak.height),
            },
            sinks: recalculatedSinksList,
          };
        })
      );

      setSelectedUnit(toUnit);
    },
    [selectedUnit, convertUnitValue]
  );

  useEffect(() => {
    if (initialState?.vanities && initialState.vanities.length > 0) {
      setVanities(initialState.vanities);
      setActiveVanityId(initialState.vanities[0].id);
      if (initialState.selectedUnit) {
        setSelectedUnit(initialState.selectedUnit);
      }
    } else {
      const newVanity = createNewVanity('Vanity 1');
      setVanities([newVanity]);
      setActiveVanityId(newVanity.id);
    }
  }, [initialState]);

  const updateVanity = useCallback(
    (
      id: number,
      newProps: Partial<VanityState> | ((prevState: VanityState) => Partial<VanityState>)
    ) => {
      setVanities((prev) =>
        prev.map((v) => {
          if (v.id === id) {
            const updates = typeof newProps === 'function' ? newProps(v) : newProps;
            const merged = { ...v, ...updates };

            const sinksNeedRecalc =
              updates.sinks !== undefined ||
              updates.width !== undefined ||
              updates.length !== undefined ||
              updates.layout !== undefined ||
              updates.lShapeSideA !== undefined;

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
    },
    [selectedUnit]
  );

  const addSink = (vanityId: number) => {
    const defaultW = Number(convertUnitValue(18, 'inches', selectedUnit).toFixed(1));
    const defaultL = Number(convertUnitValue(12, 'inches', selectedUnit).toFixed(1));
    const defaultX = Number(convertUnitValue(15, 'inches', selectedUnit).toFixed(1));
    const defaultY = Number(convertUnitValue(5, 'inches', selectedUnit).toFixed(1));
    const newSinkId = Date.now();

    updateVanity(vanityId, (prev) => ({
      sinks: [
        ...prev.sinks,
        {
          id: newSinkId,
          type: 'undermount',
          shape: 'rectangle',
          width: String(defaultW),
          length: String(defaultL),
          x: String(defaultX),
          y: String(defaultY),
          alignment: 'centered',
        },
      ],
    }));
    setActiveSinkId(newSinkId);
    setActivePanel('sink');
  };

  const updateSink = (vanityId: number, sinkId: number, newProps: Partial<SinkCutout>) => {
    updateVanity(vanityId, (prev) => ({
      sinks: prev.sinks.map((s) => (s.id === sinkId ? { ...s, ...newProps } : s)),
    }));
  };

  const removeSink = (vanityId: number, sinkId: number) => {
    updateVanity(vanityId, (prev) => ({
      sinks: prev.sinks.filter((s) => s.id !== sinkId),
    }));
    if (activeSinkId === sinkId) {
      setActiveSinkId(null);
      setActivePanel(null);
    }
  };

  const handleBacksplashChange = (
    vanityId: number,
    side: 'back' | 'left' | 'right',
    value: boolean
  ) => {
    updateVanity(vanityId, (prevVanity) => ({
      backsplash: { ...prevVanity.backsplash, [side]: value },
    }));
  };

  const handleLutakChange = (
    vanityId: number,
    side: 'front' | 'left' | 'right',
    value: boolean
  ) => {
    updateVanity(vanityId, (prevVanity) => {
      const newLutak = { ...prevVanity.lutak, [side]: value };
      const newSelectedEdges = { ...prevVanity.selectedEdges };

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
    let totalFinalSqFt = 0;

    const vanityCalculations = vanities.map((v) => {
      if (!v) return null;

      const {
        layout,
        length,
        width,
        lShapeSideA,
        lShapeSideB,
        cutCornerX,
        cutCornerY,
        backsplash,
        lutak,
        sinks,
        profileType,
        jointType,
        selectedEdges,
      } = v;

      const mainLength = getInches(length, selectedUnit);
      const mainWidth = getInches(width, selectedUnit);
      const sideA = getInches(lShapeSideA, selectedUnit);
      const sideB = getInches(lShapeSideB, selectedUnit);
      const cornerX = getInches(cutCornerX, selectedUnit);
      const cornerY = getInches(cutCornerY, selectedUnit);
      const backsplashHeight = getInches(backsplash.height, selectedUnit);
      const lutakHeight = getInches(lutak.height, selectedUnit);

      let mainAreaIn = 0;
      let backsplashAreaIn = 0;
      let lutakAreaIn = 0;
      let cuttingRft = 0;

      switch (layout) {
        case 'straight':
          mainAreaIn = mainLength * mainWidth;
          cuttingRft += 2 * mainLength + 2 * mainWidth;
          break;
        case 'l-shape':
          mainAreaIn = sideA * mainWidth + sideB * mainWidth - mainWidth * mainWidth;
          cuttingRft += sideA + sideB + (sideA - mainWidth) + (sideB - mainWidth);
          break;
        case 'cut-corner': {
          mainAreaIn = mainLength * mainWidth - 0.5 * cornerX * cornerY;
          const cutEdgeLength = Math.sqrt(cornerX ** 2 + cornerY ** 2);
          cuttingRft +=
            mainLength + mainWidth + (mainLength - cornerX) + (mainWidth - cornerY) + cutEdgeLength;
          break;
        }
      }

      if (backsplash.back) {
        const pieceLength =
          layout === 'l-shape'
            ? sideA
            : layout === 'cut-corner'
              ? mainLength - cornerX
              : mainLength;
        backsplashAreaIn += pieceLength * backsplashHeight;
        cuttingRft += 2 * pieceLength + 2 * backsplashHeight;
      }
      if (backsplash.left) {
        const pieceLength = layout === 'l-shape' ? sideB : mainWidth;
        backsplashAreaIn += pieceLength * backsplashHeight;
        cuttingRft += 2 * pieceLength + 2 * backsplashHeight;
      }
      if (backsplash.right) {
        const pieceLength = mainWidth;
        backsplashAreaIn += pieceLength * backsplashHeight;
        cuttingRft += 2 * pieceLength + 2 * backsplashHeight;
      }

      let lutakLengthIn = 0;
      if (lutak.front) {
        switch (layout) {
          case 'straight':
            lutakAreaIn += mainLength * lutakHeight;
            cuttingRft += 2 * mainLength + 2 * lutakHeight;
            lutakLengthIn += mainLength;
            break;
          case 'l-shape':
            lutakAreaIn += (sideA - mainWidth) * lutakHeight;
            cuttingRft += 2 * (sideA - mainWidth) + 2 * lutakHeight;
            lutakAreaIn += (sideB - mainWidth) * lutakHeight;
            cuttingRft += 2 * (sideB - mainWidth) + 2 * lutakHeight;
            lutakLengthIn += sideA - mainWidth + (sideB - mainWidth);
            break;
          case 'cut-corner': {
            const cutEdge = Math.sqrt(cornerX ** 2 + cornerY ** 2);
            lutakAreaIn += (mainLength - cornerX) * lutakHeight;
            cuttingRft += 2 * (mainLength - cornerX) + 2 * lutakHeight;
            lutakAreaIn += cutEdge * lutakHeight;
            cuttingRft += 2 * cutEdge + 2 * lutakHeight;
            lutakLengthIn += mainLength - cornerX + cutEdge;
            break;
          }
        }
      }
      if (lutak.left) {
        const pieceLength = layout === 'l-shape' ? sideB : mainWidth;
        lutakAreaIn += pieceLength * lutakHeight;
        cuttingRft += 2 * pieceLength + 2 * lutakHeight;
        lutakLengthIn += pieceLength;
      }
      if (lutak.right) {
        const pieceLength = layout === 'cut-corner' ? mainWidth - cornerY : mainWidth;
        lutakAreaIn += pieceLength * lutakHeight;
        cuttingRft += 2 * pieceLength + 2 * lutakHeight;
        lutakLengthIn += pieceLength;
      }

      const sinkAreaIn = sinks.reduce((acc, sink) => {
        const w = getInches(sink.width, selectedUnit);
        const l = getInches(sink.length, selectedUnit);
        if (sink.type === 'drop-in') return acc + w * l;
        return acc;
      }, 0);

      const totalSqFt = (mainAreaIn + backsplashAreaIn + lutakAreaIn - sinkAreaIn) / 144;

      let edgeLengthIn = 0;
      const profile = edgeProfiles[profileType];
      if (profile && profile.price > 0) {
        Object.keys(selectedEdges).forEach((edgeId) => {
          if (selectedEdges[edgeId]) {
            switch (edgeId) {
              case 'straight_front':
                edgeLengthIn += mainLength;
                break;
              case 'straight_left':
                edgeLengthIn += mainWidth;
                break;
              case 'straight_right':
                edgeLengthIn += mainWidth;
                break;
              case 'l_shape_front_a':
                edgeLengthIn += sideA - mainWidth;
                break;
              case 'l_shape_front_b':
                edgeLengthIn += sideB - mainWidth;
                break;
              case 'l_shape_end_a':
                edgeLengthIn += mainWidth;
                break;
              case 'l_shape_end_b':
                edgeLengthIn += mainWidth;
                break;
              case 'cut_corner_front':
                edgeLengthIn += mainLength - cornerX;
                break;
              case 'cut_corner_left':
                edgeLengthIn += mainWidth;
                break;
              case 'cut_corner_top_right':
                edgeLengthIn += mainWidth - cornerY;
                break;
              case 'cut_corner_cut':
                edgeLengthIn += Math.sqrt(cornerX ** 2 + cornerY ** 2);
                break;
            }
          }
        });
      }

      const wastage = totalSqFt * ((costs.wastagePercentage || 15) / 100);
      const finalSqFt = totalSqFt + wastage;
      const materialCost = finalSqFt * (selectedVariant.price ?? 0);
      const edgeCost = (edgeLengthIn / 12) * profile.price;
      const sinkCost = sinks.length * (costs.sinkCutCost || 3000);
      const jointProfile = edgeProfiles[jointType];
      const lutakCost = (lutakLengthIn / 12) * (jointProfile?.price || 0);
      const cuttingCost = (cuttingRft / 12) * 30;

      const totalCost = materialCost + edgeCost + sinkCost + lutakCost + cuttingCost;
      grandTotal += totalCost;
      totalFinalSqFt += finalSqFt;

      return {
        ...v,
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
        },
      };
    });

    return {
      vanityCalculations: vanityCalculations.filter((v) => v !== null),
      grandTotal,
      totalFinalSqFt,
    };
  }, [
    vanities,
    selectedVariant.price,
    costs.wastagePercentage,
    costs.sinkCutCost,
    selectedUnit,
    getInches,
  ]);

  const handleSave = () => {
    const vanitiesWithCalculations = calculations.vanityCalculations.map((vc) => ({ ...vc }));
    onSave({
      total: calculations.grandTotal,
      details: {
        vanities: vanitiesWithCalculations,
        ...calculations,
        rate: selectedVariant.price ?? 0,
        selectedUnit,
      },
      variant: selectedVariant,
    });
  };

  const handleAddOrRenameVanity = () => {
    const trimmed = newVanityName.trim();
    if (editingVanityNameId !== null) {
      if (trimmed) {
        updateVanity(editingVanityNameId, { name: trimmed });
      }
      setEditingVanityNameId(null);
      setNewVanityName('');
      setIsAddVanityDialogOpen(false);
      return;
    }

    const baseVanity = createNewVanity(trimmed || `Vanity ${vanities.length + 1}`);
    if (selectedUnit !== 'inches') {
      const conv = (s: string) =>
        Number(convertUnitValue(parseFloat(s) || 0, 'inches', selectedUnit).toFixed(1)).toString();
      baseVanity.length = conv(baseVanity.length);
      baseVanity.width = conv(baseVanity.width);
      baseVanity.lShapeSideA = conv(baseVanity.lShapeSideA);
      baseVanity.lShapeSideB = conv(baseVanity.lShapeSideB);
      baseVanity.cutCornerX = conv(baseVanity.cutCornerX);
      baseVanity.cutCornerY = conv(baseVanity.cutCornerY);
      baseVanity.backsplash.height = conv(baseVanity.backsplash.height);
      baseVanity.lutak.height = conv(baseVanity.lutak.height);
    }
    setVanities((prev) => [...prev, baseVanity]);
    setActiveVanityId(baseVanity.id);
    setActiveSinkId(null);
    setActivePanel(null);
    setNewVanityName('');
    setIsAddVanityDialogOpen(false);
  };

  const removeVanity = (id: number) => {
    const nextList = vanities.filter((v) => v.id !== id);
    setVanities(nextList);
    if (activeVanityId === id) {
      setActiveVanityId(nextList.length > 0 ? nextList[0].id : null);
      setActiveSinkId(null);
      setActivePanel(null);
    }
  };

  const activeVanity = useMemo(
    () => vanities.find((v) => v.id === activeVanityId) || vanities[0] || null,
    [vanities, activeVanityId]
  );

  const activeSink = useMemo(() => {
    if (!activeVanity || activeSinkId === null) return null;
    return activeVanity.sinks.find((s) => s.id === activeSinkId) || null;
  }, [activeVanity, activeSinkId]);

  const unitShort =
    selectedUnit === 'inches' ? '"' : selectedUnit === 'feet' ? "'" : ` ${selectedUnit}`;
  const unitText =
    selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit;

  const backsplashSummary = useMemo(() => {
    if (!activeVanity) return isUr ? 'آف' : 'Off';
    const sides: string[] = [];
    if (activeVanity.backsplash.back) sides.push(isUr ? 'پیچھے' : 'B');
    if (activeVanity.backsplash.left) sides.push(isUr ? 'بائیں' : 'L');
    if (activeVanity.backsplash.right) sides.push(isUr ? 'دائیں' : 'R');
    if (sides.length === 0) return isUr ? 'آف' : 'Off';
    return `${sides.join('·')} ${activeVanity.backsplash.height}${unitShort}`;
  }, [activeVanity, isUr, unitShort]);

  const lutakSummary = useMemo(() => {
    if (!activeVanity) return isUr ? 'آف' : 'Off';
    const sides: string[] = [];
    if (activeVanity.lutak.front) sides.push(isUr ? 'سامنے' : 'F');
    if (activeVanity.lutak.left) sides.push(isUr ? 'بائیں' : 'L');
    if (activeVanity.lutak.right) sides.push(isUr ? 'دائیں' : 'R');
    if (sides.length === 0) return isUr ? 'آف' : 'Off';
    return `${sides.join('·')} ${activeVanity.lutak.height}${unitShort}`;
  }, [activeVanity, isUr, unitShort]);

  const cleanNumericInput = (val: string) => val.replace(/[^0-9.]/g, '');

  return (
    <div className="flex flex-col w-full">
      {/* Unified White Full-Stage Vanity Diagram with All Compact Controls Inside (Top, Left, Right, Center, Bottom) */}
      <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white text-slate-900 overflow-hidden shadow-sm min-h-[540px] sm:min-h-[600px] lg:min-h-[650px]">
        {/* TOP INSIDE BAR: Shape Switcher + Instant Units + Zoom */}
        <div
          data-guide-step="1"
          className="relative z-20 flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-200"
        >
          {/* Shape Segmented Controls */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
            {LAYOUT_OPTIONS.map((opt) => {
              const active = activeVanity?.layout === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!activeVanity}
                  onClick={() => activeVanity && updateVanity(activeVanity.id, { layout: opt.id })}
                  className={cn(
                    'h-7 px-2.5 sm:px-3 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {isUr ? opt.ur : opt.en}
                </button>
              );
            })}
          </div>

          {/* Right Side of Top Bar: Instant Unit Switch + Zoom */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
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
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                onClick={() => setZoomLevel(1)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <RotateCw className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoomLevel((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN WHITE EXPANSIVE DIAGRAM STAGE WITH LEFT, RIGHT & CENTER INSIDE OVERLAYS */}
        <div
          className="relative flex-1 min-h-[390px] sm:min-h-[455px] lg:min-h-[505px] bg-white overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Quiet Top Hint Inside White Canvas */}
          <div className="pointer-events-none absolute top-1.5 inset-x-0 z-10 flex justify-center px-3">
            <span className="text-[10px] font-medium text-slate-500 text-center truncate max-w-full">
              {isUr
                ? 'کناروں پر کلک کر کے پالش آن/آف کریں · بیسن پر کلک کر کے سائز بدلیں'
                : 'Tap outer edges to toggle polish · Tap basin to adjust cutout'}
            </span>
          </div>

          {/* MAXIMIZED LIVE VANITY SVG BLUEPRINT */}
          <div className="absolute inset-0 flex items-center justify-center px-[82px] sm:px-[108px] pt-6 pb-12">
            {activeVanity ? (
              <VanityLayout
                layout={activeVanity.layout}
                dimensions={activeVanity}
                profileType={activeVanity.profileType}
                selectedEdges={activeVanity.selectedEdges}
                onEdgeToggle={(edgeId) => {
                  updateVanity(activeVanity.id, (prevState) => ({
                    selectedEdges: {
                      ...prevState.selectedEdges,
                      [edgeId]: !prevState.selectedEdges[edgeId],
                    },
                  }));
                }}
                marbleImageUrl={marble.imageUrl}
                sinks={activeVanity.sinks}
                backsplash={activeVanity.backsplash}
                lutak={activeVanity.lutak}
                zoom={zoomLevel}
                unit={selectedUnit}
                activeSinkId={activePanel === 'sink' ? activeSinkId : null}
                onSelectSink={(sinkId) => {
                  setActiveSinkId(sinkId);
                  setActivePanel('sink');
                }}
              />
            ) : (
              <div className="text-center text-slate-500 space-y-2">
                <p className="text-sm font-medium">
                  {isUr ? 'کوئی وینٹی شامل نہیں کی گئی۔' : 'No vanity added yet.'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingVanityNameId(null);
                    setNewVanityName('');
                    setIsAddVanityDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isUr ? 'پہلی وینٹی شامل کریں' : 'Add First Vanity'}
                </Button>
              </div>
            )}
          </div>

          {/* LEFT INSIDE DOCK: Edge Polish + Backsplash + Lutak (3 compact buttons) */}
          {activeVanity && (
            <div className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[74px] sm:w-[96px]">
              {/* Edge Polish Picker */}
              <Select
                value={activeVanity.profileType}
                onValueChange={(v) =>
                  updateVanity(activeVanity.id, { profileType: v as ProfileType })
                }
              >
                <SelectTrigger
                  aria-label={isUr ? 'کنارے کی پالش' : 'Edge Polish Style'}
                  className="h-auto min-h-[42px] px-1.5 py-1.5 bg-white/95 text-slate-900 border-slate-200 shadow-sm text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 [&>svg]:hidden cursor-pointer hover:border-amber-500/80"
                >
                  <span className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold whitespace-nowrap">
                    <Layers className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                    {isUr ? 'گولہ' : 'Edge'}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-[64px] sm:max-w-[84px] leading-tight">
                    <SelectValue placeholder="Polish" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(edgeProfiles)
                    .filter(([k]) => !k.includes('litac'))
                    .map(([key, p]) => (
                      <SelectItem key={key} value={key} className="text-xs font-semibold">
                        {p.name} (PKR {p.price}/rft)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Backsplash (Wall Patti) Toggle */}
              <button
                type="button"
                onClick={() =>
                  setActivePanel((p) => (p === 'backsplash' ? null : 'backsplash'))
                }
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-1.5 min-h-[42px] rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePanel === 'backsplash'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                    : activeVanity.backsplash.back ||
                        activeVanity.backsplash.left ||
                        activeVanity.backsplash.right
                      ? 'bg-amber-50 text-slate-900 border-amber-400 hover:bg-amber-100'
                      : 'bg-white/95 text-slate-800 border-slate-200 hover:border-amber-500/70'
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight whitespace-nowrap">
                  <PanelTop className="h-2.5 w-2.5 shrink-0" />
                  {isUr ? 'پٹی' : 'Splash'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 truncate max-w-full',
                    activePanel === 'backsplash' ? 'text-slate-900' : 'text-slate-500'
                  )}
                >
                  {backsplashSummary}
                </span>
              </button>

              {/* Lutak (Front/Side Apron) Toggle */}
              <button
                type="button"
                onClick={() => setActivePanel((p) => (p === 'lutak' ? null : 'lutak'))}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-1.5 min-h-[42px] rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePanel === 'lutak'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                    : activeVanity.lutak.front ||
                        activeVanity.lutak.left ||
                        activeVanity.lutak.right
                      ? 'bg-amber-50 text-slate-900 border-amber-400 hover:bg-amber-100'
                      : 'bg-white/95 text-slate-800 border-slate-200 hover:border-amber-500/70'
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight whitespace-nowrap">
                  <PanelBottom className="h-2.5 w-2.5 shrink-0" />
                  {isUr ? 'لٹک' : 'Lutak'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 truncate max-w-full',
                    activePanel === 'lutak' ? 'text-slate-900' : 'text-slate-500'
                  )}
                >
                  {lutakSummary}
                </span>
              </button>
            </div>
          )}

          {/* RIGHT INSIDE DOCK: + Basin, + Vanity, Joint Style (3 compact buttons) */}
          {activeVanity && (
            <div
              data-guide-step="3"
              className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[74px] sm:w-[96px]"
            >
              <button
                type="button"
                onClick={() => addSink(activeVanity.id)}
                className="flex items-center justify-center gap-1 h-9 px-1.5 rounded-lg border border-blue-200 bg-white/95 text-blue-700 hover:bg-blue-50 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
              >
                <Bath className="h-3.5 w-3.5 shrink-0" />
                <span>{isUr ? '+ بیسن' : '+ Basin'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingVanityNameId(null);
                  setNewVanityName('');
                  setIsAddVanityDialogOpen(true);
                }}
                className="flex items-center justify-center gap-1 h-9 px-1.5 rounded-lg border border-slate-200 bg-white/95 text-slate-800 hover:border-amber-500/70 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>{isUr ? 'وینٹی' : 'Vanity'}</span>
              </button>

              {/* Joint Style Picker */}
              <Select
                value={activeVanity.jointType}
                onValueChange={(v) =>
                  updateVanity(activeVanity.id, { jointType: v as ProfileType })
                }
              >
                <SelectTrigger
                  aria-label={isUr ? 'لٹک جوڑ' : 'Joint Type'}
                  className="h-auto min-h-[42px] px-1.5 py-1.5 bg-white/95 text-slate-900 border-slate-200 shadow-sm text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 [&>svg]:hidden cursor-pointer hover:border-amber-500/80"
                >
                  <span className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold whitespace-nowrap">
                    <Link2 className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                    {isUr ? 'جوڑ' : 'Joint'}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-[64px] sm:max-w-[84px] leading-tight">
                    <SelectValue placeholder="Joint" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(edgeProfiles)
                    .filter(([k]) => k === 'none' || k.includes('litac'))
                    .map(([key, p]) => (
                      <SelectItem key={key} value={key} className="text-xs font-semibold">
                        {p.name} (PKR {p.price}/rft)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* FLOATING CENTER MINI-EDITOR FOR BACKSPLASH / LUTAK / BASIN (Only 1 open at a time) */}
          {activeVanity && activePanel === 'backsplash' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[330px] max-w-[350px] rounded-xl border border-amber-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 whitespace-nowrap">
                  <PanelTop className="h-3.5 w-3.5 text-amber-600" />
                  {isUr ? 'دیوار پٹی (Backsplash)' : 'Backsplash Sides & Height'}
                </span>
                <button
                  type="button"
                  aria-label="Close backsplash editor"
                  onClick={() => setActivePanel(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {(['back', 'left', 'right'] as const).map((side) => {
                  const checked = activeVanity.backsplash[side];
                  const label =
                    side === 'back'
                      ? isUr
                        ? 'پیچھے'
                        : 'Back'
                      : side === 'left'
                        ? isUr
                          ? 'بائیں'
                          : 'Left'
                        : isUr
                          ? 'دائیں'
                          : 'Right';
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => handleBacksplashChange(activeVanity.id, side, !checked)}
                      className={cn(
                        'flex-1 h-7 rounded-md border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap',
                        checked
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 shrink-0 pl-1">
                  <span>{isUr ? 'اونچائی' : 'H'}</span>
                  <Input
                    value={activeVanity.backsplash.height}
                    onChange={(e) =>
                      updateVanity(activeVanity.id, {
                        backsplash: {
                          ...activeVanity.backsplash,
                          height: cleanNumericInput(e.target.value),
                        },
                      })
                    }
                    inputMode="decimal"
                    className="h-7 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-500">{unitText}</span>
                </label>
              </div>
            </div>
          )}

          {activeVanity && activePanel === 'lutak' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[330px] max-w-[350px] rounded-xl border border-amber-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 whitespace-nowrap">
                  <PanelBottom className="h-3.5 w-3.5 text-amber-600" />
                  {isUr ? 'لٹک / ایپرن (Lutak Apron)' : 'Lutak (Apron) Sides & Height'}
                </span>
                <button
                  type="button"
                  aria-label="Close lutak editor"
                  onClick={() => setActivePanel(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {(['front', 'left', 'right'] as const).map((side) => {
                  const checked = activeVanity.lutak[side];
                  const label =
                    side === 'front'
                      ? isUr
                        ? 'سامنے'
                        : 'Front'
                      : side === 'left'
                        ? isUr
                          ? 'بائیں'
                          : 'Left'
                        : isUr
                          ? 'دائیں'
                          : 'Right';
                  return (
                    <button
                      key={side}
                      type="button"
                      onClick={() => handleLutakChange(activeVanity.id, side, !checked)}
                      className={cn(
                        'flex-1 h-7 rounded-md border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap',
                        checked
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 shrink-0 pl-1">
                  <span>{isUr ? 'اونچائی' : 'H'}</span>
                  <Input
                    value={activeVanity.lutak.height}
                    onChange={(e) =>
                      updateVanity(activeVanity.id, {
                        lutak: {
                          ...activeVanity.lutak,
                          height: cleanNumericInput(e.target.value),
                        },
                      })
                    }
                    inputMode="decimal"
                    className="h-7 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-500">{unitText}</span>
                </label>
              </div>
            </div>
          )}

          {activeVanity && activePanel === 'sink' && activeSink && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[340px] max-w-[360px] rounded-xl border border-blue-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-700 whitespace-nowrap">
                  <Bath className="h-3.5 w-3.5" />
                  {isUr ? 'واش بیسن کٹ آؤٹ' : 'Basin Cutout'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Delete basin"
                    onClick={() => removeSink(activeVanity.id, activeSink.id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Close basin editor"
                    onClick={() => {
                      setActivePanel(null);
                      setActiveSinkId(null);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Type & Shape Segmented Row */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex bg-slate-100 p-0.5 rounded-md">
                  {(['undermount', 'drop-in'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateSink(activeVanity.id, activeSink.id, { type: t })}
                      className={cn(
                        'flex-1 h-6 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer',
                        activeSink.type === t
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t === 'undermount'
                        ? isUr
                          ? 'انڈرماؤنٹ'
                          : 'Under'
                        : isUr
                          ? 'ڈراپ ان'
                          : 'Drop-in'}
                    </button>
                  ))}
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-md">
                  {(['rectangle', 'circle'] as const).map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => updateSink(activeVanity.id, activeSink.id, { shape: sh })}
                      className={cn(
                        'flex-1 h-6 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer',
                        activeSink.shape === sh
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {sh === 'rectangle' ? (isUr ? 'چوکور' : 'Rect') : isUr ? 'گول' : 'Circle'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size & Alignment Row */}
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                  <span>{isUr ? 'چوڑائی' : 'W'}</span>
                  <Input
                    value={activeSink.width}
                    onChange={(e) =>
                      updateSink(activeVanity.id, activeSink.id, {
                        width: cleanNumericInput(e.target.value),
                      })
                    }
                    inputMode="decimal"
                    className="h-7 w-14 px-1.5 text-xs font-bold tabular-nums text-center bg-white"
                  />
                </label>
                {activeSink.shape !== 'circle' && (
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                    <span>{isUr ? 'لمبائی' : 'L'}</span>
                    <Input
                      value={activeSink.length}
                      onChange={(e) =>
                        updateSink(activeVanity.id, activeSink.id, {
                          length: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-7 w-14 px-1.5 text-xs font-bold tabular-nums text-center bg-white"
                    />
                  </label>
                )}

                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md ml-auto">
                  {(['up', 'centered', 'down'] as const).map((al) => (
                    <button
                      key={al}
                      type="button"
                      onClick={() =>
                        updateSink(activeVanity.id, activeSink.id, { alignment: al })
                      }
                      className={cn(
                        'h-6 px-1.5 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer',
                        (activeSink.alignment || 'centered') === al
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {al === 'up'
                        ? isUr
                          ? 'اوپر'
                          : 'Up'
                        : al === 'down'
                          ? isUr
                            ? 'نیچے'
                            : 'Down'
                          : isUr
                            ? 'بیچ'
                            : 'Mid'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CENTER INSIDE DOCK: Vanity Switcher Tabs + Basin Cutout Chips */}
          {activeVanity && (
            <div className="absolute left-1/2 bottom-2 -translate-x-1/2 z-20 flex items-center gap-1 max-w-[calc(100%-168px)] overflow-x-auto no-scrollbar px-1">
              {vanities.map((v) => {
                const isSelected = v.id === activeVanity.id;
                return (
                  <div key={v.id} className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVanityId(v.id);
                        setActiveSinkId(null);
                        setActivePanel(null);
                      }}
                      className={cn(
                        'h-7 px-2.5 border text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-sm transition-all cursor-pointer',
                        vanities.length > 1 || isSelected ? 'rounded-l-lg' : 'rounded-lg',
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                          : 'bg-white/95 text-slate-800 border-slate-200 hover:border-amber-500/70'
                      )}
                    >
                      <span className="truncate max-w-[90px]">{v.name}</span>
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        aria-label={`Rename ${v.name}`}
                        onClick={() => {
                          setEditingVanityNameId(v.id);
                          setNewVanityName(v.name);
                          setIsAddVanityDialogOpen(true);
                        }}
                        className={cn(
                          'h-7 px-1.5 border border-l-0 border-amber-600 bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer',
                          vanities.length === 1 ? 'rounded-r-lg' : ''
                        )}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {vanities.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${v.name}`}
                        onClick={() => removeVanity(v.id)}
                        className="h-7 px-1.5 rounded-r-lg border border-l-0 border-slate-200 bg-white/95 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {activeVanity.sinks.map((s, idx) => {
                const isSelected = activePanel === 'sink' && activeSinkId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setActivePanel(null);
                        setActiveSinkId(null);
                      } else {
                        setActiveSinkId(s.id);
                        setActivePanel('sink');
                      }
                    }}
                    className={cn(
                      'h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm transition-all cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                    )}
                  >
                    <Bath className="h-3 w-3 shrink-0" />
                    <span>
                      {isUr ? 'بیسن' : 'Basin'}
                      {activeVanity.sinks.length > 1 ? ` ${idx + 1}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM INSIDE BAR: Live Dimensions + Total Cost & Save */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 bg-white/95 backdrop-blur-sm border-t border-slate-200">
          {/* Active Vanity Dimensions */}
          {activeVanity && (
            <div data-guide-step="2" className="flex flex-wrap items-center gap-2">
              {activeVanity.layout === 'straight' && (
                <>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'لمبائی' : 'L'}</span>
                    <Input
                      value={activeVanity.length}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          length: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      aria-label="Vanity length"
                      className="h-8 w-16 sm:w-20 px-2 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>

                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'چوڑائی' : 'W'}</span>
                    <Input
                      value={activeVanity.width}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          width: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      aria-label="Vanity width"
                      className="h-8 w-16 sm:w-20 px-2 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>
                </>
              )}

              {activeVanity.layout === 'l-shape' && (
                <>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'سائیڈ A' : 'Side A'}</span>
                    <Input
                      value={activeVanity.lShapeSideA}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          lShapeSideA: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-14 sm:w-16 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'سائیڈ B' : 'Side B'}</span>
                    <Input
                      value={activeVanity.lShapeSideB}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          lShapeSideB: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-14 sm:w-16 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'چوڑائی' : 'W'}</span>
                    <Input
                      value={activeVanity.width}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          width: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-14 sm:w-16 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>
                </>
              )}

              {activeVanity.layout === 'cut-corner' && (
                <>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'لمبائی' : 'L'}</span>
                    <Input
                      value={activeVanity.length}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          length: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'چوڑائی' : 'W'}</span>
                    <Input
                      value={activeVanity.width}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          width: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>Cut X</span>
                    <Input
                      value={activeVanity.cutCornerX}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          cutCornerX: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-12 px-1 text-xs font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>Cut Y</span>
                    <Input
                      value={activeVanity.cutCornerY}
                      onChange={(e) =>
                        updateVanity(activeVanity.id, {
                          cutCornerY: cleanNumericInput(e.target.value),
                        })
                      }
                      inputMode="decimal"
                      className="h-8 w-12 px-1 text-xs font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Live Total & Save Action */}
          <div data-guide-step="4" className="flex items-center gap-2 ml-auto">
            <div className="flex items-baseline gap-1.5 text-right whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-500 tabular-nums hidden sm:inline">
                {calculations.totalFinalSqFt.toFixed(1)} Sq.Ft ·
              </span>
              <span className="text-sm sm:text-base font-black text-amber-700 tabular-nums">
                PKR {calculations.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 px-2.5 text-xs font-semibold whitespace-nowrap shrink-0 bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
            >
              {isUr ? 'بند' : 'Cancel'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={vanities.length === 0 || calculations.grandTotal <= 0}
              className="h-8 px-3 text-xs font-extrabold gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isUr ? 'محفوظ کریں' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Rename Vanity Dialog */}
      <Dialog open={isAddVanityDialogOpen} onOpenChange={setIsAddVanityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVanityNameId !== null
                ? isUr
                  ? 'وینٹی کا نام بدلیں'
                  : 'Rename Vanity'
                : isUr
                  ? 'نئی وینٹی شامل کریں'
                  : 'Name Your New Vanity'}
            </DialogTitle>
            <DialogDescription>
              {isUr
                ? 'پہچان کے لیے باتھ روم یا کمرے کا نام لکھیں (مثلاً ماسٹر بیڈ، پاؤڈر روم)۔'
                : 'Give this vanity a clear name (e.g., Master Bed, Powder Room, GF Bath).'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="vanity-name">{isUr ? 'وینٹی کا نام' : 'Vanity Name'}</Label>
            <Input
              id="vanity-name"
              value={newVanityName}
              onChange={(e) => setNewVanityName(e.target.value)}
              placeholder={isUr ? 'مثلاً ماسٹر باتھ روم' : 'e.g., Master Bedroom'}
              autoFocus
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {isUr ? 'کینسل' : 'Cancel'}
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleAddOrRenameVanity}>
              {editingVanityNameId !== null
                ? isUr
                  ? 'نام محفوظ کریں'
                  : 'Save Name'
                : isUr
                  ? 'وینٹی شامل کریں'
                  : 'Add Vanity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

