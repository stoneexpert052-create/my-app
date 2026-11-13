'use client';

import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function ServicesPage() {
  const { t, language } = useLanguage();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background mt-16 md:mt-28">
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto space-y-6">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              {language === 'ur' ? 'ہماری پریمیم سروسز' : 'Our Professional Services'}
            </h1>
            <p className="mx-auto text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed">
              {language === 'ur'
                ? 'سٹون ایکسپرٹ آپ کے گھر کی تعمیر اور خوبصورتی کے لیے جدید تراش خراش، پالش اور فٹنگ سروسز فراہم کرتا ہے۔'
                : 'From standard edge-profiling to specialized stone floor restoration, we deliver end-to-end expertise for all types of marble and granite.'}
            </p>
            <div className="pt-8">
              <Button asChild size="lg" className="bg-[#dfb96c] hover:bg-[#dfb96c]/90 text-black font-bold h-12 rounded-full px-8">
                <Link href="/renovation">
                  <span>{language === 'ur' ? 'ہماری رینوویشن سروسز دیکھیں' : 'Explore Renovation Services'}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex w-full shrink-0 flex-col sm:flex-row items-center justify-between gap-4 border-t px-4 py-6 md:px-8 bg-muted/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 relative flex items-center justify-center rounded-full overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
            <Icons.logo alt="Stone Expert Logo" className="object-contain h-full w-full p-0.5" />
          </div>
          <span className="font-headline text-lg font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
        </Link>
        <p className="text-xs text-foreground/70">{t('footer_text')}</p>
      </footer>
    </div>
  );
}
