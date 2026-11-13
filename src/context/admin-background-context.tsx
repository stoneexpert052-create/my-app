'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  getAdminBackgroundConfig, 
  updateAdminBackgroundConfig, 
  uploadAdminBackgroundImage, 
  clearAdminBackgroundImage,
  defaultAdminBackgroundConfig,
  type AdminBackgroundConfig,
  processImageFile
} from '@/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';

interface AdminBackgroundContextType {
  config: AdminBackgroundConfig;
  isLoading: boolean;
  isSaving: boolean;
  hydrated: boolean;
  updateLiveConfig: (partial: Partial<AdminBackgroundConfig>) => void;
  saveConfig: (customConfig?: AdminBackgroundConfig) => Promise<boolean>;
  uploadImage: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  setImageUrlDirectly: (url: string) => void;
  clearImage: () => Promise<boolean>;
  resetToDefault: () => Promise<boolean>;
}

const LOCAL_STORAGE_KEY = 'stone_expert_admin_bg_config';

const AdminBackgroundContext = createContext<AdminBackgroundContextType | undefined>(undefined);

export function AdminBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AdminBackgroundConfig>(defaultAdminBackgroundConfig);
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load from localStorage and Firestore on mount (client-side only to prevent hydration mismatch)
  useEffect(() => {
    let isMounted = true;

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isMounted) {
          setConfig(prev => ({ ...defaultAdminBackgroundConfig, ...prev, ...parsed }));
        }
      }
    } catch (e) {
      console.error("Error reading admin bg from localStorage:", e);
    }

    if (isMounted) {
      setHydrated(true);
    }

    async function loadRemote() {
      try {
        const remote = await getAdminBackgroundConfig();
        if (isMounted && remote) {
          setConfig(prev => {
            const merged = { ...defaultAdminBackgroundConfig, ...prev, ...remote };
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              } catch (e) {}
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn("Could not fetch remote admin background config:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadRemote();
    return () => { isMounted = false; };
  }, []);

  // Update live state and localStorage (for instant slider feedback)
  const updateLiveConfig = useCallback((partial: Partial<AdminBackgroundConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...partial };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
  }, []);

  // Persist current or passed config to Firestore
  const saveConfig = useCallback(async (customConfig?: AdminBackgroundConfig) => {
    setIsSaving(true);
    const targetConfig = customConfig || config;
    try {
      const res = await updateAdminBackgroundConfig(targetConfig);
      if (res.success) {
        toast({
          title: 'Visual Settings Saved',
          description: 'Admin background and highlight/blur controls have been successfully updated.',
        });
        setIsSaving(false);
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: res.error || 'Could not save background settings to database.',
        });
        setIsSaving(false);
        return false;
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Settings',
        description: e.message || 'An unexpected error occurred.',
      });
      setIsSaving(false);
      return false;
    }
  }, [config, toast]);

  // Upload an image file
  const uploadImage = useCallback(async (file: File) => {
    setIsSaving(true);
    try {
      // Process locally first for instant preview
      const localDataUrl = await processImageFile(file, 1920, 1080, 0.6);
      updateLiveConfig({ imageUrl: localDataUrl });

      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadAdminBackgroundImage(formData);

      if (res.success && res.newUrl) {
        updateLiveConfig({ imageUrl: res.newUrl });
        toast({
          title: 'Background Image Uploaded',
          description: 'New admin panel background image has been saved to the cloud.',
        });
        setIsSaving(false);
        return { success: true, url: res.newUrl };
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: res.error || 'Failed to upload background image.',
        });
        setIsSaving(false);
        return { success: false, error: res.error };
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: e.message || 'Failed to process image.',
      });
      setIsSaving(false);
      return { success: false, error: e.message };
    }
  }, [updateLiveConfig, toast]);

  // Set image URL directly (e.g. from preset)
  const setImageUrlDirectly = useCallback((url: string) => {
    updateLiveConfig({ imageUrl: url });
  }, [updateLiveConfig]);

  // Clear custom uploaded image
  const clearImage = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await clearAdminBackgroundImage();
      if (res.success) {
        updateLiveConfig({ imageUrl: '' });
        toast({
          title: 'Custom Image Cleared',
          description: 'Admin panel is now using the default marble factory background.',
        });
        setIsSaving(false);
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Clear Image',
          description: res.error || 'Error clearing image.',
        });
        setIsSaving(false);
        return false;
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e.message || 'An error occurred.',
      });
      setIsSaving(false);
      return false;
    }
  }, [updateLiveConfig, toast]);

  // Reset all sliders & visual properties to default values
  const resetToDefault = useCallback(async () => {
    setIsSaving(true);
    const defaults = { ...defaultAdminBackgroundConfig };
    try {
      const res = await updateAdminBackgroundConfig(defaults);
      if (res.success) {
        setConfig(defaults);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
          } catch (e) {}
        }
        toast({
          title: 'Settings Reset',
          description: 'Background highlight, blur, and opacity restored to default calibrated levels.',
        });
        setIsSaving(false);
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Reset Failed',
          description: res.error || 'Could not reset settings.',
        });
        setIsSaving(false);
        return false;
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Error',
        description: e.message || 'An error occurred.',
      });
      setIsSaving(false);
      return false;
    }
  }, [toast]);

  return (
    <AdminBackgroundContext.Provider
      value={{
        config,
        isLoading,
        isSaving,
        hydrated,
        updateLiveConfig,
        saveConfig,
        uploadImage,
        setImageUrlDirectly,
        clearImage,
        resetToDefault,
      }}
    >
      {children}
    </AdminBackgroundContext.Provider>
  );
}

export function useAdminBackground() {
  const context = useContext(AdminBackgroundContext);
  if (!context) {
    throw new Error('useAdminBackground must be used within an AdminBackgroundProvider');
  }
  return context;
}
