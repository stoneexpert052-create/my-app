'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminAiErrorBoundary } from '@/components/admin-ai/error-boundary';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Database,
  Mic,
  ArrowLeft,
  Tag,
  FileSpreadsheet,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AdminLiveSupervisor = dynamic(
  () => import('@/components/admin-ai/admin-live-supervisor').then((m) => m.AdminLiveSupervisor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[520px] rounded-2xl border border-amber-500/30 bg-slate-950 text-slate-300 gap-2 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        <span>لائیو ایڈمن سپروائزر لوڈ ہو رہا ہے...</span>
      </div>
    ),
  }
);

const AdminAiChatInterface = dynamic(
  () => import('@/components/admin-ai/chat-interface').then((m) => m.AdminAiChatInterface),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[520px] rounded-2xl border bg-background text-muted-foreground gap-2 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        <span>AI آپریشنز چیٹ و OCR لوڈ ہو رہا ہے...</span>
      </div>
    ),
  }
);

export default function AdminAiAssistantPage() {
  const [mode, setMode] = useState<'live' | 'ocr'>('live');

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-foreground flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-md">
                <Sparkles className="h-6 w-6" />
              </span>
              <span>AI Operations & Live Supervisor</span>
            </h1>
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-2.5 py-0.5 uppercase tracking-wider">
              Live Voice + OCR
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            سٹون ایکسپرٹ لائیو ایڈمن سپروائزر — نئے آرڈرز کے فوری الرٹس، اسٹاک مینجمنٹ، ریٹ لسٹ OCR اور قیمتوں کا مکمل کنٹرول۔
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('live')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer',
                mode === 'live'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>لائیو وائس سپروائزر</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('ocr')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer',
                mode === 'ocr'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>ریٹ لسٹ OCR و چیٹ</span>
            </button>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span>واپس ایڈمن ڈیش بورڈ</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Live Order Alerts</p>
              <p className="text-[11px] text-muted-foreground truncate">نیا آرڈر آتے ہی آواز میں اطلاع</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Stock & Catalog Audit</p>
              <p className="text-[11px] text-muted-foreground truncate">ختم و کم اسٹاک کی فوری نگرانی</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Human Approval Gate</p>
              <p className="text-[11px] text-muted-foreground truncate">تبدیلی سے قبل اوکے طلب کرے گا</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Rate Sheet OCR & Sale</p>
              <p className="text-[11px] text-muted-foreground truncate">تصویر سے ریٹس و بلک ڈسکاؤنٹ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Assistant Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3">
          <AdminAiErrorBoundary fallbackTitle="ایڈمن AI اسسٹنٹ لوڈ کرنے میں مسئلہ آیا">
            {mode === 'live' ? <AdminLiveSupervisor compact={false} /> : <AdminAiChatInterface />}
          </AdminAiErrorBoundary>
        </div>

        {/* Sidebar Help / Instructions */}
        <div className="space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-amber-500" />
                <span>نمونہ احکامات (Voice / Text)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                آپ لائیو سپروائزر کو اردو یا انگریزی میں یہ سب کہہ سکتے ہیں:
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 text-xs space-y-2.5 text-muted-foreground">
              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">آرڈرز کی نگرانی:</span>
                <p className="italic">&ldquo;نئے اور پینڈنگ آرڈرز بتائیں&rdquo;</p>
                <p className="italic">&ldquo;آرڈر کو In Progress کر دیں&rdquo;</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">اسٹاک و دستیابی:</span>
                <p className="italic">&ldquo;کون سے پتھر Out of Stock ہیں؟&rdquo;</p>
                <p className="italic">&ldquo;زیارت وائٹ ماربل کو Out of Stock کر دو&rdquo;</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">ریٹ تبدیل کرنا و بلک سیل:</span>
                <p className="italic">&ldquo;سنی وائٹ ماربل کا ریٹ 150 روپے کر دو&rdquo;</p>
                <p className="italic">&ldquo;تمام ماربلز پر 15 فیصد ڈسکاؤنٹ لگا دو&rdquo;</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">فوری نیویگیشن:</span>
                <p className="italic">&ldquo;اسٹاک مینجمنٹ یا آرڈرز پیج کھول دیں&rdquo;</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>گارنٹی اور کنٹرول</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                سپروائزر خود بخود کچھ بھی تبدیل نہیں کرے گا۔ جب تک آپ سامنے دکھائے گئے کارڈ پر{' '}
                <strong>تائید (Confirm)</strong> نہیں کریں گے، ڈیٹا بیس میں کوئی تبدیلی نہیں ہو گی۔
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
