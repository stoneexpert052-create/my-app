'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

const LIVE_SITE_ORIGIN = 'https://stoneexpert.net';

function isAiStudioSharedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host.startsWith('ais-pre-') || host.endsWith('.ai.studio') || host === 'ai.studio';
}

export function SharedDomainRedirect() {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('stay') === '1') return;

    const hostname = window.location.hostname;
    if (!isAiStudioSharedHost(hostname)) return;

    const nextUrl = `${LIVE_SITE_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
    setTargetUrl(nextUrl);

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.replace(nextUrl);
      } else {
        window.location.replace(nextUrl);
      }
    } catch {
      // Cross-origin iframe sandbox blocked automatic top-level navigation;
      // the full-screen button with target="_top" remains visible for one-tap redirect.
    }
  }, []);

  if (!targetUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-center shadow-2xl space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <Globe className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">Stone Expert</h1>
          <p className="text-base font-semibold text-amber-300" dir="rtl">
            ہماری ویب سائٹ اب stoneexpert.net پر لائیو ہے
          </p>
          <p className="text-sm text-slate-300">
            Redirecting you to our official website <span className="font-semibold text-white">stoneexpert.net</span>
          </p>
        </div>

        <a
          href={targetUrl}
          target="_top"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 text-base font-bold text-slate-950 shadow-lg transition hover:bg-amber-400"
        >
          <span>stoneexpert.net کھولیں / Open Website</span>
          <ExternalLink className="h-4 w-4" />
        </a>

        <p className="text-xs text-slate-400" dir="rtl">
          اگر ویب سائٹ خود بخود نہ کھلے تو اوپر دیے گئے بٹن پر کلک کریں۔
        </p>
      </div>
    </div>
  );
}
