'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Icons } from '@/components/icons';
import { getHomepageConfig } from '@/lib/admin-actions';
import { 
  Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ArrowLeft, 
  Printer, 
  Plus, 
  Trash2, 
  Check, 
  Save, 
  FileText, 
  Wrench, 
  Hammer, 
  ShieldCheck, 
  Globe, 
  Compass, 
  Home, 
  Power, 
  Droplet, 
  Building, 
  FolderPlus, 
  Sparkles,
  Info,
  RotateCcw,
  FileDown,
  Image as ImageIcon
} from 'lucide-react';
import { initializeFirebase } from '@/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

interface LaborItem {
  id: string;
  nameEn: string;
  nameUr: string;
  rate: number;
  qty: number;
  unit: 'sq.ft' | 'RFT' | 'Steps' | 'Job' | 'Unit';
  category: 'marble' | 'tile' | 'facade' | 'finishing' | 'custom';
  included: boolean;
}

interface SopClause {
  id: string;
  titleEn: string;
  titleUr: string;
  descEn: string;
  descUr: string;
  category: 'accommodation' | 'materials' | 'water' | 'electricity' | 'scaffolding' | 'accessories' | 'other';
  standard: 'local' | 'national' | 'international';
  included: boolean;
}

const DEFAULT_LABOR_ITEMS: LaborItem[] = [
  // Marble fixing
  { id: 'm-floor', nameEn: 'Marble Floor/Wall Installation (Wet Laying)', nameUr: 'فرش/دیوار پر ماربل فکسنگ (سیمنٹ مارٹر)', rate: 140, qty: 0, unit: 'sq.ft', category: 'marble', included: false },
  { id: 'm-borders', nameEn: 'Marble Borders / Pattern Inlay Installation', nameUr: 'ماربل بارڈرز / پیٹرن ان لے فکسنگ', rate: 160, qty: 0, unit: 'RFT', category: 'marble', included: false },
  { id: 'm-skirting', nameEn: 'Skirting Installation (Straight/Chamfered)', nameUr: 'اسکرٹنگ فکسنگ (سیدھی/چیمفرڈ)', rate: 45, qty: 0, unit: 'RFT', category: 'marble', included: false },
  
  // Tile fixing
  { id: 't-floor', nameEn: 'Ceramic / Porcelain Tile Floor Installation', nameUr: 'ٹائل فرش فکسنگ (بانڈ/سیمنٹ)', rate: 110, qty: 0, unit: 'sq.ft', category: 'tile', included: false },
  { id: 't-wall', nameEn: 'Bath / Kitchen Wall Tile Installation', nameUr: 'باتھ روم/کچن دیوار ٹائل فکسنگ', rate: 125, qty: 0, unit: 'sq.ft', category: 'tile', included: false },
  { id: 't-epoxy', nameEn: 'Tile Joint Grouting (Epoxy / Premium)', nameUr: 'ٹائل جوائنٹ بھرائی (ایپوکسی/پریمیم)', rate: 30, qty: 0, unit: 'sq.ft', category: 'tile', included: false },
  
  // Facade fixing
  { id: 'f-marble', nameEn: 'Facade Marble Fixing (Brass Pin & Anchor Cladding)', nameUr: 'فرنٹ ایلیویشن ماربل فکسنگ (براس پن اور اینکر)', rate: 350, qty: 0, unit: 'sq.ft', category: 'facade', included: false },
  { id: 'f-tile', nameEn: 'Facade Wall Tile Fixing (High-Bond Adhesive)', nameUr: 'فرنٹ ایلیویشن ٹائل فکسنگ (ٹائل بانڈ)', rate: 220, qty: 0, unit: 'sq.ft', category: 'facade', included: false },
  
  // Stairs & Counters
  { id: 's-stairs', nameEn: 'Stair Treads and Risers Installation', nameUr: 'سیڑھیوں کے اسٹیپ اور رائزر فکسنگ', rate: 400, qty: 0, unit: 'Steps', category: 'finishing', included: false },
  { id: 'c-vanity', nameEn: 'Granite / Marble Vanity Countertop Shifting & Installation', nameUr: 'گرینائٹ/ماربل وینٹی کاؤنٹر ٹاپ فکسنگ', rate: 1800, qty: 0, unit: 'Unit', category: 'finishing', included: false },
  { id: 'c-kitchen', nameEn: 'Kitchen Countertop Installation & Sink Cutting', nameUr: 'کچن کاؤنٹر ٹاپ فکسنگ اور سنک کٹنگ', rate: 3000, qty: 0, unit: 'Unit', category: 'finishing', included: false },
  
  // Polishing
  { id: 'p-polish', nameEn: 'Floor Grinding & Premium Diamond Polishing', nameUr: 'ماربل رگڑائی اور ڈائمنڈ پالشنگ', rate: 85, qty: 0, unit: 'sq.ft', category: 'finishing', included: false },
];

const DEFAULT_SOP_CLAUSES: SopClause[] = [
  // Accommodation
  {
    id: 'sop-acc-local',
    titleEn: 'Labor Accommodation & Lodging (Local Standard)',
    titleUr: 'لیبر کی رہائش اور کھانا (مقامی معیار)',
    descEn: 'The client shall provide a secure, dry on-site room with ventilation, lockable door, and toilet/shower access for the labor team. If not available on site, client must arrange clean accommodation nearby at their own expense.',
    descUr: 'کلائنٹ لیبر ٹیم کے لیے سائٹ پر ہوا دار، تالے کے ساتھ محفوظ کمرہ اور واش روم فراہم کرے گا۔ اگر سائٹ پر رہائش دستیاب نہ ہو، تو کلائنٹ اپنے خرچ پر قریبی رہائش کا انتظام کرے گا۔',
    category: 'accommodation',
    standard: 'local',
    included: true
  },
  {
    id: 'sop-acc-intl',
    titleEn: 'Labor Welfare & Standard Lodging (International HSE)',
    titleUr: 'لیبر ویلفیئر اور رہائش (بین الاقوامی معیار)',
    descEn: 'Accommodation must strictly meet safety standards: minimum 50 sq.ft per worker, proper fans/heating, daily clean drinking water, private hygienic sanitation, emergency first aid, and basic electricity points.',
    descUr: 'رہائش کا کمرہ مکمل محفوظ اور ہوا دار ہونا چاہیے، جس میں فی کاریگر کم از کم 50 مربع فٹ جگہ، پنکھا، روزانہ پینے کا صاف پانی، صحت بخش واش روم، فرسٹ ایڈ اور لائٹ کے پوائنٹس لازمی ہوں۔',
    category: 'accommodation',
    standard: 'international',
    included: false
  },
  
  // Materials
  {
    id: 'sop-mat-local',
    titleEn: 'Standard Material Supply Division',
    titleUr: 'سپلائر / کلائنٹ کے ذمہ میٹریل',
    descEn: 'Client/Supplier must deliver all premium gray/white cement, screened hill sand, high-bond adhesive, epoxy, grouting powder, spacer joint clips, and facade anchors/brass pins at the work floors. Labor contractor supplies only cutting blades, polishing pads, hand tools, and skilled personnel.',
    descUr: 'کلائنٹ/سپلائر تمام پریمیم گرے/وائٹ سیمنٹ، چھنی ہوئی ریت، ٹائل بانڈ، ایپوکسی، دراز بھرنے کا پاؤڈر، اسپیسر اور اینکرز/براس پن متعلقہ فلور پر پہنچانے کا ذمہ دار ہے۔ لیبر کے ذمے صرف کٹنگ بلیڈ، پالش پیڈز، عام اوزار اور کاریگر ہوں گے۔',
    category: 'materials',
    standard: 'local',
    included: true
  },
  
  // Water supply
  {
    id: 'sop-water-local',
    titleEn: 'Clean Water Supply Requirement',
    titleUr: 'پانی کی مسلسل فراہمی',
    descEn: 'The client must provide a continuous, high-volume supply of clean, non-saline water at all working areas. High-salinity/salty water is strictly prohibited as it triggers marble salt efflorescence and ruins the final chemical polish.',
    descUr: 'کلائنٹ کام کی تمام جگہوں پر پینے اور رگڑائی کے لیے صاف اور میٹھے پانی کی مسلسل فراہمی کو یقینی بنائے گا۔ کھارا یا نمکین پانی استعمال کرنے کی اجازت نہیں ہوگی کیونکہ اس سے ماربل پر نمکیات آجاتے ہیں اور پالش خراب ہوتی ہے۔',
    category: 'water',
    standard: 'local',
    included: true
  },
  
  // Electric supply
  {
    id: 'sop-elec-local',
    titleEn: 'Continuous Electric Power points',
    titleUr: 'بجلی کی بلا تعطل فراہمی',
    descEn: 'Uninterrupted electricity (220V/Single Phase or 3-Phase stable connection) must be supplied by the client within 15 meters of all working zones. Power supply is crucial for heavy-duty diamond grinding machines and cutters.',
    descUr: 'کلائنٹ کام کی ہر جگہ سے 15 میٹر کے اندر سنگل فیز یا تھری فیز مستحکم بجلی کا کنکشن مہیا کرے گا۔ رگڑائی کی بڑی مشینوں اور کٹر کے لیے بجلی کی بلا تعطل فراہمی انتہائی ضروری ہے۔',
    category: 'electricity',
    standard: 'local',
    included: true
  },
  
  // Scaffolding / Folding
  {
    id: 'sop-scaff-local',
    titleEn: 'Safe Scaffold / Folding (Height works)',
    titleUr: 'محفوظ پاڑ اور سہار کا انتظام',
    descEn: 'For wall cladding or front facade works above 8 feet height, the client is solely responsible for arranging, erecting, and securing safe steel/bamboo scaffolding (Folding / سہار) with proper sturdy horizontal walk-boards.',
    descUr: '8 فٹ سے زیادہ بلندی پر فرنٹ ایلیویشن یا اندرونی دیواروں کے کام کے لیے کلائنٹ اپنے خرچ پر لوہے یا بانس کی مضبوط اور محفوظ پاڑ (سکافولڈنگ) اور چلنے کے تختے لگانے کا ذمہ دار ہوگا۔',
    category: 'scaffolding',
    standard: 'local',
    included: true
  },
  {
    id: 'sop-scaff-intl',
    titleEn: 'Scaffolding Compliance & Fall Protection (International Standard)',
    titleUr: 'پاڑ کی حفاظت کے بین الاقوامی قوانین',
    descEn: 'Scaffolding must be constructed strictly under OSHA/certified standards, featuring secure handrails, toe-boards, non-slip platforms, double planks, and regular stability checks. Laborers must use harness lines anchored securely.',
    descUr: 'پاڑ بین الاقوامی حفاظتی معیار کے مطابق ہونی چاہیے جس میں حفاظتی ریلنگ، پاؤں کی رکاوٹیں اور مضبوط تختے شامل ہوں۔ اونچائی پر کام کرنے والے کاریگروں کے لیے سیفٹی بیلٹ کا کنکشن لازمی ہوگا۔',
    category: 'scaffolding',
    standard: 'international',
    included: false
  },

  // Shifting & Waste
  {
    id: 'sop-shift-local',
    titleEn: 'Material Shifting to Upper Floors',
    titleUr: 'ماربل اور ٹائل کی بالائی منزلوں پر منتقلی',
    descEn: 'Shifting of heavy marble slabs, tiles, and bags of cement to first floor, second floor, or roof is the client\'s responsibility. If done by the labor crew, a pre-agreed manual lifting fee of PKR 10 to 30 per piece/sq.ft will be added.',
    descUr: 'ماربل کی سلائبس، ٹائلز اور سیمنٹ کی بوریوں کو پہلی منزل، دوسری منزل یا چھت پر چڑھانا کلائنٹ کی ذمہ داری ہے۔ اگر لیبر یہ کام کرے گی تو فی بوری/ٹائل یا فی مربع فٹ کے حساب سے اضافی منتقلی کے چارجز لاگو ہوں گے۔',
    category: 'accessories',
    standard: 'local',
    included: true
  },
  {
    id: 'sop-curing-local',
    titleEn: 'Surface Curing & Watering',
    titleUr: 'سیمنٹ کی ترائی کا انتظام',
    descEn: 'After installation of marble or tiles, regular daily watering (curing) of the finished floors/walls must be done by the client\'s on-site watchman or staff for at least 7 consecutive days to guarantee full structural cement bonding strength.',
    descUr: 'ماربل یا ٹائل لگانے کے بعد روزانہ پانی کی ترائی کرنا کلائنٹ کی ذمہ داری ہے۔ مضبوط بانڈنگ اور سیمنٹ کی پختگی کے لیے کم از کم 7 دن مسلسل پانی دینا لازمی ہے۔',
    category: 'accessories',
    standard: 'local',
    included: true
  },
  {
    id: 'sop-waste-local',
    titleEn: 'Debris Shifting and Disposal',
    titleUr: 'ملبہ کی صفائی اور ٹھکانے لگانا',
    descEn: 'Daily sweeping of the workspace is done by labor. However, shifting the accumulated cement bags, marble off-cuts, and debris down to ground floor and loading it onto transport is the client\'s responsibility.',
    descUr: 'روزانہ کام کی جگہ کی جھاڑو لیبر لگائے گی۔ البتہ بچ جانے والا فضلہ، کچرا اور ماربل کے ٹکڑے نیچے گراؤنڈ فلور پر منتقل کرنا اور ٹرالی پر لوڈ کرنا کلائنٹ کے ذمہ ہوگا۔',
    category: 'accessories',
    standard: 'local',
    included: true
  },
];

export default function LaborQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for Customer info
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    validDays: '15'
  });

  // State for quotation items
  const [items, setItems] = useState<LaborItem[]>(DEFAULT_LABOR_ITEMS);
  const [customItems, setCustomItems] = useState<LaborItem[]>([]);
  
  // Custom item adding form
  const [newCustomItem, setNewCustomItem] = useState({
    nameEn: '',
    nameUr: '',
    rate: 0,
    qty: 0,
    unit: 'sq.ft' as LaborItem['unit'],
    category: 'custom' as LaborItem['category']
  });

  // State for SOP clauses
  const [sopClauses, setSopClauses] = useState<SopClause[]>(DEFAULT_SOP_CLAUSES);
  const [customSopTitleEn, setCustomSopTitleEn] = useState('');
  const [customSopTitleUr, setCustomSopTitleUr] = useState('');
  const [customSopDescEn, setCustomSopDescEn] = useState('');
  const [customSopDescUr, setCustomSopDescUr] = useState('');

  // General quotation configuration
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Rates are negotiable based on final layout design and prompt payments.');
  
  // UI and Firebase States
  const documentRef = useRef<HTMLDivElement>(null);
  const [letterheadUrl, setLetterheadUrl] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuotations, setSavedQuotations] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [sopFilter, setSopFilter] = useState<'all' | 'local' | 'national' | 'international'>('all');

  // Fetch Homepage Config for Company Letterhead & Logo
  useEffect(() => {
    getHomepageConfig().then((data) => {
      if (data) {
        if (data.letterheadUrl) setLetterheadUrl(data.letterheadUrl);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      }
    }).catch(err => {
      console.error("Error loading homepage config for letterhead:", err);
    });
  }, []);

  // Local storage auto-save state
  const [isAutoSaveLoaded, setIsAutoSaveLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load Saved Quotes on Mount
  useEffect(() => {
    fetchSavedQuotations();
  }, []);

  // Auto-save: Load draft from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('labor_quotation_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.customer) setCustomer(parsed.customer);
        if (parsed.items) {
          setItems(prevItems => {
            return prevItems.map(defaultItem => {
              const savedItem = parsed.items.find((si: any) => si.id === defaultItem.id);
              return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
            });
          });
        }
        if (parsed.customItems) setCustomItems(parsed.customItems);
        if (parsed.sopClauses) {
          setSopClauses(prevSops => {
            return prevSops.map(defaultSop => {
              const savedSop = parsed.sopClauses.find((ss: any) => ss.id === defaultSop.id);
              return savedSop ? { ...defaultSop, ...savedSop } : defaultSop;
            });
          });
        }
        if (typeof parsed.discount === 'number') setDiscount(parsed.discount);
        if (typeof parsed.taxPercent === 'number') setTaxPercent(parsed.taxPercent);
        if (typeof parsed.notes === 'string') setNotes(parsed.notes);

        toast({
          title: "Draft Restored",
          description: "Your previous unsaved progress has been recovered."
        });
      }
    } catch (e) {
      console.error("Error loading labor quotation draft:", e);
    } finally {
      setIsAutoSaveLoaded(true);
    }
  }, []);

  // Auto-save: Write draft to LocalStorage on state changes
  useEffect(() => {
    if (!isAutoSaveLoaded) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          customer,
          items,
          customItems,
          sopClauses,
          discount,
          taxPercent,
          notes
        };
        localStorage.setItem('labor_quotation_draft', JSON.stringify(draft));
      } catch (e) {
        console.error("Error auto-saving labor quotation draft:", e);
      }
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timer);
  }, [customer, items, customItems, sopClauses, discount, taxPercent, notes, isAutoSaveLoaded]);

  // Handle Reset Form & Clear Local Storage Draft
  const handleResetForm = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      const timer = setTimeout(() => {
        setConfirmReset(false);
      }, 3000);
      return;
    }

    setConfirmReset(false);
    setCustomer({
      name: '',
      phone: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      validDays: '15'
    });
    setItems(DEFAULT_LABOR_ITEMS);
    setCustomItems([]);
    setSopClauses(DEFAULT_SOP_CLAUSES);
    setDiscount(0);
    setTaxPercent(0);
    setNotes('Rates are negotiable based on final layout design and prompt payments.');
    
    localStorage.removeItem('labor_quotation_draft');
    toast({
      title: "Draft Discarded",
      description: "The quotation form has been completely reset."
    });
  };

  const fetchSavedQuotations = async () => {
    try {
      const db = getDb();
      if (!db) return;
      const colRef = collection(db, 'labor_quotations');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedQuotations(list);
    } catch (e) {
      console.error("Error fetching labor quotes:", e);
    }
  };

  const getDb = () => {
    try {
      const { firestore } = initializeFirebase();
      return firestore;
    } catch (e) {
      return null;
    }
  };

  // Preset Handlers for One-Click Quotation
  const applyPreset = (presetType: 'marble-basic' | 'tile-premium' | 'whole-house') => {
    setItems(prev => prev.map(item => {
      let included = false;
      let qty = 0;
      
      if (presetType === 'marble-basic') {
        if (item.id === 'm-floor') { included = true; qty = 800; }
        if (item.id === 'm-skirting') { included = true; qty = 350; }
        if (item.id === 'p-polish') { included = true; qty = 800; }
      } else if (presetType === 'tile-premium') {
        if (item.id === 't-floor') { included = true; qty = 1200; }
        if (item.id === 't-wall') { included = true; qty = 600; }
        if (item.id === 't-epoxy') { included = true; qty = 1200; }
        if (item.id === 'f-tile') { included = true; qty = 450; }
      } else if (presetType === 'whole-house') {
        if (item.id === 'm-floor') { included = true; qty = 1500; }
        if (item.id === 'm-skirting') { included = true; qty = 600; }
        if (item.id === 's-stairs') { included = true; qty = 34; }
        if (item.id === 'f-marble') { included = true; qty = 650; }
        if (item.id === 'c-vanity') { included = true; qty = 3; }
        if (item.id === 'c-kitchen') { included = true; qty = 2; }
        if (item.id === 'p-polish') { included = true; qty = 1500; }
      }
      
      return { ...item, included, qty };
    }));

    toast({
      title: `${presetType === 'marble-basic' ? 'Basic Marble' : presetType === 'tile-premium' ? 'Premium Tile' : 'Whole House'} Preset Applied!`,
      description: "Quick quantities and rates loaded automatically.",
    });
  };

  // Calculated properties
  const allCurrentItems = useMemo(() => {
    return [...items.filter(i => i.included), ...customItems];
  }, [items, customItems]);

  const subTotal = useMemo(() => {
    return allCurrentItems.reduce((acc, item) => acc + (item.rate * (item.qty || 0)), 0);
  }, [allCurrentItems]);

  const taxAmount = useMemo(() => {
    return (subTotal * taxPercent) / 100;
  }, [subTotal, taxPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal + taxAmount - discount);
  }, [subTotal, taxAmount, discount]);

  // Handle standard item toggle
  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextIncluded = !item.included;
        return { 
          ...item, 
          included: nextIncluded,
          qty: nextIncluded && item.qty === 0 ? 100 : item.qty 
        };
      }
      return item;
    }));
  };

  const updateItemQty = (id: string, qty: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, qty) } : item));
  };

  const updateItemRate = (id: string, rate: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, rate: Math.max(0, rate) } : item));
  };

  // Add custom item row
  const addCustomItem = () => {
    if (!newCustomItem.nameEn.trim()) {
      toast({ variant: 'destructive', title: 'English Title Required' });
      return;
    }
    const newItem: LaborItem = {
      id: `custom-${Date.now()}`,
      nameEn: newCustomItem.nameEn,
      nameUr: newCustomItem.nameUr || newCustomItem.nameEn,
      rate: Number(newCustomItem.rate) || 0,
      qty: Number(newCustomItem.qty) || 0,
      unit: newCustomItem.unit,
      category: 'custom',
      included: true
    };
    setCustomItems(prev => [...prev, newItem]);
    setNewCustomItem({
      nameEn: '',
      nameUr: '',
      rate: 0,
      qty: 0,
      unit: 'sq.ft',
      category: 'custom'
    });
    toast({ title: "Custom Labor Service Added!" });
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  // SOP handlers
  const toggleSop = (id: string) => {
    setSopClauses(prev => prev.map(sop => sop.id === id ? { ...sop, included: !sop.included } : sop));
  };

  const updateSopText = (id: string, field: 'descEn' | 'descUr', value: string) => {
    setSopClauses(prev => prev.map(sop => sop.id === id ? { ...sop, [field]: value } : sop));
  };

  const addCustomSop = () => {
    if (!customSopTitleEn.trim() || !customSopDescEn.trim()) {
      toast({ variant: 'destructive', title: 'SOP English Title and Description required.' });
      return;
    }
    const newSop: SopClause = {
      id: `custom-sop-${Date.now()}`,
      titleEn: customSopTitleEn,
      titleUr: customSopTitleUr || customSopTitleEn,
      descEn: customSopDescEn,
      descUr: customSopDescUr || customSopDescEn,
      category: 'other',
      standard: 'local',
      included: true
    };
    setSopClauses(prev => [...prev, newSop]);
    setCustomSopTitleEn('');
    setCustomSopTitleUr('');
    setCustomSopDescEn('');
    setCustomSopDescUr('');
    toast({ title: 'Custom SOP Clause Added!' });
  };

  const removeSop = (id: string) => {
    setSopClauses(prev => prev.filter(sop => sop.id !== id));
  };

  // Filtered SOPs for standard viewing
  const filteredSops = useMemo(() => {
    if (sopFilter === 'all') return sopClauses;
    return sopClauses.filter(s => s.standard === sopFilter);
  }, [sopClauses, sopFilter]);

  // Save Quotation to Firebase
  const handleSaveQuotation = async () => {
    if (!customer.name.trim()) {
      toast({ variant: 'destructive', title: 'Customer Name Required', description: 'Please enter a customer name before saving.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const db = getDb();
      if (!db) {
        // LocalStorage fallback if firestore offline
        const localData = localStorage.getItem('local_labor_quotes') ? JSON.parse(localStorage.getItem('local_labor_quotes')!) : [];
        const newQuote = {
          id: `local-${Date.now()}`,
          customer,
          items: allCurrentItems,
          sopClauses: sopClauses.filter(s => s.included),
          discount,
          taxPercent,
          notes,
          subTotal,
          grandTotal,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('local_labor_quotes', JSON.stringify([newQuote, ...localData]));
        localStorage.removeItem('labor_quotation_draft');
        toast({ title: "Saved Offline (Local)", description: "Saved to browser storage successfully." });
        setIsSaving(false);
        return;
      }

      await addDoc(collection(db, 'labor_quotations'), {
        customer,
        items: allCurrentItems,
        sopClauses: sopClauses.filter(s => s.included),
        discount,
        taxPercent,
        notes,
        subTotal,
        grandTotal,
        createdAt: serverTimestamp()
      });

      toast({ title: "Quotation Saved Successfully!", description: "Stored securely in cloud database." });
      localStorage.removeItem('labor_quotation_draft');
      fetchSavedQuotations();
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: "Database Error", description: e.message || "Failed to connect to Firebase." });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved quotation
  const handleDeleteSaved = async (id: string) => {
    try {
      const db = getDb();
      if (db) {
        await deleteDoc(doc(db, 'labor_quotations', id));
        toast({ title: "Deleted", description: "Saved quote deleted successfully." });
        fetchSavedQuotations();
      } else {
        const localData = localStorage.getItem('local_labor_quotes') ? JSON.parse(localStorage.getItem('local_labor_quotes')!) : [];
        const filtered = localData.filter((q: any) => q.id !== id);
        localStorage.setItem('local_labor_quotes', JSON.stringify(filtered));
        toast({ title: "Deleted", description: "Saved quote deleted successfully." });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Error deleting quotation" });
    }
  };

  // Load an existing quotation
  const loadSavedQuote = (quote: any) => {
    setCustomer(quote.customer);
    setDiscount(quote.discount || 0);
    setTaxPercent(quote.taxPercent || 0);
    setNotes(quote.notes || '');
    
    // Reset standard items to unselected
    setItems(DEFAULT_LABOR_ITEMS.map(item => {
      const found = quote.items.find((qi: any) => qi.id === item.id);
      if (found) {
        return { ...item, included: true, qty: found.qty, rate: found.rate };
      }
      return { ...item, included: false, qty: 0 };
    }));

    // Put remaining as custom items
    const customList = quote.items.filter((qi: any) => !DEFAULT_LABOR_ITEMS.some(di => di.id === qi.id));
    setCustomItems(customList);

    // Load custom or toggled sops
    setSopClauses(DEFAULT_SOP_CLAUSES.map(sop => {
      const found = quote.sopClauses.find((qs: any) => qs.id === sop.id);
      return { ...sop, included: !!found, descEn: found?.descEn || sop.descEn, descUr: found?.descUr || sop.descUr };
    }));

    setIsHistoryOpen(false);
    toast({ title: "Quotation Loaded!", description: `Customer: ${quote.customer.name}` });
  };

  // Handle Printing
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // Handle Exporting PDF with Letterhead
  const handleExportPdf = async () => {
    if (!documentRef.current) return;
    setIsExportingPdf(true);

    toast({
      title: "Generating PDF Document...",
      description: "Formatting quotation layout with company letterhead."
    });

    try {
      const element = documentRef.current;

      // Pre-load all internal image assets
      const images = element.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve(true);
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          });
        })
      );

      // Render DOM element to canvas
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for sharp vector text and graphics
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth || 800,
        windowHeight: element.scrollHeight || 1100,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Create PDF in A4 format
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Handle multi-page spilling smoothly
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const clientName = (customer.name || 'Valued_Customer').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = customer.date || new Date().toISOString().split('T')[0];
      const filename = `Labor_Quotation_${clientName}_${dateStr}.pdf`;

      pdf.save(filename);

      toast({
        title: "PDF Export Complete!",
        description: `Successfully downloaded ${filename}`
      });
    } catch (e: any) {
      console.error("PDF Generation error:", e);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try Print -> Save as PDF."
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 bg-muted/20 print:p-0 print:bg-white min-h-screen relative text-foreground">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/manual-orders')} className="rounded-full h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Hammer className="h-6 w-6 text-primary" />
              Labor Quotation Builder
              {isAutoSaveLoaded && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Saved
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">Draft and finalize professional marble & tile installation labor rates with written SOPs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="gap-2 text-xs">
            <FileText className="h-4 w-4" />
            Load Saved ({savedQuotations.length})
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLanguage(l => l === 'en' ? 'ur' : 'en')} className="gap-2 text-xs font-semibold">
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'Urdu View (اردو)' : 'English View'}
          </Button>
          <Button 
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            size="sm"
            className="gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {isExportingPdf ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Preset quick selection */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary animate-pulse shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-primary">1-Click Labor Presets</h4>
            <p className="text-xs text-muted-foreground">Instantly configure standard labor quantities & rates to save time.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset('marble-basic')} className="text-xs font-semibold bg-background hover:bg-primary/10 hover:text-primary">
            <Building className="mr-1.5 h-3.5 w-3.5" /> Basic Marble Floor
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('tile-premium')} className="text-xs font-semibold bg-background hover:bg-primary/10 hover:text-primary">
            <Home className="mr-1.5 h-3.5 w-3.5" /> Premium Tile & Facade
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('whole-house')} className="text-xs font-semibold bg-background hover:bg-primary/10 hover:text-primary">
            <Compass className="mr-1.5 h-3.5 w-3.5" /> Full House Contractor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block">
        
        {/* Left Form controls - Col span 8 */}
        <div className="xl:col-span-8 space-y-6 print:hidden">
          
          {/* Customer details card */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Customer & Site Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Customer Name</Label>
                <Input 
                  id="cust-name" 
                  value={customer.name} 
                  onChange={e => setCustomer(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g. Muhammad Ali" 
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone Number</Label>
                <Input 
                  id="cust-phone" 
                  value={customer.phone} 
                  onChange={e => setCustomer(prev => ({...prev, phone: e.target.value}))}
                  placeholder="e.g. 03001234567" 
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-1">
                <Label htmlFor="cust-date">Quotation Date</Label>
                <Input 
                  id="cust-date" 
                  type="date"
                  value={customer.date} 
                  onChange={e => setCustomer(prev => ({...prev, date: e.target.value}))}
                  className="h-10 text-sm text-foreground"
                />
              </div>
              <div className="space-y-1.5 col-span-1 sm:col-span-2 md:col-span-2">
                <Label htmlFor="cust-address">Site Location / Address</Label>
                <Input 
                  id="cust-address" 
                  value={customer.address} 
                  onChange={e => setCustomer(prev => ({...prev, address: e.target.value}))}
                  placeholder="e.g. House 45, Street 12, Sector F-11, Islamabad" 
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-valid">Validity Period (Days)</Label>
                <Input 
                  id="cust-valid" 
                  type="number"
                  value={customer.validDays} 
                  onChange={e => setCustomer(prev => ({...prev, validDays: e.target.value}))}
                  placeholder="15" 
                  className="h-10 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Services selector & pricing card */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="bg-muted/30 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Select & Configure Labor Services
                </CardTitle>
                <CardDescription className="text-xs">Toggle services, set quantities (sq.ft / RFT), and modify default rates.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    id={`labor-item-${item.id}`}
                    className={`p-3.5 border rounded-xl flex items-start gap-3 transition-all ${item.included ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}
                  >
                    <input 
                      type="checkbox" 
                      id={`check-${item.id}`}
                      checked={item.included} 
                      onChange={() => toggleItem(item.id)}
                      className="mt-1 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`check-${item.id}`} className="font-bold text-sm block cursor-pointer select-none leading-snug">
                        {language === 'en' ? item.nameEn : item.nameUr}
                      </Label>
                      <span className="inline-block text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">
                        Category: {item.category}
                      </span>
                      
                      {item.included && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2 flex items-center gap-2"
                        >
                          <div className="flex-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Qty ({item.unit})</span>
                            <Input 
                              type="number"
                              value={item.qty}
                              onChange={e => updateItemQty(item.id, parseFloat(e.target.value) || 0)}
                              className="h-9 text-xs bg-background mt-0.5"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase">Rate (PKR)</span>
                            <Input 
                              type="number"
                              value={item.rate}
                              onChange={e => updateItemRate(item.id, parseFloat(e.target.value) || 0)}
                              className="h-9 text-xs bg-background mt-0.5"
                            />
                          </div>
                          <div className="text-right pl-2">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Total</span>
                            <span className="font-mono font-bold text-xs text-primary leading-9">
                              PKR {(item.qty * item.rate).toLocaleString()}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom labor row adder */}
              <div className="bg-muted/40 p-4 rounded-xl border border-dashed border-border mt-2 space-y-3">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4" />
                  Add Custom Service Line (نئی لیبر سروس شامل کریں)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Service Title (English)</Label>
                    <Input 
                      value={newCustomItem.nameEn} 
                      onChange={e => setNewCustomItem(p => ({...p, nameEn: e.target.value}))}
                      placeholder="e.g. Chamfer Polishing"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">سروس ٹائٹل (اردو)</Label>
                    <Input 
                      value={newCustomItem.nameUr} 
                      onChange={e => setNewCustomItem(p => ({...p, nameUr: e.target.value}))}
                      placeholder="مثلاً چیمفر پالش"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 col-span-1 sm:col-span-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">Rate</Label>
                      <Input 
                        type="number"
                        value={newCustomItem.rate || ''} 
                        onChange={e => setNewCustomItem(p => ({...p, rate: parseFloat(e.target.value) || 0}))}
                        placeholder="150"
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">Qty</Label>
                      <Input 
                        type="number"
                        value={newCustomItem.qty || ''} 
                        onChange={e => setNewCustomItem(p => ({...p, qty: parseFloat(e.target.value) || 0}))}
                        placeholder="200"
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">Unit</Label>
                      <select 
                        value={newCustomItem.unit}
                        onChange={e => setNewCustomItem(p => ({...p, unit: e.target.value as LaborItem['unit']}))}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="sq.ft">sq.ft</option>
                        <option value="RFT">RFT</option>
                        <option value="Steps">Steps</option>
                        <option value="Unit">Unit</option>
                        <option value="Job">Job</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="button" size="sm" onClick={addCustomItem} className="font-semibold text-xs h-8">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Service Line
                  </Button>
                </div>
              </div>

              {/* Dynamic rendering of custom items added */}
              {customItems.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <h6 className="text-xs font-bold text-primary uppercase">Custom Items Added:</h6>
                  <div className="space-y-2">
                    {customItems.map((c) => (
                      <div key={c.id} className="p-3 bg-card border border-primary/20 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-bold">{c.nameEn} <span className="text-muted-foreground font-normal">| {c.nameUr}</span></p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.qty} {c.unit} @ PKR {c.rate} / {c.unit}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-xs text-primary">PKR {(c.rate * c.qty).toLocaleString()}</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCustomItem(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Written SOP clauses builder - VERY IMPORTANT */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="bg-muted/30 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Written SOPs & Responsibilities (سلوک و قوانین)
                </CardTitle>
                <CardDescription className="text-xs">Specify clear terms on accommodation, water, electricity, scaffolding, shifting, etc.</CardDescription>
              </div>
              <div className="flex gap-1 bg-background p-1 border rounded-lg shrink-0">
                <Button variant={sopFilter === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2.5 text-[10px] font-bold" onClick={() => setSopFilter('all')}>All</Button>
                <Button variant={sopFilter === 'local' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2.5 text-[10px] font-bold" onClick={() => setSopFilter('local')}>Local</Button>
                <Button variant={sopFilter === 'international' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2.5 text-[10px] font-bold" onClick={() => setSopFilter('international')}>Int'l SOPs</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {filteredSops.map((sop) => (
                  <div 
                    key={sop.id} 
                    className={`p-3 border rounded-xl transition-all ${sop.included ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/20 opacity-70'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox" 
                        id={`sop-check-${sop.id}`}
                        checked={sop.included} 
                        onChange={() => toggleSop(sop.id)}
                        className="mt-1 h-3.5 w-3.5 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label htmlFor={`sop-check-${sop.id}`} className="font-bold text-xs cursor-pointer select-none">
                            {language === 'en' ? sop.titleEn : sop.titleUr}
                          </Label>
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[9px] uppercase font-bold tracking-wide font-mono px-1 bg-muted border text-muted-foreground rounded">
                              {sop.category}
                            </span>
                            <span className={`text-[9px] uppercase font-bold tracking-wide font-mono px-1 rounded ${sop.standard === 'international' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                              {sop.standard}
                            </span>
                          </div>
                        </div>
                        
                        {sop.included && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Description (English)</span>
                              <Textarea 
                                value={sop.descEn} 
                                onChange={e => updateSopText(sop.id, 'descEn', e.target.value)}
                                className="text-xs min-h-[50px] bg-background"
                              />
                            </div>
                            <div className="space-y-0.5 text-right">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">تفصیل (اردو)</span>
                              <Textarea 
                                value={sop.descUr} 
                                onChange={e => updateSopText(sop.id, 'descUr', e.target.value)}
                                className="text-xs min-h-[50px] bg-background text-right direction-rtl"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom SOP writer */}
              <div className="bg-muted/40 p-4 rounded-xl border border-dashed border-border mt-2 space-y-3">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus className="h-4 w-4" />
                  Add Custom SOP Clause (خصوصی شرط شامل کریں)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Title (English)</Label>
                    <Input 
                      value={customSopTitleEn} 
                      onChange={e => setCustomSopTitleEn(e.target.value)}
                      placeholder="e.g. Working Hours Constraints"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <Label className="text-[10px] uppercase block">ٹائٹل (اردو)</Label>
                    <Input 
                      value={customSopTitleUr} 
                      onChange={e => setCustomSopTitleUr(e.target.value)}
                      placeholder="مثلاً کام کے اوقات کار"
                      className="h-9 text-xs bg-background text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Description (English)</Label>
                    <Textarea 
                      value={customSopDescEn} 
                      onChange={e => setCustomSopDescEn(e.target.value)}
                      placeholder="e.g. Work is restricted between 9:00 AM to 6:00 PM as per society laws."
                      className="text-xs min-h-[60px] bg-background"
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <Label className="text-[10px] uppercase block">تفصیل (اردو)</Label>
                    <Textarea 
                      value={customSopDescUr} 
                      onChange={e => setCustomSopDescUr(e.target.value)}
                      placeholder="مثلاً سوسائٹی قوانین کے تحت کام صبح 9 بجے سے شام 6 بجے تک کیا جا سکے گا۔"
                      className="text-xs min-h-[60px] bg-background text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="button" size="sm" onClick={addCustomSop} className="font-semibold text-xs h-8">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add SOP Clause
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Live Preview & Billing Panel - Col span 4 */}
        <div className="xl:col-span-4 space-y-6 print:block print:w-full print:col-span-12">
          
          {/* Quick billing summary card */}
          <Card className="shadow-md border-primary/30 bg-card sticky top-6 print:hidden">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Quotation Summary</span>
                <span className="text-xs text-muted-foreground font-mono font-normal">Active Services: {allCurrentItems.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              {/* Calculations ledger */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Labor Services Subtotal</span>
                  <span className="font-mono font-bold">PKR {subTotal.toLocaleString()}</span>
                </div>
                
                {/* Extra inputs for discount/tax */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="disc-pkr" className="text-[10px] uppercase font-bold text-muted-foreground">Discount (PKR)</Label>
                    <Input 
                      id="disc-pkr"
                      type="number" 
                      value={discount || ''} 
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-background"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tax-pkr" className="text-[10px] uppercase font-bold text-muted-foreground">Tax (%)</Label>
                    <Input 
                      id="tax-pkr"
                      type="number" 
                      value={taxPercent || ''} 
                      onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-background"
                      placeholder="0"
                    />
                  </div>
                </div>

                {taxPercent > 0 && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">WHT/Sales Tax ({taxPercent}%)</span>
                    <span className="font-mono text-amber-600 font-semibold">+ PKR {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Special Discount</span>
                    <span className="font-mono text-emerald-600 font-semibold">- PKR {discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Total display */}
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                <span className="text-sm font-bold text-foreground">Estimated Total:</span>
                <span className="text-xl font-bold font-mono text-primary">
                  PKR {grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Short notes block */}
              <div className="space-y-1 pt-2">
                <Label htmlFor="billing-notes" className="text-[10px] uppercase font-bold text-muted-foreground">Proposal Terms / Final Remarks</Label>
                <Textarea 
                  id="billing-notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <Button 
                  onClick={handleSaveQuotation} 
                  disabled={isSaving}
                  variant="outline"
                  className="w-full h-11 text-xs font-semibold gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save DB
                </Button>
                <Button 
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="w-full h-11 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  Export PDF
                </Button>
                <Button 
                  onClick={handlePrint} 
                  variant="outline"
                  className="w-full h-11 text-xs font-bold gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>

              {/* Reset/Clear Button with safe confirmation UX */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetForm}
                  className={`w-full h-9 text-xs font-medium transition-all gap-1.5 ${confirmReset ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${confirmReset ? "animate-spin" : ""}`} style={confirmReset ? { animationDuration: '3s' } : undefined} />
                  {confirmReset ? "Click again to Confirm Discard" : "Discard Draft & Reset Form"}
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* BEAUTIFUL DOCUMENT TO PRINT/PREVIEW - Formatted with Company Letterhead & Print Layout */}
          <div className="space-y-3">
            {/* Live Document Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-sm print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Quotation Document Preview</span>
                {letterheadUrl && includeLetterhead ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                    <ImageIcon className="h-3 w-3" />
                    Letterhead Applied
                  </span>
                ) : letterheadUrl ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                    Letterhead Off
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground border px-2 py-0.5 rounded-full font-medium">
                    Standard Header
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {letterheadUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIncludeLetterhead(!includeLetterhead)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {includeLetterhead ? "Hide Letterhead" : "Include Letterhead"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  size="sm"
                  className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  {isExportingPdf ? "Exporting PDF..." : "Export PDF"}
                </Button>
                <Button
                  type="button"
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>

            {/* Printable & Exportable Document Element */}
            <div 
              ref={documentRef}
              className="bg-white text-black p-8 rounded-xl border shadow-lg print:shadow-none print:border-0 print:p-0 print:block overflow-hidden relative font-sans"
            >
              {/* Header: Company Letterhead OR Standard Stone Expert Header */}
              {letterheadUrl && includeLetterhead ? (
                <div className="w-full mb-6">
                  <div className="w-full overflow-hidden border-b-2 border-primary/30 pb-3">
                    <img 
                      src={letterheadUrl} 
                      alt="Company Letterhead" 
                      className="w-full object-contain max-h-52 mx-auto" 
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-3 pb-1 border-b border-gray-200">
                    <span className="inline-block bg-primary text-white text-[11px] font-bold px-3 py-1 rounded uppercase tracking-wider">
                      LABOR QUOTATION & ESTIMATE
                    </span>
                    <div className="text-right text-[10px] text-gray-600 font-mono">
                      <p><strong>Date:</strong> {customer.date || new Date().toISOString().split('T')[0]}</p>
                      <p><strong>Validity:</strong> {customer.validDays} Days</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-b-4 border-primary pb-4 mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-slate-900 flex items-center justify-center p-1.5 shrink-0 shadow-md">
                      <Icons.logo src={logoUrl} alt="Stone Expert Logo" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <h2 className="font-headline text-xl font-extrabold tracking-wider leading-none text-primary uppercase">STONE EXPERT</h2>
                      <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mt-1">Imported & Local Marble, Granite & Tiles</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Certified fixing, grinding & diamond polishing experts.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-primary text-white text-[11px] font-bold px-3 py-1 rounded uppercase tracking-wider">
                      LABOR QUOTATION
                    </span>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">Date: {customer.date || new Date().toISOString().split('T')[0]}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Validity: {customer.validDays} Days</p>
                  </div>
                </div>
              )}

            {/* Customer info division */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100 text-xs">
              <h3 className="font-bold text-gray-700 uppercase tracking-wide mb-2 text-[10px]">Client / Site Details:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-800">
                <p><strong>Name:</strong> {customer.name || 'Valued Customer'}</p>
                <p><strong>Contact:</strong> {customer.phone || 'N/A'}</p>
                <p className="sm:col-span-2"><strong>Site Address:</strong> {customer.address || 'Not Specified'}</p>
              </div>
            </div>

            {/* Labor Ledger Table */}
            <div className="mb-6">
              <h3 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-3 border-b pb-1">
                {language === 'en' ? 'Estimated Labor Scope & Rates' : 'مجوزہ لیبر ریٹس اور اسکوپ'}
              </h3>
              
              {allCurrentItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 italic">
                  No labor services selected. Choose from left pane to add.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b bg-gray-100/80 font-bold uppercase text-[9px] text-gray-600">
                      <th className="py-2.5 px-2">#</th>
                      <th className="py-2.5 px-2">Service Description / سروس کی تفصیل</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-2 text-right">Rate</th>
                      <th className="py-2.5 px-2 text-right">Est. Qty</th>
                      <th className="py-2.5 px-2 text-right">Net Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCurrentItems.map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-2.5 px-2 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-semibold">
                          <div>{item.nameEn}</div>
                          <div className="text-[10px] text-muted-foreground font-normal text-right mt-0.5" dir="rtl">{item.nameUr}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-500">{item.unit}</td>
                        <td className="py-2.5 px-2 text-right font-mono">PKR {item.rate}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{item.qty.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">
                          PKR {(item.rate * item.qty).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pricing calculations details */}
            <div className="flex justify-end mb-6">
              <div className="w-64 text-xs space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Scope Subtotal:</span>
                  <span className="font-mono font-semibold">PKR {subTotal.toLocaleString()}</span>
                </div>
                {taxPercent > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax / WHT ({taxPercent}%):</span>
                    <span className="font-mono">+ PKR {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount / Adjustment:</span>
                    <span className="font-mono">- PKR {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-sm text-primary">
                  <span>Grand Total (Est):</span>
                  <span className="font-mono">PKR {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Standard operating procedures division */}
            <div className="mb-6 page-break-before">
              <h3 className="font-bold text-primary uppercase tracking-wider text-[11px] mb-3 border-b pb-1">
                Standard Operating Procedures (SOPs) & Rules
              </h3>
              <p className="text-[9px] text-gray-500 mb-3 leading-relaxed">
                These national, international and local standards govern the execution of this contract. All items are binding upon confirmation.
              </p>
              
              <div className="space-y-3.5">
                {sopClauses.filter(s => s.included).map((sop, sIdx) => (
                  <div key={sop.id} className="text-[10px] leading-relaxed text-gray-800 border-l-2 border-primary/50 pl-3.5 space-y-1">
                    <p className="font-bold text-gray-900">
                      {sIdx + 1}. {sop.titleEn} <span className="text-[9px] text-muted-foreground font-normal">({sop.titleUr})</span>
                    </p>
                    <p className="text-gray-600 text-justify">{sop.descEn}</p>
                    <p className="text-gray-500 text-right font-normal" dir="rtl">{sop.descUr}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Final remarks from builder */}
            {notes && (
              <div className="bg-gray-50 p-4 rounded border text-[10px] text-gray-600 mb-8">
                <strong>Important Remark:</strong> {notes}
              </div>
            )}

            {/* Signature Area */}
            <div className="pt-8 border-t border-gray-200 mt-12 grid grid-cols-2 gap-8 text-center text-[10px] text-gray-500">
              <div className="space-y-10">
                <p>Prepared & Submitted By:</p>
                <div className="border-b border-gray-400 mx-auto w-40 h-8"></div>
                <p className="font-bold text-gray-800">Stone Expert Team</p>
              </div>
              <div className="space-y-10">
                <p>Accepted & Approved By (Client):</p>
                <div className="border-b border-gray-400 mx-auto w-40 h-8"></div>
                <p className="font-bold text-gray-800">{customer.name || '_____________________'}</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>

      {/* History Dialog Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 text-foreground">
          <CardHeader className="p-6 border-b shrink-0 bg-muted/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Saved Labor Quotations
            </CardTitle>
            <CardDescription className="text-xs">Select and reload a previously created labor quotation from database storage.</CardDescription>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {savedQuotations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm">No saved labor quotations found in the database.</p>
                <p className="text-xs text-muted-foreground mt-1">Create one and click "Save to DB" to store them here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedQuotations.map((quote: any) => (
                  <div 
                    key={quote.id} 
                    className="p-3.5 border rounded-xl bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-4 border-border/80"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{quote.customer.name}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {quote.customer.phone}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {quote.customer.address || 'No Address'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        Saved: {quote.createdAt?.seconds ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString() : new Date(quote.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right pr-2">
                        <span className="text-[10px] text-muted-foreground block font-bold">EST. TOTAL</span>
                        <span className="font-mono font-bold text-sm text-primary">PKR {quote.grandTotal?.toLocaleString() || quote.subTotal?.toLocaleString()}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => loadSavedQuote(quote)} className="h-8 text-xs">
                        Load
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteSaved(quote.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
