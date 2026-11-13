import { Metadata } from 'next';
import { Header } from '@/components/header';
import { RepresentativesSection } from '@/components/representatives-section';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, ShieldCheck, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Regional Representative - Fayyaz Hussain (DHA 2 Islamabad) | Stone Expert',
  description: 'Stone Expert authorized representative Fayyaz Hussain for Islamabad DHA Phase 2, Rawalpindi, and surrounding areas. Call: 0303-1512554.',
};

export default function RepresentativesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 pt-24 pb-16 max-w-7xl">
        {/* Top breadcrumb & back button */}
        <div className="flex items-center justify-between pb-6 border-b border-border/60 mb-8">
          <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home (ہوم پیج)</span>
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <MapPin className="w-3.5 h-3.5" />
            <span>Pakistan Nationwide Network</span>
          </div>
        </div>

        {/* Hero introduction banner */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-card border border-amber-500/30 p-6 sm:p-10 mb-10 shadow-xs">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Stone Expert Official Directory
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              علاقائی نمائندے و رابطہ انچارج
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              پاکستان کے تمام بڑے شہروں اور صوبوں میں ہمارے نامزد نمائندے اور انجینئرز دستیاب ہیں۔ ماربل و گرینائٹ کی سلیکشن، فیکٹری ریٹس، لوڈر گاڑیوں کی ترسیل اور سائٹ پر پیمائش کے لیے براہِ راست اپنے قریبی نمائندے سے کال یا واٹس ایپ پر رابطہ کریں۔
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/60 text-xs sm:text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40">
              <Phone className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground">ڈائریکٹ فون و واٹس ایپ</p>
                <p className="text-xs text-muted-foreground">نمائندے سے فوری رابطہ اور کوٹیشن</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground">سائٹ وزٹ و پیمائش</p>
                <p className="text-xs text-muted-foreground">گھر یا پلازہ پر درست پیمائش</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground">اصلی ماربل و گرینائٹ گارنٹی</p>
                <p className="text-xs text-muted-foreground">کوالٹی چیک اور فیکٹری رسید</p>
              </div>
            </div>
          </div>
        </div>

        {/* The interactive Representatives Section with region picker */}
        <RepresentativesSection showTitle={false} />
      </main>

      <footer className="bg-secondary text-secondary-foreground py-8 border-t">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} Stone Expert Pakistan. All rights reserved.</p>
          <p>مرکزی ہیلپ لائن: 0339-9991052 | فیکٹری و مرکزی ماربل یارڈ، راولپنڈی و اسلام آباد</p>
        </div>
      </footer>
    </div>
  );
}
