import pino from 'pino';

const redactPaths = [
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
  'authorization',
  '*.password',
  '*.token',
  '*.secret',
  '*.api_key',
  '*.private_key',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
