import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'opass-connect.vercel.app' },
    ],
  },
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.100.3'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
