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
/// <reference types="node" />
import { EventEmitter } from 'events';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecoveryAction = 'RETRY' | 'FALLBACK_AGENT' | 'ESCALATE_MODEL' | 'SKIP' | 'ABORT' | 'MANUAL_INTERVENTION';
export interface TaskError {
    taskId: string;
    agentId: string;
    error: Error;
    timestamp: number;
    attemptNumber: number;
    severity: ErrorSeverity;
    recoverable: boolean;
    context?: any;
}
export interface RecoveryResult {
    taskId: string;
    action: RecoveryAction;
    success: boolean;
    newAgentId?: string;
    newModel?: ModelTier;
    retryCount?: number;
    message: string;
}
export interface EscalationRule {
    condition: (error: TaskError) => boolean;
    action: RecoveryAction;
    targetModel?: ModelTier;
    fallbackAgent?: string;
    maxRetries?: number;
}
export interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    openedAt?: number;
    halfOpenAttempts: number;
}
export interface RecoveryManagerConfig {
    maxRetries: number;
    retryDelayMs: number;
    retryBackoffMultiplier: number;
    maxRetryDelayMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerResetMs: number;
    enableAutoEscalation: boolean;
    escalationThreshold: number;
    fallbackAgentMap: Record<string, string>;
    criticalTaskPatterns: string[];
}
export interface RecoveryStats {
    totalErrors: number;
    recoveredErrors: number;
    unrecoverableErrors: number;
    retries: number;
    escalations: number;
    fallbacks: number;
    circuitBreakerTrips: number;
    avgRecoveryTimeMs: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
}
export declare class ErrorRecoveryManager extends EventEmitter {
    private config;
    private errorHistory;
    private circuitBreakers;
    private escalationRules;
    private stats;
    private recoveryTimes;
    constructor(config?: Partial<RecoveryManagerConfig>);
    /**
     * Inizializza regole di escalation di default
     */
    private initializeDefaultEscalationRules;
    /**
     * Aggiunge regola di escalation custom
     */
    addEscalationRule(rule: EscalationRule): void;
    /**
     * Registra un errore e determina l'azione di recovery
     */
    handleError(taskId: string, agentId: string, error: Error, currentModel: ModelTier, taskDescription: string, attemptNumber?: number): Promise<RecoveryResult>;
    /**
     * Classifica la severità dell'errore
     */
    private classifyErrorSeverity;
    /**
     * Verifica se l'errore è recuperabile
     */
    private isRecoverable;
    /**
     * Determina l'azione di recovery appropriata
     */
    private determineRecoveryAction;
    /**
     * Esegue l'azione di recovery
     */
    private executeRecoveryAction;
    /**
     * Esegue retry con backoff esponenziale
     */
    private executeRetry;
    /**
     * Esegue fallback a agent alternativo
     */
    private executeFallbackAgent;
    /**
     * Esegue escalation a model superiore
     */
    private executeEscalation;
    /**
     * Verifica stato circuit breaker per un agent
     */
    private isCircuitBreakerOpen;
    /**
     * Aggiorna stato circuit breaker
     */
    private updateCircuitBreaker;
    /**
     * Traccia errore nella history
     */
    private trackError;
    /**
     * Ottiene history errori per un task
     */
    getTaskErrors(taskId: string): TaskError[];
    /**
     * Ottiene statistiche
     */
    getStats(): RecoveryStats;
    /**
     * Genera report
     */
    generateReport(): string;
    /**
     * Reset manager
     */
    reset(): void;
}
export declare function createErrorRecoveryManager(config?: Partial<RecoveryManagerConfig>): ErrorRecoveryManager;
export declare function getGlobalRecoveryManager(): ErrorRecoveryManager;
//# sourceMappingURL=ErrorRecoveryManager.d.ts.map