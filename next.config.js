/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHostname = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];

const nextConfig = {
  // Server Actions are enabled by default in Next.js 14
  typescript: {
    // Allow deploying landing page while internal dashboard code is incomplete
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip lint errors during build for the same reason
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/**',
          },
        ]
      : [],
  },
}

module.exports = nextConfig
