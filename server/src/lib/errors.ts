/**
 * Base error class for all custom errors
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/**
 * Not found error for missing resources (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, 404, details);
  }
}

/**
 * Security error for SSRF violations (403)
 */
export class SecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SECURITY_ERROR', message, 403, details);
  }
}

/**
 * Scraping error for website fetch failures (502)
 */
export class ScrapingError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SCRAPING_ERROR', message, 502, details);
  }
}

/**
 * Gemini API error (502)
 */
export class GeminiError extends AppError {
  constructor(message: string, details?: unknown) {
    super('GEMINI_ERROR', message, 502, details);
  }
}

/**
 * Database operation error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, 500, details);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Convert error to error response
 */
export function toErrorResponse(error: unknown, includeDetails = false): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(includeDetails && error.details ? { details: error.details } : {}),
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        ...(includeDetails ? { details: error.stack } : {}),
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      ...(includeDetails ? { details: String(error) } : {}),
    },
  };
}
