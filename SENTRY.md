# Sentry Configuration for Triviacast

To enable error reporting and source map uploads to Sentry, follow these steps:

## 1. Get Sentry Project Details
- Log in to https://sentry.io
- Go to your organization and select the desired project
- Find your organization slug and project slug (shown in the project settings URL or settings page)

## 2. Set Sentry Environment Variables in `.env.local`
Add these lines to your `.env.local` file (replace with your actual values):
```
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=your_project_slug
SENTRY_DSN=your_project_dsn
SENTRY_RELEASE=your_release_id   # (optional, can be set automatically)
```

## 3. Get Your Sentry Auth Token
- Go to Sentry > User Settings > API Keys
- Create a new token with `project:write` and `org:read` permissions

## 4. Verify Next.js Sentry Config
- Check `sentry.server.config.ts` and `sentry.edge.config.ts` for correct usage of environment variables

## 5. Deploy Again
- After updating `.env.local`, redeploy your app. Sentry should now connect and upload source maps.

**References:**
- Sentry Next.js docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry environment variables: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#environment-variables

[@sentry/nextjs] It appears you've configured a `sentry.server.config.ts` file. Please ensure to put this file's content into the `register()` function of a Next.js instrumentation file instead. To ensure correct functionality of the SDK, `Sentry.init` must be called inside of an instrumentation file. Learn more about setting up an instrumentation file in Next.js: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation. You can safely delete the `sentry.server.config.ts` file afterward.
[@sentry/nextjs] Could not find a Next.js instrumentation file. This indicates an incomplete configuration of the Sentry SDK. An instrumentation file is required for the Sentry SDK to be initialized on the server: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-initialization-config-files (you can suppress this warning by setting SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING=1 as environment variable)
[@sentry/nextjs] It appears you've configured a `sentry.edge.config.ts` file. Please ensure to put this file's content into the `register()` function of a Next.js instrumentation file instead. To ensure correct functionality of the SDK, `Sentry.init` must be called inside of an instrumentation file. Learn more about setting up an instrumentation file in Next.js: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation. You can safely delete the `sentry.edge.config.ts` file afterward.