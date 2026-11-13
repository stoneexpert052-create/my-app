'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Download, X, Smartphone, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  showInstallBanner: boolean;
  setShowInstallBanner: (show: boolean) => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => {},
  showInstallBanner: false,
  setShowInstallBanner: () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // 1. Service worker registration & installation detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone display mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandaloneMode);
      
      // Hide banner if already installed
      if (isStandaloneMode) {
        setShowInstallBanner(false);
      }
    };

    checkStandalone();

    // Detect iOS
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isApple);
      
      // If iOS and not standalone, we can prompt with manual iOS instructions
      if (isApple && !((window.navigator as any).standalone === true)) {
        // Only show iOS banner after a small delay so as not to overwhelm
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (!dismissed) {
          const timer = setTimeout(() => {
            setShowInstallBanner(true);
          }, 4000);
          return () => clearTimeout(timer);
        }
      }
    };

    detectIOS();

    // PWA Service Worker disabled during development so code edits update instantly
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[Dev Mode] Unregistered Service Worker to ensure instant code updates');
        }
      });
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }

    // Capture browser install trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Check if user previously dismissed the prompt
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (!dismissed) {
        // Display custom banner after 3 seconds
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track when app is installed successfully
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      toast({
        title: "App Installed Successfully! 🎉",
        description: "Stone Expert is now added to your home screen for rapid offline access.",
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  // Trigger installation flow
  const installApp = async () => {
    if (isIOS) {
      // Direct iOS Safari users on how to install manually
      toast({
        title: "How to Install on iPhone/iPad 📱",
        description: "Tap the 'Share' icon in Safari, scroll down, and tap 'Add to Home Screen'.",
        duration: 8000,
      });
      return;
    }

    if (!deferredPrompt) {
      console.warn('[PWA] No deferred prompt available for installation');
      return;
    }

    try {
      // Trigger native browser install dialogue
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[PWA] Error launching install prompt:', err);
    }
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    // Remember dismissal for 14 days so we don't nag the user
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  return (
    <PwaContext.Provider value={{ isInstallable, isInstalled, installApp, showInstallBanner, setShowInstallBanner }}>
      {children}

      {/* Floating Installation Prompt (Sleek Toast Banner style) */}
      {showInstallBanner && !isInstalled && (
        <div 
          id="pwa-install-banner" 
          className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-50 bg-slate-900 border border-amber-500/20 text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md bg-opacity-95"
        >
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-sm text-amber-400">Install "Stone Expert" App</h4>
                <button 
                  onClick={dismissBanner}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isIOS 
                  ? "Install this dashboard on your home screen for lightning-fast speeds and offline price estimation."
                  : "Save data! Install as a native app for instant loading and completely offline stock operations."
                }
              </p>
              
              <div className="pt-2 flex items-center gap-2">
                {isIOS ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium bg-amber-500/5 border border-amber-500/15 py-1 px-2.5 rounded-lg w-full justify-center">
                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                    <span>Tap Safari's Share → "Add to Home Screen"</span>
                  </div>
                ) : (
                  <>
                    <Button 
                      size="sm" 
                      onClick={installApp}
                      className="bg-amber-500 text-slate-900 hover:bg-amber-400 text-xs py-1 h-8 px-3 font-semibold flex items-center gap-1.5 rounded-lg"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install Now
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={dismissBanner}
                      className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 py-1 h-8 px-3 rounded-lg"
                    >
                      Maybe Later
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
