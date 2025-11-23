import pino from 'pino';
import * as Sentry from '@sentry/nextjs';

// Fields/paths to redact from structured logs (object paths)
const redactPaths = [
  'req.headers.authorization',
  'req.headers.Authorization',
  'req.body',
  'body',
  'token',
  'password',
  'apiKey',
  'api_key',
  'NEYNAR_API_KEY',
  'DISTRIBUTOR_ADMIN_PRIVATE_KEY',
  'PRIVATE_KEY',
];

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
  redact: { paths: redactPaths, censor: '[REDACTED]' },
});

export default logger;

export function debug(msg: string | Record<string, unknown>, obj?: Record<string, unknown>) {
  if (typeof msg === 'string') logger.debug(obj ? { ...obj, message: msg } : msg);
  else logger.debug(msg);
}

export function info(msg: string | Record<string, unknown>, obj?: Record<string, unknown>) {
  if (typeof msg === 'string') logger.info(obj ? { ...obj, message: msg } : msg);
  else logger.info(msg);
}

export function warn(msg: string | Record<string, unknown>, obj?: Record<string, unknown>) {
  if (typeof msg === 'string') logger.warn(obj ? { ...obj, message: msg } : msg);
  else logger.warn(msg);
}

export function error(err: unknown, ctx?: Record<string, unknown>) {
  // Structured log
  if (ctx) logger.error({ ...ctx, err });
  else logger.error(String(err));

  // Capture to Sentry when available
  try {
    if (err instanceof Error) Sentry.captureException(err);
    else Sentry.captureException(new Error(String(err)));
  } catch (_) {
    // swallow Sentry errors to avoid crashing app
  }
}
