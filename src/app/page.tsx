'use client';

import { Header } from '@/components/header';
import { motion } from 'framer-motion';
import { MarbleCard } from '@/components/marble-card';
import { useFullscreenImage } from '@/context/fullscreen-image-context';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import type { Marble, FixingMaterial, ServiceProvider } from '@/lib/types';
import { useSearchParams, useRouter } from 'next/navigation';
import { fixingMaterialCategories } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-context';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { Lightbulb, X, Search, Gem, Truck, Globe, Box, Mountain, FileText, Phone, Mail, MapPin, Paintbrush, SprayCan, Layers, Users, Wrench, Bath, ChevronRight, LayoutGrid, Eye, Calculator, Star, Facebook, Instagram, TrendingUp, ArrowDownRight, ArrowUpRight, WandSparkles, Sparkles, CheckCircle2, Info, Calendar, Ruler, ChefHat, Wind, DraftingCompass, ImageIcon, Maximize, Power, ArrowRight, Building2, Handshake, ExternalLink, Flame, Percent, Tag, Scissors } from 'lucide-react';
import { FixingMaterialCard } from '@/components/fixing-material-card';
import { cn, formatSaleBadgeText } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import serviceProvidersData from '@/lib/service-providers-data.json';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import config from '@/lib/config.json';
import initialHomepageContent from '@/lib/homepage-content.json';
import { RepresentativesSection } from '@/components/representatives-section';
import { getHomepageContent, getMarbles, getFixingMaterials, getHomepageConfig, getServiceProviders, getPartnerCompanies, getDailyRates, subscribeToAppUpdates, deduplicateCategories, type PartnerCompany } from '@/lib/admin-actions';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { defaultDailyRates } from '@/lib/data';
import type { DailyRates } from '@/lib/types';
import { Fuel, Coins } from 'lucide-react';



type GroupedMarbles = {
  [key: string]: Marble[];
};

type GroupedFixingMaterials = {
  [key: string]: FixingMaterial[];
};


const categoryIcons: { [key: string]: React.ElementType } = {
  'Sale & Discount': Flame,
  'Sale and Discount': Flame,
  'سیل اور ڈسکاؤنٹ': Flame,
  'Marble Tiles': Box,
  'Local Marble': Truck,
  'Imported Marble': Globe,
  'Local Granite': Truck,
  'Imported Granite': Globe,
  'MDM Material': Sparkles,
  'Artificial Stone': Gem,
  'Limestone': Mountain,
  'Corian': Box,
  'Facade Stone': Layers,
  'Inlay': Layers,
  'Antique': Gem,
  'Vanity': Bath,
  'Search Results': Search,
};

const serviceIcons: { [key: string]: React.ElementType } = {
  'Marble & Tile Fixing': Gem,
  'Marble Polishing': Paintbrush,
};

const detailedRates = {
  cement: [
    {
      name: "Bestway Cement",
      rate: "1,510",
      unit: "Per Bag (50kg)",
      change: "-5",
      status: "down",
      desc: "Rawalpindi's most trusted premium cement. Excellent binding strength, low shrinkage, and superb workability in both structural and finishing projects.",
      available: "Fully Available in Rawalpindi & Islamabad",
      image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "DG Khan Cement",
      rate: "1,520",
      unit: "Per Bag (50kg)",
      change: "+10",
      status: "up",
      desc: "Premium grade portland cement with supreme early compressive strength, ideal for slabs, heavy columns, beam layouts, and foundation projects.",
      available: "Highly Available via local stone-expert dealers",
      image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Askari Cement",
      rate: "1,485",
      unit: "Per Bag (50kg)",
      change: "0",
      status: "stable",
      desc: "Highly reliable brand preferred for brick masonry, plaster jobs, and general domestic building requirements with top-class moisture resistance.",
      available: "Fully Available in Twin Cities",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Four Star Cement",
      rate: "1,440",
      unit: "Per Bag (50kg)",
      change: "-10",
      status: "down",
      desc: "Extremely popular cost-effective cement blend, offering standard setting speed and strong adhesion for block works and boundary installations.",
      available: "Available at main retail spots",
      image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80",
    },
  ],
  aggregates: [
    {
      name: "Awwal Red Clay Bricks (Class-A)",
      rate: "14,500",
      unit: "Per 1,000 Bricks",
      change: "0",
      status: "stable",
      desc: "Prime baked red clay bricks. Uniform size, metallic sound when struck, with high load-bearing capacity. Sourced from local bhatta kilns.",
      available: "Fully Available (Direct dispatch to any site in twin-cities)",
      image: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Lawrencepur River Sand",
      rate: "10,500",
      unit: "Per Trolley (100 CFT)",
      change: "+150",
      status: "up",
      desc: "Premium quality coarse sand with low silt content. Crucial for robust concrete casting, structural pillars, and high-fidelity masonry works.",
      available: "Available / Sourced from Lawrencepur bed",
      image: "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Margalla River Sand",
      rate: "8,500",
      unit: "Per Trolley (100 CFT)",
      change: "+100",
      status: "up",
      desc: "Local building sand with fine grain size, suitable for basic building, brickwork layouts, backfilling, and floor sub-bases.",
      available: "Widely Available in Islamabad & surrounding sectors",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    },
  ],
  metals: [
    {
      name: "Deformed Steel Grade-60 (Mughal/Amreli)",
      rate: "265,000",
      unit: "Per Ton",
      change: "+800",
      status: "up",
      desc: "High-grade structural steel bars. Extremely tensile, seismic secure, standard 12-meter lengths matching national standards.",
      available: "Fully Available (Same-day dispatch from depots)",
      image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Margalla Crush gravel (1/2\" - 3/4\")",
      rate: "12,500",
      unit: "Per Brass (100 CFT)",
      change: "-50",
      status: "down",
      desc: "Premium crushed blue-grey limestone with exceptional density. Verifies supreme durability for solid concrete works.",
      available: "Fully Available (Quarry direct delivery)",
      image: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Sargodha Crush aggregate",
      rate: "9,800",
      unit: "Per Brass (100 CFT)",
      change: "0",
      status: "stable",
      desc: "Very durable crushed aggregate, ideal for mass foundational concrete filling, road base projects, and cost-effective boundary lining.",
      available: "Highly Available across standard suppliers",
      image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80",
    }
  ]
};

export default function Home() {
  const { t, language } = useLanguage();
  const { openImage } = useFullscreenImage();
  const router = useRouter();
  const db = useFirestore();
  const [dailyRates, setDailyRates] = useState<DailyRates>(defaultDailyRates);

  useEffect(() => {
    let active = true;
    const fetchRates = async () => {
      try {
        const rates = await getDailyRates();
        if (active && rates) {
          setDailyRates(rates);
        }
      } catch (error) {
        // Handled silently via fallback in getDailyRates
      }
    };
    fetchRates();
    return () => {
      active = false;
    };
  }, []);

  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isCalculatorLoading, setIsCalculatorLoading] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isExited, setIsExited] = useState(false);

  // All-Sale Products Popup State
  const [isAllSalePopupOpen, setIsAllSalePopupOpen] = useState(false);
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [saleFilterCategory, setSaleFilterCategory] = useState<'all' | 'marbles' | 'supplies'>('all');

  useEffect(() => {
    const handleOpenSalePopup = () => setIsAllSalePopupOpen(true);
    window.addEventListener('open_sale_popup', handleOpenSalePopup);
    return () => window.removeEventListener('open_sale_popup', handleOpenSalePopup);
  }, []);

  useEffect(() => {
    setIsCalculatorLoading(false);
    
    // Intercept back gesture on home page to show exit permission dialog
    if (typeof window !== 'undefined') {
      window.history.pushState(window.history.state, '', window.location.href);

      const handlePopState = () => {
        setIsExitDialogOpen(true);
        // Re-push state to keep intercepting back button
        window.history.pushState(window.history.state, '', window.location.href);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  const handleConfirmExit = () => {
    setIsExitDialogOpen(false);
    setIsExited(true);
    
    if (typeof window !== 'undefined') {
      // Try closing tab/window
      window.close();
      
      // Fallback: redirect to blank page or clear view
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 500);
    }
  };

  const [selectedMarble, setSelectedMarble] = useState<Marble | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string>('');

  const [isFixingMaterialPopupOpen, setIsFixingMaterialPopupOpen] = useState(false);
  const [selectedFixingMaterial, setSelectedFixingMaterial] = useState<FixingMaterial | null>(null);
  const [activeFixingGalleryImage, setActiveFixingGalleryImage] = useState('');
  
  const [isServiceProviderDialogOpen, setIsServiceProviderDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [marbles, setMarbles] = useState<Marble[]>([]);
  const [fixingMaterials, setFixingMaterials] = useState<FixingMaterial[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [partnerCompanies, setPartnerCompanies] = useState<PartnerCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [homepageContent, setHomepageContent] = useState(initialHomepageContent);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => deduplicateCategories(config.categoryOrder || []));
  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl);


  const [businessContact, setBusinessContact] = useState({
    phoneNumber: config.businessPhoneNumber,
    whatsappNumber: config.businessWhatsAppNumber,
    googleMapsUrl: config.googleMapsUrl
  });

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  useEffect(() => {
    // Safely sync cached category order after initial hydration
    try {
      const cached = localStorage.getItem('local_category_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategoryOrder(deduplicateCategories(parsed));
        }
      }
    } catch (e) {}

    async function loadData(showLoadingSpinner = true) {
      if (showLoadingSpinner) {
        setIsLoading(true);
      }
      try {
        const [marbs, fixMats, hpContent, hpConfig, dbProviders, partnerComps] = await Promise.all([
          getMarbles().catch(err => { console.error("getMarbles failed", err); return []; }),
          getFixingMaterials().catch(err => { console.error("getFixingMaterials failed", err); return []; }),
          getHomepageContent().catch(err => { console.error("getHomepageContent failed", err); return { success: false, content: null }; }),
          getHomepageConfig().catch(err => { console.error("getHomepageConfig failed", err); return null; }),
          getServiceProviders().catch(err => { console.error("getServiceProviders failed", err); return []; }),
          getPartnerCompanies().catch(err => { console.error("getPartnerCompanies failed", err); return []; })
        ]);
        setMarbles(marbs);
        setFixingMaterials(fixMats);
        if (partnerComps && partnerComps.length > 0) {
          setPartnerCompanies(partnerComps.filter(p => p.isWorkingWith));
        }
        if (hpContent && hpContent.success && hpContent.content) {
          setHomepageContent(hpContent.content);
        }
        if (hpConfig) {
          if (hpConfig.categoryOrder && Array.isArray(hpConfig.categoryOrder)) {
            setCategoryOrder(deduplicateCategories(hpConfig.categoryOrder));
          }
          if (hpConfig.logoUrl) {
            setLogoUrl(hpConfig.logoUrl);
          } else {
            setLogoUrl(config.logoUrl);
          }
          setBusinessContact({
            phoneNumber: hpConfig.businessPhoneNumber || config.businessPhoneNumber,
            whatsappNumber: hpConfig.businessWhatsAppNumber || config.businessWhatsAppNumber,
            googleMapsUrl: hpConfig.googleMapsUrl || config.googleMapsUrl
          });
        }
        if (dbProviders && dbProviders.length > 0) {
          setServiceProviders(dbProviders.filter(p => p.status === 'active') as ServiceProvider[]);
        } else {
          setServiceProviders(serviceProvidersData.filter(p => p.status === 'active') as ServiceProvider[]);
        }
      } catch (err) {
        console.error("Failed to load home page data:", err);
      } finally {
        if (showLoadingSpinner) {
          setIsLoading(false);
        }
      }
    }

    loadData(true);

    const unsubscribe = subscribeToAppUpdates((event) => {
      if (event.type === 'category_order_updated') {
        if (event.detail && Array.isArray(event.detail)) {
          setCategoryOrder(deduplicateCategories(event.detail));
        } else {
          loadData(false);
        }
      } else {
        // Instant seamless background reload
        loadData(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const materialQuery = searchParams.get('material');
  const searchQuery = searchParams.get('q');

  const isFixingMaterialQuery = useMemo(() => {
    return materialQuery && fixingMaterialCategories.includes(materialQuery as any);
  }, [materialQuery]);
  
  const isMarbleQuery = useMemo(() => {
    return materialQuery && !isFixingMaterialQuery && materialQuery !== 'All'
  }, [materialQuery, isFixingMaterialQuery]);
  
  const filteredAndGroupedMarbles = useMemo(() => {
    let results = marbles.filter(m => !m.isHidden);

    if (materialQuery && materialQuery !== 'All') {
        const queryLower = materialQuery.toLowerCase();
        if (materialQuery === 'Local Marble') {
            results = results.filter(m => (m.materialType === 'Marble' || m.materialType === 'Local Marble') && (m.origin === 'Local' || !m.origin));
        } else if (materialQuery === 'Imported Marble') {
            results = results.filter(m => (m.materialType === 'Marble' || m.materialType === 'Imported Marble') && m.origin === 'Imported');
        } else if (materialQuery === 'Local Granite') {
            results = results.filter(m => (m.materialType === 'Granite' || m.materialType === 'Local Granite') && (m.origin === 'Local' || !m.origin));
        } else if (materialQuery === 'Imported Granite') {
            results = results.filter(m => (m.materialType === 'Granite' || m.materialType === 'Imported Granite') && m.origin === 'Imported');
        } else if (materialQuery === 'Marble Tiles') {
            results = results.filter(m => m.materialType === '12x24 Tiles' || m.materialType === 'Marble Tiles');
        } else if (materialQuery === 'MDM Material') {
            results = results.filter(m => 
                m.category === 'MDM Material' || 
                m.materialType === 'MDM Material' ||
                (m.name && m.name.toLowerCase().includes('mdm'))
            );
        } else if (materialQuery === 'Sale & Discount' || queryLower.includes('sale') || queryLower.includes('discount') || queryLower.includes('سیل')) {
            results = results.filter(m => 
                m.onSale || 
                (typeof m.discount === 'number' && m.discount > 0) || 
                m.category === 'Sale & Discount'
            );
        } else {
            results = results.filter(m => 
                (m.category && m.category.toLowerCase() === queryLower) ||
                (m.materialType && m.materialType.toLowerCase() === queryLower) ||
                (`${m.origin || 'Local'} ${m.materialType}`.toLowerCase() === queryLower)
            );
        }
    }

    if (searchQuery) {
      results = results.filter(marble =>
        marble.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (searchQuery || (materialQuery && materialQuery !== 'All')) {
        const numberedResults = results.map((m, index) => ({...m, nameWithNum: `${index + 1}. ${m.name}`, name: m.name.replace(/^\d+\.\s/, '')}));
        return { 'Search Results': numberedResults };
    }

    return results.reduce((acc: GroupedMarbles, marble) => {
        let key: string | null = null;
        
        // 1. Direct match with marble.category in categoryOrder
        if (marble.category && categoryOrder.includes(marble.category)) {
            key = marble.category;
        } else if (marble.category) {
            const found = categoryOrder.find(c => c.toLowerCase() === marble.category!.toLowerCase());
            if (found) key = found;
        }

        // 2. Direct match with origin + materialType
        if (!key) {
            const originKey = `${marble.origin || 'Local'} ${marble.materialType}`;
            if (categoryOrder.includes(originKey)) {
                key = originKey;
            }
        }

        // 3. Match 12x24 Tiles -> Marble Tiles
        if (!key && marble.materialType === '12x24 Tiles' && categoryOrder.includes('Marble Tiles')) {
            key = 'Marble Tiles';
        }

        // 4. Match materialType in categoryOrder
        if (!key && categoryOrder.includes(marble.materialType)) {
            key = marble.materialType;
        }

        // 5. Case-insensitive search across categoryOrder
        if (!key) {
            const originKey = `${marble.origin || 'Local'} ${marble.materialType}`;
            const found = categoryOrder.find(c => 
                c.toLowerCase() === originKey.toLowerCase() || 
                c.toLowerCase() === marble.materialType?.toLowerCase()
            );
            if (found) key = found;
        }

        // Only group if it belongs to an allowed category from the admin panel
        if (key && categoryOrder.includes(key)) {
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(marble);
        }

        // Also add to Sale & Discount section if product is on sale
        if (categoryOrder.includes('Sale & Discount') && (marble.onSale || (typeof marble.discount === 'number' && marble.discount > 0) || marble.category === 'Sale & Discount')) {
            if (!acc['Sale & Discount']) {
                acc['Sale & Discount'] = [];
            }
            if (!acc['Sale & Discount'].some(m => m.id === marble.id)) {
                acc['Sale & Discount'].push(marble);
            }
        }
        return acc;
    }, {});

  }, [marbles, materialQuery, searchQuery, categoryOrder]);
  
  const filteredAndGroupedFixingMaterials = useMemo(() => {
    let items = fixingMaterials;

    if (materialQuery && materialQuery !== 'All') {
        const queryLower = materialQuery.toLowerCase();
        if (materialQuery === 'Sale & Discount' || queryLower.includes('sale') || queryLower.includes('discount') || queryLower.includes('سیل')) {
            items = items.filter(m => 
                (m as any).onSale || 
                (typeof (m as any).discount === 'number' && (m as any).discount > 0) || 
                (m.category as string) === 'Sale & Discount'
            );
        } else {
            items = items.filter(m => 
                (m.category && m.category.toLowerCase() === queryLower) ||
                (`${m.category}s`.toLowerCase() === queryLower)
            );
        }
    }
    
    if (searchQuery) {
      items = items.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (searchQuery || (materialQuery && materialQuery !== 'All')) {
        return { 'Search Results': items };
    }

    const grouped = items.reduce((acc: GroupedFixingMaterials, material) => {
        let key: string = material.category || 'Other';
        const match = categoryOrder.find(c => 
            c.toLowerCase() === key.toLowerCase() ||
            c.toLowerCase() === `${key.toLowerCase()}s` ||
            `${c.toLowerCase()}s` === key.toLowerCase()
        );
        const finalKey = match || key;
        if (!acc[finalKey]) {
            acc[finalKey] = [];
        }
        acc[finalKey].push(material);

        // Also add to Sale & Discount section if item is on sale
        if (categoryOrder.includes('Sale & Discount') && ((material as any).onSale || (typeof (material as any).discount === 'number' && (material as any).discount > 0) || (material.category as string) === 'Sale & Discount')) {
            if (!acc['Sale & Discount']) {
                acc['Sale & Discount'] = [];
            }
            if (!acc['Sale & Discount'].some(m => m.id === material.id)) {
                acc['Sale & Discount'].push(material);
            }
        }
        return acc;
    }, {});

    return grouped;

  }, [fixingMaterials, materialQuery, searchQuery, categoryOrder]);


  // Compute all items on sale across all categories (both Marbles and Fixing Materials)
  const allSaleProducts = useMemo(() => {
    const saleMarbles = marbles
      .filter(m => !m.isHidden && (m.onSale === true || (typeof m.discount === 'number' && m.discount > 0)))
      .map(m => {
        const prices = m.variants?.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0) || [];
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        const discountVal = typeof m.discount === 'number' ? m.discount : 0;
        const finalPrice = m.discountType === 'fixed'
          ? Math.max(1, basePrice - discountVal)
          : Math.round(basePrice * (1 - discountVal / 100));

        return {
          id: m.id,
          name: m.name,
          category: m.category || `${m.origin || 'Local'} ${m.materialType}`,
          materialType: m.materialType || 'Marble',
          origin: m.origin || 'Local',
          imageUrl: m.imageUrl || `https://placehold.co/800x450?text=${encodeURIComponent(m.name)}`,
          price: finalPrice,
          originalPrice: basePrice,
          onSale: true,
          discount: m.discount,
          discountType: m.discountType,
          saleBadgeText: m.saleBadgeText,
          unit: m.unit || 'Sq. Ft',
          isFixing: false,
          heroHighlightOnSale: m.heroHighlightOnSale !== false,
          marbleObj: m,
          fixingObj: undefined as FixingMaterial | undefined
        };
      });

    const saleFixing = fixingMaterials
      .filter(f => !f.isHidden && (f.onSale === true || (typeof f.discount === 'number' && f.discount > 0)))
      .map(f => {
        const basePrice = f.price || 0;
        const discountVal = typeof f.discount === 'number' ? f.discount : 0;
        const finalPrice = f.discountType === 'fixed'
          ? Math.max(1, basePrice - discountVal)
          : Math.round(basePrice * (1 - discountVal / 100));

        return {
          id: f.id,
          name: f.name,
          category: f.category || 'Fixing Material',
          materialType: 'Supply',
          origin: (f as any).origin || 'Local',
          imageUrl: f.imageUrl || `https://placehold.co/800x450?text=${encodeURIComponent(f.name)}`,
          price: finalPrice,
          originalPrice: basePrice,
          onSale: true,
          discount: f.discount,
          discountType: f.discountType,
          saleBadgeText: f.saleBadgeText,
          unit: f.unit || 'Item',
          isFixing: true,
          heroHighlightOnSale: f.heroHighlightOnSale !== false,
          marbleObj: undefined as Marble | undefined,
          fixingObj: f
        };
      });

    return [...saleMarbles, ...saleFixing];
  }, [marbles, fixingMaterials]);

  // Unified items for the Hero Carousel
  // Products on sale with heroHighlightOnSale enabled are showcased prominently first!
  const carouselItems = useMemo(() => {
    const onSaleHero = allSaleProducts.filter(p => p.heroHighlightOnSale);

    const featuredMarbles = marbles
      .filter(m => m.isFeatured && !m.isHidden && !onSaleHero.some(s => s.id === m.id))
      .map(m => {
        const prices = m.variants?.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0) || [];
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        return {
          id: m.id,
          name: m.name,
          category: m.category || `${m.origin || 'Local'} ${m.materialType}`,
          materialType: m.materialType || 'Marble',
          origin: m.origin || 'Local',
          imageUrl: m.imageUrl || `https://placehold.co/800x450?text=${encodeURIComponent(m.name)}`,
          price: basePrice,
          originalPrice: undefined as number | undefined,
          onSale: false,
          discount: undefined as number | undefined,
          discountType: undefined as 'percentage' | 'fixed' | undefined,
          saleBadgeText: undefined as string | undefined,
          unit: m.unit || 'Sq. Ft',
          isFixing: false,
          heroHighlightOnSale: false,
          marbleObj: m as Marble | undefined,
          fixingObj: undefined as FixingMaterial | undefined
        };
      });

    let combined = [...onSaleHero, ...featuredMarbles];
    if (combined.length === 0) {
      combined = marbles.filter(m => !m.isHidden).slice(0, 5).map(m => {
        const prices = m.variants?.map(v => v.price).filter((p): p is number => typeof p === 'number' && p > 0) || [];
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        return {
          id: m.id,
          name: m.name,
          category: m.category || `${m.origin || 'Local'} ${m.materialType}`,
          materialType: m.materialType || 'Marble',
          origin: m.origin || 'Local',
          imageUrl: m.imageUrl || `https://placehold.co/800x450?text=${encodeURIComponent(m.name)}`,
          price: basePrice,
          originalPrice: undefined as number | undefined,
          onSale: false,
          discount: undefined as number | undefined,
          discountType: undefined as 'percentage' | 'fixed' | undefined,
          saleBadgeText: undefined as string | undefined,
          unit: m.unit || 'Sq. Ft',
          isFixing: false,
          heroHighlightOnSale: false,
          marbleObj: m as Marble | undefined,
          fixingObj: undefined as FixingMaterial | undefined
        };
      });
    }

    return combined;
  }, [allSaleProducts, marbles]);

  const carouselMarbles = carouselItems;
  
  const handleImageClick = (marble: Marble) => {
    setSelectedMarble(marble);
    setActiveGalleryImage(marble.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(marble.name)}`);
    setIsImagePopupOpen(true);
  };

  const handleFixingMaterialClick = (material: FixingMaterial) => {
    setSelectedFixingMaterial(material);
    setActiveFixingGalleryImage(material.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(material.name)}`);
    setIsFixingMaterialPopupOpen(true);
  };
  
  const handleProviderCardClick = (provider: ServiceProvider) => {
      setSelectedProvider(provider);
      setIsServiceProviderDialogOpen(true);
  };
  
  const isSearchOrFilterActive = Boolean(searchQuery || (materialQuery && materialQuery !== 'All'));

  const showNoResultsMessage = isSearchOrFilterActive && 
    (filteredAndGroupedMarbles['Search Results'] || []).length === 0 && 
    (filteredAndGroupedFixingMaterials['Search Results'] || []).length === 0;

  const sortedCategories = useMemo(() => {
    if (isSearchOrFilterActive) {
      return ['Search Results'];
    }
    const cleanList = deduplicateCategories(categoryOrder);
    return cleanList.filter(category => {
      const marbleCount = (filteredAndGroupedMarbles[category] || []).length;
      const fixingCount = (filteredAndGroupedFixingMaterials[category] || []).length;
      return marbleCount > 0 || fixingCount > 0;
    });
  }, [filteredAndGroupedMarbles, filteredAndGroupedFixingMaterials, categoryOrder, isSearchOrFilterActive]);
  
  const OriginIcon = selectedMarble?.origin === 'Local' ? Truck : Globe;
  const buildWithUsContent = (homepageContent?.buildWithUs?.[language] || homepageContent?.buildWithUs?.en) || {
    heading: language === 'ur' ? "اپنا گھر سٹون ایکسپرٹ کے ساتھ بنائیں" : "Build Your Home with Stone Expert",
    subheading: language === 'ur' 
      ? "ہم صرف ماربل اور گرینائٹ فراہم نہیں کرتے، بلکہ آپ کے خوابوں کو حقیقت میں بدلتے ہیں۔" 
      : "We don't just supply marble and granite; we turn your dreams into reality."
  };

  const dbHeroContent = (homepageContent as any)?.hero?.[language];
  const heroContent = useMemo(() => {
    const isOldHeading = !dbHeroContent?.heading || 
      dbHeroContent.heading.includes("Rawalpindi") || 
      dbHeroContent.heading.includes("راولپنڈی") ||
      dbHeroContent.heading === "Discover Marble and Construction Material Rawalpindi Islamabad" ||
      dbHeroContent.heading === "Discover Marble & Construction Material Rawalpindi Islamabad";
      
    if (isOldHeading) {
      if (language === 'ur') {
        return {
          heading: "ڈسکور ماربل اینڈ کنسٹرکشن سلوشنز",
          subheading: "پاکستان کا پہلا مکمل کوٹیشن فراہم کرنے والا ادارہ، جو آپ کے لیے آسان جگہ پر واقع ہے، جہاں آپ خود کوٹیشن بنا سکتے ہیں اور دوسرے مواد کے ساتھ ان کا موازنہ کر سکتے ہیں۔"
        };
      }
      return {
        heading: "Discover Marble & Construction Solutions",
        subheading: "Pakistan's first fully quoting institution, located conveniently for you, where you can create quotes yourself and compare them with other materials."
      };
    }
    return {
      heading: dbHeroContent.heading,
      subheading: dbHeroContent.subheading || t('home_subheading')
    };
  }, [dbHeroContent, language, t]);

  const handleFloatingWhatsApp = () => {
      const message = "السلام علیکم! میں ماربل اور کنسٹرکشن میٹیریل کے بارے میں معلومات لینا چاہتا ہوں۔";
      window.open(`https://wa.me/${businessContact.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const calculators = [
    {
      id: 'simple',
      labelEn: 'Simple Floor',
      labelUr: 'سادہ فرش',
      icon: Calculator,
      descriptionEn: 'Quick square feet estimation for plain surfaces',
      descriptionUr: 'سادہ سطحوں کے لیے فوری اسکوائر فٹ کا تخمینہ',
    },
    {
      id: 'floor',
      labelEn: 'Flooring',
      labelUr: 'فلورنگ / فرش ڈیزائنر',
      icon: Ruler,
      descriptionEn: 'Detailed rooms flooring with skirting & borders',
      descriptionUr: 'کمروں کے فرش، اسکرٹنگ اور بارڈر کی تفصیلی منصوبہ بندی',
    },
    {
      id: 'kitchen',
      labelEn: 'Kitchens',
      labelUr: 'کچن کاؤنٹر ٹاپ',
      icon: ChefHat,
      descriptionEn: 'L-shape, U-shape or straight kitchen slab costs',
      descriptionUr: 'ایل شیپ، یو شیپ یا سیدھے کچن سلیب کے اخراججات',
    },
    {
      id: 'vanity',
      labelEn: 'Vanity',
      labelUr: 'وینٹی ڈیزائنر',
      icon: Bath,
      descriptionEn: 'Custom bathroom vanity tops and splashbacks',
      descriptionUr: 'غسل خانے کی وینٹی اور سپلیش بیکس کی قیمت',
    },
    {
      id: 'window-sill',
      labelEn: 'Window Sills',
      labelUr: 'کھڑکی کی چوکھٹ / سل',
      icon: Wind,
      descriptionEn: 'Window frame sills and border length calculations',
      descriptionUr: 'کھڑکی کے فریم اور سل کی لمبائی کا حساب',
    },
    {
      id: 'stairs',
      labelEn: 'Stairs',
      labelUr: 'سیڑھیاں',
      icon: DraftingCompass,
      descriptionEn: 'Tread, riser and molding details for staircases',
      descriptionUr: 'سیڑھیوں کے ٹریڈ، رائزر اور مولڈنگ کی تفصیلات',
    },
    {
      id: 'cutting-optimizer',
      labelEn: 'Cutting Optimizer',
      labelUr: 'کٹنگ آپٹیمائزر (سلیب کٹنگ)',
      icon: Scissors,
      descriptionEn: '2D slab cutting, bookmatch & floor fixing diagram',
      descriptionUr: 'سلیب کٹنگ، بک میچ اور فلور فکسنگ کا مکمل 2D نقشہ',
    }
  ];

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1 bg-transparent mt-16 md:mt-28">
          {/* Theme-Adaptive Partner Marble Companies & Logo Showcase Banner Strip */}
          <div className="w-full py-4 bg-[#fbf9f5] dark:bg-slate-950 text-foreground dark:text-white border-b border-amber-500/20 shadow-xs transition-colors">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left Compact Label */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Handshake className="w-3 h-3" />
                    {language === 'ur' ? 'ورک پارٹنر برانڈز' : 'Work Partner Brands'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {language === 'ur' ? 'منظور شدہ ماربل سپلائر' : 'Official Marble & Stone Suppliers'}
                  </span>
                </div>
              </div>

              {/* Large Partner Logos & Product Specialty Showcase */}
              <div className="flex-1 w-full flex items-center justify-center md:justify-end gap-3 sm:gap-4 overflow-x-auto py-1 no-scrollbar">
                {partnerCompanies.length === 0 ? (
                  // Default partner logos if none configured in Firestore yet
                  <div className="flex items-center gap-3">
                    {[
                      { 
                        nameEn: 'Pak Royal Marbles', 
                        nameUr: 'پاک رائل ماربلز', 
                        logoUrl: 'https://picsum.photos/seed/pakroyal/200/200',
                        products: 'Ziarat White & Badal Grey Slabs'
                      },
                      { 
                        nameEn: 'Topsun Stone Industries', 
                        nameUr: 'ٹاپ سن اسٹون', 
                        logoUrl: 'https://picsum.photos/seed/topsunstone/200/200',
                        products: 'Italian Granite & Composite Quartz'
                      },
                      { 
                        nameEn: 'National Granite & Marble', 
                        nameUr: 'نیشنل گرینائٹ', 
                        logoUrl: 'https://picsum.photos/seed/nationalgranite/200/200',
                        products: 'Commercial Black Granite & Edge Profiles'
                      }
                    ].map((partner, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-amber-500/25 hover:border-amber-500 p-2.5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] shrink-0">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-amber-500/20 bg-muted shrink-0 shadow-xs">
                          <Image src={partner.logoUrl} alt={partner.nameEn} fill className="object-cover" unoptimized />
                        </div>
                        <div className="text-left pr-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-amber-100">{partner.nameEn}</p>
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{partner.products}</p>
                          <p className="text-[10px] text-muted-foreground font-urdu">{partner.nameUr}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  partnerCompanies.map((partner) => (
                    <a
                      key={partner.id}
                      href={partner.websiteUrl || '#'}
                      target={partner.websiteUrl ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      title={`${partner.nameEn}${partner.descriptionEn ? ` - ${partner.descriptionEn}` : ''}`}
                      className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-amber-500/25 hover:border-amber-500 p-2.5 rounded-2xl shadow-xs transition-all hover:scale-[1.02] shrink-0 group"
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-amber-500/20 bg-muted shrink-0 shadow-xs">
                        {partner.logoUrl ? (
                          <Image src={partner.logoUrl} alt={partner.nameEn} fill className="object-cover" unoptimized />
                        ) : (
                          <Building2 className="w-6 h-6 text-amber-500 m-3" />
                        )}
                      </div>
                      <div className="text-left pr-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-amber-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                          {partner.nameEn}
                        </p>
                        {partner.descriptionEn && (
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 max-w-[180px] line-clamp-1">
                            {partner.descriptionEn}
                          </p>
                        )}
                        {partner.nameUr && (
                          <p className="text-[10px] text-muted-foreground font-urdu">{partner.nameUr}</p>
                        )}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Prominent Main Header Sale Ribbon */}
          {allSaleProducts.length > 0 && (
            <div
              id="main-header-sale-ribbon"
              onClick={() => setIsAllSalePopupOpen(true)}
              role="button"
              tabIndex={0}
              className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-md transition-all duration-300 cursor-pointer overflow-hidden group select-none border-y border-red-500/40 relative z-20"
            >
              <div className="container mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="p-1.5 rounded-full bg-white/20 group-hover:scale-110 transition-transform flex items-center justify-center shrink-0 shadow-xs">
                    <Flame className="h-5 w-5 fill-amber-300 text-amber-200 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <span className="text-xs sm:text-sm font-black tracking-wide uppercase bg-black/30 px-2 py-0.5 rounded text-amber-300 border border-white/10">
                        {language === 'ur' ? '🔥 خصوصی رعایتی سیل لائیو ہے!' : '🔥 Special Discount Sale Live!'}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white/95">
                        {language === 'ur'
                          ? 'ماربل، گرینائٹ اور فکسنگ ٹولز پر روپوں اور فیصد میں خصوصی رعایت — تمام سیل پروڈکٹس دیکھنے کے لیے کلک کریں'
                          : 'Exclusive price discounts in PKR & % across all categories — Click to view all sale deals'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-xs text-xs font-black text-amber-300 border border-amber-400/40 shadow-xs">
                    {allSaleProducts.length} {language === 'ur' ? 'سیل پروڈکٹس' : 'Products on Sale'}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-red-600 text-xs font-black shadow-md group-hover:bg-amber-100 transition-colors">
                    <span>{language === 'ur' ? 'تمام سیل پروڈکٹس دیکھیں' : 'View All Sale Items'}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="w-full border-b bg-background/50 relative">
            <div className="container grid lg:grid-cols-2 gap-6 items-center py-6 md:py-8">
               <div className="order-2 lg:order-1">
                  <Carousel 
                     className="w-full"
                     plugins={[autoplayPlugin.current]}
                     onMouseEnter={autoplayPlugin.current.stop}
                     onMouseLeave={autoplayPlugin.current.reset}
                   >
                     <CarouselContent>
                       {carouselMarbles.map((item) => (
                         <CarouselItem key={item.id}>
                           <div 
                             onClick={() => {
                               if (item.isFixing && item.fixingObj) {
                                 handleFixingMaterialClick(item.fixingObj);
                               } else if (item.marbleObj) {
                                 handleImageClick(item.marbleObj);
                               }
                             }}
                             className="relative aspect-video w-full overflow-hidden rounded-xl group cursor-pointer border border-border/60 shadow-md"
                           >
                             <Image
                               src={item.imageUrl || `https://placehold.co/800x450?text=${encodeURIComponent(item.name)}`}
                               alt={item.name}
                               fill
                               className="object-cover group-hover:scale-105 transition-transform duration-500"
                               priority
                             />

                             {/* Highlight Sale Ribbon & Badges */}
                             {Boolean((item as any).onSale || ((item as any).discount && (item as any).discount > 0)) && (
                               <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
                                 <Badge className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white border border-white/30 text-xs sm:text-sm font-black px-3 py-1 shadow-xl flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                                   <Flame className="h-4 w-4 fill-amber-300 text-amber-200" />
                                   <span>
                                     {formatSaleBadgeText({
                                       discount: item.discount,
                                       discountType: item.discountType,
                                       saleBadgeText: item.saleBadgeText,
                                       isUrdu: language === 'ur'
                                     })}
                                   </span>
                                 </Badge>
                                 <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black/80 backdrop-blur-xs text-amber-300 rounded-md border border-amber-400/40 shadow-xs">
                                   {language === 'ur' ? '🔥 خصوصی رعایت' : '🔥 SALE OFFER'}
                                 </span>
                               </div>
                             )}

                             {/* Bottom Information Card */}
                             <div className="absolute bottom-3 left-3 right-3 z-10">
                                 <div className="bg-black/75 backdrop-blur-md text-white p-3 sm:p-4 rounded-xl border border-white/20 flex items-center justify-between gap-3 shadow-2xl">
                                     <div className="space-y-0.5 min-w-0">
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <p className="font-headline text-base sm:text-xl font-bold truncate drop-shadow">{item.name}</p>
                                           {Boolean((item as any).onSale || ((item as any).discount && (item as any).discount > 0)) && (
                                             <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider shrink-0 shadow-xs">
                                               {language === 'ur' ? 'سیل' : 'SALE'}
                                             </span>
                                           )}
                                         </div>
                                         <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold truncate">
                                           {item.category} • {item.origin}
                                         </p>
                                     </div>

                                     <div className="flex flex-col items-end shrink-0">
                                       {Boolean(item.originalPrice && item.originalPrice > item.price) ? (
                                         <div className="flex flex-col items-end leading-tight">
                                           <span className="text-[11px] text-zinc-400 line-through font-semibold">
                                             PKR {item.originalPrice?.toLocaleString()}
                                           </span>
                                           <span className="text-base sm:text-xl font-black text-amber-300 drop-shadow">
                                             PKR {item.price.toLocaleString()}
                                             <span className="text-[10px] text-zinc-300 font-normal ml-1">/{item.unit}</span>
                                           </span>
                                         </div>
                                       ) : item.price > 0 ? (
                                         <span className="text-base sm:text-lg font-black text-white">
                                           PKR {item.price.toLocaleString()}
                                           <span className="text-[10px] text-zinc-300 font-normal ml-1">/{item.unit}</span>
                                         </span>
                                       ) : (
                                         <span className="text-xs font-semibold text-amber-400">
                                           {language === 'ur' ? 'تفصیل دیکھیں' : 'View Details'}
                                         </span>
                                       )}
                                     </div>
                                 </div>
                             </div>
                           </div>
                         </CarouselItem>
                       ))}
                     </CarouselContent>
                   </Carousel>
                </div>
                <div className="order-1 lg:order-2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
                   {/* Resized, smaller 'Welcome to Stone Expert' text positioned above 'Discover Marble & Construction Solution' heading */}
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dfb96c]/15 border border-[#dfb96c]/35 shadow-xs text-xs sm:text-sm font-bold tracking-wide text-[#b59410] dark:text-[#dfb96c]">
                     <Sparkles className="h-3.5 w-3.5 text-[#dfb96c] animate-pulse" />
                     <span>{language === 'ur' ? 'سٹون ایکسپرٹ میں خوش آمدید' : 'Welcome to Stone Expert'}</span>
                   </div>

                   <h1 className="font-headline text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl break-words">
                     {heroContent.heading || t('home_heading')}
                   </h1>
                   <p className="max-w-[600px] text-foreground/80 text-sm md:text-lg">
                     {heroContent.subheading || t('home_subheading')}
                   </p>
                </div>
            </div>
          </section>

          {/* Instant Estimators & Calculators Showcase */}
          <section className="w-full py-10 bg-accent/30 border-b">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center text-center space-y-3 mb-8">
                <h2 className="font-headline text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-primary" />
                  {language === 'ur' ? 'انسٹنٹ آٹو کوٹیشن کیلکولیٹرز' : 'Instant Auto-Quotation Calculators'}
                </h2>
                <p className="max-w-[600px] text-muted-foreground text-xs sm:text-sm">
                  {language === 'ur' 
                    ? 'ماربل اور گرینائٹ کی تنصیب کے لیے اپنی ضرورت کے مطابق درست اور فوری تخمینہ لگائیں۔' 
                    : 'Get precise, real-time material and cost estimates tailored to your project requirements.'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 max-w-7xl mx-auto">
                {calculators.map((calc) => {
                  const Icon = calc.icon;
                  return (
                    <Link 
                      key={calc.id} 
                      id={`home-calc-btn-${calc.id}`}
                      href={`/order/general-supplies-order?calc=${calc.id}`}
                      onClick={() => setIsCalculatorLoading(true)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl border bg-background hover:bg-accent hover:border-primary/50 shadow-sm hover:shadow-md transition-all group text-center cursor-pointer min-h-[110px]"
                    >
                      <div className="p-2.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 group-hover:scale-110 transition-all mb-2">
                        <Icon className="h-5 w-5 shrink-0" />
                      </div>
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {language === 'ur' ? calc.labelUr : calc.labelEn}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-2 mt-1 hidden sm:block leading-tight">
                        {language === 'ur' ? calc.descriptionUr : calc.descriptionEn}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>


          
          <section className="w-full py-12 md:py-24 lg:py-32" id="products-showcase">
            <div className="container px-4 md:px-6 space-y-10">

              {/* Category Navigation & Quick Filter Strip */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {language === 'ur' ? 'تمام پراڈکٹ کیٹیگریز' : 'Explore by Category'}
                      </h2>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5" suppressHydrationWarning>
                        {categoryOrder.length} {language === 'ur' ? 'کیٹیگریز' : 'Categories'}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {language === 'ur' 
                        ? 'اپنی مرضی کی کیٹیگری منتخب کریں اور لائیو ورائٹی دیکھیں' 
                        : 'Select a category to browse collections and materials'}
                    </p>
                  </div>

                  {materialQuery && materialQuery !== 'All' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push('/')}
                      className="text-xs text-muted-foreground hover:text-primary gap-1.5 self-start sm:self-auto h-8 px-3 rounded-lg border border-border/50"
                    >
                      <X className="h-3.5 w-3.5" />
                      {language === 'ur' ? 'فلٹر ختم کریں (تمام دیکھیں)' : 'Clear Filter (Show All)'}
                    </Button>
                  )}
                </div>

                {/* Category Pills Strip */}
                <ScrollArea className="w-full pb-2">
                  <div className="flex items-center gap-2.5 min-w-max py-1">
                    {/* All Categories Button */}
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all border shadow-xs cursor-pointer",
                        !materialQuery || materialQuery === 'All'
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>{language === 'ur' ? 'تمام کیٹیگریز' : 'All Categories'}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        !materialQuery || materialQuery === 'All' 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {marbles.length + fixingMaterials.length}
                      </span>
                    </button>

                    {/* Dynamic categories from categoryOrder */}
                    {deduplicateCategories(categoryOrder).map(cat => {
                      const Icon = categoryIcons[cat] || Gem;
                      const catLower = cat.toLowerCase();
                      const isSaleCategory = catLower.includes('sale') || catLower.includes('discount') || catLower.includes('سیل');

                      const count = isSaleCategory
                        ? marbles.filter(m => !m.isHidden && (m.onSale || (m.discount && m.discount > 0) || m.category === 'Sale & Discount')).length +
                          fixingMaterials.filter(f => !f.isHidden && ((f as any).onSale || ((f as any).discount && (f as any).discount > 0) || (f.category as string) === 'Sale & Discount')).length
                        : marbles.filter(m => !m.isHidden && (
                            (m.category && m.category.toLowerCase() === catLower) || 
                            (m.materialType && m.materialType.toLowerCase() === catLower) || 
                            (`${(m.origin || 'Local').toLowerCase()} ${(m.materialType || '').toLowerCase()}` === catLower) ||
                            (catLower === 'marble tiles' && m.materialType === '12x24 Tiles') ||
                            (catLower.includes('mdm') && (
                              (m.category && m.category.toLowerCase().includes('mdm')) || 
                              (m.materialType && m.materialType.toLowerCase().includes('mdm')) || 
                              (m.name && m.name.toLowerCase().includes('mdm'))
                            ))
                          )).length + fixingMaterials.filter(f => f.category && f.category.toLowerCase() === catLower).length;
                      
                      const isSelected = materialQuery === cat;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              router.push('/');
                            } else {
                              router.push(`/?material=${encodeURIComponent(cat)}`);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all border shadow-xs whitespace-nowrap cursor-pointer",
                            isSelected
                              ? isSaleCategory
                                ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border-transparent shadow-md"
                                : "bg-primary text-primary-foreground border-primary shadow-sm"
                              : isSaleCategory
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"
                                : "bg-card text-foreground border-border/60 hover:border-primary/50 hover:bg-accent/50"
                          )}
                        >
                          <Icon className={cn("w-3.5 h-3.5", isSaleCategory && "text-amber-500 fill-amber-500 animate-pulse")} />
                          <span>{cat}</span>
                          {count > 0 ? (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                              isSelected 
                                ? "bg-white/25 text-white" 
                                : isSaleCategory 
                                  ? "bg-red-500/20 text-red-700 dark:text-red-300" 
                                  : "bg-muted text-muted-foreground"
                            )}>
                              {count}
                            </span>
                          ) : (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                              isSelected ? "bg-amber-400 text-slate-950" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            )}>
                              {language === 'ur' ? 'نیا' : 'New'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
              </div>

              {isLoading ? (
                 <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`skel-cat-${i}`} className="space-y-4">
                      <Skeleton className="h-8 w-1/4" />
                      <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <CardSkeleton key={`skel-item-${j}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                 </>
              ) : (
                <>
                    { !showNoResultsMessage &&
                        sortedCategories.map(category => {
                        const items = filteredAndGroupedMarbles[category] || [];
                        const fixingItems = filteredAndGroupedFixingMaterials[category] || [];
                        if (items.length === 0 && fixingItems.length === 0) return null;
                        const Icon = categoryIcons[category] || Gem;
                        const totalCount = items.length + fixingItems.length;
                        return (
                        <div key={category} className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-baseline gap-4">
                                    <h2 className="font-headline flex items-center gap-3 text-2xl md:text-3xl font-bold tracking-tighter">
                                        <Icon className="h-8 w-8 text-primary" />
                                        {category}
                                    </h2>
                                    <span className="text-muted-foreground font-medium text-sm md:text-base">({totalCount} Items)</span>
                                </div>
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => setViewAllCategory(category)}>
                                    {t('view_all')}
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                            {items.length > 0 && (
                                <Carousel opts={{ align: "start", loop: items.length > 4, watchDrag: true }} plugins={[Autoplay({delay: 2000, stopOnInteraction: true})]}>
                                    <CarouselContent className="-ml-4">
                                        {items.map((marble, index) => (
                                            <CarouselItem key={marble.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                                                <MarbleCard
                                                    marble={marble}
                                                    onImageClick={handleImageClick}
                                                    onDesignClick={(id) => {
                                                        setIsCalculatorLoading(true);
                                                        router.push(`/order/${id}`);
                                                    }}
                                                    itemNumber={index + 1}
                                                />
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="hidden sm:flex" />
                                    <CarouselNext className="hidden sm:flex" />
                                </Carousel>
                            )}
                            {fixingItems.length > 0 && (
                                <Carousel opts={{ align: "start", loop: fixingItems.length > 4, watchDrag: true }} plugins={[Autoplay({delay: 2500, stopOnInteraction: true})]}>
                                    <CarouselContent className="-ml-4">
                                        {fixingItems.map((material) => (
                                            <CarouselItem key={material.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                                                <FixingMaterialCard material={material} onImageClick={handleFixingMaterialClick} />
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="hidden sm:flex" />
                                    <CarouselNext className="hidden sm:flex" />
                                </Carousel>
                            )}
                        </div>
                        );
                        })
                    }
                    
                    { showNoResultsMessage && (
                        <div className="py-12 max-w-2xl mx-auto text-center px-4">
                          <Card className="border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-xl overflow-hidden rounded-3xl text-left p-6 sm:p-8 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-15 text-amber-500 pointer-events-none">
                              <Sparkles className="h-28 w-28" />
                            </div>
                            
                            <div className="flex items-center gap-3 mb-4">
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1 text-xs uppercase tracking-wider">
                                {materialQuery && categoryOrder.includes(materialQuery)
                                  ? (language === 'ur' ? 'فعال کیٹیگری' : 'Active Category')
                                  : (language === 'ur' ? 'عنقریب دستیاب' : 'Product Coming Soon')}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-amber-500" />
                                {materialQuery && categoryOrder.includes(materialQuery)
                                  ? (language === 'ur' ? 'نئی کیٹیگری سسٹم میں شامل ہے' : 'Registered in Admin Panel')
                                  : (language === 'ur' ? 'درخواست رجسٹرڈ ہو گئی ہے' : 'Demand logged in system')}
                              </span>
                            </div>

                            <h3 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                              {materialQuery && categoryOrder.includes(materialQuery)
                                ? `${materialQuery} - ${language === 'ur' ? 'نیا کلیکشن' : 'New Collection'}`
                                : (language === 'ur' 
                                    ? `"${searchQuery || materialQuery}" فی الحال ہمارے پاس دستیاب نہیں ہے` 
                                    : `"${searchQuery || materialQuery}" is Coming Soon!`)}
                            </h3>

                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                              {materialQuery && categoryOrder.includes(materialQuery)
                                ? (language === 'ur'
                                    ? `یہ کیٹیگری سسٹم میں کامیابی سے شامل ہے۔ جلد ہی اس کے پروڈکٹس اور ریٹس اپ لوڈ کر دیے جائیں گے۔ اگر آپ کو اس کیٹیگری کا فوری ریٹ یا سپلائی چاہیے تو ہمارے ساتھ واٹس ایپ پر رابطہ کریں۔`
                                    : `This category is active in the catalog and products are currently being populated. Inquire below for live rates, custom cutting, or stock availability.`)
                                : (language === 'ur'
                                    ? `ہم نے آپ کی تلاش کا نوٹ لے لیا ہے۔ ہماری ٹیم جلد ہی اسے انوینٹری میں شامل کرے گی۔ اگر آپ کو فوراً ضرورت ہے یا خاص آرڈر دینا چاہتے ہیں تو ہمارے ساتھ واٹس ایپ پر رابطہ کریں۔`
                                    : `We don't have "${searchQuery || materialQuery}" in our active inventory right now, but our team is sourcing new stock. Please inquire via WhatsApp.`)}
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-6 shadow-md gap-2 flex-1">
                                <a 
                                  href={`https://wa.me/923399991052?text=${encodeURIComponent(`السلام علیکم، مجھے ${materialQuery || searchQuery} کے بارے میں معلومات اور ریٹ درکار ہیں۔`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Phone className="h-4 w-4" />
                                  {language === 'ur' ? 'واٹس ایپ پر ریٹ معلوم کریں' : 'Request via WhatsApp'}
                                </a>
                              </Button>

                              <Button 
                                variant="outline" 
                                className="rounded-xl h-11 px-5 font-semibold gap-2 border-border/80"
                                onClick={() => router.push('/')}
                              >
                                {language === 'ur' ? 'تمام پروڈکٹس دیکھیں' : 'View All Products'}
                              </Button>
                            </div>
                          </Card>
                        </div>
                    )}
                </>
              )}


             <div id="our-team" className="space-y-6 scroll-mt-28">
               <div id="service-teams" className="scroll-mt-28" />
                <div className="flex items-baseline gap-4">
                    <h2 className="font-headline flex items-center gap-3 text-3xl font-bold tracking-tighter">
                      <Users className="h-8 w-8 text-primary" />
                      Our Expert Teams
                    </h2>
                </div>
                 <Carousel opts={{ align: "start", loop: serviceProviders.length > 3 }} plugins={[Autoplay({delay: 3000, stopOnInteraction: true})]}>
                    <CarouselContent className="-ml-4">
                      {serviceProviders.map((provider) => {
                        const ServiceIcon = serviceIcons[provider.service] || Users;
                        return (
                            <CarouselItem key={provider.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3">
                                <Card className="group flex flex-col hover:shadow-lg transition-shadow cursor-pointer h-full" onClick={() => handleProviderCardClick(provider)}>
                                    <CardHeader className="flex flex-row items-center gap-4 p-4">
                                        <Image src={provider.imageUrl || '/images/placeholder-avatar.png'} alt={provider.name} width={80} height={80} className="rounded-full object-cover border-4 border-secondary"/>
                                        <div className="space-y-1">
                                            <CardTitle className="font-semibold text-lg">{provider.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 text-sm"><ServiceIcon className="h-4 w-4"/>{provider.service}</CardDescription>
                                            {provider.rating && (
                                                <div className="flex items-center gap-0.5">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} className={cn("h-4 w-4", i < provider.rating! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50")} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    {provider.gallery && provider.gallery.length > 0 && (
                                        <CardContent className="p-0">
                                            <div className="relative aspect-video w-full">
                                                <Image src={provider.gallery[0].url} alt={provider.gallery[0].altText || 'Work sample'} fill className="object-cover" />
                                            </div>
                                        </CardContent>
                                    )}
                                    <CardFooter className="p-4 w-full justify-between items-center mt-auto">
                                        <div className="flex items-center gap-1">
                                            {provider.socials?.whatsapp && <Button asChild variant="ghost" size="icon" onClick={e => e.stopPropagation()}><a href={`https://wa.me/${provider.socials.whatsapp}`} target="_blank" rel="noopener noreferrer"><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-green-500"><title>WhatsApp</title><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/><path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4"/></svg></a></Button>}
                                            {provider.socials?.facebook && <Button asChild variant="ghost" size="icon" onClick={e => e.stopPropagation()}><a href={provider.socials.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="h-5 w-5 text-blue-600" /></a></Button>}
                                            {provider.socials?.instagram && <Button asChild variant="ghost" size="icon" onClick={e => e.stopPropagation()}><a href={provider.socials.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5 text-pink-500" /></a></Button>}
                                        </div>
                                        <Button asChild variant="secondary" onClick={e => e.stopPropagation()}>
                                            <a href={`tel:${provider.phone}`}><Phone className="mr-2 h-4 w-4"/>Call Now</a>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </CarouselItem>
                        )
                      })}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
              </div>

              {/* Regional Representatives (علاقائی نمائندے) Section */}
              <div className="pt-6 sm:pt-10">
                <RepresentativesSection />
              </div>
            </div>
          </section>

          <section id="build-with-us" className="w-full py-12 md:py-24 lg:py-32 bg-card border-y overflow-hidden">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center gap-8 text-center">
                <div className="space-y-4 w-full max-w-3xl mx-auto flex flex-col items-center">
                  <Link href="/build-your-home" className="group inline-flex items-center gap-2 hover:opacity-95 transition-all">
                    <h2 className="font-headline text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl/tight text-primary break-words group-hover:text-[#dfb96c] transition-colors flex items-center gap-2">
                      <span>{buildWithUsContent.heading}</span>
                      <ArrowRight className="h-6 w-6 text-[#dfb96c] group-hover:translate-x-1.5 transition-transform shrink-0" />
                    </h2>
                  </Link>
                  <p className="mx-auto max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed px-2" dir={language === 'ur' ? 'rtl' : 'ltr'}>
                    {buildWithUsContent.subheading}
                  </p>
                  <div className="pt-2">
                    <Button asChild size="lg" className="bg-[#dfb96c] hover:bg-[#c9a358] text-slate-950 font-bold px-6 py-2.5 rounded-full shadow-lg gap-2">
                      <Link href="/build-your-home">
                        <span>{language === 'ur' ? 'انٹیریئر، مینٹیننس اور پروجیکٹس دیکھیں' : 'Explore Interior, Maintenance & Projects'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <div className="w-full max-w-5xl mx-auto px-2">
                  <Carousel opts={{ loop: true }} plugins={[Autoplay({ delay: 3500, stopOnInteraction: true })]}>
                    <CarouselContent>
                      {(homepageContent?.buildWithUs?.gallery || []).map((item, index) => (
                        <CarouselItem key={item.id || index}>
                          <Card className="overflow-hidden border-none shadow-md">
                            <CardContent className="p-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-0">
                                <div className="p-3 sm:p-4 md:p-6 text-left space-y-2 border-b md:border-b-0 md:border-r bg-muted/20">
                                  <div className="flex items-center justify-between mb-1">
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">Before</Badge>
                                  </div>
                                  <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden">
                                    {item.before ? (
                                      <Image src={item.before} alt={`Before: ${item.description}`} fill className="object-cover" />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Image</div>
                                    )}
                                  </div>
                                </div>
                                <div className="p-3 sm:p-4 md:p-6 text-left space-y-2 bg-background">
                                  <div className="flex items-center justify-between mb-1">
                                    <Badge variant="default" className="text-[10px] sm:text-xs">After</Badge>
                                  </div>
                                  <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden shadow-inner">
                                    {item.after ? (
                                      <Image src={item.after} alt={`After: ${item.description}`} fill className="object-cover" />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Image</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 sm:p-4 bg-muted/50 text-center border-t">
                                 <p className="font-semibold text-foreground text-xs sm:text-sm md:text-base line-clamp-2">{item.description}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-[-20px] sm:left-[-50px] hidden sm:flex" />
                    <CarouselNext className="right-[-20px] sm:right-[-50px] hidden sm:flex" />
                  </Carousel>
                </div>
                
                <Button asChild size="lg" className="mt-4 sm:mt-8 w-full sm:w-auto">
                  <Link href="/contact">
                    <Phone className="mr-2 h-5 w-5"/>
                    Get a Free Consultation
                  </Link>
                </Button>
              </div>
            </div>
          </section>

        </main>
        <footer className="bg-secondary text-secondary-foreground">
            <div className="container py-12 px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1 space-y-4">
                        <Link href="/" className="flex items-center gap-2.5">
                           <span className="font-headline text-2xl font-extrabold tracking-wider" style={{ color: '#dfb96c' }}>Stone Expert</span>
                        </Link>
                        <p className="text-sm text-muted-foreground">Your one-stop shop for premium construction materials in Rawalpindi and Islamabad.</p>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Explore</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            <li><Link href="/#service-teams" className="hover:text-primary">Our Teams</Link></li>
                            <li><Link href="/#representatives-section" className="hover:text-primary">Regional Representatives</Link></li>
                            <li><Link href="/#build-with-us" className="hover:text-primary">Our Work</Link></li>
                             <li><Link href="/track-order" className="hover:text-primary">Track Order</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold">Contact Us</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-primary" />
                                <a href={`tel:${businessContact.phoneNumber.replace(/\s/g, '')}`} className="hover:text-primary">{businessContact.phoneNumber}</a>
                            </li>
                             <li className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary"><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/><path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4"/></svg>
                                <a href={`https://wa.me/${businessContact.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Chat on WhatsApp</a>
                            </li>
                             <li className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-primary" />
                                <a href="mailto:info@stoneexpert.com" className="hover:text-primary">info@stoneexpert.com</a>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                                <a href={businessContact.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Main GT Road, Rawalpindi, Pakistan</a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t border-muted-foreground/20 pt-6 text-center text-xs text-muted-foreground">
                    <p>{t('footer_text')}</p>
                </div>
            </div>
        </footer>
        
        <button 
            onClick={handleFloatingWhatsApp}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
            aria-label="Contact on WhatsApp"
        >
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 fill-current">
                <title>WhatsApp</title>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        </button>
      </div>

      {/* View All Category Grid Popup */}
      <Dialog open={!!viewAllCategory} onOpenChange={(open) => !open && setViewAllCategory(null)}>
        <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none flex flex-col p-0 overflow-hidden bg-background">
            <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <LayoutGrid className="h-6 w-6 text-primary" />
                    <DialogTitle className="text-xl md:text-3xl truncate max-w-[250px] sm:max-w-none">{viewAllCategory}</DialogTitle>
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogClose>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
                <div className="p-6">
                    <div className="mb-8">
                        <DialogDescription className="text-base md:text-lg">
                            {t('view_all')} {viewAllCategory} - Click any material to start Designing.
                        </DialogDescription>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
                        {viewAllCategory && (
                            <>
                                {/* Render Marbles for this category */}
                                {(filteredAndGroupedMarbles[viewAllCategory] || []).map((marble) => (
                                    <div
                                        key={marble.id}
                                        className="group relative rounded-xl overflow-hidden border bg-card hover:ring-4 hover:ring-primary/50 transition-all shadow-md hover:shadow-2xl"
                                    >
                                        <div className="relative aspect-square">
                                            <Image src={marble.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(marble.name)}`} alt={marble.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                                            
                                            {/* Dual Button Overlay */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    className="bg-primary text-primary-foreground font-bold shadow-lg w-32"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsCalculatorLoading(true);
                                                        router.push(`/order/${marble.id}`);
                                                    }}
                                                >
                                                    <Calculator className="mr-2 h-4 w-4" />
                                                    Design Now
                                                </Button>
                                                <Button 
                                                    variant="secondary"
                                                    className="font-bold shadow-lg w-32"
                                                    size="sm"
                                                    onClick={() => handleImageClick(marble)}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Samples
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-background border-t">
                                            <div className="flex items-start justify-between gap-1 flex-col">
                                                <p className="text-sm font-bold truncate w-full leading-tight">{marble.name}</p>
                                                <p className="text-xs font-bold text-primary">
                                                    {marble.variants[0]?.price ? `PKR ${marble.variants[0].price.toLocaleString()}/sqft` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Render Fixing Materials for this category */}
                                {(filteredAndGroupedFixingMaterials[viewAllCategory] || []).map((material) => (
                                    <div
                                        key={material.id}
                                        className="group relative cursor-pointer rounded-xl overflow-hidden border bg-card hover:ring-4 hover:ring-primary/50 transition-all shadow-md hover:shadow-2xl"
                                        onClick={() => {
                                            setIsCalculatorLoading(true);
                                            router.push('/order/general-supplies-order');
                                        }}
                                    >
                                        <div className="relative aspect-square">
                                            <Image src={material.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(material.name)}`} alt={material.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg">Select Item</div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-background border-t">
                                            <div className="flex items-start justify-between gap-1 flex-col">
                                                <p className="text-sm font-bold truncate w-full leading-tight">{material.name}</p>
                                                <p className="text-xs font-bold text-primary">PKR {material.price.toLocaleString()} / {material.unit}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                <ScrollBar orientation="vertical" />
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dedicated All-Sale Products Popup Dialog */}
      <Dialog open={isAllSalePopupOpen} onOpenChange={setIsAllSalePopupOpen}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-amber-500/30">
          <DialogHeader className="p-4 sm:p-6 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-xs">
                  <Flame className="h-6 w-6 fill-amber-300 text-amber-200 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>{language === 'ur' ? 'تمام سیل والی پروڈکٹس' : 'All Products on Special Sale'}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-black/30 border border-white/20 text-amber-300">
                      {allSaleProducts.length} {language === 'ur' ? 'آئٹمز' : 'Deals'}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-white/85 text-xs sm:text-sm mt-0.5">
                    {language === 'ur'
                      ? 'تمام کیٹیگریز کے وہ تمام پروڈکٹس جن پر روپوں یا فیصد میں سیل لگی ہوئی ہے'
                      : 'All discounted products across Marbles, Granites, Tiles, and Tools with verified PKR and % price drops'}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Filter and Search controls inside Header */}
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder={language === 'ur' ? 'پروڈکٹ کا نام یا کیٹیگری تلاش کریں...' : 'Search sale products by name or category...'}
                  value={saleSearchQuery}
                  onChange={(e) => setSaleSearchQuery(e.target.value)}
                  className="bg-white/95 text-zinc-900 placeholder:text-zinc-500 pl-9 pr-8 h-9 text-xs sm:text-sm rounded-lg border-0 shadow-inner"
                />
                {saleSearchQuery && (
                  <button
                    onClick={() => setSaleSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setSaleFilterCategory('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    saleFilterCategory === 'all'
                      ? "bg-white text-red-700 shadow-sm"
                      : "bg-black/30 text-white/90 hover:bg-black/40"
                  )}
                >
                  {language === 'ur' ? 'سب پروڈکٹس' : 'All Deals'} ({allSaleProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSaleFilterCategory('marbles')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    saleFilterCategory === 'marbles'
                      ? "bg-white text-red-700 shadow-sm"
                      : "bg-black/30 text-white/90 hover:bg-black/40"
                  )}
                >
                  {language === 'ur' ? 'ماربل و گرینائٹ' : 'Marbles'} ({allSaleProducts.filter(p => !p.isFixing).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSaleFilterCategory('supplies')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                    saleFilterCategory === 'supplies'
                      ? "bg-white text-red-700 shadow-sm"
                      : "bg-black/30 text-white/90 hover:bg-black/40"
                  )}
                >
                  {language === 'ur' ? 'ٹولز و کیمیکلز' : 'Supplies & Tools'} ({allSaleProducts.filter(p => p.isFixing).length})
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Products Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {allSaleProducts
              .filter(product => {
                if (saleFilterCategory === 'marbles' && product.isFixing) return false;
                if (saleFilterCategory === 'supplies' && !product.isFixing) return false;
                if (saleSearchQuery.trim()) {
                  const q = saleSearchQuery.toLowerCase().trim();
                  const nameMatch = product.name?.toLowerCase().includes(q);
                  const catMatch = product.category?.toLowerCase().includes(q);
                  const originMatch = product.origin?.toLowerCase().includes(q);
                  return nameMatch || catMatch || originMatch;
                }
                return true;
              })
              .length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="p-4 rounded-full bg-amber-500/10 text-amber-600">
                    <Flame className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">
                    {language === 'ur' ? 'کوئی پروڈکٹ نہیں ملا' : 'No Sale Products Found'}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {language === 'ur'
                      ? 'آپ کی تلاش کے مطابق فی الحال کوئی پروڈکٹ سیل میں دستیاب نہیں ہے یا فلٹر کو تبدیل کر کے دیکھیں۔'
                      : 'No sale products match your current search or category filter. Try clearing your search.'}
                  </p>
                  {saleSearchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSaleSearchQuery('')}
                      className="text-xs"
                    >
                      {language === 'ur' ? 'سرچ کلیئر کریں' : 'Clear Search'}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSaleProducts
                    .filter(product => {
                      if (saleFilterCategory === 'marbles' && product.isFixing) return false;
                      if (saleFilterCategory === 'supplies' && !product.isFixing) return false;
                      if (saleSearchQuery.trim()) {
                        const q = saleSearchQuery.toLowerCase().trim();
                        const nameMatch = product.name?.toLowerCase().includes(q);
                        const catMatch = product.category?.toLowerCase().includes(q);
                        const originMatch = product.origin?.toLowerCase().includes(q);
                        return nameMatch || catMatch || originMatch;
                      }
                      return true;
                    })
                    .map(product => (
                      <div
                        key={product.id}
                        className="group flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-amber-500/50 transition-all duration-200"
                      >
                        {/* Image with Sale Badge */}
                        <div 
                          onClick={() => {
                            setIsAllSalePopupOpen(false);
                            if (product.isFixing && product.fixingObj) {
                              handleFixingMaterialClick(product.fixingObj);
                            } else if (product.marbleObj) {
                              handleImageClick(product.marbleObj);
                            }
                          }}
                          className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden"
                        >
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Sale Discount Badge */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <Badge className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs px-2.5 py-0.5 shadow-md flex items-center gap-1 border border-white/20 uppercase tracking-wider">
                              <Flame className="h-3 w-3 fill-amber-300 text-amber-200" />
                              <span>
                                {formatSaleBadgeText({
                                  discount: product.discount,
                                  discountType: product.discountType,
                                  saleBadgeText: product.saleBadgeText,
                                  isUrdu: language === 'ur'
                                })}
                              </span>
                            </Badge>
                          </div>

                          <div className="absolute top-2.5 right-2.5 z-10">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white border border-white/20">
                              {product.origin || (product.isFixing ? 'Fixing Tool' : 'Marble')}
                            </span>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                              <span className="uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                {product.category}
                              </span>
                              <span className="text-zinc-500 font-medium">/{product.unit}</span>
                            </div>
                            <h4 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
                              {product.name}
                            </h4>
                          </div>

                          {/* Price Display */}
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                            <div>
                              {product.originalPrice && product.originalPrice > product.price ? (
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-muted-foreground line-through font-medium">
                                    PKR {product.originalPrice.toLocaleString()}
                                  </span>
                                  <span className="text-base font-black text-red-600 dark:text-red-400">
                                    PKR {product.price.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-base font-black text-foreground">
                                  PKR {product.price.toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsAllSalePopupOpen(false);
                                  if (product.isFixing && product.fixingObj) {
                                    handleFixingMaterialClick(product.fixingObj);
                                  } else if (product.marbleObj) {
                                    handleImageClick(product.marbleObj);
                                  }
                                }}
                                className="h-8 text-xs font-bold border-amber-500/30 hover:bg-amber-500/10 text-foreground cursor-pointer"
                              >
                                {language === 'ur' ? 'تفصیل دیکھیں' : 'View Details'}
                              </Button>
                              <a
                                href={`https://wa.me/${businessContact.whatsappNumber}?text=${encodeURIComponent(`Salam, I want to inquire about the special sale deal on "${product.name}" at PKR ${product.price.toLocaleString()} (${formatSaleBadgeText({ discount: product.discount, discountType: product.discountType, saleBadgeText: product.saleBadgeText })}).`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-xs"
                                title="WhatsApp Inquiry"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>

          <DialogFooter className="p-3 sm:p-4 bg-muted/40 border-t flex flex-row items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {language === 'ur' ? 'تمام قیمتیں اور رعایتیں سٹون ایکسپرٹ سے تصدیق شدہ ہیں۔' : 'Prices & discounts verified by Stone Expert Market Price Manager.'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAllSalePopupOpen(false)}
              className="text-xs font-semibold cursor-pointer"
            >
              {language === 'ur' ? 'بند کریں' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Details / Reference Samples Popup */}
      <Dialog open={isImagePopupOpen} onOpenChange={setIsImagePopupOpen}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] bg-background h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedMarble && (
            <>
               <DialogHeader className="p-4 sm:p-6 pb-2 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex flex-col">
                        <DialogTitle className="text-xl sm:text-2xl font-bold">{selectedMarble.name}</DialogTitle>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="secondary" className="flex items-center gap-1 text-[10px] sm:text-xs">
                                <Gem className="h-3 w-3" />
                                {selectedMarble.materialType}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1 text-[10px] sm:text-xs">
                                <OriginIcon className="h-3 w-3" />
                                {selectedMarble.origin}
                            </Badge>
                        </div>
                    </div>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
                            
                            {/* Left Column: Image Gallery */}
                            <div className="lg:col-span-3 space-y-6">
                                <div 
                                    className="relative aspect-video lg:aspect-auto lg:h-[450px] w-full overflow-hidden rounded-xl border bg-muted shadow-lg cursor-pointer hover:opacity-95 transition-opacity group/image"
                                    onClick={() => openImage(activeGalleryImage, selectedMarble.name)}
                                    title="Click to view full screen"
                                >
                                    <Image
                                        src={activeGalleryImage}
                                        alt={`Sample view of ${selectedMarble.name}`}
                                        fill
                                        className="object-contain transition-transform duration-300 group-hover/image:scale-102"
                                        priority
                                    />
                                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-xs text-white px-2.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                                        <Maximize className="h-3 w-3" /> Full Screen
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-sm sm:text-lg flex items-center gap-2">
                                        <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                        Reference Samples (سیڑھی، کچن، فلور)
                                    </h4>
                                    <ScrollArea className="w-full whitespace-nowrap pb-2">
                                        <div className="flex gap-2 sm:gap-3">
                                            {[selectedMarble.imageUrl, ...selectedMarble.gallery.map(g => g.url)].map((url, idx) => (
                                            <button 
                                                key={url} 
                                                onClick={() => setActiveGalleryImage(url || `https://placehold.co/400x400?text=Sample+${idx+1}`)} 
                                                className={cn(
                                                    'h-16 w-16 sm:h-24 sm:w-24 lg:h-28 lg:w-28 flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all shadow-sm hover:scale-105', 
                                                    activeGalleryImage === url ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                                                )}
                                            >
                                                <Image src={url || `https://placehold.co/400x400?text=Sample+${idx+1}`} alt={`sample ${idx}`} fill className="object-cover" />
                                            </button>
                                            ))}
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </div>
                            </div>

                            {/* Right Column: Pricing & Details */}
                            <div className="lg:col-span-2 space-y-8">
                                <Card className="shadow-none border bg-muted/20 overflow-hidden">
                                    <CardHeader className="px-4 py-3 border-b bg-muted/30">
                                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                            <Calculator className="h-4 w-4 text-primary" />
                                            Formats & Pricing
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="h-8 text-xs">Format</TableHead>
                                                    <TableHead className="h-8 text-xs">Thickness</TableHead>
                                                    <TableHead className="h-8 text-right text-xs">Price/sq.ft</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedMarble.variants.map((variant) => (
                                                    <TableRow key={variant.id}>
                                                    <TableCell className="py-2 text-xs sm:text-sm font-medium">{variant.size.split('(')[0].trim()}</TableCell>
                                                    <TableCell className="py-2 text-[10px] sm:text-xs">{variant.thickness}</TableCell>
                                                    <TableCell className="py-2 text-right font-bold text-primary text-xs sm:text-sm">
                                                        {variant.price ? `PKR ${variant.price.toLocaleString()}` : <span className="text-destructive">N/A</span>}
                                                    </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <div className="space-y-6">
                                    {selectedMarble.description && (
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                                <Icons.logo className="h-4 w-4 text-primary" />
                                                Description
                                            </h4>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {selectedMarble.description}
                                            </p>
                                        </div>
                                    )}
                                    {selectedMarble.uses && (
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-primary" />
                                                Common Uses
                                            </h4>
                                            <p className="text-xs sm:text-sm text-muted-foreground">
                                                {selectedMarble.uses}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-muted/10 flex items-center justify-end gap-3 shrink-0">
                    <DialogClose asChild>
                        <Button variant="outline" size="lg" className="h-11 px-6">Close</Button>
                    </DialogClose>
                    <Button 
                        size="lg"
                        className="h-11 px-8 font-bold shadow-lg"
                        onClick={() => {
                            setIsImagePopupOpen(false);
                            setIsCalculatorLoading(true);
                            router.push(`/order/${selectedMarble.id}`);
                        }}
                    >
                        <Calculator className="mr-2 h-5 w-5" />
                        Start Designing Now
                    </Button>
                </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFixingMaterialPopupOpen} onOpenChange={setIsFixingMaterialPopupOpen}>
        <DialogContent className="max-w-2xl bg-background">
          {selectedFixingMaterial && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFixingMaterial.name}</DialogTitle>
                <DialogDescription>{selectedFixingMaterial.category}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <div 
                        className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-95 transition-opacity group/fiximage"
                        onClick={() => openImage(activeFixingGalleryImage, selectedFixingMaterial.name)}
                        title="Click to view full screen"
                    >
                        <Image
                            src={activeFixingGalleryImage}
                            alt={`Image of ${selectedFixingMaterial.name}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover/fiximage:scale-102"
                        />
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-xs text-white px-2.5 py-1 rounded-md font-medium tracking-wide flex items-center gap-1 opacity-0 group-hover/fiximage:opacity-100 transition-opacity">
                            <Maximize className="h-3 w-3" /> Full Screen
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{selectedFixingMaterial.description}</p>
                      <div className="font-bold text-lg text-primary">
                        PKR {selectedFixingMaterial.price.toLocaleString()}
                        <span className="text-sm font-medium text-muted-foreground"> / {selectedFixingMaterial.unit}</span>
                      </div>
                      {selectedFixingMaterial.dataSheetUrl && (
                        <Button asChild className="w-full">
                          <Link href={selectedFixingMaterial.dataSheetUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2" />
                            View Data Sheet
                          </Link>
                        </Button>
                      )}
                  </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
       <Dialog open={isServiceProviderDialogOpen} onOpenChange={setIsServiceProviderDialogOpen}>
        <DialogContent className="sm:max-w-4xl bg-background max-h-[90vh] flex flex-col p-6">
          {selectedProvider && (
            <>
              <DialogHeader className="border-b pb-4 shrink-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <Image 
                    src={selectedProvider.imageUrl || '/images/placeholder-avatar.png'} 
                    alt={selectedProvider.name} 
                    width={80} 
                    height={80} 
                    className="rounded-full object-cover border-4 border-secondary shadow-sm"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                      <DialogTitle className="text-2xl font-bold font-sans tracking-tight">{selectedProvider.name}</DialogTitle>
                      <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 self-center sm:self-start">
                        {selectedProvider.service}
                      </Badge>
                    </div>
                    
                    {selectedProvider.rating && (
                      <div className="flex items-center gap-0.5 justify-center sm:justify-start">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-4 w-4", 
                              i < selectedProvider.rating! ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                            )} 
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1.5">({selectedProvider.rating}.0 rating)</span>
                      </div>
                    )}
                    
                    {/* Social Buttons Row */}
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                      <Button asChild size="sm" className="bg-[#dfb96c] hover:bg-[#dfb96c]/90 text-black font-bold rounded-full h-8 px-4">
                        <a href={`tel:${selectedProvider.phone}`}>
                          <Phone className="mr-1.5 h-3.5 w-3.5" /> Call Now
                        </a>
                      </Button>
                      {selectedProvider.socials?.whatsapp && (
                        <Button asChild size="sm" variant="outline" className="border-green-500/30 text-green-600 hover:bg-green-500/10 rounded-full h-8 px-4">
                          <a href={`https://wa.me/${selectedProvider.socials.whatsapp}`} target="_blank" rel="noopener noreferrer">
                            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4 fill-green-500"><title>WhatsApp</title><path d="M12.04 2.5C7.04 2.5 3 6.58 3 11.58c0 2.54.98 4.9 2.7 6.64l-1.4 4.28 4.4-1.48a10.43 10.43 0 0 0 3.34.56h.02c5 0 9.04-4.08 9.04-9.08s-4.04-9.08-9.04-9.08z"/><path d="m16.5 13.5-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4"/></svg>
                            WhatsApp Chat
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 pr-2">
                <div className="py-4 space-y-6">
                  {/* Two-Column Grid for Rates and Showcase Gallery */}
                  <div className="grid md:grid-cols-5 gap-6 items-start">
                    
                    {/* Rates list column (2/5 size) */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
                        <div className="border-b pb-2">
                          <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                            <Coins className="h-4 w-4 text-emerald-500" />
                            Active Labor Rates Board
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Verified labor costing and material installation charges.</p>
                        </div>
                        
                        {(!selectedProvider.jobs || selectedProvider.jobs.length === 0) ? (
                          <p className="text-xs text-muted-foreground italic bg-muted/50 p-4 rounded-lg text-center border border-dashed">
                            No active rate sheets specified. Contact directly for details.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {selectedProvider.jobs.map((job) => (
                              <div key={job.id} className="flex items-center justify-between p-2.5 bg-background border rounded-lg hover:shadow-sm transition-shadow">
                                <span className="text-xs font-semibold text-foreground truncate max-w-[150px]" title={job.title}>
                                  {job.title}
                                </span>
                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded">
                                  Rs. {job.price} / {
                                    job.unit === 'sqft' ? 'Sq. Ft.' :
                                    job.unit === 'sqmeter' ? 'Sq. Meter' :
                                    job.unit === 'rft' ? 'RFT' :
                                    job.unit === 'piece' ? 'Piece' : 'Fixed Job'
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gallery showcase column (3/5 size) */}
                    <div className="md:col-span-3 space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-indigo-500" />
                          Work Showcase & Photo Rates
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Explore actual photos of completed works alongside their specific project costs.</p>
                      </div>

                      {(!selectedProvider.gallery || selectedProvider.gallery.length === 0) ? (
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-muted-foreground italic text-xs">
                          No project showcase photos uploaded yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                          {selectedProvider.gallery.map((img) => (
                            <div key={img.id} className="border rounded-lg overflow-hidden bg-muted/10 flex flex-col relative group">
                              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                <Image 
                                  src={img.url} 
                                  alt={img.altText || 'Work sample'} 
                                  fill 
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  unoptimized
                                />
                                {img.price && (
                                  <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">
                                    Rs. {img.price}/{
                                      img.unit === 'sqft' ? 'sqft' :
                                      img.unit === 'sqmeter' ? 'sqmeter' :
                                      img.unit === 'rft' ? 'rft' :
                                      img.unit === 'piece' ? 'pc' : 'job'
                                    }
                                  </div>
                                )}
                              </div>
                              <div className="p-2 shrink-0">
                                <p className="text-[10px] font-semibold text-foreground truncate leading-normal">
                                  {img.altText || 'Showcase Project'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Elegant Loading Overlay with Company Logo */}
      {(isLoading || isCalculatorLoading) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 backdrop-blur-md bg-opacity-95 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{
              scale: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
              opacity: { duration: 0.4 }
            }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="relative inline-flex items-center justify-center px-8 py-2 rounded-full bg-[#dfb96c]/10 border border-[#dfb96c]/30 overflow-hidden shadow-lg">
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 text-[#dfb96c] pointer-events-none z-10"
                animate={{
                  left: ["2%", "92%", "2%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-5 w-5 text-[#dfb96c] drop-shadow-[0_0_12px_rgba(223,185,108,1)]" />
              </motion.div>
              <Sparkles className="h-6 w-6 text-[#dfb96c]" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-headline text-lg sm:text-xl font-bold text-[#dfb96c] tracking-wide">
                {isLoading 
                  ? (language === 'ur' ? 'سٹون ایکسپرٹ میں خوش آمدید...' : 'Welcome to Stone Expert...')
                  : (language === 'ur' ? 'کیلکولیٹر تیار کیا جا رہا ہے...' : 'Initializing Estimator...')
                }
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 animate-pulse px-4 max-w-sm">
                {isLoading
                  ? (language === 'ur' ? 'برائے مہربانی انتظار فرمائیں، پریمیم ماربل کلیکشن لوڈ ہو رہا ہے' : 'Loading premium stone collection and live prices...')
                  : (language === 'ur' ? 'برائے مہربانی انتظار فرمائیں، قیمتوں کا حساب لگایا جا رہا ہے' : 'Please wait while we prepare your custom quotation rates...')
                }
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Elegant Exit Dialog */}
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100/10 text-red-500">
              <Power className="h-6 w-6 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-xl font-bold font-headline text-red-400">
              {language === 'ur' ? 'ایپ بند کرنے کی تصدیق' : 'Exit Application'}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300">
              {language === 'ur' 
                ? 'کیا آپ واقعی سٹون ایکسپرٹ ایپ سے باہر نکلنا چاہتے ہیں؟' 
                : 'Are you sure you want to close the Stone Expert application?'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
            <Button
              variant="outline"
              onClick={() => setIsExitDialogOpen(false)}
              className="sm:flex-1 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              {language === 'ur' ? 'نہیں، جاری رکھیں' : 'No, Stay'}
            </Button>
            <Button
              onClick={handleConfirmExit}
              className="sm:flex-1 bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
            >
              {language === 'ur' ? 'جی ہاں، بند کریں' : 'Yes, Exit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Elegant Goodbye / Exit Screen */}
      {isExited && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6 px-4 max-w-md"
          >
            <div className="relative h-20 w-20 mx-auto bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-[#dfb96c] shadow-[0_0_20px_rgba(223,185,108,0.15)]">
              <Sparkles className="h-10 w-10 text-[#dfb96c] animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline text-2xl font-bold text-[#dfb96c]">
                {language === 'ur' ? 'اللہ حافظ!' : 'Thank You for Visiting!'}
              </h3>
              <p className="text-sm text-slate-300">
                {language === 'ur' 
                  ? 'آپ سٹون ایکسپرٹ ایپ سے کامیابی کے ساتھ باہر نکل چکے ہیں۔ اب آپ یہ ٹیب بند کر سکتے ہیں۔' 
                  : 'You have safely exited the Stone Expert application. You can now close this browser tab or window.'}
              </p>
            </div>
            <Button
              onClick={() => {
                setIsExited(false);
                // push state again to reset back gesture blocker
                if (typeof window !== 'undefined') {
                  window.history.pushState(window.history.state, '', window.location.href);
                }
              }}
              variant="outline"
              className="mt-4 border-[#dfb96c]/40 text-[#dfb96c] hover:bg-[#dfb96c]/10"
            >
              {language === 'ur' ? 'دوباره کھولیں' : 'Reopen Application'}
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}


function CardSkeleton() {
    return (
        <div className="flex flex-col space-y-3">
            <Skeleton className="h-[225px] w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
             <Skeleton className="h-10 w-full" />
        </div>
    )
}
