import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/app-providers';

export const metadata: Metadata = {
  title: 'Stone Expert - Premium Marble & Granite in Rawalpindi/Islamabad',
  description: 'Your one-stop shop for premium Pakistani and imported marble, granite, and construction materials. Expert fixing and polishing services in Rawalpindi and Islamabad. Get instant quotations for your home construction.',
  keywords: 'Marble Rawalpindi, Granite Islamabad, Stone Expert Pindi, Construction Materials Rawalpindi, Kitchen Countertops Islamabad, Flooring Marble Pakistan, Ziarat White Rawalpindi, Best Marble Shop Islamabad',
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
    title: 'Stone Expert - Rawalpindi & Islamabad',
    description: 'Calculate your marble and granite costs instantly. Serving the twin cities with premium quality.',
    url: 'https://stoneexpert.com', // Replace with your actual domain when ready
    siteName: 'Stone Expert',
    locale: 'en_PK',
    type: 'website',
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
        {/* Schema.org Structured Data for Local SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'HomeGoodsStore',
              name: 'Stone Expert - Marble, Granite & Construction',
              image: 'https://stoneexpert.com/logo.svg',
              '@id': 'https://stoneexpert.com',
              url: 'https://stoneexpert.com',
              telephone: '+92-300-1234567',
              priceRange: '$$',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Main Murree Road / IJP Road',
                addressLocality: 'Rawalpindi',
                addressRegion: 'Punjab / Islamabad Capital Territory',
                postalCode: '46000',
                addressCountry: 'PK',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 33.597,
                longitude: 73.0479,
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
                'Rawalpindi',
                'Islamabad',
                'Bahria Town Rawalpindi',
                'DHA Islamabad',
                'Gulberg Greens',
                'B-17 Multi Gardens',
                'G-11 Islamabad',
                'F-10 Islamabad',
              ],
              sameAs: [
                'https://facebook.com/stoneexpert',
                'https://instagram.com/stoneexpert',
              ],
            }),
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
