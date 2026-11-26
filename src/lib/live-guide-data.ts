export interface PortalGuidePayload {
  topic: string;
  titleUr: string;
  titleEn: string;
  stepsUr: string[];
  stepsEn: string[];
}

export function getPortalGuide(topic: string): PortalGuidePayload {
  const guides: Record<string, PortalGuidePayload> = {
    simple: {
      topic: 'simple',
      titleUr: 'سادہ فرش و رقبہ کیلکولیٹر کا طریقہ',
      titleEn: 'How to Use Simple Floor Calculator',
      stepsUr: [
        '1. سب سے پہلے پتھر کا سائز اور موٹائی (4 سوتر ٹائل یا 6 سوتر سلیب) منتخب کریں۔',
        '2. پیمائش کا یونٹ فٹ (Feet) یا انچ (Inches) چنیں۔',
        '3. کمرے کی لمبائی اور چوڑائی درج کریں — کل اسکوائر فٹ اور رقم فوراً آ جائے گی۔',
        '4. اختیاری اسکرٹنگ شامل کر کے "Save" بٹن دبائیں، اور پھر دیگر ماربل سے موازنہ (Compare) کریں۔',
      ],
      stepsEn: [
        '1. Choose stone size and thickness (4-Sutar tile or 6-Sutar slab).',
        '2. Pick Feet or Inches unit.',
        '3. Enter Length and Width to see exact Sq.Ft and PKR total.',
        '4. Add optional skirting, press Save, then compare against other stones.',
      ],
    },
    floor: {
      topic: 'floor',
      titleUr: 'مکمل گھر / ملٹی روم فلور ڈیزائنر',
      titleEn: 'Multi-Room Floor Designer Guide',
      stepsUr: [
        '1. ہر کمرے (مثلاً TV Lounge، Bedroom) کا نام، لمبائی اور چوڑائی فٹ میں درج کریں۔',
        '2. دیوار کے ساتھ اسکرٹنگ (4 انچ پٹی) چاہیے تو ٹوگل آن کر دیں۔',
        '3. تمام کمروں کا مشترکہ رقبہ اور کل لاگت چیک کر کے Save دبائیں۔',
        '4. "تمام مواد کا موازنہ کریں (Compare)" دبا کر ایک کلک میں زِیارت وائٹ، سنی وائٹ یا گرینائٹ کی قیمتیں برابر رکھ کر دیکھیں۔',
      ],
      stepsEn: [
        '1. Add each room name, length, and width in Feet.',
        '2. Toggle wall skirting on/off as needed.',
        '3. Check combined Sq.Ft and total PKR, then click Save.',
        '4. Click Compare Materials to view side-by-side prices for other marbles.',
      ],
    },
    kitchen: {
      topic: 'kitchen',
      titleUr: 'کچن کاؤنٹر ٹاپ ڈیزائنر کا طریقہ',
      titleEn: 'Kitchen Countertop Calculator Guide',
      stepsUr: [
        '1. کچن کا نقشہ منتخب کریں: Straight (سیدھا)، L-Shape (ایل شیپ) یا U-Shape۔',
        '2. سلیب کی لمبائی اور گہرائی انچ میں لکھیں (معیاری گہرائی 24 انچ ہوتی ہے)۔',
        '3. اگر سنک (Sink) یا چولہے (Stove) کا کٹ آؤٹ اور سامنے کا ڈبل بارڈر یا گولہ چاہیے تو شامل کریں۔',
        '4. لائیو 2D ڈایاگرام اور کل قیمت دیکھ کر Save دبائیں — بعد میں گرینائٹ بمقابلہ کوریان موازنہ بھی کر سکتے ہیں۔',
      ],
      stepsEn: [
        '1. Pick Straight, L-Shape, or U-Shape layout.',
        '2. Enter counter length and depth in inches (standard depth is 24").',
        '3. Add Sink/Stove cutouts and Double Border or Bullnose edge profile.',
        '4. Review the 2D diagram and Save to compare Granite vs Quartz/Corian rates.',
      ],
    },
    vanity: {
      topic: 'vanity',
      titleUr: 'باتھ روم وینٹی کیلکولیٹر کا طریقہ',
      titleEn: 'Bathroom Vanity Calculator Guide',
      stepsUr: [
        '1. وینٹی کی شکل (Straight، L-Shape یا Cut Corner) منتخب کریں۔',
        '2. لمبائی اور گہرائی انچ میں درج کریں (عموماً 36×20 انچ)۔',
        '3. بیسن کٹ آؤٹ، دیوار پٹی (Backsplash) اور سامنے/سائیڈ کی لٹک (Lutak) سیٹ کریں۔',
        '4. Save کر کے مختلف ماربل و گرینائٹ میں قیمت موازنہ کریں۔',
      ],
      stepsEn: [
        '1. Pick Straight, L-Shape, or Cut Corner vanity layout.',
        '2. Enter length and depth in inches (typical 36"×20").',
        '3. Add basin cutout, backsplash, and front/side lutak drops.',
        '4. Save to compare costs across different marble & granite stones.',
      ],
    },
    stairs: {
      topic: 'stairs',
      titleUr: 'سیڑھیوں (Staircase) کے ڈیزائنر اور آٹو کیڈ ویو کا طریقہ',
      titleEn: 'Staircase Designer & AutoCAD View Guide',
      stepsUr: [
        '1. انچ میں اسٹیپ کی لمبائی (چوڑائی)، ٹریڈ (عام طور پر 12 انچ)، رائزر (7 انچ) اور کل اسٹیپس کی تعداد لکھیں۔',
        '2. موڑ پر چوکی (Landing) یا 2/3 اسٹیپ ونڈر (Winder) شامل کریں اور آٹو کیڈ سائیڈ ویو میں کل اونچائی دیکھیں۔',
        '3. لیفٹ، رائٹ، فرنٹ، بیک لٹک یا فرنٹ گولہ/ڈبل بارڈر منتخب کریں۔',
        '4. Save دبائیں اور تمام سیڑھیوں کے لیے گرینائٹ بمقابلہ ماربل کا موازنہ دیکھیں۔',
      ],
      stepsEn: [
        '1. Enter step length, tread (12"), riser (7"), and total step count.',
        '2. Add landings or 2/3-step winders and verify height in AutoCAD side view.',
        '3. Select Left/Right/Front/Back lutak drops and front edge molding (Gola).',
        '4. Save and compare total staircase cost across granite & marble options.',
      ],
    },
    'window-sill': {
      topic: 'window-sill',
      titleUr: 'کھڑکی سِل (Window Sill) کیلکولیٹر',
      titleEn: 'Window Sill Calculator Guide',
      stepsUr: [
        '1. کھڑکی کی لمبائی، دیوار کی چوڑائی (9–11 انچ) اور کھڑکیوں کی تعداد لکھیں۔',
        '2. سامنے کے کنارے کی پالش یا گولہ منتخب کریں۔',
        '3. Save دبا کر اپنے کوٹیشن میں شامل کریں۔',
      ],
      stepsEn: [
        '1. Enter window length, wall width (9–11"), and quantity.',
        '2. Pick front edge polish/gola.',
        '3. Save to add to your quotation.',
      ],
    },
    compare: {
      topic: 'compare',
      titleUr: 'مٹیریل اور قیمتوں کے موازنہ (Comparison) کا طریقہ',
      titleEn: 'How Material Comparison Works',
      stepsUr: [
        '1. اپنے کوٹیشن میں کوئی بھی آئٹم (فرش، سیڑھی، کچن یا وینٹی) Save کرنے کے بعد "تمام مواد کا موازنہ کریں" بٹن دبائیں۔',
        '2. کمپیریزن پیج پر آپ کا وہی سائز لوکل ماربل، امپورٹڈ ماربل، گرینائٹ اور ٹائلز پر خود بخود حساب ہو کر کم سے زیادہ قیمت کے مطابق آ جاتا ہے۔',
        '3. کسی بھی متبادل پتھر پر "Swap / تبدیل کریں" دبانے سے پورا کوٹیشن فوراً نئے ریٹ پر اپ ڈیٹ ہو جاتا ہے۔',
      ],
      stepsEn: [
        '1. After saving any room, stair, kitchen, or vanity item, click "Compare All Materials".',
        '2. Your exact dimensions are recalculated across Local/Imported Marble, Granite & Tiles sorted lowest to highest cost.',
        '3. Click Swap on any stone to immediately update your entire quotation.',
      ],
    },
    catalog: {
      topic: 'catalog',
      titleUr: 'سٹون ایکسپرٹ مٹیریل کیٹلاگ اور رہنمائی',
      titleEn: 'Stone Expert Materials Guide',
      stepsUr: [
        '1. لوکل اور امپورٹڈ ماربل: زیارت وائٹ، سنی وائٹ، بادل، بوٹی سینا، ٹاویرا — فرش اور دیواروں کے لیے بہترین۔',
        '2. گرینائٹ: بلیک اینڈ گولڈ، سلکی بلیک، ٹروپیکل گرے — کچن کاؤنٹر ٹاپس اور سیڑھیوں کے لیے انتہائی مضبوط۔',
        '3. دیگر مواد: 12×24 ٹائلز، کوریان، فیساڈ اسٹون، ایم ڈی ایم، فکسنگ کیمیکلز، اور پالشنگ و فکسنگ لیبر سروسز۔',
      ],
      stepsEn: [
        '1. Local & Imported Marble: Ziarat White, Sunny White, Badal, Botticino — ideal for floors.',
        '2. Granite: Black & Gold, Silky Black, Tropical Grey — ultra-durable for kitchens & stairs.',
        '3. Other Materials: 12×24 Tiles, Corian, Facade Stone, MDM, Fixing Chemicals & Polishing Services.',
      ],
    },
  };

  return guides[topic] || guides.catalog;
}
