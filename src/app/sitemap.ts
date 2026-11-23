import type { MetadataRoute } from 'next';

const CANONICAL_BASE_URL = 'https://stoneexpert.net';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '', changeFrequency: 'daily', priority: 1.0 },
    { path: '/products', changeFrequency: 'daily', priority: 0.9 },
    { path: '/build-your-home', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/brochure', changeFrequency: 'daily', priority: 0.9 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/our-work', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/chemicals', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/renovation', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/track-order', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/representatives', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.6 },
  ];

  const lastModified = new Date();

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${CANONICAL_BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

