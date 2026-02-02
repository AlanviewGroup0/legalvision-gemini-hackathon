import { Elysia } from 'elysia';
import { prisma } from '../lib/prisma.js';
import type { ApiResponse } from '../types/index.js';

export interface HealthData {
  status: string;
  timestamp: string;
  database: string;
  version: string;
}

/**
 * Health check endpoint
 */
export const healthRoute = new Elysia({ prefix: '/health' }).get(
  '/',
  async (): Promise<ApiResponse<HealthData>> => {
    let databaseStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      // Database connection failed
    }

    return {
      success: true,
      data: {
        status: databaseStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: databaseStatus,
        version: '1.0.0',
      },
    };
  }
);
