'use client';

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Printer, Scissors } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PdfPlacedPiece {
  instanceId: string;
  partId: string;
  pieceCode: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalLength: number;
  originalWidth: number;
  rotated: boolean;
  slabIndex: number;
  color: string;
  floorCoordLabel: string;
  bookmatchTag?: string;
}

export interface PdfOffcut {
  x: number;
  y: number;
  width: number;
  height: number;
  isUsableOffcut?: boolean;
}

export interface PdfDefectZone {
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

export interface PdfSlabResult {
  slabIndex: number;
  slabLength: number;
  slabWidth: number;
  usableLength: number;
  usableWidth: number;
  yieldPercent: number;
  placedPieces: PdfPlacedPiece[];
  freeRects?: PdfOffcut[];
  defects?: PdfDefectZone[];
}

interface SlabPdfBlueprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialName: string;
  lotId: string;
  unit: string;
  kerf: number;
  edgeTrim: number;
  slabImageUrl: string;
  slabs: PdfSlabResult[];
  overallYieldPercent: number;
  totalUsedAreaSqFt: number;
  totalPiecesPlaced: number;
  totalCutRunningFeet?: number;
  totalCutRunningInches?: number;
  cuttingRatePerRft?: number;
  totalCuttingCostPKR?: number;
  cadLang: 'en' | 'ur';
  initialSlabFilter?: number | null;
  autoTriggerAction?: 'none' | 'download_pdf' | 'print';
  onAutoActionComplete?: () => void;
}

export function SlabPdfBlueprintModal({
  open,
  onOpenChange,
  materialName,
  lotId,
  unit,
  kerf,
  edgeTrim,
  slabImageUrl,
  slabs,
  overallYieldPercent,
  totalUsedAreaSqFt,
  totalPiecesPlaced,
  totalCutRunningFeet = 0,
  totalCutRunningInches = 0,
  cuttingRatePerRft = 35,
  totalCuttingCostPKR = 0,
  cadLang,
  initialSlabFilter = null,
  autoTriggerAction = 'none',
  onAutoActionComplete,
}: SlabPdfBlueprintModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedSlabFilter, setSelectedSlabFilter] = useState<number | null>(initialSlabFilter);
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);
  const formatNum = (n: number) => Number(n.toFixed(2));

  React.useEffect(() => {
    if (open) {
      setSelectedSlabFilter(initialSlabFilter ?? null);
    }
  }, [open, initialSlabFilter]);

  const visibleSlabs = React.useMemo(() => {
    if (selectedSlabFilter === null) return slabs || [];
    const filtered = (slabs || []).filter((s) => s.slabIndex === selectedSlabFilter);
    return filtered.length > 0 ? filtered : slabs || [];
  }, [slabs, selectedSlabFilter]);

  const handleDownloadPdf = async (targetSlabsOverride?: PdfSlabResult[]) => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const loadedImg: HTMLImageElement | null = await new Promise((resolve) => {
        if (!slabImageUrl) {
          resolve(null);
          return;
        }
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = slabImageUrl;
      });

      const slabsToExport =
        targetSlabsOverride && targetSlabsOverride.length > 0
          ? targetSlabsOverride
          : visibleSlabs.length > 0
          ? visibleSlabs
          : slabs;

      slabsToExport.forEach((slab, idx) => {
        if (idx > 0) {
          pdf.addPage('a4', 'landscape');
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 960;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Bar (Pakistani Standard: Width × Length + Running Feet Cutting Summary)
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(28, 22, canvas.width - 56, 82);
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 23px monospace';
        ctx.fillText(
          `STONECAD MARKED SLAB BLUEPRINT (W×L) — SLAB #${slab.slabIndex} OF ${slabsToExport.length}`,
          48,
          52
        );
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '15px monospace';
        ctx.fillText(
          `Material: ${materialName} (${lotId}) | Stock Slab (Width x Length): ${slab.slabWidth} x ${slab.slabLength} ${unit} | Pieces: ${(slab.placedPieces || []).length} | Yield: ${slab.yieldPercent.toFixed(1)}%`,
          48,
          76
        );
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(
          `Total Saw Cutting: ${totalCutRunningFeet.toFixed(1)} Running Feet (${Math.round(totalCutRunningInches)} Inches) | Rate: PKR ${cuttingRatePerRft}/R.Ft | Cutting Charge: PKR ${totalCuttingCostPKR.toLocaleString()}`,
          48,
          96
        );

        // Draw Marked Stock Slab on Left
        const maxDrawW = 1000;
        const maxDrawH = 670;
        const scale = Math.min(
          maxDrawW / Math.max(1, slab.slabLength),
          maxDrawH / Math.max(1, slab.slabWidth)
        );
        const drawW = slab.slabLength * scale;
        const drawH = slab.slabWidth * scale;
        const originX = 64;
        const originY = 152;

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 17px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `SLAB WIDTH: ${slab.slabWidth} ${unit}  ×  SLAB LENGTH: ${slab.slabLength} ${unit} (W×L)`,
          originX + drawW / 2,
          originY - 14
        );

        ctx.save();
        ctx.translate(originX - 20, originY + drawH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`<--- WIDTH: ${slab.slabWidth} ${unit} --->`, 0, 0);
        ctx.restore();

        // Slab Base & Stone Photo
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(originX, originY, drawW, drawH);
        if (loadedImg) {
          try {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.drawImage(loadedImg, originX, originY, drawW, drawH);
            ctx.restore();
          } catch {
            // fallback if external image taint
          }
        }

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 4;
        ctx.strokeRect(originX, originY, drawW, drawH);

        // Draw Usable Offcuts (Width × Length)
        (slab.freeRects || []).forEach((off) => {
          if (!off.isUsableOffcut) return;
          const ox = originX + off.x * scale;
          const oy = originY + off.y * scale;
          const ow = off.width * scale;
          const oh = off.height * scale;

          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
          ctx.fillRect(ox, oy, ow, oh);
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(ox, oy, ow, oh);
          ctx.setLineDash([]);

          if (ow > 70 && oh > 35) {
            ctx.fillStyle = '#065F46';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              `REM (W×L): ${formatNum(off.height)}x${formatNum(off.width)} ${unit}`,
              ox + ow / 2,
              oy + oh / 2 + 5
            );
          }
          ctx.restore();
        });

        // Draw Marked Cracks & Freehand Pencil Crack Lines on the Slab
        (slab.defects || []).forEach((def, dIdx) => {
          const dx = originX + def.x * scale;
          const dy = originY + def.y * scale;
          const dw = def.width * scale;
          const dh = def.height * scale;

          ctx.save();
          ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
          ctx.fillRect(dx, dy, dw, dh);
          ctx.strokeStyle = def.pencilColor || '#DC2626';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(dx, dy, dw, dh);
          ctx.setLineDash([]);

          if (def.pencilPath && def.pencilPath.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(
              originX + def.pencilPath[0].x * scale,
              originY + def.pencilPath[0].y * scale
            );
            for (let i = 1; i < def.pencilPath.length; i++) {
              ctx.lineTo(
                originX + def.pencilPath[i].x * scale,
                originY + def.pencilPath[i].y * scale
              );
            }
            ctx.strokeStyle = def.pencilColor || '#DC2626';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }

          ctx.fillStyle = '#991B1B';
          ctx.font = 'bold 13px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            def.crackLengthUnits
              ? `CRACK #${dIdx + 1} (${def.crackLengthUnits}${unit})`
              : `CRACK #${dIdx + 1}`,
            dx + dw / 2,
            dy + dh / 2 + 4
          );
          ctx.restore();
        });

        // Draw Marked Cut Pieces on the Slab (Pakistani Standard: Width × Length)
        (slab.placedPieces || []).forEach((p) => {
          const px = originX + p.x * scale;
          const py = originY + p.y * scale;
          const pw = p.width * scale;
          const ph = p.height * scale;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
          ctx.fillRect(px, py, pw, ph);

          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 3;
          ctx.strokeRect(px, py, pw, ph);

          // Red Saw Cut Dashed Line
          ctx.save();
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(px - 1, py - 1, pw + 2, ph + 2);
          ctx.restore();

          ctx.fillStyle = '#0F172A';
          ctx.textAlign = 'center';
          const cx = px + pw / 2;
          const cy = py + ph / 2;

          ctx.font = 'bold 16px monospace';
          ctx.fillText(
            `[${p.pieceCode}] W:${formatNum(p.originalWidth)} x L:${formatNum(p.originalLength)} ${unit}`,
            cx,
            cy - 3
          );
          if (ph > 44) {
            ctx.font = '13px sans-serif';
            ctx.fillStyle = '#1E293B';
            ctx.fillText(String(p.label).slice(0, 26), cx, cy + 16);
          }
        });

        // Right Table: Cut Pieces List (Width × Length)
        const tableX = originX + maxDrawW + 30;
        const tableY = originY;
        const tableW = canvas.width - tableX - 28;

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(tableX, tableY, tableW, 38);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`CUT PIECES (WIDTH x LENGTH) — SLAB #${slab.slabIndex}`, tableX + 12, tableY + 24);

        let rowY = tableY + 62;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#334155';
        ctx.fillText('CODE', tableX + 8, rowY);
        ctx.fillText(`W x L (${unit})`, tableX + 70, rowY);
        ctx.fillText('POS (X,Y)', tableX + 185, rowY);
        ctx.fillText('LABEL', tableX + 290, rowY);

        rowY += 24;
        (slab.placedPieces || []).slice(0, 22).forEach((p, i) => {
          if (i % 2 === 0) {
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(tableX, rowY - 16, tableW, 24);
          }
          ctx.fillStyle = '#0284C7';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`[${p.pieceCode}]`, tableX + 8, rowY);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`${formatNum(p.originalWidth)}x${formatNum(p.originalLength)}`, tableX + 70, rowY);

          ctx.fillStyle = '#475569';
          ctx.font = '12px monospace';
          ctx.fillText(`(${formatNum(p.x)},${formatNum(p.y)})`, tableX + 185, rowY);

          ctx.fillStyle = '#0F172A';
          ctx.font = '12px sans-serif';
          ctx.fillText(String(p.label).slice(0, 18), tableX + 290, rowY);

          rowY += 24;
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 12, 12, pageW - 24, pageH - 24);
      });

      const fileSuffix =
        slabsToExport.length === 1 ? `_Slab_${slabsToExport[0].slabIndex}` : '_All_Slabs';
      pdf.save(`Marked_Slab_Cutting_Plan_${lotId || 'Marble'}${fileSuffix}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  React.useEffect(() => {
    if (!open || autoTriggerAction === 'none') return;
    const timer = setTimeout(() => {
      if (autoTriggerAction === 'download_pdf') {
        handleDownloadPdf();
      } else if (autoTriggerAction === 'print') {
        window.print();
      }
      onAutoActionComplete?.();
    }, 220);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoTriggerAction]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-950 text-white border-slate-700 p-4 md:p-6">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-white text-base md:text-lg font-bold flex items-center gap-2">
                <Scissors className="h-5 w-5 text-sky-400" />
                <span>
                  {selectedSlabFilter !== null
                    ? tr(
                        `Slab #${selectedSlabFilter} — PDF Blueprint Overview (Width × Length)`,
                        `سلیب نمبر #${selectedSlabFilter} — پی ڈی ایف اوور ویو اور کٹنگ نقشہ`
                      )
                    : tr(
                        'Marked Stock Slab Blueprint (Width × Length & Cutting Running Feet)',
                        'سلیب پر کٹنگ کے نشانات، چوڑائی × لمبائی اور رننگ فٹ کا پی ڈی ایف نقشہ'
                      )}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs mt-0.5">
                {tr(
                  `Stock Slab (W×L): ${slabs[0]?.slabWidth || 60} × ${slabs[0]?.slabLength || 110} ${unit} · Total Cutting: ${totalCutRunningFeet.toFixed(1)} R.Ft (${Math.round(totalCutRunningInches)} in) · Cutting Cost: PKR ${totalCuttingCostPKR.toLocaleString()}`,
                  `اسٹاک سلیب (چوڑائی ${slabs[0]?.slabWidth || 60} × لمبائی ${slabs[0]?.slabLength || 110} ${unit}) · کل کٹنگ: ${totalCutRunningFeet.toFixed(1)} رننگ فٹ (${Math.round(totalCutRunningInches)} انچ) · کٹنگ چارجز: PKR ${totalCuttingCostPKR.toLocaleString()}`
                )}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => handleDownloadPdf()}
                className="h-9 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isDownloading
                    ? tr('Generating PDF...', 'پی ڈی ایف بن رہا ہے...')
                    : selectedSlabFilter !== null
                    ? tr(
                        `Download Slab #${selectedSlabFilter} PDF`,
                        `سلیب #${selectedSlabFilter} پی ڈی ایف ڈاؤن لوڈ`
                      )
                    : tr('Download All Slabs PDF (.pdf)', 'پی ڈی ایف ڈاؤن لوڈ کریں (Download PDF)')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5 text-sky-400" />
                <span>{tr('Print Sheet', 'پرنٹ نکالیں')}</span>
              </button>
            </div>
          </div>

          {/* Slab Filter Bar inside Overview Modal: Switch between Single Slab or All Slabs */}
          {(slabs || []).length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 print:hidden">
              <span className="text-[11px] font-mono text-slate-400 mr-1">
                {tr('Preview Slab:', 'سلیب منتخب کریں:')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSlabFilter(null)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  selectedSlabFilter === null
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {tr(`All Slabs (${slabs.length})`, `تمام سلیبیں (${slabs.length})`)}
              </button>
              {slabs.map((s) => (
                <button
                  key={s.slabIndex}
                  type="button"
                  onClick={() => setSelectedSlabFilter(s.slabIndex)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                    selectedSlabFilter === s.slabIndex
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  SLAB #{s.slabIndex}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Cutting Running Feet & Inches Summary Banner inside Modal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-2.5">
            <div className="text-[10px] font-bold text-amber-300 uppercase">
              {tr('Total Cutting Running Feet', 'کل کٹنگ رننگ فٹ')}
            </div>
            <div className="text-base font-mono font-bold text-white">
              {totalCutRunningFeet.toFixed(1)} R.Ft
            </div>
          </div>
          <div className="rounded-md border border-sky-500/40 bg-sky-950/30 p-2.5">
            <div className="text-[10px] font-bold text-sky-300 uppercase">
              {tr('Total Cutting Running Inches', 'کل کٹنگ رننگ انچ')}
            </div>
            <div className="text-base font-mono font-bold text-white">
              {Math.round(totalCutRunningInches).toLocaleString()} Inches
            </div>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-2.5">
            <div className="text-[10px] font-bold text-slate-300 uppercase">
              {tr('Cutting Rate / R.Ft', 'کٹنگ ریٹ فی رننگ فٹ')}
            </div>
            <div className="text-base font-mono font-bold text-white">
              PKR {cuttingRatePerRft} / R.Ft
            </div>
          </div>
          <div className="rounded-md border border-emerald-500/40 bg-emerald-950/30 p-2.5">
            <div className="text-[10px] font-bold text-emerald-300 uppercase">
              {tr('Total Customer Cutting Bill', 'کسٹمر کا کل کٹنگ بل')}
            </div>
            <div className="text-base font-mono font-bold text-emerald-300">
              PKR {totalCuttingCostPKR.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Visual Blueprint Sheet Preview for Visible Slabs */}
        <div className="space-y-6 pt-2">
          {visibleSlabs.map((slab) => (
            <div
              key={slab.slabIndex}
              className="rounded-lg border-2 border-slate-700 bg-white text-slate-950 p-4 space-y-4 shadow-lg"
            >
              {/* Blueprint Sheet Title Block */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-900 pb-2">
                <div>
                  <div className="text-sm font-mono font-bold uppercase text-slate-900">
                    SLAB #{slab.slabIndex} MARKED CUTTING DIAGRAM — {materialName} ({lotId})
                  </div>
                  <div className="text-xs font-mono text-slate-700">
                    Full Stock Slab (Width × Length):{' '}
                    <strong>
                      {slab.slabWidth} × {slab.slabLength} {unit} (پہلے چوڑائی × بعد میں لمبائی)
                    </strong>{' '}
                    | Blade Kerf: {kerf} {unit}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                    {(slab.placedPieces || []).length} Pieces Cut · Yield: {slab.yieldPercent.toFixed(1)}%
                  </span>
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadPdf([slab])}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1 print:hidden"
                    title={`Download PDF for Slab #${slab.slabIndex}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{tr(`PDF #${slab.slabIndex}`, `پی ڈی ایف #${slab.slabIndex}`)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlabFilter(slab.slabIndex);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1 print:hidden"
                    title={`Print Slab #${slab.slabIndex}`}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{tr('Print', 'پرنٹ')}</span>
                  </button>
                </div>
              </div>

              {/* Proportional Stock Slab with Marked Cut Pieces & Dimensions */}
              <div className="space-y-1">
                <div className="text-center font-mono text-xs font-bold text-slate-800">
                  ↕ SLAB WIDTH (چوڑائی): {slab.slabWidth} {unit} &nbsp;|&nbsp; ↔ SLAB LENGTH (لمبائی):{' '}
                  {slab.slabLength} {unit}
                </div>
                <div
                  className="relative w-full overflow-hidden rounded border-2 border-slate-900 bg-slate-100"
                  style={{
                    aspectRatio: `${Math.max(1, slab.slabLength)} / ${Math.max(1, slab.slabWidth)}`,
                  }}
                >
                  {/* Stone Texture Underneath */}
                  <div
                    className="absolute inset-0 bg-no-repeat bg-center opacity-45"
                    style={{
                      backgroundImage: `url("${slabImageUrl}")`,
                      backgroundSize: '100% 100%',
                    }}
                  />

                  {/* Remaining Usable Offcut Zones (Width × Length) */}
                  {(slab.freeRects || [])
                    .filter((o) => o.isUsableOffcut)
                    .map((off, oIdx) => (
                      <div
                        key={oIdx}
                        className="absolute border-2 border-dashed border-emerald-700 bg-emerald-500/20 flex items-center justify-center p-1"
                        style={{
                          left: `${(off.x / slab.slabLength) * 100}%`,
                          top: `${(off.y / slab.slabWidth) * 100}%`,
                          width: `${(off.width / slab.slabLength) * 100}%`,
                          height: `${(off.height / slab.slabWidth) * 100}%`,
                        }}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-white/95 border border-emerald-700 text-[10px] font-mono font-bold text-emerald-900 text-center">
                          REM (W×L): {formatNum(off.height)}×{formatNum(off.width)} {unit}
                        </span>
                      </div>
                    ))}

                  {/* Marked Cut Pieces on the Stock Slab (Width × Length) */}
                  {(slab.placedPieces || []).map((p) => (
                    <div
                      key={p.instanceId}
                      className="absolute border-2 border-sky-700 bg-white/80 flex flex-col items-center justify-center p-1 text-center overflow-hidden shadow-xs"
                      style={{
                        left: `${(p.x / slab.slabLength) * 100}%`,
                        top: `${(p.y / slab.slabWidth) * 100}%`,
                        width: `${(p.width / slab.slabLength) * 100}%`,
                        height: `${(p.height / slab.slabWidth) * 100}%`,
                      }}
                    >
                      <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono text-[11px] font-bold leading-tight">
                        [{p.pieceCode}] W:{formatNum(p.originalWidth)}×L:{formatNum(p.originalLength)} {unit}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-900 truncate max-w-full mt-0.5">
                        {p.label}
                      </span>
                    </div>
                  ))}

                  {/* Marked Cracks & Pencil Crack Lines on Blueprint Preview */}
                  {(slab.defects || []).length > 0 && (
                    <svg
                      viewBox={`0 0 ${Math.max(1, slab.slabLength)} ${Math.max(1, slab.slabWidth)}`}
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {(slab.defects || []).map((def, dIdx) => (
                        <g key={def.id}>
                          <rect
                            x={def.x}
                            y={def.y}
                            width={def.width}
                            height={def.height}
                            fill="rgba(220, 38, 38, 0.22)"
                            stroke={def.pencilColor || '#DC2626'}
                            strokeWidth="0.4"
                            strokeDasharray="1.5 1"
                          />
                          {def.pencilPath && def.pencilPath.length >= 2 && (
                            <polyline
                              points={def.pencilPath.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                              fill="none"
                              stroke={def.pencilColor || '#DC2626'}
                              strokeWidth="1.0"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          <text
                            x={def.x + def.width / 2}
                            y={def.y + def.height / 2}
                            textAnchor="middle"
                            fill="#991B1B"
                            fontSize="2.4"
                            fontWeight="bold"
                          >
                            {def.crackLengthUnits
                              ? `CRACK #${dIdx + 1} (${def.crackLengthUnits}${unit})`
                              : `CRACK #${dIdx + 1}`}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              {/* Marked Pieces Table for this Slab (Width × Length) */}
              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Piece Name / Label</th>
                      <th className="p-2">Width × Length (چوڑائی × لمبائی)</th>
                      <th className="p-2">Position on Slab</th>
                      <th className="p-2">Fixing Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-900">
                    {(slab.placedPieces || []).map((p) => (
                      <tr key={p.instanceId}>
                        <td className="p-2 font-bold text-sky-700">[{p.pieceCode}]</td>
                        <td className="p-2 font-sans font-semibold">{p.label}</td>
                        <td className="p-2 font-bold">
                          {formatNum(p.originalWidth)} × {formatNum(p.originalLength)} {unit} (W×L)
                        </td>
                        <td className="p-2">
                          X = {formatNum(p.x)} {unit}, Y = {formatNum(p.y)} {unit}
                        </td>
                        <td className="p-2 text-emerald-700 font-bold">{p.floorCoordLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
