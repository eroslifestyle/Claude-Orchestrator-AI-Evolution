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
export declare class PluginLogger {
    private component;
    private logLevel;
    constructor(component: string, logLevel?: LogLevel);
    /**
     * Log debug message
     */
    debug(message: string, data?: any): void;
    /**
     * Log info message
     */
    info(message: string, data?: any): void;
    /**
     * Log warning message
     */
    warn(message: string, data?: any): void;
    /**
     * Log error message
     */
    error(message: string, data?: any): void;
    /**
     * Internal log method
     */
    private log;
    /**
     * Check if we should log at this level
     */
    private shouldLog;
    /**
     * Output log entry to console
     */
    private output;
    /**
     * Set log level
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Create child logger with extended component name
     */
    child(childComponent: string): PluginLogger;
}
//# sourceMappingURL=logger.d.ts.map