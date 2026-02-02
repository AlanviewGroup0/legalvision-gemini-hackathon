import { Elysia } from 'elysia';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError, toErrorResponse } from '../lib/errors.js';

/**
 * Global error handler middleware
 */
export const errorHandlerMiddleware = new Elysia({ name: 'error-handler' })
  // @ts-expect-error - requestId is managed by middleware
  .onError(({ code, error, request, requestId }) => {
    // Log error
    logger.error(
      {
        requestId,
        method: request.method,
        path: request.url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Request error'
    );

    // Handle known errors
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify(
          toErrorResponse(error, config.server.isDevelopment)
        ),
        {
          status: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || 'unknown',
          },
        }
      );
    }

    // Handle validation errors (Elysia)
    if (code === 'VALIDATION') {
      return new Response(
        JSON.stringify(
          toErrorResponse(
            new AppError('VALIDATION_ERROR', 'Invalid request data', 400, error),
            config.server.isDevelopment
          )
        ),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || 'unknown',
          },
        }
      );
    }

    // Handle unknown errors
    return new Response(
      JSON.stringify(
        toErrorResponse(
          new AppError(
            'INTERNAL_ERROR',
            'An internal error occurred',
            500,
            error
          ),
          config.server.isDevelopment
        )
      ),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId || 'unknown',
        },
      }
    );
  });
