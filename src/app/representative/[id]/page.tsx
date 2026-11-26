'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getRepresentativeById,
  verifyRepresentativePin,
  getRepresentativeJobs,
  saveRepresentativeJob,
  deleteRepresentativeJob,
  computeSiteMeasurementSection,
  getMarbles,
  type Representative,
  type SiteVisitJob,
  type SiteMeasurementSection,
  type SiteMeasurementCategory,
  type SiteVisitJobStatus
} from '@/lib/admin-actions';
import type { Marble } from '@/lib/types';
import {
  UserCheck,
  ShieldCheck,
  KeyRound,
  Unlock,
  Lock,
  Phone,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Save,
  Printer,
  Share2,
  ClipboardList,
  Ruler,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LogOut,
  Search,
  Layers,
  Building2,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const MEASUREMENT_CATEGORIES: Array<{
  id: SiteMeasurementCategory;
  labelEn: string;
  labelUr: string;
  defaultUnit: 'inches' | 'feet';
  defaultRows: Array<{ label: string; width: number; length: number; qty: number }>;
}> = [
  {
    id: 'stairs',
    labelEn: 'Stairs (Steps + Risers)',
    labelUr: 'سیڑھیاں (سٹیپ اور رائزر)',
    defaultUnit: 'inches',
    defaultRows: [
      { label: 'Steps (ٹاپ سٹیپ)', width: 12, length: 42, qty: 18 },
      { label: 'Risers (رائزر)', width: 6.125, length: 42, qty: 18 },
      { label: 'Landing / Chowki (چوکی)', width: 42, length: 42, qty: 1 }
    ]
  },
  {
    id: 'window-sill',
    labelEn: 'Window Sills & Frames',
    labelUr: 'ونڈو سل / کھڑکیاں',
    defaultUnit: 'inches',
    defaultRows: [
      { label: 'Bedroom Window Sill', width: 9, length: 60, qty: 2 },
      { label: 'Lounge Window Sill', width: 9, length: 72, qty: 1 }
    ]
  },
  {
    id: 'floor',
    labelEn: 'Flooring (Rooms / Hall)',
    labelUr: 'فلورنگ (کمرے / ہال)',
    defaultUnit: 'feet',
    defaultRows: [
      { label: 'TV Lounge / Hall', width: 16, length: 20, qty: 1 },
      { label: 'Master Bedroom', width: 14, length: 16, qty: 1 }
    ]
  },
  {
    id: 'feature-wall',
    labelEn: 'Feature Walls / Media Wall',
    labelUr: 'فیچر والز / میڈیا وال',
    defaultUnit: 'feet',
    defaultRows: [
      { label: 'Main Feature Wall', width: 10, length: 12, qty: 1 }
    ]
  },
  {
    id: 'kitchen',
    labelEn: 'Kitchen Countertop',
    labelUr: 'کچن سلیب / کاؤنٹر',
    defaultUnit: 'inches',
    defaultRows: [
      { label: 'Main Counter Slab', width: 25, length: 120, qty: 1 },
      { label: 'Backsplash', width: 24, length: 120, qty: 1 }
    ]
  },
  {
    id: 'vanity',
    labelEn: 'Vanity / Washroom Top',
    labelUr: 'وینٹی / واش روم ٹاپ',
    defaultUnit: 'inches',
    defaultRows: [
      { label: 'Master Vanity Top', width: 22, length: 48, qty: 1 }
    ]
  },
  {
    id: 'simple',
    labelEn: 'General / Custom Pieces',
    labelUr: 'سادہ پیمائش / متفرق',
    defaultUnit: 'inches',
    defaultRows: [
      { label: 'Custom Slab / Threshold', width: 12, length: 36, qty: 1 }
    ]
  }
];

const STATUS_META: Record<SiteVisitJobStatus, { labelEn: string; labelUr: string; color: string }> = {
  assigned: { labelEn: 'Assigned', labelUr: 'نیا وزٹ', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  visited: { labelEn: 'Site Visited', labelUr: 'سائٹ وزٹ مکمل', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  quoted: { labelEn: 'Bill Sent', labelUr: 'بل بن گیا', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  approved: { labelEn: 'Approved', labelUr: 'منظور شدہ', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  completed: { labelEn: 'Completed', labelUr: 'مکمل', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
};

function getCategoryMeta(cat: SiteMeasurementCategory) {
  return MEASUREMENT_CATEGORIES.find(c => c.id === cat) || MEASUREMENT_CATEGORIES[6];
}

export default function RepresentativeIndividualPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-400">Loading Representative Portal...</span>
        </div>
      }
    >
      <RepresentativePortalContent />
    </Suspense>
  );
}

function RepresentativePortalContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const repId = decodeURIComponent(String(params?.id || ''));

  const [rep, setRep] = useState<Representative | null>(null);
  const [loadingRep, setLoadingRep] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  // Lock screen state
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Portal workspace state
  const [activeTab, setActiveTab] = useState<'visits' | 'builder' | 'bills'>('visits');
  const [jobs, setJobs] = useState<SiteVisitJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SiteVisitJobStatus>('all');

  // Active job being measured/billed
  const [activeJob, setActiveJob] = useState<SiteVisitJob | null>(null);
  const [savingBill, setSavingBill] = useState(false);
  const [syncToMainOrders, setSyncToMainOrders] = useState(true);

  // Add direct on-site customer dialog
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: 'Islamabad',
    customerNotes: '',
    preferredVisitDate: new Date().toISOString().slice(0, 10),
    requestedCategories: ['stairs', 'floor'] as SiteMeasurementCategory[]
  });

  // Load representative profile & verify session PIN strictly scoped to this repId
  useEffect(() => {
    let active = true;
    async function init() {
      setLoadingRep(true);
      try {
        const foundRep = await getRepresentativeById(repId);
        if (!active) return;
        setRep(foundRep);

        if (foundRep && typeof window !== 'undefined') {
          const savedPin = sessionStorage.getItem(`rep_portal_pin_${foundRep.id}`);
          const urlPin = searchParams?.get('pin');
          const candidatePin = urlPin || savedPin || '';
          if (candidatePin) {
            const res = await verifyRepresentativePin(candidatePin, foundRep.id);
            if (active && res.success) {
              sessionStorage.setItem(`rep_portal_pin_${foundRep.id}`, candidatePin.toUpperCase());
              setUnlocked(true);
            }
          }
        }
      } finally {
        if (active) setLoadingRep(false);
      }
    }
    if (repId) init();
    return () => {
      active = false;
    };
  }, [repId, searchParams]);

  const loadWorkspaceData = useCallback(async () => {
    if (!rep?.id) return;
    setLoadingJobs(true);
    try {
      // Strictly query ONLY this representative's isolated jobs
      const [repJobs, marbleCatalog] = await Promise.all([
        getRepresentativeJobs(rep.id),
        getMarbles()
      ]);
      setJobs(repJobs.filter(j => j.representativeId === rep.id));
      setMarbles(marbleCatalog);
    } finally {
      setLoadingJobs(false);
    }
  }, [rep?.id]);

  useEffect(() => {
    if (unlocked && rep?.id) {
      loadWorkspaceData();
    }
  }, [unlocked, rep?.id, loadWorkspaceData]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setVerifying(true);
    try {
      const res = await verifyRepresentativePin(pinInput, repId);
      if (res.success && res.representative) {
        setRep(res.representative);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`rep_portal_pin_${res.representative.id}`, pinInput.trim().toUpperCase());
        }
        setUnlocked(true);
      } else {
        setAuthError(res.error || 'غلط پن! براہ کرم اپنا درست پن درج کریں۔');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleLock = () => {
    if (rep?.id && typeof window !== 'undefined') {
      sessionStorage.removeItem(`rep_portal_pin_${rep.id}`);
    }
    setUnlocked(false);
    setPinInput('');
    setActiveJob(null);
  };

  // Start measuring an assigned/existing customer job
  const openJobInBuilder = (job: SiteVisitJob) => {
    // Deep clone so editing doesn't mutate list until saved
    const cloned: SiteVisitJob = JSON.parse(JSON.stringify(job));
    if (!cloned.siteMeasurements || cloned.siteMeasurements.length === 0) {
      const initialCats: SiteMeasurementCategory[] =
        cloned.requestedCategories && cloned.requestedCategories.length > 0
          ? cloned.requestedCategories
          : ['stairs'];
      cloned.siteMeasurements = initialCats.map((cat, idx) => createDefaultSection(cat, idx));
    }
    setActiveJob(recalculateJob(cloned));
    setActiveTab('builder');
  };

  const createDefaultSection = (cat: SiteMeasurementCategory, index = 0): SiteMeasurementSection => {
    const meta = getCategoryMeta(cat);
    const defaultMarble = marbles[0];
    const defaultRate =
      defaultMarble?.variants?.find(v => typeof v.price === 'number' && v.price > 0)?.price || 350;

    return computeSiteMeasurementSection({
      id: `sec_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
      category: cat,
      title: `${meta.labelEn} — ${meta.labelUr}`,
      materialId: defaultMarble?.id || '',
      materialName: defaultMarble?.name || 'Ziarat White / Badal Marble',
      ratePerSqFt: defaultRate,
      unit: meta.defaultUnit,
      rows: meta.defaultRows.map((r, rIdx) => ({
        id: `row_${Date.now()}_${rIdx}_${Math.floor(Math.random() * 1000)}`,
        label: r.label,
        width: r.width,
        length: r.length,
        qty: r.qty,
        sqFt: 0
      })),
      totalSqFt: 0,
      wastagePercent: cat === 'stairs' ? 8 : 5,
      finalSqFt: 0,
      extraLabel: cat === 'stairs' ? 'Latak / Bullnose / Polish' : 'Edge Polish / Chemical',
      extraCharges: 0,
      subtotal: 0,
      notes: ''
    });
  };

  const recalculateJob = (job: SiteVisitJob): SiteVisitJob => {
    const sections = (job.siteMeasurements || []).map(computeSiteMeasurementSection);
    const grandTotalSqFt = Number(sections.reduce((s, sec) => s + sec.finalSqFt, 0).toFixed(2));
    const grandTotalPKR = Math.round(sections.reduce((s, sec) => s + sec.subtotal, 0));
    return { ...job, siteMeasurements: sections, grandTotalSqFt, grandTotalPKR };
  };

  const handleAddSection = (cat: SiteMeasurementCategory) => {
    if (!activeJob) return;
    const nextSection = createDefaultSection(cat, activeJob.siteMeasurements.length);
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: [...activeJob.siteMeasurements, nextSection]
      })
    );
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!activeJob) return;
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: activeJob.siteMeasurements.filter(s => s.id !== sectionId)
      })
    );
  };

  const handleUpdateSection = (sectionId: string, patch: Partial<SiteMeasurementSection>) => {
    if (!activeJob) return;
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: activeJob.siteMeasurements.map(s =>
          s.id === sectionId ? { ...s, ...patch } : s
        )
      })
    );
  };

  const handleSelectMarbleForSection = (sectionId: string, marbleId: string) => {
    const found = marbles.find(m => m.id === marbleId);
    if (!found) return;
    const minRate =
      found.variants?.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0) || [];
    const rate = minRate.length > 0 ? Math.min(...minRate) : 350;
    handleUpdateSection(sectionId, {
      materialId: found.id,
      materialName: found.name,
      ratePerSqFt: rate
    });
  };

  const handleAddRow = (sectionId: string) => {
    if (!activeJob) return;
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: activeJob.siteMeasurements.map(sec => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            rows: [
              ...sec.rows,
              {
                id: `row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                label: `Item ${sec.rows.length + 1}`,
                width: sec.unit === 'inches' ? 12 : 10,
                length: sec.unit === 'inches' ? 42 : 12,
                qty: 1,
                sqFt: 0
              }
            ]
          };
        })
      })
    );
  };

  const handleUpdateRow = (
    sectionId: string,
    rowId: string,
    patch: Partial<{ label: string; width: number; length: number; qty: number }>
  ) => {
    if (!activeJob) return;
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: activeJob.siteMeasurements.map(sec => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            rows: sec.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r))
          };
        })
      })
    );
  };

  const handleRemoveRow = (sectionId: string, rowId: string) => {
    if (!activeJob) return;
    setActiveJob(
      recalculateJob({
        ...activeJob,
        siteMeasurements: activeJob.siteMeasurements.map(sec => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            rows: sec.rows.filter(r => r.id !== rowId)
          };
        })
      })
    );
  };

  const handleCreateDirectCustomer = async () => {
    if (!rep) return;
    if (!newCustomer.customerName.trim() || !newCustomer.customerPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'معلومات نامکمل ہیں',
        description: 'کسٹمر کا نام اور فون نمبر درج کریں۔'
      });
      return;
    }

    const res = await saveRepresentativeJob({
      representativeId: rep.id,
      representativeName: rep.nameEn,
      customerName: newCustomer.customerName,
      customerPhone: newCustomer.customerPhone,
      customerAddress: newCustomer.customerAddress,
      customerCity: newCustomer.customerCity,
      customerNotes: newCustomer.customerNotes,
      requestedCategories: newCustomer.requestedCategories,
      preferredVisitDate: newCustomer.preferredVisitDate,
      status: 'visited',
      createdBy: 'representative',
      siteMeasurements: []
    });

    if (res.success && res.job) {
      toast({
        title: 'نیا کسٹمر شامل ہو گیا',
        description: 'اب آپ اس کی سائٹ پیمائش اور بل بنا سکتے ہیں۔'
      });
      setIsNewCustomerOpen(false);
      setNewCustomer({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        customerCity: 'Islamabad',
        customerNotes: '',
        preferredVisitDate: new Date().toISOString().slice(0, 10),
        requestedCategories: ['stairs', 'floor']
      });
      await loadWorkspaceData();
      openJobInBuilder(res.job);
    }
  };

  const handleSaveBill = async () => {
    if (!activeJob || !rep) return;
    setSavingBill(true);
    try {
      const nextStatus: SiteVisitJobStatus =
        activeJob.status === 'assigned' && activeJob.grandTotalPKR > 0 ? 'quoted' : activeJob.status;

      const res = await saveRepresentativeJob(
        {
          ...activeJob,
          representativeId: rep.id,
          representativeName: rep.nameEn,
          status: nextStatus
        },
        { syncToOrders: syncToMainOrders }
      );

      if (res.success && res.job) {
        setActiveJob(res.job);
        await loadWorkspaceData();
        toast({
          title: 'بل محفوظ اور ایڈمن پینل سے سنک ہو گیا!',
          description: `Bill ID: ${res.job.id} • Total: PKR ${res.job.grandTotalPKR.toLocaleString()}`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'محفوظ کرنے میں خرابی',
          description: res.error || 'دوبارہ کوشش کریں۔'
        });
      }
    } finally {
      setSavingBill(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!rep) return;
    if (!window.confirm('کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟')) return;
    await deleteRepresentativeJob(jobId, rep.id);
    if (activeJob?.id === jobId) {
      setActiveJob(null);
      setActiveTab('visits');
    }
    await loadWorkspaceData();
    toast({ title: 'ریکارڈ حذف ہو گیا' });
  };

  const buildWhatsAppQuotationUrl = (job: SiteVisitJob) => {
    const cleanPhone = (job.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : cleanPhone;

    const sectionLines = job.siteMeasurements
      .map(
        (s, idx) =>
          `${idx + 1}. *${s.title}*\n   Material: ${s.materialName}\n   Area: ${s.finalSqFt} Sq.Ft @ PKR ${s.ratePerSqFt}/sqft${
            s.extraCharges > 0 ? ` + Extra PKR ${s.extraCharges.toLocaleString()}` : ''
          }\n   Subtotal: *PKR ${s.subtotal.toLocaleString()}*`
      )
      .join('\n\n');

    const msg = `*STONE EXPERT — ON-SITE QUOTATION*\nBill Ref: ${job.id}\nRepresentative: ${rep?.nameEn} (${rep?.phone})\n\n*Customer:* ${job.customerName}\n*Site:* ${job.customerAddress || job.customerCity || 'On-Site'}\n\n${sectionLines}\n\n*Total Area:* ${job.grandTotalSqFt} Sq.Ft\n*Grand Total:* PKR ${job.grandTotalPKR.toLocaleString()}\n\nPlot # 375-A, Potohar Road, I-9/3, Islamabad\nhttps://stoneexpert.net`;

    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        j.customerName.toLowerCase().includes(q) ||
        j.customerPhone.toLowerCase().includes(q) ||
        (j.customerAddress || '').toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q)
      );
    });
  }, [jobs, statusFilter, searchQuery]);

  const savedBills = useMemo(
    () => jobs.filter(j => j.siteMeasurements && j.siteMeasurements.length > 0 && j.grandTotalPKR > 0),
    [jobs]
  );

  // Loading state
  if (loadingRep) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <span className="text-sm text-slate-400">نمائندہ پورٹل لوڈ ہو رہا ہے...</span>
      </div>
    );
  }

  // Representative not found
  if (!rep) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-bold">نمائندہ اکاؤنٹ نہیں ملا (Representative Not Found)</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          یہ لنک درست نہیں یا نمائندہ اکاؤنٹ حذف کر دیا گیا ہے۔ براہ کرم یونیورسل لاگ ان صفحے سے لاگ ان کریں۔
        </p>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
          <Link href="/representative">Representative Login</Link>
        </Button>
      </div>
    );
  }

  // PIN Lock Screen strictly scoped to this repId
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
              Private Representative Portal
            </Badge>
            <h1 className="text-xl font-extrabold text-white">{rep.nameEn}</h1>
            {rep.nameUr && (
              <p className="text-base font-bold text-amber-400 font-urdu" dir="rtl">
                {rep.nameUr}
              </p>
            )}
            <p className="text-xs text-slate-400">{rep.regionEn}</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Personal PIN
                </span>
                <span dir="rtl" className="text-amber-400">
                  ذاتی پن درج کریں
                </span>
              </Label>
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter your PIN"
                  className="h-12 bg-slate-950 border-slate-700 text-white font-mono text-base tracking-widest pr-11"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span dir="rtl">{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={verifying}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2 cursor-pointer"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              <span>پورٹل ان لاک کریں (Unlock Portal)</span>
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <Link href="/representative" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> All Reps Login
            </Link>
            <span>Only {rep.nameEn}&apos;s data is accessible</span>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked Isolated Field Workspace
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-sm">
              {rep.nameEn.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base leading-tight">
                  {rep.nameEn}
                  {rep.nameUr ? ` (${rep.nameUr})` : ''}
                </h1>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Private Portal
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-amber-500" />
                <span>{rep.regionEn}</span>
                <span>•</span>
                <span>{rep.phone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsNewCustomerOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>نیا سائٹ کسٹمر (New Customer)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLock}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('visits')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'visits'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>میرے کسٹمرز / Site Visits ({jobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!activeJob && jobs.length > 0) {
                openJobInBuilder(jobs[0]);
              } else {
                setActiveTab('builder');
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'builder'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Ruler className="w-4 h-4" />
            <span>سائٹ پیمائش اور آن لائن بل (Bill Builder)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'bills'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>میرے محفوظ بل (Saved Bills: {savedBills.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Assigned Visits</p>
            <p className="text-2xl font-black mt-0.5">{jobs.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Quotes Built</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{savedBills.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Total Measured Sq.Ft</p>
            <p className="text-2xl font-black text-sky-600 mt-0.5">
              {Math.round(jobs.reduce((s, j) => s + (j.grandTotalSqFt || 0), 0)).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <p className="text-[11px] font-semibold text-slate-500">Total Quoted Value</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              PKR {jobs.reduce((s, j) => s + (j.grandTotalPKR || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* TAB 1: MY ASSIGNED CUSTOMERS */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search customer name, phone, address..."
                  className="pl-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['all', 'assigned', 'visited', 'quoted', 'approved', 'completed'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st === 'all' ? 'All' : STATUS_META[st].labelEn}
                  </button>
                ))}
              </div>
            </div>

            {loadingJobs ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span>آپ کے کسٹمرز لوڈ ہو رہے ہیں...</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-10 text-center space-y-4 border-dashed border-2">
                <ClipboardList className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">ابھی کوئی کسٹمر وزٹ موجود نہیں</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed" dir="rtl">
                    جب مین ایڈمن پینل آپ کو کوئی کسٹمر سائیٹ وزٹ دے گا تو وہ خودکار یہاں نظر آئے گا، یا آپ خود &quot;نیا سائٹ کسٹمر&quot; بٹن سے سائٹ پر ہی کسٹمر شامل کر کے بل بنا سکتے ہیں۔
                  </p>
                </div>
                <Button
                  onClick={() => setIsNewCustomerOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>نیا سائٹ کسٹمر شامل کریں</span>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map(job => {
                  const st = STATUS_META[job.status] || STATUS_META.assigned;
                  const cleanPhone = job.customerPhone.replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : cleanPhone;

                  return (
                    <Card key={job.id} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xs">
                      <CardHeader className="p-4 pb-3 bg-slate-50/70 dark:bg-slate-900/60 border-b flex flex-row items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] font-bold ${st.color}`}>
                              {st.labelEn} • {st.labelUr}
                            </Badge>
                            <span className="text-[10px] font-mono text-slate-500">{job.id}</span>
                          </div>
                          <CardTitle className="text-base font-extrabold">{job.customerName}</CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-amber-600" />
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                              {job.customerPhone}
                            </span>
                            {job.preferredVisitDate && (
                              <>
                                <span>•</span>
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{job.preferredVisitDate}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>

                        {job.grandTotalPKR > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Quoted Bill</p>
                            <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              PKR {job.grandTotalPKR.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-500">{job.grandTotalSqFt} Sq.Ft</p>
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="p-4 space-y-3">
                        {(job.customerAddress || job.customerCity) && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{[job.customerAddress, job.customerCity].filter(Boolean).join(', ')}</span>
                          </p>
                        )}

                        {job.customerNotes && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 p-2.5 text-xs text-slate-700 dark:text-amber-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                              Customer Details / کسٹمر کی تفصیل:
                            </span>
                            {job.customerNotes}
                          </div>
                        )}

                        {job.requestedCategories && job.requestedCategories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {job.requestedCategories.map(cat => {
                              const m = getCategoryMeta(cat);
                              return (
                                <span
                                  key={cat}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                >
                                  {m.labelUr}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openJobInBuilder(job)}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 cursor-pointer"
                          >
                            <Ruler className="w-3.5 h-3.5" />
                            <span>پیمائش و بل کھولیں (Measure & Bill)</span>
                          </Button>

                          <a
                            href={`tel:${job.customerPhone}`}
                            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            title="WhatsApp Customer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ON-SITE MEASUREMENT & ONLINE BILL BUILDER */}
        {activeTab === 'builder' && (
          <div className="space-y-5">
            {!activeJob ? (
              <Card className="p-10 text-center space-y-4">
                <Ruler className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="font-bold text-lg">پہلے کوئی کسٹمر منتخب کریں یا نیا شامل کریں</h3>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('visits')} className="cursor-pointer">
                    کسٹمر لسٹ دیکھیں
                  </Button>
                  <Button
                    onClick={() => setIsNewCustomerOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                  >
                    + نیا سائٹ کسٹمر
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Print Header (only visible when printing) */}
                <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight">STONE EXPERT</h1>
                      <p className="text-xs">Plot # 375-A, Potohar Road, I-9/3, Islamabad • stoneexpert.net</p>
                      <p className="text-xs font-bold mt-1">
                        Representative: {rep.nameEn} ({rep.phone})
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold">ON-SITE MEASUREMENT & QUOTATION</p>
                      <p>Ref: {activeJob.id}</p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Info & Submitted Requirements Card */}
                <Card className="border-amber-500/40 bg-white dark:bg-slate-900 shadow-sm">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                          Active Customer Site Visit • {activeJob.id}
                        </span>
                        <h2 className="text-lg sm:text-xl font-black mt-0.5">{activeJob.customerName}</h2>
                        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {activeJob.customerPhone}
                          </span>
                          {activeJob.customerAddress && (
                            <>
                              <span>•</span>
                              <span>{activeJob.customerAddress}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <select
                          value={activeJob.status}
                          onChange={e =>
                            setActiveJob({ ...activeJob, status: e.target.value as SiteVisitJobStatus })
                          }
                          className="h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs font-bold"
                        >
                          {Object.entries(STATUS_META).map(([key, val]) => (
                            <option key={key} value={key}>
                              {val.labelEn} ({val.labelUr})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {activeJob.customerNotes && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 text-xs">
                        <strong className="text-amber-800 dark:text-amber-300">
                          کسٹمر کی بھیجی گئی تفصیل (Customer Requirements):{' '}
                        </strong>
                        <span>{activeJob.customerNotes}</span>
                      </div>
                    )}

                    {/* Quick Add Section Buttons (Window, Stairs, Flooring, Feature Walls, Kitchen, Vanity, Simple) */}
                    <div className="space-y-2 print:hidden">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        سائٹ پر پیمائش کا نیا حصہ شامل کریں (Add Measurement Category):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MEASUREMENT_CATEGORIES.map(cat => (
                          <Button
                            key={cat.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSection(cat.id)}
                            className="h-8 text-xs font-bold border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500 cursor-pointer gap-1"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>{cat.labelUr}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Measurement Sections List */}
                <div className="space-y-4">
                  {activeJob.siteMeasurements.map((sec, sIdx) => (
                    <Card key={sec.id} className="overflow-hidden border-slate-200 dark:border-slate-800">
                      <CardHeader className="p-4 bg-slate-100/80 dark:bg-slate-900 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Input
                            value={sec.title}
                            onChange={e => handleUpdateSection(sec.id, { title: e.target.value })}
                            className="font-bold text-sm h-9 bg-white dark:bg-slate-950"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 print:hidden">
                          {/* Unit Switch */}
                          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
                            <button
                              type="button"
                              onClick={() => handleUpdateSection(sec.id, { unit: 'inches' })}
                              className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                                sec.unit === 'inches'
                                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                                  : 'text-slate-500'
                              }`}
                            >
                              Inches (انچ)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSection(sec.id, { unit: 'feet' })}
                              className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                                sec.unit === 'feet'
                                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                                  : 'text-slate-500'
                              }`}
                            >
                              Feet (فٹ)
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSection(sec.id)}
                            className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Material, Rate & Wastage Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-[11px] font-bold text-slate-500">
                              ماربل / پتھر منتخب کریں (Material)
                            </Label>
                            <div className="flex gap-2">
                              <select
                                value={sec.materialId || ''}
                                onChange={e => handleSelectMarbleForSection(sec.id, e.target.value)}
                                className="h-9 flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs font-semibold print:hidden"
                              >
                                <option value="">-- Select from Catalog --</option>
                                {marbles.map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.materialType})
                                  </option>
                                ))}
                              </select>
                              <Input
                                value={sec.materialName}
                                onChange={e => handleUpdateSection(sec.id, { materialName: e.target.value })}
                                placeholder="Material name"
                                className="h-9 flex-1 text-xs font-semibold"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-500">
                              Rate (PKR / Sq.Ft)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={sec.ratePerSqFt}
                              onChange={e =>
                                handleUpdateSection(sec.id, { ratePerSqFt: Number(e.target.value) || 0 })
                              }
                              className="h-9 text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-500">
                              Wastage % (ویسٹیج)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={50}
                              value={sec.wastagePercent}
                              onChange={e =>
                                handleUpdateSection(sec.id, { wastagePercent: Number(e.target.value) || 0 })
                              }
                              className="h-9 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Measurement Rows Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/70 border-b text-[11px] text-slate-500 uppercase">
                              <tr>
                                <th className="p-2 text-left">Item / Location</th>
                                <th className="p-2 text-center w-24">
                                  Width ({sec.unit === 'inches' ? 'in' : 'ft'})
                                </th>
                                <th className="p-2 text-center w-24">
                                  Length ({sec.unit === 'inches' ? 'in' : 'ft'})
                                </th>
                                <th className="p-2 text-center w-20">Qty</th>
                                <th className="p-2 text-right w-24">Sq.Ft</th>
                                <th className="p-2 w-10 print:hidden" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {sec.rows.map(row => (
                                <tr key={row.id}>
                                  <td className="p-1.5">
                                    <Input
                                      value={row.label}
                                      onChange={e =>
                                        handleUpdateRow(sec.id, row.id, { label: e.target.value })
                                      }
                                      className="h-8 text-xs"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <Input
                                      type="number"
                                      step="any"
                                      min={0}
                                      value={row.width}
                                      onChange={e =>
                                        handleUpdateRow(sec.id, row.id, {
                                          width: Number(e.target.value) || 0
                                        })
                                      }
                                      className="h-8 text-xs text-center font-mono"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <Input
                                      type="number"
                                      step="any"
                                      min={0}
                                      value={row.length}
                                      onChange={e =>
                                        handleUpdateRow(sec.id, row.id, {
                                          length: Number(e.target.value) || 0
                                        })
                                      }
                                      className="h-8 text-xs text-center font-mono"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={row.qty}
                                      onChange={e =>
                                        handleUpdateRow(sec.id, row.id, {
                                          qty: Math.max(0, Number(e.target.value) || 0)
                                        })
                                      }
                                      className="h-8 text-xs text-center font-mono"
                                    />
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                    {row.sqFt.toFixed(2)}
                                  </td>
                                  <td className="p-1.5 text-center print:hidden">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRow(sec.id, row.id)}
                                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddRow(sec.id)}
                            className="h-8 text-xs gap-1 w-fit print:hidden cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>نئی لائن شامل کریں (Add Row)</span>
                          </Button>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[11px] text-slate-500 whitespace-nowrap">
                                Extra (Polish/Latak/Fixing):
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                value={sec.extraCharges}
                                onChange={e =>
                                  handleUpdateSection(sec.id, {
                                    extraCharges: Number(e.target.value) || 0
                                  })
                                }
                                className="h-8 w-28 text-xs font-mono"
                              />
                            </div>

                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 text-right">
                              <span className="text-[10px] text-slate-500 block">
                                Net: {sec.totalSqFt} → Final (+{sec.wastagePercent}%):{' '}
                                <strong>{sec.finalSqFt} Sq.Ft</strong>
                              </span>
                              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                Subtotal: PKR {sec.subtotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Grand Total & Action Footer */}
                <Card className="border-2 border-amber-500 bg-slate-900 text-white shadow-xl">
                  <CardContent className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                        Grand Total Site Bill • کل آن لائن بل
                      </p>
                      <div className="flex flex-wrap items-baseline gap-4">
                        <span className="text-3xl font-black text-white">
                          PKR {activeJob.grandTotalPKR.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          ({activeJob.grandTotalSqFt.toLocaleString()} Sq.Ft across{' '}
                          {activeJob.siteMeasurements.length} sections)
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer print:hidden">
                        <input
                          type="checkbox"
                          checked={syncToMainOrders}
                          onChange={e => setSyncToMainOrders(e.target.checked)}
                          className="rounded accent-amber-500"
                        />
                        <span>مین ایڈمن پینل اور آرڈرز لسٹ میں بھی خودکار سنک کریں (Sync to Main Admin Panel)</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto print:hidden">
                      <Button
                        type="button"
                        onClick={handleSaveBill}
                        disabled={savingBill}
                        className="flex-1 lg:flex-initial bg-amber-500 hover:bg-amber-400 text-slate-950 font-black gap-2 h-11 px-5 cursor-pointer"
                      >
                        {savingBill ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>محفوظ کریں اور ایڈمن کو بھیجیں</span>
                      </Button>

                      <a
                        href={buildWhatsAppQuotationUrl(activeJob)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>WhatsApp Quote</span>
                      </a>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.print()}
                        className="h-11 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* TAB 3: MY SAVED BILLS */}
        {activeTab === 'bills' && (
          <div className="space-y-3">
            {savedBills.length === 0 ? (
              <Card className="p-10 text-center space-y-2 border-dashed border-2">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-bold">ابھی کوئی محفوظ بل موجود نہیں</p>
                <p className="text-xs text-slate-500">
                  جب آپ کسی کسٹمر کی سائٹ پیمائش کر کے بل محفوظ کریں گے تو وہ یہاں اور مین ایڈمن پینل دونوں میں محفوظ رہے گا۔
                </p>
              </Card>
            ) : (
              savedBills.map(bill => (
                <Card key={bill.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-600">{bill.id}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_META[bill.status].color}`}>
                        {STATUS_META[bill.status].labelEn}
                      </Badge>
                      {bill.linkedOrderId && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Synced to Main Admin
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-extrabold text-base">{bill.customerName}</h4>
                    <p className="text-xs text-slate-500">
                      {bill.customerPhone} • {bill.customerAddress || bill.customerCity || 'On-Site'} •{' '}
                      {bill.siteMeasurements.length} sections ({bill.grandTotalSqFt} Sq.Ft)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        PKR {bill.grandTotalPKR.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(bill.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openJobInBuilder(bill)}
                      className="font-bold cursor-pointer"
                    >
                      Open / Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteJob(bill.id)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* New Direct Site Customer Modal */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>نیا سائٹ کسٹمر شامل کریں (Add On-Site Customer)</DialogTitle>
            <DialogDescription>
              یہ کسٹمر صرف آپ کے پورٹل ({rep.nameEn}) اور مین ایڈمن پینل میں محفوظ ہو گا۔
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">کسٹمر کا نام (Customer Name) *</Label>
                <Input
                  value={newCustomer.customerName}
                  onChange={e => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">فون / واٹس ایپ (Phone) *</Label>
                <Input
                  value={newCustomer.customerPhone}
                  onChange={e => setNewCustomer({ ...newCustomer, customerPhone: e.target.value })}
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">سائٹ کا پتہ (Site Address)</Label>
                <Input
                  value={newCustomer.customerAddress}
                  onChange={e => setNewCustomer({ ...newCustomer, customerAddress: e.target.value })}
                  placeholder="House # 14, Sector D, DHA Phase 2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">شہر (City)</Label>
                <Input
                  value={newCustomer.customerCity}
                  onChange={e => setNewCustomer({ ...newCustomer, customerCity: e.target.value })}
                  placeholder="Islamabad / Rawalpindi"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">کس کام کی پیمائش کرنی ہے؟ (Work Categories)</Label>
              <div className="flex flex-wrap gap-1.5">
                {MEASUREMENT_CATEGORIES.map(cat => {
                  const selected = newCustomer.requestedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setNewCustomer(prev => ({
                          ...prev,
                          requestedCategories: selected
                            ? prev.requestedCategories.filter(c => c !== cat.id)
                            : [...prev.requestedCategories, cat.id]
                        }))
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border cursor-pointer ${
                        selected
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat.labelUr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">کسٹمر کی تفصیل / نوٹس (Customer Notes)</Label>
              <textarea
                rows={3}
                value={newCustomer.customerNotes}
                onChange={e => setNewCustomer({ ...newCustomer, customerNotes: e.target.value })}
                placeholder="مثلاً: 10 مرلہ گھر کی سیڑھی، کھڑکیاں، فلورنگ اور فیچر وال کی پیمائش..."
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2.5 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCustomerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDirectCustomer}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>شامل کریں اور پیمائش شروع کریں</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
