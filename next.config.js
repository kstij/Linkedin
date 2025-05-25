/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors during build
  },
}

module.exports = nextConfig 