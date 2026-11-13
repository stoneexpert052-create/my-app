'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  X,
  Plus,
  ArrowLeftRight,
  ArrowUpDown,
  Minimize2,
  Maximize2,
  Move,
  Sliders,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
} from 'lucide-react';

export type CadBarId =
  | 'preset_bar'
  | 'voice_cmd_bar'
  | 'kpi_bar'
  | 'cad_tools_bar'
  | 'stock_pieces_dock';

export type CadBarDockPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'inside_diagram_1'
  | 'inside_diagram_2'
  | 'float';

export type CadBarScale = 'sm' | 'md' | 'lg';

export interface CadBarConfig {
  id: CadBarId;
  titleEn: string;
  titleUr: string;
  dock: CadBarDockPosition;
  insideCorner?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  orientation?: 'horizontal' | 'vertical';
  scale: CadBarScale;
  zoomPct?: number;
  rotationDeg?: number;
  widthPercent: number;
  floatX: number;
  floatY: number;
  floatWidth: number;
  locked: boolean;
  collapsed: boolean;
  visible: boolean;
}

export type CadScreenId =
  | 'step1_stock'
  | 'step2_pieces'
  | 'bookmatch_panel'
  | 'diagram_1'
  | 'diagram_2';

export interface CadScreenConfig {
  id: CadScreenId;
  titleEn: string;
  titleUr: string;
  minimized: boolean;
  maximized: boolean;
  widthPercent: number; // e.g. 50, 65, 100
  heightScale: 'sm' | 'md' | 'lg' | 'xl';
  order: number;
  isFloating: boolean;
  floatX: number;
  floatY: number;
  floatWidth: number;
}

export type CadWorkspaceState = {
  customizeMode: boolean;
  sidebarPosition: 'left' | 'right' | 'top' | 'bottom' | 'float';
  sidebarWidthPercent: number;
  sidebarZoomPct?: number;
  sidebarRotationDeg?: number;
  step1Collapsed: boolean;
  step2Collapsed: boolean;
  step1Visible?: boolean;
  step2Visible?: boolean;
  bars: Record<CadBarId, CadBarConfig>;
  screens?: Record<CadScreenId, CadScreenConfig>;
};

export const DEFAULT_CAD_SCREENS: Record<CadScreenId, CadScreenConfig> = {
  step1_stock: {
    id: 'step1_stock',
    titleEn: 'Screen 1: Slab Stock',
    titleUr: 'سکرین 1: سلیب اسٹاک',
    minimized: false,
    maximized: false,
    widthPercent: 100,
    heightScale: 'md',
    order: 1,
    isFloating: false,
    floatX: 20,
    floatY: 90,
    floatWidth: 440,
  },
  step2_pieces: {
    id: 'step2_pieces',
    titleEn: 'Screen 2: Cut Pieces',
    titleUr: 'سکرین 2: کٹنگ پیسز',
    minimized: false,
    maximized: false,
    widthPercent: 100,
    heightScale: 'md',
    order: 2,
    isFloating: false,
    floatX: 20,
    floatY: 420,
    floatWidth: 440,
  },
  bookmatch_panel: {
    id: 'bookmatch_panel',
    titleEn: 'Screen 3: Bookmatch Control Box',
    titleUr: 'سکرین 3: بک میچ سائز اور کنٹرول باکس',
    minimized: false,
    maximized: false,
    widthPercent: 100,
    heightScale: 'md',
    order: 1,
    isFloating: false,
    floatX: 120,
    floatY: 110,
    floatWidth: 920,
  },
  diagram_1: {
    id: 'diagram_1',
    titleEn: 'Screen 4: Slab Cutting Diagram #1',
    titleUr: 'سکرین 4: سلیب کٹنگ ڈایاگرام #1',
    minimized: false,
    maximized: false,
    widthPercent: 100,
    heightScale: 'lg',
    order: 2,
    isFloating: false,
    floatX: 80,
    floatY: 120,
    floatWidth: 980,
  },
  diagram_2: {
    id: 'diagram_2',
    titleEn: 'Screen 5: Category / Floor Diagram #2',
    titleUr: 'سکرین 5: فلورنگ / کیٹگری ڈایاگرام #2',
    minimized: false,
    maximized: false,
    widthPercent: 100,
    heightScale: 'lg',
    order: 3,
    isFloating: false,
    floatX: 100,
    floatY: 480,
    floatWidth: 980,
  },
};

export const DEFAULT_CAD_WORKSPACE_STATE: CadWorkspaceState = {
  customizeMode: false,
  sidebarPosition: 'left',
  sidebarWidthPercent: 32,
  sidebarZoomPct: 100,
  sidebarRotationDeg: 0,
  step1Collapsed: false,
  step2Collapsed: false,
  step1Visible: true,
  step2Visible: true,
  screens: DEFAULT_CAD_SCREENS,
  bars: {
    preset_bar: {
      id: 'preset_bar',
      titleEn: 'Category Buttons (Flooring, Bookmatch, Vanity...)',
      titleUr: 'کیٹگری بٹن بار (فرش، بک میچ، وینٹی، کچن، ونڈو سل)',
      dock: 'top',
      insideCorner: 'top_left',
      orientation: 'horizontal',
      scale: 'md',
      zoomPct: 100,
      rotationDeg: 0,
      widthPercent: 100,
      floatX: 40,
      floatY: 80,
      floatWidth: 860,
      locked: false,
      collapsed: false,
      visible: true,
    },
    voice_cmd_bar: {
      id: 'voice_cmd_bar',
      titleEn: 'Voice & Text Command Bar',
      titleUr: 'آواز اور ٹیکسٹ کمانڈ بار',
      dock: 'top',
      insideCorner: 'bottom_left',
      orientation: 'horizontal',
      scale: 'md',
      zoomPct: 100,
      rotationDeg: 0,
      widthPercent: 100,
      floatX: 60,
      floatY: 540,
      floatWidth: 820,
      locked: false,
      collapsed: false,
      visible: true,
    },
    kpi_bar: {
      id: 'kpi_bar',
      titleEn: 'Summary & Running Feet Bar',
      titleUr: 'رننگ فٹ اور مربع فٹ سمری بار',
      dock: 'top',
      insideCorner: 'top_right',
      orientation: 'horizontal',
      scale: 'md',
      zoomPct: 100,
      rotationDeg: 0,
      widthPercent: 100,
      floatX: 380,
      floatY: 140,
      floatWidth: 860,
      locked: false,
      collapsed: false,
      visible: true,
    },
    cad_tools_bar: {
      id: 'cad_tools_bar',
      titleEn: 'Slab Toggle & CAD Tools Buttons',
      titleUr: 'سلیب ٹوگل اور کیڈ ٹول بٹن',
      dock: 'top',
      insideCorner: 'top_left',
      orientation: 'horizontal',
      scale: 'md',
      zoomPct: 100,
      rotationDeg: 0,
      widthPercent: 100,
      floatX: 400,
      floatY: 220,
      floatWidth: 840,
      locked: false,
      collapsed: false,
      visible: true,
    },
    stock_pieces_dock: {
      id: 'stock_pieces_dock',
      titleEn: 'Stock & Pieces Sidebar',
      titleUr: 'اسٹاک اور پیسز سائیڈ بار',
      dock: 'left',
      insideCorner: 'top_left',
      orientation: 'vertical',
      scale: 'md',
      zoomPct: 100,
      rotationDeg: 0,
      widthPercent: 32,
      floatX: 24,
      floatY: 130,
      floatWidth: 420,
      locked: false,
      collapsed: false,
      visible: true,
    },
  },
};

interface AutoCadMovableBarProps {
  barId: CadBarId;
  workspace: CadWorkspaceState;
  onUpdateBar: (barId: CadBarId, patch: Partial<CadBarConfig>) => void;
  cadLang: 'en' | 'ur';
  children: React.ReactNode;
  className?: string;
  renderContext?: 'default' | 'inside_diagram_1' | 'inside_diagram_2' | 'bottom_dock';
}

export function AutoCadMovableBar({
  barId,
  workspace,
  onUpdateBar,
  cadLang,
  children,
  className = '',
  renderContext = 'default',
}: AutoCadMovableBarProps) {
  const bar = workspace.bars[barId] || DEFAULT_CAD_WORKSPACE_STATE.bars[barId];
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);

  const isVertical = bar.orientation === 'vertical';
  const isFloating = bar.dock === 'float';

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 600,
  });

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const maxX = typeof window !== 'undefined' ? Math.max(80, window.innerWidth - 60) : 1400;
        const maxY = typeof window !== 'undefined' ? Math.max(60, window.innerHeight - 40) : 900;
        onUpdateBar(barId, {
          floatX: Math.max(4, Math.min(maxX, dragRef.current.origX + dx)),
          floatY: Math.max(4, Math.min(maxY, dragRef.current.origY + dy)),
        });
      } else if (isResizing) {
        const dx = e.clientX - dragRef.current.startX;
        if (bar.dock === 'float') {
          const nextW = Math.max(180, Math.min(1500, dragRef.current.origW + dx));
          onUpdateBar(barId, { floatWidth: nextW });
        } else {
          const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
          const deltaPct = (dx / Math.max(400, screenW)) * 100;
          const nextPct = Math.max(25, Math.min(100, Math.round(dragRef.current.origW + deltaPct)));
          onUpdateBar(barId, { widthPercent: nextPct });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, barId, bar.dock, onUpdateBar]);

  // Only render in the matching dock slot!
  if (!bar.visible) {
    return null;
  }
  if (renderContext === 'default') {
    if (
      bar.dock === 'inside_diagram_1' ||
      bar.dock === 'inside_diagram_2' ||
      bar.dock === 'bottom'
    ) {
      return null;
    }
  } else if (renderContext === 'inside_diagram_1') {
    if (bar.dock !== 'inside_diagram_1') return null;
  } else if (renderContext === 'inside_diagram_2') {
    if (bar.dock !== 'inside_diagram_2') return null;
  } else if (renderContext === 'bottom_dock') {
    if (bar.dock !== 'bottom') return null;
  }

  const scaleClass =
    bar.scale === 'sm'
      ? 'text-[10px] [&_button]:py-0.5 [&_button]:px-1.5 [&_button]:text-[10px]'
      : bar.scale === 'lg'
      ? 'text-sm [&_button]:py-2 [&_button]:px-3.5 [&_button]:text-xs'
      : '';

  return (
    <div
      ref={containerRef}
      style={
        isFloating
          ? {
              position: 'fixed',
              left: `${bar.floatX}px`,
              top: `${bar.floatY}px`,
              width: isVertical ? 'auto' : `${bar.floatWidth}px`,
              maxWidth: '96vw',
              zIndex: 85,
            }
          : bar.widthPercent < 100
          ? {
              width: `${bar.widthPercent}%`,
            }
          : undefined
      }
      className={`group relative flex items-stretch ${
        isFloating
          ? 'rounded-lg border-2 border-amber-500/90 bg-slate-950/98 shadow-[0_16px_40px_rgba(0,0,0,0.85)]'
          : bar.dock === 'inside_diagram_1' || bar.dock === 'inside_diagram_2'
          ? 'rounded-lg border-2 border-sky-500/70 bg-slate-950/95 shadow-lg my-1.5'
          : ''
      } ${scaleClass} ${className}`}
    >
      {/* Left Grip Handle (Drag to Move + Place Inside/Outside Diagram + Horizontal/Vertical + Minimize) */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
          if (!isFloating) {
            const rect = containerRef.current?.getBoundingClientRect();
            const startLeft = rect ? Math.max(12, rect.left) : 60;
            const startTop = rect ? Math.max(12, rect.top) : 100;
            const startW = rect ? Math.min(1100, Math.max(260, rect.width)) : bar.floatWidth;
            onUpdateBar(barId, {
              dock: 'float',
              floatX: startLeft,
              floatY: startTop,
              floatWidth: startW,
            });
            dragRef.current = {
              startX: e.clientX,
              startY: e.clientY,
              origX: startLeft,
              origY: startTop,
              origW: startW,
            };
            setIsDragging(true);
            return;
          }
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: bar.floatX,
            origY: bar.floatY,
            origW: bar.floatWidth,
          };
          setIsDragging(true);
        }}
        className="flex flex-wrap sm:flex-col items-center justify-center gap-0.5 px-1.5 py-1 bg-slate-950 border-r border-slate-800 cursor-move select-none shrink-0 print:hidden"
        title={tr(
          'Drag to move bar anywhere · Or pick Inside Diagram #1, Inside Diagram #2, or Outside Top',
          'ماؤس سے پکڑ کر کہیں بھی رکھیں · یا ڈایاگرام کے اندر / باہر سیٹ کریں'
        )}
      >
        <div className="flex items-center gap-0.5">
          <GripVertical className="h-3.5 w-3.5 text-amber-400/90" />
          {/* Toggle Horizontal vs Vertical Orientation */}
          <button
            type="button"
            onClick={() =>
              onUpdateBar(barId, {
                dock: isVertical ? bar.dock : 'float',
                orientation: isVertical ? 'horizontal' : 'vertical',
                floatWidth: isVertical ? 820 : 230,
              })
            }
            className="p-0.5 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300"
            title={
              isVertical
                ? tr('Switch to Horizontal Bar (↔)', 'لمبی افقی بار بنائیں (↔)')
                : tr('Switch to Vertical Bar (↕)', 'کھڑی عمودی بار بنائیں (↕)')
            }
          >
            {isVertical ? (
              <ArrowLeftRight className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Quick Placement Selector: Outside Top, Inside Diagram 1, Inside Diagram 2, Float */}
        <select
          value={bar.dock}
          onChange={(e) => {
            const nextDock = e.target.value as CadBarDockPosition;
            onUpdateBar(barId, {
              dock: nextDock,
              orientation: 'horizontal',
              widthPercent: 100,
              collapsed: false,
            });
          }}
          className="h-4 px-0.5 rounded bg-slate-900 border border-slate-700 text-[8px] font-mono text-amber-300 cursor-pointer max-w-[68px]"
          title={tr(
            'Place buttons Outside or Inside Diagram #1 / #2',
            'بٹن باہر یا ڈایاگرام #1 / #2 کے اندر رکھیں'
          )}
        >
          <option value="top">{tr('⬆ Top', '⬆ باہر اوپر')}</option>
          <option value="inside_diagram_1">{tr('📐 In Diag 1', '📐 ڈایاگرام 1 اندر')}</option>
          <option value="inside_diagram_2">{tr('🏠 In Diag 2', '🏠 ڈایاگرام 2 اندر')}</option>
          <option value="bottom">{tr('⬇ Bottom', '⬇ باہر نیچے')}</option>
          <option value="float">{tr('✥ Float', '✥ فری ونڈو')}</option>
        </select>

        <div className="flex items-center gap-0.5">
          {/* Collapse / Minimize Bar content */}
          <button
            type="button"
            onClick={() => onUpdateBar(barId, { collapsed: !bar.collapsed })}
            className="px-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-[8px] font-bold"
            title={tr('Minimize / Expand this button bar', 'اس بٹن بار کو چھوٹا/منیمائز کریں')}
          >
            {bar.collapsed ? '□' : '_'}
          </button>

          {/* Hide / Remove Bar to Taskbar */}
          <button
            type="button"
            onClick={() => onUpdateBar(barId, { visible: false })}
            className="p-0.5 rounded hover:bg-rose-600 text-slate-500 hover:text-white transition-colors"
            title={tr('Minimize to Taskbar', 'ٹاسک بار میں چھپائیں')}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Bar Body (Automatically adapts when collapsed or vertical vs horizontal) */}
      {bar.collapsed ? (
        <div className="flex-1 px-3 py-1.5 bg-slate-900/95 flex items-center justify-between text-xs">
          <span className="font-bold text-amber-300 font-mono">
            {tr(bar.titleEn, bar.titleUr)} ({tr('Minimized', 'منیمائز شدہ')})
          </span>
          <button
            type="button"
            onClick={() => onUpdateBar(barId, { collapsed: false })}
            className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold"
          >
            {tr('□ Expand Buttons', '□ بٹن کھولیں')}
          </button>
        </div>
      ) : (
        <div
          className={`flex-1 min-w-0 ${
            isVertical ? '[&>div]:flex-col [&>div]:items-stretch [&>div>div]:flex-col' : ''
          }`}
        >
          {children}
        </div>
      )}

      {/* Simple Right-Edge / Corner Drag Handle to Stretch / Resize Bar */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: bar.floatX,
            origY: bar.floatY,
            origW: isFloating ? bar.floatWidth : bar.widthPercent,
          };
          setIsResizing(true);
        }}
        className="w-2.5 bg-slate-950 hover:bg-amber-500/80 border-l border-slate-800 cursor-ew-resize flex items-center justify-center text-[9px] text-slate-500 hover:text-slate-950 font-bold select-none shrink-0 print:hidden"
        title={tr(
          'Drag edge to stretch or shrink bar size',
          'ماؤس سے پکڑ کر بار چھوٹی یا لمبی کریں'
        )}
      >
        ⋮
      </div>
    </div>
  );
}

/**
 * Windows-Style Resizable / Minimizable / Movable Screen Window Header Strip
 */
interface CadWindowHeaderBarProps {
  screenId: CadScreenId;
  workspace: CadWorkspaceState;
  setWorkspace: React.Dispatch<React.SetStateAction<CadWorkspaceState>>;
  cadLang: 'en' | 'ur';
  extraRight?: React.ReactNode;
}

export function CadWindowHeaderBar({
  screenId,
  workspace,
  setWorkspace,
  cadLang,
  extraRight,
}: CadWindowHeaderBarProps) {
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);
  const screens = workspace.screens || DEFAULT_CAD_SCREENS;
  const scr = screens[screenId] || DEFAULT_CAD_SCREENS[screenId];

  const updateScreen = (patch: Partial<CadScreenConfig>) => {
    setWorkspace((prev) => {
      const curScreens = prev.screens || DEFAULT_CAD_SCREENS;
      return {
        ...prev,
        screens: {
          ...curScreens,
          [screenId]: {
            ...(curScreens[screenId] || DEFAULT_CAD_SCREENS[screenId]),
            ...patch,
          },
        },
      };
    });
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 rounded-t-lg bg-slate-950/95 border-b border-slate-800 text-[11px] select-none print:hidden"
      dir={cadLang === 'ur' ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold">
          🪟 {tr(scr.titleEn, scr.titleUr)}
        </span>
        {scr.isFloating && (
          <span className="text-[9px] font-mono text-sky-400">
            {tr('(Floating Window — Drag or Dock)', '(فری ونڈو)')}
          </span>
        )}
      </div>

      {/* Windows-Style Controls: Size (50%, 75%, 100%), Height (S/M/L/XL), Up/Down, Float, Minimize (_), Maximize (□) */}
      <div className="flex flex-wrap items-center gap-1">
        {extraRight}

        {/* Width Preset Buttons (چھوٹی / آدھی / بڑی سکرین) */}
        <div className="flex items-center rounded bg-slate-900 border border-slate-700 p-0.5 gap-0.5">
          <span className="text-[9px] text-slate-400 px-1 font-mono">
            {tr('Width:', 'چوڑائی:')}
          </span>
          {[50, 75, 100].map((wPct) => (
            <button
              key={wPct}
              type="button"
              onClick={() => updateScreen({ widthPercent: wPct, minimized: false })}
              className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold transition-colors ${
                scr.widthPercent === wPct
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={
                wPct === 50
                  ? tr('Half Screen Width (Side-by-Side)', 'آدھی چوڑائی (50% — دو سکرینیں آمنے سامنے)')
                  : wPct === 75
                  ? tr('Medium-Large Width (75%)', 'درمیانی بڑی سکرین (75%)')
                  : tr('Full Width (100%)', 'مکمل چوڑائی (100%)')
              }
            >
              {wPct}%
            </button>
          ))}
        </div>

        {/* Height / Zoom Scale Buttons (S, M, L, XL) */}
        <div className="flex items-center rounded bg-slate-900 border border-slate-700 p-0.5 gap-0.5">
          <span className="text-[9px] text-slate-400 px-1 font-mono">
            {tr('Size:', 'سائز:')}
          </span>
          {(
            [
              { id: 'sm', label: tr('S', 'چھوٹا') },
              { id: 'md', label: tr('M', 'نارمل') },
              { id: 'lg', label: tr('L', 'بڑا') },
              { id: 'xl', label: tr('XL', 'فل بڑا') },
            ] as const
          ).map((sz) => (
            <button
              key={sz.id}
              type="button"
              onClick={() => updateScreen({ heightScale: sz.id, minimized: false })}
              className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold transition-colors ${
                scr.heightScale === sz.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>

        {/* Move Screen Up / Down Order */}
        <button
          type="button"
          onClick={() => updateScreen({ order: Math.max(1, scr.order - 1) })}
          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
          title={tr('Move this screen Up', 'اس سکرین کو اوپر لے جائیں')}
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => updateScreen({ order: scr.order + 1 })}
          className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px]"
          title={tr('Move this screen Down', 'اس سکرین کو نیچے لے جائیں')}
        >
          <ArrowDown className="h-3 w-3" />
        </button>

        {/* Minimize (_) Button */}
        <button
          type="button"
          onClick={() => updateScreen({ minimized: !scr.minimized, maximized: false })}
          className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold flex items-center gap-1 ${
            scr.minimized
              ? 'bg-emerald-600 border-emerald-400 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-300'
          }`}
          title={tr('Minimize or Restore this screen', 'اس سکرین کو منیمائز (چھوٹا) کریں یا کھولیں')}
        >
          {scr.minimized ? (
            <>
              <Maximize2 className="h-2.5 w-2.5" />
              <span>{tr('Restore', 'کھولیں')}</span>
            </>
          ) : (
            <>
              <Minimize2 className="h-2.5 w-2.5" />
              <span>{tr('_ Minimize', '_ منیمائز')}</span>
            </>
          )}
        </button>

        {/* Maximize (□) Button */}
        <button
          type="button"
          onClick={() =>
            updateScreen({
              maximized: !scr.maximized,
              minimized: false,
              widthPercent: !scr.maximized ? 100 : scr.widthPercent,
              heightScale: !scr.maximized ? 'xl' : 'lg',
            })
          }
          className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold flex items-center gap-1 ${
            scr.maximized
              ? 'bg-amber-500 border-amber-300 text-slate-950'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-sky-300'
          }`}
          title={tr('Maximize this screen', 'اس سکرین کو فل بڑا کریں')}
        >
          <span>{scr.maximized ? tr('❐ Normal', '❐ نارمل') : tr('⛶ Max', '⛶ فل بڑا')}</span>
        </button>
      </div>
    </div>
  );
}

interface AutoCadWorkspaceControlBarProps {
  workspace: CadWorkspaceState;
  setWorkspace: React.Dispatch<React.SetStateAction<CadWorkspaceState>>;
  onUpdateBar: (barId: CadBarId, patch: Partial<CadBarConfig>) => void;
  onResetWorkspace: () => void;
  cadLang: 'en' | 'ur';
}

export function AutoCadWorkspaceControlBar({
  workspace,
  setWorkspace,
  onUpdateBar,
  onResetWorkspace,
  cadLang,
}: AutoCadWorkspaceControlBarProps) {
  const tr = (en: string, ur: string) => (cadLang === 'ur' ? ur : en);
  const screens = workspace.screens || DEFAULT_CAD_SCREENS;

  const removedBars = (
    ['preset_bar', 'voice_cmd_bar', 'kpi_bar', 'cad_tools_bar'] as CadBarId[]
  ).filter((id) => !workspace.bars[id]?.visible || workspace.bars[id]?.collapsed);

  const minimizedScreens = (Object.keys(DEFAULT_CAD_SCREENS) as CadScreenId[]).filter(
    (id) => screens[id]?.minimized
  );

  const step1Hidden = workspace.step1Visible === false;
  const step2Hidden = workspace.step2Visible === false;

  const updateScreen = (id: CadScreenId, patch: Partial<CadScreenConfig>) => {
    setWorkspace((prev) => {
      const cur = prev.screens || DEFAULT_CAD_SCREENS;
      return {
        ...prev,
        screens: {
          ...cur,
          [id]: {
            ...(cur[id] || DEFAULT_CAD_SCREENS[id]),
            ...patch,
          },
        },
      };
    });
  };

  return (
    <div dir={cadLang === 'ur' ? 'rtl' : 'ltr'} className="print:hidden">
      {/* 1. Always-Visible Minimized Windows & Hidden Bars Taskbar Strip (when anything is minimized/hidden) */}
      {(removedBars.length > 0 ||
        minimizedScreens.length > 0 ||
        step1Hidden ||
        step2Hidden) && (
        <div className="bg-slate-950 border-b border-amber-500/40 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <span>🪟</span>
              <span>
                {tr(
                  'Minimized Screens & Button Bars (Click to Open):',
                  'منیمائز شدہ سکرینیں اور بٹن (کلک کر کے واپس کھولیں):'
                )}
              </span>
            </span>

            {minimizedScreens.map((sId) => {
              const sc = screens[sId] || DEFAULT_CAD_SCREENS[sId];
              return (
                <button
                  key={sId}
                  type="button"
                  onClick={() => updateScreen(sId, { minimized: false })}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 border border-amber-400 text-amber-200 hover:text-slate-950 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>{tr(sc.titleEn, sc.titleUr)}</span>
                </button>
              );
            })}

            {removedBars.map((id) => {
              const b = workspace.bars[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateBar(id, { visible: true, collapsed: false })}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>{tr(b.titleEn, b.titleUr)}</span>
                </button>
              );
            })}

            {step1Hidden && (
              <button
                type="button"
                onClick={() => setWorkspace((prev) => ({ ...prev, step1Visible: true }))}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-sky-950 border border-sky-500/60 text-sky-300 text-[11px] font-semibold"
              >
                + {tr('Step 1 (Stock)', 'سکرین 1: سلیب اسٹاک')}
              </button>
            )}
            {step2Hidden && (
              <button
                type="button"
                onClick={() => setWorkspace((prev) => ({ ...prev, step2Visible: true }))}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[11px] font-semibold"
              >
                + {tr('Step 2 (Cut Pieces)', 'سکرین 2: کٹنگ پیسز')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setWorkspace((prev) => ({ ...prev, customizeMode: !prev.customizeMode }))
              }
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1"
            >
              <Sliders className="h-3 w-3" />
              <span>{tr('Workspace Setup', 'ورک سپیس سیٹنگ')}</span>
            </button>
            <button
              type="button"
              onClick={onResetWorkspace}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{tr('Reset All to Default', 'ڈیفالٹ سیٹنگ')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Full Interactive Workspace & Windows Customizer Panel (Opens when user clicks "🪟 ورک سپیس سیٹنگ") */}
      {workspace.customizeMode && (
        <div className="bg-slate-900 border-b-2 border-amber-500 p-3.5 space-y-3.5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-amber-400" />
                <span>
                  {tr(
                    '🪟 Windows-Style Workspace, Screen Size & Button Placement Manager',
                    '🪟 ونڈوز اسٹائل ورک سپیس سیٹنگ (سکرینیں چھوٹی بڑی کریں اور بٹن ڈایاگرام کے اندر یا باہر اپنی مرضی سے رکھیں)'
                  )}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {tr(
                  'Resize, minimize, or reorder any screen, and move any button group inside Diagram #1, inside Diagram #2, outside at the top/bottom, or float anywhere on screen. Automatically saved!',
                  'ہر سکرین کو منیمائز، چھوٹا یا بڑا کریں، اور کسی بھی بٹن بار کو ڈایاگرام کے اندر، باہر ٹاپ پر، یا ماؤس سے پکڑ کر اپنی مرضی کی جگہ ایڈجسٹ کریں۔ یہ سیٹنگ خودکار محفوظ ہو جاتی ہے!'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Layout Presets */}
              <button
                type="button"
                onClick={() => {
                  setWorkspace((prev) => ({
                    ...prev,
                    screens: {
                      ...(prev.screens || DEFAULT_CAD_SCREENS),
                      diagram_1: {
                        ...(prev.screens?.diagram_1 || DEFAULT_CAD_SCREENS.diagram_1),
                        widthPercent: 50,
                        minimized: false,
                      },
                      diagram_2: {
                        ...(prev.screens?.diagram_2 || DEFAULT_CAD_SCREENS.diagram_2),
                        widthPercent: 50,
                        minimized: false,
                      },
                    },
                  }));
                }}
                className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                {tr('⚖️ Side-by-Side Diagrams (50% / 50%)', '⚖️ دونوں ڈایاگرام آمنے سامنے (50% / 50%)')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkspace((prev) => ({
                    ...prev,
                    screens: {
                      ...(prev.screens || DEFAULT_CAD_SCREENS),
                      diagram_1: {
                        ...(prev.screens?.diagram_1 || DEFAULT_CAD_SCREENS.diagram_1),
                        widthPercent: 100,
                        heightScale: 'xl',
                        minimized: false,
                      },
                      diagram_2: {
                        ...(prev.screens?.diagram_2 || DEFAULT_CAD_SCREENS.diagram_2),
                        widthPercent: 100,
                        heightScale: 'xl',
                        minimized: false,
                      },
                    },
                  }));
                }}
                className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                {tr('📐 Full-Width Large Diagrams (100%)', '📐 دونوں ڈایاگرام فل بڑے سائز میں (100%)')}
              </button>

              <button
                type="button"
                onClick={onResetWorkspace}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{tr('Reset Default Workspace', 'ڈیفالٹ ورک سپیس بحال کریں')}</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspace((prev) => ({ ...prev, customizeMode: false }))}
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
              >
                {tr('✓ Save & Close Setup', '✓ سیٹنگ محفوظ اور بند کریں')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* LEFT 6 COLS: MANAGE SCREENS / WINDOWS (منیمائز، چھوٹا بڑا، اوپر نیچے) */}
            <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-sky-300">
                  {tr(
                    '1. Manage Screens / Windows (سکرینیں چھوٹی، بڑی یا منیمائز کریں):',
                    '1. سکرینیں (Windows) چھوٹی، بڑی، منیمائز یا اوپر نیچے کریں:'
                  )}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {tr('Sidebar Width:', 'سائیڈ بار چوڑائی:')} {workspace.sidebarWidthPercent}%
                </span>
              </div>

              {/* Sidebar Position & Width Slider */}
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-amber-300">
                  {tr('Stock & Pieces Sidebar Position:', 'اسٹاک اور پیسز سائیڈ بار کی جگہ:')}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { id: 'left', label: tr('⬅ Left', '⬅ بائیں') },
                      { id: 'right', label: tr('➡ Right', '➡ دائیں') },
                      { id: 'top', label: tr('⬆ Top', '⬆ اوپر') },
                      { id: 'float', label: tr('🪟 Floating Window', '🪟 فری ونڈو') },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() =>
                        setWorkspace((prev) => ({ ...prev, sidebarPosition: pos.id }))
                      }
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                        workspace.sidebarPosition === pos.id
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-300'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Screen Rows */}
              <div className="space-y-1.5">
                {(Object.keys(DEFAULT_CAD_SCREENS) as CadScreenId[]).map((sId) => {
                  const sc = screens[sId] || DEFAULT_CAD_SCREENS[sId];
                  return (
                    <div
                      key={sId}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="font-bold text-white">
                        {tr(sc.titleEn, sc.titleUr)}
                      </span>

                      <div className="flex flex-wrap items-center gap-1">
                        {/* Width 50% / 75% / 100% */}
                        {[50, 75, 100].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() =>
                              updateScreen(sId, { widthPercent: w, minimized: false })
                            }
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              sc.widthPercent === w && !sc.minimized
                                ? 'bg-sky-600 border-sky-400 text-white'
                                : 'bg-slate-950 border-slate-700 text-slate-300'
                            }`}
                          >
                            {w}%
                          </button>
                        ))}

                        {/* Height S / M / L / XL */}
                        {(['sm', 'md', 'lg', 'xl'] as const).map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() =>
                              updateScreen(sId, { heightScale: h, minimized: false })
                            }
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border uppercase ${
                              sc.heightScale === h && !sc.minimized
                                ? 'bg-amber-500 border-amber-300 text-slate-950'
                                : 'bg-slate-950 border-slate-700 text-slate-400'
                            }`}
                          >
                            {h}
                          </button>
                        ))}

                        {/* Minimize / Restore */}
                        <button
                          type="button"
                          onClick={() => updateScreen(sId, { minimized: !sc.minimized })}
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                            sc.minimized
                              ? 'bg-rose-600 border-rose-400 text-white'
                              : 'bg-slate-950 border-slate-700 text-amber-300'
                          }`}
                        >
                          {sc.minimized
                            ? tr('Minimized (Click to Open)', 'منیمائز ہے (کھولیں)')
                            : tr('_ Minimize', '_ منیمائز')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT 6 COLS: PLACE BUTTONS INSIDE DIAGRAM OR OUTSIDE (بٹن ڈایاگرام کے اندر یا باہر ایڈجسٹ کریں) */}
            <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2.5">
              <div>
                <span className="text-xs font-extrabold text-amber-300">
                  {tr(
                    '2. Place Button Bars Inside Diagram or Outside (بٹن ڈایاگرام کے اندر یا باہر اپنی مرضی کی جگہ رکھیں):',
                    '2. بٹن ڈایاگرام کے اندر رکھیں یا باہر (اپنی مرضی کی جگہ سیٹ کریں):'
                  )}
                </span>
              </div>

              <div className="space-y-2">
                {(
                  [
                    'preset_bar',
                    'cad_tools_bar',
                    'voice_cmd_bar',
                    'kpi_bar',
                  ] as CadBarId[]
                ).map((bId) => {
                  const b = workspace.bars[bId] || DEFAULT_CAD_WORKSPACE_STATE.bars[bId];
                  return (
                    <div
                      key={bId}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2 space-y-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          {tr(b.titleEn, b.titleUr)}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Button Size S / M / L */}
                          {(
                            [
                              { id: 'sm', label: tr('Small', 'چھوٹے') },
                              { id: 'md', label: tr('Normal', 'نارمل') },
                              { id: 'lg', label: tr('Large', 'بڑے') },
                            ] as const
                          ).map((sz) => (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={() => onUpdateBar(bId, { scale: sz.id, visible: true })}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                b.scale === sz.id
                                  ? 'bg-emerald-600 border-emerald-400 text-white'
                                  : 'bg-slate-950 border-slate-700 text-slate-300'
                              }`}
                            >
                              {sz.label}
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() => onUpdateBar(bId, { visible: !b.visible })}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              b.visible
                                ? 'bg-slate-950 border-slate-700 text-slate-300'
                                : 'bg-rose-600 border-rose-400 text-white'
                            }`}
                          >
                            {b.visible ? tr('Hide', 'چھپائیں') : tr('Hidden (Show)', 'واپس لائیں')}
                          </button>
                        </div>
                      </div>

                      {/* Where to place this button bar: Outside Top, Inside Diagram 1, Inside Diagram 2, Outside Bottom, or Free Drag */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-1">
                          {tr('Place Buttons:', 'بٹن کہاں رکھیں:')}
                        </span>
                        {(
                          [
                            {
                              dock: 'top',
                              label: tr('⬆ Outside Top', '⬆ باہر اوپر'),
                            },
                            {
                              dock: 'inside_diagram_1',
                              label: tr('📐 Inside Diagram #1 (Slab)', '📐 ڈایاگرام #1 کے اندر'),
                            },
                            {
                              dock: 'inside_diagram_2',
                              label: tr('🏠 Inside Diagram #2 (Floor/Cat)', '🏠 ڈایاگرام #2 کے اندر'),
                            },
                            {
                              dock: 'bottom',
                              label: tr('⬇ Outside Bottom', '⬇ باہر نیچے'),
                            },
                            {
                              dock: 'float',
                              label: tr('✥ Free Drag Anywhere', '✥ ماؤس سے کہیں بھی رکھیں'),
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.dock}
                            type="button"
                            onClick={() =>
                              onUpdateBar(bId, {
                                dock: opt.dock,
                                visible: true,
                                collapsed: false,
                              })
                            }
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                              b.dock === opt.dock && b.visible
                                ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-2xs'
                                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
