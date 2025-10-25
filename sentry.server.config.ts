// Sentry server instrumentation temporarily disabled for CI builds.
// If you need Sentry in production, re-enable by restoring the original
// initialization and configuring the SENTRY auth and project environment variables.

// Note: Removing Sentry instrumentation prevents the Sentry bundler plugin
// from injecting TS comments into compiled outputs which can cause build
// failures in environments without Sentry project configuration.

export {};
