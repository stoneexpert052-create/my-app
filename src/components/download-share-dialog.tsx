'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  QrCode as QrIcon, 
  Smartphone, 
  Chrome, 
  Compass, 
  Plus, 
  MessageSquare,
  Facebook,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPublicOrigin } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { getHomepageConfig } from '@/lib/admin-actions';
import defaultConfig from '@/lib/config.json';

import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogDescription as ShadcnDialogDescription,
} from '@/components/ui/dialog';

interface DownloadShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadShareDialog({ isOpen, onOpenChange }: DownloadShareDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [appUrl, setAppUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>(defaultConfig.logoUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = getPublicOrigin();
      setAppUrl(origin);
      
      // Fetch logo URL from config
      getHomepageConfig().then(dbConfig => {
        if (dbConfig?.logoUrl) {
          setLogoUrl(dbConfig.logoUrl);
        } else {
          setLogoUrl(defaultConfig.logoUrl);
        }
      }).catch(err => {
        console.error('Error loading config for logo', err);
      });
      
      // Generate QR Code pointing to home page
      setLoading(true);
      QRCode.toDataURL(
        origin,
        {
          margin: 1,
          width: 300,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          setLoading(false);
          if (err) {
            console.error('Error generating App QR Code', err);
            return;
          }
          setQrCodeUrl(url);
        }
      );
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast({
        title: language === 'ur' ? 'لنک کاپی ہو گیا!' : 'Link Copied!',
        description: language === 'ur' ? 'سٹون ایکسپرٹ کا لنک کامیابی سے کاپی ہو گیا۔' : 'Stone Expert link copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link.',
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Stone Expert - Floor & Marble Calculators',
          text: language === 'ur' 
            ? 'سٹون ایکسپرٹ: اپنے گھر کی تعمیر کے لیے ماربل، گرینائٹ، اور کاریگروں کی درست لاگت کا حساب لگائیں۔' 
            : 'Stone Expert: Estimate flooring, kitchen tops, marble pieces, and connect with local fixing experts easily.',
          url: appUrl,
        });
        toast({ title: 'Shared Successfully!' });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      // Fallback
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = language === 'ur'
      ? `السلام علیکم! اپنے گھر کی تعمیر کے لیے سنگِ مرمر، گرینائٹ، کچن کاؤنٹرز اور کاریگروں کی درست لاگت کا حساب لگانے کے لیے "سٹون ایکسپرٹ" ایپ استعمال کریں:\n${appUrl}`
      : `Stone Expert - The ultimate app for estimating marble, granite, kitchen tops, window sills, and connecting with certified service experts:\n${appUrl}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'stone-expert-app-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'QR Code Downloaded',
      description: 'You can now print this QR code or share it with customers.',
    });
  };

  const handleDownloadShortcut = () => {
    const shortcutContent = `[InternetShortcut]\nURL=${appUrl}\nIDList=\nIconFile=favicon.ico\nIconIndex=1`;
    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Stone Expert.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Launcher Shortcut Downloaded',
      description: 'Double click this file on desktop/mobile to launch the app instantly!',
    });
  };

  return (
    <ShadcnDialog open={isOpen} onOpenChange={onOpenChange}>
      <ShadcnDialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-slate-950 text-white border border-slate-800 rounded-2xl">
        <div className="relative p-6 sm:p-8 space-y-6">
          <ShadcnDialogHeader className="space-y-2 text-center sm:text-left">
            <ShadcnDialogTitle className="text-2xl font-extrabold tracking-tight font-headline flex items-center justify-center sm:justify-start gap-3">
              <span className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center w-11 h-11">
                <Icons.logo src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[#dfb96c]">
                  {language === 'ur' ? 'ایپ ڈاؤن لوڈ اور شیئر کریں' : 'Download & Share App'}
                </span>
                <span className="text-xs text-slate-400 font-normal mt-0.5">
                  {language === 'ur' ? 'سٹون ایکسپرٹ کو اپنے موبائل یا کمپیوٹر پر لائیو حاصل کریں' : 'Access Stone Expert instantly on any device'}
                </span>
              </div>
            </ShadcnDialogTitle>
          </ShadcnDialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            {/* Left side: Premium App Preview Frame */}
            <div className="md:col-span-2 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-[180px] h-[340px] bg-slate-900 rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between items-center text-center">
                {/* Speaker pill */}
                <div className="w-16 h-3.5 bg-slate-800 rounded-full mb-3 shrink-0 flex items-center justify-center">
                  <div className="w-2 h-1 bg-slate-700 rounded-full" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <div className="w-20 h-20 p-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-center shadow-lg relative group">
                    <Icons.logo src={logoUrl} alt="App Logo" className="h-full w-full object-contain" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-slate-900"></span>
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#dfb96c] tracking-wide">STONE EXPERT</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {language === 'ur' ? 'ماربل کیلکولیٹر' : 'Professional Calculators'}
                    </p>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-auto pb-2">
                  <div className="h-1.5 w-1/2 bg-slate-800 rounded mx-auto" />
                  <div className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1 px-2.5 rounded-full font-bold inline-block">
                    {language === 'ur' ? 'انسٹالیشن کے لیے تیار' : 'PWA App Ready'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
                <Button 
                  onClick={handleDownloadShortcut} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-[#dfb96c] h-9"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {language === 'ur' ? 'شارٹ کٹ ڈاؤن لوڈ کریں' : 'Download Launcher'}
                </Button>
              </div>
            </div>

            {/* Right side: Action Tabs & QR Code */}
            <div className="md:col-span-3 space-y-5">
              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800/60 p-1 h-9 rounded-lg">
                  <TabsTrigger value="qr" className="text-xs font-extrabold data-[state=active]:bg-slate-800 data-[state=active]:text-[#dfb96c]">
                    <QrIcon className="mr-1.5 h-3.5 w-3.5" />
                    {language === 'ur' ? 'کیو آر کوڈ' : 'QR Code Scanner'}
                  </TabsTrigger>
                  <TabsTrigger value="install" className="text-xs font-extrabold data-[state=active]:bg-slate-800 data-[state=active]:text-[#dfb96c]">
                    <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                    {language === 'ur' ? 'موبائل گائیڈ' : 'Mobile Install'}
                  </TabsTrigger>
                </TabsList>

                {/* QR Code Tab Content */}
                <TabsContent value="qr" className="space-y-4 pt-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-800 shadow-inner relative group">
                    {loading ? (
                      <div className="h-44 w-44 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
                      </div>
                    ) : (
                      qrCodeUrl && (
                        <div className="relative">
                          <img 
                            src={qrCodeUrl} 
                            alt="Stone Expert App QR Code" 
                            className="h-44 w-44 object-contain" 
                          />
                        </div>
                      )
                    )}
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1 text-center font-mono">
                      {language === 'ur' ? 'موبائل سے اسکین کریں' : 'Scan with Phone Camera'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDownloadQR} 
                      variant="outline" 
                      className="flex-1 text-xs font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-[#dfb96c] h-10"
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      {language === 'ur' ? 'کیو آر ڈاؤن لوڈ کریں' : 'Save QR Image'}
                    </Button>
                    <Button 
                      onClick={handleCopyLink} 
                      variant="outline" 
                      className="flex-1 text-xs font-bold border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-[#dfb96c] h-10"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                          {language === 'ur' ? 'کاپی ہو گیا' : 'Link Copied'}
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-4 w-4" />
                          {language === 'ur' ? 'لنک کاپی کریں' : 'Copy Web Link'}
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* Mobile Installation Guides */}
                <TabsContent value="install" className="space-y-4 pt-2">
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Chrome className="h-4 w-4 text-[#dfb96c]" />
                        <span className="font-extrabold text-[#dfb96c]">
                          {language === 'ur' ? 'اینڈرائیڈ (Chrome)' : 'Android / Chrome Instructions'}
                        </span>
                      </div>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 font-medium">
                        <li>
                          {language === 'ur' 
                            ? 'گوگل کروم میں لنک اوپن کریں اور اوپر دائیں کونے میں تھری ڈاٹس (⋮) پر کلک کریں۔' 
                            : 'Open our link in Chrome and tap the menu icon (⋮) at top-right.'}
                        </li>
                        <li className="flex items-center flex-wrap gap-1">
                          {language === 'ur' ? 'پھر' : 'Select'} 
                          <span className="bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded text-[10px] uppercase border border-slate-700">
                            {language === 'ur' ? 'ایڈ ٹو ہوم اسکرین' : 'Install App'}
                          </span> 
                          {language === 'ur' ? 'یا "Add to Home screen" منتخب کریں۔' : 'or "Add to Home screen".'}
                        </li>
                        <li>
                          {language === 'ur' ? 'سٹون ایکسپرٹ کا آفیشل لوگو آپ کی ہوم اسکرین پر ظاہر ہو جائے گا۔' : 'Confirm install! The official logo is instantly placed on your phone.'}
                        </li>
                      </ol>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Compass className="h-4 w-4 text-[#dfb96c]" />
                        <span className="font-extrabold text-[#dfb96c]">
                          {language === 'ur' ? 'آئی فون (Safari)' : 'iPhone / iOS Safari Instructions'}
                        </span>
                      </div>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 font-medium">
                        <li>
                          {language === 'ur' 
                            ? 'سفاری براؤزر میں لنک اوپن کریں اور نیچے دیے گئے شیئر آئیکن (⎋) پر کلک کریں۔' 
                            : 'Open our link in Safari and tap the Share button (⎋) at the bottom.'}
                        </li>
                        <li className="flex items-center flex-wrap gap-1">
                          {language === 'ur' ? 'اسکرول کر کے' : 'Scroll down and select'} 
                          <span className="bg-slate-800 text-white font-bold px-1.5 py-0.5 rounded text-[10px] uppercase border border-slate-700">
                            {language === 'ur' ? 'ایڈ ٹو ہوم اسکرین' : 'Add to Home Screen'}
                          </span>
                          <Plus className="h-3 w-3 inline text-slate-400" /> 
                        </li>
                        <li>
                          {language === 'ur' 
                            ? 'ایپ کا نام اسٹور کریں اور "Add" پر کلک کریں۔ یہ اب آپ کی ہوم اسکرین پر موجود ہے۔' 
                            : 'Tap "Add" at the top right to complete installation. Done!'}
                        </li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Quick Share Buttons */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  {language === 'ur' ? 'فوری شیئر کے اختیارات' : 'Quick Share Options'}
                </span>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleWhatsAppShare} 
                    className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                  >
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button 
                    onClick={handleNativeShare} 
                    className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-10"
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    {language === 'ur' ? 'دیگر آپشنز' : 'More Share Options'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>
  );
}
