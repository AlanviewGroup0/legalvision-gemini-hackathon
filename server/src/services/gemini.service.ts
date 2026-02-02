import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { GeminiError } from '../lib/errors.js';
import type { GeminiAnalysis, LegalAnalysis } from '../types/index.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_TOKENS = 8192; // Adjust based on model limits

// Analysis schema for structured output
const ANALYSIS_SCHEMA = {
  summary: 'string',
  businessType: 'string',
  targetAudience: 'string',
  keyServices: 'array of strings',
  uniqueSellingPoints: 'array of strings',
  toneAndVoice: 'string',
  seoAnalysis: {
    strengths: 'array of strings',
    weaknesses: 'array of strings',
    recommendations: 'array of strings',
  },
  contentQuality: {
    score: 'number (1-10)',
    feedback: 'string',
  },
  technicalObservations: 'array of strings',
  competitorInsights: 'array of strings',
  actionableRecommendations: 'array of strings',
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize newlines in text - replace multiple consecutive newlines with single newline
 * Ensures paragraphs only have one newline between them
 */
function normalizeNewlines(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  // First, normalize all newline types to \n
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Then, replace 2+ consecutive newlines with a single newline
  normalized = normalized.replace(/\n{2,}/g, '\n');
  return normalized;
}

/**
 * Recursively normalize newlines in all string values of an object
 */
function normalizeNewlinesInObject(obj: any): any {
  if (typeof obj === 'string') {
    return normalizeNewlines(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeNewlinesInObject);
  }
  if (obj && typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[key] = normalizeNewlinesInObject(value);
    }
    return normalized;
  }
  return obj;
}

/**
 * Truncate content if it exceeds token limits
 * Rough estimation: 1 token ≈ 4 characters
 */
function truncateContent(content: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (content.length <= maxChars) {
    return content;
  }
  logger.warn(
    { originalLength: content.length, maxChars, truncated: true },
    'Content truncated to fit token limits'
  );
  return content.slice(0, maxChars) + '\n\n[Content truncated due to length limits]';
}

/**
 * Build analysis prompt
 */
function buildAnalysisPrompt(url: string, content: string, analysisType: string): string {
  const schemaDescription = JSON.stringify(ANALYSIS_SCHEMA, null, 2);

  return `You are an expert website analyst. Analyze the following website content and provide a comprehensive assessment.

Website URL: ${url}
Analysis Type: ${analysisType}

Website Content:
---
${content}
---

Provide your analysis in the following JSON structure:
${schemaDescription}

Be specific, actionable, and back up observations with evidence from the content. Focus on practical recommendations that would improve the website's effectiveness.

For the analysis type "${analysisType}":
- comprehensive: Full analysis of all aspects
- seo: Focus on SEO strengths, weaknesses, and recommendations
- content: Focus on content quality, tone, and messaging
- technical: Focus on technical observations and technical recommendations

Return ONLY valid JSON matching the schema above. Do not include markdown code blocks or any other formatting.`;
}

/**
 * Parse Gemini response to structured analysis
 */
function parseAnalysisResponse(response: string): GeminiAnalysis {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned) as GeminiAnalysis;

    // Validate structure
    if (
      !parsed.summary ||
      !parsed.businessType ||
      !Array.isArray(parsed.keyServices) ||
      !parsed.seoAnalysis ||
      !parsed.contentQuality
    ) {
      throw new Error('Invalid analysis structure');
    }

    // Normalize newlines in all text fields
    return normalizeNewlinesInObject(parsed) as GeminiAnalysis;
  } catch (error) {
    logger.error({ error, response }, 'Failed to parse Gemini response');
    throw new GeminiError(
      'Failed to parse analysis response from Gemini',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Analyze content using Google Gemini API with retry logic
 */
export async function analyzeWithGemini(
  url: string,
  content: string,
  analysisType: string
): Promise<{ analysis: GeminiAnalysis; tokensUsed: number }> {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({ model: config.gemini.model });

  // Truncate content if needed
  const truncatedContent = truncateContent(content, MAX_TOKENS);

  const prompt = buildAnalysisPrompt(url, truncatedContent, analysisType);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug({ url, attempt, analysisType }, 'Sending request to Gemini API');

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Get token usage
      const usageMetadata = response.usageMetadata;
      const tokensUsed = usageMetadata?.totalTokenCount || 0;

      logger.info(
        { url, tokensUsed, attempt },
        'Successfully received analysis from Gemini'
      );

      const analysis = parseAnalysisResponse(text);

      return { analysis, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error
      const isRateLimit =
        lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('quota');

      if (isRateLimit && attempt < MAX_RETRIES) {
        // Exponential backoff with longer delay for rate limits
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt) * 2;
        logger.warn(
          { url, attempt, delay, error: lastError.message },
          'Rate limit hit, retrying with backoff'
        );
        await sleep(delay);
        continue;
      }

      logger.warn(
        { url, attempt, error: lastError.message },
        'Gemini API request failed'
      );

      if (attempt < MAX_RETRIES && !isRateLimit) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  // All attempts failed
  throw new GeminiError(
    `Failed to analyze content with Gemini after ${MAX_RETRIES} attempts`,
    {
      url,
      lastError: lastError?.message,
      analysisType,
    }
  );
}

/**
 * Legal analysis schema for structured output
 */
const LEGAL_ANALYSIS_SCHEMA = {
  consentMoment: {
    pageType: 'string (one of: signup, checkout, subscription, agreement, other)',
    actionDescription: 'string (what user is about to do)',
    documentsReferenced: 'number',
    quickSummary: 'string (1 sentence plain language summary)',
  },
  documents: 'array of { type: string (terms_of_service|privacy_policy|user_agreement|cookie_policy|other), url: string, title: string, detectedAt: string (ISO8601), confidence: number (0.0-1.0) }',
  consentScope: {
    primaryActions: 'array of strings',
    dataCollected: 'array of strings',
    servicesCovered: 'array of strings',
    summary: 'string (plain language, 2-3 sentences)',
  },
    risks: 'array of { id: string, category: string (data_sharing|arbitration|liability_limitation|auto_renewal|data_retention|other), severity: string (low|medium|high), title: string (user-friendly), description: string (plain language, non-legal), location: string (optional section reference), icon: string (optional Lucide icon name, e.g. "shield-alert", "lock", "alert-triangle", "dollar-sign", etc. - choose an appropriate icon that represents the risk type) }',
  riskSummary: {
    totalRisks: 'number',
    highSeverityCount: 'number',
    overallAssessment: 'string (low_concern|moderate_concern|high_concern)',
  },
  explanations: 'optional array of { term: string, plainLanguage: string, context: string }',
  keyPoints: 'optional array of strings (summary bullets)',
};

/**
 * Build legal document analysis prompt
 */
function buildLegalAnalysisPrompt(
  url: string,
  content: string,
  pageContext?: { title?: string; buttonText?: string; pageType?: string }
): string {
  const schemaDescription = JSON.stringify(LEGAL_ANALYSIS_SCHEMA, null, 2);
  const contextInfo = pageContext
    ? `\nPage Context:\n- Title: ${pageContext.title || 'Unknown'}\n- Button Text: ${pageContext.buttonText || 'Unknown'}\n- Page Type: ${pageContext.pageType || 'Unknown'}`
    : '';

  return `You are an expert at analyzing legal documents to help users understand what they're agreeing to. Analyze the following legal document and provide a structured analysis.

Document URL: ${url}${contextInfo}

Legal Document Content:
---
${content}
---

CRITICAL RULES:
1. Use plain, non-technical language that anyone can understand
2. Do NOT provide legal advice - only explain what the document says
3. Use "you" and "your" to make it user-focused
4. Avoid legal jargon - explain terms in simple language
5. Be factual and neutral - don't use alarmist language
6. Focus on what the user is actually agreeing to

Provide your analysis in the following JSON structure:
${schemaDescription}

For document detection:
- Identify the type of legal document (terms_of_service, privacy_policy, user_agreement, cookie_policy, or other)
- Extract the document title
- Set confidence based on how clearly it matches the document type

For consent scope:
- List what primary actions the user is agreeing to (e.g., "account_creation", "service_usage", "data_collection")
- List what data is collected (e.g., "email", "name", "payment_info", "usage_analytics")
- List what services are covered (e.g., "core_service", "third_party_integrations")
- Write a 2-3 sentence summary in plain language

For risk analysis:
- Identify potential concerns without providing legal advice
- Categories: data_sharing, arbitration, liability_limitation, auto_renewal, data_retention, or other
- Severity: low (minor concern), medium (moderate concern), high (significant concern)
- Write user-friendly titles and plain language descriptions
- Only include risks that are clearly present in the document
- For each risk, include an "icon" field with an appropriate Lucide icon name (e.g., "shield-alert" for data_sharing, "gavel" for arbitration, "alert-triangle" for liability, "refresh-cw" for auto_renewal, "database" for data_retention, "cube" as default). Choose icons that visually represent the risk type.

For consent moment:
- Determine pageType based on context (signup, checkout, subscription, agreement, or other)
- Describe what action the user is about to take
- Count how many documents are referenced
- Write a 1-sentence quick summary

Return ONLY valid JSON matching the schema above. Do not include markdown code blocks or any other formatting.`;
}

/**
 * Parse Gemini response to structured legal analysis
 */
function parseLegalAnalysisResponse(response: string): LegalAnalysis {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned) as LegalAnalysis;

    // Validate required structure
    if (
      !parsed.consentMoment ||
      !parsed.consentMoment.pageType ||
      !parsed.consentMoment.quickSummary ||
      !Array.isArray(parsed.documents) ||
      !parsed.consentScope ||
      !parsed.consentScope.summary ||
      !Array.isArray(parsed.risks) ||
      !parsed.riskSummary
    ) {
      throw new Error('Invalid legal analysis structure - missing required fields');
    }

    // Ensure risk IDs are present
    parsed.risks = parsed.risks.map((risk, index) => ({
      ...risk,
      id: risk.id || `risk-${index + 1}`,
    }));

    // Normalize newlines in all text fields
    return normalizeNewlinesInObject(parsed) as LegalAnalysis;
  } catch (error) {
    logger.error({ error, response }, 'Failed to parse legal analysis response from Gemini');
    throw new GeminiError(
      'Failed to parse legal analysis response from Gemini',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Analyze legal document using Google Gemini API with retry logic
 */
export async function analyzeLegalDocument(
  url: string,
  content: string,
  pageContext?: { title?: string; buttonText?: string; pageType?: string }
): Promise<{ analysis: LegalAnalysis; tokensUsed: number }> {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({ model: config.gemini.model });

  // Truncate content if needed
  const truncatedContent = truncateContent(content, MAX_TOKENS);

  const prompt = buildLegalAnalysisPrompt(url, truncatedContent, pageContext);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug({ url, attempt }, 'Sending legal document analysis request to Gemini API');

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Get token usage
      const usageMetadata = response.usageMetadata;
      const tokensUsed = usageMetadata?.totalTokenCount || 0;

      logger.info(
        { url, tokensUsed, attempt },
        'Successfully received legal analysis from Gemini'
      );

      const analysis = parseLegalAnalysisResponse(text);

      return { analysis, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error
      const isRateLimit =
        lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('quota');

      if (isRateLimit && attempt < MAX_RETRIES) {
        // Exponential backoff with longer delay for rate limits
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt) * 2;
        logger.warn(
          { url, attempt, delay, error: lastError.message },
          'Rate limit hit, retrying with backoff'
        );
        await sleep(delay);
        continue;
      }

      logger.warn(
        { url, attempt, error: lastError.message },
        'Gemini API request failed for legal analysis'
      );

      if (attempt < MAX_RETRIES && !isRateLimit) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  // All attempts failed
  throw new GeminiError(
    `Failed to analyze legal document with Gemini after ${MAX_RETRIES} attempts`,
    {
      url,
      lastError: lastError?.message,
    }
  );
}
