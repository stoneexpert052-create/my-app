'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { StairSegment, StairUnit } from './stair-layout';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

export function toInchesVal(valStr: string | undefined, unit: StairUnit): number {
  const n = parseFloat(valStr || '');
  if (isNaN(n) || n <= 0) return 0;
  if (unit === 'feet') return n * 12;
  if (unit === 'cm') return n / 2.54;
  if (unit === 'mm') return n / 25.4;
  return n;
}

export function fromInchesVal(inches: number, unit: StairUnit): number {
  if (unit === 'feet') return inches / 12;
  if (unit === 'cm') return inches * 2.54;
  if (unit === 'mm') return inches * 25.4;
  return inches;
}

export function formatInchesToSutar(inches: number, isUr: boolean): string {
  if (!isFinite(inches) || inches <= 0) return '0"';
  const totalSutar = Math.round(inches * 8);
  const wholeIn = Math.floor(totalSutar / 8);
  const remSutar = totalSutar % 8;
  if (remSutar === 0) return `${wholeIn}"`;
  return isUr ? `${wholeIn}" ${remSutar} سوتر` : `${wholeIn}" ${remSutar}/8`;
}

export function formatDisplayUnit(inches: number, unit: StairUnit): string {
  const val = fromInchesVal(inches, unit);
  const clean = Number(val.toFixed(unit === 'inches' ? 3 : 2)).toString();
  if (unit === 'inches') return `${clean}"`;
  if (unit === 'feet') return `${clean}'`;
  return `${clean} ${unit}`;
}

interface StairSideViewProps {
  segments: StairSegment[];
  activeSegmentId: number | null;
  onSelectSegment?: (segmentId: number) => void;
  unit: StairUnit;
  zoom?: number;
  hasEdgeProfile?: boolean;
  isUr?: boolean;
  marbleThicknessSutar: number; // default 6 sutar = 0.75"
  slopeSutar: number; // default 1 sutar = 0.125"
  onTotalHeightChange: (totalHeightInches: number) => void;
  compact?: boolean;
}

type BuiltStepProfile = {
  stepNum: number;
  segmentId: number;
  kind: 'step' | 'landing' | 'winder';
  winderLabel?: string;
  x0: number;
  y0: number;
  treadRun: number;
  riserIn: number;
  stepRise: number;
  riserEnabled: boolean;
  hasPolish: boolean;
  hasFrontLatak: boolean;
  latakHeightIn: number;
};

export const StairSideView: React.FC<StairSideViewProps> = ({
  segments,
  activeSegmentId,
  onSelectSegment,
  unit,
  zoom = 1,
  hasEdgeProfile = true,
  isUr = false,
  marbleThicknessSutar,
  slopeSutar,
  onTotalHeightChange,
  compact = false,
}) => {
  const marbleIn = marbleThicknessSutar / 8; // 6 sutar = 0.75"
  const slopeIn = slopeSutar / 8; // 1 sutar = 0.125"
  const deductionIn = marbleIn + slopeIn; // 7 sutar = 0.875"

  // Build full step-by-step side elevation profile (including all flights + landings + 2S/3S winders)
  const profile = useMemo(() => {
    const steps: BuiltStepProfile[] = [];
    let x = 0;
    let y = 0;
    let stepNum = 1;

    segments.forEach((seg) => {
      if (seg.kind === 'steps') {
        const treadRun = Math.max(6, toInchesVal(seg.width, unit) || 12);
        const rawQty = parseInt(seg.quantity, 10);
        const qty = Math.max(1, Math.min(40, isNaN(rawQty) ? 1 : rawQty));
        const riserIn = Math.max(1, toInchesVal(seg.riser.height, unit) || 6.125);
        const stepRise = riserIn + deductionIn;
        const latakH = Math.min(4, Math.max(0.5, toInchesVal(seg.latak.height, unit) || 2));

        for (let i = 0; i < qty; i++) {
          steps.push({
            stepNum,
            segmentId: seg.id,
            kind: 'step',
            x0: x,
            y0: y,
            treadRun,
            riserIn,
            stepRise,
            riserEnabled: seg.riser.enabled,
            hasPolish: hasEdgeProfile && seg.edges.front,
            hasFrontLatak: seg.latak.front,
            latakHeightIn: latakH,
          });
          x += treadRun;
          y += stepRise;
          stepNum += 1;
        }
      } else {
        const count =
          seg.winderType === '3-step' ? 3 : seg.winderType === '2-step' ? 2 : 1;
        const riserIn = Math.max(1, toInchesVal(seg.riser.height, unit) || 6.125);
        const stepRise = riserIn + deductionIn;
        const latakH = Math.min(4, Math.max(0.5, toInchesVal(seg.latak.height, unit) || 2));

        // Visual horizontal run on side elevation: flat landing is wider; winders show individual steps
        const chowkiDepth = Math.max(18, toInchesVal(seg.length, unit) || 42);
        const perStepRun =
          count === 1
            ? Math.min(34, Math.max(22, chowkiDepth * 0.65))
            : Math.min(13, Math.max(9.5, chowkiDepth / (count + 0.6)));

        for (let i = 0; i < count; i++) {
          steps.push({
            stepNum,
            segmentId: seg.id,
            kind: count === 1 ? 'landing' : 'winder',
            winderLabel:
              count === 1
                ? isUr
                  ? 'چوکی'
                  : 'LANDING'
                : `${count}S`,
            x0: x,
            y0: y,
            treadRun: perStepRun,
            riserIn,
            stepRise,
            riserEnabled: seg.riser.enabled,
            hasPolish: hasEdgeProfile && seg.edges.front,
            hasFrontLatak: seg.latak.front,
            latakHeightIn: latakH,
          });
          x += perStepRun;
          y += stepRise;
          stepNum += 1;
        }
      }
    });

    const totalSteps = steps.length;
    const totalRunIn = x;
    const totalHeightIn = y;
    const avgStepRiseIn = totalSteps > 0 ? totalHeightIn / totalSteps : 7;
    const avgRiserIn = totalSteps > 0 ? Math.max(0, avgStepRiseIn - deductionIn) : 6.125;

    // Pick representative active segment's step (or lower-middle step) for the clear riser dimension callout
    let sampleIdx = steps.findIndex((st) => st.segmentId === activeSegmentId);
    if (sampleIdx === -1) {
      sampleIdx = Math.min(Math.max(1, Math.floor(totalSteps * 0.3)), Math.max(0, totalSteps - 1));
    } else {
      // Pick the 2nd step in active segment if available so it's clear of the floor datum
      const segSteps = steps
        .map((st, idx) => ({ st, idx }))
        .filter((o) => o.st.segmentId === activeSegmentId);
      if (segSteps.length >= 2) {
        sampleIdx = segSteps[Math.min(1, Math.floor(segSteps.length / 2))].idx;
      }
    }

    return {
      steps,
      totalSteps,
      totalRunIn,
      totalHeightIn,
      avgStepRiseIn,
      avgRiserIn,
      sampleIdx,
    };
  }, [segments, unit, deductionIn, hasEdgeProfile, isUr, activeSegmentId]);

  const computedTotalInUnit = useMemo(() => {
    const val = fromInchesVal(profile.totalHeightIn, unit);
    return Number(val.toFixed(unit === 'inches' ? 1 : 2)).toString();
  }, [profile.totalHeightIn, unit]);

  const [heightDraft, setHeightDraft] = useState<string>(computedTotalInUnit);
  const [isEditingHeight, setIsEditingHeight] = useState(false);

  useEffect(() => {
    if (!isEditingHeight) {
      setHeightDraft(computedTotalInUnit);
    }
  }, [computedTotalInUnit, isEditingHeight]);

  const minFeasibleHeightIn = profile.totalSteps * (deductionIn + 1.5);

  const handleHeightInputChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    setHeightDraft(cleaned);
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0 && profile.totalSteps > 0) {
      const inches = toInchesVal(cleaned, unit);
      // Apply live as soon as the value yields a realistic riser >= 1.5" (e.g. typing 1 -> 14 -> 140 applies at 140)
      if (inches >= minFeasibleHeightIn) {
        onTotalHeightChange(inches);
      }
    }
  };

  const commitHeightDraft = () => {
    setIsEditingHeight(false);
    const num = parseFloat(heightDraft);
    if (!isNaN(num) && num > 0 && profile.totalSteps > 0) {
      const inches = toInchesVal(heightDraft, unit);
      if (inches >= profile.totalSteps * (deductionIn + 0.5)) {
        onTotalHeightChange(inches);
        return;
      }
    }
    setHeightDraft(computedTotalInUnit);
  };

  // Compute AutoCAD SVG viewport bounds (world: X right, Y up -> SVG: x = X, y = -Y)
  const { viewBox, s, dimRightX, concretePoly } = useMemo(() => {
    const run = Math.max(48, profile.totalRunIn);
    const rise = Math.max(36, profile.totalHeightIn);
    const span = Math.max(run, rise);
    const scale = Math.max(0.75, Math.min(2.6, span / 155));

    const padLeft = 24 * scale;
    const padRight = 46 * scale;
    const padTop = 26 * scale;
    const padBottom = 24 * scale;

    const minX = -padLeft;
    const maxX = run + padRight;
    const minY = -(rise + padTop);
    const maxY = padBottom;

    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const vbW = rawW / zoom;
    const vbH = rawH / zoom;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Concrete RCC waist slab polygon underneath steps
    const waistDepth = Math.max(5, Math.min(8, span * 0.045));
    const pts: string[] = [];
    if (profile.steps.length > 0) {
      pts.push(`0,0`);
      profile.steps.forEach((st) => {
        pts.push(`${st.x0.toFixed(2)},${(-st.y0).toFixed(2)}`);
        pts.push(`${st.x0.toFixed(2)},${(-(st.y0 + st.riserIn)).toFixed(2)}`);
        pts.push(`${(st.x0 + st.treadRun).toFixed(2)},${(-(st.y0 + st.riserIn)).toFixed(2)}`);
      });
      const last = profile.steps[profile.steps.length - 1];
      const topRightX = last.x0 + last.treadRun;
      const topRightY = last.y0 + last.riserIn;
      pts.push(`${topRightX.toFixed(2)},${(-Math.max(0, topRightY - waistDepth)).toFixed(2)}`);
      // Follow underside diagonal down to floor slab
      const firstX = Math.min(topRightX, Math.max(8, waistDepth * 1.6));
      pts.push(`${firstX.toFixed(2)},0`);
    }

    return {
      viewBox: `${(cx - vbW / 2).toFixed(1)} ${(cy - vbH / 2).toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
      s: scale,
      dimRightX: run + 18 * scale,
      concretePoly: pts.join(' '),
    };
  }, [profile, zoom]);

  const sampleStep = profile.steps[profile.sampleIdx] || profile.steps[0];
  const displayRiserIn = sampleStep ? sampleStep.riserIn : profile.avgRiserIn;
  const displayStepRiseIn = sampleStep ? sampleStep.stepRise : profile.avgStepRiseIn;

  const unitBadge =
    unit === 'inches' ? '"' : unit === 'feet' ? "'" : ` ${unit}`;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* NON-OVERLAPPING TOP STRIP: 1-STEP SUTAR FORMULA + INTERACTIVE TOTAL HEIGHT AUTO-CALCULATOR */}
      <div className="relative z-20 flex flex-wrap items-stretch justify-between gap-1.5 px-1 pt-0.5 pb-1 shrink-0">
        {/* 1-Step Cross-Section Sutar Breakdown Card */}
        <div
          className={cn(
            'pointer-events-none rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-sm flex items-center gap-1.5',
            compact ? 'px-1.5 py-1' : 'px-2.5 py-1.5'
          )}
        >
          {/* Mini visual layer stack: 6 sutar marble + 1 sutar slope + Net Riser */}
          <div className="w-5 flex flex-col justify-between shrink-0 self-stretch py-0.5">
            <div className="h-1.5 w-full rounded-[1px] bg-slate-800" />
            <div className="h-[3px] w-full bg-teal-500 my-[1px]" />
            <div className="flex-1 min-h-[14px] w-2 bg-amber-300 border border-amber-600 rounded-[1px]" />
          </div>
          <div className="flex flex-col justify-center text-[9px] leading-tight space-y-0.5 font-semibold text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-800 font-extrabold whitespace-nowrap">
                {isUr ? 'خالی رائزر:' : 'Net Riser:'}
              </span>
              <span className="font-mono font-black text-amber-950 whitespace-nowrap">
                {formatDisplayUnit(displayRiserIn, unit)}
                {unit === 'inches' ? ` (${formatInchesToSutar(displayRiserIn, isUr)})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[8.5px] text-slate-500 whitespace-nowrap">
              <span>
                {isUr
                  ? `کل قدم ${formatDisplayUnit(displayStepRiseIn, unit)}`
                  : `Step ${formatDisplayUnit(displayStepRiseIn, unit)}`}
              </span>
              <span>·</span>
              <span className="text-slate-700">
                −{marbleThicknessSutar}
                {isUr ? ' سوتر ماربل' : 's marble'}
              </span>
              <span className="text-teal-700">
                −{slopeSutar}
                {isUr ? ' سوتر سلوپ' : 's slope'}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Total Height Auto-Calculator Box */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'rounded-lg border-2 border-indigo-400 bg-white/95 backdrop-blur-md shadow-sm flex items-center gap-1.5 ml-auto',
            compact ? 'px-1.5 py-1' : 'px-2 py-1'
          )}
        >
          <div className="flex flex-col leading-tight">
            <span className="text-[9.5px] font-extrabold text-indigo-800 whitespace-nowrap">
              {isUr ? 'ٹوٹل ہائٹ' : 'Total Height'}
            </span>
            <span className="text-[8.5px] font-mono font-bold text-indigo-600 whitespace-nowrap">
              {profile.totalSteps} {isUr ? 'سٹیپ' : 'steps'}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Input
              value={heightDraft}
              onFocus={() => setIsEditingHeight(true)}
              onChange={(e) => handleHeightInputChange(e.target.value)}
              onBlur={commitHeightDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHeightDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              inputMode="decimal"
              aria-label={isUr ? 'سیڑھی کی کل اونچائی' : 'Total staircase height'}
              className="h-7 w-16 px-1.5 text-xs sm:text-sm font-black tabular-nums text-center bg-indigo-50/80 text-indigo-950 border-indigo-300 focus-visible:ring-indigo-500"
            />
            <span className="text-[10px] font-extrabold text-indigo-700 shrink-0">
              {unitBadge}
            </span>
          </div>
        </div>
      </div>

      {/* AUTOCAD SIDE ELEVATION SVG CANVAS */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <svg
          width="100%"
          height="100%"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={isUr ? 'سیڑھی کا آٹو کیڈ سائیڈ ویو' : 'AutoCAD Staircase Side Elevation View'}
        >
          <defs>
            {/* Classic AutoCAD 45-degree concrete section hatch */}
            <pattern
              id="cad-concrete-hatch"
              width={6 * s}
              height={6 * s}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={6 * s}
                stroke="#cbd5e1"
                strokeWidth={0.7 * s}
              />
            </pattern>
            <marker
              id="side-dim-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#4338ca" />
            </marker>
            <marker
              id="riser-dim-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b45309" />
            </marker>
          </defs>

          {/* GROUND FLOOR DATUM LINE (FL 0.0") */}
          <line
            x1={-16 * s}
            y1={0}
            x2={dimRightX + 12 * s}
            y2={0}
            stroke="#334155"
            strokeWidth={0.9 * s}
            strokeDasharray={`${5 * s} ${2.5 * s}`}
          />
          {/* Ground level AutoCAD triangle datum */}
          <polygon
            points={`${(-10 * s).toFixed(1)},0 ${(-13.5 * s).toFixed(1)},${(-4.5 * s).toFixed(1)} ${(-6.5 * s).toFixed(1)},${(-4.5 * s).toFixed(1)}`}
            fill="#0f172a"
          />
          <text
            x={-10 * s}
            y={5.5 * s}
            textAnchor="middle"
            fontSize={4.4 * s}
            fontWeight="800"
            fill="#475569"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            FL 0
          </text>

          {/* TOP FLOOR DATUM LINE */}
          {profile.totalHeightIn > 0 && (
            <g>
              <line
                x1={profile.totalRunIn}
                y1={-profile.totalHeightIn}
                x2={dimRightX + 12 * s}
                y2={-profile.totalHeightIn}
                stroke="#4338ca"
                strokeWidth={0.85 * s}
                strokeDasharray={`${4 * s} ${2 * s}`}
              />
              {/* Top slab continuation stub */}
              <rect
                x={profile.totalRunIn}
                y={-profile.totalHeightIn}
                width={10 * s}
                height={Math.max(4, marbleIn + slopeIn + 4)}
                fill="url(#cad-concrete-hatch)"
                stroke="#64748b"
                strokeWidth={0.65 * s}
              />
            </g>
          )}

          {/* RCC CONCRETE WAIST SLAB UNDERNEATH STEPS */}
          {concretePoly && (
            <polygon
              points={concretePoly}
              fill="url(#cad-concrete-hatch)"
              stroke="#64748b"
              strokeWidth={0.85 * s}
              strokeLinejoin="round"
            />
          )}

          {/* INDIVIDUAL STEPS: VERTICAL RISER + 1-SUTAR SLOPE + 6-SUTAR MARBLE TREAD */}
          {profile.steps.map((st, idx) => {
            const isSelected = activeSegmentId === st.segmentId;
            const x = st.x0;
            const yBase = -st.y0; // bottom of this step (top of prev tread)
            const yRiserTop = -(st.y0 + st.riserIn);
            const ySlopeTop = -(st.y0 + st.riserIn + slopeIn);
            const yTreadTop = -(st.y0 + st.stepRise);

            const riserThick = Math.max(0.85, marbleIn);
            const nosing = 0.65;
            const treadVisualThick = Math.max(0.85, marbleIn);
            const slopeVisualThick = Math.max(0.35, slopeIn);

            const showStepBadge =
              profile.totalSteps <= 16 ||
              idx === 0 ||
              idx === profile.totalSteps - 1 ||
              st.kind !== 'step' ||
              (idx + 1) % 2 === 1;

            return (
              <g
                key={`${st.segmentId}-${st.stepNum}`}
                onClick={() => onSelectSegment?.(st.segmentId)}
                className="cursor-pointer"
              >
                {/* Vertical Riser Marble Piece (Empty/Net Riser Height) */}
                <rect
                  x={x}
                  y={yRiserTop}
                  width={riserThick}
                  height={Math.max(0.5, yBase - yRiserTop)}
                  fill={
                    st.riserEnabled
                      ? isSelected
                        ? '#f59e0b'
                        : '#fde68a'
                      : 'transparent'
                  }
                  stroke={st.riserEnabled ? '#b45309' : '#94a3b8'}
                  strokeWidth={(isSelected ? 0.85 : 0.6) * s}
                  strokeDasharray={st.riserEnabled ? undefined : `${1.5 * s} ${1.2 * s}`}
                />

                {/* 1-Sutar Slope / Mortar Allowance Layer */}
                <rect
                  x={x}
                  y={ySlopeTop}
                  width={st.treadRun}
                  height={slopeVisualThick}
                  fill="#14b8a6"
                  fillOpacity={0.75}
                />

                {/* 6-Sutar Marble Tread Slab */}
                <rect
                  x={x - nosing}
                  y={yTreadTop}
                  width={st.treadRun + nosing}
                  height={treadVisualThick}
                  fill={
                    st.kind === 'landing'
                      ? isSelected
                        ? '#6366f1'
                        : '#c7d2fe'
                      : st.kind === 'winder'
                        ? isSelected
                          ? '#2563eb'
                          : '#bfdbfe'
                        : isSelected
                          ? '#334155'
                          : '#e2e8f0'
                  }
                  stroke={isSelected ? '#0f172a' : '#1e293b'}
                  strokeWidth={(isSelected ? 0.9 : 0.65) * s}
                />

                {/* Red Polished Front Nosing Indicator */}
                {st.hasPolish && (
                  <line
                    x1={x - nosing}
                    y1={yTreadTop}
                    x2={x - nosing}
                    y2={yTreadTop + treadVisualThick}
                    stroke="#dc2626"
                    strokeWidth={1.3 * s}
                    strokeLinecap="round"
                  />
                )}

                {/* Blue Hanging Front Latak Strip */}
                {st.hasFrontLatak && (
                  <rect
                    x={x - nosing}
                    y={yTreadTop + treadVisualThick}
                    width={Math.max(0.75, marbleIn * 0.8)}
                    height={Math.min(st.riserIn * 0.65, st.latakHeightIn)}
                    fill="#2563eb"
                    fillOpacity={0.85}
                  />
                )}

                {/* Step Number / Landing Tag above Tread */}
                {showStepBadge && (
                  <text
                    x={x + st.treadRun / 2}
                    y={yTreadTop - 2.6 * s}
                    textAnchor="middle"
                    fontSize={st.kind === 'landing' ? 4.3 * s : 3.8 * s}
                    fontWeight="800"
                    fill={
                      st.kind === 'landing'
                        ? '#4338ca'
                        : st.kind === 'winder'
                          ? '#1d4ed8'
                          : '#475569'
                    }
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    className="pointer-events-none select-none"
                  >
                    {st.kind === 'landing'
                      ? st.winderLabel
                      : st.kind === 'winder'
                        ? `#${st.stepNum}·${st.winderLabel}`
                        : st.stepNum}
                  </text>
                )}
              </g>
            );
          })}

          {/* MEASUREMENT #1 ON DIAGRAM: EMPTY RISER HEIGHT (خالی رائزر کی پیمائش) */}
          {sampleStep && (
            <g className="pointer-events-none select-none">
              {(() => {
                const rx = sampleStep.x0;
                const yBot = -sampleStep.y0;
                const yTop = -(sampleStep.y0 + sampleStep.riserIn);
                const dimX = rx - 10 * s;
                const midY = (yBot + yTop) / 2;
                const riserLabel = `${isUr ? 'رائزر' : 'Riser'} ${formatDisplayUnit(sampleStep.riserIn, unit)}`;
                const boxW = Math.max(30, riserLabel.length * 3.1) * s;

                return (
                  <>
                    {/* Extension lines from exact empty riser top & bottom */}
                    <line
                      x1={rx - 0.5}
                      y1={yBot}
                      x2={dimX - 2.2 * s}
                      y2={yBot}
                      stroke="#d97706"
                      strokeWidth={0.6 * s}
                    />
                    <line
                      x1={rx - 0.5}
                      y1={yTop}
                      x2={dimX - 2.2 * s}
                      y2={yTop}
                      stroke="#d97706"
                      strokeWidth={0.6 * s}
                    />
                    {/* Vertical Riser Dimension Arrow */}
                    <line
                      x1={dimX}
                      y1={yBot}
                      x2={dimX}
                      y2={yTop}
                      stroke="#b45309"
                      strokeWidth={1.0 * s}
                      markerStart="url(#riser-dim-arrow)"
                      markerEnd="url(#riser-dim-arrow)"
                    />
                    {/* Crisp Callout Pill to the left of the riser bracket */}
                    <rect
                      x={dimX - boxW - 2.5 * s}
                      y={midY - 5.2 * s}
                      width={boxW}
                      height={10.4 * s}
                      rx={1.8 * s}
                      fill="#fffbeb"
                      stroke="#d97706"
                      strokeWidth={0.75 * s}
                    />
                    <text
                      x={dimX - boxW / 2 - 2.5 * s}
                      y={midY + 0.3 * s}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={4.6 * s}
                      fontWeight="800"
                      fill="#92400e"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {riserLabel}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* MEASUREMENT #2 ON DIAGRAM: TOTAL FLOOR-TO-FLOOR HEIGHT (ٹوٹل ہائٹ) */}
          {profile.totalHeightIn > 0 && (
            <g className="pointer-events-none select-none">
              {/* Vertical Total Height Dimension Line */}
              <line
                x1={dimRightX}
                y1={-1.5 * s}
                x2={dimRightX}
                y2={-profile.totalHeightIn + 1.5 * s}
                stroke="#4338ca"
                strokeWidth={1.25 * s}
                markerStart="url(#side-dim-arrow)"
                markerEnd="url(#side-dim-arrow)"
              />
              {/* Architectural Tick Dots */}
              <circle cx={dimRightX} cy={0} r={1.6 * s} fill="#312e81" />
              <circle cx={dimRightX} cy={-profile.totalHeightIn} r={1.6 * s} fill="#312e81" />

              {/* Total Height Badge Centered on Dimension Line */}
              {(() => {
                const midY = -profile.totalHeightIn / 2;
                const totalLabel = formatDisplayUnit(profile.totalHeightIn, unit);
                const subLabel = `${profile.totalSteps}×${formatDisplayUnit(profile.avgStepRiseIn, unit)}`;
                const bw = Math.max(30, Math.max(totalLabel.length, subLabel.length) * 3.2 + 8) * s;
                return (
                  <g>
                    <rect
                      x={dimRightX - bw / 2}
                      y={midY - 7.5 * s}
                      width={bw}
                      height={15 * s}
                      rx={2.2 * s}
                      fill="#ffffff"
                      stroke="#4338ca"
                      strokeWidth={0.9 * s}
                    />
                    <text
                      x={dimRightX}
                      y={midY - 2.1 * s}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={5.4 * s}
                      fontWeight="900"
                      fill="#312e81"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {totalLabel}
                    </text>
                    <text
                      x={dimRightX}
                      y={midY + 3.6 * s}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={3.9 * s}
                      fontWeight="700"
                      fill="#4f46e5"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {subLabel}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* BOTTOM HORIZONTAL TOTAL RUN DIMENSION LINE */}
          {profile.totalRunIn > 0 && (
            <g className="pointer-events-none select-none">
              <line
                x1={0}
                y1={2 * s}
                x2={0}
                y2={13 * s}
                stroke="#64748b"
                strokeWidth={0.55 * s}
              />
              <line
                x1={profile.totalRunIn}
                y1={2 * s}
                x2={profile.totalRunIn}
                y2={13 * s}
                stroke="#64748b"
                strokeWidth={0.55 * s}
              />
              <line
                x1={0}
                y1={10 * s}
                x2={profile.totalRunIn}
                y2={10 * s}
                stroke="#334155"
                strokeWidth={0.8 * s}
              />
              <circle cx={0} cy={10 * s} r={1.2 * s} fill="#0f172a" />
              <circle cx={profile.totalRunIn} cy={10 * s} r={1.2 * s} fill="#0f172a" />
              {(() => {
                const runLabel = `${isUr ? 'کل رن' : 'Total Run'}: ${formatDisplayUnit(profile.totalRunIn, unit)}`;
                const bw = (runLabel.length * 2.8 + 8) * s;
                return (
                  <g>
                    <rect
                      x={profile.totalRunIn / 2 - bw / 2}
                      y={10 * s - 4.4 * s}
                      width={bw}
                      height={8.8 * s}
                      rx={1.5 * s}
                      fill="#ffffff"
                    />
                    <text
                      x={profile.totalRunIn / 2}
                      y={10 * s + 0.3 * s}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={4.8 * s}
                      fontWeight="800"
                      fill="#0f172a"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {runLabel}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
