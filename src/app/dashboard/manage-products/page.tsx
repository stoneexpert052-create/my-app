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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Upload, X, Star, Edit, Camera, AlertCircle, Save, Check, Layers, Plus, Flame, Percent, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Marble, MarbleVariant, GalleryImage, FixingMaterial } from '@/lib/types';
import { materialTypes, fixingMaterialCategories } from '@/lib/data';
import { 
  getMarbles, 
  getFixingMaterials, 
  deleteMarble, 
  updateMarbleDetails, 
  addMarble, 
  addFixingMaterial, 
  deleteFixingMaterial, 
  updateFixingMaterialDetails,
  updateMarbleImage,
  getHomepageConfig,
  processImageFile,
  getSizeFormats,
  addSizeFormat,
  updateCategoryOrder,
  addCategory,
  getAllCategoriesList,
  subscribeToAppUpdates,
  deduplicateCategories
} from '@/lib/admin-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import config from '@/lib/config.json';

export default function ManageProductsPage() {
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [fixingMaterials, setFixingMaterials] = useState<FixingMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => deduplicateCategories(config.categoryOrder || []));
  const { toast } = useToast();
  
  // Size Formats States
  const [sizeFormats, setSizeFormats] = useState<string[]>([]);
  const [isAddingSize, setIsAddingSize] = useState<number | null>(null);
  const [customSizeValue, setCustomSizeValue] = useState('');
  const [isAddingNewSize, setIsAddingNewSize] = useState<number | null>(null);
  const [newCustomSizeValue, setNewCustomSizeValue] = useState('');
  
  // Filter States
  const [marbleFilter, setMarbleFilter] = useState('All');
  const [fixingFilter, setFixingFilter] = useState('All');

  const stoneFilterOptions = useMemo(() => {
    return ['All', ...deduplicateCategories(categoryOrder)];
  }, [categoryOrder]);

  const availableCategories = useMemo(() => {
    // Strictly respect the user's categoryOrder configured in Settings
    const configured = deduplicateCategories(categoryOrder);
    if (configured.length > 0) {
      return configured;
    }
    return deduplicateCategories(config.categoryOrder || [
      'Local Marble',
      'Imported Marble',
      'Local Granite',
      'Imported Granite',
      'MDM Material',
      'Marble Tiles',
      'Limestone',
      'Artificial Stone',
      'Corian',
      'Facade Stone',
      'Inlay',
      'Antique',
      'Vanity'
    ]);
  }, [categoryOrder]);

  useEffect(() => {
    async function loadData(showSpinner = true) {
      if (showSpinner) {
        setIsLoading(true);
      }
      try {
        const [dbMarbles, dbFixing, hpConfig, dbSizes] = await Promise.all([
          getMarbles(),
          getFixingMaterials(),
          getHomepageConfig(),
          getSizeFormats()
        ]);
        setMarbles(dbMarbles);
        setFixingMaterials(dbFixing);
        setSizeFormats(dbSizes);
        if (hpConfig && hpConfig.categoryOrder && Array.isArray(hpConfig.categoryOrder)) {
          setCategoryOrder(deduplicateCategories(hpConfig.categoryOrder));
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
      }
    }
    loadData(true);

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'category_order_updated') {
        if (event.detail && Array.isArray(event.detail)) {
          setCategoryOrder(deduplicateCategories(event.detail));
        } else {
          loadData(false);
        }
      } else if (event.type === 'products_updated' || event.type === 'fixing_categories_updated') {
        loadData(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredMarbles = useMemo(() => {
    if (marbleFilter === 'All') return marbles;
    const filterClean = marbleFilter.trim().toLowerCase();
    return marbles.filter(m => {
        const catClean = (m.category || '').trim().toLowerCase();
        const matClean = (m.materialType || '').trim().toLowerCase();
        const nameClean = (m.name || '').trim().toLowerCase();

        // Exact match on category or materialType
        if (catClean === filterClean || matClean === filterClean) return true;

        // Specific handling for MDM Material
        if (filterClean.includes('mdm')) {
            if (catClean.includes('mdm') || matClean.includes('mdm') || nameClean.includes('mdm')) {
                return true;
            }
        }

        // Specific handling for Tiles
        if (filterClean === 'marble tiles' || filterClean === '12x24 tiles') {
            if (matClean === '12x24 tiles' || matClean === 'marble tiles' || catClean === 'marble tiles') {
                return true;
            }
        }

        let key: string;
        if (m.materialType === '12x24 Tiles') key = 'Marble Tiles';
        else if (m.materialType === 'Marble' || m.materialType === 'Granite') key = `${m.origin || 'Local'} ${m.materialType}`;
        else key = m.materialType || '';
        
        return key.trim().toLowerCase() === filterClean;
    });
  }, [marbles, marbleFilter]);

  const filteredFixingMaterials = useMemo(() => {
    if (fixingFilter === 'All') return fixingMaterials;
    return fixingMaterials.filter(m => m.category === fixingFilter);
  }, [fixingMaterials, fixingFilter]);


  // Marble States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [marbleToDelete, setMarbleToDelete] = useState<Marble | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [marbleToEdit, setMarbleToEdit] = useState<Marble | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaterialType, setEditMaterialType] = useState<Marble['materialType']>('Local Marble');
  const [editOrigin, setEditOrigin] = useState<Marble['origin']>('Local');
  const [editVariants, setEditVariants] = useState<MarbleVariant[]>([]);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editOnSale, setEditOnSale] = useState(false);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editSaleBadgeText, setEditSaleBadgeText] = useState('');
  const [editHeroHighlightOnSale, setEditHeroHighlightOnSale] = useState(true);
  const [editUnit, setEditUnit] = useState('Square feet');
  const [editGallery, setEditGallery] = useState<GalleryImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductMaterialType, setNewProductMaterialType] = useState<Marble['materialType']>('Local Marble');
  const [newProductOrigin, setNewProductOrigin] = useState<Marble['origin']>('Local');
  const [newProductUnit, setNewProductUnit] = useState('Square feet');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number>(0);
  const [newProductIsFeatured, setNewProductIsFeatured] = useState(false);
  const [newProductOnSale, setNewProductOnSale] = useState(false);
  const [newProductDiscount, setNewProductDiscount] = useState<number>(0);
  const [newProductDiscountType, setNewProductDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newProductSaleBadgeText, setNewProductSaleBadgeText] = useState('');
  const [newProductHeroHighlightOnSale, setNewProductHeroHighlightOnSale] = useState(true);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  // Auto-sync material types with availableCategories
  useEffect(() => {
    if (availableCategories.length > 0) {
      if (!newProductMaterialType || newProductMaterialType.toLowerCase() === 'marble' || !availableCategories.includes(newProductMaterialType)) {
        setNewProductMaterialType(availableCategories[0]);
      }
      if (!editMaterialType || editMaterialType.toLowerCase() === 'marble' || !availableCategories.includes(editMaterialType)) {
        setEditMaterialType(availableCategories[0]);
      }
    }
  }, [availableCategories, newProductMaterialType, editMaterialType]);
  
  // Specific application picture categories
  const [newFloorImage, setNewFloorImage] = useState<File | null>(null);
  const [newStairsImage, setNewStairsImage] = useState<File | null>(null);
  const [newCountertopImage, setNewCountertopImage] = useState<File | null>(null);

  // Ratings and reviews states
  const [newProductRating, setNewProductRating] = useState<number>(5);
  const [newProductReviews, setNewProductReviews] = useState<{
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
  }[]>([]);

  // Temp fields for typing reviews
  const [tempReviewAuthor, setTempReviewAuthor] = useState('');
  const [tempReviewComment, setTempReviewComment] = useState('');
  const [tempReviewRating, setTempReviewRating] = useState(5);

  const [newProductGalleryImages, setNewProductGalleryImages] = useState<File[]>([]);
  const [newProductVariants, setNewProductVariants] = useState<MarbleVariant[]>([
    { id: 'v-new-0', size: 'Standard', thickness: '4-Sutar', price: 0 }
  ]);
  const [isDragActive, setIsDragActive] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Inline Category Creator States
  const [isAddingInlineCategory, setIsAddingInlineCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [isAddingInlineEditCategory, setIsAddingInlineEditCategory] = useState(false);
  const [inlineEditCategoryName, setInlineEditCategoryName] = useState('');
  const [isAddingInlineFixingCategory, setIsAddingInlineFixingCategory] = useState(false);
  const [inlineFixingCategoryName, setInlineFixingCategoryName] = useState('');
  const [isAddingInlineEditFixingCategory, setIsAddingInlineEditFixingCategory] = useState(false);
  const [inlineEditFixingCategoryName, setInlineEditFixingCategoryName] = useState('');

  const handleCreateInlineCategory = async (type: 'addMarble' | 'editMarble' | 'addFixing' | 'editFixing') => {
    let nameToUse = '';
    if (type === 'addMarble') nameToUse = inlineCategoryName.trim();
    else if (type === 'editMarble') nameToUse = inlineEditCategoryName.trim();
    else if (type === 'addFixing') nameToUse = inlineFixingCategoryName.trim();
    else if (type === 'editFixing') nameToUse = inlineEditFixingCategoryName.trim();

    if (!nameToUse) return;

    let updated = categoryOrder;
    if (!categoryOrder.some(c => c.toLowerCase() === nameToUse.toLowerCase())) {
      updated = [...categoryOrder, nameToUse];
      setCategoryOrder(updated);
      await updateCategoryOrder(updated);
    }

    if (type === 'addMarble') {
      setNewProductMaterialType(nameToUse);
      setInlineCategoryName('');
      setIsAddingInlineCategory(false);
    } else if (type === 'editMarble') {
      setEditMaterialType(nameToUse);
      setInlineEditCategoryName('');
      setIsAddingInlineEditCategory(false);
    } else if (type === 'addFixing') {
      setNewFixingCategory(nameToUse as any);
      setInlineFixingCategoryName('');
      setIsAddingInlineFixingCategory(false);
    } else if (type === 'editFixing') {
      setEditFixingCategory(nameToUse as any);
      setInlineEditFixingCategoryName('');
      setIsAddingInlineEditFixingCategory(false);
    }

    toast({
      title: "Category Created Live!",
      description: `"${nameToUse}" has been added and saved across the dashboard & app.`
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setNewProductImage(e.dataTransfer.files[0]);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const fixingFileInputRef = useRef<HTMLInputElement>(null);
  const editFixingFileInputRef = useRef<HTMLInputElement>(null);
  const editGalleryFileInputRef = useRef<HTMLInputElement>(null);

  const handleEditClick = (marble: Marble) => {
    setMarbleToEdit(marble);
    setEditName(marble.name);
    setEditDescription(marble.description || '');
    setEditMaterialType(marble.category || marble.materialType);
    setEditOrigin(marble.origin);
    setEditVariants([...marble.variants.map((v, i) => ({...v, id: v.id || `v-${Date.now()}-${i}`}))]);
    setEditIsFeatured(marble.isFeatured || false);
    setEditOnSale(marble.onSale || false);
    setEditDiscount(typeof marble.discount === 'number' ? marble.discount : 0);
    setEditDiscountType(marble.discountType || 'percentage');
    setEditSaleBadgeText(marble.saleBadgeText || '');
    setEditHeroHighlightOnSale(marble.heroHighlightOnSale !== false);
    setEditUnit(marble.unit || 'Square feet');
    setEditGallery(marble.gallery || []);
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!marbleToEdit) return;
    setIsSaving(true);
    
    try {
        let currentImageUrl = marbleToEdit.imageUrl;

        // If a new image was selected, upload it first
        if (editFileInputRef.current?.files?.[0]) {
            const imgFormData = new FormData();
            imgFormData.append('id', marbleToEdit.id);
            imgFormData.append('image', editFileInputRef.current.files[0]);
            const imgResult = await updateMarbleImage(imgFormData);
            if (imgResult.success && imgResult.imageUrl) {
                currentImageUrl = imgResult.imageUrl;
            }
        }

        const result = await updateMarbleDetails(marbleToEdit.id, { 
            name: editName, 
            materialType: editMaterialType, 
            category: editMaterialType,
            origin: editOrigin, 
            description: editDescription, 
            variants: editVariants, 
            gallery: editGallery,
            isFeatured: editIsFeatured,
            onSale: editOnSale,
            discount: editDiscount,
            discountType: editDiscountType,
            saleBadgeText: editSaleBadgeText,
            heroHighlightOnSale: editHeroHighlightOnSale,
            imageUrl: currentImageUrl, // CRITICAL: Preserve or update the image URL explicitly
            unit: editUnit
        });

        if (result.success && result.updatedMarble) {
          // Merge the update with the existing marble in state to be double-safe
          setMarbles(prev => prev.map(m => m.id === result.updatedMarble!.id ? { ...m, ...result.updatedMarble! } : m));
          toast({ title: 'Product Updated Successfully' });
          setIsEditDialogOpen(false);
        } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: (result as any).error });
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
    setIsSaving(false);
  };

  const handleEditGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await processImageFile(file);
        const newImg: GalleryImage = {
          id: `gal-edit-${Date.now()}-${i}`,
          url,
          altText: 'Sample Application View'
        };
        setEditGallery(prev => [...prev, newImg]);
        toast({ title: 'Sample image uploaded successfully' });
      } catch (err) {
        console.error("Error uploading edit gallery image:", err);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to process sample image' });
      }
    }
    if (editGalleryFileInputRef.current) {
      editGalleryFileInputRef.current.value = '';
    }
  };

  const handleRemoveEditGalleryImage = (id: string) => {
    setEditGallery(prev => prev.filter(img => img.id !== id));
    toast({ title: 'Sample image removed' });
  };

  const handleAddNewProduct = async () => {
    if (!newProductName) {
        toast({ variant: 'destructive', title: 'Name required' });
        return;
    }

    setIsAdding(true);
    const formData = new FormData();
    formData.append('name', newProductName);
    formData.append('materialType', newProductMaterialType);
    formData.append('category', newProductMaterialType);
    formData.append('origin', newProductOrigin);
    formData.append('unit', newProductUnit);
    formData.append('description', newProductDescription);
    formData.append('isFeatured', String(newProductIsFeatured));
    formData.append('onSale', String(newProductOnSale));
    formData.append('discount', String(newProductDiscount));
    formData.append('discountType', newProductDiscountType);
    formData.append('saleBadgeText', newProductSaleBadgeText);
    formData.append('heroHighlightOnSale', String(newProductHeroHighlightOnSale));
    
    const isStone = !['Abrasive', 'Chemical', 'Adhesive', 'Tool'].includes(newProductMaterialType);
    const formattedVariants = newProductVariants.map((v, idx) => ({
      id: v.id || `v-new-${Date.now()}-${idx}`,
      size: isStone ? (v.size || '') : '',
      thickness: isStone ? (v.thickness || '') : '',
      price: v.price === null ? 0 : Number(v.price)
    }));
    
    formData.append('variants', JSON.stringify(formattedVariants));
    if (newProductImage) {
        formData.append('image', newProductImage);
    }

    // Add specific application gallery images if selected
    if (newFloorImage) {
        formData.append('galleryImages', newFloorImage);
        formData.append('galleryTitles', 'Floor/Wall Application View');
    }
    if (newStairsImage) {
        formData.append('galleryImages', newStairsImage);
        formData.append('galleryTitles', 'Stairs/Steps Application View');
    }
    if (newCountertopImage) {
        formData.append('galleryImages', newCountertopImage);
        formData.append('galleryTitles', 'Kitchen/Countertop Application View');
    }

    // Add general gallery images
    newProductGalleryImages.forEach((imgFile) => {
        formData.append('galleryImages', imgFile);
        formData.append('galleryTitles', 'Reference Sample View');
    });

    // Add initial rating and reviews
    formData.append('rating', String(newProductRating));
    formData.append('reviews', JSON.stringify(newProductReviews));

    const result = await addMarble(formData);
    if (result.success && result.newMarble) {
      setMarbles(prev => [result.newMarble!, ...prev]);
      toast({ title: 'Product Added Successfully' });
      setIsAddDialogOpen(false);
      setNewProductName('');
      setNewProductPrice(0);
      setNewProductDescription('');
      setNewProductImage(null);
      setNewFloorImage(null);
      setNewStairsImage(null);
      setNewCountertopImage(null);
      setNewProductRating(5);
      setNewProductReviews([]);
      setNewProductGalleryImages([]);
      setNewProductVariants([
        { id: 'v-new-0', size: 'Standard', thickness: '4-Sutar', price: 0 }
      ]);
      setTempReviewAuthor('');
      setTempReviewComment('');
    } else {
      toast({ variant: 'destructive', title: 'Failed to Add', description: result.error });
    }
    setIsAdding(false);
  };

  const handleDeleteMarble = async () => {
      if (!marbleToDelete) return;
      const result = await deleteMarble(marbleToDelete.id);
      if (result.success) {
          setMarbles(marbles.filter(m => m.id !== marbleToDelete.id));
          toast({ title: "Deleted Successfully" });
          setIsDeleteDialogOpen(false);
      } else {
          toast({ variant: 'destructive', title: "Delete Failed", description: (result as any).error });
      }
  };

  const handleDeleteFixing = async () => {
      if (!fixingToDelete) return;
      const result = await deleteFixingMaterial(fixingToDelete.id);
      if (result.success) {
          setFixingMaterials(prev => prev.filter(m => m.id !== fixingToDelete.id));
          toast({ title: "Deleted Successfully", description: `Deleted "${fixingToDelete.name}".` });
          setIsDeleteFixingDialogOpen(false);
          setFixingToDelete(null);
      } else {
          toast({ variant: 'destructive', title: "Delete Failed", description: result.error });
      }
  };

  // Fixing Material States
  const [isAddFixingDialogOpen, setIsAddFixingDialogOpen] = useState(false);
  const [isAddingFixing, setIsAddingFixing] = useState(false);
  const [newFixingName, setNewFixingName] = useState('');
  const [newFixingDescription, setNewFixingDescription] = useState('');
  const [newFixingPrice, setNewFixingPrice] = useState('');
  const [newFixingUnit, setNewFixingUnit] = useState('');
  const [newFixingCategory, setNewFixingCategory] = useState<FixingMaterial['category']>('Other');
  const [newFixingIsFeatured, setNewFixingIsFeatured] = useState(false);
  const [newFixingOnSale, setNewFixingOnSale] = useState(false);
  const [newFixingDiscount, setNewFixingDiscount] = useState<number>(0);
  const [newFixingDiscountType, setNewFixingDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newFixingSaleBadgeText, setNewFixingSaleBadgeText] = useState('');
  const [newFixingHeroHighlightOnSale, setNewFixingHeroHighlightOnSale] = useState(true);
  const [newFixingImage, setNewFixingImage] = useState<File | null>(null);

  const [isEditFixingDialogOpen, setIsEditFixingDialogOpen] = useState(false);
  const [fixingToEdit, setFixingToEdit] = useState<FixingMaterial | null>(null);
  const [editFixingName, setEditFixingName] = useState('');
  const [editFixingDescription, setEditFixingDescription] = useState('');
  const [editFixingPrice, setEditFixingPrice] = useState('');
  const [editFixingUnit, setEditFixingUnit] = useState('');
  const [editFixingCategory, setEditFixingCategory] = useState<FixingMaterial['category']>('Other');
  const [editFixingIsFeatured, setEditFixingIsFeatured] = useState(false);
  const [editFixingOnSale, setEditFixingOnSale] = useState(false);
  const [editFixingDiscount, setEditFixingDiscount] = useState<number>(0);
  const [editFixingDiscountType, setEditFixingDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editFixingSaleBadgeText, setEditFixingSaleBadgeText] = useState('');
  const [editFixingHeroHighlightOnSale, setEditFixingHeroHighlightOnSale] = useState(true);

  const [isDeleteFixingDialogOpen, setIsDeleteFixingDialogOpen] = useState(false);
  const [fixingToDelete, setFixingToDelete] = useState<FixingMaterial | null>(null);

  const handleAddFixing = async () => {
    // Ensure category is in categoryOrder
    if (newFixingCategory && !categoryOrder.some(c => c.toLowerCase() === newFixingCategory.toLowerCase())) {
      const updated = [...categoryOrder, newFixingCategory];
      setCategoryOrder(updated);
      updateCategoryOrder(updated);
    }

    setIsAddingFixing(true);
    const formData = new FormData();
    formData.append('name', newFixingName);
    formData.append('description', newFixingDescription);
    formData.append('price', newFixingPrice);
    formData.append('unit', newFixingUnit);
    formData.append('category', newFixingCategory);
    formData.append('isFeatured', String(newFixingIsFeatured));
    formData.append('onSale', String(newFixingOnSale));
    formData.append('discount', String(newFixingDiscount));
    formData.append('discountType', newFixingDiscountType);
    formData.append('saleBadgeText', newFixingSaleBadgeText);
    formData.append('heroHighlightOnSale', String(newFixingHeroHighlightOnSale));
    if (newFixingImage) {
        formData.append('image', newFixingImage);
    }

    const result = await addFixingMaterial(formData);
    if (result.success && result.newMaterial) {
      setFixingMaterials(prev => [result.newMaterial!, ...prev]);
      toast({ title: 'Added Successfully' });
      setIsAddFixingDialogOpen(false);
      setNewFixingImage(null);
    } else {
      toast({ variant: 'destructive', title: 'Failed to Add', description: result.error });
    }
    setIsAddingFixing(false);
  };

  const handleUpdateFixing = async () => {
      if (!fixingToEdit) return;

      // Ensure category is in categoryOrder
      if (editFixingCategory && !categoryOrder.some(c => c.toLowerCase() === editFixingCategory.toLowerCase())) {
        const updated = [...categoryOrder, editFixingCategory];
        setCategoryOrder(updated);
        updateCategoryOrder(updated);
      }

      setIsSaving(true);
      const formData = new FormData();
      formData.append('id', fixingToEdit.id);
      formData.append('name', editFixingName);
      formData.append('description', editFixingDescription);
      formData.append('price', editFixingPrice);
      formData.append('unit', editFixingUnit);
      formData.append('category', editFixingCategory);
      formData.append('isFeatured', String(editFixingIsFeatured));
      formData.append('onSale', String(editFixingOnSale));
      formData.append('discount', String(editFixingDiscount));
      formData.append('discountType', editFixingDiscountType);
      formData.append('saleBadgeText', editFixingSaleBadgeText);
      formData.append('heroHighlightOnSale', String(editFixingHeroHighlightOnSale));
      if (editFixingFileInputRef.current?.files?.[0]) {
          formData.append('image', editFixingFileInputRef.current.files[0]);
      }

      const result = await updateFixingMaterialDetails(formData);
      if (result.success && result.updatedMaterial) {
          setFixingMaterials(prev => prev.map(m => m.id === result.updatedMaterial!.id ? { ...m, ...result.updatedMaterial! } : m));
          toast({ title: "Updated Successfully" });
          setIsEditFixingDialogOpen(false);
      } else {
          toast({ variant: 'destructive', title: "Update Failed", description: result.error });
      }
      setIsSaving(false);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="materials">
            <div className="flex items-center justify-between">
                 <TabsList>
                    <TabsTrigger value="materials">Stone Collection</TabsTrigger>
                    <TabsTrigger value="fixing">Tools & Chemicals</TabsTrigger>
                </TabsList>
                <Button size="sm" onClick={() => {
                    if (availableCategories.length > 0) {
                        setNewProductMaterialType(availableCategories[0]);
                    }
                    setIsAddDialogOpen(true);
                }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>
            
            <TabsContent value="materials" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Stone Collection</CardTitle>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {stoneFilterOptions.map(filter => (
                                <Button key={filter} variant={marbleFilter === filter ? 'default' : 'outline'} size="sm" onClick={() => setMarbleFilter(filter)}>
                                    {filter}
                                </Button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Default Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            )) : filteredMarbles.map((marble) => (
                            <TableRow key={marble.id}>
                                <TableCell>
                                    <div className="relative h-10 w-10 overflow-hidden rounded-md border">
                                        <Image alt={marble.name} src={marble.imageUrl || 'https://placehold.co/100x100?text=No+Img'} fill className="object-cover" />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                    {marble.name} {marble.isFeatured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                </TableCell>
                                <TableCell><Badge variant="outline">{marble.materialType}</Badge></TableCell>
                                <TableCell className="text-primary font-bold">PKR {marble.variants[0]?.price?.toLocaleString() || '0'} / {marble.unit === 'Square feet' ? 'sqft' : marble.unit === 'Square meters' ? 'sqm' : (marble.unit || 'sqft').toLowerCase()}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(marble)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => { setMarbleToDelete(marble); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="fixing">
                <Card>
                    <CardHeader>
                        <CardTitle>Tools & Chemicals</CardTitle>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant={fixingFilter === 'All' ? 'default' : 'outline'} size="sm" onClick={() => setFixingFilter('All')}>All</Button>
                            {fixingMaterialCategories.map(cat => (
                                <Button key={cat} variant={fixingFilter === cat ? 'default' : 'outline'} size="sm" onClick={() => setFixingFilter(cat)}>{cat}</Button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                )) : filteredFixingMaterials.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="relative h-10 w-10 overflow-hidden rounded-md border">
                                            <Image alt={item.name} src={item.imageUrl || 'https://placehold.co/100x100?text=No+Img'} fill className="object-cover" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-primary font-bold">PKR {item.price.toLocaleString()} / {item.unit}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    setFixingToEdit(item);
                                                    setEditFixingName(item.name);
                                                    setEditFixingPrice(String(item.price));
                                                    setEditFixingUnit(item.unit);
                                                    setEditFixingCategory(item.category);
                                                    setEditFixingDescription(item.description || '');
                                                    setEditFixingIsFeatured(item.isFeatured || false);
                                                    setEditFixingOnSale(item.onSale || false);
                                                    setEditFixingDiscount(typeof item.discount === 'number' ? item.discount : 0);
                                                    setEditFixingDiscountType(item.discountType || 'percentage');
                                                    setEditFixingSaleBadgeText(item.saleBadgeText || '');
                                                    setEditFixingHeroHighlightOnSale(item.heroHighlightOnSale !== false);
                                                    setIsEditFixingDialogOpen(true);
                                                }}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => { setFixingToDelete(item); setIsDeleteFixingDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={() => setIsAddFixingDialogOpen(true)}>Add New Supply</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>

        {/* Edit Marble Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none fixed left-0 top-0 translate-x-0 translate-y-0 flex flex-col p-0 bg-background border-none z-50">
                
                {/* Custom Sticky Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Edit className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                Edit {marbleToEdit?.name}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Modify design, catalog pricing, variant sizes, and sample gallery pictures in full-screen.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(false)} className="gap-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={isSaving} className="gap-2 shadow-sm font-semibold">
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Main Content Split Panels */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-muted/20">
                    
                    {/* Left Column: Visual Media & Sample Pictures Gallery */}
                    <div className="lg:col-span-5 border-r border-border bg-card flex flex-col overflow-hidden h-full">
                        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                Visuals & Sample Gallery
                            </h3>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                Media Manager
                            </span>
                        </div>
                        
                        <ScrollArea className="flex-1 p-6 space-y-6">
                            <div className="space-y-6 pb-8">
                                
                                {/* 1. Primary Texture Picture */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <span>1. Close-up Texture Slab Picture</span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        The main thumbnail representing the stone pattern or material texture.
                                    </p>
                                    
                                    <div 
                                        className="border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-2 min-h-[160px] border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/40"
                                        onClick={() => editFileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            ref={editFileInputRef} 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={() => {
                                                // Trigger update state so UI previews the file
                                                setEditName(editName);
                                            }} 
                                        />
                                        
                                        {editFileInputRef.current?.files?.[0] ? (
                                            <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border shadow-sm group">
                                                <Image 
                                                    src={URL.createObjectURL(editFileInputRef.current.files[0])} 
                                                    alt="New Texture Preview" 
                                                    fill 
                                                    className="object-cover" 
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <p className="text-white text-xs font-semibold flex items-center gap-1">
                                                        <Camera className="h-4 w-4" /> Click to replace
                                                    </p>
                                                </div>
                                            </div>
                                        ) : marbleToEdit?.imageUrl ? (
                                            <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border shadow-sm group">
                                                <Image 
                                                    src={marbleToEdit.imageUrl} 
                                                    alt="Current Texture Preview" 
                                                    fill 
                                                    className="object-cover" 
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <p className="text-white text-xs font-semibold flex items-center gap-1">
                                                        <Camera className="h-4 w-4" /> Click to replace
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-2">
                                                <div className="p-2.5 bg-muted rounded-full mb-2">
                                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Upload main texture file here
                                                </p>
                                                <p className="text-xs text-muted-foreground/80 mt-1">
                                                    Or <span className="text-primary underline font-medium">browse device</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* 2. Sample Pictures Gallery */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-bold text-foreground">
                                                2. Sample Pictures Gallery
                                            </Label>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Upload custom sample pictures showing installations, applications, or client references.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => editGalleryFileInputRef.current?.click()}
                                            className="h-8 gap-1.5"
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" /> Upload Sample
                                        </Button>
                                        <input
                                            type="file"
                                            ref={editGalleryFileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={handleEditGalleryUpload}
                                        />
                                    </div>

                                    {editGallery.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {editGallery.map((img) => (
                                                <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted shadow-sm">
                                                    <img 
                                                        src={img.url} 
                                                        alt={img.altText || 'Sample'} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition-all">
                                                        <span className="text-[10px] text-white truncate font-medium mb-1">{img.altText || 'Sample'}</span>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-5 w-5 rounded-full self-end shadow"
                                                            onClick={() => handleRemoveEditGalleryImage(img.id)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-muted-foreground/20 rounded-xl p-8 text-center bg-muted/10">
                                            <Camera className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                            <p className="text-xs font-medium text-muted-foreground">No sample pictures loaded yet</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Click "Upload Sample" above to add application previews.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Column: General Parameters & Variant Prices */}
                    <div className="lg:col-span-7 flex flex-col overflow-hidden h-full bg-background">
                        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                Parameters, Sizing & Variants
                            </h3>
                            <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                                Step 2 of 2
                            </span>
                        </div>
                        
                        <ScrollArea className="flex-1 p-6 space-y-6">
                            <div className="space-y-6 pb-8">
                                
                                {/* Section A: Metadata */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Core Data</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold flex items-center gap-1.5">
                                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                                    Material Type / Category
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingInlineEditCategory(!isAddingInlineEditCategory)}
                                                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    {isAddingInlineEditCategory ? 'Cancel' : '+ New Category'}
                                                </button>
                                            </div>

                                            {isAddingInlineEditCategory ? (
                                                <div className="flex items-center gap-1.5 p-2 rounded-lg border border-primary/40 bg-primary/5">
                                                    <Input
                                                        value={inlineEditCategoryName}
                                                        onChange={e => setInlineEditCategoryName(e.target.value)}
                                                        placeholder="Enter category (e.g. Travertine, Onyx)..."
                                                        className="h-8 text-xs bg-background"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleCreateInlineCategory('editMarble');
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleCreateInlineCategory('editMarble')}
                                                        disabled={!inlineEditCategoryName.trim()}
                                                        className="h-8 px-2.5 text-xs bg-primary text-primary-foreground shrink-0 cursor-pointer"
                                                    >
                                                        Add & Select
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Select value={editMaterialType} onValueChange={(v: any) => {
                                                  setEditMaterialType(v);
                                                  if (v === 'Chemical') setEditUnit('Liters');
                                                  else if (v === 'Adhesive') setEditUnit('Kilograms');
                                                  else if (v === 'Abrasive') setEditUnit('Pieces');
                                                  else if (v === 'Tool') setEditUnit('Pieces');
                                                  else if (['Marble', 'Granite', 'Limestone', 'Artificial Stone', 'Facade Stone', 'Local Marble', 'Imported Marble', 'Local Granite', 'Imported Granite', 'MDM Material', 'MDM'].some(k => v.includes(k))) setEditUnit('Square feet');
                                                }}>
                                                    <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="max-h-72">
                                                        {availableCategories.map(cat => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Pricing Unit</Label>
                                            <Select value={editUnit} onValueChange={setEditUnit}>
                                                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Square feet">Square feet (sq. ft.)</SelectItem>
                                                    <SelectItem value="Square meters">Square meters (sq. m.)</SelectItem>
                                                    <SelectItem value="Liters">Liters</SelectItem>
                                                    <SelectItem value="Kilograms">Kilograms (kg)</SelectItem>
                                                    <SelectItem value="Units">Units</SelectItem>
                                                    <SelectItem value="Pieces">Pieces</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label>Product Name</Label>
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Origin</Label>
                                            <Select value={editOrigin} onValueChange={(v: any) => setEditOrigin(v)}>
                                                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Local">Local</SelectItem><SelectItem value="Imported">Imported</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Description</Label>
                                        <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="min-h-[100px]" />
                                    </div>
                                    <div className="flex items-center gap-2 py-2">
                                        <Switch checked={editIsFeatured} onCheckedChange={setEditIsFeatured} />
                                        <Label>Show on Homepage (Featured)</Label>
                                    </div>

                                    {/* Sale & Hero Banner Highlight Settings */}
                                    <div className="p-3.5 border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 rounded-xl space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                                            <Flame className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <Label className="text-xs font-bold text-foreground">Put on Sale / پروڈکٹ پر سیل لگائیں</Label>
                                            <p className="text-[11px] text-muted-foreground">Enable discount price & promotional badging for this product</p>
                                          </div>
                                        </div>
                                        <Switch checked={editOnSale} onCheckedChange={setEditOnSale} />
                                      </div>

                                      {editOnSale && (
                                        <div className="pt-2 border-t border-red-500/20 space-y-3">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <Label className="text-[11px] font-bold">Discount Type / رعایت کی قسم</Label>
                                              <Select value={editDiscountType} onValueChange={(v: 'percentage' | 'fixed') => setEditDiscountType(v)}>
                                                <SelectTrigger className="h-8 text-xs font-semibold">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="percentage">Percentage % (فیصد رعایت)</SelectItem>
                                                  <SelectItem value="fixed">Fixed PKR Rupees (روپوں میں رعایت)</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="space-y-1">
                                              <Label className="text-[11px] font-bold">
                                                {editDiscountType === 'fixed' ? 'Discount in PKR (روپے)' : 'Discount in % (فیصد)'}
                                              </Label>
                                              <div className="relative">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  value={editDiscount === 0 ? '' : editDiscount}
                                                  onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                                                  placeholder={editDiscountType === 'fixed' ? 'e.g. 500 or 1000 PKR' : 'e.g. 15%'}
                                                  className="h-8 text-xs font-bold pl-8"
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-extrabold text-muted-foreground">
                                                  {editDiscountType === 'fixed' ? 'Rs' : '%'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <Label className="text-[11px] font-bold">Custom Badge Label / کسٹم بیج (اختیاری)</Label>
                                            <Input
                                              value={editSaleBadgeText}
                                              onChange={(e) => setEditSaleBadgeText(e.target.value)}
                                              placeholder={editDiscountType === 'fixed' ? `PKR ${editDiscount || 1000} OFF` : `${editDiscount || 10}% OFF`}
                                              className="h-8 text-xs"
                                            />
                                          </div>

                                          {/* Hero Banner Spotlight Toggle */}
                                          <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20">
                                            <div className="space-y-0.5">
                                              <div className="flex items-center gap-1.5">
                                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                                <Label className="text-xs font-bold text-amber-950 dark:text-amber-200">
                                                  Spotlight in Main Header (Hero Banner) / بڑی تصویر میں دکھائیں
                                                </Label>
                                              </div>
                                              <p className="text-[11px] text-muted-foreground">
                                                جب سیل آن ہو تو یہ پروڈکٹ ہوم پیج کے مین ہیڈر کی سلائیڈ شو میں خودکار نظر آئے گا۔ اگر آپ اسے مین ہیڈر سے ہٹانا چاہیں تو اس بٹن کو بند کر دیں۔
                                              </p>
                                            </div>
                                            <Switch 
                                              checked={editHeroHighlightOnSale} 
                                              onCheckedChange={setEditHeroHighlightOnSale} 
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Section B: Variants & Pricing Matrix */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Variants & Pricing Matrix</h3>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Determine catalog dimensions, slab sizes, or volumes with their respective retail price tags.</p>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => setEditVariants(prev => [...prev, { id: `v-edit-${Date.now()}`, size: '', thickness: '', price: 0 }])}
                                            className="h-8 gap-1.5"
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" /> Add Variant
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {editVariants.map((v, i) => {
                                            const isStone = !['Abrasive', 'Chemical', 'Adhesive', 'Tool'].includes(editMaterialType);
                                            if (!isStone) {
                                                return (
                                                    <div key={v.id || i} className="grid grid-cols-1 gap-2 items-end border border-border/60 bg-muted/20 p-4 rounded-xl">
                                                        <div>
                                                            <Label className="text-xs">Price (PKR / {editUnit === 'Square feet' ? 'sqft' : editUnit === 'Square meters' ? 'sqm' : (editUnit || '').toLowerCase()})</Label>
                                                            <div className="flex gap-2 items-center">
                                                                <Input 
                                                                    type="number" 
                                                                    value={v.price || ''} 
                                                                    onChange={e => setEditVariants(prev => prev.map((item, idx) => idx === i ? {...item, price: Number(e.target.value), size: '', thickness: ''} : item))} 
                                                                />
                                                                {editVariants.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-red-500 hover:text-red-700 h-9 w-9 shrink-0"
                                                                        onClick={() => setEditVariants(prev => prev.filter((_, idx) => idx !== i))}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={v.id || i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-border/60 bg-muted/20 p-4 rounded-xl relative group">
                                                    <div className="md:col-span-4 space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground font-semibold">Size (e.g. 12" x 24" or Slabs)</Label>
                                                        {isAddingSize === i ? (
                                                            <div className="flex gap-1 items-center">
                                                                <Input 
                                                                    value={customSizeValue} 
                                                                    onChange={e => setCustomSizeValue(e.target.value)} 
                                                                    placeholder="New size name"
                                                                    className="h-9 text-xs"
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 h-9 w-9 shrink-0"
                                                                    onClick={async () => {
                                                                        const trimmed = customSizeValue.trim();
                                                                        if (!trimmed) {
                                                                            setIsAddingSize(null);
                                                                            return;
                                                                        }
                                                                        const res = await addSizeFormat(trimmed);
                                                                        if (res.success) {
                                                                            setSizeFormats(prev => Array.from(new Set([...prev, trimmed])));
                                                                            setEditVariants(prev => prev.map((item, idx) => idx === i ? {...item, size: trimmed} : item));
                                                                            setCustomSizeValue('');
                                                                            setIsAddingSize(null);
                                                                            toast({
                                                                                title: "Size Added",
                                                                                description: `"${trimmed}" is now saved in options.`
                                                                            });
                                                                        } else {
                                                                            toast({
                                                                                title: "Error",
                                                                                description: res.error || "Failed to save",
                                                                                variant: "destructive"
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
                                                                    onClick={() => {
                                                                        setIsAddingSize(null);
                                                                        setCustomSizeValue('');
                                                                    }}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-1">
                                                                <Select
                                                                    value={v.size}
                                                                    onValueChange={(val) => {
                                                                        setEditVariants(prev => prev.map((item, idx) => idx === i ? {...item, size: val} : item));
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-9 text-xs">
                                                                        <SelectValue placeholder="Select size" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {sizeFormats.map((fmt) => (
                                                                            <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-9 w-9 shrink-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                    title="Add custom size"
                                                                    onClick={() => {
                                                                        setIsAddingSize(i);
                                                                        setCustomSizeValue('');
                                                                    }}
                                                                >
                                                                    <PlusCircle className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground font-semibold">Thickness (e.g. 4-Sutar)</Label>
                                                        <Input value={v.thickness} onChange={e => setEditVariants(prev => prev.map((item, idx) => idx === i ? {...item, thickness: e.target.value} : item))} />
                                                    </div>
                                                    <div className="md:col-span-4 space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground font-semibold">Price (PKR / {editUnit === 'Square feet' ? 'sqft' : editUnit === 'Square meters' ? 'sqm' : (editUnit || '').toLowerCase()})</Label>
                                                        <Input type="number" value={v.price || ''} onChange={e => setEditVariants(prev => prev.map((item, idx) => idx === i ? {...item, price: Number(e.target.value)} : item))} />
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-center pb-0.5">
                                                        {editVariants.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                                                                onClick={() => setEditVariants(prev => prev.filter((_, idx) => idx !== i))}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none fixed left-0 top-0 translate-x-0 translate-y-0 flex flex-col p-0 bg-background border-none z-50">
                
                {/* Custom Sticky Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                Add New Premium Product
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground">
                                Design, catalog pricing, variant sizing, and curate client reviews in full-screen.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)} className="gap-1">
                            Cancel
                        </Button>
                        <Button onClick={handleAddNewProduct} disabled={isAdding} className="gap-2 shadow-sm font-semibold">
                            {isAdding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Publish Product
                        </Button>
                    </div>
                </div>

                {/* Main Content Split Panels */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-muted/20">
                    
                    {/* Left Column: Visual Media & Reviews Curator */}
                    <div className="lg:col-span-5 border-r border-border bg-card flex flex-col overflow-hidden h-full">
                        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                Visuals & Customer Sentiment
                            </h3>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                Step 1 of 2
                            </span>
                        </div>
                        
                        <ScrollArea className="flex-1 p-6 space-y-6">
                            <div className="space-y-6 pb-8">
                                
                                {/* 1. Primary Texture Picture (Required) */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <span>1. Close-up Texture Slab Picture</span>
                                        <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        The main thumbnail representing the stone pattern or material texture.
                                    </p>
                                    
                                    <div 
                                        className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-2 min-h-[160px] ${
                                            isDragActive 
                                            ? 'border-primary bg-primary/5' 
                                            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/40'
                                        }`}
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={(e) => setNewProductImage(e.target.files?.[0] || null)} 
                                        />
                                        
                                        {newProductImage ? (
                                            <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border shadow-sm group">
                                                <Image 
                                                    src={URL.createObjectURL(newProductImage)} 
                                                    alt="Primary Texture Preview" 
                                                    fill 
                                                    className="object-cover" 
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <p className="text-white text-xs font-semibold flex items-center gap-1">
                                                        <Camera className="h-4 w-4" /> Click to replace
                                                    </p>
                                                </div>
                                                <Button 
                                                    type="button"
                                                    variant="destructive" 
                                                    size="icon" 
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md z-10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setNewProductImage(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-2">
                                                <div className="p-2.5 bg-muted rounded-full mb-2">
                                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Drag and drop main texture file here
                                                </p>
                                                <p className="text-xs text-muted-foreground/80 mt-1">
                                                    Or <span className="text-primary underline font-medium">browse device</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* 2. Application-Specific Gallery Pictures (3 slots) */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-bold text-foreground">
                                            2. Sample Application Pictures
                                        </Label>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Upload actual sample pictures showing different installation types (3 pictures total).
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Slot A: Floor / Wall */}
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">Floor / Wall View</Label>
                                            <div 
                                                className="border border-dashed border-muted-foreground/30 rounded-lg aspect-video flex flex-col items-center justify-center bg-muted/20 relative cursor-pointer hover:bg-muted/40 transition-colors p-2"
                                                onClick={() => document.getElementById('floor-input')?.click()}
                                            >
                                                <input 
                                                    type="file" 
                                                    id="floor-input"
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => setNewFloorImage(e.target.files?.[0] || null)}
                                                />
                                                {newFloorImage ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <img 
                                                            src={URL.createObjectURL(newFloorImage)} 
                                                            alt="Floor Preview" 
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                        <Button 
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-1 right-1 h-5 w-5 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewFloorImage(null);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-1">
                                                        <Camera className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                                        <span className="text-[10px] text-primary underline">Upload Floor</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Slot B: Stairs / Steps */}
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">Stairs / Steps View</Label>
                                            <div 
                                                className="border border-dashed border-muted-foreground/30 rounded-lg aspect-video flex flex-col items-center justify-center bg-muted/20 relative cursor-pointer hover:bg-muted/40 transition-colors p-2"
                                                onClick={() => document.getElementById('stairs-input')?.click()}
                                            >
                                                <input 
                                                    type="file" 
                                                    id="stairs-input"
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => setNewStairsImage(e.target.files?.[0] || null)}
                                                />
                                                {newStairsImage ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <img 
                                                            src={URL.createObjectURL(newStairsImage)} 
                                                            alt="Stairs Preview" 
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                        <Button 
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-1 right-1 h-5 w-5 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewStairsImage(null);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-1">
                                                        <Camera className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                                        <span className="text-[10px] text-primary underline">Upload Stairs</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Slot C: Kitchen / Countertop */}
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">Countertop View</Label>
                                            <div 
                                                className="border border-dashed border-muted-foreground/30 rounded-lg aspect-video flex flex-col items-center justify-center bg-muted/20 relative cursor-pointer hover:bg-muted/40 transition-colors p-2"
                                                onClick={() => document.getElementById('countertop-input')?.click()}
                                            >
                                                <input 
                                                    type="file" 
                                                    id="countertop-input"
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => setNewCountertopImage(e.target.files?.[0] || null)}
                                                />
                                                {newCountertopImage ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <img 
                                                            src={URL.createObjectURL(newCountertopImage)} 
                                                            alt="Countertop Preview" 
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                        <Button 
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-1 right-1 h-5 w-5 rounded-full"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setNewCountertopImage(null);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-1">
                                                        <Camera className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                                        <span className="text-[10px] text-primary underline">Upload Countertop</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* 3. Rating Setup */}
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-bold text-foreground">
                                            3. Set Default Star Rating
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Specify the primary starting average score for this product.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewProductRating(star)}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <Star 
                                                    className={`h-7 w-7 ${
                                                        star <= newProductRating 
                                                        ? 'fill-amber-400 text-amber-500' 
                                                        : 'text-muted-foreground/30'
                                                    }`} 
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-sm font-bold bg-muted px-2.5 py-1 rounded-md text-foreground">
                                            {newProductRating.toFixed(1)} Stars
                                        </span>
                                    </div>
                                </div>

                                <Separator />

                                {/* 4. Reviews Options Curator */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-bold text-foreground">
                                            4. Initial Reviews & Feedback
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Add realistic customer reviews that will display on the product detail catalog.
                                        </p>
                                    </div>

                                    {/* Add Review Form */}
                                    <div className="border border-border bg-muted/30 p-4 rounded-xl space-y-3">
                                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                                            Add Custom Reviewer Entry
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-[11px] font-medium text-muted-foreground">Client Name</Label>
                                                <Input 
                                                    size={30} 
                                                    className="h-8 text-xs bg-background" 
                                                    placeholder="e.g. Architect Ali" 
                                                    value={tempReviewAuthor}
                                                    onChange={e => setTempReviewAuthor(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-medium text-muted-foreground">Stars Selection</Label>
                                                <div className="flex items-center gap-1 h-8">
                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => setTempReviewRating(val)}
                                                            className="focus:outline-none"
                                                        >
                                                            <Star 
                                                                className={`h-4 w-4 ${
                                                                    val <= tempReviewRating 
                                                                    ? 'fill-amber-400 text-amber-500' 
                                                                    : 'text-muted-foreground/30'
                                                                }`} 
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-[11px] font-medium text-muted-foreground">Review/Comment Content</Label>
                                            <Input 
                                                className="h-8 text-xs bg-background" 
                                                placeholder="e.g. Absolutely flawless slab texture. Installed in DHA Phase 6."
                                                value={tempReviewComment}
                                                onChange={e => setTempReviewComment(e.target.value)}
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => {
                                                if (!tempReviewAuthor.trim()) {
                                                    toast({ variant: 'destructive', title: 'Reviewer name required' });
                                                    return;
                                                }
                                                if (!tempReviewComment.trim()) {
                                                    toast({ variant: 'destructive', title: 'Review comment required' });
                                                    return;
                                                }
                                                const newRev = {
                                                    id: `rev-${Date.now()}`,
                                                    userName: tempReviewAuthor,
                                                    rating: tempReviewRating,
                                                    comment: tempReviewComment,
                                                    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                                };
                                                setNewProductReviews(prev => [...prev, newRev]);
                                                setTempReviewAuthor('');
                                                setTempReviewComment('');
                                                setTempReviewRating(5);
                                                toast({ title: 'Review added to draft' });
                                            }}
                                            className="w-full h-8 text-xs font-semibold gap-1"
                                        >
                                            <PlusCircle className="h-3 w-3" /> Insert Review
                                        </Button>
                                    </div>

                                    {/* Display Added Reviews List */}
                                    {newProductReviews.length > 0 ? (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                            {newProductReviews.map((rev) => (
                                                <div key={rev.id} className="border border-border p-3 rounded-lg bg-card flex justify-between items-start text-xs shadow-xs">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-foreground">{rev.userName}</span>
                                                            <div className="flex items-center">
                                                                {Array.from({ length: 5 }).map((_, idx) => (
                                                                    <Star 
                                                                        key={idx}
                                                                        className={`h-3 w-3 ${
                                                                            idx < rev.rating 
                                                                            ? 'fill-amber-400 text-amber-500' 
                                                                            : 'text-muted-foreground/30'
                                                                        }`} 
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                                                        </div>
                                                        <p className="text-muted-foreground text-[11px] italic">"{rev.comment}"</p>
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setNewProductReviews(prev => prev.filter(r => r.id !== rev.id))}
                                                        className="h-6 w-6 text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-xs text-muted-foreground py-3 border border-dashed rounded-lg bg-muted/10">
                                            No initial reviews added. Add one above to build catalog trust.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Column: Metadata Details & Variant Sizes Pricing */}
                    <div className="lg:col-span-7 flex flex-col overflow-hidden h-full">
                        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                Specifications, Sizing & Pricing
                            </h3>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                                Step 2 of 2
                            </span>
                        </div>
                        
                        <ScrollArea className="flex-1 p-6 space-y-6">
                            <div className="space-y-6 pb-8">
                                
                                {/* A. Basic Specifications Block */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        A. Basic Specifications
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="prod-name" className="text-xs font-bold">Product Name</Label>
                                            <Input 
                                                id="prod-name"
                                                value={newProductName} 
                                                onChange={e => setNewProductName(e.target.value)} 
                                                placeholder="e.g. Royal Golden Siena" 
                                                className="bg-background font-medium"
                                            />
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <Label htmlFor="prod-origin" className="text-xs font-bold">Origin</Label>
                                            <Select value={newProductOrigin} onValueChange={(v: any) => setNewProductOrigin(v)}>
                                                <SelectTrigger id="prod-origin" className="font-bold bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Local">Local (Pakistan)</SelectItem>
                                                    <SelectItem value="Imported">Imported (Global)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold flex items-center gap-1.5">
                                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                                    Material Type / Category
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingInlineCategory(!isAddingInlineCategory)}
                                                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    {isAddingInlineCategory ? 'Cancel' : '+ New Category'}
                                                </button>
                                            </div>

                                            {isAddingInlineCategory ? (
                                                <div className="flex items-center gap-1.5 p-2 rounded-lg border border-primary/40 bg-primary/5">
                                                    <Input
                                                        value={inlineCategoryName}
                                                        onChange={e => setInlineCategoryName(e.target.value)}
                                                        placeholder="Enter category (e.g. Travertine, Onyx)..."
                                                        className="h-8 text-xs bg-background"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleCreateInlineCategory('addMarble');
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleCreateInlineCategory('addMarble')}
                                                        disabled={!inlineCategoryName.trim()}
                                                        className="h-8 px-2.5 text-xs bg-primary text-primary-foreground shrink-0 cursor-pointer"
                                                    >
                                                        Add & Select
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Select value={newProductMaterialType} onValueChange={(v: any) => {
                                                    setNewProductMaterialType(v);
                                                    if (v === 'Chemical') setNewProductUnit('Liters');
                                                    else if (v === 'Adhesive') setNewProductUnit('Kilograms');
                                                    else if (v === 'Abrasive') setNewProductUnit('Pieces');
                                                    else if (v === 'Tool') setNewProductUnit('Pieces');
                                                    else if (['Marble', 'Granite', 'Limestone', 'Artificial Stone', 'Facade Stone', 'Local Marble', 'Imported Marble', 'Local Granite', 'Imported Granite', 'MDM Material', 'MDM'].some(k => v.includes(k))) setNewProductUnit('Square feet');
                                                }}>
                                                    <SelectTrigger className="font-bold bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-72">
                                                        {availableCategories.map(cat => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold">Pricing Unit</Label>
                                            <Select value={newProductUnit} onValueChange={setNewProductUnit}>
                                                <SelectTrigger className="font-bold bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Square feet">Square feet (sq. ft.)</SelectItem>
                                                    <SelectItem value="Square meters">Square meters (sq. m.)</SelectItem>
                                                    <SelectItem value="Liters">Liters</SelectItem>
                                                    <SelectItem value="Kilograms">Kilograms (kg)</SelectItem>
                                                    <SelectItem value="Units">Units</SelectItem>
                                                    <SelectItem value="Pieces">Pieces</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Toggle Featured state */}
                                    <div className="flex items-center justify-between p-3 border border-border bg-card rounded-lg shadow-2xs">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold">Highlight Feature Product</Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Featured products will appear at the top hero recommendation rows of the visitor page.
                                            </p>
                                        </div>
                                        <Switch checked={newProductIsFeatured} onCheckedChange={setNewProductIsFeatured} />
                                    </div>

                                    {/* Sale & Hero Banner Highlight Settings */}
                                    <div className="p-3.5 border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 rounded-xl space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                                            <Flame className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <Label className="text-xs font-bold text-foreground">Put on Sale / پروڈکٹ پر سیل لگائیں</Label>
                                            <p className="text-[11px] text-muted-foreground">Enable discount price & promotional badging for this product</p>
                                          </div>
                                        </div>
                                        <Switch checked={newProductOnSale} onCheckedChange={setNewProductOnSale} />
                                      </div>

                                      {newProductOnSale && (
                                        <div className="pt-2 border-t border-red-500/20 space-y-3">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <Label className="text-[11px] font-bold">Discount Type / رعایت کی قسم</Label>
                                              <Select value={newProductDiscountType} onValueChange={(v: 'percentage' | 'fixed') => setNewProductDiscountType(v)}>
                                                <SelectTrigger className="h-8 text-xs font-semibold">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="percentage">Percentage % (فیصد رعایت)</SelectItem>
                                                  <SelectItem value="fixed">Fixed PKR Rupees (روپوں میں رعایت)</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="space-y-1">
                                              <Label className="text-[11px] font-bold">
                                                {newProductDiscountType === 'fixed' ? 'Discount in PKR (روپے)' : 'Discount in % (فیصد)'}
                                              </Label>
                                              <div className="relative">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  value={newProductDiscount === 0 ? '' : newProductDiscount}
                                                  onChange={(e) => setNewProductDiscount(Number(e.target.value) || 0)}
                                                  placeholder={newProductDiscountType === 'fixed' ? 'e.g. 500 or 1000 PKR' : 'e.g. 15%'}
                                                  className="h-8 text-xs font-bold pl-8"
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-extrabold text-muted-foreground">
                                                  {newProductDiscountType === 'fixed' ? 'Rs' : '%'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <Label className="text-[11px] font-bold">Custom Badge Label / کسٹم بیج (اختیاری)</Label>
                                            <Input
                                              value={newProductSaleBadgeText}
                                              onChange={(e) => setNewProductSaleBadgeText(e.target.value)}
                                              placeholder={newProductDiscountType === 'fixed' ? `PKR ${newProductDiscount || 1000} OFF` : `${newProductDiscount || 10}% OFF`}
                                              className="h-8 text-xs"
                                            />
                                          </div>

                                          {/* Hero Banner Spotlight Toggle */}
                                          <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20">
                                            <div className="space-y-0.5">
                                              <div className="flex items-center gap-1.5">
                                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                                <Label className="text-xs font-bold text-amber-950 dark:text-amber-200">
                                                  Spotlight in Main Header (Hero Banner) / بڑی تصویر میں دکھائیں
                                                </Label>
                                              </div>
                                              <p className="text-[11px] text-muted-foreground">
                                                جب سیل آن ہو تو یہ پروڈکٹ ہوم پیج کے مین ہیڈر کی سلائیڈ شو میں خودکار نظر آئے گا۔ اگر آپ اسے مین ہیڈر سے ہٹانا چاہیں تو اس بٹن کو بند کر دیں۔
                                              </p>
                                            </div>
                                            <Switch 
                                              checked={newProductHeroHighlightOnSale} 
                                              onCheckedChange={setNewProductHeroHighlightOnSale} 
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                </div>

                                <Separator />

                                {/* B. Pricing & Dimensional Variants */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            B. Dimensional Sizing & Variant Pricing
                                        </h4>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => setNewProductVariants(prev => [...prev, { id: `v-new-${Date.now()}`, size: '', thickness: '', price: 0 }])}
                                            className="h-8 gap-1.5 text-xs"
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" /> Add Sizing Row
                                        </Button>
                                    </div>

                                    <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-border">
                                        {newProductVariants.map((v, i) => {
                                            const isStone = !['Abrasive', 'Chemical', 'Adhesive', 'Tool'].includes(newProductMaterialType);
                                            if (!isStone) {
                                                return (
                                                    <div key={v.id || i} className="flex gap-3 items-end">
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-[11px] text-muted-foreground">
                                                                Price (PKR / {newProductUnit === 'Square feet' ? 'sqft' : newProductUnit === 'Square meters' ? 'sqm' : (newProductUnit || '').toLowerCase()})
                                                            </Label>
                                                            <Input 
                                                                type="number" 
                                                                value={v.price || ''} 
                                                                onChange={e => setNewProductVariants(prev => prev.map((item, idx) => idx === i ? {...item, price: Number(e.target.value), size: '', thickness: ''} : item))} 
                                                                className="bg-background h-9 text-xs"
                                                                placeholder="e.g. 450"
                                                            />
                                                        </div>
                                                        {newProductVariants.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 h-9 w-9 shrink-0"
                                                                onClick={() => setNewProductVariants(prev => prev.filter((_, idx) => idx !== i))}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={v.id || i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border-b border-border/40 pb-3 last:border-0 last:pb-0">
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground">Dimensions (Size)</Label>
                                                        {isAddingNewSize === i ? (
                                                            <div className="flex gap-1 items-center">
                                                                <Input 
                                                                    value={newCustomSizeValue} 
                                                                    onChange={e => setNewCustomSizeValue(e.target.value)} 
                                                                    placeholder="New size name"
                                                                    className="bg-background h-9 text-xs"
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 h-9 w-9 shrink-0"
                                                                    onClick={async () => {
                                                                        const trimmed = newCustomSizeValue.trim();
                                                                        if (!trimmed) {
                                                                            setIsAddingNewSize(null);
                                                                            return;
                                                                        }
                                                                        const res = await addSizeFormat(trimmed);
                                                                        if (res.success) {
                                                                            setSizeFormats(prev => Array.from(new Set([...prev, trimmed])));
                                                                            setNewProductVariants(prev => prev.map((item, idx) => idx === i ? {...item, size: trimmed} : item));
                                                                            setNewCustomSizeValue('');
                                                                            setIsAddingNewSize(null);
                                                                            toast({
                                                                                title: "Size Added",
                                                                                description: `"${trimmed}" is now saved in options.`
                                                                            });
                                                                        } else {
                                                                            toast({
                                                                                title: "Error",
                                                                                description: res.error || "Failed to save",
                                                                                variant: "destructive"
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
                                                                    onClick={() => {
                                                                        setIsAddingNewSize(null);
                                                                        setNewCustomSizeValue('');
                                                                    }}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-1">
                                                                <Select
                                                                    value={v.size}
                                                                    onValueChange={(val) => {
                                                                        setNewProductVariants(prev => prev.map((item, idx) => idx === i ? {...item, size: val} : item));
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="bg-background h-9 text-xs w-full">
                                                                        <SelectValue placeholder="Select size" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {sizeFormats.map((fmt) => (
                                                                            <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-9 w-9 shrink-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                    title="Add custom size"
                                                                    onClick={() => {
                                                                        setIsAddingNewSize(i);
                                                                        setNewCustomSizeValue('');
                                                                    }}
                                                                >
                                                                    <PlusCircle className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground">Thickness</Label>
                                                        <Input 
                                                            value={v.thickness} 
                                                            onChange={e => setNewProductVariants(prev => prev.map((item, idx) => idx === i ? {...item, thickness: e.target.value} : item))} 
                                                            placeholder="e.g. 4-Sutar, 5-Sutar" 
                                                            className="bg-background h-9 text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] text-muted-foreground">
                                                            Price (PKR / {newProductUnit === 'Square feet' ? 'sqft' : newProductUnit === 'Square meters' ? 'sqm' : (newProductUnit || '').toLowerCase()})
                                                        </Label>
                                                        <Input 
                                                            type="number" 
                                                            value={v.price || ''} 
                                                            onChange={e => setNewProductVariants(prev => prev.map((item, idx) => idx === i ? {...item, price: Number(e.target.value)} : item))} 
                                                            placeholder="e.g. 1500"
                                                            className="bg-background h-9 text-xs"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end">
                                                        {newProductVariants.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-700 h-9 w-9 shrink-0"
                                                                onClick={() => setNewProductVariants(prev => prev.filter((_, idx) => idx !== i))}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <Separator />

                                {/* C. Full Story / Description */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        C. Detailed Story & Description
                                    </h4>
                                    <Label htmlFor="prod-desc" className="text-xs font-semibold text-muted-foreground">
                                        Provide beautiful copywriting description about stone color tones, polish gloss, durability, and standard uses.
                                    </Label>
                                    <Textarea 
                                        id="prod-desc"
                                        value={newProductDescription} 
                                        onChange={e => setNewProductDescription(e.target.value)} 
                                        placeholder="Enter gorgeous description of this material..."
                                        className="min-h-[140px] bg-background text-sm leading-relaxed"
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{marbleToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMarble} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Fixing Material Confirm */}
        <AlertDialog open={isDeleteFixingDialogOpen} onOpenChange={setIsDeleteFixingDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{fixingToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteFixing} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Supply Edit/Add Dialogs */}
        <Dialog open={isAddFixingDialogOpen} onOpenChange={setIsAddFixingDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Tool or Chemical</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                            {newFixingImage ? (
                                <Image src={URL.createObjectURL(newFixingImage)} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground text-center">No Image</div>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fixingFileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Upload
                        </Button>
                        <input type="file" ref={fixingFileInputRef} className="hidden" accept="image/*" onChange={(e) => setNewFixingImage(e.target.files?.[0] || null)} />
                    </div>
                    <div><Label>Name</Label><Input value={newFixingName} onChange={e => setNewFixingName(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><Label>Price</Label><Input type="number" value={newFixingPrice} onChange={e => setNewFixingPrice(e.target.value)} /></div>
                        <div><Label>Unit</Label><Input value={newFixingUnit} onChange={e => setNewFixingUnit(e.target.value)} placeholder="e.g., 20kg bag" /></div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                Category
                            </Label>
                            <button
                                type="button"
                                onClick={() => setIsAddingInlineFixingCategory(!isAddingInlineFixingCategory)}
                                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="h-3 w-3" />
                                {isAddingInlineFixingCategory ? 'Cancel' : '+ New Category'}
                            </button>
                        </div>

                        {isAddingInlineFixingCategory ? (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg border border-primary/40 bg-primary/5">
                                <Input
                                    value={inlineFixingCategoryName}
                                    onChange={e => setInlineFixingCategoryName(e.target.value)}
                                    placeholder="Enter category (e.g. Sealants, Epoxies)..."
                                    className="h-8 text-xs bg-background"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCreateInlineCategory('addFixing');
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleCreateInlineCategory('addFixing')}
                                    disabled={!inlineFixingCategoryName.trim()}
                                    className="h-8 px-2.5 text-xs bg-primary text-primary-foreground shrink-0 cursor-pointer"
                                >
                                    Add & Select
                                </Button>
                            </div>
                        ) : (
                            <Select value={newFixingCategory} onValueChange={(v: any) => setNewFixingCategory(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {Array.from(new Set([...fixingMaterialCategories, ...availableCategories])).map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {/* Sale & Hero Banner Highlight Settings */}
                    <div className="p-3 border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="h-4 w-4 text-red-600" />
                          <Label className="text-xs font-bold">Put on Sale / سیل لگائیں</Label>
                        </div>
                        <Switch checked={newFixingOnSale} onCheckedChange={setNewFixingOnSale} />
                      </div>

                      {newFixingOnSale && (
                        <div className="pt-2 border-t border-red-500/20 space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] font-bold">Discount Type</Label>
                              <Select value={newFixingDiscountType} onValueChange={(v: 'percentage' | 'fixed') => setNewFixingDiscountType(v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage %</SelectItem>
                                  <SelectItem value="fixed">Fixed PKR (روپے)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold">
                                {newFixingDiscountType === 'fixed' ? 'Discount PKR' : 'Discount %'}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                value={newFixingDiscount === 0 ? '' : newFixingDiscount}
                                onChange={(e) => setNewFixingDiscount(Number(e.target.value) || 0)}
                                className="h-7 text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold">Custom Badge Label</Label>
                            <Input
                              value={newFixingSaleBadgeText}
                              onChange={(e) => setNewFixingSaleBadgeText(e.target.value)}
                              placeholder={newFixingDiscountType === 'fixed' ? `PKR ${newFixingDiscount || 100} OFF` : `${newFixingDiscount || 10}% OFF`}
                              className="h-7 text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-500" /> Hero Spotlight
                              </Label>
                              <p className="text-[10px] text-muted-foreground">مین ہیڈر بڑی تصویر میں دکھائیں</p>
                            </div>
                            <Switch checked={newFixingHeroHighlightOnSale} onCheckedChange={setNewFixingHeroHighlightOnSale} />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleAddFixing} disabled={isAddingFixing} className="w-full">Save Supply</Button>
                </div>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isEditFixingDialogOpen} onOpenChange={setIsEditFixingDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Supply</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                            <Image src={editFixingFileInputRef.current?.files?.[0] ? URL.createObjectURL(editFixingFileInputRef.current.files[0]) : (fixingToEdit?.imageUrl || 'https://placehold.co/100x100?text=No+Img')} alt="Preview" fill className="object-cover" />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => editFixingFileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Change Image
                        </Button>
                        <input type="file" ref={editFixingFileInputRef} className="hidden" accept="image/*" onChange={() => setEditFixingName(editFixingName)} />
                    </div>
                    <div><Label>Name</Label><Input value={editFixingName} onChange={e => setEditFixingName(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><Label>Price</Label><Input type="number" value={editFixingPrice} onChange={e => setEditFixingPrice(e.target.value)} /></div>
                        <div><Label>Unit</Label><Input value={editFixingUnit} onChange={e => setEditFixingUnit(e.target.value)} /></div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-primary" />
                                Category
                            </Label>
                            <button
                                type="button"
                                onClick={() => setIsAddingInlineEditFixingCategory(!isAddingInlineEditFixingCategory)}
                                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="h-3 w-3" />
                                {isAddingInlineEditFixingCategory ? 'Cancel' : '+ New Category'}
                            </button>
                        </div>

                        {isAddingInlineEditFixingCategory ? (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg border border-primary/40 bg-primary/5">
                                <Input
                                    value={inlineEditFixingCategoryName}
                                    onChange={e => setInlineEditFixingCategoryName(e.target.value)}
                                    placeholder="Enter category..."
                                    className="h-8 text-xs bg-background"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCreateInlineCategory('editFixing');
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleCreateInlineCategory('editFixing')}
                                    disabled={!inlineEditFixingCategoryName.trim()}
                                    className="h-8 px-2.5 text-xs bg-primary text-primary-foreground shrink-0 cursor-pointer"
                                >
                                    Add & Select
                                </Button>
                            </div>
                        ) : (
                            <Select value={editFixingCategory} onValueChange={(v: any) => setEditFixingCategory(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {Array.from(new Set([...fixingMaterialCategories, ...availableCategories])).map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {/* Sale & Hero Banner Highlight Settings */}
                    <div className="p-3 border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="h-4 w-4 text-red-600" />
                          <Label className="text-xs font-bold">Put on Sale / سیل لگائیں</Label>
                        </div>
                        <Switch checked={editFixingOnSale} onCheckedChange={setEditFixingOnSale} />
                      </div>

                      {editFixingOnSale && (
                        <div className="pt-2 border-t border-red-500/20 space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] font-bold">Discount Type</Label>
                              <Select value={editFixingDiscountType} onValueChange={(v: 'percentage' | 'fixed') => setEditFixingDiscountType(v)}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Percentage %</SelectItem>
                                  <SelectItem value="fixed">Fixed PKR (روپے)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold">
                                {editFixingDiscountType === 'fixed' ? 'Discount PKR' : 'Discount %'}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                value={editFixingDiscount === 0 ? '' : editFixingDiscount}
                                onChange={(e) => setEditFixingDiscount(Number(e.target.value) || 0)}
                                className="h-7 text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold">Custom Badge Label</Label>
                            <Input
                              value={editFixingSaleBadgeText}
                              onChange={(e) => setEditFixingSaleBadgeText(e.target.value)}
                              placeholder={editFixingDiscountType === 'fixed' ? `PKR ${editFixingDiscount || 100} OFF` : `${editFixingDiscount || 10}% OFF`}
                              className="h-7 text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-500" /> Hero Spotlight
                              </Label>
                              <p className="text-[10px] text-muted-foreground">مین ہیڈر بڑی تصویر میں دکھائیں</p>
                            </div>
                            <Switch checked={editFixingHeroHighlightOnSale} onCheckedChange={setEditFixingHeroHighlightOnSale} />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleUpdateFixing} disabled={isSaving} className="w-full">Update Supply</Button>
                </div>
            </DialogContent>
        </Dialog>

    </main>
  );
}
