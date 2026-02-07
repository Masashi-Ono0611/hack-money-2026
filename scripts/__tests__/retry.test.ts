import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../lib/retry.js';
import type { RetryOptions } from '../arbitrage/types.js';

const FAST_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 10,
  maxDelayMs: 100,
  backoffMultiplier: 2,
};

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, FAST_OPTIONS);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, FAST_OPTIONS);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws last error after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, FAST_OPTIONS)).rejects.toThrow('always fails');
    // maxRetries=3 means 4 total attempts (0, 1, 2, 3)
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('respects maxRetries count', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const opts: RetryOptions = { ...FAST_OPTIONS, maxRetries: 1 };

    await expect(withRetry(fn, opts)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it('logs retry attempts when logger is provided', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
    };

    await withRetry(fn, FAST_OPTIONS, logger, 'TestRetry');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toBe('TestRetry');
  });

  it('applies exponential backoff delays', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');

    const start = Date.now();
    await withRetry(fn, { ...FAST_OPTIONS, baseDelayMs: 50, maxDelayMs: 500 });
    const elapsed = Date.now() - start;

    // First retry: 50ms, second retry: 100ms → total ~150ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it('caps delay at maxDelayMs', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockRejectedValueOnce(new Error('fail3'))
      .mockResolvedValue('ok');

    const start = Date.now();
    await withRetry(fn, { maxRetries: 3, baseDelayMs: 50, maxDelayMs: 60, backoffMultiplier: 10 });
    const elapsed = Date.now() - start;

    // All delays should be capped at 60ms → 3 * 60 = 180ms max
    expect(elapsed).toBeLessThan(300);
  });
});
