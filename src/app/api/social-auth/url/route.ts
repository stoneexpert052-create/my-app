import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { appendStateCookie, resolveAppBaseUrl } from '@/lib/social-oauth-session';

export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const baseUrl = resolveAppBaseUrl(req);

  if (provider === 'facebook' || provider === 'instagram') {
    const appId = process.env.META_APP_ID?.trim();
    const appSecret = process.env.META_APP_SECRET?.trim();
    const redirectUri = `${baseUrl}/api/social-auth/callback/meta`;

    if (!appId || !appSecret) {
      return NextResponse.json({
        configured: false,
        provider,
        redirectUri,
        requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
      });
    }

    const state = crypto.randomBytes(20).toString('hex');
    const scopes =
      provider === 'instagram'
        ? [
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_posts',
            'instagram_basic',
            'instagram_content_publish',
          ].join(',')
        : ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'].join(',');

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });

    const url = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
    const res = NextResponse.json({ configured: true, provider, url, redirectUri });
    appendStateCookie(res, state);
    return res;
  }

  if (provider === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
    const redirectUri = `${baseUrl}/api/social-auth/callback/tiktok`;

    if (!clientKey || !clientSecret) {
      return NextResponse.json({
        configured: false,
        provider: 'tiktok',
        redirectUri,
        requiredEnvVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
      });
    }

    const state = crypto.randomBytes(20).toString('hex');
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      state,
    });

    const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    const res = NextResponse.json({ configured: true, provider: 'tiktok', url, redirectUri });
    appendStateCookie(res, state);
    return res;
  }

  return NextResponse.json(
    { configured: false, error: 'Unsupported provider. Use facebook, instagram, or tiktok.' },
    { status: 400 }
  );
}
