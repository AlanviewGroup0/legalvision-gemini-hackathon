import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { DatabaseError } from '../lib/errors.js';
import { scrapeWebsite } from './scraper.service.js';
import { analyzeWithGemini } from './gemini.service.js';
import { analyzeLegalDocumentFromUrl, analyzeMultipleLegalDocuments } from './legal-analysis.service.js';
import type { AnalysisType } from '../utils/validation.js';
import { buildScanIdempotencyKey } from '../utils/hash.js';
import type { EarlyFinding, LegalAnalysis } from '../types/index.js';
import { AnalysisStatus, Prisma, ScanPhase } from '../generated/prisma/client.js';

/**
 * Check if URL was analyzed recently (within 7 days)
 * Returns the full job data including status.
 * For legal scans, optionally match by contentHash when provided.
 */
async function getRecentAnalysis(
  normalizedUrl: string,
  contentHashValue?: string
): Promise<{
  id: string;
  status: AnalysisStatus;
  analysis: unknown;
  metadata: { tokensUsed: number | null; processingMs: number | null; createdAt: Date; completedAt: Date | null };
} | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const where: {
    normalizedUrl: string;
    status: AnalysisStatus;
    completedAt: { gte: Date };
    contentHash?: string;
  } = {
    normalizedUrl,
    status: AnalysisStatus.COMPLETED,
    completedAt: { gte: sevenDaysAgo },
  };
  if (contentHashValue) {
    where.contentHash = contentHashValue;
  }

  const recent = await prisma.analysisJob.findFirst({
    where,
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      status: true,
      analysis: true,
      tokensUsed: true,
      processingMs: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return recent
    ? {
        id: recent.id,
        status: recent.status,
        analysis: recent.analysis,
        metadata: {
          tokensUsed: recent.tokensUsed,
          processingMs: recent.processingMs,
          createdAt: recent.createdAt,
          completedAt: recent.completedAt,
        },
      }
    : null;
}

/** Progress percent by scan phase (approximate, explainable) */
const SCAN_PHASE_PROGRESS: Record<ScanPhase, number> = {
  [ScanPhase.SCAN_CREATED]: 0,
  [ScanPhase.TERMS_DISCOVERED]: 5,
  [ScanPhase.DOCUMENT_FETCHED]: 25,
  [ScanPhase.NORMALIZED]: 40,
  [ScanPhase.ANALYZING]: 70,
  [ScanPhase.SUMMARIZING]: 90,
  [ScanPhase.COMPLETE]: 100,
  [ScanPhase.FAILED]: 0,
};

function setPhaseTimestamp(phaseTimestamps: Record<string, string>, phase: ScanPhase): Record<string, string> {
  return { ...phaseTimestamps, [phase]: new Date().toISOString() };
}

function risksToEarlyFindings(risks: LegalAnalysis['risks'], documentUrl?: string): EarlyFinding[] {
  return risks.map((r) => ({
    category: r.category,
    severity: r.severity,
    title: r.title,
    description: r.description,
    confidence: 0.9,
    documentUrl,
  }));
}

/**
 * Wait for a job to complete by polling its status
 * Returns the completed job or throws if it fails or times out
 * This is used when we want to wait for processing to complete before returning
 * Verifies database updates before returning
 */
export async function waitForJobCompletion(
  jobId: string,
  timeout: number = 60000 // 60 seconds default timeout
): Promise<{
  id: string;
  status: AnalysisStatus;
  analysis: unknown;
  tokensUsed: number | null;
  processingMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
}> {
  const startTime = Date.now();
  const pollInterval = 1000; // Poll every 1 second

  while (Date.now() - startTime < timeout) {
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        analysis: true,
        tokensUsed: true,
        processingMs: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    if (job.status === AnalysisStatus.COMPLETED) {
      // Verify the database actually has the analysis data
      if (!job.analysis) {
        throw new Error('Job marked as completed but analysis data is missing in database');
      }
      
      // Verify completedAt timestamp is set (indicates database was properly updated)
      if (!job.completedAt) {
        throw new Error('Job marked as completed but completedAt timestamp is missing in database');
      }
      
      logger.debug({ jobId }, 'Job completed and verified in database');
      return {
        id: job.id,
        status: job.status,
        analysis: job.analysis,
        tokensUsed: job.tokensUsed,
        processingMs: job.processingMs,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
    }

    if (job.status === AnalysisStatus.FAILED) {
      throw new Error(job.errorMessage || 'Analysis job failed');
    }

    // Still processing - wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
}

/**
 * Process an analysis job. For legal (T&C) scans: phase-based, resumable, with early_findings.
 */
export async function processAnalysisJob(jobId: string): Promise<void> {
  const startTime = Date.now();

  try {
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      logger.error({ jobId }, 'Job not found');
      return;
    }

    // --- T&C Scan flow (legal, state-driven, resumable) ---
    if (job.analysisType === 'legal') {
      await processScanJob(jobId, job, startTime);
      return;
    }

    // --- Legacy flow: PENDING → SCRAPING → ANALYZING → COMPLETED ---
    if (job.status !== AnalysisStatus.PENDING) {
      logger.warn({ jobId, status: job.status }, 'Job is not in PENDING status');
      return;
    }

    logger.info({ jobId, url: job.url }, 'Starting analysis job processing');

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: AnalysisStatus.SCRAPING },
    });

    logger.info({ jobId }, 'Scraping website content');
    const scrapedContent = await scrapeWebsite(job.url);

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        scrapedContent: scrapedContent as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: AnalysisStatus.ANALYZING },
    });

    logger.info({ jobId, analysisType: job.analysisType }, 'Analyzing content with Gemini');

    const result = await analyzeWithGemini(
      job.url,
      scrapedContent.content,
      job.analysisType
    );

    const processingMs = Date.now() - startTime;

    const updateResult = await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisStatus.COMPLETED,
        analysis: result.analysis as unknown as Prisma.InputJsonValue,
        tokensUsed: result.tokensUsed,
        processingMs,
        completedAt: new Date(),
      },
      select: { id: true, status: true, analysis: true },
    });

    if (!updateResult || updateResult.status !== AnalysisStatus.COMPLETED || !updateResult.analysis) {
      throw new Error('Database update failed - job status not properly updated');
    }

    logger.info(
      { jobId, tokensUsed: result.tokensUsed, processingMs },
      'Analysis job completed successfully and database updated'
    );
  } catch (error) {
    const processingMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error({ jobId, error: errorMessage, processingMs }, 'Analysis job failed');

    try {
      const existing = await prisma.analysisJob.findUnique({
        where: { id: jobId },
        select: { currentPhase: true, analysisType: true },
      });

      await prisma.analysisJob.update({
        where: { id: jobId },
        data: {
          status: AnalysisStatus.FAILED,
          errorMessage,
          processingMs,
          ...(existing?.analysisType === 'legal'
            ? {
                currentPhase: ScanPhase.FAILED,
                lastCompletedPhase: existing.currentPhase ?? undefined,
              }
            : {}),
        },
        select: { id: true, status: true },
      });
    } catch (dbError) {
      logger.error(
        { jobId, dbError },
        'Failed to update job status to FAILED'
      );
      throw new DatabaseError('Failed to update job status', { jobId, dbError });
    }
  }
}

/**
 * Process a T&C scan job: forward-only phases, resumable, early_findings, phase timestamps.
 */
async function processScanJob(
  jobId: string,
  job: {
    id: string;
    url: string;
    status: string;
    analysisType: string;
    scrapedContent: unknown;
    currentPhase: ScanPhase | null;
    phaseTimestamps: unknown;
  },
  startTime: number
): Promise<void> {
  const phaseTimestamps = (job.phaseTimestamps as Record<string, string>) ?? {};
  let currentPhase = job.currentPhase ?? ScanPhase.SCAN_CREATED;

  // Already finished
  if (currentPhase === ScanPhase.COMPLETE || currentPhase === ScanPhase.FAILED) {
    logger.debug({ jobId, currentPhase }, 'Scan already in terminal state');
    return;
  }

  // Ensure we have a phase set (resumable from TERMS_DISCOVERED if we have URLs)
  if (currentPhase === ScanPhase.SCAN_CREATED) {
    currentPhase = ScanPhase.TERMS_DISCOVERED;
    const ts = setPhaseTimestamp(phaseTimestamps, ScanPhase.TERMS_DISCOVERED);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        currentPhase: ScanPhase.TERMS_DISCOVERED,
        phaseTimestamps: ts as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.TERMS_DISCOVERED],
      },
    });
    const termTs = ts[ScanPhase.TERMS_DISCOVERED];
    if (termTs) phaseTimestamps[ScanPhase.TERMS_DISCOVERED] = termTs;
  }

  const scrapedMeta = job.scrapedContent as { _metadata?: { additionalUrls?: string[] }; content?: string } | null;
  const additionalUrls = scrapedMeta?._metadata?.additionalUrls;
  const allUrls =
    additionalUrls && additionalUrls.length > 0
      ? [job.url, ...additionalUrls.filter((u) => u !== job.url)]
      : [job.url];

  // TERMS_DISCOVERED → DOCUMENT_FETCHED: fetch documents
  if (currentPhase === ScanPhase.TERMS_DISCOVERED) {
    logger.info({ jobId, urlCount: allUrls.length }, 'Scan: fetching documents');
    const scrapedContent = await scrapeWebsite(job.url);
    const combinedScraped = {
      ...scrapedContent,
      _metadata: { additionalUrls: allUrls },
    } as unknown as Prisma.InputJsonValue;

    const ts = setPhaseTimestamp(phaseTimestamps, ScanPhase.DOCUMENT_FETCHED);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        scrapedContent: combinedScraped,
        currentPhase: ScanPhase.DOCUMENT_FETCHED,
        phaseTimestamps: ts as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.DOCUMENT_FETCHED],
      },
    });
    currentPhase = ScanPhase.DOCUMENT_FETCHED;
    Object.assign(phaseTimestamps, ts);
  }

  // DOCUMENT_FETCHED → NORMALIZED (content already normalized by scraper)
  if (currentPhase === ScanPhase.DOCUMENT_FETCHED) {
    const ts = setPhaseTimestamp(phaseTimestamps, ScanPhase.NORMALIZED);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        currentPhase: ScanPhase.NORMALIZED,
        phaseTimestamps: ts as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.NORMALIZED],
      },
    });
    currentPhase = ScanPhase.NORMALIZED;
    Object.assign(phaseTimestamps, ts);
  }

  // NORMALIZED → ANALYZING → SUMMARIZING → COMPLETE
  if (currentPhase === ScanPhase.NORMALIZED) {
    const tsAnalyzing = setPhaseTimestamp(phaseTimestamps, ScanPhase.ANALYZING);
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        currentPhase: ScanPhase.ANALYZING,
        phaseTimestamps: tsAnalyzing as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.ANALYZING],
      },
    });

    let analysis: LegalAnalysis;
    let tokensUsed: number;

    if (allUrls.length > 1) {
      const result = await analyzeMultipleLegalDocuments(allUrls);
      analysis = result.analysis;
      tokensUsed = result.tokensUsed;
    } else {
      const result = await analyzeLegalDocumentFromUrl(job.url);
      analysis = result.analysis;
      tokensUsed = result.tokensUsed;
    }

    const earlyFindings = risksToEarlyFindings(analysis.risks);

    const tsSummarizing = setPhaseTimestamp(
      { ...phaseTimestamps, ...tsAnalyzing },
      ScanPhase.SUMMARIZING
    );
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        earlyFindings: earlyFindings as unknown as Prisma.InputJsonValue,
        currentPhase: ScanPhase.SUMMARIZING,
        phaseTimestamps: tsSummarizing as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.SUMMARIZING],
      },
    });

    const tsComplete = setPhaseTimestamp(
      { ...phaseTimestamps, ...tsSummarizing },
      ScanPhase.COMPLETE
    );
    const processingMs = Date.now() - startTime;

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisStatus.COMPLETED,
        analysis: analysis as unknown as Prisma.InputJsonValue,
        tokensUsed,
        processingMs,
        completedAt: new Date(),
        currentPhase: ScanPhase.COMPLETE,
        phaseTimestamps: tsComplete as unknown as Prisma.InputJsonValue,
        progressPercent: SCAN_PHASE_PROGRESS[ScanPhase.COMPLETE],
      },
    });

    logger.info(
      { jobId, tokensUsed, processingMs, earlyFindingsCount: earlyFindings.length },
      'Scan job completed successfully'
    );
  }
}

export interface CreateAnalysisJobOptions {
  /** For T&C scan cache/dedup: content hash of page or documents */
  contentHash?: string;
  /** For idempotency: same key → same scan_id. Built from url + documentUrls + contentHash if not provided. */
  idempotencyKey?: string;
}

/**
 * Create a new analysis job or return existing/cached job.
 * For legal (T&C) scans: idempotent (same page URL + document URLs + content hash → same scan_id),
 * never blocks; returns scan_id and status in &lt;500ms. Cached by canonical URL + content hash.
 */
export async function createAnalysisJob(
  url: string,
  normalizedUrl: string,
  analysisType: AnalysisType,
  additionalUrls?: string[],
  options?: CreateAnalysisJobOptions
): Promise<{ jobId: string; status: AnalysisStatus; isCached: boolean }> {
  try {
    const documentUrls = additionalUrls && additionalUrls.length > 0 ? [url, ...additionalUrls.filter((u) => u !== url)] : [url];
    const contentHashValue = options?.contentHash;
    const idempotencyKey =
      options?.idempotencyKey ??
      (analysisType === 'legal' ? buildScanIdempotencyKey(url, documentUrls, contentHashValue) : undefined);

    // Idempotency: identical request → same scan_id (retried requests must not duplicate work)
    if (analysisType === 'legal' && idempotencyKey) {
      const existing = await prisma.analysisJob.findUnique({
        where: { idempotencyKey },
        select: { id: true, status: true, currentPhase: true },
      });
      if (existing) {
        logger.info({ jobId: existing.id, idempotencyKey }, 'Returning existing scan (idempotent)');
        const status =
          existing.currentPhase === ScanPhase.COMPLETE
            ? AnalysisStatus.COMPLETED
            : existing.status === AnalysisStatus.FAILED
              ? AnalysisStatus.FAILED
              : existing.status;
        return { jobId: existing.id, status, isCached: existing.currentPhase === ScanPhase.COMPLETE };
      }
    }

    // Cache: completed analysis within 7 days (by canonical URL, optionally content hash)
    const recent = await getRecentAnalysis(normalizedUrl, contentHashValue ?? undefined);
    if (recent) {
      logger.info({ url, normalizedUrl, recentId: recent.id }, 'Returning cached analysis');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const verifyCached = await prisma.analysisJob.findFirst({
        where: {
          id: recent.id,
          completedAt: { gte: sevenDaysAgo },
        },
        select: { id: true, status: true },
      });
      if (verifyCached) {
        return { jobId: recent.id, status: recent.status, isCached: true };
      }
    }

    // Create new job
    const jobData: {
      url: string;
      normalizedUrl: string;
      analysisType: string;
      status: AnalysisStatus;
      scrapedContent?: Prisma.InputJsonValue;
      currentPhase?: ScanPhase;
      phaseTimestamps?: Prisma.InputJsonValue;
      progressPercent?: number;
      contentHash?: string;
      idempotencyKey?: string;
    } = {
      url,
      normalizedUrl,
      analysisType,
      status: AnalysisStatus.PENDING,
    };

    if (additionalUrls && additionalUrls.length > 1) {
      jobData.scrapedContent = {
        _metadata: { additionalUrls },
      } as Prisma.InputJsonValue;
    }

    if (analysisType === 'legal') {
      jobData.currentPhase = ScanPhase.SCAN_CREATED;
      jobData.phaseTimestamps = { SCAN_CREATED: new Date().toISOString() } as unknown as Prisma.InputJsonValue;
      jobData.progressPercent = SCAN_PHASE_PROGRESS[ScanPhase.SCAN_CREATED];
      if (contentHashValue) jobData.contentHash = contentHashValue;
      if (idempotencyKey) jobData.idempotencyKey = idempotencyKey;
    }

    const job = await prisma.analysisJob.create({
      data: jobData,
      select: { id: true, status: true, url: true },
    });

    if (!job || !job.id || job.status !== AnalysisStatus.PENDING) {
      throw new Error('Failed to create job in database - job not properly created');
    }

    let verifyJob: { id: string; status: AnalysisStatus } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      verifyJob = await prisma.analysisJob.findUnique({
        where: { id: job.id },
        select: { id: true, status: true },
      });
      if (verifyJob?.id === job.id && verifyJob?.status === job.status) break;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 10 * attempt));
    }

    if (!verifyJob || verifyJob.id !== job.id) {
      throw new Error('Job created but not verifiable in database - database update may have failed');
    }

    logger.info({ jobId: job.id, url, isScan: analysisType === 'legal' }, 'Created analysis job and verified in database');
    return { jobId: job.id, status: AnalysisStatus.PENDING, isCached: false };
  } catch (error) {
    logger.error({ url, error }, 'Failed to create analysis job');
    throw new DatabaseError(
      'Failed to create analysis job',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
