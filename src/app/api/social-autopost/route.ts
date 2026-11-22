import { NextRequest, NextResponse } from 'next/server';
import { readSocialSessionFromRequest } from '@/lib/social-oauth-session';

const ALLOWED_PLATFORMS = new Set(['facebook', 'instagram', 'tiktok', 'whatsapp']);

function isSafeHttpsExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function verifyCallerAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.SOCIAL_CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization') || '';
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {
      return false;
    }
  }

  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin') {
    return true;
  }

  return !cronSecret;
}

export async function GET(req: NextRequest) {
  const session = readSocialSessionFromRequest(req);
  const envMetaReady = Boolean(
    process.env.META_PAGE_ID?.trim() && process.env.META_PAGE_ACCESS_TOKEN?.trim()
  );

  const facebookConnected = Boolean(session.meta?.connected || envMetaReady);
  const instagramConnected = Boolean(session.meta?.instagramAccountId);
  const tiktokConnected = Boolean(session.tiktok?.connected);

  return NextResponse.json({
    configured: facebookConnected || instagramConnected || tiktokConnected,
    channels: {
      facebook: facebookConnected,
      instagram: instagramConnected,
      tiktok: tiktokConnected,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!verifyCallerAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized request.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
    const caption = typeof body?.caption === 'string' ? body.caption.trim().slice(0, 5000) : '';
    const linkUrl =
      typeof body?.linkUrl === 'string' && isSafeHttpsExternalUrl(body.linkUrl)
        ? body.linkUrl
        : 'https://stoneexpert.net/brochure?type=price-list';
    const imageUrl =
      typeof body?.imageUrl === 'string' && isSafeHttpsExternalUrl(body.imageUrl)
        ? body.imageUrl
        : undefined;

    const rawPlatforms: unknown[] = Array.isArray(body?.platforms) ? body.platforms : [];
    const platforms = rawPlatforms.filter(
      (p): p is string => typeof p === 'string' && ALLOWED_PLATFORMS.has(p)
    );

    if (!caption) {
      return NextResponse.json({ ok: false, error: 'Post caption is required.' }, { status: 400 });
    }
    if (platforms.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Please select at least one social platform.' },
        { status: 400 }
      );
    }

    const session = readSocialSessionFromRequest(req);
    const fbPageId = session.meta?.pageId || process.env.META_PAGE_ID?.trim() || '';
    const fbPageToken = session.meta?.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN?.trim() || '';
    const igAccountId = session.meta?.instagramAccountId || '';
    const tiktokToken = session.tiktok?.accessToken || '';

    const results: Array<{ channel: string; success: boolean; detail: string }> = [];

    // 1. Facebook Page Auto-Post (via Logged-In Session or Server Token)
    if (platforms.includes('facebook') && fbPageId && fbPageToken) {
      try {
        const endpoint = imageUrl
          ? `https://graph.facebook.com/v20.0/${encodeURIComponent(fbPageId)}/photos`
          : `https://graph.facebook.com/v20.0/${encodeURIComponent(fbPageId)}/feed`;

        const publishToFacebook = async (tokenToUse: string) => {
          const payload = imageUrl
            ? { url: imageUrl, caption, access_token: tokenToUse }
            : { message: caption, link: linkUrl, access_token: tokenToUse };
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          return { res, data };
        };

        let { res: fbRes, data: fbData } = await publishToFacebook(fbPageToken);

        // If Meta responds with #210 (User token given instead of Page token), try resolving the Page token automatically
        if (!fbRes.ok && fbData?.error?.code === 210) {
          const pageTokenRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(fbPageId)}?fields=access_token&access_token=${encodeURIComponent(fbPageToken)}`
          );
          const pageTokenData = await pageTokenRes.json().catch(() => ({}));
          if (pageTokenRes.ok && typeof pageTokenData?.access_token === 'string' && pageTokenData.access_token) {
            const retry = await publishToFacebook(pageTokenData.access_token);
            fbRes = retry.res;
            fbData = retry.data;
          }
        }

        if (fbRes.ok && (fbData?.id || fbData?.post_id)) {
          results.push({
            channel: 'facebook',
            success: true,
            detail: `Published on Facebook (${session.meta?.pageName || 'Page'})`,
          });
        } else {
          results.push({
            channel: 'facebook',
            success: false,
            detail: fbData?.error?.message || `Facebook error (${fbRes.status})`,
          });
        }
      } catch (err: any) {
        results.push({
          channel: 'facebook',
          success: false,
          detail: err?.message || 'Could not reach Facebook API',
        });
      }
    }

    // 2. Instagram Business Auto-Post (requires public HTTPS image URL + connected IG Business account)
    if (platforms.includes('instagram') && igAccountId && fbPageToken) {
      if (!imageUrl) {
        results.push({
          channel: 'instagram',
          success: false,
          detail: 'Instagram requires a product photo URL for automatic posting.',
        });
      } else {
        try {
          const createRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(igAccountId)}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: imageUrl,
                caption,
                access_token: fbPageToken,
              }),
            }
          );
          const createData = await createRes.json().catch(() => ({}));
          if (!createRes.ok || !createData?.id) {
            throw new Error(createData?.error?.message || `Instagram container failed (${createRes.status})`);
          }

          const pubRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(igAccountId)}/media_publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creation_id: createData.id,
                access_token: fbPageToken,
              }),
            }
          );
          const pubData = await pubRes.json().catch(() => ({}));
          if (pubRes.ok && pubData?.id) {
            results.push({
              channel: 'instagram',
              success: true,
              detail: `Published on Instagram (${session.meta?.instagramUsername ? `@${session.meta.instagramUsername}` : 'Business'})`,
            });
          } else {
            throw new Error(pubData?.error?.message || `Instagram publish failed (${pubRes.status})`);
          }
        } catch (err: any) {
          results.push({
            channel: 'instagram',
            success: false,
            detail: err?.message || 'Instagram publish failed',
          });
        }
      }
    }

    // 3. TikTok Photo Post Auto-Publish (via Logged-In TikTok Session)
    if (platforms.includes('tiktok') && tiktokToken) {
      if (!imageUrl) {
        results.push({
          channel: 'tiktok',
          success: false,
          detail: 'TikTok photo post requires a stone image URL.',
        });
      } else {
        try {
          const ttRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tiktokToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              post_info: {
                title: (title || 'Stone Expert Daily Rates').slice(0, 90),
                description: caption.slice(0, 2200),
                privacy_level: 'PUBLIC_TO_EVERYONE',
              },
              source_info: {
                source: 'PULL_FROM_URL',
                photo_cover_index: 0,
                photo_images: [imageUrl],
              },
              post_mode: 'DIRECT_POST',
              media_type: 'PHOTO',
            }),
          });
          const ttData = await ttRes.json().catch(() => ({}));
          if (ttRes.ok && ttData?.error?.code === 'ok') {
            results.push({
              channel: 'tiktok',
              success: true,
              detail: `Published on TikTok (${session.tiktok?.username ? `@${session.tiktok.username}` : 'Account'})`,
            });
          } else {
            results.push({
              channel: 'tiktok',
              success: false,
              detail: ttData?.error?.message || `TikTok API status ${ttRes.status}`,
            });
          }
        } catch (err: any) {
          results.push({
            channel: 'tiktok',
            success: false,
            detail: err?.message || 'Could not reach TikTok API',
          });
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: 'ready_manual',
        results: [],
        messageEn:
          'Post card & bilingual caption are ready! Log in to Facebook, Instagram, or TikTok in the portal above to enable automatic publishing.',
        messageUr:
          'پوسٹ کارڈ اور اردو/انگلش کیپشن بالکل تیار ہے! آٹومیٹک پوسٹنگ کے لیے اوپر پورٹل میں اپنا Facebook، Instagram یا TikTok اکاؤنٹ لاگ ان کریں، یا ابھی 1 کلک میں ڈاؤنلوڈ/واٹس ایپ شیئر کریں۔',
      });
    }

    const anySuccess = results.some((r) => r.success);
    return NextResponse.json({
      ok: anySuccess,
      mode: anySuccess ? 'published_live' : 'failed',
      results,
      messageEn: results.map((r) => `${r.channel}: ${r.detail}`).join(' • '),
      messageUr: anySuccess
        ? 'پوسٹ کامیابی سے آپ کے لاگ ان شدہ سوشل میڈیا اکاؤنٹ پر شائع ہو گئی ہے!'
        : 'سوشل میڈیا پر پوسٹ بھیجنے میں مسئلہ آیا، براہ کرم اپنا لاگ ان کنیکشن چیک کریں۔',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Invalid request payload' },
      { status: 400 }
    );
  }
}
