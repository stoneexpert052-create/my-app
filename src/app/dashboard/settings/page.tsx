'use client';

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
import { Upload, Loader2, GripVertical, Trash2, PlusCircle, MapPin, Phone, MessageSquare, Sun, Moon, Clock, Home, Building2, Wrench, Palette, Sparkles, RefreshCw, Sliders, TrendingUp, Scale, Calculator, ArrowRight, Percent, Info, Layers } from 'lucide-react';
import { Icons } from '@/components/icons';
import { useTheme } from '@/context/theme-context';
import { useRef, useState, useEffect } from 'react';
import { updateLetterhead, updateCategoryOrder, updateCalculatorCategories, updateServiceTypes, updateCosts, updateBusinessContact, getHomepageConfig, getCostsConfig, clearLetterhead, seedDatabase, clearAllDeletedItems, getBuildYourHomeRatesConfig, updateBuildYourHomeRates, defaultBuildYourHomeRates, deduplicateCategories, type BuildYourHomeRates } from '@/lib/admin-actions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import config from '@/lib/config.json';
import costsConfig from '@/lib/costs.json';
import { useCalculation } from '@/context/calculation-context';
import { DragDropContext, Droppable, Draggable, type OnDragEndResponder } from '@hello-pangea/dnd';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { edgeProfiles } from '@/components/order-form';
import { AdminBackgroundSettings } from '@/components/admin-background-settings';


function ManageCategoryOrder() {
  const [categories, setCategories] = useState<string[]>(() => deduplicateCategories(config.categoryOrder || []));
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(deduplicateCategories(parsed));
        }
      }
    } catch (e) {}

    async function load() {
      const data = await getHomepageConfig();
      if (data && data.categoryOrder) {
        setCategories(deduplicateCategories(data.categoryOrder));
      }
    }
    load();

    const handleCategoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(deduplicateCategories(e.detail));
      }
    };
    window.addEventListener('category_order_updated', handleCategoryUpdate);
    return () => {
      window.removeEventListener('category_order_updated', handleCategoryUpdate);
    };
  }, []);

  const onDragEnd: OnDragEndResponder = (result) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCategories(items);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Category already exists',
        description: `"${trimmed}" is already present in your list.`,
      });
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory('');
    
    // Auto-save immediately to Firestore & localStorage
    setIsSaving(true);
    await updateCategoryOrder(updated);
    setIsSaving(false);
    toast({
      title: 'Category Added & Saved Live!',
      description: `"${trimmed}" is now active in Add Product, Stock, and throughout the entire app.`,
    });
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    const updated = categories.filter((c) => c !== categoryToDelete);
    setCategories(updated);
    setIsSaving(true);
    await updateCategoryOrder(updated);
    setIsSaving(false);
    toast({
      title: 'Category Removed',
      description: `Removed "${categoryToDelete}" and updated live.`,
    });
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    const result = await updateCategoryOrder(categories);
    if (result.success) {
      toast({
        title: 'Categories & Order Saved!',
        description: 'The updated categories and layout will be reflected across the app.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to save categories',
        description: (result as any).error || 'Failed to save categories',
      });
    }
    setIsSaving(false);
  };

  return (
    <Card id="category-order">
      <CardHeader>
        <CardTitle>Homepage Product Categories</CardTitle>
        <CardDescription>
          Add, delete, or drag and drop to reorder the product categories displayed on your homepage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {categories.map((category, index) => (
                  <Draggable key={category} draggableId={category} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center justify-between rounded-md border bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3" {...provided.dragHandleProps}>
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          <span className="font-medium text-foreground">{category}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCategory(category)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter new category name (e.g., 'Travertine')..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <Button onClick={handleAddCategory} type="button" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveOrder} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Categories
        </Button>
      </CardFooter>
    </Card>
  );
}

function ManageServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState(config.serviceTypes || []);
  const [newService, setNewService] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getHomepageConfig();
      if (data && data.serviceTypes) {
        setServiceTypes(data.serviceTypes);
      }
    }
    load();
  }, []);

  const handleAddService = () => {
    if (newService && !serviceTypes.includes(newService)) {
      const updatedServices = [...serviceTypes, newService];
      setServiceTypes(updatedServices);
      setNewService('');
    } else if (serviceTypes.includes(newService)) {
        toast({ variant: 'destructive', title: 'Service already exists' });
    }
  };

  const handleDeleteService = (serviceToDelete: string) => {
    setServiceTypes(serviceTypes.filter(s => s !== serviceToDelete));
  };

  const handleSaveServices = async () => {
    setIsSaving(true);
    const result = await updateServiceTypes(serviceTypes);
    if (result.success) {
      toast({ title: 'Service Types Saved!', description: 'The new list of services is now available for service providers.' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to save services', description: result.error });
    }
    setIsSaving(false);
  };

  return (
    <Card id="service-provider-settings">
      <CardHeader>
        <CardTitle>Manage Service Types</CardTitle>
        <CardDescription>Add or remove the types of services your expert teams can provide.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {serviceTypes.map((service) => (
            <div key={service} className="flex items-center justify-between rounded-md border bg-card p-3 shadow-sm">
              <span className="font-medium">{service}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteService(service)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input 
            value={newService} 
            onChange={(e) => setNewService(e.target.value)}
            placeholder="New service name..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }}
          />
          <Button onClick={handleAddService}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveServices} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Service Types
        </Button>
      </CardFooter>
    </Card>
  );
}

function ManageCosts() {
  const [costs, setCosts] = useState(costsConfig);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { setCosts: setContextCosts } = useCalculation();

  useEffect(() => {
    async function load() {
      const data = await getCostsConfig();
      if (data) {
        setCosts(prev => ({ ...prev, ...data }));
      }
    }
    load();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setCosts(prev => ({
        ...prev,
        [key]: numValue,
      }));
    }
  };

  const handleEdgePriceChange = (key: keyof typeof costs.edgeProfilePrices, value: string) => {
     const numValue = Number(value);
    if (!isNaN(numValue)) {
      setCosts(prev => ({
        ...prev,
        edgeProfilePrices: {
          ...prev.edgeProfilePrices,
          [key]: numValue
        }
      }));
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    // Optimistically update context so any active calculators get the changes instantly!
    setContextCosts(costs);
    const result = await updateCosts(costs);
    if (result.success) {
      toast({ title: 'Costs Updated Successfully!' });
      if (result.updatedCosts) {
        setCosts(result.updatedCosts);
        setContextCosts(result.updatedCosts);
      }
    } else {
      toast({ variant: 'destructive', title: 'Failed to update costs', description: result.error });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Calculation Costs</CardTitle>
        <CardDescription>Adjust the pricing and cost variables used in the calculators across the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">General Costs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="sinkCutCost">Sink Cutout Cost (PKR)</Label>
              <Input id="sinkCutCost" type="number" value={costs.sinkCutCost} onChange={e => handleInputChange('sinkCutCost', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stoveCutCost">Stove Cutout Cost (PKR)</Label>
              <Input id="stoveCutCost" type="number" value={costs.stoveCutCost} onChange={e => handleInputChange('stoveCutCost', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="innerCutRft">Inner Cut Cost (PKR/RFT)</Label>
              <Input id="innerCutRft" type="number" value={costs.innerCutRft} onChange={e => handleInputChange('innerCutRft', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wastagePercentage">Wastage (%)</Label>
              <Input id="wastagePercentage" type="number" value={costs.wastagePercentage} onChange={e => handleInputChange('wastagePercentage', e.target.value)} />
            </div>
          </div>
        </div>
        <Separator />
         <div>
          <h4 className="font-semibold mb-2">Delivery Costs</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label htmlFor="deliveryCostPerTrip">Cost Per Trip (PKR)</Label>
                <Input id="deliveryCostPerTrip" type="number" value={costs.deliveryCostPerTrip} onChange={e => handleInputChange('deliveryCostPerTrip', e.target.value)} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="sqftPerDeliveryTrip">Area Per Trip (sq.ft)</Label>
                <Input id="sqftPerDeliveryTrip" type="number" value={costs.sqftPerDeliveryTrip} onChange={e => handleInputChange('sqftPerDeliveryTrip', e.target.value)} />
            </div>
           </div>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2">Edge Profile Prices (per RFT)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(edgeProfiles).map(([key, profile]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`edge-${key}`}>{profile.name}</Label>
                <Input 
                  id={`edge-${key}`} 
                  type="number" 
                  value={costs.edgeProfilePrices[key as keyof typeof costs.edgeProfilePrices]}
                  onChange={e => handleEdgePriceChange(key as keyof typeof costs.edgeProfilePrices, e.target.value)}
                  disabled={key === 'none'}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Costs
        </Button>
      </CardFooter>
    </Card>
  );
}

function ManageBusinessContact() {
  const [phoneNumber, setPhoneNumber] = useState(config.businessPhoneNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(config.businessWhatsAppNumber);
  const [mapsUrl, setMapsUrl] = useState(config.googleMapsUrl);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getHomepageConfig();
      if (data) {
        if (data.businessPhoneNumber) setPhoneNumber(data.businessPhoneNumber);
        if (data.businessWhatsAppNumber) setWhatsappNumber(data.businessWhatsAppNumber);
        if (data.googleMapsUrl) setMapsUrl(data.googleMapsUrl);
      }
    }
    load();
  }, []);

  const handleSaveContact = async () => {
    setIsSaving(true);
    const result = await updateBusinessContact({ phoneNumber, whatsappNumber, mapsUrl });
    if (result.success) {
      toast({ title: 'Contact Info Updated!', description: 'Phone numbers and location link have been saved.' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to update contact info', description: result.error });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Contact Information</CardTitle>
        <CardDescription>Update your contact numbers and Google Maps location.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Visible to customers)</Label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <Input id="phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+92 339 9991052" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number (For orders - No spaces/pluses)</Label>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <Input id="whatsapp" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="923399991052" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maps">Google Maps URL (Location link)</Label>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Input id="maps" value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="Paste your Google Maps link here..." />
          </div>
          <p className="text-xs text-muted-foreground">Go to Google Maps, find your location, click 'Share' and copy the link.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveContact} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Contact Info
        </Button>
      </CardFooter>
    </Card>
  );
}


// Live rates module removed


function ManageCalculatorCategories() {
  const [categories, setCategories] = useState<string[]>(() => {
    const base = config.categoryOrder ? [...config.categoryOrder] : [];
    if (!base.some(c => c && c.toLowerCase().includes('mdm'))) {
      const graniteIdx = base.indexOf('Imported Granite');
      if (graniteIdx !== -1) {
        base.splice(graniteIdx + 1, 0, 'MDM Material');
      } else {
        base.push('MDM Material');
      }
    }
    return base;
  });
  const [calculatorCategories, setCalculatorCategories] = useState<Record<string, string[]>>({
    simple: ["Local Marble", "Imported Marble", "MDM Material", "Limestone"],
    floor: ["Local Marble", "Imported Marble", "MDM Material", "Marble Tiles", "Limestone"],
    kitchen: ["Local Granite", "Imported Granite", "Artificial Stone", "Corian"],
    vanity: ["Vanity", "Imported Granite", "Local Granite", "Artificial Stone", "Corian"],
    "window-sill": ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material", "Limestone"],
    stairs: ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material"],
    facade: ["Facade Stone"]
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some(c => c && c.toLowerCase().includes('mdm'))) {
            const graniteIdx = parsed.indexOf('Imported Granite');
            if (graniteIdx !== -1) {
              parsed.splice(graniteIdx + 1, 0, 'MDM Material');
            } else {
              parsed.push('MDM Material');
            }
          }
          setCategories(parsed);
        }
      }
    } catch (e) {}

    async function load() {
      const data = await getHomepageConfig();
      if (data) {
        if (data.categoryOrder) {
          setCategories(data.categoryOrder);
        }
        if (data.calculatorCategories) {
          setCalculatorCategories(data.calculatorCategories);
        }
      }
    }
    load();

    const handleCategoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(e.detail);
      }
    };
    window.addEventListener('category_order_updated', handleCategoryUpdate);
    return () => {
      window.removeEventListener('category_order_updated', handleCategoryUpdate);
    };
  }, []);

  const calculatorsList = [
    { id: 'simple', label: 'Simple Floor Calculator / سادہ فرش' },
    { id: 'floor', label: 'Flooring Calculator / فلورنگ' },
    { id: 'kitchen', label: 'Kitchen Calculator / کچن کاؤنٹر ٹاپ' },
    { id: 'vanity', label: 'Vanity Calculator / وینٹی' },
    { id: 'window-sill', label: 'Window Sills Calculator / کھڑکی کی چوکھٹ' },
    { id: 'stairs', label: 'Stairs Calculator / سیڑھیاں' },
    { id: 'facade', label: 'Facade & Wall Cladding / فرنٹ ایلیویشن و فیساڈ پتھر' }
  ];

  const handleToggleCategory = (calcId: string, category: string) => {
    setCalculatorCategories(prev => {
      const currentList = prev[calcId] || [];
      const newList = currentList.includes(category)
        ? currentList.filter(c => c !== category)
        : [...currentList, category];
      return {
        ...prev,
        [calcId]: newList
      };
    });
  };

  const handleSaveMapping = async () => {
    setIsSaving(true);
    const result = await updateCalculatorCategories(calculatorCategories);
    if (result.success) {
      toast({
        title: 'Calculator Mapping Saved!',
        description: 'Calculator categories configuration is updated and published live.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to save configuration',
        description: result.error,
      });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculator Material Categories / کیلکولیٹر مٹیریل کیٹیگریز</CardTitle>
        <CardDescription>
          Select which material categories are available for each calculator. Users must select a material from these categories before entering the calculator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          {calculatorsList.map((calc) => {
            const activeCats = calculatorCategories[calc.id] || [];
            return (
              <div key={calc.id} className="space-y-2 pb-4 border-b last:border-0">
                <Label className="text-sm font-bold block mb-1 text-primary">{calc.label}</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = activeCats.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(calc.id, cat)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:opacity-90'
                            : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveMapping} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Calculator Mapping
        </Button>
      </CardFooter>
    </Card>
  );
}





function DatabaseSyncRestoreCard() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearingDeleted, setIsClearingDeleted] = useState(false);
  const { toast } = useToast();

  const handleRestoreAll = async () => {
    setIsRestoring(true);
    try {
      const res = await seedDatabase();
      if (res.success) {
        toast({
          title: "All Previous Data Restored! / تمام ڈیٹا بحال کر دیا گیا",
          description: "All products, fixing tools, chemicals, rates, categories, and settings are saved to your Firebase database.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Restore Failed",
          description: res.error || "Could not write to Firebase.",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || String(e),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearDeleted = async () => {
    setIsClearingDeleted(true);
    try {
      const res = await clearAllDeletedItems();
      if (res.success) {
        toast({
          title: "Deleted Items Filter Cleared / تمام اشیاء بحال",
          description: "All previously deleted or hidden items are now visible across the app.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed",
          description: res.error,
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message,
      });
    } finally {
      setIsClearingDeleted(false);
    }
  };

  return (
    <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-950 dark:text-amber-200">
          <RefreshCw className="h-5 w-5 text-amber-600 animate-spin-hover" />
          Firebase Database State & Data Restoration / ڈیٹا بیس کی مکمل بحالی
        </CardTitle>
        <CardDescription>
          فائر بیس ڈیٹا بیس اپ گریڈ کے بعد اپنی تمام پچھلی فکس کی ہوئی چیزیں (ماربلز، فکسنگ مٹیریلز، ریٹس، کیٹیگریز اور سیٹنگز) واپس لانے کے لیے نیچے دیا گیا بٹن دبائیں۔
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border text-sm space-y-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Restore All Catalog, Fixing Materials, Security/Steel & Rates:
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            This will upload and verify all stone collections, adhesives, tools, leveling clips, renovation rates, build-your-home rates, categories, and contact settings into your upgraded Firebase database, ensuring nothing is missing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleRestoreAll}
            disabled={isRestoring}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            {isRestoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                بحال کیا جا رہا ہے... (Restoring Database)
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restore All Previous Data to Database (تمام پچھلا ڈیٹا بحال کریں)
              </>
            )}
          </Button>

          <Button
            onClick={handleClearDeleted}
            disabled={isClearingDeleted}
            variant="outline"
            className="border-zinc-300 dark:border-zinc-700"
          >
            {isClearingDeleted ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4 text-zinc-500" />
            )}
            Unhide / Reset All Deleted Items
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [letterheadUrl, setLetterheadUrl] = useState(config.letterheadUrl);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const letterheadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getHomepageConfig();
      if (data && data.hasOwnProperty('letterheadUrl')) {
        setLetterheadUrl(data.letterheadUrl);
      }
    }
    load();
  }, []);
  
  const handleLetterheadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('letterhead', file);
    
    toast({
        title: 'Uploading...',
        description: 'Your new letterhead is being uploaded.',
    });

    try {
        const result = await updateLetterhead(formData);
        
        if (result.success && result.newUrl) {
          setLetterheadUrl(result.newUrl + `?t=${new Date().getTime()}`); // Add timestamp to break cache
          toast({
            title: 'Letterhead Updated',
            description: `The letterhead has been successfully updated.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: result.error || 'An unknown error occurred.',
          });
        }
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Upload Error',
            description: 'An unexpected error occurred during upload.',
        });
    } finally {
         setIsUploading(false);
    }
  };

  const handleClearLetterhead = async () => {
    setIsUploading(true);
    toast({
        title: 'Clearing Letterhead...',
        description: 'Removing company letterhead.',
    });

    try {
        const result = await clearLetterhead();
        
        if (result.success) {
          setLetterheadUrl('');
          toast({
            title: 'Letterhead Cleared',
            description: 'Quotations and challans will now print on a clean blank background.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: result.error || 'Could not clear letterhead.',
          });
        }
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'An unexpected error occurred.',
        });
    } finally {
         setIsUploading(false);
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Settings
          </h1>
        </div>
        <div className="grid max-w-4xl gap-8">
            <DatabaseSyncRestoreCard />
            <AdminBackgroundSettings />
            <ManageThemeSettings />
            <Card>
              <CardHeader>
                  <CardTitle>Company Letterhead</CardTitle>
                  <CardDescription>
                      Upload your official letterhead to customize printed documents and quotations.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="max-w-md space-y-4">
                      <div className="space-y-4">
                          <div>
                              <h3 className="text-sm font-semibold mb-1">Company Letterhead</h3>
                              <p className="text-xs text-muted-foreground">Used as the background for printing official quotations and challans.</p>
                          </div>
                          
                          <div className="relative aspect-[210/297] w-full max-w-[280px] mx-auto overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                              {letterheadUrl ? (
                                  <Image
                                      src={letterheadUrl}
                                      alt="Current letterhead"
                                      fill
                                      className="object-contain"
                                  />
                              ) : (
                                  <div className="text-center p-4 text-muted-foreground">
                                      <p className="font-semibold text-xs">No Letterhead Uploaded</p>
                                      <p className="text-[11px] mt-1">Quotations and challans will print on clean, blank pages.</p>
                                  </div>
                              )}
                              {isUploading && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                                  </div>
                              )}
                          </div>
                          
                          <Input
                              type="file"
                              id="letterhead-upload"
                              ref={letterheadInputRef}
                              className="hidden"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={handleLetterheadChange}
                              disabled={isUploading}
                          />
                          
                          <div className="flex flex-col gap-2">
                              <Button variant="outline" size="sm" className="w-full" onClick={() => letterheadInputRef.current?.click()} disabled={isUploading}>
                                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                  {isUploading ? 'Uploading...' : 'Change Letterhead'}
                              </Button>
                              {letterheadUrl && (
                                  <Button variant="destructive" size="sm" className="w-full" onClick={handleClearLetterhead} disabled={isUploading}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove Letterhead
                                  </Button>
                              )}
                          </div>
                      </div>
                  </div>
              </CardContent>
            </Card>
            <ManageBusinessContact />
            <ManageBuildYourHomeRates />
            <ManageCosts />
            <ManageCategoryOrder />
            <ManageCalculatorCategories />
            <ManageServiceTypes />
        </div>
      </main>
    </>
  );
}

function ManageThemeSettings() {
  const {
    theme,
    themeMode,
    dayStart,
    nightStart,
    isNight,
    themeOverride,
    setThemeMode,
    setDayStart,
    setNightStart,
    toggleTheme,
    clearOverride,
    hydrated
  } = useTheme();

  const [localDayHour, setLocalDayHour] = useState(dayStart);
  const [localNightHour, setLocalNightHour] = useState(nightStart);

  useEffect(() => {
    setLocalDayHour(dayStart);
    setLocalNightHour(nightStart);
  }, [dayStart, nightStart]);

  if (!hydrated) {
    return (
      <Card id="theme-settings">
        <CardHeader>
          <CardTitle>Theme & Day/Night Settings</CardTitle>
          <CardDescription>Loading theme configurations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id="theme-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          <span>Theme & Day/Night Mode Settings</span>
        </CardTitle>
        <CardDescription>
          Configure light/dark mode and the automatic day & night schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Mode Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Select Application Theme Mode</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant={themeMode === 'light' ? 'default' : 'outline'}
              className="w-full justify-center flex items-center gap-2"
              onClick={() => setThemeMode('light')}
            >
              <Sun className="h-4 w-4" />
              <span>Always Light</span>
            </Button>
            <Button
              type="button"
              variant={themeMode === 'dark' ? 'default' : 'outline'}
              className="w-full justify-center flex items-center gap-2"
              onClick={() => setThemeMode('dark')}
            >
              <Moon className="h-4 w-4" />
              <span>Always Dark</span>
            </Button>
            <Button
              type="button"
              variant={themeMode === 'auto' ? 'default' : 'outline'}
              className="w-full justify-center flex items-center gap-2"
              onClick={() => setThemeMode('auto')}
            >
              <Clock className="h-4 w-4" />
              <span>Auto (Day & Night)</span>
            </Button>
          </div>
        </div>

        {/* Day & Night Custom Hours Settings */}
        {themeMode === 'auto' && (
          <div className="space-y-4 p-4 rounded-lg border bg-muted/40">
            <h4 className="text-sm font-medium text-foreground">Configure Day & Night Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day-start-hour" className="text-xs text-muted-foreground">
                  Day Starts At (Hour 0-23)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    id="day-start-hour"
                    min={0}
                    max={23}
                    value={localDayHour}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setLocalDayHour(val);
                        setDayStart(val);
                      }
                    }}
                    className="w-24 bg-card"
                  />
                  <span className="text-xs text-muted-foreground">
                    ({localDayHour >= 12 ? `${localDayHour === 12 ? 12 : localDayHour - 12} PM` : `${localDayHour === 0 ? 12 : localDayHour} AM`})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="night-start-hour" className="text-xs text-muted-foreground">
                  Night Starts At (Hour 0-23)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    id="night-start-hour"
                    min={0}
                    max={23}
                    value={localNightHour}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setLocalNightHour(val);
                        setNightStart(val);
                      }
                    }}
                    className="w-24 bg-card"
                  />
                  <span className="text-xs text-muted-foreground">
                    ({localNightHour >= 12 ? `${localNightHour === 12 ? 12 : localNightHour - 12} PM` : `${localNightHour === 0 ? 12 : localNightHour} AM`})
                  </span>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className={`h-2.5 w-2.5 rounded-full ${isNight ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                <span>
                  Current Time Status: <strong>{isNight ? 'Night Time (Dark)' : 'Day Time (Light)'}</strong>
                </span>
              </div>
              <div className="text-muted-foreground">
                Active Theme: <strong className="capitalize text-primary">{theme}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Override Button (Especially at Night / for Day-Night Mode) */}
        {themeMode === 'auto' && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <span>Day/Night Override Control</span>
              {themeOverride && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                  Override Active
                </span>
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              You can manually force a light or dark theme now. This is a temporary override that lets you read in your preferred mode without changing the schedule.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={themeOverride === null ? 'default' : 'outline'}
                size="sm"
                onClick={toggleTheme}
                className="flex items-center gap-1.5"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>
                  {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </span>
              </Button>
              {themeOverride !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearOverride}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Clear Override (Restore Auto Theme)
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManageBuildYourHomeRates() {
  const [rates, setRates] = useState<BuildYourHomeRates>(defaultBuildYourHomeRates);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [samplePlotSize, setSamplePlotSize] = useState<'marla5' | 'marla10' | 'kanal1' | 'kanal2' | 'custom'>('marla10');
  const [customPlotArea, setCustomPlotArea] = useState<number>(2200);
  const { toast } = useToast();

  const baseCost = rates.newProjects.baseCostPerSqFt ?? rates.newProjects.gradeRates.budget ?? 120;
  const gradeMultipliers = {
    standard: rates.newProjects.gradeMultipliers?.standard ?? 1.0,
    premium: rates.newProjects.gradeMultipliers?.premium ?? 1.83,
    luxury: rates.newProjects.gradeMultipliers?.luxury ?? 3.75,
  };

  const handleMultiplierChange = (grade: 'standard' | 'premium' | 'luxury', val: number) => {
    const validVal = Math.max(0.1, isNaN(val) ? 0.1 : Number(val.toFixed(2)));
    const newMultipliers = {
      ...gradeMultipliers,
      [grade]: validVal,
    };
    
    const newGradeRates = {
      budget: Math.round(baseCost * newMultipliers.standard),
      premium: Math.round(baseCost * newMultipliers.premium),
      luxury: Math.round(baseCost * newMultipliers.luxury),
    };

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        baseCostPerSqFt: baseCost,
        gradeMultipliers: newMultipliers,
        gradeRates: newGradeRates,
      }
    }));
  };

  const handleBaseCostChange = (newBase: number) => {
    const validBase = Math.max(1, isNaN(newBase) ? 1 : newBase);
    const newGradeRates = {
      budget: Math.round(validBase * gradeMultipliers.standard),
      premium: Math.round(validBase * gradeMultipliers.premium),
      luxury: Math.round(validBase * gradeMultipliers.luxury),
    };

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        baseCostPerSqFt: validBase,
        gradeRates: newGradeRates,
      }
    }));
  };

  const handleDirectRateChange = (grade: 'budget' | 'premium' | 'luxury', val: number) => {
    const validVal = Math.max(0, isNaN(val) ? 0 : val);
    const updatedGradeRates = {
      ...rates.newProjects.gradeRates,
      [grade]: validVal,
    };

    let updatedMultipliers = { ...gradeMultipliers };
    if (grade === 'budget') {
      const newBase = validVal || 1;
      updatedMultipliers.standard = 1.0;
      setRates(prev => ({
        ...prev,
        newProjects: {
          ...prev.newProjects,
          baseCostPerSqFt: newBase,
          gradeRates: {
            ...updatedGradeRates,
            budget: newBase,
            premium: Math.round(newBase * gradeMultipliers.premium),
            luxury: Math.round(newBase * gradeMultipliers.luxury),
          },
          gradeMultipliers: updatedMultipliers,
        }
      }));
      return;
    } else if (grade === 'premium') {
      updatedMultipliers.premium = Number((validVal / (baseCost || 1)).toFixed(2));
    } else if (grade === 'luxury') {
      updatedMultipliers.luxury = Number((validVal / (baseCost || 1)).toFixed(2));
    }

    setRates(prev => ({
      ...prev,
      newProjects: {
        ...prev.newProjects,
        gradeRates: updatedGradeRates,
        gradeMultipliers: updatedMultipliers,
      }
    }));
  };

  const sampleAreas: Record<string, { label: string; sqft: number }> = {
    marla5: { label: '5 Marla', sqft: rates.newProjects.baseAreaSqFt?.marla5 || 1100 },
    marla10: { label: '10 Marla', sqft: rates.newProjects.baseAreaSqFt?.marla10 || 2200 },
    kanal1: { label: '1 Kanal', sqft: rates.newProjects.baseAreaSqFt?.kanal1 || 4500 },
    kanal2: { label: '2 Kanal', sqft: rates.newProjects.baseAreaSqFt?.kanal2 || 9000 },
    custom: { label: 'Custom', sqft: customPlotArea },
  };

  const activeSimulatorArea = samplePlotSize === 'custom' ? customPlotArea : sampleAreas[samplePlotSize].sqft;

  const stdRate = rates.newProjects.gradeRates.budget || Math.round(baseCost * gradeMultipliers.standard);
  const premRate = rates.newProjects.gradeRates.premium || Math.round(baseCost * gradeMultipliers.premium);
  const luxRate = rates.newProjects.gradeRates.luxury || Math.round(baseCost * gradeMultipliers.luxury);

  const stdTotal = activeSimulatorArea * stdRate;
  const premTotal = activeSimulatorArea * premRate;
  const luxTotal = activeSimulatorArea * luxRate;

  const premDeltaTotal = premTotal - stdTotal;
  const luxDeltaTotal = luxTotal - stdTotal;

  const premDeltaRate = premRate - stdRate;
  const luxDeltaRate = luxRate - stdRate;

  const premImpactPct = ((gradeMultipliers.premium - gradeMultipliers.standard) / (gradeMultipliers.standard || 1)) * 100;
  const luxImpactPct = ((gradeMultipliers.luxury - gradeMultipliers.standard) / (gradeMultipliers.standard || 1)) * 100;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await getBuildYourHomeRatesConfig();
      if (data) {
        setRates(data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateBuildYourHomeRates(rates);
    if (result.success) {
      toast({
        title: 'Build Your Home Rates Saved!',
        description: 'All pricing updates are now live on the Build Your Home page.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to save rates',
        description: result.error,
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card id="build-your-home-rates">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-amber-500" />
            <span>Manage "Build Your Home" Rates</span>
          </CardTitle>
          <CardDescription>Loading pricing configuration...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="build-your-home-rates" className="border-amber-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Home className="h-5 w-5 text-amber-500" />
            <span>Manage "Build Your Home" Rates</span>
          </CardTitle>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
            Market Price Manager
          </span>
        </div>
        <CardDescription>
          Adjust base rates, quality grades, scope multipliers, and custom interior stone pricing displayed on the "Build Your Home with Stone Expert" page.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="maintenance" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="maintenance" className="text-xs sm:text-sm flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              <span>1. Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="construction" className="text-xs sm:text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              <span>2. New Projects</span>
            </TabsTrigger>
            <TabsTrigger value="interior" className="text-xs sm:text-sm flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              <span>3. Interior System</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MAINTENANCE RATES */}
          <TabsContent value="maintenance" className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Service Base Rates (PKR per Sq. Ft)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="maint-polishing">Diamond Polishing (PKR/sqft)</Label>
                <Input
                  id="maint-polishing"
                  type="number"
                  value={rates.maintenance.polishing}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: { ...rates.maintenance, polishing: Number(e.target.value) }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-repair">Crack & Resin Repair (PKR/sqft)</Label>
                <Input
                  id="maint-repair"
                  type="number"
                  value={rates.maintenance.repair}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: { ...rates.maintenance, repair: Number(e.target.value) }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-cleaning">Stain Deep Cleaning (PKR/sqft)</Label>
                <Input
                  id="maint-cleaning"
                  type="number"
                  value={rates.maintenance.cleaning}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: { ...rates.maintenance, cleaning: Number(e.target.value) }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-sealing">Hydrophobic Sealing (PKR/sqft)</Label>
                <Input
                  id="maint-sealing"
                  type="number"
                  value={rates.maintenance.sealing}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: { ...rates.maintenance, sealing: Number(e.target.value) }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-alignment">Tile Leveling & Grouting (PKR/sqft)</Label>
                <Input
                  id="maint-alignment"
                  type="number"
                  value={rates.maintenance.alignment}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: { ...rates.maintenance, alignment: Number(e.target.value) }
                  })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Urgency Multipliers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="urgency-standard">Standard (e.g. 1.0)</Label>
                <Input
                  id="urgency-standard"
                  type="number"
                  step="0.05"
                  value={rates.maintenance.urgencyMultipliers.standard}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: {
                      ...rates.maintenance,
                      urgencyMultipliers: { ...rates.maintenance.urgencyMultipliers, standard: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="urgency-priority">Priority 48-Hr (e.g. 1.15)</Label>
                <Input
                  id="urgency-priority"
                  type="number"
                  step="0.05"
                  value={rates.maintenance.urgencyMultipliers.priority}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: {
                      ...rates.maintenance,
                      urgencyMultipliers: { ...rates.maintenance.urgencyMultipliers, priority: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="urgency-emergency">Emergency Visit (e.g. 1.30)</Label>
                <Input
                  id="urgency-emergency"
                  type="number"
                  step="0.05"
                  value={rates.maintenance.urgencyMultipliers.emergency}
                  onChange={(e) => setRates({
                    ...rates,
                    maintenance: {
                      ...rates.maintenance,
                      urgencyMultipliers: { ...rates.maintenance.urgencyMultipliers, emergency: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: NEW CONSTRUCTION PROJECTS */}
          <TabsContent value="construction" className="space-y-6">
            {/* Grade Multipliers & Material Quality Grades */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-amber-500" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Construction Grade Multipliers & Quality Tiers</h4>
                    <p className="text-xs text-muted-foreground">
                      Configure multipliers for Standard, Premium, and Luxury grades. Multipliers scale directly off your base cost with real-time feedback.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-lg border text-xs">
                  <span className="text-muted-foreground font-medium">Base Reference:</span>
                  <span className="font-bold text-foreground">PKR {baseCost}/sq.ft</span>
                </div>
              </div>

              {/* Baseline Rate Controller */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-background/60 p-3.5 rounded-lg border">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="base-cost-sqft" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-amber-500" />
                    Baseline Construction Rate (PKR per Sq. Ft)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    The fundamental base cost from which all grade multipliers calculate total project estimates.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      id="base-cost-sqft"
                      type="number"
                      min="1"
                      value={baseCost}
                      onChange={(e) => handleBaseCostChange(Number(e.target.value))}
                      className="font-bold text-base pl-12 h-9"
                    />
                    <span className="absolute left-3 top-2 text-xs text-muted-foreground font-semibold">PKR</span>
                  </div>
                </div>
              </div>

              {/* Three Grade Multipliers & Real-Time Impact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Grade */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Standard Local</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                        Baseline Grade
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="grade-mult-standard" className="text-xs font-semibold">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="grade-mult-standard"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.standard}
                          onChange={(e) => handleMultiplierChange('standard', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 1.00× (100% baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="grade-budget" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="grade-budget"
                        type="number"
                        value={stdRate}
                        onChange={(e) => handleDirectRateChange('budget', Number(e.target.value))}
                        className="font-bold text-sm h-8"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gradeMultipliers.standard === 1.0 ? '±0% (Baseline)' : `${gradeMultipliers.standard > 1 ? '+' : ''}${((gradeMultipliers.standard - 1) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.standard / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Sunny White / Ziarat local marble
                    </p>
                  </div>
                </div>

                {/* Premium Grade */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Premium Local</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        +{premImpactPct.toFixed(1)}% Cost
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="grade-mult-premium" className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="grade-mult-premium"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.premium}
                          onChange={(e) => handleMultiplierChange('premium', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm border-amber-500/40"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-amber-600 dark:text-amber-400 font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 1.83× (+83% over baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="grade-premium" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="grade-premium"
                        type="number"
                        value={premRate}
                        onChange={(e) => handleDirectRateChange('premium', Number(e.target.value))}
                        className="font-bold text-sm h-8 border-amber-500/30"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        +{premDeltaRate} PKR/sqft (+{premImpactPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.premium / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Boticena / Badam / Local Granite
                    </p>
                  </div>
                </div>

                {/* Luxury Grade */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Imported Luxury</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        +{luxImpactPct.toFixed(1)}% Cost
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="grade-mult-luxury" className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        Grade Multiplier
                      </Label>
                      <div className="relative">
                        <Input
                          id="grade-mult-luxury"
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={gradeMultipliers.luxury}
                          onChange={(e) => handleMultiplierChange('luxury', Number(e.target.value))}
                          className="font-mono font-bold pl-8 text-sm border-purple-500/40"
                        />
                        <span className="absolute left-2.5 top-2.5 text-xs text-purple-600 dark:text-purple-400 font-bold">×</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Default 3.75× (+275% over baseline)</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label htmlFor="grade-luxury" className="text-xs font-semibold text-muted-foreground">
                        Effective Rate (PKR/sqft)
                      </Label>
                      <Input
                        id="grade-luxury"
                        type="number"
                        value={luxRate}
                        onChange={(e) => handleDirectRateChange('luxury', Number(e.target.value))}
                        className="font-bold text-sm h-8 border-purple-500/30"
                      />
                    </div>
                  </div>

                  {/* Real-time Impact Indicator */}
                  <div className="pt-2 border-t border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact on Base:</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400">
                        +{luxDeltaRate} PKR/sqft (+{luxImpactPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-purple-500/20 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (gradeMultipliers.luxury / 4) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Italian Carrera / Spanish Botticino / Exotic Granite
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-Time Impact Feedback Indicator & Live House Project Simulator */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Real-Time Impact Feedback (Client Cost Simulator)</h5>
                      <p className="text-[11px] text-muted-foreground">
                        Live preview of how the configured multipliers impact total base finishing costs for different home sizes.
                      </p>
                    </div>
                  </div>

                  {/* Plot Size Selector */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    {(['marla5', 'marla10', 'kanal1', 'kanal2', 'custom'] as const).map((plotKey) => {
                      const isActive = samplePlotSize === plotKey;
                      const areaLabel = plotKey === 'custom' ? 'Custom' : sampleAreas[plotKey].label;
                      return (
                        <button
                          key={plotKey}
                          type="button"
                          onClick={() => setSamplePlotSize(plotKey)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                            isActive 
                              ? 'bg-amber-500 text-white font-bold shadow-xs' 
                              : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {areaLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Area Input if Custom selected */}
                {samplePlotSize === 'custom' && (
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border">
                    <Label htmlFor="custom-sim-area" className="text-xs font-semibold whitespace-nowrap">
                      Custom Covered Area (Sq. Ft):
                    </Label>
                    <Input
                      id="custom-sim-area"
                      type="number"
                      min="100"
                      value={customPlotArea}
                      onChange={(e) => setCustomPlotArea(Math.max(1, Number(e.target.value)))}
                      className="h-8 max-w-[160px] font-bold text-xs"
                    />
                    <span className="text-xs text-muted-foreground">sq.ft covered area for simulation</span>
                  </div>
                )}

                {/* 3-Way Real-Time Cost Impact Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Standard Estimate */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Standard ({gradeMultipliers.standard.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold">Baseline</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      PKR {stdTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {activeSimulatorArea.toLocaleString()} sq.ft @ PKR {stdRate}/sqft
                    </div>
                  </div>

                  {/* Premium Estimate */}
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Premium ({gradeMultipliers.premium.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                        +{premImpactPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      PKR {premTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-amber-700/80 dark:text-amber-400/80 flex items-center justify-between">
                      <span>Impact Delta:</span>
                      <span>+PKR {premDeltaTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Luxury Estimate */}
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">Luxury ({gradeMultipliers.luxury.toFixed(2)}×)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                        +{luxImpactPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      PKR {luxTotal.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-purple-700/80 dark:text-purple-400/80 flex items-center justify-between">
                      <span>Impact Delta:</span>
                      <span>+PKR {luxDeltaTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Explanatory Live Feedback Banner */}
                <div className="flex items-start gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs text-muted-foreground">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Real-time Impact Summary:</strong> On a <span className="font-semibold text-foreground">{activeSimulatorArea.toLocaleString()} sq.ft</span> home, choosing <span className="font-semibold text-amber-600 dark:text-amber-400">Premium ({gradeMultipliers.premium.toFixed(2)}×)</span> increases cost by <span className="font-semibold text-foreground">PKR {premDeltaTotal.toLocaleString()}</span> over baseline. Choosing <span className="font-semibold text-purple-600 dark:text-purple-400">Luxury ({gradeMultipliers.luxury.toFixed(2)}×)</span> creates a <span className="font-semibold text-foreground">PKR {luxDeltaTotal.toLocaleString()}</span> upgrade difference.
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Scope Multiplier Component Factors</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="scope-base">Base Contract Ratio (e.g. 0.40)</Label>
                <Input
                  id="scope-base"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.base}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, base: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="scope-flooring">Flooring Addition (+ ratio)</Label>
                <Input
                  id="scope-flooring"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.flooring}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, flooring: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="scope-stairs">Stairs Addition (+ ratio)</Label>
                <Input
                  id="scope-stairs"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.stairs}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, stairs: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="scope-kitchen">Kitchen Addition (+ ratio)</Label>
                <Input
                  id="scope-kitchen"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.kitchen}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, kitchen: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="scope-elevation">Elevation Addition (+ ratio)</Label>
                <Input
                  id="scope-elevation"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.elevation}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, elevation: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="scope-bathrooms">Bathrooms Addition (+ ratio)</Label>
                <Input
                  id="scope-bathrooms"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.scopeMultipliers.bathrooms}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      scopeMultipliers: { ...rates.newProjects.scopeMultipliers, bathrooms: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Plot Size Area Assumptions (Sq. Ft)</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label htmlFor="area-5marla">5 Marla Area</Label>
                <Input
                  id="area-5marla"
                  type="number"
                  value={rates.newProjects.baseAreaSqFt.marla5}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      baseAreaSqFt: { ...rates.newProjects.baseAreaSqFt, marla5: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="area-10marla">10 Marla Area</Label>
                <Input
                  id="area-10marla"
                  type="number"
                  value={rates.newProjects.baseAreaSqFt.marla10}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      baseAreaSqFt: { ...rates.newProjects.baseAreaSqFt, marla10: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="area-1kanal">1 Kanal Area</Label>
                <Input
                  id="area-1kanal"
                  type="number"
                  value={rates.newProjects.baseAreaSqFt.kanal1}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      baseAreaSqFt: { ...rates.newProjects.baseAreaSqFt, kanal1: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="area-2kanal">2 Kanal Area</Label>
                <Input
                  id="area-2kanal"
                  type="number"
                  value={rates.newProjects.baseAreaSqFt.kanal2}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      baseAreaSqFt: { ...rates.newProjects.baseAreaSqFt, kanal2: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="area-commercial">Commercial Area</Label>
                <Input
                  id="area-commercial"
                  type="number"
                  value={rates.newProjects.baseAreaSqFt.commercial}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      baseAreaSqFt: { ...rates.newProjects.baseAreaSqFt, commercial: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Floor Cost Multipliers (Ground, First, Mezzanine, 2nd, Basement)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label htmlFor="floor-mult-ground">Ground Floor</Label>
                <Input
                  id="floor-mult-ground"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.ground ?? 1.0}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        ...{ ground: 1.0, first: 0.95, mezzanine: 0.90, second: 0.95, basement: 1.15 },
                        ...rates.newProjects.floorRateMultipliers,
                        ground: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="floor-mult-first">First Floor</Label>
                <Input
                  id="floor-mult-first"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.first ?? 0.95}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        ...{ ground: 1.0, first: 0.95, mezzanine: 0.90, second: 0.95, basement: 1.15 },
                        ...rates.newProjects.floorRateMultipliers,
                        first: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="floor-mult-mezz">Mezzanine Floor</Label>
                <Input
                  id="floor-mult-mezz"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.mezzanine ?? 0.90}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        ...{ ground: 1.0, first: 0.95, mezzanine: 0.90, second: 0.95, basement: 1.15 },
                        ...rates.newProjects.floorRateMultipliers,
                        mezzanine: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="floor-mult-second">2nd / Mumty Floor</Label>
                <Input
                  id="floor-mult-second"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.second ?? 0.95}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        ...{ ground: 1.0, first: 0.95, mezzanine: 0.90, second: 0.95, basement: 1.15 },
                        ...rates.newProjects.floorRateMultipliers,
                        second: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="floor-mult-basement">Basement Floor</Label>
                <Input
                  id="floor-mult-basement"
                  type="number"
                  step="0.05"
                  value={rates.newProjects.floorRateMultipliers?.basement ?? 1.15}
                  onChange={(e) => setRates({
                    ...rates,
                    newProjects: {
                      ...rates.newProjects,
                      floorRateMultipliers: {
                        ...{ ground: 1.0, first: 0.95, mezzanine: 0.90, second: 0.95, basement: 1.15 },
                        ...rates.newProjects.floorRateMultipliers,
                        basement: Number(e.target.value)
                      }
                    }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: INTERIOR WORK SYSTEM */}
          <TabsContent value="interior" className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Stone Craft Technique Base Rates (PKR per Sq. Ft)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tech-bookmatched">Bookmatched Italian Slabs (PKR/sqft)</Label>
                <Input
                  id="tech-bookmatched"
                  type="number"
                  value={rates.interior.techniques.bookmatched}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      techniques: { ...rates.interior.techniques, bookmatched: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tech-backlit">Translucent Backlit Onyx (PKR/sqft)</Label>
                <Input
                  id="tech-backlit"
                  type="number"
                  value={rates.interior.techniques.backlitOnyx}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      techniques: { ...rates.interior.techniques, backlitOnyx: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tech-cnc">CNC 3D Carved Murals (PKR/sqft)</Label>
                <Input
                  id="tech-cnc"
                  type="number"
                  value={rates.interior.techniques.cncCarved}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      techniques: { ...rates.interior.techniques, cncCarved: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tech-waterjet">Waterjet Brass Inlay (PKR/sqft)</Label>
                <Input
                  id="tech-waterjet"
                  type="number"
                  value={rates.interior.techniques.waterjetBrass}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      techniques: { ...rates.interior.techniques, waterjetBrass: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tech-fluted">Fluted & Ribbed Stone (PKR/sqft)</Label>
                <Input
                  id="tech-fluted"
                  type="number"
                  value={rates.interior.techniques.flutedStone}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      techniques: { ...rates.interior.techniques, flutedStone: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Surface Finish Addons (PKR per Sq. Ft)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="finish-mirror">High Gloss Mirror (+PKR)</Label>
                <Input
                  id="finish-mirror"
                  type="number"
                  value={rates.interior.finishes.mirrorGloss}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      finishes: { ...rates.interior.finishes, mirrorGloss: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="finish-honed">Honed Satin (+PKR)</Label>
                <Input
                  id="finish-honed"
                  type="number"
                  value={rates.interior.finishes.honedSatin}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      finishes: { ...rates.interior.finishes, honedSatin: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="finish-fluted">Fluted Ribbed (+PKR)</Label>
                <Input
                  id="finish-fluted"
                  type="number"
                  value={rates.interior.finishes.flutedTextured}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      finishes: { ...rates.interior.finishes, flutedTextured: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="finish-leathered">Leathered Touch (+PKR)</Label>
                <Input
                  id="finish-leathered"
                  type="number"
                  value={rates.interior.finishes.leathered}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      finishes: { ...rates.interior.finishes, leathered: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>

            <Separator className="my-2" />

            <h4 className="text-sm font-bold text-foreground">Integrated Backlighting Addons (PKR per Sq. Ft)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="light-warm">Warm LED Panel (+PKR)</Label>
                <Input
                  id="light-warm"
                  type="number"
                  value={rates.interior.lighting.warmLed}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      lighting: { ...rates.interior.lighting, warmLed: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="light-rgb">Smart RGB Control (+PKR)</Label>
                <Input
                  id="light-rgb"
                  type="number"
                  value={rates.interior.lighting.rgbAccent}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      lighting: { ...rates.interior.lighting, rgbAccent: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="light-spot">Ceiling Spotlights (+PKR)</Label>
                <Input
                  id="light-spot"
                  type="number"
                  value={rates.interior.lighting.spotlights}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      lighting: { ...rates.interior.lighting, spotlights: Number(e.target.value) }
                    }
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="light-none">No Lighting (+PKR)</Label>
                <Input
                  id="light-none"
                  type="number"
                  value={rates.interior.lighting.none}
                  onChange={(e) => setRates({
                    ...rates,
                    interior: {
                      ...rates.interior,
                      lighting: { ...rates.interior.lighting, none: Number(e.target.value) }
                    }
                  })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Changes will immediately take effect for all customer calculations.
        </p>
        <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Build Your Home Rates
        </Button>
      </CardFooter>
    </Card>
  );
}
