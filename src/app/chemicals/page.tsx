
'use client';

import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default function ChemicalsPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Marble Chemicals
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl">
              High-quality chemicals for marble fixing, polishing, and maintenance.
            </p>
          </div>
        </section>
        <section className="w-full pb-12 md:pb-24 lg:pb-32">
          <div className="container px-4 md:px-6">
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg">Content for Chemicals coming soon.</p>
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
