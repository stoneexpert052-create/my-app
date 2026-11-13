'use client';

import React from 'react';
import { AdminAiChatInterface } from '@/components/admin-ai/chat-interface';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShieldCheck, Zap, Database, Mic, ArrowLeft, Tag, Layers, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminAiAssistantPage() {
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
              <span>AI Operations Manager</span>
            </h1>
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-2.5 py-0.5 uppercase tracking-wider">
              Gemini 3.8 Powered
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            سٹون ایکسپرٹ اسمارٹ ایڈمن اے آئی — قدرتی زبان میں پرامپٹ دے کر ریٹس، اسٹاک، ڈسکاؤنٹس اور تصاویر کنٹرول کریں۔
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Live Cloud Firestore</p>
              <p className="text-[11px] text-muted-foreground truncate">تمام ریٹس و اسٹاک سے مربوط</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Mic className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Voice Urdu & English</p>
              <p className="text-[11px] text-muted-foreground truncate">مائیک پر بول کر حکم دیں</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-amber-500/20 backdrop-blur-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">Bulk Sale & Pricing</p>
              <p className="text-[11px] text-muted-foreground truncate">یک مشت سیل و رعایت</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3">
          <AdminAiChatInterface />
        </div>

        {/* Sidebar Help / Instructions */}
        <div className="space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-amber-500" />
                <span>نمونہ پرامپٹس (Examples)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                آپ اے آئی کو اردو یا انگریزی میں یہ سب کچھ کہہ سکتے ہیں:
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 text-xs space-y-2.5 text-muted-foreground">
              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">🔹 ریٹ تبدیل کرنا:</span>
                <p className="italic">"سنی وائٹ ماربل کا ریٹ 150 روپے کر دو"</p>
                <p className="italic">"ٹائل بونڈ کا ریٹ PKR 650 کر دو"</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">🔹 بلک سیل و ڈسکاؤنٹ:</span>
                <p className="italic">"عید کے موقع پر تمام ماربلز پر 15 فیصد ڈسکاؤنٹ لگا دو"</p>
                <p className="italic">"تمام پروڈکٹس سے سیل ڈسکاؤنٹ ہٹا دو"</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">🔹 اسٹاک و دستیابی:</span>
                <p className="italic">"زیارت وائٹ ماربل کو Out of Stock کر دو"</p>
                <p className="italic">"کون سے پروڈکٹس کا اسٹاک ختم ہے؟"</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">🔹 تصویر اپڈیٹ کرنا:</span>
                <p className="italic">"سنی وائٹ کی تصویر https://... کر دو"</p>
              </div>

              <div className="p-2 rounded-lg bg-muted/50 border space-y-1">
                <span className="font-bold text-foreground block">🔹 تعمیراتی لاگت (Build Your Home):</span>
                <p className="italic">"بلڈ یور ہوم میں بیس ریٹ 130 کر دو"</p>
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
                اے آئی خود بخود کچھ بھی نہیں بدلے گا۔ جب تک آپ چیٹ کے اندر دکھائے گئے کارڈ پر <strong>'اوکے / تائید اور لاگو کریں'</strong> کا بٹن نہیں دبائیں گے، ڈیٹا بیس میں کوئی ردوبدل نہیں ہو گا۔
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
