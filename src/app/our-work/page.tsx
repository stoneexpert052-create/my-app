'use client';

import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MapPin, Eye } from 'lucide-react';
import Link from 'next/link';
import { Icons } from '@/components/icons';

const projects = [
  {
    titleEn: 'Luxury Badal Staircase & Sills',
    titleUr: 'لگری بادل ماربل سیڑھیاں',
    locationEn: 'DHA Phase 6, Rawalpindi',
    locationUr: 'ڈی ایچ اے فیز 6، راولپنڈی',
    categoryEn: 'Staircase',
    categoryUr: 'سیڑھیاں',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
  },
  {
    titleEn: 'Ziarat White Mirror Floor',
    titleUr: 'زیارت وائٹ آئینہ نما فرش',
    locationEn: 'Bahria Town Phase 4, Islamabad',
    locationUr: 'بحریا ٹاؤن فیز 4، اسلام آباد',
    categoryEn: 'Flooring',
    categoryUr: 'فرش',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  },
  {
    titleEn: 'Polished Black Granite Countertop',
    titleUr: 'چمکدار بلیک گرینائٹ کچن کاؤنٹر',
    locationEn: 'G-11, Islamabad',
    locationUr: 'جی-11، اسلام آباد',
    categoryEn: 'Kitchen Counter',
    categoryUr: 'کچن کاؤنٹر',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=800&q=80',
  },
  {
    titleEn: 'Custom Travertine Vanity Unit',
    titleUr: 'خصوصی ٹریورٹائن باتھ روم وینٹی',
    locationEn: 'F-8/3, Islamabad',
    locationUr: 'ایف-8/3، اسلام آباد',
    categoryEn: 'Bathroom Vanity',
    categoryUr: 'باتھ روم وینٹی',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80',
  },
  {
    titleEn: 'Golden Granite Entrance Steps',
    titleUr: 'سنہری گرینائٹ داخلی سیڑھیاں',
    locationEn: 'Chaklala Scheme III, Rawalpindi',
    locationUr: 'چکلاٹہ اسکیم III، راولپنڈی',
    categoryEn: 'Entrance',
    categoryUr: 'داخلی راستہ',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  },
  {
    titleEn: 'Verona Marble Fireplace Cladding',
    titleUr: 'ورونا ماربل فائر پلیس وال ٹائل',
    locationEn: 'Koral Town, Islamabad',
    locationUr: 'کورال ٹاؤن، اسلام آباد',
    categoryEn: 'Wall Cladding',
    categoryUr: 'دیوار کی سجاوٹ',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
];

export default function OurWorkPage() {
  const { t, language } = useLanguage();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 bg-background mt-16 md:mt-28">
        {/* Header */}
        <section className="w-full bg-muted/30 border-b py-12 md:py-16">
          <div className="container px-4 md:px-6 text-center max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{language === 'ur' ? 'ہمارا کام' : 'Our Legacy'}</span>
            </div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-foreground">
              {language === 'ur' ? 'ہمارے مکمل شدہ پروجیکٹس' : 'Our Completed Work'}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              {language === 'ur'
                ? 'راولپنڈی اور اسلام آباد کے معروف رہائشی اور کمرشل مقامات پر پریمیم فنشنگ کے ساتھ نصب کردہ ماربل اور گرینائٹ کی جھلکیاں۔'
                : 'A curated showcase of our high-gloss floor polishing, kitchen counters, custom vanities, and staircase installations executed with absolute precision.'}
            </p>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-16">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <div key={index} className="group overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all flex flex-col">
                  {/* Image Container */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <Image
                      src={project.image}
                      alt={project.titleEn}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-background/95 hover:bg-background text-foreground/90 backdrop-blur-sm shadow-sm font-semibold border text-xs">
                        {language === 'ur' ? project.categoryUr : project.categoryEn}
                      </Badge>
                    </div>
                  </div>
                  {/* Content Container */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-headline text-lg font-bold group-hover:text-primary transition-colors">
                        {language === 'ur' ? project.titleUr : project.titleEn}
                      </h3>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{language === 'ur' ? project.locationUr : project.locationEn}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
