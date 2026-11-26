import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import marblesData from '@/lib/marbles-data.json';
import fixingMaterialsData from '@/lib/fixing-materials-data.json';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'images.unsplash.com',
  'picsum.photos',
  'fastly.picsum.photos',
  'placehold.co',
  'lh3.googleusercontent.com',
  'res.cloudinary.com',
  'i.ibb.co',
  'stoneexpert.net',
  'www.stoneexpert.net'
]);

const EXT_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
};

function sanitizeSlug(rawSlug: string): string {
  const base = (rawSlug || 'stone-expert-marble.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
  const ensured = base.startsWith('stone-expert-') ? base : `stone-expert-${base}`;
  return ensured.slice(0, 120);
}

function isAllowedRemoteUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_IMAGE_HOSTS.has(host)) return null;
    // Block numeric IP / localhost / private network tricks defensively
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || host.endsWith('.local')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function resolveFromCatalog(id: string | null, galleryIdx: number): string | null {
  if (!id) return null;
  const cleanId = id.trim();
  const marble = (marblesData as Array<any>).find(m => m.id === cleanId);
  if (marble) {
    if (galleryIdx > 0 && Array.isArray(marble.gallery)) {
      const gItem = marble.gallery[galleryIdx - 1];
      if (typeof gItem === 'string' && gItem.trim()) return gItem.trim();
      if (gItem && typeof gItem.url === 'string' && gItem.url.trim()) return gItem.url.trim();
    }
    if (typeof marble.imageUrl === 'string' && marble.imageUrl.trim()) {
      return marble.imageUrl.trim();
    }
  }

  const fixing = (fixingMaterialsData as Array<any>).find(f => f.id === cleanId);
  if (fixing && typeof fixing.imageUrl === 'string' && fixing.imageUrl.trim()) {
    return fixing.imageUrl.trim();
  }
  return null;
}

async function serveLocalPublicImage(localUrlPath: string, seoFilename: string): Promise<NextResponse | null> {
  // Only allow paths inside /public/images/
  const cleanPath = localUrlPath.split('?')[0].replace(/^\/+/, '');
  if (!cleanPath.startsWith('images/')) return null;

  const publicRoot = path.resolve(process.cwd(), 'public');
  const imagesRoot = path.resolve(publicRoot, 'images');
  const fullPath = path.resolve(publicRoot, cleanPath);

  // Strict directory traversal protection
  if (!fullPath.startsWith(imagesRoot + path.sep) && fullPath !== imagesRoot) {
    return null;
  }

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = EXT_MIME_MAP[ext] || 'image/jpeg';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${seoFilename}"`,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { slug: string } }
) {
  const seoFilename = sanitizeSlug(context.params?.slug || 'stone-expert-marble.jpg');
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const srcParam = searchParams.get('src');
  const galleryIdx = Math.max(0, parseInt(searchParams.get('i') || '0', 10) || 0);

  // Prefer server-side catalog resolution first, fall back to allowlisted src for Firestore dynamic updates
  const candidateTargets: string[] = [];
  const catalogSrc = resolveFromCatalog(idParam, galleryIdx);
  if (srcParam && srcParam.trim()) candidateTargets.push(srcParam.trim());
  if (catalogSrc && !candidateTargets.includes(catalogSrc)) candidateTargets.push(catalogSrc);

  for (const target of candidateTargets) {
    // 1. Local public/images/* asset
    if (target.startsWith('/images/')) {
      const localRes = await serveLocalPublicImage(target, seoFilename);
      if (localRes) return localRes;
      continue;
    }

    // 2. Strictly allowlisted HTTPS remote asset (SSRF-safe)
    const allowedUrl = isAllowedRemoteUrl(target);
    if (!allowedUrl) continue;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const upstream = await fetch(allowedUrl.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });
      clearTimeout(timer);

      if (!upstream.ok) continue;
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      if (!contentType.toLowerCase().startsWith('image/')) continue;

      const bytes = await upstream.arrayBuffer();
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${seoFilename}"`,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'Image not found' }, { status: 404 });
}
