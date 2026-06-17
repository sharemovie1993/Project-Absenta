type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  invoiceId?: string;
  activity?: string; // e.g., 'create', 'update', 'delete', 'view', 'fetch_invoice_by_id'
  userAction?: string; // free-form description of user interaction
  sourceComponent?: string; // React component/page name
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  source?: string;
  context?: LogContext;
}

class LogServiceClass {
  private static instance: LogServiceClass;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private isProduction: boolean = ((globalThis as any).process?.env?.NODE_ENV ?? '').toLowerCase() === 'production';
  private sensitiveKeys = [
    // payment and secrets
    'payment_method', 'payment_reference', 'card_number', 'cvv', 'bank_account',
    'server_key', 'client_key', 'secret_key', 'publishable_key', 'callback_token',
    'Authorization', 'access_token', 'refresh_token', 'token'
  ];

  private constructor() {
    // Private constructor untuk Singleton pattern
  }

  public static getInstance(): LogServiceClass {
    if (!LogServiceClass.instance) {
      LogServiceClass.instance = new LogServiceClass();
    }
    return LogServiceClass.instance;
  }

  private sanitizeData(input: unknown): unknown {
    if (input == null) return input;
    // Primitive types
    if (typeof input !== 'object') return input;

    // Arrays
    if (Array.isArray(input)) return (input as unknown[]).map((item) => this.sanitizeData(item));

    const source = input as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some((k) => lowerKey.includes(k.toLowerCase()));
      if (isSensitive) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = this.sanitizeData(value);
      }
    }
    return output;
  }

  private createLogEntry(level: LogLevel, message: string, data?: unknown, source?: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data),
      source,
      context
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log if we exceed maxLogs
    }

    // In development, also log to console
    if (!this.isProduction) {
      const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
      console[consoleMethod](
        `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.source ? `[${entry.source}] ` : ''}${entry.message}`,
        entry.context ? `context=${JSON.stringify(entry.context)}` : '',
        entry.data || ''
      );
    }

    // In production, you might want to send logs to a logging service
    if (this.isProduction) {
      this.sendToLoggingService(entry);
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    // Implement your production logging service here
    // Example: Send to Sentry, LogRocket, etc.
    // This is just a placeholder
    if (entry.level === 'error') {
      // Example: Sentry.captureException(entry.data);
    }
  }

  public debug(message: string, data?: unknown, source?: string, context?: LogContext): void {
    if (!this.isProduction) {
      this.addLog(this.createLogEntry('debug', message, data, source, context));
    }
  }

  public info(message: string, data?: unknown, source?: string, context?: LogContext): void {
    this.addLog(this.createLogEntry('info', message, data, source, context));
  }

  public warn(message: string, data?: unknown, source?: string, context?: LogContext): void {
    this.addLog(this.createLogEntry('warn', message, data, source, context));
  }

  public error(message: string, error?: Error | unknown, source?: string, context?: LogContext): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    this.addLog(this.createLogEntry('error', message, errorData, source, context));
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  public filterLogs(criteria: {
    level?: LogLevel;
    source?: string;
    invoiceId?: string;
    activity?: string;
    from?: string; // ISO timestamp
    to?: string;   // ISO timestamp
  }): LogEntry[] {
    return this.logs.filter((log) => {
      const ts = new Date(log.timestamp).getTime();
      const fromOk = criteria.from ? ts >= new Date(criteria.from).getTime() : true;
      const toOk = criteria.to ? ts <= new Date(criteria.to).getTime() : true;
      const levelOk = criteria.level ? log.level === criteria.level : true;
      const sourceOk = criteria.source ? log.source === criteria.source : true;
      const invoiceOk = criteria.invoiceId ? log.context?.invoiceId === criteria.invoiceId : true;
      const activityOk = criteria.activity ? log.context?.activity === criteria.activity : true;
      return fromOk && toOk && levelOk && sourceOk && invoiceOk && activityOk;
    });
  }

  public exportLogs(criteria?: Parameters<LogServiceClass['filterLogs']>[0]): string {
    const logs = criteria ? this.filterLogs(criteria) : this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Export singleton instance
export const LogService = LogServiceClass.getInstance();

// Export types for use in other files
export type { LogLevel, LogEntry, LogContext };
