'use client';

import { useState, useEffect } from 'react';
import { 
  getPartnerCompanies, 
  savePartnerCompany, 
  deletePartnerCompany, 
  togglePartnerWorkingStatus, 
  processImageFile, 
  type PartnerCompany 
} from '@/lib/admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Upload, Trash2, Edit, CheckCircle2, XCircle, Eye, Globe, Phone, ExternalLink, RefreshCw, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function PartnerCompaniesAdminPage() {
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<PartnerCompany> | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await getPartnerCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to fetch partner companies:', err);
      toast({
        title: 'Error loading companies',
        description: 'Failed to fetch partner companies from database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenAdd = () => {
    setEditingCompany({
      id: '',
      nameEn: '',
      nameUr: '',
      logoUrl: '',
      descriptionEn: '',
      descriptionUr: '',
      isWorkingWith: true,
      showInHeader: true,
      websiteUrl: '',
      contactPhone: '',
      order: companies.length + 1,
    });
    setLogoPreview('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (comp: PartnerCompany) => {
    setEditingCompany({ ...comp });
    setLogoPreview(comp.logoUrl || '');
    setDialogOpen(true);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const processedDataUrl = await processImageFile(file, 800, 800, 0.8);
      setLogoPreview(processedDataUrl);
      setEditingCompany((prev) => (prev ? { ...prev, logoUrl: processedDataUrl } : null));
      toast({
        title: 'Logo processed successfully',
        description: 'Image compressed and prepared for logo upload.',
      });
    } catch (err) {
      console.error('Error processing image:', err);
      toast({
        title: 'Image Upload Error',
        description: 'Failed to process image file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingCompany?.nameEn?.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter the English name of the marble company.',
        variant: 'destructive',
      });
      return;
    }

    if (!editingCompany.logoUrl) {
      toast({
        title: 'Logo Required',
        description: 'Please upload or provide a logo image for the marble company.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await savePartnerCompany(editingCompany as PartnerCompany);
      if (result.success) {
        toast({
          title: 'Company Saved',
          description: `Successfully saved ${editingCompany.nameEn}.`,
        });
        setDialogOpen(false);
        setEditingCompany(null);
        fetchCompanies();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save partner company.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await deletePartnerCompany(id);
      if (res.success) {
        toast({
          title: 'Company Deleted',
          description: `Removed ${name} from partner list.`,
        });
        fetchCompanies();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete company.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleWorking = async (comp: PartnerCompany) => {
    const newWorkingState = !comp.isWorkingWith;
    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((item) => (item.id === comp.id ? { ...item, isWorkingWith: newWorkingState } : item))
    );

    const res = await togglePartnerWorkingStatus(comp.id, newWorkingState, comp.showInHeader);
    if (!res.success) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update partner status.',
        variant: 'destructive',
      });
      fetchCompanies(); // revert
    } else {
      toast({
        title: newWorkingState ? 'Relationship Active' : 'Relationship Inactive',
        description: `Set working status for ${comp.nameEn} to ${newWorkingState ? 'Active' : 'Inactive'}.`,
      });
    }
  };

  const handleToggleHeader = async (comp: PartnerCompany) => {
    const newHeaderState = !comp.showInHeader;
    // Optimistic UI update
    setCompanies((prev) =>
      prev.map((item) => (item.id === comp.id ? { ...item, showInHeader: newHeaderState } : item))
    );

    const res = await togglePartnerWorkingStatus(comp.id, comp.isWorkingWith, newHeaderState);
    if (!res.success) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update header display status.',
        variant: 'destructive',
      });
      fetchCompanies(); // revert
    } else {
      toast({
        title: newHeaderState ? 'Header Logo Enabled' : 'Header Logo Disabled',
        description: `${comp.nameEn} logo will ${newHeaderState ? 'now appear' : 'no longer appear'} in the header.`,
      });
    }
  };

  const activeHeaderLogos = companies.filter((c) => c.isWorkingWith && c.showInHeader);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Marble Partner Companies & Logos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your relationships with partner marble brands, upload logos, and control which logos are displayed in the main header.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Marble Company
          </Button>
        </div>
      </div>

      {/* Live Header Logo Preview Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-stone-900 to-slate-900 text-white border-stone-800 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
              <Eye className="w-5 h-5" />
              Live Main Header Heading Section Preview
            </CardTitle>
            <Badge variant="outline" className="border-amber-400/40 text-amber-300">
              {activeHeaderLogos.length} Brand Logo{activeHeaderLogos.length !== 1 ? 's' : ''} Active in Header
            </Badge>
          </div>
          <CardDescription className="text-stone-300 text-xs">
            This is how your active partner logos will appear at the top header of the site for users:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950/80 rounded-xl p-4 border border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-base tracking-wide">Stone Expert</span>
              <span className="text-xs text-stone-400 hidden sm:inline">| Official Marble Network</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-stone-900/90 py-2 px-4 rounded-lg border border-stone-700/60">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Working Partner:
              </span>
              {activeHeaderLogos.length === 0 ? (
                <span className="text-xs italic text-stone-400">No partner logos selected for header. Toggle switches below to enable logos.</span>
              ) : (
                <div className="flex items-center gap-4 flex-wrap">
                  {activeHeaderLogos.map((brand) => (
                    <div key={brand.id} className="flex items-center gap-2 bg-stone-800/80 px-2.5 py-1 rounded border border-stone-700 hover:border-amber-400/50 transition-colors">
                      <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 shrink-0">
                        {brand.logoUrl ? (
                          <Image src={brand.logoUrl} alt={brand.nameEn} fill className="object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-stone-400 m-1" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-stone-100">{brand.nameEn}</span>
                      {brand.nameUr && <span className="text-xs text-stone-400 font-urdu">{brand.nameUr}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          Registered Partner Companies
          <Badge variant="secondary" className="ml-2">{companies.length}</Badge>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            Loading partner marble companies...
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground space-y-4">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p>No partner marble companies found.</p>
            <Button onClick={handleOpenAdd}>Add First Company</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((comp) => (
              <Card key={comp.id} className={`transition-all duration-200 ${comp.isWorkingWith ? 'border-primary/40 shadow-sm' : 'opacity-75 bg-muted/30'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0 shadow-inner">
                        {comp.logoUrl ? (
                          <Image src={comp.logoUrl} alt={comp.nameEn} fill className="object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground m-4" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground leading-tight">{comp.nameEn}</CardTitle>
                        {comp.nameUr && <p className="text-sm text-primary font-medium font-urdu">{comp.nameUr}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {comp.isWorkingWith ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Working With
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-[11px] text-muted-foreground">
                          <XCircle className="w-3 h-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground line-clamp-2 min-h-[32px]">
                    {comp.descriptionEn || 'No description provided.'}
                  </p>

                  {/* Links / Contact */}
                  <div className="space-y-1 pt-2 border-t border-border">
                    {comp.websiteUrl && (
                      <a href={comp.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate">{comp.websiteUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {comp.contactPhone && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{comp.contactPhone}</span>
                      </p>
                    )}
                  </div>

                  {/* Control Switches */}
                  <div className="bg-muted/50 p-3 rounded-lg space-y-3 border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`working-${comp.id}`} className="cursor-pointer font-medium text-xs">
                        Working with this brand?
                      </Label>
                      <Switch
                        id={`working-${comp.id}`}
                        checked={comp.isWorkingWith}
                        onCheckedChange={() => handleToggleWorking(comp)}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Label htmlFor={`header-${comp.id}`} className="cursor-pointer font-medium text-xs flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        Show logo in header
                      </Label>
                      <Switch
                        id={`header-${comp.id}`}
                        checked={comp.showInHeader}
                        disabled={!comp.isWorkingWith}
                        onCheckedChange={() => handleToggleHeader(comp)}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(comp)} className="gap-1 text-xs">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(comp.id, comp.nameEn)} className="gap-1 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingCompany?.id ? 'Edit Marble Company' : 'Add New Marble Company'}
            </DialogTitle>
            <DialogDescription>
              Configure company details, logo, and header visibility.
            </DialogDescription>
          </DialogHeader>

          {editingCompany && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Company Name (English) *</Label>
                  <Input
                    id="nameEn"
                    placeholder="e.g. Pak Royal Marbles"
                    value={editingCompany.nameEn || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, nameEn: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameUr">Company Name (Urdu)</Label>
                  <Input
                    id="nameUr"
                    placeholder="مثال: پاک رائل ماربلز"
                    className="font-urdu"
                    value={editingCompany.nameUr || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, nameUr: e.target.value })}
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <Label>Company Logo *</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center space-y-3 bg-muted/20">
                  {logoPreview ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shadow">
                        <Image src={logoPreview} alt="Logo Preview" fill className="object-cover" />
                      </div>
                      <div className="text-left space-y-2">
                        <p className="text-xs text-muted-foreground">Preview of company logo</p>
                        <Label htmlFor="logo-file" className="cursor-pointer inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90">
                          <Upload className="w-3.5 h-3.5" /> Change Image
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to upload brand logo image (JPEG, PNG, WebP)</p>
                      <Label htmlFor="logo-file" className="cursor-pointer inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90">
                        Select Logo File
                      </Label>
                    </div>
                  )}

                  <Input
                    id="logo-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleLogoChange}
                  />

                  {/* Or External URL */}
                  <div className="pt-2 border-t border-border/50 text-left">
                    <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">Or paste Logo Image URL</Label>
                    <Input
                      id="logoUrl"
                      placeholder="https://..."
                      className="text-xs mt-1"
                      value={editingCompany.logoUrl || ''}
                      onChange={(e) => {
                        setEditingCompany({ ...editingCompany, logoUrl: e.target.value });
                        setLogoPreview(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Website & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    placeholder="https://..."
                    value={editingCompany.websiteUrl || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, websiteUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone / WhatsApp</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+92 300 1234567"
                    value={editingCompany.contactPhone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, contactPhone: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  rows={2}
                  placeholder="Details about marble quarries, specialties, or product range..."
                  value={editingCompany.descriptionEn || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, descriptionEn: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionUr">Description (Urdu)</Label>
                <Textarea
                  id="descriptionUr"
                  rows={2}
                  placeholder="تفصیلات..."
                  className="font-urdu"
                  value={editingCompany.descriptionUr || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, descriptionUr: e.target.value })}
                />
              </div>

              {/* Switches */}
              <div className="bg-muted p-4 rounded-xl space-y-4 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-sm">Working Relationship Active</Label>
                    <p className="text-xs text-muted-foreground">Mark whether we are actively associated with this brand.</p>
                  </div>
                  <Switch
                    checked={editingCompany.isWorkingWith ?? true}
                    onCheckedChange={(val) => setEditingCompany({ ...editingCompany, isWorkingWith: val })}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div>
                    <Label className="font-semibold text-sm">Display Logo in Main Header</Label>
                    <p className="text-xs text-muted-foreground">When enabled, company logo will be visible in the site's top header heading section.</p>
                  </div>
                  <Switch
                    checked={editingCompany.showInHeader ?? true}
                    disabled={!editingCompany.isWorkingWith}
                    onCheckedChange={(val) => setEditingCompany({ ...editingCompany, showInHeader: val })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || isUploading} className="gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Save Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
