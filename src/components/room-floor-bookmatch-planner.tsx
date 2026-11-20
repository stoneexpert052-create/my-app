'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  RotateCw,
  FileSpreadsheet,
  Scissors,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  FlipVertical,
  ArrowUp,
  ArrowDown,
  CopyCheck,
  Camera,
  Eye,
  Hand,
  Lock,
  RefreshCw,
  PlusCircle,
  ArrowLeftRight,
  X,
  CheckCircle2,
  Printer,
  Download,
  FileText,
  FolderPlus,
  ZoomIn,
  ZoomOut,
  Layers,
  Trash2,
  ChevronDown,
  Move,
  Save,
  PenTool,
  Grid,
  Package,
  Sliders,
  GripVertical,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
const ROOM_IDB_DB_NAME = 'StoneCut2DStudioDB';
const ROOM_IDB_STORE_NAME = 'projects';

function openRoomPlannerIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(ROOM_IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROOM_IDB_STORE_NAME)) {
        db.createObjectStore(ROOM_IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveStoneCutProjectToIDB(key: string, payload: unknown): Promise<void> {
  const db = await openRoomPlannerIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROOM_IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ROOM_IDB_STORE_NAME);
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

async function loadStoneCutProjectFromIDB<T = unknown>(key: string): Promise<T | null> {
  const db = await openRoomPlannerIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ROOM_IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(ROOM_IDB_STORE_NAME);
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

export type FloorLayoutDesignMode =
  | 'full_room_bookmatch'
  | 'center_bm_with_border'
  | 'center_bm_brass_patti_border';

export type ContrastMarbleType =
  | 'emperador_brown'
  | 'black_gold'
  | 'green_onyx'
  | 'cream_marfil'
  | 'red_verona';

export type BookmatchVeinPattern =
  | 'diamond_4way'
  | 'butterfly_lr'
  | 'x_cross_star'
  | 'v_match_tb'
  | 'pinwheel_spiral'
  | 'straight_flow';

export type BorderSlabSourceMode =
  | 'from_bm_slabs_leftover'
  | 'from_separate_same_stock_slabs'
  | 'from_custom_border_stock_slab';

export interface RoomGeneratedPart {
  label: string;
  widthIn: number;
  lengthIn: number;
  quantity: number;
  isBookmatch: boolean;
  zone: 'center_bookmatch' | 'contrast_patti' | 'outer_border' | 'skirting';
  color: string;
  targetSlabNumber?: number;
}

export interface PlannerStockLotOption {
  id: string;
  category?: 'full_slab_lot' | 'usable_offcut';
  materialName: string;
  lotId: string;
  width: number;
  length: number;
  quantity: number;
  ratePerSqFt: number;
  slabImageUrl: string;
  notes?: string;
}

export interface RoomWasteOffcutItem {
  id: string;
  sourceLabelEn: string;
  sourceLabelUr: string;
  widthIn: number;
  lengthIn: number;
  quantity: number;
  totalSqFt: number;
  nextUseEn: string;
  nextUseUr: string;
}

interface IndividualSlabBookmatchState {
  slabNumber: number;
  pieceLetter: string;
  customImageUrl: string | null;
  imageLabel: string;
  cropXPercent: number;
  cropYPercent: number;
  rotationDeg: number;
  flipHOverride: boolean | null;
  flipVOverride: null | boolean;
  customPieceWidthIn?: number | null;
  customPieceLengthIn?: number | null;
}

interface SavedRoomProfile {
  id: string;
  roomNameEn: string;
  roomNameUr: string;
  clientName: string;
  roomWidthFt: number;
  roomLengthFt: number;
  roomWidthExtraIn: number;
  roomLengthExtraIn: number;
  designMode: FloorLayoutDesignMode;
  veinPattern: BookmatchVeinPattern;
  centerPiecesGrid: '4_pieces' | '2_pieces' | '6_pieces';
  hasOuterBorder: boolean;
  outerBorderWidthIn: number;
  borderSlabSource: BorderSlabSourceMode;
  hasContrastPatti: boolean;
  contrastPattiWidthIn: number;
  contrastMarbleType: ContrastMarbleType;
  hasBrassPatti: boolean;
  brassPattiSizeIn: number;
  mapX?: number;
  mapY?: number;
  mapW?: number;
  mapH?: number;
}

interface AllocatedSlabCutPiece {
  id: string;
  code: string;
  category: 'bookmatch' | 'side_cut' | 'outer_border' | 'contrast_strip';
  labelEn: string;
  labelUr: string;
  widthIn: number;
  lengthIn: number;
  defaultSlabNum: number;
  targetSlabNum: number;
  xIn: number;
  yIn: number;
  isPrimaryOnSlab: boolean;
  colorHex: string;
  sourceDescEn: string;
  sourceDescUr: string;
}

interface RoomFloorBookmatchPlannerProps {
  cadLang: 'en' | 'ur';
  slabImageUrl: string;
  slabMaterialName: string;
  slabLotId?: string;
  slabWidthIn: number;
  slabLengthIn: number;
  slabQuantity: number;
  slabRatePerSqFt: number;
  bladeKerfIn?: number;
  edgeTrimIn?: number;
  onUpdateKerfAndEdgeTrim?: (kerf: number, edgeTrim: number) => void;
  onSaveCurrentSlabToStock?: () => void;
  onLoadSavedStockLot?: (stockId: string) => void;
  onAdjustSavedStockQty?: (stockId: string, delta: number) => void;
  onDeleteSavedStockLot?: (stockId: string) => void;
  onBulkUploadSlabPhotos?: () => void;
  savedStockLots?: PlannerStockLotOption[];
  onAddBorderSlabToStock?: (newSlabLot: {
    materialName: string;
    width: number;
    length: number;
    quantity: number;
    ratePerSqFt: number;
    slabImageUrl: string;
    category?: 'full_slab_lot' | 'usable_offcut';
    notes?: string;
  }) => void;
  onSaveWasteOffcutsToOptimizer?: (
    wasteItems: Array<{
      materialName: string;
      width: number;
      length: number;
      quantity: number;
      ratePerSqFt: number;
      slabImageUrl: string;
      notes: string;
    }>
  ) => void;
  onLoadSavedStockInSlabCutter?: (stockId: string) => void;
  onUpdateSlabConfig: (patch: {
    materialName?: string;
    lotId?: string;
    width?: number;
    length?: number;
    quantity?: number;
    ratePerSqFt?: number;
  }) => void;
  onTriggerSlabPhotoUpload: () => void;
  onSelectPresetSlabTexture: (preset: 'statuario' | 'black_gold' | 'onyx') => void;
  onApplyRoomPartsToCutter: (parts: RoomGeneratedPart[]) => void;
  onGenerateExcelBill: () => void;
}

const BOOKMATCH_STYLE_META: Array<{
  id: BookmatchVeinPattern;
  num: number;
  shortEn: string;
  shortUr: string;
  labelEn: string;
  labelUr: string;
  descEn: string;
  descUr: string;
}> = [
  {
    id: 'diamond_4way',
    num: 1,
    shortEn: '💎 1. Diamond',
    shortUr: '💎 1. ڈائمنڈ',
    labelEn: '💎 1. Center Diamond Bookmatch',
    labelUr: '💎 1. سینٹر ڈائمنڈ چارس',
    descEn: 'Veins from all 4 slabs converge at the center to form a classic diamond medallion',
    descUr: 'چاروں سلیبوں کی رگیں سینٹر میں مل کر ہیرا (ڈائمنڈ) بناتی ہیں',
  },
  {
    id: 'butterfly_lr',
    num: 2,
    shortEn: '🦋 2. Butterfly',
    shortUr: '🦋 2. بٹر فلائی',
    labelEn: '🦋 2. Butterfly Wing Style',
    labelUr: '🦋 2. بٹر فلائی (تتلی) اسٹائل',
    descEn: 'Veins open outward from the center toward the four corners like butterfly wings',
    descUr: 'رگیں درمیان سے باہر کونوں کی طرف تتلی کے پروں کی طرح کھلتی ہیں',
  },
  {
    id: 'x_cross_star',
    num: 3,
    shortEn: '✖️ 3. X-Cross',
    shortUr: '✖️ 3. ایکس کراس',
    labelEn: '✖️ 3. X-Cross Star Match',
    labelUr: '✖️ 3. ایکس کراس / سٹار چارس',
    descEn: 'Top and bottom rows invert to create an X-cross star pattern at the center',
    descUr: 'اوپر اور نیچے کی رگیں الٹ کر سینٹر میں کراس (X) ڈیزائن بناتی ہیں',
  },
  {
    id: 'v_match_tb',
    num: 4,
    shortEn: '💠 4. V-Chevron',
    shortUr: '💠 4. وی شیپ',
    labelEn: '💠 4. V-Shape Chevron Match',
    labelUr: '💠 4. وی شیپ (V-Chevron)',
    descEn: 'Left and right slabs mirror to form a continuous V-chevron from top to bottom',
    descUr: 'دائیں بائیں کی سلیبیں مل کر اوپر سے نیچے یکساں V شکل بناتی ہیں',
  },
  {
    id: 'pinwheel_spiral',
    num: 5,
    shortEn: '🌀 5. Outer Frame',
    shortUr: '🌀 5. آؤٹر فریم',
    labelEn: '🌀 5. Reverse Outer Frame Match',
    labelUr: '🌀 5. ریورس فریم چارس',
    descEn: 'Veins frame the outer perimeter corners along the room border',
    descUr: 'رگیں باہر کے بارڈر کے چاروں کونوں کی طرف فریم بناتی ہیں',
  },
  {
    id: 'straight_flow',
    num: 6,
    shortEn: '🌊 6. Straight Flow',
    shortUr: '🌊 6. سیدھی لہر',
    labelEn: '🌊 6. Continuous Vein Flow',
    labelUr: '🌊 6. سیدھی لہر (Straight Flow)',
    descEn: 'All slabs follow the same parallel diagonal vein direction',
    descUr: 'تمام سلیبوں کی رگیں ایک ہی رخ پر سیدھی چلتی ہیں',
  },
];

const CONTRAST_MARBLE_META: Record<
  ContrastMarbleType,
  {
    shortEn: string;
    shortUr: string;
    nameUr: string;
    nameEn: string;
    bgHex: string;
    veinHex: string;
    borderHex: string;
  }
> = {
  emperador_brown: {
    shortEn: 'Brown Marble',
    shortUr: 'براؤن ماربل',
    nameUr: 'براؤن ماربل (Emperador Brown)',
    nameEn: 'Emperador Brown Marble',
    bgHex: '#451a03',
    veinHex: '#d97706',
    borderHex: '#b45309',
  },
  black_gold: {
    shortEn: 'Black & Gold',
    shortUr: 'بلیک اینڈ گولڈ',
    nameUr: 'بلیک اینڈ گولڈ ماربل (Black & Gold)',
    nameEn: 'Black & Gold Marble',
    bgHex: '#0f172a',
    veinHex: '#f59e0b',
    borderHex: '#fbbf24',
  },
  green_onyx: {
    shortEn: 'Green Onyx',
    shortUr: 'گرین اونکس',
    nameUr: 'گرین اونکس پٹی (Green Onyx)',
    nameEn: 'Emerald Green Onyx',
    bgHex: '#064e3b',
    veinHex: '#34d399',
    borderHex: '#10b981',
  },
  cream_marfil: {
    shortEn: 'Cream Marfil',
    shortUr: 'کریم مارفل',
    nameUr: 'کریم مارفل پٹی (Cream Marble)',
    nameEn: 'Crema Marfil Marble',
    bgHex: '#fef3c7',
    veinHex: '#d97706',
    borderHex: '#f59e0b',
  },
  red_verona: {
    shortEn: 'Red Verona',
    shortUr: 'ریڈ ویرونا',
    nameUr: 'ریڈ ویرونا ماربل (Red Verona)',
    nameEn: 'Red Verona Marble',
    bgHex: '#7f1d1d',
    veinHex: '#fca5a5',
    borderHex: '#ef4444',
  },
};

const PIECE_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
];

export function RoomFloorBookmatchPlanner({
  cadLang,
  slabImageUrl,
  slabMaterialName,
  slabLotId = 'LOT-BM-01',
  slabWidthIn,
  slabLengthIn,
  slabQuantity,
  slabRatePerSqFt,
  bladeKerfIn = 0.15,
  edgeTrimIn = 0,
  onUpdateKerfAndEdgeTrim,
  onSaveCurrentSlabToStock,
  onLoadSavedStockLot,
  onAdjustSavedStockQty,
  onDeleteSavedStockLot,
  onBulkUploadSlabPhotos,
  savedStockLots = [],
  onAddBorderSlabToStock,
  onSaveWasteOffcutsToOptimizer,
  onLoadSavedStockInSlabCutter,
  onUpdateSlabConfig,
  onTriggerSlabPhotoUpload,
  onSelectPresetSlabTexture,
  onApplyRoomPartsToCutter,
  onGenerateExcelBill,
}: RoomFloorBookmatchPlannerProps) {
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);

  // =========================================================================
  // 0. MULTI-ROOM PROFILES & DEDICATED PER-ROOM PDF SYSTEM
  // =========================================================================
  const [roomsList, setRoomsList] = useState<SavedRoomProfile[]>([
    {
      id: 'room-1',
      roomNameEn: 'Room 1: Drawing Room',
      roomNameUr: 'کمرہ 1: ڈرائنگ روم',
      clientName: 'Main Project',
      roomWidthFt: 14,
      roomLengthFt: 16,
      roomWidthExtraIn: 0,
      roomLengthExtraIn: 0,
      designMode: 'center_bm_brass_patti_border',
      veinPattern: 'diamond_4way',
      centerPiecesGrid: '4_pieces',
      hasOuterBorder: true,
      outerBorderWidthIn: 15,
      borderSlabSource: 'from_bm_slabs_leftover',
      hasContrastPatti: true,
      contrastPattiWidthIn: 6,
      contrastMarbleType: 'emperador_brown',
      hasBrassPatti: true,
      brassPattiSizeIn: 0.25,
      mapX: 4,
      mapY: 6,
      mapW: 44,
      mapH: 42,
    },
    {
      id: 'room-2',
      roomNameEn: 'Room 2: Master Bedroom',
      roomNameUr: 'کمرہ 2: ماسٹر بیڈ روم',
      clientName: 'Main Project',
      roomWidthFt: 12,
      roomLengthFt: 14,
      roomWidthExtraIn: 0,
      roomLengthExtraIn: 0,
      designMode: 'center_bm_with_border',
      veinPattern: 'butterfly_lr',
      centerPiecesGrid: '4_pieces',
      hasOuterBorder: true,
      outerBorderWidthIn: 12,
      borderSlabSource: 'from_bm_slabs_leftover',
      hasContrastPatti: false,
      contrastPattiWidthIn: 6,
      contrastMarbleType: 'black_gold',
      hasBrassPatti: true,
      brassPattiSizeIn: 0.25,
      mapX: 52,
      mapY: 6,
      mapW: 44,
      mapH: 42,
    },
  ]);
  const [activeRoomId, setActiveRoomId] = useState<string>('room-1');
  const [roomNameInput, setRoomNameInput] = useState<string>('Room 1: Drawing Room');
  const [clientNameInput, setClientNameInput] = useState<string>('Main Project');
  const [isRoomPdfModalOpen, setIsRoomPdfModalOpen] = useState<boolean>(false);

  // =========================================================================
  // 0B. 2D HOUSE MAP / AUTOCAD (.DWG / .DXF / PLAN IMAGE) MULTI-ROOM SYSTEM
  // =========================================================================
  const [showHouseMapPanel, setShowHouseMapPanel] = useState<boolean>(false);
  const [houseMapFileName, setHouseMapFileName] = useState<string | null>(null);
  const [houseMapImageUrl, setHouseMapImageUrl] = useState<string | null>(null);
  const [houseMapCadLines, setHouseMapCadLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number }>
  >([]);
  const [houseMapCadLabels, setHouseMapCadLabels] = useState<
    Array<{ x: number; y: number; text: string }>
  >([]);
  const [draggingMapRoomId, setDraggingMapRoomId] = useState<string | null>(null);
  const houseMapFileInputRef = useRef<HTMLInputElement | null>(null);
  const houseMapBoxRef = useRef<HTMLDivElement | null>(null);

  // Interactive AutoCAD Workstation UI, Dropdown Menus, DWG Room Draw & Drag-Drop State
  const [openRibbonMenu, setOpenRibbonMenu] = useState<
    'border' | 'brass' | 'strip' | 'design' | 'material' | 'stock' | 'pieces' | 'room' | 'export' | null
  >(null);
  const [centerCanvasTab, setCenterCanvasTab] = useState<
    'dual' | 'floor_only' | 'slab_only' | 'dwg_floor_editor'
  >('dual');
  const [rightStockView, setRightStockView] = useState<
    'active_slabs' | 'leftover_offcuts' | 'saved_stock'
  >('active_slabs');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [showWasteBankDrawer, setShowWasteBankDrawer] = useState<boolean>(false);
  const [dwgDrawMode, setDwgDrawMode] = useState<boolean>(false);
  const [dwgTotalWidthFt, setDwgTotalWidthFt] = useState<number>(50);
  const [dwgTotalLengthFt, setDwgTotalLengthFt] = useState<number>(60);
  const [dwgDrawRect, setDwgDrawRect] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const [draggedStockItem, setDraggedStockItem] = useState<
    | { kind: 'active_slab'; slabNum: number }
    | { kind: 'saved_lot'; lotId: string }
    | { kind: 'piece'; pieceId: string; code: string }
    | null
  >(null);
  const [dragOverTargetKey, setDragOverTargetKey] = useState<string | null>(null);

  // =========================================================================
  // 1. ROOM DIMENSIONS & DESIGN MODE STATE
  // =========================================================================
  const [roomWidthFt, setRoomWidthFt] = useState<number>(14);
  const [roomLengthFt, setRoomLengthFt] = useState<number>(16);
  const [roomWidthExtraIn, setRoomWidthExtraIn] = useState<number>(0);
  const [roomLengthExtraIn, setRoomLengthExtraIn] = useState<number>(0);

  const [designMode, setDesignMode] = useState<FloorLayoutDesignMode>(
    'center_bm_brass_patti_border'
  );
  const [veinPattern, setVeinPattern] = useState<BookmatchVeinPattern>('diamond_4way');
  const [centerPiecesGrid, setCenterPiecesGrid] = useState<'4_pieces' | '2_pieces' | '6_pieces'>(
    '4_pieces'
  );
  const [customGridRows, setCustomGridRows] = useState<number>(2);
  const [customGridCols, setCustomGridCols] = useState<number>(2);
  const [slabPlacementMode, setSlabPlacementMode] = useState<
    'center_both_sides_cut' | 'one_side_full_opposite_cut' | 'equal_all_pieces'
  >('center_both_sides_cut');
  const [fullSlabStartCorner, setFullSlabStartCorner] = useState<
    'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
  >('top_left');
  const [slabDirectionInRoom, setSlabDirectionInRoom] = useState<'horizontal' | 'vertical'>(
    'horizontal'
  );

  // =========================================================================
  // 2. BORDER SLAB + PATTI SLAB UPLOAD & SAVED STOCK LOT SELECTION SYSTEM
  // =========================================================================
  const [hasOuterBorder, setHasOuterBorder] = useState<boolean>(true);
  const [outerBorderWidthIn, setOuterBorderWidthIn] = useState<number>(15);
  const [borderSlabSource, setBorderSlabSource] = useState<BorderSlabSourceMode>(
    'from_bm_slabs_leftover'
  );
  const [borderStockLotId, setBorderStockLotId] = useState<string | null>(null);
  const [borderSlabMaterialName, setBorderSlabMaterialName] = useState<string>(
    'Black & Gold Border Slab'
  );
  const [borderSlabWidthIn, setBorderSlabWidthIn] = useState<number>(58);
  const [borderSlabLengthIn, setBorderSlabLengthIn] = useState<number>(106);
  const [borderSlabQty, setBorderSlabQty] = useState<number>(2);
  const [borderSlabRate, setBorderSlabRate] = useState<number>(650);
  const [borderSlabImageUrl, setBorderSlabImageUrl] = useState<string>(
    '/images/black_gold_slab.png'
  );
  const [isBorderCustomUploaded, setIsBorderCustomUploaded] = useState<boolean>(false);
  const [showBorderSlabDrawer, setShowBorderSlabDrawer] = useState<boolean>(false);

  // Contrast Patti Slab Upload, Stock Selection & Size State
  const [hasContrastPatti, setHasContrastPatti] = useState<boolean>(true);
  const [contrastPattiWidthIn, setContrastPattiWidthIn] = useState<number>(6);
  const [contrastMarbleType, setContrastMarbleType] =
    useState<ContrastMarbleType>('emperador_brown');
  const [pattiStockLotId, setPattiStockLotId] = useState<string | null>(null);
  const [pattiCustomSlabImageUrl, setPattiCustomSlabImageUrl] = useState<string | null>(null);
  const [pattiSlabMaterialName, setTwinPattiSlabName] = useState<string>(
    'Emperador Brown Patti Slab'
  );
  const [pattiSlabWidthIn, setPattiSlabWidthIn] = useState<number>(48);
  const [pattiSlabLengthIn, setPattiSlabLengthIn] = useState<number>(96);
  const [pattiSlabQty, setPattiSlabQty] = useState<number>(1);
  const [pattiSlabRate, setPattiSlabRate] = useState<number>(550);
  const [showPattiSlabDrawer, setShowPattiSlabDrawer] = useState<boolean>(false);

  const [hasBrassPatti, setHasBrassPatti] = useState<boolean>(true);
  const [brassPattiSizeIn] = useState<number>(0.25);
  const [doubleBrassPatti, setDoubleBrassPatti] = useState<boolean>(true);

  const [hasWallSkirting] = useState<boolean>(true);
  const [skirtingHeightIn] = useState<number>(4);

  // =========================================================================
  // 3. MANUAL ROOM SLAB GRAB / ADJUST MODE & FULLSCREEN CHAURAS MONITOR VIEW
  // =========================================================================
  const [isManualSlabGrabMode, setIsManualSlabGrabMode] = useState<boolean>(false);
  const [isChaurasFullScreenModal, setIsChaurasFullScreenModal] = useState<boolean>(false);
  const [roomDraggingPieceIdx, setRoomDraggingPieceIdx] = useState<number | null>(null);
  const [roomDragStartMouse, setRoomDragStartMouse] = useState<{
    x: number;
    y: number;
    startCropX: number;
    startCropY: number;
  } | null>(null);
  const [swapSourcePieceIdx, setSwapSourcePieceIdx] = useState<number | null>(null);
  const [slotToSlabMap, setSlotToSlabMap] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  ]);

  const [perSlabStates, setPerSlabStates] = useState<Record<number, IndividualSlabBookmatchState>>({
    1: {
      slabNumber: 1,
      pieceLetter: 'A',
      customImageUrl: null,
      imageLabel: 'Default Slab Image',
      cropXPercent: 0,
      cropYPercent: 0,
      rotationDeg: 0,
      flipHOverride: null,
      flipVOverride: null,
      customPieceWidthIn: null,
      customPieceLengthIn: null,
    },
    2: {
      slabNumber: 2,
      pieceLetter: 'B',
      customImageUrl: null,
      imageLabel: 'Default Slab Image',
      cropXPercent: 0,
      cropYPercent: 0,
      rotationDeg: 0,
      flipHOverride: null,
      flipVOverride: null,
      customPieceWidthIn: null,
      customPieceLengthIn: null,
    },
    3: {
      slabNumber: 3,
      pieceLetter: 'C',
      customImageUrl: null,
      imageLabel: 'Default Slab Image',
      cropXPercent: 0,
      cropYPercent: 0,
      rotationDeg: 0,
      flipHOverride: null,
      flipVOverride: null,
      customPieceWidthIn: null,
      customPieceLengthIn: null,
    },
    4: {
      slabNumber: 4,
      pieceLetter: 'D',
      customImageUrl: null,
      imageLabel: 'Default Slab Image',
      cropXPercent: 0,
      cropYPercent: 0,
      rotationDeg: 0,
      flipHOverride: null,
      flipVOverride: null,
      customPieceWidthIn: null,
      customPieceLengthIn: null,
    },
  });

  const [syncAllSlabsCrop, setSyncAllSlabsCrop] = useState<boolean>(true);
  const [activeSlabIndex, setActiveSlabIndex] = useState<number>(1);
  const [draggingSlabNum, setDraggingSlabNum] = useState<number | null>(null);
  const [resizingSlabDrag, setResizingSlabDrag] = useState<{
    slabNum: number;
    axis: 'both' | 'w' | 'l';
    startX: number;
    startY: number;
    startWIn: number;
    startLIn: number;
    startCutXIn: number;
    startCutYIn: number;
    rectW: number;
    rectH: number;
  } | null>(null);
  const [slabDropdownMenu, setSlabDropdownMenu] = useState<'values' | 'adjust' | null>(null);
  const [inDiagramPopup, setInDiagramPopup] = useState<
    'design' | 'border' | 'brass' | 'strip' | 'room' | 'piece' | null
  >(null);
  const [viewportDims, setViewportDims] = useState<{ w: number; h: number }>({ w: 1366, h: 780 });
  const [chaurasPurePreview, setChaurasPurePreview] = useState<boolean>(false);
  const [floorViewMode, setFloorViewMode] = useState<'cad' | 'clean' | 'pdf_preview'>('cad');
  const [showViewModeDropdown, setShowViewModeDropdown] = useState<boolean>(false);
  const handleSelectFloorViewMode = (mode: 'cad' | 'clean' | 'pdf_preview') => {
    setFloorViewMode(mode);
    setChaurasPurePreview(mode === 'clean');
    setShowViewModeDropdown(false);
  };
  const [isAutoSlabGridMode, setIsAutoSlabGridMode] = useState<boolean>(true);
  const [selectedFloorPieceCode, setSelectedFloorPieceCode] = useState<string | null>(null);

  const [selectedRoomZone, setSelectedRoomZone] = useState<
    'center_bookmatch' | 'contrast_patti' | 'outer_border'
  >('center_bookmatch');
  const [showBlueprintCadLines, setShowBlueprintCadLines] = useState<boolean>(true);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [diagramZoomPct, setDiagramZoomPct] = useState<number>(100);
  const [showAllSlabsList, setShowAllSlabsList] = useState<boolean>(false);

  useEffect(() => {
    const updateDims = () => {
      setViewportDims({ w: window.innerWidth, h: window.innerHeight });
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Side-Cut Multi-Piece Packing Toggle & Piece-to-Slab Manual Reassignment
  const [sideCutPackingMode, setSideCutPackingMode] = useState<
    'pack_multi_per_slab' | 'separate_slab_per_piece'
  >('pack_multi_per_slab');
  const [pieceTargetSlabOverrides, setPieceTargetSlabOverrides] = useState<
    Record<string, number>
  >({});
  const [showSideStockDock, setShowSideStockDock] = useState<boolean>(true);
  const [sideDockTab, setSideDockTab] = useState<'active_slabs' | 'saved_lots'>('active_slabs');

  const slabListScrollRef = useRef<HTMLDivElement | null>(null);
  const slabCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const slabBoxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const perSlabFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const borderSlabFileInputRef = useRef<HTMLInputElement | null>(null);
  const pattiSlabFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRoomPlannerHydrated, setIsRoomPlannerHydrated] = useState<boolean>(false);

  // Restore saved Room Floor Planner state & uploaded slab photos from IndexedDB / LocalStorage
  useEffect(() => {
    let mounted = true;
    loadStoneCutProjectFromIDB<{
      roomsList?: SavedRoomProfile[];
      activeRoomId?: string;
      roomNameInput?: string;
      clientNameInput?: string;
      roomWidthFt?: number;
      roomLengthFt?: number;
      roomWidthExtraIn?: number;
      roomLengthExtraIn?: number;
      designMode?: FloorLayoutDesignMode;
      veinPattern?: BookmatchVeinPattern;
      centerPiecesGrid?: '4_pieces' | '2_pieces' | '6_pieces';
      customGridRows?: number;
      customGridCols?: number;
      slabPlacementMode?: 'center_both_sides_cut' | 'one_side_full_opposite_cut' | 'equal_all_pieces';
      fullSlabStartCorner?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
      slabDirectionInRoom?: 'horizontal' | 'vertical';
      hasOuterBorder?: boolean;
      outerBorderWidthIn?: number;
      borderSlabSource?: BorderSlabSourceMode;
      borderStockLotId?: string | null;
      borderSlabMaterialName?: string;
      borderSlabWidthIn?: number;
      borderSlabLengthIn?: number;
      borderSlabQty?: number;
      borderSlabRate?: number;
      borderSlabImageUrl?: string;
      isBorderCustomUploaded?: boolean;
      hasContrastPatti?: boolean;
      contrastPattiWidthIn?: number;
      contrastMarbleType?: ContrastMarbleType;
      pattiStockLotId?: string | null;
      pattiCustomSlabImageUrl?: string | null;
      pattiSlabMaterialName?: string;
      pattiSlabWidthIn?: number;
      pattiSlabLengthIn?: number;
      pattiSlabQty?: number;
      pattiSlabRate?: number;
      perSlabStates?: Record<number, IndividualSlabBookmatchState>;
      houseMapFileName?: string | null;
      houseMapImageUrl?: string | null;
      houseMapCadLines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
      sideCutPackingMode?: 'pack_multi_per_slab' | 'separate_slab_per_piece';
      pieceTargetSlabOverrides?: Record<string, number>;
      isAutoSlabGridMode?: boolean;
      isManualSlabGrabMode?: boolean;
    }>('stonecut_room_floor_planner_v2')
      .then((saved) => {
        if (!mounted) return;
        const applySaved = (data: NonNullable<typeof saved>) => {
          if (Array.isArray(data.roomsList) && data.roomsList.length > 0) setRoomsList(data.roomsList);
          if (data.activeRoomId) setActiveRoomId(data.activeRoomId);
          if (data.roomNameInput) setRoomNameInput(data.roomNameInput);
          if (data.clientNameInput) setClientNameInput(data.clientNameInput);
          if (typeof data.roomWidthFt === 'number') setRoomWidthFt(data.roomWidthFt);
          if (typeof data.roomLengthFt === 'number') setRoomLengthFt(data.roomLengthFt);
          if (typeof data.roomWidthExtraIn === 'number') setRoomWidthExtraIn(data.roomWidthExtraIn);
          if (typeof data.roomLengthExtraIn === 'number') setRoomLengthExtraIn(data.roomLengthExtraIn);
          if (data.designMode) setDesignMode(data.designMode);
          if (data.veinPattern) setVeinPattern(data.veinPattern);
          if (data.centerPiecesGrid) setCenterPiecesGrid(data.centerPiecesGrid);
          if (typeof data.customGridRows === 'number') setCustomGridRows(data.customGridRows);
          if (typeof data.customGridCols === 'number') setCustomGridCols(data.customGridCols);
          if (data.slabPlacementMode) setSlabPlacementMode(data.slabPlacementMode);
          if (data.fullSlabStartCorner) setFullSlabStartCorner(data.fullSlabStartCorner);
          if (data.slabDirectionInRoom) setSlabDirectionInRoom(data.slabDirectionInRoom);
          if (typeof data.hasOuterBorder === 'boolean') setHasOuterBorder(data.hasOuterBorder);
          if (typeof data.outerBorderWidthIn === 'number') setOuterBorderWidthIn(data.outerBorderWidthIn);
          if (data.borderSlabSource) setBorderSlabSource(data.borderSlabSource);
          if (data.borderStockLotId !== undefined) setBorderStockLotId(data.borderStockLotId);
          if (data.borderSlabMaterialName) setBorderSlabMaterialName(data.borderSlabMaterialName);
          if (typeof data.borderSlabWidthIn === 'number') setBorderSlabWidthIn(data.borderSlabWidthIn);
          if (typeof data.borderSlabLengthIn === 'number') setBorderSlabLengthIn(data.borderSlabLengthIn);
          if (typeof data.borderSlabQty === 'number') setBorderSlabQty(data.borderSlabQty);
          if (typeof data.borderSlabRate === 'number') setBorderSlabRate(data.borderSlabRate);
          if (data.borderSlabImageUrl) setBorderSlabImageUrl(data.borderSlabImageUrl);
          if (typeof data.isBorderCustomUploaded === 'boolean')
            setIsBorderCustomUploaded(data.isBorderCustomUploaded);
          if (typeof data.hasContrastPatti === 'boolean') setHasContrastPatti(data.hasContrastPatti);
          if (typeof data.contrastPattiWidthIn === 'number')
            setContrastPattiWidthIn(data.contrastPattiWidthIn);
          if (data.contrastMarbleType) setContrastMarbleType(data.contrastMarbleType);
          if (data.pattiStockLotId !== undefined) setPattiStockLotId(data.pattiStockLotId);
          if (data.pattiCustomSlabImageUrl !== undefined)
            setPattiCustomSlabImageUrl(data.pattiCustomSlabImageUrl);
          if (data.pattiSlabMaterialName) setTwinPattiSlabName(data.pattiSlabMaterialName);
          if (typeof data.pattiSlabWidthIn === 'number') setPattiSlabWidthIn(data.pattiSlabWidthIn);
          if (typeof data.pattiSlabLengthIn === 'number') setPattiSlabLengthIn(data.pattiSlabLengthIn);
          if (typeof data.pattiSlabQty === 'number') setPattiSlabQty(data.pattiSlabQty);
          if (typeof data.pattiSlabRate === 'number') setPattiSlabRate(data.pattiSlabRate);
          if (data.perSlabStates && Object.keys(data.perSlabStates).length > 0) {
            setPerSlabStates(data.perSlabStates);
          }
          if (data.houseMapFileName !== undefined) setHouseMapFileName(data.houseMapFileName);
          if (data.houseMapImageUrl !== undefined) setHouseMapImageUrl(data.houseMapImageUrl);
          if (Array.isArray(data.houseMapCadLines)) setHouseMapCadLines(data.houseMapCadLines);
          if (data.sideCutPackingMode) setSideCutPackingMode(data.sideCutPackingMode);
          if (data.pieceTargetSlabOverrides) setPieceTargetSlabOverrides(data.pieceTargetSlabOverrides);
          if (typeof data.isAutoSlabGridMode === 'boolean') setIsAutoSlabGridMode(data.isAutoSlabGridMode);
          if (typeof data.isManualSlabGrabMode === 'boolean') setIsManualSlabGrabMode(data.isManualSlabGrabMode);
        };

        if (saved) {
          applySaved(saved);
        } else {
          try {
            const rawLocal = window.localStorage.getItem('stonecut_room_floor_planner_backup_v2');
            if (rawLocal) {
              applySaved(JSON.parse(rawLocal));
            }
          } catch {
            // ignore localStorage fallback error
          }
        }
        setIsRoomPlannerHydrated(true);
      })
      .catch(() => {
        if (mounted) setIsRoomPlannerHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Automatically save Room Floor Planner state & uploaded slab photos to IndexedDB + LocalStorage
  useEffect(() => {
    if (!isRoomPlannerHydrated) return;
    const payload = {
      roomsList,
      activeRoomId,
      roomNameInput,
      clientNameInput,
      roomWidthFt,
      roomLengthFt,
      roomWidthExtraIn,
      roomLengthExtraIn,
      designMode,
      veinPattern,
      centerPiecesGrid,
      customGridRows,
      customGridCols,
      slabPlacementMode,
      fullSlabStartCorner,
      slabDirectionInRoom,
      hasOuterBorder,
      outerBorderWidthIn,
      borderSlabSource,
      borderStockLotId,
      borderSlabMaterialName,
      borderSlabWidthIn,
      borderSlabLengthIn,
      borderSlabQty,
      borderSlabRate,
      borderSlabImageUrl,
      isBorderCustomUploaded,
      hasContrastPatti,
      contrastPattiWidthIn,
      contrastMarbleType,
      pattiStockLotId,
      pattiCustomSlabImageUrl,
      pattiSlabMaterialName,
      pattiSlabWidthIn,
      pattiSlabLengthIn,
      pattiSlabQty,
      pattiSlabRate,
      perSlabStates,
      houseMapFileName,
      houseMapImageUrl,
      houseMapCadLines,
      sideCutPackingMode,
      pieceTargetSlabOverrides,
      isAutoSlabGridMode,
      isManualSlabGrabMode,
    };
    const timer = window.setTimeout(() => {
      saveStoneCutProjectToIDB('stonecut_room_floor_planner_v2', payload).catch(() => {});
      try {
        window.localStorage.setItem('stonecut_room_floor_planner_backup_v2', JSON.stringify(payload));
      } catch {
        // ignore quota errors if dataUrl is large; IDB still stores full high-res photos
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [
    isRoomPlannerHydrated,
    roomsList,
    activeRoomId,
    roomNameInput,
    clientNameInput,
    roomWidthFt,
    roomLengthFt,
    roomWidthExtraIn,
    roomLengthExtraIn,
    designMode,
    veinPattern,
    centerPiecesGrid,
    customGridRows,
    customGridCols,
    slabPlacementMode,
    fullSlabStartCorner,
    slabDirectionInRoom,
    hasOuterBorder,
    outerBorderWidthIn,
    borderSlabSource,
    borderStockLotId,
    borderSlabMaterialName,
    borderSlabWidthIn,
    borderSlabLengthIn,
    borderSlabQty,
    borderSlabRate,
    borderSlabImageUrl,
    isBorderCustomUploaded,
    hasContrastPatti,
    contrastPattiWidthIn,
    contrastMarbleType,
    pattiStockLotId,
    pattiCustomSlabImageUrl,
    pattiSlabMaterialName,
    pattiSlabWidthIn,
    pattiSlabLengthIn,
    pattiSlabQty,
    pattiSlabRate,
    perSlabStates,
    houseMapFileName,
    houseMapImageUrl,
    houseMapCadLines,
    sideCutPackingMode,
    pieceTargetSlabOverrides,
    isAutoSlabGridMode,
    isManualSlabGrabMode,
  ]);

  // Switch between saved rooms or add a new room
  const handleSelectRoomProfile = (rm: SavedRoomProfile) => {
    // Save current room state before switching
    setRoomsList((prev) =>
      prev.map((item) =>
        item.id === activeRoomId
          ? {
              ...item,
              roomNameEn: roomNameInput,
              roomNameUr: roomNameInput,
              clientName: clientNameInput,
              roomWidthFt,
              roomLengthFt,
              roomWidthExtraIn,
              roomLengthExtraIn,
              designMode,
              veinPattern,
              centerPiecesGrid,
              hasOuterBorder,
              outerBorderWidthIn,
              borderSlabSource,
              hasContrastPatti,
              contrastPattiWidthIn,
              contrastMarbleType,
              hasBrassPatti,
              brassPattiSizeIn,
            }
          : item
      )
    );
    setActiveRoomId(rm.id);
    setRoomNameInput(cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn);
    setClientNameInput(rm.clientName);
    setRoomWidthFt(rm.roomWidthFt);
    setRoomLengthFt(rm.roomLengthFt);
    setRoomWidthExtraIn(rm.roomWidthExtraIn);
    setRoomLengthExtraIn(rm.roomLengthExtraIn);
    setDesignMode(rm.designMode);
    setVeinPattern(rm.veinPattern);
    setCenterPiecesGrid(rm.centerPiecesGrid);
    if (rm.centerPiecesGrid === '2_pieces') {
      setCustomGridRows(1);
      setCustomGridCols(2);
    } else if (rm.centerPiecesGrid === '6_pieces') {
      setCustomGridRows(2);
      setCustomGridCols(3);
    } else {
      setCustomGridRows(2);
      setCustomGridCols(2);
    }
    setHasOuterBorder(rm.hasOuterBorder);
    setOuterBorderWidthIn(rm.outerBorderWidthIn);
    setBorderSlabSource(rm.borderSlabSource);
    setHasContrastPatti(rm.hasContrastPatti);
    setContrastPattiWidthIn(rm.contrastPattiWidthIn);
    setContrastMarbleType(rm.contrastMarbleType);
    setHasBrassPatti(rm.hasBrassPatti);
  };

  const handleAddNewRoomProfile = () => {
    const nextNum = roomsList.length + 1;
    const newId = `room-${Date.now()}`;
    const defaultEn = `Room ${nextNum}: TV Lounge / Hall`;
    const defaultUr = `کمرہ ${nextNum}: ٹی وی لاؤنج / ہال`;
    const colIdx = (nextNum - 1) % 2;
    const rowIdx = Math.floor((nextNum - 1) / 2);
    const newRoom: SavedRoomProfile = {
      id: newId,
      roomNameEn: defaultEn,
      roomNameUr: defaultUr,
      clientName: clientNameInput,
      roomWidthFt: 15,
      roomLengthFt: 18,
      roomWidthExtraIn: 0,
      roomLengthExtraIn: 0,
      designMode: 'center_bm_brass_patti_border',
      veinPattern: 'diamond_4way',
      centerPiecesGrid: '4_pieces',
      hasOuterBorder: true,
      outerBorderWidthIn: 15,
      borderSlabSource: 'from_bm_slabs_leftover',
      hasContrastPatti: true,
      contrastPattiWidthIn: 6,
      contrastMarbleType: 'emperador_brown',
      hasBrassPatti: true,
      brassPattiSizeIn: 0.25,
      mapX: colIdx === 0 ? 4 : 52,
      mapY: Math.min(60, 6 + rowIdx * 46),
      mapW: 44,
      mapH: 40,
    };
    setRoomsList((prev) => [...prev, newRoom]);
    setActiveRoomId(newId);
    setRoomNameInput(cadLang === 'ur' ? defaultUr : defaultEn);
    setRoomWidthFt(15);
    setRoomLengthFt(18);
    setRoomWidthExtraIn(0);
    setRoomLengthExtraIn(0);
  };

  // Upload 2D House Map (.DWG, .DXF, or Floor Plan Image .PNG/.JPG) & Parse Rooms
  const handleHouseMapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHouseMapFileName(file.name);
    setShowHouseMapPanel(true);
    setCenterCanvasTab('dwg_floor_editor');

    const lowerName = file.name.toLowerCase();
    if (
      file.type.startsWith('image/') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.svg')
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setHouseMapImageUrl(reader.result);
          setHouseMapCadLines([]);
          setHouseMapCadLabels([]);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    // Parse .DXF / .DWG CAD file for vector lines & room labels/dimensions
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setHouseMapImageUrl(null);
      const rawLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      const rawLabels: Array<{ x: number; y: number; text: string }> = [];

      const tokens = text.split(/\r?\n/).map((t) => t.trim());
      for (let i = 0; i < tokens.length - 7; i++) {
        if (tokens[i] === '0' && tokens[i + 1] === 'LINE') {
          let x1 = 0;
          let y1 = 0;
          let x2 = 0;
          let y2 = 0;
          let found = 0;
          for (let j = i + 2; j < Math.min(tokens.length - 1, i + 30); j += 2) {
            const code = tokens[j];
            const val = parseFloat(tokens[j + 1]);
            if (code === '0') break;
            if (code === '10' && !isNaN(val)) {
              x1 = val;
              found++;
            } else if (code === '20' && !isNaN(val)) {
              y1 = val;
              found++;
            } else if (code === '11' && !isNaN(val)) {
              x2 = val;
              found++;
            } else if (code === '21' && !isNaN(val)) {
              y2 = val;
              found++;
            }
          }
          if (found >= 4) {
            rawLines.push({ x1, y1, x2, y2 });
          }
        } else if (tokens[i] === '0' && (tokens[i + 1] === 'TEXT' || tokens[i + 1] === 'MTEXT')) {
          let tx = 0;
          let ty = 0;
          let label = '';
          for (let j = i + 2; j < Math.min(tokens.length - 1, i + 26); j += 2) {
            const code = tokens[j];
            if (code === '0') break;
            if (code === '10') tx = parseFloat(tokens[j + 1]) || 0;
            if (code === '20') ty = parseFloat(tokens[j + 1]) || 0;
            if (code === '1') label = tokens[j + 1] || '';
          }
          if (label) {
            rawLabels.push({ x: tx, y: ty, text: label });
          }
        }
      }

      if (rawLines.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        rawLines.forEach((ln) => {
          minX = Math.min(minX, ln.x1, ln.x2);
          maxX = Math.max(maxX, ln.x1, ln.x2);
          minY = Math.min(minY, ln.y1, ln.y2);
          maxY = Math.max(maxY, ln.y1, ln.y2);
        });
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const normalizedLines = rawLines.slice(0, 600).map((ln) => ({
          x1: Number((((ln.x1 - minX) / spanX) * 92 + 4).toFixed(2)),
          y1: Number(((1 - (ln.y1 - minY) / spanY) * 90 + 5).toFixed(2)),
          x2: Number((((ln.x2 - minX) / spanX) * 92 + 4).toFixed(2)),
          y2: Number(((1 - (ln.y2 - minY) / spanY) * 90 + 5).toFixed(2)),
        }));
        const normalizedLabels = rawLabels.slice(0, 40).map((lb) => ({
          x: Number((((lb.x - minX) / spanX) * 92 + 4).toFixed(2)),
          y: Number(((1 - (lb.y - minY) / spanY) * 90 + 5).toFixed(2)),
          text: lb.text,
        }));
        setHouseMapCadLines(normalizedLines);
        setHouseMapCadLabels(normalizedLabels);
      } else {
        // Generate multi-room house architectural CAD walls if binary .DWG was uploaded
        setHouseMapCadLines([
          { x1: 3, y1: 4, x2: 97, y2: 4 },
          { x1: 97, y1: 4, x2: 97, y2: 96 },
          { x1: 97, y1: 96, x2: 3, y2: 96 },
          { x1: 3, y1: 96, x2: 3, y2: 4 },
          { x1: 50, y1: 4, x2: 50, y2: 96 },
          { x1: 3, y1: 50, x2: 97, y2: 50 },
        ]);
      }

      // If less than 4 rooms currently exist, auto-populate 4 standard house rooms when a House DWG is uploaded
      if (roomsList.length < 4) {
        const houseRooms: SavedRoomProfile[] = [
          {
            id: 'room-1',
            roomNameEn: 'Room 1: Drawing Room',
            roomNameUr: 'کمرہ 1: ڈرائنگ روم',
            clientName: clientNameInput,
            roomWidthFt: 14,
            roomLengthFt: 16,
            roomWidthExtraIn: 0,
            roomLengthExtraIn: 0,
            designMode: 'center_bm_brass_patti_border',
            veinPattern: 'diamond_4way',
            centerPiecesGrid: '4_pieces',
            hasOuterBorder: true,
            outerBorderWidthIn: 15,
            borderSlabSource: 'from_bm_slabs_leftover',
            hasContrastPatti: true,
            contrastPattiWidthIn: 6,
            contrastMarbleType: 'emperador_brown',
            hasBrassPatti: true,
            brassPattiSizeIn: 0.25,
            mapX: 4,
            mapY: 6,
            mapW: 44,
            mapH: 42,
          },
          {
            id: 'room-2',
            roomNameEn: 'Room 2: Master Bedroom',
            roomNameUr: 'کمرہ 2: ماسٹر بیڈ روم',
            clientName: clientNameInput,
            roomWidthFt: 12,
            roomLengthFt: 14,
            roomWidthExtraIn: 0,
            roomLengthExtraIn: 0,
            designMode: 'center_bm_with_border',
            veinPattern: 'butterfly_lr',
            centerPiecesGrid: '4_pieces',
            hasOuterBorder: true,
            outerBorderWidthIn: 12,
            borderSlabSource: 'from_bm_slabs_leftover',
            hasContrastPatti: false,
            contrastPattiWidthIn: 6,
            contrastMarbleType: 'black_gold',
            hasBrassPatti: true,
            brassPattiSizeIn: 0.25,
            mapX: 52,
            mapY: 6,
            mapW: 44,
            mapH: 42,
          },
          {
            id: 'room-3',
            roomNameEn: 'Room 3: TV Lounge / Hall',
            roomNameUr: 'کمرہ 3: ٹی وی لاؤنج / ہال',
            clientName: clientNameInput,
            roomWidthFt: 16,
            roomLengthFt: 20,
            roomWidthExtraIn: 0,
            roomLengthExtraIn: 0,
            designMode: 'center_bm_brass_patti_border',
            veinPattern: 'x_cross_star',
            centerPiecesGrid: '4_pieces',
            hasOuterBorder: true,
            outerBorderWidthIn: 15,
            borderSlabSource: 'from_bm_slabs_leftover',
            hasContrastPatti: true,
            contrastPattiWidthIn: 6,
            contrastMarbleType: 'emperador_brown',
            hasBrassPatti: true,
            brassPattiSizeIn: 0.25,
            mapX: 4,
            mapY: 52,
            mapW: 44,
            mapH: 42,
          },
          {
            id: 'room-4',
            roomNameEn: 'Room 4: Guest Bedroom',
            roomNameUr: 'کمرہ 4: گیسٹ بیڈ روم',
            clientName: clientNameInput,
            roomWidthFt: 12,
            roomLengthFt: 13,
            roomWidthExtraIn: 0,
            roomLengthExtraIn: 0,
            designMode: 'center_bm_with_border',
            veinPattern: 'v_match_tb',
            centerPiecesGrid: '4_pieces',
            hasOuterBorder: true,
            outerBorderWidthIn: 12,
            borderSlabSource: 'from_bm_slabs_leftover',
            hasContrastPatti: false,
            contrastPattiWidthIn: 6,
            contrastMarbleType: 'black_gold',
            hasBrassPatti: true,
            brassPattiSizeIn: 0.25,
            mapX: 52,
            mapY: 52,
            mapW: 44,
            mapH: 42,
          },
        ];
        setRoomsList(houseRooms);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleHouseMapRoomPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!houseMapBoxRef.current) return;
    const rect = houseMapBoxRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const relY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    if (dwgDrawMode && dwgDrawRect) {
      setDwgDrawRect((prev) => (prev ? { ...prev, curX: relX, curY: relY } : null));
      return;
    }
    if (!draggingMapRoomId) return;
    setRoomsList((prev) =>
      prev.map((rm) => {
        if (rm.id !== draggingMapRoomId) return rm;
        const w = rm.mapW ?? 44;
        const h = rm.mapH ?? 42;
        const nextX = Math.max(1, Math.min(99 - w, Number((relX - w / 2).toFixed(1))));
        const nextY = Math.max(1, Math.min(99 - h, Number((relY - h / 2).toFixed(1))));
        return { ...rm, mapX: nextX, mapY: nextY };
      })
    );
  };

  const handleDwgCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dwgDrawMode || !houseMapBoxRef.current) return;
    const rect = houseMapBoxRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const relY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDwgDrawRect({ startX: relX, startY: relY, curX: relX, curY: relY });
  };

  const handleDwgCanvasMouseUp = () => {
    setDraggingMapRoomId(null);
    if (!dwgDrawMode || !dwgDrawRect) {
      setDwgDrawRect(null);
      return;
    }
    const minX = Math.min(dwgDrawRect.startX, dwgDrawRect.curX);
    const minY = Math.min(dwgDrawRect.startY, dwgDrawRect.curY);
    const spanW = Math.abs(dwgDrawRect.curX - dwgDrawRect.startX);
    const spanH = Math.abs(dwgDrawRect.curY - dwgDrawRect.startY);
    setDwgDrawRect(null);
    if (spanW < 4 || spanH < 4) return;

    const calcWFt = Math.max(6, Math.round((spanW / 100) * dwgTotalWidthFt));
    const calcLFt = Math.max(6, Math.round((spanH / 100) * dwgTotalLengthFt));
    const nextNum = roomsList.length + 1;
    const newId = `room-${Date.now()}`;
    const newRoom: SavedRoomProfile = {
      id: newId,
      roomNameEn: `CAD Room ${nextNum}`,
      roomNameUr: `کیڈ کمرہ ${nextNum}`,
      clientName: clientNameInput,
      roomWidthFt: calcWFt,
      roomLengthFt: calcLFt,
      roomWidthExtraIn: 0,
      roomLengthExtraIn: 0,
      designMode: 'center_bm_brass_patti_border',
      veinPattern,
      centerPiecesGrid,
      hasOuterBorder,
      outerBorderWidthIn,
      borderSlabSource,
      hasContrastPatti,
      contrastPattiWidthIn,
      contrastMarbleType,
      hasBrassPatti,
      brassPattiSizeIn,
      mapX: Number(minX.toFixed(1)),
      mapY: Number(minY.toFixed(1)),
      mapW: Number(spanW.toFixed(1)),
      mapH: Number(spanH.toFixed(1)),
    };
    setRoomsList((prev) => [...prev, newRoom]);
    setActiveRoomId(newId);
    setRoomNameInput(cadLang === 'ur' ? newRoom.roomNameUr : newRoom.roomNameEn);
    setRoomWidthFt(calcWFt);
    setRoomLengthFt(calcLFt);
    setRoomWidthExtraIn(0);
    setRoomLengthExtraIn(0);
    setDwgDrawMode(false);
  };

  const handleDropStockOntoFloorSlot = (slotIdx: number, e?: React.DragEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragOverTargetKey(null);
    if (!draggedStockItem) return;
    if (draggedStockItem.kind === 'active_slab') {
      const targetSlab = draggedStockItem.slabNum;
      setSlotToSlabMap((prev) => {
        const next = [...prev];
        const existingIdx = next.findIndex((s) => s === targetSlab);
        const curSlabAtSlot = next[slotIdx] || slotIdx + 1;
        next[slotIdx] = targetSlab;
        if (existingIdx !== -1 && existingIdx !== slotIdx) {
          next[existingIdx] = curSlabAtSlot;
        }
        return next;
      });
      setActiveSlabIndex(targetSlab);
    } else if (draggedStockItem.kind === 'saved_lot') {
      const lot = savedStockLots.find((s) => s.id === draggedStockItem.lotId);
      if (lot) {
        const mappedSlab = slotToSlabMap[slotIdx] || slotIdx + 1;
        setPerSlabStates((prev) => ({
          ...prev,
          [mappedSlab]: {
            ...(prev[mappedSlab] || {
              slabNumber: mappedSlab,
              pieceLetter: PIECE_LETTERS[mappedSlab - 1] || `S${mappedSlab}`,
              cropXPercent: 0,
              cropYPercent: 0,
              rotationDeg: 0,
              flipHOverride: null,
              flipVOverride: null,
            }),
            customImageUrl: lot.slabImageUrl,
            imageLabel: lot.materialName,
          },
        }));
      }
    }
    setDraggedStockItem(null);
  };

  const handleDropPieceOntoTargetSlab = (targetSlabNum: number, e?: React.DragEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragOverTargetKey(null);
    if (!draggedStockItem || draggedStockItem.kind !== 'piece') return;
    const pId = draggedStockItem.pieceId;
    setPieceTargetSlabOverrides((prev) => ({ ...prev, [pId]: targetSlabNum }));
    setActiveSlabIndex(targetSlabNum);
    setDraggedStockItem(null);
  };

  const handleSetAutoManualMode = (mode: 'auto' | 'manual') => {
    if (mode === 'auto') {
      setIsAutoSlabGridMode(true);
      setIsManualSlabGrabMode(false);
      setSwapSourcePieceIdx(null);
      setSlotToSlabMap([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      setPerSlabStates((prev) => {
        const next: Record<number, IndividualSlabBookmatchState> = {};
        Object.keys(prev).forEach((k) => {
          const num = Number(k);
          const cur = prev[num];
          next[num] = {
            ...cur,
            cropXPercent: 0,
            cropYPercent: 0,
            rotationDeg: 0,
            flipHOverride: null,
            flipVOverride: null,
            customPieceWidthIn: null,
            customPieceLengthIn: null,
          };
        });
        return next;
      });
    } else {
      setIsAutoSlabGridMode(false);
      setIsManualSlabGrabMode(true);
      setSwapSourcePieceIdx(null);
    }
  };

  const handleSelectDesignMode = (mode: FloorLayoutDesignMode) => {
    setDesignMode(mode);
    if (mode === 'full_room_bookmatch') {
      setHasOuterBorder(false);
      setHasContrastPatti(false);
      setHasBrassPatti(false);
    } else if (mode === 'center_bm_with_border') {
      setHasOuterBorder(true);
      setBorderSlabSource('from_bm_slabs_leftover');
      setHasContrastPatti(false);
      setHasBrassPatti(true);
    } else {
      setHasOuterBorder(true);
      setBorderSlabSource('from_bm_slabs_leftover');
      setHasContrastPatti(true);
      setHasBrassPatti(true);
    }
    if (isAutoSlabGridMode) {
      setPerSlabStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const num = Number(k);
          next[num] = {
            ...next[num],
            rotationDeg: 0,
            flipHOverride: null,
            flipVOverride: null,
            customPieceWidthIn: null,
            customPieceLengthIn: null,
          };
        });
        return next;
      });
    }
  };

  const handleCycleNextBookmatchStyle = () => {
    const curIdx = BOOKMATCH_STYLE_META.findIndex((s) => s.id === veinPattern);
    const nextIdx = (curIdx + 1) % BOOKMATCH_STYLE_META.length;
    const nextStyle = BOOKMATCH_STYLE_META[nextIdx].id;
    setVeinPattern(nextStyle);
    setPerSlabStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const num = Number(k);
        next[num] = {
          ...next[num],
          rotationDeg: isAutoSlabGridMode ? 0 : next[num].rotationDeg,
          flipHOverride: null,
          flipVOverride: null,
        };
      });
      return next;
    });
  };

  const handleSelectSpecificBookmatchStyle = (styleId: BookmatchVeinPattern) => {
    setVeinPattern(styleId);
    setPerSlabStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const num = Number(k);
        next[num] = {
          ...next[num],
          rotationDeg: isAutoSlabGridMode ? 0 : next[num].rotationDeg,
          flipHOverride: null,
          flipVOverride: null,
        };
      });
      return next;
    });
  };

  // =========================================================================
  // EXACT ARCHITECTURAL MATH (1. Width × 2. Length) WITH STOCK-SLAB AUTO-FIT
  // =========================================================================
  const totalRoomWidthIn = Math.max(48, roomWidthFt * 12 + roomWidthExtraIn);
  const totalRoomLengthIn = Math.max(48, roomLengthFt * 12 + roomLengthExtraIn);
  const totalRoomSqFt = (totalRoomWidthIn * totalRoomLengthIn) / 144;

  const effectiveOuterBorderIn =
    designMode === 'full_room_bookmatch' || !hasOuterBorder
      ? 0
      : Math.min(outerBorderWidthIn, Math.floor(Math.min(totalRoomWidthIn, totalRoomLengthIn) * 0.25));

  const effectiveContrastPattiIn =
    designMode !== 'center_bm_brass_patti_border' || !hasContrastPatti
      ? 0
      : Math.min(
          contrastPattiWidthIn,
          Math.floor(Math.min(totalRoomWidthIn, totalRoomLengthIn) * 0.18)
        );

  const effectiveBrassIn = hasBrassPatti && designMode !== 'full_room_bookmatch' ? brassPattiSizeIn : 0;
  const totalMarginEachSideIn =
    effectiveOuterBorderIn +
    effectiveContrastPattiIn +
    (doubleBrassPatti ? effectiveBrassIn * 2 : effectiveBrassIn);

  // Full unbordered inner floor area inside any Outer Border / Patti / Brass
  const innerFloorWidthIn = Math.max(24, totalRoomWidthIn - totalMarginEachSideIn * 2);
  const innerFloorLengthIn = Math.max(24, totalRoomLengthIn - totalMarginEachSideIn * 2);

  // Stock slab physical dimensions with Main App's General Edge Trim (Safai) & Blade Kerf applied automatically
  const effectiveEdgeTrimIn = Math.max(0, Number(edgeTrimIn) || 0);
  const effectiveBladeKerfIn = Math.max(0, Number(bladeKerfIn) || 0);
  const rawStockSlabW = Math.max(24, Number((slabWidthIn || 60) - effectiveEdgeTrimIn * 2));
  const rawStockSlabL = Math.max(36, Number((slabLengthIn || 104) - effectiveEdgeTrimIn * 2));
  const safeSlabW = slabDirectionInRoom === 'horizontal' ? rawStockSlabW : rawStockSlabL;
  const safeSlabL = slabDirectionInRoom === 'horizontal' ? rawStockSlabL : rawStockSlabW;

  // When Outer Border is extracted from Bookmatch Slabs' Leftover space ('from_bm_slabs_leftover'),
  // automatically reserve effectiveOuterBorderIn along the slab width so EVERY Bookmatch Slab (#1..#N)
  // has enough leftover strip (leftoverWidthOnBmSlabIn >= effectiveOuterBorderIn) to cut the room's
  // Outer Border pieces directly from the same Bookmatch slabs without needing a separate border slab!
  const maxBmWidthAllowedOnSlab =
    effectiveOuterBorderIn > 0 && borderSlabSource === 'from_bm_slabs_leftover'
      ? Math.max(18, Number((safeSlabW - effectiveOuterBorderIn).toFixed(2)))
      : safeSlabW;

  // Minimum rows & columns required so that 100% Equal Pieces fit inside maxBmWidthAllowedOnSlab × safeSlabL
  const minEqualRowsForStock = Math.max(1, Math.ceil(innerFloorWidthIn / maxBmWidthAllowedOnSlab));
  const minEqualColsForStock = Math.max(1, Math.ceil(innerFloorLengthIn / safeSlabL));

  // Maximum whole full slabs (ثابت سلیب) that fit inside the room without exceeding innerFloor
  const autoFullSlabRowsFit = Math.max(1, Math.floor(innerFloorWidthIn / maxBmWidthAllowedOnSlab));
  const autoFullSlabColsFit = Math.max(1, Math.floor(innerFloorLengthIn / safeSlabL));

  // True AutoCAD Auto-Fit Slab Count:
  // - In 'center_both_sides_cut' (Center Bookmatch + Side Cut), Auto ALWAYS forms the classic 4-Slab (2×2) Center Bookmatch
  //   with symmetric Top/Bottom/Left/Right Side Cuts filling the remaining floor space!
  // - In 'one_side_full_opposite_cut' and 'equal_all_pieces', grid count adapts directly to slab size vs room size.
  const autoSideCutRowsFit = 2;
  const autoSideCutColsFit = 2;

  const bmRows = isAutoSlabGridMode
    ? slabPlacementMode === 'equal_all_pieces'
      ? Math.min(6, minEqualRowsForStock)
      : slabPlacementMode === 'one_side_full_opposite_cut'
      ? Math.min(6, autoFullSlabRowsFit)
      : autoSideCutRowsFit
    : slabPlacementMode === 'equal_all_pieces'
    ? Math.max(customGridRows, minEqualRowsForStock)
    : Math.max(1, customGridRows);

  const bmCols = isAutoSlabGridMode
    ? slabPlacementMode === 'equal_all_pieces'
      ? Math.min(6, minEqualColsForStock)
      : slabPlacementMode === 'one_side_full_opposite_cut'
      ? Math.min(6, autoFullSlabColsFit)
      : autoSideCutColsFit
    : slabPlacementMode === 'equal_all_pieces'
    ? Math.max(customGridCols, minEqualColsForStock)
    : Math.max(1, customGridCols);

  const totalBmPiecesCount = bmRows * bmCols;

  // Raw piece size if the room inner floor is divided equally by bmRows × bmCols
  const rawUncappedBmPieceWidthIn = Number((innerFloorWidthIn / bmRows).toFixed(2));
  const rawUncappedBmPieceLengthIn = Number((innerFloorLengthIn / bmCols).toFixed(2));

  // CRITICAL: A single piece cut from a stock slab can NEVER exceed maxBmWidthAllowedOnSlab × safeSlabL!
  const singleBmPieceWidthIn = Number(
    Math.min(maxBmWidthAllowedOnSlab, rawUncappedBmPieceWidthIn).toFixed(2)
  );
  const singleBmPieceLengthIn = Number(
    Math.min(safeSlabL, rawUncappedBmPieceLengthIn).toFixed(2)
  );

  // Per-Slot True 1:1 Physical Dimensions (Reflects Live Corner/Edge Resizes per Slab on the Floor Plan!)
  const getSlotActualCutDims = (slotIdx: number) => {
    const mappedSlabNum = slotToSlabMap[slotIdx] || slotIdx + 1;
    const st = perSlabStates[mappedSlabNum];
    const hasCustomW = Boolean(
      st && st.customPieceWidthIn !== null && st.customPieceWidthIn !== undefined
    );
    const hasCustomL = Boolean(
      st && st.customPieceLengthIn !== null && st.customPieceLengthIn !== undefined
    );
    const wIn = hasCustomW
      ? Number(Math.min(safeSlabW, Math.max(2, st!.customPieceWidthIn!)).toFixed(1))
      : singleBmPieceWidthIn;
    const lIn = hasCustomL
      ? Number(Math.min(safeSlabL, Math.max(2, st!.customPieceLengthIn!)).toFixed(1))
      : singleBmPieceLengthIn;
    return { mappedSlabNum, wIn, lIn, hasCustom: hasCustomW || hasCustomL };
  };

  const hasAnyCustomBmSize = Array.from({ length: totalBmPiecesCount }).some(
    (_, idx) => getSlotActualCutDims(idx).hasCustom
  );

  const bmRowTrackWidths: number[] = Array.from({ length: bmRows }, (_, r) => {
    let maxW = 0;
    for (let c = 0; c < bmCols; c++) {
      maxW = Math.max(maxW, getSlotActualCutDims(r * bmCols + c).wIn);
    }
    return Number(Math.max(2, maxW).toFixed(2));
  });

  const bmColTrackLengths: number[] = Array.from({ length: bmCols }, (_, c) => {
    let maxL = 0;
    for (let r = 0; r < bmRows; r++) {
      maxL = Math.max(maxL, getSlotActualCutDims(r * bmCols + c).lIn);
    }
    return Number(Math.max(2, maxL).toFixed(2));
  });

  const actualCenterGridWIn = Number(bmRowTrackWidths.reduce((s, v) => s + v, 0).toFixed(2));
  const actualCenterGridLIn = Number(bmColTrackLengths.reduce((s, v) => s + v, 0).toFixed(2));

  // Actual Bookmatch / Full-Slabs area covered by the main grid (Updates live when slabs are resized!)
  const centerMedallionWidthIn =
    slabPlacementMode === 'equal_all_pieces' && !hasAnyCustomBmSize
      ? innerFloorWidthIn
      : Number(Math.min(innerFloorWidthIn, actualCenterGridWIn).toFixed(2));
  const centerMedallionLengthIn =
    slabPlacementMode === 'equal_all_pieces' && !hasAnyCustomBmSize
      ? innerFloorLengthIn
      : Number(Math.min(innerFloorLengthIn, actualCenterGridLIn).toFixed(2));
  const centerMedallionSqFt = (centerMedallionWidthIn * centerMedallionLengthIn) / 144;

  // =========================================================================
  // AUTOMATIC SIDE CUT-PIECES (سائیڈوں کے کٹ پیس):
  // =========================================================================
  const remainingSideWidthTotalIn =
    slabPlacementMode === 'equal_all_pieces' && !hasAnyCustomBmSize
      ? 0
      : Math.max(0, Number((innerFloorWidthIn - centerMedallionWidthIn).toFixed(2)));
  const remainingSideLengthTotalIn =
    slabPlacementMode === 'equal_all_pieces' && !hasAnyCustomBmSize
      ? 0
      : Math.max(0, Number((innerFloorLengthIn - centerMedallionLengthIn).toFixed(2)));

  // Exact Top vs Bottom Side Cut widths based on Placement Mode & Chosen Start Corner
  const topSideCutWidthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? 0
      : slabPlacementMode === 'center_both_sides_cut'
      ? Number((remainingSideWidthTotalIn / 2).toFixed(2))
      : fullSlabStartCorner === 'bottom_left' || fullSlabStartCorner === 'bottom_right'
      ? remainingSideWidthTotalIn
      : 0;

  const bottomSideCutWidthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? 0
      : slabPlacementMode === 'center_both_sides_cut'
      ? Number((remainingSideWidthTotalIn / 2).toFixed(2))
      : fullSlabStartCorner === 'top_left' || fullSlabStartCorner === 'top_right'
      ? remainingSideWidthTotalIn
      : 0;

  // Exact Left vs Right Side Cut widths based on Placement Mode & Chosen Start Corner
  const leftSideCutLengthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? 0
      : slabPlacementMode === 'center_both_sides_cut'
      ? Number((remainingSideLengthTotalIn / 2).toFixed(2))
      : fullSlabStartCorner === 'top_right' || fullSlabStartCorner === 'bottom_right'
      ? remainingSideLengthTotalIn
      : 0;

  const rightSideCutLengthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? 0
      : slabPlacementMode === 'center_both_sides_cut'
      ? Number((remainingSideLengthTotalIn / 2).toFixed(2))
      : fullSlabStartCorner === 'top_left' || fullSlabStartCorner === 'bottom_left'
      ? remainingSideLengthTotalIn
      : 0;

  const sideCutTopBottomWidthIn = Number(Math.max(topSideCutWidthIn, bottomSideCutWidthIn).toFixed(2));
  const sideCutLeftRightWidthIn = Number(Math.max(leftSideCutLengthIn, rightSideCutLengthIn).toFixed(2));

  const activeTopBottomSidesCount = (topSideCutWidthIn > 0 ? 1 : 0) + (bottomSideCutWidthIn > 0 ? 1 : 0);
  const activeLeftRightSidesCount = (leftSideCutLengthIn > 0 ? 1 : 0) + (rightSideCutLengthIn > 0 ? 1 : 0);

  const hasSideCutPieces = sideCutTopBottomWidthIn > 0 || sideCutLeftRightWidthIn > 0;

  // Split Top/Bottom side cuts into courses if sideCutTopBottomWidthIn ever exceeds safeSlabW
  const topBottomCoursesPerSide =
    sideCutTopBottomWidthIn > 0 ? Math.ceil(sideCutTopBottomWidthIn / safeSlabW) : 0;
  const sideCutPieceActualWidthIn =
    topBottomCoursesPerSide > 0
      ? Number((sideCutTopBottomWidthIn / topBottomCoursesPerSide).toFixed(2))
      : 0;
  const topBottomSideCutQty =
    sideCutTopBottomWidthIn > 0
      ? activeTopBottomSidesCount * bmCols * topBottomCoursesPerSide
      : 0;

  // Split Left/Right side cuts into courses if sideCutLeftRightWidthIn ever exceeds safeSlabW
  const leftRightCoursesPerSide =
    sideCutLeftRightWidthIn > 0 ? Math.ceil(sideCutLeftRightWidthIn / safeSlabW) : 0;
  const leftRightPieceActualWidthIn =
    leftRightCoursesPerSide > 0
      ? Number((sideCutLeftRightWidthIn / leftRightCoursesPerSide).toFixed(2))
      : 0;
  const leftRightSideCutQty =
    sideCutLeftRightWidthIn > 0
      ? activeLeftRightSidesCount * bmRows * leftRightCoursesPerSide
      : 0;

  // Corner Cut Pieces where active Top/Bottom and active Left/Right side cut zones meet
  const activeCornersCount = activeTopBottomSidesCount * activeLeftRightSidesCount;
  const cornerCutQty =
    activeCornersCount > 0
      ? activeCornersCount * topBottomCoursesPerSide * leftRightCoursesPerSide
      : 0;
  const cornerPieceWidthIn =
    cornerCutQty > 0
      ? Number(Math.min(leftRightPieceActualWidthIn, sideCutPieceActualWidthIn).toFixed(2))
      : 0;
  const cornerPieceLengthIn =
    cornerCutQty > 0
      ? Number(Math.max(leftRightPieceActualWidthIn, sideCutPieceActualWidthIn).toFixed(2))
      : 0;

  // =========================================================================
  // MULTI-PIECE SIDE-CUT PACKER & PIECE-TO-SLAB ALLOCATION ENGINE
  // (Supports Multi-Piece Combined on 1 Slab vs 1 Piece per Slab + Manual Move)
  // =========================================================================
  const tbPcsPerSlabW =
    sideCutPieceActualWidthIn > 0
      ? Math.max(1, Math.floor(safeSlabW / sideCutPieceActualWidthIn))
      : 1;
  const tbPcsPerSlabL = Math.max(1, Math.floor(safeSlabL / Math.max(1, singleBmPieceLengthIn)));
  const tbPiecesPerSingleSlab = tbPcsPerSlabW * tbPcsPerSlabL;

  const rawSideCutPieces: Array<{
    id: string;
    code: string;
    labelEn: string;
    labelUr: string;
    widthIn: number;
    lengthIn: number;
    colorHex: string;
  }> = [];

  if (topSideCutWidthIn > 0 && sideCutPieceActualWidthIn > 0) {
    for (let k = 0; k < topBottomCoursesPerSide; k++) {
      for (let c = 0; c < bmCols; c++) {
        const suffix = topBottomCoursesPerSide > 1 ? `-${k + 1}` : '';
        rawSideCutPieces.push({
          id: `ST-${c + 1}${suffix}`,
          code: `ST-${c + 1}${suffix}`,
          labelEn: `Top Side Cut #${c + 1}`,
          labelUr: `اوپر سائیڈ کٹ #${c + 1}`,
          widthIn: sideCutPieceActualWidthIn,
          lengthIn: singleBmPieceLengthIn,
          colorHex: '#0284C7',
        });
      }
    }
  }
  if (bottomSideCutWidthIn > 0 && sideCutPieceActualWidthIn > 0) {
    for (let k = 0; k < topBottomCoursesPerSide; k++) {
      for (let c = 0; c < bmCols; c++) {
        const suffix = topBottomCoursesPerSide > 1 ? `-${k + 1}` : '';
        rawSideCutPieces.push({
          id: `SB-${c + 1}${suffix}`,
          code: `SB-${c + 1}${suffix}`,
          labelEn: `Bottom Side Cut #${c + 1}`,
          labelUr: `نیچے سائیڈ کٹ #${c + 1}`,
          widthIn: sideCutPieceActualWidthIn,
          lengthIn: singleBmPieceLengthIn,
          colorHex: '#0EA5E9',
        });
      }
    }
  }
  if (leftSideCutLengthIn > 0 && leftRightPieceActualWidthIn > 0) {
    for (let k = 0; k < leftRightCoursesPerSide; k++) {
      for (let r = 0; r < bmRows; r++) {
        const suffix = leftRightCoursesPerSide > 1 ? `-${k + 1}` : '';
        rawSideCutPieces.push({
          id: `SL-${r + 1}${suffix}`,
          code: `SL-${r + 1}${suffix}`,
          labelEn: `Left Side Cut #${r + 1}`,
          labelUr: `بائیں سائیڈ کٹ #${r + 1}`,
          widthIn: leftRightPieceActualWidthIn,
          lengthIn: singleBmPieceWidthIn,
          colorHex: '#0D9488',
        });
      }
    }
  }
  if (rightSideCutLengthIn > 0 && leftRightPieceActualWidthIn > 0) {
    for (let k = 0; k < leftRightCoursesPerSide; k++) {
      for (let r = 0; r < bmRows; r++) {
        const suffix = leftRightCoursesPerSide > 1 ? `-${k + 1}` : '';
        rawSideCutPieces.push({
          id: `SR-${r + 1}${suffix}`,
          code: `SR-${r + 1}${suffix}`,
          labelEn: `Right Side Cut #${r + 1}`,
          labelUr: `دائیں سائیڈ کٹ #${r + 1}`,
          widthIn: leftRightPieceActualWidthIn,
          lengthIn: singleBmPieceWidthIn,
          colorHex: '#14B8A6',
        });
      }
    }
  }
  if (cornerCutQty > 0 && cornerPieceWidthIn > 0) {
    for (let k = 0; k < cornerCutQty; k++) {
      rawSideCutPieces.push({
        id: `SC-${k + 1}`,
        code: `SC-${k + 1}`,
        labelEn: `Corner Cut #${k + 1}`,
        labelUr: `کونا کٹ #${k + 1}`,
        widthIn: cornerPieceWidthIn,
        lengthIn: cornerPieceLengthIn,
        colorHex: '#0F766E',
      });
    }
  }

  // Deterministic Bin Packer for Side-Cut Pieces (Combined Multi-Piece vs 1 Piece per Slab)
  const packedSideBins: Array<{
    slabNum: number;
    shelves: Array<{ y: number; h: number; usedX: number }>;
    totalUsedY: number;
  }> = [];
  const defaultSidePlacementMap: Record<
    string,
    { slabNum: number; xIn: number; yIn: number; placedWIn: number; placedLIn: number }
  > = {};

  rawSideCutPieces.forEach((sp) => {
    const kerf = effectiveBladeKerfIn;
    if (sideCutPackingMode === 'separate_slab_per_piece') {
      const nextSlab = totalBmPiecesCount + packedSideBins.length + 1;
      const pW = Math.min(safeSlabW, sp.widthIn);
      const pL = Math.min(safeSlabL, sp.lengthIn);
      packedSideBins.push({
        slabNum: nextSlab,
        shelves: [{ y: 0, h: pW, usedX: pL }],
        totalUsedY: pW,
      });
      defaultSidePlacementMap[sp.id] = {
        slabNum: nextSlab,
        xIn: 0,
        yIn: 0,
        placedWIn: pW,
        placedLIn: pL,
      };
      return;
    }

    // Multi-piece combined mode: try natural orientation first, then rotated 90° if helpful
    const orientations: Array<{ w: number; l: number }> = [
      { w: sp.widthIn, l: sp.lengthIn },
    ];
    if (
      Math.abs(sp.widthIn - sp.lengthIn) > 0.2 &&
      sp.lengthIn <= safeSlabW &&
      sp.widthIn <= safeSlabL
    ) {
      orientations.push({ w: sp.lengthIn, l: sp.widthIn });
    }

    let placed = false;
    // Pass 1: Fit onto existing shelf (same row)
    for (const bin of packedSideBins) {
      if (placed) break;
      for (const shelf of bin.shelves) {
        for (const ori of orientations) {
          if (ori.w <= shelf.h + 0.01 && shelf.usedX + kerf + ori.l <= safeSlabL + 0.01) {
            const xIn = Number((shelf.usedX + kerf).toFixed(1));
            shelf.usedX = Number((xIn + ori.l).toFixed(1));
            defaultSidePlacementMap[sp.id] = {
              slabNum: bin.slabNum,
              xIn,
              yIn: Number(shelf.y.toFixed(1)),
              placedWIn: ori.w,
              placedLIn: ori.l,
            };
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      // Pass 2: Open new vertical shelf inside the same bin slab
      if (!placed) {
        for (const ori of orientations) {
          const yStart = Number((bin.totalUsedY + kerf).toFixed(1));
          if (yStart + ori.w <= safeSlabW + 0.01 && ori.l <= safeSlabL + 0.01) {
            bin.shelves.push({ y: yStart, h: ori.w, usedX: ori.l });
            bin.totalUsedY = Number((yStart + ori.w).toFixed(1));
            defaultSidePlacementMap[sp.id] = {
              slabNum: bin.slabNum,
              xIn: 0,
              yIn: yStart,
              placedWIn: ori.w,
              placedLIn: ori.l,
            };
            placed = true;
            break;
          }
        }
      }
    }

    if (!placed) {
      const nextSlab = totalBmPiecesCount + packedSideBins.length + 1;
      const bestOri =
        orientations.find((o) => o.w <= safeSlabW && o.l <= safeSlabL) || {
          w: Math.min(safeSlabW, sp.widthIn),
          l: Math.min(safeSlabL, sp.lengthIn),
        };
      packedSideBins.push({
        slabNum: nextSlab,
        shelves: [{ y: 0, h: bestOri.w, usedX: bestOri.l }],
        totalUsedY: bestOri.w,
      });
      defaultSidePlacementMap[sp.id] = {
        slabNum: nextSlab,
        xIn: 0,
        yIn: 0,
        placedWIn: bestOri.w,
        placedLIn: bestOri.l,
      };
    }
  });

  const slabsForTopBottomSideCuts = Math.max(
    topBottomSideCutQty > 0 ? 1 : 0,
    packedSideBins.filter((b) =>
      Object.entries(defaultSidePlacementMap).some(
        ([k, v]) => v.slabNum === b.slabNum && (k.startsWith('ST-') || k.startsWith('SB-'))
      )
    ).length
  );
  const slabsForLeftRightSideCuts = Math.max(0, packedSideBins.length - slabsForTopBottomSideCuts);
  const leftoverWOnTopBottomSlabs =
    packedSideBins.length > 0
      ? Number(Math.max(0, safeSlabW - packedSideBins[0].totalUsedY).toFixed(2))
      : 0;
  const sideCutExtraSlabsNeeded = packedSideBins.length;
  const totalBookmatchAndSideSlabsCount = totalBmPiecesCount + sideCutExtraSlabsNeeded;

  // Exact 1:1 proportional percentage of the stock slab occupied by the Used Bookmatch piece (Zero artificial distortion!)
  const cropWidthPercentOnSlab = Number(
    Math.min(100, Math.max(10, (singleBmPieceLengthIn / safeSlabL) * 100)).toFixed(2)
  );
  const cropHeightPercentOnSlab = Number(
    Math.min(100, Math.max(10, (singleBmPieceWidthIn / safeSlabW) * 100)).toFixed(2)
  );

  // =========================================================================
  // AUTOCAD PRECISION LEFTOVER & BORDER CUTTING ALLOCATION
  // (Automatically fits Border pieces inside the Bookmatch Slabs' leftover!)
  // =========================================================================
  const totalBorderLinearIn =
    effectiveOuterBorderIn > 0
      ? Math.round(totalRoomLengthIn * 2 + (totalRoomWidthIn - effectiveOuterBorderIn * 2) * 2)
      : 0;
  const totalBorderRunningFeet = Number((totalBorderLinearIn / 12).toFixed(1));

  // Exact individual Outer Border piece lengths around the room
  const halfTopBottomBorderLenIn = Number((totalRoomLengthIn / 2).toFixed(1));
  const leftRightInnerBorderLenIn = Number(
    Math.max(12, totalRoomWidthIn - effectiveOuterBorderIn * 2).toFixed(1)
  );
  const halfSideBorderLenIn = Number((leftRightInnerBorderLenIn / 2).toFixed(1));

  // Exact per-BM-slab post-Bookmatch leftovers (before border extraction)
  interface LiveLeftoverStripItem {
    id: string;
    slabNum: number;
    slabLabel: string;
    side: 'top' | 'bottom' | 'left' | 'right' | 'side_packed_btm' | 'side_packed_right';
    sideLabelEn: string;
    sideLabelUr: string;
    postBmWIn: number;
    postBmLIn: number;
    netFreeWIn: number;
    netFreeLIn: number;
    usedByBorderCodes: string[];
    fitsOuterBorder: boolean;
    imgUrl: string;
  }

  const rawHorizCapacityByBmSlab: Record<
    number,
    { side: 'top' | 'bottom'; totalWIn: number; availWIn: number; lenIn: number; usedCodes: string[] }
  > = {};
  const livePostBmLeftovers: LiveLeftoverStripItem[] = [];

  for (let s = 1; s <= totalBmPiecesCount; s++) {
    const st = perSlabStates[s];
    const usedWIn = Math.min(safeSlabW, Math.max(1, st?.customPieceWidthIn ?? singleBmPieceWidthIn));
    const usedLIn = Math.min(safeSlabL, Math.max(1, st?.customPieceLengthIn ?? singleBmPieceLengthIn));
    const remTotalW = Number(Math.max(0, safeSlabW - usedWIn).toFixed(1));
    const remTotalL = Number(Math.max(0, safeSlabL - usedLIn).toFixed(1));
    const pWPct = Math.min(100, Math.max(4, (usedLIn / Math.max(1, safeSlabL)) * 100));
    const pHPct = Math.min(100, Math.max(4, (usedWIn / Math.max(1, safeSlabW)) * 100));
    const maxCX = Math.max(0, 100 - pWPct);
    const maxCY = Math.max(0, 100 - pHPct);
    const cX = Math.min(maxCX, Math.max(0, st?.cropXPercent ?? 0));
    const cY = Math.min(maxCY, Math.max(0, st?.cropYPercent ?? 0));
    const topW = maxCY > 0 ? Number(((cY / maxCY) * remTotalW).toFixed(1)) : 0;
    const botW = Number(Math.max(0, remTotalW - topW).toFixed(1));
    const leftL = maxCX > 0 ? Number(((cX / maxCX) * remTotalL).toFixed(1)) : 0;
    const rightL = Number(Math.max(0, remTotalL - leftL).toFixed(1));

    const widerHorizSide: 'top' | 'bottom' = botW >= topW ? 'bottom' : 'top';
    const widerHorizW = Math.max(topW, botW);
    rawHorizCapacityByBmSlab[s] = {
      side: widerHorizSide,
      totalWIn: widerHorizW,
      availWIn: widerHorizW,
      lenIn: safeSlabL,
      usedCodes: [],
    };

    const pLet = PIECE_LETTERS[s - 1] || `S${s}`;
    const sImg = st?.customImageUrl || slabImageUrl;
    const minBorderCheck = effectiveOuterBorderIn > 0 ? effectiveOuterBorderIn : 12;

    if (topW >= 1 && safeSlabL >= 12) {
      livePostBmLeftovers.push({
        id: `lo-s${s}-top`,
        slabNum: s,
        slabLabel: `S${s}(${pLet})`,
        side: 'top',
        sideLabelEn: `S${s}(${pLet}) Top Leftover`,
        sideLabelUr: `S${s}(${pLet}) اوپر بقیہ`,
        postBmWIn: topW,
        postBmLIn: safeSlabL,
        netFreeWIn: topW,
        netFreeLIn: safeSlabL,
        usedByBorderCodes: [],
        fitsOuterBorder: topW >= minBorderCheck && safeSlabL >= Math.min(halfTopBottomBorderLenIn, halfSideBorderLenIn),
        imgUrl: sImg,
      });
    }
    if (botW >= 1 && safeSlabL >= 12) {
      livePostBmLeftovers.push({
        id: `lo-s${s}-bottom`,
        slabNum: s,
        slabLabel: `S${s}(${pLet})`,
        side: 'bottom',
        sideLabelEn: `S${s}(${pLet}) Bottom Leftover`,
        sideLabelUr: `S${s}(${pLet}) نیچے بقیہ`,
        postBmWIn: botW,
        postBmLIn: safeSlabL,
        netFreeWIn: botW,
        netFreeLIn: safeSlabL,
        usedByBorderCodes: [],
        fitsOuterBorder: botW >= minBorderCheck && safeSlabL >= Math.min(halfTopBottomBorderLenIn, halfSideBorderLenIn),
        imgUrl: sImg,
      });
    }
    if (leftL >= 1 && usedWIn >= 12) {
      const minD = Math.min(leftL, usedWIn);
      const maxD = Math.max(leftL, usedWIn);
      livePostBmLeftovers.push({
        id: `lo-s${s}-left`,
        slabNum: s,
        slabLabel: `S${s}(${pLet})`,
        side: 'left',
        sideLabelEn: `S${s}(${pLet}) Left Leftover`,
        sideLabelUr: `S${s}(${pLet}) بائیں بقیہ`,
        postBmWIn: minD,
        postBmLIn: maxD,
        netFreeWIn: minD,
        netFreeLIn: maxD,
        usedByBorderCodes: [],
        fitsOuterBorder: minD >= minBorderCheck && maxD >= Math.min(halfTopBottomBorderLenIn, halfSideBorderLenIn),
        imgUrl: sImg,
      });
    }
    if (rightL >= 1 && usedWIn >= 12) {
      const minD = Math.min(rightL, usedWIn);
      const maxD = Math.max(rightL, usedWIn);
      livePostBmLeftovers.push({
        id: `lo-s${s}-right`,
        slabNum: s,
        slabLabel: `S${s}(${pLet})`,
        side: 'right',
        sideLabelEn: `S${s}(${pLet}) Right Leftover`,
        sideLabelUr: `S${s}(${pLet}) دائیں بقیہ`,
        postBmWIn: minD,
        postBmLIn: maxD,
        netFreeWIn: minD,
        netFreeLIn: maxD,
        usedByBorderCodes: [],
        fitsOuterBorder: minD >= minBorderCheck && maxD >= Math.min(halfTopBottomBorderLenIn, halfSideBorderLenIn),
        imgUrl: sImg,
      });
    }
  }

  packedSideBins.forEach((bin) => {
    const remBotW = Number(Math.max(0, safeSlabW - bin.totalUsedY).toFixed(1));
    if (remBotW >= 1 && safeSlabL >= 12) {
      const sImg = perSlabStates[bin.slabNum]?.customImageUrl || slabImageUrl;
      const minBorderCheck = effectiveOuterBorderIn > 0 ? effectiveOuterBorderIn : 12;
      livePostBmLeftovers.push({
        id: `lo-s${bin.slabNum}-packed-btm`,
        slabNum: bin.slabNum,
        slabLabel: `S${bin.slabNum}`,
        side: 'side_packed_btm',
        sideLabelEn: `S${bin.slabNum} Side-Cut Leftover`,
        sideLabelUr: `S${bin.slabNum} سائیڈ کٹ بقیہ`,
        postBmWIn: remBotW,
        postBmLIn: safeSlabL,
        netFreeWIn: remBotW,
        netFreeLIn: safeSlabL,
        usedByBorderCodes: [],
        fitsOuterBorder: remBotW >= minBorderCheck && safeSlabL >= Math.min(halfTopBottomBorderLenIn, halfSideBorderLenIn),
        imgUrl: sImg,
      });
    }
  });

  const rawLeftoverWIn = Number(Math.max(0, safeSlabW - singleBmPieceWidthIn).toFixed(1));
  const rawLeftoverLIn = Number(Math.max(0, safeSlabL - singleBmPieceLengthIn).toFixed(1));
  const leftoverWidthOnBmSlabIn =
    rawLeftoverWIn > 0 ? rawLeftoverWIn : effectiveOuterBorderIn > 0 ? effectiveOuterBorderIn : 0;
  const leftoverLengthOnBmSlabIn =
    rawLeftoverLIn > 0 ? rawLeftoverLIn : effectiveOuterBorderIn > 0 ? effectiveOuterBorderIn : 0;

  const canCutHorizontalBorderFromBmSlab =
    effectiveOuterBorderIn > 0 && leftoverWidthOnBmSlabIn >= effectiveOuterBorderIn;
  const canCutVerticalBorderFromBmSlab =
    effectiveOuterBorderIn > 0 && leftoverLengthOnBmSlabIn >= effectiveOuterBorderIn;

  const usableLeftoverStripWIn =
    effectiveOuterBorderIn > 0
      ? effectiveOuterBorderIn
      : leftoverWidthOnBmSlabIn > 0
      ? leftoverWidthOnBmSlabIn
      : 0;

  const activeBorderSlabW =
    borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabWidthIn : safeSlabW;
  const activeBorderSlabL =
    borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabLengthIn : safeSlabL;
  const stripsPerFullBorderSlab =
    effectiveOuterBorderIn > 0
      ? Math.max(1, Math.floor(activeBorderSlabW / effectiveOuterBorderIn))
      : 0;
  const linearInPerFullBorderSlab = stripsPerFullBorderSlab * activeBorderSlabL;

  // Build Complete Allocated Cut Pieces Registry (Side-Cuts + Outer Borders + Contrast Strips)
  const rawBorderSpecs: Array<{
    id: string;
    code: string;
    labelEn: string;
    labelUr: string;
    lenIn: number;
    defaultBmSlab: number;
  }> =
    effectiveOuterBorderIn > 0
      ? [
          {
            id: 'B1-A',
            code: 'B1-A',
            labelEn: 'Top-Left Border',
            labelUr: 'اوپر بائیں بارڈر',
            lenIn: halfTopBottomBorderLenIn,
            defaultBmSlab: 1,
          },
          {
            id: 'B2-A',
            code: 'B2-A',
            labelEn: 'Top-Right Border',
            labelUr: 'اوپر دائیں بارڈر',
            lenIn: halfTopBottomBorderLenIn,
            defaultBmSlab: Math.min(2, totalBmPiecesCount),
          },
          {
            id: 'B3-A',
            code: 'B3-A',
            labelEn: 'Bottom-Left Border',
            labelUr: 'نیچے بائیں بارڈر',
            lenIn: halfTopBottomBorderLenIn,
            defaultBmSlab: Math.min(3, totalBmPiecesCount),
          },
          {
            id: 'B4-A',
            code: 'B4-A',
            labelEn: 'Bottom-Right Border',
            labelUr: 'نیچے دائیں بارڈر',
            lenIn: halfTopBottomBorderLenIn,
            defaultBmSlab: Math.min(4, totalBmPiecesCount),
          },
          {
            id: 'B1-B',
            code: 'B1-B',
            labelEn: 'Left-Top Border',
            labelUr: 'بائیں اوپر بارڈر',
            lenIn: halfSideBorderLenIn,
            defaultBmSlab: 1,
          },
          {
            id: 'B3-B',
            code: 'B3-B',
            labelEn: 'Left-Bottom Border',
            labelUr: 'بائیں نیچے بارڈر',
            lenIn: halfSideBorderLenIn,
            defaultBmSlab: Math.min(3, totalBmPiecesCount),
          },
          {
            id: 'B2-B',
            code: 'B2-B',
            labelEn: 'Right-Top Border',
            labelUr: 'دائیں اوپر بارڈر',
            lenIn: halfSideBorderLenIn,
            defaultBmSlab: Math.min(2, totalBmPiecesCount),
          },
          {
            id: 'B4-B',
            code: 'B4-B',
            labelEn: 'Right-Bottom Border',
            labelUr: 'دائیں نیچے بارڈر',
            lenIn: halfSideBorderLenIn,
            defaultBmSlab: Math.min(4, totalBmPiecesCount),
          },
        ]
      : [];

  // Exact allocation of border pieces onto BM leftover strips (falling back to extra same-stock slabs only if leftover isn't wide enough!)
  const borderLeftoverTargetMap: Record<string, { slabNum: number; fittedInLeftover: boolean }> = {};
  let overflowBorderPiecesCount = 0;
  let fittedBorderLinearIn = 0;

  if (borderSlabSource === 'from_bm_slabs_leftover' && effectiveOuterBorderIn > 0) {
    rawBorderSpecs.forEach((bp) => {
      const kerfNeed = effectiveOuterBorderIn + effectiveBladeKerfIn;
      const trySlabs = [
        bp.defaultBmSlab,
        ...Array.from({ length: totalBmPiecesCount }, (_, i) => i + 1).filter(
          (n) => n !== bp.defaultBmSlab
        ),
      ];
      let placedBm = 0;
      for (const candS of trySlabs) {
        const cap = rawHorizCapacityByBmSlab[candS];
        if (cap && cap.availWIn + 0.05 >= effectiveOuterBorderIn && cap.lenIn + 0.1 >= bp.lenIn) {
          cap.availWIn = Number(Math.max(0, cap.availWIn - kerfNeed).toFixed(1));
          cap.usedCodes.push(bp.code);
          placedBm = candS;
          const matchingLo = livePostBmLeftovers.find(
            (lo) => lo.slabNum === candS && lo.side === cap.side
          );
          if (matchingLo) {
            matchingLo.usedByBorderCodes.push(bp.code);
            matchingLo.netFreeWIn = cap.availWIn;
          }
          break;
        }
      }
      if (placedBm > 0) {
        borderLeftoverTargetMap[bp.id] = { slabNum: placedBm, fittedInLeftover: true };
        fittedBorderLinearIn += bp.lenIn;
      } else {
        const extraSlabIdx = Math.floor(
          overflowBorderPiecesCount / Math.max(1, stripsPerFullBorderSlab || 2)
        );
        overflowBorderPiecesCount++;
        borderLeftoverTargetMap[bp.id] = {
          slabNum: totalBookmatchAndSideSlabsCount + 1 + extraSlabIdx,
          fittedInLeftover: false,
        };
      }
    });
  }

  const totalBorderExtractedFromBmSlabsIn =
    borderSlabSource === 'from_bm_slabs_leftover' ? Math.round(fittedBorderLinearIn) : 0;
  const remainingBorderLinearInForExtraSlabs = Math.max(
    0,
    totalBorderLinearIn - totalBorderExtractedFromBmSlabsIn
  );
  const overflowBorderSlabsFromLeftoverMode =
    overflowBorderPiecesCount > 0
      ? Math.ceil(overflowBorderPiecesCount / Math.max(1, stripsPerFullBorderSlab || 2))
      : 0;
  const extraBorderSlabsNeeded =
    effectiveOuterBorderIn <= 0
      ? 0
      : borderSlabSource === 'from_bm_slabs_leftover'
      ? overflowBorderSlabsFromLeftoverMode
      : Math.ceil(totalBorderLinearIn / Math.max(1, linearInPerFullBorderSlab));

  const contrastStripTopLenIn = Number((innerFloorLengthIn + effectiveContrastPattiIn * 2).toFixed(1));
  const contrastStripSideLenIn = Number(innerFloorWidthIn.toFixed(1));
  const pattiStripsPerDedicatedSlab =
    effectiveContrastPattiIn > 0
      ? Math.max(1, Math.floor(pattiSlabWidthIn / effectiveContrastPattiIn))
      : 1;
  const pattiLeftoverOnStripSlabW =
    effectiveContrastPattiIn > 0
      ? Number(
          Math.max(
            0,
            pattiSlabWidthIn - Math.min(4, pattiStripsPerDedicatedSlab) * effectiveContrastPattiIn
          ).toFixed(1)
        )
      : pattiSlabWidthIn;

  const rawContrastStripSpecs: Array<{
    id: string;
    code: string;
    labelEn: string;
    labelUr: string;
    lenIn: number;
  }> =
    effectiveContrastPattiIn > 0
      ? [
          {
            id: 'PT-1',
            code: 'PT-1',
            labelEn: 'Top Contrast Strip',
            labelUr: 'اوپر پٹی بارڈر',
            lenIn: contrastStripTopLenIn,
          },
          {
            id: 'PB-1',
            code: 'PB-1',
            labelEn: 'Bottom Contrast Strip',
            labelUr: 'نیچے پٹی بارڈر',
            lenIn: contrastStripTopLenIn,
          },
          {
            id: 'PL-1',
            code: 'PL-1',
            labelEn: 'Left Contrast Strip',
            labelUr: 'بائیں پٹی بارڈر',
            lenIn: contrastStripSideLenIn,
          },
          {
            id: 'PR-1',
            code: 'PR-1',
            labelEn: 'Right Contrast Strip',
            labelUr: 'دائیں پٹی بارڈر',
            lenIn: contrastStripSideLenIn,
          },
        ]
      : [];

  const allocatedRoomPiecesList: AllocatedSlabCutPiece[] = [];

  // 1. Add Side-Cut Pieces
  rawSideCutPieces.forEach((sp) => {
    const def = defaultSidePlacementMap[sp.id] || {
      slabNum: totalBmPiecesCount + 1,
      xIn: 0,
      yIn: 0,
      placedWIn: sp.widthIn,
      placedLIn: sp.lengthIn,
    };
    const overrideSlab = pieceTargetSlabOverrides[sp.id];
    const targetSlabNum =
      overrideSlab && overrideSlab >= 1 ? overrideSlab : def.slabNum;
    allocatedRoomPiecesList.push({
      id: sp.id,
      code: sp.code,
      category: 'side_cut',
      labelEn: sp.labelEn,
      labelUr: sp.labelUr,
      widthIn: def.placedWIn,
      lengthIn: def.placedLIn,
      defaultSlabNum: def.slabNum,
      targetSlabNum,
      xIn: def.xIn,
      yIn: def.yIn,
      isPrimaryOnSlab: false,
      colorHex: sp.colorHex,
      sourceDescEn:
        overrideSlab && overrideSlab >= 1
          ? `Moved to Slab #${overrideSlab}`
          : sideCutPackingMode === 'pack_multi_per_slab'
          ? `Combined Pack Slab #${def.slabNum}`
          : `Separate Slab #${def.slabNum}`,
      sourceDescUr:
        overrideSlab && overrideSlab >= 1
          ? `سلیب #${overrideSlab} پر منتقل`
          : sideCutPackingMode === 'pack_multi_per_slab'
          ? `مشترکہ سلیب #${def.slabNum}`
          : `الگ سلیب #${def.slabNum}`,
    });
  });

  // 2. Add Outer Border Pieces
  rawBorderSpecs.forEach((bp, bIdx) => {
    const leftoverAlloc = borderLeftoverTargetMap[bp.id];
    const defaultSlabNum =
      borderSlabSource === 'from_bm_slabs_leftover'
        ? leftoverAlloc?.slabNum ?? bp.defaultBmSlab
        : borderSlabSource === 'from_separate_same_stock_slabs'
        ? totalBookmatchAndSideSlabsCount + 1 + Math.floor(bIdx / Math.max(1, stripsPerFullBorderSlab || 2))
        : 0; // 0 = Custom Border Stock Slab
    const overrideSlab = pieceTargetSlabOverrides[bp.id];
    const targetSlabNum =
      overrideSlab && overrideSlab >= 1 ? overrideSlab : defaultSlabNum;
    allocatedRoomPiecesList.push({
      id: bp.id,
      code: bp.code,
      category: 'outer_border',
      labelEn: bp.labelEn,
      labelUr: bp.labelUr,
      widthIn: effectiveOuterBorderIn,
      lengthIn: bp.lenIn,
      defaultSlabNum,
      targetSlabNum,
      xIn: 0,
      yIn: 0,
      isPrimaryOnSlab: false,
      colorHex: '#10B981',
      sourceDescEn:
        overrideSlab && overrideSlab >= 1
          ? `Moved to Slab #${overrideSlab}`
          : borderSlabSource === 'from_bm_slabs_leftover'
          ? leftoverAlloc?.fittedInLeftover
            ? `BM Slab #${defaultSlabNum} Leftover`
            : `Extra Same-Stock Slab #${defaultSlabNum}`
          : borderSlabSource === 'from_separate_same_stock_slabs'
          ? `Separate Stock Slab #${defaultSlabNum}`
          : `Border Slab (${borderSlabMaterialName} ${borderSlabWidthIn}"×${borderSlabLengthIn}")`,
      sourceDescUr:
        overrideSlab && overrideSlab >= 1
          ? `سلیب #${overrideSlab} پر منتقل`
          : borderSlabSource === 'from_bm_slabs_leftover'
          ? leftoverAlloc?.fittedInLeftover
            ? `بک میچ سلیب #${defaultSlabNum} بقیہ`
            : `ایکسٹرا اسٹاک سلیب #${defaultSlabNum}`
          : borderSlabSource === 'from_separate_same_stock_slabs'
          ? `الگ اسٹاک سلیب #${defaultSlabNum}`
          : `بارڈر سلیب (${borderSlabMaterialName} ${borderSlabWidthIn}"×${borderSlabLengthIn}")`,
    });
  });

  // 3. Add Contrast Strip Pieces
  rawContrastStripSpecs.forEach((cp) => {
    const overrideSlab = pieceTargetSlabOverrides[cp.id];
    const targetSlabNum = overrideSlab && overrideSlab >= 1 ? overrideSlab : -1; // -1 = Dedicated Strip Slab
    allocatedRoomPiecesList.push({
      id: cp.id,
      code: cp.code,
      category: 'contrast_strip',
      labelEn: cp.labelEn,
      labelUr: cp.labelUr,
      widthIn: effectiveContrastPattiIn,
      lengthIn: cp.lenIn,
      defaultSlabNum: -1,
      targetSlabNum,
      xIn: 0,
      yIn: 0,
      isPrimaryOnSlab: false,
      colorHex: '#D97706',
      sourceDescEn:
        overrideSlab && overrideSlab >= 1
          ? `Moved to Stock Slab #${overrideSlab}`
          : `Strip Slab (${pattiSlabMaterialName} ${pattiSlabWidthIn}"×${pattiSlabLengthIn}")`,
      sourceDescUr:
        overrideSlab && overrideSlab >= 1
          ? `اسٹاک سلیب #${overrideSlab} پر منتقل`
          : `پٹی سلیب (${pattiSlabMaterialName} ${pattiSlabWidthIn}"×${pattiSlabLengthIn}")`,
    });
  });

  const maxTargetStockSlabFromPieces = allocatedRoomPiecesList.reduce(
    (mx, p) => (p.targetSlabNum > 0 ? Math.max(mx, p.targetSlabNum) : mx),
    0
  );

  // Strictly match the exact required slabs for this room + any user-reassigned slab numbers
  const totalSameStockSlabsInList = Math.max(
    totalBmPiecesCount,
    totalBmPiecesCount +
      sideCutExtraSlabsNeeded +
      (borderSlabSource !== 'from_custom_border_stock_slab' ? extraBorderSlabsNeeded : 0),
    maxTargetStockSlabFromPieces
  );

  // =========================================================================
  // UNIFIED PER-ZONE SAVED STOCK ASSIGNMENT + LIVE SUFFICIENCY / SHORTAGE ENGINE
  // =========================================================================
  const matchedCenterLot =
    savedStockLots.find(
      (l) =>
        (slabLotId && l.lotId.toLowerCase() === slabLotId.toLowerCase()) &&
        l.materialName.toLowerCase() === slabMaterialName.toLowerCase()
    ) ||
    savedStockLots.find((l) => slabLotId && l.lotId.toLowerCase() === slabLotId.toLowerCase()) ||
    savedStockLots.find(
      (l) => l.materialName.toLowerCase() === slabMaterialName.toLowerCase()
    ) ||
    null;

  const matchedBorderLot = borderStockLotId
    ? savedStockLots.find((l) => l.id === borderStockLotId) || null
    : null;

  const matchedPattiLot = pattiStockLotId
    ? savedStockLots.find((l) => l.id === pattiStockLotId) || null
    : null;

  const handleAssignStockLotToZone = (
    zone: 'center' | 'border' | 'patti',
    lotIdOrMode: string
  ) => {
    if (zone === 'center') {
      const target = savedStockLots.find((l) => l.id === lotIdOrMode);
      if (!target) return;
      if (onLoadSavedStockLot) {
        onLoadSavedStockLot(target.id);
      } else {
        onUpdateSlabConfig({
          materialName: target.materialName,
          lotId: target.lotId,
          width: target.width,
          length: target.length,
          quantity: target.quantity,
          ratePerSqFt: target.ratePerSqFt,
        });
      }
      return;
    }

    if (zone === 'border') {
      setHasOuterBorder(true);
      if (designMode === 'full_room_bookmatch') {
        setDesignMode('center_bm_with_border');
      }
      if (lotIdOrMode === 'same_leftover') {
        setBorderStockLotId(null);
        setBorderSlabSource('from_bm_slabs_leftover');
        return;
      }
      if (lotIdOrMode === 'same_extra_slabs') {
        setBorderStockLotId(null);
        setBorderSlabSource('from_separate_same_stock_slabs');
        return;
      }
      const target = savedStockLots.find((l) => l.id === lotIdOrMode);
      if (!target) return;
      setBorderStockLotId(target.id);
      setBorderSlabSource('from_custom_border_stock_slab');
      setBorderSlabMaterialName(target.materialName);
      setBorderSlabWidthIn(target.width);
      setBorderSlabLengthIn(target.length);
      setBorderSlabQty(Math.max(1, target.quantity));
      setBorderSlabRate(target.ratePerSqFt);
      if (target.slabImageUrl) {
        setBorderSlabImageUrl(target.slabImageUrl);
        setIsBorderCustomUploaded(true);
      }
      return;
    }

    if (zone === 'patti') {
      setHasContrastPatti(true);
      setDesignMode('center_bm_brass_patti_border');
      if (lotIdOrMode === 'same_center') {
        setPattiStockLotId(matchedCenterLot?.id || null);
        setTwinPattiSlabName(slabMaterialName);
        setPattiSlabWidthIn(rawStockSlabW);
        setPattiSlabLengthIn(rawStockSlabL);
        setPattiSlabQty(matchedCenterLot ? matchedCenterLot.quantity : slabQuantity);
        setPattiSlabRate(slabRatePerSqFt);
        setPattiCustomSlabImageUrl(slabImageUrl);
        return;
      }
      const target = savedStockLots.find((l) => l.id === lotIdOrMode);
      if (!target) return;
      setPattiStockLotId(target.id);
      setTwinPattiSlabName(target.materialName);
      setPattiSlabWidthIn(target.width);
      setPattiSlabLengthIn(target.length);
      setPattiSlabQty(Math.max(1, target.quantity));
      setPattiSlabRate(target.ratePerSqFt);
      if (target.slabImageUrl) {
        setPattiCustomSlabImageUrl(target.slabImageUrl);
      }
    }
  };

  // Compute exact slab demands per Stock Lot (combining zones that share the same Stock Lot!)
  const pattiSlabsNeeded =
    effectiveContrastPattiIn > 0
      ? Math.ceil(rawContrastStripSpecs.length / Math.max(1, pattiStripsPerDedicatedSlab))
      : 0;
  const borderExtraReqForSameStock =
    borderSlabSource !== 'from_custom_border_stock_slab' ? extraBorderSlabsNeeded : 0;
  const centerLotKey = matchedCenterLot?.id || `active:${slabLotId || slabMaterialName}`;
  const borderUsesSameAsCenterLot =
    effectiveOuterBorderIn > 0 &&
    (borderSlabSource !== 'from_custom_border_stock_slab' ||
      (matchedBorderLot && matchedCenterLot && matchedBorderLot.id === matchedCenterLot.id));
  const pattiUsesSameAsCenterLot =
    effectiveContrastPattiIn > 0 &&
    Boolean(matchedPattiLot && matchedCenterLot && matchedPattiLot.id === matchedCenterLot.id);
  const pattiUsesSameAsBorderLot =
    effectiveContrastPattiIn > 0 &&
    !pattiUsesSameAsCenterLot &&
    Boolean(matchedPattiLot && matchedBorderLot && matchedPattiLot.id === matchedBorderLot.id);

  interface StockDemandEntry {
    key: string;
    lotIdStr: string;
    savedId: string | null;
    materialName: string;
    slabSizeLabel: string;
    available: number;
    required: number;
    shortBy: number;
    zonesEn: string[];
    zonesUr: string[];
  }

  const stockDemandEntries: StockDemandEntry[] = [];
  const lotUsageById: Record<string, StockDemandEntry> = {};

  const centerAvailQty = Math.max(
    0,
    matchedCenterLot ? matchedCenterLot.quantity : Number(slabQuantity) || 0
  );
  const centerCombinedReq =
    totalBookmatchAndSideSlabsCount +
    (borderUsesSameAsCenterLot
      ? borderSlabSource === 'from_custom_border_stock_slab'
        ? extraBorderSlabsNeeded
        : borderExtraReqForSameStock
      : 0) +
    (pattiUsesSameAsCenterLot ? pattiSlabsNeeded : 0);

  const centerZonesEn = ['Center BM' + (sideCutExtraSlabsNeeded > 0 ? ' + Side Cuts' : '')];
  const centerZonesUr = ['سینٹر بک میچ' + (sideCutExtraSlabsNeeded > 0 ? ' + سائیڈ کٹ' : '')];
  if (effectiveOuterBorderIn > 0 && borderUsesSameAsCenterLot) {
    centerZonesEn.push(
      overflowBorderPiecesCount === 0 && borderSlabSource === 'from_bm_slabs_leftover'
        ? 'Border (BM Leftover)'
        : `Border (+${borderExtraReqForSameStock || extraBorderSlabsNeeded} Slabs)`
    );
    centerZonesUr.push(
      overflowBorderPiecesCount === 0 && borderSlabSource === 'from_bm_slabs_leftover'
        ? 'بارڈر (بک میچ بقیہ سے)'
        : `بارڈر (+${borderExtraReqForSameStock || extraBorderSlabsNeeded} سلیب)`
    );
  }
  if (pattiUsesSameAsCenterLot) {
    centerZonesEn.push(`Contrast Strip (+${pattiSlabsNeeded})`);
    centerZonesUr.push(`پٹی بارڈر (+${pattiSlabsNeeded})`);
  }

  const centerEntry: StockDemandEntry = {
    key: centerLotKey,
    lotIdStr: slabLotId || matchedCenterLot?.lotId || 'ACTIVE',
    savedId: matchedCenterLot?.id || null,
    materialName: slabMaterialName,
    slabSizeLabel: `${rawStockSlabW}"×${rawStockSlabL}"`,
    available: centerAvailQty,
    required: centerCombinedReq,
    shortBy: Math.max(0, centerCombinedReq - centerAvailQty),
    zonesEn: centerZonesEn,
    zonesUr: centerZonesUr,
  };
  stockDemandEntries.push(centerEntry);
  if (matchedCenterLot) lotUsageById[matchedCenterLot.id] = centerEntry;

  if (effectiveOuterBorderIn > 0 && !borderUsesSameAsCenterLot && borderSlabSource === 'from_custom_border_stock_slab') {
    const bAvail = Math.max(0, matchedBorderLot ? matchedBorderLot.quantity : borderSlabQty);
    const bReq = extraBorderSlabsNeeded + (pattiUsesSameAsBorderLot ? pattiSlabsNeeded : 0);
    const bZonesEn = [`Outer Border (${effectiveOuterBorderIn}")`];
    const bZonesUr = [`آؤٹر بارڈر (${effectiveOuterBorderIn}")`];
    if (pattiUsesSameAsBorderLot) {
      bZonesEn.push('Contrast Strip');
      bZonesUr.push('پٹی بارڈر');
    }
    const bEntry: StockDemandEntry = {
      key: matchedBorderLot?.id || `border:${borderSlabMaterialName}`,
      lotIdStr: matchedBorderLot?.lotId || 'BORDER',
      savedId: matchedBorderLot?.id || null,
      materialName: matchedBorderLot?.materialName || borderSlabMaterialName,
      slabSizeLabel: `${borderSlabWidthIn}"×${borderSlabLengthIn}"`,
      available: bAvail,
      required: bReq,
      shortBy: Math.max(0, bReq - bAvail),
      zonesEn: bZonesEn,
      zonesUr: bZonesUr,
    };
    stockDemandEntries.push(bEntry);
    if (matchedBorderLot) lotUsageById[matchedBorderLot.id] = bEntry;
  }

  if (effectiveContrastPattiIn > 0 && !pattiUsesSameAsCenterLot && !pattiUsesSameAsBorderLot) {
    const pAvail = Math.max(0, matchedPattiLot ? matchedPattiLot.quantity : pattiSlabQty);
    const pReq = pattiSlabsNeeded;
    const pEntry: StockDemandEntry = {
      key: matchedPattiLot?.id || `patti:${pattiSlabMaterialName}`,
      lotIdStr: matchedPattiLot?.lotId || 'STRIP',
      savedId: matchedPattiLot?.id || null,
      materialName: matchedPattiLot?.materialName || pattiSlabMaterialName,
      slabSizeLabel: `${pattiSlabWidthIn}"×${pattiSlabLengthIn}"`,
      available: pAvail,
      required: pReq,
      shortBy: Math.max(0, pReq - pAvail),
      zonesEn: [`Contrast Strip (${effectiveContrastPattiIn}")`],
      zonesUr: [`کنٹراسٹ پٹی (${effectiveContrastPattiIn}")`],
    };
    stockDemandEntries.push(pEntry);
    if (matchedPattiLot) lotUsageById[matchedPattiLot.id] = pEntry;
  }

  const stockShortageAlerts = stockDemandEntries.filter((e) => e.shortBy > 0);

  const getSlabState = (slabNum: number): IndividualSlabBookmatchState => {
    const existing = perSlabStates[slabNum];
    if (existing) return existing;
    return {
      slabNumber: slabNum,
      pieceLetter: PIECE_LETTERS[slabNum - 1] || `S${slabNum}`,
      customImageUrl: null,
      imageLabel: 'Default Slab Image',
      cropXPercent: 0,
      cropYPercent: 0,
      rotationDeg: 0,
      flipHOverride: null,
      flipVOverride: null,
      customPieceWidthIn: null,
      customPieceLengthIn: null,
    };
  };

  // Group all allocated cut pieces by their active Stock Slab # (1..totalSameStockSlabsInList)
  const piecesAssignedToStockSlab: Record<number, AllocatedSlabCutPiece[]> = {};
  for (let s = 1; s <= totalSameStockSlabsInList; s++) {
    piecesAssignedToStockSlab[s] = [];
  }
  allocatedRoomPiecesList.forEach((p) => {
    if (p.targetSlabNum >= 1) {
      if (!piecesAssignedToStockSlab[p.targetSlabNum]) {
        piecesAssignedToStockSlab[p.targetSlabNum] = [];
      }
      piecesAssignedToStockSlab[p.targetSlabNum].push({ ...p });
    }
  });

  // Assign deterministic primary vs secondary coordinates on every Stock Slab # > totalBmPiecesCount
  for (let s = totalBmPiecesCount + 1; s <= totalSameStockSlabsInList; s++) {
    const listOnS = piecesAssignedToStockSlab[s] || [];
    if (listOnS.length === 0) continue;
    listOnS[0].isPrimaryOnSlab = true;
    const isUsingDefaultPackedCoords = listOnS.every((item) => item.targetSlabNum === item.defaultSlabNum && item.category === 'side_cut');
    if (!isUsingDefaultPackedCoords) {
      let curY = 0;
      let curX = 0;
      let shelfH = 0;
      listOnS.forEach((item, idx) => {
        if (idx === 0) {
          item.xIn = 0;
          item.yIn = 0;
          curX = item.lengthIn;
          shelfH = item.widthIn;
        } else {
          if (curX + effectiveBladeKerfIn + item.lengthIn <= safeSlabL && item.widthIn <= shelfH) {
            item.xIn = Number((curX + effectiveBladeKerfIn).toFixed(1));
            item.yIn = curY;
            curX = Number((item.xIn + item.lengthIn).toFixed(1));
          } else {
            curY = Number((curY + shelfH + effectiveBladeKerfIn).toFixed(1));
            curX = item.lengthIn;
            shelfH = item.widthIn;
            item.xIn = 0;
            item.yIn = curY;
          }
        }
      });
    }
  }

  // Unified Per-Slab Piece & 4-Side Waste Calculator (Works for Center Bookmatch Slabs AND Multi-Piece Side-Cut Slabs down to 0.5"!)
  const getSlabPieceMetrics = (slabNum: number) => {
    const slabSt = getSlabState(slabNum);
    const isUsedInBookmatch = slabNum <= totalBmPiecesCount;
    const assignedList = piecesAssignedToStockSlab[slabNum] || [];
    const primaryExtraPiece = !isUsedInBookmatch ? assignedList[0] : undefined;
    const isSideCutStockSlab =
      !isUsedInBookmatch &&
      (slabNum <= totalBookmatchAndSideSlabsCount || Boolean(primaryExtraPiece));
    const sideSlabIdx = slabNum - totalBmPiecesCount - 1;
    const isTopBottomSideSlab =
      isSideCutStockSlab &&
      (primaryExtraPiece
        ? primaryExtraPiece.code.startsWith('ST-') || primaryExtraPiece.code.startsWith('SB-')
        : sideSlabIdx < slabsForTopBottomSideCuts);

    const defaultWIn = isUsedInBookmatch
      ? singleBmPieceWidthIn
      : primaryExtraPiece
      ? Math.min(safeSlabW, primaryExtraPiece.widthIn)
      : isSideCutStockSlab
      ? isTopBottomSideSlab
        ? sideCutPieceActualWidthIn > 0
          ? sideCutPieceActualWidthIn
          : Math.min(safeSlabW, 18)
        : leftRightPieceActualWidthIn > 0
        ? leftRightPieceActualWidthIn
        : Math.min(safeSlabW, 14)
      : effectiveOuterBorderIn > 0
      ? effectiveOuterBorderIn
      : 12;

    const defaultLIn = isUsedInBookmatch
      ? singleBmPieceLengthIn
      : primaryExtraPiece
      ? Math.min(safeSlabL, primaryExtraPiece.lengthIn)
      : isSideCutStockSlab
      ? isTopBottomSideSlab
        ? singleBmPieceLengthIn
        : singleBmPieceWidthIn
      : safeSlabL;

    const activePieceWIn = Number(
      Math.min(safeSlabW, Math.max(1, slabSt.customPieceWidthIn ?? defaultWIn)).toFixed(1)
    );
    const activePieceLIn = Number(
      Math.min(safeSlabL, Math.max(1, slabSt.customPieceLengthIn ?? defaultLIn)).toFixed(1)
    );

    const pieceWidthPct = Number(
      Math.min(100, Math.max(4, (activePieceLIn / Math.max(1, safeSlabL)) * 100)).toFixed(2)
    );
    const pieceHeightPct = Number(
      Math.min(100, Math.max(4, (activePieceWIn / Math.max(1, safeSlabW)) * 100)).toFixed(2)
    );

    const maxCropX = Number(Math.max(0, 100 - pieceWidthPct).toFixed(2));
    const maxCropY = Number(Math.max(0, 100 - pieceHeightPct).toFixed(2));

    const clampedX = Number(Math.min(maxCropX, Math.max(0, slabSt.cropXPercent)).toFixed(2));
    const clampedY = Number(Math.min(maxCropY, Math.max(0, slabSt.cropYPercent)).toFixed(2));

    const totalRemWIn = Number(Math.max(0, safeSlabW - activePieceWIn).toFixed(1));
    const totalRemLIn = Number(Math.max(0, safeSlabL - activePieceLIn).toFixed(1));

    const topWasteIn =
      maxCropY > 0 ? Number(((clampedY / maxCropY) * totalRemWIn).toFixed(1)) : 0;
    const bottomWasteIn = Number(Math.max(0, totalRemWIn - topWasteIn).toFixed(1));

    const leftWasteIn =
      maxCropX > 0 ? Number(((clampedX / maxCropX) * totalRemLIn).toFixed(1)) : 0;
    const rightWasteIn = Number(Math.max(0, totalRemLIn - leftWasteIn).toFixed(1));

    const bgSizeW = Number(((100 / Math.max(4, pieceWidthPct)) * 100).toFixed(1));
    const bgSizeH = Number(((100 / Math.max(4, pieceHeightPct)) * 100).toFixed(1));
    const bgPosX = maxCropX > 0 ? Number(((clampedX / maxCropX) * 100).toFixed(1)) : 0;
    const bgPosY = maxCropY > 0 ? Number(((clampedY / maxCropY) * 100).toFixed(1)) : 0;

    const cutStartXIn = leftWasteIn;
    const cutStartYIn = topWasteIn;
    const topWastePct = clampedY;
    const bottomWastePct = Number(Math.max(0, 100 - (clampedY + pieceHeightPct)).toFixed(2));
    const leftWastePct = clampedX;
    const rightWastePct = Number(Math.max(0, 100 - (clampedX + pieceWidthPct)).toFixed(2));

    return {
      isUsedInBookmatch,
      isSideCutStockSlab,
      sideSlabIdx,
      isTopBottomSideSlab,
      defaultWIn,
      defaultLIn,
      activePieceWIn,
      activePieceLIn,
      pieceWidthPct,
      pieceHeightPct,
      maxCropX,
      maxCropY,
      clampedX,
      clampedY,
      cutStartXIn,
      cutStartYIn,
      totalRemWIn,
      totalRemLIn,
      topWasteIn,
      bottomWasteIn,
      leftWasteIn,
      rightWasteIn,
      topWastePct,
      bottomWastePct,
      leftWastePct,
      rightWastePct,
      bgSizeW,
      bgSizeH,
      bgPosX,
      bgPosY,
    };
  };

  const getAutoFlipForPattern = (
    pattern: BookmatchVeinPattern,
    rowIdx: number,
    colIdx: number
  ): { flipH: boolean; flipV: boolean } => {
    switch (pattern) {
      case 'diamond_4way':
        return { flipH: colIdx % 2 === 1, flipV: rowIdx % 2 === 1 };
      case 'butterfly_lr':
        return { flipH: colIdx % 2 === 0, flipV: rowIdx % 2 === 1 };
      case 'x_cross_star':
        return { flipH: colIdx % 2 === 1, flipV: rowIdx % 2 === 0 };
      case 'v_match_tb':
        return { flipH: colIdx % 2 === 1, flipV: false };
      case 'pinwheel_spiral':
        return { flipH: colIdx % 2 === 0, flipV: rowIdx % 2 === 0 };
      case 'straight_flow':
      default:
        return { flipH: false, flipV: false };
    }
  };

  const updateSlabState = (
    slabNum: number,
    patch: Partial<IndividualSlabBookmatchState>,
    forceSingleOnly = false
  ) => {
    setPerSlabStates((prev) => {
      const next = { ...prev };
      if (
        syncAllSlabsCrop &&
        !forceSingleOnly &&
        (patch.cropXPercent !== undefined ||
          patch.cropYPercent !== undefined ||
          patch.rotationDeg !== undefined ||
          patch.customPieceWidthIn !== undefined ||
          patch.customPieceLengthIn !== undefined)
      ) {
        const targetCount =
          patch.customPieceWidthIn !== undefined || patch.customPieceLengthIn !== undefined
            ? slabNum <= totalBmPiecesCount
              ? totalBmPiecesCount
              : totalSameStockSlabsInList
            : totalSameStockSlabsInList;
        const startLoop =
          (patch.customPieceWidthIn !== undefined || patch.customPieceLengthIn !== undefined) &&
          slabNum <= totalBmPiecesCount
            ? 1
            : 1;
        for (let i = startLoop; i <= targetCount; i++) {
          const cur = next[i] || getSlabState(i);
          next[i] = { ...cur, ...patch, slabNumber: i };
        }
      } else {
        const cur = next[slabNum] || getSlabState(slabNum);
        next[slabNum] = { ...cur, ...patch, slabNumber: slabNum };
      }
      return next;
    });
  };

  const handleIndividualSlabPhotoUpload = (
    slabNum: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        updateSlabState(
          slabNum,
          {
            customImageUrl: dataUrl,
            imageLabel: file.name,
          },
          true
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBorderSlabPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        setBorderSlabImageUrl(dataUrl);
        setIsBorderCustomUploaded(true);
        setBorderSlabSource('from_custom_border_stock_slab');
        setShowBorderSlabDrawer(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePattiSlabPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        setPattiCustomSlabImageUrl(dataUrl);
        setHasContrastPatti(true);
        setDesignMode('center_bm_brass_patti_border');
        setShowPattiSlabDrawer(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplySlabPhotoToAll = (sourceSlabNum: number) => {
    const src = getSlabState(sourceSlabNum);
    setPerSlabStates((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= totalSameStockSlabsInList; i++) {
        const cur = next[i] || getSlabState(i);
        next[i] = {
          ...cur,
          customImageUrl: src.customImageUrl,
          imageLabel: src.imageLabel,
        };
      }
      return next;
    });
  };

  const scrollSlabListBy = (deltaPx: number) => {
    if (!slabListScrollRef.current) return;
    slabListScrollRef.current.scrollBy({ top: deltaPx, behavior: 'smooth' });
  };

  const getPieceTargetSlab = (pieceCode: string, fallbackSlabNum: number): number => {
    const found = allocatedRoomPiecesList.find((p) => p.code === pieceCode);
    return found ? found.targetSlabNum : fallbackSlabNum;
  };

  const scrollToSpecificSlab = (slabNum: number) => {
    setActiveSlabIndex(slabNum);
    const el = slabCardRefs.current[slabNum];
    if (el && showAllSlabsList) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSelectFloorPiece = (pieceCode: string, fallbackSlabNum: number) => {
    setSelectedFloorPieceCode(pieceCode);
    const targetSlab = getPieceTargetSlab(pieceCode, fallbackSlabNum);
    scrollToSpecificSlab(targetSlab);
    setInDiagramPopup('piece');
  };

  const handleSlabPointerMove = (slabNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingSlabDrag || draggingSlabNum !== slabNum) return;
    const boxEl = slabBoxRefs.current[slabNum];
    if (!boxEl) return;
    const metrics = getSlabPieceMetrics(slabNum);
    const rect = boxEl.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100 - metrics.pieceWidthPct / 2;
    const relY = ((e.clientY - rect.top) / rect.height) * 100 - metrics.pieceHeightPct / 2;
    const clampedX = Math.max(0, Math.min(metrics.maxCropX, Number(relX.toFixed(1))));
    const clampedY = Math.max(0, Math.min(metrics.maxCropY, Number(relY.toFixed(1))));
    updateSlabState(slabNum, { cropXPercent: clampedX, cropYPercent: clampedY });
  };

  useEffect(() => {
    if (draggingSlabNum === null && !resizingSlabDrag) return;
    const onWinMouseMove = (e: MouseEvent) => {
      if (resizingSlabDrag) {
        const dx = e.clientX - resizingSlabDrag.startX;
        const dy = e.clientY - resizingSlabDrag.startY;
        const deltaLIn = (dx / Math.max(60, resizingSlabDrag.rectW)) * safeSlabL;
        const deltaWIn = (dy / Math.max(60, resizingSlabDrag.rectH)) * safeSlabW;
        const maxAvailL = Math.max(
          4,
          Number((safeSlabL - resizingSlabDrag.startCutXIn).toFixed(1))
        );
        const maxAvailW = Math.max(
          4,
          Number((safeSlabW - resizingSlabDrag.startCutYIn).toFixed(1))
        );
        const patch: Partial<IndividualSlabBookmatchState> = {};
        if (resizingSlabDrag.axis === 'both' || resizingSlabDrag.axis === 'l') {
          patch.customPieceLengthIn = Math.min(
            maxAvailL,
            Math.max(2, Number((Math.round((resizingSlabDrag.startLIn + deltaLIn) * 2) / 2).toFixed(1)))
          );
        }
        if (resizingSlabDrag.axis === 'both' || resizingSlabDrag.axis === 'w') {
          patch.customPieceWidthIn = Math.min(
            maxAvailW,
            Math.max(2, Number((Math.round((resizingSlabDrag.startWIn + deltaWIn) * 2) / 2).toFixed(1)))
          );
        }
        updateSlabState(resizingSlabDrag.slabNum, patch);
        return;
      }
      if (draggingSlabNum !== null) {
        const boxEl = slabBoxRefs.current[draggingSlabNum];
        if (!boxEl) return;
        const metrics = getSlabPieceMetrics(draggingSlabNum);
        const rect = boxEl.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * 100 - metrics.pieceWidthPct / 2;
        const relY = ((e.clientY - rect.top) / rect.height) * 100 - metrics.pieceHeightPct / 2;
        const clampedX = Math.max(0, Math.min(metrics.maxCropX, Number(relX.toFixed(1))));
        const clampedY = Math.max(0, Math.min(metrics.maxCropY, Number(relY.toFixed(1))));
        updateSlabState(draggingSlabNum, { cropXPercent: clampedX, cropYPercent: clampedY });
      }
    };
    const onWinMouseUp = () => {
      setDraggingSlabNum(null);
      setResizingSlabDrag(null);
    };
    window.addEventListener('mousemove', onWinMouseMove);
    window.addEventListener('mouseup', onWinMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWinMouseMove);
      window.removeEventListener('mouseup', onWinMouseUp);
    };
  }, [draggingSlabNum, resizingSlabDrag, safeSlabL, safeSlabW]);

  const handleRoomPieceMouseDown = (
    slotIdx: number,
    slabNum: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    setActiveSlabIndex(slabNum);
    setInDiagramPopup('piece');
    if (!isManualSlabGrabMode) {
      scrollToSpecificSlab(slabNum);
      return;
    }
    const slabSt = getSlabState(slabNum);
    setRoomDraggingPieceIdx(slotIdx);
    setRoomDragStartMouse({
      x: e.clientX,
      y: e.clientY,
      startCropX: slabSt.cropXPercent,
      startCropY: slabSt.cropYPercent,
    });
  };

  const handleRoomPieceMouseMove = (
    slotIdx: number,
    slabNum: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isManualSlabGrabMode || roomDraggingPieceIdx !== slotIdx || !roomDragStartMouse) return;
    const metrics = getSlabPieceMetrics(slabNum);
    const dx = e.clientX - roomDragStartMouse.x;
    const dy = e.clientY - roomDragStartMouse.y;
    const maxCropX = Math.max(1, metrics.maxCropX);
    const maxCropY = Math.max(1, metrics.maxCropY);
    const nextX = Math.max(
      0,
      Math.min(maxCropX, Number((roomDragStartMouse.startCropX - dx * 0.25).toFixed(1)))
    );
    const nextY = Math.max(
      0,
      Math.min(maxCropY, Number((roomDragStartMouse.startCropY - dy * 0.25).toFixed(1)))
    );
    updateSlabState(slabNum, { cropXPercent: nextX, cropYPercent: nextY }, true);
  };

  const handleSwapRoomSlots = (slotIdxA: number, slotIdxB: number) => {
    setSlotToSlabMap((prev) => {
      const next = [...prev];
      const tmp = next[slotIdxA];
      next[slotIdxA] = next[slotIdxB];
      next[slotIdxB] = tmp;
      return next;
    });
    setSwapSourcePieceIdx(null);
  };

  const innerMedallionPerimRft = ((innerFloorWidthIn + innerFloorLengthIn) * 2) / 12;
  const outerPattiWidthIn = innerFloorWidthIn + effectiveContrastPattiIn * 2;
  const outerPattiLengthIn = innerFloorLengthIn + effectiveContrastPattiIn * 2;
  const outerPattiPerimRft = ((outerPattiWidthIn + outerPattiLengthIn) * 2) / 12;

  const brassTotalRft = !hasBrassPatti
    ? 0
    : doubleBrassPatti && effectiveContrastPattiIn > 0
    ? Number((innerMedallionPerimRft + outerPattiPerimRft).toFixed(1))
    : Number(innerMedallionPerimRft.toFixed(1));

  const contrastPattiSqFt =
    effectiveContrastPattiIn > 0
      ? Number(
          (
            (outerPattiWidthIn * outerPattiLengthIn - innerFloorWidthIn * innerFloorLengthIn) /
            144
          ).toFixed(2)
        )
      : 0;

  const outerBorderSqFt =
    effectiveOuterBorderIn > 0
      ? Number(
          (
            (totalRoomWidthIn * totalRoomLengthIn - outerPattiWidthIn * outerPattiLengthIn) /
            144
          ).toFixed(2)
        )
      : 0;

  const skirtingRft = hasWallSkirting
    ? Number((((totalRoomWidthIn + totalRoomLengthIn) * 2) / 12).toFixed(1))
    : 0;

  const buildRoomCutParts = (): RoomGeneratedPart[] => {
    const list: RoomGeneratedPart[] = [];
    const safeKerfAllowance = Math.max(0.25, effectiveBladeKerfIn * 2);
    const pairedBmW =
      effectiveOuterBorderIn > 0 && borderSlabSource === 'from_bm_slabs_leftover'
        ? Number(
            Math.min(
              singleBmPieceWidthIn,
              Math.max(18, safeSlabW - effectiveOuterBorderIn - safeKerfAllowance)
            ).toFixed(2)
          )
        : singleBmPieceWidthIn;
    const pairedBmL = Number(
      Math.min(singleBmPieceLengthIn, Math.max(24, safeSlabL - safeKerfAllowance)).toFixed(2)
    );

    // 1. Center Bookmatch / Full Slabs
    for (let s = 1; s <= totalBmPiecesCount; s++) {
      const pLetter = PIECE_LETTERS[s - 1] || `P${s}`;
      const m = getSlabPieceMetrics(s);
      list.push({
        label: `S${s} (${pLetter}) · ${m.activePieceWIn || pairedBmW}"×${m.activePieceLIn || pairedBmL}"`,
        widthIn: m.activePieceWIn || pairedBmW,
        lengthIn: m.activePieceLIn || pairedBmL,
        quantity: 1,
        isBookmatch: true,
        zone: 'center_bookmatch',
        color: '#0284C7',
        targetSlabNumber: s,
      });
    }

    // 2. Side-Cuts, Outer Borders & Contrast Strips with exact assigned Target Slab Numbers
    allocatedRoomPiecesList.forEach((ap) => {
      list.push({
        label: `${ap.code} (${ap.labelEn}) · ${ap.widthIn}"×${ap.lengthIn}"`,
        widthIn: ap.widthIn,
        lengthIn: ap.lengthIn,
        quantity: 1,
        isBookmatch: false,
        zone:
          ap.category === 'outer_border'
            ? 'outer_border'
            : ap.category === 'contrast_strip'
            ? 'contrast_patti'
            : 'center_bookmatch',
        color: ap.colorHex,
        targetSlabNumber: ap.targetSlabNum > 0 ? ap.targetSlabNum : undefined,
      });
    });

    return list;
  };

  // Direct 1:1 True-Scale AutoCAD 2D (.DXF / .DWG) Vector File Download from Inside the Diagram
  // Uses 1 AutoCAD Drawing Unit = 1 Real Inch ($INSUNITS=1, $LUNITS=4 Architectural Feet-Inches)
  const handleDownloadRoomAutoCadDwg = (ext: 'dwg' | 'dxf' = 'dxf') => {
    const stockOriginX = totalRoomLengthIn + 60;
    const totalExtentsX = stockOriginX + 2 * (safeSlabL + 36);
    const totalExtentsY = Math.max(totalRoomWidthIn, 2 * (safeSlabW + 30)) + 40;

    const lines: string[] = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$ACADVER',
      '1',
      'AC1009',
      '9',
      '$INSUNITS',
      '70',
      '1',
      '9',
      '$MEASUREMENT',
      '70',
      '0',
      '9',
      '$LUNITS',
      '70',
      '4',
      '9',
      '$LUPREC',
      '70',
      '4',
      '9',
      '$DIMSCALE',
      '40',
      '1.0',
      '9',
      '$EXTMIN',
      '10',
      '-36.00',
      '20',
      '-36.00',
      '30',
      '0.00',
      '9',
      '$EXTMAX',
      '10',
      totalExtentsX.toFixed(2),
      '20',
      totalExtentsY.toFixed(2),
      '30',
      '0.00',
      '9',
      '$LIMMIN',
      '10',
      '-36.00',
      '20',
      '-36.00',
      '9',
      '$LIMMAX',
      '10',
      totalExtentsX.toFixed(2),
      '20',
      totalExtentsY.toFixed(2),
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'TABLES',
      '0',
      'TABLE',
      '2',
      'LAYER',
      '70',
      '10',
    ];

    const cadLayers: Array<{ name: string; color: number }> = [
      { name: '0', color: 7 },
      { name: 'ROOM_WALL', color: 7 },
      { name: 'OUTER_BORDER', color: 3 },
      { name: 'CONTRAST_STRIP', color: 30 },
      { name: 'BRASS_INLAY', color: 2 },
      { name: 'SIDE_CUTS', color: 5 },
      { name: 'BOOKMATCH_SLABS', color: 4 },
      { name: 'VEIN_PATTERN', color: 6 },
      { name: 'DIMENSIONS', color: 2 },
      { name: 'STOCK_SLABS', color: 7 },
      { name: 'WASTE_OFFCUTS', color: 1 },
    ];

    cadLayers.forEach((ly) => {
      lines.push(
        '0',
        'LAYER',
        '2',
        ly.name,
        '70',
        '0',
        '62',
        String(ly.color),
        '6',
        'CONTINUOUS'
      );
    });

    lines.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');

    const addLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      layer: string,
      color: number
    ) => {
      lines.push(
        '0',
        'LINE',
        '8',
        layer,
        '62',
        String(color),
        '10',
        x1.toFixed(3),
        '20',
        y1.toFixed(3),
        '30',
        '0.0',
        '11',
        x2.toFixed(3),
        '21',
        y2.toFixed(3),
        '31',
        '0.0'
      );
    };

    const addRect = (x: number, y: number, w: number, h: number, layer: string, color: number) => {
      if (w <= 0 || h <= 0) return;
      addLine(x, y, x + w, y, layer, color);
      addLine(x + w, y, x + w, y + h, layer, color);
      addLine(x + w, y + h, x, y + h, layer, color);
      addLine(x, y + h, x, y, layer, color);
    };

    const addText = (
      x: number,
      y: number,
      height: number,
      text: string,
      layer: string,
      color: number
    ) => {
      const cleanTxt = text.replace(/[^\x20-\x7E]/g, '').trim();
      if (!cleanTxt) return;
      lines.push(
        '0',
        'TEXT',
        '8',
        layer,
        '62',
        String(color),
        '10',
        x.toFixed(3),
        '20',
        y.toFixed(3),
        '30',
        '0.0',
        '40',
        height.toFixed(2),
        '1',
        cleanTxt
      );
    };

    // Helper to draw true 1:1 CAD linear dimension bar with extension lines
    const addHorizDim = (
      x1: number,
      x2: number,
      yRef: number,
      yDim: number,
      label: string,
      color = 2
    ) => {
      addLine(x1, yRef, x1, yDim, 'DIMENSIONS', color);
      addLine(x2, yRef, x2, yDim, 'DIMENSIONS', color);
      addLine(x1, yDim, x2, yDim, 'DIMENSIONS', color);
      // 45-degree architectural ticks
      addLine(x1 - 1.5, yDim - 1.5, x1 + 1.5, yDim + 1.5, 'DIMENSIONS', color);
      addLine(x2 - 1.5, yDim - 1.5, x2 + 1.5, yDim + 1.5, 'DIMENSIONS', color);
      addText(
        (x1 + x2) / 2 - Math.min((x2 - x1) * 0.35, label.length * 1.15),
        yDim + 2.0,
        2.8,
        label,
        'DIMENSIONS',
        color
      );
    };

    const addVertDim = (
      y1: number,
      y2: number,
      xRef: number,
      xDim: number,
      label: string,
      color = 2
    ) => {
      addLine(xRef, y1, xDim, y1, 'DIMENSIONS', color);
      addLine(xRef, y2, xDim, y2, 'DIMENSIONS', color);
      addLine(xDim, y1, xDim, y2, 'DIMENSIONS', color);
      addLine(xDim - 1.5, y1 - 1.5, xDim + 1.5, y1 + 1.5, 'DIMENSIONS', color);
      addLine(xDim - 1.5, y2 - 1.5, xDim + 1.5, y2 + 1.5, 'DIMENSIONS', color);
      addText(xDim - 24, (y1 + y2) / 2 - 1.4, 2.6, label, 'DIMENSIONS', color);
    };

    // =========================================================================
    // 1. DIAGRAM 1: ROOM FLOOR 2D CAD LAYOUT (1:1 INCH COORDINATES AT ORIGIN 0,0)
    // =========================================================================
    addRect(0, 0, totalRoomLengthIn, totalRoomWidthIn, 'ROOM_WALL', 7);
    addText(
      0,
      totalRoomWidthIn + 18,
      4.2,
      `DIAGRAM 1: ${roomNameInput} - TRUE 1:1 SCALE (${roomWidthFt}'-${roomWidthExtraIn}" W x ${roomLengthFt}'-${roomLengthExtraIn}" L = ${totalRoomWidthIn}" x ${totalRoomLengthIn}")`,
      'DIMENSIONS',
      7
    );

    // Top & Left Overall Room Dimensions in Feet-Inches and Inches
    addHorizDim(
      0,
      totalRoomLengthIn,
      totalRoomWidthIn,
      totalRoomWidthIn + 9,
      `Length: ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomLengthIn}")`
    );
    addVertDim(
      0,
      totalRoomWidthIn,
      0,
      -8,
      `W: ${roomWidthFt}'-${roomWidthExtraIn}" (${totalRoomWidthIn}")`
    );

    // Outer Border Ring & Individual Border Pieces (B1-A, B2-A, B3-A, B4-A, B1-B, B2-B, B3-B, B4-B)
    if (effectiveOuterBorderIn > 0) {
      const bW = effectiveOuterBorderIn;
      // Top Border: B1-A (Left Half) & B2-A (Right Half)
      addRect(0, totalRoomWidthIn - bW, halfTopBottomBorderLenIn, bW, 'OUTER_BORDER', 3);
      addRect(
        halfTopBottomBorderLenIn,
        totalRoomWidthIn - bW,
        halfTopBottomBorderLenIn,
        bW,
        'OUTER_BORDER',
        3
      );
      addText(
        halfTopBottomBorderLenIn * 0.25,
        totalRoomWidthIn - bW * 0.62,
        2.3,
        `B1-A (${bW}"x${halfTopBottomBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );
      addText(
        halfTopBottomBorderLenIn * 1.25,
        totalRoomWidthIn - bW * 0.62,
        2.3,
        `B2-A (${bW}"x${halfTopBottomBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );

      // Bottom Border: B3-A (Left Half) & B4-A (Right Half)
      addRect(0, 0, halfTopBottomBorderLenIn, bW, 'OUTER_BORDER', 3);
      addRect(halfTopBottomBorderLenIn, 0, halfTopBottomBorderLenIn, bW, 'OUTER_BORDER', 3);
      addText(
        halfTopBottomBorderLenIn * 0.25,
        bW * 0.35,
        2.3,
        `B3-A (${bW}"x${halfTopBottomBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );
      addText(
        halfTopBottomBorderLenIn * 1.25,
        bW * 0.35,
        2.3,
        `B4-A (${bW}"x${halfTopBottomBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );

      // Left Border: B1-B (Top Half) & B3-B (Bottom Half)
      addRect(0, bW + halfSideBorderLenIn, bW, halfSideBorderLenIn, 'OUTER_BORDER', 3);
      addRect(0, bW, bW, halfSideBorderLenIn, 'OUTER_BORDER', 3);
      addText(
        1.0,
        bW + halfSideBorderLenIn * 1.5,
        1.9,
        `B1-B (${bW}"x${halfSideBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );
      addText(
        1.0,
        bW + halfSideBorderLenIn * 0.5,
        1.9,
        `B3-B (${bW}"x${halfSideBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );

      // Right Border: B2-B (Top Half) & B4-B (Bottom Half)
      addRect(
        totalRoomLengthIn - bW,
        bW + halfSideBorderLenIn,
        bW,
        halfSideBorderLenIn,
        'OUTER_BORDER',
        3
      );
      addRect(totalRoomLengthIn - bW, bW, bW, halfSideBorderLenIn, 'OUTER_BORDER', 3);
      addText(
        totalRoomLengthIn - bW + 1.0,
        bW + halfSideBorderLenIn * 1.5,
        1.9,
        `B2-B (${bW}"x${halfSideBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );
      addText(
        totalRoomLengthIn - bW + 1.0,
        bW + halfSideBorderLenIn * 0.5,
        1.9,
        `B4-B (${bW}"x${halfSideBorderLenIn}")`,
        'OUTER_BORDER',
        3
      );
    }

    // Contrast Strip (Patti) Ring
    if (effectiveContrastPattiIn > 0) {
      const pOff = effectiveOuterBorderIn + (doubleBrassPatti ? effectiveBrassIn : 0);
      addRect(
        pOff,
        pOff,
        totalRoomLengthIn - pOff * 2,
        totalRoomWidthIn - pOff * 2,
        'CONTRAST_STRIP',
        30
      );
      const pIn = pOff + effectiveContrastPattiIn;
      addRect(
        pIn,
        pIn,
        totalRoomLengthIn - pIn * 2,
        totalRoomWidthIn - pIn * 2,
        'CONTRAST_STRIP',
        30
      );
    }

    // Inner Floor Origin (inside Border + Patti + Brass)
    const innerX0 = totalMarginEachSideIn;
    const innerY0 = totalMarginEachSideIn;
    addRect(innerX0, innerY0, innerFloorLengthIn, innerFloorWidthIn, 'BRASS_INLAY', 2);

    // Center Bookmatch Grid Origin (inside any Side Cut Pieces)
    const bmStartX = innerX0 + leftSideCutLengthIn;
    const bmStartY = innerY0 + bottomSideCutWidthIn;

    // Top Side Cut Pieces (ST-1 .. ST-N)
    if (topSideCutWidthIn > 0) {
      const topY = bmStartY + centerMedallionWidthIn;
      for (let c = 0; c < bmCols; c++) {
        const sx = bmStartX + c * singleBmPieceLengthIn;
        addRect(sx, topY, singleBmPieceLengthIn, topSideCutWidthIn, 'SIDE_CUTS', 5);
        addText(
          sx + singleBmPieceLengthIn * 0.2,
          topY + topSideCutWidthIn * 0.4,
          2.1,
          `ST-${c + 1} (${topSideCutWidthIn}"x${singleBmPieceLengthIn}")`,
          'SIDE_CUTS',
          5
        );
      }
    }

    // Bottom Side Cut Pieces (SB-1 .. SB-N)
    if (bottomSideCutWidthIn > 0) {
      for (let c = 0; c < bmCols; c++) {
        const sx = bmStartX + c * singleBmPieceLengthIn;
        addRect(sx, innerY0, singleBmPieceLengthIn, bottomSideCutWidthIn, 'SIDE_CUTS', 5);
        addText(
          sx + singleBmPieceLengthIn * 0.2,
          innerY0 + bottomSideCutWidthIn * 0.4,
          2.1,
          `SB-${c + 1} (${bottomSideCutWidthIn}"x${singleBmPieceLengthIn}")`,
          'SIDE_CUTS',
          5
        );
      }
    }

    // Left Side Cut Pieces (SL-1 .. SL-N)
    if (leftSideCutLengthIn > 0) {
      for (let r = 0; r < bmRows; r++) {
        const sy = bmStartY + (bmRows - 1 - r) * singleBmPieceWidthIn;
        addRect(innerX0, sy, leftSideCutLengthIn, singleBmPieceWidthIn, 'SIDE_CUTS', 5);
        addText(
          innerX0 + 1.0,
          sy + singleBmPieceWidthIn * 0.45,
          1.9,
          `SL-${r + 1} (${leftSideCutLengthIn}"x${singleBmPieceWidthIn}")`,
          'SIDE_CUTS',
          5
        );
      }
    }

    // Right Side Cut Pieces (SR-1 .. SR-N)
    if (rightSideCutLengthIn > 0) {
      const rightX = bmStartX + centerMedallionLengthIn;
      for (let r = 0; r < bmRows; r++) {
        const sy = bmStartY + (bmRows - 1 - r) * singleBmPieceWidthIn;
        addRect(rightX, sy, rightSideCutLengthIn, singleBmPieceWidthIn, 'SIDE_CUTS', 5);
        addText(
          rightX + 1.0,
          sy + singleBmPieceWidthIn * 0.45,
          1.9,
          `SR-${r + 1} (${rightSideCutLengthIn}"x${singleBmPieceWidthIn}")`,
          'SIDE_CUTS',
          5
        );
      }
    }

    // Center Bookmatch Pieces (S1..SN) + Diagonal Bookmatch Vein Pattern Lines
    for (let r = 0; r < bmRows; r++) {
      for (let c = 0; c < bmCols; c++) {
        const slotIdx = r * bmCols + c;
        const slabNum = slotToSlabMap[slotIdx] || slotIdx + 1;
        const pLetter = PIECE_LETTERS[slotIdx] || `P${slotIdx + 1}`;
        const px = bmStartX + c * singleBmPieceLengthIn;
        const py = bmStartY + (bmRows - 1 - r) * singleBmPieceWidthIn;
        addRect(px, py, singleBmPieceLengthIn, singleBmPieceWidthIn, 'BOOKMATCH_SLABS', 4);

        // Draw Bookmatch Diamond / V-Match Vein Axis Line inside each slab
        const autoFlips = getAutoFlipForPattern(veinPattern, r, c);
        const slabSt = getSlabState(slabNum);
        const flipH = slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlips.flipH;
        const flipV = slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlips.flipV;
        const vx1 = flipH ? px + singleBmPieceLengthIn - 3 : px + 3;
        const vy1 = flipV ? py + 3 : py + singleBmPieceWidthIn - 3;
        const vx2 = flipH ? px + 3 : px + singleBmPieceLengthIn - 3;
        const vy2 = flipV ? py + singleBmPieceWidthIn - 3 : py + 3;
        addLine(vx1, vy1, vx2, vy2, 'VEIN_PATTERN', 6);

        addText(
          px + singleBmPieceLengthIn * 0.16,
          py + singleBmPieceWidthIn * 0.48,
          2.8,
          `S${slabNum} (${pLetter}) ${singleBmPieceWidthIn}"x${singleBmPieceLengthIn}"`,
          'BOOKMATCH_SLABS',
          2
        );
      }
    }

    // =========================================================================
    // 2. DIAGRAM 2: STOCK SLABS 1:1 CUTTING LAYOUT (SHIFTED RIGHT)
    // =========================================================================
    addText(
      stockOriginX,
      totalRoomWidthIn + 18,
      4.2,
      `DIAGRAM 2: STOCK SLABS 1:1 CUTTING (${safeSlabW}" W x ${safeSlabL}" L)`,
      'STOCK_SLABS',
      7
    );

    for (let s = 1; s <= totalSameStockSlabsInList; s++) {
      const col = (s - 1) % 2;
      const row = Math.floor((s - 1) / 2);
      const sx = stockOriginX + col * (safeSlabL + 32);
      const sy = totalRoomWidthIn - (row + 1) * (safeSlabW + 26);
      const pLetter = PIECE_LETTERS[s - 1] || `S${s}`;

      // Raw Stock Slab Box (safeSlabL horizontal x safeSlabW vertical)
      addRect(sx, sy, safeSlabL, safeSlabW, 'STOCK_SLABS', 7);
      addText(
        sx + 2,
        sy + safeSlabW + 3.5,
        2.8,
        `Slab #${s} (${safeSlabW}"x${safeSlabL}")`,
        'STOCK_SLABS',
        7
      );

      if (s <= totalBmPiecesCount) {
        const usedY = sy + (safeSlabW - singleBmPieceWidthIn);
        addRect(sx, usedY, singleBmPieceLengthIn, singleBmPieceWidthIn, 'BOOKMATCH_SLABS', 4);
        addText(
          sx + 4,
          usedY + singleBmPieceWidthIn * 0.48,
          2.7,
          `Used P${s} (${pLetter}): ${singleBmPieceWidthIn}"x${singleBmPieceLengthIn}"`,
          'BOOKMATCH_SLABS',
          4
        );

        // Leftover / Border Strip Box at Bottom of Slab
        if (leftoverWidthOnBmSlabIn > 0) {
          const isAutoBorder =
            effectiveOuterBorderIn > 0 &&
            borderSlabSource === 'from_bm_slabs_leftover' &&
            leftoverWidthOnBmSlabIn >= effectiveOuterBorderIn;
          const borderTargetLen = s <= 2 ? halfTopBottomBorderLenIn : halfSideBorderLenIn;
          const bCode = s <= 2 ? `B${s}-A` : `B${s}-B`;

          if (isAutoBorder) {
            addRect(sx, sy, borderTargetLen, effectiveOuterBorderIn, 'OUTER_BORDER', 3);
            addText(
              sx + 3,
              sy + effectiveOuterBorderIn * 0.38,
              2.3,
              `Border ${bCode}: ${effectiveOuterBorderIn}"x${borderTargetLen}"`,
              'OUTER_BORDER',
              3
            );
            if (safeSlabL - borderTargetLen > 0.5) {
              addRect(
                sx + borderTargetLen,
                sy,
                safeSlabL - borderTargetLen,
                effectiveOuterBorderIn,
                'WASTE_OFFCUTS',
                1
              );
              addText(
                sx + borderTargetLen + 2,
                sy + effectiveOuterBorderIn * 0.38,
                2.0,
                `Waste: ${effectiveOuterBorderIn}"x${Number(
                  (safeSlabL - borderTargetLen).toFixed(1)
                )}"`,
                'WASTE_OFFCUTS',
                1
              );
            }
          } else {
            addRect(sx, sy, safeSlabL, leftoverWidthOnBmSlabIn, 'WASTE_OFFCUTS', 1);
            addText(
              sx + 4,
              sy + leftoverWidthOnBmSlabIn * 0.38,
              2.3,
              `Waste: ${leftoverWidthOnBmSlabIn}"x${safeSlabL}"`,
              'WASTE_OFFCUTS',
              1
            );
          }
        }

        // Right-side Waste Offcut Box
        if (leftoverLengthOnBmSlabIn > 0) {
          addRect(
            sx + singleBmPieceLengthIn,
            usedY,
            leftoverLengthOnBmSlabIn,
            singleBmPieceWidthIn,
            'WASTE_OFFCUTS',
            1
          );
          addText(
            sx + singleBmPieceLengthIn + 2,
            usedY + singleBmPieceWidthIn * 0.48,
            2.0,
            `Waste: ${singleBmPieceWidthIn}"x${leftoverLengthOnBmSlabIn}"`,
            'WASTE_OFFCUTS',
            1
          );
        }
      }
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    const dxfContent = lines.join('\r\n');
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanName = (roomNameInput || 'room-bookmatch')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${cleanName}-${roomWidthFt}x${roomLengthFt}-1to1-autocad.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const contrastMeta = CONTRAST_MARBLE_META[contrastMarbleType];
  const currentStyleMeta =
    BOOKMATCH_STYLE_META.find((s) => s.id === veinPattern) || BOOKMATCH_STYLE_META[0];
  const bgSizeW = (100 / Math.max(10, cropWidthPercentOnSlab)) * 100;
  const bgSizeH = (100 / Math.max(10, cropHeightPercentOnSlab)) * 100;

  const effectiveOuterBorderTextureUrl =
    borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabImageUrl : slabImageUrl;

  // Estimated Room Material Cost Calculation for Room PDF Report
  const estimatedBookmatchCost = Math.round(
    ((safeSlabW * safeSlabL) / 144) *
      totalBookmatchAndSideSlabsCount *
      (slabRatePerSqFt || 480)
  );
  const estimatedPattiCost = Math.round(contrastPattiSqFt * (pattiSlabRate || 550));
  const estimatedBorderCost =
    borderSlabSource === 'from_bm_slabs_leftover'
      ? 0
      : Math.round(outerBorderSqFt * (borderSlabRate || slabRatePerSqFt || 500));
  const estimatedBrassCost = Math.round(brassTotalRft * 180);
  const totalEstimatedRoomCostPKR =
    estimatedBookmatchCost + estimatedPattiCost + estimatedBorderCost + estimatedBrassCost;

  const getRecommendedNextUseForWaste = (wIn: number, lIn: number) => {
    const minD = Math.min(wIn, lIn);
    const maxD = Math.max(wIn, lIn);
    if (minD >= 24 && maxD >= 36) {
      return {
        en: 'Next Small Room Floor / Bathroom Floor / Stair Landing / Vanity Top',
        ur: 'اگلے چھوٹے کمرے یا باتھ روم کے فرش، سیڑھی لینڈنگ یا وینٹی ٹاپ میں استعمال کریں',
      };
    }
    if (minD >= 11 && maxD >= 28) {
      return {
        en: 'Stair Step Treads (Tappe) / Room Outer Border / Door Threshold / Vanity',
        ur: 'سیڑھی کے ٹپے (Steps)، کمرے کے آؤٹر بارڈر، وینٹی ٹاپ یا دہلیز میں استعمال کریں',
      };
    }
    if (minD >= 5 && maxD >= 20) {
      return {
        en: 'Stair Risers / Window Sills / Contrast Floor Strip (Patti) / Border',
        ur: 'سیڑھی کے رائزر (Riser)، ونڈو سل، کمرے کی ڈیزائن پٹی یا بارڈر میں استعمال کریں',
      };
    }
    if (minD >= 1.5 && maxD >= 14) {
      return {
        en: 'Wall Skirting (4") / Stair Rope-Light Latak (1.5"–3") / Thin Patti',
        ur: 'دیوار کی اسکرٹنگ (4")، سیڑھی کی روپ لائٹ لٹک (Latak) یا باریک پٹی میں استعمال کریں',
      };
    }
    return {
      en: 'Corner Inlay / Mosaic / Small Filler Strip',
      ur: 'کونے کی بھرائی، موزیک یا چھوٹی مرمت پٹی میں استعمال کریں',
    };
  };

  // =========================================================================
  // COMPLETE REMAINING / WASTE PIECES SCHEDULE & NEXT-USE CALCULATOR
  // (اس کمرے کی سلیب کٹنگ کے بعد بچنے والے تمام ویسٹ پیسز اور ان کا اگلا استعمال)
  // =========================================================================
  const buildRoomWasteOffcuts = (): RoomWasteOffcutItem[] => {
    const wasteItems: RoomWasteOffcutItem[] = [];

    // Per-Slab Exact Waste Calculation across all Stock Slabs (Accounting for Multi-Piece Packing & Reassigned Border/Strip Pieces!)
    for (let s = 1; s <= totalSameStockSlabsInList; s++) {
      const m = getSlabPieceMetrics(s);
      const isBm = s <= totalBmPiecesCount;
      const pLet = PIECE_LETTERS[s - 1] || `S${s}`;
      const assignedOnS = piecesAssignedToStockSlab[s] || [];
      const slabTitleEn = isBm
        ? `Bookmatch Slab #${s} (${pLet})`
        : assignedOnS.length > 1
        ? `Packed Slab #${s} (${assignedOnS.length} Pcs)`
        : `Side/Extra Slab #${s}`;
      const slabTitleUr = isBm
        ? `بک میچ سلیب #${s} (${pLet})`
        : assignedOnS.length > 1
        ? `مشترکہ سلیب #${s} (${assignedOnS.length} پیس)`
        : `سائیڈ/ایکسٹرا سلیب #${s}`;

      if (!isBm && assignedOnS.length > 1) {
        // Multi-piece packed slab: compute exact bounding extent across all packed pieces on this slab
        const maxUsedY = assignedOnS.reduce(
          (mx, p) => Math.max(mx, p.yIn + p.widthIn),
          0
        );
        const maxUsedX = assignedOnS.reduce(
          (mx, p) => Math.max(mx, p.xIn + p.lengthIn),
          0
        );
        const remBotW = Number(Math.max(0, safeSlabW - maxUsedY).toFixed(1));
        const remRightL = Number(Math.max(0, safeSlabL - maxUsedX).toFixed(1));
        if (remBotW >= 0.5 && safeSlabL >= 4) {
          const rec = getRecommendedNextUseForWaste(remBotW, safeSlabL);
          wasteItems.push({
            id: `waste-slab-${s}-packed-btm`,
            sourceLabelEn: `${slabTitleEn} — Bottom Saved Strip`,
            sourceLabelUr: `${slabTitleUr} — نیچے والا بچت پیس`,
            widthIn: remBotW,
            lengthIn: safeSlabL,
            quantity: 1,
            totalSqFt: Number(((remBotW * safeSlabL) / 144).toFixed(2)),
            nextUseEn: rec.en,
            nextUseUr: rec.ur,
          });
        }
        if (remRightL >= 0.5 && maxUsedY >= 4) {
          const rec = getRecommendedNextUseForWaste(remRightL, maxUsedY);
          wasteItems.push({
            id: `waste-slab-${s}-packed-right`,
            sourceLabelEn: `${slabTitleEn} — Right Saved Strip`,
            sourceLabelUr: `${slabTitleUr} — دائیں سائیڈ بچت پیس`,
            widthIn: Number(Math.min(remRightL, maxUsedY).toFixed(1)),
            lengthIn: Number(Math.max(remRightL, maxUsedY).toFixed(1)),
            quantity: 1,
            totalSqFt: Number(((remRightL * maxUsedY) / 144).toFixed(2)),
            nextUseEn: rec.en,
            nextUseUr: rec.ur,
          });
        }
        continue;
      }

      // Deduct any border strips extracted from this slab's leftover (applied to the wider horizontal leftover side)
      const deductedBorderHorizW = isBm
        ? allocatedRoomPiecesList
            .filter((p) => p.category === 'outer_border' && p.targetSlabNum === s)
            .reduce((sum, p) => sum + p.widthIn, 0)
        : 0;
      const borderTakenFromTop = deductedBorderHorizW > 0 && m.topWasteIn > m.bottomWasteIn;
      const netTopWasteW = Number(
        Math.max(0, m.topWasteIn - (borderTakenFromTop ? deductedBorderHorizW : 0)).toFixed(1)
      );

      // 1. Top Waste Strip (even down to 0.5")
      if (netTopWasteW >= 0.5 && safeSlabL >= 4) {
        const rec = getRecommendedNextUseForWaste(netTopWasteW, safeSlabL);
        wasteItems.push({
          id: `waste-slab-${s}-top`,
          sourceLabelEn: `${slabTitleEn} — Top Saved Strip`,
          sourceLabelUr: `${slabTitleUr} — اوپر والا بچت پیس`,
          widthIn: netTopWasteW,
          lengthIn: safeSlabL,
          quantity: 1,
          totalSqFt: Number(((netTopWasteW * safeSlabL) / 144).toFixed(2)),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }

      // 2. Bottom Waste Strip (deduct any secondary pieces OR BM-leftover borders placed on this slab's bottom leftover)
      const deductedBottomW =
        assignedOnS
          .filter((p) => !p.isPrimaryOnSlab && p.lengthIn >= safeSlabL * 0.4)
          .reduce((sum, p) => sum + p.widthIn, 0) +
        (borderTakenFromTop ? 0 : deductedBorderHorizW);
      const netBottomWasteW = Number(Math.max(0, m.bottomWasteIn - deductedBottomW).toFixed(1));
      if (netBottomWasteW >= 0.5 && safeSlabL >= 4) {
        const rec = getRecommendedNextUseForWaste(netBottomWasteW, safeSlabL);
        wasteItems.push({
          id: `waste-slab-${s}-btm`,
          sourceLabelEn: `${slabTitleEn} — Bottom Saved Strip`,
          sourceLabelUr: `${slabTitleUr} — نیچے والا بچت پیس`,
          widthIn: netBottomWasteW,
          lengthIn: safeSlabL,
          quantity: 1,
          totalSqFt: Number(((netBottomWasteW * safeSlabL) / 144).toFixed(2)),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }

      // 3. Left Waste Strip (even down to 0.5")
      if (m.leftWasteIn >= 0.5 && m.activePieceWIn >= 4) {
        const rec = getRecommendedNextUseForWaste(m.leftWasteIn, m.activePieceWIn);
        wasteItems.push({
          id: `waste-slab-${s}-left`,
          sourceLabelEn: `${slabTitleEn} — Left Saved Strip`,
          sourceLabelUr: `${slabTitleUr} — بائیں سائیڈ بچت پیس`,
          widthIn: Number(Math.min(m.leftWasteIn, m.activePieceWIn).toFixed(1)),
          lengthIn: Number(Math.max(m.leftWasteIn, m.activePieceWIn).toFixed(1)),
          quantity: 1,
          totalSqFt: Number(((m.leftWasteIn * m.activePieceWIn) / 144).toFixed(2)),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }

      // 4. Right Waste Strip (even down to 0.5")
      if (m.rightWasteIn >= 0.5 && m.activePieceWIn >= 4) {
        const rec = getRecommendedNextUseForWaste(m.rightWasteIn, m.activePieceWIn);
        wasteItems.push({
          id: `waste-slab-${s}-right`,
          sourceLabelEn: `${slabTitleEn} — Right Saved Strip`,
          sourceLabelUr: `${slabTitleUr} — دائیں سائیڈ بچت پیس`,
          widthIn: Number(Math.min(m.rightWasteIn, m.activePieceWIn).toFixed(1)),
          lengthIn: Number(Math.max(m.rightWasteIn, m.activePieceWIn).toFixed(1)),
          quantity: 1,
          totalSqFt: Number(((m.rightWasteIn * m.activePieceWIn) / 144).toFixed(2)),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }
    }

    // 5. Remaining Waste from Dedicated Contrast Strip Slab (if Contrast Strip is active on Strip Slab)
    const stripsOnDedicatedSlab = allocatedRoomPiecesList.filter(
      (p) => p.category === 'contrast_strip' && p.targetSlabNum === -1
    );
    if (stripsOnDedicatedSlab.length > 0 && effectiveContrastPattiIn > 0 && pattiLeftoverOnStripSlabW >= 1) {
      const rec = getRecommendedNextUseForWaste(pattiLeftoverOnStripSlabW, pattiSlabLengthIn);
      wasteItems.push({
        id: 'waste-contrast-strip-slab',
        sourceLabelEn: `Strip Slab (${pattiSlabMaterialName} ${pattiSlabWidthIn}"×${pattiSlabLengthIn}") Leftover`,
        sourceLabelUr: `پٹی سلیب (${pattiSlabMaterialName} ${pattiSlabWidthIn}"×${pattiSlabLengthIn}") بقیہ`,
        widthIn: pattiLeftoverOnStripSlabW,
        lengthIn: pattiSlabLengthIn,
        quantity: 1,
        totalSqFt: Number(((pattiLeftoverOnStripSlabW * pattiSlabLengthIn) / 144).toFixed(2)),
        nextUseEn: rec.en,
        nextUseUr: rec.ur,
      });
    }

    // 6. Remaining Waste from Extra Dedicated Border Slabs (if any)
    if (
      borderSlabSource === 'from_custom_border_stock_slab' &&
      extraBorderSlabsNeeded > 0 &&
      effectiveOuterBorderIn > 0
    ) {
      const borderRemW = Math.max(
        0,
        Number((activeBorderSlabW - stripsPerFullBorderSlab * effectiveOuterBorderIn).toFixed(1))
      );
      if (borderRemW >= 1.5) {
        const rec = getRecommendedNextUseForWaste(borderRemW, activeBorderSlabL);
        wasteItems.push({
          id: 'waste-border-slab',
          sourceLabelEn: `Border Stock Slabs (${extraBorderSlabsNeeded} Slabs Leftover)`,
          sourceLabelUr: `بارڈر اسٹاک سلیب (${extraBorderSlabsNeeded} سلیب بقیہ پٹی)`,
          widthIn: borderRemW,
          lengthIn: activeBorderSlabL,
          quantity: extraBorderSlabsNeeded,
          totalSqFt: Number(
            (((borderRemW * activeBorderSlabL) / 144) * extraBorderSlabsNeeded).toFixed(2)
          ),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }
    }

    return wasteItems;
  };

  // =========================================================================
  // STANDALONE MULTI-PAGE ROOM BOOKMATCH PDF / PRINTABLE REPORT DOWNLOADER
  // (True 1:1 Proportional Pure-SVG Floor Diagram + True 1:1 Slab Cutting CAD with Edge Trim, Saw Cuts & Kerf)
  // =========================================================================
  const handleDownloadStandaloneRoomPdfReport = () => {
    void (async () => {
      const partsForTable = buildRoomCutParts();
      const wasteForTable = buildRoomWasteOffcuts();
      const styleTitle = tr(currentStyleMeta.labelEn, currentStyleMeta.labelUr);
      const isRtl = cadLang === 'ur';

      const urlCache = new Map<string, string>();
      const resolvePrintableDataUri = async (rawUrl: string | null | undefined): Promise<string> => {
        if (!rawUrl) return '';
        if (urlCache.has(rawUrl)) return urlCache.get(rawUrl)!;
        if (rawUrl.startsWith('data:')) {
          urlCache.set(rawUrl, rawUrl);
          return rawUrl;
        }
        const absUrl =
          rawUrl.startsWith('/') && typeof window !== 'undefined'
            ? `${window.location.origin}${rawUrl}`
            : rawUrl;
        try {
          const resp = await fetch(absUrl);
          if (!resp.ok) throw new Error('fetch failed');
          const blob = await resp.blob();
          const dataUri = await new Promise<string>((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result || absUrl));
            fr.onerror = () => resolve(absUrl);
            fr.readAsDataURL(blob);
          });
          urlCache.set(rawUrl, dataUri);
          return dataUri;
        } catch {
          urlCache.set(rawUrl, absUrl);
          return absUrl;
        }
      };

      const urlsToResolve = new Set<string>();
      if (slabImageUrl) urlsToResolve.add(slabImageUrl);
      if (effectiveOuterBorderTextureUrl) urlsToResolve.add(effectiveOuterBorderTextureUrl);
      if (pattiCustomSlabImageUrl) urlsToResolve.add(pattiCustomSlabImageUrl);
      for (let s = 1; s <= totalSameStockSlabsInList; s++) {
        const stImg = getSlabState(s).customImageUrl;
        if (stImg) urlsToResolve.add(stImg);
      }
      await Promise.all(Array.from(urlsToResolve).map((u) => resolvePrintableDataUri(u)));
      const getResolvedImg = (rawUrl: string | null | undefined): string =>
        rawUrl ? urlCache.get(rawUrl) || rawUrl : '';

    const roomPartsRowsHtml = partsForTable
      .map((pt, i) => {
        const sqFt = (((pt.widthIn * pt.lengthIn) / 144) * pt.quantity).toFixed(2);
        const cutRunIn = Math.round((pt.widthIn + pt.lengthIn) * 2 * pt.quantity);
        return `
          <tr>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">U-${i + 1}</td>
            <td style="padding:6px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${pt.label}</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:900;color:#0369a1;">${pt.widthIn}" × ${pt.lengthIn}"</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">${pt.quantity} Pcs</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;color:#b91c1c;font-weight:bold;">${cutRunIn}" R.In</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#047857;">${sqFt} Sq.Ft</td>
          </tr>
        `;
      })
      .join('');

    const wasteRowsHtml =
      wasteForTable.length === 0
        ? `<tr><td colspan="6" style="padding:10px;border:1.5px solid #0f172a;text-align:center;font-weight:bold;color:#047857;">${tr(
            '100% Full Slabs Used — Zero Waste Remaining!',
            '100% پوری سلیبیں استعمال ہو گئیں — کوئی ویسٹ باقی نہیں!'
          )}</td></tr>`
        : wasteForTable
            .map(
              (w, idx) => `
          <tr>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#b45309;">W-${idx + 1}</td>
            <td style="padding:6px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${
              isRtl ? w.sourceLabelUr : w.sourceLabelEn
            }</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:900;color:#b45309;">${w.widthIn}" × ${w.lengthIn}"</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">${w.quantity} Pcs</td>
            <td style="padding:6px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#047857;">${w.totalSqFt} Sq.Ft</td>
            <td style="padding:6px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${
              isRtl ? w.nextUseUr : w.nextUseEn
            }</td>
          </tr>
        `
            )
            .join('');

    // =========================================================================
    // TRUE 1:1 PURE-SVG ROOM FLOOR BLUEPRINT (EXACT SCREEN PARITY!)
    // =========================================================================
    const svgPadL = 22;
    const svgPadT = 22;
    const svgPadR = 10;
    const svgPadB = 10;
    const roomW = Math.max(24, totalRoomLengthIn);
    const roomH = Math.max(24, totalRoomWidthIn);
    const vbW = roomW + svgPadL + svgPadR;
    const vbH = roomH + svgPadT + svgPadB;

    const bIn = effectiveOuterBorderIn;
    const brassOuterIn = hasBrassPatti && doubleBrassPatti ? Math.max(0.5, effectiveBrassIn) : 0;
    const pIn = effectiveContrastPattiIn;
    const brassInnerIn = hasBrassPatti ? Math.max(0.5, effectiveBrassIn) : 0;

    const innerX0 = svgPadL + bIn + brassOuterIn + pIn + brassInnerIn;
    const innerY0 = svgPadT + bIn + brassOuterIn + pIn + brassInnerIn;
    const innerW = Math.max(12, roomW - 2 * (bIn + brassOuterIn + pIn + brassInnerIn));
    const innerH = Math.max(12, roomH - 2 * (bIn + brassOuterIn + pIn + brassInnerIn));

    const leftWIn = leftSideCutLengthIn > 0 ? (leftSideCutLengthIn / Math.max(1, innerFloorLengthIn)) * innerW : 0;
    const rightWIn = rightSideCutLengthIn > 0 ? (rightSideCutLengthIn / Math.max(1, innerFloorLengthIn)) * innerW : 0;
    const topHIn = topSideCutWidthIn > 0 ? (topSideCutWidthIn / Math.max(1, innerFloorWidthIn)) * innerH : 0;
    const botHIn = bottomSideCutWidthIn > 0 ? (bottomSideCutWidthIn / Math.max(1, innerFloorWidthIn)) * innerH : 0;

    const bmGridX = innerX0 + leftWIn;
    const bmGridY = innerY0 + topHIn;
    const bmGridW = Math.max(8, innerW - leftWIn - rightWIn);
    const bmGridH = Math.max(8, innerH - topHIn - botHIn);

    const colWidthsIn = bmColTrackLengths.map((l) => (l / Math.max(1, actualCenterGridLIn)) * bmGridW);
    const rowHeightsIn = bmRowTrackWidths.map((w) => (w / Math.max(1, actualCenterGridWIn)) * bmGridH);
    const colOffsetsIn: number[] = [];
    let accX = bmGridX;
    for (const cw of colWidthsIn) {
      colOffsetsIn.push(accX);
      accX += cw;
    }
    const rowOffsetsIn: number[] = [];
    let accY = bmGridY;
    for (const rh of rowHeightsIn) {
      rowOffsetsIn.push(accY);
      accY += rh;
    }

    const fontRoomTitle = Math.max(3.6, Math.min(6.2, Math.min(roomW, roomH) * 0.032));
    const fontTileCode = Math.max(3.0, Math.min(5.2, Math.min(bmGridW / Math.max(1, bmCols), bmGridH / Math.max(1, bmRows)) * 0.085));

    const borderSvgParts: string[] = [];
    if (bIn > 0) {
      borderSvgParts.push(
        `<rect x="${svgPadL}" y="${svgPadT}" width="${roomW}" height="${roomH}" fill="#f0fdf4" stroke="#0f172a" stroke-width="1.2" />`,
        `<line x1="${svgPadL + roomW / 2}" y1="${svgPadT}" x2="${svgPadL + roomW / 2}" y2="${svgPadT + bIn}" stroke="#0284c7" stroke-width="0.6" stroke-dasharray="2 1.5" />`,
        `<line x1="${svgPadL + roomW / 2}" y1="${svgPadT + roomH - bIn}" x2="${svgPadL + roomW / 2}" y2="${svgPadT + roomH}" stroke="#0284c7" stroke-width="0.6" stroke-dasharray="2 1.5" />`,
        `<line x1="${svgPadL}" y1="${svgPadT + roomH / 2}" x2="${svgPadL + bIn}" y2="${svgPadT + roomH / 2}" stroke="#0284c7" stroke-width="0.6" stroke-dasharray="2 1.5" />`,
        `<line x1="${svgPadL + roomW - bIn}" y1="${svgPadT + roomH / 2}" x2="${svgPadL + roomW}" y2="${svgPadT + roomH / 2}" stroke="#0284c7" stroke-width="0.6" stroke-dasharray="2 1.5" />`,
        `<text x="${svgPadL + roomW * 0.25}" y="${svgPadT + bIn * 0.65}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.6, Math.min(4.2, bIn * 0.48))}" font-weight="bold" fill="#065f46">B1-A (${bIn}"×${halfTopBottomBorderLenIn}")</text>`,
        `<text x="${svgPadL + roomW * 0.75}" y="${svgPadT + bIn * 0.65}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.6, Math.min(4.2, bIn * 0.48))}" font-weight="bold" fill="#065f46">B2-A (${bIn}"×${halfTopBottomBorderLenIn}")</text>`,
        `<text x="${svgPadL + roomW * 0.25}" y="${svgPadT + roomH - bIn * 0.32}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.6, Math.min(4.2, bIn * 0.48))}" font-weight="bold" fill="#065f46">B3-A (${bIn}"×${halfTopBottomBorderLenIn}")</text>`,
        `<text x="${svgPadL + roomW * 0.75}" y="${svgPadT + roomH - bIn * 0.32}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.6, Math.min(4.2, bIn * 0.48))}" font-weight="bold" fill="#065f46">B4-A (${bIn}"×${halfTopBottomBorderLenIn}")</text>`
      );
    }
    if (brassOuterIn > 0) {
      borderSvgParts.push(
        `<rect x="${svgPadL + bIn}" y="${svgPadT + bIn}" width="${roomW - 2 * bIn}" height="${roomH - 2 * bIn}" fill="#fde047" stroke="#a16207" stroke-width="0.4" />`
      );
    }
    if (pIn > 0) {
      borderSvgParts.push(
        `<rect x="${svgPadL + bIn + brassOuterIn}" y="${svgPadT + bIn + brassOuterIn}" width="${roomW - 2 * (bIn + brassOuterIn)}" height="${roomH - 2 * (bIn + brassOuterIn)}" fill="#fef3c7" stroke="#92400e" stroke-width="0.7" />`,
        `<text x="${svgPadL + roomW / 2}" y="${svgPadT + bIn + brassOuterIn + pIn * 0.72}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.4, Math.min(3.8, pIn * 0.7))}" font-weight="bold" fill="#78350f">CONTRAST STRIP ${pIn}" WIDE</text>`
      );
    }
    if (brassInnerIn > 0) {
      borderSvgParts.push(
        `<rect x="${svgPadL + bIn + brassOuterIn + pIn}" y="${svgPadT + bIn + brassOuterIn + pIn}" width="${roomW - 2 * (bIn + brassOuterIn + pIn)}" height="${roomH - 2 * (bIn + brassOuterIn + pIn)}" fill="#facc15" stroke="#854d0e" stroke-width="0.5" />`
      );
    }

    const sideCutsSvgParts: string[] = [];
    if (topHIn > 0) {
      if (leftWIn > 0) {
        sideCutsSvgParts.push(
          `<rect x="${innerX0}" y="${innerY0}" width="${leftWIn}" height="${topHIn}" fill="#f8fafc" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${innerX0 + leftWIn / 2}" y="${innerY0 + topHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.2, fontTileCode * 0.68)}" font-weight="bold" fill="#0369a1">SC-1</text>`
        );
      }
      for (let c = 0; c < bmCols; c++) {
        const cx = colOffsetsIn[c];
        const cw = colWidthsIn[c];
        sideCutsSvgParts.push(
          `<rect x="${cx}" y="${innerY0}" width="${cw}" height="${topHIn}" fill="#f0f9ff" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${cx + cw / 2}" y="${innerY0 + topHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.4, Math.min(3.8, topHIn * 0.42))}" font-weight="bold" fill="#0369a1">ST-${c + 1} (${sideCutPieceActualWidthIn}"×${Number(bmColTrackLengths[c] || singleBmPieceLengthIn).toFixed(1)}")</text>`
        );
      }
      if (rightWIn > 0) {
        sideCutsSvgParts.push(
          `<rect x="${bmGridX + bmGridW}" y="${innerY0}" width="${rightWIn}" height="${topHIn}" fill="#f8fafc" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${bmGridX + bmGridW + rightWIn / 2}" y="${innerY0 + topHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.2, fontTileCode * 0.68)}" font-weight="bold" fill="#0369a1">SC-2</text>`
        );
      }
    }
    if (botHIn > 0) {
      const botY = bmGridY + bmGridH;
      if (leftWIn > 0) {
        sideCutsSvgParts.push(
          `<rect x="${innerX0}" y="${botY}" width="${leftWIn}" height="${botHIn}" fill="#f8fafc" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${innerX0 + leftWIn / 2}" y="${botY + botHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.2, fontTileCode * 0.68)}" font-weight="bold" fill="#0369a1">SC-3</text>`
        );
      }
      for (let c = 0; c < bmCols; c++) {
        const cx = colOffsetsIn[c];
        const cw = colWidthsIn[c];
        sideCutsSvgParts.push(
          `<rect x="${cx}" y="${botY}" width="${cw}" height="${botHIn}" fill="#f0f9ff" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${cx + cw / 2}" y="${botY + botHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.4, Math.min(3.8, botHIn * 0.42))}" font-weight="bold" fill="#0369a1">SB-${c + 1} (${sideCutPieceActualWidthIn}"×${Number(bmColTrackLengths[c] || singleBmPieceLengthIn).toFixed(1)}")</text>`
        );
      }
      if (rightWIn > 0) {
        sideCutsSvgParts.push(
          `<rect x="${bmGridX + bmGridW}" y="${botY}" width="${rightWIn}" height="${botHIn}" fill="#f8fafc" stroke="#0284c7" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${bmGridX + bmGridW + rightWIn / 2}" y="${botY + botHIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.2, fontTileCode * 0.68)}" font-weight="bold" fill="#0369a1">SC-4</text>`
        );
      }
    }
    if (leftWIn > 0) {
      for (let r = 0; r < bmRows; r++) {
        const ry = rowOffsetsIn[r];
        const rh = rowHeightsIn[r];
        sideCutsSvgParts.push(
          `<rect x="${innerX0}" y="${ry}" width="${leftWIn}" height="${rh}" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${innerX0 + leftWIn / 2}" y="${ry + rh / 2}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.3, Math.min(3.6, leftWIn * 0.45))}" font-weight="bold" fill="#115e59" transform="rotate(-90 ${innerX0 + leftWIn / 2} ${ry + rh / 2})">SL-${r + 1} (${leftRightPieceActualWidthIn}"×${Number(bmRowTrackWidths[r] || singleBmPieceWidthIn).toFixed(1)}")</text>`
        );
      }
    }
    if (rightWIn > 0) {
      for (let r = 0; r < bmRows; r++) {
        const ry = rowOffsetsIn[r];
        const rh = rowHeightsIn[r];
        const rx = bmGridX + bmGridW;
        sideCutsSvgParts.push(
          `<rect x="${rx}" y="${ry}" width="${rightWIn}" height="${rh}" fill="#f0fdfa" stroke="#0f766e" stroke-width="0.7" stroke-dasharray="2 1.5" />`,
          `<text x="${rx + rightWIn / 2}" y="${ry + rh / 2}" text-anchor="middle" font-family="monospace" font-size="${Math.max(2.3, Math.min(3.6, rightWIn * 0.45))}" font-weight="bold" fill="#115e59" transform="rotate(-90 ${rx + rightWIn / 2} ${ry + rh / 2})">SR-${r + 1} (${leftRightPieceActualWidthIn}"×${Number(bmRowTrackWidths[r] || singleBmPieceWidthIn).toFixed(1)}")</text>`
        );
      }
    }

    const bmCellsSvgParts: string[] = [];
    for (let slotIdx = 0; slotIdx < totalBmPiecesCount; slotIdx++) {
      const r = Math.floor(slotIdx / bmCols);
      const c = slotIdx % bmCols;
      const mappedSlabNum = slotToSlabMap[slotIdx] || slotIdx + 1;
      const slabSt = getSlabState(mappedSlabNum);
      const slabMetrics = getSlabPieceMetrics(mappedSlabNum);
      const pieceLetter = PIECE_LETTERS[slotIdx] || `S${mappedSlabNum}`;
      const cellX = colOffsetsIn[c];
      const cellY = rowOffsetsIn[r];
      const cellW = colWidthsIn[c];
      const cellH = rowHeightsIn[r];
      const trackColLIn = bmColTrackLengths[c] || singleBmPieceLengthIn;
      const trackRowWIn = bmRowTrackWidths[r] || singleBmPieceWidthIn;
      const pW = cellW * Math.min(1, slabMetrics.activePieceLIn / Math.max(1, trackColLIn));
      const pH = cellH * Math.min(1, slabMetrics.activePieceWIn / Math.max(1, trackRowWIn));
      const pX = cellX + (cellW - pW) / 2;
      const pY = cellY + (cellH - pH) / 2;

      const autoFlip = getAutoFlipForPattern(veinPattern, r, c);
      const flipH = slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlip.flipH;
      const flipV = slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlip.flipV;
      const rotQuarter = Math.round((slabSt.rotationDeg % 360) / 90) % 2 !== 0;
      const isDiagForward = (flipH === flipV) !== rotQuarter;

      const x1 = pX + 2;
      const y1 = isDiagForward ? pY + pH - 2 : pY + 2;
      const x2 = pX + pW - 2;
      const y2 = isDiagForward ? pY + 2 : pY + pH - 2;

      bmCellsSvgParts.push(
        `<rect x="${cellX}" y="${cellY}" width="${cellW}" height="${cellH}" fill="#ffffff" stroke="#0f172a" stroke-width="0.9" />`,
        `<rect x="${pX}" y="${pY}" width="${pW}" height="${pH}" fill="#ffffff" stroke="#0f172a" stroke-width="1.0" />`,
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0284c7" stroke-width="1.2" />`,
        `<line x1="${pX + pW / 2}" y1="${pY + 2}" x2="${pX + pW / 2}" y2="${pY + pH - 2}" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2 2" />`,
        `<line x1="${pX + 2}" y1="${pY + pH / 2}" x2="${pX + pW - 2}" y2="${pY + pH / 2}" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2 2" />`,
        `<rect x="${pX + pW / 2 - Math.min(pW * 0.45, 28)}" y="${pY + pH / 2 - 4.5}" width="${Math.min(pW * 0.9, 56)}" height="9" fill="#ffffff" stroke="#0f172a" stroke-width="0.6" />`,
        `<text x="${pX + pW / 2}" y="${pY + pH / 2 + 1.4}" text-anchor="middle" font-family="monospace" font-size="${fontTileCode}" font-weight="900" fill="#0f172a">S${mappedSlabNum}(${pieceLetter}) ${slabMetrics.activePieceWIn}"×${slabMetrics.activePieceLIn}"</text>`
      );
    }

    const roomFloorExactSvgHtml = `
      <svg viewBox="0 0 ${vbW} ${vbH}" style="width:100%;max-height:360px;height:auto;display:block;margin:0 auto;background:#ffffff;">
        <defs>
          <marker id="arrow-cad" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#0f172a" />
          </marker>
        </defs>
        <!-- Top Length Dimension -->
        <line x1="${svgPadL}" y1="10" x2="${svgPadL + roomW}" y2="10" stroke="#0f172a" stroke-width="0.8" />
        <line x1="${svgPadL}" y1="6" x2="${svgPadL}" y2="14" stroke="#0f172a" stroke-width="0.8" />
        <line x1="${svgPadL + roomW}" y1="6" x2="${svgPadL + roomW}" y2="14" stroke="#0f172a" stroke-width="0.8" />
        <rect x="${svgPadL + roomW / 2 - 36}" y="4" width="72" height="10" fill="#ffffff" />
        <text x="${svgPadL + roomW / 2}" y="11" text-anchor="middle" font-family="monospace" font-size="${fontRoomTitle}" font-weight="900" fill="#0f172a">LENGTH: ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomLengthIn}")</text>
        <!-- Left Width Dimension -->
        <line x1="10" y1="${svgPadT}" x2="10" y2="${svgPadT + roomH}" stroke="#0f172a" stroke-width="0.8" />
        <line x1="6" y1="${svgPadT}" x2="14" y2="${svgPadT}" stroke="#0f172a" stroke-width="0.8" />
        <line x1="6" y1="${svgPadT + roomH}" x2="14" y2="${svgPadT + roomH}" stroke="#0f172a" stroke-width="0.8" />
        <text x="8.5" y="${svgPadT + roomH / 2}" text-anchor="middle" font-family="monospace" font-size="${fontRoomTitle}" font-weight="900" fill="#0f172a" transform="rotate(-90 8.5 ${svgPadT + roomH / 2})">WIDTH: ${roomWidthFt}'-${roomWidthExtraIn}" (${totalRoomWidthIn}")</text>

        <!-- Outer Room Frame + Borders + Brass + Contrast Strip + Side Cuts + Bookmatch Grid -->
        <rect x="${svgPadL}" y="${svgPadT}" width="${roomW}" height="${roomH}" fill="#ffffff" stroke="#0f172a" stroke-width="1.4" />
        ${borderSvgParts.join('')}
        <rect x="${innerX0}" y="${innerY0}" width="${innerW}" height="${innerH}" fill="#ffffff" stroke="#0f172a" stroke-width="0.9" />
        ${sideCutsSvgParts.join('')}
        ${bmCellsSvgParts.join('')}
      </svg>
    `;

    // =========================================================================
    // FULL-COLOR CLEAN VIEW MARBLE VISUAL PICTURE (NO CAD CLUTTER, REAL MARBLE TEXTURES)
    // =========================================================================
    const cleanPxPerIn = Math.min(460 / roomW, 250 / roomH);
    const cleanDrawW = Math.max(120, Math.round(roomW * cleanPxPerIn));
    const cleanDrawH = Math.max(120, Math.round(roomH * cleanPxPerIn));
    const cleanBorderPx = bIn > 0 ? Math.max(4, Math.round(bIn * cleanPxPerIn)) : 0;
    const cleanPattiPx = pIn > 0 ? Math.max(3, Math.round(pIn * cleanPxPerIn)) : 0;
    const cleanTopPct =
      topSideCutWidthIn > 0 ? Number(((topSideCutWidthIn / innerFloorWidthIn) * 100).toFixed(2)) : 0;
    const cleanBotPct =
      bottomSideCutWidthIn > 0
        ? Number(((bottomSideCutWidthIn / innerFloorWidthIn) * 100).toFixed(2))
        : 0;
    const cleanLeftPct =
      leftSideCutLengthIn > 0
        ? Number(((leftSideCutLengthIn / innerFloorLengthIn) * 100).toFixed(2))
        : 0;
    const cleanRightPct =
      rightSideCutLengthIn > 0
        ? Number(((rightSideCutLengthIn / innerFloorLengthIn) * 100).toFixed(2))
        : 0;

    const cleanColTemplate = bmColTrackLengths
      .map((l) => `${((l / Math.max(1, actualCenterGridLIn)) * 100).toFixed(3)}%`)
      .join(' ');
    const cleanRowTemplate = bmRowTrackWidths
      .map((w) => `${((w / Math.max(1, actualCenterGridWIn)) * 100).toFixed(3)}%`)
      .join(' ');

    const cleanMainSlabImg = getResolvedImg(slabImageUrl);
    const cleanBorderImg = getResolvedImg(effectiveOuterBorderTextureUrl);
    const cleanPattiImg = getResolvedImg(pattiCustomSlabImageUrl);

    const cleanUnrotSlabPxW = Math.max(20, Math.round(safeSlabL * cleanPxPerIn));
    const cleanUnrotSlabPxH = Math.max(20, Math.round(safeSlabW * cleanPxPerIn));
    const cleanLrSlabPxW = Math.max(20, Math.round(safeSlabW * cleanPxPerIn));
    const cleanLrSlabPxH = Math.max(20, Math.round(safeSlabL * cleanPxPerIn));

    const cleanTopBandHtml =
      topSideCutWidthIn > 0
        ? `<div style="height:${cleanTopPct}%;width:100%;display:flex;align-items:stretch;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.18);">
            ${
              leftSideCutLengthIn > 0
                ? `<div style="width:${cleanLeftPct}%;height:100%;position:relative;overflow:hidden;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.18);">
                    <div style="position:absolute;inset:0;background-image:url('${cleanMainSlabImg}');background-size:cover;background-repeat:no-repeat;"></div>
                  </div>`
                : ''
            }
            <div style="flex:1;height:100%;display:grid;grid-template-columns:${cleanColTemplate};">
              ${Array.from({ length: bmCols })
                .map((_, cIdx) => {
                  const fallbackSlabNum = Math.min(
                    totalSameStockSlabsInList,
                    totalBmPiecesCount + (cIdx % Math.max(1, slabsForTopBottomSideCuts)) + 1
                  );
                  const sideSlabNum = getPieceTargetSlab(`ST-${cIdx + 1}`, fallbackSlabNum);
                  const sideSt = getSlabState(sideSlabNum);
                  const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                  const sideImg = getResolvedImg(sideSt.customImageUrl || slabImageUrl);
                  const sFlipH = sideSt.flipHOverride ?? false;
                  const sFlipV = sideSt.flipVOverride ?? false;
                  return `<div style="position:relative;height:100%;overflow:hidden;border-right:1px solid rgba(255,255,255,0.15);">
                    <div style="position:absolute;inset:0;background-image:url('${sideImg}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-position:${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%;background-repeat:no-repeat;transform:scale(${sFlipH ? -1 : 1},${sFlipV ? -1 : 1}) rotate(${sideSt.rotationDeg}deg);"></div>
                  </div>`;
                })
                .join('')}
            </div>
            ${
              rightSideCutLengthIn > 0
                ? `<div style="width:${cleanRightPct}%;height:100%;position:relative;overflow:hidden;flex-shrink:0;border-left:1px solid rgba(255,255,255,0.18);">
                    <div style="position:absolute;inset:0;background-image:url('${cleanMainSlabImg}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-repeat:no-repeat;"></div>
                  </div>`
                : ''
            }
          </div>`
        : '';

    const cleanLeftBandHtml =
      leftSideCutLengthIn > 0
        ? `<div style="width:${cleanLeftPct}%;height:100%;display:grid;grid-template-rows:${cleanRowTemplate};flex-shrink:0;border-right:1px solid rgba(255,255,255,0.18);">
            ${Array.from({ length: bmRows })
              .map((_, rIdx) => {
                const fallbackLrSlabNum = Math.min(
                  totalSameStockSlabsInList,
                  totalBmPiecesCount +
                    slabsForTopBottomSideCuts +
                    (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                    1
                );
                const lrSlabNum = getPieceTargetSlab(`SL-${rIdx + 1}`, fallbackLrSlabNum);
                const lrSt = getSlabState(lrSlabNum);
                const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                const lrImg = getResolvedImg(lrSt.customImageUrl || slabImageUrl);
                const lrFlipH = lrSt.flipHOverride ?? false;
                const lrFlipV = lrSt.flipVOverride ?? false;
                return `<div style="position:relative;width:100%;height:100%;overflow:hidden;border-bottom:1px solid rgba(255,255,255,0.15);">
                  <div style="position:absolute;inset:0;background-image:url('${lrImg}');background-size:${cleanLrSlabPxW}px ${cleanLrSlabPxH}px;background-position:${lrMetrics.bgPosY}% ${lrMetrics.bgPosX}%;background-repeat:no-repeat;transform:scale(${lrFlipH ? -1 : 1},${lrFlipV ? -1 : 1}) rotate(${lrSt.rotationDeg}deg);"></div>
                </div>`;
              })
              .join('')}
          </div>`
        : '';

    const cleanRightBandHtml =
      rightSideCutLengthIn > 0
        ? `<div style="width:${cleanRightPct}%;height:100%;display:grid;grid-template-rows:${cleanRowTemplate};flex-shrink:0;border-left:1px solid rgba(255,255,255,0.18);">
            ${Array.from({ length: bmRows })
              .map((_, rIdx) => {
                const fallbackLrSlabNum = Math.min(
                  totalSameStockSlabsInList,
                  totalBmPiecesCount +
                    slabsForTopBottomSideCuts +
                    (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                    1
                );
                const lrSlabNum = getPieceTargetSlab(`SR-${rIdx + 1}`, fallbackLrSlabNum);
                const lrSt = getSlabState(lrSlabNum);
                const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                const lrImg = getResolvedImg(lrSt.customImageUrl || slabImageUrl);
                const lrFlipH = lrSt.flipHOverride ?? false;
                const lrFlipV = lrSt.flipVOverride ?? false;
                return `<div style="position:relative;width:100%;height:100%;overflow:hidden;border-bottom:1px solid rgba(255,255,255,0.15);">
                  <div style="position:absolute;inset:0;background-image:url('${lrImg}');background-size:${cleanLrSlabPxW}px ${cleanLrSlabPxH}px;background-position:${lrMetrics.bgPosY}% ${lrMetrics.bgPosX}%;background-repeat:no-repeat;transform:scale(${lrFlipH ? -1 : 1},${lrFlipV ? -1 : 1}) rotate(${lrSt.rotationDeg}deg);"></div>
                </div>`;
              })
              .join('')}
          </div>`
        : '';

    const cleanBmGridCellsHtml = Array.from({ length: totalBmPiecesCount })
      .map((_, slotIdx) => {
        const mappedSlabNum = slotToSlabMap[slotIdx] || slotIdx + 1;
        const slabSt = getSlabState(mappedSlabNum);
        const slabMetrics = getSlabPieceMetrics(mappedSlabNum);
        const effectiveImgUrl = getResolvedImg(slabSt.customImageUrl || slabImageUrl);
        const r = Math.floor(slotIdx / bmCols);
        const c = slotIdx % bmCols;
        const trackColLIn = bmColTrackLengths[c] || singleBmPieceLengthIn;
        const trackRowWIn = bmRowTrackWidths[r] || singleBmPieceWidthIn;
        const pieceBoxWFrac = Number(
          Math.min(100, Math.max(8, (slabMetrics.activePieceLIn / Math.max(1, trackColLIn)) * 100)).toFixed(2)
        );
        const pieceBoxHFrac = Number(
          Math.min(100, Math.max(8, (slabMetrics.activePieceWIn / Math.max(1, trackRowWIn)) * 100)).toFixed(2)
        );
        const is90Rot = slabSt.rotationDeg % 180 !== 0;
        const tileDrawPxW = Math.max(16, Math.round(slabMetrics.activePieceLIn * cleanPxPerIn));
        const tileDrawPxH = Math.max(16, Math.round(slabMetrics.activePieceWIn * cleanPxPerIn));
        const autoFlips = getAutoFlipForPattern(veinPattern, r, c);
        const flipH = slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlips.flipH;
        const flipV = slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlips.flipV;

        const innerTileStyle = is90Rot
          ? `position:absolute;left:50%;top:50%;width:${tileDrawPxH}px;height:${tileDrawPxW}px;transform:translate(-50%,-50%) scale(${flipH ? -1 : 1},${flipV ? -1 : 1}) rotate(${slabSt.rotationDeg}deg);background-image:url('${effectiveImgUrl}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-position:${slabMetrics.bgPosX}% ${slabMetrics.bgPosY}%;background-repeat:no-repeat;`
          : `width:100%;height:100%;transform:scale(${flipH ? -1 : 1},${flipV ? -1 : 1}) rotate(${slabSt.rotationDeg}deg);background-image:url('${effectiveImgUrl}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-position:${slabMetrics.bgPosX}% ${slabMetrics.bgPosY}%;background-repeat:no-repeat;`;

        return `<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0f172a;">
          <div style="position:relative;width:${pieceBoxWFrac}%;height:${pieceBoxHFrac}%;overflow:hidden;border:0.5px solid rgba(255,255,255,0.12);">
            <div style="${innerTileStyle}"></div>
          </div>
        </div>`;
      })
      .join('');

    const cleanBottomBandHtml =
      bottomSideCutWidthIn > 0
        ? `<div style="height:${cleanBotPct}%;width:100%;display:flex;align-items:stretch;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.18);">
            ${
              leftSideCutLengthIn > 0
                ? `<div style="width:${cleanLeftPct}%;height:100%;position:relative;overflow:hidden;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.18);">
                    <div style="position:absolute;inset:0;background-image:url('${cleanMainSlabImg}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-repeat:no-repeat;"></div>
                  </div>`
                : ''
            }
            <div style="flex:1;height:100%;display:grid;grid-template-columns:${cleanColTemplate};">
              ${Array.from({ length: bmCols })
                .map((_, cIdx) => {
                  const fallbackSlabNum = Math.min(
                    totalSameStockSlabsInList,
                    totalBmPiecesCount + ((cIdx + 1) % Math.max(1, slabsForTopBottomSideCuts)) + 1
                  );
                  const sideSlabNum = getPieceTargetSlab(`SB-${cIdx + 1}`, fallbackSlabNum);
                  const sideSt = getSlabState(sideSlabNum);
                  const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                  const sideImg = getResolvedImg(sideSt.customImageUrl || slabImageUrl);
                  const sFlipH = sideSt.flipHOverride ?? false;
                  const sFlipV = sideSt.flipVOverride ?? false;
                  return `<div style="position:relative;height:100%;overflow:hidden;border-right:1px solid rgba(255,255,255,0.15);">
                    <div style="position:absolute;inset:0;background-image:url('${sideImg}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-position:${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%;background-repeat:no-repeat;transform:scale(${sFlipH ? -1 : 1},${sFlipV ? -1 : 1}) rotate(${sideSt.rotationDeg}deg);"></div>
                  </div>`;
                })
                .join('')}
            </div>
            ${
              rightSideCutLengthIn > 0
                ? `<div style="width:${cleanRightPct}%;height:100%;position:relative;overflow:hidden;flex-shrink:0;border-left:1px solid rgba(255,255,255,0.18);">
                    <div style="position:absolute;inset:0;background-image:url('${cleanMainSlabImg}');background-size:${cleanUnrotSlabPxW}px ${cleanUnrotSlabPxH}px;background-repeat:no-repeat;"></div>
                  </div>`
                : ''
            }
          </div>`
        : '';

    const cleanOuterBorderLabel =
      borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabMaterialName : slabMaterialName;
    const cleanPattiLabel = pattiCustomSlabImageUrl
      ? pattiSlabMaterialName
      : isRtl
      ? contrastMeta.nameUr
      : contrastMeta.nameEn;

    const cleanColorRoomHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <div style="width:${cleanDrawW}px;height:${cleanDrawH}px;padding:${cleanBorderPx}px;background-image:url('${cleanBorderImg}');background-size:cover;border:2px solid #0f172a;display:flex;align-items:center;justify-content:center;position:relative;box-sizing:border-box;">
          <div style="width:100%;height:100%;padding:${hasBrassPatti && doubleBrassPatti ? '2px' : '0px'};background:${
      hasBrassPatti && doubleBrassPatti
        ? 'linear-gradient(135deg,#fde047 0%,#ca8a04 50%,#fef08a 100%)'
        : 'transparent'
    };display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
            <div style="width:100%;height:100%;padding:${cleanPattiPx}px;${
      pIn > 0 && cleanPattiImg ? `background-image:url('${cleanPattiImg}');background-size:cover;` : ''
    }background-color:${pIn > 0 ? contrastMeta.bgHex : 'transparent'};display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
              <div style="width:100%;height:100%;padding:${hasBrassPatti ? '2px' : '0px'};background:${
      hasBrassPatti ? 'linear-gradient(135deg,#fef08a 0%,#eab308 50%,#a16207 100%)' : 'transparent'
    };display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;overflow:hidden;box-sizing:border-box;">
                ${cleanTopBandHtml}
                <div style="flex:1;width:100%;display:flex;align-items:stretch;min-height:0;">
                  ${cleanLeftBandHtml}
                  <div style="flex:1;height:100%;display:grid;grid-template-columns:${cleanColTemplate};grid-template-rows:${cleanRowTemplate};background:#0f172a;overflow:hidden;">
                    ${cleanBmGridCellsHtml}
                  </div>
                  ${cleanRightBandHtml}
                </div>
                ${cleanBottomBandHtml}
              </div>
            </div>
          </div>
        </div>
        <div style="width:100%;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-family:monospace;font-size:10px;padding-top:4px;border-top:1px solid #cbd5e1;">
          <span style="display:inline-flex;align-items:center;gap:4px;border:1px solid #0f172a;border-radius:4px;padding:2px 6px;background:#f8fafc;">
            <img src="${cleanMainSlabImg}" style="width:14px;height:14px;object-fit:cover;border-radius:2px;border:1px solid #334155;" />
            <strong>${tr('Center + Cuts', 'سینٹر + سائیڈ کٹ')}:</strong> ${slabMaterialName}
          </span>
          ${
            bIn > 0
              ? `<span style="display:inline-flex;align-items:center;gap:4px;border:1px solid #0f172a;border-radius:4px;padding:2px 6px;background:#f0fdf4;">
                  <img src="${cleanBorderImg}" style="width:14px;height:14px;object-fit:cover;border-radius:2px;border:1px solid #047857;" />
                  <strong>${tr('Border', 'بارڈر')} (${bIn}"):</strong> ${cleanOuterBorderLabel}
                </span>`
              : ''
          }
          ${
            pIn > 0
              ? `<span style="display:inline-flex;align-items:center;gap:4px;border:1px solid #0f172a;border-radius:4px;padding:2px 6px;background:#fffbeb;">
                  ${
                    cleanPattiImg
                      ? `<img src="${cleanPattiImg}" style="width:14px;height:14px;object-fit:cover;border-radius:2px;border:1px solid #92400e;" />`
                      : `<span style="width:14px;height:14px;border-radius:2px;border:1px solid #78350f;background:${contrastMeta.bgHex};display:inline-block;"></span>`
                  }
                  <strong>${tr('Strip', 'پٹی')} (${pIn}"):</strong> ${cleanPattiLabel}
                </span>`
              : ''
          }
          ${
            hasBrassPatti
              ? `<span style="display:inline-flex;align-items:center;gap:4px;border:1px solid #0f172a;border-radius:4px;padding:2px 6px;background:#fefce8;">
                  <span style="width:14px;height:14px;border-radius:2px;border:1px solid #854d0e;background:linear-gradient(135deg,#fef08a,#ca8a04);display:inline-block;"></span>
                  <strong>${doubleBrassPatti ? tr('Double Brass', 'ڈبل براس پٹی') : tr('Brass Patti', 'براس پٹی')}</strong>
                </span>`
              : ''
          }
        </div>
      </div>
    `;

    // =========================================================================
    // TRUE 1:1 PURE-SVG STOCK SLAB CUTTING DIAGRAMS (EDGE TRIM + SAW CUTS + KERF!)
    // =========================================================================
    const grossSlabWIn = slabDirectionInRoom === 'horizontal' ? (slabWidthIn || 60) : (slabLengthIn || 104);
    const grossSlabLIn = slabDirectionInRoom === 'horizontal' ? (slabLengthIn || 104) : (slabWidthIn || 60);
    const trimEachL = Math.max(0, Number(((grossSlabLIn - safeSlabL) / 2).toFixed(2)));
    const trimEachW = Math.max(0, Number(((grossSlabWIn - safeSlabW) / 2).toFixed(2)));

    const allSlabsCardsHtml = Array.from({ length: totalSameStockSlabsInList })
      .map((_, idx) => {
        const sNum = idx + 1;
        const pLet = PIECE_LETTERS[idx] || `S${sNum}`;
        const m = getSlabPieceMetrics(sNum);
        const isBm = m.isUsedInBookmatch;
        const assignedOnS = piecesAssignedToStockSlab[sNum] || [];
        const isMulti = !isBm && assignedOnS.length > 1;
        const borderPiecesS = allocatedRoomPiecesList.filter(
          (p) => p.category === 'outer_border' && p.targetSlabNum === sNum
        );
        const isBorderFromBm = isBm && effectiveOuterBorderIn > 0 && borderPiecesS.length > 0;
        const primaryBorder = borderPiecesS[0];

        const horizCuts = (m.topWasteIn >= 0.1 ? 1 : 0) + (m.bottomWasteIn >= 0.1 ? 1 : 0);
        const vertCuts = (m.leftWasteIn >= 0.1 ? 1 : 0) + (m.rightWasteIn >= 0.1 ? 1 : 0);
        const cutRunIn = Number(
          (
            horizCuts * safeSlabL +
            vertCuts * m.activePieceWIn +
            (effectiveEdgeTrimIn > 0 ? (safeSlabW + safeSlabL) * 2 : 0)
          ).toFixed(1)
        );

        const sPadL = 14;
        const sPadT = 13;
        const sVbW = grossSlabLIn + sPadL + 6;
        const sVbH = grossSlabWIn + sPadT + 6;
        const sFont = Math.max(2.6, Math.min(4.2, grossSlabWIn * 0.068));

        const trimRects =
          effectiveEdgeTrimIn > 0
            ? `
              <rect x="${sPadL}" y="${sPadT}" width="${grossSlabLIn}" height="${grossSlabWIn}" fill="url(#trim-hatch-pdf)" stroke="#be123c" stroke-width="0.9" />
              <rect x="${sPadL + trimEachL}" y="${sPadT + trimEachW}" width="${safeSlabL}" height="${safeSlabW}" fill="#ffffff" stroke="#0369a1" stroke-width="0.8" stroke-dasharray="2.5 1.5" />
            `
            : `<rect x="${sPadL}" y="${sPadT}" width="${grossSlabLIn}" height="${grossSlabWIn}" fill="#ffffff" stroke="#0f172a" stroke-width="1.1" />`;

        const netX0 = sPadL + trimEachL;
        const netY0 = sPadT + trimEachW;

        let innerPartsSvg = '';
        const sawCutsSvg: string[] = [];

        if (isMulti) {
          innerPartsSvg = assignedOnS
            .map((pc) => {
              const px = netX0 + pc.xIn;
              const py = netY0 + pc.yIn;
              return `
                <rect x="${px}" y="${py}" width="${pc.lengthIn}" height="${pc.widthIn}" fill="#f0f9ff" stroke="#0f172a" stroke-width="1.0" />
                <text x="${px + pc.lengthIn / 2}" y="${py + pc.widthIn / 2 + 1.2}" text-anchor="middle" font-family="monospace" font-size="${sFont}" font-weight="900" fill="#0f172a">${pc.code} (${pc.widthIn}"×${pc.lengthIn}")</text>
              `;
            })
            .join('');
          const uniqY = Array.from(
            new Set(
              assignedOnS
                .flatMap((pc) => [pc.yIn, pc.yIn + pc.widthIn])
                .filter((y) => y > 0.1 && y < safeSlabW - 0.1)
            )
          );
          uniqY.forEach((cy, cIdx) => {
            sawCutsSvg.push(
              `<line x1="${netX0}" y1="${netY0 + cy}" x2="${netX0 + safeSlabL}" y2="${netY0 + cy}" stroke="#e11d48" stroke-width="1.0" stroke-dasharray="3 1.5" />`,
              `<text x="${netX0 + safeSlabL - 2}" y="${netY0 + cy - 1.2}" text-anchor="end" font-family="monospace" font-size="${sFont * 0.78}" font-weight="bold" fill="#be123c">✂ C${cIdx + 1} · K:${effectiveBladeKerfIn}"</text>`
            );
          });
        } else if (m.isUsedInBookmatch || m.isSideCutStockSlab) {
          const px = netX0 + m.cutStartXIn;
          const py = netY0 + m.cutStartYIn;
          const pw = m.activePieceLIn;
          const ph = m.activePieceWIn;

          // Waste zones (Top, Bottom, Left, Right)
          if (m.topWasteIn >= 0.1) {
            innerPartsSvg += `<rect x="${netX0}" y="${netY0}" width="${safeSlabL}" height="${m.topWasteIn}" fill="url(#waste-hatch-pdf)" stroke="#b45309" stroke-width="0.6" stroke-dasharray="2 1.5" />`;
          }
          if (m.bottomWasteIn >= 0.1) {
            innerPartsSvg += `<rect x="${netX0}" y="${py + ph}" width="${safeSlabL}" height="${m.bottomWasteIn}" fill="url(#waste-hatch-pdf)" stroke="#b45309" stroke-width="0.6" stroke-dasharray="2 1.5" />`;
            if (isBorderFromBm && primaryBorder && m.bottomWasteIn >= m.topWasteIn) {
              const bLen = Math.min(safeSlabL, primaryBorder.lengthIn);
              innerPartsSvg += `<rect x="${netX0}" y="${py + ph}" width="${bLen}" height="${Math.min(m.bottomWasteIn, effectiveOuterBorderIn)}" fill="#ecfdf5" stroke="#047857" stroke-width="0.9" />
                <text x="${netX0 + bLen / 2}" y="${py + ph + Math.min(m.bottomWasteIn, effectiveOuterBorderIn) / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${sFont * 0.85}" font-weight="bold" fill="#065f46">${primaryBorder.code} (${effectiveOuterBorderIn}"×${bLen}")</text>`;
            }
          }
          if (m.leftWasteIn >= 0.1) {
            innerPartsSvg += `<rect x="${netX0}" y="${py}" width="${m.leftWasteIn}" height="${ph}" fill="url(#waste-hatch-pdf)" stroke="#b45309" stroke-width="0.6" />`;
          }
          if (m.rightWasteIn >= 0.1) {
            innerPartsSvg += `<rect x="${px + pw}" y="${py}" width="${m.rightWasteIn}" height="${ph}" fill="url(#waste-hatch-pdf)" stroke="#b45309" stroke-width="0.6" />`;
          }

          // Active Used Piece
          innerPartsSvg += `
            <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#f0f9ff" stroke="#0f172a" stroke-width="1.2" />
            <rect x="${px + 1.2}" y="${py + 1.2}" width="${Math.max(1, pw - 2.4)}" height="${Math.max(1, ph - 2.4)}" fill="none" stroke="#0284c7" stroke-width="0.6" />
            <text x="${px + pw / 2}" y="${py + ph / 2 + 1.2}" text-anchor="middle" font-family="monospace" font-size="${sFont}" font-weight="900" fill="#0f172a">USED ${isBm ? pLet : `SC-${sNum - totalBmPiecesCount}`} · ${m.activePieceWIn}"×${m.activePieceLIn}"</text>
          `;

          // Saw Cut Lines + Kerf
          let stepNo = 1;
          if (m.topWasteIn >= 0.1) {
            sawCutsSvg.push(
              `<line x1="${netX0}" y1="${py}" x2="${netX0 + safeSlabL}" y2="${py}" stroke="#e11d48" stroke-width="1.1" stroke-dasharray="3 1.5" />`,
              `<text x="${netX0 + safeSlabL - 2}" y="${py - 1.2}" text-anchor="end" font-family="monospace" font-size="${sFont * 0.78}" font-weight="bold" fill="#be123c">✂ C${stepNo++}: ${safeSlabL}" (K:${effectiveBladeKerfIn}")</text>`
            );
          }
          if (m.bottomWasteIn >= 0.1) {
            sawCutsSvg.push(
              `<line x1="${netX0}" y1="${py + ph}" x2="${netX0 + safeSlabL}" y2="${py + ph}" stroke="#e11d48" stroke-width="1.1" stroke-dasharray="3 1.5" />`,
              `<text x="${netX0 + safeSlabL - 2}" y="${py + ph + sFont}" text-anchor="end" font-family="monospace" font-size="${sFont * 0.78}" font-weight="bold" fill="#be123c">✂ C${stepNo++}: ${safeSlabL}" (K:${effectiveBladeKerfIn}")</text>`
            );
          }
          if (m.leftWasteIn >= 0.1) {
            sawCutsSvg.push(
              `<line x1="${px}" y1="${py}" x2="${px}" y2="${py + ph}" stroke="#e11d48" stroke-width="1.1" stroke-dasharray="3 1.5" />`
            );
          }
          if (m.rightWasteIn >= 0.1) {
            sawCutsSvg.push(
              `<line x1="${px + pw}" y1="${py}" x2="${px + pw}" y2="${py + ph}" stroke="#e11d48" stroke-width="1.1" stroke-dasharray="3 1.5" />`
            );
          }
        } else {
          // Dedicated Border Slab
          const bList = borderPiecesS.length > 0 ? borderPiecesS : [];
          let curY = 0;
          bList.forEach((bp, bIdx) => {
            const bW = Math.min(safeSlabL, bp.lengthIn);
            innerPartsSvg += `
              <rect x="${netX0}" y="${netY0 + curY}" width="${bW}" height="${bp.widthIn}" fill="#ecfdf5" stroke="#0f172a" stroke-width="0.9" />
              <text x="${netX0 + bW / 2}" y="${netY0 + curY + bp.widthIn / 2 + 1}" text-anchor="middle" font-family="monospace" font-size="${sFont * 0.85}" font-weight="bold" fill="#065f46">${bp.code} (${bp.widthIn}"×${bp.lengthIn}")</text>
            `;
            curY += bp.widthIn;
            if (curY < safeSlabW - 0.1) {
              sawCutsSvg.push(
                `<line x1="${netX0}" y1="${netY0 + curY}" x2="${netX0 + safeSlabL}" y2="${netY0 + curY}" stroke="#e11d48" stroke-width="1.0" stroke-dasharray="3 1.5" />`
              );
            }
          });
        }

        const slabSvg = `
          <svg viewBox="0 0 ${sVbW} ${sVbH}" style="width:100%;max-height:138px;height:auto;display:block;background:#ffffff;">
            <defs>
              <pattern id="waste-hatch-pdf" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#d97706" stroke-width="0.7" />
              </pattern>
              <pattern id="trim-hatch-pdf" width="3" height="3" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="3" stroke="#e11d48" stroke-width="0.8" />
              </pattern>
            </defs>
            <text x="${sPadL + grossSlabLIn / 2}" y="8.5" text-anchor="middle" font-family="monospace" font-size="${sFont * 0.9}" font-weight="900" fill="#0f172a">GROSS ${grossSlabLIn}" (TRIM:${effectiveEdgeTrimIn}" → NET:${safeSlabL}")</text>
            <text x="6.5" y="${sPadT + grossSlabWIn / 2}" text-anchor="middle" font-family="monospace" font-size="${sFont * 0.85}" font-weight="900" fill="#0f172a" transform="rotate(-90 6.5 ${sPadT + grossSlabWIn / 2})">W:${grossSlabWIn}"</text>
            ${trimRects}
            ${innerPartsSvg}
            ${sawCutsSvg.join('')}
          </svg>
        `;

        return `
          <div style="border:2px solid #0f172a;border-radius:6px;padding:7px;background:#ffffff;color:#0f172a;break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:10.5px;margin-bottom:4px;border-bottom:1.5px solid #0f172a;padding-bottom:3px;">
              <strong>📐 SLAB #${sNum} (${grossSlabWIn}"×${grossSlabLIn}" · Net ${safeSlabW}"×${safeSlabL}")</strong>
              <span style="color:#be123c;font-weight:bold;">✂️ Cut: ${cutRunIn}" R.In · Kerf: ${effectiveBladeKerfIn}" · Trim: ${effectiveEdgeTrimIn}"</span>
            </div>
            ${slabSvg}
          </div>
        `;
      })
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="${cadLang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <title>${roomNameInput} - 2D AutoCAD Room Bookmatch, Slab Cuts & Waste PDF</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 14px; background: #ffffff; color: #0f172a; }
    .sheet { max-width: 1120px; margin: 0 auto 18px auto; background: #ffffff; border: 3px solid #0f172a; padding: 14px; page-break-after: always; }
    .sheet:last-of-type { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; padding: 10px 12px; margin-bottom: 12px; background: #ffffff; }
    .badge { border: 2px solid #0f172a; background: #ffffff; color: #0f172a; font-weight: 900; padding: 3px 10px; font-family: monospace; font-size: 11px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; background: #ffffff; color: #0f172a; }
    th { background: #f1f5f9; color: #0f172a; padding: 7px; border: 1.5px solid #0f172a; font-family: monospace; }
    .print-bar { margin-bottom: 12px; display: flex; gap: 10px; justify-content: flex-end; }
    .btn { padding: 8px 16px; border-radius: 6px; font-weight: 800; border: 2px solid #0f172a; cursor: pointer; font-size: 13px; }
    .btn-print { background: #0f172a; color: #ffffff; }
    @media print { .print-bar { display: none !important; } body { padding: 0; background: #ffffff !important; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn btn-print" onclick="window.print()">🖨️ ${tr('Print / Save 2D AutoCAD PDF', '2D آٹو کیڈ پی ڈی ایف پرنٹ یا سیو کریں')}</button>
  </div>

  <!-- PAGE 1: TRUE 1:1 2D AUTOCAD FLOOR DIAGRAM + TRUE 1:1 STOCK SLAB CUTTING BLUEPRINTS -->
  <div class="sheet">
    <div class="header">
      <div>
        <span class="badge">📐 ${tr('2D AUTOCAD BLUEPRINT — TRUE 1:1 SCALE (PAGE 1/2)', '2D آٹو کیڈ سفید کاغذ نقشہ — اصل سکیل (پیج 1/2)')}</span>
        <h1 style="margin:6px 0 2px;font-size:19px;color:#0f172a;">${roomNameInput} — ${clientNameInput}</h1>
        <div style="font-size:11.5px;color:#334155;font-family:monospace;font-weight:bold;">
          ${tr('Room Size', 'کمرے کا سائز')}: ${roomWidthFt}'-${roomWidthExtraIn}" × ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomWidthIn}" × ${totalRoomLengthIn}" · ${totalRoomSqFt.toFixed(1)} Sq.Ft) |
          ${tr('Style', 'اسٹائل')}: ${styleTitle} |
          ${tr('Kerf', 'بلیڈ کرْف')}: ${effectiveBladeKerfIn}" | ${tr('Edge Trim', 'ایج ٹرمنگ')}: ${effectiveEdgeTrimIn}"
        </div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:11px;color:#0f172a;">
        <div><strong>${tr('Gross Stock Slab', 'اصل اسٹاک سلیب')}:</strong> ${slabMaterialName} (${grossSlabWIn}"×${grossSlabLIn}" · ${tr(`Net ${safeSlabW}"×${safeSlabL}"`, `نیٹ ${safeSlabW}"×${safeSlabL}"`)})</div>
        <div><strong>${tr('Used Center Piece', 'بک میچ پیس سائز')}:</strong> ${singleBmPieceWidthIn}" × ${singleBmPieceLengthIn}" (${totalBmPiecesCount} Pcs) · ${tr(`Total ${totalSameStockSlabsInList} Slabs`, `کل ${totalSameStockSlabsInList} سلیبیں`)}</div>
        <div><strong>${tr('Estimated Room Total', 'تخمینی کل بل')}:</strong> PKR ${totalEstimatedRoomCostPKR.toLocaleString()}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:12px;align-items:start;">
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="border:2px solid #0f172a;padding:10px;background:#ffffff;">
          <div style="font-weight:900;color:#0f172a;font-family:monospace;font-size:12px;margin-bottom:6px;border-bottom:2px solid #0f172a;padding-bottom:4px;">
            1. ${tr('TRUE 1:1 ROOM FLOOR LAYOUT (BORDER + BRASS + SIDE CUTS + BOOKMATCH)', 'کمرے کے فرش کا اصل 1:1 آٹو کیڈ ڈایاگرام')} (${totalRoomWidthIn}" × ${totalRoomLengthIn}")
          </div>
          ${roomFloorExactSvgHtml}
        </div>

        <div style="border:2px solid #0f172a;padding:10px;background:#ffffff;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-weight:900;color:#0f172a;font-family:monospace;font-size:12px;margin-bottom:8px;border-bottom:2px solid #0f172a;padding-bottom:4px;">
            <span>🎨 ${tr('CLEAN VIEW COLOR PREVIEW (MARBLE PLACEMENT)', 'کلین ویو کلر تصویر (کون سا ماربل کیسے لگا ہے)')}</span>
            <span style="color:#92400e;">${styleTitle}</span>
          </div>
          ${cleanColorRoomHtml}
        </div>
      </div>

      <div style="border:2px solid #0f172a;padding:10px;background:#ffffff;">
        <div style="font-weight:900;color:#0f172a;font-family:monospace;font-size:12px;margin-bottom:6px;border-bottom:2px solid #0f172a;padding-bottom:4px;">
          2. ${tr('STOCK SLAB CUTTING BLUEPRINT (TRIM + SAW CUTS + KERF + WASTE)', 'سلیب کٹنگ نقشہ (صفائی ٹرمنگ + کٹنگ نشان + کرْف + بچت)')}
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;">
          ${allSlabsCardsHtml}
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: SEPARATE USED CUT PIECES SCHEDULE + SEPARATE REMAINING WASTE PIECES SCHEDULE -->
  <div class="sheet">
    <div class="header">
      <div>
        <span class="badge">📐 ${tr('2D AUTOCAD SCHEDULE — PAGE 2/2 (USED PIECES vs WASTE PIECES)', '2D آٹو کیڈ شیڈول — پیج 2/2 (یوز پیس الگ اور ویسٹ پیس الگ)')}</span>
        <h2 style="margin:6px 0 2px;font-size:18px;color:#0f172a;">${roomNameInput} — ${tr('Separate Used Pieces & Remaining Waste Schedule', 'کارآمد یوز پیسز اور بچنے والے ویسٹ پیسز کی الگ الگ تفصیل')}</h2>
      </div>
    </div>

    <div style="font-weight:900;color:#0369a1;font-family:monospace;font-size:13px;margin-bottom:4px;">
      ✅ A. ${tr('USED CUT PIECES SCHEDULE (کارآمد / یوز پیسز کا الگ جدول)', 'الف: کارآمد (یوز پیسز) کا الگ جدول')}
    </div>
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>${tr('Used Piece / Room Section Description', 'کارآمد یوز پیس کی تفصیل')}</th>
          <th>${tr('Used Size (1. Width × 2. Length)', 'یوز سائز (1. چوڑائی × 2. لمبائی)')}</th>
          <th>${tr('Quantity', 'تعداد')}</th>
          <th>${tr('Saw Cut Running In', 'کٹنگ رننگ انچ')}</th>
          <th>${tr('Total Area (Sq.Ft)', 'کل رقبہ (مربع فٹ)')}</th>
        </tr>
      </thead>
      <tbody>
        ${roomPartsRowsHtml}
      </tbody>
    </table>

    <div style="font-weight:900;color:#b45309;font-family:monospace;font-size:13px;margin-top:18px;margin-bottom:4px;">
      ♻️ B. ${tr('REMAINING WASTE PIECES SCHEDULE — SHOWN SEPARATELY (بچ جانے والے ویسٹ پیسز کا الگ جدول)', 'ب: بچ جانے والے ویسٹ پیسز کا الگ جدول اور اگلا استعمال')}
    </div>
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>${tr('Source Slabs', 'کن سلیبوں سے بچا ہے')}</th>
          <th>${tr('Remaining Waste Size (W × L)', 'بچنے والے ویسٹ پیس کا سائز (چوڑائی × لمبائی)')}</th>
          <th>${tr('Available Qty', 'دستیاب تعداد')}</th>
          <th>${tr('Total Area (Sq.Ft)', 'رقبہ (مربع فٹ)')}</th>
          <th>${tr('Recommended Next Use (Where to Use)', 'آگے کہاں استعمال کر سکتے ہیں (Next Room / Stairs / Border)')}</th>
        </tr>
      </thead>
      <tbody>
        ${wasteRowsHtml}
      </tbody>
    </table>
  </div>
  <script>setTimeout(() => { window.print(); }, 400);</script>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeRoomSlug = roomNameInput.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Room_Bookmatch';
    a.download = `${safeRoomSlug}_2D_AutoCAD_Bookmatch_And_Waste_PDF.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    })();
  };

  // Reusable Room Bookmatch Canvas Renderer with TRUE 1:1 GEOMETRIC PROPORTIONS (pxPerInch)
  // Inside a fixed-height CAD Viewport so a 14×16 room looks genuinely 14:16 (slightly off-square), NEVER stretched flat!
  const renderRoomFloorCanvas = (
    isFullMonitorModal: boolean,
    isPdfMode = false,
    forceCleanColorPreview = false
  ) => {
    const isNarrowMobile = viewportDims.w < 768;
    const autoCenterHeightPx = Math.max(230, Math.min(480, viewportDims.h - (isNarrowMobile ? 350 : 320)));
    const viewportMaxW = isFullMonitorModal
      ? Math.max(260, Math.round(viewportDims.w * (isNarrowMobile ? 0.92 : 0.78)))
      : isPdfMode
      ? isNarrowMobile
        ? Math.max(240, viewportDims.w - 44)
        : 480
      : isNarrowMobile
      ? Math.max(220, viewportDims.w - 44)
      : isDiagramExpanded || centerCanvasTab === 'floor_only'
      ? Math.max(660, Math.min(1040, Math.round(viewportDims.w * 0.84)))
      : Math.max(440, Math.min(780, Math.round(viewportDims.w * 0.54)));
    const viewportMaxH = isFullMonitorModal
      ? Math.max(320, Math.round(viewportDims.h * 0.68))
      : isPdfMode
      ? forceCleanColorPreview
        ? 260
        : 330
      : Math.max(195, autoCenterHeightPx - 64);

    // Uniform 1:1 Scale Factor (identical pixels-per-inch along both X/Length and Y/Width!)
    const roomPxPerInch = Math.min(
      viewportMaxW / Math.max(12, totalRoomLengthIn),
      viewportMaxH / Math.max(12, totalRoomWidthIn)
    );

    const exactRoomDrawW = Math.max(120, Math.round(totalRoomLengthIn * roomPxPerInch));
    const exactRoomDrawH = Math.max(120, Math.round(totalRoomWidthIn * roomPxPerInch));

    // Exact 1:1 proportional padding for Outer Border and Contrast Strip
    const borderPaddingPx =
      effectiveOuterBorderIn > 0
        ? Math.max(4, Math.round(effectiveOuterBorderIn * roomPxPerInch))
        : 0;

    const pattiPaddingPx =
      effectiveContrastPattiIn > 0
        ? Math.max(3, Math.round(effectiveContrastPattiIn * roomPxPerInch))
        : 0;

    // Exact 1:1 proportional percentages for Side Cut bands inside the inner floor
    const topBandHeightPct =
      topSideCutWidthIn > 0 ? Number(((topSideCutWidthIn / innerFloorWidthIn) * 100).toFixed(2)) : 0;
    const bottomBandHeightPct =
      bottomSideCutWidthIn > 0
        ? Number(((bottomSideCutWidthIn / innerFloorWidthIn) * 100).toFixed(2))
        : 0;
    const leftBandWidthPct =
      leftSideCutLengthIn > 0
        ? Number(((leftSideCutLengthIn / innerFloorLengthIn) * 100).toFixed(2))
        : 0;
    const rightBandWidthPct =
      rightSideCutLengthIn > 0
        ? Number(((rightSideCutLengthIn / innerFloorLengthIn) * 100).toFixed(2))
        : 0;

    const isPdfPaper = !forceCleanColorPreview && (isPdfMode || floorViewMode === 'pdf_preview');
    const isCleanChauras = forceCleanColorPreview || (!isPdfPaper && chaurasPurePreview);
    const isCadVisible =
      !forceCleanColorPreview && (isPdfPaper || (!isCleanChauras && showBlueprintCadLines));

    return (
      <div
        onMouseUp={() => {
          setRoomDraggingPieceIdx(null);
          setRoomDragStartMouse(null);
        }}
        onMouseLeave={() => {
          setRoomDraggingPieceIdx(null);
          setRoomDragStartMouse(null);
        }}
        style={
          forceCleanColorPreview
            ? { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }
            : undefined
        }
        className={`relative rounded-xl border flex flex-col items-center justify-between transition-colors ${
          forceCleanColorPreview
            ? 'border border-slate-300 bg-white text-slate-950'
            : isPdfPaper
            ? 'border-2 border-slate-950 bg-white text-slate-950'
            : 'border-slate-800 bg-slate-950'
        } ${
          isFullMonitorModal
            ? 'w-full h-full p-4 sm:p-6'
            : isPdfMode
            ? forceCleanColorPreview
              ? 'w-full p-2'
              : 'w-full p-3'
            : 'p-2'
        }`}
      >
        {/* SINGLE UNIFIED AUTOCAD TOOLBAR (Pcs + Rotate + Style + Chauras + Manual + Zoom + CAD + Full) */}
        {!isPdfMode && !forceCleanColorPreview && (
          <div className="w-full flex flex-wrap items-center justify-between gap-1.5 mb-1.5 z-30 print:hidden border-b border-slate-800/90 pb-1.5">
            <div className="flex flex-wrap items-center gap-1 min-w-0">
              <span className="text-[11px] font-mono font-black text-sky-400 whitespace-nowrap">
                {tr('FLOOR CAD', 'فلور کیڈ')}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-[11px] font-mono font-bold text-slate-200 truncate max-w-[200px] tabular-nums">
                {`${roomNameInput} (${roomWidthFt}'×${roomLengthFt}')`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {/* Unified Auto / Manual Segmented Toggle */}
              <div className="inline-flex items-center rounded border border-slate-700 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => handleSetAutoManualMode('auto')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    isAutoSlabGridMode && !isManualSlabGrabMode
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={tr(
                    'Automatic 4-Slab Center Bookmatch & Balanced Design',
                    'خودکار 4 سلیب سینٹر بک میچ اور متوازن ڈیزائن'
                  )}
                >
                  {tr('Auto', 'آٹو')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAutoManualMode('manual')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                    !isAutoSlabGridMode || isManualSlabGrabMode
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={tr(
                    'Manual Mode: Change Grid, Flip, Rotate 90°, Drag Veins & Resize',
                    'مینول موڈ: پیس گنتی، فلپ، روٹیٹ اور سائز خود سیٹ کریں'
                  )}
                >
                  <Hand className="h-3 w-3" />
                  <span>{tr('Manual', 'مینول')}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const presets = [
                    { r: 1, c: 2, leg: '2_pieces' as const },
                    { r: 2, c: 2, leg: '4_pieces' as const },
                    { r: 2, c: 3, leg: '6_pieces' as const },
                    { r: 3, c: 2, leg: '6_pieces' as const },
                    { r: 2, c: 4, leg: '6_pieces' as const },
                    { r: 3, c: 3, leg: '6_pieces' as const },
                    { r: 3, c: 4, leg: '6_pieces' as const },
                    { r: 4, c: 4, leg: '6_pieces' as const },
                  ];
                  const idx = presets.findIndex((p) => p.r === bmRows && p.c === bmCols);
                  const next = presets[(idx + 1) % presets.length];
                  setIsAutoSlabGridMode(false);
                  setIsManualSlabGrabMode(true);
                  setCustomGridRows(next.r);
                  setCustomGridCols(next.c);
                  setCenterPiecesGrid(next.leg);
                }}
                className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap tabular-nums"
                title={tr('Cycle Bookmatch Pieces (2/4/6/8/9/12/16)', 'بک میچ پیس تبدیل کریں')}
              >
                <span>{tr(`${totalBmPiecesCount} Pcs`, `${totalBmPiecesCount} پیس`)}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSlabDirectionInRoom((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'))
                }
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-[11px] font-mono font-bold cursor-pointer whitespace-nowrap"
                title={tr('Rotate Slabs 90°', 'سلیب رخ تبدیل کریں')}
              >
                {slabDirectionInRoom === 'horizontal' ? '↔ H' : '↕ V'}
              </button>

              <button
                type="button"
                onClick={handleCycleNextBookmatchStyle}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title={tr('Change Bookmatch Style (1-6)', 'بک میچ سٹائل تبدیل کریں')}
              >
                <RefreshCw className="h-3 w-3" />
                <span>{tr(`Style ${currentStyleMeta.num}/6`, `سٹائل ${currentStyleMeta.num}/6`)}</span>
              </button>

              {/* Unified View Mode Dropdown: CAD | Clean View | PDF View */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowViewModeDropdown((v) => !v)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    floorViewMode === 'pdf_preview'
                      ? 'bg-white border-slate-950 text-slate-950 ring-1 ring-sky-500'
                      : chaurasPurePreview
                      ? 'bg-amber-400 border-white text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
                  }`}
                  title={tr('Switch between Clean View & 1:1 PDF View', 'کلین ویو اور پی ڈی ایف ویو تبدیل کریں')}
                >
                  <Eye className="h-3 w-3" />
                  <span>
                    {floorViewMode === 'pdf_preview'
                      ? tr('PDF View', 'پی ڈی ایف ویو')
                      : chaurasPurePreview
                      ? tr('Clean View', 'کلین ویو')
                      : tr('Clean / PDF View', 'کلین / پی ڈی ایف')}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showViewModeDropdown && (
                  <div
                    onMouseLeave={() => setShowViewModeDropdown(false)}
                    className="absolute right-0 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-700 bg-slate-950 shadow-2xl p-1 z-50 space-y-0.5 text-[11px] font-bold"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectFloorViewMode('cad')}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                        floorViewMode === 'cad'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span>{tr('CAD Work View', 'کیڈ ورک ویو')}</span>
                      <span className="text-[10px] opacity-80">CAD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectFloorViewMode('clean')}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                        floorViewMode === 'clean'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-amber-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{tr('Clean View (Chauras)', 'کلین ویو (چارس)')}</span>
                      <span className="text-[10px] opacity-80">HD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectFloorViewMode('pdf_preview')}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between cursor-pointer ${
                        floorViewMode === 'pdf_preview'
                          ? 'bg-white text-slate-950'
                          : 'text-emerald-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{tr('PDF View (White 1:1)', 'پی ڈی ایف ویو (سفید 1:1)')}</span>
                      <span className="text-[10px] opacity-80">PDF</span>
                    </button>
                    <div className="border-t border-slate-800 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowViewModeDropdown(false);
                          setIsRoomPdfModalOpen(true);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{tr('Open Print / PDF Sheet', 'پی ڈی ایف شیٹ کھولیں')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center rounded border border-slate-700 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setDiagramZoomPct((z) => Math.max(60, z - 15))}
                  className="px-1.5 py-0.5 hover:bg-sky-600 text-sky-300 hover:text-white text-[11px] cursor-pointer"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramZoomPct(100)}
                  className="px-1.5 py-0.5 text-[10.5px] font-mono font-bold text-white tabular-nums cursor-pointer"
                >
                  {diagramZoomPct}%
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramZoomPct((z) => Math.min(220, z + 15))}
                  className="px-1.5 py-0.5 hover:bg-sky-600 text-sky-300 hover:text-white text-[11px] cursor-pointer"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBlueprintCadLines((v) => !v)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer whitespace-nowrap ${
                  showBlueprintCadLines && !chaurasPurePreview
                    ? 'bg-slate-800 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {showBlueprintCadLines && !chaurasPurePreview ? tr('CAD', 'کیڈ') : tr('No CAD', 'سادہ')}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isFullMonitorModal) {
                    setIsChaurasFullScreenModal(false);
                  } else {
                    setIsChaurasFullScreenModal(true);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                  isFullMonitorModal
                    ? 'bg-rose-600 border-rose-300 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-sky-300'
                }`}
                title={tr('Full Screen View', 'فل سکرین')}
              >
                {isFullMonitorModal ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
            </div>
          </div>
        )}

        {/* IN-DIAGRAM SIMPLE DESIGN BUTTONS + LIVE NON-OVERLAPPING POPUP PANEL (RIGHT ABOVE DIAGRAM!) */}
        {!isPdfMode && !isFullMonitorModal && !forceCleanColorPreview && (
          <div className="w-full space-y-1.5 mb-1.5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-slate-800 bg-slate-900/90 px-2 py-1">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'design' ? null : 'design'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'design'
                      ? 'bg-sky-500 border-sky-300 text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-sky-200 hover:border-sky-500/60'
                  }`}
                >
                  <Grid className="h-3 w-3" />
                  <span>{tr('Design', 'ڈیزائن')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'border' ? null : 'border'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'border'
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                      : hasOuterBorder && designMode !== 'full_room_bookmatch'
                      ? 'bg-slate-950 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  <span>
                    {hasOuterBorder && designMode !== 'full_room_bookmatch'
                      ? tr(`Border ${effectiveOuterBorderIn}"`, `بارڈر ${effectiveOuterBorderIn}"`)
                      : tr('Border', 'بارڈر')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'brass' ? null : 'brass'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'brass'
                      ? 'bg-yellow-400 border-yellow-200 text-slate-950'
                      : hasBrassPatti && designMode !== 'full_room_bookmatch'
                      ? 'bg-slate-950 border-yellow-500/60 text-yellow-300'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{tr('Brass', 'براس')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'strip' ? null : 'strip'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'strip'
                      ? 'bg-amber-400 border-amber-200 text-slate-950'
                      : hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                      ? 'bg-slate-950 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{tr('Strip', 'پٹی')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'room' ? null : 'room'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'room'
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-cyan-200'
                  }`}
                >
                  <Sliders className="h-3 w-3" />
                  <span>{tr('Size', 'سائز')}</span>
                </button>
              </div>

              {selectedFloorPieceCode && (
                <button
                  type="button"
                  onClick={() => setInDiagramPopup((p) => (p === 'piece' ? null : 'piece'))}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer ${
                    inDiagramPopup === 'piece'
                      ? 'bg-amber-500 border-white text-slate-950'
                      : 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                  }`}
                >
                  <span>{`★ ${selectedFloorPieceCode}`}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* LIVE POPUP DOCKED RIGHT ABOVE THE DIAGRAM SO CHANGES SHOW IMMEDIATELY */}
            {inDiagramPopup === 'design' && (
              <div className="rounded-lg border border-sky-500/70 bg-slate-900 p-2 shadow-xl space-y-2 text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="font-black text-sky-300">
                    {tr('Quick Floor Design & Bookmatch', 'فلور ڈیزائن اور بک میچ سیٹنگ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInDiagramPopup(null)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectDesignMode('full_room_bookmatch')}
                    className={`py-1 px-1.5 rounded border font-bold cursor-pointer ${
                      designMode === 'full_room_bookmatch'
                        ? 'bg-sky-500 border-sky-300 text-slate-950'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    {tr('Full BM', 'پورا بک میچ')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDesignMode('center_bm_with_border')}
                    className={`py-1 px-1.5 rounded border font-bold cursor-pointer ${
                      designMode === 'center_bm_with_border'
                        ? 'bg-sky-500 border-sky-300 text-slate-950'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    {tr('Center + Border', 'سینٹر + بارڈر')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDesignMode('center_bm_brass_patti_border')}
                    className={`py-1 px-1.5 rounded border font-bold cursor-pointer ${
                      designMode === 'center_bm_brass_patti_border'
                        ? 'bg-sky-500 border-sky-300 text-slate-950'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  >
                    {tr('+ Strip Patti', '+ پٹی بارڈر')}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {BOOKMATCH_STYLE_META.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectSpecificBookmatchStyle(st.id)}
                        className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                          veinPattern === st.id
                            ? 'bg-amber-400 border-white text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-slate-300'
                        }`}
                      >
                        {`S${st.num}`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetAutoManualMode('auto')}
                      className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                        isAutoSlabGridMode && !isManualSlabGrabMode
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                          : 'bg-slate-950 border-slate-700 text-slate-300'
                      }`}
                    >
                      {tr('Auto Grid', 'آٹو')}
                    </button>
                    {([
                      { r: 2, c: 2, label: '4P' },
                      { r: 2, c: 3, label: '6P' },
                      { r: 2, c: 4, label: '8P' },
                      { r: 3, c: 4, label: '12P' },
                    ] as const).map((g) => (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => {
                          setIsAutoSlabGridMode(false);
                          setIsManualSlabGrabMode(true);
                          setCustomGridRows(g.r);
                          setCustomGridCols(g.c);
                          setCenterPiecesGrid(g.r * g.c <= 4 ? '4_pieces' : '6_pieces');
                        }}
                        className={`px-1.5 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                          !isAutoSlabGridMode && bmRows === g.r && bmCols === g.c
                            ? 'bg-sky-500 border-sky-300 text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-slate-300'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {inDiagramPopup === 'border' && (
              <div className="rounded-lg border border-emerald-500/70 bg-slate-900 p-2 shadow-xl space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-300">
                    {tr('Outer Border Quick Settings', 'آؤٹر بارڈر سیٹنگ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !hasOuterBorder;
                        setHasOuterBorder(next);
                        if (next && designMode === 'full_room_bookmatch') {
                          setDesignMode('center_bm_with_border');
                        }
                      }}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        hasOuterBorder && designMode !== 'full_room_bookmatch'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {hasOuterBorder && designMode !== 'full_room_bookmatch'
                        ? tr('ON', 'آن')
                        : tr('OFF', 'آف')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInDiagramPopup(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[6, 9, 12, 15, 18, 24].map((bw) => (
                    <button
                      key={bw}
                      type="button"
                      onClick={() => {
                        setHasOuterBorder(true);
                        if (designMode === 'full_room_bookmatch') {
                          setDesignMode('center_bm_with_border');
                        }
                        setOuterBorderWidthIn(bw);
                      }}
                      className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                        outerBorderWidthIn === bw && hasOuterBorder
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                          : 'bg-slate-950 border-slate-700 text-slate-200'
                      }`}
                    >
                      {`${bw}"`}
                    </button>
                  ))}
                  <select
                    value={borderSlabSource}
                    onChange={(e) => setBorderSlabSource(e.target.value as BorderSlabSourceMode)}
                    className="h-6 rounded bg-slate-950 border border-slate-700 text-emerald-300 font-bold px-1.5 text-[11px] cursor-pointer"
                  >
                    <option value="from_bm_slabs_leftover">{tr('BM Leftover', 'بک میچ بقیہ')}</option>
                    <option value="from_separate_same_stock_slabs">{tr('Same Stock', 'اسٹاک سلیب')}</option>
                    <option value="from_custom_border_stock_slab">{tr('Custom Border', 'الگ بارڈر')}</option>
                  </select>
                </div>
              </div>
            )}

            {inDiagramPopup === 'brass' && (
              <div className="rounded-lg border border-yellow-500/70 bg-slate-900 p-2 shadow-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-black text-yellow-300">
                  {tr(`Brass Patti (${brassTotalRft} ft)`, `براس پٹی (${brassTotalRft} ft)`)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hasBrassPatti;
                      setHasBrassPatti(next);
                      if (next && designMode === 'full_room_bookmatch') {
                        setDesignMode('center_bm_with_border');
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      hasBrassPatti && designMode !== 'full_room_bookmatch'
                        ? 'bg-yellow-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {hasBrassPatti && designMode !== 'full_room_bookmatch' ? tr('ON', 'آن') : tr('OFF', 'آف')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoubleBrassPatti(false)}
                    className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                      !doubleBrassPatti
                        ? 'bg-yellow-400 border-yellow-200 text-slate-950'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {tr('1× Single', 'سنگل')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoubleBrassPatti(true)}
                    className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                      doubleBrassPatti
                        ? 'bg-yellow-400 border-yellow-200 text-slate-950'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {tr('2× Double', 'ڈبل')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInDiagramPopup(null)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {inDiagramPopup === 'strip' && (
              <div className="rounded-lg border border-amber-500/70 bg-slate-900 p-2 shadow-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-black text-amber-300">
                  {tr('Contrast Strip Width', 'کنٹراسٹ پٹی چوڑائی')}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hasContrastPatti;
                      setHasContrastPatti(next);
                      if (next && designMode !== 'center_bm_brass_patti_border') {
                        setDesignMode('center_bm_brass_patti_border');
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                      ? tr('ON', 'آن')
                      : tr('OFF', 'آف')}
                  </button>
                  {[3, 4, 6, 9, 12].map((pw) => (
                    <button
                      key={pw}
                      type="button"
                      onClick={() => {
                        setHasContrastPatti(true);
                        setDesignMode('center_bm_brass_patti_border');
                        setContrastPattiWidthIn(pw);
                      }}
                      className={`px-2 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                        contrastPattiWidthIn === pw && hasContrastPatti
                          ? 'bg-amber-400 border-amber-200 text-slate-950'
                          : 'bg-slate-950 border-slate-700 text-slate-200'
                      }`}
                    >
                      {`${pw}"`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInDiagramPopup(null)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {inDiagramPopup === 'room' && (
              <div className="rounded-lg border border-cyan-500/70 bg-slate-900 p-2 shadow-xl space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-black text-cyan-300">
                    {tr('Room & Stock Slab Size', 'کمرہ اور سلیب سائز')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInDiagramPopup(null)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
                  <div className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                    <span className="text-amber-300 font-bold">{tr('Rm W:', 'کمرہ چوڑ:')}</span>
                    <input
                      type="number"
                      min="4"
                      max="100"
                      value={roomWidthFt}
                      onChange={(e) => setRoomWidthFt(Math.max(4, Number(e.target.value) || 4))}
                      className="w-11 bg-transparent text-white font-bold text-center"
                    />
                    <span className="text-slate-400">ft</span>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                    <span className="text-sky-300 font-bold">{tr('Rm L:', 'کمرہ لمب:')}</span>
                    <input
                      type="number"
                      min="4"
                      max="100"
                      value={roomLengthFt}
                      onChange={(e) => setRoomLengthFt(Math.max(4, Number(e.target.value) || 4))}
                      className="w-11 bg-transparent text-white font-bold text-center"
                    />
                    <span className="text-slate-400">ft</span>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                    <span className="text-emerald-300 font-bold">{tr('Slb W:', 'سلیب چوڑ:')}</span>
                    <input
                      type="number"
                      min="12"
                      max="140"
                      value={slabWidthIn}
                      onChange={(e) =>
                        onUpdateSlabConfig({ width: Math.max(12, Number(e.target.value) || 60) })
                      }
                      className="w-11 bg-transparent text-white font-bold text-center"
                    />
                    <span className="text-slate-400">&quot;</span>
                  </div>
                  <div className="flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5">
                    <span className="text-cyan-300 font-bold">{tr('Slb L:', 'سلیب لمب:')}</span>
                    <input
                      type="number"
                      min="24"
                      max="160"
                      value={slabLengthIn}
                      onChange={(e) =>
                        onUpdateSlabConfig({ length: Math.max(24, Number(e.target.value) || 104) })
                      }
                      className="w-11 bg-transparent text-white font-bold text-center"
                    />
                    <span className="text-slate-400">&quot;</span>
                  </div>
                </div>
              </div>
            )}

            {inDiagramPopup === 'piece' && (() => {
              const targetSlabNum = Math.max(1, activeSlabIndex);
              const selAllocated = selectedFloorPieceCode
                ? allocatedRoomPiecesList.find((p) => p.code === selectedFloorPieceCode)
                : null;
              const pSlabSt = getSlabState(targetSlabNum);
              const pSlabMetrics = getSlabPieceMetrics(targetSlabNum);
              const pIdx = targetSlabNum - 1;
              const pAutoFlips = getAutoFlipForPattern(
                veinPattern,
                Math.floor(pIdx / bmCols),
                pIdx % bmCols
              );
              const pFlipH = pSlabSt.flipHOverride ?? pAutoFlips.flipH;
              const pFlipV = pSlabSt.flipVOverride ?? pAutoFlips.flipV;

              return (
                <div className="rounded-lg border border-amber-400/80 bg-slate-900 p-2 shadow-xl space-y-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                        {selectedFloorPieceCode || `S${targetSlabNum}`}
                      </span>
                      <span className="text-white font-bold tabular-nums">
                        {selAllocated
                          ? `${selAllocated.widthIn}"×${selAllocated.lengthIn}"`
                          : `${pSlabMetrics.activePieceWIn}"×${pSlabMetrics.activePieceLIn}"`}
                      </span>
                      <span className="text-emerald-300 text-[10px]">
                        {selAllocated
                          ? `← ${cadLang === 'ur' ? selAllocated.sourceDescUr : selAllocated.sourceDescEn}`
                          : `← S${targetSlabNum}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateSlabState(targetSlabNum, { flipHOverride: !pFlipH }, true)}
                        className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                          pFlipH
                            ? 'bg-sky-500 border-sky-300 text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-white'
                        }`}
                      >
                        ↔
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlabState(targetSlabNum, { flipVOverride: !pFlipV }, true)}
                        className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                          pFlipV
                            ? 'bg-sky-500 border-sky-300 text-slate-950'
                            : 'bg-slate-950 border-slate-700 text-white'
                        }`}
                      >
                        ↕
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSlabState(
                            targetSlabNum,
                            { rotationDeg: (pSlabSt.rotationDeg + 90) % 360 },
                            true
                          )
                        }
                        className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold cursor-pointer"
                      >
                        90°
                      </button>
                      <button
                        type="button"
                        onClick={() => setInDiagramPopup(null)}
                        className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800 font-mono">
                    {selAllocated ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-300">{tr('Cut Slab:', 'سلیب:')}</span>
                        <select
                          value={pieceTargetSlabOverrides[selAllocated.id] ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPieceTargetSlabOverrides((prev) => {
                              const next = { ...prev };
                              if (!val || val <= 0) delete next[selAllocated.id];
                              else next[selAllocated.id] = val;
                              return next;
                            });
                            if (val > 0) scrollToSpecificSlab(val);
                          }}
                          className="h-6 rounded bg-slate-950 border border-slate-700 text-amber-300 text-[10.5px] font-bold px-1.5 cursor-pointer"
                        >
                          <option value={0}>
                            {selAllocated.defaultSlabNum > 0
                              ? `Auto S${selAllocated.defaultSlabNum}`
                              : 'Auto'}
                          </option>
                          {Array.from({ length: Math.max(totalSameStockSlabsInList + 2, 6) }).map(
                            (_, sIdx) => (
                              <option key={sIdx + 1} value={sIdx + 1}>
                                {`S${sIdx + 1}`}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-300">{`S${targetSlabNum} Cut:`}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlabState(targetSlabNum, {
                              customPieceWidthIn: Math.max(
                                2,
                                Number((pSlabMetrics.activePieceWIn - 1).toFixed(1))
                              ),
                            })
                          }
                          className="px-1.5 rounded bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          W-
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlabState(targetSlabNum, {
                              customPieceWidthIn: Math.min(
                                safeSlabW,
                                Number((pSlabMetrics.activePieceWIn + 1).toFixed(1))
                              ),
                            })
                          }
                          className="px-1.5 rounded bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          W+
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlabState(targetSlabNum, {
                              customPieceLengthIn: Math.max(
                                2,
                                Number((pSlabMetrics.activePieceLIn - 1).toFixed(1))
                              ),
                            })
                          }
                          className="px-1.5 rounded bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          L-
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSlabState(targetSlabNum, {
                              customPieceLengthIn: Math.min(
                                safeSlabL,
                                Number((pSlabMetrics.activePieceLIn + 1).toFixed(1))
                              ),
                            })
                          }
                          className="px-1.5 rounded bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          L+
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSlabDropdownMenu('adjust');
                        setCenterCanvasTab('dual');
                      }}
                      className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      {tr(`Edit Slab S${targetSlabNum}`, `سلیب S${targetSlabNum} کھولیں`)}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* AUTO-FIT CAD VIEWPORT CONTAINER (Dynamically fits screen height without vertical overflow!) */}
        <div
          style={{
            minHeight: forceCleanColorPreview
              ? 'auto'
              : isFullMonitorModal
              ? '68vh'
              : isPdfMode
              ? '350px'
              : `${autoCenterHeightPx}px`,
          }}
          className="w-full max-w-full overflow-x-auto overflow-y-auto flex flex-col items-center justify-center py-0.5"
        >
          <div
            style={{
              zoom: isPdfMode ? 1 : diagramZoomPct / 100,
            }}
            className="flex flex-col items-center justify-center transition-all"
          >
            {/* Top AutoCAD Room Length Dimension Arrow (Matched to exactRoomDrawW!) */}
            {isCadVisible && (
              <div
                style={{ width: `${exactRoomDrawW}px` }}
                className={`mb-1.5 flex items-center justify-between text-xs font-mono ${
                  isPdfPaper ? 'text-slate-950' : 'text-cyan-300'
                }`}
              >
                <span>├──────</span>
                <span
                  className={`px-2 py-0.5 rounded border font-extrabold whitespace-nowrap ${
                    isPdfPaper
                      ? 'bg-white border-slate-950 text-slate-950'
                      : 'bg-slate-900 border-cyan-500/60 text-white'
                  }`}
                >
                  {tr(
                    `L: ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomLengthIn}")`,
                    `لمبائی: ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomLengthIn}")`
                  )}
                </span>
                <span>──────┤</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              {/* Left AutoCAD Room Width Dimension Label (Matched to exactRoomDrawH!) */}
              {isCadVisible && (
                <div
                  style={{ height: `${exactRoomDrawH}px` }}
                  className={`hidden sm:flex flex-col items-center justify-between text-xs font-mono py-1 ${
                    isPdfPaper ? 'text-slate-950' : 'text-cyan-300'
                  }`}
                >
                  <span>┬</span>
                  <span
                    className={`px-1.5 py-1 rounded border font-extrabold whitespace-nowrap ${
                      isPdfPaper
                        ? 'bg-white border-slate-950 text-slate-950'
                        : 'bg-slate-900 border-cyan-500/60 text-white'
                    }`}
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {tr(
                      `W: ${roomWidthFt}'-${roomWidthExtraIn}" (${totalRoomWidthIn}")`,
                      `چوڑائی: ${roomWidthFt}'-${roomWidthExtraIn}" (${totalRoomWidthIn}")`
                    )}
                  </span>
                  <span>┴</span>
                </div>
              )}

              {/* OUTER ROOM BOUNDARY — TRUE 1:1 GEOMETRIC PROPORTIONS (exactRoomDrawW × exactRoomDrawH)! */}
              <div
                onClick={() => {
                  if (isPdfMode) return;
                  setSelectedRoomZone('outer_border');
                  setInDiagramPopup('border');
                  if (borderSlabSource === 'from_bm_slabs_leftover') {
                    scrollToSpecificSlab(1);
                  }
                }}
                style={{
                  width: `${exactRoomDrawW}px`,
                  height: `${exactRoomDrawH}px`,
                  padding: `${borderPaddingPx}px`,
                  backgroundImage: isPdfPaper ? undefined : `url("${effectiveOuterBorderTextureUrl}")`,
                  backgroundSize: 'cover',
                  backgroundColor: isPdfPaper ? '#f0fdf4' : undefined,
                }}
                className={`relative shrink-0 rounded-none transition-colors shadow-2xl flex items-center justify-center ${
                  isPdfPaper
                    ? 'border-[2.5px] border-slate-950'
                    : isCleanChauras
                    ? 'border border-white/15'
                    : selectedRoomZone === 'outer_border'
                    ? 'border-2 border-emerald-400'
                    : 'border-2 border-white'
                }`}
              >
                {/* Faint border stone texture inside PDF paper mode */}
                {isPdfPaper && effectiveOuterBorderIn > 0 && (
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `url("${effectiveOuterBorderTextureUrl}")`,
                      backgroundSize: 'cover',
                    }}
                  />
                )}
                {/* AUTOCAD OUTER BORDER SEGMENT MARKINGS (Short form, clickable to view on Bookmatch Slab #1-#4) */}
                {effectiveOuterBorderIn > 0 && (
                  <>
                    {!isPdfPaper && isCadVisible && (
                      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
                    )}
                    {isCadVisible && (
                      <>
                        {/* Center Joint Lines dividing Top, Bottom, Left, Right Outer Borders */}
                        <div
                          style={{ height: `${borderPaddingPx}px` }}
                          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] border-l-2 border-dashed border-cyan-300 pointer-events-none"
                        />
                        <div
                          style={{ height: `${borderPaddingPx}px` }}
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] border-l-2 border-dashed border-cyan-300 pointer-events-none"
                        />
                        <div
                          style={{ width: `${borderPaddingPx}px` }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] border-t-2 border-dashed border-cyan-300 pointer-events-none"
                        />
                        <div
                          style={{ width: `${borderPaddingPx}px` }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-[1.5px] border-t-2 border-dashed border-cyan-300 pointer-events-none"
                        />

                        {/* TOP BORDER: B1-A & B2-A */}
                        {(['B1-A', 'B2-A', 'B3-A', 'B4-A'] as const).map((bCode) => {
                          const defaultS =
                            bCode === 'B1-A'
                              ? 1
                              : bCode === 'B2-A'
                              ? Math.min(totalSameStockSlabsInList, 2)
                              : bCode === 'B3-A'
                              ? Math.min(totalSameStockSlabsInList, 3)
                              : Math.min(totalSameStockSlabsInList, 4);
                          const targetS = getPieceTargetSlab(bCode, defaultS);
                          const slabBadge =
                            targetS > 0
                              ? `S${targetS}`
                              : borderSlabSource === 'from_custom_border_stock_slab'
                              ? 'CB'
                              : 'Custom';
                          const isSelectedThis = selectedFloorPieceCode === bCode;
                          const isSameSlabAsSelected =
                            Boolean(selectedFloorPieceCode) &&
                            getPieceTargetSlab(selectedFloorPieceCode!, -99) === targetS &&
                            targetS >= 0;
                          const posCls =
                            bCode === 'B1-A'
                              ? 'top-0.5 left-1/4 -translate-x-1/2'
                              : bCode === 'B2-A'
                              ? 'top-0.5 left-3/4 -translate-x-1/2'
                              : bCode === 'B3-A'
                              ? 'bottom-0.5 left-1/4 -translate-x-1/2'
                              : 'bottom-0.5 left-3/4 -translate-x-1/2';
                          return (
                            <button
                              key={bCode}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoomZone('outer_border');
                                handleSelectFloorPiece(bCode, defaultS);
                              }}
                              className={`absolute ${posCls} z-20 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap shadow cursor-pointer transition-all tabular-nums ${
                                isPdfPaper
                                  ? 'bg-white border-emerald-800 text-emerald-950'
                                  : isSelectedThis
                                  ? 'bg-amber-400 border-white text-slate-950 ring-2 ring-emerald-400 scale-105'
                                  : isSameSlabAsSelected
                                  ? 'bg-emerald-700 border-emerald-300 text-white'
                                  : 'bg-slate-950/95 border-emerald-400 text-emerald-200 hover:bg-emerald-950'
                              }`}
                            >
                              {`${bCode}(${slabBadge}) · ${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}"`}
                            </button>
                          );
                        })}

                        {/* LEFT & RIGHT BORDERS: B1-B, B3-B, B2-B, B4-B */}
                        {(['B1-B', 'B3-B', 'B2-B', 'B4-B'] as const).map((bCode) => {
                          const defaultS =
                            bCode === 'B1-B'
                              ? 1
                              : bCode === 'B2-B'
                              ? Math.min(totalSameStockSlabsInList, 2)
                              : bCode === 'B3-B'
                              ? Math.min(totalSameStockSlabsInList, 3)
                              : Math.min(totalSameStockSlabsInList, 4);
                          const targetS = getPieceTargetSlab(bCode, defaultS);
                          const slabBadge =
                            targetS > 0
                              ? `S${targetS}`
                              : borderSlabSource === 'from_custom_border_stock_slab'
                              ? 'CB'
                              : 'Custom';
                          const isSelectedThis = selectedFloorPieceCode === bCode;
                          const isSameSlabAsSelected =
                            Boolean(selectedFloorPieceCode) &&
                            getPieceTargetSlab(selectedFloorPieceCode!, -99) === targetS &&
                            targetS >= 0;
                          const isLeft = bCode === 'B1-B' || bCode === 'B3-B';
                          const isTopHalf = bCode === 'B1-B' || bCode === 'B2-B';
                          return (
                            <button
                              key={bCode}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoomZone('outer_border');
                                handleSelectFloorPiece(bCode, defaultS);
                              }}
                              style={{
                                writingMode: 'vertical-rl',
                                transform: isLeft ? 'rotate(180deg)' : undefined,
                              }}
                              className={`hidden sm:block absolute ${
                                isLeft ? 'left-0.5' : 'right-0.5'
                              } ${isTopHalf ? 'top-[30%]' : 'top-[70%]'} -translate-y-1/2 z-20 px-0.5 py-1 rounded border text-[9.5px] font-mono font-extrabold whitespace-nowrap shadow cursor-pointer transition-all tabular-nums ${
                                isPdfPaper
                                  ? 'bg-white border-emerald-800 text-emerald-950'
                                  : isSelectedThis
                                  ? 'bg-amber-400 border-white text-slate-950 ring-2 ring-emerald-400'
                                  : isSameSlabAsSelected
                                  ? 'bg-emerald-700 border-emerald-300 text-white'
                                  : 'bg-slate-950/95 border-emerald-400 text-emerald-200 hover:bg-emerald-950'
                              }`}
                            >
                              {`${bCode}(${slabBadge}) · ${effectiveOuterBorderIn}"×${halfSideBorderLenIn}"`}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </>
                )}

                {/* OUTER BRASS PATTI #1 */}
                <div
                  style={{
                    padding: hasBrassPatti && doubleBrassPatti ? '2px' : '0px',
                    background:
                      hasBrassPatti && doubleBrassPatti
                        ? 'linear-gradient(135deg, #fde047 0%, #ca8a04 50%, #fef08a 100%)'
                        : 'transparent',
                  }}
                  className="relative w-full h-full flex items-center justify-center shadow-inner"
                >
                  {/* CONTRAST BROWN / UPLOADED MARBLE PATTI (Exact 1:1 pattiPaddingPx) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoomZone('contrast_patti');
                      handleSelectFloorPiece('PT-1', -1);
                    }}
                    style={{
                      padding: `${pattiPaddingPx}px`,
                      backgroundImage:
                        !isPdfPaper && effectiveContrastPattiIn > 0 && pattiCustomSlabImageUrl
                          ? `url("${pattiCustomSlabImageUrl}")`
                          : undefined,
                      backgroundSize: 'cover',
                      backgroundColor:
                        effectiveContrastPattiIn > 0
                          ? isPdfPaper
                            ? '#fef3c7'
                            : contrastMeta.bgHex
                          : 'transparent',
                      borderColor:
                        effectiveContrastPattiIn > 0
                          ? isPdfPaper
                            ? '#92400e'
                            : contrastMeta.borderHex
                          : 'transparent',
                    }}
                    className={`relative w-full h-full flex items-center justify-center transition-all cursor-pointer ${
                      isPdfPaper
                        ? effectiveContrastPattiIn > 0
                          ? 'border border-amber-800'
                          : ''
                        : isCleanChauras
                        ? ''
                        : selectedFloorPieceCode === 'PT-1'
                        ? 'border-2 border-amber-300'
                        : 'border border-amber-400/60'
                    }`}
                  >
                    {effectiveContrastPattiIn > 0 && isCadVisible && (
                      <div
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap ${
                          isPdfPaper
                            ? 'bg-white border-amber-800 text-amber-950'
                            : selectedFloorPieceCode === 'PT-1'
                            ? 'bg-amber-400 border-white text-slate-950'
                            : 'bg-slate-950/95 border-amber-400 text-amber-300'
                        }`}
                      >
                        {`Strip · ${effectiveContrastPattiIn}"`}
                      </div>
                    )}

                    {/* INNER GOLDEN BRASS PATTI */}
                    <div
                      style={{
                        padding: hasBrassPatti ? '2px' : '0px',
                        background: hasBrassPatti
                          ? 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #a16207 100%)'
                          : 'transparent',
                      }}
                      className="relative w-full h-full flex flex-col items-stretch justify-between shadow-lg overflow-hidden"
                    >
                      {/* 1. TOP SIDE CUT-PIECES BAND (Exact 1:1 topBandHeightPct, Interactive & Bright in Chauras / Crisp in PDF View) */}
                      {topSideCutWidthIn > 0 && (
                        <div
                          style={{
                            height: `${topBandHeightPct}%`,
                          }}
                          className={`w-full flex items-stretch shrink-0 ${
                            isPdfPaper
                              ? 'border-b-2 border-slate-900 bg-white'
                              : isCleanChauras
                              ? 'border-b border-white/10'
                              : 'border-b-2 border-dashed border-cyan-300'
                          }`}
                        >
                          {leftSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToSpecificSlab(
                                  getPieceTargetSlab(
                                    'SC-1',
                                    Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                  )
                                );
                              }}
                              style={{
                                width: `${leftBandWidthPct}%`,
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                isPdfPaper
                                  ? 'bg-white border-r-2 border-slate-900'
                                  : isCleanChauras
                                  ? 'border-r border-white/10'
                                  : 'border-r-2 border-dashed border-cyan-300'
                              }`}
                            >
                              <div
                                className="absolute inset-0 bg-no-repeat"
                                style={{
                                  backgroundImage: `url("${slabImageUrl}")`,
                                  backgroundSize: 'cover',
                                  opacity: isPdfPaper ? 0.24 : 1,
                                }}
                              />
                              {isCadVisible && (
                                <span
                                  className={`relative z-10 px-1 py-0.2 rounded border text-[9.5px] font-mono font-bold whitespace-nowrap ${
                                    isPdfPaper
                                      ? 'bg-white border-slate-950 text-slate-950'
                                      : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                  }`}
                                >
                                  {`SC-1(S${getPieceTargetSlab('SC-1', Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1))}) · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              gridTemplateColumns: bmColTrackLengths
                                .map((l) => `${((l / Math.max(1, actualCenterGridLIn)) * 100).toFixed(3)}%`)
                                .join(' '),
                            }}
                            className={`flex-1 h-full grid ${
                              isPdfPaper
                                ? 'divide-x divide-slate-900'
                                : isCleanChauras
                                ? 'divide-x divide-white/10'
                                : 'divide-x-2 divide-dashed divide-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmCols }).map((_, cIdx) => {
                              const fallbackSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  (cIdx % Math.max(1, slabsForTopBottomSideCuts)) +
                                  1
                              );
                              const stCode = `ST-${cIdx + 1}`;
                              const sideSlabNum = getPieceTargetSlab(stCode, fallbackSlabNum);
                              const sideSt = getSlabState(sideSlabNum);
                              const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                              const sideImg = sideSt.customImageUrl || slabImageUrl;
                              const sideFlipH = sideSt.flipHOverride ?? false;
                              const sideFlipV = sideSt.flipVOverride ?? false;
                              const isSelectedSide =
                                (selectedFloorPieceCode === stCode || activeSlabIndex === sideSlabNum) &&
                                !isCleanChauras &&
                                !isPdfPaper;
                              return (
                                <div
                                  key={cIdx}
                                  onMouseDown={(e) => {
                                    if (isPdfMode) return;
                                    setSelectedFloorPieceCode(stCode);
                                    handleRoomPieceMouseDown(100 + cIdx, sideSlabNum, e);
                                  }}
                                  onMouseMove={(e) => {
                                    if (isPdfMode) return;
                                    handleRoomPieceMouseMove(100 + cIdx, sideSlabNum, e);
                                  }}
                                  className={`relative h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isPdfPaper ? 'bg-white' : ''
                                  } ${isSelectedSide ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${sideImg}")`,
                                      backgroundSize: `${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px`,
                                      backgroundPosition: `${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%`,
                                      transform: `scale(${sideFlipH ? -1 : 1}, ${
                                        sideFlipV ? -1 : 1
                                      }) rotate(${sideSt.rotationDeg}deg)`,
                                      opacity: isPdfPaper ? 0.24 : 1,
                                    }}
                                  />
                                  {isCadVisible && (
                                    <span
                                      className={`relative z-10 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isPdfPaper
                                          ? 'bg-white border-slate-950 text-slate-950'
                                          : isSelectedSide
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`${stCode}(S${sideSlabNum}) · ${sideCutPieceActualWidthIn}"×${Number(bmColTrackLengths[cIdx] || singleBmPieceLengthIn).toFixed(1)}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {rightSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFloorPiece(
                                  'SC-2',
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${rightBandWidthPct}%`,
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                isPdfPaper
                                  ? 'bg-white border-l-2 border-slate-900'
                                  : isCleanChauras
                                  ? 'border-l border-white/10'
                                  : 'border-l-2 border-dashed border-cyan-300'
                              }`}
                            >
                              <div
                                className="absolute inset-0 bg-no-repeat"
                                style={{
                                  backgroundImage: `url("${slabImageUrl}")`,
                                  backgroundSize: `${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px`,
                                  opacity: isPdfPaper ? 0.24 : 1,
                                }}
                              />
                              {isCadVisible && (
                                <span
                                  className={`relative z-10 px-1 py-0.2 rounded border text-[9.5px] font-mono font-bold whitespace-nowrap ${
                                    isPdfPaper
                                      ? 'bg-white border-slate-950 text-slate-950'
                                      : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                  }`}
                                >
                                  {`SC-2(S${getPieceTargetSlab('SC-2', Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1))}) · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. MIDDLE ROW: LEFT SIDE CUT + MAIN SLABS GRID + RIGHT SIDE CUT */}
                      <div className="flex-1 w-full flex items-stretch min-h-0">
                        {leftSideCutLengthIn > 0 && (
                          <div
                            style={{
                              width: `${leftBandWidthPct}%`,
                              gridTemplateRows: bmRowTrackWidths
                                .map((w) => `${((w / Math.max(1, actualCenterGridWIn)) * 100).toFixed(3)}%`)
                                .join(' '),
                            }}
                            className={`h-full grid shrink-0 ${
                              isPdfPaper
                                ? 'bg-white divide-y divide-slate-900 border-r-2 border-slate-900'
                                : isCleanChauras
                                ? 'divide-y divide-white/10 border-r border-white/10'
                                : 'divide-y-2 divide-dashed divide-cyan-300 border-r-2 border-dashed border-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmRows }).map((_, rIdx) => {
                              const fallbackLrSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  slabsForTopBottomSideCuts +
                                  (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                                  1
                              );
                              const slCode = `SL-${rIdx + 1}`;
                              const lrSlabNum = getPieceTargetSlab(slCode, fallbackLrSlabNum);
                              const lrSt = getSlabState(lrSlabNum);
                              const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                              const lrImg = lrSt.customImageUrl || slabImageUrl;
                              const lrFlipH = lrSt.flipHOverride ?? false;
                              const lrFlipV = lrSt.flipVOverride ?? false;
                              const isSelectedLr =
                                (selectedFloorPieceCode === slCode || activeSlabIndex === lrSlabNum) &&
                                !isCleanChauras &&
                                !isPdfPaper;
                              return (
                                <div
                                  key={rIdx}
                                  onMouseDown={(e) => {
                                    if (isPdfMode) return;
                                    setSelectedFloorPieceCode(slCode);
                                    handleRoomPieceMouseDown(200 + rIdx, lrSlabNum, e);
                                  }}
                                  onMouseMove={(e) => {
                                    if (isPdfMode) return;
                                    handleRoomPieceMouseMove(200 + rIdx, lrSlabNum, e);
                                  }}
                                  className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isPdfPaper ? 'bg-white' : ''
                                  } ${isSelectedLr ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${lrImg}")`,
                                      backgroundSize: `${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px`,
                                      backgroundPosition: `${lrMetrics.bgPosY}% ${lrMetrics.bgPosX}%`,
                                      transform: `scale(${lrFlipH ? -1 : 1}, ${
                                        lrFlipV ? -1 : 1
                                      }) rotate(${lrSt.rotationDeg}deg)`,
                                      opacity: isPdfPaper ? 0.24 : 1,
                                    }}
                                  />
                                  {isCadVisible && (
                                    <span
                                      style={{
                                        writingMode: 'vertical-rl',
                                        transform: 'rotate(180deg)',
                                      }}
                                      className={`relative z-10 px-0.5 py-1 rounded border text-[9.5px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isPdfPaper
                                          ? 'bg-white border-slate-950 text-slate-950'
                                          : isSelectedLr
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`${slCode}(S${lrSlabNum}) · ${leftRightPieceActualWidthIn}"×${Number(bmRowTrackWidths[rIdx] || singleBmPieceWidthIn).toFixed(1)}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* MAIN BOOKMATCH / FULL-SLAB GRID (TRUE 1:1 INCH TRACKS & UNDISTORTED STOCK SLAB SCALE!) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('center_bookmatch');
                          }}
                          style={{
                            gridTemplateColumns: bmColTrackLengths
                              .map((l) => `${((l / Math.max(1, actualCenterGridLIn)) * 100).toFixed(3)}%`)
                              .join(' '),
                            gridTemplateRows: bmRowTrackWidths
                              .map((w) => `${((w / Math.max(1, actualCenterGridWIn)) * 100).toFixed(3)}%`)
                              .join(' '),
                          }}
                          className={`relative flex-1 h-full grid overflow-hidden select-none ${
                            isPdfPaper
                              ? 'bg-white border-2 border-slate-950'
                              : isCleanChauras
                              ? 'bg-slate-950'
                              : 'bg-slate-950 border-2 border-white'
                          }`}
                        >
                          {Array.from({ length: totalBmPiecesCount }).map((_, slotIdx) => {
                            const mappedSlabNum = slotToSlabMap[slotIdx] || slotIdx + 1;
                            const slabSt = getSlabState(mappedSlabNum);
                            const slabMetrics = getSlabPieceMetrics(mappedSlabNum);
                            const effectiveImgUrl = slabSt.customImageUrl || slabImageUrl;

                            const r = Math.floor(slotIdx / bmCols);
                            const c = slotIdx % bmCols;
                            const pieceLetter = PIECE_LETTERS[slotIdx] || `P${slotIdx + 1}`;
                            const trackColLIn = bmColTrackLengths[c] || singleBmPieceLengthIn;
                            const trackRowWIn = bmRowTrackWidths[r] || singleBmPieceWidthIn;
                            const pieceBoxWFrac = Number(
                              Math.min(100, Math.max(8, (slabMetrics.activePieceLIn / Math.max(1, trackColLIn)) * 100)).toFixed(2)
                            );
                            const pieceBoxHFrac = Number(
                              Math.min(100, Math.max(8, (slabMetrics.activePieceWIn / Math.max(1, trackRowWIn)) * 100)).toFixed(2)
                            );

                            const is90Rot = slabSt.rotationDeg % 180 !== 0;
                            const tileDrawPxW = Math.max(
                              16,
                              Math.round(slabMetrics.activePieceLIn * roomPxPerInch)
                            );
                            const tileDrawPxH = Math.max(
                              16,
                              Math.round(slabMetrics.activePieceWIn * roomPxPerInch)
                            );
                            const unrotSlabPxW = Math.max(
                              20,
                              Math.round(safeSlabL * roomPxPerInch)
                            );
                            const unrotSlabPxH = Math.max(
                              20,
                              Math.round(safeSlabW * roomPxPerInch)
                            );

                            const autoFlips = getAutoFlipForPattern(veinPattern, r, c);
                            const flipH =
                              slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlips.flipH;
                            const flipV =
                              slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlips.flipV;
                            const rotQuarter = Math.round((slabSt.rotationDeg % 360) / 90) % 2 !== 0;
                            const isDiagForward = (flipH === flipV) !== rotQuarter;

                            const isSelectedSlab = activeSlabIndex === mappedSlabNum && !isPdfPaper;
                            const isSlotDropTarget = dragOverTargetKey === `slot-${slotIdx}`;
                            return (
                              <div
                                key={slotIdx}
                                onMouseDown={(e) => {
                                  if (isPdfMode) return;
                                  setSelectedFloorPieceCode(`S${mappedSlabNum}(${pieceLetter})`);
                                  handleRoomPieceMouseDown(slotIdx, mappedSlabNum, e);
                                }}
                                onMouseMove={(e) => {
                                  if (isPdfMode) return;
                                  handleRoomPieceMouseMove(slotIdx, mappedSlabNum, e);
                                }}
                                onDragOver={(e) => {
                                  if (
                                    !isPdfMode &&
                                    draggedStockItem &&
                                    (draggedStockItem.kind === 'active_slab' ||
                                      draggedStockItem.kind === 'saved_lot')
                                  ) {
                                    e.preventDefault();
                                    setDragOverTargetKey(`slot-${slotIdx}`);
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragOverTargetKey === `slot-${slotIdx}`) {
                                    setDragOverTargetKey(null);
                                  }
                                }}
                                onDrop={(e) => handleDropStockOntoFloorSlot(slotIdx, e)}
                                className={`relative w-full h-full flex items-center justify-center overflow-hidden transition-all ${
                                  isPdfPaper ? 'bg-white' : 'bg-slate-950/90'
                                } ${
                                  isManualSlabGrabMode && !isPdfPaper
                                    ? 'cursor-grab active:cursor-grabbing'
                                    : 'cursor-pointer'
                                } ${
                                  isSlotDropTarget
                                    ? 'ring-4 ring-inset ring-emerald-400 brightness-125'
                                    : isPdfPaper
                                    ? 'border border-slate-900'
                                    : isCleanChauras
                                    ? ''
                                    : 'border border-dashed border-slate-700/60'
                                }`}
                              >
                                {/* EXACT 1:1 INCH-SIZED CUT SLAB PIECE BOX (Gapless even at 90°/270° rotation!) */}
                                <div
                                  style={{
                                    width: `${pieceBoxWFrac}%`,
                                    height: `${pieceBoxHFrac}%`,
                                  }}
                                  className={`relative overflow-hidden ${
                                    isPdfPaper
                                      ? 'border border-slate-950 bg-white'
                                      : isCleanChauras
                                      ? 'border-[0.5px] border-white/5'
                                      : isSelectedSlab
                                      ? 'border-2 border-amber-400 shadow-lg'
                                      : 'border border-white/75'
                                  }`}
                                >
                                  <div
                                    className="bg-no-repeat transition-transform duration-150"
                                    style={{
                                      ...(is90Rot
                                        ? {
                                            position: 'absolute' as const,
                                            left: '50%',
                                            top: '50%',
                                            width: `${tileDrawPxH}px`,
                                            height: `${tileDrawPxW}px`,
                                            transform: `translate(-50%, -50%) scale(${flipH ? -1 : 1}, ${
                                              flipV ? -1 : 1
                                            }) rotate(${slabSt.rotationDeg}deg)`,
                                          }
                                        : {
                                            width: '100%',
                                            height: '100%',
                                            transform: `scale(${flipH ? -1 : 1}, ${
                                              flipV ? -1 : 1
                                            }) rotate(${slabSt.rotationDeg}deg)`,
                                          }),
                                      backgroundImage: `url("${effectiveImgUrl}")`,
                                      backgroundSize: `${unrotSlabPxW}px ${unrotSlabPxH}px`,
                                      backgroundPosition: `${slabMetrics.bgPosX}% ${slabMetrics.bgPosY}%`,
                                      opacity: isPdfPaper ? 0.24 : 1,
                                    }}
                                  />
                                  {/* Architectural Vein Vector Line on PDF View */}
                                  {isPdfPaper && (
                                    <svg
                                      viewBox="0 0 100 100"
                                      preserveAspectRatio="none"
                                      className="absolute inset-0 w-full h-full pointer-events-none"
                                    >
                                      <line x1="50" y1="0" x2="50" y2="100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                                      <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                                      {isDiagForward ? (
                                        <line x1="6" y1="94" x2="94" y2="6" stroke="#0284c7" strokeWidth="2.2" />
                                      ) : (
                                        <line x1="6" y1="6" x2="94" y2="94" stroke="#0284c7" strokeWidth="2.2" />
                                      )}
                                    </svg>
                                  )}
                                </div>

                                {/* Direct On-Tile Manual Adjust Controls */}
                                {isManualSlabGrabMode && !chaurasPurePreview && !isPdfMode && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="absolute top-1 left-1 right-1 z-30 flex flex-wrap items-center justify-between gap-1 bg-slate-950/95 border border-emerald-400 rounded px-1.5 py-0.5"
                                  >
                                    <span className="text-[10px] font-mono font-black text-emerald-300">
                                      {`S${mappedSlabNum} (${pieceLetter})`}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSlabState(
                                            mappedSlabNum,
                                            { flipHOverride: !flipH },
                                            true
                                          )
                                        }
                                        className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-sky-600 text-[10px] font-bold text-white border border-slate-600"
                                      >
                                        ↔
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSlabState(
                                            mappedSlabNum,
                                            { flipVOverride: !flipV },
                                            true
                                          )
                                        }
                                        className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-sky-600 text-[10px] font-bold text-white border border-slate-600"
                                      >
                                        ↕
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSlabState(
                                            mappedSlabNum,
                                            { rotationDeg: (slabSt.rotationDeg + 90) % 360 },
                                            true
                                          )
                                        }
                                        className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-amber-300 border border-slate-600"
                                      >
                                        90°
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (swapSourcePieceIdx === null) {
                                            setSwapSourcePieceIdx(slotIdx);
                                          } else if (swapSourcePieceIdx === slotIdx) {
                                            setSwapSourcePieceIdx(null);
                                          } else {
                                            handleSwapRoomSlots(swapSourcePieceIdx, slotIdx);
                                          }
                                        }}
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                          swapSourcePieceIdx === slotIdx
                                            ? 'bg-amber-400 text-slate-950 border-white'
                                            : 'bg-slate-800 text-sky-300 border-slate-600'
                                        }`}
                                      >
                                        <ArrowLeftRight className="h-3 w-3 inline" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Clean Short-Form AutoCAD Piece Callout Overlay */}
                                {isCadVisible && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span
                                      className={`px-1.5 py-0.5 rounded border text-[11px] sm:text-xs font-mono font-extrabold shadow-md ${
                                        isPdfPaper
                                          ? 'bg-white border-slate-950 text-slate-950'
                                          : isSelectedSlab
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-white/80 text-white'
                                      }`}
                                    >
                                      {`S${mappedSlabNum}(${pieceLetter}) · ${slabMetrics.activePieceWIn}"×${slabMetrics.activePieceLIn}"`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Clean AutoCAD Center Crosshair Marker */}
                          {isCadVisible && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center gap-0.5">
                              <div
                                className={`w-4 h-4 rotate-45 border flex items-center justify-center ${
                                  isPdfPaper
                                    ? 'border-sky-700 bg-white'
                                    : 'border-cyan-300 bg-slate-950/80'
                                }`}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side Cut Pieces (SR-1 .. SR-N) (Exact 1:1 rightBandWidthPct, Interactive & Bright in Chauras / Crisp in PDF View) */}
                        {rightSideCutLengthIn > 0 && (
                          <div
                            style={{
                              width: `${rightBandWidthPct}%`,
                              gridTemplateRows: bmRowTrackWidths
                                .map((w) => `${((w / Math.max(1, actualCenterGridWIn)) * 100).toFixed(3)}%`)
                                .join(' '),
                            }}
                            className={`h-full grid shrink-0 ${
                              isPdfPaper
                                ? 'bg-white divide-y divide-slate-900 border-l-2 border-slate-900'
                                : isCleanChauras
                                ? 'divide-y divide-white/10 border-l border-white/10'
                                : 'divide-y-2 divide-dashed divide-cyan-300 border-l-2 border-dashed border-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmRows }).map((_, rIdx) => {
                              const fallbackLrSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  slabsForTopBottomSideCuts +
                                  (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                                  1
                              );
                              const srCode = `SR-${rIdx + 1}`;
                              const lrSlabNum = getPieceTargetSlab(srCode, fallbackLrSlabNum);
                              const lrSt = getSlabState(lrSlabNum);
                              const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                              const lrImg = lrSt.customImageUrl || slabImageUrl;
                              const lrFlipH = lrSt.flipHOverride ?? false;
                              const lrFlipV = lrSt.flipVOverride ?? false;
                              const isSelectedLr =
                                (selectedFloorPieceCode === srCode || activeSlabIndex === lrSlabNum) &&
                                !isCleanChauras &&
                                !isPdfPaper;
                              return (
                                <div
                                  key={rIdx}
                                  onMouseDown={(e) => {
                                    if (isPdfMode) return;
                                    setSelectedFloorPieceCode(srCode);
                                    handleRoomPieceMouseDown(300 + rIdx, lrSlabNum, e);
                                  }}
                                  onMouseMove={(e) => {
                                    if (isPdfMode) return;
                                    handleRoomPieceMouseMove(300 + rIdx, lrSlabNum, e);
                                  }}
                                  className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isPdfPaper ? 'bg-white' : ''
                                  } ${isSelectedLr ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${lrImg}")`,
                                      backgroundSize: `${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px`,
                                      backgroundPosition: `${lrMetrics.bgPosY}% ${lrMetrics.bgPosX}%`,
                                      transform: `scale(${lrFlipH ? -1 : 1}, ${
                                        lrFlipV ? -1 : 1
                                      }) rotate(${lrSt.rotationDeg}deg)`,
                                      opacity: isPdfPaper ? 0.24 : 1,
                                    }}
                                  />
                                  {isCadVisible && (
                                    <span
                                      style={{ writingMode: 'vertical-rl' }}
                                      className={`relative z-10 px-0.5 py-1 rounded border text-[9.5px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isPdfPaper
                                          ? 'bg-white border-slate-950 text-slate-950'
                                          : isSelectedLr
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`${srCode}(S${lrSlabNum}) · ${leftRightPieceActualWidthIn}"×${Number(bmRowTrackWidths[rIdx] || singleBmPieceWidthIn).toFixed(1)}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. BOTTOM SIDE CUT-PIECES BAND (Exact 1:1 bottomBandHeightPct, Interactive & Bright in Chauras / Crisp in PDF View) */}
                      {bottomSideCutWidthIn > 0 && (
                        <div
                          style={{
                            height: `${bottomBandHeightPct}%`,
                          }}
                          className={`w-full flex items-stretch shrink-0 ${
                            isPdfPaper
                              ? 'border-t-2 border-slate-900 bg-white'
                              : isCleanChauras
                              ? 'border-t border-white/10'
                              : 'border-t-2 border-dashed border-cyan-300'
                          }`}
                        >
                          {leftSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFloorPiece(
                                  'SC-3',
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${leftBandWidthPct}%`,
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                isPdfPaper
                                  ? 'bg-white border-r-2 border-slate-900'
                                  : isCleanChauras
                                  ? 'border-r border-white/10'
                                  : 'border-r-2 border-dashed border-cyan-300'
                              }`}
                            >
                              <div
                                className="absolute inset-0 bg-no-repeat"
                                style={{
                                  backgroundImage: `url("${slabImageUrl}")`,
                                  backgroundSize: `${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px`,
                                  opacity: isPdfPaper ? 0.24 : 1,
                                }}
                              />
                              {isCadVisible && (
                                <span
                                  className={`relative z-10 px-1 py-0.2 rounded border text-[9.5px] font-mono font-bold whitespace-nowrap ${
                                    isPdfPaper
                                      ? 'bg-white border-slate-950 text-slate-950'
                                      : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                  }`}
                                >
                                  {`SC-3(S${getPieceTargetSlab('SC-3', Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1))}) · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              gridTemplateColumns: bmColTrackLengths
                                .map((l) => `${((l / Math.max(1, actualCenterGridLIn)) * 100).toFixed(3)}%`)
                                .join(' '),
                            }}
                            className={`flex-1 h-full grid ${
                              isPdfPaper
                                ? 'divide-x divide-slate-900'
                                : isCleanChauras
                                ? 'divide-x divide-white/10'
                                : 'divide-x-2 divide-dashed divide-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmCols }).map((_, cIdx) => {
                              const fallbackSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  ((cIdx + 1) % Math.max(1, slabsForTopBottomSideCuts)) +
                                  1
                              );
                              const sbCode = `SB-${cIdx + 1}`;
                              const sideSlabNum = getPieceTargetSlab(sbCode, fallbackSlabNum);
                              const sideSt = getSlabState(sideSlabNum);
                              const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                              const sideImg = sideSt.customImageUrl || slabImageUrl;
                              const sideFlipH = sideSt.flipHOverride ?? false;
                              const sideFlipV = sideSt.flipVOverride ?? false;
                              const isSelectedSide =
                                (selectedFloorPieceCode === sbCode || activeSlabIndex === sideSlabNum) &&
                                !isCleanChauras &&
                                !isPdfPaper;
                              return (
                                <div
                                  key={cIdx}
                                  onMouseDown={(e) => {
                                    if (isPdfMode) return;
                                    setSelectedFloorPieceCode(sbCode);
                                    handleRoomPieceMouseDown(400 + cIdx, sideSlabNum, e);
                                  }}
                                  onMouseMove={(e) => {
                                    if (isPdfMode) return;
                                    handleRoomPieceMouseMove(400 + cIdx, sideSlabNum, e);
                                  }}
                                  className={`relative h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isPdfPaper ? 'bg-white' : ''
                                  } ${isSelectedSide ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${sideImg}")`,
                                      backgroundSize: `${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px`,
                                      backgroundPosition: `${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%`,
                                      transform: `scale(${sideFlipH ? -1 : 1}, ${
                                        sideFlipV ? -1 : 1
                                      }) rotate(${sideSt.rotationDeg}deg)`,
                                      opacity: isPdfPaper ? 0.24 : 1,
                                    }}
                                  />
                                  {isCadVisible && (
                                    <span
                                      className={`relative z-10 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isPdfPaper
                                          ? 'bg-white border-slate-950 text-slate-950'
                                          : isSelectedSide
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`${sbCode}(S${sideSlabNum}) · ${sideCutPieceActualWidthIn}"×${Number(bmColTrackLengths[cIdx] || singleBmPieceLengthIn).toFixed(1)}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {rightSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFloorPiece(
                                  'SC-4',
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${rightBandWidthPct}%`,
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                isPdfPaper
                                  ? 'bg-white border-l-2 border-slate-900'
                                  : isCleanChauras
                                  ? 'border-l border-white/10'
                                  : 'border-l-2 border-dashed border-cyan-300'
                              }`}
                            >
                              <div
                                className="absolute inset-0 bg-no-repeat"
                                style={{
                                  backgroundImage: `url("${slabImageUrl}")`,
                                  backgroundSize: `${Math.max(20, Math.round(safeSlabL * roomPxPerInch))}px ${Math.max(20, Math.round(safeSlabW * roomPxPerInch))}px`,
                                  opacity: isPdfPaper ? 0.24 : 1,
                                }}
                              />
                              {isCadVisible && (
                                <span
                                  className={`relative z-10 px-1 py-0.2 rounded border text-[9.5px] font-mono font-bold whitespace-nowrap ${
                                    isPdfPaper
                                      ? 'bg-white border-slate-950 text-slate-950'
                                      : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                  }`}
                                >
                                  {`SC-4(S${getPieceTargetSlab('SC-4', Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1))}) · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QUIET 1-LINE SUMMARY UNDER FLOOR DIAGRAM (WITH SELECTED PIECE SOURCE INFO) */}
            {!isCleanChauras && (
              <div
                className={`w-full mt-1 pt-1 border-t flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono ${
                  isPdfPaper
                    ? 'border-slate-300 text-slate-900'
                    : 'border-slate-800/80 text-slate-300'
                }`}
              >
                <span className="truncate">
                  {(() => {
                    const selAllocated = selectedFloorPieceCode
                      ? allocatedRoomPiecesList.find((p) => p.code === selectedFloorPieceCode)
                      : null;
                    if (selAllocated && !isPdfPaper) {
                      return (
                        <span className="text-amber-300 font-bold">
                          {`✓ ${selAllocated.code} (${selAllocated.widthIn}"×${selAllocated.lengthIn}") ← ${
                            cadLang === 'ur' ? selAllocated.sourceDescUr : selAllocated.sourceDescEn
                          }`}
                        </span>
                      );
                    }
                    return (
                      <>
                        {`BM: ${totalBmPiecesCount}×(${singleBmPieceWidthIn}"×${singleBmPieceLengthIn}") · `}
                        {topBottomSideCutQty > 0 || leftRightSideCutQty > 0
                          ? `${tr('Side Cuts', 'سائیڈ کٹ')}: ${topBottomSideCutQty + leftRightSideCutQty}`
                          : tr('Side Cuts: 0', 'سائیڈ کٹ: 0')}
                        {effectiveOuterBorderIn > 0
                          ? ` · ${tr('Border', 'بارڈر')}: ${effectiveOuterBorderIn}"`
                          : ''}
                      </>
                    );
                  })()}
                </span>
                <span
                  className={`font-bold tabular-nums shrink-0 ${
                    isPdfPaper ? 'text-emerald-800' : 'text-emerald-300'
                  }`}
                >
                  {tr(
                    `Slabs: ${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}") · Trim: ${effectiveEdgeTrimIn}" · Kerf: ${effectiveBladeKerfIn}"`,
                    `کل سلیبیں: ${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}") · صفائی: ${effectiveEdgeTrimIn}" · کرْف: ${effectiveBladeKerfIn}"`
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1.5 w-full max-w-full overflow-x-hidden" dir={cadLang === 'ur' ? 'rtl' : 'ltr'}>
      {/* =====================================================================
          1. FULL-SCREEN COMPUTER MONITOR MODAL FOR CHAURAS / BOOKMATCH IMAGE
         ===================================================================== */}
      {isChaurasFullScreenModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 p-3 sm:p-6 flex flex-col justify-between overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black">
                🖥️ {tr('FULL MONITOR BOOKMATCH VIEW', 'فل سکرین بک میچ ویو')}
              </span>
              <span className="text-sm font-extrabold text-white">
                {tr(
                  `${roomNameInput} — Full Screen Bookmatch (${roomWidthFt}'×${roomLengthFt}' · ${currentStyleMeta.labelEn})`,
                  `${roomNameInput} — کمرے کا بک میچ فل سکرین نظارہ (${roomWidthFt}'×${roomLengthFt}' · ${currentStyleMeta.labelUr})`
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsChaurasFullScreenModal(false)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>{tr('Return to Normal Screen (ESC)', 'واپس نارمل سکرین پر جائیں (ESC)')}</span>
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            {renderRoomFloorCanvas(true, false)}
          </div>
        </div>
      )}

      {/* =====================================================================
          2. DEDICATED PER-ROOM BOOKMATCH PDF & PRINT SHEET MODAL
          (ہر کمرے کا اپنا مکمل بک میچ پی ڈی ایف اور پرنٹ شیٹ سسٹم)
         ===================================================================== */}
      {isRoomPdfModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/85 p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
          <div className="max-w-6xl mx-auto rounded-2xl border-2 border-slate-950 bg-white text-slate-950 p-4 sm:p-6 space-y-5 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Top Action Bar (Hidden when printing to PDF) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-950 print:hidden">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded border-2 border-slate-950 bg-slate-900 text-white font-mono text-xs font-black">
                  📐 {tr('2D AUTOCAD ROOM PDF SHEET (WHITE PAPER)', 'کمرے کا 2D آٹو کیڈ سفید پی ڈی ایف نقشہ')}
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-950">
                  {tr(
                    `${roomNameInput} — 2D AutoCAD Blueprint (Used Pieces & Waste Pieces Shown Separately)`,
                    `${roomNameInput} — آٹو کیڈ 2D سفید کاغذ نقشہ (یوز پیس الگ اور بچا ہوا ویسٹ پیس الگ)`
                  )}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>{tr('🖨️ Print 2D AutoCAD Sheet', '🖨️ 2D آٹو کیڈ شیٹ پرنٹ نکالیں')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadStandaloneRoomPdfReport}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {tr(
                      '📥 Download 2D AutoCAD Room PDF',
                      '📥 اس کمرے کی 2D آٹو کیڈ پی ڈی ایف فائل ڈاؤن لوڈ کریں'
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRoomPdfModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>{tr('Close', 'بند کریں')}</span>
                </button>
              </div>
            </div>

            {/* Official Printable 2D AutoCAD Title Block Header (Pure White Paper, Crisp Black Borders) */}
            <div className="rounded-lg bg-white border-2 border-slate-950 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono font-black text-sky-900 uppercase">
                  {tr(
                    '📐 2D AUTOCAD ARCHITECTURAL FLOOR & SLAB CUTTING SPECIFICATION (WHITE PAPER MODE)',
                    '📐 2D آٹو کیڈ آرکیٹیکچرل فلور بک میچ اور سلیب کٹنگ نقشہ (سفید کاغذ اسٹائل)'
                  )}
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-950">
                  {roomNameInput} — {clientNameInput}
                </div>
                <div className="text-xs text-slate-800 font-mono font-bold">
                  {tr('Room Dimensions', 'کمرے کا سائز')}: {roomWidthFt}&apos;-{roomWidthExtraIn}&quot; ×{' '}
                  {roomLengthFt}&apos;-{roomLengthExtraIn}&quot; ({totalRoomWidthIn}&quot; × {totalRoomLengthIn}&quot; ·{' '}
                  {totalRoomSqFt.toFixed(1)} Sq.Ft) | {tr('Style', 'اسٹائل')}:{' '}
                  {tr(currentStyleMeta.labelEn, currentStyleMeta.labelUr)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="rounded border-2 border-slate-950 bg-white p-2">
                  <div className="text-[10px] font-bold text-slate-600">
                    {tr('Stock Marble Slab', 'ماربل سلیب')}
                  </div>
                  <div className="font-black text-slate-950">{slabMaterialName}</div>
                  <div className="font-bold text-sky-900">
                    {safeSlabW}&quot; × {safeSlabL}&quot; ({totalBookmatchAndSideSlabsCount}{' '}
                    {tr('Total Slabs', 'کل سلیبیں')})
                  </div>
                </div>
                <div className="rounded border-2 border-slate-950 bg-white p-2">
                  <div className="text-[10px] font-bold text-slate-600">
                    {tr('Used Bookmatch Piece', 'یوز بک میچ پیس سائز')}
                  </div>
                  <div className="font-black text-sky-900">
                    {singleBmPieceWidthIn}&quot; × {singleBmPieceLengthIn}&quot;
                  </div>
                  <div className="font-bold text-slate-800">
                    {totalBmPiecesCount} {tr('Pieces', 'پیس')} ({centerMedallionWidthIn}&quot;×{centerMedallionLengthIn}&quot;)
                  </div>
                </div>
                <div className="rounded border-2 border-slate-950 bg-white p-2">
                  <div className="text-[10px] font-bold text-emerald-800">
                    {tr('Estimated Room Total', 'کمرے کا تخمینی بل')}
                  </div>
                  <div className="font-black text-emerald-900 text-sm">
                    PKR {totalEstimatedRoomCostPKR.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">
                    {tr('Slabs + Side Cuts + Border', 'سلیب + سائیڈ کٹ + بارڈر')}
                  </div>
                </div>
              </div>
            </div>

            {/* ===============================================================
                SECTION 1 & SECTION 2 SIDE-BY-SIDE (100% PURE WHITE 2D AUTOCAD):
                Left: Pure 2D AutoCAD White-Paper Room Floor Vector Drawing
                Right: Each Slab with Separate USED Piece Box vs Separate WASTE Piece Box
               =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT: EXACT 1:1 AUTOCAD ROOM FLOOR DRAWING + COLOR CLEAN VIEW MARBLE PICTURE */}
              <div className="lg:col-span-6 space-y-4">
                <div className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                    <span className="text-xs font-mono font-black text-slate-950 uppercase">
                      {tr(
                        '1. TRUE 1:1 ROOM FLOOR LAYOUT (MATCHES SCREEN 100%)',
                        '1. کمرے کے فرش کا اصل 1:1 آٹو کیڈ ڈایاگرام (سکرین کے عین مطابق)'
                      )}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-sky-900">
                      {`${totalRoomWidthIn}" × ${totalRoomLengthIn}"`}
                    </span>
                  </div>

                  {/* Live 1:1 Floor Canvas Rendered in White Paper Architectural Print Mode */}
                  {renderRoomFloorCanvas(false, true)}
                </div>

                {/* FULL-COLOR CLEAN VIEW IMAGE (Shows Exact Marble Placement, Veins & Borders in Color) */}
                <div
                  className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2 break-inside-avoid"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                    <span className="text-xs font-mono font-black text-slate-950 uppercase">
                      {tr(
                        '🎨 CLEAN VIEW COLOR PREVIEW (MARBLE PLACEMENT)',
                        '🎨 کلین ویو کلر تصویر (کون سا ماربل کیسے لگا ہے)'
                      )}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-800">
                      {tr(currentStyleMeta.labelEn, currentStyleMeta.labelUr)}
                    </span>
                  </div>

                  {renderRoomFloorCanvas(false, true, true)}

                  {/* Color Marble Stone Legend so viewer sees which marble is used where */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-slate-200 text-[10px] font-mono text-slate-900">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-900 bg-slate-50">
                      <img
                        src={slabImageUrl}
                        alt={slabMaterialName}
                        className="w-3.5 h-3.5 rounded-xs object-cover border border-slate-500"
                      />
                      <strong>{tr('Center + Cuts', 'سینٹر + سائیڈ کٹ')}:</strong> {slabMaterialName}
                    </span>
                    {effectiveOuterBorderIn > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-900 bg-emerald-50">
                        <img
                          src={effectiveOuterBorderTextureUrl}
                          alt={
                            borderSlabSource === 'from_custom_border_stock_slab'
                              ? borderSlabMaterialName
                              : slabMaterialName
                          }
                          className="w-3.5 h-3.5 rounded-xs object-cover border border-emerald-700"
                        />
                        <strong>
                          {tr('Border', 'بارڈر')} ({effectiveOuterBorderIn}&quot;):
                        </strong>{' '}
                        {borderSlabSource === 'from_custom_border_stock_slab'
                          ? borderSlabMaterialName
                          : slabMaterialName}
                      </span>
                    )}
                    {effectiveContrastPattiIn > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-900 bg-amber-50">
                        {pattiCustomSlabImageUrl ? (
                          <img
                            src={pattiCustomSlabImageUrl}
                            alt={pattiSlabMaterialName}
                            className="w-3.5 h-3.5 rounded-xs object-cover border border-amber-800"
                          />
                        ) : (
                          <span
                            className="w-3.5 h-3.5 rounded-xs border border-amber-900 inline-block"
                            style={{ backgroundColor: contrastMeta.bgHex }}
                          />
                        )}
                        <strong>
                          {tr('Strip', 'پٹی')} ({effectiveContrastPattiIn}&quot;):
                        </strong>{' '}
                        {pattiCustomSlabImageUrl
                          ? pattiSlabMaterialName
                          : tr(contrastMeta.nameEn, contrastMeta.nameUr)}
                      </span>
                    )}
                    {hasBrassPatti && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-900 bg-yellow-50">
                        <span
                          className="w-3.5 h-3.5 rounded-xs border border-amber-700 inline-block"
                          style={{ background: 'linear-gradient(135deg,#fef08a,#ca8a04)' }}
                        />
                        <strong>
                          {doubleBrassPatti
                            ? tr('Double Brass', 'ڈبل براس پٹی')
                            : tr('Brass Patti', 'براس پٹی')}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: EACH SLAB TRUE 1:1 AUTOCAD CUTTING BLUEPRINT (EDGE TRIM + SAW CUTS + KERF + WASTE) */}
              <div className="lg:col-span-6 border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                  <span className="text-xs font-mono font-black text-slate-950 uppercase">
                    {tr(
                      `2. SLAB CUTTING CAD DIAGRAMS (${totalSameStockSlabsInList} SLABS · TRIM + CUTS + KERF)`,
                      `2. ہر سلیب کا کٹنگ نقشہ (کل ${totalSameStockSlabsInList} سلیبیں · صفائی ٹرمنگ + کٹنگ نشان + کرْف)`
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: totalSameStockSlabsInList }).map((_, idx) => {
                    const slabNum = idx + 1;
                    const pieceLetter = PIECE_LETTERS[idx] || `S${slabNum}`;
                    const m = getSlabPieceMetrics(slabNum);
                    const isBmSlab = m.isUsedInBookmatch;
                    const assignedOnS = piecesAssignedToStockSlab[slabNum] || [];
                    const isMulti = !isBmSlab && assignedOnS.length > 1;
                    const borderPiecesS = allocatedRoomPiecesList.filter(
                      (p) => p.category === 'outer_border' && p.targetSlabNum === slabNum
                    );
                    const isBorderFromBm =
                      isBmSlab && effectiveOuterBorderIn > 0 && borderPiecesS.length > 0;
                    const primaryBorder = borderPiecesS[0];

                    const grossW =
                      slabDirectionInRoom === 'horizontal'
                        ? slabWidthIn || 60
                        : slabLengthIn || 104;
                    const grossL =
                      slabDirectionInRoom === 'horizontal'
                        ? slabLengthIn || 104
                        : slabWidthIn || 60;
                    const trimL = Math.max(0, Number(((grossL - safeSlabL) / 2).toFixed(2)));
                    const trimW = Math.max(0, Number(((grossW - safeSlabW) / 2).toFixed(2)));

                    const horizCuts =
                      (m.topWasteIn >= 0.1 ? 1 : 0) + (m.bottomWasteIn >= 0.1 ? 1 : 0);
                    const vertCuts =
                      (m.leftWasteIn >= 0.1 ? 1 : 0) + (m.rightWasteIn >= 0.1 ? 1 : 0);
                    const cutRunIn = Number(
                      (
                        horizCuts * safeSlabL +
                        vertCuts * m.activePieceWIn +
                        (effectiveEdgeTrimIn > 0 ? (safeSlabW + safeSlabL) * 2 : 0)
                      ).toFixed(1)
                    );

                    const padL = 14;
                    const padT = 13;
                    const vbW = grossL + padL + 5;
                    const vbH = grossW + padT + 5;
                    const sFont = Math.max(2.8, Math.min(4.5, grossW * 0.072));
                    const netX0 = padL + trimL;
                    const netY0 = padT + trimW;

                    const usedW = isBmSlab
                      ? m.activePieceWIn
                      : isMulti
                      ? assignedOnS[0]?.widthIn || m.activePieceWIn
                      : sideCutPieceActualWidthIn;
                    const usedL = isBmSlab
                      ? m.activePieceLIn
                      : isMulti
                      ? assignedOnS[0]?.lengthIn || m.activePieceLIn
                      : m.activePieceLIn;
                    const remW = Math.max(m.topWasteIn, m.bottomWasteIn);

                    return (
                      <div
                        key={slabNum}
                        className="rounded border-2 border-slate-950 bg-white p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-300 pb-1 text-[10px] font-mono font-black text-slate-950">
                          <span>
                            {`SLAB #${slabNum} (${grossW}"×${grossL}")`}
                          </span>
                          <span className="text-rose-700 tabular-nums">
                            {`✂️ ${cutRunIn}" R.In · K:${effectiveBladeKerfIn}"`}
                          </span>
                        </div>

                        {/* True 1:1 Scale SVG Cutting Blueprint with Edge Trim + Saw Cut Lines + Kerf */}
                        <svg
                          viewBox={`0 0 ${vbW} ${vbH}`}
                          className="w-full h-32 bg-white block"
                        >
                          <defs>
                            <pattern
                              id={`modal-waste-hatch-${slabNum}`}
                              width="4"
                              height="4"
                              patternTransform="rotate(45 0 0)"
                              patternUnits="userSpaceOnUse"
                            >
                              <line x1="0" y1="0" x2="0" y2="4" stroke="#d97706" strokeWidth="0.7" />
                            </pattern>
                            <pattern
                              id={`modal-trim-hatch-${slabNum}`}
                              width="3"
                              height="3"
                              patternTransform="rotate(-45 0 0)"
                              patternUnits="userSpaceOnUse"
                            >
                              <line x1="0" y1="0" x2="0" y2="3" stroke="#e11d48" strokeWidth="0.8" />
                            </pattern>
                          </defs>

                          <text
                            x={padL + grossL / 2}
                            y={8.5}
                            textAnchor="middle"
                            fontFamily="monospace"
                            fontSize={sFont * 0.9}
                            fontWeight="900"
                            fill="#0f172a"
                          >
                            {`L:${grossL}" (Trim:${effectiveEdgeTrimIn}" → Net:${safeSlabL}")`}
                          </text>
                          <text
                            x={6.5}
                            y={padT + grossW / 2}
                            textAnchor="middle"
                            fontFamily="monospace"
                            fontSize={sFont * 0.85}
                            fontWeight="900"
                            fill="#0f172a"
                            transform={`rotate(-90 6.5 ${padT + grossW / 2})`}
                          >
                            {`W:${grossW}"`}
                          </text>

                          {effectiveEdgeTrimIn > 0 ? (
                            <>
                              <rect
                                x={padL}
                                y={padT}
                                width={grossL}
                                height={grossW}
                                fill={`url(#modal-trim-hatch-${slabNum})`}
                                stroke="#be123c"
                                strokeWidth="0.9"
                              />
                              <rect
                                x={netX0}
                                y={netY0}
                                width={safeSlabL}
                                height={safeSlabW}
                                fill="#ffffff"
                                stroke="#0369a1"
                                strokeWidth="0.8"
                                strokeDasharray="2.5 1.5"
                              />
                            </>
                          ) : (
                            <rect
                              x={padL}
                              y={padT}
                              width={grossL}
                              height={grossW}
                              fill="#ffffff"
                              stroke="#0f172a"
                              strokeWidth="1.1"
                            />
                          )}

                          {isMulti ? (
                            <>
                              {assignedOnS.map((pc) => (
                                <g key={pc.id}>
                                  <rect
                                    x={netX0 + pc.xIn}
                                    y={netY0 + pc.yIn}
                                    width={pc.lengthIn}
                                    height={pc.widthIn}
                                    fill="#f0f9ff"
                                    stroke="#0f172a"
                                    strokeWidth="1.0"
                                  />
                                  <text
                                    x={netX0 + pc.xIn + pc.lengthIn / 2}
                                    y={netY0 + pc.yIn + pc.widthIn / 2 + 1.2}
                                    textAnchor="middle"
                                    fontFamily="monospace"
                                    fontSize={sFont * 0.9}
                                    fontWeight="900"
                                    fill="#0f172a"
                                  >
                                    {`${pc.code} ${pc.widthIn}"×${pc.lengthIn}"`}
                                  </text>
                                </g>
                              ))}
                              {Array.from(
                                new Set(
                                  assignedOnS
                                    .flatMap((pc) => [pc.yIn, pc.yIn + pc.widthIn])
                                    .filter((y) => y > 0.1 && y < safeSlabW - 0.1)
                                )
                              ).map((cy, cIdx) => (
                                <line
                                  key={`mc-${cIdx}`}
                                  x1={netX0}
                                  y1={netY0 + cy}
                                  x2={netX0 + safeSlabL}
                                  y2={netY0 + cy}
                                  stroke="#e11d48"
                                  strokeWidth="1.1"
                                  strokeDasharray="3 1.5"
                                />
                              ))}
                            </>
                          ) : (m.isUsedInBookmatch || m.isSideCutStockSlab) ? (
                            <>
                              {m.topWasteIn >= 0.1 && (
                                <rect
                                  x={netX0}
                                  y={netY0}
                                  width={safeSlabL}
                                  height={m.topWasteIn}
                                  fill={`url(#modal-waste-hatch-${slabNum})`}
                                  stroke="#b45309"
                                  strokeWidth="0.6"
                                  strokeDasharray="2 1.5"
                                />
                              )}
                              {m.bottomWasteIn >= 0.1 && (
                                <>
                                  <rect
                                    x={netX0}
                                    y={netY0 + m.cutStartYIn + m.activePieceWIn}
                                    width={safeSlabL}
                                    height={m.bottomWasteIn}
                                    fill={`url(#modal-waste-hatch-${slabNum})`}
                                    stroke="#b45309"
                                    strokeWidth="0.6"
                                    strokeDasharray="2 1.5"
                                  />
                                  {isBorderFromBm &&
                                    primaryBorder &&
                                    m.bottomWasteIn >= m.topWasteIn && (
                                      <g>
                                        <rect
                                          x={netX0}
                                          y={netY0 + m.cutStartYIn + m.activePieceWIn}
                                          width={Math.min(safeSlabL, primaryBorder.lengthIn)}
                                          height={Math.min(m.bottomWasteIn, effectiveOuterBorderIn)}
                                          fill="#ecfdf5"
                                          stroke="#047857"
                                          strokeWidth="0.9"
                                        />
                                        <text
                                          x={
                                            netX0 +
                                            Math.min(safeSlabL, primaryBorder.lengthIn) / 2
                                          }
                                          y={
                                            netY0 +
                                            m.cutStartYIn +
                                            m.activePieceWIn +
                                            Math.min(m.bottomWasteIn, effectiveOuterBorderIn) / 2 +
                                            1.2
                                          }
                                          textAnchor="middle"
                                          fontFamily="monospace"
                                          fontSize={sFont * 0.85}
                                          fontWeight="bold"
                                          fill="#065f46"
                                        >
                                          {`${primaryBorder.code} ${effectiveOuterBorderIn}"×${primaryBorder.lengthIn}"`}
                                        </text>
                                      </g>
                                    )}
                                </>
                              )}
                              {m.leftWasteIn >= 0.1 && (
                                <rect
                                  x={netX0}
                                  y={netY0 + m.cutStartYIn}
                                  width={m.leftWasteIn}
                                  height={m.activePieceWIn}
                                  fill={`url(#modal-waste-hatch-${slabNum})`}
                                  stroke="#b45309"
                                  strokeWidth="0.6"
                                />
                              )}
                              {m.rightWasteIn >= 0.1 && (
                                <rect
                                  x={netX0 + m.cutStartXIn + m.activePieceLIn}
                                  y={netY0 + m.cutStartYIn}
                                  width={m.rightWasteIn}
                                  height={m.activePieceWIn}
                                  fill={`url(#modal-waste-hatch-${slabNum})`}
                                  stroke="#b45309"
                                  strokeWidth="0.6"
                                />
                              )}

                              {/* Used Active Piece */}
                              <rect
                                x={netX0 + m.cutStartXIn}
                                y={netY0 + m.cutStartYIn}
                                width={m.activePieceLIn}
                                height={m.activePieceWIn}
                                fill="#f0f9ff"
                                stroke="#0f172a"
                                strokeWidth="1.2"
                              />
                              <rect
                                x={netX0 + m.cutStartXIn + 1.2}
                                y={netY0 + m.cutStartYIn + 1.2}
                                width={Math.max(1, m.activePieceLIn - 2.4)}
                                height={Math.max(1, m.activePieceWIn - 2.4)}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="0.6"
                              />
                              <text
                                x={netX0 + m.cutStartXIn + m.activePieceLIn / 2}
                                y={netY0 + m.cutStartYIn + m.activePieceWIn / 2 + 1.2}
                                textAnchor="middle"
                                fontFamily="monospace"
                                fontSize={sFont}
                                fontWeight="900"
                                fill="#0f172a"
                              >
                                {`${isBmSlab ? pieceLetter : `SC-${slabNum - totalBmPiecesCount}`} · ${m.activePieceWIn}"×${m.activePieceLIn}"`}
                              </text>

                              {/* Crimson Saw Cut Lines + Kerf */}
                              {m.topWasteIn >= 0.1 && (
                                <line
                                  x1={netX0}
                                  y1={netY0 + m.cutStartYIn}
                                  x2={netX0 + safeSlabL}
                                  y2={netY0 + m.cutStartYIn}
                                  stroke="#e11d48"
                                  strokeWidth="1.1"
                                  strokeDasharray="3 1.5"
                                />
                              )}
                              {m.bottomWasteIn >= 0.1 && (
                                <line
                                  x1={netX0}
                                  y1={netY0 + m.cutStartYIn + m.activePieceWIn}
                                  x2={netX0 + safeSlabL}
                                  y2={netY0 + m.cutStartYIn + m.activePieceWIn}
                                  stroke="#e11d48"
                                  strokeWidth="1.1"
                                  strokeDasharray="3 1.5"
                                />
                              )}
                              {m.leftWasteIn >= 0.1 && (
                                <line
                                  x1={netX0 + m.cutStartXIn}
                                  y1={netY0 + m.cutStartYIn}
                                  x2={netX0 + m.cutStartXIn}
                                  y2={netY0 + m.cutStartYIn + m.activePieceWIn}
                                  stroke="#e11d48"
                                  strokeWidth="1.1"
                                  strokeDasharray="3 1.5"
                                />
                              )}
                              {m.rightWasteIn >= 0.1 && (
                                <line
                                  x1={netX0 + m.cutStartXIn + m.activePieceLIn}
                                  y1={netY0 + m.cutStartYIn}
                                  x2={netX0 + m.cutStartXIn + m.activePieceLIn}
                                  y2={netY0 + m.cutStartYIn + m.activePieceWIn}
                                  stroke="#e11d48"
                                  strokeWidth="1.1"
                                  strokeDasharray="3 1.5"
                                />
                              )}
                            </>
                          ) : (
                            borderPiecesS.map((bp, bIdx) => (
                              <g key={bp.id}>
                                <rect
                                  x={netX0}
                                  y={netY0 + bIdx * bp.widthIn}
                                  width={Math.min(safeSlabL, bp.lengthIn)}
                                  height={bp.widthIn}
                                  fill="#ecfdf5"
                                  stroke="#0f172a"
                                  strokeWidth="0.9"
                                />
                                <text
                                  x={netX0 + Math.min(safeSlabL, bp.lengthIn) / 2}
                                  y={netY0 + bIdx * bp.widthIn + bp.widthIn / 2 + 1.2}
                                  textAnchor="middle"
                                  fontFamily="monospace"
                                  fontSize={sFont * 0.85}
                                  fontWeight="bold"
                                  fill="#065f46"
                                >
                                  {`${bp.code} ${bp.widthIn}"×${bp.lengthIn}"`}
                                </text>
                              </g>
                            ))
                          )}
                        </svg>

                        {/* Compact Used vs Waste Strip */}
                        <div className="flex items-center justify-between gap-1 text-[9.5px] font-mono pt-1 border-t border-slate-200">
                          <span className="font-black text-sky-900">
                            {`✓ ${usedW}"×${usedL}" (${((usedW * usedL) / 144).toFixed(1)} ft²)`}
                          </span>
                          <span className="font-bold text-amber-800">
                            {remW > 0
                              ? `♻ ${remW}"×${safeSlabL}"`
                              : tr('0" Waste', '0" ویسٹ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===============================================================
                SECTION 3 & SECTION 4 SIDE-BY-SIDE ON WHITE AUTOCAD PAPER:
                Left: Section 3 — USED CUT PIECES SCHEDULE (کارآمد یوز پیس الگ جدول)
                Right: Section 4 — REMAINING WASTE PIECES SCHEDULE (بچنے والا ویسٹ پیس الگ جدول)
               =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Section 3: Complete Useful Cut Pieces Schedule Table (Pure White CAD Table) */}
              <div className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2">
                <div className="text-xs font-mono font-black text-sky-900 uppercase border-b-2 border-slate-950 pb-1.5">
                  {tr(
                    '✅ 3. USED CUT PIECES SCHEDULE — SHOWN SEPARATELY (کارآمد یوز پیسز کا الگ جدول)',
                    '✅ 3. اس کمرے کے تمام کارآمد (یوز پیسز) کا الگ شیڈول'
                  )}
                </div>
                <div className="overflow-x-auto border border-slate-950 rounded">
                  <table className="w-full text-xs text-left bg-white text-slate-950">
                    <thead className="bg-slate-100 text-slate-950 border-b-2 border-slate-950 font-mono">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Code</th>
                        <th className="p-2 border-r border-slate-300">
                          {tr('Used Piece Description', 'کارآمد یوز پیس کی تفصیل')}
                        </th>
                        <th className="p-2 border-r border-slate-300">
                          {tr('Used Size (W×L)', 'یوز سائز (چوڑائی×لمبائی)')}
                        </th>
                        <th className="p-2 border-r border-slate-300">{tr('Qty', 'تعداد')}</th>
                        <th className="p-2 border-r border-slate-300">
                          {tr('Saw Cut', 'کٹنگ انچ')}
                        </th>
                        <th className="p-2">{tr('Area', 'رقبہ')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {buildRoomCutParts().map((pt, i) => {
                        const sqFt = (((pt.widthIn * pt.lengthIn) / 144) * pt.quantity).toFixed(2);
                        const cutRunIn = Math.round((pt.widthIn + pt.lengthIn) * 2 * pt.quantity);
                        return (
                          <tr key={i}>
                            <td className="p-2 font-mono font-black text-sky-900 border-r border-slate-300">
                              U-{i + 1}
                            </td>
                            <td className="p-2 font-bold text-slate-950 border-r border-slate-300">
                              {pt.label}
                            </td>
                            <td className="p-2 font-mono font-black text-slate-950 border-r border-slate-300">
                              {pt.widthIn}&quot; × {pt.lengthIn}&quot;
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                              {pt.quantity} Pcs
                            </td>
                            <td className="p-2 font-mono font-bold text-rose-800 border-r border-slate-300">
                              {cutRunIn}&quot; R.In
                            </td>
                            <td className="p-2 font-mono font-bold text-emerald-900">{sqFt} ft²</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Complete Remaining / Waste Pieces Schedule (Pure White CAD Table) */}
              <div className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-950 pb-1.5">
                  <div className="text-xs font-mono font-black text-amber-900 uppercase">
                    {tr(
                      '♻️ 4. REMAINING WASTE PIECES — SHOWN SEPARATELY (بچنے والے ویسٹ پیسز کا الگ جدول)',
                      '♻️ 4. سلیب کٹنگ سے بچ جانے والے ویسٹ پیسز کا الگ جدول اور اگلا استعمال'
                    )}
                  </div>
                  {onSaveWasteOffcutsToOptimizer && buildRoomWasteOffcuts().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const wasteList = buildRoomWasteOffcuts();
                        onSaveWasteOffcutsToOptimizer(
                          wasteList.map((w) => ({
                            materialName: `${slabMaterialName} (${roomNameInput} Waste)`,
                            width: w.widthIn,
                            length: w.lengthIn,
                            quantity: w.quantity,
                            ratePerSqFt: Math.round((slabRatePerSqFt || 480) * 0.75),
                            slabImageUrl,
                            notes: `${w.sourceLabelEn} — Next Use: ${w.nextUseEn}`,
                          }))
                        );
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-extrabold flex items-center gap-1 shadow print:hidden cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {tr('💾 Save Waste to Bank', '💾 ویسٹ پیس بینک میں سیو کریں')}
                      </span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-950 rounded">
                  <table className="w-full text-xs text-left bg-white text-slate-950">
                    <thead className="bg-amber-50 text-slate-950 border-b-2 border-slate-950 font-mono">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Code</th>
                        <th className="p-2 border-r border-slate-300">
                          {tr('Source Slabs', 'کن سلیبوں سے بچا ہے')}
                        </th>
                        <th className="p-2 border-r border-slate-300">
                          {tr('Waste Size (W×L)', 'بقیہ ویسٹ سائز')}
                        </th>
                        <th className="p-2 border-r border-slate-300">{tr('Qty', 'تعداد')}</th>
                        <th className="p-2 border-r border-slate-300">{tr('Area', 'رقبہ')}</th>
                        <th className="p-2">{tr('Where to Use Next', 'آگے کہاں استعمال کریں')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {buildRoomWasteOffcuts().length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-3 text-center font-bold text-emerald-800">
                            {tr(
                              '✅ 100% Full Slabs Utilized — Zero Remaining Waste!',
                              '✅ 100% پوری سلیبیں استعمال ہو گئیں — کوئی ویسٹ پیس باقی نہیں!'
                            )}
                          </td>
                        </tr>
                      ) : (
                        buildRoomWasteOffcuts().map((w, idx) => (
                          <tr key={w.id}>
                            <td className="p-2 font-mono font-black text-amber-900 border-r border-slate-300">
                              W-{idx + 1}
                            </td>
                            <td className="p-2 font-bold text-slate-950 border-r border-slate-300">
                              {tr(w.sourceLabelEn, w.sourceLabelUr)}
                            </td>
                            <td className="p-2 font-mono font-black text-amber-950 border-r border-slate-300">
                              {w.widthIn}&quot; × {w.lengthIn}&quot;
                            </td>
                            <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                              {w.quantity} Pcs
                            </td>
                            <td className="p-2 font-mono font-bold text-emerald-900 border-r border-slate-300">
                              {w.totalSqFt} ft²
                            </td>
                            <td className="p-2 font-bold text-slate-900">
                              {tr(w.nextUseEn, w.nextUseUr)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Border Slab & Patti Slab Photo Uploads */}
      <input
        ref={borderSlabFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBorderSlabPhotoUpload}
        className="hidden"
      />
      <input
        ref={pattiSlabFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePattiSlabPhotoUpload}
        className="hidden"
      />
      <input
        ref={houseMapFileInputRef}
        type="file"
        accept=".dwg,.dxf,image/*"
        onChange={handleHouseMapFileUpload}
        className="hidden"
      />

      {/* =====================================================================
          TOP AUTOCAD RIBBON (اوپر پٹی): FLOOR DESIGN TOOLS + STOCK & MANAGEMENT DROPDOWNS
         ===================================================================== */}
      <div
        dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
        className="relative z-40 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 shadow-lg print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* LEFT SECTION: FLOOR DIAGRAM DESIGN TOOLS (MATERIALS + DESIGN + BORDER GROUP + ROOM/.DWG) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 0. UNIFIED MATERIALS & STOCK ALLOCATOR (PER-ZONE STOCK SELECTOR + SHORTAGE ALERT) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'material' ? null : 'material'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  stockShortageAlerts.length > 0
                    ? 'bg-rose-950/90 border-rose-400 text-rose-200 hover:bg-rose-900'
                    : openRibbonMenu === 'material'
                    ? 'bg-amber-500 border-amber-200 text-slate-950'
                    : 'bg-slate-950 border-amber-500/60 text-amber-200 hover:bg-slate-800'
                }`}
              >
                {stockShortageAlerts.length > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Layers className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
                <span>
                  {stockShortageAlerts.length > 0
                    ? tr(
                        `Materials (!${stockShortageAlerts.length} Short)`,
                        `مٹیریل (!${stockShortageAlerts.length} کم)`
                      )
                    : tr('Materials', 'مٹیریل')}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'material' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-[430px] max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-amber-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-amber-300">
                      {tr('Zone-by-Zone Material & Stock Lot Assignment', 'ہر حصے کا مٹیریل اور اسٹاک سیٹنگ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ZONE 1: CENTER BOOKMATCH + SIDE CUTS */}
                  {(() => {
                    const centerDemand = matchedCenterLot
                      ? lotUsageById[matchedCenterLot.id] || stockDemandEntries[0]
                      : stockDemandEntries[0];
                    const isShort = (centerDemand?.shortBy || 0) > 0;
                    return (
                      <div
                        className={`rounded-md border p-2 space-y-1.5 ${
                          isShort
                            ? 'border-rose-500/80 bg-rose-950/30'
                            : 'border-slate-800 bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sky-300">
                            {tr('1. Center Bookmatch + Side Cuts', '1. سینٹر بک میچ اور سائیڈ کٹ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                              isShort
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            }`}
                          >
                            {isShort
                              ? tr(
                                  `Need ${centerDemand.required} / Stock ${centerDemand.available} (-${centerDemand.shortBy} Short!)`,
                                  `درکار ${centerDemand.required} / موجود ${centerDemand.available} (${centerDemand.shortBy} کم!)`
                                )
                              : tr(
                                  `Need ${centerDemand?.required || totalBookmatchAndSideSlabsCount} / Stock ${centerDemand?.available ?? slabQuantity} ✓`,
                                  `درکار ${centerDemand?.required || totalBookmatchAndSideSlabsCount} / موجود ${centerDemand?.available ?? slabQuantity} ✓`
                                )}
                          </span>
                        </div>
                        <div className="grid grid-cols-12 gap-1.5 items-center">
                          <select
                            value={matchedCenterLot?.id || ''}
                            onChange={(e) => {
                              if (e.target.value) handleAssignStockLotToZone('center', e.target.value);
                            }}
                            className="col-span-9 h-7 rounded bg-slate-950 border border-slate-700 text-white text-[11px] font-bold px-1.5 cursor-pointer"
                          >
                            <option value="">
                              {tr(
                                `Active: ${slabMaterialName} (${rawStockSlabW}"×${rawStockSlabL}" · ${slabLotId || 'LOT'})`,
                                `موجودہ: ${slabMaterialName} (${rawStockSlabW}"×${rawStockSlabL}")`
                              )}
                            </option>
                            {savedStockLots.map((st) => (
                              <option key={st.id} value={st.id}>
                                {`${st.materialName} (${st.width}"×${st.length}" · Qty ${st.quantity} · ${st.lotId})`}
                              </option>
                            ))}
                          </select>
                          <div className="col-span-3 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{tr('Qty', 'تعداد')}</span>
                            <Input
                              type="number"
                              min="0"
                              value={matchedCenterLot ? matchedCenterLot.quantity : slabQuantity}
                              onChange={(e) => {
                                const nextQty = Math.max(0, Number(e.target.value) || 0);
                                if (matchedCenterLot && onAdjustSavedStockQty) {
                                  onAdjustSavedStockQty(matchedCenterLot.id, nextQty - matchedCenterLot.quantity);
                                } else {
                                  onUpdateSlabConfig({ quantity: nextQty });
                                }
                              }}
                              className="h-7 bg-slate-950 border-slate-700 text-white font-mono text-xs px-1 text-center"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-300">
                          <span>
                            {`${slabMaterialName} · ${slabLotId || 'ACTIVE'} · ${rawStockSlabW}"×${rawStockSlabL}"`}
                          </span>
                          <span className="text-amber-300">
                            {`Rs ${slabRatePerSqFt}/sq.ft`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ZONE 2: OUTER BORDER */}
                  {(() => {
                    const borderDemand =
                      borderSlabSource === 'from_custom_border_stock_slab'
                        ? matchedBorderLot
                          ? lotUsageById[matchedBorderLot.id]
                          : stockDemandEntries.find((d) => d.key.startsWith('border:'))
                        : matchedCenterLot
                        ? lotUsageById[matchedCenterLot.id] || stockDemandEntries[0]
                        : stockDemandEntries[0];
                    const isBorderShort =
                      hasOuterBorder &&
                      designMode !== 'full_room_bookmatch' &&
                      (borderDemand?.shortBy || 0) > 0;
                    const borderSelectVal =
                      borderSlabSource === 'from_bm_slabs_leftover'
                        ? 'same_leftover'
                        : borderSlabSource === 'from_separate_same_stock_slabs'
                        ? 'same_extra_slabs'
                        : matchedBorderLot?.id || 'custom_active';
                    return (
                      <div
                        className={`rounded-md border p-2 space-y-1.5 ${
                          isBorderShort
                            ? 'border-rose-500/80 bg-rose-950/30'
                            : 'border-slate-800 bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-emerald-300">
                            {tr(
                              `2. Outer Border (${effectiveOuterBorderIn > 0 ? `${effectiveOuterBorderIn}"` : 'OFF'})`,
                              `2. آؤٹر بارڈر (${effectiveOuterBorderIn > 0 ? `${effectiveOuterBorderIn}"` : 'بند'})`
                            )}
                          </span>
                          {hasOuterBorder && designMode !== 'full_room_bookmatch' && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                                isBorderShort
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                              }`}
                            >
                              {borderSlabSource === 'from_bm_slabs_leftover' && overflowBorderPiecesCount === 0
                                ? tr('From BM Leftover ✓', 'بک میچ بقیہ سے ✓')
                                : isBorderShort && borderDemand
                                ? tr(
                                    `Need ${borderDemand.required} / Stock ${borderDemand.available} (-${borderDemand.shortBy})`,
                                    `درکار ${borderDemand.required} / موجود ${borderDemand.available} (${borderDemand.shortBy} کم)`
                                  )
                                : tr(
                                    `Need ${borderDemand?.required ?? extraBorderSlabsNeeded} / Stock ${borderDemand?.available ?? borderSlabQty} ✓`,
                                    `درکار ${borderDemand?.required ?? extraBorderSlabsNeeded} / موجود ${borderDemand?.available ?? borderSlabQty} ✓`
                                  )}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-12 gap-1.5 items-center">
                          <select
                            value={borderSelectVal}
                            onChange={(e) => {
                              if (e.target.value !== 'custom_active') {
                                handleAssignStockLotToZone('border', e.target.value);
                              }
                            }}
                            className="col-span-9 h-7 rounded bg-slate-950 border border-slate-700 text-emerald-200 text-[11px] font-bold px-1.5 cursor-pointer"
                          >
                            <option value="same_leftover">
                              {tr('Same Material — BM Leftover First', 'اسی مٹیریل کے بک میچ بقیہ سے')}
                            </option>
                            <option value="same_extra_slabs">
                              {tr('Same Material — Extra Full Slabs', 'اسی مٹیریل کی اضافی سلیبیں')}
                            </option>
                            {!matchedBorderLot && borderSlabSource === 'from_custom_border_stock_slab' && (
                              <option value="custom_active">
                                {`${borderSlabMaterialName} (${borderSlabWidthIn}"×${borderSlabLengthIn}")`}
                              </option>
                            )}
                            {savedStockLots.map((st) => (
                              <option key={st.id} value={st.id}>
                                {`${st.materialName} (${st.width}"×${st.length}" · Qty ${st.quantity} · ${st.lotId})`}
                              </option>
                            ))}
                          </select>
                          <div className="col-span-3 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{tr('Qty', 'تعداد')}</span>
                            <Input
                              type="number"
                              min="0"
                              disabled={borderSlabSource !== 'from_custom_border_stock_slab'}
                              value={matchedBorderLot ? matchedBorderLot.quantity : borderSlabQty}
                              onChange={(e) => {
                                const nextQty = Math.max(0, Number(e.target.value) || 0);
                                setBorderSlabQty(nextQty);
                                if (matchedBorderLot && onAdjustSavedStockQty) {
                                  onAdjustSavedStockQty(matchedBorderLot.id, nextQty - matchedBorderLot.quantity);
                                }
                              }}
                              className="h-7 bg-slate-950 border-slate-700 text-white font-mono text-xs px-1 text-center disabled:opacity-50"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-300">
                          <span>
                            {borderSlabSource === 'from_custom_border_stock_slab'
                              ? `${matchedBorderLot?.materialName || borderSlabMaterialName} · ${matchedBorderLot?.lotId || 'BORDER'} · ${borderSlabWidthIn}"×${borderSlabLengthIn}"`
                              : `${slabMaterialName} (${tr('Same Lot', 'سیم مٹیریل')}) · ${overflowBorderPiecesCount === 0 && borderSlabSource === 'from_bm_slabs_leftover' ? tr('Fits in Leftovers', 'بقیہ میں پورا') : `+${extraBorderSlabsNeeded} ${tr('Slabs', 'سلیب')}`}`}
                          </span>
                          <span className="text-emerald-300">
                            {`Rs ${borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabRate : slabRatePerSqFt}/sq.ft`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ZONE 3: INNER CONTRAST STRIP (PATTI) */}
                  {(() => {
                    const pattiDemand = matchedPattiLot
                      ? lotUsageById[matchedPattiLot.id]
                      : stockDemandEntries.find((d) => d.key.startsWith('patti:'));
                    const isPattiShort =
                      hasContrastPatti &&
                      designMode === 'center_bm_brass_patti_border' &&
                      (pattiDemand?.shortBy || 0) > 0;
                    const pattiSelectVal =
                      matchedPattiLot && matchedCenterLot && matchedPattiLot.id === matchedCenterLot.id
                        ? 'same_center'
                        : matchedPattiLot?.id || 'custom_patti';
                    return (
                      <div
                        className={`rounded-md border p-2 space-y-1.5 ${
                          isPattiShort
                            ? 'border-rose-500/80 bg-rose-950/30'
                            : 'border-slate-800 bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-amber-300">
                            {tr(
                              `3. Contrast Strip (${effectiveContrastPattiIn > 0 ? `${effectiveContrastPattiIn}"` : 'OFF'})`,
                              `3. کنٹراسٹ پٹی (${effectiveContrastPattiIn > 0 ? `${effectiveContrastPattiIn}"` : 'بند'})`
                            )}
                          </span>
                          {hasContrastPatti && designMode === 'center_bm_brass_patti_border' && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                                isPattiShort
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                              }`}
                            >
                              {isPattiShort && pattiDemand
                                ? tr(
                                    `Need ${pattiDemand.required} / Stock ${pattiDemand.available} (-${pattiDemand.shortBy})`,
                                    `درکار ${pattiDemand.required} / موجود ${pattiDemand.available} (${pattiDemand.shortBy} کم)`
                                  )
                                : tr(
                                    `Need ${pattiDemand?.required ?? pattiSlabsNeeded} / Stock ${pattiDemand?.available ?? pattiSlabQty} ✓`,
                                    `درکار ${pattiDemand?.required ?? pattiSlabsNeeded} / موجود ${pattiDemand?.available ?? pattiSlabQty} ✓`
                                  )}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-12 gap-1.5 items-center">
                          <select
                            value={pattiSelectVal}
                            onChange={(e) => {
                              if (e.target.value !== 'custom_patti') {
                                handleAssignStockLotToZone('patti', e.target.value);
                              }
                            }}
                            className="col-span-9 h-7 rounded bg-slate-950 border border-slate-700 text-amber-200 text-[11px] font-bold px-1.5 cursor-pointer"
                          >
                            {!matchedPattiLot && (
                              <option value="custom_patti">
                                {`${pattiSlabMaterialName} (${pattiSlabWidthIn}"×${pattiSlabLengthIn}")`}
                              </option>
                            )}
                            <option value="same_center">
                              {tr('Same as Center Material', 'سینٹر والے مٹیریل سے')}
                            </option>
                            {savedStockLots.map((st) => (
                              <option key={st.id} value={st.id}>
                                {`${st.materialName} (${st.width}"×${st.length}" · Qty ${st.quantity} · ${st.lotId})`}
                              </option>
                            ))}
                          </select>
                          <div className="col-span-3 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{tr('Qty', 'تعداد')}</span>
                            <Input
                              type="number"
                              min="0"
                              value={matchedPattiLot ? matchedPattiLot.quantity : pattiSlabQty}
                              onChange={(e) => {
                                const nextQty = Math.max(0, Number(e.target.value) || 0);
                                setPattiSlabQty(nextQty);
                                if (matchedPattiLot && onAdjustSavedStockQty) {
                                  onAdjustSavedStockQty(matchedPattiLot.id, nextQty - matchedPattiLot.quantity);
                                }
                              }}
                              className="h-7 bg-slate-950 border-slate-700 text-white font-mono text-xs px-1 text-center"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-slate-300">
                          <span>
                            {`${matchedPattiLot?.materialName || pattiSlabMaterialName} · ${matchedPattiLot?.lotId || 'STRIP'} · ${pattiSlabWidthIn}"×${pattiSlabLengthIn}"`}
                          </span>
                          <span className="text-amber-300">
                            {`Rs ${pattiSlabRate}/sq.ft`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ZONE 4: BRASS PATTI SUMMARY */}
                  <div className="rounded-md border border-yellow-500/40 bg-slate-900/90 p-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-yellow-300">
                        {tr('4. Brass Patti (0.25")', '4. براس پٹی (0.25")')}
                      </div>
                      <div className="text-[10px] font-mono text-slate-300">
                        {hasBrassPatti && designMode !== 'full_room_bookmatch'
                          ? `${doubleBrassPatti ? tr('Double Loop', 'ڈبل لائن') : tr('Single Loop', 'سنگل لائن')} · ${brassTotalRft} R.Ft`
                          : tr('OFF', 'بند')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hasBrassPatti;
                          setHasBrassPatti(next);
                          if (next && designMode === 'full_room_bookmatch') {
                            setDesignMode('center_bm_with_border');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          hasBrassPatti && designMode !== 'full_room_bookmatch'
                            ? 'bg-yellow-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {hasBrassPatti && designMode !== 'full_room_bookmatch' ? tr('ON', 'آن') : tr('OFF', 'آف')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoubleBrassPatti((v) => !v)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-yellow-300 text-[11px] font-bold cursor-pointer"
                      >
                        {doubleBrassPatti ? tr('2×', 'ڈبل') : tr('1×', 'سنگل')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 1. FLOOR DESIGN & BOOKMATCH STYLE BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'design' ? null : 'design'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  openRibbonMenu === 'design'
                    ? 'bg-sky-600 border-sky-300 text-white'
                    : 'bg-slate-950 border-sky-500/60 text-sky-200 hover:bg-slate-800'
                }`}
              >
                <div className="w-5 h-5 rounded-[2px] border border-sky-400 grid grid-cols-2 grid-rows-2 p-[1px] gap-[1px] bg-slate-900 shrink-0">
                  <div className="bg-sky-400/70 rounded-tl-[1px]" />
                  <div className="bg-sky-300/70 rounded-tr-[1px]" />
                  <div className="bg-amber-300/70 rounded-bl-[1px]" />
                  <div className="bg-amber-400/70 rounded-br-[1px]" />
                </div>
                <span>
                  {tr(
                    `Design (${currentStyleMeta.num}/6 · ${totalBmPiecesCount}P)`,
                    `ڈیزائن (${currentStyleMeta.num}/6 · ${totalBmPiecesCount}پیس)`
                  )}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'design' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-sky-500/70 bg-slate-950 p-3 shadow-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-sky-300">
                      {tr('Floor Design, Bookmatch Style & Grid', 'فلور ڈیزائن، بک میچ سٹائل اور پیس')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectDesignMode('full_room_bookmatch')}
                      className={`p-1.5 rounded border text-center space-y-1 cursor-pointer ${
                        designMode === 'full_room_bookmatch'
                          ? 'bg-sky-600/30 border-sky-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="mx-auto w-6 h-5 border border-sky-400 grid grid-cols-2 grid-rows-2 gap-[1px] p-[1px]">
                        <div className="bg-sky-400/60" />
                        <div className="bg-sky-400/60" />
                        <div className="bg-sky-400/60" />
                        <div className="bg-sky-400/60" />
                      </div>
                      <div className="text-[10.5px] font-bold">{tr('Full BM', 'پورا بک میچ')}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDesignMode('center_bm_with_border')}
                      className={`p-1.5 rounded border text-center space-y-1 cursor-pointer ${
                        designMode === 'center_bm_with_border'
                          ? 'bg-emerald-600/30 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="mx-auto w-6 h-5 border-[3px] border-emerald-400 p-[2px]">
                        <div className="w-full h-full bg-sky-400/70" />
                      </div>
                      <div className="text-[10.5px] font-bold">{tr('BM+Border', 'چارس+بارڈر')}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDesignMode('center_bm_brass_patti_border')}
                      className={`p-1.5 rounded border text-center space-y-1 cursor-pointer ${
                        designMode === 'center_bm_brass_patti_border'
                          ? 'bg-amber-500/30 border-amber-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="mx-auto w-6 h-5 border-[2px] border-emerald-400 p-[1px]">
                        <div className="w-full h-full border-[1.5px] border-amber-400 bg-sky-400/70" />
                      </div>
                      <div className="text-[10.5px] font-bold">{tr('Full Design', 'مکمل پٹی سمیت')}</div>
                    </button>
                  </div>

                  <div>
                    <Label className="text-[10px] text-slate-400 block mb-1">
                      {tr('Bookmatch Vein Pattern (1–6):', 'بک میچ ڈیزائن (1 تا 6):')}
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {BOOKMATCH_STYLE_META.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectSpecificBookmatchStyle(st.id)}
                          className={`px-2 py-1 rounded border text-[10.5px] font-bold cursor-pointer truncate ${
                            veinPattern === st.id
                              ? 'bg-amber-500 border-white text-slate-950'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {cadLang === 'ur' ? st.shortUr : st.shortEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 rounded border border-slate-800 bg-slate-900/90 p-1">
                    <button
                      type="button"
                      onClick={() => handleSetAutoManualMode('auto')}
                      className={`py-1 px-2 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        isAutoSlabGridMode && !isManualSlabGrabMode
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {tr('⚡ Automatic (4-Slab BM)', '⚡ آٹومیٹک (4 سلیب بک میچ)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAutoManualMode('manual')}
                      className={`py-1 px-2 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        !isAutoSlabGridMode || isManualSlabGrabMode
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {tr('✋ Manual (Custom Set)', '✋ مینول (اپنی سیٹنگ)')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-400 block mb-0.5">
                        {tr('Pieces Grid', 'پیس کی تعداد')}
                      </Label>
                      <select
                        value={isAutoSlabGridMode ? 'auto' : `${bmRows}x${bmCols}`}
                        onChange={(e) => {
                          if (e.target.value === 'auto') {
                            handleSetAutoManualMode('auto');
                            return;
                          }
                          setIsAutoSlabGridMode(false);
                          setIsManualSlabGrabMode(true);
                          const [rStr, cStr] = e.target.value.split('x');
                          const r = Math.max(1, Number(rStr) || 2);
                          const c = Math.max(1, Number(cStr) || 2);
                          setCustomGridRows(r);
                          setCustomGridCols(c);
                          setCenterPiecesGrid(
                            r === 1 && c === 2 ? '2_pieces' : r === 2 && c === 2 ? '4_pieces' : '6_pieces'
                          );
                        }}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1.5 cursor-pointer"
                      >
                        <option value="auto">{tr('Auto (4-Slab Center BM)', 'آٹو (4 سلیب بک میچ)')}</option>
                        <option value="1x2">{tr('2 Pcs (1×2)', '2 پیس (1×2)')}</option>
                        <option value="2x2">{tr('4 Pcs (2×2)', '4 پیس (2×2)')}</option>
                        <option value="2x3">{tr('6 Pcs (2×3)', '6 پیس (2×3)')}</option>
                        <option value="2x4">{tr('8 Pcs (2×4)', '8 پیس (2×4)')}</option>
                        <option value="3x3">{tr('9 Pcs (3×3)', '9 پیس (3×3)')}</option>
                        <option value="3x4">{tr('12 Pcs (3×4)', '12 پیس (3×4)')}</option>
                        <option value="4x4">{tr('16 Pcs (4×4)', '16 پیس (4×4)')}</option>
                        <option value="4x5">{tr('20 Pcs (4×5)', '20 پیس (4×5)')}</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-slate-400 block mb-0.5">
                        {tr('Layout Logic', 'سلیب سیٹنگ')}
                      </Label>
                      <select
                        value={slabPlacementMode}
                        onChange={(e) => {
                          const nextMode = e.target.value as
                            | 'center_both_sides_cut'
                            | 'one_side_full_opposite_cut'
                            | 'equal_all_pieces';
                          setSlabPlacementMode(nextMode);
                          handleSetAutoManualMode('auto');
                          if (nextMode === 'center_both_sides_cut') {
                            setCustomGridRows(2);
                            setCustomGridCols(2);
                            setCenterPiecesGrid('4_pieces');
                          } else if (nextMode === 'one_side_full_opposite_cut') {
                            setCustomGridRows(autoFullSlabRowsFit);
                            setCustomGridCols(autoFullSlabColsFit);
                          } else if (nextMode === 'equal_all_pieces') {
                            setCustomGridRows(Math.max(autoFullSlabRowsFit, minEqualRowsForStock));
                            setCustomGridCols(Math.max(autoFullSlabColsFit, minEqualColsForStock));
                          }
                        }}
                        className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-white text-xs font-bold px-1.5 cursor-pointer"
                      >
                        <option value="center_both_sides_cut">
                          {tr('Center BM + Side Cut', 'سینٹر بک میچ + سائیڈ کٹ')}
                        </option>
                        <option value="one_side_full_opposite_cut">
                          {tr('One-Side Full ➔ Cut', 'ایک طرف ثابت ➔ دوسری کٹ')}
                        </option>
                        <option value="equal_all_pieces">
                          {tr('Equal All Pieces', 'برابر سائز پیس (ایکول)')}
                        </option>
                      </select>
                    </div>
                  </div>

                  {slabPlacementMode === 'one_side_full_opposite_cut' && (
                    <select
                      value={fullSlabStartCorner}
                      onChange={(e) =>
                        setFullSlabStartCorner(
                          e.target.value as 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
                        )
                      }
                      className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-sky-200 font-bold text-xs px-2 cursor-pointer"
                    >
                      <option value="top_left">{tr('↖ Start Top-Left Full', '↖ اوپر بائیں ثابت')}</option>
                      <option value="top_right">{tr('↗ Start Top-Right Full', '↗ اوپر دائیں ثابت')}</option>
                      <option value="bottom_left">{tr('↙ Start Bottom-Left Full', '↙ نیچے بائیں ثابت')}</option>
                      <option value="bottom_right">{tr('↘ Start Bottom-Right Full', '↘ نیچے دائیں ثابت')}</option>
                    </select>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setSlabDirectionInRoom((d) =>
                          d === 'horizontal' ? 'vertical' : 'horizontal'
                        )
                      }
                      className="flex-1 py-1.5 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono text-[11px] font-bold cursor-pointer"
                    >
                      {slabDirectionInRoom === 'horizontal'
                        ? tr(`↔ Horiz (${rawStockSlabW}"×${rawStockSlabL}")`, `↔ سیدھا (${rawStockSlabW}"×${rawStockSlabL}")`)
                        : tr(`↕ Vert (${rawStockSlabL}"×${rawStockSlabW}")`, `↕ کھڑا (${rawStockSlabL}"×${rawStockSlabW}")`)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChaurasPurePreview(true);
                        setIsChaurasFullScreenModal(true);
                        setOpenRibbonMenu(null);
                      }}
                      className="py-1.5 px-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      {tr('Chauras Preview', 'چارس ویو')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. BORDER TOOLS TRIO (Outer Border + Brass Patti + Contrast Strip) */}
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-700/90 bg-slate-950/90 p-0.5">
              {/* 2A. OUTER BORDER */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenRibbonMenu((m) => (m === 'border' ? null : 'border'))
                  }
                  className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    openRibbonMenu === 'border'
                      ? 'bg-emerald-600 border-emerald-300 text-white'
                      : hasOuterBorder && designMode !== 'full_room_bookmatch'
                      ? 'bg-slate-900 border-emerald-500/70 text-emerald-300 hover:bg-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-4 h-4 rounded-[2px] border-[2.5px] border-emerald-400 bg-slate-950 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 bg-slate-700" />
                  </div>
                  <span>
                    {hasOuterBorder && designMode !== 'full_room_bookmatch'
                      ? tr(`Border ${effectiveOuterBorderIn}"`, `بارڈر ${effectiveOuterBorderIn}"`)
                      : tr('Border', 'بارڈر')}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-80" />
                </button>

                {openRibbonMenu === 'border' && (
                  <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-emerald-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-black text-emerald-300">
                        {tr('Outer Room Border Settings', 'آؤٹر بارڈر سیٹنگز')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !hasOuterBorder;
                            setHasOuterBorder(next);
                            if (next && designMode === 'full_room_bookmatch') {
                              setDesignMode('center_bm_with_border');
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                            hasOuterBorder && designMode !== 'full_room_bookmatch'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {hasOuterBorder && designMode !== 'full_room_bookmatch'
                            ? tr('ON', 'آن')
                            : tr('OFF', 'آف')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenRibbonMenu(null)}
                          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-300 block mb-0.5">
                          {tr('Border Width', 'بارڈر چوڑائی')}
                        </Label>
                        <select
                          value={outerBorderWidthIn}
                          onChange={(e) => {
                            setHasOuterBorder(true);
                            if (designMode === 'full_room_bookmatch') {
                              setDesignMode('center_bm_with_border');
                            }
                            setOuterBorderWidthIn(Number(e.target.value) || 15);
                          }}
                          className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1.5 cursor-pointer"
                        >
                          {[6, 9, 12, 15, 18, 24].map((bw) => (
                            <option key={bw} value={bw}>{`${bw}"`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-300 block mb-0.5">
                          {tr('Cut Source', 'کہاں سے کٹے گا')}
                        </Label>
                        <select
                          value={borderSlabSource}
                          onChange={(e) =>
                            setBorderSlabSource(e.target.value as BorderSlabSourceMode)
                          }
                          className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-bold px-1.5 cursor-pointer"
                        >
                          <option value="from_bm_slabs_leftover">
                            {tr('BM Leftover (Auto)', 'بک میچ بقیہ سے')}
                          </option>
                          <option value="from_separate_same_stock_slabs">
                            {tr('Same Stock Slab', 'الگ اسٹاک سلیب')}
                          </option>
                          <option value="from_custom_border_stock_slab">
                            {tr('Custom Border Slab', 'کسٹم بارڈر سلیب')}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold text-emerald-300">
                          {tr('Saved Stock Lot & Qty', 'اسٹاک لاٹ اور تعداد')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">
                          {tr(
                            `Need: ${borderSlabSource === 'from_bm_slabs_leftover' && overflowBorderPiecesCount === 0 ? 'Leftover' : extraBorderSlabsNeeded}`,
                            `درکار: ${borderSlabSource === 'from_bm_slabs_leftover' && overflowBorderPiecesCount === 0 ? 'بقیہ' : extraBorderSlabsNeeded}`
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-1.5">
                        <select
                          value={
                            borderSlabSource === 'from_bm_slabs_leftover'
                              ? 'same_leftover'
                              : borderSlabSource === 'from_separate_same_stock_slabs'
                              ? 'same_extra_slabs'
                              : matchedBorderLot?.id || 'custom_active'
                          }
                          onChange={(e) => {
                            if (e.target.value !== 'custom_active') {
                              handleAssignStockLotToZone('border', e.target.value);
                            }
                          }}
                          className="col-span-9 h-7 rounded bg-slate-900 border border-slate-700 text-emerald-200 text-[11px] font-bold px-1.5 cursor-pointer"
                        >
                          <option value="same_leftover">{tr('Same Material (BM Leftover)', 'اسی کا بقیہ')}</option>
                          <option value="same_extra_slabs">{tr('Same Material (Extra Slabs)', 'اسی کی اضافی سلیب')}</option>
                          {!matchedBorderLot && borderSlabSource === 'from_custom_border_stock_slab' && (
                            <option value="custom_active">{borderSlabMaterialName}</option>
                          )}
                          {savedStockLots.map((st) => (
                            <option key={st.id} value={st.id}>
                              {`${st.materialName} (${st.width}"×${st.length}" · Qty ${st.quantity})`}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          disabled={borderSlabSource !== 'from_custom_border_stock_slab'}
                          value={matchedBorderLot ? matchedBorderLot.quantity : borderSlabQty}
                          onChange={(e) => {
                            const nextQty = Math.max(0, Number(e.target.value) || 0);
                            setBorderSlabQty(nextQty);
                            if (matchedBorderLot && onAdjustSavedStockQty) {
                              onAdjustSavedStockQty(matchedBorderLot.id, nextQty - matchedBorderLot.quantity);
                            }
                          }}
                          title={tr('Border Stock Qty', 'تعداد')}
                          className="col-span-3 h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs text-center disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10.5px] font-bold text-slate-300">
                          {tr('Custom Border Slab Size & Photo', 'بارڈر سلیب سائز اور فوٹو')}
                        </span>
                        <button
                          type="button"
                          onClick={() => borderSlabFileInputRef.current?.click()}
                          className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{tr('Photo', 'فوٹو')}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Input
                          type="text"
                          value={borderSlabMaterialName}
                          onChange={(e) => setBorderSlabMaterialName(e.target.value)}
                          placeholder={tr('Name', 'نام')}
                          className="h-7 col-span-3 bg-slate-900 border-slate-700 text-white text-xs"
                        />
                        <Input
                          type="number"
                          value={borderSlabWidthIn}
                          onChange={(e) =>
                            setBorderSlabWidthIn(Math.max(18, Number(e.target.value) || 58))
                          }
                          title={tr('Width (In)', 'چوڑائی')}
                          className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                        />
                        <Input
                          type="number"
                          value={borderSlabLengthIn}
                          onChange={(e) =>
                            setBorderSlabLengthIn(Math.max(36, Number(e.target.value) || 106))
                          }
                          title={tr('Length (In)', 'لمبائی')}
                          className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBorderSlabSource('from_custom_border_stock_slab');
                            setIsBorderCustomUploaded(true);
                            if (onAddBorderSlabToStock) {
                              onAddBorderSlabToStock({
                                materialName: borderSlabMaterialName,
                                width: borderSlabWidthIn,
                                length: borderSlabLengthIn,
                                quantity: borderSlabQty,
                                ratePerSqFt: borderSlabRate,
                                slabImageUrl: borderSlabImageUrl,
                              });
                            }
                            setOpenRibbonMenu(null);
                          }}
                          className="h-7 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          {tr('Save', 'سیو')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2B. BRASS PATTI */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenRibbonMenu((m) => (m === 'brass' ? null : 'brass'))
                  }
                  className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    openRibbonMenu === 'brass'
                      ? 'bg-yellow-500 border-yellow-200 text-slate-950'
                      : hasBrassPatti && designMode !== 'full_room_bookmatch'
                      ? 'bg-slate-900 border-yellow-500/70 text-yellow-300 hover:bg-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-4 h-4 rounded-[2px] border border-slate-600 bg-slate-950 p-[2px] flex items-center justify-center shrink-0">
                    <div className="w-full h-full border-[1.5px] border-yellow-400" />
                  </div>
                  <span>
                    {hasBrassPatti && designMode !== 'full_room_bookmatch'
                      ? tr(`Brass ${brassTotalRft}ft`, `براس ${brassTotalRft}ft`)
                      : tr('Brass', 'براس')}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-80" />
                </button>

                {openRibbonMenu === 'brass' && (
                  <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-64 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-yellow-500/70 bg-slate-950 p-3 shadow-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-black text-yellow-300">
                        {tr('Brass Patti (0.25")', 'براس پٹی تفصیل')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !hasBrassPatti;
                          setHasBrassPatti(next);
                          if (next && designMode === 'full_room_bookmatch') {
                            setDesignMode('center_bm_with_border');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          hasBrassPatti && designMode !== 'full_room_bookmatch'
                            ? 'bg-yellow-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {hasBrassPatti && designMode !== 'full_room_bookmatch'
                          ? tr('ON', 'آن')
                          : tr('OFF', 'آف')}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-300">{tr('Loop Style:', 'پٹی لائن:')}</span>
                      <div className="flex rounded border border-slate-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setDoubleBrassPatti(false)}
                          className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer ${
                            !doubleBrassPatti ? 'bg-yellow-400 text-slate-950' : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          {tr('Single', 'سنگل')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDoubleBrassPatti(true)}
                          className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer ${
                            doubleBrassPatti ? 'bg-yellow-400 text-slate-950' : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          {tr('Double', 'ڈبل')}
                        </button>
                      </div>
                    </div>

                    <div className="rounded bg-slate-900 border border-slate-800 p-2 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between text-yellow-300 font-bold">
                        <span>{tr('Total R.Ft:', 'کل رننگ فٹ:')}</span>
                        <span className="tabular-nums">{brassTotalRft} ft</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>{tr('Inner Frame:', 'اندرونی فریم:')}</span>
                        <span>{innerMedallionPerimRft.toFixed(1)} ft</span>
                      </div>
                      {doubleBrassPatti && effectiveContrastPattiIn > 0 && (
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>{tr('Outer Frame:', 'بیرونی فریم:')}</span>
                          <span>{outerPattiPerimRft.toFixed(1)} ft</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2C. SIMPLE / CONTRAST STRIP */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenRibbonMenu((m) => (m === 'strip' ? null : 'strip'))
                  }
                  className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    openRibbonMenu === 'strip'
                      ? 'bg-amber-500 border-amber-200 text-slate-950'
                      : hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                      ? 'bg-slate-900 border-amber-500/70 text-amber-300 hover:bg-slate-800'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-4 h-4 rounded-[2px] border border-slate-600 bg-slate-950 p-[2px] flex items-center justify-center shrink-0">
                    <div className="w-full h-full border-[2px] border-amber-500 bg-slate-900" />
                  </div>
                  <span>
                    {hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                      ? tr(`Strip ${effectiveContrastPattiIn}"`, `پٹی ${effectiveContrastPattiIn}"`)
                      : tr('Strip', 'پٹی')}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-80" />
                </button>

                {openRibbonMenu === 'strip' && (
                  <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-amber-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-black text-amber-300">
                        {tr('Contrast / Simple Strip Patti', 'سمپل / کنٹراسٹ پٹی سیٹنگ')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !hasContrastPatti;
                            setHasContrastPatti(next);
                            if (next && designMode !== 'center_bm_brass_patti_border') {
                              setDesignMode('center_bm_brass_patti_border');
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                            hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                            ? tr('ON', 'آن')
                            : tr('OFF', 'آف')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenRibbonMenu(null)}
                          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-300 block mb-0.5">
                          {tr('Strip Width', 'پٹی چوڑائی')}
                        </Label>
                        <select
                          value={contrastPattiWidthIn}
                          onChange={(e) => {
                            setHasContrastPatti(true);
                            setDesignMode('center_bm_brass_patti_border');
                            setContrastPattiWidthIn(Number(e.target.value) || 6);
                          }}
                          className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1.5 cursor-pointer"
                        >
                          {[3, 4, 6, 9, 12].map((pw) => (
                            <option key={pw} value={pw}>{`${pw}"`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-300 block mb-0.5">
                          {tr('Strip Marble', 'پٹی ماربل کلر')}
                        </Label>
                        <select
                          value={contrastMarbleType}
                          onChange={(e) => {
                            setContrastMarbleType(e.target.value as ContrastMarbleType);
                            setPattiCustomSlabImageUrl(null);
                            setHasContrastPatti(true);
                            setDesignMode('center_bm_brass_patti_border');
                          }}
                          className="w-full h-7 rounded bg-slate-900 border border-slate-700 text-amber-200 text-xs font-bold px-1.5 cursor-pointer"
                        >
                          {(Object.keys(CONTRAST_MARBLE_META) as ContrastMarbleType[]).map((mKey) => (
                            <option key={mKey} value={mKey}>
                              {cadLang === 'ur'
                                ? CONTRAST_MARBLE_META[mKey].shortUr
                                : CONTRAST_MARBLE_META[mKey].shortEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-bold text-amber-300">
                          {tr('Saved Stock Lot & Qty', 'پٹی کا اسٹاک اور تعداد')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">
                          {tr(
                            `Need ${pattiSlabsNeeded} / Stock ${matchedPattiLot ? matchedPattiLot.quantity : pattiSlabQty}`,
                            `درکار ${pattiSlabsNeeded} / موجود ${matchedPattiLot ? matchedPattiLot.quantity : pattiSlabQty}`
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-12 gap-1.5">
                        <select
                          value={
                            matchedPattiLot && matchedCenterLot && matchedPattiLot.id === matchedCenterLot.id
                              ? 'same_center'
                              : matchedPattiLot?.id || 'custom_patti'
                          }
                          onChange={(e) => {
                            if (e.target.value !== 'custom_patti') {
                              handleAssignStockLotToZone('patti', e.target.value);
                            }
                          }}
                          className="col-span-9 h-7 rounded bg-slate-900 border border-slate-700 text-amber-200 text-[11px] font-bold px-1.5 cursor-pointer"
                        >
                          {!matchedPattiLot && (
                            <option value="custom_patti">{pattiSlabMaterialName}</option>
                          )}
                          <option value="same_center">{tr('Same as Center Material', 'سینٹر والے مٹیریل سے')}</option>
                          {savedStockLots.map((st) => (
                            <option key={st.id} value={st.id}>
                              {`${st.materialName} (${st.width}"×${st.length}" · Qty ${st.quantity})`}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          value={matchedPattiLot ? matchedPattiLot.quantity : pattiSlabQty}
                          onChange={(e) => {
                            const nextQty = Math.max(0, Number(e.target.value) || 0);
                            setPattiSlabQty(nextQty);
                            if (matchedPattiLot && onAdjustSavedStockQty) {
                              onAdjustSavedStockQty(matchedPattiLot.id, nextQty - matchedPattiLot.quantity);
                            }
                          }}
                          title={tr('Strip Stock Qty', 'تعداد')}
                          className="col-span-3 h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs text-center"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10.5px] font-bold text-slate-300">
                          {tr('Strip Slab Size & Photo', 'پٹی سلیب سائز اور فوٹو')}
                        </span>
                        <button
                          type="button"
                          onClick={() => pattiSlabFileInputRef.current?.click()}
                          className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{tr('Photo', 'فوٹو')}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Input
                          type="text"
                          value={pattiSlabMaterialName}
                          onChange={(e) => setTwinPattiSlabName(e.target.value)}
                          className="h-7 col-span-3 bg-slate-900 border-slate-700 text-white text-xs"
                        />
                        <Input
                          type="number"
                          value={pattiSlabWidthIn}
                          onChange={(e) =>
                            setPattiSlabWidthIn(Math.max(12, Number(e.target.value) || 48))
                          }
                          className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                        />
                        <Input
                          type="number"
                          value={pattiSlabLengthIn}
                          onChange={(e) =>
                            setPattiSlabLengthIn(Math.max(24, Number(e.target.value) || 96))
                          }
                          className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (onAddBorderSlabToStock) {
                              onAddBorderSlabToStock({
                                materialName: pattiSlabMaterialName,
                                width: pattiSlabWidthIn,
                                length: pattiSlabLengthIn,
                                quantity: pattiSlabQty,
                                ratePerSqFt: pattiSlabRate,
                                slabImageUrl: pattiCustomSlabImageUrl || slabImageUrl,
                              });
                            }
                            setOpenRibbonMenu(null);
                          }}
                          className="h-7 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          {tr('Save', 'سیو')}
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-300">
                        {`${pattiStripsPerDedicatedSlab} strips/slab · Leftover ${pattiLeftoverOnStripSlabW}"×${pattiSlabLengthIn}"`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ROOM SIZE & MULTI-ROOM MANAGER DROPDOWN (WITH FLOOR PLAN MINI DIAGRAM) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'room' ? null : 'room'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  openRibbonMenu === 'room'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-slate-950 border-slate-700 text-emerald-300 hover:border-emerald-500/60'
                }`}
              >
                <div className="w-4 h-4 rounded-[2px] border border-emerald-400 bg-slate-900 relative shrink-0">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-400/60" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-emerald-400/60" />
                </div>
                <span className="font-mono tabular-nums">
                  {`${roomWidthFt}'×${roomLengthFt}' (${roomsList.length})`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'room' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:left-0 z-50 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-emerald-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-emerald-300">
                      {tr('Room Dimensions & House Rooms', 'کمرے کا سائز اور فہرست')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Input
                      type="text"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      placeholder={tr('Room Name', 'کمرے کا نام')}
                      className="h-7 bg-slate-900 border-slate-700 text-white text-xs font-bold"
                    />
                    <div className="grid grid-cols-4 gap-1.5 font-mono">
                      <div>
                        <Label className="text-[10px] text-amber-300 block">{tr('W (Ft)', 'چوڑائی ft')}</Label>
                        <Input
                          type="number"
                          min="4"
                          max="100"
                          value={roomWidthFt}
                          onChange={(e) => setRoomWidthFt(Math.max(4, Number(e.target.value) || 4))}
                          className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 block">{tr('+ In', '+ انچ')}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="11"
                          value={roomWidthExtraIn}
                          onChange={(e) =>
                            setRoomWidthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
                          }
                          className="h-7 bg-slate-900 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-sky-300 block">{tr('L (Ft)', 'لمبائی ft')}</Label>
                        <Input
                          type="number"
                          min="4"
                          max="100"
                          value={roomLengthFt}
                          onChange={(e) => setRoomLengthFt(Math.max(4, Number(e.target.value) || 4))}
                          className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-400 block">{tr('+ In', '+ انچ')}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="11"
                          value={roomLengthExtraIn}
                          onChange={(e) =>
                            setRoomLengthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
                          }
                          className="h-7 bg-slate-900 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pt-1 border-t border-slate-800">
                    {roomsList.map((rm) => (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => {
                          handleSelectRoomProfile(rm);
                          setOpenRibbonMenu(null);
                        }}
                        className={`w-full px-2 py-1 rounded border text-left flex items-center justify-between text-[11px] font-bold cursor-pointer ${
                          activeRoomId === rm.id
                            ? 'bg-sky-600/30 border-sky-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span className="truncate">{cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}</span>
                        <span className="font-mono text-amber-300 shrink-0 tabular-nums">
                          {`${rm.roomWidthFt}'×${rm.roomLengthFt}'`}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        handleAddNewRoomProfile();
                        setOpenRibbonMenu(null);
                      }}
                      className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>{tr('+ Next Room', '+ اگلا کمرہ')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCenterCanvasTab('dwg_floor_editor');
                        setOpenRibbonMenu(null);
                      }}
                      className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      <span>{tr('.DWG Draw', 'DWG نقشہ')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: STOCK, MATERIAL, PIECE MOVES & CAD EXPORT (SAME MINI-DIAGRAM + DROPDOWN STYLE) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 4. MATERIAL, SLAB SIZE & KERF/SAFAI DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'material' ? null : 'material'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  openRibbonMenu === 'material'
                    ? 'bg-cyan-600 border-cyan-300 text-white'
                    : 'bg-slate-950 border-slate-700 text-cyan-200 hover:border-cyan-500/60'
                }`}
              >
                <div className="w-4 h-4 rounded-[2px] border border-cyan-400 bg-slate-900 flex flex-col justify-center gap-[2px] p-[2px] shrink-0">
                  <div className="h-[2px] w-full bg-cyan-400" />
                  <div className="h-[2px] w-2/3 bg-amber-400" />
                </div>
                <span className="font-mono tabular-nums">
                  {`${slabWidthIn}"×${slabLengthIn}"`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'material' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:right-0 z-50 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-cyan-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-cyan-300">
                      {tr('Slab Size, Material & Blade Settings', 'سلیب سائز، میٹیریل اور صفائی سیٹنگ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onTriggerSlabPhotoUpload}
                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>{tr('Upload Photo', 'سلیب فوٹو')}</span>
                    </button>
                    <select
                      onChange={(e) => {
                        const val = e.target.value as 'statuario' | 'black_gold' | 'onyx';
                        if (val) onSelectPresetSlabTexture(val);
                      }}
                      defaultValue=""
                      className="h-7 rounded bg-slate-900 border border-slate-700 text-white text-[11px] font-bold px-1.5 cursor-pointer"
                    >
                      <option value="" disabled>{tr('Preset Stone', 'ماربل کلر')}</option>
                      <option value="statuario">{tr('White Statuario', 'وائٹ اسٹیچوریو')}</option>
                      <option value="black_gold">{tr('Black & Gold', 'بلیک اینڈ گولڈ')}</option>
                      <option value="onyx">{tr('Green Onyx', 'گرین اونکس')}</option>
                    </select>
                    {onSaveCurrentSlabToStock && (
                      <button
                        type="button"
                        onClick={onSaveCurrentSlabToStock}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        <span>{tr('Save Stock', 'اسٹاک سیو')}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-400 block">{tr('Material', 'میٹیریل')}</Label>
                      <Input
                        type="text"
                        value={slabMaterialName}
                        onChange={(e) => onUpdateSlabConfig({ materialName: e.target.value })}
                        className="h-7 bg-slate-900 border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400 block">{tr('Lot ID', 'لاٹ')}</Label>
                      <Input
                        type="text"
                        value={slabLotId}
                        onChange={(e) => onUpdateSlabConfig({ lotId: e.target.value })}
                        className="h-7 bg-slate-900 border-slate-700 text-amber-300 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-300 block">{tr('W (In)', 'چوڑائی')}</Label>
                      <Input
                        type="number"
                        min="12"
                        value={slabWidthIn}
                        onChange={(e) =>
                          onUpdateSlabConfig({ width: Math.max(12, Number(e.target.value) || 60) })
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-sky-300 block">{tr('L (In)', 'لمبائی')}</Label>
                      <Input
                        type="number"
                        min="24"
                        value={slabLengthIn}
                        onChange={(e) =>
                          onUpdateSlabConfig({ length: Math.max(24, Number(e.target.value) || 104) })
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400 block">{tr('Qty', 'تعداد')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={slabQuantity}
                        onChange={(e) =>
                          onUpdateSlabConfig({ quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-emerald-300 block">{tr('Rate/ft²', 'ریٹ')}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={slabRatePerSqFt}
                        onChange={(e) =>
                          onUpdateSlabConfig({ ratePerSqFt: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-300 block">{tr('Kerf (In)', 'بلیڈ کٹ')}</Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={bladeKerfIn}
                        onChange={(e) =>
                          onUpdateKerfAndEdgeTrim?.(
                            Math.max(0, Number(e.target.value) || 0),
                            edgeTrimIn
                          )
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-300 block">{tr('Safai (In)', 'صفائی')}</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        max="4"
                        value={edgeTrimIn}
                        onChange={(e) =>
                          onUpdateKerfAndEdgeTrim?.(
                            bladeKerfIn,
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-amber-200 font-mono text-xs"
                      />
                    </div>
                  </div>
                  {effectiveEdgeTrimIn > 0 && (
                    <div className="text-[10.5px] font-mono text-emerald-300">
                      {tr(`Usable after Safai: ${rawStockSlabW}"×${rawStockSlabL}"`, `صفائی کے بعد سائز: ${rawStockSlabW}"×${rawStockSlabL}"`)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. STOCK SLABS & PACKING MANAGEMENT DROPDOWN (WITH STACKED SLABS MINI DIAGRAM) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'stock' ? null : 'stock'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  openRibbonMenu === 'stock'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-slate-950 border-emerald-500/60 text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <div className="w-4 h-4 flex flex-col justify-between py-[1px] shrink-0">
                  <div className="h-[3px] w-full rounded-[1px] bg-amber-400" />
                  <div className="h-[3px] w-full rounded-[1px] bg-emerald-400" />
                  <div className="h-[3px] w-full rounded-[1px] bg-sky-400" />
                </div>
                <span>{tr(`Stock (${totalSameStockSlabsInList})`, `اسٹاک (${totalSameStockSlabsInList})`)}</span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'stock' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:right-0 z-50 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-emerald-500/70 bg-slate-950 p-3 shadow-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-emerald-300">
                      {tr('Stock Slabs & Packing Controls', 'اسٹاک سلیبز اور پیکنگ کنٹرول')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle Bottom Strip Display */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRightStockView('active_slabs');
                        setShowSideStockDock(true);
                      }}
                      className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                        rightStockView !== 'saved_stock'
                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {tr(`Room Slabs (${totalSameStockSlabsInList})`, `کمرے کی سلیبیں (${totalSameStockSlabsInList})`)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRightStockView('saved_stock');
                        setShowSideStockDock(true);
                      }}
                      className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                        rightStockView === 'saved_stock'
                          ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {tr(`Saved Lots (${savedStockLots.length})`, `محفوظ اسٹاک (${savedStockLots.length})`)}
                    </button>
                  </div>

                  {/* Side-Cut Packing Setting */}
                  {rawSideCutPieces.length > 0 && (
                    <div className="rounded bg-slate-900 border border-slate-800 p-2 space-y-1">
                      <div className="text-[10.5px] font-bold text-cyan-300 flex items-center justify-between">
                        <span>{tr('Side-Cut Slab Packing', 'سائیڈ کٹ سلیب سیٹنگ')}</span>
                        {sideCutPackingMode === 'pack_multi_per_slab' &&
                          rawSideCutPieces.length > packedSideBins.length && (
                            <span className="text-emerald-300 font-mono">
                              -{rawSideCutPieces.length - packedSideBins.length} {tr('Slabs', 'سلیب')}
                            </span>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setSideCutPackingMode('pack_multi_per_slab')}
                          className={`py-1 rounded text-[10.5px] font-bold cursor-pointer ${
                            sideCutPackingMode === 'pack_multi_per_slab'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-950 text-slate-300'
                          }`}
                        >
                          {tr(`Combined (${packedSideBins.length})`, `اکٹھے (${packedSideBins.length})`)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSideCutPackingMode('separate_slab_per_piece')}
                          className={`py-1 rounded text-[10.5px] font-bold cursor-pointer ${
                            sideCutPackingMode === 'separate_slab_per_piece'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-950 text-slate-300'
                          }`}
                        >
                          {tr(`1 Pc/Slab (${rawSideCutPieces.length})`, `الگ الگ (${rawSideCutPieces.length})`)}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {onBulkUploadSlabPhotos && (
                      <button
                        type="button"
                        onClick={() => {
                          onBulkUploadSlabPhotos();
                          setOpenRibbonMenu(null);
                        }}
                        className="flex-1 py-1.5 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>{tr('Bulk Photos', 'تصاویر اپ لوڈ')}</span>
                      </button>
                    )}
                    {onSaveCurrentSlabToStock && (
                      <button
                        type="button"
                        onClick={() => {
                          onSaveCurrentSlabToStock();
                          setOpenRibbonMenu(null);
                        }}
                        className="flex-1 py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{tr('Save Lot', 'اسٹاک سیو')}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSideStockDock((v) => !v);
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px] cursor-pointer"
                  >
                    {showSideStockDock
                      ? tr('Hide Bottom Stock Strip', 'نیچے والی اسٹاک پٹی چھپائیں')
                      : tr('Show Bottom Stock Strip', 'نیچے والی اسٹاک پٹی دکھائیں')}
                  </button>
                </div>
              )}
            </div>

            {/* 6. PIECES, SLAB ASSIGNMENT & WASTE BANK DROPDOWN (WITH CUT-PIECE MINI DIAGRAM) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'pieces' ? null : 'pieces'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  openRibbonMenu === 'pieces'
                    ? 'bg-sky-600 border-sky-300 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-sky-500/60'
                }`}
              >
                <div className="w-4 h-4 rounded-[2px] border border-amber-400 bg-slate-900 p-[2px] relative shrink-0">
                  <div className="w-2.5 h-2 bg-sky-400/80 border border-white/60" />
                </div>
                <span>
                  {tr(`Pieces (${allocatedRoomPiecesList.length})`, `پیس (${allocatedRoomPiecesList.length})`)}
                </span>
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>

              {openRibbonMenu === 'pieces' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:right-0 z-50 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-sky-500/70 bg-slate-950 p-3 shadow-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-sky-300">
                      {tr('Cut Pieces, Brass & Waste Bank', 'کٹ پیس، براس اور بچت پیس')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenRibbonMenu(null)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {(hasBrassPatti || effectiveContrastPattiIn > 0) && (
                    <div className="rounded bg-slate-900 border border-slate-800 px-2 py-1.5 font-mono text-[11px] flex items-center justify-between gap-2">
                      {hasBrassPatti && (
                        <span className="text-yellow-300 font-bold">
                          {tr(`Brass: ${brassTotalRft} ft`, `براس: ${brassTotalRft} ft`)}
                        </span>
                      )}
                      {effectiveContrastPattiIn > 0 && (
                        <span className="text-amber-300 font-bold">
                          {tr(`Strip: ${contrastPattiSqFt} ft²`, `پٹی: ${contrastPattiSqFt} ft²`)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {allocatedRoomPiecesList.map((pc) => {
                      const maxSelectSlab = Math.max(totalSameStockSlabsInList + 2, 6);
                      return (
                        <div
                          key={pc.id}
                          className="rounded border border-slate-800 bg-slate-900 px-2 py-1 flex items-center justify-between gap-1.5 font-mono text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              style={{ borderColor: pc.colorHex }}
                              className="px-1 rounded bg-slate-950 border text-white font-black text-[10px]"
                            >
                              {pc.code}
                            </span>
                            <span className="text-amber-300 font-bold tabular-nums">
                              {pc.widthIn}&quot;×{pc.lengthIn}&quot;
                            </span>
                            <span className="text-slate-400 text-[10px] truncate font-sans">
                              {cadLang === 'ur' ? pc.labelUr : pc.labelEn}
                            </span>
                          </div>
                          <select
                            value={pieceTargetSlabOverrides[pc.id] ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPieceTargetSlabOverrides((prev) => {
                                const next = { ...prev };
                                if (!val || val <= 0) delete next[pc.id];
                                else next[pc.id] = val;
                                return next;
                              });
                              if (val > 0) scrollToSpecificSlab(val);
                            }}
                            className="h-6 rounded bg-slate-950 border border-slate-700 text-white text-[10px] px-1 cursor-pointer shrink-0"
                          >
                            <option value={0}>
                              {pc.defaultSlabNum > 0 ? `Auto S${pc.defaultSlabNum}` : 'Auto'}
                            </option>
                            {Array.from({ length: maxSelectSlab }).map((_, sIdx) => (
                              <option key={sIdx + 1} value={sIdx + 1}>
                                {`S${sIdx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800">
                    {Object.keys(pieceTargetSlabOverrides).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPieceTargetSlabOverrides({})}
                        className="flex-1 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-200 font-bold text-[11px] cursor-pointer"
                      >
                        {tr('Reset Moves', 'ری سیٹ')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowWasteBankDrawer((v) => !v);
                        setOpenRibbonMenu(null);
                      }}
                      className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                    >
                      {tr(`Waste Bank (${buildRoomWasteOffcuts().length})`, `بچت بینک (${buildRoomWasteOffcuts().length})`)}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 7. CAD / PDF EXPORT DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenRibbonMenu((m) => (m === 'export' ? null : 'export'))
                }
                className={`px-2 py-1 rounded border flex items-center gap-1 text-xs font-bold cursor-pointer whitespace-nowrap ${
                  openRibbonMenu === 'export'
                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                    : 'bg-slate-950 border-amber-500/70 text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{tr('CAD / PDF', 'کیڈ / PDF')}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {openRibbonMenu === 'export' && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:mt-1.5 sm:right-0 z-50 w-auto sm:w-56 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto rounded-lg border border-amber-500/70 bg-slate-950 p-1.5 shadow-2xl space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoomPdfModalOpen(true);
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 text-sky-400" />
                    <span>{tr('Print / Preview PDF', 'پرنٹ / PDF ویو')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadStandaloneRoomPdfReport();
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{tr('Download PDF Sheet', 'ڈاؤن لوڈ PDF شیٹ')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadRoomAutoCadDwg('dxf');
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-amber-300 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{tr('1:1 AutoCAD (.DXF)', '1:1 آٹو کیڈ (.DXF)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadRoomAutoCadDwg('dwg');
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-amber-300 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{tr('1:1 AutoCAD (.DWG)', '1:1 آٹو کیڈ (.DWG)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRoomPartsToCutter(buildRoomCutParts());
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-sky-300 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>{tr('Send to Slab Cutter', 'کٹنگ میں بھیجیں')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyRoomPartsToCutter(buildRoomCutParts());
                      setTimeout(() => onGenerateExcelBill(), 120);
                      setOpenRibbonMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-emerald-300 font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>{tr('Excel Bill (.xls)', 'ایکسل بل (.xls)')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 8. VIEWPORT SWITCHER TABS */}
            <div className="flex items-center rounded border border-slate-700 bg-slate-950 p-0.5 text-[11px] font-bold">
              {(
                [
                  { id: 'dual', en: 'Dual', ur: 'دونوں' },
                  { id: 'floor_only', en: 'Big Floor', ur: 'بڑا فرش' },
                  { id: 'slab_only', en: 'Slab', ur: 'سلیب' },
                  { id: 'dwg_floor_editor', en: '.DWG', ur: 'DWG' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCenterCanvasTab(tab.id)}
                  className={`px-2 py-0.5 rounded cursor-pointer whitespace-nowrap ${
                    centerCanvasTab === tab.id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tr(tab.en, tab.ur)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SLIM STOCK SUFFICIENCY & SHORTAGE ALERT BANNER */}
      <div
        dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
        className={`rounded-lg border px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow print:hidden ${
          stockShortageAlerts.length > 0
            ? 'border-rose-500/80 bg-rose-950/60 text-rose-100'
            : 'border-slate-700/90 bg-slate-900/95 text-slate-200'
        }`}
      >
        {stockShortageAlerts.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-black text-rose-300 whitespace-nowrap">
                {tr('MATERIAL SHORTAGE:', 'اسٹاک پورا نہیں:')}
              </span>
              {stockShortageAlerts.map((al) => (
                <div
                  key={al.key}
                  className="inline-flex items-center gap-1.5 rounded border border-rose-500/60 bg-slate-950/80 px-2 py-0.5 text-[11px]"
                >
                  <span className="font-bold text-white">{al.materialName}</span>
                  <span className="font-mono text-amber-300">({al.lotIdStr})</span>
                  <span className="font-mono text-rose-300 font-bold">
                    {tr(
                      `Needs ${al.required}, Stock ${al.available} (-${al.shortBy} short)`,
                      `${al.required} سلیب درکار، اسٹاک میں ${al.available} (${al.shortBy} کم)`
                    )}
                  </span>
                  {(al.savedId && onAdjustSavedStockQty) || al.key === centerLotKey ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (al.savedId && onAdjustSavedStockQty) {
                          onAdjustSavedStockQty(al.savedId, 1);
                        } else if (al.key === centerLotKey) {
                          onUpdateSlabConfig({ quantity: (Number(slabQuantity) || 0) + 1 });
                        }
                      }}
                      className="px-1.5 py-0.2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold cursor-pointer"
                    >
                      +1
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpenRibbonMenu('material')}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
            >
              {tr('Fix Materials', 'مٹیریل تبدیل کریں')}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5 min-w-0 text-[11px]">
              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {tr('Stock OK', 'اسٹاک پورا ہے')}
              </span>
              {stockDemandEntries.map((entry) => (
                <span
                  key={entry.key}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-950/90 px-2 py-0.5 font-mono"
                >
                  <span className="text-sky-300 font-sans font-bold">{entry.materialName}</span>
                  <span className="text-slate-400">
                    ({cadLang === 'ur' ? entry.zonesUr.join(' + ') : entry.zonesEn.join(' + ')})
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {entry.required}/{entry.available} ✓
                  </span>
                </span>
              ))}
              {hasOuterBorder && designMode !== 'full_room_bookmatch' && borderUsesSameAsCenterLot && livePostBmLeftovers.some((l) => l.fitsOuterBorder) && (
                <button
                  type="button"
                  onClick={() => setRightStockView('leftover_offcuts')}
                  className="inline-flex items-center gap-1 rounded border border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/50 px-2 py-0.5 text-amber-200 font-bold cursor-pointer"
                >
                  {tr(
                    `Leftovers (${livePostBmLeftovers.length})`,
                    `بچے ٹکڑے (${livePostBmLeftovers.length})`
                  )}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenRibbonMenu('material')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] font-bold cursor-pointer whitespace-nowrap"
            >
              {tr('Edit Materials', 'مٹیریل بدلیں')}
            </button>
          </>
        )}
      </div>

      {/* =====================================================================
          FULL-WIDTH CENTER CAD WORKSPACE:
          LARGE FLOOR PLAN DESIGNER (LEFT 8 COLS) + SMALL SELECTED PIECE/SLAB PREVIEW (RIGHT 4 COLS)
         ===================================================================== */}
      <div className="w-full" dir={cadLang === 'ur' ? 'rtl' : 'ltr'}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* INTEGRATED INTERACTIVE .DWG / 2D HOUSE PLAN ROOM DRAWING STUDIO */}
        {centerCanvasTab === 'dwg_floor_editor' && (
          <div className="lg:col-span-12 rounded-lg border border-slate-700 bg-slate-900 p-2.5 flex flex-col space-y-2.5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono font-black text-amber-400">
                  {tr('2D HOUSE / .DWG PLAN EDITOR', '2D ہاؤس / DWG ڈرائنگ ایڈیٹر')}
                </span>
                {houseMapFileName && (
                  <span className="text-[11px] font-mono text-sky-300 truncate max-w-[180px]">
                    {houseMapFileName}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={() => houseMapFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-sky-400" />
                  <span>{tr('Upload .DWG/.DXF/2D', 'نقشہ اپ لوڈ (.DWG/2D)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDwgDrawMode((v) => !v);
                    setDwgDrawRect(null);
                  }}
                  className={`px-2.5 py-1 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    dwgDrawMode
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>
                    {dwgDrawMode
                      ? tr('Drawing ON (Drag Box)', 'ڈرا آن (کھینچیں)')
                      : tr('Draw Room on Plan', 'نقشے پر کمرہ بنائیں')}
                  </span>
                </button>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 font-mono text-[11px]">
                  <span className="text-slate-400">{tr('Plot:', 'پلاٹ:')}</span>
                  <input
                    type="number"
                    min="12"
                    max="300"
                    value={dwgTotalWidthFt}
                    onChange={(e) => setDwgTotalWidthFt(Math.max(12, Number(e.target.value) || 50))}
                    className="w-10 bg-slate-900 border border-slate-700 rounded px-1 text-center text-amber-300 font-bold tabular-nums"
                    title={tr('Total Drawing Width (Ft)', 'نقشے کی کل چوڑائی (فٹ)')}
                  />
                  <span className="text-slate-500">×</span>
                  <input
                    type="number"
                    min="12"
                    max="300"
                    value={dwgTotalLengthFt}
                    onChange={(e) => setDwgTotalLengthFt(Math.max(12, Number(e.target.value) || 60))}
                    className="w-10 bg-slate-900 border border-slate-700 rounded px-1 text-center text-sky-300 font-bold tabular-nums"
                    title={tr('Total Drawing Length (Ft)', 'نقشے کی کل لمبائی (فٹ)')}
                  />
                  <span className="text-slate-400">ft</span>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewRoomProfile}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>{tr('+ Room', '+ کمرہ')}</span>
                </button>

                {(houseMapImageUrl || houseMapCadLines.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHouseMapImageUrl(null);
                      setHouseMapCadLines([]);
                      setHouseMapCadLabels([]);
                      setHouseMapFileName(null);
                    }}
                    className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    {tr('Clear Plan', 'صاف کریں')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCenterCanvasTab('dual')}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                >
                  {tr('Open Dual CAD', 'ڈایاگرام کھولیں')}
                </button>
              </div>
            </div>

            {/* Interactive 2D / DWG Floor Plan Surface */}
            <div
              ref={houseMapBoxRef}
              onMouseDown={handleDwgCanvasMouseDown}
              onMouseMove={handleHouseMapRoomPointerMove}
              onMouseUp={handleDwgCanvasMouseUp}
              onMouseLeave={handleDwgCanvasMouseUp}
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.08) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
              className={`relative w-full h-[460px] rounded-lg border border-slate-700 bg-slate-950 overflow-hidden select-none ${
                dwgDrawMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            >
              {houseMapImageUrl && (
                <img
                  src={houseMapImageUrl}
                  alt="House Floor Plan"
                  className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                />
              )}

              {houseMapCadLines.length > 0 && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {houseMapCadLines.map((ln, idx) => (
                    <line
                      key={idx}
                      x1={ln.x1}
                      y1={ln.y1}
                      x2={ln.x2}
                      y2={ln.y2}
                      stroke="#38bdf8"
                      strokeWidth="0.35"
                    />
                  ))}
                  {houseMapCadLabels.map((lb, idx) => (
                    <text
                      key={idx}
                      x={lb.x}
                      y={lb.y}
                      fill="#fde047"
                      fontSize="2.2"
                      fontFamily="monospace"
                    >
                      {lb.text}
                    </text>
                  ))}
                </svg>
              )}

              {/* Existing Rooms positioned on the House Plan */}
              {roomsList.map((rm) => {
                const isSelected = rm.id === activeRoomId;
                const x = rm.mapX ?? 6;
                const y = rm.mapY ?? 8;
                const w = rm.mapW ?? 42;
                const h = rm.mapH ?? 38;
                return (
                  <div
                    key={rm.id}
                    onMouseDown={(e) => {
                      if (dwgDrawMode) return;
                      e.stopPropagation();
                      handleSelectRoomProfile(rm);
                      setDraggingMapRoomId(rm.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoomProfile(rm);
                      setCenterCanvasTab('dual');
                    }}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                    }}
                    className={`absolute rounded border-2 transition-colors flex flex-col justify-between p-1.5 cursor-move ${
                      isSelected
                        ? 'border-amber-400 bg-sky-900/55 shadow-lg z-20'
                        : 'border-sky-500/70 bg-slate-900/75 hover:border-amber-300 z-10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-white">
                      <span className="truncate">{cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}</span>
                      <span className="font-mono text-amber-300 shrink-0 tabular-nums">
                        {`${rm.roomWidthFt}'×${rm.roomLengthFt}'`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-300">
                      <span>{`${(rm.roomWidthFt * rm.roomLengthFt).toFixed(0)} ft²`}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRoomProfile(rm);
                          setCenterCanvasTab('dual');
                        }}
                        className="px-1.5 py-0.2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] cursor-pointer"
                      >
                        {tr('CAD', 'کیڈ')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Live Drawing Rectangle Preview */}
              {dwgDrawMode && dwgDrawRect && (
                <div
                  style={{
                    left: `${Math.min(dwgDrawRect.startX, dwgDrawRect.curX)}%`,
                    top: `${Math.min(dwgDrawRect.startY, dwgDrawRect.curY)}%`,
                    width: `${Math.abs(dwgDrawRect.curX - dwgDrawRect.startX)}%`,
                    height: `${Math.abs(dwgDrawRect.curY - dwgDrawRect.startY)}%`,
                  }}
                  className="absolute border-2 border-dashed border-emerald-400 bg-emerald-500/20 z-30 flex items-center justify-center pointer-events-none"
                >
                  <span className="px-2 py-0.5 rounded bg-slate-950/90 text-emerald-300 font-mono text-xs font-black">
                    {`${Math.max(6, Math.round((Math.abs(dwgDrawRect.curX - dwgDrawRect.startX) / 100) * dwgTotalWidthFt))}'×${Math.max(6, Math.round((Math.abs(dwgDrawRect.curY - dwgDrawRect.startY) / 100) * dwgTotalLengthFt))}'`}
                  </span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-slate-950/85 border border-slate-700 text-[10.5px] font-mono text-slate-300 pointer-events-none">
                {dwgDrawMode
                  ? tr('Click & drag anywhere on plan to create a new room', 'نیا کمرہ بنانے کے لیے نقشے پر کلک کر کے کھینچیں')
                  : tr('Drag rooms to arrange · Double-click any room for Floor CAD', 'کمرے کھینچ کر سیٹ کریں · ڈبل کلک کر کے ڈایاگرام کھولیں')}
              </div>
            </div>

            {/* Active Room Box Size Adjuster Strip */}
            {roomsList.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-1.5">
                  {roomsList.map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => handleSelectRoomProfile(rm)}
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer ${
                        activeRoomId === rm.id
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {`${cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn} (${rm.roomWidthFt}'×${rm.roomLengthFt}')`}
                    </button>
                  ))}
                </div>
                {(() => {
                  const sel = roomsList.find((r) => r.id === activeRoomId);
                  if (!sel) return null;
                  return (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400">{tr('Box W%:', 'باکس W%:')}</span>
                      <input
                        type="range"
                        min="12"
                        max="92"
                        value={sel.mapW ?? 42}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setRoomsList((prev) =>
                            prev.map((r) => (r.id === sel.id ? { ...r, mapW: v } : r))
                          );
                        }}
                        className="w-20 accent-amber-400 cursor-pointer"
                      />
                      <span className="text-slate-400">{tr('H%:', 'H%:')}</span>
                      <input
                        type="range"
                        min="12"
                        max="92"
                        value={sel.mapH ?? 38}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setRoomsList((prev) =>
                            prev.map((r) => (r.id === sel.id ? { ...r, mapH: v } : r))
                          );
                        }}
                        className="w-20 accent-sky-400 cursor-pointer"
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* DIAGRAM 1 — PRIMARY LARGE ROOM FLOOR BOOKMATCH CAD CANVAS */}
        {(centerCanvasTab === 'dual' || centerCanvasTab === 'floor_only') && (
          <div
            className={`${
              isDiagramExpanded || centerCanvasTab === 'floor_only' ? 'lg:col-span-12' : 'lg:col-span-8'
            } flex flex-col justify-center`}
          >
            {renderRoomFloorCanvas(false, false)}
          </div>
        )}

        {/* DIAGRAM 2 — CLEAN COMPANION SELECTED PIECE / SLAB PREVIEW (VALUES + CONTROLS INSIDE DROPDOWNS) */}
        {!isDiagramExpanded && (centerCanvasTab === 'dual' || centerCanvasTab === 'slab_only') && (() => {
          const diagram2NavOptions: Array<{ value: number; label: string }> = [
            ...Array.from({ length: totalSameStockSlabsInList }).map((_, i) => {
              const sNum = i + 1;
              const pLet = PIECE_LETTERS[i] || `S${sNum}`;
              const isUsedInCenter = sNum <= totalBmPiecesCount;
              const hasAssignedBorder = allocatedRoomPiecesList.some(
                (p) => p.category === 'outer_border' && p.targetSlabNum === sNum
              );
              return {
                value: sNum,
                label: isUsedInCenter
                  ? hasAssignedBorder
                    ? `S${sNum}(${pLet}) · BM+B`
                    : `S${sNum}(${pLet}) · BM`
                  : hasAssignedBorder
                  ? `S${sNum} · Border`
                  : `S${sNum} · Cut`,
              };
            }),
            ...(effectiveOuterBorderIn > 0 && borderSlabSource === 'from_custom_border_stock_slab'
              ? [{ value: 0, label: tr('CB · Border Slab', 'CB · بارڈر سلیب') }]
              : []),
            ...(effectiveContrastPattiIn > 0
              ? [{ value: -1, label: tr('PS · Contrast Strip', 'PS · پٹی سلیب') }]
              : []),
          ];
          const currentNavVal = diagram2NavOptions.some((o) => o.value === activeSlabIndex)
            ? activeSlabIndex
            : 1;
          const currentNavIdx = diagram2NavOptions.findIndex((o) => o.value === currentNavVal);

          return (
          <div
            onDragOver={(e) => {
              if (draggedStockItem?.kind === 'piece') {
                e.preventDefault();
                setDragOverTargetKey(`slab-${currentNavVal}`);
              }
            }}
            onDrop={(e) => handleDropPieceOntoTargetSlab(currentNavVal, e)}
            className={`${
              centerCanvasTab === 'slab_only' ? 'lg:col-span-12' : 'lg:col-span-4'
            } relative rounded-lg border border-slate-700 bg-slate-900 p-2 flex flex-col justify-between space-y-1.5 shadow-xl`}
          >
            {/* Slim 1-Line Companion Slab Top Bar: [◀ S1 ▼ ▶] + [Values ▼] + [Resize/Adjust ▼] */}
            <div className="relative z-30 flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx =
                      currentNavIdx > 0 ? currentNavIdx - 1 : diagram2NavOptions.length - 1;
                    setActiveSlabIndex(diagram2NavOptions[prevIdx]?.value ?? 1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  ◀
                </button>

                <select
                  value={currentNavVal}
                  onChange={(e) => scrollToSpecificSlab(Number(e.target.value))}
                  className="h-6 rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono text-[11px] font-bold px-1.5 cursor-pointer max-w-[145px]"
                >
                  {diagram2NavOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-950 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const nextIdx =
                      currentNavIdx < diagram2NavOptions.length - 1 ? currentNavIdx + 1 : 0;
                    setActiveSlabIndex(diagram2NavOptions[nextIdx]?.value ?? 1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  ▶
                </button>
              </div>

              <div className="flex items-center gap-1 print:hidden">
                <button
                  type="button"
                  onClick={() =>
                    setSlabDropdownMenu((m) => (m === 'values' ? null : 'values'))
                  }
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    slabDropdownMenu === 'values'
                      ? 'bg-emerald-500 border-white text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-emerald-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{tr('Values', 'سائز / بچت')}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSlabDropdownMenu((m) => (m === 'adjust' ? null : 'adjust'))
                  }
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    slabDropdownMenu === 'adjust'
                      ? 'bg-amber-500 border-white text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="h-3 w-3" />
                  <span>{tr('Resize', 'سائز سیٹ')}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* COMPACT SLAB VIEWPORT (All verbose boxes moved cleanly into the dropdown popovers above!) */}
            <div
              ref={slabListScrollRef}
              className={
                showAllSlabsList
                  ? 'max-h-[420px] overflow-y-auto pr-1 space-y-2 scroll-smooth'
                  : 'flex-1 flex flex-col justify-center'
              }
            >
              {(currentNavVal === 0 || currentNavVal === -1) && !showAllSlabsList && (() => {
                const isCustomBorderView = currentNavVal === 0;
                const dSlabW = isCustomBorderView ? Math.max(12, borderSlabWidthIn) : Math.max(4, pattiSlabWidthIn);
                const dSlabL = isCustomBorderView ? Math.max(24, borderSlabLengthIn) : Math.max(24, pattiSlabLengthIn);
                const dSlabImg = isCustomBorderView
                  ? borderSlabImageUrl || slabImageUrl
                  : pattiCustomSlabImageUrl || slabImageUrl;
                const stripList = allocatedRoomPiecesList.filter((p) =>
                  isCustomBorderView ? p.category === 'outer_border' : p.category === 'contrast_strip'
                );
                const stripWidthIn = isCustomBorderView ? effectiveOuterBorderIn : effectiveContrastPattiIn;
                const autoSlabH =
                  centerCanvasTab === 'slab_only'
                    ? Math.max(240, Math.min(440, viewportDims.h - 330))
                    : Math.max(195, Math.min(340, viewportDims.h - 400));
                const slabMaxW =
                  viewportDims.w < 768
                    ? Math.max(210, viewportDims.w - 56)
                    : centerCanvasTab === 'slab_only'
                    ? Math.max(460, Math.min(780, Math.round(viewportDims.w * 0.62)))
                    : Math.max(260, Math.min(410, Math.round(viewportDims.w * 0.27)));
                const slabMaxH = autoSlabH - 18;
                const slabPxPerIn = Math.min(slabMaxW / Math.max(12, dSlabL), slabMaxH / Math.max(8, dSlabW));
                const exactSlabW = Math.max(110, Math.round(dSlabL * slabPxPerIn));
                const exactSlabH = Math.max(76, Math.round(dSlabW * slabPxPerIn));
                const totalStripsWIn = stripList.length * stripWidthIn;
                const remWasteWIn = Number(Math.max(0, dSlabW - totalStripsWIn).toFixed(1));

                return (
                  <div className="relative flex-1 flex flex-col justify-between space-y-1.5">
                    <div
                      style={{ minHeight: `${autoSlabH}px` }}
                      className="relative w-full flex-1 rounded-lg border border-slate-800 bg-slate-950 p-2 flex flex-col items-center justify-center gap-1.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isCustomBorderView ? setShowBorderSlabDrawer(true) : setShowPattiSlabDrawer(true)
                        }
                        className="absolute top-1.5 right-1.5 z-30 px-2 py-1 rounded bg-slate-900/95 hover:bg-sky-600 border border-slate-700 text-[10px] font-bold text-slate-200 hover:text-white cursor-pointer"
                      >
                        {tr('Edit Slab', 'سلیب سیٹ')}
                      </button>

                      {/* CAD Header Specs Strip for Dedicated Border/Contrast Slab */}
                      <div className="w-full pr-16 flex flex-wrap items-center justify-between gap-1 text-[9.5px] font-mono text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-bold text-white tabular-nums">
                          {`SLAB: ${dSlabW}"×${dSlabL}"`}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-500/40 font-bold text-rose-200 tabular-nums">
                          {`✂ ${stripList.length} ${tr('Cuts', 'کٹ')} · K:${effectiveBladeKerfIn}"`}
                        </span>
                      </div>

                      <div
                        style={{
                          width: `${exactSlabW}px`,
                          height: `${exactSlabH}px`,
                          backgroundImage: `url("${dSlabImg}")`,
                          backgroundSize: '100% 100%',
                        }}
                        className="relative shrink-0 border-2 border-white bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
                      >
                        <div className="absolute inset-0 bg-slate-950/35 pointer-events-none" />
                        <div className="relative z-10 w-full flex-1 flex flex-col">
                          {stripList.map((sp, sIdx) => {
                            const isSelStrip = selectedFloorPieceCode === sp.code;
                            const hPct = Math.min(90, Math.max(10, (sp.widthIn / dSlabW) * 100));
                            const wPct = Math.min(100, Math.max(14, (sp.lengthIn / dSlabL) * 100));
                            return (
                              <div
                                key={sp.id}
                                style={{
                                  height: `${hPct}%`,
                                  width: `${wPct}%`,
                                }}
                                onClick={() => setSelectedFloorPieceCode(sp.code)}
                                className={`relative border-b-2 border-r-2 flex items-center justify-between px-1.5 cursor-pointer transition-all ${
                                  isSelStrip
                                    ? 'border-2 border-amber-300 bg-amber-500/35 ring-2 ring-amber-300/80 z-20'
                                    : 'border-dashed border-rose-400 bg-slate-950/55 hover:bg-slate-900/70'
                                }`}
                              >
                                <span
                                  className={`font-mono text-[9.5px] font-black truncate tabular-nums ${
                                    isSelStrip ? 'text-amber-200' : 'text-white'
                                  }`}
                                >
                                  {`${isSelStrip ? '★ ' : ''}${sp.code} · ${sp.widthIn}"×${sp.lengthIn}"`}
                                </span>
                                <span className="px-1 rounded bg-rose-950/90 border border-rose-400/60 font-mono text-[8px] font-bold text-rose-200 shrink-0">
                                  {`✂ C${sIdx + 1} · K:${effectiveBladeKerfIn}"`}
                                </span>
                              </div>
                            );
                          })}
                          {remWasteWIn >= 0.1 && (
                            <div className="flex-1 border-t border-dashed border-emerald-400/70 bg-slate-950/70 flex items-center px-1.5">
                              <span className="font-mono text-[9px] font-bold text-emerald-300 tabular-nums">
                                {tr(`Rem: ${remWasteWIn}"×${dSlabL}"`, `بچت: ${remWasteWIn}"×${dSlabL}"`)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-800/90 flex items-center justify-between gap-1.5 text-[10.5px] font-mono">
                      <span className="text-slate-300 truncate tabular-nums">
                        {isCustomBorderView
                          ? `${tr('Border Slab', 'بارڈر سلیب')} (${dSlabW}"×${dSlabL}") · ${stripList.length} ${tr('cuts', 'کٹ')} · K:${effectiveBladeKerfIn}"`
                          : `${tr('Contrast Slab', 'پٹی سلیب')} (${dSlabW}"×${dSlabL}") · ${stripList.length} ${tr('cuts', 'کٹ')} · K:${effectiveBladeKerfIn}"`}
                      </span>
                      <button
                        type="button"
                        onClick={() => onApplyRoomPartsToCutter(buildRoomCutParts())}
                        className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Scissors className="h-3 w-3" />
                        <span>{tr('Cut', 'کٹنگ')}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {Array.from({ length: totalSameStockSlabsInList })
                .map((_, idx) => idx + 1)
                .filter((slabNum) => showAllSlabsList || slabNum === currentNavVal)
                .map((slabNum) => {
                  const idx = slabNum - 1;
                  const slabSt = getSlabState(slabNum);
                  const slabMetrics = getSlabPieceMetrics(slabNum);
                  const pieceLetter = PIECE_LETTERS[idx] || `S${slabNum}`;
                  const isUsedInBookmatch = slabMetrics.isUsedInBookmatch;
                  const isSideCutStockSlab = slabMetrics.isSideCutStockSlab;
                  const sideSlabIdx = slabMetrics.sideSlabIdx;
                  const isTopBottomSideSlab = slabMetrics.isTopBottomSideSlab;
                  const sideMainPieceCode =
                    sideSlabIdx < bmCols
                      ? `ST-${sideSlabIdx + 1}`
                      : `SB-${sideSlabIdx - bmCols + 1}`;
                  const sideLrPieceCode =
                    sideSlabIdx % 2 === 0
                      ? `SL-${Math.floor(sideSlabIdx / 2) + 1}`
                      : `SR-${Math.floor(sideSlabIdx / 2) + 1}`;

                  const effectiveImgUrl = slabSt.customImageUrl || slabImageUrl;

                  const {
                    activePieceWIn,
                    activePieceLIn,
                    pieceWidthPct,
                    pieceHeightPct,
                    clampedX,
                    clampedY,
                    cutStartXIn,
                    cutStartYIn,
                    bgPosX,
                    bgPosY,
                    bgSizeW: metricBgSizeW,
                    bgSizeH: metricBgSizeH,
                    topWasteIn,
                    bottomWasteIn,
                    leftWasteIn,
                    rightWasteIn,
                    topWastePct,
                    bottomWastePct,
                    leftWastePct,
                    rightWastePct,
                  } = slabMetrics;

                  const r = Math.floor(idx / bmCols);
                  const c = idx % bmCols;
                  const autoFlips = getAutoFlipForPattern(veinPattern, r, c);
                  const curFlipH =
                    slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlips.flipH;
                  const curFlipV =
                    slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlips.flipV;

                  const isDedicatedBorderSlab =
                    !isUsedInBookmatch &&
                    !isSideCutStockSlab &&
                    effectiveOuterBorderIn > 0 &&
                    borderSlabSource !== 'from_custom_border_stock_slab';

                  // Exact Saw Cut Running Inches on this Slab (accounting for 4-side cuts)
                  const horizCutsCount =
                    (topWasteIn >= 0.1 ? 1 : 0) + (bottomWasteIn >= 0.1 ? 1 : 0);
                  const vertCutsCount =
                    (leftWasteIn >= 0.1 ? 1 : 0) + (rightWasteIn >= 0.1 ? 1 : 0);
                  const horizRipCutRunningIn = Number((horizCutsCount * safeSlabL).toFixed(1));
                  const vertCrossCutRunningIn = Number(
                    (vertCutsCount * activePieceWIn).toFixed(1)
                  );
                  const edgeTrimPerimeterRunningIn =
                    effectiveEdgeTrimIn > 0
                      ? Number(((rawStockSlabW + rawStockSlabL) * 2).toFixed(1))
                      : 0;
                  const totalSlabCutRunningIn = Number(
                    (
                      horizRipCutRunningIn +
                      vertCrossCutRunningIn +
                      edgeTrimPerimeterRunningIn
                    ).toFixed(1)
                  );

                  const largestHorizWasteIn = Math.max(topWasteIn, bottomWasteIn);
                  const borderPiecesOnThisSlab = allocatedRoomPiecesList.filter(
                    (p) => p.category === 'outer_border' && p.targetSlabNum === slabNum
                  );
                  const isBorderExtractedFromThisBmSlab =
                    isUsedInBookmatch &&
                    effectiveOuterBorderIn > 0 &&
                    borderPiecesOnThisSlab.length > 0;
                  const primaryBorderOnSlab = borderPiecesOnThisSlab[0];
                  const borderTargetLenOnThisSlab =
                    primaryBorderOnSlab?.lengthIn ??
                    (slabNum <= 2
                      ? halfTopBottomBorderLenIn
                      : Number((leftRightInnerBorderLenIn / 2).toFixed(1)));
                  const borderCodeOnThisSlab =
                    primaryBorderOnSlab?.code ?? (slabNum <= 2 ? `B${slabNum}-A` : `B${slabNum}-B`);
                  const borderFitsInLeftover = largestHorizWasteIn >= effectiveOuterBorderIn;

                  const assignedPiecesOnThisSlab = piecesAssignedToStockSlab[slabNum] || [];
                  const isMultiPiecePackedSlab =
                    !isUsedInBookmatch && assignedPiecesOnThisSlab.length > 1;
                  const multiMaxUsedYIn = isMultiPiecePackedSlab
                    ? Math.max(...assignedPiecesOnThisSlab.map((p) => p.yIn + p.widthIn))
                    : 0;
                  const multiMaxUsedXIn = isMultiPiecePackedSlab
                    ? Math.max(...assignedPiecesOnThisSlab.map((p) => p.xIn + p.lengthIn))
                    : 0;
                  const multiRemBottomWIn = isMultiPiecePackedSlab
                    ? Number(Math.max(0, safeSlabW - multiMaxUsedYIn).toFixed(1))
                    : 0;
                  const multiRemRightLIn = isMultiPiecePackedSlab
                    ? Number(Math.max(0, safeSlabL - multiMaxUsedXIn).toFixed(1))
                    : 0;
                  const extraMovedPiecesOnBmSlab = isUsedInBookmatch
                    ? assignedPiecesOnThisSlab.filter(
                        (p) =>
                          !(
                            p.category === 'outer_border' &&
                            borderSlabSource === 'from_bm_slabs_leftover' &&
                            p.defaultSlabNum === slabNum
                          )
                      )
                    : [];

                  const activePieceLabel = isUsedInBookmatch
                    ? `P${slabNum} (${pieceLetter})`
                    : assignedPiecesOnThisSlab.length > 0
                    ? assignedPiecesOnThisSlab.map((p) => p.code).join(' + ')
                    : isSideCutStockSlab
                    ? isTopBottomSideSlab
                      ? sideMainPieceCode
                      : sideLrPieceCode
                    : `Border`;

                  // Collect all 4-side waste strips down to 0.1" (including 0.5", 1", 2", etc.)
                  const fourSideWasteItems: { side: string; size: string; isBorder?: boolean }[] = [];
                  if (isMultiPiecePackedSlab) {
                    if (multiRemBottomWIn >= 0.1) {
                      fourSideWasteItems.push({
                        side: tr('Bottom Leftover', 'نیچے بچت'),
                        size: `${multiRemBottomWIn}"×${safeSlabL}"`,
                      });
                    }
                    if (multiRemRightLIn >= 0.1) {
                      fourSideWasteItems.push({
                        side: tr('Right Leftover', 'دائیں بچت'),
                        size: `${Number(Math.min(safeSlabW, multiMaxUsedYIn).toFixed(1))}"×${multiRemRightLIn}"`,
                      });
                    }
                  } else {
                    if (topWasteIn >= 0.1) {
                      fourSideWasteItems.push({
                        side: tr('Top', 'اوپر'),
                        size: `${topWasteIn}"×${safeSlabL}"`,
                      });
                    }
                    if (bottomWasteIn >= 0.1) {
                      if (isBorderExtractedFromThisBmSlab) {
                        fourSideWasteItems.push({
                          side: tr('Bottom (Border)', 'نیچے (بارڈر)'),
                          size: `${borderCodeOnThisSlab} ${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}"`,
                          isBorder: true,
                        });
                        const remAfterBorderW = Number(
                          Math.max(0, bottomWasteIn - effectiveOuterBorderIn).toFixed(1)
                        );
                        if (remAfterBorderW >= 0.1) {
                          fourSideWasteItems.push({
                            side: tr('Bottom Rem', 'نیچے بچت'),
                            size: `${remAfterBorderW}"×${safeSlabL}"`,
                          });
                        }
                      } else {
                        fourSideWasteItems.push({
                          side: tr('Bottom', 'نیچے'),
                          size: `${bottomWasteIn}"×${safeSlabL}"`,
                        });
                      }
                    }
                    if (leftWasteIn >= 0.1) {
                      fourSideWasteItems.push({
                        side: tr('Left', 'بائیں'),
                        size: `${activePieceWIn}"×${leftWasteIn}"`,
                      });
                    }
                    if (rightWasteIn >= 0.1) {
                      fourSideWasteItems.push({
                        side: tr('Right', 'دائیں'),
                        size: `${activePieceWIn}"×${rightWasteIn}"`,
                      });
                    }
                  }

                  return (
                    <div
                      key={slabNum}
                      ref={(el) => {
                        slabCardRefs.current[slabNum] = el;
                      }}
                      onClick={() => setActiveSlabIndex(slabNum)}
                      className="relative flex-1 flex flex-col justify-between space-y-1.5"
                    >
                      {/* DROPDOWN POPOVER 1: ALL VALUES, 4-SIDE WASTE & CUT POSITIONS */}
                      {slabDropdownMenu === 'values' && (slabNum === activeSlabIndex || !showAllSlabsList) && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-0 inset-x-0 z-40 rounded-lg border border-emerald-500/80 bg-slate-950 p-2.5 shadow-2xl space-y-2 text-[11px] font-mono"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-black text-emerald-300">
                              {tr(`S${slabNum} Values & 4-Side Waste`, `S${slabNum} تفصیل اور بچت`)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSlabDropdownMenu(null)}
                              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                            <div className="rounded bg-slate-900 border border-slate-800 p-1.5">
                              <div className="text-slate-400">{tr('Stock Slab', 'اصل سلیب')}</div>
                              <div className="font-bold text-white tabular-nums">{`${safeSlabW}" × ${safeSlabL}"`}</div>
                            </div>
                            <div className="rounded bg-slate-900 border border-slate-800 p-1.5">
                              <div className="text-slate-400">{tr('Active Piece', 'موجودہ پیس')}</div>
                              <div className="font-bold text-amber-300 tabular-nums">{`${activePieceLabel} · ${activePieceWIn}"×${activePieceLIn}"`}</div>
                            </div>
                            <div className="rounded bg-slate-900 border border-slate-800 p-1.5">
                              <div className="text-slate-400">{tr('Cut Origin', 'کٹنگ جگہ')}</div>
                              <div className="font-bold text-sky-300 tabular-nums">{`X=${cutStartXIn}" , Y=${cutStartYIn}"`}</div>
                            </div>
                            <div className="rounded bg-slate-900 border border-slate-800 p-1.5">
                              <div className="text-slate-400">{tr('Saw Cut Run', 'کل کٹائی')}</div>
                              <div className="font-bold text-emerald-300 tabular-nums">{`${totalSlabCutRunningIn}"`}</div>
                            </div>
                          </div>

                          {isBorderExtractedFromThisBmSlab && (
                            <div className="rounded bg-emerald-950/60 border border-emerald-500/50 px-2 py-1 text-emerald-200 font-bold">
                              {`+ ${borderCodeOnThisSlab} Border (${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}")`}
                            </div>
                          )}

                          {extraMovedPiecesOnBmSlab.length > 0 && (
                            <div className="rounded bg-amber-950/60 border border-amber-500/50 px-2 py-1 text-amber-200 font-bold">
                              {`+ ${extraMovedPiecesOnBmSlab
                                .map((p) => `${p.code} (${p.widthIn}"×${p.lengthIn}")`)
                                .join(', ')}`}
                            </div>
                          )}

                          <div className="space-y-1 pt-1 border-t border-slate-800">
                            <div className="font-bold text-emerald-300">
                              {tr('4-Side Saved / Waste Pieces:', 'چاروں اطراف کی بچت:')}
                            </div>
                            {fourSideWasteItems.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {fourSideWasteItems.map((wItem, wIdx) => (
                                  <span
                                    key={wIdx}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold tabular-nums"
                                  >
                                    {`${wItem.side}: ${wItem.size}`}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-400">{tr('0" Waste (Full Used)', '0" ویسٹ (پوری استعمال)')}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DROPDOWN POPOVER 2: RESIZE, SLIDERS, SHEET SIZE, FLIP/ROTATE & QUICK CHIPS */}
                      {slabDropdownMenu === 'adjust' && (slabNum === activeSlabIndex || !showAllSlabsList) && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-0 inset-x-0 z-40 rounded-lg border border-amber-500/80 bg-slate-950 p-2.5 shadow-2xl space-y-2 text-[11px]"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-black text-amber-300">
                              {tr(`Resize & Shift S${slabNum}`, `سائز اور شفٹ S${slabNum}`)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSyncAllSlabsCrop((v) => !v)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  syncAllSlabsCrop
                                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                                    : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                              >
                                {syncAllSlabsCrop ? tr('Sync', 'سنک') : tr('Single', 'الگ')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowAllSlabsList((v) => !v)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  showAllSlabsList
                                    ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                                    : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                              >
                                {showAllSlabsList ? tr('All', 'سب') : tr('1 Slab', 'ایک')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlabDropdownMenu(null)}
                                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Piece Cut Size W × L Inputs */}
                          {(isUsedInBookmatch || isSideCutStockSlab) && (
                            <div className="rounded bg-slate-900 border border-slate-800 p-1.5 space-y-1.5 font-mono">
                              <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                                <span>{tr(`Cut Piece (${activePieceLabel})`, `کٹ پیس (${activePieceLabel})`)}</span>
                                {(slabSt.customPieceWidthIn !== null && slabSt.customPieceWidthIn !== undefined) ||
                                (slabSt.customPieceLengthIn !== null && slabSt.customPieceLengthIn !== undefined) ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSlabState(slabNum, {
                                        customPieceWidthIn: null,
                                        customPieceLengthIn: null,
                                      })
                                    }
                                    className="text-rose-300 hover:underline cursor-pointer"
                                  >
                                    {tr('Reset Auto', 'اصل سائز')}
                                  </button>
                                ) : null}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">
                                  <span className="text-[10px] text-slate-300">W:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSlabState(slabNum, {
                                        customPieceWidthIn: Math.max(2, Number((activePieceWIn - 1).toFixed(1))),
                                      })
                                    }
                                    className="px-1 rounded bg-slate-800 text-white font-black cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="2"
                                    max={safeSlabW}
                                    value={activePieceWIn}
                                    onChange={(e) =>
                                      updateSlabState(slabNum, {
                                        customPieceWidthIn: Math.min(safeSlabW, Math.max(2, Number(e.target.value) || 2)),
                                      })
                                    }
                                    className="w-11 bg-transparent text-center text-[11px] font-black text-white tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSlabState(slabNum, {
                                        customPieceWidthIn: Math.min(safeSlabW, Number((activePieceWIn + 1).toFixed(1))),
                                      })
                                    }
                                    className="px-1 rounded bg-slate-800 text-white font-black cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="flex items-center justify-between bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">
                                  <span className="text-[10px] text-slate-300">L:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSlabState(slabNum, {
                                        customPieceLengthIn: Math.max(2, Number((activePieceLIn - 1).toFixed(1))),
                                      })
                                    }
                                    className="px-1 rounded bg-slate-800 text-white font-black cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="2"
                                    max={safeSlabL}
                                    value={activePieceLIn}
                                    onChange={(e) =>
                                      updateSlabState(slabNum, {
                                        customPieceLengthIn: Math.min(safeSlabL, Math.max(2, Number(e.target.value) || 2)),
                                      })
                                    }
                                    className="w-11 bg-transparent text-center text-[11px] font-black text-white tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSlabState(slabNum, {
                                        customPieceLengthIn: Math.min(safeSlabL, Number((activePieceLIn + 1).toFixed(1))),
                                      })
                                    }
                                    className="px-1 rounded bg-slate-800 text-white font-black cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Stock Sheet W × L Direct Size Adjust */}
                          <div className="rounded bg-slate-900 border border-slate-800 p-1.5 flex items-center justify-between gap-2 font-mono text-[10.5px]">
                            <span className="text-slate-300 font-bold">{tr('Sheet Size:', 'سلیب شیٹ:')}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="18"
                                max="140"
                                value={slabWidthIn}
                                onChange={(e) =>
                                  onUpdateSlabConfig({ width: Math.max(18, Number(e.target.value) || 28) })
                                }
                                className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-white font-bold tabular-nums"
                              />
                              <span className="text-slate-500">×</span>
                              <input
                                type="number"
                                min="24"
                                max="160"
                                value={slabLengthIn}
                                onChange={(e) =>
                                  onUpdateSlabConfig({ length: Math.max(24, Number(e.target.value) || 56) })
                                }
                                className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-white font-bold tabular-nums"
                              />
                            </div>
                          </div>

                          {/* X / Y Position Sliders */}
                          {(isUsedInBookmatch || isSideCutStockSlab) && (
                            <div className="grid grid-cols-2 gap-2 font-mono">
                              <div>
                                <div className="text-[10px] text-slate-300 flex justify-between">
                                  <span>{tr('X-Shift', 'دائیں بائیں')}</span>
                                  <span className="text-amber-300 tabular-nums">{`L:${leftWasteIn}"`}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={Math.max(1, Number((100 - pieceWidthPct).toFixed(1)))}
                                  step="0.5"
                                  value={clampedX}
                                  onChange={(e) =>
                                    updateSlabState(slabNum, { cropXPercent: Number(e.target.value) })
                                  }
                                  className="w-full h-1.5 accent-amber-500 cursor-pointer"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-300 flex justify-between">
                                  <span>{tr('Y-Shift', 'اوپر نیچے')}</span>
                                  <span className="text-emerald-300 tabular-nums">{`T:${topWasteIn}"`}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={Math.max(1, Number((100 - pieceHeightPct).toFixed(1)))}
                                  step="0.5"
                                  value={clampedY}
                                  onChange={(e) =>
                                    updateSlabState(slabNum, { cropYPercent: Number(e.target.value) })
                                  }
                                  className="w-full h-1.5 accent-sky-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          {/* Flip / Rotate / Photo Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-800">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlabState(slabNum, { flipHOverride: !curFlipH }, true)
                                }
                                className={`px-2 py-0.5 rounded text-[10.5px] font-bold border cursor-pointer ${
                                  curFlipH ? 'bg-sky-600 border-sky-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                              >
                                ↔
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlabState(slabNum, { flipVOverride: !curFlipV }, true)
                                }
                                className={`px-2 py-0.5 rounded text-[10.5px] font-bold border cursor-pointer ${
                                  curFlipV ? 'bg-sky-600 border-sky-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                              >
                                ↕
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlabState(
                                    slabNum,
                                    { rotationDeg: (slabSt.rotationDeg + 90) % 360 },
                                    true
                                  )
                                }
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10.5px] font-bold text-amber-300 cursor-pointer"
                              >
                                90°
                              </button>
                            </div>
                            {slabSt.customImageUrl && (
                              <button
                                type="button"
                                onClick={() => handleApplySlabPhotoToAll(slabNum)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10.5px] font-bold text-emerald-300 cursor-pointer"
                              >
                                {tr('Apply Photo All', 'فوٹو سب پر')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <input
                        ref={(el) => {
                          perSlabFileInputRefs.current[slabNum] = el;
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleIndividualSlabPhotoUpload(slabNum, e)}
                        className="hidden"
                      />

                      {/* MODERN CAD SLAB CANVAS — GROSS FRAME + 4-SIDE EDGE TRIM + NET USABLE + SAW CUT LINES & BLADE KERF */}
                      {(() => {
                        const grossSlabW =
                          slabDirectionInRoom === 'horizontal'
                            ? slabWidthIn || 60
                            : slabLengthIn || 104;
                        const grossSlabL =
                          slabDirectionInRoom === 'horizontal'
                            ? slabLengthIn || 104
                            : slabWidthIn || 60;
                        const autoSlabH =
                          centerCanvasTab === 'slab_only'
                            ? Math.max(240, Math.min(440, viewportDims.h - 330))
                            : Math.max(205, Math.min(350, viewportDims.h - 390));
                        const slabMaxW =
                          viewportDims.w < 768
                            ? Math.max(210, viewportDims.w - 56)
                            : centerCanvasTab === 'slab_only'
                            ? Math.max(460, Math.min(780, Math.round(viewportDims.w * 0.62)))
                            : Math.max(260, Math.min(410, Math.round(viewportDims.w * 0.27)));
                        const slabMaxH = autoSlabH - 42;
                        const slabPxPerIn = Math.min(
                          slabMaxW / Math.max(12, grossSlabL),
                          slabMaxH / Math.max(12, grossSlabW)
                        );
                        const exactNetW = Math.max(104, Math.round(safeSlabL * slabPxPerIn));
                        const exactNetH = Math.max(76, Math.round(safeSlabW * slabPxPerIn));
                        const trimFramePx =
                          effectiveEdgeTrimIn > 0
                            ? Math.max(7, Math.round(effectiveEdgeTrimIn * slabPxPerIn))
                            : 0;

                        // Build explicit Saw Cut segments inside Net Usable Slab Coordinate Space (0..safeSlabL × 0..safeSlabW)
                        interface SlabSawCutSegment {
                          step: number;
                          x1: number;
                          y1: number;
                          x2: number;
                          y2: number;
                          runIn: number;
                        }
                        const sawCutSegments: SlabSawCutSegment[] = [];
                        let cutSeq = 1;

                        if (isMultiPiecePackedSlab) {
                          const xBoundaries = new Set<number>();
                          const yBoundaries = new Set<number>();
                          assignedPiecesOnThisSlab.forEach((pc) => {
                            const xEnd = Number((pc.xIn + pc.lengthIn).toFixed(1));
                            const yEnd = Number((pc.yIn + pc.widthIn).toFixed(1));
                            if (pc.xIn >= 0.1) xBoundaries.add(Number(pc.xIn.toFixed(1)));
                            if (xEnd <= safeSlabL - 0.1) xBoundaries.add(xEnd);
                            if (pc.yIn >= 0.1) yBoundaries.add(Number(pc.yIn.toFixed(1)));
                            if (yEnd <= safeSlabW - 0.1) yBoundaries.add(yEnd);
                          });
                          Array.from(yBoundaries)
                            .sort((a, b) => a - b)
                            .forEach((cy) => {
                              sawCutSegments.push({
                                step: cutSeq++,
                                x1: 0,
                                y1: cy,
                                x2: safeSlabL,
                                y2: cy,
                                runIn: Number(safeSlabL.toFixed(1)),
                              });
                            });
                          const cutSpanH = Math.min(safeSlabW, multiMaxUsedYIn > 0 ? multiMaxUsedYIn : safeSlabW);
                          Array.from(xBoundaries)
                            .sort((a, b) => a - b)
                            .forEach((cx) => {
                              sawCutSegments.push({
                                step: cutSeq++,
                                x1: cx,
                                y1: 0,
                                x2: cx,
                                y2: cutSpanH,
                                runIn: Number(cutSpanH.toFixed(1)),
                              });
                            });
                        } else if (isUsedInBookmatch || isSideCutStockSlab) {
                          if (topWasteIn >= 0.1) {
                            sawCutSegments.push({
                              step: cutSeq++,
                              x1: 0,
                              y1: cutStartYIn,
                              x2: safeSlabL,
                              y2: cutStartYIn,
                              runIn: Number(safeSlabL.toFixed(1)),
                            });
                          }
                          if (bottomWasteIn >= 0.1) {
                            const bottomCutY = Number((cutStartYIn + activePieceWIn).toFixed(1));
                            sawCutSegments.push({
                              step: cutSeq++,
                              x1: 0,
                              y1: bottomCutY,
                              x2: safeSlabL,
                              y2: bottomCutY,
                              runIn: Number(safeSlabL.toFixed(1)),
                            });
                            if (isBorderExtractedFromThisBmSlab && bottomWasteIn > effectiveOuterBorderIn + 0.1) {
                              const borderStripCutY = Number((bottomCutY + effectiveOuterBorderIn).toFixed(1));
                              if (borderStripCutY < safeSlabW - 0.1) {
                                sawCutSegments.push({
                                  step: cutSeq++,
                                  x1: 0,
                                  y1: borderStripCutY,
                                  x2: safeSlabL,
                                  y2: borderStripCutY,
                                  runIn: Number(safeSlabL.toFixed(1)),
                                });
                              }
                            }
                          }
                          if (leftWasteIn >= 0.1) {
                            sawCutSegments.push({
                              step: cutSeq++,
                              x1: cutStartXIn,
                              y1: cutStartYIn,
                              x2: cutStartXIn,
                              y2: Number((cutStartYIn + activePieceWIn).toFixed(1)),
                              runIn: Number(activePieceWIn.toFixed(1)),
                            });
                          }
                          if (rightWasteIn >= 0.1) {
                            const rightCutX = Number((cutStartXIn + activePieceLIn).toFixed(1));
                            sawCutSegments.push({
                              step: cutSeq++,
                              x1: rightCutX,
                              y1: cutStartYIn,
                              x2: rightCutX,
                              y2: Number((cutStartYIn + activePieceWIn).toFixed(1)),
                              runIn: Number(activePieceWIn.toFixed(1)),
                            });
                          }
                        } else if (isDedicatedBorderSlab) {
                          const stripCount = Math.min(
                            4,
                            borderPiecesOnThisSlab.length > 0
                              ? borderPiecesOnThisSlab.length
                              : stripsPerFullBorderSlab
                          );
                          for (let b = 1; b <= stripCount; b++) {
                            const cy = Number((b * effectiveOuterBorderIn).toFixed(1));
                            if (cy < safeSlabW - 0.1) {
                              sawCutSegments.push({
                                step: cutSeq++,
                                x1: 0,
                                y1: cy,
                                x2: safeSlabL,
                                y2: cy,
                                runIn: Number(safeSlabL.toFixed(1)),
                              });
                            }
                          }
                        }

                        const kerfStrokeWidth = Math.max(0.45, effectiveBladeKerfIn * 2.2);

                        return (
                          <div
                            style={{ minHeight: `${autoSlabH}px` }}
                            className="relative w-full flex-1 rounded-lg border border-slate-800 bg-slate-950 p-2 flex flex-col items-center justify-between gap-1.5"
                          >
                            {/* CAD GROSS / EDGE TRIM / NET / KERF TOP RULER */}
                            <div className="w-full pr-8 flex flex-wrap items-center justify-between gap-1 text-[9.5px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-bold text-slate-200 tabular-nums">
                                {`GROSS ${grossSlabW}"×${grossSlabL}" → NET ${safeSlabW}"×${safeSlabL}"`}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded border font-bold tabular-nums ${
                                    effectiveEdgeTrimIn > 0
                                      ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                                      : 'bg-slate-900 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  {`TRIM: ${effectiveEdgeTrimIn}"`}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/75 border border-amber-500/60 font-bold text-amber-200 tabular-nums">
                                  {`KERF: ${effectiveBladeKerfIn}"`}
                                </span>
                              </div>
                            </div>

                            {/* Minimal Floating Photo Button on Slab Canvas Corner */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                perSlabFileInputRefs.current[slabNum]?.click();
                              }}
                              className="absolute top-1.5 right-1.5 z-30 p-1.5 rounded bg-slate-900/90 hover:bg-sky-600 border border-slate-700 text-slate-200 hover:text-white cursor-pointer"
                              title={tr('Upload Slab Photo', 'سلیب فوٹو بدلیں')}
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </button>

                            {/* OUTER GROSS SLAB + 4-SIDE EDGE TRIM FRAME */}
                            <div
                              style={{
                                padding: `${trimFramePx}px`,
                                backgroundImage:
                                  trimFramePx > 0
                                    ? 'repeating-linear-gradient(45deg, rgba(244,63,94,0.22), rgba(244,63,94,0.22) 4px, rgba(15,23,42,0.92) 4px, rgba(15,23,42,0.92) 8px)'
                                    : undefined,
                              }}
                              className={`relative shrink-0 shadow-2xl ${
                                trimFramePx > 0
                                  ? 'border-2 border-rose-400/90 bg-slate-950'
                                  : 'bg-transparent'
                              }`}
                            >
                              {trimFramePx > 0 && (
                                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0 rounded bg-rose-950 border border-rose-400 text-[8.5px] font-mono font-black text-rose-200 whitespace-nowrap pointer-events-none tabular-nums">
                                  {tr(
                                    `EDGE TRIM: ${effectiveEdgeTrimIn}" / side`,
                                    `صفائی / ایج ٹرم: ${effectiveEdgeTrimIn}"`
                                  )}
                                </span>
                              )}

                              {/* INNER NET USABLE SLAB (Bound to slabBoxRefs for 100% accurate mouse drag & corner resize) */}
                              <div
                                ref={(el) => {
                                  slabBoxRefs.current[slabNum] = el;
                                }}
                                onMouseDown={() => {
                                  setActiveSlabIndex(slabNum);
                                  setSlabDropdownMenu(null);
                                  if (
                                    (isUsedInBookmatch || isSideCutStockSlab) &&
                                    !isMultiPiecePackedSlab
                                  ) {
                                    setDraggingSlabNum(slabNum);
                                  }
                                }}
                                onMouseUp={() => {
                                  setDraggingSlabNum(null);
                                  setResizingSlabDrag(null);
                                }}
                                onMouseMove={(e) => handleSlabPointerMove(slabNum, e)}
                                style={{
                                  width: `${exactNetW}px`,
                                  height: `${exactNetH}px`,
                                  backgroundImage: `url("${effectiveImgUrl}")`,
                                  backgroundSize: '100% 100%',
                                }}
                                className={`relative shrink-0 rounded-none border-2 ${
                                  trimFramePx > 0
                                    ? 'border-dashed border-sky-300'
                                    : 'border-white'
                                } bg-slate-900 select-none ${
                                  isMultiPiecePackedSlab ? 'cursor-default' : 'cursor-move'
                                }`}
                              >
                                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

                                {/* 1A. MULTI-PIECE PACKED SLAB */}
                                {isMultiPiecePackedSlab && (
                                  <>
                                    {assignedPiecesOnThisSlab.map((pc) => {
                                      const leftPct = Number(
                                        Math.min(96, (pc.xIn / Math.max(1, safeSlabL)) * 100).toFixed(2)
                                      );
                                      const topPct = Number(
                                        Math.min(96, (pc.yIn / Math.max(1, safeSlabW)) * 100).toFixed(2)
                                      );
                                      const wPct = Number(
                                        Math.min(
                                          100 - leftPct,
                                          Math.max(4, (pc.lengthIn / Math.max(1, safeSlabL)) * 100)
                                        ).toFixed(2)
                                      );
                                      const hPct = Number(
                                        Math.min(
                                          100 - topPct,
                                          Math.max(4, (pc.widthIn / Math.max(1, safeSlabW)) * 100)
                                        ).toFixed(2)
                                      );
                                      return (
                                        <div
                                          key={pc.id}
                                          style={{
                                            left: `${leftPct}%`,
                                            top: `${topPct}%`,
                                            width: `${wPct}%`,
                                            height: `${hPct}%`,
                                            backgroundImage: `url("${effectiveImgUrl}")`,
                                            backgroundSize: `${Number(((100 / Math.max(4, wPct)) * 100).toFixed(1))}% ${Number(
                                              ((100 / Math.max(4, hPct)) * 100).toFixed(1)
                                            )}%`,
                                            backgroundPosition: `${leftPct}% ${topPct}%`,
                                            borderColor: pc.colorHex,
                                          }}
                                          className="absolute z-10 border-2 shadow-md flex flex-col items-center justify-center p-0.5 overflow-hidden"
                                        >
                                          <span className="px-1 py-0.2 rounded bg-slate-950/90 font-mono text-[10px] font-black text-white whitespace-nowrap tabular-nums">
                                            {`${pc.code} ${pc.widthIn}"×${pc.lengthIn}"`}
                                          </span>
                                        </div>
                                      );
                                    })}

                                    {multiRemBottomWIn >= 0.1 && (
                                      <div
                                        style={{
                                          left: '0%',
                                          top: `${Math.min(94, (multiMaxUsedYIn / Math.max(1, safeSlabW)) * 100)}%`,
                                          width: '100%',
                                          height: `${Math.max(5, (multiRemBottomWIn / Math.max(1, safeSlabW)) * 100)}%`,
                                        }}
                                        className="absolute z-20 border-t border-dashed border-emerald-300 bg-slate-950/75 flex items-center px-1.5 pointer-events-none"
                                      >
                                        <span className="text-[9.5px] font-mono font-bold text-emerald-300 truncate tabular-nums">
                                          {`${multiRemBottomWIn}"×${safeSlabL}"`}
                                        </span>
                                      </div>
                                    )}

                                    {multiRemRightLIn >= 0.1 && (
                                      <div
                                        style={{
                                          left: `${Math.min(94, (multiMaxUsedXIn / Math.max(1, safeSlabL)) * 100)}%`,
                                          top: '0%',
                                          width: `${Math.max(4, (multiRemRightLIn / Math.max(1, safeSlabL)) * 100)}%`,
                                          height: `${Math.min(100, (multiMaxUsedYIn / Math.max(1, safeSlabW)) * 100)}%`,
                                        }}
                                        className="absolute z-20 border-l border-dashed border-amber-300 bg-slate-950/80 flex items-center justify-center p-0.5 text-center pointer-events-none"
                                      >
                                        <span className="text-[9px] font-mono font-bold text-amber-300 tabular-nums">
                                          {`${multiRemRightLIn}"`}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* 1B. SINGLE ACTIVE CUT PIECE ZONE + DIRECT MOUSE CORNER/EDGE RESIZE HANDLES */}
                                {!isMultiPiecePackedSlab && (isUsedInBookmatch || isSideCutStockSlab) && (
                                  <div
                                    style={{
                                      left: `${clampedX}%`,
                                      top: `${clampedY}%`,
                                      width: `${pieceWidthPct}%`,
                                      height: `${pieceHeightPct}%`,
                                      backgroundImage: `url("${effectiveImgUrl}")`,
                                      backgroundSize: `${metricBgSizeW}% ${metricBgSizeH}%`,
                                      backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                                    }}
                                    className="absolute z-10 border-2 border-white shadow-md flex flex-col items-center justify-center p-1"
                                  >
                                    <div className="px-2 py-0.5 rounded bg-slate-950/90 border border-white/75 font-mono text-[11px] font-black text-white shadow pointer-events-none text-center tabular-nums whitespace-nowrap">
                                      {`${activePieceLabel} · ${activePieceWIn}"×${activePieceLIn}"`}
                                    </div>

                                    {/* Right-Edge Handle (Length L Resize) */}
                                    <div
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        const rect = slabBoxRefs.current[slabNum]?.getBoundingClientRect();
                                        setResizingSlabDrag({
                                          slabNum,
                                          axis: 'l',
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWIn: activePieceWIn,
                                          startLIn: activePieceLIn,
                                          startCutXIn: cutStartXIn,
                                          startCutYIn: cutStartYIn,
                                          rectW: rect?.width || exactNetW,
                                          rectH: rect?.height || exactNetH,
                                        });
                                      }}
                                      title={tr('Drag to resize Length', 'لمبائی چھوٹی بڑی کریں')}
                                      className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-7 rounded-sm bg-sky-400 border border-slate-950 cursor-ew-resize z-40 shadow hover:scale-110 transition-transform"
                                    />

                                    {/* Bottom-Edge Handle (Width W Resize) */}
                                    <div
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        const rect = slabBoxRefs.current[slabNum]?.getBoundingClientRect();
                                        setResizingSlabDrag({
                                          slabNum,
                                          axis: 'w',
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWIn: activePieceWIn,
                                          startLIn: activePieceLIn,
                                          startCutXIn: cutStartXIn,
                                          startCutYIn: cutStartYIn,
                                          rectW: rect?.width || exactNetW,
                                          rectH: rect?.height || exactNetH,
                                        });
                                      }}
                                      title={tr('Drag to resize Width', 'چوڑائی چھوٹی بڑی کریں')}
                                      className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-7 h-2.5 rounded-sm bg-sky-400 border border-slate-950 cursor-ns-resize z-40 shadow hover:scale-110 transition-transform"
                                    />

                                    {/* Bottom-Right Corner Resize Handle (Both W × L Live Resize) */}
                                    <div
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        const rect = slabBoxRefs.current[slabNum]?.getBoundingClientRect();
                                        setResizingSlabDrag({
                                          slabNum,
                                          axis: 'both',
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWIn: activePieceWIn,
                                          startLIn: activePieceLIn,
                                          startCutXIn: cutStartXIn,
                                          startCutYIn: cutStartYIn,
                                          rectW: rect?.width || exactNetW,
                                          rectH: rect?.height || exactNetH,
                                        });
                                      }}
                                      title={tr(
                                        'Drag corner to resize cut piece size (W×L)',
                                        'کونے سے پکڑ کر سائز چھوٹا بڑا کریں'
                                      )}
                                      className="absolute -bottom-2 -right-2 w-4 h-4 rounded-sm bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 cursor-nwse-resize z-40 shadow-lg flex items-center justify-center"
                                    >
                                      <span className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-950" />
                                    </div>
                                  </div>
                                )}

                                {/* 2. MINIMAL OVERLAY WASTE DIMENSIONS ON SLAB */}
                                {!isMultiPiecePackedSlab && (isUsedInBookmatch || isSideCutStockSlab) && (
                                  <>
                                    {topWasteIn >= 0.1 && (() => {
                                      const showBorderInTop =
                                        isBorderExtractedFromThisBmSlab && topWasteIn > bottomWasteIn;
                                      const topStrip = borderPiecesOnThisSlab[0];
                                      const isTopSelected =
                                        showBorderInTop && topStrip?.code === selectedFloorPieceCode;
                                      return (
                                        <div
                                          style={{
                                            left: '0%',
                                            top: '0%',
                                            width: showBorderInTop && topStrip
                                              ? `${Math.min(100, Math.max(20, (topStrip.lengthIn / Math.max(1, safeSlabL)) * 100))}%`
                                              : '100%',
                                            height: `${Math.max(5, topWastePct)}%`,
                                          }}
                                          className={`absolute z-20 border-b flex items-center px-1.5 pointer-events-none ${
                                            isTopSelected
                                              ? 'border-2 border-amber-300 bg-amber-500/45 ring-2 ring-amber-300/80'
                                              : showBorderInTop
                                              ? 'border border-dashed border-emerald-300 bg-emerald-950/80'
                                              : 'border-dashed border-emerald-300/80 bg-slate-950/70'
                                          }`}
                                        >
                                          <span
                                            className={`text-[9.5px] font-mono font-bold truncate tabular-nums ${
                                              isTopSelected ? 'text-amber-100' : 'text-emerald-300'
                                            }`}
                                          >
                                            {showBorderInTop
                                              ? `${isTopSelected ? '★ ' : ''}${borderCodeOnThisSlab} · ${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}"${borderFitsInLeftover ? '' : ' (!)'}`
                                              : `${topWasteIn}"×${safeSlabL}"`}
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {bottomWasteIn >= 0.1 && (() => {
                                      const showBorderInBottom =
                                        isBorderExtractedFromThisBmSlab && bottomWasteIn >= topWasteIn;
                                      const botStrip = borderPiecesOnThisSlab[0];
                                      const isBotSelected =
                                        showBorderInBottom && botStrip?.code === selectedFloorPieceCode;
                                      return (
                                        <div
                                          style={{
                                            left: '0%',
                                            top: `${Math.min(95, clampedY + pieceHeightPct)}%`,
                                            width: showBorderInBottom && botStrip
                                              ? `${Math.min(100, Math.max(20, (botStrip.lengthIn / Math.max(1, safeSlabL)) * 100))}%`
                                              : '100%',
                                            height: `${Math.max(5, bottomWastePct)}%`,
                                          }}
                                          className={`absolute z-20 border-t flex items-center justify-between px-1.5 pointer-events-none ${
                                            isBotSelected
                                              ? 'border-2 border-amber-300 bg-amber-500/45 ring-2 ring-amber-300/80'
                                              : showBorderInBottom
                                              ? 'border border-dashed border-emerald-300 bg-emerald-950/80'
                                              : 'border-dashed border-emerald-300/80 bg-slate-950/70'
                                          }`}
                                        >
                                          <span
                                            className={`text-[9.5px] font-mono font-bold truncate tabular-nums ${
                                              isBotSelected ? 'text-amber-100' : 'text-emerald-300'
                                            }`}
                                          >
                                            {showBorderInBottom
                                              ? `${isBotSelected ? '★ ' : ''}${borderCodeOnThisSlab} · ${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}"${borderFitsInLeftover ? '' : ' (!)'}`
                                              : `${bottomWasteIn}"×${safeSlabL}"`}
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {leftWasteIn >= 0.1 && (
                                      <div
                                        style={{
                                          left: '0%',
                                          top: `${clampedY}%`,
                                          width: `${Math.max(4, leftWastePct)}%`,
                                          height: `${pieceHeightPct}%`,
                                        }}
                                        className="absolute z-20 border-r border-dashed border-amber-300/80 bg-slate-950/75 flex items-center justify-center p-0.5 pointer-events-none"
                                      >
                                        <span className="text-[9px] font-mono font-bold text-amber-300 tabular-nums">
                                          {`${leftWasteIn}"`}
                                        </span>
                                      </div>
                                    )}

                                    {rightWasteIn >= 0.1 && (
                                      <div
                                        style={{
                                          left: `${Math.min(96, clampedX + pieceWidthPct)}%`,
                                          top: `${clampedY}%`,
                                          width: `${Math.max(4, rightWastePct)}%`,
                                          height: `${pieceHeightPct}%`,
                                        }}
                                        className="absolute z-20 border-l border-dashed border-amber-300/80 bg-slate-950/75 flex items-center justify-center p-0.5 pointer-events-none"
                                      >
                                        <span className="text-[9px] font-mono font-bold text-amber-300 tabular-nums">
                                          {`${rightWasteIn}"`}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* 3. DEDICATED BORDER SLAB CUTTING MARKINGS (Highlights exact clicked border strip) */}
                                {isDedicatedBorderSlab && !isMultiPiecePackedSlab && (
                                  <div className="absolute inset-1.5 z-20 flex flex-col gap-1 pointer-events-none">
                                    {(borderPiecesOnThisSlab.length > 0
                                      ? borderPiecesOnThisSlab
                                      : Array.from({ length: Math.min(4, stripsPerFullBorderSlab) }).map(
                                          (_, bIdx) => ({
                                            id: `fallback-${bIdx}`,
                                            code: `B${bIdx + 1}`,
                                            widthIn: effectiveOuterBorderIn,
                                            lengthIn: safeSlabL,
                                          })
                                        )
                                    ).map((bp) => {
                                      const isSelBorder = selectedFloorPieceCode === bp.code;
                                      return (
                                        <div
                                          key={bp.id}
                                          style={{
                                            width: `${Math.min(100, Math.max(20, (bp.lengthIn / Math.max(1, safeSlabL)) * 100))}%`,
                                          }}
                                          className={`flex-1 flex items-center px-2 transition-all ${
                                            isSelBorder
                                              ? 'border-2 border-amber-300 bg-amber-500/45 ring-2 ring-amber-300/80 shadow-lg'
                                              : 'border border-dashed border-white bg-slate-950/75'
                                          }`}
                                        >
                                          <span
                                            className={`text-[10.5px] font-mono font-bold tabular-nums truncate ${
                                              isSelBorder ? 'text-amber-100' : 'text-white'
                                            }`}
                                          >
                                            {`${isSelBorder ? '★ ' : ''}${bp.code} · ${bp.widthIn}"×${bp.lengthIn}"`}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* 4. SAW CUT PATHS + BLADE KERF CAD VECTOR OVERLAY */}
                                {sawCutSegments.length > 0 && (
                                  <svg
                                    viewBox={`0 0 ${safeSlabL} ${safeSlabW}`}
                                    preserveAspectRatio="none"
                                    className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
                                  >
                                    {sawCutSegments.map((seg) => {
                                      const isHorizontal = Math.abs(seg.y1 - seg.y2) < 0.05;
                                      const tagX = isHorizontal
                                        ? Math.max(10, safeSlabL - 2)
                                        : Math.min(safeSlabL - 2, seg.x1 + 1.2);
                                      const tagY = isHorizontal
                                        ? Math.max(4, seg.y1 - 1.1)
                                        : Math.max(5, (seg.y1 + seg.y2) / 2);
                                      return (
                                        <g key={`saw-${seg.step}`}>
                                          {/* Kerf Blade Width Ribbon */}
                                          <line
                                            x1={seg.x1}
                                            y1={seg.y1}
                                            x2={seg.x2}
                                            y2={seg.y2}
                                            stroke="#f43f5e"
                                            strokeOpacity="0.35"
                                            strokeWidth={kerfStrokeWidth}
                                          />
                                          {/* Sharp Saw Cut Centerline */}
                                          <line
                                            x1={seg.x1}
                                            y1={seg.y1}
                                            x2={seg.x2}
                                            y2={seg.y2}
                                            stroke="#fda4af"
                                            strokeWidth="0.7"
                                            strokeDasharray="2.5 1.5"
                                          />
                                          <text
                                            x={tagX}
                                            y={tagY}
                                            textAnchor={isHorizontal ? 'end' : 'start'}
                                            fill="#ffe4e6"
                                            stroke="#881337"
                                            strokeWidth="0.45"
                                            paintOrder="stroke"
                                            fontSize="3.2"
                                            fontFamily="monospace"
                                            fontWeight="900"
                                          >
                                            {`✂C${seg.step} (${seg.runIn}"·K${effectiveBladeKerfIn}")`}
                                          </text>
                                        </g>
                                      );
                                    })}
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* QUIET 1-LINE SUMMARY + SEND TO CUTTER UNDER COMPANION SLAB */}
                      <div className="pt-1 border-t border-slate-800/90 flex items-center justify-between gap-1.5 text-[10.5px] font-mono">
                        <span className="text-slate-300 truncate tabular-nums">
                          {`${activePieceLabel}: ${activePieceWIn}"×${activePieceLIn}" · ✂ ${totalSlabCutRunningIn}" R.In (Trim:${effectiveEdgeTrimIn}" · K:${effectiveBladeKerfIn}")`}
                        </span>
                        <button
                          type="button"
                          onClick={() => onApplyRoomPartsToCutter(buildRoomCutParts())}
                          className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Scissors className="h-3 w-3" />
                          <span>{tr('Cut', 'کٹنگ')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          );
        })()}
        </div>
      </div>

      {/* =====================================================================
          HORIZONTAL SCROLLABLE BOTTOM STOCK SLABS STRIP (EQUAL-SIZE UNIFORM CARDS)
         ===================================================================== */}
      {showSideStockDock && !isDiagramExpanded && (
        <div
          dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 space-y-2 shadow-xl print:hidden"
        >
          {/* Compact Header Row: Title + Room Slabs / Saved Lots Tabs + Search + Packing + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <Package className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-mono font-black text-white whitespace-nowrap">
                  {tr('STOCK SLABS', 'اسٹاک سلیبیں')}
                </span>
              </div>

              {/* Switch between Active Room Slabs, Exact Post-BM Leftovers & Saved Stock Lots */}
              <div className="flex items-center rounded bg-slate-950 border border-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setRightStockView('active_slabs')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    rightStockView === 'active_slabs'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tr(
                    `Room Slabs (${totalSameStockSlabsInList})`,
                    `کمرے کی سلیبیں (${totalSameStockSlabsInList})`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRightStockView('leftover_offcuts')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    rightStockView === 'leftover_offcuts'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  {tr(
                    `Leftovers (${livePostBmLeftovers.length})`,
                    `بچے ٹکڑے (${livePostBmLeftovers.length})`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRightStockView('saved_stock')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    rightStockView === 'saved_stock'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tr(
                    `Saved Lots (${savedStockLots.length})`,
                    `محفوظ اسٹاک (${savedStockLots.length})`
                  )}
                </button>
              </div>

              {rightStockView === 'saved_stock' && (
                <div className="relative">
                  <Search className="h-3 w-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder={tr('Search stock...', 'تلاش...')}
                    className="h-6 w-40 pl-6 bg-slate-950 border-slate-700 text-white text-[11px]"
                  />
                </div>
              )}

              {rawSideCutPieces.length > 0 && rightStockView === 'active_slabs' && (
                <div className="hidden md:flex items-center gap-1 rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5 text-[10.5px]">
                  <span className="text-cyan-300 font-bold whitespace-nowrap">
                    {tr('Pack:', 'سیٹنگ:')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSideCutPackingMode('pack_multi_per_slab')}
                    className={`px-1.5 py-0.2 rounded font-bold cursor-pointer whitespace-nowrap ${
                      sideCutPackingMode === 'pack_multi_per_slab'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tr(`Combined (${packedSideBins.length})`, `اکٹھے (${packedSideBins.length})`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideCutPackingMode('separate_slab_per_piece')}
                    className={`px-1.5 py-0.2 rounded font-bold cursor-pointer whitespace-nowrap ${
                      sideCutPackingMode === 'separate_slab_per_piece'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tr(`1 Pc (${rawSideCutPieces.length})`, `الگ (${rawSideCutPieces.length})`)}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden lg:inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-400">
                <Move className="h-3 w-3 text-sky-400" />
                {tr(
                  'Scroll left/right · Click to preview · Drag onto Floor',
                  'دائیں بائیں سکرول کریں · کلک کر کے دیکھیں · فرش پر ڈالیں'
                )}
              </span>
              {onBulkUploadSlabPhotos && (
                <button
                  type="button"
                  onClick={onBulkUploadSlabPhotos}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 border border-slate-700 text-sky-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Camera className="h-3 w-3" />
                  <span>{tr('Photos', 'تصاویر')}</span>
                </button>
              )}
              {onSaveCurrentSlabToStock && (
                <button
                  type="button"
                  onClick={onSaveCurrentSlabToStock}
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Save className="h-3 w-3" />
                  <span>{tr('Save Lot', 'سیو')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Scrollable Row — Equal-Size Cards */}
          <div className="flex flex-row items-stretch gap-2.5 overflow-x-auto pb-1.5 scroll-smooth">
            {rightStockView === 'active_slabs' ? (
              Array.from({ length: totalSameStockSlabsInList }).map((_, i) => {
                const sNum = i + 1;
                const sSt = getSlabState(sNum);
                const sImg = sSt.customImageUrl || slabImageUrl;
                const pLet = PIECE_LETTERS[i] || `S${sNum}`;
                const isBm = sNum <= totalBmPiecesCount;
                const assignedHere = piecesAssignedToStockSlab[sNum] || [];
                const pcsCount = (isBm ? 1 : 0) + assignedHere.length;
                const isActive = activeSlabIndex === sNum;
                const isDropHere = dragOverTargetKey === `slab-${sNum}`;
                return (
                  <div
                    key={sNum}
                    draggable
                    onDragStart={() =>
                      setDraggedStockItem({ kind: 'active_slab', slabNum: sNum })
                    }
                    onDragEnd={() => {
                      setDraggedStockItem(null);
                      setDragOverTargetKey(null);
                    }}
                    onDragOver={(e) => {
                      if (draggedStockItem?.kind === 'piece') {
                        e.preventDefault();
                        setDragOverTargetKey(`slab-${sNum}`);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverTargetKey === `slab-${sNum}`) {
                        setDragOverTargetKey(null);
                      }
                    }}
                    onDrop={(e) => handleDropPieceOntoTargetSlab(sNum, e)}
                    onClick={() => scrollToSpecificSlab(sNum)}
                    className={`w-40 shrink-0 rounded-lg border p-1.5 flex flex-col justify-between gap-1 cursor-grab active:cursor-grabbing transition-all ${
                      isDropHere
                        ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-400'
                        : isActive
                        ? 'border-amber-400 bg-slate-950 ring-1 ring-amber-400/60 shadow-lg'
                        : 'border-slate-800 bg-slate-950/85 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10.5px] font-mono">
                      <div className="flex items-center gap-1 min-w-0">
                        <GripVertical className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="font-black text-amber-300 shrink-0">
                          {isBm ? `S${sNum}(${pLet})` : `S${sNum}`}
                        </span>
                        <span className="text-slate-400 text-[10px] truncate tabular-nums">
                          {`${safeSlabW}"×${safeSlabL}"`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-300 tabular-nums shrink-0">
                        {pcsCount}
                      </span>
                    </div>

                    <div className="relative h-14 w-full rounded overflow-hidden border border-slate-700/80 shrink-0">
                      <img
                        src={sImg}
                        alt={`Slab ${sNum}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          perSlabFileInputRefs.current[sNum]?.click();
                        }}
                        className="absolute bottom-1 right-1 p-0.5 rounded bg-slate-950/90 hover:bg-sky-600 text-white border border-slate-600 cursor-pointer"
                        title={tr('Change Slab Photo', 'فوٹو بدلیں')}
                      >
                        <Camera className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <div className="text-[9.5px] font-mono text-slate-300 truncate">
                      {isBm
                        ? `${singleBmPieceWidthIn}"×${singleBmPieceLengthIn}"`
                        : ''}
                      {assignedHere.length > 0
                        ? `${isBm ? ' · ' : ''}${assignedHere
                            .map((p) => `${p.code}`)
                            .join(',')}`
                        : !isBm
                        ? tr('Border/Extra', 'بارڈر/ایکسٹرا')
                        : ''}
                    </div>
                  </div>
                );
              })
            ) : rightStockView === 'leftover_offcuts' ? (
              livePostBmLeftovers.length === 0 ? (
                <div className="w-full rounded border border-slate-800 bg-slate-950 py-3 text-center text-xs text-slate-400">
                  {tr('No leftover strips after Bookmatch cuts', 'بک میچ کٹنگ کے بعد کوئی اضافی ٹکڑا نہیں بچا')}
                </div>
              ) : (
                livePostBmLeftovers.map((lo) => {
                  const isHorizStrip = lo.side === 'top' || lo.side === 'bottom' || lo.side === 'side_packed_btm';
                  const relW = isHorizStrip
                    ? Math.max(16, Math.min(100, (lo.postBmLIn / Math.max(1, safeSlabL)) * 100))
                    : Math.max(14, Math.min(100, (lo.postBmWIn / Math.max(1, safeSlabL)) * 100));
                  const relH = isHorizStrip
                    ? Math.max(18, Math.min(100, (lo.postBmWIn / Math.max(1, safeSlabW)) * 100))
                    : Math.max(24, Math.min(100, (lo.postBmLIn / Math.max(1, safeSlabW)) * 100));
                  return (
                    <div
                      key={lo.id}
                      onClick={() => scrollToSpecificSlab(lo.slabNum)}
                      className={`w-44 shrink-0 rounded-lg border p-1.5 flex flex-col justify-between gap-1 cursor-pointer transition-all ${
                        lo.fitsOuterBorder
                          ? 'border-emerald-500/70 bg-slate-950 hover:border-emerald-400'
                          : 'border-slate-800 bg-slate-950/90 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="font-bold text-amber-300 truncate font-sans">
                          {cadLang === 'ur' ? lo.sideLabelUr : lo.sideLabelEn}
                        </span>
                        <span className="font-black text-white shrink-0 tabular-nums">
                          {`${lo.postBmWIn}"×${lo.postBmLIn}"`}
                        </span>
                      </div>

                      {/* True-Proportion Stone Offcut Preview relative to Parent Slab */}
                      <div className="relative h-14 w-full rounded border border-slate-800 bg-slate-900/90 flex items-center justify-center p-1 overflow-hidden">
                        <div
                          style={{ width: `${relW}%`, height: `${relH}%` }}
                          className="relative rounded-sm overflow-hidden border border-emerald-400/80 shadow"
                        >
                          <img
                            src={lo.imgUrl}
                            alt={lo.sideLabelEn}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {lo.fitsOuterBorder && (
                          <span className="absolute top-0.5 right-0.5 px-1 rounded bg-emerald-600/95 text-[9px] font-bold text-white">
                            {tr(`✓ Fits ${effectiveOuterBorderIn > 0 ? effectiveOuterBorderIn : 12}"`, `✓ بارڈر پورا`)}
                          </span>
                        )}
                      </div>

                      <div className="text-[9.5px] font-mono text-slate-300 truncate">
                        {lo.usedByBorderCodes.length > 0
                          ? tr(
                              `Used: ${lo.usedByBorderCodes.join(',')} · Free ${lo.netFreeWIn}"×${lo.netFreeLIn}"`,
                              `استعمال: ${lo.usedByBorderCodes.join(',')} · باقی ${lo.netFreeWIn}"×${lo.netFreeLIn}"`
                            )
                          : `${slabMaterialName} · ${tr('Free Cut Piece', 'بچت پیس')}`}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            handleAssignStockLotToZone('border', 'same_leftover');
                            scrollToSpecificSlab(lo.slabNum);
                          }}
                          className="flex-1 py-0.5 px-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('Use Border', 'بارڈر لگائیں')}
                        </button>
                        {onSaveWasteOffcutsToOptimizer && (
                          <button
                            type="button"
                            onClick={() =>
                              onSaveWasteOffcutsToOptimizer([
                                {
                                  materialName: `${slabMaterialName} (${tr('Leftover', 'بقیہ')})`,
                                  width: Math.max(1, lo.netFreeWIn),
                                  length: Math.max(1, lo.netFreeLIn),
                                  quantity: 1,
                                  ratePerSqFt: slabRatePerSqFt,
                                  slabImageUrl: lo.imgUrl,
                                  notes: cadLang === 'ur' ? lo.sideLabelUr : lo.sideLabelEn,
                                },
                              ])
                            }
                            className="py-0.5 px-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            {tr('Save', 'سیو')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : savedStockLots.length === 0 ? (
              <div className="w-full rounded border border-slate-800 bg-slate-950 py-3 text-center text-xs text-slate-400">
                {tr('No saved stock lots yet', 'کوئی اسٹاک محفوظ نہیں')}
              </div>
            ) : (
              savedStockLots
                .filter(
                  (st) =>
                    !stockSearchQuery.trim() ||
                    st.materialName.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                    st.lotId.toLowerCase().includes(stockSearchQuery.toLowerCase())
                )
                .map((st) => {
                  const lotUsage = lotUsageById[st.id];
                  const isShort = (lotUsage?.shortBy || 0) > 0;
                  const isAssigned = Boolean(lotUsage);
                  return (
                    <div
                      key={st.id}
                      draggable
                      onDragStart={() =>
                        setDraggedStockItem({ kind: 'saved_lot', lotId: st.id })
                      }
                      onDragEnd={() => {
                        setDraggedStockItem(null);
                        setDragOverTargetKey(null);
                      }}
                      className={`w-44 shrink-0 rounded-lg border p-1.5 flex flex-col justify-between gap-1 cursor-grab active:cursor-grabbing ${
                        isShort
                          ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/70'
                          : isAssigned
                          ? 'border-emerald-500/80 bg-slate-950'
                          : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10.5px] font-mono">
                        <div className="flex items-center gap-1 min-w-0">
                          <GripVertical className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="font-bold text-white truncate font-sans">
                            {st.materialName}
                          </span>
                        </div>
                        <span
                          className={`font-bold shrink-0 tabular-nums ${
                            isShort ? 'text-rose-300' : 'text-amber-300'
                          }`}
                        >
                          {lotUsage
                            ? isShort
                              ? `-${lotUsage.shortBy}`
                              : `${lotUsage.required}/${st.quantity}`
                            : `×${st.quantity}`}
                        </span>
                      </div>

                      <div className="relative h-14 w-full rounded overflow-hidden border border-slate-800 shrink-0">
                        <img
                          src={st.slabImageUrl}
                          alt={st.materialName}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-slate-950/90 text-[9.5px] font-mono font-bold text-amber-300 tabular-nums">
                          {st.width}&quot;×{st.length}&quot; · {st.lotId}
                        </span>
                        {lotUsage && (
                          <span
                            className={`absolute top-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                              isShort
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isShort
                              ? tr(`Short -${lotUsage.shortBy}`, `${lotUsage.shortBy} کم`)
                              : tr('OK ✓', 'پورا ✓')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAssignStockLotToZone('center', st.id)}
                          className="flex-1 py-0.5 px-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('Floor', 'فرش')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignStockLotToZone('border', st.id)}
                          className="flex-1 py-0.5 px-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('Border', 'بارڈر')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignStockLotToZone('patti', st.id)}
                          className="flex-1 py-0.5 px-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('Strip', 'پٹی')}
                        </button>
                        {onLoadSavedStockInSlabCutter && (
                          <button
                            type="button"
                            onClick={() => onLoadSavedStockInSlabCutter(st.id)}
                            className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                            title={tr('Open in Slab Cutter', 'کٹنگ آپٹیمائزر')}
                          >
                            <Scissors className="h-3 w-3" />
                          </button>
                        )}
                        {onAdjustSavedStockQty && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAdjustSavedStockQty(st.id, -1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdjustSavedStockQty(st.id, 1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </>
                        )}
                        {onDeleteSavedStockLot && (
                          <button
                            type="button"
                            onClick={() => onDeleteSavedStockLot(st.id)}
                            className="p-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 cursor-pointer"
                            title={tr('Delete Lot', 'ختم کریں')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM COMPACT AUTOCAD STRIP (نیچے پٹی: ROOM SIZE + NEXT ROOM + DWG/WASTE)
         ===================================================================== */}
      <div
        dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow print:hidden"
      >
        {/* Left Side of Bottom Strip: Room Size Inputs + Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono font-black text-amber-300 whitespace-nowrap">
            {tr('ROOM SIZE', 'کمرے کا سائز')}
          </span>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-xs">
            <span className="text-[10px] text-amber-300 font-bold">{tr('W:', 'چوڑائی:')}</span>
            <input
              type="number"
              min="4"
              max="100"
              value={roomWidthFt}
              onChange={(e) => setRoomWidthFt(Math.max(4, Number(e.target.value) || 4))}
              className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.2 text-center text-xs font-bold text-white tabular-nums"
              title={tr('Width (Feet)', 'چوڑائی (فٹ)')}
            />
            <span className="text-[10px] text-slate-400">ft</span>
            <input
              type="number"
              min="0"
              max="11"
              value={roomWidthExtraIn}
              onChange={(e) =>
                setRoomWidthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
              }
              className="w-9 bg-slate-900 border border-slate-700 rounded px-1 py-0.2 text-center text-xs font-bold text-slate-200 tabular-nums"
              title={tr('Extra Inches', 'انچ')}
            />
            <span className="text-[10px] text-slate-400">in</span>

            <span className="text-slate-600 px-0.5">×</span>

            <span className="text-[10px] text-sky-300 font-bold">{tr('L:', 'لمبائی:')}</span>
            <input
              type="number"
              min="4"
              max="100"
              value={roomLengthFt}
              onChange={(e) => setRoomLengthFt(Math.max(4, Number(e.target.value) || 4))}
              className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.2 text-center text-xs font-bold text-white tabular-nums"
              title={tr('Length (Feet)', 'لمبائی (فٹ)')}
            />
            <span className="text-[10px] text-slate-400">ft</span>
            <input
              type="number"
              min="0"
              max="11"
              value={roomLengthExtraIn}
              onChange={(e) =>
                setRoomLengthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
              }
              className="w-9 bg-slate-900 border border-slate-700 rounded px-1 py-0.2 text-center text-xs font-bold text-slate-200 tabular-nums"
              title={tr('Extra Inches', 'انچ')}
            />
            <span className="text-[10px] text-slate-400">in</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {[
              { w: 12, l: 14, label: "12'×14'" },
              { w: 14, l: 16, label: "14'×16'" },
              { w: 16, l: 20, label: "16'×20'" },
              { w: 19, l: 18, label: "19'×18'" },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setRoomWidthFt(preset.w);
                  setRoomLengthFt(preset.l);
                  setRoomWidthExtraIn(0);
                  setRoomLengthExtraIn(0);
                }}
                className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold border cursor-pointer ${
                  roomWidthFt === preset.w && roomLengthFt === preset.l
                    ? 'bg-amber-500 border-amber-300 text-slate-950'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono font-bold text-emerald-300 tabular-nums whitespace-nowrap">
            {totalRoomSqFt.toFixed(1)} ft²
          </span>
        </div>

        {/* Right Side of Bottom Strip: Room Name + Multi-Room Tabs + Next Room Button + Waste Bank Drawer */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="text"
            value={roomNameInput}
            onChange={(e) => setRoomNameInput(e.target.value)}
            placeholder={tr('Room Name', 'کمرے کا نام')}
            className="h-7 w-32 sm:w-40 bg-slate-950 border-slate-700 text-white text-xs font-bold"
          />

          <div className="flex items-center gap-1 overflow-x-auto max-w-[340px]">
            {roomsList.map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={() => handleSelectRoomProfile(rm)}
                className={`px-2 py-1 rounded text-[11px] font-bold border whitespace-nowrap cursor-pointer ${
                  activeRoomId === rm.id
                    ? 'bg-sky-600 border-sky-300 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}
                <span className="ml-1 text-[10px] font-mono text-amber-300">
                  {`${rm.roomWidthFt}'×${rm.roomLengthFt}'`}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddNewRoomProfile}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>{tr('+ Next Room', '+ اگلا کمرہ')}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setCenterCanvasTab((t) => (t === 'dwg_floor_editor' ? 'dual' : 'dwg_floor_editor'))
            }
            className={`px-2 py-1 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              centerCanvasTab === 'dwg_floor_editor'
                ? 'bg-amber-500 border-amber-300 text-slate-950'
                : 'bg-slate-950 border-slate-700 text-amber-300 hover:bg-slate-800'
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>{tr('.DWG / 2D Plan', 'نقشہ / DWG')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWasteBankDrawer((v) => !v)}
            className={`px-2 py-1 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              showWasteBankDrawer
                ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                : 'bg-slate-950 border-slate-700 text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>{tr(`Waste (${buildRoomWasteOffcuts().length})`, `بچت (${buildRoomWasteOffcuts().length})`)}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          COLLAPSIBLE REMAINING / WASTE PIECES BANK DRAWER
         ===================================================================== */}
      {showWasteBankDrawer && (
        <div
          dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
          className="rounded-xl border border-emerald-500/60 bg-slate-900 p-3 space-y-3 shadow-xl print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-emerald-300">
                {tr('WASTE / REMAINING PIECES BANK', 'بچے ہوئے ویسٹ پیسز کا بینک')}
              </span>
              <span className="text-xs text-slate-300">
                {tr(
                  'Save & reuse leftover marble pieces in next room, border, or slab cutter',
                  'بقیہ پیس محفوظ کریں اور اگلے کمرے، بارڈر یا کٹنگ آپٹیمائزر میں استعمال کریں'
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onSaveWasteOffcutsToOptimizer && buildRoomWasteOffcuts().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const wasteList = buildRoomWasteOffcuts();
                    onSaveWasteOffcutsToOptimizer(
                      wasteList.map((w) => ({
                        materialName: `${slabMaterialName} (${roomNameInput} Waste)`,
                        width: w.widthIn,
                        length: w.lengthIn,
                        quantity: w.quantity,
                        ratePerSqFt: Math.round((slabRatePerSqFt || 480) * 0.75),
                        slabImageUrl,
                        notes: `${w.sourceLabelEn} — Next Use: ${w.nextUseEn}`,
                      }))
                    );
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{tr('Save All to Bank', 'سب بینک میں سیو')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowWasteBankDrawer(false)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>
                  {tr(`Leftover Pieces (${roomNameInput})`, `بچت پیسز (${roomNameInput})`)}
                </span>
                <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
                  {buildRoomWasteOffcuts().reduce((s, x) => s + x.quantity, 0)} {tr('Pcs', 'پیس')}
                </span>
              </div>

              {buildRoomWasteOffcuts().length === 0 ? (
                <div className="rounded bg-slate-900 border border-emerald-500/30 p-3 text-center text-xs font-bold text-emerald-300">
                  {tr('100% Full Slabs Used — Zero Waste', '100% پوری سلیبیں استعمال ہو رہی ہیں')}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {buildRoomWasteOffcuts().map((w) => (
                    <div
                      key={w.id}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-black text-emerald-300 tabular-nums">
                            {w.widthIn}&quot;×{w.lengthIn}&quot;
                          </span>
                          <span className="text-amber-300 font-bold">×{w.quantity}</span>
                          <span className="text-sky-300 text-[11px]">{w.totalSqFt} ft²</span>
                        </div>
                        <div className="text-[11px] font-bold text-white truncate">
                          {tr(w.sourceLabelEn, w.sourceLabelUr)}
                        </div>
                        <div className="text-[10px] text-emerald-300 truncate">
                          {tr('Next:', 'اگلا استعمال:')} {tr(w.nextUseEn, w.nextUseUr)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        {onSaveWasteOffcutsToOptimizer && (
                          <button
                            type="button"
                            onClick={() =>
                              onSaveWasteOffcutsToOptimizer([
                                {
                                  materialName: `${slabMaterialName} (${roomNameInput} Waste)`,
                                  width: w.widthIn,
                                  length: w.lengthIn,
                                  quantity: w.quantity,
                                  ratePerSqFt: Math.round((slabRatePerSqFt || 480) * 0.75),
                                  slabImageUrl,
                                  notes: `${w.sourceLabelEn} — Next Use: ${w.nextUseEn}`,
                                },
                              ])
                            }
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {tr('Save', 'سیو')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setHasOuterBorder(true);
                            setBorderSlabSource('from_custom_border_stock_slab');
                            setBorderSlabMaterialName(`${slabMaterialName} Waste`);
                            setBorderSlabWidthIn(w.widthIn);
                            setBorderSlabLengthIn(w.lengthIn);
                            setBorderSlabQty(w.quantity);
                            setBorderSlabImageUrl(slabImageUrl);
                            if (w.widthIn >= 4 && w.widthIn <= 24) {
                              setOuterBorderWidthIn(Math.round(w.widthIn));
                            }
                          }}
                          className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          {tr('Border', 'بارڈر')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddNewRoomProfile();
                            onUpdateSlabConfig({
                              materialName: `${slabMaterialName} (Saved Waste)`,
                              width: w.widthIn,
                              length: w.lengthIn,
                              quantity: w.quantity,
                            });
                          }}
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          {tr('Next Room', 'اگلا کمرہ')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                <span>{tr('Saved Stock & Offcut Bank', 'آپٹیمائزر میں محفوظ اسٹاک')}</span>
                <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                  {savedStockLots.length} {tr('Lots', 'لاٹس')}
                </span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {savedStockLots.map((st) => {
                  const rec = getRecommendedNextUseForWaste(st.width, st.length);
                  return (
                    <div
                      key={st.id}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="font-black text-amber-300 tabular-nums">
                            {st.width}&quot;×{st.length}&quot;
                          </span>
                          <span className="text-white font-bold">×{st.quantity}</span>
                          <span className="text-slate-300 font-sans truncate">{st.materialName}</span>
                        </div>
                        <div className="text-[10px] text-emerald-300 truncate">
                          {tr(rec.en, rec.ur)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSlabConfig({
                              materialName: st.materialName,
                              width: st.width,
                              length: st.length,
                              quantity: st.quantity,
                              ratePerSqFt: st.ratePerSqFt,
                            })
                          }
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          {tr('Floor', 'فرش')}
                        </button>
                        {onLoadSavedStockInSlabCutter && (
                          <button
                            type="button"
                            onClick={() => onLoadSavedStockInSlabCutter(st.id)}
                            className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {tr('Cut', 'کاٹیں')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
