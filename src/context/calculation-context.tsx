
'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { VanityState } from '@/components/vanity-designer';
import type { Marble, MarbleVariant, Requirement, RequirementType, Customer, FixingMaterial } from '@/lib/types';
import type { DimensionRow, Winder, WindowSillRow } from '@/components/order-form';
import type { LayoutType as KitchenLayoutType, Cutout as KitchenCutout, Piece as KitchenPiece, Island as KitchenIsland } from '@/components/kitchen-designer';
import type { ProfileType } from '@/components/order-form';
import costs from '@/lib/costs.json';


export type OrderFormState = {
  dimensionRows: DimensionRow[];
  windowSillRows: WindowSillRow[];
  winders: Winder[];
  globalProfileType: ProfileType;
  selectedUnit?: 'inches' | 'feet' | 'cm' | 'mm';
  stairLocation?: 'basement' | 'ground' | 'first' | 'other';
  customStairLocation?: string;
}

export type KitchenDesignerState = {
  layout: KitchenLayoutType;
  profileType: ProfileType;
  selectedEdges: Record<string, boolean>;
  topPiece: KitchenPiece;
  leftPiece: KitchenPiece;
  rightPiece: KitchenPiece;
  islands: KitchenIsland[];
  selectedUnit?: 'inches' | 'feet' | 'cm' | 'mm';
};


// Define the shape of customer information
interface CustomerInfo extends Customer {
}

// Define the context type
interface CalculationContextType {
  requirements: Requirement[];
  setRequirements: React.Dispatch<React.SetStateAction<Requirement[]>>;
  addRequirement: (type: RequirementType, marble: Marble, variant: MarbleVariant) => number;
  addFixingMaterialRequirement: (material: FixingMaterial, quantity: number) => number;
  addPerPieceRequirement: (marble: Marble, quantity: number) => void;
  removeRequirement: (id: number) => void;
  updateRequirement: (id: number, newProps: Partial<Requirement>) => void;
  clearRequirements: () => void;
  
  customerInfo: CustomerInfo;
  setCustomerInfo: (newInfo: Partial<CustomerInfo>) => void;
  
  selectedMarble: Marble | null;
  setSelectedMarble: (marble: Marble | null) => void;
  
  deliveryCost: number;
  grandTotal: number;
  costs: typeof costs;
  setCosts: React.Dispatch<React.SetStateAction<typeof costs>>;
}

// Default initial states
const defaultCustomerInfo: CustomerInfo = {
    name: '',
    phone: '',
    address: '',
    latitude: null,
    longitude: null,
    loadLocation: '',
    loadSize: '',
}

// Create the context
const CalculationContext = createContext<CalculationContextType | undefined>(undefined);

// Create the provider component
export const CalculationProvider = ({ children }: { children: ReactNode }) => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [customerInfo, setCustomerInfoState] = useState<CustomerInfo>(defaultCustomerInfo);
  const [selectedMarble, setSelectedMarbleState] = useState<Marble | null>(null);
  const [costsState, setCostsState] = useState<typeof costs>(costs);

  useEffect(() => {
    try {
      const savedCustomerInfo = localStorage.getItem('customerInfo');
      if (savedCustomerInfo) {
        setCustomerInfoState(JSON.parse(savedCustomerInfo));
      }
    } catch (error) {
      console.error("Failed to parse customer info from localStorage", error);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    async function loadDynamicCosts() {
      try {
        const { getCostsConfig, subscribeToAppUpdates } = await import('@/lib/admin-actions');
        const dbCosts = await getCostsConfig();
        if (dbCosts) {
          setCostsState(prev => ({ ...prev, ...dbCosts }));
        }

        unsubscribe = subscribeToAppUpdates((event) => {
          if (event.type === 'costs_updated' || event.type === 'app_data_sync') {
            getCostsConfig().then(latestCosts => {
              if (latestCosts) {
                setCostsState(prev => ({ ...prev, ...latestCosts }));
              }
            });
          }
        });
      } catch (error) {
        console.warn("Failed to load dynamic costs from database:", error);
      }
    }
    loadDynamicCosts();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  const totalSqFt = useMemo(() => {
    return requirements.reduce((acc, req) => acc + (req.details?.finalSqFt || 0), 0);
  }, [requirements]);

  const deliveryCost = useMemo(() => {
    if (totalSqFt <= 0) return 0;
    const { sqftPerDeliveryTrip, deliveryCostPerTrip } = costsState;
    return Math.ceil(totalSqFt / sqftPerDeliveryTrip) * deliveryCostPerTrip;
  }, [totalSqFt, costsState]);
  
  const grandTotal = useMemo(() => {
    const itemsTotal = requirements.reduce((acc, req) => acc + (req.total || 0), 0);
    return itemsTotal; // Delivery cost will be added where it's displayed
  }, [requirements]);

  const setCustomerInfo = useCallback((newInfo: Partial<CustomerInfo>) => {
    setCustomerInfoState(prev => {
        const updatedInfo = {...prev, ...newInfo};
        try {
            localStorage.setItem('customerInfo', JSON.stringify(updatedInfo));
        } catch (error) {
            console.error("Failed to save customer info to localStorage", error);
        }
        return updatedInfo;
    });
  }, []);

  const setSelectedMarble = useCallback((marble: Marble | null) => {
    setSelectedMarbleState(marble);
  }, []);

  const addRequirement = useCallback((type: RequirementType, marble: Marble, variant: MarbleVariant) => {
    if (!variant) {
        console.error("Cannot add requirement: a variant must be provided.");
        return -1;
    }

    const newReq: Requirement = {
      id: Date.now(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${requirements.filter(r => r.type === type).length + 1}`,
      total: 0,
      details: {},
      marbleId: marble.id,
      variantId: variant.id,
      marble: marble,
      variant: variant,
    };
    setRequirements(prev => [...prev, newReq]);
    return newReq.id;
  }, [requirements]);
  
  const addFixingMaterialRequirement = useCallback((material: FixingMaterial, quantity: number) => {
    if (quantity <= 0) return -1;
    
    const newReq: Requirement = {
      id: Date.now(),
      type: 'fixing_material',
      name: material.name,
      total: material.price * quantity,
      details: {
          pricePerUnit: material.price,
          unit: material.unit,
      },
      fixingMaterialId: material.id,
      fixingMaterial: material,
      quantity: quantity,
    };
    setRequirements(prev => [...prev, newReq]);
    return newReq.id;
  }, []);

  const addPerPieceRequirement = useCallback((marble: Marble, quantity: number) => {
    if (quantity <= 0) return;
    const variant = marble.variants[0];
    if (!variant || variant.price === null) {
        console.error("Cannot add item: price not available.");
        return;
    }

    const newReq: Requirement = {
      id: Date.now(),
      type: 'simple', // Reusing simple type
      name: marble.name,
      total: variant.price * quantity,
      details: {
          isPerPiece: true,
          quantity: quantity,
          pricePerPiece: variant.price,
      },
      marbleId: marble.id,
      variantId: variant.id,
      marble: marble,
      variant: variant,
      quantity: quantity,
    };
    setRequirements(prev => [...prev, newReq]);
  }, []);


  const removeRequirement = useCallback((id: number) => {
    setRequirements(prev => prev.filter(req => req.id !== id));
  }, []);
  
  const updateRequirement = useCallback((id: number, newProps: Partial<Requirement>) => {
    setRequirements(prev => prev.map(req => {
        if (req.id !== id) return req;
        
        const updatedReq = { ...req, ...newProps };
        
        // Recalculate total if quantity is changed
        if ('quantity' in newProps && newProps.quantity !== undefined) {
            const quantity = newProps.quantity;
            if (updatedReq.type === 'fixing_material' && updatedReq.fixingMaterial) {
                updatedReq.total = updatedReq.fixingMaterial.price * quantity;
            } else if (updatedReq.details?.isPerPiece) {
                const pricePerPiece = updatedReq.details.pricePerPiece || 0;
                updatedReq.total = pricePerPiece * quantity;
            }
        }
        return updatedReq;
    }));
  }, []);

  const clearRequirements = useCallback(() => {
    setRequirements([]);
  }, []);
  
  const value = {
    requirements,
    setRequirements,
    addRequirement,
    addFixingMaterialRequirement,
    addPerPieceRequirement,
    removeRequirement,
    updateRequirement,
    clearRequirements,
    customerInfo,
    setCustomerInfo,
    selectedMarble,
    setSelectedMarble,
    deliveryCost,
    grandTotal,
    costs: costsState,
    setCosts: setCostsState,
  };

  return (
    <CalculationContext.Provider value={value}>
      {children}
    </CalculationContext.Provider>
  );
};

// Create the custom hook
export const useCalculation = () => {
  const context = useContext(CalculationContext);
  if (context === undefined) {
    throw new Error('useCalculation must be used within a CalculationProvider');
  }
  return context;
};

// Re-exporting types for convenience in other files
export type { CustomerInfo };
