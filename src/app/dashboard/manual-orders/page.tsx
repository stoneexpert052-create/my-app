'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  MoreHorizontal,
  X,
  UserSearch,
  PlusCircle,
  Search,
  Package,
  Gem,
  Truck,
  Wrench,
  LayoutGrid,
  ChevronRight,
  Hammer,
  Scissors,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  FileText,
  Printer,
} from 'lucide-react';
import { getOrders, getMarbles, getHomepageConfig, saveOrder } from '@/lib/admin-actions';
import type { Order, Customer, Marble } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import config from '@/lib/config.json';
import {
  CuttingOptimizerPro,
  type StockSlabConfig,
  type CutPartInput,
  type OptimizationSummary,
  type UnitType,
} from '@/components/cutting-optimizer-pro';

interface ManualOrderLineItem {
  id: string;
  title: string;
  category: string;
  dimensionsText: string;
  quantity: number;
  areaSqFt: number;
  ratePerSqFt: number;
  totalPKR: number;
  notes?: string;
}

function ProductCardSkeleton({ index }: { index?: number }) {
  return (
    <div
      className="border rounded-lg overflow-hidden shadow-sm bg-card flex flex-col"
      style={{ animationDelay: `${(index || 0) * 40}ms` }}
    >
      <div className="relative aspect-square w-full">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-3.5 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function ManualOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [isLoadingMarbles, setIsLoadingMarbles] = useState(true);

  // Active Mode inside Manual Orders: 'optimizer' | 'hub'
  const [activeTab, setActiveTab] = useState<'optimizer' | 'hub'>('optimizer');

  // Search & Filter for Material Browser
  const [materialSearch, setMaterialSearch] = useState('');
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  // Structured Manual Order Builder State (for organizing orders & receiving Cutting Optimizer output)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [billingBasis, setBillingBasis] = useState<'full_slabs' | 'net_pieces'>('full_slabs');
  const [cuttingLaborPKR, setCuttingLaborPKR] = useState<number>(0);
  const [lineItems, setLineItems] = useState<ManualOrderLineItem[]>([]);
  const [isSavingManualOrder, setIsSavingManualOrder] = useState(false);

  // Quick Custom Line Item inputs
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemSize, setNewItemSize] = useState('42" × 12"');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemArea, setNewItemArea] = useState<number>(10);
  const [newItemRate, setNewItemRate] = useState<number>(380);

  useEffect(() => {
    if (materialSearch.trim()) {
      setIsSearchingMaterials(true);
      const timer = setTimeout(() => {
        setIsSearchingMaterials(false);
      }, 140);
      return () => clearTimeout(timer);
    } else {
      setIsSearchingMaterials(false);
    }
  }, [materialSearch]);

  // Phone Search States
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [searchResult, setSearchResult] = useState<{ customer: Customer; orders: Order[] } | null>(
    null
  );

  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => config.categoryOrder);
  const categories = useMemo(() => ['All', ...categoryOrder], [categoryOrder]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setCategoryOrder(parsed);
      }
    } catch (e) {}

    async function loadMarbles() {
      setIsLoadingMarbles(true);
      const [data, hpConfig] = await Promise.all([getMarbles(), getHomepageConfig()]);
      setMarbles(data);
      if (hpConfig && hpConfig.categoryOrder) {
        setCategoryOrder(hpConfig.categoryOrder);
      }
      setIsLoadingMarbles(false);
    }
    loadMarbles();

    const handleCategoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategoryOrder(e.detail);
      }
    };
    window.addEventListener('category_order_updated', handleCategoryUpdate);
    return () => {
      window.removeEventListener('category_order_updated', handleCategoryUpdate);
    };
  }, []);

  const filteredMarbles = useMemo(() => {
    let results = marbles.filter((m) => !m.isHidden);

    if (selectedCategory !== 'All') {
      results = results.filter((m) => {
        if (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase()) {
          return true;
        }
        let key: string;
        if (m.materialType === '12x24 Tiles') key = 'Marble Tiles';
        else if (m.materialType === 'Marble' || m.materialType === 'Granite')
          key = `${m.origin} ${m.materialType}`;
        else key = m.materialType;
        return key === selectedCategory;
      });
    }

    if (materialSearch) {
      results = results.filter((m) =>
        m.name.toLowerCase().includes(materialSearch.toLowerCase())
      );
    }

    return results;
  }, [marbles, materialSearch, selectedCategory]);

  const handleSearchByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) {
      toast({ variant: 'destructive', title: 'Phone Number Required' });
      return;
    }
    setIsSearchingPhone(true);
    try {
      const allOrders = await getOrders();
      const foundOrders = allOrders
        .filter((order) => order.calculationDetails?.customerInfo?.phone === searchPhone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (foundOrders.length > 0) {
        const customerInfo = foundOrders[0].calculationDetails!.customerInfo;
        setSearchResult({ customer: customerInfo as Customer, orders: foundOrders });
        toast({
          title: 'Customer Found!',
          description: `${foundOrders.length} order(s) located.`,
        });
      } else {
        setSearchResult(null);
        toast({
          variant: 'destructive',
          title: 'Not Found',
          description: 'No orders found for this phone number.',
        });
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Search Error',
        description: 'Could not fetch orders.',
      });
    }
    setIsSearchingPhone(false);
  };

  const handleEditOrder = (order: Order) => {
    if (!order.calculationDetails || !order.calculationDetails.marble) {
      toast({
        variant: 'destructive',
        title: 'Cannot Edit Order',
        description: 'Missing details.',
      });
      return;
    }
    router.push(`/order/${order.calculationDetails.marble.id}?orderId=${order.id}&admin=true`);
  };

  // Receive Optimized Cutting Plan from CuttingOptimizerPro and populate the Manual Order List
  const handleSendCutPlanToOrder = (payload: {
    materialName: string;
    lotId: string;
    unit: UnitType;
    slabConfig: StockSlabConfig;
    parts: CutPartInput[];
    summary: OptimizationSummary;
  }) => {
    const { materialName, lotId, unit, slabConfig, parts, summary } = payload;
    const rate = slabConfig.ratePerSqFt || 400;

    const generatedItems: ManualOrderLineItem[] = [];

    if (billingBasis === 'full_slabs') {
      generatedItems.push({
        id: `cut-slab-${Date.now()}`,
        title: `${materialName} — Full Slabs (${lotId})`,
        category: 'Full Slab Cutting Plan',
        dimensionsText: `${summary.totalSlabsUsed} Slabs × (${slabConfig.length}×${slabConfig.width} ${unit}) | Yield: ${summary.overallYieldPercent.toFixed(1)}%`,
        quantity: summary.totalSlabsUsed,
        areaSqFt: Number(summary.totalSlabAreaSqFt.toFixed(2)),
        ratePerSqFt: rate,
        totalPKR: Math.round(summary.totalSlabAreaSqFt * rate),
        notes: `Includes ${summary.totalPiecesPlaced} cut pieces; Reusable offcuts: ${summary.totalUsableOffcutAreaSqFt.toFixed(1)} sq.ft`,
      });
    }

    parts.forEach((p, idx) => {
      const partSqFt =
        billingBasis === 'full_slabs'
          ? Number(((p.length * p.width * p.quantity) / 144).toFixed(2))
          : Number(((p.length * p.width * p.quantity) / 144).toFixed(2));
      const itemRate = billingBasis === 'full_slabs' ? 0 : rate;
      generatedItems.push({
        id: `cut-part-${Date.now()}-${idx}`,
        title: `${p.label} (${materialName})`,
        category: billingBasis === 'full_slabs' ? 'Cut Schedule Item (Included in Slab)' : 'Cut Piece',
        dimensionsText: `${p.length} × ${p.width} ${unit} (${p.allowRotation ? '90° Rotatable' : 'Fixed Vein'})`,
        quantity: p.quantity,
        areaSqFt: partSqFt,
        ratePerSqFt: itemRate,
        totalPKR: Math.round(partSqFt * itemRate),
      });
    });

    setLineItems((prev) => [...prev, ...generatedItems]);
    setActiveTab('hub');
    toast({
      title: 'کٹنگ لسٹ مینوئل آرڈر میں شامل ہو گئی!',
      description: `${generatedItems.length} items added to the Manual Order sequence.`,
    });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setLineItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomLineItem = () => {
    if (!newItemTitle.trim()) {
      toast({ variant: 'destructive', title: 'آئٹم کا نام درج کریں' });
      return;
    }
    const area = Math.max(0.1, Number(newItemArea) || 1);
    const rate = Math.max(0, Number(newItemRate) || 0);
    const item: ManualOrderLineItem = {
      id: `item-${Date.now()}`,
      title: newItemTitle.trim(),
      category: 'Manual Order Item',
      dimensionsText: newItemSize || 'Standard',
      quantity: Math.max(1, Number(newItemQty) || 1),
      areaSqFt: area,
      ratePerSqFt: rate,
      totalPKR: Math.round(area * rate),
    };
    setLineItems((prev) => [...prev, item]);
    setNewItemTitle('');
  };

  const grandTotalPKR = useMemo(() => {
    const itemsSum = lineItems.reduce((sum, i) => sum + (Number(i.totalPKR) || 0), 0);
    return itemsSum + (Number(cuttingLaborPKR) || 0);
  }, [lineItems, cuttingLaborPKR]);

  const handleSaveManualOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'کسٹمر کا نام اور فون نمبر ضروری ہے',
        description: 'Please enter Customer Name and Phone Number before saving.',
      });
      return;
    }
    if (lineItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'آرڈر لسٹ خالی ہے',
        description: 'Add at least one item or import from Cutting Optimizer Pro.',
      });
      return;
    }

    setIsSavingManualOrder(true);
    try {
      const orderId = `ORD-MAN-${Date.now().toString().slice(-6)}`;
      const primaryMarble = marbles[0] || {
        id: 'manual-cutting-order',
        name: lineItems[0].title,
        materialType: 'Marble',
        origin: 'Local',
        imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-22_at_8.09.35_PM_ee1d8089.jpeg',
        variants: [{ id: 'v1', size: 'Slab', thickness: '20mm', price: lineItems[0].ratePerSqFt || 400 }],
      };

      const orderPayload = {
        id: orderId,
        date: new Date().toISOString(),
        status: 'Confirmed',
        totalPrice: grandTotalPKR,
        calculationDetails: {
          customerInfo: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            city: customerCity.trim() || 'Pakistan',
            address: customerCity.trim() || '',
          },
          marble: primaryMarble,
          manualOrderLineItems: lineItems,
          cuttingLaborPKR: Number(cuttingLaborPKR) || 0,
          totalSqFt: lineItems.reduce((s, i) => s + i.areaSqFt, 0),
          isManualCuttingOrder: true,
        },
      };

      const res = await saveOrder(orderPayload);
      if (res.success) {
        toast({
          title: 'مینوئل آرڈر محفوظ ہو گیا! (Order Saved)',
          description: `Order ID: ${orderId} — Total: PKR ${grandTotalPKR.toLocaleString()}`,
        });
        router.push('/dashboard/orders');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Order',
        description: err?.message || 'Failed to save manual order',
      });
    } finally {
      setIsSavingManualOrder(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:gap-6 md:p-6 bg-muted/20">
      {/* Top Manual Order & Cutting Optimizer Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border rounded-xl p-4 md:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline text-2xl font-bold md:text-3xl">
              Manual Orders &amp; Cutting Optimizer Hub
            </h1>
            <span className="text-xs text-muted-foreground">
              · مینوئل آرڈر اور ماربل کٹنگ آپٹیمائزر
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calculate 2D slab cutting layouts, organize manual order line items in sequence, and generate customer quotations.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border">
            <button
              type="button"
              onClick={() => setActiveTab('optimizer')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'optimizer'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scissors className="h-4 w-4" />
              <span>Cutting Optimizer Pro (سلیب کٹنگ آپٹیمائزر)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'hub'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>
                Manual Order Sequence &amp; Quotations (مینوئل آرڈر ترتیب)
                {lineItems.length > 0 ? ` (${lineItems.length})` : ''}
              </span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/orders')}
            className="h-9 font-semibold"
          >
            View All Orders
          </Button>
        </div>
      </div>

      {/* SECTION 1: CUTTING OPTIMIZER PRO (DEFAULT ACTIVE IN MANUAL ORDERS) */}
      {activeTab === 'optimizer' && (
        <CuttingOptimizerPro
          marbles={marbles}
          onSendToManualOrder={handleSendCutPlanToOrder}
        />
      )}

      {/* SECTION 2: ORGANIZED MANUAL ORDER BUILDER & QUOTATION HUB */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Structured Manual Order Sequence Builder */}
          <Card className="border-primary/25 shadow-md">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span>Ordered Manual Quotation Builder (مینوئل آرڈر کی ترتیب اور بلنگ)</span>
                  </CardTitle>
                  <CardDescription>
                    Arrange order items in exact sequence, import cuts from Cutting Optimizer Pro, and save directly to Orders.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('optimizer')}
                  className="gap-1.5 font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                >
                  <Scissors className="h-4 w-4" />
                  <span>کٹنگ آپٹیمائزر سے سائز لائیں (Open Cutting Optimizer)</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {/* Step 1: Customer Details & Billing Basis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Customer Name (کسٹمر کا نام) *
                  </Label>
                  <Input
                    placeholder="e.g., Haji Muhammad Tariq"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Phone / WhatsApp (فون نمبر) *
                  </Label>
                  <Input
                    placeholder="e.g., 03001234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    City / Site Address (شہر / پتہ)
                  </Label>
                  <Input
                    placeholder="e.g., Rawalpindi / Islamabad"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Cutting &amp; Polishing Labor (PKR) (کٹنگ و پالش مزدوری)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={cuttingLaborPKR}
                    onChange={(e) => setCuttingLaborPKR(Math.max(0, Number(e.target.value) || 0))}
                    className="h-9 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Step 2: Add Custom Order Line Item */}
              <div className="rounded-lg border bg-muted/30 p-3.5">
                <div className="text-xs font-bold mb-2.5 flex items-center justify-between">
                  <span>Add Item to Order Sequence (آرڈر لسٹ میں نیا آئٹم شامل کریں)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Optimizer Billing Mode:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setBillingBasis((b) =>
                          b === 'full_slabs' ? 'net_pieces' : 'full_slabs'
                        )
                      }
                      className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-background"
                    >
                      {billingBasis === 'full_slabs'
                        ? 'Full Slab Billing (مکمل سلیب بلنگ)'
                        : 'Net Cut Pieces Billing (صرف کٹے ہوئے پیس)'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px]">Item / Stone Name (پتھر یا کام کا نام)</Label>
                    <Input
                      placeholder="e.g., Ziarat White Stair Steps"
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Dimensions (سائز)</Label>
                    <Input
                      placeholder='42" × 12"'
                      value={newItemSize}
                      onChange={(e) => setNewItemSize(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px]">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value) || 1))}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Total Sq.Ft (فٹ)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.1"
                      value={newItemArea}
                      onChange={(e) => setNewItemArea(Math.max(0.1, Number(e.target.value) || 0))}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Rate / Sq.Ft (ریٹ)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newItemRate}
                      onChange={(e) => setNewItemRate(Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomLineItem}
                      className="w-full h-8 text-xs font-bold"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3: Ordered Line Items Table with Up/Down Sequence Reordering */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <th className="p-2.5 text-left text-xs font-bold w-20">Order #</th>
                      <th className="p-2.5 text-left text-xs font-bold">Item &amp; Category</th>
                      <th className="p-2.5 text-left text-xs font-bold">Cut Size / Details</th>
                      <th className="p-2.5 text-right text-xs font-bold">Qty</th>
                      <th className="p-2.5 text-right text-xs font-bold">Area (Sq.Ft)</th>
                      <th className="p-2.5 text-right text-xs font-bold">Rate</th>
                      <th className="p-2.5 text-right text-xs font-bold">Total (PKR)</th>
                      <th className="p-2.5 text-right text-xs font-bold">Actions</th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                          ابھی کوئی آئٹم شامل نہیں ہے۔ اوپر سے نیا آئٹم ڈالیں یا{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('optimizer')}
                            className="text-amber-600 dark:text-amber-400 font-bold underline"
                          >
                            Cutting Optimizer Pro
                          </button>{' '}
                          سے کٹنگ پلان بھیجیں۔
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineItems.map((item, idx) => (
                        <TableRow key={item.id} className="text-xs font-mono tabular-nums">
                          <TableCell className="p-2.5">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-muted-foreground w-5">
                                {idx + 1}.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                title="Move Up in Order"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveItem(idx, 'down')}
                                disabled={idx === lineItems.length - 1}
                                className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                title="Move Down in Order"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="p-2.5 font-sans">
                            <div className="font-bold text-foreground">{item.title}</div>
                            <div className="text-[10px] text-muted-foreground">{item.category}</div>
                          </TableCell>
                          <TableCell className="p-2.5 text-xs">{item.dimensionsText}</TableCell>
                          <TableCell className="p-2.5 text-right font-bold">{item.quantity}</TableCell>
                          <TableCell className="p-2.5 text-right">{item.areaSqFt} sq.ft</TableCell>
                          <TableCell className="p-2.5 text-right">
                            {item.ratePerSqFt > 0 ? `PKR ${item.ratePerSqFt}` : 'Included'}
                          </TableCell>
                          <TableCell className="p-2.5 text-right font-bold text-primary">
                            PKR {item.totalPKR.toLocaleString()}
                          </TableCell>
                          <TableCell className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-mono tabular-nums">
                <span>
                  Items: <strong>{lineItems.length}</strong>
                </span>
                <span>
                  Labor: <strong>PKR {(Number(cuttingLaborPKR) || 0).toLocaleString()}</strong>
                </span>
                <span className="text-base font-bold text-primary">
                  Grand Total: PKR {grandTotalPKR.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lineItems.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLineItems([])}
                  >
                    Clear List
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingManualOrder}
                  onClick={handleSaveManualOrder}
                  className="font-bold gap-1.5"
                >
                  {isSavingManualOrder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>آرڈر محفوظ کریں (Save Manual Order)</span>
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Existing Specialized Quotation Calculators & Customer Phone Lookup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Start Specialized Store Calculator Quotation
                </CardTitle>
                <CardDescription>
                  Or launch a full store product calculator for stairs, kitchens, and supplies.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10"
                    onClick={() => setActiveTab('optimizer')}
                  >
                    <Scissors className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold">Cutting Optimizer</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                      setSelectedCategory('Local Marble');
                      setIsBrowserOpen(true);
                    }}
                  >
                    <Truck className="h-7 w-7 text-primary" />
                    <span className="text-xs">Marble Order</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                      setSelectedCategory('Local Granite');
                      setIsBrowserOpen(true);
                    }}
                  >
                    <Gem className="h-7 w-7 text-primary" />
                    <span className="text-xs">Granite Order</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => router.push('/dashboard/manual-orders/labor-quotation')}
                  >
                    <Hammer className="h-7 w-7 text-primary" />
                    <span className="text-xs">Labor Quotation</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => router.push('/order/general-supplies-order?admin=true')}
                  >
                    <Wrench className="h-7 w-7 text-primary" />
                    <span className="text-xs">Supplies Only</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 border-2 hover:border-primary hover:bg-primary/5"
                    onClick={() => setIsBrowserOpen(true)}
                  >
                    <LayoutGrid className="h-7 w-7 text-primary" />
                    <span className="text-xs">All Products</span>
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 text-xs text-muted-foreground italic">
                * Note: You can add multiple items (Kitchen, Stairs, Vanity) into a single quotation after starting.
              </CardFooter>
            </Card>

            <Card className="shadow-md">
              <form onSubmit={handleSearchByPhone}>
                <CardHeader className="bg-secondary/10 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <UserSearch className="h-5 w-5 text-secondary-foreground" />
                    Existing Customer
                  </CardTitle>
                  <CardDescription>Load previous orders by phone number.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">Customer Phone Number</Label>
                      <Input
                        id="phone-number"
                        placeholder="e.g., 03001234567"
                        required
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        type="tel"
                        className="h-11"
                      />
                    </div>
                    <Button className="w-full h-11" type="submit" disabled={isSearchingPhone}>
                      {isSearchingPhone ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Find Orders
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>

          {searchResult && (
            <Card className="mt-4 shadow-lg border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between bg-primary/5 border-b">
                <div>
                  <CardTitle className="text-xl">
                    Order History for: {searchResult.customer.name}
                  </CardTitle>
                  <CardDescription>
                    Phone: {searchResult.customer.phone} | Total Orders:{' '}
                    {searchResult.orders.length}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSearchResult(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Clear Results
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResult.orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.date).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-primary font-bold">
                          PKR {order.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage Order</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                Edit / Update Quotation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push('/dashboard/orders')}
                              >
                                Go to Order Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Select Initial Material</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              Choose a product to start the manual quotation process.
            </DialogDescription>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                    <ChevronRight className="ml-2 h-4 w-4 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-60 overflow-y-auto">
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat}
                      onSelect={() => {
                        setIsSearchingMaterials(true);
                        setSelectedCategory(cat);
                        setTimeout(() => setIsSearchingMaterials(false), 120);
                      }}
                    >
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="relative flex-1">
                {isSearchingMaterials ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search by material or stone name..."
                  className="pl-9 pr-9 h-10"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                />
                {materialSearch && (
                  <button
                    type="button"
                    onClick={() => setMaterialSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {isLoadingMarbles || isSearchingMaterials
                ? Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} index={i} />
                  ))
                : filteredMarbles.map((marble) => (
                    <div
                      key={marble.id}
                      className="group relative border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-sm bg-card hover:shadow-md"
                      onClick={() => router.push(`/order/${marble.id}?admin=true`)}
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={marble.imageUrl || 'https://placehold.co/400x400?text=No+Image'}
                          alt={marble.name}
                          fill
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-xs truncate leading-tight mb-1">
                          {marble.name}
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">
                            {marble.materialType}
                          </Badge>
                          <p className="text-[10px] font-bold text-primary">
                            PKR {marble.variants[0]?.price || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
            {!isLoadingMarbles && !isSearchingMaterials && filteredMarbles.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No materials found matching &ldquo;{materialSearch || selectedCategory}&rdquo;.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setMaterialSearch('');
                    setSelectedCategory('All');
                  }}
                >
                  Reset filters
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  );
}
