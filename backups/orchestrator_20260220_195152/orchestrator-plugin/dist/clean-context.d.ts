/**
 * CLEAN CONTEXT SYSTEM
 * ====================
 * Garantisce che ogni agent lavori con contesto pulito
 * per massima concentrazione ed efficienza.
 *
 * REGOLE:
 * 1. Ogni task inizia con /clear
 * 2. Agent riceve SOLO le informazioni necessarie
 * 3. Zero pollution da task precedenti
 * 4. Contesto minimo = massima efficienza
 *
 * @version 1.0.0
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface CleanContextConfig {
    clearBeforeTask: boolean;
    clearAfterTask: boolean;
    isolateAgents: boolean;
    maxContextTokens: number;
    maxHistoryItems: number;
    injectSystemPrompt: boolean;
    injectAgentExpertise: boolean;
    injectTaskOnly: boolean;
    stripUnnecessaryContext: boolean;
    compressLargeInputs: boolean;
    focusMode: boolean;
}
export interface TaskContext {
    taskId: string;
    description: string;
    agentFile: string;
    agentExpertise?: string;
    requiredContext: string[];
    forbiddenContext: string[];
    focusAreas: string[];
}
export interface CleanPrompt {
    systemPrompt: string;
    userPrompt: string;
    contextSize: number;
    isClean: boolean;
    optimizations: string[];
}
export interface ContextState {
    isClean: boolean;
    lastCleared: number;
    taskCount: number;
    totalTokensSaved: number;
}
export declare class CleanContextManager extends EventEmitter {
    private config;
    private state;
    private agentExpertiseCache;
    constructor(config?: Partial<CleanContextConfig>);
    /**
     * Prepara un prompt pulito per un task
     */
    prepareCleanPrompt(context: TaskContext): CleanPrompt;
    /**
     * Genera il comando di clear per Claude Code
     */
    getClearCommand(): string;
    /**
     * Genera prompt wrapper per Task tool
     */
    wrapForTaskTool(context: TaskContext): string;
    /**
     * Prepara agent expertise dal file
     */
    loadAgentExpertise(agentFile: string): Promise<string>;
    /**
     * Genera expertise dal nome file
     */
    private generateExpertiseFromFilename;
    /**
     * Estrai nome agent dal path
     */
    private extractAgentName;
    /**
     * Applica focus mode - rimuove verbosità
     */
    private applyFocusMode;
    /**
     * Comprimi prompt se troppo lungo
     */
    private compressPrompt;
    /**
     * Stima token (approssimativa)
     */
    private estimateTokens;
    /**
     * Reset state
     */
    reset(): void;
    /**
     * Get statistics
     */
    getStats(): ContextState & {
        config: CleanContextConfig;
    };
    /**
     * Update config
     */
    updateConfig(updates: Partial<CleanContextConfig>): void;
}
export declare class CleanTaskWrapper {
    private contextManager;
    constructor(config?: Partial<CleanContextConfig>);
    /**
     * Wrappa un task per esecuzione pulita
     */
    wrap(taskId: string, description: string, agentFile: string): {
        clearCommand: string;
        prompt: string;
        metadata: {
            taskId: string;
            agent: string;
            contextSize: number;
            optimizations: string[];
        };
    };
    /**
     * Get stats
     */
    getStats(): ContextState & {
        config: CleanContextConfig;
    };
}
export declare const cleanContext: CleanContextManager;
export declare const taskWrapper: CleanTaskWrapper;
/**
 * Prepara un task per esecuzione pulita
 */
export declare function prepareCleanTask(taskId: string, description: string, agentFile: string): ReturnType<CleanTaskWrapper['wrap']>;
/**
 * Get clear command
 */
export declare function getClearCommand(): string;
//# sourceMappingURL=clean-context.d.ts.map