import { createHash } from 'node:crypto';

/**
 * Compute SHA-256 content hash for caching and idempotency.
 * Used for: canonical URL + document URLs + optional content hash.
 */
export function contentHash(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Build idempotency key for T&C scan: same page URL + document URLs + content hash → same scan_id.
 */
export function buildScanIdempotencyKey(pageUrl: string, documentUrls: string[], contentHashValue?: string): string {
  const normalized = [pageUrl, ...documentUrls].sort().join('|');
  const withHash = contentHashValue ? `${normalized}|${contentHashValue}` : normalized;
  return contentHash(withHash);
}
