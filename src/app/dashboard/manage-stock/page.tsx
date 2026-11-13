'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  getMarbles, 
  updateMarbleDetails, 
  getFixingMaterials, 
  updateFixingMaterialFields,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getSupplierProposals,
  approveSupplierProposal,
  rejectSupplierProposal,
  getSupplierRateRequests,
  approveSupplierRateRequest,
  rejectSupplierRateRequest,
  createQuickSupplier,
  APP_PRODUCT_CATEGORIES,
  getHomepageConfig,
  updateProductSaleDiscount,
  applyBulkSaleDiscount,
  clearBulkSaleDiscount,
  applySupplierMarkupToApp,
  getAlMajeedRates
} from '@/lib/admin-actions';
import { SupplierRateSheetMatrix } from '@/components/supplier-rate-sheet-matrix';
import type { Marble, FixingMaterial } from '@/lib/types';
import type { Supplier, SupplierRate, SupplierProposal, SupplierRateRequest } from '@/lib/admin-actions';
import { getPublicOrigin, cn, formatSaleBadgeText } from '@/lib/utils';
import { 
  Plus, 
  Eye, 
  Trash2, 
  Edit, 
  User, 
  Phone, 
  MapPin, 
  ArrowRightLeft, 
  Search,
  Layers,
  Percent,
  Coins,
  Package,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  X,
  PlusCircle,
  Share2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Clipboard,
  DollarSign,
  Copy,
  Lock,
  Check,
  CheckSquare,
  Square,
  Send,
  Smartphone,
  Link2,
  ShieldCheck,
  KeyRound,
  Flame,
  Tag,
  Camera
} from 'lucide-react';

export default function ManageStockPage() {
  const { toast } = useToast();
  
  // High-level filter state
  const [productCategory, setProductCategory] = useState<'marbles' | 'fixing_materials' | 'on_sale'>('marbles');
  
  // Bulk Sale & Discount System States
  const [isBulkSaleModalOpen, setIsBulkSaleModalOpen] = useState(false);
  const [bulkSaleTarget, setBulkSaleTarget] = useState<string>('all');
  const [bulkSaleDiscount, setBulkSaleDiscount] = useState<number>(10);
  const [bulkSaleBadge, setBulkSaleBadge] = useState<string>('SPECIAL OFFER');

  // Single Product Sale/Discount Edit Modal State
  const [editingSaleProduct, setEditingSaleProduct] = useState<{
    id: string;
    name: string;
    type: 'marble' | 'fixing_material';
    price: number;
    onSale: boolean;
    discount: number;
    discountType: 'percentage' | 'fixed';
    saleBadgeText: string;
    heroHighlightOnSale?: boolean;
  } | null>(null);
  
  // Data States
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [fixingMaterials, setFixingMaterials] = useState<FixingMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [proposals, setProposals] = useState<SupplierProposal[]>([]);
  const [rateRequests, setRateRequests] = useState<SupplierRateRequest[]>([]);
  
  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active selected supplier in the supplier list
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form/Modal States for Supplier
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isViewSuppliersModalOpen, setIsViewSuppliersModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplierProducts, setViewingSupplierProducts] = useState<Supplier | null>(null);
  const [supplierProductsSearch, setSupplierProductsSearch] = useState('');
  const [isApplyingSupplierMarkup, setIsApplyingSupplierMarkup] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    accessPassword: '',
    status: 'active' as 'active' | 'inactive',
    materialsSupplied: [] as string[],
    allowedCategories: ['Marble', 'Granite'] as string[]
  });

  // Quick Add Supplier & Restricted Link Generation States
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('');
  const [quickAllowedCategories, setQuickAllowedCategories] = useState<string[]>(['Marble', 'Granite']);
  const [quickGeneratedResult, setQuickGeneratedResult] = useState<{
    supplier: Supplier;
    shareUrl: string;
    allowedCategories: string[];
  } | null>(null);
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);

  // Dynamic categories synced with global settings
  const [dynamicCategories, setDynamicCategories] = useState<{ id: string; labelEn: string; labelUr: string }[]>(() => APP_PRODUCT_CATEGORIES);
  
  // Global bulk rate change inputs
  const [bulkAdjustmentPercent, setBulkAdjustmentPercent] = useState<string>('10');

  // Share category states
  const [shareCategory, setShareCategory] = useState<string>('All');
  const [activeVendorShareCategory, setActiveVendorShareCategory] = useState<string>('All');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareTargetSupplierId, setShareTargetSupplierId] = useState<string>('');
  const [shareTargetCategory, setShareTargetCategory] = useState<string>('All');
  const [shareDomainMode, setShareDomainMode] = useState<'public' | 'custom' | 'dev'>('public');
  const [customShareDomain, setCustomShareDomain] = useState<string>('https://stoneexpert.net');

  // Quick Category Selection Handlers
  const handleToggleQuickCategory = (catId: string) => {
    setQuickAllowedCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleSelectAllCategories = () => {
    setQuickAllowedCategories(dynamicCategories.map(c => c.id));
  };

  const handleSelectStonesOnly = () => {
    setQuickAllowedCategories(['Marble', 'Granite', 'Limestone', 'Artificial Stone', '12x24 Tiles', 'Facade Stone']);
  };

  const handleSelectChemicalsOnly = () => {
    setQuickAllowedCategories(['Chemical', 'Adhesive', 'Abrasive', 'Tool']);
  };

  const handleClearAllCategories = () => {
    setQuickAllowedCategories([]);
  };

  // Quick Add Supplier Form Submit Handler
  const handleQuickAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) {
      toast({
        variant: "destructive",
        title: "Supplier Name Required / نام درج کریں",
        description: "Please enter the supplier / vendor name."
      });
      return;
    }
    if (!quickSupplierPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone Number Required / فون نمبر درج کریں",
        description: "Please enter the supplier's contact or WhatsApp phone number."
      });
      return;
    }
    if (quickAllowedCategories.length === 0) {
      toast({
        variant: "destructive",
        title: "Select Allowed Categories / کیٹگری منتخب کریں",
        description: "Please select at least one product category allowed for this supplier."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createQuickSupplier({
        name: quickSupplierName.trim(),
        phone: quickSupplierPhone.trim(),
        allowedCategories: quickAllowedCategories
      });

      if (res.success && res.supplier) {
        const primaryCat = (res.supplier.allowedCategories && res.supplier.allowedCategories.length === 1) 
          ? res.supplier.allowedCategories[0] 
          : 'All';
        const absoluteUrl = getVendorShareUrl(res.supplier.id, primaryCat, res.supplier.accessPassword);
        setQuickGeneratedResult({
          supplier: res.supplier,
          shareUrl: absoluteUrl,
          allowedCategories: res.supplier.allowedCategories || quickAllowedCategories
        });
        toast({
          title: "Supplier Created & Link Ready! 🔗",
          description: `سپلائر "${res.supplier.name}" کامیابی سے رجسٹر ہو گیا ہے اور مکمل پورٹل لنک تیار ہے۔`
        });
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Create Supplier",
          description: res.error || "سپلائر رجسٹر کرنے میں مسئلہ پیش آیا۔"
        });
      }
    } catch (err: any) {
      console.error("Error creating quick supplier:", err);
      toast({
        variant: "destructive",
        title: "Creation Error",
        description: err.message || "An unexpected error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute active base origin for external sharing
  const getActiveShareOrigin = () => {
    if (typeof window === 'undefined') return 'https://stoneexpert.net';
    if (shareDomainMode === 'custom' && customShareDomain.trim()) {
      return customShareDomain.trim().replace(/\/+$/, '');
    }
    // Return real working window origin directly so links work across all external devices
    return window.location.origin;
  };

  // Helper functions for vendor portal sharing
  const getVendorShareUrl = (supplierId: string, category: string = 'All', pin?: string) => {
    const origin = getActiveShareOrigin();
    const params = new URLSearchParams();
    if (category && category !== 'All') {
      params.set('category', category);
    }
    if (pin) {
      params.set('pin', pin);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `${origin}/supplier/${encodeURIComponent(supplierId)}${queryString}`;
  };

  const getUniversalVendorUrl = () => {
    return `${getActiveShareOrigin()}/supplier`;
  };

  const handleCopyVendorLink = (supplier: Supplier, category: string = 'All', includePin: boolean = true) => {
    const primaryCat = (supplier.allowedCategories && supplier.allowedCategories.length === 1) 
      ? supplier.allowedCategories[0] 
      : category;
    const password = supplier.accessPassword || '7861';
    const url = getVendorShareUrl(supplier.id, primaryCat, includePin ? password : undefined);
    navigator.clipboard.writeText(url);
    toast({
      title: "وینڈر پورٹل لنک کاپی ہو گیا! 📋",
      description: `Direct portal link for "${supplier.name}" copied to clipboard.`,
    });
  };

  const handleCopyUniversalLinkWithPassword = (supplier: Supplier) => {
    const universalUrl = getUniversalVendorUrl();
    const password = supplier.accessPassword || '7861';
    const textToCopy = `اسٹون ایکسپرٹ محفوظ سپلائر پورٹل:\n🔗 پورٹل لنک: ${universalUrl}\n🔑 آپ کا پاسورڈ / PIN: ${password}\n\nاس لنک کو کھولیں اور اپنا پن درج کر کے اپنے ماربل، اسٹاک اور ریٹس براہ راست اپلوڈ کریں۔`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "لنک اور پاسورڈ کاپی ہو گیا! 📋",
      description: `Universal portal link & PIN (${password}) copied to clipboard.`,
    });
  };

  const handleSendVendorWhatsApp = (supplier: Supplier, category: string = 'All') => {
    const universalUrl = getUniversalVendorUrl();
    const primaryCat = (supplier.allowedCategories && supplier.allowedCategories.length === 1) 
      ? supplier.allowedCategories[0] 
      : category;
    const password = supplier.accessPassword || '7861';
    
    // Direct link with PIN so recipient never gets locked out or encounters not found
    const autoUnlockUrl = getVendorShareUrl(supplier.id, primaryCat, password);
    const standardUrl = getVendorShareUrl(supplier.id, primaryCat);
    
    const allowedText = (supplier.allowedCategories && supplier.allowedCategories.length > 0 && !supplier.allowedCategories.includes('All'))
      ? `\n\nآپ کی رسائی مندرجہ ذیل کیٹگریز کے لیے مخصوص ہے:\n• ${supplier.allowedCategories.join('\n• ')}`
      : '';

    const text = `السلام علیکم ${supplier.name} صاحب،\n\nاسٹون ایکسپرٹ (Stone Expert) کا محفوظ سپلائر و وینڈر پورٹل:\n\n👉 براہِ راست 1-کلک لاگ ان لنک:\n${autoUnlockUrl}\n\n👉 یا سنگل پورٹل لنک:\n${universalUrl}\n🔑 آپ کا لاگ ان پاسورڈ / PIN: ${password}\n\n(سادہ ڈائریکٹ لنک: ${standardUrl})${allowedText}\n\nبراہ کرم اس لنک کو کھولیں اور اپنے تمام ریٹس، نیا ماربل و میٹریل اسٹاک اور تصاویر براہ راست اپلوڈ کریں۔\n\nشکریہ،\nاسٹون ایکسپرٹ مینجمنٹ`;
    
    const cleanPhone = (supplier.phone || '').replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.slice(1);
    }
    const waUrl = formattedPhone.length >= 10 
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Load all products, suppliers, and dynamic categories on mount
  useEffect(() => {
    fetchData();

    getHomepageConfig().then(cfg => {
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
    }).catch(e => console.error("Error loading category order in stock:", e));

    const handleCategoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const list = e.detail.map((cat: string) => {
          const existing = APP_PRODUCT_CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase());
          return {
            id: cat,
            labelEn: cat,
            labelUr: existing ? existing.labelUr : cat
          };
        });
        setDynamicCategories(list);
      }
    };
    const handleProductsSync = () => {
      fetchData();
    };
    window.addEventListener('category_order_updated', handleCategoryUpdate);
    window.addEventListener('products_updated', handleProductsSync);
    return () => {
      window.removeEventListener('category_order_updated', handleCategoryUpdate);
      window.removeEventListener('products_updated', handleProductsSync);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [marblesData, fixingData, suppliersData, proposalsData, rateRequestsData] = await Promise.all([
        getMarbles(),
        getFixingMaterials(),
        getSuppliers(),
        getSupplierProposals(),
        getSupplierRateRequests()
      ]);
      setMarbles(marblesData || []);
      setFixingMaterials(fixingData || []);
      setSuppliers(suppliersData || []);
      setProposals(proposalsData || []);
      setRateRequests(rateRequestsData || []);
      
      if (suppliersData && suppliersData.length > 0) {
        setSelectedSupplier(suppliersData[0]);
      }
    } catch (e: any) {
      console.error("Error loading stock data:", e);
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: "Failed to load product or supplier info from database."
      });
    } finally {
      setLoading(false);
    }
  };

  // Find all rates and suppliers for a specific material/variant combination
  const getMaterialSupplierRates = (materialId: string, variantId?: string) => {
    const targetId = variantId ? `${materialId}_${variantId}` : materialId;
    const results: { supplierName: string; rate: number; supplierId: string }[] = [];
    
    suppliers.forEach(sup => {
      if (sup.rates) {
        sup.rates.forEach(r => {
          if (r.materialId === targetId) {
            results.push({
              supplierName: sup.name,
              rate: r.rate,
              supplierId: sup.id
            });
          }
        });
      }
    });
    return results;
  };

  // Availability statuses mappings
  const formatStatusLabel = (status: string | undefined, inStockLegacy?: boolean) => {
    const s = status || (inStockLegacy !== false ? 'in_stock' : 'out_of_stock');
    switch (s) {
      case 'in_stock': return 'Available (Yes)';
      case 'out_of_stock': return 'No (Out of stock)';
      case 'incoming': return 'Incoming stock';
      case 'limited_stock': return 'Limited stock';
      case 'coming_soon': return 'Coming soon';
      default: return 'Available (Yes)';
    }
  };

  const getStatusBadgeClass = (status: string | undefined, inStockLegacy?: boolean) => {
    const s = status || (inStockLegacy !== false ? 'in_stock' : 'out_of_stock');
    switch (s) {
      case 'in_stock':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'limited_stock':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'coming_soon':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'incoming':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
      case 'out_of_stock':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  // Price Update Actions
  const handleMarblePriceUpdate = async (marbleId: string, variantId: string, newPrice: number) => {
    const marbleToUpdate = marbles.find(m => m.id === marbleId);
    if (!marbleToUpdate) return;
    
    const updatedVariants = marbleToUpdate.variants.map(v => {
      if (v.id === variantId) {
        return { ...v, price: newPrice };
      }
      return v;
    });

    try {
      const res = await updateMarbleDetails(marbleId, { variants: updatedVariants });
      if (res.success) {
        setMarbles(prev => prev.map(m => m.id === marbleId ? { ...m, variants: updatedVariants } : m));
        toast({
          title: "Price Updated",
          description: `Successfully updated retail price to PKR ${newPrice.toLocaleString()}`,
        });
      } else {
        throw new Error((res as any).error || "Failed to update price");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "An error occurred while updating the price."
      });
    }
  };

  const handleFixingMaterialPriceUpdate = async (materialId: string, newPrice: number) => {
    try {
      const res = await updateFixingMaterialFields(materialId, { price: newPrice });
      if (res.success) {
        setFixingMaterials(prev => prev.map(m => m.id === materialId ? { ...m, price: newPrice } : m));
        toast({
          title: "Price Updated",
          description: `Successfully updated price to PKR ${newPrice.toLocaleString()}`,
        });
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message || "An error occurred while updating fixing material price."
      });
    }
  };

  // Stock Status Toggles
  const handleMarbleStockStatusChange = async (marbleId: string, nextStatus: string) => {
    const isLegacyInStock = nextStatus === 'in_stock' || nextStatus === 'limited_stock' || nextStatus === 'incoming';
    try {
      const res = await updateMarbleDetails(marbleId, { 
        stockStatus: nextStatus,
        inStock: isLegacyInStock
      });
      if (res.success) {
        setMarbles(prev => prev.map(m => m.id === marbleId ? { ...m, stockStatus: nextStatus, inStock: isLegacyInStock } as any : m));
        toast({
          title: "Stock Status Updated",
          description: `Marble marked as "${formatStatusLabel(nextStatus)}".`
        });
      } else {
        throw new Error((res as any).error);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update marble stock status."
      });
    }
  };

  const handleFixingMaterialStockStatusChange = async (materialId: string, nextStatus: string) => {
    const isLegacyInStock = nextStatus === 'in_stock' || nextStatus === 'limited_stock' || nextStatus === 'incoming';
    try {
      const res = await updateFixingMaterialFields(materialId, { 
        stockStatus: nextStatus,
        inStock: isLegacyInStock
      });
      if (res.success) {
        setFixingMaterials(prev => prev.map(m => m.id === materialId ? { ...m, stockStatus: nextStatus, inStock: isLegacyInStock } as any : m));
        toast({
          title: "Stock Status Updated",
          description: `Fixing material marked as "${formatStatusLabel(nextStatus)}".`
        });
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update fixing material stock status."
      });
    }
  };

  // Visibility toggler
  const handleMarbleVisibilityToggle = async (marbleId: string, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    try {
      const res = await updateMarbleDetails(marbleId, { isHidden: nextHidden });
      if (res.success) {
        setMarbles(prev => prev.map(m => m.id === marbleId ? { ...m, isHidden: nextHidden } : m));
        toast({
          title: "Visibility Updated",
          description: `Marble is now ${nextHidden ? "hidden from" : "visible in"} storefront.`
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Toggle Failed",
        description: "Could not update marble visibility."
      });
    }
  };

  const handleFixingMaterialVisibilityToggle = async (materialId: string, currentHidden: boolean) => {
    const nextHidden = !currentHidden;
    try {
      const res = await updateFixingMaterialFields(materialId, { isHidden: nextHidden });
      if (res.success) {
        setFixingMaterials(prev => prev.map(m => m.id === materialId ? { ...m, isHidden: nextHidden } : m));
        toast({
          title: "Visibility Updated",
          description: `Fixing material is now ${nextHidden ? "hidden from" : "visible in"} storefront.`
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Toggle Failed",
        description: "Could not update visibility."
      });
    }
  };

  // Direct edit vendor price (adjustable rates in bottom product rows)
  const handleVendorRateChange = async (supplierId: string, productRowId: string, newRateValue: number) => {
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;

    const updatedRates = [...(sup.rates || [])];
    const rateIndex = updatedRates.findIndex(r => r.materialId === productRowId);

    if (rateIndex > -1) {
      updatedRates[rateIndex] = {
        ...updatedRates[rateIndex],
        rate: newRateValue,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Find name for the cost rate label
      let materialName = '';
      const parts = productRowId.split('_');
      const mId = parts[0];
      const vId = parts[1];

      if (vId) {
        const m = marbles.find(x => x.id === mId);
        const v = m?.variants.find(x => x.id === vId);
        materialName = `${m?.name || 'Marble'} - ${v?.size || ''} (${v?.thickness || ''})`;
      } else {
        const m = fixingMaterials.find(x => x.id === mId);
        materialName = m?.name || 'Fixing Material';
      }

      updatedRates.push({
        id: `rate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        materialId: productRowId,
        materialName,
        materialType: vId ? 'marble' : 'fixing_material',
        rate: newRateValue,
        lastUpdated: new Date().toISOString()
      });
    }

    try {
      const res = await saveSupplier({ ...sup, rates: updatedRates });
      if (res.success) {
        setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, rates: updatedRates } : s));
        toast({
          title: "Vendor Rate Adjusted",
          description: `Saved cost of PKR ${newRateValue.toLocaleString()} for ${sup.name}`,
        });
      }
    } catch (err) {
      console.error("Failed to update supplier rate:", err);
    }
  };

  // Delete vendor rate directly from product row
  const handleDeleteVendorRate = async (supplierId: string, productRowId: string) => {
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;

    const updatedRates = (sup.rates || []).filter(r => r.materialId !== productRowId);
    try {
      const res = await saveSupplier({ ...sup, rates: updatedRates });
      if (res.success) {
        setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, rates: updatedRates } : s));
        toast({
          title: "Vendor Link Removed",
          description: `Removed cost rate comparison for ${sup.name}`,
        });
      }
    } catch (err) {
      console.error("Failed to remove supplier rate:", err);
    }
  };

  // Global Bulk Price Adjustment Feature
  const handleBulkSellingPriceAdjustment = async (direction: 'increase' | 'decrease') => {
    const percent = parseFloat(bulkAdjustmentPercent);
    if (isNaN(percent) || percent <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Percentage",
        description: "Please enter a valid numeric percentage greater than 0%."
      });
      return;
    }

    const confirmMsg = `Are you sure you want to ${direction === 'increase' ? 'increase' : 'decrease'} ALL selling rates by ${percent}%? This will instantly modify your entire product database.`;
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    const multiplier = direction === 'increase' ? (1 + percent / 100) : (1 - percent / 100);
    let successCount = 0;

    try {
      // 1. Bulk adjust marbles
      for (const m of marbles) {
        const originalVariantsStr = JSON.stringify(m.variants);
        const adjustedVariants = m.variants.map(v => {
          const oldPrice = v.price || 0;
          return { ...v, price: Math.round(oldPrice * multiplier) };
        });

        if (JSON.stringify(adjustedVariants) !== originalVariantsStr) {
          const res = await updateMarbleDetails(m.id, { variants: adjustedVariants });
          if (res.success) {
            successCount += m.variants.length;
          }
        }
      }

      // 2. Bulk adjust fixing materials
      for (const fm of fixingMaterials) {
        const oldPrice = fm.price || 0;
        const newPrice = Math.round(oldPrice * multiplier);
        if (newPrice !== oldPrice) {
          const res = await updateFixingMaterialFields(fm.id, { price: newPrice });
          if (res.success) {
            successCount++;
          }
        }
      }

      toast({
        title: "Bulk Adjust Done",
        description: `Successfully modified ${successCount} prices ${direction === 'increase' ? 'upwards' : 'downwards'} by ${percent}%.`
      });
      
      // Refresh database to sync UI perfectly
      fetchData();
    } catch (err: any) {
      console.error("Global pricing update failed:", err);
      toast({
        variant: "destructive",
        title: "Bulk Update Failed",
        description: "An error occurred while bulk updating prices."
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Supplier Proposals Handlers
  const handleApproveProposalClick = async (proposalId: string) => {
    setSubmitting(true);
    try {
      const res = await approveSupplierProposal(proposalId);
      if (res.success) {
        toast({
          title: "Proposal Approved Successfully!",
          description: "New product has been generated in the database and linked to this wholesaler.",
        });
        // Refresh all data
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Approval Failed",
          description: res.error || "An error occurred during approval.",
        });
      }
    } catch (e: any) {
      console.error("Error approving:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectProposalClick = async (proposalId: string) => {
    setSubmitting(true);
    try {
      const res = await rejectSupplierProposal(proposalId);
      if (res.success) {
        toast({
          title: "Proposal Dismissed",
          description: "The product offer has been rejected.",
        });
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Dismissal Failed",
          description: res.error || "An error occurred.",
        });
      }
    } catch (e: any) {
      console.error("Error dismissing:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Full Supplier Register / Edit Form Submit
  const handleSupplierFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updatedSupplier = {
        ...supplierForm,
        id: editingSupplier?.id || undefined, 
        rates: editingSupplier?.rates || []
      };
      
      const res = await saveSupplier(updatedSupplier);
      if (res.success) {
        toast({
          title: editingSupplier?.id ? "Supplier Updated" : "Supplier Registered",
          description: `Supplier "${supplierForm.name}" has been registered successfully.`
        });
        setIsSupplierModalOpen(false);
        fetchData();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Supplier",
        description: error.message || "Failed to update supplier."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    const randomPin = `${Math.floor(1000 + Math.random() * 9000)}`;
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      accessPassword: randomPin,
      status: 'active',
      materialsSupplied: ['marble'],
      allowedCategories: ['Marble', 'Granite']
    });
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      accessPassword: sup.accessPassword || '7861',
      status: sup.status || 'active',
      materialsSupplied: sup.materialsSupplied || [],
      allowedCategories: sup.allowedCategories && sup.allowedCategories.length > 0 
        ? sup.allowedCategories 
        : ['Marble', 'Granite']
    });
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier? This cannot be undone.")) return;
    try {
      const res = await deleteSupplier(id);
      if (res.success) {
        toast({
          title: "Supplier Deleted",
          description: "Supplier deleted from database."
        });
        fetchData();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting",
        description: "Could not delete supplier."
      });
    }
  };

  // Sale and Discount Handlers
  const handleSaveProductSale = async (data: {
    productId: string;
    type: 'marble' | 'fixing_material';
    onSale: boolean;
    discount: number;
    discountType: 'percentage' | 'fixed';
    saleBadgeText?: string;
    heroHighlightOnSale?: boolean;
  }) => {
    setSubmitting(true);
    try {
      const res = await updateProductSaleDiscount(data.productId, data.type, {
        onSale: data.onSale,
        discount: data.discount,
        discountType: data.discountType,
        saleBadgeText: data.saleBadgeText,
        heroHighlightOnSale: data.heroHighlightOnSale !== undefined ? data.heroHighlightOnSale : true
      });
      if (res.success) {
        toast({
          title: "Sale Updated / سیل سیو ہو گئی",
          description: `Product sale status successfully saved.`
        });
        if (data.type === 'marble') {
          setMarbles(prev => prev.map(m => m.id === data.productId ? {
            ...m,
            onSale: data.onSale,
            discount: data.discount,
            discountType: data.discountType,
            saleBadgeText: data.saleBadgeText,
            heroHighlightOnSale: data.heroHighlightOnSale !== undefined ? data.heroHighlightOnSale : true
          } : m));
        } else {
          setFixingMaterials(prev => prev.map(fm => fm.id === data.productId ? {
            ...fm,
            onSale: data.onSale,
            discount: data.discount,
            discountType: data.discountType,
            saleBadgeText: data.saleBadgeText,
            heroHighlightOnSale: data.heroHighlightOnSale !== undefined ? data.heroHighlightOnSale : true
          } : fm));
        }
        setEditingSaleProduct(null);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Update",
          description: (res as any).error || "Could not update sale/discount."
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "An unexpected error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyBulkSale = async () => {
    setSubmitting(true);
    try {
      const res = await applyBulkSaleDiscount({
        target: bulkSaleTarget,
        discountPercent: bulkSaleDiscount,
        saleBadgeText: bulkSaleBadge
      });
      if (res.success) {
        toast({
          title: "Bulk Sale Applied / بلک ڈسکاؤنٹ لاگو ہو گیا",
          description: `Applied ${bulkSaleDiscount}% discount across ${(res as any).updatedCount || 'selected'} items.`
        });
        const [freshMarbles, freshFixing] = await Promise.all([
          getMarbles(),
          getFixingMaterials()
        ]);
        setMarbles(freshMarbles);
        setFixingMaterials(freshFixing);
        setIsBulkSaleModalOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Apply",
          description: (res as any).error || "Could not apply bulk sale."
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "An unexpected error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearBulkSale = async () => {
    setSubmitting(true);
    try {
      const res = await clearBulkSaleDiscount({ target: bulkSaleTarget });
      if (res.success) {
        toast({
          title: "Sale Cleared / ڈسکاؤنٹ ختم کر دیا گیا",
          description: `Reset sale status on ${(res as any).clearedCount || 'selected'} items.`
        });
        const [freshMarbles, freshFixing] = await Promise.all([
          getMarbles(),
          getFixingMaterials()
        ]);
        setMarbles(freshMarbles);
        setFixingMaterials(freshFixing);
        setIsBulkSaleModalOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Clear",
          description: (res as any).error || "Could not clear sale."
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "An unexpected error occurred."
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare product rows for unified listing
  const getProductRows = (): {
    rowId: string;
    productId: string;
    variantId?: string;
    name: string;
    baseName: string;
    type: 'marble' | 'fixing_material';
    imageUrl: string;
    availability: string;
    price: number;
    isHidden: boolean;
    onSale: boolean;
    discount: number;
    discountType: 'percentage' | 'fixed';
    saleBadgeText: string;
    category: string;
  }[] => {
    const list: any[] = [];

    // Marbles
    marbles.forEach(m => {
      const fallbackUrl = `https://placehold.co/150?text=${encodeURIComponent(m.name)}`;
      const imageUrl = (m.imageUrl && m.imageUrl.trim() !== '') ? m.imageUrl : fallbackUrl;
      const availability = (m as any).stockStatus || ((m as any).inStock !== false ? 'in_stock' : 'out_of_stock');
      const isHidden = !!m.isHidden;
      const onSale = !!m.onSale;
      const discount = typeof m.discount === 'number' ? m.discount : 0;
      const discountType = m.discountType || 'percentage';
      const saleBadgeText = m.saleBadgeText || '';
      const heroHighlightOnSale = m.heroHighlightOnSale !== false;
      const category = m.category || m.materialType || 'Marble';

      const type = 'marble';

      if (m.variants && m.variants.length > 0) {
        m.variants.forEach(v => {
          list.push({
            rowId: `${m.id}_${v.id}`,
            productId: m.id,
            variantId: v.id,
            name: `${m.name} - ${v.size} (${v.thickness})`,
            baseName: m.name,
            type,
            imageUrl,
            availability,
            price: v.price || 0,
            isHidden,
            onSale,
            discount,
            discountType,
            saleBadgeText,
            heroHighlightOnSale,
            category
          });
        });
      } else {
        list.push({
          rowId: m.id,
          productId: m.id,
          name: m.name,
          baseName: m.name,
          type,
          imageUrl,
          availability,
          price: 0,
          isHidden,
          onSale,
          discount,
          discountType,
          saleBadgeText,
          heroHighlightOnSale,
          category
        });
      }
    });

    // Fixing Materials
    fixingMaterials.forEach(fm => {
      const fallbackUrl = `https://placehold.co/150?text=${encodeURIComponent(fm.name)}`;
      const imageUrl = (fm.imageUrl && fm.imageUrl.trim() !== '') ? fm.imageUrl : fallbackUrl;
      const availability = (fm as any).stockStatus || (fm.isFeatured !== false ? 'in_stock' : 'out_of_stock');
      const isHidden = !!(fm as any).isHidden;
      const onSale = !!(fm as any).onSale;
      const discount = typeof (fm as any).discount === 'number' ? (fm as any).discount : 0;
      const discountType = (fm as any).discountType || 'percentage';
      const saleBadgeText = (fm as any).saleBadgeText || '';
      const heroHighlightOnSale = (fm as any).heroHighlightOnSale !== false;
      const category = fm.category || 'Chemical & Tools';

      list.push({
        rowId: fm.id,
        productId: fm.id,
        name: fm.name,
        baseName: fm.name,
        type: 'fixing_material',
        imageUrl,
        availability,
        price: fm.price || 0,
        isHidden,
        onSale,
        discount,
        discountType,
        saleBadgeText,
        heroHighlightOnSale,
        category
      });
    });

    return list;
  };

  // Filter & Search rows
  const allRows = getProductRows();
  const filteredRows = allRows.filter(row => {
    // Category Filter
    if (productCategory === 'marbles' && row.type !== 'marble') return false;
    if (productCategory === 'fixing_materials' && row.type !== 'fixing_material') return false;
    if (productCategory === 'on_sale' && !row.onSale && (!row.discount || row.discount <= 0)) return false;

    // Search query
    const matchSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        row.baseName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-7xl mx-auto w-full bg-background min-h-screen">
      
      {/* 1. Unifed Elegant Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border/60">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary animate-pulse" />
            Stock & Logistics Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A single, comprehensive workspace to adjust selling prices, control stock availability, and compare all vendor cost sheets.
          </p>
        </div>

        {/* Dynamic Vendor Count Header & Quick Register Trigger */}
        <div className="flex flex-wrap items-center gap-2 bg-muted p-1.5 rounded-xl border border-border/60">
          <div className="px-3 py-1.5 text-xs font-extrabold text-foreground flex items-center gap-1.5">
            <User className="h-4 w-4 text-indigo-500" />
            {suppliers.length} Registered Vendors
          </div>
          <Button
            onClick={() => {
              const alMajeed = suppliers.find(
                s => s.id === 'al-majeed-marble-granite-factory' || (s.name || '').toLowerCase().includes('al majeed')
              );
              if (alMajeed) {
                setViewingSupplierProducts(alMajeed);
              }
              setIsViewSuppliersModalOpen(true);
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all cursor-pointer ring-1 ring-amber-400/50"
          >
            <span>📄 المجد ریٹ شیٹ (24&quot; | 36&quot; | 48&quot; | 52&quot; | Gangsaw)</span>
          </Button>
          <Button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-admin-ai-scanner'));
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer ring-1 ring-indigo-400/40"
          >
            <Camera className="h-3.5 w-3.5 text-amber-200" />
            AI ریٹ لسٹ اسکینر (Scan Supplier Rate Image)
          </Button>
          <Button 
            onClick={() => {
              setQuickSupplierName('');
              setQuickSupplierPhone('');
              setQuickAllowedCategories(['Marble', 'Granite']);
              setQuickGeneratedResult(null);
              setCopiedQuickLink(false);
              setIsQuickAddModalOpen(true);
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer ring-1 ring-emerald-400/30"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-100" />
            Quick Add & Generate Link / نیا سپلائر و لنک
          </Button>
          <Button 
            onClick={() => {
              if (suppliers.length > 0) {
                setShareTargetSupplierId(suppliers[0].id);
              }
              setIsShareModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Link / سپلائر لنک
          </Button>
          <Button 
            onClick={openAddSupplierModal}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-xs bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Full Form
          </Button>
          <Button 
            onClick={() => setIsViewSuppliersModalOpen(true)}
            size="sm"
            variant="outline"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 border-indigo-200 hover:bg-indigo-50 text-indigo-700 transition-all cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            View Directory ({suppliers.length})
          </Button>
        </div>
      </div>

      {/* 1.5 PENDING SUPPLIER PROPOSALS NOTIFICATION BOX */}
      {proposals.filter(p => p.status === 'pending').length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                📬 Pending Supplier Proposals & Stone Offers
              </h2>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-850 border-amber-300 font-extrabold text-[10px] py-0.5 px-2 rounded-full">
              {proposals.filter(p => p.status === 'pending').length} Action Required
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.filter(p => p.status === 'pending').map((prop) => (
              <div key={prop.id} className="bg-background border border-border/80 hover:border-indigo-300 transition-all rounded-xl p-3 flex flex-col justify-between gap-3 text-xs shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-foreground text-sm block truncate">{prop.productName}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                        By <strong className="text-indigo-650">{prop.supplierName}</strong>
                      </span>
                    </div>
                    {prop.imageUrl && (
                      <img 
                        src={prop.imageUrl} 
                        alt={prop.productName} 
                        className="h-10 w-10 object-cover rounded-md border border-border/40 shrink-0 bg-muted"
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-2 rounded-lg text-[10px] text-muted-foreground font-semibold">
                    <div>Type: <span className="text-foreground font-bold block">{prop.materialType}</span></div>
                    <div>Origin: <span className="text-foreground font-bold block">{prop.origin}</span></div>
                    <div>Format: <span className="text-foreground font-bold block">{prop.size}</span></div>
                    <div>Thickness: <span className="text-foreground font-bold block">{prop.thickness}</span></div>
                  </div>
                  
                  {prop.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed bg-muted/20 p-1.5 rounded border border-border/20">
                      {prop.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/25 mt-1">
                  <div>
                    <span className="text-[9px] text-muted-foreground font-semibold block leading-none mb-0.5">Wholesale Rate</span>
                    <span className="text-xs font-black text-emerald-600">PKR {prop.rate.toLocaleString()} /sqft</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectProposalClick(prop.id)}
                      className="h-8 text-[10px] font-extrabold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 rounded-lg"
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveProposalClick(prop.id)}
                      className="h-8 text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-3 gap-1 rounded-lg"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENDING SUPPLIER RATE ADJUSTMENT REQUESTS */}
      {rateRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 space-y-4 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                📈 Pending Supplier Rate Adjustment Requests
              </h2>
            </div>
            <Badge variant="outline" className="bg-indigo-100 text-indigo-850 border-indigo-300 font-extrabold text-[10px] py-0.5 px-2 rounded-full">
              {rateRequests.filter(r => r.status === 'pending').length} Needs Review
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rateRequests.filter(r => r.status === 'pending').map((req) => (
              <div key={req.id} className="bg-background border border-border/80 hover:border-indigo-300 transition-all rounded-xl p-3 flex flex-col justify-between gap-3 text-xs shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-extrabold text-foreground text-sm block truncate">{req.materialName}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                        Supplier: <strong className="text-indigo-650">{req.supplierName}</strong>
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/40 p-2.5 rounded-lg text-[10px] text-muted-foreground font-semibold space-y-1">
                    <div>Type: <span className="text-foreground font-bold capitalize">{req.materialType}</span></div>
                    <div className="flex justify-between">
                      <span>Current: <strong className="text-foreground">PKR {req.currentRate.toLocaleString()}</strong></span>
                      <span>Proposed: <strong className="text-indigo-600 font-extrabold">PKR {req.proposedRate.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/25 mt-1">
                  <Link href={`/dashboard/manage-stock/supplier/${req.supplierId}`} className="w-full">
                    <Button
                      size="sm"
                      className="w-full h-8 text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1"
                    >
                      Go to Supplier Profile & Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. PRICE & LOGISTICS CONTROL BAR (Bulk actions, filter categories, search) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        
        {/* Left: Interactive Category Picker & Search */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Category Tags */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/20 shrink-0">
              <button 
                onClick={() => setProductCategory('marbles')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${productCategory === 'marbles' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Marble and granite
              </button>
              <button 
                onClick={() => setProductCategory('fixing_materials')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${productCategory === 'fixing_materials' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Chemical and tool
              </button>
              <button 
                onClick={() => setProductCategory('on_sale')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  productCategory === 'on_sale' 
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-xs' 
                    : 'text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${productCategory === 'on_sale' ? 'fill-amber-300 text-amber-200 animate-bounce' : 'text-red-500 fill-red-500 animate-pulse'}`} />
                <span>Sale & Discount</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  productCategory === 'on_sale' ? 'bg-white/25 text-white' : 'bg-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {allRows.filter(r => r.onSale || (r.discount && r.discount > 0)).length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="search-products-unified"
                placeholder="Search stone name, brand, format..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 border-border/60 bg-background rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Quick List of Registered Vendors with Quick Edit triggers */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Supplier Directory:</span>
            {suppliers.map(s => (
              <Badge 
                key={s.id} 
                variant="outline" 
                className="text-[10px] font-semibold py-0.5 px-2 bg-muted/30 border-border flex items-center gap-1 hover:border-indigo-400 cursor-pointer transition-all"
                onClick={() => openEditSupplierModal(s)}
              >
                {s.name}
                <Edit className="h-2.5 w-2.5 text-muted-foreground" />
              </Badge>
            ))}
            {suppliers.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No suppliers registered. Click Add Supplier to compare rates.</span>
            )}
          </div>
        </div>

        {/* Right: PERCENTAGE MARKUP / GLOBAL PRICE ADJUSTER */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5 mb-1">
              <Percent className="h-4 w-4 text-primary" />
              Global Selling Rate Adjuster
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Adjust our entire inventory selling rate up or down instantly by a specified percentage.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex items-center w-24 shrink-0">
              <Input 
                type="number"
                value={bulkAdjustmentPercent}
                onChange={(e) => setBulkAdjustmentPercent(e.target.value)}
                placeholder="e.g. 10"
                className="h-9 w-full pr-7 font-extrabold text-xs text-center border-border/80 bg-background"
              />
              <span className="absolute right-2.5 text-xs text-muted-foreground font-bold">%</span>
            </div>

            <Button 
              id="bulk-increase-btn"
              disabled={submitting}
              onClick={() => handleBulkSellingPriceAdjustment('increase')}
              className="flex-1 h-9 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              Add Markup 📈
            </Button>
            
            <Button 
              id="bulk-decrease-btn"
              disabled={submitting}
              onClick={() => handleBulkSellingPriceAdjustment('decrease')}
              variant="outline"
              className="flex-1 h-9 text-xs font-extrabold border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700 gap-1"
            >
              Reduce Price 📉
            </Button>
          </div>
        </div>

      </div>

      {/* 3. COMPACT PRODUCT LEDGER (Unified workspace) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/40">
          <h3 className="font-headline text-sm font-extrabold text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Active Inventory Ledger ({filteredRows.length} formats loaded)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsBulkSaleModalOpen(true)}
              size="sm"
              className="h-8 px-3 text-xs font-black bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-sm gap-1.5 cursor-pointer rounded-lg border-0"
            >
              <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-200 animate-pulse" />
              <span>Bulk Sale & Discount / بلک سیل و رعایت</span>
            </Button>
            <Button onClick={fetchData} variant="ghost" size="sm" className="text-xs h-7 gap-1 hover:text-primary font-bold">
              🔄 Sync Fresh Data
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted-foreground flex flex-col items-center justify-center gap-3 bg-muted/10 border border-dashed rounded-xl">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="font-medium text-xs">Synchronizing sheets with Cloud Firestore...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground italic text-xs border border-dashed rounded-xl bg-muted/10">
            No products matching your filters or search. Try searching for other terms.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredRows.map((row) => {
              // Find registered supplier comparison rates for this specific product row id
              const currentRates = getMaterialSupplierRates(row.productId, row.variantId);
              
              // We'll create inline sub-tab selector state for each product row
              // To handle this in a React function without creating massive files, we'll store active subtab in local react component wrapper state or dynamic object
              return (
                <RowComponent 
                  key={row.rowId} 
                  row={row}
                  currentRates={currentRates}
                  suppliers={suppliers}
                  getStatusBadgeClass={getStatusBadgeClass}
                  handleMarbleStockStatusChange={handleMarbleStockStatusChange}
                  handleFixingMaterialStockStatusChange={handleFixingMaterialStockStatusChange}
                  handleMarblePriceUpdate={handleMarblePriceUpdate}
                  handleFixingMaterialPriceUpdate={handleFixingMaterialPriceUpdate}
                  handleMarbleVisibilityToggle={handleMarbleVisibilityToggle}
                  handleFixingMaterialVisibilityToggle={handleFixingMaterialVisibilityToggle}
                  handleVendorRateChange={handleVendorRateChange}
                  handleDeleteVendorRate={handleDeleteVendorRate}
                  categories={dynamicCategories}
                  onEditSale={(r) => {
                    setEditingSaleProduct({
                      id: r.productId,
                      name: r.name,
                      type: r.type,
                      price: r.price,
                      onSale: r.onSale,
                      discount: r.discount || 0,
                      discountType: r.discountType || 'percentage',
                      saleBadgeText: r.saleBadgeText || '',
                      heroHighlightOnSale: r.heroHighlightOnSale !== false
                    });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 0. QUICK ADD SUPPLIER & GENERATE RESTRICTED LINK DIALOG */}
      <Dialog 
        open={isQuickAddModalOpen} 
        onOpenChange={(open) => {
          setIsQuickAddModalOpen(open);
          if (!open) {
            setQuickGeneratedResult(null);
            setCopiedQuickLink(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-1">
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Quick Add Supplier & Generate Access Link / نیا سپلائر و مخصوص لنک
            </DialogTitle>
            <DialogDescription className="text-xs">
              سپلائر کا صرف نام اور فون نمبر لکھیں اور جن کیٹگریز کی رسائی دینا چاہتے ہیں وہ منتخب کر کے فوری طور پر مخصوص اپلوڈ لنک حاصل کریں۔
            </DialogDescription>
          </DialogHeader>

          {quickGeneratedResult ? (
            /* GENERATED LINK SUCCESS VIEW */
            <div className="space-y-4 py-3 overflow-y-auto pr-1">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>سپلائر کامیابی سے شامل ہو گیا اور مخصوص لنک تیار ہے!</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Supplier:</strong> {quickGeneratedResult.supplier.name}</p>
                  <p><strong>Phone / WhatsApp:</strong> {quickGeneratedResult.supplier.phone}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <strong className="text-foreground">لاگ ان PIN / Password:</strong>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-xs">
                      {quickGeneratedResult.supplier.accessPassword || '7861'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <strong className="text-foreground">مجاز کیٹگریز (Allowed Scope):</strong>
                    {quickGeneratedResult.allowedCategories.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Lock className="h-2.5 w-2.5 mr-1" /> {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Universal Portal Link & PIN Box */}
              <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                    سنگل پورٹل لنک و پن (Universal Link & PIN):
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">سب کے لیے ایک ہی لنک</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={`${getPublicOrigin()}/supplier`} 
                    className="h-10 text-xs font-mono bg-background text-foreground"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyUniversalLinkWithPassword(quickGeneratedResult.supplier)}
                    className="h-10 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link & PIN
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ہر سپلائر کو یہ لنک دیں اور ساتھ اس کا پاسورڈ (<span className="font-mono font-bold text-amber-600 dark:text-amber-400">{quickGeneratedResult.supplier.accessPassword || '7861'}</span>) فراہم کریں، وہ خود بخود اپنے اکاؤنٹ میں کھل جائے گا۔
                </p>
              </div>

              {/* Direct Link Box */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span>سپلائر کا پورٹل لنک (Direct Supplier Portal URL):</span>
                  <span className="text-[10px] text-muted-foreground">صرف انہی کیٹگریز کے لیے فعال</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={quickGeneratedResult.shareUrl} 
                    className="h-10 text-xs font-mono bg-muted text-foreground selection:bg-indigo-500 selection:text-white"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(quickGeneratedResult.shareUrl);
                      setCopiedQuickLink(true);
                      toast({
                        title: "Link Copied! 📋",
                        description: `Portal link for "${quickGeneratedResult.supplier.name}" copied to clipboard.`
                      });
                      setTimeout(() => setCopiedQuickLink(false), 3000);
                    }}
                    className={`h-10 px-4 text-xs font-bold text-white shrink-0 gap-1.5 transition-all cursor-pointer ${
                      copiedQuickLink ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {copiedQuickLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedQuickLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>

              {/* 1-Click WhatsApp Send */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => handleSendVendorWhatsApp(quickGeneratedResult.supplier)}
                  className="h-11 flex-1 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  Send to Supplier via WhatsApp (1-Click)
                </Button>

                <Link href={quickGeneratedResult.shareUrl} target="_blank">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4 text-xs font-bold border-slate-300 dark:border-slate-700 gap-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Portal View
                  </Button>
                </Link>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" /> رسائی کا طریقہ کار (Access Policy):
                </p>
                <p>جب سپلائر یہ لنک کھولے گا تو وہ صرف اوپر دی گئی منتخب کردہ کیٹگریز کے اندر ہی مٹیریل، تصاویر، سائز اور ہول سیل ریٹس درج کر سکے گا۔ دیگر کیٹگریز کے لیے اس کی رسائی محدود ہو گی۔</p>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickSupplierName('');
                    setQuickSupplierPhone('');
                    setQuickAllowedCategories(['Marble', 'Granite']);
                    setQuickGeneratedResult(null);
                    setCopiedQuickLink(false);
                  }}
                  className="text-xs font-bold"
                >
                  + Add Another Supplier (ایک اور سپلائر شامل کریں)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="bg-slate-800 text-white text-xs"
                >
                  Done / مکمل
                </Button>
              </div>
            </div>
          ) : (
            /* QUICK INPUT FORM */
            <form onSubmit={handleQuickAddSupplierSubmit} className="space-y-4 py-2 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quick_name" className="text-xs font-bold">
                    سپلائر کا نام (Supplier / Wholesaler Name) *
                  </Label>
                  <Input 
                    id="quick_name"
                    value={quickSupplierName}
                    onChange={(e) => setQuickSupplierName(e.target.value)}
                    placeholder="مثال: مکہ ماربل فیکٹری / Al-Makkah Marble"
                    required
                    className="h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quick_phone" className="text-xs font-bold">
                    فون یا واٹس ایپ نمبر (Phone / WhatsApp) *
                  </Label>
                  <Input 
                    id="quick_phone"
                    value={quickSupplierPhone}
                    onChange={(e) => setQuickSupplierPhone(e.target.value)}
                    placeholder="مثال: 03001234567"
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* CATEGORY ALLOW SYSTEM / مجاز کیٹگریز کا انتخاب */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-indigo-500" />
                      الاؤ کیٹگریز کا انتخاب (Allowed Product Categories System) *
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      وہ مٹیریل منتخب کریں جنہیں یہ سپلائر اپلوڈ کرنے کا مجاز ہوگا:
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-extrabold w-max">
                    {quickAllowedCategories.length} Categories Allowed
                  </Badge>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 py-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCategories}
                    className="h-6 text-[10px] px-2 font-bold"
                  >
                    Select All (تمام کیٹگریز)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectStonesOnly}
                    className="h-6 text-[10px] px-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Stones Only (ماربل و گرینائٹ)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectChemicalsOnly}
                    className="h-6 text-[10px] px-2 font-bold text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    Fixings Only (کیمیکل و ٹولز)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllCategories}
                    className="h-6 text-[10px] px-2 text-muted-foreground"
                  >
                    Clear (صاف کریں)
                  </Button>
                </div>

                {/* Categories Grid Checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/20">
                  {dynamicCategories.map((cat) => {
                    const isSelected = quickAllowedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleQuickCategory(cat.id)}
                        className={`p-2 rounded-lg border text-left transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground shadow-xs'
                            : 'bg-background border-border/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-border bg-muted/40'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block truncate leading-tight">
                            {cat.labelEn}
                          </span>
                          <span className="text-[9px] text-muted-foreground block truncate mt-0.5">
                            {cat.labelUr}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="h-9 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={submitting} 
                  className="h-9 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {submitting ? 'Generating Link...' : 'Generate Restricted Link & Save (مخصوص لنک بنائیں)'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SUPPLIER SETUP DIALOG (FULL FORM) */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-1.5">
              <User className="h-5 w-5 text-indigo-500" />
              {editingSupplier ? "Edit Supplier Contract" : "Register New Wholesaler / Quarry"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure name, phone, allowed categories, and address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSupplierFormSubmit} className="space-y-4 py-2 overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label htmlFor="sup_name" className="text-xs font-bold">Supplier/Entity Name *</Label>
              <Input 
                id="sup_name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Shalimar Marble Quarry"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sup_contact" className="text-xs font-bold">Contact Person</Label>
                <Input 
                  id="sup_contact"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  placeholder="e.g. Bilal Khan"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup_phone" className="text-xs font-bold">Phone Number *</Label>
                <Input 
                  id="sup_phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="e.g. 0300 1234567"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Allowed Categories System in Full Form */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-500" />
                Allowed Categories for Portal Upload (الاؤ کیٹگریز)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/20">
                {dynamicCategories.map((cat) => {
                  const isSelected = (supplierForm.allowedCategories || []).includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const current = supplierForm.allowedCategories || [];
                        const updated = current.includes(cat.id)
                          ? current.filter(c => c !== cat.id)
                          : [...current, cat.id];
                        setSupplierForm({ ...supplierForm, allowedCategories: updated });
                      }}
                      className={`p-1.5 rounded border text-left transition-all flex items-center gap-1.5 text-[10px] ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground font-bold'
                          : 'bg-background border-border/40 text-muted-foreground'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-border'
                      }`}>
                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{cat.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sup_email" className="text-xs font-bold">Supplier Email (Optional)</Label>
              <Input 
                id="sup_email"
                type="email"
                value={supplierForm.email}
                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                placeholder="e.g. contact@shalimar-quarry.com"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sup_address" className="text-xs font-bold">Factory / Quarry Address</Label>
              <Input 
                id="sup_address"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                placeholder="e.g. Block C, Industrial Estate, Peshawar"
                className="h-9 text-xs"
              />
            </div>

            {/* Portal Access PIN / Password */}
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="sup_password" className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                  <span>پورٹل لاگ ان پاسورڈ / Access PIN</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
                    setSupplierForm(prev => ({ ...prev, accessPassword: pin }));
                  }}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  + نیا PIN بنائیں
                </button>
              </div>
              <Input 
                id="sup_password"
                value={supplierForm.accessPassword || ''}
                onChange={(e) => setSupplierForm({ ...supplierForm, accessPassword: e.target.value })}
                placeholder="e.g. 7861"
                className="h-9 text-xs font-mono font-bold tracking-widest bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                سپلائر سنگل پورٹل لنک (<span className="font-mono">/supplier</span>) پر یہ پاسورڈ لگا کر لاگ ان کرے گا۔
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sup_status" className="text-xs font-bold">Supplier Status:</Label>
                <Select 
                  value={supplierForm.status} 
                  onValueChange={(val: any) => setSupplierForm({ ...supplierForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs font-semibold w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs text-emerald-600 font-bold">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs text-muted-foreground">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingSupplier && (
              <div className="border-t border-border/40 pt-4 mt-2 space-y-2">
                <Label className="text-[11px] font-bold text-foreground">Quick Share Live Upload Link</Label>
                <div className="flex items-center gap-2">
                  <Select value={shareCategory} onValueChange={setShareCategory}>
                    <SelectTrigger className="h-8 text-xs font-semibold w-full">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {dynamicCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.labelEn} ({cat.labelUr})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm" 
                    onClick={() => {
                      handleCopyVendorLink(editingSupplier, shareCategory);
                    }}
                    className="h-8 text-xs font-bold border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 dark:text-indigo-400 gap-1.5 shrink-0 px-3 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Copy Link
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => {
                      handleSendVendorWhatsApp(editingSupplier, shareCategory);
                    }}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0 px-3 cursor-pointer"
                  >
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4 flex-wrap">
              {editingSupplier && (
                <>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      setIsSupplierModalOpen(false);
                      handleDeleteSupplier(editingSupplier.id);
                    }}
                    className="h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0 mr-auto"
                  >
                    Delete Supplier
                  </Button>
                </>
              )}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSupplierModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={submitting} 
                className="h-9 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? 'Saving...' : 'Save Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW SUPPLIERS DIRECTORY DIALOG */}
      <Dialog 
        open={isViewSuppliersModalOpen} 
        onOpenChange={(open) => {
          setIsViewSuppliersModalOpen(open);
          if (!open) {
            setViewingSupplierProducts(null);
            setSupplierProductsSearch('');
          }
        }}
      >
        <DialogContent className={viewingSupplierProducts ? "sm:max-w-[1180px] max-h-[92vh] flex flex-col" : "sm:max-w-[760px] max-h-[85vh] flex flex-col"}>
          <DialogHeader className="px-1">
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-1.5 text-xl">
              <User className="h-5 w-5 text-indigo-500" />
              {viewingSupplierProducts 
                ? `${viewingSupplierProducts.name} — مکمل ایک پیج ملٹی سائز ریٹ شیٹ`
                : "Supplier Directory & Product Metrics / سپلائرز لسٹ"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingSupplierProducts
                ? `ایک ہی نام کے آگے تمام سائز (24", 36", 48", 52", Gangsaw) کے ریٹس دیکھیں اور تبدیل کریں۔`
                : "View registered Wholesalers, Factories, and Quarries. Check how many products are linked with their contract rates."}
            </DialogDescription>
          </DialogHeader>

          {viewingSupplierProducts ? (
            /* MULTI-SIZE RATE SHEET VIEW OF SUPPLIER PRODUCTS */
            <div className="flex-1 flex flex-col min-h-0 space-y-3 pt-2 overflow-y-auto pr-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewingSupplierProducts(null);
                    setSupplierProductsSearch('');
                  }}
                  className="h-8 text-xs font-bold shrink-0 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                >
                  ← واپس سپلائر لسٹ پر (Back to Suppliers)
                </Button>

                <Link
                  href={`/dashboard/manage-stock/supplier/${viewingSupplierProducts.id}`}
                  onClick={() => setIsViewSuppliersModalOpen(false)}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>مکمل سپلائر پیج پر کھولیں (Full Page View)</span>
                  </Button>
                </Link>
              </div>

              <SupplierRateSheetMatrix
                supplier={viewingSupplierProducts}
                mode="modal"
                pendingRequests={rateRequests.filter(r => r.supplierId === viewingSupplierProducts.id)}
                onSaveRatesBatch={async (updatedRates, changedItems) => {
                  const res = await saveSupplier({
                    ...viewingSupplierProducts,
                    rates: updatedRates
                  });
                  if (res.success) {
                    const updatedSupplier = { ...viewingSupplierProducts, rates: updatedRates };
                    setViewingSupplierProducts(updatedSupplier);
                    setSuppliers(prev => prev.map(s => (s.id === updatedSupplier.id ? updatedSupplier : s)));
                    toast({
                      title: "ریٹس کامیابی سے اپ ڈیٹ ہو گئے! ✅",
                      description: `${changedItems.length} سائز ریٹس کامیابی سے محفوظ کر لیے گئے۔`
                    });
                  } else {
                    toast({
                      title: "Update Failed",
                      description: res.error || "Failed to save rates",
                      variant: "destructive"
                    });
                  }
                }}
                onApplyStoreMarkup={async (pct) => {
                  const res = await applySupplierMarkupToApp(viewingSupplierProducts.id, pct);
                  if (res.success) {
                    toast({
                      title: "ایپ کے ریٹس اپ ڈیٹ ہو گئے! 🚀",
                      description: `${viewingSupplierProducts.name} کے تمام ریٹس پر +${pct}% مارک اپ لگا کر ایپ کی قیمتیں اپ ڈیٹ کر دی گئیں۔`
                    });
                    const updatedMarbles = await getMarbles();
                    setMarbles(updatedMarbles);
                  }
                }}
                onResetOfficialAlMajeed={async () => {
                  const officialRates = getAlMajeedRates();
                  const res = await saveSupplier({
                    ...viewingSupplierProducts,
                    sheetVersion: '21-10-2026',
                    rates: officialRates
                  });
                  if (res.success) {
                    const updatedSupplier = { ...viewingSupplierProducts, rates: officialRates };
                    setViewingSupplierProducts(updatedSupplier);
                    setSuppliers(prev => prev.map(s => (s.id === updatedSupplier.id ? updatedSupplier : s)));
                    toast({
                      title: "المجد 21-10-2026 آفیشل ریٹ شیٹ لوڈ ہو گئی!",
                      description: "تمام سائز (24\", 36\", 48\", 52\", Gangsaw) اصل شیٹ کے مطابق اپ ڈیٹ ہو گئے۔"
                    });
                  }
                }}
              />
            </div>
          ) : (
            /* ORIGINAL SUPPLIER LIST */
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              {suppliers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic text-xs">
                  No suppliers registered yet. Click "Add Supplier" to create one.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {suppliers.map((sup) => {
                    const productsCount = sup.rates?.length || 0;
                    return (
                      <div key={sup.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-foreground truncate max-w-[240px]">{sup.name}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              sup.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' 
                                : 'bg-muted text-muted-foreground border'
                            }`}>
                              {sup.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1" title="Vendor Access PIN">
                              <KeyRound className="h-2.5 w-2.5 text-amber-500" />
                              PIN: {sup.accessPassword || '7861'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {sup.contactPerson && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="font-medium text-foreground/80 truncate">Contact: {sup.contactPerson}</span>
                              </div>
                            )}
                            {sup.phone && (
                              <div className="flex items-center gap-1 min-w-0">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{sup.phone}</span>
                              </div>
                            )}
                            {sup.address && (
                              <div className="flex items-center gap-1 min-w-0 col-span-1 sm:col-span-2 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{sup.address}</span>
                              </div>
                            )}
                          </div>

                          {/* Allowed Scope Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-semibold text-muted-foreground">مجاز کیٹگریز:</span>
                            {(!sup.allowedCategories || sup.allowedCategories.length === 0) ? (
                              <Badge variant="secondary" className="text-[9px] h-4 py-0 font-normal text-muted-foreground">
                                All Categories (تمام)
                              </Badge>
                            ) : (
                              sup.allowedCategories.map(cat => (
                                <Badge key={cat} variant="secondary" className="text-[9px] h-4 py-0 font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  {cat}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Products supplied indicator badge */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Products</span>
                            <span className="text-sm font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 min-w-[36px] text-center mt-0.5">
                              {productsCount}
                            </span>
                          </div>

                          {/* Open Single-Page Multi-Size Rate Sheet Modal */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setViewingSupplierProducts(sup)}
                            className="h-8 gap-1 text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-xs"
                            title="ایک پیج پر تمام سائز (24, 36, 48, 52, Gangsaw) کی ریٹ شیٹ کھولیں"
                          >
                            <span>📄 ریٹ شیٹ (Rate Sheet)</span>
                          </Button>

                          {/* View Full Supplier Page Button */}
                          <Link href={`/dashboard/manage-stock/supplier/${sup.id}`} onClick={() => setIsViewSuppliersModalOpen(false)}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                              title="View Products & Manage Rates for Supplier"
                            >
                              <Package className="h-3.5 w-3.5" />
                              <span>Full Page</span>
                            </Button>
                          </Link>

                          {/* Quick Share Link Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShareTargetSupplierId(sup.id);
                              setIsViewSuppliersModalOpen(false);
                              setIsShareModalOpen(true);
                            }}
                            className="h-8 gap-1 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            title="Share Upload Link with Vendor"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span>Share Link</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setIsViewSuppliersModalOpen(false);
                              openEditSupplierModal(sup);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Supplier Details & Rates"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsViewSuppliersModalOpen(false);
                setViewingSupplierProducts(null);
                setSupplierProductsSearch('');
              }}
              className="h-9 text-xs font-semibold w-full sm:w-auto"
            >
              Close
            </Button>
            {!viewingSupplierProducts && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsViewSuppliersModalOpen(false);
                  openAddSupplierModal();
                }}
                className="h-9 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Wholesaler
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. DEDICATED SHARE VENDOR UPLOAD LINK DIALOG */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-2 text-lg">
              <Share2 className="h-5 w-5 text-emerald-600" />
              Share Material Upload Link with Vendor / سپلائر لنک
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a personalized direct upload link to your vendor/wholesaler. They can use this link on mobile or computer to upload stone photos, sizes, thickness/sutars, and wholesale rates without complicated logins.
            </DialogDescription>
          </DialogHeader>

          {suppliers.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">No suppliers registered yet. Please add a supplier first.</p>
              <Button 
                onClick={() => {
                  setIsShareModalOpen(false);
                  openAddSupplierModal();
                }} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier
              </Button>
            </div>
          ) : (() => {
            const activeSupplier = suppliers.find(s => s.id === shareTargetSupplierId) || suppliers[0];
            const currentUrl = activeSupplier ? getVendorShareUrl(activeSupplier.id, shareTargetCategory, activeSupplier.accessPassword) : '';

            return (
              <div className="space-y-4 py-2">
                {/* 1. Select Supplier */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">1. Select Registered Vendor *</Label>
                  <Select 
                    value={activeSupplier?.id || ''} 
                    onValueChange={(val) => setShareTargetSupplierId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Choose Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(sup => (
                        <SelectItem key={sup.id} value={sup.id} className="text-xs">
                          <span className="font-bold">{sup.name}</span>
                          {sup.phone && <span className="text-muted-foreground ml-2">({sup.phone})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Optional Target Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">2. Pre-selected Category (Optional Focus)</Label>
                  <Select 
                    value={shareTargetCategory} 
                    onValueChange={setShareTargetCategory}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories (General Portal)</SelectItem>
                      {dynamicCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.labelEn} ({cat.labelUr})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Universal Link & Password Box (Recommended) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>سنگل پورٹل لنک اور خفیہ پاسورڈ (Universal Portal Link & PIN)</span>
                    </Label>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      PIN: {activeSupplier?.accessPassword || '7861'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    یہ ایک ہی لنک تمام سپلائرز کو بھیجا جا سکتا ہے۔ ہر سپلائر اپنا خفیہ پاسورڈ درج کر کے اپنا پورٹل کھول سکے گا:
                  </p>

                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={`${getPublicOrigin()}/supplier`} 
                      className="h-9 text-xs font-mono bg-background text-foreground"
                    />
                    <Button 
                      type="button" 
                      onClick={() => activeSupplier && handleCopyUniversalLinkWithPassword(activeSupplier)}
                      className="h-9 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 cursor-pointer shadow-xs"
                      title="کاپی لنک اور پاسورڈ"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link & PIN
                    </Button>
                  </div>
                </div>

                {/* 3. Direct Generated URL Display */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    <span>ڈائریکٹ مخصوص لنک (Direct Restricted URL):</span>
                    {activeSupplier?.phone && (
                      <span className="text-[10px] text-muted-foreground">
                        Vendor Phone: <strong>{activeSupplier.phone}</strong>
                      </span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={currentUrl} 
                      className="h-9 text-xs font-mono bg-muted/40 text-foreground selection:bg-indigo-500 selection:text-white" 
                    />
                    <Button 
                      type="button" 
                      onClick={() => activeSupplier && handleCopyVendorLink(activeSupplier, shareTargetCategory)}
                      className="h-9 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>

                {/* 4. Action Buttons */}
                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                  <Button 
                    type="button"
                    onClick={() => activeSupplier && handleSendVendorWhatsApp(activeSupplier, shareTargetCategory)}
                    className="h-10 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer flex-1"
                  >
                    <Share2 className="h-4 w-4" />
                    Share via WhatsApp (1-Click)
                  </Button>
                  
                  {activeSupplier && (
                    <Link href={`/supplier/${activeSupplier.id}${shareTargetCategory !== 'All' ? `?category=${encodeURIComponent(shareTargetCategory)}` : ''}`} target="_blank">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="h-10 px-3 text-xs font-bold border-slate-300 dark:border-slate-700 gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview Portal
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> How this works:
                  </p>
                  <p>
                    1. When the vendor opens the link on WhatsApp, their phone browser directly loads their supplier portal.
                  </p>
                  <p>
                    2. They can take photos of stone slabs/tiles with their mobile camera, type their price per square foot or unit, and tap <strong>"Submit Stone Proposal"</strong>.
                  </p>
                  <p>
                    3. Their proposal arrives in your <strong>Pending Proposals</strong> alert box above for you to review and add to inventory with one click.
                  </p>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="border-t pt-3">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setIsShareModalOpen(false)}
              className="h-9 text-xs font-semibold w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. SINGLE PRODUCT SALE & DISCOUNT DIALOG */}
      <Dialog 
        open={!!editingSaleProduct} 
        onOpenChange={(open) => {
          if (!open) setEditingSaleProduct(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          {editingSaleProduct && (() => {
            const originalPrice = editingSaleProduct.price || 0;
            const currentDiscount = editingSaleProduct.discount || 0;
            const isPct = editingSaleProduct.discountType !== 'fixed';
            const calcDiscountAmount = isPct ? (originalPrice * currentDiscount) / 100 : currentDiscount;
            const finalSalePrice = Math.max(0, originalPrice - calcDiscountAmount);

            return (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-2 text-lg">
                    <Flame className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
                    <span>Product Sale & Discount / سیل و رعایت</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    مخصوص پروڈکٹ پر رعایت، فیصد اور خصوصی سیل بیج لاگو کریں۔
                  </DialogDescription>
                </DialogHeader>

                {/* Product Preview Card */}
                <div className="p-3.5 bg-muted/40 border border-border/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate max-w-[280px]">
                      {editingSaleProduct.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold">
                      {editingSaleProduct.type === 'marble' ? 'Marble & Granite' : 'Fixing Material'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Original Retail Price:</span>
                    <strong className="text-foreground">PKR {originalPrice.toLocaleString()}</strong>
                  </div>
                  {editingSaleProduct.onSale && (
                    <div className="flex items-center justify-between text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      <span className="text-red-700 dark:text-red-400 font-bold flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                        Discounted Sale Price:
                      </span>
                      <div className="text-right">
                        <span className="line-through text-[11px] text-muted-foreground mr-1.5">PKR {originalPrice.toLocaleString()}</span>
                        <strong className="text-red-600 dark:text-red-400 text-sm font-black">
                          PKR {Math.round(finalSalePrice).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="space-y-3 pt-1">
                  {/* Active Sale Toggle */}
                  <div className="flex items-center justify-between p-3 border border-border/60 rounded-xl bg-card">
                    <div>
                      <Label className="text-xs font-extrabold text-foreground block">
                        Activate Sale / سیل فعال کریں
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        سٹور فرنٹ پر سیل کا نشان اور کم قیمت نظر آئے گی
                      </span>
                    </div>
                    <Switch
                      checked={editingSaleProduct.onSale}
                      onCheckedChange={(checked) => {
                        setEditingSaleProduct(prev => prev ? { ...prev, onSale: checked } : null);
                      }}
                    />
                  </div>

                  {/* Highlight in Main Header (Hero Banner Carousel) */}
                  <div className="flex items-center justify-between p-3 border border-border/60 rounded-xl bg-card">
                    <div className="pr-2">
                      <Label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Spotlight in Hero Banner / مین ہیڈر بڑی تصویر میں دکھائیں</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground block">
                        سیل لگنے پر خودکار آن ہو جاتا ہے۔ اگر مین ہیڈر سلائیڈ شو میں نہیں دکھانا تو اسے بند کر دیں۔
                      </span>
                    </div>
                    <Switch
                      checked={editingSaleProduct.heroHighlightOnSale !== false}
                      onCheckedChange={(checked) => {
                        setEditingSaleProduct(prev => prev ? { ...prev, heroHighlightOnSale: checked } : null);
                      }}
                    />
                  </div>

                  {/* Discount Type & Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">Discount Type</Label>
                      <Select
                        value={editingSaleProduct.discountType}
                        onValueChange={(val: 'percentage' | 'fixed') => {
                          setEditingSaleProduct(prev => prev ? { ...prev, discountType: val } : null);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage" className="text-xs font-bold">Percentage (%)</SelectItem>
                          <SelectItem value="fixed" className="text-xs font-bold">Fixed PKR (روپے)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-foreground">
                        {editingSaleProduct.discountType === 'fixed' ? 'Discount Amount (PKR)' : 'Discount Percentage (%)'}
                      </Label>
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min={0}
                          max={editingSaleProduct.discountType === 'percentage' ? 95 : originalPrice}
                          value={editingSaleProduct.discount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditingSaleProduct(prev => prev ? { ...prev, discount: val } : null);
                          }}
                          className="h-9 text-xs font-bold text-right pr-8"
                        />
                        <span className="absolute right-2.5 text-xs text-muted-foreground font-bold">
                          {editingSaleProduct.discountType === 'fixed' ? 'Rs' : '%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick percentage pills if percentage */}
                  {editingSaleProduct.discountType === 'percentage' && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-semibold">Quick select:</span>
                      {[5, 10, 15, 20, 25, 30].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setEditingSaleProduct(prev => prev ? { ...prev, discount: pct } : null)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer",
                            editingSaleProduct.discount === pct
                              ? "bg-red-600 text-white border-red-600 shadow-xs"
                              : "bg-muted/40 hover:bg-muted text-foreground border-border/60"
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sale Badge Text */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground">
                      Promotional Badge Text / پروموشنل بیج (اختیاری)
                    </Label>
                    <Input
                      placeholder="e.g. HOT DEAL, SPECIAL SALE, RAMADAN OFFER"
                      value={editingSaleProduct.saleBadgeText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingSaleProduct(prev => prev ? { ...prev, saleBadgeText: val } : null);
                      }}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between gap-2">
                  {editingSaleProduct.onSale && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={submitting}
                      onClick={() => {
                        handleSaveProductSale({
                          productId: editingSaleProduct.id,
                          type: editingSaleProduct.type,
                          onSale: false,
                          discount: 0,
                          discountType: 'percentage',
                          saleBadgeText: '',
                          heroHighlightOnSale: false
                        });
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Remove Sale / سیل ختم کریں
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSaleProduct(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      onClick={() => {
                        handleSaveProductSale({
                          productId: editingSaleProduct.id,
                          type: editingSaleProduct.type,
                          onSale: editingSaleProduct.onSale,
                          discount: editingSaleProduct.discount,
                          discountType: editingSaleProduct.discountType,
                          saleBadgeText: editingSaleProduct.saleBadgeText,
                          heroHighlightOnSale: editingSaleProduct.heroHighlightOnSale !== false
                        });
                      }}
                      className="text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save Sale Settings / محفوظ کریں
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 5. BULK SALE & DISCOUNT SYSTEM DIALOG */}
      <Dialog 
        open={isBulkSaleModalOpen} 
        onOpenChange={setIsBulkSaleModalOpen}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
              <span>Bulk Sale & Discount Manager / بلک سیل و رعایت مینیجر</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              ایک ہی کلک میں تمام مصنوعات یا مخصوص کیٹگری پر سیل اور رعایت لاگو کریں۔
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Apply Discount Across / کس کیٹگری پر لاگو کرنا ہے:
              </Label>
              <Select
                value={bulkSaleTarget}
                onValueChange={setBulkSaleTarget}
              >
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">
                    🌐 All Products (ماربل، گرینائٹ، کیمیکل اور اوزار)
                  </SelectItem>
                  <SelectItem value="marbles" className="text-xs font-bold">
                    🏛️ All Marbles & Granites (تمام ماربل و گرینائٹ)
                  </SelectItem>
                  <SelectItem value="fixing" className="text-xs font-bold">
                    🧪 All Chemicals & Tools (تمام کیمیکلز اور ٹولز)
                  </SelectItem>
                  {dynamicCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs font-semibold">
                      🏷️ {cat.labelEn} ({cat.labelUr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount Percentage Slider/Input */}
            <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Discount Percentage / رعایت فیصد:
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-red-600 dark:text-red-400">
                    {bulkSaleDiscount}%
                  </span>
                  <span className="text-xs text-muted-foreground font-bold">OFF</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[5, 10, 12, 15, 20, 25, 30].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBulkSaleDiscount(pct)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center",
                      bulkSaleDiscount === pct
                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                        : "bg-background hover:bg-muted text-foreground border-border/80"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={bulkSaleDiscount}
                  onChange={(e) => setBulkSaleDiscount(Math.max(1, Math.min(90, Number(e.target.value))))}
                  className="h-8 text-xs font-bold text-center"
                  placeholder="Custom percentage (1-90%)"
                />
              </div>
            </div>

            {/* Badge Text */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Sale Badge Text / سیل پروموشن بیج:
              </Label>
              <Input
                placeholder="e.g. SPECIAL OFFER, MEGA SALE, 15% OFF"
                value={bulkSaleBadge}
                onChange={(e) => setBulkSaleBadge(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Warning / Informational note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> نوٹ:
              </p>
              <p>
                بلک ڈسکاؤنٹ منتخب کردہ تمام پروڈکٹس پر خودکار طور پر سیل کا نشان لگائے گا اور سٹور فرنٹ پر نئی کیٹگری <strong>&quot;Sale &amp; Discount&quot;</strong> میں یہ تمام اشیاء خود بخود پیش ہو جائیں گی۔
              </p>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={handleClearBulkSale}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Clear Sale / سیل ختم کریں
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBulkSaleModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={handleApplyBulkSale}
                className="text-xs font-extrabold bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white gap-1.5 shadow-xs"
              >
                <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-200" />
                Apply Bulk Sale / لاگو کریں
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}

// Separate component helper to manage the local tab states of each row cleanly and prevent full dashboard re-renders
function RowComponent({
  row,
  currentRates,
  suppliers,
  getStatusBadgeClass,
  handleMarbleStockStatusChange,
  handleFixingMaterialStockStatusChange,
  handleMarblePriceUpdate,
  handleFixingMaterialPriceUpdate,
  handleMarbleVisibilityToggle,
  handleFixingMaterialVisibilityToggle,
  handleVendorRateChange,
  handleDeleteVendorRate,
  categories,
  onEditSale
}: {
  row: any;
  currentRates: { supplierName: string; rate: number; supplierId: string }[];
  suppliers: Supplier[];
  getStatusBadgeClass: any;
  handleMarbleStockStatusChange: any;
  handleFixingMaterialStockStatusChange: any;
  handleMarblePriceUpdate: any;
  handleFixingMaterialPriceUpdate: any;
  handleMarbleVisibilityToggle: any;
  handleFixingMaterialVisibilityToggle: any;
  handleVendorRateChange: any;
  handleDeleteVendorRate: any;
  categories?: { id: string; labelEn: string; labelUr: string }[];
  onEditSale?: (row: any) => void;
}) {
  const { toast } = useToast();

  // Local tab indicator state within this specific product row
  // Options: 'compare' (Compare All), or any specific supplierId
  const [activeTab, setActiveTab] = useState<string>('compare');
  const [localCostInput, setLocalCostInput] = useState<string>('');
  const [activeVendorShareCategory, setActiveVendorShareCategory] = useState<string>('All');

  // Rate dialog state for configuring supplier rate via profit & app rate
  const [isRateDialogOpen, setIsRateDialogOpen] = useState<boolean>(false);
  const [dialogAppRate, setDialogAppRate] = useState<string>('0');
  const [dialogProfit, setDialogProfit] = useState<string>('0');

  // Update cost text state whenever the active vendor tab changes
  useEffect(() => {
    if (activeTab !== 'compare') {
      const match = currentRates.find(r => r.supplierId === activeTab);
      setLocalCostInput(match ? String(match.rate) : '0');
    }
  }, [activeTab, currentRates]);

  // Find currently active vendor object if a vendor tab is selected
  const activeVendor = suppliers.find(s => s.id === activeTab);
  const activeVendorRate = currentRates.find(r => r.supplierId === activeTab);

  // Compute margins for current active supplier
  const cost = activeVendorRate ? activeVendorRate.rate : 0;
  const profit = row.price - cost;
  const marginPct = row.price > 0 ? (profit / row.price) * 100 : 0;

  // Calculated cost price to link to the supplier based on app's rate and profit
  const calculatedCost = Math.max(0, Number(dialogAppRate || 0) - Number(dialogProfit || 0));

  return (
    <Card id={`row-${row.rowId}`} className="border border-border/80 shadow-sm overflow-hidden hover:border-primary/30 transition-all duration-200 bg-card">
      <CardContent className="p-3 md:p-4 space-y-3">
        
        {/* 1. UPPER ROW: Image, Name, Stock, Price, Sale/Discount, Visibility */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Col A: Image and Product Label */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted">
              <Image 
                src={row.imageUrl} 
                alt={row.name} 
                fill
                sizes="44px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <Badge variant="outline" className="text-[8px] uppercase tracking-wider py-0 px-1 bg-muted/50 font-bold text-muted-foreground block w-max">
                  {row.type === 'marble' ? 'Marble & Granite' : row.type === 'ceramic' ? 'Ceramic tile' : 'Chemical and tool'}
                </Badge>
                {(row.onSale || (row.discount && row.discount > 0)) && (
                  <Badge className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[8px] py-0 px-1.5 rounded-full flex items-center gap-0.5 shadow-xs">
                    <Flame className="h-2.5 w-2.5 fill-amber-300 text-amber-200" />
                    <span>
                      {formatSaleBadgeText({
                        discount: row.discount,
                        discountType: row.discountType,
                        saleBadgeText: row.saleBadgeText
                      })}
                    </span>
                  </Badge>
                )}
                {row.onSale && row.heroHighlightOnSale && (
                  <Badge variant="outline" className="text-[8px] py-0 px-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold flex items-center gap-0.5">
                    <Sparkles className="h-2 w-2" />
                    <span>Hero Banner</span>
                  </Badge>
                )}
              </div>
              <h4 className="font-headline text-xs md:text-sm font-extrabold text-foreground truncate max-w-[280px] md:max-w-[420px]">
                {row.name}
              </h4>
            </div>
          </div>

          {/* Col B: AVAILABILITY DROPDOWN MENU */}
          <div className="flex flex-col gap-0.5 w-full md:w-44 shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Availability Status</span>
            <Select 
              value={row.availability}
              onValueChange={(val) => {
                if (row.type === 'marble') {
                  handleMarbleStockStatusChange(row.productId, val);
                } else {
                  handleFixingMaterialStockStatusChange(row.productId, val);
                }
              }}
            >
              <SelectTrigger className={`h-8 text-xs font-bold px-2.5 border-border/80 ${getStatusBadgeClass(row.availability)}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock" className="text-xs font-bold">Available (Yes)</SelectItem>
                <SelectItem value="out_of_stock" className="text-xs font-bold">No (Out of stock)</SelectItem>
                <SelectItem value="incoming" className="text-xs font-bold">Incoming stock</SelectItem>
                <SelectItem value="limited_stock" className="text-xs font-bold">Limited stock</SelectItem>
                <SelectItem value="coming_soon" className="text-xs font-bold">Coming soon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Col C: MANAGEABLE RETAIL SELLING PRICE */}
          <div className="flex flex-col gap-0.5 w-full md:w-36 shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Retail Price (PKR)</span>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[10px] text-muted-foreground font-mono font-bold">PKR</span>
              <Input 
                type="number"
                defaultValue={row.price}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== row.price) {
                    if (row.type === 'marble') {
                      handleMarblePriceUpdate(row.productId, row.variantId || '', val);
                    } else {
                      handleFixingMaterialPriceUpdate(row.productId, val);
                    }
                  }
                }}
                className="h-8 w-full pl-11 pr-2 text-right font-extrabold text-xs border-border/80 bg-background"
              />
            </div>
          </div>

          {/* Col D: SALE & DISCOUNT STATUS / BUTTON */}
          <div className="flex flex-col gap-0.5 w-full md:w-36 shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Flame className="h-2.5 w-2.5 text-amber-500" />
              Sale & Discount
            </span>
            <button
              type="button"
              onClick={() => onEditSale && onEditSale(row)}
              className={cn(
                "h-8 px-2.5 rounded-md text-xs font-extrabold flex items-center justify-between border transition-all cursor-pointer",
                (row.onSale || (row.discount && row.discount > 0))
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60 hover:text-foreground"
              )}
              title="Configure product sale and discount"
            >
              {(row.onSale || (row.discount && row.discount > 0)) ? (
                <>
                  <span className="flex items-center gap-1 truncate">
                    <Flame className="h-3 w-3 fill-red-500 text-red-500 shrink-0 animate-pulse" />
                    <span>{row.discountType === 'fixed' ? `Rs ${row.discount}` : `${row.discount}%`} OFF</span>
                  </span>
                  <Edit className="h-3 w-3 opacity-60 ml-1 shrink-0" />
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-muted-foreground">+ Add Sale</span>
                  <Tag className="h-3 w-3 opacity-40 shrink-0" />
                </>
              )}
            </button>
          </div>

          {/* Col E: STOREFRONT VISIBILITY TOGGLER */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Storefront</span>
            <div className="flex items-center gap-2 h-8">
              <Switch 
                checked={!row.isHidden}
                onCheckedChange={() => {
                  if (row.type === 'marble') {
                    handleMarbleVisibilityToggle(row.productId, row.isHidden);
                  } else {
                    handleFixingMaterialVisibilityToggle(row.productId, row.isHidden);
                  }
                }}
                className="scale-75"
              />
              <span className="text-xs font-bold text-foreground">
                {row.isHidden ? 'Hidden' : 'Active'}
              </span>
            </div>
          </div>

        </div>

        {/* 2. LOWER ROW: COMPACT VENDOR TABS PANEL */}
        <div className="bg-muted/30 border border-border/40 rounded-lg p-2.5 space-y-2.5">
          
          {/* Tab Selector Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 pb-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {/* Tab: Compare All */}
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all ${
                  activeTab === 'compare' 
                    ? 'bg-primary text-primary-foreground shadow-xs' 
                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                📊 Compare All
              </button>

              {/* Vendor Tabs */}
              {suppliers.map(sup => {
                const isLinked = currentRates.some(r => r.supplierId === sup.id);
                return (
                  <button
                    key={sup.id}
                    onClick={() => setActiveTab(sup.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                      activeTab === sup.id 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : isLinked 
                          ? 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300' 
                          : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-border/80'
                    }`}
                  >
                    {sup.name}
                    {isLinked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick action to associate a contract if not already tab-active */}
            {activeTab !== 'compare' && !activeVendorRate && (
              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                Not linked yet
              </Badge>
            )}
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'compare' ? (
            /* COMPARISON VIEW PANEL */
            <div className="space-y-1.5">
              {currentRates.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic pl-1">
                  No purchase cost rates registered yet for this size. Click any Vendor Tab above to instantly set a contract price!
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {currentRates.map(r => {
                    const localProfit = row.price - r.rate;
                    const localMargin = row.price > 0 ? (localProfit / row.price) * 100 : 0;
                    
                    return (
                      <div 
                        key={r.supplierId} 
                        onClick={() => setActiveTab(r.supplierId)}
                        className="p-1.5 rounded bg-background border border-border/50 hover:border-indigo-400 cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-[9px] font-extrabold text-foreground truncate">{r.supplierName}</span>
                          <span className="text-[8px] text-muted-foreground font-mono shrink-0">PKR {r.rate.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/20">
                          <span className="text-[8px] font-medium text-muted-foreground">Margin:</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[8px] h-3.5 py-0 px-1 font-bold shrink-0 ${
                              localMargin < 0 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : localMargin < 15 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {localMargin.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SPECIFIC SUPPLIER CONTRACT RATE DETAILS (Directly adjustable inside) */
            <div className="bg-background border border-border/50 rounded p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-foreground flex items-center gap-1.5 flex-wrap">
                    {activeVendor?.name} Rate Contract
                    {activeVendor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Select value={activeVendorShareCategory} onValueChange={setActiveVendorShareCategory}>
                          <SelectTrigger className="h-5 text-[8px] w-24 py-0 px-1.5 bg-background font-bold border-border/60">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All" className="text-[10px]">All Categories</SelectItem>
                            {(categories || APP_PRODUCT_CATEGORIES).map(cat => (
                              <SelectItem key={cat.id} value={cat.id} className="text-[10px]">{cat.labelEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          title="Copy Secure Vendor Portal Link"
                          onClick={(e) => {
                            e.stopPropagation();
                            const queryParam = activeVendorShareCategory !== 'All' ? `?category=${encodeURIComponent(activeVendorShareCategory)}` : '';
                            const portalUrl = `${getPublicOrigin()}/supplier/${activeVendor.id}${queryParam}`;
                            navigator.clipboard.writeText(portalUrl);
                            toast({
                              title: "Link Copied",
                              description: `Secure portal link for ${activeVendor.name} (${activeVendorShareCategory}) copied!`
                            });
                          }}
                          className="p-1 rounded bg-muted/60 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-950/40 text-muted-foreground transition-all shrink-0"
                        >
                          <Share2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </span>
                  <span className="text-[8px] text-muted-foreground block font-medium">
                    {activeVendor?.phone || 'No phone'} | {activeVendor?.address || 'Quarry Location'}
                  </span>
                </div>
              </div>

              {activeVendorRate ? (
                /* Edit linked rate cost directly */
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-bold font-mono">Cost: PKR</span>
                    <Input 
                      type="number"
                      value={localCostInput}
                      onChange={(e) => setLocalCostInput(e.target.value)}
                      onBlur={() => {
                        const val = Number(localCostInput);
                        if (val !== activeVendorRate.rate) {
                          handleVendorRateChange(activeTab, row.rowId, val);
                        }
                      }}
                      className="h-7 w-20 px-1 text-right font-extrabold text-[11px] border-border/80"
                    />
                  </div>

                  {/* Profit margin feedback badge */}
                  <div className="text-right shrink-0">
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] py-0.5 px-1.5 font-bold ${
                        marginPct < 0 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : marginPct < 15 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {marginPct.toFixed(0)}% margin (PKR {profit.toLocaleString()})
                    </Badge>
                  </div>

                  {/* Remove supplier link entirely */}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      handleDeleteVendorRate(activeTab, row.rowId);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                /* Supplier is not associated with this format: Link it now! */
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDialogAppRate(String(row.price || 0));
                    setDialogProfit('0');
                    setIsRateDialogOpen(true);
                  }}
                  className="h-7 text-[10px] font-extrabold text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0 gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Link Cost Contract
                </Button>
              )}

            </div>
          )}

        </div>

      </CardContent>

      {/* Dynamic Wholesaler Rate configuration Dialogue Box */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-white flex items-center gap-1.5">
              <DollarSign className="h-5 w-5 text-indigo-400 animate-pulse" />
              Configure Wholesaler Rate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Set the supplier's cost rate by inputting your target profit and your app's retail rate for <strong className="text-white">"{row.title || row.name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="app-rate" className="text-slate-300 font-bold">Our App's Rate (Retail Selling Price - PKR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-bold">PKR</span>
                <Input
                  id="app-rate"
                  type="number"
                  placeholder="Enter our retail rate"
                  value={dialogAppRate}
                  onChange={(e) => setDialogAppRate(e.target.value)}
                  className="pl-12 bg-slate-950 border-slate-800 text-white font-extrabold font-mono focus-visible:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">The customer-facing retail price listed in your showroom app.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profit-rate" className="text-slate-300 font-bold">Our Profit (PKR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-indigo-400 font-mono font-bold">PKR</span>
                <Input
                  id="profit-rate"
                  type="number"
                  placeholder="Enter your target profit margin"
                  value={dialogProfit}
                  onChange={(e) => setDialogProfit(e.target.value)}
                  className="pl-12 bg-slate-950 border-slate-800 text-white font-extrabold font-mono focus-visible:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">The amount of markup/profit you want to keep per unit.</p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>App's Retail Rate:</span>
                <span className="font-mono font-bold text-slate-200">PKR {Number(dialogAppRate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Minus Profit Margin:</span>
                <span className="font-mono font-bold text-indigo-400">- PKR {Number(dialogProfit || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between items-center text-white">
                <span className="font-extrabold">Wholesaler Cost Rate:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  PKR {calculatedCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsRateDialogOpen(false)}
              className="border-slate-800 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                handleVendorRateChange(activeTab, row.rowId, calculatedCost);
                setIsRateDialogOpen(false);
                toast({
                  title: "Contract Rate Connected",
                  description: `Assigned cost rate of PKR ${calculatedCost.toLocaleString()} (Retail: PKR ${Number(dialogAppRate || 0).toLocaleString()} - Profit: PKR ${Number(dialogProfit || 0).toLocaleString()}) for "${activeVendor?.name}".`,
                });
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold"
            >
              Confirm & Link Wholesaler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
