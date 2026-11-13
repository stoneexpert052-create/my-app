'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import type { Marble, MarbleVariant } from '@/lib/types';
import type { VanityState } from '@/components/vanity-designer';

interface OrderSummary {
  marble: Marble | null;
  variant: MarbleVariant | null;
  finalSqFt: number;
  total: number;
  vanities: VanityState[];
}

interface OrderSummaryContextType {
  summary: OrderSummary;
  setSummary: (summary: OrderSummary) => void;
  clearSummary: () => void;
}

const defaultSummary: OrderSummary = {
  marble: null,
  variant: null,
  finalSqFt: 0,
  total: 0,
  vanities: [],
};

const OrderSummaryContext = createContext<OrderSummaryContextType | undefined>(undefined);

export const OrderSummaryProvider = ({ children }: { children: ReactNode }) => {
  const [summary, setSummary] = useState<OrderSummary>(defaultSummary);

  const clearSummary = () => {
    setSummary(defaultSummary);
  };

  return (
    <OrderSummaryContext.Provider value={{ summary, setSummary, clearSummary }}>
      {children}
    </OrderSummaryContext.Provider>
  );
};

export const useOrderSummary = () => {
  const context = useContext(OrderSummaryContext);
  if (context === undefined) {
    throw new Error('useOrderSummary must be used within an OrderSummaryProvider');
  }
  return context;
};
