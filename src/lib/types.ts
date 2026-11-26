
import type { KitchenDesignerState, OrderFormState } from "@/context/calculation-context";
import type { VanityState } from "@/components/vanity-designer";

export type MarbleVariant = {
  id: string;
  thickness: string; // e.g., "4-Sutar", "6-Sutar"
  size: string; // e.g., "Tiles (12\" x 24\")", "Counters (24\" x 96\")", "Slabs"
  price: number | null; // Price per sq. ft. for this specific variant
  originalPrice?: number;
  salePrice?: number;
  discount?: number;
};

export type GalleryImage = {
  id: string;
  url: string;
  altText: string;
  price?: number;
  unit?: string;
};

export type ProductReview = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
};

export type Marble = {
  id: string;
  name: string;
  materialType: 'Marble' | 'Granite' | 'Limestone' | 'Artificial Stone' | '12x24 Tiles' | 'Corian' | 'Facade Stone' | 'Inlay' | 'Antique' | 'Vanity' | string;
  category?: string;
  origin: 'Local' | 'Imported';
  description: string;
  imageUrl: string;
  imageHint: string;
  uses: string;
  characteristics: string;
  variants: MarbleVariant[];
  gallery: GalleryImage[];
  isFeatured?: boolean;
  isHidden?: boolean;
  unit?: string;
  rating?: number;
  reviews?: ProductReview[];
  onSale?: boolean;
  discount?: number; // Discount percentage (e.g., 10 for 10%) or fixed PKR
  discountType?: 'percentage' | 'fixed';
  salePrice?: number;
  saleBadgeText?: string; // e.g. "SALE 10% OFF" or "سیل"
  saleStartDate?: string;
  saleEndDate?: string;
  heroHighlightOnSale?: boolean; // When on sale, whether to display in hero banner carousel (defaults to true)
};

export type CalculationDetails = {
    marble: Marble;
    variant: MarbleVariant;
    requirements: Requirement[];
    customerInfo: Partial<Customer>;
};

export type Order = {
  id: string;
  userId?: string; // Added to link order to a user
  customerName: string;
  marbleName: string;
  quantity: number; // This can be total sq. ft.
  totalPrice: number;
  status: 'Pending' | 'In Progress' | 'Shipped' | 'Delivered' | 'Canceled';
  date: string; // ISO 8601 format
  calculationDetails?: CalculationDetails; // Optional property to hold all design data
  applicationType?: string;
};

export type AppConfig = {
    letterheadUrl: string;
}

export type FixingMaterial = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  price: number;
  unit: string; // e.g., 'kg', 'bag', 'bottle'
  category: 'Chemical' | 'Tool' | 'Adhesive' | 'Other';
  dataSheetUrl?: string; // Optional URL for the PDF data sheet
  gallery?: GalleryImage[];
  isFeatured?: boolean;
  onSale?: boolean;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  salePrice?: number;
  saleBadgeText?: string;
  heroHighlightOnSale?: boolean;
  isHidden?: boolean;
};

export type RequirementType = 'simple' | 'floor' | 'stairs' | 'window-sill' | 'kitchen' | 'vanity' | 'cutting-optimizer' | 'fixing_material' | 'labor_quote';

export interface Requirement {
    id: number;
    type: RequirementType;
    name: string;
    total: number;
    details: any;
    // For Marble-based requirements
    marbleId?: string;
    variantId?: string;
    marble?: Marble;
    variant?: MarbleVariant;
    // For Fixing Material requirements
    fixingMaterialId?: string;
    fixingMaterial?: FixingMaterial;
    quantity?: number;
}

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type Customer = {
    name: string;
    phone: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    loadLocation?: string;
    loadSize?: string;
}

export interface ProviderJob {
  id: string;
  title: string;
  price: number;
  unit: 'sqft' | 'sqmeter' | 'rft' | 'piece' | 'job';
}

export type ServiceProvider = {
  id: string;
  name: string;
  service: string; // Updated to allow any service type from config
  phone: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  rating?: number;
  gallery?: GalleryImage[];
  socials?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
  jobs?: ProviderJob[];
};

export interface Representative {
  id: string;
  nameEn: string;
  nameUr: string;
  phone: string;
  whatsapp?: string;
  regionEn: string;
  regionUr: string;
  cities: string[];
  designationEn?: string;
  designationUr?: string;
  officeAddressEn?: string;
  officeAddressUr?: string;
  avatarUrl?: string;
  portalPin?: string;
  email?: string;
  isActive: boolean;
  order?: number;
}

export type SiteMeasurementCategory =
  | 'stairs'
  | 'window-sill'
  | 'floor'
  | 'feature-wall'
  | 'kitchen'
  | 'vanity'
  | 'simple';

export interface SiteMeasurementRow {
  id: string;
  label: string;
  width: number;
  length: number;
  qty: number;
  sqFt: number;
  notes?: string;
}

export interface SiteMeasurementSection {
  id: string;
  category: SiteMeasurementCategory;
  title: string;
  materialId?: string;
  materialName: string;
  variantLabel?: string;
  ratePerSqFt: number;
  unit: 'inches' | 'feet';
  rows: SiteMeasurementRow[];
  totalSqFt: number;
  wastagePercent: number;
  finalSqFt: number;
  extraLabel?: string;
  extraCharges: number;
  subtotal: number;
  notes?: string;
}

export type SiteVisitJobStatus =
  | 'assigned'
  | 'visited'
  | 'quoted'
  | 'approved'
  | 'completed';

export interface SiteVisitJob {
  id: string;
  representativeId: string;
  representativeName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerNotes: string;
  requestedCategories: SiteMeasurementCategory[];
  preferredVisitDate?: string;
  status: SiteVisitJobStatus;
  siteMeasurements: SiteMeasurementSection[];
  grandTotalSqFt: number;
  grandTotalPKR: number;
  linkedOrderId?: string;
  createdBy: 'admin' | 'representative' | 'customer';
  createdAt: string;
  updatedAt: string;
}

export type DailyRates = Record<string, any>;

export interface PriceHistoryEntry {
  id: string;
  rowId: string;
  productId: string;
  variantId?: string;
  productName: string;
  productType: 'marble' | 'fixing_material';
  previousPrice: number | null;
  newPrice: number;
  source: 'manual' | 'bulk' | 'supplier_markup' | 'initial';
  note?: string;
  recordedAt: string;
}


