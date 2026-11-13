'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Download, 
  Printer, 
  Share2, 
  Copy, 
  ExternalLink, 
  Check, 
  FileText, 
  Sparkles, 
  Smartphone, 
  Globe, 
  Building2, 
  ShieldCheck, 
  Award,
  Loader2,
  Tag,
  Coins,
  QrCode as QrIcon,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CompanyBrochure } from '@/components/company-brochure';
import { PriceListBrochure } from '@/components/price-list-brochure';
import { getPublicOrigin } from '@/lib/utils';
import config from '@/lib/config.json';

function DashboardBrochureContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'price-list' ? 'price-list' : 'company';

  const [activeBrochure, setActiveBrochure] = useState<'company' | 'price-list'>(initialType);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const paramType = searchParams.get('type');
    if (paramType === 'price-list') {
      setActiveBrochure('price-list');
    } else if (paramType === 'company') {
      setActiveBrochure('company');
    }
  }, [searchParams]);

  const businessPhone = config.businessPhoneNumber || '+92 339 9991052';
  const businessWhatsApp = config.businessWhatsAppNumber || '923399991052';

  const getBrochureUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = getPublicOrigin() || window.location.origin;
      return activeBrochure === 'price-list' 
        ? `${origin}/brochure?type=price-list` 
        : `${origin}/brochure`;
    }
    return activeBrochure === 'price-list' ? '/brochure?type=price-list' : '/brochure';
  };

  const getShareText = () => {
    const url = getBrochureUrl();
    const storeUrl = typeof window !== 'undefined' ? (getPublicOrigin() || window.location.origin) : 'https://stoneexpert.net';

    if (activeBrochure === 'price-list') {
      return `🏛️ *Stone Expert (سٹون ایکسپرٹ) - آفیشل ماربل و گرینائٹ ریٹ لسٹ و بروشر*

پاکستان کے سب سے بڑے ڈیجیٹل اسٹون نیٹ ورک سے براہِ راست فیکٹری ریٹس پر ماربل و گرینائٹ دستیاب ہیں۔

💰 *پرائس لسٹ و مٹیریل ورائٹی:*
• امپورٹڈ گرینائٹ (24", 36", 48", 52" - Egypt Green, Emerald Pearl, Blue Pearl, Silver Pearl, Baltic Brown)
• پاکستانی و لوکل ماربل (زیارت وائٹ، بادل، سنی گرے، بلیک اینڈ گولڈ، انڈس گولڈ)
• سل بَٹہ، چوکھٹ و کچن کاؤنٹرز
• گینگ سا امپورٹڈ سلیبز (Ice White, Kolkata Gold, Panda White, Fish Belly)
• ٹائل بانڈ، ماربل کیمیکل، ایپوکسی و فکسنگ لوازمات

📲 *بروشر پر موجود QR کوڈ اسکین کر کے براہِ راست ہماری ویب ایپ پر جائیں اور آن لائن آرڈر تیار کریں۔*

📄 *مکمل پرائس لسٹ بروشر اور ریٹس یہاں دیکھیں:*
${url}

🌐 *آن لائن ویب ایپ وزٹ کریں:*
${storeUrl}

📞 *رابطہ و واٹس ایپ آرڈر:* ${businessPhone}
📍 مین جی ٹی روڈ، راولپنڈی / اسلام آباد`;
    }

    return `🏛️ *Stone Expert (سٹون ایکسپرٹ) - کمپنی تعارف و بروشر*

پاکستان کا سب سے بڑا ڈیجیٹل ماربل، گرینائٹ اور کنسٹرکشن فنشنگ نیٹ ورک۔

✨ *ہماری اہم خدمات و مصنوعات:*
• تمام اقسام کے لوکل و امپورٹڈ ماربل (زیارت وائٹ، بادل، سنی گرے، بلیک اینڈ گولڈ)
• امپورٹڈ و لوکل گرینائٹ (بلیک گلیکسی، تپنو، بیلا گرے)
• اپنا گھر بنائیں (Build Your Home) ماربل و ٹائلز پیکیجز
• آن لائن ریٹ لسٹ اور فری کاسٹ ایسٹیمیٹر
• فکسنگ میٹریل، ٹائل بانڈ اور کیمیکلز
• تصدیق شدہ کاریگر (فکسنگ و پالشنگ ایکسپرٹس)

📄 *مکمل ڈیجیٹل بروشر اور پی ڈی ایف یہاں دیکھیں:*
${url}

🌐 *آن لائن ویب سائٹ:*
${storeUrl}

📞 *رابطہ و واٹس ایپ:* ${businessPhone}
📍 مین جی ٹی روڈ، راولپنڈی / اسلام آباد`;
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    const targetElementId = activeBrochure === 'price-list' 
      ? 'stone-expert-price-list-sheet' 
      : 'stone-expert-brochure-sheet';

    const element = document.getElementById(targetElementId);
    if (!element) {
      toast({
        title: 'خرابی',
        description: 'بروشر شیٹ کا ایلیمنٹ نہیں ملا۔',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGeneratingPdf(true);
      toast({
        title: 'پی ڈی ایف تیار ہو رہی ہے...',
        description: activeBrochure === 'price-list' 
          ? 'پرائس لسٹ بروشر پی ڈی ایف ہائی ریزولیوشن میں تیار ہو رہا ہے...'
          : 'کمپنی بروشر پی ڈی ایف ڈاؤنلوڈ ہو رہا ہے...',
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

      const filePrefix = activeBrochure === 'price-list' 
        ? 'Stone_Expert_Price_List_Brochure' 
        : 'Stone_Expert_Company_Brochure';
      const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'کامیابی!',
        description: activeBrochure === 'price-list' 
          ? 'پرائس لسٹ بروشر پی ڈی ایف مع کیو آر کوڈ کامیابی سے ڈاؤنلوڈ ہو گیا ہے۔' 
          : 'کمپنی بروشر پی ڈی ایف کامیابی سے ڈاؤنلوڈ ہو گئی ہے۔',
      });
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: 'پی ڈی ایف جنریشن میں خرابی',
        description: error?.message || 'براہ کرم دوبارہ کوشش فرمائیں یا پرنٹ آپشن استعمال کریں۔',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      const url = getBrochureUrl();
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({
        title: 'لنک کاپی ہو گیا!',
        description: activeBrochure === 'price-list'
          ? 'پرائس لسٹ بروشر کا پبلک لنک کلپ بورڈ پر کاپی ہو گیا ہے۔'
          : 'کمپنی بروشر کا لنک کاپی ہو چکا ہے، اب آپ اسے کسی کو بھی بھیج سکتے ہیں۔',
      });
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleCopyText = async () => {
    try {
      const text = getShareText();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast({
        title: 'مکمل میسج کاپی ہو گیا!',
        description: 'بروشر کا تفصیلی پیغام اور ویب سائٹ لنک کلپ بورڈ پر کاپی ہو چکا ہے۔',
      });
      setTimeout(() => setCopiedText(false), 3000);
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to copy text',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ================= PAGE TITLE & ACTIONS ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary font-semibold mb-1">
            <FileText className="w-4 h-4" />
            <span>مارکیٹنگ و کسٹمر شیئرنگ حب</span>
          </div>
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>کمپنی بروشر و پرائس لسٹ جنریٹر</span>
            <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
              مع ویب ایپ QR کوڈ
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            یہاں سے آپ سٹون ایکسپرٹ کا کمپنی تعارف یا ماربل و گرینائٹ کی **مکمل پرائس لسٹ کا بروشر** مع کیو آر کوڈ جنریٹ کر سکتے ہیں اور براہِ راست کلائنٹس کو واٹس ایپ یا پی ڈی ایف میں بھیج سکتے ہیں۔
          </p>
        </div>

        {/* TOP QUICK ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF Button */}
          <Button 
            onClick={handleDownloadPdf} 
            disabled={isGeneratingPdf}
            className={`${activeBrochure === 'price-list' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} text-white shadow-md font-semibold gap-2`}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>پی ڈی ایف تیار ہو رہی ہے...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {activeBrochure === 'price-list' ? 'پرائس لسٹ PDF ڈاؤنلوڈ' : 'کمپنی بروشر PDF ڈاؤنلوڈ'}
                </span>
              </>
            )}
          </Button>

          {/* WhatsApp Share Button */}
          <Button 
            onClick={handleWhatsAppShare}
            className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-semibold gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>واٹس ایپ شیئر</span>
          </Button>

          {/* Copy Link Button */}
          <Button 
            variant="outline" 
            onClick={handleCopyLink}
            className="font-medium gap-2"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>لنک کاپی ہو گیا</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>پبلک لنک کاپی کریں</span>
              </>
            )}
          </Button>

          {/* Browser Print Button */}
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="font-medium gap-2 hidden sm:inline-flex"
            title="پرنٹ یا براؤزر میں Save as PDF کریں"
          >
            <Printer className="w-4 h-4" />
            <span>پرنٹ</span>
          </Button>

          {/* Public Link Preview */}
          <Button 
            variant="ghost" 
            asChild
            className="font-medium gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Link href={getBrochureUrl()} target="_blank">
              <span>پبلک ویو</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ================= BROCHURE TYPE TOGGLE SWITCHER ================= */}
      <div className="bg-slate-100 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant={activeBrochure === 'company' ? 'default' : 'ghost'}
            onClick={() => setActiveBrochure('company')}
            className={`flex-1 sm:flex-initial gap-2 font-bold text-xs sm:text-sm h-10 ${
              activeBrochure === 'company' 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. کمپنی تعارف بروشر (Company Profile)</span>
          </Button>

          <Button
            type="button"
            variant={activeBrochure === 'price-list' ? 'default' : 'ghost'}
            onClick={() => setActiveBrochure('price-list')}
            className={`flex-1 sm:flex-initial gap-2 font-bold text-xs sm:text-sm h-10 ${
              activeBrochure === 'price-list' 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>2. پرائس لسٹ بروشر مع QR کوڈ (Price List & QR)</span>
            <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full uppercase">NEW</span>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground px-2 flex items-center gap-1.5">
          <QrIcon className="w-4 h-4 text-emerald-600" />
          <span>
            {activeBrochure === 'price-list' 
              ? 'بروشر کے اوپر ویب ایپ کا اسکین کیو آر کوڈ موجود ہے' 
              : 'کمپنی پروفائل اور سروسز ویو'}
          </span>
        </div>
      </div>

      {/* ================= QUICK STATS CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <QrIcon className="w-4 h-4" />
              <span>مربوط ویب ایپ QR کوڈ</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            پرائس لسٹ بروشر پر ہماری ویب ایپ کا ڈائریکٹ QR کوڈ لگایا گیا ہے تاکہ کلائنٹ ریٹ دیکھنے کے بعد کیمرے سے اسکین کر کے فوری ایپ پر آ سکے اور آن لائن آرڈر دے سکے۔
          </CardContent>
        </Card>

        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Download className="w-4 h-4" />
              <span>A4 ہائی کوالٹی PDF ڈاؤنلوڈ</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            مکمل کیٹلاگ اور پرائس لسٹ A4 سائز کے پرنٹ ریڈی پی ڈی ایف میں فوری ایکسپورٹ ہو جاتی ہے، جسے پرنٹ کر کے شو روم میں بھی رکھا جا سکتا ہے۔
          </CardContent>
        </Card>

        <Card className="border-blue-500/25 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Smartphone className="w-4 h-4" />
              <span>1-کلک واٹس ایپ شیئرنگ</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            کسٹمرز یا ٹھیکیداروں کو فوری واٹس ایپ میسج اور لائیو لنک بھیجیں تاکہ وہ اپنے موبائل میں تمام 130+ ریٹس اور سائزز باآسانی دیکھ سکیں۔
          </CardContent>
        </Card>
      </div>

      {/* ================= DETAILED SHARING CONTROLS STRIP ================= */}
      <Card className="border-border">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>فعال بروشر کا پبلک شیئرنگ لنک (Public Share Link):</span>
              <span className="font-bold text-foreground">
                {activeBrochure === 'price-list' ? 'پرائس لسٹ بروشر' : 'کمپنی تعارف بروشر'}
              </span>
            </div>
            <div 
              suppressHydrationWarning
              className="text-sm font-mono bg-muted/80 px-3 py-1.5 rounded-lg border text-foreground select-all break-all"
            >
              {mounted ? getBrochureUrl() : (activeBrochure === 'price-list' ? '/brochure?type=price-list' : '/brochure')}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="secondary" onClick={handleCopyLink} className="gap-1.5 font-bold">
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>لنک کاپی کریں</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyText} className="gap-1.5">
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
              <span>مکمل میسج کاپی</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================= LIVE BROCHURE PREVIEW CONTAINER ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              {activeBrochure === 'price-list' 
                ? 'پرائس لسٹ بروشر کا لائیو پریویو (Live Price List & QR Preview)'
                : 'کمپنی بروشر کا لائیو پریویو (Live Company Profile Preview)'}
            </span>
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            A4 سائز ہائی کوالٹی فارمیٹ
          </span>
        </div>

        {/* Document Rendering Frame */}
        <div className="p-2 sm:p-6 bg-slate-200 dark:bg-slate-900/60 rounded-2xl border border-slate-300 dark:border-slate-800">
          {activeBrochure === 'price-list' ? (
            <PriceListBrochure id="stone-expert-price-list-sheet" />
          ) : (
            <CompanyBrochure id="stone-expert-brochure-sheet" />
          )}
        </div>
      </div>
    </main>
  );
}

export default function DashboardBrochurePage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-sm text-muted-foreground">
        بروشر لوڈ ہو رہا ہے...
      </div>
    }>
      <DashboardBrochureContent />
    </Suspense>
  );
}
