import { z } from 'zod';
import { AnalysisStatus } from '../generated/prisma/client.js';

/**
 * Analysis type enum
 */
export const AnalysisType = z.enum(['comprehensive', 'seo', 'content', 'technical', 'legal']);

export type AnalysisType = z.infer<typeof AnalysisType>;

/**
 * Request schema for POST /api/analyze
 */
export const analyzeRequestSchema = z.object({
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  urls: z.array(z.string().url('Invalid URL format').max(2048, 'URL too long')).optional(),
  analysisType: AnalysisType.default('comprehensive'),
  idempotencyKey: z.string().max(256).optional(),
  contentHash: z.string().max(64).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

/**
 * Query params schema for GET /api/analyze (list)
 */
export const listAnalysesSchema = z.object({
  url: z.string().url().optional(),
  status: z.nativeEnum(AnalysisStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ListAnalysesQuery = z.infer<typeof listAnalysesSchema>;
