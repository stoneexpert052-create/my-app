'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Download, 
  Printer, 
  Share2, 
  Smartphone, 
  Globe, 
  Phone, 
  ArrowLeft, 
  Home, 
  Check, 
  Loader2,
  Building2,
  Copy,
  Tag,
  QrCode as QrIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyBrochure } from '@/components/company-brochure';
import { PriceListBrochure } from '@/components/price-list-brochure';
import { useToast } from '@/hooks/use-toast';
import { getPublicOrigin } from '@/lib/utils';
import config from '@/lib/config.json';

function PublicBrochureContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'price-list' ? 'price-list' : 'company';

  const [activeType, setActiveType] = useState<'company' | 'price-list'>(initialType);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const param = searchParams.get('type');
    if (param === 'price-list') {
      setActiveType('price-list');
    } else if (param === 'company') {
      setActiveType('company');
    }
  }, [searchParams]);

  const businessPhone = config.businessPhoneNumber || '+92 339 9991052';
  const businessWhatsApp = config.businessWhatsAppNumber || '923399991052';

  const handleDownloadPdf = async () => {
    const targetId = activeType === 'price-list' 
      ? 'stone-expert-public-price-list-sheet' 
      : 'stone-expert-public-brochure-sheet';

    const element = document.getElementById(targetId);
    if (!element) return;

    try {
      setIsGeneratingPdf(true);
      toast({
        title: 'پی ڈی ایف تیار ہو رہی ہے...',
        description: activeType === 'price-list'
          ? 'پرائس لسٹ بروشر مع کیو آر کوڈ پی ڈی ایف فارمیٹ میں ڈاؤنلوڈ ہو رہا ہے...'
          : 'بروشر پی ڈی ایف ڈاؤنلوڈ ہو رہی ہے...',
      });

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const filePrefix = activeType === 'price-list' 
        ? 'Stone_Expert_Price_List_Brochure' 
        : 'Stone_Expert_Brochure';
      const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'ڈاؤنلوڈ مکمل!',
        description: activeType === 'price-list'
          ? 'سٹون ایکسپرٹ پرائس لسٹ بروشر کامیابی سے سیو ہو گیا ہے۔'
          : 'سٹون ایکسپرٹ کمپنی بروشر کامیابی سے سیو ہو گیا ہے۔',
      });
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: 'خرابی',
        description: 'پی ڈی ایف بنانے میں مسئلہ آیا، براہ کرم پرنٹ آپشن استعمال کریں۔',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      activeType === 'price-list'
        ? `السلام علیکم! میں نے سٹون ایکسپرٹ کی آفیشل پرائس لسٹ دیکھی ہے اور ماربل / گرینائٹ کا آرڈر یا معلومات حاصل کرنا چاہتا ہوں۔`
        : `السلام علیکم! میں نے سٹون ایکسپرٹ کا بروشر دیکھا ہے اور ماربل / گرینائٹ کے بارے میں معلومات حاصل کرنا چاہتا ہوں۔`
    );
    window.open(`https://api.whatsapp.com/send?phone=${businessWhatsApp}&text=${text}`, '_blank');
  };

  const handleShare = async () => {
    const origin = getPublicOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = activeType === 'price-list' ? `${origin}/brochure?type=price-list` : `${origin}/brochure`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: activeType === 'price-list' ? 'Stone Expert - آفیشل پرائس لسٹ و ریٹ بروشر' : 'Stone Expert - کمپنی بروشر و تعارف',
          text: activeType === 'price-list' 
            ? 'سٹون ایکسپرٹ کا آفیشل ماربل و گرینائٹ پرائس لسٹ بروشر مع کیو آر کوڈ دیکھیں۔' 
            : 'سٹون ایکسپرٹ کا مکمل ڈیجیٹل بروشر اور ماربل و گرینائٹ کی تمام تفصیلات دیکھیں۔',
          url: url,
        });
      } catch (err) {
        // Fallback
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast({
          title: 'لنک کاپی ہو گیا!',
          description: 'بروشر کا لنک کاپی ہو چکا ہے، آپ اسے کسی بھی ایپ میں شیئر کر سکتے ہیں۔',
        });
        setTimeout(() => setCopiedLink(false), 3000);
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground flex flex-col">
      {/* ================= PUBLIC TOP NAVIGATION BAR (STICKY) ================= */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black">
              SE
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base">Stone Expert</span>
              <span className="text-[10px] text-muted-foreground">سٹون ایکسپرٹ پاکستان</span>
            </div>
          </Link>

          {/* Quick Toggle Tabs */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
            <button
              onClick={() => setActiveType('company')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeType === 'company' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              کمپنی تعارف
            </button>
            <button
              onClick={() => setActiveType('price-list')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeType === 'price-list' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>پرائس لسٹ (مع QR)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <Button 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              size="sm"
              className={`${activeType === 'price-list' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} text-white font-semibold gap-1.5 shadow-sm`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">تیار ہو رہا ہے...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>پی ڈی ایف (PDF)</span>
                </>
              )}
            </Button>

            {/* WhatsApp Contact */}
            <Button 
              onClick={handleWhatsAppContact}
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5 shadow-sm hidden xs:inline-flex"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">واٹس ایپ</span>
            </Button>

            {/* Share / Copy Link */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              className="gap-1.5 font-medium"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden md:inline">شیئر کریں</span>
            </Button>

            {/* Back to Home Store */}
            <Button 
              variant="ghost" 
              size="sm"
              asChild
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Link href="/">
                <Home className="w-4 h-4" />
                <span className="hidden md:inline">ویب ایپ</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Switcher Bar */}
        <div className="flex sm:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 justify-around text-xs">
          <button
            onClick={() => setActiveType('company')}
            className={`font-bold py-1 px-3 rounded-md ${activeType === 'company' ? 'text-amber-700 bg-amber-100 font-black' : 'text-slate-600'}`}
          >
            🏢 کمپنی تعارف
          </button>
          <button
            onClick={() => setActiveType('price-list')}
            className={`font-bold py-1 px-3 rounded-md ${activeType === 'price-list' ? 'text-emerald-700 bg-emerald-100 font-black' : 'text-slate-600'}`}
          >
            💰 پرائس لسٹ (مع QR کوڈ)
          </button>
        </div>
      </header>

      {/* ================= BROCHURE CONTENT VIEW ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 md:p-8">
        {activeType === 'price-list' ? (
          <PriceListBrochure id="stone-expert-public-price-list-sheet" />
        ) : (
          <CompanyBrochure id="stone-expert-public-brochure-sheet" />
        )}

        {/* BOTTOM ACTION BAR FOR USERS */}
        <div className="mt-8 mb-12 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4 print:hidden">
          <h3 className="text-lg font-bold text-foreground">
            مزید معلومات، کسٹم سائزز، یا آرڈر کے لیے ہم سے رابطہ کریں
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            سٹون ایکسپرٹ کے تمام مٹیریلز کی لائیو تصاویر، فری ایریا کیلکولیٹر اور آرڈر بکنگ ہماری مرکزی ویب ایپ پر 24/7 دستیاب ہے۔
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
              <Link href="/">
                <Globe className="w-4 h-4" />
                <span>ویب ایپ اوپن کریں</span>
              </Link>
            </Button>
            <Button 
              onClick={handleWhatsAppContact} 
              size="lg" 
              variant="outline" 
              className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>واٹس ایپ پر رابطہ کریں</span>
            </Button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 print:hidden">
        © {new Date().getFullYear()} Stone Expert Pakistan • Main GT Road, Rawalpindi / Islamabad • {businessPhone}
      </footer>
    </div>
  );
}

export default function PublicBrochurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        بروشر لوڈ ہو رہا ہے...
      </div>
    }>
      <PublicBrochureContent />
    </Suspense>
  );
}
