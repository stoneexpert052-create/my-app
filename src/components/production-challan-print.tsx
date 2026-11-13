
'use client';

import React from 'react';
import Image from 'next/image';
import { VanityLayout } from './vanity-layout';
import { KitchenLayout } from './kitchen-layout';
import { MiniEdgeSelector, edgeProfiles } from './order-form';
import type { Requirement } from '@/lib/types';
import { KitchenDesignerState } from '@/context/calculation-context';
import { PrintLayout } from './PrintLayout';
import { OrderQrCode } from './order-qrcode';

interface ProductionChallanPrintProps {
    name: string;
    requirements: Requirement[];
    letterheadUrl: string;
    details: string; // To get the Order ID
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

const EdgeProfileDisplay: React.FC<{ profileType?: keyof typeof edgeProfiles }> = ({ profileType }) => {
    if (!profileType || profileType === 'none') return <span className="text-muted-foreground italic">No Profile</span>;
    const profile = edgeProfiles[profileType];
    if (!profile) return <span>N/A</span>;
    
    const Icon = profile.icon;

    return (
        <span className="inline-flex flex-col items-center justify-center gap-0.5 align-middle">
            <Icon />
            <span className="font-bold text-red-600 text-[9px] uppercase leading-tight">{profile.name}</span>
        </span>
    );
};

export const ProductionChallanPrint = React.forwardRef<HTMLDivElement, ProductionChallanPrintProps>(
  (props, ref) => {
    const { 
        requirements = [],
        letterheadUrl,
        details: orderId,
    } = props;
    
    const productionRequirements = requirements.filter(req => req.type !== 'fixing_material');

    if (productionRequirements.length === 0) {
        return null;
    }
    
    const groupedSimpleItems = productionRequirements.reduce((acc, req) => {
        if (['stairs', 'window-sill', 'floor', 'simple'].includes(req.type)) {
            const materialName = req.marble?.name || 'Marble';
            if (!acc[materialName]) {
                acc[materialName] = { marble: req.marble!, items: [] };
            }
            acc[materialName].items.push(req);
        }
        return acc;
    }, {} as Record<string, { marble: any; items: Requirement[] }>);

    const complexItems = productionRequirements.filter(req => ['kitchen', 'vanity'].includes(req.type));

    return (
      <div ref={ref} className="space-y-4">
        {Object.entries(groupedSimpleItems).map(([materialName, group]) => (
           <div key={`simple-group-${materialName}`} className="print-page" data-print-page>
               <PrintLayout letterheadUrl={letterheadUrl}>
                    <div className="flex flex-col min-h-full">
                        <header>
                            <div className="text-center border-b-2 border-black pb-2">
                                <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">Production Challan: Standard Items</h2>
                                <div className="flex justify-between items-center mt-2 px-4">
                                    <p className="text-sm"><strong>Order No:</strong> {orderId}</p>
                                    <div className="flex items-center gap-2">
                                        <strong>Material:</strong>
                                        {group.marble?.imageUrl && <Image src={group.marble.imageUrl} alt={materialName} width={24} height={24} className="rounded-sm object-cover" />}
                                        <span className="font-bold">{materialName}</span>
                                    </div>
                                    <p className="text-sm"><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>
                        </header>
                        <main className="mt-4 flex-grow">
                            <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead className="bg-gray-100">
                                <tr className="border-b-2 border-black">
                                    <th className="p-1 text-center border" style={{width: '5%'}}>#</th>
                                    <th className="p-1 text-left border" style={{width: '35%'}}>Type</th>
                                    <th className="p-1 text-center border" style={{width: '15%'}}>Size (W x L)</th>
                                    <th className="p-1 text-center border" style={{width: '10%'}}>Qty</th>
                                    <th className="p-1 text-center border" style={{width: '15%'}}>Edge Profile</th>
                                    <th className="p-1 text-center border" style={{width: '20%'}}>Diagram</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {group.items.flatMap((simpleReq, i) => {
                                        const details = simpleReq.details || {};
                                        const rows = simpleReq.type === 'stairs' ? details.dimensionRows : simpleReq.type === 'window-sill' ? details.windowSillRows : [];
                                        if (rows && rows.length > 0) {
                                            const tableRows: React.ReactNode[] = [];
                                            rows.forEach((row: any, rowIndex: number) => {
                                                tableRows.push(
                                                    <tr key={`${simpleReq.id}-${row.id}-tread`} className="border-b page-break-inside-avoid">
                                                        <td className="p-1 text-center border align-middle">{i + rowIndex + 1}</td>
                                                        <td className="p-1 font-semibold border align-middle">{simpleReq.name} (Tread)</td>
                                                        <td className="p-1 text-center font-semibold border align-middle">{row.width}" x {row.length}"</td>
                                                        <td className="p-1 text-center font-bold border align-middle">{row.quantity}</td>
                                                        <td className="p-1 text-center border align-middle"><EdgeProfileDisplay profileType={details.globalProfileType} /></td>
                                                        <td className="p-1 border align-middle">
                                                            <div className="w-full h-24 flex items-center justify-center">
                                                                <MiniEdgeSelector edges={row.edges} width={parseSutarValue(row.width)} length={parseSutarValue(row.length)} onEdgeClick={() => {}} disabled={true} widthStr={row.width} lengthStr={row.length} innerCut={'innerCut' in row ? parseSutarValue(row.innerCut) : 0} isPrintMode={true} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                                
                                                if (simpleReq.type === 'stairs' && row.riser) {
                                                    if (row.riser.width && row.riser.length && row.riser.quantity) {
                                                        tableRows.push(
                                                            <tr key={`${simpleReq.id}-${row.id}-riser`} className="border-b page-break-inside-avoid bg-gray-50/50">
                                                                <td className="p-1 text-center border align-middle"></td>
                                                                <td className="p-1 text-gray-600 border align-middle font-medium pl-4">↳ Riser</td>
                                                                <td className="p-1 text-center border align-middle font-medium">{row.riser.width}" x {row.riser.length}"</td>
                                                                <td className="p-1 text-center border align-middle font-bold">{row.riser.quantity}</td>
                                                                <td className="p-1 text-center border align-middle">-</td>
                                                                <td className="p-1 text-center text-xs text-gray-500 border align-middle">Riser Material</td>
                                                            </tr>
                                                        );
                                                    }
                                                    if (row.riser.hasSkirting && row.riser.skirtingLength) {
                                                        const typeText = row.riser.skirtingType === 'two-sided' ? '2-Sided' : '1-Sided';
                                                        tableRows.push(
                                                            <tr key={`${simpleReq.id}-${row.id}-skirting`} className="border-b page-break-inside-avoid bg-gray-50/50">
                                                                <td className="p-1 text-center border align-middle"></td>
                                                                <td className="p-1 text-gray-600 border align-middle font-medium pl-4">↳ Skirting ({typeText})</td>
                                                                <td className="p-1 text-center border align-middle font-medium">6" x {row.riser.skirtingLength}"</td>
                                                                <td className="p-1 text-center border align-middle font-bold">{row.quantity}</td>
                                                                <td className="p-1 text-center border align-middle">-</td>
                                                                <td className="p-1 text-center text-xs text-gray-500 border align-middle">Skirting Material</td>
                                                            </tr>
                                                        );
                                                    }
                                                }
                                            });
                                            return tableRows;
                                        } else if (simpleReq.type === 'floor' || simpleReq.type === 'simple') {
                                        const rawSqFt = Number(details.totalFloorArea || details.totalArea) || 0;
                                        return (
                                            <tr key={simpleReq.id} className="border-b">
                                            <td className="p-1 text-center border align-middle">{i + 1}</td>
                                            <td className="p-1 font-semibold border align-middle">{simpleReq.name}</td>
                                            <td colSpan={4} className="p-1 text-center border align-middle py-4 font-bold">Raw Area: {rawSqFt.toFixed(2)} sq.ft</td>
                                            </tr>
                                        )
                                        }
                                        return null;
                                    })}
                                </tbody>
                            </table>
                        </main>
                         <footer className="mt-4 pt-4 border-t border-gray-300">
                            <div className="flex justify-between items-end px-8 py-4">
                                <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Checker Signature</p></div>
                                <OrderQrCode orderId={orderId} size={65} showLabel={false} className="border-0 p-0 shadow-none bg-transparent" />
                                <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Factory Manager</p></div>
                            </div>
                        </footer>
                    </div>
                </PrintLayout>
           </div>
        ))}
        
        {complexItems.map((req) => {
            const reqDetails = req.details || {};
             if (req.type === 'kitchen') {
                  const kitchenDetails = reqDetails as KitchenDesignerState;
                  if (!kitchenDetails || !kitchenDetails.layout) return null;
                  const rawSqFt = Number((kitchenDetails as any).totalSqFt) || 0;
                  return (
                    <div key={`kitchen-prod-${req.id}`} className="print-page" data-print-page>
                         <PrintLayout letterheadUrl={letterheadUrl}>
                            <div className="flex flex-col min-h-full">
                                <header>
                                    <div className="text-center border-b-2 border-black pb-2">
                                        <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">Production Details: Kitchen - {req.name}</h2>
                                        <div className="flex justify-between items-center mt-2 px-2">
                                            <p className="text-xs"><strong>Order:</strong> {orderId}</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <strong>Material:</strong>
                                                {req.marble?.imageUrl && <Image src={req.marble.imageUrl} alt={req.marble.name} width={20} height={20} className="rounded-sm object-cover" />}
                                                <span>{req.marble?.name || 'Marble'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <strong>Edge:</strong> 
                                                <EdgeProfileDisplay profileType={kitchenDetails.profileType} />
                                            </div>
                                            <p className="text-xs"><strong>Area:</strong> {rawSqFt.toFixed(2)} sq.ft</p>
                                        </div>
                                    </div>
                                </header>
                                <main className="mt-4 w-full border-2 border-dashed flex-grow h-[180mm] overflow-hidden bg-white">
                                    <KitchenLayout layout={kitchenDetails.layout!} dimensions={{top: kitchenDetails.topPiece, left: kitchenDetails.leftPiece, right: kitchenDetails.rightPiece, islands: kitchenDetails.islands || [],}} textureUrl="" onEdgeToggle={() => {}} selectedEdges={kitchenDetails.selectedEdges || {}} isDimensioningMode={true} isPrintMode={true} onCutoutChange={() => {}} activeCutout={null} setActiveCutout={() => {}} zoom={1} />
                                </main>
                                 <footer className="mt-4 pt-4">
                                    <div className="flex justify-between items-end px-8">
                                        <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Cutter Signature</p></div>
                                        <OrderQrCode orderId={orderId} size={65} showLabel={false} className="border-0 p-0 shadow-none bg-transparent" />
                                        <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Polisher Signature</p></div>
                                    </div>
                                </footer>
                            </div>
                        </PrintLayout>
                    </div>
                )}
                
                if (req.type === 'vanity') {
                   if (!reqDetails.vanities) return null;
                    return reqDetails.vanities.map((vanity: any) => {
                        const vanityRawSqFt = Number(vanity.calculations?.totalArea) || 0;
                        return (
                           <div key={`vanity-prod-${vanity.id}`} className="print-page" data-print-page>
                               <PrintLayout letterheadUrl={letterheadUrl}>
                                <div className="flex flex-col min-h-full">
                                    <header>
                                        <div className="text-center border-b-2 border-black pb-2">
                                            <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">Production Details: {vanity.name}</h2>
                                            <div className="flex justify-between items-center mt-2 px-2">
                                                <p className="text-xs"><strong>Order:</strong> {orderId}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <strong>Material:</strong>
                                                    {req.marble?.imageUrl && <Image src={req.marble.imageUrl} alt={req.marble.name} width={20} height={20} className="rounded-sm object-cover" />}
                                                    <span>{req.marble?.name || 'Marble'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <strong>Edge:</strong> 
                                                    <EdgeProfileDisplay profileType={vanity.profileType} />
                                                </div>
                                                <p className="text-xs"><strong>Area:</strong> {vanityRawSqFt.toFixed(2)} sq.ft</p>
                                            </div>
                                        </div>
                                    </header>
                                    <main className="mt-4 w-full border-2 border-dashed flex-grow h-[180mm] overflow-hidden bg-white">
                                        <VanityLayout layout={vanity.layout} dimensions={vanity} profileType={vanity.profileType} selectedEdges={vanity.selectedEdges} onEdgeToggle={() => {}} marbleImageUrl="" sinks={vanity.sinks} backsplash={vanity.backsplash} lutak={vanity.lutak} isPrintMode={true} zoom={1} />
                                    </main>
                                     <footer className="mt-4 pt-4">
                                        <div className="flex justify-between items-end px-8">
                                            <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Production Head</p></div>
                                            <OrderQrCode orderId={orderId} size={65} showLabel={false} className="border-0 p-0 shadow-none bg-transparent" />
                                            <div className="text-center border-t border-black pt-1 w-48"><p className="text-[10px] font-bold">Quality Check</p></div>
                                        </div>
                                    </footer>
                                </div>
                              </PrintLayout>
                          </div>
                        )
                    })
                }

                return null;
        })}
      </div>
    );
  }
);

ProductionChallanPrint.displayName = 'ProductionChallanPrint';
