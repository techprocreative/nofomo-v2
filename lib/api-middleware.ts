import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalAPIError,
  RateLimitError,
  formatErrorResponse,
  createError
} from './errors';

// Type for API handler function
type ApiHandler<T = any> = (request: NextRequest, context?: any) => Promise<NextResponse<T>> | NextResponse<T>;

// Middleware to handle errors in API routes
export function withApiErrorHandler(handler: ApiHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);

      // Handle different error types
      let appError: AppError;

      if (error instanceof ZodError) {
        appError = new ValidationError('Validation failed', error.errors);
      } else if (error instanceof AppError) {
        appError = error;
      } else {
        appError = createError(error);
      }

      // Log operational errors but not programming errors
      if (appError.isOperational) {
        console.warn(`Operational error [${appError.code}]:`, appError.message);
      } else {
        console.error(`Programming error [${appError.code}]:`, appError);
      }

      const errorResponse = formatErrorResponse(appError);

      return NextResponse.json(errorResponse, {
        status: appError.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  };
}

// Middleware for request logging
export function withRequestLogging(handler: ApiHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const { method, url } = request;

    console.log(`[${new Date().toISOString()}] ${method} ${url}`);

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${response.status} (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ${method} ${url} - ERROR (${duration}ms):`, error);
      throw error;
    }
  };
}

// Middleware for rate limiting preparation (basic implementation)
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Function to generate rate limit key
}

export function withRateLimit(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const key = options.keyGenerator
        ? options.keyGenerator(request)
        : request.ip || 'anonymous';

      const now = Date.now();
      const windowData = requests.get(key);

      if (!windowData || now > windowData.resetTime) {
        // Reset window
        requests.set(key, {
          count: 1,
          resetTime: now + options.windowMs,
        });
      } else {
        // Check limit
        if (windowData.count >= options.maxRequests) {
          const retryAfter = Math.ceil((windowData.resetTime - now) / 1000);
          throw new RateLimitError(`Too many requests. Try again in ${retryAfter} seconds.`, retryAfter);
        }
        windowData.count++;
      }

      return handler(request, context);
    };
  };
}

// Middleware for input validation
export function withValidation(schema: any, source: 'body' | 'query' | 'params' = 'body') {
  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      try {
        let dataToValidate: any;

        switch (source) {
          case 'body':
            dataToValidate = await request.json();
            // Reconstruct request with parsed body for handler
            (request as any).body = dataToValidate;
            break;
          case 'query':
            dataToValidate = Object.fromEntries(request.nextUrl.searchParams);
            break;
          case 'params':
            dataToValidate = context?.params || {};
            break;
        }

        const validatedData = schema.parse(dataToValidate);

        // Add validated data to request
        (request as any).validatedData = validatedData;

        return handler(request, context);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', error.errors);
        }
        throw error;
      }
    };
  };
}

// Combined middleware for common API patterns
export function withApiHandler(
  handler: ApiHandler,
  options: {
    validation?: { schema: any; source?: 'body' | 'query' | 'params' };
    rateLimit?: RateLimitOptions;
    requireAuth?: boolean;
    logging?: boolean;
  } = {}
) {
  let wrappedHandler = handler;

  // Add validation if specified
  if (options.validation) {
    wrappedHandler = withValidation(
      options.validation.schema,
      options.validation.source
    )(wrappedHandler);
  }

  // Add rate limiting if specified
  if (options.rateLimit) {
    wrappedHandler = withRateLimit(options.rateLimit)(wrappedHandler);
  }

  // Add logging if specified
  if (options.logging !== false) {
    wrappedHandler = withRequestLogging(wrappedHandler);
  }

  // Always add error handling
  wrappedHandler = withApiErrorHandler(wrappedHandler);

  return wrappedHandler;
}

// Middleware for response validation and formatting
export function withResponseValidation(schema: any) {
  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const response = await handler(request, context);

      try {
        // Parse response data
        const responseData = await response.json();

        // Validate response structure
        const validatedResponse = schema.parse(responseData);

        // Return validated response
        return NextResponse.json(validatedResponse, {
          status: response.status,
          headers: response.headers,
        });
      } catch (error) {
        console.error('Response validation error:', error);
        // If validation fails, return original response
        return response;
      }
    };
  };
}

// Utility function to create standardized API responses
export function createApiResponse<T>(
  data: T,
  options: {
    status?: number;
    message?: string;
    pagination?: any;
  } = {}
) {
  const { status = 200, message, pagination } = options;

  const response: any = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    response.message = message;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return NextResponse.json(response, { status });
}

// Input sanitization middleware
import { Sanitizer } from './sanitization';

export function withSanitization(sanitizer?: (data: any) => any) {
  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      try {
        // Sanitize request data
        if (request.body) {
          const originalJson = request.json.bind(request);
          request.json = async () => {
            const data = await originalJson();
            return sanitizer ? sanitizer(data) : Sanitizer.sanitizeApiInput(data);
          };
        }

        return handler(request, context);
      } catch (error) {
        console.error('Sanitization error:', error);
        throw error;
      }
    };
  };
}

// CORS middleware for additional security
export function withCORS(allowedOrigins: string[] = ['*']) {
  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const response = await handler(request, context);

      const origin = request.headers.get('origin');
      const allowedOrigin = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))
        ? origin || allowedOrigins[0]
        : allowedOrigins[0];

      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');

      return response;
    };
  };
}

// Request size limiting middleware
export function withRequestSizeLimit(maxSizeBytes: number = 1024 * 1024) { // 1MB default
  return function (handler: ApiHandler) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const contentLength = request.headers.get('content-length');

      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        return NextResponse.json(
          { success: false, error: 'Request too large' },
          { status: 413 }
        );
      }

      return handler(request, context);
    };
  };
}