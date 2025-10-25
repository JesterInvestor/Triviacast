import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next from trying to process the hardhat folder
  experimental: {
    // no specific flag for ignore, but keeping minimal config here
  },
  webpack: (config, { isServer }) => {
    // Alias the react-native async-storage package to a browser shim so server/browser builds don't try
    // to bundle the native implementation which is not available in web environments.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': require('path').resolve(__dirname, 'lib/shims/asyncStorageShim.js'),
    };
    return config;
  },
};

export default nextConfig;