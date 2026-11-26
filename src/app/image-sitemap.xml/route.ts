import { NextResponse } from 'next/server';
import marblesData from '@/lib/marbles-data.json';
import fixingMaterialsData from '@/lib/fixing-materials-data.json';
import { SITE_URL, getSeoImageUrl, getSeoImageAlt } from '@/lib/seo';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const entries: string[] = [];

  for (const m of marblesData as Array<any>) {
    if (!m?.id || !m?.name || !m?.imageUrl) continue;
    const pageUrl = `${SITE_URL}/product-detail/${encodeURIComponent(m.id)}`;
    const mainImgUrl = getSeoImageUrl(m.imageUrl, m.name, {
      productId: m.id,
      absolute: true
    });
    const title = getSeoImageAlt(m.name, m.materialType);

    const imageNodes: string[] = [
      `<image:image><image:loc>${escapeXml(mainImgUrl)}</image:loc><image:title>${escapeXml(title)}</image:title><image:caption>${escapeXml(`Stone Expert ${m.name} - Best Marble Factory & Supplier in Islamabad, Rawalpindi and Pakistan`)}</image:caption></image:image>`
    ];

    if (Array.isArray(m.gallery)) {
      m.gallery.forEach((g: any, idx: number) => {
        const gUrl = typeof g === 'string' ? g : g?.url;
        if (!gUrl) return;
        const seoGalleryUrl = getSeoImageUrl(gUrl, m.name, {
          productId: m.id,
          galleryIndex: idx + 1,
          absolute: true
        });
        imageNodes.push(
          `<image:image><image:loc>${escapeXml(seoGalleryUrl)}</image:loc><image:title>${escapeXml(`Stone Expert - ${m.name} View ${idx + 2}`)}</image:title></image:image>`
        );
      });
    }

    entries.push(`<url><loc>${escapeXml(pageUrl)}</loc>${imageNodes.join('')}</url>`);
  }

  for (const f of fixingMaterialsData as Array<any>) {
    if (!f?.id || !f?.name || !f?.imageUrl) continue;
    const pageUrl = `${SITE_URL}/product-detail/${encodeURIComponent(f.id)}`;
    const imgUrl = getSeoImageUrl(f.imageUrl, f.name, {
      productId: f.id,
      absolute: true
    });
    const title = getSeoImageAlt(f.name, f.category);
    entries.push(
      `<url><loc>${escapeXml(pageUrl)}</loc><image:image><image:loc>${escapeXml(imgUrl)}</image:loc><image:title>${escapeXml(title)}</image:title></image:image></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
}
