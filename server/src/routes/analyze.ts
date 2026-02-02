import { Elysia, t } from 'elysia';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';
import { assertUrlSecurity, normalizeUrl } from '../utils/security.js';
import {
  analyzeRequestSchema,
  listAnalysesSchema,
  type AnalyzeRequest,
  type ListAnalysesQuery,
} from '../utils/validation.js';
import { tasks } from '@trigger.dev/sdk';
import type { processAnalysisJobTask } from '../trigger/process-analysis-job.js';
import { createAnalysisJob, waitForJobCompletion } from '../services/analysis.service.js';
import { AnalysisStatus } from '../generated/prisma/client.js';
import type { ApiResponse } from '../types/index.js';

import { requestIdMiddleware } from '../middleware/request-id.js';

/**
 * POST /api/analyze - Create new analysis job
 */
const createAnalyzeRoute = new Elysia({ prefix: '/api/analyze' })
  .use(requestIdMiddleware)
  .post(
    '/',
    // @ts-expect-error - requestId is provided by middleware
    async ({ body, requestId, set }): Promise<ApiResponse<{
      id: string;
      url: string;
      status: string;
      analysis: unknown;
      metadata: {
        tokensUsed: number | null;
        processingMs: number | null;
        createdAt: Date;
        completedAt: Date | null;
      };
    } | {
      jobId: string;
      status: string;
      statusUrl: string;
    } | {
      scan_id: string;
      status: string;
      statusUrl: string;
    }>> => {
      // Validate request
      let validatedBody: AnalyzeRequest;
      try {
        validatedBody = analyzeRequestSchema.parse(body);
      } catch (error) {
        throw new ValidationError('Invalid request data', error);
      }

      const { url, urls, analysisType, idempotencyKey, contentHash } = validatedBody;

      const urlsToAnalyze = (analysisType === 'legal' && urls && urls.length > 0) ? urls : [url];
      const primaryUrl = urlsToAnalyze[0];
      if (!primaryUrl) {
        throw new ValidationError('At least one URL is required', {});
      }

      urlsToAnalyze.forEach(urlToCheck => assertUrlSecurity(urlToCheck));
      const normalizedUrl = normalizeUrl(primaryUrl);

      logger.info({ url: primaryUrl, urls: urlsToAnalyze, normalizedUrl, analysisType, requestId }, 'Analyzing URL(s)');

      const jobResult = await createAnalysisJob(
        primaryUrl,
        normalizedUrl,
        analysisType,
        urlsToAnalyze.length > 1 ? urlsToAnalyze : undefined,
        { idempotencyKey, contentHash }
      );

      // If job is already completed (cached), return analysis immediately
      if (jobResult.status === AnalysisStatus.COMPLETED && jobResult.isCached) {
        logger.info({ jobId: jobResult.jobId, requestId }, 'Returning cached analysis');
        const completedJob = await prisma.analysisJob.findUnique({
          where: { id: jobResult.jobId },
          select: {
            id: true,
            url: true,
            status: true,
            analysis: true,
            tokensUsed: true,
            processingMs: true,
            createdAt: true,
            completedAt: true,
          },
        });
        if (completedJob && completedJob.analysis && completedJob.status === AnalysisStatus.COMPLETED) {
          set.status = 200;
          return {
            success: true,
            data: {
              id: completedJob.id,
              url: completedJob.url,
              status: completedJob.status,
              analysis: completedJob.analysis,
              metadata: {
                tokensUsed: completedJob.tokensUsed,
                processingMs: completedJob.processingMs,
                createdAt: completedJob.createdAt,
                completedAt: completedJob.completedAt,
              },
            },
          };
        }
      }

      // Trigger background job via Trigger.dev (never block)
      await tasks.trigger<typeof processAnalysisJobTask>('process-analysis-job', {
        jobId: jobResult.jobId,
      });

      // T&C scan (legal): MUST return immediately with scan_id and status (<500ms). No waiting.
      if (analysisType === 'legal') {
        set.status = 202;
        return {
          success: true,
          data: {
            scan_id: jobResult.jobId,
            status: jobResult.status,
            statusUrl: `/api/analyze/${jobResult.jobId}`,
          },
        };
      }

      // Non-scan: optionally wait for completion (legacy behavior), or return 202 for polling
      try {
        const completedJob = await waitForJobCompletion(jobResult.jobId, 60000);
        const fullJob = await prisma.analysisJob.findUnique({
          where: { id: completedJob.id },
          select: {
            id: true,
            url: true,
            status: true,
            analysis: true,
            tokensUsed: true,
            processingMs: true,
            createdAt: true,
            completedAt: true,
          },
        });
        if (fullJob && fullJob.analysis && fullJob.status === AnalysisStatus.COMPLETED) {
          set.status = 200;
          return {
            success: true,
            data: {
              id: fullJob.id,
              url: fullJob.url,
              status: fullJob.status,
              analysis: fullJob.analysis,
              metadata: {
                tokensUsed: fullJob.tokensUsed,
                processingMs: fullJob.processingMs,
                createdAt: fullJob.createdAt,
                completedAt: fullJob.completedAt,
              },
            },
          };
        }
      } catch {
        // Timeout or error: return jobId for polling
      }
      set.status = 202;
      return {
        success: true,
        data: {
          jobId: jobResult.jobId,
          status: jobResult.status,
          statusUrl: `/api/analyze/${jobResult.jobId}`,
        },
      };
    },
    {
      body: t.Object({
        url: t.String(),
        urls: t.Optional(t.Array(t.String())),
        analysisType: t.Optional(t.Union([
          t.Literal('comprehensive'),
          t.Literal('seo'),
          t.Literal('content'),
          t.Literal('technical'),
          t.Literal('legal'),
        ])),
        idempotencyKey: t.Optional(t.String()),
        contentHash: t.Optional(t.String()),
      }),
    }
  );

/**
 * GET /api/analyze/:jobId - Get analysis job status and results.
 * For T&C scans: exposes current_phase, progress_percent, early_findings,
 * phase_timestamps, last_completed_phase, failure_reason.
 * NOTE: No prefix here - we merge into createAnalyzeRoute which has prefix /api/analyze.
 * If we also used prefix /api/analyze, Elysia would double it → /api/analyze/api/analyze/:jobId (404).
 */
const getAnalyzeRoute = new Elysia()
  .use(requestIdMiddleware)
  .get(
    '/:jobId',
    // @ts-expect-error - requestId is provided by middleware
    async ({ params: { jobId }, requestId }): Promise<ApiResponse<{
      id: string;
      scan_id?: string;
      url: string;
      status: string;
      analysis: unknown | null;
      metadata: {
        tokensUsed: number | null;
        processingMs: number | null;
        createdAt: Date;
        completedAt: Date | null;
      };
      current_phase?: string | null;
      progress_percent?: number | null;
      early_findings?: unknown;
      phase_timestamps?: Record<string, string> | null;
      last_completed_phase?: string | null;
      failure_reason?: string | null;
    }>> => {
      logger.debug({ jobId, requestId }, 'Fetching analysis job');

      const select = {
        id: true,
        url: true,
        status: true,
        analysis: true,
        tokensUsed: true,
        processingMs: true,
        createdAt: true,
        completedAt: true,
        currentPhase: true,
        progressPercent: true,
        earlyFindings: true,
        phaseTimestamps: true,
        lastCompletedPhase: true,
        errorMessage: true,
      };

      let job = await prisma.analysisJob.findUnique({
        where: { id: jobId },
        select,
      });

      // Retry once after short delay: Neon serverless can have read-after-write
      // lag when job was just created and first poll arrives quickly
      if (!job) {
        await new Promise((r) => setTimeout(r, 250));
        job = await prisma.analysisJob.findUnique({
          where: { id: jobId },
          select,
        });
      }

      if (!job) {
        logger.warn({ jobId, requestId }, 'Analysis job not found (404)');
        throw new NotFoundError('Analysis job not found', { jobId });
      }

      const base = {
        id: job.id,
        url: job.url,
        status: job.status,
        analysis: job.analysis,
        metadata: {
          tokensUsed: job.tokensUsed,
          processingMs: job.processingMs,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        },
      };

      const scanFields =
        job.currentPhase != null
          ? {
              scan_id: job.id,
              current_phase: job.currentPhase,
              progress_percent: job.progressPercent ?? 0,
              early_findings: job.earlyFindings ?? undefined,
              phase_timestamps: (job.phaseTimestamps as Record<string, string>) ?? undefined,
              last_completed_phase: job.lastCompletedPhase ?? undefined,
              failure_reason: job.status === 'FAILED' ? job.errorMessage ?? undefined : undefined,
            }
          : {};

      return {
        success: true,
        data: { ...base, ...scanFields },
      };
    },
    {
      params: t.Object({
        jobId: t.String(),
      }),
    }
  );

/**
 * GET /api/analyze - List analyses with filtering
 * NOTE: No prefix - merged into createAnalyzeRoute (prefix /api/analyze).
 */
const listAnalyzeRoute = new Elysia()
  .use(requestIdMiddleware)
  .get(
    '/',
    // @ts-expect-error - requestId is provided by middleware
    async ({ query, requestId }): Promise<ApiResponse<{
      items: Array<{
        id: string;
        url: string;
        status: string;
        createdAt: Date;
        completedAt: Date | null;
      }>;
      nextCursor: string | null;
    }>> => {
      // Validate query params
      let validatedQuery: ListAnalysesQuery;
      try {
        validatedQuery = listAnalysesSchema.parse(query);
      } catch (error) {
        throw new ValidationError('Invalid query parameters', error);
      }

      const { url, status, limit, cursor } = validatedQuery;

      logger.debug({ query: validatedQuery, requestId }, 'Listing analyses');

      // Build where clause
      const where: {
        url?: string;
        status?: AnalysisStatus;
        id?: { lt: string };
      } = {};

      if (url) {
        where.url = url;
      }

      if (status) {
        where.status = status;
      }

      if (cursor) {
        where.id = { lt: cursor };
      }

      // Fetch analyses
      const items = await prisma.analysisJob.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          url: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      });

      // Determine next cursor
      const hasNextPage = items.length > limit;
      const resultItems = hasNextPage ? items.slice(0, limit) : items;
      const nextCursor = hasNextPage ? resultItems[resultItems.length - 1]?.id || null : null;

      return {
        success: true,
        data: {
          items: resultItems,
          nextCursor,
        },
      };
    },
    {
      query: t.Object({
        url: t.Optional(t.String()),
        status: t.Optional(t.Union([
          t.Literal('PENDING'),
          t.Literal('SCRAPING'),
          t.Literal('ANALYZING'),
          t.Literal('COMPLETED'),
          t.Literal('FAILED'),
        ])),
        limit: t.Optional(t.Numeric()),
        cursor: t.Optional(t.String()),
      }),
    }
  );

/**
 * Combine all analyze routes
 */
export const analyzeRoute = createAnalyzeRoute.use(getAnalyzeRoute).use(listAnalyzeRoute);
