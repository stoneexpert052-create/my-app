'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Lightbulb,
  Download,
  Upload,
  Layers,
  Sliders,
  Settings2,
  Save,
  FolderOpen,
  Trash2,
  Sparkles,
  Printer,
  RotateCcw,
  Box,
  Image as ImageIcon,
  Check,
  Copy,
  Info,
  DollarSign,
  Maximize2,
  Flame,
  Palette,
  FileCode,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LampshadeParams, SavedProject, FilamentMaterial, PrinterBed, WaveformType, ModulationMode, SocketType, SocketPosition } from '@/components/lampshade-studio/types';
import { DEFAULT_LAMPSHADE_PARAMS, STUDIO_PRESETS } from '@/components/lampshade-studio/presets';
import { generateProceduralPattern, processImageToHeightmap, ProceduralPatternType } from '@/components/lampshade-studio/procedural-patterns';
import { GenerationResult } from '@/components/lampshade-studio/lampshade-generator';

// Dynamically import Three.js viewer component to avoid SSR hydration issues
const LampshadeViewer = dynamic(
  () => import('@/components/lampshade-studio/lampshade-viewer').then(mod => mod.LampshadeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-sm font-mono tracking-wider">Loading 3D WebGL Studio...</span>
      </div>
    )
  }
);

export default function LampshadeStudioPage() {
  const { toast } = useToast();

  // Active Parameters State
  const [params, setParams] = useState<LampshadeParams>(DEFAULT_LAMPSHADE_PARAMS);

  // Heightmap & Image States
  const [heightmapCanvas, setHeightmapCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [processingImage, setProcessingImage] = useState<boolean>(false);

  // Stats from 3D Engine
  const [stats, setStats] = useState<GenerationResult | null>(null);

  // Exporter Handle
  const exporterRef = useRef<{
    downloadSTL: (filename?: string) => void;
    downloadOBJ: (filename?: string) => void;
  } | null>(null);

  // Client Projects Dialog & Storage
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState('Custom Lampshade #1');

  // Load Saved Projects from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lumina_saved_projects');
      if (stored) {
        setSavedProjects(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not load saved projects', e);
    }
  }, []);

  // Update Parameter helper
  const updateParam = <K extends keyof LampshadeParams>(key: K, value: LampshadeParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Apply Presets
  const applyPreset = (presetId: string) => {
    const found = STUDIO_PRESETS.find(p => p.id === presetId);
    if (!found) return;

    setParams(prev => ({
      ...prev,
      ...found.params
    }));

    // If preset enables lithophane, generate appropriate pattern
    if (found.id === 'lithoCylinder') {
      loadProceduralPattern('mandala');
    } else if (found.id === 'jali') {
      loadProceduralPattern('jali');
    }

    toast({
      title: `Preset: ${found.name} (${found.nameUr})`,
      description: found.desc
    });
  };

  // Load Procedural Pattern into Heightmap
  const loadProceduralPattern = (type: ProceduralPatternType) => {
    const canvas = generateProceduralPattern(type, 512, 512);
    setHeightmapCanvas(canvas);
    setPreviewThumbnail(canvas.toDataURL('image/png'));
    setImageFileName(`Procedural ${type.toUpperCase()}`);
    updateParam('imgActive', true);

    toast({
      title: 'پیٹرن لوڈ ہو گیا (Pattern Loaded)',
      description: `${type.toUpperCase()} pattern applied to 3D surface.`
    });
  };

  // Handle User Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    try {
      const canvas = await processImageToHeightmap(file, {
        invert: params.imgInvert,
        blur: params.imgBlur,
        targetWidth: 512,
        targetHeight: 512
      });

      setHeightmapCanvas(canvas);
      setPreviewThumbnail(canvas.toDataURL('image/png'));
      setImageFileName(file.name);
      updateParam('imgActive', true);

      toast({
        title: 'تصویر لوڈ ہو گئی (Image Uploaded)',
        description: `"${file.name}" converted to 3D lithophane relief map.`
      });
    } catch (err: any) {
      toast({
        title: 'Error processing image',
        description: err.message || 'Failed to read image file.',
        variant: 'destructive'
      });
    } finally {
      setProcessingImage(false);
    }
  };

  // Clear Image
  const clearImage = () => {
    setHeightmapCanvas(null);
    setPreviewThumbnail(null);
    setImageFileName('');
    updateParam('imgActive', false);
  };

  // Save Current Client Project
  const saveClientProject = () => {
    const newProject: SavedProject = {
      id: `proj-${Date.now()}`,
      name: currentProjectName.trim() || 'Untitled Lampshade',
      clientName: params.clientName || 'General Client',
      clientPhone: params.clientPhone || '',
      quotePrice: params.quotePrice || 0,
      updatedAt: new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
      params: { ...params },
      thumbnailDataUrl: previewThumbnail || undefined
    };

    const updated = [newProject, ...savedProjects.filter(p => p.id !== newProject.id)];
    setSavedProjects(updated);
    try {
      localStorage.setItem('lumina_saved_projects', JSON.stringify(updated));
      toast({
        title: 'پروجیکٹ محفوظ ہو گیا! 💾',
        description: `Project "${newProject.name}" saved for ${newProject.clientName}.`
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Load Saved Project
  const loadSavedProject = (proj: SavedProject) => {
    setParams(proj.params);
    setCurrentProjectName(proj.name);
    setIsProjectsModalOpen(false);
    toast({
      title: 'پروجیکٹ لوڈ ہو گیا 📂',
      description: `Loaded project "${proj.name}" for ${proj.clientName}.`
    });
  };

  // Delete Project
  const deleteProject = (id: string) => {
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem('lumina_saved_projects', JSON.stringify(updated));
  };

  // Export STL Trigger
  const handleDownloadSTL = () => {
    if (!exporterRef.current) return;
    const clientSlug = (params.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `LuminaPrint_${clientSlug}_${params.waveType}_H${params.height}mm.stl`;
    exporterRef.current.downloadSTL(filename);
    toast({
      title: '3D STL فائل ڈاؤنلوڈ ہو گئی! 🖨️',
      description: `"${filename}" is ready for Bambu Studio, Cura, or PrusaSlicer.`
    });
  };

  // Export OBJ Trigger
  const handleDownloadOBJ = () => {
    if (!exporterRef.current) return;
    const clientSlug = (params.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `LuminaPrint_${clientSlug}_H${params.height}mm.obj`;
    exporterRef.current.downloadOBJ(filename);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Top Studio Action Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
            <Lightbulb className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                LuminaPrint 3D
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                3D Lampshade & Lithophane Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              کلائنٹس کے لیے لیمپ شیڈ، لیتھوفین فوٹو اور پیٹرنز تیار کر کے 3D STL فائل پرنٹنگ کے لیے حاصل کریں
            </p>
          </div>
        </div>

        {/* Live Metrics & Quick Export */}
        <div className="flex items-center gap-2 sm:gap-3">
          {stats && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400">Dim:</span>
              <span className="text-amber-400 font-bold">{stats.dimensions.widthMm}×{stats.dimensions.depthMm}×{stats.dimensions.heightMm}mm</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Weight:</span>
              <span className="text-emerald-400 font-bold">{stats.weightGrams}g PLA</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Time:</span>
              <span className="text-indigo-400 font-bold">~{stats.estimatedPrintTimeHours}h</span>
            </div>
          )}

          {/* Saved Projects Modal */}
          <Dialog open={isProjectsModalOpen} onOpenChange={setIsProjectsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 gap-1.5 cursor-pointer">
                <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Saved Designs ({savedProjects.length})</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                  <span>محفوظ شدہ کلائنٹ پروجیکٹس (Saved Client Designs)</span>
                </DialogTitle>
              </DialogHeader>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {savedProjects.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    کوئی محفوظ شدہ ڈیزائن موجود نہیں ہے۔ اپنے موجودہ ڈیزائن کو &quot;Save Project&quot; سے محفوظ کریں۔
                  </div>
                ) : (
                  savedProjects.map(proj => (
                    <div key={proj.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition">
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <span>{proj.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono">H: {proj.params.height}mm</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Client: <strong>{proj.clientName}</strong> {proj.clientPhone && `(${proj.clientPhone})`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Saved: {proj.updatedAt} • Quote: PKR {proj.quotePrice?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" onClick={() => loadSavedProject(proj)} className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">
                          Load
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteProject(proj.id)} className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-950/30 cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick Save Project */}
          <Button
            onClick={saveClientProject}
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs border-amber-600/50 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 gap-1.5 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save Project</span>
          </Button>

          {/* Direct 3D Printable STL Download Button */}
          <Button
            onClick={handleDownloadSTL}
            size="sm"
            className="h-9 px-3.5 text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export STL (.stl)</span>
          </Button>
        </div>
      </header>

      {/* Main Studio Body: Left Sidebar Controls + Right 3D Viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* Left Control Panel */}
        <aside className="w-full md:w-[410px] lg:w-[440px] bg-slate-900/95 border-r border-slate-800 flex flex-col h-1/2 md:h-full z-10 shadow-2xl shrink-0">
          
          {/* Quick Presets Bar */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-450 flex items-center gap-1.5 text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Quick Presets (تیار ڈیزائن)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Instant 3D Shapes</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {STUDIO_PRESETS.slice(0, 6).map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 rounded-lg py-1.5 px-2 text-left transition text-xs group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-amber-300 truncate">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{preset.nameUr}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Control Tabs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

            {/* TABBED SECTIONS */}
            <Tabs defaultValue="dimensions" className="w-full">
              <TabsList className="grid grid-cols-4 bg-slate-950 p-1 rounded-xl border border-slate-800 h-9 mb-4">
                <TabsTrigger value="dimensions" className="text-[11px] data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
                  Shape
                </TabsTrigger>
                <TabsTrigger value="litho" className="text-[11px] data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
                  Litho Map
                </TabsTrigger>
                <TabsTrigger value="hardware" className="text-[11px] data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
                  Fitter / Print
                </TabsTrigger>
                <TabsTrigger value="light" className="text-[11px] data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
                  Light & Bulb
                </TabsTrigger>
              </TabsList>

              {/* 1. DIMENSIONS & SURFACE RIBS */}
              <TabsContent value="dimensions" className="space-y-4 m-0">
                {/* Dimensions Box */}
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5" />
                      <span>1. Dimensions & Silhouette (سائز)</span>
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">Millimeters (mm)</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Total Height (کل اونچائی)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.height} mm</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="320"
                      step="1"
                      value={params.height}
                      onChange={(e) => updateParam('height', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Bottom Radius</span>
                        <span className="font-mono text-amber-400 font-bold">{params.bottomRadius} mm</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="140"
                        step="1"
                        value={params.bottomRadius}
                        onChange={(e) => updateParam('bottomRadius', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Top Radius</span>
                        <span className="font-mono text-amber-400 font-bold">{params.topRadius} mm</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="140"
                        step="1"
                        value={params.topRadius}
                        onChange={(e) => updateParam('topRadius', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Middle Bulge / Waist (درمیان میں ابھار یا کمر)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.waist > 0 ? `+${params.waist}` : params.waist} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="75"
                      step="1"
                      value={params.waist}
                      onChange={(e) => updateParam('waist', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Bulge Vertical Position</span>
                      <span className="font-mono text-amber-400 font-bold">{params.waistPos.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.85"
                      step="0.05"
                      value={params.waistPos}
                      onChange={(e) => updateParam('waistPos', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Surface Ribs Box */}
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <h2 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>2. Parametric Surface Ribs (پسلیوں کا پیٹرن)</span>
                  </h2>

                  <div>
                    <label className="block text-slate-300 mb-1">Waveform Profile (لہروں کی قسم)</label>
                    <Select value={params.waveType} onValueChange={(val: WaveformType) => updateParam('waveType', val)}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="sine">Smooth Sine Ribs (نرم گول لہریں)</SelectItem>
                        <SelectItem value="sharp">Sharp Origami Pleats (تیز تکونی پلیٹس)</SelectItem>
                        <SelectItem value="scallop">Rounded Scallops (سیپ نما دائرے)</SelectItem>
                        <SelectItem value="cellular">Diamond Knurling (ڈائمنڈ جالی دار)</SelectItem>
                        <SelectItem value="fluted">Fluted Concave (محرابی کھانچے)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Rib Count</span>
                        <span className="font-mono text-amber-400 font-bold">{params.ribCount}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="72"
                        step="1"
                        value={params.ribCount}
                        onChange={(e) => updateParam('ribCount', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Rib Depth</span>
                        <span className="font-mono text-amber-400 font-bold">{params.ribDepth.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        value={params.ribDepth}
                        onChange={(e) => updateParam('ribDepth', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Twist Angle (گھماؤ / اسپائرل اینگل)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.twist}°</span>
                    </div>
                    <input
                      type="range"
                      min="-360"
                      max="360"
                      step="5"
                      value={params.twist}
                      onChange={(e) => updateParam('twist', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Vertical Ripples</span>
                        <span className="font-mono text-amber-400 font-bold">{params.vWaveCount}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="0.5"
                        value={params.vWaveCount}
                        onChange={(e) => updateParam('vWaveCount', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Ripple Amp</span>
                        <span className="font-mono text-amber-400 font-bold">{params.vWaveAmp} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={params.vWaveAmp}
                        onChange={(e) => updateParam('vWaveAmp', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 2. LITHOPHANE & IMAGE MAP */}
              <TabsContent value="litho" className="space-y-4 m-0">
                <div className="space-y-3 bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Lithophane & Image Embossing (لیتھوفین تصویر)</span>
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {params.imgActive ? 'Active Map' : 'Inactive'}
                    </span>
                  </div>

                  {/* Upload Custom Image & Clear */}
                  <div className="flex gap-2 items-center">
                    <label className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer text-center transition flex items-center justify-center gap-2">
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      <span>{processingImage ? 'Processing...' : 'Upload Client Photo...'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>

                    {params.imgActive && (
                      <Button size="sm" variant="outline" onClick={clearImage} className="border-red-900/50 hover:bg-red-950/40 text-red-300 h-9 px-3 text-xs">
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Built-in Procedural Patterns */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Built-in Decorative Patterns (تیار پیٹرنز):</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={() => loadProceduralPattern('voronoi')} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[11px] text-center border border-slate-700">Cellular</button>
                      <button onClick={() => loadProceduralPattern('mandala')} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[11px] text-center border border-slate-700">Geo Lattice</button>
                      <button onClick={() => loadProceduralPattern('jali')} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[11px] text-center border border-slate-700">Islamic Jali</button>
                      <button onClick={() => loadProceduralPattern('marble')} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[11px] text-center border border-slate-700">Onyx Vein</button>
                      <button onClick={() => loadProceduralPattern('gradient')} className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg text-[11px] text-center border border-slate-700">Sunset Wave</button>
                    </div>
                  </div>

                  {/* Active Preview Thumbnail */}
                  {previewThumbnail && (
                    <div className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <img src={previewThumbnail} alt="Heightmap" className="w-14 h-14 rounded-lg border border-slate-700 object-cover bg-black" />
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-amber-300 truncate">{imageFileName || 'Active Relief Map'}</div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={params.imgInvert}
                            onChange={(e) => updateParam('imgInvert', e.target.checked)}
                            className="rounded text-amber-500"
                          />
                          <span className="text-[10px]">Darker = Thicker (Classic Lithophane)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Modulation Mode */}
                  <div>
                    <label className="block text-slate-300 mb-1">Modulation Mode (ابھار کا طریقہ)</label>
                    <Select value={params.imgMode} onValueChange={(val: ModulationMode) => updateParam('imgMode', val)}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="lithoOuter">Lithophane Outer Relief (Smooth Inside)</SelectItem>
                        <SelectItem value="lithoInner">Hidden Inner Lithophane (Smooth Outside)</SelectItem>
                        <SelectItem value="embossBoth">Surface Emboss (Displaces Entire Wall)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Relief Depth / Amplitude (ابھار کی گہرائی)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.imgDepth.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7.0"
                      step="0.2"
                      value={params.imgDepth}
                      onChange={(e) => updateParam('imgDepth', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Horiz. Tiles</span>
                        <span className="font-mono text-amber-400 font-bold">{params.imgTileU}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="6"
                        step="1"
                        value={params.imgTileU}
                        onChange={(e) => updateParam('imgTileU', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Vert. Tiles</span>
                        <span className="font-mono text-amber-400 font-bold">{params.imgTileV}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={params.imgTileV}
                        onChange={(e) => updateParam('imgTileV', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 3. HARDWARE FITTER & 3D PRINTING */}
              <TabsContent value="hardware" className="space-y-4 m-0">
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <h2 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Printer className="h-3.5 w-3.5" />
                    <span>3. 3D Print Structure & Shell Style</span>
                  </h2>

                  <div>
                    <label className="block text-slate-300 mb-1">Print Shell Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateParam('wallStyle', 'solid')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                          params.wallStyle === 'solid' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Solid Double-Wall (مضبوط خول)
                      </button>
                      <button
                        onClick={() => updateParam('wallStyle', 'vase')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                          params.wallStyle === 'vase' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Vase Mode (سنگل وال ویز)
                      </button>
                    </div>
                  </div>

                  {params.wallStyle === 'solid' && (
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Wall Thickness (خول کی موٹائی)</span>
                        <span className="font-mono text-amber-400 font-bold">{params.wallThickness.toFixed(1)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1.2"
                        max="4.0"
                        step="0.2"
                        value={params.wallThickness}
                        onChange={(e) => updateParam('wallThickness', Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Recommended: 2.0mm - 2.4mm for optimal lithophane translucency & rigidity.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Rim Lip Flange</span>
                        <span className="font-mono text-amber-400 font-bold">{params.rimLipSize} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3.0"
                        step="0.5"
                        value={params.rimLipSize}
                        onChange={(e) => updateParam('rimLipSize', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Rim Height</span>
                        <span className="font-mono text-amber-400 font-bold">{params.rimHeight} mm</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="12"
                        step="1"
                        value={params.rimHeight}
                        onChange={(e) => updateParam('rimHeight', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Hardware Fitter Socket */}
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <h2 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5" />
                    <span>Hardware Socket Fitter (بلب ہولڈر کالر)</span>
                  </h2>

                  <div>
                    <label className="block text-slate-300 mb-1">Socket Type</label>
                    <Select value={params.socketType} onValueChange={(val: SocketType) => updateParam('socketType', val)}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="e27">E27 Standard (41mm Hole - زیادہ تر عام بلب)</SelectItem>
                        <SelectItem value="e14">E14 Small (28mm Hole - چھوٹا موم بتی بلب)</SelectItem>
                        <SelectItem value="spider">Spider / Harp Fitter (10.5mm Post)</SelectItem>
                        <SelectItem value="cord_grip">Pendant Cord Grip (12mm Hole)</SelectItem>
                        <SelectItem value="none">None (بغیر ہولڈر - ویز یا ڈیکوریشن)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {params.socketType !== 'none' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 mb-1">Mount Position</label>
                          <Select value={params.socketPosition} onValueChange={(val: SocketPosition) => updateParam('socketPosition', val)}>
                            <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                              <SelectItem value="bottom">Bottom (ٹیبل لیمپ)</SelectItem>
                              <SelectItem value="top">Top (چھت کا فانوس)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">Spokes Count</label>
                          <Select value={String(params.spokeCount)} onValueChange={(val) => updateParam('spokeCount', Number(val))}>
                            <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                              <SelectItem value="3">3 Spokes (ٹرائی پوڈ)</SelectItem>
                              <SelectItem value="4">4 Spokes (کراس مستحکم)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-300 mb-1">
                          <span>Drop Inset Depth (کالر کی گہرائی)</span>
                          <span className="font-mono text-amber-400 font-bold">{params.socketDrop} mm</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="40"
                          step="1"
                          value={params.socketDrop}
                          onChange={(e) => updateParam('socketDrop', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* 4. LIGHTING & SIMULATION */}
              <TabsContent value="light" className="space-y-4 m-0">
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5" />
                      <span>Internal Bulb & Glow Simulation (بلب ٹیسٹ)</span>
                    </h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateParam('lightBulbOn', !params.lightBulbOn)}
                      className={`h-7 px-2.5 text-xs font-bold ${
                        params.lightBulbOn ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {params.lightBulbOn ? 'Bulb: ON' : 'Bulb: OFF'}
                    </Button>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Bulb Color Temperature</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => updateParam('bulbColorTemp', 'candle')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center ${
                          params.bulbColorTemp === 'candle' ? 'bg-amber-700/40 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Candle (2000K)
                      </button>
                      <button
                        onClick={() => updateParam('bulbColorTemp', 'warm')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center ${
                          params.bulbColorTemp === 'warm' ? 'bg-amber-600/40 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Warm (2700K)
                      </button>
                      <button
                        onClick={() => updateParam('bulbColorTemp', 'neutral')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center ${
                          params.bulbColorTemp === 'neutral' ? 'bg-blue-600/30 border-blue-400 text-blue-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Cool (4000K)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Light Intensity (روشنی کی شدت)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.bulbIntensity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={params.bulbIntensity}
                      onChange={(e) => updateParam('bulbIntensity', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Filament Selection */}
                  <div>
                    <label className="block text-slate-300 mb-1">3D Print Filament Material (مٹیریل)</label>
                    <Select value={params.filament} onValueChange={(val: FilamentMaterial) => updateParam('filament', val)}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="white_pla">Translucent White Litho PLA (سب سے زیادہ چمک)</SelectItem>
                        <SelectItem value="ivory_pla">Warm Ivory / Cream PLA (کلاسک گرم نور)</SelectItem>
                        <SelectItem value="sandstone_marble">Sandstone / Marble PLA (سنگ مرمر لک)</SelectItem>
                        <SelectItem value="silk_gold">Silk Champagne Gold (شاہی گولڈن فنش)</SelectItem>
                        <SelectItem value="terracotta">Terracotta Clay (مٹی رنگ کا لیمپ)</SelectItem>
                        <SelectItem value="clear_petg">Translucent Clear PETG (شفاف گلاس ایفیکٹ)</SelectItem>
                        <SelectItem value="matte_black">Matte Charcoal Black (جدید بلیک شیڈ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Printer Bed Preset */}
                  <div>
                    <label className="block text-slate-300 mb-1">3D Printer Bed Volume (پرنٹر بیڈ)</label>
                    <Select value={params.printerBed} onValueChange={(val: PrinterBed) => updateParam('printerBed', val)}>
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                        <SelectItem value="bambu_256">Bambu Lab X1/P1/A1 (256 × 256 mm)</SelectItem>
                        <SelectItem value="ender_220">Creality Ender 3 / V3 (220 × 220 mm)</SelectItem>
                        <SelectItem value="prusa_250">Prusa MK4 / Core One (250 × 210 mm)</SelectItem>
                        <SelectItem value="large_300">Large Format Bed (300 × 300 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cross-Section Cut Plane */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Inspect Cross-Section Slice (اندرونی وال کٹ ویو)</span>
                      <span className="font-mono text-amber-400 font-bold">{params.sliceCutPlane > 0 ? 'Cut Active' : 'Off'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="1"
                      value={params.sliceCutPlane}
                      onChange={(e) => updateParam('sliceCutPlane', Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">سلائس ویو سے آپ اندرونی خول کی موٹائی اور ساکٹ سپورٹ چیک کر سکتے ہیں۔</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Client Order Card */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <FileCode className="h-3.5 w-3.5 text-amber-400" />
                  <span>Client Order & Quote (کلائنٹ معلومات)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Est. Material: PKR {Math.round((stats?.weightGrams || 150) * 4.5)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Client Name (گاہک کا نام)"
                  value={params.clientName || ''}
                  onChange={(e) => updateParam('clientName', e.target.value)}
                  className="h-8 text-xs bg-slate-900 border-slate-700"
                />
                <Input
                  placeholder="WhatsApp / Phone"
                  value={params.clientPhone || ''}
                  onChange={(e) => updateParam('clientPhone', e.target.value)}
                  className="h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Project Name"
                  value={currentProjectName}
                  onChange={(e) => setCurrentProjectName(e.target.value)}
                  className="h-8 text-xs bg-slate-900 border-slate-700 font-semibold"
                />
                <Input
                  type="number"
                  placeholder="Quote Price (PKR)"
                  value={params.quotePrice || ''}
                  onChange={(e) => updateParam('quotePrice', Number(e.target.value))}
                  className="h-8 text-xs bg-slate-900 border-slate-700 font-mono text-amber-400 font-bold"
                />
              </div>
            </div>

          </div>
        </aside>

        {/* Right 3D Viewport Area */}
        <main className="flex-1 h-1/2 md:h-full relative overflow-hidden bg-slate-950">
          <LampshadeViewer
            params={params}
            heightmapCanvas={heightmapCanvas}
            onStatsCalculated={setStats}
            onExporterReady={(exporter) => {
              exporterRef.current = exporter;
            }}
          />
        </main>
      </div>

    </div>
  );
}
