'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Upload, X, Facebook, Instagram, Camera, AlertCircle, Star, Wrench, Coins, Plus, Trash, Share2, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
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
import type { ServiceProvider, GalleryImage, ProviderJob } from '@/lib/types';
import initialServiceProviders from '@/lib/service-providers-data.json';
import { getServiceProviders, addServiceProvider, updateServiceProvider, deleteServiceProvider, addProviderGalleryImage, deleteProviderGalleryImage, getHomepageConfig } from '@/lib/admin-actions';
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import Webcam from 'react-webcam';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn, getPublicOrigin } from '@/lib/utils';
import config from '@/lib/config.json';



export default function ManageServiceProvidersPage() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [providerToDelete, setProviderToDelete] = useState<ServiceProvider | null>(null);
  const [providerToEdit, setProviderToEdit] = useState<Partial<ServiceProvider> | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Webcam state
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamPurpose, setWebcamPurpose] = useState<'profile' | 'gallery' | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Form states for adding jobs
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobPrice, setNewJobPrice] = useState('');
  const [newJobUnit, setNewJobUnit] = useState<'sqft' | 'sqmeter' | 'rft' | 'piece' | 'job'>('sqft');

  const [serviceTypes, setServiceTypes] = useState<string[]>(config.serviceTypes || ["Marble & Tile Fixing", "Marble Polishing"]);

  useEffect(() => {
    async function loadProviders() {
      setIsLoading(true);
      try {
        const liveProviders = await getServiceProviders();
        setProviders(liveProviders);
      } catch (err) {
        console.warn("Using fallback providers:", err);
        setProviders(initialServiceProviders as ServiceProvider[]);
      } finally {
        setIsLoading(false);
      }
    }

    async function loadServiceTypes() {
      try {
        const homeConfig = await getHomepageConfig();
        if (homeConfig && homeConfig.serviceTypes) {
          setServiceTypes(homeConfig.serviceTypes);
        }
      } catch (err) {
        console.error("Error loading service types", err);
      }
    }

    loadProviders();
    loadServiceTypes();
  }, []);

  const handleAddJobHelper = () => {
    if (!newJobTitle.trim() || !newJobPrice) {
      toast({ variant: 'destructive', title: "Missing Job Details", description: "Please enter a valid title and price." });
      return;
    }
    const priceNum = Number(newJobPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: 'destructive', title: "Invalid Price", description: "Price must be a positive number." });
      return;
    }
    const newJob: ProviderJob = {
      id: `job-${Date.now()}`,
      title: newJobTitle.trim(),
      price: priceNum,
      unit: newJobUnit
    };
    setProviderToEdit(prev => {
      if (!prev) return prev;
      const currentJobs = prev.jobs || [];
      return {
        ...prev,
        jobs: [...currentJobs, newJob]
      };
    });
    setNewJobTitle('');
    setNewJobPrice('');
    toast({ title: "Job profile added", description: "Added to rules draft list. Save changes to finalize." });
  };

  const handleDeleteJobHelper = (jobId: string) => {
    setProviderToEdit(prev => {
      if (!prev) return prev;
      const currentJobs = prev.jobs || [];
      return {
        ...prev,
        jobs: currentJobs.filter(j => j.id !== jobId)
      };
    });
    toast({ title: "Job profile removed" });
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasCameraPermission(true);
      return true;
    } catch (error) {
      setHasCameraPermission(false);
      return false;
    }
  };

  const openWebcamDialog = async (purpose: 'profile' | 'gallery') => {
    await requestCameraPermission();
    setWebcamPurpose(purpose);
    setIsWebcamOpen(true);
  };

  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
      if (!dataurl) return null;
      const arr = dataurl.split(',');
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
  }

  const handleWebcamCapture = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const file = dataURLtoFile(imageSrc, `webcam-sp-${Date.now()}.jpg`);
        if(!file) return;

        if (webcamPurpose === 'gallery' && providerToEdit?.id) {
            toast({ title: "Uploading image..." });
            const formData = new FormData();
            formData.append('image', file);
            formData.append('providerId', providerToEdit.id);
            const result = await addProviderGalleryImage(formData);
            if (result.success && result.newImage) {
                const newImage = result.newImage;
                setProviderToEdit(prev => prev ? { ...prev, gallery: [...(prev.gallery || []), newImage] } : null);
                setProviders(prev => prev.map(p => p.id === providerToEdit.id ? { ...p, gallery: [...(p.gallery || []), newImage] } : p));
                toast({ title: `Uploaded webcam image` });
            } else {
                toast({ variant: 'destructive', title: `Failed to upload image`, description: result.error });
            }
        } else if (webcamPurpose === 'profile') {
            setEditImageFile(file);
        }
        setIsWebcamOpen(false);
        setWebcamPurpose(null);
      }
    }
  };


  const handleAddNew = () => {
    setProviderToEdit({
      id: undefined,
      name: '',
      service: 'Marble & Tile Fixing',
      phone: '',
      status: 'active',
      rating: 3,
      imageUrl: '',
      gallery: [],
      socials: { facebook: '', instagram: '', whatsapp: '' }
    });
    setEditImageFile(null);
    setIsWebcamOpen(false);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (provider: ServiceProvider) => {
    setProviderToEdit(provider);
    setEditImageFile(null);
    setIsWebcamOpen(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (provider: ServiceProvider) => {
    setProviderToDelete(provider);
    setIsDeleting(true);
  };
  
  const handleConfirmDelete = async () => {
    if (providerToDelete) {
      const result = await deleteServiceProvider(providerToDelete.id);
      if (result.success) {
        setProviders(prev => prev.filter(p => p.id !== providerToDelete.id));
        toast({ title: "Provider Deleted" });
      } else {
        toast({ variant: 'destructive', title: "Deletion Failed", description: result.error });
      }
    }
    setProviderToDelete(null);
    setIsDeleting(false);
  };

  const handleSaveChanges = async () => {
    if (!providerToEdit || !providerToEdit.name || !providerToEdit.service || !providerToEdit.phone) {
        toast({ variant: 'destructive', title: "Missing Information" });
        return;
    }

    setIsSaving(true);
    
    const formData = new FormData();
    if(providerToEdit.id) formData.append('id', providerToEdit.id);
    formData.append('name', providerToEdit.name);
    formData.append('service', providerToEdit.service);
    formData.append('phone', providerToEdit.phone);
    formData.append('status', providerToEdit.status || 'inactive');
    formData.append('rating', String(providerToEdit.rating || '0'));
    if (editImageFile) {
        formData.append('image', editImageFile);
    }
    
    if (providerToEdit.imageUrl) {
        formData.append('imageUrl', providerToEdit.imageUrl);
    }
    if (providerToEdit.gallery) {
        formData.append('gallery', JSON.stringify(providerToEdit.gallery));
    }
    
    formData.append('whatsapp', providerToEdit.socials?.whatsapp || '');
    formData.append('facebook', providerToEdit.socials?.facebook || '');
    formData.append('instagram', providerToEdit.socials?.instagram || '');
    formData.append('jobs', JSON.stringify(providerToEdit.jobs || []));

    const action = providerToEdit.id ? updateServiceProvider : addServiceProvider;
    const result = await action(formData);

    if (result.success) {
        const updatedProvider = (result as any).updatedProvider || (result as any).newProvider;
        if (providerToEdit.id) { 
            setProviders(prev => prev.map(p => p.id === updatedProvider.id ? { ...p, ...updatedProvider } : p));
            toast({ title: "Provider Updated" });
        } else { 
            setProviders(prev => [updatedProvider, ...prev]);
            toast({ title: "Provider Added" });
        }
        setIsDialogOpen(false);
        setProviderToEdit(null);
    } else {
        toast({ variant: 'destructive', title: `Failed to ${providerToEdit.id ? 'update' : 'add'} provider`, description: (result as any).error });
    }

    setIsSaving(false);
  };

  const handleFieldChange = (field: keyof ServiceProvider, value: any) => {
    if (providerToEdit) {
      setProviderToEdit(prev => ({...prev, [field]: value}));
    }
  };
  
  const handleSocialChange = (social: 'whatsapp' | 'facebook' | 'instagram', value: string) => {
    if (providerToEdit) {
        setProviderToEdit(prev => ({
            ...prev,
            socials: {
                ...prev?.socials,
                [social]: value
            }
        }));
    }
  };


  const handleGalleryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !providerToEdit?.id) return;
    toast({ title: "Uploading gallery images..." });
    for (const file of Array.from(event.target.files)) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('providerId', providerToEdit.id);
      const result = await addProviderGalleryImage(formData);
      if (result.success && result.newImage) {
        const newImage = result.newImage;
        setProviderToEdit(prev => prev ? { ...prev, gallery: [...(prev.gallery || []), newImage] } : null);
        setProviders(prev => prev.map(p => p.id === providerToEdit.id ? { ...p, gallery: [...(p.gallery || []), newImage] } : p));
        toast({ title: `Uploaded ${file.name}` });
      } else {
        toast({ variant: 'destructive', title: `Failed to upload ${file.name}`, description: result.error });
      }
    }
  };
  
  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!providerToEdit?.id) return;
    const result = await deleteProviderGalleryImage(providerToEdit.id, imageId);
    if (result.success) {
      setProviderToEdit(prev => prev ? { ...prev, gallery: prev.gallery?.filter(img => img.id !== imageId) } : null);
      setProviders(prev => prev.map(p => p.id === providerToEdit.id ? { ...p, gallery: p.gallery?.filter(img => img.id !== imageId) } : p));
      toast({ title: 'Gallery image deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Deletion failed', description: result.error });
    }
  };


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Service Providers</CardTitle>
              <CardDescription>Manage your expert teams and partners.</CardDescription>
            </div>
            <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Provider</span>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skel-provider-${i}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image alt={provider.name} className="aspect-square rounded-md object-cover" height="64" src={provider.imageUrl || 'https://placehold.co/100x100?text=No+Image'} width="64" />
                    </TableCell>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{provider.service}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("h-4 w-4", i < (provider.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{provider.phone}</TableCell>
                    <TableCell>
                      <Badge variant={provider.status === 'active' ? 'secondary' : 'outline'}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(provider)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(`${getPublicOrigin()}/expert/${provider.id}/portal`);
                            toast({ title: "Secure Portal Link Copied", description: `Secure link for ${provider.name} copied to clipboard!` });
                          }}>
                            <Share2 className="mr-2 h-4 w-4" /> Copy Invite Link
                          </DropdownMenuItem>
                          {provider.socials?.whatsapp && (
                            <DropdownMenuItem onClick={() => {
                              const message = `السلام علیکم! آپ اس لنک پر کلک کر کے اپنے ریٹس، خدمات اور تصاویر شامل کر سکتے ہیں:\n${getPublicOrigin()}/expert/${provider.id}/portal`;
                              window.open(`https://wa.me/${provider.socials?.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
                            }}>
                              <MessageSquare className="mr-2 h-4 w-4 text-green-500" /> Share via WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(provider)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{providerToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{providerToEdit?.id ? 'Edit' : 'Add'} Service Provider</DialogTitle>
          </DialogHeader>
          {providerToEdit && (
            <ScrollArea className="max-h-[70vh]">
            <div className="grid md:grid-cols-2 gap-8 py-4 pr-6">
              <div className="space-y-6">
                  <div>
                    <Label className="font-semibold text-base">Profile Image</Label>
                    <div className="mt-2 relative w-24 h-24 rounded-md border flex items-center justify-center overflow-hidden">
                        {editImageFile ? (
                          <Image src={URL.createObjectURL(editImageFile)} alt="Preview" width={96} height={96} className="object-cover" />
                        ) : providerToEdit.imageUrl ? (
                          <Image src={providerToEdit.imageUrl} alt={providerToEdit.name || ''} width={96} height={96} className="object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Preview</span>
                        )}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => imageInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Change</Button>
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => openWebcamDialog('profile')}><Camera className="mr-2 h-4 w-4" />Camera</Button>
                    </div>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && setEditImageFile(e.target.files[0])} />
                  </div>
                  <div className="space-y-4">
                    <div>
                        <Label htmlFor="name" className="font-semibold">Name</Label>
                        <Input id="name" value={providerToEdit.name} onChange={(e) => handleFieldChange('name', e.target.value)} className="mt-1" />
                    </div>
                     <div>
                        <Label htmlFor="rating" className="font-semibold">Rating</Label>
                        <Select value={String(providerToEdit.rating || 3)} onValueChange={(value) => handleFieldChange('rating', Number(value))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Star</SelectItem>
                                <SelectItem value="2">2 Stars</SelectItem>
                                <SelectItem value="3">3 Stars</SelectItem>
                                <SelectItem value="4">4 Stars</SelectItem>
                                <SelectItem value="5">5 Stars</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="phone" className="font-semibold">Phone</Label>
                        <Input id="phone" value={providerToEdit.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} className="mt-1" />
                    </div>
                     <div className="space-y-2">
                        <Label className="font-semibold">Social Media Links (Optional)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-green-500"><title>WhatsApp</title><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/><path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4"/></svg></span>
                            <Input value={providerToEdit.socials?.whatsapp || ''} onChange={e => handleSocialChange('whatsapp', e.target.value)} placeholder="WhatsApp Number (e.g., 923001234567)" className="pl-10" />
                        </div>
                         <div className="relative">
                            <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                            <Input value={providerToEdit.socials?.facebook || ''} onChange={e => handleSocialChange('facebook', e.target.value)} placeholder="Facebook Profile URL" className="pl-10" />
                        </div>
                         <div className="relative">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-pink-500" />
                            <Input value={providerToEdit.socials?.instagram || ''} onChange={e => handleSocialChange('instagram', e.target.value)} placeholder="Instagram Profile URL" className="pl-10" />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="service" className="font-semibold">Service</Label>
                        <Select value={providerToEdit.service} onValueChange={(value) => handleFieldChange('service', value)}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                            {serviceTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="status" className="font-semibold">Status</Label>
                            <p className="text-xs text-muted-foreground">Inactive providers are hidden from the public site.</p>
                        </div>
                        <Switch id="status" checked={providerToEdit.status === 'active'} onCheckedChange={(checked) => handleFieldChange('status', checked ? 'active' : 'inactive')} />
                    </div>

                    {providerToEdit.id && (
                      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3 mt-4">
                        <div>
                          <Label className="font-semibold text-sm flex items-center gap-1.5 text-indigo-400">
                            <Share2 className="h-4 w-4" />
                            Share Portal Link
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Send this secure link to the expert team so they can add/edit their own rates and gallery photos.</p>
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            readOnly 
                            value={`${getPublicOrigin()}/expert/${providerToEdit.id}/portal`} 
                            className="h-8 text-xs bg-background border-slate-800 text-muted-foreground flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-xs px-3"
                            onClick={() => {
                              navigator.clipboard.writeText(`${getPublicOrigin()}/expert/${providerToEdit.id}/portal`);
                              toast({ title: "Portal Link Copied", description: "Invite link copied to clipboard!" });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        {providerToEdit.socials?.whatsapp && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-green-500/30 text-green-500 hover:bg-green-500/10 gap-1.5"
                            onClick={() => {
                              const message = `السلام علیکم! آپ اس لنک پر کلک کر کے اپنے ریٹس، خدمات اور تصاویر شامل کر سکتے ہیں:\n${getPublicOrigin()}/expert/${providerToEdit.id}/portal`;
                              window.open(`https://wa.me/${providerToEdit.socials?.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
                            }}
                          >
                            Share via WhatsApp
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
              </div>
               <div className="space-y-4">
                    {/* Jobs & Pricing Rates Board */}
                    <div className="rounded-lg border p-4 bg-muted/35 space-y-4">
                        <div>
                            <Label className="font-semibold text-base flex items-center gap-1.5 text-foreground">
                                <Coins className="h-4 w-4 text-emerald-500" />
                                Jobs & Rates Board
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Specify job subcategories, fixing rates, or polishing services with their units.</p>
                        </div>

                        {/* Jobs List */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {(!providerToEdit.jobs || providerToEdit.jobs.length === 0) ? (
                                <p className="text-xs text-muted-foreground bg-muted/65 p-3 rounded-md text-center italic border border-dashed">No job rates specified. Add some below!</p>
                            ) : (
                                providerToEdit.jobs.map((job) => (
                                    <div key={job.id} className="flex items-center justify-between gap-2 p-2 bg-background border rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate text-foreground">{job.title}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Rs. <span className="font-mono font-bold text-foreground">{job.price}</span> / {
                                                    job.unit === 'sqft' ? 'Sq. Ft.' :
                                                    job.unit === 'sqmeter' ? 'Sq. Meter' :
                                                    job.unit === 'rft' ? 'RFT' :
                                                    job.unit === 'piece' ? 'Piece' : 'Fixed Job'
                                                }
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteJobHelper(job.id)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Job Form */}
                        <div className="space-y-2.5 pt-2 border-t border-border">
                            <p className="text-[11px] font-bold text-foreground">Add New Job / Rate Rule</p>
                            <div className="space-y-2">
                                <div>
                                    <Label htmlFor="new-job-title" className="text-[10px] font-medium text-muted-foreground">Job Title / Material Specific</Label>
                                    <Input
                                        id="new-job-title"
                                        placeholder="e.g. Sunny Grey Marble Fixing"
                                        value={newJobTitle}
                                        onChange={(e) => setNewJobTitle(e.target.value)}
                                        className="h-8 text-xs mt-1 bg-background"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="new-job-price" className="text-[10px] font-medium text-muted-foreground">Price (PKR)</Label>
                                        <Input
                                            id="new-job-price"
                                            type="number"
                                            placeholder="e.g. 45"
                                            value={newJobPrice}
                                            onChange={(e) => setNewJobPrice(e.target.value)}
                                            className="h-8 text-xs mt-1 bg-background"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-medium text-muted-foreground">Unit</Label>
                                        <Select value={newJobUnit} onValueChange={(v: any) => setNewJobUnit(v)}>
                                            <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sqft">Per Sq. Ft.</SelectItem>
                                                <SelectItem value="sqmeter">Per Sq. Meter</SelectItem>
                                                <SelectItem value="rft">Per Running Ft.</SelectItem>
                                                <SelectItem value="piece">Per Piece</SelectItem>
                                                <SelectItem value="job">Fixed Cost</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button type="button" variant="secondary" size="sm" className="w-full h-8 text-xs mt-1" onClick={handleAddJobHelper}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Job Rule
                                </Button>
                            </div>
                        </div>
                    </div>

                    {providerToEdit.id && (
                    <div>
                        <Label className="font-semibold text-base">Work Gallery</Label>
                        <p className="text-sm text-muted-foreground">Showcase this provider's best work.</p>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {(providerToEdit.gallery || []).map((image) => (
                            <div key={image.id} className="relative group aspect-square">
                            <Image src={image.url} alt={image.altText} fill className="object-cover rounded-md" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteGalleryImage(image.id)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        </div>
                        <input id="gallery-upload" type="file" className="hidden" ref={galleryInputRef} accept="image/png, image/jpeg, image/webp" multiple onChange={handleGalleryFileChange} />
                        <div className="flex gap-2 mt-2">
                            <Button variant="outline" className="flex-1" onClick={() => galleryInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>Add from Device</Button>
                            <Button variant="secondary" className="flex-1" onClick={() => openWebcamDialog('gallery')}><Camera className="mr-2 h-4 w-4"/>Add from Camera</Button>
                        </div>
                    </div>
                    )}
               </div>
            </div>
            </ScrollArea>
          )}
          <DialogFooter>
             <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWebcamOpen} onOpenChange={setIsWebcamOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Capture Image from Camera</DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-black">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="h-full w-full object-cover"
                    onUserMedia={() => setHasCameraPermission(true)}
                    onUserMediaError={() => setHasCameraPermission(false)}
                />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>Please grant camera permissions in your browser settings to use this feature.</AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>
            <DialogFooter className="flex-row gap-2 justify-end">
                 <Button variant="outline" onClick={() => setIsWebcamOpen(false)}>Cancel</Button>
                 <Button onClick={handleWebcamCapture} disabled={!hasCameraPermission}>
                    <Camera className="mr-2 h-4 w-4" /> Capture Photo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
