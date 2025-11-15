import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next from trying to process the hardhat folder
  experimental: {
    // no specific flag for ignore, but keeping minimal config here
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Using eval-based dynamic imports in a few optional modules; keep 'unsafe-eval'.
      // Next also injects small inline scripts; allow inline to avoid breakage.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Allow common image sources used by the app (self + data/blob + stamp avatars)
      "img-src 'self' data: blob: https://cdn.stamp.fyi",
      "font-src 'self' data:",
      // Allow HTTPS and WSS connections for RPCs/wallets/providers to avoid brittle allowlists
      "connect-src 'self' https: wss:",
      // Disallow all framing
      "frame-ancestors 'none'",
      // Disallow plugins/objects
      "object-src 'none'",
      // Upgrade mixed content
      "upgrade-insecure-requests"
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' }
        ]
      }
    ];
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