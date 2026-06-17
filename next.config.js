/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  async rewrites() {
    return [
      {
        source: '/app',
        destination: '/',
      },
    ]
  },
  output: 'standalone',
}
module.exports = nextConfig
