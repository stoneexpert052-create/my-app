'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Loader2, QrCode, Printer, Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPublicOrigin } from '@/lib/utils';

interface OrderQrCodeProps {
  orderId: string;
  customerName?: string;
  totalPrice?: number;
  date?: string;
  className?: string;
  size?: number;
  showLabel?: boolean;
}

export function OrderQrCode({
  orderId,
  customerName,
  totalPrice,
  date,
  className = '',
  size = 150,
  showLabel = true,
}: OrderQrCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();

  const getTrackingUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${getPublicOrigin()}/track-order?orderId=${orderId}`;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    const trackingUrl = getTrackingUrl();

    // Generate QR code with optimal settings
    QRCode.toDataURL(
      trackingUrl,
      {
        margin: 1,
        width: size * 2, // Double resolution for crisp rendering & printing
        color: {
          dark: '#0f172a', // deep slate/black
          light: '#ffffff',
        },
      },
      (err, url) => {
        setLoading(false);
        if (err) {
          console.error('Error generating QR Code', err);
          return;
        }
        setQrCodeUrl(url);
      }
    );
  }, [orderId, size, getTrackingUrl]);

  const handleCopyLink = async () => {
    const url = getTrackingUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link Copied',
        description: 'Tracking link copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to Copy',
        description: 'Could not copy link to clipboard.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-2 min-h-[50px]">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  if (!showLabel) {
    return (
      <div className={`inline-flex flex-col items-center text-center ${className}`}>
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code for Order #${orderId}`}
            width={size}
            height={size}
            className="block aspect-square object-contain mx-auto"
          />
        ) : (
          <QrCode className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-[8px] font-bold text-slate-700 mt-1 uppercase tracking-tight">Track Order ID: {orderId}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm ${className}`}>
      {/* QR Code Frame */}
      <div className="relative p-3 bg-white rounded-lg border-2 border-slate-200/60 shadow-sm group">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code for Order #${orderId}`}
            width={size}
            height={size}
            className="block aspect-square object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center bg-muted text-muted-foreground" style={{ width: size, height: size }}>
            <QrCode className="h-12 w-12" />
            <span className="text-[10px] mt-1">Failed to Load</span>
          </div>
        )}
      </div>

      {/* Info and Callouts */}
      <div className="text-center mt-3 max-w-[240px]">
        <p className="text-[11px] font-bold text-slate-800 tracking-tight select-all">
          ORDER ID: {orderId}
        </p>
        {customerName && (
          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
            Customer: {customerName}
          </p>
        )}
        
        {/* Bilingual Instructions for Pakistani/Urdu target market */}
        <div className="mt-2 border-t border-slate-100 pt-2 space-y-0.5">
          <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
            Scan to Track Order Online
          </p>
          <p className="text-xs text-slate-600 font-medium font-sans rtl leading-tight">
            آن لائن آرڈر ٹریک کرنے کیلئے اسکین کریں۔
          </p>
        </div>
      </div>

      {/* Action Utility Buttons (Hidden during printing) */}
      <div className="flex items-center gap-2 mt-4 w-full print-hidden">
        <button
          onClick={handleCopyLink}
          className="flex-1 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-xs text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
