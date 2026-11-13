'use client';

import React, { useRef, useState } from 'react';
import {
  Download,
  FlipHorizontal,
  Move,
  Plus,
  RefreshCw,
  Maximize2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SpecialBookmatchPartSpec {
  label: string;
  width: number;
  length: number;
  quantity: number;
  installZone: 'floor' | 'wall' | 'stairs' | 'counter';
  color: string;
  latakSides?:
    | 'none'
    | 'front_only'
    | 'front_and_one_side'
    | 'both_sides_only'
    | 'front_and_both_sides'
    | 'all_4_sides';
  latakSize?: number;
  latakCutMode?: 'bookmatch_attached' | 'random_separate';
}

interface BookmatchStudioPanelProps {
  slabLength: number;
  slabWidth: number;
  unit: string;
  slabImageUrl: string;
  cadLang: 'en' | 'ur';
  bookmatchMode: '2way_h' | '2way_v' | '4way_quad';
  setBookmatchMode: React.Dispatch<React.SetStateAction<'2way_h' | '2way_v' | '4way_quad'>>;
  bmPanelLength: number;
  setBmPanelLength: React.Dispatch<React.SetStateAction<number>>;
  bmPanelWidth: number;
  setBmPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  bmOffsetX: number;
  setBmOffsetX: React.Dispatch<React.SetStateAction<number>>;
  bmOffsetY: number;
  setBmOffsetY: React.Dispatch<React.SetStateAction<number>>;
  bmShowSeam: boolean;
  setBmShowSeam: React.Dispatch<React.SetStateAction<boolean>>;
  bmInvertMirror: boolean;
  setBmInvertMirror: React.Dispatch<React.SetStateAction<boolean>>;
  onDownloadBookmatchImage: () => void;
  onAddBookmatchToCutList: () => void;
  onAddSpecialBookmatchSet?: (partsToAdd: SpecialBookmatchPartSpec[], description: string) => void;
  toSqFt: (areaInUnitSq: number, u: any) => number;
}

export function BookmatchStudioPanel({
  slabLength,
  slabWidth,
  unit,
  slabImageUrl,
  cadLang,
  bookmatchMode,
  setBookmatchMode,
  bmPanelLength,
  setBmPanelLength,
  bmPanelWidth,
  setBmPanelWidth,
  bmOffsetX,
  setBmOffsetX,
  bmOffsetY,
  setBmOffsetY,
  bmShowSeam,
  setBmShowSeam,
  bmInvertMirror,
  setBmInvertMirror,
  onDownloadBookmatchImage,
  onAddBookmatchToCutList,
  onAddSpecialBookmatchSet,
  toSqFt,
}: BookmatchStudioPanelProps) {
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);
  const slabBoxRef = useRef<HTMLDivElement>(null);

  // Specialized Bookmatch System Mode:
  // 'standard_slab' = Standard 2-Way / 4-Way Slab Bookmatch
  // 'stair_riser' = Stair Step (ٹپہ) + Bookmatched Riser (رائزر بک میچ) Continuous Vein Fold
  // 'vanity_latak' = Vanity / Countertop + Bookmatched Front Drop Latak (وینٹی لٹک بک میچ)
  const [bmSystemType, setBmSystemType] = useState<'standard_slab' | 'stair_riser' | 'vanity_latak'>(
    'standard_slab'
  );

  // Stair + Riser / Latak Bookmatch state (Width First, Length Second!)
  const [stairStepWidth, setStairStepWidth] = useState<number>(12); // چوڑائی 12"
  const [stairRiserWidth, setStairRiserWidth] = useState<number>(3); // لٹک / رائزر چوڑائی 3" (یا 6")
  const [stairLength, setStairLength] = useState<number>(42); // لمبائی 42"
  const [stairStepsCount, setStairStepsCount] = useState<number>(14);
  const [stairLatakSides, setStairLatakSides] = useState<
    'front_only' | 'front_and_one_side' | 'both_sides_only' | 'front_and_both_sides' | 'all_4_sides'
  >('front_only');
  const [stairCutMode, setStairCutMode] = useState<'bookmatch_attached' | 'random_separate'>(
    'bookmatch_attached'
  );

  // Vanity / Kitchen / Cook Counter + Multi-Side Latak Bookmatch state (Width First, Length Second!)
  const [vanityTopWidth, setVanityTopWidth] = useState<number>(24); // ٹاپ چوڑائی 24"
  const [vanityLatakWidth, setVanityLatakWidth] = useState<number>(3); // لٹک چوڑائی 3"
  const [vanitySideWaterfall, setVanitySideWaterfall] = useState<boolean>(false);
  const [vanityLength, setVanityLength] = useState<number>(48); // لمبائی 48"
  const [vanitySetsCount, setVanitySetsCount] = useState<number>(1);
  const [vanityLatakSides, setVanityLatakSides] = useState<
    'front_only' | 'front_and_one_side' | 'both_sides_only' | 'front_and_both_sides' | 'all_4_sides'
  >('front_and_both_sides');
  const [vanityCutMode, setVanityCutMode] = useState<'bookmatch_attached' | 'random_separate'>(
    'bookmatch_attached'
  );

  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize';
    startClientX: number;
    startClientY: number;
    startCutX: number;
    startCutY: number;
    startCutW: number;
    startCutH: number;
  } | null>(null);

  const sLen = Math.max(1, Number(slabLength) || 110);
  const sWid = Math.max(1, Number(slabWidth) || 60);

  // Effective Cut Box on the Stock Slab depending on active Bookmatch System Type
  const activeCutLength =
    bmSystemType === 'stair_riser'
      ? Math.min(sLen, Math.max(4, stairLength))
      : bmSystemType === 'vanity_latak'
      ? Math.min(sLen, Math.max(4, vanityLength))
      : Math.min(sLen, Math.max(1, Number(bmPanelLength) || 52));

  const activeCutWidth =
    bmSystemType === 'stair_riser'
      ? Math.min(sWid, Math.max(4, stairStepWidth + stairRiserWidth))
      : bmSystemType === 'vanity_latak'
      ? Math.min(sWid, Math.max(4, vanityTopWidth + vanityLatakWidth))
      : Math.min(sWid, Math.max(1, Number(bmPanelWidth) || 28));

  const cutW = activeCutLength; // horizontal span along slab length
  const cutH = activeCutWidth; // vertical span along slab width
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
  const usedPct = totalSlabSqFt > 0 ? Math.min(100, (cutPieceSqFt / totalSlabSqFt) * 100) : 0;
  const remainingPct = Math.max(0, 100 - usedPct);

  const panelCount = bookmatchMode === '4way_quad' ? 4 : 2;
  const assembledLen = bookmatchMode === '2way_v' ? cutW : Number((cutW * 2).toFixed(1));
  const assembledWid = bookmatchMode === '2way_h' ? cutH : Number((cutH * 2).toFixed(1));

  // Exact CSS background crop percentages for the main cut rectangle
  const bgWidthPct = (sLen / Math.max(0.5, cutW)) * 100;
  const bgHeightPct = (sWid / Math.max(0.5, cutH)) * 100;
  const bgPosX = maxStartX > 0 ? (cutX / maxStartX) * 100 : 0;
  const bgPosY = maxStartY > 0 ? (cutY / maxStartY) * 100 : 0;

  // Interactive Pointer Drag / Resize directly on the Stock Slab Box
  const handlePointerDownOnSlab = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCutX: cutX,
      startCutY: cutY,
      startCutW: cutW,
      startCutH: cutH,
    });
  };

  const handlePointerMoveOnSlab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || !slabBoxRef.current) return;
    const rect = slabBoxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXUnits = ((e.clientX - dragState.startClientX) / rect.width) * sLen;
    const deltaYUnits = ((e.clientY - dragState.startClientY) / rect.height) * sWid;

    if (dragState.mode === 'move') {
      const nextCutX = Math.max(0, Math.min(maxStartX, dragState.startCutX + deltaXUnits));
      const nextCutY = Math.max(0, Math.min(maxStartY, dragState.startCutY + deltaYUnits));
      setBmOffsetX(maxStartX > 0 ? Math.round((nextCutX / maxStartX) * 100) : 0);
      setBmOffsetY(maxStartY > 0 ? Math.round((nextCutY / maxStartY) * 100) : 0);
    } else if (bmSystemType === 'standard_slab') {
      const maxAllowedW = Math.max(4, sLen - dragState.startCutX);
      const maxAllowedH = Math.max(4, sWid - dragState.startCutY);
      const nextW = Number(
        Math.max(4, Math.min(maxAllowedW, dragState.startCutW + deltaXUnits)).toFixed(1)
      );
      const nextH = Number(
        Math.max(4, Math.min(maxAllowedH, dragState.startCutH + deltaYUnits)).toFixed(1)
      );
      setBmPanelLength(nextW);
      setBmPanelWidth(nextH);
    }
  };

  const handlePointerUpOnSlab = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragState(null);
    }
  };

  return (
    <div
      className="p-4 md:p-5 space-y-5 bg-slate-950 text-white"
      dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
    >
      {/* Header + Pakistani Standard Notice (Width First, Length Second) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-bold mb-1">
            <span>
              {tr(
                'PAKISTANI MARBLE STANDARD: WIDTH FIRST × LENGTH SECOND (پہلے چوڑائی × بعد میں لمبائی)',
                'پاکستانی ماربل اصول: ہمیشہ پہلے چوڑائی (Width) اور بعد میں لمبائی (Length) لکھی گئی ہے'
              )}
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FlipHorizontal className="h-5 w-5 text-sky-400" />
            <span>
              {tr(
                'Bookmatch Studio: Floor/Wall + Stair Riser Bookmatch + Vanity Latak Bookmatch',
                'بک میچ اسٹوڈیو: فرش/دیوار بک میچ + سیڑھی رائزر بک میچ + وینٹی لٹک بک میچ'
              )}
            </span>
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadBookmatchImage}
            className="h-8 px-3 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-sky-400" />
            <span>{tr('Download Bookmatch PNG', 'بک میچ تصویر ڈاؤن لوڈ')}</span>
          </button>
        </div>
      </div>

      {/* 3-MODE BOOKMATCH SYSTEM SWITCHER:
          1. Floor / Wall Slab Bookmatch
          2. Stair Step + Riser Vein-Match (سیڑھی + رائزر بک میچ)
          3. Vanity Top + Front Latak Bookmatch (وینٹی + لٹک بک میچ) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setBmSystemType('standard_slab')}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            bmSystemType === 'standard_slab'
              ? 'border-sky-500 bg-sky-950/50 text-white shadow-md'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold text-sky-400 uppercase font-mono">
            {tr('MODE 1 · FLOOR / WALL BOOKMATCH', 'موڈ 1 · فرش اور دیوار کا بک میچ')}
          </div>
          <div className="text-sm font-bold mt-0.5">
            {tr('Full Slab or Custom Piece Bookmatch', 'فل سلیب یا مرضی کے پیس کا بک میچ')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {tr('2-Way Left/Right, Top/Bottom or 4-Way Diamond', 'پوری سلیب یا چھوٹے پیس کا ڈائمنڈ بک میچ')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setBmSystemType('stair_riser')}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            bmSystemType === 'stair_riser'
              ? 'border-amber-500 bg-amber-950/40 text-white shadow-md'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold text-amber-400 uppercase font-mono">
            {tr('MODE 2 · STAIR + RISER BOOKMATCH', 'موڈ 2 · سیڑھی ٹپہ + رائزر بک میچ سسٹم')}
          </div>
          <div className="text-sm font-bold mt-0.5">
            {tr('Stair Step + Contiguous Riser Vein-Match', 'سیڑھی کے ساتھ رائزر کی رگیں ملانا (Bookmatch)')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {tr(
              'Cuts Step & Riser side-by-side so veins flow down across the step & riser',
              'ٹپہ اور رائزر سلیب سے ایک ساتھ کٹتے ہیں تاکہ رگیں اوپر سے نیچے بالکل ملیں'
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setBmSystemType('vanity_latak')}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            bmSystemType === 'vanity_latak'
              ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-bold text-emerald-400 uppercase font-mono">
            {tr('MODE 3 · VANITY + LATAK BOOKMATCH', 'موڈ 3 · وینٹی ٹاپ + لٹک بک میچ سسٹم')}
          </div>
          <div className="text-sm font-bold mt-0.5">
            {tr('Vanity Countertop + Front Drop Latak Bookmatch', 'وینٹی ٹاپ کے ساتھ فرنٹ لٹک بک میچ')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {tr(
              'Cuts Vanity Top & Front Drop Apron (لٹک) together for seamless 45° miter vein fold',
              'وینٹی ٹاپ اور سامنے کی لٹک پٹی ایک ساتھ کٹتی ہیں تاکہ رگوں کا جوڑ بالکل ملے'
            )}
          </div>
        </button>
      </div>

      {/* =======================================================================
          CONTROLS FOR MODE 1: STANDARD SLAB / CUSTOM PIECE BOOKMATCH (W × L)
         ======================================================================= */}
      {bmSystemType === 'standard_slab' && (
        <div className="rounded-lg border border-sky-500/40 bg-slate-900 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-300">
              {tr(
                `Select Cut Piece Size (Width × Length) on ${sWid} × ${sLen} ${unit} Stock Slab:`,
                `اسٹاک سلیب (چوڑائی ${sWid} × لمبائی ${sLen} ${unit}) میں سے پیس کا سائز منتخب کریں:`
              )}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBmPanelWidth(sWid);
                  setBmPanelLength(sLen);
                  setBmOffsetX(0);
                  setBmOffsetY(0);
                }}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  cutW === sLen && cutH === sWid
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tr(`Full Slab (${sWid}×${sLen})`, `فل سلیب (${sWid}×${sLen})`)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBmPanelWidth(sWid);
                  setBmPanelLength(Number((sLen / 2).toFixed(1)));
                  setBmOffsetX(0);
                  setBmOffsetY(0);
                }}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  Math.abs(cutW - sLen / 2) < 1 && cutH === sWid
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tr(
                  `Half Slab (${sWid}×${Number((sLen / 2).toFixed(1))})`,
                  `آدھی سلیب (${sWid}×${Number((sLen / 2).toFixed(1))})`
                )}
              </button>
              {[
                { w: 36, l: 60, label: '36×60 (W×L)' },
                { w: 28, l: 52, label: '28×52 (W×L)' },
                { w: 24, l: 48, label: '24×48 (W×L)' },
                { w: 24, l: 36, label: '24×36 (W×L)' },
                { w: 24, l: 24, label: '24×24 (W×L)' },
              ].map((sz) => (
                <button
                  key={sz.label}
                  type="button"
                  onClick={() => {
                    setBmPanelWidth(Math.min(sWid, sz.w));
                    setBmPanelLength(Math.min(sLen, sz.l));
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                    cutH === sz.w && cutW === sz.l
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Size Inputs: WIDTH FIRST, LENGTH SECOND */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800 items-end">
            <div className="lg:col-span-2">
              <Label className="text-[11px] font-bold text-amber-300 block mb-1">
                {tr(`1. Width First (${unit})`, `1. پہلے چوڑائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sWid}
                value={bmPanelWidth}
                onChange={(e) =>
                  setBmPanelWidth(Math.min(sWid, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-9 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div className="lg:col-span-2">
              <Label className="text-[11px] font-bold text-sky-300 block mb-1">
                {tr(`2. Length Second (${unit})`, `2. بعد میں لمبائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sLen}
                value={bmPanelLength}
                onChange={(e) =>
                  setBmPanelLength(Math.min(sLen, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-9 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div className="lg:col-span-4">
              <Label className="text-[11px] text-slate-300 block mb-1">
                {tr('Bookmatch Mirror Mode', 'بک میچ جوڑنے کا انداز')}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBookmatchMode('2way_h')}
                  className={`h-9 px-2 rounded border text-xs font-bold transition-colors ${
                    bookmatchMode === '2way_h'
                      ? 'border-sky-400 bg-sky-600 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  2-Way (A | B)
                </button>
                <button
                  type="button"
                  onClick={() => setBookmatchMode('2way_v')}
                  className={`h-9 px-2 rounded border text-xs font-bold transition-colors ${
                    bookmatchMode === '2way_v'
                      ? 'border-sky-400 bg-sky-600 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  2-Way (A / B)
                </button>
                <button
                  type="button"
                  onClick={() => setBookmatchMode('4way_quad')}
                  className={`h-9 px-2 rounded border text-xs font-bold transition-colors ${
                    bookmatchMode === '4way_quad'
                      ? 'border-sky-400 bg-sky-600 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  4-Way Diamond
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex gap-1.5">
              <button
                type="button"
                onClick={() => setBmInvertMirror((v) => !v)}
                className="h-9 px-2.5 rounded border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
                <span>{bmInvertMirror ? tr('Outer Vein', 'باہر رگیں') : tr('Center Vein', 'درمیان رگیں')}</span>
              </button>
              <button
                type="button"
                onClick={onAddBookmatchToCutList}
                className="flex-1 h-9 px-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  {tr(
                    `Add ${panelCount} Panels (${cutH}×${cutW})`,
                    `${panelCount} بک میچ پیس (${cutH}×${cutW}) شامل کریں`
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          CONTROLS FOR MODE 2: STAIR STEP + RISER / LATAK VEIN-MATCH SYSTEM (سیڑھی + لٹک/رائزر بک میچ)
         ======================================================================= */}
      {bmSystemType === 'stair_riser' && (
        <div className="rounded-lg border-2 border-amber-500/50 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-bold text-amber-300">
                {tr(
                  'Stair Step (ٹپہ) + Latak / Riser (لٹک / رائزر) — Bookmatch vs Random Cutting System',
                  'سیڑھی کا ٹپہ + لٹک / رائزر سسٹم (بک میچ ساتھ کٹے یا رینڈم الگ کٹے)'
                )}
              </h5>
              <p className="text-xs text-slate-300">
                {tr(
                  'Choose which sides of the step have Latak/Riser (Front only, Front + 1 Side, Front + Both Sides, or All 4 Sides), set exact inches (e.g. 3" or 6"), and toggle Bookmatch (cuts right next to step) vs Random Cut.',
                  'سیڑھی کے ٹپے کے ساتھ کتنے انچ کی لٹک یا رائزر (مثلاً 3 انچ یا 6 انچ) اور کن سائیڈوں پر لگنی ہے منتخب کریں، اور بٹن سے طے کریں کہ بک میچ (ٹپے کے بالکل ساتھ جڑ کر) کٹے یا رینڈم الگ کٹے۔'
                )}
              </p>
            </div>
          </div>

          {/* Sides + Bookmatch vs Random System Buttons */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
            <div className="lg:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-amber-300 block">
                {tr('Select Step Latak / Riser Sides:', 'سٹیپ کی کن سائیڈوں کی لٹک کٹنی ہے:')}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'front_only', en: 'Front Only', ur: 'صرف فرنٹ' },
                    { id: 'front_and_one_side', en: 'Front + 1 Side', ur: 'فرنٹ + 1 سائیڈ' },
                    { id: 'both_sides_only', en: 'Both Sides', ur: 'دونوں سائیڈیں' },
                    { id: 'front_and_both_sides', en: 'Front + 2 Sides', ur: 'فرنٹ + 2 سائیڈ' },
                    { id: 'all_4_sides', en: 'All 4 Sides', ur: 'چاروں سائیڈیں' },
                  ] as const
                ).map((sOpt) => (
                  <button
                    key={sOpt.id}
                    type="button"
                    onClick={() => setStairLatakSides(sOpt.id)}
                    className={`h-8 px-2 rounded border text-[11px] font-bold transition-colors ${
                      stairLatakSides === sOpt.id
                        ? 'border-amber-400 bg-amber-500 text-slate-950 shadow'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {tr(sOpt.en, sOpt.ur)}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-sky-300 block">
                {tr('Cutting System Mode (بک میچ یا رینڈم بٹن):', 'کٹنگ سسٹم بٹن (بک میچ ساتھ یا رینڈم الگ):')}
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStairCutMode('bookmatch_attached')}
                  className={`h-8 px-2.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    stairCutMode === 'bookmatch_attached'
                      ? 'border-amber-400 bg-amber-500 text-slate-950 shadow'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🔗</span>
                  <span>{tr('Bookmatch (ساتھ کٹے)', 'بک میچ (ساتھ کٹے)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStairCutMode('random_separate')}
                  className={`h-8 px-2.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    stairCutMode === 'random_separate'
                      ? 'border-purple-400 bg-purple-600 text-white shadow'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🎲</span>
                  <span>{tr('Random Cut (الگ کٹے)', 'رینڈم (الگ کٹے)')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end pt-2 border-t border-slate-800">
            <div>
              <Label className="text-[11px] font-bold text-amber-300 block mb-1">
                {tr(`1. Step Width (${unit})`, `1. ٹپہ چوڑائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sWid}
                value={stairStepWidth}
                onChange={(e) => setStairStepWidth(Math.max(0, Number(e.target.value)))}
                className="h-9 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-emerald-300 block mb-1">
                {tr(`2. Latak/Riser Inches (${unit})`, `2. لٹک/رائزر کتنے انچ (${unit})`)}
              </Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  min="1"
                  max={sWid}
                  value={stairRiserWidth}
                  onChange={(e) => setStairRiserWidth(Math.max(0, Number(e.target.value)))}
                  className="h-9 bg-slate-950 border-emerald-500/60 text-white font-mono text-xs font-bold"
                />
                {[3, 4, 6].map((pIn) => (
                  <button
                    key={pIn}
                    type="button"
                    onClick={() => setStairRiserWidth(pIn)}
                    className={`h-9 px-2 rounded border text-xs font-mono font-bold ${
                      stairRiserWidth === pIn
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {pIn}&quot;
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-sky-300 block mb-1">
                {tr(`3. Stair Length (${unit})`, `3. سیڑھی لمبائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sLen}
                value={stairLength}
                onChange={(e) => setStairLength(Math.min(sLen, Math.max(0, Number(e.target.value))))}
                className="h-9 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-200 block mb-1">
                {tr('Total Steps Qty', 'کل ٹپوں کی تعداد')}
              </Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={stairStepsCount}
                onChange={(e) => setStairStepsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-9 bg-slate-950 border-slate-700 text-white font-mono text-xs font-bold"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onAddSpecialBookmatchSet?.(
                  [
                    {
                      label: `Stair Step (${stairStepWidth}×${stairLength})`,
                      width: stairStepWidth,
                      length: stairLength,
                      quantity: stairStepsCount,
                      installZone: 'stairs',
                      color: '#0284C7',
                      latakSides: stairLatakSides,
                      latakSize: stairRiserWidth,
                      latakCutMode: stairCutMode,
                    },
                  ],
                  `${stairStepsCount} Stair Steps (${stairStepWidth}×${stairLength}) + ${stairRiserWidth}" Latak/Riser (${stairCutMode === 'bookmatch_attached' ? 'Bookmatch Attached' : 'Random Cut'})`
                );
              }}
              className="h-9 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="h-4 w-4" />
              <span>
                {tr(
                  `Add ${stairStepsCount} Steps + ${stairRiserWidth}" Latak`,
                  `${stairStepsCount} ٹپے + ${stairRiserWidth}" لٹک لسٹ میں ڈالیں`
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          CONTROLS FOR MODE 3: VANITY / KITCHEN / COOK COUNTER + LATAK BOOKMATCH
         ======================================================================= */}
      {bmSystemType === 'vanity_latak' && (
        <div className="rounded-lg border-2 border-emerald-500/50 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-sm font-bold text-emerald-300">
                {tr(
                  'Vanity Top / Kitchen Counter / Cook Counter + Multi-Side Latak System',
                  'وینٹی ٹاپ / کچن ٹاپ / کوک کاؤنٹر + لٹک بک میچ اور رینڈم سسٹم'
                )}
              </h5>
              <p className="text-xs text-slate-300">
                {tr(
                  'Choose 1 Side (Front), 2 Sides (Front+1 Side or Left+Right), 3 Sides (Front+Both Sides), or All 4 Sides (Cook Counter / Island), set Latak inches (e.g. 3"), and toggle Bookmatch (cuts attached to piece) vs Random Cut.',
                  'وینٹی، کچن ٹاپ یا کوک کاؤنٹر کے لیے منتخب کریں کہ لٹک صرف فرنٹ کی کٹنی ہے، دونوں سائیڈوں کی، تین سائیڈوں کی یا چاروں سائیڈوں کی — اور بٹن سے طے کریں کہ بک میچ (پیس کے بالکل ساتھ) کٹے یا رینڈم۔'
                )}
              </p>
            </div>
          </div>

          {/* Sides + Bookmatch vs Random System Buttons */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
            <div className="lg:col-span-7 space-y-1">
              <Label className="text-[11px] font-bold text-emerald-300 block">
                {tr('Select Counter Latak Sides:', 'وینٹی / کچن / کاؤنٹر کی کن سائیڈوں کی لٹک کٹنی ہے:')}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'front_only', en: '1: Front Only', ur: 'صرف فرنٹ' },
                    { id: 'front_and_one_side', en: '2: Front+1 Side', ur: 'فرنٹ + 1 سائیڈ' },
                    { id: 'both_sides_only', en: '2: Both Sides', ur: 'دونوں سائیڈیں' },
                    { id: 'front_and_both_sides', en: '3: Front+2 Sides', ur: 'فرنٹ + دونوں سائیڈ' },
                    { id: 'all_4_sides', en: '4: All 4 Sides', ur: 'چاروں سائیڈیں (آئی لینڈ)' },
                  ] as const
                ).map((sOpt) => (
                  <button
                    key={sOpt.id}
                    type="button"
                    onClick={() => setVanityLatakSides(sOpt.id)}
                    className={`h-8 px-2 rounded border text-[11px] font-bold transition-colors ${
                      vanityLatakSides === sOpt.id
                        ? 'border-emerald-400 bg-emerald-600 text-white shadow'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {tr(sOpt.en, sOpt.ur)}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-1">
              <Label className="text-[11px] font-bold text-sky-300 block">
                {tr('Cutting System Mode (بک میچ یا رینڈم بٹن):', 'کٹنگ سسٹم بٹن (بک میچ ساتھ یا رینڈم الگ):')}
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setVanityCutMode('bookmatch_attached')}
                  className={`h-8 px-2.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    vanityCutMode === 'bookmatch_attached'
                      ? 'border-amber-400 bg-amber-500 text-slate-950 shadow'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🔗</span>
                  <span>{tr('Bookmatch (ساتھ کٹے)', 'بک میچ (ساتھ کٹے)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVanityCutMode('random_separate')}
                  className={`h-8 px-2.5 rounded border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    vanityCutMode === 'random_separate'
                      ? 'border-purple-400 bg-purple-600 text-white shadow'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🎲</span>
                  <span>{tr('Random Cut (الگ کٹے)', 'رینڈم (الگ کٹے)')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end pt-2 border-t border-slate-800">
            <div>
              <Label className="text-[11px] font-bold text-amber-300 block mb-1">
                {tr(`1. Top Width (${unit})`, `1. ٹاپ چوڑائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sWid}
                value={vanityTopWidth}
                onChange={(e) => setVanityTopWidth(Math.max(0, Number(e.target.value)))}
                className="h-9 bg-slate-950 border-amber-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-emerald-300 block mb-1">
                {tr(`2. Latak Inches (${unit})`, `2. لٹک کتنے انچ (${unit})`)}
              </Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  min="1"
                  max={sWid}
                  value={vanityLatakWidth}
                  onChange={(e) => setVanityLatakWidth(Math.max(0, Number(e.target.value)))}
                  className="h-9 bg-slate-950 border-emerald-500/60 text-white font-mono text-xs font-bold"
                />
                {[3, 4, 6].map((pIn) => (
                  <button
                    key={pIn}
                    type="button"
                    onClick={() => setVanityLatakWidth(pIn)}
                    className={`h-9 px-1.5 rounded border text-xs font-mono font-bold ${
                      vanityLatakWidth === pIn
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {pIn}&quot;
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-sky-300 block mb-1">
                {tr(`3. Top Length (${unit})`, `3. ٹاپ لمبائی (${unit})`)}
              </Label>
              <Input
                type="number"
                min="1"
                max={sLen}
                value={vanityLength}
                onChange={(e) =>
                  setVanityLength(Math.min(sLen, Math.max(0, Number(e.target.value))))
                }
                className="h-9 bg-slate-950 border-sky-500/60 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-200 block mb-1">
                {tr('Sets Qty', 'تعداد')}
              </Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={vanitySetsCount}
                onChange={(e) => setVanitySetsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-9 bg-slate-950 border-slate-700 text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-300 block mb-1">
                {tr('Side Waterfall', 'فل سائیڈ واٹر فال')}
              </Label>
              <button
                type="button"
                onClick={() => setVanitySideWaterfall((v) => !v)}
                className={`w-full h-9 px-2 rounded border text-xs font-bold transition-colors ${
                  vanitySideWaterfall
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                {vanitySideWaterfall
                  ? tr('Side Drop: ON (32")', 'واٹر فال: آن')
                  : tr('Standard Latak', 'صرف لٹک پٹیاں')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const items: SpecialBookmatchPartSpec[] = [
                  {
                    label: `Counter/Vanity Top (${vanityTopWidth}×${vanityLength})`,
                    width: vanityTopWidth,
                    length: vanityLength,
                    quantity: vanitySetsCount,
                    installZone: 'counter',
                    color: '#0284C7',
                    latakSides: vanityLatakSides,
                    latakSize: vanityLatakWidth,
                    latakCutMode: vanityCutMode,
                  },
                ];
                if (vanitySideWaterfall) {
                  items.push({
                    label: `Side Waterfall Drop (سائیڈ واٹر فال ${vanityTopWidth}×32)`,
                    width: vanityTopWidth,
                    length: 32,
                    quantity: vanitySetsCount * 2,
                    installZone: 'counter',
                    color: '#7C3AED',
                  });
                }
                onAddSpecialBookmatchSet?.(
                  items,
                  `${vanitySetsCount} Counter/Vanity Top (${vanityTopWidth}×${vanityLength}) + ${vanityLatakWidth}" Latak (${vanityLatakSides})`
                );
              }}
              className="h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="h-4 w-4" />
              <span>
                {tr('Add Top + Latak to Cut List', 'ٹاپ + لٹک کٹنگ لسٹ میں ڈالیں')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE VIEW:
          LEFT = Separate Stock Slab with Draggable Marked Cut Piece Box (W × L)
          RIGHT = Separate Assembled Bookmatch / Stair+Riser / Vanity+Latak Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL (6 cols): Stock Slab with Interactive Marked Cut Piece */}
        <div className="lg:col-span-6 rounded-lg border-2 border-sky-500/50 bg-slate-900 p-4 space-y-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <div className="inline-block px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-mono font-bold uppercase mb-1">
                {tr('VIEW 1 · STOCK SLAB & PIECE MARKING', 'منظر 1 · اسٹاک سلیب اور کٹنے والے پیس کا نشان')}
              </div>
              <h5 className="text-sm font-bold text-white">
                {tr(
                  `Stock Slab (Width ${sWid} × Length ${sLen} ${unit}) — Drag Box Over Veins`,
                  `اسٹاک سلیب (چوڑائی ${sWid} × لمبائی ${sLen} ${unit}) — نیلے باکس کو ماؤس سے پکڑ کر رگوں پر سیٹ کریں`
                )}
              </h5>
            </div>
            <span className="px-2.5 py-1 rounded bg-sky-950 border border-sky-400/60 text-sky-300 font-mono text-xs font-bold">
              {tr('Marked (W×L):', 'منتخب سائز (چوڑائی×لمبائی):')} {cutH} × {cutW} {unit}
            </span>
          </div>

          {/* Interactive Stock Slab Viewport */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
              <span className="text-amber-300">
                ↕ {tr('SLAB WIDTH (چوڑائی):', 'سلیب چوڑائی (Width):')} {sWid} {unit}
              </span>
              <span className="text-sky-300">
                ↔ {tr('SLAB LENGTH (لمبائی):', 'سلیب لمبائی (Length):')} {sLen} {unit}
              </span>
            </div>

            <div
              ref={slabBoxRef}
              onPointerMove={handlePointerMoveOnSlab}
              onPointerUp={handlePointerUpOnSlab}
              className="relative w-full overflow-hidden rounded-lg border-2 border-slate-500 bg-slate-950 select-none touch-none shadow-inner"
              style={{
                aspectRatio: `${sLen} / ${sWid}`,
              }}
            >
              {/* Full Stock Slab Photo */}
              <div
                className="absolute inset-0 bg-no-repeat bg-center opacity-40 pointer-events-none"
                style={{
                  backgroundImage: `url("${slabImageUrl}")`,
                  backgroundSize: '100% 100%',
                }}
              />

              {/* Remaining Right Offcut Label (W × L) */}
              {rightRemLen > 0 && (
                <div
                  className="absolute top-0 bottom-0 border-l border-dashed border-amber-400/80 bg-amber-950/30 flex items-center justify-center p-1 pointer-events-none"
                  style={{
                    left: `${((cutX + cutW) / sLen) * 100}%`,
                    width: `${(rightRemLen / sLen) * 100}%`,
                  }}
                >
                  <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/50 text-[10px] font-mono font-bold text-amber-300 text-center">
                    <div>{tr('REMAINING (W×L)', 'باقی سلیب (چوڑائی×لمبائی)')}</div>
                    <div>
                      {sWid} × {rightRemLen} {unit}
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining Bottom Offcut Label (W × L) */}
              {bottomRemWid > 0 && (
                <div
                  className="absolute border-t border-dashed border-emerald-400/80 bg-emerald-950/30 flex items-center justify-center p-1 pointer-events-none"
                  style={{
                    left: `${(cutX / sLen) * 100}%`,
                    top: `${((cutY + cutH) / sWid) * 100}%`,
                    width: `${(cutW / sLen) * 100}%`,
                    height: `${(bottomRemWid / sWid) * 100}%`,
                  }}
                >
                  <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-emerald-500/50 text-[10px] font-mono font-bold text-emerald-300 text-center">
                    {tr('REM (W×L):', 'بچت (چوڑائی×لمبائی):')} {bottomRemWid} × {cutW} {unit}
                  </div>
                </div>
              )}

              {/* DRAGGABLE & RESIZABLE MARKED CUT PIECE BOX ON THE STOCK SLAB */}
              <div
                onPointerDown={(e) => handlePointerDownOnSlab(e, 'move')}
                className="absolute border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] cursor-move group overflow-hidden"
                style={{
                  left: `${(cutX / sLen) * 100}%`,
                  top: `${(cutY / sWid) * 100}%`,
                  width: `${(cutW / sLen) * 100}%`,
                  height: `${(cutH / sWid) * 100}%`,
                }}
              >
                {/* 100% Crisp Stone Texture inside the Marked Cut Box */}
                <div
                  className="w-full h-full bg-no-repeat pointer-events-none"
                  style={{
                    backgroundImage: `url("${slabImageUrl}")`,
                    backgroundSize: `${bgWidthPct}% ${bgHeightPct}%`,
                    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                  }}
                />

                {/* When Stair + Riser or Vanity + Latak mode is active, show the internal fold/cut line separating Step/Top from Riser/Latak! */}
                {bmSystemType === 'stair_riser' && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-amber-400 pointer-events-none flex items-end justify-between px-2 pb-0.5"
                    style={{
                      top: 0,
                      height: `${(stairStepWidth / Math.max(1, cutH)) * 100}%`,
                    }}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-slate-950/85 text-amber-300 font-mono text-[9px] font-bold">
                      STEP (ٹپہ): {stairStepWidth} × {stairLength} {unit} (W×L)
                    </span>
                  </div>
                )}
                {bmSystemType === 'stair_riser' && (
                  <div
                    className="absolute left-0 right-0 bottom-0 pointer-events-none flex items-center justify-between px-2"
                    style={{
                      height: `${(stairRiserWidth / Math.max(1, cutH)) * 100}%`,
                    }}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-amber-600/95 text-slate-950 font-mono text-[9px] font-bold">
                      RISER BM (رائزر بک میچ): {stairRiserWidth} × {stairLength} {unit} (W×L)
                    </span>
                  </div>
                )}

                {bmSystemType === 'vanity_latak' && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-emerald-400 pointer-events-none flex items-end justify-between px-2 pb-0.5"
                    style={{
                      top: 0,
                      height: `${(vanityTopWidth / Math.max(1, cutH)) * 100}%`,
                    }}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-slate-950/85 text-sky-300 font-mono text-[9px] font-bold">
                      VANITY TOP (ٹاپ): {vanityTopWidth} × {vanityLength} {unit} (W×L)
                    </span>
                  </div>
                )}
                {bmSystemType === 'vanity_latak' && (
                  <div
                    className="absolute left-0 right-0 bottom-0 pointer-events-none flex items-center justify-between px-2"
                    style={{
                      height: `${(vanityLatakWidth / Math.max(1, cutH)) * 100}%`,
                    }}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/95 text-slate-950 font-mono text-[9px] font-bold">
                      FRONT LATAK BM (فرنٹ لٹک): {vanityLatakWidth} × {vanityLength} {unit} (W×L)
                    </span>
                  </div>
                )}

                {/* Top-Left Piece Size & Position Callout Badge (Width × Length) */}
                {bmSystemType === 'standard_slab' && (
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-sky-600/95 border border-white/40 text-white font-mono text-[11px] font-bold shadow flex items-center gap-1 pointer-events-none">
                    <Move className="h-3 w-3" />
                    <span>
                      {tr('W×L:', 'چوڑائی×لمبائی:')} {cutH} × {cutW} {unit} ({cutPieceSqFt.toFixed(1)} ft²)
                    </span>
                  </div>
                )}

                {/* Bottom-Right Interactive Corner Resize Handle */}
                {bmSystemType === 'standard_slab' && (
                  <div
                    onPointerDown={(e) => handlePointerDownOnSlab(e, 'resize')}
                    className="absolute bottom-0 right-0 h-6 w-6 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-tl-md flex items-center justify-center cursor-nwse-resize shadow-md border-t border-l border-white"
                    title="Drag corner to resize piece on slab"
                  >
                    <Maximize2 className="h-3.5 w-3.5 rotate-90" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sliders for fine X/Y adjustment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>
                  {tr('Move Along Width (چوڑائی رخ Y):', 'چوڑائی کے رخ پر سرکائیں (Y):')} {cutY} {unit}
                </span>
                <span className="text-emerald-300">
                  {tr('Rem W:', 'باقی چوڑائی:')} {topRemWid} | {bottomRemWid} {unit}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                disabled={maxStartY <= 0}
                value={bmOffsetY}
                onChange={(e) => setBmOffsetY(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>
                  {tr('Move Along Length (لمبائی رخ X):', 'لمبائی کے رخ پر سرکائیں (X):')} {cutX} {unit}
                </span>
                <span className="text-sky-300">
                  {tr('Rem L:', 'باقی لمبائی:')} {leftRemLen} | {rightRemLen} {unit}
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
          </div>

          {/* Summary Box (Width × Length) */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono text-xs">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">
                {tr('Full Slab (W×L)', 'مکمل سلیب (چوڑائی×لمبائی)')}
              </div>
              <div className="font-bold text-white">
                {sWid} × {sLen} ({totalSlabSqFt.toFixed(1)} ft²)
              </div>
            </div>
            <div className="p-2 rounded bg-sky-950/40 border border-sky-500/40">
              <div className="text-[10px] text-sky-300">
                {tr('Cut Piece (W×L)', 'کٹنے والا پیس (چوڑائی×لمبائی)')}
              </div>
              <div className="font-bold text-sky-300">
                {cutH} × {cutW} ({cutPieceSqFt.toFixed(1)} ft²)
              </div>
            </div>
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40">
              <div className="text-[10px] text-emerald-300">{tr('Remaining Stone', 'باقی بچت پتھر')}</div>
              <div className="font-bold text-emerald-300">
                {remainingSqFt.toFixed(1)} ft² ({remainingPct.toFixed(0)}%)
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (6 cols): Separate Live Bookmatch Result */}
        <div className="lg:col-span-6 rounded-lg border-2 border-emerald-500/50 bg-slate-900 p-4 space-y-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <div className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase mb-1">
                {tr('VIEW 2 · SEPARATE BOOKMATCH RESULT', 'منظر 2 · منتخب پیس کا الگ بک میچ ڈیزائن')}
              </div>
              <h5 className="text-sm font-bold text-white">
                {bmSystemType === 'stair_riser'
                  ? tr(
                      `Stair Step (${stairStepWidth}×${stairLength}) + Bookmatched Riser (${stairRiserWidth}×${stairLength}) Vein Flow`,
                      `سیڑھی ٹپہ (${stairStepWidth}×${stairLength}) + بک میچ رائزر (${stairRiserWidth}×${stairLength}) کی ملتی ہوئی رگیں`
                    )
                  : bmSystemType === 'vanity_latak'
                  ? tr(
                      `Vanity Top (${vanityTopWidth}×${vanityLength}) + Front Latak (${vanityLatakWidth}×${vanityLength}) Miter Fold`,
                      `وینٹی ٹاپ (${vanityTopWidth}×${vanityLength}) + فرنٹ لٹک (${vanityLatakWidth}×${vanityLength}) بک میچ جوڑ`
                    )
                  : tr(
                      `Live Bookmatch of ${cutH} × ${cutW} ${unit} (W×L) Piece`,
                      `منتخب پیس (چوڑائی ${cutH} × لمبائی ${cutW} ${unit}) سے بننے والا بک میچ`
                    )}
              </h5>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-400/60 text-emerald-300 font-mono text-xs font-bold">
              {bmSystemType === 'standard_slab'
                ? `${tr('Total (W×L):', 'کل سائز (چوڑائی×لمبائی):')} ${assembledWid} × ${assembledLen} ${unit}`
                : `${cutH} × ${cutW} ${unit} (W×L)`}
            </span>
          </div>

          {/* PREVIEW FOR MODE 1: STANDARD 2-WAY / 4-WAY BOOKMATCH */}
          {bmSystemType === 'standard_slab' && (
            <div
              className={`w-full mx-auto overflow-hidden rounded-lg border-2 border-slate-600 shadow-2xl bg-slate-950 grid ${
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
                    { id: 'Slab A (Top Piece)', col: 0, row: 0 },
                    { id: 'Slab B (Bottom Mirror)', col: 0, row: 1 },
                  ]
                : [
                    { id: 'Slab A (Left Piece)', col: 0, row: 0 },
                    { id: 'Slab B (Right Mirror)', col: 1, row: 0 },
                  ]
              ).map((quad) => {
                const flipX = bmInvertMirror ? quad.col === 0 : quad.col === 1;
                const flipY =
                  bmInvertMirror ? quad.row === 0 && bookmatchMode !== '2way_h' : quad.row === 1;

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
                      {quad.id} · W:{cutH} × L:{cutW} {unit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREVIEW FOR MODE 2: STAIR STEP + RISER CONTINUOUS VEIN-MATCH */}
          {bmSystemType === 'stair_riser' && (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-amber-500/60 bg-slate-950 p-4 space-y-1">
                <div className="text-xs font-mono text-amber-300 font-bold mb-2">
                  {tr(
                    '90° Stair Tread + Riser Continuous Vein Fold Preview (ٹپہ اور رائزر کا جوڑ):',
                    'سیڑھی کا ٹپہ اور اس کے نیچے جڑا ہوا بک میچ رائزر (مسلسل رگوں کا بہاؤ):'
                  )}
                </div>

                {/* Top Part: Stair Step Tread */}
                <div
                  className="relative w-full overflow-hidden rounded-t-md border-2 border-sky-400"
                  style={{
                    aspectRatio: `${stairLength} / ${stairStepWidth}`,
                  }}
                >
                  <div
                    className="w-full h-full bg-no-repeat"
                    style={{
                      backgroundImage: `url("${slabImageUrl}")`,
                      backgroundSize: `${(sLen / Math.max(1, stairLength)) * 100}% ${
                        (sWid / Math.max(1, stairStepWidth)) * 100
                      }%`,
                      backgroundPosition: `${bgPosX}% ${
                        sWid - stairStepWidth > 0 ? (cutY / (sWid - stairStepWidth)) * 100 : 0
                      }%`,
                    }}
                  />
                  <div className="absolute top-1.5 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-sky-400 text-[10px] font-mono font-bold text-sky-300">
                    1. STAIR STEP (سیڑھی ٹپہ) — Width: {stairStepWidth} × Length: {stairLength} {unit}
                  </div>
                </div>

                {/* 90° Miter Fold Joint Indicator */}
                <div className="py-1 px-2 bg-amber-500/20 border-y border-dashed border-amber-400 text-[10px] font-mono font-bold text-amber-300 text-center">
                  ▼ 90° NOSING / MITER FOLD JOINT (یہاں سے رگ مڑ کر سیدھی رائزر پر اترتی ہے) ▼
                </div>

                {/* Bottom Part: Bookmatched Stair Riser */}
                <div
                  className="relative w-full overflow-hidden rounded-b-md border-2 border-amber-400 brightness-90"
                  style={{
                    aspectRatio: `${stairLength} / ${stairRiserWidth}`,
                  }}
                >
                  <div
                    className="w-full h-full bg-no-repeat"
                    style={{
                      backgroundImage: `url("${slabImageUrl}")`,
                      backgroundSize: `${(sLen / Math.max(1, stairLength)) * 100}% ${
                        (sWid / Math.max(1, stairRiserWidth)) * 100
                      }%`,
                      backgroundPosition: `${bgPosX}% ${
                        sWid - stairRiserWidth > 0
                          ? ((cutY + stairStepWidth) / (sWid - stairRiserWidth)) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-amber-400 text-[10px] font-mono font-bold text-amber-300">
                    2. BOOKMATCHED RISER (بک میچ رائزر) — Width: {stairRiserWidth} × Length: {stairLength} {unit}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW FOR MODE 3: VANITY TOP + FRONT LATAK BOOKMATCH */}
          {bmSystemType === 'vanity_latak' && (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-emerald-500/60 bg-slate-950 p-4 space-y-1">
                <div className="text-xs font-mono text-emerald-300 font-bold mb-2">
                  {tr(
                    '45° Mitered Vanity Countertop + Front Drop Latak Bookmatch Preview:',
                    'وینٹی ٹاپ اور اس کے سامنے 45° کلم جوڑ والی بک میچ لٹک (Front Latak):'
                  )}
                </div>

                {/* Top Surface: Vanity Countertop */}
                <div
                  className="relative w-full overflow-hidden rounded-t-md border-2 border-sky-400"
                  style={{
                    aspectRatio: `${vanityLength} / ${vanityTopWidth}`,
                  }}
                >
                  <div
                    className="w-full h-full bg-no-repeat"
                    style={{
                      backgroundImage: `url("${slabImageUrl}")`,
                      backgroundSize: `${(sLen / Math.max(1, vanityLength)) * 100}% ${
                        (sWid / Math.max(1, vanityTopWidth)) * 100
                      }%`,
                      backgroundPosition: `${bgPosX}% ${
                        sWid - vanityTopWidth > 0 ? (cutY / (sWid - vanityTopWidth)) * 100 : 0
                      }%`,
                    }}
                  />
                  {/* Basin Cutout Preview Ring */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-1/4 h-1/2 rounded-full border-2 border-dashed border-sky-300/80 bg-slate-950/40 flex items-center justify-center text-[9px] font-mono text-sky-200">
                      Basin Bowl
                    </div>
                  </div>
                  <div className="absolute top-1.5 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-sky-400 text-[10px] font-mono font-bold text-sky-300">
                    1. VANITY TOP (وینٹی ٹاپ) — Width: {vanityTopWidth} × Length: {vanityLength} {unit}
                  </div>
                </div>

                {/* 45° Miter Joint Line */}
                <div className="py-1 px-2 bg-emerald-500/20 border-y border-dashed border-emerald-400 text-[10px] font-mono font-bold text-emerald-300 text-center">
                  ▼ 45° KALAM / MITER EDGE FOLD (وینٹی کے سامنے لٹک کا بک میچ جوڑ) ▼
                </div>

                {/* Front Drop Apron (Latak) */}
                <div
                  className="relative w-full overflow-hidden rounded-b-md border-2 border-emerald-400 brightness-90"
                  style={{
                    aspectRatio: `${vanityLength} / ${vanityLatakWidth}`,
                  }}
                >
                  <div
                    className="w-full h-full bg-no-repeat"
                    style={{
                      backgroundImage: `url("${slabImageUrl}")`,
                      backgroundSize: `${(sLen / Math.max(1, vanityLength)) * 100}% ${
                        (sWid / Math.max(1, vanityLatakWidth)) * 100
                      }%`,
                      backgroundPosition: `${bgPosX}% ${
                        sWid - vanityLatakWidth > 0
                          ? ((cutY + vanityTopWidth) / (sWid - vanityLatakWidth)) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <div className="absolute bottom-1 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-emerald-400 text-[10px] font-mono font-bold text-emerald-300">
                    2. FRONT LATAK APRON (فرنٹ لٹک بک میچ) — Width: {vanityLatakWidth} × Length: {vanityLength} {unit}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-300">
              {tr('Selected Slab Strip (W×L):', 'منتخب سلیب حصہ (چوڑائی×لمبائی):')}{' '}
              <strong className="text-sky-300">
                {cutH} × {cutW} {unit}
              </strong>{' '}
              ({cutPieceSqFt.toFixed(2)} sq.ft)
            </span>
            <span className="text-slate-300">
              {tr('Remaining Usable Slab:', 'باقی بچنے والی سلیب:')}{' '}
              <strong className="text-emerald-400">
                {remainingSqFt.toFixed(2)} sq.ft ({remainingPct.toFixed(0)}%)
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
