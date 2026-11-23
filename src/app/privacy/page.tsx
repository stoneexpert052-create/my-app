import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  Database,
  Eye,
  Cookie,
  Share2,
  Lock,
  UserCheck,
  Trash2,
  Phone,
  Mail,
  ArrowLeft,
  FileText,
  Building2,
} from 'lucide-react';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Privacy Policy | پرائیویسی پالیسی — Stone Expert',
  description:
    'Read how Stone Expert (stoneexpert.net) collects, uses, protects, and manages customer and supplier data, cookies, and deletion requests.',
  alternates: {
    canonical: 'https://stoneexpert.net/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — Stone Expert (stoneexpert.net)',
    description:
      'Transparent bilingual privacy policy explaining how Stone Expert collects, uses, and safeguards your personal information.',
    url: 'https://stoneexpert.net/privacy',
    siteName: 'Stone Expert',
    type: 'website',
  },
};

interface PrivacySection {
  id: string;
  number: string;
  titleEn: string;
  titleUr: string;
  icon: React.ComponentType<{ className?: string }>;
  pointsEn: string[];
  pointsUr: string[];
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'data-collected',
    number: '01',
    titleEn: 'Information We Collect',
    titleUr: 'ہم صارفین کا کون سا ڈیٹا جمع کرتے ہیں',
    icon: Database,
    pointsEn: [
      'Contact & Order Information: When you request a quotation, submit an order, or contact us, we collect your name, phone/WhatsApp number, email address, and project/delivery address.',
      'Project & Measurement Details: Room sizes, marble/granite selections, thickness preferences, cutting plans, and uploaded site reference photos that you voluntarily share for accurate estimates.',
      'Supplier & Partner Details: Business name, contact person, rate lists, and material stock photos submitted through our Supplier or Become-a-Partner portals.',
      'Basic Technical Data: Browser type, device screen size, preferred language (English/Urdu), and essential diagnostic data needed to keep the website fast and reliable.',
    ],
    pointsUr: [
      'رابطہ اور آرڈر کی معلومات: جب آپ کوٹیشن مانگتے ہیں، آرڈر بک کرواتے ہیں یا ہم سے رابطہ کرتے ہیں تو ہم آپ کا نام، فون یا واٹس ایپ نمبر، ای میل اور ڈلیوری/سائٹ کا پتہ جمع کرتے ہیں۔',
      'پراجیکٹ اور پیمائش کا ڈیٹا: کمروں کی پیمائش، منتخب کردہ ماربل یا گرینائٹ، موٹائی، کٹنگ پلان اور سائٹ کی تصاویر جو آپ خود درست تخمینے کے لیے فراہم کرتے ہیں۔',
      'سپلائر اور پارٹنر معلومات: سپلائر پورٹل کے ذریعے جمع کرایا گیا کاروباری نام، رابطہ نمبر، ریٹ لسٹ اور اسٹاک کی تصاویر۔',
      'بنیادی تکنیکی معلومات: آپ کی منتخب زبان (اردو یا انگریزی)، ڈیوائس کی نوعیت اور بنیادی تکنیکی ڈیٹا تاکہ ویب سائٹ تیز اور درست طریقے سے کام کرے۔',
    ],
  },
  {
    id: 'how-we-use',
    number: '02',
    titleEn: 'How We Use Your Information',
    titleUr: 'ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں',
    icon: Eye,
    pointsEn: [
      'Preparing exact marble, granite, tile, and fixing quotations tailored to your home or commercial project.',
      'Confirming, cutting, dispatching, and tracking your orders from our I-9/3 Islamabad yard to your construction site.',
      'Coordinating site measurements, fixing/polishing team visits, and customer support via phone or WhatsApp.',
      'Publishing verified supplier stock availability and keeping live rates accurate across the Stone Expert app.',
      'We NEVER sell, rent, or trade your personal phone number, email, or project information to third-party telemarketers or data brokers.',
    ],
    pointsUr: [
      'آپ کے گھر یا کمرشل پراجیکٹ کے لیے ماربل، گرینائٹ، ٹائلز اور فکسنگ کا بالکل درست کوٹیشن تیار کرنے کے لیے۔',
      'ہمارے آئی نائن (I-9/3) اسلام آباد یارڈ سے آپ کی سائٹ تک آرڈر کی کٹنگ، ترسیل اور آن لائن ٹریکنگ مکمل کرنے کے لیے۔',
      'سائٹ کی پیمائش، فکسنگ و پالش ٹیم کے شیڈول اور واٹس ایپ یا کال کے ذریعے کسٹمر سپورٹ فراہم کرنے کے لیے۔',
      'ایپ پر تازہ ترین ریٹس اور سپلائرز کے دستیاب اسٹاک کو درست اور اپڈیٹ رکھنے کے لیے۔',
      'ہم آپ کا فون نمبر، ای میل یا ذاتی ڈیٹا کبھی کسی اشتہاری کمپنی یا تیسرے فریق کو فروخت یا شیئر نہیں کرتے۔',
    ],
  },
  {
    id: 'cookies-storage',
    number: '03',
    titleEn: 'Cookies & Local Browser Storage',
    titleUr: 'کوکیز اور براؤزر اسٹوریج کا استعمال',
    icon: Cookie,
    pointsEn: [
      'We use essential browser storage (localStorage) to remember your preferred language (English/Urdu), saved quotation cart items, and estimator calculations so you do not lose progress.',
      'For authorized Stone Expert administrators connecting official social media accounts (Facebook, Instagram, TikTok), we store encrypted HttpOnly session cookies strictly for publishing official Stone Expert updates.',
      'You can clear cookies or local storage from your browser settings at any time; however, some saved quotation drafts may reset.',
    ],
    pointsUr: [
      'ہم ضروری براؤزر اسٹوریج استعمال کرتے ہیں تاکہ آپ کی منتخب کردہ زبان (اردو/انگلش)، کوٹیشن کارٹ اور کیلکولیٹر کا حساب محفوظ رہے اور بار بار محنت نہ کرنی پڑے۔',
      'صرف سٹون ایکسپرٹ کے مجاز ایڈمنز کے لیے آفیشل سوشل میڈیا اکاؤنٹس (فیس بک، انسٹاگرام، ٹک ٹاک) کنیکٹ کرنے پر انکرپٹڈ محفوظ کوکیز استعمال کی جاتی ہیں۔',
      'آپ کسی بھی وقت اپنے براؤزر کی سیٹنگز سے کوکیز اور اسٹوریج ڈیلیٹ کر سکتے ہیں، تاہم ایسا کرنے پر محفوظ کردہ کوٹیشن ڈرافٹ ری سیٹ ہو سکتے ہیں۔',
    ],
  },
  {
    id: 'third-party',
    number: '04',
    titleEn: 'Third-Party Services & Social Integrations',
    titleUr: 'تھرڈ پارٹی سروسز اور سوشل میڈیا انٹیگریشنز',
    icon: Share2,
    pointsEn: [
      'Cloud Infrastructure: Order records, product catalogs, and quotation data are securely stored using Google Cloud / Firebase services with industry-standard encryption.',
      'Communication & Maps: Clicking WhatsApp, Phone, or Google Maps links opens those external apps under their own respective privacy policies.',
      'Social Media Publishing APIs: Our admin portal integrates with official Meta (Facebook & Instagram) and TikTok OAuth APIs solely so Stone Expert administrators can publish official rate lists and product posts to Stone Expert’s own business pages. We do not access private messages or unrelated personal data.',
    ],
    pointsUr: [
      'کلاؤڈ ہوسٹنگ: آرڈرز، پروڈکٹ ریٹس اور کوٹیشنز کا ڈیٹا گوگل کلاؤڈ اور فائر بیس کے محفوظ سرورز پر انکرپشن کے ساتھ محفوظ رکھا جاتا ہے۔',
      'واٹس ایپ اور گوگل میپس: واٹس ایپ چیٹ، کال یا گوگل میپس لوکیشن پر کلک کرنے پر متعلقہ ایپس کھلتی ہیں جن پر ان کی اپنی پرائیویسی پالیسی لاگو ہوتی ہے۔',
      'سوشل میڈیا کنیکشن: ایڈمن پینل میں فیس بک، انسٹاگرام اور ٹک ٹاک کا آفیشل لاگ ان صرف سٹون ایکسپرٹ کے اپنے بزنس پیجز پر روزانہ کے ریٹس اور پروڈکٹ پوسٹس شائع کرنے کے لیے استعمال ہوتا ہے؛ کسی صارف کے ذاتی پیغامات یا غیر متعلقہ ڈیٹا تک رسائی حاصل نہیں کی جاتی۔',
    ],
  },
  {
    id: 'security',
    number: '05',
    titleEn: 'Data Security & Retention',
    titleUr: 'ڈیٹا کی حفاظت اور مدتِ محفوظیت',
    icon: Lock,
    pointsEn: [
      'All connections to stoneexpert.net are encrypted using HTTPS (SSL/TLS) to protect your data in transit.',
      'Administrative dashboards, supplier approvals, and server credentials are protected with strict role-based access controls and server-side security rules.',
      'We retain order invoices, challans, and quotation records only for as long as needed to fulfill orders, provide after-sales support, and comply with legal/accounting requirements.',
    ],
    pointsUr: [
      'ویب سائٹ stoneexpert.net پر تمام رابطے اور ڈیٹا کی منتقلی HTTPS (SSL/TLS) انکرپشن کے ذریعے مکمل طور پر محفوظ ہوتی ہے۔',
      'ایڈمن پینل، سپلائر پورٹل اور سرور کیز کو سخت سیکیورٹی قوانین اور محدود رسائی (Role-Based Access) کے تحت محفوظ رکھا جاتا ہے۔',
      'ہم آرڈر انوائسز اور کوٹیشن ریکارڈ صرف اتنے عرصے تک محفوظ رکھتے ہیں جتنا آرڈر کی تکمیل، کسٹمر سپورٹ اور قانونی/اکاؤنٹنگ ضروریات کے لیے لازمی ہو۔',
    ],
  },
  {
    id: 'user-rights',
    number: '06',
    titleEn: 'Your Privacy Rights & Data Deletion Requests',
    titleUr: 'آپ کے حقوق اور اپنا ڈیٹا حذف (Delete) کروانے کا طریقہ',
    icon: UserCheck,
    pointsEn: [
      'Access & Correction: You may request a copy of the personal contact or order details we hold about you and ask us to correct any inaccurate information.',
      'Data Deletion Request: You can request deletion of your personal contact details, quotation drafts, or connected social session data at any time by emailing stoneexpert052@gmail.com with the subject "Data Deletion Request" or messaging our official WhatsApp at 0300-3634052. Verified requests are processed within 7 business days.',
      'Children’s Privacy: Our construction and stone-supply services are intended for adults (18+) and business users; we do not knowingly collect personal information from children.',
      'Policy Updates: We may revise this Privacy Policy occasionally to reflect new features or legal requirements. Any updates will be published on this page with an updated effective date.',
    ],
    pointsUr: [
      'ڈیٹا تک رسائی اور تصحیح: آپ کسی بھی وقت ہم سے اپنے محفوظ کردہ نام، نمبر یا آرڈر کی معلومات کی کاپی حاصل کر سکتے ہیں یا کسی غلطی کی درستگی کروا سکتے ہیں۔',
      'ڈیٹا ڈیلیٹ کروانے کا طریقہ: اگر آپ اپنا ذاتی ڈیٹا، کوٹیشن ریکارڈ یا سوشل اکاؤنٹ کنیکشن مستقل طور پر حذف کروانا چاہتے ہیں تو ہمیں ای میل stoneexpert052@gmail.com پر "Data Deletion Request" لکھ کر بھیجیں یا واٹس ایپ 0300-3634052 پر رابطہ کریں۔ تصدیق کے بعد 7 کاروباری دنوں میں آپ کا ڈیٹا حذف کر دیا جائے گا۔',
      'بچوں کی پرائیویسی: ہماری سروسز بالغ افراد اور کاروباری صارفین کے لیے ہیں، ہم جان بوجھ کر بچوں کا ذاتی ڈیٹا جمع نہیں کرتے۔',
      'پالیسی میں تبدیلیاں: نئے فیچرز یا قانونی تقاضوں کے تحت اس پرائیویسی پالیسی کو اپڈیٹ کیا جا سکتا ہے اور نئی تبدیلی اسی صفحے پر شائع کی جائے گی۔',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />

      <main className="flex-1 mt-16 md:mt-24">
        {/* Top Hero Banner */}
        <section className="relative overflow-hidden border-b border-emerald-500/20 bg-slate-950 text-white py-12 md:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_55%)] pointer-events-none" />
          <div className="container relative z-10 max-w-5xl mx-auto px-4 md:px-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home / ہوم پیج پر واپس جائیں
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Terms &amp; Conditions / شرائط و ضوابط
              </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-emerald-400/40 p-2 flex items-center justify-center shrink-0 shadow-lg">
                <Image
                  src="/logo.svg"
                  alt="Stone Expert Logo"
                  width={48}
                  height={48}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Data Protection &amp; Transparency • stoneexpert.net</span>
                </div>
                <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-white">
                  Privacy Policy{' '}
                  <span className="text-emerald-300 font-sans font-extrabold block sm:inline sm:ml-2" dir="rtl">
                    | پرائیویسی پالیسی
                  </span>
                </h1>
                <p className="text-sm text-slate-300 max-w-3xl">
                  Your trust matters to us. Learn exactly what information Stone Expert collects,
                  how we use it to serve your orders, and how we keep your data safe. Effective Date:
                  November 2026.
                </p>
              </div>
            </div>

            {/* Quick Section Jump Links */}
            <div className="flex flex-wrap gap-2 pt-2">
              {PRIVACY_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-800 hover:border-emerald-400/50 text-slate-200 hover:text-emerald-300 transition-colors"
                >
                  {sec.number}. {sec.titleEn}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Main Bilingual Sections */}
        <section className="py-10 md:py-14">
          <div className="container max-w-5xl mx-auto px-4 md:px-6 space-y-6">
            {PRIVACY_SECTIONS.map((section) => {
              const IconComp = section.icon;
              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 md:px-6 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                          Section {section.number}
                        </span>
                        <h2 className="text-lg md:text-xl font-extrabold text-foreground leading-tight">
                          {section.titleEn}
                        </h2>
                      </div>
                    </div>
                    <h3
                      dir="rtl"
                      className="text-base md:text-lg font-bold text-emerald-700 dark:text-emerald-400 text-right"
                    >
                      {section.titleUr}
                    </h3>
                  </div>

                  <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* English Column */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        English
                      </div>
                      <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
                        {section.pointsEn.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Urdu Column */}
                    <div
                      dir="rtl"
                      className="space-y-3 lg:border-r lg:border-border/60 lg:pr-6 text-right"
                    >
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        اردو وضاحت
                      </div>
                      <ul className="space-y-3 text-sm md:text-[15px] leading-loose text-foreground/90">
                        {section.pointsUr.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Data Deletion & Privacy Contact Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950 text-white p-6 md:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-extrabold">Privacy &amp; Data Deletion Contact</h2>
                </div>
                <p dir="rtl" className="text-base font-bold text-emerald-300">
                  پرائیویسی یا ڈیٹا حذف کروانے کے لیے براہِ راست رابطہ کریں
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white">Stone Expert Head Office</p>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Plot # 375-A, Potohar Road, I-9/3, Islamabad
                    </p>
                    <p dir="rtl" className="text-slate-400 text-xs mt-1">
                      پلاٹ نمبر 375-A، پوٹھوہار روڈ، آئی نائن تھری (I-9/3)، اسلام آباد
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white">Phone &amp; WhatsApp Support</p>
                    <p className="text-slate-300 text-xs mt-0.5 font-mono">
                      0300-3634052 (Fida Hussain — CEO)
                    </p>
                    <p className="text-slate-300 text-xs font-mono">
                      0303-1512554 (Fayyaz Hussain)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white">Privacy Email</p>
                    <a
                      href="mailto:stoneexpert052@gmail.com"
                      className="text-emerald-300 hover:underline text-xs block mt-0.5"
                    >
                      stoneexpert052@gmail.com
                    </a>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Response within 7 business days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/40 py-6 px-4 md:px-8">
        <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="Stone Expert"
                width={24}
                height={24}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <span className="font-headline font-extrabold text-sm" style={{ color: '#dfb96c' }}>
              Stone Expert
            </span>
          </Link>
          <div className="flex items-center gap-5 font-semibold">
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Contact Us
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Stone Expert (stoneexpert.net). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
