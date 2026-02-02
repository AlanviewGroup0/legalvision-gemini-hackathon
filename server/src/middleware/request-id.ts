import { Elysia } from 'elysia';
import { logger } from '../lib/logger.js';

/**
 * Request ID middleware
 * Generates or accepts X-Request-ID header and attaches to context
 */
export const requestIdMiddleware = new Elysia({ name: 'request-id' })
  .derive(({ request }) => {
    const requestId =
      request.headers.get('x-request-id') || crypto.randomUUID();

    // Attach to logger context
    logger.child({ requestId });

    return {
      requestId,
    };
  })
  .onAfterHandle(({ requestId, response }) => {
    // Add request ID to response headers
    if (response instanceof Response) {
      response.headers.set('X-Request-ID', requestId);
    }
  });
