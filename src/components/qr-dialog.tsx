'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OrderQrCode } from './order-qrcode';
import { Printer, ArrowLeft, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPublicOrigin } from '@/lib/utils';

interface QrDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  order: {
    id: string;
    customerName: string;
    date: string;
    totalPrice?: number;
  } | null;
}

export function QrDialog({ isOpen, setIsOpen, order }: QrDialogProps) {
  const { toast } = useToast();

  if (!order) return null;

  const handlePrintLabel = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const trackingUrl = typeof window !== 'undefined' 
    ? `${getPublicOrigin()}/track-order?orderId=${order.id}`
    : '';

  const handleOpenTracking = () => {
    if (typeof window !== 'undefined' && trackingUrl) {
      window.open(trackingUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* 
        DialogContent is styled to be completely hidden during document printing,
        EXCEPT we mount a print-only container styled with .print-page at the top level
        so only the beautiful tracking label card prints on an A4 sheet.
      */}
      <DialogContent className="max-w-md print:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold font-sans">Track QR Code</DialogTitle>
              <DialogDescription className="text-xs">
                Scan or print this code to track Order #{order.id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mt-2">
          {/* Main Interactive QR Component */}
          <OrderQrCode
            orderId={order.id}
            customerName={order.customerName}
            className="w-full max-w-[280px]"
          />
        </div>

        {/* Info Rows */}
        <div className="space-y-2.5 mt-4 text-xs border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Customer:</span>
            <span className="font-bold text-slate-800">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Date Created:</span>
            <span className="font-semibold text-slate-700">
              {new Date(order.date).toLocaleDateString('en-GB')}
            </span>
          </div>
          {order.totalPrice !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Order Value:</span>
              <span className="font-bold text-slate-900">
                PKR {order.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        {/* Action Tray */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button
            variant="outline"
            onClick={handleOpenTracking}
            className="text-xs font-semibold py-2 h-9 flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Page
          </Button>
          <Button
            onClick={handlePrintLabel}
            className="text-xs font-semibold py-2 h-9 bg-[#0f172a] text-white hover:bg-slate-800 flex items-center justify-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Label Card
          </Button>
        </div>
      </DialogContent>

      {/* 
        PRINT CONTAINER:
        This remains mounted in the portal DOM but is hidden via Tailwind 'hidden'
        on screen, and becomes visible as a full-size A4 A-grade print page during print!
      */}
      <div className="hidden print:block absolute inset-0 bg-white min-h-screen">
        <div className="print-page flex flex-col items-center justify-center p-8 bg-white" data-print-page>
          {/* Branded Outer Frame representing the slab/crate card */}
          <div className="w-[120mm] h-[160mm] border-4 border-double border-slate-800 rounded-2xl p-6 flex flex-col justify-between bg-white text-center shadow-sm">
            
            {/* Header Block */}
            <div className="border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-black tracking-widest text-slate-950 leading-none">STONE EXPERT</h1>
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                PREMIUM FABRICATION & EXPORTS
              </p>
            </div>

            {/* Middle QR Container */}
            <div className="flex flex-col items-center justify-center py-6">
              <OrderQrCode
                orderId={order.id}
                size={140}
                showLabel={false}
                className="border-0 p-0 shadow-none bg-transparent"
              />
              <p className="text-xs font-black text-slate-900 tracking-wider mt-4">
                ORDER ID: {order.id}
              </p>
            </div>

            {/* Bottom Content / Urdu Instructions */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                <table className="w-full text-left text-xs">
                  <tbody>
                    <tr>
                      <td className="font-semibold text-slate-500 pb-1">CUSTOMER:</td>
                      <td className="font-extrabold text-slate-900 pb-1 text-right">{order.customerName.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-slate-500">DATE:</td>
                      <td className="font-bold text-slate-800 text-right">
                        {new Date(order.date).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scan instructions with elegant Urdu */}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Scan to Track Order Progress Online
                </p>
                <p className="text-sm font-semibold text-slate-700 font-sans rtl leading-tight">
                  آن لائن آرڈر کی صورتحال جاننے کیلئے اس کوڈ کو اسکین کریں۔
                </p>
              </div>
            </div>

            {/* Footer Brand Line */}
            <div className="text-[8px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between px-2 font-mono">
              <span>STONE EXPERT SYSTEM</span>
              <span>WWW.STONEEXPERT.COM</span>
            </div>

          </div>
        </div>
      </div>
    </Dialog>
  );
}
