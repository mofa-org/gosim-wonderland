import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/original-photos/:path*',
        destination: '/api/static/original-photos/:path*',
      },
      {
        source: '/ai-photos/:path*',
        destination: '/api/static/ai-photos/:path*',
      },
    ];
  },
};

export default nextConfig;
