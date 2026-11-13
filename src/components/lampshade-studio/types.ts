export type WaveformType = 'sine' | 'sharp' | 'scallop' | 'cellular' | 'fluted';

export type ModulationMode = 'lithoOuter' | 'lithoInner' | 'embossBoth';

export type WallStyle = 'solid' | 'vase';

export type SocketType = 'none' | 'e27' | 'e14' | 'spider' | 'cord_grip';

export type SocketPosition = 'top' | 'bottom';

export type FilamentMaterial = 
  | 'white_pla' 
  | 'ivory_pla' 
  | 'sandstone_marble' 
  | 'silk_gold' 
  | 'terracotta' 
  | 'clear_petg' 
  | 'matte_black';

export type PrinterBed = 'bambu_256' | 'ender_220' | 'prusa_250' | 'large_300';

export interface LampshadeParams {
  // 1. Dimensions (mm)
  height: number;
  bottomRadius: number;
  topRadius: number;
  waist: number;
  waistPos: number;

  // 2. Parametric Ribs
  waveType: WaveformType;
  ribCount: number;
  ribDepth: number;
  twist: number; // degrees
  vWaveCount: number;
  vWaveAmp: number;

  // 3. Lithophane & Image Modulation
  imgActive: boolean;
  imgMode: ModulationMode;
  imgDepth: number; // mm
  imgTileU: number;
  imgTileV: number;
  imgBlur: number; // px
  imgInvert: boolean; // darker = thicker

  // 4. 3D Print & Wall Structure
  wallStyle: WallStyle;
  wallThickness: number; // mm (for solid mode)
  rimLipSize: number; // mm extra thickness at rims
  rimHeight: number; // mm height of solid rims

  // 5. Hardware Fitter / Socket
  socketType: SocketType;
  socketPosition: SocketPosition;
  socketDrop: number; // mm inset from rim
  spokeCount: number;
  spokeWidth: number; // mm
  spokeThickness: number; // mm

  // 6. Mesh Resolution
  radialSegments: number;
  heightSegments: number;

  // 7. Lighting & Simulation
  lightBulbOn: boolean;
  bulbIntensity: number; // Lumens / intensity
  bulbColorTemp: 'candle' | 'warm' | 'neutral' | 'rgb';
  bulbCustomColor: string;
  filament: FilamentMaterial;
  printerBed: PrinterBed;
  sliceCutPlane: number; // 0 = off, 0.05 to 1.0 = vertical cut plane

  // Client Order Details
  clientName?: string;
  clientPhone?: string;
  clientNotes?: string;
  quotePrice?: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  nameUr: string;
  desc: string;
  params: Partial<LampshadeParams>;
}

export interface SavedProject {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  quotePrice: number;
  updatedAt: string;
  params: LampshadeParams;
  thumbnailDataUrl?: string;
}
