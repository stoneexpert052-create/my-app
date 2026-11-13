'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/header';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getBuildYourHomeRatesConfig, defaultBuildYourHomeRates, subscribeToAppUpdates, type BuildYourHomeRates } from '@/lib/admin-actions';
import { 
  Home, 
  Wrench, 
  Sparkles, 
  Layers, 
  Layout, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  Building2, 
  Calculator, 
  PhoneCall, 
  Clock, 
  HardHat, 
  ChevronRight, 
  Check, 
  Compass,
  Palette,
  Lightbulb,
  Maximize2,
  FileSpreadsheet,
  Send,
  Droplets,
  Hammer,
  Sparkle,
  Paintbrush,
  Ruler,
  SlidersHorizontal,
  Flame,
  Zap,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function BuildYourHomePage() {
  const db = useFirestore();
  const { t, language } = useLanguage();
  const isUrdu = language === 'ur';
  const { toast } = useToast();

  // Active Top Tab: 'maintenance' | 'new-projects' | 'interior-system'
  const [activeTab, setActiveTab] = useState<'maintenance' | 'new-projects' | 'interior-system'>('maintenance');

  // Dynamic Rates Configuration from Admin Settings
  const [rates, setRates] = useState<BuildYourHomeRates>(defaultBuildYourHomeRates);

  useEffect(() => {
    async function loadRates() {
      const config = await getBuildYourHomeRatesConfig();
      if (config) {
        setRates(config);
      }
    }
    loadRates();

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'costs_updated' || event.type === 'app_data_sync') {
        loadRates();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Contact Info
  const whatsappNumber = '923005550212';

  // -------------------------------------------------------------
  // 1. MAINTENANCE & RESTORATION STATE
  // -------------------------------------------------------------
  const [maintService, setMaintService] = useState<'polishing' | 'repair' | 'cleaning' | 'sealing' | 'alignment'>('polishing');
  const [maintArea, setMaintArea] = useState<string>('1000');
  const [maintUrgency, setMaintUrgency] = useState<'standard' | 'priority' | 'emergency'>('standard');
  const [maintName, setMaintName] = useState('');
  const [maintPhone, setMaintPhone] = useState('');
  const [maintAddress, setMaintAddress] = useState('');
  const [maintNotes, setMaintNotes] = useState('');
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  const maintCalculatedCost = useMemo(() => {
    const area = parseFloat(maintArea) || 0;
    let rate = rates.maintenance.polishing;
    if (maintService === 'polishing') rate = rates.maintenance.polishing;
    else if (maintService === 'repair') rate = rates.maintenance.repair;
    else if (maintService === 'cleaning') rate = rates.maintenance.cleaning;
    else if (maintService === 'sealing') rate = rates.maintenance.sealing;
    else if (maintService === 'alignment') rate = rates.maintenance.alignment;

    const multiplier = maintUrgency === 'emergency' 
      ? rates.maintenance.urgencyMultipliers.emergency 
      : maintUrgency === 'priority' 
      ? rates.maintenance.urgencyMultipliers.priority 
      : rates.maintenance.urgencyMultipliers.standard;
    const totalCost = area * rate * multiplier;
    return {
      rate: Math.round(rate * multiplier),
      total: Math.round(totalCost)
    };
  }, [maintService, maintArea, maintUrgency, rates]);

  // -------------------------------------------------------------
  // 2. NEW PROJECTS STATE
  // -------------------------------------------------------------
  const [projectSize, setProjectSize] = useState<string>('marla10');
  const [projectGrade, setProjectGrade] = useState<'budget' | 'premium' | 'luxury'>('premium');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['flooring', 'stairs', 'kitchen']);
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<string[]>(['m-floor', 'w-door', 'p-interior', 'mush-gypsum', 'plumb-pipe', 'elec-wire']);
  
  // Floor Covered Area State for 5 Floors
  const [includeGround, setIncludeGround] = useState<boolean>(true);
  const [groundSqFt, setGroundSqFt] = useState<number>(2200);

  const [includeFirst, setIncludeFirst] = useState<boolean>(true);
  const [firstSqFt, setFirstSqFt] = useState<number>(2200);

  const [includeMezzanine, setIncludeMezzanine] = useState<boolean>(false);
  const [mezzanineSqFt, setMezzanineSqFt] = useState<number>(600);

  const [includeSecond, setIncludeSecond] = useState<boolean>(false);
  const [secondSqFt, setSecondSqFt] = useState<number>(1500);

  const [includeBasement, setIncludeBasement] = useState<boolean>(false);
  const [basementSqFt, setBasementSqFt] = useState<number>(2000);

  const [projName, setProjName] = useState('');
  const [projPhone, setProjPhone] = useState('');
  const [projCity, setProjCity] = useState('Rawalpindi / Islamabad');
  const [projNotes, setProjNotes] = useState('');
  const [isSubmittingProj, setIsSubmittingProj] = useState(false);

  // Helper to normalize property size keys across legacy formats ('5marla' vs 'marla5', '1kanal' vs 'kanal1', etc.)
  const normalizePlotKey = (sizeKey: string): 'marla5' | 'marla10' | 'kanal1' | 'kanal2' | 'commercial' => {
    if (sizeKey === '5marla' || sizeKey === 'marla5') return 'marla5';
    if (sizeKey === '10marla' || sizeKey === 'marla10') return 'marla10';
    if (sizeKey === '1kanal' || sizeKey === 'kanal1' || sizeKey === '1canal' || sizeKey === 'canal1') return 'kanal1';
    if (sizeKey === '2kanal' || sizeKey === 'kanal2' || sizeKey === '2canal' || sizeKey === 'canal2') return 'kanal2';
    return 'commercial';
  };

  // Auto set floor covered areas when property size or rates config updates
  useEffect(() => {
    const normKey = normalizePlotKey(projectSize);
    const floorDef = rates.newProjects.floorDefaults?.[normKey] || 
      (normKey === 'marla5' ? { ground: 1100, first: 1100, mezzanine: 350, second: 800, basement: 1000 } :
       normKey === 'marla10' ? { ground: 2200, first: 2200, mezzanine: 600, second: 1500, basement: 2000 } :
       normKey === 'kanal1' ? { ground: 4500, first: 4200, mezzanine: 1200, second: 3000, basement: 4000 } :
       normKey === 'kanal2' ? { ground: 8500, first: 8000, mezzanine: 2500, second: 6000, basement: 7500 } :
       { ground: 6000, first: 6000, mezzanine: 3000, second: 6000, basement: 6000 });

    setGroundSqFt(floorDef.ground);
    setFirstSqFt(floorDef.first);
    setMezzanineSqFt(floorDef.mezzanine || 600);
    setSecondSqFt(floorDef.second || 1500);
    setBasementSqFt(floorDef.basement || 2000);
  }, [projectSize, rates]);

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const toggleCategoryItem = (itemId: string) => {
    if (selectedCategoryItems.includes(itemId)) {
      setSelectedCategoryItems(selectedCategoryItems.filter(id => id !== itemId));
    } else {
      setSelectedCategoryItems([...selectedCategoryItems, itemId]);
    }
  };

  const projectCalculatedEstimate = useMemo(() => {
    const baseCost = rates.newProjects.baseCostPerSqFt || rates.newProjects.gradeRates.budget || 120;
    const stdMult = rates.newProjects.gradeMultipliers?.standard ?? 1.0;
    const premMult = rates.newProjects.gradeMultipliers?.premium ?? 1.83;
    const luxMult = rates.newProjects.gradeMultipliers?.luxury ?? 3.75;

    let ratePerSqFt = rates.newProjects.gradeRates.premium || Math.round(baseCost * premMult);
    if (projectGrade === 'budget') ratePerSqFt = rates.newProjects.gradeRates.budget || Math.round(baseCost * stdMult);
    if (projectGrade === 'premium') ratePerSqFt = rates.newProjects.gradeRates.premium || Math.round(baseCost * premMult);
    if (projectGrade === 'luxury') ratePerSqFt = rates.newProjects.gradeRates.luxury || Math.round(baseCost * luxMult);

    const gMult = rates.newProjects.floorRateMultipliers?.ground || 1.0;
    const fMult = rates.newProjects.floorRateMultipliers?.first || 0.95;
    const mMult = rates.newProjects.floorRateMultipliers?.mezzanine || 0.90;
    const sMult = rates.newProjects.floorRateMultipliers?.second || 0.95;
    const bMult = rates.newProjects.floorRateMultipliers?.basement || 1.15;

    const activeGroundSqFt = includeGround ? (Number(groundSqFt) || 0) : 0;
    const activeFirstSqFt = includeFirst ? (Number(firstSqFt) || 0) : 0;
    const activeMezzanineSqFt = includeMezzanine ? (Number(mezzanineSqFt) || 0) : 0;
    const activeSecondSqFt = includeSecond ? (Number(secondSqFt) || 0) : 0;
    const activeBasementSqFt = includeBasement ? (Number(basementSqFt) || 0) : 0;

    const totalCoveredArea = activeGroundSqFt + activeFirstSqFt + activeMezzanineSqFt + activeSecondSqFt + activeBasementSqFt;

    const groundCost = activeGroundSqFt * ratePerSqFt * gMult;
    const firstCost = activeFirstSqFt * ratePerSqFt * fMult;
    const mezzanineCost = activeMezzanineSqFt * ratePerSqFt * mMult;
    const secondCost = activeSecondSqFt * ratePerSqFt * sMult;
    const basementCost = activeBasementSqFt * ratePerSqFt * bMult;

    // Scope factors
    let scopeMultiplier = rates.newProjects.scopeMultipliers.base;
    if (selectedScopes.includes('flooring')) scopeMultiplier += rates.newProjects.scopeMultipliers.flooring;
    if (selectedScopes.includes('stairs')) scopeMultiplier += rates.newProjects.scopeMultipliers.stairs;
    if (selectedScopes.includes('kitchen')) scopeMultiplier += rates.newProjects.scopeMultipliers.kitchen;
    if (selectedScopes.includes('elevation')) scopeMultiplier += rates.newProjects.scopeMultipliers.elevation;
    if (selectedScopes.includes('bathrooms')) scopeMultiplier += rates.newProjects.scopeMultipliers.bathrooms;

    const baseConstructionTotal = (groundCost + firstCost + mezzanineCost + secondCost + basementCost) * scopeMultiplier;

    // Additional Selected Category Items Total Cost
    let customCategoriesCost = 0;
    if (rates.customCategories) {
      rates.customCategories.forEach(cat => {
        cat.items.forEach(item => {
          if (selectedCategoryItems.includes(item.id)) {
            if (item.unit.toLowerCase().includes('sq') || item.unit.toLowerCase().includes('ft')) {
              customCategoriesCost += item.rate * totalCoveredArea;
            } else {
              customCategoriesCost += item.rate;
            }
          }
        });
      });
    }

    const grandTotal = baseConstructionTotal + customCategoriesCost;

    return {
      totalCoveredArea,
      activeGroundSqFt,
      activeFirstSqFt,
      activeMezzanineSqFt,
      activeSecondSqFt,
      activeBasementSqFt,
      ratePerSqFt,
      baseConstructionTotal: Math.round(baseConstructionTotal),
      customCategoriesCost: Math.round(customCategoriesCost),
      total: Math.round(grandTotal)
    };
  }, [projectGrade, selectedScopes, includeGround, groundSqFt, includeFirst, firstSqFt, includeMezzanine, mezzanineSqFt, includeSecond, secondSqFt, includeBasement, basementSqFt, selectedCategoryItems, rates]);

  // -------------------------------------------------------------
  // 3. INTERIOR WORK SYSTEM STATE
  // -------------------------------------------------------------
  const [interiorZone, setInteriorZone] = useState<'living' | 'kitchen' | 'bathroom' | 'foyer' | 'office'>('living');
  const [interiorTechnique, setInteriorTechnique] = useState<'bookmatched' | 'backlit-onyx' | 'cnc-carved' | 'waterjet-brass' | 'fluted-stone'>('bookmatched');
  const [interiorFinish, setInteriorFinish] = useState<'mirror-gloss' | 'honed-satin' | 'fluted-textured' | 'leathered'>('mirror-gloss');
  const [interiorLighting, setInteriorLighting] = useState<'warm-led' | 'rgb-accent' | 'spotlights' | 'none'>('warm-led');
  const [interiorArea, setInteriorArea] = useState<string>('250'); // sq ft wall/floor area

  const [interiorName, setInteriorName] = useState('');
  const [interiorPhone, setInteriorPhone] = useState('');
  const [interiorLocation, setInteriorLocation] = useState('');
  const [interiorNotes, setInteriorNotes] = useState('');
  const [isSubmittingInterior, setIsSubmittingInterior] = useState(false);
  const [showInteriorDialog, setShowInteriorDialog] = useState(false);

  const interiorCalculatedEstimate = useMemo(() => {
    const area = parseFloat(interiorArea) || 0;
    let baseRate = rates.interior.techniques.bookmatched;

    if (interiorTechnique === 'bookmatched') baseRate = rates.interior.techniques.bookmatched;
    if (interiorTechnique === 'backlit-onyx') baseRate = rates.interior.techniques.backlitOnyx;
    if (interiorTechnique === 'cnc-carved') baseRate = rates.interior.techniques.cncCarved;
    if (interiorTechnique === 'waterjet-brass') baseRate = rates.interior.techniques.waterjetBrass;
    if (interiorTechnique === 'fluted-stone') baseRate = rates.interior.techniques.flutedStone;

    let finishAddon = rates.interior.finishes.mirrorGloss;
    if (interiorFinish === 'mirror-gloss') finishAddon = rates.interior.finishes.mirrorGloss;
    if (interiorFinish === 'honed-satin') finishAddon = rates.interior.finishes.honedSatin;
    if (interiorFinish === 'fluted-textured') finishAddon = rates.interior.finishes.flutedTextured;
    if (interiorFinish === 'leathered') finishAddon = rates.interior.finishes.leathered;

    let lightingAddon = rates.interior.lighting.warmLed;
    if (interiorLighting === 'warm-led') lightingAddon = rates.interior.lighting.warmLed;
    if (interiorLighting === 'rgb-accent') lightingAddon = rates.interior.lighting.rgbAccent;
    if (interiorLighting === 'spotlights') lightingAddon = rates.interior.lighting.spotlights;
    if (interiorLighting === 'none') lightingAddon = rates.interior.lighting.none;

    const totalRate = baseRate + finishAddon + lightingAddon;
    return {
      rate: totalRate,
      baseRate,
      finishAddon,
      lightingAddon,
      total: Math.round(area * totalRate)
    };
  }, [interiorTechnique, interiorFinish, interiorLighting, interiorArea, rates]);

  // -------------------------------------------------------------
  // SUBMISSION HANDLERS
  // -------------------------------------------------------------
  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintName || !maintPhone) {
      toast({
        title: isUrdu ? 'نام اور فون نمبر درکار ہے' : 'Name and Phone required',
        description: isUrdu ? 'برائے مہربانی اپنا نام اور رابطہ نمبر درج کریں۔' : 'Please fill in your name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingMaint(true);
    const data = {
      type: 'maintenance',
      service: maintService,
      areaSqFt: maintArea,
      urgency: maintUrgency,
      estimatedCostPKR: maintCalculatedCost.total,
      name: maintName,
      phone: maintPhone,
      address: maintAddress,
      notes: maintNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'build_home_requests'), data);
      }
    } catch (err) {
      console.warn('Firestore fallback on maintenance request submit', err);
    } finally {
      setIsSubmittingMaint(false);
    }

    // Build WhatsApp Message
    const msg = `*New Maintenance Request (Stone Expert)*\n\n` +
      `👤 *Name:* ${maintName}\n` +
      `📞 *Phone:* ${maintPhone}\n` +
      `📍 *Address:* ${maintAddress || 'N/A'}\n` +
      `🔧 *Service:* ${maintService.toUpperCase()}\n` +
      `📐 *Area:* ${maintArea} Sq.Ft\n` +
      `🚨 *Urgency:* ${maintUrgency.toUpperCase()}\n` +
      `💰 *Estimated Cost:* PKR ${maintCalculatedCost.total.toLocaleString()}\n` +
      `📝 *Notes:* ${maintNotes || 'None'}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

    toast({
      title: isUrdu ? 'درخواست بھیج دی گئی ہے!' : 'Request Sent Successfully!',
      description: isUrdu ? 'ہمارا نمائندہ جلد آپ سے رابطہ کرے گا۔' : 'Our team is connecting with you on WhatsApp.',
    });
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projPhone) {
      toast({
        title: isUrdu ? 'نام اور فون نمبر درکار ہے' : 'Name and Phone required',
        description: isUrdu ? 'برائے مہربانی اپنا نام اور رابطہ نمبر درج کریں۔' : 'Please enter name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingProj(true);
    const floorBreakdownStr = [
      includeGround ? `Ground: ${groundSqFt} Sq.Ft` : null,
      includeFirst ? `First: ${firstSqFt} Sq.Ft` : null,
      includeMezzanine ? `Mezzanine: ${mezzanineSqFt} Sq.Ft` : null,
      includeSecond ? `2nd/Mumty: ${secondSqFt} Sq.Ft` : null,
      includeBasement ? `Basement: ${basementSqFt} Sq.Ft` : null,
    ].filter(Boolean).join(' | ');

    const data = {
      type: 'new_project',
      projectSize,
      projectGrade,
      floorsIncluded: floorBreakdownStr,
      totalCoveredAreaSqFt: projectCalculatedEstimate.totalCoveredArea,
      scopes: selectedScopes,
      selectedCategoryItems,
      estimatedCostPKR: projectCalculatedEstimate.total,
      name: projName,
      phone: projPhone,
      city: projCity,
      notes: projNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'build_home_requests'), data);
      }
    } catch (err) {
      console.warn('Firestore fallback on project submit', err);
    } finally {
      setIsSubmittingProj(false);
    }

    const plotLabel = normalizePlotKey(projectSize) === 'marla5' ? '5 Marla' :
      normalizePlotKey(projectSize) === 'marla10' ? '10 Marla' :
      normalizePlotKey(projectSize) === 'kanal1' ? '1 Kanal' :
      normalizePlotKey(projectSize) === 'kanal2' ? '2 Kanal' : 'Commercial Plaza';

    const msg = `*New Construction Project Inquiry (Stone Expert)*\n\n` +
      `👤 *Name:* ${projName}\n` +
      `📞 *Phone:* ${projPhone}\n` +
      `🏙️ *City/Location:* ${projCity}\n` +
      `🏠 *Property Size:* ${plotLabel}\n` +
      `📐 *Total Covered Area:* ${projectCalculatedEstimate.totalCoveredArea} Sq.Ft\n` +
      `🧱 *Floors Selected:* ${floorBreakdownStr}\n` +
      `⭐ *Grade:* ${projectGrade.toUpperCase()}\n` +
      `📋 *Scopes Included:* ${selectedScopes.join(', ')}\n` +
      `💰 *Estimated Cost:* PKR ${projectCalculatedEstimate.total.toLocaleString()}\n` +
      `📝 *Notes:* ${projNotes || 'None'}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

    toast({
      title: isUrdu ? 'پروجیکٹ انکوائری جمع کر دی گئی ہے' : 'Project Plan Submitted!',
      description: isUrdu ? 'ہم واٹس ایپ پر آپ کو تفصیلی مشاورت دیں گے۔' : 'We will review your plan and contact you on WhatsApp.',
    });
  };

  const handleInteriorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interiorName || !interiorPhone) {
      toast({
        title: isUrdu ? 'نام اور فون نمبر درکار ہے' : 'Name and Phone required',
        description: isUrdu ? 'برائے مہربانی تمام درکار معلومات پُر کریں۔' : 'Please provide name and contact phone.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingInterior(true);
    const data = {
      type: 'interior_system',
      zone: interiorZone,
      technique: interiorTechnique,
      finish: interiorFinish,
      lighting: interiorLighting,
      areaSqFt: interiorArea,
      estimatedCostPKR: interiorCalculatedEstimate.total,
      name: interiorName,
      phone: interiorPhone,
      location: interiorLocation,
      notes: interiorNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await addDoc(collection(db, 'build_home_requests'), data);
      }
    } catch (err) {
      console.warn('Firestore fallback on interior submit', err);
    } finally {
      setIsSubmittingInterior(false);
    }

    const msg = `*Custom Interior Stone Work Order (Stone Expert)*\n\n` +
      `👤 *Name:* ${interiorName}\n` +
      `📞 *Phone:* ${interiorPhone}\n` +
      `📍 *Location:* ${interiorLocation || 'Rawalpindi/Islamabad'}\n` +
      `🚪 *Zone:* ${interiorZone.toUpperCase()}\n` +
      `🎨 *Technique:* ${interiorTechnique.toUpperCase()}\n` +
      `✨ *Finish:* ${interiorFinish.toUpperCase()}\n` +
      `💡 *Lighting System:* ${interiorLighting.toUpperCase()}\n` +
      `📐 *Area:* ${interiorArea} Sq.Ft\n` +
      `💰 *Estimated Budget:* PKR ${interiorCalculatedEstimate.total.toLocaleString()}\n` +
      `📝 *Customization Request:* ${interiorNotes || 'None'}`;

    setShowInteriorDialog(false);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

    toast({
      title: isUrdu ? 'انٹیریئر ورک ڈیزائن منتقل کر دیا گیا!' : 'Interior Design Request Submitted!',
      description: isUrdu ? 'ہمارا انٹیریئر اسٹون ڈیزائنر آپ سے واٹس ایپ پر رابطہ کرے گا۔' : 'Our stone interior designer will connect with you shortly.',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-background text-white border-b border-slate-800 overflow-hidden py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="container px-4 md:px-6 relative z-10 mx-auto text-center space-y-4 max-w-4xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isUrdu ? 'ہوم پیج پر واپس جائیں' : 'Back to Main Catalog'}</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold tracking-wide">
            <Sparkles className="h-4 w-4 animate-pulse text-amber-400" />
            <span>{isUrdu ? 'سٹون ایکسپرٹ آفیشل بلڈ اینڈ کیئر سسٹم' : 'Official Stone Construction & Restoration Hub'}</span>
          </div>

          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            {isUrdu ? 'اپنا گھر سٹون ایکسپرٹ کے ساتھ بنائیں' : 'Build Your Home with Stone Expert'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed" dir={isUrdu ? 'rtl' : 'ltr'}>
            {isUrdu 
              ? 'مکمل کنسٹرکشن پروجیکٹس، پیشہ ورانہ ماربل مینٹیننس، اور جدید ترین انٹیریئر اسٹون سسٹمز کے لیے پاکستان کا واحد اعتماد والا ادارہ۔' 
              : 'End-to-end solutions covering professional maintenance & polishing, new construction projects, and customized interior stone feature wall systems.'}
          </p>

          {/* Quick Navigation Tabs Selector */}
          <div className="pt-4 flex flex-wrap justify-center gap-2 sm:gap-4">
            <Button 
              variant={activeTab === 'maintenance' ? 'default' : 'outline'}
              onClick={() => setActiveTab('maintenance')}
              className={activeTab === 'maintenance' ? 'bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold' : 'border-slate-700 text-slate-200'}
            >
              <Wrench className="mr-2 h-4 w-4" />
              {isUrdu ? '1. مینٹیننس اور بحالی' : '1. Maintenance & Restoration'}
            </Button>

            <Button 
              variant={activeTab === 'new-projects' ? 'default' : 'outline'}
              onClick={() => setActiveTab('new-projects')}
              className={activeTab === 'new-projects' ? 'bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold' : 'border-slate-700 text-slate-200'}
            >
              <Building2 className="mr-2 h-4 w-4" />
              {isUrdu ? '2. نئے پروجیکٹس اور تعمیرات' : '2. New Projects & Construction'}
            </Button>

            <Button 
              variant={activeTab === 'interior-system' ? 'default' : 'outline'}
              onClick={() => setActiveTab('interior-system')}
              className={activeTab === 'interior-system' ? 'bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold' : 'border-slate-700 text-slate-200'}
            >
              <Palette className="mr-2 h-4 w-4" />
              {isUrdu ? '3. انٹیریئر ورک سسٹم' : '3. Interior Work System'}
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="container px-4 md:px-6 py-8 md:py-12 mx-auto max-w-6xl flex-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: MAINTENANCE & RESTORATION */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="maintenance" className="space-y-8 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Highlight Cards */}
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{isUrdu ? 'ڈائمنڈ پالشنگ اور کرسٹلائزیشن' : 'Diamond Polishing & Crystallization'}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm text-muted-foreground">
                  {isUrdu ? 'پرانے اور دھندلے ماربل کے فرش کو اینٹیک فلور شائن اور آئینہ جیسی چمک واپس دیں۔' : 'Transform dull, scratched, or aged marble floors into mirror-finish high-gloss surfaces using 8-stage diamond pad grit.'}
                </CardContent>
              </Card>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                    <Hammer className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{isUrdu ? 'کریک فلنگ اور سیم ریپیئر' : 'Crack Filling & Seam Alignment'}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm text-muted-foreground">
                  {isUrdu ? 'ماربل میں سوراخ، دراڑیں اور جوڑوں کے فاصلے کو ایپوکسی ریزن سے بغیر نشان کے بھریں۔' : 'Fill unsightly marble pinholes, chips, cracks, and floor gaps seamlessly using color-matched epoxy resins.'}
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{isUrdu ? 'داغ دھبے کیمیکل کلیننگ' : 'Deep Stain Removal & Sealing'}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm text-muted-foreground">
                  {isUrdu ? 'زنگ، تیزاب اور پانی کے ضدی داغ ختم کریں اور ہائیڈروفوبک پروٹیکشن فراہم کریں۔' : 'Eliminate stubborn oil, rust, acid etching, and water rings while applying nano-silane water & stain shields.'}
                </CardContent>
              </Card>
            </div>

            {/* Interactive Calculator & Booking Form for Maintenance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Calculator Controls */}
              <Card className="lg:col-span-7 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                      {isUrdu ? 'مینٹیننس کیلکولیٹر' : 'Maintenance Cost Estimator'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{isUrdu ? 'فوری اندازہ' : 'Instant Estimate'}</span>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl mt-2 font-headline">
                    {isUrdu ? 'اپنی ضرورت کا انتخاب کریں' : 'Select Maintenance Service & Surface Area'}
                  </CardTitle>
                  <CardDescription>
                    {isUrdu ? 'سروس کی قسم اور مربع فٹ درج کر کے لاگت معلوم کریں۔' : 'Select service type and square feet area to preview instant labor & material estimate.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Service Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{isUrdu ? 'سروس کی قسم' : 'Select Service Type'}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { id: 'polishing', nameEn: 'Full Diamond Polishing', nameUr: 'ڈائمنڈ فلور رگڑائی و پالش', rate: rates.maintenance.polishing },
                        { id: 'repair', nameEn: 'Crack & Resin Repair', nameUr: 'دراڑیں اور ریزن فلنگ', rate: rates.maintenance.repair },
                        { id: 'cleaning', nameEn: 'Stain Deep Cleaning', nameUr: 'کیمیکل سٹین کلیننگ', rate: rates.maintenance.cleaning },
                        { id: 'sealing', nameEn: 'Hydrophobic Seal Guard', nameUr: 'واٹر پروفنگ و سیلنگ', rate: rates.maintenance.sealing },
                        { id: 'alignment', nameEn: 'Tile Leveling & Grouting', nameUr: 'ٹائل کی سطح ہموار کرنا', rate: rates.maintenance.alignment },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMaintService(item.id as any)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            maintService === item.id 
                              ? 'border-[#dfb96c] bg-[#dfb96c]/10 ring-1 ring-[#dfb96c]' 
                              : 'border-border hover:bg-accent/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs sm:text-sm">{isUrdu ? item.nameUr : item.nameEn}</span>
                            {maintService === item.id && <Check className="h-4 w-4 text-[#dfb96c]" />}
                          </div>
                          <span className="text-[11px] text-muted-foreground mt-1">~PKR {item.rate} / sq ft</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Square Feet Slider / Input */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">{isUrdu ? 'رقبہ (مربع فٹ میں)' : 'Total Surface Area (Sq. Ft)'}</Label>
                      <span className="text-sm font-bold text-[#dfb96c] bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                        {maintArea} Sq.Ft
                      </span>
                    </div>
                    <Input 
                      type="number"
                      value={maintArea}
                      onChange={(e) => setMaintArea(e.target.value)}
                      placeholder="e.g. 1000"
                      className="text-base"
                    />
                    <div className="flex gap-2">
                      {['500', '1000', '2000', '3500'].map((preset) => (
                        <Button 
                          key={preset} 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7"
                          onClick={() => setMaintArea(preset)}
                        >
                          {preset} sqft
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Urgency */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isUrdu ? 'ضرورت کی نوعیت' : 'Urgency & Inspection Preference'}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'standard', nameEn: 'Standard (3-5 days)', nameUr: 'عام (3-5 دن)' },
                        { id: 'priority', nameEn: 'Priority (48 Hours)', nameUr: 'ترجیحی (48 گھنٹے)' },
                        { id: 'emergency', nameEn: 'Emergency Visit', nameUr: 'فوری ہنگامی وزٹ' },
                      ].map((urg) => (
                        <button
                          key={urg.id}
                          type="button"
                          onClick={() => setMaintUrgency(urg.id as any)}
                          className={`p-2 rounded text-center text-xs border transition-all ${
                            maintUrgency === urg.id 
                              ? 'border-[#dfb96c] bg-[#dfb96c]/10 text-[#dfb96c] font-semibold' 
                              : 'border-border text-muted-foreground hover:bg-accent/30'
                          }`}
                        >
                          {isUrdu ? urg.nameUr : urg.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Result Box */}
                  <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-slate-400 block">{isUrdu ? 'تخمینی کل لاگت' : 'Estimated Total Cost'}</span>
                      <span className="text-2xl sm:text-3xl font-black text-[#dfb96c]">
                        PKR {maintCalculatedCost.total.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        (~PKR {maintCalculatedCost.rate}/sqft including labor & materials)
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      {isUrdu ? 'مفت وزٹ مشاورت' : 'Free Inspection On-Site'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Maintenance Booking Form */}
              <Card className="lg:col-span-5 shadow-md flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                      <PhoneCall className="h-5 w-5 text-[#dfb96c]" />
                      {isUrdu ? 'مینٹیننس کی ٹیم بلائیں' : 'Book Maintenance Inspection'}
                    </CardTitle>
                    <CardDescription>
                      {isUrdu ? 'اپنی تفصیلات بھیجیں تاکہ ہمارا کاریگر سائٹ کا جائزہ لے۔' : 'Enter your details for an on-site stone inspection & confirmed quote.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <form id="maint-form" onSubmit={handleMaintenanceSubmit} className="space-y-3">
                      <div>
                        <Label htmlFor="maint-name" className="text-xs font-semibold">{isUrdu ? 'آپ کا نام *' : 'Your Name *'}</Label>
                        <Input 
                          id="maint-name"
                          required
                          value={maintName}
                          onChange={(e) => setMaintName(e.target.value)}
                          placeholder="e.g. Muhammad Ali"
                        />
                      </div>

                      <div>
                        <Label htmlFor="maint-phone" className="text-xs font-semibold">{isUrdu ? 'فون / واٹس ایپ نمبر *' : 'WhatsApp Phone Number *'}</Label>
                        <Input 
                          id="maint-phone"
                          required
                          value={maintPhone}
                          onChange={(e) => setMaintPhone(e.target.value)}
                          placeholder="0300 1234567"
                        />
                      </div>

                      <div>
                        <Label htmlFor="maint-addr" className="text-xs font-semibold">{isUrdu ? 'سائٹ کا پتہ (راولپنڈی / اسلام آباد / دیگر)' : 'Site Address (Rawalpindi / Islamabad)'}</Label>
                        <Input 
                          id="maint-addr"
                          value={maintAddress}
                          onChange={(e) => setMaintAddress(e.target.value)}
                          placeholder="e.g. Sector F-8/2, Islamabad"
                        />
                      </div>

                      <div>
                        <Label htmlFor="maint-notes" className="text-xs font-semibold">{isUrdu ? 'اضافی معلومات' : 'Additional Issue Details'}</Label>
                        <Textarea 
                          id="maint-notes"
                          rows={2}
                          value={maintNotes}
                          onChange={(e) => setMaintNotes(e.target.value)}
                          placeholder={isUrdu ? 'مثلاً: زنگ کے داغ، گہرے سوراخ، وغیرہ' : 'e.g. Deep scratches on stairs and yellow rust stain on hall floor'}
                        />
                      </div>
                    </form>
                  </CardContent>
                </div>

                <CardFooter className="pt-2">
                  <Button 
                    form="maint-form"
                    type="submit" 
                    disabled={isSubmittingMaint}
                    className="w-full bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold py-6 text-base"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {isUrdu ? 'واٹس ایپ پر آرڈر بھیجیں' : 'Dispatch Inspection Request'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: NEW PROJECTS & CONSTRUCTION */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="new-projects" className="space-y-8 mt-2">
            {/* Overview Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <Badge className="bg-[#dfb96c] text-slate-950 font-bold">
                  {isUrdu ? 'مکمل تعمیراتی پروجیکٹس' : 'Turnkey Stone Construction'}
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black font-headline text-[#dfb96c]">
                  {isUrdu ? 'نئے گھروں اور پلازوں کی مکمل ماربلنگ' : 'Full House & Commercial Stone Execution'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed" dir={isUrdu ? 'rtl' : 'ltr'}>
                  {isUrdu 
                    ? 'بنیادی میٹیریل کی فراہمی سے لے کر پروفیشنل فکسنگ، سیڑھیوں کے کناروں کی اینگولیشن، اور برانڈڈ پالشنگ تک تمام کام سٹون ایکسپرٹ کی زیر نگرانی۔' 
                    : 'From selecting raw quarry slabs to precision CNC edge profiling, floor leveling, anti-slip stair steps, and final crystallization.'}
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="text-center p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block">{isUrdu ? 'تخمینی ڈسکاؤنٹ' : 'Package Discount'}</span>
                  <span className="text-xl font-bold text-amber-400">Up to 12% OFF</span>
                  <span className="text-[10px] text-slate-400 block">{isUrdu ? 'مکمل پروجیکٹ کے لیے' : 'On Full Project Contract'}</span>
                </div>
              </div>
            </div>

            {/* Interactive New Project Generator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <Card className="lg:col-span-7 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl font-headline flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-[#dfb96c]" />
                    {isUrdu ? 'تعمیراتی لاگت کیلکولیٹر' : 'Project Scope & Material Estimator'}
                  </CardTitle>
                  <CardDescription>
                    {isUrdu ? 'اپنے پلاٹ کا سائز، میٹیریل گریڈ اور شامل کام منتخب کریں۔' : 'Select property size, material quality tier, and scope to configure live estimate.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Property Size */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isUrdu ? 'جائیداد کا سائز' : 'Property Size'}</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'marla5', label: '5 Marla' },
                        { id: 'marla10', label: '10 Marla' },
                        { id: 'kanal1', label: '1 Kanal' },
                        { id: 'kanal2', label: '2 Kanal' },
                        { id: 'commercial', label: 'Plaza/Comm' },
                      ].map((sz) => {
                        const isSelected = normalizePlotKey(projectSize) === sz.id;
                        return (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setProjectSize(sz.id)}
                            className={`py-2 px-1 text-xs rounded-lg border text-center transition-all ${
                              isSelected 
                                ? 'border-[#dfb96c] bg-[#dfb96c]/10 text-[#dfb96c] font-bold ring-2 ring-[#dfb96c]/50 shadow-sm' 
                                : 'border-border text-muted-foreground hover:bg-accent/30'
                            }`}
                          >
                            {sz.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* FLOOR COVERED AREA BREAKDOWN */}
                  <div className="space-y-3 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold text-[#dfb96c]">
                        {isUrdu ? 'فلور وائز کورڈ ایریا کی تفصیل (Covered Area Breakdown)' : 'Floor-Wise Covered Area Breakdown (Sq. Ft)'}
                      </Label>
                      <Badge variant="outline" className="border-[#dfb96c] text-[#dfb96c] font-bold">
                        {projectCalculatedEstimate.totalCoveredArea} Sq.Ft Total
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {/* Ground Floor */}
                      <div 
                        onClick={() => setIncludeGround(!includeGround)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${includeGround ? 'bg-card border-[#dfb96c]/50 ring-1 ring-[#dfb96c]/20 shadow-xs' : 'opacity-60 bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold">{isUrdu ? 'گراؤنڈ فلور' : 'Ground Floor'}</span>
                          <input 
                            type="checkbox" 
                            checked={includeGround} 
                            onChange={(e) => {
                              e.stopPropagation();
                              setIncludeGround(e.target.checked);
                            }}
                            className="h-4 w-4 accent-[#dfb96c] cursor-pointer"
                          />
                        </div>
                        {includeGround ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number" 
                              value={groundSqFt} 
                              onChange={(e) => setGroundSqFt(Number(e.target.value) || 0)}
                              className="font-bold text-xs h-8"
                            />
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {isUrdu ? 'کورڈ ایریا Sq.Ft' : 'Covered Sq.Ft'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic py-1">
                            {isUrdu ? 'غیر فعال (شامل نہیں)' : 'Disabled'}
                          </div>
                        )}
                      </div>

                      {/* First Floor */}
                      <div 
                        onClick={() => setIncludeFirst(!includeFirst)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${includeFirst ? 'bg-card border-[#dfb96c]/50 ring-1 ring-[#dfb96c]/20 shadow-xs' : 'opacity-60 bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold">{isUrdu ? 'فرسٹ فلور' : 'First Floor'}</span>
                          <input 
                            type="checkbox" 
                            checked={includeFirst} 
                            onChange={(e) => {
                              e.stopPropagation();
                              setIncludeFirst(e.target.checked);
                            }}
                            className="h-4 w-4 accent-[#dfb96c] cursor-pointer"
                          />
                        </div>
                        {includeFirst ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number" 
                              value={firstSqFt} 
                              onChange={(e) => setFirstSqFt(Number(e.target.value) || 0)}
                              className="font-bold text-xs h-8"
                            />
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {isUrdu ? 'کورڈ ایریا Sq.Ft' : 'Covered Sq.Ft'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic py-1">
                            {isUrdu ? 'غیر فعال (شامل نہیں)' : 'Disabled'}
                          </div>
                        )}
                      </div>

                      {/* Mezzanine Floor */}
                      <div 
                        onClick={() => setIncludeMezzanine(!includeMezzanine)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${includeMezzanine ? 'bg-card border-[#dfb96c]/50 ring-1 ring-[#dfb96c]/20 shadow-xs' : 'opacity-60 bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold">{isUrdu ? 'میزانین فلور' : 'Mezzanine'}</span>
                          <input 
                            type="checkbox" 
                            checked={includeMezzanine} 
                            onChange={(e) => {
                              e.stopPropagation();
                              setIncludeMezzanine(e.target.checked);
                            }}
                            className="h-4 w-4 accent-[#dfb96c] cursor-pointer"
                          />
                        </div>
                        {includeMezzanine ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number" 
                              value={mezzanineSqFt} 
                              onChange={(e) => setMezzanineSqFt(Number(e.target.value) || 0)}
                              className="font-bold text-xs h-8"
                            />
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {isUrdu ? 'کورڈ ایریا Sq.Ft' : 'Covered Sq.Ft'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic py-1">
                            {isUrdu ? 'غیر فعال (شامل نہیں)' : 'Disabled'}
                          </div>
                        )}
                      </div>

                      {/* Second Floor */}
                      <div 
                        onClick={() => setIncludeSecond(!includeSecond)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${includeSecond ? 'bg-card border-[#dfb96c]/50 ring-1 ring-[#dfb96c]/20 shadow-xs' : 'opacity-60 bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold">{isUrdu ? 'سیکنڈ / ممٹی' : '2nd / Mumty'}</span>
                          <input 
                            type="checkbox" 
                            checked={includeSecond} 
                            onChange={(e) => {
                              e.stopPropagation();
                              setIncludeSecond(e.target.checked);
                            }}
                            className="h-4 w-4 accent-[#dfb96c] cursor-pointer"
                          />
                        </div>
                        {includeSecond ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number" 
                              value={secondSqFt} 
                              onChange={(e) => setSecondSqFt(Number(e.target.value) || 0)}
                              className="font-bold text-xs h-8"
                            />
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {isUrdu ? 'کورڈ ایریا Sq.Ft' : 'Covered Sq.Ft'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic py-1">
                            {isUrdu ? 'غیر فعال (شامل نہیں)' : 'Disabled'}
                          </div>
                        )}
                      </div>

                      {/* Basement Floor */}
                      <div 
                        onClick={() => setIncludeBasement(!includeBasement)}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all ${includeBasement ? 'bg-card border-[#dfb96c]/50 ring-1 ring-[#dfb96c]/20 shadow-xs' : 'opacity-60 bg-muted/30'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold">{isUrdu ? 'بیسمنٹ فلور' : 'Basement'}</span>
                          <input 
                            type="checkbox" 
                            checked={includeBasement} 
                            onChange={(e) => {
                              e.stopPropagation();
                              setIncludeBasement(e.target.checked);
                            }}
                            className="h-4 w-4 accent-[#dfb96c] cursor-pointer"
                          />
                        </div>
                        {includeBasement ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number" 
                              value={basementSqFt} 
                              onChange={(e) => setBasementSqFt(Number(e.target.value) || 0)}
                              className="font-bold text-xs h-8"
                            />
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {isUrdu ? 'کورڈ ایریا Sq.Ft' : 'Covered Sq.Ft'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic py-1">
                            {isUrdu ? 'غیر فعال (شامل نہیں)' : 'Disabled'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Material Grade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isUrdu ? 'میٹیریل کی کوالٹی / گریڈ' : 'Material & Finish Quality Grade'}</Label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { 
                          id: 'budget', 
                          nameEn: 'Standard Local', 
                          nameUr: 'اسٹینڈرڈ لوکل (سنی وائٹ/زیارت)', 
                          rate: rates.newProjects.gradeRates.budget || 120,
                          mult: rates.newProjects.gradeMultipliers?.standard ?? 1.0,
                          desc: `${rates.newProjects.gradeRates.budget || 120} PKR/sqft` 
                        },
                        { 
                          id: 'premium', 
                          nameEn: 'Premium Local', 
                          nameUr: 'پریمیم لوکل (بوٹیسینا/بادام)', 
                          rate: rates.newProjects.gradeRates.premium || 220,
                          mult: rates.newProjects.gradeMultipliers?.premium ?? 1.83,
                          desc: `${rates.newProjects.gradeRates.premium || 220} PKR/sqft` 
                        },
                        { 
                          id: 'luxury', 
                          nameEn: 'Imported Luxury', 
                          nameUr: 'امپورٹڈ (اٹالین/سپینش)', 
                          rate: rates.newProjects.gradeRates.luxury || 450,
                          mult: rates.newProjects.gradeMultipliers?.luxury ?? 3.75,
                          desc: `${rates.newProjects.gradeRates.luxury || 450} PKR/sqft` 
                        },
                      ].map((gr) => (
                        <button
                          key={gr.id}
                          type="button"
                          onClick={() => setProjectGrade(gr.id as any)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            projectGrade === gr.id 
                              ? 'border-[#dfb96c] bg-[#dfb96c]/10 ring-1 ring-[#dfb96c]' 
                              : 'border-border hover:bg-accent/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs">{isUrdu ? gr.nameUr : gr.nameEn}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                              {gr.mult.toFixed(2)}×
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">{gr.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Included Scope Options */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{isUrdu ? 'شامل شدہ کام (Scope of Work)' : 'Select Project Scope Components'}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'flooring', labelEn: 'Ground & 1st Floor Marble Flooring', labelUr: 'تمام کمروں اور ہالز کی فلورنگ' },
                        { id: 'stairs', labelEn: 'Staircase Steps & Profile Skirting', labelUr: 'مین سیڑھیاں، قدم اور بارڈر' },
                        { id: 'kitchen', labelEn: 'Kitchen Countertops & Backsplash', labelUr: 'کچن کاؤنٹر ٹاپ اور ڈبل ایجنگ' },
                        { id: 'elevation', labelEn: 'Front Elevation & Gate Pillar Cladding', labelUr: 'مین فرنٹ ایلیویشن اور پلرز' },
                        { id: 'bathrooms', labelEn: 'Master Bathrooms & Vanities', labelUr: 'ماسٹر باتھ رومز اور وینیٹی ٹاپس' },
                      ].map((sc) => {
                        const checked = selectedScopes.includes(sc.id);
                        return (
                          <div 
                            key={sc.id}
                            onClick={() => toggleScope(sc.id)}
                            className={`p-3 rounded-md border cursor-pointer flex items-center justify-between transition-all ${
                              checked 
                                ? 'border-[#dfb96c] bg-[#dfb96c]/5 font-medium' 
                                : 'border-border opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span className="text-xs sm:text-sm">{isUrdu ? sc.labelUr : sc.labelEn}</span>
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-[#dfb96c] border-[#dfb96c] text-slate-950' : 'border-muted-foreground'}`}>
                              {checked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">
                          {isUrdu ? 'تخمینی کل پروجیکٹ لاگت' : 'Estimated Turnkey Project Cost'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-[#dfb96c] tracking-tight">
                          PKR {projectCalculatedEstimate.total.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          (Includes raw materials, transportation, fixing labor & polishing)
                        </span>
                      </div>
                      <Badge variant="outline" className="border-amber-400 text-amber-400 shrink-0">
                        {isUrdu ? 'سائٹ کنسلٹیشن مفت' : 'Free Architectural Consultation'}
                      </Badge>
                    </div>

                    {/* Live Plot & Floor Breakdown */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 text-[11px] font-semibold">{isUrdu ? 'پلاٹ سائز:' : 'Active Plot:'}</span>
                      <Badge className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 border-amber-500/30 text-[11px]">
                        {normalizePlotKey(projectSize) === 'marla5' ? '5 Marla' :
                         normalizePlotKey(projectSize) === 'marla10' ? '10 Marla' :
                         normalizePlotKey(projectSize) === 'kanal1' ? '1 Kanal' :
                         normalizePlotKey(projectSize) === 'kanal2' ? '2 Kanal' : 'Commercial'}
                      </Badge>
                      {includeGround && (
                        <span className="text-slate-300 text-[11px]">
                          Ground: <strong className="text-amber-300">{projectCalculatedEstimate.activeGroundSqFt} sq.ft</strong>
                        </span>
                      )}
                      {includeFirst && (
                        <span className="text-slate-300 text-[11px]">
                          | First: <strong className="text-amber-300">{projectCalculatedEstimate.activeFirstSqFt} sq.ft</strong>
                        </span>
                      )}
                      {includeMezzanine && (
                        <span className="text-slate-300 text-[11px]">
                          | Mezzanine: <strong className="text-amber-300">{projectCalculatedEstimate.activeMezzanineSqFt} sq.ft</strong>
                        </span>
                      )}
                      {includeSecond && (
                        <span className="text-slate-300 text-[11px]">
                          | 2nd/Mumty: <strong className="text-amber-300">{projectCalculatedEstimate.activeSecondSqFt} sq.ft</strong>
                        </span>
                      )}
                      {includeBasement && (
                        <span className="text-slate-300 text-[11px]">
                          | Basement: <strong className="text-amber-300">{projectCalculatedEstimate.activeBasementSqFt} sq.ft</strong>
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px] sm:ml-auto">
                        Total Covered Area: <strong className="text-white">{projectCalculatedEstimate.totalCoveredArea} sq.ft</strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form Column */}
              <Card className="lg:col-span-5 shadow-md flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                      <HardHat className="h-5 w-5 text-[#dfb96c]" />
                      {isUrdu ? 'پروجیکٹ شیڈول اور مشاورت' : 'Request Construction Quote'}
                    </CardTitle>
                    <CardDescription>
                      {isUrdu ? 'اپنا پلان جمع کروائیں اور ہمارے انجینئر سے براہِ راست مشورہ کریں۔' : 'Submit your project summary for a customized quotation & site measurement.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <form id="proj-form" onSubmit={handleProjectSubmit} className="space-y-3">
                      <div>
                        <Label htmlFor="proj-name" className="text-xs font-semibold">{isUrdu ? 'کلائنٹ کا نام *' : 'Client Name *'}</Label>
                        <Input 
                          id="proj-name"
                          required
                          value={projName}
                          onChange={(e) => setProjName(e.target.value)}
                          placeholder="e.g. Engr. Tahir Mahmood"
                        />
                      </div>

                      <div>
                        <Label htmlFor="proj-phone" className="text-xs font-semibold">{isUrdu ? 'فون / واٹس ایپ *' : 'WhatsApp Phone *'}</Label>
                        <Input 
                          id="proj-phone"
                          required
                          value={projPhone}
                          onChange={(e) => setProjPhone(e.target.value)}
                          placeholder="0300 1234567"
                        />
                      </div>

                      <div>
                        <Label htmlFor="proj-city" className="text-xs font-semibold">{isUrdu ? 'سائٹ لوکیشن / شہر' : 'Site Location / City'}</Label>
                        <Input 
                          id="proj-city"
                          value={projCity}
                          onChange={(e) => setProjCity(e.target.value)}
                          placeholder="e.g. DHA Phase 2, Islamabad"
                        />
                      </div>

                      <div>
                        <Label htmlFor="proj-notes" className="text-xs font-semibold">{isUrdu ? 'خاص ترجیحات یا میٹیریل کی ڈیمانڈ' : 'Special Instructions'}</Label>
                        <Textarea 
                          id="proj-notes"
                          rows={3}
                          value={projNotes}
                          onChange={(e) => setProjNotes(e.target.value)}
                          placeholder={isUrdu ? 'مثلاً: زپ لائن سیڑھیاں، اٹالین بارڈر ڈیزائن' : 'e.g. Need bookmatched Italian marble for main lounge wall'}
                        />
                      </div>
                    </form>
                  </CardContent>
                </div>

                <CardFooter className="pt-2">
                  <Button 
                    form="proj-form"
                    type="submit" 
                    disabled={isSubmittingProj}
                    className="w-full bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold py-6 text-base"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {isUrdu ? 'پروجیکٹ پلان واٹس ایپ کریں' : 'Send Construction Plan'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: INTERIOR WORK SYSTEM */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="interior-system" className="space-y-8 mt-2">
            {/* Header intro */}
            <div className="text-center space-y-3 max-w-3xl mx-auto py-2">
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 px-3 py-1">
                <Palette className="mr-1.5 h-3.5 w-3.5" />
                {isUrdu ? 'کسٹم انٹیریئر اسٹون سٹوڈیو' : 'Custom Interior Stone Design System'}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline tracking-tight text-primary">
                {isUrdu ? 'جدید انٹیریئر اسٹون اور وال فیچرز کا ڈیزائنر' : 'Architectural Interior Stone Customization Engine'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground" dir={isUrdu ? 'rtl' : 'ltr'}>
                {isUrdu 
                  ? 'اپنے لاؤنج کی بیک لِٹ اونیکس وال، کسٹم بوک میچڈ ماربل پینلز، اور فلوٹڈ وال مائلز کو خود ڈیزائن کریں۔' 
                  : 'Design luxurious backlit translucent Onyx feature walls, bookmatched Italian marble panels, and CNC carved 3D stone murals.'}
              </p>
            </div>

            {/* Interactive Customizer Workbench */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Customizer Controls */}
              <Card className="lg:col-span-7 shadow-lg border-2 border-amber-500/20">
                <CardHeader className="bg-gradient-to-r from-slate-950 to-slate-900 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl font-headline text-[#dfb96c] flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-[#dfb96c]" />
                      {isUrdu ? 'انٹیریئر کنفیگریٹر' : 'Interactive Interior Specifier'}
                    </CardTitle>
                    <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Step-by-Step
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Step 1: Zone Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground block">
                      1. {isUrdu ? 'مقام / کمرہ کا انتخاب کریں' : 'Select Target Interior Zone'}
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'living', nameEn: 'Living Room TV Wall', nameUr: 'مین لاؤنج ٹی وی وال' },
                        { id: 'kitchen', nameEn: 'Luxury Kitchen Island', nameUr: 'لکژری کچن آئی لینڈ' },
                        { id: 'bathroom', nameEn: 'Master Bath Feature', nameUr: 'ماسٹر باتھ شوہر وال' },
                        { id: 'foyer', nameEn: 'Entry Foyer & Floor Medallion', nameUr: 'مین اینٹری میڈالین' },
                        { id: 'office', nameEn: 'Executive Reception Desk', nameUr: 'ایگزیکٹو ریسیپشن کاؤنٹر' },
                      ].map((zn) => (
                        <button
                          key={zn.id}
                          type="button"
                          onClick={() => setInteriorZone(zn.id as any)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            interiorZone === zn.id 
                              ? 'border-[#dfb96c] bg-[#dfb96c]/10 text-[#dfb96c] font-bold ring-1 ring-[#dfb96c]' 
                              : 'border-border hover:bg-accent/30'
                          }`}
                        >
                          <span className="text-xs block">{isUrdu ? zn.nameUr : zn.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Stone Technique */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground block">
                      2. {isUrdu ? 'اسٹون میٹیریل اور آرٹ سٹائل' : 'Select Stone Craft Technique'}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { 
                          id: 'bookmatched', 
                          titleEn: 'Bookmatched Italian Slabs', 
                          titleUr: 'بوک میچڈ اٹالین ماربل',
                          desc: 'Symmetrical V-vein matching for high impact' 
                        },
                        { 
                          id: 'backlit-onyx', 
                          titleEn: 'Translucent Backlit Onyx', 
                          titleUr: 'بیک لِٹ اونیکس (روشن پتھر)',
                          desc: 'Illuminated stone with embedded LED panel' 
                        },
                        { 
                          id: 'cnc-carved', 
                          titleEn: 'CNC 3D Relief Murals', 
                          titleUr: 'سی این سی 3D نٹی نقش و نگار',
                          desc: 'Precision textured geometric or floral patterns' 
                        },
                        { 
                          id: 'waterjet-brass', 
                          titleEn: 'Waterjet Brass Inlay', 
                          titleUr: 'واٹر جیٹ براس انلے پینل',
                          desc: 'Metallic brass geometric strip embedded in marble' 
                        },
                        { 
                          id: 'fluted-stone', 
                          titleEn: 'Fluted & Ribbed Stone Cladding', 
                          titleUr: 'فلوٹڈ عمودی شیپ پینل',
                          desc: 'Modern vertical ribbed wall texture' 
                        },
                      ].map((tech) => (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => setInteriorTechnique(tech.id as any)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            interiorTechnique === tech.id 
                              ? 'border-[#dfb96c] bg-[#dfb96c]/10 ring-1 ring-[#dfb96c]' 
                              : 'border-border hover:bg-accent/40'
                          }`}
                        >
                          <span className="font-bold text-xs">{isUrdu ? tech.titleUr : tech.titleEn}</span>
                          <span className="text-[10px] text-muted-foreground mt-1">{tech.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Finish & Lighting */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        3. {isUrdu ? 'سطحی پالش' : 'Surface Finish'}
                      </Label>
                      <select 
                        value={interiorFinish} 
                        onChange={(e) => setInteriorFinish(e.target.value as any)}
                        className="w-full text-xs p-2.5 rounded-lg border bg-background"
                      >
                        <option value="mirror-gloss">{isUrdu ? `آئینہ جیسی چمک (+${rates.interior.finishes.mirrorGloss} PKR)` : `High Gloss Mirror Polish (+${rates.interior.finishes.mirrorGloss} PKR)`}</option>
                        <option value="honed-satin">{isUrdu ? `سادہ میٹ (+${rates.interior.finishes.honedSatin} PKR)` : `Honed Satin Smooth (+${rates.interior.finishes.honedSatin} PKR)`}</option>
                        <option value="fluted-textured">{isUrdu ? `عمودی دھاریاں (+${rates.interior.finishes.flutedTextured} PKR)` : `Fluted Vertical Ribbed (+${rates.interior.finishes.flutedTextured} PKR)`}</option>
                        <option value="leathered">{isUrdu ? `چمڑے جیسا ٹیکسچر (+${rates.interior.finishes.leathered} PKR)` : `Leathered Natural Touch (+${rates.interior.finishes.leathered} PKR)`}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        4. {isUrdu ? 'لائٹنگ سسٹم' : 'Integrated Lighting'}
                      </Label>
                      <select 
                        value={interiorLighting} 
                        onChange={(e) => setInteriorLighting(e.target.value as any)}
                        className="w-full text-xs p-2.5 rounded-lg border bg-background"
                      >
                        <option value="warm-led">{isUrdu ? `وارم ایل ای ڈی پینل (+${rates.interior.lighting.warmLed} PKR)` : `Warm LED Panel (+${rates.interior.lighting.warmLed} PKR)`}</option>
                        <option value="rgb-accent">{isUrdu ? `اسمارٹ آر جی بی پینل (+${rates.interior.lighting.rgbAccent} PKR)` : `Smart RGB App Control (+${rates.interior.lighting.rgbAccent} PKR)`}</option>
                        <option value="spotlights">{isUrdu ? `سیلنگ اسپاٹ لائٹس (+${rates.interior.lighting.spotlights} PKR)` : `Top Ceiling Spotlights (+${rates.interior.lighting.spotlights} PKR)`}</option>
                        <option value="none">{isUrdu ? `کوئی لائٹ نہیں (+${rates.interior.lighting.none} PKR)` : `No Lighting (+${rates.interior.lighting.none} PKR)`}</option>
                      </select>
                    </div>
                  </div>

                  {/* Wall Area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        5. {isUrdu ? 'رقبہ (مربع فٹ)' : 'Feature Wall Dimensions (Sq. Ft)'}
                      </Label>
                      <span className="text-xs font-bold text-[#dfb96c]">{interiorArea} Sq.Ft</span>
                    </div>
                    <Input 
                      type="number"
                      value={interiorArea}
                      onChange={(e) => setInteriorArea(e.target.value)}
                      placeholder="250"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Visual Preview & Live Spec Sheet */}
              <Card className="lg:col-span-5 bg-slate-950 text-white border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#dfb96c]" />
                      <span className="font-headline font-bold text-sm text-[#dfb96c]">
                        {isUrdu ? 'انٹیریئر ڈیزائن لائیو پریویو' : 'Interior Spec Breakdown'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                      Custom Studio
                    </Badge>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Visual Card representation */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 flex flex-col justify-between shadow-2xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center justify-between z-10">
                        <Badge className="bg-[#dfb96c] text-slate-950 font-black text-[10px] uppercase">
                          {interiorZone}
                        </Badge>
                        <span className="text-[11px] font-mono text-amber-300">
                          {interiorArea} SQFT
                        </span>
                      </div>

                      <div className="z-10 my-4 space-y-1">
                        <h4 className="text-lg font-bold text-white tracking-wide">
                          {interiorTechnique.replace('-', ' ').toUpperCase()}
                        </h4>
                        <p className="text-xs text-slate-300">
                          Finish: <span className="text-amber-400">{interiorFinish}</span> | Light: <span className="text-amber-400">{interiorLighting}</span>
                        </p>
                      </div>

                      <div className="z-10 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Stone Expert Studio</span>
                        <span className="text-xs font-bold text-[#dfb96c]">Rate: PKR {interiorCalculatedEstimate.rate}/sqft</span>
                      </div>
                    </div>

                    {/* Cost Specs */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                        <span>{isUrdu ? 'بنیادی تکنیک' : 'Base Crafting Rate'}:</span>
                        <span className="font-mono text-white">PKR {interiorCalculatedEstimate.rate - 50}/sqft</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                        <span>{isUrdu ? 'کل رقبہ' : 'Calculated Surface Area'}:</span>
                        <span className="font-mono text-white">{interiorArea} sq.ft</span>
                      </div>
                      <div className="flex justify-between py-2 text-base font-bold text-[#dfb96c]">
                        <span>{isUrdu ? 'کل تخمینی بجٹ' : 'Total Project Estimate'}:</span>
                        <span className="text-xl">PKR {interiorCalculatedEstimate.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="p-6 pt-0">
                  <Button 
                    onClick={() => setShowInteriorDialog(true)}
                    className="w-full bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold py-6 text-base"
                  >
                    <Palette className="mr-2 h-5 w-5" />
                    {isUrdu ? 'یہ انٹیریئر ڈیزائن بک کریں' : 'Book Interior Design Visit'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Interior Consultation Dialog */}
      <Dialog open={showInteriorDialog} onOpenChange={setShowInteriorDialog}>
        <DialogContent className="max-w-md bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline text-[#dfb96c] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#dfb96c]" />
              {isUrdu ? 'انٹیریئر ڈیزائن بکنگ' : 'Confirm Interior Design Booking'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {isUrdu ? 'اپنا رابطہ درج کریں تاکہ ہمارے آرکیٹیکٹ آپ کی سائٹ پر 3D نمونے لائیں۔' : 'Enter details to schedule an architectural visit with 3D stone samples.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInteriorSubmit} className="space-y-3 pt-2">
            <div>
              <Label htmlFor="int-name" className="text-xs font-semibold text-slate-300">{isUrdu ? 'نام *' : 'Name *'}</Label>
              <Input 
                id="int-name"
                required
                value={interiorName}
                onChange={(e) => setInteriorName(e.target.value)}
                placeholder="e.g. Hassan Raza"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div>
              <Label htmlFor="int-phone" className="text-xs font-semibold text-slate-300">{isUrdu ? 'فون / واٹس ایپ *' : 'WhatsApp Phone *'}</Label>
              <Input 
                id="int-phone"
                required
                value={interiorPhone}
                onChange={(e) => setInteriorPhone(e.target.value)}
                placeholder="0300 1234567"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div>
              <Label htmlFor="int-loc" className="text-xs font-semibold text-slate-300">{isUrdu ? 'سائٹ کا پتہ' : 'Location / Address'}</Label>
              <Input 
                id="int-loc"
                value={interiorLocation}
                onChange={(e) => setInteriorLocation(e.target.value)}
                placeholder="e.g. Bahria Town Phase 7"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div>
              <Label htmlFor="int-notes" className="text-xs font-semibold text-slate-300">{isUrdu ? 'کوئی خاص ہدایت' : 'Additional Requests'}</Label>
              <Textarea 
                id="int-notes"
                rows={2}
                value={interiorNotes}
                onChange={(e) => setInteriorNotes(e.target.value)}
                placeholder="e.g. Bring Onyx sample with warm backlighting"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button 
                type="submit" 
                disabled={isSubmittingInterior}
                className="w-full bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold"
              >
                <Send className="mr-2 h-4 w-4" />
                {isUrdu ? 'درخواست ارسال کریں' : 'Confirm & Dispatch to WhatsApp'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
