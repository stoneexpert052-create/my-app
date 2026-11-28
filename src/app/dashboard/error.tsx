'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn('[Admin Dashboard ErrorBoundary]', error?.message || error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1.5 max-w-md" dir="auto">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          ایڈمن پیج لوڈ کرنے میں عارضی مسئلہ آیا
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {error?.message || 'An unexpected error occurred inside the Admin Panel.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button onClick={() => reset()} className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
          <RefreshCw className="h-4 w-4" />
          <span>دوبارہ کوشش کریں (Retry)</span>
        </Button>
        <Button asChild variant="outline" className="gap-2 font-semibold">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            <span>واپس ایڈمن ڈیش بورڈ</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
