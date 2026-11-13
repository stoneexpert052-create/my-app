'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateHomepageContent, getHomepageContent } from '@/lib/admin-actions';
import Image from 'next/image';
import { Loader2, PlusCircle, Trash2, Upload, Camera, X, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import fallbackContent from '@/lib/homepage-content.json';

type GalleryItem = {
  id: string;
  before: string;
  after: string;
  description: string;
};

export default function HomepageSettingsPage() {
  const [heroHeadingEn, setHeroHeadingEn] = useState('');
  const [heroSubheadingEn, setHeroSubheadingEn] = useState('');
  const [heroHeadingUr, setHeroHeadingUr] = useState('');
  const [heroSubheadingUr, setHeroSubheadingUr] = useState('');

  const [headingEn, setHeadingEn] = useState('');
  const [subheadingEn, setSubheadingEn] = useState('');
  const [headingUr, setHeadingUr] = useState('');
  const [subheadingUr, setSubheadingUr] = useState('');
  
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamTarget, setWebcamTarget] = useState<{ itemId: string, field: 'before' | 'after'} | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    async function loadContent() {
      setIsLoading(true);
      const result = await getHomepageContent();
      if (result.success) {
        const content = result.content || fallbackContent;
        setHeroHeadingEn(content.hero?.en?.heading || 'Discover Marble & Construction Solutions');
        setHeroSubheadingEn(content.hero?.en?.subheading || "Pakistan's first fully quoting institution, located conveniently for you, where you can create quotes yourself and compare them with other materials.");
        setHeroHeadingUr(content.hero?.ur?.heading || 'ڈسکور ماربل اینڈ کنسٹرکشن سلوشنز');
        setHeroSubheadingUr(content.hero?.ur?.subheading || 'پاکستان کا پہلا مکمل کوٹیشن فراہم کرنے والا ادارہ، جو آپ کے لیے آسان جگہ پر واقع ہے، جہاں آپ خود کوٹیشن بنا سکتے ہیں اور دوسرے مواد کے ساتھ ان کا موازنہ کر سکتے ہیں۔');
        
        setHeadingEn(content.buildWithUs?.en?.heading || fallbackContent.buildWithUs.en.heading);
        setSubheadingEn(content.buildWithUs?.en?.subheading || fallbackContent.buildWithUs.en.subheading);
        setHeadingUr(content.buildWithUs?.ur?.heading || fallbackContent.buildWithUs.ur.heading);
        setSubheadingUr(content.buildWithUs?.ur?.subheading || fallbackContent.buildWithUs.ur.subheading);
        
        const galleryList = content.buildWithUs?.gallery || fallbackContent.buildWithUs.gallery || [];
        setGallery(galleryList.map((g: any, i: number) => ({...g, id: g.id || `gallery-item-${i}-${Date.now()}`})));
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to load content',
          description: (result as any).error || 'An error occurred',
        });
      }
      setIsLoading(false);
    }
    loadContent();
  }, [toast]);
  
  const handleGalleryChange = (index: number, field: 'description', value: string) => {
    const newGallery = [...gallery];
    newGallery[index] = { ...newGallery[index], [field]: value };
    setGallery(newGallery);
  };
  
  const handleAddPair = () => {
    setGallery([...gallery, {
      id: `new-pair-${Date.now()}`,
      before: 'https://picsum.photos/seed/new-before/600/400',
      after: 'https://picsum.photos/seed/new-after/600/400',
      description: 'New Project Description'
    }]);
  };
  
  const handleDeletePair = (index: number) => {
    const itemToDelete = gallery[index];
    const newGallery = gallery.filter((_, i) => i !== index);
    setGallery(newGallery);

    // Clean up file previews if any
    const newPreviews = {...filePreviews};
    delete newPreviews[`before_${itemToDelete.id}`];
    delete newPreviews[`after_${itemToDelete.id}`];
    setFilePreviews(newPreviews);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, itemId: string, field: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      setFilePreviews(prev => ({...prev, [`${field}_${itemId}`]: URL.createObjectURL(file)}));
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    toast({ title: 'Saving changes...' });

    const formData = new FormData();
    formData.append('heroHeadingEn', heroHeadingEn);
    formData.append('heroSubheadingEn', heroSubheadingEn);
    formData.append('heroHeadingUr', heroHeadingUr);
    formData.append('heroSubheadingUr', heroSubheadingUr);
    formData.append('headingEn', headingEn);
    formData.append('subheadingEn', subheadingEn);
    formData.append('headingUr', headingUr);
    formData.append('subheadingUr', subheadingUr);
    formData.append('galleryData', JSON.stringify(gallery));

    // Append file objects from refs
    gallery.forEach(item => {
      const beforeInput = fileInputRefs.current[`before_${item.id}`];
      if (beforeInput && beforeInput.files?.[0]) {
        formData.append(`before_${item.id}`, beforeInput.files[0]);
      }
      const afterInput = fileInputRefs.current[`after_${item.id}`];
      if (afterInput && afterInput.files?.[0]) {
        formData.append(`after_${item.id}`, afterInput.files[0]);
      }
    });

    const result = await updateHomepageContent(formData);

    if (result.success) {
      toast({ title: 'Homepage Content Updated!', description: 'Your changes have been saved successfully.' });
      if(result.updatedContent) {
        setGallery(result.updatedContent.buildWithUs.gallery);
        setFilePreviews({}); // Clear previews after successful save
      }
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }

    setIsSaving(false);
  };
  
  const openWebcam = async (itemId: string, field: 'before' | 'after') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasCameraPermission(true);
      setWebcamTarget({ itemId, field });
      setIsWebcamOpen(true);
    } catch (error) {
      setHasCameraPermission(false);
      setIsWebcamOpen(true); // Open anyway to show the error alert
      setWebcamTarget({ itemId, field });
    }
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
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };
  
  const captureAndSetImage = () => {
    if (webcamRef.current && webcamTarget) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const file = dataURLtoFile(imageSrc, `webcam-${Date.now()}.jpg`);
        const { itemId, field } = webcamTarget;
        
        if(file) {
          const dt = new DataTransfer();
          dt.items.add(file);
          const fileInput = fileInputRefs.current[`${field}_${itemId}`];
          if(fileInput) {
            fileInput.files = dt.files;
          }
          setFilePreviews(prev => ({...prev, [`${field}_${itemId}`]: imageSrc}));
        }
      }
      setIsWebcamOpen(false);
      setWebcamTarget(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Homepage Settings</CardTitle>
          <CardDescription>Manage the main hero banner text and the content of the "Build With Us" section on your homepage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Tabs defaultValue="english">
            <TabsList>
              <TabsTrigger value="english">English Content</TabsTrigger>
              <TabsTrigger value="urdu">Urdu Content</TabsTrigger>
            </TabsList>
            <TabsContent value="english" className="mt-6 space-y-6">
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium text-foreground">Main Hero Banner</h3>
                <div className="space-y-2">
                  <Label htmlFor="heroHeadingEn">Hero Main Header (English)</Label>
                  <Input id="heroHeadingEn" value={heroHeadingEn} onChange={(e) => setHeroHeadingEn(e.target.value)} placeholder="Discover Marble & Construction Solutions" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubheadingEn">Hero Subheading (English)</Label>
                  <Textarea id="heroSubheadingEn" value={heroSubheadingEn} onChange={(e) => setHeroSubheadingEn(e.target.value)} rows={3} placeholder="Explore our exclusive collection..." />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">"Build With Us" Section</h3>
                <div className="space-y-2">
                  <Label htmlFor="headingEn">Section Heading</Label>
                  <Input id="headingEn" value={headingEn} onChange={(e) => setHeadingEn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subheadingEn">Section Subheading</Label>
                  <Textarea id="subheadingEn" value={subheadingEn} onChange={(e) => setSubheadingEn(e.target.value)} rows={4} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="urdu" className="mt-6 space-y-6">
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium text-foreground text-right">مین ہیرو بینر</h3>
                <div className="space-y-2">
                  <Label htmlFor="heroHeadingUr" className="text-right w-full block">مین ہیرو ہیڈنگ (اردو)</Label>
                  <Input id="heroHeadingUr" value={heroHeadingUr} onChange={(e) => setHeroHeadingUr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubheadingUr" className="text-right w-full block">مین ہیرو سب ہیڈنگ (اردو)</Label>
                  <Textarea id="heroSubheadingUr" value={heroSubheadingUr} onChange={(e) => setHeroSubheadingUr(e.target.value)} rows={3} dir="rtl" />
                </div>
              </div>

              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium text-foreground text-right">"ہمارے ساتھ تعمیر کریں" سیکشن</h3>
                <div className="space-y-2">
                  <Label htmlFor="headingUr" className="text-right w-full block">سیکشن ہیڈنگ</Label>
                  <Input id="headingUr" value={headingUr} onChange={(e) => setHeadingUr(e.target.value)} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subheadingUr" className="text-right w-full block">سیکشن سب ہیڈنگ</Label>
                  <Textarea id="subheadingUr" value={subheadingUr} onChange={(e) => setSubheadingUr(e.target.value)} rows={4} dir="rtl"/>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-6 border-t">
            <Label className="text-lg font-semibold">Before &amp; After Gallery</Label>
            <ScrollArea>
              <div className="flex space-x-6 pb-4">
                {gallery.map((item, index) => (
                  <Card key={item.id} className="w-[400px] shrink-0">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                         <CardTitle className="text-base">Pair {index + 1}</CardTitle>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePair(index)}>
                          <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                       <Input 
                          placeholder="Project Description"
                          value={item.description}
                          onChange={(e) => handleGalleryChange(index, 'description', e.target.value)}
                        />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Before</Label>
                        <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
                           <Image src={filePreviews[`before_${item.id}`] || item.before} alt={`Before image for ${item.description}`} fill className="object-cover" />
                        </div>
                        <Input type="file" className="hidden" ref={el => { fileInputRefs.current[`before_${item.id}`] = el; }} onChange={(e) => handleFileChange(e, item.id, 'before')} accept="image/*" />
                        <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => fileInputRefs.current[`before_${item.id}`]?.click()}><Upload className="h-4 w-4 mr-2"/>Upload</Button>
                            <Button size="sm" variant="secondary" className="flex-1" onClick={() => openWebcam(item.id, 'before')}><Camera className="h-4 w-4 mr-2"/>Camera</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>After</Label>
                        <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
                           <Image src={filePreviews[`after_${item.id}`] || item.after} alt={`After image for ${item.description}`} fill className="object-cover" />
                        </div>
                        <Input type="file" className="hidden" ref={el => { fileInputRefs.current[`after_${item.id}`] = el; }} onChange={(e) => handleFileChange(e, item.id, 'after')} accept="image/*"/>
                        <div className="flex gap-1">
                             <Button size="sm" variant="outline" className="flex-1" onClick={() => fileInputRefs.current[`after_${item.id}`]?.click()}><Upload className="h-4 w-4 mr-2"/>Upload</Button>
                             <Button size="sm" variant="secondary" className="flex-1" onClick={() => openWebcam(item.id, 'after')}><Camera className="h-4 w-4 mr-2"/>Camera</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                 <Button variant="outline" className="h-full w-24 flex-col gap-2 shrink-0" onClick={handleAddPair}>
                  <PlusCircle />
                  Add Pair
                </Button>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
      
       <Dialog open={isWebcamOpen} onOpenChange={setIsWebcamOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Capture Image from Webcam</DialogTitle>
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
            <DialogFooter>
                 <Button variant="outline" onClick={() => setIsWebcamOpen(false)}>Cancel</Button>
                 <Button onClick={captureAndSetImage} disabled={!hasCameraPermission}>
                    <Camera className="mr-2 h-4 w-4" /> Capture & Use
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
