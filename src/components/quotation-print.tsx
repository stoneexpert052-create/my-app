
'use client';

import React from 'react';
import type { Requirement } from '@/lib/types';
import { edgeProfiles } from './order-form';
import { PrintLayout } from './PrintLayout';
import Image from 'next/image';
import { OrderQrCode } from './order-qrcode';

interface PrintProps {
  name: string;
  phone: string;
  address: string;
  details: string; // Order ID
  date: string;
  requirements: Requirement[];
  letterheadUrl: string; 
  total: number;
  deliveryCost: number;
  subTotal: number;
  loadLocation?: string;
  loadSize?: string;
}

const CostBreakdownRow: React.FC<{ label: string; value: number | string; isBold?: boolean; isSubtle?: boolean }> = ({ label, value, isBold, isSubtle }) => {
  if (typeof value === 'number' && (value <= 0 || isNaN(value))) return null;
  if (typeof value === 'string' && !value) return null;
  
  const isPkr = typeof value === 'number';

  return (
    <tr>
      <td className={`py-0.5 pr-2 text-xs ${isSubtle ? 'text-gray-500' : 'text-gray-800'}`}>{label}</td>
      <td className={`py-0.5 text-right whitespace-nowrap text-xs ${isBold ? 'font-bold' : ''} ${isPkr ? 'text-blue-600 font-semibold' : ''}`}>
        {isPkr ? `PKR ${value.toLocaleString(undefined, {maximumFractionDigits: 0})}` : value}
      </td>
    </tr>
  );
};


export const QuotationPrint = React.forwardRef<
  HTMLDivElement,
  PrintProps
>((props, ref) => {
  const {
    requirements = [],
    letterheadUrl,
    deliveryCost = 0,
    subTotal = 0,
  } = props;
  
  const grandTotal = subTotal + deliveryCost;
  const [grandTotalInteger, grandTotalFractional] = grandTotal.toFixed(2).split('.');

   if (requirements.length === 0) {
     return (
         <div ref={ref} className="print-page" data-print-page>
            <PrintLayout letterheadUrl={letterheadUrl}>
                <p className="text-center">No items found for this quotation.</p>
            </PrintLayout>
         </div>
      )
   }

  return (
    <div ref={ref} className="print-page" data-print-page>
      <PrintLayout letterheadUrl={letterheadUrl}>
           <div className="flex flex-col min-h-full">
            <header>
                <div className="text-center mt-4">
                    <p className="inline-block border-b-2 border-black px-8 text-2xl font-semibold">QUOTATION</p>
                </div>
                
                <table className="w-full mt-8 text-sm">
                    <tbody>
                        <tr>
                            <td className="w-1/2 align-top">
                                <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600">Prepared For:</h2>
                                <div className="flex flex-col">
                                    <p className="font-bold text-base">{props.name}</p>
                                    <p className="text-gray-700">{props.address}</p>
                                    <p className="text-gray-700">Phone: {props.phone}</p>
                                    {(props.loadLocation || props.loadSize) && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-gray-300 text-xs text-gray-700">
                                            {props.loadLocation && <p><strong>Load Location:</strong> {props.loadLocation}</p>}
                                            {props.loadSize && <p><strong>Load Size:</strong> {props.loadSize}</p>}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="w-1/2 align-top text-right">
                                <p><strong className="text-xs uppercase tracking-wider text-gray-600">Quotation No:</strong> {props.details}</p>
                                <p><strong className="text-xs uppercase tracking-wider text-gray-600">Date:</strong> {new Date(props.date).toLocaleDateString('en-GB')}</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </header>
            
            <main className="mt-6 flex-grow">
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <tbody>
                    {requirements.map((req) => {
                      const isFixingMaterial = req.type === 'fixing_material';
                      const details = req.details || {};
                      const vanities = req.type === 'vanity' ? (details.vanities || []) : [];
                      const allCalculations = req.type === 'vanity' ? vanities.map((v: any) => v.calculations) : [details];
                      const totalFinalSqFt = allCalculations.reduce((acc: number, calc: any) => acc + (calc?.finalSqFt || 0), 0);

                      const imgSrc =
                        req.marble?.imageUrl ||
                        req.fixingMaterial?.imageUrl ||
                        details?.slabImageUrl ||
                        'https://picsum.photos/seed/marble/200/200';

                      return (
                         <tr key={req.id} className="border-b border-gray-300 page-break-inside-avoid">
                            <td className="py-3 pr-2" style={{ width: '80px' }}>
                              <Image src={imgSrc} alt={req.name || 'Stone Item'} width={64} height={64} referrerPolicy="no-referrer" className="rounded-md object-cover" />
                            </td>
                            <td className="py-3 align-top">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-base">{req.name}</h3>
                                    <div className="text-xs text-gray-600 flex flex-col">
                                        {isFixingMaterial && req.fixingMaterial ? (
                                        <p>{req.quantity} {req.fixingMaterial.unit} @ <span className="text-blue-600 font-semibold">PKR {(req.fixingMaterial.price || 0).toLocaleString()}</span>/{req.fixingMaterial.unit}</p>
                                        ) : (
                                        <>
                                            <p>Material: {req.marble?.name || details?.materialName || 'Custom Stone'}</p>
                                            {totalFinalSqFt > 0 && <p>Area (incl. wastage): {totalFinalSqFt.toFixed(2)} sq.ft @ <span className="text-blue-600 font-semibold">PKR {(details.rate || details.slabConfig?.ratePerSqFt || 0).toLocaleString()}</span>/sq.ft</p>}
                                        </>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 text-right font-bold text-lg whitespace-nowrap align-top text-blue-600" style={{ width: '140px' }}>
                                PKR {req.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            </main>

            <footer className="mt-auto pt-4">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="w-3/5 align-bottom pr-8">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <h3 className="font-bold uppercase tracking-wider text-xs text-gray-600">Notes:</h3>
                              <p className="text-xs text-gray-600">Thank you for your business!</p>
                            </div>
                            <div className="shrink-0">
                              <OrderQrCode orderId={props.details} size={75} showLabel={false} className="border-0 p-0 shadow-none bg-transparent" />
                            </div>
                          </div>
                      </td>
                      <td className="w-2/5 align-bottom">
                         <table className="w-full text-right text-sm">
                           <tbody>
                             <tr>
                                <td className="py-1 font-semibold uppercase tracking-wider text-xs text-gray-700">Subtotal:</td>
                                <td className="py-1 font-bold pl-4 text-blue-600">PKR {subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                             </tr>
                             {deliveryCost > 0 && (
                               <tr>
                                  <td className="py-1 font-semibold uppercase tracking-wider text-xs text-gray-700">Delivery:</td>
                                  <td className="py-1 font-bold pl-4 text-blue-600">PKR {deliveryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                               </tr>
                             )}
                             <tr className="border-t-2 border-gray-400">
                               <td className="pt-2 font-bold uppercase tracking-wider text-sm text-gray-800">Grand Total:</td>
                               <td className="pt-2 font-bold text-xl pl-4 text-blue-600">
                                  PKR {parseInt(grandTotalInteger).toLocaleString()}<span className="text-base">.{grandTotalFractional}</span>
                              </td>
                             </tr>
                           </tbody>
                         </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
                    <p>This quotation is valid for 7 days. Prices are subject to change.</p>
                    <p>Stone Expert | Ph: {props.phone} | Email: info@stoneexpert.com</p>
                </div>
            </footer>
           </div>
      </PrintLayout>
    </div>
  );
});

QuotationPrint.displayName = 'QuotationPrint';
