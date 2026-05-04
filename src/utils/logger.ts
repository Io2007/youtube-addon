/**
 * Logger utility for Cloudflare Workers
 * 
 * Provides structured logging with:
 * - Request/response logging
 * - Error tracking with stack traces
 * - Performance metrics
 * - Log levels (debug, info, warn, error)
 * - Context-aware logging (request ID, path, method, duration)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  path?: string;
  method?: string;
  status?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private serializeError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context,
      ...(error && { error: this.serializeError(error) }),
    };

    // Structured JSON logging for better observability
    const logOutput = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        console.debug(logOutput);
        break;
      case 'warn':
        console.warn(logOutput);
        break;
      case 'error':
        console.error(logOutput);
        break;
      default:
        console.info(logOutput);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    this.log('error', message, context, error);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  private parent: Logger;
  private context: LogContext;

  constructor(parent: Logger, context: LogContext) {
    this.parent = parent;
    this.context = context;
  }

  private mergeContext(additional?: LogContext): LogContext {
    return { ...this.context, ...additional };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, context?: LogContext, error?: unknown): void {
    this.parent.error(message, this.mergeContext(context), error);
  }
}

// Default logger instance
export const logger = new Logger();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomPart}`;
}

/**
 * Middleware-style request logger for Hono
 * Logs request start, end, duration, and any errors
 */
export function createRequestLogger() {
  return async (request: Request, requestId: string): Promise<() => void> => {
    const startTime = performance.now();
    const url = new URL(request.url);
    
    const log = logger.child({
      requestId,
      path: url.pathname,
      method: request.method,
      query: Object.fromEntries(url.searchParams),
    });

    log.info('Request started');

    return (status?: number, error?: unknown) => {
      const duration = performance.now() - startTime;
      
      if (error) {
        log.error('Request failed', { status: status || 500, duration }, error);
      } else {
        const logLevel = status && status >= 500 ? 'error' : status && status >= 400 ? 'warn' : 'info';
        log[logLevel]('Request completed', { status: status || 200, duration });
      }
    };
  };
}

export default logger;
