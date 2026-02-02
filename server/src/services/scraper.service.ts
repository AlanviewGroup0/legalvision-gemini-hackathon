import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { ScrapingError } from '../lib/errors.js';
import type { ScrapedContent } from '../types/index.js';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0/scrape';
const JINA_READER_URL = 'https://r.jina.ai';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate word count from text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Scrape using Firecrawl API
 */
async function scrapeWithFirecrawl(url: string): Promise<ScrapedContent> {
  if (!config.firecrawl.apiKey) {
    throw new ScrapingError('Firecrawl API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.firecrawl.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new ScrapingError(
        `Firecrawl API error: ${response.status} ${response.statusText}`,
        { error: errorText }
      );
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        markdown?: string;
        metadata?: {
          title?: string;
          description?: string;
        };
      };
    };

    if (!data.success || !data.data) {
      throw new ScrapingError('Firecrawl returned unsuccessful response', { data });
    }

    const markdown = data.data.markdown || '';
    const metadata = data.data.metadata || {};

    return {
      url,
      title: (metadata.title || 'Untitled') as string,
      description: (metadata.description || '') as string,
      content: markdown,
      wordCount: countWords(markdown),
      scrapedAt: new Date(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ScrapingError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ScrapingError('Request timeout while scraping with Firecrawl', { url });
    }
    throw new ScrapingError(
      `Failed to scrape with Firecrawl: ${error instanceof Error ? error.message : String(error)}`,
      { url, error }
    );
  }
}

/**
 * Scrape using Jina Reader (free fallback)
 */
async function scrapeWithJina(url: string): Promise<ScrapedContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${JINA_READER_URL}/${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new ScrapingError(
        `Jina Reader API error: ${response.status} ${response.statusText}`,
        { error: errorText }
      );
    }

    const markdown = await response.text();
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    const safeTitle: string = title || 'Untitled';

    // Try to extract description from first paragraph
    const descriptionMatch = markdown.match(/^[^#\n].+$/m);
    const description = descriptionMatch ? descriptionMatch[0].slice(0, 200) : '';

    return {
      url,
      title: safeTitle,
      description: description || '',
      content: markdown,
      wordCount: countWords(markdown),
      scrapedAt: new Date(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ScrapingError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ScrapingError('Request timeout while scraping with Jina Reader', { url });
    }
    throw new ScrapingError(
      `Failed to scrape with Jina Reader: ${error instanceof Error ? error.message : String(error)}`,
      { url, error }
    );
  }
}

/**
 * Scrape website content with retry logic
 * Tries Firecrawl first, falls back to Jina Reader
 */
export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  let lastError: Error | null = null;

  // Try Firecrawl first if API key is available
  if (config.firecrawl.apiKey) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug({ url, attempt, provider: 'firecrawl' }, 'Attempting to scrape with Firecrawl');
        return await scrapeWithFirecrawl(url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          { url, attempt, error: lastError.message, provider: 'firecrawl' },
          'Firecrawl scrape attempt failed'
        );

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
    }
  }

  // Fallback to Jina Reader
  logger.info({ url, provider: 'jina' }, 'Falling back to Jina Reader');
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug({ url, attempt, provider: 'jina' }, 'Attempting to scrape with Jina Reader');
      return await scrapeWithJina(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { url, attempt, error: lastError.message, provider: 'jina' },
        'Jina Reader scrape attempt failed'
      );

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  throw new ScrapingError(
    `Failed to scrape website after ${MAX_RETRIES} attempts with all providers`,
    { url, lastError: lastError?.message }
  );
}
