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
