/**
 * Rate Limiter Utility
 *
 * Production-ready rate limiting implementation for LI.FI API calls
 */

export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;
  private queue: Array<() => void> = [];
  private isProcessing = false;

  /**
   * Create a rate limiter
   *
   * @param maxRequests - Maximum number of requests allowed
   * @param windowSeconds - Time window in seconds
   *
   * @example
   * // Allow 10 requests per minute
   * const limiter = new RateLimiter(10, 60);
   */
  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  /**
   * Throttle a request
   *
   * @returns Promise that resolves when request can proceed
   *
   * @example
   * await rateLimiter.throttle();
   * const result = await fetch('https://li.quest/v1/...');
   */
  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Remove old requests outside the window
      this.requests = this.requests.filter((time) => now - time < this.windowMs);

      if (this.requests.length < this.maxRequests) {
        // Allow request
        this.requests.push(now);
        const resolve = this.queue.shift();
        resolve?.();
      } else {
        // Wait until oldest request expires
        const oldestRequest = this.requests[0];
        const waitTime = this.windowMs - (now - oldestRequest);

        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get current rate limit status
   *
   * @returns Number of requests remaining and reset time
   */
  getStatus(): { remaining: number; resetIn: number } {
    const now = Date.now();

    // Clean up old requests
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    const remaining = Math.max(0, this.maxRequests - this.requests.length);
    const resetIn = this.requests.length > 0 ? this.windowMs - (now - this.requests[0]) : 0;

    return { remaining, resetIn };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
    this.queue = [];
  }
}

/**
 * Token Bucket Rate Limiter
 *
 * More flexible rate limiting with burst capacity
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  /**
   * Create a token bucket rate limiter
   *
   * @param maxTokens - Maximum number of tokens (burst capacity)
   * @param refillRate - Tokens refilled per second
   *
   * @example
   * // Allow bursts of 20 requests, refill at 2 requests/second
   * const limiter = new TokenBucketRateLimiter(20, 2);
   */
  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume tokens
   *
   * @param tokensNeeded - Number of tokens to consume
   * @returns Promise that resolves when tokens are available
   */
  async consume(tokensNeeded: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= tokensNeeded) {
        this.tokens -= tokensNeeded;
        return;
      }

      // Wait for tokens to refill
      const tokensShort = tokensNeeded - this.tokens;
      const waitTime = (tokensShort / this.refillRate) * 1000;

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStatus(): { tokens: number; maxTokens: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Adaptive Rate Limiter
 *
 * Automatically adjusts rate based on API responses
 */
export class AdaptiveRateLimiter {
  private limiter: RateLimiter;
  private maxRequests: number;
  private minRequests: number;
  private windowSeconds: number;
  private consecutiveErrors = 0;
  private consecutiveSuccesses = 0;

  /**
   * Create an adaptive rate limiter
   *
   * @param initialRequests - Starting max requests
   * @param windowSeconds - Time window in seconds
   * @param minRequests - Minimum requests (safety floor)
   * @param maxRequests - Maximum requests (ceiling)
   */
  constructor(
    initialRequests: number,
    windowSeconds: number,
    minRequests: number = 1,
    maxRequests: number = 100
  ) {
    this.limiter = new RateLimiter(initialRequests, windowSeconds);
    this.maxRequests = maxRequests;
    this.minRequests = minRequests;
    this.windowSeconds = windowSeconds;
  }

  async throttle(): Promise<void> {
    await this.limiter.throttle();
  }

  /**
   * Report request result to adjust rate
   *
   * @param success - Whether the request succeeded
   * @param is429 - Whether it was a 429 (rate limit) error
   */
  reportResult(success: boolean, is429: boolean = false): void {
    if (!success) {
      this.consecutiveSuccesses = 0;
      this.consecutiveErrors++;

      if (is429 || this.consecutiveErrors >= 3) {
        // Decrease rate by 50%
        const currentMax = this.limiter['maxRequests'];
        const newMax = Math.max(this.minRequests, Math.floor(currentMax * 0.5));

        console.warn(`Rate limit hit. Reducing to ${newMax} requests per ${this.windowSeconds}s`);

        this.limiter = new RateLimiter(newMax, this.windowSeconds);
        this.consecutiveErrors = 0;
      }
    } else {
      this.consecutiveErrors = 0;
      this.consecutiveSuccesses++;

      // After 10 successful requests, try increasing rate
      if (this.consecutiveSuccesses >= 10) {
        const currentMax = this.limiter['maxRequests'];
        const newMax = Math.min(this.maxRequests, Math.floor(currentMax * 1.2));

        if (newMax > currentMax) {
          console.log(`Increasing rate to ${newMax} requests per ${this.windowSeconds}s`);
          this.limiter = new RateLimiter(newMax, this.windowSeconds);
        }

        this.consecutiveSuccesses = 0;
      }
    }
  }

  getCurrentLimit(): number {
    return this.limiter['maxRequests'];
  }
}

/**
 * Example usage with LI.FI API
 */
export class RateLimitedLiFiClient {
  private rateLimiter: RateLimiter;
  private apiKey?: string;

  constructor(apiKey?: string) {
    // Without API key: 10 requests/minute
    // With API key: 100 requests/minute
    const maxRequests = apiKey ? 100 : 10;
    this.rateLimiter = new RateLimiter(maxRequests, 60);
    this.apiKey = apiKey;
  }

  async getQuote(params: any): Promise<any> {
    // Wait for rate limit
    await this.rateLimiter.throttle();

    const url = new URL('https://li.quest/v1/quote');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['x-lifi-api-key'] = this.apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  }

  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }
}

// ============================================================================
// Export
// ============================================================================

export default RateLimiter;
