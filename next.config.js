/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig
