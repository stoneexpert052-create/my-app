'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Mic, 
  TrendingUp, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Filter, 
  Clock, 
  Volume2, 
  Type,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getSearchLogs, deleteSearchLog, clearAllSearchLogs } from '@/lib/admin-actions';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchLog {
  id: string;
  term: string;
  rawTerm?: string;
  found?: boolean;
  source?: string;
  timestamp: string;
}

export default function SearchAnalyticsPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTermFilter, setSearchTermFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'found'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'voice' | 'text'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getSearchLogs();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load search logs", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load search logs." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteSearchLog(id);
    if (res.success) {
      setLogs(prev => prev.filter(item => item.id !== id));
      toast({ title: "Deleted", description: "Search record deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error || "Delete failed." });
    }
    setDeletingId(null);
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all search logs? This cannot be undone.")) return;
    setIsClearingAll(true);
    const res = await clearAllSearchLogs();
    if (res.success) {
      setLogs([]);
      toast({ title: "Cleared", description: "All search logs have been cleared." });
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error || "Clear failed." });
    }
    setIsClearingAll(false);
  };

  // Aggregated analytics
  const totalSearches = logs.length;
  const voiceSearches = logs.filter(l => l.source === 'voice').length;
  const textSearches = logs.filter(l => l.source !== 'voice').length;
  const missingSearches = logs.filter(l => l.found === false);
  const foundSearches = logs.filter(l => l.found === true);

  // Group missing searches by term to rank demand
  const missingDemandMap: Record<string, { term: string; count: number; voiceCount: number; textCount: number; lastSearched: string }> = {};
  
  missingSearches.forEach(log => {
    const termKey = (log.term || log.rawTerm || '').trim().toLowerCase();
    if (!termKey) return;
    if (!missingDemandMap[termKey]) {
      missingDemandMap[termKey] = {
        term: log.rawTerm || log.term,
        count: 0,
        voiceCount: 0,
        textCount: 0,
        lastSearched: log.timestamp
      };
    }
    missingDemandMap[termKey].count += 1;
    if (log.source === 'voice') {
      missingDemandMap[termKey].voiceCount += 1;
    } else {
      missingDemandMap[termKey].textCount += 1;
    }
    if (new Date(log.timestamp) > new Date(missingDemandMap[termKey].lastSearched)) {
      missingDemandMap[termKey].lastSearched = log.timestamp;
    }
  });

  const rankedMissingProducts = Object.values(missingDemandMap).sort((a, b) => b.count - a.count);

  // Filtered log table
  const filteredLogs = logs.filter(log => {
    const termMatch = (log.term || '').toLowerCase().includes(searchTermFilter.toLowerCase()) ||
                      (log.rawTerm || '').toLowerCase().includes(searchTermFilter.toLowerCase());
    
    let statusMatch = true;
    if (statusFilter === 'missing') statusMatch = log.found === false;
    if (statusFilter === 'found') statusMatch = log.found === true;

    let sourceMatch = true;
    if (sourceFilter === 'voice') sourceMatch = log.source === 'voice';
    if (sourceFilter === 'text') sourceMatch = log.source !== 'voice';

    return termMatch && statusMatch && sourceMatch;
  });

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
                Search Analytics & Product Demand
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track customer search queries, discover in-demand missing products, and identify new inventory opportunities.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {logs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={isClearingAll} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All Logs
            </Button>
          )}
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border/80 bg-card shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Searches
            </CardTitle>
            <Search className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-extrabold">{totalSearches}</div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <Type className="h-3 w-3" /> {textSearches} text
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Mic className="h-3 w-3" /> {voiceSearches} voice
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Unmet Demand (Missing)
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-extrabold text-amber-600">{missingSearches.length}</div>
                <p className="text-xs text-amber-700/80 mt-2 font-medium">
                  {rankedMissingProducts.length} unique items requested by customers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Available Products Match
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-extrabold text-emerald-600">{foundSearches.length}</div>
                <p className="text-xs text-emerald-700/80 mt-2 font-medium">
                  {totalSearches > 0 ? Math.round((foundSearches.length / totalSearches) * 100) : 0}% catalog match rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Voice Search Usage
            </CardTitle>
            <Mic className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-extrabold">{voiceSearches}</div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  {totalSearches > 0 ? Math.round((voiceSearches / totalSearches) * 100) : 0}% spoken queries
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MAIN TABS SECTION */}
      <Tabs defaultValue="demand" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md bg-muted/80 p-1 rounded-xl">
          <TabsTrigger value="demand" className="rounded-lg font-semibold gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Top Requested Products ({rankedMissingProducts.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg font-semibold gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Live Search Stream ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TOP REQUESTED MISSING PRODUCTS */}
        <TabsContent value="demand" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    High-Demand Missing Products
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Products that customers explicitly searched or spoke for, but were not found in your inventory. Add these to increase sales!
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit bg-amber-500/10 text-amber-600 border-amber-500/30 px-3 py-1 text-xs">
                  {rankedMissingProducts.length} Items Identified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : rankedMissingProducts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-3" />
                  <h3 className="font-bold text-base text-foreground">No Unmet Search Demand Logged Yet</h3>
                  <p className="text-xs mt-1 max-w-md mx-auto">
                    When customers search or use voice search for products not currently in stock, they will be aggregated here automatically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {rankedMissingProducts.map((item, index) => (
                    <div key={item.term} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-extrabold flex items-center justify-center shrink-0 text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-base capitalize text-foreground">
                              {item.term}
                            </span>
                            <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs">
                              Searched {item.count} {item.count === 1 ? 'time' : 'times'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                            {item.voiceCount > 0 && (
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <Mic className="h-3 w-3" /> {item.voiceCount} voice
                              </span>
                            )}
                            {item.textCount > 0 && (
                              <span className="flex items-center gap-1 text-slate-600 font-medium">
                                <Type className="h-3 w-3" /> {item.textCount} typed
                              </span>
                            )}
                            <span>•</span>
                            <span>Last searched: {new Date(item.lastSearched).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold rounded-lg shadow-sm">
                          <Link href={`/dashboard/manage-products?add=${encodeURIComponent(item.term)}`}>
                            <Plus className="h-4 w-4" />
                            Add to Catalog
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LIVE SEARCH LOG STREAM */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">All Recorded Customer Searches</CardTitle>
                  <CardDescription className="text-xs">
                    Detailed log history of every voice and text query made on the storefront.
                  </CardDescription>
                </div>

                {/* FILTERS */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Filter term..." 
                      value={searchTermFilter}
                      onChange={(e) => setSearchTermFilter(e.target.value)}
                      className="pl-8 h-8 text-xs rounded-lg"
                    />
                  </div>

                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="h-8 text-xs rounded-lg bg-background border border-input px-2.5 font-medium text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="missing">Missing / Coming Soon</option>
                    <option value="found">In Inventory</option>
                  </select>

                  <select 
                    value={sourceFilter} 
                    onChange={(e) => setSourceFilter(e.target.value as any)}
                    className="h-8 text-xs rounded-lg bg-background border border-input px-2.5 font-medium text-foreground"
                  >
                    <option value="all">All Sources</option>
                    <option value="voice">Voice Mic Only</option>
                    <option value="text">Text Typed Only</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold">No search logs match your filter criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Search Term</th>
                        <th className="py-3 px-4">Input Method</th>
                        <th className="py-3 px-4">Inventory Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground capitalize">
                            "{log.rawTerm || log.term}"
                          </td>
                          <td className="py-3 px-4">
                            {log.source === 'voice' ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 font-semibold">
                                <Mic className="h-3 w-3" /> Voice
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30 gap-1 font-semibold">
                                <Type className="h-3 w-3" /> Text
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {log.found === true ? (
                              <Badge className="bg-emerald-600 text-white gap-1 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Found in Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-slate-950 gap-1 font-semibold">
                                <AlertCircle className="h-3 w-3" /> Coming Soon / Missing
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(log.id)}
                              disabled={deletingId === log.id}
                              title="Delete search log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
