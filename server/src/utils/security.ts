import { SecurityError } from '../lib/errors.js';

/**
 * Validates URL security to prevent SSRF attacks
 * Blocks private IPs, localhost, metadata endpoints, and invalid protocols
 */
export function validateUrlSecurity(url: string): { valid: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        reason: `Invalid protocol: ${urlObj.protocol}. Only http and https are allowed.`,
      };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost and loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('127.') ||
      hostname === '[::1]'
    ) {
      return {
        valid: false,
        reason: 'Localhost and loopback addresses are not allowed',
      };
    }

    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return {
        valid: false,
        reason: 'Cloud metadata endpoints are not allowed',
      };
    }

    // Block internal/private hostnames
    const internalHostnames = [
      '.local',
      '.internal',
      '.corp',
      '.lan',
      'localhost',
    ];
    if (internalHostnames.some((internal) => hostname.includes(internal))) {
      return {
        valid: false,
        reason: 'Internal hostnames are not allowed',
      };
    }

    // Check for private IP ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (match) {
      const parts = match.slice(1, 5).map(Number);
      const [a, b, c, d] = parts;

      if (a === undefined || b === undefined || c === undefined || d === undefined) {
        return {
          valid: false,
          reason: 'Invalid IP address format',
        };
      }

      // Validate IP range
      if ([a, b, c, d].some((octet) => octet > 255)) {
        return {
          valid: false,
          reason: 'Invalid IP address format',
        };
      }

      // Block private IP ranges
      // 10.0.0.0/8
      if (a === 10) {
        return {
          valid: false,
          reason: 'Private IP range (10.0.0.0/8) is not allowed',
        };
      }

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) {
        return {
          valid: false,
          reason: 'Private IP range (172.16.0.0/12) is not allowed',
        };
      }

      // 192.168.0.0/16
      if (a === 192 && b === 168) {
        return {
          valid: false,
          reason: 'Private IP range (192.168.0.0/16) is not allowed',
        };
      }

      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) {
        return {
          valid: false,
          reason: 'Link-local IP range (169.254.0.0/16) is not allowed',
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validates URL and throws SecurityError if invalid
 */
export function assertUrlSecurity(url: string): void {
  const validation = validateUrlSecurity(url);
  if (!validation.valid) {
    throw new SecurityError(validation.reason || 'URL security validation failed', { url });
  }
}

/**
 * Normalizes URL for deduplication
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, normalize protocol, lowercase hostname
    urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
    urlObj.hostname = urlObj.hostname.toLowerCase();
    urlObj.hash = ''; // Remove hash
    urlObj.searchParams.sort(); // Sort query params
    return urlObj.toString();
  } catch {
    return url;
  }
}
