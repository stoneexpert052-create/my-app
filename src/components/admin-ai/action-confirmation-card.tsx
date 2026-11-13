'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  Tag,
  Layers,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  FileSpreadsheet,
  Store
} from 'lucide-react';
import type { AdminActionProposal } from '@/app/api/admin-ai/chat/route';

interface ActionConfirmationCardProps {
  proposal: AdminActionProposal;
  onExecuted?: (result: { success: boolean; messageUr?: string; messageEn?: string }) => void;
  onCancelled?: () => void;
  language?: 'ur' | 'en';
}

export function ActionConfirmationCard({
  proposal,
  onExecuted,
  onCancelled,
  language = 'ur'
}: ActionConfirmationCardProps) {
  const [status, setStatus] = useState<'pending' | 'executing' | 'applied' | 'cancelled' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Interactive editable state for BULK_SUPPLIER_RATE_UPDATE
  const isBulkSupplierUpdate = proposal.actionType === 'BULK_SUPPLIER_RATE_UPDATE';
  const [supplierName, setSupplierName] = useState<string>(
    proposal.payload?.supplierName || proposal.targetName || 'Marble Supplier'
  );
  const [syncToApp, setSyncToApp] = useState<boolean>(
    proposal.payload?.syncToApp !== undefined ? Boolean(proposal.payload.syncToApp) : true
  );
  const [markupPercentage, setMarkupPercentage] = useState<number>(
    Number(proposal.payload?.markupPercentage) || 0
  );
  const [editableRates, setEditableRates] = useState<Array<any>>(
    Array.isArray(proposal.payload?.rates) ? proposal.payload.rates : []
  );

  const getActionIcon = () => {
    switch (proposal.actionType) {
      case 'BULK_SUPPLIER_RATE_UPDATE':
      case 'APPLY_SUPPLIER_MARKUP':
        return <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'UPDATE_MARBLE_PRICE':
      case 'UPDATE_FIXING_PRICE':
        return <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'APPLY_BULK_SALE':
      case 'CLEAR_BULK_SALE':
        return <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />;
      case 'UPDATE_STOCK_STATUS':
        return <Layers className="h-4 w-4 text-blue-500" />;
      case 'UPDATE_PRODUCT_IMAGE':
        return <ImageIcon className="h-4 w-4 text-purple-500" />;
      case 'ADD_PRODUCT':
        return <PlusCircle className="h-4 w-4 text-green-500" />;
      case 'DELETE_PRODUCT':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const handleRateItemChange = (index: number, newRateVal: string) => {
    const parsed = Number(newRateVal);
    setEditableRates(prev =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              supplierRate: isNaN(parsed) ? 0 : parsed,
              appPrice: isNaN(parsed) ? 0 : Math.round(parsed * (1 + markupPercentage / 100))
            }
          : item
      )
    );
  };

  const handleConfirm = async () => {
    setStatus('executing');
    setErrorMessage(null);

    const finalPayload = isBulkSupplierUpdate
      ? {
          ...proposal.payload,
          supplierName,
          syncToApp,
          markupPercentage,
          rates: editableRates.map(r => ({
            ...r,
            appPrice: Math.round(Number(r.supplierRate || 0) * (1 + markupPercentage / 100))
          }))
        }
      : proposal.payload;

    try {
      const res = await fetch('/api/admin-ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: proposal.actionType,
          targetId: proposal.targetId,
          targetName: isBulkSupplierUpdate ? supplierName : proposal.targetName,
          payload: finalPayload,
          confirmed: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('applied');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('products_updated', { detail: data }));
        }
        onExecuted?.(data);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Execution failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error occurred');
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    onCancelled?.();
  };

  const isUrdu = language === 'ur';

  return (
    <Card className="my-3 border-2 border-amber-500/40 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 shadow-md overflow-hidden rounded-xl">
      <CardHeader className="p-3.5 pb-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-background border shadow-xs">
            {getActionIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-foreground">
                {proposal.title || (isUrdu ? 'کارروائی کی تصدیق مطلوب ہے' : 'Action Confirmation Required')}
              </CardTitle>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {isBulkSupplierUpdate
                ? `سپلائر: ${supplierName} (${editableRates.length} آئٹمز)`
                : proposal.targetName
                ? `Target: ${proposal.targetName}`
                : 'Database Action'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
          {proposal.badgeLabel || proposal.actionType}
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5 text-xs space-y-3">
        <p className="text-foreground/90 font-medium leading-relaxed" dir="auto">
          {proposal.description}
        </p>

        {/* Special interactive table for BULK_SUPPLIER_RATE_UPDATE */}
        {isBulkSupplierUpdate && (
          <div className="space-y-2.5 bg-background/90 p-3 rounded-lg border border-border/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  سپلائر کا نام (Supplier Name)
                </label>
                <Input
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  disabled={status !== 'pending'}
                  className="h-8 text-xs font-bold"
                  placeholder="مثلاً Al Majeed Marble Factory"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  اضافی منافع / مارک اپ % (App Markup %)
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={markupPercentage}
                    onChange={e => setMarkupPercentage(Number(e.target.value) || 0)}
                    disabled={status !== 'pending' || !syncToApp}
                    className="h-8 text-xs font-bold"
                    min={-50}
                    max={200}
                  />
                  <span className="text-[11px] font-bold text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-foreground">
                    پوری ایپ کے کسٹمر ریٹس بھی اپ ڈیٹ کریں (Sync to Entire App)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    آن رکھنے سے اسٹاک مینجمنٹ کے ساتھ ساتھ ایپ میں نظر آنے والے ریٹ بھی اپ ڈیٹ ہو جائیں گے
                  </p>
                </div>
              </div>
              <Switch
                checked={syncToApp}
                onCheckedChange={setSyncToApp}
                disabled={status !== 'pending'}
              />
            </div>

            {editableRates.length > 0 && (
              <div className="max-h-56 overflow-y-auto border rounded-lg">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/80 sticky top-0 border-b">
                    <tr>
                      <th className="text-left p-1.5 font-bold">پتھر / آئٹم (Item)</th>
                      <th className="text-right p-1.5 font-bold">سپلائر ریٹ (PKR)</th>
                      {syncToApp && (
                        <th className="text-right p-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                          ایپ ریٹ (App Rate)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {editableRates.map((item, idx) => {
                      const supRate = Number(item.supplierRate) || 0;
                      const calcAppRate = Math.round(supRate * (1 + markupPercentage / 100));
                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-1.5 font-medium">
                            <div>{item.itemName}</div>
                            {item.variantName && (
                              <span className="text-[10px] text-muted-foreground block">
                                {item.variantName}
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 text-right w-24">
                            <Input
                              type="number"
                              value={supRate}
                              onChange={e => handleRateItemChange(idx, e.target.value)}
                              disabled={status !== 'pending'}
                              className="h-6 text-[11px] text-right font-bold px-1.5"
                            />
                          </td>
                          {syncToApp && (
                            <td className="p-1.5 text-right font-black text-emerald-600 dark:text-emerald-400 w-24">
                              Rs. {calcAppRate.toLocaleString()}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isBulkSupplierUpdate && (proposal.previousValue || proposal.newValue) && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border/60">
            {proposal.previousValue && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {isUrdu ? 'موجودہ (Old)' : 'Current'}
                </span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 line-through">
                  {proposal.previousValue}
                </span>
              </div>
            )}

            {proposal.previousValue && proposal.newValue && (
              <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
            )}

            {proposal.newValue && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {isUrdu ? 'نئی ویلیو (New)' : 'Proposed'}
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {proposal.newValue}
                </span>
              </div>
            )}
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
            ⚠️ {errorMessage}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-3 bg-muted/40 border-t border-amber-500/20 flex items-center justify-end gap-2">
        {status === 'pending' || status === 'error' ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-xs font-semibold border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950/50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {isUrdu ? 'منسوخ کریں (Cancel)' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {isUrdu ? 'اوکے، تمام ریٹس اپ ڈیٹ کریں (Confirm)' : 'Confirm & Apply'}
            </Button>
          </>
        ) : status === 'executing' ? (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 py-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isUrdu ? 'سپلائر اور ایپ کے ریٹس اپ ڈیٹ ہو رہے ہیں...' : 'Updating supplier & app rates...'}</span>
          </div>
        ) : status === 'applied' ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 py-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>{isUrdu ? 'کامیابی سے سپلائر اور ایپ کے ریٹس اپ ڈیٹ ہو گئے!' : 'Successfully Applied & Synced!'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground py-1">
            <XCircle className="h-4 w-4" />
            <span>{isUrdu ? 'تبدیلی منسوخ کر دی گئی' : 'Action Cancelled'}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
