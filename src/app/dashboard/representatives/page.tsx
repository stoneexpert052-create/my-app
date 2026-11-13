'use client';

import React, { useState, useEffect } from 'react';
import { 
  getRepresentatives, 
  saveRepresentative, 
  deleteRepresentative, 
  toggleRepresentativeStatus,
  clearAllRepresentatives,
  type Representative 
} from '@/lib/admin-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UserCheck, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  MapPin, 
  Building2, 
  Save, 
  RotateCcw, 
  ExternalLink,
  Eye,
  CheckCircle2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ManageRepresentativesPage() {
  const { toast } = useToast();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Partial<Representative> | null>(null);
  const [citiesInput, setCitiesInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReps();
  }, []);

  async function loadReps() {
    setLoading(true);
    try {
      const data = await getRepresentatives();
      setRepresentatives(data);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading representatives',
        description: e.message || 'Failed to fetch'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingRep({
      nameEn: '',
      nameUr: '',
      phone: '',
      whatsapp: '',
      regionEn: '',
      regionUr: '',
      cities: [],
      designationEn: 'Regional Representative & Consultant',
      designationUr: 'علاقائی نمائندہ و کنسلٹنٹ',
      officeAddressEn: '',
      officeAddressUr: '',
      isActive: true,
      order: representatives.length + 1
    });
    setCitiesInput('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rep: Representative) => {
    setEditingRep({ ...rep });
    setCitiesInput((rep.cities || []).join(', '));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRep || !editingRep.nameEn || !editingRep.phone || !editingRep.regionEn) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please provide at least Name, Phone, and Region.'
      });
      return;
    }

    setSaving(true);
    try {
      const parsedCities = citiesInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const toSave: Partial<Representative> = {
        ...editingRep,
        cities: parsedCities,
        whatsapp: editingRep.whatsapp || editingRep.phone?.replace(/[^0-9]/g, '')
      };

      const res = await saveRepresentative(toSave);
      if (res.success) {
        toast({
          title: 'Success',
          description: 'Representative profile saved successfully.'
        });
        setIsDialogOpen(false);
        setEditingRep(null);
        await loadReps();
      } else {
        throw new Error(res.error || 'Failed to save');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e.message || 'Could not save'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete representative "${name}"?`)) return;

    try {
      await deleteRepresentative(id);
      toast({
        title: 'Deleted',
        description: 'Representative removed successfully.'
      });
      await loadReps();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: e.message
      });
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleRepresentativeStatus(id, !current);
      setRepresentatives(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r));
      toast({
        title: !current ? 'Active' : 'Deactivated',
        description: 'Status updated.'
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('کیا آپ واقعی تمام نمائندے ہٹانا چاہتے ہیں؟ (Are you sure you want to remove all representatives?)')) return;
    try {
      await clearAllRepresentatives();
      setRepresentatives([]);
      toast({ title: 'تمام نمائندے ہٹا دیے گئے ہیں', description: 'All representatives removed.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error clearing representatives' });
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="font-headline text-2xl font-bold flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-600" />
            <span>Regional Representatives (علاقائی نمائندے)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage regional stone consultants, phone numbers, WhatsApp details, and coverage zones across Pakistan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/representatives" target="_blank">
              <Eye className="w-4 h-4" />
              <span>Public Directory</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </Button>

          {representatives.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تمام صاف کریں (Clear All)</span>
            </Button>
          )}

          <Button 
            onClick={handleOpenAdd} 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Representative</span>
          </Button>
        </div>
      </div>

      {/* Representatives Cards List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-muted/40 animate-pulse rounded-2xl border" />
          ))}
        </div>
      ) : representatives.length === 0 ? (
        <Card className="p-10 text-center space-y-4 max-w-xl mx-auto border-dashed border-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-foreground">
              کوئی نمائندہ موجود نہیں ہے (No representatives yet)
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              یہاں کوئی بھی فرضی یا خودکار نمبر موجود نہیں ہے۔ آپ اپنے اصل اور بااختیار نمائندوں کے نام، فون نمبر، واٹس ایپ اور علاقے شامل کرنے کے لیے نیچے بٹن پر کلک کریں۔
            </p>
          </div>
          <div className="pt-2">
            <Button 
              onClick={handleOpenAdd} 
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 px-6 h-11 text-base shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>نیا نمائندہ شامل کریں (Add Representative)</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {representatives.map((rep) => (
            <Card 
              key={rep.id} 
              className={`flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
                rep.isActive ? 'border-border shadow-xs' : 'border-dashed border-border opacity-70 bg-muted/20'
              }`}
            >
              <div>
                <CardHeader className="p-4 pb-3 bg-muted/30 border-b flex flex-row items-center justify-between gap-2">
                  <div className="space-y-0.5 overflow-hidden">
                    <Badge variant={rep.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {rep.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{rep.regionEn}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch 
                      checked={rep.isActive} 
                      onCheckedChange={() => handleToggle(rep.id, rep.isActive)} 
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-foreground leading-tight">
                        {rep.nameEn}
                      </h4>
                      {rep.nameUr && (
                        <p className="text-xs font-semibold text-muted-foreground font-urdu" dir="rtl">
                          {rep.nameUr}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rep.designationEn}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                      {rep.nameEn.charAt(0)}
                    </div>
                  </div>

                  <div className="text-xs font-mono font-bold text-primary flex items-center gap-1.5 bg-muted/60 p-2 rounded-lg">
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>{rep.phone}</span>
                    {rep.whatsapp && (
                      <span className="text-[10px] text-emerald-600 font-sans ml-auto font-semibold">
                        WA: {rep.whatsapp}
                      </span>
                    )}
                  </div>

                  {rep.cities && rep.cities.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Cities:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rep.cities.map((city, idx) => (
                          <span key={idx} className="text-[10px] bg-background border px-1.5 py-0.5 rounded-md text-foreground/80">
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(rep.officeAddressEn || rep.officeAddressUr) && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic bg-muted/20 p-1.5 rounded">
                      {rep.officeAddressEn || rep.officeAddressUr}
                    </p>
                  )}
                </CardContent>
              </div>

              <CardFooter className="p-3 pt-0 flex items-center justify-end gap-2 border-t border-border/40">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenEdit(rep)}
                  className="h-8 gap-1 text-xs"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(rep.id, rep.nameEn)}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="sr-only">Delete</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRep?.id ? 'Edit Representative' : 'Add New Regional Representative'}
            </DialogTitle>
            <DialogDescription>
              Configure regional representative details, contact info, and covered cities.
            </DialogDescription>
          </DialogHeader>

          {editingRep && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name (English) *</Label>
                  <Input 
                    value={editingRep.nameEn || ''} 
                    onChange={e => setEditingRep({ ...editingRep, nameEn: e.target.value })} 
                    placeholder="e.g. Fayyaz Hussain" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Name (Urdu) *</Label>
                  <Input 
                    value={editingRep.nameUr || ''} 
                    onChange={e => setEditingRep({ ...editingRep, nameUr: e.target.value })} 
                    placeholder="مثلاً: فیاض حسین" 
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone Number *</Label>
                  <Input 
                    value={editingRep.phone || ''} 
                    onChange={e => setEditingRep({ ...editingRep, phone: e.target.value })} 
                    placeholder="0303-1512554" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>WhatsApp Number</Label>
                  <Input 
                    value={editingRep.whatsapp || ''} 
                    onChange={e => setEditingRep({ ...editingRep, whatsapp: e.target.value })} 
                    placeholder="923031512554" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Region (English) *</Label>
                  <Input 
                    value={editingRep.regionEn || ''} 
                    onChange={e => setEditingRep({ ...editingRep, regionEn: e.target.value })} 
                    placeholder="e.g. Central Punjab (Lahore, Gujranwala)" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Region (Urdu) *</Label>
                  <Input 
                    value={editingRep.regionUr || ''} 
                    onChange={e => setEditingRep({ ...editingRep, regionUr: e.target.value })} 
                    placeholder="مثلاً: سنٹرل پنجاب (لاہور، گوجرانوالہ)" 
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Covered Cities / Areas (Comma separated)</Label>
                <Input 
                  value={citiesInput} 
                  onChange={e => setCitiesInput(e.target.value)} 
                  placeholder="Lahore, Gujranwala, Sialkot, Kasur, Gujrat" 
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate city names with commas. Users can search for these cities in the selector.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Designation (English)</Label>
                  <Input 
                    value={editingRep.designationEn || ''} 
                    onChange={e => setEditingRep({ ...editingRep, designationEn: e.target.value })} 
                    placeholder="Senior Regional Consultant" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Designation (Urdu)</Label>
                  <Input 
                    value={editingRep.designationUr || ''} 
                    onChange={e => setEditingRep({ ...editingRep, designationUr: e.target.value })} 
                    placeholder="سینئر ریجنل کنسلٹنٹ" 
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Yard / Office Address (English)</Label>
                  <Input 
                    value={editingRep.officeAddressEn || ''} 
                    onChange={e => setEditingRep({ ...editingRep, officeAddressEn: e.target.value })} 
                    placeholder="Ferozepur Road Marble Market, Lahore" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Yard / Office Address (Urdu)</Label>
                  <Input 
                    value={editingRep.officeAddressUr || ''} 
                    onChange={e => setEditingRep({ ...editingRep, officeAddressUr: e.target.value })} 
                    placeholder="فیروز پور روڈ ماربل مارکیٹ، لاہور" 
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div>
                  <Label className="font-bold">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Display this representative to public visitors</p>
                </div>
                <Switch 
                  checked={editingRep.isActive ?? true} 
                  onCheckedChange={val => setEditingRep({ ...editingRep, isActive: val })} 
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Representative'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
