'use client';

import React, { useRef, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAdminBackground } from '@/context/admin-background-context';
import { useTheme } from '@/context/theme-context';
import { 
  Upload, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Sliders, 
  Volume2, 
  SunMedium, 
  Eye, 
  Layers, 
  Check, 
  Loader2, 
  ImageIcon, 
  Sun, 
  Moon,
  Maximize2
} from 'lucide-react';
import Image from 'next/image';

const PRESET_FACTORY_IMAGES = [
  {
    id: 'factory-1',
    name: 'Industrial Marble Gang Saw Plant',
    desc: 'Heavy-duty stone cutting machines and marble blocks',
    url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'factory-2',
    name: 'Italian Stone Warehouse & Slabs',
    desc: 'Polished bookmatched slabs on industrial A-frames',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'factory-3',
    name: 'Quarry Stone Yard & Raw Blocks',
    desc: 'Outdoor raw stone quarry blocks and heavy machinery',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'factory-4',
    name: 'Architectural Stone & Granite Gallery',
    desc: 'Clean architectural stonework and polished slabs',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80',
  }
];

export function AdminBackgroundSettings() {
  const { 
    config, 
    isSaving, 
    updateLiveConfig, 
    saveConfig, 
    uploadImage, 
    setImageUrlDirectly, 
    clearImage, 
    resetToDefault 
  } = useAdminBackground();

  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState<'current' | 'light' | 'dark'>('current');

  const activeTheme = previewMode === 'current' ? theme : previewMode;
  const isLight = activeTheme === 'light';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImage(file);
    }
  };

  // Safe numerical values
  const highlightVal = typeof config.highlight === 'number' ? config.highlight : 100;
  const blurVal = typeof config.blur === 'number' ? config.blur : 4;
  const opacityVal = typeof config.opacity === 'number' ? config.opacity : 25;
  const contrastVal = typeof config.contrast === 'number' ? config.contrast : 105;

  return (
    <Card id="admin-background-settings" className="border-amber-500/20 shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground font-headline text-xl">
              <Sliders className="h-5 w-5 text-amber-500" />
              <span>Admin Panel Background & Visual Controls</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Upload a custom marble factory background image and calibrate its highlight, blur, and opacity levels with volume controls.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Live Real-time Tuning
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* TOP SECTION: IMAGE UPLOAD & PRESET SELECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>1. Admin Background Image Source</span>
            </Label>
            {config.imageUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:bg-destructive/10 text-xs"
                onClick={() => clearImage()}
                disabled={isSaving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Reset to Default Photo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Area / Dropzone */}
            <div 
              className={`lg:col-span-6 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-amber-500 bg-amber-500/10 scale-[0.99]' 
                  : 'border-muted-foreground/25 hover:border-amber-500/60 bg-muted/20 hover:bg-muted/40'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSaving}
              />
              
              <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                {isSaving ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground">
                {isSaving ? 'Processing Image...' : 'Click to Upload or Drag & Drop'}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Upload custom factory photo, showroom image, or plant artwork (PNG, JPG, WebP up to 10MB). Auto-compressed for cloud sync.
              </p>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="pointer-events-none text-xs">
                  Browse Device
                </Button>
              </div>
            </div>

            {/* Curated Factory Presets */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Or choose a curated stone factory preset:</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_FACTORY_IMAGES.map((preset) => {
                  const isSelected = config.imageUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setImageUrlDirectly(preset.url)}
                      className={`group relative text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between overflow-hidden ${
                        isSelected 
                          ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5' 
                          : 'border-border/60 hover:border-amber-500/50 bg-card hover:bg-accent/40'
                      }`}
                    >
                      <div className="relative h-16 w-full rounded overflow-hidden mb-2 bg-muted">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-[11px] text-foreground line-clamp-1">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: VOLUME CONTROLS (HIGHLIGHT, BLUR, OPACITY, CONTRAST) */}
        <div className="space-y-6 pt-4 border-t">
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-amber-500" />
              <span>2. Visual Calibrator & Volume Faders</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fine-tune the visual density, exposure/highlight glow, and focus softness with precision studio sliders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CONTROL 1: HIGHLIGHT / BRIGHTNESS VOLUME */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SunMedium className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Highlight / Exposure Level</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {highlightVal}%
                </Badge>
              </div>

              {/* Volume / Level Visual Bar */}
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const stepVal = (idx + 1) * 10;
                  const isLit = highlightVal >= stepVal;
                  return (
                    <div 
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors duration-150 ${
                        isLit 
                          ? idx > 15 ? 'bg-rose-500' : idx > 10 ? 'bg-amber-400' : 'bg-emerald-500' 
                          : 'bg-muted/40'
                      }`} 
                    />
                  );
                })}
              </div>

              <Slider
                min={20}
                max={200}
                step={5}
                value={[highlightVal]}
                onValueChange={(vals) => updateLiveConfig({ highlight: vals[0] })}
                className="py-1"
              />

              {/* Quick Highlight Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Subdued (50%)', val: 50 },
                  { label: 'Balanced (100%)', val: 100 },
                  { label: 'Luminous (140%)', val: 140 },
                  { label: 'Max Glow (180%)', val: 180 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateLiveConfig({ highlight: item.val })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      highlightVal === item.val
                        ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTROL 2: BLUR & SOFTNESS VOLUME */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold">Blur & Focus Softness</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
                  {blurVal}px
                </Badge>
              </div>

              {/* Volume / Level Visual Bar */}
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const stepVal = (idx + 1) * 1.5;
                  const isLit = blurVal >= stepVal;
                  return (
                    <div 
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors duration-150 ${
                        isLit ? 'bg-indigo-500' : 'bg-muted/40'
                      }`} 
                    />
                  );
                })}
              </div>

              <Slider
                min={0}
                max={30}
                step={1}
                value={[blurVal]}
                onValueChange={(vals) => updateLiveConfig({ blur: vals[0] })}
                className="py-1"
              />

              {/* Quick Blur Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Sharp (0px)', val: 0 },
                  { label: 'Subtle (4px)', val: 4 },
                  { label: 'Glass (10px)', val: 10 },
                  { label: 'Deep Focus (20px)', val: 20 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateLiveConfig({ blur: item.val })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      blurVal === item.val
                        ? 'bg-indigo-500 text-white border-indigo-500 font-semibold'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTROL 3: OPACITY & INTENSITY VOLUME */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Opacity / Visual Volume</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  {opacityVal}%
                </Badge>
              </div>

              {/* Volume / Level Visual Bar */}
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const stepVal = (idx + 1) * 5;
                  const isLit = opacityVal >= stepVal;
                  return (
                    <div 
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors duration-150 ${
                        isLit ? 'bg-emerald-500' : 'bg-muted/40'
                      }`} 
                    />
                  );
                })}
              </div>

              <Slider
                min={5}
                max={100}
                step={5}
                value={[opacityVal]}
                onValueChange={(vals) => updateLiveConfig({ opacity: vals[0] })}
                className="py-1"
              />

              {/* Quick Opacity Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Ambient (15%)', val: 15 },
                  { label: 'Standard (25%)', val: 25 },
                  { label: 'Vivid (50%)', val: 50 },
                  { label: 'Full (85%)', val: 85 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateLiveConfig({ opacity: item.val })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      opacityVal === item.val
                        ? 'bg-emerald-500 text-white border-emerald-500 font-semibold'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTROL 4: CONTRAST LEVEL */}
            <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm font-semibold">Contrast & Clarity</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10">
                  {contrastVal}%
                </Badge>
              </div>

              {/* Volume / Level Visual Bar */}
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const stepVal = (idx + 1) * 7.5;
                  const isLit = contrastVal >= stepVal;
                  return (
                    <div 
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors duration-150 ${
                        isLit ? 'bg-cyan-500' : 'bg-muted/40'
                      }`} 
                    />
                  );
                })}
              </div>

              <Slider
                min={50}
                max={180}
                step={5}
                value={[contrastVal]}
                onValueChange={(vals) => updateLiveConfig({ contrast: vals[0] })}
                className="py-1"
              />

              {/* Quick Contrast Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Soft (85%)', val: 85 },
                  { label: 'Crisp (105%)', val: 105 },
                  { label: 'Punchy (135%)', val: 135 },
                  { label: 'High Depth (160%)', val: 160 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateLiveConfig({ contrast: item.val })}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      contrastVal === item.val
                        ? 'bg-cyan-500 text-white border-cyan-500 font-semibold'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: LIVE INTERACTIVE DASHBOARD SANDBOX PREVIEW */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-primary" />
              <span>3. Live Admin Panel Simulation Preview</span>
            </Label>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
              <button
                type="button"
                onClick={() => setPreviewMode('current')}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                  previewMode === 'current' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                }`}
              >
                Current ({theme})
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('light')}
                className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  previewMode === 'light' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                }`}
              >
                <Sun className="h-3 w-3 text-amber-500" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dark')}
                className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  previewMode === 'dark' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                }`}
              >
                <Moon className="h-3 w-3 text-indigo-400" />
                Dark
              </button>
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div className={`relative h-64 w-full rounded-xl overflow-hidden border shadow-inner ${isLight ? 'bg-[#faf8f5]' : 'bg-slate-950'}`}>
            {/* Background Layer with Applied Filters */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={config.imageUrl || 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1920&q=80'}
                alt="Simulated Factory Background"
                style={{
                  filter: `blur(${blurVal}px) brightness(${highlightVal}%) contrast(${contrastVal}%)`,
                  opacity: opacityVal / 100,
                  transform: `scale(${blurVal > 0 ? 1.05 + (blurVal * 0.003) : 1})`,
                }}
                className="w-full h-full object-cover object-center transition-all duration-200"
              />
              <div className={`absolute inset-0 ${
                isLight 
                  ? 'bg-gradient-to-b from-[#faf8f5]/85 via-[#f5f1ea]/75 to-[#fdfcfa]/85' 
                  : 'bg-gradient-to-b from-slate-950/85 via-stone-950/80 to-slate-950/90'
              }`} />
            </div>

            {/* Simulated Admin Content */}
            <div className="relative z-10 h-full p-4 flex flex-col justify-between">
              {/* Mock Admin Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border backdrop-blur-md ${
                isLight ? 'bg-white/80 border-slate-200/80 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold font-headline">Stone Expert Admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-70">Orders: 14 Active</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>

              {/* Mock Dashboard Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg border backdrop-blur-md ${
                  isLight ? 'bg-white/70 border-slate-200 text-slate-800' : 'bg-slate-900/70 border-slate-800 text-slate-100'
                }`}>
                  <span className="text-[10px] text-muted-foreground block">Inventory Stock</span>
                  <span className="text-sm font-bold font-mono">48,200 sqft</span>
                </div>
                <div className={`p-3 rounded-lg border backdrop-blur-md ${
                  isLight ? 'bg-white/70 border-slate-200 text-slate-800' : 'bg-slate-900/70 border-slate-800 text-slate-100'
                }`}>
                  <span className="text-[10px] text-muted-foreground block">Today's Quotations</span>
                  <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">PKR 1.2M</span>
                </div>
                <div className={`p-3 rounded-lg border backdrop-blur-md ${
                  isLight ? 'bg-white/70 border-slate-200 text-slate-800' : 'bg-slate-900/70 border-slate-800 text-slate-100'
                }`}>
                  <span className="text-[10px] text-muted-foreground block">Active Labor Teams</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">8 Teams</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1">
                <span>Real-time preview with current blur ({blurVal}px) & highlight ({highlightVal}%)</span>
                <span className="font-mono">Live Sync Ready</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 bg-muted/20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetToDefault()}
          disabled={isSaving}
          className="w-full sm:w-auto text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset to Calibrated Defaults
        </Button>

        <Button
          size="sm"
          onClick={() => saveConfig()}
          disabled={isSaving}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Save Background & Visual Settings
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
