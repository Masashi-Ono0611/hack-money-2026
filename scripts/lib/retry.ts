import type { ILogger, RetryOptions } from '../arbitrage/types.js';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  logger?: ILogger,
  component = 'Retry',
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === options.maxRetries;

      if (isLastAttempt) {
        logger?.error(component, `All ${options.maxRetries + 1} attempts failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
        break;
      }

      const delay = Math.min(
        options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelayMs,
      );

      logger?.warn(component, `Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: err instanceof Error ? err.message : String(err),
        attempt: attempt + 1,
        nextDelayMs: delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
