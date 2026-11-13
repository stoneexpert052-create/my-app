'use client';

import React from 'react';
import type { Cutout } from './kitchen-designer';

type LayoutType = 'straight' | 'l-shape-right' | 'l-shape-left' | 'u-shape';
type PieceData = { length: string; width: string; cutouts: Cutout[] };

interface KitchenLayoutProps {
  layout: LayoutType;
  dimensions: {
    top: PieceData;
    left: PieceData;
    right: PieceData;
    islands: { id: number; length: string; width: string; cutouts: Cutout[] }[];
  };
  textureUrl?: string;
  onEdgeToggle: (edgeId: string) => void;
  selectedEdges: Record<string, boolean>;
  isDimensioningMode?: boolean;
  isPrintMode?: boolean;
  onCutoutChange?: (id: string, props: Partial<Cutout>) => void;
  activeCutout?: Cutout | null;
  setActiveCutout?: (cutout: Cutout | null) => void;
  zoom?: number;
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
}

const WavyLine: React.FC<{ d: string }> = ({ d }) => (
  <path
    d={d}
    stroke="#D0021B"
    strokeWidth="2.5"
    fill="none"
    style={{ vectorEffect: 'non-scaling-stroke' }}
    className="wavy-line-print"
  />
);

const DimensionLine: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  text: string;
  offset?: number;
  idKey: string;
  textOnRight?: boolean;
  color?: string;
  isDashed?: boolean;
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
}> = ({ x1, y1, x2, y2, text, offset = 30, idKey, textOnRight = false, color = "#333", isDashed = false, unit }) => {
  if (!text || text === '0') return null;
  const isVertical = x1 === x2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  
  let lx1, ly1, lx2, ly2, tx, ty, rot;
  const tickSize = 6;

  const getUnitSymbol = (u?: string) => {
    if (!u || u === 'inches') return '"';
    if (u === 'feet') return "'";
    return ` ${u}`;
  };

  if (isVertical) {
    const finalOffset = textOnRight ? offset : -offset;
    lx1 = lx2 = x1 + finalOffset;
    ly1 = y1;
    ly2 = y2;
    tx = lx1 + (textOnRight ? 8 : -8);
    ty = my;
    rot = -90;
  } else {
    const finalOffset = textOnRight ? offset : -offset;
    lx1 = x1;
    lx2 = x2;
    ly1 = ly2 = y1 + finalOffset;
    tx = mx;
    ty = ly1 + (textOnRight ? 8 : -8);
    rot = 0;
  }

  return (
    <g key={idKey} className="pointer-events-none">
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={color} strokeWidth="1" strokeDasharray={isDashed ? "2 2" : "none"} />
      <line x1={x1} y1={y1} x2={lx1} y2={ly1} stroke="#ccc" strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1={x2} y1={y2} x2={lx2} y2={ly2} stroke="#ccc" strokeWidth="0.5" strokeDasharray="2 2" />
      
      {isVertical ? (
        <>
          <line x1={lx1 - tickSize} y1={ly1} x2={lx1 + tickSize} y2={ly1} stroke={color} strokeWidth="1" />
          <line x1={lx1 - tickSize} y1={ly2} x2={lx1 + tickSize} y2={ly2} stroke={color} strokeWidth="1" />
        </>
      ) : (
        <>
          <line x1={lx1} y1={ly1 - tickSize} x2={lx1} y2={ly1 + tickSize} stroke={color} strokeWidth="1" />
          <line x1={lx2} y1={ly2 - tickSize} x2={lx2} y2={ly2 + tickSize} stroke={color} strokeWidth="1" />
        </>
      )}
      <text
        x={tx} y={ty}
        fontSize="9"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={rot !== 0 ? `rotate(${rot} ${tx} ${ty})` : ""}
        fill={color}
        fontWeight="bold"
      >
        {text}{getUnitSymbol(unit)}
      </text>
    </g>
  );
};

const Edge: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  id: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
  length: number;
  isPrintMode?: boolean;
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
}> = ({ x1, y1, x2, y2, id, isSelected, onToggle, disabled, length, isPrintMode, unit }) => {
  const isVertical = x1 === x2;
  const offset = 4;
  
  const getUnitSymbol = (u?: string) => {
    if (!u || u === 'inches') return '"';
    if (u === 'feet') return "'";
    return ` ${u}`;
  };

  let d = '';
  const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const numWaves = Math.max(1, Math.floor(len / 8));
  const waveLen = len / numWaves;
  const amplitude = 2;

  if (isVertical) {
    let path = `M ${x1 + (x1 > 0 ? offset : -offset)} ${Math.min(y1, y2)}`;
    for (let i = 0; i < numWaves; i++) {
      path += ` q ${amplitude * (i % 2 === 0 ? 1 : -1)} ${waveLen / 2}, 0 ${waveLen}`;
    }
    d = path;
  } else {
    let path = `M ${Math.min(x1, x2)} ${y1 + (y1 > 0 ? offset : -offset)}`;
    for (let i = 0; i < numWaves; i++) {
      path += ` q ${waveLen / 2} ${amplitude * (i % 2 === 0 ? 1 : -1)}, ${waveLen} 0`;
    }
    d = path;
  }

  return (
    <g className="group">
      {!isPrintMode && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent"
          strokeWidth="15"
          className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
          onClick={(e) => { e.stopPropagation(); if(!disabled) onToggle(id); }}
        />
      )}
      {isSelected && (
        <>
          <WavyLine d={d} />
          <text 
            x={isVertical ? x1 + (x1 > 0 ? offset + 12 : -offset - 12) : (x1 + x2) / 2} 
            y={isVertical ? (y1 + y2) / 2 : y1 + (y1 > 0 ? offset + 10 : -offset - 10)} 
            fontSize="8" 
            fontWeight="bold" 
            fill="#D0021B" 
            textAnchor="middle" 
            dominantBaseline="middle"
            transform={isVertical ? `rotate(-90 ${x1 + (x1 > 0 ? offset + 12 : -offset - 12)},${(y1 + y2) / 2})` : ""}
          >
            {length.toFixed(1)}{getUnitSymbol(unit)}
          </text>
        </>
      )}
    </g>
  );
};

export function KitchenLayout({ 
  layout, 
  dimensions, 
  textureUrl, 
  onEdgeToggle, 
  selectedEdges = {}, 
  isDimensioningMode = false, 
  isPrintMode = false, 
  activeCutout, 
  setActiveCutout, 
  zoom = 1, 
  onCutoutChange,
  unit
}: KitchenLayoutProps) {
  const patternId = React.useMemo(() => `kitchen-pattern-${Math.random().toString(36).substr(2, 9)}`, []);
  const { top, left, right, islands } = dimensions;

  const getUnitSymbol = (u?: string) => {
    if (!u || u === 'inches') return '"';
    if (u === 'feet') return "'";
    return ` ${u}`;
  };

  const tL = parseFloat(top.length) || 0;
  const tW = parseFloat(top.width) || 0;
  const lL = parseFloat(left.length) || 0;
  const lW = parseFloat(left.width) || 0;
  const rL = parseFloat(right.length) || 0;
  const rW = parseFloat(right.width) || 0;

  const renderPiece = (id: string, path: string, pData: { length: string; width: string; cutouts: Cutout[] }, transform: string = "", edges: React.ReactNode[] = [], dims: React.ReactNode[] = []) => {
    const hasTexture = !!(textureUrl && textureUrl.trim() !== "");
    const fill = hasTexture && !isPrintMode ? `url(#${patternId})` : '#f3f4f6';
    const isVerticalPiece = id === 'left' || id === 'right';

    return (
      <g key={`piece-group-${id}`} transform={transform}>
        <path d={path} fill={fill} stroke="#333" strokeWidth="1.5" />
        {(pData.cutouts || []).map(c => {
          const pieceWidth = parseFloat(pData.width) || 24;
          const rectX = isVerticalPiece ? (pieceWidth - c.depth) / 2 : c.x;
          const rectY = isVerticalPiece ? Math.max(0, c.x - tW) : (pieceWidth - c.depth) / 2;
          const rectW = isVerticalPiece ? c.depth : c.width;
          const rectH = isVerticalPiece ? c.width : c.depth;

          const pieceLength = parseFloat(pData.length) || 120;
          const isActive = activeCutout?.id === c.id;
          const remainingDist = Math.max(0, pieceLength - c.x - c.width);

          return (
            <g key={`cutout-group-${c.id}`}>
              <rect 
                  x={rectX} y={rectY} width={rectW} height={rectH} 
                  fill={isPrintMode ? 'white' : isActive ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255,255,255,0.75)'} 
                  stroke={isActive ? '#2563eb' : '#0066cc'} 
                  strokeWidth={isActive ? "2.5" : "1.5"} 
                  className="cursor-pointer transition-all"
                  onClick={(e) => { e.stopPropagation(); if (setActiveCutout) setActiveCutout(c); }}
              />
              <g className="pointer-events-none">
                <text 
                  x={rectX + rectW/2} y={rectY + rectH/2 - 4} 
                  fontSize="7" fontWeight="bold" fill="#0066cc" 
                  textAnchor="middle" dominantBaseline="middle"
                >
                  {c.type.toUpperCase()}: {c.width}{getUnitSymbol(unit)} x {c.depth}{getUnitSymbol(unit)}
                </text>
                <text 
                  x={rectX + rectW/2} y={rectY + rectH/2 + 5} 
                  fontSize="6.5" fontWeight="extrabold" fill="#d97706" 
                  textAnchor="middle" dominantBaseline="middle"
                >
                  Pos: {c.x.toFixed(1)}{getUnitSymbol(unit)}
                </text>
              </g>

              {isDimensioningMode && (
                <>
                  {!isVerticalPiece ? (
                    <>
                      {/* Distance from Left Corner to Cutout Start */}
                      <DimensionLine 
                        idKey={`dim-pos-${c.id}-start`} 
                        x1={0} y1={rectY + rectH/2} 
                        x2={rectX} y2={rectY + rectH/2} 
                        text={c.x.toFixed(1)} 
                        offset={-15} 
                        color="#0066cc"
                        isDashed={true}
                        unit={unit}
                      />
                      {/* Cutout Width */}
                      <DimensionLine 
                        idKey={`dim-pos-${c.id}-width`} 
                        x1={rectX} y1={rectY + rectH/2} 
                        x2={rectX + rectW} y2={rectY + rectH/2} 
                        text={c.width.toFixed(1)} 
                        offset={15} 
                        color="#2563eb"
                        isDashed={false}
                        unit={unit}
                      />
                      {/* Distance from Cutout End to Right Corner */}
                      {remainingDist > 0 && (
                        <DimensionLine 
                          idKey={`dim-pos-${c.id}-end`} 
                          x1={rectX + rectW} y1={rectY + rectH/2} 
                          x2={pieceLength} y2={rectY + rectH/2} 
                          text={remainingDist.toFixed(1)} 
                          offset={-15} 
                          color="#0066cc"
                          isDashed={true}
                          unit={unit}
                        />
                      )}
                      {/* Vertical offset to front */}
                      <DimensionLine 
                        idKey={`dim-pos-${c.id}-v`} 
                        x1={rectX + rectW/2} y1={0} 
                        x2={rectX + rectW/2} y2={rectY} 
                        text={rectY.toFixed(1)} 
                        offset={15} 
                        color="#0066cc"
                        isDashed={true}
                        textOnRight={true}
                        unit={unit}
                      />
                    </>
                  ) : (
                    <>
                      {/* Vertical wing cutout: distance from corner join to cutout start */}
                      <DimensionLine 
                        idKey={`dim-pos-${c.id}-v-start`} 
                        x1={rectX + rectW/2} y1={-tW} 
                        x2={rectX + rectW/2} y2={rectY} 
                        text={c.x.toFixed(1)} 
                        offset={15} 
                        color="#0066cc"
                        isDashed={true}
                        textOnRight={true}
                        unit={unit}
                      />
                      {/* Cutout length along wing */}
                      <DimensionLine 
                        idKey={`dim-pos-${c.id}-v-width`} 
                        x1={rectX + rectW/2} y1={rectY} 
                        x2={rectX + rectW/2} y2={rectY + rectH} 
                        text={c.width.toFixed(1)} 
                        offset={-15} 
                        color="#2563eb"
                        isDashed={false}
                        unit={unit}
                      />
                      {/* Distance from cutout end to wing end */}
                      {remainingDist > 0 && (
                        <DimensionLine 
                          idKey={`dim-pos-${c.id}-v-end`} 
                          x1={rectX + rectW/2} y1={rectY + rectH} 
                          x2={rectX + rectW/2} y2={pieceLength - tW} 
                          text={remainingDist.toFixed(1)} 
                          offset={15} 
                          color="#0066cc"
                          isDashed={true}
                          textOnRight={true}
                          unit={unit}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </g>
          );
        })}
        {edges}
        {dims}
        <text 
          x={parseFloat(pData.length)/2} 
          y={parseFloat(pData.width)/2} 
          fontSize="10" 
          fontWeight="bold" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="pointer-events-none opacity-40"
        >
          {pData.length}{getUnitSymbol(unit)} x {pData.width}{getUnitSymbol(unit)}
        </text>
      </g>
    );
  };

  const renderLayout = () => {
    let items: React.ReactNode[] = [];
    let bbox = { x1: 0, y1: 0, x2: 100, y2: 100 };

    if (layout === 'straight') {
        const edges = [
            <Edge key="t_f" id="top_front" x1={0} y1={tW} x2={tL} y2={tW} isSelected={!!selectedEdges['top_front']} onToggle={onEdgeToggle} length={tL} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="t_l" id="top_left" x1={0} y1={0} x2={0} y2={tW} isSelected={!!selectedEdges['top_left']} onToggle={onEdgeToggle} length={tW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="t_r" id="top_right" x1={tL} y1={0} x2={tL} y2={tW} isSelected={!!selectedEdges['top_right']} onToggle={onEdgeToggle} length={tW} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const dims = isDimensioningMode ? [
          <DimensionLine key="dim_t_l" idKey="dim_t_l" x1={0} y1={0} x2={tL} y2={0} text={top.length} offset={25} unit={unit} />,
          <DimensionLine key="dim_t_w" idKey="dim_t_w" x1={0} y1={0} x2={0} y2={tW} text={top.width} offset={25} unit={unit} />
        ] : [];
        items.push(renderPiece('top', `M0 0 H${tL} V${tW} H0 Z`, top, "", edges, dims));
        bbox = { x1: -60, y1: -60, x2: tL + 60, y2: tW + 60 };
    } else if (layout === 'l-shape-right') {
        const tEdges = [
            <Edge key="t_f" id="top_front" x1={0} y1={tW} x2={tL-rW} y2={tW} isSelected={!!selectedEdges['top_front']} onToggle={onEdgeToggle} length={tL-rW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="t_l" id="top_left" x1={0} y1={0} x2={0} y2={tW} isSelected={!!selectedEdges['top_left']} onToggle={onEdgeToggle} length={tW} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const rEdges = [
            <Edge key="r_f" id="right_front" x1={0} y1={0} x2={0} y2={rL-tW} isSelected={!!selectedEdges['right_front']} onToggle={onEdgeToggle} length={rL-tW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="r_e" id="right_end" x1={0} y1={rL-tW} x2={rW} y2={rL-tW} isSelected={!!selectedEdges['right_end']} onToggle={onEdgeToggle} length={rW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="r_r" id="right_right" x1={rW} y1={-tW} x2={rW} y2={rL-tW} isSelected={!!selectedEdges['right_right']} onToggle={onEdgeToggle} length={rL} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const tDims = isDimensioningMode ? [
          <DimensionLine key="dim_t_l" idKey="dim_t_l" x1={0} y1={0} x2={tL} y2={0} text={top.length} offset={25} unit={unit} />,
          <DimensionLine key="dim_t_w" idKey="dim_t_w" x1={0} y1={0} x2={0} y2={tW} text={top.width} offset={25} unit={unit} />
        ] : [];
        const rDims = isDimensioningMode ? [
          <DimensionLine key="dim_r_l" idKey="dim_r_l" x1={rW} y1={-tW} x2={rW} y2={rL-tW} text={right.length} offset={25} textOnRight={true} unit={unit} />,
          <DimensionLine key="dim_r_w" idKey="dim_r_w" x1={0} y1={rL-tW} x2={rW} y2={rL-tW} text={right.width} offset={25} textOnRight={true} unit={unit} />
        ] : [];

        items.push(renderPiece('top', `M0 0 H${tL} V${tW} H0 Z`, top, "", tEdges, tDims));
        items.push(renderPiece('right', `M0 0 H${rW} V${rL-tW} H0 Z`, right, `translate(${tL-rW}, ${tW})`, rEdges, rDims));
        bbox = { x1: -60, y1: -60, x2: tL + 80, y2: Math.max(tW, rL) + 80 };
    } else if (layout === 'l-shape-left') {
        const tEdges = [
            <Edge key="t_f" id="top_front" x1={lW} y1={tW} x2={tL} y2={tW} isSelected={!!selectedEdges['top_front']} onToggle={onEdgeToggle} length={tL-lW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="t_r" id="top_right" x1={tL} y1={0} x2={tL} y2={tW} isSelected={!!selectedEdges['top_right']} onToggle={onEdgeToggle} length={tW} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const lEdges = [
            <Edge key="l_f" id="left_front" x1={lW} y1={0} x2={lW} y2={lL-tW} isSelected={!!selectedEdges['left_front']} onToggle={onEdgeToggle} length={lL-tW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="l_e" id="left_end" x1={0} y1={lL-tW} x2={lW} y2={lL-tW} isSelected={!!selectedEdges['left_end']} onToggle={onEdgeToggle} length={lW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="l_l" id="left_left" x1={0} y1={-tW} x2={0} y2={lL-tW} isSelected={!!selectedEdges['left_left']} onToggle={onEdgeToggle} length={lL} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const tDims = isDimensioningMode ? [
          <DimensionLine key="dim_t_l" idKey="dim_t_l" x1={0} y1={0} x2={tL} y2={0} text={top.length} offset={25} unit={unit} />,
          <DimensionLine key="dim_t_r_w" idKey="dim_t_r_w" x1={tL} y1={0} x2={tL} y2={tW} text={top.width} offset={25} textOnRight={true} unit={unit} />
        ] : [];
        const lDims = isDimensioningMode ? [
          <DimensionLine key="dim_l_l" idKey="dim_l_l" x1={0} y1={-tW} x2={0} y2={lL-tW} text={left.length} offset={25} unit={unit} />,
          <DimensionLine key="dim_l_w" idKey="dim_l_w" x1={0} y1={lL-tW} x2={lW} y2={lL-tW} text={left.width} offset={25} textOnRight={true} unit={unit} />
        ] : [];

        items.push(renderPiece('top', `M0 0 H${tL} V${tW} H0 Z`, top, "", tEdges, tDims));
        items.push(renderPiece('left', `M0 0 H${lW} V${lL-tW} H0 Z`, left, `translate(0, ${tW})`, lEdges, lDims));
        bbox = { x1: -80, y1: -60, x2: tL + 60, y2: Math.max(tW, lL) + 80 };
    } else if (layout === 'u-shape') {
        const tEdges = [
            <Edge key="t_f" id="top_front" x1={lW} y1={tW} x2={tL-rW} y2={tW} isSelected={!!selectedEdges['top_front']} onToggle={onEdgeToggle} length={tL-lW-rW} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const lEdges = [
            <Edge key="l_f" id="left_front" x1={lW} y1={0} x2={lW} y2={lL-tW} isSelected={!!selectedEdges['left_front']} onToggle={onEdgeToggle} length={lL-tW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="l_e" id="left_end" x1={0} y1={lL-tW} x2={lW} y2={lL-tW} isSelected={!!selectedEdges['left_end']} onToggle={onEdgeToggle} length={lW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="l_l" id="left_left" x1={0} y1={-tW} x2={0} y2={lL-tW} isSelected={!!selectedEdges['left_left']} onToggle={onEdgeToggle} length={lL} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const rEdges = [
            <Edge key="r_f" id="right_front" x1={0} y1={0} x2={0} y2={rL-tW} isSelected={!!selectedEdges['right_front']} onToggle={onEdgeToggle} length={rL-tW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="r_e" id="right_end" x1={0} y1={rL-tW} x2={rW} y2={rL-tW} isSelected={!!selectedEdges['right_end']} onToggle={onEdgeToggle} length={rW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key="r_r" id="right_right" x1={rW} y1={-tW} x2={rW} y2={rL-tW} isSelected={!!selectedEdges['right_right']} onToggle={onEdgeToggle} length={rL} isPrintMode={isPrintMode} unit={unit} />,
        ];

        const tDims = isDimensioningMode ? [
          <DimensionLine key="dim_t_l" idKey="dim_t_l" x1={0} y1={0} x2={tL} y2={0} text={top.length} offset={25} unit={unit} />
        ] : [];
        const lDims = isDimensioningMode ? [
          <DimensionLine key="dim_l_l" idKey="dim_l_l" x1={0} y1={-tW} x2={0} y2={lL-tW} text={left.length} offset={25} unit={unit} />,
          <DimensionLine key="dim_l_w" idKey="dim_l_w" x1={0} y1={lL-tW} x2={lW} y2={lL-tW} text={left.width} offset={25} textOnRight={true} unit={unit} />
        ] : [];
        const rDims = isDimensioningMode ? [
          <DimensionLine key="dim_r_l" idKey="dim_r_l" x1={rW} y1={-tW} x2={rW} y2={rL-tW} text={right.length} offset={25} textOnRight={true} unit={unit} />,
          <DimensionLine key="dim_r_w" idKey="dim_r_w" x1={0} y1={rL-tW} x2={rW} y2={rL-tW} text={right.width} offset={25} textOnRight={true} unit={unit} />
        ] : [];

        items.push(renderPiece('top', `M0 0 H${tL} V${tW} H0 Z`, top, "", tEdges, tDims));
        items.push(renderPiece('left', `M0 0 H${lW} V${lL-tW} H0 Z`, left, `translate(0, ${tW})`, lEdges, lDims));
        items.push(renderPiece('right', `M0 0 H${rW} V${rL-tW} H0 Z`, right, `translate(${tL-rW}, ${tW})`, rEdges, rDims));
        bbox = { x1: -80, y1: -60, x2: tL + 80, y2: Math.max(tW, lL, rL) + 80 };
    }

    (islands || []).forEach((isl, i) => {
        const iL = parseFloat(isl.length) || 0;
        const iW = parseFloat(isl.width) || 0;
        const yOff = bbox.y2 + 40;
        const iEdges = [
            <Edge key={`isl-${i}-t`} id={`island_${isl.id}_top`} x1={0} y1={0} x2={iL} y2={0} isSelected={!!selectedEdges[`island_${isl.id}_top`]} onToggle={onEdgeToggle} length={iL} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key={`isl-${i}-b`} id={`island_${isl.id}_bottom`} x1={0} y1={iW} x2={iL} y2={iW} isSelected={!!selectedEdges[`island_${isl.id}_bottom`]} onToggle={onEdgeToggle} length={iL} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key={`isl-${i}-l`} id={`island_${isl.id}_left`} x1={0} y1={0} x2={0} y2={iW} isSelected={!!selectedEdges[`island_${isl.id}_left`]} onToggle={onEdgeToggle} length={iW} isPrintMode={isPrintMode} unit={unit} />,
            <Edge key={`isl-${i}-r`} id={`island_${isl.id}_right`} x1={iL} y1={0} x2={iL} y2={iW} isSelected={!!selectedEdges[`island_${isl.id}_right`]} onToggle={onEdgeToggle} length={iW} isPrintMode={isPrintMode} unit={unit} />,
        ];
        const iDims = isDimensioningMode ? [
          <DimensionLine key={`dim_isl_${i}_l`} idKey={`dim_isl_${i}_l`} x1={0} y1={0} x2={iL} y2={0} text={isl.length} offset={20} unit={unit} />,
          <DimensionLine key={`dim_isl_${i}_w`} idKey={`dim_isl_${i}_w`} x1={0} y1={0} x2={0} y2={iW} text={isl.width} offset={20} unit={unit} />
        ] : [];
        items.push(renderPiece(`isl-${i}`, `M0 0 H${iL} V${iW} H0 Z`, {length: isl.length, width: isl.width, cutouts: isl.cutouts || []}, `translate(0, ${yOff})`, iEdges, iDims));
        
        bbox.y2 = yOff + iW + 60;
        bbox.x2 = Math.max(bbox.x2, iL + 60);
    });

    return (
        <svg viewBox={`${bbox.x1} ${bbox.y1} ${bbox.x2 - bbox.x1} ${bbox.y2 - bbox.y1}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
                {!!(textureUrl && textureUrl.trim() !== "") && !isPrintMode && (
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={textureUrl || undefined} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                    </pattern>
                )}
            </defs>
            <g>{items}</g>
        </svg>
    );
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center', width: '100%', height: '100%' }}>
        {renderLayout()}
      </div>
    </div>
  );
}
