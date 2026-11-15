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

interface RoomFloorBookmatchPlannerProps {
  cadLang: 'en' | 'ur';
  slabImageUrl: string;
  slabMaterialName: string;
  slabWidthIn: number;
  slabLengthIn: number;
  slabQuantity: number;
  slabRatePerSqFt: number;
  bladeKerfIn?: number;
  edgeTrimIn?: number;
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
  slabWidthIn,
  slabLengthIn,
  slabQuantity,
  slabRatePerSqFt,
  bladeKerfIn = 0.15,
  edgeTrimIn = 0,
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
  // 2. BORDER SLAB + PATTI SLAB UPLOAD & SIZE SYSTEM
  // =========================================================================
  const [hasOuterBorder, setHasOuterBorder] = useState<boolean>(true);
  const [outerBorderWidthIn, setOuterBorderWidthIn] = useState<number>(15);
  const [borderSlabSource, setBorderSlabSource] = useState<BorderSlabSourceMode>(
    'from_bm_slabs_leftover'
  );
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

  // Contrast Patti Slab Upload & Size State
  const [hasContrastPatti, setHasContrastPatti] = useState<boolean>(true);
  const [contrastPattiWidthIn, setContrastPattiWidthIn] = useState<number>(6);
  const [contrastMarbleType, setContrastMarbleType] =
    useState<ContrastMarbleType>('emperador_brown');
  const [pattiCustomSlabImageUrl, setPattiCustomSlabImageUrl] = useState<string | null>(null);
  const [pattiSlabMaterialName, setTwinPattiSlabName] = useState<string>(
    'Emperador Brown Patti Slab'
  );
  const [pattiSlabWidthIn, setPattiSlabWidthIn] = useState<number>(48);
  const [pattiSlabLengthIn, setPattiSlabLengthIn] = useState<number>(96);
  const [pattiSlabQty] = useState<number>(1);
  const [pattiSlabRate, setPattiSlabRate] = useState<number>(550);
  const [showPattiSlabDrawer, setShowPattiSlabDrawer] = useState<boolean>(false);

  const [hasBrassPatti, setHasBrassPatti] = useState<boolean>(true);
  const [brassPattiSizeIn] = useState<number>(0.25);
  const [doubleBrassPatti] = useState<boolean>(true);

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
  const [chaurasPurePreview, setChaurasPurePreview] = useState<boolean>(false);

  const [selectedRoomZone, setSelectedRoomZone] = useState<
    'center_bookmatch' | 'contrast_patti' | 'outer_border'
  >('center_bookmatch');
  const [showBlueprintCadLines, setShowBlueprintCadLines] = useState<boolean>(true);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [diagramZoomPct, setDiagramZoomPct] = useState<number>(100);
  const [showAllSlabsList, setShowAllSlabsList] = useState<boolean>(false);

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
      borderSlabImageUrl?: string;
      isBorderCustomUploaded?: boolean;
      hasContrastPatti?: boolean;
      contrastPattiWidthIn?: number;
      contrastMarbleType?: ContrastMarbleType;
      pattiCustomSlabImageUrl?: string | null;
      perSlabStates?: Record<number, IndividualSlabBookmatchState>;
      houseMapFileName?: string | null;
      houseMapImageUrl?: string | null;
      houseMapCadLines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
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
          if (data.borderSlabImageUrl) setBorderSlabImageUrl(data.borderSlabImageUrl);
          if (typeof data.isBorderCustomUploaded === 'boolean')
            setIsBorderCustomUploaded(data.isBorderCustomUploaded);
          if (typeof data.hasContrastPatti === 'boolean') setHasContrastPatti(data.hasContrastPatti);
          if (typeof data.contrastPattiWidthIn === 'number')
            setContrastPattiWidthIn(data.contrastPattiWidthIn);
          if (data.contrastMarbleType) setContrastMarbleType(data.contrastMarbleType);
          if (data.pattiCustomSlabImageUrl !== undefined)
            setPattiCustomSlabImageUrl(data.pattiCustomSlabImageUrl);
          if (data.perSlabStates && Object.keys(data.perSlabStates).length > 0) {
            setPerSlabStates(data.perSlabStates);
          }
          if (data.houseMapFileName !== undefined) setHouseMapFileName(data.houseMapFileName);
          if (data.houseMapImageUrl !== undefined) setHouseMapImageUrl(data.houseMapImageUrl);
          if (Array.isArray(data.houseMapCadLines)) setHouseMapCadLines(data.houseMapCadLines);
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
      borderSlabImageUrl,
      isBorderCustomUploaded,
      hasContrastPatti,
      contrastPattiWidthIn,
      contrastMarbleType,
      pattiCustomSlabImageUrl,
      perSlabStates,
      houseMapFileName,
      houseMapImageUrl,
      houseMapCadLines,
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
    borderSlabImageUrl,
    isBorderCustomUploaded,
    hasContrastPatti,
    contrastPattiWidthIn,
    contrastMarbleType,
    pattiCustomSlabImageUrl,
    perSlabStates,
    houseMapFileName,
    houseMapImageUrl,
    houseMapCadLines,
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
    if (!draggingMapRoomId || !houseMapBoxRef.current) return;
    const rect = houseMapBoxRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
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

  const bmRows =
    slabPlacementMode === 'equal_all_pieces'
      ? Math.max(customGridRows, minEqualRowsForStock)
      : Math.max(1, customGridRows);
  const bmCols =
    slabPlacementMode === 'equal_all_pieces'
      ? Math.max(customGridCols, minEqualColsForStock)
      : Math.max(1, customGridCols);
  const totalBmPiecesCount = bmRows * bmCols;

  // Raw piece size if the room inner floor is divided equally by bmRows × bmCols
  const rawUncappedBmPieceWidthIn = Number((innerFloorWidthIn / bmRows).toFixed(2));
  const rawUncappedBmPieceLengthIn = Number((innerFloorLengthIn / bmCols).toFixed(2));

  // CRITICAL: A single piece cut from a stock slab can NEVER exceed maxBmWidthAllowedOnSlab × safeSlabL!
  // When Outer Border is ON ('from_bm_slabs_leftover'), maxBmWidthAllowedOnSlab automatically leaves effectiveOuterBorderIn on the same slab!
  const singleBmPieceWidthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? Number(Math.min(maxBmWidthAllowedOnSlab, rawUncappedBmPieceWidthIn).toFixed(2))
      : Number(Math.min(maxBmWidthAllowedOnSlab, rawUncappedBmPieceWidthIn).toFixed(2));
  const singleBmPieceLengthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? Number(Math.min(safeSlabL, rawUncappedBmPieceLengthIn).toFixed(2))
      : Number(Math.min(safeSlabL, rawUncappedBmPieceLengthIn).toFixed(2));

  // Actual Bookmatch / Full-Slabs area covered by the main grid (e.g. 120" × 208" for 4 slabs of 60"×104")
  const centerMedallionWidthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? innerFloorWidthIn
      : Number((singleBmPieceWidthIn * bmRows).toFixed(2));
  const centerMedallionLengthIn =
    slabPlacementMode === 'equal_all_pieces'
      ? innerFloorLengthIn
      : Number((singleBmPieceLengthIn * bmCols).toFixed(2));
  const centerMedallionSqFt = (centerMedallionWidthIn * centerMedallionLengthIn) / 144;

  // =========================================================================
  // AUTOMATIC SIDE CUT-PIECES (سائیڈوں کے کٹ پیس):
  // =========================================================================
  const remainingSideWidthTotalIn =
    slabPlacementMode === 'equal_all_pieces'
      ? 0
      : Math.max(0, Number((innerFloorWidthIn - centerMedallionWidthIn).toFixed(2)));
  const remainingSideLengthTotalIn =
    slabPlacementMode === 'equal_all_pieces'
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

  // Calculate how many Extra Stock Slabs (safeSlabW × safeSlabL) are required for the Side Cut-Pieces
  const tbPcsPerSlabW =
    sideCutPieceActualWidthIn > 0
      ? Math.max(1, Math.floor(safeSlabW / sideCutPieceActualWidthIn))
      : 1;
  const tbPcsPerSlabL = Math.max(1, Math.floor(safeSlabL / Math.max(1, singleBmPieceLengthIn)));
  const tbPiecesPerSingleSlab = tbPcsPerSlabW * tbPcsPerSlabL;

  const slabsForTopBottomSideCuts =
    topBottomSideCutQty > 0 ? Math.ceil(topBottomSideCutQty / tbPiecesPerSingleSlab) : 0;

  // Leftover strip width remaining on each Top/Bottom Side Cut Slab (e.g. 60" - 54" = 6" × 104" on Slabs #5-#8)
  const leftoverWOnTopBottomSlabs =
    slabsForTopBottomSideCuts > 0
      ? Number(Math.max(0, safeSlabW - tbPcsPerSlabW * sideCutPieceActualWidthIn).toFixed(2))
      : 0;

  // Check if Left/Right Side Cut strips fit inside the leftover strips of Top/Bottom Side Cut Slabs
  const lrStripsPerTbSlabLeftover =
    leftRightPieceActualWidthIn > 0 && leftoverWOnTopBottomSlabs >= leftRightPieceActualWidthIn
      ? Math.floor(leftoverWOnTopBottomSlabs / leftRightPieceActualWidthIn)
      : 0;
  const lrPiecesExtractedFromTbSlabs =
    lrStripsPerTbSlabLeftover *
    slabsForTopBottomSideCuts *
    Math.max(1, Math.floor(safeSlabL / Math.max(1, singleBmPieceWidthIn)));

  const remainingLrPiecesNeeded = Math.max(0, leftRightSideCutQty - lrPiecesExtractedFromTbSlabs);
  const lrStripsPerFullSlab =
    leftRightPieceActualWidthIn > 0
      ? Math.max(1, Math.floor(safeSlabW / leftRightPieceActualWidthIn))
      : 1;
  const lrPiecesPerFullSlab =
    lrStripsPerFullSlab * Math.max(1, Math.floor(safeSlabL / Math.max(1, singleBmPieceWidthIn)));
  const slabsForLeftRightSideCuts =
    leftRightSideCutQty > 0
      ? Math.max(1, Math.ceil(Math.max(1, remainingLrPiecesNeeded) / lrPiecesPerFullSlab))
      : 0;

  const sideCutExtraSlabsNeeded = slabsForTopBottomSideCuts + slabsForLeftRightSideCuts;
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

  const borderLinearInPerBmSlab =
    borderSlabSource === 'from_bm_slabs_leftover' && effectiveOuterBorderIn > 0
      ? Math.max(
          safeSlabL + singleBmPieceWidthIn,
          Math.ceil(totalBorderLinearIn / Math.max(1, totalBmPiecesCount))
        )
      : 0;

  const totalBorderExtractedFromBmSlabsIn = Math.min(
    totalBorderLinearIn,
    borderLinearInPerBmSlab * totalBmPiecesCount
  );
  const remainingBorderLinearInForExtraSlabs = Math.max(
    0,
    totalBorderLinearIn - totalBorderExtractedFromBmSlabsIn
  );

  const activeBorderSlabW =
    borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabWidthIn : safeSlabW;
  const activeBorderSlabL =
    borderSlabSource === 'from_custom_border_stock_slab' ? borderSlabLengthIn : safeSlabL;
  const stripsPerFullBorderSlab =
    effectiveOuterBorderIn > 0
      ? Math.max(1, Math.floor(activeBorderSlabW / effectiveOuterBorderIn))
      : 0;
  const linearInPerFullBorderSlab = stripsPerFullBorderSlab * activeBorderSlabL;

  const extraBorderSlabsNeeded =
    effectiveOuterBorderIn <= 0 || borderSlabSource === 'from_bm_slabs_leftover'
      ? 0
      : Math.ceil(totalBorderLinearIn / Math.max(1, linearInPerFullBorderSlab));

  // Strictly match the exact required slabs for this room so no fake extra "Border Slab #5/#6" ever appears
  const totalSameStockSlabsInList = Math.max(
    totalBmPiecesCount,
    totalBmPiecesCount +
      sideCutExtraSlabsNeeded +
      (borderSlabSource === 'from_separate_same_stock_slabs' ? extraBorderSlabsNeeded : 0)
  );

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

  // Unified Per-Slab Piece & 4-Side Waste Calculator (Works for Center Bookmatch Slabs AND Extra/Side-Cut Slabs down to 0.5"!)
  const getSlabPieceMetrics = (slabNum: number) => {
    const slabSt = getSlabState(slabNum);
    const isUsedInBookmatch = slabNum <= totalBmPiecesCount;
    const isSideCutStockSlab = !isUsedInBookmatch && slabNum <= totalBookmatchAndSideSlabsCount;
    const sideSlabIdx = slabNum - totalBmPiecesCount - 1;
    const isTopBottomSideSlab = isSideCutStockSlab && sideSlabIdx < slabsForTopBottomSideCuts;

    const defaultWIn = isUsedInBookmatch
      ? singleBmPieceWidthIn
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
          patch.rotationDeg !== undefined)
      ) {
        for (let i = 1; i <= totalSameStockSlabsInList; i++) {
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

  const scrollToSpecificSlab = (slabNum: number) => {
    setActiveSlabIndex(slabNum);
    const el = slabCardRefs.current[slabNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSlabPointerMove = (slabNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingSlabNum !== slabNum) return;
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

  const handleRoomPieceMouseDown = (
    slotIdx: number,
    slabNum: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    setActiveSlabIndex(slabNum);
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

    // Emit each Bookmatch Piece paired to its exact Stock Slab #1..#N so Leftover Border Pieces stay on the SAME slab!
    for (let s = 1; s <= totalBmPiecesCount; s++) {
      const pLetter = PIECE_LETTERS[s - 1] || `P${s}`;
      list.push({
        label: `S${s} (${pLetter}) · ${pairedBmW}"×${pairedBmL}"`,
        widthIn: pairedBmW,
        lengthIn: pairedBmL,
        quantity: 1,
        isBookmatch: true,
        zone: 'center_bookmatch',
        color: '#0284C7',
        targetSlabNumber: s,
      });

      if (effectiveOuterBorderIn > 0 && borderSlabSource === 'from_bm_slabs_leftover') {
        const fitBorderLenA = Number(
          Math.min(halfTopBottomBorderLenIn, Math.max(12, safeSlabL - safeKerfAllowance)).toFixed(1)
        );
        list.push({
          label: `Border B${s}-A · ${effectiveOuterBorderIn}"×${fitBorderLenA}"`,
          widthIn: effectiveOuterBorderIn,
          lengthIn: fitBorderLenA,
          quantity: 1,
          isBookmatch: false,
          zone: 'outer_border',
          color: '#10B981',
          targetSlabNumber: s,
        });

        const remRightLenOnSlab = safeSlabL - pairedBmL - safeKerfAllowance;
        if (remRightLenOnSlab >= effectiveOuterBorderIn) {
          const fitBorderLenB = Number(
            Math.min(halfSideBorderLenIn, Math.max(12, pairedBmW - safeKerfAllowance)).toFixed(1)
          );
          list.push({
            label: `Border B${s}-B · ${effectiveOuterBorderIn}"×${fitBorderLenB}"`,
            widthIn: effectiveOuterBorderIn,
            lengthIn: fitBorderLenB,
            quantity: 1,
            isBookmatch: false,
            zone: 'outer_border',
            color: '#059669',
            targetSlabNumber: s,
          });
        }
      }
    }

    // Automatic Side Cut-Pieces when Room Inner Area > Center Bookmatch Slabs
    if (topBottomSideCutQty > 0) {
      list.push({
        label: `Side Cut TB · ${sideCutPieceActualWidthIn}"×${singleBmPieceLengthIn}"`,
        widthIn: sideCutPieceActualWidthIn,
        lengthIn: singleBmPieceLengthIn,
        quantity: topBottomSideCutQty,
        isBookmatch: false,
        zone: 'center_bookmatch',
        color: '#0EA5E9',
      });
    }

    if (leftRightSideCutQty > 0) {
      list.push({
        label: `Side Cut LR · ${leftRightPieceActualWidthIn}"×${singleBmPieceWidthIn}"`,
        widthIn: leftRightPieceActualWidthIn,
        lengthIn: singleBmPieceWidthIn,
        quantity: leftRightSideCutQty,
        isBookmatch: false,
        zone: 'center_bookmatch',
        color: '#14B8A6',
      });
    }

    if (cornerCutQty > 0) {
      list.push({
        label: `Corner SC · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`,
        widthIn: cornerPieceWidthIn,
        lengthIn: cornerPieceLengthIn,
        quantity: cornerCutQty,
        isBookmatch: false,
        zone: 'center_bookmatch',
        color: '#0D9488',
      });
    }

    if (effectiveContrastPattiIn > 0) {
      list.push(
        {
          label: `Strip L · ${effectiveContrastPattiIn}"×${Number(
            (innerFloorLengthIn + effectiveContrastPattiIn * 2).toFixed(1)
          )}"`,
          widthIn: effectiveContrastPattiIn,
          lengthIn: Number((innerFloorLengthIn + effectiveContrastPattiIn * 2).toFixed(1)),
          quantity: 2,
          isBookmatch: false,
          zone: 'contrast_patti',
          color: '#D97706',
        },
        {
          label: `Strip W · ${effectiveContrastPattiIn}"×${Number(innerFloorWidthIn.toFixed(1))}"`,
          widthIn: effectiveContrastPattiIn,
          lengthIn: Number(innerFloorWidthIn.toFixed(1)),
          quantity: 2,
          isBookmatch: false,
          zone: 'contrast_patti',
          color: '#B45309',
        }
      );
    }

    if (effectiveOuterBorderIn > 0 && borderSlabSource !== 'from_bm_slabs_leftover') {
      list.push(
        {
          label: `Border L · ${effectiveOuterBorderIn}"×${Number(totalRoomLengthIn.toFixed(1))}"`,
          widthIn: effectiveOuterBorderIn,
          lengthIn: Number(totalRoomLengthIn.toFixed(1)),
          quantity: 2,
          isBookmatch: false,
          zone: 'outer_border',
          color: '#10B981',
        },
        {
          label: `Border W · ${effectiveOuterBorderIn}"×${Number(
            (totalRoomWidthIn - effectiveOuterBorderIn * 2).toFixed(1)
          )}"`,
          widthIn: effectiveOuterBorderIn,
          lengthIn: Number((totalRoomWidthIn - effectiveOuterBorderIn * 2).toFixed(1)),
          quantity: 2,
          isBookmatch: false,
          zone: 'outer_border',
          color: '#059669',
        }
      );
    }

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

    // Per-Slab 4-Side Exact Waste Calculation (Includes even 0.5" or 1" offcuts on Top, Bottom, Left, Right!)
    for (let s = 1; s <= totalBookmatchAndSideSlabsCount; s++) {
      const m = getSlabPieceMetrics(s);
      const isBm = s <= totalBmPiecesCount;
      const pLet = PIECE_LETTERS[s - 1] || `S${s}`;
      const slabTitleEn = isBm ? `Bookmatch Slab #${s} (${pLet})` : `Side-Cut Slab #${s}`;
      const slabTitleUr = isBm ? `بک میچ سلیب #${s} (${pLet})` : `سائیڈ کٹ سلیب #${s}`;

      // 1. Top Waste Strip (even down to 0.5")
      if (m.topWasteIn >= 0.5 && safeSlabL >= 4) {
        const rec = getRecommendedNextUseForWaste(m.topWasteIn, safeSlabL);
        wasteItems.push({
          id: `waste-slab-${s}-top`,
          sourceLabelEn: `${slabTitleEn} — Top Saved Strip`,
          sourceLabelUr: `${slabTitleUr} — اوپر والا بچت پیس`,
          widthIn: m.topWasteIn,
          lengthIn: safeSlabL,
          quantity: 1,
          totalSqFt: Number(((m.topWasteIn * safeSlabL) / 144).toFixed(2)),
          nextUseEn: rec.en,
          nextUseUr: rec.ur,
        });
      }

      // 2. Bottom Waste Strip (accounting for Border piece if extracted from Bottom strip of BM slab)
      const borderDeductW =
        isBm &&
        borderSlabSource === 'from_bm_slabs_leftover' &&
        effectiveOuterBorderIn > 0 &&
        m.bottomWasteIn >= effectiveOuterBorderIn
          ? effectiveOuterBorderIn
          : 0;
      const netBottomWasteW = Number(Math.max(0, m.bottomWasteIn - borderDeductW).toFixed(1));
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

    // 3. Remaining Waste from Extra Dedicated Border Slabs (if any)
    if (extraBorderSlabsNeeded > 0 && effectiveOuterBorderIn > 0) {
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
  // (مکمل پی ڈی ایف جس میں فلور ڈایاگرام، تمام سلیب کٹنگ، کارآمد پیسز اور ویسٹ پیسز کا اگلا استعمال شامل ہے)
  // =========================================================================
  const handleDownloadStandaloneRoomPdfReport = () => {
    const partsForTable = buildRoomCutParts();
    const wasteForTable = buildRoomWasteOffcuts();
    const styleTitle = tr(currentStyleMeta.labelEn, currentStyleMeta.labelUr);
    const isRtl = cadLang === 'ur';

    const roomPartsRowsHtml = partsForTable
      .map((pt, i) => {
        const sqFt = (((pt.widthIn * pt.lengthIn) / 144) * pt.quantity).toFixed(2);
        const cutRunIn = Math.round((pt.widthIn + pt.lengthIn) * 2 * pt.quantity);
        return `
          <tr>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">U-${i + 1}</td>
            <td style="padding:7px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${pt.label}</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:900;color:#0369a1;">${pt.widthIn}" × ${pt.lengthIn}"</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">${pt.quantity} Pcs</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;color:#b91c1c;font-weight:bold;">${cutRunIn}" R.In</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#047857;">${sqFt} Sq.Ft</td>
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
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#b45309;">W-${idx + 1}</td>
            <td style="padding:7px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${
              isRtl ? w.sourceLabelUr : w.sourceLabelEn
            }</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:900;color:#b45309;">${w.widthIn}" × ${w.lengthIn}"</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;">${w.quantity} Pcs</td>
            <td style="padding:7px;border:1.5px solid #0f172a;text-align:center;font-family:monospace;font-weight:bold;color:#047857;">${w.totalSqFt} Sq.Ft</td>
            <td style="padding:7px;border:1.5px solid #0f172a;font-weight:bold;color:#0f172a;">${
              isRtl ? w.nextUseUr : w.nextUseEn
            }</td>
          </tr>
        `
            )
            .join('');

    // Separate 2D AutoCAD Visual Cards for Each Slab (Showing USED Piece vs WASTE Piece Separately on White CAD Paper!)
    const allSlabsCardsHtml = Array.from({ length: totalBookmatchAndSideSlabsCount })
      .map((_, idx) => {
        const sNum = idx + 1;
        const pLet = PIECE_LETTERS[idx] || `S${sNum}`;
        const isBm = sNum <= totalBmPiecesCount;
        const usedW = isBm ? singleBmPieceWidthIn : sideCutPieceActualWidthIn;
        const usedL = singleBmPieceLengthIn;
        const remW = isBm ? rawLeftoverWIn : leftoverWOnTopBottomSlabs;
        const cutRunIn = Math.round(
          (remW > 0 ? safeSlabL : 0) + (usedL < safeSlabL ? usedW : 0)
        );
        return `
          <div style="border:2px solid #0f172a;border-radius:6px;padding:8px;background:#ffffff;color:#0f172a;">
            <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:11px;margin-bottom:6px;border-bottom:1.5px solid #0f172a;padding-bottom:4px;">
              <strong>📐 SLAB #${sNum} (${safeSlabW}"×${safeSlabL}")</strong>
              <span style="color:#b91c1c;font-weight:bold;">✂️ Cut: ${cutRunIn}" R.In</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <!-- SEPARATE BOX 1: USED PIECE -->
              <div style="border:2px solid #0284c7;background:#ffffff;padding:6px;border-radius:4px;text-align:center;font-family:monospace;">
                <div style="font-size:9.5px;font-weight:900;color:#0369a1;border-bottom:1px solid #cbd5e1;padding-bottom:2px;margin-bottom:4px;">
                  ✅ USED PIECE (${isBm ? pLet : `SC-${sNum - totalBmPiecesCount}`})
                </div>
                <div style="border:2px solid #0f172a;background:#ffffff;padding:8px 4px;font-size:11px;font-weight:900;color:#0f172a;">
                  |&lt;-- ${usedW}" × ${usedL}" --&gt;|
                </div>
              </div>
              <!-- SEPARATE BOX 2: REMAINING WASTE PIECE -->
              <div style="border:2px dashed #b45309;background:repeating-linear-gradient(45deg,rgba(217,119,6,0.12),rgba(217,119,6,0.12) 5px,#ffffff 5px,#ffffff 10px);padding:6px;border-radius:4px;text-align:center;font-family:monospace;">
                <div style="font-size:9.5px;font-weight:900;color:#92400e;background:#ffffff;border-bottom:1px solid #fcd34d;padding-bottom:2px;margin-bottom:4px;">
                  ♻️ WASTE PIECE (SLAB #${sNum})
                </div>
                ${
                  remW > 0
                    ? `<div style="border:1.5px dashed #b45309;background:#ffffff;padding:8px 4px;font-size:11px;font-weight:900;color:#92400e;">
                        |&lt;-- ${remW}" × ${safeSlabL}" --&gt;|
                      </div>`
                    : `<div style="background:#ffffff;padding:8px 4px;font-size:10px;font-weight:bold;color:#047857;">
                        0" Waste (100% Used)
                      </div>`
                }
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Pure White 2D AutoCAD Floor Grid HTML for Page 1 of Report
    const floorCellsHtml = Array.from({ length: totalBmPiecesCount })
      .map((_, idx) => {
        const pLet = PIECE_LETTERS[idx] || `P${idx + 1}`;
        const rIdx = Math.floor(idx / bmCols);
        const cIdx = idx % bmCols;
        const diagArrow = (rIdx + cIdx) % 2 === 0 ? '⟋' : '⟍';
        return `<div style="border:2px solid #0f172a;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#0f172a;position:relative;">
          <div style="font-size:16px;color:#0284c7;font-weight:bold;line-height:1;">${diagArrow}</div>
          <div style="font-weight:900;color:#0f172a;font-size:12px;">USED SLAB #${idx + 1} (${pLet})</div>
          <div style="font-size:11px;color:#0369a1;font-weight:bold;margin-top:2px;">|&lt;-- ${singleBmPieceWidthIn}" × ${singleBmPieceLengthIn}" --&gt;|</div>
        </div>`;
      })
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="${cadLang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <title>${roomNameInput} - 2D AutoCAD Room Bookmatch, Used Pieces & Waste PDF</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 14px; background: #ffffff; color: #0f172a; }
    .sheet { max-width: 1120px; margin: 0 auto 18px auto; background: #ffffff; border: 3px solid #0f172a; padding: 16px; page-break-after: always; }
    .sheet:last-of-type { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; padding: 10px 12px; margin-bottom: 14px; background: #ffffff; }
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

  <!-- PAGE 1: 2D AUTOCAD FLOOR DIAGRAM + SEPARATE USED vs WASTE SLAB DRAWINGS -->
  <div class="sheet">
    <div class="header">
      <div>
        <span class="badge">📐 ${tr('2D AUTOCAD BLUEPRINT — PAGE 1/2 (WHITE PAPER CAD MODE)', '2D آٹو کیڈ سفید کاغذ نقشہ — پیج 1/2')}</span>
        <h1 style="margin:6px 0 2px;font-size:20px;color:#0f172a;">${roomNameInput} — ${clientNameInput}</h1>
        <div style="font-size:12px;color:#334155;font-family:monospace;font-weight:bold;">
          ${tr('Room Size', 'کمرے کا سائز')}: ${roomWidthFt}'-${roomWidthExtraIn}" × ${roomLengthFt}'-${roomLengthExtraIn}" (${totalRoomWidthIn}" × ${totalRoomLengthIn}" · ${totalRoomSqFt.toFixed(1)} Sq.Ft) |
          ${tr('Style', 'اسٹائل')}: ${styleTitle} |
          ${tr('Kerf', 'بلیڈ')}: ${effectiveBladeKerfIn}" | ${tr('Edge Trim', 'صفائی')}: ${effectiveEdgeTrimIn}"
        </div>
      </div>
      <div style="text-align:right;font-family:monospace;font-size:11.5px;color:#0f172a;">
        <div><strong>${tr('Marble Slab', 'ماربل سلیب')}:</strong> ${slabMaterialName} (${safeSlabW}" × ${safeSlabL}" · ${tr(`Total ${totalBookmatchAndSideSlabsCount} Slabs`, `کل ${totalBookmatchAndSideSlabsCount} سلیبیں`)})</div>
        <div><strong>${tr('Used Center Piece', 'یوز بک میچ پیس سائز')}:</strong> ${singleBmPieceWidthIn}" × ${singleBmPieceLengthIn}" (${totalBmPiecesCount} Pcs)</div>
        <div><strong>${tr('Estimated Room Total', 'تخمینی کل بل')}:</strong> PKR ${totalEstimatedRoomCostPKR.toLocaleString()}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch;">
      <div style="border:2px solid #0f172a;padding:12px;background:#ffffff;">
        <div style="font-weight:900;color:#0f172a;font-family:monospace;font-size:12.5px;margin-bottom:8px;border-bottom:2px solid #0f172a;padding-bottom:4px;">
          1. ${tr('2D AUTOCAD ROOM FLOOR DRAWING', 'کمرے کے فرش کا 2D آٹو کیڈ لائن ڈایاگرام')} (${totalRoomWidthIn}" × ${totalRoomLengthIn}")
        </div>
        <div style="border:2.5px solid #0f172a;padding:10px;background:#ffffff;aspect-ratio:${totalRoomLengthIn} / ${totalRoomWidthIn};max-height:310px;margin:0 auto;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="text-align:center;font-family:monospace;font-size:10px;font-weight:bold;color:#0369a1;margin-bottom:4px;">
            TRUE 1:1 SCALE RATIO (${(totalRoomLengthIn / Math.max(1, totalRoomWidthIn)).toFixed(2)} : 1) — ${totalRoomWidthIn}" × ${totalRoomLengthIn}"
          </div>
          ${
            effectiveOuterBorderIn > 0
              ? `<div style="border:1.5px solid #047857;background:#ffffff;color:#047857;text-align:center;padding:3px;font-family:monospace;font-weight:bold;font-size:10px;margin-bottom:4px;">
                  OUTER BORDER STRIP: ${effectiveOuterBorderIn}" WIDE AROUND ROOM
                </div>`
              : ''
          }
          ${
            topSideCutWidthIn > 0
              ? `<div style="border:1.5px dashed #0284c7;background:#ffffff;color:#0369a1;text-align:center;padding:4px;font-family:monospace;font-weight:bold;font-size:10.5px;margin-bottom:4px;">
                  ✂️ TOP SIDE CUT PIECES (${bmCols} Pcs): ${sideCutPieceActualWidthIn}" × ${singleBmPieceLengthIn}"
                </div>`
              : ''
          }
          <div style="flex:1;display:grid;grid-template-columns:repeat(${bmCols},1fr);gap:0px;min-height:140px;border:2px solid #0f172a;">
            ${floorCellsHtml}
          </div>
          ${
            bottomSideCutWidthIn > 0
              ? `<div style="border:1.5px dashed #0284c7;background:#ffffff;color:#0369a1;text-align:center;padding:4px;font-family:monospace;font-weight:bold;font-size:10.5px;margin-top:4px;">
                  ✂️ BOTTOM SIDE CUT PIECES (${bmCols} Pcs): ${sideCutPieceActualWidthIn}" × ${singleBmPieceLengthIn}"
                </div>`
              : ''
          }
        </div>
      </div>

      <div style="border:2px solid #0f172a;padding:12px;background:#ffffff;">
        <div style="font-weight:900;color:#0f172a;font-family:monospace;font-size:12.5px;margin-bottom:8px;border-bottom:2px solid #0f172a;padding-bottom:4px;">
          2. ${tr('EACH SLAB: USED PIECE vs WASTE PIECE SHOWN SEPARATELY', 'ہر سلیب کا یوز پیس الگ اور بچا ہوا ویسٹ پیس الگ (2D AutoCAD)')}
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:8px;">
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
  };

  // Reusable Room Bookmatch Canvas Renderer with TRUE 1:1 GEOMETRIC PROPORTIONS (pxPerInch)
  // Inside a fixed-height CAD Viewport so a 14×16 room looks genuinely 14:16 (slightly off-square), NEVER stretched flat!
  const renderRoomFloorCanvas = (isFullMonitorModal: boolean, isPdfMode = false) => {
    const viewportMaxW = isFullMonitorModal
      ? 860
      : isPdfMode
      ? 480
      : isDiagramExpanded
      ? 740
      : 430;
    const viewportMaxH = isFullMonitorModal ? 540 : isPdfMode ? 330 : 340;

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
        className={`relative rounded-xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-between ${
          isFullMonitorModal
            ? 'w-full h-full p-4 sm:p-8'
            : isPdfMode
            ? 'w-full p-3'
            : 'p-2.5 sm:p-3'
        }`}
      >
        {/* TOP BAR INSIDE FLOOR DIAGRAM: Chauras View + Full Screen + Style + Zoom + AutoCAD Lines + Direct .DWG/.DXF Download */}
        {!isPdfMode && (
          <div className="w-full flex flex-col gap-2 mb-2 z-30 print:hidden border-b border-slate-800 pb-2">
            <div className="w-full flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChaurasPurePreview((v) => !v)}
                  className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                    chaurasPurePreview
                      ? 'bg-amber-400 border-white text-slate-950 shadow'
                      : 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>
                    {chaurasPurePreview
                      ? tr('Chauras: ON', 'چارس ویو: آن')
                      : tr('Chauras View', 'چارس ویو')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isFullMonitorModal) {
                      setIsChaurasFullScreenModal(false);
                    } else {
                      setChaurasPurePreview(true);
                      setIsChaurasFullScreenModal(true);
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                    isFullMonitorModal
                      ? 'bg-rose-600 border-rose-300 text-white'
                      : 'bg-sky-600 hover:bg-sky-500 border-sky-300 text-white'
                  }`}
                >
                  {isFullMonitorModal ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>{tr('Exit', 'بند کریں')}</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>{tr('Full Screen', 'فل سکرین')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCycleNextBookmatchStyle}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {tr(
                      `Style (${currentStyleMeta.num}/6)`,
                      `سٹائل (${currentStyleMeta.num}/6)`
                    )}
                  </span>
                </button>

                <select
                  value={veinPattern}
                  onChange={(e) =>
                    handleSelectSpecificBookmatchStyle(e.target.value as BookmatchVeinPattern)
                  }
                  className="h-7 rounded bg-slate-900 border border-slate-700 text-amber-200 font-bold text-xs px-1.5 cursor-pointer"
                >
                  {BOOKMATCH_STYLE_META.map((st) => (
                    <option key={st.id} value={st.id} className="bg-slate-950 text-white">
                      {cadLang === 'ur' ? st.shortUr : st.shortEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/50 text-[11px] font-mono font-bold text-emerald-300">
                  {tr(
                    `1:1 Scale (${roomWidthFt}'×${roomLengthFt}')`,
                    `اصلی اسکیل 1:1 (${roomWidthFt}'×${roomLengthFt}')`
                  )}
                </span>

                <div className="flex items-center rounded border border-slate-700 bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiagramZoomPct((z) => Math.max(60, z - 15))}
                    className="px-2 py-0.5 rounded bg-slate-950 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-extrabold cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5 inline" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramZoomPct(100)}
                    className="px-2 py-0.5 text-xs font-mono font-extrabold text-white cursor-pointer"
                  >
                    {diagramZoomPct}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagramZoomPct((z) => Math.min(220, z + 15))}
                    className="px-2 py-0.5 rounded bg-slate-950 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-extrabold cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5 inline" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBlueprintCadLines((v) => !v)}
                  className={`px-2 py-1 rounded text-xs font-bold border cursor-pointer ${
                    showBlueprintCadLines && !chaurasPurePreview
                      ? 'bg-slate-800 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {showBlueprintCadLines && !chaurasPurePreview
                    ? tr('CAD: ON', 'کیڈ لائن: آن')
                    : tr('CAD: OFF', 'کیڈ لائن: آف')}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadRoomAutoCadDwg('dxf')}
                  className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs flex items-center gap-1 shadow cursor-pointer"
                  title={tr(
                    'Download 1:1 Scale AutoCAD .DXF/.DWG File',
                    '1:1 اصلی اسکیل آٹو کیڈ فائل ڈاؤن لوڈ کریں'
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{tr('📐 AutoCAD 1:1', '📐 آٹو کیڈ 1:1')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FIXED-HEIGHT CAD VIEWPORT CONTAINER (Outer height stays constant while inner Room Floor is drawn at exact 1:1 aspect ratio!) */}
        <div
          style={{
            minHeight: isFullMonitorModal ? '68vh' : isPdfMode ? '350px' : '380px',
          }}
          className="w-full overflow-auto flex flex-col items-center justify-center py-1"
        >
          <div
            style={{
              zoom: isPdfMode ? 1 : diagramZoomPct / 100,
            }}
            className="flex flex-col items-center justify-center transition-all"
          >
            {/* Top AutoCAD Room Length Dimension Arrow (Matched to exactRoomDrawW!) */}
            {showBlueprintCadLines && !chaurasPurePreview && (
              <div
                style={{ width: `${exactRoomDrawW}px` }}
                className="mb-1.5 flex items-center justify-between text-xs font-mono text-cyan-300"
              >
                <span>├──────</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/60 font-extrabold text-white whitespace-nowrap">
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
              {showBlueprintCadLines && !chaurasPurePreview && (
                <div
                  style={{ height: `${exactRoomDrawH}px` }}
                  className="hidden sm:flex flex-col items-center justify-between text-xs font-mono text-cyan-300 py-1"
                >
                  <span>┬</span>
                  <span
                    className="px-1.5 py-1 rounded bg-slate-900 border border-cyan-500/60 font-extrabold text-white whitespace-nowrap"
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
                  setSelectedRoomZone('outer_border');
                  if (borderSlabSource === 'from_bm_slabs_leftover') {
                    scrollToSpecificSlab(1);
                  }
                }}
                style={{
                  width: `${exactRoomDrawW}px`,
                  height: `${exactRoomDrawH}px`,
                  padding: `${borderPaddingPx}px`,
                  backgroundImage: `url("${effectiveOuterBorderTextureUrl}")`,
                  backgroundSize: 'cover',
                }}
                className={`relative shrink-0 rounded-none transition-colors shadow-2xl flex items-center justify-center ${
                  chaurasPurePreview
                    ? 'border border-white/15'
                    : selectedRoomZone === 'outer_border'
                    ? 'border-2 border-emerald-400'
                    : 'border-2 border-white'
                }`}
              >
                {/* AUTOCAD OUTER BORDER SEGMENT MARKINGS (Short form, clickable to view on Bookmatch Slab #1-#4) */}
                {effectiveOuterBorderIn > 0 && (
                  <>
                    {!chaurasPurePreview && showBlueprintCadLines && (
                      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
                    )}
                    {showBlueprintCadLines && !chaurasPurePreview && (
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

                        {/* TOP BORDER: B1-A (Slab #1) & B2-A (Slab #2) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(1);
                          }}
                          className="absolute top-0.5 left-1/4 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded bg-slate-950/95 border border-emerald-400 text-[10px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer hover:bg-emerald-950"
                        >
                          {`B1-A · ${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}"`}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 2));
                          }}
                          className="absolute top-0.5 left-3/4 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded bg-slate-950/95 border border-emerald-400 text-[10px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer hover:bg-emerald-950"
                        >
                          {`B2-A · ${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}"`}
                        </button>

                        {/* BOTTOM BORDER: B3-A (Slab #3) & B4-A (Slab #4) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 3));
                          }}
                          className="absolute bottom-0.5 left-1/4 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded bg-slate-950/95 border border-emerald-400 text-[10px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer hover:bg-emerald-950"
                        >
                          {`B3-A · ${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}"`}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 4));
                          }}
                          className="absolute bottom-0.5 left-3/4 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded bg-slate-950/95 border border-emerald-400 text-[10px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer hover:bg-emerald-950"
                        >
                          {`B4-A · ${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}"`}
                        </button>

                        {/* LEFT BORDER: B1-B & B3-B */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(1);
                          }}
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          className="hidden sm:block absolute left-0.5 top-[30%] -translate-y-1/2 z-20 px-0.5 py-1 rounded bg-slate-950/95 border border-emerald-400 text-[9.5px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer"
                        >
                          {`B1-B · ${effectiveOuterBorderIn}"×${halfSideBorderLenIn}"`}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 3));
                          }}
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                          className="hidden sm:block absolute left-0.5 top-[70%] -translate-y-1/2 z-20 px-0.5 py-1 rounded bg-slate-950/95 border border-emerald-400 text-[9.5px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer"
                        >
                          {`B3-B · ${effectiveOuterBorderIn}"×${halfSideBorderLenIn}"`}
                        </button>

                        {/* RIGHT BORDER: B2-B & B4-B */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 2));
                          }}
                          style={{ writingMode: 'vertical-rl' }}
                          className="hidden sm:block absolute right-0.5 top-[30%] -translate-y-1/2 z-20 px-0.5 py-1 rounded bg-slate-950/95 border border-emerald-400 text-[9.5px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer"
                        >
                          {`B2-B · ${effectiveOuterBorderIn}"×${halfSideBorderLenIn}"`}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('outer_border');
                            scrollToSpecificSlab(Math.min(totalSameStockSlabsInList, 4));
                          }}
                          style={{ writingMode: 'vertical-rl' }}
                          className="hidden sm:block absolute right-0.5 top-[70%] -translate-y-1/2 z-20 px-0.5 py-1 rounded bg-slate-950/95 border border-emerald-400 text-[9.5px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow cursor-pointer"
                        >
                          {`B4-B · ${effectiveOuterBorderIn}"×${halfSideBorderLenIn}"`}
                        </button>
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
                    }}
                    style={{
                      padding: `${pattiPaddingPx}px`,
                      backgroundImage:
                        effectiveContrastPattiIn > 0 && pattiCustomSlabImageUrl
                          ? `url("${pattiCustomSlabImageUrl}")`
                          : undefined,
                      backgroundSize: 'cover',
                      backgroundColor:
                        effectiveContrastPattiIn > 0 ? contrastMeta.bgHex : 'transparent',
                      borderColor:
                        effectiveContrastPattiIn > 0 ? contrastMeta.borderHex : 'transparent',
                    }}
                    className={`relative w-full h-full flex items-center justify-center transition-all ${
                      chaurasPurePreview ? '' : 'border border-amber-400/60'
                    }`}
                  >
                    {effectiveContrastPattiIn > 0 && !chaurasPurePreview && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 z-20 px-1.5 py-0.2 rounded bg-slate-950/95 border border-amber-400 text-[10px] font-mono font-extrabold text-amber-300 whitespace-nowrap">
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
                      {/* 1. TOP SIDE CUT-PIECES BAND (Exact 1:1 topBandHeightPct, Interactive & Bright in Chauras View!) */}
                      {topSideCutWidthIn > 0 && (
                        <div
                          style={{
                            height: `${topBandHeightPct}%`,
                          }}
                          className={`w-full flex items-stretch shrink-0 ${
                            chaurasPurePreview
                              ? 'border-b border-white/10'
                              : 'border-b-2 border-dashed border-cyan-300'
                          }`}
                        >
                          {leftSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToSpecificSlab(
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${leftBandWidthPct}%`,
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: 'cover',
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                chaurasPurePreview
                                  ? 'border-r border-white/10'
                                  : 'border-r-2 border-dashed border-cyan-300'
                              }`}
                            >
                              {showBlueprintCadLines && !chaurasPurePreview && (
                                <span className="relative z-10 px-1 py-0.2 rounded bg-slate-950/90 border border-cyan-400 text-[9.5px] font-mono font-bold text-cyan-200 whitespace-nowrap">
                                  {`SC-1 · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                            }}
                            className={`flex-1 h-full grid ${
                              chaurasPurePreview
                                ? 'divide-x divide-white/10'
                                : 'divide-x-2 divide-dashed divide-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmCols }).map((_, cIdx) => {
                              const sideSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  (cIdx % Math.max(1, slabsForTopBottomSideCuts)) +
                                  1
                              );
                              const sideSt = getSlabState(sideSlabNum);
                              const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                              const sideImg = sideSt.customImageUrl || slabImageUrl;
                              const sideFlipH = sideSt.flipHOverride ?? false;
                              const sideFlipV = sideSt.flipVOverride ?? false;
                              const isSelectedSide =
                                activeSlabIndex === sideSlabNum && !chaurasPurePreview;
                              return (
                                <div
                                  key={cIdx}
                                  onMouseDown={(e) =>
                                    handleRoomPieceMouseDown(100 + cIdx, sideSlabNum, e)
                                  }
                                  onMouseMove={(e) =>
                                    handleRoomPieceMouseMove(100 + cIdx, sideSlabNum, e)
                                  }
                                  className={`relative h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isSelectedSide ? 'ring-2 ring-inset ring-amber-400' : ''
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${sideImg}")`,
                                      backgroundSize: `${sideMetrics.bgSizeW}% ${sideMetrics.bgSizeH}%`,
                                      backgroundPosition: `${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%`,
                                      transform: `scale(${sideFlipH ? -1 : 1}, ${
                                        sideFlipV ? -1 : 1
                                      }) rotate(${sideSt.rotationDeg}deg)`,
                                    }}
                                  />
                                  {showBlueprintCadLines && !chaurasPurePreview && (
                                    <span
                                      className={`relative z-10 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isSelectedSide
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`ST-${cIdx + 1}(S${sideSlabNum}) · ${sideMetrics.activePieceWIn}"×${sideMetrics.activePieceLIn}"`}
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
                                scrollToSpecificSlab(
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${rightBandWidthPct}%`,
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: 'cover',
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                chaurasPurePreview
                                  ? 'border-l border-white/10'
                                  : 'border-l-2 border-dashed border-cyan-300'
                              }`}
                            >
                              {showBlueprintCadLines && !chaurasPurePreview && (
                                <span className="relative z-10 px-1 py-0.2 rounded bg-slate-950/90 border border-cyan-400 text-[9.5px] font-mono font-bold text-cyan-200 whitespace-nowrap">
                                  {`SC-2 · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
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
                              gridTemplateRows: `repeat(${bmRows}, minmax(0, 1fr))`,
                            }}
                            className={`h-full grid shrink-0 ${
                              chaurasPurePreview
                                ? 'divide-y divide-white/10 border-r border-white/10'
                                : 'divide-y-2 divide-dashed divide-cyan-300 border-r-2 border-dashed border-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmRows }).map((_, rIdx) => {
                              const lrSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  slabsForTopBottomSideCuts +
                                  (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                                  1
                              );
                              const lrSt = getSlabState(lrSlabNum);
                              const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                              const lrImg = lrSt.customImageUrl || slabImageUrl;
                              const lrFlipH = lrSt.flipHOverride ?? false;
                              const lrFlipV = lrSt.flipVOverride ?? false;
                              const isSelectedLr =
                                activeSlabIndex === lrSlabNum && !chaurasPurePreview;
                              return (
                                <div
                                  key={rIdx}
                                  onMouseDown={(e) =>
                                    handleRoomPieceMouseDown(200 + rIdx, lrSlabNum, e)
                                  }
                                  onMouseMove={(e) =>
                                    handleRoomPieceMouseMove(200 + rIdx, lrSlabNum, e)
                                  }
                                  className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isSelectedLr ? 'ring-2 ring-inset ring-amber-400' : ''
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${lrImg}")`,
                                      backgroundSize: `${lrMetrics.bgSizeW}% ${lrMetrics.bgSizeH}%`,
                                      backgroundPosition: `${lrMetrics.bgPosX}% ${lrMetrics.bgPosY}%`,
                                      transform: `scale(${lrFlipH ? -1 : 1}, ${
                                        lrFlipV ? -1 : 1
                                      }) rotate(${lrSt.rotationDeg}deg)`,
                                    }}
                                  />
                                  {showBlueprintCadLines && !chaurasPurePreview && (
                                    <span
                                      style={{
                                        writingMode: 'vertical-rl',
                                        transform: 'rotate(180deg)',
                                      }}
                                      className={`relative z-10 px-0.5 py-1 rounded border text-[9.5px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isSelectedLr
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`SL-${rIdx + 1}(S${lrSlabNum}) · ${lrMetrics.activePieceWIn}"×${lrMetrics.activePieceLIn}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* MAIN BOOKMATCH / FULL-SLAB / EQUAL-SLAB GRID */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomZone('center_bookmatch');
                          }}
                          style={{
                            gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${bmRows}, minmax(0, 1fr))`,
                          }}
                          className={`relative flex-1 h-full grid bg-slate-950 overflow-hidden select-none ${
                            chaurasPurePreview ? '' : 'border-2 border-white'
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

                            const autoFlips = getAutoFlipForPattern(veinPattern, r, c);
                            const flipH =
                              slabSt.flipHOverride !== null ? slabSt.flipHOverride : autoFlips.flipH;
                            const flipV =
                              slabSt.flipVOverride !== null ? slabSt.flipVOverride : autoFlips.flipV;

                            const isSelectedSlab = activeSlabIndex === mappedSlabNum;

                            return (
                              <div
                                key={slotIdx}
                                onMouseDown={(e) =>
                                  handleRoomPieceMouseDown(slotIdx, mappedSlabNum, e)
                                }
                                onMouseMove={(e) =>
                                  handleRoomPieceMouseMove(slotIdx, mappedSlabNum, e)
                                }
                                className={`relative w-full h-full overflow-hidden transition-all ${
                                  isManualSlabGrabMode
                                    ? 'cursor-grab active:cursor-grabbing'
                                    : 'cursor-pointer'
                                } ${
                                  chaurasPurePreview
                                    ? 'border-[0.5px] border-white/5'
                                    : isSelectedSlab
                                    ? 'border-2 border-amber-400'
                                    : 'border border-white/60'
                                }`}
                              >
                                <div
                                  className="w-full h-full bg-no-repeat transition-transform duration-150"
                                  style={{
                                    backgroundImage: `url("${effectiveImgUrl}")`,
                                    backgroundSize: `${slabMetrics.bgSizeW}% ${slabMetrics.bgSizeH}%`,
                                    backgroundPosition: `${slabMetrics.bgPosX}% ${slabMetrics.bgPosY}%`,
                                    transform: `scale(${flipH ? -1 : 1}, ${
                                      flipV ? -1 : 1
                                    }) rotate(${slabSt.rotationDeg}deg)`,
                                  }}
                                />

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
                                {showBlueprintCadLines && !chaurasPurePreview && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span
                                      className={`px-1.5 py-0.5 rounded border text-[11px] sm:text-xs font-mono font-extrabold shadow-md ${
                                        isSelectedSlab
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
                          {showBlueprintCadLines && !chaurasPurePreview && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center gap-0.5">
                              <div className="w-4 h-4 rotate-45 border border-cyan-300 bg-slate-950/80 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side Cut Pieces (SR-1 .. SR-N) (Exact 1:1 rightBandWidthPct, Interactive & Bright in Chauras View!) */}
                        {rightSideCutLengthIn > 0 && (
                          <div
                            style={{
                              width: `${rightBandWidthPct}%`,
                              gridTemplateRows: `repeat(${bmRows}, minmax(0, 1fr))`,
                            }}
                            className={`h-full grid shrink-0 ${
                              chaurasPurePreview
                                ? 'divide-y divide-white/10 border-l border-white/10'
                                : 'divide-y-2 divide-dashed divide-cyan-300 border-l-2 border-dashed border-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmRows }).map((_, rIdx) => {
                              const lrSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  slabsForTopBottomSideCuts +
                                  (rIdx % Math.max(1, slabsForLeftRightSideCuts)) +
                                  1
                              );
                              const lrSt = getSlabState(lrSlabNum);
                              const lrMetrics = getSlabPieceMetrics(lrSlabNum);
                              const lrImg = lrSt.customImageUrl || slabImageUrl;
                              const lrFlipH = lrSt.flipHOverride ?? false;
                              const lrFlipV = lrSt.flipVOverride ?? false;
                              const isSelectedLr =
                                activeSlabIndex === lrSlabNum && !chaurasPurePreview;
                              return (
                                <div
                                  key={rIdx}
                                  onMouseDown={(e) =>
                                    handleRoomPieceMouseDown(300 + rIdx, lrSlabNum, e)
                                  }
                                  onMouseMove={(e) =>
                                    handleRoomPieceMouseMove(300 + rIdx, lrSlabNum, e)
                                  }
                                  className={`relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isSelectedLr ? 'ring-2 ring-inset ring-amber-400' : ''
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${lrImg}")`,
                                      backgroundSize: `${lrMetrics.bgSizeW}% ${lrMetrics.bgSizeH}%`,
                                      backgroundPosition: `${lrMetrics.bgPosX}% ${lrMetrics.bgPosY}%`,
                                      transform: `scale(${lrFlipH ? -1 : 1}, ${
                                        lrFlipV ? -1 : 1
                                      }) rotate(${lrSt.rotationDeg}deg)`,
                                    }}
                                  />
                                  {showBlueprintCadLines && !chaurasPurePreview && (
                                    <span
                                      style={{ writingMode: 'vertical-rl' }}
                                      className={`relative z-10 px-0.5 py-1 rounded border text-[9.5px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isSelectedLr
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`SR-${rIdx + 1}(S${lrSlabNum}) · ${lrMetrics.activePieceWIn}"×${lrMetrics.activePieceLIn}"`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 3. BOTTOM SIDE CUT-PIECES BAND (Exact 1:1 bottomBandHeightPct, Interactive & Bright in Chauras View!) */}
                      {bottomSideCutWidthIn > 0 && (
                        <div
                          style={{
                            height: `${bottomBandHeightPct}%`,
                          }}
                          className={`w-full flex items-stretch shrink-0 ${
                            chaurasPurePreview
                              ? 'border-t border-white/10'
                              : 'border-t-2 border-dashed border-cyan-300'
                          }`}
                        >
                          {leftSideCutLengthIn > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToSpecificSlab(
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${leftBandWidthPct}%`,
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: 'cover',
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                chaurasPurePreview
                                  ? 'border-r border-white/10'
                                  : 'border-r-2 border-dashed border-cyan-300'
                              }`}
                            >
                              {showBlueprintCadLines && !chaurasPurePreview && (
                                <span className="relative z-10 px-1 py-0.2 rounded bg-slate-950/90 border border-cyan-400 text-[9.5px] font-mono font-bold text-cyan-200 whitespace-nowrap">
                                  {`SC-3 · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                            }}
                            className={`flex-1 h-full grid ${
                              chaurasPurePreview
                                ? 'divide-x divide-white/10'
                                : 'divide-x-2 divide-dashed divide-cyan-300'
                            }`}
                          >
                            {Array.from({ length: bmCols }).map((_, cIdx) => {
                              const sideSlabNum = Math.min(
                                totalSameStockSlabsInList,
                                totalBmPiecesCount +
                                  ((cIdx + 1) % Math.max(1, slabsForTopBottomSideCuts)) +
                                  1
                              );
                              const sideSt = getSlabState(sideSlabNum);
                              const sideMetrics = getSlabPieceMetrics(sideSlabNum);
                              const sideImg = sideSt.customImageUrl || slabImageUrl;
                              const sideFlipH = sideSt.flipHOverride ?? false;
                              const sideFlipV = sideSt.flipVOverride ?? false;
                              const isSelectedSide =
                                activeSlabIndex === sideSlabNum && !chaurasPurePreview;
                              return (
                                <div
                                  key={cIdx}
                                  onMouseDown={(e) =>
                                    handleRoomPieceMouseDown(400 + cIdx, sideSlabNum, e)
                                  }
                                  onMouseMove={(e) =>
                                    handleRoomPieceMouseMove(400 + cIdx, sideSlabNum, e)
                                  }
                                  className={`relative h-full flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 ${
                                    isSelectedSide ? 'ring-2 ring-inset ring-amber-400' : ''
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0 bg-no-repeat transition-transform duration-150"
                                    style={{
                                      backgroundImage: `url("${sideImg}")`,
                                      backgroundSize: `${sideMetrics.bgSizeW}% ${sideMetrics.bgSizeH}%`,
                                      backgroundPosition: `${sideMetrics.bgPosX}% ${sideMetrics.bgPosY}%`,
                                      transform: `scale(${sideFlipH ? -1 : 1}, ${
                                        sideFlipV ? -1 : 1
                                      }) rotate(${sideSt.rotationDeg}deg)`,
                                    }}
                                  />
                                  {showBlueprintCadLines && !chaurasPurePreview && (
                                    <span
                                      className={`relative z-10 px-1.5 py-0.2 rounded border text-[10px] font-mono font-extrabold whitespace-nowrap shadow ${
                                        isSelectedSide
                                          ? 'bg-amber-400 border-white text-slate-950'
                                          : 'bg-slate-950/90 border-cyan-400 text-cyan-200'
                                      }`}
                                    >
                                      {`SB-${cIdx + 1}(S${sideSlabNum}) · ${sideMetrics.activePieceWIn}"×${sideMetrics.activePieceLIn}"`}
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
                                scrollToSpecificSlab(
                                  Math.min(totalSameStockSlabsInList, totalBmPiecesCount + 1)
                                );
                              }}
                              style={{
                                width: `${rightBandWidthPct}%`,
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: 'cover',
                              }}
                              className={`relative h-full flex items-center justify-center overflow-hidden shrink-0 cursor-pointer ${
                                chaurasPurePreview
                                  ? 'border-l border-white/10'
                                  : 'border-l-2 border-dashed border-cyan-300'
                              }`}
                            >
                              {showBlueprintCadLines && !chaurasPurePreview && (
                                <span className="relative z-10 px-1 py-0.2 rounded bg-slate-950/90 border border-cyan-400 text-[9.5px] font-mono font-bold text-cyan-200 whitespace-nowrap">
                                  {`SC-4 · ${cornerPieceWidthIn}"×${cornerPieceLengthIn}"`}
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

            {/* CLEAN SHORT-FORM AUTOCAD SUMMARY BAR UNDER FLOOR DIAGRAM */}
            {!chaurasPurePreview && (
              <div
                className={`w-full ${
                  isFullMonitorModal || isPdfMode ? 'max-w-5xl' : 'max-w-2xl'
                } mt-2 rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs font-mono space-y-1.5`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-cyan-300">
                    {tr(
                      `Center: ${centerMedallionWidthIn}"×${centerMedallionLengthIn}" (${totalBmPiecesCount} Pcs)`,
                      `سینٹر: ${centerMedallionWidthIn}"×${centerMedallionLengthIn}" (${totalBmPiecesCount} پیس)`
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                    {tr(
                      `Total Slabs: ${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}")`,
                      `کل سلیبیں: ${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}")`
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                  <div className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-white font-bold truncate">
                    {`BM: ${totalBmPiecesCount}×(${singleBmPieceWidthIn}"×${singleBmPieceLengthIn}")`}
                  </div>
                  <div className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-cyan-200 font-bold truncate">
                    {topBottomSideCutQty > 0 || leftRightSideCutQty > 0
                      ? `Side Cuts: ${topBottomSideCutQty + leftRightSideCutQty} Pcs`
                      : tr('Side Cuts: 0 (Full Fit)', 'سائیڈ کٹ: 0 (برابر فٹ)')}
                  </div>
                  <div className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-emerald-300 font-bold truncate">
                    {effectiveOuterBorderIn > 0
                      ? borderSlabSource === 'from_bm_slabs_leftover'
                        ? tr(
                            `Border: ${effectiveOuterBorderIn}" (From S1-S${totalBmPiecesCount} Leftover)`,
                            `بارڈر: ${effectiveOuterBorderIn}" (سلیب 1-${totalBmPiecesCount} بقیہ سے)`
                          )
                        : `Border: ${effectiveOuterBorderIn}"`
                      : tr('Border: OFF', 'بارڈر: آف')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3" dir={cadLang === 'ur' ? 'rtl' : 'ltr'}>
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
              {/* LEFT: PURE 2D AUTOCAD ROOM FLOOR DRAWING (NO BLACK BACKGROUND!) */}
              <div className="lg:col-span-6 border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                  <span className="text-xs font-mono font-black text-slate-950 uppercase">
                    {tr(
                      '1. 2D AUTOCAD ROOM FLOOR LAYOUT (WHITE PAPER LINE DRAWING)',
                      '1. کمرے کے فرش کا 2D آٹو کیڈ لائن ڈایاگرام (سفید صفحے پر صاف لائنیں)'
                    )}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-sky-900">
                    |&lt;-- {totalRoomWidthIn}&quot; × {totalRoomLengthIn}&quot; --&gt;|
                  </span>
                </div>

                {/* Top Horizontal Dimension Line */}
                <div className="text-center font-mono text-[11px] font-black text-slate-950">
                  |&lt;---------------- {tr('ROOM LENGTH', 'کمرے کی لمبائی')}: {roomLengthFt}&apos;-{roomLengthExtraIn}&quot; ({totalRoomLengthIn}&quot;) ----------------&gt;|
                </div>

                {/* Outer Room Wall 2D AutoCAD Frame */}
                <div
                  className="relative w-full border-[3px] border-slate-950 bg-white p-3 flex flex-col justify-between"
                  style={{
                    minHeight: '340px',
                    backgroundImage:
                      'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Optional Outer Border CAD Ring */}
                  {effectiveOuterBorderIn > 0 && (
                    <div className="mb-1.5 border border-emerald-800 bg-white px-2 py-0.5 text-center font-mono text-[10px] font-black text-emerald-900">
                      {tr(
                        `OUTER BORDER MARBLE STRIP: ${effectiveOuterBorderIn}" WIDE AROUND ROOM`,
                        `آؤٹر بارڈر ماربل پٹی: ${effectiveOuterBorderIn}" انچ چوڑی چاروں طرف`
                      )}
                    </div>
                  )}

                  {/* Optional Contrast Patti CAD Ring */}
                  {effectiveContrastPattiIn > 0 && (
                    <div className="mb-1.5 border border-amber-700 bg-white px-2 py-0.5 text-center font-mono text-[10px] font-black text-amber-900">
                      {tr(
                        `CONTRAST PATTI STRIP: ${effectiveContrastPattiIn}" WIDE`,
                        `کنٹراسٹ پٹی: ${effectiveContrastPattiIn}" انچ چوڑی`
                      )}
                    </div>
                  )}

                  {/* Top Side Cut Band in 2D AutoCAD Style */}
                  {topSideCutWidthIn > 0 && (
                    <div
                      style={{
                        gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                      }}
                      className="grid border-2 border-dashed border-sky-800 bg-white mb-1.5 divide-x-2 divide-dashed divide-sky-800"
                    >
                      {Array.from({ length: bmCols }).map((_, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-1.5 text-center font-mono text-[10px] font-bold text-sky-950 bg-white"
                        >
                          ✂️ TOP CUT ST-{cIdx + 1}: {sideCutPieceActualWidthIn}&quot;×{singleBmPieceLengthIn}&quot;
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Middle Row: Left Side Cuts + Center Bookmatch 2D CAD Grid + Right Side Cuts */}
                  <div className="flex-1 flex items-stretch gap-1.5">
                    {leftSideCutLengthIn > 0 && (
                      <div className="w-14 border-2 border-dashed border-teal-800 bg-white flex flex-col divide-y-2 divide-dashed divide-teal-800 justify-around">
                        {Array.from({ length: bmRows }).map((_, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex-1 flex items-center justify-center p-1 text-center font-mono text-[9px] font-bold text-teal-950"
                          >
                            SL-{rIdx + 1}
                            <br />
                            {leftRightPieceActualWidthIn}&quot;×{singleBmPieceWidthIn}&quot;
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Center Bookmatch 2D AutoCAD Vector Grid */}
                    <div
                      style={{
                        gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${bmRows}, minmax(0, 1fr))`,
                      }}
                      className="flex-1 grid border-[2.5px] border-slate-950 bg-white divide-x-2 divide-y-2 divide-slate-950"
                    >
                      {Array.from({ length: totalBmPiecesCount }).map((_, idx) => {
                        const slabNum = idx + 1;
                        const pieceLetter = PIECE_LETTERS[idx] || `S${slabNum}`;
                        const rIdx = Math.floor(idx / bmCols);
                        const cIdx = idx % bmCols;
                        const autoFlip = getAutoFlipForPattern(veinPattern, rIdx, cIdx);
                        const isDiagForward = autoFlip.flipH === autoFlip.flipV;

                        return (
                          <div
                            key={slabNum}
                            className="relative bg-white p-2 flex flex-col items-center justify-center text-center overflow-hidden min-h-[110px]"
                          >
                            {/* 2D AutoCAD Vein Direction Vector Line (Shows exact Diamond / Butterfly / V-Match on White Paper!) */}
                            <svg
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              className="absolute inset-0 w-full h-full pointer-events-none"
                            >
                              {/* Faint CAD center crosshairs */}
                              <line
                                x1="50"
                                y1="0"
                                x2="50"
                                y2="100"
                                stroke="#cbd5e1"
                                strokeWidth="0.8"
                                strokeDasharray="3 3"
                              />
                              <line
                                x1="0"
                                y1="50"
                                x2="100"
                                y2="50"
                                stroke="#cbd5e1"
                                strokeWidth="0.8"
                                strokeDasharray="3 3"
                              />
                              {/* Primary AutoCAD Bookmatch Vein Axis Line */}
                              {isDiagForward ? (
                                <>
                                  <line
                                    x1="6"
                                    y1="94"
                                    x2="94"
                                    y2="6"
                                    stroke="#0284c7"
                                    strokeWidth="1.8"
                                  />
                                  <line
                                    x1="20"
                                    y1="94"
                                    x2="94"
                                    y2="20"
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                    strokeDasharray="4 2"
                                  />
                                </>
                              ) : (
                                <>
                                  <line
                                    x1="6"
                                    y1="6"
                                    x2="94"
                                    y2="94"
                                    stroke="#0284c7"
                                    strokeWidth="1.8"
                                  />
                                  <line
                                    x1="6"
                                    y1="20"
                                    x2="80"
                                    y2="94"
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                    strokeDasharray="4 2"
                                  />
                                </>
                              )}
                            </svg>

                            <span className="relative z-10 px-1.5 py-0.5 rounded bg-white border-[1.5px] border-slate-950 font-mono text-[11px] font-black text-slate-950">
                              USED SLAB #{slabNum} ({pieceLetter})
                            </span>
                            <span className="relative z-10 mt-1 px-1.5 py-0.2 bg-white border border-sky-800 font-mono text-[10.5px] font-extrabold text-sky-950">
                              |&lt;-- {singleBmPieceWidthIn}&quot; × {singleBmPieceLengthIn}&quot; --&gt;|
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {rightSideCutLengthIn > 0 && (
                      <div className="w-14 border-2 border-dashed border-teal-800 bg-white flex flex-col divide-y-2 divide-dashed divide-teal-800 justify-around">
                        {Array.from({ length: bmRows }).map((_, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex-1 flex items-center justify-center p-1 text-center font-mono text-[9px] font-bold text-teal-950"
                          >
                            SR-{rIdx + 1}
                            <br />
                            {leftRightPieceActualWidthIn}&quot;×{singleBmPieceWidthIn}&quot;
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Side Cut Band in 2D AutoCAD Style */}
                  {bottomSideCutWidthIn > 0 && (
                    <div
                      style={{
                        gridTemplateColumns: `repeat(${bmCols}, minmax(0, 1fr))`,
                      }}
                      className="grid border-2 border-dashed border-sky-800 bg-white mt-1.5 divide-x-2 divide-dashed divide-sky-800"
                    >
                      {Array.from({ length: bmCols }).map((_, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-1.5 text-center font-mono text-[10px] font-bold text-sky-950 bg-white"
                        >
                          ✂️ BTM CUT SB-{cIdx + 1}: {sideCutPieceActualWidthIn}&quot;×{singleBmPieceLengthIn}&quot;
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: EACH SLAB WITH SEPARATE 2D AUTOCAD BOX FOR USED PIECE vs SEPARATE BOX FOR WASTE PIECE */}
              <div className="lg:col-span-6 border-2 border-slate-950 rounded-lg bg-white p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                  <span className="text-xs font-mono font-black text-slate-950 uppercase">
                    {tr(
                      `2. EACH SLAB: USED PIECE vs WASTE PIECE SEPARATE 2D CAD VIEW (${totalBookmatchAndSideSlabsCount} SLABS)`,
                      `2. ہر سلیب کا کارآمد یوز پیس الگ اور بچا ہوا ویسٹ پیس الگ (کل ${totalBookmatchAndSideSlabsCount} سلیبیں)`
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: totalBookmatchAndSideSlabsCount }).map((_, idx) => {
                    const slabNum = idx + 1;
                    const pieceLetter = PIECE_LETTERS[idx] || `S${slabNum}`;
                    const isBmSlab = slabNum <= totalBmPiecesCount;
                    const usedW = isBmSlab ? singleBmPieceWidthIn : sideCutPieceActualWidthIn;
                    const usedL = singleBmPieceLengthIn;
                    const remW = isBmSlab ? rawLeftoverWIn : leftoverWOnTopBottomSlabs;

                    return (
                      <div
                        key={slabNum}
                        className="rounded border-2 border-slate-950 bg-white p-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-300 pb-1 text-[10.5px] font-mono font-black text-slate-950">
                          <span>
                            📐 SLAB #{slabNum} ({safeSlabW}&quot;×{safeSlabL}&quot;)
                          </span>
                          <span className="text-rose-800">✂️ {safeSlabL}&quot; R.In</span>
                        </div>

                        {/* Side-by-Side Separate 2D AutoCAD Boxes for this Slab: (1) USED PIECE vs (2) WASTE PIECE */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Separate Box 1: USED Piece from this Slab */}
                          <div className="border-2 border-slate-950 rounded p-1.5 bg-white flex flex-col items-center justify-between text-center">
                            <span className="text-[9.5px] font-mono font-black text-sky-900">
                              {isBmSlab
                                ? tr(`✅ USED PIECE ${pieceLetter}`, `✅ یوز پیس ${pieceLetter}`)
                                : tr(
                                    `✅ USED SIDE CUT #${slabNum - totalBmPiecesCount}`,
                                    `✅ یوز سائیڈ کٹ #${slabNum - totalBmPiecesCount}`
                                  )}
                            </span>
                            <div className="w-full my-1 py-2 border-2 border-sky-800 bg-white font-mono text-[10.5px] font-black text-slate-950">
                              {usedW}&quot; × {usedL}&quot;
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-700">
                              {(((usedW * usedL) / 144)).toFixed(1)} Sq.Ft
                            </span>
                          </div>

                          {/* Separate Box 2: REMAINING WASTE Piece from this Slab */}
                          <div
                            className="border-2 border-dashed border-amber-800 rounded p-1.5 bg-white flex flex-col items-center justify-between text-center"
                            style={{
                              backgroundImage:
                                remW > 0
                                  ? 'repeating-linear-gradient(45deg, rgba(217,119,6,0.12), rgba(217,119,6,0.12) 5px, #ffffff 5px, #ffffff 10px)'
                                  : undefined,
                            }}
                          >
                            <span className="px-1 bg-white text-[9.5px] font-mono font-black text-amber-950">
                              {tr(`♻️ WASTE SLAB #${slabNum}`, `♻️ ویسٹ سلیب #${slabNum}`)}
                            </span>
                            {remW > 0 ? (
                              <>
                                <div className="w-full my-1 py-2 border border-amber-900 bg-white font-mono text-[10.5px] font-black text-amber-950">
                                  {remW}&quot; × {safeSlabL}&quot;
                                </div>
                                <span className="px-1 bg-white text-[9px] font-mono font-bold text-emerald-900">
                                  {(((remW * safeSlabL) / 144)).toFixed(1)} Sq.Ft
                                </span>
                              </>
                            ) : (
                              <div className="my-2 font-mono text-[9.5px] font-bold text-emerald-800 bg-white px-1">
                                {tr('0" Waste (100% Used)', '0" ویسٹ (پوری استعمال)')}
                              </div>
                            )}
                          </div>
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
          WINDOW 1: COMPACT TOP BAR FOR MULTI-ROOM SELECTION, 2D HOUSE MAP & DESIGN
         ===================================================================== */}
      <div className="rounded-xl border border-amber-500/50 bg-slate-900 p-3 space-y-2.5 shadow-md">
        {/* Multi-Room Bar & Dedicated Per-Room PDF Export + 2D House Map Upload */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[11px] font-extrabold">
              {tr('WINDOW 1', 'ونڈو 1')}
            </span>

            {/* Room Switcher Pills */}
            {roomsList.map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={() => handleSelectRoomProfile(rm)}
                className={`px-2.5 py-1 rounded-md text-xs font-extrabold border transition-all cursor-pointer ${
                  activeRoomId === rm.id
                    ? 'bg-sky-600 border-sky-300 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}
                <span className="ml-1 text-[10px] font-mono text-amber-300">
                  {`(${rm.roomWidthFt}'×${rm.roomLengthFt}')`}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleAddNewRoomProfile}
              className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>{tr('+ Add New Room', '+ نیا کمرہ شامل کریں')}</span>
            </button>

            {/* 2D House Map / AutoCAD DWG-DXF Toggle & Upload Buttons */}
            <button
              type="button"
              onClick={() => setShowHouseMapPanel((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md text-xs font-extrabold border flex items-center gap-1.5 transition-all cursor-pointer ${
                showHouseMapPanel
                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow'
                  : 'bg-slate-950 hover:bg-slate-800 border-amber-500/60 text-amber-300'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>
                {tr(
                  '🗺️ 2D House Map / .DWG Rooms',
                  '🗺️ گھر کا 2D نقشہ / DWG کمرے سیٹنگ'
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => houseMapFileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-md bg-sky-950 hover:bg-sky-900 border border-sky-400/70 text-sky-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>
                {tr('Upload 2D Map / .DWG / .DXF', '2D نقشہ / DWG اپ لوڈ کریں')}
              </span>
            </button>
          </div>

          {/* Room Name Input + Dedicated Room PDF Button */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="text"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              placeholder={tr('Room Name', 'کمرے کا نام')}
              className="h-7 w-44 bg-slate-950 border-slate-700 text-white text-xs font-bold"
            />

            <button
              type="button"
              onClick={() => setIsRoomPdfModalOpen(true)}
              className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>
                {tr(
                  `🖨️ ${roomNameInput} PDF Sheet`,
                  `🖨️ اس کمرے (${roomNameInput}) کا الگ PDF نکالیں`
                )}
              </span>
            </button>

            <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-amber-500/40">
              {tr(`Area: ${totalRoomSqFt.toFixed(1)} Sq.Ft`, `کمرہ رقبہ: ${totalRoomSqFt.toFixed(1)} فٹ²`)}
            </span>
          </div>
        </div>

        {/* =====================================================================
            INTERACTIVE 2D HOUSE MAP / AUTOCAD .DWG-.DXF MULTI-ROOM PLANNER PANEL
           ===================================================================== */}
        {showHouseMapPanel && (
          <div className="rounded-xl border-2 border-amber-500/70 bg-slate-950 p-3 space-y-2.5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black">
                  {tr('2D HOUSE FLOOR MAP & DWG PLANNER', 'گھر کا 2D نقشہ اور کمروں کی ماربل سیٹنگ')}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {houseMapFileName
                    ? tr(
                        `Loaded File: ${houseMapFileName}`,
                        `لوڈ شدہ نقشہ: ${houseMapFileName}`
                      )
                    : tr(
                        'Click any room on the 2D map to set its marble slabs & bookmatch, or drag rooms to match your uploaded 2D House Plan / .DWG.',
                        'نقشے میں کسی بھی کمرے پر کلک کر کے اس کا ماربل اور بک میچ سیٹ کریں، یا کمرے کو ماؤس سے پکڑ کر اپنے 2D نقشے کے اوپر سیٹ کریں۔'
                      )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => houseMapFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {tr('Upload .DWG / .DXF / 2D Plan Image', 'نیا 2D نقشہ / DWG اپ لوڈ کریں')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewRoomProfile}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>{tr('+ Add Room on Map', '+ نقشے میں نیا کمرہ شامل کریں')}</span>
                </button>
                {(houseMapImageUrl || houseMapCadLines.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHouseMapImageUrl(null);
                      setHouseMapCadLines([]);
                      setHouseMapCadLabels([]);
                      setHouseMapFileName('');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    {tr('Reset Map Bg', 'نقشہ ری سیٹ')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHouseMapPanel(false)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {tr('Close ✕', 'بند کریں ✕')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Interactive 2D House Blueprint Canvas */}
              <div className="lg:col-span-8">
                <div
                  ref={houseMapBoxRef}
                  onMouseMove={handleHouseMapRoomPointerMove}
                  onMouseUp={() => setDraggingMapRoomId(null)}
                  onMouseLeave={() => setDraggingMapRoomId(null)}
                  style={{ height: '340px' }}
                  className="relative w-full rounded-lg border-2 border-sky-500/50 bg-[#071324] overflow-hidden select-none shadow-inner"
                >
                  {/* AutoCAD 2D Architectural Blueprint Grid Background */}
                  <div
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.12) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                    className="absolute inset-0 pointer-events-none"
                  />

                  {/* Uploaded 2D Floor Plan Image (PNG/JPG/WebP) */}
                  {houseMapImageUrl && (
                    <img
                      src={houseMapImageUrl}
                      alt="Uploaded 2D House Plan"
                      className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
                    />
                  )}

                  {/* Parsed AutoCAD .DXF / .DWG Vector Entities Overlay */}
                  {houseMapCadLines.length > 0 && (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none"
                    >
                      {houseMapCadLines.map((ln, idx) => (
                        <line
                          key={idx}
                          x1={ln.x1}
                          y1={ln.y1}
                          x2={ln.x2}
                          y2={ln.y2}
                          stroke="#38bdf8"
                          strokeWidth="0.45"
                          strokeOpacity="0.9"
                        />
                      ))}
                      {houseMapCadLabels.map((lbl, idx) => (
                        <text
                          key={idx}
                          x={lbl.x}
                          y={lbl.y}
                          fill="#fde047"
                          fontSize="2.8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {lbl.text}
                        </text>
                      ))}
                    </svg>
                  )}

                  {/* Interactive Draggable Multi-Room Boxes on the 2D House Map */}
                  {roomsList.map((rm, rIdx) => {
                    const isSelectedRoom = rm.id === activeRoomId;
                    const boxX = rm.mapX ?? (rIdx % 2 === 0 ? 6 : 52);
                    const boxY = rm.mapY ?? (rIdx < 2 ? 8 : 54);
                    const boxW = rm.mapW ?? 40;
                    const boxH = rm.mapH ?? 38;
                    const rmSqFt = (
                      (rm.roomWidthFt + rm.roomWidthExtraIn / 12) *
                      (rm.roomLengthFt + rm.roomLengthExtraIn / 12)
                    ).toFixed(0);
                    return (
                      <div
                        key={rm.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleSelectRoomProfile(rm);
                          setDraggingMapRoomId(rm.id);
                        }}
                        style={{
                          left: `${boxX}%`,
                          top: `${boxY}%`,
                          width: `${boxW}%`,
                          height: `${boxH}%`,
                        }}
                        className={`absolute rounded-md border-2 transition-shadow cursor-move flex flex-col justify-between p-1.5 overflow-hidden ${
                          isSelectedRoom
                            ? 'border-amber-400 bg-sky-950/75 shadow-[0_0_15px_rgba(251,191,36,0.5)] z-20'
                            : 'border-sky-400/70 bg-slate-950/65 hover:border-white z-10'
                        }`}
                      >
                        {/* Mini Marble Bookmatch Vein Texture Preview inside the Room on 2D Map */}
                        <div className="absolute inset-0 opacity-35 pointer-events-none grid grid-cols-2 grid-rows-2">
                          {[0, 1, 2, 3].map((q) => (
                            <div
                              key={q}
                              style={{
                                backgroundImage: `url("${slabImageUrl}")`,
                                backgroundSize: '100% 100%',
                                transform: `scale(${q % 2 === 1 ? -1 : 1}, ${q >= 2 ? -1 : 1})`,
                              }}
                              className="w-full h-full border border-white/20"
                            />
                          ))}
                        </div>

                        <div className="relative z-10 flex items-center justify-between gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded border border-white/20">
                          <span className="text-[11px] font-extrabold text-white truncate">
                            {cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}
                          </span>
                          {isSelectedRoom && (
                            <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black">
                              {tr('ACTIVE', 'منتخب')}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex items-center justify-between gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded border border-sky-400/40 font-mono text-[10px]">
                          <span className="font-black text-amber-300">
                            {`${rm.roomWidthFt}'${rm.roomWidthExtraIn > 0 ? rm.roomWidthExtraIn + '"' : ''} × ${rm.roomLengthFt}'${rm.roomLengthExtraIn > 0 ? rm.roomLengthExtraIn + '"' : ''}`}
                          </span>
                          <span className="font-bold text-emerald-300">{`${rmSqFt} Sq.Ft`}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="absolute bottom-1.5 right-2 z-30 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-slate-300 pointer-events-none">
                    {tr(
                      'Drag any room to position on 2D Map • Click room to edit marble layout below',
                      'کمرے کو ماؤس سے پکڑ کر نقشے پر سیٹ کریں • کلک کر کے نیچے ماربل ڈیزائن بنائیں'
                    )}
                  </div>
                </div>
              </div>

              {/* Room List & Map Room Dimension / Box Size Quick Controls */}
              <div className="lg:col-span-4 rounded-lg border border-slate-800 bg-slate-900 p-2.5 space-y-2">
                <div className="text-xs font-extrabold text-amber-300 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>
                    {tr('House Rooms & Marble Schedule:', 'گھر کے کمرے اور ماربل تفصیل:')}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300">
                    {tr(`${roomsList.length} Rooms`, `${roomsList.length} کمرے`)}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {roomsList.map((rm) => {
                    const isSelected = rm.id === activeRoomId;
                    const rmSqFt = (
                      (rm.roomWidthFt + rm.roomWidthExtraIn / 12) *
                      (rm.roomLengthFt + rm.roomLengthExtraIn / 12)
                    ).toFixed(1);
                    return (
                      <div
                        key={rm.id}
                        onClick={() => handleSelectRoomProfile(rm)}
                        className={`rounded-lg border p-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-slate-950 shadow'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-extrabold text-white">
                            {cadLang === 'ur' ? rm.roomNameUr : rm.roomNameEn}
                          </span>
                          <span className="text-[11px] font-mono font-black text-amber-300">
                            {`${rm.roomWidthFt}'×${rm.roomLengthFt}' (${rmSqFt} ft²)`}
                          </span>
                        </div>
                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 pt-1.5 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[10px] font-mono"
                          >
                            <div>
                              <span className="text-slate-400 block">
                                {tr('Map Width %', 'نقشہ چوڑائی %')}
                              </span>
                              <input
                                type="range"
                                min="15"
                                max="85"
                                value={rm.mapW ?? 40}
                                onChange={(e) => {
                                  const nextW = Number(e.target.value);
                                  setRoomsList((prev) =>
                                    prev.map((item) =>
                                      item.id === rm.id ? { ...item, mapW: nextW } : item
                                    )
                                  );
                                }}
                                className="w-full h-1.5 accent-amber-400 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className="text-slate-400 block">
                                {tr('Map Height %', 'نقشہ لمبائی %')}
                              </span>
                              <input
                                type="range"
                                min="15"
                                max="85"
                                value={rm.mapH ?? 38}
                                onChange={(e) => {
                                  const nextH = Number(e.target.value);
                                  setRoomsList((prev) =>
                                    prev.map((item) =>
                                      item.id === rm.id ? { ...item, mapH: nextH } : item
                                    )
                                  );
                                }}
                                className="w-full h-1.5 accent-sky-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
          {/* Room Width × Length Inputs */}
          <div className="lg:col-span-5 rounded-lg bg-slate-950 border border-slate-800 p-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-amber-300">
                {tr('1. Room Size (Feet & Inches):', '1. کمرے کا سائز (فٹ اور انچ):')}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { w: 12, l: 14, label: "12'×14'" },
                  { w: 14, l: 16, label: "14'×16'" },
                  { w: 16, l: 20, label: "16'×20'" },
                  { w: 19, l: 18, label: "19'×18'" },
                  { w: 18, l: 24, label: "18'×24'" },
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
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      roomWidthFt === preset.w && roomLengthFt === preset.l
                        ? 'bg-amber-500 border-amber-300 text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <Label className="text-[10px] font-bold text-amber-300 block">
                  {tr('1. Width (Ft)', '1. چوڑائی (فٹ)')}
                </Label>
                <Input
                  type="number"
                  min="4"
                  max="100"
                  value={roomWidthFt}
                  onChange={(e) => setRoomWidthFt(Math.max(4, Number(e.target.value) || 4))}
                  className="h-7 bg-slate-900 border-amber-500/60 text-white font-mono text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400 block">
                  {tr('+ Inches', '+ انچ')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  value={roomWidthExtraIn}
                  onChange={(e) =>
                    setRoomWidthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
                  }
                  className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-sky-300 block">
                  {tr('2. Length (Ft)', '2. لمبائی (فٹ)')}
                </Label>
                <Input
                  type="number"
                  min="4"
                  max="100"
                  value={roomLengthFt}
                  onChange={(e) => setRoomLengthFt(Math.max(4, Number(e.target.value) || 4))}
                  className="h-7 bg-slate-900 border-sky-500/60 text-white font-mono text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400 block">
                  {tr('+ Inches', '+ انچ')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  value={roomLengthExtraIn}
                  onChange={(e) =>
                    setRoomLengthExtraIn(Math.max(0, Math.min(11, Number(e.target.value) || 0)))
                  }
                  className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* 3 Compact Floor Design Buttons */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectDesignMode('full_room_bookmatch')}
              className={`p-2 rounded-lg border text-right transition-all ${
                designMode === 'full_room_bookmatch'
                  ? 'bg-sky-600/25 border-sky-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span>{tr('🦋 Full Room Bookmatch', '🦋 پورا کمرہ بک میچ')}</span>
                {designMode === 'full_room_bookmatch' && (
                  <span className="text-[10px] text-sky-300">✓</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {tr('4-Piece Bookmatch without border', 'بغیر بارڈر 4 پیس بک میچ')}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDesignMode('center_bm_with_border')}
              className={`p-2 rounded-lg border text-right transition-all ${
                designMode === 'center_bm_with_border'
                  ? 'bg-emerald-600/25 border-emerald-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span>{tr('🖼️ Center Bookmatch + Border', '🖼️ سینٹر بک میچ + بارڈر')}</span>
                {designMode === 'center_bm_with_border' && (
                  <span className="text-[10px] text-emerald-300">✓</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {tr('Center Chauras with outer room border', 'درمیان میں چارس اور باہر بارڈر')}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDesignMode('center_bm_brass_patti_border')}
              className={`p-2 rounded-lg border text-right transition-all ${
                designMode === 'center_bm_brass_patti_border'
                  ? 'bg-amber-500/25 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-300">
                <span>
                  {tr('👑 Bookmatch + Brass + Strip + Border', '👑 بک میچ + براس + پٹی + بارڈر')}
                </span>
                {designMode === 'center_bm_brass_patti_border' && (
                  <span className="text-[10px] text-amber-200">✓</span>
                )}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {tr('Complete luxury layout with strip & border', 'مکمل ڈیزائن پٹی اور بارڈر سمیت')}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          EQUAL SIDE-BY-SIDE DIAGRAMS ROW:
          LEFT (50%): DIAGRAM 1 (FLOOR) + ALL FLOOR DESIGN & EXPORT BUTTONS DIRECTLY ABOVE IT
          RIGHT (50%): DIAGRAM 2 (STOCK SLAB) + ALL STOCK / BORDER / STRIP BUTTONS DIRECTLY ABOVE IT
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* LEFT DIAGRAM: DIAGRAM 1 — ROOM FLOOR BOOKMATCH DIAGRAM + DEDICATED FLOOR CONTROLS */}
        <div
          className={`${
            isDiagramExpanded ? 'md:col-span-12' : 'md:col-span-6'
          } rounded-xl border-2 border-slate-600 bg-slate-900 p-3 flex flex-col justify-between space-y-2.5 shadow-xl`}
        >
          {/* Diagram 1 Header + Dedicated Diagram 1 Buttons (Never drifts over Diagram 2!) */}
          <div className="space-y-2 border-b border-slate-800 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-mono text-xs font-black">
                  {tr('DIAGRAM 1: FLOOR', 'ڈایاگرام 1: فلور نقشہ')}
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-white font-mono">
                  {`${roomNameInput} (${roomWidthFt}'×${roomLengthFt}' · ${totalRoomSqFt.toFixed(1)} Sq.Ft)`}
                </h3>
              </div>

              {/* Export & Manual Adjust Buttons right on Diagram 1 */}
              <div className="flex flex-wrap items-center gap-1 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsRoomPdfModalOpen(true)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-sky-400" />
                  <span>{tr('PDF', 'پی ڈی ایف')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadStandaloneRoomPdfReport}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{tr('Save PDF', 'ڈاؤن لوڈ PDF')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadRoomAutoCadDwg('dxf')}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                  title={tr('Download True 1:1 Scale AutoCAD .DXF File', 'اصلی 1:1 اسکیل آٹو کیڈ .DXF فائل ڈاؤن لوڈ کریں')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>📐 1:1 .DXF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadRoomAutoCadDwg('dwg')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-amber-500/80 text-amber-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                  title={tr('Download True 1:1 Scale AutoCAD .DWG File', 'اصلی 1:1 اسکیل آٹو کیڈ .DWG فائل ڈاؤن لوڈ کریں')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>.DWG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsManualSlabGrabMode((v) => !v);
                    setSwapSourcePieceIdx(null);
                  }}
                  className={`px-2 py-1 rounded font-extrabold text-xs flex items-center gap-1 border cursor-pointer ${
                    isManualSlabGrabMode
                      ? 'bg-emerald-500 border-white text-slate-950'
                      : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {isManualSlabGrabMode ? (
                    <>
                      <Hand className="h-3 w-3" />
                      <span>{tr('Manual: ON', 'مینول: آن')}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-amber-400" />
                      <span>{tr('Manual Adjust', 'مینول ایڈجسٹ')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagram 1 Toolbar Row: Pieces Count + Layout Mode + Slab Direction */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800 print:hidden">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const presets = [
                      { r: 1, c: 2, leg: '2_pieces' as const },
                      { r: 2, c: 2, leg: '4_pieces' as const },
                      { r: 2, c: 3, leg: '6_pieces' as const },
                      { r: 2, c: 4, leg: '6_pieces' as const },
                      { r: 3, c: 3, leg: '6_pieces' as const },
                      { r: 3, c: 4, leg: '6_pieces' as const },
                      { r: 4, c: 4, leg: '6_pieces' as const },
                    ];
                    const idx = presets.findIndex((p) => p.r === bmRows && p.c === bmCols);
                    const next = presets[(idx + 1) % presets.length];
                    setCustomGridRows(next.r);
                    setCustomGridCols(next.c);
                    setCenterPiecesGrid(next.leg);
                  }}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{tr(`Pieces: ${totalBmPiecesCount}`, `پیس: ${totalBmPiecesCount}`)}</span>
                </button>

                <select
                  value={`${bmRows}x${bmCols}`}
                  onChange={(e) => {
                    const [rStr, cStr] = e.target.value.split('x');
                    const r = Math.max(1, Number(rStr) || 2);
                    const c = Math.max(1, Number(cStr) || 2);
                    setCustomGridRows(r);
                    setCustomGridCols(c);
                    setCenterPiecesGrid(
                      r === 1 && c === 2 ? '2_pieces' : r === 2 && c === 2 ? '4_pieces' : '6_pieces'
                    );
                  }}
                  className="h-7 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1.5 cursor-pointer"
                >
                  <option value="1x2">{tr('2 Pcs (1×2)', '2 پیس (1×2)')}</option>
                  <option value="2x2">{tr('4 Pcs (2×2)', '4 پیس (2×2)')}</option>
                  <option value="2x3">{tr('6 Pcs (2×3)', '6 پیس (2×3)')}</option>
                  <option value="2x4">{tr('8 Pcs (2×4)', '8 پیس (2×4)')}</option>
                  <option value="3x3">{tr('9 Pcs (3×3)', '9 پیس (3×3)')}</option>
                  <option value="3x4">{tr('12 Pcs (3×4)', '12 پیس (3×4)')}</option>
                  <option value="4x4">{tr('16 Pcs (4×4)', '16 پیس (4×4)')}</option>
                  <option value="4x5">{tr('20 Pcs (4×5)', '20 پیس (4×5)')}</option>
                </select>

                <select
                  value={slabPlacementMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as
                      | 'center_both_sides_cut'
                      | 'one_side_full_opposite_cut'
                      | 'equal_all_pieces';
                    setSlabPlacementMode(nextMode);
                    if (nextMode === 'one_side_full_opposite_cut') {
                      setCustomGridRows(autoFullSlabRowsFit);
                      setCustomGridCols(autoFullSlabColsFit);
                    } else if (nextMode === 'equal_all_pieces') {
                      setCustomGridRows(Math.max(customGridRows, minEqualRowsForStock));
                      setCustomGridCols(Math.max(customGridCols, minEqualColsForStock));
                    }
                  }}
                  className="h-7 rounded bg-slate-900 border border-slate-700 text-white font-bold text-xs px-1.5 cursor-pointer"
                >
                  <option value="center_both_sides_cut">
                    {tr('Center BM + Side Cut', 'سینٹر بک میچ + سائیڈ کٹ')}
                  </option>
                  <option value="one_side_full_opposite_cut">
                    {tr('One-Side Full ➔ Cut', 'ایک طرف ثابت ➔ دوسری طرف کٹ')}
                  </option>
                  <option value="equal_all_pieces">
                    {tr('Equal Size All Pieces', 'برابر سائز پیس (ایکول)')}
                  </option>
                </select>

                {slabPlacementMode === 'one_side_full_opposite_cut' && (
                  <select
                    value={fullSlabStartCorner}
                    onChange={(e) =>
                      setFullSlabStartCorner(
                        e.target.value as 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
                      )
                    }
                    className="h-7 rounded bg-slate-900 border border-slate-700 text-sky-200 font-bold text-xs px-1.5 cursor-pointer"
                  >
                    <option value="top_left">{tr('↖ Top-Left Full', '↖ اوپر بائیں ثابت')}</option>
                    <option value="top_right">{tr('↗ Top-Right Full', '↗ اوپر دائیں ثابت')}</option>
                    <option value="bottom_left">{tr('↙ Bottom-Left Full', '↙ نیچے بائیں ثابت')}</option>
                    <option value="bottom_right">{tr('↘ Bottom-Right Full', '↘ نیچے دائیں ثابت')}</option>
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSlabDirectionInRoom((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'))
                }
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-600 text-white text-xs font-extrabold font-mono flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {slabDirectionInRoom === 'horizontal'
                    ? tr(
                        `↔ Horiz (${rawStockSlabW}"×${rawStockSlabL}")`,
                        `↔ سیدھا (${rawStockSlabW}"×${rawStockSlabL}")`
                      )
                    : tr(
                        `↕ Vert 90° (${rawStockSlabL}"×${rawStockSlabW}")`,
                        `↕ کھڑا 90° (${rawStockSlabL}"×${rawStockSlabW}")`
                      )}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {renderRoomFloorCanvas(false, false)}
          </div>
        </div>

        {/* RIGHT DIAGRAM: DIAGRAM 2 — STOCK SLAB DIAGRAM + DEDICATED STOCK / BORDER / STRIP CONTROLS */}
        {!isDiagramExpanded && (
          <div className="md:col-span-6 rounded-xl border-2 border-slate-600 bg-slate-900 p-3 flex flex-col justify-between space-y-2.5 shadow-xl">
            {/* Top Header of Slab Diagram: Stock Controls + Border/Strip Controls + Slab Selector */}
            <div className="space-y-2 border-b border-slate-800 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-black">
                    {tr('DIAGRAM 2: STOCK SLAB', 'ڈایاگرام 2: اسٹاک سلیب')}
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white font-mono">
                    {tr(
                      `Slab #${activeSlabIndex}/${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}")`,
                      `سلیب #${activeSlabIndex}/${totalSameStockSlabsInList} (${safeSlabW}"×${safeSlabL}")`
                    )}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={onTriggerSlabPhotoUpload}
                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
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
                    className="h-7 rounded bg-slate-950 border border-slate-700 text-white text-xs font-bold px-1.5 cursor-pointer"
                  >
                    <option value="" disabled>
                      {tr('🎨 Preset', '🎨 کلر')}
                    </option>
                    <option value="statuario">{tr('White Statuario', 'وائٹ اسٹیچوریو')}</option>
                    <option value="black_gold">{tr('Black & Gold', 'بلیک اینڈ گولڈ')}</option>
                    <option value="onyx">{tr('Green Onyx', 'گرین اونکس')}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDownloadRoomAutoCadDwg('dxf')}
                    className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                    title={tr('Download True 1:1 Scale AutoCAD .DXF File', 'اصلی 1:1 اسکیل آٹو کیڈ .DXF فائل ڈاؤن لوڈ کریں')}
                  >
                    <Download className="h-3 w-3" />
                    <span>📐 1:1 .DXF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadRoomAutoCadDwg('dwg')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-amber-500/80 text-amber-300 text-xs font-black flex items-center gap-1 cursor-pointer"
                    title={tr('Download True 1:1 Scale AutoCAD .DWG File', 'اصلی 1:1 اسکیل آٹو کیڈ .DWG فائل ڈاؤن لوڈ کریں')}
                  >
                    <Download className="h-3 w-3" />
                    <span>.DWG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSyncAllSlabsCrop((v) => !v)}
                    className={`px-2 py-1 rounded text-xs font-extrabold border flex items-center gap-1 cursor-pointer ${
                      syncAllSlabsCrop
                        ? 'bg-slate-800 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    <CopyCheck className="h-3 w-3" />
                    <span>{syncAllSlabsCrop ? tr('Sync: ON', 'سنک: آن') : tr('Sync: OFF', 'الگ الگ')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAllSlabsList((v) => !v)}
                    className={`px-2 py-1 rounded text-xs font-extrabold border cursor-pointer ${
                      !showAllSlabsList
                        ? 'bg-emerald-500 border-white text-slate-950'
                        : 'bg-slate-950 border-slate-600 text-slate-200'
                    }`}
                  >
                    {!showAllSlabsList
                      ? tr('Single Slab', 'سنگل سلیب')
                      : tr('All Slabs', 'تمام سلیب')}
                  </button>
                </div>
              </div>

              {/* STOCK BORDER & STRIP CONTROLS DIRECTLY ABOVE DIAGRAM 2 (STOCK SLAB) */}
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5 flex flex-wrap items-center justify-between gap-1.5 text-xs print:hidden">
                {/* Outer Border Controls */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hasOuterBorder;
                      setHasOuterBorder(next);
                      if (next && designMode === 'full_room_bookmatch') {
                        setDesignMode('center_bm_with_border');
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-extrabold border cursor-pointer ${
                      hasOuterBorder && designMode !== 'full_room_bookmatch'
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {hasOuterBorder && designMode !== 'full_room_bookmatch'
                      ? tr('✓ Border: ON', '✓ بارڈر: آن')
                      : tr('Border: OFF', 'بارڈر: آف')}
                  </button>

                  <select
                    value={outerBorderWidthIn}
                    onChange={(e) => {
                      setHasOuterBorder(true);
                      if (designMode === 'full_room_bookmatch') {
                        setDesignMode('center_bm_with_border');
                      }
                      setOuterBorderWidthIn(Number(e.target.value) || 15);
                    }}
                    className="h-6 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1 cursor-pointer"
                  >
                    {[6, 9, 12, 15, 18, 24].map((bw) => (
                      <option key={bw} value={bw}>
                        {tr(`Border ${bw}"`, `بارڈر ${bw}"`)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={borderSlabSource}
                    onChange={(e) => setBorderSlabSource(e.target.value as BorderSlabSourceMode)}
                    className="h-6 rounded bg-slate-900 border border-slate-700 text-emerald-300 text-xs font-bold px-1 cursor-pointer"
                  >
                    <option value="from_bm_slabs_leftover">
                      {tr('♻️ From BM Leftover (Auto)', '♻️ بک میچ بقیہ سے (آٹو)')}
                    </option>
                    <option value="from_separate_same_stock_slabs">
                      {tr('Separate Stock Slab', 'الگ اسٹاک سلیب سے')}
                    </option>
                    <option value="from_custom_border_stock_slab">
                      {tr('Custom Border Slab', 'اپ لوڈ بارڈر سلیب')}
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => borderSlabFileInputRef.current?.click()}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="h-3 w-3" />
                    <span>{tr('Border Photo', 'بارڈر فوٹو')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBorderSlabSource('from_custom_border_stock_slab');
                      setShowBorderSlabDrawer((v) => !v);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono font-bold cursor-pointer"
                  >
                    {`${borderSlabWidthIn}"×${borderSlabLengthIn}" ▾`}
                  </button>
                </div>

                {/* Strip / Patti & Brass Controls */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hasContrastPatti;
                      setHasContrastPatti(next);
                      if (next && designMode === 'full_room_bookmatch') {
                        setDesignMode('center_bm_brass_patti_border');
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-extrabold border cursor-pointer ${
                      hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                        ? 'bg-amber-500 border-amber-300 text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {hasContrastPatti && designMode === 'center_bm_brass_patti_border'
                      ? tr('✓ Strip: ON', '✓ پٹی: آن')
                      : tr('Strip: OFF', 'پٹی: آف')}
                  </button>

                  <select
                    value={contrastPattiWidthIn}
                    onChange={(e) => {
                      setHasContrastPatti(true);
                      setDesignMode('center_bm_brass_patti_border');
                      setContrastPattiWidthIn(Number(e.target.value) || 6);
                    }}
                    className="h-6 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold px-1 cursor-pointer"
                  >
                    {[3, 4, 6, 9, 12].map((pw) => (
                      <option key={pw} value={pw}>
                        {tr(`Strip ${pw}"`, `پٹی ${pw}"`)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={contrastMarbleType}
                    onChange={(e) => {
                      setContrastMarbleType(e.target.value as ContrastMarbleType);
                      setPattiCustomSlabImageUrl(null);
                      setHasContrastPatti(true);
                      setDesignMode('center_bm_brass_patti_border');
                    }}
                    className="h-6 rounded bg-slate-900 border border-slate-700 text-amber-200 text-xs font-bold px-1 cursor-pointer"
                  >
                    {(Object.keys(CONTRAST_MARBLE_META) as ContrastMarbleType[]).map((mKey) => {
                      const m = CONTRAST_MARBLE_META[mKey];
                      return (
                        <option key={mKey} value={mKey}>
                          {cadLang === 'ur' ? m.shortUr : m.shortEn}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => pattiSlabFileInputRef.current?.click()}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="h-3 w-3" />
                    <span>{tr('Strip Photo', 'پٹی فوٹو')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPattiSlabDrawer((v) => !v)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono font-bold cursor-pointer"
                  >
                    {`${pattiSlabWidthIn}"×${pattiSlabLengthIn}" ▾`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasBrassPatti((v) => !v)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold border cursor-pointer ${
                      hasBrassPatti
                        ? 'bg-yellow-400 border-yellow-200 text-slate-950'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {hasBrassPatti ? tr('Brass: ON', 'براس: آن') : tr('Brass: OFF', 'براس: آف')}
                  </button>
                </div>
              </div>

              {/* Expandable Drawer for Border Slab Size inside Diagram 2 */}
              {showBorderSlabDrawer && (
                <div className="rounded-lg bg-slate-950 border border-slate-700 p-2 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Border Slab Name', 'بارڈر سلیب نام')}
                      </Label>
                      <Input
                        type="text"
                        value={borderSlabMaterialName}
                        onChange={(e) => setBorderSlabMaterialName(e.target.value)}
                        className="h-7 bg-slate-900 border-slate-700 text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Width (In)', 'چوڑائی (انچ)')}
                      </Label>
                      <Input
                        type="number"
                        value={borderSlabWidthIn}
                        onChange={(e) =>
                          setBorderSlabWidthIn(Math.max(18, Number(e.target.value) || 58))
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Length (In)', 'لمبائی (انچ)')}
                      </Label>
                      <Input
                        type="number"
                        value={borderSlabLengthIn}
                        onChange={(e) =>
                          setBorderSlabLengthIn(Math.max(36, Number(e.target.value) || 106))
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
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
                          setIsBorderCustomUploaded(true);
                          setShowBorderSlabDrawer(false);
                        }}
                        className="w-full h-7 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                      >
                        {tr('✓ Save', '✓ سیو کریں')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable Drawer for Strip Slab Size inside Diagram 2 */}
              {showPattiSlabDrawer && (
                <div className="rounded-lg bg-slate-950 border border-slate-700 p-2 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Strip Slab Name', 'پٹی سلیب نام')}
                      </Label>
                      <Input
                        type="text"
                        value={pattiSlabMaterialName}
                        onChange={(e) => setTwinPattiSlabName(e.target.value)}
                        className="h-7 bg-slate-900 border-slate-700 text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Width (In)', 'چوڑائی (انچ)')}
                      </Label>
                      <Input
                        type="number"
                        value={pattiSlabWidthIn}
                        onChange={(e) =>
                          setPattiSlabWidthIn(Math.max(12, Number(e.target.value) || 48))
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-300 font-bold">
                        {tr('Length (In)', 'لمبائی (انچ)')}
                      </Label>
                      <Input
                        type="number"
                        value={pattiSlabLengthIn}
                        onChange={(e) =>
                          setPattiSlabLengthIn(Math.max(24, Number(e.target.value) || 96))
                        }
                        className="h-7 bg-slate-900 border-slate-700 text-white font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
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
                          setShowPattiSlabDrawer(false);
                        }}
                        className="w-full h-7 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                      >
                        {tr('✓ Save', '✓ سیو کریں')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SLAB SELECTOR BAR: Choose which Slab (#1..#N) to view */}
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlabIndex((prev) =>
                        prev > 1 ? prev - 1 : totalSameStockSlabsInList
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    ◀
                  </button>

                  <select
                    value={activeSlabIndex}
                    onChange={(e) => scrollToSpecificSlab(Number(e.target.value) || 1)}
                    className="h-7 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs font-extrabold px-2 cursor-pointer"
                  >
                    {Array.from({ length: totalSameStockSlabsInList }).map((_, i) => {
                      const sNum = i + 1;
                      const pLet = PIECE_LETTERS[i] || `S${sNum}`;
                      const isUsedInCenter = sNum <= totalBmPiecesCount;
                      const isSideCutSlab =
                        !isUsedInCenter && sNum <= totalBookmatchAndSideSlabsCount;
                      const hasLeftoverBorder =
                        isUsedInCenter &&
                        effectiveOuterBorderIn > 0 &&
                        borderSlabSource === 'from_bm_slabs_leftover' &&
                        leftoverWidthOnBmSlabIn >= effectiveOuterBorderIn;
                      return (
                        <option key={sNum} value={sNum} className="bg-slate-950 text-white">
                          {isUsedInCenter
                            ? `Slab #${sNum} — P${sNum} (${pLet}) · ${singleBmPieceWidthIn}"×${singleBmPieceLengthIn}"${
                                hasLeftoverBorder
                                  ? ` + Border B${sNum} (${effectiveOuterBorderIn}"×${halfTopBottomBorderLenIn}")`
                                  : ''
                              }`
                            : isSideCutSlab
                            ? `Slab #${sNum} — Side Cut · ${sideCutPieceActualWidthIn}"×${singleBmPieceLengthIn}"`
                            : `Slab #${sNum} — Border Slab`}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlabIndex((prev) =>
                        prev < totalSameStockSlabsInList ? prev + 1 : 1
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    ▶
                  </button>
                </div>

                {/* Quick buttons for slabs */}
                <div className="flex flex-wrap items-center gap-1">
                  {Array.from({ length: Math.min(8, totalSameStockSlabsInList) }).map((_, i) => {
                    const sNum = i + 1;
                    const pLet = PIECE_LETTERS[i] || `S${sNum}`;
                    const isUsedInCenter = sNum <= totalBmPiecesCount;
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => scrollToSpecificSlab(sNum)}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-extrabold border cursor-pointer ${
                          activeSlabIndex === sNum
                            ? 'bg-amber-500 border-white text-slate-950 shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {isUsedInCenter ? `S${sNum}(${pLet})` : `S${sNum}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FULL SLAB VIEWPORT (Auto-Fit Active Slab with Clean, Short, Readable AutoCAD Labels) */}
            <div
              ref={slabListScrollRef}
              className={
                showAllSlabsList
                  ? 'max-h-[540px] overflow-y-auto pr-1 space-y-3 scroll-smooth'
                  : 'flex-1 flex flex-col justify-center space-y-2.5'
              }
            >
              {Array.from({ length: totalSameStockSlabsInList })
                .map((_, idx) => idx + 1)
                .filter((slabNum) => showAllSlabsList || slabNum === activeSlabIndex)
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
                  const isBorderExtractedFromThisBmSlab =
                    isUsedInBookmatch &&
                    effectiveOuterBorderIn > 0 &&
                    borderSlabSource === 'from_bm_slabs_leftover' &&
                    largestHorizWasteIn >= effectiveOuterBorderIn;
                  const borderTargetLenOnThisSlab =
                    slabNum <= 2
                      ? halfTopBottomBorderLenIn
                      : Number((leftRightInnerBorderLenIn / 2).toFixed(1));
                  const borderCodeOnThisSlab = slabNum <= 2 ? `B${slabNum}-A` : `B${slabNum}-B`;

                  const activePieceLabel = isUsedInBookmatch
                    ? `P${slabNum} (${pieceLetter})`
                    : isSideCutStockSlab
                    ? isTopBottomSideSlab
                      ? sideMainPieceCode
                      : sideLrPieceCode
                    : `Border`;

                  // Collect all 4-side waste strips down to 0.1" (including 0.5", 1", 2", etc.)
                  const fourSideWasteItems: { side: string; size: string; isBorder?: boolean }[] = [];
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

                  return (
                    <div
                      key={slabNum}
                      ref={(el) => {
                        slabCardRefs.current[slabNum] = el;
                      }}
                      onClick={() => setActiveSlabIndex(slabNum)}
                      className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2 shadow-lg"
                    >
                      {/* Clean Short-Form Slab Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-xs font-black">
                            {`S${slabNum} · ${safeSlabW}"×${safeSlabL}"`}
                          </span>
                          {isUsedInBookmatch || isSideCutStockSlab ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-600 text-white text-xs font-bold">
                              {`${activePieceLabel} · ${activePieceWIn}"×${activePieceLIn}"`}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-600 text-white text-xs font-bold">
                              {`Border · ${effectiveOuterBorderIn}"`}
                            </span>
                          )}

                          {isBorderExtractedFromThisBmSlab && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/70 text-emerald-300 text-xs font-bold">
                              {`+ ${borderCodeOnThisSlab} · ${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}"`}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold">
                            {`✂️ Cut: ${totalSlabCutRunningIn}"`}
                          </span>
                        </div>

                        <input
                          ref={(el) => {
                            perSlabFileInputRefs.current[slabNum] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleIndividualSlabPhotoUpload(slabNum, e)}
                          className="hidden"
                        />

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              perSlabFileInputRefs.current[slabNum]?.click();
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="h-3 w-3" />
                            <span>{tr('Photo', 'فوٹو')}</span>
                          </button>
                          {slabSt.customImageUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplySlabPhotoToAll(slabNum);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-xs font-bold text-amber-300 cursor-pointer"
                            >
                              {tr('Apply All', 'سب پر')}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* FULL AUTO-FIT SLAB CANVAS — TRUE 1:1 GEOMETRIC PROPORTIONS (safeSlabL : safeSlabW) INSIDE FIXED 345px CAD VIEWPORT */}
                      {(() => {
                        const slabMaxW = 450;
                        const slabMaxH = 320;
                        const slabPxPerIn = Math.min(
                          slabMaxW / Math.max(12, safeSlabL),
                          slabMaxH / Math.max(12, safeSlabW)
                        );
                        const exactSlabW = Math.max(120, Math.round(safeSlabL * slabPxPerIn));
                        const exactSlabH = Math.max(100, Math.round(safeSlabW * slabPxPerIn));
                        return (
                          <div
                            style={{ minHeight: '345px' }}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 flex items-center justify-center"
                          >
                            <div
                              ref={(el) => {
                                slabBoxRefs.current[slabNum] = el;
                              }}
                              onMouseDown={() => {
                                setActiveSlabIndex(slabNum);
                                if (isUsedInBookmatch || isSideCutStockSlab) {
                                  setDraggingSlabNum(slabNum);
                                }
                              }}
                              onMouseUp={() => setDraggingSlabNum(null)}
                              onMouseLeave={() => setDraggingSlabNum(null)}
                              onMouseMove={(e) => handleSlabPointerMove(slabNum, e)}
                              style={{
                                width: `${exactSlabW}px`,
                                height: `${exactSlabH}px`,
                                backgroundImage: `url("${effectiveImgUrl}")`,
                                backgroundSize: '100% 100%',
                              }}
                              className="relative shrink-0 rounded-none border-2 border-white bg-slate-900 overflow-hidden cursor-move select-none shadow-2xl"
                            >
                              <div className="absolute inset-0 bg-slate-950/35 pointer-events-none" />

                              {/* 1. ACTIVE CUT PIECE ZONE (CENTER BOOKMATCH OR ADJUSTABLE SIDE-CUT PIECE) */}
                              {(isUsedInBookmatch || isSideCutStockSlab) && (
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
                                  className="absolute z-10 border-2 border-white shadow-md flex flex-col items-center justify-center p-1.5"
                                >
                                  <div className="px-2.5 py-0.5 rounded bg-slate-950/90 border border-white/80 font-mono text-xs sm:text-sm font-black text-white shadow-lg pointer-events-none text-center">
                                    {`${activePieceLabel} · ${activePieceWIn}"×${activePieceLIn}"`}
                                  </div>
                                  <span className="mt-0.5 px-1.5 py-0.2 rounded bg-sky-950/90 border border-sky-400/60 font-mono text-[9px] font-bold text-sky-200 pointer-events-none">
                                    {tr('Drag to Shift Cut Area', 'کاٹنے کی جگہ ماؤس سے ہلائیں')}
                                  </span>
                                </div>
                              )}

                              {/* 2. ALL 4 SIDES EXACT LEFTOVER / SAVED WASTE STRIPS (EVEN DOWN TO 0.5" OR 1") */}
                              {(isUsedInBookmatch || isSideCutStockSlab) && (
                                <>
                                  {/* TOP WASTE STRIP (above cut piece) */}
                                  {topWasteIn >= 0.1 && (
                                    <div
                                      style={{
                                        left: '0%',
                                        top: '0%',
                                        width: '100%',
                                        height: `${Math.max(4, topWastePct)}%`,
                                      }}
                                      className="absolute z-20 border-b-2 border-dashed border-emerald-300 bg-slate-950/80 flex items-center justify-between px-2 pointer-events-none"
                                    >
                                      <span className="text-[10px] sm:text-xs font-mono font-black text-emerald-300 truncate">
                                        {`${tr('Top Saved/Waste', 'اوپر بچت')}: ${topWasteIn}"×${safeSlabL}"`}
                                      </span>
                                    </div>
                                  )}

                                  {/* BOTTOM WASTE STRIP (below cut piece) */}
                                  {bottomWasteIn >= 0.1 && (
                                    <div
                                      style={{
                                        left: '0%',
                                        top: `${Math.min(96, clampedY + pieceHeightPct)}%`,
                                        width: '100%',
                                        height: `${Math.max(4, bottomWastePct)}%`,
                                      }}
                                      className="absolute z-20 border-t-2 border-dashed border-emerald-300 bg-slate-950/80 flex items-center justify-between px-2 pointer-events-none"
                                    >
                                      <span className="text-[10px] sm:text-xs font-mono font-black text-emerald-300 truncate">
                                        {isBorderExtractedFromThisBmSlab
                                          ? `Border ${borderCodeOnThisSlab} · ${effectiveOuterBorderIn}"×${borderTargetLenOnThisSlab}"`
                                          : `${tr('Bottom Saved/Waste', 'نیچے بچت')}: ${bottomWasteIn}"×${safeSlabL}"`}
                                      </span>
                                      <span className="text-[10px] font-mono bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded shrink-0">
                                        {`${bottomWasteIn}"×${safeSlabL}"`}
                                      </span>
                                    </div>
                                  )}

                                  {/* LEFT WASTE STRIP (left of cut piece,even 0.5" or 1") */}
                                  {leftWasteIn >= 0.1 && (
                                    <div
                                      style={{
                                        left: '0%',
                                        top: `${clampedY}%`,
                                        width: `${Math.max(4, leftWastePct)}%`,
                                        height: `${pieceHeightPct}%`,
                                      }}
                                      className="absolute z-20 border-r-2 border-dashed border-amber-300 bg-slate-950/85 flex flex-col items-center justify-center p-0.5 text-center pointer-events-none"
                                    >
                                      <span className="text-[9px] sm:text-[10px] font-mono font-black text-amber-300 leading-tight">
                                        {tr('Left', 'بائیں')}
                                      </span>
                                      <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-white leading-tight">
                                        {`${activePieceWIn}"×${leftWasteIn}"`}
                                      </span>
                                    </div>
                                  )}

                                  {/* RIGHT WASTE STRIP (right of cut piece, even 0.5" or 1") */}
                                  {rightWasteIn >= 0.1 && (
                                    <div
                                      style={{
                                        left: `${Math.min(96, clampedX + pieceWidthPct)}%`,
                                        top: `${clampedY}%`,
                                        width: `${Math.max(4, rightWastePct)}%`,
                                        height: `${pieceHeightPct}%`,
                                      }}
                                      className="absolute z-20 border-l-2 border-dashed border-amber-300 bg-slate-950/85 flex flex-col items-center justify-center p-0.5 text-center pointer-events-none"
                                    >
                                      <span className="text-[9px] sm:text-[10px] font-mono font-black text-amber-300 leading-tight">
                                        {tr('Right', 'دائیں')}
                                      </span>
                                      <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-white leading-tight">
                                        {`${activePieceWIn}"×${rightWasteIn}"`}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* 3. DEDICATED BORDER SLAB CUTTING MARKINGS */}
                              {isDedicatedBorderSlab && (
                                <div className="absolute inset-1.5 z-20 flex flex-col gap-1 pointer-events-none">
                                  {Array.from({ length: Math.min(4, stripsPerFullBorderSlab) }).map(
                                    (_, bIdx) => (
                                      <div
                                        key={bIdx}
                                        className="flex-1 border border-dashed border-white bg-slate-950/75 flex items-center justify-between px-3"
                                      >
                                        <span className="text-xs font-mono font-bold text-white">
                                          {`Border #${bIdx + 1} · ${effectiveOuterBorderIn}"×${safeSlabL}"`}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4-SIDE EXACT SAVED / WASTE SUMMARY BAR (SHOWS EVEN 0.5" OR 1" ON ANY SIDE) */}
                      <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {`${tr('Used Piece', 'استعمال شدہ پیس')}: ${activePieceLabel} (${activePieceWIn}"×${activePieceLIn}")`}
                          </span>
                          <span className="text-[11px] font-bold text-sky-300">
                            {`${tr('Cut Position', 'کٹنگ پوزیشن')}: X=${cutStartXIn}" , Y=${cutStartYIn}"`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                          <span className="text-[11px] font-extrabold text-emerald-300">
                            {tr('Saved / Waste Pieces (All 4 Sides):', 'بچت / ویسٹ پیس (چاروں سائیڈ):')}
                          </span>
                          {fourSideWasteItems.length > 0 ? (
                            fourSideWasteItems.map((wItem, wIdx) => (
                              <span
                                key={wIdx}
                                className={`px-2 py-0.5 rounded text-[11px] font-black border ${
                                  wItem.isBorder
                                    ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                                    : 'bg-slate-950 border-amber-400/70 text-amber-300'
                                }`}
                              >
                                {`${wItem.side}: ${wItem.size}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">
                              {tr('0" Waste (100% Full Slab Used)', '0" ویسٹ (پوری سلیب استعمال شدہ)')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Per-Slab Sliders, Custom Width × Length Resize & Flip/Mirror Controls (Works for BOTH Bookmatch AND Side-Cut Slabs!) */}
                      {(isUsedInBookmatch || isSideCutStockSlab) && (
                        <div className="rounded bg-slate-900/90 border border-slate-800 px-2.5 py-2 space-y-2">
                          {/* Row 1: X-Shift, Y-Shift & Flip / Rotate */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                            <div className="sm:col-span-4">
                              <Label className="text-[10px] font-bold text-slate-300 flex justify-between font-mono">
                                <span>{tr('X-Shift (Left/Right)', 'دائیں بائیں شفٹ')}</span>
                                <span className="text-amber-300">{`L:${leftWasteIn}" | R:${rightWasteIn}"`}</span>
                              </Label>
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

                            <div className="sm:col-span-4">
                              <Label className="text-[10px] font-bold text-slate-300 flex justify-between font-mono">
                                <span>{tr('Y-Shift (Top/Bottom)', 'اوپر نیچے شفٹ')}</span>
                                <span className="text-emerald-300">{`T:${topWasteIn}" | B:${bottomWasteIn}"`}</span>
                              </Label>
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

                            <div className="sm:col-span-4 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlabState(slabNum, { flipHOverride: !curFlipH }, true)
                                }
                                className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer ${
                                  curFlipH
                                    ? 'bg-sky-600 border-sky-300 text-white'
                                    : 'bg-slate-950 border-slate-700 text-slate-300'
                                }`}
                              >
                                <FlipHorizontal className="h-3 w-3 inline" /> ↔
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlabState(slabNum, { flipVOverride: !curFlipV }, true)
                                }
                                className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer ${
                                  curFlipV
                                    ? 'bg-sky-600 border-sky-300 text-white'
                                    : 'bg-slate-950 border-slate-700 text-slate-300'
                                }`}
                              >
                                <FlipVertical className="h-3 w-3 inline" /> ↕
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
                                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 cursor-pointer"
                              >
                                <RotateCw className="h-3 w-3 inline" /> 90°
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Custom Piece Width × Length Resize Controls (چھوٹا بڑا کرنے کا طریقہ) */}
                          <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                            <span className="font-bold text-amber-300">
                              {tr(
                                `Resize Piece (${activePieceLabel}):`,
                                `پیس کا سائز چھوٹا بڑا کریں (${activePieceLabel}):`
                              )}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Width Control */}
                              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                                <span className="text-[10px] text-slate-300">
                                  {tr('W (in):', 'چوڑائی:')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceWidthIn: Math.max(
                                          2,
                                          Number((activePieceWIn - 0.5).toFixed(1))
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black cursor-pointer"
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
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceWidthIn: Math.min(
                                          safeSlabW,
                                          Math.max(2, Number(e.target.value) || 2)
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs font-black text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceWidthIn: Math.min(
                                          safeSlabW,
                                          Number((activePieceWIn + 0.5).toFixed(1))
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              {/* Length Control */}
                              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                                <span className="text-[10px] text-slate-300">
                                  {tr('L (in):', 'لمبائی:')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceLengthIn: Math.max(
                                          2,
                                          Number((activePieceLIn - 0.5).toFixed(1))
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black cursor-pointer"
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
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceLengthIn: Math.min(
                                          safeSlabL,
                                          Math.max(2, Number(e.target.value) || 2)
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs font-black text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceLengthIn: Math.min(
                                          safeSlabL,
                                          Number((activePieceLIn + 0.5).toFixed(1))
                                        ),
                                      },
                                      true
                                    )
                                  }
                                  className="px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-black cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              {(slabSt.customPieceWidthIn !== null &&
                                slabSt.customPieceWidthIn !== undefined) ||
                              (slabSt.customPieceLengthIn !== null &&
                                slabSt.customPieceLengthIn !== undefined) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSlabState(
                                      slabNum,
                                      {
                                        customPieceWidthIn: null,
                                        customPieceLengthIn: null,
                                      },
                                      true
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/70 text-[11px] font-bold text-rose-200 cursor-pointer"
                                >
                                  {tr('Reset Size', 'اصل سائز')}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Compact Bottom Action Buttons: Room PDF + Send to Slab Cutter + Excel Bill */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsRoomPdfModalOpen(true)}
                className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-sky-400" />
                <span>{tr('🖨️ Room PDF', '🖨️ کمرے کا PDF')}</span>
              </button>

              <button
                type="button"
                onClick={() => onApplyRoomPartsToCutter(buildRoomCutParts())}
                className="py-2 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>{tr('✂️ Send to Slab Cutter', '✂️ سلیب کٹنگ میں بھیجیں')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApplyRoomPartsToCutter(buildRoomCutParts());
                  setTimeout(() => onGenerateExcelBill(), 120);
                }}
                className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>{tr('📊 Excel Bill (.xls)', '📊 ایکسل بل (.xls)')}</span>
              </button>
            </div>
          </div>
        )}
      </div>


      {/* =====================================================================
          DEDICATED REMAINING / WASTE PIECES BANK FOR REUSE IN NEXT ROOM OR FLOOR
          (جو بچا ہوا پیس ہے وہ کٹنگ آپٹیمائزر میں ایک جگہ سیٹ ہو تاکہ نیکسٹ روم یا فلور میں استعمال ہو سکے)
         ===================================================================== */}
      <div className="rounded-xl border-2 border-emerald-500/70 bg-slate-900 p-3 space-y-3 shadow-xl print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-xs font-black">
              ♻️ {tr('WASTE / REMAINING PIECES BANK', 'بچے ہوئے ویسٹ پیسز کا بینک')}
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white">
                {tr(
                  'Remaining / Leftover Pieces Setup — Save & Reuse in Next Room, Floor, Border or Stairs',
                  'بچے ہوئے پیسز کا سیٹ اپ — یہاں سے بقیہ پیس محفوظ کریں اور اگلے کمرے، فلور، بارڈر یا سیڑھی میں استعمال کریں'
                )}
              </h3>
            </div>
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
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {tr(
                  '💾 Save All Remaining Pieces to Optimizer Bank',
                  '💾 اس کمرے کے تمام بچے ہوئے پیس آپٹیمائزر بینک میں سیو کریں'
                )}
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left 6 Cols: Current Room's Remaining / Waste Pieces & Where to Use Next */}
          <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-amber-300">
              <span>
                {tr(
                  `1. Remaining Waste Pieces from ${roomNameInput}:`,
                  `1. اس کمرے (${roomNameInput}) کی سلیبوں سے بچنے والے پیس:`
                )}
              </span>
              <span className="font-mono text-[11px] text-emerald-300">
                {buildRoomWasteOffcuts().reduce((s, x) => s + x.quantity, 0)}{' '}
                {tr('Pieces Available', 'پیس دستیاب')}
              </span>
            </div>

            {buildRoomWasteOffcuts().length === 0 ? (
              <div className="rounded bg-slate-900 border border-emerald-500/30 p-3 text-center text-xs font-bold text-emerald-300">
                {tr(
                  '✅ 100% Full Slabs Used in this Room — Zero Waste Pieces Remaining!',
                  '✅ اس کمرے میں 100% پوری سلیبیں استعمال ہو رہی ہیں — کوئی ویسٹ پیس باقی نہیں!'
                )}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {buildRoomWasteOffcuts().map((w) => (
                  <div
                    key={w.id}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-xs font-black">
                          {w.widthIn}&quot; × {w.lengthIn}&quot;
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-black">
                          {tr(`Avail: ${w.quantity} Pcs`, `تعداد: ${w.quantity} پیس`)}
                        </span>
                        <span className="text-[11px] font-mono text-sky-300 font-bold">
                          ({w.totalSqFt} Sq.Ft)
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-white truncate">
                        {tr(w.sourceLabelEn, w.sourceLabelUr)}
                      </div>
                      <div className="text-[10.5px] text-emerald-300">
                        💡 {tr('Next Use:', 'اگلا استعمال:')} {tr(w.nextUseEn, w.nextUseUr)}
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
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold cursor-pointer"
                        >
                          {tr('💾 Save Piece', '💾 بینک میں سیو')}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setHasOuterBorder(true);
                          setBorderSlabSource('from_custom_border_stock_slab');
                          setBorderSlabMaterialName(`${slabMaterialName} Waste (${w.widthIn}"×${w.lengthIn}")`);
                          setBorderSlabWidthIn(w.widthIn);
                          setBorderSlabLengthIn(w.lengthIn);
                          setBorderSlabQty(w.quantity);
                          setBorderSlabImageUrl(slabImageUrl);
                          if (w.widthIn >= 4 && w.widthIn <= 24) {
                            setOuterBorderWidthIn(Math.round(w.widthIn));
                          }
                        }}
                        className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer"
                      >
                        {tr('🖼️ Use in Border', '🖼️ بارڈر میں لگائیں')}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAddNewRoomProfile();
                          onUpdateSlabConfig({
                            materialName: `${slabMaterialName} (Saved Waste Piece)`,
                            width: w.widthIn,
                            length: w.lengthIn,
                            quantity: w.quantity,
                          });
                        }}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                      >
                        {tr('🏠 Use in Next Room', '🏠 اگلے روم میں لگائیں')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right 6 Cols: Saved Waste / Offcut Pieces in Optimizer Bank Ready to Use in Any Room or Floor */}
          <div className="lg:col-span-6 rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-sky-300">
              <span>
                {tr(
                  '2. Saved Waste & Stock Pieces in Optimizer (Click to Reuse Here or in Cutter):',
                  '2. آپٹیمائزر میں محفوظ شدہ بقیہ پیسز (اگلے روم، فرش یا کٹنگ میں ایک کلک سے استعمال کریں):'
                )}
              </span>
              <span className="font-mono text-[11px] text-amber-300">
                {savedStockLots.length} {tr('Saved Lots', 'محفوظ ریکارڈ')}
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {savedStockLots.map((st) => {
                const isOffcut =
                  st.category === 'usable_offcut' ||
                  st.materialName.toLowerCase().includes('offcut') ||
                  st.materialName.toLowerCase().includes('waste');
                const rec = getRecommendedNextUseForWaste(st.width, st.length);
                return (
                  <div
                    key={st.id}
                    className={`rounded-lg border p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isOffcut
                        ? 'border-emerald-500/50 bg-emerald-950/20'
                        : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                            isOffcut
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {isOffcut
                            ? tr('♻️ SAVED WASTE PIECE', '♻️ بچا ہوا پیس')
                            : tr('📦 STOCK SLAB', '📦 اسٹاک سلیب')}
                        </span>
                        <span className="font-mono text-xs font-black text-amber-300">
                          {st.width}&quot; × {st.length}&quot;
                        </span>
                        <span className="text-[11px] font-mono text-white font-bold">
                          ({st.quantity} Pcs)
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 truncate">
                        {st.materialName} ({st.lotId})
                      </div>
                      <div className="text-[10px] text-emerald-300 truncate">
                        💡 {tr(rec.en, rec.ur)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 shrink-0">
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
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                        title={tr(
                          'Use this piece for current/next room floor',
                          'اس پیس کو موجودہ یا اگلے کمرے کے فرش میں استعمال کریں'
                        )}
                      >
                        {tr('🏠 Use in Floor', '🏠 فرش میں لگائیں')}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHasOuterBorder(true);
                          setBorderSlabSource('from_custom_border_stock_slab');
                          setBorderSlabMaterialName(st.materialName);
                          setBorderSlabWidthIn(st.width);
                          setBorderSlabLengthIn(st.length);
                          setBorderSlabQty(st.quantity);
                          setBorderSlabRate(st.ratePerSqFt);
                          setBorderSlabImageUrl(st.slabImageUrl);
                        }}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold cursor-pointer"
                      >
                        {tr('🖼️ Border', '🖼️ بارڈر')}
                      </button>

                      {onLoadSavedStockInSlabCutter && (
                        <button
                          type="button"
                          onClick={() => onLoadSavedStockInSlabCutter(st.id)}
                          className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer"
                          title={tr(
                            'Open this leftover piece in Slab Cutting Optimizer',
                            'اس بچے ہوئے پیس کو کٹنگ آپٹیمائزر میں کھول کر کاٹیں'
                          )}
                        >
                          {tr('✂️ Cut in Optimizer', '✂️ کٹنگ آپٹیمائزر میں کاٹیں')}
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
    </div>
  );
}
