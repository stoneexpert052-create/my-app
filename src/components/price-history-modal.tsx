'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getProductPriceHistory,
  type PriceHistoryEntry
} from '@/lib/admin-actions';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Loader2,
  Plus,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PriceHistoryTargetProduct {
  rowId: string;
  productId: string;
  variantId?: string;
  name: string;
  baseName?: string;
  variantLabel?: string;
  type: 'marble' | 'fixing_material';
  price: number;
  unit?: string;
  imageUrl?: string;
}

interface PriceHistoryModalProps {
  product: PriceHistoryTargetProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePrice?: (newPrice: number) => Promise<void> | void;
}

interface ChartPoint {
  index: number;
  price: number;
  previousPrice: number | null;
  delta: number;
  dateLabel: string;
  fullDate: string;
  source: PriceHistoryEntry['source'];
  note?: string;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short'
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const SOURCE_LABELS: Record<PriceHistoryEntry['source'], { label: string; className: string }> = {
  manual: {
    label: 'Manual Edit',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
  },
  bulk: {
    label: 'Bulk Adjust',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  },
  supplier_markup: {
    label: 'Supplier Sync',
    className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
  },
  initial: {
    label: 'Baseline Rate',
    className: 'bg-muted text-muted-foreground border-border'
  }
};

export function PriceHistoryModal({
  product,
  open,
  onOpenChange,
  onUpdatePrice
}: PriceHistoryModalProps) {
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!product?.rowId) return;
    setLoading(true);
    try {
      const list = await getProductPriceHistory(product.rowId, product.productId);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [product?.rowId, product?.productId]);

  useEffect(() => {
    if (open && product) {
      setNewPriceInput(String(product.price ?? 0));
      loadHistory();
    }
  }, [open, product, loadHistory]);

  // Build chronological sparkline points:
  // If history exists, include the very first entry's previousPrice as the starting point (if > 0)
  // so even a single edit immediately forms a meaningful 2-point trajectory!
  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!product) return [];

    if (entries.length === 0) {
      const nowIso = new Date().toISOString();
      const base = Number(product.price || 0);
      return [
        {
          index: 0,
          price: base,
          previousPrice: null,
          delta: 0,
          dateLabel: 'Current',
          fullDate: formatDateTime(nowIso),
          source: 'initial',
          note: 'Current retail rate (baseline)'
        },
        {
          index: 1,
          price: base,
          previousPrice: base,
          delta: 0,
          dateLabel: 'Today',
          fullDate: formatDateTime(nowIso),
          source: 'initial',
          note: 'Current retail rate'
        }
      ];
    }

    const points: ChartPoint[] = [];
    const first = entries[0];
    if (
      typeof first.previousPrice === 'number' &&
      first.previousPrice > 0 &&
      first.previousPrice !== first.newPrice
    ) {
      const beforeDate = new Date(
        new Date(first.recordedAt).getTime() - 60 * 1000
      ).toISOString();
      points.push({
        index: 0,
        price: first.previousPrice,
        previousPrice: null,
        delta: 0,
        dateLabel: 'Prior',
        fullDate: formatDateTime(beforeDate),
        source: 'initial',
        note: 'Rate before first recorded edit'
      });
    }

    entries.forEach((e) => {
      const prev =
        points.length > 0
          ? points[points.length - 1].price
          : e.previousPrice;
      const delta =
        typeof prev === 'number' && !Number.isNaN(prev)
          ? e.newPrice - prev
          : 0;
      points.push({
        index: points.length,
        price: e.newPrice,
        previousPrice: prev,
        delta,
        dateLabel: formatDateShort(e.recordedAt),
        fullDate: formatDateTime(e.recordedAt),
        source: e.source,
        note: e.note
      });
    });

    // If only 1 single point exists, mirror it slightly so sparkline draws a clean visible line
    if (points.length === 1) {
      points.push({
        ...points[0],
        index: 1,
        dateLabel: 'Current',
        delta: 0
      });
    }

    return points;
  }, [entries, product]);

  const stats = useMemo(() => {
    const prices = chartPoints.map(p => p.price).filter(p => typeof p === 'number');
    if (prices.length === 0) {
      return {
        current: product?.price || 0,
        first: product?.price || 0,
        min: product?.price || 0,
        max: product?.price || 0,
        avg: product?.price || 0,
        netDiff: 0,
        netPct: 0
      };
    }
    const first = prices[0];
    const current = product?.price ?? prices[prices.length - 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((s, v) => s + v, 0) / prices.length);
    const netDiff = current - first;
    const netPct = first > 0 ? Number(((netDiff / first) * 100).toFixed(1)) : 0;
    return { current, first, min, max, avg, netDiff, netPct };
  }, [chartPoints, product?.price]);

  const trendStroke =
    stats.netDiff > 0 ? '#10b981' : stats.netDiff < 0 ? '#ef4444' : '#6366f1';

  const handleQuickPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !onUpdatePrice) return;
    const val = Number(newPriceInput);
    if (Number.isNaN(val) || val < 0 || val === product.price) return;

    setUpdatingPrice(true);
    try {
      await onUpdatePrice(val);
      await loadHistory();
    } finally {
      setUpdatingPrice(false);
    }
  };

  const yDomain = useMemo<[number, number]>(() => {
    if (stats.min === stats.max) {
      const pad = Math.max(10, Math.round((stats.min || 100) * 0.1));
      return [Math.max(0, stats.min - pad), stats.max + pad];
    }
    const spread = stats.max - stats.min;
    const pad = Math.max(5, Math.round(spread * 0.18));
    return [Math.max(0, stats.min - pad), stats.max + pad];
  }, [stats.min, stats.max]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        {product && (
          <>
            {/* Header */}
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 bg-muted/20">
              <div className="flex items-start gap-3 pr-6">
                {product.imageUrl && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                      unoptimized={product.imageUrl.startsWith('data:')}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-headline text-base font-extrabold flex items-center gap-2 leading-tight">
                    <History className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{product.baseName || product.name}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1 flex flex-wrap items-center gap-1.5">
                    {product.variantLabel && (
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {product.variantLabel}
                      </Badge>
                    )}
                    <span>
                      Price history &amp; trend sparkline (PKR/{product.unit || 'sqft'})
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Current Rate
                  </span>
                  <span className="text-base font-black font-mono tabular-nums text-foreground block mt-0.5">
                    Rs {stats.current.toLocaleString()}
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Net Change
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {stats.netDiff > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : stats.netDiff < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-black font-mono tabular-nums',
                        stats.netDiff > 0 && 'text-emerald-600 dark:text-emerald-400',
                        stats.netDiff < 0 && 'text-red-600 dark:text-red-400',
                        stats.netDiff === 0 && 'text-muted-foreground'
                      )}
                    >
                      {stats.netDiff > 0 ? '+' : ''}
                      {stats.netDiff.toLocaleString()}
                      {stats.netDiff !== 0 ? ` (${stats.netPct > 0 ? '+' : ''}${stats.netPct}%)` : ''}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Min – Max
                  </span>
                  <span className="text-xs font-extrabold font-mono tabular-nums text-foreground block mt-1">
                    Rs {stats.min.toLocaleString()} – {stats.max.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Sparkline Chart Card */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-foreground">
                    Price Trend Sparkline
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {entries.length === 0
                      ? 'Baseline only — edit price to track changes'
                      : `${entries.length} recorded ${entries.length === 1 ? 'change' : 'changes'}`}
                  </span>
                </div>

                {loading ? (
                  <div className="h-32 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading price history...</span>
                  </div>
                ) : (
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartPoints}
                        margin={{ top: 10, right: 10, left: 10, bottom: 6 }}
                      >
                        <defs>
                          <linearGradient id={`sparkFill-${product.rowId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={trendStroke} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={trendStroke} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <YAxis hide domain={yDomain} />
                        <ReferenceLine
                          y={stats.avg}
                          stroke="currentColor"
                          strokeOpacity={0.2}
                          strokeDasharray="3 3"
                        />
                        <Tooltip
                          cursor={{ stroke: trendStroke, strokeWidth: 1, strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const pt = payload[0].payload as ChartPoint;
                            return (
                              <div className="rounded-lg border border-border bg-popover text-popover-foreground px-3 py-2 shadow-lg text-xs space-y-0.5">
                                <p className="font-mono font-black text-sm">
                                  PKR {pt.price.toLocaleString()}
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    /{product.unit || 'sqft'}
                                  </span>
                                </p>
                                {pt.delta !== 0 && (
                                  <p
                                    className={cn(
                                      'text-[11px] font-mono font-bold',
                                      pt.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                                    )}
                                  >
                                    {pt.delta > 0 ? '+' : ''}
                                    PKR {pt.delta.toLocaleString()} vs previous
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground">{pt.fullDate}</p>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={trendStroke}
                          strokeWidth={2.5}
                          fill={`url(#sparkFill-${product.rowId})`}
                          dot={{ r: 3.5, fill: trendStroke, strokeWidth: 1.5, stroke: '#ffffff' }}
                          activeDot={{ r: 5.5, fill: trendStroke, strokeWidth: 2, stroke: '#ffffff' }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                  <span>{chartPoints[0]?.dateLabel || 'Start'}</span>
                  <span>Avg: Rs {stats.avg.toLocaleString()}</span>
                  <span>{chartPoints[chartPoints.length - 1]?.dateLabel || 'Now'}</span>
                </div>
              </div>

              {/* Quick Inline Price Update -> Immediately updates product & plots on sparkline */}
              {onUpdatePrice && (
                <form
                  onSubmit={handleQuickPriceSubmit}
                  className="rounded-xl border border-border/80 bg-card p-3 flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  <div className="flex-1 min-w-[140px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Update Retail Rate &amp; Log Point
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground">
                        Rs
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="h-8 pl-8 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      updatingPrice ||
                      Number(newPriceInput) === product.price ||
                      Number.isNaN(Number(newPriceInput))
                    }
                    className="h-8 self-end gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    {updatingPrice ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Save &amp; Plot</span>
                  </Button>
                </form>
              )}

              {/* Historical Change Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Change History Log</span>
                </h4>

                {entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No prior price edits have been logged for this item yet. Whenever you update the retail rate in Manage Stock or above, every price point is automatically saved and charted here.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 divide-y divide-border/60 max-h-52 overflow-y-auto bg-card">
                    {[...entries].reverse().map((entry) => {
                      const diff =
                        typeof entry.previousPrice === 'number'
                          ? entry.newPrice - entry.previousPrice
                          : 0;
                      const srcMeta = SOURCE_LABELS[entry.source] || SOURCE_LABELS.manual;
                      return (
                        <div
                          key={entry.id}
                          className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 font-mono font-bold">
                              {typeof entry.previousPrice === 'number' ? (
                                <>
                                  <span className="text-muted-foreground line-through">
                                    Rs {entry.previousPrice.toLocaleString()}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                </>
                              ) : null}
                              <span className="text-foreground">
                                Rs {entry.newPrice.toLocaleString()}
                              </span>
                              {diff !== 0 && (
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded font-extrabold',
                                    diff > 0
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-red-500/15 text-red-700 dark:text-red-400'
                                  )}
                                >
                                  {diff > 0 ? '+' : ''}
                                  {diff.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatDateTime(entry.recordedAt)}
                              {entry.note ? ` · ${entry.note}` : ''}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={cn('text-[10px] font-bold shrink-0', srcMeta.className)}
                          >
                            {srcMeta.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
