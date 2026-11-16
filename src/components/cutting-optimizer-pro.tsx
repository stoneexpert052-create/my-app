'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Scissors,
  Plus,
  Trash2,
  RotateCw,
  Lock,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  ShoppingCart,
  Camera,
  Upload,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Download,
  RefreshCw,
  CheckCircle2,
  Crop,
  Move,
  ArrowLeftRight,
  Compass,
  MapPin,
  Ban,
  Eye,
  Sparkles,
  Box,
  PanelLeftClose,
  PanelLeftOpen,
  HardDrive,
  Home,
  ArrowLeft,
  Sliders,
  ChevronDown,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SlabPdfBlueprintModal } from '@/components/slab-pdf-blueprint-modal';
import { BookmatchStudioPanel } from '@/components/bookmatch-studio-panel';
import {
  RoomFloorBookmatchPlanner,
  type RoomGeneratedPart,
} from '@/components/room-floor-bookmatch-planner';
import {
  AutoCadMovableBar,
  AutoCadWorkspaceControlBar,
  CadWindowHeaderBar,
  DEFAULT_CAD_WORKSPACE_STATE,
  DEFAULT_CAD_SCREENS,
  type CadWorkspaceState,
  type CadBarId,
  type CadBarConfig,
  type CadScreenId,
} from '@/components/autocad-bar-wrapper';
import type { Marble, MarbleVariant } from '@/lib/types';
export type EdgeProfileType =
  | 'flat_polish'
  | 'half_bullnose'
  | 'full_bullnose'
  | 'miter_45'
  | 'ogee'
  | 'bevel'
  | 'dupont';

export type ParametricTemplateType =
  | 'rectangle'
  | 'countertop_straight'
  | 'countertop_l'
  | 'waterfall_island'
  | 'vanity_top'
  | 'dining_round'
  | 'dining_oval'
  | 'dining_capsule'
  | 'fluted_table'
  | 'window_cill'
  | 'stair_tread'
  | 'bookmatch_feature_wall';

export interface SinkCutoutSpec {
  enabled: boolean;
  shape: 'rectangular' | 'oval' | 'vessel_circle';
  widthIn: number;
  lengthIn: number;
  depthIn?: number;
  offsetXIn: number;
  offsetYIn: number;
  faucetHoles: number;
}

export interface CornerPoint {
  x: number;
  y: number;
}

export interface SavedStockSlabItem {
  id: string;
  category: 'full_slab_lot' | 'usable_offcut';
  materialName: string;
  lotId: string;
  width: number;
  length: number;
  quantity: number;
  ratePerSqFt: number;
  kerf: number;
  edgeTrim: number;
  unit: UnitType;
  slabImageUrl: string;
  slabImageSourceLabel: string;
  masterFrameScale: number;
  masterFrameOffsetX: number;
  masterFrameOffsetY: number;
  masterFrameRotation: number;
  slabOverrides?: Record<number, IndividualSlabOverride>;
  locationRack: string;
  notes?: string;
  savedAt: string;
}

const IDB_DB_NAME = 'StoneCut2DStudioDB';
const IDB_STORE_NAME = 'projects';

function openStoneCutIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStoneCutProjectToIDB(key: string, payload: unknown): Promise<void> {
  const db = await openStoneCutIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put(payload, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadStoneCutProjectFromIDB<T = unknown>(key: string): Promise<T | null> {
  const db = await openStoneCutIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as T) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function rectifySlabPerspectiveToDataUrl(
  imageUrl: string,
  corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
  outWidth = 1000,
  outHeight = 600
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(imageUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          resolve(imageUrl);
          return;
        }
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, img.width, img.height);

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = outWidth;
        dstCanvas.height = outHeight;
        const dstCtx = dstCanvas.getContext('2d');
        if (!dstCtx) {
          resolve(imageUrl);
          return;
        }
        const dstData = dstCtx.createImageData(outWidth, outHeight);

        const [tl, tr, br, bl] = corners;
        for (let y = 0; y < outHeight; y++) {
          const v = y / (outHeight - 1);
          for (let x = 0; x < outWidth; x++) {
            const u = x / (outWidth - 1);
            const topX = tl.x + u * (tr.x - tl.x);
            const topY = tl.y + u * (tr.y - tl.y);
            const botX = bl.x + u * (br.x - bl.x);
            const botY = bl.y + u * (br.y - bl.y);
            const normX = topX + v * (botX - topX);
            const normY = topY + v * (botY - topY);

            const sx = Math.min(img.width - 1, Math.max(0, Math.round((normX / 100) * (img.width - 1))));
            const sy = Math.min(img.height - 1, Math.max(0, Math.round((normY / 100) * (img.height - 1))));

            const srcIdx = (sy * img.width + sx) * 4;
            const dstIdx = (y * outWidth + x) * 4;
            dstData.data[dstIdx] = srcData.data[srcIdx];
            dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
            dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
            dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
          }
        }
        dstCtx.putImageData(dstData, 0, 0);
        resolve(dstCanvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(imageUrl);
      }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

export type UnitType = 'in' | 'ft' | 'mm' | 'cm';

export interface SlabDefectZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pencilPath?: Array<{ x: number; y: number }>;
  pencilColor?: string;
  crackLengthUnits?: number;
}

export interface IndividualSlabOverride {
  slabNumber: number; // 1-based index (1..50)
  imageUrl?: string;
  sourceLabel?: string;
  customLength?: number;
  customWidth?: number;
  // Frame calibration settings for how the photo maps into the slab boundary
  frameScale: number; // 50% to 250%
  frameOffsetX: number; // -100 to +100 (%)
  frameOffsetY: number; // -100 to +100 (%)
  frameRotation: number; // -45 to +45 deg
  mirrorMode: 'none' | 'flip_h' | 'flip_v' | 'flip_both';
  defects: SlabDefectZone[];
}

export interface StockSlabConfig {
  materialName: string;
  lotId: string;
  length: number;
  width: number;
  quantity: number;
  kerf: number;
  edgeTrim: number;
  minOffcutLength: number;
  minOffcutWidth: number;
  ratePerSqFt: number;
}

export type LatakSideOption =
  | 'none'
  | 'front_only'
  | 'front_and_one_side'
  | 'both_sides_only'
  | 'front_2_sides'
  | 'front_and_both_sides'
  | 'all_4_sides';

export type LatakCutModeOption = 'bookmatch_attached' | 'random_separate';

export type ShapeCutTypeOption =
  | 'rect_90'
  | 'round_table'
  | 'oval_table'
  | 'half_round'
  | 'round_pie_4'
  | 'octagon_45'
  | 'degree_1_side'
  | 'degree_2_sides'
  | 'triangle_winder'
  | 'diamond_rhombus';

export interface CutPartInput {
  id: string;
  label: string;
  length: number;
  width: number;
  quantity: number;
  allowRotation: boolean;
  isBookmatchedPair?: boolean;
  installZone?: 'floor' | 'wall' | 'stairs' | 'counter';
  priority: 'high' | 'normal';
  color: string;
  templateType?: ParametricTemplateType;
  edgeProfile?: EdgeProfileType;
  sinkCutout?: SinkCutoutSpec;
  latakSides?: LatakSideOption;
  latakSize?: number;
  latakWidth?: number;
  latakMode?: 'bookmatch' | 'random' | string;
  latakCutMode?: LatakCutModeOption;
  // Individual Latak (لیٹر / لٹک) side toggles in exact order: 1. Front -> 2. Left -> 3. Right -> 4. Back
  latakFront?: boolean;
  latakLeft?: boolean;
  latakRight?: boolean;
  latakBack?: boolean;
  // Individual Splash / Backsplash (سلیش / بیک سپلیش) side toggles in exact order: 1. Back -> 2. Left -> 3. Right (Front has NO splash)
  splashBack?: boolean;
  splashLeft?: boolean;
  splashRight?: boolean;
  splashSize?: number;
  splashCutMode?: LatakCutModeOption;
  shapeCutType?: ShapeCutTypeOption;
  cutDegree?: number;
  lazySusanDiameter?: number;
  targetSlabNumber?: number; // 0 or undefined = Auto Best Fit, 1..50 = Cut specifically from Slab #targetSlabNumber
}

export function resolvePartLatakAndSplash(p: CutPartInput): {
  latakW: number;
  hasFront: boolean;
  hasLeft: boolean;
  hasRight: boolean;
  hasBack: boolean;
  hasAnyLatak: boolean;
  splashH: number;
  hasSplashBack: boolean;
  hasSplashLeft: boolean;
  hasSplashRight: boolean;
  hasAnySplash: boolean;
} {
  const latakW = Math.max(0, Number(p.latakSize ?? p.latakWidth ?? 0));
  const sides = p.latakSides || 'none';
  const hasExplicitLatakBools =
    p.latakFront !== undefined ||
    p.latakLeft !== undefined ||
    p.latakRight !== undefined ||
    p.latakBack !== undefined;

  let hasFront = false;
  let hasLeft = false;
  let hasRight = false;
  let hasBack = false;

  if (latakW > 0) {
    if (hasExplicitLatakBools) {
      hasFront = !!p.latakFront;
      hasLeft = !!p.latakLeft;
      hasRight = !!p.latakRight;
      hasBack = !!p.latakBack;
    } else if (sides !== 'none') {
      hasFront =
        sides === 'front_only' ||
        sides === 'front_and_one_side' ||
        sides === 'front_2_sides' ||
        sides === 'front_and_both_sides' ||
        sides === 'all_4_sides';
      hasLeft =
        sides === 'both_sides_only' ||
        sides === 'front_2_sides' ||
        sides === 'front_and_both_sides' ||
        sides === 'all_4_sides';
      hasRight =
        sides === 'front_and_one_side' ||
        sides === 'both_sides_only' ||
        sides === 'front_2_sides' ||
        sides === 'front_and_both_sides' ||
        sides === 'all_4_sides';
      hasBack = sides === 'all_4_sides';
    }
  }

  const hasAnyLatak = latakW > 0 && (hasFront || hasLeft || hasRight || hasBack);

  const splashH = Math.max(0, Number(p.splashSize ?? 0));
  const hasSplashBack = splashH > 0 && !!p.splashBack;
  const hasSplashLeft = splashH > 0 && !!p.splashLeft;
  const hasSplashRight = splashH > 0 && !!p.splashRight;
  const hasAnySplash = splashH > 0 && (hasSplashBack || hasSplashLeft || hasSplashRight);

  return {
    latakW,
    hasFront,
    hasLeft,
    hasRight,
    hasBack,
    hasAnyLatak,
    splashH,
    hasSplashBack,
    hasSplashLeft,
    hasSplashRight,
    hasAnySplash,
  };
}

export interface PlacedPiece {
  instanceId: string;
  pieceCode: string; // e.g., "S1-P1" (Slab 1, Piece 1)
  globalPieceNumber: number;
  partId: string;
  pieceIndex: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalLength: number;
  originalWidth: number;
  rotated: boolean;
  isMirroredBookmatch?: boolean;
  bookmatchTag?: string;
  installZone: 'floor' | 'wall' | 'stairs' | 'counter';
  floorRow: number;
  floorCol: number;
  floorCoordLabel: string; // e.g., "Floor R1-C2"
  priority: 'high' | 'normal';
  color: string;
  slabIndex: number;
  templateType?: ParametricTemplateType;
  edgeProfile?: EdgeProfileType;
  sinkCutout?: SinkCutoutSpec;
  shapeCutType?: ShapeCutTypeOption;
  cutDegree?: number;
  lazySusanDiameter?: number;
}

export interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  isUsableOffcut: boolean;
}

export interface CutOperation {
  step: number;
  slabIndex: number;
  type: 'edge_trim' | 'rip_horizontal' | 'cross_vertical';
  orientation: 'H' | 'V';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  position: number;
  length: number;
  descriptionEn: string;
  descriptionUr: string;
  targetPartLabel?: string;
}

export interface OptimizedSlabResult {
  slabIndex: number;
  slabLength: number;
  slabWidth: number;
  usableX: number;
  usableY: number;
  usableLength: number;
  usableWidth: number;
  kerf: number;
  edgeTrim: number;
  placedPieces: PlacedPiece[];
  freeRects: FreeRect[];
  defects: SlabDefectZone[];
  cuts: CutOperation[];
  totalSlabAreaSqFt: number;
  usedAreaSqFt: number;
  usableOffcutAreaSqFt: number;
  scrapWasteAreaSqFt: number;
  yieldPercent: number;
  wastePercent: number;
}

export interface OptimizationSummary {
  slabs: OptimizedSlabResult[];
  unplacedPieces: {
    partId: string;
    label: string;
    length: number;
    width: number;
    reason: string;
  }[];
  totalSlabsUsed: number;
  totalSlabsAvailable: number;
  extraSlabsNeeded: number;
  totalPiecesRequested: number;
  totalPiecesPlaced: number;
  totalSlabAreaSqFt: number;
  totalUsedAreaSqFt: number;
  totalUsableOffcutAreaSqFt: number;
  totalScrapWasteAreaSqFt: number;
  overallYieldPercent: number;
  overallWastePercent: number;
  estimatedTotalSlabCostPKR: number;
  estimatedNetUsedCostPKR: number;
  estimatedWasteCostPKR: number;
}

const PART_PALETTE = [
  '#0284C7', // CAD Blueprint Sky
  '#0F766E', // Engineering Teal
  '#334155', // Architectural Slate
  '#1D4ED8', // Structural Cobalt
  '#0369A1', // Precision Cerulean
  '#1E293B', // Industrial Steel
  '#0D9488', // Drafting Cyan
  '#4338CA', // Technical Indigo
  '#1E40AF', // Deep Navy
  '#115E59', // Mineral Slate
];

const UNIT_TO_INCHES: Record<UnitType, number> = {
  in: 1,
  ft: 12,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
};

function toSqFt(areaInSelectedUnit: number, unit: UnitType): number {
  const factor = UNIT_TO_INCHES[unit];
  const sqInches = areaInSelectedUnit * factor * factor;
  return sqInches / 144;
}

function formatNum(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '0';
  return Number(n.toFixed(decimals)).toString();
}

function createSyntheticVeinedSlabDataUrl(preset: 'statuario' | 'black_gold' | 'onyx'): string {
  if (preset === 'black_gold') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b0f17"/>
          <stop offset="45%" stop-color="#141b26"/>
          <stop offset="100%" stop-color="#070a0f"/>
        </linearGradient>
        <filter id="blurVein"><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)"/>
      <path d="M 0 150 Q 420 270, 820 520 T 1600 880" fill="none" stroke="#b45309" stroke-width="26" stroke-opacity="0.35" filter="url(#blurVein)"/>
      <path d="M 0 160 Q 440 280, 820 520 T 1600 880" fill="none" stroke="#d97706" stroke-width="9" stroke-opacity="0.85"/>
      <path d="M 0 190 Q 480 330, 840 550 T 1600 930" fill="none" stroke="#fef3c7" stroke-width="3.5" stroke-opacity="0.92"/>
      <path d="M 240 0 Q 580 380, 1040 500 T 1600 620" fill="none" stroke="#f59e0b" stroke-width="6" stroke-opacity="0.65"/>
      <path d="M 0 640 Q 360 580, 780 740 T 1600 980" fill="none" stroke="#fde68a" stroke-width="3" stroke-opacity="0.6"/>
      <path d="M 820 520 Q 960 280, 1320 120" fill="none" stroke="#fbbf24" stroke-width="4.5" stroke-opacity="0.7"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  if (preset === 'onyx') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ecfdf5"/>
          <stop offset="45%" stop-color="#a7f3d0"/>
          <stop offset="75%" stop-color="#fef3c7"/>
          <stop offset="100%" stop-color="#d1fae5"/>
        </linearGradient>
        <filter id="blurOnyx"><feGaussianBlur stdDeviation="8"/></filter>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)"/>
      <path d="M 0 80 Q 520 360, 960 480 T 1600 940" fill="none" stroke="#b45309" stroke-width="28" stroke-opacity="0.35" filter="url(#blurOnyx)"/>
      <path d="M 0 80 Q 520 360, 960 480 T 1600 940" fill="none" stroke="#92400e" stroke-width="8" stroke-opacity="0.65"/>
      <path d="M 0 320 Q 600 440, 1020 660 T 1600 840" fill="none" stroke="#047857" stroke-width="9" stroke-opacity="0.5"/>
      <path d="M 160 0 Q 680 320, 1160 420 T 1600 520" fill="none" stroke="#d97706" stroke-width="6" stroke-opacity="0.6"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="35%" stop-color="#f8fafc"/>
        <stop offset="70%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <filter id="softCloud"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="medVein"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect width="1600" height="1000" fill="url(#bg)"/>
    <path d="M -40 70 Q 380 230, 760 490 T 1640 910" fill="none" stroke="#94a3b8" stroke-width="58" stroke-opacity="0.28" filter="url(#softCloud)"/>
    <path d="M 280 -30 Q 640 310, 1050 470 T 1630 660" fill="none" stroke="#cbd5e1" stroke-width="44" stroke-opacity="0.35" filter="url(#softCloud)"/>
    <path d="M 0 80 Q 380 240, 760 500 T 1600 920" fill="none" stroke="#64748b" stroke-width="18" stroke-opacity="0.42" filter="url(#medVein)"/>
    <path d="M 0 105 Q 400 260, 780 520 T 1600 950" fill="none" stroke="#334155" stroke-width="5.5" stroke-opacity="0.82"/>
    <path d="M 0 112 Q 410 272, 790 528 T 1600 960" fill="none" stroke="#b45309" stroke-width="2" stroke-opacity="0.45"/>
    <path d="M 320 0 Q 620 300, 1040 460 T 1600 640" fill="none" stroke="#475569" stroke-width="7.5" stroke-opacity="0.58"/>
    <path d="M 0 540 Q 440 620, 880 820 T 1520 1000" fill="none" stroke="#64748b" stroke-width="6.5" stroke-opacity="0.5"/>
    <path d="M 760 500 Q 980 280, 1360 80" fill="none" stroke="#475569" stroke-width="5" stroke-opacity="0.62"/>
    <path d="M 420 280 Q 540 440, 690 740" fill="none" stroke="#94a3b8" stroke-width="3.5" stroke-opacity="0.55"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Helper to split free rectangles around a damaged/crack zone on a specific slab
 */
function subtractDefectFromRects(
  rects: { x: number; y: number; width: number; height: number }[],
  defect: SlabDefectZone,
  kerf: number
): { x: number; y: number; width: number; height: number }[] {
  const result: { x: number; y: number; width: number; height: number }[] = [];
  const dx1 = defect.x - kerf;
  const dy1 = defect.y - kerf;
  const dx2 = defect.x + defect.width + kerf;
  const dy2 = defect.y + defect.height + kerf;

  for (const r of rects) {
    const rx1 = r.x;
    const ry1 = r.y;
    const rx2 = r.x + r.width;
    const ry2 = r.y + r.height;

    // Check overlap
    if (dx2 <= rx1 || dx1 >= rx2 || dy2 <= ry1 || dy1 >= ry2) {
      result.push(r);
      continue;
    }

    // Split into up to 4 non-overlapping guillotine-safe sub-rectangles around the crack
    if (dx1 > rx1 + 1) {
      result.push({ x: rx1, y: ry1, width: dx1 - rx1, height: r.height });
    }
    if (dx2 < rx2 - 1) {
      result.push({ x: dx2, y: ry1, width: rx2 - dx2, height: r.height });
    }
    const midX1 = Math.max(rx1, dx1);
    const midX2 = Math.min(rx2, dx2);
    if (midX2 > midX1 + 1) {
      if (dy1 > ry1 + 1) {
        result.push({ x: midX1, y: ry1, width: midX2 - midX1, height: dy1 - ry1 });
      }
      if (dy2 < ry2 - 1) {
        result.push({ x: midX1, y: dy2, width: midX2 - midX1, height: ry2 - dy2 });
      }
    }
  }
  return result;
}

/**
 * 2D Guillotine Slab Cutting Optimization Engine with Per-Slab Overrides, Defect Avoidance & Floor Grid Coordinates
 */
export function runGuillotineOptimization(
  slabConfig: StockSlabConfig,
  parts: CutPartInput[],
  unit: UnitType,
  slabOverrides?: Record<number, IndividualSlabOverride>,
  floorColsCount = 4,
  manualPieceOffsets?: Record<string, { dx: number; dy: number }>,
  fourSlabBookmatchMode = false
): OptimizationSummary {
  const defaultSlabL = Math.max(1, Number(slabConfig.length) || 110);
  const defaultSlabW = Math.max(1, Number(slabConfig.width) || 60);
  const kerf = Math.max(0, Number(slabConfig.kerf) || 0);
  const trim = Math.max(0, Number(slabConfig.edgeTrim) || 0);
  const minOffL = Math.max(0, Number(slabConfig.minOffcutLength) || 12);
  const minOffW = Math.max(0, Number(slabConfig.minOffcutWidth) || 12);
  const availableSlabs = Math.max(
    fourSlabBookmatchMode ? 4 : 1,
    Math.min(50, Math.floor(Number(slabConfig.quantity) || 1))
  );

  interface ExpandedPiece {
    instanceId: string;
    partId: string;
    pieceIndex: number;
    label: string;
    length: number;
    width: number;
    allowRotation: boolean;
    isMirroredBookmatch: boolean;
    bookmatchTag?: string;
    installZone: 'floor' | 'wall' | 'stairs' | 'counter';
    priority: 'high' | 'normal';
    color: string;
    templateType?: ParametricTemplateType;
    edgeProfile?: EdgeProfileType;
    sinkCutout?: SinkCutoutSpec;
    shapeCutType?: ShapeCutTypeOption;
    cutDegree?: number;
    lazySusanDiameter?: number;
    targetSlabNumber?: number;
    attachedLataks?: {
      latakSize: number;
      hasFront: boolean;
      hasBack: boolean;
      hasLeft: boolean;
      hasRight: boolean;
      mainLength: number;
      mainWidth: number;
    };
  }

  let totalIndividualPiecesRequested = 0;
  const expanded: ExpandedPiece[] = [];
  parts.forEach((p, idx) => {
    const rawQty = Math.max(0, Math.min(500, Math.floor(Number(p.quantity) || 0)));
    // In 4-Slab Bookmatch Mode, each Zone on the slab template is cut from all 4 consecutive slabs (Slab #1, #2, #3, #4) to produce 4 matching pieces!
    const qty = fourSlabBookmatchMode ? Math.max(1, Math.ceil(rawQty / 4)) : rawQty;
    const l = Number(p.length) || 0;
    const w = Number(p.width) || 0;
    if (rawQty <= 0 || l <= 0 || w <= 0) return;
    const color = p.color || PART_PALETTE[idx % PART_PALETTE.length];

    const resolved = resolvePartLatakAndSplash(p);
    const latakW = resolved.latakW;
    const cutMode: LatakCutModeOption = p.latakCutMode || 'bookmatch_attached';
    const hasLatak = resolved.hasAnyLatak;
    const hasFront = resolved.hasFront;
    const hasLeft = resolved.hasLeft;
    const hasRight = resolved.hasRight;
    const hasBack = resolved.hasBack;

    for (let i = 1; i <= qty; i++) {
      const isMirrored = !!p.isBookmatchedPair && i % 2 === 0;
      const bmPairNum = Math.ceil(i / 2);
      const bmTag = p.isBookmatchedPair
        ? isMirrored
          ? `BM-${bmPairNum}B (Mirror)`
          : `BM-${bmPairNum}A (Base)`
        : undefined;

      if (hasLatak && cutMode === 'bookmatch_attached') {
        // CONTIGUOUS BOOKMATCH MODE: Cut Main Piece + Selected Latak/Riser Strips SIDE-BY-SIDE from the exact same vein block!
        const groupLength =
          l + (hasLeft ? latakW + kerf : 0) + (hasRight ? latakW + kerf : 0);
        const groupWidth =
          w + (hasBack ? latakW + kerf : 0) + (hasFront ? latakW + kerf : 0);

        totalIndividualPiecesRequested +=
          1 +
          (hasFront ? 1 : 0) +
          (hasBack ? 1 : 0) +
          (hasLeft ? 1 : 0) +
          (hasRight ? 1 : 0);

        expanded.push({
          instanceId: `${p.id}_${i}`,
          partId: p.id,
          pieceIndex: i,
          label: p.label || `Part ${idx + 1}`,
          length: groupLength,
          width: groupWidth,
          allowRotation: false, // Lock orientation so horizontal veins fold directly into Latak/Riser
          isMirroredBookmatch: isMirrored,
          bookmatchTag: bmTag || `🔗 BM-SET #${i}`,
          installZone: p.installZone || 'floor',
          priority: 'high',
          color,
          templateType: p.templateType,
          edgeProfile: p.edgeProfile,
          sinkCutout: p.sinkCutout,
          shapeCutType: p.shapeCutType,
          cutDegree: p.cutDegree,
          lazySusanDiameter: p.lazySusanDiameter,
          targetSlabNumber: p.targetSlabNumber,
          attachedLataks: {
            latakSize: latakW,
            hasFront,
            hasBack,
            hasLeft,
            hasRight,
            mainLength: l,
            mainWidth: w,
          },
        });
      } else {
        // STANDARD PIECE OR RANDOM SEPARATE LATAK MODE
        totalIndividualPiecesRequested += 1;
        expanded.push({
          instanceId: `${p.id}_${i}`,
          partId: p.id,
          pieceIndex: i,
          label: p.label || `Part ${idx + 1}`,
          length: l,
          width: w,
          allowRotation: p.isBookmatchedPair ? false : !!p.allowRotation,
          isMirroredBookmatch: isMirrored,
          bookmatchTag: hasLatak ? `🎲 RANDOM MAIN #${i}` : bmTag,
          installZone: p.installZone || 'floor',
          priority: p.priority || 'normal',
          color,
          templateType: p.templateType,
          edgeProfile: p.edgeProfile,
          sinkCutout: p.sinkCutout,
          shapeCutType: p.shapeCutType,
          cutDegree: p.cutDegree,
          lazySusanDiameter: p.lazySusanDiameter,
          targetSlabNumber: p.targetSlabNumber,
        });

        if (hasLatak && cutMode === 'random_separate') {
          if (hasFront) {
            totalIndividualPiecesRequested += 1;
            expanded.push({
              instanceId: `${p.id}_${i}_latak_front`,
              partId: p.id,
              pieceIndex: i,
              label: `${p.label || `Part ${idx + 1}`} — 1. Front Latak (${latakW}"×${l}")`,
              length: l,
              width: latakW,
              allowRotation: true,
              isMirroredBookmatch: false,
              bookmatchTag: `🎲 1.FRONT-LATAK #${i}`,
              installZone: p.installZone || 'counter',
              priority: 'normal',
              color: '#D97706',
              targetSlabNumber: p.targetSlabNumber,
            });
          }
          if (hasLeft) {
            totalIndividualPiecesRequested += 1;
            expanded.push({
              instanceId: `${p.id}_${i}_latak_left`,
              partId: p.id,
              pieceIndex: i,
              label: `${p.label || `Part ${idx + 1}`} — 2. Left Latak (${latakW}"×${w}")`,
              length: latakW,
              width: w,
              allowRotation: true,
              isMirroredBookmatch: false,
              bookmatchTag: `🎲 2.LEFT-LATAK #${i}`,
              installZone: p.installZone || 'counter',
              priority: 'normal',
              color: '#7C3AED',
              targetSlabNumber: p.targetSlabNumber,
            });
          }
          if (hasRight) {
            totalIndividualPiecesRequested += 1;
            expanded.push({
              instanceId: `${p.id}_${i}_latak_right`,
              partId: p.id,
              pieceIndex: i,
              label: `${p.label || `Part ${idx + 1}`} — 3. Right Latak (${latakW}"×${w}")`,
              length: latakW,
              width: w,
              allowRotation: true,
              isMirroredBookmatch: false,
              bookmatchTag: `🎲 3.RIGHT-LATAK #${i}`,
              installZone: p.installZone || 'counter',
              priority: 'normal',
              color: '#0D9488',
              targetSlabNumber: p.targetSlabNumber,
            });
          }
          if (hasBack) {
            totalIndividualPiecesRequested += 1;
            expanded.push({
              instanceId: `${p.id}_${i}_latak_back`,
              partId: p.id,
              pieceIndex: i,
              label: `${p.label || `Part ${idx + 1}`} — 4. Back Latak (${latakW}"×${l}")`,
              length: l,
              width: latakW,
              allowRotation: true,
              isMirroredBookmatch: false,
              bookmatchTag: `🎲 4.BACK-LATAK #${i}`,
              installZone: p.installZone || 'counter',
              priority: 'normal',
              color: '#059669',
              targetSlabNumber: p.targetSlabNumber,
            });
          }
        }
      }

      // EXPAND SPLASH / BACKSPLASH STRIPS IN EXACT ORDER: 1. Back Side Splash -> 2. Left Side Splash -> 3. Right Side Splash (No Front Splash)
      if (resolved.hasAnySplash) {
        const spH = resolved.splashH;
        if (resolved.hasSplashBack) {
          totalIndividualPiecesRequested += 1;
          expanded.push({
            instanceId: `${p.id}_${i}_splash_back`,
            partId: p.id,
            pieceIndex: i,
            label: `${p.label || `Part ${idx + 1}`} — 1. Back Splash / بیک سلیش (${spH}"×${l}")`,
            length: l,
            width: spH,
            allowRotation: true,
            isMirroredBookmatch: false,
            bookmatchTag: `🧱 1.BACK-SPLASH #${i}`,
            installZone: 'wall',
            priority: 'normal',
            color: '#0284C7',
            targetSlabNumber: p.targetSlabNumber,
          });
        }
        if (resolved.hasSplashLeft) {
          totalIndividualPiecesRequested += 1;
          expanded.push({
            instanceId: `${p.id}_${i}_splash_left`,
            partId: p.id,
            pieceIndex: i,
            label: `${p.label || `Part ${idx + 1}`} — 2. Left Splash / لیفٹ سلیش (${spH}"×${w}")`,
            length: w,
            width: spH,
            allowRotation: true,
            isMirroredBookmatch: false,
            bookmatchTag: `🧱 2.LEFT-SPLASH #${i}`,
            installZone: 'wall',
            priority: 'normal',
            color: '#0369A1',
            targetSlabNumber: p.targetSlabNumber,
          });
        }
        if (resolved.hasSplashRight) {
          totalIndividualPiecesRequested += 1;
          expanded.push({
            instanceId: `${p.id}_${i}_splash_right`,
            partId: p.id,
            pieceIndex: i,
            label: `${p.label || `Part ${idx + 1}`} — 3. Right Splash / رائٹ سلیش (${spH}"×${w}")`,
            length: w,
            width: spH,
            allowRotation: true,
            isMirroredBookmatch: false,
            bookmatchTag: `🧱 3.RIGHT-SPLASH #${i}`,
            installZone: 'wall',
            priority: 'normal',
            color: '#0E7490',
            targetSlabNumber: p.targetSlabNumber,
          });
        }
      }
    }
  });

  expanded.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'high' ? -1 : 1;
    }
    const areaB = b.length * b.width;
    const areaA = a.length * a.width;
    if (Math.abs(areaB - areaA) > 0.001) return areaB - areaA;
    return Math.max(b.length, b.width) - Math.max(a.length, a.width);
  });

  const unplacedPieces: OptimizationSummary['unplacedPieces'] = [];
  const remainingQueue: ExpandedPiece[] = [];

  const maxUsableL = Math.max(0, defaultSlabL - 2 * trim);
  const maxUsableW = Math.max(0, defaultSlabW - 2 * trim);

  for (const item of expanded) {
    // Allow pieces up to the FULL raw slab dimensions (defaultSlabL x defaultSlabW) so full-size slab bookmatch never gets rejected!
    const fitsNormal = item.length <= defaultSlabL + 1e-6 && item.width <= defaultSlabW + 1e-6;
    const fitsRotated =
      item.allowRotation && item.width <= defaultSlabL + 1e-6 && item.length <= defaultSlabW + 1e-6;
    if (!fitsNormal && !fitsRotated) {
      unplacedPieces.push({
        partId: item.partId,
        label: `${item.label} #${item.pieceIndex}`,
        length: item.length,
        width: item.width,
        reason: `Exceeds slab dimensions (${formatNum(defaultSlabL)} × ${formatNum(defaultSlabW)} ${unit})`,
      });
    } else {
      remainingQueue.push(item);
    }
  }

  const slabsResult: OptimizedSlabResult[] = [];
  const maxSlabsCap = Math.max(availableSlabs, 50);

  let currentSlabIdx = 1;
  let globalPieceCounter = 1;
  const colsPerFloorRow = Math.max(1, floorColsCount);

  while (remainingQueue.length > 0 && currentSlabIdx <= maxSlabsCap) {
    const override = slabOverrides?.[currentSlabIdx];
    const slabL = override?.customLength && override.customLength > 0 ? override.customLength : defaultSlabL;
    const slabW = override?.customWidth && override.customWidth > 0 ? override.customWidth : defaultSlabW;
    // If any piece in remainingQueue requires full slab width/length (larger than trimmed usable area), automatically use 0 trim so full-size pieces place cleanly!
    const needsFullSlabBoundary = remainingQueue.some(
      (it) =>
        it.length > slabL - 2 * trim + 1e-6 ||
        it.width > slabW - 2 * trim + 1e-6
    );
    const effectiveTrim = needsFullSlabBoundary ? 0 : trim;
    const usableL = Math.max(0, slabL - 2 * effectiveTrim);
    const usableW = Math.max(0, slabW - 2 * effectiveTrim);
    const slabDefects = override?.defects || [];

    let freeRects: { x: number; y: number; width: number; height: number }[] = [
      {
        x: effectiveTrim,
        y: effectiveTrim,
        width: usableL,
        height: usableW,
      },
    ];

    // Subtract any damaged / crack zones marked on this specific slab
    for (const def of slabDefects) {
      freeRects = subtractDefectFromRects(freeRects, def, kerf);
    }

    const placedPieces: PlacedPiece[] = [];
    const cuts: CutOperation[] = [];
    let stepCounter = 1;

    if (trim > 0) {
      cuts.push({
        step: stepCounter++,
        slabIndex: currentSlabIdx,
        type: 'edge_trim',
        orientation: 'H',
        x1: trim,
        y1: trim,
        x2: slabL - trim,
        y2: trim,
        position: trim,
        length: slabL,
        descriptionEn: `Perimeter Edge Trim (${formatNum(trim)} ${unit} clean margin on all 4 edges)`,
        descriptionUr: `چاروں کناروں کی صفائی ٹرم (${formatNum(trim)} ${unit} مارجن)`,
      });
    }

    let placedAnyInPass = true;
    let slabLocalPieceCounter = 1;

    while (placedAnyInPass && remainingQueue.length > 0) {
      placedAnyInPass = false;

      let bestQueueIdx = -1;
      let bestRectIdx = -1;
      let bestRotated = false;
      let bestScore = Infinity;

      for (let qIdx = 0; qIdx < remainingQueue.length; qIdx++) {
        const candidate = remainingQueue[qIdx];
        // If user explicitly assigned this piece to a specific Slab # (e.g. Slab #2 or Slab #3),
        // only place it when currentSlabIdx matches targetSlabNumber (unless we reached the last available slab)
        if (
          candidate.targetSlabNumber &&
          candidate.targetSlabNumber > 0 &&
          candidate.targetSlabNumber !== currentSlabIdx &&
          currentSlabIdx < Math.min(maxSlabsCap, Math.max(availableSlabs, candidate.targetSlabNumber))
        ) {
          continue;
        }
        if (
          bestQueueIdx !== -1 &&
          remainingQueue[bestQueueIdx].priority === 'high' &&
          candidate.priority !== 'high'
        ) {
          break;
        }

        for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
          const rect = freeRects[rIdx];

          if (candidate.length <= rect.width + 1e-6 && candidate.width <= rect.height + 1e-6) {
            const leftoverW = rect.width - candidate.length;
            const leftoverH = rect.height - candidate.width;
            const shortSideFit = Math.min(leftoverW, leftoverH);
            const areaFit = rect.width * rect.height - candidate.length * candidate.width;
            const score = shortSideFit * 1000 + areaFit * 0.01 + rect.y * 0.1 + rect.x * 0.05;
            if (score < bestScore) {
              bestScore = score;
              bestQueueIdx = qIdx;
              bestRectIdx = rIdx;
              bestRotated = false;
            }
          }

          if (
            candidate.allowRotation &&
            candidate.width <= rect.width + 1e-6 &&
            candidate.length <= rect.height + 1e-6
          ) {
            const leftoverW = rect.width - candidate.width;
            const leftoverH = rect.height - candidate.length;
            const shortSideFit = Math.min(leftoverW, leftoverH);
            const areaFit = rect.width * rect.height - candidate.length * candidate.width;
            const score = shortSideFit * 1000 + areaFit * 0.01 + rect.y * 0.1 + rect.x * 0.05;
            if (score < bestScore) {
              bestScore = score;
              bestQueueIdx = qIdx;
              bestRectIdx = rIdx;
              bestRotated = true;
            }
          }
        }
      }

      if (bestQueueIdx !== -1 && bestRectIdx !== -1) {
        placedAnyInPass = true;
        const chosenPiece = remainingQueue.splice(bestQueueIdx, 1)[0];
        const targetRect = freeRects.splice(bestRectIdx, 1)[0];

        const placedW = bestRotated ? chosenPiece.width : chosenPiece.length;
        const placedH = bestRotated ? chosenPiece.length : chosenPiece.width;

        const floorRow = Math.floor((globalPieceCounter - 1) / colsPerFloorRow) + 1;
        const floorCol = ((globalPieceCounter - 1) % colsPerFloorRow) + 1;
        const pieceCode = `S${currentSlabIdx}-P${slabLocalPieceCounter}`;
        const floorCoordLabel = `Row ${floorRow} · Col ${floorCol} (R${floorRow}-C${floorCol})`;

        const manualShift = manualPieceOffsets?.[chosenPiece.instanceId];
        const shiftDx = Number(manualShift?.dx ?? 0) || 0;
        const shiftDy = Number(manualShift?.dy ?? 0) || 0;
        const finalX = manualShift
          ? Math.max(trim, Math.min(Math.max(trim, slabL - trim - placedW), targetRect.x + shiftDx))
          : targetRect.x;
        const finalY = manualShift
          ? Math.max(trim, Math.min(Math.max(trim, slabW - trim - placedH), targetRect.y + shiftDy))
          : targetRect.y;

        if (chosenPiece.attachedLataks) {
          // Place the Main Piece + Attached Bookmatch Latak/Riser Strips side-by-side at exact contiguous coordinates!
          const al = chosenPiece.attachedLataks;
          const leftOffset = al.hasLeft ? al.latakSize + kerf : 0;
          const topOffset = al.hasBack ? al.latakSize + kerf : 0;
          const mainX = finalX + leftOffset;
          const mainY = finalY + topOffset;

          // 1. Main Piece
          placedPieces.push({
            instanceId: chosenPiece.instanceId,
            pieceCode,
            globalPieceNumber: globalPieceCounter,
            partId: chosenPiece.partId,
            pieceIndex: chosenPiece.pieceIndex,
            label: `${chosenPiece.label} (🔗 BM Main)`,
            x: mainX,
            y: mainY,
            width: al.mainLength,
            height: al.mainWidth,
            originalLength: al.mainLength,
            originalWidth: al.mainWidth,
            rotated: false,
            isMirroredBookmatch: chosenPiece.isMirroredBookmatch,
            bookmatchTag: `🔗 BM-MAIN #${chosenPiece.pieceIndex}`,
            installZone: chosenPiece.installZone,
            floorRow,
            floorCol,
            floorCoordLabel,
            priority: chosenPiece.priority,
            color: chosenPiece.color,
            slabIndex: currentSlabIdx,
            templateType: chosenPiece.templateType,
            edgeProfile: chosenPiece.edgeProfile,
            sinkCutout: chosenPiece.sinkCutout,
            shapeCutType: chosenPiece.shapeCutType,
            cutDegree: chosenPiece.cutDegree,
            lazySusanDiameter: chosenPiece.lazySusanDiameter,
          });
          slabLocalPieceCounter++;
          globalPieceCounter++;

          // 2. Front Latak / Riser (Directly Below Main Piece on Slab for Continuous Vein Fold)
          if (al.hasFront) {
            const fRow = Math.floor((globalPieceCounter - 1) / colsPerFloorRow) + 1;
            const fCol = ((globalPieceCounter - 1) % colsPerFloorRow) + 1;
            placedPieces.push({
              instanceId: `${chosenPiece.instanceId}_bm_front`,
              pieceCode: `S${currentSlabIdx}-P${slabLocalPieceCounter}`,
              globalPieceNumber: globalPieceCounter,
              partId: chosenPiece.partId,
              pieceIndex: chosenPiece.pieceIndex,
              label: `🔗 Front Latak/Riser (${al.latakSize}"×${al.mainLength}") — ${chosenPiece.label}`,
              x: mainX,
              y: mainY + al.mainWidth + kerf,
              width: al.mainLength,
              height: al.latakSize,
              originalLength: al.mainLength,
              originalWidth: al.latakSize,
              rotated: false,
              isMirroredBookmatch: true,
              bookmatchTag: `🔗 BM-FRONT #${chosenPiece.pieceIndex}`,
              installZone: chosenPiece.installZone,
              floorRow: fRow,
              floorCol: fCol,
              floorCoordLabel: `Attached Front Latak (#${chosenPiece.pieceIndex})`,
              priority: 'high',
              color: '#D97706',
              slabIndex: currentSlabIdx,
            });
            slabLocalPieceCounter++;
            globalPieceCounter++;
          }

          // 3. Back Latak (Directly Above Main Piece on Slab)
          if (al.hasBack) {
            const bRow = Math.floor((globalPieceCounter - 1) / colsPerFloorRow) + 1;
            const bCol = ((globalPieceCounter - 1) % colsPerFloorRow) + 1;
            placedPieces.push({
              instanceId: `${chosenPiece.instanceId}_bm_back`,
              pieceCode: `S${currentSlabIdx}-P${slabLocalPieceCounter}`,
              globalPieceNumber: globalPieceCounter,
              partId: chosenPiece.partId,
              pieceIndex: chosenPiece.pieceIndex,
              label: `🔗 Back Latak (${al.latakSize}"×${al.mainLength}") — ${chosenPiece.label}`,
              x: mainX,
              y: finalY,
              width: al.mainLength,
              height: al.latakSize,
              originalLength: al.mainLength,
              originalWidth: al.latakSize,
              rotated: false,
              isMirroredBookmatch: true,
              bookmatchTag: `🔗 BM-BACK #${chosenPiece.pieceIndex}`,
              installZone: chosenPiece.installZone,
              floorRow: bRow,
              floorCol: bCol,
              floorCoordLabel: `Attached Back Latak (#${chosenPiece.pieceIndex})`,
              priority: 'high',
              color: '#059669',
              slabIndex: currentSlabIdx,
            });
            slabLocalPieceCounter++;
            globalPieceCounter++;
          }

          // 4. Left Side Latak (Directly Left of Main Piece on Slab)
          if (al.hasLeft) {
            const lRow = Math.floor((globalPieceCounter - 1) / colsPerFloorRow) + 1;
            const lCol = ((globalPieceCounter - 1) % colsPerFloorRow) + 1;
            placedPieces.push({
              instanceId: `${chosenPiece.instanceId}_bm_left`,
              pieceCode: `S${currentSlabIdx}-P${slabLocalPieceCounter}`,
              globalPieceNumber: globalPieceCounter,
              partId: chosenPiece.partId,
              pieceIndex: chosenPiece.pieceIndex,
              label: `🔗 Left Latak (${al.latakSize}"×${al.mainWidth}") — ${chosenPiece.label}`,
              x: finalX,
              y: mainY,
              width: al.latakSize,
              height: al.mainWidth,
              originalLength: al.latakSize,
              originalWidth: al.mainWidth,
              rotated: false,
              isMirroredBookmatch: true,
              bookmatchTag: `🔗 BM-LEFT #${chosenPiece.pieceIndex}`,
              installZone: chosenPiece.installZone,
              floorRow: lRow,
              floorCol: lCol,
              floorCoordLabel: `Attached Left Latak (#${chosenPiece.pieceIndex})`,
              priority: 'high',
              color: '#7C3AED',
              slabIndex: currentSlabIdx,
            });
            slabLocalPieceCounter++;
            globalPieceCounter++;
          }

          // 5. Right Side Latak (Directly Right of Main Piece on Slab)
          if (al.hasRight) {
            const rRow = Math.floor((globalPieceCounter - 1) / colsPerFloorRow) + 1;
            const rCol = ((globalPieceCounter - 1) % colsPerFloorRow) + 1;
            placedPieces.push({
              instanceId: `${chosenPiece.instanceId}_bm_right`,
              pieceCode: `S${currentSlabIdx}-P${slabLocalPieceCounter}`,
              globalPieceNumber: globalPieceCounter,
              partId: chosenPiece.partId,
              pieceIndex: chosenPiece.pieceIndex,
              label: `🔗 Right Latak (${al.latakSize}"×${al.mainWidth}") — ${chosenPiece.label}`,
              x: mainX + al.mainLength + kerf,
              y: mainY,
              width: al.latakSize,
              height: al.mainWidth,
              originalLength: al.latakSize,
              originalWidth: al.mainWidth,
              rotated: false,
              isMirroredBookmatch: true,
              bookmatchTag: `🔗 BM-RIGHT #${chosenPiece.pieceIndex}`,
              installZone: chosenPiece.installZone,
              floorRow: rRow,
              floorCol: rCol,
              floorCoordLabel: `Attached Right Latak (#${chosenPiece.pieceIndex})`,
              priority: 'high',
              color: '#0D9488',
              slabIndex: currentSlabIdx,
            });
            slabLocalPieceCounter++;
            globalPieceCounter++;
          }
        } else {
          const placed: PlacedPiece = {
            instanceId: chosenPiece.instanceId,
            pieceCode,
            globalPieceNumber: globalPieceCounter,
            partId: chosenPiece.partId,
            pieceIndex: chosenPiece.pieceIndex,
            label: chosenPiece.label,
            x: finalX,
            y: finalY,
            width: placedW,
            height: placedH,
            originalLength: chosenPiece.length,
            originalWidth: chosenPiece.width,
            rotated: bestRotated,
            isMirroredBookmatch: chosenPiece.isMirroredBookmatch,
            bookmatchTag: chosenPiece.bookmatchTag,
            installZone: chosenPiece.installZone,
            floorRow,
            floorCol,
            floorCoordLabel,
            priority: chosenPiece.priority,
            color: chosenPiece.color,
            slabIndex: currentSlabIdx,
            templateType: chosenPiece.templateType,
            edgeProfile: chosenPiece.edgeProfile,
            sinkCutout: chosenPiece.sinkCutout,
            shapeCutType: chosenPiece.shapeCutType,
            cutDegree: chosenPiece.cutDegree,
            lazySusanDiameter: chosenPiece.lazySusanDiameter,
          };
          placedPieces.push(placed);
          slabLocalPieceCounter++;
          globalPieceCounter++;
        }

        const remRightW = targetRect.width - placedW - kerf;
        const remBottomH = targetRect.height - placedH - kerf;

        const splitHorizontallyFirst = placedW * remBottomH <= remRightW * placedH;

        if (splitHorizontallyFirst) {
          if (targetRect.height - placedH > 1e-4) {
            const cutY = targetRect.y + placedH;
            cuts.push({
              step: stepCounter++,
              slabIndex: currentSlabIdx,
              type: 'rip_horizontal',
              orientation: 'H',
              x1: targetRect.x,
              y1: cutY,
              x2: targetRect.x + targetRect.width,
              y2: cutY,
              position: cutY,
              length: targetRect.width,
              descriptionEn: `Rip Cut (H) at Y = ${formatNum(cutY)} ${unit} across ${formatNum(targetRect.width)} ${unit} for [${pieceCode}] "${chosenPiece.label}" ➔ ${floorCoordLabel}`,
              descriptionUr: `سیدھا کٹ (Y = ${formatNum(cutY)} ${unit}) برائے [${pieceCode}] "${chosenPiece.label}" ➔ فرش ${floorCoordLabel}`,
              targetPartLabel: chosenPiece.label,
            });
          }
          if (targetRect.width - placedW > 1e-4) {
            const cutX = targetRect.x + placedW;
            cuts.push({
              step: stepCounter++,
              slabIndex: currentSlabIdx,
              type: 'cross_vertical',
              orientation: 'V',
              x1: cutX,
              y1: targetRect.y,
              x2: cutX,
              y2: targetRect.y + placedH,
              position: cutX,
              length: placedH,
              descriptionEn: `Cross Cut (V) at X = ${formatNum(cutX)} ${unit} (${formatNum(placedW)}×${formatNum(placedH)}) for [${pieceCode}] ➔ ${floorCoordLabel}`,
              descriptionUr: `کراس کٹ (X = ${formatNum(cutX)} ${unit}) برائے [${pieceCode}] (${formatNum(placedW)}×${formatNum(placedH)}) ➔ فرش ${floorCoordLabel}`,
              targetPartLabel: chosenPiece.label,
            });
          }

          if (remRightW > 0.25 && placedH > 0.25) {
            freeRects.push({
              x: targetRect.x + placedW + kerf,
              y: targetRect.y,
              width: remRightW,
              height: placedH,
            });
          }
          if (remBottomH > 0.25 && targetRect.width > 0.25) {
            freeRects.push({
              x: targetRect.x,
              y: targetRect.y + placedH + kerf,
              width: targetRect.width,
              height: remBottomH,
            });
          }
        } else {
          if (targetRect.width - placedW > 1e-4) {
            const cutX = targetRect.x + placedW;
            cuts.push({
              step: stepCounter++,
              slabIndex: currentSlabIdx,
              type: 'cross_vertical',
              orientation: 'V',
              x1: cutX,
              y1: targetRect.y,
              x2: cutX,
              y2: targetRect.y + targetRect.height,
              position: cutX,
              length: targetRect.height,
              descriptionEn: `Vertical Cut at X = ${formatNum(cutX)} ${unit} for [${pieceCode}] "${chosenPiece.label}" ➔ ${floorCoordLabel}`,
              descriptionUr: `عمودی مین کٹ (X = ${formatNum(cutX)} ${unit}) برائے [${pieceCode}] ➔ فرش ${floorCoordLabel}`,
              targetPartLabel: chosenPiece.label,
            });
          }
          if (targetRect.height - placedH > 1e-4) {
            const cutY = targetRect.y + placedH;
            cuts.push({
              step: stepCounter++,
              slabIndex: currentSlabIdx,
              type: 'rip_horizontal',
              orientation: 'H',
              x1: targetRect.x,
              y1: cutY,
              x2: targetRect.x + placedW,
              y2: cutY,
              position: cutY,
              length: placedW,
              descriptionEn: `Horizontal Cut at Y = ${formatNum(cutY)} ${unit} (${formatNum(placedW)}×${formatNum(placedH)}) for [${pieceCode}] ➔ ${floorCoordLabel}`,
              descriptionUr: `افقی کراس کٹ (Y = ${formatNum(cutY)} ${unit}) برائے [${pieceCode}] ➔ فرش ${floorCoordLabel}`,
              targetPartLabel: chosenPiece.label,
            });
          }

          if (remBottomH > 0.25 && placedW > 0.25) {
            freeRects.push({
              x: targetRect.x,
              y: targetRect.y + placedH + kerf,
              width: placedW,
              height: remBottomH,
            });
          }
          if (remRightW > 0.25 && targetRect.height > 0.25) {
            freeRects.push({
              x: targetRect.x + placedW + kerf,
              y: targetRect.y,
              width: remRightW,
              height: targetRect.height,
            });
          }
        }
      }
    }

    if (placedPieces.length === 0) {
      const hasFutureTargetedPiece = remainingQueue.some(
        (item) => item.targetSlabNumber && item.targetSlabNumber > currentSlabIdx
      );
      if (hasFutureTargetedPiece && currentSlabIdx < maxSlabsCap) {
        currentSlabIdx++;
        continue;
      }
      break;
    }

    const classifiedFreeRects: FreeRect[] = freeRects.map((r) => {
      const fitsNormalOffcut = r.width >= minOffL - 1e-5 && r.height >= minOffW - 1e-5;
      const fitsRotatedOffcut = r.width >= minOffW - 1e-5 && r.height >= minOffL - 1e-5;
      return {
        ...r,
        isUsableOffcut: fitsNormalOffcut || fitsRotatedOffcut,
      };
    });

    const totalSlabAreaSqFt = toSqFt(slabL * slabW, unit);
    const usedAreaRaw = placedPieces.reduce((acc, p) => acc + p.width * p.height, 0);
    const usedAreaSqFt = toSqFt(usedAreaRaw, unit);

    const usableOffcutAreaRaw = classifiedFreeRects
      .filter((r) => r.isUsableOffcut)
      .reduce((acc, r) => acc + r.width * r.height, 0);
    const usableOffcutAreaSqFt = toSqFt(usableOffcutAreaRaw, unit);

    const scrapWasteAreaSqFt = Math.max(0, totalSlabAreaSqFt - usedAreaSqFt - usableOffcutAreaSqFt);
    const yieldPercent = totalSlabAreaSqFt > 0 ? (usedAreaSqFt / totalSlabAreaSqFt) * 100 : 0;
    const wastePercent =
      totalSlabAreaSqFt > 0 ? ((totalSlabAreaSqFt - usedAreaSqFt) / totalSlabAreaSqFt) * 100 : 0;

    slabsResult.push({
      slabIndex: currentSlabIdx,
      slabLength: slabL,
      slabWidth: slabW,
      usableX: trim,
      usableY: trim,
      usableLength: usableL,
      usableWidth: usableW,
      kerf,
      edgeTrim: trim,
      placedPieces,
      freeRects: classifiedFreeRects,
      defects: slabDefects,
      cuts,
      totalSlabAreaSqFt,
      usedAreaSqFt,
      usableOffcutAreaSqFt,
      scrapWasteAreaSqFt,
      yieldPercent,
      wastePercent,
    });

    currentSlabIdx++;
  }

  // 4-SLAB SYNCHRONIZED BOOKMATCH ENGINE:
  // True marble Bookmatch flooring requires 4 consecutive slabs (Slab #1, Slab #2, Slab #3, Slab #4) cut at the EXACT SAME (X, Y) coordinates!
  let finalSlabsResult: OptimizedSlabResult[] = slabsResult;
  if (fourSlabBookmatchMode && slabsResult.length > 0) {
    const quadSlabs: OptimizedSlabResult[] = [];
    let quadGlobalCounter = 1;
    let globalZoneIdx = 0;

    slabsResult.forEach((templateSlab, tIdx) => {
      // Assign a Zone Letter (A, B, C, D...) to each placed piece on the template slab
      const pieceZoneLetters = templateSlab.placedPieces.map(() => {
        const letter = String.fromCharCode(65 + (globalZoneIdx % 26));
        globalZoneIdx++;
        return letter;
      });

      for (let rep = 0; rep < 4; rep++) {
        const actualSlabIdx = tIdx * 4 + rep + 1;
        const orientLabel =
          rep === 0
            ? '1/4 Top-Left (سیدھا ↗)'
            : rep === 1
            ? '2/4 Top-Right (Mirror ↔ ↖)'
            : rep === 2
            ? '3/4 Bottom-Left (Mirror ↕ ↘)'
            : '4/4 Bottom-Right (Mirror ↔↕ ↙)';

        const clonedPieces: PlacedPiece[] = templateSlab.placedPieces.map((tp, pIdx) => {
          const zLetter = pieceZoneLetters[pIdx] || 'A';
          const siblingShift =
            manualPieceOffsets?.[tp.instanceId] ||
            manualPieceOffsets?.[`${tp.instanceId}_bm4_s2`] ||
            manualPieceOffsets?.[`${tp.instanceId}_bm4_s3`] ||
            manualPieceOffsets?.[`${tp.instanceId}_bm4_s4`];
          const syncedX = siblingShift
            ? Math.max(
                trim,
                Math.min(
                  Math.max(trim, templateSlab.slabLength - trim - tp.width),
                  tp.x + (Number(siblingShift.dx) || 0)
                )
              )
            : tp.x;
          const syncedY = siblingShift
            ? Math.max(
                trim,
                Math.min(
                  Math.max(trim, templateSlab.slabWidth - trim - tp.height),
                  tp.y + (Number(siblingShift.dy) || 0)
                )
              )
            : tp.y;

          const fRow = pIdx * 2 + (rep >= 2 ? 2 : 1);
          const fCol = (rep % 2) + 1;
          const instId = rep === 0 ? tp.instanceId : `${tp.instanceId}_bm4_s${rep + 1}`;
          const pCode = `S${actualSlabIdx}-${zLetter}`;

          return {
            ...tp,
            instanceId: instId,
            pieceCode: pCode,
            globalPieceNumber: quadGlobalCounter++,
            slabIndex: actualSlabIdx,
            x: syncedX,
            y: syncedY,
            isMirroredBookmatch: rep > 0,
            bookmatchTag: `🦋 ZONE-${zLetter} · SLAB #${actualSlabIdx} (${orientLabel})`,
            floorRow: fRow,
            floorCol: fCol,
            floorCoordLabel: `BM Set ${zLetter} · R${fRow}-C${fCol} (${orientLabel})`,
          };
        });

        const clonedCuts: CutOperation[] = templateSlab.cuts.map((c) => ({
          ...c,
          slabIndex: actualSlabIdx,
        }));

        quadSlabs.push({
          ...templateSlab,
          slabIndex: actualSlabIdx,
          placedPieces: clonedPieces,
          cuts: clonedCuts,
        });
      }
    });

    finalSlabsResult = quadSlabs;
  }

  const totalSlabsUsed = finalSlabsResult.length;
  const extraSlabsNeeded = Math.max(0, totalSlabsUsed - availableSlabs);
  const totalPiecesPlaced = finalSlabsResult.reduce((s, sl) => s + sl.placedPieces.length, 0);
  const totalPiecesRequested = fourSlabBookmatchMode
    ? totalPiecesPlaced
    : totalIndividualPiecesRequested || expanded.length;

  const totalSlabAreaSqFt = finalSlabsResult.reduce((s, sl) => s + sl.totalSlabAreaSqFt, 0);
  const totalUsedAreaSqFt = finalSlabsResult.reduce((s, sl) => s + sl.usedAreaSqFt, 0);
  const totalUsableOffcutAreaSqFt = finalSlabsResult.reduce((s, sl) => s + sl.usableOffcutAreaSqFt, 0);
  const totalScrapWasteAreaSqFt = finalSlabsResult.reduce((s, sl) => s + sl.scrapWasteAreaSqFt, 0);

  const overallYieldPercent =
    totalSlabAreaSqFt > 0 ? (totalUsedAreaSqFt / totalSlabAreaSqFt) * 100 : 0;
  const overallWastePercent =
    totalSlabAreaSqFt > 0 ? ((totalSlabAreaSqFt - totalUsedAreaSqFt) / totalSlabAreaSqFt) * 100 : 0;

  const rate = Math.max(0, Number(slabConfig.ratePerSqFt) || 0);

  return {
    slabs: finalSlabsResult,
    unplacedPieces,
    totalSlabsUsed,
    totalSlabsAvailable: availableSlabs,
    extraSlabsNeeded,
    totalPiecesRequested,
    totalPiecesPlaced,
    totalSlabAreaSqFt,
    totalUsedAreaSqFt,
    totalUsableOffcutAreaSqFt,
    totalScrapWasteAreaSqFt,
    overallYieldPercent,
    overallWastePercent,
    estimatedTotalSlabCostPKR: Math.round(totalSlabAreaSqFt * rate),
    estimatedNetUsedCostPKR: Math.round(totalUsedAreaSqFt * rate),
    estimatedWasteCostPKR: Math.round((totalSlabAreaSqFt - totalUsedAreaSqFt) * rate),
  };
}

interface CuttingOptimizerProProps {
  marbles?: Marble[];
  initialMarble?: Marble;
  initialVariant?: MarbleVariant;
  isCustomerMode?: boolean;
  initialCustomSlabImageUrl?: string;
  initialCustomSlabLabel?: string;
  initialCustomSlabLength?: number;
  initialCustomSlabWidth?: number;
  initialCustomFrameScale?: number;
  initialCustomFrameOffsetX?: number;
  initialCustomFrameOffsetY?: number;
  initialCustomFrameRotation?: number;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onSaveToCustomerQuote?: (data: {
    total: number;
    details: {
      materialName: string;
      lotId: string;
      unit: UnitType;
      slabConfig: StockSlabConfig;
      parts: CutPartInput[];
      summary: OptimizationSummary;
      totalUsedAreaSqFt: number;
      totalSlabAreaSqFt: number;
      totalSlabsUsed: number;
    };
    variant?: MarbleVariant;
  }) => void;
  onCancel?: () => void;
  onBackToHome?: () => void;
  onOpenMaterialPicker?: () => void;
  resumeSavedSession?: boolean;
  onSendToManualOrder?: (payload: {
    materialName: string;
    lotId: string;
    unit: UnitType;
    slabConfig: StockSlabConfig;
    parts: CutPartInput[];
    summary: OptimizationSummary;
  }) => void;
}

export function CuttingOptimizerPro({
  marbles = [],
  initialMarble,
  initialVariant,
  isCustomerMode = false,
  initialCustomSlabImageUrl,
  initialCustomSlabLabel,
  initialCustomSlabLength,
  initialCustomSlabWidth,
  initialCustomFrameScale,
  initialCustomFrameOffsetX,
  initialCustomFrameOffsetY,
  initialCustomFrameRotation,
  onFullscreenChange,
  onSaveToCustomerQuote,
  onCancel,
  onBackToHome,
  onOpenMaterialPicker,
  resumeSavedSession = false,
  onSendToManualOrder,
}: CuttingOptimizerProProps) {
  const { toast } = useToast();
  const [unit, setUnit] = useState<UnitType>('in');

  // 1. Stock Slab State (Default 110 x 60 as mentioned by user example!)
  const [slabConfig, setSlabConfig] = useState<StockSlabConfig>(() => ({
    materialName:
      initialCustomSlabLabel ||
      initialMarble?.name ||
      'Ziarat White / Statuario Veined Slab',
    lotId: initialMarble ? `LOT-${initialMarble.id.slice(0, 8).toUpperCase()}` : 'LOT-2026-A1',
    length: initialCustomSlabLength || 110, // 110 inches length
    width: initialCustomSlabWidth || 60, // 60 inches width
    quantity: 6, // Block slabs count (supports 1 to 50+)
    kerf: 0.15,
    edgeTrim: 0.5,
    minOffcutLength: 12,
    minOffcutWidth: 12,
    ratePerSqFt:
      Number(initialVariant?.salePrice || initialVariant?.price || initialMarble?.variants?.[0]?.price) || 450,
  }));

  // Master Default Slab Image + Per-Slab Individual Overrides (for 1..50 slabs in a block!)
  const [slabImageUrl, setSlabImageUrl] = useState<string>(() =>
    initialCustomSlabImageUrl ||
    initialMarble?.imageUrl ||
    createSyntheticVeinedSlabDataUrl('statuario')
  );
  const [slabImageSourceLabel, setSlabImageSourceLabel] = useState<string>(
    initialCustomSlabLabel
      ? `${initialCustomSlabLabel} (${initialCustomSlabLength || 110}×${initialCustomSlabWidth || 60})`
      : initialMarble?.name
      ? `${initialMarble.name} (110×60)`
      : 'Ziarat White Veined Slab (110×60)'
  );
  // Master Frame Calibration State
  const [masterFrameScale, setMasterFrameScale] = useState<number>(initialCustomFrameScale ?? 100);
  const [masterFrameOffsetX, setMasterFrameOffsetX] = useState<number>(initialCustomFrameOffsetX ?? 0);
  const [masterFrameOffsetY, setMasterFrameOffsetY] = useState<number>(initialCustomFrameOffsetY ?? 0);
  const [masterFrameRotation, setMasterFrameRotation] = useState<number>(initialCustomFrameRotation ?? 0);

  // Per-slab overrides map: slabNumber (1..50) -> IndividualSlabOverride
  const [slabOverrides, setSlabOverrides] = useState<Record<number, IndividualSlabOverride>>({
    1: {
      slabNumber: 1,
      imageUrl: initialCustomSlabImageUrl || undefined,
      sourceLabel: initialCustomSlabLabel || undefined,
      frameScale: initialCustomFrameScale ?? 100,
      frameOffsetX: initialCustomFrameOffsetX ?? 0,
      frameOffsetY: initialCustomFrameOffsetY ?? 0,
      frameRotation: initialCustomFrameRotation ?? 0,
      mirrorMode: 'none',
      defects: [],
    },
    2: {
      slabNumber: 2,
      imageUrl: initialCustomSlabImageUrl || undefined,
      sourceLabel: initialCustomSlabLabel ? `${initialCustomSlabLabel} (Bookmatch)` : undefined,
      frameScale: initialCustomFrameScale ?? 100,
      frameOffsetX: initialCustomFrameOffsetX ?? 0,
      frameOffsetY: initialCustomFrameOffsetY ?? 0,
      frameRotation: initialCustomFrameRotation ?? 0,
      mirrorMode: 'flip_h', // Bookmatch pair with Slab #1 by default
      defects: [],
    },
  });

  // Interactive Slab Frame Calibration Modal State (Opens automatically when user uploads/snaps a photo!)
  const [isFrameCalibratorOpen, setIsFrameCalibratorOpen] = useState<boolean>(false);
  const [calibratingSlabTarget, setCalibratingSlabTarget] = useState<number>(0); // 0 = All / Master Slab, 1..50 = Specific Slab #
  const [tempCalibImageUrl, setTempCalibImageUrl] = useState<string>('');
  const [tempCalibLabel, setTempCalibLabel] = useState<string>('');
  const [tempCalibLength, setTempCalibLength] = useState<number>(110);
  const [tempCalibWidth, setTempCalibWidth] = useState<number>(60);
  const [tempCalibScale, setTempCalibScale] = useState<number>(100);
  const [tempCalibOffsetX, setTempCalibOffsetX] = useState<number>(0);
  const [tempCalibOffsetY, setTempCalibOffsetY] = useState<number>(0);
  const [tempCalibRotation, setTempCalibRotation] = useState<number>(0);
  const [tempCalibMirror, setTempCalibMirror] = useState<'none' | 'flip_h' | 'flip_v' | 'flip_both'>('none');
  const [tempCalibDefects, setTempCalibDefects] = useState<SlabDefectZone[]>([]);
  const [calibCrackTool, setCalibCrackTool] = useState<'move_photo' | 'pencil_draw' | 'eraser' | 'box_click'>('move_photo');
  const [activePencilPoints, setActivePencilPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawingPencil, setIsDrawingPencil] = useState<boolean>(false);
  const [pencilStrokeColor, setPencilStrokeColor] = useState<string>('#EF4444');
  const [calibCrackWid, setCalibCrackWid] = useState<number>(4);
  const [calibCrackLen, setCalibCrackLen] = useState<number>(16);
  const [calibCrackX, setCalibCrackX] = useState<number>(20);
  const [calibCrackY, setCalibCrackY] = useState<number>(15);
  const [isDraggingFrame, setIsDraggingFrame] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffX: number; startOffY: number }>({
    x: 0,
    y: 0,
    startOffX: 0,
    startOffY: 0,
  });

  // Crack / Defect Adding State per Slab
  const [defectSlabTarget, setDefectSlabTarget] = useState<number>(1);
  const [newDefectX, setNewDefectX] = useState<number>(30);
  const [newDefectY, setNewDefectY] = useState<number>(20);
  const [newDefectW, setNewDefectW] = useState<number>(14);
  const [newDefectH, setNewDefectH] = useState<number>(10);

  // Default to 0.10 (Crystal HD Stone View) so the real marble photo & veins are 100% crisp and visible!
  const [pieceOverlayOpacity, setPieceOverlayOpacity] = useState<number>(0.10);
  const [hdContrastBoost, setHdContrastBoost] = useState<boolean>(true);
  const [showCadCrosshairs, setShowCadCrosshairs] = useState<boolean>(true);

  // Interface Language & Main Screen State ('en' = English by default, 'ur' = Urdu on toggle)
  const [cadLang, setCadLang] = useState<'en' | 'ur'>('en');
  const [simpleMainScreen, setSimpleMainScreen] = useState<
    'floor_planner' | 'slab_cutter' | 'stock_slabs' | 'excel_bill'
  >('floor_planner');
  const tr = (en: string, ur: string) =>
    cadLang === 'ur'
      ? ur
      : en
          .replace(/\s*\([^)]*[\u0600-\u06FF][^)]*\)/g, '')
          .replace(/\s*—\s*[\u0600-\u06FF].*$/g, '');

  // AutoCAD Top Dropdown Menu State ('none' | 'slab_setup' | 'cut_pieces' | 'block_defects' | 'view_hd' | 'presets_export')
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<
    'none' | 'slab_setup' | 'cut_pieces' | 'block_defects' | 'view_hd' | 'presets_export'
  >('none');

  // Interactive On-Canvas CAD Tool Mode ('select_move' | 'add_piece' | 'mark_crack')
  const [canvasToolMode, setCanvasToolMode] = useState<
    'select_move' | 'add_piece' | 'mark_crack'
  >('select_move');
  const [quickPartLabel, setQuickPartLabel] = useState<string>('Custom Cut Piece');
  const [quickPartLen, setQuickPartLen] = useState<number>(48);
  const [quickPartWid, setQuickPartWid] = useState<number>(24);
  const [quickPartQty, setQuickPartQty] = useState<number>(2);

  // Floor Fixing & Interactive Room Bookmatch Setter State (Diagram #2)
  const [floorColsCount, setFloorColsCount] = useState<number>(2);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [tileFlipOverrides, setTileFlipOverrides] = useState<
    Record<string, { flipH: boolean; flipV: boolean; rot90: boolean; rotDeg?: number }>
  >({});
  const [showFloorSeamLines, setShowFloorSeamLines] = useState<boolean>(true);
  const [roomDiagramMode, setRoomDiagramMode] = useState<'slab_pieces' | 'full_room_planner'>('slab_pieces');
  const [hideLatakInRoom, setHideLatakInRoom] = useState<boolean>(true);
  const [swapSourceInstanceId, setSwapSourceInstanceId] = useState<string | null>(null);
  const [customRoomOrder, setCustomRoomOrder] = useState<string[]>([]);
  // Full Room Tile & Marble Bookmatch Planner State
  const [roomPlanWidthFt, setRoomPlanWidthFt] = useState<number>(12);
  const [roomPlanLengthFt, setRoomPlanLengthFt] = useState<number>(16);
  const [roomTileWidIn, setRoomTileWidIn] = useState<number>(24);
  const [roomTileLenIn, setRoomTileLenIn] = useState<number>(48);
  const [roomBmPattern, setRoomBmPattern] = useState<'diamond_4way' | 'mirror_2way_h' | 'mirror_2way_v' | 'straight_vein' | 'checker_90' | 'center_round_table'>('diamond_4way');
  const [roomCropOffsetX, setRoomCropOffsetX] = useState<number>(20);
  const [roomCropOffsetY, setRoomCropOffsetY] = useState<number>(20);
  const [roomCenterTableDiam, setRoomCenterTableDiam] = useState<number>(48);
  const [roomTileCustomFlips, setRoomTileCustomFlips] = useState<Record<string, { flipH?: boolean; flipV?: boolean; rot90?: boolean }>>({});

  // Live Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcFileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const bulkSlabsInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetSlabRef = useRef<number>(0); // 0 = Master/All, 1..50 = Specific Slab #

  // Bookmatch Studio State
  const [bookmatchMode, setBookmatchMode] = useState<'2way_h' | '2way_v' | '4way_quad'>('4way_quad');
  const [bmPanelLength, setBmPanelLength] = useState<number>(52);
  const [bmPanelWidth, setBmPanelWidth] = useState<number>(28);
  const [bmShowSeam, setBmShowSeam] = useState<boolean>(true);
  const [bmInvertMirror, setBmInvertMirror] = useState<boolean>(false);
  const [bmZoom, setBmZoom] = useState<number>(100);
  const [bmOffsetX, setBmOffsetX] = useState<number>(50);
  const [bmOffsetY, setBmOffsetY] = useState<number>(50);

  // 2. Required Parts / Cutting List State (2D Slab Cutting & Bookmatch Floor/Wall Layout)
  const [parts, setParts] = useState<CutPartInput[]>([
    {
      id: 'part-1',
      label: 'Main Bookmatch Floor Slab',
      length: 52,
      width: 28,
      quantity: 6,
      allowRotation: false,
      isBookmatchedPair: true,
      installZone: 'floor',
      priority: 'high',
      color: PART_PALETTE[3],
    },
    {
      id: 'part-2',
      label: 'Room Floor Slab',
      length: 48,
      width: 24,
      quantity: 4,
      allowRotation: false,
      isBookmatchedPair: false,
      installZone: 'floor',
      priority: 'high',
      color: PART_PALETTE[0],
    },
    {
      id: 'part-3',
      label: 'Stair Step / Border',
      length: 48,
      width: 12,
      quantity: 6,
      allowRotation: true,
      isBookmatchedPair: false,
      installZone: 'stairs',
      priority: 'normal',
      color: PART_PALETTE[2],
    },
  ]);

  // Workstation UI States: Default isLeftDockCollapsed = false so Step 1 (Stock Slab) and Step 2 (Cutting Pieces) are clearly visible!
  const [isLeftDockCollapsed, setIsLeftDockCollapsed] = useState<boolean>(false);

  // Saved Stock Slab & Offcut Inventory System State
  const [savedStockList, setSavedStockList] = useState<SavedStockSlabItem[]>([
    {
      id: 'stock-default-zw-104',
      category: 'full_slab_lot',
      materialName: 'Ziarat White Supreme',
      lotId: 'LOT-ZW-104',
      width: 60,
      length: 110,
      quantity: 12,
      ratePerSqFt: 480,
      kerf: 0.2,
      edgeTrim: 0.5,
      unit: 'in',
      slabImageUrl: '/images/ziarat_white_slab.png',
      slabImageSourceLabel: 'Ziarat White Veined Slab (60×110)',
      masterFrameScale: 100,
      masterFrameOffsetX: 0,
      masterFrameOffsetY: 0,
      masterFrameRotation: 0,
      locationRack: 'Godown A · Stand #1',
      notes: '4-Slab Bookmatch A/B/C/D Ready Lot',
      savedAt: 'Today, 09:30 AM',
    },
    {
      id: 'stock-default-bg-208',
      category: 'full_slab_lot',
      materialName: 'Black & Gold (Michael Angelo)',
      lotId: 'LOT-BG-208',
      width: 58,
      length: 106,
      quantity: 8,
      ratePerSqFt: 650,
      kerf: 0.2,
      edgeTrim: 0.5,
      unit: 'in',
      slabImageUrl: '/images/black_gold_slab.png',
      slabImageSourceLabel: 'Black & Gold Slab (58×106)',
      masterFrameScale: 100,
      masterFrameOffsetX: 0,
      masterFrameOffsetY: 0,
      masterFrameRotation: 0,
      locationRack: 'Godown A · Stand #4',
      notes: 'High-gloss golden vein bookmatch block',
      savedAt: 'Today, 10:15 AM',
    },
    {
      id: 'stock-default-offcut-1',
      category: 'usable_offcut',
      materialName: 'Ziarat White Supreme (Leftover Piece)',
      lotId: 'OFFCUT-ZW-S1',
      width: 24,
      length: 62,
      quantity: 2,
      ratePerSqFt: 350,
      kerf: 0.2,
      edgeTrim: 0,
      unit: 'in',
      slabImageUrl: '/images/ziarat_white_slab.png',
      slabImageSourceLabel: 'Saved Offcut from LOT-ZW-104',
      masterFrameScale: 100,
      masterFrameOffsetX: 0,
      masterFrameOffsetY: 0,
      masterFrameRotation: 0,
      locationRack: 'Offcut Rack #2 (Stairs / Vanity)',
      notes: 'Reusable for Stair Steps, Risers, or Vanity Tops',
      savedAt: 'Today, 11:00 AM',
    },
  ]);
  const [isStockManagerOpen, setIsStockManagerOpen] = useState<boolean>(false);
  const [stockFilterType, setStockFilterType] = useState<'all' | 'full_slab_lot' | 'usable_offcut'>('all');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [stockLocationRack, setStockLocationRack] = useState<string>('Godown A · Stand #1');
  const [stockNotesInput, setStockNotesInput] = useState<string>('');
  const [isStockLoadedFromIDB, setIsStockLoadedFromIDB] = useState<boolean>(false);
  const stockJsonImportRef = useRef<HTMLInputElement>(null);

  // Multi-Stock Combination State (ایک سے زائد سٹاک جمع کرنے کا سسٹم)
  const [selectedMultiStockIds, setSelectedMultiStockIds] = useState<string[]>([
    'stock-default-zw-104',
  ]);
  // Collapsible Quick Templates in Step 2 so buttons aren't cluttered
  const [showStep2QuickPresets, setShowStep2QuickPresets] = useState<boolean>(false);
  // 4-Slab Bookmatch Selection Mode: 'auto' (Auto consecutive slabs) vs 'manual' (User picks which 4 slabs) + Full-Slab toggle
  const [fourSlabSelectionMode, setFourSlabSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [manualFourSlabNums, setManualFourSlabNums] = useState<[number, number, number, number]>([
    1, 2, 3, 4,
  ]);
  const [isFullSlabBookmatch, setIsFullSlabBookmatch] = useState<boolean>(false);

  // AutoCAD Customizable Bars & Dock Layout State (Movable, Dockable, Resizable Bars)
  const [cadWorkspace, setCadWorkspace] = useState<CadWorkspaceState>(DEFAULT_CAD_WORKSPACE_STATE);
  const [isDraggingSidebarSplitter, setIsDraggingSidebarSplitter] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('stone_expert_autocad_workspace_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CadWorkspaceState>;
        if (parsed && parsed.bars) {
          setCadWorkspace((prev) => ({
            ...prev,
            ...parsed,
            bars: {
              ...prev.bars,
              ...parsed.bars,
            },
          }));
        }
      }
    } catch {
      // ignore localStorage read errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'stone_expert_autocad_workspace_v1',
        JSON.stringify(cadWorkspace)
      );
    } catch {
      // ignore localStorage write errors
    }
  }, [cadWorkspace]);

  const handleUpdateCadBar = React.useCallback(
    (barId: CadBarId, patch: Partial<CadBarConfig>) => {
      setCadWorkspace((prev) => ({
        ...prev,
        bars: {
          ...prev.bars,
          [barId]: {
            ...prev.bars[barId],
            ...patch,
          },
        },
      }));
    },
    []
  );

  const handleResetCadWorkspace = React.useCallback(() => {
    setCadWorkspace(DEFAULT_CAD_WORKSPACE_STATE);
    setIsLeftDockCollapsed(false);
  }, []);

  useEffect(() => {
    if (!isDraggingSidebarSplitter) return;
    const onMove = (e: MouseEvent) => {
      const w = Math.max(600, window.innerWidth);
      const rawPct =
        cadWorkspace.sidebarPosition === 'right'
          ? ((w - e.clientX) / w) * 100
          : (e.clientX / w) * 100;
      const clamped = Math.max(22, Math.min(55, Math.round(rawPct)));
      setCadWorkspace((prev) => ({ ...prev, sidebarWidthPercent: clamped }));
    };
    const onUp = () => setIsDraggingSidebarSplitter(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingSidebarSplitter, cadWorkspace.sidebarPosition]);

  const [manualPieceOffsets, setManualPieceOffsets] = useState<
    Record<string, { dx: number; dy: number }>
  >({});
  const [draggingPiece, setDraggingPiece] = useState<{
    instanceId: string;
    startClientX: number;
    startClientY: number;
    origDx: number;
    origDy: number;
    scale: number;
  } | null>(null);

  // 4-Corner Perspective Correction State inside Slab Calibrator
  const [isPerspectiveMode, setIsPerspectiveMode] = useState<boolean>(false);
  const [isRectifyingPerspective, setIsRectifyingPerspective] = useState<boolean>(false);
  const [perspectiveCorners, setPerspectiveCorners] = useState<
    [CornerPoint, CornerPoint, CornerPoint, CornerPoint]
  >([
    { x: 0.06, y: 0.08 }, // Top-Left
    { x: 0.94, y: 0.06 }, // Top-Right
    { x: 0.96, y: 0.94 }, // Bottom-Right
    { x: 0.04, y: 0.92 }, // Bottom-Left
  ]);
  const [idbSavedAt, setIdbSavedAt] = useState<string | null>(null);

  // Visual Diagram Controls — Only enable 4-Slab Bookmatch when Bookmatch category is selected so each category opens its own clean, large diagram!
  const [fourSlabBookmatchMode, setFourSlabBookmatchMode] = useState<boolean>(false);
  const [activeBmZoneIdx, setActiveBmZoneIdx] = useState<number>(0);
  const [activeSlabIndex, setActiveSlabIndex] = useState<number>(0);
  const [viewAllSlabs, setViewAllSlabs] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenTarget, setFullscreenTarget] = useState<
    'none' | 'workstation' | 'slab_diagram' | 'floor_diagram'
  >('none');
  const [isCalibratorFullscreen, setIsCalibratorFullscreen] = useState<boolean>(false);
  const [showKerfLines, setShowKerfLines] = useState<boolean>(true);
  const [showOffcutLabels, setShowOffcutLabels] = useState<boolean>(true);
  const [hoveredPiece, setHoveredPiece] = useState<PlacedPiece | null>(null);
  const [inDiagram1Popup, setInDiagram1Popup] = useState<'slab' | 'piece' | 'add' | 'tools' | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<
    'dual_diagrams' | 'stock_inventory' | 'slab_manager' | 'bookmatch' | 'schedule' | 'bom'
  >('dual_diagrams');
  const [activeCategoryPreset, setActiveCategoryPreset] = useState<
    'flooring' | 'bookmatch_wall' | 'stairs' | 'kitchen' | 'vanity' | 'window_sill'
  >('flooring');
  const [isSidebarStockExpanded, setIsSidebarStockExpanded] = useState<boolean>(true);
  const [expandedSidebarPartId, setExpandedSidebarPartId] = useState<string | null>(null);
  const [isPdfPreviewModalOpen, setIsPdfPreviewModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const bmSlabBoxRef = useRef<HTMLDivElement>(null);
  const [isDraggingBmBox, setIsDraggingBmBox] = useState<boolean>(false);
  const [isResizingBmBox, setIsResizingBmBox] = useState<boolean>(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [nlpCommandText, setNlpCommandText] = useState<string>('');
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);

  // ============================================================================
  // ROPE-LIGHT BOOKMATCHED STAIRCASE (روپ لائٹ بک میچ سیڑھی: سٹیپ + لٹک + رائزر) STATES
  // ============================================================================
  const [stairStepsCount, setStairStepsCount] = useState<number>(16);
  const [stairTreadDepth, setStairTreadDepth] = useState<number>(12);
  const [stairStepLength, setStairStepLength] = useState<number>(42);
  const [stairHasRopeLightLatak, setStairHasRopeLightLatak] = useState<boolean>(true);
  const [stairLatakHeight, setStairLatakHeight] = useState<number>(2);
  const [stairLatakFront, setStairLatakFront] = useState<boolean>(true);
  const [stairLatakLeft, setStairLatakLeft] = useState<boolean>(false);
  const [stairLatakRight, setStairLatakRight] = useState<boolean>(false);
  const [stairLatakBack, setStairLatakBack] = useState<boolean>(false);
  const [stairHasRiser, setStairHasRiser] = useState<boolean>(true);
  const [stairRiserHeight, setStairRiserHeight] = useState<number>(6);
  const [stairIncludeLanding, setStairIncludeLanding] = useState<boolean>(true);
  const [stairBookmatchMode, setStairBookmatchMode] = useState<boolean>(true);

  const handleApplyRopeLightStairsToSlabs = (overrides?: {
    steps?: number;
    treadDepth?: number;
    stepLen?: number;
    hasLatak?: boolean;
    latakH?: number;
    latakF?: boolean;
    latakL?: boolean;
    latakR?: boolean;
    latakB?: boolean;
    hasRiser?: boolean;
    riserH?: number;
    includeLanding?: boolean;
    bmMode?: boolean;
  }) => {
    const steps = Math.max(1, overrides?.steps ?? stairStepsCount);
    const treadD = Math.max(6, overrides?.treadDepth ?? stairTreadDepth);
    const stepL = Math.max(18, overrides?.stepLen ?? stairStepLength);
    const hasLatak = overrides?.hasLatak ?? stairHasRopeLightLatak;
    const latakH = Math.max(1, overrides?.latakH ?? stairLatakHeight);
    const lFront = overrides?.latakF ?? stairLatakFront;
    const lLeft = overrides?.latakL ?? stairLatakLeft;
    const lRight = overrides?.latakR ?? stairLatakRight;
    const lBack = overrides?.latakB ?? stairLatakBack;
    const hasRiser = overrides?.hasRiser ?? stairHasRiser;
    const riserH = Math.max(3, overrides?.riserH ?? stairRiserHeight);
    const incLanding = overrides?.includeLanding ?? stairIncludeLanding;
    const bmMode = overrides?.bmMode ?? stairBookmatchMode;

    const slabW = Math.max(24, Number(slabConfig.width) || 60);
    const slabL = Math.max(48, Number(slabConfig.length) || 110);
    const kerf = Number(slabConfig.kerf) || 0.125;

    // Height of 1 complete sequential step set (Step Tread + Rope-Light Latak + Riser)
    const perStepSetHeight =
      treadD +
      (hasLatak && lFront ? latakH + kerf : 0) +
      (hasRiser ? riserH + kerf : 0) +
      kerf;
    const colsAcrossWidth = Math.max(1, Math.floor((slabL + kerf) / (stepL + kerf)));
    const rowsAlongSlab = Math.max(1, Math.floor((slabW + kerf) / perStepSetHeight));
    const stepsPerSlab = Math.max(1, colsAcrossWidth * rowsAlongSlab);
    const requiredSlabs = Math.max(2, Math.ceil(steps / stepsPerSlab) + (incLanding ? 1 : 0));

    // Update slabConfig quantity & alternating Bookmatch A/B mirror overrides
    setSlabConfig((prev) => ({
      ...prev,
      quantity: Math.max(prev.quantity, requiredSlabs),
    }));

    if (bmMode) {
      setSlabOverrides((prev) => {
        const next = { ...prev };
        for (let s = 1; s <= requiredSlabs; s++) {
          next[s] = {
            ...(next[s] || {
              slabNumber: s,
              imageUrl: slabImageUrl,
              sourceLabel: `${slabConfig.materialName} #${s}`,
              frameScale: masterFrameScale,
              frameOffsetX: masterFrameOffsetX,
              frameOffsetY: masterFrameOffsetY,
              frameRotation: masterFrameRotation,
              defects: [],
            }),
            mirrorMode: s % 2 === 0 ? 'flip_h' : 'none',
          };
        }
        return next;
      });
    }

    const nextParts: CutPartInput[] = [
      {
        id: 'stair-tread-bm',
        label: hasLatak
          ? `Rope-Light Stair Step + Latak (روپ لائٹ سیڑھی سٹیپ + لٹک)`
          : `Stair Step Tread (سیڑھی سٹیپ / ٹپہ)`,
        width: treadD,
        length: stepL,
        quantity: steps,
        allowRotation: false,
        isBookmatchedPair: bmMode,
        latakCutMode: 'bookmatch_attached',
        latakMode: 'bookmatch',
        latakSize: hasLatak ? latakH : 0,
        latakWidth: hasLatak ? latakH : 0,
        latakSides: hasLatak ? 'front_only' : 'none',
        latakFront: hasLatak ? lFront : false,
        latakLeft: hasLatak ? lLeft : false,
        latakRight: hasLatak ? lRight : false,
        latakBack: hasLatak ? lBack : false,
        installZone: 'stairs',
        priority: 'high',
        color: PART_PALETTE[0],
      },
    ];

    if (hasRiser) {
      nextParts.push({
        id: 'stair-riser-bm',
        label: `Bookmatch Stair Riser (سیڑھی رائزر)`,
        width: riserH,
        length: stepL,
        quantity: steps,
        allowRotation: false,
        isBookmatchedPair: bmMode,
        latakSides: 'none',
        latakSize: 0,
        installZone: 'stairs',
        priority: 'high',
        color: PART_PALETTE[1],
      });
    }

    if (incLanding) {
      nextParts.push({
        id: 'stair-landing-bm',
        label: `Stair Main Landing / Chowki (مین چونکی)`,
        width: stepL,
        length: stepL,
        quantity: 1,
        allowRotation: false,
        isBookmatchedPair: bmMode,
        latakCutMode: 'bookmatch_attached',
        latakSize: hasLatak ? latakH : 0,
        latakFront: hasLatak,
        installZone: 'stairs',
        priority: 'high',
        color: PART_PALETTE[2],
      });
    }

    setParts(nextParts);
  };

  const handleExecuteNlpCommand = (rawInput?: string) => {
    const txt = (rawInput ?? nlpCommandText).trim();
    if (!txt) return;

    // 1. Parse Sootar blade kerf (e.g., "Set blade kerf to 1.5 sootar")
    const sootarMatch = txt.match(/(\d+(?:\.\d+)?)\s*(?:sootar|sutar|سوتر)/i);
    if (sootarMatch) {
      const sootarVal = parseFloat(sootarMatch[1]);
      const kerfInches = Number((sootarVal * 0.125).toFixed(4));
      setSlabConfig((prev) => ({ ...prev, kerf: kerfInches }));
    }

    // 2. Parse Stock Slab dimensions (e.g., "120 by 65 slab")
    const slabMatch =
      txt.match(/(\d+(?:\.\d+)?)\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)\s*(?:slab|سلیب)/i) ||
      txt.match(/(?:slab|سلیب)\s*(\d+(?:\.\d+)?)\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)/i);
    if (slabMatch) {
      const sL = Math.max(12, parseFloat(slabMatch[1]) || 120);
      const sW = Math.max(12, parseFloat(slabMatch[2]) || 65);
      setSlabConfig((prev) => ({ ...prev, length: sL, width: sW }));
    }

    // 3. Parse Cut Piece clauses (e.g., "3 steps 48 by 12 aur 1 kitchen top 96 by 24")
    const clauses = txt.split(/\b(?:and|aur|اور|,|\+)\b/i);
    const addedParts: CutPartInput[] = [];
    clauses.forEach((seg, idx) => {
      if (/slab|سلیب/i.test(seg) && !/step|riser|kitchen|vanity|top|wall|floor|clad/i.test(seg)) {
        return;
      }
      const dimMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)/i);
      if (!dimMatch) return;
      const len = Math.max(2, parseFloat(dimMatch[1]) || 24);
      const wid = Math.max(2, parseFloat(dimMatch[2]) || 12);
      const beforeText = seg.slice(0, dimMatch.index);
      const qtyMatch = beforeText.match(/(\d+)/);
      const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;

      let installZone: 'floor' | 'wall' | 'stairs' | 'counter' = 'counter';
      let label = 'Custom Cut Piece';
      if (/step|tread|سیڑھی/i.test(seg)) {
        installZone = 'stairs';
        label = 'Stair Step Tread';
      } else if (/riser|رائزر/i.test(seg)) {
        installZone = 'stairs';
        label = 'Stair Riser';
      } else if (/vanity|وینٹی/i.test(seg)) {
        installZone = 'counter';
        label = 'Bathroom Vanity Top';
      } else if (/kitchen|counter|کچن/i.test(seg)) {
        installZone = 'counter';
        label = 'Kitchen Countertop';
      } else if (/wall|clad|دیوار/i.test(seg)) {
        installZone = 'wall';
        label = 'Wall Cladding Panel';
      } else if (/floor|فرش/i.test(seg)) {
        installZone = 'floor';
        label = 'Flooring Panel';
      }

      addedParts.push({
        id: `nlp-${Date.now()}-${idx}`,
        label,
        length: len,
        width: wid,
        quantity: qty,
        allowRotation: true,
        isBookmatchedPair: false,
        installZone,
        priority: 'high',
        color: PART_PALETTE[(parts.length + idx) % PART_PALETTE.length],
      });
    });

    if (addedParts.length > 0) {
      setParts((prev) => [...prev, ...addedParts]);
    }
    setNlpCommandText('');
    toast({
      title: tr('Command Parsed & Optimized', 'کمانڈ کے مطابق کٹنگ اپ ڈیٹ ہو گئی'),
      description: txt,
    });
  };

  const handleStartVoiceCommand = () => {
    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast({
        title: tr('Type Command Below', 'کمانڈ ٹائپ کریں'),
        description: tr(
          'Browser voice recognition unavailable — type your Urdu/English command in the box.',
          'براؤزر میں مائیک دستیاب نہیں، باکس میں کمانڈ لکھیں۔'
        ),
      });
      return;
    }
    try {
      const rec = new SpeechRec() as {
        lang: string;
        start: () => void;
        onresult: ((e: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      rec.lang = cadLang === 'ur' ? 'ur-PK' : 'en-US';
      setIsListeningVoice(true);
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        setNlpCommandText(transcript);
        handleExecuteNlpCommand(transcript);
        setIsListeningVoice(false);
      };
      rec.onerror = () => setIsListeningVoice(false);
      rec.onend = () => setIsListeningVoice(false);
      rec.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const diagramContainerRef = useRef<HTMLDivElement>(null);

  const handleSetFullscreenMode = (
    target: 'none' | 'workstation' | 'slab_diagram' | 'floor_diagram'
  ) => {
    const active = target !== 'none';
    setFullscreenTarget(target);
    setIsFullscreen(active);
    onFullscreenChange?.(active);
    if (target === 'slab_diagram' || target === 'floor_diagram') {
      setActiveResultTab('dual_diagrams');
    }
  };

  // Interactive Mouse Dragging of Cut Pieces directly on the AutoCAD Slab Canvas
  useEffect(() => {
    if (!draggingPiece) return;
    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaXUnits = (e.clientX - draggingPiece.startClientX) / Math.max(0.1, draggingPiece.scale);
      const deltaYUnits = (e.clientY - draggingPiece.startClientY) / Math.max(0.1, draggingPiece.scale);
      setManualPieceOffsets((prev) => ({
        ...prev,
        [draggingPiece.instanceId]: {
          dx: Number((draggingPiece.origDx + deltaXUnits).toFixed(2)),
          dy: Number((draggingPiece.origDy + deltaYUnits).toFixed(2)),
        },
      }));
    };
    const handleWindowMouseUp = () => {
      setDraggingPiece(null);
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingPiece]);

  useEffect(() => {
    if (!isFullscreen && activeDropdownMenu === 'none') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDropdownMenu !== 'none') {
          setActiveDropdownMenu('none');
        } else if (isFullscreen) {
          handleSetFullscreenMode('none');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, activeDropdownMenu]);

  // Mark an active Cutting Optimizer session so returning to Cutting Optimizer directly resumes previous work
  useEffect(() => {
    try {
      window.localStorage.setItem('stonecut_has_active_session', '1');
    } catch {
      // ignore localStorage write errors
    }
  }, []);

  // Load saved high-res slab project from IndexedDB on mount (skip only when user explicitly uploaded a brand-new custom slab photo or picked a specific marble without resume flag)
  useEffect(() => {
    if (initialCustomSlabImageUrl) return;
    if (initialMarble && !resumeSavedSession) return;
    let mounted = true;
    loadStoneCutProjectFromIDB<{
      slabConfig?: StockSlabConfig;
      slabImageUrl?: string;
      slabImageSourceLabel?: string;
      slabOverrides?: Record<number, IndividualSlabOverride>;
      simpleMainScreen?: 'floor_planner' | 'slab_cutter' | 'stock_slabs' | 'excel_bill';
      cadLang?: 'en' | 'ur';
    }>('stonecut_active_workspace').then((saved) => {
      if (!mounted || !saved) return;
      if (saved.slabConfig) setSlabConfig(saved.slabConfig);
      if (saved.slabImageUrl) setSlabImageUrl(saved.slabImageUrl);
      if (saved.slabImageSourceLabel) setSlabImageSourceLabel(saved.slabImageSourceLabel);
      if (saved.slabOverrides) setSlabOverrides(saved.slabOverrides);
      if (saved.simpleMainScreen) setSimpleMainScreen(saved.simpleMainScreen);
      if (saved.cadLang) setCadLang(saved.cadLang);
      setIdbSavedAt('Restored from IndexedDB');
    });
    return () => {
      mounted = false;
    };
  }, [initialMarble, initialCustomSlabImageUrl, resumeSavedSession]);

  // Automatically persist high-res slab photos, active screen tab & block configuration to IndexedDB
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem('stonecut_has_active_session', '1');
      } catch {
        // ignore quota errors
      }
      saveStoneCutProjectToIDB('stonecut_active_workspace', {
        slabConfig,
        slabImageUrl,
        slabImageSourceLabel,
        slabOverrides,
        simpleMainScreen,
        cadLang,
      }).then((ok) => {
        if (ok !== undefined) {
          setIdbSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [slabConfig, slabImageUrl, slabImageSourceLabel, slabOverrides, simpleMainScreen, cadLang]);

  // Load Saved Stock Inventory from IndexedDB / LocalStorage on mount
  useEffect(() => {
    let mounted = true;
    loadStoneCutProjectFromIDB<SavedStockSlabItem[]>('stonecut_saved_stock_inventory_v1')
      .then((savedList) => {
        if (!mounted) return;
        if (Array.isArray(savedList) && savedList.length > 0) {
          setSavedStockList(savedList);
        } else {
          try {
            const rawLocal = window.localStorage.getItem('stonecut_saved_stock_inventory_backup_v1');
            if (rawLocal) {
              const parsed = JSON.parse(rawLocal) as SavedStockSlabItem[];
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSavedStockList(parsed);
              }
            }
          } catch {
            // ignore fallback read errors
          }
        }
        setIsStockLoadedFromIDB(true);
      })
      .catch(() => {
        if (mounted) setIsStockLoadedFromIDB(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Automatically persist Saved Stock Inventory to IndexedDB + lightweight LocalStorage backup
  useEffect(() => {
    if (!isStockLoadedFromIDB) return;
    saveStoneCutProjectToIDB('stonecut_saved_stock_inventory_v1', savedStockList).catch(() => {
      // ignore IDB write error
    });
    try {
      const compactBackup = savedStockList.map((item) => ({
        ...item,
        slabImageUrl: item.slabImageUrl.startsWith('data:')
          ? '/images/ziarat_white_slab.png'
          : item.slabImageUrl,
        slabOverrides: undefined,
      }));
      window.localStorage.setItem(
        'stonecut_saved_stock_inventory_backup_v1',
        JSON.stringify(compactBackup)
      );
    } catch {
      // ignore quota errors
    }
  }, [savedStockList, isStockLoadedFromIDB]);

  // Save Current Stock Slab Lot (or update existing Lot ID) in Stock Inventory
  const handleSaveCurrentSlabToStock = (asNewCopy = false) => {
    const nowStr = new Date().toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const cleanLotId = (slabConfig.lotId || `LOT-${Date.now().toString().slice(-4)}`).trim();
    const existingIdx = !asNewCopy
      ? savedStockList.findIndex(
          (st) =>
            st.category === 'full_slab_lot' &&
            st.lotId.toLowerCase() === cleanLotId.toLowerCase() &&
            st.materialName.toLowerCase() === slabConfig.materialName.trim().toLowerCase()
        )
      : -1;

    const newItem: SavedStockSlabItem = {
      id: existingIdx >= 0 ? savedStockList[existingIdx].id : `stock-${Date.now()}`,
      category: 'full_slab_lot',
      materialName: slabConfig.materialName || 'Custom Marble Slab',
      lotId: asNewCopy ? `${cleanLotId}-COPY` : cleanLotId,
      width: Number(slabConfig.width) || 60,
      length: Number(slabConfig.length) || 110,
      quantity: Math.max(1, Number(slabConfig.quantity) || 1),
      ratePerSqFt: Math.max(0, Number(slabConfig.ratePerSqFt) || 0),
      kerf: Number(slabConfig.kerf) || 0,
      edgeTrim: Number(slabConfig.edgeTrim) || 0,
      unit,
      slabImageUrl,
      slabImageSourceLabel,
      masterFrameScale,
      masterFrameOffsetX,
      masterFrameOffsetY,
      masterFrameRotation,
      slabOverrides: JSON.parse(JSON.stringify(slabOverrides || {})),
      locationRack: stockLocationRack || 'Godown A · Stand #1',
      notes:
        stockNotesInput ||
        `${slabConfig.width}×${slabConfig.length} ${unit} (${slabConfig.quantity} Slabs)`,
      savedAt: nowStr,
    };

    setSavedStockList((prev) => {
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newItem;
        return updated;
      }
      return [newItem, ...prev];
    });

    toast({
      title:
        existingIdx >= 0
          ? tr(
              `Stock Lot Updated: ${newItem.materialName} (${newItem.lotId})`,
              `اسٹاک لاٹ اپڈیٹ ہو گئی: ${newItem.materialName} (${newItem.lotId})`
            )
          : tr(
              `Saved to Stock Inventory: ${newItem.materialName} (${newItem.width}×${newItem.length} ${unit})`,
              `اسٹاک میں محفوظ ہو گیا: ${newItem.materialName} (${newItem.width}×${newItem.length} ${unit} · ${newItem.quantity} سلیب)`
            ),
      description: tr(
        `Saved with high-res slab photo, calibration & crack marks in ${newItem.locationRack}.`,
        `سلیب کی تصویر، سائز، تعداد اور کریک مارکس کے ساتھ ریک (${newItem.locationRack}) میں محفوظ کر لیا گیا۔`
      ),
    });
  };

  // Load any Saved Stock Item (Full Slab Lot or Usable Offcut) into Step 1 Optimizer
  const handleLoadStockItemIntoOptimizer = (item: SavedStockSlabItem) => {
    setUnit(item.unit || 'in');
    setSlabConfig({
      materialName: item.materialName,
      lotId: item.lotId,
      width: item.width,
      length: item.length,
      quantity: Math.max(1, item.quantity),
      ratePerSqFt: item.ratePerSqFt,
      kerf: item.kerf,
      edgeTrim: item.edgeTrim,
      minOffcutLength: slabConfig.minOffcutLength ?? 12,
      minOffcutWidth: slabConfig.minOffcutWidth ?? 12,
    });
    if (item.slabImageUrl) {
      setSlabImageUrl(item.slabImageUrl);
    }
    if (item.slabImageSourceLabel) {
      setSlabImageSourceLabel(item.slabImageSourceLabel);
    }
    setMasterFrameScale(item.masterFrameScale ?? 100);
    setMasterFrameOffsetX(item.masterFrameOffsetX ?? 0);
    setMasterFrameOffsetY(item.masterFrameOffsetY ?? 0);
    setMasterFrameRotation(item.masterFrameRotation ?? 0);
    if (item.slabOverrides && Object.keys(item.slabOverrides).length > 0) {
      setSlabOverrides(item.slabOverrides);
    } else {
      setSlabOverrides({
        1: {
          slabNumber: 1,
          imageUrl: item.slabImageUrl,
          sourceLabel: item.slabImageSourceLabel,
          frameScale: item.masterFrameScale ?? 100,
          frameOffsetX: item.masterFrameOffsetX ?? 0,
          frameOffsetY: item.masterFrameOffsetY ?? 0,
          frameRotation: item.masterFrameRotation ?? 0,
          mirrorMode: 'none',
          defects: [],
        },
      });
    }
    if (item.locationRack) setStockLocationRack(item.locationRack);
    if (item.notes) setStockNotesInput(item.notes);
    setActiveSlabIndex(0);
    setIsStockManagerOpen(false);
    toast({
      title: tr(
        `Loaded Stock into Optimizer: ${item.materialName} (${item.width}×${item.length} ${item.unit})`,
        `کٹنگ کے لیے اسٹاک لوڈ ہو گیا: ${item.materialName} (${item.width}×${item.length} ${item.unit})`
      ),
      description: tr(
        `Lot ${item.lotId} · ${item.quantity} Slabs ready for cutting.`,
        `لاٹ ${item.lotId} · ${item.quantity} سلیب کٹنگ کے لیے تیار ہیں۔`
      ),
    });
  };

  // Update Saved Stock Quantity (+ / -) or Delete
  const handleAdjustSavedStockQty = (stockId: string, delta: number) => {
    setSavedStockList((prev) =>
      prev.map((item) =>
        item.id === stockId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    );
  };

  const handleDeleteSavedStockItem = (stockId: string) => {
    const target = savedStockList.find((s) => s.id === stockId);
    setSavedStockList((prev) => prev.filter((item) => item.id !== stockId));
    setSelectedMultiStockIds((prev) => prev.filter((id) => id !== stockId));
    toast({
      title: tr('Removed from Saved Stock', 'محفوظ اسٹاک سے حذف کر دیا گیا'),
      description: target ? `${target.materialName} (${target.lotId})` : '',
    });
  };

  // Combine Multiple Saved Stocks into Current Cutting Job (ایک سے زائد سٹاک جمع کریں)
  const handleToggleMultiStockSelection = (stockId: string) => {
    setSelectedMultiStockIds((prev) =>
      prev.includes(stockId) ? prev.filter((id) => id !== stockId) : [...prev, stockId]
    );
  };

  const handleApplyCombinedStocksToOptimizer = (stockIdsToCombine?: string[]) => {
    const targetIds = stockIdsToCombine || selectedMultiStockIds;
    const chosenStocks = savedStockList.filter((st) => targetIds.includes(st.id) && st.quantity > 0);
    if (chosenStocks.length === 0) {
      toast({
        variant: 'destructive',
        title: tr('Select at least 1 Stock', 'کم از کم ایک اسٹاک منتخب کریں'),
        description: tr(
          'Please check one or more stocks from the list to combine.',
          'کٹنگ کے لیے ایک یا ایک سے زائد اسٹاک پر ٹک لگائیں۔'
        ),
      });
      return;
    }

    const primary = chosenStocks[0];
    const nextOverrides: Record<number, IndividualSlabOverride> = {};
    let slabCounter = 1;

    chosenStocks.forEach((st) => {
      const count = Math.max(1, st.quantity);
      for (let i = 1; i <= count && slabCounter <= 50; i++) {
        const existingOv = st.slabOverrides?.[i];
        nextOverrides[slabCounter] = {
          slabNumber: slabCounter,
          imageUrl: existingOv?.imageUrl || st.slabImageUrl,
          sourceLabel: `${st.materialName} (${st.lotId} · #${i})`,
          customWidth: st.width,
          customLength: st.length,
          frameScale: existingOv?.frameScale ?? st.masterFrameScale ?? 100,
          frameOffsetX: existingOv?.frameOffsetX ?? st.masterFrameOffsetX ?? 0,
          frameOffsetY: existingOv?.frameOffsetY ?? st.masterFrameOffsetY ?? 0,
          frameRotation: existingOv?.frameRotation ?? st.masterFrameRotation ?? 0,
          mirrorMode: existingOv?.mirrorMode ?? (slabCounter % 2 === 0 ? 'flip_h' : 'none'),
          defects: existingOv?.defects || [],
        };
        slabCounter++;
      }
    });

    const totalCombinedSlabs = Math.min(50, slabCounter - 1);
    const combinedNames =
      chosenStocks.length === 1
        ? primary.materialName
        : `${primary.materialName} + ${chosenStocks.length - 1} More Stock(s)`;
    const combinedLots = chosenStocks.map((s) => s.lotId).join(' + ');

    setUnit(primary.unit || 'in');
    setSlabConfig({
      materialName: combinedNames,
      lotId: combinedLots,
      width: primary.width,
      length: primary.length,
      quantity: totalCombinedSlabs,
      ratePerSqFt: primary.ratePerSqFt,
      kerf: primary.kerf,
      edgeTrim: primary.edgeTrim,
      minOffcutLength: slabConfig.minOffcutLength ?? 12,
      minOffcutWidth: slabConfig.minOffcutWidth ?? 12,
    });
    setSlabImageUrl(primary.slabImageUrl);
    setSlabImageSourceLabel(`${primary.materialName} (${primary.lotId})`);
    setSlabOverrides(nextOverrides);
    setActiveSlabIndex(0);
    setIsStockManagerOpen(false);
    setActiveResultTab('dual_diagrams');

    toast({
      title: tr(
        `Combined ${chosenStocks.length} Stock(s) — Total ${totalCombinedSlabs} Slabs Loaded!`,
        `${chosenStocks.length} اسٹاک جمع ہو گئے — کل ${totalCombinedSlabs} سلیبیں کٹنگ کے لیے لوڈ ہو گئیں!`
      ),
      description: tr(
        `Lots: ${combinedLots}. Each slab keeps its own stock dimensions & marble photo.`,
        `لاٹس: ${combinedLots}۔ ہر سلیب اپنے اصل سائز اور تصویر کے ساتھ سیٹ ہو گئی ہے۔`
      ),
    });
  };

  // Change / Swap a single Slab (#1..#50) to a specific Saved Stock Lot
  const handleAssignStockToSingleSlab = (slabNum: number, stockId: string) => {
    const st = savedStockList.find((x) => x.id === stockId);
    if (!st) return;
    setSlabOverrides((prev) => ({
      ...prev,
      [slabNum]: {
        ...(prev[slabNum] || {
          slabNumber: slabNum,
          mirrorMode: slabNum % 2 === 0 ? 'flip_h' : 'none',
          defects: [],
        }),
        slabNumber: slabNum,
        imageUrl: st.slabImageUrl,
        sourceLabel: `${st.materialName} (${st.lotId})`,
        customWidth: st.width,
        customLength: st.length,
        frameScale: st.masterFrameScale ?? 100,
        frameOffsetX: st.masterFrameOffsetX ?? 0,
        frameOffsetY: st.masterFrameOffsetY ?? 0,
        frameRotation: st.masterFrameRotation ?? 0,
      },
    }));
    toast({
      title: tr(
        `Slab #${slabNum} Changed to ${st.materialName} (${st.width}×${st.length})`,
        `سلیب نمبر #${slabNum} تبدیل ہو گئی: ${st.materialName} (${st.width}×${st.length})`
      ),
      description: `Lot: ${st.lotId} · Location: ${st.locationRack}`,
    });
  };

  // Unified helper to update Bookmatch Piece Width & Length (up to 100% Full Slab Size without ever snapping back to default!)
  const handleSetBookmatchPieceDimensions = (
    rawW: number,
    rawL: number,
    targetPartId?: string,
    forceFullSlabMode?: boolean
  ) => {
    const maxW = Math.max(4, Number(slabConfig.width) || 60);
    const maxL = Math.max(4, Number(slabConfig.length) || 110);
    const clampedW = Math.max(4, Math.min(maxW, Number(rawW.toFixed(2)) || 24));
    const clampedL = Math.max(4, Math.min(maxL, Number(rawL.toFixed(2)) || 48));
    const isNowFullSlab =
      forceFullSlabMode ?? (clampedW >= maxW - 0.5 && clampedL >= maxL - 0.5);

    setIsFullSlabBookmatch(isNowFullSlab);
    setManualPieceOffsets({});

    setParts((prev) => {
      if (isNowFullSlab) {
        const basePart =
          (targetPartId ? prev.find((p) => p.id === targetPartId) : null) || prev[0];
        return [
          {
            id: basePart?.id || 'full-slab-bm-4',
            label: tr('Full Slab 4-Slab Bookmatch Panel', 'فل سلیب 4-سلیب بک میچ پینل'),
            width: clampedW,
            length: clampedL,
            quantity: 4,
            allowRotation: false,
            isBookmatchedPair: true,
            installZone: 'floor',
            priority: 'high',
            color: basePart?.color || '#D97706',
          },
        ];
      }

      const targetId = targetPartId || prev[0]?.id;
      if (!targetId) {
        return [
          {
            id: 'bm-part-1',
            label: tr('Bookmatch Floor Panel', 'بک میچ فلور پینل'),
            width: clampedW,
            length: clampedL,
            quantity: 4,
            allowRotation: false,
            isBookmatchedPair: true,
            installZone: 'floor',
            priority: 'high',
            color: '#D97706',
          },
        ];
      }

      return prev.map((pt, idx) =>
        pt.id === targetId || (!targetPartId && idx === 0)
          ? {
              ...pt,
              width: clampedW,
              length: clampedL,
              allowRotation: false,
              priority: 'high',
            }
          : pt
      );
    });
  };

  // Activate Full-Slab 4-Slab Bookmatch (فل سلیب کا 4 سلیب بک میچ)
  const handleActivateFullSlabFourBookmatch = () => {
    const fullW = Math.max(4, Number(slabConfig.width) || 60);
    const fullL = Math.max(4, Number(slabConfig.length) || 110);
    setFourSlabBookmatchMode(true);
    setIsFullSlabBookmatch(true);
    setViewAllSlabs(true);
    setFloorColsCount(2);
    if (slabConfig.quantity < 4) {
      setSlabConfig((prev) => ({ ...prev, quantity: 4 }));
    }
    handleSetBookmatchPieceDimensions(fullW, fullL, undefined, true);
    setActiveBmZoneIdx(0);
    toast({
      title: tr(
        `🖼️ Full-Slab 4-Slab Bookmatch Ready (${fullW * 2}" × ${fullL * 2}")!`,
        `🖼️ فل سلیب (4 مکمل سلیبوں) کا بک میچ تیار ہے (${fullW * 2}" × ${fullL * 2}")!`
      ),
      description: tr(
        `Joining 4 full slabs of ${fullW}"×${fullL}" into a ${fullW * 2}"×${fullL * 2}" grand diamond bookmatch.`,
        `چار مکمل سلیبیں (${fullW}"×${fullL}") ملا کر ${fullW * 2}"×${fullL * 2}" کا فل سلیب بک میچ بن گیا۔`
      ),
    });
  };

  // Apply Master Texture to All Slabs in Block with one click
  const handleApplyTextureToAllBlockSlabs = () => {
    setSlabOverrides((prev) => {
      const next: Record<number, IndividualSlabOverride> = {};
      for (let i = 1; i <= slabConfig.quantity; i++) {
        const existing = prev[i];
        next[i] = {
          slabNumber: i,
          imageUrl: slabImageUrl,
          sourceLabel: `${slabImageSourceLabel} (Block #${i})`,
          customLength: existing?.customLength,
          customWidth: existing?.customWidth,
          frameScale: masterFrameScale,
          frameOffsetX: masterFrameOffsetX,
          frameOffsetY: masterFrameOffsetY,
          frameRotation: masterFrameRotation,
          mirrorMode: existing?.mirrorMode ?? (i % 2 === 0 ? 'flip_h' : 'none'),
          defects: existing?.defects || [],
        };
      }
      return next;
    });
    toast({
      title: `بلاک کی تمام ${slabConfig.quantity} سلیبوں پر ٹیکسچر اپلائی ہو گیا!`,
      description: 'Applied calibrated master slab photo across all slabs in the block.',
    });
  };

  // Automatic A/B or A/B/C/D Book-Match Mirroring across consecutive slabs in the block
  const handleAutoBlockBookmatchPattern = (pattern: 'ab' | 'abcd') => {
    setSlabOverrides((prev) => {
      const next: Record<number, IndividualSlabOverride> = { ...prev };
      for (let i = 1; i <= slabConfig.quantity; i++) {
        const existing = next[i] || {
          slabNumber: i,
          frameScale: masterFrameScale,
          frameOffsetX: masterFrameOffsetX,
          frameOffsetY: masterFrameOffsetY,
          frameRotation: masterFrameRotation,
          mirrorMode: 'none',
          defects: [],
        };
        let mode: 'none' | 'flip_h' | 'flip_v' | 'flip_both' = 'none';
        if (pattern === 'ab') {
          mode = i % 2 === 0 ? 'flip_h' : 'none';
        } else {
          const mod = (i - 1) % 4;
          mode = mod === 0 ? 'none' : mod === 1 ? 'flip_h' : mod === 2 ? 'flip_v' : 'flip_both';
        }
        next[i] = { ...existing, mirrorMode: mode };
      }
      return next;
    });
    toast({
      title:
        pattern === 'ab'
          ? 'Auto A/B Book-Match Activated (خودکار بک میچ جوڑے)'
          : 'Auto A/B/C/D Quad-Match Activated (چار سلیب ڈائمنڈ بک میچ)',
      description: `Updated consecutive mirror orientations for all ${slabConfig.quantity} slabs in block.`,
    });
  };

  // Rectify 4-Corner Perspective inside Frame Calibrator
  const handleRectify4CornerPerspective = async () => {
    if (!tempCalibImageUrl) return;
    setIsRectifyingPerspective(true);
    try {
      const rectifiedUrl = await rectifySlabPerspectiveToDataUrl(
        tempCalibImageUrl,
        perspectiveCorners,
        1100,
        620
      );
      setTempCalibImageUrl(rectifiedUrl);
      setTempCalibRotation(0);
      setTempCalibOffsetX(0);
      setTempCalibOffsetY(0);
      setTempCalibScale(100);
      setIsPerspectiveMode(false);
      toast({
        title: '4-Corner Perspective Corrected! (ٹیڑھی تصویر سیدھی مستطیل بن گئی)',
        description: 'Trapezoid slab photo projected into a flat rectangular slab texture.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Perspective Error',
        description: 'اس تصویر پر پرسپیکٹیو اپلائی کرنے کے لیے اپنی لوکل سلیب فوٹو اپ لوڈ کریں۔',
      });
    } finally {
      setIsRectifyingPerspective(false);
    }
  };

  const summary = useMemo(() => {
    return runGuillotineOptimization(
      slabConfig,
      parts,
      unit,
      slabOverrides,
      floorColsCount,
      manualPieceOffsets,
      fourSlabBookmatchMode
    );
  }, [slabConfig, parts, unit, slabOverrides, floorColsCount, manualPieceOffsets, fourSlabBookmatchMode]);

  useEffect(() => {
    if (activeSlabIndex >= summary.slabs.length) {
      setActiveSlabIndex(0);
    }
  }, [summary.slabs.length, activeSlabIndex]);

  // Save Usable Leftover Offcuts from the current cutting job directly into Saved Stock Inventory
  const handleSaveUsableOffcutsToStock = () => {
    const nowStr = new Date().toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const groupedOffcuts = new Map<
      string,
      { width: number; length: number; count: number; slabNums: number[] }
    >();

    summary.slabs.forEach((slab) => {
      slab.freeRects
        .filter((r) => r.isUsableOffcut)
        .forEach((rect) => {
          const w = Number(rect.width.toFixed(1));
          const l = Number(rect.height.toFixed(1));
          const key = `${w}x${l}`;
          const existing = groupedOffcuts.get(key);
          if (existing) {
            existing.count += 1;
            if (!existing.slabNums.includes(slab.slabIndex)) {
              existing.slabNums.push(slab.slabIndex);
            }
          } else {
            groupedOffcuts.set(key, {
              width: w,
              length: l,
              count: 1,
              slabNums: [slab.slabIndex],
            });
          }
        });
    });

    if (groupedOffcuts.size === 0) {
      toast({
        variant: 'destructive',
        title: tr('No Usable Offcuts Found', 'کوئی بڑا قابلِ استعمال بچت ٹکڑا موجود نہیں'),
        description: tr(
          'All slabs are tightly packed or remaining strips are smaller than usable threshold.',
          'موجودہ سلیب میں کوئی بڑا بچا ہوا ٹکڑا (Offcut) نہیں ہے۔'
        ),
      });
      return;
    }

    const newOffcutStockItems: SavedStockSlabItem[] = [];
    let idx = 1;
    groupedOffcuts.forEach((info) => {
      newOffcutStockItems.push({
        id: `offcut-${Date.now()}-${idx}`,
        category: 'usable_offcut',
        materialName: `${slabConfig.materialName} (Offcut)`,
        lotId: `${slabConfig.lotId}-OFF-${idx}`,
        width: info.width,
        length: info.length,
        quantity: info.count,
        ratePerSqFt: Math.round(slabConfig.ratePerSqFt * 0.75),
        kerf: slabConfig.kerf,
        edgeTrim: 0,
        unit,
        slabImageUrl,
        slabImageSourceLabel: `Offcut from ${slabConfig.lotId} (Slab #${info.slabNums.join(', #')})`,
        masterFrameScale,
        masterFrameOffsetX,
        masterFrameOffsetY,
        masterFrameRotation,
        locationRack: 'Offcut Rack · Remnant Yard',
        notes: `Saved leftover piece from ${slabConfig.materialName} (${slabConfig.lotId}) Slab #${info.slabNums.join(', #')}`,
        savedAt: nowStr,
      });
      idx++;
    });

    setSavedStockList((prev) => [...newOffcutStockItems, ...prev]);
    toast({
      title: tr(
        `Saved ${newOffcutStockItems.length} Leftover Offcut Sizes to Stock!`,
        `بچے ہوئے ${newOffcutStockItems.length} قابلِ استعمال ٹکڑے (Offcuts) اسٹاک میں محفوظ ہو گئے!`
      ),
      description: tr(
        'You can load these saved offcuts from Stock Manager for future stairs, risers, or vanity orders.',
        'آپ ان بچے ہوئے ٹکڑوں کو اسٹاک مینیجر سے کسی بھی اگلے آرڈر (سیڑھی، وینٹی، لٹک) کے لیے لوڈ کر سکتے ہیں۔'
      ),
    });
  };

  // Deduct Used Slabs of current job from Saved Stock Inventory
  const handleDeductUsedSlabsFromStock = () => {
    const usedCount = summary.totalSlabsUsed;
    if (usedCount <= 0) return;
    const matchIdx = savedStockList.findIndex(
      (st) =>
        st.lotId.toLowerCase() === slabConfig.lotId.trim().toLowerCase() ||
        (st.materialName.toLowerCase() === slabConfig.materialName.trim().toLowerCase() &&
          st.width === slabConfig.width &&
          st.length === slabConfig.length)
    );

    if (matchIdx < 0) {
      toast({
        variant: 'destructive',
        title: tr('Lot Not Found in Saved Stock', 'یہ لاٹ ابھی اسٹاک لسٹ میں محفوظ نہیں ہے'),
        description: tr(
          'Click "Save Current Slab to Stock" first to register this lot.',
          'پہلے "موجودہ سلیب اسٹاک میں سیو کریں" بٹن دبائیں۔'
        ),
      });
      return;
    }

    const matched = savedStockList[matchIdx];
    const remaining = Math.max(0, matched.quantity - usedCount);
    setSavedStockList((prev) => {
      const next = [...prev];
      next[matchIdx] = {
        ...matched,
        quantity: remaining,
        savedAt: `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };
      return next;
    });
    setSlabConfig((prev) => ({
      ...prev,
      quantity: Math.max(1, remaining || 1),
    }));
    toast({
      title: tr(
        `Deducted ${usedCount} Used Slabs from ${matched.lotId}`,
        `استعمال شدہ ${usedCount} سلیب اسٹاک سے منہا کر دی گئیں!`
      ),
      description: tr(
        `Remaining stock for ${matched.materialName} (${matched.lotId}): ${remaining} Slabs.`,
        `${matched.materialName} (${matched.lotId}) کی بقیہ سلیب تعداد: ${remaining} رہ گئی ہے۔`
      ),
    });
  };

  // Export Saved Stock Inventory to CSV / Excel
  const handleExportSavedStockCSV = () => {
    const headers = [
      'Category',
      'Material Name',
      'Lot ID',
      '1. Width',
      '2. Length',
      'Unit',
      'Available Qty',
      'Area Sq.Ft',
      'Rate/Sq.Ft (PKR)',
      'Total Value (PKR)',
      'Godown / Rack',
      'Saved At',
      'Notes',
    ];
    const rows = savedStockList.map((st) => {
      const factor = st.unit === 'in' ? 144 : 929.0304;
      const areaSqFt = ((st.width * st.length) / factor) * st.quantity;
      const totalVal = Math.round(areaSqFt * st.ratePerSqFt);
      return [
        st.category === 'full_slab_lot' ? 'Full Slab Lot' : 'Usable Offcut',
        `"${st.materialName.replace(/"/g, '""')}"`,
        `"${st.lotId.replace(/"/g, '""')}"`,
        st.width,
        st.length,
        st.unit,
        st.quantity,
        areaSqFt.toFixed(2),
        st.ratePerSqFt,
        totalVal,
        `"${(st.locationRack || '').replace(/"/g, '""')}"`,
        `"${st.savedAt}"`,
        `"${(st.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Marble_Stock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Saved Stock Full Backup JSON (with high-res photos & crack marks)
  const handleExportSavedStockJSON = () => {
    const jsonStr = JSON.stringify(savedStockList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StoneCut_Saved_Stock_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to get effective photo & frame calibration for a given slabIndex (1..50)
  const getSlabVisualConfig = (slabNumber: number) => {
    const ov = slabOverrides[slabNumber];
    return {
      imageUrl: ov?.imageUrl || slabImageUrl,
      sourceLabel: ov?.sourceLabel || slabImageSourceLabel,
      frameScale: ov?.frameScale ?? masterFrameScale,
      frameOffsetX: ov?.frameOffsetX ?? masterFrameOffsetX,
      frameOffsetY: ov?.frameOffsetY ?? masterFrameOffsetY,
      frameRotation: ov?.frameRotation ?? masterFrameRotation,
      mirrorMode: ov?.mirrorMode ?? (fourSlabBookmatchMode ? 'none' : slabNumber % 2 === 0 ? 'flip_h' : 'none'),
      defects: ov?.defects || [],
    };
  };

  // Open Frame Calibration Modal for any slab (0 = Master/All, 1..50 = Specific Slab)
  const openFrameCalibrator = (
    targetSlabNum: number,
    imgUrl?: string,
    imgLabel?: string
  ) => {
    const ov = targetSlabNum > 0 ? slabOverrides[targetSlabNum] : undefined;
    setCalibratingSlabTarget(targetSlabNum);
    setTempCalibImageUrl(imgUrl || ov?.imageUrl || slabImageUrl);
    setTempCalibLabel(
      imgLabel ||
        ov?.sourceLabel ||
        (targetSlabNum > 0 ? `Slab #${targetSlabNum} Photo` : slabImageSourceLabel)
    );
    setTempCalibLength(ov?.customLength || slabConfig.length || 110);
    setTempCalibWidth(ov?.customWidth || slabConfig.width || 60);
    setTempCalibScale(ov?.frameScale ?? masterFrameScale ?? 100);
    setTempCalibOffsetX(ov?.frameOffsetX ?? masterFrameOffsetX ?? 0);
    setTempCalibOffsetY(ov?.frameOffsetY ?? masterFrameOffsetY ?? 0);
    setTempCalibRotation(ov?.frameRotation ?? masterFrameRotation ?? 0);
    setTempCalibMirror(
      ov?.mirrorMode ?? (targetSlabNum > 0 && targetSlabNum % 2 === 0 ? 'flip_h' : 'none')
    );
    const existingSlabForDefects =
      targetSlabNum > 0 ? slabOverrides[targetSlabNum] : slabOverrides[1];
    setTempCalibDefects(existingSlabForDefects?.defects ? [...existingSlabForDefects.defects] : []);
    setCalibCrackTool('move_photo');
    setActivePencilPoints([]);
    setIsDrawingPencil(false);
    setIsFrameCalibratorOpen(true);
  };

  // Apply & Save Frame Calibration + Pencil Cracks Marked Inside the Popup
  const handleSaveFrameCalibration = () => {
    const validL = Math.max(1, Number(tempCalibLength) || 110);
    const validW = Math.max(1, Number(tempCalibWidth) || 60);

    if (calibratingSlabTarget === 0) {
      setSlabImageUrl(tempCalibImageUrl);
      setSlabImageSourceLabel(tempCalibLabel);
      setSlabConfig((prev) => ({
        ...prev,
        length: validL,
        width: validW,
      }));
      setMasterFrameScale(tempCalibScale);
      setMasterFrameOffsetX(tempCalibOffsetX);
      setMasterFrameOffsetY(tempCalibOffsetY);
      setMasterFrameRotation(tempCalibRotation);
      setSlabOverrides((prev) => ({
        ...prev,
        1: {
          ...(prev[1] || {
            slabNumber: 1,
            mirrorMode: 'none',
          }),
          slabNumber: 1,
          imageUrl: tempCalibImageUrl,
          sourceLabel: tempCalibLabel,
          customLength: validL,
          customWidth: validW,
          frameScale: tempCalibScale,
          frameOffsetX: tempCalibOffsetX,
          frameOffsetY: tempCalibOffsetY,
          frameRotation: tempCalibRotation,
          mirrorMode: tempCalibMirror,
          defects: tempCalibDefects,
        },
      }));
      toast({
        title: `سلیب فریم (چوڑائی ${validW} × لمبائی ${validL} ${unit}) اور ${tempCalibDefects.length} کریک محفوظ ہو گئے!`,
        description: 'All cutting diagrams updated to match your calibrated slab frame and pencil crack marks.',
      });
    } else {
      setSlabOverrides((prev) => ({
        ...prev,
        [calibratingSlabTarget]: {
          ...(prev[calibratingSlabTarget] || {
            slabNumber: calibratingSlabTarget,
            defects: [],
          }),
          slabNumber: calibratingSlabTarget,
          imageUrl: tempCalibImageUrl,
          sourceLabel: tempCalibLabel,
          customLength: validL,
          customWidth: validW,
          frameScale: tempCalibScale,
          frameOffsetX: tempCalibOffsetX,
          frameOffsetY: tempCalibOffsetY,
          frameRotation: tempCalibRotation,
          mirrorMode: tempCalibMirror,
          defects: tempCalibDefects,
        },
      }));
      toast({
        title: `Slab #${calibratingSlabTarget} کا فریم، ٹیکسچر اور ${tempCalibDefects.length} کریک سیٹ ہو گئے!`,
        description: `Slab #${calibratingSlabTarget} calibrated to W:${validW} × L:${validL} ${unit} with ${tempCalibDefects.length} crack mark(s).`,
      });
    }
    setIsFrameCalibratorOpen(false);
  };

  // Trigger upload for either Master (0) or a specific Slab # (1..50)
  const triggerSlabUpload = (targetSlabNum: number, useCamera = false) => {
    uploadTargetSlabRef.current = targetSlabNum;
    if (useCamera) {
      mobileCameraInputRef.current?.click();
    } else {
      pcFileInputRef.current?.click();
    }
  };

  // Handle File Upload from PC or Mobile Gallery -> Immediately applies & saves photo so switching tabs never loses it, then opens Frame Calibrator!
  const handleSlabFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetSlab = uploadTargetSlabRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const label = file.name || 'Uploaded Slab';
        if (targetSlab === 0) {
          setSlabImageUrl(dataUrl);
          setSlabImageSourceLabel(label);
          setSavedStockList((prev) =>
            prev.map((st, idx) =>
              st.lotId === slabConfig.lotId || idx === 0
                ? { ...st, slabImageUrl: dataUrl, slabImageSourceLabel: label }
                : st
            )
          );
        } else {
          setSlabOverrides((prev) => ({
            ...prev,
            [targetSlab]: {
              ...(prev[targetSlab] || {
                slabNumber: targetSlab,
                frameScale: 100,
                frameOffsetX: 0,
                frameOffsetY: 0,
                frameRotation: 0,
                mirrorMode: targetSlab % 2 === 0 ? 'flip_h' : 'none',
                defects: [],
              }),
              slabNumber: targetSlab,
              imageUrl: dataUrl,
              sourceLabel: `Slab #${targetSlab} (${label})`,
            },
          }));
        }
        openFrameCalibrator(targetSlab, dataUrl, label);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Bulk Upload Multiple Slab Photos for a Block (e.g., Slab #1, Slab #2, Slab #3... up to 50)
  const handleBulkSlabsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file, idx) => {
      const slabNum = idx + 1;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const dataUrl = reader.result;
          if (idx === 0) {
            setSlabImageUrl(dataUrl);
            setSlabImageSourceLabel(file.name);
          }
          setSlabOverrides((prev) => ({
            ...prev,
            [slabNum]: {
              ...(prev[slabNum] || {
                slabNumber: slabNum,
                frameScale: 100,
                frameOffsetX: 0,
                frameOffsetY: 0,
                frameRotation: 0,
                mirrorMode: slabNum % 2 === 0 ? 'flip_h' : 'none',
                defects: [],
              }),
              slabNumber: slabNum,
              imageUrl: dataUrl,
              sourceLabel: `Slab #${slabNum} (${file.name})`,
            },
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length > slabConfig.quantity) {
      setSlabConfig((prev) => ({ ...prev, quantity: files.length }));
    }

    toast({
      title: `${files.length} سلیبوں کی تصاویر اپ لوڈ ہو گئیں!`,
      description: 'Each slab in the block now has its own individual texture. Click "Calibrate Frame" on any slab to adjust.',
    });
    e.target.value = '';
  };

  // Add a Crack / Damaged Zone to a specific slab so the optimizer cuts around it
  const handleAddDefectToSlab = (slabNum: number) => {
    const defect: SlabDefectZone = {
      id: `def-${Date.now()}`,
      label: `Crack / Damage`,
      x: Math.max(0, Number(newDefectX) || 20),
      y: Math.max(0, Number(newDefectY) || 15),
      width: Math.max(2, Number(newDefectW) || 12),
      height: Math.max(2, Number(newDefectH) || 8),
    };
    setSlabOverrides((prev) => {
      const existing = prev[slabNum] || {
        slabNumber: slabNum,
        frameScale: 100,
        frameOffsetX: 0,
        frameOffsetY: 0,
        frameRotation: 0,
        mirrorMode: slabNum % 2 === 0 ? 'flip_h' : 'none',
        defects: [],
      };
      return {
        ...prev,
        [slabNum]: {
          ...existing,
          defects: [...existing.defects, defect],
        },
      };
    });
    toast({
      title: `Slab #${slabNum} پر ٹوٹا ہوا / کریک حصہ نشان زد ہو گیا`,
      description: 'The optimizer automatically avoids cutting pieces from that damaged area.',
    });
  };

  const handleClearDefectsOnSlab = (slabNum: number) => {
    setSlabOverrides((prev) => {
      const existing = prev[slabNum];
      if (!existing) return prev;
      return {
        ...prev,
        [slabNum]: {
          ...existing,
          defects: [],
        },
      };
    });
  };

  // Set mirror mode for a specific slab (1..50)
  const handleSetSlabMirror = (
    slabNum: number,
    mirrorMode: 'none' | 'flip_h' | 'flip_v' | 'flip_both'
  ) => {
    setSlabOverrides((prev) => {
      const existing = prev[slabNum] || {
        slabNumber: slabNum,
        frameScale: 100,
        frameOffsetX: 0,
        frameOffsetY: 0,
        frameRotation: 0,
        mirrorMode: 'none',
        defects: [],
      };
      return {
        ...prev,
        [slabNum]: {
          ...existing,
          mirrorMode,
        },
      };
    });
  };

  // Start Live WebRTC Camera
  const startLiveCamera = async (targetSlabNum = 0) => {
    uploadTargetSlabRef.current = targetSlabNum;
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Live webcam stream is not supported in this browser frame. Use the "Mobile Camera / Upload" button below.'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        'کیمرہ کی اجازت نہیں ملی یا کیمرہ دستیاب نہیں ہے۔ آپ نیچے دیے گئے بٹن سے موبائل گیلری یا کیمرہ فائل اپ لوڈ کر سکتے ہیں۔'
      );
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const targetSlab = uploadTargetSlabRef.current;
      stopLiveCamera();
      openFrameCalibrator(
        targetSlab,
        dataUrl,
        `Camera Capture (${new Date().toLocaleTimeString()})`
      );
    } else {
      stopLiveCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Add Bookmatch Panels directly to Required Cut List
  const handleAddBookmatchToCutList = () => {
    const panelCount = bookmatchMode === '4way_quad' ? 4 : 2;
    const modeTitle =
      bookmatchMode === '4way_quad'
        ? '4-Way Diamond Bookmatch Panel (ڈائمنڈ بک میچ)'
        : bookmatchMode === '2way_v'
        ? '2-Way Vertical Bookmatch Panel (عمودی بک میچ)'
        : '2-Way Butterfly Bookmatch Panel (بٹر فلائی بک میچ)';

    const newPart: CutPartInput = {
      id: `bm-part-${Date.now()}`,
      label: modeTitle,
      length: Math.max(1, Number(bmPanelLength) || 52),
      width: Math.max(1, Number(bmPanelWidth) || 28),
      quantity: panelCount,
      allowRotation: false,
      isBookmatchedPair: true,
      installZone: 'floor',
      priority: 'high',
      color: '#7C3AED',
    };

    setParts((prev) => [newPart, ...prev]);
    setActiveResultTab('dual_diagrams');
    toast({
      title: 'بک میچ پیسز کٹنگ لسٹ میں شامل کر دیے گئے!',
      description: `${panelCount} Bookmatched panels (${bmPanelLength}×${bmPanelWidth} ${unit}) added to Slab & Floor Diagrams.`,
    });
  };

  // Download Bookmatch High-Res Image PNG (Crops the exact cut region from the Stock Slab)
  const handleDownloadBookmatchImage = () => {
    if (!slabImageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const sLen = Math.max(1, slabConfig.length || 110);
        const sWid = Math.max(1, slabConfig.width || 60);
        const cutW = Math.min(sLen, Math.max(1, bmPanelLength));
        const cutH = Math.min(sWid, Math.max(1, bmPanelWidth));
        const maxStartX = Math.max(0, sLen - cutW);
        const maxStartY = Math.max(0, sWid - cutH);
        const cutX = (bmOffsetX / 100) * maxStartX;
        const cutY = (bmOffsetY / 100) * maxStartY;

        const sx = (cutX / sLen) * img.naturalWidth;
        const sy = (cutY / sWid) * img.naturalHeight;
        const sw = Math.max(1, (cutW / sLen) * img.naturalWidth);
        const sh = Math.max(1, (cutH / sWid) * img.naturalHeight);

        const canvas = document.createElement('canvas');
        const cols = bookmatchMode === '2way_v' ? 1 : 2;
        const rows = bookmatchMode === '2way_h' ? 1 : 2;
        const tileW = 600;
        const tileH = Math.round(tileW * (cutH / Math.max(1, cutW)));
        canvas.width = cols * tileW;
        canvas.height = rows * tileH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.save();
            const x = c * tileW;
            const y = r * tileH;
            ctx.translate(x + tileW / 2, y + tileH / 2);
            const flipX = bmInvertMirror ? c === 0 : c === 1;
            const flipY = bmInvertMirror ? r === 0 && rows > 1 : r === 1;
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            ctx.drawImage(img, sx, sy, sw, sh, -tileW / 2, -tileH / 2, tileW, tileH);
            ctx.restore();

            if (bmShowSeam) {
              ctx.strokeStyle = 'rgba(255,255,255,0.65)';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, tileW, tileH);
            }
          }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Bookmatch_${slabConfig.lotId || 'Marble'}_${cutW}x${cutH}${unit}_${bookmatchMode}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: tr('Bookmatch PNG Downloaded!', 'بک میچ ڈیزائن ڈاؤن لوڈ ہو گیا!'),
          description: tr(
            `Cropped ${cutW}×${cutH} ${unit} from ${sLen}×${sWid} ${unit} slab.`,
            `سلیب (${sLen}×${sWid}) میں سے (${cutW}×${cutH}) کٹنگ کا بک میچ محفوظ ہو گیا۔`
          ),
        });
      } catch {
        toast({
          variant: 'destructive',
          title: tr('Upload Local Slab Photo to Export PNG', 'ڈاؤن لوڈ کے لیے لوکل تصویر اپ لوڈ کریں'),
          description: 'External image security restricted direct PNG export. Upload your slab photo to export PNG.',
        });
      }
    };
    img.src = slabImageUrl;
  };

  // Unit switcher with automatic dimension conversion
  const handleUnitChange = (newUnit: UnitType) => {
    if (newUnit === unit) return;
    const ratio = UNIT_TO_INCHES[unit] / UNIT_TO_INCHES[newUnit];
    const roundDim = (val: number) => Number((val * ratio).toFixed(newUnit === 'mm' ? 0 : 2));

    setSlabConfig((prev) => ({
      ...prev,
      length: roundDim(prev.length),
      width: roundDim(prev.width),
      kerf: Number((prev.kerf * ratio).toFixed(newUnit === 'mm' ? 1 : 3)),
      edgeTrim: roundDim(prev.edgeTrim),
      minOffcutLength: roundDim(prev.minOffcutLength),
      minOffcutWidth: roundDim(prev.minOffcutWidth),
    }));

    setParts((prev) =>
      prev.map((p) => ({
        ...p,
        length: roundDim(p.length),
        width: roundDim(p.width),
      }))
    );

    setBmPanelLength((prev) => roundDim(prev));
    setBmPanelWidth((prev) => roundDim(prev));
    setUnit(newUnit);
  };

  const handleAddPart = () => {
    const nextIdx = parts.length;
    const defaultL = unit === 'mm' ? 900 : unit === 'cm' ? 90 : unit === 'ft' ? 3 : 36;
    const defaultW = unit === 'mm' ? 600 : unit === 'cm' ? 60 : unit === 'ft' ? 2 : 24;
    setParts((prev) => [
      ...prev,
      {
        id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        label: `Floor / Cut Piece #${nextIdx + 1}`,
        length: defaultL,
        width: defaultW,
        quantity: 4,
        allowRotation: false,
        isBookmatchedPair: false,
        installZone: 'floor',
        priority: 'normal',
        color: PART_PALETTE[nextIdx % PART_PALETTE.length],
      },
    ]);
  };

  const handleUpdatePart = (id: string, field: keyof CutPartInput, value: any) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'isBookmatchedPair' && value === true) {
          updated.allowRotation = false;
          if (updated.quantity < 2) updated.quantity = 2;
        }
        return updated;
      })
    );
  };

  const handleRemovePart = (id: string) => {
    if (parts.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Minimum 1 Part Required',
        description: 'کم از کم ایک کٹنگ سائز لسٹ میں ہونا ضروری ہے۔',
      });
      return;
    }
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const applyPreset = (
    presetKey: 'flooring' | 'bookmatch_wall' | 'stairs' | 'kitchen' | 'vanity' | 'window_sill'
  ) => {
    setActiveCategoryPreset(presetKey);
    setActiveResultTab('dual_diagrams');
    const curL = Math.max(24, Number(slabConfig.length) || 110);
    const curW = Math.max(18, Number(slabConfig.width) || 60);

    if (presetKey === 'flooring') {
      setFourSlabBookmatchMode(false);
      setIsFullSlabBookmatch(false);
      setViewAllSlabs(false);
      setFloorColsCount(3);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(4, prev.quantity || 4),
      }));
      setParts([
        {
          id: 'fl-main',
          label: 'Main Room Floor Tile (فرش مین سلیب)',
          length: 48,
          width: 24,
          quantity: 6,
          allowRotation: false,
          isBookmatchedPair: false,
          installZone: 'floor',
          priority: 'high',
          color: PART_PALETTE[0],
        },
        {
          id: 'fl-center',
          label: 'Lounge Floor Panel (لاؤنج فرش پینل)',
          length: 36,
          width: 24,
          quantity: 4,
          allowRotation: false,
          isBookmatchedPair: false,
          installZone: 'floor',
          priority: 'high',
          color: PART_PALETTE[3],
        },
        {
          id: 'fl-skirting',
          label: 'Floor Skirting / Border (اسکرٹنگ بارڈر پٹی)',
          length: 48,
          width: 4,
          quantity: 8,
          allowRotation: true,
          isBookmatchedPair: false,
          installZone: 'floor',
          priority: 'normal',
          color: PART_PALETTE[1],
        },
      ]);
    } else if (presetKey === 'stairs') {
      setFourSlabBookmatchMode(false);
      setIsFullSlabBookmatch(false);
      setViewAllSlabs(false);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(3, prev.quantity || 4),
      }));
      setParts([
        {
          id: 'p-step',
          label: 'Rope-Light Stair Step + Latak (روپ لائٹ سیڑھی سٹیپ + لٹک)',
          length: 42,
          width: 12,
          quantity: 16,
          allowRotation: false,
          isBookmatchedPair: true,
          latakCutMode: 'bookmatch_attached',
          latakMode: 'bookmatch',
          latakSides: 'front_only',
          latakSize: 2,
          latakWidth: 2,
          latakFront: true,
          latakLeft: false,
          latakRight: false,
          latakBack: false,
          installZone: 'stairs',
          priority: 'high',
          color: PART_PALETTE[0],
        },
        {
          id: 'p-riser',
          label: 'Bookmatch Stair Riser (سیڑھی رائزر)',
          length: 42,
          width: 6,
          quantity: 16,
          allowRotation: false,
          isBookmatchedPair: true,
          installZone: 'stairs',
          priority: 'high',
          color: PART_PALETTE[1],
        },
        {
          id: 'p-landing',
          label: 'Main Landing (مین چونکی)',
          length: 42,
          width: 42,
          quantity: 1,
          allowRotation: false,
          isBookmatchedPair: true,
          latakCutMode: 'bookmatch_attached',
          latakSize: 2,
          latakFront: true,
          installZone: 'stairs',
          priority: 'high',
          color: PART_PALETTE[2],
        },
      ]);
    } else if (presetKey === 'vanity') {
      setFourSlabBookmatchMode(false);
      setIsFullSlabBookmatch(false);
      setViewAllSlabs(false);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(2, prev.quantity || 2),
      }));
      setParts([
        {
          id: 'v-double',
          label: 'Master Vanity Top (مین وینٹی ٹاپ)',
          length: 60,
          width: 24,
          quantity: 1,
          allowRotation: false,
          isBookmatchedPair: false,
          latakCutMode: 'bookmatch_attached',
          latakMode: 'bookmatch',
          latakSides: 'front_2_sides',
          latakSize: 3,
          latakWidth: 3,
          latakFront: true,
          latakLeft: true,
          latakRight: true,
          latakBack: false,
          splashSize: 4,
          splashBack: true,
          splashLeft: true,
          splashRight: true,
          installZone: 'counter',
          priority: 'high',
          color: PART_PALETTE[0],
        },
        {
          id: 'v-single',
          label: 'Guest Vanity Top (گیسٹ وینٹی ٹاپ)',
          length: 36,
          width: 22,
          quantity: 1,
          allowRotation: false,
          isBookmatchedPair: false,
          latakCutMode: 'bookmatch_attached',
          latakMode: 'bookmatch',
          latakSides: 'front_only',
          latakSize: 3,
          latakWidth: 3,
          latakFront: true,
          latakLeft: false,
          latakRight: false,
          latakBack: false,
          splashSize: 4,
          splashBack: true,
          splashLeft: false,
          splashRight: false,
          installZone: 'counter',
          priority: 'high',
          color: PART_PALETTE[4],
        },
      ]);
    } else if (presetKey === 'kitchen') {
      setFourSlabBookmatchMode(false);
      setIsFullSlabBookmatch(false);
      setViewAllSlabs(false);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(3, prev.quantity || 3),
      }));
      setParts([
        {
          id: 'k-main',
          label: 'Main Kitchen Countertop (مین کچن سلیب)',
          length: 84,
          width: 24,
          quantity: 1,
          allowRotation: false,
          isBookmatchedPair: false,
          latakCutMode: 'bookmatch_attached',
          latakMode: 'bookmatch',
          latakSides: 'front_only',
          latakSize: 2.5,
          latakWidth: 2.5,
          latakFront: true,
          latakLeft: true,
          latakRight: false,
          latakBack: false,
          splashSize: 6,
          splashBack: true,
          splashLeft: true,
          splashRight: true,
          installZone: 'counter',
          priority: 'high',
          color: PART_PALETTE[3],
        },
        {
          id: 'k-island',
          label: 'Kitchen Island Slab (کچن آئی لینڈ سلیب)',
          length: 72,
          width: 36,
          quantity: 1,
          allowRotation: false,
          isBookmatchedPair: false,
          latakCutMode: 'bookmatch_attached',
          latakMode: 'bookmatch',
          latakSides: 'all_4_sides',
          latakSize: 3,
          latakWidth: 3,
          latakFront: true,
          latakLeft: true,
          latakRight: true,
          latakBack: true,
          installZone: 'counter',
          priority: 'high',
          color: PART_PALETTE[0],
        },
      ]);
    } else if (presetKey === 'window_sill') {
      setFourSlabBookmatchMode(false);
      setIsFullSlabBookmatch(false);
      setViewAllSlabs(false);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(2, prev.quantity || 2),
      }));
      setParts([
        {
          id: 'ws-main',
          label: 'Main Window Sill (مین ونڈو سل / کھڑکی سل)',
          length: 60,
          width: 10,
          quantity: 4,
          allowRotation: false,
          isBookmatchedPair: false,
          latakMode: 'bookmatch',
          latakSides: 'front_only',
          latakWidth: 2,
          installZone: 'wall',
          priority: 'high',
          color: PART_PALETTE[0],
        },
        {
          id: 'ws-large',
          label: 'Lounge Window Sill (بڑی کھڑکی سل)',
          length: 72,
          width: 12,
          quantity: 2,
          allowRotation: false,
          isBookmatchedPair: false,
          latakMode: 'bookmatch',
          latakSides: 'front_only',
          latakWidth: 2,
          installZone: 'wall',
          priority: 'high',
          color: PART_PALETTE[4],
        },
        {
          id: 'ws-jamb',
          label: 'Window Side Frame Patti (کھڑکی سائیڈ فریم پٹی)',
          length: 60,
          width: 6,
          quantity: 6,
          allowRotation: true,
          isBookmatchedPair: false,
          installZone: 'wall',
          priority: 'normal',
          color: PART_PALETTE[1],
        },
      ]);
    } else if (presetKey === 'bookmatch_wall') {
      setFourSlabBookmatchMode(true);
      setViewAllSlabs(true);
      setFloorColsCount(2);
      setShowFloorSeamLines(false);
      setSlabConfig((prev) => ({
        ...prev,
        length: curL,
        width: curW,
        quantity: Math.max(4, prev.quantity || 4),
      }));
      setParts([
        {
          id: 'bm-main',
          label: '4-Slab Bookmatch Panel (چار سلیب بک میچ پینل)',
          length: 52,
          width: 28,
          quantity: 4,
          allowRotation: false,
          isBookmatchedPair: true,
          installZone: 'floor',
          priority: 'high',
          color: '#7C3AED',
          templateType: 'bookmatch_feature_wall',
          edgeProfile: 'flat_polish',
        },
      ]);
    }

    setActiveSlabIndex(0);
    toast({
      title: tr('Category & Diagram Switched', 'کیٹگری اور ڈایاگرام کھل گیا'),
      description: tr(
        'Opened dedicated cutting & installation diagram for selected category.',
        'منتخب بٹن کے مطابق نیچے الگ، بڑا اور واضح ڈایاگرام کھل گیا ہے۔'
      ),
    });
  };

  // Export CSV / Excel BOM with Slab Source & Floor Destination Mapping
  const handleExportCSV = () => {
    const rows: string[][] = [
      ['StoneCut 3D - CAD/CAM Slab-to-Floor Traceability & Cut Schedule'],
      ['Material Name', slabConfig.materialName, 'Lot ID', slabConfig.lotId],
      [
        'Stock Slab Size',
        `${slabConfig.length} x ${slabConfig.width} ${unit}`,
        'Saw Kerf',
        `${slabConfig.kerf} ${unit}`,
        'Edge Trim',
        `${slabConfig.edgeTrim} ${unit}`,
      ],
      [
        'Total Slabs Used',
        String(summary.totalSlabsUsed),
        'Total Pieces Cut',
        `${summary.totalPiecesPlaced} / ${summary.totalPiecesRequested}`,
        'Net Yield %',
        `${summary.overallYieldPercent.toFixed(1)}%`,
        'Waste %',
        `${summary.overallWastePercent.toFixed(1)}%`,
      ],
      [],
      ['--- SLAB-TO-FLOOR PIECE TRACEABILITY SCHEDULE ---'],
      [
        'Piece Code',
        'Source Slab #',
        'Cut From (X, Y)',
        'Part Label',
        'CAD Template',
        'Edge Profile',
        'Sink Cutout',
        'Cut Size',
        'Unit',
        'Floor Fixing Position',
        'Vein / Bookmatch Mode',
        'Area (Sq.Ft)',
      ],
    ];

    summary.slabs.forEach((slab) => {
      slab.placedPieces.forEach((p) => {
        const sqFt = toSqFt(p.width * p.height, unit);
        rows.push([
          p.pieceCode,
          `Slab #${slab.slabIndex}`,
          `X=${formatNum(p.x)}, Y=${formatNum(p.y)}`,
          p.label,
          p.templateType || 'standard_panel',
          p.edgeProfile || 'flat_polish',
          p.sinkCutout?.enabled
            ? `${p.sinkCutout.shape} ${p.sinkCutout.widthIn}x${p.sinkCutout.depthIn} @ (${p.sinkCutout.offsetXIn},${p.sinkCutout.offsetYIn})`
            : 'None',
          `${p.originalLength} x ${p.originalWidth}`,
          unit,
          p.floorCoordLabel,
          p.bookmatchTag || (p.rotated ? 'Rotated 90°' : 'Fixed Vein'),
          sqFt.toFixed(2),
        ]);
      });
    });

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StoneCut3D_Schedule_${slabConfig.lotId || 'Slab'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV / Excel BOM Exported',
      description: 'سلیب کٹنگ اور فلور فکسنگ شیڈول ڈاؤن لوڈ ہو گیا ہے۔',
    });
  };

  const [pdfModalSlabFilter, setPdfModalSlabFilter] = useState<number | null>(null);
  const [pdfModalAutoAction, setPdfModalAutoAction] = useState<'none' | 'download_pdf' | 'print'>(
    'none'
  );

  const handleOpenSlabOverview = (slabNum: number | null = null) => {
    setPdfModalSlabFilter(slabNum);
    setPdfModalAutoAction('none');
    setIsPdfPreviewModalOpen(true);
  };

  const handlePrintSlabSheet = (slabNum: number | null = null) => {
    setPdfModalSlabFilter(slabNum);
    setPdfModalAutoAction('print');
    setIsPdfPreviewModalOpen(true);
  };

  const handleDownloadSlabPdf = (slabNum: number | null = null) => {
    setPdfModalSlabFilter(slabNum);
    setPdfModalAutoAction('download_pdf');
    setIsPdfPreviewModalOpen(true);
  };

  const handlePrintWorkshopSheet = () => {
    handleOpenSlabOverview(null);
  };

  const currentSlab: OptimizedSlabResult | undefined =
    summary.slabs[activeSlabIndex] || summary.slabs[0];

  const slabsToRender = viewAllSlabs
    ? summary.slabs
    : currentSlab
    ? [currentSlab]
    : [];

  // All placed pieces across all slabs for Diagram #2 (Floor Fixing Layout)
  const allPlacedPieces = useMemo(() => {
    return summary.slabs.flatMap((s) => s.placedPieces);
  }, [summary.slabs]);

  // ============================================================================
  // COMPUTER AUTO-SAVE & EXCEL BILLING SYSTEM (سلیب سائز، ریٹ، کٹنگ، پالش اور ایج پروفائل بلنگ + کمپیوٹر آٹو سیو)
  // ============================================================================
  const [billCustomerName, setBillCustomerName] = useState<string>('ماربل کٹنگ و پالش کسٹمر بل');
  const [billCustomerPhone, setBillCustomerPhone] = useState<string>('');
  const [cuttingRatePerRft, setCuttingRatePerRft] = useState<number>(35);
  const [polishRatePerSqFt, setPolishRatePerSqFt] = useState<number>(60);
  const [edgeProfileRatePerRft, setEdgeProfileRatePerRft] = useState<number>(120);
  const [computerLastSavedAt, setComputerLastSavedAt] = useState<string>('');
  const [savedComputerExcelBills, setSavedComputerExcelBills] = useState<
    Array<{
      id: string;
      createdAt: string;
      customerName: string;
      customerPhone: string;
      materialName: string;
      lotId: string;
      slabWidth: number;
      slabLength: number;
      slabsUsed: number;
      totalSlabsQty: number;
      slabRatePerSqFt: number;
      cuttingRatePerRft: number;
      polishRatePerSqFt: number;
      edgeProfileRatePerRft: number;
      totalSqFt: number;
      totalCutRft: number;
      totalEdgeRft: number;
      grandTotalPKR: number;
      slabConfigSnapshot: StockSlabConfig;
      partsSnapshot: CutPartInput[];
    }>
  >([]);

  // Load saved computer billing rates, active workspace state, and saved Excel bills from the user's computer on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawBilling = window.localStorage.getItem('stonecut_computer_billing_v1');
      if (rawBilling) {
        const parsed = JSON.parse(rawBilling);
        if (parsed.billCustomerName) setBillCustomerName(String(parsed.billCustomerName));
        if (parsed.billCustomerPhone !== undefined) setBillCustomerPhone(String(parsed.billCustomerPhone));
        if (typeof parsed.cuttingRatePerRft === 'number') setCuttingRatePerRft(parsed.cuttingRatePerRft);
        if (typeof parsed.polishRatePerSqFt === 'number') setPolishRatePerSqFt(parsed.polishRatePerSqFt);
        if (typeof parsed.edgeProfileRatePerRft === 'number') setEdgeProfileRatePerRft(parsed.edgeProfileRatePerRft);
        if (parsed.slabConfig && typeof parsed.slabConfig === 'object') {
          setSlabConfig((prev) => ({ ...prev, ...parsed.slabConfig }));
        }
        if (Array.isArray(parsed.parts) && parsed.parts.length > 0) {
          setParts(parsed.parts);
        }
      }
      const rawSavedBills = window.localStorage.getItem('stonecut_saved_excel_bills_v1');
      if (rawSavedBills) {
        const parsedBills = JSON.parse(rawSavedBills);
        if (Array.isArray(parsedBills)) {
          setSavedComputerExcelBills(parsedBills);
        }
      }
    } catch {
      // Ignore corrupt local storage
    }
  }, []);

  // Automatically save every change (Slabs, Sizes, Rates, Edge Profiles, Polish, Cutting) to the user's computer!
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const payload = {
        updatedAt: nowStr,
        billCustomerName,
        billCustomerPhone,
        cuttingRatePerRft,
        polishRatePerSqFt,
        edgeProfileRatePerRft,
        slabConfig,
        parts,
      };
      window.localStorage.setItem('stonecut_computer_billing_v1', JSON.stringify(payload));
      setComputerLastSavedAt(nowStr);
    } catch {
      // Ignore storage quota errors
    }
  }, [
    billCustomerName,
    billCustomerPhone,
    cuttingRatePerRft,
    polishRatePerSqFt,
    edgeProfileRatePerRft,
    slabConfig,
    parts,
  ]);

  const getEdgeProfileMeta = (ep?: EdgeProfileType) => {
    switch (ep) {
      case 'half_bullnose':
        return {
          id: 'half_bullnose' as EdgeProfileType,
          en: 'Half Bullnose (Half Gola)',
          ur: 'ہاف گولا (Half Bullnose)',
        };
      case 'full_bullnose':
        return {
          id: 'full_bullnose' as EdgeProfileType,
          en: 'Full Bullnose (Full Gola)',
          ur: 'فل گولا (Full Bullnose)',
        };
      case 'miter_45':
        return {
          id: 'miter_45' as EdgeProfileType,
          en: '45° Miter Bookmatch Joint',
          ur: '45° مائٹر بک میچ جوڑ (45° Miter)',
        };
      case 'ogee':
        return {
          id: 'ogee' as EdgeProfileType,
          en: 'Double Ogee / Molding',
          ur: 'ڈبل گولا / اوجی (Ogee)',
        };
      case 'bevel':
        return {
          id: 'bevel' as EdgeProfileType,
          en: 'Bevel / Chamfer Edge',
          ur: 'بیول چیمفر دھار (Bevel)',
        };
      case 'dupont':
        return {
          id: 'dupont' as EdgeProfileType,
          en: 'Dupont Designer Edge',
          ur: 'ڈوپونٹ ڈیزائن ایج (Dupont)',
        };
      default:
        return {
          id: 'flat_polish' as EdgeProfileType,
          en: 'Flat Edge Polish (Sada Dhar)',
          ur: 'سادہ دھار پالش (Flat Polish)',
        };
    }
  };

  // Detailed Per-Piece Billing Breakdown (Cutting + Surface Polish + Edge Profile + Stone Cost for EVERY piece)
  const pieceBillingRows = useMemo(() => {
    const unitToIn = UNIT_TO_INCHES[unit] || 1;
    const slabRate = Math.max(0, Number(slabConfig.ratePerSqFt) || 0);
    const cutRate = Math.max(0, Number(cuttingRatePerRft) || 0);
    const polRate = Math.max(0, Number(polishRatePerSqFt) || 0);
    const edgeRate = Math.max(0, Number(edgeProfileRatePerRft) || 0);

    return allPlacedPieces.map((p, idx) => {
      const sourcePart = parts.find((pt) => pt.id === p.partId);
      const cutW = Number(p.height) || 0; // Width first
      const cutL = Number(p.width) || 0; // Length second
      const areaSqFt = toSqFt(p.width * p.height, unit);
      const stoneCostPKR = Math.round(areaSqFt * slabRate);

      // Saw Cutting Running Feet for this piece (2 × (W + L) in feet)
      const cuttingRft = ((cutW + cutL) * 2 * unitToIn) / 12;
      const cuttingCostPKR = Math.round(cuttingRft * cutRate);

      // Surface Polish Sq.Ft & Cost for this piece
      const polishSqFt = areaSqFt;
      const polishCostPKR = Math.round(polishSqFt * polRate);

      // Edge Profile & Latak/Splash Running Feet & Cost for this piece
      const epMeta = getEdgeProfileMeta(sourcePart?.edgeProfile || p.edgeProfile);
      const ls = sourcePart ? resolvePartLatakAndSplash(sourcePart) : null;
      let edgeIn = 0;
      const activeSidesArr: string[] = [];
      if (ls && (ls.hasAnyLatak || ls.hasAnySplash)) {
        if (ls.hasFront) {
          edgeIn += cutL * unitToIn;
          activeSidesArr.push('1.فرنٹ لٹک');
        }
        if (ls.hasLeft) {
          edgeIn += cutW * unitToIn;
          activeSidesArr.push('2.لیفٹ لٹک');
        }
        if (ls.hasRight) {
          edgeIn += cutW * unitToIn;
          activeSidesArr.push('3.رائٹ لٹک');
        }
        if (ls.hasBack) {
          edgeIn += cutL * unitToIn;
          activeSidesArr.push('4.بیک لٹک');
        }
        if (ls.hasSplashBack) {
          edgeIn += cutL * unitToIn;
          activeSidesArr.push('1.بیک سلیش');
        }
        if (ls.hasSplashLeft) {
          edgeIn += cutW * unitToIn;
          activeSidesArr.push('2.لیفٹ سلیش');
        }
        if (ls.hasSplashRight) {
          edgeIn += cutW * unitToIn;
          activeSidesArr.push('3.رائٹ سلیش');
        }
      } else {
        // Default: Front + 2 Width Sides edge polish (or full front length)
        edgeIn = (cutL + cutW * 2) * unitToIn;
        activeSidesArr.push('فرنٹ + سائیڈ دھار');
      }
      const edgeProfileRft = edgeIn / 12;
      const edgeProfileCostPKR = Math.round(edgeProfileRft * edgeRate);

      const rowTotalPKR =
        stoneCostPKR + cuttingCostPKR + polishCostPKR + edgeProfileCostPKR;

      return {
        rowNum: idx + 1,
        instanceId: p.instanceId,
        pieceCode: p.pieceCode,
        slabIndex: p.slabIndex,
        label: p.label,
        cutW,
        cutL,
        areaSqFt,
        slabRate,
        stoneCostPKR,
        cuttingRft,
        cutRate,
        cuttingCostPKR,
        polishSqFt,
        polRate,
        polishCostPKR,
        edgeProfileId: epMeta.id,
        edgeProfileEn: epMeta.en,
        edgeProfileUr: epMeta.ur,
        edgeSidesDescription: activeSidesArr.join(' + '),
        edgeProfileRft,
        edgeRate,
        edgeProfileCostPKR,
        rowTotalPKR,
      };
    });
  }, [
    allPlacedPieces,
    parts,
    unit,
    slabConfig.ratePerSqFt,
    cuttingRatePerRft,
    polishRatePerSqFt,
    edgeProfileRatePerRft,
  ]);

  const cuttingStats = useMemo(() => {
    const unitToIn = UNIT_TO_INCHES[unit] || 1;
    const sawOpsLengthUnits = summary.slabs.reduce(
      (acc, sl) => acc + sl.cuts.reduce((s, c) => s + (Number(c.length) || 0), 0),
      0
    );
    const piecesCutLengthUnits = allPlacedPieces.reduce(
      (acc, p) => acc + ((Number(p.width) || 0) + (Number(p.height) || 0)) * 2,
      0
    );
    const effectiveCutUnits = Math.max(sawOpsLengthUnits, piecesCutLengthUnits);
    const totalRunningInches = effectiveCutUnits * unitToIn;
    const totalRunningFeet = totalRunningInches / 12;
    const totalCuttingCostPKR = pieceBillingRows.reduce((s, r) => s + r.cuttingCostPKR, 0);
    const totalPolishSqFt = pieceBillingRows.reduce((s, r) => s + r.polishSqFt, 0);
    const totalPolishCostPKR = pieceBillingRows.reduce((s, r) => s + r.polishCostPKR, 0);
    const totalEdgeProfileRft = pieceBillingRows.reduce((s, r) => s + r.edgeProfileRft, 0);
    const totalEdgeProfileCostPKR = pieceBillingRows.reduce((s, r) => s + r.edgeProfileCostPKR, 0);
    const totalPiecesStoneCostPKR = pieceBillingRows.reduce((s, r) => s + r.stoneCostPKR, 0);
    const grandTotalInvoicePKR =
      summary.estimatedTotalSlabCostPKR +
      totalCuttingCostPKR +
      totalPolishCostPKR +
      totalEdgeProfileCostPKR;

    return {
      totalRunningInches,
      totalRunningFeet,
      totalCuttingCostPKR,
      totalPolishSqFt,
      totalPolishCostPKR,
      totalEdgeProfileRft,
      totalEdgeProfileCostPKR,
      totalPiecesStoneCostPKR,
      grandTotalInvoicePKR,
    };
  }, [summary.slabs, summary.estimatedTotalSlabCostPKR, allPlacedPieces, unit, pieceBillingRows]);

  // Save current bill snapshot to the user's computer & generate full Microsoft Excel (.xls) Billing File
  const handleGenerateExcelBill = (saveToComputerHistory = true) => {
    const createdStr = new Date().toLocaleString();
    if (saveToComputerHistory && typeof window !== 'undefined') {
      const newBillRecord = {
        id: `bill-${Date.now()}`,
        createdAt: createdStr,
        customerName: billCustomerName || 'ماربل بل',
        customerPhone: billCustomerPhone || '',
        materialName: slabConfig.materialName,
        lotId: slabConfig.lotId,
        slabWidth: slabConfig.width,
        slabLength: slabConfig.length,
        slabsUsed: summary.totalSlabsUsed,
        totalSlabsQty: slabConfig.quantity,
        slabRatePerSqFt: slabConfig.ratePerSqFt,
        cuttingRatePerRft,
        polishRatePerSqFt,
        edgeProfileRatePerRft,
        totalSqFt: Number(summary.totalUsedAreaSqFt.toFixed(2)),
        totalCutRft: Number(cuttingStats.totalRunningFeet.toFixed(2)),
        totalEdgeRft: Number(cuttingStats.totalEdgeProfileRft.toFixed(2)),
        grandTotalPKR: cuttingStats.grandTotalInvoicePKR,
        slabConfigSnapshot: { ...slabConfig },
        partsSnapshot: parts.map((pt) => ({ ...pt })),
      };
      const nextBills = [newBillRecord, ...savedComputerExcelBills].slice(0, 50);
      setSavedComputerExcelBills(nextBills);
      try {
        window.localStorage.setItem('stonecut_saved_excel_bills_v1', JSON.stringify(nextBills));
      } catch {
        // Ignore quota errors
      }
    }

    // Build Rich Styled HTML-Excel Workbook (.xls) that opens natively in Microsoft Excel with full Urdu/English tables
    const esc = (v: unknown) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const slabRowsHtml = summary.slabs
      .map((sl) => {
        const slabSqFt = sl.totalSlabAreaSqFt;
        const slabCost = Math.round(slabSqFt * (Number(slabConfig.ratePerSqFt) || 0));
        return `
          <tr>
            <td style="border:1px solid #334155;padding:6px;text-align:center;font-weight:bold;">Slab #${sl.slabIndex}</td>
            <td style="border:1px solid #334155;padding:6px;">${esc(slabConfig.materialName)} (${esc(slabConfig.lotId)})</td>
            <td style="border:1px solid #334155;padding:6px;text-align:center;font-weight:bold;">${sl.slabWidth}" × ${sl.slabLength}" (${unit})</td>
            <td style="border:1px solid #334155;padding:6px;text-align:center;">${sl.placedPieces.length} Pcs</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">${slabSqFt.toFixed(2)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;color:#047857;font-weight:bold;">${sl.usedAreaSqFt.toFixed(2)} (${sl.yieldPercent.toFixed(1)}%)</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;color:#b45309;">${sl.usableOffcutAreaSqFt.toFixed(2)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;color:#be123c;">${sl.scrapWasteAreaSqFt.toFixed(2)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">PKR ${Number(slabConfig.ratePerSqFt).toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;background:#ecfdf5;">PKR ${slabCost.toLocaleString()}</td>
          </tr>`;
      })
      .join('');

    const pieceRowsHtml = pieceBillingRows
      .map(
        (r) => `
          <tr>
            <td style="border:1px solid #334155;padding:6px;text-align:center;font-weight:bold;">${r.rowNum}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:center;font-weight:bold;color:#0369a1;">${esc(r.pieceCode)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:center;">Slab #${r.slabIndex}</td>
            <td style="border:1px solid #334155;padding:6px;font-weight:bold;">${esc(r.label)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:center;font-weight:bold;background:#fef3c7;">${formatNum(r.cutW)}" × ${formatNum(r.cutL)}"</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;">${r.areaSqFt.toFixed(2)} ft²</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">PKR ${r.slabRate.toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;">PKR ${r.stoneCostPKR.toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">${r.cuttingRft.toFixed(2)} R.Ft</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">PKR ${r.cutRate}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;color:#b45309;">PKR ${r.cuttingCostPKR.toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">${r.polishSqFt.toFixed(2)} ft²</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">PKR ${r.polRate}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;color:#0284c7;">PKR ${r.polishCostPKR.toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;font-weight:bold;color:#6d28d9;">${esc(r.edgeProfileUr)}</td>
            <td style="border:1px solid #334155;padding:6px;">${esc(r.edgeSidesDescription)}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">${r.edgeProfileRft.toFixed(2)} R.Ft</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;">PKR ${r.edgeRate}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;color:#6d28d9;">PKR ${r.edgeProfileCostPKR.toLocaleString()}</td>
            <td style="border:1px solid #334155;padding:6px;text-align:right;font-weight:bold;background:#dcfce7;color:#065f46;">PKR ${r.rowTotalPKR.toLocaleString()}</td>
          </tr>`
      )
      .join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Marble Cutting &amp; Edge Bill</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;">
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;">
          <tr>
            <td colspan="20" style="background:#0f172a;color:#fbbf24;font-size:16pt;font-weight:bold;text-align:center;padding:12px;">
              STONE EXPERT — MARBLE SLAB, CUTTING, POLISH &amp; EDGE PROFILE EXCEL BILL (ماربل سلیب، کٹنگ، پالش اور ایج پروفائل مکمل ایکسل بل)
            </td>
          </tr>
          <tr>
            <td colspan="4" style="background:#f1f5f9;font-weight:bold;">گاہک / پروجیکٹ کا نام (Customer):</td>
            <td colspan="6" style="font-weight:bold;">${esc(billCustomerName)} ${billCustomerPhone ? `(${esc(billCustomerPhone)})` : ''}</td>
            <td colspan="4" style="background:#f1f5f9;font-weight:bold;">تاریخ و وقت (Date):</td>
            <td colspan="6">${esc(createdStr)}</td>
          </tr>
          <tr>
            <td colspan="4" style="background:#f1f5f9;font-weight:bold;">پتھر / ماربل (Material &amp; Lot):</td>
            <td colspan="6" style="font-weight:bold;">${esc(slabConfig.materialName)} (Lot: ${esc(slabConfig.lotId)})</td>
            <td colspan="4" style="background:#f1f5f9;font-weight:bold;">اسٹاک سلیب سائز (1.W × 2.L):</td>
            <td colspan="6" style="font-weight:bold;">${slabConfig.width}" × ${slabConfig.length}" (${unit}) — کل استعمال شدہ سلیب: ${summary.totalSlabsUsed} / ${slabConfig.quantity}</td>
          </tr>
          <tr><td colspan="20"></td></tr>

          <!-- SECTION 1: SLABS SIZE & RATE TABLE -->
          <tr>
            <td colspan="10" style="background:#1e293b;color:#38bdf8;font-size:13pt;font-weight:bold;padding:8px;">
              1️⃣ سلیبوں کے سائز، رقبہ اور ریٹ کی تفصیل (SLABS SIZE, AREA &amp; RATE SCHEDULE)
            </td>
          </tr>
          <tr style="background:#e2e8f0;font-weight:bold;text-align:center;">
            <td>سلیب نمبر (Slab #)</td>
            <td>پتھر کا نام (Material)</td>
            <td>سلیب سائز 1.چوڑائی × 2.لمبائی (Size)</td>
            <td>کٹنے والے پیس (Cut Pieces)</td>
            <td>کل سلیب رقبہ (Total Sq.Ft)</td>
            <td>استعمال شدہ رقبہ (Used Sq.Ft)</td>
            <td>قابلِ استعمال بچت (Offcut Sq.Ft)</td>
            <td>ضائع ویسٹ (Scrap Sq.Ft)</td>
            <td>سلیب ریٹ فی فٹ (Rate/Sq.Ft)</td>
            <td>سلیب کی کل رقم (Slab Total PKR)</td>
          </tr>
          ${slabRowsHtml}
          <tr style="background:#fef3c7;font-weight:bold;">
            <td colspan="4" style="text-align:right;padding:6px;">کل سلیب میزان (Total Slabs Summary — ${summary.totalSlabsUsed} Slabs Used):</td>
            <td style="text-align:right;padding:6px;">${summary.totalSlabAreaSqFt.toFixed(2)} ft²</td>
            <td style="text-align:right;padding:6px;">${summary.totalUsedAreaSqFt.toFixed(2)} ft²</td>
            <td style="text-align:right;padding:6px;">${summary.totalUsableOffcutAreaSqFt.toFixed(2)} ft²</td>
            <td style="text-align:right;padding:6px;">${summary.totalScrapWasteAreaSqFt.toFixed(2)} ft²</td>
            <td style="text-align:right;padding:6px;">PKR ${Number(slabConfig.ratePerSqFt).toLocaleString()}/ft²</td>
            <td style="text-align:right;padding:6px;background:#dcfce7;color:#065f46;">PKR ${summary.estimatedTotalSlabCostPKR.toLocaleString()}</td>
          </tr>
          <tr><td colspan="20"></td></tr>

          <!-- SECTION 2: PER-PIECE CUTTING, POLISH & EDGE PROFILE TABLE -->
          <tr>
            <td colspan="20" style="background:#064e3b;color:#a7f3d0;font-size:13pt;font-weight:bold;padding:8px;">
              2️⃣ ہر کٹنگ پیس کا مکمل بل — کٹنگ، پالش اور ایج پروفائل کے ساتھ (EVERY CUT PIECE WITH CUTTING, POLISH &amp; EDGE PROFILE BILL)
            </td>
          </tr>
          <tr style="background:#d1fae5;font-weight:bold;text-align:center;">
            <td>نمبر (#)</td>
            <td>پیس کوڈ (Code)</td>
            <td>سلیب نمبر (Slab #)</td>
            <td>جگہ / تفصیل (Part Label)</td>
            <td>کٹ سائز 1.W × 2.L (${unit})</td>
            <td>رقبہ (Area Sq.Ft)</td>
            <td>پتھر ریٹ (Slab Rate)</td>
            <td>پتھر کی رقم (Stone PKR)</td>
            <td>کٹنگ رننگ فٹ (Cut R.Ft)</td>
            <td>کٹنگ ریٹ (Cut Rate)</td>
            <td>کٹنگ بل (Cutting PKR)</td>
            <td>پالش رقبہ (Polish Sq.Ft)</td>
            <td>پالش ریٹ (Polish Rate)</td>
            <td>پالش بل (Polish PKR)</td>
            <td>ایج پروفائل ڈیزائن (Edge Profile)</td>
            <td>ایج / لٹک سائیڈز (Sides)</td>
            <td>ایج رننگ فٹ (Edge R.Ft)</td>
            <td>ایج ریٹ (Edge Rate)</td>
            <td>ایج پروفائل بل (Edge PKR)</td>
            <td>اس پیس کا کل بل (Piece Total PKR)</td>
          </tr>
          ${pieceRowsHtml}
          <tr style="background:#fef08a;font-weight:bold;">
            <td colspan="5" style="text-align:right;padding:8px;">تمام کٹنگ پیسز کا میزان (Total for ${pieceBillingRows.length} Cut Pieces):</td>
            <td style="text-align:right;padding:8px;">${summary.totalUsedAreaSqFt.toFixed(2)} ft²</td>
            <td></td>
            <td style="text-align:right;padding:8px;">PKR ${cuttingStats.totalPiecesStoneCostPKR.toLocaleString()}</td>
            <td style="text-align:right;padding:8px;">${cuttingStats.totalRunningFeet.toFixed(2)} R.Ft</td>
            <td></td>
            <td style="text-align:right;padding:8px;">PKR ${cuttingStats.totalCuttingCostPKR.toLocaleString()}</td>
            <td style="text-align:right;padding:8px;">${cuttingStats.totalPolishSqFt.toFixed(2)} ft²</td>
            <td></td>
            <td style="text-align:right;padding:8px;">PKR ${cuttingStats.totalPolishCostPKR.toLocaleString()}</td>
            <td colspan="2"></td>
            <td style="text-align:right;padding:8px;">${cuttingStats.totalEdgeProfileRft.toFixed(2)} R.Ft</td>
            <td></td>
            <td style="text-align:right;padding:8px;">PKR ${cuttingStats.totalEdgeProfileCostPKR.toLocaleString()}</td>
            <td style="text-align:right;padding:8px;background:#16a34a;color:#ffffff;font-size:12pt;">
              PKR ${(cuttingStats.totalPiecesStoneCostPKR + cuttingStats.totalCuttingCostPKR + cuttingStats.totalPolishCostPKR + cuttingStats.totalEdgeProfileCostPKR).toLocaleString()}
            </td>
          </tr>
          <tr><td colspan="20"></td></tr>

          <!-- SECTION 3: GRAND SUMMARY INVOICE -->
          <tr>
            <td colspan="8" style="background:#0f172a;color:#fbbf24;font-size:13pt;font-weight:bold;padding:8px;">
              3️⃣ فائنل کسٹمر بل خلاصہ (FINAL CUSTOMER INVOICE SUMMARY)
            </td>
          </tr>
          <tr>
            <td colspan="5" style="font-weight:bold;padding:6px;background:#f8fafc;">1. کل استعمال شدہ سلیبوں کی رقم (${summary.totalSlabsUsed} Slabs = ${summary.totalSlabAreaSqFt.toFixed(2)} Sq.Ft @ PKR ${slabConfig.ratePerSqFt}/Sq.Ft):</td>
            <td colspan="3" style="text-align:right;font-weight:bold;padding:6px;">PKR ${summary.estimatedTotalSlabCostPKR.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="5" style="font-weight:bold;padding:6px;background:#f8fafc;">2. کل کٹنگ بل (${cuttingStats.totalRunningFeet.toFixed(2)} R.Ft @ PKR ${cuttingRatePerRft}/R.Ft):</td>
            <td colspan="3" style="text-align:right;font-weight:bold;padding:6px;">PKR ${cuttingStats.totalCuttingCostPKR.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="5" style="font-weight:bold;padding:6px;background:#f8fafc;">3. کل سرفیس پالش بل (${cuttingStats.totalPolishSqFt.toFixed(2)} Sq.Ft @ PKR ${polishRatePerSqFt}/Sq.Ft):</td>
            <td colspan="3" style="text-align:right;font-weight:bold;padding:6px;">PKR ${cuttingStats.totalPolishCostPKR.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="5" style="font-weight:bold;padding:6px;background:#f8fafc;">4. کل ایج پروفائل / گولا / مائٹر لٹک بل (${cuttingStats.totalEdgeProfileRft.toFixed(2)} R.Ft @ PKR ${edgeProfileRatePerRft}/R.Ft):</td>
            <td colspan="3" style="text-align:right;font-weight:bold;padding:6px;">PKR ${cuttingStats.totalEdgeProfileCostPKR.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="5" style="font-weight:bold;font-size:14pt;padding:10px;background:#065f46;color:#ffffff;">کل واجب الادا بل (GRAND TOTAL BILL PKR):</td>
            <td colspan="3" style="text-align:right;font-weight:bold;font-size:14pt;padding:10px;background:#065f46;color:#fbbf24;">PKR ${cuttingStats.grandTotalInvoicePKR.toLocaleString()}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanCustomer = (billCustomerName || 'Customer').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    link.download = `StoneExpert_Excel_Bill_${cleanCustomer}_${slabConfig.lotId || 'Slab'}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: tr('Excel Bill Generated & Saved to Computer', 'ایکسل بل ڈاؤن لوڈ اور کمپیوٹر میں سیو ہو گیا!'),
      description: tr(
        'Saved to your computer with full Slab Sizes, Rates, Cutting, Polish, and Edge Profile breakdown.',
        'آپ کے کمپیوٹر میں ڈیٹا سیو ہو گیا ہے اور سلیب سائز، ریٹ، کٹنگ، پالش اور ایج پروفائل والی مکمل ایکسل فائل بن گئی ہے۔'
      ),
    });
  };

  const activeHighlightedPiece = useMemo(() => {
    if (hoveredPiece) return hoveredPiece;
    if (selectedPieceId) {
      return allPlacedPieces.find((p) => p.instanceId === selectedPieceId) || null;
    }
    return null;
  }, [hoveredPiece, selectedPieceId, allPlacedPieces]);

  // Manual vein nudge handler for dragging/shifting a placed piece over the marble veins
  const handleNudgePieceOnSlab = (instanceId: string, deltaX: number, deltaY: number) => {
    setManualPieceOffsets((prev) => {
      const curr = prev[instanceId] || { dx: 0, dy: 0 };
      return {
        ...prev,
        [instanceId]: {
          dx: Number((curr.dx + deltaX).toFixed(2)),
          dy: Number((curr.dy + deltaY).toFixed(2)),
        },
      };
    });
  };

  const handleResetPieceOffsets = () => {
    setManualPieceOffsets({});
    toast({
      title: 'Vein Offsets Reset',
      description: 'تمام ٹکڑوں کی پوزیشن ڈیفالٹ آٹو نیسٹنگ پر سیٹ کر دی گئی ہے۔',
    });
  };

  const hiContrastInputClass =
    'h-9 text-xs font-medium bg-slate-950 text-slate-100 border-slate-700 placeholder:text-slate-500 focus-visible:ring-sky-500';
  const cadBtnSecondary =
    'h-8 px-3 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-500 text-slate-100 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors';
  const cadBtnPrimary =
    'h-8 px-3.5 rounded-md border border-sky-500/60 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors shadow-2xs';
  const cadBtnSubtle =
    'h-7 px-2.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors';

  return (
    <div
      ref={diagramContainerRef}
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen overflow-y-auto overflow-x-hidden bg-slate-950 p-3 md:p-6'
          : 'w-full max-w-full overflow-x-hidden min-h-[75vh]'
      } text-slate-100`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={pcFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlabFileSelect}
        className="hidden"
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSlabFileSelect}
        className="hidden"
      />
      <input
        ref={bulkSlabsInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleBulkSlabsUpload}
        className="hidden"
      />

      {/* Dedicated Top Fullscreen Control Bar when Fullscreen Mode is Active */}
      {isFullscreen && (
        <div className="sticky top-0 z-50 mb-4 rounded-lg border border-sky-500/40 bg-slate-900/95 backdrop-blur px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                } else if (typeof window !== 'undefined') {
                  window.location.assign('/');
                }
              }}
              className="h-8 px-3 rounded-md border border-amber-400/70 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <Home className="h-3.5 w-3.5" />
              <span>{tr('Home Screen', 'ہوم اسکرین')}</span>
            </button>
            <span className="px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-mono font-semibold">
              FULLSCREEN CAD VIEWPORT (100% SCREEN)
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSetFullscreenMode('none')}
            className="h-8 px-3.5 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Minimize2 className="h-3.5 w-3.5 text-sky-400" />
            <span>{tr('Exit Fullscreen (ESC)', 'نارمل سکرین پر واپس آئیں (ESC)')}</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          CLEAN, SIMPLE TOP BAR & 4 LARGE MAIN WORKSPACE BUTTONS
          (بغیر کسی پیچیدگی کے — ایک بٹن صرف ایک جگہ، بڑے اور آسان بٹن)
         ===================================================================== */}
      {fullscreenTarget !== 'slab_diagram' && fullscreenTarget !== 'floor_diagram' && (
        <div
          className={`relative z-40 rounded-xl border border-slate-800 bg-slate-900 text-white shadow-lg print:hidden overflow-hidden ${
            simpleMainScreen === 'floor_planner' ? 'mb-1.5' : 'mb-4'
          }`}
          dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
        >
          {/* Row 1: Back to Home + Brand Header + Language Switcher + Primary Export Actions */}
          <div
            className={`px-3 sm:px-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 ${
              simpleMainScreen === 'floor_planner' ? 'py-1.5' : 'py-2.5'
            }`}
          >
            {/* Left: Back to Home Screen + Brand Identity */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (onBackToHome) {
                    onBackToHome();
                  } else if (typeof window !== 'undefined') {
                    window.location.assign('/');
                  }
                }}
                className="h-9 px-3 rounded-lg border border-amber-400/70 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
                title={tr('Back to Home Screen', 'ہوم اسکرین پر واپس جائیں')}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <Home className="h-3.5 w-3.5" />
                <span>{tr('Home', 'ہوم اسکرین')}</span>
              </button>

              {onOpenMaterialPicker && (
                <button
                  type="button"
                  onClick={onOpenMaterialPicker}
                  className="h-9 px-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-sky-400 text-slate-200 hover:text-sky-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  title={tr('Choose another catalog material or slab photo', 'دوسرا مٹیریل یا فوٹو منتخب کریں')}
                >
                  <Camera className="h-3.5 w-3.5 text-sky-400" />
                  <span className="hidden sm:inline">{tr('Material / Photo', 'نیا مٹیریل / فوٹو')}</span>
                </button>
              )}

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-mono font-extrabold text-xs shadow shrink-0">
                CAD
              </div>
              <div>
                <div className="text-sm font-extrabold text-white">
                  {tr(
                    'StoneExpert — Simple Floor Planner, Bookmatch & Cutting Optimizer',
                    'اسٹون ایکسپرٹ — سادہ روم فلور پلانر، بک میچ اور کٹنگ آپٹیمائزر'
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {slabConfig.materialName} · {tr('Slab Size', 'سلیب سائز')}: {slabConfig.width}&quot; ×{' '}
                  {slabConfig.length}&quot; ({slabConfig.quantity} {tr('Slabs', 'سلیب')})
                  {computerLastSavedAt
                    ? ` · ✓ ${tr('Saved on PC', 'کمپیوٹر میں محفوظ')}: ${computerLastSavedAt}`
                    : ''}
                </div>
              </div>
            </div>

            {/* Center: Language Switcher (اردو | English) + Unit Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border-2 border-amber-500/80 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setCadLang('ur')}
                  className={`px-3 py-1 rounded-md text-xs font-extrabold transition-colors ${
                    cadLang === 'ur'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  اردو
                </button>
                <button
                  type="button"
                  onClick={() => setCadLang('en')}
                  className={`px-3 py-1 rounded-md text-xs font-extrabold transition-colors ${
                    cadLang === 'en'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                {(['in', 'ft'] as UnitType[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleUnitChange(u)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors ${
                      unit === u ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {u === 'in' ? tr('Inches (")', 'انچ (")') : tr('Feet (ft)', 'فٹ (ft)')}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: One-Click Excel Download + PDF Print + Fullscreen */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateExcelBill(true)}
                className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow border border-emerald-400/50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>{tr('📊 Download Excel Bill (.xls)', '📊 ایکسل بل ڈاؤن لوڈ (.xls)')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintWorkshopSheet}
                className="h-9 px-3.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
              >
                <Printer className="h-4 w-4" />
                <span>{tr('🖨️ PDF Blueprint', '🖨️ پی ڈی ایف نقشہ (PDF)')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetFullscreenMode(isFullscreen ? 'none' : 'workstation')}
                className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5 text-sky-400" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                )}
                <span>{isFullscreen ? tr('Normal', 'نارمل') : tr('Full Screen', 'بڑی سکرین')}</span>
              </button>

              {onSaveToCustomerQuote && (
                <button
                  type="button"
                  onClick={() => {
                    const totalCost =
                      summary.estimatedTotalSlabCostPKR > 0
                        ? summary.estimatedTotalSlabCostPKR
                        : Math.round(
                            summary.totalUsedAreaSqFt * (Number(slabConfig.ratePerSqFt) || 450)
                          );
                    onSaveToCustomerQuote({
                      total: totalCost,
                      details: {
                        materialName: slabConfig.materialName,
                        lotId: slabConfig.lotId,
                        unit,
                        slabConfig,
                        parts,
                        summary,
                        totalUsedAreaSqFt: Number(summary.totalUsedAreaSqFt.toFixed(2)),
                        totalSlabAreaSqFt: Number(summary.totalSlabAreaSqFt.toFixed(2)),
                        totalSlabsUsed: summary.totalSlabsUsed,
                      },
                      variant: initialVariant,
                    });
                  }}
                  className="h-9 px-3.5 rounded-lg border border-emerald-500/60 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{tr('Save Quote', 'کوٹیشن سیو کریں')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 1B: GENERAL CUTTING & EDGE TRIM (Shown when Slab Cutter / Stock / Bill is active; Floor Planner has unified AutoCAD Top Material Bar) */}
          {simpleMainScreen !== 'floor_planner' && (
            <div className="px-4 py-1.5 border-b border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 font-mono font-extrabold text-[11px]">
                  {tr('⚙️ Machine & Trim Settings:', '⚙️ جنرل کٹنگ سیٹنگ:')}
                </span>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="text-[11px] font-bold text-rose-300">
                    {tr('🪚 Kerf:', '🪚 بلیڈ:')}
                  </span>
                  <select
                    value={String(slabConfig.kerf)}
                    onChange={(e) =>
                      setSlabConfig((prev) => ({
                        ...prev,
                        kerf: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="h-6 rounded bg-slate-900 border border-rose-500/50 text-white font-mono text-[11px] font-bold px-1.5 cursor-pointer"
                  >
                    <option value="0">{tr('0" (No Kerf)', '0" (بغیر گیپ)')}</option>
                    <option value="0.125">{tr('0.125" (3mm)', '0.125" (1 سوتر)')}</option>
                    <option value="0.15">{tr('0.15" (3.8mm)', '0.15" (اسٹینڈرڈ)')}</option>
                    <option value="0.1875">{tr('0.1875" (4.5mm)', '0.1875" (ڈیڑھ سوتر)')}</option>
                    <option value="0.25">{tr('0.25" (6mm)', '0.25" (2 سوتر)')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="text-[11px] font-bold text-sky-300">
                    {tr('📏 Trim (Safai):', '📏 صفائی (ایج ٹرم):')}
                  </span>
                  <select
                    value={String(slabConfig.edgeTrim)}
                    onChange={(e) =>
                      setSlabConfig((prev) => ({
                        ...prev,
                        edgeTrim: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="h-6 rounded bg-slate-900 border border-sky-500/50 text-white font-mono text-[11px] font-bold px-1.5 cursor-pointer"
                  >
                    <option value="0">{tr('0" (Full Slab)', '0" (پوری سلیب)')}</option>
                    <option value="0.5">{tr('0.5" (Half Inch)', '0.5" (آدھی انچی)')}</option>
                    <option value="0.75">{tr('0.75" (3/4 Inch)', '0.75" (پونے انچی)')}</option>
                    <option value="1">{tr('1.0" (1 Inch)', '1.0" (ایک انچی)')}</option>
                    <option value="1.5">{tr('1.5" (1.5 Inch)', '1.5" (ڈیڑھ انچی)')}</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] font-mono text-emerald-300">
                {tr(
                  `✓ Net Slab: ${Math.max(1, slabConfig.width - slabConfig.edgeTrim * 2)}" × ${Math.max(1, slabConfig.length - slabConfig.edgeTrim * 2)}" (Kerf: ${slabConfig.kerf}")`,
                  `✓ صافی سلیب: ${Math.max(1, slabConfig.width - slabConfig.edgeTrim * 2)}" × ${Math.max(1, slabConfig.length - slabConfig.edgeTrim * 2)}" (بلیڈ: ${slabConfig.kerf}")`
                )}
              </div>
            </div>
          )}

          {/* Row 2: SLIM AUTOCAD WORKSPACE MODE STRIP */}
          <div
            className={`px-3 bg-slate-900 flex flex-wrap items-center justify-between gap-2 ${
              simpleMainScreen === 'floor_planner' ? 'py-1' : 'py-1.5'
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSimpleMainScreen('floor_planner');
                  setActiveResultTab('dual_diagrams');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simpleMainScreen === 'floor_planner'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/60'
                }`}
              >
                <span>🏛️</span>
                <span>
                  {tr(
                    '1. AutoCAD Floor Planner & Material Stock Studio',
                    '1. آٹو کیڈ فلور پلانر اور اسٹاک سلیب اسٹوڈیو (ایک اسکرین)'
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimpleMainScreen('slab_cutter');
                  setActiveResultTab('dual_diagrams');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simpleMainScreen === 'slab_cutter'
                    ? 'bg-sky-600 border-sky-300 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-sky-500/60'
                }`}
              >
                <span>✂️</span>
                <span>
                  {tr(
                    `2. Slab Cutter (${parts.length} Pcs)`,
                    `2. سلیب کٹنگ ڈایاگرام (سیڑھی/کچن/وینٹی · ${parts.length})`
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimpleMainScreen('stock_slabs');
                  setActiveResultTab('stock_inventory');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simpleMainScreen === 'stock_slabs'
                    ? 'bg-purple-600 border-purple-300 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-purple-500/60'
                }`}
              >
                <span>📦</span>
                <span>
                  {tr(
                    `3. Stock Ledger (${savedStockList.length} Lots)`,
                    `3. مکمل اسٹاک ریکارڈ اور کریک مینیجر (${savedStockList.length})`
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimpleMainScreen('excel_bill');
                  setActiveResultTab('bom');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simpleMainScreen === 'excel_bill'
                    ? 'bg-emerald-600 border-emerald-300 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-emerald-500/60'
                }`}
              >
                <span>📊</span>
                <span>
                  {tr(
                    `4. Excel Bill (PKR ${cuttingStats.grandTotalInvoicePKR.toLocaleString()})`,
                    `4. ایکسل بل اور ریٹ (PKR ${cuttingStats.grandTotalInvoicePKR.toLocaleString()})`
                  )}
                </span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden xl:block">
              {tr(
                'Material + Stock Slabs + Floor & Cut Diagrams unified on 1 Screen',
                'مٹیریل، اسٹاک سلیب تصویریں اور فلور ڈایاگرام سب ایک ہی اسکرین پر موجود ہیں'
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 1 (DEFAULT): DEDICATED 4-WINDOW FLOOR PLANNER & ROOM BOOKMATCH
          Opens when Big Button #1 ("1. فلور پلانر اور روم بک میچ") is selected!
         ===================================================================== */}
      {/* =====================================================================
          SCREEN 1 (DEFAULT): DEDICATED 4-WINDOW FLOOR PLANNER & ROOM BOOKMATCH
          Kept mounted at all times so switching between Stock and Diagram never resets or loses uploaded photos!
         ===================================================================== */}
      <div
        className={
          simpleMainScreen === 'floor_planner' &&
          fullscreenTarget !== 'slab_diagram' &&
          fullscreenTarget !== 'floor_diagram'
            ? 'mb-1 block'
            : 'hidden'
        }
      >
        <RoomFloorBookmatchPlanner
          cadLang={cadLang}
          slabImageUrl={slabImageUrl}
          slabMaterialName={slabConfig.materialName}
          slabLotId={slabConfig.lotId}
          slabWidthIn={slabConfig.width}
          slabLengthIn={slabConfig.length}
          slabQuantity={slabConfig.quantity}
          slabRatePerSqFt={slabConfig.ratePerSqFt}
          bladeKerfIn={slabConfig.kerf}
          edgeTrimIn={slabConfig.edgeTrim}
          onUpdateKerfAndEdgeTrim={(kerf, edgeTrim) =>
            setSlabConfig((prev) => ({
              ...prev,
              kerf,
              edgeTrim,
            }))
          }
          onSaveCurrentSlabToStock={() => handleSaveCurrentSlabToStock(false)}
          onLoadSavedStockLot={(stockId) => {
            const target = savedStockList.find((s) => s.id === stockId);
            if (target) handleLoadStockItemIntoOptimizer(target);
          }}
          onAdjustSavedStockQty={handleAdjustSavedStockQty}
          onDeleteSavedStockLot={handleDeleteSavedStockItem}
          onBulkUploadSlabPhotos={() => bulkSlabsInputRef.current?.click()}
          savedStockLots={savedStockList.map((st) => ({
            id: st.id,
            category: st.category,
            materialName: st.materialName,
            lotId: st.lotId,
            width: st.width,
            length: st.length,
            quantity: st.quantity,
            ratePerSqFt: st.ratePerSqFt,
            slabImageUrl: st.slabImageUrl,
            notes: st.notes,
          }))}
          onSaveWasteOffcutsToOptimizer={(wasteItems) => {
            const timestamp = Date.now();
            const newItems: SavedStockSlabItem[] = wasteItems.map((w, idx) => ({
              id: `room-offcut-${timestamp}-${idx}`,
              category: 'usable_offcut',
              materialName: w.materialName,
              lotId: `OFFCUT-${Math.floor(100 + Math.random() * 900)}`,
              width: Number(w.width.toFixed(1)),
              length: Number(w.length.toFixed(1)),
              quantity: w.quantity,
              ratePerSqFt: w.ratePerSqFt,
              kerf: slabConfig.kerf,
              edgeTrim: 0,
              unit: 'in',
              slabImageUrl: w.slabImageUrl,
              slabImageSourceLabel: `${w.materialName} (${w.width.toFixed(1)}×${w.length.toFixed(1)})`,
              masterFrameScale: 100,
              masterFrameOffsetX: 0,
              masterFrameOffsetY: 0,
              masterFrameRotation: 0,
              locationRack: 'Waste / Offcut Bank',
              notes: w.notes,
              savedAt: new Date().toLocaleTimeString(),
            }));
            setSavedStockList((prev) => [...newItems, ...prev]);
            toast({
              title: tr(
                `${newItems.length} Remaining Waste Size(s) Saved to Optimizer Bank!`,
                `${newItems.length} بچے ہوئے ویسٹ پیسز آپٹیمائزر بینک میں محفوظ ہو گئے!`
              ),
              description: tr(
                'Ready to reuse in the Next Room Floor, Outer Border, or Slab Cutting Optimizer.',
                'اب آپ ان بچے ہوئے پیسز کو اگلے کمرے کے فرش، بارڈر یا سلیب کٹنگ آپٹیمائزر میں استعمال کر سکتے ہیں۔'
              ),
            });
          }}
          onLoadSavedStockInSlabCutter={(stockId) => {
            const target = savedStockList.find((s) => s.id === stockId);
            if (!target) return;
            handleLoadStockItemIntoOptimizer(target);
            setSimpleMainScreen('slab_cutter');
          }}
          onAddBorderSlabToStock={(newBorderSlab) => {
            const newItem: SavedStockSlabItem = {
              id: `border-stock-${Date.now()}`,
              category: 'full_slab_lot',
              materialName: newBorderSlab.materialName,
              lotId: `BORDER-${Math.floor(100 + Math.random() * 900)}`,
              width: newBorderSlab.width,
              length: newBorderSlab.length,
              quantity: newBorderSlab.quantity,
              ratePerSqFt: newBorderSlab.ratePerSqFt,
              kerf: slabConfig.kerf,
              edgeTrim: slabConfig.edgeTrim,
              unit: 'in',
              slabImageUrl: newBorderSlab.slabImageUrl,
              slabImageSourceLabel: `${newBorderSlab.materialName} (${newBorderSlab.width}×${newBorderSlab.length})`,
              masterFrameScale: 100,
              masterFrameOffsetX: 0,
              masterFrameOffsetY: 0,
              masterFrameRotation: 0,
              locationRack: 'Room Border Stock',
              notes: 'Room Outer Border Marble Slab',
              savedAt: new Date().toLocaleTimeString(),
            };
            setSavedStockList((prev) => [newItem, ...prev]);
            toast({
              title: tr(
                'Border Marble Slab Saved to Stock!',
                'بارڈر ماربل سلیب اسٹاک میں محفوظ ہو گئی!'
              ),
              description: `${newBorderSlab.materialName} (${newBorderSlab.width}" × ${newBorderSlab.length}")`,
            });
          }}
          onUpdateSlabConfig={(patch) =>
            setSlabConfig((prev) => ({
              ...prev,
              ...patch,
            }))
          }
          onTriggerSlabPhotoUpload={() => triggerSlabUpload(0, false)}
          onSelectPresetSlabTexture={(preset) => {
            const nextUrl = createSyntheticVeinedSlabDataUrl(preset);
            setSlabImageUrl(nextUrl);
            setSlabImageSourceLabel(
              preset === 'statuario'
                ? 'White Statuario Vein'
                : preset === 'black_gold'
                ? 'Black & Gold Marble'
                : 'Emerald Green Onyx'
            );
          }}
          onApplyRoomPartsToCutter={(roomParts: RoomGeneratedPart[]) => {
            const maxTargetSlab = roomParts.reduce(
              (mx, rp) => Math.max(mx, rp.targetSlabNumber || 0),
              4
            );
            const converted: CutPartInput[] = roomParts.map((rp, i) => ({
              id: `room-pt-${Date.now()}-${i}`,
              label: rp.label,
              width: rp.widthIn,
              length: rp.lengthIn,
              quantity: rp.quantity,
              allowRotation: !rp.isBookmatch,
              isBookmatchedPair: rp.isBookmatch,
              installZone: 'floor',
              priority: rp.isBookmatch ? 'high' : 'normal',
              color: rp.color || PART_PALETTE[i % PART_PALETTE.length],
              edgeProfile: 'flat_polish',
              targetSlabNumber: rp.targetSlabNumber,
            }));
            setSlabConfig((prev) => ({
              ...prev,
              quantity: Math.max(prev.quantity, maxTargetSlab),
            }));
            setParts(converted);
            setFourSlabBookmatchMode(true);
            setSimpleMainScreen('slab_cutter');
            setActiveResultTab('dual_diagrams');
            toast({
              title: tr(
                'Room Floor & Border Pieces Sent to Slab Cutter!',
                'کمرے کے بک میچ اور بارڈر پیسز سلیب کٹنگ ڈایاگرام میں سیٹ ہو گئے!'
              ),
              description: tr(
                'Outer border strips are automatically paired onto the leftover space of the Bookmatch slabs.',
                'بارڈر کے پیسز خودکار طور پر بک میچ سلیب کے بچے ہوئے حصے میں ایڈجسٹ ہو گئے ہیں۔'
              ),
            });
          }}
          onGenerateExcelBill={() => handleGenerateExcelBill(true)}
        />
      </div>

      {/* Main Full-Width Workstation Layout (Shown when Slab Cutter, Stock Slabs, or Excel Bill is active) */}
      <div
        style={
          {
            '--cad-sidebar-w': `${Math.max(24, Math.min(44, cadWorkspace.sidebarWidthPercent || 30))}%`,
          } as React.CSSProperties
        }
        className={
          simpleMainScreen === 'floor_planner'
            ? 'hidden'
            : simpleMainScreen === 'slab_cutter'
            ? `flex flex-col ${
                cadWorkspace.sidebarPosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
              } items-start gap-2.5 w-full`
            : 'flex flex-col gap-3 w-full'
        }
      >
        {/* =====================================================================
            CLASSIC SIDEBAR TOOL FOR CUTTING OPTIMIZER:
            SECTION 1: STOCK SLAB (اسٹاک سلیب) + SECTION 2: CUT PIECES (کٹ پیسز)
           ===================================================================== */}
        {simpleMainScreen === 'slab_cutter' &&
          !isLeftDockCollapsed &&
          fullscreenTarget !== 'slab_diagram' &&
          fullscreenTarget !== 'floor_diagram' && (
            <aside
              dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
              className="w-full lg:w-[var(--cad-sidebar-w)] shrink-0 rounded-xl border-2 border-slate-700/90 bg-slate-900 text-white shadow-xl overflow-hidden lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] flex flex-col print:hidden"
            >
              {/* Sticky Sidebar Header with Dock Left/Right & Collapse */}
              <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-6 w-6 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Scissors className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">
                      {tr('Stock & Cut Pieces', 'اسٹاک سلیب اور کٹ پیسز')}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {slabConfig.width}&quot;×{slabConfig.length}&quot; ({slabConfig.quantity}) ·{' '}
                      {parts.length} {tr('cut rows', 'کٹ پیس')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setCadWorkspace((prev) => ({
                        ...prev,
                        sidebarPosition: prev.sidebarPosition === 'right' ? 'left' : 'right',
                      }))
                    }
                    className="px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white hover:border-amber-500/60"
                    title={tr('Move sidebar to Left or Right side', 'سائیڈ بار کو بائیں یا دائیں طرف منتقل کریں')}
                  >
                    {cadWorkspace.sidebarPosition === 'right'
                      ? tr('◀ Left', '◀ بائیں')
                      : tr('Right ▶', 'دائیں ▶')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLeftDockCollapsed(true)}
                    className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/60"
                    title={tr('Hide Sidebar (Enlarge Diagram)', 'سائیڈ بار چھپائیں (ڈایاگرام بڑا کریں)')}
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Dual-Section Sidebar Body */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
                {/* -------------------------------------------------------------
                    SECTION 1: STOCK SLAB (اسٹاک سلیب)
                   ------------------------------------------------------------- */}
                <section className="rounded-lg border border-amber-500/50 bg-slate-950/90 overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSidebarStockExpanded((v) => !v)}
                      className="flex items-center gap-1.5 text-left min-w-0 flex-1"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold shrink-0">
                        1
                      </span>
                      <span className="text-xs font-extrabold text-amber-300 truncate">
                        {tr('STOCK SLAB (Material & Size)', 'اسٹاک سلیب (مٹیریل اور سائز)')}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {isSidebarStockExpanded ? '▾' : '▸'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSaveCurrentSlabToStock(false)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                        title={tr('Save current slab to Stock Ledger', 'موجودہ سلیب اسٹاک ریکارڈ میں محفوظ کریں')}
                      >
                        <HardDrive className="h-3 w-3" />
                        <span>{tr('Save', 'سیو')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSimpleMainScreen('stock_slabs');
                          setActiveResultTab('stock_inventory');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 text-[10px] font-bold"
                        title={tr('Open Stock Ledger', 'اسٹاک ریکارڈ کھولیں')}
                      >
                        {tr('Stock', 'اسٹاک')} ({savedStockList.length})
                      </button>
                    </div>
                  </div>

                  {isSidebarStockExpanded && (
                    <div className="p-2.5 space-y-2">
                      {/* Saved Stock Selector */}
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-300">
                          {tr('Load Saved Stock Lot / Offcut:', 'محفوظ شدہ اسٹاک لاٹ منتخب کریں:')}
                        </Label>
                        <select
                          value={
                            savedStockList.find(
                              (st) =>
                                st.materialName === slabConfig.materialName &&
                                st.width === slabConfig.width &&
                                st.length === slabConfig.length
                            )?.id || ''
                          }
                          onChange={(e) => {
                            const found = savedStockList.find((st) => st.id === e.target.value);
                            if (found) handleLoadStockItemIntoOptimizer(found);
                          }}
                          className="w-full h-7 rounded bg-slate-900 border border-amber-500/40 text-white text-[11px] font-semibold px-2 cursor-pointer"
                        >
                          <option value="">
                            {tr('-- Select Stock Lot from Inventory --', '-- اسٹاک لاٹ منتخب کریں --')}
                          </option>
                          {savedStockList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.category === 'usable_offcut' ? '♻ ' : '🪨 '}
                              {st.materialName} ({st.width}×{st.length} · {st.quantity} pcs)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Slab Photo Preview & Upload / Frame Actions */}
                      <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 p-1.5">
                        <div className="h-12 w-16 rounded overflow-hidden border border-slate-700 bg-slate-950 shrink-0 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slabImageUrl}
                            alt={slabConfig.materialName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[10px] font-semibold text-slate-200 truncate">
                            {slabImageSourceLabel || slabConfig.materialName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => triggerSlabUpload(0, false)}
                              className="px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center gap-1"
                            >
                              <Upload className="h-2.5 w-2.5" />
                              <span>{tr('Photo', 'فوٹو')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => bulkSlabsInputRef.current?.click()}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Camera className="h-2.5 w-2.5" />
                              <span>{tr('Bulk', 'بلک')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openFrameCalibrator(1)}
                              className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Crop className="h-2.5 w-2.5" />
                              <span>{tr('Frame', 'فریم')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Material Name & Rate */}
                      <div className="grid grid-cols-12 gap-1.5">
                        <div className="col-span-8 space-y-0.5">
                          <Label className="text-[10px] text-slate-400">
                            {tr('Material / Stone Name', 'پتھر / مٹیریل کا نام')}
                          </Label>
                          <Input
                            value={slabConfig.materialName}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({ ...prev, materialName: e.target.value }))
                            }
                            className="h-7 text-xs bg-slate-900 border-slate-700 text-white px-2"
                          />
                        </div>
                        <div className="col-span-4 space-y-0.5">
                          <Label className="text-[10px] text-emerald-300 font-bold">
                            {tr('Rate / ft²', 'ریٹ / فٹ')}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={slabConfig.ratePerSqFt}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                ratePerSqFt: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="h-7 text-xs font-mono font-bold bg-slate-900 border-emerald-500/50 text-white px-2"
                          />
                        </div>
                      </div>

                      {/* Slab 1. Width x 2. Length x Qty + Rotate */}
                      <div className="grid grid-cols-12 gap-1.5 items-end">
                        <div className="col-span-4 space-y-0.5">
                          <Label className="text-[10px] font-bold text-amber-300">
                            {tr(`1. Width (${unit})`, `1. چوڑائی`)}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            value={slabConfig.width}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                width: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                            className="h-7 text-xs font-mono font-bold bg-slate-900 border-amber-500/60 text-white px-2"
                          />
                        </div>
                        <div className="col-span-4 space-y-0.5">
                          <Label className="text-[10px] font-bold text-sky-300">
                            {tr(`2. Length (${unit})`, `2. لمبائی`)}
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            value={slabConfig.length}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                length: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                            className="h-7 text-xs font-mono font-bold bg-slate-900 border-sky-500/60 text-white px-2"
                          />
                        </div>
                        <div className="col-span-2 space-y-0.5">
                          <Label className="text-[10px] text-slate-300">
                            {tr('Qty', 'تعداد')}
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={slabConfig.quantity}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                              }))
                            }
                            className="h-7 text-xs font-mono font-bold bg-slate-900 border-slate-700 text-white px-1.5"
                          />
                        </div>
                        <div className="col-span-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                width: prev.length,
                                length: prev.width,
                              }))
                            }
                            className="w-full h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 flex items-center justify-center"
                            title={tr('Swap Width & Length (Rotate 90°)', 'چوڑائی اور لمبائی تبدیل کریں')}
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Slab Size Chips */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-0.5">
                          {tr('Presets:', 'سائز:')}
                        </span>
                        {[
                          { w: 60, l: 110 },
                          { w: 58, l: 106 },
                          { w: 48, l: 96 },
                          { w: 28, l: 56 },
                        ].map((sp) => {
                          const activeSp = slabConfig.width === sp.w && slabConfig.length === sp.l;
                          return (
                            <button
                              key={`${sp.w}x${sp.l}`}
                              type="button"
                              onClick={() =>
                                setSlabConfig((prev) => ({ ...prev, width: sp.w, length: sp.l }))
                              }
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${
                                activeSp
                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {sp.w}×{sp.l}
                            </button>
                          );
                        })}
                      </div>

                      {/* Kerf & Edge Trim */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-rose-300">
                            {tr('🪚 Blade Kerf', '🪚 بلیڈ کرف')}
                          </Label>
                          <select
                            value={String(slabConfig.kerf)}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                kerf: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="w-full h-7 rounded bg-slate-900 border border-rose-500/50 text-white font-mono text-[10px] font-bold px-1.5 cursor-pointer"
                          >
                            <option value="0">{tr('0" (None)', '0" (بغیر گیپ)')}</option>
                            <option value="0.125">{tr('0.125" (3mm)', '0.125" (1 سوتر)')}</option>
                            <option value="0.15">{tr('0.15" (Std)', '0.15" (اسٹینڈرڈ)')}</option>
                            <option value="0.1875">{tr('0.1875" (4.5mm)', '0.1875" (ڈیڑھ سوتر)')}</option>
                            <option value="0.25">{tr('0.25" (6mm)', '0.25" (2 سوتر)')}</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-bold text-sky-300">
                            {tr('📏 Edge Trim (Safai)', '📏 ایج ٹرم (صفائی)')}
                          </Label>
                          <select
                            value={String(slabConfig.edgeTrim)}
                            onChange={(e) =>
                              setSlabConfig((prev) => ({
                                ...prev,
                                edgeTrim: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="w-full h-7 rounded bg-slate-900 border border-sky-500/50 text-white font-mono text-[10px] font-bold px-1.5 cursor-pointer"
                          >
                            <option value="0">{tr('0" (Full)', '0" (پوری سلیب)')}</option>
                            <option value="0.5">{tr('0.5" (1/2 in)', '0.5" (آدھی انچی)')}</option>
                            <option value="0.75">{tr('0.75" (3/4 in)', '0.75" (پونے انچی)')}</option>
                            <option value="1">{tr('1.0" (1 in)', '1.0" (ایک انچی)')}</option>
                            <option value="1.5">{tr('1.5" (1.5 in)', '1.5" (ڈیڑھ انچی)')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="px-2 py-1 rounded bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                        <span>
                          {tr('Net Cuttable:', 'صافی سلیب:')}
                        </span>
                        <span className="font-bold">
                          {Math.max(1, slabConfig.width - slabConfig.edgeTrim * 2)}&quot; ×{' '}
                          {Math.max(1, slabConfig.length - slabConfig.edgeTrim * 2)}&quot;
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                {/* -------------------------------------------------------------
                    SECTION 2: CUT PIECES (کٹ پیسز)
                   ------------------------------------------------------------- */}
                <section className="rounded-lg border border-emerald-500/50 bg-slate-950/90 overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-extrabold shrink-0">
                        2
                      </span>
                      <span className="text-xs font-extrabold text-emerald-300 truncate">
                        {tr(`CUT PIECES (${parts.length})`, `کٹ پیسز (${parts.length})`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowStep2QuickPresets((v) => !v)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[10px] font-bold"
                      >
                        {showStep2QuickPresets ? tr('Templates ▴', 'ٹیمپلیٹس ▴') : tr('Templates ▾', 'ٹیمپلیٹس ▾')}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPart}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{tr('New Row', 'نیا پیس')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-2.5">
                    {/* Category Presets */}
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'flooring', icon: '🏠', en: 'Flooring', ur: 'فلورنگ' },
                          { id: 'bookmatch_wall', icon: '🦋', en: 'Bookmatch', ur: 'بک میچ' },
                          { id: 'stairs', icon: '🪜', en: 'Stairs', ur: 'سیڑھی' },
                          { id: 'kitchen', icon: '🍳', en: 'Kitchen', ur: 'کچن' },
                          { id: 'vanity', icon: '🚰', en: 'Vanity', ur: 'وینٹی' },
                          { id: 'window_sill', icon: '🪟', en: 'Sill', ur: 'ونڈو سل' },
                        ] as const
                      ).map((cat) => {
                        const isSelected =
                          activeCategoryPreset === cat.id && activeResultTab === 'dual_diagrams';
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => applyPreset(cat.id)}
                            className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-sm'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span className="truncate">{tr(cat.en, cat.ur)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Add Cut Size Box */}
                    <div className="rounded-md border border-emerald-500/40 bg-slate-900/90 p-2 space-y-1.5">
                      <div className="text-[10px] font-extrabold text-emerald-300">
                        {tr('+ Quick Add Cut Piece:', '+ نیا کٹ سائز شامل کریں:')}
                      </div>
                      <div className="grid grid-cols-12 gap-1 items-center">
                        <Input
                          type="text"
                          placeholder={tr('Piece Label', 'پیس کا نام')}
                          value={quickPartLabel}
                          onChange={(e) => setQuickPartLabel(e.target.value)}
                          className="col-span-12 h-7 px-2 text-xs bg-slate-950 border-slate-700 text-white"
                        />
                        <div className="col-span-4 space-y-0.5">
                          <span className="text-[9px] font-bold text-amber-300 block">
                            {tr(`1.W (${unit})`, `1.چوڑائی`)}
                          </span>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            value={quickPartWid}
                            onChange={(e) => setQuickPartWid(Number(e.target.value) || 1)}
                            className="h-7 px-1.5 text-xs bg-slate-950 border-amber-500/60 text-white font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-4 space-y-0.5">
                          <span className="text-[9px] font-bold text-sky-300 block">
                            {tr(`2.L (${unit})`, `2.لمبائی`)}
                          </span>
                          <Input
                            type="number"
                            step="any"
                            min="1"
                            value={quickPartLen}
                            onChange={(e) => setQuickPartLen(Number(e.target.value) || 1)}
                            className="h-7 px-1.5 text-xs bg-slate-950 border-sky-500/60 text-white font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-4 space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-300 block">
                            {tr('Qty', 'تعداد')}
                          </span>
                          <Input
                            type="number"
                            min="1"
                            value={quickPartQty}
                            onChange={(e) =>
                              setQuickPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="h-7 px-1.5 text-xs bg-slate-950 border-slate-700 text-white font-mono font-bold"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextId = `part-${Date.now()}`;
                          setParts((prev) => [
                            ...prev,
                            {
                              id: nextId,
                              label: quickPartLabel || `Piece #${prev.length + 1}`,
                              length: Math.max(1, quickPartLen),
                              width: Math.max(1, quickPartWid),
                              quantity: Math.max(1, quickPartQty),
                              allowRotation: true,
                              isBookmatchedPair: false,
                              installZone: 'floor',
                              priority: 'normal',
                              color: PART_PALETTE[prev.length % PART_PALETTE.length],
                            },
                          ]);
                        }}
                        className="w-full h-7 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{tr('+ Add Piece to Slab', '+ سلیب میں پیس شامل کریں')}</span>
                      </button>
                    </div>

                    {/* Collapsible Quick Templates Bar */}
                    {showStep2QuickPresets && (
                      <div className="rounded-md border border-amber-500/40 bg-slate-900/95 p-2 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-amber-300">
                            {tr('⚡ Quick Templates:', '⚡ فوری ٹیمپلیٹس:')}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setParts((prev) =>
                                  prev.map((p) => ({
                                    ...p,
                                    latakSides:
                                      !p.latakSides || p.latakSides === 'none'
                                        ? 'front_only'
                                        : p.latakSides,
                                    latakSize: p.latakSize || 3,
                                    latakCutMode: 'bookmatch_attached',
                                    allowRotation: false,
                                  }))
                                );
                              }}
                              className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-bold"
                            >
                              {tr('🔗 Bookmatch Latak', '🔗 بک میچ لٹک')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setParts((prev) =>
                                  prev.map((p) => ({
                                    ...p,
                                    latakCutMode: 'random_separate',
                                    allowRotation: true,
                                  }))
                                );
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold"
                            >
                              {tr('🎲 Random Cut', '🎲 رینڈم کٹ')}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setParts((prev) => [
                                ...prev,
                                {
                                  id: `step-latak-${Date.now()}`,
                                  label: tr('Stair Step 12"', 'سیڑھی ٹپہ 12 انچ'),
                                  width: 12,
                                  length: 42,
                                  quantity: 1,
                                  allowRotation: false,
                                  installZone: 'stairs',
                                  priority: 'high',
                                  color: '#0284C7',
                                  latakSides: 'front_only',
                                  latakFront: true,
                                  latakSize: 3,
                                  latakCutMode: 'bookmatch_attached',
                                },
                              ])
                            }
                            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold"
                          >
                            {tr('+ 12"×42" Step + 3" Latak', '+ 12" سٹیپ + 3" لٹک')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setParts((prev) => [
                                ...prev,
                                {
                                  id: `vanity-latak-${Date.now()}`,
                                  label: tr('Vanity Top 22"×36"', 'وینٹی ٹاپ 22×36'),
                                  width: 22,
                                  length: 36,
                                  quantity: 1,
                                  allowRotation: false,
                                  installZone: 'counter',
                                  priority: 'high',
                                  color: '#059669',
                                  latakSides: 'front_and_both_sides',
                                  latakFront: true,
                                  latakLeft: true,
                                  latakRight: true,
                                  latakSize: 3,
                                  latakCutMode: 'bookmatch_attached',
                                },
                              ])
                            }
                            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold"
                          >
                            {tr('+ Vanity + 3" Latak', '+ وینٹی + 3" لٹک')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setParts((prev) => [
                                ...prev,
                                {
                                  id: `round-table-${Date.now()}`,
                                  label: tr('Round Table Ø 48"', 'گول ٹیبل Ø 48 انچ'),
                                  width: 48,
                                  length: 48,
                                  quantity: 1,
                                  allowRotation: false,
                                  installZone: 'counter',
                                  priority: 'high',
                                  color: '#0EA5E9',
                                  shapeCutType: 'round_table',
                                  lazySusanDiameter: 20,
                                },
                              ])
                            }
                            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-300 text-[10px] font-semibold"
                          >
                            {tr('⭕ + 48" Round Table', '⭕ + 48" گول ٹیبل')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cut Pieces List */}
                    <div className="space-y-2">
                      {parts.map((part, idx) => {
                        const partSqFt = toSqFt(part.length * part.width * part.quantity, unit);
                        const curLatakSize = part.latakSize !== undefined ? part.latakSize : 3;
                        const curLatakMode: LatakCutModeOption =
                          part.latakCutMode || 'bookmatch_attached';
                        const curShape: ShapeCutTypeOption = part.shapeCutType || 'rect_90';
                        const curDegree = part.cutDegree !== undefined ? part.cutDegree : 45;
                        const curLazySusan = part.lazySusanDiameter || 0;
                        const isPartExpanded = expandedSidebarPartId === part.id;

                        const placedMatches: { slabIndex: number; piece: PlacedPiece }[] = [];
                        summary.slabs.forEach((sl) => {
                          sl.placedPieces.forEach((pp) => {
                            if (pp.partId === part.id) {
                              placedMatches.push({ slabIndex: sl.slabIndex, piece: pp });
                            }
                          });
                        });
                        const firstPlaced = placedMatches[0];
                        const isHighlightedOnDiagram =
                          hoveredPiece && hoveredPiece.partId === part.id;

                        const highlightPieceOnCenterDiagram = () => {
                          if (firstPlaced) {
                            setHoveredPiece(firstPlaced.piece);
                            if (!viewAllSlabs && activeSlabIndex !== firstPlaced.slabIndex - 1) {
                              setActiveSlabIndex(Math.max(0, firstPlaced.slabIndex - 1));
                            }
                          }
                        };

                        const resolvedLS = resolvePartLatakAndSplash(part);
                        const hasF = resolvedLS.hasFront;
                        const hasL = resolvedLS.hasLeft;
                        const hasR = resolvedLS.hasRight;
                        const hasB = resolvedLS.hasBack;
                        const hasAnyL = resolvedLS.hasAnyLatak;
                        const spH = part.splashSize !== undefined ? part.splashSize : 4;
                        const spB = resolvedLS.hasSplashBack;
                        const spL = resolvedLS.hasSplashLeft;
                        const spR = resolvedLS.hasSplashRight;
                        const hasAnySp = resolvedLS.hasAnySplash;

                        const updateLatakBool = (
                          field: 'latakFront' | 'latakLeft' | 'latakRight' | 'latakBack',
                          nextVal: boolean
                        ) => {
                          setParts((prev) =>
                            prev.map((x) => {
                              if (x.id !== part.id) return x;
                              const cur = resolvePartLatakAndSplash(x);
                              const nf = field === 'latakFront' ? nextVal : cur.hasFront;
                              const nl = field === 'latakLeft' ? nextVal : cur.hasLeft;
                              const nr = field === 'latakRight' ? nextVal : cur.hasRight;
                              const nb = field === 'latakBack' ? nextVal : cur.hasBack;
                              const anyOn = nf || nl || nr || nb;
                              return {
                                ...x,
                                latakFront: nf,
                                latakLeft: nl,
                                latakRight: nr,
                                latakBack: nb,
                                latakSize: anyOn ? x.latakSize || x.latakWidth || 3 : x.latakSize,
                                latakWidth: anyOn ? x.latakWidth || x.latakSize || 3 : x.latakWidth,
                                latakSides: anyOn ? 'front_only' : 'none',
                                latakCutMode: x.latakCutMode || 'bookmatch_attached',
                              };
                            })
                          );
                        };

                        const updateSplashBool = (
                          field: 'splashBack' | 'splashLeft' | 'splashRight',
                          nextVal: boolean
                        ) => {
                          setParts((prev) =>
                            prev.map((x) => {
                              if (x.id !== part.id) return x;
                              const nb = field === 'splashBack' ? nextVal : !!x.splashBack;
                              const nl = field === 'splashLeft' ? nextVal : !!x.splashLeft;
                              const nr = field === 'splashRight' ? nextVal : !!x.splashRight;
                              const anySp = nb || nl || nr;
                              return {
                                ...x,
                                splashBack: nb,
                                splashLeft: nl,
                                splashRight: nr,
                                splashSize: anySp ? x.splashSize || 4 : x.splashSize,
                              };
                            })
                          );
                        };

                        return (
                          <div
                            key={part.id}
                            onMouseEnter={highlightPieceOnCenterDiagram}
                            onFocusCapture={highlightPieceOnCenterDiagram}
                            onMouseLeave={() => setHoveredPiece(null)}
                            className={`rounded-md border p-2 space-y-1.5 transition-all ${
                              isHighlightedOnDiagram
                                ? 'border-amber-400 bg-slate-900 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                            }`}
                          >
                            {/* Top Row: Color, #Index, Label, S# Badge, Delete */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="color"
                                  value={part.color}
                                  onChange={(e) =>
                                    handleUpdatePart(part.id, 'color', e.target.value)
                                  }
                                  className="h-4 w-4 rounded cursor-pointer border border-slate-700 bg-slate-950 shrink-0"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                                  #{idx + 1}
                                </span>
                                <Input
                                  value={part.label}
                                  onChange={(e) =>
                                    handleUpdatePart(part.id, 'label', e.target.value)
                                  }
                                  className="h-6 text-[11px] font-medium bg-slate-950 text-white border-slate-700 px-1.5"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {firstPlaced && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveResultTab('dual_diagrams');
                                      setActiveSlabIndex(Math.max(0, firstPlaced.slabIndex - 1));
                                      setHoveredPiece(firstPlaced.piece);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-mono text-[9px] font-bold hover:bg-emerald-900"
                                    title={tr(
                                      'Click to locate on Slab Diagram',
                                      'ڈایاگرام پر اس پیس کی جگہ دیکھیں'
                                    )}
                                  >
                                    S#{firstPlaced.slabIndex}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(part.id)}
                                  className="p-0.5 text-slate-400 hover:text-red-400 rounded"
                                  title={tr('Delete Piece', 'پیس ختم کریں')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Compact Dimensions Grid: 1.Width, 2.Length, Qty, Target Slab */}
                            <div className="grid grid-cols-12 gap-1 items-end">
                              <div className="col-span-3 space-y-0.5">
                                <Label className="text-[9px] font-bold text-amber-300">
                                  {tr(`1.W (${unit})`, `1.چوڑائی`)}
                                </Label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.5"
                                  value={part.width}
                                  onChange={(e) =>
                                    handleUpdatePart(part.id, 'width', Number(e.target.value) || 0)
                                  }
                                  className="h-6 text-[11px] font-mono font-bold bg-slate-950 text-white border-amber-500/60 px-1.5"
                                />
                              </div>
                              <div className="col-span-3 space-y-0.5">
                                <Label className="text-[9px] font-bold text-sky-300">
                                  {tr(`2.L (${unit})`, `2.لمبائی`)}
                                </Label>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.5"
                                  value={part.length}
                                  onChange={(e) =>
                                    handleUpdatePart(part.id, 'length', Number(e.target.value) || 0)
                                  }
                                  className="h-6 text-[11px] font-mono font-bold bg-slate-950 text-white border-sky-500/60 px-1.5"
                                />
                              </div>
                              <div className="col-span-2 space-y-0.5">
                                <Label className="text-[9px] text-slate-400">
                                  {tr('Qty', 'تعداد')}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="500"
                                  value={part.quantity}
                                  onChange={(e) =>
                                    handleUpdatePart(
                                      part.id,
                                      'quantity',
                                      Math.max(1, parseInt(e.target.value, 10) || 1)
                                    )
                                  }
                                  className="h-6 text-[11px] font-mono bg-slate-950 text-white border-slate-700 px-1"
                                />
                              </div>
                              <div className="col-span-4 space-y-0.5">
                                <Label className="text-[9px] font-bold text-emerald-300">
                                  {tr('Slab #', 'سلیب نمبر')}
                                </Label>
                                <select
                                  value={String(part.targetSlabNumber || 0)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 0;
                                    setParts((prev) =>
                                      prev.map((x) =>
                                        x.id === part.id
                                          ? { ...x, targetSlabNumber: val > 0 ? val : undefined }
                                          : x
                                      )
                                    );
                                  }}
                                  className="w-full h-6 rounded bg-slate-950 border border-emerald-500/50 text-white font-mono text-[10px] px-1 cursor-pointer"
                                >
                                  <option value="0">{tr('Auto', 'آٹو')}</option>
                                  {Array.from({ length: Math.max(4, slabConfig.quantity) }).map(
                                    (_, sIdx) => {
                                      const sNum = sIdx + 1;
                                      return (
                                        <option key={sNum} value={String(sNum)}>
                                          {`S#${sNum}`}
                                        </option>
                                      );
                                    }
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Footer Strip + Expand Details Toggle */}
                            <div className="flex items-center justify-between gap-1 pt-0.5 text-[10px]">
                              <div className="font-mono text-slate-400 truncate">
                                <span className="text-amber-300 font-bold">
                                  {partSqFt.toFixed(1)} ft²
                                </span>
                                {hasAnyL ? ` · ${tr('Latak', 'لٹک')} ${curLatakSize}"` : ''}
                                {hasAnySp ? ` · ${tr('Splash', 'سلیش')} ${spH}"` : ''}
                                {curShape !== 'rect_90' ? ` · ${curShape}` : ''}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSidebarPartId((prev) =>
                                    prev === part.id ? null : part.id
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${
                                  isPartExpanded
                                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                                    : 'bg-slate-950 border-slate-700 text-amber-300 hover:border-amber-500/60'
                                }`}
                              >
                                {isPartExpanded
                                  ? tr('Close ▴', 'بند کریں ▴')
                                  : tr('⚙ Latak / Splash / Shape ▾', '⚙ لٹک / سلیش / شکل ▾')}
                              </button>
                            </div>

                            {/* Expanded Per-Piece Drawer: Latak, Splash, Edge Profile, Round Table & Degree Cut */}
                            {isPartExpanded && (
                              <div className="pt-2 border-t border-slate-800 space-y-2">
                                {/* 1. LATAK */}
                                <div className="rounded bg-slate-950/90 border border-amber-500/40 p-2 space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span className="text-[10px] font-extrabold text-amber-300">
                                      {tr('1️⃣ Latak Edges:', '1️⃣ لٹک سائیڈیں:')}
                                    </span>
                                    <div className="inline-flex items-center rounded bg-slate-900 p-0.5 border border-slate-700">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setParts((prev) =>
                                            prev.map((x) =>
                                              x.id === part.id
                                                ? {
                                                    ...x,
                                                    latakCutMode: 'bookmatch_attached',
                                                    allowRotation: false,
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          curLatakMode === 'bookmatch_attached'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        🔗 {tr('Bookmatch', 'بک میچ')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setParts((prev) =>
                                            prev.map((x) =>
                                              x.id === part.id
                                                ? {
                                                    ...x,
                                                    latakCutMode: 'random_separate',
                                                    allowRotation: true,
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          curLatakMode === 'random_separate'
                                            ? 'bg-purple-600 text-white'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        🎲 {tr('Random', 'رینڈم')}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateLatakBool('latakFront', !hasF)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        hasF
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('1. Front', '1. فرنٹ')}</span>
                                      <span>{hasF ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateLatakBool('latakLeft', !hasL)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        hasL
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('2. Left', '2. لیفٹ')}</span>
                                      <span>{hasL ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateLatakBool('latakRight', !hasR)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        hasR
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('3. Right', '3. رائٹ')}</span>
                                      <span>{hasR ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateLatakBool('latakBack', !hasB)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        hasB
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('4. Back', '4. بیک')}</span>
                                      <span>{hasB ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setParts((prev) =>
                                          prev.map((x) =>
                                            x.id === part.id
                                              ? {
                                                  ...x,
                                                  latakFront: true,
                                                  latakLeft: true,
                                                  latakRight: true,
                                                  latakBack: true,
                                                  latakSides: 'all_4_sides',
                                                  latakSize: x.latakSize || 3,
                                                  latakWidth: x.latakWidth || 3,
                                                }
                                              : x
                                          )
                                        )
                                      }
                                      className="px-1.5 py-1 rounded border border-slate-700 bg-slate-900 text-emerald-300 text-[10px] font-bold"
                                    >
                                      {tr('All 4 Sides', 'چاروں سائیڈ')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setParts((prev) =>
                                          prev.map((x) =>
                                            x.id === part.id
                                              ? {
                                                  ...x,
                                                  latakFront: false,
                                                  latakLeft: false,
                                                  latakRight: false,
                                                  latakBack: false,
                                                  latakSides: 'none',
                                                }
                                              : x
                                          )
                                        )
                                      }
                                      className="px-1.5 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[10px] font-bold"
                                    >
                                      {tr('No Latak', 'بغیر لٹک')}
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 pt-1">
                                    <span className="text-[10px] font-bold text-emerald-300">
                                      {tr('Size:', 'سائز:')}
                                    </span>
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0.5"
                                      max="36"
                                      value={curLatakSize}
                                      onChange={(e) => {
                                        const nextSize = Math.max(0, Number(e.target.value));
                                        setParts((prev) =>
                                          prev.map((x) =>
                                            x.id === part.id
                                              ? {
                                                  ...x,
                                                  latakSize: nextSize,
                                                  latakWidth: nextSize,
                                                  latakFront:
                                                    nextSize > 0 && !resolvePartLatakAndSplash(x).hasAnyLatak
                                                      ? true
                                                      : x.latakFront ?? true,
                                                }
                                              : x
                                          )
                                        );
                                      }}
                                      className="h-6 w-12 text-[11px] font-mono font-bold bg-slate-900 text-white border-emerald-500/60 px-1"
                                    />
                                    {[1.5, 2, 3, 4].map((presetIn) => (
                                      <button
                                        key={presetIn}
                                        type="button"
                                        onClick={() =>
                                          setParts((prev) =>
                                            prev.map((x) =>
                                              x.id === part.id
                                                ? {
                                                    ...x,
                                                    latakSize: presetIn,
                                                    latakWidth: presetIn,
                                                    latakFront:
                                                      !resolvePartLatakAndSplash(x).hasAnyLatak
                                                        ? true
                                                        : x.latakFront ?? true,
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className={`h-6 px-1.5 rounded border text-[10px] font-mono font-bold ${
                                          Number(curLatakSize) === presetIn && hasAnyL
                                            ? 'bg-emerald-600 border-emerald-400 text-white'
                                            : 'bg-slate-900 border-slate-700 text-slate-300'
                                        }`}
                                      >
                                        {presetIn}&quot;
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* 2. SPLASH */}
                                <div className="rounded bg-slate-950/90 border border-sky-500/40 p-2 space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span className="text-[10px] font-extrabold text-sky-300">
                                      {tr('2️⃣ Splash (No Front):', '2️⃣ سلیش (بیک/سائیڈ):')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[4, 6, 8].map((sh) => (
                                        <button
                                          key={sh}
                                          type="button"
                                          onClick={() =>
                                            setParts((prev) =>
                                              prev.map((x) =>
                                                x.id === part.id
                                                  ? {
                                                      ...x,
                                                      splashSize: sh,
                                                      splashBack:
                                                        !x.splashBack && !x.splashLeft && !x.splashRight
                                                          ? true
                                                          : x.splashBack,
                                                    }
                                                  : x
                                              )
                                            )
                                          }
                                          className={`h-5 px-1.5 rounded border text-[9px] font-mono font-bold ${
                                            spH === sh && hasAnySp
                                              ? 'bg-sky-600 border-sky-400 text-white'
                                              : 'bg-slate-900 border-slate-700 text-slate-300'
                                          }`}
                                        >
                                          {sh}&quot;
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setParts((prev) =>
                                            prev.map((x) =>
                                              x.id === part.id
                                                ? {
                                                    ...x,
                                                    splashBack: false,
                                                    splashLeft: false,
                                                    splashRight: false,
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        className="h-5 px-1.5 rounded border border-slate-700 bg-slate-900 text-slate-400 text-[9px] font-bold"
                                      >
                                        {tr('Off', 'بند')}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateSplashBool('splashBack', !spB)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        spB
                                          ? 'bg-sky-500 border-sky-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('Back', 'بیک')}</span>
                                      <span>{spB ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateSplashBool('splashLeft', !spL)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        spL
                                          ? 'bg-sky-500 border-sky-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('Left', 'لیفٹ')}</span>
                                      <span>{spL ? '✓' : '○'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateSplashBool('splashRight', !spR)}
                                      className={`px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                                        spR
                                          ? 'bg-sky-500 border-sky-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <span>{tr('Right', 'رائٹ')}</span>
                                      <span>{spR ? '✓' : '○'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* 3. EDGE PROFILE & LIVE ROW BILL */}
                                <div className="rounded bg-slate-950/90 border border-purple-500/40 p-2 space-y-1.5">
                                  <div className="text-[10px] font-extrabold text-purple-300">
                                    {tr('3️⃣ Edge Profile & Bill:', '3️⃣ ایج پروفائل اور بل:')}
                                  </div>
                                  {(() => {
                                    const unitToIn = UNIT_TO_INCHES[unit] || 1;
                                    const cutRftOne = ((part.width + part.length) * 2 * unitToIn) / 12;
                                    const totalCutRft = cutRftOne * part.quantity;
                                    const cutBill = Math.round(totalCutRft * (Number(cuttingRatePerRft) || 0));
                                    const polBill = Math.round(partSqFt * (Number(polishRatePerSqFt) || 0));
                                    const edgeInOne =
                                      hasF || hasL || hasR || hasB || spB || spL || spR
                                        ? ((hasF ? part.length : 0) +
                                            (hasL ? part.width : 0) +
                                            (hasR ? part.width : 0) +
                                            (hasB ? part.length : 0) +
                                            (spB ? part.length : 0) +
                                            (spL ? part.width : 0) +
                                            (spR ? part.width : 0)) *
                                          unitToIn
                                        : (part.length + part.width * 2) * unitToIn;
                                    const totalEdgeRft = (edgeInOne * part.quantity) / 12;
                                    const edgeBill = Math.round(
                                      totalEdgeRft * (Number(edgeProfileRatePerRft) || 0)
                                    );
                                    const stoneBill = Math.round(
                                      partSqFt * (Number(slabConfig.ratePerSqFt) || 0)
                                    );
                                    return (
                                      <div className="text-[9px] font-mono text-emerald-300 bg-slate-900 rounded px-1.5 py-1 border border-slate-800">
                                        {tr(
                                          `Cut: ${cutBill.toLocaleString()} | Pol: ${polBill.toLocaleString()} | Edge: ${edgeBill.toLocaleString()} | Total: PKR ${(stoneBill + cutBill + polBill + edgeBill).toLocaleString()}`,
                                          `کٹنگ: ${cutBill.toLocaleString()} | پالش: ${polBill.toLocaleString()} | ایج: ${edgeBill.toLocaleString()} | کل: PKR ${(stoneBill + cutBill + polBill + edgeBill).toLocaleString()}`
                                        )}
                                      </div>
                                    );
                                  })()}
                                  <div className="grid grid-cols-2 gap-1">
                                    {(
                                      [
                                        { id: 'flat_polish' as EdgeProfileType, en: '▭ Flat Polish', ur: '▭ سادہ پالش' },
                                        { id: 'half_bullnose' as EdgeProfileType, en: '◗ Half Bullnose', ur: '◗ ہاف گولا' },
                                        { id: 'full_bullnose' as EdgeProfileType, en: '● Full Bullnose', ur: '● فل گولا' },
                                        { id: 'miter_45' as EdgeProfileType, en: '📐 45° Miter', ur: '📐 45° مائٹر' },
                                        { id: 'ogee' as EdgeProfileType, en: '〰 Double Ogee', ur: '〰 ڈبل اوجی' },
                                        { id: 'bevel' as EdgeProfileType, en: '◿ Bevel', ur: '◿ بیول دھار' },
                                      ] as const
                                    ).map((ep) => {
                                      const activeEp = (part.edgeProfile || 'flat_polish') === ep.id;
                                      return (
                                        <button
                                          key={ep.id}
                                          type="button"
                                          onClick={() =>
                                            handleUpdatePart(part.id, 'edgeProfile', ep.id)
                                          }
                                          className={`px-1.5 py-1 rounded border text-[9px] font-bold ${
                                            activeEp
                                              ? 'bg-purple-600 border-purple-300 text-white'
                                              : 'bg-slate-900 border-slate-700 text-slate-300'
                                          }`}
                                        >
                                          {tr(ep.en, ep.ur)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 4. ROUND TABLE & DEGREE CUT */}
                                <div className="rounded bg-slate-950/90 border border-sky-500/40 p-2 space-y-1.5">
                                  <div className="text-[10px] font-extrabold text-sky-300">
                                    {tr('4️⃣ Round Table / Degree Shape:', '4️⃣ گول ٹیبل / ڈگری کٹ:')}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {(
                                      [
                                        { id: 'rect_90' as ShapeCutTypeOption, en: '▭ 90° Straight', ur: '▭ 90° سیدھا' },
                                        { id: 'round_table' as ShapeCutTypeOption, en: '⭕ Round Table', ur: '⭕ گول ٹیبل' },
                                        { id: 'oval_table' as ShapeCutTypeOption, en: '🥚 Oval Table', ur: '🥚 اوول ٹیبل' },
                                        { id: 'half_round' as ShapeCutTypeOption, en: '🌓 Half-Round', ur: '🌓 آدھا گول' },
                                        { id: 'round_pie_4' as ShapeCutTypeOption, en: '🍕 90° Sector', ur: '🍕 90° سیکٹر' },
                                        { id: 'octagon_45' as ShapeCutTypeOption, en: '🛑 Octagon', ur: '🛑 آٹھ کونے' },
                                        { id: 'degree_1_side' as ShapeCutTypeOption, en: '📐 1-Side °', ur: '📐 1-سائیڈ ڈگری' },
                                        { id: 'degree_2_sides' as ShapeCutTypeOption, en: '📐 2-Side °', ur: '📐 2-سائیڈ ڈگری' },
                                        { id: 'triangle_winder' as ShapeCutTypeOption, en: '🔺 Triangle', ur: '🔺 تکون کٹ' },
                                        { id: 'diamond_rhombus' as ShapeCutTypeOption, en: '💠 Diamond', ur: '💠 ڈائمنڈ کٹ' },
                                      ] as const
                                    ).map((sh) => {
                                      const active = curShape === sh.id;
                                      return (
                                        <button
                                          key={sh.id}
                                          type="button"
                                          onClick={() => {
                                            setParts((prev) =>
                                              prev.map((x) => {
                                                if (x.id !== part.id) return x;
                                                const nextDiam =
                                                  sh.id === 'round_table'
                                                    ? Math.max(x.width, x.length)
                                                    : x.width;
                                                return {
                                                  ...x,
                                                  shapeCutType: sh.id,
                                                  width: sh.id === 'round_table' ? nextDiam : x.width,
                                                  length: sh.id === 'round_table' ? nextDiam : x.length,
                                                  cutDegree:
                                                    x.cutDegree !== undefined
                                                      ? x.cutDegree
                                                      : sh.id === 'round_pie_4'
                                                      ? 90
                                                      : 45,
                                                };
                                              })
                                            );
                                          }}
                                          className={`px-1.5 py-1 rounded border text-[9px] font-bold ${
                                            active
                                              ? sh.id === 'rect_90'
                                                ? 'border-slate-500 bg-slate-800 text-white'
                                                : 'border-sky-400 bg-sky-600 text-white'
                                              : 'border-slate-800 bg-slate-900 text-slate-300'
                                          }`}
                                        >
                                          {tr(sh.en, sh.ur)}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {(curShape === 'round_table' ||
                                    curShape === 'oval_table' ||
                                    curShape === 'half_round') && (
                                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[9px] font-bold text-sky-300">
                                          {tr('Diameter Ø:', 'قطر Ø:')}
                                        </span>
                                        {curShape === 'round_table' && (
                                          <Input
                                            type="number"
                                            min="6"
                                            max="120"
                                            value={part.width}
                                            onChange={(e) => {
                                              const d = Math.max(0, Number(e.target.value));
                                              setParts((prev) =>
                                                prev.map((x) =>
                                                  x.id === part.id ? { ...x, width: d, length: d } : x
                                                )
                                              );
                                            }}
                                            className="h-6 w-12 text-[10px] font-mono bg-slate-900 text-white border-sky-500/60 px-1"
                                          />
                                        )}
                                        {[36, 42, 48, 54, 60].map((dPreset) => (
                                          <button
                                            key={dPreset}
                                            type="button"
                                            onClick={() =>
                                              setParts((prev) =>
                                                prev.map((x) =>
                                                  x.id === part.id
                                                    ? {
                                                        ...x,
                                                        width: dPreset,
                                                        length:
                                                          curShape === 'round_table'
                                                            ? dPreset
                                                            : Math.round(dPreset * 1.5),
                                                      }
                                                    : x
                                                )
                                              )
                                            }
                                            className={`h-6 px-1.5 rounded border text-[9px] font-mono font-bold ${
                                              part.width === dPreset
                                                ? 'bg-sky-600 border-sky-400 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-300'
                                            }`}
                                          >
                                            Ø{dPreset}&quot;
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[9px] font-bold text-amber-300">
                                          {tr('Lazy Susan:', 'سینٹر ٹرے:')}
                                        </span>
                                        {[0, 18, 22, 24].map((lsDiam) => (
                                          <button
                                            key={lsDiam}
                                            type="button"
                                            onClick={() =>
                                              setParts((prev) =>
                                                prev.map((x) =>
                                                  x.id === part.id
                                                    ? { ...x, lazySusanDiameter: lsDiam }
                                                    : x
                                                )
                                              )
                                            }
                                            className={`h-6 px-1.5 rounded border text-[9px] font-mono font-bold ${
                                              curLazySusan === lsDiam
                                                ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                : 'bg-slate-900 border-slate-700 text-slate-300'
                                            }`}
                                          >
                                            {lsDiam === 0 ? tr('None', 'نہیں') : `Ø${lsDiam}"`}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {(curShape === 'degree_1_side' ||
                                    curShape === 'degree_2_sides' ||
                                    curShape === 'triangle_winder' ||
                                    curShape === 'diamond_rhombus' ||
                                    curShape === 'octagon_45' ||
                                    curShape === 'round_pie_4') && (
                                    <div className="space-y-1 pt-1 border-t border-slate-800">
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[9px] font-bold text-rose-300">
                                          {tr('Angle °:', 'ڈگری زاویہ:')}
                                        </span>
                                        <Input
                                          type="number"
                                          step="any"
                                          min="1"
                                          max="89"
                                          value={curDegree}
                                          onChange={(e) => {
                                            const degVal = Math.max(
                                              1,
                                              Math.min(89, Number(e.target.value) || 45)
                                            );
                                            setParts((prev) =>
                                              prev.map((x) =>
                                                x.id === part.id ? { ...x, cutDegree: degVal } : x
                                              )
                                            );
                                          }}
                                          className="h-6 w-12 text-[10px] font-mono bg-slate-900 text-white border-rose-500/60 px-1"
                                        />
                                        {[15, 30, 45, 60].map((degPreset) => (
                                          <button
                                            key={degPreset}
                                            type="button"
                                            onClick={() =>
                                              setParts((prev) =>
                                                prev.map((x) =>
                                                  x.id === part.id
                                                    ? { ...x, cutDegree: degPreset }
                                                    : x
                                                )
                                              )
                                            }
                                            className={`h-6 px-1.5 rounded border text-[9px] font-mono font-bold ${
                                              Number(curDegree) === degPreset
                                                ? 'bg-rose-600 border-rose-400 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-300'
                                            }`}
                                          >
                                            {degPreset}°
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          )}

        {/* DRAGGABLE DESKTOP SPLITTER BETWEEN SIDEBAR & DIAGRAM */}
        {simpleMainScreen === 'slab_cutter' &&
          !isLeftDockCollapsed &&
          fullscreenTarget !== 'slab_diagram' &&
          fullscreenTarget !== 'floor_diagram' && (
            <div
              onMouseDown={() => setIsDraggingSidebarSplitter(true)}
              title={tr('Drag to resize sidebar width', 'سائیڈ بار کا سائز کم یا زیادہ کرنے کے لیے کھینچیں')}
              className="hidden lg:flex w-1.5 self-stretch min-h-[420px] rounded-full bg-slate-800 hover:bg-amber-500 cursor-col-resize items-center justify-center transition-colors shrink-0 print:hidden"
            >
              <div className="w-0.5 h-12 rounded-full bg-slate-500" />
            </div>
          )}

        {/* MAIN FULL-WIDTH CUTTING OPTIMIZER SCREEN (مین کٹنگ آپٹیمائزر کی بڑی سکرین) */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Slim Sidebar Toggle & Cut Piece Quick Chips Bar */}
          {simpleMainScreen === 'slab_cutter' &&
            fullscreenTarget !== 'slab_diagram' &&
            fullscreenTarget !== 'floor_diagram' && (
              <div
                dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
                className="rounded-lg border border-slate-800 bg-slate-900/95 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 print:hidden"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsLeftDockCollapsed((v) => !v)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      isLeftDockCollapsed
                        ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                        : 'bg-slate-950 border-slate-700 text-amber-300 hover:border-amber-500/60'
                    }`}
                  >
                    {isLeftDockCollapsed ? (
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    ) : (
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isLeftDockCollapsed
                        ? tr('Show Stock & Cut Tools', 'اسٹاک اور کٹ پیس ٹول دکھائیں')
                        : tr('Hide Side Tools', 'سائیڈ ٹول چھپائیں')}
                    </span>
                  </button>

                  {parts.map((pt, pIdx) => {
                    const firstMatch = summary.slabs
                      .flatMap((sl) =>
                        sl.placedPieces
                          .filter((pp) => pp.partId === pt.id)
                          .map((pp) => ({ slabIndex: sl.slabIndex, piece: pp }))
                      )[0];
                    const isHover = hoveredPiece && hoveredPiece.partId === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onMouseEnter={() => {
                          if (firstMatch) {
                            setHoveredPiece(firstMatch.piece);
                            if (!viewAllSlabs && activeSlabIndex !== firstMatch.slabIndex - 1) {
                              setActiveSlabIndex(Math.max(0, firstMatch.slabIndex - 1));
                            }
                          }
                        }}
                        onMouseLeave={() => setHoveredPiece(null)}
                        onClick={() => {
                          setIsLeftDockCollapsed(false);
                          setExpandedSidebarPartId(pt.id);
                          if (firstMatch) {
                            setActiveSlabIndex(Math.max(0, firstMatch.slabIndex - 1));
                            setHoveredPiece(firstMatch.piece);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-mono flex items-center gap-1 transition-all ${
                          isHover
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-emerald-500/60'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: pt.color }}
                        />
                        <span className="font-bold text-amber-300">#{pIdx + 1}</span>
                        <span className="font-bold text-white">
                          {pt.width}×{pt.length}
                        </span>
                        <span className="text-sky-300">({pt.quantity})</span>
                        {firstMatch && (
                          <span className="px-1 rounded bg-emerald-950 text-emerald-300 text-[9px] font-bold">
                            S#{firstMatch.slabIndex}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Top KPI Summary Strip (Movable, Dockable, Resizable) */}
          {fullscreenTarget !== 'slab_diagram' && fullscreenTarget !== 'floor_diagram' && (
            <AutoCadMovableBar
              barId="kpi_bar"
              workspace={cadWorkspace}
              onUpdateBar={handleUpdateCadBar}
              cadLang={cadLang}
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-white">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {tr('Net Material Yield', 'استعمال شدہ پتھر کی شرح')}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">
                      {summary.overallYieldPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-300">
                      {summary.totalUsedAreaSqFt.toFixed(1)} sq.ft
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-white">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {tr('Slabs Used / Stock', 'کل استعمال شدہ سلیبیں')}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-100">
                      {summary.totalSlabsUsed} / {slabConfig.quantity}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-sky-400">
                      {summary.totalPiecesPlaced} {tr('Pieces', 'ٹکڑے')}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-amber-500/60 bg-amber-950/30 p-3 text-white">
                  <div className="text-[11px] text-amber-300 font-bold">
                    {tr('Total Saw Cutting (R.Ft / In)', 'کل کٹنگ رننگ فٹ اور انچ')}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono tabular-nums text-amber-300">
                      {cuttingStats.totalRunningFeet.toFixed(1)} R.Ft
                    </span>
                    <span className="text-xs font-mono tabular-nums text-amber-200">
                      {Math.round(cuttingStats.totalRunningInches)} in
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-emerald-300">
                    <span>{tr(`@ PKR ${cuttingRatePerRft}/R.Ft`, `ریٹ: ${cuttingRatePerRft}/فٹ`)}</span>
                    <span className="font-bold">
                      {tr('Cut Bill:', 'کٹنگ بل:')} PKR {cuttingStats.totalCuttingCostPKR.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-white">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {tr('Reusable Offcuts', 'قابلِ استعمال بچت ٹکڑے')}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-100">
                      {summary.totalUsableOffcutAreaSqFt.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {tr('sq.ft saved', 'مربع فٹ بچت')}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-white">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {tr('Stone + Cutting Total', 'پتھر + کٹنگ کل بل')}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-bold font-mono tabular-nums text-slate-100">
                      PKR {(summary.estimatedTotalSlabCostPKR + cuttingStats.totalCuttingCostPKR).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {tr(`Stone: PKR ${summary.estimatedTotalSlabCostPKR.toLocaleString()}`, `پتھر: ${summary.estimatedTotalSlabCostPKR.toLocaleString()}`)}
                  </div>
                </div>
              </div>
            </AutoCadMovableBar>
          )}

          {/* Main Workspace Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 text-white overflow-hidden">
            {/* CONTEXTUAL VIEW SWITCHER (کوئی ڈبل بٹن نہیں — صرف منتخب موڈ کے ضروری بٹن) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-slate-800 bg-slate-950 print:hidden">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {simpleMainScreen === 'slab_cutter' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('dual_diagrams')}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        activeResultTab === 'dual_diagrams'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>
                        {tr('✂️ Slab Cutting Diagram', '✂️ سلیب کٹنگ کا بڑا ڈایاگرام')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveResultTab('schedule')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                        activeResultTab === 'schedule'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tr(
                        `📋 Cut Schedule List (${summary.slabs.reduce((s, sl) => s + sl.cuts.length, 0)})`,
                        `📋 کٹنگ شیڈول لسٹ (${summary.slabs.reduce((s, sl) => s + sl.cuts.length, 0)})`
                      )}
                    </button>
                  </>
                )}

                {simpleMainScreen === 'stock_slabs' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('stock_inventory')}
                      className={`px-3.5 py-1.5 text-xs font-extrabold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        activeResultTab === 'stock_inventory'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>
                        {tr(
                          `📦 Stock Slabs & Photo Upload (${savedStockList.length})`,
                          `📦 اسٹاک سلیب سائز اور تصویر اپ لوڈ (${savedStockList.length})`
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveResultTab('slab_manager')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                        activeResultTab === 'slab_manager'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>
                        {tr(
                          `🔍 Inspect Individual Slabs & Cracks (${slabConfig.quantity})`,
                          `🔍 ہر سلیب الگ چیک / کریک نکالیں (${slabConfig.quantity})`
                        )}
                      </span>
                    </button>
                  </>
                )}

                {simpleMainScreen === 'excel_bill' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveResultTab('bom')}
                      className="px-3.5 py-1.5 text-xs font-extrabold rounded-md bg-violet-600 text-white shadow-xs flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>
                        {tr('📊 Detailed Bill, Rates & Edge Polish', '📊 تفصیلی بل، کٹنگ، پالش اور ایج ریٹ')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateExcelBill(true)}
                      className="px-4 py-1.5 text-xs font-black rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xs flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>
                        {tr('📥 Download Excel Bill (.xls)', '📥 ایکسل بل ڈاؤن لوڈ کریں (.xls)')}
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Zoom, Texture Opacity & Fullscreen Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{tr('Stone Tint:', 'پتھر ٹیکسچر:')}</span>
                  <input
                    type="range"
                    min="0.15"
                    max="0.9"
                    step="0.05"
                    value={pieceOverlayOpacity}
                    onChange={(e) => setPieceOverlayOpacity(Number(e.target.value))}
                    className="w-16 accent-sky-500 cursor-pointer"
                    title="Adjust cut label tint to inspect marble veins underneath"
                  />
                </div>

                <div className="flex items-center border border-slate-700 rounded-md overflow-hidden bg-slate-900 text-white">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-slate-800 text-slate-200"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2 text-[11px] font-mono tabular-nums font-semibold text-sky-400"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                    className="p-1.5 hover:bg-slate-800 text-slate-200"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSetFullscreenMode(isFullscreen ? 'none' : 'workstation')
                  }
                  className={cadBtnSubtle}
                  title="Toggle Fullscreen View"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>{tr('Normal', 'نارمل')}</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                      <span>{tr('Fullscreen', 'فل سکرین')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Selected Piece Traceability + Inline AutoCAD Dimension Editor + Vein Nudge Bar */}
            {activeHighlightedPiece && (
              <div className="bg-slate-900 border-b border-sky-500/40 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-mono font-bold">
                    [{activeHighlightedPiece.pieceCode}]
                  </span>
                  <span className="font-bold text-white">
                    {activeHighlightedPiece.label}
                  </span>
                  <span className="text-slate-300 font-mono">
                    Slab #{activeHighlightedPiece.slabIndex} @ (X:{' '}
                    {formatNum(activeHighlightedPiece.x)}&quot;, Y:{' '}
                    {formatNum(activeHighlightedPiece.y)}&quot;)
                  </span>
                  <span className="text-sky-400 font-mono font-semibold">
                    ➔ Floor: {activeHighlightedPiece.floorCoordLabel}
                  </span>

                  {/* Inline On-Screen Piece Size & Rotation Editor */}
                  {(() => {
                    const sourcePart = parts.find((pt) => pt.id === activeHighlightedPiece.partId);
                    if (!sourcePart) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 ml-1 pl-2 border-l border-slate-700">
                        <span className="text-[10px] text-amber-300 font-bold">
                          {tr(`1.W × 2.L (${unit}):`, `1.چوڑائی × 2.لمبائی (${unit}):`)}
                        </span>
                        <Input
                          type="number"
                          value={Number(sourcePart.width.toFixed(1))}
                          onChange={(e) =>
                            handleUpdatePart(
                              sourcePart.id,
                              'width',
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          className="w-16 h-6 px-1.5 py-0 rounded bg-slate-950 border border-amber-500/50 text-white font-mono text-[11px]"
                          title="1. Edit Piece Width First (چوڑائی پہلے)"
                        />
                        <span className="text-slate-500">×</span>
                        <Input
                          type="number"
                          value={Number(sourcePart.length.toFixed(1))}
                          onChange={(e) =>
                            handleUpdatePart(
                              sourcePart.id,
                              'length',
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          className="w-16 h-6 px-1.5 py-0 rounded bg-slate-950 border border-sky-500/50 text-white font-mono text-[11px]"
                          title="2. Edit Piece Length Second (لمبائی بعد میں)"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">Qty:</span>
                        <Input
                          type="number"
                          min="1"
                          value={sourcePart.quantity}
                          onChange={(e) =>
                            handleUpdatePart(
                              sourcePart.id,
                              'quantity',
                              Math.max(1, parseInt(e.target.value, 10) || 1)
                            )
                          }
                          className="w-14 h-6 px-1.5 py-0 rounded bg-slate-950 border border-slate-700 text-white font-mono text-[11px]"
                          title="Edit Piece Quantity"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const oldLen = sourcePart.length;
                            const oldWid = sourcePart.width;
                            handleUpdatePart(sourcePart.id, 'length', oldWid);
                            handleUpdatePart(sourcePart.id, 'width', oldLen);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-300 font-mono text-[10px]"
                          title="Swap Length & Width (90° Rotate Piece)"
                        >
                          ↻ 90° Swap
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdatePart(
                              sourcePart.id,
                              'isBookmatchedPair',
                              !sourcePart.isBookmatchedPair
                            )
                          }
                          className={`px-2 py-0.5 rounded border font-mono text-[10px] ${
                            sourcePart.isBookmatchedPair
                              ? 'bg-sky-600 border-sky-400 text-white'
                              : 'bg-slate-950 border-slate-700 text-slate-300'
                          }`}
                        >
                          BM Pair
                        </button>

                        {/* Direct Slab Switcher for the Clicked Piece on the Canvas */}
                        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-700">
                          <span className="text-[10px] font-bold text-emerald-300">
                            {tr('Move to Slab:', 'دوسری سلیب پر لے جائیں:')}
                          </span>
                          <select
                            value={String(sourcePart.targetSlabNumber || 0)}
                            onChange={(e) => {
                              const nextSlab = parseInt(e.target.value, 10) || 0;
                              setParts((prev) =>
                                prev.map((x) =>
                                  x.id === sourcePart.id
                                    ? { ...x, targetSlabNumber: nextSlab > 0 ? nextSlab : undefined }
                                    : x
                                )
                              );
                            }}
                            className="h-6 rounded bg-slate-950 border border-emerald-500/60 text-white font-mono text-[11px] px-1.5 cursor-pointer"
                          >
                            <option value="0">{tr('Auto Slab', 'آٹو سلیب')}</option>
                            {Array.from({ length: Math.max(4, slabConfig.quantity) }).map(
                              (_, sIdx) => (
                                <option key={sIdx + 1} value={String(sIdx + 1)}>
                                  {`Slab #${sIdx + 1}`}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Manual Vein Fine-Tuning Nudge Controls */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-sky-300 font-medium flex items-center gap-1">
                    <Move className="h-3 w-3 text-sky-400" /> Drag on Slab or Nudge:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, -1, 0)}
                    className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
                  >
                    ◀ -1&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 1, 0)}
                    className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
                  >
                    +1&quot; ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 0, -1)}
                    className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
                  >
                    ▲ -1&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 0, 1)}
                    className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
                  >
                    ▼ +1&quot;
                  </button>
                  {Object.keys(manualPieceOffsets).length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPieceOffsets}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 hover:text-white text-[10px]"
                    >
                      Reset Shifts
                    </button>
                  )}
                  {selectedPieceId && (
                    <button
                      type="button"
                      onClick={() => setSelectedPieceId(null)}
                      className="text-[11px] text-slate-400 hover:text-white underline ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 1: 2D SLAB CUTTING & FLOOR FIXING WORKSTATION
                Diagram #1: 2D Slab Orientation & Rectangular Piece Cutting Layout
                Diagram #2: Assembled 2D Floor / Wall Fixing Layout Diagram
               ===================================================================== */}
            {activeResultTab === 'dual_diagrams' && (
              <div id="cutting-optimizer-2d-canvas" className="p-3 sm:p-4 space-y-5 bg-slate-950">
                {/* AUTOCAD IN-DIAGRAM TOGGLE KEYS BAR (Horizontal ↔ / Vertical ↕ & Stretchable) */}
                <AutoCadMovableBar
                  barId="cad_tools_bar"
                  workspace={cadWorkspace}
                  onUpdateBar={handleUpdateCadBar}
                  cadLang={cadLang}
                >
                  <div className="rounded-lg border border-slate-800 bg-slate-900/95 p-2 flex flex-wrap items-center justify-between gap-1.5 print:hidden">
                    {/* Left: AutoCAD Toggle Keys for Slab Rotation, Cutting Direction & Tools */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 px-1.5 py-0.5 rounded bg-slate-950 border border-amber-500/40">
                        {tr('TOGGLE KEYS:', 'سلیب ٹوگل بٹن:')}
                      </span>

                      {/* 1. Rotate Stock Slab 90° (Swap Width ⇄ Length) */}
                      <button
                        type="button"
                        onClick={() =>
                          setSlabConfig((s) => ({
                            ...s,
                            width: s.length,
                            length: s.width,
                          }))
                        }
                        className="px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border bg-amber-950/70 border-amber-500/60 text-amber-200 hover:bg-amber-900/80 transition-colors"
                        title="Rotate Stock Slab 90° (Swap Slab Width & Length)"
                      >
                        <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                        <span>
                          {tr(
                            `Rotate Slab 90° (${slabConfig.width}×${slabConfig.length})`,
                            `سلیب گھمائیں 90° (${slabConfig.width}×${slabConfig.length})`
                          )}
                        </span>
                      </button>

                      {/* 2. Rotate Active Slab Marble Photo 90° */}
                      <button
                        type="button"
                        onClick={() => {
                          const targetNum = (summary.slabs[activeSlabIndex]?.slabIndex) || 1;
                          const cur = getSlabVisualConfig(targetNum);
                          const nextRot = ((cur.frameRotation || 0) + 90) % 360;
                          setSlabOverrides((prev) => ({
                            ...prev,
                            [targetNum]: {
                              ...(prev[targetNum] || {
                                slabNumber: targetNum,
                                frameScale: masterFrameScale,
                                frameOffsetX: masterFrameOffsetX,
                                frameOffsetY: masterFrameOffsetY,
                                mirrorMode: 'none',
                                defects: [],
                              }),
                              frameRotation: nextRot,
                            },
                          }));
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border bg-slate-950 border-slate-700 text-sky-300 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Rotate Marble Vein Texture 90° on Active Slab"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
                        <span>{tr('Rotate Veins 90°', 'ماربل رگیں گھمائیں 90°')}</span>
                      </button>

                      {/* 3. Toggle Cutting / Piece Direction 90° */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeHighlightedPiece) {
                            const src = parts.find((pt) => pt.id === activeHighlightedPiece.partId);
                            if (src) {
                              const oldL = src.length;
                              const oldW = src.width;
                              handleUpdatePart(src.id, 'length', oldW);
                              handleUpdatePart(src.id, 'width', oldL);
                              return;
                            }
                          }
                          setParts((prev) =>
                            prev.map((pt) => ({
                              ...pt,
                              width: pt.length,
                              length: pt.width,
                            }))
                          );
                        }}
                        className="px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border bg-slate-950 border-slate-700 text-emerald-300 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Swap Cutting Direction (Rotate Selected Piece or All Pieces 90°)"
                      >
                        <Scissors className="h-3.5 w-3.5 text-emerald-400" />
                        <span>
                          {activeHighlightedPiece
                            ? tr('Rotate Selected Piece 90°', 'سلیکٹڈ پیس گھمائیں 90°')
                            : tr('Swap Cut Direction 90°', 'کٹنگ رخ بدلیں 90°')}
                        </span>
                      </button>

                      {/* 4. Select & Move Tool */}
                      <button
                        type="button"
                        onClick={() => setCanvasToolMode('select_move')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors ${
                          canvasToolMode === 'select_move'
                            ? 'bg-sky-600 border-sky-400 text-white'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Move className="h-3.5 w-3.5" />
                        <span>{tr('Move Piece', 'پیس ہلائیں')}</span>
                      </button>

                      {/* 5. Quick Add Cut Piece */}
                      <button
                        type="button"
                        onClick={() =>
                          setCanvasToolMode(canvasToolMode === 'add_piece' ? 'select_move' : 'add_piece')
                        }
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors ${
                          canvasToolMode === 'add_piece'
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{tr('+ Add Piece', '+ نیا پیس')}</span>
                      </button>

                      {/* 6. Mark Crack */}
                      <button
                        type="button"
                        onClick={() =>
                          setCanvasToolMode(
                            canvasToolMode === 'mark_crack' ? 'select_move' : 'mark_crack'
                          )
                        }
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border transition-colors ${
                          canvasToolMode === 'mark_crack'
                            ? 'bg-rose-600 border-rose-400 text-white'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{tr('Mark Crack', 'کریک نشان')}</span>
                      </button>
                    </div>

                    {/* Right: AutoCAD Status Toggles (HD, SAW, DIM, OFFCUT) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPieceOverlayOpacity((v) => (v <= 0.12 ? 0.45 : 0.08))
                        }
                        className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors flex items-center gap-1 ${
                          pieceOverlayOpacity <= 0.12
                            ? 'border-emerald-500 bg-emerald-950/80 text-emerald-200'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        <span>{pieceOverlayOpacity <= 0.12 ? 'HD: ON' : 'HD: TINT'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowKerfLines((v) => !v)}
                        className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors ${
                          showKerfLines
                            ? 'border-sky-500 bg-sky-950/80 text-sky-200'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {`SAW: ${showKerfLines ? 'ON' : 'OFF'}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCadCrosshairs((v) => !v)}
                        className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors ${
                          showCadCrosshairs
                            ? 'border-amber-500 bg-amber-950/80 text-amber-200'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {`DIM: ${showCadCrosshairs ? 'ON' : 'OFF'}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowOffcutLabels((v) => !v)}
                        className={`px-2 py-1 text-xs font-mono font-bold rounded border transition-colors ${
                          showOffcutLabels
                            ? 'border-sky-500 bg-sky-950/80 text-sky-200'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {`OFFCUT: ${showOffcutLabels ? 'ON' : 'OFF'}`}
                      </button>
                    </div>
                  </div>
                </AutoCadMovableBar>

                {/* Inline Quick-Add Piece Bar when canvasToolMode === 'add_piece' */}
                {canvasToolMode === 'add_piece' && (
                  <div className="rounded-lg border border-emerald-500/50 bg-slate-900 p-3 flex flex-wrap items-end gap-2.5">
                    <div>
                      <Label className="text-[11px] text-slate-300">
                        {tr('Piece Label', 'ٹکڑے کا نام')}
                      </Label>
                      <Input
                        type="text"
                        value={quickPartLabel}
                        onChange={(e) => setQuickPartLabel(e.target.value)}
                        className="h-8 w-36 bg-slate-950 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-amber-300">
                        {tr(`1. Width First (${unit})`, `1. پہلے چوڑائی (${unit})`)}
                      </Label>
                      <Input
                        type="number"
                        value={quickPartWid}
                        onChange={(e) => setQuickPartWid(Number(e.target.value) || 1)}
                        className="h-8 w-28 bg-slate-950 border-amber-500/50 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-sky-300">
                        {tr(`2. Length Second (${unit})`, `2. بعد میں لمبائی (${unit})`)}
                      </Label>
                      <Input
                        type="number"
                        value={quickPartLen}
                        onChange={(e) => setQuickPartLen(Number(e.target.value) || 1)}
                        className="h-8 w-28 bg-slate-950 border-sky-500/50 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">
                        {tr('Qty', 'تعداد')}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={quickPartQty}
                        onChange={(e) => setQuickPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="h-8 w-20 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParts((prev) => [
                          ...prev,
                          {
                            id: `part-${Date.now()}`,
                            label: quickPartLabel || `Piece #${prev.length + 1}`,
                            length: Math.max(1, quickPartLen),
                            width: Math.max(1, quickPartWid),
                            quantity: Math.max(1, quickPartQty),
                            allowRotation: true,
                            isBookmatchedPair: false,
                            installZone: 'floor',
                            priority: 'normal',
                            color: PART_PALETTE[prev.length % PART_PALETTE.length],
                          },
                        ]);
                      }}
                      className={cadBtnPrimary}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{tr('Add to Cut List', 'سلیب میں شامل کریں')}</span>
                    </button>
                  </div>
                )}

                {/* WINDOWS-STYLE MULTI-SCREEN WORKSPACE CONTAINER (Resizable 50%/75%/100%, Minimizable, Reorderable) */}
                <div className="flex flex-wrap items-start gap-4">
                {/* DIAGRAM #1: 2D SLAB ORIENTATION & PIECE CUTTING LAYOUT + CATEGORY-SEPARATED HEADER */}
                {fullscreenTarget !== 'floor_diagram' && (
                  <div
                    style={{
                      order: cadWorkspace.screens?.diagram_1?.order ?? 2,
                      width:
                        (cadWorkspace.screens?.diagram_1?.widthPercent ?? 100) <= 50
                          ? 'calc(50% - 0.5rem)'
                          : (cadWorkspace.screens?.diagram_1?.widthPercent ?? 100) <= 75
                          ? '75%'
                          : '100%',
                    }}
                    className="min-w-0 w-full flex-grow rounded-xl border-2 border-slate-800 bg-slate-950/90 overflow-hidden shadow-xl"
                  >
                    <CadWindowHeaderBar
                      screenId="diagram_1"
                      workspace={cadWorkspace}
                      setWorkspace={setCadWorkspace}
                      cadLang={cadLang}
                    />
                    {!(cadWorkspace.screens?.diagram_1?.minimized) && (
                    <div className="p-3 space-y-3">
                      {/* Inside-Diagram #1 Button Bar Slot (When user places Category or CAD Tool buttons INSIDE Diagram #1!) */}
                      {(cadWorkspace.bars.preset_bar?.dock === 'inside_diagram_1' ||
                        cadWorkspace.bars.cad_tools_bar?.dock === 'inside_diagram_1') && (
                        <div className="rounded-lg border-2 border-amber-500/70 bg-slate-900/95 p-2 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-amber-300">
                            <span>
                              {tr(
                                '📐 Buttons Docked Inside Diagram #1 (Click "⬆ Top" to move outside):',
                                '📐 ڈایاگرام نمبر 1 کے اندر سیٹ کیے گئے بٹن (باہر نکالنے کے لیے "⬆ باہر اوپر" منتخب کریں):'
                              )}
                            </span>
                          </div>
                          {cadWorkspace.bars.preset_bar?.dock === 'inside_diagram_1' && (
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                {(
                                  [
                                    { id: 'flooring', label: tr('🏠 Flooring', '🏠 فرش فلورنگ') },
                                    { id: 'bookmatch_wall', label: tr('🦋 Bookmatch', '🦋 بک میچ') },
                                    { id: 'stairs', label: tr('🪜 Stairs', '🪜 سیڑھی ٹپے') },
                                    { id: 'kitchen', label: tr('🍳 Kitchen', '🍳 کچن سلیب') },
                                    { id: 'vanity', label: tr('🚰 Vanity', '🚰 وینٹی') },
                                    { id: 'window_sill', label: tr('🪟 Window Sill', '🪟 ونڈو سل') },
                                  ] as const
                                ).map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => applyPreset(cat.id)}
                                    className={`px-2.5 py-1 rounded text-xs font-bold border ${
                                      activeCategoryPreset === cat.id
                                        ? 'bg-amber-500 border-amber-300 text-slate-950'
                                        : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800'
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateCadBar('preset_bar', { dock: 'top' })}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono"
                              >
                                {tr('⬆ Move Outside Top', '⬆ باہر ٹاپ پر لے جائیں')}
                              </button>
                            </div>
                          )}
                          {cadWorkspace.bars.cad_tools_bar?.dock === 'inside_diagram_1' && (
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlabConfig((s) => ({
                                      ...s,
                                      width: s.length,
                                      length: s.width,
                                    }))
                                  }
                                  className="px-2 py-1 rounded text-[11px] font-bold border bg-amber-950/70 border-amber-500/60 text-amber-200"
                                >
                                  {tr('🔄 Rotate Slab 90°', '🔄 سلیب گھمائیں 90°')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCanvasToolMode('select_move')}
                                  className={`px-2 py-1 rounded text-[11px] font-bold border ${
                                    canvasToolMode === 'select_move'
                                      ? 'bg-sky-600 border-sky-400 text-white'
                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                  }`}
                                >
                                  {tr('✥ Move Piece', '✥ پیس ہلائیں')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCanvasToolMode(
                                      canvasToolMode === 'add_piece' ? 'select_move' : 'add_piece'
                                    )
                                  }
                                  className="px-2 py-1 rounded text-[11px] font-bold border bg-emerald-950 border-emerald-500/60 text-emerald-200"
                                >
                                  {tr('+ Add Piece', '+ نیا پیس')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCanvasToolMode(
                                      canvasToolMode === 'mark_crack' ? 'select_move' : 'mark_crack'
                                    )
                                  }
                                  className="px-2 py-1 rounded text-[11px] font-bold border bg-rose-950 border-rose-500/60 text-rose-200"
                                >
                                  {tr('⚠️ Mark Crack', '⚠️ کریک نشان')}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateCadBar('cad_tools_bar', { dock: 'top' })}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono"
                              >
                                {tr('⬆ Move Outside Top', '⬆ باہر ٹاپ پر لے جائیں')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-sky-400" />
                          <span>
                            {activeCategoryPreset === 'bookmatch_wall'
                              ? tr(
                                  'Diagram #1: 4-Slab Bookmatch Cutting Layout (چار سلیبوں کا بک میچ کٹنگ نقشہ)',
                                  'ڈایاگرام نمبر 1: چار سلیبوں (4 Slabs) کا بک میچ کٹنگ نقشہ'
                                )
                              : activeCategoryPreset === 'vanity'
                              ? tr(
                                  'Diagram #1: Vanity Top & Latak Slab Cutting Layout (وینٹی ٹاپ اور لٹک کی سلیب کٹنگ)',
                                  'ڈایاگرام نمبر 1: وینٹی ٹاپ، بیک سپلیش اور لٹک کی سلیب کٹنگ'
                                )
                              : activeCategoryPreset === 'kitchen'
                              ? tr(
                                  'Diagram #1: Kitchen Slab, Island & Backsplash Cutting (کچن سلیب اور کاؤنٹر کی کٹنگ)',
                                  'ڈایاگرام نمبر 1: کچن سلیب، آئی لینڈ اور بیک سپلیش کی کٹنگ'
                                )
                              : activeCategoryPreset === 'stairs'
                              ? tr(
                                  'Diagram #1: Stair Steps (Tappe), Risers & Latak Cutting (سیڑھی ٹپے اور رائزر کی سلیب کٹنگ)',
                                  'ڈایاگرام نمبر 1: سیڑھی ٹپے، رائزر اور لٹک کی سلیب کٹنگ'
                                )
                              : activeCategoryPreset === 'window_sill'
                              ? tr(
                                  'Diagram #1: Window Sill (Khirkee Sill) & Frame Cutting (ونڈو سل اور کھڑکی فریم کی سلیب کٹنگ)',
                                  'ڈایاگرام نمبر 1: ونڈو سل (کھڑکی سل) اور سائیڈ پٹی کی سلیب کٹنگ'
                                )
                              : tr(
                                  'Diagram #1: Flooring & Skirting Slab Cutting Layout (فرش فلورنگ اور اسکرٹنگ کی سلیب کٹنگ)',
                                  'ڈایاگرام نمبر 1: فرش فلورنگ اور اسکرٹنگ پٹی کی سلیب کٹنگ'
                                )}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activeCategoryPreset === 'bookmatch_wall'
                            ? tr(
                                'True Bookmatch flooring requires 4 consecutive slabs (Slab #1, #2, #3, #4) cut from the exact same slab zone.',
                                'اصلی بک میچ فلورنگ 4 سلیبوں (سلیب 1، 2، 3، 4) کے ایک ہی حصے سے کٹے ہوئے 4 ٹکڑے ملا کر بنتی ہے۔'
                              )
                            : tr(
                                'Large, clear 2D Slab Cutting Layout — click any piece on the slab to resize, rotate, or adjust its Bookmatch Latak.',
                                'بڑا اور واضح سلیب کٹنگ نقشہ — کسی بھی پیس پر کلک کر کے سائز، سلیب نمبر یا بک میچ لٹک تبدیل کریں۔'
                              )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Only show 4-Slab Bookmatch Toggle when in Bookmatch or Flooring mode */}
                        {(activeCategoryPreset === 'bookmatch_wall' ||
                          activeCategoryPreset === 'flooring') && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextMode = !fourSlabBookmatchMode;
                              setFourSlabBookmatchMode(nextMode);
                              if (nextMode) {
                                setActiveCategoryPreset('bookmatch_wall');
                                setViewAllSlabs(true);
                                setFloorColsCount(2);
                                if (slabConfig.quantity < 4) {
                                  setSlabConfig((prev) => ({ ...prev, quantity: 4 }));
                                }
                              } else {
                                setViewAllSlabs(false);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1.5 shadow transition-all ${
                              fourSlabBookmatchMode
                                ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950'
                                : 'bg-slate-900 hover:bg-slate-800 border-amber-500/60 text-amber-300'
                            }`}
                          >
                            <span>🦋</span>
                            <span>
                              {fourSlabBookmatchMode
                                ? tr('4-Slab Bookmatch: ON', '4-سلیب بک میچ: آن')
                                : tr('Open 4-Slab Bookmatch', '4-سلیب بک میچ کھولیں')}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleSetFullscreenMode(
                              fullscreenTarget === 'slab_diagram' ? 'workstation' : 'slab_diagram'
                            )
                          }
                          className={
                            fullscreenTarget === 'slab_diagram'
                              ? cadBtnPrimary
                              : cadBtnSecondary
                          }
                        >
                          {fullscreenTarget === 'slab_diagram' ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                          ) : (
                            <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                          )}
                          <span>
                            {fullscreenTarget === 'slab_diagram'
                              ? tr('Show Both Diagrams', 'دونوں ڈایاگرام دکھائیں')
                              : tr('Zoom Slab Diagram', 'سلیب ڈایاگرام بڑا کریں')}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* SIMPLE IN-DIAGRAM QUICK BUTTONS + LIVE POPUP (ABOVE SLAB CANVAS — NO HORIZONTAL SCROLL NEEDED!) */}
                    <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 space-y-2 print:hidden">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setInDiagram1Popup((p) => (p === 'slab' ? null : 'slab'))
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                              inDiagram1Popup === 'slab'
                                ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                                : 'bg-slate-950 border-slate-700 text-cyan-200 hover:border-cyan-500/60'
                            }`}
                          >
                            <Sliders className="h-3 w-3" />
                            <span>
                              {tr(
                                `Slab ${slabConfig.width}×${slabConfig.length}`,
                                `سلیب ${slabConfig.width}×${slabConfig.length}`
                              )}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setInDiagram1Popup((p) => (p === 'add' ? null : 'add'))
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                              inDiagram1Popup === 'add'
                                ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                                : 'bg-slate-950 border-slate-700 text-emerald-300 hover:border-emerald-500/60'
                            }`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{tr('Add Piece', 'نیا پیس')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setInDiagram1Popup((p) => (p === 'tools' ? null : 'tools'))
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                              inDiagram1Popup === 'tools'
                                ? 'bg-amber-400 border-amber-200 text-slate-950'
                                : 'bg-slate-950 border-slate-700 text-amber-300 hover:border-amber-500/60'
                            }`}
                          >
                            <Scissors className="h-3 w-3" />
                            <span>{tr('Tools', 'ٹولز')}</span>
                          </button>
                        </div>

                        {activeHighlightedPiece && (
                          <button
                            type="button"
                            onClick={() =>
                              setInDiagram1Popup((p) => (p === 'piece' ? null : 'piece'))
                            }
                            className={`px-2 py-1 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                              inDiagram1Popup === 'piece'
                                ? 'bg-sky-500 border-sky-300 text-slate-950'
                                : 'bg-sky-950/70 border-sky-500/60 text-sky-300'
                            }`}
                          >
                            <span>{`★ ${activeHighlightedPiece.pieceCode}`}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {inDiagram1Popup === 'slab' && (
                        <div className="rounded-lg border border-cyan-500/70 bg-slate-950 p-2.5 space-y-2 text-[11px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-black text-cyan-300">
                              {tr('Slab Size, Safai & Blade Kerf', 'سلیب سائز، صفائی اور بلیڈ کٹ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInDiagram1Popup(null)}
                              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono">
                            <div>
                              <Label className="text-[10px] text-amber-300 block">{tr('W (In)', 'چوڑائی')}</Label>
                              <Input
                                type="number"
                                min="6"
                                value={slabConfig.width}
                                onChange={(e) =>
                                  setSlabConfig((s) => ({
                                    ...s,
                                    width: Math.max(6, Number(e.target.value) || 60),
                                  }))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-sky-300 block">{tr('L (In)', 'لمبائی')}</Label>
                              <Input
                                type="number"
                                min="12"
                                value={slabConfig.length}
                                onChange={(e) =>
                                  setSlabConfig((s) => ({
                                    ...s,
                                    length: Math.max(12, Number(e.target.value) || 110),
                                  }))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-300 block">{tr('Qty', 'تعداد')}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={slabConfig.quantity}
                                onChange={(e) =>
                                  setSlabConfig((s) => ({
                                    ...s,
                                    quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  }))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-emerald-300 block">{tr('Safai (In)', 'صفائی')}</Label>
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={slabConfig.edgeTrim}
                                onChange={(e) =>
                                  setSlabConfig((s) => ({
                                    ...s,
                                    edgeTrim: Math.max(0, Number(e.target.value) || 0),
                                  }))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-cyan-300 block">{tr('Kerf (In)', 'کرف')}</Label>
                              <Input
                                type="number"
                                step="0.05"
                                min="0"
                                value={slabConfig.kerf}
                                onChange={(e) =>
                                  setSlabConfig((s) => ({
                                    ...s,
                                    kerf: Math.max(0, Number(e.target.value) || 0),
                                  }))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {inDiagram1Popup === 'add' && (
                        <div className="rounded-lg border border-emerald-500/70 bg-slate-950 p-2.5 space-y-2 text-[11px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-black text-emerald-300">
                              {tr('Quick Add Cut Piece', 'نیا کٹ پیس شامل کریں')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInDiagram1Popup(null)}
                              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 items-end">
                            <div className="col-span-2 sm:col-span-1">
                              <Label className="text-[10px] text-slate-300 block">{tr('Label', 'نام')}</Label>
                              <Input
                                type="text"
                                value={quickPartLabel}
                                onChange={(e) => setQuickPartLabel(e.target.value)}
                                className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-amber-300 block">{tr('1.W', '1.چوڑائی')}</Label>
                              <Input
                                type="number"
                                value={quickPartWid}
                                onChange={(e) => setQuickPartWid(Number(e.target.value) || 1)}
                                className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-sky-300 block">{tr('2.L', '2.لمبائی')}</Label>
                              <Input
                                type="number"
                                value={quickPartLen}
                                onChange={(e) => setQuickPartLen(Number(e.target.value) || 1)}
                                className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-300 block">{tr('Qty', 'تعداد')}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={quickPartQty}
                                onChange={(e) =>
                                  setQuickPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                                }
                                className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setParts((prev) => [
                                  ...prev,
                                  {
                                    id: `part-${Date.now()}`,
                                    label: quickPartLabel || `Piece #${prev.length + 1}`,
                                    length: Math.max(1, quickPartLen),
                                    width: Math.max(1, quickPartWid),
                                    quantity: Math.max(1, quickPartQty),
                                    allowRotation: true,
                                    isBookmatchedPair: false,
                                    installZone: 'floor',
                                    priority: 'normal',
                                    color: PART_PALETTE[prev.length % PART_PALETTE.length],
                                  },
                                ]);
                              }}
                              className="h-7 col-span-2 sm:col-span-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                            >
                              {tr('+ Add', '+ شامل')}
                            </button>
                          </div>
                        </div>
                      )}

                      {inDiagram1Popup === 'tools' && (
                        <div className="rounded-lg border border-amber-500/70 bg-slate-950 p-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowKerfLines((v) => !v)}
                              className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                                showKerfLines
                                  ? 'bg-sky-600 border-sky-400 text-white'
                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                              }`}
                            >
                              {`SAW: ${showKerfLines ? 'ON' : 'OFF'}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCadCrosshairs((v) => !v)}
                              className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                                showCadCrosshairs
                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                              }`}
                            >
                              {`DIM: ${showCadCrosshairs ? 'ON' : 'OFF'}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowOffcutLabels((v) => !v)}
                              className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                                showOffcutLabels
                                  ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                              }`}
                            >
                              {`OFFCUT: ${showOffcutLabels ? 'ON' : 'OFF'}`}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCanvasToolMode((m) =>
                                  m === 'mark_crack' ? 'select_move' : 'mark_crack'
                                )
                              }
                              className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                                canvasToolMode === 'mark_crack'
                                  ? 'bg-rose-600 border-rose-300 text-white'
                                  : 'bg-slate-900 border-slate-700 text-rose-300'
                              }`}
                            >
                              {tr('Mark Crack', 'کریک نشان')}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInDiagram1Popup(null)}
                            className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {inDiagram1Popup === 'piece' && activeHighlightedPiece && (() => {
                        const sourcePart = parts.find(
                          (pt) => pt.id === activeHighlightedPiece.partId
                        );
                        if (!sourcePart) return null;
                        return (
                          <div className="rounded-lg border border-sky-400/80 bg-slate-950 p-2 space-y-1.5 text-[11px]">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 font-black">
                                  {activeHighlightedPiece.pieceCode}
                                </span>
                                <span className="text-white font-bold">
                                  {sourcePart.label}
                                </span>
                                <span className="text-emerald-300 text-[10px]">
                                  {`S#${activeHighlightedPiece.slabIndex}`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setInDiagram1Popup(null)}
                                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 font-mono">
                              <span className="text-[10px] text-amber-300">W:</span>
                              <input
                                type="number"
                                value={Number(sourcePart.width.toFixed(1))}
                                onChange={(e) =>
                                  handleUpdatePart(
                                    sourcePart.id,
                                    'width',
                                    Math.max(1, Number(e.target.value) || 1)
                                  )
                                }
                                className="w-14 h-6 rounded bg-slate-900 border border-slate-700 text-white text-center font-bold"
                              />
                              <span className="text-slate-500">×</span>
                              <span className="text-[10px] text-sky-300">L:</span>
                              <input
                                type="number"
                                value={Number(sourcePart.length.toFixed(1))}
                                onChange={(e) =>
                                  handleUpdatePart(
                                    sourcePart.id,
                                    'length',
                                    Math.max(1, Number(e.target.value) || 1)
                                  )
                                }
                                className="w-14 h-6 rounded bg-slate-900 border border-slate-700 text-white text-center font-bold"
                              />
                              <span className="text-[10px] text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                value={sourcePart.quantity}
                                onChange={(e) =>
                                  handleUpdatePart(
                                    sourcePart.id,
                                    'quantity',
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  )
                                }
                                className="w-12 h-6 rounded bg-slate-900 border border-slate-700 text-white text-center font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const oldL = sourcePart.length;
                                  const oldW = sourcePart.width;
                                  handleUpdatePart(sourcePart.id, 'length', oldW);
                                  handleUpdatePart(sourcePart.id, 'width', oldL);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold cursor-pointer"
                              >
                                ↻ 90°
                              </button>
                              <select
                                value={String(sourcePart.targetSlabNumber || 0)}
                                onChange={(e) => {
                                  const nextSlab = parseInt(e.target.value, 10) || 0;
                                  setParts((prev) =>
                                    prev.map((x) =>
                                      x.id === sourcePart.id
                                        ? {
                                            ...x,
                                            targetSlabNumber: nextSlab > 0 ? nextSlab : undefined,
                                          }
                                        : x
                                    )
                                  );
                                }}
                                className="h-6 rounded bg-slate-900 border border-emerald-500/60 text-emerald-300 font-bold px-1.5 cursor-pointer"
                              >
                                <option value="0">{tr('Auto Slab', 'آٹو سلیب')}</option>
                                {Array.from({ length: Math.max(4, slabConfig.quantity) }).map(
                                  (_, sIdx) => (
                                    <option key={sIdx + 1} value={String(sIdx + 1)}>
                                      {`S#${sIdx + 1}`}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800 font-mono">
                              <button
                                type="button"
                                onClick={() =>
                                  handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, -1, 0)
                                }
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                              >
                                ◀ -1&quot;
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 1, 0)
                                }
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                              >
                                +1&quot; ▶
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 0, -1)
                                }
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                              >
                                ▲ -1&quot;
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleNudgePieceOnSlab(activeHighlightedPiece.instanceId, 0, 1)
                                }
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
                              >
                                ▼ +1&quot;
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ONLY OPEN 4-SLAB BOOKMATCH BUILDER WHEN BOOKMATCH CATEGORY IS SELECTED */}
                    {activeCategoryPreset === 'bookmatch_wall' &&
                      fourSlabBookmatchMode &&
                      (() => {
                        const firstSlab = summary.slabs[0];
                        const sLen = firstSlab?.slabLength || slabConfig.length || 110;
                        const sWid = firstSlab?.slabWidth || slabConfig.width || 60;
                        const trimVal = firstSlab?.edgeTrim ?? slabConfig.edgeTrim ?? 0.5;
                        const slabZones = (firstSlab?.placedPieces || []).filter(
                          (p) =>
                            !p.instanceId.includes('_bm_') &&
                            !p.instanceId.includes('_latak_')
                        );
                        const safeZoneIdx =
                          slabZones.length > 0
                            ? Math.min(activeBmZoneIdx, slabZones.length - 1)
                            : 0;
                        const activeZonePiece = slabZones[safeZoneIdx] || firstSlab?.placedPieces[0];
                        const zLetter = String.fromCharCode(65 + (safeZoneIdx % 26));
                        const primaryBmPart =
                          (activeZonePiece
                            ? parts.find((p) => p.id === activeZonePiece.partId)
                            : null) || parts[0];

                        // Read directly from primaryBmPart so setting Full Slab Size (e.g. 60x110) NEVER snaps back to default 28x52!
                        const pieceW =
                          Number(primaryBmPart?.width) ||
                          (activeZonePiece ? activeZonePiece.height : 28);
                        const pieceL =
                          Number(primaryBmPart?.length) ||
                          (activeZonePiece ? activeZonePiece.width : 52);
                        const totalBmW = Number((pieceW * 2).toFixed(2));
                        const totalBmL = Number((pieceL * 2).toFixed(2));
                        const totalBmSqFt = toSqFt(totalBmW * totalBmL, unit);

                        const zoneX1 = activeZonePiece ? Number(activeZonePiece.x.toFixed(1)) : trimVal;
                        const zoneX2 = activeZonePiece
                          ? Number((activeZonePiece.x + activeZonePiece.width).toFixed(1))
                          : Math.min(sLen, zoneX1 + pieceL);
                        const zoneY1 = activeZonePiece ? Number(activeZonePiece.y.toFixed(1)) : trimVal;
                        const zoneY2 = activeZonePiece
                          ? Number((activeZonePiece.y + activeZonePiece.height).toFixed(1))
                          : Math.min(sWid, zoneY1 + pieceW);

                        // Helper to describe which region of the slab this Zone is located in
                        const horizRegionUr =
                          zoneX1 < sLen * 0.25
                            ? tr('Left Side', 'بایاں حصہ')
                            : zoneX1 > sLen * 0.45
                            ? tr('Right Side', 'دایاں حصہ')
                            : tr('Center', 'درمیانی حصہ');
                        const vertRegionUr =
                          zoneY1 < sWid * 0.25
                            ? tr('Top', 'اوپر والا حصہ')
                            : zoneY1 > sWid * 0.45
                            ? tr('Bottom', 'نیچے والا حصہ')
                            : tr('Middle', 'درمیان');

                        const slabVis1 = getSlabVisualConfig(1);
                        const bgWidthPct = (sLen / Math.max(1, pieceL)) * 100;
                        const bgHeightPct = (sWid / Math.max(1, pieceW)) * 100;
                        const posX =
                          sLen > pieceL ? (zoneX1 / Math.max(1, sLen - pieceL)) * 100 : 0;
                        const posY =
                          sWid > pieceW ? (zoneY1 / Math.max(1, sWid - pieceW)) * 100 : 0;

                        return (
                          <div className="rounded-xl border-2 border-amber-500/60 bg-slate-900/95 overflow-hidden shadow-lg">
                            <CadWindowHeaderBar
                              screenId="bookmatch_panel"
                              workspace={cadWorkspace}
                              setWorkspace={setCadWorkspace}
                              cadLang={cadLang}
                            />
                            {!(cadWorkspace.screens?.bookmatch_panel?.minimized) && (
                            <div className="p-3.5 space-y-3">
                            {/* Row 1: Header + Full-Slab vs Cut-Piece Mode + Auto vs Manual 4-Slab Selector */}
                            <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="text-xs sm:text-sm font-bold text-amber-300">
                                    {tr(
                                      '🦋 4-Slab & Full-Slab Bookmatch Control (چار سلیب اور فل سلیب بک میچ سسٹم)',
                                      '🦋 چار سلیب (4-Slab) اور فل سلیب بک میچ سلیکشن سسٹم'
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-300">
                                    {tr(
                                      'Choose Full-Slab (all 4 whole slabs) or Cut-Piece Bookmatch, and select your 4 slabs automatically or manually.',
                                      'یہاں سے فل سلیب (چاروں مکمل سلیبوں کا بک میچ) یا کٹ پیس بک میچ منتخب کریں، اور چار سلیبیں اٹومیٹک یا خود سلیکٹ کریں۔'
                                    )}
                                  </p>
                                </div>

                                {/* 1. Full-Slab Bookmatch vs Cut-Piece Bookmatch Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleActivateFullSlabFourBookmatch}
                                    className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-colors ${
                                      isFullSlabBookmatch
                                        ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-xs'
                                        : 'bg-slate-950 border-amber-500/50 text-amber-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    {tr(
                                      `🖼️ Full-Slab 4-Slab Bookmatch (${slabConfig.width * 2}"×${slabConfig.length * 2}")`,
                                      `🖼️ فل سلیب 4-سلیب بک میچ (${slabConfig.width * 2}"×${slabConfig.length * 2}")`
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setIsFullSlabBookmatch(false)}
                                    className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-colors ${
                                      !isFullSlabBookmatch
                                        ? 'bg-sky-600 border-sky-400 text-white shadow-xs'
                                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    {tr(
                                      '✂️ Cut-Piece 4-Slab Bookmatch',
                                      '✂️ کٹ پیس 4-سلیب بک میچ'
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* 2. Auto vs Manual 4-Slab Selection Bar (اٹومیٹک سلیکشن یا خود 4 سلیب منتخب کریں) */}
                              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-200">
                                      {tr(
                                        'Which 4 Slabs Make the Bookmatch:',
                                        'بک میچ بنانے کے لیے 4 سلیبیں کیسے سلیکٹ کریں:'
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFourSlabSelectionMode('auto');
                                        setManualFourSlabNums([1, 2, 3, 4]);
                                      }}
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                        fourSlabSelectionMode === 'auto'
                                          ? 'bg-emerald-600 border-emerald-400 text-white'
                                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      {tr('🤖 Auto Select (Slabs #1, #2, #3, #4)', '🤖 اٹومیٹک سلیکشن (سلیب 1 تا 4)')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFourSlabSelectionMode('manual')}
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                                        fourSlabSelectionMode === 'manual'
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      {tr('✋ Manual Pick 4 Slabs (خود 4 سلیب منتخب کریں)', '✋ خود 4 سلیب منتخب کریں (Manual)')}
                                    </button>
                                  </div>

                                  {/* Show Which Saved Stocks Can Make a 4-Slab Bookmatch (Qty >= 4) */}
                                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                    <span className="text-slate-400">
                                      {tr('4-Slab Ready Stocks:', 'بک میچ کے قابل اسٹاک (4+ سلیب):')}
                                    </span>
                                    {savedStockList
                                      .filter((st) => st.quantity >= 4)
                                      .map((st) => (
                                        <button
                                          key={st.id}
                                          type="button"
                                          onClick={() => handleLoadStockItemIntoOptimizer(st)}
                                          className={`px-2 py-0.5 rounded border font-mono font-semibold ${
                                            st.lotId === slabConfig.lotId
                                              ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                                          }`}
                                        >
                                          {st.materialName.slice(0, 14)} ({st.quantity} Slabs)
                                        </button>
                                      ))}
                                  </div>
                                </div>

                                {/* Manual 4-Slab Picker Dropdowns when fourSlabSelectionMode === 'manual' */}
                                {fourSlabSelectionMode === 'manual' ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    {(
                                      [
                                        { pos: 0, label: tr('1. Top-Left Slab (↗)', '1. اوپر بائیں سلیب (↗)') },
                                        { pos: 1, label: tr('2. Top-Right Slab (↔ ↖)', '2. اوپر دائیں سلیب (↔ ↖)') },
                                        { pos: 2, label: tr('3. Bottom-Left Slab (↕ ↘)', '3. نیچے بائیں سلیب (↕ ↘)') },
                                        { pos: 3, label: tr('4. Bottom-Right Slab (↔↕ ↙)', '4. نیچے دائیں سلیب (↔↕ ↙)') },
                                      ] as const
                                    ).map((slot) => (
                                      <div key={slot.pos} className="space-y-0.5">
                                        <Label className="text-[10px] font-bold text-amber-300">
                                          {slot.label}
                                        </Label>
                                        <select
                                          value={String(manualFourSlabNums[slot.pos])}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 1;
                                            setManualFourSlabNums((prev) => {
                                              const next: [number, number, number, number] = [...prev];
                                              next[slot.pos] = val;
                                              return next;
                                            });
                                          }}
                                          className="w-full h-7 rounded bg-slate-900 border border-amber-500/50 text-white font-mono text-[11px] px-1.5 cursor-pointer"
                                        >
                                          {Array.from({ length: Math.max(4, slabConfig.quantity) }).map(
                                            (_, idx) => {
                                              const sNum = idx + 1;
                                              const ov = slabOverrides[sNum];
                                              return (
                                                <option key={sNum} value={String(sNum)}>
                                                  {`Slab #${sNum}${ov?.sourceLabel ? ` (${ov.sourceLabel.slice(0, 14)})` : ''}`}
                                                </option>
                                              );
                                            }
                                          )}
                                        </select>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Auto Consecutive 4-Slab Group Selector (e.g. Slabs 1-4, Slabs 5-8) */
                                  slabConfig.quantity > 4 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      <span className="text-[10px] text-slate-400">
                                        {tr('Auto 4-Slab Sets in Block:', 'بلاک میں موجود 4-سلیب سیٹس:')}
                                      </span>
                                      {Array.from({
                                        length: Math.floor(slabConfig.quantity / 4),
                                      }).map((_, gIdx) => {
                                        const s1 = gIdx * 4 + 1;
                                        const s4 = gIdx * 4 + 4;
                                        const isCurrentSet = manualFourSlabNums[0] === s1;
                                        return (
                                          <button
                                            key={s1}
                                            type="button"
                                            onClick={() =>
                                              setManualFourSlabNums([s1, s1 + 1, s1 + 2, s4])
                                            }
                                            className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                                              isCurrentSet
                                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                                            }`}
                                          >
                                            {tr(
                                              `Set #${gIdx + 1}: Slabs #${s1}, #${s1 + 1}, #${s1 + 2}, #${s4}`,
                                              `سیٹ #${gIdx + 1}: سلیب ${s1} تا ${s4}`
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )
                                )}
                              </div>

                              {/* Zone Selector Buttons: Zone A, Zone B, etc. */}
                              {slabZones.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {tr('Select Slab Zone (سلیب کا حصہ):', 'سلیب کا حصہ منتخب کریں:')}
                                  </span>
                                  {slabZones.map((zp, zIdx) => {
                                    const zl = String.fromCharCode(65 + (zIdx % 26));
                                    const isAct = zIdx === safeZoneIdx;
                                    return (
                                      <button
                                        key={zp.instanceId}
                                        type="button"
                                        onClick={() => {
                                          setActiveBmZoneIdx(zIdx);
                                          setSelectedPieceId(zp.instanceId);
                                        }}
                                        className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold transition-all ${
                                          isAct
                                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-xs'
                                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-amber-500/50'
                                        }`}
                                      >
                                        {`Zone ${zl}: (${formatNum(zp.height)}"×${formatNum(zp.width)}")`}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Row 2: Bookmatch Size Controls (W×L -> 2W×2L) + Full-Slab 4-Slab Button RIGHT HERE + Slab Part Coordinates (X", Y") */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                              {/* Left 6 Cols: Piece Size, Manual Sliders, Full-Size Slab Button & Total 4-Slab Bookmatch Size Readout */}
                              <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <span className="text-[11px] font-bold text-amber-300">
                                    {tr(
                                      `1. Cut Piece Size & Total Bookmatch Size (${unit}):`,
                                      `1. ٹکڑے کا سائز اور چاروں سلیب ملا کر مکمل بک میچ سائز (${unit}):`
                                    )}
                                  </span>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {/* PROMINENT FULL-SIZE SLAB 4-SLAB BOOKMATCH BUTTON RIGHT NEXT TO CUT-PIECE SIZE! */}
                                    <button
                                      type="button"
                                      onClick={handleActivateFullSlabFourBookmatch}
                                      className={`px-2.5 py-1 rounded border text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-xs ${
                                        isFullSlabBookmatch ||
                                        (pieceW >= sWid - 0.5 && pieceL >= sLen - 0.5)
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-amber-950/90 hover:bg-amber-500 border-amber-400 text-amber-200 hover:text-slate-950'
                                      }`}
                                      title="Set to 100% Full Slab Size across all 4 Slabs"
                                    >
                                      <span>🖼️</span>
                                      <span>
                                        {tr(
                                          `Full Size 4-Slab (${sWid}"×${sLen}" ➔ ${sWid * 2}"×${sLen * 2}")`,
                                          `فل سائز 4-سلیب بک میچ (${sWid}"×${sLen}" ➔ ${sWid * 2}"×${sLen * 2}")`
                                        )}
                                      </span>
                                    </button>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-bold">
                                      {totalBmSqFt.toFixed(2)} Sq.Ft Total BM
                                    </span>
                                  </div>
                                </div>

                                {/* Manual Inputs + Smooth Range Sliders for Piece Width & Length (Never resets on Full Size!) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div className="rounded bg-slate-900 border border-slate-800 p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] font-bold text-amber-300">
                                        {tr(
                                          `1. Piece Width (Max ${sWid}${unit})`,
                                          `1. ٹکڑے کی چوڑائی (فل سلیب ${sWid}${unit})`
                                        )}
                                      </Label>
                                      <span className="text-[10px] font-mono text-amber-200 font-bold">
                                        BM W: {formatNum(totalBmW)}&quot;
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="4"
                                        max={sWid}
                                        step="any"
                                        value={pieceW}
                                        onChange={(e) => {
                                          const nw = Math.max(
                                            4,
                                            Math.min(sWid, Number(e.target.value) || 4)
                                          );
                                          handleSetBookmatchPieceDimensions(
                                            nw,
                                            pieceL,
                                            primaryBmPart?.id
                                          );
                                        }}
                                        className="h-7 w-20 text-xs font-mono font-bold bg-slate-950 text-white border-amber-500/60 px-2"
                                      />
                                      <input
                                        type="range"
                                        min="8"
                                        max={sWid}
                                        step="0.5"
                                        value={Math.min(sWid, pieceW)}
                                        onChange={(e) => {
                                          const nw = Number(e.target.value);
                                          handleSetBookmatchPieceDimensions(
                                            nw,
                                            pieceL,
                                            primaryBmPart?.id
                                          );
                                        }}
                                        className="flex-1 accent-amber-500 h-2 cursor-pointer"
                                        title="Slide all the way right for Full Slab Width"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetBookmatchPieceDimensions(
                                            sWid,
                                            pieceL,
                                            primaryBmPart?.id
                                          )
                                        }
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[9px] font-mono font-bold"
                                      >
                                        Max {sWid}&quot;
                                      </button>
                                    </div>
                                  </div>

                                  <div className="rounded bg-slate-900 border border-slate-800 p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[10px] font-bold text-sky-300">
                                        {tr(
                                          `2. Piece Length (Max ${sLen}${unit})`,
                                          `2. ٹکڑے کی لمبائی (فل سلیب ${sLen}${unit})`
                                        )}
                                      </Label>
                                      <span className="text-[10px] font-mono text-sky-200 font-bold">
                                        BM L: {formatNum(totalBmL)}&quot;
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="4"
                                        max={sLen}
                                        step="any"
                                        value={pieceL}
                                        onChange={(e) => {
                                          const nl = Math.max(
                                            4,
                                            Math.min(sLen, Number(e.target.value) || 4)
                                          );
                                          handleSetBookmatchPieceDimensions(
                                            pieceW,
                                            nl,
                                            primaryBmPart?.id
                                          );
                                        }}
                                        className="h-7 w-20 text-xs font-mono font-bold bg-slate-950 text-white border-sky-500/60 px-2"
                                      />
                                      <input
                                        type="range"
                                        min="12"
                                        max={sLen}
                                        step="0.5"
                                        value={Math.min(sLen, pieceL)}
                                        onChange={(e) => {
                                          const nl = Number(e.target.value);
                                          handleSetBookmatchPieceDimensions(
                                            pieceW,
                                            nl,
                                            primaryBmPart?.id
                                          );
                                        }}
                                        className="flex-1 accent-sky-400 h-2 cursor-pointer"
                                        title="Slide all the way right for Full Slab Length"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetBookmatchPieceDimensions(
                                            pieceW,
                                            sLen,
                                            primaryBmPart?.id
                                          )
                                        }
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-500 text-sky-300 hover:text-slate-950 text-[9px] font-mono font-bold"
                                      >
                                        Max {sLen}&quot;
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Prominent Editable Total 4-Slab Bookmatch Size Callout Box */}
                                <div className="rounded-md bg-amber-500/15 border border-amber-400/60 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[9px] font-bold text-amber-200 uppercase block">
                                      {tr(
                                        'Total 4-Slab Bookmatch Size (2×2 Joined):',
                                        '4 ٹکڑے ملا کر مکمل بک میچ سائز (کتنے بائی کتنے انچ):'
                                      )}
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-300">
                                      {formatNum(totalBmW)}&quot; × {formatNum(totalBmL)}&quot; {unit}{' '}
                                      <span className="text-emerald-300 text-[11px]">
                                        ({(totalBmW / 12).toFixed(1)} ft × {(totalBmL / 12).toFixed(1)} ft)
                                      </span>
                                    </span>
                                  </div>

                                  {/* Direct Total Bookmatch Width × Length Inputs */}
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                    <span className="text-amber-200 font-bold">
                                      {tr('Set Total BM:', 'ٹوٹل بک میچ سائز لکھیں:')}
                                    </span>
                                    <Input
                                      type="number"
                                      min="8"
                                      max={sWid * 2}
                                      value={totalBmW}
                                      onChange={(e) => {
                                        const totW = Math.max(
                                          8,
                                          Math.min(sWid * 2, Number(e.target.value) || 48)
                                        );
                                        handleSetBookmatchPieceDimensions(
                                          totW / 2,
                                          pieceL,
                                          primaryBmPart?.id
                                        );
                                      }}
                                      className="h-6 w-16 text-[11px] font-mono font-bold bg-slate-950 text-amber-300 border-amber-400/60 px-1.5"
                                    />
                                    <span className="text-white font-bold">×</span>
                                    <Input
                                      type="number"
                                      min="8"
                                      max={sLen * 2}
                                      value={totalBmL}
                                      onChange={(e) => {
                                        const totL = Math.max(
                                          8,
                                          Math.min(sLen * 2, Number(e.target.value) || 96)
                                        );
                                        handleSetBookmatchPieceDimensions(
                                          pieceW,
                                          totL / 2,
                                          primaryBmPart?.id
                                        );
                                      }}
                                      className="h-6 w-16 text-[11px] font-mono font-bold bg-slate-950 text-sky-300 border-sky-400/60 px-1.5"
                                    />
                                  </div>
                                </div>

                                {/* Quick 1-Click Bookmatch Size Presets + Full Slab Preset Right Beside Them */}
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[9px] text-slate-400 font-semibold mr-1">
                                    {tr('Quick BM Sizes:', 'فوری بک میچ سائز:')}
                                  </span>
                                  {[
                                    { w: 24, l: 24, label: '24×24 ➔ 48"×48" BM' },
                                    { w: 24, l: 48, label: '24×48 ➔ 48"×96" BM' },
                                    { w: 28, l: 52, label: '28×52 ➔ 56"×104" BM' },
                                    { w: 30, l: 48, label: '30×48 ➔ 60"×96" BM' },
                                    { w: 30, l: 54, label: '30×54 ➔ 60"×108" BM' },
                                    {
                                      w: sWid,
                                      l: sLen,
                                      label: `🖼️ Full Slab (${sWid}×${sLen} ➔ ${sWid * 2}"×${sLen * 2}" BM)`,
                                    },
                                  ].map((sz) => (
                                    <button
                                      key={sz.label}
                                      type="button"
                                      onClick={() => {
                                        handleSetBookmatchPieceDimensions(
                                          sz.w,
                                          sz.l,
                                          primaryBmPart?.id,
                                          sz.w === sWid && sz.l === sLen
                                        );
                                      }}
                                      className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                                        Math.abs(pieceW - sz.w) < 0.2 &&
                                        Math.abs(pieceL - sz.l) < 0.2
                                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      {sz.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Right 6 Cols: Which Exact Part of the Slab (Coordinates X", Y" & Sliders) + Which 4 Pieces Join */}
                              <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold text-sky-300">
                                    {tr(
                                      `2. Slab Part / Region (سلیب کے کس حصے سے کٹ رہا ہے — Zone ${zLetter}):`,
                                      `2. سلیب کے کس حصے سے بک میچ بن رہا ہے (حصہ ${zLetter}):`
                                    )}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 font-mono text-[10px] font-bold">
                                    {horizRegionUr} · {vertRegionUr}
                                  </span>
                                </div>

                                {/* Exact Slab Position Sliders (Slide X" and Y" across the slab to pick the exact vein zone) */}
                                {activeZonePiece && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="bg-slate-900 rounded border border-slate-800 px-2 py-1">
                                      <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-sky-300 font-bold">
                                          {tr('From Left Edge (بائیں سے X):', 'سلیب کے بائیں کنارے سے (X):')}
                                        </span>
                                        <span className="text-amber-300 font-bold">
                                          {zoneX1}&quot; ➔ {zoneX2}&quot; {unit}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={trimVal}
                                        max={Math.max(trimVal, sLen - trimVal - pieceL)}
                                        step="0.5"
                                        value={zoneX1}
                                        onChange={(e) => {
                                          const targetX = Number(e.target.value);
                                          const curOffset =
                                            manualPieceOffsets[activeZonePiece.instanceId] || {
                                              dx: 0,
                                              dy: 0,
                                            };
                                          const baseOrigX = activeZonePiece.x - curOffset.dx;
                                          setManualPieceOffsets((prev) => ({
                                            ...prev,
                                            [activeZonePiece.instanceId]: {
                                              dx: Number((targetX - baseOrigX).toFixed(2)),
                                              dy: curOffset.dy,
                                            },
                                          }));
                                        }}
                                        className="w-full accent-amber-500 h-1.5 mt-1 cursor-pointer"
                                      />
                                    </div>

                                    <div className="bg-slate-900 rounded border border-slate-800 px-2 py-1">
                                      <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-sky-300 font-bold">
                                          {tr('From Top Edge (اوپر سے Y):', 'سلیب کے اوپر کنارے سے (Y):')}
                                        </span>
                                        <span className="text-amber-300 font-bold">
                                          {zoneY1}&quot; ➔ {zoneY2}&quot; {unit}
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={trimVal}
                                        max={Math.max(trimVal, sWid - trimVal - pieceW)}
                                        step="0.5"
                                        value={zoneY1}
                                        onChange={(e) => {
                                          const targetY = Number(e.target.value);
                                          const curOffset =
                                            manualPieceOffsets[activeZonePiece.instanceId] || {
                                              dx: 0,
                                              dy: 0,
                                            };
                                          const baseOrigY = activeZonePiece.y - curOffset.dy;
                                          setManualPieceOffsets((prev) => ({
                                            ...prev,
                                            [activeZonePiece.instanceId]: {
                                              dx: curOffset.dx,
                                              dy: Number((targetY - baseOrigY).toFixed(2)),
                                            },
                                          }));
                                        }}
                                        className="w-full accent-sky-400 h-1.5 mt-1 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Explicit 4-Piece Traceability Readout: Which 4 Pieces from the 4 Slabs Join Together */}
                                <div className="rounded bg-slate-900 border border-emerald-500/40 px-2.5 py-1.5 text-[10px] font-mono text-emerald-200 flex flex-wrap items-center justify-between gap-1">
                                  <span className="font-bold text-amber-300">
                                    {tr(
                                      `4 Matching Pieces for Bookmatch Set ${zLetter}:`,
                                      `بک میچ سیٹ ${zLetter} بنانے والے 4 ٹکڑے (چاروں سلیبوں کا ایک ہی حصہ):`
                                    )}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-amber-400/60 text-white font-bold">
                                      1: [S1-{zLetter}] (Slab 1 ↗)
                                    </span>
                                    <span>+</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-sky-400/60 text-white font-bold">
                                      2: [S2-{zLetter}] (Slab 2 ↔ ↖)
                                    </span>
                                    <span>+</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-emerald-400/60 text-white font-bold">
                                      3: [S3-{zLetter}] (Slab 3 ↕ ↘)
                                    </span>
                                    <span>+</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-purple-400/60 text-white font-bold">
                                      4: [S4-{zLetter}] (Slab 4 ↔↕ ↙)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Row 3: Live Visual 4-Slab Zone Map (Left) + Joined 4-Slab Bookmatch Medallion Preview (Right) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-1">
                              {/* Left 7 Cols: 4 Slabs (SLAB #1, SLAB #2, SLAB #3, SLAB #4) showing the exact highlighted Zone */}
                              <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-bold text-amber-300">
                                    {tr(
                                      `4 Slabs in Block — Highlighting Zone ${zLetter} (X: ${zoneX1}"..${zoneX2}", Y: ${zoneY1}"..${zoneY2}")`,
                                      `چاروں سلیبیں (SLAB 1..4) — سلیب کا حصہ ${zLetter} (بائیں سے ${zoneX1}" تا ${zoneX2}"، اوپر سے ${zoneY1}" تا ${zoneY2}")`
                                    )}
                                  </span>
                                  <span className="text-sky-300 font-bold">
                                    {tr('Click any zone on slab to select', 'کسی بھی حصے پر کلک کریں')}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {manualFourSlabNums.map((slabNum, quadIdx) => {
                                    const sVis = getSlabVisualConfig(slabNum);
                                    const roleBadge =
                                      quadIdx === 0
                                        ? tr('1: Top-Left (Normal ↗)', '1: اوپر بائیں (سیدھا ↗)')
                                        : quadIdx === 1
                                        ? tr('2: Top-Right (Flip H ↔ ↖)', '2: اوپر دائیں (الٹ ↔ ↖)')
                                        : quadIdx === 2
                                        ? tr('3: Bottom-Left (Flip V ↕ ↘)', '3: نیچے بائیں (الٹ ↕ ↘)')
                                        : tr('4: Bottom-Right (Flip HV ↔↕ ↙)', '4: نیچے دائیں (الٹ ↔↕ ↙)');
                                    return (
                                      <div
                                        key={`${quadIdx}-${slabNum}`}
                                        className="rounded border border-slate-700 bg-slate-900 p-1.5 space-y-1"
                                      >
                                        <div className="flex items-center justify-between text-[9px] font-mono">
                                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold">
                                            SLAB #{slabNum} ➔ [S{slabNum}-{zLetter}]
                                          </span>
                                          <span className="text-sky-300 font-bold">{roleBadge}</span>
                                        </div>

                                        <div className="relative w-full h-24 rounded border border-slate-700 bg-slate-950 overflow-hidden">
                                          {sVis.imageUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={sVis.imageUrl}
                                              alt={`Slab #${slabNum}`}
                                              referrerPolicy="no-referrer"
                                              className="w-full h-full object-cover opacity-80"
                                            />
                                          )}
                                          {/* Render all zones on this slab */}
                                          {slabZones.map((zp, zIdx) => {
                                            const zl = String.fromCharCode(65 + (zIdx % 26));
                                            const isAct = zIdx === safeZoneIdx;
                                            const leftPct = (zp.x / Math.max(1, sLen)) * 100;
                                            const topPct = (zp.y / Math.max(1, sWid)) * 100;
                                            const wPct = (zp.width / Math.max(1, sLen)) * 100;
                                            const hPct = (zp.height / Math.max(1, sWid)) * 100;
                                            return (
                                              <div
                                                key={`${slabNum}-${zp.instanceId}`}
                                                onClick={() => setActiveBmZoneIdx(zIdx)}
                                                style={{
                                                  left: `${leftPct}%`,
                                                  top: `${topPct}%`,
                                                  width: `${wPct}%`,
                                                  height: `${hPct}%`,
                                                }}
                                                className={`absolute cursor-pointer flex flex-col items-center justify-center transition-all ${
                                                  isAct
                                                    ? 'border-2 border-amber-400 bg-amber-500/30 z-10 shadow-md'
                                                    : 'border border-white/60 bg-slate-950/45 hover:bg-sky-500/20'
                                                }`}
                                              >
                                                <span
                                                  className={`px-1 rounded text-[9px] font-mono font-extrabold ${
                                                    isAct
                                                      ? 'bg-amber-400 text-slate-950'
                                                      : 'bg-slate-950/80 text-white'
                                                  }`}
                                                >
                                                  S{slabNum}-{zl}
                                                </span>
                                                {isAct && (
                                                  <span className="text-[8px] font-mono font-bold text-white bg-slate-950/85 px-1 rounded mt-0.5">
                                                    {formatNum(zp.height)}&quot;×{formatNum(zp.width)}&quot;
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right 5 Cols: Assembled 4-Slab Diamond Bookmatch Result for Selected Zone */}
                              <div className="lg:col-span-5 rounded-lg border-2 border-amber-500/70 bg-slate-950 p-2.5 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-bold text-emerald-300">
                                    {tr(
                                      `Assembled 4-Slab Bookmatch (Zone ${zLetter}):`,
                                      `مکمل جڑا ہوا 4-سلیب بک میچ (حصہ ${zLetter} کے 4 ٹکڑے):`
                                    )}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold">
                                    {formatNum(totalBmW)}&quot; × {formatNum(totalBmL)}&quot; {unit}
                                  </span>
                                </div>

                                {/* 2x2 Joined Bookmatch Medallion Preview using the 4 Selected Slabs */}
                                <div className="grid grid-cols-2 gap-0 rounded-md overflow-hidden border-2 border-amber-400 shadow-inner aspect-[16/10] bg-slate-900">
                                  {[
                                    {
                                      slabNum: manualFourSlabNums[0],
                                      flipH: false,
                                      flipV: false,
                                      posLabel: `S${manualFourSlabNums[0]}-${zLetter} (Top-Left)`,
                                    },
                                    {
                                      slabNum: manualFourSlabNums[1],
                                      flipH: true,
                                      flipV: false,
                                      posLabel: `S${manualFourSlabNums[1]}-${zLetter} (Top-Right ↔)`,
                                    },
                                    {
                                      slabNum: manualFourSlabNums[2],
                                      flipH: false,
                                      flipV: true,
                                      posLabel: `S${manualFourSlabNums[2]}-${zLetter} (Btm-Left ↕)`,
                                    },
                                    {
                                      slabNum: manualFourSlabNums[3],
                                      flipH: true,
                                      flipV: true,
                                      posLabel: `S${manualFourSlabNums[3]}-${zLetter} (Btm-Right ↔↕)`,
                                    },
                                  ].map((quad, qIdx) => {
                                    const qVis = getSlabVisualConfig(quad.slabNum);
                                    return (
                                      <div
                                        key={`${qIdx}-${quad.slabNum}`}
                                        className="relative overflow-hidden border border-amber-400/30"
                                      >
                                        <div
                                          className="w-full h-full bg-no-repeat"
                                          style={{
                                            backgroundImage: `url("${qVis.imageUrl || slabVis1.imageUrl}")`,
                                            backgroundSize: `${bgWidthPct}% ${bgHeightPct}%`,
                                            backgroundPosition: `${posX}% ${posY}%`,
                                            transform: `scale(${quad.flipH ? -1 : 1}, ${
                                              quad.flipV ? -1 : 1
                                            })`,
                                          }}
                                        />
                                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/85 border border-amber-400/50 text-[9px] font-mono font-bold text-amber-300">
                                          {quad.posLabel}
                                        </span>
                                        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-slate-950/80 text-[8px] font-mono text-white">
                                          {formatNum(pieceW)}&quot;×{formatNum(pieceL)}&quot;
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between">
                                  <span>
                                    {tr(
                                      `Cut from Slab X:${zoneX1}"..${zoneX2}", Y:${zoneY1}"..${zoneY2}"`,
                                      `سلیب کا حصہ: بائیں سے ${zoneX1}" تا ${zoneX2}" | اوپر سے ${zoneY1}" تا ${zoneY2}"`
                                    )}
                                  </span>
                                  <span className="text-amber-300 font-bold">
                                    4 Pcs × ({formatNum(pieceW)}&quot;×{formatNum(pieceL)}&quot;) = {formatNum(totalBmW)}&quot;×{formatNum(totalBmL)}&quot;
                                  </span>
                                </div>
                              </div>
                            </div>
                            </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Split Container: Main Active Slab Canvas (Left) + Vertical Scrollable All-Slabs Mini-Thumbnails Strip (Right) */}
                    <div className="flex flex-col lg:flex-row gap-3 items-start rounded-lg border border-slate-800 bg-slate-900/60 p-2 sm:p-3">
                      <div
                        className={`flex-1 min-w-0 w-full ${
                          activeCategoryPreset === 'bookmatch_wall' &&
                          fourSlabBookmatchMode &&
                          viewAllSlabs
                            ? 'grid grid-cols-1 xl:grid-cols-2 gap-4'
                            : 'space-y-6'
                        }`}
                      >
                      {slabsToRender.map((slab) => {
                        const vis = getSlabVisualConfig(slab.slabIndex);
                        const padLeft = 48;
                        const padTop = 38;
                        const padRight = 28;
                        const padBottom = 32;
                        const diag1HeightScale =
                          cadWorkspace.screens?.diagram_1?.heightScale || 'lg';
                        const baseTargetW =
                          diag1HeightScale === 'sm'
                            ? 760
                            : diag1HeightScale === 'md'
                            ? 960
                            : diag1HeightScale === 'xl'
                            ? 1420
                            : 1160;
                        const baseTargetH =
                          diag1HeightScale === 'sm'
                            ? 440
                            : diag1HeightScale === 'md'
                            ? 560
                            : diag1HeightScale === 'xl'
                            ? 820
                            : 660;
                        const targetCanvasW = Math.max(baseTargetW, 1380);
                        const targetCanvasH = Math.max(baseTargetH, 780);
                        const baseScale = Math.min(
                          targetCanvasW / slab.slabLength,
                          targetCanvasH / slab.slabWidth
                        );
                        const scale = baseScale * zoom;
                        const drawW = slab.slabLength * scale;
                        const drawH = slab.slabWidth * scale;
                        const svgW = drawW + padLeft + padRight;
                        const svgH = drawH + padTop + padBottom;

                        const flipX =
                          vis.mirrorMode === 'flip_h' || vis.mirrorMode === 'flip_both';
                        const flipY =
                          vis.mirrorMode === 'flip_v' || vis.mirrorMode === 'flip_both';

                        return (
                          <div
                            key={slab.slabIndex}
                            className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-3"
                          >
                            {/* Per-Slab Header with Individual Upload, Frame Calibration & Mirror Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-sky-300 font-mono font-bold text-xs">
                                  SLAB #{slab.slabIndex}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {vis.sourceLabel}
                                </span>
                                <span className="text-xs font-mono text-amber-300 font-semibold">
                                  (W:{formatNum(slab.slabWidth)} × L:{formatNum(slab.slabLength)} {unit})
                                </span>
                                <span className="text-xs font-mono text-emerald-400">
                                  · Yield: {slab.yieldPercent.toFixed(1)}% ({slab.usedAreaSqFt.toFixed(1)} ft²)
                                </span>
                                <span className="text-xs font-mono text-sky-300">
                                  · {tr('Saw Cut:', 'کٹنگ:')} {(slab.cuts.reduce((s, c) => s + (unit === 'in' ? c.length : unit === 'ft' ? c.length * 12 : c.length / 2.54), 0) / 12).toFixed(1)} R.Ft ({Math.round(slab.cuts.reduce((s, c) => s + (unit === 'in' ? c.length : unit === 'ft' ? c.length * 12 : c.length / 2.54), 0))} in)
                                </span>
                              </div>

                              {/* Per-Slab Quick Action Buttons: Overview, Print, PDF Download, Photo & Frame */}
                              <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSlabOverview(slab.slabIndex)}
                                  className="h-7 px-2.5 rounded border border-amber-500/70 bg-amber-950/70 hover:bg-amber-900 text-amber-200 hover:text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                                  title={`View PDF Blueprint Overview for Slab #${slab.slabIndex}`}
                                >
                                  <Eye className="h-3 w-3 text-amber-400" />
                                  <span>{tr('Overview', 'اوور ویو')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintSlabSheet(slab.slabIndex)}
                                  className="h-7 px-2.5 rounded border border-sky-500/70 bg-sky-950/70 hover:bg-sky-900 text-sky-200 hover:text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                                  title={`Print Slab #${slab.slabIndex} Cutting Sheet`}
                                >
                                  <Printer className="h-3 w-3 text-sky-400" />
                                  <span>{tr('Print', 'پرنٹ')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSlabPdf(slab.slabIndex)}
                                  className="h-7 px-2.5 rounded border border-emerald-500/70 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs"
                                  title={`Download PDF Blueprint for Slab #${slab.slabIndex}`}
                                >
                                  <Download className="h-3 w-3" />
                                  <span>{tr('PDF', 'پی ڈی ایف')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const lines: string[] = [
                                      '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '1', '0', 'ENDSEC',
                                      '0', 'SECTION', '2', 'ENTITIES',
                                    ];
                                    const pushRect = (x: number, y: number, w: number, h: number, layer: string, col: number) => {
                                      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
                                      for (let i = 0; i < 4; i++) {
                                        lines.push(
                                          '0', 'LINE', '8', layer, '62', String(col),
                                          '10', pts[i][0].toFixed(2), '20', pts[i][1].toFixed(2), '30', '0.0',
                                          '11', pts[i + 1][0].toFixed(2), '21', pts[i + 1][1].toFixed(2), '31', '0.0'
                                        );
                                      }
                                    };
                                    const pushTxt = (x: number, y: number, h: number, txt: string, layer: string, col: number) => {
                                      lines.push(
                                        '0', 'TEXT', '8', layer, '62', String(col),
                                        '10', x.toFixed(2), '20', y.toFixed(2), '30', '0.0',
                                        '40', h.toFixed(2), '1', txt.replace(/[^\x20-\x7E]/g, '')
                                      );
                                    };
                                    pushRect(0, 0, slab.slabLength, slab.slabWidth, 'SLAB_OUTLINE', 7);
                                    pushTxt(2, slab.slabWidth + 3, 2.5, `SLAB #${slab.slabIndex} (${slab.slabWidth}x${slab.slabLength} ${unit})`, 'TEXT', 7);
                                    slab.placedPieces.forEach((p) => {
                                      pushRect(p.x, p.y, p.width, p.height, 'USED_PIECES', 3);
                                      pushTxt(p.x + 2, p.y + p.height / 2, 2.0, `${p.pieceCode}: ${p.height}x${p.width}`, 'TEXT', 7);
                                    });
                                    slab.freeRects.forEach((o, oi) => {
                                      pushRect(o.x, o.y, o.width, o.height, 'WASTE_OFFCUTS', 1);
                                      pushTxt(o.x + 1.5, o.y + o.height / 2, 1.8, `W${oi + 1}: ${o.height}x${o.width}`, 'WASTE_TEXT', 1);
                                    });
                                    lines.push('0', 'ENDSEC', '0', 'EOF');
                                    const blob = new Blob([lines.join('\n')], { type: 'application/acad' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Slab_${slab.slabIndex}_${slab.slabWidth}x${slab.slabLength}_AutoCAD_2D.dwg`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                                  }}
                                  className="h-7 px-2.5 rounded border border-amber-400 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1 whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
                                  title="Download 2D AutoCAD .DWG File"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>📐 .DWG</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerSlabUpload(slab.slabIndex, false)}
                                  className={cadBtnSubtle}
                                  title={`Upload custom HD photo specifically for Slab #${slab.slabIndex}`}
                                >
                                  <Upload className="h-3 w-3 text-sky-400" />
                                  <span>{tr('Upload Photo', 'تصویر لگائیں')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openFrameCalibrator(slab.slabIndex)}
                                  className={cadBtnSubtle}
                                >
                                  <Crop className="h-3 w-3 text-sky-400" />
                                  <span>{tr('Frame', 'فریم سیٹنگ')}</span>
                                </button>

                                {/* Easy Per-Slab Stock Switcher (اس سلیب کو کسی دوسرے اسٹاک سے بدلیں) */}
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignStockToSingleSlab(slab.slabIndex, e.target.value);
                                    }
                                  }}
                                  className="h-7 rounded border border-emerald-500/50 bg-slate-950 text-emerald-300 text-[10px] font-mono px-1.5 cursor-pointer"
                                  title="Change this individual slab to a different saved stock lot"
                                >
                                  <option value="">
                                    {tr('🔄 Change Slab Stock...', '🔄 یہ سلیب دوسرے اسٹاک سے بدلیں...')}
                                  </option>
                                  {savedStockList.map((st) => (
                                    <option key={st.id} value={st.id}>
                                      {`${st.materialName} (${st.lotId}) — ${st.width}×${st.length} ${st.unit}`}
                                    </option>
                                  ))}
                                </select>

                                {/* Individual Slab Mirror Selector */}
                                <div className="flex items-center rounded border border-slate-700 bg-slate-950 p-0.5 text-[10px]">
                                  {(
                                    [
                                      { id: 'none', label: 'Normal' },
                                      { id: 'flip_h', label: '↔ Mirror H' },
                                      { id: 'flip_v', label: '↕ Mirror V' },
                                      { id: 'flip_both', label: '180° Both' },
                                    ] as const
                                  ).map((m) => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSetSlabMirror(slab.slabIndex, m.id)}
                                      className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                                        vis.mirrorMode === m.id
                                          ? 'bg-sky-600 text-white'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {m.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* FULL-WIDTH LARGE HD MARBLE SLAB VIEWPORT */}
                            <div className="space-y-3">
                              <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-2 flex justify-center">
                                <svg
                                  width={svgW}
                                  height={svgH}
                                  viewBox={`0 0 ${svgW} ${svgH}`}
                                  onClick={(e) => {
                                    if (canvasToolMode !== 'mark_crack') return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const scaleX = svgW / Math.max(1, rect.width);
                                    const scaleY = svgH / Math.max(1, rect.height);
                                    const clickSvgX = (e.clientX - rect.left) * scaleX;
                                    const clickSvgY = (e.clientY - rect.top) * scaleY;
                                    const slabInchX = (clickSvgX - padLeft) / scale;
                                    const slabInchY = (clickSvgY - padTop) / scale;
                                    if (
                                      slabInchX >= 0 &&
                                      slabInchX <= slab.slabLength &&
                                      slabInchY >= 0 &&
                                      slabInchY <= slab.slabWidth
                                    ) {
                                      const crackW = Math.min(10, slab.slabLength * 0.12);
                                      const crackH = Math.min(8, slab.slabWidth * 0.12);
                                      const newDefect: SlabDefectZone = {
                                        id: `def-${Date.now()}`,
                                        label: `Crack / Damage`,
                                        x: Math.max(0, Math.min(slab.slabLength - crackW, slabInchX - crackW / 2)),
                                        y: Math.max(0, Math.min(slab.slabWidth - crackH, slabInchY - crackH / 2)),
                                        width: crackW,
                                        height: crackH,
                                      };
                                      setSlabOverrides((prev) => {
                                        const existing = prev[slab.slabIndex] || {
                                          slabNumber: slab.slabIndex,
                                          frameScale: 100,
                                          frameOffsetX: 0,
                                          frameOffsetY: 0,
                                          frameRotation: 0,
                                          mirrorMode: slab.slabIndex % 2 === 0 ? 'flip_h' : 'none',
                                          defects: [],
                                        };
                                        return {
                                          ...prev,
                                          [slab.slabIndex]: {
                                            ...existing,
                                            defects: [...existing.defects, newDefect],
                                          },
                                        };
                                      });
                                      setCanvasToolMode('select_move');
                                    }
                                  }}
                                  className={`max-w-full h-auto select-none ${
                                    canvasToolMode === 'mark_crack'
                                      ? 'cursor-crosshair'
                                      : draggingPiece
                                      ? 'cursor-grabbing'
                                      : 'cursor-default'
                                  }`}
                                >
                                  <defs>
                                    <clipPath id={`slab-clip-${slab.slabIndex}`}>
                                      <rect
                                        x={padLeft}
                                        y={padTop}
                                        width={drawW}
                                        height={drawH}
                                      />
                                    </clipPath>
                                    {/* Ultra-HD Marble Texture Sharpness & Natural Contrast Filter */}
                                    <filter id={`hd-stone-polish-${slab.slabIndex}`}>
                                      <feComponentTransfer>
                                        <feFuncR type="linear" slope="1.06" intercept="-0.02" />
                                        <feFuncG type="linear" slope="1.06" intercept="-0.02" />
                                        <feFuncB type="linear" slope="1.06" intercept="-0.02" />
                                      </feComponentTransfer>
                                    </filter>
                                    <pattern
                                      id={`offcut-hatch-${slab.slabIndex}`}
                                      width="14"
                                      height="14"
                                      patternTransform="rotate(45 0 0)"
                                      patternUnits="userSpaceOnUse"
                                    >
                                      <line
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="14"
                                        stroke="#38BDF8"
                                        strokeWidth="1.5"
                                        strokeOpacity="0.28"
                                      />
                                    </pattern>
                                    <pattern
                                      id={`trim-hatch-${slab.slabIndex}`}
                                      width="10"
                                      height="10"
                                      patternTransform="rotate(-45 0 0)"
                                      patternUnits="userSpaceOnUse"
                                    >
                                      <line
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="10"
                                        stroke="#F43F5E"
                                        strokeWidth="1.8"
                                        strokeOpacity="0.48"
                                      />
                                    </pattern>
                                  </defs>

                                  {/* Top CAD Ruler */}
                                  <text
                                    x={padLeft + drawW / 2}
                                    y={padTop - 12}
                                    textAnchor="middle"
                                    fill="#E2E8F0"
                                    fontSize="11.5"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                  >
                                    Slab #{slab.slabIndex} Gross: {formatNum(slab.slabLength)}&quot;×{formatNum(slab.slabWidth)}&quot; → Net: {formatNum(slab.usableLength)}&quot;×{formatNum(slab.usableWidth)}&quot; | Trim: {formatNum(slab.edgeTrim)}&quot; | Kerf: {formatNum(slab.kerf)}&quot;
                                  </text>

                                  {/* Left CAD Ruler */}
                                  <text
                                    x={padLeft - 16}
                                    y={padTop + drawH / 2}
                                    textAnchor="middle"
                                    fill="#E2E8F0"
                                    fontSize="12"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    transform={`rotate(-90, ${padLeft - 16}, ${padTop + drawH / 2})`}
                                  >
                                    Width: {formatNum(slab.slabWidth)} {unit}
                                  </text>

                                  {/* Raw Slab Base */}
                                  <rect
                                    x={padLeft}
                                    y={padTop}
                                    width={drawW}
                                    height={drawH}
                                    fill="#0F172A"
                                    stroke="#94A3B8"
                                    strokeWidth="2"
                                  />

                                  {/* Calibrated & Framed Ultra-HD Slab Photo Inside Slab Boundary */}
                                  {vis.imageUrl && (
                                    <g clipPath={`url(#slab-clip-${slab.slabIndex})`}>
                                      <g
                                        transform={`translate(${
                                          padLeft + drawW / 2 + (vis.frameOffsetX / 100) * drawW
                                        }, ${
                                          padTop + drawH / 2 + (vis.frameOffsetY / 100) * drawH
                                        }) rotate(${vis.frameRotation}) scale(${
                                          (flipX ? -1 : 1) * (vis.frameScale / 100)
                                        }, ${(flipY ? -1 : 1) * (vis.frameScale / 100)})`}
                                      >
                                        <image
                                          href={vis.imageUrl}
                                          x={-drawW / 2}
                                          y={-drawH / 2}
                                          width={drawW}
                                          height={drawH}
                                          preserveAspectRatio="none"
                                          opacity="1"
                                          filter={
                                            hdContrastBoost
                                              ? `url(#hd-stone-polish-${slab.slabIndex})`
                                              : undefined
                                          }
                                        />
                                      </g>
                                    </g>
                                  )}

                                  {/* 4-Sided Edge Trim (Safai Margin) Hatched Perimeter Zone */}
                                  {slab.edgeTrim > 0 && (
                                    <g pointerEvents="none">
                                      {/* Top Trim Strip */}
                                      <rect
                                        x={padLeft}
                                        y={padTop}
                                        width={drawW}
                                        height={Math.max(3, slab.usableY * scale)}
                                        fill={`url(#trim-hatch-${slab.slabIndex})`}
                                      />
                                      {/* Bottom Trim Strip */}
                                      <rect
                                        x={padLeft}
                                        y={padTop + (slab.usableY + slab.usableWidth) * scale}
                                        width={drawW}
                                        height={Math.max(3, (slab.slabWidth - slab.usableY - slab.usableWidth) * scale)}
                                        fill={`url(#trim-hatch-${slab.slabIndex})`}
                                      />
                                      {/* Left Trim Strip */}
                                      <rect
                                        x={padLeft}
                                        y={padTop + slab.usableY * scale}
                                        width={Math.max(3, slab.usableX * scale)}
                                        height={slab.usableWidth * scale}
                                        fill={`url(#trim-hatch-${slab.slabIndex})`}
                                      />
                                      {/* Right Trim Strip */}
                                      <rect
                                        x={padLeft + (slab.usableX + slab.usableLength) * scale}
                                        y={padTop + slab.usableY * scale}
                                        width={Math.max(3, (slab.slabLength - slab.usableX - slab.usableLength) * scale)}
                                        height={slab.usableWidth * scale}
                                        fill={`url(#trim-hatch-${slab.slabIndex})`}
                                      />
                                      <rect
                                        x={padLeft + drawW / 2 - 72}
                                        y={padTop + 2}
                                        width="144"
                                        height="13"
                                        rx="3"
                                        fill="rgba(136, 19, 55, 0.92)"
                                        stroke="#FDA4AF"
                                        strokeWidth="0.8"
                                      />
                                      <text
                                        x={padLeft + drawW / 2}
                                        y={padTop + 11.5}
                                        textAnchor="middle"
                                        fill="#FFE4E6"
                                        fontSize="8"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                      >
                                        EDGE TRIM: {formatNum(slab.edgeTrim)} {unit}/side
                                      </text>
                                    </g>
                                  )}

                                  {/* Usable Area Inside Edge Trim */}
                                  <rect
                                    x={padLeft + slab.usableX * scale}
                                    y={padTop + slab.usableY * scale}
                                    width={slab.usableLength * scale}
                                    height={slab.usableWidth * scale}
                                    fill="none"
                                    stroke="#38BDF8"
                                    strokeWidth="1.4"
                                    strokeDasharray="6 3"
                                  />

                                  {/* Crack / Damaged Defect Zones & Freehand Pencil Crack Lines on this Slab */}
                                  {slab.defects.map((def) => {
                                    const dx = padLeft + def.x * scale;
                                    const dy = padTop + def.y * scale;
                                    const dw = def.width * scale;
                                    const dh = def.height * scale;
                                    const hasPencil = def.pencilPath && def.pencilPath.length >= 2;
                                    const strokeCol = def.pencilColor || '#EF4444';
                                    return (
                                      <g key={def.id}>
                                        <rect
                                          x={dx}
                                          y={dy}
                                          width={dw}
                                          height={dh}
                                          fill={hasPencil ? 'rgba(220, 38, 38, 0.22)' : 'rgba(220, 38, 38, 0.50)'}
                                          stroke={strokeCol}
                                          strokeWidth="1.5"
                                          strokeDasharray="4 2"
                                        />
                                        {hasPencil && def.pencilPath && (
                                          <>
                                            <polyline
                                              points={def.pencilPath
                                                .map((pt) => `${padLeft + pt.x * scale},${padTop + pt.y * scale}`)
                                                .join(' ')}
                                              fill="none"
                                              stroke="#000000"
                                              strokeWidth="5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              opacity="0.65"
                                            />
                                            <polyline
                                              points={def.pencilPath
                                                .map((pt) => `${padLeft + pt.x * scale},${padTop + pt.y * scale}`)
                                                .join(' ')}
                                              fill="none"
                                              stroke={strokeCol}
                                              strokeWidth="3"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                            <circle
                                              cx={padLeft + def.pencilPath[0].x * scale}
                                              cy={padTop + def.pencilPath[0].y * scale}
                                              r="4"
                                              fill={strokeCol}
                                              stroke="#FFFFFF"
                                              strokeWidth="1"
                                            />
                                            <circle
                                              cx={
                                                padLeft +
                                                def.pencilPath[def.pencilPath.length - 1].x * scale
                                              }
                                              cy={
                                                padTop +
                                                def.pencilPath[def.pencilPath.length - 1].y * scale
                                              }
                                              r="4"
                                              fill={strokeCol}
                                              stroke="#FFFFFF"
                                              strokeWidth="1"
                                            />
                                          </>
                                        )}
                                        <text
                                          x={dx + dw / 2}
                                          y={dy + dh / 2}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          fill="#FFFFFF"
                                          fontSize="10"
                                          fontWeight="bold"
                                        >
                                          {def.crackLengthUnits
                                            ? `CRACK (${def.crackLengthUnits}${unit})`
                                            : 'CRACK'}
                                        </text>
                                      </g>
                                    );
                                  })}

                                  {/* Free Rectangles: Offcuts vs Scrap (Subtle so HD Marble remains visible) */}
                                  {slab.freeRects.map((fr, fIdx) => {
                                    const rx = padLeft + fr.x * scale;
                                    const ry = padTop + fr.y * scale;
                                    const rw = fr.width * scale;
                                    const rh = fr.height * scale;
                                    return (
                                      <g key={`free-${fIdx}`}>
                                        <rect
                                          x={rx}
                                          y={ry}
                                          width={rw}
                                          height={rh}
                                          fill={
                                            fr.isUsableOffcut
                                              ? `url(#offcut-hatch-${slab.slabIndex})`
                                              : 'rgba(15, 23, 42, 0.26)'
                                          }
                                          stroke={fr.isUsableOffcut ? '#38BDF8' : '#64748B'}
                                          strokeWidth="1"
                                          strokeDasharray="3 3"
                                        />
                                        {showOffcutLabels && rw > 55 && rh > 28 && (
                                          <g>
                                            <rect
                                              x={rx + rw / 2 - 44}
                                              y={ry + rh / 2 - 9}
                                              width="88"
                                              height="18"
                                              rx="3"
                                              fill="rgba(15, 23, 42, 0.82)"
                                            />
                                            <text
                                              x={rx + rw / 2}
                                              y={ry + rh / 2}
                                              textAnchor="middle"
                                              dominantBaseline="middle"
                                              fill={fr.isUsableOffcut ? '#7DD3FC' : '#CBD5E1'}
                                              fontSize="9"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                            >
                                              {fr.isUsableOffcut ? 'OFFCUT ' : 'REM '}
                                              {formatNum(fr.width, 1)}×{formatNum(fr.height, 1)}
                                            </text>
                                          </g>
                                        )}
                                      </g>
                                    );
                                  })}

                                  {/* Placed 2D Cut Pieces with AutoCAD Corner Callout & Direct Mouse Drag */}
                                  {slab.placedPieces.map((piece) => {
                                    const px = padLeft + piece.x * scale;
                                    const py = padTop + piece.y * scale;
                                    const pw = piece.width * scale;
                                    const ph = piece.height * scale;
                                    const isSelected =
                                      activeHighlightedPiece?.instanceId === piece.instanceId;

                                    return (
                                      <g
                                        key={piece.instanceId}
                                        onMouseEnter={() => setHoveredPiece(piece)}
                                        onMouseLeave={() => setHoveredPiece(null)}
                                        onMouseDown={(e) => {
                                          if (canvasToolMode === 'mark_crack') return;
                                          e.stopPropagation();
                                          setSelectedPieceId(piece.instanceId);
                                          setInDiagram1Popup('piece');
                                          const curOffset = manualPieceOffsets[piece.instanceId] || {
                                            dx: 0,
                                            dy: 0,
                                          };
                                          setDraggingPiece({
                                            instanceId: piece.instanceId,
                                            startClientX: e.clientX,
                                            startClientY: e.clientY,
                                            origDx: curOffset.dx,
                                            origDy: curOffset.dy,
                                            scale,
                                          });
                                        }}
                                        className="cursor-grab active:cursor-grabbing"
                                      >
                                        {/* Cut Piece Boundary (Crystal Clear Inside by Default so HD Stone Shines Through) */}
                                        <rect
                                          x={px}
                                          y={py}
                                          width={pw}
                                          height={ph}
                                          fill={
                                            piece.shapeCutType && piece.shapeCutType !== 'rect_90'
                                              ? 'rgba(15, 23, 42, 0.25)'
                                              : piece.color
                                          }
                                          fillOpacity={
                                            piece.shapeCutType && piece.shapeCutType !== 'rect_90'
                                              ? 0.2
                                              : isSelected
                                              ? Math.max(0.22, pieceOverlayOpacity)
                                              : pieceOverlayOpacity
                                          }
                                          stroke={isSelected ? '#38BDF8' : '#FFFFFF'}
                                          strokeWidth={isSelected ? '3' : '1.8'}
                                          strokeDasharray={
                                            piece.shapeCutType && piece.shapeCutType !== 'rect_90'
                                              ? '5 3'
                                              : undefined
                                          }
                                        />

                                        {/* TRUE GEOMETRIC CAD OVERLAY FOR ROUND TABLES, OVALS, PIE SECTORS & DEGREE CUTS */}
                                        {piece.shapeCutType &&
                                          piece.shapeCutType !== 'rect_90' &&
                                          (() => {
                                            const shType = piece.shapeCutType;
                                            const deg = piece.cutDegree || 45;
                                            const cx = px + pw / 2;
                                            const cy = py + ph / 2;
                                            const rx = Math.max(4, pw / 2 - 2);
                                            const ry = Math.max(4, ph / 2 - 2);
                                            const rad =
                                              ((90 - Math.min(82, Math.max(10, deg))) * Math.PI) /
                                              180;
                                            const dxOff = Math.min(
                                              pw * 0.44,
                                              Math.max(6, ph * Math.tan(rad) * 0.5)
                                            );

                                            return (
                                              <g pointerEvents="none">
                                                {(shType === 'round_table' ||
                                                  shType === 'oval_table') && (
                                                  <>
                                                    <ellipse
                                                      cx={cx}
                                                      cy={cy}
                                                      rx={rx}
                                                      ry={ry}
                                                      fill={piece.color}
                                                      fillOpacity={Math.max(
                                                        0.18,
                                                        pieceOverlayOpacity
                                                      )}
                                                      stroke="#FDE047"
                                                      strokeWidth="2.6"
                                                    />
                                                    {/* Center Crosshairs for Round Table */}
                                                    <line
                                                      x1={cx - rx}
                                                      y1={cy}
                                                      x2={cx + rx}
                                                      y2={cy}
                                                      stroke="#38BDF8"
                                                      strokeWidth="1"
                                                      strokeDasharray="4 2"
                                                    />
                                                    <line
                                                      x1={cx}
                                                      y1={cy - ry}
                                                      x2={cx}
                                                      y2={cy + ry}
                                                      stroke="#38BDF8"
                                                      strokeWidth="1"
                                                      strokeDasharray="4 2"
                                                    />
                                                    {/* Optional Lazy Susan Inner Rotating Disc */}
                                                    {piece.lazySusanDiameter &&
                                                      piece.lazySusanDiameter > 0 && (
                                                        <circle
                                                          cx={cx}
                                                          cy={cy}
                                                          r={Math.min(
                                                            rx * 0.75,
                                                            (piece.lazySusanDiameter / 2) * scale
                                                          )}
                                                          fill="none"
                                                          stroke="#F43F5E"
                                                          strokeWidth="2"
                                                          strokeDasharray="5 2"
                                                        />
                                                      )}
                                                  </>
                                                )}

                                                {shType === 'half_round' && (
                                                  <path
                                                    d={`M ${px + 2},${py + ph - 2} L ${px + 2},${
                                                      py + 2 + ry
                                                    } A ${rx},${ry} 0 0,1 ${px + pw - 2},${
                                                      py + 2 + ry
                                                    } L ${px + pw - 2},${py + ph - 2} Z`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.2,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#FDE047"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {shType === 'round_pie_4' && (
                                                  <path
                                                    d={`M ${px + 2},${py + ph - 2} L ${px + 2},${
                                                      py + 2
                                                    } A ${pw - 4},${ph - 4} 0 0,1 ${px + pw - 2},${
                                                      py + ph - 2
                                                    } Z`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.22,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#FDE047"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {shType === 'octagon_45' &&
                                                  (() => {
                                                    const c = Math.min(pw, ph) * 0.28;
                                                    const pts = [
                                                      `${px + c},${py + 2}`,
                                                      `${px + pw - c},${py + 2}`,
                                                      `${px + pw - 2},${py + c}`,
                                                      `${px + pw - 2},${py + ph - c}`,
                                                      `${px + pw - c},${py + ph - 2}`,
                                                      `${px + c},${py + ph - 2}`,
                                                      `${px + 2},${py + ph - c}`,
                                                      `${px + 2},${py + c}`,
                                                    ].join(' ');
                                                    return (
                                                      <polygon
                                                        points={pts}
                                                        fill={piece.color}
                                                        fillOpacity={Math.max(
                                                          0.2,
                                                          pieceOverlayOpacity
                                                        )}
                                                        stroke="#FDE047"
                                                        strokeWidth="2.5"
                                                      />
                                                    );
                                                  })()}

                                                {shType === 'degree_1_side' && (
                                                  <polygon
                                                    points={`${px + 2},${py + 2} ${
                                                      px + pw - dxOff
                                                    },${py + 2} ${px + pw - 2},${py + ph - 2} ${
                                                      px + 2
                                                    },${py + ph - 2}`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.22,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#F43F5E"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {shType === 'degree_2_sides' && (
                                                  <polygon
                                                    points={`${px + dxOff},${py + 2} ${
                                                      px + pw - dxOff
                                                    },${py + 2} ${px + pw - 2},${py + ph - 2} ${
                                                      px + 2
                                                    },${py + ph - 2}`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.22,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#F43F5E"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {shType === 'triangle_winder' && (
                                                  <polygon
                                                    points={`${px + 2},${py + 2} ${px + pw - 2},${
                                                      py + ph - 2
                                                    } ${px + 2},${py + ph - 2}`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.22,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#FDE047"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {shType === 'diamond_rhombus' && (
                                                  <polygon
                                                    points={`${px + dxOff},${py + 2} ${
                                                      px + pw - 2
                                                    },${py + 2} ${px + pw - dxOff},${py + ph - 2} ${
                                                      px + 2
                                                    },${py + ph - 2}`}
                                                    fill={piece.color}
                                                    fillOpacity={Math.max(
                                                      0.22,
                                                      pieceOverlayOpacity
                                                    )}
                                                    stroke="#FDE047"
                                                    strokeWidth="2.5"
                                                  />
                                                )}

                                                {/* Center Shape / Degree Callout Badge on the Slab */}
                                                {pw >= 45 && ph >= 28 && (
                                                  <g>
                                                    <rect
                                                      x={cx - 48}
                                                      y={cy - 10}
                                                      width="96"
                                                      height="20"
                                                      rx="4"
                                                      fill="rgba(2, 6, 23, 0.90)"
                                                      stroke="#FDE047"
                                                      strokeWidth="1.2"
                                                    />
                                                    <text
                                                      x={cx}
                                                      y={cy + 3.5}
                                                      textAnchor="middle"
                                                      fill="#FDE047"
                                                      fontSize="9.5"
                                                      fontFamily="monospace"
                                                      fontWeight="bold"
                                                    >
                                                      {shType === 'round_table'
                                                        ? `⭕ ROUND Ø${formatNum(piece.width)}"`
                                                        : shType === 'oval_table'
                                                        ? `🥚 OVAL ${formatNum(piece.height)}×${formatNum(piece.width)}`
                                                        : shType === 'round_pie_4'
                                                        ? `🍕 90° BM SECTOR`
                                                        : shType === 'octagon_45'
                                                        ? `🛑 OCTAGON 45°`
                                                        : `📐 CUT ∠ ${deg}°`}
                                                    </text>
                                                  </g>
                                                )}
                                              </g>
                                            );
                                          })()}

                                        {/* Inner AutoCAD Technical Hairline */}
                                        {pw > 24 &&
                                          ph > 24 &&
                                          (!piece.shapeCutType ||
                                            piece.shapeCutType === 'rect_90') && (
                                            <rect
                                              x={px + 2}
                                              y={py + 2}
                                              width={pw - 4}
                                              height={ph - 4}
                                              fill="none"
                                              stroke={isSelected ? '#7DD3FC' : 'rgba(15,23,42,0.65)'}
                                              strokeWidth="1"
                                            />
                                          )}

                                        {/* AutoCAD Short-Form Dimension Callout (Larger, crisp, high-contrast, zero clutter) */}
                                        {pw >= 42 && ph >= 22 && (
                                          <g pointerEvents="none">
                                            <rect
                                              x={px + 4}
                                              y={py + 4}
                                              width={Math.min(pw - 8, 165)}
                                              height={ph >= 44 ? 36 : 20}
                                              rx="3"
                                              fill="rgba(2, 6, 23, 0.92)"
                                              stroke={isSelected ? '#F8FAFC' : 'rgba(255, 255, 255, 0.7)'}
                                              strokeWidth="1.2"
                                            />
                                            <text
                                              x={px + 9}
                                              y={py + (ph >= 44 ? 17 : 17)}
                                              fill="#FFFFFF"
                                              fontSize="11.5"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                            >
                                              {`${piece.pieceCode} · ${formatNum(piece.height)}"×${formatNum(piece.width)}"`}
                                            </text>
                                            {ph >= 44 && (
                                              <text
                                                x={px + 9}
                                                y={py + 33}
                                                fill="#FDE047"
                                                fontSize="10.5"
                                                fontFamily="monospace"
                                                fontWeight="bold"
                                              >
                                                {piece.label.slice(0, 16)}
                                              </text>
                                            )}
                                          </g>
                                        )}

                                        {/* Thin Horizontal Strip Callout */}
                                        {pw >= 40 && ph >= 9 && ph < 22 && (
                                          <g pointerEvents="none">
                                            <rect
                                              x={px + 2}
                                              y={py + 1}
                                              width={Math.min(pw - 4, 150)}
                                              height={Math.max(8, ph - 2)}
                                              rx="2"
                                              fill="rgba(2, 6, 23, 0.90)"
                                            />
                                            <text
                                              x={px + 6}
                                              y={py + ph / 2 + 3.5}
                                              fill="#FFFFFF"
                                              fontSize="10"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                            >
                                              {`${piece.pieceCode} · ${formatNum(piece.height)}"×${formatNum(piece.width)}"`}
                                            </text>
                                          </g>
                                        )}

                                        {/* Thin Vertical Side Latak Strip Callout (e.g. 2", 3", 4" Left/Right Side Latak) */}
                                        {pw >= 9 && pw < 42 && ph >= 36 && (
                                          <g pointerEvents="none">
                                            <text
                                              x={px + pw / 2}
                                              y={py + ph / 2}
                                              textAnchor="middle"
                                              dominantBaseline="middle"
                                              transform={`rotate(-90 ${px + pw / 2} ${py + ph / 2})`}
                                              fill="#FDE047"
                                              stroke="#020617"
                                              strokeWidth="2.5"
                                              paintOrder="stroke"
                                              fontSize="8.5"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                            >
                                              {piece.pieceCode} · {formatNum(piece.width)}&quot;×{formatNum(piece.height)}&quot;
                                            </text>
                                          </g>
                                        )}

                                        {/* AutoCAD Bottom/Right Dimension Ticks when enabled */}
                                        {showCadCrosshairs && pw >= 90 && ph >= 60 && (
                                          <g pointerEvents="none">
                                            <text
                                              x={px + pw / 2}
                                              y={py + ph - 6}
                                              textAnchor="middle"
                                              fill="#F8FAFC"
                                              stroke="#020617"
                                              strokeWidth="2.5"
                                              paintOrder="stroke"
                                              fontSize="9.5"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                            >
                                              ↔ {formatNum(piece.width)} {unit}
                                            </text>
                                            <text
                                              x={px + pw - 10}
                                              y={py + ph / 2}
                                              textAnchor="middle"
                                              fill="#F8FAFC"
                                              stroke="#020617"
                                              strokeWidth="2.5"
                                              paintOrder="stroke"
                                              fontSize="9.5"
                                              fontFamily="monospace"
                                              fontWeight="bold"
                                              transform={`rotate(-90, ${px + pw - 10}, ${py + ph / 2})`}
                                            >
                                              ↕ {formatNum(piece.height)} {unit}
                                            </text>
                                          </g>
                                        )}
                                      </g>
                                    );
                                  })}

                                  {/* Saw Kerf Cut Lines + Exact Running Inches & Blade Kerf Callout */}
                                  {showKerfLines &&
                                    slab.cuts
                                      .filter((c) => c.type !== 'edge_trim')
                                      .map((cut) => {
                                        const cx1 = padLeft + cut.x1 * scale;
                                        const cy1 = padTop + cut.y1 * scale;
                                        const cx2 = padLeft + cut.x2 * scale;
                                        const cy2 = padTop + cut.y2 * scale;
                                        const midX = (cx1 + cx2) / 2;
                                        const midY = (cy1 + cy2) / 2;
                                        return (
                                          <g key={`cut-${cut.step}`}>
                                            {/* Blade Kerf Width Glow Ribbon */}
                                            <line
                                              x1={cx1}
                                              y1={cy1}
                                              x2={cx2}
                                              y2={cy2}
                                              stroke="#F43F5E"
                                              strokeOpacity="0.34"
                                              strokeWidth={Math.max(4, slab.kerf * scale * 3.5)}
                                            />
                                            {/* Sharp Saw Cut Centerline */}
                                            <line
                                              x1={cx1}
                                              y1={cy1}
                                              x2={cx2}
                                              y2={cy2}
                                              stroke="#FDA4AF"
                                              strokeWidth={Math.max(1.8, slab.kerf * scale)}
                                              strokeDasharray="6 3"
                                            />
                                            {cut.length * scale >= 45 && (
                                              <g pointerEvents="none">
                                                <rect
                                                  x={midX - 58}
                                                  y={midY - 8}
                                                  width="116"
                                                  height="16"
                                                  rx="3"
                                                  fill="rgba(136, 19, 55, 0.94)"
                                                  stroke="#FDA4AF"
                                                  strokeWidth="0.9"
                                                />
                                                <text
                                                  x={midX}
                                                  y={midY + 3}
                                                  textAnchor="middle"
                                                  fill="#FFE4E6"
                                                  fontSize="8"
                                                  fontFamily="monospace"
                                                  fontWeight="bold"
                                                >
                                                  ✂ #{cut.step} · {formatNum(cut.length, 1)}&quot; · K:{formatNum(slab.kerf)}&quot;
                                                </text>
                                              </g>
                                            )}
                                          </g>
                                        );
                                      })}
                                </svg>
                              </div>

                              {/* Compact Interactive Horizontal Piece Strip under the Slab */}
                              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                                <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
                                  <span>
                                    {tr(
                                      `Slab #${slab.slabIndex} Placed Cut Pieces (Click any piece to edit or drag on slab):`,
                                      `سلیب #${slab.slabIndex} کے کٹے ہوئے ٹکڑے (ٹکڑے پر کلک کر کے ایڈٹ کریں یا سلیب پر ماؤس سے کھینچیں):`
                                    )}
                                  </span>
                                  <span className="font-mono text-sky-400">
                                    {slab.placedPieces.length} Pieces Cut
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                  {slab.placedPieces.map((p) => {
                                    const isSelected =
                                      activeHighlightedPiece?.instanceId === p.instanceId;
                                    return (
                                      <div
                                        key={p.instanceId}
                                        onClick={() =>
                                          setSelectedPieceId((prev) =>
                                            prev === p.instanceId ? null : p.instanceId
                                          )
                                        }
                                        className={`px-2.5 py-1.5 cursor-pointer rounded border flex items-center gap-2 text-[11px] transition-colors ${
                                          isSelected
                                            ? 'bg-sky-950 border-sky-400 text-white'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                                        }`}
                                      >
                                        <span className="font-mono font-bold text-sky-400">
                                          [{p.pieceCode}]
                                        </span>
                                        <span className="font-semibold text-white">{p.label}</span>
                                        <span className="font-mono text-slate-400">
                                          {formatNum(p.width)}×{formatNum(p.height)} {unit}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-sky-300 font-mono text-[10px]">
                                          ➔ R{p.floorRow}-C{p.floorCol}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Dedicated Remaining / Waste Pieces & Offcut Bank inside Slab Cutting Optimizer */}
                              <div className="rounded-lg border border-amber-500/40 bg-slate-950 p-3 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                  <div>
                                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <span>
                                        {tr(
                                          `♻️ Slab #${slab.slabIndex} Remaining / Waste Pieces & Optimizer Offcut Bank`,
                                          `♻️ سلیب #${slab.slabIndex} کے بچے ہوئے ویسٹ پیسز اور آپٹیمائزر بینک (اگلے روم یا فلور کے لیے)`
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                      {tr(
                                        'Save remaining waste pieces into the Optimizer Bank and load them anytime for the next room floor, border, stairs, or skirting.',
                                        'سلیب کٹنے کے بعد بچنے والے پیسز کو بینک میں محفوظ کریں اور نیکسٹ روم، فلور، بارڈر یا سیڑھی میں استعمال کریں۔'
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={handleSaveUsableOffcutsToStock}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] shadow transition-colors"
                                    >
                                      {tr(
                                        '💾 Save Current Slab Waste to Bank',
                                        '💾 بچے ہوئے پیس بینک میں محفوظ کریں'
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handlePrintWorkshopSheet}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow transition-colors"
                                    >
                                      {tr(
                                        '🖨️ PDF Report (Cuts + Waste Schedule)',
                                        '🖨️ پی ڈی ایف رپورٹ (کارآمد + ویسٹ تفصیل)'
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {slab.freeRects.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {slab.freeRects.map((wz, wIdx) => {
                                      const minD = Math.min(wz.width, wz.height);
                                      const maxD = Math.max(wz.width, wz.height);
                                      const nextUseLabel =
                                        minD >= 24 && maxD >= 24
                                          ? tr('Next Room Floor / Large Tile', 'اگلے کمرے کا فرش / بڑی ٹائل')
                                          : minD >= 12 && maxD >= 36
                                          ? tr('Stair Step (Tappa) / Bathroom Floor', 'سیڑھی کا ٹپہ / باتھ روم فلور')
                                          : minD >= 6 && maxD >= 24
                                          ? tr('Outer Room Border / Stair Riser', 'کمرے کا بارڈر / سیڑھی کا رائزر')
                                          : minD >= 4 && maxD >= 18
                                          ? tr('4" Wall Skirting / Contrast Patti', '4 انچ اسکرٹنگ / پٹی')
                                          : tr('Small Mosaic / Threshold', 'چھوٹی پٹی / دہلیز');
                                      return (
                                        <div
                                          key={`free-wz-${wIdx}`}
                                          className="rounded border border-amber-500/30 bg-amber-950/15 p-2 flex flex-col justify-between gap-1.5"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-mono font-bold text-amber-300">
                                              [W{wIdx + 1}] {formatNum(wz.width)}×{formatNum(wz.height)} {unit}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-emerald-300">
                                              {toSqFt(wz.width * wz.height, unit).toFixed(2)} Sq.Ft
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-amber-200 font-semibold">
                                            ➔ {nextUseLabel}
                                          </div>
                                          <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSlabConfig((prev) => ({
                                                  ...prev,
                                                  materialName: `${prev.materialName} (Waste W${wIdx + 1})`,
                                                  width: Number(wz.width.toFixed(1)),
                                                  length: Number(wz.height.toFixed(1)),
                                                  quantity: 1,
                                                  edgeTrim: 0,
                                                }));
                                                toast({
                                                  title: tr(
                                                    'Waste Piece Loaded as Active Slab!',
                                                    'بچا ہوا پیس کٹنگ کے لیے لوڈ ہو گیا!'
                                                  ),
                                                  description: `${formatNum(wz.width)}×{formatNum(wz.height)} ${unit}`,
                                                });
                                              }}
                                              className="flex-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition-colors"
                                            >
                                              {tr('✂️ Cut This Piece Now', '✂️ اسی پیس میں کٹنگ کریں')}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSlabConfig((prev) => ({
                                                  ...prev,
                                                  materialName: `${prev.materialName} (Waste W${wIdx + 1})`,
                                                  width: Number(wz.width.toFixed(1)),
                                                  length: Number(wz.height.toFixed(1)),
                                                  quantity: 1,
                                                  edgeTrim: 0,
                                                }));
                                                setSimpleMainScreen('floor_planner');
                                              }}
                                              className="flex-1 px-2 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold transition-colors"
                                            >
                                              {tr('🏠 Use in Next Room', '🏠 اگلے روم میں لگائیں')}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {savedStockList.filter((s) => s.category === 'usable_offcut').length > 0 && (
                                  <div className="pt-2 border-t border-slate-800">
                                    <div className="text-[11px] font-bold text-emerald-300 mb-1.5">
                                      {tr(
                                        `📦 Saved Remaining / Waste Pieces in Bank (${savedStockList.filter((s) => s.category === 'usable_offcut').length}) — Click to Reuse:`,
                                        `📦 آپٹیمائزر بینک میں محفوظ شدہ بچے ہوئے پیسز (${savedStockList.filter((s) => s.category === 'usable_offcut').length}) — دوبارہ استعمال کریں:`
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {savedStockList
                                        .filter((s) => s.category === 'usable_offcut')
                                        .map((offcut) => (
                                          <div
                                            key={offcut.id}
                                            className="rounded border border-emerald-500/40 bg-emerald-950/20 px-2.5 py-1.5 flex items-center gap-2 text-[11px]"
                                          >
                                            <div>
                                              <span className="font-bold text-white">{offcut.materialName}</span>{' '}
                                              <span className="font-mono font-bold text-amber-300">
                                                ({offcut.width}&quot;×{offcut.length}&quot; × {offcut.quantity})
                                              </span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleLoadStockItemIntoOptimizer(offcut)}
                                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px]"
                                            >
                                              {tr('Load Here', 'یہاں لوڈ کریں')}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleLoadStockItemIntoOptimizer(offcut);
                                                setSimpleMainScreen('floor_planner');
                                              }}
                                              className="px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px]"
                                            >
                                              {tr('Next Room', 'نیکسٹ روم')}
                                            </button>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>

                      {/* COMPACT SIDE STRIP INSIDE DIAGRAM SCREEN: Scrollable Stock Slabs Mini-Thumbnails */}
                      <div className="w-full lg:w-48 shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-2 flex flex-col gap-2 print:hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-[11px] font-mono font-bold text-amber-300 uppercase">
                            {tr(
                              `Stock Slabs (${Math.max(summary.slabs.length, slabConfig.quantity)})`,
                              `اسٹاک سلیب (${Math.max(summary.slabs.length, slabConfig.quantity)})`
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewAllSlabs((v) => !v)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              viewAllSlabs
                                ? 'bg-sky-600 border-sky-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title="Show all slabs stacked or single selected slab"
                          >
                            {viewAllSlabs ? tr('Single', 'ایک سلیب') : tr('Show All', 'سب دکھائیں')}
                          </button>
                        </div>

                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[640px] pr-0.5">
                          {Array.from(
                            { length: Math.max(summary.slabs.length, slabConfig.quantity) },
                            (_, idx) => {
                              const slabNum = idx + 1;
                              const nestedSlab = summary.slabs[idx];
                              const vis = getSlabVisualConfig(slabNum);
                              const isSelected = !viewAllSlabs && activeSlabIndex === idx;
                              const flipH =
                                vis.mirrorMode === 'flip_h' || vis.mirrorMode === 'flip_both';
                              const flipV =
                                vis.mirrorMode === 'flip_v' || vis.mirrorMode === 'flip_both';

                              return (
                                <div
                                  key={slabNum}
                                  onClick={() => {
                                    setViewAllSlabs(false);
                                    if (idx < summary.slabs.length) {
                                      setActiveSlabIndex(idx);
                                    } else {
                                      setActiveSlabIndex(Math.max(0, summary.slabs.length - 1));
                                    }
                                  }}
                                  className={`group cursor-pointer rounded-md border p-1.5 transition-all shrink-0 w-36 lg:w-full ${
                                    isSelected
                                      ? 'border-2 border-sky-400 bg-sky-950/50 shadow-md'
                                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-bold ${
                                        isSelected
                                          ? 'bg-sky-500 text-slate-950'
                                          : 'bg-slate-800 text-sky-300'
                                      }`}
                                    >
                                      SLAB #{slabNum}
                                    </span>
                                    <span className="text-emerald-400 font-bold">
                                      {nestedSlab
                                        ? `${nestedSlab.yieldPercent.toFixed(0)}%`
                                        : tr('Stock', 'اسٹاک')}
                                    </span>
                                  </div>

                                  {/* Mini Visual Slab Image + Cut Pieces Overlay */}
                                  <div className="relative w-full h-20 rounded border border-slate-700 bg-slate-950 overflow-hidden">
                                    {vis.imageUrl && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={vis.imageUrl}
                                        alt={`Slab #${slabNum}`}
                                        referrerPolicy="no-referrer"
                                        style={{
                                          transform: `rotate(${vis.frameRotation || 0}deg) scale(${
                                            flipH ? -1 : 1
                                          }, ${flipV ? -1 : 1})`,
                                        }}
                                        className="w-full h-full object-cover opacity-85"
                                      />
                                    )}
                                    {nestedSlab &&
                                      nestedSlab.placedPieces.map((p) => {
                                        const leftPct =
                                          (p.x / Math.max(1, nestedSlab.slabLength)) * 100;
                                        const topPct =
                                          (p.y / Math.max(1, nestedSlab.slabWidth)) * 100;
                                        const wPct =
                                          (p.width / Math.max(1, nestedSlab.slabLength)) * 100;
                                        const hPct =
                                          (p.height / Math.max(1, nestedSlab.slabWidth)) * 100;
                                        return (
                                          <div
                                            key={p.instanceId}
                                            style={{
                                              left: `${leftPct}%`,
                                              top: `${topPct}%`,
                                              width: `${wPct}%`,
                                              height: `${hPct}%`,
                                              backgroundColor: p.color,
                                            }}
                                            className="absolute border border-white/80 opacity-65"
                                          />
                                        );
                                      })}
                                  </div>

                                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-300">
                                    <span>
                                      {nestedSlab
                                        ? `${nestedSlab.placedPieces.length} ${tr('pcs', 'پیس')}`
                                        : `W:${slabConfig.width}×L:${slabConfig.length}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetSlabMirror(
                                          slabNum,
                                          vis.mirrorMode === 'flip_h' ? 'none' : 'flip_h'
                                        );
                                      }}
                                      className="px-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
                                      title="Flip / Mirror this slab"
                                    >
                                      {vis.mirrorMode !== 'none' ? '↔ M' : '↔'}
                                    </button>
                                  </div>

                                  {/* Per-Slab Overview, Print & PDF Download Mini Buttons */}
                                  <div className="mt-1.5 pt-1 border-t border-slate-800 grid grid-cols-3 gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSlabOverview(slabNum);
                                      }}
                                      className="py-0.5 px-1 rounded bg-amber-950/80 hover:bg-amber-700 border border-amber-500/50 text-amber-200 hover:text-white text-[9px] font-bold flex items-center justify-center gap-0.5"
                                      title={`Overview Slab #${slabNum} in PDF Blueprint`}
                                    >
                                      <Eye className="h-2.5 w-2.5" />
                                      <span>{tr('View', 'نظارہ')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintSlabSheet(slabNum);
                                      }}
                                      className="py-0.5 px-1 rounded bg-sky-950/80 hover:bg-sky-700 border border-sky-500/50 text-sky-200 hover:text-white text-[9px] font-bold flex items-center justify-center gap-0.5"
                                      title={`Print Slab #${slabNum}`}
                                    >
                                      <Printer className="h-2.5 w-2.5" />
                                      <span>{tr('Print', 'پرنٹ')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadSlabPdf(slabNum);
                                      }}
                                      className="py-0.5 px-1 rounded bg-emerald-700 hover:bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center gap-0.5"
                                      title={`Download PDF for Slab #${slabNum}`}
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                    )}
                  </div>
                )}

                {/* =====================================================================
                    DIAGRAM #2: CATEGORY-SPECIFIC LARGE ARCHITECTURAL & INSTALLATION DIAGRAM
                    Automatically switches between:
                    - Vanity Top & Bookmatch Latak Diagram ('vanity')
                    - Kitchen Slab, Island, Stove/Sink & Backsplash Diagram ('kitchen')
                    - Staircase Steps (Tappe), Risers, Landing & Latak Diagram ('stairs')
                    - Window Sill (Khirkee Sill), Wall Ears & Frame Jamb Diagram ('window_sill')
                    - 4-Slab Bookmatch Medallion Floor Diagram ('bookmatch_wall')
                    - Room Flooring & Skirting Border Layout Diagram ('flooring')
                   ===================================================================== */}
                {fullscreenTarget !== 'slab_diagram' && (
                  <div
                    style={{
                      order: cadWorkspace.screens?.diagram_2?.order ?? 3,
                      width:
                        (cadWorkspace.screens?.diagram_2?.widthPercent ?? 100) <= 50
                          ? 'calc(50% - 0.5rem)'
                          : (cadWorkspace.screens?.diagram_2?.widthPercent ?? 100) <= 75
                          ? '75%'
                          : '100%',
                    }}
                    className="min-w-0 w-full flex-grow rounded-xl border-2 border-sky-500/50 bg-slate-900 overflow-hidden shadow-xl"
                  >
                    <CadWindowHeaderBar
                      screenId="diagram_2"
                      workspace={cadWorkspace}
                      setWorkspace={setCadWorkspace}
                      cadLang={cadLang}
                    />
                    {!(cadWorkspace.screens?.diagram_2?.minimized) && (
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Inside-Diagram #2 Button Bar Slot (When user places Category or CAD Tool buttons INSIDE Diagram #2!) */}
                      {(cadWorkspace.bars.preset_bar?.dock === 'inside_diagram_2' ||
                        cadWorkspace.bars.cad_tools_bar?.dock === 'inside_diagram_2') && (
                        <div className="rounded-lg border-2 border-amber-500/70 bg-slate-950 p-2.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-amber-300 mr-1">
                              {tr('🏠 Inside Diagram #2 Buttons:', '🏠 ڈایاگرام #2 کے اندر بٹن:')}
                            </span>
                            {(
                              [
                                { id: 'flooring', label: tr('🏠 Flooring', '🏠 فرش فلورنگ') },
                                { id: 'bookmatch_wall', label: tr('🦋 Bookmatch', '🦋 بک میچ') },
                                { id: 'stairs', label: tr('🪜 Stairs', '🪜 سیڑھی ٹپے') },
                                { id: 'kitchen', label: tr('🍳 Kitchen', '🍳 کچن سلیب') },
                                { id: 'vanity', label: tr('🚰 Vanity', '🚰 وینٹی') },
                                { id: 'window_sill', label: tr('🪟 Window Sill', '🪟 ونڈو سل') },
                              ] as const
                            ).map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => applyPreset(cat.id)}
                                className={`px-2.5 py-1 rounded text-xs font-bold border ${
                                  activeCategoryPreset === cat.id
                                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateCadBar('preset_bar', { dock: 'top' });
                              handleUpdateCadBar('cad_tools_bar', { dock: 'top' });
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono"
                          >
                            {tr('⬆ Move Outside Top', '⬆ باہر ٹاپ پر لے جائیں')}
                          </button>
                        </div>
                      )}
                    {/* =================================================================
                        DEDICATED LARGE DIAGRAM FOR:
                        1) VANITY TOP ('vanity')
                        2) KITCHEN SLAB ('kitchen')
                        3) STAIR STEPS & RISERS ('stairs')
                        4) WINDOW SILL ('window_sill')
                       ================================================================= */}
                    {(activeCategoryPreset === 'vanity' ||
                      activeCategoryPreset === 'kitchen' ||
                      activeCategoryPreset === 'stairs' ||
                      activeCategoryPreset === 'window_sill') &&
                      (() => {
                        const slabVis1 = getSlabVisualConfig(1);
                        const primaryPart: CutPartInput = parts[0] || {
                          id: 'default-p',
                          label: 'Main Piece',
                          width: 24,
                          length: 60,
                          quantity: 1,
                          allowRotation: false,
                          priority: 'high',
                          color: PART_PALETTE[0],
                          latakMode: 'bookmatch',
                          latakSides: 'front_only',
                          latakWidth: 3,
                          latakSize: 3,
                          latakFront: true,
                          latakLeft: false,
                          latakRight: false,
                          latakBack: false,
                          splashSize: 4,
                          splashBack: true,
                          splashLeft: false,
                          splashRight: false,
                        };
                        const resolvedPrimary = resolvePartLatakAndSplash(primaryPart);
                        const pWid = Number(primaryPart.width) || 24;
                        const pLen = Number(primaryPart.length) || 60;
                        const pLatakW = resolvedPrimary.latakW || 3;
                        const pHasFrontLatak = resolvedPrimary.hasFront;
                        const pHasLeftLatak = resolvedPrimary.hasLeft;
                        const pHasRightLatak = resolvedPrimary.hasRight;
                        const pHasBackLatak = resolvedPrimary.hasBack;
                        const pSplashH = Number(primaryPart.splashSize) || (activeCategoryPreset === 'kitchen' ? 6 : 4);
                        const pHasBackSplash =
                          primaryPart.splashBack !== undefined ? !!primaryPart.splashBack : true;
                        const pHasLeftSplash = !!primaryPart.splashLeft;
                        const pHasRightSplash = !!primaryPart.splashRight;
                        const pLatakMode = primaryPart.latakMode || 'bookmatch';

                        const togglePrimaryLatakSide = (
                          field: 'latakFront' | 'latakLeft' | 'latakRight' | 'latakBack',
                          nextVal: boolean
                        ) => {
                          setParts((prev) =>
                            prev.map((x, idx) => {
                              if (idx !== 0) return x;
                              const cur = resolvePartLatakAndSplash(x);
                              const nf = field === 'latakFront' ? nextVal : cur.hasFront;
                              const nl = field === 'latakLeft' ? nextVal : cur.hasLeft;
                              const nr = field === 'latakRight' ? nextVal : cur.hasRight;
                              const nb = field === 'latakBack' ? nextVal : cur.hasBack;
                              const anyOn = nf || nl || nr || nb;
                              return {
                                ...x,
                                latakFront: nf,
                                latakLeft: nl,
                                latakRight: nr,
                                latakBack: nb,
                                latakSize: anyOn ? x.latakSize || x.latakWidth || 3 : x.latakSize,
                                latakWidth: anyOn ? x.latakWidth || x.latakSize || 3 : x.latakWidth,
                                latakSides: anyOn ? 'front_only' : 'none',
                              };
                            })
                          );
                        };

                        const togglePrimarySplashSide = (
                          field: 'splashBack' | 'splashLeft' | 'splashRight',
                          nextVal: boolean
                        ) => {
                          setParts((prev) =>
                            prev.map((x, idx) => {
                              if (idx !== 0) return x;
                              const nb =
                                field === 'splashBack'
                                  ? nextVal
                                  : x.splashBack !== undefined
                                  ? !!x.splashBack
                                  : true;
                              const nl = field === 'splashLeft' ? nextVal : !!x.splashLeft;
                              const nr = field === 'splashRight' ? nextVal : !!x.splashRight;
                              return {
                                ...x,
                                splashBack: nb,
                                splashLeft: nl,
                                splashRight: nr,
                                splashSize: x.splashSize || (activeCategoryPreset === 'kitchen' ? 6 : 4),
                              };
                            })
                          );
                        };

                        return (
                          <div className="rounded-xl border-2 border-amber-500/60 bg-slate-950 p-4 space-y-4 shadow-lg">
                            {/* Category Header & Quick Size/Latak/Splash Controls */}
                            <div className="flex flex-col gap-3 border-b border-slate-800 pb-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[11px] font-extrabold uppercase">
                                    {activeCategoryPreset === 'vanity' &&
                                      tr('🚰 DEDICATED VANITY TOP, LATAK & SPLASH DIAGRAM', '🚰 وینٹی ٹاپ، لٹک (فرنٹ، لیفٹ، رائٹ، بیک) اور سلیش (بیک، لیفٹ، رائٹ) ڈایاگرام')}
                                    {activeCategoryPreset === 'kitchen' &&
                                      tr('🍳 DEDICATED KITCHEN SLAB, LATAK & BACKSPLASH DIAGRAM', '🍳 کچن سلیب، لٹک (فرنٹ، لیفٹ، رائٹ، بیک) اور بیک سلیش (بیک، لیفٹ، رائٹ) ڈایاگرام')}
                                    {activeCategoryPreset === 'stairs' &&
                                      tr('🪜 ROPE-LIGHT BOOKMATCH STAIRS (STEP + LATAK + RISER) & SLAB WASTE DIAGRAM', '🪜 روپ لائٹ بک میچ سیڑھی (سٹیپ + لٹک + رائزر) اور سلیب کٹنگ و ویسٹ کا مکمل ڈایاگرام')}
                                    {activeCategoryPreset === 'window_sill' &&
                                      tr('🪟 DEDICATED WINDOW SILL (KHIRKEE SILL) & FRAME DIAGRAM', '🪟 ونڈو سل (کھڑکی سل)، کانہ اور سائیڈ فریم کا بڑا واضح ڈایاگرام')}
                                  </span>
                                  <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                                    {activeCategoryPreset === 'vanity' &&
                                      tr(
                                        `Vanity Top (${pWid}" × ${pLen}") — Latak (${pLatakW}") & Splash (${pSplashH}")`,
                                        `وینٹی ٹاپ (${pWid}" چوڑائی × ${pLen}" لمبائی) — لٹک (${pLatakW}") اور بیک سلیش (${pSplashH}")`
                                      )}
                                    {activeCategoryPreset === 'kitchen' &&
                                      tr(
                                        `Kitchen Counter Slab (${pWid}" × ${pLen}") — Latak (${pLatakW}") & Splash (${pSplashH}")`,
                                        `مین کچن سلیب (${pWid}" چوڑائی × ${pLen}" لمبائی) — لٹک (${pLatakW}") اور بیک سلیش (${pSplashH}")`
                                      )}
                                    {activeCategoryPreset === 'stairs' &&
                                      tr(
                                        `Rope-Light Bookmatched Staircase: ${stairStepsCount} Steps (Step ${stairTreadDepth}"×${stairStepLength}" + Latak ${stairLatakHeight}" + Riser ${stairRiserHeight}")`,
                                        `روپ لائٹ بک میچ سیڑھی: کل ${stairStepsCount} سٹیپس (سٹیپ ${stairTreadDepth}"×${stairStepLength}" + لٹک ${stairLatakHeight}" + رائزر ${stairRiserHeight}")`
                                      )}
                                    {activeCategoryPreset === 'window_sill' &&
                                      tr(
                                        `Window Sill (${pWid}" × ${pLen}") + Left/Right Wall Ears (Kana) & ${pLatakW}" Front Latak`,
                                        `ونڈو سل / کھڑکی سل (${pWid}" چوڑائی × ${pLen}" لمبائی) مع بائیں دائیں کانہ اور ${pLatakW}" فرنٹ لٹک`
                                      )}
                                  </h3>
                                </div>

                                {/* Primary Piece Width & Length Inputs (for Vanity, Kitchen, Window Sill) */}
                                {activeCategoryPreset !== 'stairs' && (
                                  <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-bold text-amber-300">
                                        {tr('1.Width:', '1.چوڑائی:')}
                                      </span>
                                      <Input
                                        type="number"
                                        value={pWid}
                                        onChange={(e) =>
                                          handleUpdatePart(
                                            primaryPart.id,
                                            'width',
                                            Math.max(4, Number(e.target.value) || 12)
                                          )
                                        }
                                        className="h-7 w-16 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold px-1.5"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-bold text-sky-300">
                                        {tr('2.Length:', '2.لمبائی:')}
                                      </span>
                                      <Input
                                        type="number"
                                        value={pLen}
                                        onChange={(e) =>
                                          handleUpdatePart(
                                            primaryPart.id,
                                            'length',
                                            Math.max(12, Number(e.target.value) || 48)
                                          )
                                        }
                                        className="h-7 w-16 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold px-1.5"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* DEDICATED LATAK (1.FRONT -> 2.LEFT -> 3.RIGHT -> 4.BACK) & SPLASH (1.BACK -> 2.LEFT -> 3.RIGHT) BUTTON BARS FOR KITCHEN, VANITY & WINDOW SILL */}
                              {activeCategoryPreset !== 'stairs' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                  {/* Box 1: LATAK (لیٹر / لٹک) Order: 1. Front -> 2. Left -> 3. Right -> 4. Back */}
                                  <div className="rounded-lg bg-slate-900/95 border border-amber-500/40 p-2.5 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="text-xs font-extrabold text-amber-300">
                                        {tr(
                                          '1️⃣ Latak / Apron Order (1.Front → 2.Left → 3.Right → 4.Back):',
                                          '1️⃣ لٹک / لیٹر کی ترتیب (1.فرنٹ ← 2.لیفٹ ← 3.رائٹ ← 4.بیک):'
                                        )}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {[1.5, 2, 3, 4].map((lw) => (
                                          <button
                                            key={lw}
                                            type="button"
                                            onClick={() =>
                                              setParts((prev) =>
                                                prev.map((x, idx) =>
                                                  idx === 0
                                                    ? {
                                                        ...x,
                                                        latakSize: lw,
                                                        latakWidth: lw,
                                                      }
                                                    : x
                                                )
                                              )
                                            }
                                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                              pLatakW === lw
                                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                                : 'bg-slate-950 border-slate-700 text-slate-300'
                                            }`}
                                          >
                                            {lw}&quot;
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimaryLatakSide('latakFront', !pHasFrontLatak)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasFrontLatak
                                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('1. Front Side', '1. فرنٹ سائیڈ')}</span>
                                        <span>{pHasFrontLatak ? '✓' : '○'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimaryLatakSide('latakLeft', !pHasLeftLatak)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasLeftLatak
                                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('2. Left Side', '2. لیفٹ سائیڈ')}</span>
                                        <span>{pHasLeftLatak ? '✓' : '○'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimaryLatakSide('latakRight', !pHasRightLatak)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasRightLatak
                                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('3. Right Side', '3. رائٹ سائیڈ')}</span>
                                        <span>{pHasRightLatak ? '✓' : '○'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimaryLatakSide('latakBack', !pHasBackLatak)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasBackLatak
                                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('4. Back Side', '4. بیک سائیڈ')}</span>
                                        <span>{pHasBackLatak ? '✓' : '○'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Box 2: SPLASH / BACKSPLASH (سلیش / بیک سپلیش) Order: 1. Back -> 2. Left -> 3. Right (No Front Splash) */}
                                  <div className="rounded-lg bg-slate-900/95 border border-sky-500/40 p-2.5 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="text-xs font-extrabold text-sky-300">
                                        {tr(
                                          '2️⃣ Splash / Backsplash (1.Back → 2.Left → 3.Right — No Front):',
                                          '2️⃣ سلیش / بیک سپلیش (1.بیک ← 2.لیفٹ ← 3.رائٹ — فرنٹ سلیش نہیں ہوتی):'
                                        )}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {[4, 6, 8].map((sh) => (
                                          <button
                                            key={sh}
                                            type="button"
                                            onClick={() =>
                                              setParts((prev) =>
                                                prev.map((x, idx) =>
                                                  idx === 0 ? { ...x, splashSize: sh } : x
                                                )
                                              )
                                            }
                                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                              pSplashH === sh
                                                ? 'bg-sky-600 border-sky-400 text-white'
                                                : 'bg-slate-950 border-slate-700 text-slate-300'
                                            }`}
                                          >
                                            {sh}&quot;
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimarySplashSide('splashBack', !pHasBackSplash)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasBackSplash
                                            ? 'bg-sky-500 border-sky-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('1. Back Splash', '1. بیک سائیڈ سلیش')}</span>
                                        <span>{pHasBackSplash ? '✓' : '○'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimarySplashSide('splashLeft', !pHasLeftSplash)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasLeftSplash
                                            ? 'bg-sky-500 border-sky-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('2. Left Splash', '2. لیفٹ سائیڈ سلیش')}</span>
                                        <span>{pHasLeftSplash ? '✓' : '○'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePrimarySplashSide('splashRight', !pHasRightSplash)
                                        }
                                        className={`px-2.5 py-1.5 rounded border text-xs font-extrabold flex items-center justify-between ${
                                          pHasRightSplash
                                            ? 'bg-sky-500 border-sky-300 text-slate-950 shadow'
                                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        <span>{tr('3. Right Splash', '3. رائٹ سائیڈ سلیش')}</span>
                                        <span>{pHasRightSplash ? '✓' : '○'}</span>
                                      </button>
                                      <div className="px-2 py-1.5 rounded border border-slate-800 bg-slate-950/60 text-slate-500 text-[10px] font-bold flex items-center justify-center text-center">
                                        {tr('🚫 No Front Splash', '🚫 فرنٹ سلیش نہیں ہوتی')}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* LARGE CRYSTAL-CLEAR ARCHITECTURAL SVG DIAGRAM FOR THE ACTIVE CATEGORY */}
                            <div className="w-full overflow-x-auto rounded-xl border-2 border-slate-800 bg-slate-900/90 p-3 flex justify-center">
                              {activeCategoryPreset === 'vanity' && (
                                <svg
                                  viewBox="0 0 980 480"
                                  className="w-full max-w-5xl h-auto select-none"
                                >
                                  <defs>
                                    <pattern
                                      id="vanity-stone-tex"
                                      patternUnits="userSpaceOnUse"
                                      width="980"
                                      height="480"
                                    >
                                      <image
                                        href={slabVis1.imageUrl}
                                        x="0"
                                        y="0"
                                        width="980"
                                        height="480"
                                        preserveAspectRatio="xMidYMid slice"
                                      />
                                    </pattern>
                                  </defs>

                                  <rect x="0" y="0" width="980" height="480" rx="12" fill="#020617" />

                                  {/* SPLASH #1: BACK SIDE SPLASH (1. بیک سائیڈ سلیش) */}
                                  {pHasBackSplash && (
                                    <g>
                                      <rect
                                        x="170"
                                        y="18"
                                        width="640"
                                        height="38"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="260" y="23" width="460" height="28" rx="4" fill="rgba(2,6,23,0.86)" />
                                      <text x="490" y="42" textAnchor="middle" fill="#7DD3FC" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                        {tr(
                                          `1. BACK SIDE SPLASH: ${pSplashH}" × ${pLen}"`,
                                          `1. بیک سائیڈ سلیش: ${pSplashH}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}

                                  {/* SPLASH #2: LEFT SIDE SPLASH (2. لیفٹ سائیڈ سلیش) */}
                                  {pHasLeftSplash && (
                                    <g>
                                      <rect
                                        x="36"
                                        y="108"
                                        width="42"
                                        height="240"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="41" y="135" width="32" height="186" rx="4" fill="rgba(2,6,23,0.86)" />
                                      <text
                                        x="57"
                                        y="228"
                                        textAnchor="middle"
                                        fill="#7DD3FC"
                                        fontSize="11.5"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(-90 57 228)"
                                      >
                                        2. LEFT SPLASH ({pSplashH}&quot; × {pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* SPLASH #3: RIGHT SIDE SPLASH (3. رائٹ سائیڈ سلیش) */}
                                  {pHasRightSplash && (
                                    <g>
                                      <rect
                                        x="902"
                                        y="108"
                                        width="42"
                                        height="240"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="907" y="135" width="32" height="186" rx="4" fill="rgba(2,6,23,0.86)" />
                                      <text
                                        x="923"
                                        y="228"
                                        textAnchor="middle"
                                        fill="#7DD3FC"
                                        fontSize="11.5"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(90 923 228)"
                                      >
                                        3. RIGHT SPLASH ({pSplashH}&quot; × {pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #4: BACK SIDE LATAK (4. بیک سائیڈ لٹک) */}
                                  {pHasBackLatak && (
                                    <g>
                                      <rect
                                        x="170"
                                        y="62"
                                        width="640"
                                        height="38"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="280" y="67" width="420" height="28" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text x="490" y="85" textAnchor="middle" fill="#FDE047" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                                        {tr(
                                          `4. BACK SIDE LATAK: ${pLatakW}" × ${pLen}"`,
                                          `4. بیک سائیڈ لٹک: ${pLatakW}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #2: LEFT SIDE LATAK (2. لیفٹ سائیڈ لٹک) */}
                                  {pHasLeftLatak && (
                                    <g>
                                      <rect
                                        x="114"
                                        y="108"
                                        width="48"
                                        height="240"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="3"
                                      />
                                      <rect x="120" y="138" width="36" height="180" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="138"
                                        y="228"
                                        textAnchor="middle"
                                        fill="#FDE047"
                                        fontSize="12"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(-90 138 228)"
                                      >
                                        2. LEFT LATAK ({pLatakW}&quot; × {pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #3: RIGHT SIDE LATAK (3. رائٹ سائیڈ لٹک) */}
                                  {pHasRightLatak && (
                                    <g>
                                      <rect
                                        x="818"
                                        y="108"
                                        width="48"
                                        height="240"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="3"
                                      />
                                      <rect x="824" y="138" width="36" height="180" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="842"
                                        y="228"
                                        textAnchor="middle"
                                        fill="#FDE047"
                                        fontSize="12"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(90 842 228)"
                                      >
                                        3. RIGHT LATAK ({pLatakW}&quot; × {pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* MAIN VANITY COUNTERTOP SLAB */}
                                  <rect
                                    x="170"
                                    y="108"
                                    width="640"
                                    height="240"
                                    fill="url(#vanity-stone-tex)"
                                    stroke="#FFFFFF"
                                    strokeWidth="3"
                                  />

                                  {/* Faucet Holes & Oval Basin Cutout(s) */}
                                  {pLen >= 54 ? (
                                    <>
                                      <circle cx="330" cy="136" r="8" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
                                      <ellipse
                                        cx="330"
                                        cy="226"
                                        rx="92"
                                        ry="66"
                                        fill="#020617"
                                        stroke="#38BDF8"
                                        strokeWidth="3"
                                        strokeDasharray="8 4"
                                      />
                                      <text x="330" y="222" textAnchor="middle" fill="#38BDF8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                        BASIN CUTOUT #1
                                      </text>
                                      <text x="330" y="240" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontFamily="monospace">
                                        {tr('18" × 14" (Basin Cutout)', '18" × 14" (بیسن کٹ آؤٹ)')}
                                      </text>

                                      <circle cx="650" cy="136" r="8" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
                                      <ellipse
                                        cx="650"
                                        cy="226"
                                        rx="92"
                                        ry="66"
                                        fill="#020617"
                                        stroke="#38BDF8"
                                        strokeWidth="3"
                                        strokeDasharray="8 4"
                                      />
                                      <text x="650" y="222" textAnchor="middle" fill="#38BDF8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                        BASIN CUTOUT #2
                                      </text>
                                      <text x="650" y="240" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontFamily="monospace">
                                        {tr('18" × 14" (Basin Cutout)', '18" × 14" (بیسن کٹ آؤٹ)')}
                                      </text>
                                    </>
                                  ) : (
                                    <>
                                      <circle cx="490" cy="136" r="8" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
                                      <ellipse
                                        cx="490"
                                        cy="226"
                                        rx="110"
                                        ry="70"
                                        fill="#020617"
                                        stroke="#38BDF8"
                                        strokeWidth="3"
                                        strokeDasharray="8 4"
                                      />
                                      <text x="490" y="222" textAnchor="middle" fill="#38BDF8" fontSize="14" fontFamily="monospace" fontWeight="bold">
                                        {tr('OVAL BASIN CUTOUT', 'اوول واش بیسن کٹ آؤٹ')}
                                      </text>
                                      <text x="490" y="242" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontFamily="monospace">
                                        18&quot; × 14&quot; Center Cut
                                      </text>
                                    </>
                                  )}

                                  {/* Main Vanity Dimension Label */}
                                  <rect x="340" y="306" width="300" height="32" rx="6" fill="rgba(2,6,23,0.9)" stroke="#38BDF8" strokeWidth="1.5" />
                                  <text x="490" y="327" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontFamily="monospace" fontWeight="bold">
                                    VANITY TOP: 1.W {pWid}&quot; × 2.L {pLen}&quot;
                                  </text>

                                  {/* LATAK #1: FRONT SIDE LATAK (1. فرنٹ سائیڈ لٹک) */}
                                  {pHasFrontLatak && (
                                    <g>
                                      <rect
                                        x="170"
                                        y="358"
                                        width="640"
                                        height="56"
                                        fill="url(#vanity-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="3"
                                      />
                                      <rect x="240" y="370" width="500" height="32" rx="6" fill="rgba(2,6,23,0.9)" stroke="#FBBF24" strokeWidth="1.5" />
                                      <text
                                        x="490"
                                        y="391"
                                        textAnchor="middle"
                                        fill="#FDE047"
                                        fontSize="14"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                      >
                                        {tr(
                                          `1. FRONT SIDE LATAK (No Splash Line): ${pLatakW}" × ${pLen}"`,
                                          `1. فرنٹ سائیڈ لٹک (نو سلیش لائن): ${pLatakW}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}
                                </svg>
                              )}

                              {activeCategoryPreset === 'kitchen' && (
                                <svg
                                  viewBox="0 0 980 510"
                                  className="w-full max-w-5xl h-auto select-none"
                                >
                                  <defs>
                                    <pattern
                                      id="kitchen-stone-tex"
                                      patternUnits="userSpaceOnUse"
                                      width="980"
                                      height="510"
                                    >
                                      <image
                                        href={slabVis1.imageUrl}
                                        x="0"
                                        y="0"
                                        width="980"
                                        height="510"
                                        preserveAspectRatio="xMidYMid slice"
                                      />
                                    </pattern>
                                  </defs>

                                  <rect x="0" y="0" width="980" height="510" rx="12" fill="#020617" />

                                  {/* SPLASH #1: KITCHEN BACK SIDE SPLASH (1. بیک سائیڈ سلیش) */}
                                  {pHasBackSplash && (
                                    <g>
                                      <rect
                                        x="140"
                                        y="14"
                                        width="700"
                                        height="34"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="260" y="18" width="460" height="26" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text x="490" y="35" textAnchor="middle" fill="#7DD3FC" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                                        {tr(
                                          `1. KITCHEN BACK SPLASH: ${pSplashH}" × ${pLen}"`,
                                          `1. کچن بیک سائیڈ سلیش: ${pSplashH}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}

                                  {/* SPLASH #2: KITCHEN LEFT SIDE SPLASH (2. لیفٹ سائیڈ سلیش) */}
                                  {pHasLeftSplash && (
                                    <g>
                                      <rect
                                        x="28"
                                        y="94"
                                        width="38"
                                        height="165"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="32" y="108" width="30" height="136" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="47"
                                        y="176"
                                        textAnchor="middle"
                                        fill="#7DD3FC"
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(-90 47 176)"
                                      >
                                        2. LEFT SPLASH ({pSplashH}&quot;×{pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* SPLASH #3: KITCHEN RIGHT SIDE SPLASH (3. رائٹ سائیڈ سلیش) */}
                                  {pHasRightSplash && (
                                    <g>
                                      <rect
                                        x="914"
                                        y="94"
                                        width="38"
                                        height="165"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#38BDF8"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="918" y="108" width="30" height="136" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="933"
                                        y="176"
                                        textAnchor="middle"
                                        fill="#7DD3FC"
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(90 933 176)"
                                      >
                                        3. RIGHT SPLASH ({pSplashH}&quot;×{pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #4: KITCHEN BACK SIDE LATAK (4. بیک سائیڈ لٹک) */}
                                  {pHasBackLatak && (
                                    <g>
                                      <rect
                                        x="140"
                                        y="54"
                                        width="700"
                                        height="32"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="290" y="57" width="400" height="26" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text x="490" y="74" textAnchor="middle" fill="#FDE047" fontSize="12" fontFamily="monospace" fontWeight="bold">
                                        {tr(
                                          `4. BACK SIDE LATAK: ${pLatakW}" × ${pLen}"`,
                                          `4. بیک سائیڈ لٹک: ${pLatakW}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #2: KITCHEN LEFT SIDE LATAK (2. لیفٹ سائیڈ لٹک) */}
                                  {pHasLeftLatak && (
                                    <g>
                                      <rect
                                        x="82"
                                        y="94"
                                        width="46"
                                        height="165"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="88" y="108" width="34" height="136" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="105"
                                        y="176"
                                        textAnchor="middle"
                                        fill="#FDE047"
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(-90 105 176)"
                                      >
                                        2. LEFT LATAK ({pLatakW}&quot;×{pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* LATAK #3: KITCHEN RIGHT SIDE LATAK (3. رائٹ سائیڈ لٹک) */}
                                  {pHasRightLatak && (
                                    <g>
                                      <rect
                                        x="852"
                                        y="94"
                                        width="46"
                                        height="165"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="858" y="108" width="34" height="136" rx="4" fill="rgba(2,6,23,0.88)" />
                                      <text
                                        x="875"
                                        y="176"
                                        textAnchor="middle"
                                        fill="#FDE047"
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        transform="rotate(90 875 176)"
                                      >
                                        3. RIGHT LATAK ({pLatakW}&quot;×{pWid}&quot;)
                                      </text>
                                    </g>
                                  )}

                                  {/* 2. Main Kitchen Countertop Slab */}
                                  <rect
                                    x="140"
                                    y="94"
                                    width="700"
                                    height="165"
                                    fill="url(#kitchen-stone-tex)"
                                    stroke="#FFFFFF"
                                    strokeWidth="3"
                                  />

                                  {/* Kitchen Sink Cutout (Left) */}
                                  <rect
                                    x="175"
                                    y="116"
                                    width="200"
                                    height="105"
                                    rx="10"
                                    fill="#020617"
                                    stroke="#38BDF8"
                                    strokeWidth="3"
                                    strokeDasharray="8 4"
                                  />
                                  <line x1="275" y1="116" x2="275" y2="221" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 3" />
                                  <text x="275" y="164" textAnchor="middle" fill="#38BDF8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                    DOUBLE SINK CUTOUT
                                  </text>
                                  <text x="275" y="184" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontFamily="monospace">
                                    {tr('32" × 18" (Kitchen Sink)', '32" × 18" (کچن سنک)')}
                                  </text>

                                  {/* Stove / Hob Cutout (Right) */}
                                  <rect
                                    x="605"
                                    y="118"
                                    width="195"
                                    height="100"
                                    rx="8"
                                    fill="#020617"
                                    stroke="#F43F5E"
                                    strokeWidth="3"
                                    strokeDasharray="8 4"
                                  />
                                  <circle cx="655" cy="150" r="14" fill="none" stroke="#F43F5E" strokeWidth="2" />
                                  <circle cx="745" cy="150" r="14" fill="none" stroke="#F43F5E" strokeWidth="2" />
                                  <circle cx="655" cy="190" r="14" fill="none" stroke="#F43F5E" strokeWidth="2" />
                                  <circle cx="745" cy="190" r="14" fill="none" stroke="#F43F5E" strokeWidth="2" />
                                  <text x="702" y="174" textAnchor="middle" fill="#FDA4AF" fontSize="12" fontFamily="monospace" fontWeight="bold">
                                    {tr('HOB / STOVE (30"×20")', 'چولہا / سٹوو (30"×20")')}
                                  </text>

                                  {/* Main Counter Label */}
                                  <rect x="385" y="220" width="210" height="30" rx="5" fill="rgba(2,6,23,0.9)" stroke="#38BDF8" />
                                  <text x="490" y="240" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                    MAIN TOP: {pWid}&quot; × {pLen}&quot;
                                  </text>

                                  {/* LATAK #1: FRONT KITCHEN COUNTER LATAK (1. فرنٹ سائیڈ لٹک) */}
                                  {pHasFrontLatak && (
                                    <g>
                                      <rect
                                        x="140"
                                        y="266"
                                        width="700"
                                        height="38"
                                        fill="url(#kitchen-stone-tex)"
                                        stroke="#FBBF24"
                                        strokeWidth="2.5"
                                      />
                                      <rect x="250" y="271" width="480" height="28" rx="5" fill="rgba(2,6,23,0.9)" />
                                      <text x="490" y="290" textAnchor="middle" fill="#FDE047" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                        {tr(
                                          `1. FRONT SIDE LATAK (No Splash): ${pLatakW}" × ${pLen}"`,
                                          `1. فرنٹ سائیڈ لٹک (نو سلیش): ${pLatakW}" × ${pLen}"`
                                        )}
                                      </text>
                                    </g>
                                  )}

                                  {/* 4. Center Kitchen Island Slab */}
                                  <rect
                                    x="200"
                                    y="324"
                                    width="580"
                                    height="162"
                                    fill="url(#kitchen-stone-tex)"
                                    stroke="#FBBF24"
                                    strokeWidth="3"
                                  />
                                  <rect x="300" y="382" width="380" height="46" rx="6" fill="rgba(2,6,23,0.88)" stroke="#FBBF24" strokeWidth="1.5" />
                                  <text x="490" y="402" textAnchor="middle" fill="#FDE047" fontSize="14" fontFamily="monospace" fontWeight="bold">
                                    {tr('KITCHEN ISLAND SLAB', 'کچن آئی لینڈ ٹیبل')}
                                  </text>
                                  <text x="490" y="420" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontFamily="monospace">
                                    36&quot; × 72&quot; + 4-Side Waterfall / Latak ({pLatakW}&quot;)
                                  </text>
                                </svg>
                              )}

                              {activeCategoryPreset === 'stairs' &&
                                (() => {
                                  const slabW = Math.max(24, Number(slabConfig.width) || 60);
                                  const slabL = Math.max(48, Number(slabConfig.length) || 110);
                                  const kerf = Number(slabConfig.kerf) || 0.125;

                                  // 1 Complete Step Strip Height along Slab Width: Step Tread + Front Rope-Light Latak + Riser
                                  const stepStripH =
                                    stairTreadDepth +
                                    (stairHasRopeLightLatak && stairLatakFront ? stairLatakHeight + kerf : 0) +
                                    (stairHasRiser ? stairRiserHeight + kerf : 0);
                                  const colsPerSlab = Math.max(
                                    1,
                                    Math.floor((slabL + kerf) / (stairStepLength + kerf))
                                  );
                                  const rowsPerSlab = Math.max(
                                    1,
                                    Math.floor((slabW + kerf) / (stepStripH + kerf))
                                  );
                                  const stepsPerSingleSlab = Math.max(1, colsPerSlab * rowsPerSlab);
                                  const totalSlabsNeeded = Math.max(
                                    1,
                                    Math.ceil(stairStepsCount / stepsPerSingleSlab)
                                  );

                                  const singleStepSqFt =
                                    ((stairTreadDepth +
                                      (stairHasRopeLightLatak && stairLatakFront ? stairLatakHeight : 0) +
                                      (stairHasRiser ? stairRiserHeight : 0)) *
                                      stairStepLength +
                                      (stairHasRopeLightLatak && stairLatakLeft
                                        ? stairLatakHeight * stairTreadDepth
                                        : 0) +
                                      (stairHasRopeLightLatak && stairLatakRight
                                        ? stairLatakHeight * stairTreadDepth
                                        : 0)) /
                                    144;
                                  const totalUsedStairSqFt = stairStepsCount * singleStepSqFt;
                                  const singleSlabSqFt = (slabW * slabL) / 144;
                                  const totalSlabsAreaSqFt = totalSlabsNeeded * singleSlabSqFt;
                                  const totalWasteSqFt = Math.max(
                                    0,
                                    totalSlabsAreaSqFt - totalUsedStairSqFt
                                  );
                                  const wastePct =
                                    totalSlabsAreaSqFt > 0
                                      ? (totalWasteSqFt / totalSlabsAreaSqFt) * 100
                                      : 0;

                                  const sideWasteWidthIn = Math.max(
                                    0,
                                    Number((slabL - colsPerSlab * stairStepLength).toFixed(1))
                                  );
                                  const bottomWasteHeightIn = Math.max(
                                    0,
                                    Number((slabW - rowsPerSlab * stepStripH).toFixed(1))
                                  );

                                  return (
                                    <div className="w-full space-y-4">
                                      {/* INTERACTIVE ROPE-LIGHT BOOKMATCH STAIRCASE CALCULATOR & SLAB GENERATOR */}
                                      <div className="rounded-xl border-2 border-amber-500/50 bg-slate-950 p-3.5 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setStairHasRopeLightLatak(true);
                                                handleApplyRopeLightStairsToSlabs({ hasLatak: true });
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                                                stairHasRopeLightLatak
                                                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              💡 {tr('Rope-Light Stairs (Step + Latak + Riser)', 'روپ لائٹ سیڑھی (سٹیپ + لٹک + رائزر)')}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setStairHasRopeLightLatak(false);
                                                handleApplyRopeLightStairsToSlabs({ hasLatak: false });
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                                                !stairHasRopeLightLatak
                                                  ? 'bg-sky-500 border-sky-300 text-slate-950 shadow'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              🪜 {tr('Standard Stairs (Step + Riser Only)', 'سادہ سیڑھی (صرف سٹیپ + رائزر)')}
                                            </button>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleApplyRopeLightStairsToSlabs()}
                                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow flex items-center gap-1.5"
                                          >
                                            <span>🦋</span>
                                            <span>
                                              {tr(
                                                `Cut ${stairStepsCount} Bookmatch Steps from ${totalSlabsNeeded} Slabs`,
                                                `${stairStepsCount} بک میچ سٹیپس (${totalSlabsNeeded} سلیبوں میں) اپلائی کریں`
                                              )}
                                            </span>
                                          </button>
                                        </div>

                                        {/* Staircase Inputs Grid: Steps Count, Tread Depth, Step Length, Latak Height & Sides, Riser Height */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                          {/* 1. Total Steps Count */}
                                          <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1">
                                            <Label className="text-[11px] font-extrabold text-amber-300 block">
                                              {tr('Total Steps (کل کتنے سٹیپ بنانے ہیں):', 'کل کتنے سٹیپ بنانے ہیں:')}
                                            </Label>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={stairStepsCount}
                                                onChange={(e) => {
                                                  const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                  setStairStepsCount(v);
                                                  handleApplyRopeLightStairsToSlabs({ steps: v });
                                                }}
                                                className="h-7 w-14 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold px-1.5"
                                              />
                                              {[12, 14, 16, 18, 20].map((cnt) => (
                                                <button
                                                  key={cnt}
                                                  type="button"
                                                  onClick={() => {
                                                    setStairStepsCount(cnt);
                                                    handleApplyRopeLightStairsToSlabs({ steps: cnt });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border ${
                                                    stairStepsCount === cnt
                                                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                                  }`}
                                                >
                                                  {cnt}
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* 2. Step Tread Depth (1. چوڑائی / گہرائی) */}
                                          <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1">
                                            <Label className="text-[11px] font-extrabold text-sky-300 block">
                                              {tr('1. Step Tread Depth (ٹپہ چوڑائی):', '1. سٹیپ ٹپہ چوڑائی (انچ):')}
                                            </Label>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                value={stairTreadDepth}
                                                onChange={(e) => {
                                                  const v = Math.max(6, Number(e.target.value) || 12);
                                                  setStairTreadDepth(v);
                                                  handleApplyRopeLightStairsToSlabs({ treadDepth: v });
                                                }}
                                                className="h-7 w-14 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold px-1.5"
                                              />
                                              {[11, 12, 13, 14].map((d) => (
                                                <button
                                                  key={d}
                                                  type="button"
                                                  onClick={() => {
                                                    setStairTreadDepth(d);
                                                    handleApplyRopeLightStairsToSlabs({ treadDepth: d });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border ${
                                                    stairTreadDepth === d
                                                      ? 'bg-sky-500 border-sky-300 text-slate-950'
                                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                                  }`}
                                                >
                                                  {d}&quot;
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* 3. Step Length (2. لمبائی) */}
                                          <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1">
                                            <Label className="text-[11px] font-extrabold text-sky-300 block">
                                              {tr('2. Step Length (سٹیپ لمبائی):', '2. سٹیپ کی لمبائی (انچ):')}
                                            </Label>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                value={stairStepLength}
                                                onChange={(e) => {
                                                  const v = Math.max(18, Number(e.target.value) || 42);
                                                  setStairStepLength(v);
                                                  handleApplyRopeLightStairsToSlabs({ stepLen: v });
                                                }}
                                                className="h-7 w-14 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold px-1.5"
                                              />
                                              {[36, 42, 48, 54].map((l) => (
                                                <button
                                                  key={l}
                                                  type="button"
                                                  onClick={() => {
                                                    setStairStepLength(l);
                                                    handleApplyRopeLightStairsToSlabs({ stepLen: l });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border ${
                                                    stairStepLength === l
                                                      ? 'bg-sky-500 border-sky-300 text-slate-950'
                                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                                  }`}
                                                >
                                                  {l}&quot;
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* 4. Rope-Light Latak Size (روپ لائٹ لٹک سائز) */}
                                          <div className="rounded-lg bg-slate-900 border border-amber-500/40 p-2 space-y-1">
                                            <Label className="text-[11px] font-extrabold text-amber-300 block">
                                              {tr('3. Rope-Light Latak (روپ لائٹ لٹک):', '3. روپ لائٹ لٹک / لیٹر (انچ):')}
                                            </Label>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                step="0.5"
                                                value={stairLatakHeight}
                                                onChange={(e) => {
                                                  const v = Math.max(1, Number(e.target.value) || 2);
                                                  setStairLatakHeight(v);
                                                  setStairHasRopeLightLatak(true);
                                                  handleApplyRopeLightStairsToSlabs({
                                                    latakH: v,
                                                    hasLatak: true,
                                                  });
                                                }}
                                                className="h-7 w-14 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold px-1.5"
                                              />
                                              {[1.5, 2, 2.5, 3].map((lh) => (
                                                <button
                                                  key={lh}
                                                  type="button"
                                                  onClick={() => {
                                                    setStairLatakHeight(lh);
                                                    setStairHasRopeLightLatak(true);
                                                    handleApplyRopeLightStairsToSlabs({
                                                      latakH: lh,
                                                      hasLatak: true,
                                                    });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border ${
                                                    stairLatakHeight === lh && stairHasRopeLightLatak
                                                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                                  }`}
                                                >
                                                  {lh}&quot;
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* 5. Riser Height (رائزر اونچائی) */}
                                          <div className="rounded-lg bg-slate-900 border border-emerald-500/40 p-2 space-y-1">
                                            <Label className="text-[11px] font-extrabold text-emerald-300 block">
                                              {tr('4. Riser Height (رائزر اونچائی):', '4. رائزر اونچائی (انچ):')}
                                            </Label>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                step="0.5"
                                                value={stairRiserHeight}
                                                onChange={(e) => {
                                                  const v = Math.max(3, Number(e.target.value) || 6);
                                                  setStairRiserHeight(v);
                                                  setStairHasRiser(true);
                                                  handleApplyRopeLightStairsToSlabs({
                                                    riserH: v,
                                                    hasRiser: true,
                                                  });
                                                }}
                                                className="h-7 w-14 bg-slate-950 border-emerald-500/60 text-white font-mono text-xs font-bold px-1.5"
                                              />
                                              {[5.5, 6, 6.5, 7].map((rh) => (
                                                <button
                                                  key={rh}
                                                  type="button"
                                                  onClick={() => {
                                                    setStairRiserHeight(rh);
                                                    setStairHasRiser(true);
                                                    handleApplyRopeLightStairsToSlabs({
                                                      riserH: rh,
                                                      hasRiser: true,
                                                    });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold border ${
                                                    stairRiserHeight === rh && stairHasRiser
                                                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                                                      : 'bg-slate-950 border-slate-700 text-slate-300'
                                                  }`}
                                                >
                                                  {rh}&quot;
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Stair Latak Side Order Buttons (1. Front -> 2. Left -> 3. Right -> 4. Back) */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                                          <span className="text-xs font-bold text-amber-300">
                                            {tr(
                                              'Stair Step Latak Sides (1.Front → 2.Left → 3.Right → 4.Back):',
                                              'سیڑھی سٹیپ کی لٹک سائیڈیں (ترتیب: 1.فرنٹ سائیڈ ← 2.لیفٹ سائیڈ ← 3.رائٹ سائیڈ ← 4.بیک سائیڈ):'
                                            )}
                                          </span>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = !stairLatakFront;
                                                setStairLatakFront(next);
                                                handleApplyRopeLightStairsToSlabs({ latakF: next });
                                              }}
                                              className={`px-2.5 py-1 rounded border text-xs font-extrabold ${
                                                stairLatakFront
                                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              {tr('1. Front Latak', '1. فرنٹ سائیڈ لٹک')} {stairLatakFront ? '✓' : '○'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = !stairLatakLeft;
                                                setStairLatakLeft(next);
                                                handleApplyRopeLightStairsToSlabs({ latakL: next });
                                              }}
                                              className={`px-2.5 py-1 rounded border text-xs font-extrabold ${
                                                stairLatakLeft
                                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              {tr('2. Left Latak', '2. لیفٹ سائیڈ لٹک')} {stairLatakLeft ? '✓' : '○'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = !stairLatakRight;
                                                setStairLatakRight(next);
                                                handleApplyRopeLightStairsToSlabs({ latakR: next });
                                              }}
                                              className={`px-2.5 py-1 rounded border text-xs font-extrabold ${
                                                stairLatakRight
                                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              {tr('3. Right Latak', '3. رائٹ سائیڈ لٹک')} {stairLatakRight ? '✓' : '○'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = !stairLatakBack;
                                                setStairLatakBack(next);
                                                handleApplyRopeLightStairsToSlabs({ latakB: next });
                                              }}
                                              className={`px-2.5 py-1 rounded border text-xs font-extrabold ${
                                                stairLatakBack
                                                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                                              }`}
                                            >
                                              {tr('4. Back Latak', '4. بیک سائیڈ لٹک')} {stairLatakBack ? '✓' : '○'}
                                            </button>
                                          </div>
                                        </div>

                                        {/* LIVE SLAB & WASTE CALCULATION SUMMARY CARDS */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                                          <div className="rounded-lg bg-slate-900/90 border border-sky-500/40 p-2.5">
                                            <span className="text-[10px] font-mono text-sky-300 block">
                                              {tr('1 STEP COMPLETE SET', 'ایک سٹیپ کا مکمل سیٹ (ٹپہ + لٹک + رائزر)')}
                                            </span>
                                            <p className="text-sm font-mono font-extrabold text-white mt-0.5">
                                              {stairTreadDepth}&quot; + {stairHasRopeLightLatak ? `${stairLatakHeight}"` : '0"'} + {stairRiserHeight}&quot; = {stepStripH.toFixed(1)}&quot; × {stairStepLength}&quot;
                                            </p>
                                            <span className="text-[10px] text-slate-400">
                                              {tr(
                                                `${stepsPerSingleSlab} Full Steps per Slab (${slabW}"×${slabL}")`,
                                                `ایک سلیب (${slabW}"×${slabL}") میں سے ${stepsPerSingleSlab} مکمل سٹیپ نکلتے ہیں`
                                              )}
                                            </span>
                                          </div>

                                          <div className="rounded-lg bg-slate-900/90 border border-amber-500/50 p-2.5">
                                            <span className="text-[10px] font-mono text-amber-300 block">
                                              {tr('BOOKMATCH SLABS USED', 'کل بک میچ سلیبیں کتنی لگتی ہیں')}
                                            </span>
                                            <p className="text-base font-mono font-extrabold text-amber-300 mt-0.5">
                                              {totalSlabsNeeded} {tr('Bookmatched Slabs', 'بک میچ سلیبیں')} ({totalSlabsAreaSqFt.toFixed(1)} ft²)
                                            </p>
                                            <span className="text-[10px] text-slate-300">
                                              {Array.from({ length: totalSlabsNeeded })
                                                .map((_, i) => `S#${i + 1}(${i % 2 === 0 ? 'A' : 'B'})`)
                                                .join(' ↔ ')}
                                            </span>
                                          </div>

                                          <div className="rounded-lg bg-slate-900/90 border border-emerald-500/40 p-2.5">
                                            <span className="text-[10px] font-mono text-emerald-300 block">
                                              {tr('NET STAIR MARBLE USED', 'سیڑھی میں استعمال شدہ ماربل')}
                                            </span>
                                            <p className="text-base font-mono font-extrabold text-emerald-300 mt-0.5">
                                              {totalUsedStairSqFt.toFixed(1)} Sq.Ft ({(100 - wastePct).toFixed(1)}%)
                                            </p>
                                            <span className="text-[10px] text-slate-400">
                                              {stairStepsCount} Steps + {stairStepsCount} Lataks + {stairStepsCount} Risers
                                            </span>
                                          </div>

                                          <div className="rounded-lg bg-slate-900/90 border border-rose-500/50 p-2.5">
                                            <span className="text-[10px] font-mono text-rose-300 block">
                                              {tr('TOTAL SLAB WASTE / OFFCUT', 'کل ویسٹ / بچا ہوا ماربل')}
                                            </span>
                                            <p className="text-base font-mono font-extrabold text-rose-300 mt-0.5">
                                              {totalWasteSqFt.toFixed(1)} Sq.Ft ({wastePct.toFixed(1)}% Waste)
                                            </p>
                                            <span className="text-[10px] text-rose-200/80">
                                              {tr(
                                                `Side Offcut: ${sideWasteWidthIn}" | Bottom Offcut: ${bottomWasteHeightIn}"`,
                                                `سائیڈ ویسٹ: ${sideWasteWidthIn}" انچ | نیچے ویسٹ: ${bottomWasteHeightIn}" انچ`
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* DIAGRAM 1: ROPE-LIGHT STAIR STEP + LATAK + RISER WATERFALL ASSEMBLY */}
                                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                                        <div className="text-xs font-extrabold text-amber-300 mb-2 flex items-center justify-between">
                                          <span>
                                            {tr(
                                              '📐 DIAGRAM A: Rope-Light Stair Step + Front/Side Latak + Riser Assembly (یہ سٹیپ ہے، یہ لٹک ہے، اور یہ رائزر ہے)',
                                              '📐 ڈایاگرام A: روپ لائٹ والی سیڑھی کی ترتیب (1. یہ سٹیپ ٹپہ ہے ← 2. یہ روپ لائٹ لٹک ہے ← 3. یہ رائزر ہے)'
                                            )}
                                          </span>
                                          <span className="text-[11px] font-mono text-sky-300">
                                            {tr(
                                              'Continuous Bookmatch Vein Flow',
                                              'رگ سے رگ ملتی ہوئی بک میچ سیڑھی'
                                            )}
                                          </span>
                                        </div>
                                        <svg
                                          viewBox="0 0 960 420"
                                          className="w-full max-w-5xl mx-auto h-auto select-none"
                                        >
                                          <defs>
                                            <pattern
                                              id="stairs-stone-tex"
                                              patternUnits="userSpaceOnUse"
                                              width="960"
                                              height="420"
                                            >
                                              <image
                                                href={slabVis1.imageUrl}
                                                x="0"
                                                y="0"
                                                width="960"
                                                height="420"
                                                preserveAspectRatio="xMidYMid slice"
                                              />
                                            </pattern>
                                          </defs>
                                          <rect x="0" y="0" width="960" height="420" rx="12" fill="#020617" />

                                          {[0, 1, 2].map((sIdx) => {
                                            const baseY = 26 + sIdx * 124;
                                            const baseX = 45 + sIdx * 32;
                                            return (
                                              <g key={sIdx}>
                                                {/* 1. Step Tread (یہ سٹیپ / ٹپہ ہے) */}
                                                <rect
                                                  x={baseX}
                                                  y={baseY}
                                                  width="540"
                                                  height="52"
                                                  fill="url(#stairs-stone-tex)"
                                                  stroke="#38BDF8"
                                                  strokeWidth="2.5"
                                                />
                                                <rect
                                                  x={baseX + 14}
                                                  y={baseY + 11}
                                                  width="512"
                                                  height="30"
                                                  rx="4"
                                                  fill="rgba(2,6,23,0.88)"
                                                />
                                                <text
                                                  x={baseX + 270}
                                                  y={baseY + 31}
                                                  textAnchor="middle"
                                                  fill="#FFFFFF"
                                                  fontSize="13"
                                                  fontFamily="monospace"
                                                  fontWeight="bold"
                                                >
                                                  {tr(
                                                    `1. STEP #${sIdx + 1} TREAD: ${stairTreadDepth}" × ${stairStepLength}"`,
                                                    `1. سٹیپ ٹپہ #${sIdx + 1}: ${stairTreadDepth}" × ${stairStepLength}"`
                                                  )}
                                                </text>

                                                {/* Left / Right Return Latak Indicators if enabled */}
                                                {stairHasRopeLightLatak && stairLatakLeft && (
                                                  <rect
                                                    x={baseX - 18}
                                                    y={baseY}
                                                    width="18"
                                                    height="76"
                                                    fill="#F59E0B"
                                                    stroke="#FDE047"
                                                    strokeWidth="1.5"
                                                  />
                                                )}
                                                {stairHasRopeLightLatak && stairLatakRight && (
                                                  <rect
                                                    x={baseX + 540}
                                                    y={baseY}
                                                    width="18"
                                                    height="76"
                                                    fill="#F59E0B"
                                                    stroke="#FDE047"
                                                    strokeWidth="1.5"
                                                  />
                                                )}

                                                {/* 2. Rope-Light Front Latak (یہ روپ لائٹ لٹک / لیٹر ہے) */}
                                                {stairHasRopeLightLatak && stairLatakFront && (
                                                  <g>
                                                    <rect
                                                      x={baseX}
                                                      y={baseY + 52}
                                                      width="540"
                                                      height="24"
                                                      fill="url(#stairs-stone-tex)"
                                                      stroke="#FBBF24"
                                                      strokeWidth="2.5"
                                                    />
                                                    <rect
                                                      x={baseX + 40}
                                                      y={baseY + 55}
                                                      width="460"
                                                      height="18"
                                                      rx="3"
                                                      fill="rgba(2,6,23,0.92)"
                                                    />
                                                    <text
                                                      x={baseX + 270}
                                                      y={baseY + 68}
                                                      textAnchor="middle"
                                                      fill="#FDE047"
                                                      fontSize="11.5"
                                                      fontFamily="monospace"
                                                      fontWeight="bold"
                                                    >
                                                      {tr(
                                                        `💡 2. ROPE-LIGHT LATAK #${sIdx + 1}: ${stairLatakHeight}" × ${stairStepLength}"`,
                                                        `💡 2. روپ لائٹ لٹک #${sIdx + 1}: ${stairLatakHeight}" × ${stairStepLength}"`
                                                      )}
                                                    </text>
                                                    {/* Warm LED Rope Light Glow Line right under the Latak */}
                                                    <line
                                                      x1={baseX + 8}
                                                      y1={baseY + 78}
                                                      x2={baseX + 532}
                                                      y2={baseY + 78}
                                                      stroke="#FEF08A"
                                                      strokeWidth="3.5"
                                                      strokeDasharray="10 4"
                                                    />
                                                  </g>
                                                )}

                                                {/* 3. Vertical Stair Riser (یہ رائزر ہے) */}
                                                {stairHasRiser && (
                                                  <g>
                                                    <rect
                                                      x={baseX + 22}
                                                      y={baseY + 80}
                                                      width="518"
                                                      height="38"
                                                      fill="url(#stairs-stone-tex)"
                                                      stroke="#34D399"
                                                      strokeWidth="2"
                                                    />
                                                    <rect
                                                      x={baseX + 85}
                                                      y={baseY + 87}
                                                      width="390"
                                                      height="24"
                                                      rx="4"
                                                      fill="rgba(2,6,23,0.9)"
                                                    />
                                                    <text
                                                      x={baseX + 280}
                                                      y={baseY + 103}
                                                      textAnchor="middle"
                                                      fill="#6EE7B7"
                                                      fontSize="12"
                                                      fontFamily="monospace"
                                                      fontWeight="bold"
                                                    >
                                                      {tr(
                                                        `3. RISER #${sIdx + 1}: ${stairRiserHeight}" × ${stairStepLength}"`,
                                                        `3. رائزر #${sIdx + 1}: ${stairRiserHeight}" × ${stairStepLength}"`
                                                      )}
                                                    </text>
                                                  </g>
                                                )}
                                              </g>
                                            );
                                          })}

                                          {/* Right Side: Cross-Section Detail of Rope-Light Step + Latak + Riser */}
                                          <rect
                                            x="655"
                                            y="26"
                                            width="280"
                                            height="368"
                                            rx="10"
                                            fill="#0F172A"
                                            stroke="#F59E0B"
                                            strokeWidth="2"
                                          />
                                          <text x="795" y="52" textAnchor="middle" fill="#FDE047" fontSize="13" fontFamily="monospace" fontWeight="bold">
                                            {tr('SIDE PROFILE', 'سائیڈ پروفائل')}
                                          </text>
                                          {/* Cross-section drawing */}
                                          {/* Horizontal Step Tread */}
                                          <rect x="695" y="95" width="180" height="22" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
                                          <text x="785" y="110" textAnchor="middle" fill="#020617" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                            1. STEP ({stairTreadDepth}&quot;)
                                          </text>
                                          {/* Vertical Front Latak dropping down */}
                                          <rect x="695" y="117" width="24" height="46" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="2" />
                                          <text x="688" y="145" textAnchor="end" fill="#FDE047" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                            2. LATAK ({stairLatakHeight}&quot;) →
                                          </text>
                                          {/* Glowing Rope Light Circle tucked behind Latak */}
                                          <circle cx="732" cy="134" r="9" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2.5" />
                                          <text x="795" y="138" textAnchor="middle" fill="#FEF08A" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                            ← 💡 ROPE LIGHT
                                          </text>
                                          {/* Recessed Vertical Riser */}
                                          <rect x="748" y="117" width="22" height="125" fill="#34D399" stroke="#FFFFFF" strokeWidth="2" />
                                          <text x="778" y="185" textAnchor="start" fill="#6EE7B7" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                                            ← 3. RISER ({stairRiserHeight}&quot;)
                                          </text>

                                          {/* Step Summary in Cross-Section Box */}
                                          <rect x="672" y="264" width="246" height="112" rx="8" fill="#020617" stroke="#334155" />
                                          <text x="795" y="286" textAnchor="middle" fill="#38BDF8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                                            BOOKMATCH SUMMARY ({stairStepsCount} STEPS)
                                          </text>
                                          <text x="795" y="308" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontFamily="monospace">
                                            • Slabs Needed: {totalSlabsNeeded} Slabs ({slabW}&quot;×{slabL}&quot;)
                                          </text>
                                          <text x="795" y="328" textAnchor="middle" fill="#6EE7B7" fontSize="11.5" fontFamily="monospace">
                                            • Used Marble: {totalUsedStairSqFt.toFixed(1)} Sq.Ft
                                          </text>
                                          <text x="795" y="348" textAnchor="middle" fill="#FDA4AF" fontSize="11.5" fontFamily="monospace" fontWeight="bold">
                                            • Total Waste: {totalWasteSqFt.toFixed(1)} Sq.Ft ({wastePct.toFixed(1)}%)
                                          </text>
                                        </svg>
                                      </div>

                                      {/* DIAGRAM 2: MULTI-SLAB BOOKMATCH CUTTING & WASTE DIAGRAM (بک میچ سلیبوں کے اندر سے کٹنگ اور ویسٹ کا پورا نقشہ) */}
                                      <div className="rounded-xl border-2 border-emerald-500/50 bg-slate-950 p-3.5 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold">
                                              {tr('SLAB-BY-SLAB BOOKMATCH CUTTING & WASTE MAP', 'بک میچ سلیبوں کے اندر سے سٹیپ، لٹک، رائزر کی کٹنگ اور ویسٹ کا پورا نقشہ')}
                                            </span>
                                            <h4 className="text-sm font-extrabold text-white mt-1">
                                              {tr(
                                                `How ${stairStepsCount} Steps (Step + Latak + Riser) Cut From ${totalSlabsNeeded} Bookmatched Slabs (${slabW}" × ${slabL}")`,
                                                `دیکھیں ${stairStepsCount} سٹیپس (ٹپہ + لٹک + رائزر) ${totalSlabsNeeded} بک میچ سلیبوں (${slabW}" × ${slabL}") میں سے کیسے کٹتے ہیں اور کتنی ویسٹ بچتی ہے`
                                              )}
                                            </h4>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                                            <span className="flex items-center gap-1 text-sky-300">
                                              <span className="inline-block w-3 h-3 rounded-sm bg-sky-500" />
                                              {tr('1. Step Tread', '1. سٹیپ ٹپہ')} ({stairTreadDepth}&quot;)
                                            </span>
                                            <span className="flex items-center gap-1 text-amber-300">
                                              <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
                                              {tr('2. Rope-Light Latak', '2. روپ لائٹ لٹک')} ({stairLatakHeight}&quot;)
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-300">
                                              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
                                              {tr('3. Riser', '3. رائزر')} ({stairRiserHeight}&quot;)
                                            </span>
                                            <span className="flex items-center gap-1 text-rose-400 font-bold">
                                              <span className="inline-block w-3 h-3 rounded-sm bg-rose-500/60 border border-rose-400" />
                                              {tr('Waste / Offcut', 'ویسٹ / بچا ہوا پیس')}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {Array.from({ length: totalSlabsNeeded }).map((_, slabIdx) => {
                                            const slabNum = slabIdx + 1;
                                            const isMirrorSlab = slabNum % 2 === 0;
                                            const firstStepNum = slabIdx * stepsPerSingleSlab + 1;
                                            const lastStepNum = Math.min(
                                              stairStepsCount,
                                              (slabIdx + 1) * stepsPerSingleSlab
                                            );
                                            const stepsInThisSlab = Math.max(
                                              0,
                                              lastStepNum - firstStepNum + 1
                                            );
                                            const slabUsedSqFt = stepsInThisSlab * singleStepSqFt;
                                            const slabWasteSqFt = Math.max(
                                              0,
                                              singleSlabSqFt - slabUsedSqFt
                                            );

                                            return (
                                              <div
                                                key={slabNum}
                                                className="rounded-lg border border-slate-700 bg-slate-900/90 p-2.5 space-y-2"
                                              >
                                                <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono">
                                                  <span className="font-extrabold text-amber-300">
                                                    {`SLAB #${slabNum} — ${
                                                      isMirrorSlab
                                                        ? tr('BOOKMATCH B (Mirrored Vein ↔)', 'بک میچ B (الٹی رگ ↔)')
                                                        : tr('BOOKMATCH A (Normal Vein →)', 'بک میچ A (سیدھی رگ →)')
                                                    }`}
                                                  </span>
                                                  <span className="text-[11px] text-slate-300">
                                                    {`Steps #${firstStepNum}–#${lastStepNum} | Used: ${slabUsedSqFt.toFixed(1)} ft² | `}
                                                    <strong className="text-rose-400">
                                                      {`Waste: ${slabWasteSqFt.toFixed(1)} ft²`}
                                                    </strong>
                                                  </span>
                                                </div>

                                                <svg
                                                  viewBox={`0 0 ${slabL * 4 + 20} ${slabW * 4 + 20}`}
                                                  className="w-full h-auto rounded border border-slate-800 bg-slate-950"
                                                >
                                                  {/* Raw Slab Background */}
                                                  <rect
                                                    x="10"
                                                    y="10"
                                                    width={slabL * 4}
                                                    height={slabW * 4}
                                                    fill="#0F172A"
                                                    stroke="#64748B"
                                                    strokeWidth="2"
                                                  />

                                                  {/* Side Waste / Leftover Zone */}
                                                  {sideWasteWidthIn > 0.5 && (
                                                    <g>
                                                      <rect
                                                        x={10 + colsPerSlab * stairStepLength * 4}
                                                        y="10"
                                                        width={sideWasteWidthIn * 4}
                                                        height={slabW * 4}
                                                        fill="rgba(244, 63, 94, 0.22)"
                                                        stroke="#F43F5E"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4 3"
                                                      />
                                                      <text
                                                        x={
                                                          10 +
                                                          colsPerSlab * stairStepLength * 4 +
                                                          (sideWasteWidthIn * 4) / 2
                                                        }
                                                        y={10 + (slabW * 4) / 2}
                                                        textAnchor="middle"
                                                        fill="#FDA4AF"
                                                        fontSize="11"
                                                        fontFamily="monospace"
                                                        fontWeight="bold"
                                                        transform={`rotate(-90 ${
                                                          10 +
                                                          colsPerSlab * stairStepLength * 4 +
                                                          (sideWasteWidthIn * 4) / 2
                                                        } ${10 + (slabW * 4) / 2})`}
                                                      >
                                                        WASTE ({sideWasteWidthIn}&quot; × {slabW}&quot;)
                                                      </text>
                                                    </g>
                                                  )}

                                                  {/* Bottom Waste / Leftover Zone */}
                                                  {bottomWasteHeightIn > 0.5 && (
                                                    <g>
                                                      <rect
                                                        x="10"
                                                        y={10 + rowsPerSlab * stepStripH * 4}
                                                        width={colsPerSlab * stairStepLength * 4}
                                                        height={bottomWasteHeightIn * 4}
                                                        fill="rgba(244, 63, 94, 0.22)"
                                                        stroke="#F43F5E"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4 3"
                                                      />
                                                      <text
                                                        x={10 + (colsPerSlab * stairStepLength * 4) / 2}
                                                        y={
                                                          10 +
                                                          rowsPerSlab * stepStripH * 4 +
                                                          (bottomWasteHeightIn * 4) / 2 +
                                                          4
                                                        }
                                                        textAnchor="middle"
                                                        fill="#FDA4AF"
                                                        fontSize="10.5"
                                                        fontFamily="monospace"
                                                        fontWeight="bold"
                                                      >
                                                        BOTTOM WASTE / OFFCUT ({bottomWasteHeightIn}&quot; × {colsPerSlab * stairStepLength}&quot;)
                                                      </text>
                                                    </g>
                                                  )}

                                                  {/* Draw Each Step Set (1. Tread + 2. Latak + 3. Riser) inside the Slab */}
                                                  {Array.from({ length: rowsPerSlab }).map((_, rIdx) =>
                                                    Array.from({ length: colsPerSlab }).map((__, cIdx) => {
                                                      const localIdx = rIdx * colsPerSlab + cIdx;
                                                      const globalStepNum = firstStepNum + localIdx;
                                                      const sx = 10 + cIdx * stairStepLength * 4;
                                                      const sy = 10 + rIdx * stepStripH * 4;
                                                      const sw = stairStepLength * 4;
                                                      const treadH4 = stairTreadDepth * 4;
                                                      const latakH4 =
                                                        stairHasRopeLightLatak && stairLatakFront
                                                          ? stairLatakHeight * 4
                                                          : 0;
                                                      const riserH4 = stairHasRiser
                                                        ? stairRiserHeight * 4
                                                        : 0;

                                                      if (globalStepNum > stairStepsCount) {
                                                        return (
                                                          <g key={`${rIdx}-${cIdx}`}>
                                                            <rect
                                                              x={sx}
                                                              y={sy}
                                                              width={sw}
                                                              height={stepStripH * 4}
                                                              fill="rgba(244, 63, 94, 0.25)"
                                                              stroke="#F43F5E"
                                                              strokeDasharray="4 3"
                                                            />
                                                            <text
                                                              x={sx + sw / 2}
                                                              y={sy + (stepStripH * 4) / 2 + 4}
                                                              textAnchor="middle"
                                                              fill="#FDA4AF"
                                                              fontSize="11"
                                                              fontFamily="monospace"
                                                              fontWeight="bold"
                                                            >
                                                              EXTRA SLAB AREA / OFFCUT ({stepStripH.toFixed(0)}&quot;×{stairStepLength}&quot;)
                                                            </text>
                                                          </g>
                                                        );
                                                      }

                                                      return (
                                                        <g key={`${rIdx}-${cIdx}`}>
                                                          {/* 1. Step Tread */}
                                                          <rect
                                                            x={sx}
                                                            y={sy}
                                                            width={sw}
                                                            height={treadH4}
                                                            fill="rgba(14, 165, 233, 0.32)"
                                                            stroke="#38BDF8"
                                                            strokeWidth="1.5"
                                                          />
                                                          <text
                                                            x={sx + sw / 2}
                                                            y={sy + treadH4 / 2 + 4}
                                                            textAnchor="middle"
                                                            fill="#FFFFFF"
                                                            fontSize="10.5"
                                                            fontFamily="monospace"
                                                            fontWeight="bold"
                                                          >
                                                            STEP #{globalStepNum} ({stairTreadDepth}&quot;×{stairStepLength}&quot;)
                                                          </text>

                                                          {/* 2. Rope-Light Latak */}
                                                          {latakH4 > 0 && (
                                                            <g>
                                                              <rect
                                                                x={sx}
                                                                y={sy + treadH4}
                                                                width={sw}
                                                                height={latakH4}
                                                                fill="rgba(245, 158, 11, 0.55)"
                                                                stroke="#FBBF24"
                                                                strokeWidth="1.2"
                                                              />
                                                              <text
                                                                x={sx + sw / 2}
                                                                y={sy + treadH4 + latakH4 / 2 + 3}
                                                                textAnchor="middle"
                                                                fill="#FEF08A"
                                                                fontSize="7.5"
                                                                fontFamily="monospace"
                                                                fontWeight="bold"
                                                              >
                                                                LATAK #{globalStepNum} ({stairLatakHeight}&quot;)
                                                              </text>
                                                            </g>
                                                          )}

                                                          {/* 3. Riser */}
                                                          {riserH4 > 0 && (
                                                            <g>
                                                              <rect
                                                                x={sx}
                                                                y={sy + treadH4 + latakH4}
                                                                width={sw}
                                                                height={riserH4}
                                                                fill="rgba(16, 185, 129, 0.35)"
                                                                stroke="#34D399"
                                                                strokeWidth="1.2"
                                                              />
                                                              <text
                                                                x={sx + sw / 2}
                                                                y={
                                                                  sy +
                                                                  treadH4 +
                                                                  latakH4 +
                                                                  riserH4 / 2 +
                                                                  3.5
                                                                }
                                                                textAnchor="middle"
                                                                fill="#A7F3D0"
                                                                fontSize="9"
                                                                fontFamily="monospace"
                                                                fontWeight="bold"
                                                              >
                                                                RISER #{globalStepNum} ({stairRiserHeight}&quot;×{stairStepLength}&quot;)
                                                              </text>
                                                            </g>
                                                          )}
                                                        </g>
                                                      );
                                                    })
                                                  )}
                                                </svg>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                              {activeCategoryPreset === 'window_sill' && (
                                <svg
                                  viewBox="0 0 960 440"
                                  className="w-full max-w-5xl h-auto select-none"
                                >
                                  <defs>
                                    <pattern
                                      id="sill-stone-tex"
                                      patternUnits="userSpaceOnUse"
                                      width="960"
                                      height="440"
                                    >
                                      <image
                                        href={slabVis1.imageUrl}
                                        x="0"
                                        y="0"
                                        width="960"
                                        height="440"
                                        preserveAspectRatio="xMidYMid slice"
                                      />
                                    </pattern>
                                  </defs>

                                  <rect x="0" y="0" width="960" height="440" rx="12" fill="#020617" />

                                  {/* Top Window Frame Jamb Header Patti */}
                                  <rect
                                    x="170"
                                    y="28"
                                    width="620"
                                    height="38"
                                    fill="url(#sill-stone-tex)"
                                    stroke="#2DD4BF"
                                    strokeWidth="2.5"
                                  />
                                  <rect x="330" y="34" width="300" height="26" rx="4" fill="rgba(2,6,23,0.88)" />
                                  <text x="480" y="51" textAnchor="middle" fill="#5EEAD4" fontSize="12.5" fontFamily="monospace" fontWeight="bold">
                                    {tr(
                                      `WINDOW TOP PATTI: 6" × ${pLen - 4}"`,
                                      `ونڈو ٹاپ فریم پٹی: 6" × ${pLen - 4}"`
                                    )}
                                  </text>

                                  {/* Left Window Jamb Patti */}
                                  <rect
                                    x="170"
                                    y="66"
                                    width="44"
                                    height="180"
                                    fill="url(#sill-stone-tex)"
                                    stroke="#2DD4BF"
                                    strokeWidth="2.5"
                                  />
                                  <text
                                    x="192"
                                    y="156"
                                    textAnchor="middle"
                                    fill="#5EEAD4"
                                    fontSize="11.5"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    transform="rotate(-90 192 156)"
                                  >
                                    {tr('LEFT JAMB (6" Side Strip)', 'بائیں سائیڈ پٹی (6")')}
                                  </text>

                                  {/* Right Window Jamb Patti */}
                                  <rect
                                    x="746"
                                    y="66"
                                    width="44"
                                    height="180"
                                    fill="url(#sill-stone-tex)"
                                    stroke="#2DD4BF"
                                    strokeWidth="2.5"
                                  />
                                  <text
                                    x="768"
                                    y="156"
                                    textAnchor="middle"
                                    fill="#5EEAD4"
                                    fontSize="11.5"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                    transform="rotate(90 768 156)"
                                  >
                                    {tr('RIGHT JAMB (6" Side Strip)', 'دائیں سائیڈ پٹی (6")')}
                                  </text>

                                  {/* Window Glass Area in Center */}
                                  <rect
                                    x="214"
                                    y="66"
                                    width="532"
                                    height="180"
                                    fill="#0F172A"
                                    stroke="#475569"
                                    strokeWidth="2"
                                  />
                                  <line x1="480" y1="66" x2="480" y2="246" stroke="#38BDF8" strokeWidth="2" />
                                  <line x1="214" y1="156" x2="746" y2="156" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 4" />
                                  <text x="480" y="145" textAnchor="middle" fill="#94A3B8" fontSize="15" fontFamily="monospace" fontWeight="bold">
                                    {tr('🪟 WINDOW OPENING', '🪟 کھڑکی کا شیشہ / فریم')}
                                  </text>

                                  {/* Main Bottom Window Sill (ونڈو سل / کھڑکی سل) with Left/Right Wall Ears (کانہ) */}
                                  <rect
                                    x="110"
                                    y="250"
                                    width="740"
                                    height="96"
                                    fill="url(#sill-stone-tex)"
                                    stroke="#FFFFFF"
                                    strokeWidth="3.5"
                                  />
                                  {/* Left & Right Ear Callout Boxes */}
                                  <rect x="116" y="258" width="54" height="80" fill="rgba(245, 158, 11, 0.28)" stroke="#FBBF24" strokeDasharray="4 2" />
                                  <text x="143" y="302" textAnchor="middle" fill="#FDE047" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                    EAR 2&quot;
                                  </text>
                                  <rect x="790" y="258" width="54" height="80" fill="rgba(245, 158, 11, 0.28)" stroke="#FBBF24" strokeDasharray="4 2" />
                                  <text x="817" y="302" textAnchor="middle" fill="#FDE047" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                    EAR 2&quot;
                                  </text>

                                  {/* Center Sill Dimension Callout */}
                                  <rect x="275" y="276" width="410" height="44" rx="6" fill="rgba(2,6,23,0.9)" stroke="#38BDF8" strokeWidth="2" />
                                  <text x="480" y="297" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontFamily="monospace" fontWeight="bold">
                                    {tr(
                                      `MAIN WINDOW SILL: 1.W ${pWid}" × 2.L ${pLen}"`,
                                      `مین ونڈو سل: 1.چوڑائی ${pWid}" × 2.لمبائی ${pLen}"`
                                    )}
                                  </text>
                                  <text x="480" y="314" textAnchor="middle" fill="#7DD3FC" fontSize="11.5" fontFamily="monospace">
                                    {tr(
                                      'Includes Left & Right Wall Ears (2")',
                                      'بائیں دائیں 2 انچ کانہ شامل ہے'
                                    )}
                                  </text>

                                  {/* Front Sill Drip Edge / Bookmatch Latak */}
                                  <rect
                                    x="110"
                                    y="354"
                                    width="740"
                                    height="48"
                                    fill="url(#sill-stone-tex)"
                                    stroke="#FBBF24"
                                    strokeWidth="3"
                                  />
                                  <rect x="250" y="364" width="460" height="28" rx="5" fill="rgba(2,6,23,0.9)" stroke="#FBBF24" />
                                  <text x="480" y="383" textAnchor="middle" fill="#FDE047" fontSize="13.5" fontFamily="monospace" fontWeight="bold">
                                    {tr(
                                      `🦋 WINDOW SILL FRONT LATAK / BULLNOSE: ${pLatakW}" × ${pLen}"`,
                                      `🦋 ونڈو سل سامنے کی لٹک / گولہ: ${pLatakW}" × ${pLen}"`
                                    )}
                                  </text>
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {(activeCategoryPreset === 'flooring' ||
                      activeCategoryPreset === 'bookmatch_wall') && (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-mono font-bold mb-1">
                              <span>
                                {activeCategoryPreset === 'bookmatch_wall'
                              ? tr(
                                  '🦋 LARGE 4-SLAB BOOKMATCH MEDALLION FLOOR & WALL DIAGRAM',
                                  '🦋 چار سلیبوں (4 Slabs) کا بڑا اور واضح بک میچ فلور ڈایاگرام'
                                )
                              : tr(
                                  '🏠 LARGE ROOM FLOORING & CUT PIECE PLACEMENT DIAGRAM',
                                  '🏠 کمرے کے اندر ٹائلیں اور کٹے ہوئے ماربل پیسز سیٹ کرنے کا بڑا نقشہ'
                                )}
                          </span>
                        </div>
                        <h3 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                          <Grid className="h-4 w-4 text-sky-400" />
                          <span>
                            {activeCategoryPreset === 'bookmatch_wall'
                              ? tr(
                                  'Diagram #2: Assembled 4-Slab Bookmatch Flooring Map (چار سلیب کا مکمل بک میچ فرش)',
                                  'ڈایاگرام نمبر 2: چار سلیبوں (Slab #1, #2, #3, #4) کے ٹکڑے ملا کر بنا ہوا بڑا بک میچ نقشہ'
                                )
                              : tr(
                                  'Diagram #2: Room Flooring & Cut Pieces Layout (فرش اور پیسز کی ترتیب)',
                                  'ڈایاگرام نمبر 2: کمرے کے اندر ماربل پیسز اور ٹائلیں سیٹ کرنے کا نقشہ'
                                )}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {tr(
                            'Click any two marble pieces in the room to SWAP their positions, use 1-Click 4-Tile Diamond Bookmatch, or switch to Full Room Tile Planner!',
                            'کمرے میں کسی بھی دو ماربل پیسز پر کلک کر کے ان کی جگہ آپس میں تبدیل کریں، 1-کلک سے 4-پیس ڈائمنڈ بک میچ بنائیں، یا پورے کمرے کا سائز دے کر ٹائلیں سیٹ کریں۔'
                          )}
                        </p>
                      </div>

                      {/* Mode Switcher: Slab Cut Pieces in Room vs Full Room Size Tile Bookmatch Planner */}
                      <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <div className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5">
                          <button
                            type="button"
                            onClick={() => setRoomDiagramMode('slab_pieces')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                              roomDiagramMode === 'slab_pieces'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(
                              '🏠 Set Cut Pieces in Room',
                              '🏠 کٹے ہوئے پیسز کا نقشہ'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoomDiagramMode('full_room_planner')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                              roomDiagramMode === 'full_room_planner'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(
                              '🧱 Full Room Tile Planner',
                              '🧱 پورے کمرے کا ٹائل پلانر'
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSetFullscreenMode(
                              fullscreenTarget === 'floor_diagram' ? 'workstation' : 'floor_diagram'
                            )
                          }
                          className={
                            fullscreenTarget === 'floor_diagram'
                              ? cadBtnPrimary
                              : cadBtnSecondary
                          }
                        >
                          {fullscreenTarget === 'floor_diagram' ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                          ) : (
                            <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
                          )}
                          <span>
                            {fullscreenTarget === 'floor_diagram'
                              ? tr('Show Slab Map Too', 'نارمل ویو')
                              : tr('Fullscreen Room', 'کمرہ فل سکرین')}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* =====================================================================
                        MODE A: SET & SWAP ACTUAL SLAB CUT PIECES INSIDE THE ROOM
                       ===================================================================== */}
                    {roomDiagramMode === 'slab_pieces' &&
                      (() => {
                        // Filter out thin attached/random Latak strips when hideLatakInRoom is ON so main floor/table pieces arrange cleanly!
                        const filteredRoomPieces = allPlacedPieces.filter((p) => {
                          if (!hideLatakInRoom) return true;
                          const isLatakStrip =
                            p.instanceId.includes('_bm_') ||
                            p.instanceId.includes('_latak_') ||
                            (p.bookmatchTag &&
                              (p.bookmatchTag.includes('BM-FRONT') ||
                                p.bookmatchTag.includes('BM-BACK') ||
                                p.bookmatchTag.includes('BM-LEFT') ||
                                p.bookmatchTag.includes('BM-RIGHT') ||
                                p.bookmatchTag.includes('RND-')));
                          return !isLatakStrip;
                        });

                        // Apply customRoomOrder if the user swapped any pieces in the room;
                        // In 4-Slab Bookmatch Mode, group matching Zone pieces across Slab #1, #2, #3, #4 ([S1-A, S2-A, S3-A, S4-A], [S1-B, S2-B, S3-B, S4-B], ...) together!
                        const orderedRoomPieces = [...filteredRoomPieces].sort((a, b) => {
                          const idxA = customRoomOrder.indexOf(a.instanceId);
                          const idxB = customRoomOrder.indexOf(b.instanceId);
                          if (idxA !== -1 || idxB !== -1) {
                            if (idxA === -1) return 1;
                            if (idxB === -1) return -1;
                            return idxA - idxB;
                          }
                          if (fourSlabBookmatchMode) {
                            if (a.floorRow !== b.floorRow) return a.floorRow - b.floorRow;
                            if (a.floorCol !== b.floorCol) return a.floorCol - b.floorCol;
                          }
                          return 0;
                        });

                        // Helper to apply 1-Click Room Bookmatch Pattern across all orderedRoomPieces
                        const applyRoomBookmatchPreset = (
                          preset: 'diamond_4way' | 'mirror_lr' | 'mirror_tb' | 'straight' | 'checker_90'
                        ) => {
                          const cols = Math.max(1, floorColsCount);
                          const nextOverrides: Record<
                            string,
                            { flipH: boolean; flipV: boolean; rot90: boolean; rotDeg?: number }
                          > = {};
                          orderedRoomPieces.forEach((p, index) => {
                            const r = Math.floor(index / cols); // 0-indexed row
                            const c = index % cols; // 0-indexed col
                            if (preset === 'diamond_4way') {
                              nextOverrides[p.instanceId] = {
                                flipH: c % 2 === 1,
                                flipV: r % 2 === 1,
                                rot90: false,
                              };
                            } else if (preset === 'mirror_lr') {
                              nextOverrides[p.instanceId] = {
                                flipH: c % 2 === 1,
                                flipV: false,
                                rot90: false,
                              };
                            } else if (preset === 'mirror_tb') {
                              nextOverrides[p.instanceId] = {
                                flipH: false,
                                flipV: r % 2 === 1,
                                rot90: false,
                              };
                            } else if (preset === 'checker_90') {
                              nextOverrides[p.instanceId] = {
                                flipH: false,
                                flipV: false,
                                rot90: (r + c) % 2 === 1,
                              };
                            } else {
                              nextOverrides[p.instanceId] = {
                                flipH: false,
                                flipV: false,
                                rot90: false,
                              };
                            }
                          });
                          setTileFlipOverrides(nextOverrides);
                          toast({
                            title: tr('Room Bookmatch Pattern Applied!', 'کمرے میں بک میچ ڈیزائن سیٹ ہو گیا!'),
                            description: tr(
                              `Updated ${orderedRoomPieces.length} marble pieces in the room grid.`,
                              `کمرے کے تمام ${orderedRoomPieces.length} ماربل پیسز کی رگیں سیٹ کر دی گئیں۔`
                            ),
                          });
                        };

                        return (
                          <div className="space-y-3">
                            {/* Room Toolbar: Columns, 1-Click Bookmatch Presets, Hide Latak Toggle & Swap Instructions */}
                            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold text-amber-300">
                                  {tr('1-Click Room Bookmatch:', 'کمرے میں بک میچ سیٹ کریں:')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (floorColsCount < 2) setFloorColsCount(2);
                                    applyRoomBookmatchPreset('diamond_4way');
                                  }}
                                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow"
                                >
                                  {tr('💎 4-Tile Diamond Bookmatch', '💎 4 پیس ڈائمنڈ بک میچ')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyRoomBookmatchPreset('mirror_lr')}
                                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                                >
                                  {tr('🦋 2-Way Left/Right (A|B)', '🦋 دائیں بائیں بک میچ (A|B)')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyRoomBookmatchPreset('mirror_tb')}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                                >
                                  {tr('↕️ 2-Way Top/Bottom (A/B)', '↕️ اوپر نیچے بک میچ (A/B)')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyRoomBookmatchPreset('straight')}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold"
                                >
                                  {tr('🌊 Straight Vein', '🌊 سیدھی رگیں')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyRoomBookmatchPreset('checker_90')}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold"
                                >
                                  {tr('♟️ 90° Cross', '♟️ 90° کراس')}
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
                                  <span className="text-slate-300 font-semibold">
                                    {tr('Room Columns:', 'کمرے میں قطار کے پیس:')}
                                  </span>
                                  {[1, 2, 3, 4, 5, 6].map((colNum) => (
                                    <button
                                      key={colNum}
                                      type="button"
                                      onClick={() => setFloorColsCount(colNum)}
                                      className={`px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                                        floorColsCount === colNum
                                          ? 'bg-sky-600 text-white'
                                          : 'text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      {colNum}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setHideLatakInRoom((v) => !v)}
                                  className={`px-2.5 py-1 rounded border text-xs font-bold ${
                                    hideLatakInRoom
                                      ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-300'
                                      : 'border-slate-700 bg-slate-900 text-slate-300'
                                  }`}
                                >
                                  {hideLatakInRoom
                                    ? tr('Main Tiles Only (لٹک چھپی ہے)', 'صرف بڑے پیسز (لٹک چھپی ہے)')
                                    : tr('Showing Lataks Too', 'لٹک بھی شامل ہیں')}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowFloorSeamLines((v) => !v)}
                                  className="px-2.5 py-1 rounded border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold"
                                >
                                  {showFloorSeamLines
                                    ? tr('Seam Gap: ON', 'جوڑ لائن: آن')
                                    : tr('Zero-Joint Seamless', 'بغیر جوڑ (مکمل ملا ہوا)')}
                                </button>
                              </div>
                            </div>

                            {/* Swap Active Banner */}
                            {swapSourceInstanceId && (
                              <div className="rounded-md border border-amber-400 bg-amber-950/70 px-3 py-2 flex items-center justify-between text-xs text-amber-200">
                                <span>
                                  {tr(
                                    '🔄 Piece selected! Now click ANY second tile in the room below to SWAP their positions.',
                                    '🔄 پہلا پیس منتخب ہو گیا! اب کمرے میں کسی بھی دوسرے پیس پر کلک کریں تاکہ دونوں کی جگہ آپس میں بدل جائے۔'
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSwapSourceInstanceId(null)}
                                  className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold"
                                >
                                  {tr('Cancel', 'منسوخ')}
                                </button>
                              </div>
                            )}

                            {/* Scrollable Interactive Room Grid */}
                            <div
                              className={`${
                                isFullscreen ? 'max-h-none' : 'max-h-[580px]'
                              } overflow-y-auto rounded-lg border-2 border-slate-800 bg-slate-950 p-4`}
                            >
                              {orderedRoomPieces.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                  No cut pieces placed yet.
                                </div>
                              ) : (
                                <div
                                  className={`grid mx-auto ${
                                    isFullscreen ? 'max-w-7xl' : 'max-w-5xl'
                                  } ${showFloorSeamLines ? 'gap-1.5' : 'gap-0'}`}
                                  style={{
                                    gridTemplateColumns: `repeat(${floorColsCount}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {orderedRoomPieces.map((piece, roomIdx) => {
                                    const slabVis = getSlabVisualConfig(piece.slabIndex);
                                    const slabObj = summary.slabs.find(
                                      (s) => s.slabIndex === piece.slabIndex
                                    );
                                    const sLen = slabObj?.slabLength || slabConfig.length || 110;
                                    const sWid = slabObj?.slabWidth || slabConfig.width || 60;

                                    const bgWidthPct = (sLen / Math.max(1, piece.width)) * 100;
                                    const bgHeightPct = (sWid / Math.max(1, piece.height)) * 100;
                                    const posX =
                                      sLen > piece.width
                                        ? (piece.x / (sLen - piece.width)) * 100
                                        : 0;
                                    const posY =
                                      sWid > piece.height
                                        ? (piece.y / (sWid - piece.height)) * 100
                                        : 0;

                                    const rRow = Math.floor(roomIdx / Math.max(1, floorColsCount)) + 1;
                                    const rCol = (roomIdx % Math.max(1, floorColsCount)) + 1;

                                    const slabMod4 = (piece.slabIndex - 1) % 4;
                                    const tileOv = tileFlipOverrides[piece.instanceId] || {
                                      flipH: fourSlabBookmatchMode
                                        ? slabMod4 === 1 || slabMod4 === 3
                                        : !!piece.isMirroredBookmatch ||
                                          slabVis.mirrorMode === 'flip_h' ||
                                          slabVis.mirrorMode === 'flip_both',
                                      flipV: fourSlabBookmatchMode
                                        ? slabMod4 === 2 || slabMod4 === 3
                                        : slabVis.mirrorMode === 'flip_v' ||
                                          slabVis.mirrorMode === 'flip_both',
                                      rot90: false,
                                      rotDeg: 0,
                                    };

                                    const isSwapSelected =
                                      swapSourceInstanceId === piece.instanceId;
                                    const isSelected =
                                      activeHighlightedPiece?.instanceId === piece.instanceId ||
                                      isSwapSelected;

                                    // Shape clip-path / border radius for Round Table, Oval, Octagon, or Degree Cuts inside the room!
                                    const shType = piece.shapeCutType || 'rect_90';
                                    const shapeStyle: React.CSSProperties =
                                      shType === 'round_table' || shType === 'oval_table'
                                        ? { borderRadius: '9999px' }
                                        : shType === 'half_round'
                                        ? { borderRadius: '9999px 9999px 8px 8px' }
                                        : shType === 'octagon_45'
                                        ? {
                                            clipPath:
                                              'polygon(28% 0%, 72% 0%, 100% 28%, 100% 72%, 72% 100%, 28% 100%, 0% 72%, 0% 28%)',
                                          }
                                        : shType === 'triangle_winder'
                                        ? { clipPath: 'polygon(0% 0%, 100% 100%, 0% 100%)' }
                                        : shType === 'degree_1_side'
                                        ? { clipPath: 'polygon(0% 0%, 82% 0%, 100% 100%, 0% 100%)' }
                                        : shType === 'degree_2_sides'
                                        ? { clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }
                                        : {};

                                    return (
                                      <div
                                        key={piece.instanceId}
                                        onMouseEnter={() => setHoveredPiece(piece)}
                                        onMouseLeave={() => setHoveredPiece(null)}
                                        onClick={() => {
                                          setSelectedPieceId(piece.instanceId);
                                          if (!swapSourceInstanceId) {
                                            setSwapSourceInstanceId(piece.instanceId);
                                          } else if (swapSourceInstanceId === piece.instanceId) {
                                            setSwapSourceInstanceId(null);
                                          } else {
                                            // Swap the two pieces in customRoomOrder!
                                            const currentIds = orderedRoomPieces.map(
                                              (x) => x.instanceId
                                            );
                                            const idx1 = currentIds.indexOf(swapSourceInstanceId);
                                            const idx2 = currentIds.indexOf(piece.instanceId);
                                            if (idx1 !== -1 && idx2 !== -1) {
                                              const nextIds = [...currentIds];
                                              const temp = nextIds[idx1];
                                              nextIds[idx1] = nextIds[idx2];
                                              nextIds[idx2] = temp;
                                              setCustomRoomOrder(nextIds);
                                              toast({
                                                title: tr(
                                                  'Marble Pieces Swapped in Room!',
                                                  'کمرے میں دونوں ماربل پیسز کی جگہ تبدیل ہو گئی!'
                                                ),
                                              });
                                            }
                                            setSwapSourceInstanceId(null);
                                          }
                                        }}
                                        style={shapeStyle}
                                        className={`relative aspect-[4/3] overflow-hidden cursor-pointer group transition-all ${
                                          isSwapSelected
                                            ? 'ring-4 ring-amber-400 z-20 scale-[0.98]'
                                            : isSelected
                                            ? 'ring-2 ring-sky-400 z-10'
                                            : showFloorSeamLines
                                            ? 'border border-slate-700'
                                            : ''
                                        }`}
                                      >
                                        {/* Exact Cropped Marble Texture from Source Slab */}
                                        <div
                                          className="w-full h-full bg-no-repeat transition-transform duration-150"
                                          style={{
                                            backgroundImage: `url("${slabVis.imageUrl}")`,
                                            backgroundSize: `${bgWidthPct}% ${bgHeightPct}%`,
                                            backgroundPosition: `${posX}% ${posY}%`,
                                            filter: hdContrastBoost
                                              ? 'contrast(1.07) saturate(1.05)'
                                              : 'none',
                                            transform: `scale(${tileOv.flipH ? -1 : 1}, ${
                                              tileOv.flipV ? -1 : 1
                                            }) rotate(${
                                              (tileOv.rot90 ? 90 : 0) + (tileOv.rotDeg || 0)
                                            }deg)`,
                                          }}
                                        />

                                        {/* Top Badge: Piece Code, Slab # & Room Row-Col */}
                                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-sky-300">
                                            [{piece.pieceCode}] S#{piece.slabIndex}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/50 text-[10px] font-mono font-bold text-amber-300">
                                            Room R{rRow}-C{rCol}
                                          </span>
                                        </div>

                                        {/* Bottom Badge: Dimensions + Flip H / Flip V / 90° Rotate Controls */}
                                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
                                          <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] text-white font-semibold truncate">
                                            {shType === 'round_table'
                                              ? `⭕ Ø${formatNum(piece.width)}"`
                                              : `W:${formatNum(piece.height)}×L:${formatNum(piece.width)}`}
                                          </div>

                                          <div
                                            className="flex items-center gap-0.5 bg-slate-950/95 rounded p-0.5 border border-slate-700"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setTileFlipOverrides((prev) => ({
                                                  ...prev,
                                                  [piece.instanceId]: {
                                                    ...tileOv,
                                                    flipH: !tileOv.flipH,
                                                  },
                                                }))
                                              }
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                tileOv.flipH
                                                  ? 'bg-sky-600 text-white'
                                                  : 'text-slate-300 hover:text-white'
                                              }`}
                                              title="Flip Horizontal (Bookmatch Left-Right)"
                                            >
                                              ↔
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setTileFlipOverrides((prev) => ({
                                                  ...prev,
                                                  [piece.instanceId]: {
                                                    ...tileOv,
                                                    flipV: !tileOv.flipV,
                                                  },
                                                }))
                                              }
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                tileOv.flipV
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'text-slate-300 hover:text-white'
                                              }`}
                                              title="Flip Vertical (Bookmatch Top-Bottom)"
                                            >
                                              ↕
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setTileFlipOverrides((prev) => ({
                                                  ...prev,
                                                  [piece.instanceId]: {
                                                    ...tileOv,
                                                    rot90: !tileOv.rot90,
                                                  },
                                                }))
                                              }
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                tileOv.rot90
                                                  ? 'bg-amber-500 text-slate-950'
                                                  : 'text-slate-300 hover:text-white'
                                              }`}
                                              title="Rotate 90°"
                                            >
                                              ↻90°
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {/* =====================================================================
                        MODE B: FULL ROOM SIZE & MARBLE TILE BOOKMATCH PLANNER
                        Enter Room Width × Length (Feet) + Tile Size (Inches) + Bookmatch Pattern
                       ===================================================================== */}
                    {roomDiagramMode === 'full_room_planner' &&
                      (() => {
                        const rWidIn = Math.max(24, (Number(roomPlanWidthFt) || 12) * 12);
                        const rLenIn = Math.max(24, (Number(roomPlanLengthFt) || 16) * 12);
                        const tWid = Math.max(6, Number(roomTileWidIn) || 24);
                        const tLen = Math.max(6, Number(roomTileLenIn) || 48);

                        const colsNeeded = Math.max(1, Math.min(12, Math.ceil(rLenIn / tLen)));
                        const rowsNeeded = Math.max(1, Math.min(12, Math.ceil(rWidIn / tWid)));
                        const totalRoomTiles = colsNeeded * rowsNeeded;
                        const totalRoomSqFt = Number(
                          ((rWidIn * rLenIn) / 144).toFixed(1)
                        );

                        return (
                          <div className="space-y-4">
                            {/* Room Dimensions, Tile Size & Bookmatch Pattern Bar */}
                            <div className="rounded-lg border border-emerald-500/40 bg-slate-950 p-3.5 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
                                <div>
                                  <Label className="text-[11px] font-bold text-amber-300 block mb-1">
                                    {tr('1. Room Width (Feet)', '1. کمرے کی چوڑائی (فٹ)')}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="4"
                                    max="100"
                                    value={roomPlanWidthFt}
                                    onChange={(e) =>
                                      setRoomPlanWidthFt(Math.max(0, Number(e.target.value)))
                                    }
                                    className="h-8 bg-slate-900 border-amber-500/60 text-white font-mono text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] font-bold text-sky-300 block mb-1">
                                    {tr('2. Room Length (Feet)', '2. کمرے کی لمبائی (فٹ)')}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="4"
                                    max="100"
                                    value={roomPlanLengthFt}
                                    onChange={(e) =>
                                      setRoomPlanLengthFt(Math.max(0, Number(e.target.value)))
                                    }
                                    className="h-8 bg-slate-900 border-sky-500/60 text-white font-mono text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] font-bold text-emerald-300 block mb-1">
                                    {tr('Tile Width (Inches)', 'ٹائل/پیس چوڑائی (انچ)')}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="6"
                                    max="120"
                                    value={roomTileWidIn}
                                    onChange={(e) =>
                                      setRoomTileWidIn(Math.max(0, Number(e.target.value)))
                                    }
                                    className="h-8 bg-slate-900 border-emerald-500/60 text-white font-mono text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] font-bold text-emerald-300 block mb-1">
                                    {tr('Tile Length (Inches)', 'ٹائل/پیس لمبائی (انچ)')}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="6"
                                    max="120"
                                    value={roomTileLenIn}
                                    onChange={(e) =>
                                      setRoomTileLenIn(Math.max(0, Number(e.target.value)))
                                    }
                                    className="h-8 bg-slate-900 border-emerald-500/60 text-white font-mono text-xs font-bold"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setParts((prev) => [
                                        ...prev,
                                        {
                                          id: `room-tiles-${Date.now()}`,
                                          label: tr(
                                            `Room Bookmatch Tile (${tWid}"×${tLen}")`,
                                            `کمرے کی بک میچ ٹائل (${tWid}"×${tLen}")`
                                          ),
                                          width: tWid,
                                          length: tLen,
                                          quantity: totalRoomTiles,
                                          allowRotation: false,
                                          isBookmatchedPair: true,
                                          installZone: 'floor',
                                          priority: 'high',
                                          color: '#0284C7',
                                        },
                                      ]);
                                      toast({
                                        title: tr(
                                          `Added ${totalRoomTiles} Room Bookmatch Tiles to Cut List!`,
                                          `کمرے کی ${totalRoomTiles} بک میچ ٹائلیں (${tWid}"×${tLen}") کٹنگ لسٹ میں شامل ہو گئیں!`
                                        ),
                                      });
                                    }}
                                    className="w-full h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>
                                      {tr(
                                        `Send ${totalRoomTiles} Tiles (${tWid}"×${tLen}") to Slab Cutter`,
                                        `${totalRoomTiles} ٹائلیں (${tWid}"×${tLen}") سلیب کٹنگ میں بھیجیں`
                                      )}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Quick Tile Size Presets + Room Bookmatch Mode Buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {tr('Tile Sizes:', 'مشہور ٹائل/سلیب سائز:')}
                                  </span>
                                  {[
                                    { w: 24, l: 24, label: '24"×24"' },
                                    { w: 24, l: 48, label: '24"×48"' },
                                    { w: 32, l: 64, label: '32"×64"' },
                                    { w: 36, l: 60, label: '36"×60"' },
                                    { w: 12, l: 24, label: '12"×24"' },
                                  ].map((sz) => (
                                    <button
                                      key={sz.label}
                                      type="button"
                                      onClick={() => {
                                        setRoomTileWidIn(sz.w);
                                        setRoomTileLenIn(sz.l);
                                      }}
                                      className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                                        tWid === sz.w && tLen === sz.l
                                          ? 'bg-emerald-600 border-emerald-400 text-white'
                                          : 'bg-slate-900 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      {sz.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex flex-wrap items-center gap-1">
                                  {(
                                    [
                                      {
                                        id: 'diamond_4way',
                                        en: '💎 4-Tile Diamond BM',
                                        ur: '💎 4 ٹائل ڈائمنڈ بک میچ',
                                      },
                                      {
                                        id: 'mirror_2way_h',
                                        en: '🦋 2-Way Mirror (A|B)',
                                        ur: '🦋 دائیں بائیں بک میچ',
                                      },
                                      {
                                        id: 'mirror_2way_v',
                                        en: '↕️ Top-Bottom Mirror',
                                        ur: '↕️ اوپر نیچے بک میچ',
                                      },
                                      {
                                        id: 'straight_vein',
                                        en: '🌊 Straight Vein',
                                        ur: '🌊 سیدھی رگیں',
                                      },
                                      {
                                        id: 'center_round_table',
                                        en: '⭕ Room + Round Table',
                                        ur: '⭕ کمرہ + درمیان میں گول ٹیبل',
                                      },
                                    ] as const
                                  ).map((pat) => (
                                    <button
                                      key={pat.id}
                                      type="button"
                                      onClick={() => {
                                        setRoomBmPattern(pat.id);
                                        setRoomTileCustomFlips({});
                                      }}
                                      className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
                                        roomBmPattern === pat.id
                                          ? 'border-amber-400 bg-amber-500 text-slate-950 shadow'
                                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      {tr(pat.en, pat.ur)}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Live Vein Position Sliders so user can slide the marble vein inside the tiles! */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 items-center text-xs">
                                <div>
                                  <div className="flex justify-between text-[11px] text-sky-300 font-semibold mb-0.5">
                                    <span>
                                      {tr('Slide Vein Left/Right in Tile:', 'ٹائل میں رگوں کو دائیں بائیں سیٹ کریں:')}
                                    </span>
                                    <span className="font-mono">{roomCropOffsetX}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={roomCropOffsetX}
                                    onChange={(e) => setRoomCropOffsetX(Number(e.target.value))}
                                    className="w-full accent-sky-500 cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between text-[11px] text-amber-300 font-semibold mb-0.5">
                                    <span>
                                      {tr('Slide Vein Up/Down in Tile:', 'ٹائل میں رگوں کو اوپر نیچے سیٹ کریں:')}
                                    </span>
                                    <span className="font-mono">{roomCropOffsetY}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={roomCropOffsetY}
                                    onChange={(e) => setRoomCropOffsetY(Number(e.target.value))}
                                    className="w-full accent-amber-500 cursor-pointer"
                                  />
                                </div>
                                <div className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-[11px] flex items-center justify-between">
                                  <span className="text-slate-300">
                                    {tr('Room Summary:', 'کمرے کا خلاصہ:')}
                                  </span>
                                  <span className="text-emerald-400 font-bold">
                                    {rowsNeeded}×{colsNeeded} = {totalRoomTiles} Tiles ({totalRoomSqFt} ft²)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Full Room Floor Preview with Click-to-Flip/Rotate on Every Tile + Optional Center Bookmatch Round Table */}
                            <div className="relative rounded-xl border-2 border-slate-700 bg-slate-950 p-4 overflow-hidden shadow-inner">
                              <div
                                className={`grid mx-auto max-w-5xl ${
                                  showFloorSeamLines ? 'gap-1' : 'gap-0'
                                }`}
                                style={{
                                  gridTemplateColumns: `repeat(${colsNeeded}, minmax(0, 1fr))`,
                                }}
                              >
                                {Array.from({ length: totalRoomTiles }, (_, tIdx) => {
                                  const r = Math.floor(tIdx / colsNeeded);
                                  const c = tIdx % colsNeeded;
                                  const tileKey = `${r}-${c}`;
                                  const custom = roomTileCustomFlips[tileKey];

                                  const defaultFlipH =
                                    roomBmPattern === 'diamond_4way' ||
                                    roomBmPattern === 'center_round_table' ||
                                    roomBmPattern === 'mirror_2way_h'
                                      ? c % 2 === 1
                                      : false;
                                  const defaultFlipV =
                                    roomBmPattern === 'diamond_4way' ||
                                    roomBmPattern === 'center_round_table' ||
                                    roomBmPattern === 'mirror_2way_v'
                                      ? r % 2 === 1
                                      : false;

                                  const flipH =
                                    custom?.flipH !== undefined ? custom.flipH : defaultFlipH;
                                  const flipV =
                                    custom?.flipV !== undefined ? custom.flipV : defaultFlipV;
                                  const rot90 = custom?.rot90 || false;

                                  return (
                                    <div
                                      key={tileKey}
                                      onClick={() => {
                                        // Clicking any tile cycles its Bookmatch Mirror orientation!
                                        setRoomTileCustomFlips((prev) => {
                                          const cur = prev[tileKey] || {
                                            flipH,
                                            flipV,
                                            rot90,
                                          };
                                          if (!cur.flipH && !cur.flipV) {
                                            return { ...prev, [tileKey]: { ...cur, flipH: true, flipV: false } };
                                          }
                                          if (cur.flipH && !cur.flipV) {
                                            return { ...prev, [tileKey]: { ...cur, flipH: true, flipV: true } };
                                          }
                                          if (cur.flipH && cur.flipV) {
                                            return { ...prev, [tileKey]: { ...cur, flipH: false, flipV: true } };
                                          }
                                          return { ...prev, [tileKey]: { ...cur, flipH: false, flipV: false } };
                                        });
                                      }}
                                      style={{
                                        aspectRatio: `${tLen} / ${tWid}`,
                                      }}
                                      className={`relative overflow-hidden cursor-pointer group ${
                                        showFloorSeamLines ? 'border border-slate-800/80' : ''
                                      }`}
                                      title={tr(
                                        'Click tile to flip/mirror its veins in the room',
                                        'اس ٹائل کی رگوں کا رخ بدلنے کے لیے کلک کریں'
                                      )}
                                    >
                                      <div
                                        className="w-full h-full bg-no-repeat transition-transform duration-150"
                                        style={{
                                          backgroundImage: `url("${slabImageUrl}")`,
                                          backgroundSize: '185% 185%',
                                          backgroundPosition: `${roomCropOffsetX}% ${roomCropOffsetY}%`,
                                          transform: `scale(${flipH ? -1 : 1}, ${
                                            flipV ? -1 : 1
                                          }) rotate(${rot90 ? 90 : 0}deg)`,
                                        }}
                                      />
                                      <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-slate-950/75 text-[9px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                        R{r + 1}C{c + 1} {flipH ? '↔' : ''}{flipV ? '↕' : ''}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Optional Center 4-Way Bookmatched Round Table Overlay inside the Room */}
                              {roomBmPattern === 'center_round_table' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-amber-400 shadow-[0_0_40px_rgba(0,0,0,0.85)] overflow-hidden grid grid-cols-2 grid-rows-2">
                                    {[
                                      { q: 1, fh: false, fv: false },
                                      { q: 2, fh: true, fv: false },
                                      { q: 3, fh: false, fv: true },
                                      { q: 4, fh: true, fv: true },
                                    ].map((sec) => (
                                      <div key={sec.q} className="w-full h-full overflow-hidden">
                                        <div
                                          className="w-full h-full bg-no-repeat"
                                          style={{
                                            backgroundImage: `url("${slabImageUrl}")`,
                                            backgroundSize: '200% 200%',
                                            backgroundPosition: `${roomCropOffsetX}% ${roomCropOffsetY}%`,
                                            transform: `scale(${sec.fh ? -1 : 1}, ${
                                              sec.fv ? -1 : 1
                                            })`,
                                          }}
                                        />
                                      </div>
                                    ))}
                                    {/* Center Lazy Susan Disc */}
                                    <div className="absolute inset-[28%] rounded-full border-2 border-dashed border-white/80 flex items-center justify-center bg-slate-950/35">
                                      <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-amber-400 text-[10px] font-mono font-bold text-amber-300">
                                        ⭕ BM Round Ø{roomCenterTableDiam}&quot;
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      </>
                    )}
                    </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}

            {/* =====================================================================
                DEDICATED TOP TAB: COMPUTER SAVED STOCK INVENTORY & MULTI-STOCK COMBINER
                (کمپیوٹر اسٹاک انونٹری، استعمال شدہ سلیبوں کا حساب، اور ایک سے زائد اسٹاک جمع کرنے کا سسٹم)
               ===================================================================== */}
            {activeResultTab === 'stock_inventory' && (
              <div className="p-4 md:p-5 space-y-5 bg-slate-950 text-white" dir={cadLang === 'ur' ? 'rtl' : 'ltr'}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-emerald-300 flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-emerald-400" />
                      <span>
                        {tr(
                          'Computer Saved Stock Inventory & Multi-Stock Selector',
                          'کمپیوٹر میں محفوظ ماربل اسٹاک انونٹری اور ملٹی اسٹاک سلیکشن'
                        )}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {tr(
                        'Inspect every stock saved on your computer, check how many slabs are available vs used in cutting, or check multiple stocks to combine them into one cutting job.',
                        'یہاں کمپیوٹر میں محفوظ ہر اسٹاک کی مکمل تفصیل دیکھیں (کس اسٹاک میں کتنی سلیبیں پڑی ہیں، کتنی استعمال ہو رہی ہیں اور کتنی باقی ہیں) اور ایک یا ایک سے زائد اسٹاک جمع کر کے کٹنگ کریں۔'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveCurrentSlabToStock(false)}
                      className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {tr('💾 Save Current Slab to Computer', '💾 موجودہ سلیب کمپیوٹر میں سیو کریں')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveUsableOffcutsToStock}
                      className="px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {tr('♻️ Save Leftover Offcuts', '♻️ بچے ہوئے ٹکڑے (Offcuts) سیو کریں')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeductUsedSlabsFromStock}
                      className="px-3 py-2 rounded-md bg-rose-900 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Scissors className="h-4 w-4" />
                      <span>
                        {tr(
                          `✂️ Deduct ${summary.totalSlabsUsed} Used Slabs`,
                          `✂️ استعمال شدہ (${summary.totalSlabsUsed}) سلیب منہا کریں`
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Multi-Stock Combiner Bar (ایک سے زائد سٹاک جمع کرنے کا بٹن) */}
                <div className="rounded-lg border border-amber-500/50 bg-slate-900 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-300">
                      {tr(
                        `Combine Multiple Stocks for Cutting (${selectedMultiStockIds.length} Stock(s) Checked):`,
                        `ایک سے زائد اسٹاک جمع کریں (${selectedMultiStockIds.length} اسٹاک منتخب ہیں):`
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {tr(
                        'Tick the checkboxes on 2 or more stocks below and click "Combine & Load" to use slabs from multiple stocks in one cutting job.',
                        'نیچے لسٹ میں سے جن جن اسٹاکس سے ماربل لینا ہے ان پر ٹک (✓) لگائیں اور "منتخب اسٹاکس جمع کریں" بٹن دبائیں۔'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplyCombinedStocksToOptimizer()}
                      className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Layers className="h-4 w-4" />
                      <span>
                        {tr(
                          `⚡ Combine & Load (${selectedMultiStockIds.length}) Selected Stock(s)`,
                          `⚡ منتخب اسٹاکس جمع کر کے کٹنگ میں لوڈ کریں (${selectedMultiStockIds.length})`
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSavedStockCSV}
                      className={cadBtnSecondary}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{tr('Export Excel', 'ایکسپورٹ Excel')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSavedStockJSON}
                      className={cadBtnSecondary}
                    >
                      <Download className="h-3.5 w-3.5 text-sky-400" />
                      <span>{tr('Backup File', 'بیک اپ فائل')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => stockJsonImportRef.current?.click()}
                      className={cadBtnSecondary}
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      <span>{tr('Restore Backup', 'بیک اپ لوڈ')}</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Stock Inventory Table / Cards */}
                <div className="space-y-3">
                  {savedStockList.map((item) => {
                    const isChecked = selectedMultiStockIds.includes(item.id);
                    const isCurrentlyActiveLot =
                      slabConfig.lotId.toLowerCase().includes(item.lotId.toLowerCase());
                    const usedFromThisStock = isCurrentlyActiveLot
                      ? Math.min(item.quantity, summary.totalSlabsUsed)
                      : 0;
                    const remainingAfterJob = Math.max(0, item.quantity - usedFromThisStock);
                    const factor = item.unit === 'in' ? 144 : 929.0304;
                    const singleSqFt = (item.width * item.length) / factor;
                    const totalSqFt = singleSqFt * item.quantity;
                    const totalValPKR = Math.round(totalSqFt * item.ratePerSqFt);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors ${
                          isChecked
                            ? 'border-amber-400 bg-slate-900'
                            : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {/* Multi-Stock Checkbox */}
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMultiStockSelection(item.id)}
                            className="h-5 w-5 accent-amber-500 rounded cursor-pointer mt-1 sm:mt-0 shrink-0"
                            title="Tick to combine this stock with other stocks"
                          />

                          {/* Thumbnail */}
                          <div className="relative h-16 w-28 rounded overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                            <div
                              className="w-full h-full bg-no-repeat bg-center"
                              style={{
                                backgroundImage: `url("${item.slabImageUrl}")`,
                                backgroundSize: `${item.masterFrameScale || 100}% ${item.masterFrameScale || 100}%`,
                              }}
                            />
                            <div className="absolute bottom-0.5 right-1 px-1 rounded bg-slate-950/90 text-[9px] font-mono text-amber-300 font-bold">
                              {item.width}×{item.length} {item.unit}
                            </div>
                          </div>

                          {/* Stock Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                              <span>{item.materialName}</span>
                              <span className="text-slate-500">·</span>
                              <span className="font-mono text-amber-300">{item.lotId}</span>
                              <span className="text-slate-500">·</span>
                              <span className="text-xs font-normal text-slate-300">
                                📍 {item.locationRack || 'Godown A'}
                              </span>
                              {item.quantity >= 4 && (
                                <>
                                  <span className="text-slate-500">·</span>
                                  <span className="text-xs font-semibold text-emerald-400">
                                    🦋 4-Slab Bookmatch Ready
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Detailed Inventory Breakdown: Size, Total Slabs, Used Slabs, Remaining Slabs, Area & Value */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
                              <div className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1">
                                <span className="text-[10px] text-slate-400 block">
                                  {tr('Slab Size (1.W×2.L)', 'سلیب سائز (چوڑائی×لمبائی)')}
                                </span>
                                <span className="font-bold text-amber-300 tabular-nums">
                                  {item.width} × {item.length} {item.unit} ({singleSqFt.toFixed(1)} ft²)
                                </span>
                              </div>

                              <div className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1">
                                <span className="text-[10px] text-slate-400 block">
                                  {tr('Total in Stock', 'کل موجود سلیبیں')}
                                </span>
                                <span className="font-bold text-white tabular-nums">
                                  {item.quantity} {tr('Slabs', 'سلیب')} ({totalSqFt.toFixed(1)} ft²)
                                </span>
                              </div>

                              <div className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1">
                                <span className="text-[10px] text-sky-300 block">
                                  {tr('Used in Cutting', 'کٹنگ میں استعمال ہو رہیں')}
                                </span>
                                <span className="font-bold text-sky-400 tabular-nums">
                                  {usedFromThisStock} {tr('Slabs', 'سلیب')}
                                </span>
                              </div>

                              <div className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1">
                                <span className="text-[10px] text-emerald-300 block">
                                  {tr('Remaining Balance', 'کٹنگ کے بعد بقیہ')}
                                </span>
                                <span className="font-bold text-emerald-400 tabular-nums">
                                  {remainingAfterJob} {tr('Slabs', 'سلیب')}
                                </span>
                              </div>

                              <div className="rounded bg-slate-950 border border-slate-800 px-2.5 py-1">
                                <span className="text-[10px] text-slate-400 block">
                                  {tr('Rate & Stock Value', 'ریٹ اور کل مالیت')}
                                </span>
                                <span className="font-bold text-slate-200 tabular-nums">
                                  PKR {item.ratePerSqFt}/ft² · {totalValPKR.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions: +/- Qty, Load Single Stock, or Delete */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                          <div className="flex items-center rounded-md border border-slate-700 bg-slate-950 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustSavedStockQty(item.id, -1)}
                              className="px-2 py-1 rounded hover:bg-slate-800 text-rose-300 font-mono font-bold text-xs"
                            >
                              −
                            </button>
                            <span className="px-2.5 text-xs font-mono font-bold text-white tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustSavedStockQty(item.id, 1)}
                              className="px-2 py-1 rounded hover:bg-slate-800 text-emerald-300 font-mono font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleLoadStockItemIntoOptimizer(item);
                              setActiveResultTab('dual_diagrams');
                            }}
                            className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {tr('⚡ Use This Stock', '⚡ اس اسٹاک سے ماربل لیں')}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSavedStockItem(item.id)}
                            className="p-2 rounded-md bg-slate-950 hover:bg-rose-600 text-rose-300 hover:text-white border border-slate-700"
                            title="Delete Stock"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 3: MULTI-SLAB BLOCK INVENTORY & DEFECT / CRACK MANAGER (1 to 50 Slabs)
               ===================================================================== */}
            {activeResultTab === 'slab_manager' && (
              <div className="p-4 md:p-5 space-y-5 bg-slate-950 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-sky-400" />
                      <span>
                        {tr(
                          `Block Slabs Texture, Size & Crack Manager (Slabs #1 to #${slabConfig.quantity})`,
                          `بلاک کی تمام سلیبوں کا الگ الگ ٹیکسچر، سائز اور کریک (ٹوٹ پھوٹ) سسٹم (سلیب #1 تا #${slabConfig.quantity})`
                        )}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tr(
                        'Configure individual photos, frames, bookmatch mirror settings, or crack/damage zones for each slab in the block.',
                        'اگر بلاک میں 10، 20 یا 50 سلیبیں ہیں اور ہر سلیب کا ٹوٹنے کے بعد ٹیکسچر مختلف ہے، تو یہاں ہر سلیب کی الگ تصویر، فریم، بک میچ مرر یا کریک سیٹ کریں۔'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bulkSlabsInputRef.current?.click()}
                      className={cadBtnPrimary}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{tr('Bulk Upload Slab Photos', 'اکٹھی کئی سلیب تصاویر اپ لوڈ کریں')}</span>
                    </button>
                  </div>
                </div>

                {/* Crack / Defect Zone Adder Box */}
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>
                      {tr(
                        'Mark Crack / Damaged Area on Any Slab',
                        'ٹوٹے ہوئے یا کریک حصے کو کٹنگ سے بچائیں'
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
                    <div>
                      <Label className="text-[11px] text-slate-300">
                        {tr('Slab #', 'سلیب نمبر')}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max={slabConfig.quantity}
                        value={defectSlabTarget}
                        onChange={(e) =>
                          setDefectSlabTarget(
                            Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                          )
                        }
                        className={hiContrastInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Crack X ({unit})</Label>
                      <Input
                        type="number"
                        value={newDefectX}
                        onChange={(e) => setNewDefectX(Number(e.target.value) || 0)}
                        className={hiContrastInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Crack Y ({unit})</Label>
                      <Input
                        type="number"
                        value={newDefectY}
                        onChange={(e) => setNewDefectY(Number(e.target.value) || 0)}
                        className={hiContrastInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Crack Length ({unit})</Label>
                      <Input
                        type="number"
                        value={newDefectW}
                        onChange={(e) => setNewDefectW(Number(e.target.value) || 1)}
                        className={hiContrastInputClass}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Crack Width ({unit})</Label>
                      <Input
                        type="number"
                        value={newDefectH}
                        onChange={(e) => setNewDefectH(Number(e.target.value) || 1)}
                        className={hiContrastInputClass}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleAddDefectToSlab(defectSlabTarget)}
                        className="w-full h-9 rounded-md border border-rose-500/60 bg-rose-950/80 hover:bg-rose-900 text-rose-100 text-xs font-semibold transition-colors"
                      >
                        {tr('+ Add Crack Zone', '+ کریک شامل کریں')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid of All Slabs in the Block (1..quantity) */}
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
                    isFullscreen ? 'max-h-none' : 'max-h-[480px]'
                  } overflow-y-auto pr-1`}
                >
                  {Array.from({ length: slabConfig.quantity }).map((_, idx) => {
                    const slabNum = idx + 1;
                    const vis = getSlabVisualConfig(slabNum);
                    return (
                      <div
                        key={slabNum}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-sky-300 font-mono font-bold text-xs">
                            Slab #{slabNum}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {vis.sourceLabel}
                          </span>
                        </div>

                        <div
                          onClick={() => openFrameCalibrator(slabNum)}
                          className="relative h-28 w-full rounded-md overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer"
                        >
                          <div
                            className="w-full h-full bg-no-repeat bg-center"
                            style={{
                              backgroundImage: `url("${vis.imageUrl}")`,
                              backgroundSize: `${vis.frameScale}% ${vis.frameScale}%`,
                              backgroundPosition: `${50 + vis.frameOffsetX}% ${
                                50 + vis.frameOffsetY
                              }%`,
                              transform: `scale(${
                                vis.mirrorMode === 'flip_h' || vis.mirrorMode === 'flip_both'
                                  ? -1
                                  : 1
                              }, ${
                                vis.mirrorMode === 'flip_v' || vis.mirrorMode === 'flip_both'
                                  ? -1
                                  : 1
                              })`,
                            }}
                          />
                          {vis.defects.length > 0 && (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/60 text-rose-200 text-[10px] font-bold">
                              {vis.defects.length} Crack Zone(s)
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSlabOverview(slabNum)}
                            className="h-7 px-2 rounded border border-amber-500/60 bg-amber-950/70 hover:bg-amber-800 text-amber-200 text-[10px] font-bold flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3 text-amber-400" />
                            <span>{tr('Overview', 'اوور ویو')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSlabSheet(slabNum)}
                            className="h-7 px-2 rounded border border-sky-500/60 bg-sky-950/70 hover:bg-sky-800 text-sky-200 text-[10px] font-bold flex items-center gap-1"
                          >
                            <Printer className="h-3 w-3 text-sky-400" />
                            <span>{tr('Print', 'پرنٹ')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSlabPdf(slabNum)}
                            className="h-7 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerSlabUpload(slabNum, false)}
                            className={cadBtnSubtle}
                          >
                            <Upload className="h-3 w-3 text-sky-400" />
                            <span>{tr('Change Photo', 'تصویر بدلیں')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openFrameCalibrator(slabNum)}
                            className={cadBtnSubtle}
                          >
                            <Crop className="h-3 w-3 text-sky-400" />
                            <span>{tr('Adjust Frame', 'فریم سیٹ کریں')}</span>
                          </button>
                          {vis.defects.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearDefectsOnSlab(slabNum)}
                              className="px-2 py-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[10px]"
                            >
                              {tr('Clear Cracks', 'کریک ہٹائیں')}
                            </button>
                          )}
                        </div>

                        {/* Mirror Mode Selector for this Slab */}
                        <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800 text-[10px]">
                          {(
                            [
                              { id: 'none', label: 'Normal' },
                              { id: 'flip_h', label: '↔ Flip H' },
                              { id: 'flip_v', label: '↕ Flip V' },
                              { id: 'flip_both', label: '180° Both' },
                            ] as const
                          ).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSetSlabMirror(slabNum, m.id)}
                              className={`py-1 rounded font-semibold border transition-colors ${
                                vis.mirrorMode === m.id
                                  ? 'bg-sky-600 border-sky-500 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: PROFESSIONAL REAL-DIMENSION BOOKMATCH STUDIO */}
            {activeResultTab === 'bookmatch' && (
              <BookmatchStudioPanel
                slabLength={slabConfig.length}
                slabWidth={slabConfig.width}
                unit={unit}
                slabImageUrl={slabImageUrl}
                cadLang={cadLang}
                bookmatchMode={bookmatchMode}
                setBookmatchMode={setBookmatchMode}
                bmPanelLength={bmPanelLength}
                setBmPanelLength={setBmPanelLength}
                bmPanelWidth={bmPanelWidth}
                setBmPanelWidth={setBmPanelWidth}
                bmOffsetX={bmOffsetX}
                setBmOffsetX={setBmOffsetX}
                bmOffsetY={bmOffsetY}
                setBmOffsetY={setBmOffsetY}
                bmShowSeam={bmShowSeam}
                setBmShowSeam={setBmShowSeam}
                bmInvertMirror={bmInvertMirror}
                setBmInvertMirror={setBmInvertMirror}
                onDownloadBookmatchImage={handleDownloadBookmatchImage}
                onAddBookmatchToCutList={handleAddBookmatchToCutList}
                onAddSpecialBookmatchSet={(items) => {
                  const newParts: CutPartInput[] = items.map((it, idx) => ({
                    id: `bm-special-${Date.now()}-${idx}`,
                    label: it.label,
                    width: Math.max(1, it.width),
                    length: Math.max(1, it.length),
                    quantity: Math.max(1, it.quantity),
                    allowRotation: it.latakCutMode === 'random_separate',
                    isBookmatchedPair: it.latakCutMode !== 'random_separate',
                    installZone: it.installZone || 'counter',
                    priority: 'high',
                    color: it.color || '#0284C7',
                    latakSides: it.latakSides || 'none',
                    latakSize: it.latakSize,
                    latakCutMode: it.latakCutMode || 'bookmatch_attached',
                  }));
                  setParts((prev) => [...prev, ...newParts]);
                  setActiveResultTab('dual_diagrams');
                  toast({
                    title: tr('Latak / Bookmatch Set Added to Cut List!', 'لٹک / بک میچ سیٹ کٹنگ لسٹ میں شامل ہو گیا!'),
                    description: tr(
                      'Added pieces with selected Latak sides & Bookmatch/Random cutting mode to the 2D Slab Diagram.',
                      'لٹک کی منتخب سائیڈوں اور بک میچ/رینڈم موڈ کے مطابق پیسز سلیب نقشے میں شامل کر دیے گئے ہیں۔'
                    ),
                  });
                }}
                toSqFt={toSqFt}
              />
            )}
            {false &&
              activeResultTab === 'bookmatch' &&
              (() => {
                const sLen = Math.max(1, Number(slabConfig.length) || 110);
                const sWid = Math.max(1, Number(slabConfig.width) || 60);
                const cutW = Math.min(sLen, Math.max(1, Number(bmPanelLength) || 52));
                const cutH = Math.min(sWid, Math.max(1, Number(bmPanelWidth) || 28));
                const maxStartX = Math.max(0, sLen - cutW);
                const maxStartY = Math.max(0, sWid - cutH);
                const cutX = Number(((bmOffsetX / 100) * maxStartX).toFixed(1));
                const cutY = Number(((bmOffsetY / 100) * maxStartY).toFixed(1));

                const leftRemLen = Number(Math.max(0, cutX).toFixed(1));
                const rightRemLen = Number(Math.max(0, sLen - (cutX + cutW)).toFixed(1));
                const topRemWid = Number(Math.max(0, cutY).toFixed(1));
                const bottomRemWid = Number(Math.max(0, sWid - (cutY + cutH)).toFixed(1));

                const totalSlabSqFt = toSqFt(sLen * sWid, unit);
                const cutPieceSqFt = toSqFt(cutW * cutH, unit);
                const remainingSqFt = Math.max(0, totalSlabSqFt - cutPieceSqFt);
                const usedPct =
                  totalSlabSqFt > 0 ? Math.min(100, (cutPieceSqFt / totalSlabSqFt) * 100) : 0;
                const remainingPct = Math.max(0, 100 - usedPct);

                const panelCount = bookmatchMode === '4way_quad' ? 4 : 2;
                const assembledLen =
                  bookmatchMode === '2way_v' ? cutW : Number((cutW * 2).toFixed(1));
                const assembledWid =
                  bookmatchMode === '2way_h' ? cutH : Number((cutH * 2).toFixed(1));

                // Exact CSS background crop percentages so the Bookmatch tiles show ONLY the cut rectangle (cutX, cutY, cutW, cutH)
                const bgWidthPct = (sLen / Math.max(0.5, cutW)) * 100;
                const bgHeightPct = (sWid / Math.max(0.5, cutH)) * 100;
                const bgPosX = maxStartX > 0 ? (cutX / maxStartX) * 100 : 0;
                const bgPosY = maxStartY > 0 ? (cutY / maxStartY) * 100 : 0;

                return (
                  <div
                    className="p-4 md:p-5 space-y-5 bg-slate-950 text-white"
                    dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
                  >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <FlipHorizontal className="h-5 w-5 text-sky-400" />
                          <span>
                            {tr(
                              'True-Scale Slab Bookmatch & Remnant Offcut Studio',
                              'پروفیشنل سلیب بک میچ اور بقیہ پتھر (Offcut) پیمائش اسٹوڈیو'
                            )}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {tr(
                            'Select the exact cut piece size and position on your uploaded Stock Slab to see (1) how much slab is cut, (2) exact remaining usable slab size, and (3) true-crop Bookmatch vein alignment.',
                            'اپنی اپ لوڈ کردہ اسٹاک سلیب میں سے بک میچ پیس کا سائز اور جگہ منتخب کریں: بائیں طرف دیکھیں کہ سلیب کا کتنا حصہ کٹ رہا ہے اور کتنا باقی بچ رہا ہے، اور دائیں طرف اسی کٹے ہوئے حصے کا اصل بک میچ دیکھیں۔'
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadBookmatchImage}
                          className={cadBtnSecondary}
                        >
                          <Download className="h-3.5 w-3.5 text-sky-400" />
                          <span>{tr('Download Bookmatch PNG', 'بک میچ تصویر ڈاؤن لوڈ')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBookmatchToCutList}
                          className={cadBtnPrimary}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            {tr(
                              `Add ${panelCount} Bookmatch Panels to Cut List`,
                              `${panelCount} بک میچ پیسز کٹنگ لسٹ میں شامل کریں`
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 4-Card Engineering Breakdown: Full Slab vs Cut Area vs Remaining Area vs Offcut Dimensions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                        <div className="text-[11px] text-slate-400 font-semibold">
                          {tr('1. Full Stock Slab Size', '1. مکمل اسٹاک سلیب کا سائز')}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-lg font-mono font-bold text-white">
                            {sLen} × {sWid} {unit}
                          </span>
                          <span className="text-xs font-mono text-slate-300">
                            {totalSlabSqFt.toFixed(2)} sq.ft
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-sky-500/40 bg-sky-950/25 p-3">
                        <div className="text-[11px] text-sky-300 font-semibold">
                          {tr('2. Bookmatch Cut Area (Per Slab)', '2. بک میچ کے لیے کٹنے والا حصہ')}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-lg font-mono font-bold text-sky-400">
                            {cutW} × {cutH} {unit}
                          </span>
                          <span className="text-xs font-mono font-semibold text-sky-200">
                            {cutPieceSqFt.toFixed(2)} sq.ft ({usedPct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 p-3">
                        <div className="text-[11px] text-emerald-300 font-semibold">
                          {tr('3. Remaining Slab Area (Saved)', '3. سلیب کا باقی بچنے والا رقبہ')}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            {remainingSqFt.toFixed(2)} sq.ft
                          </span>
                          <span className="text-xs font-mono font-semibold text-emerald-200">
                            {remainingPct.toFixed(1)}% {tr('Remaining', 'باقی بچت')}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
                        <div className="text-[11px] text-amber-300 font-semibold">
                          {tr('4. Remaining Usable Offcut Sizes', '4. باقی بچنے والے ٹکڑوں کا سائز')}
                        </div>
                        <div className="mt-1 text-xs font-mono text-amber-100 space-y-0.5">
                          <div>
                            {tr('Right Strip:', 'دائیں بچت:')}{' '}
                            <strong className="text-white">
                              {rightRemLen} × {sWid} {unit}
                            </strong>
                          </div>
                          <div>
                            {tr('Bottom Strip:', 'نیچے بچت:')}{' '}
                            <strong className="text-white">
                              {cutW} × {bottomRemWid} {unit}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls Bar: Layout Mode, Cut Piece Dimensions & Exact Cut Position on Slab */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
                      {/* 1. Bookmatch Mirror Mode */}
                      <div className="lg:col-span-4 space-y-1.5">
                        <Label className="text-xs font-bold text-slate-200">
                          {tr('1. Bookmatch Mirror Layout', '1. بک میچ جوڑنے کا انداز')}
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBookmatchMode('2way_h')}
                            className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                              bookmatchMode === '2way_h'
                                ? 'border-sky-500 bg-sky-600 text-white'
                                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div>2-Way (A | B)</div>
                            <div className="text-[10px] font-normal opacity-80">
                              {tr('Left-Right', 'دائیں بائیں')}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookmatchMode('2way_v')}
                            className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                              bookmatchMode === '2way_v'
                                ? 'border-sky-500 bg-sky-600 text-white'
                                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div>2-Way (A / B)</div>
                            <div className="text-[10px] font-normal opacity-80">
                              {tr('Top-Bottom', 'اوپر نیچے')}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookmatchMode('4way_quad')}
                            className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                              bookmatchMode === '4way_quad'
                                ? 'border-sky-500 bg-sky-600 text-white'
                                : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div>4-Way Quad</div>
                            <div className="text-[10px] font-normal opacity-80">
                              {tr('4-Slab Diamond', 'چار سلیب ڈائمنڈ')}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 2. Cut Piece Size on the Stock Slab */}
                      <div className="lg:col-span-5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-200">
                            {tr(
                              `2. Cut Piece Size from ${sLen}×${sWid} ${unit} Slab`,
                              `2. سلیب (${sLen}×${sWid}) میں سے کٹنے والے پیس کا سائز (${unit})`
                            )}
                          </Label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setBmPanelLength(sLen);
                                setBmPanelWidth(sWid);
                                setBmOffsetX(0);
                                setBmOffsetY(0);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-sky-300 border border-slate-700"
                            >
                              {tr('Full Slab (100%)', 'مکمل سلیب')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBmPanelLength(Number((sLen / 2).toFixed(1)));
                                setBmPanelWidth(sWid);
                                setBmOffsetX(0);
                                setBmOffsetY(0);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-300 border border-slate-700"
                            >
                              {tr('Half Slab (50%)', 'آدھی سلیب')}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {tr(`Cut Length (Max ${sLen} ${unit})`, `کٹ لمبائی (زیادہ سے زیادہ ${sLen})`)}
                            </span>
                            <Input
                              type="number"
                              min="1"
                              max={sLen}
                              value={bmPanelLength}
                              onChange={(e) =>
                                setBmPanelLength(
                                  Math.min(sLen, Math.max(1, Number(e.target.value) || 1))
                                )
                              }
                              className={hiContrastInputClass}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">
                              {tr(`Cut Width (Max ${sWid} ${unit})`, `کٹ چوڑائی (زیادہ سے زیادہ ${sWid})`)}
                            </span>
                            <Input
                              type="number"
                              min="1"
                              max={sWid}
                              value={bmPanelWidth}
                              onChange={(e) =>
                                setBmPanelWidth(
                                  Math.min(sWid, Math.max(1, Number(e.target.value) || 1))
                                )
                              }
                              className={hiContrastInputClass}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Vein Meeting Direction & Seam Toggle */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <Label className="text-xs font-bold text-slate-200">
                          {tr('3. Vein Center Direction', '3. رگوں کے ملنے کا رخ')}
                        </Label>
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBmInvertMirror((v) => !v)}
                            className="w-full h-8 px-3 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
                            <span>
                              {bmInvertMirror
                                ? tr('Outer X-Vein Pattern', 'باہر کی طرف رگیں (X-Pattern)')
                                : tr('Center Diamond Vein', 'درمیان میں ڈائمنڈ رگیں')}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBmShowSeam((v) => !v)}
                            className="w-full h-7 px-3 rounded-md border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono"
                          >
                            {bmShowSeam
                              ? tr('Joint Hairline: ON', 'جوڑ کی لائن: آن')
                              : tr('Seamless View (No Line)', 'بغیر جوڑ لائن کے دیکھیں')}
                          </button>
                        </div>
                      </div>

                      {/* 4. Exact Cut Position Sliders on the Stock Slab (X & Y in real units) */}
                      <div className="lg:col-span-12 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-sky-300">
                              {tr(
                                `Move Cut Box Left / Right on Slab (Start X = ${cutX} ${unit})`,
                                `سلیب پر کٹنگ باکس دائیں / بائیں سرکائیں (شروع X = ${cutX} ${unit})`
                              )}
                            </span>
                            <span className="font-mono text-slate-400">
                              {tr(
                                `Left Rem: ${leftRemLen} · Right Rem: ${rightRemLen} ${unit}`,
                                `بائیں بچت: ${leftRemLen} · دائیں بچت: ${rightRemLen} ${unit}`
                              )}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            disabled={maxStartX <= 0}
                            value={bmOffsetX}
                            onChange={(e) => setBmOffsetX(Number(e.target.value))}
                            className="w-full accent-sky-500 cursor-pointer disabled:opacity-40"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-sky-300">
                              {tr(
                                `Move Cut Box Up / Down on Slab (Start Y = ${cutY} ${unit})`,
                                `سلیب پر کٹنگ باکس اوپر / نیچے سرکائیں (شروع Y = ${cutY} ${unit})`
                              )}
                            </span>
                            <span className="font-mono text-slate-400">
                              {tr(
                                `Top Rem: ${topRemWid} · Bottom Rem: ${bottomRemWid} ${unit}`,
                                `اوپر بچت: ${topRemWid} · نیچے بچت: ${bottomRemWid} ${unit}`
                              )}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            disabled={maxStartY <= 0}
                            value={bmOffsetY}
                            onChange={(e) => setBmOffsetY(Number(e.target.value))}
                            className="w-full accent-sky-500 cursor-pointer disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SIDE-BY-SIDE ENGINEERING VIEW:
                        LEFT = Source Stock Slab showing Exact Cut Area & Remaining Offcut Sizes
                        RIGHT = Assembled True-Crop Bookmatch Result */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* LEFT PANEL (5 cols): Source Stock Slab Cut & Remnant Map */}
                      <div className="lg:col-span-5 rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                              {tr(
                                'A. Source Stock Slab Cut & Remnant Map',
                                'الف: اصل اسٹاک سلیب — کٹنگ اور باقی بچنے والا حصہ'
                              )}
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              {tr(
                                `Stock Slab: ${sLen} × ${sWid} ${unit} · Cyan Box = Bookmatch Cut (${cutW} × ${cutH} ${unit})`,
                                `مکمل سلیب: ${sLen} × ${sWid} ${unit} · نیلا باکس = بک میچ کٹنگ (${cutW} × ${cutH} ${unit})`
                              )}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                            {remainingPct.toFixed(0)}% {tr('Saved', 'بچت')}
                          </span>
                        </div>

                        {/* Proportional Source Slab Diagram */}
                        <div
                          className="relative w-full overflow-hidden rounded-lg border-2 border-slate-600 bg-slate-950 shadow-inner"
                          style={{
                            aspectRatio: `${sLen} / ${sWid}`,
                          }}
                        >
                          {/* Full Slab Image Background (Dimmed outside the cut zone so remaining vs cut is crystal clear) */}
                          <div
                            className="absolute inset-0 bg-no-repeat bg-center opacity-35"
                            style={{
                              backgroundImage: `url("${slabImageUrl}")`,
                              backgroundSize: '100% 100%',
                            }}
                          />

                          {/* Remaining Right Offcut Hatch & Label */}
                          {rightRemLen > 0 && (
                            <div
                              className="absolute top-0 bottom-0 border-l border-dashed border-amber-400/70 bg-amber-950/25 flex items-center justify-center p-1 pointer-events-none"
                              style={{
                                left: `${((cutX + cutW) / sLen) * 100}%`,
                                width: `${(rightRemLen / sLen) * 100}%`,
                              }}
                            >
                              <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/50 text-[10px] font-mono font-bold text-amber-300 text-center">
                                <div>{tr('REMAINING', 'باقی بچت')}</div>
                                <div>
                                  {rightRemLen}×{sWid} {unit}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Remaining Bottom Offcut Hatch & Label */}
                          {bottomRemWid > 0 && (
                            <div
                              className="absolute border-t border-dashed border-emerald-400/70 bg-emerald-950/25 flex items-center justify-center p-1 pointer-events-none"
                              style={{
                                left: `${(cutX / sLen) * 100}%`,
                                top: `${((cutY + cutH) / sWid) * 100}%`,
                                width: `${(cutW / sLen) * 100}%`,
                                height: `${(bottomRemWid / sWid) * 100}%`,
                              }}
                            >
                              <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-emerald-500/50 text-[10px] font-mono font-bold text-emerald-300 text-center">
                                {tr('REM:', 'بچت:')} {cutW}×{bottomRemWid} {unit}
                              </div>
                            </div>
                          )}

                          {/* Active Bookmatch Cut Box (100% Bright Marble + Cyan CAD Border) */}
                          <div
                            className="absolute border-2 border-sky-400 shadow-[0_0_0_2px_rgba(2,6,23,0.85)] overflow-hidden"
                            style={{
                              left: `${(cutX / sLen) * 100}%`,
                              top: `${(cutY / sWid) * 100}%`,
                              width: `${(cutW / sLen) * 100}%`,
                              height: `${(cutH / sWid) * 100}%`,
                            }}
                          >
                            <div
                              className="w-full h-full bg-no-repeat"
                              style={{
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: `${bgWidthPct}% ${bgHeightPct}%`,
                                backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                              }}
                            />
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-sky-600/95 text-white font-mono text-[10px] font-bold shadow">
                              {tr('CUT:', 'کٹنگ:')} {cutW}×{cutH} {unit} ({cutPieceSqFt.toFixed(1)} ft²)
                            </div>
                          </div>

                          {/* Full Slab Outer Dimension Badge */}
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-slate-300">
                            {tr('Full Slab:', 'پوری سلیب:')} {sLen}×{sWid} {unit}
                          </div>
                        </div>

                        {/* Exact Numerical Breakdown Table */}
                        <div className="rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between text-slate-300">
                            <span>{tr('Full Stock Slab:', 'مکمل اسٹاک سلیب:')}</span>
                            <span className="font-bold text-white">
                              {sLen} × {sWid} {unit} = {totalSlabSqFt.toFixed(2)} sq.ft
                            </span>
                          </div>
                          <div className="flex justify-between text-sky-300">
                            <span>{tr('Cut for Bookmatch:', 'بک میچ کٹنگ سائز:')}</span>
                            <span className="font-bold">
                              {cutW} × {cutH} {unit} = {cutPieceSqFt.toFixed(2)} sq.ft ({usedPct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between text-emerald-400 border-t border-slate-800 pt-1">
                            <span>{tr('Remaining Usable Stone:', 'باقی بچنے والا پتھر:')}</span>
                            <span className="font-bold">
                              {remainingSqFt.toFixed(2)} sq.ft ({remainingPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT PANEL (7 cols): True-Crop Assembled Bookmatch Preview */}
                      <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                              {tr(
                                'B. Assembled Bookmatch Result (Cropped from Cut Box)',
                                'ب: تیار شدہ بک میچ لے آؤٹ (صرف منتخب کٹنگ حصے سے)'
                              )}
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              {tr(
                                `${panelCount} Mirrored Panels of ${cutW}×${cutH} ${unit} · Total Assembled Size: ${assembledLen} × ${assembledWid} ${unit} (${(cutPieceSqFt * panelCount).toFixed(2)} sq.ft)`,
                                `${panelCount} مرر پیسز (${cutW}×${cutH} ${unit}) · کل تیار بک میچ سائز: ${assembledLen} × ${assembledWid} ${unit} (${(cutPieceSqFt * panelCount).toFixed(2)} مربع فٹ)`
                              )}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-300 font-mono text-[11px] font-bold">
                            {assembledLen} × {assembledWid} {unit}
                          </span>
                        </div>

                        <div
                          className={`w-full mx-auto overflow-hidden rounded-lg border-2 border-slate-700 shadow-xl bg-slate-950 grid ${
                            bookmatchMode === '2way_v' ? 'grid-cols-1' : 'grid-cols-2'
                          }`}
                        >
                          {(bookmatchMode === '4way_quad'
                            ? [
                                { id: 'Slab A (Top-Left)', col: 0, row: 0 },
                                { id: 'Slab B (Top-Right Mirror)', col: 1, row: 0 },
                                { id: 'Slab C (Bottom-Left Mirror)', col: 0, row: 1 },
                                { id: 'Slab D (Bottom-Right Mirror)', col: 1, row: 1 },
                              ]
                            : bookmatchMode === '2way_v'
                            ? [
                                { id: 'Slab A (Top Cut)', col: 0, row: 0 },
                                { id: 'Slab B (Bottom Mirror)', col: 0, row: 1 },
                              ]
                            : [
                                { id: 'Slab A (Left Cut)', col: 0, row: 0 },
                                { id: 'Slab B (Right Mirror)', col: 1, row: 0 },
                              ]
                          ).map((quad) => {
                            const flipX = bmInvertMirror ? quad.col === 0 : quad.col === 1;
                            const flipY =
                              bmInvertMirror
                                ? quad.row === 0 && bookmatchMode !== '2way_h'
                                : quad.row === 1;

                            return (
                              <div
                                key={quad.id}
                                className={`relative overflow-hidden ${
                                  bmShowSeam ? 'border border-white/35' : ''
                                }`}
                                style={{
                                  aspectRatio: `${cutW} / ${cutH}`,
                                }}
                              >
                                <div
                                  className="w-full h-full bg-no-repeat"
                                  style={{
                                    backgroundImage: `url("${slabImageUrl}")`,
                                    backgroundSize: `${bgWidthPct}% ${bgHeightPct}%`,
                                    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                                    transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
                                  }}
                                />
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-mono font-bold text-white">
                                  {quad.id} · {cutW}×{cutH} {unit}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* TAB 4: SAW CUTTING SCHEDULE */}
            {activeResultTab === 'schedule' && (
              <div className="p-4 md:p-5 space-y-4 bg-slate-950 text-white">
                <div
                  className={`space-y-4 ${
                    isFullscreen ? 'max-h-none' : 'max-h-[520px]'
                  } overflow-y-auto`}
                >
                  {summary.slabs.map((slab) => (
                    <div
                      key={slab.slabIndex}
                      className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden"
                    >
                      <div className="bg-slate-950 px-4 py-2.5 text-xs font-bold text-white flex items-center justify-between border-b border-slate-800">
                        <span>
                          Slab #{slab.slabIndex} Cutting Sequence ({slab.cuts.length} Saw Operations)
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400">
                          Yield: {slab.yieldPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800 text-xs">
                        {slab.cuts.map((c) => (
                          <div
                            key={c.step}
                            className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/60"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="font-mono tabular-nums font-bold text-sky-400 w-7 shrink-0">
                                #{c.step}
                              </span>
                              <div>
                                <div className="font-medium text-white">
                                  {c.descriptionEn}
                                </div>
                                <div className="text-[11px] text-slate-300" dir="rtl">
                                  {c.descriptionUr}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-sky-300 font-bold">
                                {c.type === 'edge_trim'
                                  ? 'TRIM'
                                  : c.orientation === 'H'
                                  ? 'RIP (H)'
                                  : 'CROSS (V)'}
                              </span>
                              <span className="text-slate-300">
                                Len: {formatNum(c.length)} {unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: EXCEL BILL GENERATOR, SLAB RATES, CUTTING, POLISH, EDGE PROFILE & COMPUTER SAVED BILLS */}
            {activeResultTab === 'bom' && (
              <div
                className="p-4 md:p-5 space-y-5 bg-slate-950 text-white"
                dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
              >
                {/* Header & Rate Control Panel + 1-Click Excel Download */}
                <div className="rounded-xl border-2 border-emerald-500/60 bg-slate-900 p-4 space-y-3 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-extrabold uppercase">
                          {tr(
                            '📊 EXCEL BILL & COMPUTER AUTO-SAVE SYSTEM',
                            '📊 ایکسل بل جنریٹر اور کمپیوٹر آٹو سیو سسٹم'
                          )}
                        </span>
                        {computerLastSavedAt && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-emerald-500/50 text-emerald-300 font-mono text-[10px]">
                            {tr(
                              `✓ Auto-Saved on Your Computer (${computerLastSavedAt})`,
                              `✓ آپ کے کمپیوٹر میں خودکار سیو ہو چکا ہے (${computerLastSavedAt})`
                            )}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm md:text-base font-extrabold text-amber-300 mt-1">
                        {tr(
                          'Complete Excel Bill: Slab Sizes & Rates + Every Cut Piece with Cutting, Polish & Edge Profile',
                          'مکمل ایکسل بل: سلیبوں کے سائز اور ریٹ + ہر کٹنگ پیس کے ساتھ کٹنگ، پالش اور ایج پروفائل کا حساب'
                        )}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateExcelBill(true)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs md:text-sm flex items-center gap-2 shadow-lg border border-emerald-300/60"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>
                          {tr(
                            '📊 Generate Excel File (.xls) & Save to Computer',
                            '📊 ایکسل فائل جنریٹ کریں (.xls) اور کمپیوٹر میں سیو کریں'
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-300 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{tr('CSV Export', 'سی ایس وی فائل')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Rate Inputs for Slabs, Cutting, Surface Polish & Edge Profile */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-300">
                        {tr('Customer / Project Name', 'گاہک / پروجیکٹ کا نام')}
                      </Label>
                      <Input
                        value={billCustomerName}
                        onChange={(e) => setBillCustomerName(e.target.value)}
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-300">
                        {tr('Phone / Bill Note', 'فون نمبر / بل نوٹ')}
                      </Label>
                      <Input
                        value={billCustomerPhone}
                        onChange={(e) => setBillCustomerPhone(e.target.value)}
                        placeholder="0300-..."
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-extrabold text-emerald-300">
                        {tr('1. Slab Rate / Sq.Ft (PKR)', '1. سلیب ریٹ فی مربع فٹ (PKR)')}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={slabConfig.ratePerSqFt}
                        onChange={(e) =>
                          setSlabConfig((s) => ({
                            ...s,
                            ratePerSqFt: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="h-8 text-xs bg-slate-950 border-emerald-500/70 text-white font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-extrabold text-amber-300">
                        {tr('2. Saw Cutting Rate / R.Ft', '2. کٹنگ ریٹ فی رننگ فٹ (PKR)')}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={cuttingRatePerRft}
                        onChange={(e) =>
                          setCuttingRatePerRft(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="h-8 text-xs bg-slate-950 border-amber-500/70 text-white font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-extrabold text-sky-300">
                        {tr('3. Surface Polish / Sq.Ft', '3. فرنٹ پالش ریٹ فی مربع فٹ')}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={polishRatePerSqFt}
                        onChange={(e) =>
                          setPolishRatePerSqFt(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="h-8 text-xs bg-slate-950 border-sky-500/70 text-white font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-extrabold text-purple-300">
                        {tr('4. Edge Profile Rate / R.Ft', '4. ایج پروفائل / گولا ریٹ فی فٹ')}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={edgeProfileRatePerRft}
                        onChange={(e) =>
                          setEdgeProfileRatePerRft(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="h-8 text-xs bg-slate-950 border-purple-500/70 text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Grand Summary KPI Boxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                    <div className="rounded-lg border border-emerald-500/40 bg-slate-950 p-2.5">
                      <div className="text-[10px] text-emerald-300 font-bold">
                        {tr(
                          `1. Slabs Total (${summary.totalSlabsUsed} Slabs)`,
                          `1. سلیبوں کی کل رقم (${summary.totalSlabsUsed} سلیب)`
                        )}
                      </div>
                      <div className="text-sm md:text-base font-mono font-extrabold text-white mt-0.5">
                        PKR {summary.estimatedTotalSlabCostPKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {summary.totalSlabAreaSqFt.toFixed(1)} ft² @ PKR {slabConfig.ratePerSqFt}
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/40 bg-slate-950 p-2.5">
                      <div className="text-[10px] text-amber-300 font-bold">
                        {tr('2. Total Saw Cutting Bill', '2. کل کٹنگ بل (رننگ فٹ)')}
                      </div>
                      <div className="text-sm md:text-base font-mono font-extrabold text-amber-300 mt-0.5">
                        PKR {cuttingStats.totalCuttingCostPKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cuttingStats.totalRunningFeet.toFixed(1)} R.Ft @ PKR {cuttingRatePerRft}
                      </div>
                    </div>

                    <div className="rounded-lg border border-sky-500/40 bg-slate-950 p-2.5">
                      <div className="text-[10px] text-sky-300 font-bold">
                        {tr('3. Total Surface Polish Bill', '3. کل سرفیس پالش بل')}
                      </div>
                      <div className="text-sm md:text-base font-mono font-extrabold text-sky-300 mt-0.5">
                        PKR {cuttingStats.totalPolishCostPKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cuttingStats.totalPolishSqFt.toFixed(1)} ft² @ PKR {polishRatePerSqFt}
                      </div>
                    </div>

                    <div className="rounded-lg border border-purple-500/40 bg-slate-950 p-2.5">
                      <div className="text-[10px] text-purple-300 font-bold">
                        {tr('4. Total Edge Profile Bill', '4. کل ایج پروفائل / گولا بل')}
                      </div>
                      <div className="text-sm md:text-base font-mono font-extrabold text-purple-300 mt-0.5">
                        PKR {cuttingStats.totalEdgeProfileCostPKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {cuttingStats.totalEdgeProfileRft.toFixed(1)} R.Ft @ PKR {edgeProfileRatePerRft}
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-emerald-400 bg-emerald-950/50 p-2.5">
                      <div className="text-[10px] text-amber-300 font-extrabold uppercase">
                        {tr('GRAND TOTAL INVOICE', 'کل واجب الادا بل (مکمل انوائس)')}
                      </div>
                      <div className="text-base md:text-lg font-mono font-extrabold text-emerald-300 mt-0.5">
                        PKR {cuttingStats.grandTotalInvoicePKR.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-200">
                        {tr('Slabs + Cut + Polish + Edge', 'سلیب + کٹنگ + پالش + ایج پروفائل')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: SLABS SIZE, AREA & RATE TABLE */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-sky-300">
                      {tr(
                        '1️⃣ Stock Slabs Size, Area & Rate Schedule (سلیبوں کے سائز اور ریٹ کی تفصیل)',
                        '1️⃣ سلیبوں کے سائز، رقبہ اور ریٹ کی تفصیل (ایکسل شیٹ ٹیبل نمبر 1)'
                      )}
                    </span>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      {summary.totalSlabsUsed} / {slabConfig.quantity} {tr('Slabs Used', 'استعمال شدہ سلیب')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-white">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">{tr('Slab #', 'سلیب نمبر')}</th>
                          <th className="p-2.5">{tr('Material & Lot', 'پتھر کا نام')}</th>
                          <th className="p-2.5">{tr(`Slab Size (1.W×2.L ${unit})`, `سلیب سائز (1.چوڑائی×2.لمبائی)`)}</th>
                          <th className="p-2.5">{tr('Pieces Cut', 'کٹنے والے پیس')}</th>
                          <th className="p-2.5 text-right">{tr('Total Sq.Ft', 'کل رقبہ فٹ')}</th>
                          <th className="p-2.5 text-right">{tr('Used Sq.Ft', 'استعمال شدہ فٹ')}</th>
                          <th className="p-2.5 text-right">{tr('Offcut Sq.Ft', 'بچت ٹکڑا فٹ')}</th>
                          <th className="p-2.5 text-right">{tr('Rate/Sq.Ft', 'ریٹ فی فٹ')}</th>
                          <th className="p-2.5 text-right">{tr('Slab Amount (PKR)', 'سلیب کی رقم')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono tabular-nums">
                        {summary.slabs.map((sl) => {
                          const slabCost = Math.round(
                            sl.totalSlabAreaSqFt * (Number(slabConfig.ratePerSqFt) || 0)
                          );
                          return (
                            <tr key={sl.slabIndex} className="hover:bg-slate-800/50">
                              <td className="p-2.5 font-bold text-amber-300">Slab #{sl.slabIndex}</td>
                              <td className="p-2.5 font-sans text-white">
                                {slabConfig.materialName} ({slabConfig.lotId})
                              </td>
                              <td className="p-2.5 font-bold text-sky-300">
                                {sl.slabWidth}&quot; × {sl.slabLength}&quot;
                              </td>
                              <td className="p-2.5">{sl.placedPieces.length} Pcs</td>
                              <td className="p-2.5 text-right">{sl.totalSlabAreaSqFt.toFixed(2)} ft²</td>
                              <td className="p-2.5 text-right text-emerald-400 font-bold">
                                {sl.usedAreaSqFt.toFixed(2)} ft² ({sl.yieldPercent.toFixed(0)}%)
                              </td>
                              <td className="p-2.5 text-right text-amber-300">
                                {sl.usableOffcutAreaSqFt.toFixed(2)} ft²
                              </td>
                              <td className="p-2.5 text-right">PKR {slabConfig.ratePerSqFt}</td>
                              <td className="p-2.5 text-right font-extrabold text-emerald-300">
                                PKR {slabCost.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 2: EVERY CUT PIECE WITH CUTTING, POLISH & EDGE PROFILE BILLING TABLE */}
                <div className="rounded-xl border border-emerald-500/50 bg-slate-900 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-300">
                      {tr(
                        '2️⃣ Every Cut Piece with Cutting, Polish & Edge Profile Breakdown (ہر کٹنگ پیس کا مکمل بل — کٹنگ، پالش اور ایج پروفائل کے ساتھ)',
                        '2️⃣ ہر کٹنگ پیس کا مکمل بل — کٹنگ، پالش اور ایج پروفائل ہر کٹنگ کے ساتھ (ایکسل شیٹ ٹیبل نمبر 2)'
                      )}
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {tr(
                        'You can also change any piece Edge Profile directly in the table below:',
                        'آپ نیچے ٹیبل میں بھی کسی پیس کا ایج پروفائل تبدیل کر سکتے ہیں:'
                      )}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-white">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                        <tr>
                          <th className="p-2">{tr('Code', 'کوڈ')}</th>
                          <th className="p-2">{tr('Slab', 'سلیب')}</th>
                          <th className="p-2">{tr('Part Label', 'تفصیل / جگہ')}</th>
                          <th className="p-2">{tr(`Cut Size (1.W×2.L)`, `کٹ سائز`)}</th>
                          <th className="p-2 text-right">{tr('Area', 'رقبہ فٹ')}</th>
                          <th className="p-2 text-right">{tr('Stone PKR', 'پتھر رقم')}</th>
                          <th className="p-2 text-right">{tr('Cut R.Ft & Bill', 'کٹنگ فٹ اور بل')}</th>
                          <th className="p-2 text-right">{tr('Polish Sq.Ft & Bill', 'پالش اور بل')}</th>
                          <th className="p-2">{tr('Edge Profile & Sides', 'ایج پروفائل اور سائیڈ')}</th>
                          <th className="p-2 text-right">{tr('Edge R.Ft & Bill', 'ایج پروفائل بل')}</th>
                          <th className="p-2 text-right">{tr('Piece Total Bill', 'اس پیس کا کل بل')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono tabular-nums">
                        {pieceBillingRows.map((r) => {
                          const srcP = allPlacedPieces.find((x) => x.instanceId === r.instanceId);
                          return (
                            <tr key={r.instanceId} className="hover:bg-slate-800/50">
                              <td className="p-2 font-bold text-sky-400">[{r.pieceCode}]</td>
                              <td className="p-2">Slab #{r.slabIndex}</td>
                              <td className="p-2 font-sans font-semibold text-white">{r.label}</td>
                              <td className="p-2 font-bold text-amber-300">
                                {formatNum(r.cutW)}&quot; × {formatNum(r.cutL)}&quot;
                              </td>
                              <td className="p-2 text-right">{r.areaSqFt.toFixed(2)} ft²</td>
                              <td className="p-2 text-right font-bold text-white">
                                PKR {r.stoneCostPKR.toLocaleString()}
                              </td>
                              <td className="p-2 text-right text-amber-300">
                                <div>PKR {r.cuttingCostPKR.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">
                                  ({r.cuttingRft.toFixed(1)} R.Ft)
                                </div>
                              </td>
                              <td className="p-2 text-right text-sky-300">
                                <div>PKR {r.polishCostPKR.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">
                                  ({r.polishSqFt.toFixed(1)} ft²)
                                </div>
                              </td>
                              <td className="p-2 font-sans">
                                <select
                                  value={r.edgeProfileId}
                                  onChange={(e) => {
                                    if (srcP) {
                                      handleUpdatePart(
                                        srcP.partId,
                                        'edgeProfile',
                                        e.target.value as EdgeProfileType
                                      );
                                    }
                                  }}
                                  className="h-6 rounded bg-slate-950 border border-purple-500/50 text-purple-200 text-[11px] px-1.5 font-bold"
                                >
                                  <option value="flat_polish">{tr('Flat Polish', 'سادہ دھار پالش')}</option>
                                  <option value="half_bullnose">{tr('Half Bullnose', 'ہاف گولا')}</option>
                                  <option value="full_bullnose">{tr('Full Bullnose', 'فل گولا')}</option>
                                  <option value="miter_45">{tr('45° Miter Joint', '45° مائٹر بک میچ جوڑ')}</option>
                                  <option value="ogee">{tr('Ogee Profile', 'ڈبل گولا / اوجی')}</option>
                                  <option value="bevel">{tr('Bevel Chamfer', 'بیول چیمفر دھار')}</option>
                                  <option value="dupont">{tr('Dupont Edge', 'ڈوپونٹ ڈیزائن ایج')}</option>
                                </select>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {r.edgeSidesDescription}
                                </div>
                              </td>
                              <td className="p-2 text-right text-purple-300">
                                <div>PKR {r.edgeProfileCostPKR.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400">
                                  ({r.edgeProfileRft.toFixed(1)} R.Ft)
                                </div>
                              </td>
                              <td className="p-2 text-right font-extrabold text-emerald-300 bg-emerald-950/20">
                                PKR {r.rowTotalPKR.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 3: SAVED COMPUTER EXCEL BILLS HISTORY (کمپیوٹر میں محفوظ شدہ ایکسل بل ریکارڈز) */}
                <div className="rounded-xl border border-amber-500/50 bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs md:text-sm font-extrabold text-amber-300">
                        {tr(
                          `💻 Saved Excel Bills on This Computer (${savedComputerExcelBills.length})`,
                          `💻 اس کمپیوٹر میں محفوظ شدہ بل اور ایکسل ریکارڈز (${savedComputerExcelBills.length})`
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {tr(
                          'Every generated Excel bill is saved automatically in your computer browser storage so you can reload or re-export it anytime.',
                          'جو بھی اس سسٹم کو استعمال کرے گا اسی کے کمپیوٹر میں اس کا سارا ڈیٹا اور بل خودکار سیو ہوتے جائیں گے — کسی بھی پرانے بل کو دوبارہ کھولیں یا ایکسل ڈاؤن لوڈ کریں۔'
                        )}
                      </p>
                    </div>
                  </div>

                  {savedComputerExcelBills.length === 0 ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-400">
                      {tr(
                        'Click "Generate Excel File (.xls)" above to save your first bill record on this computer.',
                        'اوپر "ایکسل فائل جنریٹ کریں (.xls)" بٹن پر کلک کریں، آپ کا بل کمپیوٹر میں ریکارڈ ہو جائے گا۔'
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {savedComputerExcelBills.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-amber-300 text-xs truncate">
                                {b.customerName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {b.createdAt}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-200 mt-1">
                              {b.materialName} ({b.lotId}) · Slab: {b.slabWidth}&quot;×{b.slabLength}&quot; ({b.slabsUsed}/{b.totalSlabsQty} Slabs)
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Area: {b.totalSqFt} ft² | Cut: {b.totalCutRft} R.Ft | Edge: {b.totalEdgeRft} R.Ft
                            </div>
                            <div className="text-xs font-mono font-extrabold text-emerald-400 mt-1">
                              Total Bill: PKR {b.grandTotalPKR.toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setBillCustomerName(b.customerName);
                                setBillCustomerPhone(b.customerPhone || '');
                                setSlabConfig(b.slabConfigSnapshot);
                                setParts(b.partsSnapshot);
                                setCuttingRatePerRft(b.cuttingRatePerRft);
                                setPolishRatePerSqFt(b.polishRatePerSqFt);
                                setEdgeProfileRatePerRft(b.edgeProfileRatePerRft);
                                toast({
                                  title: tr('Saved Bill Loaded', 'محفوظ شدہ بل لوڈ ہو گیا'),
                                  description: tr(
                                    'Loaded slab sizes, cut pieces, and rates from your computer.',
                                    'کمپیوٹر سے سلیب سائز، کٹ سائزز اور ریٹ واپس لوڈ کر دیے گئے ہیں۔'
                                  ),
                                });
                              }}
                              className="flex-1 py-1 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold"
                            >
                              {tr('Load into Optimizer', 'آپٹیمائزر میں کھولیں')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = savedComputerExcelBills.filter((x) => x.id !== b.id);
                                setSavedComputerExcelBills(next);
                                try {
                                  window.localStorage.setItem(
                                    'stonecut_saved_excel_bills_v1',
                                    JSON.stringify(next)
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="py-1 px-2 rounded bg-rose-950 hover:bg-rose-700 text-rose-200 text-[11px] font-bold"
                            >
                              {tr('Delete', 'ختم')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE SLAB PHOTO CALIBRATION & FRAMING STUDIO MODAL
          Opens automatically whenever the user uploads or captures a slab photo!
         ========================================================================= */}
      <Dialog
        open={isFrameCalibratorOpen}
        onOpenChange={(open) => {
          setIsFrameCalibratorOpen(open);
          if (!open) setIsCalibratorFullscreen(false);
        }}
      >
        <DialogContent
          className={`${
            isCalibratorFullscreen ? '' : 'max-w-4xl'
          } bg-slate-900 text-white border-slate-700 overflow-y-auto`}
          style={
            isCalibratorFullscreen
              ? {
                  left: 0,
                  top: 0,
                  transform: 'none',
                  width: '100vw',
                  height: '100vh',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  borderRadius: 0,
                }
              : undefined
          }
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                <Crop className="h-5 w-5 text-sky-400" />
                <span>
                  {tr(
                    'Calibrate Uploaded Photo to Exact Slab Size',
                    'سلیب سائز فریم ایڈجسٹمنٹ'
                  )}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                {tr(
                  'Fit your uploaded photo into the exact slab dimensions (e.g., 60" × 110") for accurate vein alignment and cutting.',
                  'اپنی اپ لوڈ کردہ تصویر کو سلیب کے اصل سائز (مثلاً 110 بائی 60 انچ) کے فریم میں فٹ کریں تاکہ کٹنگ آپٹیمائزر بالکل درست حساب اور رگوں کی کٹنگ کرے۔'
                )}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsCalibratorFullscreen((v) => !v)}
              className={isCalibratorFullscreen ? cadBtnPrimary : cadBtnSecondary}
            >
              {isCalibratorFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
              )}
              <span>
                {isCalibratorFullscreen
                  ? tr('Exit Fullscreen', 'نارمل سکرین')
                  : tr('Fullscreen Frame', 'فل سکرین فریم')}
              </span>
            </button>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Enter Exact Slab Dimensions for the Frame (Pakistani Standard: 1. Width First × 2. Length Second) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div>
                <Label className="text-[11px] font-bold text-amber-300">
                  {tr(`1. Slab Width First (${unit})`, `1. پہلے سلیب چوڑائی (${unit} مثلاً 60)`)}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={tempCalibWidth}
                  onChange={(e) => setTempCalibWidth(Math.max(1, Number(e.target.value) || 1))}
                  className={`${hiContrastInputClass} border-amber-500/60 font-mono font-bold`}
                />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-sky-300">
                  {tr(`2. Slab Length Second (${unit})`, `2. بعد میں سلیب لمبائی (${unit} مثلاً 110)`)}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={tempCalibLength}
                  onChange={(e) => setTempCalibLength(Math.max(1, Number(e.target.value) || 1))}
                  className={`${hiContrastInputClass} border-sky-500/60 font-mono font-bold`}
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-300">
                  {tr('Target Slab', 'کون سی سلیب')}
                </Label>
                <select
                  value={calibratingSlabTarget}
                  onChange={(e) => {
                    const nextTarget = Number(e.target.value);
                    setCalibratingSlabTarget(nextTarget);
                    const nextOv = nextTarget > 0 ? slabOverrides[nextTarget] : slabOverrides[1];
                    setTempCalibDefects(nextOv?.defects ? [...nextOv.defects] : []);
                  }}
                  className="w-full h-9 rounded-md bg-slate-900 text-white border border-slate-700 px-2 text-xs font-semibold"
                >
                  <option value={0}>All Block Slabs / Slab #1 (Master)</option>
                  {Array.from({ length: slabConfig.quantity }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Only Slab #{i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-300">
                  {tr('Quick Presets (W × L)', 'فوری تیار سائز (W × L)')}
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTempCalibWidth(60);
                      setTempCalibLength(110);
                    }}
                    className="flex-1 h-9 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-sky-300"
                  >
                    60×110 (W×L)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempCalibWidth(48);
                      setTempCalibLength(96);
                    }}
                    className="flex-1 h-9 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-200"
                  >
                    48×96 (W×L)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Interactive Proportional Slab Frame Viewport + Freehand Crack Pencil & Eraser + 4-Corner Perspective */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 flex flex-col items-center">
              {/* Top Tool Switcher Bar inside Popup: Move Photo | Pencil Draw Crack | Eraser | Undo | Clear All */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 mb-2.5 pb-2 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCalibCrackTool('move_photo');
                      setIsPerspectiveMode(false);
                    }}
                    className={`h-8 px-2.5 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      calibCrackTool === 'move_photo' && !isPerspectiveMode
                        ? 'border-sky-400 bg-sky-600 text-white shadow'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Move className="h-3.5 w-3.5" />
                    <span>{tr('1. Move Photo', '1. تصویر سیٹ کریں')}</span>
                  </button>

                  {/* MANUAL FREEHAND CRACK PENCIL BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setCalibCrackTool('pencil_draw');
                      setIsPerspectiveMode(false);
                    }}
                    className={`h-8 px-3 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      calibCrackTool === 'pencil_draw'
                        ? 'border-rose-400 bg-rose-600 text-white shadow-md'
                        : 'border-rose-500/60 bg-rose-950/80 hover:bg-rose-900 text-rose-200'
                    }`}
                  >
                    <span>✏️</span>
                    <span>
                      {tr(
                        '2. Crack Pencil (Draw Crack Line)',
                        '2. کریک پنسل (پکڑ کر کریک لکیر کھینچیں)'
                      )}
                    </span>
                  </button>

                  {/* ERASER MODE BUTTON (پنسل مٹانے والا ربڑ) */}
                  <button
                    type="button"
                    onClick={() => {
                      setCalibCrackTool('eraser');
                      setIsPerspectiveMode(false);
                    }}
                    className={`h-8 px-2.5 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      calibCrackTool === 'eraser'
                        ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-md'
                        : 'border-amber-500/50 bg-slate-900 hover:bg-slate-800 text-amber-300'
                    }`}
                  >
                    <span>🧹</span>
                    <span>{tr('Eraser (Click Crack to Erase)', 'ربڑ / نشان مٹائیں')}</span>
                  </button>

                  {/* UNDO LAST PENCIL STROKE */}
                  {tempCalibDefects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTempCalibDefects((prev) => prev.slice(0, -1))}
                      className="h-8 px-2.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      title="Undo last drawn crack mark"
                    >
                      <span>↩️</span>
                      <span>{tr('Undo', 'پچھلی لکیر مٹائیں')}</span>
                    </button>
                  )}

                  {/* CLEAR ALL CRACK MARKS TO REDRAW */}
                  {tempCalibDefects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTempCalibDefects([])}
                      className="h-8 px-2.5 rounded-md border border-rose-500/50 bg-rose-950/70 hover:bg-rose-900 text-rose-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{tr('Clear All', 'سب مٹا کر دوبارہ لکھیں')}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Pencil Color Selector for High Contrast on Any Stone */}
                  {calibCrackTool === 'pencil_draw' && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700">
                      <span className="text-[10px] text-slate-400">
                        {tr('Pencil Color:', 'پنسل رنگ:')}
                      </span>
                      {[
                        { color: '#EF4444', label: 'Red' },
                        { color: '#FACC15', label: 'Yellow' },
                        { color: '#38BDF8', label: 'Cyan' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setPencilStrokeColor(c.color)}
                          style={{ backgroundColor: c.color }}
                          className={`w-4 h-4 rounded-full border ${
                            pencilStrokeColor === c.color
                              ? 'border-2 border-white scale-110'
                              : 'border-slate-600 opacity-75'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsPerspectiveMode((v) => !v);
                      setCalibCrackTool('move_photo');
                    }}
                    className={isPerspectiveMode ? cadBtnPrimary : cadBtnSubtle}
                  >
                    <span>4-Corner Perspective</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempCalibScale(100);
                      setTempCalibOffsetX(0);
                      setTempCalibOffsetY(0);
                      setTempCalibRotation(0);
                      setPerspectiveCorners([
                        { x: 0.04, y: 0.04 },
                        { x: 0.96, y: 0.04 },
                        { x: 0.98, y: 0.96 },
                        { x: 0.02, y: 0.96 },
                      ]);
                    }}
                    className={cadBtnSubtle}
                  >
                    Reset Frame
                  </button>
                </div>
              </div>

              {/* Helper Instruction Banner for Active Tool */}
              {calibCrackTool === 'pencil_draw' && (
                <div className="w-full mb-2 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-500/60 text-rose-100 text-xs font-semibold flex items-center justify-between">
                  <span>
                    ✏️{' '}
                    {tr(
                      'Pencil Mode Active: Hold mouse/finger on the crack start and drag along the crack to the end!',
                      'پنسل موڈ آن ہے: تصویر میں جہاں سے کریک شروع ہو رہا ہے وہاں کلک دبا کر رکھیں اور جہاں تک کریک ہے وہاں تک لکیر کھینچیں!'
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-amber-300">
                    {tempCalibDefects.length} {tr('Crack(s) Marked', 'کریک نشان زد')}
                  </span>
                </div>
              )}
              {calibCrackTool === 'eraser' && (
                <div className="w-full mb-2 px-3 py-1.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-100 text-xs font-semibold">
                  🧹{' '}
                  {tr(
                    'Eraser Active: Click on any drawn pencil crack line on the photo below to erase it!',
                    'ربڑ موڈ آن ہے: نیچے تصویر پر کسی بھی پنسل کے نشان پر کلک کریں تو وہ مٹ جائے گا!'
                  )}
                </div>
              )}

              {/* Proportional Slab Frame Box with Interactive Freehand Pencil & Eraser */}
              <div
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width <= 0 || rect.height <= 0) return;
                  const validLen = Math.max(1, Number(tempCalibLength) || 110);
                  const validWid = Math.max(1, Number(tempCalibWidth) || 60);
                  const ptX = Number(
                    Math.max(0, Math.min(validLen, ((e.clientX - rect.left) / rect.width) * validLen)).toFixed(2)
                  );
                  const ptY = Number(
                    Math.max(0, Math.min(validWid, ((e.clientY - rect.top) / rect.height) * validWid)).toFixed(2)
                  );

                  if (calibCrackTool === 'pencil_draw') {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setIsDrawingPencil(true);
                    setActivePencilPoints([{ x: ptX, y: ptY }]);
                    return;
                  }

                  if (calibCrackTool === 'eraser') {
                    e.stopPropagation();
                    // Erase any defect whose bounding box or pencil points are near (ptX, ptY)
                    const hitRadius = Math.max(3, validLen * 0.04);
                    setTempCalibDefects((prev) =>
                      prev.filter((def) => {
                        if (def.pencilPath && def.pencilPath.length > 0) {
                          const nearPoint = def.pencilPath.some(
                            (p) => Math.hypot(p.x - ptX, p.y - ptY) <= hitRadius
                          );
                          if (nearPoint) return false;
                        }
                        const inBox =
                          ptX >= def.x - 1 &&
                          ptX <= def.x + def.width + 1 &&
                          ptY >= def.y - 1 &&
                          ptY <= def.y + def.height + 1;
                        return !inBox;
                      })
                    );
                    return;
                  }

                  if (calibCrackTool === 'box_click') {
                    const cLen = Math.min(validLen, Math.max(1, Number(calibCrackLen) || 16));
                    const cWid = Math.min(validWid, Math.max(1, Number(calibCrackWid) || 4));
                    const posX = Number(
                      Math.max(0, Math.min(validLen - cLen, ptX - cLen / 2)).toFixed(1)
                    );
                    const posY = Number(
                      Math.max(0, Math.min(validWid - cWid, ptY - cWid / 2)).toFixed(1)
                    );
                    setCalibCrackX(posX);
                    setCalibCrackY(posY);
                    setTempCalibDefects((prev) => [
                      ...prev,
                      {
                        id: `def-box-${Date.now()}`,
                        label: `Crack #${prev.length + 1}`,
                        x: posX,
                        y: posY,
                        width: cLen,
                        height: cWid,
                        pencilColor: pencilStrokeColor,
                      },
                    ]);
                    return;
                  }

                  if (!isPerspectiveMode && calibCrackTool === 'move_photo') {
                    setIsDraggingFrame(true);
                    dragStartRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      startOffX: tempCalibOffsetX,
                      startOffY: tempCalibOffsetY,
                    };
                  }
                }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (rect.width <= 0 || rect.height <= 0) return;
                  const validLen = Math.max(1, Number(tempCalibLength) || 110);
                  const validWid = Math.max(1, Number(tempCalibWidth) || 60);

                  if (isDrawingPencil && calibCrackTool === 'pencil_draw') {
                    const ptX = Number(
                      Math.max(0, Math.min(validLen, ((e.clientX - rect.left) / rect.width) * validLen)).toFixed(2)
                    );
                    const ptY = Number(
                      Math.max(0, Math.min(validWid, ((e.clientY - rect.top) / rect.height) * validWid)).toFixed(2)
                    );
                    setActivePencilPoints((prev) => {
                      if (prev.length === 0) return [{ x: ptX, y: ptY }];
                      const last = prev[prev.length - 1];
                      if (Math.hypot(ptX - last.x, ptY - last.y) < 0.4) return prev;
                      return [...prev, { x: ptX, y: ptY }];
                    });
                    return;
                  }

                  if (isDraggingFrame && !isPerspectiveMode && calibCrackTool === 'move_photo') {
                    const dx = ((e.clientX - dragStartRef.current.x) / 400) * 100;
                    const dy = ((e.clientY - dragStartRef.current.y) / 250) * 100;
                    setTempCalibOffsetX(
                      Math.max(-80, Math.min(80, Math.round(dragStartRef.current.startOffX - dx)))
                    );
                    setTempCalibOffsetY(
                      Math.max(-80, Math.min(80, Math.round(dragStartRef.current.startOffY - dy)))
                    );
                  }
                }}
                onPointerUp={(e) => {
                  if (isDrawingPencil && calibCrackTool === 'pencil_draw') {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                    setIsDrawingPencil(false);
                    if (activePencilPoints.length >= 1) {
                      const validLen = Math.max(1, Number(tempCalibLength) || 110);
                      const validWid = Math.max(1, Number(tempCalibWidth) || 60);
                      const pts =
                        activePencilPoints.length === 1
                          ? [
                              activePencilPoints[0],
                              {
                                x: Math.min(validLen, activePencilPoints[0].x + 6),
                                y: Math.min(validWid, activePencilPoints[0].y + 2),
                              },
                            ]
                          : activePencilPoints;

                      let minX = pts[0].x;
                      let maxX = pts[0].x;
                      let minY = pts[0].y;
                      let maxY = pts[0].y;
                      let pathLength = 0;
                      for (let i = 0; i < pts.length; i++) {
                        minX = Math.min(minX, pts[i].x);
                        maxX = Math.max(maxX, pts[i].x);
                        minY = Math.min(minY, pts[i].y);
                        maxY = Math.max(maxY, pts[i].y);
                        if (i > 0) {
                          pathLength += Math.hypot(
                            pts[i].x - pts[i - 1].x,
                            pts[i].y - pts[i - 1].y
                          );
                        }
                      }
                      const padBuf = 1.0; // 1 inch safety buffer around pencil crack
                      const bx = Number(Math.max(0, minX - padBuf).toFixed(1));
                      const by = Number(Math.max(0, minY - padBuf).toFixed(1));
                      const bw = Number(
                        Math.max(2, Math.min(validLen - bx, maxX - minX + padBuf * 2)).toFixed(1)
                      );
                      const bh = Number(
                        Math.max(2, Math.min(validWid - by, maxY - minY + padBuf * 2)).toFixed(1)
                      );
                      const crackLenNum = Number(Math.max(1, pathLength).toFixed(1));

                      setTempCalibDefects((prev) => [
                        ...prev,
                        {
                          id: `def-pencil-${Date.now()}`,
                          label: `Pencil Crack #${prev.length + 1} (${crackLenNum}${unit})`,
                          x: bx,
                          y: by,
                          width: bw,
                          height: bh,
                          pencilPath: pts,
                          pencilColor: pencilStrokeColor,
                          crackLengthUnits: crackLenNum,
                        },
                      ]);
                    }
                    setActivePencilPoints([]);
                  }
                  setIsDraggingFrame(false);
                }}
                onPointerLeave={() => {
                  if (!isDrawingPencil) setIsDraggingFrame(false);
                }}
                className={`relative w-full ${
                  isCalibratorFullscreen ? 'max-w-5xl' : 'max-w-2xl'
                } overflow-hidden rounded-lg border-2 ${
                  calibCrackTool === 'pencil_draw'
                    ? 'border-rose-500 cursor-crosshair'
                    : calibCrackTool === 'eraser'
                    ? 'border-amber-400 cursor-pointer'
                    : 'border-sky-500 cursor-move'
                } bg-black select-none shadow-lg touch-none`}
                style={{
                  aspectRatio: `${Math.max(1, tempCalibLength)} / ${Math.max(1, tempCalibWidth)}`,
                  maxHeight: isCalibratorFullscreen ? '64vh' : '360px',
                }}
              >
                <div
                  className="w-full h-full bg-no-repeat bg-center pointer-events-none"
                  style={{
                    backgroundImage: `url("${tempCalibImageUrl}")`,
                    backgroundSize: `${tempCalibScale}% ${tempCalibScale}%`,
                    backgroundPosition: `${50 + tempCalibOffsetX}% ${50 + tempCalibOffsetY}%`,
                    transform: `rotate(${tempCalibRotation}deg) scale(${
                      tempCalibMirror === 'flip_h' || tempCalibMirror === 'flip_both' ? -1 : 1
                    }, ${
                      tempCalibMirror === 'flip_v' || tempCalibMirror === 'flip_both' ? -1 : 1
                    })`,
                  }}
                />

                {/* SVG OVERLAY FOR FREEHAND PENCIL CRACK PATHS & ACTIVE DRAWING STROKE */}
                <svg
                  viewBox={`0 0 ${Math.max(1, Number(tempCalibLength) || 110)} ${Math.max(
                    1,
                    Number(tempCalibWidth) || 60
                  )}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {/* Saved Pencil Crack Paths & Bounding Safety Zones */}
                  {tempCalibDefects.map((def, idx) => {
                    const col = def.pencilColor || '#EF4444';
                    const hasPath = def.pencilPath && def.pencilPath.length >= 2;
                    return (
                      <g key={def.id}>
                        <rect
                          x={def.x}
                          y={def.y}
                          width={def.width}
                          height={def.height}
                          fill={hasPath ? 'rgba(220, 38, 38, 0.18)' : 'rgba(220, 38, 38, 0.38)'}
                          stroke={col}
                          strokeWidth="0.45"
                          strokeDasharray="1.5 1"
                        />
                        {hasPath && def.pencilPath && (
                          <>
                            {/* Dark outline for contrast on white marble */}
                            <polyline
                              points={def.pencilPath.map((p) => `${p.x},${p.y}`).join(' ')}
                              fill="none"
                              stroke="#000000"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.75"
                            />
                            {/* Colored Pencil Crack Stroke */}
                            <polyline
                              points={def.pencilPath.map((p) => `${p.x},${p.y}`).join(' ')}
                              fill="none"
                              stroke={col}
                              strokeWidth="1.0"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Start & End Points of the Crack */}
                            <circle
                              cx={def.pencilPath[0].x}
                              cy={def.pencilPath[0].y}
                              r="1.3"
                              fill={col}
                              stroke="#FFFFFF"
                              strokeWidth="0.35"
                            />
                            <circle
                              cx={def.pencilPath[def.pencilPath.length - 1].x}
                              cy={def.pencilPath[def.pencilPath.length - 1].y}
                              r="1.3"
                              fill={col}
                              stroke="#FFFFFF"
                              strokeWidth="0.35"
                            />
                          </>
                        )}
                        <text
                          x={def.x + def.width / 2}
                          y={Math.max(2.5, def.y - 0.8)}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="2.6"
                          fontWeight="bold"
                          stroke="#000000"
                          strokeWidth="0.15"
                        >
                          {def.crackLengthUnits
                            ? `Crack #${idx + 1}: ${def.crackLengthUnits}${unit}`
                            : `Crack #${idx + 1} (${def.height}×${def.width})`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Live Pencil Stroke While User is Drawing */}
                  {activePencilPoints.length >= 2 && (
                    <>
                      <polyline
                        points={activePencilPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                      <polyline
                        points={activePencilPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={pencilStrokeColor}
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                </svg>

                {/* Clickable Delete Badges on Each Marked Crack for Easy 1-Click Erasing */}
                {tempCalibDefects.map((def, dIdx) => {
                  const sL = Math.max(1, Number(tempCalibLength) || 110);
                  const sW = Math.max(1, Number(tempCalibWidth) || 60);
                  const leftPct = Math.min(92, Math.max(4, ((def.x + def.width / 2) / sL) * 100));
                  const topPct = Math.min(92, Math.max(6, ((def.y + def.height / 2) / sW) * 100));
                  return (
                    <button
                      key={`del-${def.id}`}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setTempCalibDefects((prev) => prev.filter((item) => item.id !== def.id));
                      }}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-950/90 hover:bg-rose-600 border border-rose-400 text-white text-[9px] font-mono font-bold shadow cursor-pointer"
                      title="Click to erase this crack mark (اس کریک نشان کو مٹائیں)"
                    >
                      #{dIdx + 1} ✕
                    </button>
                  );
                })}

                {/* 4-Corner Perspective Trapezoid Overlay when Perspective Mode is Active */}
                {isPerspectiveMode && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <polygon
                      points={perspectiveCorners
                        .map((c) => `${c.x * 100},${c.y * 100}`)
                        .join(' ')}
                      fill="rgba(14, 165, 233, 0.18)"
                      stroke="#38BDF8"
                      strokeWidth="1.2"
                      strokeDasharray="2 1"
                    />
                    {perspectiveCorners.map((c, idx) => (
                      <g key={idx}>
                        <circle
                          cx={c.x * 100}
                          cy={c.y * 100}
                          r="2.8"
                          fill="#0284C7"
                          stroke="#FFFFFF"
                          strokeWidth="0.8"
                        />
                        <text
                          x={c.x * 100}
                          y={c.y * 100 - 4}
                          textAnchor="middle"
                          fill="#38BDF8"
                          fontSize="4.5"
                          fontWeight="bold"
                        >
                          {['TL', 'TR', 'BR', 'BL'][idx]}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}

                {/* Proportional Grid Overlay inside Slab Frame */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="border border-sky-400/20" />
                  ))}
                </div>

                {/* Top & Left Dimension Callouts on the Frame */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[11px] font-mono font-bold text-sky-300 pointer-events-none">
                  {tr('Length', 'لمبائی')}: {tempCalibLength} {unit}
                </div>
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono font-bold text-amber-300 pointer-events-none">
                  {tr('Width', 'چوڑائی')}: {tempCalibWidth} {unit}
                </div>
              </div>

              {/* =====================================================================
                  IN-POPUP CRACK PENCIL & MANUAL CRACK DIMENSION PANEL
                 ===================================================================== */}
              <div className="w-full mt-3 rounded-lg border-2 border-rose-500/50 bg-rose-950/20 p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>
                      {tr(
                        'Manual Crack Pencil & Exact Crack Dimensions (پنسل سے کریک لگائیں یا پیمائش درج کریں)',
                        'اوپر تصویر پر پنسل (✏️) سے کریک کھینچیں، ربڑ (🧹) سے مٹائیں، یا نیچے پیمائش لکھ کر کریک شامل کریں'
                      )}
                    </span>
                  </div>
                </div>

                {/* Optional Manual Crack Size (1. Width First × 2. Length Second) & Position Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label className="text-[10px] font-bold text-amber-300">
                      {tr(`1. Crack Width (${unit})`, `1. کریک چوڑائی (${unit})`)}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={calibCrackWid}
                      onChange={(e) => setCalibCrackWid(Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-sky-300">
                      {tr(`2. Crack Length (${unit})`, `2. کریک لمبائی (${unit})`)}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={calibCrackLen}
                      onChange={(e) => setCalibCrackLen(Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-300">
                      {tr(`Start X along Length (${unit})`, `فاصلہ X لمبائی میں (${unit})`)}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={calibCrackX}
                      onChange={(e) => setCalibCrackX(Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-300">
                      {tr(`Start Y along Width (${unit})`, `فاصلہ Y چوڑائی میں (${unit})`)}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={calibCrackY}
                      onChange={(e) => setCalibCrackY(Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const validLen = Math.max(1, Number(tempCalibLength) || 110);
                      const validWid = Math.max(1, Number(tempCalibWidth) || 60);
                      const cLen = Math.min(validLen, Math.max(1, Number(calibCrackLen) || 16));
                      const cWid = Math.min(validWid, Math.max(1, Number(calibCrackWid) || 4));
                      const posX = Math.max(0, Math.min(validLen - cLen, Number(calibCrackX) || 0));
                      const posY = Math.max(0, Math.min(validWid - cWid, Number(calibCrackY) || 0));
                      setTempCalibDefects((prev) => [
                        ...prev,
                        {
                          id: `def-pop-${Date.now()}`,
                          label: `Crack #${prev.length + 1}`,
                          x: posX,
                          y: posY,
                          width: cLen,
                          height: cWid,
                          pencilColor: pencilStrokeColor,
                        },
                      ]);
                    }}
                    className="h-8 px-3 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{tr('+ Add Crack Box', '+ پیمائش سے کریک ڈالیں')}</span>
                  </button>
                </div>

                {/* List of Added Pencil & Box Cracks on this Slab inside the Popup */}
                {tempCalibDefects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {tempCalibDefects.map((def, idx) => (
                      <span
                        key={def.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950 border border-rose-500/60 text-rose-200 text-[11px] font-mono"
                      >
                        <strong>
                          {def.pencilPath ? `✏️ Pencil Crack #${idx + 1}:` : `Crack #${idx + 1}:`}
                        </strong>{' '}
                        {def.crackLengthUnits
                          ? `Len ${def.crackLengthUnits}${unit} (Zone W:${def.height}×L:${def.width})`
                          : `W:${def.height}×L:${def.width} ${unit}`}{' '}
                        @ (X:{def.x}, Y:{def.y})
                        <button
                          type="button"
                          onClick={() =>
                            setTempCalibDefects((prev) => prev.filter((item) => item.id !== def.id))
                          }
                          className="px-1 rounded bg-rose-700 hover:bg-rose-500 text-white font-bold ml-1"
                          title="Erase this crack"
                        >
                          ✕ {tr('Erase', 'مٹائیں')}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 4-Corner Perspective Controls Panel */}
              {isPerspectiveMode && (
                <div className="w-full mt-3 p-3 rounded-lg border border-slate-700 bg-slate-900 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-200">
                      {tr(
                        '4-Corner Perspective Correction (Align all 4 corners of the slab photo):',
                        '4-کارنر پرسپیکٹیو (ترچھی کھینچی گئی سلیب تصویر کے چاروں کونے ملائیں):'
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={isRectifyingPerspective}
                      onClick={handleRectify4CornerPerspective}
                      className={`${cadBtnPrimary} disabled:opacity-50`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {isRectifyingPerspective
                          ? tr('Rectifying...', 'سیدھا ہو رہا ہے...')
                          : tr('Apply 4-Corner Perspective', '4-کارنر پرسپیکٹیو سیدھا کریں')}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    {(['Top-Left (TL)', 'Top-Right (TR)', 'Bottom-Right (BR)', 'Bottom-Left (BL)'] as const).map(
                      (cornerName, idx) => (
                        <div
                          key={cornerName}
                          className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1"
                        >
                          <div className="font-bold text-sky-300">{cornerName}</div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 w-4">X:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(perspectiveCorners[idx].x * 100)}
                              onChange={(e) => {
                                const val = Number(e.target.value) / 100;
                                setPerspectiveCorners((prev) => {
                                  const next = [...prev] as typeof prev;
                                  next[idx] = { ...next[idx], x: val };
                                  return next;
                                });
                              }}
                              className="w-full accent-sky-500"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 w-4">Y:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(perspectiveCorners[idx].y * 100)}
                              onChange={(e) => {
                                const val = Number(e.target.value) / 100;
                                setPerspectiveCorners((prev) => {
                                  const next = [...prev] as typeof prev;
                                  next[idx] = { ...next[idx], y: val };
                                  return next;
                                });
                              }}
                              className="w-full accent-sky-500"
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Fine-tune Sliders for Zoom, X/Y Shift, Rotation & Mirror */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-300 font-semibold block mb-1">
                    Zoom / Fit ({tempCalibScale}%):
                  </span>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    value={tempCalibScale}
                    onChange={(e) => setTempCalibScale(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-slate-300 font-semibold block mb-1">
                    Left / Right ({tempCalibOffsetX}%):
                  </span>
                  <input
                    type="range"
                    min="-70"
                    max="70"
                    value={tempCalibOffsetX}
                    onChange={(e) => setTempCalibOffsetX(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-slate-300 font-semibold block mb-1">
                    Up / Down ({tempCalibOffsetY}%):
                  </span>
                  <input
                    type="range"
                    min="-70"
                    max="70"
                    value={tempCalibOffsetY}
                    onChange={(e) => setTempCalibOffsetY(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-slate-300 font-semibold block mb-1">
                    Straighten Angle ({tempCalibRotation}°):
                  </span>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    value={tempCalibRotation}
                    onChange={(e) => setTempCalibRotation(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300">Mirror:</span>
                {(
                  [
                    { id: 'none', label: 'Normal' },
                    { id: 'flip_h', label: '↔ Flip H' },
                    { id: 'flip_v', label: '↕ Flip V' },
                    { id: 'flip_both', label: '180° Both' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTempCalibMirror(m.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                      tempCalibMirror === m.id
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFrameCalibratorOpen(false);
                    setIsCalibratorFullscreen(false);
                  }}
                  className={cadBtnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveFrameCalibration();
                    setIsCalibratorFullscreen(false);
                  }}
                  className={cadBtnPrimary}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {tr(
                      `Save Frame & Cracks (W:${tempCalibWidth}×L:${tempCalibLength})`,
                      `فریم، سائز اور کریک محفوظ کریں (W:${tempCalibWidth}×L:${tempCalibLength})`
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live WebRTC Camera Modal */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopLiveCamera()}>
        <DialogContent className="max-w-xl bg-slate-900 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-400" />
              <span>
                {tr('Capture Marble Slab via Camera', 'ماربل سلیب کی لائیو تصویر لیں')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {tr(
                'Right after capturing the photo, the Slab Size Frame Calibrator will open automatically.',
                'تصویر لینے کے فوراً بعد آپ کے سامنے سلیب سائز فریم کھل جائے گا۔'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {cameraError ? (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200 space-y-3">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    mobileCameraInputRef.current?.click();
                  }}
                  className={cadBtnPrimary}
                >
                  <Camera className="h-4 w-4" />
                  <span>
                    {tr('Pick Photo from Camera / Gallery', 'موبائل کیمرہ / گیلری سے تصویر منتخب کریں')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border-2 border-dashed border-sky-400/70 rounded pointer-events-none flex items-end justify-center pb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-950/80 text-[11px] text-sky-300">
                    Align Slab Inside Frame ({slabConfig.length}×{slabConfig.width} {unit})
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={stopLiveCamera}
                className={cadBtnSecondary}
              >
                {tr('Cancel', 'منسوخ')}
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhotoFromVideo}
                  className={cadBtnPrimary}
                >
                  <Camera className="h-4 w-4" />
                  <span>{tr('Capture Photo & Calibrate Frame', 'تصویر کھینچیں اور فریم سیٹ کریں')}</span>
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Catalog Picker Modal */}
      <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select Marble / Granite from Store Catalog
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Pick any stone from your catalog to open it in the Slab Frame Calibrator.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800 border border-slate-700 rounded-lg bg-slate-950">
            {marbles.map((m) => {
              const defaultPrice = m.variants?.[0]?.price || 350;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSlabConfig((prev) => ({
                      ...prev,
                      materialName: m.name,
                      ratePerSqFt: defaultPrice,
                    }));
                    setIsCatalogModalOpen(false);
                    if (m.imageUrl) {
                      openFrameCalibrator(0, m.imageUrl, `${m.name} (Catalog)`);
                    }
                  }}
                  className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-800 transition-colors text-white"
                >
                  <div className="flex items-center gap-3">
                    {m.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-14 rounded object-cover border border-slate-700"
                      />
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">{m.name}</div>
                      <div className="text-xs text-slate-300">
                        {m.origin} {m.materialType}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    PKR {defaultPrice} / sq.ft
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Marked Stock Slab PDF Blueprint Preview & Download Modal */}
      <SlabPdfBlueprintModal
        open={isPdfPreviewModalOpen}
        onOpenChange={setIsPdfPreviewModalOpen}
        materialName={slabConfig.materialName}
        lotId={slabConfig.lotId}
        unit={unit}
        kerf={slabConfig.kerf}
        edgeTrim={slabConfig.edgeTrim}
        slabImageUrl={slabImageUrl}
        slabs={summary.slabs}
        overallYieldPercent={summary.overallYieldPercent}
        totalUsedAreaSqFt={summary.totalUsedAreaSqFt}
        totalPiecesPlaced={summary.totalPiecesPlaced}
        totalCutRunningFeet={cuttingStats.totalRunningFeet}
        totalCutRunningInches={cuttingStats.totalRunningInches}
        cuttingRatePerRft={cuttingRatePerRft}
        totalCuttingCostPKR={cuttingStats.totalCuttingCostPKR}
        cadLang={cadLang}
        initialSlabFilter={pdfModalSlabFilter}
        autoTriggerAction={pdfModalAutoAction}
        onAutoActionComplete={() => setPdfModalAutoAction('none')}
      />

      {/* Hidden File Input for Importing Saved Stock JSON Backup */}
      <input
        ref={stockJsonImportRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const parsed = JSON.parse(String(reader.result)) as SavedStockSlabItem[];
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSavedStockList((prev) => {
                  const existingIds = new Set(prev.map((x) => x.id));
                  const merged = [...prev];
                  parsed.forEach((item) => {
                    if (item && item.materialName && item.width && item.length) {
                      if (!existingIds.has(item.id)) {
                        merged.unshift(item);
                      }
                    }
                  });
                  return merged;
                });
                toast({
                  title: tr('Stock Backup Imported!', 'اسٹاک بیک اپ کامیابی سے لوڈ ہو گیا!'),
                  description: tr(
                    `Imported ${parsed.length} stock entries into your inventory.`,
                    `${parsed.length} اسٹاک ریکارڈز شامل کر دیے گئے۔`
                  ),
                });
              }
            } catch {
              toast({
                variant: 'destructive',
                title: tr('Invalid Stock File', 'فائل درست نہیں ہے'),
                description: tr('Please select a valid JSON stock backup file.', 'درست JSON اسٹاک فائل منتخب کریں۔'),
              });
            }
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
      />

      {/* 📦 SAVED STOCK SLAB & OFFCUT INVENTORY MANAGER MODAL */}
      <Dialog open={isStockManagerOpen} onOpenChange={setIsStockManagerOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-950 text-white border-2 border-emerald-500/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-emerald-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-emerald-400" />
                <span>
                  {tr(
                    '📦 Marble Slab & Leftover Offcut Stock Inventory System',
                    '📦 ماربل سلیب لاٹس اور بچے ہوئے آف کٹ ٹکڑوں کا اسٹاک سسٹم'
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportSavedStockCSV}
                  className={cadBtnSecondary}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{tr('Export Excel/CSV', 'ایکسپورٹ Excel/CSV')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSavedStockJSON}
                  className={cadBtnSecondary}
                >
                  <Download className="h-3.5 w-3.5 text-sky-400" />
                  <span>{tr('Backup JSON', 'بیک اپ ڈاؤن لوڈ')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => stockJsonImportRef.current?.click()}
                  className={cadBtnSecondary}
                >
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  <span>{tr('Import Backup', 'بیک اپ لوڈ کریں')}</span>
                </button>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              {tr(
                'Save full slab blocks with calibrated photos & crack markings, save leftover usable offcuts from cutting jobs, deduct used slabs, and load any stock item with 1 click.',
                'یہاں آپ اپنی موجودہ سلیب لاٹس (تصویر، سائز، تعداد اور کریک مارکس سمیت) اور کٹنگ سے بچنے والے قابلِ استعمال ٹکڑے (Offcuts) محفوظ کر سکتے ہیں اور کسی بھی وقت ایک کلک سے لوڈ کر سکتے ہیں۔'
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Top Stock Summary KPI Cards */}
          {(() => {
            const totalLots = savedStockList.filter((x) => x.category === 'full_slab_lot').length;
            const totalOffcutLots = savedStockList.filter((x) => x.category === 'usable_offcut').length;
            const totalPieces = savedStockList.reduce((acc, x) => acc + x.quantity, 0);
            const totalSqFt = savedStockList.reduce((acc, x) => {
              const factor = x.unit === 'in' ? 144 : 929.0304;
              return acc + ((x.width * x.length) / factor) * x.quantity;
            }, 0);
            const totalValuePKR = savedStockList.reduce((acc, x) => {
              const factor = x.unit === 'in' ? 144 : 929.0304;
              return acc + ((x.width * x.length) / factor) * x.quantity * x.ratePerSqFt;
            }, 0);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-2">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
                  <div className="text-[10px] text-slate-400">
                    {tr('Saved Slab Lots / Offcuts', 'محفوظ سلیب لاٹس / آف کٹ')}
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {totalLots} {tr('Lots', 'لاٹس')} · {totalOffcutLots} {tr('Offcuts', 'آف کٹ')}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
                  <div className="text-[10px] text-slate-400">
                    {tr('Total Slabs & Pieces in Stock', 'اسٹاک میں کل سلیب اور ٹکڑے')}
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {totalPieces} {tr('Slabs/Pcs', 'عدد')}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-2.5">
                  <div className="text-[10px] text-slate-400">
                    {tr('Total Stock Area (Sq.Ft)', 'کل دستیاب رقبہ (مربع فٹ)')}
                  </div>
                  <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                    {totalSqFt.toFixed(1)} Sq.Ft
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-2.5">
                  <div className="text-[10px] text-amber-300">
                    {tr('Estimated Stock Value (PKR)', 'اسٹاک کی کل مالیت (PKR)')}
                  </div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                    PKR {Math.round(totalValuePKR).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Save Current Workspace Bar inside Modal */}
          <div className="rounded-lg border-2 border-emerald-500/50 bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white">
                {tr('Current Active Slab in Optimizer:', 'اس وقت آپٹیمائزر میں کھلی ہوئی سلیب:')}
                <span className="text-amber-300 font-mono ml-1.5">
                  {slabConfig.materialName} ({slabConfig.lotId}) — W:{slabConfig.width} × L:{slabConfig.length} {unit} × {slabConfig.quantity} Slabs
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {tr(
                  'Save current slab setup or save remaining offcuts from the current cutting layout.',
                  'موجودہ سلیب یا کٹنگ سے بچنے والے قابلِ استعمال ٹکڑوں کو ایک کلک سے اسٹاک میں محفوظ کریں۔'
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSaveCurrentSlabToStock(false)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{tr('💾 Save Current Slab Lot', '💾 موجودہ سلیب اسٹاک میں سیو کریں')}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveUsableOffcutsToStock}
                className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Sparkles className="h-4 w-4" />
                <span>{tr('♻️ Save Leftover Offcuts', '♻️ بچے ہوئے ٹکڑے سیو کریں')}</span>
              </button>
              <button
                type="button"
                onClick={handleDeductUsedSlabsFromStock}
                className="px-2.5 py-1.5 rounded-md bg-rose-900 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>
                  {tr(
                    `✂️ Deduct Used (${summary.totalSlabsUsed})`,
                    `✂️ استعمال شدہ (${summary.totalSlabsUsed}) کم کریں`
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Input */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              {(
                [
                  {
                    id: 'all',
                    label: tr(
                      `All Stock (${savedStockList.length})`,
                      `تمام اسٹاک (${savedStockList.length})`
                    ),
                  },
                  {
                    id: 'full_slab_lot',
                    label: tr(
                      `🏢 Full Slab Lots (${savedStockList.filter((x) => x.category === 'full_slab_lot').length})`,
                      `🏢 مکمل سلیب لاٹس (${savedStockList.filter((x) => x.category === 'full_slab_lot').length})`
                    ),
                  },
                  {
                    id: 'usable_offcut',
                    label: tr(
                      `♻️ Saved Offcuts (${savedStockList.filter((x) => x.category === 'usable_offcut').length})`,
                      `♻️ بچے ہوئے ٹکڑے (${savedStockList.filter((x) => x.category === 'usable_offcut').length})`
                    ),
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStockFilterType(tab.id)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    stockFilterType === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-[220px] max-w-xs">
              <Input
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder={tr(
                  'Search material, Lot ID, size or rack...',
                  'پتھر کا نام، لاٹ نمبر یا گودام ریک تلاش کریں...'
                )}
                className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Saved Stock Items Grid */}
          <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
            {savedStockList
              .filter((item) => {
                if (stockFilterType !== 'all' && item.category !== stockFilterType) return false;
                if (!stockSearchQuery.trim()) return true;
                const q = stockSearchQuery.toLowerCase();
                return (
                  item.materialName.toLowerCase().includes(q) ||
                  item.lotId.toLowerCase().includes(q) ||
                  (item.locationRack || '').toLowerCase().includes(q) ||
                  `${item.width}x${item.length}`.includes(q)
                );
              })
              .map((item) => {
                const factor = item.unit === 'in' ? 144 : 929.0304;
                const singleSlabSqFt = (item.width * item.length) / factor;
                const totalItemSqFt = singleSlabSqFt * item.quantity;
                const totalItemValue = Math.round(totalItemSqFt * item.ratePerSqFt);
                const crackCount = item.slabOverrides
                  ? Object.values(item.slabOverrides).reduce(
                      (acc, ov) => acc + (ov.defects?.length || 0),
                      0
                    )
                  : 0;

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      item.category === 'usable_offcut'
                        ? 'border-sky-500/40 bg-slate-900/90 hover:border-sky-400'
                        : 'border-slate-700 bg-slate-900 hover:border-emerald-500/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Calibrated Slab Thumbnail */}
                      <div className="relative h-16 w-28 rounded overflow-hidden border border-slate-600 bg-slate-950 shrink-0">
                        <div
                          className="w-full h-full bg-no-repeat bg-center"
                          style={{
                            backgroundImage: `url("${item.slabImageUrl}")`,
                            backgroundSize: `${item.masterFrameScale || 100}% ${item.masterFrameScale || 100}%`,
                            backgroundPosition: `${50 + (item.masterFrameOffsetX || 0)}% ${50 + (item.masterFrameOffsetY || 0)}%`,
                            transform: `rotate(${item.masterFrameRotation || 0}deg)`,
                          }}
                        />
                        <div className="absolute bottom-0.5 right-1 px-1 rounded bg-slate-950/90 text-[9px] font-mono text-amber-300 font-bold">
                          W:{item.width}×L:{item.length} {item.unit}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.category === 'usable_offcut'
                                ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {item.category === 'usable_offcut'
                              ? tr('♻️ USABLE OFFCUT', '♻️ بچا ہوا ٹکڑا')
                              : tr('🏢 FULL SLAB LOT', '🏢 مکمل سلیب لاٹ')}
                          </span>
                          <span className="text-sm font-bold text-white">{item.materialName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] font-bold">
                            {item.lotId}
                          </span>
                          {crackCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-mono">
                              ⚠️ {crackCount} {tr('Cracks Marked', 'کریک نشان زد')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                          <span className="text-amber-300 font-bold">
                            {tr('1.Width × 2.Length:', 'چوڑائی × لمبائی:')} {item.width} × {item.length} {item.unit}
                          </span>
                          <span className="text-sky-300">
                            {singleSlabSqFt.toFixed(2)} Sq.Ft/pc · Total: {totalItemSqFt.toFixed(1)} Sq.Ft
                          </span>
                          <span className="text-emerald-300 font-bold">
                            @ PKR {item.ratePerSqFt}/Sq.Ft = PKR {totalItemValue.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>📍 {item.locationRack || 'Godown A'}</span>
                          <span>🕒 {item.savedAt}</span>
                          {item.notes && <span className="text-slate-300">📝 {item.notes}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Adjuster & Load / Delete Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                      <div className="flex items-center rounded-md border border-slate-700 bg-slate-950 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustSavedStockQty(item.id, -1)}
                          className="px-2 py-1 rounded hover:bg-slate-800 text-rose-300 font-mono font-bold text-xs"
                          title="Decrease Stock Quantity (-1)"
                        >
                          −
                        </button>
                        <div className="px-2.5 text-center">
                          <div className="text-[9px] text-slate-400 leading-none">
                            {tr('Qty', 'تعداد')}
                          </div>
                          <div className="text-xs font-mono font-bold text-white">
                            {item.quantity}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdjustSavedStockQty(item.id, 1)}
                          className="px-2 py-1 rounded hover:bg-slate-800 text-emerald-300 font-mono font-bold text-xs"
                          title="Increase Stock Quantity (+1)"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadStockItemIntoOptimizer(item)}
                        className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {tr('⚡ Load for Cutting', '⚡ کٹنگ کے لیے لوڈ کریں')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedStockItem(item.id)}
                        className="p-2 rounded-md bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40"
                        title="Delete from Stock Inventory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
