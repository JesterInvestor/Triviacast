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
    // Suppress noisy Webpack warnings from optional OpenTelemetry instrumentation pulled in by Sentry/Prisma
    // These are safe to ignore and caused by dynamic requires in otel instrumentations.
    // See: https://github.com/open-telemetry/opentelemetry-js/issues/3897
    const ignore = config.ignoreWarnings ?? [];
    config.ignoreWarnings = [
      ...ignore,
      (warning: any) =>
        typeof warning?.message === 'string' &&
        warning.message.includes('Critical dependency: the request of a dependency is an expression') &&
        typeof (warning as any).module?.resource === 'string' &&
        /@opentelemetry[\\\/]instrumentation/.test((warning as any).module.resource),
    ];

    return config;
  },
};

export default nextConfig;