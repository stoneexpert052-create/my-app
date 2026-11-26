import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/app-providers';
import { CORE_SEO_KEYWORDS, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      'Stone Expert | Marble Price in Islamabad, Rawalpindi & Pakistan — Best Marble Factory, Supplier, Fixer & Granite Polish',
    template: '%s | Stone Expert — Marble Price in Islamabad, Rawalpindi & Pakistan',
  },
  description:
    'Check latest Marble Price in Islamabad, Marble Price in Rawalpindi & Marble Price in Pakistan directly from Stone Expert — Best Marble Factory, Best Marble Supplier, Best Marble Fixer, Best Marble Polisher & Best Marble and Granite Polish in I-9/3 Islamabad. ماربل پرائس ان اسلام آباد، راولپنڈی اور پاکستان۔',
  keywords: CORE_SEO_KEYWORDS,
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title:
      'Stone Expert — Marble Price in Islamabad, Rawalpindi & Pakistan | Best Marble Factory, Supplier, Fixer & Granite Polish',
    description:
      'Official factory marble & granite rates in Islamabad, Rawalpindi & across Pakistan. Best Marble Supplier, Best Marble Factory, Best Marble Fixer & Best Marble and Granite Polisher at Plot # 375-A, Potohar Road, I-9/3, Islamabad.',
    url: SITE_URL,
    siteName: 'Stone Expert',
    locale: 'en_PK',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
        alt: 'Stone Expert - Best Marble Factory, Supplier, Fixer & Granite Polisher in Islamabad, Rawalpindi & Pakistan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Stone Expert | Marble Price in Islamabad, Rawalpindi & Pakistan — Best Marble Factory & Granite Polish',
    description:
      'Live Marble & Granite Prices in Islamabad, Rawalpindi & Pakistan. Best Marble Supplier, Factory, Fixer & Polisher (I-9/3 Islamabad).',
    images: [`${SITE_URL}/icon-512.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                try {
                  var host = (window.location.hostname || '').toLowerCase();
                  var stay = window.location.search.indexOf('stay=1') !== -1;
                  if (!stay && (host.indexOf('ais-pre-') === 0 || host.slice(-10) === '.ai.studio' || host === 'ai.studio')) {
                    var target = 'https://stoneexpert.net' + window.location.pathname + window.location.search + window.location.hash;
                    if (window.top && window.top !== window.self) {
                      window.top.location.replace(target);
                    } else {
                      window.location.replace(target);
                    }
                    return;
                  }
                } catch (e) {}

                if (typeof Node !== 'undefined' && !Node.prototype.toJSON) {
                  Node.prototype.toJSON = function() {
                    return '[HTML ' + (this.nodeName || 'Node') + ' Element]';
                  };
                }
                if (typeof Window !== 'undefined' && !Window.prototype.toJSON) {
                  Window.prototype.toJSON = function() {
                    return '[Window]';
                  };
                }
                if (typeof Event !== 'undefined' && !Event.prototype.toJSON) {
                  Event.prototype.toJSON = function() {
                    return '[Event ' + (this.type || '') + ']';
                  };
                }

                function safeArg(arg) {
                  if (typeof Node !== 'undefined' && arg instanceof Node) {
                    return '[HTML ' + (arg.nodeName || 'Element') + ']';
                  }
                  if (typeof Window !== 'undefined' && arg instanceof Window) {
                    return '[Window]';
                  }
                  return arg;
                }

                ['warn', 'error', 'log', 'info'].forEach(function(m) {
                  var orig = console[m];
                  if (typeof orig === 'function') {
                    console[m] = function() {
                      var args = Array.prototype.slice.call(arguments).map(safeArg);
                      return orig.apply(console, args);
                    };
                  }
                });

                var origStringify = JSON.stringify;
                JSON.stringify = function(value, replacer, space) {
                  var cache = new WeakSet();
                  var safeReplacer = function(k, v) {
                    if (typeof v === 'object' && v !== null) {
                      if (typeof Node !== 'undefined' && v instanceof Node) {
                        return '[HTML ' + (v.nodeName || 'Element') + ']';
                      }
                      if (typeof Window !== 'undefined' && v instanceof Window) {
                        return '[Window]';
                      }
                      if (cache.has(v)) {
                        return '[Circular]';
                      }
                      cache.add(v);
                    }
                    if (typeof replacer === 'function') {
                      return replacer(k, v);
                    }
                    return v;
                  };

                  try {
                    return origStringify(value, safeReplacer, space);
                  } catch (e) {
                    return '"[Unserializable]"';
                  }
                };
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&family=Cinzel:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org Structured Data for Local & National Pakistan Marble SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'HomeGoodsStore',
                name: 'Stone Expert — Best Marble Factory, Supplier, Fixer & Granite Polisher',
                alternateName: [
                  'Stone Expert Islamabad',
                  'Stone Expert Rawalpindi',
                  'سٹون ایکسپرٹ ماربل فیکٹری اسلام آباد',
                ],
                description:
                  'Leading marble factory and direct marble supplier in Islamabad, Rawalpindi and Pakistan offering latest marble prices, granite slabs, expert marble fixing, and Italian diamond marble & granite polishing.',
                image: 'https://stoneexpert.net/icon-512.png',
                logo: 'https://stoneexpert.net/logo.svg',
                '@id': 'https://stoneexpert.net/#organization',
                url: 'https://stoneexpert.net',
                telephone: '+92-300-3634052',
                priceRange: 'PKR',
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: 'Plot # 375-A, Potohar Road, I-9/3',
                  addressLocality: 'Islamabad',
                  addressRegion: 'Islamabad Capital Territory',
                  postalCode: '44000',
                  addressCountry: 'PK',
                },
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: 33.6625,
                  longitude: 73.0518,
                },
                openingHoursSpecification: {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: [
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                  ],
                  opens: '09:00',
                  closes: '20:00',
                },
                areaServed: [
                  'Islamabad',
                  'Rawalpindi',
                  'Pakistan',
                  'DHA Islamabad',
                  'Bahria Town Rawalpindi',
                  'Gulberg Greens',
                  'B-17 Multi Gardens',
                  'F-10 Islamabad',
                  'G-11 Islamabad',
                ],
                hasOfferCatalog: {
                  '@type': 'OfferCatalog',
                  name: 'Marble, Granite & Stone Services in Islamabad, Rawalpindi & Pakistan',
                  itemListElement: [
                    {
                      '@type': 'Offer',
                      itemOffered: {
                        '@type': 'Service',
                        name: 'Best Marble Factory & Direct Marble Supplier (Islamabad, Rawalpindi & Pakistan)',
                      },
                    },
                    {
                      '@type': 'Offer',
                      itemOffered: {
                        '@type': 'Service',
                        name: 'Best Marble Fixer & Stair, Kitchen, Vanity & Flooring Installation',
                      },
                    },
                    {
                      '@type': 'Offer',
                      itemOffered: {
                        '@type': 'Service',
                        name: 'Best Marble Polisher & Best Marble and Granite Polish (Italian Diamond Polish)',
                      },
                    },
                  ],
                },
                sameAs: [
                  'https://facebook.com/stoneexpert',
                  'https://instagram.com/stoneexpert',
                ],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'What is the latest Marble Price in Islamabad, Rawalpindi and Pakistan?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Stone Expert provides live factory-direct Marble Price in Islamabad, Rawalpindi and Pakistan including Ziarat White, Badal, Sunny White, Botticino, Silky Black, and imported granites with instant online calculators for stairs, kitchens, vanities, and flooring.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Where can I find the Best Marble Factory, Marble Supplier, Marble Fixer and Marble & Granite Polisher in Islamabad & Rawalpindi?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Stone Expert operates directly from Plot # 375-A, Potohar Road, I-9/3, Islamabad, offering factory-direct marble supply, expert marble fixing teams, and mirror-finish marble and granite polishing across Islamabad, Rawalpindi, DHA, Bahria Town, and nationwide in Pakistan.',
                    },
                  },
                ],
              },
            ]),
          }}
        />
        {/* PWA Headers */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Stone Expert" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
