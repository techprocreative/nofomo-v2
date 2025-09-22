import { ZodIssue } from 'zod';

// Error message mappings for user-friendly display
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'Please log in to continue.',
  AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',

  // Validation
  VALIDATION_ERROR: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PASSWORD: 'Password must be at least 8 characters long.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',

  // Trading specific
  INVALID_SYMBOL: 'Please enter a valid trading symbol (e.g., EURUSD).',
  INVALID_QUANTITY: 'Quantity must be between 0.01 and 10,000.',
  INVALID_PRICE: 'Please enter a valid price.',
  INVALID_STRATEGY_NAME: 'Strategy name must be 3-100 characters and contain only letters, numbers, spaces, hyphens, and underscores.',
  INVALID_BOT_NAME: 'Bot name must be 3-50 characters and contain only letters, numbers, spaces, hyphens, and underscores.',
  INVALID_ACCOUNT_ID: 'MT5 account ID must be 6-12 digits.',

  // Database & API
  DATABASE_ERROR: 'A database error occurred. Please try again.',
  EXTERNAL_API_ERROR: 'External service temporarily unavailable. Please try again later.',
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',

  // Rate limiting
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment before trying again.',

  // Resource errors
  NOT_FOUND_ERROR: 'The requested item was not found.',
  ALREADY_EXISTS: 'This item already exists.',
  CONFLICT_ERROR: 'This action conflicts with existing data.',

  // Trading errors
  TRADING_ERROR: 'Trading operation failed. Please check your settings.',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this trade.',
  MARKET_CLOSED: 'Market is currently closed.',
  INVALID_ORDER: 'Order parameters are invalid.',

  // Bot errors
  BOT_ERROR: 'Bot operation failed.',
  BOT_NOT_ACTIVE: 'Bot is not currently active.',
  BOT_CONNECTION_FAILED: 'Failed to connect to trading server.',

  // Strategy errors
  STRATEGY_ERROR: 'Strategy operation failed.',
  INVALID_STRATEGY_DATA: 'Strategy configuration is invalid.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  MAINTENANCE: 'System is under maintenance. Please try again later.',
} as const;

// Function to get user-friendly error message
export function getUserFriendlyMessage(errorCode: string, fallback?: string): string {
  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || fallback || ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Function to format Zod validation errors
export function formatValidationErrors(zodErrors: ZodIssue[]): string[] {
  return zodErrors.map(error => {
    const field = error.path.join('.');
    let message = error.message;

    // Customize messages based on field and error type
    switch (error.code) {
      case 'invalid_type':
        if (error.received === 'undefined') {
          message = `${field} is required.`;
        } else {
          message = `${field} must be a ${error.expected}.`;
        }
        break;
      case 'too_small':
        if (error.type === 'string') {
          message = `${field} must be at least ${error.minimum} characters.`;
        } else if (error.type === 'number') {
          message = `${field} must be at least ${error.minimum}.`;
        }
        break;
      case 'too_big':
        if (error.type === 'string') {
          message = `${field} must be at most ${error.maximum} characters.`;
        } else if (error.type === 'number') {
          message = `${field} must be at most ${error.maximum}.`;
        }
        break;
      case 'invalid_string':
        if (error.validation === 'email') {
          message = `${field} must be a valid email address.`;
        } else if (error.validation === 'regex') {
          message = `${field} contains invalid characters.`;
        }
        break;
      case 'invalid_enum_value':
        message = `${field} must be one of: ${error.options?.join(', ')}.`;
        break;
      default:
        message = `${field}: ${error.message}`;
    }

    return message;
  });
}

// Function to create field-specific error messages
export function getFieldErrorMessage(field: string, error: ZodIssue): string {
  const baseMessage = formatValidationErrors([error])[0];
  return baseMessage;
}

// Error categories for UI styling
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SERVER = 'server',
  BUSINESS_LOGIC = 'business_logic',
}

export function getErrorCategory(errorCode: string): ErrorCategory {
  const authErrors = ['AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR', 'SESSION_EXPIRED'];
  const validationErrors = ['VALIDATION_ERROR'];
  const networkErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'EXTERNAL_API_ERROR'];
  const serverErrors = ['DATABASE_ERROR', 'UNKNOWN_ERROR'];

  if (authErrors.includes(errorCode)) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (validationErrors.includes(errorCode)) {
    return ErrorCategory.VALIDATION;
  }
  if (networkErrors.includes(errorCode)) {
    return ErrorCategory.NETWORK;
  }
  if (serverErrors.includes(errorCode)) {
    return ErrorCategory.SERVER;
  }

  return ErrorCategory.BUSINESS_LOGIC;
}

// Function to determine if error should trigger retry
export function isRetryableError(errorCode: string): boolean {
  const retryableErrors = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'EXTERNAL_API_ERROR',
    'DATABASE_ERROR',
  ];

  return retryableErrors.includes(errorCode);
}

// Success messages
export const SUCCESS_MESSAGES = {
  STRATEGY_CREATED: 'Strategy created successfully.',
  STRATEGY_UPDATED: 'Strategy updated successfully.',
  STRATEGY_DELETED: 'Strategy deleted successfully.',
  TRADE_EXECUTED: 'Trade executed successfully.',
  BOT_STARTED: 'Bot started successfully.',
  BOT_STOPPED: 'Bot stopped successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
} as const;

export function getSuccessMessage(action: string): string {
  return SUCCESS_MESSAGES[action as keyof typeof SUCCESS_MESSAGES] || 'Operation completed successfully.';
}