/**
 * AGENT CONTEXT MANAGER - Clear Context Before Each Execution
 *
 * Regola che garantisce che ogni agent esegua con contesto pulito
 * per performance ottimali. Prima di ogni esecuzione:
 * 1. Clear della conversazione precedente
 * 2. Reset del contesto agent
 * 3. Preload solo delle info essenziali
 *
 * PRINCIPIO: Ogni agent parte SEMPRE con contesto pulito per
 * massimizzare performance e evitare context bloat.
 *
 * @version 1.0
 * @date 2026-02-03
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface AgentContext {
    agentId: string;
    sessionId: string;
    conversationHistory: ConversationTurn[];
    tokenCount: number;
    maxTokens: number;
    createdAt: number;
    lastAccessAt: number;
    clearCount: number;
}
export interface ConversationTurn {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    tokenEstimate: number;
}
export interface ContextClearResult {
    agentId: string;
    previousTokenCount: number;
    clearedAt: number;
    reason: ContextClearReason;
}
export type ContextClearReason = 'pre_execution' | 'token_limit_reached' | 'manual_clear' | 'error_recovery' | 'task_switch' | 'periodic_cleanup';
export interface ContextManagerConfig {
    maxTokensBeforeAutoClear: number;
    clearBeforeEachExecution: boolean;
    preserveSystemPrompt: boolean;
    preserveLastNTurns: number;
    enableContextCompression: boolean;
    compressionThreshold: number;
    periodicCleanupIntervalMs: number;
    logClearEvents: boolean;
}
export interface ContextStats {
    totalClears: number;
    totalTokensSaved: number;
    avgTokensBeforeClear: number;
    clearsByReason: Record<ContextClearReason, number>;
}
export declare class AgentContextManager extends EventEmitter {
    private config;
    private contexts;
    private stats;
    private cleanupTimer;
    constructor(config?: Partial<ContextManagerConfig>);
    /**
     * Prepara il contesto per l'esecuzione di un agent
     * REGOLA: SEMPRE clear prima dell'esecuzione per performance ottimali
     */
    prepareForExecution(agentId: string, taskDescription: string): Promise<{
        context: AgentContext;
        wasCleared: boolean;
        clearResult?: ContextClearResult;
    }>;
    /**
     * Clear completo del contesto di un agent
     */
    clearContext(agentId: string, reason: ContextClearReason): Promise<ContextClearResult>;
    /**
     * Ottiene o crea un contesto per un agent
     */
    getOrCreateContext(agentId: string): AgentContext;
    /**
     * Aggiunge un messaggio system al contesto
     */
    addSystemContext(agentId: string, content: string): void;
    /**
     * Aggiunge una risposta assistant al contesto
     */
    addAssistantResponse(agentId: string, content: string): void;
    /**
     * Aggiunge un messaggio user al contesto
     */
    addUserMessage(agentId: string, content: string): void;
    /**
     * Verifica e gestisce il limite di token
     */
    private checkTokenLimit;
    /**
     * Clear di tutti i contesti prima di un batch parallelo
     * Garantisce che tutti gli agent partano con contesto pulito
     */
    clearAllForBatch(agentIds: string[], reason?: ContextClearReason): Promise<ContextClearResult[]>;
    /**
     * Prepara multipli agent per esecuzione parallela
     */
    prepareMultipleForExecution(agentTasks: Array<{
        agentId: string;
        taskDescription: string;
    }>): Promise<Map<string, {
        context: AgentContext;
        wasCleared: boolean;
    }>>;
    /**
     * Avvia cleanup periodico dei contesti inattivi
     */
    private startPeriodicCleanup;
    /**
     * Esegue cleanup periodico
     */
    private performPeriodicCleanup;
    /**
     * Stima i token per un array di turns
     */
    private estimateTokens;
    /**
     * Stima i token per un testo
     * Usa approssimazione: ~4 caratteri per token
     */
    private estimateTokensForText;
    /**
     * Ottiene le statistiche del context manager
     */
    getStats(): ContextStats;
    /**
     * Ottiene info su tutti i contesti attivi
     */
    getActiveContexts(): Array<{
        agentId: string;
        tokenCount: number;
        turnCount: number;
        lastAccess: number;
    }>;
    /**
     * Ottiene il contesto di un agent specifico
     */
    getContext(agentId: string): AgentContext | undefined;
    /**
     * Genera report dello stato dei contesti
     */
    generateReport(): string;
    /**
     * Pulisce tutte le risorse
     */
    destroy(): void;
}
export declare function createAgentContextManager(config?: Partial<ContextManagerConfig>): AgentContextManager;
export declare function getGlobalContextManager(): AgentContextManager;
/**
 * Wrapper che garantisce clear del contesto prima di ogni esecuzione
 */
export declare function executeWithCleanContext<T>(agentId: string, taskDescription: string, executor: () => Promise<T>): Promise<T>;
/**
 * Wrapper per esecuzione batch con clear automatico
 */
export declare function executeBatchWithCleanContexts<T>(tasks: Array<{
    agentId: string;
    taskDescription: string;
    executor: () => Promise<T>;
}>): Promise<Array<{
    agentId: string;
    result: T | Error;
    success: boolean;
}>>;
//# sourceMappingURL=AgentContextManager.d.ts.map