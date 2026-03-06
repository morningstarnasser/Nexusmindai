/**
 * Simple logger utility for NexusMind
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: unknown;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private history: LogEntry[] = [];
  private maxHistory: number = 1000;

  constructor(initialLevel?: LogLevel) {
    if (initialLevel !== undefined) {
      this.level = initialLevel;
    }

    // Set level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel === 'DEBUG') {
      this.level = LogLevel.DEBUG;
    } else if (envLevel === 'INFO') {
      this.level = LogLevel.INFO;
    } else if (envLevel === 'WARN') {
      this.level = LogLevel.WARN;
    } else if (envLevel === 'ERROR') {
      this.level = LogLevel.ERROR;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level >= this.level) {
      const levelName = LogLevel[level];
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${levelName}: ${message}`;

      // Output to console
      if (level === LogLevel.ERROR) {
        console.error(logMessage, data || '');
      } else if (level === LogLevel.WARN) {
        console.warn(logMessage, data || '');
      } else if (level === LogLevel.INFO) {
        console.log(logMessage, data || '');
      } else {
        // DEBUG
        if (process.env.DEBUG) {
          console.log(logMessage, data || '');
        }
      }

      // Add to history
      const entry: LogEntry = {
        timestamp: new Date(),
        level: levelName,
        message,
        data
      };

      this.history.push(entry);
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory);
      }
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Get log history
   */
  getHistory(count?: number): LogEntry[] {
    if (count) {
      return this.history.slice(-count);
    }
    return [...this.history];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.history.filter(entry =>
      LogLevel[level as unknown as string] === entry.level
    );
  }

  /**
   * Search logs
   */
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(entry =>
      entry.message.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(entry.data).toLowerCase().includes(lowerQuery)
    );
  }
}

// Export singleton instance
export const logger = new Logger();

export default logger;
