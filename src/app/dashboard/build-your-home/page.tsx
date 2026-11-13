'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getBuildYourHomeRatesConfig, 
  updateBuildYourHomeRates, 
  defaultBuildYourHomeRates, 
  type BuildYourHomeRates,
  type CustomRenovationCategory,
  type CustomRenovationItem
} from '@/lib/admin-actions';
import { 
  Hammer, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  Building2, 
  Wrench, 
  Palette, 
  Edit3, 
  Check, 
  RefreshCw,
  Ruler,
  DollarSign,
  PlusCircle,
  HelpCircle,
  Sliders,
  TrendingUp,
  Scale,
  Info
} from 'lucide-react';

export default function AdminBuildYourHomeRatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<BuildYourHomeRates>(defaultBuildYourHomeRates);
  const [samplePlotSize, setSamplePlotSize] = useState<'marla5' | 'marla10' | 'kanal1' | 'kanal2' | 'custom'>('marla10');
  const [customPlotArea, setCustomPlotArea] = useState<number>(2200);

  const baseCost = rates.newProjects.baseCostPerSqFt ?? rates.newProjects.gradeRates.budget ?? 120;
  const gradeMultipliers = {
    standard: rates.newProjects.gradeMultipliers?.standard ?? 1.0,
    premium: rates.newProjects.gradeMultipliers?.premium ?? 1.83,
    luxury: rates.newProjects.gradeMultipliers?.luxury ?? 3.75,
  };

  const handleMultiplierChange = (grade: 'standard' | 'premium' | 'luxury', val: number) => {
    const validVal = Math.max(0.1, isNaN(val) ? 0.1 : Number(val.toFixed(2)));
    const newMultipliers = {
      ...gradeMultipliers,
      [grade]: validVal,
    };
    
    const newGradeRates = {
      budget: Math.round(baseCost * newMultipliers.standard),
      premium: Math.round(baseCost * newMultipliers.premium),
      luxury: Math.round(baseCost * newMultipliers.luxury),
    };

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        baseCostPerSqFt: baseCost,
        gradeMultipliers: newMultipliers,
        gradeRates: newGradeRates,
      }
    }));
  };

  const handleBaseCostChange = (newBase: number) => {
    const validBase = Math.max(1, isNaN(newBase) ? 1 : newBase);
    const newGradeRates = {
      budget: Math.round(validBase * gradeMultipliers.standard),
      premium: Math.round(validBase * gradeMultipliers.premium),
      luxury: Math.round(validBase * gradeMultipliers.luxury),
    };

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        baseCostPerSqFt: validBase,
        gradeRates: newGradeRates,
      }
    }));
  };

  const handleDirectRateChange = (grade: 'budget' | 'premium' | 'luxury', val: number) => {
    const validVal = Math.max(0, isNaN(val) ? 0 : val);
    const updatedGradeRates = {
      ...rates.newProjects.gradeRates,
      [grade]: validVal,
    };

    let updatedMultipliers = { ...gradeMultipliers };
    if (grade === 'budget') {
      const newBase = validVal || 1;
      updatedMultipliers.standard = 1.0;
      setRates(prev => ({
        ...prev,
        newProjects: {
          ...prev.newProjects,
          baseCostPerSqFt: newBase,
          gradeRates: {
            ...updatedGradeRates,
            budget: newBase,
            premium: Math.round(newBase * gradeMultipliers.premium),
            luxury: Math.round(newBase * gradeMultipliers.luxury),
          },
          gradeMultipliers: updatedMultipliers,
        }
      }));
      return;
    } else if (grade === 'premium') {
      updatedMultipliers.premium = Number((validVal / (baseCost || 1)).toFixed(2));
    } else if (grade === 'luxury') {
      updatedMultipliers.luxury = Number((validVal / (baseCost || 1)).toFixed(2));
    }

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        gradeRates: updatedGradeRates,
        gradeMultipliers: updatedMultipliers,
      }
    }));
  };

  const sampleAreas: Record<string, { label: string; sqft: number }> = {
    marla5: { label: '5 Marla', sqft: rates.newProjects.baseAreaSqFt?.marla5 || 1100 },
    marla10: { label: '10 Marla', sqft: rates.newProjects.baseAreaSqFt?.marla10 || 2200 },
    kanal1: { label: '1 Kanal', sqft: rates.newProjects.baseAreaSqFt?.kanal1 || 4500 },
    kanal2: { label: '2 Kanal', sqft: rates.newProjects.baseAreaSqFt?.kanal2 || 9000 },
    custom: { label: 'Custom', sqft: customPlotArea },
  };

  const activeSimulatorArea = samplePlotSize === 'custom' ? customPlotArea : sampleAreas[samplePlotSize].sqft;

  const stdRate = rates.newProjects.gradeRates.budget || Math.round(baseCost * gradeMultipliers.standard);
  const premRate = rates.newProjects.gradeRates.premium || Math.round(baseCost * gradeMultipliers.premium);
  const luxRate = rates.newProjects.gradeRates.luxury || Math.round(baseCost * gradeMultipliers.luxury);

  const stdTotal = activeSimulatorArea * stdRate;
  const premTotal = activeSimulatorArea * premRate;
  const luxTotal = activeSimulatorArea * luxRate;

  const premDeltaTotal = premTotal - stdTotal;
  const luxDeltaTotal = luxTotal - stdTotal;

  const premDeltaRate = premRate - stdRate;
  const luxDeltaRate = luxRate - stdRate;

  const premImpactPct = ((gradeMultipliers.premium - gradeMultipliers.standard) / (gradeMultipliers.standard || 1)) * 100;
  const luxImpactPct = ((gradeMultipliers.luxury - gradeMultipliers.standard) / (gradeMultipliers.standard || 1)) * 100;

  // Dialog States for Category & Item creation
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCatTitleEn, setNewCatTitleEn] = useState('');
  const [newCatTitleUr, setNewCatTitleUr] = useState('');
  const [newCatDescEn, setNewCatDescEn] = useState('');
  const [newCatDescUr, setNewCatDescUr] = useState('');

  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemNameUr, setNewItemNameUr] = useState('');
  const [newItemRate, setNewItemRate] = useState<number>(100);
  const [newItemUnit, setNewItemUnit] = useState('PKR / Sq. Ft');
  const [newItemDescEn, setNewItemDescEn] = useState('');

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const config = await getBuildYourHomeRatesConfig();
        if (config) {
          setRates(config);
        }
      } catch (e) {
        console.error("Error loading rates config:", e);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      const res = await updateBuildYourHomeRates(rates);
      if (res.success) {
        toast({
          title: "Rates Updated Successfully!",
          description: "Build Your Home rates and categories have been saved to Firestore.",
        });
      } else {
        toast({
          title: "Failed to Save Rates",
          description: res.error || "An error occurred while saving.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error Saving Rates",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Category Operations
  const handleAddCategory = () => {
    if (!newCatTitleEn.trim()) {
      toast({ title: "Category title required", variant: "destructive" });
      return;
    }

    const newCategory: CustomRenovationCategory = {
      id: `cat-${Date.now()}`,
      titleEn: newCatTitleEn.trim(),
      titleUr: newCatTitleUr.trim() || undefined,
      descriptionEn: newCatDescEn.trim() || undefined,
      descriptionUr: newCatDescUr.trim() || undefined,
      items: []
    };

    const updatedCategories = [...(rates.customCategories || []), newCategory];
    const updatedRates = { ...rates, customCategories: updatedCategories };
    setRates(updatedRates);

    // Reset Form
    setNewCatTitleEn('');
    setNewCatTitleUr('');
    setNewCatDescEn('');
    setNewCatDescUr('');
    setShowAddCategoryDialog(false);

    // Persist to Firestore and broadcast live
    updateBuildYourHomeRates(updatedRates);
    toast({ title: "Category Added & Synced", description: `Added "${newCategory.titleEn}" category.` });
  };

  const handleDeleteCategory = async (catId: string) => {
    const updated = (rates.customCategories || []).filter(c => c.id !== catId);
    const updatedRates = { ...rates, customCategories: updated };
    setRates(updatedRates);
    await updateBuildYourHomeRates(updatedRates);
    toast({ title: "Category Removed & Synced", description: "Changes reflected live in customer app." });
  };

  // Item Operations
  const handleOpenAddItem = (catId: string) => {
    setSelectedCatId(catId);
    setNewItemNameEn('');
    setNewItemNameUr('');
    setNewItemRate(100);
    setNewItemUnit('PKR / Sq. Ft');
    setNewItemDescEn('');
    setShowAddItemDialog(true);
  };

  const handleAddItem = async () => {
    if (!selectedCatId || !newItemNameEn.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }

    const newItem: CustomRenovationItem = {
      id: `item-${Date.now()}`,
      nameEn: newItemNameEn.trim(),
      nameUr: newItemNameUr.trim() || undefined,
      rate: Number(newItemRate) || 0,
      unit: newItemUnit.trim() || 'PKR / Sq. Ft',
      descriptionEn: newItemDescEn.trim() || undefined,
    };

    const updatedCategories = (rates.customCategories || []).map(cat => {
      if (cat.id === selectedCatId) {
        return {
          ...cat,
          items: [...cat.items, newItem]
        };
      }
      return cat;
    });

    const updatedRates = { ...rates, customCategories: updatedCategories };
    setRates(updatedRates);
    setShowAddItemDialog(false);
    await updateBuildYourHomeRates(updatedRates);
    toast({ title: "Item Added & Synced", description: `Added "${newItem.nameEn}". Live in app now.` });
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    let deletedName = '';
    const updatedCategories = (rates.customCategories || []).map(cat => {
      if (cat.id === catId) {
        const itemObj = cat.items.find(i => i.id === itemId);
        if (itemObj) deletedName = itemObj.nameEn;
        return {
          ...cat,
          items: cat.items.filter(i => i.id !== itemId)
        };
      }
      return cat;
    });
    const updatedRates = { ...rates, customCategories: updatedCategories };
    setRates(updatedRates);
    await updateBuildYourHomeRates(updatedRates);
    toast({ title: "Item Deleted & Synced", description: `Deleted "${deletedName || itemId}". Removed from app.` });
  };

  const handleItemRateChange = (catId: string, itemId: string, newRate: number) => {
    const updatedCategories = (rates.customCategories || []).map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, rate: newRate } : item)
        };
      }
      return cat;
    });
    setRates({ ...rates, customCategories: updatedCategories });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-[#dfb96c]" />
          <span>Loading Build Your Home configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Hammer className="h-6 w-6 text-[#dfb96c]" />
            <h1 className="text-2xl font-bold font-headline">Build Your Home Rates & Categories Manager</h1>
          </div>
          <p className="text-sm text-slate-400">
            Configure floor covered areas, per sq. ft construction rates, and manage work categories (Woodwork, Paint, Ceiling, Steel, Marble, Plumbing, etc.)
          </p>
        </div>

        <Button 
          onClick={handleSaveRates} 
          disabled={saving}
          className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold shrink-0 px-6 py-5"
        >
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving to Firestore...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="covered-area" className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-4 bg-muted p-1 rounded-xl">
          <TabsTrigger value="covered-area" className="font-semibold text-xs sm:text-sm">
            <Ruler className="mr-2 h-4 w-4 text-[#dfb96c]" />
            Floor Covered Area & Rates
          </TabsTrigger>
          <TabsTrigger value="categories" className="font-semibold text-xs sm:text-sm">
            <Layers className="mr-2 h-4 w-4 text-[#dfb96c]" />
            Work Categories & Rates
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="font-semibold text-xs sm:text-sm">
            <Wrench className="mr-2 h-4 w-4 text-[#dfb96c]" />
            Maintenance & Care
          </TabsTrigger>
          <TabsTrigger value="interior" className="font-semibold text-xs sm:text-sm">
            <Palette className="mr-2 h-4 w-4 text-[#dfb96c]" />
            Interior Systems
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: COVERED AREA & FLOOR RATES */}
        {/* ------------------------------------------------------------------- */}
        <TabsContent value="covered-area" className="space-y-6 mt-4">
          <Card className="border-amber-500/20 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-amber-500" />
                    Construction Grade Multipliers & Material Quality Tiers
                  </CardTitle>
                  <CardDescription>
                    Configure multipliers for Standard, Premium, and Luxury grades. Multipliers scale directly off your baseline construction rate with real-time feedback.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border text-xs">
                  <span className="text-muted-foreground font-medium">Base Reference:</span>
                  <span className="font-bold text-foreground">PKR {baseCost}/sq.ft</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Baseline Rate Controller */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="admin-base-cost-sqft" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-amber-500" />
                    Baseline Construction Rate (PKR per Sq. Ft)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Fundamental finish cost baseline from which all grade multipliers calculate client project estimates.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      id="admin-base-cost-sqft"
                      type="number"
                      min="1"
                      value={baseCost}
                      onChange={(e) => handleBaseCostChange(Number(e.target.value))}
                      className="font-bold text-base pl-12 h-10"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">PKR</span>
                  </div>
                </div>
              </div>

              {/* Three Grade Multipliers & Real-Time Impact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Grade */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Standard Local</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                        Baseline Grade
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="admin-grade-mult-standard" className="text-xs font-semibold">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-grade-mult-standard"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.standard}
                          onChange={(e) => handleMultiplierChange('standard', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 1.00× (100% baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="admin-grade-budget" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="admin-grade-budget"
                        type="number"
                        value={stdRate}
                        onChange={(e) => handleDirectRateChange('budget', Number(e.target.value))}
                        className="font-bold text-sm h-8"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gradeMultipliers.standard === 1.0 ? '±0% (Baseline)' : `${gradeMultipliers.standard > 1 ? '+' : ''}${((gradeMultipliers.standard - 1) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.standard / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Sunny White / Ziarat local marble
                    </p>
                  </div>
                </div>

                {/* Premium Grade */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Premium Local</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        +{premImpactPct.toFixed(1)}% Cost
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="admin-grade-mult-premium" className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-grade-mult-premium"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.premium}
                          onChange={(e) => handleMultiplierChange('premium', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm border-amber-500/40"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 1.83× (+83% over baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="admin-grade-premium" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="admin-grade-premium"
                        type="number"
                        value={premRate}
                        onChange={(e) => handleDirectRateChange('premium', Number(e.target.value))}
                        className="font-bold text-sm h-8 border-amber-500/30"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        +{premDeltaRate} PKR/sqft (+{premImpactPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.premium / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Boticena / Badam / Local Granite
                    </p>
                  </div>
                </div>

                {/* Luxury Grade */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Imported Luxury</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        +{luxImpactPct.toFixed(1)}% Cost
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="admin-grade-mult-luxury" className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-grade-mult-luxury"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.luxury}
                          onChange={(e) => handleMultiplierChange('luxury', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm border-purple-500/40"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-purple-600 dark:text-purple-400 font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 3.75× (+275% over baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="admin-grade-luxury" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="admin-grade-luxury"
                        type="number"
                        value={luxRate}
                        onChange={(e) => handleDirectRateChange('luxury', Number(e.target.value))}
                        className="font-bold text-sm h-8 border-purple-500/30"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400">
                        +{luxDeltaRate} PKR/sqft (+{luxImpactPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-purple-500/20 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.luxury / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Italian Carrera / Spanish Botticino / Exotic Granite
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-Time Impact Feedback Indicator & Live House Project Simulator */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Real-Time Impact Feedback (Client Cost Simulator)</h5>
                      <p className="text-[11px] text-muted-foreground">
                        Live preview of how the configured multipliers impact total base finishing costs for different home sizes.
                      </p>
                    </div>
                  </div>

                  {/* Plot Size Selector */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    {(['marla5', 'marla10', 'kanal1', 'kanal2', 'custom'] as const).map((plotKey) => {
                      const isActive = samplePlotSize === plotKey;
                      const areaLabel = plotKey === 'custom' ? 'Custom' : sampleAreas[plotKey].label;
                      return (
                        <button
                          key={plotKey}
                          type="button"
                          onClick={() => setSamplePlotSize(plotKey)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                            isActive 
                              ? 'bg-amber-500 text-white font-bold shadow-xs' 
                              : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {areaLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Area Input if Custom selected */}
                {samplePlotSize === 'custom' && (
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border">
                    <Label htmlFor="admin-custom-sim-area" className="text-xs font-semibold whitespace-nowrap">
                      Custom Covered Area (Sq. Ft):
                    </Label>
                    <Input
                      id="admin-custom-sim-area"
                      type="number"
                      min="100"
                      value={customPlotArea}
                      onChange={(e) => setCustomPlotArea(Math.max(1, Number(e.target.value)))}
                      className="h-8 max-w-[160px] font-bold text-xs"
                    />
                    <span className="text-xs text-muted-foreground">sq.ft covered area for simulation</span>
                  </div>
                )}

                {/* 3-Way Real-Time Cost Impact Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Standard Estimate */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Standard ({gradeMultipliers.standard.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold">Baseline</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      PKR {stdTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {activeSimulatorArea.toLocaleString()} sq.ft @ PKR {stdRate}/sqft
                    </div>
                  </div>

                  {/* Premium Estimate */}
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Premium ({gradeMultipliers.premium.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                        +{premImpactPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      PKR {premTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-400/80 flex items-center justify-between">
                      <span>Impact Delta:</span>
                      <span>+PKR {premDeltaTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Luxury Estimate */}
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">Luxury ({gradeMultipliers.luxury.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                        +{luxImpactPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      PKR {luxTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-purple-700/80 dark:text-purple-400/80 flex items-center justify-between">
                      <span>Impact Delta:</span>
                      <span>+PKR {luxDeltaTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Explanatory Live Feedback Banner */}
                <div className="flex items-start gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs text-muted-foreground">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Real-time Impact Summary:</strong> On a <span className="font-semibold text-foreground">{activeSimulatorArea.toLocaleString()} sq.ft</span> home, choosing <span className="font-semibold text-amber-600 dark:text-amber-400">Premium ({gradeMultipliers.premium.toFixed(2)}×)</span> increases cost by <span className="font-semibold text-foreground">PKR {premDeltaTotal.toLocaleString()}</span> over baseline. Choosing <span className="font-semibold text-purple-600 dark:text-purple-400">Luxury ({gradeMultipliers.luxury.toFixed(2)}×)</span> creates a <span className="font-semibold text-foreground">PKR {luxDeltaTotal.toLocaleString()}</span> upgrade difference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default Floor Covered Area Breakdown per Plot Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="h-5 w-5 text-[#dfb96c]" />
                Floor Covered Area Defaults (Sq. Ft Breakdown)
              </CardTitle>
              <CardDescription>
                Define standard covered area square footage for each floor (Ground, First, Basement) across plot sizes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'marla5', label: '5 Marla Plot', totalBase: rates.newProjects.baseAreaSqFt.marla5 },
                { key: 'marla10', label: '10 Marla Plot', totalBase: rates.newProjects.baseAreaSqFt.marla10 },
                { key: 'kanal1', label: '1 Kanal Plot', totalBase: rates.newProjects.baseAreaSqFt.kanal1 },
                { key: 'kanal2', label: '2 Kanal Plot', totalBase: rates.newProjects.baseAreaSqFt.kanal2 },
                { key: 'commercial', label: 'Plaza / Commercial', totalBase: rates.newProjects.baseAreaSqFt.commercial },
              ].map((plot) => {
                const floorDef = rates.newProjects.floorDefaults?.[plot.key as keyof typeof rates.newProjects.floorDefaults] || { ground: 1100, first: 1100, basement: 1100 };
                return (
                  <div key={plot.key} className="p-4 border rounded-xl space-y-3 bg-card">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-base text-[#dfb96c]">{plot.label}</span>
                      <Badge variant="outline">
                        Total Double Floor Base: {floorDef.ground + floorDef.first} Sq.Ft
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Ground Floor Covered Area (Sq.Ft)</Label>
                        <Input 
                          type="number"
                          value={floorDef.ground}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRates({
                              ...rates,
                              newProjects: {
                                ...rates.newProjects,
                                floorDefaults: {
                                  ...rates.newProjects.floorDefaults,
                                  [plot.key]: { ...floorDef, ground: val }
                                } as any
                              }
                            });
                          }}
                          className="mt-1 font-semibold"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">First Floor Covered Area (Sq.Ft)</Label>
                        <Input 
                          type="number"
                          value={floorDef.first}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRates({
                              ...rates,
                              newProjects: {
                                ...rates.newProjects,
                                floorDefaults: {
                                  ...rates.newProjects.floorDefaults,
                                  [plot.key]: { ...floorDef, first: val }
                                } as any
                              }
                            });
                          }}
                          className="mt-1 font-semibold"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Basement Covered Area (Sq.Ft)</Label>
                        <Input 
                          type="number"
                          value={floorDef.basement}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRates({
                              ...rates,
                              newProjects: {
                                ...rates.newProjects,
                                floorDefaults: {
                                  ...rates.newProjects.floorDefaults,
                                  [plot.key]: { ...floorDef, basement: val }
                                } as any
                              }
                            });
                          }}
                          className="mt-1 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Floor Rate Multipliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#dfb96c]" />
                Floor Specific Rate Multipliers
              </CardTitle>
              <CardDescription>
                Adjust cost multipliers for structural complexities (e.g. Basement excavation & waterproofing usually costs +15%).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <Label className="font-semibold text-xs">Ground Floor Multiplier</Label>
                <Input 
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.ground || 1.0}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        mezzanine: rates.newProjects.floorRateMultipliers?.mezzanine ?? 0.85,
                        second: rates.newProjects.floorRateMultipliers?.second ?? 0.90,
                        ...rates.newProjects.floorRateMultipliers,
                        ground: Number(e.target.value) || 1.0,
                        first: rates.newProjects.floorRateMultipliers?.first || 0.95,
                        basement: rates.newProjects.floorRateMultipliers?.basement || 1.15
                      }
                    }
                  })}
                  className="mt-1 font-semibold"
                />
                <span className="text-[11px] text-muted-foreground">Base ground rate factor (1.0 = 100%)</span>
              </div>

              <div>
                <Label className="font-semibold text-xs">First Floor Multiplier</Label>
                <Input 
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.first || 0.95}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        mezzanine: rates.newProjects.floorRateMultipliers?.mezzanine ?? 0.85,
                        second: rates.newProjects.floorRateMultipliers?.second ?? 0.90,
                        ...rates.newProjects.floorRateMultipliers,
                        ground: rates.newProjects.floorRateMultipliers?.ground || 1.0,
                        first: Number(e.target.value) || 0.95,
                        basement: rates.newProjects.floorRateMultipliers?.basement || 1.15
                      }
                    }
                  })}
                  className="mt-1 font-semibold"
                />
                <span className="text-[11px] text-muted-foreground">First floor labor/material factor (e.g. 0.95)</span>
              </div>

              <div>
                <Label className="font-semibold text-xs">Basement Floor Multiplier</Label>
                <Input 
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.basement || 1.15}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        mezzanine: rates.newProjects.floorRateMultipliers?.mezzanine ?? 0.85,
                        second: rates.newProjects.floorRateMultipliers?.second ?? 0.90,
                        ...rates.newProjects.floorRateMultipliers,
                        ground: rates.newProjects.floorRateMultipliers?.ground || 1.0,
                        first: rates.newProjects.floorRateMultipliers?.first || 0.95,
                        basement: Number(e.target.value) || 1.15
                      }
                    }
                  })}
                  className="mt-1 font-semibold"
                />
                <span className="text-[11px] text-muted-foreground">Basement excavation & concrete factor (e.g. 1.15)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: WORK CATEGORIES & RATES */}
        {/* ------------------------------------------------------------------- */}
        <TabsContent value="categories" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-headline">Work Categories & Custom Rates</h2>
              <p className="text-sm text-muted-foreground">
                Manage all renovation and construction categories: Woodwork, Paint, False Ceiling, Steel Fabrication, Marble, Plumbing, Electrical, Windows, etc.
              </p>
            </div>

            <Button 
              onClick={() => setShowAddCategoryDialog(true)}
              className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 gap-6">
            {(rates.customCategories || []).map((cat) => (
              <Card key={cat.id} className="border border-border shadow-sm">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-[#dfb96c]">{cat.titleEn}</CardTitle>
                      {cat.titleUr && (
                        <span className="text-xs text-muted-foreground font-urdu" dir="rtl">({cat.titleUr})</span>
                      )}
                    </div>
                    {cat.descriptionEn && (
                      <CardDescription className="text-xs mt-1">{cat.descriptionEn}</CardDescription>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleOpenAddItem(cat.id)}
                      className="border-[#dfb96c] text-[#dfb96c] hover:bg-[#dfb96c]/10 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Item
                    </Button>

                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {cat.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No work items added yet in this category.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cat.items.map((item) => (
                        <div key={item.id} className="p-3 border rounded-lg bg-card flex items-center justify-between gap-3">
                          <div className="space-y-0.5 max-w-[60%]">
                            <span className="font-semibold text-xs sm:text-sm block truncate">{item.nameEn}</span>
                            {item.nameUr && (
                              <span className="text-[11px] text-muted-foreground block truncate" dir="rtl">{item.nameUr}</span>
                            )}
                            {item.descriptionEn && (
                              <span className="text-[10px] text-slate-400 block truncate">{item.descriptionEn}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <Input 
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleItemRateChange(cat.id, item.id, Number(e.target.value) || 0)}
                                className="w-24 text-right font-bold text-xs h-8"
                              />
                              <span className="text-[10px] text-muted-foreground block mt-0.5">{item.unit}</span>
                            </div>

                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteItem(cat.id, item.id)}
                              className="text-muted-foreground hover:text-red-500 h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: MAINTENANCE RATES */}
        {/* ------------------------------------------------------------------- */}
        <TabsContent value="maintenance" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#dfb96c]" />
                Marble Maintenance & Restoration Rates (PKR per Sq. Ft)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <Label className="font-semibold text-xs">Diamond Polishing Rate</Label>
                <Input 
                  type="number"
                  value={rates.maintenance.polishing}
                  onChange={(e) => setRates({ ...rates, maintenance: { ...rates.maintenance, polishing: Number(e.target.value) || 0 } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Crack & Pinhole Repair Rate</Label>
                <Input 
                  type="number"
                  value={rates.maintenance.repair}
                  onChange={(e) => setRates({ ...rates, maintenance: { ...rates.maintenance, repair: Number(e.target.value) || 0 } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Stain Removal & Deep Cleaning</Label>
                <Input 
                  type="number"
                  value={rates.maintenance.cleaning}
                  onChange={(e) => setRates({ ...rates, maintenance: { ...rates.maintenance, cleaning: Number(e.target.value) || 0 } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Nano Hydrophobic Sealing</Label>
                <Input 
                  type="number"
                  value={rates.maintenance.sealing}
                  onChange={(e) => setRates({ ...rates, maintenance: { ...rates.maintenance, sealing: Number(e.target.value) || 0 } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Joint Alignment & Lippage Grind</Label>
                <Input 
                  type="number"
                  value={rates.maintenance.alignment}
                  onChange={(e) => setRates({ ...rates, maintenance: { ...rates.maintenance, alignment: Number(e.target.value) || 0 } })}
                  className="mt-1 font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: INTERIOR WORK SYSTEM RATES */}
        {/* ------------------------------------------------------------------- */}
        <TabsContent value="interior" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-[#dfb96c]" />
                Interior Stone Feature Wall Rates (PKR per Sq. Ft)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <Label className="font-semibold text-xs">Bookmatched Italian Slab Rate</Label>
                <Input 
                  type="number"
                  value={rates.interior.techniques.bookmatched}
                  onChange={(e) => setRates({ ...rates, interior: { ...rates.interior, techniques: { ...rates.interior.techniques, bookmatched: Number(e.target.value) || 0 } } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Translucent Backlit Onyx Wall Rate</Label>
                <Input 
                  type="number"
                  value={rates.interior.techniques.backlitOnyx}
                  onChange={(e) => setRates({ ...rates, interior: { ...rates.interior, techniques: { ...rates.interior.techniques, backlitOnyx: Number(e.target.value) || 0 } } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">CNC 3D Carved Relief Panel Rate</Label>
                <Input 
                  type="number"
                  value={rates.interior.techniques.cncCarved}
                  onChange={(e) => setRates({ ...rates, interior: { ...rates.interior, techniques: { ...rates.interior.techniques, cncCarved: Number(e.target.value) || 0 } } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Waterjet Brass & Marble Inlay Rate</Label>
                <Input 
                  type="number"
                  value={rates.interior.techniques.waterjetBrass}
                  onChange={(e) => setRates({ ...rates, interior: { ...rates.interior, techniques: { ...rates.interior.techniques, waterjetBrass: Number(e.target.value) || 0 } } })}
                  className="mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="font-semibold text-xs">Fluted 3D Stone Paneling Rate</Label>
                <Input 
                  type="number"
                  value={rates.interior.techniques.flutedStone}
                  onChange={(e) => setRates({ ...rates, interior: { ...rates.interior, techniques: { ...rates.interior.techniques, flutedStone: Number(e.target.value) || 0 } } })}
                  className="mt-1 font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Add Category */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Work Category</DialogTitle>
            <DialogDescription>
              Create a custom category (e.g., Woodwork, Paint, False Ceiling, Steel, Plumbing, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Category Title (English) *</Label>
              <Input 
                value={newCatTitleEn}
                onChange={(e) => setNewCatTitleEn(e.target.value)}
                placeholder="e.g. Woodwork & Carpentry"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Category Title (Urdu)</Label>
              <Input 
                value={newCatTitleUr}
                onChange={(e) => setNewCatTitleUr(e.target.value)}
                placeholder="e.g. ووڈ ورک اور کارپینٹری"
                dir="rtl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description (English)</Label>
              <Input 
                value={newCatDescEn}
                onChange={(e) => setNewCatDescEn(e.target.value)}
                placeholder="e.g. Solid ash doors, kitchen cabinets, wardrobes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold">Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Add Item */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work Item / Rate</DialogTitle>
            <DialogDescription>
              Specify item name, standard rate in PKR, unit, and brief description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Item Name (English) *</Label>
              <Input 
                value={newItemNameEn}
                onChange={(e) => setNewItemNameEn(e.target.value)}
                placeholder="e.g. Plastic Emulsion Paint"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Item Name (Urdu)</Label>
              <Input 
                value={newItemNameUr}
                onChange={(e) => setNewItemNameUr(e.target.value)}
                placeholder="e.g. پلاسٹک ایملشن اندرونی پینٹ"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Standard Rate (PKR) *</Label>
                <Input 
                  type="number"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(Number(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Unit *</Label>
                <Input 
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  placeholder="PKR / Sq. Ft or PKR / RFT"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Brief Details</Label>
              <Input 
                value={newItemDescEn}
                onChange={(e) => setNewItemDescEn(e.target.value)}
                placeholder="e.g. Double coat smooth finish with wall putty"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem} className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold">Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
