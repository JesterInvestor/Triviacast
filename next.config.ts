import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next from trying to process the hardhat folder
  experimental: {
    // no specific flag for ignore, but keeping minimal config here
  },
};

export default nextConfig;
