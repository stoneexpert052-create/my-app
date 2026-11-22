import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const SOCIAL_SESSION_COOKIE = 'se_social_oauth_session';
export const SOCIAL_STATE_COOKIE = 'se_social_oauth_state';

export interface MetaConnectedAccount {
  connected: true;
  userName?: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  connectedAt: string;
}

export interface TikTokConnectedAccount {
  connected: true;
  openId: string;
  displayName: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: string;
}

export interface SocialOAuthSession {
  meta?: MetaConnectedAccount;
  tiktok?: TikTokConnectedAccount;
}

// Keep a stable in-memory fallback key per server process if SOCIAL_SESSION_SECRET is unset
const globalKeyHolder = globalThis as unknown as { __seSocialEncKey?: Buffer };

function getEncryptionKey(): Buffer {
  const envSecret = process.env.SOCIAL_SESSION_SECRET?.trim();
  if (envSecret) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }
  if (!globalKeyHolder.__seSocialEncKey) {
    globalKeyHolder.__seSocialEncKey = crypto.randomBytes(32);
  }
  return globalKeyHolder.__seSocialEncKey;
}

export function encryptSessionPayload(payload: SocialOAuthSession): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSessionPayload(token: string | undefined): SocialOAuthSession {
  if (!token) return {};
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 28) return {};
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(decrypted);
    return parsed && typeof parsed === 'object' ? (parsed as SocialOAuthSession) : {};
  } catch {
    return {};
  }
}

export function readSocialSessionFromRequest(req: NextRequest): SocialOAuthSession {
  const raw = req.cookies.get(SOCIAL_SESSION_COOKIE)?.value;
  return decryptSessionPayload(raw);
}

export function buildSecureCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const encoded = encodeURIComponent(value);
  return `${name}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=None; Partitioned`;
}

export function appendSessionCookie(res: NextResponse, session: SocialOAuthSession): void {
  const token = encryptSessionPayload(session);
  res.headers.append('Set-Cookie', buildSecureCookieHeader(SOCIAL_SESSION_COOKIE, token, 60 * 60 * 24 * 30));
}

export function clearSessionCookie(res: NextResponse): void {
  res.headers.append('Set-Cookie', buildSecureCookieHeader(SOCIAL_SESSION_COOKIE, '', 0));
}

export function appendStateCookie(res: NextResponse, state: string): void {
  res.headers.append('Set-Cookie', buildSecureCookieHeader(SOCIAL_STATE_COOKIE, state, 60 * 10));
}

export function resolveAppBaseUrl(req: NextRequest): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export function renderPopupResultHtml(payload: Record<string, unknown>, message: string): string {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  const escapedMsg = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Stone Expert Social Login</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px; }
    .card { background: #1e293b; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 28px 32px; max-width: 420px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    h2 { color: #fbbf24; margin: 0 0 8px; font-size: 20px; }
    p { color: #cbd5e1; margin: 0; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Stone Expert Social Portal</h2>
    <p>${escapedMsg}</p>
  </div>
  <script>
    (function() {
      var data = ${safeJson};
      try {
        if (window.opener) {
          window.opener.postMessage(data, '*');
          setTimeout(function() { window.close(); }, 600);
        } else {
          setTimeout(function() { window.location.href = '/dashboard/brochure?type=social-scheduler'; }, 1200);
        }
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
}
