export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details?: any;

  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', originalError?: Error) {
    super(message, 500, false, 'DATABASE_ERROR');
    if (originalError) {
      this.cause = originalError;
    }
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string = 'External API error') {
    super(`${service}: ${message}`, 502, false, 'EXTERNAL_API_ERROR');
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

export class TradingError extends AppError {
  public readonly tradeId?: string;

  constructor(message: string = 'Trading operation failed', tradeId?: string) {
    super(message, 400, true, 'TRADING_ERROR');
    this.tradeId = tradeId;
  }
}

export class StrategyError extends AppError {
  public readonly strategyId?: string;

  constructor(message: string = 'Strategy operation failed', strategyId?: string) {
    super(message, 400, true, 'STRATEGY_ERROR');
    this.strategyId = strategyId;
  }
}

export class BotError extends AppError {
  public readonly botId?: string;

  constructor(message: string = 'Bot operation failed', botId?: string) {
    super(message, 400, true, 'BOT_ERROR');
    this.botId = botId;
  }
}

// Utility function to create error from unknown error
export function createError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, false);
  }

  return new AppError('An unknown error occurred', 500, false);
}

// Error response formatter
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export function formatErrorResponse(error: unknown): ErrorResponse {
  const appError = error instanceof AppError ? error : createError(error);

  const response: ErrorResponse = {
    success: false,
    error: appError.message,
    code: appError.code,
    timestamp: new Date().toISOString(),
  };

  if (appError instanceof ValidationError && appError.details) {
    response.details = appError.details;
  }

  return response;
}