export const SITE_URL = 'https://stoneexpert.net';
export const BRAND_NAME = 'Stone Expert';

export const CORE_SEO_KEYWORDS = [
  'Marble Price in Islamabad',
  'Marble Price in Rawalpindi',
  'Marble Price in Pakistan',
  'Best Marble Supplier',
  'Best Marble Factory',
  'Best Marble Fixer',
  'Best Marble Polisher',
  'Best Marble and Granite Polish',
  'ماربل پرائس ان اسلام آباد',
  'ماربل پرائس ان راولپنڈی',
  'ماربل پرائس ان پاکستان',
  'بیسٹ ماربل سپلائر',
  'بیسٹ ماربل فیکٹری',
  'بیسٹ ماربل فکسر',
  'بیسٹ ماربل پالشیر',
  'بیسٹ ماربل اینڈ گرینائٹ پالش',
  'Stone Expert Islamabad',
  'Stone Expert Rawalpindi',
  'Granite Price in Islamabad',
  'Granite Price in Rawalpindi',
  'Ziarat White Marble Price in Pakistan',
  'Badal Marble Price in Islamabad',
  'Kitchen Countertop Granite Islamabad',
  'Stair Marble Design Pakistan',
  'Marble Polishing Service Islamabad Rawalpindi',
  'Potohar Road I-9/3 Marble Factory Islamabad'
];

export function slugifySeoText(input: string): string {
  const cleaned = (input || 'marble')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return cleaned || 'marble';
}

/**
 * Generates an SEO-friendly image URL that explicitly contains both
 * "stone-expert" and the material's slugified name.
 * Example: /api/stone-image/stone-expert-ziarat-white-marble.jpg?id=ziarat-white
 */
export function getSeoImageUrl(
  originalUrl: string | undefined | null,
  materialName: string,
  options?: {
    productId?: string;
    galleryIndex?: number;
    absolute?: boolean;
  }
): string {
  const trimmed = (originalUrl || '').trim();
  if (!trimmed) {
    return `https://placehold.co/600x400?text=${encodeURIComponent(`Stone Expert - ${materialName || 'Marble'}`)}`;
  }

  // Keep inline data URIs untouched (already embedded in browser)
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Avoid double-wrapping already SEO-formatted URLs
  if (trimmed.includes('/api/stone-image/stone-expert-')) {
    return options?.absolute && trimmed.startsWith('/') ? `${SITE_URL}${trimmed}` : trimmed;
  }

  const materialSlug = slugifySeoText(materialName);
  const idxSuffix =
    typeof options?.galleryIndex === 'number' && options.galleryIndex > 0
      ? `-${options.galleryIndex + 1}`
      : '';
  const seoFileName = `stone-expert-${materialSlug}${idxSuffix}.jpg`;

  const params = new URLSearchParams();
  if (options?.productId) {
    params.set('id', options.productId);
    if (typeof options.galleryIndex === 'number' && options.galleryIndex > 0) {
      params.set('i', String(options.galleryIndex));
    }
  }

  // Always include src as fallback for dynamic Firestore-edited images
  // (server route validates catalog ID first, then strict allowlist on src)
  if (!options?.productId || trimmed.startsWith('http') || trimmed.startsWith('/images/')) {
    params.set('src', trimmed);
  }

  const relativePath = `/api/stone-image/${seoFileName}?${params.toString()}`;
  return options?.absolute ? `${SITE_URL}${relativePath}` : relativePath;
}

/**
 * Generates a rich SEO alt tag containing both Stone Expert and the exact material name.
 */
export function getSeoImageAlt(materialName: string, materialType?: string): string {
  const name = (materialName || 'Premium Marble').trim();
  const typePart = materialType ? ` ${materialType}` : '';
  return `Stone Expert - ${name}${typePart} | Marble Price in Islamabad, Rawalpindi & Pakistan`;
}
