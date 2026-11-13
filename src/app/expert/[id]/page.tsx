'use client';

export const dynamic = "force-dynamic";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getServiceProviderById, 
  saveServiceProviderDirect,
  getHomepageConfig
} from '@/lib/admin-actions';
import type { ServiceProvider, ProviderJob, GalleryImage } from '@/lib/types';
import { 
  Check, 
  Loader2, 
  Sparkles, 
  Upload, 
  Plus, 
  Phone, 
  Facebook, 
  Instagram, 
  Coins,
  Camera,
  X,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExpertPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Loading Secure Expert Portal...</span>
      </div>
    }>
      <ExpertPortalContent />
    </Suspense>
  );
}

function ExpertPortalContent() {
  const params = useParams();
  const id = params?.id as string;
  
  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'rates' | 'gallery'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    service: 'Marble & Tile Fixing',
  });

  const [serviceTypes, setServiceTypes] = useState<string[]>(["Marble & Tile Fixing", "Marble Polishing", "Stone Floor Restoration", "Vanity & Kitchen Installer"]);

  // Rates Form State (Jobs)
  const [jobs, setJobs] = useState<ProviderJob[]>([]);
  const [newJob, setNewJob] = useState({
    title: '',
    price: '',
    unit: 'sqft' as ProviderJob['unit']
  });

  // Gallery Upload Form State
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [newGalleryImage, setNewGalleryImage] = useState({
    image: null as string | null,
    imageFileName: '',
    altText: '',
    price: '',
    unit: 'sqft'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const spData = await getServiceProviderById(id);
      if (spData) {
        setProvider(spData);
        setProfileForm({
          name: spData.name || '',
          phone: spData.phone || '',
          whatsapp: spData.socials?.whatsapp || '',
          facebook: spData.socials?.facebook || '',
          instagram: spData.socials?.instagram || '',
          service: spData.service || 'Marble & Tile Fixing',
        });
        setJobs(spData.jobs || []);
        setGallery(spData.gallery || []);
      }
      
      const homeConfig = await getHomepageConfig();
      if (homeConfig && homeConfig.serviceTypes) {
        setServiceTypes(homeConfig.serviceTypes);
      }
    } catch (err) {
      console.error("Failed to load expert portal data", err);
    } finally {
      setLoading(false);
    }
  };

  // Profile Image Change (client-side base64 compress)
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 300; // Small size for profile avatar
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        setProvider(prev => prev ? { ...prev, imageUrl: compressedBase64 } : null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Gallery Image Change (client-side base64 compress)
  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 600; // Standard for work images
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        
        setNewGalleryImage(prev => ({
          ...prev,
          image: compressedBase64,
          imageFileName: file.name
        }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save profile updates to Firestore
  const handleSaveProfile = async () => {
    if (!provider) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedProvider: ServiceProvider = {
      ...provider,
      name: profileForm.name,
      phone: profileForm.phone,
      service: profileForm.service,
      socials: {
        whatsapp: profileForm.whatsapp,
        facebook: profileForm.facebook,
        instagram: profileForm.instagram,
      },
      jobs: jobs,
      gallery: gallery,
    };

    const result = await saveServiceProviderDirect(updatedProvider);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert(`Error saving profile: ${result.error}`);
    }
    setIsSaving(false);
  };

  // Add Job Rate Rule
  const handleAddJob = () => {
    if (!newJob.title || !newJob.price) return;
    const newJobItem: ProviderJob = {
      id: `job-${Date.now()}`,
      title: newJob.title,
      price: Number(newJob.price),
      unit: newJob.unit
    };
    setJobs(prev => [...prev, newJobItem]);
    setNewJob({ title: '', price: '', unit: 'sqft' });
  };

  // Delete Job Rate Rule
  const handleDeleteJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  // Add Showcase Image
  const handleAddGalleryImage = () => {
    if (!newGalleryImage.image) return;
    const priceNum = newGalleryImage.price ? Number(newGalleryImage.price) : undefined;
    
    const newImageItem: GalleryImage = {
      id: `img-${Date.now()}`,
      url: newGalleryImage.image,
      altText: newGalleryImage.altText || 'Work showcase item',
      price: priceNum,
      unit: priceNum ? newGalleryImage.unit : undefined
    };

    setGallery(prev => [...prev, newImageItem]);
    setNewGalleryImage({
      image: null,
      imageFileName: '',
      altText: '',
      price: '',
      unit: 'sqft'
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Delete Showcase Image
  const handleDeleteGalleryImage = (imgId: string) => {
    setGallery(prev => prev.filter(img => img.id !== imgId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Loading Expert Profile...</span>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h1 className="text-xl font-bold">Expert Profile Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md">
          We could not load this provider profile. The link may have expired or is incorrect. Please contact the administrator.
        </p>
        <Button asChild variant="outline" className="mt-2 text-slate-300 border-slate-700 hover:bg-slate-900">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 px-4 py-3 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-sans font-bold text-lg text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400" />
              Expert Team Onboarding Portal
            </h1>
          </div>
          <Button 
            onClick={handleSaveProfile} 
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-9 rounded-md px-4 shadow-lg shadow-indigo-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-400" /> Saved!
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Header Profile Info Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
          
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 overflow-hidden relative bg-slate-800">
              {provider.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={provider.imageUrl} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Photo</div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-slate-200"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input 
              type="file" 
              ref={profileImageInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleProfileImageChange} 
            />
          </div>

          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">{profileForm.name || "Your Team Name"}</h2>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 self-center md:self-start">
                {profileForm.service}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">
              Update your expertise, labor rates, WhatsApp contact information, and project photos directly. Changes go live immediately.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'profile' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="h-4 w-4" /> Profile & Contacts
          </button>
          <button 
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'rates' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="h-4 w-4" /> Jobs & Labor Rates
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'gallery' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" /> Work Showcase & Photo Rates
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div 
              key="profile" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <Card className="bg-slate-900/50 border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                  <CardDescription className="text-slate-400">These will be displayed on your expert team card for customers to reach you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sp-name">Team / Provider Name</Label>
                    <Input 
                      id="sp-name" 
                      value={profileForm.name} 
                      onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sp-phone">Phone Number (Call)</Label>
                      <Input 
                        id="sp-phone" 
                        value={profileForm.phone} 
                        onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. 03001234567"
                        className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sp-whatsapp">WhatsApp Number</Label>
                      <Input 
                        id="sp-whatsapp" 
                        value={profileForm.whatsapp} 
                        onChange={e => setProfileForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="e.g. 923001234567"
                        className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Social Media & Expertise</CardTitle>
                  <CardDescription className="text-slate-400">Additional links and categories to enrich your public profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sp-service">Primary Expertise / Service Category</Label>
                    <Select 
                      value={profileForm.service} 
                      onValueChange={val => setProfileForm(prev => ({ ...prev, service: val }))}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {serviceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sp-facebook">Facebook Profile Link (Optional)</Label>
                    <Input 
                      id="sp-facebook" 
                      value={profileForm.facebook} 
                      onChange={e => setProfileForm(prev => ({ ...prev, facebook: e.target.value }))}
                      placeholder="https://facebook.com/yourprofile"
                      className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sp-instagram">Instagram Profile Link (Optional)</Label>
                    <Input 
                      id="sp-instagram" 
                      value={profileForm.instagram} 
                      onChange={e => setProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="https://instagram.com/yourprofile"
                      className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'rates' && (
            <motion.div 
              key="rates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-3 gap-6">
                {/* Form to Add New Job Rule */}
                <Card className="bg-slate-900/50 border-slate-800 text-white md:col-span-1 h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Expertise / Job Rate</CardTitle>
                    <CardDescription className="text-slate-400">Specify labor costs, fixed jobs, or material services.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-title">Job Title</Label>
                      <Input 
                        id="job-title" 
                        value={newJob.title} 
                        onChange={e => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Sunny Grey Marble Fixing"
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="job-price">Price (PKR)</Label>
                        <Input 
                          id="job-price" 
                          type="number"
                          value={newJob.price} 
                          onChange={e => setNewJob(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="45"
                          className="bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select 
                          value={newJob.unit} 
                          onValueChange={(val: any) => setNewJob(prev => ({ ...prev, unit: val }))}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="sqft">Per Sq. Ft.</SelectItem>
                            <SelectItem value="sqmeter">Per Sq. Meter</SelectItem>
                            <SelectItem value="rft">Per RFT</SelectItem>
                            <SelectItem value="piece">Per Piece</SelectItem>
                            <SelectItem value="job">Fixed Labor / Job</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleAddJob} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100">
                      <Plus className="mr-2 h-4 w-4" /> Add Rate Rule
                    </Button>
                  </CardFooter>
                </Card>

                {/* List of Active Job Rates */}
                <Card className="bg-slate-900/50 border-slate-800 text-white md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Active Labor & Fixed Rates Board</CardTitle>
                    <CardDescription className="text-slate-400">These will be visible to potential customers, letting them see your pricing upfront.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jobs.length === 0 ? (
                      <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 italic">
                        No labor rate rules added yet. Add your rates using the panel on the left!
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {jobs.map(job => (
                          <div 
                            key={job.id} 
                            className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-between hover:border-slate-700 transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-sm text-slate-100">{job.title}</p>
                              <p className="text-indigo-400 text-xs font-mono font-bold mt-1">
                                Rs. {job.price} / {
                                  job.unit === 'sqft' ? 'Sq. Ft.' :
                                  job.unit === 'sqmeter' ? 'Sq. Meter' :
                                  job.unit === 'rft' ? 'Running Ft.' :
                                  job.unit === 'piece' ? 'Piece' : 'Fixed Cost'
                                }
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteJob(job.id)}
                              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-3 gap-6">
                {/* Upload Section with specific rates */}
                <Card className="bg-slate-900/50 border-slate-800 text-white md:col-span-1 h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Work Image & Rate</CardTitle>
                    <CardDescription className="text-slate-400">Upload a photo of your actual completed work, and optionally specify a price / rate for it.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Work Photo</Label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden bg-slate-950 relative group"
                      >
                        {newGalleryImage.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={newGalleryImage.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-slate-600 group-hover:text-indigo-400 transition-colors mb-2" />
                            <span className="text-xs text-slate-500 font-medium">Click to select photo</span>
                            <span className="text-[10px] text-slate-600 mt-1">PNG, JPG, WEBP (Compressed)</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleGalleryImageChange} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="img-alt">Description / Caption</Label>
                      <Input 
                        id="img-alt" 
                        value={newGalleryImage.altText}
                        onChange={e => setNewGalleryImage(prev => ({ ...prev, altText: e.target.value }))}
                        placeholder="e.g. Living Room Polish Finish"
                        className="bg-slate-950 border-slate-800 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="img-price">Price / Rate (PKR) <span className="text-[10px] text-slate-400">(Optional)</span></Label>
                        <Input 
                          id="img-price" 
                          type="number"
                          value={newGalleryImage.price}
                          onChange={e => setNewGalleryImage(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="e.g. 150"
                          className="bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit <span className="text-[10px] text-slate-400">(Optional)</span></Label>
                        <Select 
                          value={newGalleryImage.unit}
                          onValueChange={val => setNewGalleryImage(prev => ({ ...prev, unit: val }))}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="sqft">Per Sq. Ft.</SelectItem>
                            <SelectItem value="sqmeter">Per Sq. Meter</SelectItem>
                            <SelectItem value="rft">Per RFT</SelectItem>
                            <SelectItem value="piece">Per Piece</SelectItem>
                            <SelectItem value="job">Fixed Cost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleAddGalleryImage} 
                      disabled={!newGalleryImage.image}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 disabled:opacity-50"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Showcase Photo
                    </Button>
                  </CardFooter>
                </Card>

                {/* Display Gallery Showcase */}
                <Card className="bg-slate-900/50 border-slate-800 text-white md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Showcase Gallery</CardTitle>
                    <CardDescription className="text-slate-400">Showcase your best construction & polishing projects, complete with custom rates for transparency.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gallery.length === 0 ? (
                      <div className="border border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500 italic">
                        No work photos uploaded yet. Upload beautiful pictures of your previous sites to gain trust!
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {gallery.map(img => (
                          <div 
                            key={img.id} 
                            className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group hover:border-slate-700 transition-colors relative"
                          >
                            <div className="relative aspect-video w-full bg-slate-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleDeleteGalleryImage(img.id)}
                                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-xs font-semibold text-slate-200 truncate">{img.altText || "Work sample"}</p>
                              {img.price ? (
                                <p className="text-[10px] font-mono text-indigo-400 font-bold">
                                  Rs. {img.price} / {
                                    img.unit === 'sqft' ? 'Sq. Ft.' :
                                    img.unit === 'sqmeter' ? 'Sq. Meter' :
                                    img.unit === 'rft' ? 'RFT' :
                                    img.unit === 'piece' ? 'Piece' : 'Fixed Cost'
                                  }
                                </p>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">No custom rate</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 mt-auto flex flex-col items-center justify-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 relative flex items-center justify-center rounded-full overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
            <Icons.logo alt="Stone Expert Logo" className="object-contain h-full w-full p-0.5" />
          </div>
          <span className="font-headline text-lg font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
        </Link>
        <p>© 2026 Stone Expert Solutions. All rights reserved. Managed Secure Dashboard.</p>
      </footer>
    </div>
  );
}
