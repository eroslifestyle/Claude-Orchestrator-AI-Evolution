"use strict";
/**
 * Plugin Logger
 *
 * Provides structured logging for the orchestrator plugin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginLogger = void 0;
class PluginLogger {
    component;
    logLevel;
    constructor(component, logLevel = 'info') {
        this.component = component;
        this.logLevel = logLevel;
    }
    /**
     * Log debug message
     */
    debug(message, data) {
        this.log('debug', message, data);
    }
    /**
     * Log info message
     */
    info(message, data) {
        this.log('info', message, data);
    }
    /**
     * Log warning message
     */
    warn(message, data) {
        this.log('warn', message, data);
    }
    /**
     * Log error message
     */
    error(message, data) {
        this.log('error', message, data);
    }
    /**
     * Internal log method
     */
    log(level, message, data) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
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
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }
    /**
     * Output log entry to console
     */
    output(entry) {
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
    setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * Create child logger with extended component name
     */
    child(childComponent) {
        return new PluginLogger(`${this.component}:${childComponent}`, this.logLevel);
    }
}
exports.PluginLogger = PluginLogger;
//# sourceMappingURL=logger.js.map