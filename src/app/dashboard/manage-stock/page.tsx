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
  getAlMajeedRates,
  getSupplierApplications,
  approveSupplierApplication,
  rejectSupplierApplication
} from '@/lib/admin-actions';
import { SupplierRateSheetMatrix } from '@/components/supplier-rate-sheet-matrix';
import type { Marble, FixingMaterial } from '@/lib/types';
import type { Supplier, SupplierRate, SupplierProposal, SupplierRateRequest, SupplierApplication } from '@/lib/admin-actions';
import { getPublicOrigin, cn, formatSaleBadgeText } from '@/lib/utils';
import { useFullscreenImage, buildProductGallery } from '@/context/fullscreen-image-context';
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
  Camera,
  Handshake,
  Scissors,
  Building2
} from 'lucide-react';

export default function ManageStockPage() {
  const { toast } = useToast();
  const { openGallery } = useFullscreenImage();
  
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
  const [partnerApplications, setPartnerApplications] = useState<SupplierApplication[]>([]);
  const [appCustomPins, setAppCustomPins] = useState<Record<string, string>>({});
  const [approvingAppId, setApprovingAppId] = useState<string | null>(null);
  const [approvedPartnerBanner, setApprovedPartnerBanner] = useState<{
    name: string;
    phone: string;
    pin: string;
  } | null>(null);
  
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
    allowedCategories: ['Marble', 'Granite'] as string[],
    allowCuttingOptimizer: true
  });

  // Quick Add Supplier & Universal Link + Password States
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('');
  const [quickSupplierPassword, setQuickSupplierPassword] = useState('');
  const [quickAllowedCategories, setQuickAllowedCategories] = useState<string[]>(['Marble', 'Granite']);
  const [quickAllowCuttingOptimizer, setQuickAllowCuttingOptimizer] = useState<boolean>(true);
  const [quickGeneratedResult, setQuickGeneratedResult] = useState<{
    supplier: Supplier;
    shareUrl: string;
    allowedCategories: string[];
  } | null>(null);
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);

  // Per-proposal inline App Selling Rate inputs (PKR)
  const [proposalSellingPrices, setProposalSellingPrices] = useState<Record<string, string>>({});

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
        allowedCategories: quickAllowedCategories,
        accessPassword: quickSupplierPassword.trim() || undefined,
        allowCuttingOptimizer: quickAllowCuttingOptimizer
      });

      if (res.success && res.supplier) {
        const universalUrl = getUniversalVendorUrl();
        setQuickGeneratedResult({
          supplier: res.supplier,
          shareUrl: universalUrl,
          allowedCategories: res.supplier.allowedCategories || quickAllowedCategories
        });
        toast({
          title: "سپلائر رجسٹر ہو گیا اور پاسورڈ تیار ہے! 🔑",
          description: `"${res.supplier.name}" کا پاسورڈ (${res.supplier.accessPassword}) بن گیا ہے۔ سنگل پورٹل لنک شیئر کریں۔`
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

  // Compute active base origin for external sharing (always defaults to stoneexpert.net)
  const getActiveShareOrigin = () => {
    if (shareDomainMode === 'custom' && customShareDomain.trim()) {
      return customShareDomain.trim().replace(/\/+$/, '');
    }
    return getPublicOrigin();
  };

  // Single Universal Supplier Portal URL for ALL suppliers
  const getUniversalVendorUrl = () => {
    return `${getActiveShareOrigin()}/supplier`;
  };

  const handleCopyUniversalLinkWithPassword = (supplier: Supplier) => {
    const universalUrl = getUniversalVendorUrl();
    const password = supplier.accessPassword || '7861';
    const textToCopy = `اسٹون ایکسپرٹ سپلائر پورٹل (Stone Expert Supplier Portal)\n\n🔗 پورٹل لنک: ${universalUrl}\n🔑 آپ کا پاسورڈ / PIN: ${password}\n\nلنک کھولیں، اپنا پاسورڈ درج کریں، پہلی دفعہ اپنی فیکٹری کی تفصیلات و تصویر لگائیں اور اپنے مٹیریل، ریٹس اور تصاویر اپلوڈ کر کے سبمٹ کر دیں۔`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "سنگل لنک اور پاسورڈ کاپی ہو گیا! 📋",
      description: `${universalUrl} اور پاسورڈ (${password}) کلپ بورڈ پر کاپی ہو گئے۔`,
    });
  };

  const handleSendVendorWhatsApp = (supplier: Supplier) => {
    const universalUrl = getUniversalVendorUrl();
    const password = supplier.accessPassword || '7861';

    const safeAllowed = Array.isArray(supplier.allowedCategories)
      ? supplier.allowedCategories
      : typeof supplier.allowedCategories === 'string'
        ? String(supplier.allowedCategories).split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const allowedText = (safeAllowed.length > 0 && !safeAllowed.includes('All'))
      ? `\n\nمجاز کیٹگریز:\n• ${safeAllowed.join('\n• ')}`
      : '';

    const text = `السلام علیکم ${supplier.name}،\n\nاسٹون ایکسپرٹ (Stone Expert) کا سپلائر پورٹل لنک:\n\n🔗 پورٹل لنک (سب سپلائرز کے لیے ایک ہی لنک):\n${universalUrl}\n\n🔑 آپ کا مخصوص پاسورڈ / PIN:\n${password}${allowedText}\n\nطریقہ کار:\n1. لنک کھولیں اور اپنا پاسورڈ درج کریں۔\n2. پہلی بار اپنی فیکٹری کا نام، تصویر، فون نمبر اور ایڈریس درج کریں۔\n3. اپنے مٹیریل، ریٹ اور تصاویر شامل کر کے سبمٹ (Submit) کر دیں۔\n\nشکریہ،\nاسٹون ایکسپرٹ مینجمنٹ`;

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
      const [marblesData, fixingData, suppliersData, proposalsData, rateRequestsData, applicationsData] = await Promise.all([
        getMarbles(),
        getFixingMaterials(),
        getSuppliers(),
        getSupplierProposals(),
        getSupplierRateRequests(),
        getSupplierApplications()
      ]);
      setMarbles(marblesData || []);
      setFixingMaterials(fixingData || []);
      setSuppliers(suppliersData || []);
      setProposals(proposalsData || []);
      setRateRequests(rateRequestsData || []);
      setPartnerApplications(applicationsData || []);
      
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

  // Find all active rates and active suppliers for a specific material/variant combination
  const getMaterialSupplierRates = (materialId: string, variantId?: string) => {
    const targetId = variantId ? `${materialId}_${variantId}` : materialId;
    const results: { supplierName: string; rate: number; supplierId: string; rateMaterialId: string }[] = [];
    const seenSuppliers = new Set<string>();

    suppliers.forEach(sup => {
      if (sup.status === 'inactive') return;
      if (sup.rates && sup.rates.length > 0) {
        const matchedRate = sup.rates.find(
          r =>
            r.status !== 'paused' &&
            typeof r.rate === 'number' &&
            r.rate > 0 &&
            (r.materialId === targetId || (!!variantId && r.materialId === variantId))
        );
        if (matchedRate && !seenSuppliers.has(sup.id)) {
          seenSuppliers.add(sup.id);
          results.push({
            supplierName: sup.name,
            rate: matchedRate.rate,
            supplierId: sup.id,
            rateMaterialId: matchedRate.materialId
          });
        }
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
        status: 'active',
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
        status: 'active',
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

  // Supplier Proposals Handlers (with inline App Selling Rate & Existing vs. NEW Product detection)
  const handleApproveProposalClick = async (proposalId: string, customSellingPrice?: number) => {
    setSubmitting(true);
    try {
      const res = await approveSupplierProposal(proposalId, customSellingPrice);
      if (res.success) {
        const finalPriceLabel = res.sellingPrice ? ` (ایپ ریٹ: Rs ${res.sellingPrice.toLocaleString()})` : '';
        toast({
          title: res.isNewProduct
            ? "✨ نیا پروڈکٹ ایپ میں شامل ہو گیا!"
            : "✅ موجودہ پروڈکٹ کے ساتھ سپلائر ریٹ لنک ہو گیا!",
          description: res.isNewProduct
            ? `"${res.productName}" بطور نیا پروڈکٹ ایپ میں خودکار شامل کر دیا گیا ہے${finalPriceLabel}۔`
            : `"${res.productName}" پہلے سے موجود تھا — اصل پروڈکٹ برقرار رکھتے ہوئے سپلائر ریٹ منسلک کر دیا گیا${finalPriceLabel}۔`,
        });
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
      allowedCategories: ['Marble', 'Granite'],
      allowCuttingOptimizer: true
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
      materialsSupplied: Array.isArray(sup.materialsSupplied) ? sup.materialsSupplied : [],
      allowedCategories: Array.isArray(sup.allowedCategories) && sup.allowedCategories.length > 0 
        ? sup.allowedCategories 
        : ['Marble', 'Granite'],
      allowCuttingOptimizer: sup.allowCuttingOptimizer !== false
    });
    setIsSupplierModalOpen(true);
  };

  const handleToggleSupplierCuttingOptimizer = async (sup: Supplier) => {
    const nextEnabled = sup.allowCuttingOptimizer === false;
    const updatedSupplier: Supplier = {
      ...sup,
      allowCuttingOptimizer: nextEnabled
    };
    try {
      const res = await saveSupplier(updatedSupplier);
      if (res.success) {
        setSuppliers(prev => prev.map(s => (s.id === sup.id ? updatedSupplier : s)));
        toast({
          title: nextEnabled
            ? 'کٹنگ آپٹیمائزر آن کر دیا گیا ✂️'
            : 'کٹنگ آپٹیمائزر بند کر دیا گیا 🔒',
          description: `${sup.name} کے پورٹل میں کٹنگ آپٹیمائزر اب ${nextEnabled ? 'فعال (ON)' : 'بند (OFF)'} ہے۔`
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update permission.'
      });
    }
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
    variantLabel: string;
    unit: string;
    type: 'marble' | 'fixing_material';
    imageUrl: string;
    gallery?: string[];
    availability: string;
    price: number;
    isHidden: boolean;
    onSale: boolean;
    discount: number;
    discountType: 'percentage' | 'fixed';
    saleBadgeText: string;
    heroHighlightOnSale?: boolean;
    category: string;
  }[] => {
    const list: any[] = [];

    // Marbles
    marbles.forEach(m => {
      const fallbackUrl = `https://placehold.co/300?text=${encodeURIComponent(m.name)}`;
      const imageUrl = (m.imageUrl && m.imageUrl.trim() !== '') ? m.imageUrl : fallbackUrl;
      const availability = (m as any).stockStatus || ((m as any).inStock !== false ? 'in_stock' : 'out_of_stock');
      const isHidden = !!m.isHidden;
      const onSale = !!m.onSale;
      const discount = typeof m.discount === 'number' ? m.discount : 0;
      const discountType = m.discountType || 'percentage';
      const saleBadgeText = m.saleBadgeText || '';
      const heroHighlightOnSale = m.heroHighlightOnSale !== false;
      const category = m.category || m.materialType || 'Marble';
      const unit = ['Vanity', 'Inlay', 'Antique'].includes(m.materialType || '') ? 'pc' : 'sqft';

      const type = 'marble';

      if (m.variants && m.variants.length > 0) {
        m.variants.forEach(v => {
          const variantLabel = [v.size, v.thickness].filter(Boolean).join(' · ');
          list.push({
            rowId: `${m.id}_${v.id}`,
            productId: m.id,
            variantId: v.id,
            name: `${m.name} - ${v.size} (${v.thickness})`,
            baseName: m.name,
            variantLabel,
            unit,
            type,
            imageUrl,
            gallery: m.gallery,
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
          variantLabel: category,
          unit,
          type,
          imageUrl,
          gallery: m.gallery,
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
      const fallbackUrl = `https://placehold.co/300?text=${encodeURIComponent(fm.name)}`;
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
        variantLabel: category,
        unit: fm.unit || 'unit',
        type: 'fixing_material',
        imageUrl,
        gallery: undefined,
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
    <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 max-w-[1440px] mx-auto w-full bg-background min-h-screen">
      
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
              setViewingSupplierProducts(null);
              setIsViewSuppliersModalOpen(true);
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-sm bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all cursor-pointer ring-1 ring-amber-400/50"
          >
            <span>📄 سپلائر ریٹ شیٹس (Rate Sheets)</span>
          </Button>
          <Button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-admin-ai-scanner'));
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer ring-1 ring-indigo-400/40"
          >
            <Camera className="h-3.5 w-3.5 text-amber-200" />
            AI ریٹ لسٹ اسکینر (Scan Supplier Rate Image)
          </Button>
          <Button 
            onClick={() => {
              setQuickSupplierName('');
              setQuickSupplierPhone('');
              setQuickSupplierPassword(`${Math.floor(1000 + Math.random() * 9000)}`);
              setQuickAllowedCategories(['Marble', 'Granite']);
              setQuickGeneratedResult(null);
              setCopiedQuickLink(false);
              setIsQuickAddModalOpen(true);
            }}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer ring-1 ring-emerald-400/30"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-100" />
            نیا سپلائر + پاسورڈ بنائیں
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
            سنگل سپلائر لنک (Universal Link)
          </Button>
          <Button 
            onClick={openAddSupplierModal}
            size="sm"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Full Form
          </Button>
          <Button 
            onClick={() => {
              setViewingSupplierProducts(null);
              setIsViewSuppliersModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="font-extrabold text-xs h-8 px-3 gap-1.5 border-indigo-200 hover:bg-indigo-50 text-indigo-700 transition-all cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            View Directory ({suppliers.length})
          </Button>
        </div>
      </div>

      {/* 1.4 APPROVED PARTNER PIN SHARE BANNER */}
      {approvedPartnerBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/35 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs">
            <div className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{approvedPartnerBanner.name} بطور سپلائر منظور ہو گیا!</span>
            </div>
            <p className="text-muted-foreground">
              یونیورسل پورٹل لنک: <span className="font-mono font-bold text-foreground">https://stoneexpert.net/supplier</span> • سپلائر PIN: <span className="font-mono font-black text-emerald-600 dark:text-emerald-300">{approvedPartnerBanner.pin}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/${approvedPartnerBanner.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(
                `*السلام علیکم ${approvedPartnerBanner.name}!*\nآپ کی اسٹون ایکسپرٹ پارٹنرشپ درخواست منظور ہو گئی ہے۔\n\n*پورٹل لنک:* https://stoneexpert.net/supplier\n*آپ کا خفیہ PIN:* ${approvedPartnerBanner.pin}\n\nلنک کھول کر اپنا PIN درج کریں اور اپنے ماربل، گرینائٹ و ٹائلز کے ریٹس اور تصاویر اپلوڈ کریں۔ شکریہ!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"
            >
              <Send className="h-3.5 w-3.5" />
              <span>واٹس ایپ پر PIN بھیجیں</span>
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setApprovedPartnerBanner(null)}
              className="h-8 text-xs"
            >
              بند کریں
            </Button>
          </div>
        </div>
      )}

      {/* 1.45 PENDING PARTNER WITH US / NEW SUPPLIER APPLICATIONS */}
      {partnerApplications.filter(a => a.status === 'pending').length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
                <Handshake className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  نئی پارٹنرشپ درخواستیں (Partner With Us Applications)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  ویب سائٹ ہیڈر کے &quot;Partner With Us&quot; بٹن سے آنے والی نئی فیکٹریز — منظور کریں اور فوری PIN جاری کریں۔
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-extrabold text-[10px] py-0.5 px-2.5 rounded-full">
              {partnerApplications.filter(a => a.status === 'pending').length} Pending
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {partnerApplications
              .filter(a => a.status === 'pending')
              .map(app => (
                <div
                  key={app.id}
                  className="bg-background border border-border rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      {app.factoryImageUrl ? (
                        <img
                          src={app.factoryImageUrl}
                          alt={app.factoryName}
                          className="h-12 w-12 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-foreground truncate">
                          {app.factoryName}
                        </div>
                        {app.contactPerson && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{app.contactPerson}</span>
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{app.phone}</span>
                        </div>
                      </div>
                    </div>

                    {(app.city || app.address) && (
                      <div className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span>{[app.address, app.city].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    {Array.isArray(app.categories) && app.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {app.categories.map(cat => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground/80"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {app.notes && (
                      <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2">
                        {app.notes}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <Input
                        value={appCustomPins[app.id] || ''}
                        onChange={e =>
                          setAppCustomPins(prev => ({ ...prev, [app.id]: e.target.value }))
                        }
                        placeholder="مخصوص PIN (خالی چھوڑیں تو آٹو بنے گا)"
                        className="h-7 text-[11px] font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        disabled={approvingAppId === app.id}
                        onClick={async () => {
                          setApprovingAppId(app.id);
                          try {
                            const res = await approveSupplierApplication(app.id, appCustomPins[app.id]);
                            if (res.success && res.supplier) {
                              setApprovedPartnerBanner({
                                name: res.supplier.name,
                                phone: res.supplier.phone,
                                pin: res.supplier.accessPassword || ''
                              });
                              toast({
                                title: 'پارٹنر منظور ہو گیا! ✅',
                                description: `${res.supplier.name} کا PIN (${res.supplier.accessPassword}) تیار ہے۔`
                              });
                              fetchData();
                            } else {
                              toast({
                                variant: 'destructive',
                                title: 'Approval Failed',
                                description: res.error || 'Could not approve application'
                              });
                            }
                          } finally {
                            setApprovingAppId(null);
                          }
                        }}
                        className="flex-1 h-8 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>منظور کریں اور PIN بنائیں</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={approvingAppId === app.id}
                        onClick={async () => {
                          setApprovingAppId(app.id);
                          try {
                            const res = await rejectSupplierApplication(app.id);
                            if (res.success) {
                              toast({ title: 'درخواست مسترد کر دی گئی۔' });
                              fetchData();
                            }
                          } finally {
                            setApprovingAppId(null);
                          }
                        }}
                        className="h-8 px-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 1.5 PENDING SUPPLIER PROPOSALS NOTIFICATION BOX (EXISTING VS. NEW PRODUCT + INLINE RATE ADJUSTER) */}
      {proposals.filter(p => p.status === 'pending').length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  📬 نئی سپلائر ریکویسٹس (Pending Supplier Requests)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  موجودہ پروڈکٹ برقرار رہے گا؛ نیا پروڈکٹ الگ بیج کے ساتھ نظر آئے گا — یہیں سے اپنا ایپ ریٹ سیٹ کر کے ایکسیپٹ کریں۔
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-extrabold text-[10px] py-0.5 px-2.5 rounded-full">
              {proposals.filter(p => p.status === 'pending').length} Action Required
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {proposals.filter(p => p.status === 'pending').map((prop) => {
              const normalizedName = (prop.productName || '').trim().toLowerCase();
              const matchedExisting = marbles.find(
                m => (m.name || '').trim().toLowerCase() === normalizedName
              );
              const existingAppPrice = matchedExisting?.variants?.[0]?.price || 0;
              const defaultSellingRate = matchedExisting && existingAppPrice > 0
                ? existingAppPrice
                : Math.round((prop.rate || 0) * 1.2);
              const rawInput = proposalSellingPrices[prop.id];
              const currentSellingPrice = rawInput !== undefined ? Number(rawInput) : defaultSellingRate;
              const marginPct = prop.rate > 0 && currentSellingPrice > 0
                ? Number((((currentSellingPrice - prop.rate) / prop.rate) * 100).toFixed(1))
                : 0;
              const supObj = suppliers.find(s => s.id === prop.supplierId);

              return (
                <div
                  key={prop.id}
                  className={cn(
                    "bg-background border rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs shadow-sm transition-colors",
                    matchedExisting
                      ? "border-border/80 hover:border-emerald-400/60"
                      : "border-indigo-500/40 hover:border-indigo-500 ring-1 ring-indigo-500/15"
                  )}
                >
                  <div className="space-y-2.5">
                    {/* Status Row: Existing vs NEW Product */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      {matchedExisting ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold">
                          موجودہ پروڈکٹ (Existing — Rate Link)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-extrabold">
                          <Sparkles className="h-2.5 w-2.5" />
                          نیا پروڈکٹ (NEW — ایپ میں شامل ہوگا)
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {prop.size || 'Standard'}
                      </span>
                    </div>

                    {/* Product Title, Supplier & Clickable Thumbnail */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-foreground text-sm block truncate" title={prop.productName}>
                          {prop.productName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                          {supObj?.factoryImageUrl && (
                            <img
                              src={supObj.factoryImageUrl}
                              alt={prop.supplierName}
                              className="h-4 w-4 rounded-full object-cover border border-border shrink-0"
                            />
                          )}
                          <span className="truncate">
                            سپلائر: <strong className="text-foreground">{prop.supplierName}</strong>
                          </span>
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{prop.materialType}</span>
                          <span>•</span>
                          <span>{prop.thickness || '6-Sutar'}</span>
                        </div>
                      </div>

                      {prop.imageUrl && (
                        <button
                          type="button"
                          onClick={() => openGallery([{ url: prop.imageUrl, alt: prop.productName }], 0)}
                          title="تصویر بڑی دیکھنے کے لیے کلک کریں"
                          className="h-14 w-14 rounded-lg overflow-hidden border border-border/60 shrink-0 bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={prop.imageUrl}
                            alt={prop.productName}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}
                    </div>

                    {/* Inline Rate Comparison & Admin App Rate Adjuster */}
                    <div className="bg-muted/35 border border-border/60 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">سپلائر ریٹ (Factory Cost):</span>
                        <span className="font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                          Rs {prop.rate.toLocaleString()} /{prop.unit || 'sqft'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-foreground">
                            ہمارا ایپ ریٹ (App Rate PKR):
                          </label>
                          <span
                            className={cn(
                              "font-mono tabular-nums text-[10px] font-extrabold px-1.5 py-0.5 rounded",
                              marginPct > 0
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : marginPct < 0
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-2 text-[10px] font-mono font-bold text-muted-foreground">Rs</span>
                            <Input
                              type="number"
                              value={rawInput !== undefined ? rawInput : String(defaultSellingRate)}
                              onChange={(e) =>
                                setProposalSellingPrices(prev => ({ ...prev, [prop.id]: e.target.value }))
                              }
                              className="h-8 pl-7 pr-2 text-right font-mono tabular-nums font-extrabold text-xs bg-background"
                            />
                          </div>
                          {[10, 15, 20, 30].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() =>
                                setProposalSellingPrices(prev => ({
                                  ...prev,
                                  [prop.id]: String(Math.round(prop.rate * (1 + pct / 100)))
                                }))
                              }
                              className="h-8 px-1.5 rounded border border-border/70 bg-background hover:bg-muted text-[10px] font-mono font-bold text-foreground cursor-pointer transition-colors"
                              title={`Set +${pct}% markup`}
                            >
                              +{pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accept / Reject Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={submitting}
                      onClick={() => handleRejectProposalClick(prop.id)}
                      className="h-8 text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2.5 rounded-lg cursor-pointer"
                    >
                      رد کریں (Reject)
                    </Button>
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() =>
                        handleApproveProposalClick(
                          prop.id,
                          !Number.isNaN(currentSellingPrice) && currentSellingPrice > 0
                            ? currentSellingPrice
                            : undefined
                        )
                      }
                      className={cn(
                        "h-8 text-[11px] font-extrabold text-white px-3 gap-1.5 rounded-lg cursor-pointer",
                        matchedExisting
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {matchedExisting ? 'ایکسیپٹ (ریٹ لنک کریں)' : 'ایکسیپٹ اور ایپ میں شامل کریں'}
                    </Button>
                  </div>
                </div>
              );
            })}
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
          <div className="admin-stock-grid grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 items-stretch">
            {filteredRows.map((row) => {
              // Find registered active supplier comparison rates for this specific product row id
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

      {/* 0. QUICK ADD SUPPLIER & UNIVERSAL LINK + PASSWORD DIALOG */}
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
              نیا سپلائر شامل کریں + پاسورڈ بنائیں
            </DialogTitle>
            <DialogDescription className="text-xs">
              تمام سپلائرز کے لیے ایک ہی لنک (stoneexpert.net/supplier) ہوگا — ہر سپلائر کو اس کا الگ پاسورڈ دیں گے تو اس کا اپنا پورٹل کھلے گا۔
            </DialogDescription>
          </DialogHeader>

          {quickGeneratedResult ? (
            /* GENERATED UNIVERSAL LINK + UNIQUE PIN SUCCESS VIEW */
            <div className="space-y-4 py-3 overflow-y-auto pr-1">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>سپلائر کامیابی سے رجسٹر ہو گیا اور پاسورڈ تیار ہے!</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <p><strong>Supplier:</strong> {quickGeneratedResult.supplier.name}</p>
                  <p><strong>Phone / WhatsApp:</strong> {quickGeneratedResult.supplier.phone}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <strong className="text-foreground">مخصوص پاسورڈ / PIN:</strong>
                    <span className="font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/40 text-sm tracking-widest">
                      {quickGeneratedResult.supplier.accessPassword}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <strong className="text-foreground">مجاز کیٹگریز:</strong>
                    {(Array.isArray(quickGeneratedResult.allowedCategories) ? quickGeneratedResult.allowedCategories : []).map(cat => (
                      <Badge key={cat} variant="secondary" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Lock className="h-2.5 w-2.5 mr-1" /> {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Single Universal Portal Link & PIN Box */}
              <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                    سنگل سپلائر پورٹل لنک (سب سپلائرز کے لیے ایک ہی لنک):
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={getUniversalVendorUrl()} 
                    className="h-10 text-xs font-mono font-bold bg-background text-foreground"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      handleCopyUniversalLinkWithPassword(quickGeneratedResult.supplier);
                      setCopiedQuickLink(true);
                      setTimeout(() => setCopiedQuickLink(false), 3000);
                    }}
                    className={cn(
                      "h-10 px-4 text-xs font-bold text-white shrink-0 gap-1.5 cursor-pointer",
                      copiedQuickLink ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                    )}
                  >
                    {copiedQuickLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedQuickLink ? 'کاپی ہو گیا!' : 'لنک اور پاسورڈ کاپی کریں'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  جب سپلائر یہ لنک کھول کر پاسورڈ (<span className="font-mono font-bold text-foreground">{quickGeneratedResult.supplier.accessPassword}</span>) درج کرے گا تو پہلے مرحلے میں اپنی فیکٹری کی تفصیلات و تصویر لگائے گا اور اگلے مرحلے میں مٹیریل، ریٹ اور تصاویر سبمٹ کر سکے گا۔
                </p>
              </div>

              {/* 1-Click WhatsApp Send */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => handleSendVendorWhatsApp(quickGeneratedResult.supplier)}
                  className="h-11 flex-1 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  واٹس ایپ پر لنک اور پاسورڈ بھیجیں (WhatsApp)
                </Button>

                <Link href="/supplier" target="_blank">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4 text-xs font-bold border-slate-300 dark:border-slate-700 gap-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4" />
                    پورٹل چیک کریں
                  </Button>
                </Link>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickSupplierName('');
                    setQuickSupplierPhone('');
                    setQuickSupplierPassword(`${Math.floor(1000 + Math.random() * 9000)}`);
                    setQuickAllowedCategories(['Marble', 'Granite']);
                    setQuickGeneratedResult(null);
                    setCopiedQuickLink(false);
                  }}
                  className="text-xs font-bold"
                >
                  + ایک اور سپلائر شامل کریں
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
                    سپلائر / فیکٹری کا نام *
                  </Label>
                  <Input 
                    id="quick_name"
                    value={quickSupplierName}
                    onChange={(e) => setQuickSupplierName(e.target.value)}
                    placeholder="مثال: مکہ ماربل فیکٹری"
                    required
                    className="h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quick_phone" className="text-xs font-bold">
                    فون یا واٹس ایپ نمبر *
                  </Label>
                  <Input 
                    id="quick_phone"
                    value={quickSupplierPhone}
                    onChange={(e) => setQuickSupplierPhone(e.target.value)}
                    placeholder="مثال: 03001234567"
                    required
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Custom Unique Password / PIN for this Supplier */}
              <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quick_password" className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                    <span>سپلائر کا مخصوص پاسورڈ / PIN</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setQuickSupplierPassword(`${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    + نیا PIN بنائیں
                  </button>
                </div>
                <Input
                  id="quick_password"
                  value={quickSupplierPassword}
                  onChange={(e) => setQuickSupplierPassword(e.target.value)}
                  placeholder="خالی چھوڑیں تو خودکار منفرد PIN بن جائے گا"
                  className="h-9 text-xs font-mono font-bold tracking-widest bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  سب سپلائرز کو ایک ہی لنک (<span className="font-mono font-bold">{getUniversalVendorUrl()}</span>) ملے گا؛ یہ پاسورڈ ڈالنے پر اس سپلائر کا اپنا پورٹل کھل جائے گا۔
                </p>
              </div>

              {/* Cutting Optimizer Exclusive Tool Access Toggle */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-emerald-500" />
                    <span>کٹنگ آپٹیمائزر رسائی (Cutting Optimizer Access)</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    اگر یہ آن ہو تو اس سپلائر / خاص شخص کو اپنے پورٹل کے اندر Cutting Optimizer Pro ٹول استعمال کرنے کی اجازت ہوگی۔
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickAllowCuttingOptimizer(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 border transition-all cursor-pointer ${
                    quickAllowCuttingOptimizer
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {quickAllowCuttingOptimizer ? 'ON / آن ✓' : 'OFF / بند'}
                </button>
              </div>

              {/* CATEGORY ALLOW SYSTEM / مجاز کیٹگریز کا انتخاب */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-indigo-500" />
                      الاؤ کیٹگریز کا انتخاب (Allowed Categories) *
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/20">
                  {dynamicCategories.map((cat) => {
                    const isSelected = quickAllowedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleQuickCategory(cat.id)}
                        className={`p-2 rounded-lg border text-left transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground shadow-sm'
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
                  className="h-9 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {submitting ? 'محفوظ ہو رہا ہے...' : 'سپلائر محفوظ کریں اور پاسورڈ حاصل کریں'}
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

            {/* Cutting Optimizer Access Permission Toggle */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-emerald-500" />
                  <span>کٹنگ آپٹیمائزر رسائی (Cutting Optimizer Pro)</span>
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  اس سپلائر یا خاص فرد کے پورٹل میں کٹنگ آپٹیمائزر ٹول آن یا آف کریں۔
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSupplierForm(prev => ({ ...prev, allowCuttingOptimizer: !prev.allowCuttingOptimizer }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 border transition-all cursor-pointer ${
                  supplierForm.allowCuttingOptimizer
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {supplierForm.allowCuttingOptimizer ? 'ON / آن ✓' : 'OFF / بند'}
              </button>
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
                <Label className="text-[11px] font-bold text-foreground">
                  سنگل پورٹل لنک اور پاسورڈ شیئر کریں ({getUniversalVendorUrl()})
                </Label>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm" 
                    onClick={() => handleCopyUniversalLinkWithPassword(editingSupplier)}
                    className="h-8 flex-1 text-xs font-bold border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1.5 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> لنک اور پاسورڈ کاپی کریں
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => handleSendVendorWhatsApp(editingSupplier)}
                    className="h-8 flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" /> WhatsApp پر بھیجیں
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
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {sup.factoryImageUrl && (
                            <button
                              type="button"
                              onClick={() => openGallery([{ url: sup.factoryImageUrl!, alt: sup.name }], 0)}
                              className="h-11 w-11 rounded-lg overflow-hidden border border-border shrink-0 bg-muted cursor-pointer hover:opacity-90"
                              title="فیکٹری کی تصویر دیکھیں"
                            >
                              <img
                                src={sup.factoryImageUrl}
                                alt={sup.name}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          )}
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
                            <button
                              type="button"
                              onClick={() => handleToggleSupplierCuttingOptimizer(sup)}
                              title="کلک کر کے اس سپلائر کے لیے کٹنگ آپٹیمائزر آن یا آف کریں"
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer ${
                                sup.allowCuttingOptimizer !== false
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-slate-500/10 text-muted-foreground border-border hover:bg-muted'
                              }`}
                            >
                              <Scissors className="h-2.5 w-2.5" />
                              <span>{sup.allowCuttingOptimizer !== false ? 'کٹنگ آپٹیمائزر: آن' : 'کٹنگ آپٹیمائزر: بند'}</span>
                            </button>
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
                            {(() => {
                              const allowedList = Array.isArray(sup.allowedCategories)
                                ? sup.allowedCategories
                                : typeof sup.allowedCategories === 'string'
                                  ? String(sup.allowedCategories).split(',').map(s => s.trim()).filter(Boolean)
                                  : [];
                              if (allowedList.length === 0) {
                                return (
                                  <Badge variant="secondary" className="text-[9px] h-4 py-0 font-normal text-muted-foreground">
                                    All Categories (تمام)
                                  </Badge>
                                );
                              }
                              return allowedList.map(cat => (
                                <Badge key={cat} variant="secondary" className="text-[9px] h-4 py-0 font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                  {cat}
                                </Badge>
                              ));
                            })()}
                          </div>
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

      {/* 4. SINGLE UNIVERSAL SUPPLIER LINK & PER-SUPPLIER PASSWORD DIALOG */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-foreground flex items-center gap-2 text-lg">
              <Share2 className="h-5 w-5 text-emerald-600" />
              سنگل سپلائر پورٹل لنک اور پاسورڈ (Universal Link)
            </DialogTitle>
            <DialogDescription className="text-xs">
              سب سپلائرز کے لیے ایک ہی لنک ہے — بس سپلائر منتخب کریں اور اسے لنک + اس کا الگ پاسورڈ بھیج دیں۔
            </DialogDescription>
          </DialogHeader>

          {suppliers.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">ابھی کوئی سپلائر رجسٹر نہیں ہے۔ پہلے سپلائر شامل کریں۔</p>
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
            const universalUrl = getUniversalVendorUrl();

            return (
              <div className="space-y-4 py-2">
                {/* 1. Select Supplier */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">1. سپلائر منتخب کریں (Select Vendor) *</Label>
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

                {/* 2. Single Universal Link & Selected Supplier's Password */}
                <div className="space-y-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>سنگل پورٹل لنک (سب کے لیے ایک ہی لنک)</span>
                    </Label>
                    <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded border border-amber-500/40 tracking-widest">
                      PIN: {activeSupplier?.accessPassword || '7861'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={universalUrl} 
                      className="h-9 text-xs font-mono font-bold bg-background text-foreground"
                    />
                    <Button 
                      type="button" 
                      onClick={() => activeSupplier && handleCopyUniversalLinkWithPassword(activeSupplier)}
                      className="h-9 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      لنک اور پاسورڈ کاپی کریں
                    </Button>
                  </div>

                  {activeSupplier?.phone && (
                    <p className="text-[11px] text-muted-foreground">
                      واٹس ایپ / فون: <strong className="text-foreground font-mono">{activeSupplier.phone}</strong>
                    </p>
                  )}
                </div>

                {/* 3. Action Buttons */}
                <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                  <Button 
                    type="button"
                    onClick={() => activeSupplier && handleSendVendorWhatsApp(activeSupplier)}
                    className="h-10 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm cursor-pointer flex-1"
                  >
                    <Share2 className="h-4 w-4" />
                    واٹس ایپ پر لنک اور پاسورڈ بھیجیں
                  </Button>
                  
                  <Link href="/supplier" target="_blank">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="h-10 px-3 text-xs font-bold border-slate-300 dark:border-slate-700 gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      پورٹل کھولیں
                    </Button>
                  </Link>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> سپلائر پورٹل کیسے کام کرتا ہے:
                  </p>
                  <p>1. سپلائر اس ایک ہی لنک پر جا کر اپنا مخصوص پاسورڈ لگائے گا تو اس کا اپنا پورٹل کھل جائے گا۔</p>
                  <p>2. پہلی بار وہ اپنی فیکٹری کا نام، تصویر، فون نمبر اور ایڈریس درج کرے گا۔</p>
                  <p>3. اس کے بعد اپنے مٹیریل، ریٹ اور تصویر شامل کر کے سبمٹ کرے گا تو ریکویسٹ سیدھی آپ کے ایڈمن پینل میں آ جائے گی۔</p>
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

// Compact visual Stock Card with overlaid live App Rate and per-supplier active rate + +/- percentage rows
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
  onEditSale
}: {
  row: any;
  currentRates: { supplierName: string; rate: number; supplierId: string; rateMaterialId: string }[];
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
  const { openGallery } = useFullscreenImage();

  // Controlled App Retail Price input synced with upstream updates
  const [appPriceInput, setAppPriceInput] = useState<string>(String(row.price ?? 0));
  useEffect(() => {
    setAppPriceInput(String(row.price ?? 0));
  }, [row.price]);

  // Inline quick-edit state for an active supplier row
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [inlineCostInput, setInlineCostInput] = useState<string>('');

  // Link/Configure Wholesaler Rate modal state
  const [isRateDialogOpen, setIsRateDialogOpen] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [dialogAppRate, setDialogAppRate] = useState<string>('0');
  const [dialogProfit, setDialogProfit] = useState<string>('0');

  // Compute live customer-facing App Rate (accounting for active sale/discount)
  const hasSale = Boolean(row.onSale || (row.discount && row.discount > 0));
  const basePrice = Number(row.price || 0);
  const effectiveAppPrice = (() => {
    if (!hasSale || !row.discount || row.discount <= 0 || basePrice <= 0) return basePrice;
    if (row.discountType === 'fixed') {
      return Math.max(1, Math.round(basePrice - row.discount));
    }
    return Math.max(1, Math.round(basePrice * (1 - row.discount / 100)));
  })();

  const commitAppPrice = () => {
    const val = Number(appPriceInput);
    if (!Number.isNaN(val) && val >= 0 && val !== row.price) {
      if (row.type === 'marble') {
        handleMarblePriceUpdate(row.productId, row.variantId || '', val);
      } else {
        handleFixingMaterialPriceUpdate(row.productId, val);
      }
    } else if (Number.isNaN(val) || val < 0) {
      setAppPriceInput(String(row.price ?? 0));
    }
  };

  const openLinkSupplierModal = () => {
    const activeSuppliers = suppliers.filter(s => s.status !== 'inactive');
    const firstUnlinked = activeSuppliers.find(s => !currentRates.some(r => r.supplierId === s.id));
    const defaultSup = firstUnlinked || activeSuppliers[0] || suppliers[0];
    setSelectedSupplierId(defaultSup ? defaultSup.id : '');
    setDialogAppRate(String(effectiveAppPrice || basePrice || 0));
    setDialogProfit('0');
    setIsRateDialogOpen(true);
  };

  const selectedVendor = suppliers.find(s => s.id === selectedSupplierId);
  const calculatedCost = Math.max(0, Number(dialogAppRate || 0) - Number(dialogProfit || 0));

  const formatMarkupPct = (supplierRate: number) => {
    if (!supplierRate || supplierRate <= 0) return { label: '—', tone: 'neutral' as const };
    const diffPct = ((effectiveAppPrice - supplierRate) / supplierRate) * 100;
    const rounded = Number(diffPct.toFixed(1));
    if (Math.abs(rounded) < 0.05) {
      return { label: '0%', tone: 'neutral' as const };
    }
    if (rounded > 0) {
      return { label: `+${rounded}%`, tone: 'positive' as const };
    }
    return { label: `${rounded}%`, tone: 'negative' as const };
  };

  const handleOpenPhoto = () => {
    const gallery = buildProductGallery(row.imageUrl, row.baseName || row.name, row.gallery);
    if (gallery.length > 0) {
      openGallery(gallery, 0);
    }
  };

  const statusBadgeMeta = (() => {
    switch (row.availability) {
      case 'in_stock':
        return { label: 'In Stock', className: 'bg-emerald-600/90 text-white' };
      case 'out_of_stock':
        return { label: 'Out of Stock', className: 'bg-red-600/90 text-white' };
      case 'limited_stock':
        return { label: 'Limited', className: 'bg-amber-600/90 text-white' };
      case 'incoming':
        return { label: 'Incoming', className: 'bg-sky-600/90 text-white' };
      case 'coming_soon':
        return { label: 'Soon', className: 'bg-violet-600/90 text-white' };
      default:
        return { label: 'In Stock', className: 'bg-emerald-600/90 text-white' };
    }
  })();

  const lowestSupplierRate = currentRates.length > 1
    ? Math.min(...currentRates.map(r => r.rate))
    : null;

  return (
    <Card
      id={`row-${row.rowId}`}
      className={cn(
        "admin-stock-table-row border border-border/80 rounded-xl overflow-hidden bg-card flex flex-col transition-colors duration-150 hover:border-primary/40 shadow-sm",
        row.isHidden && "opacity-75"
      )}
    >
      {/* 1. COMPACT FULL-BLEED PHOTO HEADER WITH LIVE APP RATE & STOCK STATUS OVERLAY */}
      <div
        onClick={handleOpenPhoto}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenPhoto();
          }
        }}
        title="Click to view full-size image"
        className="relative h-32 w-full overflow-hidden bg-muted group cursor-pointer shrink-0 select-none"
      >
        <Image
          src={row.imageUrl}
          alt={row.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          unoptimized={typeof row.imageUrl === 'string' && row.imageUrl.startsWith('data:')}
        />

        {/* Top Row Over Image: Stock Status / Sale Flag & Storefront Visibility Toggle */}
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1 min-w-0">
            <span className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-sm backdrop-blur-sm",
              statusBadgeMeta.className
            )}>
              {statusBadgeMeta.label}
            </span>
            {hasSale && (
              <span className="inline-flex items-center gap-0.5 rounded bg-red-600/95 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
                <Flame className="h-2.5 w-2.5 fill-amber-300 text-amber-200 shrink-0" />
                {formatSaleBadgeText({
                  discount: row.discount,
                  discountType: row.discountType,
                  saleBadgeText: row.saleBadgeText
                })}
              </span>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md bg-black/65 backdrop-blur-sm px-1.5 py-0.5 border border-white/15 shrink-0"
            title={row.isHidden ? 'Hidden from app storefront' : 'Visible in app storefront'}
          >
            <Switch
              checked={!row.isHidden}
              onCheckedChange={() => {
                if (row.type === 'marble') {
                  handleMarbleVisibilityToggle(row.productId, row.isHidden);
                } else {
                  handleFixingMaterialVisibilityToggle(row.productId, row.isHidden);
                }
              }}
              className="scale-[0.65] -mx-1"
            />
            <span className={cn(
              "text-[10px] font-bold tracking-tight",
              row.isHidden ? "text-white/60" : "text-emerald-300"
            )}>
              {row.isHidden ? 'Off' : 'Live'}
            </span>
          </div>
        </div>

        {/* Bottom Scrim: Product Title + Variant on Left, Live App Rate on Right */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-2 px-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-headline text-xs font-extrabold text-white leading-tight truncate drop-shadow-sm">
              {row.baseName || row.name}
            </h4>
            {row.variantLabel && (
              <p className="text-[10px] font-medium text-white/80 truncate leading-tight mt-0.5">
                {row.variantLabel}
              </p>
            )}
          </div>

          {/* Live App Rate Overlay */}
          <div className="text-right shrink-0 pl-1">
            <span className="block text-[9px] uppercase tracking-wider font-semibold text-white/75 leading-none">
              App Rate
            </span>
            {hasSale && effectiveAppPrice < basePrice ? (
              <div className="flex flex-col items-end leading-tight mt-0.5">
                <span className="text-[10px] font-mono tabular-nums line-through text-white/60 leading-none">
                  Rs {basePrice.toLocaleString()}
                </span>
                <span className="text-sm font-black font-mono tabular-nums text-amber-300 leading-tight">
                  Rs {effectiveAppPrice.toLocaleString()}
                  <span className="text-[9px] font-semibold text-white/80">/{row.unit || 'sqft'}</span>
                </span>
              </div>
            ) : (
              <span className="block text-sm font-black font-mono tabular-nums text-white leading-tight mt-0.5">
                Rs {effectiveAppPrice.toLocaleString()}
                <span className="text-[9px] font-semibold text-white/80">/{row.unit || 'sqft'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. ACTIVE SUPPLIERS SECTION: ONE DEDICATED ROW PER ON/ACTIVE SUPPLIER */}
      <div className="flex-1 flex flex-col">
        <div className="px-2.5 py-1.5 bg-muted/35 border-b border-border/50 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Active Suppliers ({currentRates.length})
          </span>
          <button
            type="button"
            onClick={openLinkSupplierModal}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add Rate
          </button>
        </div>

        {currentRates.length === 0 ? (
          <div className="px-2.5 py-3 text-[11px] text-muted-foreground text-center flex-1 flex items-center justify-center">
            <span>No active supplier ON — click + Add Rate</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {currentRates.map((r) => {
              const pct = formatMarkupPct(r.rate);
              const isExpanded = expandedSupplierId === r.supplierId;
              const diffRs = effectiveAppPrice - r.rate;

              return (
                <div key={r.supplierId} className="text-xs">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedSupplierId(null);
                      } else {
                        setExpandedSupplierId(r.supplierId);
                        setInlineCostInput(String(r.rate));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isExpanded) {
                          setExpandedSupplierId(null);
                        } else {
                          setExpandedSupplierId(r.supplierId);
                          setInlineCostInput(String(r.rate));
                        }
                      }
                    }}
                    title={`Click to edit ${r.supplierName} cost rate (${diffRs >= 0 ? '+' : ''}Rs ${diffRs.toLocaleString()})`}
                    className={cn(
                      "px-2.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-muted/35",
                      isExpanded && "bg-muted/40"
                    )}
                  >
                    <span className="font-semibold text-foreground truncate min-w-0 flex-1 text-[11px] flex items-center gap-1">
                      <span className="truncate">{r.supplierName}</span>
                      {lowestSupplierRate !== null && r.rate === lowestSupplierRate && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          Best
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono tabular-nums text-[11px] font-bold text-foreground">
                        Rs {r.rate.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "font-mono tabular-nums text-[10px] font-extrabold px-1.5 py-0.5 rounded min-w-[48px] text-center leading-tight",
                          pct.tone === 'positive' && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          pct.tone === 'negative' && "bg-red-500/15 text-red-700 dark:text-red-400",
                          pct.tone === 'neutral' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {pct.label}
                      </span>
                    </div>
                  </div>

                  {/* Quick Inline Rate Edit / Unlink Row */}
                  {isExpanded && (
                    <div className="px-2.5 py-2 bg-muted/25 border-t border-border/40 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">Rs</span>
                        <Input
                          type="number"
                          value={inlineCostInput}
                          onChange={(e) => setInlineCostInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = Number(inlineCostInput);
                              if (!Number.isNaN(val) && val > 0 && val !== r.rate) {
                                handleVendorRateChange(r.supplierId, r.rateMaterialId, val);
                              }
                              setExpandedSupplierId(null);
                            }
                          }}
                          className="h-7 px-1.5 text-right font-mono tabular-nums text-xs font-bold bg-background border-border/80"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-[10px] font-bold shrink-0"
                          onClick={() => {
                            const val = Number(inlineCostInput);
                            if (!Number.isNaN(val) && val > 0 && val !== r.rate) {
                              handleVendorRateChange(r.supplierId, r.rateMaterialId, val);
                            }
                            setExpandedSupplierId(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Copy Universal Portal Link & PIN"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            const matchedSup = suppliers.find(s => s.id === r.supplierId);
                            const pin = matchedSup?.accessPassword || '7861';
                            const portalUrl = `${getPublicOrigin()}/supplier`;
                            navigator.clipboard.writeText(`پورٹل لنک: ${portalUrl}\nپاسورڈ / PIN: ${pin}`);
                            toast({
                              title: "لنک اور پاسورڈ کاپی ہو گیا",
                              description: `${r.supplierName} کے لیے سنگل پورٹل لنک اور PIN (${pin}) کاپی ہو گیا۔`
                            });
                          }}
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Remove supplier rate"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            handleDeleteVendorRate(r.supplierId, r.rateMaterialId);
                            setExpandedSupplierId(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. COMPACT FOOTER CONTROLS: EDIT APP RATE, STOCK STATUS, SALE */}
      <div className="mt-auto border-t border-border/60 bg-muted/20 p-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 items-center">
        {/* Inline App Rate Input */}
        <div className="relative flex items-center" title="Edit App Retail Rate (PKR)">
          <span className="absolute left-2 text-[10px] text-muted-foreground font-mono font-bold pointer-events-none">
            Rs
          </span>
          <Input
            type="number"
            value={appPriceInput}
            onChange={(e) => setAppPriceInput(e.target.value)}
            onBlur={commitAppPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitAppPrice();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-7 w-full pl-7 pr-1.5 text-right font-mono tabular-nums font-bold text-xs border-border/80 bg-background"
          />
        </div>

        {/* Availability Select */}
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
          <SelectTrigger className={`h-7 text-[11px] font-bold px-2 border-border/80 ${getStatusBadgeClass(row.availability)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_stock" className="text-xs font-bold">Available</SelectItem>
            <SelectItem value="out_of_stock" className="text-xs font-bold">Out of stock</SelectItem>
            <SelectItem value="incoming" className="text-xs font-bold">Incoming</SelectItem>
            <SelectItem value="limited_stock" className="text-xs font-bold">Limited</SelectItem>
            <SelectItem value="coming_soon" className="text-xs font-bold">Coming soon</SelectItem>
          </SelectContent>
        </Select>

        {/* Sale & Discount Trigger */}
        <button
          type="button"
          onClick={() => onEditSale && onEditSale(row)}
          className={cn(
            "h-7 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer shrink-0",
            hasSale
              ? "bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border-red-500/30"
              : "bg-background hover:bg-muted text-muted-foreground border-border/80 hover:text-foreground"
          )}
          title="Configure Sale & Discount"
        >
          {hasSale ? (
            <>
              <Flame className="h-3 w-3 fill-red-500 text-red-500 shrink-0" />
              <span className="font-mono tabular-nums">
                {row.discountType === 'fixed' ? `-${row.discount}` : `-${row.discount}%`}
              </span>
            </>
          ) : (
            <Tag className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Dynamic Wholesaler Rate configuration Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="font-headline font-extrabold text-white flex items-center gap-1.5">
              <DollarSign className="h-5 w-5 text-indigo-400" />
              Link Active Supplier Rate
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Select a supplier and set their cost rate for <strong className="text-white">&quot;{row.title || row.name}&quot;</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Supplier</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white font-bold">
                  <SelectValue placeholder="Choose supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(sup => (
                    <SelectItem key={sup.id} value={sup.id} className="text-xs font-semibold">
                      {sup.name}{sup.status === 'inactive' ? ' (Inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`app-rate-${row.rowId}`} className="text-slate-300 font-bold">Our App&apos;s Rate (Retail Selling Price - PKR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-bold">PKR</span>
                <Input
                  id={`app-rate-${row.rowId}`}
                  type="number"
                  placeholder="Enter our retail rate"
                  value={dialogAppRate}
                  onChange={(e) => setDialogAppRate(e.target.value)}
                  className="pl-12 bg-slate-950 border-slate-800 text-white font-extrabold font-mono tabular-nums focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`profit-rate-${row.rowId}`} className="text-slate-300 font-bold">Our Profit (PKR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-indigo-400 font-mono font-bold">PKR</span>
                <Input
                  id={`profit-rate-${row.rowId}`}
                  type="number"
                  placeholder="Enter your target profit margin"
                  value={dialogProfit}
                  onChange={(e) => setDialogProfit(e.target.value)}
                  className="pl-12 bg-slate-950 border-slate-800 text-white font-extrabold font-mono tabular-nums focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>App&apos;s Retail Rate:</span>
                <span className="font-mono tabular-nums font-bold text-slate-200">PKR {Number(dialogAppRate || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Minus Profit:</span>
                <span className="font-mono tabular-nums font-bold text-indigo-400">- PKR {Number(dialogProfit || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between items-center text-white">
                <span className="font-extrabold">Supplier Cost Rate:</span>
                <span className="font-mono tabular-nums font-extrabold text-emerald-400 text-sm">
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
              disabled={!selectedSupplierId || calculatedCost <= 0}
              onClick={() => {
                if (!selectedSupplierId) return;
                handleVendorRateChange(selectedSupplierId, row.rowId, calculatedCost);
                setIsRateDialogOpen(false);
                toast({
                  title: "Contract Rate Connected",
                  description: `Assigned cost rate of PKR ${calculatedCost.toLocaleString()} for "${selectedVendor?.name || 'Supplier'}".`,
                });
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold"
            >
              Confirm & Link Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
