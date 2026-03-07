"use strict";
/**
 * ERROR RECOVERY MANAGER - Gestione Errori ed Escalation Automatica
 *
 * REGOLE IMPLEMENTATE:
 * 1. RETRY AUTOMATICO: Riprova task falliti con backoff esponenziale
 * 2. FALLBACK AGENT: Passa ad agent alternativo se il primario fallisce
 * 3. ESCALATION AUTOMATICA: Scala a model superiore per task critici
 * 4. CIRCUIT BREAKER: Ferma esecuzione se troppi errori consecutivi
 * 5. RECOVERY STRATEGY: Strategie multiple per recupero
 *
 * @version 1.0
 * @date 2026-02-03
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalRecoveryManager = exports.createErrorRecoveryManager = exports.ErrorRecoveryManager = void 0;
const events_1 = require("events");
// =============================================================================
// ERROR RECOVERY MANAGER
// =============================================================================
class ErrorRecoveryManager extends events_1.EventEmitter {
    config;
    errorHistory = new Map(); // taskId -> errors
    circuitBreakers = new Map();
    escalationRules = [];
    stats;
    recoveryTimes = [];
    constructor(config = {}) {
        super();
        this.config = {
            maxRetries: 3,
            retryDelayMs: 1000,
            retryBackoffMultiplier: 2,
            maxRetryDelayMs: 30000,
            circuitBreakerThreshold: 5,
            circuitBreakerResetMs: 60000,
            enableAutoEscalation: true,
            escalationThreshold: 2,
            fallbackAgentMap: {
                'gui-expert': 'general-coder',
                'database-expert': 'general-coder',
                'security-expert': 'general-coder',
                'api-expert': 'integration-expert',
            },
            criticalTaskPatterns: ['security', 'auth', 'payment', 'critical'],
            ...config
        };
        this.stats = {
            totalErrors: 0,
            recoveredErrors: 0,
            unrecoverableErrors: 0,
            retries: 0,
            escalations: 0,
            fallbacks: 0,
            circuitBreakerTrips: 0,
            avgRecoveryTimeMs: 0,
            errorsByType: {},
            errorsBySeverity: {
                'LOW': 0,
                'MEDIUM': 0,
                'HIGH': 0,
                'CRITICAL': 0
            }
        };
        this.initializeDefaultEscalationRules();
    }
    // ===========================================================================
    // INITIALIZATION
    // ===========================================================================
    /**
     * Inizializza regole di escalation di default
     */
    initializeDefaultEscalationRules() {
        // Rule 1: Critical errors -> Escalate to Opus
        this.escalationRules.push({
            condition: (error) => error.severity === 'CRITICAL',
            action: 'ESCALATE_MODEL',
            targetModel: 'opus',
            maxRetries: 1
        });
        // Rule 2: Security errors -> Use security specialist or escalate
        this.escalationRules.push({
            condition: (error) => error.error.message.toLowerCase().includes('security'),
            action: 'ESCALATE_MODEL',
            targetModel: 'opus'
        });
        // Rule 3: Timeout errors -> Retry with longer timeout
        this.escalationRules.push({
            condition: (error) => error.error.message.toLowerCase().includes('timeout'),
            action: 'RETRY',
            maxRetries: 2
        });
        // Rule 4: Agent not found -> Use fallback
        this.escalationRules.push({
            condition: (error) => error.error.message.toLowerCase().includes('agent not found'),
            action: 'FALLBACK_AGENT'
        });
        // Rule 5: Multiple failures -> Escalate
        this.escalationRules.push({
            condition: (error) => error.attemptNumber >= this.config.escalationThreshold,
            action: 'ESCALATE_MODEL',
            targetModel: 'sonnet'
        });
    }
    /**
     * Aggiunge regola di escalation custom
     */
    addEscalationRule(rule) {
        this.escalationRules.push(rule);
    }
    // ===========================================================================
    // ERROR HANDLING
    // ===========================================================================
    /**
     * Registra un errore e determina l'azione di recovery
     */
    async handleError(taskId, agentId, error, currentModel, taskDescription, attemptNumber = 1) {
        const startTime = Date.now();
        // Classify error
        const severity = this.classifyErrorSeverity(error, taskDescription);
        const recoverable = this.isRecoverable(error, attemptNumber);
        const taskError = {
            taskId,
            agentId,
            error,
            timestamp: Date.now(),
            attemptNumber,
            severity,
            recoverable
        };
        // Track error
        this.trackError(taskId, taskError);
        this.stats.totalErrors++;
        this.stats.errorsBySeverity[severity]++;
        // Log error
        console.log(`[ERROR RECOVERY] Task ${taskId} failed (attempt ${attemptNumber})`);
        console.log(`  Severity: ${severity}`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Recoverable: ${recoverable}`);
        this.emit('errorOccurred', taskError);
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(agentId)) {
            console.log(`[CIRCUIT BREAKER] Agent ${agentId} circuit is OPEN`);
            return {
                taskId,
                action: 'ABORT',
                success: false,
                message: `Circuit breaker open for agent ${agentId}`
            };
        }
        // Determine recovery action
        const action = await this.determineRecoveryAction(taskError, currentModel);
        const result = await this.executeRecoveryAction(taskError, action, currentModel);
        // Update stats
        const recoveryTime = Date.now() - startTime;
        this.recoveryTimes.push(recoveryTime);
        this.stats.avgRecoveryTimeMs =
            this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length;
        if (result.success) {
            this.stats.recoveredErrors++;
        }
        else {
            this.stats.unrecoverableErrors++;
            this.updateCircuitBreaker(agentId, false);
        }
        this.emit('recoveryAttempted', result);
        return result;
    }
    /**
     * Classifica la severità dell'errore
     */
    classifyErrorSeverity(error, taskDescription) {
        const message = error.message.toLowerCase();
        const desc = taskDescription.toLowerCase();
        // Check for critical patterns
        for (const pattern of this.config.criticalTaskPatterns) {
            if (desc.includes(pattern))
                return 'CRITICAL';
        }
        // Check error type
        if (message.includes('security') || message.includes('auth'))
            return 'CRITICAL';
        if (message.includes('data loss') || message.includes('corruption'))
            return 'CRITICAL';
        if (message.includes('timeout') || message.includes('connection'))
            return 'HIGH';
        if (message.includes('rate limit') || message.includes('quota'))
            return 'HIGH';
        if (message.includes('not found') || message.includes('invalid'))
            return 'MEDIUM';
        return 'LOW';
    }
    /**
     * Verifica se l'errore è recuperabile
     */
    isRecoverable(error, attemptNumber) {
        // Non-recoverable errors
        const nonRecoverable = [
            'permission denied',
            'access denied',
            'invalid credentials',
            'configuration error',
            'fatal'
        ];
        const message = error.message.toLowerCase();
        for (const pattern of nonRecoverable) {
            if (message.includes(pattern))
                return false;
        }
        // Too many attempts
        if (attemptNumber > this.config.maxRetries)
            return false;
        return true;
    }
    // ===========================================================================
    // RECOVERY ACTIONS
    // ===========================================================================
    /**
     * Determina l'azione di recovery appropriata
     */
    async determineRecoveryAction(error, currentModel) {
        // Check escalation rules in order
        for (const rule of this.escalationRules) {
            if (rule.condition(error)) {
                // Check if action is possible
                if (rule.action === 'ESCALATE_MODEL' && currentModel === 'opus') {
                    continue; // Already at highest model
                }
                return rule.action;
            }
        }
        // Default actions based on attempt number
        if (error.attemptNumber < this.config.maxRetries) {
            return 'RETRY';
        }
        if (error.attemptNumber === this.config.maxRetries && this.config.enableAutoEscalation) {
            return 'ESCALATE_MODEL';
        }
        if (!error.recoverable) {
            return 'SKIP';
        }
        return 'MANUAL_INTERVENTION';
    }
    /**
     * Esegue l'azione di recovery
     */
    async executeRecoveryAction(error, action, currentModel) {
        console.log(`[RECOVERY] Executing action: ${action}`);
        switch (action) {
            case 'RETRY':
                return this.executeRetry(error);
            case 'FALLBACK_AGENT':
                return this.executeFallbackAgent(error);
            case 'ESCALATE_MODEL':
                return this.executeEscalation(error, currentModel);
            case 'SKIP':
                return {
                    taskId: error.taskId,
                    action: 'SKIP',
                    success: true,
                    message: `Task ${error.taskId} skipped after ${error.attemptNumber} failures`
                };
            case 'ABORT':
                return {
                    taskId: error.taskId,
                    action: 'ABORT',
                    success: false,
                    message: `Task ${error.taskId} aborted - unrecoverable error`
                };
            case 'MANUAL_INTERVENTION':
                this.emit('manualInterventionRequired', error);
                return {
                    taskId: error.taskId,
                    action: 'MANUAL_INTERVENTION',
                    success: false,
                    message: 'Manual intervention required'
                };
            default:
                return {
                    taskId: error.taskId,
                    action: 'SKIP',
                    success: false,
                    message: 'Unknown recovery action'
                };
        }
    }
    /**
     * Esegue retry con backoff esponenziale
     */
    async executeRetry(error) {
        const delay = Math.min(this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, error.attemptNumber - 1), this.config.maxRetryDelayMs);
        console.log(`[RETRY] Waiting ${delay}ms before retry (attempt ${error.attemptNumber + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.stats.retries++;
        return {
            taskId: error.taskId,
            action: 'RETRY',
            success: true,
            retryCount: error.attemptNumber + 1,
            message: `Retry scheduled after ${delay}ms delay`
        };
    }
    /**
     * Esegue fallback a agent alternativo
     */
    executeFallbackAgent(error) {
        const fallbackAgent = this.config.fallbackAgentMap[error.agentId] || 'general-coder';
        console.log(`[FALLBACK] Switching from ${error.agentId} to ${fallbackAgent}`);
        this.stats.fallbacks++;
        return {
            taskId: error.taskId,
            action: 'FALLBACK_AGENT',
            success: true,
            newAgentId: fallbackAgent,
            message: `Fallback to agent: ${fallbackAgent}`
        };
    }
    /**
     * Esegue escalation a model superiore
     */
    executeEscalation(error, currentModel) {
        const modelHierarchy = ['haiku', 'sonnet', 'opus'];
        const currentIndex = modelHierarchy.indexOf(currentModel);
        if (currentIndex === modelHierarchy.length - 1) {
            // Already at highest model
            return {
                taskId: error.taskId,
                action: 'ESCALATE_MODEL',
                success: false,
                message: 'Already at highest model tier (opus)'
            };
        }
        const newModel = modelHierarchy[currentIndex + 1];
        console.log(`[ESCALATION] Upgrading from ${currentModel} to ${newModel}`);
        this.stats.escalations++;
        this.emit('escalation', {
            taskId: error.taskId,
            fromModel: currentModel,
            toModel: newModel,
            reason: error.error.message
        });
        return {
            taskId: error.taskId,
            action: 'ESCALATE_MODEL',
            success: true,
            newModel,
            message: `Escalated to model: ${newModel}`
        };
    }
    // ===========================================================================
    // CIRCUIT BREAKER
    // ===========================================================================
    /**
     * Verifica stato circuit breaker per un agent
     */
    isCircuitBreakerOpen(agentId) {
        const state = this.circuitBreakers.get(agentId);
        if (!state)
            return false;
        if (!state.isOpen)
            return false;
        // Check if should transition to half-open
        const timeSinceOpen = Date.now() - (state.openedAt || 0);
        if (timeSinceOpen >= this.config.circuitBreakerResetMs) {
            console.log(`[CIRCUIT BREAKER] Agent ${agentId} transitioning to HALF-OPEN`);
            state.isOpen = false;
            state.halfOpenAttempts = 0;
            return false;
        }
        return true;
    }
    /**
     * Aggiorna stato circuit breaker
     */
    updateCircuitBreaker(agentId, success) {
        let state = this.circuitBreakers.get(agentId);
        if (!state) {
            state = {
                isOpen: false,
                failureCount: 0,
                lastFailureTime: 0,
                halfOpenAttempts: 0
            };
            this.circuitBreakers.set(agentId, state);
        }
        if (success) {
            // Reset on success
            state.failureCount = 0;
            state.isOpen = false;
        }
        else {
            // Track failure
            state.failureCount++;
            state.lastFailureTime = Date.now();
            if (state.failureCount >= this.config.circuitBreakerThreshold) {
                state.isOpen = true;
                state.openedAt = Date.now();
                this.stats.circuitBreakerTrips++;
                console.log(`[CIRCUIT BREAKER] Agent ${agentId} circuit OPENED after ${state.failureCount} failures`);
                this.emit('circuitBreakerTripped', { agentId, failureCount: state.failureCount });
            }
        }
    }
    // ===========================================================================
    // ERROR TRACKING
    // ===========================================================================
    /**
     * Traccia errore nella history
     */
    trackError(taskId, error) {
        if (!this.errorHistory.has(taskId)) {
            this.errorHistory.set(taskId, []);
        }
        this.errorHistory.get(taskId).push(error);
        // Track by type
        const errorType = error.error.constructor.name;
        this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
    }
    /**
     * Ottiene history errori per un task
     */
    getTaskErrors(taskId) {
        return this.errorHistory.get(taskId) || [];
    }
    // ===========================================================================
    // STATS & REPORTING
    // ===========================================================================
    /**
     * Ottiene statistiche
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Genera report
     */
    generateReport() {
        const recoveryRate = this.stats.totalErrors > 0
            ? ((this.stats.recoveredErrors / this.stats.totalErrors) * 100).toFixed(1)
            : '0';
        return `
=== ERROR RECOVERY MANAGER REPORT ===

ERROR STATISTICS
  Total Errors:        ${this.stats.totalErrors}
  Recovered:           ${this.stats.recoveredErrors} (${recoveryRate}%)
  Unrecoverable:       ${this.stats.unrecoverableErrors}

RECOVERY ACTIONS
  Retries:             ${this.stats.retries}
  Escalations:         ${this.stats.escalations}
  Fallbacks:           ${this.stats.fallbacks}
  Circuit Breaker:     ${this.stats.circuitBreakerTrips} trips

ERRORS BY SEVERITY
  CRITICAL:            ${this.stats.errorsBySeverity['CRITICAL']}
  HIGH:                ${this.stats.errorsBySeverity['HIGH']}
  MEDIUM:              ${this.stats.errorsBySeverity['MEDIUM']}
  LOW:                 ${this.stats.errorsBySeverity['LOW']}

PERFORMANCE
  Avg Recovery Time:   ${this.stats.avgRecoveryTimeMs.toFixed(0)}ms
=====================================
    `.trim();
    }
    /**
     * Reset manager
     */
    reset() {
        this.errorHistory.clear();
        this.circuitBreakers.clear();
        this.recoveryTimes = [];
        this.stats = {
            totalErrors: 0,
            recoveredErrors: 0,
            unrecoverableErrors: 0,
            retries: 0,
            escalations: 0,
            fallbacks: 0,
            circuitBreakerTrips: 0,
            avgRecoveryTimeMs: 0,
            errorsByType: {},
            errorsBySeverity: {
                'LOW': 0,
                'MEDIUM': 0,
                'HIGH': 0,
                'CRITICAL': 0
            }
        };
    }
}
exports.ErrorRecoveryManager = ErrorRecoveryManager;
// =============================================================================
// FACTORY
// =============================================================================
function createErrorRecoveryManager(config) {
    return new ErrorRecoveryManager(config);
}
exports.createErrorRecoveryManager = createErrorRecoveryManager;
// =============================================================================
// SINGLETON
// =============================================================================
let globalRecoveryManager = null;
function getGlobalRecoveryManager() {
    if (!globalRecoveryManager) {
        globalRecoveryManager = createErrorRecoveryManager({
            enableAutoEscalation: true,
            maxRetries: 3
        });
    }
    return globalRecoveryManager;
}
exports.getGlobalRecoveryManager = getGlobalRecoveryManager;
//# sourceMappingURL=ErrorRecoveryManager.js.map