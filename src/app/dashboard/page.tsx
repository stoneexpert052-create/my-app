

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Users, FileText, Download, Smartphone, ArrowRight, ExternalLink, Sparkles, Tag, ChevronDown, QrCode, Lightbulb, Scissors } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { getOrders } from '@/lib/admin-actions';
import {marbles} from '@/lib/data';

function DashboardStats() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [productCount, setProductCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            const orders: Order[] = await getOrders();
            
            const revenue = orders.reduce((acc, order) => acc + order.totalPrice, 0);
            setTotalRevenue(revenue);

            const sales = orders.length;
            setTotalSales(sales);
            
            setProductCount(marbles.length);
        };
        fetchStats();

    }, []);

    return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Based on all completed orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total orders placed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">
              Total marble types available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Unique customers this month
            </p>
          </CardContent>
        </Card>
      </div>
    )
}


export default function DashboardPage() {

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Dashboard
        </h1>
      </div>
      <DashboardStats />

      {/* CUTTING OPTIMIZER PRO & MANUAL ORDER HUB CARD */}
      <Card className="border-emerald-500/35 bg-gradient-to-r from-emerald-500/10 via-card to-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Cutting Optimizer Pro — Marble &amp; Stone Edition · مینوئل آرڈر اور کٹنگ آپٹیمائزر
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Scissors className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>ماربل سلیب کٹنگ آپٹیمائزر اور مینوئل آرڈر ہب</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm max-w-3xl">
              سلیب کا سائز، بلیڈ کٹائی (Kerf)، رگوں کی سمت (Vein Direction) اور مطلوبہ پیس دے کر 2D کٹنگ نقشہ بنائیں، بچت (Offcuts) اور ضائع پتھر کا حساب لگائیں، اور براہِ راست مینوئل آرڈر ترتیب دیں۔
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm">
              <Link href="/dashboard/manual-orders">
                <Scissors className="w-4 h-4" />
                <span>کٹنگ آپٹیمائزر اور مینوئل آرڈر کھولیں</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI OPERATIONS MANAGER HERO CARD */}
      <Card className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/5 shadow-md overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              <span>نواں سمارٹ فیچر • AI Operations Assistant</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black font-headline flex items-center gap-2">
              <span>سٹون ایکسپرٹ اسمارٹ ایڈمن اے آئی (StoneBot)</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-foreground/80 font-medium max-w-3xl leading-relaxed">
              اب آپ قدرتی زبان میں حکم دے کر بیک اینڈ کا سارا ڈیٹا سنبھال سکتے ہیں — ریٹ بڑھانا، تصویریں تبدیل کرنا، بلک سیل لگانا، یا اسٹاک اسٹیٹس بدلنا۔ 
              {' '}<strong className="text-foreground">انسانی تحفظ کا نظام (Human Approval Gate) فعال ہے:</strong> کوئی بھی چیز تبدیل کرنے سے پہلے اے آئی آپ سے اوکے پوچھے گا اور آپ کی تائید پر ہی ڈیٹا بیس میں محفوظ کرے گا۔
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-slate-950 font-black gap-2 shadow-md text-sm px-4 h-10 border border-amber-300">
              <Link href="/dashboard/ai-assistant">
                <Sparkles className="w-4 h-4" />
                <span>اے آئی مینیجر کھولیں (Open AI Manager)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* COMPANY BROCHURE & MARKETING HUB */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جدید فیچر / New Feature</span>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>کمپنی بروشر و پرائس لسٹ جنریٹر (مع QR کوڈ)</span>
            </CardTitle>
            <CardDescription className="text-sm">
              کمپنی تعارف بروشر کے ساتھ ساتھ اب آپ تمام ماربل و گرینائٹ کی **آفیشل پرائس لسٹ کا بروشر** بھی ویب ایپ QR کوڈ کے ساتھ باآسانی تیار، ڈاؤنلوڈ یا واٹس ایپ پر 1-کلک سے شیئر کر سکتے ہیں۔
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Main Company Brochure Button */}
            <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2 shadow-sm">
              <Link href="/dashboard/brochure">
                <FileText className="w-4 h-4" />
                <span>کمپنی بروشر پورٹل</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            {/* Price List Brochure Button (With QR Code) */}
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm">
              <Link href="/dashboard/brochure?type=price-list">
                <Tag className="w-4 h-4" />
                <span>پرائس لسٹ بروشر (مع QR)</span>
              </Link>
            </Button>

            {/* Public Link Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 font-semibold">
                  <span>پبلک ویو</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/brochure" target="_blank" className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span>کمپنی تعارف بروشر</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/brochure?type=price-list" target="_blank" className="flex items-center justify-between cursor-pointer font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>پرائس لسٹ بروشر (مع QR)</span>
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <Download className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>A4 پی ڈی ایف ڈاؤنلوڈ:</strong> مکمل پروفیشنل لے آؤٹ مع پرنٹ سپورٹ</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>واٹس ایپ شیئرنگ:</strong> کسٹمرز و بلڈرز کو فوری پرائس لسٹ اور لنک بھیجیں</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>ویب ایپ QR کوڈ:</strong> کسٹمرز بروشر سے اسکین کر کے فوراً آن لائن آرڈر دے سکتے ہیں</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LUMINA PRINT 3D - PARAMETRIC & LITHOPHANE STUDIO */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3D پرنٹنگ اسٹوڈیو / 3D Printing Studio</span>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-indigo-500" />
              <span>LuminaPrint 3D - لیمپ شیڈ و لیتھوفین اسٹوڈیو (Parametric & Lithophane)</span>
            </CardTitle>
            <CardDescription className="text-sm">
              کلائنٹس کے لیے کسٹم لیمپ شیڈز، لیتھوفین فوٹو ڈرمز، اسلامی جالی لیمپ اور ڈیکوریشن لائٹنگ خود ڈیزائن کریں، بلب ٹیسٹ کریں اور براہِ راست 3D پرنٹنگ کے لیے <strong>.STL فائل</strong> ڈاؤنلوڈ کریں۔
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-sm">
              <Link href="/dashboard/lampshade-studio">
                <Lightbulb className="w-4 h-4" />
                <span>3D اسٹوڈیو کھولیں (Open 3D Studio)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <Download className="w-4 h-4 text-indigo-500 shrink-0" />
              <span><strong>1-کلک STL ڈاؤنلوڈ:</strong> Bambu Studio، Cura اور PrusaSlicer کے لیے واٹر ٹائٹ فائل</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span><strong>روشنی و بلب سمولیشن:</strong> اندرونی بلب جلا کر لیتھوفین تصویر کا چمکتا ہوا اثر دیکھیں</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border">
              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>وزن و قیمت کا حساب:</strong> گرامز، متوقع پرنٹ ٹائم اور مٹیریل لاگت کا فوری تخمینہ</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
