/**
 * Scraped content from website
 */
export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string; // Clean markdown
  wordCount: number;
  scrapedAt: Date;
}

/**
 * Comprehensive Gemini analysis structure
 */
export interface GeminiAnalysis {
  summary: string;
  businessType: string;
  targetAudience: string;
  keyServices: string[];
  uniqueSellingPoints: string[];
  toneAndVoice: string;
  seoAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  contentQuality: {
    score: number; // 1-10
    feedback: string;
  };
  technicalObservations: string[];
  competitorInsights: string[];
  actionableRecommendations: string[];
}

/**
 * Legal document analysis structure
 * Matches the canonical JSON schema from the build plan
 */
export interface LegalAnalysis {
  // Consent moment summary
  consentMoment: {
    pageType: 'signup' | 'checkout' | 'subscription' | 'agreement' | 'other';
    actionDescription: string;
    documentsReferenced: number;
    quickSummary: string;
  };

  // Document detection
  documents: Array<{
    type: 'terms_of_service' | 'privacy_policy' | 'user_agreement' | 'cookie_policy' | 'other';
    url: string;
    title: string;
    detectedAt: string; // ISO8601
    confidence: number; // 0.0-1.0
  }>;

  // Consent scope
  consentScope: {
    primaryActions: string[];
    dataCollected: string[];
    servicesCovered: string[];
    summary: string; // Plain language, 2-3 sentences
  };

  // Risk analysis
  risks: Array<{
    id: string;
    category: 'data_sharing' | 'arbitration' | 'liability_limitation' | 'auto_renewal' | 'data_retention' | 'other';
    severity: 'low' | 'medium' | 'high';
    title: string; // User-friendly
    description: string; // Plain language, non-legal
    location?: string; // Optional section reference
    icon?: string; // Optional Lucide icon name (e.g., "shield-alert", "cube")
  }>;

  riskSummary: {
    totalRisks: number;
    highSeverityCount: number;
    overallAssessment: 'low_concern' | 'moderate_concern' | 'high_concern';
  };

  // Plain language (optional)
  explanations?: Array<{
    term: string;
    plainLanguage: string;
    context: string;
  }>;

  keyPoints?: string[]; // Optional summary bullets
}

/**
 * Early findings surfaced before final summary (T&C scan progressive disclosure)
 */
export interface EarlyFinding {
  category: 'arbitration' | 'data_sharing' | 'auto_renewal' | 'liability_limitation' | 'data_retention' | 'other';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  confidence: number; // 0.0-1.0
  documentUrl?: string;
}

/**
 * Phase timestamps for resumability and progress (ISO8601 per phase)
 */
export type PhaseTimestamps = Partial<Record<
  'SCAN_CREATED' | 'TERMS_DISCOVERED' | 'DOCUMENT_FETCHED' | 'NORMALIZED' | 'ANALYZING' | 'SUMMARIZING' | 'COMPLETE' | 'FAILED',
  string
>>;

/**
 * Scan progress payload (status, phase, progress, early findings)
 */
export interface ScanProgress {
  scan_id: string;
  status: string;
  current_phase: string;
  progress_percent: number;
  early_findings?: EarlyFinding[];
  phase_timestamps?: PhaseTimestamps;
  last_completed_phase?: string | null;
  failure_reason?: string | null;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}
