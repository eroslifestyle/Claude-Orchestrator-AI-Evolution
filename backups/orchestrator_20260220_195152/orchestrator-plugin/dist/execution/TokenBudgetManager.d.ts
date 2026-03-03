/**
 * TOKEN BUDGET MANAGER - Gestione Preventiva Token con Auto-Decomposizione
 *
 * REGOLA FONDAMENTALE:
 * Mantenere SEMPRE l'utilizzo token sotto il 50-70% del limite massimo
 * perché oltre questa soglia si degradano:
 * - Performance (latenza maggiore)
 * - Qualità risultato (contesto troppo lungo = confusione)
 * - Costi (più token = più costi)
 *
 * STRATEGIA:
 * 1. Monitoraggio continuo utilizzo token
 * 2. Warning a 50% (soglia gialla)
 * 3. Auto-decomposizione a 70% (soglia rossa)
 * 4. Clear forzato a 85% (soglia critica)
 *
 * @version 1.0
 * @date 2026-02-03
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export type TokenZone = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
export interface TokenBudget {
    maxTokens: number;
    currentTokens: number;
    usagePercent: number;
    zone: TokenZone;
    remainingTokens: number;
    estimatedTurnsRemaining: number;
}
export interface TokenThresholds {
    greenMax: number;
    yellowMax: number;
    redMax: number;
    criticalMax: number;
}
export interface DecompositionResult {
    originalTask: TaskForDecomposition;
    subTasks: TaskForDecomposition[];
    reason: DecompositionReason;
    estimatedTokenSavings: number;
    splitStrategy: SplitStrategy;
}
export interface TaskForDecomposition {
    id: string;
    description: string;
    estimatedTokens: number;
    complexity: 'low' | 'medium' | 'high' | 'extreme';
    canBeDecomposed: boolean;
    subTaskHints?: string[];
}
export type DecompositionReason = 'token_limit_approaching' | 'task_too_complex' | 'context_too_long' | 'performance_optimization' | 'manual_request';
export type SplitStrategy = 'by_subtask' | 'by_phase' | 'by_component' | 'by_priority' | 'sequential_chunks';
export interface TokenBudgetConfig {
    maxTokensPerConversation: number;
    greenThresholdPercent: number;
    yellowThresholdPercent: number;
    redThresholdPercent: number;
    criticalThresholdPercent: number;
    autoDecomposeOnRed: boolean;
    autoClearOnCritical: boolean;
    avgTokensPerTurn: number;
    enablePredictiveDecomposition: boolean;
    minSubTaskTokens: number;
    logTokenUsage: boolean;
}
export interface TokenStats {
    peakUsagePercent: number;
    avgUsagePercent: number;
    decompositionsTriggered: number;
    clearsTriggered: number;
    warningsIssued: number;
    tokensOverBudget: number;
    samples: number;
}
export declare class TokenBudgetManager extends EventEmitter {
    private config;
    private currentTokens;
    private stats;
    private usageHistory;
    private lastZone;
    constructor(config?: Partial<TokenBudgetConfig>);
    /**
     * Ottiene lo stato corrente del budget token
     */
    getBudget(): TokenBudget;
    /**
     * Calcola la zona basata sulla percentuale di utilizzo
     */
    private calculateZone;
    /**
     * Aggiorna il conteggio token e verifica le soglie
     */
    updateTokenCount(newTokens: number): {
        budget: TokenBudget;
        action: 'none' | 'warn' | 'decompose' | 'clear';
        message?: string;
    };
    /**
     * Aggiunge token al conteggio
     */
    addTokens(tokens: number): ReturnType<typeof this.updateTokenCount>;
    /**
     * Resetta il conteggio token (dopo clear)
     */
    resetTokenCount(): void;
    /**
     * Verifica la zona e determina l'azione appropriata
     */
    private checkZoneAndAct;
    /**
     * Decompone un task in sotto-task per rispettare il budget token
     */
    decomposeTask(task: TaskForDecomposition, reason?: DecompositionReason): DecompositionResult;
    /**
     * Determina la migliore strategia di split per un task
     */
    private determineSplitStrategy;
    /**
     * Genera sub-tasks basati sulla strategia
     */
    private generateSubTasks;
    /**
     * Crea un sub-task
     */
    private createSubTask;
    /**
     * Riduce il livello di complessità
     */
    private reduceComplexity;
    /**
     * Verifica se un task può essere eseguito senza superare le soglie
     */
    canExecuteTask(estimatedTokens: number): {
        canExecute: boolean;
        projectedZone: TokenZone;
        recommendation: string;
    };
    /**
     * Stima i token necessari per un task basandosi sulla descrizione
     */
    estimateTaskTokens(description: string, complexity: TaskForDecomposition['complexity']): number;
    /**
     * Aggiorna le statistiche
     */
    private updateStats;
    /**
     * Log dello stato del budget
     */
    private logBudgetStatus;
    /**
     * Crea una barra di progresso visuale
     */
    private createProgressBar;
    /**
     * Ottiene le statistiche
     */
    getStats(): TokenStats;
    /**
     * Genera report
     */
    generateReport(): string;
    /**
     * Genera raccomandazioni basate sulle statistiche
     */
    private generateRecommendations;
    /**
     * Reset manager
     */
    reset(): void;
}
export declare function createTokenBudgetManager(config?: Partial<TokenBudgetConfig>): TokenBudgetManager;
export declare function getGlobalTokenBudgetManager(): TokenBudgetManager;
/**
 * Wrapper per esecuzione con controllo budget
 */
export declare function executeWithBudgetCheck<T>(taskDescription: string, estimatedTokens: number, executor: () => Promise<T>, onDecompose?: (result: DecompositionResult) => Promise<void>): Promise<T | null>;
//# sourceMappingURL=TokenBudgetManager.d.ts.map