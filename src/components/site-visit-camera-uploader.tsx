'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  ImagePlus,
  Images,
  SwitchCamera,
  X,
  Trash2,
  Check,
  Loader2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  addSiteVisitPhotos,
  updateSiteVisitPhotoMeta,
  deleteSiteVisitPhoto,
  processImageFile,
  compressDataUrl,
  type SiteVisitPhoto,
  type SiteVisitPhotoCategory
} from '@/lib/admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export const SITE_PHOTO_CATEGORIES: Array<{
  id: SiteVisitPhotoCategory;
  labelEn: string;
  labelUr: string;
}> = [
  { id: 'site-overview', labelEn: 'Site Overview', labelUr: 'سائٹ کا منظر' },
  { id: 'stairs', labelEn: 'Stairs', labelUr: 'سیڑھیاں' },
  { id: 'window-sill', labelEn: 'Window Sills', labelUr: 'کھڑکیاں' },
  { id: 'floor', labelEn: 'Flooring', labelUr: 'فلورنگ' },
  { id: 'feature-wall', labelEn: 'Feature Wall', labelUr: 'فیچر وال' },
  { id: 'kitchen', labelEn: 'Kitchen Top', labelUr: 'کچن کاؤنٹر' },
  { id: 'vanity', labelEn: 'Vanity', labelUr: 'وینٹی' },
  { id: 'material-sample', labelEn: 'Stone Sample', labelUr: 'پتھر سیمپل' },
  { id: 'measurement-proof', labelEn: 'Measurement Proof', labelUr: 'پیمائش ثبوت' }
];

export function getPhotoCategoryLabel(category: SiteVisitPhotoCategory) {
  return SITE_PHOTO_CATEGORIES.find(c => c.id === category) || SITE_PHOTO_CATEGORIES[0];
}

interface PendingCapture {
  tempId: string;
  imageUrl: string;
  category: SiteVisitPhotoCategory;
  caption: string;
  capturedAt: string;
}

interface SiteVisitCameraUploaderProps {
  jobId: string;
  representativeId: string;
  representativeName?: string;
  photos: SiteVisitPhoto[];
  loading?: boolean;
  onPhotosChange: (photos: SiteVisitPhoto[]) => void;
  uploadedBy?: 'representative' | 'admin';
}

export function SiteVisitCameraUploader({
  jobId,
  representativeId,
  representativeName,
  photos,
  loading = false,
  onPhotosChange,
  uploadedBy = 'representative'
}: SiteVisitCameraUploaderProps) {
  const { toast } = useToast();

  // File input refs (native OS camera + multi-photo gallery picker)
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryMultiInputRef = useRef<HTMLInputElement | null>(null);

  // Live WebRTC camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SiteVisitPhotoCategory>('site-overview');
  const [pendingCaptures, setPendingCaptures] = useState<PendingCapture[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Upload & edit states
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [editingCaptions, setEditingCaptions] = useState<Record<string, string>>({});
  const [savingMetaId, setSavingMetaId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Lightbox viewer state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCameraStream = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCameraStream();
      setCameraError(null);
      setCameraReady(false);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          'اس براؤزر میں لائیو کیمرہ اسٹریمنگ دستیاب نہیں۔ نیچے دیے گئے "فون کیمرہ" بٹن سے براہِ راست تصاویر کھینچیں۔'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (err: any) {
        const msg = err?.name === 'NotAllowedError'
          ? 'کیمرہ کی اجازت نہیں ملی (Camera permission denied)۔ براؤزر میں اجازت دیں یا نیچے "فون کیمرہ" استعمال کریں۔'
          : 'ڈیوائس کیمرہ شروع نہیں ہو سکا۔ نیچے "فون کیمرہ" بٹن سے تصویر کھینچیں۔';
        setCameraError(msg);
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (isCameraOpen) {
      void startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isCameraOpen, facingMode, startCameraStream, stopCameraStream]);

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCaptureFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 160);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const compressedUrl = await compressDataUrl(rawDataUrl, 960, 960, 0.62);

    setPendingCaptures(prev => [
      ...prev,
      {
        tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        imageUrl: compressedUrl,
        category: selectedCategory,
        caption: '',
        capturedAt: new Date().toISOString()
      }
    ]);
  };

  const handleSavePendingCaptures = async () => {
    if (pendingCaptures.length === 0) return;
    setUploading(true);
    setUploadProgressText(`Saving ${pendingCaptures.length} photos...`);

    try {
      const res = await addSiteVisitPhotos(
        pendingCaptures.map(p => ({
          jobId,
          representativeId,
          representativeName,
          category: p.category,
          caption: p.caption,
          imageUrl: p.imageUrl,
          capturedAt: p.capturedAt,
          uploadedBy
        }))
      );

      if (res.success && res.photos) {
        onPhotosChange([...res.photos, ...photos]);
        setPendingCaptures([]);
        setIsCameraOpen(false);
        toast({
          title: `${res.photos.length} سائٹ تصاویر محفوظ ہو گئیں!`,
          description: 'بل کی تصدیق (Billing Verification) کے لیے تصاویر ایڈمن پینل سے سنک ہو گئی ہیں۔'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'تصاویر محفوظ نہیں ہو سکیں',
          description: res.error || 'دوبارہ کوشش کریں۔'
        });
      }
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast({
        variant: 'destructive',
        title: 'صرف تصاویر منتخب کریں',
        description: 'Please select valid image files.'
      });
      return;
    }

    setUploading(true);
    setUploadProgressText(`Compressing ${fileArray.length} photo(s)...`);

    try {
      const compressedPayload: Array<{
        jobId: string;
        representativeId: string;
        representativeName?: string;
        category: SiteVisitPhotoCategory;
        caption?: string;
        imageUrl: string;
        capturedAt: string;
        uploadedBy: 'representative' | 'admin';
      }> = [];

      for (let i = 0; i < fileArray.length; i++) {
        setUploadProgressText(`Processing ${i + 1} / ${fileArray.length}...`);
        const compressed = await processImageFile(fileArray[i], 960, 960, 0.62);
        compressedPayload.push({
          jobId,
          representativeId,
          representativeName,
          category: selectedCategory,
          caption: '',
          imageUrl: compressed,
          capturedAt: new Date(Date.now() + i).toISOString(),
          uploadedBy
        });
      }

      setUploadProgressText(`Uploading ${compressedPayload.length} photo(s)...`);
      const res = await addSiteVisitPhotos(compressedPayload);
      if (res.success && res.photos) {
        onPhotosChange([...res.photos, ...photos]);
        toast({
          title: `${res.photos.length} سائٹ تصاویر شامل ہو گئیں!`,
          description: 'بل کی تصدیق کے لیے تمام تصاویر محفوظ کر دی گئی ہیں۔'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'اپلوڈ میں خرابی',
          description: res.error || 'دوبارہ کوشش کریں۔'
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'تصویر پراسیس نہیں ہو سکی',
        description: err?.message || 'براہ کرم دوبارہ کوشش کریں۔'
      });
    } finally {
      setUploading(false);
      setUploadProgressText('');
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
      if (galleryMultiInputRef.current) galleryMultiInputRef.current.value = '';
    }
  };

  const handleUpdateCategory = async (photo: SiteVisitPhoto, category: SiteVisitPhotoCategory) => {
    setSavingMetaId(photo.id);
    const updated = photos.map(p => (p.id === photo.id ? { ...p, category } : p));
    onPhotosChange(updated);
    await updateSiteVisitPhotoMeta(photo.id, jobId, { category });
    setSavingMetaId(null);
  };

  const handleSaveCaption = async (photo: SiteVisitPhoto) => {
    const nextCaption = (editingCaptions[photo.id] ?? photo.caption ?? '').trim();
    if (nextCaption === (photo.caption || '').trim()) return;
    setSavingMetaId(photo.id);
    const updated = photos.map(p => (p.id === photo.id ? { ...p, caption: nextCaption } : p));
    onPhotosChange(updated);
    await updateSiteVisitPhotoMeta(photo.id, jobId, { caption: nextCaption });
    setSavingMetaId(null);
    toast({ title: 'کیپشن محفوظ ہو گیا' });
  };

  const handleDeletePhoto = async (photo: SiteVisitPhoto) => {
    setDeletingId(photo.id);
    try {
      const res = await deleteSiteVisitPhoto(photo.id, jobId, representativeId);
      if (res.success) {
        const nextList = photos.filter(p => p.id !== photo.id);
        onPhotosChange(nextList);
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        }
        toast({ title: 'تصویر حذف کر دی گئی' });
      } else {
        toast({
          variant: 'destructive',
          title: 'حذف کرنے میں خرابی',
          description: res.error || 'دوبارہ کوشش کریں۔'
        });
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const activeLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:shadow-none">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>سائٹ تصدیقی تصاویر (Billing Verification Photos)</span>
          </CardTitle>
          <CardDescription className="text-xs flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>{photos.length} Site Photos Captured</span>
            <span aria-hidden="true">·</span>
            <span>Auto-compressed & synced to Admin Billing Audit</span>
          </CardDescription>
        </div>

        {/* Camera & Upload Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as SiteVisitPhotoCategory)}
            aria-label="Default site photo category"
            className="h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-xs font-bold"
          >
            {SITE_PHOTO_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.labelEn} ({c.labelUr})
              </option>
            ))}
          </select>

          <Button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            disabled={uploading}
            className="min-h-[44px] px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera (Multi-Shot)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => nativeCameraInputRef.current?.click()}
            className="min-h-[44px] px-3.5 text-xs font-bold gap-1.5 border-amber-500/40 hover:bg-amber-500/10 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4 text-amber-600" />
            <span>Device Camera</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => galleryMultiInputRef.current?.click()}
            className="min-h-[44px] px-3.5 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Images className="w-4 h-4 text-sky-600" />
            <span>Gallery Multi</span>
          </Button>

          {/* Hidden Inputs */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={e => handleFilesSelected(e.target.files)}
          />
          <input
            ref={galleryMultiInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFilesSelected(e.target.files)}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {uploading && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3 text-xs font-bold text-amber-800 dark:text-amber-300">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{uploadProgressText || 'تصاویر اپلوڈ ہو رہی ہیں...'}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>سائٹ کی تصاویر لوڈ ہو رہی ہیں...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-3 print:hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                بل کی تصدیق کے لیے سائٹ کی تصاویر کھینچیں
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" dir="rtl">
                سیڑھیوں، کھڑکیوں، فلورنگ، پیمائش کے فیتے (Measuring Tape) اور پتھر کے سیمپل کی متعدد تصاویر براہِ راست کیمرے سے اپلوڈ کریں تاکہ ایڈمن بل کی مکمل تصدیق ہو سکے۔
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="min-h-[44px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>کیمرہ کھولیں (Open Camera)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="min-h-[44px] px-4 text-xs font-bold gap-2 cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" />
                <span>فون کیمرہ / گیلری</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {photos.map((photo, idx) => {
              const catMeta = getPhotoCategoryLabel(photo.category);
              const draftCaption =
                editingCaptions[photo.id] !== undefined
                  ? editingCaptions[photo.id]
                  : photo.caption || '';
              const isCaptionDirty =
                draftCaption.trim() !== (photo.caption || '').trim();
              const capturedTimeStr = photo.capturedAt
                ? new Date(photo.capturedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '';

              return (
                <div
                  key={photo.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden flex flex-col justify-between"
                >
                  {/* Thumbnail + Overlay Metadata */}
                  <div className="relative aspect-[4/3] bg-slate-900 group overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || `${catMeta.labelEn} verification photo`}
                      referrerPolicy="no-referrer"
                      onClick={() => setLightboxIndex(idx)}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2 text-white">
                      <div className="text-[11px] leading-tight min-w-0">
                        <p className="font-bold truncate">{catMeta.labelEn}</p>
                        <p className="text-[10px] text-slate-200 tabular-nums">{capturedTimeStr}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        aria-label="Zoom photo"
                        className="w-8 h-8 rounded-lg bg-black/55 hover:bg-black/80 text-white flex items-center justify-center shrink-0 cursor-pointer print:hidden"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Editor Controls */}
                  <div className="p-2.5 space-y-2 print:p-1.5">
                    <div className="flex items-center gap-1.5 print:hidden">
                      <select
                        value={photo.category}
                        onChange={e =>
                          handleUpdateCategory(photo, e.target.value as SiteVisitPhotoCategory)
                        }
                        className="h-9 flex-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-[11px] font-semibold"
                      >
                        {SITE_PHOTO_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.labelEn} · {c.labelUr}
                          </option>
                        ))}
                      </select>

                      {confirmDeleteId === photo.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={deletingId === photo.id}
                            onClick={() => handleDeletePhoto(photo)}
                            className="h-9 px-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {deletingId === photo.id ? '...' : 'Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-9 px-2 rounded-md border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(photo.id)}
                          aria-label="Delete photo"
                          className="h-9 w-9 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 print:hidden">
                      <Input
                        value={draftCaption}
                        onChange={e =>
                          setEditingCaptions(prev => ({
                            ...prev,
                            [photo.id]: e.target.value
                          }))
                        }
                        onBlur={() => handleSaveCaption(photo)}
                        placeholder="Add verification note (e.g. step width 42 in)..."
                        className="h-8 text-[11px] bg-white dark:bg-slate-900"
                      />
                      {isCaptionDirty && (
                        <button
                          type="button"
                          disabled={savingMetaId === photo.id}
                          onClick={() => handleSaveCaption(photo)}
                          className="h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          title="Save note"
                        >
                          {savingMetaId === photo.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Print caption view */}
                    {photo.caption && (
                      <p className="hidden print:block text-[10px] text-slate-700 leading-tight">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* LIVE MULTI-SHOT CAMERA VIEWFINDER DIALOG */}
      <Dialog
        open={isCameraOpen}
        onOpenChange={open => {
          if (!open && pendingCaptures.length > 0 && !uploading) {
            // Confirm discarding unsaved shots cleanly or keep inside? Allow clean close
            stopCameraStream();
          }
          setIsCameraOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-950 text-white border-slate-800 max-h-[94vh] flex flex-col">
          <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <DialogTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-white">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>سائٹ کیمرہ — متعدد تصاویر (Multi-Shot Site Camera)</span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400 mt-0.5">
                Snap multiple photos sequentially, review them below, then save to this Site Visit Job.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Area Tag & Camera Flip Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Area Tag:</span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as SiteVisitPhotoCategory)}
                  className="h-10 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white"
                >
                  {SITE_PHOTO_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.labelEn} ({c.labelUr})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleFlipCamera}
                className="min-h-[44px] bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <SwitchCamera className="w-4 h-4 text-amber-400" />
                <span>{facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}</span>
              </Button>
            </div>

            {/* Live Video Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-[4/3] sm:aspect-video flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-md">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-200 leading-relaxed" dir="rtl">
                    {cameraError}
                  </p>
                  <Button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs gap-2 cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>فون کیمرہ استعمال کریں (Use Native Camera)</span>
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-xs text-slate-300">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Starting device camera...</span>
                    </div>
                  )}
                  {flashActive && (
                    <div className="pointer-events-none absolute inset-0 bg-white/75 transition-opacity" />
                  )}
                </>
              )}
            </div>

            {/* Shutter Trigger */}
            {!cameraError && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <Button
                  type="button"
                  onClick={handleCaptureFrame}
                  disabled={!cameraReady}
                  className="min-h-[52px] px-7 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm gap-2 shadow-lg cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>تصویر کھینچیں (Capture Shot)</span>
                </Button>
              </div>
            )}

            {/* Pending Multi-Shot Tray */}
            {pendingCaptures.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{pendingCaptures.length} Shots Ready to Upload</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingCaptures([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    Clear tray
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {pendingCaptures.map((shot, idx) => (
                    <div
                      key={shot.tempId}
                      className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={shot.imageUrl}
                          alt={`Captured site shot ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingCaptures(prev => prev.filter(p => p.tempId !== shot.tempId))
                          }
                          aria-label="Remove captured shot"
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/75 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white bg-black/65 px-1.5 py-0.5 rounded">
                          {getPhotoCategoryLabel(shot.category).labelEn}
                        </span>
                      </div>
                      <div className="p-1.5">
                        <Input
                          value={shot.caption}
                          onChange={e =>
                            setPendingCaptures(prev =>
                              prev.map(p =>
                                p.tempId === shot.tempId ? { ...p, caption: e.target.value } : p
                              )
                            )
                          }
                          placeholder="Optional note..."
                          className="h-7 text-[11px] bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCameraOpen(false)}
              className="min-h-[44px] bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              Close
            </Button>

            <Button
              type="button"
              disabled={pendingCaptures.length === 0 || uploading}
              onClick={handleSavePendingCaptures}
              className="min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-2 cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                Upload {pendingCaptures.length > 0 ? `${pendingCaptures.length} ` : ''}Photos to Bill
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULLSCREEN LIGHTBOX VIEWER FOR BILLING INSPECTION */}
      <Dialog
        open={lightboxIndex !== null && Boolean(activeLightboxPhoto)}
        onOpenChange={open => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl p-0 bg-slate-950 text-white border-slate-800 overflow-hidden">
          {activeLightboxPhoto && lightboxIndex !== null && (
            <div className="flex flex-col">
              <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
                <div>
                  <DialogTitle className="text-sm font-bold text-white">
                    {getPhotoCategoryLabel(activeLightboxPhoto.category).labelEn} ·{' '}
                    {getPhotoCategoryLabel(activeLightboxPhoto.category).labelUr}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 tabular-nums">
                    Photo {lightboxIndex + 1} of {photos.length} · Captured{' '}
                    {new Date(activeLightboxPhoto.capturedAt).toLocaleString()}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="relative bg-black flex items-center justify-center min-h-[55vh] max-h-[72vh]">
                <img
                  src={activeLightboxPhoto.imageUrl}
                  alt={activeLightboxPhoto.caption || 'Site verification detail'}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[70vh] object-contain"
                />

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)
                      }
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {activeLightboxPhoto.caption && (
                <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-200">
                  {activeLightboxPhoto.caption}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
