/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  trailingSlash: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@visx/shape', '@visx/scale', '@visx/axis', '@visx/grid', '@visx/responsive', '@visx/tooltip', '@visx/event'],
  },
}

module.exports = nextConfig
