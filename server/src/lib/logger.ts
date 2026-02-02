import pino from 'pino';
import type { DestinationStream } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

let stream: DestinationStream = process.stdout;
if (isDevelopment) {
  try {
    const pretty = require('pino-pretty');
    const factory = typeof pretty === 'function' ? pretty : pretty.default ?? pretty;
    stream = factory({
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    });
  } catch {
    // pino-pretty not available (e.g. bundled in Trigger.dev)
  }
}

export const logger = pino(
  {
    level: isDevelopment ? 'debug' : 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        '*.apiKey',
        '*.password',
        '*.token',
      ],
      remove: true,
    },
  },
  stream
);
