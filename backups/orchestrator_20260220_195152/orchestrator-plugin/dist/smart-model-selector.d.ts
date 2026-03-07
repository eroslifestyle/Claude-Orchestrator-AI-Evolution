/**
 * Smart Model Selector
 * Assegnazione intelligente dei modelli in base a complessità e tipo di task
 *
 * REGOLA FONDAMENTALE:
 * - Orchestrator: SEMPRE Opus
 * - Altri task: In base a complessità
 */
export type ModelType = 'haiku' | 'sonnet' | 'opus';
export interface TaskAnalysis {
    complexity: 'low' | 'medium' | 'high' | 'critical';
    requiresLateralThinking: boolean;
    isRepetitive: boolean;
    isLoopTask: boolean;
    domain: string;
    estimatedTokens: number;
}
export interface ModelSelectionResult {
    model: ModelType;
    reason: string;
    confidence: number;
}
export declare class SmartModelSelector {
    /**
     * Analizza un task e determina la sua complessità
     */
    analyzeTask(description: string, agentFile: string, context?: {
        parentModel?: ModelType;
        depth?: number;
        isSubtask?: boolean;
    }): TaskAnalysis;
    /**
     * Seleziona il modello ottimale per un task
     */
    selectModel(description: string, agentFile: string, context?: {
        parentModel?: ModelType;
        depth?: number;
        isSubtask?: boolean;
        forceModel?: ModelType;
    }): ModelSelectionResult;
    /**
     * Stima token necessari
     */
    private estimateTokens;
    /**
     * Ottieni statistiche sui modelli usati
     */
    getModelDistribution(tasks: Array<{
        model: ModelType;
    }>): Record<ModelType, number>;
    /**
     * Calcola costo stimato
     */
    estimateCost(model: ModelType, tokens: number): number;
}
export declare const modelSelector: SmartModelSelector;
//# sourceMappingURL=smart-model-selector.d.ts.map