'use client';

import React from 'react';
import { MiniEdgeSelector } from './order-form';
import type { Requirement } from '@/lib/types';
import { PrintLayout } from './PrintLayout';
import { KitchenLayout } from './kitchen-layout';
import { VanityLayout } from './vanity-layout';
import Image from 'next/image';
import { OrderQrCode } from './order-qrcode';


interface ChallanPrintProps {
    name: string;
    address: string;
    phone: string;
    details: string; // Order ID
    date: string;
    requirements: Requirement[];
    letterheadUrl: string;
    loadLocation?: string;
    loadSize?: string;
}

const parseSutarValue = (value: string): number => {
    if (!value) return 0;
    const stringValue = String(value);
    if (stringValue.includes('.')) {
      const parts = stringValue.split('.');
      const inches = parseInt(parts[0], 10) || 0;
      const sutar = parseInt(parts[1], 10) || 0;
      if (sutar > 0) {
        return inches + sutar / 8;
      }
      return inches;
    }
    return parseFloat(stringValue) || 0;
};

const SingleChallanPage = ({ name, address, phone, orderId, date, req, letterheadUrl, itemNumber, totalItems, loadLocation, loadSize }: { name: string, address: string, phone: string, orderId: string, date: string, req: Requirement, letterheadUrl: string, itemNumber: number, totalItems: number, loadLocation?: string, loadSize?: string }) => {
    const allItems: {id: string | number, description: string, size: string, qty: string, diagram?: React.ReactNode}[] = [];
    const details = req.details || {};

    if (req.type === 'fixing_material' && req.fixingMaterial) {
         allItems.push({
            id: `fix-mat-${req.id}`,
            description: req.fixingMaterial.name,
            size: req.fixingMaterial.unit,
            qty: String(req.quantity),
            diagram: <Image src={req.fixingMaterial.imageUrl} alt={req.fixingMaterial.name} width={64} height={64} className="object-contain" />
        });
    } else if (req.type === 'stairs' && details.dimensionRows) {
        details.dimensionRows.forEach((row: any) => {
            if(parseFloat(row.length) > 0 && parseFloat(row.width) > 0) {
                allItems.push({
                    id: `stairs-${row.id}`,
                    description: `Stair Tread: ${req.marble?.name || 'Marble'}`,
                    size: `${row.width}" x ${row.length}"`,
                    qty: row.quantity,
                    diagram: <MiniEdgeSelector edges={row.edges} width={parseSutarValue(row.width)} length={parseSutarValue(row.length)} onEdgeClick={() => {}} disabled={true} widthStr={row.width} lengthStr={row.length} isPrintMode={true} />
                });

                if (row.riser) {
                    if (row.riser.width && row.riser.length && row.riser.quantity) {
                        allItems.push({
                            id: `stairs-riser-${row.id}`,
                            description: `  ↳ Stair Riser: ${req.marble?.name || 'Marble'}`,
                            size: `${row.riser.width}" x ${row.riser.length}"`,
                            qty: row.riser.quantity,
                            diagram: <span className="text-xs text-gray-500 italic">Riser Material</span>
                        });
                    }
                    if (row.riser.hasSkirting && row.riser.skirtingLength) {
                        const typeText = row.riser.skirtingType === 'two-sided' ? '2-Sided' : '1-Sided';
                        allItems.push({
                            id: `stairs-skirting-${row.id}`,
                            description: `  ↳ Stair Skirting (${typeText}): ${req.marble?.name || 'Marble'}`,
                            size: `6" x ${row.riser.skirtingLength}"`,
                            qty: row.quantity,
                            diagram: <span className="text-xs text-gray-500 italic">Skirting Material</span>
                        });
                    }
                }
            }
        });
    } else if (req.type === 'window-sill' && details.windowSillRows) {
         details.windowSillRows.forEach((row: any) => {
            if(parseFloat(row.length) > 0 && parseFloat(row.width) > 0) {
                allItems.push({
                    id: `ws-${row.id}`,
                    description: `Window Sill: ${req.marble?.name || 'Marble'}`,
                    size: `${row.width}" x ${row.length}"`,
                    qty: row.quantity,
                    diagram: <MiniEdgeSelector edges={row.edges} width={parseSutarValue(row.width)} length={parseSutarValue(row.length)} onEdgeClick={() => {}} disabled={true} widthStr={row.width} lengthStr={row.length} innerCut={'innerCut' in row ? parseSutarValue(row.innerCut) : 0} isPrintMode={true} />
                })
            }
        });
    } else if (req.type === 'kitchen' && details.layout) {
        allItems.push({
            id: `kitchen-${req.id}`,
            description: `Kitchen Top: ${req.marble?.name || 'Marble'}`,
            size: 'Custom Shape',
            qty: '1',
            diagram: <div className="w-24 h-16 border border-dashed rounded-md overflow-hidden"><KitchenLayout layout={details.layout} dimensions={{top: details.topPiece, left: details.leftPiece, right: details.rightPiece, islands: details.islands || [],}} textureUrl="" onEdgeToggle={() => {}} selectedEdges={{}} isDimensioningMode={false} isPrintMode={true} onCutoutChange={() => {}} activeCutout={null} setActiveCutout={() => {}} zoom={1} /></div>
        });
    } else if (req.type === 'vanity' && details.vanities) {
        details.vanities.forEach((vanity: any) => {
             allItems.push({
                id: `vanity-${vanity.id}`,
                description: `Vanity Top: ${vanity.name} (${req.marble?.name || 'Marble'})`,
                size: 'Custom Shape',
                qty: '1',
                diagram: <div className="w-24 h-16 border border-dashed rounded-md overflow-hidden"><VanityLayout layout={vanity.layout} dimensions={vanity} profileType={vanity.profileType} selectedEdges={vanity.selectedEdges} onEdgeToggle={() => {}} marbleImageUrl="" sinks={vanity.sinks || []} backsplash={vanity.backsplash} lutak={vanity.lutak} isPrintMode={true} zoom={1} /></div>
             });
        });
    } else if (req.type === 'floor' || req.type === 'simple') {
        const displaySqFt = Number(details.finalSqFt) || 0;
        allItems.push({
            id: `${req.type}-${req.id}`,
            description: `${req.marble?.name || 'Marble'} for ${req.type}`,
            size: `Approx. ${displaySqFt.toFixed(2)} sq.ft`,
            qty: '1 Lot'
        });
    }
    
    const finalSqFtValue = Number(details.finalSqFt) || 0;

    return (
        <div className="print-page" data-print-page>
            <PrintLayout letterheadUrl={letterheadUrl}>
              <div className="text-sm flex flex-col min-h-full">
                <header>
                    <div className="text-center">
                        <p className="inline-block border-b-2 border-black px-8 text-2xl font-semibold">DELIVERY CHALLAN</p>
                    </div>
                    <table className="w-full mt-8 text-sm">
                        <tbody>
                            <tr>
                                <td className="w-1/2 align-top">
                                    <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600">Delivery To:</h2>
                                    <p className="font-bold text-base">{name}</p>
                                    <p className="text-gray-700">{address}</p>
                                    <p className="text-gray-700">Phone: {phone}</p>
                                    {(loadLocation || loadSize) && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-gray-300 text-xs text-gray-700">
                                            {loadLocation && <p><strong>Load Location:</strong> {loadLocation}</p>}
                                            {loadSize && <p><strong>Load Size:</strong> {loadSize}</p>}
                                        </div>
                                    )}
                                </td>
                                <td className="w-1/2 align-top text-right">
                                    <p><strong className="text-xs uppercase tracking-wider text-gray-600">Challan No:</strong> {orderId}</p>
                                    <p><strong className="text-xs uppercase tracking-wider text-gray-600">Date:</strong> {new Date(date).toLocaleDateString('en-GB')}</p>
                                    <p><strong className="text-xs uppercase tracking-wider text-gray-600">Item:</strong> {itemNumber} of {totalItems}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </header>
                
                <main className="mt-6 flex-grow">
                    <table className="w-full text-left text-sm border-collapse" style={{tableLayout: 'fixed'}}>
                        <thead className="bg-gray-100">
                            <tr className="border-b-2 border-black">
                                <th className="p-2 font-bold uppercase tracking-wider border" style={{width: '5%'}}>#</th>
                                <th className="p-2 font-bold uppercase tracking-wider border" style={{width: '40%'}}>Description</th>
                                <th className="p-2 text-center font-bold uppercase tracking-wider border" style={{width: '20%'}}>Size/Unit</th>
                                <th className="p-2 text-center font-bold uppercase tracking-wider border" style={{width: '10%'}}>Qty</th>
                                <th className="p-2 text-center font-bold uppercase tracking-wider border" style={{width: '25%'}}>Diagram/Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allItems.map((item, index) => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2 text-center border align-middle">{index + 1}</td>
                                    <td className="p-2 font-semibold border align-middle">{item.description}</td>
                                    <td className="p-2 text-center border align-middle">{item.size}</td>
                                    <td className="p-2 text-center font-bold border align-middle">{item.qty}</td>
                                    <td className="p-2 border align-middle"><div className="flex justify-center items-center h-24">{item.diagram || 'N/A'}</div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {finalSqFtValue > 0 && 
                        <div className="mt-4 text-right font-bold text-sm">
                            <p>Total Area for this item (with wastage): {finalSqFtValue.toFixed(2)} sq.ft</p>
                        </div>
                     }
                </main>

                <footer className="mt-auto pt-8 text-sm">
                    <div className="flex items-end justify-between gap-6 mt-16">
                        <div className="shrink-0">
                            <OrderQrCode orderId={orderId} size={75} showLabel={false} className="border-0 p-0 shadow-none bg-transparent" />
                        </div>
                        <table className="flex-1 w-full">
                            <tbody>
                                <tr>
                                    <td className="w-1/2 pt-4 pr-4">
                                        <div className="border-t-2 border-black pt-1">
                                            <p className="font-bold">Received By (Name & Signature)</p>
                                        </div>
                                    </td>
                                    <td className="w-1/2 pt-4 pl-4">
                                         <div className="border-t-2 border-black pt-1">
                                            <p className="font-bold">Authorized Signature (Stone Expert)</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </footer>
              </div>
            </PrintLayout>
        </div>
    )
}

export const ChallanPrint = React.forwardRef<HTMLDivElement, ChallanPrintProps>(
  (props, ref) => {
    const { requirements = [] } = props;

    if (requirements.length === 0) {
      return (
         <div ref={ref} className="print-page" data-print-page>
            <PrintLayout letterheadUrl={props.letterheadUrl}>
                <p className="text-center">No items found for this challan. Please add items in the calculator.</p>
            </PrintLayout>
        </div>
      )
    };

    return (
      <div ref={ref}>
        {requirements.map((req, index) => (
            <SingleChallanPage
                key={req.id}
                {...props}
                orderId={props.details}
                req={req}
                itemNumber={index + 1}
                totalItems={requirements.length}
            />
        ))}
      </div>
    );
  }
);

ChallanPrint.displayName = 'ChallanPrint';