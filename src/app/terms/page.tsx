import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileText,
  ShieldCheck,
  Scale,
  Truck,
  Calculator,
  Users,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Terms & Conditions | شرائط و ضوابط — Stone Expert',
  description:
    'Official Terms & Conditions governing marble, granite, tile supply, fixing & polishing services, online quotations, and supplier portals on Stone Expert (stoneexpert.net).',
  alternates: {
    canonical: 'https://stoneexpert.net/terms',
  },
  openGraph: {
    title: 'Terms & Conditions — Stone Expert (stoneexpert.net)',
    description:
      'Service rules, pricing & quotation terms, delivery policies, and user responsibilities for Stone Expert Islamabad & Rawalpindi.',
    url: 'https://stoneexpert.net/terms',
    siteName: 'Stone Expert',
    type: 'website',
  },
};

interface PolicySection {
  id: string;
  number: string;
  titleEn: string;
  titleUr: string;
  icon: React.ComponentType<{ className?: string }>;
  pointsEn: string[];
  pointsUr: string[];
}

const TERMS_SECTIONS: PolicySection[] = [
  {
    id: 'acceptance',
    number: '01',
    titleEn: 'Acceptance of Terms & Platform Scope',
    titleUr: 'شرائط کی منظوری اور ویب سائٹ کا دائرہ کار',
    icon: CheckCircle2,
    pointsEn: [
      'By accessing or using stoneexpert.net, our mobile web app, online cost calculators, digital brochures, or placing an order with Stone Expert, you agree to be bound by these Terms & Conditions.',
      'Stone Expert provides Pakistani and imported marble, granite, quartz, floor/wall tiles, kitchen countertops, staircase slabs, fixing chemicals, and professional marble fixing & polishing services across Islamabad, Rawalpindi, and Pakistan.',
      'If you are using the platform on behalf of a construction company, contractor, or supplier, you confirm that you are authorized to bind that organization to these terms.',
    ],
    pointsUr: [
      'ویب سائٹ stoneexpert.net، آن لائن ریٹ کیلکولیٹر، ڈیجیٹل بروشر استعمال کرنے یا سٹون ایکسپرٹ کو کوئی بھی آرڈر دینے کا مطلب یہ ہے کہ آپ ان شرائط و ضوابط سے مکمل اتفاق کرتے ہیں۔',
      'سٹون ایکسپرٹ اسلام آباد، راولپنڈی اور پورے پاکستان میں پاکستانی و امپورٹڈ ماربل، گرینائٹ، کوارٹز، ٹائلز، کچن کاؤنٹرز، سیڑھیوں، فکسنگ کیمیکلز اور پروفیشنل فکسنگ و پالش سروسز فراہم کرتا ہے۔',
      'اگر آپ کسی کنسٹرکشن کمپنی، ٹھیکیدار یا سپلائر کی جانب سے یہ سروس استعمال کر رہے ہیں تو آپ اس بات کی تصدیق کرتے ہیں کہ آپ کو اپنی کمپنی کی نمائندگی کا مکمل اختیار حاصل ہے۔',
    ],
  },
  {
    id: 'pricing',
    number: '02',
    titleEn: 'Pricing, Online Quotations & Natural Stone Variations',
    titleUr: 'ریٹس، آن لائن کوٹیشنز اور قدرتی پتھر کی خصوصیات',
    icon: Calculator,
    pointsEn: [
      'All rates listed on Stone Expert are stated in Pakistani Rupees (PKR) per square foot, running foot, bag, or piece as specified and reflect live ex-factory / Islamabad I-9/3 yard pricing.',
      'Online calculations from our Estimator and Build-Your-Home tools serve as accurate preliminary quotations. Final billing is always confirmed after physical lot selection and verified site measurements.',
      'Marble and granite are 100% natural geological products; minor variations in shade, veining, crystal texture, and natural patterns between sample photos and full lots are normal and not considered defects.',
      'Prices may be revised without prior notice due to quarry extraction, transport, or market fluctuations, except for confirmed orders where advance payment has already been received.',
    ],
    pointsUr: [
      'سٹون ایکسپرٹ ایپ پر درج تمام ریٹس پاکستانی روپے (PKR) میں فی اسکوائر فٹ، رننگ فٹ، بیگ یا پیس کے حساب سے ہوتے ہیں جو ہمارے آئی نائن (I-9/3) یارڈ اور فیکٹری کے لائیو ریٹس ہیں۔',
      'ہمارے آن لائن ایسٹیمیٹر اور بلڈ یور ہوم کیلکولیٹر سے حاصل ہونے والا تخمینہ ابتدائی کوٹیشن ہوتا ہے؛ حتمی بل سائٹ کی درست پیمائش اور لاٹ کے انتخاب کے بعد فائنل کیا جاتا ہے۔',
      'ماربل اور گرینائٹ سو فیصد قدرتی پتھر ہیں، اس لیے تصویر اور اصل لاٹ کے رنگ، ریشوں (veins) یا شیڈ میں ہلکا سا قدرتی فرق معمول کی بات ہے اور اسے نقص شمار نہیں کیا جاتا۔',
      'مارکیٹ یا کرایوں میں تبدیلی کی صورت میں ریٹس تبدیل ہو سکتے ہیں، البتہ جن آرڈرز کی ایڈوانس ادائیگی ہو چکی ہو ان کے طے شدہ ریٹس برقرار رہتے ہیں۔',
    ],
  },
  {
    id: 'orders',
    number: '03',
    titleEn: 'Orders, Advance Payments & Delivery Terms',
    titleUr: 'آرڈر کی تصدیق، ایڈوانس ادائیگی اور ترسیل (Delivery)',
    icon: Truck,
    pointsEn: [
      'Standard and custom-cut material orders are confirmed upon receipt of the agreed advance deposit (typically 50% for custom cutting, stairs, or special-order slabs). Remaining balance is payable prior to dispatch or upon delivery as agreed on the invoice.',
      'Delivery dates provided at booking are estimated timelines. While we strive for punctual dispatch, delays caused by extreme weather, road closures, quarry transport, or force majeure events shall not constitute a breach of contract.',
      'Transportation, loading, and unloading charges are billed separately unless explicitly included in a written package quotation. Safe access for delivery vehicles and unloading labor at the construction site is the customer’s responsibility.',
      'Customers or their site supervisors must inspect material quality, thickness, and quantity at the time of delivery before signing the delivery challan.',
    ],
    pointsUr: [
      'عام اور کسٹم کٹنگ آرڈرز طے شدہ ایڈوانس ادائیگی (عموماً کسٹم کٹنگ، سیڑھیوں یا اسپیشل سلیبز کے لیے 50% ایڈوانس) موصول ہونے کے بعد کنفرم کیے جاتے ہیں، جبکہ بقیہ رقم مال روانہ کرنے سے پہلے یا ڈلیوری کے وقت ادا کی جاتی ہے۔',
      'بکنگ کے وقت دی گئی ڈلیوری تاریخ متوقع ہوتی ہے؛ موسم کی خرابی، راستوں کی بندش یا ناگہانی حالات کی وجہ سے معمولی تاخیر کو معاہدے کی خلاف ورزی تصور نہیں کیا جائے گا۔',
      'ٹرانسپورٹ، لوڈنگ اور ان لوڈنگ کے اخراجات علیحدہ ہوں گے سوائے اس کے کہ وہ تحریری پیکیج میں شامل ہوں۔ سائٹ پر گاڑی پہنچنے اور مال اتارنے کا محفوظ انتظام کسٹمر کی ذمہ داری ہے۔',
      'کسٹمر یا سائٹ سپروائزر پر لازم ہے کہ ڈلیوری چالان پر دستخط کرنے سے پہلے مٹیریل کی کوالٹی، موٹائی اور تعداد موقع پر چیک کر لیں۔',
    ],
  },
  {
    id: 'responsibilities',
    number: '04',
    titleEn: 'Customer, Contractor & Supplier Responsibilities',
    titleUr: 'صارفین، ٹھیکیداروں اور سپلائرز کی ذمہ داریاں',
    icon: Users,
    pointsEn: [
      'Customers must provide accurate contact numbers, delivery addresses, and site readiness (water, electricity, leveled sub-base, and safe working access) before Stone Expert fixing or polishing teams arrive.',
      'For custom sizes (e.g., kitchen countertops, CNC inlay borders, or cut-to-size steps), the customer or their architect is responsible for verifying exact dimensions before cutting begins.',
      'Registered suppliers using the Stone Expert Supplier Portal must submit accurate, honest rate lists, genuine stock photographs, and verified thickness/size specifications. Misleading listings may result in immediate portal suspension.',
      'Users agree not to submit fake orders, spam inquiries, attempt unauthorized access to administrative dashboards, or copy proprietary rate tables and branding without written consent.',
    ],
    pointsUr: [
      'کسٹمرز کی ذمہ داری ہے کہ وہ درست فون نمبر، مکمل ایڈریس اور فکسنگ یا پالش ٹیم کے آنے سے پہلے سائٹ پر پانی، بجلی اور محفوظ کام کی سہولت یقینی بنائیں۔',
      'کسٹم سائز (مثلاً کچن کاؤنٹر، سیڑھیاں یا ڈیزائن کٹنگ) شروع ہونے سے پہلے درست پیمائش کی تصدیق کروانا کسٹمر یا ان کے آرکیٹیکٹ کی ذمہ داری ہے۔',
      'سپلائر پورٹل استعمال کرنے والے سپلائرز پر لازم ہے کہ وہ بالکل درست ریٹ لسٹ، اپنے اصل اسٹاک کی تصاویر اور صحیح سائز و موٹائی درج کریں۔ غلط معلومات دینے پر سپلائر اکاؤنٹ معطل کیا جا سکتا ہے۔',
      'صارفین پابند ہیں کہ وہ جعلی آرڈرز نہ بھیجیں، ایڈمن سسٹم تک غیر قانونی رسائی کی کوشش نہ کریں اور سٹون ایکسپرٹ کے لوگو، کیلکولیٹر یا ریٹ لسٹ کا غلط استعمال نہ کریں۔',
    ],
  },
  {
    id: 'returns',
    number: '05',
    titleEn: 'Cancellations, Returns & Damage Claims',
    titleUr: 'آرڈر کی منسوخی، واپسی اور نقصان کی شکایات',
    icon: AlertTriangle,
    pointsEn: [
      'Custom-cut slabs, sized stair treads/risers, beveled borders, and specially ordered materials cannot be cancelled, returned, or exchanged once cutting or factory dispatch has started.',
      'Standard unopened fixing chemicals or uncut stock tiles may be exchanged within 7 days of delivery only if returned in original undamaged condition at the buyer’s transport cost.',
      'Any claim regarding breakage in transit, wrong item, or short quantity must be reported within 24 hours of delivery via WhatsApp (0300-3634052) along with clear photos and the invoice/challan number.',
    ],
    pointsUr: [
      'کسٹم کٹنگ کیے گئے سلیبز، سیڑھیوں کے اسٹیپس، بارڈرز اور اسپیشل آرڈر پر منگوایا گیا مٹیریل کٹنگ یا ڈسپیچ شروع ہونے کے بعد منسوخ یا واپس نہیں کیا جا سکتا۔',
      'معیاری بند کیمیکل بیگز یا بغیر کٹنگ والی اسٹاک ٹائلز ڈلیوری کے 7 دن کے اندر صرف اصل اور محفوظ حالت میں واپس یا تبدیل کی جا سکتی ہیں، جس کا کرایہ خریدار کے ذمہ ہوگا۔',
      'ترسیل کے دوران ٹوٹ پھوٹ، غلط مٹیریل یا کم تعداد کی کسی بھی شکایت کی اطلاع ڈلیوری کے 24 گھنٹے کے اندر واضح تصاویر اور چالان نمبر کے ساتھ واٹس ایپ (0300-3634052) پر دینا ضروری ہے۔',
    ],
  },
  {
    id: 'liability',
    number: '06',
    titleEn: 'Limitation of Liability, Intellectual Property & Governing Law',
    titleUr: 'ذمہ داری کی حدود، ملکیتی حقوق اور قانونی دائرہ اختیار',
    icon: Scale,
    pointsEn: [
      'All website design, logos, calculators, brochures, photographs, and software on stoneexpert.net are the intellectual property of Stone Expert and protected under applicable laws.',
      'Stone Expert’s total liability for any verified claim relating to supplied material or services shall not exceed the actual invoiced value of the specific defective portion of the order. We are not liable for indirect construction delays caused by third-party contractors.',
      'These Terms & Conditions are governed by the laws of the Islamic Republic of Pakistan. Any dispute that cannot be resolved amicably shall fall under the jurisdiction of the courts of Islamabad.',
      'We may update these Terms periodically to reflect service improvements. Continued use of stoneexpert.net after updates constitutes acceptance of the revised Terms.',
    ],
    pointsUr: [
      'ویب سائٹ stoneexpert.net کا تمام ڈیزائن، لوگو، کیلکولیٹر، بروشرز اور مواد سٹون ایکسپرٹ کی ملکیت ہے اور قانونی طور پر محفوظ ہے۔',
      'کسی بھی ثابت شدہ شکایت کی صورت میں سٹون ایکسپرٹ کی زیادہ سے زیادہ ذمہ داری صرف اس مخصوص ناقص حصے کے انوائس کی رقم تک محدود ہوگی۔ کسی تیسرے فریق یا ٹھیکیدار کی تاخیر کی ذمہ داری ہم پر عائد نہیں ہوگی۔',
      'یہ تمام شرائط و ضوابط اسلامی جمہوریہ پاکستان کے قوانین کے تحت نافذ العمل ہیں اور کسی بھی تنازع کا قانونی دائرہ اختیار اسلام آباد کی عدالتیں ہوں گی۔',
      'سروس کی بہتری کے لیے ان شرائط میں وقتاً فوقتاً تبدیلی کی جا سکتی ہے، اور ویب سائٹ کا مسلسل استعمال تازہ ترین شرائط کی منظوری شمار ہوگا۔',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />

      <main className="flex-1 mt-16 md:mt-24">
        {/* Top Hero Banner */}
        <section className="relative overflow-hidden border-b border-amber-500/20 bg-slate-950 text-white py-12 md:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,185,108,0.18),transparent_55%)] pointer-events-none" />
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
                href="/privacy"
                className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Privacy Policy / پرائیویسی پالیسی
              </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-amber-400/40 p-2 flex items-center justify-center shrink-0 shadow-lg">
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
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Official Legal Agreement • stoneexpert.net</span>
                </div>
                <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-white">
                  Terms &amp; Conditions{' '}
                  <span className="text-amber-300 font-sans font-extrabold block sm:inline sm:ml-2" dir="rtl">
                    | سروسز کے اصول و ضوابط
                  </span>
                </h1>
                <p className="text-sm text-slate-300 max-w-3xl">
                  Clear rules, service commitments, and responsibilities for customers, contractors,
                  and suppliers using Stone Expert. Effective Date: November 2026.
                </p>
              </div>
            </div>

            {/* Quick Section Jump Links */}
            <div className="flex flex-wrap gap-2 pt-2">
              {TERMS_SECTIONS.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 transition-colors"
                >
                  {sec.number}. {sec.titleEn.split('&')[0].trim()}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Main Bilingual Sections */}
        <section className="py-10 md:py-14">
          <div className="container max-w-5xl mx-auto px-4 md:px-6 space-y-6">
            {TERMS_SECTIONS.map((section) => {
              const IconComp = section.icon;
              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 md:px-6 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                          Clause {section.number}
                        </span>
                        <h2 className="text-lg md:text-xl font-extrabold text-foreground leading-tight">
                          {section.titleEn}
                        </h2>
                      </div>
                    </div>
                    <h3
                      dir="rtl"
                      className="text-base md:text-lg font-bold text-amber-700 dark:text-amber-400 text-right"
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
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
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
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        اردو وضاحت
                      </div>
                      <ul className="space-y-3 text-sm md:text-[15px] leading-loose text-foreground/90">
                        {section.pointsUr.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Official Contact Card */}
            <div className="rounded-2xl border border-amber-500/30 bg-slate-950 text-white p-6 md:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-extrabold">Questions About These Terms?</h2>
                </div>
                <p dir="rtl" className="text-base font-bold text-amber-300">
                  ان شرائط کے بارے میں کسی بھی سوال کے لیے رابطہ کریں
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white">Head Office / مرکزی دفتر</p>
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
                    <p className="font-bold text-white">Phone &amp; WhatsApp</p>
                    <p className="text-slate-300 text-xs mt-0.5 font-mono">
                      Fida Hussain (CEO): 0300-3634052
                    </p>
                    <p className="text-slate-300 text-xs font-mono">
                      Fayyaz Hussain: 0303-1512554
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-white">Official Email &amp; Website</p>
                    <a
                      href="mailto:stoneexpert052@gmail.com"
                      className="text-amber-300 hover:underline text-xs block mt-0.5"
                    >
                      stoneexpert052@gmail.com
                    </a>
                    <a
                      href="https://stoneexpert.net"
                      className="text-slate-300 hover:text-white text-xs block mt-0.5"
                    >
                      https://stoneexpert.net
                    </a>
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
            <Link href="/terms" className="text-primary underline underline-offset-4">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">
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
