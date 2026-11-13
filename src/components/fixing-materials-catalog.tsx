'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ShoppingBag, Search, Plus, Minus, 
  Settings, Trash2, ArrowUp, ArrowDown, ArrowUpToLine, 
  ArrowDownToLine, Check, HelpCircle, Package, Star,
  Maximize, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { FixingMaterial, Requirement } from '@/lib/types';
import { broadcastAppUpdate, subscribeToAppUpdates } from '@/lib/admin-actions';
import { useFullscreenImage } from '@/context/fullscreen-image-context';

interface FixingMaterialsCatalogProps {
  requirements: Requirement[];
  addFixingMaterialRequirement: (material: FixingMaterial, quantity: number) => number;
  updateRequirement: (id: number, data: Partial<Requirement>) => void;
  removeRequirement: (id: number) => void;
  onBack: () => void;
  language: 'en' | 'ur';
  toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  initialFixingMaterials: FixingMaterial[];
  fixingMaterialCategories: string[];
}

export function FixingMaterialsCatalog({
  requirements,
  addFixingMaterialRequirement,
  updateRequirement,
  removeRequirement,
  onBack,
  language,
  toast,
  initialFixingMaterials,
  fixingMaterialCategories,
}: FixingMaterialsCatalogProps) {
  const { openImage } = useFullscreenImage();
  const [materials, setMaterials] = useState<FixingMaterial[]>(initialFixingMaterials);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Sync when initialFixingMaterials change
  useEffect(() => {
    if (initialFixingMaterials && initialFixingMaterials.length > 0) {
      setMaterials(initialFixingMaterials);
    }
  }, [initialFixingMaterials]);

  // Load and save categories from localStorage
  const [categories, setCategories] = useState<string[]>([...fixingMaterialCategories]);

  // Custom categories mapping
  const [customCategoriesMap, setCustomCategoriesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCategories = localStorage.getItem('fixing-material-categories-ordered');
      if (savedCategories) {
        try {
          setCategories(JSON.parse(savedCategories));
        } catch (e) {
          console.error(e);
        }
      }
      const savedMap = localStorage.getItem('fixing-materials-custom-categories');
      if (savedMap) {
        try {
          setCustomCategoriesMap(JSON.parse(savedMap));
        } catch (e) {
          console.error(e);
        }
      }
    }

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'fixing_categories_updated' && event.detail) {
        if (event.detail.categories && Array.isArray(event.detail.categories)) {
          setCategories(event.detail.categories);
        }
        if (event.detail.customMap) {
          setCustomCategoriesMap(event.detail.customMap);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Helper to count cart quantities
  const cartQuantities = useMemo(() => {
    const counts: Record<string, { qty: number; reqId: number }> = {};
    requirements.forEach(r => {
      if (r.type === 'fixing_material' && r.fixingMaterialId) {
        counts[r.fixingMaterialId] = {
          qty: r.quantity || 0,
          reqId: r.id
        };
      }
    });
    return counts;
  }, [requirements]);

  const saveAndBroadcastCategories = (updated: string[]) => {
    setCategories(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixing-material-categories-ordered', JSON.stringify(updated));
    }
    broadcastAppUpdate('fixing_categories_updated' as any, {
      categories: updated,
      customMap: customCategoriesMap
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast({ title: "Validation Error", description: "Category name cannot be empty.", variant: "destructive" });
      return;
    }
    if (categories.includes(trimmed)) {
      toast({ title: "Validation Error", description: "Category already exists.", variant: "destructive" });
      return;
    }
    const updated = [...categories, trimmed];
    saveAndBroadcastCategories(updated);
    setNewCategoryName('');
    toast({ title: "Success", description: `Category "${trimmed}" has been added.` });
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updated = categories.filter(c => c !== catToDelete);
    saveAndBroadcastCategories(updated);
    if (filter === catToDelete) {
      setFilter('All');
    }
    toast({ title: "Category Removed", description: `Category "${catToDelete}" has been deleted.` });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    saveAndBroadcastCategories(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    saveAndBroadcastCategories(updated);
  };

  const handleMoveToTop = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const item = updated.splice(index, 1)[0];
    updated.unshift(item);
    saveAndBroadcastCategories(updated);
  };

  const handleMoveToBottom = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const item = updated.splice(index, 1)[0];
    updated.push(item);
    saveAndBroadcastCategories(updated);
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    let list: FixingMaterial[] = materials.map(m => ({
      ...m,
      category: (customCategoriesMap[m.id] || m.category) as FixingMaterial['category']
    }));

    if (filter !== 'All') {
      list = list.filter(m => m.category === filter);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(query) || 
        (m.description && m.description.toLowerCase().includes(query))
      );
    }

    return list;
  }, [materials, filter, searchQuery, customCategoriesMap]);

  // Handle direct cart quantity changes
  const handleUpdateCartQuantity = (material: FixingMaterial, requestedQty: number) => {
    const existing = cartQuantities[material.id];
    if (requestedQty <= 0) {
      if (existing) {
        removeRequirement(existing.reqId);
        toast({ title: "Item Removed", description: `${material.name} removed from your quotation.` });
      }
    } else {
      if (existing) {
        // Update
        updateRequirement(existing.reqId, { 
          quantity: requestedQty,
          total: material.price * requestedQty 
        });
      } else {
        // Add
        addFixingMaterialRequirement(material, requestedQty);
        toast({ title: "Item Added", description: `${requestedQty} x ${material.name} added to your quotation.` });
      }
    }
  };

  // Localization
  const tTitle = language === 'ur' ? 'ٹولز اور کیمیکلز اسٹور' : 'Tools & Chemicals Catalog';
  const tSub = language === 'ur' ? 'اپنی ضرورت کے مطابق بائنڈنگ کیمیکلز اور بہترین ٹولز کا انتخاب کریں' : 'Premium adhesives, tools, and chemicals for marble & stone installations.';
  const tSearch = language === 'ur' ? 'پروڈکٹس تلاش کریں...' : 'Search tools, epoxies, chemicals...';
  const tCategory = language === 'ur' ? 'کیٹیگری:' : 'Category:';
  const tBack = language === 'ur' ? 'واپس کوٹیشن پر جائیں' : 'Back to Quotation';
  const tAddToCart = language === 'ur' ? 'کوٹیشن میں شامل کریں' : 'Add to Quotation';
  const tInCart = language === 'ur' ? 'کوٹیشن میں شامل ہے' : 'In Quotation';

  // Stats
  const totalCartCost = useMemo(() => {
    return requirements
      .filter(r => r.type === 'fixing_material')
      .reduce((sum, r) => sum + r.total, 0);
  }, [requirements]);

  const totalCartItemsCount = useMemo(() => {
    return requirements
      .filter(r => r.type === 'fixing_material')
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [requirements]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="mb-2 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> {tBack}
          </Button>
          <h1 className="font-headline text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
            {tTitle}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">{tSub}</p>
        </div>

        {/* Floating Cart Indicator */}
        {totalCartItemsCount > 0 && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3.5 bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-lg shrink-0 shadow-sm"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                {totalCartItemsCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Added to Order</p>
              <p className="text-sm font-black text-foreground">PKR {totalCartCost.toLocaleString()}</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black h-8 px-3" onClick={onBack}>
              Finish
            </Button>
          </motion.div>
        )}
      </div>

      {/* Filters & Actions Sub-header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200/60">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={filter === 'All' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('All')}
            className={filter === 'All' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold h-8' : 'text-foreground hover:bg-stone-100 h-8'}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat} 
              variant={filter === cat ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter(cat)}
              className={filter === cat ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold h-8' : 'text-foreground hover:bg-stone-100 h-8'}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder={tSearch} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-stone-200"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 flex items-center gap-1.5 shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50/50 font-semibold"
            onClick={() => setShowCategoryManager(!showCategoryManager)}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="text-xs">{showCategoryManager ? 'Hide Order' : 'Manage Order'}</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Category Manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-stone-200 bg-stone-50/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="new-cat" className="text-stone-800 font-bold text-xs mb-1.5 block">Create New Custom Category</Label>
                    <Input
                      id="new-cat"
                      placeholder="e.g., Premium Epoxies, Safety Gear..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-9 text-xs border-stone-300 bg-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                      }}
                    />
                  </div>
                  <Button 
                    type="button" 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black h-9 px-4"
                    onClick={handleAddCategory}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-bold text-xs block">Reorder / Rearrange Categories (Drag-free Sequence)</Label>
                  <div className="max-h-[180px] overflow-y-auto border border-border rounded-md divide-y divide-border bg-background">
                    {categories.map((cat, index) => (
                      <div key={cat} className="flex items-center justify-between p-2.5 hover:bg-muted/40">
                        <span className="text-xs font-bold text-foreground">{index + 1}. {cat}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleMoveToTop(index)}
                            disabled={index === 0}
                            title="Move to Top"
                          >
                            <ArrowUpToLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === categories.length - 1}
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleMoveToBottom(index)}
                            disabled={index === categories.length - 1}
                            title="Move to Bottom"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 ml-1"
                            onClick={() => handleDeleteCategory(cat)}
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No categories found. Add one above to begin!
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Responsive Grid of Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMaterials.map(material => {
          const itemCategory = customCategoriesMap[material.id] || material.category;
          const cartItem = cartQuantities[material.id];
          const hasInCart = !!cartItem;
          const currentInputQty = quantities[material.id] ?? (cartItem?.qty || 1);

          return (
            <motion.div 
              key={material.id} 
              layout
              className="flex flex-col h-full bg-card text-card-foreground rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 relative group"
            >
              {/* Product Badge & Cart Status */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                <Badge className="bg-slate-900/90 text-white font-extrabold text-[10px] tracking-wide border-none px-2.5 py-0.5 shadow-sm">
                  {itemCategory}
                </Badge>
                {hasInCart && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] border-none px-2.5 py-0.5 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> {tInCart} ({cartItem.qty})
                  </Badge>
                )}
              </div>

              {/* Product Image Stage with Zoom */}
              <div 
                className="relative w-full aspect-[4/3] bg-muted overflow-hidden border-b border-border cursor-pointer group/img"
                onClick={() => openImage(material.imageUrl, material.name)}
                title={language === 'ur' ? 'فل سکرین تصویر دیکھیں' : 'Click to view full image'}
              >
                <Image 
                  src={material.imageUrl} 
                  alt={material.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-md font-medium flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <Maximize className="h-3 w-3" />
                  <span>{language === 'ur' ? 'بڑا دیکھیں' : 'Zoom'}</span>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-headline font-bold text-base text-foreground line-clamp-1 group-hover:text-blue-600 transition-colors" title={material.name}>
                    {material.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {material.description || 'Professional grade construction chemical or tool suitable for high-durability marble installation.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Category Assign dropdown for Admins */}
                  <div className="flex items-center justify-between text-xs border-t pt-2 border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{tCategory}</span>
                    <Select 
                      value={itemCategory} 
                      onValueChange={(val) => {
                        const newMap = { ...customCategoriesMap, [material.id]: val };
                        setCustomCategoriesMap(newMap);
                        localStorage.setItem('fixing-materials-custom-categories', JSON.stringify(newMap));
                        broadcastAppUpdate('fixing_categories_updated' as any, {
                          categories,
                          customMap: newMap
                        });
                        toast({ title: "Category Updated", description: `${material.name} moved to ${val}` });
                      }}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs font-semibold border-border bg-background">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pricing Indicator */}
                  <div className="flex items-baseline justify-between py-1 bg-muted/30 px-2.5 rounded-lg border border-border/40">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase">{language === 'ur' ? 'قیمت' : 'Price'}</span>
                    <span className="text-base font-black text-foreground">
                      PKR {material.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {material.unit}</span>
                    </span>
                  </div>

                  {/* Quantity and Actions bar */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Quantity Adjustment Controls */}
                      <div className="flex-1 flex items-center border border-border rounded-xl bg-background h-10 p-1 shadow-xs">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-muted shrink-0 text-foreground"
                          onClick={() => {
                            const nextQty = Math.max(0, currentInputQty - 1);
                            setQuantities(prev => ({ ...prev, [material.id]: nextQty }));
                            if (hasInCart) {
                              handleUpdateCartQuantity(material, nextQty);
                            }
                          }}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        
                        <Input 
                          type="number"
                          min="0"
                          value={currentInputQty === 0 ? '' : currentInputQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setQuantities(prev => ({ ...prev, [material.id]: val }));
                            if (hasInCart) {
                              handleUpdateCartQuantity(material, val);
                            }
                          }}
                          className="border-none bg-transparent text-center h-full p-0 font-black text-sm text-foreground focus-visible:ring-0 w-full"
                          placeholder="1"
                        />

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-muted shrink-0 text-foreground"
                          onClick={() => {
                            const nextQty = currentInputQty + 1;
                            setQuantities(prev => ({ ...prev, [material.id]: nextQty }));
                            if (hasInCart) {
                              handleUpdateCartQuantity(material, nextQty);
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {hasInCart && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 shrink-0"
                          onClick={() => handleUpdateCartQuantity(material, 0)}
                          title={language === 'ur' ? 'آرڈر سے ہٹائیں' : 'Remove item'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Cart Trigger button */}
                    <Button 
                      className={`w-full h-10 font-bold text-xs rounded-xl shadow-xs transition-all ${
                        hasInCart 
                          ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                      onClick={() => {
                        const qtyToSet = currentInputQty > 0 ? currentInputQty : 1;
                        if (!hasInCart && currentInputQty <= 0) {
                          setQuantities(prev => ({ ...prev, [material.id]: 1 }));
                        }
                        handleUpdateCartQuantity(material, qtyToSet);
                      }}
                    >
                      {hasInCart ? (language === 'ur' ? 'مقدار تبدیل کریں' : 'Update Quantity') : tAddToCart}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <Card className="border-dashed border-2 border-stone-200 py-12 text-center bg-stone-50/50">
          <CardContent className="space-y-3">
            <Package className="h-10 w-10 text-stone-400 mx-auto" />
            <h3 className="font-bold text-sm text-stone-700">No Items Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn't find any products matching your current category or search filters. Try clearing your search query or selecting "All" categories.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setFilter('All'); setSearchQuery(''); }}
              className="mt-2 font-bold"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
