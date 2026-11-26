import 'dotenv/config';
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node:url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  Modality,
  Type,
  type FunctionDeclaration,
  type LiveServerMessage,
} from '@google/genai';

interface CatalogVariant {
  id: string;
  size: string;
  thickness: string;
  price: number;
}

interface CatalogMarble {
  id: string;
  name: string;
  materialType: string;
  category?: string;
  origin?: string;
  uses?: string;
  characteristics?: string;
  description?: string;
  imageUrl?: string;
  stockStatus?: string;
  onSale?: boolean;
  discount?: number;
  isHidden?: boolean;
  variants?: CatalogVariant[];
}

interface CatalogFixing {
  id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  description?: string;
  stockStatus?: string;
  isHidden?: boolean;
  onSale?: boolean;
  discount?: number;
  imageUrl?: string;
}

interface CatalogServiceProvider {
  id: string;
  name: string;
  service: string;
  phone: string;
  status?: string;
  rating?: number;
  jobs?: Array<{ id?: string; title: string; price: number; unit: string }>;
}

interface CatalogRepresentative {
  id: string;
  nameEn: string;
  nameUr?: string;
  phone: string;
  whatsapp?: string;
  regionEn: string;
  regionUr?: string;
  cities?: string[];
  designationEn?: string;
  officeAddressEn?: string;
  isActive?: boolean;
}

interface CatalogPartnerCompany {
  id: string;
  nameEn: string;
  nameUr?: string;
  descriptionEn?: string;
  isWorkingWith?: boolean;
  websiteUrl?: string;
}

interface QuotationItemSummary {
  name: string;
  type: string;
  total: number;
}

interface FullAppSnapshot {
  marbles: CatalogMarble[];
  fixingMaterials: CatalogFixing[];
  serviceProviders: CatalogServiceProvider[];
  representatives: CatalogRepresentative[];
  partnerCompanies: CatalogPartnerCompany[];
  costsConfig: Record<string, any>;
  businessConfig: Record<string, any>;
  buildYourHome?: Record<string, any>;
  renovation?: Record<string, any>;
  quotationItems: QuotationItemSummary[];
  quotationTotalPKR: number;
  activeProduct?: { id: string; name?: string } | null;
}

interface AdminOrderSummary {
  id: string;
  customerName: string;
  customerPhone?: string;
  marbleName: string;
  quantity?: number;
  totalPrice: number;
  status: string;
  date: string;
}

interface AdminStateSnapshot {
  orders: AdminOrderSummary[];
  marbles: CatalogMarble[];
  fixingMaterials: CatalogFixing[];
  suppliers: any[];
  proposals: any[];
  rateRequests: any[];
  partnerApplications: any[];
  serviceProviders: CatalogServiceProvider[];
  representatives: CatalogRepresentative[];
  missedSearches: string[];
  buildRatesSummary?: Record<string, any>;
  dailyRates?: Record<string, any>;
  currentAdminPath: string;
}

function toSeoThumbUrl(rawUrl: string | undefined, name: string, id: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return `https://placehold.co/600x400?text=${encodeURIComponent(`Stone Expert - ${name}`)}`;
  }
  if (trimmed.startsWith('data:') || trimmed.includes('/api/stone-image/stone-expert-')) {
    return trimmed;
  }
  const slug =
    (name || 'marble')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'marble';
  const params = new URLSearchParams({ id });
  if (trimmed.startsWith('http') || trimmed.startsWith('/images/')) {
    params.set('src', trimmed);
  }
  return `/api/stone-image/stone-expert-${slug}.jpg?${params.toString()}`;
}

function readJsonSafe<T>(relPath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Server] Failed loading ${relPath}:`, err);
    return fallback;
  }
}

function loadFallbackAppSnapshot(): { app: FullAppSnapshot; orders: AdminOrderSummary[] } {
  const marbles = readJsonSafe<CatalogMarble[]>('src/lib/marbles-data.json', []);
  const fixingMaterials = readJsonSafe<CatalogFixing[]>('src/lib/fixing-materials-data.json', []);
  const serviceProviders = readJsonSafe<CatalogServiceProvider[]>(
    'src/lib/service-providers-data.json',
    []
  );
  const businessConfig = readJsonSafe<Record<string, any>>('src/lib/config.json', {});
  const costsConfig = readJsonSafe<Record<string, any>>('src/lib/costs.json', {});
  const orders = readJsonSafe<AdminOrderSummary[]>('src/lib/orders-data.json', []);

  const defaultReps: CatalogRepresentative[] = [
    {
      id: 'rep-fayyaz-hussain-dha2',
      nameEn: 'Fayyaz Hussain',
      nameUr: 'فیاض حسین',
      phone: '0303-5190554',
      whatsapp: '923035190554',
      regionEn: 'Islamabad DHA Phase 2 & Surrounding Areas',
      regionUr: 'اسلام آباد ڈی ایچ اے ٹو اور اس کے آس پاس کے علاقے',
      cities: ['Islamabad', 'DHA Phase 2', 'Potohar Road I-9/3', 'Bahria Town', 'Rawalpindi'],
      designationEn: 'Regional Representative & Coordinator (DHA 2)',
      officeAddressEn: 'Plot # 375-A, Potohar Road, I-9/3, Islamabad',
      isActive: true,
    },
  ];

  const defaultPartners: CatalogPartnerCompany[] = [
    {
      id: 'partner_pak_royal',
      nameEn: 'Pak Royal Marbles',
      nameUr: 'پاک رائل ماربلز',
      descriptionEn: 'Premium Ziarat White & Badal Grey marble quarry processors.',
      isWorkingWith: true,
    },
    {
      id: 'partner_topsun_stone',
      nameEn: 'Topsun Stone Industries',
      nameUr: 'ٹاپ سن اسٹون انڈسٹریز',
      descriptionEn: 'Official distributor for imported Italian Granite, Onyx, and quartz.',
      isWorkingWith: true,
    },
    {
      id: 'partner_national_granite',
      nameEn: 'National Granite & Marble',
      nameUr: 'نیشنل گرینائٹ اینڈ ماربل',
      descriptionEn: 'Heavy duty commercial black granite slab cutting & edge profiling.',
      isWorkingWith: true,
    },
  ];

  return {
    app: {
      marbles: Array.isArray(marbles) ? marbles : [],
      fixingMaterials: Array.isArray(fixingMaterials) ? fixingMaterials : [],
      serviceProviders: Array.isArray(serviceProviders) ? serviceProviders : [],
      representatives: defaultReps,
      partnerCompanies: defaultPartners,
      costsConfig,
      businessConfig,
      quotationItems: [],
      quotationTotalPKR: 0,
      activeProduct: null,
    },
    orders: Array.isArray(orders) ? orders : [],
  };
}

function buildFullAppSummary(snapshot: FullAppSnapshot): string {
  const visibleMarbles = (snapshot.marbles || []).filter((m) => !m.isHidden);
  const visibleFixings = (snapshot.fixingMaterials || []).filter((f) => !f.isHidden);
  const activeProviders = (snapshot.serviceProviders || []).filter(
    (p) => !p.status || p.status === 'active'
  );
  const activeReps = (snapshot.representatives || []).filter((r) => r.isActive !== false);
  const activePartners = (snapshot.partnerCompanies || []).filter((p) => p.isWorkingWith !== false);

  const byCategory: Record<string, string[]> = {};
  for (const m of visibleMarbles) {
    const catKey = m.category || m.materialType || 'Marble';
    if (!byCategory[catKey]) byCategory[catKey] = [];
    const prices = (m.variants || []).map((v) => Number(v.price) || 0).filter((p) => p > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    const priceLabel = minP === maxP ? `Rs.${minP}` : `Rs.${minP}-${maxP}`;
    const saleTag = m.onSale ? ` [SALE ${m.discount || 0}%]` : '';
    const stockTag =
      m.stockStatus && m.stockStatus !== 'in_stock' ? ` [${m.stockStatus}]` : '';
    byCategory[catKey].push(`${m.name}(id:${m.id},${m.origin || 'Local'},${priceLabel}${saleTag}${stockTag})`);
  }

  const categoryLines = Object.entries(byCategory)
    .map(([cat, list]) => `- ${cat} (${list.length}): ${list.join(', ')}`)
    .join('\n');

  const fixingsLine = visibleFixings
    .map(
      (f) =>
        `${f.name}(id:${f.id},${f.category},Rs.${f.price}/${f.unit || 'unit'}${f.onSale ? ' SALE' : ''})`
    )
    .join(', ');

  const providersLine = activeProviders
    .map((p) => {
      const jobsStr = (p.jobs || [])
        .map((j) => `${j.title}:Rs.${j.price}/${j.unit}`)
        .join('; ');
      return `${p.name} [${p.service}, Ph:${p.phone}${jobsStr ? `, Rates: ${jobsStr}` : ''}]`;
    })
    .join(' | ');

  const repsLine = activeReps
    .map(
      (r) =>
        `${r.nameEn}/${r.nameUr || ''} (${r.regionEn}, Ph:${r.phone}, Cities:${(r.cities || []).join('/')})`
    )
    .join(' | ');

  const partnersLine = activePartners.map((p) => p.nameEn).join(', ');

  const costs = snapshot.costsConfig || {};
  const edge = costs.edgeProfilePrices || {};
  const cfg = snapshot.businessConfig || {};
  const branches = Array.isArray(cfg.cardAddresses)
    ? cfg.cardAddresses.map((b: any) => `${b.title}: ${b.address}`).join(' | ')
    : cfg.address || 'Plot # 375-A, Potohar Road, I-9/3, Islamabad';

  return `
COMPLETE LIVE PORTAL INVENTORY & CAPABILITIES (100% VISIBILITY):
- Total Visible Stones (${visibleMarbles.length}):
${categoryLines || 'None'}

- Fixing Chemicals, Adhesives, Tools & Abrasives (${visibleFixings.length}):
${fixingsLine || 'None'}

- Active Service Providers / Fixers / Polishers / Suzuki Transport (${activeProviders.length}):
${providersLine || 'None'}

- Regional Representatives (${activeReps.length}):
${repsLine || 'None'}

- Partner Marble Companies: ${partnersLine || 'Pak Royal Marbles, Topsun Stone, National Granite'}

- Fabrication, Cutting, Wastage & Delivery Rules:
  Sink Cut: Rs.${costs.sinkCutCost || 3000}, Stove Cut: Rs.${costs.stoveCutCost || 3000}, Inner Cut: Rs.${costs.innerCutRft || 30}/rft, Wastage: ${costs.wastagePercentage || 15}%, Delivery: Rs.${costs.deliveryCostPerTrip || 5000} per ${costs.sqftPerDeliveryTrip || 200} sqft.
  Edge Profiles (PKR/rft): Tukker Rs.${edge.tukker || 60}, Half-Gola Rs.${edge.halfGola || 90}, Full-Gola Rs.${edge.gola || 120}, Diamond Rs.${edge.diamond || 150}, Litac Simple Rs.${edge.litacSimple || 250}, Litac Groove Rs.${edge.litacGroove || 300}.

- Branches & Contacts:
  CEO: ${cfg.ceoName || 'Fida Hussain'} (${cfg.ceoPhone || '0300-3634052'}), WhatsApp: ${cfg.businessWhatsAppNumber || '923003634052'}
  Offices: ${branches}

- ALL App Pages & Tools (use navigate_to_page or get_app_overview):
  1. Home & Category Grids: / (Local Marble, Imported Marble, Local Granite, Imported Granite, Marble Tiles, Corian, Facade Stone, MDM Material, Artificial Stone, Limestone, Inlay, Antique, Vanity, Sale & Discount)
  2. Full Catalog / Chemicals & Tools / Service Providers: /products, /products?tab=tool_chemical, /products?tab=business
  3. Dedicated Services Page (Fixers, Polishers, Suzuki): /services
  4. Regional Representatives & Site Visit Booking: /representatives
  5. AI Stone Specialist & Visualizer: /expert/[id]
  6. 7 Calculators: Simple Area, Multi-Room Floor, Kitchen Counter, Bathroom Vanity, Staircase (AutoCAD), Window Sill, Fixing & Polish Labor
  7. Material Cost Comparison & 1-Click Swap: /order/[id]/compare
  8. Build Your Home Cost Estimator: /build-your-home
  9. Home Renovation Services: /renovation
  10. Completed Projects Portfolio: /our-work
  11. Live Order Tracking: /track-order
  12. Company Brochure & Printable Rate List: /brochure & /brochure?type=price-list
  13. Contact & Factory Map: /contact
`.trim();
}

function searchCatalog(snapshot: FullAppSnapshot, query?: string, category?: string) {
  const q = (query || '').trim().toLowerCase();
  const cat = (category || '').trim().toLowerCase();

  const visibleMarbles = (snapshot.marbles || []).filter((m) => !m.isHidden);
  const matchedMarbles = visibleMarbles
    .filter((m) => {
      const mType = (m.materialType || '').toLowerCase();
      const mCat = (m.category || '').toLowerCase();
      const mOrigin = (m.origin || '').toLowerCase();
      const mName = (m.name || '').toLowerCase();
      const mUses = (m.uses || '').toLowerCase();
      const mDesc = (m.description || '').toLowerCase();

      const catMatch =
        !cat ||
        cat === 'all' ||
        mType.includes(cat) ||
        mCat.includes(cat) ||
        (cat === 'local marble' && mType.includes('marble') && mOrigin === 'local') ||
        (cat === 'imported marble' && mType.includes('marble') && mOrigin === 'imported') ||
        (cat === 'local granite' && mType.includes('granite') && mOrigin === 'local') ||
        (cat === 'imported granite' && mType.includes('granite') && mOrigin === 'imported') ||
        (cat === 'sale' && Boolean(m.onSale));

      const queryMatch =
        !q ||
        mName.includes(q) ||
        mType.includes(q) ||
        mCat.includes(q) ||
        mOrigin.includes(q) ||
        mUses.includes(q) ||
        mDesc.includes(q);

      return catMatch && queryMatch;
    })
    .slice(0, 15)
    .map((m) => {
      const prices = (m.variants || []).map((v) => Number(v.price) || 0).filter((p) => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      return {
        id: m.id,
        name: m.name,
        materialType: m.materialType,
        category: m.category || m.materialType,
        origin: m.origin || 'Local',
        uses: m.uses || '',
        imageUrl: toSeoThumbUrl(m.imageUrl, m.name, m.id),
        minPricePKR: minPrice,
        stockStatus: m.stockStatus || 'in_stock',
        onSale: Boolean(m.onSale),
        discountPercent: m.discount || 0,
        priceRangePKR:
          minPrice === maxPrice ? `Rs. ${minPrice}/sqft` : `Rs. ${minPrice}-${maxPrice}/sqft`,
        variants: (m.variants || []).slice(0, 6).map((v) => ({
          id: v.id,
          size: v.size,
          thickness: v.thickness,
          pricePerSqFt: v.price,
        })),
      };
    });

  const isChemicalCategory =
    !cat ||
    cat === 'all' ||
    cat.includes('fix') ||
    cat.includes('chem') ||
    cat.includes('tool') ||
    cat.includes('polish') ||
    cat.includes('adhes') ||
    cat.includes('abras');

  const matchedFixings = (snapshot.fixingMaterials || [])
    .filter((f) => !f.isHidden)
    .filter((f) => {
      const fName = (f.name || '').toLowerCase();
      const fCat = (f.category || '').toLowerCase();
      const fDesc = (f.description || '').toLowerCase();
      if (!isChemicalCategory && !q) return false;
      if (!q) return true;
      return fName.includes(q) || fCat.includes(q) || fDesc.includes(q);
    })
    .slice(0, 12)
    .map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      pricePKR: f.price,
      unit: f.unit || 'unit',
      stockStatus: f.stockStatus || 'in_stock',
      onSale: Boolean(f.onSale),
    }));

  const isServiceCategory =
    cat.includes('serv') ||
    cat.includes('fix') ||
    cat.includes('polish') ||
    cat.includes('labor') ||
    cat.includes('driver') ||
    cat.includes('suzuki') ||
    Boolean(q);

  const matchedProviders = isServiceCategory
    ? (snapshot.serviceProviders || [])
        .filter((p) => !p.status || p.status === 'active')
        .filter((p) => {
          if (!q) return cat.includes('serv') || cat.includes('polish') || cat.includes('suzuki') || cat.includes('labor');
          const jobsText = (p.jobs || []).map((j) => j.title).join(' ').toLowerCase();
          return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.service || '').toLowerCase().includes(q) ||
            jobsText.includes(q) ||
            q.includes('fixer') ||
            q.includes('polish') ||
            q.includes('karigar') ||
            q.includes('suzuki') ||
            q.includes('labor') ||
            q.includes('کاریگر') ||
            q.includes('مزدور')
          );
        })
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          name: p.name,
          service: p.service,
          phone: p.phone,
          rating: p.rating || 5,
          jobs: (p.jobs || []).map((j) => ({
            title: j.title,
            pricePKR: j.price,
            unit: j.unit,
          })),
        }))
    : [];

  const matchedReps = (snapshot.representatives || [])
    .filter((r) => r.isActive !== false)
    .filter((r) => {
      if (!q && !cat.includes('rep')) return false;
      if (cat.includes('rep')) return true;
      const hay = `${r.nameEn} ${r.nameUr || ''} ${r.regionEn} ${(r.cities || []).join(' ')}`.toLowerCase();
      return (
        hay.includes(q) ||
        q.includes('rep') ||
        q.includes('dha') ||
        q.includes('islamabad') ||
        q.includes('rawalpindi') ||
        q.includes('نمائند') ||
        q.includes('visit')
      );
    })
    .map((r) => ({
      id: r.id,
      nameEn: r.nameEn,
      nameUr: r.nameUr || '',
      phone: r.phone,
      regionEn: r.regionEn,
      cities: r.cities || [],
    }));

  return {
    totalMarblesMatched: matchedMarbles.length,
    marbles: matchedMarbles,
    fixingMaterialsAndChemicals: matchedFixings,
    serviceProviders: matchedProviders,
    representatives: matchedReps,
  };
}

function getAppOverview(snapshot: FullAppSnapshot, scope: string) {
  const s = (scope || 'all').toLowerCase();
  const visibleMarbles = (snapshot.marbles || []).filter((m) => !m.isHidden);
  const visibleFixings = (snapshot.fixingMaterials || []).filter((f) => !f.isHidden);
  const activeProviders = (snapshot.serviceProviders || []).filter(
    (p) => !p.status || p.status === 'active'
  );
  const activeReps = (snapshot.representatives || []).filter((r) => r.isActive !== false);
  const activePartners = (snapshot.partnerCompanies || []).filter((p) => p.isWorkingWith !== false);

  const categoryStats: Record<string, { count: number; minPKR: number; maxPKR: number }> = {};
  for (const m of visibleMarbles) {
    const key = m.category || m.materialType || 'Marble';
    if (!categoryStats[key]) {
      categoryStats[key] = { count: 0, minPKR: Infinity, maxPKR: 0 };
    }
    categoryStats[key].count += 1;
    for (const v of m.variants || []) {
      const p = Number(v.price) || 0;
      if (p > 0) {
        categoryStats[key].minPKR = Math.min(categoryStats[key].minPKR, p);
        categoryStats[key].maxPKR = Math.max(categoryStats[key].maxPKR, p);
      }
    }
  }
  const categories = Object.entries(categoryStats).map(([name, st]) => ({
    category: name,
    count: st.count,
    minPKR: st.minPKR === Infinity ? 0 : st.minPKR,
    maxPKR: st.maxPKR,
  }));

  const payload: Record<string, any> = {
    scope: s,
    totalVisibleStones: visibleMarbles.length,
    onSaleStonesCount: visibleMarbles.filter((m) => m.onSale).length,
    totalFixingChemicalsAndTools: visibleFixings.length,
    activeServiceProvidersCount: activeProviders.length,
    activeRepresentativesCount: activeReps.length,
  };

  if (s === 'all' || s === 'categories') {
    payload.categories = categories;
  }
  if (s === 'all' || s === 'chemicals_tools') {
    payload.fixingMaterialsAndTools = visibleFixings.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      pricePKR: f.price,
      unit: f.unit,
      stockStatus: f.stockStatus || 'in_stock',
    }));
  }
  if (s === 'all' || s === 'services_fixers') {
    payload.serviceProviders = activeProviders.map((p) => ({
      id: p.id,
      name: p.name,
      service: p.service,
      phone: p.phone,
      jobs: p.jobs || [],
    }));
  }
  if (s === 'all' || s === 'representatives') {
    payload.representatives = activeReps;
  }
  if (s === 'all' || s === 'partners') {
    payload.partnerCompanies = activePartners;
  }
  if (s === 'all' || s === 'pricing_rules') {
    payload.costsConfig = snapshot.costsConfig;
  }
  if (s === 'all' || s === 'build_renovation') {
    payload.buildYourHome = snapshot.buildYourHome || {
      baseCostPerSqFt: 120,
      note: 'Covers Grey Structure, Flooring, Electrical, Plumbing, Interior Painting & Fabrication estimates.',
    };
    payload.renovation = snapshot.renovation || {
      note: 'Includes Flooring Replacement, Kitchen Counter Remodel, Bathroom Vanity Upgrade, Wall Cladding & Chemical Polishing.',
    };
  }
  if (s === 'all' || s === 'branches_contact') {
    payload.businessConfig = snapshot.businessConfig;
  }
  if (s === 'all' || s === 'pages') {
    payload.pages = [
      'Home & Live Categories (/)',
      'Full Product Catalog (/products)',
      'Tools & Fixing Chemicals (/products?tab=tool_chemical)',
      'Service Providers & Fixers (/services and /products?tab=business)',
      'Regional Representatives & Site Visits (/representatives)',
      'AI Stone Expert & Visualizer (/expert/[id])',
      '7 Calculators (/order/[id]?calc=simple|floor|kitchen|vanity|stairs|window-sill|labor_quote)',
      'Material Price Comparison (/order/[id]/compare)',
      'Build Your Home Estimator (/build-your-home)',
      'Home Renovation Services (/renovation)',
      'Our Completed Projects (/our-work)',
      'Order Tracking (/track-order)',
      'Company Brochure & Price List (/brochure)',
      'Contact & Factory Map (/contact)',
    ];
  }

  return payload;
}

function compareCatalogMaterials(
  snapshot: FullAppSnapshot,
  materialNames: string[],
  areaSqFt?: number
) {
  const visibleMarbles = (snapshot.marbles || []).filter((m) => !m.isHidden);
  const effectiveArea = areaSqFt && areaSqFt > 0 ? areaSqFt : 100;

  const items: Array<{
    id: string;
    name: string;
    materialType: string;
    origin: string;
    ratePerSqFt: number;
    variantLabel: string;
    estimatedTotalPKR: number;
    uses: string;
  }> = [];

  for (const rawQuery of materialNames || []) {
    const q = String(rawQuery || '').trim().toLowerCase();
    if (!q) continue;
    const found =
      visibleMarbles.find((m) => m.name.toLowerCase() === q) ||
      visibleMarbles.find((m) => m.name.toLowerCase().includes(q)) ||
      visibleMarbles.find((m) => q.includes(m.name.toLowerCase())) ||
      visibleMarbles.find(
        (m) =>
          (m.materialType || '').toLowerCase().includes(q) ||
          (m.category || '').toLowerCase().includes(q)
      );

    if (found && !items.some((x) => x.id === found.id)) {
      const firstVariant = (found.variants || [])[0];
      const rate = Number(firstVariant?.price) || 0;
      items.push({
        id: found.id,
        name: found.name,
        materialType: found.materialType,
        origin: found.origin || 'Local',
        ratePerSqFt: rate,
        variantLabel: firstVariant ? `${firstVariant.size} (${firstVariant.thickness})` : 'Standard',
        estimatedTotalPKR: Math.round(rate * effectiveArea),
        uses: found.uses || 'Flooring, Stairs & Counters',
      });
    }
  }

  if (items.length === 1) {
    const alt = visibleMarbles.find((m) => m.id !== items[0].id && (m.variants || []).length > 0);
    if (alt) {
      const v = alt.variants![0];
      items.push({
        id: alt.id,
        name: alt.name,
        materialType: alt.materialType,
        origin: alt.origin || 'Local',
        ratePerSqFt: Number(v.price) || 0,
        variantLabel: `${v.size} (${v.thickness})`,
        estimatedTotalPKR: Math.round((Number(v.price) || 0) * effectiveArea),
        uses: alt.uses || 'Flooring, Stairs & Counters',
      });
    }
  }

  return {
    areaSqFt: effectiveArea,
    items: [...items].sort((a, b) => a.ratePerSqFt - b.ratePerSqFt),
  };
}

function resolveRoute(
  routeKey: string,
  snapshot: FullAppSnapshot,
  marbleId?: string,
  searchQuery?: string,
  displayMode?: 'full_view' | 'scroll_to_row',
  openLightbox?: boolean
) {
  const visibleMarbles = (snapshot.marbles || []).filter((m) => !m.isHidden);
  let matchedMarble: CatalogMarble | undefined;

  if (marbleId?.trim()) {
    const cleanId = marbleId.trim().toLowerCase();
    matchedMarble = visibleMarbles.find((m) => m.id.toLowerCase() === cleanId);
  }
  if (!matchedMarble && searchQuery?.trim()) {
    const q = searchQuery.trim().toLowerCase();
    matchedMarble =
      visibleMarbles.find((m) => m.name.toLowerCase() === q) ||
      visibleMarbles.find((m) => m.name.toLowerCase().includes(q));
  }

  const resolvedMarbleId =
    matchedMarble?.id || marbleId?.trim() || visibleMarbles[0]?.id || 'ziarat-white';
  const qParam = searchQuery && searchQuery.trim() ? encodeURIComponent(searchQuery.trim()) : '';

  const categoryKeyMap: Record<string, { cat: string; labelUr: string; labelEn: string }> = {
    marble: { cat: 'Local Marble', labelUr: 'لوکل ماربل کلیکشن', labelEn: 'Local Marble Collection' },
    local_marble: { cat: 'Local Marble', labelUr: 'لوکل ماربل کلیکشن', labelEn: 'Local Marble Collection' },
    imported_marble: { cat: 'Imported Marble', labelUr: 'امپورٹڈ ماربل کلیکشن', labelEn: 'Imported Marble Collection' },
    granite: { cat: 'Local Granite', labelUr: 'لوکل گرینائٹ کلیکشن', labelEn: 'Local Granite Collection' },
    local_granite: { cat: 'Local Granite', labelUr: 'لوکل گرینائٹ کلیکشن', labelEn: 'Local Granite Collection' },
    imported_granite: { cat: 'Imported Granite', labelUr: 'امپورٹڈ گرینائٹ کلیکشن', labelEn: 'Imported Granite Collection' },
    tiles: { cat: 'Marble Tiles', labelUr: 'ماربل ٹائلز (12×24)', labelEn: 'Marble Tiles Collection' },
    corian: { cat: 'Corian', labelUr: 'کوریان اور مصنوعی پتھر', labelEn: 'Corian & Artificial Stone' },
    facade: { cat: 'Facade Stone', labelUr: 'فیساڈ اور ایلیویشن اسٹون', labelEn: 'Facade Stone Collection' },
    mdm: { cat: 'MDM Material', labelUr: 'ایم ڈی ایم مٹیریل', labelEn: 'MDM Material Collection' },
    artificial_stone: { cat: 'Artificial Stone', labelUr: 'مصنوعی پتھر', labelEn: 'Artificial Stone' },
    limestone: { cat: 'Limestone', labelUr: 'لائم اسٹون کلیکشن', labelEn: 'Limestone Collection' },
    inlay: { cat: 'Inlay', labelUr: 'ان لے اور بارڈر ڈیزائن', labelEn: 'Inlay & Borders' },
    antique: { cat: 'Antique', labelUr: 'اینٹیک اسٹون', labelEn: 'Antique Stone' },
    vanity: { cat: 'Vanity', labelUr: 'ریڈی میڈ وینٹی', labelEn: 'Vanity Collection' },
    sale: { cat: 'Sale & Discount', labelUr: 'سیل اور خصوصی ڈسکاؤنٹ', labelEn: 'Sale & Discount Deals' },
  };

  if (
    routeKey === 'product_detail' ||
    (matchedMarble && (Boolean(marbleId?.trim()) || routeKey === 'home' || routeKey === 'marble' || routeKey === 'granite'))
  ) {
    const stoneName = matchedMarble?.name || searchQuery?.trim() || resolvedMarbleId;
    return {
      url: `/product-detail/${encodeURIComponent(resolvedMarbleId)}${openLightbox ? '?lightbox=1' : ''}`,
      labelUr: `${stoneName} — مکمل صفحہ و تصویر`,
      labelEn: `${stoneName} — Full Details & Photo`,
      guideTopic: 'catalog',
      scrollTarget: undefined as string | undefined,
      focusCategory: undefined as string | undefined,
      shouldMinimizeDrawer: true,
    };
  }

  if (categoryKeyMap[routeKey]) {
    const info = categoryKeyMap[routeKey];
    const isScrollRow = displayMode === 'scroll_to_row';
    const catSlug = info.cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const url = isScrollRow
      ? `/?focusCategory=${encodeURIComponent(info.cat)}`
      : `/?material=${encodeURIComponent(info.cat)}&fullview=1${qParam ? `&q=${qParam}` : ''}#products-showcase`;
    return {
      url,
      labelUr: info.labelUr,
      labelEn: info.labelEn,
      guideTopic: 'catalog',
      scrollTarget: isScrollRow ? `category-${catSlug}` : 'products-showcase',
      focusCategory: info.cat,
      shouldMinimizeDrawer: true,
    };
  }

  const routeMap: Record<
    string,
    { url: string; labelUr: string; labelEn: string; guideTopic: string; scrollTarget?: string; focusCategory?: string; shouldMinimizeDrawer?: boolean }
  > = {
    home: {
      url: qParam ? `/?q=${qParam}#products-showcase` : '/',
      labelUr: 'ہوم پیج اور لائیو ریٹس',
      labelEn: 'Home & Live Rates',
      guideTopic: 'catalog',
      scrollTarget: qParam ? 'products-showcase' : undefined,
      shouldMinimizeDrawer: Boolean(qParam),
    },
    products: {
      url: '/products',
      labelUr: 'مکمل پروڈکٹ کیٹلاگ',
      labelEn: 'Full Product Catalog',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    chemicals: {
      url: '/products?tab=tool_chemical',
      labelUr: 'فکسنگ کیمیکلز، بونڈ اور ٹولز',
      labelEn: 'Fixing Chemicals & Tools',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    services: {
      url: '/services',
      labelUr: 'فکسنگ، پالشنگ اور ٹرانسپورٹ سروسز',
      labelEn: 'Fixing, Polishing & Transport Services',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    service_providers: {
      url: '/products?tab=business',
      labelUr: 'ماہر فکسرز اور پالشرز ڈائریکٹری',
      labelEn: 'Fixers & Polishers Directory',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    representatives: {
      url: '/representatives',
      labelUr: 'علاقائی نمائندے اور سائٹ وزٹ بکنگ',
      labelEn: 'Regional Representatives & Site Visits',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    expert: {
      url: `/expert/${encodeURIComponent(resolvedMarbleId)}`,
      labelUr: 'اسٹون ایکسپرٹ اے آئی ویژولائزر',
      labelEn: 'AI Stone Expert & Visualizer',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    calculator_simple: {
      url: `/order/${resolvedMarbleId}?calc=simple`,
      labelUr: 'سادہ فرش کیلکولیٹر',
      labelEn: 'Simple Area Calculator',
      guideTopic: 'simple',
      shouldMinimizeDrawer: true,
    },
    calculator_floor: {
      url: `/order/${resolvedMarbleId}?calc=floor`,
      labelUr: 'ملٹی روم فلور ڈیزائنر',
      labelEn: 'Multi-Room Floor Designer',
      guideTopic: 'floor',
      shouldMinimizeDrawer: true,
    },
    calculator_kitchen: {
      url: `/order/${resolvedMarbleId}?calc=kitchen`,
      labelUr: 'کچن کاؤنٹر کیلکولیٹر',
      labelEn: 'Kitchen Counter Calculator',
      guideTopic: 'kitchen',
      shouldMinimizeDrawer: true,
    },
    calculator_vanity: {
      url: `/order/${resolvedMarbleId}?calc=vanity`,
      labelUr: 'باتھ روم وینٹی ڈیزائنر',
      labelEn: 'Bathroom Vanity Designer',
      guideTopic: 'vanity',
      shouldMinimizeDrawer: true,
    },
    calculator_stairs: {
      url: `/order/${resolvedMarbleId}?calc=stairs`,
      labelUr: 'سیڑھیوں کا کیلکولیٹر (AutoCAD View)',
      labelEn: 'Staircase Designer',
      guideTopic: 'stairs',
      shouldMinimizeDrawer: true,
    },
    calculator_window: {
      url: `/order/${resolvedMarbleId}?calc=window-sill`,
      labelUr: 'کھڑکی سِل کیلکولیٹر',
      labelEn: 'Window Sill Calculator',
      guideTopic: 'window-sill',
      shouldMinimizeDrawer: true,
    },
    calculator_labor: {
      url: `/order/${resolvedMarbleId}?calc=labor_quote`,
      labelUr: 'فکسنگ اور پالش لیبر کیلکولیٹر',
      labelEn: 'Fixing & Polishing Labor Calculator',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    compare: {
      url: `/order/${resolvedMarbleId}/compare`,
      labelUr: 'تمام مواد اور قیمتوں کا موازنہ',
      labelEn: 'Material Cost Comparison',
      guideTopic: 'compare',
      shouldMinimizeDrawer: true,
    },
    build_your_home: {
      url: '/build-your-home',
      labelUr: 'اپنا گھر بنائیں / تعمیراتی تخمینہ',
      labelEn: 'Build Your Home Estimator',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    renovation: {
      url: '/renovation',
      labelUr: 'ہوم رینوویشن سروسز',
      labelEn: 'Renovation Services',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    our_work: {
      url: '/our-work',
      labelUr: 'ہمارے مکمل پروجیکٹس',
      labelEn: 'Our Work Portfolio',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    track_order: {
      url: '/track-order',
      labelUr: 'آرڈر ٹریکنگ',
      labelEn: 'Track Order',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    contact: {
      url: '/contact',
      labelUr: 'رابطہ اور فیکٹری لوکیشن',
      labelEn: 'Contact & Factory Address',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    brochure: {
      url: '/brochure',
      labelUr: 'کمپنی بروشر اور ریٹ لسٹ',
      labelEn: 'Company Brochure',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    price_list: {
      url: '/brochure?type=price-list',
      labelUr: 'پرنٹ ایبل ریٹ لسٹ',
      labelEn: 'Printable Price List',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    privacy: {
      url: '/privacy',
      labelUr: 'پرائیویسی پالیسی',
      labelEn: 'Privacy Policy',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
    terms: {
      url: '/terms',
      labelUr: 'شرائط و ضوابط',
      labelEn: 'Terms & Conditions',
      guideTopic: 'catalog',
      shouldMinimizeDrawer: true,
    },
  };

  return routeMap[routeKey] || routeMap.home;
}

function resolveAdminRoute(routeKey: string) {
  const routes: Record<string, { url: string; labelUr: string; labelEn: string }> = {
    dashboard: { url: '/dashboard', labelUr: 'ایڈمن ڈیش بورڈ ہوم', labelEn: 'Admin Dashboard' },
    orders: { url: '/dashboard/orders', labelUr: 'کسٹمر آرڈرز مینجمنٹ', labelEn: 'Customer Orders' },
    manage_stock: { url: '/dashboard/manage-stock', labelUr: 'اسٹاک اور سپلائر ریٹ لسٹ', labelEn: 'Manage Stock & Suppliers' },
    manage_products: { url: '/dashboard/manage-products', labelUr: 'پروڈکٹس، قیمتیں و تصاویر', labelEn: 'Manage Products' },
    manual_orders: { url: '/dashboard/manual-orders', labelUr: 'کٹنگ آپٹیمائزر و مینول آرڈر', labelEn: 'Cutting Optimizer & Manual Orders' },
    ai_assistant: { url: '/dashboard/ai-assistant', labelUr: 'اے آئی آپریشنز مینیجر', labelEn: 'AI Operations Manager' },
    service_providers: { url: '/dashboard/service-providers', labelUr: 'فکسرز، پالشرز و سروسز', labelEn: 'Service Providers' },
    representatives: { url: '/dashboard/representatives', labelUr: 'علاقائی نمائندے و سائٹ وزٹس', labelEn: 'Regional Representatives' },
    partner_companies: { url: '/dashboard/partner-companies', labelUr: 'پارٹنر کمپنیاں و لوگو', labelEn: 'Partner Companies' },
    searches: { url: '/dashboard/searches', labelUr: 'کسٹمر سرچ اینالیٹکس', labelEn: 'Search Analytics' },
    build_your_home: { url: '/dashboard/build-your-home', labelUr: 'بلڈ یور ہوم ریٹس', labelEn: 'Build Your Home Rates' },
    renovation: { url: '/dashboard/renovation', labelUr: 'رینوویشن ریٹس', labelEn: 'Renovation Rates' },
    homepage: { url: '/dashboard/homepage', labelUr: 'ہوم پیج و سیل بینر کنٹرول', labelEn: 'Homepage Settings' },
    brochure: { url: '/dashboard/brochure', labelUr: 'بروشر و پرنٹ ریٹ لسٹ', labelEn: 'Brochure & Price List' },
    lampshade_studio: { url: '/dashboard/lampshade-studio', labelUr: '3D لیمپ شیڈ و لیتھو اسٹوڈیو', labelEn: '3D Lampshade Studio' },
    settings: { url: '/dashboard/settings', labelUr: 'ایپ و کاروباری سیٹنگز', labelEn: 'App Settings' },
    special_access: { url: '/dashboard/special-access', labelUr: 'اسپیشل ایکسیس و رولز', labelEn: 'Special Access' },
  };
  return routes[routeKey] || routes.dashboard;
}

const navigateToPageTool: FunctionDeclaration = {
  name: 'navigate_to_page',
  description:
    'Immediately navigates the customer browser to any requested Stone Expert page: product_detail, any category strip/grid, tools & chemicals (/products?tab=tool_chemical), services (/services), representatives (/representatives), AI expert (/expert/[id]), any calculator, comparison, build_your_home, renovation, our_work, track_order, brochure, or contact.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          'Target key: product_detail, imported_marble, local_marble, granite, imported_granite, tiles, corian, facade, mdm, artificial_stone, limestone, inlay, antique, vanity, sale, products, chemicals, services, service_providers, representatives, expert, calculator_simple, calculator_floor, calculator_kitchen, calculator_vanity, calculator_stairs, calculator_window, calculator_labor, compare, build_your_home, renovation, our_work, track_order, contact, brochure, price_list, privacy, terms, home.',
      },
      marbleId: {
        type: Type.STRING,
        description: 'Specific marble or granite ID (from catalog) to open or pre-load.',
      },
      searchQuery: {
        type: Type.STRING,
        description: 'Stone name or keyword (e.g. Ziarat White, Black & Gold, Botticino).',
      },
      displayMode: {
        type: Type.STRING,
        description:
          'For category routes: "full_view" (default) or "scroll_to_row" on homepage.',
      },
      openLightbox: {
        type: Type.BOOLEAN,
        description: 'Set true on product_detail when customer asks to view photo full-screen.',
      },
    },
    required: ['route'],
  },
};

const searchCatalogTool: FunctionDeclaration = {
  name: 'search_catalog',
  description:
    'Searches the ENTIRE Stone Expert portal: marbles, granites, tiles, Corian, facade stones, fixing chemicals/adhesives/tools, active fixers/polishers/suzuki providers, and regional representatives.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Keyword: stone name, color, chemical/tool, fixer, polisher, driver, or city.',
      },
      category: {
        type: Type.STRING,
        description:
          'Optional category: All, Local Marble, Imported Marble, Local Granite, Imported Granite, Marble Tiles, Corian, Facade Stone, MDM Material, Chemical, Tool, Adhesive, Abrasive, Service, Representative, Sale.',
      },
    },
  },
};

const getAppOverviewTool: FunctionDeclaration = {
  name: 'get_app_overview',
  description:
    'Retrieves complete live portal knowledge for any section of Stone Expert so nothing in the app is hidden: categories & PKR ranges, all chemicals/tools, all service providers & labor rates, representatives, partners, edge/cutout/delivery rules, build-your-home/renovation rates, branches, and all public pages.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      scope: {
        type: Type.STRING,
        description:
          'Section to inspect: all, categories, chemicals_tools, services_fixers, representatives, partners, pricing_rules, build_renovation, branches_contact, pages.',
      },
    },
    required: ['scope'],
  },
};

const inspectCurrentContextTool: FunctionDeclaration = {
  name: 'inspect_current_context',
  description:
    "Checks the customer's live screen path, active language, active product if any, and every item currently saved inside their Quotation Cart with PKR totals.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const compareMaterialsTool: FunctionDeclaration = {
  name: 'compare_materials',
  description:
    'Compares 2 or more marbles/granites side-by-side by price per sq.ft, origin, and estimated PKR cost for a given area, and displays a visual comparison card inside the customer drawer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      materialNames: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of 2 or more material names to compare.',
      },
      areaSqFt: {
        type: Type.NUMBER,
        description: 'Optional total square feet to estimate PKR total cost (defaults to 100 sq.ft).',
      },
      openComparePage: {
        type: Type.BOOLEAN,
        description: 'Set true to also navigate to the full Material Cost Comparison page.',
      },
    },
    required: ['materialNames'],
  },
};

const explainWorkflowTool: FunctionDeclaration = {
  name: 'explain_calculator_or_comparison',
  description:
    'Displays an on-screen step-by-step guide card for the selected calculator or portal workflow.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: 'Workflow topic: simple, floor, kitchen, vanity, stairs, window-sill, compare, catalog.',
      },
    },
    required: ['topic'],
  },
};

const switchLanguageTool: FunctionDeclaration = {
  name: 'switch_app_language',
  description: 'Switches the portal UI language between Urdu (ur) and English (en).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: {
        type: Type.STRING,
        description: 'Target language code: ur or en.',
      },
    },
    required: ['language'],
  },
};

// Admin Live Supervisor Tool Declarations
const adminGetOverviewTool: FunctionDeclaration = {
  name: 'get_admin_overview',
  description:
    'Fetches a full real-time operational briefing of the Admin Panel: total/pending/in-progress orders & PKR revenue, out-of-stock/limited-stock/hidden items, active sale items, pending supplier rate requests & applications, top missed customer searches, and active admin screen.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const adminQueryOrdersTool: FunctionDeclaration = {
  name: 'query_orders',
  description:
    'Searches and filters customer orders by status (All, Pending, In Progress, Shipped, Delivered, Canceled) or customer name/order ID/stone, and displays matching order cards to the admin.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      statusFilter: {
        type: Type.STRING,
        description: 'All, Pending, In Progress, Shipped, Delivered, or Canceled.',
      },
      query: {
        type: Type.STRING,
        description: 'Optional search keyword: customer name, phone, order ID, or marble name.',
      },
    },
  },
};

const adminQueryInventoryTool: FunctionDeclaration = {
  name: 'query_inventory',
  description:
    'Audits and searches marbles, granites, chemicals & tools by stock status or keyword (all, out_of_stock, limited_stock, incoming, on_sale, hidden, marbles, fixing_materials) and displays matched items to the admin.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filter: {
        type: Type.STRING,
        description:
          'all, out_of_stock, limited_stock, incoming, on_sale, hidden, marbles, or fixing_materials.',
      },
      query: {
        type: Type.STRING,
        description: 'Optional stone, tool, or chemical name.',
      },
    },
  },
};

const adminProposeActionTool: FunctionDeclaration = {
  name: 'propose_admin_action',
  description:
    'Proposes a database change (order status update, stock status toggle, marble/chemical price update, bulk sale discount, hide/unhide item, supplier markup sync) for Human Approval Gate confirmation before saving to Firestore.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionType: {
        type: Type.STRING,
        description:
          'One of: UPDATE_ORDER_STATUS, UPDATE_STOCK_STATUS, UPDATE_MARBLE_PRICE, UPDATE_FIXING_PRICE, APPLY_BULK_SALE, CLEAR_BULK_SALE, TOGGLE_PRODUCT_VISIBILITY, APPLY_SUPPLIER_MARKUP, UPDATE_DAILY_RATES, UPDATE_BUILD_RATES.',
      },
      title: { type: Type.STRING, description: 'Short Urdu/English confirmation card title.' },
      description: { type: Type.STRING, description: 'Clear summary of exact change.' },
      targetId: { type: Type.STRING, description: 'Exact order ID, marble ID, fixing ID, or supplier ID.' },
      targetName: { type: Type.STRING, description: 'Human-readable customer, product, or supplier name.' },
      previousValue: { type: Type.STRING, description: 'Current value before change.' },
      newValue: { type: Type.STRING, description: 'Proposed new value.' },
      badgeLabel: { type: Type.STRING, description: 'Short badge label (e.g. Order Status / Stock Update / Price Change).' },
      payloadJson: {
        type: Type.STRING,
        description:
          'JSON string matching execute endpoint schema: e.g. {"orderId":"...","status":"In Progress"} or {"itemType":"marble","itemId":"...","stockStatus":"out_of_stock"} or {"marbleId":"...","newPrice":180} or {"target":"marbles","discountPercent":15} or {"itemType":"marble","itemId":"...","isHidden":true}.',
      },
    },
    required: ['actionType', 'title', 'description', 'payloadJson'],
  },
};

const adminNavigateTool: FunctionDeclaration = {
  name: 'navigate_admin_page',
  description:
    'Navigates the Admin Panel screen immediately to the requested management section.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description:
          'Target admin page: dashboard, orders, manage_stock, manage_products, manual_orders, ai_assistant, service_providers, representatives, partner_companies, searches, build_your_home, renovation, homepage, brochure, lampshade_studio, settings, special_access.',
      },
    },
    required: ['route'],
  },
};

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

let isNextReady = false;
let nextUpgradeHandler: ReturnType<typeof nextApp.getUpgradeHandler> | null = null;
const nextReadyPromise = nextApp
  .prepare()
  .then(() => {
    nextUpgradeHandler = nextApp.getUpgradeHandler();
    isNextReady = true;
    console.log(`> Next.js prepared and ready on http://${hostname}:${port}`);
  })
  .catch((err) => {
    console.error('[Server] Failed to prepare Next.js app:', err);
    process.exit(1);
  });

const fallbackData = loadFallbackAppSnapshot();

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url || '/', true);
  if (parsedUrl.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ready: isNextReady }));
    return;
  }
  if (!isNextReady) {
    await nextReadyPromise;
  }
  handle(req, res, parsedUrl);
});

const wss = new WebSocketServer({ noServer: true });
const adminWss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const { pathname } = parse(req.url || '/', true);
  if (pathname === '/api/live-ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else if (pathname === '/api/admin-live-ws') {
    adminWss.handleUpgrade(req, socket, head, (ws) => {
      adminWss.emit('connection', ws, req);
    });
  } else {
    if (!isNextReady) {
      await nextReadyPromise;
    }
    if (nextUpgradeHandler) {
      nextUpgradeHandler(req, socket, head);
    } else {
      socket.destroy();
    }
  }
});

// ==========================================
// 1. CUSTOMER PORTAL LIVE CONCIERGE WS (/api/live-ws)
// ==========================================
wss.on('connection', async (clientWs: WebSocket) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message:
          'GEMINI_API_KEY is not configured on the server. Please set your Gemini API key in Settings > Secrets.',
      })
    );
    clientWs.close();
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const sessionSnapshot: FullAppSnapshot = {
    ...fallbackData.app,
    marbles: [...fallbackData.app.marbles],
    fixingMaterials: [...fallbackData.app.fixingMaterials],
    serviceProviders: [...fallbackData.app.serviceProviders],
    representatives: [...fallbackData.app.representatives],
    partnerCompanies: [...fallbackData.app.partnerCompanies],
    quotationItems: [],
    quotationTotalPKR: 0,
    activeProduct: null,
  };
  let currentPath = '/';
  let currentLanguage = 'ur';
  let quotationCount = 0;
  let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
  let isClosing = false;

  const sendSafe = (payload: Record<string, unknown>) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  const fullSummary = buildFullAppSummary(sessionSnapshot);

  const systemInstruction = `
آپ "سٹون ایکسپرٹ" (Stone Expert — Plot # 375-A, Potohar Road, I-9/3, Islamabad) کے اصلی اور تجربہ کار دکاندار / سیلز مینیجر وائس اسسٹنٹ ہیں اور آپ کو پوری ایپ کی 100% رسائی اور معلومات حاصل ہیں۔
Your role: Act as the all-knowing, warm, helpful Pakistani marble, granite, chemical, service & construction showroom owner on the Stone Expert portal.

LANGUAGE & TONE:
- Speak primarily in natural, warm, respectful Pakistani Urdu (اردو) by default ("السلام علیکم! خوش آمدید جناب/محترمہ...").
- If the customer speaks in English, reply smoothly in English (or bilingual Urdu+English when helpful).
- Keep spoken answers clear, concise, and helpful; always call tools (\`search_catalog\`, \`get_app_overview\`, \`inspect_current_context\`) to quote exact live prices and availability.

FULL APP VISIBILITY RULES (IMPORTANT):
You have FULL access to EVERYTHING inside the Stone Expert app:
1. ALL stones: Local Marble, Imported Marble, Local Granite, Imported Granite, 12x24 Marble Tiles, Corian, Facade Stone, MDM Material, Artificial Stone, Limestone, Inlay, Antique, Vanity, and active Sale items.
2. ALL Fixing Chemicals, Adhesives, Epoxy, Grout, Polishing Pads & Tools (/products?tab=tool_chemical).
3. ALL Active Service Providers: Marble & Tile Fixers, Diamond Polishers, and Suzuki Drivers along with their exact job rates & phone numbers (/services).
4. Regional Representatives & Free Site Visit Booking (/representatives).
5. Build Your Home Estimator (/build-your-home), Home Renovation Services (/renovation), Completed Work Portfolio (/our-work), Live Order Tracking (/track-order), AI Stone Expert Visualizer (/expert/[id]), Company Brochure & Printable Price List (/brochure), Contact/Branches (/contact).
6. All 7 Cost Calculators (Simple, Floor, Kitchen, Vanity, Stairs, Window Sill, Labor) + Material Comparison (/order/[id]/compare) + Edge profile, cutout, wastage, and delivery charges.
7. The customer's live screen path and Quotation Cart (\`inspect_current_context\`).

TOOL USAGE INSTRUCTIONS:
- Whenever the customer asks about ANY stone, chemical, tool, fixer, polisher, or representative: call \`search_catalog\` (and/or \`get_app_overview\`) to fetch 100% live rates, stock status, and contacts.
- Whenever they want to see a specific stone or open its picture: call \`search_catalog\` then IMMEDIATELY \`navigate_to_page\` with \`route: "product_detail"\` + \`marbleId\`.
- Whenever they ask for chemicals/tools, fixers/services, representatives, build your home, renovation, track order, brochure, or calculators: call \`navigate_to_page\` with the exact matching route (\`chemicals\`, \`services\`, \`representatives\`, \`build_your_home\`, \`renovation\`, \`our_work\`, \`track_order\`, \`brochure\`, \`contact\`, etc.).
- Whenever they ask "میرے کوٹیشن میں کیا ہے؟" or "اس صفحے پر کیا ہے؟": call \`inspect_current_context\`.

${fullSummary}
`;

  const pendingClientMessages: string[] = [];

  const mergeCatalogUpdate = (incoming: Partial<FullAppSnapshot>) => {
    if (Array.isArray(incoming.marbles) && incoming.marbles.length > 0) {
      sessionSnapshot.marbles = incoming.marbles;
    }
    if (Array.isArray(incoming.fixingMaterials) && incoming.fixingMaterials.length > 0) {
      sessionSnapshot.fixingMaterials = incoming.fixingMaterials;
    }
    if (Array.isArray(incoming.serviceProviders) && incoming.serviceProviders.length > 0) {
      sessionSnapshot.serviceProviders = incoming.serviceProviders;
    }
    if (Array.isArray(incoming.representatives) && incoming.representatives.length > 0) {
      sessionSnapshot.representatives = incoming.representatives;
    }
    if (Array.isArray(incoming.partnerCompanies) && incoming.partnerCompanies.length > 0) {
      sessionSnapshot.partnerCompanies = incoming.partnerCompanies;
    }
    if (incoming.costsConfig) {
      sessionSnapshot.costsConfig = incoming.costsConfig;
    }
    if (incoming.businessConfig) {
      sessionSnapshot.businessConfig = incoming.businessConfig;
    }
    if (incoming.buildYourHome) {
      sessionSnapshot.buildYourHome = incoming.buildYourHome;
    }
    if (incoming.renovation) {
      sessionSnapshot.renovation = incoming.renovation;
    }
    if (Array.isArray(incoming.quotationItems)) {
      sessionSnapshot.quotationItems = incoming.quotationItems;
    }
    if (typeof incoming.quotationTotalPKR === 'number') {
      sessionSnapshot.quotationTotalPKR = incoming.quotationTotalPKR;
    }
    if (incoming.activeProduct !== undefined) {
      sessionSnapshot.activeProduct = incoming.activeProduct;
    }
  };

  const handleClientMessage = (rawStr: string) => {
    if (!liveSession) {
      pendingClientMessages.push(rawStr);
      return;
    }
    try {
      const msg = JSON.parse(rawStr);

      if (msg.type === 'audio' && typeof msg.audio === 'string') {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (msg.type === 'init') {
        if (typeof msg.currentPath === 'string') currentPath = msg.currentPath;
        if (typeof msg.language === 'string') currentLanguage = msg.language;
        if (typeof msg.quotationCount === 'number') quotationCount = msg.quotationCount;
        if (msg.catalog) mergeCatalogUpdate(msg.catalog);

        const initialTopic = typeof msg.initialTopic === 'string' ? msg.initialTopic.trim() : '';
        const welcomePrompt = initialTopic
          ? `Customer opened Stone Expert portal (path: "${currentPath}", language: ${currentLanguage}, saved quote items: ${quotationCount}) and clicked quick topic: "${initialTopic}". Deliver a brief warm Urdu welcome and immediately answer/open the relevant section using tools.`
          : `New client entered Stone Expert portal (path: "${currentPath}", language: ${currentLanguage}, saved quote items: ${quotationCount}). Deliver a warm Pakistani showroom owner Welcome Note in Urdu, briefly mention Marble, Granite, Tiles, Corian, Chemicals & Tools, Expert Fixers/Polishers, Site Visit Representatives, Build Your Home, Calculators & Price Comparison, and ask how you can help today.`;

        liveSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: welcomePrompt }] }],
          turnComplete: true,
        });
      } else if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
        liveSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: msg.text.trim() }] }],
          turnComplete: true,
        });
      } else if (msg.type === 'catalog_sync' && msg.catalog) {
        mergeCatalogUpdate(msg.catalog);
      } else if (msg.type === 'page_context') {
        if (typeof msg.currentPath === 'string') currentPath = msg.currentPath;
        if (typeof msg.quotationCount === 'number') quotationCount = msg.quotationCount;
        if (Array.isArray(msg.quotationItems)) {
          sessionSnapshot.quotationItems = msg.quotationItems;
        }
        if (typeof msg.quotationTotalPKR === 'number') {
          sessionSnapshot.quotationTotalPKR = msg.quotationTotalPKR;
        }
        if (msg.activeProduct !== undefined) {
          sessionSnapshot.activeProduct = msg.activeProduct;
        }
      }
    } catch (err) {
      console.warn('[LiveWS] Invalid client message:', err);
    }
  };

  clientWs.on('message', (raw) => {
    handleClientMessage(raw.toString());
  });

  try {
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              navigateToPageTool,
              searchCatalogTool,
              getAppOverviewTool,
              inspectCurrentContextTool,
              compareMaterialsTool,
              explainWorkflowTool,
              switchLanguageTool,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const content = message.serverContent;

          if (content?.inputTranscription?.text) {
            sendSafe({ type: 'inputTranscript', text: content.inputTranscription.text });
          }
          if (content?.outputTranscription?.text) {
            sendSafe({ type: 'outputTranscript', text: content.outputTranscription.text });
          }

          for (const part of content?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              sendSafe({ type: 'audio', audio: part.inlineData.data });
            }
          }

          if (content?.interrupted) sendSafe({ type: 'interrupted' });
          if (content?.turnComplete) sendSafe({ type: 'turnComplete' });

          if (message.toolCall?.functionCalls?.length) {
            const responses = [];
            for (const call of message.toolCall.functionCalls) {
              const args = (call.args || {}) as Record<string, any>;
              let toolResult: Record<string, any> = { ok: true };

              if (call.name === 'navigate_to_page') {
                const displayMode =
                  args.displayMode === 'scroll_to_row' ? 'scroll_to_row' : 'full_view';
                const openLightbox = Boolean(args.openLightbox);
                const resolved = resolveRoute(
                  String(args.route || 'home'),
                  sessionSnapshot,
                  args.marbleId ? String(args.marbleId) : undefined,
                  args.searchQuery ? String(args.searchQuery) : undefined,
                  displayMode,
                  openLightbox
                );
                currentPath = resolved.url;
                sendSafe({
                  type: 'ui_action',
                  action: 'navigate',
                  url: resolved.url,
                  labelUr: resolved.labelUr,
                  labelEn: resolved.labelEn,
                  guideTopic: resolved.guideTopic,
                  scrollTarget: resolved.scrollTarget,
                  focusCategory: resolved.focusCategory,
                  openLightbox,
                  shouldMinimizeDrawer: resolved.shouldMinimizeDrawer !== false,
                });
                toolResult = {
                  navigated: true,
                  url: resolved.url,
                  pageUrdu: resolved.labelUr,
                  pageEnglish: resolved.labelEn,
                };
              } else if (call.name === 'search_catalog') {
                const res = searchCatalog(
                  sessionSnapshot,
                  args.query ? String(args.query) : undefined,
                  args.category ? String(args.category) : undefined
                );
                if (res.marbles.length > 0) {
                  sendSafe({
                    type: 'ui_action',
                    action: 'show_products',
                    products: res.marbles.slice(0, 6).map((m) => ({
                      id: m.id,
                      name: m.name,
                      materialType: m.materialType,
                      origin: m.origin,
                      imageUrl: m.imageUrl,
                      priceRangePKR: m.priceRangePKR,
                    })),
                  });
                }
                if (res.serviceProviders.length > 0 || res.representatives.length > 0 || res.fixingMaterialsAndChemicals.length > 0) {
                  sendSafe({
                    type: 'ui_action',
                    action: 'show_app_info',
                    chemicals: res.fixingMaterialsAndChemicals.slice(0, 6),
                    serviceProviders: res.serviceProviders.slice(0, 4),
                    representatives: res.representatives.slice(0, 4),
                  });
                }
                toolResult = res;
              } else if (call.name === 'get_app_overview') {
                const overview = getAppOverview(
                  sessionSnapshot,
                  args.scope ? String(args.scope) : 'all'
                );
                if (overview.serviceProviders || overview.representatives || overview.fixingMaterialsAndTools) {
                  sendSafe({
                    type: 'ui_action',
                    action: 'show_app_info',
                    chemicals: (overview.fixingMaterialsAndTools || []).slice(0, 6),
                    serviceProviders: (overview.serviceProviders || []).slice(0, 4),
                    representatives: (overview.representatives || []).slice(0, 4),
                  });
                }
                toolResult = overview;
              } else if (call.name === 'inspect_current_context') {
                toolResult = {
                  currentPath,
                  currentLanguage,
                  quotationCount,
                  quotationTotalPKR: sessionSnapshot.quotationTotalPKR,
                  quotationItems: sessionSnapshot.quotationItems,
                  activeProduct: sessionSnapshot.activeProduct || null,
                };
              } else if (call.name === 'compare_materials') {
                const names = Array.isArray(args.materialNames)
                  ? args.materialNames.map(String)
                  : [];
                const area =
                  typeof args.areaSqFt === 'number' && args.areaSqFt > 0
                    ? args.areaSqFt
                    : undefined;
                const comparison = compareCatalogMaterials(sessionSnapshot, names, area);
                sendSafe({
                  type: 'ui_action',
                  action: 'show_comparison',
                  comparison,
                });
                if (args.openComparePage) {
                  const firstId = comparison.items[0]?.id || 'ziarat-white';
                  sendSafe({
                    type: 'ui_action',
                    action: 'navigate',
                    url: `/order/${firstId}/compare`,
                    labelUr: 'تمام مواد اور قیمتوں کا موازنہ',
                    labelEn: 'Material Cost Comparison',
                    guideTopic: 'compare',
                  });
                }
                toolResult = comparison;
              } else if (call.name === 'explain_calculator_or_comparison') {
                const topic = String(args.topic || 'catalog');
                sendSafe({ type: 'ui_action', action: 'show_guide', topic });
                toolResult = { displayedGuideForTopic: topic, ok: true };
              } else if (call.name === 'switch_app_language') {
                const lang = String(args.language || 'ur') === 'en' ? 'en' : 'ur';
                currentLanguage = lang;
                sendSafe({ type: 'ui_action', action: 'set_language', language: lang });
                toolResult = { switchedTo: lang };
              }

              responses.push({
                id: call.id,
                name: call.name,
                response: toolResult,
              });
            }

            try {
              liveSession?.sendToolResponse({ functionResponses: responses });
            } catch (toolErr) {
              console.error('[LiveWS] sendToolResponse error:', toolErr);
            }
          }
        },
        onerror: (err: any) => {
          console.error('[LiveWS] Gemini Live error:', err);
          sendSafe({
            type: 'error',
            message: err?.message || 'Gemini Live connection error occurred.',
          });
        },
        onclose: () => {
          if (!isClosing) {
            sendSafe({ type: 'closed' });
          }
        },
      },
    });
    sendSafe({ type: 'ready' });
    while (pendingClientMessages.length > 0) {
      const queued = pendingClientMessages.shift();
      if (queued) handleClientMessage(queued);
    }
  } catch (err: any) {
    console.error('[LiveWS] Failed connecting to gemini-3.8-live:', err);
    sendSafe({
      type: 'error',
      message:
        err?.message ||
        'Could not connect to Gemini Live (gemini-3.8-live). Please verify your API key in Settings > Secrets.',
    });
    clientWs.close();
    return;
  }

  clientWs.on('close', () => {
    isClosing = true;
    try {
      liveSession?.close();
    } catch {
      // ignore
    }
    liveSession = null;
  });

  clientWs.on('error', () => {
    isClosing = true;
    try {
      liveSession?.close();
    } catch {
      // ignore
    }
    liveSession = null;
  });
});

// ==========================================
// 2. ADMIN PANEL LIVE SUPERVISOR WS (/api/admin-live-ws)
// ==========================================
adminWss.on('connection', async (clientWs: WebSocket) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message:
          'GEMINI_API_KEY is not configured on the server. Please set your Gemini API key in Settings > Secrets.',
      })
    );
    clientWs.close();
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const adminState: AdminStateSnapshot = {
    orders: [...fallbackData.orders],
    marbles: [...fallbackData.app.marbles],
    fixingMaterials: [...fallbackData.app.fixingMaterials],
    suppliers: [],
    proposals: [],
    rateRequests: [],
    partnerApplications: [],
    serviceProviders: [...fallbackData.app.serviceProviders],
    representatives: [...fallbackData.app.representatives],
    missedSearches: [],
    buildRatesSummary: {},
    dailyRates: {},
    currentAdminPath: '/dashboard',
  };

  let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
  let isClosing = false;

  const sendSafe = (payload: Record<string, unknown>) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  const buildAdminOverview = () => {
    const orders = adminState.orders || [];
    const pendingOrders = orders.filter((o) => o.status === 'Pending');
    const inProgressOrders = orders.filter((o) => o.status === 'In Progress');
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
    const totalRevenuePKR = orders
      .filter((o) => o.status !== 'Canceled')
      .reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);

    const outOfStockMarbles = adminState.marbles
      .filter((m) => m.stockStatus === 'out_of_stock')
      .map((m) => ({ id: m.id, name: m.name, type: 'marble' }));
    const limitedStockMarbles = adminState.marbles
      .filter((m) => m.stockStatus === 'limited_stock')
      .map((m) => ({ id: m.id, name: m.name, type: 'marble' }));
    const hiddenMarbles = adminState.marbles
      .filter((m) => m.isHidden)
      .map((m) => ({ id: m.id, name: m.name, type: 'marble' }));
    const outOfStockFixings = adminState.fixingMaterials
      .filter((f) => f.stockStatus === 'out_of_stock')
      .map((f) => ({ id: f.id, name: f.name, type: 'fixing_material' }));

    const onSaleCount =
      adminState.marbles.filter((m) => m.onSale).length +
      adminState.fixingMaterials.filter((f) => f.onSale).length;

    const pendingRequests = (adminState.rateRequests || []).filter(
      (r: any) => !r.status || r.status === 'pending'
    );
    const pendingApps = (adminState.partnerApplications || []).filter(
      (a: any) => !a.status || a.status === 'pending'
    );

    return {
      currentAdminPath: adminState.currentAdminPath,
      totalOrders: orders.length,
      pendingOrdersCount: pendingOrders.length,
      inProgressOrdersCount: inProgressOrders.length,
      deliveredOrdersCount: deliveredOrders.length,
      totalRevenuePKR,
      recentOrders: orders.slice(0, 8),
      totalMarbles: adminState.marbles.length,
      totalFixingMaterials: adminState.fixingMaterials.length,
      outOfStockItems: [...outOfStockMarbles, ...outOfStockFixings],
      limitedStockItems: limitedStockMarbles,
      hiddenItems: hiddenMarbles,
      onSaleCount,
      suppliersCount: adminState.suppliers.length,
      pendingSupplierRateRequestsCount: pendingRequests.length,
      pendingSupplierApplicationsCount: pendingApps.length,
      topMissedSearches: (adminState.missedSearches || []).slice(0, 12),
    };
  };

  const queryAdminOrders = (statusFilter?: string, query?: string) => {
    const sf = (statusFilter || 'All').trim().toLowerCase();
    const q = (query || '').trim().toLowerCase();
    const matched = (adminState.orders || [])
      .filter((o) => {
        const stOk = !sf || sf === 'all' || (o.status || '').toLowerCase() === sf;
        const qOk =
          !q ||
          (o.id || '').toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerPhone || '').toLowerCase().includes(q) ||
          (o.marbleName || '').toLowerCase().includes(q);
        return stOk && qOk;
      })
      .slice(0, 15);
    return {
      totalMatched: matched.length,
      orders: matched,
    };
  };

  const queryAdminInventory = (filter?: string, query?: string) => {
    const flt = (filter || 'all').trim().toLowerCase();
    const q = (query || '').trim().toLowerCase();

    const marbleItems = (adminState.marbles || []).map((m) => ({
      itemType: 'marble' as const,
      id: m.id,
      name: m.name,
      category: m.category || m.materialType || 'Marble',
      pricePKR: Number(m.variants?.[0]?.price) || 0,
      stockStatus: m.stockStatus || 'in_stock',
      onSale: Boolean(m.onSale),
      discount: Number(m.discount) || 0,
      isHidden: Boolean(m.isHidden),
      imageUrl: toSeoThumbUrl(m.imageUrl, m.name, m.id),
      variants: (m.variants || []).slice(0, 4),
    }));

    const fixingItems = (adminState.fixingMaterials || []).map((f) => ({
      itemType: 'fixing_material' as const,
      id: f.id,
      name: f.name,
      category: f.category || 'Chemical',
      pricePKR: Number(f.price) || 0,
      stockStatus: f.stockStatus || 'in_stock',
      onSale: Boolean(f.onSale),
      discount: Number(f.discount) || 0,
      isHidden: Boolean(f.isHidden),
      imageUrl: f.imageUrl || '',
      unit: f.unit || 'unit',
    }));

    const all = [...marbleItems, ...fixingItems];
    const matched = all
      .filter((item) => {
        if (flt === 'marbles' && item.itemType !== 'marble') return false;
        if (flt === 'fixing_materials' && item.itemType !== 'fixing_material') return false;
        if (flt === 'out_of_stock' && item.stockStatus !== 'out_of_stock') return false;
        if (flt === 'limited_stock' && item.stockStatus !== 'limited_stock') return false;
        if (flt === 'incoming' && item.stockStatus !== 'incoming') return false;
        if (flt === 'on_sale' && !item.onSale) return false;
        if (flt === 'hidden' && !item.isHidden) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);

    return {
      totalMatched: matched.length,
      items: matched,
    };
  };

  const adminSystemInstruction = `
آپ "سٹون ایکسپرٹ ایڈمن پینل" کے لائیو وائس سپروائزر اور آپریشنز مینیجر (Admin Live Supervisor) ہیں۔
Your role: Act as a sharp, trusted, real-time Pakistani Marble & Granite Store Operations Supervisor watching over the Admin Dashboard for the owner (جناب فدا حسین / ایڈمن).

LANGUAGE & TONE:
- Speak primarily in clear, crisp Pakistani Urdu (اردو) with practical English business terms ("السلام علیکم سر! ..."). Switch to English smoothly if the admin speaks English.
- Keep spoken updates executive, structured, and crisp.

CORE RESPONSIBILITIES:
1. REAL-TIME ORDER MONITORING & ALERTS:
   - Whenever you receive a \`new_order_alert\` or when asked about orders, immediately alert the admin in Urdu with Customer Name, Order ID, Stone/Item, Quantity/Sq.Ft, PKR Total, and ask if they want to open the Orders page or change status to "In Progress".
   - Use \`query_orders\` to check Pending, In Progress, Shipped, Delivered, or Canceled orders.
2. STOCK & INVENTORY SUPERVISION:
   - Monitor \`out_of_stock\`, \`limited_stock\`, \`incoming\`, \`hidden\` products, pricing, bulk sales, and supplier rate requests/applications.
   - Always call \`query_inventory\` before quoting exact IDs or stock counts.
3. STRICT HUMAN APPROVAL GATE (لازمی قانون):
   - NEVER claim an order status, stock status, price, sale, or visibility has already been updated in the database on your own.
   - To make ANY change, you MUST call \`propose_admin_action\` with exact IDs and payloadJson. That displays the interactive Confirmation Card in front of the admin. Then verbally tell the admin: "میں نے تبدیلی کا کارڈ سامنے بھیج دیا ہے، براہ کرم تائید (Confirm) کا بٹن دبا دیں۔"
4. ADMIN NAVIGATION:
   - Use \`navigate_admin_page\` whenever the admin asks to open Orders, Manage Stock, Products, Cutting Optimizer, Service Providers, Representatives, Search Analytics, Build Your Home, Homepage, Brochure, or Settings.
`;

  const pendingClientMessages: string[] = [];

  const mergeAdminSync = (payload: Record<string, any>) => {
    if (Array.isArray(payload.orders)) adminState.orders = payload.orders;
    if (Array.isArray(payload.marbles)) adminState.marbles = payload.marbles;
    if (Array.isArray(payload.fixingMaterials)) adminState.fixingMaterials = payload.fixingMaterials;
    if (Array.isArray(payload.suppliers)) adminState.suppliers = payload.suppliers;
    if (Array.isArray(payload.proposals)) adminState.proposals = payload.proposals;
    if (Array.isArray(payload.rateRequests)) adminState.rateRequests = payload.rateRequests;
    if (Array.isArray(payload.partnerApplications)) adminState.partnerApplications = payload.partnerApplications;
    if (Array.isArray(payload.serviceProviders)) adminState.serviceProviders = payload.serviceProviders;
    if (Array.isArray(payload.representatives)) adminState.representatives = payload.representatives;
    if (Array.isArray(payload.missedSearches)) adminState.missedSearches = payload.missedSearches;
    if (payload.buildRatesSummary) adminState.buildRatesSummary = payload.buildRatesSummary;
    if (payload.dailyRates) adminState.dailyRates = payload.dailyRates;
    if (typeof payload.currentAdminPath === 'string') adminState.currentAdminPath = payload.currentAdminPath;
  };

  const handleClientMessage = (rawStr: string) => {
    if (!liveSession) {
      pendingClientMessages.push(rawStr);
      return;
    }
    try {
      const msg = JSON.parse(rawStr);

      if (msg.type === 'audio' && typeof msg.audio === 'string') {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (msg.type === 'init') {
        if (msg.adminState) mergeAdminSync(msg.adminState);
        if (typeof msg.currentAdminPath === 'string') {
          adminState.currentAdminPath = msg.currentAdminPath;
        }
        const ov = buildAdminOverview();
        const initialCommand = typeof msg.initialCommand === 'string' ? msg.initialCommand.trim() : '';
        const promptText = initialCommand
          ? `Admin opened Live Supervisor on "${adminState.currentAdminPath}". Current summary: ${ov.pendingOrdersCount} pending orders, ${ov.outOfStockItems.length} out-of-stock items, ${ov.limitedStockItems.length} limited-stock items, ${ov.pendingSupplierRateRequestsCount} pending supplier requests. Admin clicked/asked: "${initialCommand}". Immediately call the relevant tool and respond crisply in Urdu.`
          : `Admin just started the Live Supervisor on "${adminState.currentAdminPath}". Greet the admin warmly in Urdu ("السلام علیکم سر! ایڈمن سپروائزر حاضر ہے..."), give an instant crisp 2-sentence operational briefing (${ov.pendingOrdersCount} پینڈنگ آرڈرز، ${ov.outOfStockItems.length} آؤٹ آف اسٹاک آئٹمز، ${ov.pendingSupplierRateRequestsCount} سپلائر درخواستیں), and ask what you should check or update first.`;

        liveSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: promptText }] }],
          turnComplete: true,
        });
      } else if (msg.type === 'admin_sync' && msg.adminState) {
        mergeAdminSync(msg.adminState);
      } else if (msg.type === 'page_context' && typeof msg.currentAdminPath === 'string') {
        adminState.currentAdminPath = msg.currentAdminPath;
      } else if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
        liveSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: msg.text.trim() }] }],
          turnComplete: true,
        });
      } else if (msg.type === 'new_order_alert' && msg.order) {
        const order = msg.order as AdminOrderSummary;
        const exists = adminState.orders.some((o) => o.id === order.id);
        adminState.orders = exists
          ? adminState.orders.map((o) => (o.id === order.id ? order : o))
          : [order, ...adminState.orders];

        sendSafe({
          type: 'ui_action',
          action: 'show_orders',
          orders: [order, ...adminState.orders.filter((o) => o.id !== order.id).slice(0, 4)],
        });

        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `URGENT REAL-TIME SYSTEM ALERT: A brand new customer order just arrived! Order ID: #${order.id}, Customer: ${order.customerName}, Stone/Item: ${order.marbleName}, Quantity: ${order.quantity || 0} sq.ft, Total: PKR ${Number(order.totalPrice || 0).toLocaleString()}, Status: ${order.status}. Speak IMMEDIATELY in Urdu to alert the admin about this new order and ask if they want to mark it "In Progress" or open the Orders page.`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
      } else if (msg.type === 'action_completed') {
        const statusWord = msg.confirmed ? 'CONFIRMED & SAVED' : 'CANCELLED';
        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: `System feedback: The admin ${statusWord} the proposed action (${msg.actionType || 'action'}). ${msg.message || ''}. Briefly acknowledge this to the admin in Urdu in 1 short sentence.`,
                },
              ],
            },
          ],
          turnComplete: true,
        });
      }
    } catch (err) {
      console.warn('[AdminLiveWS] Invalid client message:', err);
    }
  };

  clientWs.on('message', (raw) => {
    handleClientMessage(raw.toString());
  });

  try {
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: adminSystemInstruction,
        tools: [
          {
            functionDeclarations: [
              adminGetOverviewTool,
              adminQueryOrdersTool,
              adminQueryInventoryTool,
              adminProposeActionTool,
              adminNavigateTool,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const content = message.serverContent;

          if (content?.inputTranscription?.text) {
            sendSafe({ type: 'inputTranscript', text: content.inputTranscription.text });
          }
          if (content?.outputTranscription?.text) {
            sendSafe({ type: 'outputTranscript', text: content.outputTranscription.text });
          }

          for (const part of content?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              sendSafe({ type: 'audio', audio: part.inlineData.data });
            }
          }

          if (content?.interrupted) sendSafe({ type: 'interrupted' });
          if (content?.turnComplete) sendSafe({ type: 'turnComplete' });

          if (message.toolCall?.functionCalls?.length) {
            const responses = [];
            for (const call of message.toolCall.functionCalls) {
              const args = (call.args || {}) as Record<string, any>;
              let toolResult: Record<string, any> = { ok: true };

              if (call.name === 'get_admin_overview') {
                toolResult = buildAdminOverview();
              } else if (call.name === 'query_orders') {
                const res = queryAdminOrders(
                  args.statusFilter ? String(args.statusFilter) : undefined,
                  args.query ? String(args.query) : undefined
                );
                sendSafe({
                  type: 'ui_action',
                  action: 'show_orders',
                  orders: res.orders,
                });
                toolResult = res;
              } else if (call.name === 'query_inventory') {
                const res = queryAdminInventory(
                  args.filter ? String(args.filter) : undefined,
                  args.query ? String(args.query) : undefined
                );
                sendSafe({
                  type: 'ui_action',
                  action: 'show_stock_items',
                  items: res.items,
                });
                toolResult = res;
              } else if (call.name === 'propose_admin_action') {
                let parsedPayload: Record<string, any> = {};
                try {
                  parsedPayload =
                    typeof args.payloadJson === 'string'
                      ? JSON.parse(args.payloadJson)
                      : args.payloadJson || {};
                } catch {
                  parsedPayload = {};
                }
                const proposal = {
                  actionType: String(args.actionType || 'UPDATE_STOCK_STATUS'),
                  title: String(args.title || 'تبدیلی کی تصدیق'),
                  description: String(args.description || ''),
                  targetId: args.targetId ? String(args.targetId) : undefined,
                  targetName: args.targetName ? String(args.targetName) : undefined,
                  previousValue: args.previousValue ? String(args.previousValue) : undefined,
                  newValue: args.newValue ? String(args.newValue) : undefined,
                  badgeLabel: args.badgeLabel ? String(args.badgeLabel) : String(args.actionType || 'Admin Action'),
                  payload: parsedPayload,
                };
                sendSafe({
                  type: 'ui_action',
                  action: 'propose_action',
                  proposal,
                });
                toolResult = {
                  proposed: true,
                  note: 'Interactive confirmation card displayed to admin. Wait for admin to press Confirm before claiming change is live.',
                };
              } else if (call.name === 'navigate_admin_page') {
                const target = resolveAdminRoute(String(args.route || 'dashboard'));
                adminState.currentAdminPath = target.url;
                sendSafe({
                  type: 'ui_action',
                  action: 'navigate',
                  url: target.url,
                  labelUr: target.labelUr,
                  labelEn: target.labelEn,
                });
                toolResult = { navigated: true, ...target };
              }

              responses.push({
                id: call.id,
                name: call.name,
                response: toolResult,
              });
            }

            try {
              liveSession?.sendToolResponse({ functionResponses: responses });
            } catch (toolErr) {
              console.error('[AdminLiveWS] sendToolResponse error:', toolErr);
            }
          }
        },
        onerror: (err: any) => {
          console.error('[AdminLiveWS] Gemini Live error:', err);
          sendSafe({
            type: 'error',
            message: err?.message || 'Admin Live Supervisor error occurred.',
          });
        },
        onclose: () => {
          if (!isClosing) {
            sendSafe({ type: 'closed' });
          }
        },
      },
    });
    sendSafe({ type: 'ready' });
    while (pendingClientMessages.length > 0) {
      const queued = pendingClientMessages.shift();
      if (queued) handleClientMessage(queued);
    }
  } catch (err: any) {
    console.error('[AdminLiveWS] Failed connecting to gemini-3.8-live:', err);
    sendSafe({
      type: 'error',
      message:
        err?.message ||
        'Could not connect to Gemini Live (gemini-3.8-live). Please verify your API key in Settings > Secrets.',
    });
    clientWs.close();
    return;
  }

  clientWs.on('close', () => {
    isClosing = true;
    try {
      liveSession?.close();
    } catch {
      // ignore
    }
    liveSession = null;
  });

  clientWs.on('error', () => {
    isClosing = true;
    try {
      liveSession?.close();
    } catch {
      // ignore
    }
    liveSession = null;
  });
});

server.listen(port, hostname, () => {
  console.log(`> Stone Expert server listening on http://${hostname}:${port}`);
});
