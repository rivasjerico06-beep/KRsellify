import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Allow extra dev origins (ngrok etc.) via env var — never hardcoded
  ...(process.env.ALLOWED_DEV_ORIGIN
    ? { allowedDevOrigins: [process.env.ALLOWED_DEV_ORIGIN] }
    : {}),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'd2j6dbq0eux0bg.cloudfront.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
