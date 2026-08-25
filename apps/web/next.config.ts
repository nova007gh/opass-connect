import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', images: { unoptimized: true }, allowedDevOrigins: ['localhost','127.0.0.1','192.168.100.3'] };
export default config;
