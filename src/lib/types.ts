
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
  isActive: boolean;
  order?: number;
}

export type DailyRates = Record<string, any>;
