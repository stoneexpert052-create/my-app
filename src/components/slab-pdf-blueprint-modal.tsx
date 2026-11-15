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

  const getRecommendedNextUse = (w: number, l: number, isUr: boolean) => {
    const minD = Math.min(w, l);
    const maxD = Math.max(w, l);
    if (minD >= 24 && maxD >= 36) {
      return isUr
        ? 'اگلے کمرے کا فرش / باتھ روم فلور / سیڑھی لینڈنگ / وینٹی ٹاپ'
        : 'Next Room Floor / Bathroom Floor / Stair Landing / Vanity Top';
    }
    if (minD >= 11 && maxD >= 28) {
      return isUr
        ? 'سیڑھی کے ٹپے (Stair Steps) / کمرے کا آؤٹر بارڈر / وینٹی ٹاپ'
        : 'Stair Step Treads / Room Outer Border / Vanity / Threshold';
    }
    if (minD >= 5 && maxD >= 20) {
      return isUr
        ? 'سیڑھی رائزر (Riser) / ونڈو سل / کمرے کی بارڈر پٹی'
        : 'Stair Risers / Window Sills / Contrast Floor Strip (Patti)';
    }
    if (minD >= 1.5 && maxD >= 14) {
      return isUr
        ? 'دیوار اسکرٹنگ (Skirting) / سیڑھی روپ لائٹ لٹک (Latak)'
        : 'Wall Skirting (4") / Stair Rope-Light Latak / Thin Strip';
    }
    return isUr ? 'کارنر پیس / چھوٹی مرمت پٹی' : 'Corner Inlay / Small Filler Strip';
  };

  // Aggregate all remaining/waste pieces across visible slabs for summary
  const aggregatedWasteList = React.useMemo(() => {
    const map = new Map<
      string,
      {
        width: number;
        length: number;
        count: number;
        slabNums: number[];
        isUsable: boolean;
      }
    >();
    visibleSlabs.forEach((sl) => {
      (sl.freeRects || []).forEach((fr) => {
        const w = formatNum(Math.min(fr.width, fr.height));
        const l = formatNum(Math.max(fr.width, fr.height));
        if (w < 1.5 || l < 6) return;
        const key = `${w}x${l}`;
        const prev = map.get(key);
        if (prev) {
          prev.count += 1;
          if (!prev.slabNums.includes(sl.slabIndex)) prev.slabNums.push(sl.slabIndex);
        } else {
          map.set(key, {
            width: w,
            length: l,
            count: 1,
            slabNums: [sl.slabIndex],
            isUsable: Boolean(fr.isUsableOffcut || (w >= 4 && l >= 18)),
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.width * b.length - a.width * a.length);
  }, [visibleSlabs]);

  const [cadLineOnlyMode, setCadLineOnlyMode] = useState<boolean>(true);

  // Helper to draw an AutoCAD-style dimension line with arrows and ticks on a 2D canvas
  const drawCadDimensionLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    color = '#0F172A',
    fontSize = 12
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;

    // Main dimension line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLen = 7;

    // Start arrow + AutoCAD architectural tick
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + arrowLen * Math.cos(angle - Math.PI / 6), y1 + arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + arrowLen * Math.cos(angle + Math.PI / 6), y1 + arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();

    // End arrow + AutoCAD architectural tick
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLen * Math.cos(angle - Math.PI / 6), y2 - arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLen * Math.cos(angle + Math.PI / 6), y2 - arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();

    // Centered label with white knockout box
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.font = `bold ${fontSize}px monospace`;
    const textW = ctx.measureText(text).width + 10;
    ctx.save();
    ctx.translate(midX, midY);
    if (Math.abs(y2 - y1) > Math.abs(x2 - x1)) {
      ctx.rotate(-Math.PI / 2);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-textW / 2, -fontSize / 2 - 2, textW, fontSize + 4);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.restore();
  };

  // Helper to draw 45-degree AutoCAD diagonal hatch pattern inside a rectangle
  const drawCadDiagonalHatch = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    strokeColor = '#B45309',
    step = 12
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    for (let d = -h; d < w + h; d += step) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  };

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
        if (!slabImageUrl || cadLineOnlyMode) {
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
        canvas.height = 1040;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 100% PURE WHITE PAPER BACKGROUND (NO BLACK BACKGROUND!)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Outer AutoCAD Sheet Double Border
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
        ctx.lineWidth = 1;
        ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

        // AutoCAD Engineering Title Block Header (White background, crisp black lines)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(24, 24, canvas.width - 48, 78);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, canvas.width - 48, 78);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 21px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `2D AUTOCAD SLAB CUTTING BLUEPRINT — SLAB #${slab.slabIndex} OF ${slabsToExport.length} (${materialName} · ${lotId})`,
          40,
          52
        );
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(
          `Stock Slab (W×L): ${slab.slabWidth}" × ${slab.slabLength}" | Used Pieces: ${(slab.placedPieces || []).length} | Yield: ${slab.yieldPercent.toFixed(1)}% | Blade Kerf: ${kerf}" | Edge Trim: ${edgeTrim}"`,
          40,
          74
        );
        ctx.fillStyle = '#0369A1';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(
          `Total Saw Cutting: ${totalCutRunningFeet.toFixed(1)} R.Ft (${Math.round(totalCutRunningInches)} R.In) | Legend: [Solid Blue Box = USED PIECE]  [Dashed Hatched Box = REMAINING WASTE PIECE]`,
          40,
          94
        );

        // =====================================================================
        // SECTION 1 (TOP LEFT): 2D AUTOCAD MASTER SLAB CUTTING DRAWING
        // =====================================================================
        const maxDrawW = 820;
        const maxDrawH = 450;
        const scale = Math.min(
          maxDrawW / Math.max(1, slab.slabLength),
          maxDrawH / Math.max(1, slab.slabWidth)
        );
        const drawW = slab.slabLength * scale;
        const drawH = slab.slabWidth * scale;
        const originX = 78;
        const originY = 152;

        // Top & Left AutoCAD Dimension Lines for Full Stock Slab
        drawCadDimensionLine(
          ctx,
          originX,
          originY - 22,
          originX + drawW,
          originY - 22,
          `SLAB LENGTH: ${slab.slabLength} ${unit}`,
          '#0F172A',
          13
        );
        drawCadDimensionLine(
          ctx,
          originX - 26,
          originY,
          originX - 26,
          originY + drawH,
          `SLAB WIDTH: ${slab.slabWidth} ${unit}`,
          '#0F172A',
          13
        );

        // Slab Base (Pure White CAD Paper)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(originX, originY, drawW, drawH);

        // Light AutoCAD Coordinate Grid inside Slab
        ctx.save();
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 0.8;
        const gridStepPx = Math.max(24, 12 * scale);
        for (let gx = originX + gridStepPx; gx < originX + drawW; gx += gridStepPx) {
          ctx.beginPath();
          ctx.moveTo(gx, originY);
          ctx.lineTo(gx, originY + drawH);
          ctx.stroke();
        }
        for (let gy = originY + gridStepPx; gy < originY + drawH; gy += gridStepPx) {
          ctx.beginPath();
          ctx.moveTo(originX, gy);
          ctx.lineTo(originX + drawW, gy);
          ctx.stroke();
        }
        ctx.restore();

        if (loadedImg && !cadLineOnlyMode) {
          try {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.drawImage(loadedImg, originX, originY, drawW, drawH);
            ctx.restore();
          } catch {
            // ignore
          }
        }

        // Outer Stock Slab Thick AutoCAD Border
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.strokeRect(originX, originY, drawW, drawH);

        // Draw Remaining / Waste Offcuts with 45° AutoCAD Hatching
        const slabWasteRects = (slab.freeRects || []).filter(
          (o) => Math.min(o.width, o.height) >= 1.5 && Math.max(o.width, o.height) >= 6
        );

        slabWasteRects.forEach((off, wIdx) => {
          const wMin = formatNum(Math.min(off.width, off.height));
          const lMax = formatNum(Math.max(off.width, off.height));
          const ox = originX + off.x * scale;
          const oy = originY + off.y * scale;
          const ow = off.width * scale;
          const oh = off.height * scale;

          ctx.save();
          ctx.fillStyle = '#FFFBEB';
          ctx.fillRect(ox, oy, ow, oh);
          drawCadDiagonalHatch(ctx, ox, oy, ow, oh, '#D97706', 14);
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.strokeRect(ox, oy, ow, oh);
          ctx.setLineDash([]);

          if (ow > 48 && oh > 22) {
            const tagText = `[W${wIdx + 1}] WASTE: ${wMin}"×${lMax}"`;
            ctx.font = 'bold 12px monospace';
            const tw = Math.min(ow - 6, ctx.measureText(tagText).width + 10);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(ox + ow / 2 - tw / 2, oy + oh / 2 - 10, tw, 20);
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + ow / 2 - tw / 2, oy + oh / 2 - 10, tw, 20);
            ctx.fillStyle = '#92400E';
            ctx.textAlign = 'center';
            ctx.fillText(tagText, ox + ow / 2, oy + oh / 2 + 4);
          }
          ctx.restore();
        });

        // Draw Marked Cracks in CAD Vector Style
        (slab.defects || []).forEach((def, dIdx) => {
          const dx = originX + def.x * scale;
          const dy = originY + def.y * scale;
          const dw = def.width * scale;
          const dh = def.height * scale;

          ctx.save();
          ctx.fillStyle = '#FEF2F2';
          ctx.fillRect(dx, dy, dw, dh);
          drawCadDiagonalHatch(ctx, dx, dy, dw, dh, '#DC2626', 10);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(dx, dy, dw, dh);
          ctx.setLineDash([]);

          ctx.fillStyle = '#991B1B';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`CRACK #${dIdx + 1}`, dx + dw / 2, dy + dh / 2 + 4);
          ctx.restore();
        });

        // Draw Marked USED Cut Pieces on the Slab (Crisp AutoCAD Technical Box + Center Crosshair + Dimension Callouts)
        (slab.placedPieces || []).forEach((p) => {
          const px = originX + p.x * scale;
          const py = originY + p.y * scale;
          const pw = p.width * scale;
          const ph = p.height * scale;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, pw, ph);

          // Faint AutoCAD Centerlines inside Used Piece
          ctx.save();
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 0.9;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(px + pw / 2, py + 4);
          ctx.lineTo(px + pw / 2, py + ph - 4);
          ctx.moveTo(px + 4, py + ph / 2);
          ctx.lineTo(px + pw - 4, py + ph / 2);
          ctx.stroke();
          ctx.restore();

          // Solid AutoCAD Object Line for Used Piece
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(px, py, pw, ph);

          // Inner Blue CAD Highlight Line
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(px + 2, py + 2, Math.max(0, pw - 4), Math.max(0, ph - 4));

          const cx = px + pw / 2;
          const cy = py + ph / 2;

          // Dimension ticks near top & right edges of piece
          if (pw > 70 && ph > 42) {
            ctx.fillStyle = '#0369A1';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`|<-- ${formatNum(p.width)}" -->|`, cx, py + 14);
          }

          ctx.fillStyle = '#0F172A';
          ctx.textAlign = 'center';
          ctx.font = 'bold 14px monospace';
          ctx.fillText(
            `USED [${p.pieceCode}] ${formatNum(p.originalWidth)}"×${formatNum(p.originalLength)}"`,
            cx,
            cy
          );
          if (ph > 46) {
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#334155';
            ctx.fillText(String(p.label).slice(0, 26), cx, cy + 16);
          }
        });

        // =====================================================================
        // SECTION 2 (BOTTOM): SEPARATE 2D AUTOCAD DRAWINGS FOR
        //   (A) EACH USED PIECE SEPARATELY  vs  (B) EACH WASTE PIECE SEPARATELY
        // =====================================================================
        const sepTopY = originY + maxDrawH + 28;
        const sepBoxH = canvas.height - sepTopY - 34;
        const sepBoxW = 435;

        // Left Separate Box: USED PIECES 2D AUTOCAD GALLERY
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(36, sepTopY, sepBoxW, sepBoxH);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.strokeRect(36, sepTopY, sepBoxW, sepBoxH);

        ctx.fillStyle = '#F0F9FF';
        ctx.fillRect(36, sepTopY, sepBoxW, 28);
        ctx.strokeRect(36, sepTopY, sepBoxW, 28);
        ctx.fillStyle = '#0369A1';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `A. USED PIECES (SEPARATE 2D CAD VIEW) — ${(slab.placedPieces || []).length} PCS`,
          46,
          sepTopY + 18
        );

        const usedCards = (slab.placedPieces || []).slice(0, 6);
        const cardCols = 3;
        const cardW = 132;
        const cardH = Math.floor((sepBoxH - 44) / 2);
        usedCards.forEach((p, cIdx) => {
          const col = cIdx % cardCols;
          const row = Math.floor(cIdx / cardCols);
          const cx0 = 46 + col * (cardW + 9);
          const cy0 = sepTopY + 36 + row * (cardH + 6);

          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx0, cy0, cardW, cardH);

          // Proportional 2D CAD box for this individual Used Piece
          const maxBoxW = cardW - 28;
          const maxBoxH = cardH - 42;
          const pScale = Math.min(
            maxBoxW / Math.max(1, p.originalLength),
            maxBoxH / Math.max(1, p.originalWidth)
          );
          const bw = Math.max(28, p.originalLength * pScale);
          const bh = Math.max(20, p.originalWidth * pScale);
          const bx = cx0 + (cardW - bw) / 2;
          const by = cy0 + 18 + (maxBoxH - bh) / 2;

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);

          ctx.fillStyle = '#0369A1';
          ctx.font = 'bold 10.5px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`USED [${p.pieceCode}]`, cx0 + cardW / 2, cy0 + 12);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(
            `${formatNum(p.originalWidth)}"×${formatNum(p.originalLength)}"`,
            bx + bw / 2,
            by + bh / 2 + 4
          );

          ctx.fillStyle = '#475569';
          ctx.font = '10px sans-serif';
          ctx.fillText(String(p.label).slice(0, 16), cx0 + cardW / 2, cy0 + cardH - 5);
        });

        // Middle Separate Box: REMAINING WASTE PIECES 2D AUTOCAD GALLERY
        const wasteGalX = 36 + sepBoxW + 14;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(wasteGalX, sepTopY, sepBoxW, sepBoxH);
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(wasteGalX, sepTopY, sepBoxW, sepBoxH);

        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(wasteGalX, sepTopY, sepBoxW, 28);
        ctx.strokeRect(wasteGalX, sepTopY, sepBoxW, 28);
        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `B. REMAINING WASTE PIECES (SEPARATE 2D CAD VIEW) — ${slabWasteRects.length} PCS`,
          wasteGalX + 10,
          sepTopY + 18
        );

        if (slabWasteRects.length === 0) {
          ctx.fillStyle = '#047857';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            '100% FULL SLAB USED — ZERO WASTE PIECES!',
            wasteGalX + sepBoxW / 2,
            sepTopY + sepBoxH / 2
          );
        } else {
          slabWasteRects.slice(0, 6).forEach((off, wIdx) => {
            const col = wIdx % cardCols;
            const row = Math.floor(wIdx / cardCols);
            const cx0 = wasteGalX + 10 + col * (cardW + 9);
            const cy0 = sepTopY + 36 + row * (cardH + 6);
            const wMin = formatNum(Math.min(off.width, off.height));
            const lMax = formatNum(Math.max(off.width, off.height));
            const sqFt = ((wMin * lMax) / 144).toFixed(1);

            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx0, cy0, cardW, cardH);

            const maxBoxW = cardW - 28;
            const maxBoxH = cardH - 42;
            const wScale = Math.min(maxBoxW / Math.max(1, lMax), maxBoxH / Math.max(1, wMin));
            const bw = Math.max(28, lMax * wScale);
            const bh = Math.max(18, wMin * wScale);
            const bx = cx0 + (cardW - bw) / 2;
            const by = cy0 + 18 + (maxBoxH - bh) / 2;

            ctx.fillStyle = '#FFFBEB';
            ctx.fillRect(bx, by, bw, bh);
            drawCadDiagonalHatch(ctx, bx, by, bw, bh, '#D97706', 10);
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(bx, by, bw, bh);
            ctx.setLineDash([]);

            ctx.fillStyle = '#B45309';
            ctx.font = 'bold 10.5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`WASTE [W${wIdx + 1}]`, cx0 + cardW / 2, cy0 + 12);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(bx + 2, by + bh / 2 - 7, bw - 4, 14);
            ctx.fillStyle = '#78350F';
            ctx.font = 'bold 10.5px monospace';
            ctx.fillText(`${wMin}"×${lMax}"`, bx + bw / 2, by + bh / 2 + 3);

            ctx.fillStyle = '#047857';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`${sqFt} Sq.Ft`, cx0 + cardW / 2, cy0 + cardH - 5);
          });
        }

        // =====================================================================
        // SECTION 3 (RIGHT COLUMN): SEPARATE CAD SCHEDULES FOR USED vs WASTE
        // =====================================================================
        const tableX = 935;
        const tableY = 122;
        const tableW = canvas.width - tableX - 34;

        // Box 1: USED CUT PIECES TABLE (White CAD Paper + Crisp Borders)
        ctx.fillStyle = '#F0F9FF';
        ctx.fillRect(tableX, tableY, tableW, 32);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.strokeRect(tableX, tableY, tableW, 415);
        ctx.strokeRect(tableX, tableY, tableW, 32);

        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'left';
        ctx.font = 'bold 13.5px monospace';
        ctx.fillText(
          `1. USED CUT PIECES SCHEDULE — SLAB #${slab.slabIndex} (${(slab.placedPieces || []).length} PCS)`,
          tableX + 10,
          tableY + 21
        );

        let rowY = tableY + 52;
        ctx.font = 'bold 11.5px monospace';
        ctx.fillStyle = '#0F172A';
        ctx.fillText('CODE', tableX + 8, rowY);
        ctx.fillText(`USED SIZE W×L (${unit})`, tableX + 68, rowY);
        ctx.fillText('SAW CUT', tableX + 210, rowY);
        ctx.fillText('PIECE LABEL', tableX + 295, rowY);

        rowY += 18;
        (slab.placedPieces || []).slice(0, 15).forEach((p) => {
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(tableX, rowY - 13);
          ctx.lineTo(tableX + tableW, rowY - 13);
          ctx.stroke();

          const cutRIn = Math.round((p.originalWidth + p.originalLength) * 2);
          ctx.fillStyle = '#0369A1';
          ctx.font = 'bold 11.5px monospace';
          ctx.fillText(`[${p.pieceCode}]`, tableX + 8, rowY);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 11.5px monospace';
          ctx.fillText(
            `${formatNum(p.originalWidth)}" × ${formatNum(p.originalLength)}"`,
            tableX + 68,
            rowY
          );

          ctx.fillStyle = '#B91C1C';
          ctx.font = 'bold 11.5px monospace';
          ctx.fillText(`${cutRIn}" R.In`, tableX + 210, rowY);

          ctx.fillStyle = '#1E293B';
          ctx.font = '11px sans-serif';
          ctx.fillText(String(p.label).slice(0, 26), tableX + 295, rowY);

          rowY += 22;
        });

        // Box 2: REMAINING / WASTE PIECES TABLE (White CAD Paper + Crisp Borders)
        const wasteBoxY = 555;
        const wasteBoxH = canvas.height - wasteBoxY - 34;
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(tableX, wasteBoxY, tableW, 32);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.strokeRect(tableX, wasteBoxY, tableW, wasteBoxH);
        ctx.strokeRect(tableX, wasteBoxY, tableW, 32);

        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 13.5px monospace';
        ctx.fillText(
          `2. REMAINING WASTE PIECES & NEXT USE — SLAB #${slab.slabIndex} (${slabWasteRects.length} PCS)`,
          tableX + 10,
          wasteBoxY + 21
        );

        let wRowY = wasteBoxY + 52;
        ctx.font = 'bold 11.5px monospace';
        ctx.fillStyle = '#0F172A';
        ctx.fillText('CODE', tableX + 8, wRowY);
        ctx.fillText(`WASTE SIZE (${unit})`, tableX + 62, wRowY);
        ctx.fillText('AREA', tableX + 190, wRowY);
        ctx.fillText('WHERE TO USE NEXT', tableX + 260, wRowY);

        wRowY += 18;
        if (slabWasteRects.length === 0) {
          ctx.fillStyle = '#047857';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('100% Full Slab Used — Zero Waste Remaining!', tableX + 10, wRowY + 10);
        } else {
          slabWasteRects.slice(0, 14).forEach((off, i) => {
            ctx.strokeStyle = '#FDE68A';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(tableX, wRowY - 13);
            ctx.lineTo(tableX + tableW, wRowY - 13);
            ctx.stroke();

            const wMin = formatNum(Math.min(off.width, off.height));
            const lMax = formatNum(Math.max(off.width, off.height));
            const sqFt = ((wMin * lMax) / 144).toFixed(2);
            const nextUse = getRecommendedNextUse(wMin, lMax, false);

            ctx.fillStyle = '#B45309';
            ctx.font = 'bold 11.5px monospace';
            ctx.fillText(`[W${i + 1}]`, tableX + 8, wRowY);

            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 11.5px monospace';
            ctx.fillText(`${wMin}" × ${lMax}"`, tableX + 62, wRowY);

            ctx.fillStyle = '#047857';
            ctx.font = 'bold 11.5px monospace';
            ctx.fillText(`${sqFt} ft²`, tableX + 190, wRowY);

            ctx.fillStyle = '#1E293B';
            ctx.font = '11px sans-serif';
            ctx.fillText(nextUse.slice(0, 38), tableX + 260, wRowY);

            wRowY += 22;
          });
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', 10, 10, pageW - 20, pageH - 20);
      });

      // ADD FINAL MASTER SUMMARY PAGE (100% WHITE AUTOCAD SHEET): ALL USED PIECES vs ALL REMAINING WASTE PIECES
      pdf.addPage('a4', 'landscape');
      const sumCanvas = document.createElement('canvas');
      sumCanvas.width = 1600;
      sumCanvas.height = 1040;
      const sCtx = sumCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#FFFFFF';
        sCtx.fillRect(0, 0, sumCanvas.width, sumCanvas.height);

        sCtx.strokeStyle = '#0F172A';
        sCtx.lineWidth = 3;
        sCtx.strokeRect(18, 18, sumCanvas.width - 36, sumCanvas.height - 36);

        sCtx.strokeRect(26, 26, sumCanvas.width - 52, 72);
        sCtx.fillStyle = '#0F172A';
        sCtx.font = 'bold 21px monospace';
        sCtx.fillText(
          `2D AUTOCAD MASTER SCHEDULE: USED PIECES vs REMAINING WASTE PIECES — ${materialName} (${lotId})`,
          42,
          56
        );
        sCtx.fillStyle = '#334155';
        sCtx.font = 'bold 14px monospace';
        sCtx.fillText(
          `Total Slabs: ${slabsToExport.length} | Total Used Pieces: ${totalPiecesPlaced} (${totalUsedAreaSqFt.toFixed(1)} Sq.Ft) | Total Saw Cutting: ${totalCutRunningFeet.toFixed(1)} R.Ft (${Math.round(totalCutRunningInches)} R.In)`,
          42,
          82
        );

        // Left Half: All USED Cut Pieces Schedule
        const leftX = 32;
        const colW = 755;
        sCtx.fillStyle = '#F0F9FF';
        sCtx.fillRect(leftX, 114, colW, 34);
        sCtx.strokeStyle = '#0F172A';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(leftX, 114, colW, sumCanvas.height - 144);
        sCtx.strokeRect(leftX, 114, colW, 34);

        sCtx.fillStyle = '#0369A1';
        sCtx.font = 'bold 15px monospace';
        sCtx.fillText('A. ALL USED CUT PIECES (SEPARATE LIST — WIDTH × LENGTH)', leftX + 12, 136);

        let yLeft = 170;
        sCtx.fillStyle = '#0F172A';
        sCtx.font = 'bold 12px monospace';
        sCtx.fillText('SLAB', leftX + 10, yLeft);
        sCtx.fillText('CODE', leftX + 75, yLeft);
        sCtx.fillText('USED SIZE (W×L)', leftX + 145, yLeft);
        sCtx.fillText('CUT R.IN', leftX + 310, yLeft);
        sCtx.fillText('PIECE DESCRIPTION', leftX + 400, yLeft);
        yLeft += 22;

        const allPieces = slabsToExport.flatMap((s) => s.placedPieces || []);
        allPieces.slice(0, 36).forEach((p) => {
          sCtx.strokeStyle = '#E2E8F0';
          sCtx.lineWidth = 0.8;
          sCtx.beginPath();
          sCtx.moveTo(leftX, yLeft - 14);
          sCtx.lineTo(leftX + colW, yLeft - 14);
          sCtx.stroke();

          const cutIn = Math.round((p.originalWidth + p.originalLength) * 2);
          sCtx.fillStyle = '#0F172A';
          sCtx.font = 'bold 12px monospace';
          sCtx.fillText(`#${p.slabIndex}`, leftX + 10, yLeft);
          sCtx.fillStyle = '#0284C7';
          sCtx.fillText(`[${p.pieceCode}]`, leftX + 75, yLeft);
          sCtx.fillStyle = '#0F172A';
          sCtx.fillText(
            `${formatNum(p.originalWidth)}" × ${formatNum(p.originalLength)}"`,
            leftX + 145,
            yLeft
          );
          sCtx.fillStyle = '#B91C1C';
          sCtx.fillText(`${cutIn}" R.In`, leftX + 310, yLeft);
          sCtx.fillStyle = '#1E293B';
          sCtx.font = '12px sans-serif';
          sCtx.fillText(String(p.label).slice(0, 36), leftX + 400, yLeft);
          yLeft += 22;
        });

        // Right Half: All REMAINING WASTE Pieces Schedule & Next Use
        const rightX = 805;
        const rightW = 762;
        sCtx.fillStyle = '#FFFBEB';
        sCtx.fillRect(rightX, 114, rightW, 34);
        sCtx.strokeStyle = '#0F172A';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(rightX, 114, rightW, sumCanvas.height - 144);
        sCtx.strokeRect(rightX, 114, rightW, 34);

        sCtx.fillStyle = '#92400E';
        sCtx.font = 'bold 15px monospace';
        sCtx.fillText(
          'B. ALL REMAINING WASTE PIECES (SEPARATE LIST & NEXT USE)',
          rightX + 12,
          136
        );

        let yRight = 170;
        sCtx.fillStyle = '#0F172A';
        sCtx.font = 'bold 12px monospace';
        sCtx.fillText('WASTE SIZE (W×L)', rightX + 10, yRight);
        sCtx.fillText('AVAIL QTY', rightX + 165, yRight);
        sCtx.fillText('AREA', rightX + 255, yRight);
        sCtx.fillText('SLABS', rightX + 335, yRight);
        sCtx.fillText('RECOMMENDED NEXT USE', rightX + 430, yRight);
        yRight += 22;

        aggregatedWasteList.slice(0, 34).forEach((wItem) => {
          sCtx.strokeStyle = '#FDE68A';
          sCtx.lineWidth = 0.8;
          sCtx.beginPath();
          sCtx.moveTo(rightX, yRight - 14);
          sCtx.lineTo(rightX + rightW, yRight - 14);
          sCtx.stroke();

          const totalArea = (((wItem.width * wItem.length) / 144) * wItem.count).toFixed(2);
          const recUse = getRecommendedNextUse(wItem.width, wItem.length, false);
          sCtx.fillStyle = '#B45309';
          sCtx.font = 'bold 12px monospace';
          sCtx.fillText(`${wItem.width}" × ${wItem.length}"`, rightX + 10, yRight);
          sCtx.fillStyle = '#0F172A';
          sCtx.fillText(`${wItem.count} Pcs`, rightX + 165, yRight);
          sCtx.fillStyle = '#047857';
          sCtx.fillText(`${totalArea} ft²`, rightX + 255, yRight);
          sCtx.fillStyle = '#0F172A';
          sCtx.fillText(`#${wItem.slabNums.join(',#')}`, rightX + 335, yRight);
          sCtx.fillStyle = '#1E293B';
          sCtx.font = '11.5px sans-serif';
          sCtx.fillText(recUse.slice(0, 42), rightX + 430, yRight);
          yRight += 22;
        });

        const sumImgData = sumCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(sumImgData, 'JPEG', 10, 10, pageW - 20, pageH - 20);
      }

      const fileSuffix =
        slabsToExport.length === 1 ? `_Slab_${slabsToExport[0].slabIndex}` : '_All_Slabs';
      pdf.save(`2D_AutoCAD_Slab_Blueprint_${lotId || 'Marble'}${fileSuffix}.pdf`);
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
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto bg-white text-slate-950 border-2 border-slate-900 p-4 md:p-6 print:max-w-none print:max-h-none print:overflow-visible print:border-none print:p-0 print:bg-white print:text-black">
        <DialogHeader className="border-b-2 border-slate-900 pb-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-slate-950 text-base md:text-lg font-extrabold flex items-center gap-2">
                <Scissors className="h-5 w-5 text-sky-700" />
                <span>
                  {selectedSlabFilter !== null
                    ? tr(
                        `Slab #${selectedSlabFilter} — 2D AutoCAD PDF Blueprint (Used Pieces vs Remaining Waste Separate)`,
                        `سلیب نمبر #${selectedSlabFilter} — آٹو کیڈ 2D سفید پی ڈی ایف نقشہ (یوز پیس الگ اور ویسٹ پیس الگ)`
                      )
                    : tr(
                        '2D AutoCAD White-Paper PDF Blueprint (Used Cut Pieces & Remaining Waste Pieces Shown Separately)',
                        'آٹو کیڈ 2D سفید کاغذ والا پی ڈی ایف نقشہ (کارآمد یوز پیسز الگ اور بچنے والے ویسٹ پیسز الگ)'
                      )}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-700 text-xs font-semibold mt-0.5">
                {tr(
                  `Pure White 2D AutoCAD Line Style (Zero Black Background on Print) · Stock Slab: ${slabs[0]?.slabWidth || 60}" × ${slabs[0]?.slabLength || 110}" · Total Saw Cutting: ${totalCutRunningFeet.toFixed(1)} R.Ft (${Math.round(totalCutRunningInches)} in)`,
                  `خالص سفید کاغذ پر آٹو کیڈ 2D لائن اسٹائل (پرنٹ میں کالا بیک گراؤنڈ بالکل نہیں آئے گا) · اسٹاک سلیب: ${slabs[0]?.slabWidth || 60}" × ${slabs[0]?.slabLength || 110}" · کل کٹنگ: ${totalCutRunningFeet.toFixed(1)} رننگ فٹ`
                )}
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCadLineOnlyMode((prev) => !prev)}
                className={`h-9 px-3 rounded-md border-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                  cadLineOnlyMode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-400 hover:border-slate-700'
                }`}
              >
                <span>
                  {cadLineOnlyMode
                    ? tr('📐 2D AutoCAD Line Mode (ON)', '📐 آٹو کیڈ 2D لائن اسٹائل (آن)')
                    : tr('🪨 Show Faint Texture', '🪨 ہلکا ماربل شیڈ دکھائیں')}
                </span>
              </button>

              <button
                type="button"
                disabled={isDownloading}
                onClick={() => handleDownloadPdf()}
                className="h-9 px-4 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-2 shadow cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isDownloading
                    ? tr('Generating 2D CAD PDF...', 'آٹو کیڈ 2D پی ڈی ایف بن رہا ہے...')
                    : selectedSlabFilter !== null
                    ? tr(
                        `Download Slab #${selectedSlabFilter} CAD PDF`,
                        `سلیب #${selectedSlabFilter} آٹو کیڈ پی ڈی ایف ڈاؤن لوڈ`
                      )
                    : tr(
                        'Download Full 2D AutoCAD PDF (.pdf)',
                        'مکمل 2D آٹو کیڈ پی ڈی ایف ڈاؤن لوڈ کریں'
                      )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-3 rounded-md border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-sky-700" />
                <span>{tr('Print 2D CAD Sheet', '2D آٹو کیڈ شیٹ پرنٹ نکالیں')}</span>
              </button>
            </div>
          </div>

          {/* Slab Filter Bar inside Overview Modal */}
          {(slabs || []).length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 print:hidden">
              <span className="text-[11px] font-mono font-bold text-slate-700 mr-1">
                {tr('Select Slab:', 'سلیب منتخب کریں:')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSlabFilter(null)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border-2 transition-colors ${
                  selectedSlabFilter === null
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-slate-700'
                }`}
              >
                {tr(`All Slabs (${slabs.length})`, `تمام سلیبیں (${slabs.length})`)}
              </button>
              {slabs.map((s) => (
                <button
                  key={s.slabIndex}
                  type="button"
                  onClick={() => setSelectedSlabFilter(s.slabIndex)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border-2 transition-colors ${
                    selectedSlabFilter === s.slabIndex
                      ? 'bg-sky-700 border-sky-700 text-white'
                      : 'bg-white border-slate-300 text-slate-800 hover:border-slate-700'
                  }`}
                >
                  SLAB #{s.slabIndex}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* White-Background AutoCAD 2D Engineering Blueprint Sheets for Visible Slabs */}
        <div className="space-y-6 pt-2">
          {visibleSlabs.map((slab) => {
            const slabWasteItems = (slab.freeRects || []).filter(
              (o) => Math.min(o.width, o.height) >= 1.5 && Math.max(o.width, o.height) >= 6
            );

            return (
              <div
                key={slab.slabIndex}
                className="rounded-lg border-2 border-slate-950 bg-white text-slate-950 p-4 space-y-4 shadow-sm break-after-page"
              >
                {/* 2D AutoCAD Title Block (White background, crisp black borders) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-slate-950 bg-white p-3">
                  <div>
                    <div className="text-sm font-mono font-black uppercase text-slate-950">
                      📐 2D AUTOCAD DRAWING — SLAB #{slab.slabIndex} ({materialName} · {lotId})
                    </div>
                    <div className="text-xs font-mono text-slate-800">
                      Full Stock Slab (Width × Length):{' '}
                      <strong>
                        {slab.slabWidth}&quot; × {slab.slabLength}&quot; (چوڑائی × لمبائی)
                      </strong>{' '}
                      | Blade Kerf: {kerf}&quot; | Edge Trim: {edgeTrim}&quot; | Saw Cutting:{' '}
                      {totalCutRunningFeet.toFixed(1)} R.Ft
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded border-2 border-slate-950 bg-white text-slate-950 font-mono text-xs font-black">
                      ✅ {(slab.placedPieces || []).length} Used Pieces &nbsp;|&nbsp; ♻️{' '}
                      {slabWasteItems.length} Waste Pieces &nbsp;|&nbsp; Yield:{' '}
                      {slab.yieldPercent.toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadPdf([slab])}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold flex items-center gap-1 print:hidden cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{tr(`PDF #${slab.slabIndex}`, `پی ڈی ایف #${slab.slabIndex}`)}</span>
                    </button>
                  </div>
                </div>

                {/* 1. MASTER 2D AUTOCAD SLAB CUTTING LAYOUT (Pure White Background + Crisp Vector Lines) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-900 px-1">
                    <span>
                      {tr(
                        `1. MASTER 2D AUTOCAD SLAB CUTTING LAYOUT (SLAB #${slab.slabIndex})`,
                        `1. مکمل سلیب کا 2D آٹو کیڈ کٹنگ نقشہ (سلیب #${slab.slabIndex})`
                      )}
                    </span>
                    <span>
                      ↕ WIDTH: {slab.slabWidth}&quot; &nbsp;|&nbsp; ↔ LENGTH: {slab.slabLength}&quot;
                    </span>
                  </div>

                  <div
                    className="relative w-full overflow-hidden rounded border-2 border-slate-950 bg-white"
                    style={{
                      height: '300px',
                      backgroundImage:
                        'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  >
                    {/* Optional faint stone texture only when user toggles off pure CAD line mode */}
                    {!cadLineOnlyMode && slabImageUrl && (
                      <div
                        className="absolute inset-0 bg-no-repeat bg-center opacity-20 pointer-events-none"
                        style={{
                          backgroundImage: `url("${slabImageUrl}")`,
                          backgroundSize: '100% 100%',
                        }}
                      />
                    )}

                    {/* Remaining / Waste Zones on Master Slab (45° AutoCAD Diagonal Hatching) */}
                    {slabWasteItems.map((off, oIdx) => {
                      const wMin = formatNum(Math.min(off.width, off.height));
                      const lMax = formatNum(Math.max(off.width, off.height));
                      return (
                        <div
                          key={oIdx}
                          className="absolute border-2 border-dashed border-amber-700 flex items-center justify-center p-1"
                          style={{
                            left: `${(off.x / slab.slabLength) * 100}%`,
                            top: `${(off.y / slab.slabWidth) * 100}%`,
                            width: `${(off.width / slab.slabLength) * 100}%`,
                            height: `${(off.height / slab.slabWidth) * 100}%`,
                            backgroundImage:
                              'repeating-linear-gradient(45deg, rgba(217,119,6,0.12), rgba(217,119,6,0.12) 6px, rgba(255,255,255,0.95) 6px, rgba(255,255,255,0.95) 12px)',
                          }}
                        >
                          <span className="px-1.5 py-0.5 rounded bg-white border-[1.5px] border-amber-800 text-[10px] font-mono font-extrabold text-amber-950 text-center shadow-2xs">
                            [W{oIdx + 1}] WASTE: {wMin}&quot;×{lMax}&quot;
                          </span>
                        </div>
                      );
                    })}

                    {/* Used Cut Pieces on Master Slab (Crisp White AutoCAD Box + Solid Black/Blue Lines) */}
                    {(slab.placedPieces || []).map((p) => (
                      <div
                        key={p.instanceId}
                        className="absolute border-2 border-slate-950 bg-white flex flex-col items-center justify-center p-1 text-center overflow-hidden"
                        style={{
                          left: `${(p.x / slab.slabLength) * 100}%`,
                          top: `${(p.y / slab.slabWidth) * 100}%`,
                          width: `${(p.width / slab.slabLength) * 100}%`,
                          height: `${(p.height / slab.slabWidth) * 100}%`,
                        }}
                      >
                        {/* Inner CAD technical border */}
                        <div className="absolute inset-0.5 border border-sky-700 pointer-events-none" />
                        <span className="relative z-10 px-1.5 py-0.5 rounded bg-white border border-slate-950 text-slate-950 font-mono text-[11px] font-black leading-tight">
                          USED [{p.pieceCode}] {formatNum(p.originalWidth)}&quot;×
                          {formatNum(p.originalLength)}&quot;
                        </span>
                        <span className="relative z-10 text-[10px] font-bold text-slate-800 truncate max-w-full mt-0.5">
                          {p.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* =========================================================
                    2. SEPARATE 2D AUTOCAD VISUAL DRAWINGS FOR:
                       LEFT: USED PIECES ONLY (کارآمد یوز پیس الگ ڈایاگرام میں)
                       RIGHT: REMAINING WASTE PIECES ONLY (ویسٹ پیس الگ ڈایاگرام میں)
                   ========================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* LEFT BOX: SEPARATE 2D AUTOCAD DIAGRAMS & TABLE FOR USED PIECES ONLY */}
                  <div className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                      <span className="text-xs font-mono font-black text-sky-900 uppercase">
                        {tr(
                          `✅ A. USED PIECES SEPARATE 2D CAD DRAWINGS (${(slab.placedPieces || []).length} PCS)`,
                          `✅ الف: کارآمد (یوز پیسز) کے الگ الگ 2D آٹو کیڈ ڈایاگرام (${(slab.placedPieces || []).length} پیس)`
                        )}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {tr('Solid CAD Line = Used Piece', 'سیدھی لائن = یوز پیس')}
                      </span>
                    </div>

                    {/* Individual 2D AutoCAD Mini-Drawings of Each Used Piece */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(slab.placedPieces || []).map((p) => {
                        const isLandscape = p.originalLength >= p.originalWidth;
                        const cutRIn = Math.round((p.originalWidth + p.originalLength) * 2);
                        return (
                          <div
                            key={p.instanceId}
                            className="border border-slate-400 rounded p-2 bg-white flex flex-col items-center justify-between gap-1"
                          >
                            <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-slate-900">
                              <span className="text-sky-800 font-black">USED [{p.pieceCode}]</span>
                              <span>✂️ {cutRIn}&quot;</span>
                            </div>

                            {/* 2D AutoCAD Technical Box for this single Used Piece */}
                            <div className="w-full h-16 flex items-center justify-center py-1">
                              <div
                                style={{
                                  width: isLandscape ? '88%' : '58%',
                                  height: isLandscape ? '76%' : '96%',
                                }}
                                className="relative border-2 border-slate-950 bg-white flex flex-col items-center justify-center"
                              >
                                <div className="absolute inset-0.5 border border-dashed border-sky-600/60 pointer-events-none" />
                                <span className="text-[10px] font-mono font-black text-slate-950">
                                  {formatNum(p.originalWidth)}&quot; × {formatNum(p.originalLength)}&quot;
                                </span>
                              </div>
                            </div>

                            <div className="w-full text-center text-[10px] font-bold text-slate-800 truncate border-t border-slate-200 pt-1">
                              {p.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Clean White AutoCAD Schedule Table for Used Pieces */}
                    <div className="overflow-x-auto border border-slate-900 rounded">
                      <table className="w-full text-xs text-left font-mono bg-white text-slate-950">
                        <thead className="bg-slate-100 text-slate-950 border-b border-slate-900">
                          <tr>
                            <th className="p-1.5 border-r border-slate-300">Code</th>
                            <th className="p-1.5 border-r border-slate-300">
                              {tr('Used Piece Name', 'یوز پیس کا نام')}
                            </th>
                            <th className="p-1.5 border-r border-slate-300">
                              {tr('Used Size (W×L)', 'یوز سائز (چوڑائی×لمبائی)')}
                            </th>
                            <th className="p-1.5">{tr('Cut R.In', 'کٹ رننگ انچ')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {(slab.placedPieces || []).map((p) => {
                            const cutRIn = Math.round((p.originalWidth + p.originalLength) * 2);
                            return (
                              <tr key={p.instanceId}>
                                <td className="p-1.5 font-black text-sky-900 border-r border-slate-300">
                                  [{p.pieceCode}]
                                </td>
                                <td className="p-1.5 font-sans font-bold border-r border-slate-300">
                                  {p.label}
                                </td>
                                <td className="p-1.5 font-black border-r border-slate-300">
                                  {formatNum(p.originalWidth)}&quot; × {formatNum(p.originalLength)}&quot;
                                </td>
                                <td className="p-1.5 font-bold text-rose-800">{cutRIn}&quot; R.In</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RIGHT BOX: SEPARATE 2D AUTOCAD DIAGRAMS & TABLE FOR REMAINING WASTE PIECES ONLY */}
                  <div className="border-2 border-slate-950 rounded-lg bg-white p-3 space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-slate-950 pb-1.5">
                      <span className="text-xs font-mono font-black text-amber-900 uppercase">
                        {tr(
                          `♻️ B. REMAINING WASTE PIECES SEPARATE 2D CAD DRAWINGS (${slabWasteItems.length} PCS)`,
                          `♻️ ب: بچ جانے والے ویسٹ پیسز کے الگ الگ 2D آٹو کیڈ ڈایاگرام (${slabWasteItems.length} پیس)`
                        )}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {tr('Hatched CAD Box = Remaining Waste', 'ترچھی لائنیں = بچا ہوا ویسٹ پیس')}
                      </span>
                    </div>

                    {slabWasteItems.length === 0 ? (
                      <div className="p-6 text-center font-mono font-bold text-emerald-800 border border-dashed border-emerald-700 rounded bg-white">
                        {tr(
                          '✅ 100% Full Slab Used — Zero Waste Pieces Remaining!',
                          '✅ 100% پوری سلیب استعمال ہو گئی — اس سلیب میں کوئی ویسٹ پیس باقی نہیں بچا!'
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Individual 2D AutoCAD Hatched Mini-Drawings of Each Remaining Waste Piece */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {slabWasteItems.map((off, idx) => {
                            const wMin = formatNum(Math.min(off.width, off.height));
                            const lMax = formatNum(Math.max(off.width, off.height));
                            const sqFt = ((wMin * lMax) / 144).toFixed(2);
                            return (
                              <div
                                key={idx}
                                className="border border-amber-700 rounded p-2 bg-white flex flex-col items-center justify-between gap-1"
                              >
                                <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-amber-950">
                                  <span className="font-black">WASTE [W{idx + 1}]</span>
                                  <span className="text-emerald-800">{sqFt} ft²</span>
                                </div>

                                {/* 2D AutoCAD Hatched Box for this single Remaining Waste Piece */}
                                <div className="w-full h-16 flex items-center justify-center py-1">
                                  <div
                                    style={{
                                      width: '88%',
                                      height: '76%',
                                      backgroundImage:
                                        'repeating-linear-gradient(45deg, rgba(217,119,6,0.15), rgba(217,119,6,0.15) 5px, #ffffff 5px, #ffffff 10px)',
                                    }}
                                    className="relative border-2 border-dashed border-amber-800 bg-white flex items-center justify-center"
                                  >
                                    <span className="px-1 bg-white text-[10px] font-mono font-black text-slate-950 border border-amber-700">
                                      {wMin}&quot; × {lMax}&quot;
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full text-center text-[9.5px] font-bold text-slate-800 truncate border-t border-slate-200 pt-1">
                                  {getRecommendedNextUse(wMin, lMax, cadLang === 'ur')}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Clean White AutoCAD Schedule Table for Remaining Waste Pieces */}
                        <div className="overflow-x-auto border border-slate-900 rounded">
                          <table className="w-full text-xs text-left font-mono bg-white text-slate-950">
                            <thead className="bg-amber-50 text-slate-950 border-b border-slate-900">
                              <tr>
                                <th className="p-1.5 border-r border-slate-300">Code</th>
                                <th className="p-1.5 border-r border-slate-300">
                                  {tr('Waste Size (W×L)', 'بچا ہوا ویسٹ سائز')}
                                </th>
                                <th className="p-1.5 border-r border-slate-300">
                                  {tr('Area', 'رقبہ')}
                                </th>
                                <th className="p-1.5">
                                  {tr('Where to Use Next', 'آگے کہاں استعمال ہو سکتا ہے')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {slabWasteItems.map((off, idx) => {
                                const wMin = formatNum(Math.min(off.width, off.height));
                                const lMax = formatNum(Math.max(off.width, off.height));
                                const sqFt = ((wMin * lMax) / 144).toFixed(2);
                                return (
                                  <tr key={idx}>
                                    <td className="p-1.5 font-black text-amber-900 border-r border-slate-300">
                                      [W{idx + 1}]
                                    </td>
                                    <td className="p-1.5 font-black text-slate-950 border-r border-slate-300">
                                      {wMin}&quot; × {lMax}&quot;
                                    </td>
                                    <td className="p-1.5 font-bold text-emerald-800 border-r border-slate-300">
                                      {sqFt} ft²
                                    </td>
                                    <td className="p-1.5 font-sans font-bold text-slate-900">
                                      {getRecommendedNextUse(wMin, lMax, cadLang === 'ur')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
