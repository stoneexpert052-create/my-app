'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Globe, Search, ChevronDown, ShoppingCart, Mic, Camera, PlusCircle, Send, FileSearch, Package, Phone, Menu, Sun, Moon, LogIn, LogOut, User as UserIcon, LayoutGrid, Calculator, Ruler, ChefHat, Wind, DraftingCompass, Bath, Volume2, VolumeX, HelpCircle, Sparkles, Wrench, Users, Settings, Layers, QrCode, Building2, FileText, Flame, Scissors } from 'lucide-react';
import { DownloadShareDialog } from './download-share-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input } from './ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/context/theme-context';
import { useCalculation } from '@/context/calculation-context';
import { requirementConfig } from '@/lib/requirements-config';
import { logSearchTerm, saveOrder, getHomepageConfig, getPartnerCompanies, deduplicateCategories, type PartnerCompany } from '@/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import config from '@/lib/config.json';
import { marbles, fixingMaterials } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import Image from 'next/image';


const appServices = [
  {
    id: 'simple',
    nameEn: 'Simple Floor',
    nameUr: 'سادہ فرش',
    descriptionEn: 'helps you quickly estimate marble piece counts and basic material costs for rectangular rooms.',
    descriptionUr: 'مستطیل کمروں کے لیے ماربل کے ٹکڑوں اور بنیادی لاگت کا فوری اندازہ لگانے میں مدد فراہم کرتا ہے۔',
    icon: Calculator,
    href: '/order/general-supplies-order?calc=simple'
  },
  {
    id: 'floor',
    nameEn: 'Flooring & Area Designer',
    nameUr: 'فلورنگ اور رقبہ ڈیزائنر',
    descriptionEn: 'calculates room square footage, wastage percentage, rate per square foot, and full material totals.',
    descriptionUr: 'کمرے کے کل فٹ، فی فٹ کے ریٹ، اور ضائع ہونے والے ماربل سمیت مکمل لاگت کا حساب لگاتا ہے۔',
    icon: Ruler,
    href: '/order/general-supplies-order?calc=floor'
  },
  {
    id: 'kitchen',
    nameEn: 'Kitchen Countertops',
    nameUr: 'کچن کاؤنٹر ٹاپ',
    descriptionEn: 'estimates costs for kitchen tops, profiling edges (double, triple lamination), sink cutouts, and joints.',
    descriptionUr: 'کچن کے اوپر ماربل یا گرینائٹ، سائیڈ ڈیزائننگ، سنک کی جگہ، اور گراءوٹ کا درست حساب لگاتا ہے۔',
    icon: ChefHat,
    href: '/order/general-supplies-order?calc=kitchen'
  },
  {
    id: 'vanity',
    nameEn: 'Bathroom Vanity Designer',
    nameUr: 'باتھ روم وینٹی ڈیزائنر',
    descriptionEn: 'calculates vanity top dimensions, border polish, sink cutout, and specific cutting fees.',
    descriptionUr: 'باتھ روم کے کاؤنٹرز، سائیڈ پالش، سنک کی کٹائی اور دیگر کٹنگ فیس کا درست تخمینہ لگاتا ہے۔',
    icon: Bath,
    href: '/order/general-supplies-order?calc=vanity'
  },
  {
    id: 'window-sill',
    nameEn: 'Window Sills',
    nameUr: 'کھڑکی کی سل',
    descriptionEn: 'measures protective borders beneath your room windows, calculating material and profiling costs.',
    descriptionUr: 'کھڑکیوں کے نیچے لگنے والے ماربل، سائیڈ ڈیزائن اور کل لاگت کا درست حساب کرتا ہے۔',
    icon: Wind,
    href: '/order/general-supplies-order?calc=window-sill'
  },
  {
    id: 'stairs',
    nameEn: 'Stairs Designer',
    nameUr: 'سیڑھیوں کا کیلکولیٹر',
    descriptionEn: 'calculates staircase step treads, risers, skirting, and polishing costs for a perfect fit.',
    descriptionUr: 'سیڑھی کے قدموں، اونچائی، سائیڈ پٹی اور مکمل رگڑائی کی لاگت کا حساب لگاتا ہے۔',
    icon: DraftingCompass,
    href: '/order/general-supplies-order?calc=stairs'
  },
  {
    id: 'cutting-optimizer',
    nameEn: 'Cutting Optimizer & Bookmatch',
    nameUr: 'سلیب کٹنگ اور بک میچ آپٹیمائزر',
    descriptionEn: 'optimizes 2D marble slab cutting layouts, bookmatch veins, and floor fixing maps.',
    descriptionUr: 'ماربل سلیب کی کٹائی، بک میچ رگوں اور فرش کی فٹنگ کا مکمل 2D نقشہ بناتا ہے۔',
    icon: Scissors,
    href: '/order/general-supplies-order?calc=cutting-optimizer'
  },
  {
    id: 'tools',
    nameEn: 'Tools & Chemicals',
    nameUr: 'ٹولز اور کیمیکلز',
    descriptionEn: 'allows adding premium stone adhesives, joints, polishers, and cleaning chemicals directly to your quotation.',
    descriptionUr: 'ماربل جوڑنے والے گراءوٹ، بہترین پالش، اور صفائی کے کیمیکلز کو آرڈر میں شامل کرنے کی سہولت دیتا ہے۔',
    icon: Wrench,
    href: '/order/general-supplies-order'
  },
  {
    id: 'providers',
    nameEn: 'Service Providers Directory',
    nameUr: 'کاریگروں اور ٹرانسپورٹ کی معلومات',
    descriptionEn: 'connects you directly with certified fixing experts, marble polishers, and local delivery drivers.',
    descriptionUr: 'ماربل لگانے والے بہترین کاریگروں، پالش کرنے والوں اور لوڈر گاڑیوں کی معلومات فراہم کرتا ہے۔',
    icon: LayoutGrid,
    href: '/dashboard/service-providers'
  }
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [material, setMaterial] = useState(searchParams.get('material') || 'All');
  const { language, setLanguage, t, hydrated: languageHydrated } = useLanguage();
  const { theme, toggleTheme, hydrated: themeHydrated } = useTheme();
  const { requirements, customerInfo, clearRequirements } = useCalculation();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  // Download & Share states
  const [isDownloadShareOpen, setIsDownloadShareOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [whatsappNumber, setWhatsappNumber] = useState(config.businessWhatsAppNumber);
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('local_category_order');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return deduplicateCategories(parsed);
        }
      } catch (e) {}
    }
    return deduplicateCategories(config.categoryOrder || []);
  });

  useEffect(() => {
    async function loadConfig() {
      const configData = await getHomepageConfig();
      if (configData) {
        if (configData.logoUrl) {
          setLogoUrl(configData.logoUrl);
        } else {
          setLogoUrl(config.logoUrl);
        }
        if (configData.businessWhatsAppNumber) {
          setWhatsappNumber(configData.businessWhatsAppNumber);
        }
        if (configData.categoryOrder && Array.isArray(configData.categoryOrder)) {
          setCategories(deduplicateCategories(configData.categoryOrder));
        }
      }
    }
    loadConfig();

    const handleCategoryUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(deduplicateCategories(e.detail));
      }
    };
    window.addEventListener('category_order_updated', handleCategoryUpdate);

    // Fetch active working partner company logos
    getPartnerCompanies().then(companies => {
      setPartnerBrands(companies.filter(c => c.isWorkingWith && c.showInHeader));
    }).catch(err => {
      console.warn("Failed loading partner companies for header:", err);
    });

    return () => {
      window.removeEventListener('category_order_updated', handleCategoryUpdate);
    };
  }, []);

  // Partner Brands state for main header heading display
  const [partnerBrands, setPartnerBrands] = useState<PartnerCompany[]>([]);

  // Service intro speech states
  const [selectedIntroService, setSelectedIntroService] = useState<typeof appServices[0] | null>(null);
  const [narrationLanguage, setNarrationLanguage] = useState<'en' | 'ur' | null>(null);
  const [isSpeechMuted, setIsSpeechMuted] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakDescription = useCallback((service: typeof appServices[0], lang: 'en' | 'ur', muted: boolean) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    if (muted) return;

    // Compose the narration text
    let text = '';
    if (lang === 'en') {
      text = `We have: Simple Floor calculator, Flooring and Area Designer, Kitchen Countertops, Bathroom Vanity layout, Window Sills, Stairs Designer, Tools and Chemicals store, and professional Service Providers. You have selected ${service.nameEn}, which ${service.descriptionEn}`;
    } else {
      text = `ہمارے پاس سادہ فرش کیلکولیٹر، فلورنگ اور رقبہ ڈیزائنر، کچن کاؤنٹر ٹاپس، باتھ روم وینٹی، کھڑکی کی سل، سیڑھیوں کا کیلکولیٹر، ٹولز اور کیمیکلز، اور سروس فراہم کرنے والے کاریگر موجود ہیں۔ آپ نے منتخب کیا ہے ${service.nameUr}، جو ${service.descriptionUr}`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ur' ? 'ur-PK' : 'en-US';
    
    // Try to find native voices if any match the requested language
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(lang));
    if (voice) {
      utterance.voice = voice;
    }

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Control speech narration based on state changes
  useEffect(() => {
    if (selectedIntroService && narrationLanguage) {
      speakDescription(selectedIntroService, narrationLanguage, isSpeechMuted);
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedIntroService, narrationLanguage, isSpeechMuted, speakDescription]);

  const handleSelectIntroLanguage = (lang: 'en' | 'ur') => {
    setNarrationLanguage(lang);
  };

  const toggleMuteSpeech = () => {
    setIsSpeechMuted(prev => !prev);
  };
  
  // Smart Header logic
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    const currentScrollY = window.scrollY;
    
    // Show header if scrolling up or at the very top
    if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
      setIsVisible(true);
    } 
    // Hide header if scrolling down and past a certain threshold
    else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      setIsVisible(false);
    }
    
    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const grandTotal = useMemo(() => {
    return requirements.reduce((acc, req) => acc + (req.total || 0), 0);
  }, [requirements]);


  const handlePlaceOrder = async () => {
    if (requirements.length === 0 || !customerInfo.name) {
      toast({
        variant: 'destructive',
        title: 'Cannot Place Order',
        description: 'Please add at least one requirement and customer details.',
      });
      return;
    }

    const firstRequirement = requirements[0];
    const orderData: Omit<Order, 'id' | 'date'> = {
      customerName: customerInfo.name || 'N/A',
      marbleName: firstRequirement.marble?.name || firstRequirement.fixingMaterial?.name || 'N/A',
      quantity: grandTotal,
      totalPrice: grandTotal,
      status: 'Pending',
      calculationDetails: {
        marble: firstRequirement.marble!,
        variant: firstRequirement.variant!,
        customerInfo: customerInfo,
        requirements: requirements,
      },
      applicationType: requirements.map(r => r.type).join(', '),
    };

    const result = await saveOrder(orderData);
    if (result.success && result.order) {
      const order = result.order;
      toast({
        title: 'Order Placed Successfully!',
        description: `Your Order #${order.id} has been received.`,
      });
      
      const businessPhone = whatsappNumber;
      if (businessPhone) {
        const itemsSummary = requirements.map(r => `* ${r.name} (${r.marble?.name || r.fixingMaterial?.name}): PKR ${r.total.toLocaleString()}`).join('\n');
        const orderMessage = `*السلام علیکم!*\n\n*سٹون ایکسپرٹ ویب سائٹ پر ایک نیا آرڈر بُک کیا گیا ہے!*\n\n*آرڈر آئی ڈی:* ${order.id}\n*کسٹمر کا نام:* ${customerInfo.name}\n*فون نمبر:* ${customerInfo.phone || 'N/A'}\n*ٹوٹل رقم:* PKR ${order.totalPrice.toLocaleString()}\n\n*تفصیلات:*\n${itemsSummary}\n\nبراہ کرم اس آرڈر کی تصدیق فرمائیں۔ شکریہ!\n*سٹون ایکسپرٹ، جی ٹی روڈ راولپنڈی*`;
        const whatsappUrl = `https://wa.me/${businessPhone}?text=${encodeURIComponent(orderMessage)}`;
        
        if (typeof window !== 'undefined') {
          window.open(whatsappUrl, '_blank');
        }
      }

      clearRequirements();
    } else {
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };


  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(paramsToUpdate)) {
        if (value) {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      }
      return params.toString();
    },
    [searchParams]
  );
  
  const updateUrl = (mat: string, query: string) => {
    const targetPath = '/';
    const newQueryString = createQueryString({ material: mat === 'All' ? null : mat, q: query || null });
    router.push(`${targetPath}?${newQueryString}`);
  };


  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    const mat = searchParams.get('material') || 'All';
    setSearchValue(query);
    setMaterial(mat);
  }, [searchParams]);

  const executeSearch = (term: string, source: 'text' | 'voice' = 'text') => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    updateUrl(material, cleanTerm);

    const isFoundInMarbles = marbles.some(m => 
      m.name.toLowerCase().includes(cleanTerm.toLowerCase()) || 
      (m.category && m.category.toLowerCase().includes(cleanTerm.toLowerCase()))
    );
    const isFoundInFixing = (fixingMaterials || []).some((m: any) => 
      m.name.toLowerCase().includes(cleanTerm.toLowerCase()) || 
      (m.category && m.category.toLowerCase().includes(cleanTerm.toLowerCase()))
    );

    const isFound = isFoundInMarbles || isFoundInFixing;

    logSearchTerm(cleanTerm, isFound, source);

    if (source === 'voice') {
      toast({
        title: language === 'ur' ? "آواز کی تلاش" : "Voice Search",
        description: `${language === 'ur' ? 'تلاش جاری ہے' : 'Searching for'}: "${cleanTerm}"`
      });
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSearch(searchValue, 'text');
  };

  const handleVoiceSearch = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: language === 'ur' ? "وائس سرچ کی سہولت دستیاب نہیں" : "Voice Search Not Supported",
        description: language === 'ur' 
          ? "آپ کا براؤزر وائس سرچ کو سپورٹ نہیں کرتا۔ براہ کرم لکھ کر تلاش کریں۔" 
          : "Your browser does not support Speech Recognition. Please type your search term."
      });
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: language === 'ur' ? "آواز سنی جا رہی ہے..." : "Listening...",
          description: language === 'ur' 
            ? "برائے مہربانی ماربل یا پروڈکٹ کا نام بولیں۔" 
            : "Speak a product name (e.g., 'Karara Marble' or 'Chemical')",
        });
      };

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setSearchValue(currentTranscript);
          finalTranscript = currentTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            variant: "destructive",
            title: language === 'ur' ? "وائس ایرر" : "Voice Error",
            description: language === 'ur' ? "آواز ٹھیک سے سنائی نہیں دی۔ براہ کرم دوبارہ کوشش کریں۔" : "Could not catch your voice. Please try again or type."
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (finalTranscript && finalTranscript.trim()) {
          executeSearch(finalTranscript.trim(), 'voice');
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Error starting speech recognition:", e);
      setIsListening(false);
      toast({
        variant: "destructive",
        title: "Microphone Access Error",
        description: "Unable to start microphone. Please verify browser permissions."
      });
    }
  };

  const handleMaterialChange = (value: string) => {
    setMaterial(value);
    updateUrl(value, searchValue);
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Error", description: "Auth system not ready." });
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      toast({ title: "Connecting to Google..." });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Popup login failed, trying redirect...", error);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectError: any) {
        console.error("Login Error:", redirectError);
        let msg = redirectError.message;
        if (redirectError.code === 'auth/unauthorized-domain') {
          msg = "This domain is not authorized for login. Please add it in Firebase Console.";
        }
        toast({ variant: "destructive", title: "Login Failed", description: msg });
      }
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({ title: "Logged Out", description: "You have been successfully signed out." });
  };

  
  const hasCalculations = grandTotal > 0;

  if (!languageHydrated || !themeHydrated) {
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 sm:h-20 items-center space-x-2 sm:justify-between sm:space-x-0">
        </div>
      </header>
    );
  }

  return (
    <header 
      className={cn(
        "fixed top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                    <SheetTitle className="sr-only">Stone Expert Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 py-8">
                  <SheetClose asChild>
                    <Link href="/" className="flex items-center space-x-2.5 mb-4 px-4">
                      <Icons.logo src={logoUrl} alt="Stone Expert Logo" className="h-9 w-9 object-contain rounded-lg p-0.5 bg-slate-900 border border-amber-500/30 shrink-0" />
                      <span className="font-headline text-2xl font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
                    </Link>
                  </SheetClose>
                  <nav className="flex flex-col gap-2 px-2 mt-4">
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/"
                      >
                        <LayoutGrid className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Home page</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/products"
                      >
                        <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Product</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/track-order"
                      >
                        <FileSearch className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Track order</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/#our-team"
                      >
                        <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Our expert team</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <button 
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('open_sale_popup'));
                          }
                        }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors w-full text-left"
                      >
                        <Flame className="h-5 w-5 fill-red-500 text-red-500 shrink-0 animate-pulse" />
                        <span>{language === 'ur' ? 'خصوصی سیل (Sale Deals)' : 'Sale Deals (خصوصی سیل)'}</span>
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#dfb96c] hover:bg-accent transition-colors bg-amber-500/10 border border-amber-500/20" 
                        href="/build-your-home"
                      >
                        <Sparkles className="h-5 w-5 text-[#dfb96c] shrink-0" />
                        <span>Build Your Home</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/renovation"
                      >
                        <Wrench className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Renovation</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/#representatives-section"
                      >
                        <Users className="h-5 w-5 text-amber-500 shrink-0" />
                        <span>Regional Reps (علاقائی نمائندے)</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent transition-colors" 
                        href="/contact"
                      >
                        <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span>Contact</span>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link 
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-accent transition-colors bg-amber-500/10 border border-amber-500/20" 
                        href="/brochure"
                      >
                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Company Brochure (بروشر و پی ڈی ایف)</span>
                      </Link>
                    </SheetClose>
                    <div className="pt-2 border-t mt-2">
                      <SheetClose asChild>
                        <Link 
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold text-primary hover:bg-accent transition-colors" 
                          href="/dashboard"
                        >
                          <LayoutGrid className="h-4 w-4" />
                          <span>Admin Panel (ایڈمن پینل)</span>
                        </Link>
                      </SheetClose>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <Link href="/" className="flex items-center space-x-2.5 group">
            <Icons.logo src={logoUrl} alt="Stone Expert Logo" className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-lg p-0.5 bg-slate-900 border border-amber-500/30 shrink-0 transition-transform group-hover:scale-105" />
            <span className="font-headline text-lg sm:text-xl font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>
              Stone Expert
            </span>
          </Link>

          {/* Active Partner Marble Companies Logos Display */}
          {partnerBrands.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 pl-3 ml-1 border-l border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-amber-500/90 tracking-wider flex items-center gap-1 shrink-0">
                <Building2 className="w-3 h-3" /> Partner:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] xl:max-w-[420px] py-0.5 no-scrollbar">
                {partnerBrands.map((brand) => (
                  <a
                    key={brand.id}
                    href={brand.websiteUrl || '#'}
                    target={brand.websiteUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    title={`Working with ${brand.nameEn}${brand.descriptionEn ? ` - ${brand.descriptionEn}` : ''}`}
                    className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 px-2 py-0.5 rounded-full transition-all text-[11px] text-amber-100 shrink-0 shadow-sm hover:border-amber-400 group"
                  >
                    <div className="relative w-4 h-4 rounded-full overflow-hidden bg-white/10 shrink-0">
                      {brand.logoUrl ? (
                        <Image src={brand.logoUrl} alt={brand.nameEn} fill className="object-cover" />
                      ) : (
                        <Building2 className="w-3 h-3 text-amber-400 m-0.5" />
                      )}
                    </div>
                    <span className="font-semibold truncate max-w-[100px]">{brand.nameEn}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 flex justify-center px-2 sm:px-4">
             <form onSubmit={handleSearch} className="w-full max-w-lg">
                <div className="relative">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="absolute left-0 top-0 h-full rounded-r-none rounded-l-full z-10 px-2 sm:px-3 text-xs sm:text-sm">
                        <span className="truncate max-w-[50px] sm:max-w-[80px]">{material === 'All' ? t('all_materials') : material}</span>
                        <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-56 max-h-[70vh] overflow-y-auto">
                        <DropdownMenuLabel>{t('filter_by_material')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleMaterialChange('All')}>{t('all_materials')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {categories.map((cat) => (
                          <DropdownMenuItem key={cat} onSelect={() => handleMaterialChange(cat)}>
                            {cat}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                  </DropdownMenu>
                
                <Input
                    type="search"
                    placeholder={t('search_placeholder')}
                    className="w-full rounded-full bg-secondary py-1 pl-20 sm:pl-32 pr-12 sm:pr-20 h-9 text-xs sm:text-sm"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                />
                 <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-0.5">
                    <button 
                      type="button" 
                      onClick={handleVoiceSearch}
                      className={cn(
                        "p-1.5 rounded-full transition-all flex items-center justify-center relative",
                        isListening 
                          ? "text-red-500 bg-red-500/10 ring-2 ring-red-500/50 scale-110" 
                          : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={isListening ? "Listening... Click to stop" : "Voice Search (Click to speak product name)"}
                    >
                      <Mic className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isListening && "animate-pulse text-red-500")} />
                      {isListening && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      )}
                    </button>
                    <button type="submit" className="text-muted-foreground hover:text-foreground p-1.5 transition-colors" title="Search">
                      <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>
                    </button>
                </div>
                </div>
            </form>
        </div>


        <div className="flex items-center justify-end space-x-1 sm:space-x-2">
          <nav className="flex items-center gap-1 sm:gap-2">
             <Button
               asChild
               variant="ghost"
               size="sm"
               className="hidden xl:flex items-center gap-1.5 text-xs font-semibold hover:text-[#dfb96c] hover:bg-amber-500/10 h-9 px-2.5 rounded-full"
             >
               <Link href="/#representatives-section">
                 <Users className="h-4 w-4 text-amber-500" />
                 <span>{language === 'ur' ? 'نمائندے' : 'Representatives'}</span>
               </Link>
             </Button>

             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <ShoppingCart className="h-5 w-5" />
                    {hasCalculations && (
                       <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                    )}
                    <span className="sr-only">View Calculation Summary</span>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel className="flex items-center gap-2">
                    Project Cost Summary
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasCalculations ? (
                  <>
                  <div className="p-2 text-sm space-y-2">
                     {requirements.map(req => {
                        const Icon = requirementConfig[req.type]?.icon;
                        return (
                             <div key={req.id} className="flex justify-between items-center">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    {Icon && <Icon className="h-4 w-4"/>}
                                    {req.name}
                                </span>
                                <span className="font-semibold">PKR {req.total.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                        )
                     })}
                    <DropdownMenuSeparator />
                     <div className="flex justify-between font-bold text-base text-primary pt-1">
                        <span>Grand Total:</span>
                        <span>PKR {grandTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No calculations made yet. Start by selecting a material and using the calculators.
                  </div>
                )}
                 <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                      <Link href="/" className="w-full justify-center">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Item
                      </Link>
                  </DropdownMenuItem>
                  {hasCalculations && (
                    <DropdownMenuItem onSelect={handlePlaceOrder} className="font-bold bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground justify-center">
                        <Send className="mr-2 h-4 w-4" />
                        Place Order Now
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Download & Share Trigger Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-primary/80 h-9 w-9"
              onClick={() => setIsDownloadShareOpen(true)}
              title={language === 'ur' ? 'ایپ ڈاؤن لوڈ اور شیئر کریں' : 'Download & Share App'}
            >
              <QrCode className="h-5 w-5" />
              <span className="sr-only">Download & Share App</span>
            </Button>

            {/* Simple Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-primary/80 h-9 w-9"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Globe className="h-5 w-5" />
                  <span className="sr-only">Toggle language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setLanguage('en')}>
                  {t('lang_en')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('ur')}>
                  {t('lang_ur')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile / Login */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                  {user ? (
                    <div className="relative h-full w-full">
                      {user.photoURL ? (
                        <Image src={user.photoURL} alt="User" fill className="object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  ) : (
                    <UserIcon className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard" className="flex items-center w-full">
                        <LayoutGrid className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/brochure" className="flex items-center w-full">
                        <FileText className="mr-2 h-4 w-4 text-amber-600" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Brochure & PDF (کمپنی بروشر)</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/service-providers" className="flex items-center w-full">
                        <Users className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">Service Providers</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/settings#category-order" className="flex items-center w-full">
                        <Layers className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">Category Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/track-order">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={handleGoogleLogin}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In with Google
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin Shortcuts</DropdownMenuLabel>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard" className="flex items-center w-full">
                        <LayoutGrid className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium">Admin Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/brochure" className="flex items-center w-full">
                        <FileText className="mr-2 h-4 w-4 text-amber-600" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Brochure & PDF (کمپنی بروشر)</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4 text-primary" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/service-providers" className="flex items-center w-full">
                        <Users className="mr-2 h-4 w-4 text-primary" />
                        <span>Service Providers</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/dashboard/settings#category-order" className="flex items-center w-full">
                        <Layers className="mr-2 h-4 w-4 text-primary" />
                        <span>Category Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="hidden md:block border-t border-border bg-background">
        <div className="container flex h-11 items-center justify-center gap-1">
          <Link 
            href="/" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Home page</span>
          </Link>
          <Link 
            href="/products" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Product</span>
          </Link>
          <Link 
            href="/track-order" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <FileSearch className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Track order</span>
          </Link>
          <Link 
            href="/#our-team" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Our expert team</span>
          </Link>
          <button 
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open_sale_popup'));
              }
            }}
            className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
          >
            <Flame className="h-4 w-4 fill-red-500 text-red-500" />
            <span>{language === 'ur' ? 'خصوصی سیل' : 'Sale Deals'}</span>
          </button>
          <Link 
            href="/build-your-home" 
            className="text-sm font-semibold text-[#dfb96c] bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-[#dfb96c] shrink-0" />
            <span>Build Your Home</span>
          </Link>
          <Link 
            href="/renovation" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Renovation</span>
          </Link>
          <Link 
            href="/contact" 
            className="text-sm font-semibold text-foreground/80 hover:text-[#dfb96c] hover:bg-accent/40 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
          >
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Contact</span>
          </Link>
        </div>
      </div>

      {/* Service Explorer with Audio Narration Dialog */}
      <Dialog open={!!selectedIntroService} onOpenChange={(open) => {
        if (!open) {
          setSelectedIntroService(null);
          setNarrationLanguage(null);
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        }
      }}>
        <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-lg text-foreground">
          <DialogHeader className="space-y-3 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#dfb96c]">
              <Sparkles className="h-5 w-5 text-[#dfb96c] shrink-0" />
              <span>{language === 'ur' ? 'سروس گائیڈ' : 'Our Services'}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium text-xs">
              {language === 'ur' ? 'ہماری ایپ کی خصوصیات کی تفصیلات جانیں' : 'Explore the features of Stone Expert'}
            </DialogDescription>
          </DialogHeader>

          {/* Conditional Layout: Prompt Language Selection First */}
          {selectedIntroService && !narrationLanguage ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-[#dfb96c]">
                <HelpCircle className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-foreground">Select Narration Language</h4>
                <p className="text-sm text-muted-foreground font-medium">آواز اور تحریر کی زبان منتخب کریں</p>
              </div>
              <div className="flex gap-4 w-full max-w-xs">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 transition-all shadow-sm"
                  onClick={() => handleSelectIntroLanguage('en')}
                >
                  English
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 transition-all shadow-sm"
                  onClick={() => handleSelectIntroLanguage('ur')}
                >
                  اردو (Urdu)
                </Button>
              </div>
            </div>
          ) : selectedIntroService && narrationLanguage ? (
            <div className="space-y-6 py-4">
              {/* Controls: Mute and Language toggle */}
              <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                    onClick={() => handleSelectIntroLanguage(narrationLanguage === 'en' ? 'ur' : 'en')}
                  >
                    {narrationLanguage === 'en' ? 'اردو میں سنیں' : 'Listen in English'}
                  </Button>
                </div>
                
                {/* Audio controls */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none",
                    isSpeechMuted 
                      ? "text-red-600 border-red-200 hover:bg-red-50" 
                      : "text-green-600 border-green-200 hover:bg-green-50"
                  )}
                  onClick={toggleMuteSpeech}
                >
                  {isSpeechMuted ? (
                    <>
                      <VolumeX className="h-4 w-4 shrink-0" />
                      <span>{narrationLanguage === 'ur' ? 'آواز کھولیں' : 'Unmute'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 shrink-0 animate-bounce" />
                      <span>{narrationLanguage === 'ur' ? 'آواز بند کریں' : 'Mute'}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Service title and description */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[#dfb96c]">
                    {(() => {
                      const IconComp = selectedIntroService.icon;
                      return <IconComp className="h-6 w-6 shrink-0" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {narrationLanguage === 'ur' ? selectedIntroService.nameUr : selectedIntroService.nameEn}
                    </h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {narrationLanguage === 'ur' ? 'منتخب کردہ خدمت' : 'Selected Service'}
                    </span>
                  </div>
                </div>

                {/* Speech Bubble / Dynamic visual display */}
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 relative overflow-hidden">
                  <div className="absolute top-1 right-2 flex gap-1">
                    {!isSpeechMuted && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dfb96c] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#dfb96c]"></span>
                      </span>
                    )}
                  </div>
                  
                  {/* We Have Section */}
                  <div className="mb-3 pb-3 border-b border-amber-500/10">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {narrationLanguage === 'ur' ? 'ہمارے پاس موجود سہولیات:' : 'What We Have:'}
                    </p>
                    <p className="text-sm font-semibold text-[#dfb96c] mt-1 leading-relaxed">
                      {narrationLanguage === 'ur' 
                        ? 'ماربل اور گرینائٹ کا انتخاب، فرش کا حساب کتاب، کچن کاؤنٹر ٹاپس، باتھ روم وینٹی ڈیزائنر، کھڑکی کی سل، سیڑھیاں، ٹولز اور کیمیکلز، اور سروس فراہم کرنے والے کاریگر۔'
                        : 'Marble floor estimates, flooring and area design, kitchen counters, bath vanities, window sills, stairs, tools & chemicals, and local professional service providers.'
                      }
                    </p>
                  </div>

                  {/* Feature description */}
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {narrationLanguage === 'ur' ? 'تفصیل:' : 'About This Service:'}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1 leading-relaxed font-sans">
                      {narrationLanguage === 'ur' 
                        ? `ہمارا ${selectedIntroService.nameUr} آپ کے لیے ${selectedIntroService.descriptionUr}`
                        : `Our ${selectedIntroService.nameEn} ${selectedIntroService.descriptionEn}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="pt-4 border-t border-border flex flex-row items-center justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost" className="h-10 text-xs font-bold text-muted-foreground hover:text-foreground">
                    {narrationLanguage === 'ur' ? 'بند کریں' : 'Close'}
                  </Button>
                </DialogClose>
                <Button 
                  className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 flex items-center gap-1.5 text-xs transition-all shadow-sm shrink-0"
                  onClick={() => {
                    // Navigate to the service link
                    router.push(selectedIntroService.href);
                    setSelectedIntroService(null);
                    setNarrationLanguage(null);
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                >
                  <span>{narrationLanguage === 'ur' ? 'سروس پر جائیں' : 'Go to Service'}</span>
                  <PlusCircle className="h-4 w-4 shrink-0" />
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Download & Share Dialog Modal */}
      <DownloadShareDialog 
        isOpen={isDownloadShareOpen} 
        onOpenChange={setIsDownloadShareOpen} 
      />
    </header>
  );
}
