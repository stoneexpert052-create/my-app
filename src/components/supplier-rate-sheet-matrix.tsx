'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Supplier,
  SupplierRate,
  SupplierRatePhoto,
  processImageFile,
  getSupplierRatePhotos,
  addSupplierRatePhoto,
  deleteSupplierRatePhoto,
  applySupplierPhotoToAppProduct,
  getMarbles,
  getFixingMaterials
} from '@/lib/admin-actions';
import {
  Check,
  Loader2,
  Search,
  Sparkles,
  FileSpreadsheet,
  Table2,
  LayoutGrid,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Plus,
  Phone,
  Calendar,
  TrendingUp,
  Layers,
  X,
  CheckCircle2,
  Clock,
  Camera,
  Pencil,
  Trash2,
  Upload,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const THICKNESS_OPTIONS = [
  '4-Sutar',
  '5-Sutar',
  '6-Sutar',
  '8-Sutar',
  '12mm',
  '15mm',
  '18mm',
  '20mm'
] as const;

export type SizeSlotKey =
  | '12x12'
  | '12x24'
  | '24"'
  | '36"'
  | '48"'
  | '52"'
  | 'Gangsaw'
  | '12"'
  | '4"'
  | 'Standard';

const ALL_SIZE_SLOTS: SizeSlotKey[] = [
  '12x12',
  '12x24',
  '24"',
  '36"',
  '48"',
  '52"',
  'Gangsaw',
  '12"',
  '4"',
  'Standard'
];

export function formatSlotLabel(slot: SizeSlotKey): string {
  switch (slot) {
    case '12x12':
      return '12"×12" Tile (4-Sutar)';
    case '12x24':
      return '12"×24" Tile (4-Sutar)';
    case 'Gangsaw':
      return 'Gangsaw Sheet';
    case 'Standard':
      return 'Standard';
    default:
      return slot;
  }
}

export interface MatrixStoneRow {
  baseName: string;
  categoryGroup: string;
  thickness: string;
  isHighlighted: boolean;
  slots: Partial<Record<SizeSlotKey, SupplierRate>>;
}

export function extractThicknessFromRate(rate: SupplierRate, sizeSlot: SizeSlotKey): string {
  if (rate.thickness && rate.thickness.trim()) {
    return rate.thickness.trim();
  }
  const raw = (rate.materialName || '').toLowerCase();
  if (raw.includes('4-sutar') || raw.includes('4 sutar') || raw.includes('400')) return '4-Sutar';
  if (raw.includes('5-sutar') || raw.includes('5 sutar')) return '5-Sutar';
  if (raw.includes('8-sutar') || raw.includes('8 sutar')) return '8-Sutar';
  if (raw.includes('6-sutar') || raw.includes('6 sutar')) return '6-Sutar';
  if (raw.includes('12mm') || raw.includes('12 mm')) return '12mm';
  if (raw.includes('15mm') || raw.includes('15 mm')) return '15mm';
  if (raw.includes('18mm') || raw.includes('18 mm')) return '18mm';
  if (raw.includes('20mm') || raw.includes('20 mm')) return '20mm';
  if (sizeSlot === '12x12' || sizeSlot === '12x24') return '4-Sutar';
  return '6-Sutar';
}

export function parseStoneNameAndSize(rate: SupplierRate): {
  baseName: string;
  sizeSlot: SizeSlotKey;
  categoryGroup: string;
  thickness: string;
} {
  const rawName = (rate.materialName || '').trim();
  let baseName = rawName;
  let sizeSlot: SizeSlotKey = 'Standard';

  const detectSlotFromText = (txt: string): SizeSlotKey | null => {
    const t = txt.toLowerCase();
    if (
      t.includes('12x24') ||
      t.includes('12"x24"') ||
      t.includes('12×24') ||
      t.includes('12"×24"') ||
      t.includes('12 by 24') ||
      t.includes('12 x 24')
    ) {
      return '12x24';
    }
    if (
      t.includes('12x12') ||
      t.includes('12"x12"') ||
      t.includes('12×12') ||
      t.includes('12"×12"') ||
      t.includes('12 by 12') ||
      t.includes('12 x 12')
    ) {
      return '12x12';
    }
    if (t.includes('24"') || t.includes('24 inch') || t.includes('24 ')) return '24"';
    if (t.includes('36"') || t.includes('36 inch') || t.includes('36 ')) return '36"';
    if (t.includes('48"') || t.includes('48 inch') || t.includes('48 ')) return '48"';
    if (t.includes('52"') || t.includes('52 inch') || t.includes('52 ')) return '52"';
    if (t.includes('12"') || t.includes('12 inch')) return '12"';
    if (t.includes('4"') || t.includes('4 inch')) return '4"';
    if (t.includes('gangsaw') || t.includes('slab')) return 'Gangsaw';
    return null;
  };

  if (rawName.includes(' - ')) {
    const parts = rawName.split(' - ');
    baseName = parts[0].trim();
    const suffix = parts.slice(1).join(' - ');
    sizeSlot = detectSlotFromText(suffix) || 'Standard';
  } else {
    sizeSlot = detectSlotFromText(rawName) || 'Standard';
  }

  // Determine category group if not explicitly set on rate
  let categoryGroup = rate.categoryGroup || '';
  if (!categoryGroup) {
    const bLower = baseName.toLowerCase();
    if (bLower.includes('silbata')) {
      categoryGroup = 'Silbata';
    } else if (
      ['emerald pearl', 'blue pearl', 'silver pearl', 'ten brown', 'tin brown', 'baltic brown', 'ukraine red', 'labrador', 'indian galaxy', 'egypt green', 'imperial red', 'tropical green', 'black gold', 'gold standard', 'paradiso', 'tan brown'].some(k => bLower.includes(k))
    ) {
      categoryGroup = 'Imported Granite';
    } else if (
      ['camel brown', 'indus gold', 'chagi pink', 'desert rose', 'rawal pink', 'golden jibran', 'classic grey'].some(k => bLower.includes(k))
    ) {
      categoryGroup = 'Local Granites 24"';
    } else if (
      ['ziarat white', 'ziarat grey', 'sunny grey', 'badal', 'jet black', 'black & gold', 'silky black'].some(k => bLower.includes(k))
    ) {
      categoryGroup = 'Local Marble 24"';
    } else if (
      ['ice white', 'perlato', 'skyros', 'golden', 'portoro', 'golden grey', 'nero marquina', 'g.s.white', 'g.s white'].some(k => bLower === k || bLower.startsWith(k))
    ) {
      categoryGroup = 'Ice White Series';
    } else if (
      ['fish belly', 'terrazzo', 'double loading', 'pure white', 'black crystal', 'burdur beige'].some(k => bLower.includes(k))
    ) {
      categoryGroup = "Artificial Marble's";
    } else if (sizeSlot === 'Gangsaw') {
      categoryGroup = "Natural Marble's";
    } else if (sizeSlot === '12x12' || sizeSlot === '12x24') {
      categoryGroup = 'Local Marble 24"';
    } else if (sizeSlot === '24"' || sizeSlot === '36"' || sizeSlot === '48"' || sizeSlot === '52"') {
      categoryGroup = 'Imported Granite';
    } else {
      categoryGroup = 'General Catalog';
    }
  }

  const thickness = extractThicknessFromRate(rate, sizeSlot);
  return { baseName, sizeSlot, categoryGroup, thickness };
}

export function groupRatesIntoMatrix(rates: SupplierRate[]): MatrixStoneRow[] {
  const rowMap = new Map<string, MatrixStoneRow>();

  for (const rate of rates) {
    if (rate.status === 'paused') continue;
    const { baseName, sizeSlot, categoryGroup, thickness } = parseStoneNameAndSize(rate);
    const key = `${categoryGroup}::${baseName.toLowerCase()}`;

    const existing = rowMap.get(key);
    if (!existing) {
      rowMap.set(key, {
        baseName,
        categoryGroup,
        thickness,
        isHighlighted: Boolean(rate.isHighlighted),
        slots: {
          [sizeSlot]: rate
        }
      });
    } else {
      existing.slots[sizeSlot] = rate;
      if (rate.thickness && !existing.thickness) {
        existing.thickness = rate.thickness;
      }
      if (rate.isHighlighted) {
        existing.isHighlighted = true;
      }
    }
  }

  return Array.from(rowMap.values());
}

export interface CatalogImageRef {
  id: string;
  name: string;
  imageUrl?: string;
}

interface SupplierRateSheetMatrixProps {
  supplier: Supplier;
  mode: 'admin' | 'supplier' | 'modal';
  catalogProducts?: CatalogImageRef[];
  pendingRequests?: Array<{
    id: string;
    materialId: string;
    materialName: string;
    currentRate: number;
    proposedRate: number;
    status: string;
  }>;
  onSaveRatesBatch: (
    updatedRates: SupplierRate[],
    changedItems: Array<{
      rate: SupplierRate;
      oldRate: number;
      newRate: number;
      isNewSlot?: boolean;
      isNameChange?: boolean;
      isThicknessChange?: boolean;
    }>
  ) => Promise<void>;
  onSubmitNewStoneProposal?: (item: {
    productName: string;
    categoryGroup: string;
    thickness: string;
    entries: Array<{ size: string; rate: number; thickness?: string }>;
    imageUrl?: string;
    extraImages?: string[];
  }) => Promise<void>;
  onApplyStoreMarkup?: (percentage: number) => Promise<void>;
  onResetOfficialAlMajeed?: () => Promise<void>;
}

export function SupplierRateSheetMatrix({
  supplier,
  mode,
  catalogProducts,
  pendingRequests = [],
  onSaveRatesBatch,
  onSubmitNewStoneProposal,
  onApplyStoreMarkup,
  onResetOfficialAlMajeed
}: SupplierRateSheetMatrixProps) {
  const isAlMajeed =
    supplier.id === 'al-majeed-marble-granite-factory' ||
    (supplier.name || '').toLowerCase().includes('al majeed');
  const showAlMajeedAdminExtras = mode !== 'supplier' && isAlMajeed;

  // Default to visual Stock Photo Cards in Supplier Portal (matching Admin Panel Stock Management)
  const [viewLayout, setViewLayout] = useState<'cards' | 'sheet' | 'unified'>(
    mode === 'supplier' ? 'cards' : 'sheet'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showOriginalPhoto, setShowOriginalPhoto] = useState(false);
  const [markupPct, setMarkupPct] = useState<number>(15);
  const [applyingMarkup, setApplyingMarkup] = useState(false);
  const [resettingOfficial, setResettingOfficial] = useState(false);

  // Track inline rate edits keyed by cell key: `${baseName}__${sizeSlot}`
  const [cellEdits, setCellEdits] = useState<Record<string, string>>({});
  // Track inline editable stone names keyed by row key: `${categoryGroup}::${baseName.toLowerCase()}`
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  // Track inline editable thickness keyed by row key
  const [thicknessEdits, setThicknessEdits] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [justSavedToast, setJustSavedToast] = useState<string | null>(null);

  // Catalog images (auto-loaded if not passed from parent) so every row shows a real product thumbnail
  const [loadedCatalog, setLoadedCatalog] = useState<CatalogImageRef[]>(catalogProducts || []);

  // Per-rate-cell multi-photo gallery state (stored in `supplier_rate_photos`)
  const [ratePhotos, setRatePhotos] = useState<SupplierRatePhoto[]>([]);
  const [photoModalTarget, setPhotoModalTarget] = useState<{
    row: MatrixStoneRow;
    slot: SizeSlotKey | 'General';
    displayName: string;
  } | null>(null);
  const [uploadingCellPhotos, setUploadingCellPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [applyingPhotoId, setApplyingPhotoId] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);

  const matrixRows = useMemo(() => {
    return groupRatesIntoMatrix(supplier.rates || []);
  }, [supplier.rates]);

  // Add New Stone Row state (includes 12"×12" & 12"×24" 4-Sutar tiles + Thickness + Multi-Photos)
  const [showAddRowForm, setShowAddRowForm] = useState<boolean>(() => (supplier.rates || []).length === 0);
  const [newStoneName, setNewStoneName] = useState('');
  const [newStoneCategory, setNewStoneCategory] = useState('Imported Granite');
  const [newStoneThickness, setNewStoneThickness] = useState('6-Sutar');
  const [newStone12x12, setNewStone12x12] = useState('');
  const [newStone12x24, setNewStone12x24] = useState('');
  const [newStone24, setNewStone24] = useState('');
  const [newStone36, setNewStone36] = useState('');
  const [newStone48, setNewStone48] = useState('');
  const [newStone52, setNewStone52] = useState('');
  const [newStoneGangsaw, setNewStoneGangsaw] = useState('');
  const [newStoneImages, setNewStoneImages] = useState<string[]>([]);
  const [uploadingStoneImage, setUploadingStoneImage] = useState(false);

  // Sync catalogProducts prop if provided, otherwise load marbles + fixing materials for photo matching
  useEffect(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      setLoadedCatalog(catalogProducts);
      return;
    }
    let active = true;
    Promise.all([getMarbles().catch(() => []), getFixingMaterials().catch(() => [])])
      .then(([mList, fList]) => {
        if (!active) return;
        const refs: CatalogImageRef[] = [
          ...(mList || []).map(m => ({ id: m.id, name: m.name, imageUrl: m.imageUrl })),
          ...(fList || []).map(f => ({ id: f.id, name: f.name, imageUrl: f.imageUrl }))
        ];
        setLoadedCatalog(refs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [catalogProducts]);

  // Reset inline edits when supplier rates change from parent
  useEffect(() => {
    setCellEdits({});
    setNameEdits({});
    setThicknessEdits({});
    if ((supplier.rates || []).length === 0) {
      setShowAddRowForm(true);
    }
  }, [supplier.rates]);

  // Load multi-photo gallery for this supplier's rate cells
  useEffect(() => {
    let active = true;
    if (!supplier.id) return;
    getSupplierRatePhotos(supplier.id)
      .then(photos => {
        if (active) setRatePhotos(photos);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [supplier.id]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return matrixRows;
    const q = searchQuery.toLowerCase().trim();
    return matrixRows.filter(
      r =>
        r.baseName.toLowerCase().includes(q) ||
        r.categoryGroup.toLowerCase().includes(q) ||
        r.thickness.toLowerCase().includes(q)
    );
  }, [matrixRows, searchQuery]);

  const getRowKey = (row: MatrixStoneRow) => `${row.categoryGroup}::${row.baseName.toLowerCase()}`;
  const getCellKey = (baseName: string, sizeSlot: SizeSlotKey) => `${baseName}__${sizeSlot}`;

  const getRowDisplayName = (row: MatrixStoneRow): string => {
    const rKey = getRowKey(row);
    return nameEdits[rKey] !== undefined ? nameEdits[rKey] : row.baseName;
  };

  const getRowDisplayThickness = (row: MatrixStoneRow): string => {
    const rKey = getRowKey(row);
    return thicknessEdits[rKey] !== undefined ? thicknessEdits[rKey] : row.thickness;
  };

  const isRowNameDirty = (row: MatrixStoneRow): boolean => {
    const rKey = getRowKey(row);
    if (nameEdits[rKey] === undefined) return false;
    const trimmed = nameEdits[rKey].trim();
    return trimmed.length > 0 && trimmed !== row.baseName;
  };

  const isRowThicknessDirty = (row: MatrixStoneRow): boolean => {
    const rKey = getRowKey(row);
    if (thicknessEdits[rKey] === undefined) return false;
    return thicknessEdits[rKey] !== row.thickness;
  };

  const handleRowNameChange = (row: MatrixStoneRow, nextName: string) => {
    const rKey = getRowKey(row);
    setNameEdits(prev => ({
      ...prev,
      [rKey]: nextName
    }));
  };

  const handleRowThicknessChange = (row: MatrixStoneRow, nextThickness: string) => {
    const rKey = getRowKey(row);
    setThicknessEdits(prev => ({
      ...prev,
      [rKey]: nextThickness
    }));
  };

  const getAllRowPhotos = (row: MatrixStoneRow): SupplierRatePhoto[] => {
    const baseLower = row.baseName.trim().toLowerCase();
    const displayLower = getRowDisplayName(row).trim().toLowerCase();
    const slotMaterialIds = new Set(
      Object.values(row.slots)
        .map(s => s?.materialId)
        .filter((id): id is string => Boolean(id))
    );
    return ratePhotos.filter(p => {
      if (p.materialId && slotMaterialIds.has(p.materialId)) return true;
      const pBase = (p.baseName || '').trim().toLowerCase();
      return pBase === baseLower || pBase === displayLower;
    });
  };

  const getSlotPhotos = (row: MatrixStoneRow, slot: SizeSlotKey | 'General'): SupplierRatePhoto[] => {
    if (slot === 'General') {
      return getAllRowPhotos(row);
    }
    const baseLower = row.baseName.trim().toLowerCase();
    const displayLower = getRowDisplayName(row).trim().toLowerCase();
    const slotRate = row.slots[slot];
    return ratePhotos.filter(p => {
      if (slotRate?.materialId && p.materialId && p.materialId === slotRate.materialId) {
        return true;
      }
      const pBase = (p.baseName || '').trim().toLowerCase();
      return (pBase === baseLower || pBase === displayLower) && p.sizeSlot === slot;
    });
  };

  const resolveRowPrimaryPhoto = (
    row: MatrixStoneRow
  ): { url: string; isSupplierUpload: boolean; uploadedCount: number } | null => {
    const uploaded = getAllRowPhotos(row);
    if (uploaded.length > 0 && uploaded[0].imageUrl) {
      return {
        url: uploaded[0].imageUrl,
        isSupplierUpload: true,
        uploadedCount: uploaded.length
      };
    }

    // Check inline rate.imageUrl saved on any slot
    for (const slotRate of Object.values(row.slots)) {
      if (slotRate?.imageUrl && !slotRate.imageUrl.includes('placehold.co')) {
        return {
          url: slotRate.imageUrl,
          isSupplierUpload: true,
          uploadedCount: 1
        };
      }
    }

    // Fallback: Match Stone Expert catalog image by materialId or name (same as Admin Stock Management)
    const slotIds = Object.values(row.slots)
      .map(s => (s?.materialId || '').split('_')[0])
      .filter(Boolean);
    const cleanBase = row.baseName.trim().toLowerCase();

    const matchedById = loadedCatalog.find(
      c => c.imageUrl && !c.imageUrl.includes('placehold.co') && slotIds.includes(c.id)
    );
    if (matchedById?.imageUrl) {
      return { url: matchedById.imageUrl, isSupplierUpload: false, uploadedCount: 0 };
    }

    const matchedByName = loadedCatalog.find(c => {
      if (!c.imageUrl || c.imageUrl.includes('placehold.co')) return false;
      const cName = (c.name || '').trim().toLowerCase();
      return cName === cleanBase || (cleanBase.length >= 4 && (cName.includes(cleanBase) || cleanBase.includes(cName)));
    });
    if (matchedByName?.imageUrl) {
      return { url: matchedByName.imageUrl, isSupplierUpload: false, uploadedCount: 0 };
    }

    return null;
  };

  const getDisplayValue = (row: MatrixStoneRow, sizeSlot: SizeSlotKey): string => {
    const key = getCellKey(row.baseName, sizeSlot);
    if (cellEdits[key] !== undefined) {
      return cellEdits[key];
    }
    const slotRate = row.slots[sizeSlot];
    if (!slotRate) return '';

    // If supplier mode and there's a pending request, show proposed rate
    if (mode === 'supplier') {
      const pending = pendingRequests.find(
        p => p.materialId === slotRate.materialId && p.status === 'pending'
      );
      if (pending) return String(pending.proposedRate);
    }
    return slotRate.rate > 0 ? String(slotRate.rate) : '';
  };

  const isCellDirty = (row: MatrixStoneRow, sizeSlot: SizeSlotKey): boolean => {
    const key = getCellKey(row.baseName, sizeSlot);
    if (cellEdits[key] === undefined) return false;
    const editedNum = Number(cellEdits[key]);
    const slotRate = row.slots[sizeSlot];
    if (!slotRate) {
      return !isNaN(editedNum) && editedNum > 0;
    }
    return !isNaN(editedNum) && editedNum > 0 && editedNum !== slotRate.rate;
  };

  const isRowDirty = (row: MatrixStoneRow): boolean => {
    return (
      isRowNameDirty(row) ||
      isRowThicknessDirty(row) ||
      ALL_SIZE_SLOTS.some(slot => isCellDirty(row, slot))
    );
  };

  const totalDirtyCount = useMemo(() => {
    let count = 0;
    for (const row of matrixRows) {
      if (isRowNameDirty(row)) count++;
      if (isRowThicknessDirty(row)) count++;
      for (const slot of ALL_SIZE_SLOTS) {
        if (isCellDirty(row, slot)) count++;
      }
    }
    return count;
  }, [matrixRows, cellEdits, nameEdits, thicknessEdits]);

  const handleCellChange = (baseName: string, sizeSlot: SizeSlotKey, val: string) => {
    const key = getCellKey(baseName, sizeSlot);
    setCellEdits(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const buildSuffixLabel = (row: MatrixStoneRow, slot: SizeSlotKey, overrideThickness?: string): string => {
    const effectiveThick =
      overrideThickness ||
      (slot === '12x12' || slot === '12x24'
        ? '4-Sutar'
        : row.categoryGroup === 'Silbata' && (slot === '12"' || slot === '4"')
        ? '4-Sutar'
        : getRowDisplayThickness(row) || '6-Sutar');
    if (slot === '12x12') return `12"x12" Tile (${effectiveThick})`;
    if (slot === '12x24') return `12"x24" Tile (${effectiveThick})`;
    if (slot === 'Gangsaw') return `Gangsaws (${effectiveThick})`;
    if (slot === 'Standard') return `Standard (${effectiveThick})`;
    return `${slot} (${effectiveThick})`;
  };

  const buildUpdatedRatesFromRows = (targetRows: MatrixStoneRow[]) => {
    const currentRates = [...(supplier.rates || [])];
    const changedItems: Array<{
      rate: SupplierRate;
      oldRate: number;
      newRate: number;
      isNewSlot?: boolean;
      isNameChange?: boolean;
      isThicknessChange?: boolean;
    }> = [];

    for (const row of targetRows) {
      const nameChanged = isRowNameDirty(row);
      const thicknessChanged = isRowThicknessDirty(row);
      const effectiveBaseName = nameChanged
        ? getRowDisplayName(row).trim()
        : row.baseName;
      const effectiveThickness = getRowDisplayThickness(row) || '6-Sutar';

      // If stone name or thickness was edited, update all existing slots on this row first
      if (nameChanged || thicknessChanged) {
        for (const slot of ALL_SIZE_SLOTS) {
          const existingSlotRate = row.slots[slot];
          if (!existingSlotRate) continue;
          const idx = currentRates.findIndex(
            r => r.id === existingSlotRate.id || r.materialId === existingSlotRate.materialId
          );
          if (idx > -1) {
            const origName = currentRates[idx].materialName || '';
            let suffixPart = origName.includes(' - ')
              ? origName.split(' - ').slice(1).join(' - ')
              : buildSuffixLabel(row, slot, effectiveThickness);
            if (thicknessChanged) {
              if (/\([^)]*\)\s*$/.test(suffixPart)) {
                suffixPart = suffixPart.replace(/\([^)]*\)\s*$/, `(${effectiveThickness})`);
              } else {
                suffixPart = `${suffixPart} (${effectiveThickness})`;
              }
            }
            const renamedObj: SupplierRate = {
              ...currentRates[idx],
              materialName: `${effectiveBaseName} - ${suffixPart}`,
              thickness: effectiveThickness,
              lastUpdated: new Date().toISOString()
            };
            currentRates[idx] = renamedObj;
            if (!isCellDirty(row, slot)) {
              changedItems.push({
                rate: renamedObj,
                oldRate: renamedObj.rate,
                newRate: renamedObj.rate,
                isNameChange: nameChanged || undefined,
                isThicknessChange: thicknessChanged || undefined
              });
            }
          }
        }
      }

      for (const slot of ALL_SIZE_SLOTS) {
        if (!isCellDirty(row, slot)) continue;
        const key = getCellKey(row.baseName, slot);
        const newRateVal = Number(cellEdits[key]);
        if (isNaN(newRateVal) || newRateVal <= 0) continue;

        const existingSlotRate = row.slots[slot];
        if (existingSlotRate) {
          const idx = currentRates.findIndex(
            r => r.id === existingSlotRate.id || r.materialId === existingSlotRate.materialId
          );
          if (idx > -1) {
            const oldRate = currentRates[idx].rate;
            const updatedRateObj: SupplierRate = {
              ...currentRates[idx],
              thickness: effectiveThickness,
              rate: newRateVal,
              lastUpdated: new Date().toISOString()
            };
            currentRates[idx] = updatedRateObj;
            changedItems.push({
              rate: updatedRateObj,
              oldRate,
              newRate: newRateVal,
              isNameChange: nameChanged || undefined,
              isThicknessChange: thicknessChanged || undefined
            });
          }
        } else {
          // Creating a brand new size rate on this stone row!
          const slug = effectiveBaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const slotSlug = slot.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const slotThickness =
            slot === '12x12' || slot === '12x24'
              ? (thicknessChanged ? effectiveThickness : '4-Sutar')
              : effectiveThickness;
          const suffixLabel = buildSuffixLabel(row, slot, slotThickness);
          const newRateObj: SupplierRate = {
            id: `rate-${slug}-${slotSlug}-${Date.now()}`,
            materialId: `${slug}_variant-${slug}-${slotSlug}`,
            materialName: `${effectiveBaseName} - ${suffixLabel}`,
            materialType: 'marble',
            categoryGroup: row.categoryGroup,
            thickness: slotThickness,
            isHighlighted: row.isHighlighted,
            rate: newRateVal,
            lastUpdated: new Date().toISOString()
          };
          currentRates.push(newRateObj);
          changedItems.push({ rate: newRateObj, oldRate: 0, newRate: newRateVal, isNewSlot: true });
        }
      }
    }

    return { updatedRates: currentRates, changedItems };
  };

  const handleSaveSingleRow = async (row: MatrixStoneRow) => {
    const { updatedRates, changedItems } = buildUpdatedRatesFromRows([row]);
    if (changedItems.length === 0) return;

    const rKey = getRowKey(row);
    const savedName = getRowDisplayName(row).trim() || row.baseName;
    setSavingRowKey(row.baseName);
    try {
      await onSaveRatesBatch(updatedRates, changedItems);
      setCellEdits(prev => {
        const next = { ...prev };
        ALL_SIZE_SLOTS.forEach(s => delete next[getCellKey(row.baseName, s)]);
        return next;
      });
      setNameEdits(prev => {
        const next = { ...prev };
        delete next[rKey];
        return next;
      });
      setThicknessEdits(prev => {
        const next = { ...prev };
        delete next[rKey];
        return next;
      });
      setJustSavedToast(`${savedName} کی ${changedItems.length} تبدیلیاں محفوظ ہو گئیں!`);
      setTimeout(() => setJustSavedToast(null), 3500);
    } finally {
      setSavingRowKey(null);
    }
  };

  const handleSaveAllDirty = async () => {
    const { updatedRates, changedItems } = buildUpdatedRatesFromRows(matrixRows);
    if (changedItems.length === 0) return;

    setSavingAll(true);
    try {
      await onSaveRatesBatch(updatedRates, changedItems);
      setCellEdits({});
      setNameEdits({});
      setThicknessEdits({});
      setJustSavedToast(`تمام ${changedItems.length} تبدیلیاں کامیابی سے محفوظ ہو گئیں!`);
      setTimeout(() => setJustSavedToast(null), 4000);
    } finally {
      setSavingAll(false);
    }
  };

  const handleUploadCellPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !photoModalTarget) return;
    setUploadingCellPhotos(true);
    setPhotoFeedback(null);
    const { row, slot, displayName } = photoModalTarget;
    const slotRate = slot !== 'General' ? row.slots[slot] : Object.values(row.slots)[0];
    const rowThickness = getRowDisplayThickness(row);
    let uploadedCount = 0;

    try {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        const compressed = await processImageFile(file, 720, 720, 0.55);
        const res = await addSupplierRatePhoto({
          supplierId: supplier.id,
          supplierName: supplier.name || 'Supplier',
          materialId: slotRate?.materialId || '',
          baseName: displayName,
          sizeSlot: slot,
          thickness: rowThickness,
          imageUrl: compressed,
          uploadedBy: mode === 'supplier' ? 'supplier' : 'admin'
        });
        if (res.success && res.photo) {
          uploadedCount++;
          setRatePhotos(prev => [res.photo!, ...prev]);
        }
      }
      if (uploadedCount > 0) {
        setPhotoFeedback({
          type: 'success',
          text: `${uploadedCount} تصویر کامیابی سے اپلوڈ ہو گئی! یہ پورٹل اور ایڈمن پینل دونوں میں محفوظ ہے۔`
        });
      }
    } catch (err: any) {
      setPhotoFeedback({
        type: 'error',
        text: err?.message || 'تصویر اپلوڈ کرنے میں مسئلہ پیش آیا۔'
      });
    } finally {
      setUploadingCellPhotos(false);
    }
  };

  const handleDeleteCellPhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    setPhotoFeedback(null);
    try {
      const res = await deleteSupplierRatePhoto(photoId);
      if (res.success) {
        setRatePhotos(prev => prev.filter(p => p.id !== photoId));
        setPhotoFeedback({ type: 'success', text: 'تصویر حذف کر دی گئی۔' });
      }
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleApplyPhotoToApp = async (photo: SupplierRatePhoto, applyMode: 'main' | 'gallery') => {
    setApplyingPhotoId(`${photo.id}_${applyMode}`);
    setPhotoFeedback(null);
    try {
      const res = await applySupplierPhotoToAppProduct(photo.baseName, photo.imageUrl, applyMode);
      if (res.success) {
        setPhotoFeedback({
          type: 'success',
          text:
            applyMode === 'main'
              ? `"${res.marbleName}" کی مین تصویر ایپ میں اپ ڈیٹ کر دی گئی!`
              : `"${res.marbleName}" کی ایپ گیلری میں تصویر شامل کر دی گئی!`
        });
      } else {
        setPhotoFeedback({
          type: 'error',
          text: res.error || 'ایپ پروڈکٹ پر تصویر نہیں لگ سکی۔'
        });
      }
    } finally {
      setApplyingPhotoId(null);
    }
  };

  const handleAddNewStoneRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newStoneName.trim();
    if (!cleanName) return;

    const chosenThick = newStoneThickness || '6-Sutar';
    const entries: Array<{ slot: SizeSlotKey; val: number; thickness: string }> = [];
    if (Number(newStone12x12) > 0) entries.push({ slot: '12x12', val: Number(newStone12x12), thickness: '4-Sutar' });
    if (Number(newStone12x24) > 0) entries.push({ slot: '12x24', val: Number(newStone12x24), thickness: '4-Sutar' });
    if (Number(newStone24) > 0) entries.push({ slot: '24"', val: Number(newStone24), thickness: chosenThick });
    if (Number(newStone36) > 0) entries.push({ slot: '36"', val: Number(newStone36), thickness: chosenThick });
    if (Number(newStone48) > 0) entries.push({ slot: '48"', val: Number(newStone48), thickness: chosenThick });
    if (Number(newStone52) > 0) entries.push({ slot: '52"', val: Number(newStone52), thickness: chosenThick });
    if (Number(newStoneGangsaw) > 0) entries.push({ slot: 'Gangsaw', val: Number(newStoneGangsaw), thickness: chosenThick });

    if (entries.length === 0) return;

    const currentRates = [...(supplier.rates || [])];
    const changedItems: Array<{ rate: SupplierRate; oldRate: number; newRate: number; isNewSlot?: boolean }> = [];
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const primaryImage = newStoneImages[0] || undefined;

    for (const item of entries) {
      const slotSlug = item.slot.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const suffixLabel =
        item.slot === '12x12'
          ? `12"x12" Tile (${item.thickness})`
          : item.slot === '12x24'
          ? `12"x24" Tile (${item.thickness})`
          : item.slot === 'Gangsaw'
          ? `Gangsaws (${item.thickness})`
          : `${item.slot} (${item.thickness})`;
      const newRateObj: SupplierRate = {
        id: `rate-${slug}-${slotSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        materialId: `${slug}_variant-${slug}-${slotSlug}`,
        materialName: `${cleanName} - ${suffixLabel}`,
        materialType: 'marble',
        categoryGroup: newStoneCategory,
        thickness: item.thickness,
        imageUrl: primaryImage,
        rate: item.val,
        lastUpdated: new Date().toISOString()
      };
      currentRates.push(newRateObj);
      changedItems.push({ rate: newRateObj, oldRate: 0, newRate: item.val, isNewSlot: true });
    }

    setSavingAll(true);
    try {
      // Save all uploaded stock photos to supplier_rate_photos so they immediately show on both Portal & Admin
      if (newStoneImages.length > 0 && supplier.id) {
        for (const imgData of newStoneImages) {
          const photoRes = await addSupplierRatePhoto({
            supplierId: supplier.id,
            supplierName: supplier.name || 'Supplier',
            materialId: changedItems[0]?.rate.materialId || '',
            baseName: cleanName,
            sizeSlot: entries[0]?.slot || 'General',
            thickness: chosenThick,
            imageUrl: imgData,
            uploadedBy: mode === 'supplier' ? 'supplier' : 'admin'
          });
          if (photoRes.success && photoRes.photo) {
            setRatePhotos(prev => [photoRes.photo!, ...prev]);
          }
        }
      }

      if (mode === 'supplier' && onSubmitNewStoneProposal) {
        await onSubmitNewStoneProposal({
          productName: cleanName,
          categoryGroup: newStoneCategory,
          thickness: chosenThick,
          entries: entries.map(item => ({
            size: item.slot === '12x12' ? '12"x12" Tile' : item.slot === '12x24' ? '12"x24" Tile' : item.slot,
            rate: item.val,
            thickness: item.thickness
          })),
          imageUrl: primaryImage,
          extraImages: newStoneImages.slice(1)
        });
      } else {
        await onSaveRatesBatch(currentRates, changedItems);
      }
      setNewStoneName('');
      setNewStone12x12('');
      setNewStone12x24('');
      setNewStone24('');
      setNewStone36('');
      setNewStone48('');
      setNewStone52('');
      setNewStoneGangsaw('');
      setNewStoneImages([]);
      setShowAddRowForm(false);
      setJustSavedToast(
        mode === 'supplier'
          ? `"${cleanName}" تصویر، تھکنس (${chosenThick}) اور ریٹس کے ساتھ ایڈمن کو منظوری کے لیے بھیج دیا گیا!`
          : `"${cleanName}" تصویر، تھکنس (${chosenThick}) اور تمام سائز ریٹس کے ساتھ شامل کر دیا گیا!`
      );
      setTimeout(() => setJustSavedToast(null), 4000);
    } finally {
      setSavingAll(false);
    }
  };

  // Group filtered rows by categoryGroup for the Single-Page Sheet View
  const groupedBySection = useMemo(() => {
    const groups: Record<string, MatrixStoneRow[]> = {
      'Imported Granite': [],
      'Local Granites 24"': [],
      'Local Marble 24"': [],
      'Silbata': [],
      'Ice White Series': [],
      "Artificial Marble's": [],
      "Natural Marble's": [],
      'Other': []
    };

    for (const row of filteredRows) {
      if (groups[row.categoryGroup]) {
        groups[row.categoryGroup].push(row);
      } else {
        groups['Other'].push(row);
      }
    }
    return groups;
  }, [filteredRows]);

  // Helper to render compact inline Thickness (تھکنس / Sutar) selector
  const renderThicknessSelect = (row: MatrixStoneRow, compact = false) => {
    const val = getRowDisplayThickness(row);
    const dirty = isRowThicknessDirty(row);
    return (
      <select
        value={val}
        onChange={e => handleRowThicknessChange(row, e.target.value)}
        aria-label={`Thickness for ${row.baseName}`}
        title="تھکنس / سوتر منتخب کریں (Select Thickness)"
        className={`rounded-md border font-bold font-mono transition-colors focus:outline-none focus:ring-1 cursor-pointer ${
          compact ? 'h-6 text-[10px] px-1' : 'h-7 text-[11px] px-1.5'
        } ${
          dirty
            ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
            : 'bg-slate-900/90 border-slate-700/80 text-amber-300 hover:border-amber-400/60'
        }`}
      >
        {THICKNESS_OPTIONS.map(opt => (
          <option key={opt} value={opt} className="bg-slate-950 text-white">
            {opt}
          </option>
        ))}
      </select>
    );
  };

  // Helper to render an inline editable material name cell WITH clickable stone photo thumbnail + thickness
  const renderEditableNameCell = (row: MatrixStoneRow, compact = false, showInlineThickness = true) => {
    const displayName = getRowDisplayName(row);
    const nameDirty = isRowNameDirty(row);
    const photoMeta = resolveRowPrimaryPhoto(row);
    const openRowPhotoModal = () => {
      setPhotoFeedback(null);
      setPhotoModalTarget({
        row,
        slot: 'General',
        displayName: displayName.trim() || row.baseName
      });
    };

    return (
      <div className="flex items-center gap-2 group min-w-[155px]">
        {/* Clickable Product / Stock Photo Thumbnail (matches Admin Panel Stock Management) */}
        <button
          type="button"
          onClick={openRowPhotoModal}
          title={
            photoMeta?.isSupplierUpload
              ? `${photoMeta.uploadedCount} اپلوڈ کردہ تصاویر — دیکھیں یا مزید لگائیں`
              : 'اسٹاک کی تصویر لگائیں یا تبدیل کریں (Upload Stock Photo)'
          }
          className={`relative rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer flex items-center justify-center ${
            compact ? 'h-8 w-8' : 'h-10 w-10'
          } ${
            photoMeta?.isSupplierUpload
              ? 'border-amber-400/70 bg-slate-900 hover:border-amber-300'
              : 'border-slate-700 bg-slate-900 hover:border-amber-400/70'
          }`}
        >
          {photoMeta?.url ? (
            <>
              <img
                src={photoMeta.url}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-black/0 hover:bg-black/55 transition-colors flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              {photoMeta.uploadedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-slate-950 text-[8px] font-black leading-[14px] text-center tabular-nums">
                  {photoMeta.uploadedCount}
                </span>
              )}
            </>
          ) : (
            <Camera className="h-4 w-4 text-amber-400/80" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={e => handleRowNameChange(row, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && isRowDirty(row)) {
                  e.preventDefault();
                  handleSaveSingleRow(row);
                }
              }}
              aria-label={`Edit name for ${row.baseName}`}
              title="نام تبدیل کرنے کے لیے کلک کریں (Click to rename)"
              className={`w-full rounded-md border px-2 pr-6 font-extrabold transition-all focus:outline-none focus:ring-2 ${
                compact ? 'h-7 text-xs' : 'h-7 text-xs sm:text-[13px]'
              } ${
                nameDirty
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 ring-1 ring-emerald-500/40'
                  : 'bg-transparent border-transparent text-white hover:bg-slate-900/80 hover:border-slate-700 focus:bg-slate-900 focus:border-amber-400/70'
              }`}
            />
            <Pencil
              className={`h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity ${
                nameDirty
                  ? 'text-emerald-400 opacity-100'
                  : 'text-slate-500 opacity-35 group-hover:opacity-90'
              }`}
            />
          </div>
          {showInlineThickness && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[9px] font-bold text-slate-400">تھکنس:</span>
              {renderThicknessSelect(row, true)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to render a compact inline rate input cell WITH simple built-in Camera button
  const renderRateCell = (row: MatrixStoneRow, slot: SizeSlotKey, placeholder: string = '—') => {
    const val = getDisplayValue(row, slot);
    const dirty = isCellDirty(row, slot);
    const slotRate = row.slots[slot];
    const hasPending =
      slotRate &&
      pendingRequests.some(req => req.materialId === slotRate.materialId && req.status === 'pending');
    const slotPhotos = getSlotPhotos(row, slot);
    const photoCount = slotPhotos.length;

    return (
      <div className="relative flex items-center">
        <input
          type="number"
          value={val}
          placeholder={placeholder}
          onChange={e => handleCellChange(row.baseName, slot, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && isRowDirty(row)) {
              e.preventDefault();
              handleSaveSingleRow(row);
            }
          }}
          className={`w-full h-8 pl-1.5 pr-7 text-center font-mono tabular-nums text-xs sm:text-[13px] font-extrabold rounded-md border transition-all focus:outline-none focus:ring-2 ${
            dirty
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 ring-1 ring-emerald-500/50'
              : hasPending
              ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
              : val
              ? row.isHighlighted
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 hover:border-amber-300'
                : 'bg-slate-900/90 border-slate-700/80 text-white hover:border-indigo-500/60'
              : 'bg-slate-950/40 border-slate-800/60 text-slate-500 hover:border-slate-700'
          }`}
        />

        {/* Simple Camera Button right inside every rate cell */}
        <button
          type="button"
          onClick={() => {
            setPhotoFeedback(null);
            setPhotoModalTarget({
              row,
              slot,
              displayName: getRowDisplayName(row).trim() || row.baseName
            });
          }}
          title={
            photoCount > 0
              ? `${photoCount} تصاویر موجود ہیں — مزید اپلوڈ کریں یا دیکھیں`
              : `${getRowDisplayName(row)} (${formatSlotLabel(slot)}) کی تصاویر اپلوڈ کریں`
          }
          className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
            photoCount > 0
              ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/40 border border-amber-400/40'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/90'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          {photoCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black leading-[14px] text-center tabular-nums">
              {photoCount}
            </span>
          )}
        </button>

        {hasPending && !dirty && (
          <span
            className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-amber-400"
            title="Pending rate approval"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* OFFICIAL PRINTED RATE SHEET HEADER BANNER */}
      <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5">
                Official Multi-Size Rate Sheet
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-bold gap-1"
              >
                <Calendar className="h-3 w-3" />
                {showAlMajeedAdminExtras ? 'Updated Rate List: 21-10-2026' : `Active Stone Rows: ${matrixRows.length}`}
              </Badge>
              <span className="text-[11px] text-amber-300/90 font-semibold" dir="rtl">
                ایک ہی نام کے آگے تمام سائز (12&quot;×12&quot;، 12&quot;×24&quot; چار سوتر ٹائل، 24&quot;، 36&quot;، 48&quot;، 52&quot;، گینگ ساؤ) — نام تبدیل کریں اور ہر ریٹ کے اندر کیمرے سے تصاویر لگائیں
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2 flex-wrap">
              <span>{mode === 'supplier' ? (supplier.name || 'Factory Rate Sheet') : supplier.name}</span>
            </h2>

            {(showAlMajeedAdminExtras || supplier.phone || supplier.contactPerson) && (
              <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-300 flex-wrap pt-0.5">
                <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <Phone className="h-3.5 w-3.5 text-amber-400" />
                  {showAlMajeedAdminExtras
                    ? 'Sadeeq Shah Khattak: 03335184573 • Shehzad Ul Haq: 03125050649 • M.Yousaf: 03331827909'
                    : [supplier.contactPerson, supplier.phone].filter(Boolean).join(' • ')}
                </span>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {showAlMajeedAdminExtras && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOriginalPhoto(!showOriginalPhoto)}
                className="h-9 text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1.5 cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{showOriginalPhoto ? 'تصویر چھپائیں' : 'اصل ریٹ لسٹ تصویر (21-10-2026)'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddRowForm(!showAddRowForm)}
              className="h-9 text-xs font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>نیا پتھر / ریٹ شامل کریں</span>
            </Button>

            {totalDirtyCount > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={savingAll}
                onClick={handleSaveAllDirty}
                className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 gap-1.5 cursor-pointer"
              >
                {savingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>تمام تبدیلیاں محفوظ کریں ({totalDirtyCount})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Second Toolbar: View Switcher + Search + Admin Bulk Store Markup */}
        <div className="pt-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start flex-wrap">
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewLayout === 'cards'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>تصویری کارڈز (Stock Photo Cards)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('unified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewLayout === 'unified'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>ملٹی سائز ٹیبل (12×12 • 12×24 • 24&quot;–52&quot; • Gangsaw)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewLayout === 'sheet'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>مکمل پیج شیٹ (Printed Sheet)</span>
            </button>
          </div>

          {/* Search & Admin Store Sync */}
          <div className="flex items-center gap-2 flex-wrap flex-1 md:justify-end">
            <div className="relative min-w-[210px] flex-1 md:max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="پتھر کا نام تلاش کریں (مثلاً Blue Pearl, Ice White)..."
                className="h-8 pl-8 pr-7 text-xs bg-slate-950 border-slate-800 text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {mode !== 'supplier' && onApplyStoreMarkup && (
              <div className="flex items-center gap-1.5 bg-teal-950/40 border border-teal-500/30 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-teal-300">ایپ ریٹ منافع:</span>
                {[10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setMarkupPct(pct)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                      markupPct === pct
                        ? 'bg-teal-500 text-slate-950'
                        : 'text-teal-300 hover:bg-teal-900/50'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  disabled={applyingMarkup}
                  onClick={async () => {
                    setApplyingMarkup(true);
                    try {
                      await onApplyStoreMarkup(markupPct);
                    } finally {
                      setApplyingMarkup(false);
                    }
                  }}
                  className="h-6 px-2.5 text-[10px] font-black bg-teal-600 hover:bg-teal-500 text-white gap-1 cursor-pointer"
                >
                  {applyingMarkup ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  <span>ایپ میں لاگو کریں</span>
                </Button>
              </div>
            )}

            {mode !== 'supplier' && isAlMajeed && onResetOfficialAlMajeed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resettingOfficial}
                onClick={async () => {
                  setResettingOfficial(true);
                  try {
                    await onResetOfficialAlMajeed();
                  } finally {
                    setResettingOfficial(false);
                  }
                }}
                className="h-8 text-[11px] text-slate-400 hover:text-amber-300 gap-1 cursor-pointer"
                title="21-10-2026 کی اصل ریٹ شیٹ کے مطابق تمام ریٹس ری سیٹ کریں"
              >
                {resettingOfficial ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>آفیشل شیٹ ری سنک</span>
              </Button>
            )}
          </div>
        </div>

        {/* Success Toast Banner */}
        {justSavedToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{justSavedToast}</span>
            </div>
            <button type="button" onClick={() => setJustSavedToast(null)} className="text-emerald-300 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* OPTIONAL COLLAPSIBLE ORIGINAL PHOTO REFERENCE */}
      {showOriginalPhoto && isAlMajeed && (
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>المجد ماربل اینڈ گرینائٹ — اصل ریٹ لسٹ تصویر (21-10-2026)</span>
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginalPhoto(false)}
              className="h-7 text-xs text-slate-400 hover:text-white"
            >
              بند کریں ✕
            </Button>
          </div>
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800 bg-black flex justify-center p-2">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-22_at_8.09.35_PM_ee1d8089.jpeg"
              alt="Al Majeed Official Rate List 21-10-2026"
              className="max-w-full h-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* OPTIONAL ADD NEW MULTI-SIZE STONE ROW FORM */}
      {showAddRowForm && (
        <form
          onSubmit={handleAddNewStoneRow}
          className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>نیا پتھر ایک ہی لائن میں تمام سائز کے ریٹس کے ساتھ شامل کریں (Add Multi-Size Stone Row)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddRowForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2.5 items-end">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-300 block mb-1">پتھر کا نام (Stone Name) *</label>
              <Input
                required
                value={newStoneName}
                onChange={e => setNewStoneName(e.target.value)}
                placeholder="e.g. Blue Pearl, Ziarat White"
                className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-1">کیٹگری (Group)</label>
              <select
                value={newStoneCategory}
                onChange={e => setNewStoneCategory(e.target.value)}
                className="w-full h-8 rounded-md bg-slate-950 border border-slate-700 text-xs text-white px-2 font-bold"
              >
                <option value="Imported Granite">Imported Granite</option>
                <option value='Local Granites 24"'>Local Granites 24&quot;</option>
                <option value='Local Marble 24"'>Local Marble 24&quot;</option>
                <option value="Silbata">Silbata</option>
                <option value="Ice White Series">Ice White Series</option>
                <option value="Artificial Marble's">Artificial Marble&apos;s</option>
                <option value="Natural Marble's">Natural Marble&apos;s</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-300 block mb-1">تھکنس (Thickness)</label>
              <select
                value={newStoneThickness}
                onChange={e => setNewStoneThickness(e.target.value)}
                className="w-full h-8 rounded-md bg-slate-950 border border-emerald-500/40 text-xs text-emerald-200 px-2 font-mono font-bold"
              >
                {THICKNESS_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-slate-950 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-cyan-300 block mb-1 text-center">12&quot;×12&quot; (4-Sutar)</label>
              <Input
                type="number"
                value={newStone12x12}
                onChange={e => setNewStone12x12(e.target.value)}
                placeholder="Tile"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-cyan-500/40 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-cyan-300 block mb-1 text-center">12&quot;×24&quot; (4-Sutar)</label>
              <Input
                type="number"
                value={newStone12x24}
                onChange={e => setNewStone12x24(e.target.value)}
                placeholder="Tile"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-cyan-500/40 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">24&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone24}
                onChange={e => setNewStone24(e.target.value)}
                placeholder="24&quot;"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">36&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone36}
                onChange={e => setNewStone36(e.target.value)}
                placeholder="36&quot;"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">48&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone48}
                onChange={e => setNewStone48(e.target.value)}
                placeholder="48&quot;"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">52&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone52}
                onChange={e => setNewStone52(e.target.value)}
                placeholder="52&quot;"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-indigo-300 block mb-1 text-center">Gangsaw ریٹ</label>
              <Input
                type="number"
                value={newStoneGangsaw}
                onChange={e => setNewStoneGangsaw(e.target.value)}
                placeholder="Slab"
                className="h-8 text-xs text-center font-mono tabular-nums bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-indigo-500/20">
            <div className="flex items-center gap-2.5 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-xs font-bold text-amber-200 cursor-pointer transition-colors">
                <Camera className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {uploadingStoneImage
                    ? 'تصاویر اپلوڈ ہو رہی ہیں...'
                    : newStoneImages.length > 0
                    ? `مزید تصاویر لگائیں (${newStoneImages.length} منتخب)`
                    : 'اسٹاک کی تصاویر لگائیں (Upload Stock Photos)'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setUploadingStoneImage(true);
                    try {
                      const uploaded: string[] = [];
                      for (const file of Array.from(files)) {
                        const compressed = await processImageFile(file, 720, 720, 0.55);
                        uploaded.push(compressed);
                      }
                      setNewStoneImages(prev => [...prev, ...uploaded]);
                    } finally {
                      setUploadingStoneImage(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              {newStoneImages.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {newStoneImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={imgUrl}
                        alt={`Stone preview ${idx + 1}`}
                        className="h-9 w-9 rounded-md object-cover border border-amber-400/60"
                      />
                      <button
                        type="button"
                        onClick={() => setNewStoneImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold cursor-pointer"
                        title="تصویر ہٹائیں"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddRowForm(false)}
                className="h-8 text-xs text-slate-400"
              >
                منسوخ کریں
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingAll || uploadingStoneImage}
                className="h-8 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{mode === 'supplier' ? 'تصویر و ریٹس ایڈمن کو سبمٹ کریں' : 'لسٹ میں شامل کریں'}</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* EMPTY STATE FOR NEW SUPPLIERS (E.G. MDM OR NEW PARTNERS WITH 0 ROWS YET) */}
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Camera className="h-6 w-6" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-white">
            {searchQuery
              ? `"${searchQuery}" سے ملتا جلتا کوئی مٹیریل نہیں ملا`
              : 'اپنے اسٹاک کا پہلا مٹیریل، ریٹ اور تصویر شامل کریں'}
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            {searchQuery
              ? 'سرچ فلٹر صاف کریں یا نیا پتھر شامل کریں۔'
              : 'اوپر دیے گئے فارم میں پتھر کا نام، تھکنس (4-Sutar / 6-Sutar)، 12×12 اور 12×24 (4-Sutar ٹائل)، 24" تا 52" یا Gangsaw کا ریٹ لکھیں اور کیمرے سے اپنے اسٹاک کی اصل تصاویر لگا کر سبمٹ کریں۔'}
          </p>
          {!showAddRowForm && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddRowForm(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>نیا مٹیریل، ریٹ اور تصویر شامل کریں</span>
            </Button>
          )}
        </div>
      ) : viewLayout === 'cards' ? (
        /* ===================================================================== */
        /* VIEW 0: VISUAL STOCK PHOTO CARDS GRID (MATCHES ADMIN STOCK MANAGEMENT)*/
        /* ===================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRows.map(row => {
            const rowDirty = isRowDirty(row);
            const isSavingThis = savingRowKey === row.baseName;
            const displayName = getRowDisplayName(row);
            const photoMeta = resolveRowPrimaryPhoto(row);
            const allRowPhotos = getAllRowPhotos(row);

            return (
              <div
                key={`card-${row.categoryGroup}-${row.baseName}`}
                className={`rounded-xl border overflow-hidden bg-slate-950 flex flex-col transition-colors shadow-sm ${
                  rowDirty
                    ? 'border-emerald-500/70 ring-1 ring-emerald-500/30'
                    : row.isHighlighted
                    ? 'border-amber-500/45'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* 1. FULL-BLEED STOCK PHOTO HEADER (SAME DESIGN LANGUAGE AS ADMIN MANAGE STOCK) */}
                <div
                  onClick={() => {
                    setPhotoFeedback(null);
                    setPhotoModalTarget({
                      row,
                      slot: 'General',
                      displayName: displayName.trim() || row.baseName
                    });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPhotoFeedback(null);
                      setPhotoModalTarget({
                        row,
                        slot: 'General',
                        displayName: displayName.trim() || row.baseName
                      });
                    }
                  }}
                  className="relative h-36 w-full overflow-hidden bg-slate-900 group cursor-pointer shrink-0 select-none"
                >
                  {photoMeta?.url ? (
                    <img
                      src={photoMeta.url}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                      <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-300">
                        اسٹاک کی تصویر لگائیں (Add Stock Photo)
                      </span>
                    </div>
                  )}

                  {/* Top Row Overlay: Category & Direct Camera Upload Button */}
                  <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 z-10">
                    <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-slate-200 border border-white/10 truncate max-w-[55%]">
                      {row.categoryGroup}
                    </span>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setPhotoFeedback(null);
                        setPhotoModalTarget({
                          row,
                          slot: 'General',
                          displayName: displayName.trim() || row.baseName
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shadow-md transition-colors cursor-pointer shrink-0"
                      title="تصاویر اپلوڈ کریں یا گیلری دیکھیں"
                    >
                      <Camera className="h-3 w-3" />
                      <span>
                        {allRowPhotos.length > 0
                          ? `${allRowPhotos.length} تصاویر`
                          : 'تصویر لگائیں'}
                      </span>
                    </button>
                  </div>

                  {/* Bottom Contrast Scrim with Photo Source Metadata */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-7 pb-2 px-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-white block truncate drop-shadow-sm">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-white/75 font-medium">
                        {photoMeta?.isSupplierUpload
                          ? `آپ کی اپلوڈ کردہ تصویر (${allRowPhotos.length})`
                          : photoMeta?.url
                          ? 'کیٹلاگ تصویر — اپنی اصل تصویر لگانے کے لیے کیمرے پر کلک کریں'
                          : 'کوئی تصویر نہیں — کیمرے پر کلک کریں'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/60 px-1.5 py-0.5 rounded border border-amber-400/30 shrink-0">
                      {getRowDisplayThickness(row)}
                    </span>
                  </div>
                </div>

                {/* 2. EDITABLE STONE NAME + THICKNESS SELECTOR */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => handleRowNameChange(row, e.target.value)}
                      aria-label={`Stone name for ${row.baseName}`}
                      title="نام تبدیل کریں"
                      className={`w-full h-7 rounded-md border px-2 pr-6 text-xs font-extrabold transition-all focus:outline-none focus:ring-1 ${
                        isRowNameDirty(row)
                          ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-white focus:border-amber-400'
                      }`}
                    />
                    <Pencil className="h-3 w-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">تھکنس:</span>
                    {renderThicknessSelect(row)}
                  </div>
                </div>

                {/* 3. MULTI-SIZE RATE INPUTS WITH CAMERA ICON INSIDE EVERY SIZE CELL */}
                <div className="p-3 space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-cyan-300 block">
                        12&quot;×12&quot; Tile (4-Sutar)
                      </span>
                      {renderRateCell(row, '12x12', 'PKR')}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-cyan-300 block">
                        12&quot;×24&quot; Tile (4-Sutar)
                      </span>
                      {renderRateCell(row, '12x24', 'PKR')}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        24&quot; کاؤنٹر / سلیب
                      </span>
                      {renderRateCell(row, '24"', 'PKR')}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        36&quot; کاؤنٹر / سلیب
                      </span>
                      {renderRateCell(row, '36"', 'PKR')}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        48&quot; شیٹ
                      </span>
                      {renderRateCell(row, '48"', 'PKR')}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        52&quot; شیٹ
                      </span>
                      {renderRateCell(row, '52"', 'PKR')}
                    </div>
                  </div>
                  <div className="space-y-0.5 pt-0.5">
                    <span className="text-[10px] font-bold text-indigo-300 block">
                      Gangsaw شیٹ / بڑا سلیب
                    </span>
                    {renderRateCell(row, 'Gangsaw', 'PKR / sq.ft')}
                  </div>
                </div>

                {/* 4. CARD FOOTER: SAVE CHANGES */}
                <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFeedback(null);
                      setPhotoModalTarget({
                        row,
                        slot: 'General',
                        displayName: displayName.trim() || row.baseName
                      });
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>گیلری ({allRowPhotos.length})</span>
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={!rowDirty || isSavingThis}
                    onClick={() => handleSaveSingleRow(row)}
                    className={`h-7 px-3 text-[11px] font-extrabold gap-1 ${
                      rowDirty
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isSavingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>محفوظ کریں (Save)</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewLayout === 'sheet' ? (
        /* ===================================================================== */
        /* VIEW 1: PRINTED SHEET 2-COLUMN MATRIX LAYOUT                          */
        /* ===================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (7/12): IMPORTED GRANITE (12x24, 24", 36", 48", 52"), LOCAL GRANITES, LOCAL MARBLE, SILBATA */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. IMPORTED GRANITE MULTI-SIZE MATRIX TABLE */}
            {groupedBySection['Imported Granite'].length > 0 && (
              <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b-2 border-slate-700 px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm sm:text-base text-white tracking-tight uppercase">
                      Imported Granite
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                      12×24 (4-S) • 24&quot; • 36&quot; • 48&quot; • 52&quot;
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold" dir="rtl">
                    تصویر، نام، تھکنس اور تمام سائز
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800 bg-slate-900/90 text-[11px] font-black uppercase text-amber-300">
                        <th className="py-2 px-3 min-w-[185px]">Photo, Name &amp; Thickness</th>
                        <th className="py-2 px-1.5 text-center w-24 border-l border-slate-800 text-cyan-300">12×24 (4-S)</th>
                        <th className="py-2 px-1.5 text-center w-24 border-l border-slate-800">24&quot;</th>
                        <th className="py-2 px-1.5 text-center w-24 border-l border-slate-800">36&quot;</th>
                        <th className="py-2 px-1.5 text-center w-24 border-l border-slate-800">48&quot;</th>
                        <th className="py-2 px-1.5 text-center w-24 border-l border-slate-800">52&quot;</th>
                        <th className="py-2 px-2 text-center w-14 border-l border-slate-800">Save</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {groupedBySection['Imported Granite'].map(row => {
                        const rowDirty = isRowDirty(row);
                        const isSavingThis = savingRowKey === row.baseName;
                        return (
                          <tr
                            key={row.baseName}
                            className={`transition-colors ${
                              row.isHighlighted
                                ? 'bg-amber-400/10 hover:bg-amber-400/15'
                                : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <td className="py-1.5 px-2 font-extrabold text-white">
                              {renderEditableNameCell(row)}
                            </td>
                            <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                              {renderRateCell(row, '12x24')}
                            </td>
                            <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                              {renderRateCell(row, '24"')}
                            </td>
                            <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                              {renderRateCell(row, '36"')}
                            </td>
                            <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                              {renderRateCell(row, '48"')}
                            </td>
                            <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                              {renderRateCell(row, '52"')}
                            </td>
                            <td className="py-1.5 px-2 text-center border-l border-slate-800/60">
                              <Button
                                type="button"
                                size="sm"
                                disabled={!rowDirty || isSavingThis}
                                onClick={() => handleSaveSingleRow(row)}
                                className={`h-7 w-9 p-0 font-bold ${
                                  rowDirty
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                                    : 'bg-slate-900 text-slate-600 border border-slate-800'
                                }`}
                                title="اس پتھر کے تمام سائز کے ریٹس محفوظ کریں"
                              >
                                {isSavingThis ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. LOCAL GRANITES & LOCAL MARBLE (24" + 12×12 & 12×24 4-Sutar Tiles) */}
            {(groupedBySection['Local Granites 24"'].length > 0 ||
              groupedBySection['Local Marble 24"'].length > 0) && (
              <div className="space-y-4">
                {/* Local Granites */}
                {groupedBySection['Local Granites 24"'].length > 0 && (
                  <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                    <div className="bg-slate-900 border-b-2 border-slate-700 px-3 py-2 flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                        Local Granites (24&quot; • 12×12 • 12×24 Tile)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">PKR / sq.ft</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-black text-slate-300">
                            <th className="py-1.5 px-3 min-w-[140px]">Name (نام)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-cyan-300">12&quot;×12&quot; (4-S)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-cyan-300">12&quot;×24&quot; (4-S)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-amber-300">24&quot;</th>
                            <th className="py-1.5 px-1.5 text-center w-10 border-l border-slate-800">Save</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-xs">
                          {groupedBySection['Local Granites 24"'].map(row => {
                            const rowDirty = isRowDirty(row);
                            const isSavingThis = savingRowKey === row.baseName;
                            return (
                              <tr
                                key={row.baseName}
                                className={
                                  row.isHighlighted
                                    ? 'bg-amber-400/15 hover:bg-amber-400/20'
                                    : 'hover:bg-slate-900/50'
                                }
                              >
                                <td className="py-1.5 px-2 font-bold text-white">{renderEditableNameCell(row, true)}</td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '12x12')}
                                </td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '12x24')}
                                </td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '24"')}
                                </td>
                                <td className="py-1.5 px-1.5 text-center border-l border-slate-800/60">
                                  <button
                                    type="button"
                                    disabled={!rowDirty || isSavingThis}
                                    onClick={() => handleSaveSingleRow(row)}
                                    className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                      rowDirty
                                        ? 'bg-emerald-600 text-white cursor-pointer'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {isSavingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Local Marble */}
                {groupedBySection['Local Marble 24"'].length > 0 && (
                  <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                    <div className="bg-slate-900 border-b-2 border-slate-700 px-3 py-2 flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                        Local Marble (12×12 • 12×24 4-Sutar Tile • 24&quot;)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">PKR / sq.ft</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-black text-slate-300">
                            <th className="py-1.5 px-3 min-w-[140px]">Name (نام)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-cyan-300">12&quot;×12&quot; (4-S)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-cyan-300">12&quot;×24&quot; (4-S)</th>
                            <th className="py-1.5 px-1.5 text-center w-24 border-l border-slate-800 text-amber-300">24&quot;</th>
                            <th className="py-1.5 px-1.5 text-center w-10 border-l border-slate-800">Save</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-xs">
                          {groupedBySection['Local Marble 24"'].map(row => {
                            const rowDirty = isRowDirty(row);
                            const isSavingThis = savingRowKey === row.baseName;
                            return (
                              <tr
                                key={row.baseName}
                                className={
                                  row.isHighlighted
                                    ? 'bg-amber-400/15 hover:bg-amber-400/20'
                                    : 'hover:bg-slate-900/50'
                                }
                              >
                                <td className="py-1.5 px-2 font-bold text-white">{renderEditableNameCell(row, true)}</td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '12x12')}
                                </td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '12x24')}
                                </td>
                                <td className="py-1.5 px-1.5 border-l border-slate-800/60">
                                  {renderRateCell(row, '24"')}
                                </td>
                                <td className="py-1.5 px-1.5 text-center border-l border-slate-800/60">
                                  <button
                                    type="button"
                                    disabled={!rowDirty || isSavingThis}
                                    onClick={() => handleSaveSingleRow(row)}
                                    className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                      rowDirty
                                        ? 'bg-emerald-600 text-white cursor-pointer'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {isSavingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. SILBATA MULTI-SIZE TABLE (24" | 12" | 4") */}
            {groupedBySection['Silbata'].length > 0 && (
              <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                <div className="bg-slate-900 border-b-2 border-slate-700 px-3.5 py-2 flex items-center justify-between">
                  <span className="font-black text-sm text-amber-300 uppercase">
                    Silbata (24&quot; • 12&quot; • 4&quot;)
                  </span>
                  <span className="text-[11px] text-slate-400">Polished &amp; Plain</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-black text-amber-300">
                      <th className="py-1.5 px-3">Type</th>
                      <th className="py-1.5 px-2 text-center w-24 border-l border-slate-800">24&quot;</th>
                      <th className="py-1.5 px-2 text-center w-24 border-l border-slate-800">12&quot;</th>
                      <th className="py-1.5 px-2 text-center w-24 border-l border-slate-800">4&quot;</th>
                      <th className="py-1.5 px-2 text-center w-14 border-l border-slate-800">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {groupedBySection['Silbata'].map(row => {
                      const rowDirty = isRowDirty(row);
                      const isSavingThis = savingRowKey === row.baseName;
                      return (
                        <tr key={row.baseName} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-2 font-extrabold text-white">{renderEditableNameCell(row, true)}</td>
                          <td className="py-1.5 px-2 border-l border-slate-800/60">
                            {renderRateCell(row, '24"')}
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-800/60">
                            {renderRateCell(row, '12"')}
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-800/60">
                            {renderRateCell(row, '4"')}
                          </td>
                          <td className="py-1.5 px-2 text-center border-l border-slate-800/60">
                            <Button
                              type="button"
                              size="sm"
                              disabled={!rowDirty || isSavingThis}
                              onClick={() => handleSaveSingleRow(row)}
                              className={`h-7 w-9 p-0 ${
                                rowDirty
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                  : 'bg-slate-900 text-slate-600 border border-slate-800'
                              }`}
                            >
                              {isSavingThis ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5/12): GANGSAW'S (ICE WHITE SERIES, ARTIFICIAL MARBLE'S, NATURAL MARBLE'S) */}
          <div className="lg:col-span-5 space-y-5">
            {(groupedBySection['Ice White Series'].length > 0 ||
              groupedBySection["Artificial Marble's"].length > 0 ||
              groupedBySection["Natural Marble's"].length > 0) && (
              <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-indigo-500/25 via-indigo-500/10 to-transparent border-b-2 border-slate-700 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-black text-sm sm:text-base text-white uppercase tracking-tight">
                    Gangsaw&apos;s (گینگ ساؤ شیٹس)
                  </span>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    Large Slabs (6-Sutar)
                  </Badge>
                </div>

                {/* A. Ice White Series */}
                {groupedBySection['Ice White Series'].length > 0 && (
                  <div>
                    <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-1.5 text-center font-black text-xs text-amber-300 uppercase tracking-wider">
                      Ice White Series
                    </div>
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-800/70 text-xs">
                        {groupedBySection['Ice White Series'].map(row => {
                          const rowDirty = isRowDirty(row);
                          const isSavingThis = savingRowKey === row.baseName;
                          return (
                            <tr
                              key={row.baseName}
                              className={
                                row.isHighlighted
                                  ? 'bg-amber-400/15 hover:bg-amber-400/20'
                                  : 'hover:bg-slate-900/50'
                              }
                            >
                              <td className="py-1.5 px-2 font-extrabold text-white">{renderEditableNameCell(row, true)}</td>
                              <td className="py-1.5 px-2 w-32 border-l border-slate-800/60">
                                {renderRateCell(row, 'Gangsaw')}
                              </td>
                              <td className="py-1.5 px-2 w-12 text-center border-l border-slate-800/60">
                                <button
                                  type="button"
                                  disabled={!rowDirty || isSavingThis}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                    rowDirty
                                      ? 'bg-emerald-600 text-white cursor-pointer'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {isSavingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* B. Artificial Marble's */}
                {groupedBySection["Artificial Marble's"].length > 0 && (
                  <div className="border-t-2 border-slate-700">
                    <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-1.5 text-center font-black text-xs text-amber-300 uppercase tracking-wider">
                      Artificial Marble&apos;s
                    </div>
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-800/70 text-xs">
                        {groupedBySection["Artificial Marble's"].map(row => {
                          const rowDirty = isRowDirty(row);
                          const isSavingThis = savingRowKey === row.baseName;
                          return (
                            <tr
                              key={row.baseName}
                              className={
                                row.isHighlighted
                                  ? 'bg-amber-400/15 hover:bg-amber-400/20'
                                  : 'hover:bg-slate-900/50'
                              }
                            >
                              <td className="py-1.5 px-2 font-extrabold text-white">{renderEditableNameCell(row, true)}</td>
                              <td className="py-1.5 px-2 w-32 border-l border-slate-800/60">
                                {renderRateCell(row, 'Gangsaw')}
                              </td>
                              <td className="py-1.5 px-2 w-12 text-center border-l border-slate-800/60">
                                <button
                                  type="button"
                                  disabled={!rowDirty || isSavingThis}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                    rowDirty
                                      ? 'bg-emerald-600 text-white cursor-pointer'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {isSavingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* C. Natural Marble's */}
                {groupedBySection["Natural Marble's"].length > 0 && (
                  <div className="border-t-2 border-slate-700">
                    <div className="bg-slate-900/90 border-b border-slate-800 px-3.5 py-1.5 text-center font-black text-xs text-amber-300 uppercase tracking-wider">
                      Natural Marble&apos;s
                    </div>
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-800/70 text-xs">
                        {groupedBySection["Natural Marble's"].map(row => {
                          const rowDirty = isRowDirty(row);
                          const isSavingThis = savingRowKey === row.baseName;
                          return (
                            <tr
                              key={row.baseName}
                              className={
                                row.isHighlighted
                                  ? 'bg-amber-400/15 hover:bg-amber-400/20'
                                  : 'hover:bg-slate-900/50'
                              }
                            >
                              <td className="py-1.5 px-2 font-extrabold text-white">
                                {renderEditableNameCell(row, true)}
                              </td>
                              <td className="py-1.5 px-2 w-32 border-l border-slate-800/60">
                                {renderRateCell(row, 'Gangsaw')}
                              </td>
                              <td className="py-1.5 px-2 w-12 text-center border-l border-slate-800/60">
                                <button
                                  type="button"
                                  disabled={!rowDirty || isSavingThis}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                    rowDirty
                                      ? 'bg-emerald-600 text-white cursor-pointer'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {isSavingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* D. Any Other Custom Supplier Items */}
            {groupedBySection['Other'].length > 0 && (
              <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                <div className="bg-slate-900 border-b-2 border-slate-700 px-3.5 py-2 flex items-center justify-between">
                  <span className="font-black text-xs sm:text-sm text-indigo-300 uppercase">
                    Additional Supplied Products
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-black text-slate-300">
                        <th className="py-1.5 px-3 min-w-[140px]">Product (نام)</th>
                        <th className="py-1.5 px-1 text-center text-cyan-300">12×12</th>
                        <th className="py-1.5 px-1 text-center text-cyan-300">12×24</th>
                        <th className="py-1.5 px-1 text-center">24&quot;</th>
                        <th className="py-1.5 px-1 text-center">36&quot;</th>
                        <th className="py-1.5 px-1 text-center">48&quot;</th>
                        <th className="py-1.5 px-1 text-center">52&quot;</th>
                        <th className="py-1.5 px-1 text-center">Slab/Std</th>
                        <th className="py-1.5 px-1 text-center">Save</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {groupedBySection['Other'].map(row => {
                        const rowDirty = isRowDirty(row);
                        const isSavingThis = savingRowKey === row.baseName;
                        const primaryOtherSlot: SizeSlotKey = row.slots['Standard'] ? 'Standard' : 'Gangsaw';
                        return (
                          <tr key={row.baseName} className="hover:bg-slate-900/50">
                            <td className="py-1.5 px-2 font-bold text-white">{renderEditableNameCell(row, true)}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '12x12')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '12x24')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '24"')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '36"')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '48"')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">{renderRateCell(row, '52"')}</td>
                            <td className="py-1.5 px-1 border-l border-slate-800/60">
                              {renderRateCell(row, primaryOtherSlot)}
                            </td>
                            <td className="py-1.5 px-1 text-center border-l border-slate-800/60">
                              <button
                                type="button"
                                disabled={!rowDirty || isSavingThis}
                                onClick={() => handleSaveSingleRow(row)}
                                className={`h-7 w-7 rounded flex items-center justify-center mx-auto ${
                                  rowDirty ? 'bg-emerald-600 text-white cursor-pointer' : 'text-slate-600'
                                }`}
                              >
                                {isSavingThis ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: UNIFIED ALL-SIZES MATRIX TABLE (12x12 | 12x24 | 24"–52" | Gangsaw) */
        /* ===================================================================== */
        <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-xl">
          <div className="bg-slate-900 border-b-2 border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>یونیفائیڈ ملٹی سائز ریٹ ٹیبل — ایک ہی نام کے آگے تمام سائز اور تصاویر</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ہر رو پر پتھر کا نام تبدیل کریں، 12&quot;×12&quot; اور 12&quot;×24&quot; (4 سوتر ٹائل)، 24&quot;، 36&quot;، 48&quot;، 52&quot;، اور Gangsaw کا ریٹ لکھیں، اور کسی بھی خانے میں کیمرے کے بٹن سے مٹیریل کی متعدد تصاویر اپلوڈ کریں۔
              </p>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs shrink-0">
              {filteredRows.length} Stones
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-900/95 text-[11px] font-black uppercase text-amber-300">
                  <th className="py-2.5 px-3 min-w-[205px]">Photo &amp; Stone Name</th>
                  <th className="py-2.5 px-2 min-w-[92px] border-l border-slate-800 text-emerald-300">تھکنس (Sutar)</th>
                  <th className="py-2.5 px-2 min-w-[96px] border-l border-slate-800 text-slate-400">Category</th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800 text-cyan-300">
                    12&quot;×12&quot;
                    <span className="block text-[9px] font-semibold text-cyan-400/80 normal-case">4-Sutar Tile</span>
                  </th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800 text-cyan-300">
                    12&quot;×24&quot;
                    <span className="block text-[9px] font-semibold text-cyan-400/80 normal-case">4-Sutar Tile</span>
                  </th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800">24&quot; کاؤنٹر</th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800">36&quot; کاؤنٹر</th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800">48&quot; شیٹ</th>
                  <th className="py-2.5 px-1.5 text-center min-w-[98px] border-l border-slate-800">52&quot; شیٹ</th>
                  <th className="py-2.5 px-1.5 text-center min-w-[104px] border-l border-slate-800 text-indigo-300">
                    Gangsaw شیٹ
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-l border-slate-800">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredRows.map(row => {
                  const rowDirty = isRowDirty(row);
                  const isSavingThis = savingRowKey === row.baseName;
                  return (
                    <tr
                      key={`${row.categoryGroup}-${row.baseName}`}
                      className={
                        row.isHighlighted
                          ? 'bg-amber-400/10 hover:bg-amber-400/15'
                          : 'hover:bg-slate-900/50'
                      }
                    >
                      <td className="py-2 px-2 font-extrabold text-white">
                        {renderEditableNameCell(row, false, false)}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
                        {renderThicknessSelect(row)}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60 text-[10px] font-bold text-slate-400">
                        {row.categoryGroup}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '12x12')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '12x24')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '24"')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '36"')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '48"')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, '52"')}
                      </td>
                      <td className="py-2 px-1.5 border-l border-slate-800/60">
                        {renderRateCell(row, 'Gangsaw')}
                      </td>
                      <td className="py-2 px-2 text-center border-l border-slate-800/60">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!rowDirty || isSavingThis}
                          onClick={() => handleSaveSingleRow(row)}
                          className={`h-7 px-2.5 text-[11px] font-bold ${
                            rowDirty
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STICKY FLOATING SAVE BAR WHEN MULTIPLE CELLS OR NAMES ARE EDITED */}
      {totalDirtyCount > 0 && (
        <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/60 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">
              آپ نے <strong className="text-emerald-400 font-mono tabular-nums">{totalDirtyCount}</strong> نام / تھکنس / سائز ریٹس میں تبدیلی کی ہے
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCellEdits({});
                setNameEdits({});
                setThicknessEdits({});
              }}
              className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              تبدیلیاں منسوخ کریں
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={handleSaveAllDirty}
              className="h-8 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 cursor-pointer"
            >
              {savingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>تمام تبدیلیاں محفوظ کریں ({totalDirtyCount})</span>
            </Button>
          </div>
        </div>
      )}

      {/* PER-RATE-CELL MULTI-PHOTO UPLOAD & GALLERY MODAL */}
      {photoModalTarget && (() => {
        const modalPhotos = getSlotPhotos(photoModalTarget.row, photoModalTarget.slot);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
            onClick={() => setPhotoModalTarget(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 sticky top-0 z-10">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Camera className="h-4 w-4 text-amber-400 shrink-0" />
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {photoModalTarget.displayName}
                    </h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                      {photoModalTarget.slot === 'General'
                        ? 'تمام اسٹاک تصاویر (All Stock Photos)'
                        : formatSlotLabel(photoModalTarget.slot)}
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-mono font-bold">
                      {getRowDisplayThickness(photoModalTarget.row)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {mode === 'supplier'
                      ? 'اس مٹیریل کی ایک یا ایک سے زیادہ اصل تصاویر اپلوڈ کریں تاکہ اسٹون ایکسپرٹ ایڈمن کو آپ کے اسٹاک کی اصل شکل و کوالٹی معلوم ہو سکے۔'
                      : 'سپلائر کی اپلوڈ کردہ یا ایڈمن کی جانب سے لگائی گئی مٹیریل کی تصاویر — چاہیں تو ایپ پروڈکٹ پر لگائیں ورنہ پورٹل میں محفوظ رہیں گی۔'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoModalTarget(null)}
                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Multi-file Upload Trigger */}
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 p-5 text-center cursor-pointer transition-colors">
                  {uploadingCellPhotos ? (
                    <>
                      <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                      <span className="text-xs font-bold text-amber-300">
                        تصاویر کمپریس اور اپلوڈ ہو رہی ہیں...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold text-white">
                        تصاویر منتخب کریں (ایک سے زائد تصاویر ایک ساتھ اپلوڈ کریں)
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Click to choose multiple photos from gallery or camera (JPG, PNG, WebP)
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingCellPhotos}
                    className="hidden"
                    onChange={e => {
                      handleUploadCellPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>

                {/* Feedback Message */}
                {photoFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                      photoFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{photoFeedback.text}</span>
                  </div>
                )}

                {/* Uploaded Photos Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-extrabold text-slate-300">
                      موجود تصاویر ({modalPhotos.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {mode === 'supplier' ? 'تمام تصاویر خودکار پورٹل میں محفوظ ہو جاتی ہیں' : 'تصویر پر کلک کر کے بڑا دیکھیں'}
                    </span>
                  </div>

                  {modalPhotos.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-8 text-center text-xs text-slate-500">
                      ابھی تک اس سائز کے لیے کوئی تصویر اپلوڈ نہیں کی گئی۔ اوپر بٹن پر کلک کر کے مٹیریل کی تصاویر شامل کریں۔
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {modalPhotos.map(photo => (
                        <div
                          key={photo.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden flex flex-col"
                        >
                          <div className="relative aspect-[4/3] bg-black group">
                            <img
                              src={photo.imageUrl}
                              alt={`${photo.baseName} ${photo.sizeSlot}`}
                              onClick={() => setZoomedPhotoUrl(photo.imageUrl)}
                              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-[1.02]"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedPhotoUrl(photo.imageUrl)}
                              className="absolute top-2 left-2 h-7 w-7 rounded-lg bg-black/65 text-white hover:bg-black/90 flex items-center justify-center cursor-pointer"
                              title="بڑی تصویر دیکھیں"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingPhotoId === photo.id}
                              onClick={() => handleDeleteCellPhoto(photo.id)}
                              className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-rose-600/85 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                              title="تصویر حذف کریں"
                            >
                              {deletingPhotoId === photo.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-slate-200">
                              {photo.uploadedBy === 'supplier' ? 'Supplier Photo' : 'Admin Photo'}
                            </span>
                          </div>

                          {/* Admin Optional Actions: Apply to Live Storefront or Keep in Portal */}
                          {mode !== 'supplier' && (
                            <div className="p-2.5 border-t border-slate-800 flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                disabled={applyingPhotoId !== null}
                                onClick={() => handleApplyPhotoToApp(photo, 'main')}
                                className="flex-1 h-7 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1 cursor-pointer"
                              >
                                {applyingPhotoId === `${photo.id}_main` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                                <span>ایپ مین تصویر لگائیں</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={applyingPhotoId !== null}
                                onClick={() => handleApplyPhotoToApp(photo, 'gallery')}
                                className="flex-1 h-7 text-[10px] font-bold border-slate-700 text-slate-200 hover:bg-slate-800 gap-1 cursor-pointer"
                              >
                                {applyingPhotoId === `${photo.id}_gallery` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                                <span>ایپ گیلری میں لگائیں</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULLSCREEN IMAGE ZOOM LIGHTBOX */}
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomedPhotoUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedPhotoUrl(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoomedPhotoUrl}
            alt="Full size material preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
