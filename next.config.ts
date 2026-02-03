import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'nautichandler.com' },
      { protocol: 'https', hostname: '*.nautichandler.com' },
    ],
  },
};

export default nextConfig;
