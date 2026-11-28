/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 15 * 60 * 1000,
    pagesBufferLength: 24,
  },
  // Set a longer timeout for server actions to accommodate Genkit flow execution
  experimental: {
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'motion',
      'recharts',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      'embla-carousel-react',
    ],
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'stoneexpert052.ai.studio',
          },
        ],
        destination: 'https://stoneexpert.net/:path*',
        permanent: false,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-host',
            value: 'stoneexpert052.ai.studio',
          },
        ],
        destination: 'https://stoneexpert.net/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
