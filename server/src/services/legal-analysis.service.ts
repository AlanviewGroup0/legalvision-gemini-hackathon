import { logger } from '../lib/logger.js';
import { scrapeWebsite } from './scraper.service.js';
import { analyzeLegalDocument } from './gemini.service.js';
import type { LegalAnalysis } from '../types/index.js';

/**
 * Analyze a legal document from a URL
 * Scrapes the document and analyzes it with Gemini
 */
export async function analyzeLegalDocumentFromUrl(
  url: string,
  pageContext?: { title?: string; buttonText?: string; pageType?: string }
): Promise<{ analysis: LegalAnalysis; tokensUsed: number }> {
  logger.info({ url }, 'Starting legal document analysis');

  // Step 1: Scrape the document
  logger.debug({ url }, 'Scraping legal document');
  const scrapedContent = await scrapeWebsite(url);

  // Step 2: Analyze with Gemini
  logger.debug({ url, wordCount: scrapedContent.wordCount }, 'Analyzing legal document with Gemini');
  const { analysis, tokensUsed } = await analyzeLegalDocument(
    url,
    scrapedContent.content,
    pageContext
  );

  logger.info(
    { url, tokensUsed, riskCount: analysis.riskSummary.totalRisks },
    'Legal document analysis completed'
  );

  return { analysis, tokensUsed };
}

/**
 * Analyze multiple legal documents and combine results
 * Used when a consent page references multiple documents (e.g., Terms + Privacy Policy)
 */
export async function analyzeMultipleLegalDocuments(
  urls: string[],
  pageContext?: { title?: string; buttonText?: string; pageType?: string }
): Promise<{ analysis: LegalAnalysis; tokensUsed: number }> {
  if (urls.length === 0) {
    throw new Error('No URLs provided for analysis');
  }

  logger.info({ urlCount: urls.length }, 'Analyzing multiple legal documents');

  // Analyze each document
  const analyses = await Promise.all(
    urls.map((url) => analyzeLegalDocumentFromUrl(url, pageContext))
  );

  // Combine results
  const combinedTokens = analyses.reduce((sum, a) => sum + a.tokensUsed, 0);

  // Merge documents
  const allDocuments = analyses.flatMap((a) => a.analysis.documents);

  // Merge risks (deduplicate by ID)
  const riskMap = new Map<string, LegalAnalysis['risks'][0]>();
  for (const a of analyses) {
    for (const risk of a.analysis.risks) {
      if (!riskMap.has(risk.id)) {
        riskMap.set(risk.id, risk);
      }
    }
  }
  const allRisks = Array.from(riskMap.values());

  // Calculate combined risk summary
  const totalRisks = allRisks.length;
  const highSeverityCount = allRisks.filter((r) => r.severity === 'high').length;
  const overallAssessment: LegalAnalysis['riskSummary']['overallAssessment'] =
    highSeverityCount >= 3
      ? 'high_concern'
      : highSeverityCount >= 1
        ? 'moderate_concern'
        : 'low_concern';

  // Merge consent scopes (take union of all)
  const allPrimaryActions = new Set<string>();
  const allDataCollected = new Set<string>();
  const allServicesCovered = new Set<string>();

  for (const a of analyses) {
    a.analysis.consentScope.primaryActions.forEach((action) => allPrimaryActions.add(action));
    a.analysis.consentScope.dataCollected.forEach((data) => allDataCollected.add(data));
    a.analysis.consentScope.servicesCovered.forEach((service) => allServicesCovered.add(service));
  }

  const firstAnalysis = analyses[0];
  if (!firstAnalysis) {
    throw new Error('No analyses provided');
  }
  const baseConsentMoment = firstAnalysis.analysis.consentMoment;

  const allExplanations = new Map<string, NonNullable<LegalAnalysis['explanations']>[0]>();
  for (const a of analyses) {
    const explanations = a.analysis.explanations;
    if (explanations) {
      for (const exp of explanations) {
        if (!allExplanations.has(exp.term.toLowerCase())) {
          allExplanations.set(exp.term.toLowerCase(), exp);
        }
      }
    }
  }

  // Merge key points
  const allKeyPoints = new Set<string>();
  for (const a of analyses) {
    if (a.analysis.keyPoints) {
      a.analysis.keyPoints.forEach((point) => allKeyPoints.add(point));
    }
  }

  const combinedAnalysis: LegalAnalysis = {
    consentMoment: {
      ...baseConsentMoment,
      documentsReferenced: allDocuments.length,
      quickSummary: allDocuments.length > 1
        ? `You're agreeing to ${allDocuments.length} legal documents`
        : baseConsentMoment.quickSummary,
    },
    documents: allDocuments,
    consentScope: {
      primaryActions: Array.from(allPrimaryActions),
      dataCollected: Array.from(allDataCollected),
      servicesCovered: Array.from(allServicesCovered),
      summary: analyses
        .map((a) => a.analysis.consentScope.summary)
        .join(' ')
        .substring(0, 500), // Limit combined summary length
    },
    risks: allRisks,
    riskSummary: {
      totalRisks,
      highSeverityCount,
      overallAssessment,
    },
    explanations: allExplanations.size > 0 ? Array.from(allExplanations.values()) : undefined,
    keyPoints: allKeyPoints.size > 0 ? Array.from(allKeyPoints) : undefined,
  };

  logger.info(
    {
      urlCount: urls.length,
      totalRisks,
      highSeverityCount,
      tokensUsed: combinedTokens,
    },
    'Multiple legal documents analysis completed'
  );

  return { analysis: combinedAnalysis, tokensUsed: combinedTokens };
}
