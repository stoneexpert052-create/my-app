import type { MetadataRoute } from 'next';
import marblesData from '@/lib/marbles-data.json';
import fixingMaterialsData from '@/lib/fixing-materials-data.json';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/products', changeFrequency: 'daily', priority: 0.95 },
    { path: '/build-your-home', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/brochure', changeFrequency: 'daily', priority: 0.9 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/our-work', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/chemicals', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/renovation', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/representatives', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/track-order', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 }
  ];

  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority
  }));

  const marbleEntries: MetadataRoute.Sitemap = (marblesData as Array<any>)
    .filter(m => m && m.id && m.name)
    .map(m => ({
      url: `${SITE_URL}/product-detail/${encodeURIComponent(m.id)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.85
    }));

  const fixingEntries: MetadataRoute.Sitemap = (fixingMaterialsData as Array<any>)
    .filter(f => f && f.id && f.name)
    .map(f => ({
      url: `${SITE_URL}/product-detail/${encodeURIComponent(f.id)}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.75
    }));

  return [...staticEntries, ...marbleEntries, ...fixingEntries];
}
