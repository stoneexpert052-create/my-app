import { NextRequest, NextResponse } from 'next/server';
import {
  appendSessionCookie,
  clearSessionCookie,
  readSocialSessionFromRequest,
  resolveAppBaseUrl,
} from '@/lib/social-oauth-session';

export async function GET(req: NextRequest) {
  const session = readSocialSessionFromRequest(req);
  const baseUrl = resolveAppBaseUrl(req);

  const metaAppConfigured = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
  const tiktokAppConfigured = Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() && process.env.TIKTOK_CLIENT_SECRET?.trim()
  );
  const envFacebookPageReady = Boolean(
    process.env.META_PAGE_ID?.trim() && process.env.META_PAGE_ACCESS_TOKEN?.trim()
  );

  return NextResponse.json({
    appsConfigured: {
      meta: metaAppConfigured,
      tiktok: tiktokAppConfigured,
    },
    callbackUrls: {
      meta: `${baseUrl}/api/social-auth/callback/meta`,
      tiktok: `${baseUrl}/api/social-auth/callback/tiktok`,
    },
    accounts: {
      facebook: session.meta?.connected
        ? {
            connected: true,
            name: session.meta.pageName,
            connectedAt: session.meta.connectedAt,
          }
        : envFacebookPageReady
        ? {
            connected: true,
            name: 'Stone Expert Facebook Page',
            connectedAt: null,
          }
        : { connected: false, name: null, connectedAt: null },
      instagram: session.meta?.instagramAccountId
        ? {
            connected: true,
            name: session.meta.instagramUsername
              ? `@${session.meta.instagramUsername}`
              : 'Instagram Business',
            connectedAt: session.meta.connectedAt,
          }
        : { connected: false, name: null, connectedAt: null },
      tiktok: session.tiktok?.connected
        ? {
            connected: true,
            name: session.tiktok.username
              ? `@${session.tiktok.username}`
              : session.tiktok.displayName,
            connectedAt: session.tiktok.connectedAt,
          }
        : { connected: false, name: null, connectedAt: null },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider || '').toLowerCase();
    const session = readSocialSessionFromRequest(req);

    if (provider === 'facebook' || provider === 'instagram' || provider === 'meta') {
      delete session.meta;
    } else if (provider === 'tiktok') {
      delete session.tiktok;
    } else if (provider === 'all') {
      const res = NextResponse.json({ ok: true });
      clearSessionCookie(res);
      return res;
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid provider' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    if (!session.meta && !session.tiktok) {
      clearSessionCookie(res);
    } else {
      appendSessionCookie(res, session);
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to disconnect account' }, { status: 400 });
  }
}
