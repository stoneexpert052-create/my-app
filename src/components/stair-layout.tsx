'use client';

import React, { useMemo } from 'react';

export type StairUnit = 'inches' | 'feet' | 'cm' | 'mm';

export type FourSideLatak = {
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  height: string;
};

export type FourSideEdges = {
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  diag1?: boolean;
  diag2?: boolean;
};

export type StepFlightSegment = {
  id: number;
  kind: 'steps';
  label?: string;
  length: string; // Step width across staircase (e.g. 42")
  width: string; // Step tread depth (e.g. 12")
  quantity: string; // Number of steps in this flight (e.g. 8)
  edges: FourSideEdges;
  latak: FourSideLatak;
  riser: {
    enabled: boolean;
    height: string; // e.g. 7"
    length: string; // defaults to step length if blank
    quantity: string; // defaults to step quantity if blank
    hasSkirting: boolean;
    skirtingType: 'one-sided' | 'two-sided';
    skirtingLength: string;
  };
};

export type ChowkiSegment = {
  id: number;
  kind: 'chowki';
  label?: string;
  width: string; // Extent across incoming stair (e.g. 42")
  length: string; // Extent along incoming stair travel (e.g. 42")
  winderType: '1-step' | '2-step' | '3-step';
  turnDirection: 'left' | 'right' | 'straight' | 'u-left' | 'u-right';
  isMainLanding?: boolean;
  edges: FourSideEdges;
  latak: FourSideLatak;
  riser: {
    enabled: boolean;
    height: string;
    edges: FourSideEdges;
  };
};

export type StairSegment = StepFlightSegment | ChowkiSegment;

interface StairLayoutProps {
  segments: StairSegment[];
  activeSegmentId: number | null;
  onSelectSegment?: (segmentId: number) => void;
  marbleImageUrl?: string;
  zoom?: number;
  unit?: StairUnit;
  hasEdgeProfile?: boolean;
  isPrintMode?: boolean;
  isUr?: boolean;
}

type Pt = { x: number; y: number };

// Direction 0 = Up (North), 1 = Right (East), 2 = Down (South), 3 = Left (West)
const DIR_FWD: Record<number, Pt> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

const DIR_RIGHT: Record<number, Pt> = {
  0: { x: 1, y: 0 },
  1: { x: 0, y: 1 },
  2: { x: -1, y: 0 },
  3: { x: 0, y: -1 },
};

function toInches(valStr: string | undefined, unit: StairUnit): number {
  const n = parseFloat(valStr || '');
  if (isNaN(n) || n <= 0) return 0;
  if (unit === 'feet') return n * 12;
  if (unit === 'cm') return n / 2.54;
  if (unit === 'mm') return n / 25.4;
  return n;
}

function formatCadVal(valStr: string | undefined, unit: StairUnit): string {
  const n = parseFloat(valStr || '');
  if (isNaN(n) || n <= 0) return '0';
  const clean = Number(n.toFixed(1)).toString();
  if (unit === 'inches') return `${clean}"`;
  if (unit === 'feet') return `${clean}'`;
  return `${clean} ${unit}`;
}

function formatInchesInUnit(inches: number, unit: StairUnit): string {
  let v = inches;
  if (unit === 'feet') v = inches / 12;
  else if (unit === 'cm') v = inches * 2.54;
  else if (unit === 'mm') v = inches * 25.4;
  const clean = Number(v.toFixed(1)).toString();
  if (unit === 'inches') return `${clean}"`;
  if (unit === 'feet') return `${clean}'`;
  return `${clean} ${unit}`;
}

function ptStr(p: Pt): string {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

function polyStr(pts: Pt[]): string {
  return pts.map(ptStr).join(' ');
}

function offsetLine(a: Pt, b: Pt, nx: number, ny: number, dist: number): [Pt, Pt] {
  return [
    { x: a.x + nx * dist, y: a.y + ny * dist },
    { x: b.x + nx * dist, y: b.y + ny * dist },
  ];
}

// Compute readable text angle (never upside down)
function readableAngle(dx: number, dy: number): number {
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg > 90 || deg < -90) deg += 180;
  return deg;
}

type BuiltStepFlight = {
  kind: 'steps';
  segment: StepFlightSegment;
  index: number;
  dir: number;
  F: Pt;
  R: Pt;
  stepLength: number;
  treadWidth: number;
  qty: number;
  startStepNum: number;
  world: (u: number, v: number) => Pt;
  outerCorners: [Pt, Pt, Pt, Pt]; // BL, BR, TR, TL
};

type BuiltChowki = {
  kind: 'chowki';
  segment: ChowkiSegment;
  index: number;
  dir: number;
  F: Pt;
  R: Pt;
  w: number;
  l: number;
  uMin: number;
  uMax: number;
  exitU: number;
  startStepNum: number;
  stepCount: number;
  world: (u: number, v: number) => Pt;
  outerCorners: [Pt, Pt, Pt, Pt]; // BL, BR, TR, TL
  exitCenter: Pt;
  exitDir: number;
};

type BuiltGeometry = BuiltStepFlight | BuiltChowki;

export const StairLayout: React.FC<StairLayoutProps> = ({
  segments,
  activeSegmentId,
  onSelectSegment,
  marbleImageUrl,
  zoom = 1,
  unit = 'inches',
  hasEdgeProfile = true,
  isPrintMode = false,
  isUr = false,
}) => {
  const { items, viewBox, totalSteps, strokeScale } = useMemo(() => {
    let cx = 0;
    let cy = 0;
    let dir = 0; // Start heading UP (North)
    let runningStepNum = 1;
    let lastFlightWidth = 42;

    const built: BuiltGeometry[] = [];
    const allPts: Pt[] = [];

    const pushPts = (pts: Pt[]) => {
      for (const p of pts) allPts.push(p);
    };

    segments.forEach((seg, idx) => {
      const F = DIR_FWD[dir];
      const R = DIR_RIGHT[dir];
      const originX = cx;
      const originY = cy;

      const world = (u: number, v: number): Pt => ({
        x: originX + u * R.x + v * F.x,
        y: originY + u * R.y + v * F.y,
      });

      if (seg.kind === 'steps') {
        const stepLength = Math.max(12, toInches(seg.length, unit) || 42);
        const treadWidth = Math.max(6, toInches(seg.width, unit) || 12);
        const rawQty = parseInt(seg.quantity, 10);
        const qty = Math.max(1, Math.min(40, isNaN(rawQty) ? 1 : rawQty));
        const totalRun = treadWidth * qty;

        const BL = world(-stepLength / 2, 0);
        const BR = world(stepLength / 2, 0);
        const TR = world(stepLength / 2, totalRun);
        const TL = world(-stepLength / 2, totalRun);

        pushPts([BL, BR, TR, TL]);
        // Include space for external dimension callouts
        pushPts([
          world(-stepLength / 2 - 22, -16),
          world(stepLength / 2 + 22, totalRun + 16),
        ]);

        built.push({
          kind: 'steps',
          segment: seg,
          index: idx,
          dir,
          F,
          R,
          stepLength,
          treadWidth,
          qty,
          startStepNum: runningStepNum,
          world,
          outerCorners: [BL, BR, TR, TL],
        });

        lastFlightWidth = stepLength;
        runningStepNum += qty;
        cx = originX + totalRun * F.x;
        cy = originY + totalRun * F.y;
      } else {
        const w = Math.max(18, toInches(seg.width, unit) || 42);
        const l = Math.max(18, toInches(seg.length, unit) || 42);
        const incomingW = Math.min(w, lastFlightWidth);

        let uMin = -w / 2;
        let uMax = w / 2;
        let exitU = 0;
        let exitCenter = world(0, l);
        let exitDir = dir;

        if (seg.turnDirection === 'u-right') {
          // Flush with incoming flight's left edge, extending right across both flights
          uMin = -incomingW / 2;
          uMax = uMin + w;
          exitU = uMax - incomingW / 2;
          exitCenter = world(exitU, 0);
          exitDir = (dir + 2) % 4;
        } else if (seg.turnDirection === 'u-left') {
          // Flush with incoming flight's right edge, extending left across both flights
          uMax = incomingW / 2;
          uMin = uMax - w;
          exitU = uMin + incomingW / 2;
          exitCenter = world(exitU, 0);
          exitDir = (dir + 2) % 4;
        } else if (seg.turnDirection === 'right') {
          exitCenter = world(w / 2, l / 2);
          exitDir = (dir + 1) % 4;
        } else if (seg.turnDirection === 'left') {
          exitCenter = world(-w / 2, l / 2);
          exitDir = (dir + 3) % 4;
        }

        const BL = world(uMin, 0);
        const BR = world(uMax, 0);
        const TR = world(uMax, l);
        const TL = world(uMin, l);

        pushPts([BL, BR, TR, TL]);
        pushPts([
          world(uMin - 22, -14),
          world(uMax + 22, l + 18),
        ]);

        const stepCount =
          seg.winderType === '3-step' ? 3 : seg.winderType === '2-step' ? 2 : 1;

        built.push({
          kind: 'chowki',
          segment: seg,
          index: idx,
          dir,
          F,
          R,
          w,
          l,
          uMin,
          uMax,
          exitU,
          startStepNum: runningStepNum,
          stepCount,
          world,
          outerCorners: [BL, BR, TR, TL],
          exitCenter,
          exitDir,
        });

        runningStepNum += stepCount;
        cx = exitCenter.x;
        cy = exitCenter.y;
        dir = exitDir;
      }
    });

    if (allPts.length === 0) {
      return {
        items: built,
        viewBox: '-60 -120 120 140',
        totalSteps: 0,
        strokeScale: 1,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of allPts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rawW = Math.max(80, maxX - minX);
    const rawH = Math.max(80, maxY - minY);
    const pad = Math.max(16, Math.min(34, Math.max(rawW, rawH) * 0.08));

    const vbW = (rawW + pad * 2) / zoom;
    const vbH = (rawH + pad * 2) / zoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const maxSpan = Math.max(rawW, rawH);
    const scale = Math.max(0.75, Math.min(2.6, maxSpan / 145));

    return {
      items: built,
      viewBox: `${(centerX - vbW / 2).toFixed(1)} ${(centerY - vbH / 2).toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
      totalSteps: runningStepNum - 1,
      strokeScale: scale,
    };
  }, [segments, unit, zoom]);

  const patternId = 'stair-marble-pattern';
  const s = strokeScale;

  // Helper to draw a crisp AutoCAD architectural dimension line with end ticks
  const renderDimension = (
    p1: Pt,
    p2: Pt,
    nx: number,
    ny: number,
    offsetDist: number,
    label: string,
    key: string
  ) => {
    const [d1, d2] = offsetLine(p1, p2, nx, ny, offsetDist);
    const mid: Pt = { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };
    const ang = readableAngle(d2.x - d1.x, d2.y - d1.y);
    const tickLen = 2.6 * s;
    const tx = nx * tickLen;
    const ty = ny * tickLen;

    return (
      <g key={key} className="pointer-events-none select-none">
        {/* Extension lines */}
        <line
          x1={p1.x + nx * (2 * s)}
          y1={p1.y + ny * (2 * s)}
          x2={d1.x + tx * 0.8}
          y2={d1.y + ty * 0.8}
          stroke="#64748b"
          strokeWidth={0.55 * s}
        />
        <line
          x1={p2.x + nx * (2 * s)}
          y1={p2.y + ny * (2 * s)}
          x2={d2.x + tx * 0.8}
          y2={d2.y + ty * 0.8}
          stroke="#64748b"
          strokeWidth={0.55 * s}
        />
        {/* Main dimension line */}
        <line
          x1={d1.x}
          y1={d1.y}
          x2={d2.x}
          y2={d2.y}
          stroke="#334155"
          strokeWidth={0.75 * s}
        />
        {/* Architectural ticks */}
        <circle cx={d1.x} cy={d1.y} r={1.2 * s} fill="#0f172a" />
        <circle cx={d2.x} cy={d2.y} r={1.2 * s} fill="#0f172a" />
        {/* Dimension label */}
        <g transform={`translate(${mid.x}, ${mid.y}) rotate(${ang})`}>
          <rect
            x={-(label.length * 2.55 * s + 3 * s)}
            y={-4.6 * s}
            width={label.length * 5.1 * s + 6 * s}
            height={9.2 * s}
            rx={1.5 * s}
            fill="#ffffff"
            fillOpacity={0.94}
          />
          <text
            x={0}
            y={0.4 * s}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={5.8 * s}
            fontWeight="800"
            fill="#0f172a"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {label}
          </text>
        </g>
      </g>
    );
  };

  // Helper to draw a 4-sided Latak architectural flange ribbon along edge a -> b
  const renderLatakStrip = (
    a: Pt,
    b: Pt,
    outNx: number,
    outNy: number,
    key: string
  ) => {
    const stripW = 2.4 * s;
    const p1 = { x: a.x + outNx * 0.6 * s, y: a.y + outNy * 0.6 * s };
    const p2 = { x: b.x + outNx * 0.6 * s, y: b.y + outNy * 0.6 * s };
    const p3 = { x: b.x + outNx * stripW, y: b.y + outNy * stripW };
    const p4 = { x: a.x + outNx * stripW, y: a.y + outNy * stripW };
    return (
      <polygon
        key={key}
        points={polyStr([p1, p2, p3, p4])}
        fill="#2563eb"
        fillOpacity={0.28}
        stroke="#1d4ed8"
        strokeWidth={0.95 * s}
      />
    );
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label={isUr ? 'سیڑھیوں کا آٹو کیڈ نقشہ' : 'AutoCAD Staircase Plan Diagram'}
      >
        <defs>
          {marbleImageUrl && !isPrintMode && (
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width="72"
              height="72"
            >
              <image
                href={marbleImageUrl}
                x="0"
                y="0"
                width="72"
                height="72"
                preserveAspectRatio="xMidYMid slice"
                opacity="0.22"
              />
            </pattern>
          )}
          <marker
            id="cad-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
        </defs>

        {items.map((item) => {
          const isSelected = !isPrintMode && activeSegmentId === item.segment.id;

          if (item.kind === 'steps') {
            const { segment, stepLength, treadWidth, qty, startStepNum, world, outerCorners, F, R } = item;
            const totalRun = treadWidth * qty;
            const halfL = stepLength / 2;

            // Show every number when <= 14 steps, otherwise every 2nd + first & last
            const showStepNumber = (i: number) =>
              qty <= 14 || i === 0 || i === qty - 1 || (i + 1) % 2 === 1;

            const walkStart = world(0, treadWidth * 0.35);
            const walkEnd = world(0, Math.max(treadWidth * 0.7, totalRun - treadWidth * 0.25));

            return (
              <g
                key={segment.id}
                onClick={() => !isPrintMode && onSelectSegment?.(segment.id)}
                className={!isPrintMode ? 'cursor-pointer' : undefined}
              >
                {/* Base marble slab polygon */}
                <polygon
                  points={polyStr(outerCorners)}
                  fill={isPrintMode ? '#ffffff' : marbleImageUrl ? `url(#${patternId})` : '#f8fafc'}
                />
                {/* Soft tint when selected */}
                <polygon
                  points={polyStr(outerCorners)}
                  fill={isSelected ? 'rgba(245, 158, 11, 0.10)' : 'rgba(248, 250, 252, 0.35)'}
                  stroke={isSelected ? '#d97706' : '#0f172a'}
                  strokeWidth={(isSelected ? 2.1 : 1.35) * s}
                />

                {/* Individual step treads */}
                {Array.from({ length: qty }).map((_, i) => {
                  const v0 = i * treadWidth;
                  const v1 = (i + 1) * treadWidth;
                  const fl = world(-halfL, v0);
                  const fr = world(halfL, v0);
                  const br = world(halfL, v1);
                  const bl = world(-halfL, v1);
                  const center = world(0, v0 + treadWidth / 2);

                  // Riser hidden nosing line offset slightly inside step front
                  const riserV = v0 + Math.min(2.2, treadWidth * 0.16);
                  const rL = world(-halfL + 1, riserV);
                  const rR = world(halfL - 1, riserV);

                  return (
                    <g key={i}>
                      {/* Step tread divider line */}
                      <line
                        x1={fl.x}
                        y1={fl.y}
                        x2={fr.x}
                        y2={fr.y}
                        stroke="#0f172a"
                        strokeWidth={0.9 * s}
                      />

                      {/* Riser indicator (amber dashed CAD nosing line) */}
                      {segment.riser.enabled && (
                        <line
                          x1={rL.x}
                          y1={rL.y}
                          x2={rR.x}
                          y2={rR.y}
                          stroke="#d97706"
                          strokeWidth={0.85 * s}
                          strokeDasharray={`${2.2 * s} ${1.6 * s}`}
                        />
                      )}

                      {/* 4-Sided Edge Polish indicators (Red) */}
                      {hasEdgeProfile && segment.edges.front && (
                        <line
                          x1={fl.x}
                          y1={fl.y}
                          x2={fr.x}
                          y2={fr.y}
                          stroke="#dc2626"
                          strokeWidth={1.65 * s}
                          strokeLinecap="round"
                        />
                      )}
                      {hasEdgeProfile && segment.edges.back && (
                        <line
                          x1={bl.x}
                          y1={bl.y}
                          x2={br.x}
                          y2={br.y}
                          stroke="#dc2626"
                          strokeWidth={1.35 * s}
                          strokeLinecap="round"
                        />
                      )}
                      {hasEdgeProfile && segment.edges.left && (
                        <line
                          x1={fl.x}
                          y1={fl.y}
                          x2={bl.x}
                          y2={bl.y}
                          stroke="#dc2626"
                          strokeWidth={1.65 * s}
                          strokeLinecap="round"
                        />
                      )}
                      {hasEdgeProfile && segment.edges.right && (
                        <line
                          x1={fr.x}
                          y1={fr.y}
                          x2={br.x}
                          y2={br.y}
                          stroke="#dc2626"
                          strokeWidth={1.65 * s}
                          strokeLinecap="round"
                        />
                      )}

                      {/* 4-Sided Latak indicators (Blue architectural strip) */}
                      {segment.latak.front && (
                        <line
                          x1={fl.x + F.x * (0.9 * s)}
                          y1={fl.y + F.y * (0.9 * s)}
                          x2={fr.x + F.x * (0.9 * s)}
                          y2={fr.y + F.y * (0.9 * s)}
                          stroke="#2563eb"
                          strokeWidth={1.55 * s}
                        />
                      )}
                      {segment.latak.back && (
                        <line
                          x1={bl.x - F.x * (0.9 * s)}
                          y1={bl.y - F.y * (0.9 * s)}
                          x2={br.x - F.x * (0.9 * s)}
                          y2={br.y - F.y * (0.9 * s)}
                          stroke="#2563eb"
                          strokeWidth={1.35 * s}
                        />
                      )}

                      {/* Step number along left-center of tread */}
                      {showStepNumber(i) && (
                        <text
                          x={center.x - R.x * (halfL * 0.62)}
                          y={center.y - R.y * (halfL * 0.62)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={Math.min(treadWidth * 0.52, 5.2 * s)}
                          fontWeight="700"
                          fill="#475569"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          className="pointer-events-none select-none"
                        >
                          {startStepNum + i}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Continuous Left & Right 4-Sided Latak outer strips for the whole flight */}
                {segment.latak.left &&
                  renderLatakStrip(outerCorners[0], outerCorners[3], -R.x, -R.y, `latak-l-${segment.id}`)}
                {segment.latak.right &&
                  renderLatakStrip(outerCorners[1], outerCorners[2], R.x, R.y, `latak-r-${segment.id}`)}

                {/* Skirting side wall indicator (dark slate double line) */}
                {segment.riser.hasSkirting && (
                  <>
                    <line
                      x1={outerCorners[0].x - R.x * (3.2 * s)}
                      y1={outerCorners[0].y - R.y * (3.2 * s)}
                      x2={outerCorners[3].x - R.x * (3.2 * s)}
                      y2={outerCorners[3].y - R.y * (3.2 * s)}
                      stroke="#0f766e"
                      strokeWidth={1.3 * s}
                      strokeDasharray={`${3 * s} ${1.5 * s}`}
                    />
                    {segment.riser.skirtingType === 'two-sided' && (
                      <line
                        x1={outerCorners[1].x + R.x * (3.2 * s)}
                        y1={outerCorners[1].y + R.y * (3.2 * s)}
                        x2={outerCorners[2].x + R.x * (3.2 * s)}
                        y2={outerCorners[2].y + R.y * (3.2 * s)}
                        stroke="#0f766e"
                        strokeWidth={1.3 * s}
                        strokeDasharray={`${3 * s} ${1.5 * s}`}
                      />
                    )}
                  </>
                )}

                {/* AutoCAD Walk Line with Start Circle & Arrow */}
                <line
                  x1={walkStart.x}
                  y1={walkStart.y}
                  x2={walkEnd.x}
                  y2={walkEnd.y}
                  stroke="#334155"
                  strokeWidth={0.95 * s}
                  markerEnd="url(#cad-arrow)"
                  className="pointer-events-none"
                />
                {item.index === 0 && (
                  <g className="pointer-events-none select-none">
                    <circle
                      cx={walkStart.x}
                      cy={walkStart.y}
                      r={2.5 * s}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth={1.1 * s}
                    />
                    <text
                      x={walkStart.x - F.x * (7.5 * s)}
                      y={walkStart.y - F.y * (7.5 * s)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={5.4 * s}
                      fontWeight="900"
                      fill="#0f172a"
                    >
                      {isUr ? 'اوپر ▲' : 'UP ▲'}
                    </text>
                  </g>
                )}

                {/* AutoCAD Dimension Lines */}
                {/* Step Length (across entry edge if first segment, else exit/entry neatly) */}
                {item.index === 0 &&
                  renderDimension(
                    outerCorners[0],
                    outerCorners[1],
                    -F.x,
                    -F.y,
                    12.5 * s,
                    formatCadVal(segment.length, unit),
                    `dim-len-${segment.id}`
                  )}
                {/* Flight Run Length (along left side) */}
                {renderDimension(
                  outerCorners[0],
                  outerCorners[3],
                  -R.x,
                  -R.y,
                  11 * s,
                  `${qty}×${formatCadVal(segment.width, unit)} (${formatInchesInUnit(totalRun, unit)})`,
                  `dim-run-${segment.id}`
                )}
              </g>
            );
          }

          // CHOWKI / STAIRCASE LANDING / WINDER SEGMENT
          const { segment, w, l, uMin, uMax, exitU, startStepNum, world, outerCorners, F, R } = item;
          const [BL, BR, TR, TL] = outerCorners;
          const uMid = (uMin + uMax) / 2;
          const center = world(uMid, l / 2);
          const isUTurn = segment.turnDirection === 'u-right' || segment.turnDirection === 'u-left';

          // Compute internal step / winder cut segments + individual winder step numbers
          const diagLines: Array<{ key: 'diag1' | 'diag2'; a: Pt; b: Pt }> = [];
          const winderStepPts: Array<{ num: number; pt: Pt }> = [];
          if (isUTurn) {
            if (segment.winderType === '2-step') {
              // Half-landing center step split down the middle of the big U-landing
              diagLines.push({ key: 'diag1', a: world(uMid, 0), b: world(uMid, l) });
              const firstOnLeft = segment.turnDirection === 'u-right';
              winderStepPts.push({
                num: startStepNum,
                pt: world(firstOnLeft ? uMin + w * 0.25 : uMax - w * 0.25, l * 0.5),
              });
              winderStepPts.push({
                num: startStepNum + 1,
                pt: world(firstOnLeft ? uMax - w * 0.25 : uMin + w * 0.25, l * 0.5),
              });
            } else if (segment.winderType === '3-step') {
              // 3-step U-turn landing split radiating from inner stairwell corner
              const pivot = world(uMid, 0);
              diagLines.push({ key: 'diag1', a: pivot, b: world(uMin + w * 0.28, l) });
              diagLines.push({ key: 'diag2', a: pivot, b: world(uMax - w * 0.28, l) });
              const firstOnLeft = segment.turnDirection === 'u-right';
              winderStepPts.push({
                num: startStepNum,
                pt: world(firstOnLeft ? uMin + w * 0.16 : uMax - w * 0.16, l * 0.45),
              });
              winderStepPts.push({
                num: startStepNum + 1,
                pt: world(uMid, l * 0.72),
              });
              winderStepPts.push({
                num: startStepNum + 2,
                pt: world(firstOnLeft ? uMax - w * 0.16 : uMin + w * 0.16, l * 0.45),
              });
            }
          } else if (segment.winderType === '2-step') {
            if (segment.turnDirection === 'right') {
              diagLines.push({ key: 'diag1', a: BR, b: TL });
              winderStepPts.push({ num: startStepNum, pt: world(uMin + w * 0.28, l * 0.28) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMin + w * 0.72, l * 0.72) });
            } else if (segment.turnDirection === 'left') {
              diagLines.push({ key: 'diag1', a: BL, b: TR });
              winderStepPts.push({ num: startStepNum, pt: world(uMin + w * 0.72, l * 0.28) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMin + w * 0.28, l * 0.72) });
            } else {
              diagLines.push({ key: 'diag1', a: world(uMin, l / 2), b: world(uMax, l / 2) });
              winderStepPts.push({ num: startStepNum, pt: world(uMin + w * 0.22, l * 0.25) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMin + w * 0.22, l * 0.75) });
            }
          } else if (segment.winderType === '3-step') {
            if (segment.turnDirection === 'right') {
              diagLines.push({ key: 'diag1', a: BR, b: world(uMin, l * 0.42) });
              diagLines.push({ key: 'diag2', a: BR, b: world(uMin + w * 0.42, l) });
              winderStepPts.push({ num: startStepNum, pt: world(uMin + w * 0.25, l * 0.17) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMin + w * 0.22, l * 0.76) });
              winderStepPts.push({ num: startStepNum + 2, pt: world(uMin + w * 0.76, l * 0.74) });
            } else if (segment.turnDirection === 'left') {
              diagLines.push({ key: 'diag1', a: BL, b: world(uMax, l * 0.42) });
              diagLines.push({ key: 'diag2', a: BL, b: world(uMax - w * 0.42, l) });
              winderStepPts.push({ num: startStepNum, pt: world(uMax - w * 0.25, l * 0.17) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMax - w * 0.22, l * 0.76) });
              winderStepPts.push({ num: startStepNum + 2, pt: world(uMax - w * 0.76, l * 0.74) });
            } else {
              diagLines.push({ key: 'diag1', a: world(uMin, l / 3), b: world(uMax, l / 3) });
              diagLines.push({ key: 'diag2', a: world(uMin, (2 * l) / 3), b: world(uMax, (2 * l) / 3) });
              winderStepPts.push({ num: startStepNum, pt: world(uMin + w * 0.22, l * 0.17) });
              winderStepPts.push({ num: startStepNum + 1, pt: world(uMin + w * 0.22, l * 0.5) });
              winderStepPts.push({ num: startStepNum + 2, pt: world(uMin + w * 0.22, l * 0.83) });
            }
          }

          // AutoCAD Curved Turn Walk Arrow inside Chowki / U-Landing
          let turnPath: string;
          if (isUTurn) {
            const pStart = world(0, l * 0.14);
            const c1 = world(0, l * 0.72);
            const c2 = world(exitU, l * 0.72);
            const pEnd = world(exitU, l * 0.14);
            turnPath = `M ${pStart.x.toFixed(1)} ${pStart.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)}`;
          } else {
            const entryMid = world(0, l * 0.14);
            const exitMid =
              segment.turnDirection === 'right'
                ? world(uMax - w * 0.14, l / 2)
                : segment.turnDirection === 'left'
                  ? world(uMin + w * 0.14, l / 2)
                  : world(uMid, l * 0.86);
            turnPath = `M ${entryMid.x.toFixed(1)} ${entryMid.y.toFixed(1)} Q ${center.x.toFixed(1)} ${center.y.toFixed(1)} ${exitMid.x.toFixed(1)} ${exitMid.y.toFixed(1)}`;
          }

          const chowkiLabel = isUTurn
            ? segment.winderType === '1-step'
              ? isUr
                ? 'سیڑھی چوکی'
                : 'LANDING'
              : segment.winderType === '2-step'
                ? isUr
                  ? '2-حصہ چوکی'
                  : 'SPLIT LANDING'
                : isUr
                  ? '3-سٹیپ چوکی'
                  : '3S LANDING'
            : segment.winderType === '1-step'
              ? isUr
                ? 'چوکی'
                : 'CHOWKI'
              : segment.winderType === '2-step'
                ? isUr
                  ? 'ونڈر 2S'
                  : '2S WINDER'
                : isUr
                  ? 'ونڈر 3S'
                  : '3S WINDER';

          return (
            <g
              key={segment.id}
              onClick={() => !isPrintMode && onSelectSegment?.(segment.id)}
              className={!isPrintMode ? 'cursor-pointer' : undefined}
            >
              {/* Base marble fill */}
              <polygon
                points={polyStr(outerCorners)}
                fill={isPrintMode ? '#ffffff' : marbleImageUrl ? `url(#${patternId})` : '#f8fafc'}
              />
              {/* Selected tint */}
              <polygon
                points={polyStr(outerCorners)}
                fill={isSelected ? 'rgba(245, 158, 11, 0.14)' : 'rgba(226, 232, 240, 0.35)'}
                stroke={isSelected ? '#d97706' : '#0f172a'}
                strokeWidth={(isSelected ? 2.2 : 1.4) * s}
              />

              {/* Diagonal Winder Cut Lines */}
              {diagLines.map((d) => {
                const isPolished = hasEdgeProfile && segment.edges[d.key];
                const hasRiser = segment.riser.enabled && segment.riser.edges[d.key];
                return (
                  <g key={d.key}>
                    <line
                      x1={d.a.x}
                      y1={d.a.y}
                      x2={d.b.x}
                      y2={d.b.y}
                      stroke={isPolished ? '#dc2626' : '#0f172a'}
                      strokeWidth={(isPolished ? 1.85 : 1.15) * s}
                    />
                    {hasRiser && (
                      <line
                        x1={d.a.x}
                        y1={d.a.y}
                        x2={d.b.x}
                        y2={d.b.y}
                        stroke="#d97706"
                        strokeWidth={1.15 * s}
                        strokeDasharray={`${2.6 * s} ${1.8 * s}`}
                      />
                    )}
                  </g>
                );
              })}

              {/* 4-Sided Edge Polish on Chowki outer sides */}
              {hasEdgeProfile && segment.edges.front && (
                <line x1={BL.x} y1={BL.y} x2={BR.x} y2={BR.y} stroke="#dc2626" strokeWidth={1.85 * s} />
              )}
              {hasEdgeProfile && segment.edges.back && (
                <line x1={TL.x} y1={TL.y} x2={TR.x} y2={TR.y} stroke="#dc2626" strokeWidth={1.85 * s} />
              )}
              {hasEdgeProfile && segment.edges.left && (
                <line x1={BL.x} y1={BL.y} x2={TL.x} y2={TL.y} stroke="#dc2626" strokeWidth={1.85 * s} />
              )}
              {hasEdgeProfile && segment.edges.right && (
                <line x1={BR.x} y1={BR.y} x2={TR.x} y2={TR.y} stroke="#dc2626" strokeWidth={1.85 * s} />
              )}

              {/* 4-Sided Riser dashed lines on Chowki outer sides */}
              {segment.riser.enabled && segment.riser.edges.front && (
                <line
                  x1={BL.x + F.x * (1.8 * s)}
                  y1={BL.y + F.y * (1.8 * s)}
                  x2={BR.x + F.x * (1.8 * s)}
                  y2={BR.y + F.y * (1.8 * s)}
                  stroke="#d97706"
                  strokeWidth={1.1 * s}
                  strokeDasharray={`${2.4 * s} ${1.6 * s}`}
                />
              )}
              {segment.riser.enabled && segment.riser.edges.back && (
                <line
                  x1={TL.x - F.x * (1.8 * s)}
                  y1={TL.y - F.y * (1.8 * s)}
                  x2={TR.x - F.x * (1.8 * s)}
                  y2={TR.y - F.y * (1.8 * s)}
                  stroke="#d97706"
                  strokeWidth={1.1 * s}
                  strokeDasharray={`${2.4 * s} ${1.6 * s}`}
                />
              )}
              {segment.riser.enabled && segment.riser.edges.left && (
                <line
                  x1={BL.x + R.x * (1.8 * s)}
                  y1={BL.y + R.y * (1.8 * s)}
                  x2={TL.x + R.x * (1.8 * s)}
                  y2={TL.y + R.y * (1.8 * s)}
                  stroke="#d97706"
                  strokeWidth={1.1 * s}
                  strokeDasharray={`${2.4 * s} ${1.6 * s}`}
                />
              )}
              {segment.riser.enabled && segment.riser.edges.right && (
                <line
                  x1={BR.x - R.x * (1.8 * s)}
                  y1={BR.y - R.y * (1.8 * s)}
                  x2={TR.x - R.x * (1.8 * s)}
                  y2={TR.y - R.y * (1.8 * s)}
                  stroke="#d97706"
                  strokeWidth={1.1 * s}
                  strokeDasharray={`${2.4 * s} ${1.6 * s}`}
                />
              )}

              {/* 4-Sided Latak strips on Chowki outer sides */}
              {segment.latak.front && renderLatakStrip(BL, BR, -F.x, -F.y, `c-latak-f-${segment.id}`)}
              {segment.latak.back && renderLatakStrip(TL, TR, F.x, F.y, `c-latak-b-${segment.id}`)}
              {segment.latak.left && renderLatakStrip(BL, TL, -R.x, -R.y, `c-latak-l-${segment.id}`)}
              {segment.latak.right && renderLatakStrip(BR, TR, R.x, R.y, `c-latak-r-${segment.id}`)}

              {/* AutoCAD Turn Walk Curve */}
              <path
                d={turnPath}
                fill="none"
                stroke="#334155"
                strokeWidth={0.95 * s}
                markerEnd="url(#cad-arrow)"
                className="pointer-events-none"
              />

              {/* Individual Winder Step Numbers inside each 2-step / 3-step sector */}
              {winderStepPts.map((wp) => (
                <text
                  key={`ws-${segment.id}-${wp.num}`}
                  x={wp.pt.x}
                  y={wp.pt.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={4.5 * s}
                  fontWeight="800"
                  fill="#1d4ed8"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  className="pointer-events-none select-none"
                >
                  #{wp.num}
                </text>
              ))}

              {/* Chowki label + step number badge */}
              <g className="pointer-events-none select-none">
                <rect
                  x={center.x - 13 * s}
                  y={center.y - 5.5 * s}
                  width={26 * s}
                  height={11 * s}
                  rx={2 * s}
                  fill="#ffffff"
                  fillOpacity={0.9}
                  stroke={isSelected ? '#d97706' : '#cbd5e1'}
                  strokeWidth={0.6 * s}
                />
                <text
                  x={center.x}
                  y={center.y - 1.2 * s}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={4.8 * s}
                  fontWeight="800"
                  fill="#0f172a"
                >
                  {chowkiLabel}
                </text>
                <text
                  x={center.x}
                  y={center.y + 3.2 * s}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={4.2 * s}
                  fontWeight="700"
                  fill="#475569"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  #{startStepNum}
                  {item.stepCount > 1 ? `-${startStepNum + item.stepCount - 1}` : ''}
                </text>
              </g>

              {/* Chowki Dimension Callout along Far Edge */}
              {renderDimension(
                TL,
                TR,
                F.x,
                F.y,
                10 * s,
                `${formatCadVal(segment.width, unit)} × ${formatCadVal(segment.length, unit)}`,
                `dim-chowki-${segment.id}`
              )}
            </g>
          );
        })}

        {/* Quiet total steps stamp inside diagram corner if multiple segments */}
        {totalSteps > 0 && items.length > 0 && (
          <g className="pointer-events-none select-none" opacity={0.001}>
            <title>{`Total ${totalSteps} Steps`}</title>
          </g>
        )}
      </svg>
    </div>
  );
};


