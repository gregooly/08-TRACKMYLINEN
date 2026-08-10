import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable powered by header for security
  poweredByHeader: false,
  
  // Generate standalone output for better production deployment
  output: 'standalone',
  
  // Compiler options for production
  compiler: {
    // Remove console.log in production (keep errors)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },
  
  // Experimental features for stability
  experimental: {
    // Optimize server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
