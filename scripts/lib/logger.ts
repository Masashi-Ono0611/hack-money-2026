import type { ILogger, LogEntry, LogLevel } from '../arbitrage/types.js';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class Logger implements ILogger {
  private level: LogLevel;

  constructor(level: LogLevel = 'INFO') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(component: string, message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', component, message, context);
  }

  info(component: string, message: string, context?: Record<string, unknown>): void {
    this.log('INFO', component, message, context);
  }

  warn(component: string, message: string, context?: Record<string, unknown>): void {
    this.log('WARN', component, message, context);
  }

  error(component: string, message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', component, message, context);
  }

  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      ...(context !== undefined ? { context } : {}),
    };

    const json = JSON.stringify(entry);

    if (level === 'ERROR') {
      process.stderr.write(json + '\n');
    }
    process.stdout.write(json + '\n');
  }
}
