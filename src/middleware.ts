import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LIVE_SITE_ORIGIN = 'https://stoneexpert.net';

function isSharedAiStudioHost(rawHost: string | null): boolean {
  if (!rawHost) return false;
  const hostname = rawHost.split(',')[0].trim().split(':')[0].toLowerCase();
  if (
    hostname === 'stoneexpert.net' ||
    hostname === 'www.stoneexpert.net' ||
    hostname.startsWith('ais-dev-')
  ) {
    return false;
  }
  return (
    hostname === 'stoneexpert052.ai.studio' ||
    hostname.startsWith('ais-pre-') ||
    hostname.endsWith('.ai.studio') ||
    hostname === 'ai.studio'
  );
}

export function middleware(request: NextRequest) {
  const candidates = [
    request.headers.get('x-forwarded-host'),
    request.headers.get('host'),
    request.nextUrl.hostname,
  ];
  const isSharedHost = candidates.some((h) => isSharedAiStudioHost(h));
  const secFetchDest = request.headers.get('sec-fetch-dest');
  const stayHere = request.nextUrl.searchParams.get('stay') === '1';

  // Redirect direct browser visits on stoneexpert052.ai.studio / AI Studio shared link to stoneexpert.net.
  // If loaded inside an iframe (e.g. ai.studio wrapper), let the page render our client
  // top-frame breakout + one-tap button so X-Frame-Options never blocks the redirect.
  if (!stayHere && isSharedHost && secFetchDest !== 'iframe') {
    const target = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      LIVE_SITE_ORIGIN
    );
    const response = NextResponse.redirect(target, 307);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|sw\\.js|favicon\\.ico|favicon\\.png|icon-.*\\.png|apple-touch-icon\\.png|logo\\.svg|manifest\\.json|robots\\.txt|sitemap\\.xml|image-sitemap\\.xml|assets/|images/).*)',
  ],
};

