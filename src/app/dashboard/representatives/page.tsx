'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getRepresentatives,
  saveRepresentative,
  deleteRepresentative,
  toggleRepresentativeStatus,
  clearAllRepresentatives,
  getRepresentativeJobs,
  saveRepresentativeJob,
  deleteRepresentativeJob,
  type Representative,
  type SiteVisitJob,
  type SiteMeasurementCategory,
  type SiteVisitJobStatus
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
  DialogTitle
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
  ExternalLink,
  Eye,
  KeyRound,
  Copy,
  MessageCircle,
  ClipboardList,
  FileText,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const SITE_CATEGORIES: Array<{ id: SiteMeasurementCategory; label: string }> = [
  { id: 'stairs', label: 'سیڑھیاں (Stairs)' },
  { id: 'window-sill', label: 'ونڈو سل (Windows)' },
  { id: 'floor', label: 'فلورنگ (Flooring)' },
  { id: 'feature-wall', label: 'فیچر والز (Feature Walls)' },
  { id: 'kitchen', label: 'کچن (Kitchen)' },
  { id: 'vanity', label: 'وینٹی (Vanity)' },
  { id: 'simple', label: 'سادہ (Simple)' }
];

const STATUS_BADGE: Record<SiteVisitJobStatus, { label: string; cls: string }> = {
  assigned: { label: 'Assigned (نیا وزٹ)', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  visited: { label: 'Site Visited', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  quoted: { label: 'Bill Submitted (بل تیار)', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  approved: { label: 'Approved (منظور)', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  completed: { label: 'Completed (مکمل)', cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
};

export default function ManageRepresentativesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'reps' | 'jobs'>('reps');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [allJobs, setAllJobs] = useState<SiteVisitJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Rep dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Partial<Representative> | null>(null);
  const [citiesInput, setCitiesInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Assign Customer Site Visit dialog
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    representativeId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: 'Islamabad',
    customerNotes: '',
    preferredVisitDate: new Date().toISOString().slice(0, 10),
    requestedCategories: ['stairs', 'window-sill', 'floor'] as SiteMeasurementCategory[]
  });

  // Jobs filter & expand
  const [filterRepId, setFilterRepId] = useState<string>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [repsData, jobsData] = await Promise.all([
        getRepresentatives(),
        getRepresentativeJobs() // Admin call with no repId -> fetches ALL reps' jobs
      ]);
      setRepresentatives(repsData);
      setAllJobs(jobsData);
      if (repsData.length > 0) {
        setAssignForm(prev =>
          prev.representativeId ? prev : { ...prev, representativeId: repsData[0].id }
        );
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading representatives',
        description: e.message || 'Failed to fetch'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const getPortalUrl = (repId: string) => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://stoneexpert.net';
    return `${origin}/representative/${encodeURIComponent(repId)}`;
  };

  const handleCopyPortalLink = async (rep: Representative) => {
    const url = getPortalUrl(rep.id);
    const text = `Stone Expert Representative Portal\nName: ${rep.nameEn}\nPortal Link: ${url}\nPIN: ${rep.portalPin || 'FH-1052'}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'پورٹل لنک اور پن کاپی ہو گیا!',
        description: `${rep.nameEn} کا لنک اور PIN کلپ بورڈ میں محفوظ ہو گیا۔`
      });
    } catch {
      toast({ title: 'Link ready', description: url });
    }
  };

  const getWhatsAppShareLink = (rep: Representative) => {
    const url = getPortalUrl(rep.id);
    const wa = (rep.whatsapp || rep.phone || '').replace(/\D/g, '');
    const normalizedWa = wa.startsWith('0') ? `92${wa.slice(1)}` : wa;
    const msg = `*السلام علیکم ${rep.nameUr || rep.nameEn}!*\n\nآپ کا ذاتی *Stone Expert Representative Portal* تیار ہے:\n\n🔗 *Portal Link:* ${url}\n🔐 *Your Secret PIN:* ${rep.portalPin || 'FH-1052'}\n\nاس پورٹل میں آپ کو صرف اپنے کسٹمرز کی تفصیلات نظر آئیں گی۔ آپ سائٹ پر جا کر سیڑھی، ونڈو، فلورنگ اور فیچر والز کی پیمائش کر کے آن لائن بل بنا سکتے ہیں جو براہِ راست مین ایڈمن پینل میں بھی محفوظ ہو جائے گا۔`;
    return `https://wa.me/${normalizedWa}?text=${encodeURIComponent(msg)}`;
  };

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
      portalPin: '',
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
          description: 'Representative profile & Portal PIN saved successfully.'
        });
        setIsDialogOpen(false);
        setEditingRep(null);
        await loadAllData();
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
      toast({ title: 'Deleted', description: 'Representative removed successfully.' });
      await loadAllData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message });
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleRepresentativeStatus(id, !current);
      setRepresentatives(prev => prev.map(r => (r.id === id ? { ...r, isActive: !current } : r)));
      toast({ title: !current ? 'Active' : 'Deactivated', description: 'Status updated.' });
    } catch {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('کیا آپ واقعی تمام نمائندے ہٹانا چاہتے ہیں؟ (Are you sure you want to remove all representatives?)'))
      return;
    try {
      await clearAllRepresentatives();
      setRepresentatives([]);
      toast({ title: 'تمام نمائندے ہٹا دیے گئے ہیں', description: 'All representatives removed.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error clearing representatives' });
    }
  };

  const handleAssignCustomer = async () => {
    const selectedRep = representatives.find(r => r.id === assignForm.representativeId);
    if (!selectedRep) {
      toast({ variant: 'destructive', title: 'نمائندہ منتخب کریں', description: 'Please select a representative.' });
      return;
    }
    if (!assignForm.customerName.trim() || !assignForm.customerPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'کسٹمر کی تفصیلات نامکمل ہیں',
        description: 'Customer name and phone are required.'
      });
      return;
    }

    setAssigning(true);
    try {
      const res = await saveRepresentativeJob({
        representativeId: selectedRep.id,
        representativeName: selectedRep.nameEn,
        customerName: assignForm.customerName,
        customerPhone: assignForm.customerPhone,
        customerAddress: assignForm.customerAddress,
        customerCity: assignForm.customerCity,
        customerNotes: assignForm.customerNotes,
        preferredVisitDate: assignForm.preferredVisitDate,
        requestedCategories: assignForm.requestedCategories,
        status: 'assigned',
        createdBy: 'admin',
        siteMeasurements: []
      });

      if (res.success) {
        toast({
          title: 'سائٹ وزٹ نمائندے کو تفویض کر دیا گیا!',
          description: `${assignForm.customerName} کی تفصیلات ${selectedRep.nameEn} کے پورٹل میں شامل ہو گئی ہیں۔`
        });
        setIsAssignOpen(false);
        setAssignForm({
          representativeId: selectedRep.id,
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          customerCity: 'Islamabad',
          customerNotes: '',
          preferredVisitDate: new Date().toISOString().slice(0, 10),
          requestedCategories: ['stairs', 'window-sill', 'floor']
        });
        setActiveTab('jobs');
        await loadAllData();
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateJobStatus = async (job: SiteVisitJob, status: SiteVisitJobStatus) => {
    await saveRepresentativeJob({ ...job, status }, { syncToOrders: !!job.linkedOrderId });
    setAllJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status } : j)));
    toast({ title: 'سٹیٹس اپ ڈیٹ ہو گیا', description: `${job.customerName} → ${status}` });
  };

  const handleDeleteJob = async (job: SiteVisitJob) => {
    if (!confirm(`Delete site visit / bill for "${job.customerName}"?`)) return;
    await deleteRepresentativeJob(job.id, job.representativeId);
    setAllJobs(prev => prev.filter(j => j.id !== job.id));
    toast({ title: 'ریکارڈ حذف ہو گیا' });
  };

  const jobStatsByRep = useMemo(() => {
    const map: Record<string, { count: number; totalPKR: number }> = {};
    for (const j of allJobs) {
      if (!map[j.representativeId]) map[j.representativeId] = { count: 0, totalPKR: 0 };
      map[j.representativeId].count += 1;
      map[j.representativeId].totalPKR += j.grandTotalPKR || 0;
    }
    return map;
  }, [allJobs]);

  const filteredJobs = useMemo(() => {
    if (filterRepId === 'all') return allJobs;
    return allJobs.filter(j => j.representativeId === filterRepId);
  }, [allJobs, filterRepId]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="font-headline text-2xl font-bold flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-600" />
            <span>Regional Representatives & Field Portals (نمائندے اور پورٹل)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ہر نمائندے کا اپنا محفوظ پورٹل، PIN لاگ ان، سائٹ وزٹ اسائنمنٹ اور تمام نمائندوں کے آن لائن بلز کا مرکزی ریکارڈ۔
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/representative" target="_blank">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Rep Portal Login</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/representatives" target="_blank">
              <Eye className="w-4 h-4" />
              <span>Public Directory</span>
            </Link>
          </Button>

          <Button
            onClick={() => setIsAssignOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>کسٹمر وزٹ اسائن کریں (Assign Site Visit)</span>
          </Button>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Representative</span>
          </Button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-muted border">
          <button
            type="button"
            onClick={() => setActiveTab('reps')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'reps'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>نمائندے اور ان کے پورٹل لنکس ({representatives.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>تمام نمائندوں کے سائٹ وزٹ اور بلز ({allJobs.length})</span>
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={loadAllData} className="gap-1.5 text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* TAB 1: REPRESENTATIVES & PORTAL LINKS */}
      {activeTab === 'reps' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-muted/40 animate-pulse rounded-2xl border" />
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
                  اپنے نمائندوں کے نام، فون نمبر، علاقے اور ذاتی پورٹل PIN شامل کرنے کے لیے نیچے بٹن پر کلک کریں۔
                </p>
              </div>
              <Button
                onClick={handleOpenAdd}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 px-6 h-11 text-base shadow-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>نیا نمائندہ شامل کریں (Add Representative)</span>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {representatives.map(rep => {
                const stats = jobStatsByRep[rep.id] || { count: 0, totalPKR: 0 };
                return (
                  <Card
                    key={rep.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
                      rep.isActive
                        ? 'border-border shadow-xs'
                        : 'border-dashed border-border opacity-70 bg-muted/20'
                    }`}
                  >
                    <div>
                      <CardHeader className="p-4 pb-3 bg-muted/30 border-b flex flex-row items-center justify-between gap-2">
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={rep.isActive ? 'default' : 'secondary'} className="text-[10px]">
                              {rep.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                            >
                              {stats.count} Visits
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{rep.regionEn}</span>
                          </p>
                        </div>

                        <Switch
                          checked={rep.isActive}
                          onCheckedChange={() => handleToggle(rep.id, rep.isActive)}
                        />
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
                            <p className="text-xs text-muted-foreground mt-0.5">{rep.designationEn}</p>
                          </div>

                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                            {rep.nameEn.charAt(0)}
                          </div>
                        </div>

                        <div className="text-xs font-mono font-bold text-primary flex items-center gap-1.5 bg-muted/60 p-2 rounded-lg">
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{rep.phone}</span>
                          {stats.totalPKR > 0 && (
                            <span className="text-[10px] text-emerald-600 font-sans ml-auto font-bold">
                              PKR {stats.totalPKR.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Dedicated Representative Portal Credentials Box */}
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Private Field Portal
                            </span>
                            <span className="font-mono text-xs font-black bg-background border border-amber-500/40 px-2 py-0.5 rounded-md text-amber-700 dark:text-amber-300">
                              PIN: {rep.portalPin || 'FH-1052'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyPortalLink(rep)}
                              className="h-7 text-[10px] font-bold gap-1 px-2 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </Button>

                            <a
                              href={getWhatsAppShareLink(rep)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>

                            <Link
                              href={`/representative/${encodeURIComponent(rep.id)}`}
                              target="_blank"
                              className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 text-white text-[10px] font-bold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </Link>
                          </div>
                        </div>

                        {rep.cities && rep.cities.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Cities:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {rep.cities.map((city, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-background border px-1.5 py-0.5 rounded-md text-foreground/80"
                                >
                                  {city}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <CardFooter className="p-3 pt-2 flex items-center justify-between gap-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssignForm(prev => ({ ...prev, representativeId: rep.id }));
                          setIsAssignOpen(true);
                        }}
                        className="h-8 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Assign Visit</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(rep)}
                          className="h-8 gap-1 text-xs cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rep.id, rep.nameEn)}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {representatives.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="gap-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تمام نمائندے صاف کریں (Clear All)</span>
              </Button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALL REPRESENTATIVES' SITE VISITS & ONLINE BILLS (MAIN ADMIN OVERSIGHT) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
            <div className="space-y-0.5">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>مرکزی ایڈمن ریکارڈ — تمام نمائندوں کے سائٹ وزٹ اور آن لائن بلز</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                یہاں آپ کو تمام نمائندوں کا کام نظر آتا ہے، جبکہ ہر نمائندہ اپنے پورٹل میں صرف اپنا کام دیکھ سکتا ہے۔
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRepId}
                onChange={e => setFilterRepId(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs font-bold"
              >
                <option value="all">All Representatives ({allJobs.length})</option>
                {representatives.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nameEn} ({jobStatsByRep[r.id]?.count || 0})
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={() => setIsAssignOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Customer</span>
              </Button>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="p-10 text-center space-y-3 border-dashed border-2">
              <ClipboardList className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="font-bold text-base">ابھی کوئی سائٹ وزٹ یا نمائندہ بل موجود نہیں</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                &quot;Assign Customer&quot; بٹن سے کسی کسٹمر کی تفصیلات نمائندے (مثلاً فیاض حسین) کو بھیجیں یا نمائندہ اپنے پورٹل سے سائٹ بل بنائے — وہ فوراً یہاں ظاہر ہو گا۔
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map(job => {
                const isOpen = expandedJobId === job.id;
                const badge = STATUS_BADGE[job.status] || STATUS_BADGE.assigned;

                return (
                  <Card key={job.id} className="overflow-hidden">
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-600">{job.id}</span>
                          <Badge variant="outline" className={`text-[10px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            Rep: {job.representativeName}
                          </Badge>
                          {job.linkedOrderId && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Order: {job.linkedOrderId}
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-extrabold text-base">
                          {job.customerName}{' '}
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            ({job.customerPhone})
                          </span>
                        </h4>

                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          {job.customerAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              {job.customerAddress}
                              {job.customerCity ? `, ${job.customerCity}` : ''}
                            </span>
                          )}
                          {job.preferredVisitDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {job.preferredVisitDate}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            PKR {(job.grandTotalPKR || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {job.grandTotalSqFt || 0} Sq.Ft • {job.siteMeasurements?.length || 0} sections
                          </p>
                        </div>

                        <select
                          value={job.status}
                          onChange={e =>
                            handleUpdateJobStatus(job, e.target.value as SiteVisitJobStatus)
                          }
                          className="h-8 rounded-md border bg-background px-2 text-xs font-bold"
                        >
                          <option value="assigned">Assigned</option>
                          <option value="visited">Visited</option>
                          <option value="quoted">Quoted</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedJobId(isOpen ? null : job.id)}
                          className="h-8 gap-1 text-xs cursor-pointer"
                        >
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>Details</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteJob(job)}
                          className="h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t bg-muted/20 p-4 space-y-3">
                        {job.customerNotes && (
                          <div className="text-xs bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-lg">
                            <strong>Customer Details / Notes: </strong>
                            {job.customerNotes}
                          </div>
                        )}

                        {job.siteMeasurements && job.siteMeasurements.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {job.siteMeasurements.map((sec, idx) => (
                              <div key={sec.id || idx} className="rounded-xl border bg-background p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-xs">{sec.title}</p>
                                    <p className="text-[11px] text-amber-600 font-semibold">
                                      {sec.materialName} @ PKR {sec.ratePerSqFt}/sqft
                                    </p>
                                  </div>
                                  <span className="font-black text-xs text-emerald-600">
                                    PKR {sec.subtotal.toLocaleString()}
                                  </span>
                                </div>

                                <div className="text-[11px] space-y-1 border-t pt-2">
                                  {sec.rows.map((r, rIdx) => (
                                    <div key={r.id || rIdx} className="flex justify-between text-muted-foreground">
                                      <span>
                                        {r.label}: {r.width}×{r.length} {sec.unit === 'inches' ? 'in' : 'ft'} ×{' '}
                                        {r.qty}
                                      </span>
                                      <span className="font-mono font-bold text-foreground">
                                        {r.sqFt.toFixed(2)} sqft
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between font-bold pt-1 border-t">
                                    <span>Final (+{sec.wastagePercent}% wastage)</span>
                                    <span>{sec.finalSqFt} Sq.Ft</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            نمائندے نے ابھی اس سائٹ کی پیمائشیں درج نہیں کیں۔
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit / Create Representative Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRep?.id ? 'Edit Representative & Portal PIN' : 'Add New Regional Representative'}
            </DialogTitle>
            <DialogDescription>
              Configure representative details, contact info, covered cities, and their private Portal PIN.
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone Number *</Label>
                  <Input
                    value={editingRep.phone || ''}
                    onChange={e => setEditingRep({ ...editingRep, phone: e.target.value })}
                    placeholder="0303-5190554"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={editingRep.whatsapp || ''}
                    onChange={e => setEditingRep({ ...editingRep, whatsapp: e.target.value })}
                    placeholder="923035190554"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> Portal PIN
                  </Label>
                  <Input
                    value={editingRep.portalPin || ''}
                    onChange={e => setEditingRep({ ...editingRep, portalPin: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated e.g. FH-1052"
                    className="font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Region (English) *</Label>
                  <Input
                    value={editingRep.regionEn || ''}
                    onChange={e => setEditingRep({ ...editingRep, regionEn: e.target.value })}
                    placeholder="e.g. Islamabad DHA Phase 2"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Region (Urdu) *</Label>
                  <Input
                    value={editingRep.regionUr || ''}
                    onChange={e => setEditingRep({ ...editingRep, regionUr: e.target.value })}
                    placeholder="مثلاً: اسلام آباد ڈی ایچ اے ٹو"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Covered Cities / Areas (Comma separated)</Label>
                <Input
                  value={citiesInput}
                  onChange={e => setCitiesInput(e.target.value)}
                  placeholder="Islamabad, DHA Phase 2, Bahria Town, Rawalpindi"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Designation (English)</Label>
                  <Input
                    value={editingRep.designationEn || ''}
                    onChange={e => setEditingRep({ ...editingRep, designationEn: e.target.value })}
                    placeholder="Regional Representative & Coordinator"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Designation (Urdu)</Label>
                  <Input
                    value={editingRep.designationUr || ''}
                    onChange={e => setEditingRep({ ...editingRep, designationUr: e.target.value })}
                    placeholder="علاقائی نمائندہ و پراجیکٹ کوآرڈینیٹر"
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
                    placeholder="Plot # 375-A, Potohar Road, I-9/3, Islamabad"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Yard / Office Address (Urdu)</Label>
                  <Input
                    value={editingRep.officeAddressUr || ''}
                    onChange={e => setEditingRep({ ...editingRep, officeAddressUr: e.target.value })}
                    placeholder="پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری، اسلام آباد"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div>
                  <Label className="font-bold">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable public listing & private field portal login
                  </p>
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Representative'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Customer Site Visit to Representative Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>کسٹمر سائٹ وزٹ نمائندے کو دیں (Assign Site Visit)</DialogTitle>
            <DialogDescription>
              یہ تفصیلات صرف منتخب نمائندے کے پورٹل میں کھلیں گی (دوسرے نمائندے نہیں دیکھ سکیں گے) اور مین ایڈمن پینل میں محفوظ رہیں گی۔
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">نمائندہ منتخب کریں (Assign To Representative) *</Label>
              <select
                value={assignForm.representativeId}
                onChange={e => setAssignForm({ ...assignForm, representativeId: e.target.value })}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm font-bold"
              >
                {representatives.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nameEn} ({r.nameUr}) — {r.regionEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">کسٹمر کا نام *</Label>
                <Input
                  value={assignForm.customerName}
                  onChange={e => setAssignForm({ ...assignForm, customerName: e.target.value })}
                  placeholder="e.g. Muhammad Usman"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">فون / واٹس ایپ *</Label>
                <Input
                  value={assignForm.customerPhone}
                  onChange={e => setAssignForm({ ...assignForm, customerPhone: e.target.value })}
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">سائٹ کا پتہ (Site Address)</Label>
                <Input
                  value={assignForm.customerAddress}
                  onChange={e => setAssignForm({ ...assignForm, customerAddress: e.target.value })}
                  placeholder="House # 22, DHA Phase 2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">وزٹ کی تاریخ (Visit Date)</Label>
                <Input
                  type="date"
                  value={assignForm.preferredVisitDate}
                  onChange={e => setAssignForm({ ...assignForm, preferredVisitDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کسٹمر کو کن چیزوں کی پیمائش کروانی ہے؟</Label>
              <div className="flex flex-wrap gap-1.5">
                {SITE_CATEGORIES.map(cat => {
                  const active = assignForm.requestedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setAssignForm(prev => ({
                          ...prev,
                          requestedCategories: active
                            ? prev.requestedCategories.filter(c => c !== cat.id)
                            : [...prev.requestedCategories, cat.id]
                        }))
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-muted/40 border-border'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">کسٹمر کی بھیجی ہوئی تفصیل / ڈیمانڈ</Label>
              <textarea
                rows={3}
                value={assignForm.customerNotes}
                onChange={e => setAssignForm({ ...assignForm, customerNotes: e.target.value })}
                placeholder="مثلاً: کسٹمر نے 1 کنال گھر کی سیڑھیوں (Ziarat White)، 8 کھڑکیوں، اور ٹی وی لاؤنج فلورنگ کے لیے سائٹ وزٹ اور کوٹیشن مانگی ہے۔"
                className="w-full rounded-md border bg-background p-2.5 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignCustomer}
              disabled={assigning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{assigning ? 'Assigning...' : 'نمائندے کے پورٹل میں بھیجیں'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
