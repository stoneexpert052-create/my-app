import { NextRequest, NextResponse } from 'next/server';
import {
  SOCIAL_STATE_COOKIE,
  appendSessionCookie,
  readSocialSessionFromRequest,
  renderPopupResultHtml,
  resolveAppBaseUrl,
} from '@/lib/social-oauth-session';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error');

  if (errorParam) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'meta', error: errorParam },
        `Login cancelled: ${errorParam}`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const expectedState = req.cookies.get(SOCIAL_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'meta', error: 'Invalid or expired OAuth state.' },
        'Security check failed or session expired. Please try connecting again.'
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'meta', error: 'Meta OAuth app is not configured on the server.' },
        'Meta OAuth app credentials are missing on the server.'
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const redirectUri = `${resolveAppBaseUrl(req)}/api/social-auth/callback/meta`;

  try {
    // 1. Exchange code for short-lived user access token
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson?.access_token) {
      throw new Error(tokenJson?.error?.message || 'Failed exchanging Meta authorization code');
    }

    // 2. Exchange for long-lived user token (60 days)
    let userToken: string = tokenJson.access_token;
    try {
      const longParams = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: userToken,
      });
      const longRes = await fetch(
        `https://graph.facebook.com/v20.0/oauth/access_token?${longParams.toString()}`
      );
      const longJson = await longRes.json();
      if (longRes.ok && longJson?.access_token) {
        userToken = longJson.access_token;
      }
    } catch {
      // Keep short-lived token if exchange unavailable
    }

    // 3. Fetch managed Facebook Pages & linked Instagram Business Account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(
        userToken
      )}`
    );
    const pagesJson = await pagesRes.json();
    const pages = Array.isArray(pagesJson?.data) ? pagesJson.data : [];

    if (pages.length === 0) {
      throw new Error(
        'No Facebook Page found on this account. Please ensure your Stone Expert Facebook Page is linked to this login.'
      );
    }

    // Prefer a page named Stone Expert if multiple exist, otherwise the first page
    const primaryPage =
      pages.find((p: any) => typeof p?.name === 'string' && p.name.toLowerCase().includes('stone')) ||
      pages[0];

    const existing = readSocialSessionFromRequest(req);
    const updatedSession = {
      ...existing,
      meta: {
        connected: true as const,
        pageId: String(primaryPage.id),
        pageName: String(primaryPage.name || 'Facebook Page'),
        pageAccessToken: String(primaryPage.access_token),
        instagramAccountId: primaryPage.instagram_business_account?.id
          ? String(primaryPage.instagram_business_account.id)
          : undefined,
        instagramUsername: primaryPage.instagram_business_account?.username
          ? String(primaryPage.instagram_business_account.username)
          : undefined,
        connectedAt: new Date().toISOString(),
      },
    };

    const html = renderPopupResultHtml(
      {
        type: 'OAUTH_AUTH_SUCCESS',
        provider: 'meta',
        pageName: updatedSession.meta.pageName,
        instagramUsername: updatedSession.meta.instagramUsername || null,
      },
      `Connected to ${updatedSession.meta.pageName}${
        updatedSession.meta.instagramUsername ? ` & @${updatedSession.meta.instagramUsername}` : ''
      }. Closing window...`
    );

    const res = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    appendSessionCookie(res, updatedSession);
    return res;
  } catch (err: any) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'meta', error: err?.message || 'Meta login failed' },
        err?.message || 'Could not complete Facebook / Instagram login.'
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
