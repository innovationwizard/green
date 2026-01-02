/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // We'll register manually in ServiceWorkerHandler for better error handling
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  // Filter out app-build-manifest.json from precache (doesn't exist in Next.js 14 App Router)
  manifestTransforms: [
    async (manifestEntries) => {
      // Remove app-build-manifest.json from precache entries
      const manifest = manifestEntries.filter(
        (entry) => !entry.url.includes('/_next/app-build-manifest.json')
      )
      return { manifest, warnings: [] }
    },
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
  // Handle precache errors gracefully
  publicExcludes: ['!sw.js', '!workbox-*.js'],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
};

module.exports = withPWA(nextConfig);

