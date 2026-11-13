'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Eye, ChevronDown, DraftingCompass, Trash2, Save, XSquare, ArrowUpRight, ArrowUpLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCalculation, type OrderFormState } from '@/context/calculation-context';
import costs from '@/lib/costs.json';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { useLanguage } from '@/context/language-context';


interface OrderFormProps {
  marble: Marble;
  variant: MarbleVariant;
  onSave: (data: {total: number, details: any}) => void;
  applicationType?: 'stairs' | 'window-sill' | 'kitchen';
  initialState?: Partial<OrderFormState>;
  onCancel: () => void;
}

const NoneIcon = () => (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
        <path d="M2 2H22V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
);


const TukkerPolishIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H22V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M22 2V14" stroke="#D0021B" strokeWidth="2.5" strokeLinejoin="round"/>
  </svg>
);

const GolaIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H20C21.1046 2 22 2.89543 22 4V12C22 13.1046 21.1046 14 20 14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M20 2C21.1046 2 22 2.89543 22 4V12C22 13.1046 21.1046 14 20 14" stroke="#D0021B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HalfGolaIcon = () => (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
        <path d="M2 2H20C21.1046 2 22 2.89543 22 4V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M20 2C21.1046 2 22 2.89543 22 4" stroke="#D0021B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const DiamondCutIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H20L22 4V12L20 14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M20 2L22 4V12L20 14" stroke="#D0021B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HalfDiamondCutIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H20L22 4V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M20 2L22 4" stroke="#D0021B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LitacSimpleIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H22V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M2 8H22" stroke="#4A90E2" strokeWidth="1.5" strokeDasharray="2 2"/>
  </svg>
);

const LitacGrooveIcon = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M2 2H22V14H2V2Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M2 7H22" stroke="#4A90E2" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M2 9H22" stroke="#4A90E2" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);


export const edgeProfiles = {
  none: { name: 'None', price: costs.edgeProfilePrices.none, icon: NoneIcon },
  tukker: { name: 'Tukker Polish', price: costs.edgeProfilePrices.tukker, icon: TukkerPolishIcon },
  halfGola: { name: 'Half Gola / Half Bullnose', price: costs.edgeProfilePrices.halfGola, icon: HalfGolaIcon },
  halfDiamond: { name: 'Half Diamond Cut', price: costs.edgeProfilePrices.halfDiamond, icon: HalfDiamondCutIcon },
  gola: { name: 'Gola / Bullnose', price: costs.edgeProfilePrices.gola, icon: GolaIcon },
  diamond: { name: 'Diamond Cut / Taper', price: costs.edgeProfilePrices.diamond, icon: DiamondCutIcon },
  litacSimple: { name: 'Litac Jointing (Simple)', price: costs.edgeProfilePrices.litacSimple, icon: LitacSimpleIcon },
  litacGroove: { name: 'Litac Jointing (w/ Groove)', price: costs.edgeProfilePrices.litacGroove, icon: LitacGrooveIcon },
};

export type ProfileType = keyof typeof edgeProfiles;

export type EdgeDetail = {
  profiled: boolean;
};

export type EdgeSelection = {
  top: EdgeDetail;
  bottom: EdgeDetail;
  left: EdgeDetail;
  right: EdgeDetail;
};

export type Riser = {
  front: boolean;
  left: boolean;
  right: boolean;
  height: string;
  width?: string;
  length?: string;
  quantity?: string;
  hasSkirting?: boolean;
  skirtingType?: 'one-sided' | 'two-sided';
  skirtingLength?: string;
};


export type WindowSillRow = {
    id: number;
    length: string;
    width: string;
    quantity: string;
    innerCut: string;
    edges: EdgeSelection;
}

export type DimensionRow = {
  id: number;
  length: string;
  width: string;
  quantity: string;
  edges: EdgeSelection;
  riser: Riser;
};


export type WinderEdges = {
  // Common
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
  // Specific to shape
  diag1: boolean;
  diag2: boolean;
  inner_v: boolean;
  inner_h: boolean;
};

export type Winder = {
    id: number;
    length: string;
    width: string;
    type: '1-step' | '2-step' | '3-step';
    turnDirection: 'left' | 'right';
    edges: WinderEdges;
    riserEdges?: WinderEdges;
    riserHeight?: string;
};

export function getDefaultRiserEdges(type: '1-step' | '2-step' | '3-step', turnDirection: 'left' | 'right'): WinderEdges {
  const base = { top: false, bottom: false, left: false, right: false, diag1: false, diag2: false, inner_v: false, inner_h: false };
  if (type === '1-step') {
    return { ...base, bottom: true };
  } else if (type === '2-step') {
    return { ...base, bottom: true, diag1: true };
  } else {
    return { ...base, bottom: true, diag1: true, diag2: true };
  }
}


let uniqueIdCounter = 0;
const generateUniqueId = () => {
  uniqueIdCounter += 1;
  return Date.now() + uniqueIdCounter;
};

const defaultEdgeDetail: EdgeDetail = {
  profiled: false,
};
export const defaultEdges: EdgeSelection = {
  top: { ...defaultEdgeDetail },
  bottom: { ...defaultEdgeDetail },
  left: { ...defaultEdgeDetail },
  right: { ...defaultEdgeDetail },
};

const defaultRiser: Riser = {
  front: false,
  left: false,
  right: false,
  height: '7',
  width: '',
  length: '',
  quantity: '',
  hasSkirting: false,
  skirtingType: 'one-sided',
  skirtingLength: '',
};


const defaultWinderEdges: WinderEdges = {
  top: false, bottom: false, left: false, right: false,
  diag1: false, diag2: false, inner_v: false, inner_h: false,
};

// Helper function to format dimension strings for display
const formatDimensionDisplay = (value: string): string => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    const inches = Math.floor(numValue);
    const eighths = Math.round((numValue - inches) * 8);
    
    if (eighths === 0) {
        return `${inches}"`;
    }
    return `${inches}" ${eighths}s`; // Using 's' for 'sutar'
};

const formatDimensionWithUnit = (value: string, unit: 'inches' | 'feet' | 'cm' | 'mm'): string => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';

    if (unit === 'inches') {
        const inches = Math.floor(numValue);
        const eighths = Math.round((numValue - inches) * 8);
        if (eighths === 0) {
            return `${inches}"`;
        }
        return `${inches}" ${eighths}s`;
    }
    if (unit === 'feet') {
        return `${numValue} ft`;
    }
    if (unit === 'cm') {
        return `${numValue} cm`;
    }
    if (unit === 'mm') {
        return `${numValue} mm`;
    }
    return value;
};

export const MiniEdgeSelector = ({
  edges,
  width,
  length,
  onEdgeClick,
  disabled = false,
  innerCut = 0,
  widthStr,
  lengthStr,
  isPrintMode = false,
  unit = 'inches',
}: {
  edges: EdgeSelection;
  width: number;
  length: number;
  onEdgeClick: (edge: keyof EdgeSelection) => void;
  disabled?: boolean;
  innerCut?: number;
  widthStr: string;
  lengthStr: string;
  isPrintMode?: boolean;
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
}) => {
  const handleEdgeClick = (edge: keyof EdgeSelection) => {
    if (!disabled) {
      onEdgeClick(edge);
    }
  };

  const hasDimensions = width > 0 && length > 0;
  const outerCut = width - innerCut;

  const WavyLine = ({ vertical = false, side }: { vertical?: boolean, side: keyof EdgeSelection }) => {
    const pathD = vertical
        ? 'M 2 0 C 4 5, 0 10, 2 15 S 4 25, 2 30 S 4 40, 2 45 S 4 55, 2 60'
        : 'M 0 2 C 5 4, 10 0, 15 2 S 25 4, 30 2 S 40 4, 45 2 S 55 4, 60 2 S 70 4, 75 2 S 85 4, 90 2 S 95 4, 100 2';
        
    const offset = 2; // Offset to move the line away from the main box
    const style: React.CSSProperties = {
        stroke: '#D0021B',
        strokeWidth: isPrintMode ? 2 : 1.5,
        fill: 'none',
        vectorEffect: 'non-scaling-stroke',
        position: 'absolute'
    };

    switch(side) {
        case 'top': style.top = `-${offset+2}px`; style.left = '0'; break;
        case 'bottom': style.bottom = `-${offset+2}px`; style.left = '0'; break;
        case 'left': style.left = `-${offset+2}px`; style.top = '0'; break;
        case 'right': style.right = `-${offset+2}px`; style.top = '0'; break;
    }


    return (
        <div className={cn('absolute', 
            vertical ? 'w-1 h-full' : 'h-1 w-full',
            side === 'top' && 'top-[-5px] left-0',
            side === 'bottom' && 'bottom-[-5px] left-0',
            side === 'left' && 'left-[-5px] top-0',
            side === 'right' && 'right-[-5px] top-0',
        )}>
            <svg
                viewBox={vertical ? '0 0 4 60' : '0 0 100 4'}
                preserveAspectRatio="none"
                width="100%"
                height="100%"
                className="wavy-line-print"
                style={{ stroke: '#D0021B', strokeWidth: isPrintMode ? 2.5 : 2.5, fill: 'none', vectorEffect: 'non-scaling-stroke' }}
            >
                <path d={pathD} />
            </svg>
        </div>
    );
  };


  return (
    <div className="flex h-20 w-32 items-center justify-center">
      <div
        className="relative flex items-center justify-center"
        title={
          disabled
            ? 'Select a profile type first'
            : 'Click to toggle profiled edges'
        }
      >
        {/* Main box for display */}
        <div
          className={cn(
            'relative flex h-[52px] w-[96px] flex-col items-center justify-center rounded-sm border-2 overflow-hidden',
             'bg-muted text-foreground border-foreground border-dashed',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {hasDimensions && (
            <>
              {innerCut > 0 && innerCut < width ? (
                <>
                  <div className="flex h-full w-full flex-col justify-around text-center">
                    <span className="text-[10px] font-bold leading-tight">{`${formatDimensionWithUnit(String(outerCut), unit)} x ${formatDimensionWithUnit(lengthStr, unit)}`}</span>
                    <span className="text-[10px] font-bold leading-tight">{`${formatDimensionWithUnit(String(innerCut), unit)} x ${formatDimensionWithUnit(lengthStr, unit)}`}</span>
                  </div>
                  <div 
                    className="absolute left-0 w-full border-t-2 border-dotted border-muted-foreground"
                    style={{ top: `${(outerCut / width) * 100}%` }}
                  />
                </>
              ) : (
                <span className="select-none text-xs font-bold text-center">
                  {formatDimensionWithUnit(widthStr, unit)} x {formatDimensionWithUnit(lengthStr, unit)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Clickable areas and wavy lines */}
        {Object.keys(edges).map(edgeKey => {
          const edge = edgeKey as keyof EdgeSelection;
          const isVertical = edge === 'left' || edge === 'right';

          return (
            <React.Fragment key={edge}>
              {!isPrintMode && (
                 <div
                  onClick={() => handleEdgeClick(edge)}
                  className={cn(
                    'absolute',
                    !disabled && 'cursor-pointer',
                    isVertical ? 'h-full w-3' : 'h-3 w-full',
                    edge === 'top' && 'left-0 top-[-12px]',
                    edge === 'bottom' && 'left-0 bottom-[-12px]',
                    edge === 'left' && 'top-0 left-[-12px]',
                    edge === 'right' && 'top-0 right-[-12px]'
                  )}
                />
              )}
              {/* Wavy line indicator */}
              {edges[edge].profiled && (
                <WavyLine vertical={isVertical} side={edge} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};


export function OrderForm({
  marble,
  variant,
  onSave,
  applicationType = 'stairs',
  initialState,
  onCancel
}: OrderFormProps) {
  const { costs } = useCalculation();
  const { language } = useLanguage();
  
  const [dimensionRows, setDimensionRows] = useState<DimensionRow[]>(initialState?.dimensionRows || []);
  const [windowSillRows, setWindowSillRows] = useState<WindowSillRow[]>(initialState?.windowSillRows || []);
  const [winders, setWinders] = useState<Winder[]>(initialState?.winders || []);
  const [winderModes, setWinderModes] = useState<Record<number, 'profile' | 'riser'>>({});
  const [globalProfileType, setGlobalProfileType] = useState<ProfileType>(initialState?.globalProfileType || 'none');

  // New unit and location states
  const [selectedUnit, setSelectedUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'inches');
  const [lastConfiguredUnit, setLastConfiguredUnit] = useState<'inches' | 'feet' | 'cm' | 'mm'>(initialState?.selectedUnit || 'inches');
  const [stairLocation, setStairLocation] = useState<'basement' | 'ground' | 'first' | 'other'>(initialState?.stairLocation || 'ground');
  const [customStairLocation, setCustomStairLocation] = useState<string>(initialState?.customStairLocation || '');

  const [isClient, setIsClient] = useState(false);
  
  // States for bill breakdown
  const [totalSqFt, setTotalSqFt] = useState(0);
  const [wastage, setWastage] = useState(0);
  const [finalSqFt, setFinalSqFt] = useState(0);
  const [marbleTotal, setMarbleTotal] = useState(0);
  const [edgeProfilingCosts, setEdgeProfilingCosts] = useState<{[key in ProfileType]?: { rft: number, cost: number }}>({});
  const [innerCutRft, setInnerCutRft] = useState(0);
  const [innerCutCost, setInnerCutCost] = useState(0);
  const [total, setTotal] = useState(0);

  const parseSutarValue = (value: string): number => {
    if (!value) return 0;
    const stringValue = String(value);
    // Handles values like "12.4" -> 12.5 inches
    const numValue = parseFloat(stringValue);
    if (isNaN(numValue)) return 0;

    const inches = Math.floor(numValue);
    const decimalPart = numValue - inches;
    
    // Convert decimal to eighths of an inch (sutar)
    const sutar = Math.round(decimalPart * 8);
    
    return inches + sutar / 8;
  };

  // Helper to get measurement value in inches based on unit selected
  const getValueInInches = (value: string): number => {
    if (!value) return 0;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 0;

    switch (selectedUnit) {
      case 'feet':
        return numValue * 12;
      case 'cm':
        return numValue / 2.54;
      case 'mm':
        return numValue / 25.4;
      case 'inches':
      default:
        return parseSutarValue(value);
    }
  };

  const convertUnitValue = (valueStr: string, fromUnit: 'inches' | 'feet' | 'cm' | 'mm', toUnit: 'inches' | 'feet' | 'cm' | 'mm'): string => {
    if (!valueStr) return '';
    const numValue = parseFloat(valueStr);
    if (isNaN(numValue) || numValue <= 0) return valueStr;

    // First convert fromUnit value to base inches
    let inches = 0;
    if (fromUnit === 'inches') {
      inches = parseSutarValue(valueStr);
    } else if (fromUnit === 'feet') {
      inches = numValue * 12;
    } else if (fromUnit === 'cm') {
      inches = numValue / 2.54;
    } else if (fromUnit === 'mm') {
      inches = numValue / 25.4;
    }

    // Now convert base inches to toUnit
    let resultNum = 0;
    let decimals = 2;
    if (toUnit === 'inches') {
      resultNum = inches;
      decimals = 2;
    } else if (toUnit === 'feet') {
      resultNum = inches / 12;
      decimals = 3;
    } else if (toUnit === 'cm') {
      resultNum = inches * 2.54;
      decimals = 2;
    } else if (toUnit === 'mm') {
      resultNum = inches * 25.4;
      decimals = 1;
    }

    return parseFloat(resultNum.toFixed(decimals)).toString();
  };

  const handleFitMeasurement = () => {
    if (selectedUnit === lastConfiguredUnit) return;

    // Convert dimensionRows
    const updatedDimensionRows = dimensionRows.map(row => {
      const updatedRiser = {
        ...row.riser,
        height: convertUnitValue(row.riser.height, lastConfiguredUnit, selectedUnit),
        width: row.riser.width ? convertUnitValue(row.riser.width, lastConfiguredUnit, selectedUnit) : undefined,
        length: row.riser.length ? convertUnitValue(row.riser.length, lastConfiguredUnit, selectedUnit) : undefined,
        skirtingLength: row.riser.skirtingLength ? convertUnitValue(row.riser.skirtingLength, lastConfiguredUnit, selectedUnit) : undefined,
      };
      return {
        ...row,
        width: convertUnitValue(row.width, lastConfiguredUnit, selectedUnit),
        length: convertUnitValue(row.length, lastConfiguredUnit, selectedUnit),
        riser: updatedRiser
      };
    });
    setDimensionRows(updatedDimensionRows);

    // Convert windowSillRows
    const updatedWindowSillRows = windowSillRows.map(row => {
      return {
        ...row,
        width: convertUnitValue(row.width, lastConfiguredUnit, selectedUnit),
        length: convertUnitValue(row.length, lastConfiguredUnit, selectedUnit),
        innerCut: convertUnitValue(row.innerCut, lastConfiguredUnit, selectedUnit),
      };
    });
    setWindowSillRows(updatedWindowSillRows);

    // Convert winders
    const updatedWinders = winders.map(w => {
      return {
        ...w,
        width: convertUnitValue(w.width, lastConfiguredUnit, selectedUnit),
        length: convertUnitValue(w.length, lastConfiguredUnit, selectedUnit),
        riserHeight: w.riserHeight ? convertUnitValue(w.riserHeight, lastConfiguredUnit, selectedUnit) : undefined,
      };
    });
    setWinders(updatedWinders);

    // Update lastConfiguredUnit
    setLastConfiguredUnit(selectedUnit);
  };

  // Helper to calculate winder risers in inches
  const getWinderRisersInInches = (winder: Winder) => {
    const risers: { name: string; length: number; height: number; isDiagonal: boolean }[] = [];
    const length = getValueInInches(winder.length);
    const width = getValueInInches(winder.width);
    const height = getValueInInches(winder.riserHeight || '7');
    
    if (length <= 0 || width <= 0) return risers;

    const riserEdges = winder.riserEdges || getDefaultRiserEdges(winder.type, winder.turnDirection);

    if (riserEdges.bottom) {
      risers.push({ name: 'Bottom Riser', length: width, height, isDiagonal: false });
    }
    if (riserEdges.top) {
      risers.push({ name: 'Top Riser', length: width, height, isDiagonal: false });
    }
    if (riserEdges.left) {
      risers.push({ name: 'Left Riser', length: length, height, isDiagonal: false });
    }
    if (riserEdges.right) {
      risers.push({ name: 'Right Riser', length: length, height, isDiagonal: false });
    }

    if (winder.type === '2-step') {
      if (riserEdges.diag1) {
        const diagLen = Math.sqrt(width * width + length * length);
        risers.push({ name: 'Samosa Riser (Diag 1)', length: diagLen, height, isDiagonal: true });
      }
    } else if (winder.type === '3-step') {
      if (riserEdges.diag1) {
        const diagLen = winder.turnDirection === 'right'
          ? Math.sqrt(Math.pow((2/3) * width, 2) + length * length)
          : Math.sqrt(width * width + Math.pow((2/3) * length, 2));
        risers.push({ name: 'Samosa Riser (Diag 1)', length: diagLen, height, isDiagonal: true });
      }
      if (riserEdges.diag2) {
        const diagLen = winder.turnDirection === 'right'
          ? Math.sqrt(width * width + Math.pow((2/3) * length, 2))
          : Math.sqrt(Math.pow((2/3) * width, 2) + length * length);
        risers.push({ name: 'Samosa Riser (Diag 2)', length: diagLen, height, isDiagonal: true });
      }
    }

    return risers;
  };

  useEffect(() => {
    setIsClient(true);
    if (applicationType === 'stairs' && dimensionRows.length === 0 && winders.length === 0) {
      addDimensionRow();
    }
    if (applicationType === 'window-sill' && windowSillRows.length === 0) {
      addWindowSillRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let regularArea = 0;
    let riserArea = 0;

    dimensionRows.forEach(row => {
        const length = getValueInInches(row.length);
        const width = getValueInInches(row.width);
        const quantity = parseInt(row.quantity) || 0;
        if (length > 0 && width > 0 && quantity > 0) {
            regularArea += (length * width * quantity);
        }
        
        // 1. Explicit riser measurements
        const rWidth = getValueInInches(row.riser.width || '');
        const rLength = getValueInInches(row.riser.length || '');
        const rQty = parseInt(row.riser.quantity || '0') || 0;

        if (rWidth > 0 && rLength > 0 && rQty > 0) {
            riserArea += rWidth * rLength * rQty;
        }

        // 2. Skirting calculation
        if (row.riser.hasSkirting) {
            const skirtingLength = getValueInInches(row.riser.skirtingLength || '');
            if (skirtingLength > 0) {
                const sides = row.riser.skirtingType === 'two-sided' ? 2 : 1;
                const skirtingHeight = 6; // standard 6-inch skirting height
                riserArea += skirtingLength * skirtingHeight * sides * quantity;
            }
        }
    });
    
    // Add winder risers area (in square inches)
    winders.forEach(winder => {
        const winderRisers = getWinderRisersInInches(winder);
        winderRisers.forEach(r => {
            riserArea += (r.length * r.height);
        });
    });
    
    regularArea /= 144;
    riserArea /= 144;

    windowSillRows.forEach(row => {
        const l = getValueInInches(row.length);
        const w = getValueInInches(row.width);
        const q = parseInt(row.quantity) || 0;
        if (l > 0 && w > 0 && q > 0) {
            regularArea += (l * w * q) / 144;
        }
    });
    
    let winderArea = 0;
    winders.forEach(winder => {
        const length = getValueInInches(winder.length);
        const width = getValueInInches(winder.width);
        if (length > 0 && width > 0) {
            winderArea += (length * width) / 144;
        }
    });
    
    const regularWastage = (regularArea + riserArea) * (costs.wastagePercentage / 100);
    const winderWastage = winderArea * 0.30;
    
    const calculatedTotalSqFt = regularArea + riserArea + winderArea;
    setTotalSqFt(calculatedTotalSqFt);

    const calculatedWastage = regularWastage + winderWastage;
    setWastage(calculatedWastage);

    const calculatedFinalSqFt = calculatedTotalSqFt + calculatedWastage;
    setFinalSqFt(calculatedFinalSqFt);

    let totalTreadRft = 0;
    let totalRiserRft = 0;
    if (globalProfileType !== 'none') {
        dimensionRows.forEach(row => {
            const length = getValueInInches(row.length);
            const width = getValueInInches(row.width);
            const quantity = parseInt(row.quantity) || 0;
            if (length > 0 && width > 0 && quantity > 0) {
                let treadInches = 0;
                if (row.edges.top.profiled) treadInches += length;
                if (row.edges.bottom.profiled) treadInches += length;
                if (row.edges.left.profiled) treadInches += width;
                if (row.edges.right.profiled) treadInches += width;
                totalTreadRft += (treadInches * quantity) / 12;
            }
        });
        windowSillRows.forEach(row => {
            const length = getValueInInches(row.length);
            const width = getValueInInches(row.width);
            const quantity = parseInt(row.quantity) || 0;
            if (length > 0 && width > 0 && quantity > 0) {
                let inchesForRow = 0;
                if (row.edges.top.profiled) inchesForRow += length;
                if (row.edges.bottom.profiled) inchesForRow += length;
                if (row.edges.left.profiled) inchesForRow += width;
                if (row.edges.right.profiled) inchesForRow += width;
                totalTreadRft += (inchesForRow * quantity) / 12;
            }
        });
        winders.forEach(winder => {
            const length = getValueInInches(winder.length);
            const width = getValueInInches(winder.width);
            if (length > 0 && width > 0) {
                let profiledLength = 0;
                 if (winder.type === '1-step') {
                    if (winder.turnDirection === 'right') {
                        if (winder.edges.bottom) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                        if (winder.edges.top) profiledLength += width;
                        if (winder.edges.left) profiledLength += length;
                    } else { // left
                        if (winder.edges.bottom) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                        if (winder.edges.top) profiledLength += width;
                        if (winder.edges.left) profiledLength += length;
                    }
                 } else if (winder.type === '2-step') {
                    if (winder.edges.diag1) profiledLength += Math.sqrt(length * length + width * width);
                    if (winder.turnDirection === 'right') {
                        if (winder.edges.bottom) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                    } else { // left
                        if (winder.edges.top) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                    }
                } else if (winder.type === '3-step') {
                    if (winder.turnDirection === 'right') {
                        if (winder.edges.bottom) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                        if (winder.edges.top) profiledLength += width;
                        if (winder.edges.left) profiledLength += length;
                        if (winder.edges.diag1) profiledLength += Math.sqrt(Math.pow((2/3) * width, 2) + Math.pow(length, 2));
                        if (winder.edges.diag2) profiledLength += Math.sqrt(Math.pow(width, 2) + Math.pow((2/3) * length, 2));
                    } else { // left turn
                        if (winder.edges.bottom) profiledLength += width;
                        if (winder.edges.right) profiledLength += length;
                        if (winder.edges.top) profiledLength += width;
                        if (winder.edges.left) profiledLength += length;
                        if (winder.edges.diag1) profiledLength += Math.sqrt(Math.pow(width, 2) + Math.pow((2/3) * length, 2));
                        if (winder.edges.diag2) profiledLength += Math.sqrt(Math.pow((2/3) * width, 2) + Math.pow(length, 2));
                    }
                }
                totalTreadRft += profiledLength / 12;
            }
        });
    }

    const totalRft = totalTreadRft + totalRiserRft;
    const profile = edgeProfiles[globalProfileType];
    const profilePrice = costs.edgeProfilePrices[globalProfileType as keyof typeof costs.edgeProfilePrices] ?? profile?.price ?? 0;
    const newEdgeProfilingCosts = {
      [globalProfileType]: {
        rft: totalRft,
        cost: totalRft * profilePrice
      }
    };
    setEdgeProfilingCosts(newEdgeProfilingCosts);

    let totalInnerCutRft = 0;
    if (applicationType === 'window-sill') {
        windowSillRows.forEach(row => {
            const innerCut = getValueInInches(row.innerCut);
            const length = getValueInInches(row.length);
            const quantity = parseInt(row.quantity) || 0;
            if (innerCut > 0 && length > 0 && quantity > 0) {
                totalInnerCutRft += (length * quantity) / 12;
            }
        });
    }
    setInnerCutRft(totalInnerCutRft);
    const newInnerCutCost = totalInnerCutRft * costs.innerCutRft;
    setInnerCutCost(newInnerCutCost);

    const newMarbleTotal = calculatedFinalSqFt * (variant.price ?? 0);
    setMarbleTotal(newMarbleTotal);

    const totalEdgeCost = Object.values(newEdgeProfilingCosts).reduce((sum, p) => sum + (p?.cost || 0), 0);
    const additionalServicesCost = totalEdgeCost + newInnerCutCost;
    const newTotal = newMarbleTotal + additionalServicesCost;
    setTotal(newTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, dimensionRows, windowSillRows, winders, variant.price, applicationType, globalProfileType, selectedUnit]);

  
  const handleSaveClick = () => {
    onSave({
      total: total,
      details: {
        totalSqFt,
        wastage,
        finalSqFt,
        marbleTotal,
        rate: variant.price,
        dimensionRows,
        windowSillRows,
        winders,
        globalProfileType,
        edgeProfilingCosts,
        innerCutCost,
        innerCutRft,
        wastagePercentage: costs.wastagePercentage,
        selectedUnit,
        stairLocation,
        customStairLocation,
      },
    });
  };

  const handleDimensionChange = (id: number, field: 'length' | 'width' | 'quantity', value: string) => {
    const newRows = dimensionRows.map(row => (row.id === id ? { ...row, [field]: value } : row));
    setDimensionRows(newRows);
  };
  
  const handleRiserDetailChange = (id: number, key: keyof Riser, value: any) => {
    setDimensionRows(dimensionRows.map(row => 
      row.id === id ? { ...row, riser: { ...row.riser, [key]: value }} : row
    ));
  };

  const handleWindowSillChange = (id: number, field: keyof Omit<WindowSillRow, 'id' | 'edges'>, value: string) => {
      const newRows = windowSillRows.map(row => (row.id === id ? {...row, [field]: value.replace(/[^0-9.]/g, '')} : row));
      setWindowSillRows(newRows);
  }

  const handleWinderChange = (id: number, field: 'length' | 'width' | 'type' | 'turnDirection' | 'riserHeight', value: string | boolean) => {
    setWinders(winders.map(w => {
      if (w.id === id) {
        const updatedWinder = { ...w, [field]: value };
        if (field === 'type' || field === 'turnDirection') {
          // Reset riser edges to default for this type/turn
          updatedWinder.riserEdges = getDefaultRiserEdges(updatedWinder.type, updatedWinder.turnDirection);
          // Reset profiled edges to false/default
          updatedWinder.edges = { ...defaultWinderEdges };
        }
        return updatedWinder;
      }
      return w;
    }));
  };

  const handleWinderEdgeClick = (id: number, edge: keyof WinderEdges) => {
    setWinders(winders.map(w => {
      if (w.id === id) {
        return { ...w, edges: { ...w.edges, [edge]: !w.edges[edge] }};
      }
      return w;
    }));
  };

  const handleWinderRiserEdgeClick = (id: number, edge: keyof WinderEdges) => {
    setWinders(winders.map(w => {
      if (w.id === id) {
        const riserEdges = w.riserEdges || getDefaultRiserEdges(w.type, w.turnDirection);
        return { 
          ...w, 
          riserEdges: { 
            ...riserEdges, 
            [edge]: !riserEdges[edge] 
          }
        };
      }
      return w;
    }));
  };
  
  const handleWindowSillEdgeClick = (id: number, edge: keyof EdgeSelection) => {
      const newRows = windowSillRows.map(row =>
          row.id === id
            ? { ...row, edges: { ...row.edges, [edge]: { profiled: !row.edges[edge].profiled }, }, }
            : row
        );
      setWindowSillRows(newRows);
  }

  const handleEdgeClick = (id: number, edge: keyof EdgeSelection) => {
    const newRows = dimensionRows.map(row =>
        row.id === id
          ? { ...row, edges: { ...row.edges, [edge]: { profiled: !row.edges[edge].profiled }, }, }
          : row
      );
    setDimensionRows(newRows);
  };

  const addDimensionRow = () => {
    setDimensionRows([...dimensionRows, { id: generateUniqueId(), length: '', width: '', quantity: '1', edges: { ...defaultEdges }, riser: {...defaultRiser}}]);
  };
  
  const deleteDimensionRow = (id: number) => {
    setDimensionRows(dimensionRows.filter(row => row.id !== id));
  };

  const addWinder = () => {
    const type = '2-step';
    const turnDirection = 'right';
    setWinders([
      ...winders, 
      { 
        id: generateUniqueId(), 
        length: '48', 
        width: '48', 
        type, 
        turnDirection, 
        edges: {...defaultWinderEdges},
        riserEdges: getDefaultRiserEdges(type, turnDirection),
        riserHeight: '7'
      }
    ]);
  };

  const deleteWinder = (id: number) => {
    setWinders(winders.filter(w => w.id !== id));
  };
  
  const addWindowSillRow = () => {
      setWindowSillRows([...windowSillRows, { id: generateUniqueId(), length: '', width: '12', quantity: '1', innerCut: '5', edges: {...defaultEdges}}]);
  }
  
  const deleteWindowSillRow = (id: number) => {
      setWindowSillRows(windowSillRows.filter(row => row.id !== id));
  }

  if (!isClient) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Separator />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Separator />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  
  const appTitle = applicationType ? applicationType.charAt(0).toUpperCase() + applicationType.slice(1) : 'Measurements';
  const selectedProfileIcon = edgeProfiles[globalProfileType]?.icon || edgeProfiles.none.icon;

  
  return (
    <div className="p-2 sm:p-6 flex flex-col h-full bg-background text-foreground">
        
        {applicationType === 'stairs' && (
        <div className="flex-grow flex flex-col">
            {/* Stair Configuration Section (Location and Unit) */}
            <Card className="mb-4">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Stair Location
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(['basement', 'ground', 'first', 'other'] as const).map((loc) => {
                      const displayLabel = loc === 'ground' ? 'Ground floor' : loc === 'first' ? 'First floor' : loc;
                      return (
                        <Button
                          key={loc}
                          type="button"
                          variant={stairLocation === loc ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStairLocation(loc)}
                          className="h-8 px-3 capitalize text-xs"
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}
                  </div>
                  {stairLocation === 'other' && (
                    <Input
                      type="text"
                      placeholder="Enter custom location (e.g., Attic, Roof)"
                      value={customStairLocation}
                      onChange={(e) => setCustomStairLocation(e.target.value)}
                      className="h-8 mt-2 text-sm"
                    />
                  )}
                </div>

                {/* Unit Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Measurement Unit
                    </Label>
                    {selectedUnit !== lastConfiguredUnit && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold animate-pulse uppercase tracking-wider">
                        Unit changed! Please click Fit Measurement
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(['inches', 'feet', 'cm', 'mm'] as const).map((unit) => {
                      const displayLabel = unit === 'inches' ? 'Inches' : unit === 'feet' ? 'Feet' : unit === 'cm' ? 'Centimeters' : 'Millimeters';
                      return (
                        <Button
                          key={unit}
                          type="button"
                          variant={selectedUnit === unit ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSelectedUnit(unit);
                          }}
                          className="h-8 px-3 text-xs"
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFitMeasurement}
                      disabled={selectedUnit === lastConfiguredUnit}
                      className={cn(
                        "h-8 px-3 text-xs font-bold transition-all",
                        selectedUnit !== lastConfiguredUnit 
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse shadow-md" 
                          : "text-muted-foreground cursor-not-allowed opacity-50"
                      )}
                    >
                      Fit Measurement
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Dimensions for Standard Steps</span>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="outline" className="h-9 px-3">
                           {React.createElement(selectedProfileIcon)}
                           <span className="truncate text-sm mx-2">
                             {edgeProfiles[globalProfileType]?.name || 'Select Profile'}
                           </span>
                           <ChevronDown className="h-4 w-4 opacity-50" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                         {Object.entries(edgeProfiles).map(([key, profile]) => (
                           <DropdownMenuItem key={key} onClick={() => setGlobalProfileType(key as ProfileType)} className="flex justify-between">
                             <div className="flex items-center">
                               {profile.icon && <profile.icon />}
                               <span>{profile.name}</span>
                             </div>
                             {profile.price > 0 && <span className="text-xs text-muted-foreground ml-4">PKR {profile.price}/rft</span>}
                           </DropdownMenuItem>
                         ))}
                       </DropdownMenuContent>
                    </DropdownMenu>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="min-w-[120px]">Step Width ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</TableHead>
                                <TableHead className="min-w-[120px]">Step Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</TableHead>
                                <TableHead className="min-w-[80px]">Step Qty</TableHead>
                                <TableHead className="text-center">Diagram</TableHead>
                                <TableHead className="w-12">Act</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dimensionRows.map((row, index) => (
                               <React.Fragment key={row.id}>
                                <TableRow>
                                   <TableCell className="font-semibold align-top pt-4">{index + 1}</TableCell>
                                   <TableCell className="align-top">
                                     <div className="space-y-2">
                                       <Input type="text" inputMode="decimal" value={row.width} onChange={e => handleDimensionChange(row.id, 'width', e.target.value)} placeholder={`e.g. ${selectedUnit === 'inches' ? '12.4' : selectedUnit === 'feet' ? '1.5' : selectedUnit === 'cm' ? '45' : '450'}`} className="h-9"/>
                                       <div className="flex flex-col gap-1">
                                         <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Riser Width</Label>
                                         <Input 
                                           type="text" 
                                           inputMode="decimal" 
                                           value={row.riser.width || ''} 
                                           onChange={e => handleRiserDetailChange(row.id, 'width', e.target.value)}
                                           placeholder="e.g. 7" 
                                           className="h-9 text-xs"
                                         />
                                       </div>
                                     </div>
                                   </TableCell>
                                   <TableCell className="align-top">
                                     <div className="space-y-2">
                                       <Input type="text" inputMode="decimal" value={row.length} onChange={e => handleDimensionChange(row.id, 'length', e.target.value)} placeholder={`e.g. ${selectedUnit === 'inches' ? '36' : selectedUnit === 'feet' ? '3' : selectedUnit === 'cm' ? '90' : '900'}`} className="h-9"/>
                                       <div className="flex flex-col gap-1">
                                         <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Riser Length</Label>
                                         <Input 
                                           type="text" 
                                           inputMode="decimal" 
                                           value={row.riser.length || ''} 
                                           onChange={e => handleRiserDetailChange(row.id, 'length', e.target.value)}
                                           placeholder="e.g. 36" 
                                           className="h-9 text-xs"
                                         />
                                       </div>
                                     </div>
                                   </TableCell>
                                   <TableCell className="align-top">
                                     <div className="space-y-2">
                                       <Input type="text" inputMode="numeric" value={row.quantity} onChange={e => handleDimensionChange(row.id, 'quantity', e.target.value)} placeholder="Qty" className="h-9 text-center w-20"/>
                                       <div className="flex flex-col gap-1 items-center">
                                         <Label className="text-[10px] font-semibold text-muted-foreground uppercase text-center">Riser Qty</Label>
                                         <Input 
                                           type="text" 
                                           inputMode="numeric" 
                                           value={row.riser.quantity || ''} 
                                           onChange={e => handleRiserDetailChange(row.id, 'quantity', e.target.value)}
                                           placeholder="Qty" 
                                           className="h-9 text-xs text-center w-20"
                                         />
                                       </div>
                                     </div>
                                   </TableCell>
                                   <TableCell className="text-center align-top pt-4">
                                     <div className="flex flex-col items-center justify-center space-y-2">
                                       <MiniEdgeSelector 
                                         edges={row.edges} 
                                         width={getValueInInches(row.width)} 
                                         length={getValueInInches(row.length)} 
                                         onEdgeClick={edge => handleEdgeClick(row.id, edge)} 
                                         disabled={globalProfileType === 'none'} 
                                         widthStr={row.width} 
                                         lengthStr={row.length} 
                                         unit={selectedUnit}
                                       />
                                       <RiserDiagram 
                                         riser={row.riser} 
                                         unit={selectedUnit} 
                                       />
                                     </div>
                                   </TableCell>
                                   <TableCell className="align-top pt-4"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDimensionRow(row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={6} className="py-2.5 px-4">
                                      <div className="flex flex-wrap items-center gap-4">
                                           <div className="flex items-center space-x-2">
                                             <Checkbox 
                                               id={`hasSkirting-${row.id}`} 
                                               checked={row.riser.hasSkirting || false} 
                                               onCheckedChange={checked => handleRiserDetailChange(row.id, 'hasSkirting', !!checked)}
                                             />
                                             <Label htmlFor={`hasSkirting-${row.id}`} className="text-xs font-bold text-primary cursor-pointer">
                                               Add Skirting
                                             </Label>
                                           </div>

                                           {row.riser.hasSkirting && (
                                             <div className="flex items-center gap-3">
                                               <Select 
                                                 value={row.riser.skirtingType || 'one-sided'} 
                                                 onValueChange={value => handleRiserDetailChange(row.id, 'skirtingType', value as 'one-sided' | 'two-sided')}
                                               >
                                                 <SelectTrigger className="h-8 text-xs w-[140px]">
                                                   <SelectValue />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                   <SelectItem value="one-sided">One-Sided</SelectItem>
                                                   <SelectItem value="two-sided">Two-Sided</SelectItem>
                                                 </SelectContent>
                                               </Select>
                                               
                                               <div className="flex items-center gap-1.5">
                                                 <Label className="text-xs">Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit}):</Label>
                                                 <Input 
                                                   type="text" 
                                                   inputMode="decimal" 
                                                   value={row.riser.skirtingLength || ''} 
                                                   onChange={e => handleRiserDetailChange(row.id, 'skirtingLength', e.target.value)}
                                                   placeholder="L" 
                                                   className="h-8 w-20 text-xs"
                                                 />
                                               </div>
                                             </div>
                                           )}
                                      </div>
                                  </TableCell>
                                </TableRow>
                               </React.Fragment>
                            ))}
                        </TableBody>
                     </Table>
                 </div>
                 <div className="p-4"><Button variant="outline" size="sm" onClick={() => addDimensionRow()}><PlusCircle className="mr-2 h-4 w-4" /> Add Step</Button></div>
              </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Dimensions for Winder Steps (Chowki)</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-4">
                  {winders.map((winder, index) => {
                     const currentMode = winderModes[winder.id] || 'profile';
                     return (
                        <div key={winder.id} className="flex flex-col gap-4 border-b pb-6 mb-6 last:border-0 last:pb-0">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
                                <div className="space-y-4">
                                   <div className="flex items-center justify-between">
                                       <Label className="text-sm font-bold text-primary">Winder (Chowki) #{index + 1}</Label>
                                   </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Width ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</Label>
                                            <Input type="text" inputMode="decimal" value={winder.width} onChange={e => handleWinderChange(winder.id, 'width', e.target.value)} placeholder="Width" className="h-9"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</Label>
                                            <Input type="text" inputMode="decimal" value={winder.length} onChange={e => handleWinderChange(winder.id, 'length', e.target.value)} placeholder="Length" className="h-9"/>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Steps</Label>
                                            <Select value={winder.type} onValueChange={(value: '1-step' | '2-step' | '3-step') => handleWinderChange(winder.id, 'type', value)}>
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1-step">1-Step Winder</SelectItem>
                                                    <SelectItem value="2-step">2-Step Winder</SelectItem>
                                                    <SelectItem value="3-step">3-Step Winder</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Turn Direction</Label>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant={winder.turnDirection === 'left' ? 'secondary' : 'outline'} className="flex-1 h-9" onClick={() => handleWinderChange(winder.id, 'turnDirection', 'left')}><ArrowUpLeft className="mr-1 h-4 w-4" />Left</Button>
                                                <Button size="sm" variant={winder.turnDirection === 'right' ? 'secondary' : 'outline'} className="flex-1 h-9" onClick={() => handleWinderChange(winder.id, 'turnDirection', 'right')}>Right<ArrowUpRight className="ml-1 h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selection Modes Toggles */}
                                    <div className="space-y-2 pt-2 border-t border-dashed">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Click diagram circles to customize:</Label>
                                        <div className="flex flex-wrap gap-2">
                                            <Button 
                                                size="sm" 
                                                variant={currentMode === 'profile' ? 'default' : 'outline'} 
                                                className={`h-9 ${currentMode === 'profile' ? 'bg-destructive hover:bg-destructive/90 text-white font-bold' : ''}`}
                                                onClick={() => setWinderModes({ ...winderModes, [winder.id]: 'profile' })}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 border border-white" />
                                                Edge Profile Selection
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={currentMode === 'riser' ? 'default' : 'outline'} 
                                                className={`h-9 ${currentMode === 'riser' ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold border-amber-600' : ''}`}
                                                onClick={() => setWinderModes({ ...winderModes, [winder.id]: 'riser' })}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 border border-white animate-pulse" />
                                                Riser System Selection
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Riser Height input specifically for winder */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Label className="text-xs text-muted-foreground font-semibold">Riser Height ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit}):</Label>
                                        <Input 
                                            type="text" 
                                            inputMode="decimal" 
                                            value={winder.riserHeight || '7'} 
                                            onChange={e => handleWinderChange(winder.id, 'riserHeight', e.target.value)}
                                            className="h-8 w-16 text-xs text-center font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-3 rounded-md border border-dashed self-stretch md:self-auto justify-center">
                                   <div className="flex flex-col items-center">
                                       <WinderDiagram 
                                           winder={winder} 
                                           onEdgeClick={(edge) => handleWinderEdgeClick(winder.id, edge)} 
                                           onRiserEdgeClick={(edge) => handleWinderRiserEdgeClick(winder.id, edge)} 
                                           disabled={globalProfileType === 'none' && currentMode === 'profile'} 
                                           unit={selectedUnit}
                                           selectionMode={currentMode}
                                       />
                                       <span className="text-[10px] text-muted-foreground mt-2 text-center max-w-[150px]">
                                           {currentMode === 'profile' ? (
                                               <span className="text-destructive font-medium">Click circles to toggle profiled edges (red)</span>
                                           ) : (
                                               <span className="text-amber-600 font-medium">Click circles to toggle riser presence (dashed amber)</span>
                                           )}
                                       </span>
                                   </div>
                                   <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => deleteWinder(winder.id)}><XSquare className="h-6 w-6" /></Button>
                                </div>
                            </div>
                            
                            {/* Dynamically generated riser diagrams based on selected riser system */}
                            <WinderRiserDiagrams winder={winder} unit={selectedUnit} />
                        </div>
                     );
                  })}
                  <Button variant="outline" size="sm" onClick={() => addWinder()}><PlusCircle className="mr-2 h-4 w-4" /> Add Winder</Button>
                </CardContent>
             </Card>
        </div>
        )}

        {applicationType === 'window-sill' && (
          <div className="flex-grow flex flex-col w-full">
            {/* Unit Selection Card at the Top */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {language === 'ur' ? 'پیمائش کا یونٹ' : 'Measurement Unit'}
                    </Label>
                    {selectedUnit !== lastConfiguredUnit && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold animate-pulse uppercase tracking-wider">
                        {language === 'ur' ? 'یونٹ تبدیل ہو گیا ہے! فِٹ پیمائش پر کلک کریں' : 'Unit changed! Click Fit Measurement'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(['inches', 'feet', 'cm', 'mm'] as const).map((unit) => {
                      const displayLabel = language === 'ur' 
                        ? (unit === 'inches' ? 'انچ (Inches)' : unit === 'feet' ? 'فٹ (Feet)' : unit === 'cm' ? 'سینٹی میٹر (CM)' : 'ملی میٹر (MM)')
                        : (unit === 'inches' ? 'Inches' : unit === 'feet' ? 'Feet' : unit === 'cm' ? 'Centimeters' : 'Millimeters');
                      return (
                        <Button
                          key={unit}
                          type="button"
                          variant={selectedUnit === unit ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedUnit(unit)}
                          className="h-9 px-4 text-xs font-bold"
                        >
                          {displayLabel}
                        </Button>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFitMeasurement}
                      disabled={selectedUnit === lastConfiguredUnit}
                      className={cn(
                        "h-9 px-4 text-xs font-extrabold transition-all",
                        selectedUnit !== lastConfiguredUnit 
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse shadow-md" 
                          : "text-muted-foreground cursor-not-allowed opacity-50"
                      )}
                    >
                      {language === 'ur' ? 'پیمائش فٹ کریں (Fit)' : 'Fit Measurement'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center justify-between">
                    <span className="text-sm sm:text-lg">
                      {language === 'ur' ? 'کھڑکی کے سل کی پیمائش' : 'Dimensions for Window Sills'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 px-3">
                           {React.createElement(selectedProfileIcon)}
                           <span className="truncate text-sm mx-2">
                             {edgeProfiles[globalProfileType]?.name || 'Select Profile'}
                           </span>
                           <ChevronDown className="h-4 w-4 opacity-50" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                        {Object.entries(edgeProfiles).map(([key, profile]) => (
                          <DropdownMenuItem key={key} onClick={() => setGlobalProfileType(key as ProfileType)} className="flex justify-between">
                            <div className="flex items-center">
                              {profile.icon && <profile.icon />}
                              <span>{profile.name}</span>
                            </div>
                            {profile.price > 0 && <span className="text-xs text-muted-foreground ml-4">PKR {profile.price}/rft</span>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Tabular View */}
                <div className="hidden md:block">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-16">Sill #</TableHead>
                              <TableHead>Width ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</TableHead>
                              <TableHead>Length ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</TableHead>
                              <TableHead>Inner Cut ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead className="text-center">Diagram</TableHead>
                              <TableHead className="w-16">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                        {windowSillRows.map((row, index) => (
                            <TableRow key={row.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={row.width} 
                                    onChange={(e) => handleWindowSillChange(row.id, 'width', e.target.value)} 
                                    placeholder={selectedUnit === 'inches' ? 'e.g. 12.4' : selectedUnit === 'feet' ? 'e.g. 1' : selectedUnit === 'cm' ? 'e.g. 30' : 'e.g. 300'} 
                                    className="text-base"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={row.length} 
                                    onChange={(e) => handleWindowSillChange(row.id, 'length', e.target.value)} 
                                    placeholder={selectedUnit === 'inches' ? 'e.g. 99' : selectedUnit === 'feet' ? 'e.g. 8' : selectedUnit === 'cm' ? 'e.g. 250' : 'e.g. 2500'} 
                                    className="text-base"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={row.innerCut} 
                                    onChange={(e) => handleWindowSillChange(row.id, 'innerCut', e.target.value)} 
                                    placeholder={selectedUnit === 'inches' ? 'e.g. 5' : selectedUnit === 'feet' ? 'e.g. 0.4' : selectedUnit === 'cm' ? 'e.g. 12' : 'e.g. 120'} 
                                    className="text-base"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    inputMode="numeric" 
                                    value={row.quantity} 
                                    onChange={(e) => handleWindowSillChange(row.id, 'quantity', e.target.value)} 
                                    placeholder="e.g. 1" 
                                    className="text-base"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <MiniEdgeSelector 
                                    edges={row.edges} 
                                    width={getValueInInches(row.width)} 
                                    length={getValueInInches(row.length)} 
                                    onEdgeClick={edge => handleWindowSillEdgeClick(row.id, edge)} 
                                    disabled={globalProfileType === 'none'} 
                                    innerCut={getValueInInches(row.innerCut)} 
                                    widthStr={row.width} 
                                    lengthStr={row.length} 
                                    unit={selectedUnit}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => deleteWindowSillRow(row.id)}>
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                  </Table>
                </div>

                {/* Mobile Responsive Stacked Card View */}
                <div className="block md:hidden space-y-4 p-4 bg-muted/10">
                  {windowSillRows.map((row, index) => (
                    <Card key={row.id} className="border border-border/80 shadow-sm relative overflow-hidden bg-background">
                      <div className="bg-muted/40 px-4 py-2 flex items-center justify-between border-b">
                        <span className="font-extrabold text-sm text-foreground">
                          {language === 'ur' ? `سل # ${index + 1}` : `Sill # ${index + 1}`}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                          onClick={() => deleteWindowSillRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              {language === 'ur' ? `چوڑائی` : `Width`} ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})
                            </Label>
                            <Input 
                              type="text" 
                              inputMode="decimal" 
                              value={row.width} 
                              onChange={(e) => handleWindowSillChange(row.id, 'width', e.target.value)} 
                              placeholder={selectedUnit === 'inches' ? 'e.g. 12.4' : selectedUnit === 'feet' ? 'e.g. 1' : selectedUnit === 'cm' ? 'e.g. 30' : 'e.g. 300'} 
                              className="text-lg font-bold h-12 bg-background border-border/85 focus-visible:ring-primary"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              {language === 'ur' ? `لمبائی` : `Length`} ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})
                            </Label>
                            <Input 
                              type="text" 
                              inputMode="decimal" 
                              value={row.length} 
                              onChange={(e) => handleWindowSillChange(row.id, 'length', e.target.value)} 
                              placeholder={selectedUnit === 'inches' ? 'e.g. 99' : selectedUnit === 'feet' ? 'e.g. 8' : selectedUnit === 'cm' ? 'e.g. 250' : 'e.g. 2500'} 
                              className="text-lg font-bold h-12 bg-background border-border/85 focus-visible:ring-primary"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              {language === 'ur' ? `اندرونی کٹ` : `Inner Cut`} ({selectedUnit === 'inches' ? 'in' : selectedUnit === 'feet' ? 'ft' : selectedUnit})
                            </Label>
                            <Input 
                              type="text" 
                              inputMode="decimal" 
                              value={row.innerCut} 
                              onChange={(e) => handleWindowSillChange(row.id, 'innerCut', e.target.value)} 
                              placeholder={selectedUnit === 'inches' ? 'e.g. 5' : selectedUnit === 'feet' ? 'e.g. 0.4' : selectedUnit === 'cm' ? 'e.g. 12' : 'e.g. 120'} 
                              className="text-lg font-bold h-12 bg-background border-border/85 focus-visible:ring-primary"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              {language === 'ur' ? 'تعداد' : 'Quantity'}
                            </Label>
                            <Input 
                              type="text" 
                              inputMode="numeric" 
                              value={row.quantity} 
                              onChange={(e) => handleWindowSillChange(row.id, 'quantity', e.target.value)} 
                              placeholder="e.g. 1" 
                              className="text-lg font-bold h-12 bg-background border-border/85 focus-visible:ring-primary"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-3 bg-muted/20 rounded-lg border border-dashed border-border/60 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {language === 'ur' ? 'پروفائل ڈایاگرام (کنارے منتخب کریں)' : 'Profile Diagram (Tap to toggles)'}
                          </span>
                          <MiniEdgeSelector 
                            edges={row.edges} 
                            width={getValueInInches(row.width)} 
                            length={getValueInInches(row.length)} 
                            onEdgeClick={edge => handleWindowSillEdgeClick(row.id, edge)} 
                            disabled={globalProfileType === 'none'} 
                            innerCut={getValueInInches(row.innerCut)} 
                            widthStr={row.width} 
                            lengthStr={row.length} 
                            unit={selectedUnit}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 border-t bg-card/20 flex justify-start">
                  <Button variant="outline" size="sm" onClick={() => addWindowSillRow()} className="h-10 px-4 font-bold">
                    <PlusCircle className="mr-2 h-4.5 w-4.5" />
                    {language === 'ur' ? 'مزید کھڑکی کا سل شامل کریں' : 'Add Window Sill'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 space-y-4 text-sm border-t pt-4">
            <Card>
                <CardContent className="p-4">
                    <h4 className="font-bold text-center mb-2">Cost Breakdown for {appTitle}</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-4">
                            <Image src={marble.imageUrl} alt={marble.name} width={80} height={80} className="rounded-md object-cover" />
                            <div className="w-full">
                                <p className="font-semibold text-base">{marble.name}</p>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Final Area (incl. wastage): {finalSqFt.toFixed(2)} sq.ft @ PKR {(variant.price ?? 0).toLocaleString()}/sq.ft</span>
                                    <span className="font-semibold">PKR {marbleTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </div>
                        <Separator className="my-2" />
                        <div className='text-xs space-y-1'>
                          {Object.entries(edgeProfilingCosts).map(([key, value]) => {
                              const profile = edgeProfiles[key as ProfileType];
                              if (!value || value.cost <= 0 || !profile) return null;
                              const currentProfilePrice = costs.edgeProfilePrices[key as keyof typeof costs.edgeProfilePrices] ?? profile.price;
                              return (
                                  <div key={key} className="flex justify-between items-center">
                                      <span>{profile.name} ({value.rft.toFixed(2)} rft @ PKR {currentProfilePrice}/rft):</span>
                                      <span className="font-medium">PKR {value.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                  </div>
                              );
                          })}
                          {innerCutCost > 0 && (
                              <div className="flex justify-between items-center">
                                   <span>Inner Cutting ({innerCutRft.toFixed(2)} rft @ PKR {costs.innerCutRft}/rft):</span>
                                  <span className="font-medium">PKR {innerCutCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                          )}
                        </div>
                    </div>
                     <Separator className="my-2"/>
                     <div className="flex justify-between text-lg font-bold">
                          <span>Total for this item:</span>
                          <span className='text-primary'>PKR {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                </CardContent>
            </Card>


          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSaveClick} disabled={total <= 0}>
                <Save className="mr-2 h-4 w-4" />
                Save Requirement
            </Button>
          </div>
        </div>
      </div>
  );
}


const WinderDiagram = ({ 
  winder, 
  onEdgeClick, 
  onRiserEdgeClick, 
  disabled, 
  unit = 'inches',
  selectionMode = 'profile'
}: { 
  winder: Winder; 
  onEdgeClick: (edge: keyof WinderEdges) => void; 
  onRiserEdgeClick: (edge: keyof WinderEdges) => void; 
  disabled: boolean; 
  unit?: 'inches' | 'feet' | 'cm' | 'mm';
  selectionMode?: 'profile' | 'riser';
}) => {
    const { length: lengthStr, width: widthStr, type, turnDirection, edges } = winder;
    const length = parseFloat(lengthStr) || 100;
    const width = parseFloat(widthStr) || 100;
    const riserEdges = winder.riserEdges || { top: false, bottom: false, left: false, right: false, diag1: false, diag2: false, inner_v: false, inner_h: false };
    
    const Edge = ({ 
      id, 
      x1, 
      y1, 
      x2, 
      y2, 
      mx, 
      my 
    }: { 
      id: keyof WinderEdges; 
      x1: number; 
      y1: number; 
      x2: number; 
      y2: number; 
      mx: number; 
      my: number; 
    }) => {
        const isProfiled = edges[id] || false;
        const hasRiser = riserEdges[id] || false;
        
        const handleLineClick = () => {
            if (disabled) return;
            if (selectionMode === 'profile') {
                onEdgeClick(id);
            } else {
                onRiserEdgeClick(id);
            }
        };

        // Midpoint circle color logic
        let circleColor = '#cbd5e1'; // default gray
        let strokeColor = '#94a3b8';
        let strokeWidth = 1.5;
        let radius = 6;

        if (isProfiled && hasRiser) {
            circleColor = '#f59e0b'; // amber center
            strokeColor = '#ef4444'; // red outer ring
            strokeWidth = 3;
            radius = 5.5;
        } else if (isProfiled) {
            circleColor = '#ef4444';
            strokeColor = '#b91c1c';
            strokeWidth = 1.5;
        } else if (hasRiser) {
            circleColor = '#f59e0b';
            strokeColor = '#d97706';
            strokeWidth = 1.5;
        }

        return (
            <g>
                {/* Invisible wide trigger line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={10} onClick={handleLineClick} className="cursor-pointer" style={{ vectorEffect: 'non-scaling-stroke' }} />
                
                {/* Base gray line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1.5} style={{ vectorEffect: 'non-scaling-stroke' }} />
                
                {/* Profiled line (Red) */}
                {isProfiled && (
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth={3} style={{ vectorEffect: 'non-scaling-stroke' }} />
                )}
                
                {/* Riser line (Amber dashed) */}
                {hasRiser && (
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={3} strokeDasharray="4,3" style={{ vectorEffect: 'non-scaling-stroke' }} />
                )}

                {/* Clickable circle indicator */}
                <g onClick={(e) => { e.stopPropagation(); handleLineClick(); }} className="cursor-pointer select-none">
                    <circle cx={mx} cy={my} r={10} fill="transparent" />
                    <circle cx={mx} cy={my} r={radius} fill={circleColor} stroke={strokeColor} strokeWidth={strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />
                </g>
            </g>
        );
    };
    
    const renderContent = () => {
        const pieceProps = { stroke: "currentColor", strokeWidth: "1.5", style: { vectorEffect: 'non-scaling-stroke' } as React.CSSProperties };
        const mainFill = 'currentColor';
        const secondFill = 'currentColor';
        const thirdFill = 'currentColor';

        if (type === '1-step') {
            return (
                <g>
                    <rect x="0" y="0" width={width} height={length} fill={mainFill} opacity="0.15" {...pieceProps} />
                    <Edge id="bottom" x1={0} y1={length} x2={width} y2={length} mx={width/2} my={length} />
                    <Edge id="right" x1={width} y1={0} x2={width} y2={length} mx={width} my={length/2} />
                    <Edge id="top" x1={0} y1={0} x2={width} y2={0} mx={width/2} my={0} />
                    <Edge id="left" x1={0} y1={0} x2={0} y2={length} mx={0} my={length/2} />
                </g>
            );
        }

        if (turnDirection === 'right') {
            if (type === '2-step') {
                return (
                    <g>
                        <path d={`M 0 0 L ${width} 0 L 0 ${length} Z`} fill={mainFill} opacity="0.1" {...pieceProps} />
                        <path d={`M ${width} 0 L ${width} ${length} L 0 ${length} Z`} fill={secondFill} opacity="0.2" {...pieceProps} />
                        <Edge id="bottom" x1={0} y1={length} x2={width} y2={length} mx={width/2} my={length} />
                        <Edge id="right" x1={width} y1={0} x2={width} y2={length} mx={width} my={length/2} />
                        <Edge id="diag1" x1={0} y1={length} x2={width} y2={0} mx={width/2} my={length/2} />
                    </g>
                );
            } else { // 3-step right
                return (
                    <g>
                        {/* The 3 step shapes radiating from inside pivot (0, length) to outer edges */}
                        <path d={`M 0 0 H ${(width * 2) / 3} L 0 ${length} Z`} fill={mainFill} opacity="0.1" {...pieceProps} />
                        <path d={`M ${(width * 2) / 3} 0 H ${width} V ${length / 3} L 0 ${length} Z`} fill={secondFill} opacity="0.2" {...pieceProps} />
                        <path d={`M 0 ${length} L ${width} ${length / 3} V ${length} Z`} fill={thirdFill} opacity="0.3" {...pieceProps} />

                        <Edge id="bottom" x1={0} y1={length} x2={width} y2={length} mx={width/2} my={length} />
                        <Edge id="right" x1={width} y1={0} x2={width} y2={length} mx={width} my={length/2} />
                        <Edge id="top" x1={0} y1={0} x2={width} y2={0} mx={width/2} my={0} />
                        <Edge id="left" x1={0} y1={0} x2={0} y2={length} mx={0} my={length/2} />
                        <Edge id="diag1" x1={0} y1={length} x2={(width * 2) / 3} y2={0} mx={(width * 2) / 6} my={length/2} />
                        <Edge id="diag2" x1={0} y1={length} x2={width} y2={length / 3} mx={width/2} my={(length + length/3)/2} />
                    </g>
                );
            }
        } else { // Left Turn
             if (type === '2-step') {
                return (
                    <g>
                        <path d={`M 0 0 H ${width} V ${length} Z`} fill={mainFill} opacity="0.1" {...pieceProps} />
                        <path d={`M 0 0 V ${length} H ${width} Z`} fill={secondFill} opacity="0.2" {...pieceProps} />
                        <Edge id="top" x1={0} y1={0} x2={width} y2={0} mx={width/2} my={0} />
                        <Edge id="right" x1={width} y1={0} x2={width} y2={length} mx={width} my={length/2} />
                        <Edge id="diag1" x1={0} y1={0} x2={width} y2={length} mx={width/2} my={length/2} />
                    </g>
                );
            } else { // 3-step left
                return (
                    <g>
                        {/* The 3 step shapes radiating from inside pivot (width, 0) to outer edges */}
                        <path d={`M 0 0 V ${(length * 2) / 3} L ${width} 0 Z`} fill={mainFill} opacity="0.1" {...pieceProps} />
                        <path d={`M 0 ${(length * 2) / 3} V ${length} H ${width / 3} L ${width} 0 Z`} fill={secondFill} opacity="0.2" {...pieceProps} />
                        <path d={`M ${width} 0 L ${width / 3} ${length} H ${width} Z`} fill={thirdFill} opacity="0.3" {...pieceProps} />

                        <Edge id="bottom" x1={0} y1={length} x2={width} y2={length} mx={width/2} my={length} />
                        <Edge id="right" x1={width} y1={0} x2={width} y2={length} mx={width} my={length/2} />
                        <Edge id="top" x1={0} y1={0} x2={width} y2={0} mx={width/2} my={0} />
                        <Edge id="left" x1={0} y1={0} x2={0} y2={length} mx={0} my={length/2} />
                        <Edge id="diag1" x1={width} y1={0} x2={0} y2={(length * 2) / 3} mx={width/2} my={length/3} />
                        <Edge id="diag2" x1={width} y1={0} x2={width / 3} y2={length} mx={(width + width/3)/2} my={length/2} />
                    </g>
                );
            }
        }
    }
    
    return (
        <div className="w-36 h-36 flex flex-col items-center justify-center bg-muted p-2 rounded-md border text-foreground">
            <span className="text-[10px] font-bold opacity-70 mb-1">{type} / {turnDirection}</span>
            <svg viewBox="-20 -20 140 140" className="w-full h-full">
                {renderContent()}
                <text x={width/2} y="-8" fontSize="10" textAnchor="middle" fill="currentColor">{formatDimensionWithUnit(lengthStr, unit)}</text>
                <text x="-8" y={length/2} fontSize="10" textAnchor="end" dominantBaseline="middle" fill="currentColor" transform={`rotate(-90 -8, ${length/2})`}>{formatDimensionWithUnit(widthStr, unit)}</text>
            </svg>
        </div>
    );
};

const WinderRiserDiagrams = ({ 
  winder, 
  unit 
}: { 
  winder: Winder; 
  unit: 'inches' | 'feet' | 'cm' | 'mm' 
}) => {
  const riserHeight = parseFloat(winder.riserHeight || '7') || 7;
  const riserEdges = winder.riserEdges || getDefaultRiserEdges(winder.type, winder.turnDirection);

  const risers: { name: string; length: number; height: number }[] = [];
  const length = parseFloat(winder.length) || 0;
  const width = parseFloat(winder.width) || 0;
  
  if (length <= 0 || width <= 0) return null;

  if (riserEdges.bottom) {
    risers.push({ name: 'Bottom Riser', length: width, height: riserHeight });
  }
  if (riserEdges.top) {
    risers.push({ name: 'Top Riser', length: width, height: riserHeight });
  }
  if (riserEdges.left) {
    risers.push({ name: 'Left Riser', length, height: riserHeight });
  }
  if (riserEdges.right) {
    risers.push({ name: 'Right Riser', length, height: riserHeight });
  }

  if (winder.type === '2-step') {
    if (riserEdges.diag1) {
      const diagLen = Math.sqrt(width * width + length * length);
      risers.push({ name: 'Samosa Riser (Diag 1)', length: diagLen, height: riserHeight });
    }
  } else if (winder.type === '3-step') {
    if (riserEdges.diag1) {
      const diagLen = winder.turnDirection === 'right'
        ? Math.sqrt(Math.pow((2/3) * width, 2) + length * length)
        : Math.sqrt(width * width + Math.pow((2/3) * length, 2));
      risers.push({ name: 'Samosa Riser (Diag 1)', length: diagLen, height: riserHeight });
    }
    if (riserEdges.diag2) {
      const diagLen = winder.turnDirection === 'right'
        ? Math.sqrt(width * width + Math.pow((2/3) * length, 2))
        : Math.sqrt(Math.pow((2/3) * width, 2) + length * length);
      risers.push({ name: 'Samosa Riser (Diag 2)', length: diagLen, height: riserHeight });
    }
  }

  if (risers.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-md w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
          Risers for Winder ({risers.length}):
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Riser Height:</span>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            {winder.riserHeight || '7'} {unit === 'inches' ? 'in' : unit === 'feet' ? 'ft' : unit}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 justify-start">
        {risers.map((r, i) => {
          return (
            <div 
              key={i} 
              className="relative flex flex-col items-center justify-center rounded-sm border-2 border-amber-600/40 bg-amber-500/10 text-foreground border-dashed px-3 py-2 min-w-[120px]"
            >
              <span className="select-none text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                {r.name}
              </span>
              <span className="select-none text-xs font-extrabold text-center leading-none">
                {formatDimensionWithUnit(r.height.toString(), unit)} x {formatDimensionWithUnit(r.length.toFixed(1), unit)}
              </span>
              <span className="select-none text-[9px] text-muted-foreground font-semibold mt-1">
                Qty: 1
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RiserDiagram = ({
  riser,
  unit,
}: {
  riser: Riser;
  unit: 'inches' | 'feet' | 'cm' | 'mm';
}) => {
  const widthVal = riser.width || '';
  const lengthVal = riser.length || '';
  const quantityVal = riser.quantity || '';

  const hasDimensions = widthVal && lengthVal;
  if (!hasDimensions) return null;

  return (
    <div className="flex h-20 w-32 items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div
          className="relative flex h-[52px] w-[96px] flex-col items-center justify-center rounded-sm border-2 border-amber-600/50 bg-amber-500/10 text-foreground border-dashed"
          title={`Riser: ${widthVal} x ${lengthVal} (Qty: ${quantityVal || 1})`}
        >
          <span className="select-none text-[9px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">
            Riser
          </span>
          <span className="select-none text-xs font-bold text-center leading-none">
            {formatDimensionWithUnit(widthVal, unit)} x {formatDimensionWithUnit(lengthVal, unit)}
          </span>
          {quantityVal && (
            <span className="select-none text-[9px] text-muted-foreground font-semibold mt-0.5">
              Qty: {quantityVal}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
