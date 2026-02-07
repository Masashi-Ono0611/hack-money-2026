import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../lib/logger.js';

describe('Logger', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('outputs JSON format with required fields', () => {
    const logger = new Logger('DEBUG');
    logger.info('TestComponent', 'hello world');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output).toHaveProperty('timestamp');
    expect(output.level).toBe('INFO');
    expect(output.component).toBe('TestComponent');
    expect(output.message).toBe('hello world');
  });

  it('includes context when provided', () => {
    const logger = new Logger('DEBUG');
    logger.info('Test', 'msg', { key: 'value' });

    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output.context).toEqual({ key: 'value' });
  });

  it('does not include context key when not provided', () => {
    const logger = new Logger('DEBUG');
    logger.info('Test', 'msg');

    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output).not.toHaveProperty('context');
  });

  it('filters by log level', () => {
    const logger = new Logger('WARN');
    logger.debug('Test', 'debug msg');
    logger.info('Test', 'info msg');
    logger.warn('Test', 'warn msg');
    logger.error('Test', 'error msg');

    // DEBUG and INFO should be filtered, WARN and ERROR should pass
    // WARN → 1 stdout, ERROR → 1 stdout + 1 stderr
    expect(stdoutSpy).toHaveBeenCalledTimes(2);
  });

  it('outputs ERROR to both stdout and stderr', () => {
    const logger = new Logger('DEBUG');
    logger.error('Test', 'error msg');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).toHaveBeenCalledTimes(1);

    const stdoutOutput = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    const stderrOutput = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(stdoutOutput.level).toBe('ERROR');
    expect(stderrOutput.level).toBe('ERROR');
  });

  it('uses ISO 8601 timestamp format', () => {
    const logger = new Logger('DEBUG');
    logger.info('Test', 'msg');

    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    // ISO 8601 format check
    expect(() => new Date(output.timestamp)).not.toThrow();
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('setLevel changes the log level dynamically', () => {
    const logger = new Logger('ERROR');
    logger.info('Test', 'should not appear');
    expect(stdoutSpy).toHaveBeenCalledTimes(0);

    logger.setLevel('INFO');
    logger.info('Test', 'should appear');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });
});
