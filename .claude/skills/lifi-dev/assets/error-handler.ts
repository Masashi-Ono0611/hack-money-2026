/**
 * Error Handler Utility
 *
 * Comprehensive error handling for LI.FI integration
 */

export enum LiFiErrorCode {
  // API Errors
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  INVALID_PARAMS = 'INVALID_PARAMS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  API_ERROR = 'API_ERROR',

  // Transaction Errors
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',

  // Bridge Errors
  BRIDGE_FAILURE = 'BRIDGE_FAILURE',
  BRIDGE_TIMEOUT = 'BRIDGE_TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Other
  UNKNOWN = 'UNKNOWN',
}

export class LiFiError extends Error {
  code: LiFiErrorCode;
  originalError?: any;
  metadata?: Record<string, any>;

  constructor(
    code: LiFiErrorCode,
    message: string,
    originalError?: any,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'LiFiError';
    this.code = code;
    this.originalError = originalError;
    this.metadata = metadata;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}

/**
 * Parse and classify errors from LI.FI SDK/API
 */
export function parseLiFiError(error: any): LiFiError {
  // User rejected transaction
  if (
    error.code === 4001 ||
    error.code === 'ACTION_REJECTED' ||
    error.message?.includes('user rejected')
  ) {
    return new LiFiError(
      LiFiErrorCode.USER_REJECTED,
      'Transaction was cancelled by user',
      error
    );
  }

  // Insufficient funds
  if (
    error.code === 'INSUFFICIENT_FUNDS' ||
    error.message?.includes('insufficient funds') ||
    error.message?.includes('insufficient balance')
  ) {
    return new LiFiError(
      LiFiErrorCode.INSUFFICIENT_FUNDS,
      'Wallet has insufficient balance for this transaction',
      error
    );
  }

  // Rate limit
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return new LiFiError(
      LiFiErrorCode.RATE_LIMIT_EXCEEDED,
      'API rate limit exceeded. Please try again later.',
      error
    );
  }

  // Route not found
  if (
    error.message?.includes('no routes') ||
    error.message?.includes('route not found')
  ) {
    return new LiFiError(
      LiFiErrorCode.ROUTE_NOT_FOUND,
      'No routes found for this swap. Try adjusting slippage or amount.',
      error
    );
  }

  // Insufficient liquidity
  if (error.message?.includes('insufficient liquidity')) {
    return new LiFiError(
      LiFiErrorCode.INSUFFICIENT_LIQUIDITY,
      'Insufficient liquidity for this swap size',
      error
    );
  }

  // Gas estimation failed
  if (error.message?.includes('gas estimation') || error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return new LiFiError(
      LiFiErrorCode.GAS_ESTIMATION_FAILED,
      'Failed to estimate gas. Transaction may fail.',
      error
    );
  }

  // Slippage exceeded
  if (error.message?.includes('slippage') || error.message?.includes('price impact')) {
    return new LiFiError(
      LiFiErrorCode.SLIPPAGE_EXCEEDED,
      'Price moved beyond allowed slippage. Try increasing slippage tolerance.',
      error
    );
  }

  // Network errors
  if (
    error.code === 'NETWORK_ERROR' ||
    error.message?.includes('network') ||
    error.message?.includes('fetch failed')
  ) {
    return new LiFiError(
      LiFiErrorCode.NETWORK_ERROR,
      'Network error. Please check your connection.',
      error
    );
  }

  // Timeout
  if (error.message?.includes('timeout')) {
    return new LiFiError(
      LiFiErrorCode.TIMEOUT,
      'Request timed out. Please try again.',
      error
    );
  }

  // Bridge failure
  if (error.message?.includes('bridge')) {
    return new LiFiError(
      LiFiErrorCode.BRIDGE_FAILURE,
      'Bridge transaction failed. Funds may be stuck - contact support.',
      error,
      {
        warning: 'IMPORTANT: Do not retry. Contact support@li.fi with your transaction hash.',
      }
    );
  }

  // Generic transaction failure
  if (error.message?.includes('transaction failed') || error.code === 'CALL_EXCEPTION') {
    return new LiFiError(
      LiFiErrorCode.TRANSACTION_FAILED,
      'Transaction failed. Please try again or contact support.',
      error
    );
  }

  // Unknown error
  return new LiFiError(
    LiFiErrorCode.UNKNOWN,
    error.message || 'An unknown error occurred',
    error
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: LiFiError): string {
  const messages: Record<LiFiErrorCode, string> = {
    [LiFiErrorCode.USER_REJECTED]: 'Transaction cancelled',
    [LiFiErrorCode.INSUFFICIENT_FUNDS]:
      "You don't have enough tokens or ETH for gas fees",
    [LiFiErrorCode.ROUTE_NOT_FOUND]:
      'No swap route available. Try a different amount or token pair.',
    [LiFiErrorCode.INSUFFICIENT_LIQUIDITY]:
      'Not enough liquidity for this swap size. Try a smaller amount.',
    [LiFiErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment.',
    [LiFiErrorCode.SLIPPAGE_EXCEEDED]:
      'Price moved too much. Try increasing slippage in settings.',
    [LiFiErrorCode.GAS_ESTIMATION_FAILED]:
      'Unable to estimate gas. Transaction may fail.',
    [LiFiErrorCode.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
    [LiFiErrorCode.BRIDGE_FAILURE]:
      '⚠️ Bridge error. Do NOT retry. Contact support@li.fi',
    [LiFiErrorCode.BRIDGE_TIMEOUT]:
      'Bridge is taking longer than expected. Check status in a few minutes.',
    [LiFiErrorCode.NETWORK_ERROR]: 'Connection error. Check your internet and try again.',
    [LiFiErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
    [LiFiErrorCode.INVALID_PARAMS]: 'Invalid parameters. Please check your input.',
    [LiFiErrorCode.API_ERROR]: 'Service temporarily unavailable. Try again soon.',
    [LiFiErrorCode.UNKNOWN]: 'Something went wrong. Please try again.',
  };

  return messages[error.code] || error.message;
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: LiFiError): boolean {
  const retryableCodes = [
    LiFiErrorCode.NETWORK_ERROR,
    LiFiErrorCode.TIMEOUT,
    LiFiErrorCode.API_ERROR,
    LiFiErrorCode.RATE_LIMIT_EXCEEDED,
  ];

  return retryableCodes.includes(error.code);
}

/**
 * Determine if error requires user action
 */
export function requiresUserAction(error: LiFiError): boolean {
  const userActionCodes = [
    LiFiErrorCode.INSUFFICIENT_FUNDS,
    LiFiErrorCode.SLIPPAGE_EXCEEDED,
    LiFiErrorCode.ROUTE_NOT_FOUND,
    LiFiErrorCode.INSUFFICIENT_LIQUIDITY,
  ];

  return userActionCodes.includes(error.code);
}

/**
 * Error handler with retry logic
 */
export class ErrorHandler {
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelayMs: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelayMs;
  }

  /**
   * Execute function with automatic retry on retryable errors
   */
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: LiFiError | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const lifiError = error instanceof LiFiError ? error : parseLiFiError(error);
        lastError = lifiError;

        // Don't retry if error is not retryable
        if (!isRetryableError(lifiError)) {
          throw lifiError;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries - 1) {
          throw lifiError;
        }

        // Exponential backoff
        const backoffTime = this.retryDelay * Math.pow(2, attempt);
        console.log(
          `Attempt ${attempt + 1} failed: ${lifiError.message}. Retrying in ${backoffTime}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    throw lastError;
  }

  /**
   * Handle error and execute appropriate action
   */
  async handle(
    error: any,
    options?: {
      onRetryable?: (error: LiFiError) => void;
      onUserAction?: (error: LiFiError) => void;
      onFatal?: (error: LiFiError) => void;
    }
  ): Promise<void> {
    const lifiError = error instanceof LiFiError ? error : parseLiFiError(error);

    // Log error
    console.error('LiFi Error:', {
      code: lifiError.code,
      message: lifiError.message,
      metadata: lifiError.metadata,
    });

    // Execute appropriate callback
    if (isRetryableError(lifiError)) {
      options?.onRetryable?.(lifiError);
    } else if (requiresUserAction(lifiError)) {
      options?.onUserAction?.(lifiError);
    } else {
      options?.onFatal?.(lifiError);
    }
  }
}

/**
 * Analytics error tracker
 */
export class ErrorTracker {
  private errors: Array<{
    timestamp: Date;
    error: LiFiError;
    context?: any;
  }> = [];

  track(error: LiFiError, context?: any): void {
    this.errors.push({
      timestamp: new Date(),
      error,
      context,
    });

    // Send to analytics (example)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        error_code: error.code,
        fatal: !isRetryableError(error),
      });
    }
  }

  getRecentErrors(count: number = 10): Array<{
    timestamp: Date;
    error: LiFiError;
    context?: any;
  }> {
    return this.errors.slice(-count);
  }

  getErrorStats(): Record<LiFiErrorCode, number> {
    const stats: Partial<Record<LiFiErrorCode, number>> = {};

    this.errors.forEach(({ error }) => {
      stats[error.code] = (stats[error.code] || 0) + 1;
    });

    return stats as Record<LiFiErrorCode, number>;
  }

  clear(): void {
    this.errors = [];
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  LiFiError,
  LiFiErrorCode,
  parseLiFiError,
  getUserFriendlyMessage,
  isRetryableError,
  requiresUserAction,
  ErrorHandler,
  ErrorTracker,
};
