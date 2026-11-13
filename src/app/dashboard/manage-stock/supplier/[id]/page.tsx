'use client';

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getSupplierById, 
  saveSupplier, 
  getSupplierRateRequests, 
  approveSupplierRateRequest, 
  rejectSupplierRateRequest,
  getSupplierProposals,
  approveSupplierProposal,
  rejectSupplierProposal,
  getMarbles,
  getFixingMaterials,
  updateMarbleDetails,
  updateFixingMaterialFields,
  updateSupplierPassword,
  getAlMajeedRates,
  Supplier, 
  SupplierRate,
  SupplierRateRequest,
  SupplierProposal
} from '@/lib/admin-actions';
import { SupplierRateSheetMatrix } from '@/components/supplier-rate-sheet-matrix';
import type { Marble, FixingMaterial } from '@/lib/types';
import { getPublicOrigin } from '@/lib/utils';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  DollarSign, 
  Package,
  Sliders,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  Percent,
  Share2,
  ExternalLink,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminSupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params?.id as string;

  // Data States
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [rateRequests, setRateRequests] = useState<SupplierRateRequest[]>([]);
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [fixingMaterials, setFixingMaterials] = useState<FixingMaterial[]>([]);
  
  // Rate Editing Local State (for admin direct adjust)
  const [editedRates, setEditedRates] = useState<{ [rateId: string]: string }>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  // Profit Ratio & Bulk Auto-Calculator state/helpers
  const [bulkProfitRatio, setBulkProfitRatio] = useState<number>(15);
  const [applyingBulk, setApplyingBulk] = useState<boolean>(false);

  // Product Rate Editing Local State (selling price)
  const [editedProductRates, setEditedProductRates] = useState<{ [materialId: string]: string }>({});
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  // Bulk Product Selling Price Markup state
  const [bulkProductMarkupPercent, setBulkProductMarkupPercent] = useState<number>(10);
  const [applyingBulkMarkup, setApplyingBulkMarkup] = useState<boolean>(false);

  // Supplier Portal Password State
  const [editingPassword, setEditingPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rateViewMode, setRateViewMode] = useState<'matrix' | 'detailed'>('matrix');

  const getRowMargin = (rateId: string, rateValue: number, compRate: number | null) => {
    if (compRate === null || compRate <= 0) return 0;
    const currentRateStr = editedRates[rateId];
    const currentRate = currentRateStr !== undefined ? Number(currentRateStr) : rateValue;
    if (isNaN(currentRate) || currentRate <= 0) return 0;
    return Math.round(((compRate - currentRate) / compRate) * 100);
  };

  const handleMarginChange = (rateId: string, compRate: number, marginVal: number) => {
    const calculatedRate = compRate * (1 - (marginVal / 100));
    setEditedRates(prev => ({
      ...prev,
      [rateId]: String(Math.round(calculatedRate))
    }));
  };

  const handleBulkProfitRatioApply = async () => {
    if (!supplier || !supplier.rates || supplier.rates.length === 0) {
      toast({
        title: "No materials",
        description: "There are no linked materials to update.",
        variant: "destructive"
      });
      return;
    }

    setApplyingBulk(true);
    try {
      let updatedCount = 0;
      const updatedRates = supplier.rates.map(rate => {
        const compRate = getComparisonRate(rate.materialId);
        if (compRate && compRate > 0) {
          updatedCount++;
          const calculatedRate = Math.round(compRate * (1 - (bulkProfitRatio / 100)));
          return {
            ...rate,
            rate: calculatedRate,
            lastUpdated: new Date().toISOString()
          };
        }
        return rate;
      });

      if (updatedCount === 0) {
        toast({
          title: "No updates applied",
          description: "None of the materials have a valid catalog price to calculate rates.",
          variant: "destructive"
        });
        setApplyingBulk(false);
        return;
      }

      const result = await saveSupplier({
        ...supplier,
        rates: updatedRates
      });

      if (result.success) {
        setSupplier(prev => prev ? { ...prev, rates: updatedRates } : null);
        
        // Update local editedRates state so inputs match
        const newEditedRates = { ...editedRates };
        updatedRates.forEach(r => {
          newEditedRates[r.id] = String(r.rate);
        });
        setEditedRates(newEditedRates);

        toast({
          title: "Bulk Profit Ratio Applied!",
          description: `Successfully updated ${updatedCount} material contract rates to a ${bulkProfitRatio}% profit ratio.`,
        });
      } else {
        throw new Error(result.error || "Failed to update supplier.");
      }
    } catch (err: any) {
      console.error("Failed to apply bulk profit ratio:", err);
      toast({
        title: "Bulk Update Failed",
        description: err.message || "An error occurred during bulk update.",
        variant: "destructive"
      });
    } finally {
      setApplyingBulk(false);
    }
  };

  // Update a single catalog/product price directly in the database
  const handleUpdateProductRate = async (materialId: string, newPrice: number) => {
    setUpdatingProductId(materialId);
    try {
      // 1. Check if it's a fixing material
      const isFixing = fixingMaterials.some(m => m.id === materialId);
      if (isFixing) {
        const res = await updateFixingMaterialFields(materialId, { price: newPrice });
        if (res.success) {
          // Update local state
          setFixingMaterials(prev => prev.map(m => m.id === materialId ? { ...m, price: newPrice } : m));
          setEditedProductRates(prev => ({ ...prev, [materialId]: String(newPrice) }));
          toast({
            title: "Product Rate Updated",
            description: `Successfully updated Fixing Material price to PKR ${newPrice.toLocaleString()}`,
          });
        } else {
          throw new Error(res.error || "Failed to update fixing material price");
        }
      } else {
        // 2. Find which marble has this ID or variant ID
        const [mId, vId] = materialId.includes('_') ? materialId.split('_') : [materialId, materialId];
        const baseMarble = marbles.find(m => {
          if (m.id === mId || m.id === materialId) return true;
          if (m.variants?.some(v => v.id === vId || v.id === materialId)) return true;
          return false;
        });

        if (baseMarble) {
          let updatedVariants = [...(baseMarble.variants || [])];
          if ((baseMarble.id === materialId || baseMarble.id === mId) && updatedVariants.length === 1 && (!vId || vId === mId)) {
            updatedVariants[0].price = newPrice;
          } else {
            // Find the specific variant
            updatedVariants = updatedVariants.map(v => (v.id === vId || v.id === materialId) ? { ...v, price: newPrice } : v);
          }

          const res = await updateMarbleDetails(baseMarble.id, { variants: updatedVariants });
          if (res.success) {
            // Update local state
            setMarbles(prev => prev.map(m => m.id === baseMarble.id ? { ...m, variants: updatedVariants } : m));
            setEditedProductRates(prev => ({ ...prev, [materialId]: String(newPrice) }));
            toast({
              title: "Product Rate Updated",
              description: `Successfully updated Marble variant price to PKR ${newPrice.toLocaleString()}`,
            });
          } else {
            throw new Error((res as any).error || "Failed to update marble price");
          }
        } else {
          throw new Error("Material not found in catalog");
        }
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Update Failed",
        description: e.message || "Could not save the updated product rate.",
        variant: "destructive"
      });
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Bulk Product Selling Price Markup over Supplier Cost Rates
  const handleBulkProductMarkup = async (percentage: number) => {
    if (!supplier || !supplier.rates || supplier.rates.length === 0) return;
    
    setApplyingBulkMarkup(true);
    try {
      // Local deep copies for batch update
      const localMarbles = JSON.parse(JSON.stringify(marbles)) as Marble[];
      const localFixing = JSON.parse(JSON.stringify(fixingMaterials)) as FixingMaterial[];
      
      const modifiedMarbleIds = new Set<string>();
      const modifiedFixingIds = new Set<string>();
      
      for (const rate of supplier.rates) {
        const supplierPrice = rate.rate;
        if (!supplierPrice || supplierPrice <= 0) continue;
        
        const targetProductPrice = Math.round(supplierPrice * (1 + percentage / 100));
        const materialId = rate.materialId;
        
        const [mId, vId] = materialId.includes('_') ? materialId.split('_') : [materialId, materialId];
        
        // 1. Check if fixing material
        const fixingIndex = localFixing.findIndex(m => m.id === mId || m.id === materialId);
        if (fixingIndex !== -1) {
          localFixing[fixingIndex].price = targetProductPrice;
          modifiedFixingIds.add(localFixing[fixingIndex].id);
        } else {
          // 2. Check if marble or variant
          const marbleIndex = localMarbles.findIndex(m => m.id === mId || m.id === materialId || m.variants?.some(v => v.id === vId || v.id === materialId));
          if (marbleIndex !== -1) {
            const marble = localMarbles[marbleIndex];
            marble.variants = (marble.variants || []).map(v => {
              if (v.id === vId || v.id === materialId || (marble.id === materialId && marble.variants?.[0]?.id === v.id)) {
                return { ...v, price: targetProductPrice };
              }
              return v;
            });
            modifiedMarbleIds.add(marble.id);
          }
        }
      }
      
      // Save all modified items to Firestore
      const promises: Promise<any>[] = [];
      
      modifiedFixingIds.forEach(id => {
        const mat = localFixing.find(m => m.id === id);
        if (mat) {
          promises.push(updateFixingMaterialFields(id, { price: mat.price }));
        }
      });
      
      modifiedMarbleIds.forEach(id => {
        const mar = localMarbles.find(m => m.id === id);
        if (mar) {
          promises.push(updateMarbleDetails(id, { variants: mar.variants }));
        }
      });
      
      await Promise.all(promises);
      
      // Update states
      setMarbles(localMarbles);
      setFixingMaterials(localFixing);
      
      // Update local edited product rate state values
      const newEditedProductRates = { ...editedProductRates };
      supplier.rates.forEach(rate => {
        if (rate.rate > 0) {
          const targetProductPrice = Math.round(rate.rate * (1 + percentage / 100));
          newEditedProductRates[rate.materialId] = String(targetProductPrice);
        }
      });
      setEditedProductRates(newEditedProductRates);
      
      toast({
        title: "Bulk Selling Prices Updated!",
        description: `Successfully marked up selling prices for all supplier products by +${percentage}%.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Bulk Update Failed",
        description: e.message || "An error occurred during bulk product price markup.",
        variant: "destructive"
      });
    } finally {
      setApplyingBulkMarkup(false);
    }
  };

  // Link copied state
  const [copied, setCopied] = useState(false);

  // Action Pending State
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [supData, allRequests, marblesData, fixingData] = await Promise.all([
        getSupplierById(id),
        getSupplierRateRequests(),
        getMarbles(),
        getFixingMaterials()
      ]);

      setMarbles(marblesData || []);
      setFixingMaterials(fixingData || []);

      if (supData) {
        setSupplier(supData);
        setEditingPassword(supData.accessPassword || '7861');
        // Initialize editedRates map
        const initialRates: { [key: string]: string } = {};
        const initialProductRates: { [key: string]: string } = {};
        if (supData.rates) {
          supData.rates.forEach(r => {
            initialRates[r.id] = String(r.rate);
            
            // Calculate comparison rate (selling price)
            let comp: number | null = null;
            const [mId, vId] = r.materialId.includes('_') ? r.materialId.split('_') : [r.materialId, r.materialId];
            const baseMarble = (marblesData || []).find(m => {
              if (m.id === mId || m.id === r.materialId) return true;
              return m.variants?.some(v => v.id === vId || v.id === r.materialId);
            });
            if (baseMarble) {
              const variant = baseMarble.variants?.find(v => v.id === vId || v.id === r.materialId);
              comp = variant ? variant.price : (baseMarble.variants?.[0]?.price || null);
            } else {
              const mat = (fixingData || []).find(m => m.id === mId || m.id === r.materialId);
              if (mat) comp = mat.price;
            }
            initialProductRates[r.materialId] = comp !== null ? String(comp) : '';
          });
        }
        setEditedRates(initialRates);
        setEditedProductRates(initialProductRates);
      }

      // Filter requests for this supplier
      const filteredRequests = allRequests.filter(req => req.supplierId === id);
      setRateRequests(filteredRequests);
    } catch (error) {
      console.error("Failed to load supplier admin data", error);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch supplier details from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin Direct Rate Adjustment
  const handleDirectRateSave = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const newValue = editedRates[rateObj.id];
    if (newValue === undefined || newValue === '' || isNaN(Number(newValue)) || Number(newValue) <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid positive number for the rate.",
        variant: "destructive"
      });
      return;
    }

    setSavingRateId(rateObj.id);
    try {
      const updatedRates = (supplier.rates || []).map(r => {
        if (r.id === rateObj.id) {
          return {
            ...r,
            rate: Number(newValue),
            lastUpdated: new Date().toISOString()
          };
        }
        return r;
      });

      const result = await saveSupplier({
        ...supplier,
        rates: updatedRates
      });

      if (result.success) {
        setSupplier(prev => prev ? { ...prev, rates: updatedRates } : null);
        toast({
          title: "Rate Updated Successfully",
          description: `Updated rate for ${rateObj.materialName} to PKR ${Number(newValue).toLocaleString()}.`,
        });
      } else {
        throw new Error(result.error || "Failed to update supplier profile.");
      }
    } catch (err: any) {
      console.error("Failed to update rate", err);
      toast({
        title: "Rate Update Failed",
        description: err.message || "An error occurred while saving the new rate.",
        variant: "destructive"
      });
    } finally {
      setSavingRateId(null);
    }
  };

  // Toggle Pause/Active on a rate (Admin side)
  const handleTogglePauseRate = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const currentStatus = rateObj.status || 'active';
    const nextStatus: 'active' | 'paused' = currentStatus === 'active' ? 'paused' : 'active';
    
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
          description: `Successfully ${nextStatus === 'paused' ? 'paused/cancelled' : 'resumed'} contract rate for "${rateObj.materialName}".`,
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

  // Delete rate link entirely from supplier profile (Admin side)
  const handleDeleteRate = async (rateObj: SupplierRate) => {
    if (!supplier) return;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete and cancel the product "${rateObj.materialName}" from this supplier's contract?`);
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
          title: "Product Contract Deleted",
          description: `Permanently removed "${rateObj.materialName}" from "${supplier.name}"'s active contract list.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Failed to delete rate:", err);
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete product from supplier contract.",
        variant: "destructive"
      });
    }
  };

  // Approve a Supplier's Rate Request
  const handleApproveRequest = async (requestId: string) => {
    setActioningId(requestId);
    try {
      const result = await approveSupplierRateRequest(requestId);
      if (result.success) {
        toast({
          title: "Request Approved",
          description: "Supplier's proposed rate is now active in the catalog.",
        });
        await loadData(); // Refresh supplier rates & requests
      } else {
        throw new Error(result.error || "Failed to approve request.");
      }
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred during approval.",
        variant: "destructive"
      });
    } finally {
      setActioningId(null);
    }
  };

  // Reject a Supplier's Rate Request
  const handleRejectRequest = async (requestId: string) => {
    setActioningId(requestId);
    try {
      const result = await rejectSupplierRateRequest(requestId);
      if (result.success) {
        toast({
          title: "Request Rejected",
          description: "Supplier's rate request has been declined.",
        });
        await loadData(); // Refresh supplier rates & requests
      } else {
        throw new Error(result.error || "Failed to reject request.");
      }
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred during rejection.",
        variant: "destructive"
      });
    } finally {
      setActioningId(null);
    }
  };

  // Copy Supplier Portal Link to Clipboard
  const copyPortalLink = () => {
    if (!supplier) return;
    const password = supplier.accessPassword || editingPassword || '7861';
    const portalUrl = `${getPublicOrigin()}/supplier/${supplier.id}?pin=${encodeURIComponent(password)}`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast({
      title: "پورٹل لنک کاپی ہو گیا! 📋",
      description: `Direct 1-click vendor upload link for ${supplier.name} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  // Copy Universal Link + Unique Password
  const copyUniversalLinkWithPassword = () => {
    if (!supplier) return;
    const universalUrl = `${getPublicOrigin()}/supplier`;
    const password = supplier.accessPassword || editingPassword || '7861';
    const textToCopy = `اسٹون ایکسپرٹ وینڈر پورٹل:\n🔗 پورٹل لنک: ${universalUrl}\n🔑 آپ کا پاسورڈ: ${password}\n\nاس لنک کو کھولیں اور اپنا پاسورڈ لگا کر اپنا اسٹاک اور ریٹس اپڈیٹ کریں۔`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "پورٹل لنک اور پاسورڈ کاپی ہو گیا! 📋",
      description: `Universal link & password for "${supplier.name}" copied to clipboard.`,
    });
  };

  // Save / Update Supplier Access Password
  const handleSavePassword = async () => {
    if (!supplier) return;
    const cleanPass = editingPassword.trim();
    if (!cleanPass) {
      toast({
        title: "پاسورڈ درکار ہے",
        description: "پاسورڈ خالی نہیں ہو سکتا۔",
        variant: "destructive"
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await updateSupplierPassword(supplier.id, cleanPass);
      if (res.success) {
        setSupplier(prev => prev ? ({ ...prev, accessPassword: cleanPass }) : null);
        toast({
          title: "پاسورڈ محفوظ ہو گیا! 🔑",
          description: `سپلائر "${supplier.name}" کے لیے نیا پاسورڈ محفوظ ہو گیا۔`,
        });
      } else {
        toast({
          title: "خرابی",
          description: res.error || "Failed to update password",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "خرابی",
        description: err.message || "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Generate random 4-digit PIN
  const handleGenerateRandomPin = () => {
    const randomPin = `${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingPassword(randomPin);
    toast({
      title: "نیا 4 ہندسوں کا پن بنایا گیا",
      description: `New PIN: ${randomPin}. Click "Save Password" to apply.`,
    });
  };

  // WhatsApp Direct Share
  const handleWhatsAppShare = () => {
    if (!supplier) return;
    const universalUrl = `${getPublicOrigin()}/supplier`;
    const password = supplier.accessPassword || editingPassword || '7861';
    const autoDirectUrl = `${getPublicOrigin()}/supplier/${supplier.id}?pin=${encodeURIComponent(password)}`;
    const plainDirectUrl = `${getPublicOrigin()}/supplier/${supplier.id}`;
    const text = `السلام علیکم ${supplier.name} صاحب،\n\nاسٹون ایکسپرٹ کا محفوظ وینڈر و سپلائر پورٹل:\n\n👉 براہِ راست 1-کلک لاگ ان لنک:\n${autoDirectUrl}\n\n👉 یا سنگل پورٹل لنک: ${universalUrl}\n🔑 آپ کا لاگ ان پاسورڈ / PIN: ${password}\n\n(سادہ ڈائریکٹ لنک: ${plainDirectUrl})\n\nبراہ کرم اس لنک کو کھولیں اور اپنے تمام ریٹس، نیا ماربل و میٹریل اسٹاک اور تصاویر براہ راست اپلوڈ کریں۔\n\nشکریہ،\nاسٹون ایکسپرٹ مینجمنٹ`;
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Supplier Information...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold">Supplier Not Found</h3>
        <p className="text-slate-500 max-w-sm">We couldn't locate the requested supplier record in the database.</p>
        <Button onClick={() => router.push('/dashboard/manage-stock')} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Stock Management
        </Button>
      </div>
    );
  }

  const pendingRequests = rateRequests.filter(req => req.status === 'pending');
  const resolvedRequests = rateRequests.filter(req => req.status !== 'pending');

  // Helper to get image of a material
  const getMaterialImage = (materialId: string, materialName: string) => {
    // Check in marbles or its variants
    const baseMarble = marbles.find(m => {
      if (m.id === materialId) return true;
      if (m.variants?.some(v => v.id === materialId)) return true;
      return false;
    });
    if (baseMarble && baseMarble.imageUrl) return baseMarble.imageUrl;

    // Check in fixing materials
    const material = fixingMaterials.find(m => m.id === materialId);
    if (material && material.imageUrl) return material.imageUrl;

    return `https://placehold.co/100?text=${encodeURIComponent(materialName || 'Stone')}`;
  };

  // Helper to get active catalog price as comparison rate
  const getComparisonRate = (materialId: string) => {
    // Check in marbles/variants
    const baseMarble = marbles.find(m => {
      if (m.id === materialId) return true;
      const variant = m.variants?.find(v => v.id === materialId);
      if (variant) return true;
      return false;
    });

    if (baseMarble) {
      const variant = baseMarble.variants?.find(v => v.id === materialId);
      if (variant) {
        return variant.price || null;
      }
      // If matches baseMarble ID, return first variant's price
      return baseMarble.variants?.[0]?.price || null;
    }

    // Check in fixing materials
    const material = fixingMaterials.find(m => m.id === materialId);
    if (material) {
      return material.price;
    }

    return null;
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <button 
              onClick={() => router.push('/dashboard/manage-stock')} 
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Stock Management
            </button>
            <span>/</span>
            <span className="text-foreground">Supplier Detail</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <h1 className="font-headline text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {supplier.name}
            </h1>
            <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'} className="rounded-full">
              {supplier.status === 'active' ? 'Active Wholesaler' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Manage contract pricing, view supplier portal activity, and handle pending rate updates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={copyPortalLink} 
            variant="outline" 
            size="sm" 
            className="font-extrabold text-xs h-9 gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied Link" : "Copy Vendor Link"}</span>
          </Button>

          <Button 
            onClick={handleWhatsAppShare} 
            size="sm" 
            className="font-extrabold text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Share2 className="h-4 w-4" />
            <span>Send on WhatsApp</span>
          </Button>

          <Link href={`/supplier/${supplier.id}`} target="_blank">
            <Button 
              variant="outline" 
              size="sm" 
              className="font-extrabold text-xs h-9 gap-1.5 border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Portal</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SUPPLIER INFORMATION CARD */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
              <CardTitle className="font-headline font-bold text-base flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-indigo-400" />
                Contact Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Official contact info & registered address.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs font-medium text-slate-300">
              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Contact Person</span>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>{supplier.contactPerson || "Not Specified"}</span>
                </p>
              </div>

              {supplier.phone && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Phone Number</span>
                  <a href={`tel:${supplier.phone}`} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{supplier.phone}</span>
                  </a>
                </div>
              )}

              {supplier.email && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Email Address</span>
                  <a href={`mailto:${supplier.email}`} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{supplier.email}</span>
                  </a>
                </div>
              )}

              {supplier.address && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Factory/Office Address</span>
                  <div className="text-xs text-foreground font-semibold flex items-start gap-1.5 leading-relaxed">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{supplier.address}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-3 border-t border-border/40">
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Materials Supplied</span>
                <div className="flex flex-wrap gap-1 pt-1">
                  {supplier.materialsSupplied && supplier.materialsSupplied.length > 0 ? (
                    supplier.materialsSupplied.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px] font-semibold capitalize">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs italic text-slate-400">None declared</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VENDOR PORTAL ACCESS & PASSWORD CARD */}
          <Card className="border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-amber-500/10 pb-3 border-b border-amber-500/20">
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline font-bold text-sm flex items-center gap-2 text-amber-300">
                  <ShieldCheck className="h-4.5 w-4.5 text-amber-400" />
                  <span>پورٹل سیکیورٹی و پاسورڈ</span>
                </CardTitle>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  Protected PIN
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Manage universal link & dedicated password for this supplier.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              
              {/* 1. Supplier Secret Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                    <span>سپلائر کا پاسورڈ / لاگ ان پن:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline font-semibold"
                  >
                    + نیا پن بنائیں
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={editingPassword}
                      onChange={(e) => setEditingPassword(e.target.value)}
                      placeholder="Enter 4-digit PIN or password"
                      className="h-9 pr-9 text-xs font-mono font-bold tracking-wider bg-slate-950/70 border-slate-700 text-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={savingPassword || editingPassword === supplier.accessPassword}
                    onClick={handleSavePassword}
                    className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-slate-950 shrink-0"
                  >
                    {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Save</span>
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  سپلائر یہ پاسورڈ لگا کر اپنا پورٹل کھولے گا۔
                </p>
              </div>

              {/* 2. Universal Portal Link */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>سنگل پورٹل لنک (Universal Link):</span>
                  <span className="text-[10px] font-normal text-slate-400">تمام وینڈرز کے لیے ایک ہی لنک</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={`${getPublicOrigin()}/supplier`}
                    className="h-8 text-[11px] font-mono bg-slate-950/60 border-slate-800 text-slate-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${getPublicOrigin()}/supplier`);
                      toast({
                        title: "Universal Link Copied! 📋",
                        description: `${getPublicOrigin()}/supplier copied to clipboard.`,
                      });
                    }}
                    className="h-8 px-2.5 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 shrink-0"
                    title="Copy Universal Link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* 3. Action Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <Button
                  type="button"
                  onClick={copyUniversalLinkWithPassword}
                  className="w-full h-9 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>کاپی لنک و پاسورڈ (Copy Both)</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>واٹس ایپ پر بھیجیں (WhatsApp)</span>
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Supplier Portal Helper Guide */}
          <Card className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
              <h4 className="font-headline font-bold text-xs uppercase tracking-wider">Rate Change Workflow</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              You can send the portal link to this supplier. When they open the link, they can adjust their material prices. 
              Their changes will not go live immediately; they will arrive here as <strong>Pending Rate Requests</strong> for you to review and approve.
            </p>
          </Card>
        </div>

        {/* RIGHT 2 COLUMNS: DIRECT EDIT & REQUEST APPROVAL */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION A: PENDING RATE REQUESTS FROM SUPPLIER */}
          <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-amber-500/5 pb-4 border-b border-border/40">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="font-headline font-bold text-base flex items-center gap-2 text-amber-400">
                    <Clock className="h-4.5 w-4.5 text-amber-400" />
                    Pending Rate Adjustments from Supplier
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Adjusted by supplier. Needs your approval to update the live rates.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/25">
                  {pendingRequests.length} Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic font-semibold border-2 border-dashed border-slate-800 rounded-xl bg-muted/5">
                  No pending rate requests from this supplier at the moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => {
                    const compRate = getComparisonRate(req.materialId);
                    return (
                      <div 
                        key={req.id} 
                        className="p-4 border border-amber-500/15 bg-amber-500/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-amber-500/10"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <img 
                            src={getMaterialImage(req.materialId, req.materialName)} 
                            alt={req.materialName} 
                            className="h-10 w-10 object-cover rounded-lg border border-border/80 shrink-0 mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-foreground text-sm truncate">{req.materialName}</span>
                              <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {req.materialType}
                              </span>
                            </div>
                            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-400 flex-wrap font-medium">
                              <span>Current Rate: <strong className="text-slate-300 font-mono">PKR {req.currentRate.toLocaleString()}</strong></span>
                              <span>•</span>
                              <span className="text-indigo-400">
                                Proposed Rate: <strong className="text-indigo-300 font-mono text-sm">PKR {req.proposedRate.toLocaleString()}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Diff: 
                                <span className={`font-bold ml-1 ${req.proposedRate > req.currentRate ? "text-amber-400" : "text-emerald-400"}`}>
                                  {req.proposedRate > req.currentRate ? "+" : ""}{(req.proposedRate - req.currentRate).toLocaleString()}
                                </span>
                              </span>
                              {compRate !== null && (
                                <>
                                  <span>•</span>
                                  <span className="text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.2 rounded">
                                    Stone Expert Rate: PKR {compRate.toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block pt-0.5">
                              Submitted: {new Date(req.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Button
                            disabled={actioningId !== null}
                            onClick={() => handleRejectRequest(req.id)}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold border-red-500/20 text-red-400 hover:bg-red-500/10 bg-red-500/5"
                          >
                            {actioningId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                            )}
                            Reject
                          </Button>
                          <Button
                            disabled={actioningId !== null}
                            onClick={() => handleApproveRequest(req.id)}
                            size="sm"
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {actioningId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve & Apply
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION B: LIVE MATERIAL CONTRACT RATES & DIRECT ADJUSTMENT */}
          <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-headline font-bold text-base flex items-center gap-2">
                    <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                    Live Contract Rates &amp; Multi-Size Price Sheet
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    ایک ہی نام کے آگے تمام سائز (24&quot;, 36&quot;, 48&quot;, 52&quot;, Gangsaw) کے ریٹس دیکھیں اور تبدیل کریں۔
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
                  <button
                    type="button"
                    onClick={() => setRateViewMode('matrix')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      rateViewMode === 'matrix'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📄 ایک پیج ملٹی سائز شیٹ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateViewMode('detailed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      rateViewMode === 'detailed'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚙️ تفصیلی سیلنگ پرائس لسٹ
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {rateViewMode === 'matrix' ? (
                <SupplierRateSheetMatrix
                  supplier={supplier}
                  mode="admin"
                  pendingRequests={pendingRequests}
                  onSaveRatesBatch={async (updatedRates, changedItems) => {
                    const result = await saveSupplier({
                      ...supplier,
                      rates: updatedRates
                    });
                    if (result.success) {
                      setSupplier(prev => (prev ? { ...prev, rates: updatedRates } : null));
                      const newEdited: { [key: string]: string } = { ...editedRates };
                      updatedRates.forEach(r => {
                        newEdited[r.id] = String(r.rate);
                      });
                      setEditedRates(newEdited);
                      toast({
                        title: "ریٹس کامیابی سے اپ ڈیٹ ہو گئے! ✅",
                        description: `${changedItems.length} سائز ریٹس کامیابی سے محفوظ کر لیے گئے۔`
                      });
                    } else {
                      toast({
                        title: "Update Failed",
                        description: result.error || "Failed to save supplier rates",
                        variant: "destructive"
                      });
                    }
                  }}
                  onApplyStoreMarkup={async (pct) => {
                    await handleBulkProductMarkup(pct);
                  }}
                  onResetOfficialAlMajeed={async () => {
                    const officialRates = getAlMajeedRates();
                    const res = await saveSupplier({
                      ...supplier,
                      sheetVersion: '21-10-2026',
                      rates: officialRates
                    });
                    if (res.success) {
                      setSupplier(prev => (prev ? { ...prev, rates: officialRates } : null));
                      toast({
                        title: "المجد 21-10-2026 آفیشل ریٹ شیٹ لوڈ ہو گئی!",
                        description: "تمام سائز (24\", 36\", 48\", 52\", Gangsaw) اصل شیٹ کے مطابق اپ ڈیٹ ہو گئے۔"
                      });
                    }
                  }}
                />
              ) : (
                <>
              {supplier.rates && supplier.rates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                  {/* Option 1: Mark Up Selling Prices (Product Rates) */}
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-teal-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="h-4 w-4 text-teal-400 animate-pulse" />
                        Bulk Selling Price Auto-Increaser
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Set ALL store prices to be a certain percentage higher than supplier cost rates in one click (e.g. +10% profit margin over cost).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* Preset Buttons */}
                      <div className="flex items-center bg-slate-900 border border-slate-850 p-0.5 rounded-lg">
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setBulkProductMarkupPercent(pct)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                              bulkProductMarkupPercent === pct
                                ? 'bg-teal-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>

                      {/* Custom Input */}
                      <div className="relative w-16">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={bulkProductMarkupPercent}
                          onChange={(e) => setBulkProductMarkupPercent(Number(e.target.value))}
                          className="h-7 pr-4 text-right font-extrabold font-mono text-xs bg-slate-900 border-slate-800 text-white"
                        />
                        <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 font-bold font-mono">%</span>
                      </div>

                      {/* Apply Button */}
                      <Button
                        type="button"
                        disabled={applyingBulkMarkup}
                        onClick={() => handleBulkProductMarkup(bulkProductMarkupPercent)}
                        className="h-7 text-[10px] font-black bg-teal-600 hover:bg-teal-700 text-white shrink-0 px-2.5"
                      >
                        {applyingBulkMarkup ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        Apply Markup
                      </Button>
                    </div>
                  </div>

                  {/* Option 2: Overwrite Supplier Costs */}
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <Percent className="h-4 w-4 text-indigo-400" />
                        Bulk Cost Price Calculator
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Overwrite supplier cost rates to guarantee a set profit ratio below current store selling prices.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {/* Preset Buttons */}
                      <div className="flex items-center bg-slate-900 border border-slate-850 p-0.5 rounded-lg">
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setBulkProfitRatio(pct)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                              bulkProfitRatio === pct
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>

                      {/* Custom Input */}
                      <div className="relative w-16">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={bulkProfitRatio}
                          onChange={(e) => setBulkProfitRatio(Number(e.target.value))}
                          className="h-7 pr-4 text-right font-extrabold font-mono text-xs bg-slate-900 border-slate-800 text-white"
                        />
                        <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 font-bold font-mono">%</span>
                      </div>

                      {/* Apply Button */}
                      <Button
                        type="button"
                        disabled={applyingBulk}
                        onClick={handleBulkProfitRatioApply}
                        className="h-7 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 px-2.5"
                      >
                        {applyingBulk ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Percent className="h-3 w-3 mr-1" />
                        )}
                        Apply Costs
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!supplier.rates || supplier.rates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic text-xs border border-dashed border-border/70 rounded-xl bg-muted/10">
                  No materials linked to this supplier yet.
                  <p className="mt-1 text-[11px] font-normal not-italic max-w-sm mx-auto">
                    You can link materials by assigning suppliers to products in the central Inventory ledger.
                  </p>
                </div>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/45 bg-muted/5">
                  {supplier.rates.map((rate) => {
                    const hasPendingForThis = pendingRequests.some(req => req.materialId === rate.materialId);
                    const compRate = getComparisonRate(rate.materialId);
                    const isPaused = rate.status === 'paused';

                    return (
                      <div key={rate.id} className={`p-4 bg-card transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold text-slate-300 ${isPaused ? 'bg-rose-950/10 border-l-4 border-l-rose-500' : 'hover:bg-muted/5'}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img 
                            src={getMaterialImage(rate.materialId, rate.materialName)} 
                            alt={rate.materialName} 
                            className="h-10 w-10 object-cover rounded-lg border border-border/80 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-extrabold text-foreground text-sm truncate max-w-[320px] ${isPaused ? 'text-slate-400 line-through' : ''}`}>
                                {rate.materialName}
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
                              {hasPendingForThis && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/25 text-[9px] h-4 py-0 font-bold uppercase">
                                  Rate request pending
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3 text-slate-400" />
                                ID: <strong className="text-slate-300">{rate.materialId}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Last Updated: <strong>{rate.lastUpdated ? new Date(rate.lastUpdated).toLocaleDateString() : 'Never'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Direct Adjust Input & Save Action */}
                        <div className="flex flex-col xl:flex-row xl:items-center gap-4 shrink-0 w-full xl:w-auto mt-4 xl:mt-0">
                          
                          {/* BLOCK 1: SUPPLIER COST RATE */}
                          <div className="flex flex-col bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2 min-w-[200px] flex-1 xl:flex-none">
                            <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Supplier Cost Rate</span>
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <Input 
                                  type="number" 
                                  disabled={isPaused}
                                  className="w-full h-8 text-xs font-bold text-right pr-6 font-mono bg-slate-950 border-slate-800 text-white"
                                  value={editedRates[rate.id] || ''}
                                  onChange={(e) => setEditedRates({ ...editedRates, [rate.id]: e.target.value })}
                                  placeholder="Cost"
                                />
                                <span className="absolute right-1.5 top-2 text-[8px] text-slate-500 font-bold font-mono">PKR</span>
                              </div>
                              <Button
                                disabled={isPaused || savingRateId !== null}
                                onClick={() => handleDirectRateSave(rate)}
                                size="sm"
                                className="h-8 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 px-2.5"
                              >
                                {savingRateId === rate.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                            <span className="text-[8px] text-slate-500 font-bold font-mono">Wholesale Price (Base Cost)</span>
                          </div>

                          {/* BLOCK 2: OUR PRODUCT SELLING PRICE */}
                          <div className={compRate !== null ? "flex flex-col bg-teal-500/5 border border-teal-500/10 p-3 rounded-xl space-y-2 min-w-[310px] flex-1 xl:flex-none" : "hidden"}>
                            {compRate !== null && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-wider">
                                    Our Selling Price (Product Rate)
                                  </span>
                                  {rate.rate > 0 && (
                                    <Badge variant="outline" className="text-[9px] h-4.5 bg-teal-500/10 text-teal-400 border-teal-500/20 font-mono font-black">
                                      Margin: {rate.rate > 0 ? Math.round(((Number(editedProductRates[rate.materialId] || compRate) - rate.rate) / rate.rate) * 100) : 0}%
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Minus Step */}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isPaused || updatingProductId !== null}
                                    onClick={() => {
                                      const currentVal = Number(editedProductRates[rate.materialId] || compRate || 0);
                                      const newVal = Math.max(0, currentVal - 50);
                                      setEditedProductRates(prev => ({ ...prev, [rate.materialId]: String(newVal) }));
                                    }}
                                    className="h-8 w-8 p-0 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-850"
                                    title="Decrease by 50 PKR"
                                  >
                                    -
                                  </Button>

                                  {/* Input field */}
                                  <div className="relative flex-1">
                                    <Input 
                                      type="number" 
                                      disabled={isPaused}
                                      className="w-full h-8 text-xs font-bold text-right pr-6 font-mono bg-slate-950 border-slate-800 text-white"
                                      value={editedProductRates[rate.materialId] || ''}
                                      onChange={(e) => setEditedProductRates({ ...editedProductRates, [rate.materialId]: e.target.value })}
                                      placeholder="Price"
                                    />
                                    <span className="absolute right-1.5 top-2 text-[8px] text-slate-500 font-bold font-mono">PKR</span>
                                  </div>

                                  {/* Plus Step */}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isPaused || updatingProductId !== null}
                                    onClick={() => {
                                      const currentVal = Number(editedProductRates[rate.materialId] || compRate || 0);
                                      const newVal = currentVal + 50;
                                      setEditedProductRates(prev => ({ ...prev, [rate.materialId]: String(newVal) }));
                                    }}
                                    className="h-8 w-8 p-0 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-850"
                                    title="Increase by 50 PKR"
                                  >
                                    +
                                  </Button>

                                  <Button
                                    disabled={isPaused || updatingProductId !== null}
                                    onClick={() => {
                                      const val = Number(editedProductRates[rate.materialId]);
                                      if (isNaN(val) || val <= 0) {
                                        toast({
                                          title: "Invalid Price",
                                          description: "Please enter a valid positive number for the product selling price.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      handleUpdateProductRate(rate.materialId, val);
                                    }}
                                    size="sm"
                                    className="h-8 text-[11px] font-extrabold bg-teal-600 hover:bg-teal-700 text-white shrink-0 px-2.5"
                                  >
                                    {updatingProductId === rate.materialId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Save"
                                    )}
                                  </Button>
                                </div>

                                {/* Direct Preset Margin Buttons */}
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold mr-1">Markup over cost:</span>
                                  {[5, 10, 15, 20].map((pct) => {
                                    const calculatedPrice = Math.round(rate.rate * (1 + pct / 100));
                                    return (
                                      <Button
                                        key={pct}
                                        type="button"
                                        disabled={isPaused || updatingProductId !== null}
                                        onClick={() => {
                                          setEditedProductRates(prev => ({ ...prev, [rate.materialId]: String(calculatedPrice) }));
                                          handleUpdateProductRate(rate.materialId, calculatedPrice);
                                        }}
                                        variant="outline"
                                        className="h-5.5 text-[9px] font-black px-1.5 py-0 bg-slate-900 border-slate-800 text-teal-400 hover:text-white hover:bg-teal-600/20"
                                        title={`Set to PKR ${calculatedPrice} (+${pct}% markup)`}
                                      >
                                        +{pct}%
                                      </Button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>

                          {/* ACTION BUTTONS FOR RECORD */}
                          <div className="flex items-center gap-1.5 xl:self-center self-end pt-2 xl:pt-0">
                            {/* Pause/Resume Toggle Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePauseRate(rate)}
                              className={`h-8 text-[10px] font-bold gap-1 px-2.5 border-border ${
                                isPaused 
                                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 border-emerald-500/20' 
                                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 border-amber-500/20'
                              }`}
                              title={isPaused ? "Resume this material's contract" : "Pause / cancel this material's contract"}
                            >
                              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                              <span>{isPaused ? 'Resume' : 'Pause'}</span>
                            </Button>

                            {/* Delete Product Link Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteRate(rate)}
                              className="h-8 w-8 p-0 bg-rose-950/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 shrink-0 flex items-center justify-center"
                              title="Permanently delete and remove this product link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>

          {/* SECTION C: RESOLVED RATE REQUESTS HISTORY */}
          {resolvedRequests.length > 0 && (
            <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/10 pb-4 border-b border-border/40">
                <CardTitle className="font-headline font-bold text-slate-300 text-sm uppercase tracking-wider flex items-center gap-2">
                  Rate Adjustment Request History
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Past proposed rate requests that have been resolved.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-1 font-semibold text-xs">
                  {resolvedRequests.map((req) => (
                    <div key={req.id} className="p-3 border rounded-xl flex items-center justify-between gap-4 bg-muted/5 border-border/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">{req.materialName}</span>
                          <Badge 
                            variant={req.status === 'approved' ? 'default' : 'destructive'} 
                            className="text-[9px] h-4 px-1 rounded font-bold uppercase"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Was: <span className="font-mono text-slate-300 font-bold">PKR {req.currentRate.toLocaleString()}</span> 
                          {' → '} Proposed: <span className="font-mono text-indigo-400 font-bold">PKR {req.proposedRate.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-medium shrink-0">
                        <span>Resolved: {req.resolvedAt ? new Date(req.resolvedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
