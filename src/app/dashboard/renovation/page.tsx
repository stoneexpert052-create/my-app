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
  getRenovationRatesConfig, 
  updateRenovationRates, 
  defaultRenovationRatesConfig, 
  getRenovationInquiries,
  type RenovationRatesConfig,
  type RenovationSpaceRate,
  type RenovationTradeRate,
  type CustomRenovationItem
} from '@/lib/admin-actions';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  Building2, 
  Paintbrush, 
  Edit3, 
  Check, 
  RefreshCw,
  DollarSign,
  PlusCircle,
  HelpCircle,
  Home,
  AppWindow,
  Plug,
  Droplets,
  Hammer,
  Trees,
  Gem,
  Layout,
  MessageSquare,
  PhoneCall,
  Clock,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

export default function AdminRenovationRatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ratesConfig, setRatesConfig] = useState<RenovationRatesConfig>(defaultRenovationRatesConfig);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  // Dialog States for Adding Custom Space/Trade
  const [showAddSpaceDialog, setShowAddSpaceDialog] = useState(false);
  const [newSpaceNameEn, setNewSpaceNameEn] = useState('');
  const [newSpaceNameUr, setNewSpaceNameUr] = useState('');
  const [newSpaceBudget, setNewSpaceBudget] = useState(250);
  const [newSpacePremium, setNewSpacePremium] = useState(500);
  const [newSpaceLuxury, setNewSpaceLuxury] = useState(1000);
  const [newSpaceDescEn, setNewSpaceDescEn] = useState('');
  const [newSpaceDescUr, setNewSpaceDescUr] = useState('');

  const [showAddTradeDialog, setShowAddTradeDialog] = useState(false);
  const [newTradeNameEn, setNewTradeNameEn] = useState('');
  const [newTradeNameUr, setNewTradeNameUr] = useState('');
  const [newTradeRate, setNewTradeRate] = useState(75);
  const [newTradeUnit, setNewTradeUnit] = useState('PKR / sq.ft');
  const [newTradeCategory, setNewTradeCategory] = useState<RenovationTradeRate['category']>('color');
  const [newTradeDescEn, setNewTradeDescEn] = useState('');
  const [newTradeDescUr, setNewTradeDescUr] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const config = await getRenovationRatesConfig();
        if (config) {
          setRatesConfig(config);
        }
      } catch (e) {
        console.error("Error loading renovation rates config:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const data = await getRenovationInquiries();
      setInquiries(data);
    } catch (err) {
      console.error("Error fetching inquiries:", err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      const res = await updateRenovationRates(ratesConfig);
      if (res.success) {
        toast({
          title: "Renovation Rates Updated!",
          description: "Renovation spaces, trade rates, and items saved to Firestore successfully.",
        });
      } else {
        toast({
          title: "Failed to Save",
          description: res.error || "An error occurred while saving.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error Saving",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSpaceRate = (id: string, field: keyof RenovationSpaceRate, value: any) => {
    setRatesConfig(prev => ({
      ...prev,
      spaces: prev.spaces.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const handleDeleteSpace = async (id: string) => {
    const updated = {
      ...ratesConfig,
      spaces: ratesConfig.spaces.filter(s => s.id !== id)
    };
    setRatesConfig(updated);
    const res = await updateRenovationRates(updated);
    if (res.success) {
      toast({ title: "Space Deleted & Synced", description: "Removed live from customer renovation app." });
    }
  };

  const handleUpdateTradeRate = (id: string, field: keyof RenovationTradeRate, value: any) => {
    setRatesConfig(prev => ({
      ...prev,
      trades: prev.trades.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleDeleteTrade = async (id: string) => {
    const updated = {
      ...ratesConfig,
      trades: ratesConfig.trades.filter(t => t.id !== id)
    };
    setRatesConfig(updated);
    const res = await updateRenovationRates(updated);
    if (res.success) {
      toast({ title: "Trade Deleted & Synced", description: "Trade / Security item removed live from customer app." });
    }
  };

  const handleAddSpaceSubmit = async () => {
    if (!newSpaceNameEn.trim()) return;
    const newSpace: RenovationSpaceRate = {
      id: `space_${Date.now()}`,
      nameEn: newSpaceNameEn,
      nameUr: newSpaceNameUr || newSpaceNameEn,
      defaultSqFt: 150,
      baseRateBudget: Number(newSpaceBudget) || 200,
      baseRatePremium: Number(newSpacePremium) || 400,
      baseRateLuxury: Number(newSpaceLuxury) || 800,
      unit: 'PKR / sq.ft',
      descriptionEn: newSpaceDescEn || 'Custom renovation space',
      descriptionUr: newSpaceDescUr || 'تزئین و آرائش کا کسٹم حصہ'
    };
    const updated = { ...ratesConfig, spaces: [...ratesConfig.spaces, newSpace] };
    setRatesConfig(updated);
    setShowAddSpaceDialog(false);
    setNewSpaceNameEn('');
    setNewSpaceNameUr('');
    setNewSpaceDescEn('');
    setNewSpaceDescUr('');
    const res = await updateRenovationRates(updated);
    if (res.success) {
      toast({ title: "New Space Added & Synced", description: `Added "${newSpace.nameEn}". Live across app.` });
    }
  };

  const handleAddTradeSubmit = async () => {
    if (!newTradeNameEn.trim()) return;
    const newTrade: RenovationTradeRate = {
      id: `trade_${Date.now()}`,
      nameEn: newTradeNameEn,
      nameUr: newTradeNameUr || newTradeNameEn,
      ratePKR: Number(newTradeRate) || 50,
      unit: newTradeUnit || 'PKR / sq.ft',
      category: newTradeCategory,
      descriptionEn: newTradeDescEn || 'Custom renovation trade service',
      descriptionUr: newTradeDescUr || 'کسٹم ری نوویشن ورکس'
    };
    const updated = { ...ratesConfig, trades: [...ratesConfig.trades, newTrade] };
    setRatesConfig(updated);
    setShowAddTradeDialog(false);
    setNewTradeNameEn('');
    setNewTradeNameUr('');
    setNewTradeDescEn('');
    setNewTradeDescUr('');
    const res = await updateRenovationRates(updated);
    if (res.success) {
      toast({ title: "New Trade Added & Synced", description: `Added "${newTrade.nameEn}". Live in customer app.` });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-7 w-7 text-[#dfb96c]" />
            House Renovation Management & Rates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage house renovation space rates (Bathroom, Kitchen, Bedroom, TV Lounge, Porch, Elevation), work sections (Marble, Tiles, Electrical, Windows, Carpenter, Paint, Designer Color, Ceiling, Plumbing, Steel), and review client inquiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setRatesConfig(defaultRenovationRatesConfig)}
            variant="outline"
            size="sm"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reset Defaults
          </Button>
          <Button
            onClick={handleSaveRates}
            disabled={saving || loading}
            className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-semibold"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save All Rates
          </Button>
        </div>
      </div>

      <Tabs defaultValue="spaces" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-3xl mb-6">
          <TabsTrigger value="spaces" className="flex items-center gap-2">
            <Home className="h-4 w-4" /> Spaces / Rooms ({ratesConfig.spaces.length})
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Work Trades ({ratesConfig.trades.length})
          </TabsTrigger>
          <TabsTrigger value="multipliers" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Quality Grades
          </TabsTrigger>
          <TabsTrigger value="inquiries" onClick={fetchInquiries} className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" /> Inquiries
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RENOVATION SPACES / ROOMS */}
        <TabsContent value="spaces" className="space-y-4">
          <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border">
            <div>
              <h2 className="text-lg font-bold">Renovation Spaces & Room Rates</h2>
              <p className="text-xs text-muted-foreground">
                Set baseline budget, premium, and luxury rates (in PKR / Sq.Ft) for each space in house renovation.
              </p>
            </div>
            <Button
              onClick={() => setShowAddSpaceDialog(true)}
              size="sm"
              className="bg-primary text-primary-foreground gap-1.5"
            >
              <PlusCircle className="h-4 w-4" /> Add Custom Space
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratesConfig.spaces.map((space) => (
              <Card key={space.id} className="relative overflow-hidden border-border/80 shadow-xs">
                <CardHeader className="pb-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Home className="h-4 w-4 text-[#dfb96c]" />
                      {space.nameEn}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSpace(space.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs font-urdu text-muted-foreground">
                    {space.nameUr}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">English Name</Label>
                      <Input
                        value={space.nameEn}
                        onChange={(e) => handleUpdateSpaceRate(space.id, 'nameEn', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Urdu Name</Label>
                      <Input
                        value={space.nameUr}
                        onChange={(e) => handleUpdateSpaceRate(space.id, 'nameUr', e.target.value)}
                        className="h-8 text-xs font-urdu"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2.5 rounded-lg border">
                    <div>
                      <Label className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Standard Rate</Label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          type="number"
                          value={space.baseRateBudget}
                          onChange={(e) => handleUpdateSpaceRate(space.id, 'baseRateBudget', Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Premium Rate</Label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          type="number"
                          value={space.baseRatePremium}
                          onChange={(e) => handleUpdateSpaceRate(space.id, 'baseRatePremium', Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Luxury Rate</Label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          type="number"
                          value={space.baseRateLuxury}
                          onChange={(e) => handleUpdateSpaceRate(space.id, 'baseRateLuxury', Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px]">Description</Label>
                    <Textarea
                      value={space.descriptionEn}
                      onChange={(e) => handleUpdateSpaceRate(space.id, 'descriptionEn', e.target.value)}
                      className="text-xs h-14 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: WORK TRADES & SECTIONS */}
        <TabsContent value="trades" className="space-y-4">
          <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border">
            <div>
              <h2 className="text-lg font-bold">Renovation Trade Sections & Item Rates</h2>
              <p className="text-xs text-muted-foreground">
                Manage rates for Marble Fixing, Tile, Electrical, Window/Glass, Carpenter/Woodwork, Color/Paint, Designer Texture Color, Ceiling, Plumbing, and Steel Fabrication.
              </p>
            </div>
            <Button
              onClick={() => setShowAddTradeDialog(true)}
              size="sm"
              className="bg-primary text-primary-foreground gap-1.5"
            >
              <PlusCircle className="h-4 w-4" /> Add Trade Rate
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratesConfig.trades.map((trade) => (
              <Card key={trade.id} className="relative overflow-hidden border-border/80 shadow-xs">
                <CardHeader className="pb-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#dfb96c]" />
                      {trade.nameEn}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] capitalize bg-background">
                        {trade.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs font-urdu text-muted-foreground">
                    {trade.nameUr}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Trade Title (En)</Label>
                      <Input
                        value={trade.nameEn}
                        onChange={(e) => handleUpdateTradeRate(trade.id, 'nameEn', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Trade Title (Ur)</Label>
                      <Input
                        value={trade.nameUr}
                        onChange={(e) => handleUpdateTradeRate(trade.id, 'nameUr', e.target.value)}
                        className="h-8 text-xs font-urdu"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border">
                    <div>
                      <Label className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Rate (PKR)</Label>
                      <Input
                        type="number"
                        value={trade.ratePKR}
                        onChange={(e) => handleUpdateTradeRate(trade.id, 'ratePKR', Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Unit</Label>
                      <Input
                        value={trade.unit}
                        onChange={(e) => handleUpdateTradeRate(trade.id, 'unit', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px]">Work Description</Label>
                    <Textarea
                      value={trade.descriptionEn}
                      onChange={(e) => handleUpdateTradeRate(trade.id, 'descriptionEn', e.target.value)}
                      className="text-xs h-14 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: QUALITY MULTIPLIERS */}
        <TabsContent value="multipliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#dfb96c]" /> Quality Grade Multipliers
              </CardTitle>
              <CardDescription className="text-xs">
                Adjust calculation multipliers for standard, premium, and luxury material grades.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-bold">Standard / Budget Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={ratesConfig.gradeMultipliers.standard}
                  onChange={(e) => setRatesConfig(prev => ({
                    ...prev,
                    gradeMultipliers: { ...prev.gradeMultipliers, standard: Number(e.target.value) }
                  }))}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Default 1.0x baseline grade</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Premium Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={ratesConfig.gradeMultipliers.premium}
                  onChange={(e) => setRatesConfig(prev => ({
                    ...prev,
                    gradeMultipliers: { ...prev.gradeMultipliers, premium: Number(e.target.value) }
                  }))}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">High quality materials & finishing</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Luxury Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={ratesConfig.gradeMultipliers.luxury}
                  onChange={(e) => setRatesConfig(prev => ({
                    ...prev,
                    gradeMultipliers: { ...prev.gradeMultipliers, luxury: Number(e.target.value) }
                  }))}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Top-tier luxury imported marble/fittings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CLIENT INQUIRIES */}
        <TabsContent value="inquiries" className="space-y-4">
          <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border">
            <div>
              <h2 className="text-lg font-bold">Customer Renovation Inquiries</h2>
              <p className="text-xs text-muted-foreground">
                Inquiries submitted directly from the house renovation estimator page.
              </p>
            </div>
            <Button onClick={fetchInquiries} disabled={loadingInquiries} size="sm" variant="outline" className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${loadingInquiries ? 'animate-spin' : ''}`} /> Refresh List
            </Button>
          </div>

          {inquiries.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-muted-foreground">No renovation inquiries received yet.</p>
              <p className="text-xs text-muted-foreground mt-1">When customers submit quote forms on the /renovation page, they will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {inquiries.map((inq, idx) => (
                <Card key={inq.id || idx} className="border-border/80 hover:border-[#dfb96c]/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#dfb96c] text-slate-950 font-bold">
                          {inq.category || 'General Renovation'}
                        </Badge>
                        <span className="font-bold text-sm">{inq.clientName || 'Anonymous Customer'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleString() : 'Recent'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <a href={`tel:${inq.clientPhone}`} className="font-mono text-primary underline">
                          {inq.clientPhone || 'N/A'}
                        </a>
                      </div>
                      <div>
                        <span className="text-muted-foreground">City: </span>
                        <strong className="text-foreground">{inq.clientCity || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Property Type: </span>
                        <strong className="text-foreground uppercase">{inq.propertyType || 'House'}</strong>
                        {inq.estimatedArea && ` (${inq.estimatedArea} sq.ft)`}
                      </div>
                    </div>

                    {inq.userMessage && (
                      <div className="bg-muted/40 p-2.5 rounded-md text-xs text-muted-foreground italic border mt-2">
                        "{inq.userMessage}"
                      </div>
                    )}

                    <div className="mt-3 flex justify-end gap-2">
                      <a
                        href={`https://wa.me/${inq.clientPhone?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs gap-1">
                          <PhoneCall className="h-3 w-3" /> Reply on WhatsApp
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG: ADD CUSTOM SPACE */}
      <Dialog open={showAddSpaceDialog} onOpenChange={setShowAddSpaceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Renovation Space</DialogTitle>
            <DialogDescription>
              Create a new room or house section for renovation estimations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Space Name (English)</Label>
              <Input
                placeholder="e.g. Master Hallway"
                value={newSpaceNameEn}
                onChange={(e) => setNewSpaceNameEn(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Space Name (Urdu)</Label>
              <Input
                placeholder="مثال: مین ہال"
                value={newSpaceNameUr}
                onChange={(e) => setNewSpaceNameUr(e.target.value)}
                className="font-urdu"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Budget (PKR/sqft)</Label>
                <Input
                  type="number"
                  value={newSpaceBudget}
                  onChange={(e) => setNewSpaceBudget(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-[11px]">Premium (PKR/sqft)</Label>
                <Input
                  type="number"
                  value={newSpacePremium}
                  onChange={(e) => setNewSpacePremium(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-[11px]">Luxury (PKR/sqft)</Label>
                <Input
                  type="number"
                  value={newSpaceLuxury}
                  onChange={(e) => setNewSpaceLuxury(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Brief summary of works"
                value={newSpaceDescEn}
                onChange={(e) => setNewSpaceDescEn(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSpaceDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSpaceSubmit} className="bg-[#dfb96c] text-slate-950 font-bold">Add Space</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ADD CUSTOM TRADE */}
      <Dialog open={showAddTradeDialog} onOpenChange={setShowAddTradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Trade Section Rate</DialogTitle>
            <DialogDescription>
              Add a specialized labor/material trade rate (e.g. Marble Fixing, Color, Electrical, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Trade Title (English)</Label>
              <Input
                placeholder="e.g. Epoxy Resin Coating"
                value={newTradeNameEn}
                onChange={(e) => setNewTradeNameEn(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Trade Title (Urdu)</Label>
              <Input
                placeholder="مثال: ایپوکسی پالش"
                value={newTradeNameUr}
                onChange={(e) => setNewTradeNameUr(e.target.value)}
                className="font-urdu"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Rate (PKR)</Label>
                <Input
                  type="number"
                  value={newTradeRate}
                  onChange={(e) => setNewTradeRate(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-[11px]">Unit</Label>
                <Input
                  placeholder="PKR / sq.ft"
                  value={newTradeUnit}
                  onChange={(e) => setNewTradeUnit(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Work specification"
                value={newTradeDescEn}
                onChange={(e) => setNewTradeDescEn(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTradeDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTradeSubmit} className="bg-[#dfb96c] text-slate-950 font-bold">Add Trade Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
