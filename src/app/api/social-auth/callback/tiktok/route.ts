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
        { type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: errorParam },
        `TikTok login cancelled: ${errorParam}`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const expectedState = req.cookies.get(SOCIAL_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: 'Invalid or expired TikTok OAuth state.' },
        'Security check failed or session expired. Please try connecting TikTok again.'
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) {
    return new NextResponse(
      renderPopupResultHtml(
        { type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: 'TikTok OAuth credentials missing on server.' },
        'TikTok app credentials are not configured on the server.'
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const redirectUri = `${resolveAppBaseUrl(req)}/api/social-auth/callback/tiktok`;

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson?.access_token) {
      throw new Error(tokenJson?.error_description || tokenJson?.error || 'TikTok token exchange failed');
    }

    let displayName = 'Stone Expert TikTok';
    let username: string | undefined;
    try {
      const profileRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username',
        {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        }
      );
      const profileJson = await profileRes.json();
      if (profileRes.ok && profileJson?.data?.user) {
        displayName = profileJson.data.user.display_name || displayName;
        username = profileJson.data.user.username || undefined;
      }
    } catch {
      // Optional display info fallback
    }

    const existing = readSocialSessionFromRequest(req);
    const updatedSession = {
      ...existing,
      tiktok: {
        connected: true as const,
        openId: String(tokenJson.open_id || 'tiktok_user'),
        displayName,
        username,
        accessToken: String(tokenJson.access_token),
        refreshToken: tokenJson.refresh_token ? String(tokenJson.refresh_token) : undefined,
        expiresAt: tokenJson.expires_in ? Date.now() + Number(tokenJson.expires_in) * 1000 : undefined,
        connectedAt: new Date().toISOString(),
      },
    };

    const html = renderPopupResultHtml(
      {
        type: 'OAUTH_AUTH_SUCCESS',
        provider: 'tiktok',
        displayName,
        username: username || null,
      },
      `Connected to TikTok (${username ? `@${username}` : displayName}). Closing window...`
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
        { type: 'OAUTH_AUTH_ERROR', provider: 'tiktok', error: err?.message || 'TikTok login failed' },
        err?.message || 'Could not complete TikTok login.'
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
