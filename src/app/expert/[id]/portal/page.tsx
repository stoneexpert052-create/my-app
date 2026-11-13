'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getServiceProviderById, 
  updateServiceProvider, 
  addProviderGalleryImage, 
  deleteProviderGalleryImage,
  getHomepageConfig
} from '@/lib/admin-actions';
import type { ServiceProvider, ProviderJob, GalleryImage } from '@/lib/types';
import { 
  Phone, 
  ArrowLeft, 
  Star, 
  FolderGit2, 
  Coins, 
  Calendar, 
  Loader2, 
  Briefcase, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  User, 
  Sparkles,
  Info,
  Wrench,
  Camera,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';

export default function ExpertPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Loading Expert Portal...</span>
      </div>
    }>
      <ExpertPortalContent />
    </Suspense>
  );
}

function ExpertPortalContent() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [activeTab, setActiveTab] = useState<'info-rates' | 'portfolio'>('info-rates');

  // Form states for profile edit
  const [profileForm, setProfileForm] = useState({
    name: '',
    service: '',
    phone: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
  });

  // Profile image upload state
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>('');

  // Form states for adding jobs
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobPrice, setNewJobPrice] = useState('');
  const [newJobUnit, setNewJobUnit] = useState<'sqft' | 'sqmeter' | 'rft' | 'piece' | 'job'>('sqft');

  // Form states for adding portfolio images
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioPrice, setPortfolioPrice] = useState('');
  const [portfolioUnit, setPortfolioUnit] = useState('Square feet');
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [portfolioPreview, setPortfolioPreview] = useState<string>('');

  // Saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const [serviceTypes, setServiceTypes] = useState<string[]>([
    "Marble & Tile Fixing",
    "Marble Polishing",
    "Kitchen & Bathroom Vanities",
    "Stone Carving & Inlay Work",
    "Façade Stone Masonry"
  ]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getServiceProviderById(id);
        if (data) {
          setProvider(data);
          setProfileForm({
            name: data.name || '',
            service: data.service || 'Marble & Tile Fixing',
            phone: data.phone || '',
            whatsapp: data.socials?.whatsapp || '',
            facebook: data.socials?.facebook || '',
            instagram: data.socials?.instagram || '',
          });
          setProfilePreview(data.imageUrl || '');
        }

        const homeConfig = await getHomepageConfig();
        if (homeConfig && homeConfig.serviceTypes) {
          setServiceTypes(homeConfig.serviceTypes);
        }
      } catch (err) {
        console.error("Error loading provider for portal:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">Authenticating Portal Link...</span>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <Badge variant="destructive" className="px-3 py-1 text-xs">Access Denied</Badge>
          <h2 className="text-2xl font-bold tracking-tight">Portal Link Expired or Invalid</h2>
          <p className="text-slate-400 text-sm">
            This workspace portal is secure. If you are an over-expert team member, please request a new management update link from the Stone Expert Rawalpindi Administrator.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Handle Profile Form Submitting
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.phone) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Name and Phone number are required fields.' });
      return;
    }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('id', provider.id);
      formData.append('name', profileForm.name);
      formData.append('service', profileForm.service);
      formData.append('phone', profileForm.phone);
      formData.append('status', provider.status || 'active');
      formData.append('rating', String(provider.rating || 5));
      formData.append('whatsapp', profileForm.whatsapp);
      formData.append('facebook', profileForm.facebook);
      formData.append('instagram', profileForm.instagram);
      formData.append('jobs', JSON.stringify(provider.jobs || []));
      formData.append('gallery', JSON.stringify(provider.gallery || []));
      
      if (profileFile) {
        formData.append('image', profileFile);
      } else if (provider.imageUrl) {
        formData.append('imageUrl', provider.imageUrl);
      }

      const result = await updateServiceProvider(formData);
      if (result.success && result.updatedProvider) {
        setProvider(result.updatedProvider);
        setProfileFile(null);
        toast({ title: 'Profile Updated Successfully', description: 'Your basic expert profile details and rates have been saved.' });
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Something went wrong.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Add a Job Rate Row helper
  const handleAddJobHelper = () => {
    if (!newJobTitle.trim() || !newJobPrice) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Please enter job title and rate.' });
      return;
    }
    const priceNum = Number(newJobPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Rate', description: 'Rate must be a positive number.' });
      return;
    }

    const newJob: ProviderJob = {
      id: `job-${Date.now()}`,
      title: newJobTitle.trim(),
      price: priceNum,
      unit: newJobUnit
    };

    setProvider(prev => {
      if (!prev) return null;
      const updatedJobs = [...(prev.jobs || []), newJob];
      
      // Auto-update database with new jobs board
      setTimeout(() => triggerDirectSave(updatedJobs, prev.gallery || []), 50);
      return { ...prev, jobs: updatedJobs };
    });

    setNewJobTitle('');
    setNewJobPrice('');
    toast({ title: 'Service Rate Added', description: 'Your job rate board draft is saved automatically.' });
  };

  // Delete Job Rate helper
  const handleDeleteJobHelper = (jobId: string) => {
    setProvider(prev => {
      if (!prev) return null;
      const updatedJobs = (prev.jobs || []).filter(j => j.id !== jobId);
      
      setTimeout(() => triggerDirectSave(updatedJobs, prev.gallery || []), 50);
      return { ...prev, jobs: updatedJobs };
    });
    toast({ title: 'Service Rate Removed' });
  };

  // Trigger quick merge update back to DB for simple list modifications
  const triggerDirectSave = async (jobs: ProviderJob[], gallery: GalleryImage[]) => {
    const formData = new FormData();
    formData.append('id', provider.id);
    formData.append('name', profileForm.name);
    formData.append('service', profileForm.service);
    formData.append('phone', profileForm.phone);
    formData.append('status', provider.status || 'active');
    formData.append('rating', String(provider.rating || 5));
    formData.append('whatsapp', profileForm.whatsapp);
    formData.append('facebook', profileForm.facebook);
    formData.append('instagram', profileForm.instagram);
    formData.append('jobs', JSON.stringify(jobs));
    formData.append('gallery', JSON.stringify(gallery));
    if (provider.imageUrl) {
      formData.append('imageUrl', provider.imageUrl);
    }
    await updateServiceProvider(formData);
  };

  // Handle Portfolio photo upload
  const handleUploadPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioFile || !portfolioTitle) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please choose an image and write a title.' });
      return;
    }

    setUploadingPortfolio(true);
    try {
      const formData = new FormData();
      formData.append('providerId', provider.id);
      formData.append('image', portfolioFile);
      formData.append('title', portfolioTitle);
      if (portfolioPrice) {
        formData.append('price', portfolioPrice);
      }
      formData.append('unit', portfolioUnit);

      const result = await addProviderGalleryImage(formData);
      if (result.success && result.newImage) {
        const newImage = result.newImage;
        setProvider(prev => prev ? { ...prev, gallery: [...(prev.gallery || []), newImage] } : null);
        
        // Reset portfolio form
        setPortfolioTitle('');
        setPortfolioPrice('');
        setPortfolioFile(null);
        setPortfolioPreview('');
        toast({ title: 'Project Added Successfully', description: 'Your new work sample has been added to your public portfolio page.' });
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Error', description: err.message || 'Error occurred.' });
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Delete portfolio image
  const handleDeletePortfolioImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      const result = await deleteProviderGalleryImage(provider.id, imageId);
      if (result.success) {
        setProvider(prev => prev ? { ...prev, gallery: (prev.gallery || []).filter(img => img.id !== imageId) } : null);
        toast({ title: 'Portfolio Work Deleted' });
      } else {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Error occurred.' });
    } finally {
      setDeletingImageId(null);
    }
  };

  // Profile image local file pick
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  // Portfolio local file pick
  const handlePortfolioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPortfolioFile(file);
      setPortfolioPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <div className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-lg text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Expert Partner Work Panel</h1>
              <p className="text-[10px] text-slate-400">Manage Your Work Catalog, Rates & Bio</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-slate-800 text-slate-200 text-xs h-9 gap-1.5 rounded-full">
            <Link href={`/expert/${provider.id}`} target="_blank">
              <span>View Public Profile</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Helper Banner for Teams */}
        <Card className="bg-gradient-to-r from-indigo-950/20 to-slate-900 border-indigo-900/40">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start gap-3 text-xs text-indigo-300">
            <Info className="h-5 w-5 shrink-0 text-indigo-400" />
            <div className="space-y-1">
              <p className="font-bold text-slate-200">How to use your Expert Portal</p>
              <p className="text-slate-400">
                Any updates you submit here will instantly go live on your official public profile. You can showcase recent work photos, specify your wholesale or fixed labor rates, and upload direct links so clients can call or chat on WhatsApp with you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tab selection */}
        <div className="flex border-b border-slate-900 gap-6">
          <button 
            onClick={() => setActiveTab('info-rates')}
            className={`pb-3.5 text-xs font-semibold relative transition-colors ${activeTab === 'info-rates' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {activeTab === 'info-rates' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" /> Profile Info & Services Rates
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`pb-3.5 text-xs font-semibold relative transition-colors ${activeTab === 'portfolio' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {activeTab === 'portfolio' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
            <span className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4" /> Work Portfolio & Daily Updates
            </span>
          </button>
        </div>

        {/* Tabs Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'info-rates' ? (
            <motion.div 
              key="info-rates-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Profile Details Edit Card */}
              <div className="lg:col-span-2">
                <Card className="bg-slate-900/40 border-slate-900">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Edit Basic Profile Details</CardTitle>
                    <CardDescription className="text-xs">Update your team name, logo, contact credentials, and category specialty.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      
                      {/* Avatar Picker */}
                      <div>
                        <Label className="text-xs font-semibold text-slate-300">Profile / Avatar Picture</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="relative h-16 w-16 rounded-full border border-slate-800 bg-slate-950 overflow-hidden shrink-0">
                            {profilePreview ? (
                              <Image src={profilePreview} alt="Preview" fill className="object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs">SP</div>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => profilePicRef.current?.click()}
                              className="border-slate-800 text-slate-200 text-xs h-8"
                            >
                              <Upload className="mr-1.5 h-3.5 w-3.5" />
                              Upload Custom Image
                            </Button>
                            <p className="text-[10px] text-slate-500">Pick a clear photo of your team logo or lead expert.</p>
                          </div>
                          <input 
                            type="file" 
                            ref={profilePicRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleProfilePicChange} 
                          />
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="prof-name">Team / Business Name *</Label>
                          <Input 
                            id="prof-name" 
                            value={profileForm.name} 
                            onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-slate-950 border-slate-800 h-9 text-xs focus:border-indigo-500 text-white" 
                            required 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prof-specialty">Expert Specialty Category</Label>
                          <select
                            id="prof-specialty"
                            value={profileForm.service}
                            onChange={e => setProfileForm(prev => ({ ...prev, service: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-3 text-white focus:border-indigo-500"
                          >
                            {serviceTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prof-phone">Direct Call Number *</Label>
                          <Input 
                            id="prof-phone" 
                            placeholder="e.g., 03001234567"
                            value={profileForm.phone} 
                            onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="bg-slate-950 border-slate-800 h-9 text-xs focus:border-indigo-500 text-white font-mono" 
                            required 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prof-wa">WhatsApp Number (For Direct Chats) *</Label>
                          <Input 
                            id="prof-wa" 
                            placeholder="e.g., 923001234567"
                            value={profileForm.whatsapp} 
                            onChange={e => setProfileForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                            className="bg-slate-950 border-slate-800 h-9 text-xs focus:border-indigo-500 text-white font-mono" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prof-fb">Facebook Profile URL (Optional)</Label>
                          <Input 
                            id="prof-fb" 
                            placeholder="e.g., https://facebook.com/myteam"
                            value={profileForm.facebook} 
                            onChange={e => setProfileForm(prev => ({ ...prev, facebook: e.target.value }))}
                            className="bg-slate-950 border-slate-800 h-9 text-xs focus:border-indigo-500 text-white" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="prof-inst">Instagram Profile URL (Optional)</Label>
                          <Input 
                            id="prof-inst" 
                            placeholder="e.g., https://instagram.com/myteam"
                            value={profileForm.instagram} 
                            onChange={e => setProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                            className="bg-slate-950 border-slate-800 h-9 text-xs focus:border-indigo-500 text-white" 
                          />
                        </div>

                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-500 h-9 text-xs font-semibold">
                          {savingProfile ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                          Save Profile Changes
                        </Button>
                      </div>

                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Jobs & Labor Rates Management Board */}
              <div className="lg:col-span-1">
                <Card className="bg-slate-900/40 border-slate-900 h-full flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <Coins className="h-4 w-4" />
                      <CardTitle className="text-sm font-bold text-white">Labor Rates Board</CardTitle>
                    </div>
                    <CardDescription className="text-[11px]">List your standard fixing or polishing charges so customers see them.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    
                    {/* Jobs List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {(!provider.jobs || provider.jobs.length === 0) ? (
                        <div className="text-center py-8 rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs italic">
                          No rates listed. Add your services rates below.
                        </div>
                      ) : (
                        provider.jobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-900 hover:border-slate-800 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate text-slate-200">{job.title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Rs. <span className="font-mono font-bold text-emerald-400">{job.price}</span> / {
                                  job.unit === 'sqft' ? 'Sq. Ft.' :
                                  job.unit === 'sqmeter' ? 'Sq. Meter' :
                                  job.unit === 'rft' ? 'RFT' :
                                  job.unit === 'piece' ? 'Piece' : 'Job'
                                }
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10" 
                              onClick={() => handleDeleteJobHelper(job.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    <Separator className="bg-slate-900" />

                    {/* Quick Add Form */}
                    <div className="space-y-3 pt-1">
                      <h4 className="text-[11px] font-bold text-indigo-300">Add New Labor / Service Rate</h4>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="job-title" className="text-[10px]">Service or Item Title</Label>
                        <Input 
                          id="job-title" 
                          placeholder="e.g., Ziarat White Fixing" 
                          value={newJobTitle}
                          onChange={e => setNewJobTitle(e.target.value)}
                          className="bg-slate-950 border-slate-800 h-8 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1.5">
                          <Label htmlFor="job-price" className="text-[10px]">Rate (PKR)</Label>
                          <Input 
                            id="job-price" 
                            type="number"
                            placeholder="e.g., 60" 
                            value={newJobPrice}
                            onChange={e => setNewJobPrice(e.target.value)}
                            className="bg-slate-950 border-slate-800 h-8 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="job-unit" className="text-[10px]">Rate Unit</Label>
                          <select
                            id="job-unit"
                            value={newJobUnit}
                            onChange={(e: any) => setNewJobUnit(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-[11px] h-8 rounded-md px-2 text-white focus:border-indigo-500"
                          >
                            <option value="sqft">Per Sq. Ft.</option>
                            <option value="sqmeter">Per Sq. Meter</option>
                            <option value="rft">Per RFT</option>
                            <option value="piece">Per Piece</option>
                            <option value="job">Fixed Cost</option>
                          </select>
                        </div>
                      </div>

                      <Button 
                        type="button" 
                        onClick={handleAddJobHelper} 
                        className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 h-8 text-xs font-semibold"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add Rate Rule
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="portfolio-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Upload portfolio item form */}
              <div className="lg:col-span-1">
                <Card className="bg-slate-900/40 border-slate-900">
                  <CardHeader>
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <FolderGit2 className="h-4 w-4" />
                      <CardTitle className="text-sm font-bold text-white">Upload Work Photo</CardTitle>
                    </div>
                    <CardDescription className="text-[11px]">Showcase custom marble polishing, stairs, or bathrooms you have completed.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUploadPortfolioItem} className="space-y-4">
                      
                      {/* Photo selector box */}
                      <div>
                        <Label className="text-[10px] text-slate-400">Completed Work Image *</Label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-1 border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 rounded-xl aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden relative group"
                        >
                          {portfolioPreview ? (
                            <Image src={portfolioPreview} alt="Work preview" fill className="object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <>
                              <div className="p-2.5 rounded-full bg-slate-900 text-slate-400 group-hover:text-indigo-400 transition-colors">
                                <Upload className="h-4 w-4" />
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Select finished photo</span>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          required
                          onChange={handlePortfolioFileChange} 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="port-title" className="text-xs">Project Title / Work Name *</Label>
                        <Input 
                          id="port-title" 
                          placeholder="e.g., Sunni Grey Staircase Polishing" 
                          value={portfolioTitle}
                          onChange={e => setPortfolioTitle(e.target.value)}
                          className="bg-slate-950 border-slate-800 h-9 text-xs text-white focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1.5">
                          <Label htmlFor="port-price" className="text-xs">Rate (PKR / Optional)</Label>
                          <Input 
                            id="port-price" 
                            type="number"
                            placeholder="e.g., 140" 
                            value={portfolioPrice}
                            onChange={e => setPortfolioPrice(e.target.value)}
                            className="bg-slate-950 border-slate-800 h-9 text-xs text-white focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="port-unit" className="text-xs">Pricing Unit</Label>
                          <select
                            id="port-unit"
                            value={portfolioUnit}
                            onChange={e => setPortfolioUnit(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-xs h-9 rounded-md px-2 text-white focus:border-indigo-500"
                          >
                            <option value="Square feet">Square feet (sq.ft)</option>
                            <option value="Square meters">Square meters (sq.m)</option>
                            <option value="Running feet">Running feet (RFT)</option>
                            <option value="Piece">Piece (pc)</option>
                            <option value="Full Job">Full Job</option>
                          </select>
                        </div>
                      </div>

                      <Button type="submit" disabled={uploadingPortfolio} className="w-full bg-indigo-600 hover:bg-indigo-500 h-9 text-xs font-semibold mt-2">
                        {uploadingPortfolio ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                        Add Work Portfolio Image
                      </Button>

                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Portfolio Grid list */}
              <div className="lg:col-span-2">
                <Card className="bg-slate-900/40 border-slate-900">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Your Portfolio Projects</CardTitle>
                    <CardDescription className="text-xs">These images are showcased in the gallery grid on your profile card.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!provider.gallery || provider.gallery.length === 0) ? (
                      <div className="text-center py-20 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs italic">
                        No portfolio images. Use the upload box on the left to add completed works.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {provider.gallery.map((image) => (
                          <div key={image.id} className="relative rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden flex flex-col group">
                            
                            {/* Image Aspect Box */}
                            <div className="relative aspect-video w-full bg-slate-900">
                              <Image src={image.url} alt={image.altText} fill className="object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                              
                              {/* Overlay Delete Button */}
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                disabled={deletingImageId === image.id}
                                onClick={() => handleDeletePortfolioImage(image.id)}
                                className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg shadow-black/40 hover:scale-105 transition-transform"
                              >
                                {deletingImageId === image.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* Caption Detail */}
                            <div className="p-3 space-y-1.5">
                              <h4 className="text-xs font-bold text-slate-200 truncate">{image.altText}</h4>
                              {image.price && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-900/60 text-[10px]">
                                  <span className="text-slate-500 uppercase font-mono">Quoted rate</span>
                                  <span className="font-bold text-emerald-400 font-mono">
                                    Rs. {image.price} <span className="text-slate-500 font-normal">/ {image.unit === 'Square feet' ? 'sqft' : image.unit === 'Square meters' ? 'sqm' : (image.unit || 'sqft').toLowerCase()}</span>
                                  </span>
                                </div>
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

      </div>
    </div>
  );
}
