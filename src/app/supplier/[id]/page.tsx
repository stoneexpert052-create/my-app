'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { 
  getSupplierById, 
  saveSupplier, 
  submitSupplierProposal, 
  getSupplierProposals,
  getSupplierRateRequests,
  submitSupplierRateRequest,
  verifySupplierPassword,
  Supplier, 
  SupplierRate,
  SupplierProposal,
  SupplierRateRequest,
  APP_PRODUCT_CATEGORIES,
  getHomepageConfig
} from '@/lib/admin-actions';
import { SupplierRateSheetMatrix } from '@/components/supplier-rate-sheet-matrix';
import { 
  Check, 
  Loader2, 
  Sparkles, 
  Upload, 
  Plus, 
  FileText, 
  Phone, 
  MapPin, 
  Mail, 
  DollarSign,
  AlertCircle,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Trash2,
  Pause,
  Play,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

function getDefaultUnitForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('abrasive')) return 'Pieces';
  if (cat.includes('chemical') || cat === 'liters') return 'Liters';
  if (cat.includes('adhesive') || cat.includes('glue') || cat === 'kilograms') return 'Kilograms';
  if (cat.includes('tool') || cat === 'units') return 'Units';
  if (cat.includes('tile') || cat.includes('piece') || cat.includes('ceramic')) return 'Square feet';
  if (cat.includes('expert') || cat.includes('team') || cat.includes('fixing')) return 'Square feet';
  if (cat.includes('meter')) return 'Square meters';
  return 'Square feet'; // default for marble, granite, etc.
}

export default function SupplierPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Loading Secure Portal...</span>
      </div>
    }>
      <SupplierPortalContent />
    </Suspense>
  );
}

function SupplierPortalContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId).trim() : '';
  const { toast } = useToast();
  
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  
  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [proposals, setProposals] = useState<SupplierProposal[]>([]);
  const [rateRequests, setRateRequests] = useState<SupplierRateRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'rates' | 'new-product' | 'proposals'>('rates');
  const [portalRateView, setPortalRateView] = useState<'matrix' | 'list'>('matrix');
  
  // Action Feedback States
  const [updatingRateId, setUpdatingRateId] = useState<string | null>(null);
  const [successRateId, setSuccessRateId] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  
  // Editing Rates Temporary Local State
  const [editedRates, setEditedRates] = useState<{ [rateId: string]: number }>({});

  // Password Lock States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Fallback direct PIN lookup states if ID param doesn't match
  const [fallbackPinInput, setFallbackPinInput] = useState('');
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  // Category Filter State
  const [categoryFilter, setCategoryFilter] = useState('All');

  // New Product Proposal Form State
  const [newProductForm, setNewProductForm] = useState({
    productName: '',
    materialType: 'Marble' as any,
    origin: 'Local' as any,
    thickness: '6-Sutar',
    size: 'Slab',
    rate: '',
    description: '',
    image: null as string | null,
    imageFileName: '',
    unit: 'Square feet'
  });

  // Dynamic categories synced with global settings
  const [dynamicCategories, setDynamicCategories] = useState<{ id: string; labelEn: string; labelUr: string }[]>(() => APP_PRODUCT_CATEGORIES);

  // Allowed categories list for this supplier
  const allowedCategoriesList: string[] = React.useMemo(() => {
    if (!supplier) return dynamicCategories.map(c => c.id);
    const rawAllowed = supplier.allowedCategories && supplier.allowedCategories.length > 0 
      ? supplier.allowedCategories 
      : (supplier.materialsSupplied && supplier.materialsSupplied.length > 0 ? supplier.materialsSupplied : ['All']);
    
    if (rawAllowed.includes('All')) {
      return dynamicCategories.map(c => c.id);
    }
    return rawAllowed;
  }, [supplier, dynamicCategories]);

  const isRestrictedAccess = React.useMemo(() => {
    if (!supplier) return false;
    const rawAllowed = supplier.allowedCategories;
    return Boolean(rawAllowed && rawAllowed.length > 0 && !rawAllowed.includes('All') && rawAllowed.length < dynamicCategories.length);
  }, [supplier, dynamicCategories]);

  const allowedCategoryOptions = React.useMemo(() => {
    return dynamicCategories.filter(c => {
      if (!isRestrictedAccess) return true;
      return allowedCategoriesList.some(cat => cat.toLowerCase() === c.id.toLowerCase());
    });
  }, [allowedCategoriesList, isRestrictedAccess, dynamicCategories]);

  useEffect(() => {
    if (id || searchParams?.get('pin')) {
      loadData();
    }
  }, [id, searchParams]);

  useEffect(() => {
    const catParam = searchParams?.get('category');
    if (catParam) {
      setCategoryFilter(catParam);
      // Auto-set the proposal material type and unit
      setNewProductForm(prev => ({
        ...prev,
        materialType: catParam,
        unit: getDefaultUnitForCategory(catParam)
      }));
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      let [supData, cfg] = await Promise.all([
        getSupplierById(id),
        getHomepageConfig().catch(() => null)
      ]);

      const pinParam = searchParams?.get('pin') || searchParams?.get('key') || searchParams?.get('password');

      // If supplier not found by ID, try looking up by PIN parameter
      if (!supData && pinParam) {
        const verifyRes = await verifySupplierPassword(pinParam);
        if (verifyRes.success && verifyRes.supplier) {
          supData = verifyRes.supplier;
        }
      }

      // If still not found, check if the ID in the URL is actually a PIN, phone, or name
      if (!supData && id) {
        const verifyRes = await verifySupplierPassword(id);
        if (verifyRes.success && verifyRes.supplier) {
          supData = verifyRes.supplier;
        }
      }

      if (cfg && cfg.categoryOrder && Array.isArray(cfg.categoryOrder)) {
        const list = cfg.categoryOrder.map((cat: string) => {
          const existing = APP_PRODUCT_CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase());
          return {
            id: cat,
            labelEn: cat,
            labelUr: existing ? existing.labelUr : cat
          };
        });
        setDynamicCategories(list);
      }

      if (supData) {
        setSupplier(supData);
        // Initialize local rate edit states
        const ratesMap: { [key: string]: number } = {};
        if (supData.rates) {
          supData.rates.forEach(r => {
            ratesMap[r.id] = r.rate;
          });
        }
        setEditedRates(ratesMap);

        const rawAllowed = supData.allowedCategories && supData.allowedCategories.length > 0 
          ? supData.allowedCategories 
          : (supData.materialsSupplied && supData.materialsSupplied.length > 0 ? supData.materialsSupplied : ['All']);
        
        const fallbackCat = rawAllowed.includes('All') ? 'Marble' : (rawAllowed[0] || 'Marble');
        const catParam = searchParams?.get('category');
        const effectiveCat = (catParam && (rawAllowed.includes('All') || rawAllowed.includes(catParam))) 
          ? catParam 
          : fallbackCat;

        setCategoryFilter(rawAllowed.includes('All') ? 'All' : effectiveCat);
        setNewProductForm(prev => ({
          ...prev,
          materialType: effectiveCat as any,
          unit: getDefaultUnitForCategory(effectiveCat)
        }));
        
        // Auto-unlock if pin was provided in query string or session matches
        const unlockedParam = searchParams?.get('unlocked');
        if (unlockedParam === 'true') {
          setIsUnlocked(true);
        } else if (pinParam) {
          const cleanPin = pinParam.trim().toLowerCase();
          const supPass = (supData.accessPassword || '').trim().toLowerCase();
          const phoneDigits = (supData.phone || '').replace(/[^0-9]/g, '');
          if ((supPass && supPass === cleanPin) || (cleanPin.length >= 4 && phoneDigits.endsWith(cleanPin))) {
            setIsUnlocked(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(`vendor_session_${supData.id}`, cleanPin);
            }
          }
        }

        // Load past proposals
        const allProps = await getSupplierProposals();
        const supProps = allProps.filter(p => p.supplierId === supData.id);
        setProposals(supProps);

        // Load past rate requests
        const allRateReqs = await getSupplierRateRequests();
        const supRateReqs = allRateReqs.filter(r => r.supplierId === supData.id);
        setRateRequests(supRateReqs);
      }
    } catch (err) {
      console.error("Failed to load supplier portal data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = fallbackPinInput.trim();
    if (!query) {
      setFallbackError("براہ کرم اپنا 4 ہندسوں کا پن یا فون نمبر درج کریں۔");
      return;
    }
    setFallbackLoading(true);
    setFallbackError(null);
    try {
      const res = await verifySupplierPassword(query);
      if (res.success && res.supplier) {
        setSupplier(res.supplier);
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`vendor_session_${res.supplier.id}`, query);
          sessionStorage.setItem('active_vendor_id', res.supplier.id);
        }
        toast({
          title: "پورٹل کامیابی سے کھل گیا! 🔓",
          description: `خوش آمدید ${res.supplier.name}۔ آپ کا پورٹل اب فعال ہے۔`
        });
      } else {
        setFallbackError(res.error || "غلط پن یا فون نمبر! براہ کرم درست پاسورڈ درج کریں یا ایڈمن سے رابطہ کریں۔");
      }
    } catch (err: any) {
      setFallbackError(err.message || "لاگ ان کے دوران خرابی پیش آئی۔");
    } finally {
      setFallbackLoading(false);
    }
  };

  // Check password unlock permissions from query params or browser session
  useEffect(() => {
    if (!supplier) return;
    const supPass = (supplier.accessPassword || '').trim().toLowerCase();
    const phoneDigits = (supplier.phone || '').replace(/[^0-9]/g, '');

    const pinParam = searchParams?.get('pin') || searchParams?.get('key') || searchParams?.get('password');
    const unlockedParam = searchParams?.get('unlocked');

    if (unlockedParam === 'true') {
      setIsUnlocked(true);
      return;
    }

    if (pinParam) {
      const cleanPin = pinParam.trim().toLowerCase();
      if ((supPass && supPass === cleanPin) || (cleanPin.length >= 4 && phoneDigits.endsWith(cleanPin))) {
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`vendor_session_${supplier.id}`, cleanPin);
        }
        return;
      }
    }

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`vendor_session_${supplier.id}`);
      if (stored) {
        const cleanStored = stored.trim().toLowerCase();
        if (!supPass || supPass === cleanStored || (cleanStored.length >= 4 && phoneDigits.endsWith(cleanStored))) {
          setIsUnlocked(true);
          return;
        }
      }
    }
  }, [supplier, searchParams]);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supplier) return;
    const cleanInput = passInput.trim().toLowerCase();
    if (!cleanInput) {
      setPassError("براہ کرم اپنا پاسورڈ یا پن درج کریں۔");
      return;
    }

    setUnlocking(true);
    setPassError(null);

    const supPass = (supplier.accessPassword || '').trim().toLowerCase();
    const phoneDigits = (supplier.phone || '').replace(/[^0-9]/g, '');

    const isMatch = (supPass && supPass === cleanInput) ||
      (cleanInput.length >= 4 && phoneDigits.endsWith(cleanInput));

    if (isMatch) {
      setIsUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`vendor_session_${supplier.id}`, cleanInput);
        sessionStorage.setItem('active_vendor_id', supplier.id);
      }
      toast({
        title: "پورٹل ان لاک ہو گیا! 🔓",
        description: `خوش آمدید ${supplier.name}۔ پورٹل اب دستیاب ہے۔`,
      });
    } else {
      setPassError("غلط پاسورڈ! براہ کرم درست پاسورڈ درج کریں یا ایڈمنسٹریٹر سے نیا پن حاصل کریں۔");
    }
    setUnlocking(false);
  };

  const handleLockPortal = () => {
    if (typeof window !== 'undefined' && supplier) {
      sessionStorage.removeItem(`vendor_session_${supplier.id}`);
      sessionStorage.removeItem('active_vendor_id');
    }
    setIsUnlocked(false);
    setPassInput('');
    toast({
      title: "پورٹل لاک ہو گیا 🔒",
      description: "آپ کی سیشن ختم کر دی گئی ہے۔ دوبارہ کھولنے کے لیے پاسورڈ درج کریں۔",
    });
  };

  const filteredRates = (supplier?.rates || []).filter(rateObj => {
    if (categoryFilter === 'All') return true;
    
    const typeLower = rateObj.materialType?.toLowerCase() || '';
    const filterLower = categoryFilter.toLowerCase();
    
    // Smart mapping for Ceramic Styles
    if (filterLower.includes('ceramic') || filterLower.includes('tile')) {
      if (typeLower.includes('ceramic') || typeLower.includes('tile')) return true;
    }

    // Smart mapping for Over-Expert Team
    if (filterLower.includes('expert') || filterLower.includes('team') || filterLower.includes('fixing')) {
      if (typeLower.includes('expert') || typeLower.includes('team') || typeLower.includes('fixing') || typeLower.includes('service') || typeLower.includes('labor')) return true;
    }

    if (filterLower === 'marble' && typeLower === 'marble') return true;
    if (typeLower === filterLower) return true;
    if (typeLower.includes(filterLower) || filterLower.includes(typeLower)) return true;
    
    return false;
  });

  // Compress and read image as base64 client-side
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        // Compress using Canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Scale down to max 600px width/height to keep size tiny
        const maxDim = 600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Base64 string at 0.5 quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        setNewProductForm(prev => ({
          ...prev,
          image: compressedBase64,
          imageFileName: file.name
        }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit rate adjustment request to admin for approval
  const handleUpdateRate = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const newRate = editedRates[rateObj.id];
    if (newRate === undefined || isNaN(newRate) || newRate <= 0) return;

    setUpdatingRateId(rateObj.id);
    try {
      const result = await submitSupplierRateRequest({
        supplierId: supplier.id,
        supplierName: supplier.name,
        materialId: rateObj.materialId,
        materialName: rateObj.materialName,
        materialType: rateObj.materialType || 'marble',
        currentRate: rateObj.rate,
        proposedRate: Number(newRate)
      });

      if (result.success) {
        setSuccessRateId(rateObj.id);
        await loadData(); // Refresh supplier portal data (to show pending request)
        setTimeout(() => setSuccessRateId(null), 3500);
      }
    } catch (err) {
      console.error("Failed to submit rate adjustment request:", err);
    } finally {
      setUpdatingRateId(null);
    }
  };

  // Toggle Pause/Active on a rate
  const handleTogglePauseRate = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const currentStatus = rateObj.status || 'active';
    const nextStatus: 'active' | 'paused' = currentStatus === 'active' ? 'paused' : 'active';
    
    // Optimistic UI state update
    const updatedRates = (supplier.rates || []).map(r => {
      if (r.id === rateObj.id) {
        return {
          ...r,
          status: nextStatus,
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    });

    try {
      const result = await saveSupplier({
        ...supplier,
        rates: updatedRates
      });
      if (result.success) {
        setSupplier(prev => prev ? { ...prev, rates: updatedRates } : null);
        toast({
          title: nextStatus === 'paused' ? "Material Paused / Cancelled" : "Material Re-activated",
          description: `Successfully ${nextStatus === 'paused' ? 'paused/cancelled' : 'resumed'} billing contract rate for "${rateObj.materialName}".`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Failed to toggle pause status:", err);
      toast({
        title: "Action Failed",
        description: err.message || "Could not update material status.",
        variant: "destructive"
      });
    }
  };

  // Delete rate link entirely from supplier profile
  const handleDeleteRate = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete and cancel the product "${rateObj.materialName}" from your directory? You will no longer supply this item.`);
    if (!confirmDelete) return;

    const updatedRates = (supplier.rates || []).filter(r => r.id !== rateObj.id);

    try {
      const result = await saveSupplier({
        ...supplier,
        rates: updatedRates
      });
      if (result.success) {
        setSupplier(prev => prev ? { ...prev, rates: updatedRates } : null);
        toast({
          title: "Product Directory Link Deleted",
          description: `Permanently removed "${rateObj.materialName}" from your active product list.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Failed to delete rate:", err);
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete product from directory.",
        variant: "destructive"
      });
    }
  };

  // Submit product proposal/upload
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    
    const { productName, materialType, origin, thickness, size, rate, description, image, unit } = newProductForm;
    if (!productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter the stone or product name.",
        variant: "destructive"
      });
      return;
    }
    if (!rate || Number(rate) <= 0) {
      toast({
        title: "Rate Required",
        description: "Please enter a valid wholesale rate in PKR.",
        variant: "destructive"
      });
      return;
    }

    if (isRestrictedAccess && !allowedCategoriesList.some(cat => cat.toLowerCase() === materialType.toLowerCase())) {
      toast({
        title: "Category Access Restricted / رسائی محدود ہے",
        description: `آپ صرف مجاز کیٹگریز (${allowedCategoriesList.join(', ')}) میں آئٹم اپلوڈ کر سکتے ہیں۔`,
        variant: "destructive"
      });
      return;
    }

    setSubmittingProposal(true);
    const isStone = !['Abrasive', 'Chemical', 'Adhesive', 'Tool'].includes(materialType);
    try {
      const res = await submitSupplierProposal({
        supplierId: supplier.id,
        supplierName: supplier.name,
        productName: productName.trim(),
        materialType,
        origin,
        thickness: isStone ? thickness : '',
        size: isStone ? size : '',
        rate: Number(rate),
        description: description.trim(),
        imageUrl: image || `https://placehold.co/150?text=${encodeURIComponent(productName.trim())}`,
        unit
      });

      if (res.success) {
        setProposalSuccess(true);
        toast({
          title: "Offer Submitted Successfully! ✅",
          description: `"${productName}" has been submitted to Stone Expert for review.`
        });

        // Reset form
        setNewProductForm({
          productName: '',
          materialType: newProductForm.materialType,
          origin: 'Local',
          thickness: '6-Sutar',
          size: 'Slab',
          rate: '',
          description: '',
          image: null,
          imageFileName: '',
          unit: newProductForm.unit || 'Square feet'
        });
        
        // Refresh proposal log list
        await loadData();
        
        setTimeout(() => {
          setProposalSuccess(false);
          setActiveTab('proposals');
        }, 2500);
      } else {
        toast({
          title: "Submission Error",
          description: res.error || "Failed to submit proposal. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Error submitting proposal:", err);
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to connect to the server.",
        variant: "destructive"
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Popup login failed, trying redirect...", error);
      try {
        await signInWithRedirect(auth, provider);
      } catch (err: any) {
        console.error("Redirect login failed too:", err);
        alert("Login failed: " + err.message);
      }
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Signout failed:", error);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Loading Secure Portal...</span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
              <Building2 className="h-4 w-4 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
                STONE EXPERT
              </span>
              <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
                Vendor & Supplier Portal
              </span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5">
              <span>Main Website</span>
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
        </header>

        {/* Center Recovery Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden text-center">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 shadow-inner">
                <KeyRound className="h-8 w-8" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                وینڈر و سپلائر پورٹل لاگ ان
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
                براہ کرم اپنا 4 ہندسوں کا پاسورڈ / PIN یا رجسٹرڈ فون نمبر درج کریں تاکہ آپ کا مخصوص پورٹل فوری کھل جائے۔
              </p>

              <form onSubmit={handleFallbackLookup} className="space-y-4">
                <div className="space-y-2 text-left">
                  <div className="relative">
                    <Input
                      type="text"
                      value={fallbackPinInput}
                      onChange={(e) => {
                        setFallbackPinInput(e.target.value);
                        setFallbackError(null);
                      }}
                      placeholder="Enter 4-Digit PIN or Phone (e.g. 7861)"
                      className="bg-slate-950 border-slate-700 text-center font-mono text-lg tracking-widest text-white h-12 rounded-xl focus:ring-2 focus:ring-amber-500"
                      autoFocus
                    />
                  </div>

                  {fallbackError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{fallbackError}</span>
                    </motion.div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={fallbackLoading || !fallbackPinInput.trim()}
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm rounded-xl gap-2 shadow-lg cursor-pointer"
                >
                  {fallbackLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>پورٹل کی تصدیق ہو رہی ہے...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>پورٹل کھولیں (Open Portal)</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-6 mt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 text-xs">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => loadData()}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  دوبارہ لوڈ کریں (Reload)
                </Button>
                <span className="text-slate-600">•</span>
                <Link href="/supplier">
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-amber-400 hover:text-amber-300">
                    یونیورسل پورٹل (Universal Link)
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-900 py-3 text-center text-xs text-slate-600">
          Stone Expert © {new Date().getFullYear()} • Secure Vendor Access
        </footer>
      </div>
    );
  }

  // 0. PASSWORD GATE: Require password before showing supplier details & prices
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
        
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md">
              <Building2 className="h-4 w-4 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
                STONE EXPERT
              </span>
              <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
                Vendor Security Lock
              </span>
            </div>
          </Link>

          <Link href="/supplier">
            <Button variant="ghost" size="sm" className="text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              <span>تمام سپلائرز لاگ ان</span>
            </Button>
          </Link>
        </header>

        {/* Center Lock Box */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1 shadow-inner">
                  <Lock className="h-8 w-8" />
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                    محفوظ وینڈر پورٹل
                  </Badge>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {supplier.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  اس سپلائر پورٹل کو کھولنے اور ریٹس اپڈیٹ کرنے کے لیے اپنا مخصوص پاسورڈ یا پن درج کریں۔
                </p>
              </div>

              {passError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passError}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>سپلائر پاسورڈ یا پن (Enter Password)</span>
                    <span className="text-[11px] text-slate-400 font-normal">جیسے: 7861</span>
                  </label>

                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="اپنا پاسورڈ درج کریں..."
                      value={passInput}
                      onChange={(e) => {
                        setPassInput(e.target.value);
                        if (passError) setPassError(null);
                      }}
                      autoFocus
                      disabled={unlocking}
                      className="h-11 bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 pr-10 text-sm tracking-wider font-mono rounded-xl focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={unlocking || !passInput.trim()}
                  className="w-full h-11 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {unlocking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>تصدیق ہو رہی ہے...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 text-slate-950" />
                      <span>پورٹل ان لاک کریں (Unlock Portal)</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Stone Expert محفوظ ایکسیس کنٹرول</span>
                </div>
                <div className="pt-1">
                  <Link href="/supplier" className="text-xs text-amber-400 hover:underline">
                    کیا آپ کوئی دوسرا سپلائر ہیں؟ عام وینڈر لاگ ان پر جائیں
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 px-4 py-3 text-center text-xs text-slate-400">
          Stone Expert Management System • All Rights Reserved
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      
      {/* 1. PORTAL HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/30">
              <Package className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                  Authorized Vendor Portal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{supplier.name}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLockPortal}
              className="text-xs border-amber-600/40 hover:bg-amber-950/30 text-amber-300 gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>پورٹل لاک کریں (Lock)</span>
            </Button>
            <Link href="/" target="_blank">
              <Button variant="ghost" className="text-xs text-slate-400 hover:text-white hover:bg-slate-800">
                Stone Expert Live Store
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: VENDOR INFO */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
            
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Supplier Profile
            </h2>
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Contact Representative</span>
                <span className="font-semibold text-white text-sm block">{supplier.contactPerson || 'Not provided'}</span>
              </div>
              
              <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2.5">
                <div className="bg-slate-800 p-2 rounded-lg">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Phone Number</span>
                  <a href={`tel:${supplier.phone}`} className="font-semibold text-white hover:text-indigo-400 transition-colors">
                    {supplier.phone || 'Not provided'}
                  </a>
                </div>
              </div>

              {supplier.email && (
                <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2.5">
                  <div className="bg-slate-800 p-2 rounded-lg">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email Address</span>
                    <a href={`mailto:${supplier.email}`} className="font-semibold text-white hover:text-indigo-400 transition-colors">
                      {supplier.email}
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2.5">
                <div className="bg-slate-800 p-2 rounded-lg">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Factory/Office Address</span>
                  <span className="font-semibold text-white">{supplier.address || 'Not provided'}</span>
                </div>
              </div>
              
              {/* AUTHORIZED CATEGORIES SCOPE */}
              <div className="pt-3 border-t border-slate-800/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    {isRestrictedAccess ? (
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    Authorized Scope / الاؤ کیٹگریز
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isRestrictedAccess ? 'Restricted' : 'Full Catalog'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allowedCategoriesList.map(cat => (
                    <Badge key={cat} className="bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.5 font-medium">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <Badge className={supplier.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}>
                  {supplier.status === 'active' ? 'Active Partner' : 'Suspended'}
                </Badge>
              </div>
            </div>
          </div>

          {/* DYNAMIC METRIC CARD */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-xs text-slate-400 space-y-3.5">
            <h3 className="font-semibold text-white text-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              How this works:
            </h3>
            <p className="leading-relaxed">
              <strong>1. Adjust active rates</strong> in your directory to instantly let the Stone Expert showroom team know of rate decreases or increases.
            </p>
            <p className="leading-relaxed">
              <strong>2. Suggest a New Stone/Item</strong> when a new shipping cargo has arrived at your factory, including its size, sutar, and wholesale rate.
            </p>
            <p className="leading-relaxed text-indigo-400 font-medium">
              We update showroom quote rates based on your active listings immediately. Thank you for your partnership!
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE TABS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB BAR */}
          <div className="flex border-b border-slate-850">
            <button
              onClick={() => setActiveTab('rates')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 tracking-wider uppercase transition-all ${
                activeTab === 'rates' 
                  ? 'border-indigo-500 text-white bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              📋 Your Active Directory ({supplier.rates?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('new-product')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 tracking-wider uppercase transition-all ${
                activeTab === 'new-product' 
                  ? 'border-indigo-500 text-white bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              ✨ Propose New Stone
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 tracking-wider uppercase transition-all ${
                activeTab === 'proposals' 
                  ? 'border-indigo-500 text-white bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              📬 Submission History ({proposals.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            
            {/* TAB 1: ACTIVE DIRECTORY RATES */}
            {activeTab === 'rates' && (
              <motion.div
                key="rates-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl">
                  <span className="text-xs font-bold text-slate-300">
                    ریٹ شیٹ ڈسپلے اسٹائل (Display Mode):
                  </span>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPortalRateView('matrix')}
                      className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                        portalRateView === 'matrix'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📄 ایک پیج ملٹی سائز ریٹ شیٹ (24&quot; | 36&quot; | 48&quot; | 52&quot; | Gangsaw)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPortalRateView('list')}
                      className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                        portalRateView === 'list'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📋 سادہ لسٹ ویو
                    </button>
                  </div>
                </div>

                {portalRateView === 'matrix' ? (
                  <SupplierRateSheetMatrix
                    supplier={supplier}
                    mode="supplier"
                    pendingRequests={rateRequests}
                    onSaveRatesBatch={async (updatedRates, changedItems) => {
                      for (const item of changedItems) {
                        if (item.isNewSlot) {
                          await saveSupplier({
                            ...supplier,
                            rates: updatedRates
                          });
                        } else {
                          await submitSupplierRateRequest({
                            supplierId: supplier.id,
                            supplierName: supplier.name,
                            materialId: item.rate.materialId,
                            materialName: item.rate.materialName,
                            materialType: item.rate.materialType,
                            currentRate: item.oldRate,
                            proposedRate: item.newRate
                          });
                        }
                      }
                      const refreshedReqs = await getSupplierRateRequests();
                      setRateRequests(refreshedReqs.filter(r => r.supplierId === supplier.id));
                      setSupplier(prev => (prev ? { ...prev, rates: updatedRates } : null));
                      toast({
                        title: "ریٹ اپ ڈیٹ کی درخواست بھیج دی گئی! ✅",
                        description: `${changedItems.length} سائز ریٹس کامیابی سے اپ ڈیٹ کے لیے بھیج دیے گئے۔`
                      });
                    }}
                  />
                ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-white text-sm">Your Current Price Catalog</h3>
                      <p className="text-xs text-slate-400">Update rates so we keep our billing fully in sync with your latest factory costs.</p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 bg-slate-950 p-1 rounded-lg border border-slate-800 self-stretch sm:self-auto justify-between sm:justify-start">
                      <span className="text-[10px] text-slate-400 font-bold px-2 uppercase tracking-wider">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-900 border-0 text-xs h-7 rounded px-2.5 text-white focus:ring-1 focus:ring-indigo-500 font-bold"
                      >
                        {!isRestrictedAccess && <option value="All">All Categories</option>}
                        {allowedCategoryOptions.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.labelEn}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800 max-h-[550px] overflow-y-auto">
                    {(filteredRates.length === 0) ? (
                      <div className="p-8 text-center text-slate-500 italic text-xs">
                        No products found under the "{categoryFilter}" category. Propose your first product under the "Propose New Stone" tab!
                      </div>
                    ) : (
                      filteredRates.map((rateObj) => {
                        const pendingReq = rateRequests.find(req => req.materialId === rateObj.materialId && req.status === 'pending');
                        const currentVal = editedRates[rateObj.id] !== undefined ? editedRates[rateObj.id] : (pendingReq ? pendingReq.proposedRate : rateObj.rate);
                        const isModified = currentVal !== rateObj.rate && (!pendingReq || currentVal !== pendingReq.proposedRate);
                                      const isPaused = rateObj.status === 'paused';
                        return (
                          <div key={rateObj.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isPaused ? 'bg-rose-950/15 border-l-4 border-l-rose-500' : 'hover:bg-slate-900/40'}`}>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold block ${isPaused ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                  {rateObj.materialName}
                                </span>
                                {isPaused ? (
                                  <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase px-1.5 h-4.5 rounded">
                                    🔴 Paused / Cancelled
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase px-1.5 h-4.5 rounded">
                                    🟢 Active
                                  </Badge>
                                )}
                                {pendingReq && (
                                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold uppercase py-0 px-1.5 h-4.5 rounded">
                                    Pending Review: PKR {pendingReq.proposedRate.toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-bold">
                                  {rateObj.materialType}
                                </span>
                                {rateObj.unit && (
                                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold">
                                    {rateObj.unit}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  Last modified: {rateObj.lastUpdated ? new Date(rateObj.lastUpdated).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-32 relative">
                                <span className="text-[10px] text-emerald-500 font-extrabold shrink-0">PKR</span>
                                <Input
                                  type="number"
                                  disabled={isPaused}
                                  value={currentVal}
                                  onChange={(e) => setEditedRates(prev => ({
                                    ...prev,
                                    [rateObj.id]: Number(e.target.value)
                                  }))}
                                  className="h-7 w-full p-0 bg-transparent border-0 focus-visible:ring-0 text-right text-xs font-bold text-white pr-1 disabled:opacity-50"
                                />
                                <span className="text-[9px] font-bold text-slate-500">/{rateObj.unit || 'sqft'}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {successRateId === rateObj.id ? (
                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 w-24 justify-end">
                                    <Check className="h-3.5 w-3.5 text-emerald-400 animate-bounce" /> Sent!
                                  </span>
                                ) : (
                                  <Button
                                    disabled={isPaused || !isModified || updatingRateId === rateObj.id}
                                    onClick={() => handleUpdateRate(rateObj)}
                                    size="sm"
                                    className={`text-[10px] h-7 px-2.5 font-extrabold ${
                                      isModified && !isPaused
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-800 cursor-not-allowed'
                                    }`}
                                  >
                                    {updatingRateId === rateObj.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      pendingReq ? 'Update' : 'Adjust Price'
                                    )}
                                  </Button>
                                )}

                                {/* Pause/Resume Action */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTogglePauseRate(rateObj)}
                                  className={`h-7 text-[10px] font-bold gap-1 px-2 border-slate-700 ${
                                    isPaused 
                                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border-emerald-500/20' 
                                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 border-amber-500/20'
                                  }`}
                                  title={isPaused ? "Resume supplying this product" : "Pause / cancel supplying this product"}
                                >
                                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                                </Button>

                                {/* Delete Product Action */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRate(rateObj)}
                                  className="h-7 w-7 p-0 bg-rose-950/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 shrink-0 flex items-center justify-center"
                                  title="Delete product rate link completely"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: PROPOSE NEW STONE FORM */}
            {activeTab === 'new-product' && (
              <motion.div
                key="new-product-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <form onSubmit={handleProposalSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-400" /> Offer / Propose a New Stone or Product
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Let us know of any new stock, marble, chemical, or materials arrivals. Once approved, we will list them on our showroom catalog linked to your supply rate.</p>
                  </div>

                  {isRestrictedAccess && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs">
                      <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-400 block">Restricted Upload Scope / محدود اپلوڈ رسائی</span>
                        <span className="text-[11px] text-slate-300">
                          آپ صرف مندرجہ ذیل کیٹگریز کے لیے مٹیریل اپلوڈ کر سکتے ہیں: {' '}
                          <strong className="text-white">{allowedCategoriesList.join(', ')}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {proposalSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <span className="text-xs font-bold text-emerald-400 block">Proposal Registered Successfully!</span>
                        <span className="text-[11px] text-slate-300">The showroom administration has been notified. This product will show in your submission log tab as 'Pending' until reviewed.</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    <div className="space-y-1.5">
                      <label className="text-slate-300 block font-medium">Material Type / Category (کیٹگری) *</label>
                      <select
                        value={newProductForm.materialType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProductForm(prev => ({ 
                            ...prev, 
                            materialType: val as any,
                            unit: getDefaultUnitForCategory(val)
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500 font-bold"
                      >
                        {allowedCategoryOptions.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.labelEn} ({cat.labelUr})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block font-medium">Pricing Unit *</label>
                      <select
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500 font-bold"
                      >
                        <option value="Square feet">Square feet (sq. ft.)</option>
                        <option value="Square meters">Square meters (sq. m.)</option>
                        <option value="Liters">Liters (chemicals)</option>
                        <option value="Kilograms">Kilograms (kg)</option>
                        <option value="Units">Units (standard item counts)</option>
                        <option value="Pieces">Pieces (pcs)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block font-medium">Stone Name / Product Name *</label>
                      <Input
                        required
                        placeholder="e.g. Ziarat Carrara Supreme, New Emerald Green"
                        value={newProductForm.productName}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, productName: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-xs h-9 text-white focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block font-medium">Wholesale Rate (Your Price to Us) *</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400 font-bold">PKR</span>
                        <Input
                          required
                          type="number"
                          placeholder={`Rate per ${newProductForm.unit}`}
                          value={newProductForm.rate}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, rate: e.target.value }))}
                          className="bg-slate-950 border-slate-800 text-xs h-9 text-white pl-12 pr-14 focus:border-indigo-500 font-bold"
                        />
                        <span className="absolute right-3 text-[10px] font-bold text-slate-500">/ {newProductForm.unit === 'Square feet' ? 'sq.ft.' : newProductForm.unit === 'Square meters' ? 'sq.m.' : newProductForm.unit.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 block font-medium">Origin</label>
                      <select
                        value={newProductForm.origin}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, origin: e.target.value as any }))}
                        className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500"
                      >
                        <option value="Local">Local (Pakistan)</option>
                        <option value="Imported">Imported</option>
                      </select>
                    </div>

                    {!['Abrasive', 'Chemical', 'Adhesive', 'Tool'].includes(newProductForm.materialType) && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-slate-300 block font-medium">Size Format Supplied</label>
                          <select
                            value={newProductForm.size}
                            onChange={(e) => setNewProductForm(prev => ({ ...prev, size: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500"
                          >
                            <option value="24&quot;">24&quot; Tiles / Slabs</option>
                            <option value="36&quot;">36&quot; Slabs</option>
                            <option value="Gangsaws">Gangsaw Size (Large Slabs)</option>
                            <option value="Counters">Counters / Strip Formats</option>
                            <option value="Slab">Custom Blocks / Slabs</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-300 block font-medium">Thickness (Sutar/mm)</label>
                          <select
                            value={newProductForm.thickness}
                            onChange={(e) => setNewProductForm(prev => ({ ...prev, thickness: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500"
                          >
                            <option value="4-Sutar">4-Sutar (Thin)</option>
                            <option value="6-Sutar">6-Sutar (Standard)</option>
                            <option value="8-Sutar">8-Sutar (Thick)</option>
                            <option value="12mm">12 mm</option>
                            <option value="15mm">15 mm</option>
                            <option value="18mm">18 mm</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-slate-300 block font-medium">Stone Description / Notes</label>
                      <Textarea
                        placeholder="Write dynamic features of this stone. e.g., 'Pure white base, high glass gloss polish, robust, excellent for stairs & countertops...'"
                        value={newProductForm.description}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-slate-950 border-slate-800 text-xs min-h-[70px] text-white focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-slate-300 block font-medium">Upload Product Photo (Optional)</label>
                      <div className="border border-dashed border-slate-800 hover:border-slate-700 transition-colors bg-slate-950/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-400 transition-colors mb-2" />
                        <span className="text-xs text-slate-300 font-semibold">
                          {newProductForm.imageFileName || 'Select or Drag & Drop Product Image'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">Accepts JPEG/PNG. Compressed automatically.</span>
                      </div>
                      {newProductForm.image && (
                        <div className="flex items-center gap-3 bg-slate-950 p-2.5 border border-slate-850 rounded-xl mt-2 w-max max-w-full">
                          <img src={newProductForm.image} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-slate-800" />
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Image Loaded & Compressed!
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={submittingProposal}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold h-9 px-6 gap-2"
                    >
                      {submittingProposal ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Registering Proposal...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Submit Product Offer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* TAB 3: PROPOSALS LOG / HISTORY */}
            {activeTab === 'proposals' && (
              <motion.div
                key="proposals-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/40">
                    <h3 className="font-semibold text-white text-sm">Product Proposal History</h3>
                    <p className="text-xs text-slate-400">Track and review the status of materials offered to Stone Expert.</p>
                  </div>

                  <div className="divide-y divide-slate-850">
                    {proposals.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 italic text-xs">
                        You have not submitted any product offers yet.
                      </div>
                    ) : (
                      proposals.map((prop) => (
                        <div key={prop.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                          <div className="flex items-start gap-3.5">
                            <img 
                              src={prop.imageUrl || "https://placehold.co/150?text=Stone"} 
                              alt={prop.productName} 
                              className="h-12 w-12 rounded-lg object-cover border border-slate-800"
                            />
                            <div>
                              <span className="text-xs font-bold text-white block">{prop.productName}</span>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px] text-slate-400">
                                <span className="bg-slate-800 px-1.5 py-0.5 rounded uppercase font-semibold">
                                  {prop.materialType}
                                </span>
                                <span>Size: {prop.size}</span>
                                <span>Thickness: {prop.thickness}</span>
                                <span>Submitted: {new Date(prop.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-850 pt-2 md:pt-0">
                            <div>
                              <span className="text-[10px] text-slate-400 block md:text-right">Offer Price</span>
                              <span className="text-xs font-bold text-indigo-400">PKR {prop.rate.toLocaleString()} /{prop.unit || 'sqft'}</span>
                            </div>

                            <div className="w-28 text-right">
                              {prop.status === 'pending' && (
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 gap-1 text-[10px] py-1">
                                  <Clock className="h-3 w-3 text-amber-400" /> Pending Review
                                </Badge>
                              )}
                              {prop.status === 'approved' && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 gap-1 text-[10px] py-1">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" /> Approved
                                </Badge>
                              )}
                              {prop.status === 'rejected' && (
                                <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 gap-1 text-[10px] py-1">
                                  <XCircle className="h-3 w-3 text-rose-400" /> Dismissed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 relative flex items-center justify-center rounded-full overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
            <Icons.logo alt="Stone Expert Logo" className="object-contain h-full w-full p-0.5" />
          </div>
          <span className="font-headline text-lg font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
        </Link>
        <p>© {new Date().getFullYear()} Stone Expert Twin Cities. All rights reserved.</p>
        <p className="mt-0.5">Authorized Vendor Portal. Securely encrypted and processed.</p>
      </footer>

    </div>
  );
}
