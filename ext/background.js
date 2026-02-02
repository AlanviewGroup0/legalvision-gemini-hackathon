/**
 * Legal Vision - Background Service Worker
 * Handles API calls to the analysis server
 */

import { config } from './config.js';

console.log('[Legal Vision] Background service worker loaded');

/**
 * Get server URL from config
 */
function getServerUrl() {
  return config.serverUrl || 'http://localhost:3000';
}

/**
 * Fetch analysis from server API
 * Creates an analysis job and returns the jobId
 * Includes retry logic for network failures
 */
async function fetchAnalysisFromServer(legalDocumentUrls, maxRetries = 2) {
  if (!legalDocumentUrls || legalDocumentUrls.length === 0) {
    throw new Error('No legal document URLs provided');
  }

  const serverUrl = getServerUrl();
  const apiUrl = `${serverUrl}/api/analyze`;

  // Extract all document URLs
  const urlsToAnalyze = legalDocumentUrls.map(link => link.url);

  console.log('[Legal Vision] Creating analysis job for', urlsToAnalyze.length, 'document(s):', urlsToAnalyze);

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlsToAnalyze[0], // Primary URL for job creation
          urls: urlsToAnalyze.length > 1 ? urlsToAnalyze : undefined, // All URLs if multiple
          analysisType: 'legal',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`API error: ${response.status} ${response.statusText}`);
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }
        
        // Retry on server errors (5xx) or network errors
        if (attempt <= maxRetries) {
          console.warn(`[Legal Vision] API error, retrying (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        throw lastError;
      }

      const data = await response.json();
      
      // Check if response contains analysis directly (cached or newly completed)
      if (data.data?.analysis && data.data?.status === 'COMPLETED') {
        console.log('[Legal Vision] Received analysis from POST (cached or completed)');
        return data.data.analysis;
      }
      
      // 202 Accepted: server returned job ID for polling (legal: scan_id, non-legal: jobId)
      const jobId = data.data?.jobId ?? data.data?.scan_id;
      if (jobId) {
        console.log('[Legal Vision] Job queued (202), polling for results:', jobId);
        return jobId;
      }
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }

      throw new Error('Unexpected response format from server');
    } catch (error) {
      lastError = error;
      
      // Check if it's a network error (fetch failed)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (attempt <= maxRetries) {
          console.warn(`[Legal Vision] Network error, retrying (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error('Unable to connect to analysis service. Please check your connection.');
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Failed to create analysis job');
}

/**
 * Poll job status until completion or timeout
 * Returns the analysis result or throws error
 * Legal scans can take longer (multiple docs, scraping) so timeout is generous
 */
async function pollJobStatus(jobId, timeout = 120000) {
  const serverUrl = getServerUrl();
  const apiUrl = `${serverUrl}/api/analyze/${jobId}`;
  const pollInterval = 5000; // Poll every 5 seconds (tasks take 30–60s; avoid DDoS)
  const startTime = Date.now();

  console.log('[Legal Vision] Polling job status:', jobId);

  // Initial delay before first poll: Neon serverless can have read-after-write lag,
  // and the job may not be visible immediately after POST returns 202
  await new Promise(resolve => setTimeout(resolve, 500));

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If 404, retry (job may not be committed/replicated yet - Neon read lag)
        if (response.status === 404) {
          const elapsed = Date.now() - startTime;
          if (elapsed < 10000) {
            console.log('[Legal Vision] Job not found (404), retrying in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }

        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }

      const responseData = data.data;
      
      // Check if job is completed
      if (responseData.status === 'COMPLETED' && responseData.analysis) {
        console.log('[Legal Vision] Analysis completed');
        return responseData.analysis;
      }
      
      // Check if job failed
      if (responseData.status === 'FAILED') {
        throw new Error(responseData.errorMessage || 'Analysis failed');
      }

      // Still processing (PENDING, SCRAPING, ANALYZING)
      console.log('[Legal Vision] Job status:', responseData.status, '- continuing to poll...');
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[Legal Vision] Error polling job status:', error);
      throw error;
    }
  }

  // Timeout
  throw new Error('Analysis timeout - took longer than expected');
}

/**
 * Analyze legal documents (main handler)
 * Single endpoint handles both cached and new analysis
 * Waits for processing to complete before returning
 */
async function analyzeLegalDocuments(legalDocumentUrls) {
  try {
    const result = await fetchAnalysisFromServer(legalDocumentUrls);
    
    // If result is already analysis (cached or newly completed), return it
    if (result && typeof result === 'object' && 'consentMoment' in result) {
      console.log('[Legal Vision] Received analysis (cached or completed)');
      return { success: true, analysis: result };
    }
    
    // If result is a jobId (timeout fallback), poll for results
    if (typeof result === 'string') {
      console.log('[Legal Vision] Analysis timed out, polling for results:', result);
      const jobId = result;
      const analysis = await pollJobStatus(jobId);
      return { success: true, analysis };
    }
    
    throw new Error('Unexpected result format from server');
  } catch (error) {
    console.error('[Legal Vision] Error analyzing documents:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Legal Vision] Extension installed/updated:', details.reason);
});

/**
 * Fetch document content from URL
 * Returns HTML - content script will parse it (service workers don't have DOMParser)
 */
async function fetchDocumentContent(url) {
  try {
    // Try direct fetch first (works for same-origin or CORS-enabled URLs)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Return HTML - content script will parse it since service workers don't have DOMParser
    // Limit HTML length to prevent huge documents
    const maxLength = 2000000; // ~2MB of HTML
    const truncatedHtml = html.length > maxLength 
      ? html.substring(0, maxLength) + '\n<!-- Content truncated due to length -->'
      : html;
    
    return {
      success: true,
      html: truncatedHtml,
      url: url
    };
  } catch (error) {
    console.error('[Legal Vision] Error fetching document content:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch document',
      url: url
    };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Legal Vision] Background received message:', request.action);

  if (request.action === 'analyzeLegalDocuments') {
    // Handle async operation
    analyzeLegalDocuments(request.legalDocumentUrls)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error occurred' 
        });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }

  if (request.action === 'fetchDocumentContent') {
    // Handle async operation
    fetchDocumentContent(request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message || 'Failed to fetch document',
          url: request.url
        });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }

  if (request.action === 'checkAI') {
    // This is handled by content script, but we can pass it through
    sendResponse({ handled: false });
    return false;
  }

  return false;
});

