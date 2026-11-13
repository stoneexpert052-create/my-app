'use client';

import { Header } from '@/components/header';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFullscreenImage } from '@/context/fullscreen-image-context';
import { Button } from '@/components/ui/button';
import { Pencil, PlusCircle, ChevronDown, Save, ArrowLeft, MapPin, Loader2, Send, X, Gem, Truck, Globe, Info, CheckCircle2, Wrench, Package, LayoutGrid, Eye, Calculator, Share2, ArrowRight, Maximize2, Minimize2, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Trash2, Settings, Plus, Scale, Search, Check, Scissors, Upload, Camera, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Marble, MarbleVariant, Requirement, RequirementType, Customer, Order, FixingMaterial } from '@/lib/types';
import { marbles as initialMarbles, materialTypes, fixingMaterialCategories, sizeOptions, thicknessOptions } from '@/lib/data';
import initialFixingMaterials from '@/lib/fixing-materials-data.json';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import config from '@/lib/config.json';
import { Icons } from '@/components/icons';
import { requirementOptions } from '@/lib/requirements-config';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useCalculation } from '@/context/calculation-context';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { saveOrder, getOrdersByIds, getHomepageConfig, getMarbles, getFixingMaterials, broadcastAppUpdate, subscribeToAppUpdates } from '@/lib/admin-actions';
import { FixingMaterialsCatalog } from '@/components/fixing-materials-catalog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import RequirementCard from '@/components/requirement-card';
import { edgeProfiles } from '@/components/order-form';
import { useUser } from '@/firebase';

import { VanityDesigner } from '@/components/vanity-designer';
import { KitchenDesigner } from '@/components/kitchen-designer';
import { OrderForm } from '@/components/order-form';
import { FloorPlanner } from '@/components/floor-planner';
import { SimpleCalculator } from '@/components/simple-calculator';
import { LaborQuoteCalculator } from '@/components/labor-quote-calculator';
import { CuttingOptimizerPro } from '@/components/cutting-optimizer-pro';


const filterCategories = [
    { value: 'All', label: 'all_materials' }, 
    { value: 'Marble Tiles', label: 'Marble Tiles' },
    { value: 'Local Marble', label: 'Local Marble' },
    { value: 'Imported Marble', label: 'Imported Marble' },
    { value: 'Local Granite', label: 'Local Granite' },
    { value: 'Imported Granite', label: 'Imported Granite' },
    { value: 'Artificial Stone', label: 'Artificial Stone' },
    { value: 'Inlay', label: 'Inlay' },
    { value: 'Antique', label: 'Antique' },
    { value: 'Vanity', label: 'Vanity' },
    { value: 'Corian', label: 'Corian' },
    { value: 'Facade Stone', label: 'Facade Stone' },
    { value: 'Limestone', label: 'Limestone' },
];




export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const { openImage } = useFullscreenImage();
  const searchParams = useSearchParams();
  const rawMarbleIdFromUrl = Array.isArray(params.marbleId) ? params.marbleId[0] : params.marbleId;
  const [selectedSelectorMarbleId, setSelectedSelectorMarbleId] = useState<string | null>(null);
  const marbleIdFromUrl = selectedSelectorMarbleId || rawMarbleIdFromUrl;
  const isAdmin = searchParams.get('admin') === 'true';
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useUser();
  const [letterheadUrl, setLetterheadUrl] = useState(config.letterheadUrl);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [categories, setCategories] = useState<string[]>(() => config.categoryOrder);
  const [calcCategories, setCalcCategories] = useState<Record<string, string[]> | null>(null);
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorCategory, setSelectorCategory] = useState('Recommended');

  // Direct Slab Photo Upload & Live Camera Popup states for Cutting Optimizer
  const [isDirectSlabPopupOpen, setIsDirectSlabPopupOpen] = useState(false);
  const [isStandaloneOptimizerOpen, setIsStandaloneOptimizerOpen] = useState(false);
  const [directSlabPhotoUrl, setDirectSlabPhotoUrl] = useState<string>('');
  const [directSlabLabel, setDirectSlabLabel] = useState<string>('Custom Uploaded Marble Slab');
  const [directSlabLength, setDirectSlabLength] = useState<number>(110);
  const [directSlabWidth, setDirectSlabWidth] = useState<number>(60);
  const [directSlabScale, setDirectSlabScale] = useState<number>(100);
  const [directSlabOffsetX, setDirectSlabOffsetX] = useState<number>(0);
  const [directSlabOffsetY, setDirectSlabOffsetY] = useState<number>(0);
  const [directSlabRotation, setDirectSlabRotation] = useState<number>(0);
  const [isDirectCameraActive, setIsDirectCameraActive] = useState<boolean>(false);
  const [directCameraError, setDirectCameraError] = useState<string | null>(null);
  const directVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const directStreamRef = React.useRef<MediaStream | null>(null);
  const directFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const directMobileCameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const autoOpenedCalcKeyRef = React.useRef<string | null>(null);

  const stopDirectCamera = useCallback(() => {
    if (directStreamRef.current) {
      directStreamRef.current.getTracks().forEach((track) => track.stop());
      directStreamRef.current = null;
    }
    setIsDirectCameraActive(false);
  }, []);

  const startDirectCamera = async () => {
    setDirectCameraError(null);
    setIsDirectCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDirectCameraError(
          'اس براؤزر میں لائیو ویب کیم دستیاب نہیں ہے۔ براہ کرم ساتھ والا "موبائل کیمرہ / گیلری" بٹن استعمال کریں۔'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1000 } },
        audio: false,
      });
      directStreamRef.current = stream;
      if (directVideoRef.current) {
        directVideoRef.current.srcObject = stream;
        await directVideoRef.current.play().catch(() => {});
      }
    } catch {
      setDirectCameraError(
        'کیمرہ کی اجازت نہیں ملی یا کیمرہ دستیاب نہیں ہے۔ آپ "فائل / موبائل کیمرہ اپ لوڈ" بٹن سے تصویر منتخب کر سکتے ہیں۔'
      );
    }
  };

  const captureDirectCameraPhoto = () => {
    if (!directVideoRef.current) return;
    const video = directVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
      setDirectSlabPhotoUrl(dataUrl);
      setDirectSlabLabel(`Camera Slab (${new Date().toLocaleTimeString()})`);
    }
    stopDirectCamera();
  };

  const handleDirectSlabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDirectSlabPhotoUrl(reader.result);
        setDirectSlabLabel(file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Slab Photo');
        stopDirectCamera();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    return () => {
      if (directStreamRef.current) {
        directStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    setSelectedSelectorMarbleId(null);
  }, [rawMarbleIdFromUrl]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
      }
    } catch (e) {}

    async function fetchConfig() {
      const data = await getHomepageConfig();
      if (data) {
        if (data.letterheadUrl) {
          setLetterheadUrl(data.letterheadUrl);
        }
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
        if (data.categoryOrder) {
          setCategories(data.categoryOrder);
        }
        if (data.calculatorCategories) {
          setCalcCategories(data.calculatorCategories);
        }
      }
    }
    fetchConfig();

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

  const {
    customerInfo,
    setCustomerInfo,
    requirements,
    addRequirement,
    addPerPieceRequirement,
    addFixingMaterialRequirement,
    removeRequirement,
    updateRequirement,
    clearRequirements,
    setRequirements,
    setSelectedMarble,
    selectedMarble,
    deliveryCost,
  } = useCalculation();

  const { language } = useLanguage();
  
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isFixingMaterialDialogOpen, setIsFixingMaterialDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const [customerForm, setCustomerForm] = useState<Partial<Customer>>(customerInfo);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  const [loadSizes, setLoadSizes] = useState<string[]>([]);
  const [newLoadSize, setNewLoadSize] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('custom_load_sizes');
    const defaultLoadSizes = [
      'Gang saw sheet',
      'Counter, 24 inches',
      '36-inch counter',
      '42-inch counter',
      '52-inch counter',
      'Block'
    ];
    if (saved) {
      try {
        setLoadSizes(JSON.parse(saved));
      } catch (e) {
        setLoadSizes(defaultLoadSizes);
      }
    } else {
      setLoadSizes(defaultLoadSizes);
    }
  }, []);

  const handleAddLoadSize = () => {
    if (!newLoadSize.trim()) return;
    const trimmed = newLoadSize.trim();
    if (!loadSizes.includes(trimmed)) {
      const updated = [...loadSizes, trimmed];
      setLoadSizes(updated);
      localStorage.setItem('custom_load_sizes', JSON.stringify(updated));
    }
    setCustomerForm(prev => ({ ...prev, loadSize: trimmed }));
    setNewLoadSize('');
  };
  
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null);
  const [changingMaterialId, setChangingMaterialId] = useState<number | null>(null);
  const [isMaterialSelectorFullScreen, setIsMaterialSelectorFullScreen] = useState(false);
  const [isCalculatorFullScreen, setIsCalculatorFullScreen] = useState(false);
  
  const [marblesList, setMarblesList] = useState<Marble[]>(initialMarbles);
  const [fixingMaterialsList, setFixingMaterialsList] = useState<FixingMaterial[]>(initialFixingMaterials as FixingMaterial[]);

  useEffect(() => {
    async function fetchMarbles() {
      try {
        const dbMarbles = await getMarbles();
        if (dbMarbles && dbMarbles.length > 0) {
          setMarblesList(dbMarbles);
        }
      } catch (e) {
        console.warn("Using fallback marbles for order page:", e);
      }
    }
    fetchMarbles();

    async function fetchFixingMaterials() {
      try {
        const dbFixings = await getFixingMaterials();
        if (dbFixings && dbFixings.length > 0) {
          setFixingMaterialsList(dbFixings);
        }
      } catch (e) {
        console.warn("Using fallback fixings for order page:", e);
      }
    }
    fetchFixingMaterials();

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'products_updated') {
        fetchMarbles();
      }
      if (event.type === 'products_updated' || event.type === 'fixing_materials_updated') {
        fetchFixingMaterials();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const numberedMarbles = useMemo(() => marblesList.map((m, index) => ({...m, name: m.name.replace(/^\d+\.\s/, ''), nameWithNum: `${index + 1}. ${m.name}`, number: index + 1 })), [marblesList]);
  
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('All');
  
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [marbleForPopup, setMarbleForPopup] = useState<Marble | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string>('');
  
  const [isPerPieceProduct, setIsPerPieceProduct] = useState(false);
  const [perPieceQuantity, setPerPieceQuantity] = useState(1);
  const isGeneralSuppliesOrder = marbleIdFromUrl === 'general-supplies-order';
  const [currentVariant, setCurrentVariant] = useState<MarbleVariant | null>(null);


  const filteredMarblesForSearch = useMemo(() => {
    let results = numberedMarbles;
    if (materialFilter !== 'All') {
        switch (materialFilter) {
            case 'Marble Tiles':
                results = results.filter(m => m.materialType === '12x24 Tiles');
                break;
            case 'Local Marble':
                results = results.filter(m => m.materialType === 'Marble' && m.origin === 'Local');
                break;
            case 'Imported Marble':
                results = results.filter(m => m.materialType === 'Marble' && m.origin === 'Imported');
                break;
            case 'Local Granite':
                results = results.filter(m => m.materialType === 'Granite' && m.origin === 'Local');
                break;
            case 'Imported Granite':
                results = results.filter(m => m.materialType === 'Granite' && m.origin === 'Imported');
                break;
            default:
                results = results.filter(m => m.materialType === materialFilter || m.category === materialFilter || (m.category && m.category.toLowerCase() === materialFilter.toLowerCase()));
        }
    }

    if (materialSearchQuery) {
        results = results.filter(m => m.name.toLowerCase().includes(materialSearchQuery.toLowerCase()));
    }
    return results;
  }, [numberedMarbles, materialSearchQuery, materialFilter]);
  
  const [quotationNumber, setQuotationNumber] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  
  const grandTotal = useMemo(() => {
    const itemsTotal = requirements.reduce((acc, req) => acc + (req.total || 0), 0);
    return itemsTotal + deliveryCost;
  }, [requirements, deliveryCost]);


  useEffect(() => {
    setCustomerForm(customerInfo);
  }, [customerInfo]);

  useEffect(() => {
    async function loadOrder() {
        const orderId = searchParams.get('orderId');
        if (!orderId) {
             const initialMarble = numberedMarbles.find(m => m.id === marbleIdFromUrl) || null;
            if (initialMarble) {
              const perPiece = ['Vanity', 'Inlay', 'Antique'].includes(initialMarble.materialType);
              setIsPerPieceProduct(perPiece);
              if (perPiece) {
                  const existingReq = requirements.find(r => r.marbleId === initialMarble.id && r.details?.isPerPiece);
                  if (existingReq) {
                      setPerPieceQuantity(existingReq.quantity || 1);
                  }
              }
              setSelectedMarble(initialMarble);
              if (initialMarble.variants.length > 0) {
                setCurrentVariant(initialMarble.variants[0]);
              }
            }
            return;
        };

        const existingOrders = await getOrdersByIds([orderId]);
        const existingOrder = existingOrders[0];

        if (existingOrder?.calculationDetails) {
            setRequirements(existingOrder.calculationDetails.requirements);
            if (existingOrder.calculationDetails.customerInfo) {
                setCustomerInfo(existingOrder.calculationDetails.customerInfo);
            }
            const initialMarble = existingOrder.calculationDetails.marble;
            setSelectedMarble(initialMarble || null);
            if (initialMarble && initialMarble.variants.length > 0) {
                const reqVariant = existingOrder.calculationDetails.requirements.find(r => r.variantId)?.variant;
                setCurrentVariant(reqVariant || initialMarble.variants[0]);
            }
        }
    }
    loadOrder();

    setQuotationNumber(searchParams.get('orderId') || `Q-${String(Date.now()).slice(-6)}`);
    setCurrentDate(new Date().toLocaleDateString('en-GB'));
  }, [marbleIdFromUrl, searchParams, numberedMarbles]); // eslint-disable-line react-hooks/exhaustive-deps
  
   useEffect(() => {
    if (selectedMarble && selectedMarble.variants.length > 0) {
      const isVariantStillValid = selectedMarble.variants.some(v => v.id === currentVariant?.id);
      if (!isVariantStillValid) {
        setCurrentVariant(selectedMarble.variants[0]);
      }
    } else {
      setCurrentVariant(null);
    }
  }, [selectedMarble, currentVariant]);

  useEffect(() => {
    const calcType = searchParams.get('calc');
    if (calcType && selectedMarble && selectedMarble.id !== 'general-supplies-order' && currentVariant) {
      const autoKey = `${selectedMarble.id}:${calcType}`;
      if (autoOpenedCalcKeyRef.current === autoKey) return;
      const validTypes: RequirementType[] = ['simple', 'floor', 'stairs', 'window-sill', 'kitchen', 'vanity', 'cutting-optimizer'];
      if (validTypes.includes(calcType as RequirementType)) {
        autoOpenedCalcKeyRef.current = autoKey;
        const timer = setTimeout(() => {
          handleAddNewRequirement(calcType as RequirementType);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, selectedMarble, currentVariant]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation Not Supported", description: "Your browser does not support location services." });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCustomerForm(prev => ({...prev, latitude, longitude}));
        setIsGettingLocation(false);
         toast({ title: "Location Captured" });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({ variant: "destructive", title: "Location Error", description: error.message });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };


  const handleSaveCustomer = () => {
    setCustomerInfo(customerForm);
    setIsCustomerDialogOpen(false);
  };
  
  const handleSaveRequirement = useCallback((id: number, data: { total: number; details: any; variant?: MarbleVariant; }) => {
    const propsToUpdate: Partial<Requirement> = { total: data.total, details: data.details };
    if (data.variant) {
        propsToUpdate.variant = data.variant;
        propsToUpdate.variantId = data.variant.id;
    }
    updateRequirement(id, propsToUpdate);
    setEditingRequirementId(null);
  }, [updateRequirement]);

  const handleAddNewRequirement = (type: RequirementType) => {
    if (!selectedMarble) {
        toast({ variant: 'destructive', title: 'Select a Material' });
        return;
    };
    if (!currentVariant) {
        toast({ variant: 'destructive', title: 'Select a Format' });
        return;
    }
    const newReqId = addRequirement(type, selectedMarble, currentVariant);
    if (newReqId !== -1) {
      setEditingRequirementId(newReqId);
    }
  };

  const handleAddOrUpdatePerPieceItem = () => {
    if (!selectedMarble || perPieceQuantity <= 0) return;
    
    const existingReq = requirements.find(r => r.marbleId === selectedMarble.id && r.details?.isPerPiece);
    if (existingReq) {
        updateRequirement(existingReq.id, { quantity: perPieceQuantity });
        toast({ title: 'Quantity Updated' });
    } else {
        addPerPieceRequirement(selectedMarble, perPieceQuantity);
        toast({ title: 'Item Added' });
    }
  };

  const handlePlaceOrder = async () => {
    if (requirements.length === 0 || !customerInfo.name || (!selectedMarble && !isGeneralSuppliesOrder)) {
      toast({ variant: 'destructive', title: 'Cannot Place Order', description: 'Please add customer details and items.' });
      return;
    }

    setIsPlacingOrder(true);
    const existingOrderId = searchParams.get('orderId');
    const itemsTotal = requirements.reduce((acc, req) => acc + (req.total || 0), 0);
    const finalTotal = itemsTotal + deliveryCost;

    const orderData: Omit<Order, 'id' | 'date'> & { id?: string, userId?: string } = {
      id: existingOrderId || undefined,
      userId: user?.uid || undefined,
      customerName: customerInfo.name || 'N/A',
      marbleName: selectedMarble?.name || 'General Supplies',
      quantity: itemsTotal,
      totalPrice: finalTotal,
      status: 'Pending',
      calculationDetails: {
        marble: selectedMarble!,
        variant: currentVariant!,
        customerInfo: customerInfo,
        requirements: requirements,
      },
      applicationType: requirements.map(r => r.type).join(', '),
    };

    const result = await saveOrder(orderData);
    if (result.success && result.order) {
      setLastPlacedOrder(result.order as Order);
      setIsSuccessDialogOpen(true);
      
      const businessPhone = config.businessWhatsAppNumber;
      if (businessPhone) {
        const itemsSummary = requirements.map(r => `* ${r.name}: PKR ${r.total.toLocaleString()}`).join('\n');
        const orderMessage = `*السلام علیکم!*\n\n*سٹون ایکسپرٹ ویب سائٹ پر ایک نیا آرڈر بُک کیا گیا ہے!*\n\n*آرڈر آئی ڈی:* ${result.order.id}\n*کسٹمر کا نام:* ${customerInfo.name}\n*فون نمبر:* ${customerInfo.phone || 'N/A'}\n*ٹوٹل رقم:* PKR ${finalTotal.toLocaleString()}\n\n*تفصیلات:*\n${itemsSummary}\n\nبراہ کرم اس آرڈر کی تصدیق فرمائیں۔ شکریہ!\n*سٹون ایکسپرٹ، جی ٹی روڈ راولپنڈی*`;
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(orderMessage)}`;
        
        if (typeof window !== 'undefined') {
          window.open(whatsappUrl, '_blank');
        }
      }
      
      if (typeof window !== 'undefined') {
        const localOrderIds = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
        if (!localOrderIds.includes(result.order.id)) {
            localOrderIds.push(result.order.id);
            localStorage.setItem('myOrderIds', JSON.stringify(localOrderIds));
        }
      }
      
      if (!existingOrderId) {
        clearRequirements();
      }
    } else {
      toast({ variant: 'destructive', title: `Failed to save order`, description: result.error });
    }
    setIsPlacingOrder(false);
  };

  const handleShareToWhatsApp = () => {
    if (!lastPlacedOrder) return;
    const data = lastPlacedOrder;
    const businessPhone = config.businessWhatsAppNumber;
    
    const itemsSummary = data.calculationDetails?.requirements.map(r => `* ${r.name}: PKR ${r.total.toLocaleString()}`).join('\n');
    const message = `*السلام علیکم!*\n\n*کوٹیشن برائے ${data.customerName}*\n\n*آرڈر آئی ڈی:* ${data.id}\n\n*آئٹمز:*\n${itemsSummary}\n\n*ٹوٹل رقم:* PKR ${data.totalPrice.toLocaleString()}\n\nسٹون ایکسپرٹ کے ساتھ تعاون کرنے کا شکریہ!\n*سٹون ایکسپرٹ*`;
    
    // Check if we should send to business or just let admin forward it
    let targetPhone = businessPhone;
    if (customerInfo.phone) {
      let cleaned = customerInfo.phone.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '92' + cleaned.slice(1);
      } else if (cleaned.length === 10 && cleaned.startsWith('3')) {
        cleaned = '92' + cleaned;
      }
      targetPhone = cleaned || businessPhone;
    }
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const filteredRequirementOptions = useMemo(() => {
    if (selectedMarble?.materialType === '12x24 Tiles') {
      return requirementOptions.filter(opt => ['simple', 'floor'].includes(opt.value));
    }
    if (selectedMarble?.materialType === 'Corian') {
      return requirementOptions.filter(opt => !['simple', 'floor'].includes(opt.value));
    }
    return requirementOptions;
  }, [selectedMarble]);


  const handleMaterialSelectionForRequirement = (newMarble: Marble) => {
    if (changingMaterialId === null) return;
    
    const req = requirements.find(r => r.id === changingMaterialId);
    if (!req) return;

    const newVariant = newMarble.variants[0];
    if (!newVariant) return;

    const details = { ...req.details };
    const newRate = newVariant.price || 0;
    let newTotal = 0;

    if (details.isPerPiece) {
        newTotal = newRate * (req.quantity || 1);
        details.pricePerPiece = newRate;
    } else {
        switch (req.type) {
            case 'simple': {
                const finalSqFt = details.finalSqFt || 0;
                const materialCost = finalSqFt * newRate;
                const skirtingPolishCost = details.skirtingPolishCost || 0;
                newTotal = materialCost + skirtingPolishCost;
                
                details.materialCost = materialCost;
                details.grandTotal = newTotal;
                details.rate = newRate;
                break;
            }
            case 'floor': {
                const finalFloorSqFt = details.finalFloorSqFt || 0;
                const floorMaterialCost = finalFloorSqFt * newRate;
                
                let skirtingMaterialCost = 0;
                if (details.includeSkirting && (details.skirtingHeight || 0) > 0) {
                    const finalSkirtingSqFt = details.finalSkirtingSqFt || 0;
                    skirtingMaterialCost = finalSkirtingSqFt * newRate;
                }
                
                const skirtingPolishCost = details.skirtingPolishCost || 0;
                newTotal = floorMaterialCost + skirtingMaterialCost + skirtingPolishCost;
                
                details.floorMaterialCost = floorMaterialCost;
                details.skirtingMaterialCost = skirtingMaterialCost;
                details.grandTotal = newTotal;
                details.rate = newRate;
                break;
            }
            case 'kitchen': {
                const finalSqFt = details.finalSqFt || 0;
                const materialCost = finalSqFt * newRate;
                const sinkCost = details.sinkCost || 0;
                const stoveCost = details.stoveCost || 0;
                const edgeProfileCost = details.edgeProfileCost || 0;
                
                newTotal = materialCost + sinkCost + stoveCost + edgeProfileCost;
                
                details.materialCost = materialCost;
                details.total = newTotal;
                details.rate = newRate;
                break;
            }
            case 'vanity': {
                let grandTotal = 0;
                const updatedVanities = (details.vanities || []).map((vanity: any) => {
                    const finalSqFt = vanity.finalSqFt || 0;
                    const materialCost = finalSqFt * newRate;
                    const edgeCost = vanity.edgeCost || 0;
                    const sinkCost = vanity.sinkCost || 0;
                    const lutakCost = vanity.lutakCost || 0;
                    const cuttingCost = vanity.cuttingCost || 0;
                    const totalCost = materialCost + edgeCost + sinkCost + lutakCost + cuttingCost;
                    
                    grandTotal += totalCost;
                    return {
                        ...vanity,
                        materialCost,
                        totalCost
                    };
                });
                
                newTotal = grandTotal;
                details.vanities = updatedVanities;
                details.grandTotal = grandTotal;
                details.rate = newRate;
                break;
            }
            case 'stairs':
            case 'window-sill': {
                const finalSqFt = details.finalSqFt || 0;
                const marbleTotal = finalSqFt * newRate;
                const innerCutCost = details.innerCutCost || 0;
                
                let edgeProfileCost = 0;
                if (details.edgeProfilingCosts) {
                    edgeProfileCost = Object.values(details.edgeProfilingCosts).reduce(
                        (sum: number, p: any) => sum + (p?.cost || 0), 
                        0
                    );
                }
                
                newTotal = marbleTotal + innerCutCost + edgeProfileCost;
                
                details.marbleTotal = marbleTotal;
                details.rate = newRate;
                break;
            }
            default: {
                if (details.finalSqFt) {
                    details.materialCost = details.finalSqFt * newRate;
                    details.rate = newRate;
                    const otherCosts = (details.edgeProfileCost || 0) + (details.sinkCost || 0) + (details.stoveCost || 0) + (details.innerCutCost || 0) + (details.skirtingPolishCost || 0) + (details.lutakCost || 0) + (details.cuttingCost || 0);
                    newTotal = details.materialCost + otherCosts;
                } else {
                    newTotal = req.total;
                }
            }
        }
    }

    updateRequirement(changingMaterialId, { marble: newMarble, marbleId: newMarble.id, variant: newVariant, variantId: newVariant.id, total: newTotal, details });
    setChangingMaterialId(null);
  };


  const calculatorsList = [
    { id: 'simple', labelEn: 'Simple Floor', labelUr: 'سادہ فرش', descriptionEn: 'Quick square feet estimation for plain surfaces', descriptionUr: 'سادہ سطحوں کے لیے فوری اسکوائر فٹ کا تخمینہ' },
    { id: 'floor', labelEn: 'Flooring', labelUr: 'فلورنگ', descriptionEn: 'Detailed rooms flooring with skirting & borders', descriptionUr: 'کمروں کے فرش، اسکرٹنگ اور بارڈر کی تفصیلی منصوبہ بندی' },
    { id: 'kitchen', labelEn: 'Kitchens', labelUr: 'کچن کاؤنٹر ٹاپ', descriptionEn: 'L-shape, U-shape or straight kitchen slab costs', descriptionUr: 'ایل شیپ، یو شیپ یا سلیب کے اخراججات' },
    { id: 'vanity', labelEn: 'Vanity', labelUr: 'وینٹی', descriptionEn: 'Custom bathroom vanity tops and splashbacks', descriptionUr: 'غسل خانے کی وینٹی اور سپلیش بیکس کی قیمت' },
    { id: 'window-sill', labelEn: 'Window Sills', labelUr: 'کھڑکی کی چوکھٹ / سل', descriptionEn: 'Window frame sills and border length calculations', descriptionUr: 'کھڑکی کے فریم اور سل کی لمبائی کا حساب' },
    { id: 'stairs', labelEn: 'Stairs', labelUr: 'سیڑھیاں', descriptionEn: 'Tread, riser and molding details for staircases', descriptionUr: 'سیڑھیوں کے ٹریڈ، رائزر اور مولڈنگ کی تفصیلات' },
    { id: 'cutting-optimizer', labelEn: 'Cutting Optimizer', labelUr: 'کٹنگ آپٹیمائزر (سلیب کٹنگ)', descriptionEn: '2D slab cutting, bookmatch & floor fixing diagram', descriptionUr: 'سلیب کٹنگ، بک میچ اور فرش کی فٹنگ کا مکمل 2D نقشہ' },
    { id: 'facade', labelEn: 'Facade Stone', labelUr: 'فیساڈ و وال اسٹون', descriptionEn: 'Exterior wall cladding and elevation stone estimation', descriptionUr: 'بیرونی دیواروں اور فرنٹ ایلیویشن فیساڈ کا تخمینہ' }
  ];

  const DEFAULT_CALCULATOR_CATEGORIES: Record<string, string[]> = {
    simple: ["Local Marble", "Imported Marble", "MDM Material", "Limestone"],
    floor: ["Local Marble", "Imported Marble", "MDM Material", "Marble Tiles", "Limestone"],
    kitchen: ["Local Granite", "Imported Granite", "Artificial Stone", "Corian"],
    vanity: ["Vanity", "Imported Granite", "Local Granite", "Artificial Stone", "Corian"],
    "window-sill": ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material", "Limestone"],
    stairs: ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material"],
    "cutting-optimizer": ["Local Marble", "Imported Marble", "Local Granite", "Imported Granite", "MDM Material", "Limestone"],
    facade: ["Facade Stone"]
  };

  const calcType = searchParams.get('calc');
  const showMaterialSelector = isGeneralSuppliesOrder && calcType;

  if (showMaterialSelector) {
    const activeCalc = calculatorsList.find(c => c.id === calcType);
    const calcLabel = language === 'ur' ? activeCalc?.labelUr : activeCalc?.labelEn;
    const calcDesc = language === 'ur' ? activeCalc?.descriptionUr : activeCalc?.descriptionEn;

    const allowedCats = calcCategories?.[calcType] || DEFAULT_CALCULATOR_CATEGORIES[calcType] || [];

    let selectorFilteredMarbles = numberedMarbles.filter(m => !m.isHidden && m.id !== 'general-supplies-order');

    if (selectorCategory === 'Recommended') {
      selectorFilteredMarbles = selectorFilteredMarbles.filter(m => {
        let catKey: string;
        if (m.category) {
          catKey = m.category;
        } else if (m.materialType === '12x24 Tiles') {
          catKey = 'Marble Tiles';
        } else if (m.materialType === 'Marble' || m.materialType === 'Granite') {
          catKey = `${m.origin} ${m.materialType}`;
        } else {
          catKey = m.materialType;
        }
        return allowedCats.includes(catKey);
      });
    } else if (selectorCategory !== 'All') {
      selectorFilteredMarbles = selectorFilteredMarbles.filter(m => {
        let catKey: string;
        if (m.category) {
          catKey = m.category;
        } else if (m.materialType === '12x24 Tiles') {
          catKey = 'Marble Tiles';
        } else if (m.materialType === 'Marble' || m.materialType === 'Granite') {
          catKey = `${m.origin} ${m.materialType}`;
        } else {
          catKey = m.materialType;
        }
        return catKey === selectorCategory;
      });
    }

    if (selectorSearch) {
      selectorFilteredMarbles = selectorFilteredMarbles.filter(m => 
        m.name.toLowerCase().includes(selectorSearch.toLowerCase())
      );
    }

    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1 bg-muted/30 py-8 md:py-12">
          <div className="container px-4 mx-auto max-w-6xl">
            {/* Header section */}
            <div className="text-center space-y-4 mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                <Calculator className="h-3.5 w-3.5" />
                {language === 'ur' ? 'مٹیریل کا انتخاب کریں' : 'Step 1: Choose Material'}
              </span>
              <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                {language === 'ur' ? `${calcLabel} کے لیے مٹیریل منتخب کریں` : `Select Material for ${calcLabel}`}
              </h1>
              <p className="max-w-[600px] mx-auto text-sm md:text-base text-muted-foreground">
                {calcDesc}
              </p>
              {calcType === 'cutting-optimizer' && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => {
                      setIsDirectSlabPopupOpen(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {language === 'ur'
                      ? 'اپنی سلیب فوٹو اپ لوڈ کریں یا ڈائریکٹ کیمرہ کھول کر کٹنگ آپٹیمائزر چلائیں'
                      : 'Upload Your Own Slab Photo / Open Camera & Launch Optimizer'}
                  </Button>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-background border rounded-xl p-4 md:p-6 shadow-sm mb-8 space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Category capsules */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setSelectorCategory('Recommended')}
                    className={`text-xs px-3.5 py-2 rounded-full font-bold transition-all border ${
                      selectorCategory === 'Recommended'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-input hover:bg-accent'
                    }`}
                  >
                    ✨ {language === 'ur' ? 'تجویز کردہ' : 'Recommended'}
                  </button>
                  <button
                    onClick={() => setSelectorCategory('All')}
                    className={`text-xs px-3.5 py-2 rounded-full font-bold transition-all border ${
                      selectorCategory === 'All'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-input hover:bg-accent'
                    }`}
                  >
                    {language === 'ur' ? 'تمام مٹیریل' : 'All Materials'}
                  </button>
                  {categories.map((cat) => {
                    const hasMaterials = numberedMarbles.some(m => {
                      let catKey: string;
                      if (m.category) {
                        catKey = m.category;
                      } else if (m.materialType === '12x24 Tiles') {
                        catKey = 'Marble Tiles';
                      } else if (m.materialType === 'Marble' || m.materialType === 'Granite') {
                        catKey = `${m.origin} ${m.materialType}`;
                      } else {
                        catKey = m.materialType;
                      }
                      return catKey === cat;
                    });

                    if (!hasMaterials) return null;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectorCategory(cat)}
                        className={`text-xs px-3.5 py-2 rounded-full font-bold transition-all border ${
                          selectorCategory === cat
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-muted-foreground border-input hover:bg-accent'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ur' ? 'مٹیریل تلاش کریں...' : 'Search materials...'}
                    value={selectorSearch}
                    onChange={(e) => setSelectorSearch(e.target.value)}
                    className="pl-9 h-10 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectorFilteredMarbles.map((marble) => {
                const recommended = allowedCats.includes(
                  marble.category
                    ? marble.category
                    : marble.materialType === '12x24 Tiles'
                    ? 'Marble Tiles'
                    : marble.materialType === 'Marble' || marble.materialType === 'Granite'
                    ? `${marble.origin} ${marble.materialType}`
                    : marble.materialType
                );

                return (
                  <Card key={marble.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow border bg-background">
                    <div 
                      className="relative aspect-video w-full bg-muted overflow-hidden cursor-pointer group"
                      onClick={() => openImage(marble.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(marble.name)}`, marble.name)}
                      title="Click to view full screen"
                    >
                      <Image
                        src={marble.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(marble.name)}`}
                        alt={marble.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {recommended && (
                        <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                          {language === 'ur' ? 'تجویز کردہ' : 'Recommended'}
                        </span>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-[9px] text-white px-2 py-0.5 rounded tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                        View Full Screen
                      </div>
                    </div>
                    <CardHeader className="p-4 flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {marble.materialType}
                        </span>
                        <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          {marble.origin === 'Local' ? (language === 'ur' ? 'لوکل' : 'Local') : (language === 'ur' ? 'امپورٹڈ' : 'Imported')}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold line-clamp-1">{marble.nameWithNum || marble.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2 mt-1 leading-relaxed">
                        {marble.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      {/* Material Rates Section */}
                      <div className="space-y-1.5 border-t pt-3 mt-1 mb-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {language === 'ur' ? 'دستیاب سائز اور قیمتیں:' : 'Available Formats & Rates:'}
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {marble.variants && marble.variants.length > 0 ? (
                            marble.variants.map((variant, idx) => {
                              const isPerPiece = ['Vanity', 'Inlay', 'Antique'].includes(marble.materialType);
                              return (
                                <div 
                                  key={variant.id || idx} 
                                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-muted/30 border border-border/10 hover:bg-muted/50 transition-colors"
                                >
                                  <span className="font-medium text-muted-foreground">
                                    {(variant.size || '').split('(')[0].trim()} <span className="text-[10px] opacity-75">({variant.thickness})</span>
                                  </span>
                                  <span className="font-bold text-primary font-mono whitespace-nowrap">
                                    {variant.price ? `PKR ${variant.price.toLocaleString()}` : <span className="text-destructive">N/A</span>}
                                    {variant.price && (isPerPiece ? '/pc' : '/sq.ft')}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              {language === 'ur' ? 'قیمت کے لیے رابطہ کریں' : 'Contact for pricing'}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          const defVariant = marble.variants?.[0] || {
                            id: `${marble.id}-default`,
                            size: 'Slab (110x60)',
                            thickness: '20mm',
                            price: 450,
                          };
                          setSelectedSelectorMarbleId(marble.id);
                          setSelectedMarble(marble);
                          setCurrentVariant(defVariant);
                          const validTypes: RequirementType[] = [
                            'simple',
                            'floor',
                            'stairs',
                            'window-sill',
                            'kitchen',
                            'vanity',
                            'cutting-optimizer',
                          ];
                          if (
                            calcType &&
                            validTypes.includes(calcType as RequirementType)
                          ) {
                            autoOpenedCalcKeyRef.current = `${marble.id}:${calcType}`;
                            const newReqId = addRequirement(
                              calcType as RequirementType,
                              marble,
                              defVariant
                            );
                            if (newReqId !== -1) {
                              setEditingRequirementId(newReqId);
                            }
                          }
                        }}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm h-10 mt-2"
                      >
                        {language === 'ur' ? 'منتخب کریں اور کیلکولیٹر شروع کریں' : 'Select & Open Calculator'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectorFilteredMarbles.length === 0 && (
              <div className="text-center py-20 bg-background border rounded-xl shadow-sm">
                <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                <h3 className="text-lg font-bold text-foreground">
                  {language === 'ur' ? 'کوئی مٹیریل نہیں ملا' : 'No materials found'}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  {language === 'ur'
                    ? 'براہ کرم تلاش کا لفظ تبدیل کریں یا مٹیریل کیٹیگریز دیکھیں۔'
                    : 'Try checking another category or refining your search keywords.'}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => { setSelectorCategory('All'); setSelectorSearch(''); }}>
                  {language === 'ur' ? 'تمام مٹیریلز دکھائیں' : 'Show All Materials'}
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Hidden File & Mobile Camera Inputs for Direct Slab Popup */}
        <input
          ref={directFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleDirectSlabFileChange}
          className="hidden"
        />
        <input
          ref={directMobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleDirectSlabFileChange}
          className="hidden"
        />

        {/* POPUP 1: Direct Slab Photo Upload, Live Camera & Frame Setup Modal */}
        <Dialog
          open={isDirectSlabPopupOpen}
          onOpenChange={(open) => {
            if (!open) {
              stopDirectCamera();
            }
            setIsDirectSlabPopupOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 text-white border border-slate-800 p-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-sky-400" />
                <span>
                  اپنی ماربل سلیب کی تصویر اپ لوڈ کریں یا ڈائریکٹ کیمرہ کھولیں (Upload Slab Photo or Open Camera)
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                اپنے پی سی یا موبائل سے سلیب کی تصویر لگائیں یا لائیو کیمرے سے تصویر کھینچیں، سائز اور فریم سیٹ کریں اور براہِ راست کٹنگ آپٹیمائزر چلائیں۔
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Step 1: Upload or Camera Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => directFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-sky-500/50 bg-sky-950/50 hover:bg-sky-900/60 text-white transition-colors"
                >
                  <Upload className="h-6 w-6 text-sky-400" />
                  <span className="text-xs font-bold">
                    1. گیلری / پی سی سے تصویر اپ لوڈ کریں
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Upload Slab Photo (PC / Mobile)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isDirectCameraActive) {
                      stopDirectCamera();
                    } else {
                      startDirectCamera();
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/60 text-white transition-colors"
                >
                  <Camera className="h-6 w-6 text-emerald-400" />
                  <span className="text-xs font-bold">
                    2. ڈائریکٹ لائیو کیمرہ کھولیں
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {isDirectCameraActive ? 'کیمرہ بند کریں (Stop Camera)' : 'Open Live Camera Stream'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => directMobileCameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-lg border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/50 text-white transition-colors"
                >
                  <Camera className="h-6 w-6 text-amber-400" />
                  <span className="text-xs font-bold">
                    3. موبائل بیک کیمرہ کھولیں
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Direct Mobile Camera Snap
                  </span>
                </button>
              </div>

              {/* Live WebRTC Camera Stream Box */}
              {isDirectCameraActive && (
                <div className="rounded-lg border border-emerald-500/50 bg-slate-900 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">
                      لائیو کیمرہ آن ہے — سلیب کو فریم میں رکھ کر تصویر کھینچیں:
                    </span>
                    <button
                      type="button"
                      onClick={stopDirectCamera}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      بند کریں (Close)
                    </button>
                  </div>
                  {directCameraError ? (
                    <div className="p-3 rounded bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      {directCameraError}
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                      <video
                        ref={directVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-4 border-2 border-dashed border-sky-400/70 rounded pointer-events-none flex items-end justify-center pb-2">
                        <span className="px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-sky-300 font-mono">
                          Align Marble Slab Inside Frame
                        </span>
                      </div>
                    </div>
                  )}
                  {!directCameraError && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        onClick={captureDirectCameraPhoto}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>سلیب کی تصویر کھینچیں (Capture Slab Photo)</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Slab Photo Preview & Calibration Controls */}
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-sky-300">
                    مرحلہ 2: سلیب کا سائز اور تصویر کا فریم سیٹ کریں (Set Slab Size &amp; Frame):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDirectSlabRotation((r) => (r + 90) % 360)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white flex items-center gap-1 border border-slate-700"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-sky-400" />
                      <span>Rotate 90° ({directSlabRotation}°)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDirectSlabScale(100);
                        setDirectSlabOffsetX(0);
                        setDirectSlabOffsetY(0);
                        setDirectSlabRotation(0);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700"
                    >
                      Reset Frame
                    </button>
                  </div>
                </div>

                {/* Live Slab Frame Preview Box */}
                <div className="relative w-full h-56 sm:h-64 rounded-lg bg-slate-950 border-2 border-sky-500/60 overflow-hidden flex items-center justify-center">
                  {directSlabPhotoUrl ? (
                    <img
                      src={directSlabPhotoUrl}
                      alt="Uploaded Slab Preview"
                      className="w-full h-full object-fill transition-transform duration-150"
                      style={{
                        transform: `translate(${directSlabOffsetX}%, ${directSlabOffsetY}%) rotate(${directSlabRotation}deg) scale(${directSlabScale / 100})`,
                      }}
                    />
                  ) : (
                    <div className="text-center space-y-2 p-4">
                      <Upload className="h-10 w-10 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-300 font-semibold">
                        ابھی کوئی تصویر اپ لوڈ نہیں ہوئی — اوپر دیے گئے بٹن سے اپنی سلیب کی تصویر اپ لوڈ کریں یا کیمرہ کھولیں
                      </p>
                      <p className="text-[11px] text-slate-500">
                        (یا بغیر تصویر کے بھی نیچے بٹن دبا کر ڈیفالٹ ایچ ڈی ماربل سلیب کے ساتھ آپٹیمائزر چلا سکتے ہیں)
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-mono text-sky-300">
                    Slab Frame: {directSlabLength}&quot; × {directSlabWidth}&quot; | Zoom: {directSlabScale}%
                  </div>
                </div>

                {/* Slab Name, Dimensions & Zoom Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="col-span-2">
                    <Label className="text-[11px] text-slate-300">سلیب / پتھر کا نام (Slab Name)</Label>
                    <Input
                      type="text"
                      value={directSlabLabel}
                      onChange={(e) => setDirectSlabLabel(e.target.value)}
                      className="h-8 bg-slate-950 border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">لمبائی Length (in)</Label>
                    <Input
                      type="number"
                      value={directSlabLength}
                      onChange={(e) => setDirectSlabLength(Math.max(12, Number(e.target.value) || 110))}
                      className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">چوڑائی Width (in)</Label>
                    <Input
                      type="number"
                      value={directSlabWidth}
                      onChange={(e) => setDirectSlabWidth(Math.max(12, Number(e.target.value) || 60))}
                      className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {directSlabPhotoUrl && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-[10px] text-slate-400">
                        تصویر زوم (Zoom: {directSlabScale}%)
                      </Label>
                      <input
                        type="range"
                        min="60"
                        max="180"
                        value={directSlabScale}
                        onChange={(e) => setDirectSlabScale(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">
                        دائیں بائیں (Move X: {directSlabOffsetX}%)
                      </Label>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={directSlabOffsetX}
                        onChange={(e) => setDirectSlabOffsetX(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">
                        اوپر نیچے (Move Y: {directSlabOffsetY}%)
                      </Label>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={directSlabOffsetY}
                        onChange={(e) => setDirectSlabOffsetY(Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stopDirectCamera();
                  setIsDirectSlabPopupOpen(false);
                }}
                className="w-full sm:w-auto border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                منسوخ کریں (Cancel)
              </Button>
              <Button
                type="button"
                onClick={() => {
                  stopDirectCamera();
                  setIsDirectSlabPopupOpen(false);
                  setIsStandaloneOptimizerOpen(true);
                }}
                className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold gap-2"
              >
                <Scissors className="h-4 w-4" />
                <span>تصویر سیٹ کریں اور کٹنگ آپٹیمائزر چلائیں (Launch Cutting Optimizer)</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* POPUP 2: Full-Screen Cutting Optimizer Launched Directly from Custom Slab Popup */}
        <Dialog
          open={isStandaloneOptimizerOpen}
          onOpenChange={(open) => {
            if (!open) setIsStandaloneOptimizerOpen(false);
          }}
        >
          <DialogContent
            className="fixed z-50 left-0 top-0 translate-x-0 translate-y-0 rounded-none border-none m-0 p-0 bg-slate-950 flex flex-col"
            style={{
              left: 0,
              top: 0,
              transform: 'none',
              width: '100vw',
              height: '100vh',
              maxWidth: 'none',
              maxHeight: 'none',
              borderRadius: 0,
            }}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Cutting Optimizer Workstation</DialogTitle>
              <DialogDescription>AutoCAD 2D HD Slab Cutting Optimizer</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow p-0 bg-slate-950">
              {isStandaloneOptimizerOpen && (
                <CuttingOptimizerPro
                  marbles={marblesList}
                  initialMarble={selectorFilteredMarbles[0] || numberedMarbles[0]}
                  initialVariant={(selectorFilteredMarbles[0] || numberedMarbles[0])?.variants?.[0]}
                  isCustomerMode={true}
                  initialCustomSlabImageUrl={directSlabPhotoUrl || undefined}
                  initialCustomSlabLabel={directSlabLabel || undefined}
                  initialCustomSlabLength={directSlabLength}
                  initialCustomSlabWidth={directSlabWidth}
                  initialCustomFrameScale={directSlabScale}
                  initialCustomFrameOffsetX={directSlabOffsetX}
                  initialCustomFrameOffsetY={directSlabOffsetY}
                  initialCustomFrameRotation={directSlabRotation}
                  onSaveToCustomerQuote={(data) => {
                    const baseMarble = selectorFilteredMarbles[0] || numberedMarbles[0];
                    const baseVariant = baseMarble?.variants?.[0] || {
                      id: 'custom-slab-var',
                      size: `${directSlabLength}x${directSlabWidth}`,
                      thickness: '20mm',
                      price: data.details.slabConfig.ratePerSqFt || 450,
                    };
                    setIsStandaloneOptimizerOpen(false);
                    if (baseMarble) {
                      setSelectedSelectorMarbleId(baseMarble.id);
                      setSelectedMarble(baseMarble);
                      setCurrentVariant(baseVariant);
                      const newReqId = addRequirement('cutting-optimizer', baseMarble, baseVariant);
                      if (newReqId !== -1) {
                        handleSaveRequirement(newReqId, data);
                      }
                    }
                  }}
                  onCancel={() => {
                    setIsStandaloneOptimizerOpen(false);
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!selectedMarble && !isGeneralSuppliesOrder) {
    return (
      <div className="flex min-h-screen w-full flex-col"><Header /><main className="flex-1 bg-background py-12 md:py-24"><div className="container px-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-[80vh] mt-8" /></div></main></div>
    );
  }
  
  const editingRequirement = requirements.find(req => req.id === editingRequirementId);
  const OriginIcon = marbleForPopup?.origin === 'Local' ? Truck : Globe;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      
      {/* Full-Screen Tools & Chemicals Selection with Product Cards */}
      <AnimatePresence>
        {isFixingMaterialDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col"
          >
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-8 py-3 flex items-center justify-between shadow-xs">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFixingMaterialDialogOpen(false)}
                className="font-bold flex items-center gap-2 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{language === 'ur' ? 'واپس کوٹیشن پر جائیں' : 'Back to Quotation'}</span>
              </Button>

              <div className="text-center hidden sm:block">
                <h2 className="font-headline font-black text-base md:text-lg text-foreground flex items-center justify-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <span>{language === 'ur' ? 'ٹولز اور کیمیکلز سلیکشن' : 'Tools & Chemicals Selection'}</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {language === 'ur' ? 'ہر کارڈ سے مطلوبہ مقدار (تعداد) منتخب کر کے کوٹیشن میں شامل کریں' : 'Choose quantities directly from product cards'}
                </p>
              </div>

              <Button 
                size="sm" 
                onClick={() => setIsFixingMaterialDialogOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 flex items-center gap-1.5 shadow-sm"
              >
                <Check className="h-4 w-4" />
                <span>{language === 'ur' ? 'مکمل / کوٹیشن دیکھیں' : 'Done / View Quotation'}</span>
              </Button>
            </div>

            {/* Main Full-Screen Body with Cards Grid */}
            <div className="flex-1 py-6 px-4 md:px-8 bg-muted/20">
              <div className="max-w-7xl mx-auto">
                <FixingMaterialsCatalog
                  requirements={requirements}
                  addFixingMaterialRequirement={addFixingMaterialRequirement}
                  updateRequirement={updateRequirement}
                  removeRequirement={removeRequirement}
                  onBack={() => setIsFixingMaterialDialogOpen(false)}
                  language={language}
                  toast={toast}
                  initialFixingMaterials={fixingMaterialsList}
                  fixingMaterialCategories={fixingMaterialCategories}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 bg-muted/30 py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
              <div className="flex items-center gap-4 mb-6 print-hidden">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="font-headline text-2xl font-bold">Quotation Builder {isAdmin && <Badge className="ml-2">Admin Mode</Badge>}</h1>
              </div>
               <div 
                  className="theme-light bg-background text-foreground shadow-lg rounded-sm w-full min-h-[297mm] flex flex-col"
                  style={letterheadUrl ? {
                      backgroundImage: `url(${letterheadUrl})`,
                      backgroundSize: '100% auto',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'top center',
                  } : {}}
              >
                  {!letterheadUrl ? (
                      /* Beautiful Stone Expert Header for live view / print when plain */
                      <div className="w-full px-8 pt-8 pb-6 border-b-2 flex items-center justify-between bg-white shrink-0" style={{ borderColor: '#dfb96c' }}>
                        <div className="flex items-center gap-4">
                          <Icons.logo src={logoUrl} alt="Logo" className="h-16 w-16 shrink-0 object-contain shadow-md rounded-full bg-[#0f172a] p-1" />
                          <div>
                            <h1 className="text-3xl font-black tracking-wider leading-none font-sans" style={{ color: '#dfb96c' }}>STONE EXPERT</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Imported & Local Marble & Granite</p>
                            <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Professional Team & Premium Polishing Services</p>
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-700 leading-normal font-medium">
                          <p className="font-bold text-slate-900">Contact / رابطہ:</p>
                          <p>Phone: {config.businessPhoneNumber || "+92 339 9991052"}</p>
                          <p>WhatsApp: +{config.businessWhatsAppNumber || "923399991052"}</p>
                          <p>Email: info@stoneexpert.com</p>
                        </div>
                      </div>
                  ) : null}
                  <div className={`${letterheadUrl ? "pt-[14rem]" : "pt-6"} px-8 pb-8 space-y-6 flex-1 flex flex-col`}>
                       <div className="text-center">
                          <h2 className="text-2xl font-bold tracking-wider border-b-2 border-current inline-block px-8 pb-2">QUOTATION</h2>
                      </div>
                         <div className="grid grid-cols-2 gap-8 pb-4 border-b">
                            <div>
                               <h3 className="font-bold text-muted-foreground uppercase text-sm mb-2">Prepared For:</h3>
                               {customerInfo.name ? (
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-lg">{customerInfo.name}</p>
                                            <p className="text-sm text-muted-foreground">{customerInfo.phone}</p>
                                            <p className="text-sm text-muted-foreground">{customerInfo.address}</p>
                                            {(customerInfo.loadLocation || customerInfo.loadSize) && (
                                                <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
                                                    {customerInfo.loadLocation && <p><span className="font-semibold text-foreground/80">{language === 'ur' ? 'لوڈ لوکیشن:' : 'Load Location:'}</span> {customerInfo.loadLocation}</p>}
                                                    {customerInfo.loadSize && <p><span className="font-semibold text-foreground/80">{language === 'ur' ? 'لوڈ سائز:' : 'Load Size:'}</span> {customerInfo.loadSize}</p>}
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground print-hidden" onClick={() => { setCustomerForm(customerInfo); setIsCustomerDialogOpen(true); }}><Pencil className="h-4 w-4"/></Button>
                                    </div>
                                ) : (
                                    <Button className="w-full print-hidden" onClick={() => setIsCustomerDialogOpen(true)}>Step 1: Add Customer Detail</Button>
                                )}
                            </div>
                             <div className="text-right">
                               <h3 className="font-bold text-muted-foreground uppercase text-sm mb-2">Quotation Details:</h3>
                               <p><span className="font-semibold">Quotation #:</span> {quotationNumber}</p>
                               <p><span className="font-semibold">Date:</span> {currentDate}</p>
                            </div>
                        </div>

                        {requirements.length > 0 && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 print-hidden">
                            <div className="flex items-start gap-2.5">
                              <Scale className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <h3 className="text-sm font-bold text-foreground">
                                  {language === 'ur' ? 'تمام مواد کا موازنہ کریں' : 'Compare All Materials'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {language === 'ur' 
                                    ? 'دیکھیں کہ آپ کی پیمائش کے مطابق دیگر سنگِ مرمر کی لاگت کیا ہوگی۔' 
                                    : 'See how other marbles look and cost for your configured measurements'}
                                </p>
                              </div>
                            </div>
                            <Button 
                              onClick={() => router.push(`/order/${params.marbleId}/compare`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 self-stretch sm:self-auto"
                              size="sm"
                            >
                              {language === 'ur' ? 'تمام موازنہ دیکھیں' : 'View All Comparisons'}
                            </Button>
                          </div>
                        )}

                      <div className="space-y-4">
                           {requirements.map(req => (
                              <RequirementCard 
                                key={req.id} 
                                req={req} 
                                onEdit={setEditingRequirementId} 
                                onRemove={removeRequirement}
                                onMaterialChange={setChangingMaterialId}
                              />
                            ))}
                      </div>
                      
                       <div className="space-y-4 mt-4 print-hidden">
                          {customerInfo.name && (
                            <>
                               {isPerPieceProduct && selectedMarble ? (
                                    <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-4">
                                            <Image src={selectedMarble.imageUrl} alt={selectedMarble.name} width={48} height={48} className="rounded-md object-cover" />
                                            <div>
                                                <CardTitle>Step 2: Add Quantity</CardTitle>
                                                <CardDescription>
                                                Selected: {(selectedMarble as any).nameWithNum || selectedMarble.name} (Price: PKR {selectedMarble.variants[0].price?.toLocaleString()}/piece)
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex items-center gap-4">
                                        <Label htmlFor="quantity" className="font-semibold">Quantity:</Label>
                                        <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        value={perPieceQuantity}
                                        onChange={(e) => setPerPieceQuantity(parseInt(e.target.value) || 1)}
                                        className="h-10 w-24"
                                        />
                                        <Button onClick={handleAddOrUpdatePerPieceItem}>
                                          {requirements.some(r => r.marbleId === selectedMarble.id && r.details?.isPerPiece) ? 'Update Quantity' : 'Add to Quotation'}
                                        </Button>
                                    </CardContent>
                                    </Card>
                               ) : isGeneralSuppliesOrder ? (
                                 <Card>
                                     <CardHeader>
                                         <CardTitle>Step 2: Add Supplies to Quotation</CardTitle>
                                         <CardDescription>Click the button below to browse and add tools, chemicals, and other supplies.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button variant="outline" className="h-20 flex-col gap-2 w-full" onClick={() => setIsFixingMaterialDialogOpen(true)}>
                                            <Wrench className="h-6 w-6"/>
                                            <span>Browse & Add Tools / Chemicals</span>
                                        </Button>
                                    </CardContent>
                                 </Card>
                               ) : (
                                <>
                                   <Card>
                                      <CardHeader>
                                        <div className="flex items-center gap-4">
                                            {selectedMarble && <Image src={selectedMarble.imageUrl} alt={selectedMarble.name} width={48} height={48} className="rounded-md object-cover" />}
                                            <div className="flex-1">
                                                <CardTitle>Step 2: Select Format</CardTitle>
                                                <CardDescription>
                                                    {selectedMarble ? `Selected: ${(selectedMarble as any).nameWithNum || selectedMarble.name}` : "Select a material first."}
                                                </CardDescription>
                                            </div>
                                        </div>
                                      </CardHeader>
                                       <CardContent>
                                         <Select
                                            value={currentVariant?.id || ''}
                                            onValueChange={(variantId) => {
                                                const newVariant = selectedMarble?.variants.find(v => v.id === variantId);
                                                if (newVariant) setCurrentVariant(newVariant);
                                            }}
                                            disabled={!selectedMarble || selectedMarble.variants.length === 0}
                                        >
                                            <SelectTrigger className="text-base">
                                                <SelectValue placeholder="Select a format/price" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedMarble?.variants.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>
                                                        {v.size} - {v.thickness} @ PKR {v.price?.toLocaleString() || 'N/A'}/{isPerPieceProduct ? 'piece' : 'sq.ft'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                       </CardContent>
                                   </Card>

                                  <Card>
                                      <CardHeader>
                                          <div className="flex items-center gap-4">
                                              <Package className="h-10 w-10 text-primary"/>
                                              <CardTitle>Step 3: Add Requirements</CardTitle>
                                          </div>
                                      </CardHeader>
                                      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                          {filteredRequirementOptions.map(opt => (
                                              <Button key={opt.value} variant="outline" className="h-20 flex-col gap-2" onClick={() => handleAddNewRequirement(opt.value)} disabled={!selectedMarble || !currentVariant}>
                                                  <opt.icon className="h-6 w-6"/>
                                                  <span>{opt.label}</span>
                                              </Button>
                                          ))}
                                          <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setIsFixingMaterialDialogOpen(true)}>
                                              <Wrench className="h-6 w-6"/>
                                              <span>Add Tools & Chemicals</span>
                                          </Button>
                                      </CardContent>
                                  </Card>
                                </>
                               )}
                            </>
                          )}
                        
                          {requirements.length > 0 && (
                            <Button onClick={handlePlaceOrder} className="w-full" size="lg" disabled={isPlacingOrder}>
                                {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                {searchParams.get('orderId') ? `Update Order (PKR ${grandTotal.toLocaleString()})` : `Place Order (PKR ${grandTotal.toLocaleString()})`}
                            </Button>
                          )}
                        </div>
                  </div>
              </div>
          </div>
        </div>
      </main>

        <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl">Customer Details</DialogTitle>
                    <DialogDescription>Enter the customer's information for this quotation.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 px-6">
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={customerForm.name || ''} onChange={(e) => setCustomerForm(prev => ({...prev, name: e.target.value}))} className="h-12"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={customerForm.phone || ''} onChange={(e) => setCustomerForm(prev => ({...prev, phone: e.target.value}))} className="h-12"/>
                        </div>
                            <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" value={customerForm.address || ''} onChange={(e) => setCustomerForm(prev => ({...prev, address: e.target.value}))} className="min-h-[100px]"/>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="loadLocation">{language === 'ur' ? 'لوڈ لوکیشن (Load Location)' : 'Load Location'}</Label>
                                <Input 
                                    id="loadLocation" 
                                    value={customerForm.loadLocation || ''} 
                                    onChange={(e) => setCustomerForm(prev => ({...prev, loadLocation: e.target.value}))} 
                                    placeholder="e.g. Sargodha Factory"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loadSize">{language === 'ur' ? 'لوڈ سائز (Load Size)' : 'Load Size'}</Label>
                                <Select 
                                    value={customerForm.loadSize || ''} 
                                    onValueChange={(val) => setCustomerForm(prev => ({...prev, loadSize: val}))}
                                >
                                    <SelectTrigger className="h-12 w-full text-foreground">
                                        <SelectValue placeholder={language === 'ur' ? 'سائز منتخب کریں' : 'Select size'} />
                                    </SelectTrigger>
                                    <SelectContent className="text-foreground">
                                        {loadSizes.map((size) => (
                                            <SelectItem key={size} value={size}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row to add a custom size to the dropdown */}
                        <div className="bg-muted/40 p-3.5 rounded-lg border border-border/50 space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                {language === 'ur' ? 'نیا لوڈ سائز شامل کریں:' : 'Add Custom Load Size Option:'}
                            </Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newLoadSize} 
                                    onChange={(e) => setNewLoadSize(e.target.value)} 
                                    placeholder={language === 'ur' ? 'مثلاً 60 انچ کاؤنٹر یا گینگ سا شیٹ' : 'e.g. 60-inch counter, block, etc.'}
                                    className="h-10 bg-background"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddLoadSize();
                                        }
                                    }}
                                />
                                <Button 
                                    type="button" 
                                    onClick={handleAddLoadSize}
                                    className="h-10 px-4 font-semibold text-xs"
                                >
                                    {language === 'ur' ? 'شامل کریں' : 'Add Option'}
                                </Button>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full h-12" onClick={handleShareLocation} disabled={isGettingLocation}>
                            <MapPin className="mr-2 h-5 w-5" />
                            {customerForm.latitude ? 'Location Captured' : 'Share Current Location'}
                        </Button>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2">
                    <Button onClick={handleSaveCustomer} className="w-full h-12 text-lg">Save Details</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl">Quotation Ready!</DialogTitle>
                    <DialogDescription className="text-center">
                        Order #{lastPlacedOrder?.id} has been saved. You can now forward it to the customer.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 px-6">
                    <div className="space-y-3 py-4">
                        <Button onClick={handleShareToWhatsApp} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
                            <Share2 className="mr-2" /> Forward to WhatsApp
                        </Button>
                        <Button variant="outline" className="w-full h-12" onClick={() => router.push('/track-order')}>
                            Go to My Orders
                        </Button>
                        {isAdmin && (
                            <Button variant="secondary" className="w-full h-12" onClick={() => router.push('/dashboard/manual-orders')}>
                                <ArrowRight className="mr-2" /> Back to Manual Orders
                            </Button>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2">
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog
          open={!!editingRequirementId && requirements.find(r => r.id === editingRequirementId)?.type !== 'fixing_material'}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRequirementId(null);
              setIsCalculatorFullScreen(false);
            }
          }}
        >
           <DialogContent
             className={cn(
               "w-full h-full max-w-none max-h-none left-0 top-0 translate-x-0 translate-y-0 rounded-none flex flex-col p-0",
               isCalculatorFullScreen || editingRequirement?.type === 'cutting-optimizer'
                 ? "fixed z-50 rounded-none border-none m-0 bg-slate-950"
                 : "sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
             )}
             style={
               isCalculatorFullScreen || editingRequirement?.type === 'cutting-optimizer'
                 ? {
                     left: 0,
                     top: 0,
                     transform: 'none',
                     width: '100vw',
                     height: '100vh',
                     maxWidth: 'none',
                     maxHeight: 'none',
                     borderRadius: 0,
                   }
                 : undefined
             }
           >
                {editingRequirement ? (
                    <>
                        {editingRequirement.type === 'cutting-optimizer' ? (
                          <DialogHeader className="sr-only">
                            <DialogTitle>
                              {requirementOptions.find(o => o.value === editingRequirement.type)?.label || 'Cutting Optimizer'}
                            </DialogTitle>
                            <DialogDescription>
                              {(editingRequirement.marble as any)?.nameWithNum || editingRequirement.marble?.name || '2D Slab Cutting Workstation'}
                            </DialogDescription>
                          </DialogHeader>
                        ) : (
                          <DialogHeader className="p-4 sm:px-6 pb-2 flex flex-row items-center justify-between border-b shrink-0">
                              <div className="flex items-center gap-3">
                                  <Image src={editingRequirement.marble!.imageUrl} alt={editingRequirement.marble!.name} width={36} height={36} className="rounded-md object-cover" referrerPolicy="no-referrer" />
                                  <div>
                                      <DialogTitle className="text-base">{requirementOptions.find(o => o.value === editingRequirement.type)?.label}</DialogTitle>
                                      <DialogDescription className="text-xs">{(editingRequirement.marble as any)?.nameWithNum || editingRequirement.marble!.name}</DialogDescription>
                                  </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCalculatorFullScreen((prev) => !prev)}
                                className="h-8 gap-1.5 px-3 mr-8 text-xs font-medium shrink-0"
                              >
                                {isCalculatorFullScreen ? (
                                  <>
                                    <Minimize2 className="h-3.5 w-3.5" />
                                    <span>نارمل سکرین (Exit Fullscreen)</span>
                                  </>
                                ) : (
                                  <>
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    <span>فل سکرین (Fullscreen)</span>
                                  </>
                                )}
                              </Button>
                          </DialogHeader>
                        )}
                        <div className={cn(
                          "overflow-y-auto flex-grow",
                          editingRequirement.type === 'cutting-optimizer' ? "p-0 bg-slate-950" : "px-4 sm:px-6 py-4"
                        )}>
                            {(() => {
                            const commonProps = {
                                onSave: (data: any) => handleSaveRequirement(editingRequirement!.id, data),
                                initialState: editingRequirement.details,
                                marble: editingRequirement.marble!,
                                variant: editingRequirement.variant!,
                                onCancel: () => {
                                  setEditingRequirementId(null);
                                  setIsCalculatorFullScreen(false);
                                }
                            };
                            switch(editingRequirement.type) {
                                case 'simple': return <SimpleCalculator {...commonProps} />;
                                case 'floor': return <FloorPlanner {...commonProps} />;
                                case 'stairs': return <OrderForm {...commonProps} applicationType="stairs" />;
                                case 'window-sill': return <OrderForm {...commonProps} applicationType="window-sill" />;
                                case 'kitchen': return <KitchenDesigner {...commonProps} />;
                                case 'vanity': return <VanityDesigner {...commonProps} />;
                                case 'cutting-optimizer': return (
                                  <CuttingOptimizerPro
                                    marbles={marblesList}
                                    initialMarble={editingRequirement.marble!}
                                    initialVariant={editingRequirement.variant!}
                                    isCustomerMode={true}
                                    onFullscreenChange={setIsCalculatorFullScreen}
                                    onSaveToCustomerQuote={(data) => {
                                      setIsCalculatorFullScreen(false);
                                      handleSaveRequirement(editingRequirement!.id, data);
                                    }}
                                    onCancel={() => {
                                      setIsCalculatorFullScreen(false);
                                      setEditingRequirementId(null);
                                    }}
                                  />
                                );
                                case 'labor_quote': return <LaborQuoteCalculator {...commonProps} />;
                                default: return null;
                            }
                        })()}
                        </div>
                    </>
                ) : (
                  <DialogHeader className="sr-only">
                    <DialogTitle>Calculator</DialogTitle>
                    <DialogDescription>Stone Calculator Dialog</DialogDescription>
                  </DialogHeader>
                )}
            </DialogContent>
        </Dialog>

        {/* Change Material Dialog */}
        <Dialog open={changingMaterialId !== null} onOpenChange={(open) => {
            if (!open) {
                setChangingMaterialId(null);
                setIsMaterialSelectorFullScreen(false);
            }
        }}>
            <DialogContent 
                className={cn(
                    "flex flex-col p-0 transition-all duration-300 border bg-background shadow-lg overflow-hidden",
                    isMaterialSelectorFullScreen 
                      ? "fixed z-50 rounded-none border-none m-0" 
                      : "sm:max-w-4xl max-h-[90vh]"
                )}
                style={isMaterialSelectorFullScreen ? { 
                    left: 0, 
                    top: 0, 
                    transform: 'none', 
                    width: '100vw', 
                    height: '100vh', 
                    maxWidth: 'none', 
                    maxHeight: 'none' 
                } : {}}
            >
                <div className="flex items-center justify-between p-3 px-5 border-b shrink-0 bg-slate-50/30">
                    <div className="flex-1 min-w-0 pr-12">
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground truncate">
                            Change Material <span className="text-xs font-normal text-muted-foreground hidden sm:inline">/ پروڈکٹ تبدیل کریں</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs truncate text-muted-foreground">
                            Changing material for: <strong className="text-indigo-600 font-semibold">{requirements.find(r => r.id === changingMaterialId)?.name || 'this item'}</strong>
                        </DialogDescription>
                    </div>
                    {/* Size toggle button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-3 mr-10 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all text-xs shrink-0 font-medium"
                        onClick={() => setIsMaterialSelectorFullScreen(!isMaterialSelectorFullScreen)}
                    >
                        {isMaterialSelectorFullScreen ? (
                            <>
                                <Minimize2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Normal Screen</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </>
                        )}
                    </Button>
                </div>
                
                <div className="px-5 py-2.5 bg-slate-50/50 border-b shrink-0">
                    <div className="flex flex-row gap-3 items-center">
                        <div className="flex-grow">
                            <Label htmlFor="search-material-input" className="sr-only">Search Material</Label>
                            <Input 
                                id="search-material-input"
                                placeholder="Search by name / تلاش کریں..." 
                                value={materialSearchQuery}
                                onChange={(e) => setMaterialSearchQuery(e.target.value)}
                                className="h-9 text-xs focus-visible:ring-indigo-500 bg-background"
                            />
                        </div>
                        <div className="w-[160px] sm:w-[220px]">
                            <Select value={materialFilter} onValueChange={setMaterialFilter}>
                                <SelectTrigger className="h-9 text-xs bg-background">
                                    <SelectValue placeholder="All Materials" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filterCategories.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                            {cat.label === 'all_materials' ? 'All Materials / تمام' : cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator / Help text */}
                {filteredMarblesForSearch.length > 0 && (
                    <div className="px-5 py-1.5 bg-indigo-50/30 border-b flex justify-between items-center text-[11px] text-muted-foreground select-none shrink-0">
                        <span className="flex items-center gap-1.5 font-medium text-indigo-700">
                            <span className="relative flex h-1.5 w-1.5 animate-pulse">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-600 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
                            </span>
                            Showing {filteredMarblesForSearch.length} materials
                        </span>
                        <span className="animate-pulse flex items-center gap-1 font-semibold text-indigo-700">
                            Scroll down to see more / نیچے اور بھی ہیں <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{ __html: `
                    .custom-scroll-container::-webkit-scrollbar {
                        width: 8px !important;
                        display: block !important;
                    }
                    .custom-scroll-container::-webkit-scrollbar-track {
                        background: rgba(241, 245, 249, 0.5) !important;
                        border-radius: 4px !important;
                    }
                    .custom-scroll-container::-webkit-scrollbar-thumb {
                        background: #cbd5e1 !important;
                        border-radius: 4px !important;
                        border: 1px solid rgba(241, 245, 249, 0.5) !important;
                    }
                    .custom-scroll-container::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8 !important;
                    }
                `}} />

                <div 
                    className={cn(
                        "flex-1 px-5 py-3 overflow-y-auto custom-scroll-container bg-slate-50/5", 
                        isMaterialSelectorFullScreen ? "" : "max-h-[50vh]"
                    )} 
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 rgba(241, 245, 249, 0.5)' }}
                >
                    {filteredMarblesForSearch.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground font-medium">
                            No materials found matching search criteria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-6">
                            {filteredMarblesForSearch.map(marble => {
                                const isCurrent = requirements.find(r => r.id === changingMaterialId)?.marbleId === marble.id;
                                const bestVariant = marble.variants[0];
                                return (
                                    <Card 
                                        key={marble.id} 
                                        className={cn(
                                            "cursor-pointer hover:border-indigo-500/50 transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden bg-background",
                                            isCurrent ? "border-2 border-indigo-600 ring-2 ring-indigo-600/15" : ""
                                        )}
                                        onClick={() => handleMaterialSelectionForRequirement(marble)}
                                    >
                                        <div className="relative aspect-video w-full bg-muted">
                                            <Image 
                                                src={marble.imageUrl} 
                                                alt={marble.name} 
                                                fill 
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                referrerPolicy="no-referrer"
                                                priority={false}
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow whitespace-nowrap">
                                                {marble.origin}
                                            </div>
                                        </div>
                                        <CardHeader className="p-3 flex-1 flex flex-col justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xs font-bold line-clamp-1 text-slate-800">{marble.nameWithNum}</CardTitle>
                                                <CardDescription className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{marble.materialType}</CardDescription>
                                            </div>
                                            <div className="mt-3 pt-2 border-t flex justify-between items-center text-[11px]">
                                                <span className="text-muted-foreground">Price/قیمت:</span>
                                                <span className="font-bold text-indigo-600">
                                                    {bestVariant ? `PKR ${bestVariant.price?.toLocaleString()}/sft` : 'N/A'}
                                                </span>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <DialogFooter className="p-3 px-5 border-t bg-slate-50/50 flex justify-end gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => {
                        setChangingMaterialId(null);
                        setIsMaterialSelectorFullScreen(false);
                    }}>
                        Close / بند کریں
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
