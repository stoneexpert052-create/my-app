'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, SupplierRate } from '@/lib/admin-actions';
import {
  Check,
  Loader2,
  Search,
  Sparkles,
  FileSpreadsheet,
  Table2,
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
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export type SizeSlotKey = '24"' | '36"' | '48"' | '52"' | 'Gangsaw' | '12"' | '4"' | 'Standard';

export interface MatrixStoneRow {
  baseName: string;
  categoryGroup: string;
  isHighlighted: boolean;
  slots: Partial<Record<SizeSlotKey, SupplierRate>>;
}

export function parseStoneNameAndSize(rate: SupplierRate): {
  baseName: string;
  sizeSlot: SizeSlotKey;
  categoryGroup: string;
} {
  const rawName = (rate.materialName || '').trim();
  let baseName = rawName;
  let sizeSlot: SizeSlotKey = 'Standard';

  if (rawName.includes(' - ')) {
    const parts = rawName.split(' - ');
    baseName = parts[0].trim();
    const suffix = parts.slice(1).join(' - ').toLowerCase();

    if (suffix.includes('24"') || suffix.includes('24 inch') || suffix.includes('24 ')) {
      sizeSlot = '24"';
    } else if (suffix.includes('36"') || suffix.includes('36 inch') || suffix.includes('36 ')) {
      sizeSlot = '36"';
    } else if (suffix.includes('48"') || suffix.includes('48 inch') || suffix.includes('48 ')) {
      sizeSlot = '48"';
    } else if (suffix.includes('52"') || suffix.includes('52 inch') || suffix.includes('52 ')) {
      sizeSlot = '52"';
    } else if (suffix.includes('12"') || suffix.includes('12 inch')) {
      sizeSlot = '12"';
    } else if (suffix.includes('4"') || suffix.includes('4 inch')) {
      sizeSlot = '4"';
    } else if (suffix.includes('gangsaw') || suffix.includes('slab')) {
      sizeSlot = 'Gangsaw';
    }
  } else {
    const lower = rawName.toLowerCase();
    if (lower.includes('gangsaw')) sizeSlot = 'Gangsaw';
    else if (lower.includes('24"')) sizeSlot = '24"';
    else if (lower.includes('36"')) sizeSlot = '36"';
    else if (lower.includes('48"')) sizeSlot = '48"';
    else if (lower.includes('52"')) sizeSlot = '52"';
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
    } else if (sizeSlot === '24"' || sizeSlot === '36"' || sizeSlot === '48"' || sizeSlot === '52"') {
      categoryGroup = 'Imported Granite';
    } else {
      categoryGroup = 'General Catalog';
    }
  }

  return { baseName, sizeSlot, categoryGroup };
}

export function groupRatesIntoMatrix(rates: SupplierRate[]): MatrixStoneRow[] {
  const rowMap = new Map<string, MatrixStoneRow>();

  for (const rate of rates) {
    if (rate.status === 'paused') continue;
    const { baseName, sizeSlot, categoryGroup } = parseStoneNameAndSize(rate);
    const key = `${categoryGroup}::${baseName.toLowerCase()}`;

    const existing = rowMap.get(key);
    if (!existing) {
      rowMap.set(key, {
        baseName,
        categoryGroup,
        isHighlighted: Boolean(rate.isHighlighted),
        slots: {
          [sizeSlot]: rate
        }
      });
    } else {
      existing.slots[sizeSlot] = rate;
      if (rate.isHighlighted) {
        existing.isHighlighted = true;
      }
    }
  }

  return Array.from(rowMap.values());
}

interface SupplierRateSheetMatrixProps {
  supplier: Supplier;
  mode: 'admin' | 'supplier' | 'modal';
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
    changedItems: Array<{ rate: SupplierRate; oldRate: number; newRate: number; isNewSlot?: boolean }>
  ) => Promise<void>;
  onApplyStoreMarkup?: (percentage: number) => Promise<void>;
  onResetOfficialAlMajeed?: () => Promise<void>;
}

export function SupplierRateSheetMatrix({
  supplier,
  mode,
  pendingRequests = [],
  onSaveRatesBatch,
  onApplyStoreMarkup,
  onResetOfficialAlMajeed
}: SupplierRateSheetMatrixProps) {
  const isAlMajeed =
    supplier.id === 'al-majeed-marble-granite-factory' ||
    (supplier.name || '').toLowerCase().includes('al majeed');

  const [viewLayout, setViewLayout] = useState<'sheet' | 'unified'>('sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOriginalPhoto, setShowOriginalPhoto] = useState(false);
  const [markupPct, setMarkupPct] = useState<number>(15);
  const [applyingMarkup, setApplyingMarkup] = useState(false);
  const [resettingOfficial, setResettingOfficial] = useState(false);

  // Track inline rate edits keyed by cell key: `${baseName}__${sizeSlot}`
  const [cellEdits, setCellEdits] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [justSavedToast, setJustSavedToast] = useState<string | null>(null);

  // Add New Stone Row state
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newStoneName, setNewStoneName] = useState('');
  const [newStoneCategory, setNewStoneCategory] = useState('Imported Granite');
  const [newStone24, setNewStone24] = useState('');
  const [newStone36, setNewStone36] = useState('');
  const [newStone48, setNewStone48] = useState('');
  const [newStone52, setNewStone52] = useState('');
  const [newStoneGangsaw, setNewStoneGangsaw] = useState('');

  const matrixRows = useMemo(() => {
    return groupRatesIntoMatrix(supplier.rates || []);
  }, [supplier.rates]);

  // Reset cellEdits when supplier rates change from parent
  useEffect(() => {
    setCellEdits({});
  }, [supplier.rates]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return matrixRows;
    const q = searchQuery.toLowerCase().trim();
    return matrixRows.filter(
      r =>
        r.baseName.toLowerCase().includes(q) ||
        r.categoryGroup.toLowerCase().includes(q)
    );
  }, [matrixRows, searchQuery]);

  const getCellKey = (baseName: string, sizeSlot: SizeSlotKey) => `${baseName}__${sizeSlot}`;

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
    const allSlots: SizeSlotKey[] = ['24"', '36"', '48"', '52"', 'Gangsaw', '12"', '4"', 'Standard'];
    return allSlots.some(slot => isCellDirty(row, slot));
  };

  const totalDirtyCount = useMemo(() => {
    let count = 0;
    const allSlots: SizeSlotKey[] = ['24"', '36"', '48"', '52"', 'Gangsaw', '12"', '4"', 'Standard'];
    for (const row of matrixRows) {
      for (const slot of allSlots) {
        if (isCellDirty(row, slot)) count++;
      }
    }
    return count;
  }, [matrixRows, cellEdits]);

  const handleCellChange = (baseName: string, sizeSlot: SizeSlotKey, val: string) => {
    const key = getCellKey(baseName, sizeSlot);
    setCellEdits(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const buildUpdatedRatesFromRows = (targetRows: MatrixStoneRow[]) => {
    const currentRates = [...(supplier.rates || [])];
    const changedItems: Array<{
      rate: SupplierRate;
      oldRate: number;
      newRate: number;
      isNewSlot?: boolean;
    }> = [];

    const allSlots: SizeSlotKey[] = ['24"', '36"', '48"', '52"', 'Gangsaw', '12"', '4"', 'Standard'];

    for (const row of targetRows) {
      for (const slot of allSlots) {
        if (!isCellDirty(row, slot)) continue;
        const key = getCellKey(row.baseName, slot);
        const newRateVal = Number(cellEdits[key]);
        if (isNaN(newRateVal) || newRateVal <= 0) continue;

        const existingSlotRate = row.slots[slot];
        if (existingSlotRate) {
          const idx = currentRates.findIndex(r => r.id === existingSlotRate.id || r.materialId === existingSlotRate.materialId);
          if (idx > -1) {
            const oldRate = currentRates[idx].rate;
            const updatedRateObj: SupplierRate = {
              ...currentRates[idx],
              rate: newRateVal,
              lastUpdated: new Date().toISOString()
            };
            currentRates[idx] = updatedRateObj;
            changedItems.push({ rate: updatedRateObj, oldRate, newRate: newRateVal });
          }
        } else {
          // Creating a brand new size rate on this stone row!
          const slug = row.baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const slotSlug = slot.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const thickness = row.categoryGroup === 'Silbata' && (slot === '12"' || slot === '4"') ? '4-Sutar' : '6-Sutar';
          const suffixLabel = slot === 'Gangsaw' ? `Gangsaws (${thickness})` : `${slot} (${thickness})`;
          const newRateObj: SupplierRate = {
            id: `rate-${slug}-${slotSlug}-${Date.now()}`,
            materialId: `${slug}_variant-${slug}-${slotSlug}`,
            materialName: `${row.baseName} - ${suffixLabel}`,
            materialType: 'marble',
            categoryGroup: row.categoryGroup,
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

    setSavingRowKey(row.baseName);
    try {
      await onSaveRatesBatch(updatedRates, changedItems);
      // Clear dirty keys for this row
      setCellEdits(prev => {
        const next = { ...prev };
        const allSlots: SizeSlotKey[] = ['24"', '36"', '48"', '52"', 'Gangsaw', '12"', '4"', 'Standard'];
        allSlots.forEach(s => delete next[getCellKey(row.baseName, s)]);
        return next;
      });
      setJustSavedToast(`${row.baseName} کے ${changedItems.length} سائز ریٹس اپ ڈیٹ ہو گئے!`);
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
      setJustSavedToast(`تمام ${changedItems.length} تبدیلیاں کامیابی سے محفوظ ہو گئیں!`);
      setTimeout(() => setJustSavedToast(null), 4000);
    } finally {
      setSavingAll(false);
    }
  };

  const handleAddNewStoneRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newStoneName.trim();
    if (!cleanName) return;

    const entries: Array<{ slot: SizeSlotKey; val: number }> = [];
    if (Number(newStone24) > 0) entries.push({ slot: '24"', val: Number(newStone24) });
    if (Number(newStone36) > 0) entries.push({ slot: '36"', val: Number(newStone36) });
    if (Number(newStone48) > 0) entries.push({ slot: '48"', val: Number(newStone48) });
    if (Number(newStone52) > 0) entries.push({ slot: '52"', val: Number(newStone52) });
    if (Number(newStoneGangsaw) > 0) entries.push({ slot: 'Gangsaw', val: Number(newStoneGangsaw) });

    if (entries.length === 0) return;

    const currentRates = [...(supplier.rates || [])];
    const changedItems: Array<{ rate: SupplierRate; oldRate: number; newRate: number; isNewSlot?: boolean }> = [];
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    for (const item of entries) {
      const slotSlug = item.slot.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const suffixLabel = item.slot === 'Gangsaw' ? 'Gangsaws (6-Sutar)' : `${item.slot} (6-Sutar)`;
      const newRateObj: SupplierRate = {
        id: `rate-${slug}-${slotSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        materialId: `${slug}_variant-${slug}-${slotSlug}`,
        materialName: `${cleanName} - ${suffixLabel}`,
        materialType: 'marble',
        categoryGroup: newStoneCategory,
        rate: item.val,
        lastUpdated: new Date().toISOString()
      };
      currentRates.push(newRateObj);
      changedItems.push({ rate: newRateObj, oldRate: 0, newRate: item.val, isNewSlot: true });
    }

    setSavingAll(true);
    try {
      await onSaveRatesBatch(currentRates, changedItems);
      setNewStoneName('');
      setNewStone24('');
      setNewStone36('');
      setNewStone48('');
      setNewStone52('');
      setNewStoneGangsaw('');
      setShowAddRowForm(false);
      setJustSavedToast(`"${cleanName}" تمام سائز ریٹس کے ساتھ شامل کر دیا گیا!`);
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

  // Helper to render a compact inline rate input cell
  const renderRateCell = (row: MatrixStoneRow, slot: SizeSlotKey, placeholder: string = '—') => {
    const val = getDisplayValue(row, slot);
    const dirty = isCellDirty(row, slot);
    const slotRate = row.slots[slot];
    const hasPending =
      slotRate &&
      pendingRequests.some(req => req.materialId === slotRate.materialId && req.status === 'pending');

    return (
      <div className="relative flex items-center justify-center">
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
          className={`w-full h-8 px-1.5 text-center font-mono text-xs sm:text-[13px] font-extrabold rounded-md border transition-all focus:outline-none focus:ring-2 ${
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
        {hasPending && !dirty && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"
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
                {isAlMajeed ? 'Updated Rate List: 21-10-2026' : `Active Stone Rows: ${matrixRows.length}`}
              </Badge>
              <span className="text-[11px] text-amber-300/90 font-semibold" dir="rtl">
                ایک ہی نام کے آگے تمام سائز (24&quot;, 36&quot;, 48&quot;, 52&quot;, گینگ ساؤ) کے ریٹس
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-2 flex-wrap">
              <span>{supplier.name}</span>
            </h2>

            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-300 flex-wrap pt-0.5">
              <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Phone className="h-3.5 w-3.5 text-amber-400" />
                {isAlMajeed
                  ? 'Sadeeq Shah Khattak: 03335184573 • Shehzad Ul Haq: 03125050649 • M.Yousaf: 03331827909'
                  : `${supplier.contactPerson || ''} ${supplier.phone || ''}`}
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAlMajeed && (
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
                className="h-9 px-4 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 gap-1.5 animate-pulse cursor-pointer"
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
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setViewLayout('sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'sheet'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>مکمل پیج ریٹ شیٹ (Printed Sheet Layout)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('unified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'unified'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>یونیفائیڈ ملٹی سائز ٹیبل (24&quot; | 36&quot; | 48&quot; | 52&quot; | Gangsaw)</span>
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

          <div className="grid grid-cols-2 sm:grid-cols-8 gap-2.5 items-end">
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

            <div className="col-span-2 sm:col-span-1">
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
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">24&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone24}
                onChange={e => setNewStone24(e.target.value)}
                placeholder="24&quot;"
                className="h-8 text-xs text-center font-mono bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">36&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone36}
                onChange={e => setNewStone36(e.target.value)}
                placeholder="36&quot;"
                className="h-8 text-xs text-center font-mono bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">48&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone48}
                onChange={e => setNewStone48(e.target.value)}
                placeholder="48&quot;"
                className="h-8 text-xs text-center font-mono bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-300 block mb-1 text-center">52&quot; ریٹ</label>
              <Input
                type="number"
                value={newStone52}
                onChange={e => setNewStone52(e.target.value)}
                placeholder="52&quot;"
                className="h-8 text-xs text-center font-mono bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-indigo-300 block mb-1 text-center">Gangsaw ریٹ</label>
              <Input
                type="number"
                value={newStoneGangsaw}
                onChange={e => setNewStoneGangsaw(e.target.value)}
                placeholder="Slab"
                className="h-8 text-xs text-center font-mono bg-slate-950 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
              disabled={savingAll}
              className="h-8 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>لسٹ میں شامل کریں</span>
            </Button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: PRINTED SHEET 2-COLUMN MATRIX LAYOUT (DEFAULT)                */}
      {/* ===================================================================== */}
      {viewLayout === 'sheet' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (7/12): IMPORTED GRANITE (24", 36", 48", 52"), LOCAL GRANITES, LOCAL MARBLE, SILBATA */}
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
                      24&quot; • 36&quot; • 48&quot; • 52&quot;
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold" dir="rtl">
                    ایک نام کے آگے تمام کاؤنٹر و شیٹ سائز
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-800 bg-slate-900/90 text-[11px] font-black uppercase text-amber-300">
                        <th className="py-2 px-3 min-w-[155px]">Granite Name (نام)</th>
                        <th className="py-2 px-1.5 text-center w-20 border-l border-slate-800">24&quot;</th>
                        <th className="py-2 px-1.5 text-center w-20 border-l border-slate-800">36&quot;</th>
                        <th className="py-2 px-1.5 text-center w-20 border-l border-slate-800">48&quot;</th>
                        <th className="py-2 px-1.5 text-center w-20 border-l border-slate-800">52&quot;</th>
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
                            <td className="py-1.5 px-3 font-extrabold text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{row.baseName}</span>
                                {row.isHighlighted && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                                    title="Highlighted on Official Sheet"
                                  />
                                )}
                              </div>
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

            {/* 2. LOCAL GRANITES 24" & LOCAL MARBLE 24" SIDE-BY-SIDE */}
            {(groupedBySection['Local Granites 24"'].length > 0 ||
              groupedBySection['Local Marble 24"'].length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Granites 24" */}
                {groupedBySection['Local Granites 24"'].length > 0 && (
                  <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                    <div className="bg-slate-900 border-b-2 border-slate-700 px-3 py-2 flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                        Local Granites 24&quot;
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">PKR / sq.ft</span>
                    </div>
                    <table className="w-full text-left border-collapse">
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
                              <td className="py-1.5 px-3 font-bold text-white">{row.baseName}</td>
                              <td className="py-1.5 px-2 w-24 border-l border-slate-800/60">
                                {renderRateCell(row, '24"')}
                              </td>
                              <td className="py-1.5 px-1.5 w-10 text-center border-l border-slate-800/60">
                                <button
                                  type="button"
                                  disabled={!rowDirty || isSavingThis}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`h-7 w-7 rounded flex items-center justify-center ${
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

                {/* Local Marble 24" */}
                {groupedBySection['Local Marble 24"'].length > 0 && (
                  <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg">
                    <div className="bg-slate-900 border-b-2 border-slate-700 px-3 py-2 flex items-center justify-between">
                      <span className="font-black text-xs sm:text-sm text-amber-300 uppercase">
                        Local Marble 24&quot;
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">PKR / sq.ft</span>
                    </div>
                    <table className="w-full text-left border-collapse">
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
                              <td className="py-1.5 px-3 font-bold text-white">{row.baseName}</td>
                              <td className="py-1.5 px-2 w-24 border-l border-slate-800/60">
                                {renderRateCell(row, '24"')}
                              </td>
                              <td className="py-1.5 px-1.5 w-10 text-center border-l border-slate-800/60">
                                <button
                                  type="button"
                                  disabled={!rowDirty || isSavingThis}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`h-7 w-7 rounded flex items-center justify-center ${
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
                          <td className="py-1.5 px-3 font-extrabold text-white">{row.baseName}</td>
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
                              <td className="py-1.5 px-3.5 font-extrabold text-white">{row.baseName}</td>
                              <td className="py-1.5 px-2 w-28 border-l border-slate-800/60">
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
                              <td className="py-1.5 px-3.5 font-extrabold text-white">{row.baseName}</td>
                              <td className="py-1.5 px-2 w-28 border-l border-slate-800/60">
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
                              <td className="py-1.5 px-3.5 font-extrabold text-white">
                                <div className="flex items-center gap-1.5">
                                  <span>{row.baseName}</span>
                                  {row.isHighlighted && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                                      title="Highlighted on Official Sheet"
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 w-28 border-l border-slate-800/60">
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
                        <th className="py-1.5 px-3">Product</th>
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
                            <td className="py-1.5 px-3 font-bold text-white">{row.baseName}</td>
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
        /* VIEW 2: UNIFIED ALL-SIZES MATRIX TABLE (24" | 36" | 48" | 52" | Gangsaw) */
        /* ===================================================================== */
        <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-xl">
          <div className="bg-slate-900 border-b-2 border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>یونیفائیڈ ملٹی سائز ریٹ ٹیبل — ایک ہی نام کے آگے تمام سائز</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ہر پتھر کے آگے 24&quot;، 36&quot;، 48&quot;، 52&quot; اور Gangsaw کے خانے موجود ہیں۔ کسی بھی خالی خانے میں نیا ریٹ لکھ کر محفوظ کریں۔
              </p>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
              {filteredRows.length} Stones
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-900/95 text-[11px] font-black uppercase text-amber-300">
                  <th className="py-2.5 px-3.5 min-w-[180px]">Stone / Product Name</th>
                  <th className="py-2.5 px-2 min-w-[110px] border-l border-slate-800 text-slate-400">Category</th>
                  <th className="py-2.5 px-2 text-center w-24 border-l border-slate-800">24&quot; کاؤنٹر</th>
                  <th className="py-2.5 px-2 text-center w-24 border-l border-slate-800">36&quot; کاؤنٹر</th>
                  <th className="py-2.5 px-2 text-center w-24 border-l border-slate-800">48&quot; شیٹ</th>
                  <th className="py-2.5 px-2 text-center w-24 border-l border-slate-800">52&quot; شیٹ</th>
                  <th className="py-2.5 px-2 text-center w-28 border-l border-slate-800 text-indigo-300">
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
                      <td className="py-2 px-3.5 font-extrabold text-white">
                        <div className="flex items-center gap-2">
                          <span>{row.baseName}</span>
                          {row.isHighlighted && (
                            <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[9px] px-1.5 py-0">
                              Highlighted
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60 text-[10px] font-bold text-slate-400">
                        {row.categoryGroup}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
                        {renderRateCell(row, '24"')}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
                        {renderRateCell(row, '36"')}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
                        {renderRateCell(row, '48"')}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
                        {renderRateCell(row, '52"')}
                      </td>
                      <td className="py-2 px-2 border-l border-slate-800/60">
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

      {/* STICKY FLOATING SAVE BAR WHEN MULTIPLE CELLS ARE EDITED */}
      {totalDirtyCount > 0 && (
        <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/60 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">
              آپ نے <strong className="text-emerald-400 font-mono">{totalDirtyCount}</strong> سائز ریٹس میں تبدیلی کی ہے
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCellEdits({})}
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
    </div>
  );
}
