'use client';

import React from 'react';
import type { SinkCutout } from './vanity-designer';

type LayoutType = 'straight' | 'l-shape' | 'cut-corner' | null;

interface VanityLayoutProps {
  layout: LayoutType;
  dimensions: any;
  profileType: any;
  selectedEdges: Record<string, boolean>;
  onEdgeToggle: (edgeId: string) => void;
  marbleImageUrl?: string;
  sinks: SinkCutout[];
  backsplash: { back: boolean; left: boolean; right: boolean; height: string };
  lutak: { front: boolean; left: boolean; right: boolean; height: string };
  isPrintMode?: boolean;
  zoom?: number;
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
}

const UnitContext = React.createContext<'inches' | 'feet' | 'cm' | 'mm'>('inches');

const WavyLine: React.FC<{ d: string; vertical?: boolean }> = ({ d, vertical }) => {
  return (
    <path
      d={d}
      stroke="#D0021B"
      strokeWidth="1.5"
      fill="none"
      className="pointer-events-none wavy-line-print"
      style={{ vectorEffect: 'non-scaling-stroke' }}
    />
  );
};

const Edge: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  id: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled: boolean;
  isPrintMode?: boolean;
}> = ({ x1, y1, x2, y2, id, isSelected, onToggle, disabled, isPrintMode }) => {
  const clickableLineStyle: React.CSSProperties = {
    stroke: 'transparent',
    strokeWidth: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    vectorEffect: 'non-scaling-stroke',
  };

  const isVertical = x1 === x2;
  const offset = 5;
  
  let d = '';
  if (isVertical) {
      const length = Math.abs(y2 - y1);
      const numWaves = Math.max(1, Math.floor(length / 10));
      const waveLength = length / numWaves;
      const amplitude = 2.5;
      let path = `M ${x1 > 0 ? x1 + offset : x1 - offset} ${y1}`;
      for (let i = 0; i < numWaves; i++) {
          path += ` q ${amplitude * (i % 2 === 0 ? 1 : -1)} ${waveLength / 2}, 0 ${waveLength}`;
      }
      d = path;
  } else {
      const length = Math.abs(x2 - x1);
      const numWaves = Math.max(1, Math.floor(length / 10));
      const waveLength = length / numWaves;
      const amplitude = 2.5;
      let path = `M ${x1} ${y1 > 0 ? y1 + offset : y1 - offset}`;
      for (let i = 0; i < numWaves; i++) {
          path += ` q ${waveLength / 2} ${amplitude * (i % 2 === 0 ? 1 : -1)}, ${waveLength} 0`;
      }
      d = path;
  }

  return (
    <g className="hover:opacity-100 opacity-70 transition-opacity">
        {!isPrintMode && <line x1={x1} y1={y1} x2={x2} y2={y2} style={clickableLineStyle} onClick={() => !disabled && onToggle(id)} />}
        {isSelected && <WavyLine d={d} vertical={isVertical} />}
    </g>
  );
};

const LabelComponent: React.FC<{x: number, y: number, text: string}> = ({x, y, text}) => {
    const unit = React.useContext(UnitContext);
    const unitSymbol = unit === 'inches' ? '"' : unit === 'feet' ? "'" : unit === 'cm' ? 'cm' : 'mm';
    const formattedText = text.replace(/"/g, unitSymbol);
    return (
        <text x={x} y={y} fontSize="10" fontWeight="bold" fill="black" textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none', vectorEffect: 'non-scaling-stroke', opacity: 0.6}}>
            {formattedText}
        </text>
    );
};

const DimensionComponent: React.FC<{ x: number, y: number, rotation: number, text: string }> = ({ x, y, rotation, text }) => {
    const unit = React.useContext(UnitContext);
    const textOffset = 10;
    const lineOffset = 5;
    const unitSymbol = unit === 'inches' ? '"' : unit === 'feet' ? "'" : unit === 'cm' ? 'cm' : 'mm';
    const formattedText = text.replace(/"/g, unitSymbol);
    
    const parts = text.split('"')[0].split('x')[0];
    const length = parseFloat(parts) || 50;
    
    return (
        <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
            <line x1={-length/2} y1={textOffset} x2={length/2} y2={textOffset} stroke="black" strokeWidth="0.5" />
            <line x1={-length/2} y1={lineOffset} x2={-length/2} y2={textOffset} stroke="black" strokeWidth="0.5" />
            <line x1={length/2} y1={lineOffset} x2={length/2} y2={textOffset} stroke="black" strokeWidth="0.5" />
            <path d={`M ${-length/2 + 3},${textOffset - 2} L ${-length/2},${textOffset} L ${-length/2 + 3},${textOffset + 2}`} fill="none" stroke="black" strokeWidth="0.5" />
            <path d={`M ${length/2 - 3},${textOffset - 2} L ${length/2},${textOffset} L ${length/2 - 3},${textOffset + 2}`} fill="none" stroke="black" strokeWidth="0.5" />
            <text x="0" y={textOffset + 8} fontSize="8" fill="black" textAnchor="middle" dominantBaseline="middle">{formattedText}</text>
        </g>
    );
}

export function VanityLayout({ 
    layout, 
    dimensions, 
    profileType, 
    selectedEdges, 
    onEdgeToggle, 
    marbleImageUrl, sinks,
    backsplash,
    lutak,
    isPrintMode = false,
    zoom = 1,
    unit = 'inches',
}: VanityLayoutProps) {
  const patternId = React.useMemo(() => `marble-pattern-vanity-${Math.random().toString(36).substr(2, 9)}`, []);
  const backsplashPatternId = React.useMemo(() => `backsplash-pattern-vanity-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!layout || !dimensions) {
    return <p className="text-muted-foreground text-center">Layout preview will appear here.</p>;
  }

  const renderLayout = () => {
    let mainPathData = '';
    let backsplashPieces: React.ReactNode[] = [];
    let lutakPieces: React.ReactNode[] = [];
    let edgeLines: React.ReactNode[] = [];
    let layoutLabels: React.ReactNode[] = [];
    
    const { width: rawWidth = 0, length: rawLength = 0, lShapeSideA: rawSideA = 0, lShapeSideB: rawSideB = 0, cutCornerX: rawCutX = 0, cutCornerY: rawCutY = 0 } = dimensions;
    const width = parseFloat(String(rawWidth)) || 0;
    const length = parseFloat(String(rawLength)) || 0;
    const sideA = parseFloat(String(rawSideA)) || 0;
    const sideB = parseFloat(String(rawSideB)) || 0;
    const cutX = parseFloat(String(rawCutX)) || 0;
    const cutY = parseFloat(String(rawCutY)) || 0;

    const isProfilingDisabled = profileType === 'none';
    const backsplashHeight = parseFloat(backsplash.height) || 0;
    const lutakHeight = parseFloat(lutak.height) || 0;
    const pieceOffset = 10;
    
    let contentBBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const updateBBox = (x: number, y: number) => {
        contentBBox.minX = Math.min(contentBBox.minX, x);
        contentBBox.minY = Math.min(contentBBox.minY, y);
        contentBBox.maxX = Math.max(contentBBox.maxX, x);
        contentBBox.maxY = Math.max(contentBBox.maxY, y);
    };

    const hasTexture = !!(marbleImageUrl && marbleImageUrl.trim() !== "");

    switch (layout) {
      case 'straight': {
        if (length <= 0 || width <= 0) return null;
        mainPathData = `M0,0 H${length} V${width} H0 V0 Z`;
        updateBBox(length, width);
        edgeLines = [
          <Edge key="s_front" id="straight_front" x1={0} y1={width} x2={length} y2={width} isSelected={!!selectedEdges['straight_front']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || !lutak.front} isPrintMode={isPrintMode} />,
          <Edge key="s_left" id="straight_left" x1={0} y1={0} x2={0} y2={width} isSelected={!!selectedEdges['straight_left']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || backsplash.left || !lutak.left} isPrintMode={isPrintMode} />,
          <Edge key="s_right" id="straight_right" x1={length} y1={0} x2={length} y2={width} isSelected={!!selectedEdges['straight_right']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || backsplash.right || !lutak.right} isPrintMode={isPrintMode} />,
        ];

        if (backsplash.back) {
          backsplashPieces.push(<g key="bs_back"><rect x={0} y={-backsplashHeight-pieceOffset} width={length} height={backsplashHeight} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length/2} y={-backsplashHeight-pieceOffset} rotation={0} text={`${length}"x${backsplashHeight}"`} /></g>);
          updateBBox(length, -backsplashHeight - pieceOffset);
        }
        if (backsplash.left) {
            backsplashPieces.push(<g key="bs_left"><rect x={-backsplashHeight-pieceOffset} y={0} width={backsplashHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={-backsplashHeight-pieceOffset+backsplashHeight/2} y={width/2} rotation={90} text={`${width}"x${backsplashHeight}"`} /></g>);
            updateBBox(-backsplashHeight - pieceOffset, width);
        }
        if (backsplash.right) {
            backsplashPieces.push(<g key="bs_right"><rect x={length + pieceOffset} y={0} width={backsplashHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length + pieceOffset+backsplashHeight/2} y={width/2} rotation={-90} text={`${width}"x${backsplashHeight}"`} /></g>);
            updateBBox(length + backsplashHeight + pieceOffset, width);
        }
        if (lutak.front) {
          lutakPieces.push(<g key="lutak_front"><rect x={0} y={width + pieceOffset} width={length} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length/2} y={width + pieceOffset} rotation={0} text={`${length}"x${lutakHeight}"`} /></g>);
          updateBBox(length, width + lutakHeight + pieceOffset);
        }
        if (lutak.left) {
            lutakPieces.push(<g key="lutak_left"><rect x={-lutakHeight - pieceOffset} y={0} width={lutakHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={-lutakHeight-pieceOffset+lutakHeight/2} y={width/2} rotation={90} text={`${width}"x${lutakHeight}"`} /></g>);
            updateBBox(-lutakHeight - pieceOffset, width);
        }
        if (lutak.right) {
            lutakPieces.push(<g key="lutak_right"><rect x={length + pieceOffset} y={0} width={lutakHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length+pieceOffset+lutakHeight/2} y={width/2} rotation={-90} text={`${width}"x${lutakHeight}"`} /></g>);
            updateBBox(length + lutakHeight + pieceOffset, width);
        }
        layoutLabels.push(<LabelComponent key="label_main" x={length / 2} y={width / 2} text={`${width}" x ${length}"`} />);
        break;
      }
      case 'l-shape': {
        if (sideA <= 0 || sideB <= 0 || width <= 0) return null;
        mainPathData = `M0,0 H${sideA} V${width} H${width} V${sideB} H0 V0 Z`;
        updateBBox(sideA, sideB);
        edgeLines = [
            <Edge key="l_front_a" id="l_shape_front_a" x1={width} y1={width} x2={sideA} y2={width} isSelected={!!selectedEdges['l_shape_front_a']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || !lutak.front} isPrintMode={isPrintMode} />,
            <Edge key="l_front_b" id="l_shape_front_b" x1={width} y1={width} x2={width} y2={sideB} isSelected={!!selectedEdges['l_shape_front_b']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || !lutak.front} isPrintMode={isPrintMode} />,
            <Edge key="l_end_a" id="l_shape_end_a" x1={sideA} y1={0} x2={sideA} y2={width} isSelected={!!selectedEdges['l_shape_end_a']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || backsplash.right || !lutak.right} isPrintMode={isPrintMode} />,
            <Edge key="l_end_b" id="l_shape_end_b" x1={0} y1={sideB} x2={width} y2={sideB} isSelected={!!selectedEdges['l_shape_end_b']} onToggle={onEdgeToggle} disabled={isProfilingDisabled || !lutak.left} isPrintMode={isPrintMode} />,
        ];
        
         if (backsplash.back) {
          backsplashPieces.push(<g key="bs_back_l_a"><rect x={0} y={-backsplashHeight - pieceOffset} width={sideA} height={backsplashHeight} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={sideA/2} y={-backsplashHeight-pieceOffset} rotation={0} text={`${sideA}"x${backsplashHeight}"`} /></g>);
           updateBBox(sideA, -backsplashHeight - pieceOffset);
        }
        if (backsplash.left) {
          backsplashPieces.push(<g key="bs_left_l"><rect x={-backsplashHeight - pieceOffset} y={0} width={backsplashHeight} height={sideB} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={-backsplashHeight-pieceOffset+backsplashHeight/2} y={sideB/2} rotation={90} text={`${sideB}"x${backsplashHeight}"`} /></g>);
           updateBBox(-backsplashHeight - pieceOffset, sideB);
        }
        if (backsplash.right) {
            backsplashPieces.push(<g key="bs_right_l"><rect x={sideA + pieceOffset} y={0} width={backsplashHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={sideA+pieceOffset+backsplashHeight/2} y={width/2} rotation={-90} text={`${width}"x${backsplashHeight}"`} /></g>);
            updateBBox(sideA + backsplashHeight + pieceOffset, width);
        }
        if (lutak.front) {
          lutakPieces.push(<g key="lutak_front_a"><rect x={width} y={width + pieceOffset} width={sideA-width} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={width+(sideA-width)/2} y={width+pieceOffset} rotation={0} text={`${sideA-width}"x${lutakHeight}"`} /></g>);
          lutakPieces.push(<g key="lutak_front_b"><rect x={width+pieceOffset} y={width} width={sideB-width} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" transform={`translate(${width+pieceOffset},${width}) rotate(90) translate(0, ${-lutakHeight})`} /><DimensionComponent x={width+pieceOffset+lutakHeight/2} y={width+(sideB-width)/2} rotation={90} text={`${sideB-width}"x${lutakHeight}"`} /></g>);
          updateBBox(sideA, sideB + lutakHeight + pieceOffset);
        }
        if (lutak.left) {
          lutakPieces.push(<g key="lutak_left_l"><rect x={0} y={sideB+pieceOffset} width={width} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={width/2} y={sideB+pieceOffset} rotation={0} text={`${width}"x${lutakHeight}"`} /></g>);
           updateBBox(width, sideB + lutakHeight + pieceOffset);
        }
        if (lutak.right) {
          lutakPieces.push(<g key="lutak_right_l"><rect x={sideA + pieceOffset} y={0} width={lutakHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={sideA+pieceOffset+lutakHeight/2} y={width/2} rotation={-90} text={`${width}"x${lutakHeight}"`} /></g>);
          updateBBox(sideA + lutakHeight + pieceOffset, width);
        }
        layoutLabels.push(<LabelComponent key="label_a" x={(sideA+width)/2} y={width/2} text={`${width}" x ${sideA-width}"`} />);
        layoutLabels.push(<LabelComponent key="label_b" x={width/2} y={sideB/2} text={`${width}" x ${sideB}"`} />);
        break;
      }
      case 'cut-corner': {
        if (length <= 0 || width <= 0 || cutX <= 0 || cutY <= 0) return null;
        mainPathData = `M0,0 H${length - cutX} L${length},${cutY} V${width} H0 V0 Z`;
        updateBBox(length, width);
         edgeLines = [
          <Edge key="c_front" id="cut_corner_front" x1={0} y1={width} x2={length} y2={width} isSelected={!!selectedEdges['cut_corner_front']} onToggle={onEdgeToggle} disabled={isProfilingDisabled} isPrintMode={isPrintMode} />,
          <Edge key="c_left" id="cut_corner_left" x1={0} y1={0} x2={0} y2={width} isSelected={!!selectedEdges['cut_corner_left']} onToggle={onEdgeToggle} disabled={isProfilingDisabled} isPrintMode={isPrintMode} />,
          <Edge key="c_top_right" id="cut_corner_top_right" x1={length} y1={width} x2={length} y2={cutY} isSelected={!!selectedEdges['cut_corner_top_right']} onToggle={onEdgeToggle} disabled={isProfilingDisabled} isPrintMode={isPrintMode} />,
          <Edge key="c_cut" id="cut_corner_cut" x1={length - cutX} y1={0} x2={length} y2={cutY} isSelected={!!selectedEdges['cut_corner_cut']} onToggle={onEdgeToggle} disabled={isProfilingDisabled} isPrintMode={isPrintMode} />,
        ];
        
        if (backsplash.back) {
          backsplashPieces.push(<g key="bs_back_c"><rect x={0} y={-backsplashHeight-pieceOffset} width={length-cutX} height={backsplashHeight} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={(length-cutX)/2} y={-backsplashHeight-pieceOffset} rotation={0} text={`${length-cutX}"x${backsplashHeight}"`} /></g>);
          updateBBox(length - cutX, -backsplashHeight - pieceOffset);
        }
        if (backsplash.left) {
            backsplashPieces.push(<g key="bs_left_c"><rect x={-backsplashHeight-pieceOffset} y={0} width={backsplashHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={-backsplashHeight-pieceOffset+backsplashHeight/2} y={width/2} rotation={90} text={`${width}"x${backsplashHeight}"`} /></g>);
             updateBBox(-backsplashHeight - pieceOffset, width);
        }
        if (backsplash.right) {
            backsplashPieces.push(<g key="bs_right_c"><rect x={length + pieceOffset} y={cutY} width={backsplashHeight} height={width-cutY} fill={hasTexture && !isPrintMode ? `url(#${backsplashPatternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length+pieceOffset+backsplashHeight/2} y={cutY+(width-cutY)/2} rotation={-90} text={`${width-cutY}"x${backsplashHeight}"`} /></g>);
             updateBBox(length + backsplashHeight + pieceOffset, width);
        }
        const cutEdgeLength = Math.sqrt(cutX**2 + cutY**2);
        if (lutak.front) {
          lutakPieces.push(<g key="lutak_front_cut"><rect x={0} y={width+pieceOffset} width={length} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length/2} y={width+pieceOffset} rotation={0} text={`${length}"x${lutakHeight}"`} /></g>);
          lutakPieces.push(<g key="lutak_cut"><rect x={0} y={0} width={cutEdgeLength} height={lutakHeight} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" transform={`translate(${length-cutX}, 0) rotate(${Math.atan(cutY/cutX)*180/Math.PI}) translate(0, ${-lutakHeight-pieceOffset})`} /><DimensionComponent x={length - cutX/2} y={cutY/2-pieceOffset} rotation={Math.atan(cutY/cutX)*180/Math.PI} text={`${cutEdgeLength.toFixed(1)}x${lutakHeight}`} /></g>);
          updateBBox(length, width + lutakHeight + pieceOffset);
        }
        if (lutak.left) {
          lutakPieces.push(<g key="lutak_left_c"><rect x={-lutakHeight - pieceOffset} y={0} width={lutakHeight} height={width} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={-lutakHeight-pieceOffset+lutakHeight/2} y={width/2} rotation={90} text={`${width}"x${lutakHeight}"`} /></g>);
          updateBBox(-lutakHeight - pieceOffset, width);
        }
        if (lutak.right) {
          lutakPieces.push(<g key="lutak_right_c"><rect x={length + pieceOffset} y={cutY} width={lutakHeight} height={width-cutY} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : 'white'} stroke="black" strokeWidth="1.5" /><DimensionComponent x={length+pieceOffset+lutakHeight/2} y={cutY+(width-cutY)/2} rotation={-90} text={`${width-cutY}"x${lutakHeight}"`} /></g>);
          updateBBox(length + lutakHeight + pieceOffset, width-cutY);
        }
        layoutLabels.push(<LabelComponent key="label_main" x={length / 2} y={width / 2} text={`${width}" x ${length}"`} />);
        break;
      }
      default:
        return null;
    }
    
    const contentWidth = contentBBox.maxX - contentBBox.minX;
    const contentHeight = contentBBox.maxY - contentBBox.minY;
    
    if (contentWidth <= 0 || contentHeight <= 0) {
      return <p className="text-muted-foreground text-center">Please enter valid dimensions.</p>;
    }
    
    const padding = 40;

    const sinkElements = (sinks || []).map(sink => {
      const w = parseFloat(sink.width) || 0;
      let l = parseFloat(sink.length) || 0;
      
      const align = sink.alignment || 'centered';
      const vanityWidth = parseFloat(dimensions.width) || 0;
      const vanityLength = parseFloat(layout === 'l-shape' ? dimensions.lShapeSideA : dimensions.length) || 0;
      
      const x = Math.max(0, (vanityLength - w) / 2);
      
      let y = parseFloat(sink.y) || 0;
      if (align === 'centered') {
        y = Math.max(0, (vanityWidth - l) / 2);
      } else if (align === 'up') {
        let margin = 2.5; // inches
        if (unit === 'feet') margin = 2.5 / 12;
        else if (unit === 'cm') margin = 2.5 * 2.54;
        else if (unit === 'mm') margin = 2.5 * 25.4;
        y = margin;
      } else if (align === 'down') {
        let margin = 2.5; // inches
        if (unit === 'feet') margin = 2.5 / 12;
        else if (unit === 'cm') margin = 2.5 * 2.54;
        else if (unit === 'mm') margin = 2.5 * 25.4;
        y = Math.max(0, vanityWidth - l - margin);
      }
      
      const strokeColor = sink.type === 'undermount' ? '#0066cc' : '#FFD700';
      const strokeDash = sink.type === 'undermount' ? "4 2" : "0";

      if (sink.shape === 'circle') {
          l = w;
          return <circle key={sink.id} cx={x + w/2} cy={y + l/2} r={w/2} fill={isPrintMode ? 'white' : 'rgba(255,255,255,0.3)'} stroke={isPrintMode ? 'black' : strokeColor} strokeWidth="2" strokeDasharray={strokeDash} style={{vectorEffect: 'non-scaling-stroke'}} />
      }

      return (
        <rect
          key={sink.id}
          x={x}
          y={y}
          width={w}
          height={l}
          fill={isPrintMode ? 'white' : 'rgba(255,255,255,0.3)'}
          stroke={isPrintMode ? 'black' : strokeColor}
          strokeWidth="2"
          strokeDasharray={strokeDash}
          style={{vectorEffect: 'non-scaling-stroke'}}
        />
      );
    });
    
    const viewBox = `${contentBBox.minX - padding} ${contentBBox.minY - padding} ${contentWidth + padding * 2} ${contentHeight + padding * 2}`;
    
    return (
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" >
            <defs>
              {hasTexture && !isPrintMode && (
                <pattern id={patternId} patternUnits="userSpaceOnUse" width="100" height="100">
                    <image href={marbleImageUrl || undefined} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              )}
              {hasTexture && !isPrintMode && (
                 <pattern id={backsplashPatternId} patternUnits="userSpaceOnUse" width="30" height="30">
                    <image href={marbleImageUrl || undefined} x="0" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              )}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="rgba(0,0,0,0.1)" floodOpacity="0.1"/>
            </filter>
        </defs>
        <g>
           <g>
            <g filter={isPrintMode ? undefined : "url(#shadow)"}>
                <path d={mainPathData} fill={hasTexture && !isPrintMode ? `url(#${patternId})` : '#f8f9fa'} stroke="black" strokeWidth={isPrintMode ? 2 : 1.5} style={{vectorEffect: 'non-scaling-stroke'}}/>
            </g>
            {backsplashPieces}
            {lutakPieces}
            <path d={mainPathData} fill="transparent" stroke="black" strokeWidth={isPrintMode ? 1.5 : 1} style={{vectorEffect: 'non-scaling-stroke'}} />
            
            {sinkElements}
            {layoutLabels}
            <g>{edgeLines}</g>
          </g>
        </g>
      </svg>
    );
  };
  
  return (
    <UnitContext.Provider value={unit}>
      <div className="relative w-full h-full flex items-center justify-center">
         <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center', width: '100%', height: '100%' }}>
          {renderLayout()}
        </div>
      </div>
    </UnitContext.Provider>
  );
}
