'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  Layers,
  PanelBottom,
  Link2,
  X,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  AlignJustify,
  Sparkles,
  Footprints,
  Undo2,
  Redo2,
  Square,
  Columns2,
  Eye,
  Ruler,
} from 'lucide-react';
import {
  StairLayout,
  type StairSegment,
  type StepFlightSegment,
  type ChowkiSegment,
  type StairUnit,
  type FourSideEdges,
} from './stair-layout';
import { StairSideView, formatInchesToSutar } from './stair-side-view';
import {
  edgeProfiles,
  type ProfileType,
  type DimensionRow,
  type Winder,
} from './order-form';
import { useLanguage } from '@/context/language-context';
import { useCalculation } from '@/context/calculation-context';
import { cn } from '@/lib/utils';

interface StairDesignerProps {
  marble: Marble;
  variant: MarbleVariant;
  onSave: (data: { total: number; details: any; variant?: MarbleVariant }) => void;
  initialState?: any;
  onCancel: () => void;
}

type StairLocation = 'ground' | 'first' | 'basement' | 'other';
type MiniPanelType = 'latak' | 'riser' | 'edges' | null;
type StairViewMode = 'split' | 'plan' | 'side';

const LOCATION_OPTIONS: Array<{ id: StairLocation; en: string; ur: string }> = [
  { id: 'ground', en: 'Ground', ur: 'گراؤنڈ' },
  { id: 'first', en: 'First', ur: 'فرسٹ' },
  { id: 'basement', en: 'Basement', ur: 'بیسمنٹ' },
  { id: 'other', en: 'Other', ur: 'دیگر' },
];

const UNIT_OPTIONS: Array<{ id: StairUnit; label: string }> = [
  { id: 'inches', label: 'In' },
  { id: 'feet', label: 'Ft' },
  { id: 'cm', label: 'CM' },
];

let segIdCounter = 0;
function nextSegId(): number {
  segIdCounter += 1;
  return Date.now() + segIdCounter;
}

function convertVal(value: number, from: StairUnit, to: StairUnit): number {
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
}

function convertStr(valStr: string, from: StairUnit, to: StairUnit): string {
  if (!valStr) return '';
  const n = parseFloat(valStr);
  if (isNaN(n) || n <= 0) return valStr;
  return Number(convertVal(n, from, to).toFixed(to === 'inches' ? 3 : 2)).toString();
}

function toInches(valStr: string | undefined, unit: StairUnit): number {
  const n = parseFloat(valStr || '');
  if (isNaN(n) || n <= 0) return 0;
  if (unit === 'feet') return n * 12;
  if (unit === 'cm') return n / 2.54;
  if (unit === 'mm') return n / 25.4;
  return n;
}

function defaultChowkiRiserEdges(type: '1-step' | '2-step' | '3-step'): FourSideEdges {
  if (type === '1-step') {
    return { front: true, back: false, left: false, right: false, diag1: false, diag2: false };
  }
  if (type === '2-step') {
    return { front: true, back: false, left: false, right: false, diag1: true, diag2: false };
  }
  return { front: true, back: false, left: false, right: false, diag1: true, diag2: true };
}

function createStepFlight(
  unit: StairUnit,
  inheritLengthIn = 42,
  inheritWidthIn = 12,
  qty = 8,
  inheritRiserIn = 6.125
): StepFlightSegment {
  const c = (inc: number) =>
    Number(convertVal(inc, 'inches', unit).toFixed(unit === 'inches' ? 3 : 2)).toString();
  return {
    id: nextSegId(),
    kind: 'steps',
    length: c(inheritLengthIn),
    width: c(inheritWidthIn),
    quantity: String(qty),
    edges: { front: true, back: false, left: false, right: false },
    latak: { front: false, back: false, left: false, right: false, height: c(2) },
    riser: {
      enabled: true,
      height: c(inheritRiserIn),
      length: '',
      quantity: '',
      hasSkirting: false,
      skirtingType: 'one-sided',
      skirtingLength: '',
    },
  };
}

function createChowki(
  unit: StairUnit,
  inheritWidthIn = 42,
  inheritLengthIn = 42,
  turnDirection: 'left' | 'right' | 'straight' | 'u-left' | 'u-right' = 'right',
  winderType: '1-step' | '2-step' | '3-step' = '1-step',
  isMainLanding = false,
  inheritRiserIn = 6.125
): ChowkiSegment {
  const c = (inc: number) =>
    Number(convertVal(inc, 'inches', unit).toFixed(unit === 'inches' ? 3 : 2)).toString();
  return {
    id: nextSegId(),
    kind: 'chowki',
    width: c(inheritWidthIn),
    length: c(inheritLengthIn),
    winderType,
    turnDirection,
    isMainLanding,
    edges: { front: true, back: false, left: false, right: false, diag1: false, diag2: false },
    latak: { front: false, back: false, left: false, right: false, height: c(2) },
    riser: {
      enabled: true,
      height: c(inheritRiserIn),
      edges: defaultChowkiRiserEdges(winderType),
    },
  };
}

function hydrateInitialSegments(initialState: any, unit: StairUnit): StairSegment[] {
  if (Array.isArray(initialState?.stairSegments) && initialState.stairSegments.length > 0) {
    return initialState.stairSegments;
  }

  const hydrated: StairSegment[] = [];
  if (Array.isArray(initialState?.dimensionRows) && initialState.dimensionRows.length > 0) {
    initialState.dimensionRows.forEach((row: DimensionRow) => {
      if (!row) return;
      const c2 = Number(convertVal(2, 'inches', unit).toFixed(1)).toString();
      const c7 = Number(convertVal(7, 'inches', unit).toFixed(1)).toString();
      const rEnabled = Boolean(
        (parseFloat(row.riser?.width || '') > 0 && parseInt(row.riser?.quantity || '0', 10) > 0) ||
          row.riser?.front
      );
      hydrated.push({
        id: row.id || nextSegId(),
        kind: 'steps',
        length: row.length || '42',
        width: row.width || '12',
        quantity: row.quantity || '8',
        edges: {
          front: Boolean(row.edges?.bottom?.profiled || row.edges?.top?.profiled),
          back: Boolean(row.edges?.top?.profiled && row.edges?.bottom?.profiled),
          left: Boolean(row.edges?.left?.profiled),
          right: Boolean(row.edges?.right?.profiled),
        },
        latak: (row as any).latak || {
          front: false,
          back: false,
          left: false,
          right: false,
          height: c2,
        },
        riser: {
          enabled: rEnabled,
          height: row.riser?.width || row.riser?.height || c7,
          length: row.riser?.length || '',
          quantity: row.riser?.quantity || '',
          hasSkirting: Boolean(row.riser?.hasSkirting),
          skirtingType: row.riser?.skirtingType || 'one-sided',
          skirtingLength: row.riser?.skirtingLength || '',
        },
      });
    });
  }

  if (Array.isArray(initialState?.winders) && initialState.winders.length > 0) {
    initialState.winders.forEach((w: Winder) => {
      if (!w) return;
      const c2 = Number(convertVal(2, 'inches', unit).toFixed(1)).toString();
      const c7 = Number(convertVal(7, 'inches', unit).toFixed(1)).toString();
      hydrated.push({
        id: w.id || nextSegId(),
        kind: 'chowki',
        width: w.width || '42',
        length: w.length || '42',
        winderType: w.type || '1-step',
        turnDirection: w.turnDirection || 'right',
        edges: {
          front: Boolean(w.edges?.bottom),
          back: Boolean(w.edges?.top),
          left: Boolean(w.edges?.left),
          right: Boolean(w.edges?.right),
          diag1: Boolean(w.edges?.diag1),
          diag2: Boolean(w.edges?.diag2),
        },
        latak: (w as any).latak || {
          front: false,
          back: false,
          left: false,
          right: false,
          height: c2,
        },
        riser: {
          enabled: true,
          height: w.riserHeight || c7,
          edges: {
            front: Boolean(w.riserEdges?.bottom ?? true),
            back: Boolean(w.riserEdges?.top),
            left: Boolean(w.riserEdges?.left),
            right: Boolean(w.riserEdges?.right),
            diag1: Boolean(w.riserEdges?.diag1),
            diag2: Boolean(w.riserEdges?.diag2),
          },
        },
      });
    });
  }

  if (hydrated.length === 0) {
    return [createStepFlight(unit, 42, 12, 8)];
  }
  return hydrated;
}

export function StairDesigner({
  marble,
  variant,
  onSave,
  initialState,
  onCancel,
}: StairDesignerProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  const isUr = language === 'ur';

  const initialUnit: StairUnit = initialState?.selectedUnit || 'inches';
  const [selectedUnit, setSelectedUnit] = useState<StairUnit>(initialUnit);
  const [stairLocation, setStairLocation] = useState<StairLocation>(
    initialState?.stairLocation || 'ground'
  );
  const [customStairLocation, setCustomStairLocation] = useState<string>(
    initialState?.customStairLocation || ''
  );
  const [globalProfileType, setGlobalProfileType] = useState<ProfileType>(
    initialState?.globalProfileType || 'halfGola'
  );
  const [jointType, setJointType] = useState<ProfileType>(
    initialState?.jointType || 'litacGroove'
  );

  const [segments, setSegments] = useState<StairSegment[]>(() =>
    hydrateInitialSegments(initialState, initialUnit)
  );
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(() => {
    const init = hydrateInitialSegments(initialState, initialUnit);
    return init[0]?.id ?? null;
  });

  const [activePanel, setActivePanel] = useState<MiniPanelType>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<StairViewMode>('split');
  // Standard Pakistani marble stair deduction: 6 sutar marble (0.75") + 1 sutar slope (0.125") = 7 sutar (0.875")
  const [marbleThicknessSutar, setMarbleThicknessSutar] = useState<number>(
    typeof initialState?.marbleThicknessSutar === 'number' ? initialState.marbleThicknessSutar : 6
  );
  const [slopeSutar, setSlopeSutar] = useState<number>(
    typeof initialState?.slopeSutar === 'number' ? initialState.slopeSutar : 1
  );

  useEffect(() => {
    if (initialState) {
      const unit: StairUnit = initialState.selectedUnit || 'inches';
      const hydrated = hydrateInitialSegments(initialState, unit);
      setSelectedUnit(unit);
      setSegments(hydrated);
      setActiveSegmentId(hydrated[0]?.id ?? null);
      if (initialState.stairLocation) setStairLocation(initialState.stairLocation);
      if (initialState.customStairLocation !== undefined) {
        setCustomStairLocation(initialState.customStairLocation);
      }
      if (initialState.globalProfileType) {
        setGlobalProfileType(initialState.globalProfileType);
      }
      if (initialState.jointType) {
        setJointType(initialState.jointType);
      }
      if (typeof initialState.marbleThicknessSutar === 'number') {
        setMarbleThicknessSutar(initialState.marbleThicknessSutar);
      }
      if (typeof initialState.slopeSutar === 'number') {
        setSlopeSutar(initialState.slopeSutar);
      }
    }
  }, [initialState]);

  const activeSegment = useMemo(
    () => segments.find((s) => s.id === activeSegmentId) || segments[0] || null,
    [segments, activeSegmentId]
  );

  const handleUnitChange = useCallback(
    (toUnit: StairUnit) => {
      if (toUnit === selectedUnit) return;
      const fromUnit = selectedUnit;
      setSegments((prev) =>
        prev.map((seg) => {
          if (seg.kind === 'steps') {
            return {
              ...seg,
              length: convertStr(seg.length, fromUnit, toUnit),
              width: convertStr(seg.width, fromUnit, toUnit),
              latak: {
                ...seg.latak,
                height: convertStr(seg.latak.height, fromUnit, toUnit),
              },
              riser: {
                ...seg.riser,
                height: convertStr(seg.riser.height, fromUnit, toUnit),
                length: convertStr(seg.riser.length, fromUnit, toUnit),
                skirtingLength: convertStr(seg.riser.skirtingLength, fromUnit, toUnit),
              },
            };
          }
          return {
            ...seg,
            width: convertStr(seg.width, fromUnit, toUnit),
            length: convertStr(seg.length, fromUnit, toUnit),
            latak: {
              ...seg.latak,
              height: convertStr(seg.latak.height, fromUnit, toUnit),
            },
            riser: {
              ...seg.riser,
              height: convertStr(seg.riser.height, fromUnit, toUnit),
            },
          };
        })
      );
      setSelectedUnit(toUnit);
    },
    [selectedUnit]
  );

  const updateSegment = useCallback(
    (id: number, updater: (prev: StairSegment) => StairSegment) => {
      setSegments((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
    },
    []
  );

  const getLastRiserHeightIn = () => {
    for (let i = segments.length - 1; i >= 0; i--) {
      const h = toInches(segments[i].riser.height, selectedUnit);
      if (h > 0) return h;
    }
    return 6.125;
  };

  const addStepFlight = () => {
    // Inherit width/length/riser from last step flight or chowki for flush AutoCAD connection
    let inheritLengthIn = 42;
    let inheritWidthIn = 12;
    let foundStep = false;
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (seg.kind === 'steps') {
        inheritLengthIn = toInches(seg.length, selectedUnit) || 42;
        inheritWidthIn = toInches(seg.width, selectedUnit) || 12;
        foundStep = true;
        break;
      }
    }
    if (!foundStep && segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      if (lastSeg.kind === 'chowki') {
        const isU = lastSeg.turnDirection === 'u-right' || lastSeg.turnDirection === 'u-left';
        inheritLengthIn = isU
          ? toInches(lastSeg.length, selectedUnit) || 42
          : toInches(lastSeg.width, selectedUnit) || 42;
      }
    }
    const newSeg = createStepFlight(
      selectedUnit,
      inheritLengthIn,
      inheritWidthIn,
      8,
      getLastRiserHeightIn()
    );
    setSegments((prev) => [...prev, newSeg]);
    setActiveSegmentId(newSeg.id);
    setActivePanel(null);
  };

  const getLastFlightWidthIn = () => {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (seg.kind === 'steps') {
        return toInches(seg.length, selectedUnit) || 42;
      }
    }
    return 42;
  };

  // Full Staircase U-Turn Landing (سیڑھیوں کی چوکی — spans both flights with 4" stairwell gap)
  const addStairLanding = () => {
    const flightW = getLastFlightWidthIn();
    const landingW = flightW * 2 + 4; // 2 parallel flights + 4" center stairwell well
    const landingDepth = flightW;
    const newSeg = createChowki(
      selectedUnit,
      landingW,
      landingDepth,
      'u-right',
      '1-step',
      true,
      getLastRiserHeightIn()
    );
    setSegments((prev) => [...prev, newSeg]);
    setActiveSegmentId(newSeg.id);
    setActivePanel(null);
  };

  // 90-degree Corner Winder / Samosa Chowki (2-Step or 3-Step Winder)
  const addWinder = (winderType: '2-step' | '3-step') => {
    const flightW = getLastFlightWidthIn();
    const newSeg = createChowki(
      selectedUnit,
      flightW,
      flightW,
      'right',
      winderType,
      false,
      getLastRiserHeightIn()
    );
    setSegments((prev) => [...prev, newSeg]);
    setActiveSegmentId(newSeg.id);
    setActivePanel(null);
  };

  // Auto-reset all risers when user types Total Staircase Height on Side View
  // Formula: Net Riser = (Total Height / Total Steps) − Marble Thickness (6 sutar) − Slope (1 sutar)
  const handleTotalHeightChange = useCallback(
    (totalHeightInInches: number) => {
      const totalSteps = segments.reduce((acc, seg) => {
        if (seg.kind === 'steps') {
          const q = parseInt(seg.quantity, 10);
          return acc + Math.max(1, isNaN(q) ? 1 : q);
        }
        return acc + (seg.winderType === '3-step' ? 3 : seg.winderType === '2-step' ? 2 : 1);
      }, 0);
      if (totalSteps <= 0 || totalHeightInInches <= 0) return;

      const grossRiseIn = totalHeightInInches / totalSteps;
      const deductionIn = (marbleThicknessSutar + slopeSutar) / 8; // 6s marble + 1s slope = 7/8" = 0.875"
      const netRiserIn = Math.max(1, grossRiseIn - deductionIn);
      const formattedInUnit = Number(
        convertVal(netRiserIn, 'inches', selectedUnit).toFixed(selectedUnit === 'inches' ? 3 : 2)
      ).toString();

      setSegments((prev) =>
        prev.map((seg) => ({
          ...seg,
          riser: {
            ...seg.riser,
            enabled: true,
            height: formattedInUnit,
          } as any,
        }))
      );
    },
    [segments, marbleThicknessSutar, slopeSutar, selectedUnit]
  );

  const removeSegment = (id: number) => {
    if (segments.length <= 1) return;
    const next = segments.filter((s) => s.id !== id);
    setSegments(next);
    if (activeSegmentId === id) {
      setActiveSegmentId(next[0]?.id ?? null);
      setActivePanel(null);
    }
  };

  // Live area, latak, riser, edge polish, and total PKR calculations
  const calculations = useMemo(() => {
    let regularAreaIn = 0;
    let riserAreaIn = 0;
    let latakAreaIn = 0;
    let winder23AreaIn = 0;
    let chowkiFlatAreaIn = 0;
    let totalProfiledIn = 0;
    let totalLatakLenIn = 0;
    let totalStepsCount = 0;

    segments.forEach((seg) => {
      if (seg.kind === 'steps') {
        const len = toInches(seg.length, selectedUnit);
        const wid = toInches(seg.width, selectedUnit);
        const qty = Math.max(0, parseInt(seg.quantity, 10) || 0);
        totalStepsCount += qty;

        if (len > 0 && wid > 0 && qty > 0) {
          regularAreaIn += len * wid * qty;

          // 4-sided edge polish
          if (globalProfileType !== 'none') {
            let perStepEdge = 0;
            if (seg.edges.front) perStepEdge += len;
            if (seg.edges.back) perStepEdge += len;
            if (seg.edges.left) perStepEdge += wid;
            if (seg.edges.right) perStepEdge += wid;
            totalProfiledIn += perStepEdge * qty;
          }

          // 4-sided Latak (Front, Back, Left, Right)
          const lHeight = toInches(seg.latak.height, selectedUnit);
          if (lHeight > 0) {
            let perStepLatakLen = 0;
            if (seg.latak.front) perStepLatakLen += len;
            if (seg.latak.back) perStepLatakLen += len;
            if (seg.latak.left) perStepLatakLen += wid;
            if (seg.latak.right) perStepLatakLen += wid;
            if (perStepLatakLen > 0) {
              latakAreaIn += perStepLatakLen * lHeight * qty;
              totalLatakLenIn += perStepLatakLen * qty;
            }
          }
        }

        // Risers
        if (seg.riser.enabled) {
          const rH = toInches(seg.riser.height, selectedUnit);
          const rL = seg.riser.length
            ? toInches(seg.riser.length, selectedUnit)
            : len;
          const rQ = seg.riser.quantity
            ? Math.max(0, parseInt(seg.riser.quantity, 10) || 0)
            : qty;
          if (rH > 0 && rL > 0 && rQ > 0) {
            riserAreaIn += rH * rL * rQ;
          }
        }

        // Skirting
        if (seg.riser.hasSkirting) {
          const skLen = seg.riser.skirtingLength
            ? toInches(seg.riser.skirtingLength, selectedUnit)
            : wid;
          if (skLen > 0 && qty > 0) {
            const sides = seg.riser.skirtingType === 'two-sided' ? 2 : 1;
            riserAreaIn += skLen * 6 * sides * qty;
          }
        }
      } else {
        // Chowki / Winder
        const w = toInches(seg.width, selectedUnit);
        const l = toInches(seg.length, selectedUnit);
        const stepCount =
          seg.winderType === '3-step' ? 3 : seg.winderType === '2-step' ? 2 : 1;
        totalStepsCount += stepCount;

        if (w > 0 && l > 0) {
          const areaIn = w * l;
          const isUTurn = seg.turnDirection === 'u-right' || seg.turnDirection === 'u-left';
          if (seg.winderType === '1-step' || (isUTurn && seg.winderType === '2-step')) {
            chowkiFlatAreaIn += areaIn;
          } else {
            winder23AreaIn += areaIn;
          }

          const diag2 = isUTurn ? l : Math.sqrt(w * w + l * l);
          const diag3a = isUTurn
            ? Math.sqrt((0.22 * w) ** 2 + l * l)
            : Math.sqrt((0.58 * w) ** 2 + l * l);
          const diag3b = isUTurn
            ? Math.sqrt((0.22 * w) ** 2 + l * l)
            : Math.sqrt(w * w + (0.58 * l) ** 2);

          // Edge polish
          if (globalProfileType !== 'none') {
            if (seg.edges.front) totalProfiledIn += w;
            if (seg.edges.back) totalProfiledIn += w;
            if (seg.edges.left) totalProfiledIn += l;
            if (seg.edges.right) totalProfiledIn += l;
            if (seg.winderType === '2-step' && seg.edges.diag1) totalProfiledIn += diag2;
            if (seg.winderType === '3-step') {
              if (seg.edges.diag1) totalProfiledIn += diag3a;
              if (seg.edges.diag2) totalProfiledIn += diag3b;
            }
          }

          // 4-sided Latak on Chowki
          const lHeight = toInches(seg.latak.height, selectedUnit);
          if (lHeight > 0) {
            let chowkiLatakLen = 0;
            if (seg.latak.front) chowkiLatakLen += w;
            if (seg.latak.back) chowkiLatakLen += w;
            if (seg.latak.left) chowkiLatakLen += l;
            if (seg.latak.right) chowkiLatakLen += l;
            if (chowkiLatakLen > 0) {
              latakAreaIn += chowkiLatakLen * lHeight;
              totalLatakLenIn += chowkiLatakLen;
            }
          }

          // Chowki Risers
          if (seg.riser.enabled) {
            const rH = toInches(seg.riser.height, selectedUnit);
            if (rH > 0) {
              let rLen = 0;
              if (seg.riser.edges.front) rLen += w;
              if (seg.riser.edges.back) rLen += w;
              if (seg.riser.edges.left) rLen += l;
              if (seg.riser.edges.right) rLen += l;
              if (seg.winderType === '2-step' && seg.riser.edges.diag1) rLen += diag2;
              if (seg.winderType === '3-step') {
                if (seg.riser.edges.diag1) rLen += diag3a;
                if (seg.riser.edges.diag2) rLen += diag3b;
              }
              riserAreaIn += rLen * rH;
            }
          }
        }
      }
    });

    const regularSqFt = (regularAreaIn + chowkiFlatAreaIn) / 144;
    const riserSqFt = riserAreaIn / 144;
    const latakSqFt = latakAreaIn / 144;
    const winderSqFt = winder23AreaIn / 144;

    const totalSqFt = regularSqFt + riserSqFt + latakSqFt + winderSqFt;
    const wastagePct = (costs.wastagePercentage || 15) / 100;
    const wastage = (regularSqFt + riserSqFt + latakSqFt) * wastagePct + winderSqFt * 0.3;
    const finalSqFt = totalSqFt + wastage;

    const marbleTotal = finalSqFt * (variant.price ?? 0);

    const profileRft = totalProfiledIn / 12;
    const profileObj = edgeProfiles[globalProfileType];
    const profilePrice =
      costs.edgeProfilePrices[globalProfileType as keyof typeof costs.edgeProfilePrices] ??
      profileObj?.price ??
      0;
    const edgeCost = profileRft * profilePrice;

    const latakRft = totalLatakLenIn / 12;
    const jointObj = edgeProfiles[jointType];
    const jointPrice =
      costs.edgeProfilePrices[jointType as keyof typeof costs.edgeProfilePrices] ??
      jointObj?.price ??
      0;
    const latakJointCost = latakRft * jointPrice;

    const grandTotal = marbleTotal + edgeCost + latakJointCost;

    return {
      totalSqFt,
      wastage,
      finalSqFt,
      marbleTotal,
      profileRft,
      edgeCost,
      latakSqFt,
      latakRft,
      latakJointCost,
      grandTotal,
      totalStepsCount,
    };
  }, [
    segments,
    selectedUnit,
    globalProfileType,
    jointType,
    variant.price,
    costs,
  ]);

  const handleSave = () => {
    // Map segments back into dimensionRows + winders for 100% print/quotation compatibility
    const dimensionRows: DimensionRow[] = [];
    const winders: Winder[] = [];

    segments.forEach((seg) => {
      if (seg.kind === 'steps') {
        const effRiserLen = seg.riser.length || seg.length;
        const effRiserQty = seg.riser.quantity || seg.quantity;
        dimensionRows.push({
          id: seg.id,
          length: seg.length,
          width: seg.width,
          quantity: seg.quantity,
          edges: {
            top: { profiled: seg.edges.back },
            bottom: { profiled: seg.edges.front },
            left: { profiled: seg.edges.left },
            right: { profiled: seg.edges.right },
          },
          riser: {
            front: seg.riser.enabled,
            left: seg.latak.left,
            right: seg.latak.right,
            height: seg.riser.height,
            width: seg.riser.enabled ? seg.riser.height : '',
            length: seg.riser.enabled ? effRiserLen : '',
            quantity: seg.riser.enabled ? effRiserQty : '',
            hasSkirting: seg.riser.hasSkirting,
            skirtingType: seg.riser.skirtingType,
            skirtingLength: seg.riser.skirtingLength || seg.width,
          },
          ...( { latak: seg.latak } as any ),
        });
      } else {
        winders.push({
          id: seg.id,
          width: seg.width,
          length: seg.length,
          type: seg.winderType,
          turnDirection: seg.turnDirection === 'left' ? 'left' : 'right',
          edges: {
            top: seg.edges.back,
            bottom: seg.edges.front,
            left: seg.edges.left,
            right: seg.edges.right,
            diag1: Boolean(seg.edges.diag1),
            diag2: Boolean(seg.edges.diag2),
            inner_v: false,
            inner_h: false,
          },
          riserEdges: {
            top: seg.riser.enabled && seg.riser.edges.back,
            bottom: seg.riser.enabled && seg.riser.edges.front,
            left: seg.riser.enabled && seg.riser.edges.left,
            right: seg.riser.enabled && seg.riser.edges.right,
            diag1: seg.riser.enabled && Boolean(seg.riser.edges.diag1),
            diag2: seg.riser.enabled && Boolean(seg.riser.edges.diag2),
            inner_v: false,
            inner_h: false,
          },
          riserHeight: seg.riser.height,
          ...({
            latak: seg.latak,
            isMainLanding: Boolean(
              seg.isMainLanding ||
                seg.turnDirection === 'u-right' ||
                seg.turnDirection === 'u-left'
            ),
          } as any),
        });
      }
    });

    const edgeProfilingCosts: Record<string, { rft: number; cost: number }> = {
      [globalProfileType]: {
        rft: calculations.profileRft,
        cost: calculations.edgeCost,
      },
    };
    if (calculations.latakRft > 0 && calculations.latakJointCost > 0) {
      edgeProfilingCosts[jointType] = {
        rft: calculations.latakRft,
        cost: calculations.latakJointCost,
      };
    }

    const deductionIn = (marbleThicknessSutar + slopeSutar) / 8;
    const totalStairHeightIn = segments.reduce((sum, seg) => {
      const rIn = Math.max(1, toInches(seg.riser.height, selectedUnit) || 6.125);
      const count =
        seg.kind === 'steps'
          ? Math.max(1, parseInt(seg.quantity, 10) || 1)
          : seg.winderType === '3-step'
            ? 3
            : seg.winderType === '2-step'
              ? 2
              : 1;
      return sum + count * (rIn + deductionIn);
    }, 0);

    onSave({
      total: calculations.grandTotal,
      details: {
        totalSqFt: calculations.totalSqFt,
        wastage: calculations.wastage,
        finalSqFt: calculations.finalSqFt,
        marbleTotal: calculations.marbleTotal,
        rate: variant.price ?? 0,
        dimensionRows,
        windowSillRows: [],
        winders,
        stairSegments: segments,
        globalProfileType,
        jointType,
        edgeProfilingCosts,
        latakTotalSqFt: calculations.latakSqFt,
        latakRft: calculations.latakRft,
        latakJointCost: calculations.latakJointCost,
        innerCutCost: 0,
        innerCutRft: 0,
        wastagePercentage: costs.wastagePercentage,
        selectedUnit,
        stairLocation,
        customStairLocation,
        marbleThicknessSutar,
        slopeSutar,
        totalStairHeightIn,
      },
      variant,
    });
  };

  const cleanNum = (val: string) => val.replace(/[^0-9.]/g, '');
  const cleanInt = (val: string) => val.replace(/[^0-9]/g, '');

  const unitShort =
    selectedUnit === 'inches' ? '"' : selectedUnit === 'feet' ? "'" : ` ${selectedUnit}`;
  const unitText =
    selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit;

  // Compact summaries for Left Dock buttons
  const latakSummary = useMemo(() => {
    if (!activeSegment) return isUr ? 'آف' : 'Off';
    const l = activeSegment.latak;
    const sides: string[] = [];
    if (l.front) sides.push(isUr ? 'سامنے' : 'F');
    if (l.back) sides.push(isUr ? 'پیچھے' : 'B');
    if (l.left) sides.push(isUr ? 'بائیں' : 'L');
    if (l.right) sides.push(isUr ? 'دائیں' : 'R');
    if (sides.length === 0) return isUr ? 'آف' : 'Off';
    return `${sides.join('·')} ${l.height}${unitShort}`;
  }, [activeSegment, isUr, unitShort]);

  const riserSummary = useMemo(() => {
    if (!activeSegment) return isUr ? 'آف' : 'Off';
    if (!activeSegment.riser.enabled) return isUr ? 'آف' : 'Off';
    if (activeSegment.kind === 'steps') {
      const q = activeSegment.riser.quantity || activeSegment.quantity;
      return `${activeSegment.riser.height}${unitShort} × ${q}`;
    }
    const r = activeSegment.riser.edges;
    const count =
      (r.front ? 1 : 0) +
      (r.back ? 1 : 0) +
      (r.left ? 1 : 0) +
      (r.right ? 1 : 0) +
      (r.diag1 ? 1 : 0) +
      (r.diag2 ? 1 : 0);
    return count > 0 ? `${activeSegment.riser.height}${unitShort} (${count})` : isUr ? 'آف' : 'Off';
  }, [activeSegment, isUr, unitShort]);

  const polishSidesSummary = useMemo(() => {
    if (!activeSegment || globalProfileType === 'none') return isUr ? 'آف' : 'Off';
    const e = activeSegment.edges;
    const sides: string[] = [];
    if (e.front) sides.push(isUr ? 'سامنے' : 'F');
    if (e.back) sides.push(isUr ? 'پیچھے' : 'B');
    if (e.left) sides.push(isUr ? 'بائیں' : 'L');
    if (e.right) sides.push(isUr ? 'دائیں' : 'R');
    if (activeSegment.kind === 'chowki' && activeSegment.winderType !== '1-step') {
      if (e.diag1) sides.push('D1');
      if (activeSegment.winderType === '3-step' && e.diag2) sides.push('D2');
    }
    return sides.length > 0 ? sides.join('·') : isUr ? 'آف' : 'Off';
  }, [activeSegment, globalProfileType, isUr]);

  const hasAnyLatak = Boolean(
    activeSegment &&
      (activeSegment.latak.front ||
        activeSegment.latak.back ||
        activeSegment.latak.left ||
        activeSegment.latak.right)
  );

  // Segment sequence numbering labels (Step 1, Stair Landing 1, Corner Chowki 1, Step 2...)
  const segmentLabels = useMemo(() => {
    let stepIdx = 0;
    let landingIdx = 0;
    let chowkiIdx = 0;
    return segments.map((s) => {
      if (s.kind === 'steps') {
        stepIdx += 1;
        return {
          id: s.id,
          title: isUr ? `سٹیپ ${stepIdx}` : `Step ${stepIdx}`,
          badge: `${s.quantity || 0}×`,
        };
      }
      const isU = s.turnDirection === 'u-right' || s.turnDirection === 'u-left';
      const turnArrow =
        s.turnDirection === 'u-right'
          ? '↷'
          : s.turnDirection === 'u-left'
            ? '↶'
            : s.turnDirection === 'right'
              ? '↱'
              : s.turnDirection === 'left'
                ? '↰'
                : '↑';
      if (isU || s.isMainLanding) {
        landingIdx += 1;
        return {
          id: s.id,
          title: isUr ? `سیڑھی چوکی ${landingIdx}` : `Landing ${landingIdx}`,
          badge: `${turnArrow} ${s.winderType.replace('-step', 'S')}`,
        };
      }
      chowkiIdx += 1;
      return {
        id: s.id,
        title: isUr ? `کونا چوکی ${chowkiIdx}` : `Winder ${chowkiIdx}`,
        badge: `${turnArrow} ${s.winderType.replace('-step', 'S')}`,
      };
    });
  }, [segments, isUr]);

  return (
    <div className="flex flex-col w-full">
      {/* Unified White Full-Stage AutoCAD Staircase Diagram with All Compact Controls Inside (Top, Left, Right, Center, Bottom) */}
      <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white text-slate-900 overflow-hidden shadow-sm min-h-[540px] sm:min-h-[600px] lg:min-h-[650px]">
        {/* TOP INSIDE BAR: Stair Location + Instant Units + Zoom */}
        <div
          data-guide-step="1"
          className="relative z-20 flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-200"
        >
          {/* Stair Location Segmented Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
              {LOCATION_OPTIONS.map((loc) => {
                const active = stairLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setStairLocation(loc.id)}
                    className={cn(
                      'h-7 px-2 sm:px-2.5 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {isUr ? loc.ur : loc.en}
                  </button>
                );
              })}
            </div>
            {stairLocation === 'other' && (
              <Input
                value={customStairLocation}
                onChange={(e) => setCustomStairLocation(e.target.value)}
                placeholder={isUr ? 'منزل لکھیں...' : 'Location...'}
                className="h-7 w-28 px-2 text-[11px] font-semibold bg-white border-slate-300"
              />
            )}
          </div>

          {/* Center of Top Bar: AutoCAD View Mode Switcher (Both / Top Plan / Side View) */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
            {(
              [
                { id: 'split', icon: Columns2, en: 'Plan + Side', ur: 'ٹاپ + سائیڈ' },
                { id: 'plan', icon: Eye, en: 'Top Plan', ur: 'ٹاپ نقشہ' },
                { id: 'side', icon: Ruler, en: 'Side View', ur: 'سائیڈ ویو' },
              ] as const
            ).map((m) => {
              const active = viewMode === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={cn(
                    'h-7 px-2 rounded-md text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{isUr ? m.ur : m.en}</span>
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
                onClick={() => setZoomLevel((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
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

        {/* MAIN WHITE EXPANSIVE AUTOCAD DIAGRAM STAGE WITH LEFT, RIGHT & CENTER INSIDE OVERLAYS */}
        <div
          className={cn(
            'relative flex-1 bg-white overflow-hidden',
            viewMode === 'split'
              ? 'min-h-[520px] md:min-h-[490px] lg:min-h-[530px]'
              : 'min-h-[400px] sm:min-h-[465px] lg:min-h-[520px]'
          )}
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Quiet AutoCAD Color Legend at Top Center */}
          <div className="pointer-events-none absolute top-1 inset-x-0 z-10 flex items-center justify-center gap-3 px-3 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="w-2.5 h-0.5 bg-red-600 inline-block rounded-full" />
              {isUr ? 'گولہ/پالش' : 'Polish'}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="w-2.5 h-1.5 bg-blue-600/35 border border-blue-700 inline-block rounded-[1px]" />
              {isUr ? 'لٹک (4 سائیڈ)' : '4-Side Latak'}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="w-3 border-t-2 border-dashed border-amber-600 inline-block" />
              {isUr ? 'رائزر' : 'Riser'}
            </span>
          </div>

          {/* MAXIMIZED LIVE AUTOCAD STAIRCASE SVG BLUEPRINT (Plan / Side Elevation / Split) */}
          <div className="absolute inset-0 flex items-stretch justify-center px-[86px] sm:px-[112px] pt-6 pb-11">
            {viewMode === 'plan' && (
              <div className="w-full h-full">
                <StairLayout
                  segments={segments}
                  activeSegmentId={activeSegment?.id ?? null}
                  onSelectSegment={(id) => setActiveSegmentId(id)}
                  marbleImageUrl={marble.imageUrl}
                  zoom={zoomLevel}
                  unit={selectedUnit}
                  hasEdgeProfile={globalProfileType !== 'none'}
                  isUr={isUr}
                />
              </div>
            )}

            {viewMode === 'side' && (
              <div className="w-full h-full">
                <StairSideView
                  segments={segments}
                  activeSegmentId={activeSegment?.id ?? null}
                  onSelectSegment={(id) => setActiveSegmentId(id)}
                  unit={selectedUnit}
                  zoom={zoomLevel}
                  hasEdgeProfile={globalProfileType !== 'none'}
                  isUr={isUr}
                  marbleThicknessSutar={marbleThicknessSutar}
                  slopeSutar={slopeSutar}
                  onTotalHeightChange={handleTotalHeightChange}
                />
              </div>
            )}

            {viewMode === 'split' && (
              <div className="w-full h-full flex flex-col md:flex-row gap-2 min-h-0">
                {/* Left / Top Pane: Top-Down AutoCAD Plan */}
                <div className="relative flex-1 min-h-0 min-w-0 flex flex-col">
                  <span className="pointer-events-none absolute top-0.5 left-1 z-10 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 bg-white/85 px-1.5 py-0.5 rounded">
                    {isUr ? 'ٹاپ پلان (PLAN)' : 'TOP PLAN'}
                  </span>
                  <div className="flex-1 min-h-0 w-full">
                    <StairLayout
                      segments={segments}
                      activeSegmentId={activeSegment?.id ?? null}
                      onSelectSegment={(id) => setActiveSegmentId(id)}
                      marbleImageUrl={marble.imageUrl}
                      zoom={zoomLevel}
                      unit={selectedUnit}
                      hasEdgeProfile={globalProfileType !== 'none'}
                      isUr={isUr}
                    />
                  </div>
                </div>

                {/* Subtle AutoCAD Section Divider */}
                <div className="shrink-0 border-t md:border-t-0 md:border-l border-dashed border-slate-300" />

                {/* Right / Bottom Pane: AutoCAD Side Elevation View with Total Height & Net Riser */}
                <div className="relative flex-1 min-h-0 min-w-0 flex flex-col">
                  <StairSideView
                    segments={segments}
                    activeSegmentId={activeSegment?.id ?? null}
                    onSelectSegment={(id) => setActiveSegmentId(id)}
                    unit={selectedUnit}
                    zoom={zoomLevel}
                    hasEdgeProfile={globalProfileType !== 'none'}
                    isUr={isUr}
                    marbleThicknessSutar={marbleThicknessSutar}
                    slopeSutar={slopeSutar}
                    onTotalHeightChange={handleTotalHeightChange}
                    compact
                  />
                </div>
              </div>
            )}
          </div>

          {/* LEFT INSIDE DOCK: Edge Style, Polish Sides, 4-Side Latak, Riser (4 compact buttons) */}
          {activeSegment && (
            <div className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[76px] sm:w-[98px]">
              {/* Edge Polish Style Picker */}
              <Select
                value={globalProfileType}
                onValueChange={(v) => setGlobalProfileType(v as ProfileType)}
              >
                <SelectTrigger
                  aria-label={isUr ? 'کنارے کی پالش' : 'Edge Polish Style'}
                  className="h-auto min-h-[40px] px-1.5 py-1 bg-white/95 text-slate-900 border-slate-200 shadow-sm text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 [&>svg]:hidden cursor-pointer hover:border-amber-500/80"
                >
                  <span className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold whitespace-nowrap">
                    <Layers className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                    {isUr ? 'گولہ' : 'Edge'}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-[66px] sm:max-w-[86px] leading-tight">
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

              {/* Polish Sides Toggle (Front / Back / Left / Right) */}
              <button
                type="button"
                onClick={() => setActivePanel((p) => (p === 'edges' ? null : 'edges'))}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-1 min-h-[40px] rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePanel === 'edges'
                    ? 'bg-red-600 text-white border-red-700 font-extrabold'
                    : polishSidesSummary !== (isUr ? 'آف' : 'Off')
                      ? 'bg-red-50 text-slate-900 border-red-300 hover:bg-red-100'
                      : 'bg-white/95 text-slate-800 border-slate-200 hover:border-red-400'
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight whitespace-nowrap">
                  <Sparkles className="h-2.5 w-2.5 shrink-0" />
                  {isUr ? 'کنارے' : 'Polish'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 truncate max-w-full',
                    activePanel === 'edges' ? 'text-white/95' : 'text-red-700'
                  )}
                >
                  {polishSidesSummary}
                </span>
              </button>

              {/* 4-Sided Latak (Front / Back / Left / Right) Toggle */}
              <button
                type="button"
                onClick={() => setActivePanel((p) => (p === 'latak' ? null : 'latak'))}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-1 min-h-[40px] rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePanel === 'latak'
                    ? 'bg-blue-600 text-white border-blue-700 font-extrabold'
                    : hasAnyLatak
                      ? 'bg-blue-50 text-slate-900 border-blue-400 hover:bg-blue-100'
                      : 'bg-white/95 text-slate-800 border-slate-200 hover:border-blue-400'
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight whitespace-nowrap">
                  <PanelBottom className="h-2.5 w-2.5 shrink-0" />
                  {isUr ? 'لٹک' : 'Latak'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 truncate max-w-full',
                    activePanel === 'latak' ? 'text-white/95' : 'text-blue-700'
                  )}
                >
                  {latakSummary}
                </span>
              </button>

              {/* Riser & Skirting Toggle */}
              <button
                type="button"
                onClick={() => setActivePanel((p) => (p === 'riser' ? null : 'riser'))}
                className={cn(
                  'flex flex-col items-center justify-center px-1.5 py-1 min-h-[40px] rounded-lg border text-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activePanel === 'riser'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                    : activeSegment.riser.enabled
                      ? 'bg-amber-50 text-slate-900 border-amber-400 hover:bg-amber-100'
                      : 'bg-white/95 text-slate-800 border-slate-200 hover:border-amber-500/70'
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight whitespace-nowrap">
                  <AlignJustify className="h-2.5 w-2.5 shrink-0" />
                  {isUr ? 'رائزر' : 'Riser'}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-mono tabular-nums mt-0.5 truncate max-w-full',
                    activePanel === 'riser' ? 'text-slate-900' : 'text-amber-700'
                  )}
                >
                  {riserSummary}
                </span>
              </button>
            </div>
          )}

          {/* RIGHT INSIDE DOCK: + Step, + Stair Landing, + 2S Winder, + 3S Winder, Joint */}
          <div
            data-guide-step="3"
            className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 w-[80px] sm:w-[104px]"
          >
            <button
              type="button"
              onClick={addStepFlight}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-slate-300 bg-white/95 text-slate-900 hover:border-amber-500 hover:bg-amber-50 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3 text-amber-600 shrink-0" />
              <span>{isUr ? 'سٹیپ' : 'Step'}</span>
            </button>

            <button
              type="button"
              onClick={addStairLanding}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-indigo-300 bg-indigo-50/95 text-indigo-800 hover:bg-indigo-100 text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <Square className="h-2.5 w-2.5 shrink-0" />
              <span>{isUr ? '+ سیڑھی چوکی' : '+ Landing'}</span>
            </button>

            <button
              type="button"
              onClick={() => addWinder('2-step')}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-blue-200 bg-white/95 text-blue-700 hover:bg-blue-50 text-[10px] sm:text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <CornerUpRight className="h-3 w-3 shrink-0" />
              <span>{isUr ? '+ 2-سٹیپ ونڈر' : '+ 2S Winder'}</span>
            </button>

            <button
              type="button"
              onClick={() => addWinder('3-step')}
              className="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg border border-sky-300 bg-sky-50/95 text-sky-800 hover:bg-sky-100 text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap shadow-sm transition-colors cursor-pointer"
            >
              <CornerUpRight className="h-3 w-3 shrink-0" />
              <span>{isUr ? '+ 3-سٹیپ ونڈر' : '+ 3S Winder'}</span>
            </button>

            {/* Latak Jointing Style Picker */}
            <Select
              value={jointType}
              onValueChange={(v) => setJointType(v as ProfileType)}
            >
              <SelectTrigger
                aria-label={isUr ? 'لٹک جوڑ' : 'Latak Joint Type'}
                className="h-auto min-h-[42px] px-1.5 py-1.5 bg-white/95 text-slate-900 border-slate-200 shadow-sm text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 [&>svg]:hidden cursor-pointer hover:border-amber-500/80"
              >
                <span className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold whitespace-nowrap">
                  <Link2 className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                  {isUr ? 'جوڑ' : 'Joint'}
                </span>
                <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-[66px] sm:max-w-[86px] leading-tight">
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

          {/* FLOATING CENTER MINI-EDITOR #1: 4-SIDED LATAK (Front, Back, Left, Right + Height) */}
          {activeSegment && activePanel === 'latak' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[360px] max-w-[380px] rounded-xl border border-blue-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-800 whitespace-nowrap">
                  <PanelBottom className="h-3.5 w-3.5 text-blue-600" />
                  {isUr ? 'چاروں سائیڈ لٹک (Latak)' : '4-Sided Latak (Front / Back / Left / Right)'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const allOn =
                        activeSegment.latak.front &&
                        activeSegment.latak.back &&
                        activeSegment.latak.left &&
                        activeSegment.latak.right;
                      updateSegment(activeSegment.id, (prev) => ({
                        ...prev,
                        latak: {
                          ...prev.latak,
                          front: !allOn,
                          back: !allOn,
                          left: !allOn,
                          right: !allOn,
                        },
                      }));
                    }}
                    className="h-6 px-1.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer whitespace-nowrap"
                  >
                    {isUr ? 'چاروں' : 'All 4'}
                  </button>
                  <button
                    type="button"
                    aria-label="Close latak editor"
                    onClick={() => setActivePanel(null)}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(['front', 'back', 'left', 'right'] as const).map((side) => {
                  const checked = activeSegment.latak[side];
                  const label =
                    side === 'front'
                      ? isUr
                        ? 'سامنے'
                        : 'Front'
                      : side === 'back'
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
                      onClick={() =>
                        updateSegment(activeSegment.id, (prev) => ({
                          ...prev,
                          latak: { ...prev.latak, [side]: !checked },
                        }))
                      }
                      className={cn(
                        'h-7 rounded-md border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap',
                        checked
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <span>{isUr ? 'لٹک اونچائی' : 'Latak Height'}</span>
                  <Input
                    value={activeSegment.latak.height}
                    onChange={(e) =>
                      updateSegment(activeSegment.id, (prev) => ({
                        ...prev,
                        latak: { ...prev.latak, height: cleanNum(e.target.value) },
                      }))
                    }
                    inputMode="decimal"
                    className="h-7 w-16 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                  />
                  <span className="text-[10px] text-slate-500">{unitText}</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isUr ? 'نیلی لکیر = لٹک' : 'Blue strip = Latak'}
                </span>
              </div>
            </div>
          )}

          {/* FLOATING CENTER MINI-EDITOR #2: RISER & SKIRTING */}
          {activeSegment && activePanel === 'riser' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[360px] max-w-[385px] rounded-xl border border-amber-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 whitespace-nowrap">
                  <AlignJustify className="h-3.5 w-3.5 text-amber-600" />
                  {isUr ? 'رائزر اور اسکرٹنگ' : 'Riser & Wall Skirting'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateSegment(activeSegment.id, (prev) => ({
                        ...prev,
                        riser: { ...prev.riser, enabled: !prev.riser.enabled } as any,
                      }))
                    }
                    className={cn(
                      'h-6 px-2 rounded text-[10px] font-bold border cursor-pointer whitespace-nowrap',
                      activeSegment.riser.enabled
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    {activeSegment.riser.enabled
                      ? isUr
                        ? 'آن (ON)'
                        : 'ON'
                      : isUr
                        ? 'آف (OFF)'
                        : 'OFF'}
                  </button>
                  <button
                    type="button"
                    aria-label="Close riser editor"
                    onClick={() => setActivePanel(null)}
                    className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {activeSegment.kind === 'steps' ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                      <span>{isUr ? 'اونچائی' : 'H'}</span>
                      <Input
                        value={activeSegment.riser.height}
                        onChange={(e) =>
                          updateSegment(activeSegment.id, (prev) =>
                            prev.kind === 'steps'
                              ? {
                                  ...prev,
                                  riser: { ...prev.riser, enabled: true, height: cleanNum(e.target.value) },
                                }
                              : prev
                          )
                        }
                        inputMode="decimal"
                        className="h-7 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                      <span>{isUr ? 'لمبائی' : 'L'}</span>
                      <Input
                        value={activeSegment.riser.length}
                        placeholder={activeSegment.length}
                        onChange={(e) =>
                          updateSegment(activeSegment.id, (prev) =>
                            prev.kind === 'steps'
                              ? {
                                  ...prev,
                                  riser: { ...prev.riser, enabled: true, length: cleanNum(e.target.value) },
                                }
                              : prev
                          )
                        }
                        inputMode="decimal"
                        className="h-7 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                      <span>{isUr ? 'تعداد' : 'Qty'}</span>
                      <Input
                        value={activeSegment.riser.quantity}
                        placeholder={activeSegment.quantity}
                        onChange={(e) =>
                          updateSegment(activeSegment.id, (prev) =>
                            prev.kind === 'steps'
                              ? {
                                  ...prev,
                                  riser: { ...prev.riser, enabled: true, quantity: cleanInt(e.target.value) },
                                }
                              : prev
                          )
                        }
                        inputMode="numeric"
                        className="h-7 w-12 px-1 text-xs font-extrabold tabular-nums text-center bg-white"
                      />
                    </label>
                  </div>

                  {/* Skirting Toggle Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                      {isUr ? 'اسکرٹنگ:' : 'Skirting:'}
                    </span>
                    {(['off', 'one-sided', 'two-sided'] as const).map((sk) => {
                      const active =
                        sk === 'off'
                          ? !activeSegment.riser.hasSkirting
                          : activeSegment.riser.hasSkirting &&
                            activeSegment.riser.skirtingType === sk;
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) =>
                              prev.kind === 'steps'
                                ? {
                                    ...prev,
                                    riser: {
                                      ...prev.riser,
                                      hasSkirting: sk !== 'off',
                                      skirtingType:
                                        sk === 'two-sided' ? 'two-sided' : 'one-sided',
                                    },
                                  }
                                : prev
                            )
                          }
                          className={cn(
                            'h-6 px-2 rounded border text-[10px] font-bold cursor-pointer whitespace-nowrap',
                            active
                              ? 'bg-teal-600 text-white border-teal-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          {sk === 'off'
                            ? isUr
                              ? 'نہیں'
                              : 'Off'
                            : sk === 'one-sided'
                              ? isUr
                                ? '1 سائیڈ'
                                : '1-Side'
                              : isUr
                                ? '2 سائیڈ'
                                : '2-Side'}
                        </button>
                      );
                    })}
                    {activeSegment.riser.hasSkirting && (
                      <Input
                        value={activeSegment.riser.skirtingLength}
                        placeholder={activeSegment.width}
                        onChange={(e) =>
                          updateSegment(activeSegment.id, (prev) =>
                            prev.kind === 'steps'
                              ? {
                                  ...prev,
                                  riser: {
                                    ...prev.riser,
                                    skirtingLength: cleanNum(e.target.value),
                                  },
                                }
                              : prev
                          )
                        }
                        inputMode="decimal"
                        aria-label="Skirting length"
                        className="h-6 w-14 px-1 text-[11px] font-bold tabular-nums text-center bg-white ml-auto"
                      />
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Chowki Riser Sides + Height */}
                  <div className="grid grid-cols-4 gap-1">
                    {(['front', 'back', 'left', 'right'] as const).map((side) => {
                      const checked = activeSegment.riser.edges[side];
                      const label =
                        side === 'front'
                          ? isUr
                            ? 'سامنے'
                            : 'Front'
                          : side === 'back'
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
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) =>
                              prev.kind === 'chowki'
                                ? {
                                    ...prev,
                                    riser: {
                                      ...prev.riser,
                                      enabled: true,
                                      edges: { ...prev.riser.edges, [side]: !checked },
                                    },
                                  }
                                : prev
                            )
                          }
                          className={cn(
                            'h-7 rounded-md border text-[11px] font-bold cursor-pointer whitespace-nowrap',
                            checked
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {activeSegment.winderType !== '1-step' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) =>
                              prev.kind === 'chowki'
                                ? {
                                    ...prev,
                                    riser: {
                                      ...prev.riser,
                                      enabled: true,
                                      edges: {
                                        ...prev.riser.edges,
                                        diag1: !prev.riser.edges.diag1,
                                      },
                                    },
                                  }
                                : prev
                            )
                          }
                          className={cn(
                            'h-6 px-2 rounded border text-[10px] font-bold cursor-pointer',
                            activeSegment.riser.edges.diag1
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          {isUr ? 'ترچھا 1' : 'Diag 1'}
                        </button>
                      )}
                      {activeSegment.winderType === '3-step' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) =>
                              prev.kind === 'chowki'
                                ? {
                                    ...prev,
                                    riser: {
                                      ...prev.riser,
                                      enabled: true,
                                      edges: {
                                        ...prev.riser.edges,
                                        diag2: !prev.riser.edges.diag2,
                                      },
                                    },
                                  }
                                : prev
                            )
                          }
                          className={cn(
                            'h-6 px-2 rounded border text-[10px] font-bold cursor-pointer',
                            activeSegment.riser.edges.diag2
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          {isUr ? 'ترچھا 2' : 'Diag 2'}
                        </button>
                      )}
                    </div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 ml-auto">
                      <span>{isUr ? 'اونچائی' : 'H'}</span>
                      <Input
                        value={activeSegment.riser.height}
                        onChange={(e) =>
                          updateSegment(activeSegment.id, (prev) =>
                            prev.kind === 'chowki'
                              ? {
                                  ...prev,
                                  riser: { ...prev.riser, height: cleanNum(e.target.value) },
                                }
                              : prev
                          )
                        }
                        inputMode="decimal"
                        className="h-7 w-14 px-1.5 text-xs font-extrabold tabular-nums text-center bg-white"
                      />
                      <span className="text-[10px] text-slate-500">{unitText}</span>
                    </label>
                  </div>
                </>
              )}

              {/* Sutar Deduction Strip inside Riser Editor (6 Sutar Marble + 1 Sutar Slope) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-amber-200/70 text-[10px] font-bold text-slate-600">
                <div className="flex items-center gap-1">
                  <span>{isUr ? 'ماربل:' : 'Marble:'}</span>
                  {[6, 7, 8].map((sv) => (
                    <button
                      key={sv}
                      type="button"
                      onClick={() => setMarbleThicknessSutar(sv)}
                      className={cn(
                        'h-5 px-1.5 rounded border text-[9.5px] font-extrabold cursor-pointer',
                        marbleThicknessSutar === sv
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {sv} {isUr ? 'سوتر' : 's'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span>{isUr ? 'سلوپ:' : 'Slope:'}</span>
                  {[0, 1, 2].map((sl) => (
                    <button
                      key={sl}
                      type="button"
                      onClick={() => setSlopeSutar(sl)}
                      className={cn(
                        'h-5 px-1.5 rounded border text-[9.5px] font-extrabold cursor-pointer',
                        slopeSutar === sl
                          ? 'bg-teal-600 text-white border-teal-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {sl} {isUr ? 'سوتر' : 's'}
                    </button>
                  ))}
                </div>
                {selectedUnit === 'inches' && toInches(activeSegment.riser.height, selectedUnit) > 0 && (
                  <span className="text-[9.5px] font-mono font-extrabold text-amber-800 ml-auto">
                    {formatInchesToSutar(toInches(activeSegment.riser.height, selectedUnit), isUr)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* FLOATING CENTER MINI-EDITOR #3: POLISH EDGES (Front / Back / Left / Right + Diagonals) */}
          {activeSegment && activePanel === 'edges' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 bottom-12 -translate-x-1/2 z-30 w-[calc(100%-164px)] sm:w-[350px] max-w-[370px] rounded-xl border border-red-400 bg-white/95 backdrop-blur-md shadow-lg p-2.5 space-y-2 text-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-red-700 whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5 text-red-600" />
                  {isUr ? 'پالش / گولہ کے کنارے' : 'Polished Edge Sides (Red Lines)'}
                </span>
                <button
                  type="button"
                  aria-label="Close polish edges editor"
                  onClick={() => setActivePanel(null)}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(['front', 'back', 'left', 'right'] as const).map((side) => {
                  const checked = activeSegment.edges[side];
                  const label =
                    side === 'front'
                      ? isUr
                        ? 'سامنے'
                        : 'Front'
                      : side === 'back'
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
                      onClick={() =>
                        updateSegment(activeSegment.id, (prev) => ({
                          ...prev,
                          edges: { ...prev.edges, [side]: !checked },
                        }))
                      }
                      className={cn(
                        'h-7 rounded-md border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap',
                        checked
                          ? 'bg-red-600 text-white border-red-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {activeSegment.kind === 'chowki' && activeSegment.winderType !== '1-step' && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateSegment(activeSegment.id, (prev) => ({
                        ...prev,
                        edges: { ...prev.edges, diag1: !prev.edges.diag1 },
                      }))
                    }
                    className={cn(
                      'flex-1 h-7 rounded-md border text-[11px] font-bold cursor-pointer',
                      activeSegment.edges.diag1
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    )}
                  >
                    {isUr ? 'ترچھا کنارہ 1' : 'Diagonal 1'}
                  </button>
                  {activeSegment.winderType === '3-step' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSegment(activeSegment.id, (prev) => ({
                          ...prev,
                          edges: { ...prev.edges, diag2: !prev.edges.diag2 },
                        }))
                      }
                      className={cn(
                        'flex-1 h-7 rounded-md border text-[11px] font-bold cursor-pointer',
                        activeSegment.edges.diag2
                          ? 'bg-red-600 text-white border-red-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      )}
                    >
                      {isUr ? 'ترچھا کنارہ 2' : 'Diagonal 2'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CENTER INSIDE DOCK: Ordered Staircase Sequence Chips (Step 1 → Chowki 1 → Step 2...) */}
          <div className="absolute left-1/2 bottom-2 -translate-x-1/2 z-20 flex items-center gap-1 max-w-[calc(100%-172px)] overflow-x-auto no-scrollbar px-1">
            {segments.map((seg, idx) => {
              const meta = segmentLabels[idx];
              const isSelected = activeSegment?.id === seg.id;
              return (
                <div key={seg.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSegmentId(seg.id)}
                    className={cn(
                      'h-7 px-2 border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shadow-sm transition-all cursor-pointer',
                      segments.length > 1 ? 'rounded-l-lg' : 'rounded-lg',
                      isSelected
                        ? seg.kind === 'chowki'
                          ? 'bg-blue-600 text-white border-blue-700 font-extrabold'
                          : 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold'
                        : 'bg-white/95 text-slate-800 border-slate-200 hover:border-amber-500/70'
                    )}
                  >
                    {seg.kind === 'steps' ? (
                      <Footprints className="h-3 w-3 shrink-0" />
                    ) : (
                      <CornerUpRight className="h-3 w-3 shrink-0" />
                    )}
                    <span>{meta.title}</span>
                    <span
                      className={cn(
                        'text-[9px] font-mono tabular-nums opacity-85',
                        isSelected && seg.kind === 'chowki' ? 'text-blue-100' : ''
                      )}
                    >
                      {meta.badge}
                    </span>
                  </button>
                  {segments.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove ${meta.title}`}
                      onClick={() => removeSegment(seg.id)}
                      className="h-7 px-1.5 rounded-r-lg border border-l-0 border-slate-200 bg-white/95 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM INSIDE BAR: Active Segment Live Dimensions + Total Cost & Save */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 bg-white/95 backdrop-blur-sm border-t border-slate-200">
          {/* Active Segment Dimensions */}
          {activeSegment && (
            <div data-guide-step="2" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {activeSegment.kind === 'steps' ? (
                <>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'چوڑائی' : 'Tread'}</span>
                    <Input
                      value={activeSegment.width}
                      onChange={(e) =>
                        updateSegment(activeSegment.id, (prev) =>
                          prev.kind === 'steps' ? { ...prev, width: cleanNum(e.target.value) } : prev
                        )
                      }
                      inputMode="decimal"
                      aria-label="Step tread width"
                      className="h-8 w-14 sm:w-16 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'لمبائی' : 'Len'}</span>
                    <Input
                      value={activeSegment.length}
                      onChange={(e) =>
                        updateSegment(activeSegment.id, (prev) =>
                          prev.kind === 'steps' ? { ...prev, length: cleanNum(e.target.value) } : prev
                        )
                      }
                      inputMode="decimal"
                      aria-label="Step length"
                      className="h-8 w-14 sm:w-16 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>

                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'تعداد' : 'Qty'}</span>
                    <Input
                      value={activeSegment.quantity}
                      onChange={(e) =>
                        updateSegment(activeSegment.id, (prev) =>
                          prev.kind === 'steps'
                            ? { ...prev, quantity: cleanInt(e.target.value) }
                            : prev
                        )
                      }
                      inputMode="numeric"
                      aria-label="Step count"
                      className="h-8 w-12 sm:w-14 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-amber-50 text-slate-900 border-amber-400"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'چوڑائی' : 'W'}</span>
                    <Input
                      value={activeSegment.width}
                      onChange={(e) =>
                        updateSegment(activeSegment.id, (prev) =>
                          prev.kind === 'chowki' ? { ...prev, width: cleanNum(e.target.value) } : prev
                        )
                      }
                      inputMode="decimal"
                      aria-label="Chowki width"
                      className="h-8 w-14 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                  </label>

                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <span>{isUr ? 'لمبائی' : 'L'}</span>
                    <Input
                      value={activeSegment.length}
                      onChange={(e) =>
                        updateSegment(activeSegment.id, (prev) =>
                          prev.kind === 'chowki' ? { ...prev, length: cleanNum(e.target.value) } : prev
                        )
                      }
                      inputMode="decimal"
                      aria-label="Chowki length"
                      className="h-8 w-14 px-1.5 text-xs sm:text-sm font-extrabold tabular-nums text-center bg-slate-50 text-slate-900 border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">{unitText}</span>
                  </label>

                  {/* Chowki Step Type (1 / 2 / 3) */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                    {(['1-step', '2-step', '3-step'] as const).map((t) => {
                      const active = activeSegment.winderType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) =>
                              prev.kind === 'chowki'
                                ? {
                                    ...prev,
                                    winderType: t,
                                    riser: {
                                      ...prev.riser,
                                      edges: defaultChowkiRiserEdges(t),
                                    },
                                  }
                                : prev
                            )
                          }
                          className={cn(
                            'h-7 px-1.5 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap',
                            active
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          {t.replace('-step', isUr ? ' سٹیپ' : 'S')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Turn Direction (U-Left / L-Left / Straight / L-Right / U-Right) */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                    {(
                      [
                        { id: 'u-left', icon: Undo2, label: isUr ? 'U-بائیں (بڑی چوکی)' : 'U-Turn Left (Full Landing)' },
                        { id: 'left', icon: CornerUpLeft, label: isUr ? 'بائیں موڑ' : 'L-Turn Left' },
                        { id: 'straight', icon: ArrowUp, label: isUr ? 'سیدھی چوکی' : 'Straight' },
                        { id: 'right', icon: CornerUpRight, label: isUr ? 'دائیں موڑ' : 'L-Turn Right' },
                        { id: 'u-right', icon: Redo2, label: isUr ? 'U-دائیں (بڑی چوکی)' : 'U-Turn Right (Full Landing)' },
                      ] as const
                    ).map((turn) => {
                      const active = activeSegment.turnDirection === turn.id;
                      const Icon = turn.icon;
                      return (
                        <button
                          key={turn.id}
                          type="button"
                          title={turn.label}
                          aria-label={turn.label}
                          onClick={() =>
                            updateSegment(activeSegment.id, (prev) => {
                              if (prev.kind !== 'chowki') return prev;
                              const wasU =
                                prev.turnDirection === 'u-left' ||
                                prev.turnDirection === 'u-right';
                              const willBeU =
                                turn.id === 'u-left' || turn.id === 'u-right';
                              let nextWidth = prev.width;
                              if (!wasU && willBeU) {
                                const wIn = toInches(prev.width, selectedUnit) || 42;
                                const lIn = toInches(prev.length, selectedUnit) || 42;
                                if (wIn <= lIn * 1.35) {
                                  nextWidth = Number(
                                    convertVal(wIn * 2 + 4, 'inches', selectedUnit).toFixed(1)
                                  ).toString();
                                }
                              } else if (wasU && !willBeU) {
                                const lIn = toInches(prev.length, selectedUnit) || 42;
                                nextWidth = Number(
                                  convertVal(lIn, 'inches', selectedUnit).toFixed(1)
                                ).toString();
                              }
                              return {
                                ...prev,
                                turnDirection: turn.id,
                                width: nextWidth,
                                isMainLanding: willBeU,
                              };
                            })
                          }
                          className={cn(
                            'h-7 w-7 flex items-center justify-center rounded-md transition-colors cursor-pointer',
                            active
                              ? turn.id === 'u-left' || turn.id === 'u-right'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Live Steps Count, Total Sq.Ft & PKR + Save/Cancel */}
          <div data-guide-step="4" className="flex items-center gap-2 ml-auto">
            <div className="flex items-baseline gap-1.5 text-right whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-500 tabular-nums hidden sm:inline">
                {calculations.totalStepsCount} {isUr ? 'سٹیپ' : 'steps'} ·{' '}
                {calculations.finalSqFt.toFixed(1)} Sq.Ft ·
              </span>
              <span className="text-sm sm:text-base font-black text-amber-700 tabular-nums">
                PKR{' '}
                {calculations.grandTotal.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
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
              disabled={calculations.grandTotal <= 0}
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
