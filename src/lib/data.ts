
import type { Marble, Order, FixingMaterial } from '@/lib/types';
import marblesData from './marbles-data.json';
import fixingMaterialsData from './fixing-materials-data.json';


// Dynamically generate the material types from the actual data.
// This makes the filters update automatically when new products with new types are added.
const uniqueMaterialTypes = [...new Set(marblesData.map(marble => marble.materialType))];
// Ensure our new types are included even if no products use them yet.
const requiredTypes = ['MDM Material', 'Facade Stone', 'Abrasive', 'Chemical', 'Adhesive', 'Tool'];
requiredTypes.forEach(t => {
  if (!uniqueMaterialTypes.includes(t)) {
    uniqueMaterialTypes.push(t);
  }
});
export const materialTypes = uniqueMaterialTypes.sort();

const uniqueFixingCategories = [...new Set(fixingMaterialsData.map(material => material.category))];
export const fixingMaterialCategories = uniqueFixingCategories.sort();


// IMPORTANT: All product data is now managed in marbles-data.json and fixing-materials-data.json.
export const marbles: Marble[] = marblesData as unknown as Marble[];
export const fixingMaterials: FixingMaterial[] = fixingMaterialsData as unknown as FixingMaterial[];


export const orders: Order[] = [
  {
    id: 'ORD001',
    customerName: 'Ahmed Ali',
    marbleName: 'Ziarat White',
    quantity: 50,
    totalPrice: 1650000,
    status: 'Shipped',
    date: '2023-10-15',
  },
  {
    id: 'ORD002',
    customerName: 'Fatima Khan',
    marbleName: 'Black & Gold',
    quantity: 20,
    totalPrice: 1000000,
    status: 'Delivered',
    date: '2023-10-12',
  },
  {
    id: 'ORD003',
    customerName: 'Bilal Corporation',
    marbleName: 'Indus Gold',
    quantity: 100,
    totalPrice: 4200000,
    status: 'Pending',
    date: '2023-10-20',
  },
  {
    id: 'ORD004',
    customerName: 'Sana Javed',
    marbleName: 'Onyx Green',
    quantity: 10,
    totalPrice: 700000,
    status: 'Delivered',
    date: '2023-09-28',
  },
  {
    id: 'ORD005',
    customerName: 'Usman Construction',
    marbleName: 'Boticina Fancy',
    quantity: 200,
    totalPrice: 5000000,
    status: 'Shipped',
    date: '2023-10-18',
  },
  {
    id: 'ORD006',
    customerName: 'Zainab Associates',
    marbleName: 'Tavera Light',
    quantity: 150,
    totalPrice: 3600000,
    status: 'Canceled',
    date: '2023-10-11',
  },
];

export const sizeOptions = [
    { value: '12"x12"', label: '12" x 12"' },
    { value: '12"x24"', label: '12" x 24"' },
    { value: '12"x36"', label: '12" x 36"' },
    { value: '12"x48"', label: '12" x 48"' },
    { value: '24" Counter', label: '24" Counter' },
    { value: '30" Counter', label: '30" Counter' },
    { value: '36" Counter', label: '36" Counter' },
    { value: '48" Slab', label: '48" Slab' },
    { value: 'Gangsaw Slab', label: 'Gangsaw Slab' },
];

export const thicknessOptions = [
    { value: '4-Sutar', label: '4-Sutar' },
    { value: '6-Sutar', label: '6-Sutar' },
];

export const defaultDailyRates = {
  id: 'daily',
  usd: 278.45,
  usdChange: "+0.15",
  sar: 74.24,
  sarChange: "Stable",
  aed: 75.82,
  aedChange: "+0.04",
  eur: 301.60,
  eurChange: "-0.45",
  gbp: 354.10,
  gbpChange: "+0.75",
  lpg: 235.50,
  lpgChange: "-2.50",
  petrol: 268.36,
  petrolChange: "-4.15",
  diesel: 270.22,
  dieselChange: "Stable",
  kerosene: 182.15,
  keroseneChange: "+1.80",
  updatedAt: '2026-06-18',
};

