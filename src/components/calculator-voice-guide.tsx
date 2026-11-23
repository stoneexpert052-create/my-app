'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Hand,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';

export type GuidedCalculatorType =
  | 'simple'
  | 'kitchen'
  | 'vanity'
  | 'stairs'
  | 'window-sill'
  | 'floor'
  | 'labor_quote';

interface GuideStep {
  stepNumber: number;
  targetStepId: string;
  shortEn: string;
  shortUr: string;
  titleEn: string;
  titleUr: string;
  instructionEn: string;
  instructionUr: string;
  exampleEn: string;
  exampleUr: string;
  speechEn: string;
  speechUr: string;
}

interface CalculatorGuideSpec {
  nameEn: string;
  nameUr: string;
  introEn: string;
  introUr: string;
  steps: GuideStep[];
}

export const CALCULATOR_GUIDES: Record<GuidedCalculatorType, CalculatorGuideSpec> = {
  simple: {
    nameEn: 'Simple Area & Floor Calculator',
    nameUr: 'سادہ پیمائش اور فرش کیلکولیٹر',
    introEn:
      'Welcome to the Simple Calculator. Follow 4 easy steps: pick your stone size, choose Feet or Inches, enter Length and Width, and press Save.',
    introUr:
      'سادہ کیلکولیٹر میں خوش آمدید۔ صرف 4 آسان مراحل مکمل کریں: پتھر کا سائز چنیں، فٹ یا انچ منتخب کریں، لمبائی اور چوڑائی لکھیں، اور سیو بٹن دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Stone Size',
        shortUr: 'سائز چنیں',
        titleEn: 'Select Stone Format & Thickness',
        titleUr: 'پہلے پتھر کا سائز اور موٹائی چنیں',
        instructionEn:
          'Choose your preferred size and thickness (for example 4-Sutar tiles or 6-Sutar slabs) from the Format dropdown.',
        instructionUr:
          'پہلے خانے سے اپنی پسند کا سائز اور موٹائی منتخب کریں (مثلاً 4 سوتر ٹائل یا 6 سوتر سلیب)۔ ریٹ خود بخود لگ جائے گا۔',
        exampleEn: 'Example: 12"×24" Tile (4-Sutar) or Full Slab (6-Sutar)',
        exampleUr: 'مثال: 12×24 ٹائل (4 سوتر) یا فل سلیب (6 سوتر)',
        speechEn:
          'Step 1. Select your stone size and thickness from the Material Format menu. The exact app rate will update automatically.',
        speechUr:
          'مرحلہ ایک۔ پہلے مٹیریل فارمیٹ سے پتھر کا سائز اور موٹائی چنیں۔ اصل ریٹ خود بخود شامل ہو جائے گا۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Feet / Inches',
        shortUr: 'فٹ یا انچ',
        titleEn: 'Choose Measurement Unit (Feet or Inches)',
        titleUr: 'پیمانہ چنیں (فٹ یا انچ)',
        instructionEn:
          'Tap Feet if you measured a room (like 12 ft × 10 ft), or tap Inches for smaller areas.',
        instructionUr:
          'اگر آپ نے کمرے کی پیمائش فٹ میں کی ہے تو فٹ (Feet) بٹن دبائیں، اور اگر انچ میں ہے تو انچ (Inches) بٹن دبائیں۔',
        exampleEn: 'Tip: Most room floors are measured in Feet (ft)',
        exampleUr: 'مشورہ: عام کمرے کے فرش کی پیمائش فٹ میں ہوتی ہے',
        speechEn:
          'Step 2. Choose your measurement unit. Tap Feet for rooms and floors, or Inches for smaller pieces.',
        speechUr:
          'مرحلہ دو۔ اپنا پیمانہ چنیں۔ کمروں اور فرش کے لیے فٹ بٹن دبائیں، یا چھوٹے حصوں کے لیے انچ منتخب کریں۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Length × Width',
        shortUr: 'لمبائی × چوڑائی',
        titleEn: 'Enter Length and Width (or Total Sq.Ft)',
        titleUr: 'لمبائی (Length) اور چوڑائی (Width) لکھیں',
        instructionEn:
          'Type the Length in the first box and Width in the second box. Total Sq.Ft and exact PKR cost appear instantly below.',
        instructionUr:
          'پہلے خانے میں لمبائی (Length) اور دوسرے خانے میں چوڑائی (Width) لکھیں۔ کل اسکوائر فٹ اور مکمل قیمت فوراً نیچے آ جائے گی۔',
        exampleEn: 'Example: Length = 12, Width = 10 → 120 Sq.Ft',
        exampleUr: 'مثال: لمبائی 12 اور چوڑائی 10 لکھیں → کل 120 اسکوائر فٹ',
        speechEn:
          'Step 3. Type the length in the first box and the width in the second box. Your total square feet and price will calculate immediately.',
        speechUr:
          'مرحلہ تین۔ پہلے خانے میں لمبائی اور دوسرے خانے میں چوڑائی لکھیں۔ کل اسکوائر فٹ اور مکمل قیمت فوراً نکل آئے گی۔',
      },
      {
        stepNumber: 4,
        targetStepId: '4',
        shortEn: 'Save Quote',
        shortUr: 'محفوظ کریں',
        titleEn: 'Optional Skirting & Press Save',
        titleUr: 'اسکرٹنگ (اختیاری) لکھیں اور Save بٹن دبائیں',
        instructionEn:
          'If you want wall skirting (patti), type total running feet (RFT). Otherwise leave it blank and press Save to Quotation.',
        instructionUr:
          'اگر دیوار کے ساتھ اسکرٹنگ پٹی لگوانی ہے تو رننگ فٹ لکھیں، ورنہ خالی چھوڑ کر نیچے Save بٹن دبائیں تاکہ یہ آپ کے کوٹیشن میں شامل ہو جائے۔',
        exampleEn: 'Final Step: Tap "Save to Quotation" at the bottom',
        exampleUr: 'آخری قدم: نیچے Save بٹن دبا کر کوٹیشن محفوظ کریں',
        speechEn:
          'Step 4. Add optional wall skirting if needed, review your total price, and tap Save to add this to your quotation.',
        speechUr:
          'مرحلہ چار۔ اگر اسکرٹنگ چاہیے تو رننگ فٹ لکھیں، کل قیمت چیک کریں اور نیچے سیو بٹن دبا کر کوٹیشن محفوظ کریں۔',
      },
    ],
  },

  kitchen: {
    nameEn: 'Kitchen Countertop Calculator',
    nameUr: 'کچن کاؤنٹر کیلکولیٹر',
    introEn:
      'Welcome to the Kitchen Counter Calculator. Pick your kitchen shape, type slab length and depth in inches, add sink or stove cutouts, and press Save.',
    introUr:
      'کچن کاؤنٹر کیلکولیٹر میں خوش آمدید۔ پہلے کچن کی شکل چنیں، پھر سلیب کی لمبائی اور چوڑائی انچ میں لکھیں، سنک یا چولہے کا کٹ آؤٹ شامل کریں اور سیو دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Kitchen Shape',
        shortUr: 'کچن کی شکل',
        titleEn: 'Choose Kitchen Layout Shape',
        titleUr: 'پہلے کچن کی شکل (Shape) منتخب کریں',
        instructionEn:
          'Select Straight (1 wall), L-Shape Left/Right (2 walls), or U-Shape (3 walls) matching your kitchen slab.',
        instructionUr:
          'اپنے کچن کے مطابق شکل چنیں: Straight (سیدھا ایک دیوار)، L-Shape (دو دیواریں ایل شیپ)، یا U-Shape (تین دیواریں یو شیپ)۔',
        exampleEn: 'Most Pakistani kitchens are Straight or L-Shape',
        exampleUr: 'مشورہ: زیادہ تر کچن سیدھے (Straight) یا ایل شیپ (L-Shape) ہوتے ہیں',
        speechEn:
          'Step 1 for Kitchen. Select your kitchen shape: Straight, L-Shape, or U-Shape.',
        speechUr:
          'کچن کا پہلا مرحلہ۔ اپنے کچن کی شکل چنیں، سیدھا، ایل شیپ، یا یو شیپ۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Slab Inches',
        shortUr: 'سلیب پیمائش',
        titleEn: 'Enter Length & Width of Each Counter Side',
        titleUr: 'ہر کچن سلیب کی لمبائی اور چوڑائی لکھیں',
        instructionEn:
          'Type the Length and Width (depth) of your counter top. Standard kitchen counter depth is 24 inches (2 feet).',
        instructionUr:
          'اپنے کچن سلیب کی لمبائی اور چوڑائی (گہرائی) لکھیں۔ عام کچن کاؤنٹر کی چوڑائی 24 انچ (2 فٹ) ہوتی ہے۔',
        exampleEn: 'Example: Top Slab Length = 96 inches, Width = 24 inches',
        exampleUr: 'مثال: لمبائی 96 انچ اور چوڑائی 24 انچ',
        speechEn:
          'Step 2. Enter the length and width of each kitchen slab in inches. Standard counter depth is 24 inches.',
        speechUr:
          'دوسرا مرحلہ۔ ہر کچن سلیب کی لمبائی اور چوڑائی انچ میں لکھیں۔ معیاری کچن چوڑائی چوبیس انچ ہوتی ہے۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Sink & Edge',
        shortUr: 'سنک اور بارڈر',
        titleEn: 'Add Sink / Stove Cutout & Front Edge Gola',
        titleUr: 'سنک یا چولہا کٹ آؤٹ اور اگلے کنارے کا گولہ چنیں',
        instructionEn:
          'Click "+ Add Sink" or "+ Add Stove" if you need cutouts, and pick your front edge profile (Tukker, Double Border, or Bullnose).',
        instructionUr:
          'اگر کچن میں سنک یا چولہے کی کٹنگ کروانی ہے تو Sink یا Stove بٹن دبائیں، اور سامنے کے کنارے کے لیے گولہ یا ڈبل بارڈر منتخب کریں۔',
        exampleEn: 'Tip: Select Double/Triple Border for luxury thick front look',
        exampleUr: 'مشورہ: خوبصورت موٹے کنارے کے لیے ڈبل بارڈر یا ہاف گولہ چنیں',
        speechEn:
          'Step 3. Add a sink or stove cutout if required, and select your front edge polish or double border design.',
        speechUr:
          'تیسرا مرحلہ۔ اگر سنک یا چولہے کا کٹ آؤٹ چاہیے تو شامل کریں، اور سامنے کے کنارے کا بارڈر یا گولہ چنیں۔',
      },
      {
        stepNumber: 4,
        targetStepId: '4',
        shortEn: 'Save Kitchen',
        shortUr: 'محفوظ کریں',
        titleEn: 'Check Total Price & Save to Quotation',
        titleUr: 'کل قیمت چیک کریں اور Save دبائیں',
        instructionEn:
          'Check the live 2D diagram and itemized cost (material + edge polish + cutouts), then tap Save.',
        instructionUr:
          'اوپر اپنا نقشہ اور نیچے مکمل قیمت (پتھر، بارڈر پالش اور کٹ آؤٹ) چیک کریں اور Save بٹن دبا دیں۔',
        exampleEn: 'Final Step: Press Save to add this Kitchen to your quote',
        exampleUr: 'آخری قدم: Save بٹن دبا کر کچن کوٹیشن محفوظ کریں',
        speechEn:
          'Step 4. Review your kitchen diagram and total price, then tap Save to add it to your quotation.',
        speechUr:
          'آخری مرحلہ۔ کچن کا نقشہ اور کل قیمت دیکھ کر سیو بٹن دبائیں۔',
      },
    ],
  },

  vanity: {
    nameEn: 'Bathroom Vanity Calculator',
    nameUr: 'باتھ روم وینٹی کیلکولیٹر',
    introEn:
      'Welcome to the Bathroom Vanity Calculator. Choose the vanity shape, enter length and depth, set basin cutout and front drop, then tap Save.',
    introUr:
      'باتھ روم وینٹی کیلکولیٹر میں خوش آمدید۔ پہلے وینٹی کا ڈیزائن چنیں، لمبائی اور چوڑائی لکھیں، بیسن کٹ آؤٹ اور لٹک سیٹ کر کے سیو دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Vanity Shape',
        shortUr: 'وینٹی ڈیزائن',
        titleEn: 'Pick Vanity Top Shape',
        titleUr: 'وینٹی کا ڈیزائن منتخب کریں',
        instructionEn:
          'Choose Straight (standard bathroom counter), L-Shape, or Cut-Corner depending on your washroom wall.',
        instructionUr:
          'اپنے باتھ روم کے مطابق ڈیزائن چنیں: Straight (سیدھی وینٹی)، L-Shape (ایل شیپ)، یا Cut Corner (کونے والی)۔',
        exampleEn: 'Standard washrooms usually use a Straight Vanity Top',
        exampleUr: 'مثال: زیادہ تر واش رومز میں سیدھی (Straight) وینٹی لگتی ہے',
        speechEn:
          'Step 1 for Vanity. Choose your vanity shape: Straight, L-Shape, or Cut Corner.',
        speechUr:
          'وینٹی کا پہلا مرحلہ۔ اپنی وینٹی کی شکل چنیں، سیدھی، ایل شیپ یا کونے والی۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Length × Depth',
        shortUr: 'لمبائی × چوڑائی',
        titleEn: 'Enter Vanity Length & Width (Inches)',
        titleUr: 'وینٹی کی لمبائی اور چوڑائی انچ میں لکھیں',
        instructionEn:
          'Type the countertop Length and Width/Depth in inches. Typical washroom vanity size is 36 inches long by 20 inches deep.',
        instructionUr:
          'وینٹی ٹاپ کی لمبائی اور گہرائی انچ میں لکھیں۔ عام باتھ روم وینٹی 36 انچ لمبی اور 20 انچ چوڑی ہوتی ہے۔',
        exampleEn: 'Example: Length = 36 in, Width = 20 in',
        exampleUr: 'مثال: لمبائی 36 انچ اور چوڑائی 20 انچ',
        speechEn:
          'Step 2. Enter your vanity length and width in inches. A typical bathroom vanity is 36 by 20 inches.',
        speechUr:
          'دوسرا مرحلہ۔ وینٹی کی لمبائی اور چوڑائی انچ میں لکھیں۔ عام سائز چھتیس بائے بیس انچ ہوتا ہے۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Basin & Lutak',
        shortUr: 'بیسن اور لٹک',
        titleEn: 'Set Basin Cutout, Backsplash & Front Drop (Lutak)',
        titleUr: 'بیسن کٹ آؤٹ، دیوار پٹی اور اگلی لٹک (Lutak) سیٹ کریں',
        instructionEn:
          'Add your washbasin cutout (Undermount or Drop-in) and tick Backsplash or Front Lutak (apron) if you want side/front stone drops.',
        instructionUr:
          'اگر بیسن کٹنگ چاہیے تو Basin شامل کریں، اور اگر دیوار پر پٹی (Backsplash) یا سامنے لٹک (Lutak) لگوانی ہے تو اس پر ٹک کر کے اونچائی لکھیں۔',
        exampleEn: 'Tip: Front Lutak of 4–6 inches gives a modern floating vanity look',
        exampleUr: 'مشورہ: سامنے 4 سے 6 انچ لٹک سے جدید وینٹی لُک بنتا ہے',
        speechEn:
          'Step 3. Add a washbasin cutout and select optional backsplash or front drop lutak height.',
        speechUr:
          'تیسرا مرحلہ۔ واش بیسن کٹ آؤٹ شامل کریں اور ضرورت کے مطابق دیوار پٹی یا سامنے کی لٹک منتخب کریں۔',
      },
      {
        stepNumber: 4,
        targetStepId: '4',
        shortEn: 'Save Vanity',
        shortUr: 'محفوظ کریں',
        titleEn: 'Review Total Cost & Save',
        titleUr: 'کل قیمت دیکھیں اور Save دبائیں',
        instructionEn:
          'Verify your live vanity sketch and final PKR total, then click Save.',
        instructionUr:
          'اپنی وینٹی کا نقشہ اور مکمل قیمت چیک کر کے نیچے Save بٹن دبائیں۔',
        exampleEn: 'Final Step: Tap Save to add Vanity to your quotation',
        exampleUr: 'آخری قدم: Save دبا کر وینٹی کوٹیشن محفوظ کریں',
        speechEn:
          'Step 4. Check your vanity total price and press Save to add it to your quotation.',
        speechUr:
          'آخری مرحلہ۔ کل قیمت چیک کریں اور سیو بٹن دبا دیں۔',
      },
    ],
  },

  stairs: {
    nameEn: 'Staircase Calculator',
    nameUr: 'سیڑھیوں کا کیلکولیٹر',
    introEn:
      'Welcome to the Staircase Calculator. Choose inches or feet, enter your step length, tread width, riser height, and total number of steps, then press Save.',
    introUr:
      'سیڑھیوں کے کیلکولیٹر میں خوش آمدید۔ پہلے انچ یا فٹ چنیں، پھر اسٹیپ کی لمبائی، قدم کی چوڑائی، کھڑے پیس کی اونچائی اور کل سیڑھیوں کی تعداد لکھ کر سیو دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Unit & Floor',
        shortUr: 'پیمانہ اور فلور',
        titleEn: 'Choose Unit & Stair Location',
        titleUr: 'پیمانہ (انچ/فٹ) اور سیڑھی کی منزل چنیں',
        instructionEn:
          'Select Inches (recommended for stairs) and pick the floor (Ground Floor, First Floor, or Basement).',
        instructionUr:
          'سیڑھیوں کے لیے انچ (Inches) منتخب کریں اور منزل (گراؤنڈ فلور یا فرسٹ فلور) چن لیں۔',
        exampleEn: 'Recommended Unit: Inches',
        exampleUr: 'مشورہ: سیڑھیوں کی پیمائش انچ میں لکھنا سب سے آسان ہے',
        speechEn:
          'Step 1 for Stairs. Select Inches as your unit and choose which floor the staircase is on.',
        speechUr:
          'سیڑھیوں کا پہلا مرحلہ۔ پیمانے میں انچ منتخب کریں اور سیڑھی کی منزل چنیں۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Step Sizes',
        shortUr: 'اسٹیپ سائز',
        titleEn: 'Enter Step Length, Tread, Riser & Step Count',
        titleUr: 'اسٹیپ کی لمبائی، ٹریڈ، رائزر اور تعداد لکھیں',
        instructionEn:
          'Enter Step Length (width of staircase, e.g., 42"), Tread (foot step, usually 12"), Riser (vertical piece, usually 7"), and Quantity (number of steps, e.g., 18).',
        instructionUr:
          'سیڑھی کی چوڑائی/لمبائی (مثلاً 42 انچ)، قدم یعنی Tread (عام طور پر 12 انچ)، کھڑا پیس یعنی Riser (عام طور پر 7 انچ) اور کل سیڑھیوں کی تعداد (مثلاً 18) لکھیں۔',
        exampleEn: 'Example: Length 42" × Tread 12" × Riser 7" × 18 Steps',
        exampleUr: 'مثال: لمبائی 42 انچ، ٹریڈ 12 انچ، رائزر 7 انچ، تعداد 18 اسٹیپس',
        speechEn:
          'Step 2. Enter the step length, tread width, riser height, and total number of steps. A standard step is 42 inches long, 12 inch tread, and 7 inch riser.',
        speechUr:
          'دوسرا مرحلہ۔ سیڑھی کی لمبائی، قدم کی چوڑائی بارہ انچ، کھڑا پیس سات انچ اور کل سیڑھیوں کی تعداد لکھیں۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Edge Gola',
        shortUr: 'کنارہ / گولہ',
        titleEn: 'Choose Step Front Molding (Gola)',
        titleUr: 'سیڑھی کے اگلے کنارے کا گولہ (Molding) چنیں',
        instructionEn:
          'Pick your front edge finish (Half Bullnose, Full Bullnose, or Double Border) and add winders/turn steps if your stair turns.',
        instructionUr:
          'سیڑھی کے سامنے والے کنارے کے لیے گولہ یا ڈبل بارڈر چنیں، اور اگر موڑ پر ترچھے اسٹیپ (Winders) ہوں تو وہ بھی شامل کریں۔',
        exampleEn: 'Tip: Half-Bullnose or Double Gola protects step edges',
        exampleUr: 'مشورہ: ہاف گولہ یا ڈبل بارڈر سیڑھی کے کناروں کو مضبوط بناتا ہے',
        speechEn:
          'Step 3. Pick the front edge molding style for your steps, such as half bullnose or double border.',
        speechUr:
          'تیسرا مرحلہ۔ سیڑھی کے اگلے کنارے کے لیے گولہ یا ڈبل بارڈر منتخب کریں۔',
      },
      {
        stepNumber: 4,
        targetStepId: '4',
        shortEn: 'Save Stairs',
        shortUr: 'محفوظ کریں',
        titleEn: 'Verify Total Sq.Ft & Press Save',
        titleUr: 'کل اسکوائر فٹ اور قیمت دیکھ کر Save دبائیں',
        instructionEn:
          'Review the total marble area, molding cost, and grand total PKR, then click Save.',
        instructionUr:
          'کل اسکوائر فٹ، گولہ چارجز اور مکمل رقم چیک کریں اور نیچے Save بٹن دبائیں۔',
        exampleEn: 'Final Step: Tap Save to store Stairs in your quote',
        exampleUr: 'آخری قدم: Save دبا کر سیڑھیوں کا تخمینہ محفوظ کریں',
        speechEn:
          'Step 4. Check your staircase area and total price, then tap Save.',
        speechUr:
          'آخری مرحلہ۔ کل قیمت چیک کریں اور سیو بٹن دبائیں۔',
      },
    ],
  },

  'window-sill': {
    nameEn: 'Window Sill Calculator',
    nameUr: 'کھڑکی سِل / چوکھٹ کیلکولیٹر',
    introEn:
      'Welcome to the Window Sill Calculator. Enter each window length, wall depth, and number of windows, choose edge polish, and tap Save.',
    introUr:
      'کھڑکی سِل کیلکولیٹر میں خوش آمدید۔ کھڑکی کی لمبائی، دیوار کی چوڑائی اور کھڑکیوں کی تعداد لکھیں، کنارے کی پالش چنیں اور سیو دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Unit',
        shortUr: 'پیمانہ چنیں',
        titleEn: 'Select Inches or Feet',
        titleUr: 'انچ یا فٹ منتخب کریں',
        instructionEn:
          'Pick Inches (most common for window sills) or Feet before entering sizes.',
        instructionUr:
          'کھڑکی کی پیمائش کے لیے انچ (Inches) یا فٹ منتخب کریں۔',
        exampleEn: 'Recommended: Inches (e.g., 60 in × 10 in)',
        exampleUr: 'مثال: 60 انچ لمبی اور 10 انچ چوڑی کھڑکی',
        speechEn: 'Step 1 for Window Sills. Select Inches or Feet.',
        speechUr: 'کھڑکی سِل کا پہلا مرحلہ۔ انچ یا فٹ منتخب کریں۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Window Size',
        shortUr: 'کھڑکی سائز',
        titleEn: 'Type Window Length, Wall Width & Quantity',
        titleUr: 'کھڑکی کی لمبائی، چوڑائی اور تعداد لکھیں',
        instructionEn:
          'Enter the window Length, wall Depth/Width (e.g. 9"–11"), and Quantity (how many identical windows). Add more rows for different window sizes.',
        instructionUr:
          'کھڑکی کی لمبائی، دیوار کی چوڑائی (عموماً 9 سے 11 انچ) اور ایک جیسی کھڑکیوں کی تعداد لکھیں۔ مختلف سائز کے لیے نئی لائن شامل کریں۔',
        exampleEn: 'Example: 60" Long × 10" Wide × 4 Windows',
        exampleUr: 'مثال: لمبائی 60 انچ، چوڑائی 10 انچ، تعداد 4 کھڑکیاں',
        speechEn:
          'Step 2. Enter the window length, wall width, and number of windows.',
        speechUr:
          'دوسرا مرحلہ۔ کھڑکی کی لمبائی، دیوار کی چوڑائی اور کھڑکیوں کی تعداد لکھیں۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Edge Polish',
        shortUr: 'کنارہ پالش',
        titleEn: 'Pick Front Edge Polish & Save',
        titleUr: 'کنارے کی پالش چنیں اور Save دبائیں',
        instructionEn:
          'Select front edge gola/polish style, check your total PKR price, and press Save.',
        instructionUr:
          'سامنے کے کنارے کا گولہ یا پالش چنیں، کل قیمت چیک کریں اور نیچے Save بٹن دبائیں۔',
        exampleEn: 'Final Step: Tap Save to add Window Sills to quote',
        exampleUr: 'آخری قدم: Save دبا کر کھڑکیوں کا کوٹیشن محفوظ کریں',
        speechEn:
          'Step 3. Choose front edge polish, verify your total price, and tap Save.',
        speechUr:
          'تیسرا اور آخری مرحلہ۔ کنارے کی پالش چنیں اور سیو بٹن دبا دیں۔',
      },
    ],
  },

  floor: {
    nameEn: 'Multi-Room Floor Designer',
    nameUr: 'کمرہ اور فلور ڈیزائنر',
    introEn:
      'Welcome to the Floor Designer. Add each room with its length and width in feet, toggle wall skirting, and press Save to get your complete flooring quote.',
    introUr:
      'فلور ڈیزائنر میں خوش آمدید۔ اپنے ہر کمرے کا نام، لمبائی اور چوڑائی فٹ میں شامل کریں، اسکرٹنگ منتخب کریں اور مکمل قیمت کے لیے سیو دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Add Rooms',
        shortUr: 'کمرے شامل کریں',
        titleEn: 'Enter Room Name, Length & Width (Feet)',
        titleUr: 'کمرے کا نام، لمبائی اور چوڑائی فٹ میں لکھیں',
        instructionEn:
          'Enter your first room (e.g., TV Lounge: 18 ft × 14 ft). You can add Bedrooms, Drawing Room, and Veranda one by one.',
        instructionUr:
          'پہلے کمرے کا نام (مثلاً ٹی وی لاؤنج)، لمبائی اور چوڑائی فٹ میں لکھیں۔ اسی طرح تمام کمرے الگ الگ شامل کر سکتے ہیں۔',
        exampleEn: 'Example: Bedroom 1 = 14 ft × 12 ft',
        exampleUr: 'مثال: بیڈ روم 1 = 14 فٹ × 12 فٹ',
        speechEn:
          'Step 1 for Floor Designer. Enter each room name, length, and width in feet.',
        speechUr:
          'فلور ڈیزائنر کا پہلا مرحلہ۔ اپنے ہر کمرے کا نام، لمبائی اور چوڑائی فٹ میں درج کریں۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Skirting',
        shortUr: 'اسکرٹنگ پٹی',
        titleEn: 'Toggle Skirting & Layout Options',
        titleUr: 'اسکرٹنگ (دیوار پٹی) اور ڈیزائن سیٹ کریں',
        instructionEn:
          'Enable wall skirting if needed and choose straight or diagonal tile layout. The area updates automatically.',
        instructionUr:
          'اگر دیواروں کے ساتھ اسکرٹنگ پٹی لگوانی ہے تو اسے آن کر دیں۔ کل رقبہ خود بخود حساب ہو جائے گا۔',
        exampleEn: 'Auto-includes standard cutting wastage',
        exampleUr: 'کٹنگ ویسٹیج خود بخود شامل ہو جاتی ہے',
        speechEn:
          'Step 2. Enable wall skirting if required and check the combined square feet.',
        speechUr:
          'دوسرا مرحلہ۔ اگر دیوار کے ساتھ اسکرٹنگ چاہیے تو آن کر دیں۔',
      },
      {
        stepNumber: 3,
        targetStepId: '3',
        shortEn: 'Save Floor',
        shortUr: 'محفوظ کریں',
        titleEn: 'Review Combined Total & Press Save',
        titleUr: 'مکمل فلور قیمت چیک کریں اور Save دبائیں',
        instructionEn:
          'Check the combined area and PKR total for all rooms, then click Save.',
        instructionUr:
          'تمام کمروں کا کل رقبہ اور قیمت چیک کریں اور نیچے Save بٹن دبا دیں۔',
        exampleEn: 'Final Step: Tap Save to add Flooring to your quotation',
        exampleUr: 'آخری قدم: Save دبا کر فلورنگ کوٹیشن محفوظ کریں',
        speechEn:
          'Step 3. Check your total flooring area and cost, then press Save.',
        speechUr:
          'آخری مرحلہ۔ تمام کمروں کی کل قیمت چیک کر کے سیو بٹن دبائیں۔',
      },
    ],
  },

  labor_quote: {
    nameEn: 'Fixing & Polishing Labor Calculator',
    nameUr: 'فکسنگ اور پالش لیبر کیلکولیٹر',
    introEn:
      'Enter your total flooring, stair, or countertop area to estimate professional fixing and polishing labor charges.',
    introUr:
      'فکسنگ اور پالش مزدوری معلوم کرنے کے لیے اپنے فرش، سیڑھی یا کچن کا رقبہ درج کریں اور سیو بٹن دبائیں۔',
    steps: [
      {
        stepNumber: 1,
        targetStepId: '1',
        shortEn: 'Select Service',
        shortUr: 'سروس چنیں',
        titleEn: 'Pick Fixing / Polishing Service Type',
        titleUr: 'فکسنگ یا پالش سروس منتخب کریں',
        instructionEn: 'Choose marble fixing, chemical polishing, or complete labor service.',
        instructionUr: 'ماربل فکسنگ، کیمیکل پالش یا مکمل لیبر سروس منتخب کریں۔',
        exampleEn: 'Example: Floor Fixing + Mirror Polish',
        exampleUr: 'مثال: فلور فکسنگ + مرر پالش',
        speechEn: 'Step 1. Select the fixing or polishing service you need.',
        speechUr: 'مرحلہ ایک۔ اپنی مطلوبہ فکسنگ یا پالش سروس منتخب کریں۔',
      },
      {
        stepNumber: 2,
        targetStepId: '2',
        shortEn: 'Enter Area',
        shortUr: 'رقبہ لکھیں',
        titleEn: 'Enter Area & Save Labor Estimate',
        titleUr: 'کل اسکوائر فٹ لکھیں اور Save دبائیں',
        instructionEn: 'Type your total square feet and tap Save to add labor to your quote.',
        instructionUr: 'کل اسکوائر فٹ درج کریں اور نیچے Save بٹن دبائیں۔',
        exampleEn: 'Example: 1,200 Sq.Ft',
        exampleUr: 'مثال: 1200 اسکوائر فٹ',
        speechEn: 'Step 2. Type your total square feet and press Save.',
        speechUr: 'مرحلہ دو۔ کل اسکوائر فٹ لکھیں اور سیو بٹن دبائیں۔',
      },
    ],
  },
};

interface CalculatorVoiceGuideProps {
  calculatorType: GuidedCalculatorType;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  autoSpeakOnTypeChange?: boolean;
}

export function CalculatorVoiceGuide({
  calculatorType,
  containerRef,
  autoSpeakOnTypeChange = false,
}: CalculatorVoiceGuideProps) {
  const { language } = useLanguage();
  const [voiceLang, setVoiceLang] = useState<'ur' | 'en'>(language === 'ur' ? 'ur' : 'en');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const lastTypeRef = useRef<GuidedCalculatorType>(calculatorType);

  const spec = CALCULATOR_GUIDES[calculatorType] || CALCULATOR_GUIDES.simple;
  const currentStep = spec.steps[Math.min(activeStepIdx, spec.steps.length - 1)] || spec.steps[0];

  useEffect(() => {
    setVoiceLang(language === 'ur' ? 'ur' : 'en');
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback((text: string, langCode: 'ur' | 'en') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      if (langCode === 'ur') {
        utterance.lang = 'ur-PK';
        const preferredVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('ur')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
          voices.find((v) => v.lang.toLowerCase().includes('pk'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.95;
      } else {
        utterance.lang = 'en-US';
        const preferredVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.98;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    if (lastTypeRef.current !== calculatorType) {
      lastTypeRef.current = calculatorType;
      setActiveStepIdx(0);
      stopSpeech();

      if (autoSpeakOnTypeChange) {
        const nextSpec = CALCULATOR_GUIDES[calculatorType] || CALCULATOR_GUIDES.simple;
        const first = nextSpec.steps[0];
        if (first) {
          const text =
            voiceLang === 'ur'
              ? `${nextSpec.introUr} ${first.speechUr}`
              : `${nextSpec.introEn} ${first.speechEn}`;
          speakText(text, voiceLang);
        }
      }
    }
  }, [calculatorType, autoSpeakOnTypeChange, voiceLang, speakText, stopSpeech]);

  const highlightTargetField = useCallback(
    (stepId: string) => {
      const root = containerRef?.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`[data-guide-step="${stepId}"]`);
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
      window.setTimeout(() => {
        target.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
      }, 2200);
    },
    [containerRef]
  );

  const handleSelectStep = (idx: number, shouldSpeak: boolean = true) => {
    const clamped = Math.max(0, Math.min(spec.steps.length - 1, idx));
    setActiveStepIdx(clamped);
    const chosen = spec.steps[clamped];
    if (!chosen) return;
    highlightTargetField(chosen.targetStepId);
    if (shouldSpeak && speechSupported) {
      speakText(voiceLang === 'ur' ? chosen.speechUr : chosen.speechEn, voiceLang);
    }
  };

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleSpeakFullGuide = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const allStepsSpeech = spec.steps
      .map((s) => (voiceLang === 'ur' ? s.speechUr : s.speechEn))
      .join(' ');
    const text =
      voiceLang === 'ur'
        ? `${spec.introUr} ${allStepsSpeech}`
        : `${spec.introEn} ${allStepsSpeech}`;
    speakText(text, voiceLang);
    highlightTargetField(currentStep.targetStepId);
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-slate-950/95 text-white px-2.5 py-1.5 shadow-sm">
      {/* Slim Single-Row Top Button Bar (Urdu / English + Voice Guide + Optional Expand) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex rounded-md bg-slate-900 border border-white/15 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setVoiceLang('ur');
              }}
              className={cn(
                'px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer',
                voiceLang === 'ur'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              اردو
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setVoiceLang('en');
              }}
              className={cn(
                'px-2 py-0.5 text-[11px] font-bold rounded transition-colors cursor-pointer',
                voiceLang === 'en'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              English
            </button>
          </div>

          {speechSupported && (
            <Button
              type="button"
              size="sm"
              onClick={handleSpeakFullGuide}
              className={cn(
                'h-7 px-2.5 font-bold text-[11px] gap-1.5 whitespace-nowrap',
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                  <span>{voiceLang === 'ur' ? 'آواز بند کریں' : 'Stop Guide'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{voiceLang === 'ur' ? 'گائیڈ سنیں (اردو / EN)' : 'Voice Guide'}</span>
                </>
              )}
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isExpanded
              ? voiceLang === 'ur'
                ? 'گائیڈ بند کریں'
                : 'Hide Steps'
              : voiceLang === 'ur'
                ? 'طریقہ دیکھیں'
                : 'How to Use'}
          </span>
        </button>
      </div>

      {/* Optional Compact Collapsible Steps Drawer (Closed by Default) */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {spec.steps.map((step, idx) => {
              const isActive = idx === activeStepIdx;
              const isCompleted = idx < activeStepIdx;
              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => handleSelectStep(idx, true)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer',
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                      : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40'
                        : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-amber-400/40 hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                      isActive
                        ? 'bg-slate-950 text-amber-400'
                        : isCompleted
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 text-slate-200'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : step.stepNumber}
                  </span>
                  <span className="text-[11px] font-bold leading-tight truncate">
                    {voiceLang === 'ur' ? step.shortUr : step.shortEn}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              'rounded-lg bg-slate-900/90 border border-white/10 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2',
              voiceLang === 'ur' ? 'text-right' : 'text-left'
            )}
            dir={voiceLang === 'ur' ? 'rtl' : 'ltr'}
          >
            <div className="space-y-0.5 min-w-0">
              <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-400">
                <Hand className="w-3.5 h-3.5 shrink-0" />
                <span>{voiceLang === 'ur' ? currentStep.titleUr : currentStep.titleEn}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {voiceLang === 'ur' ? currentStep.instructionUr : currentStep.instructionEn}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeStepIdx === 0}
                onClick={() => handleSelectStep(activeStepIdx - 1, true)}
                className="h-7 px-2 text-[11px] font-bold bg-slate-800 border-white/15 text-white hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {activeStepIdx < spec.steps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSelectStep(activeStepIdx + 1, true)}
                  className="h-7 px-2.5 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950"
                >
                  {voiceLang === 'ur' ? 'اگلا' : 'Next'}
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectStep(0, true)}
                  className="h-7 px-2.5 text-[11px] font-bold bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {voiceLang === 'ur' ? 'دوبارہ' : 'Replay'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
