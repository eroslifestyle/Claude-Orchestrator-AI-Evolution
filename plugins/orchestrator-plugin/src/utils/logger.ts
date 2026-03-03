/**
 * Plugin Logger
 *
 * Provides structured logging for the orchestrator plugin.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

export class PluginLogger {
  private component: string;
  private logLevel: LogLevel;

  constructor(component: string, logLevel: LogLevel = 'info') {
    this.component = component;
    this.logLevel = logLevel;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      data,
    };

    // Format and output log entry
    this.output(entry);
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const component = entry.component.padEnd(20);

    let logMessage = `[${timestamp}] ${levelStr} ${component} ${entry.message}`;

    if (entry.data) {
      logMessage += ` ${JSON.stringify(entry.data)}`;
    }

    // Use appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Create child logger with extended component name
   */
  child(childComponent: string): PluginLogger {
    return new PluginLogger(`${this.component}:${childComponent}`, this.logLevel);
  }
}