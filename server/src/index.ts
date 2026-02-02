import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { rateLimit } from 'elysia-rate-limit';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { healthRoute } from './routes/health.js';
import { analyzeRoute } from './routes/analyze.js';

// Validate environment on startup
logger.info({ nodeEnv: config.server.nodeEnv }, 'Starting server');

// Create Elysia app
const app = new Elysia()
  .use(
    cors({
      origin: config.server.isProduction
        ? process.env.CORS_ORIGIN?.split(',') || []
        : true, // Allow all origins in development
      credentials: true,
    })
  )
  .use(
    rateLimit({
      duration: 60000, // 1 minute window
      max: 60, // 60 requests per minute per IP
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    })
  )
  .use(requestIdMiddleware)
  .use(errorHandlerMiddleware)
  .use(healthRoute)
  .use(analyzeRoute)
  .onStart(() => {
    logger.info({ port: config.server.port }, 'Server started');
  })
  .onStop(() => {
    logger.info('Server stopped');
  });

// On Vercel, do not listen - platform handles requests. Export app as default.
if (!process.env.VERCEL) {
  const server = app.listen(config.server.port);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    try {
      await server.stop();
      logger.info('Server stopped gracefully');
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

export default app;
