/**
 * Ralph Loop Integration - Iterative Task Execution Engine
 *
 * Integrazione seamless con ralph-loop skill per task iterativi con:
 * - Auto-detection criteri di successo
 * - Progress tracking e convergence monitoring
 * - Loop termination intelligente
 * - Performance optimization
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
import type { ExtractedKeyword } from '../analysis/types';
import type { PluginConfig } from '../types';
/**
 * Configurazione Ralph Loop
 */
export interface RalphLoopConfig {
    /** Massimo numero di iterazioni permesse */
    maxIterations: number;
    /** Timeout per singola iterazione (ms) */
    iterationTimeoutMs: number;
    /** Soglia di convergenza (0.0-1.0) */
    convergenceThreshold: number;
    /** Numero massimo iterazioni senza progresso prima di fermarsi */
    maxStagnantIterations: number;
    /** Abilita monitoring avanzato */
    enableAdvancedMonitoring: boolean;
}
/**
 * Criteri di successo per terminazione loop
 */
export interface SuccessCriteria {
    /** ID univoco criterio */
    id: string;
    /** Descrizione human-readable */
    description: string;
    /** Pattern regex da matchare nell'output */
    pattern?: string;
    /** Test function personalizzato */
    testFn?: (output: string, context: LoopContext) => boolean;
    /** Peso criterio (0.0-1.0) */
    weight: number;
    /** Obbligatorio o opzionale */
    required: boolean;
}
/**
 * Context di esecuzione loop
 */
export interface LoopContext {
    /** Iterazione corrente */
    currentIteration: number;
    /** Timestamp avvio */
    startTime: number;
    /** Storia delle iterazioni */
    iterationHistory: LoopIteration[];
    /** Progress score aggregato */
    progressScore: number;
    /** Ultimo output significativo */
    lastOutput: string;
    /** Metadata aggiuntivi */
    metadata: Record<string, any>;
}
/**
 * Singola iterazione loop
 */
export interface LoopIteration {
    /** Numero iterazione */
    iteration: number;
    /** Timestamp */
    timestamp: number;
    /** Input prompt */
    input: string;
    /** Output prodotto */
    output: string;
    /** Score di progresso */
    progressScore: number;
    /** Criteri soddisfatti */
    satisfiedCriteria: string[];
    /** Tempo esecuzione (ms) */
    executionTime: number;
    /** Errori eventuali */
    errors?: string[];
}
/**
 * Risultato detection Ralph Loop
 */
export interface LoopDetectionResult {
    /** Dovrebbe usare Ralph Loop */
    shouldUseLoop: boolean;
    /** Confidence della detection (0.0-1.0) */
    confidence: number;
    /** Criteri di successo identificati */
    detectedCriteria: SuccessCriteria[];
    /** Max iterazioni stimato */
    estimatedMaxIterations: number;
    /** Timeout stimato per iterazione */
    estimatedIterationTimeout: number;
    /** Reasoning della decisione */
    reasoning: string;
}
/**
 * Risultato esecuzione Ralph Loop
 */
export interface RalphLoopResult {
    /** Successo finale */
    success: boolean;
    /** Numero iterazioni eseguite */
    iterationsExecuted: number;
    /** Tempo totale esecuzione */
    totalExecutionTime: number;
    /** Ragione terminazione */
    terminationReason: 'success' | 'maxIterations' | 'timeout' | 'stagnation' | 'error';
    /** Context finale */
    finalContext: LoopContext;
    /** Output finale */
    finalOutput: string;
    /** Performance metrics */
    metrics: RalphLoopMetrics;
}
/**
 * Metriche performance Ralph Loop
 */
export interface RalphLoopMetrics {
    /** Accuracy detection (se testable) */
    detectionAccuracy?: number;
    /** Velocità convergenza */
    convergenceRate: number;
    /** Efficienza iterazioni */
    iterationEfficiency: number;
    /** Score qualità finale */
    finalQualityScore: number;
    /** Resource utilization */
    resourceUtilization: {
        cpu: number;
        memory: number;
        tokens: number;
    };
}
export declare class RalphLoopIntegration {
    private loopConfig;
    private logger;
    private detectionPatterns;
    private builtinCriteria;
    constructor(config: PluginConfig, loopConfig?: Partial<RalphLoopConfig>);
    /**
     * Detecta se il task dovrebbe usare Ralph Loop
     */
    detectLoopRequirement(taskDescription: string, extractedKeywords: ExtractedKeyword[]): Promise<LoopDetectionResult>;
    /**
     * Esegue Ralph Loop con monitoring avanzato
     */
    executeRalphLoop(initialPrompt: string, successCriteria: SuccessCriteria[], options?: Partial<RalphLoopConfig>): Promise<RalphLoopResult>;
    private initializeDetectionPatterns;
    private initializeBuiltinCriteria;
    private detectIterativePatterns;
    private analyzeKeywordsForLoop;
    private detectSuccessCriteria;
    private calculateDetectionConfidence;
    private estimateLoopParameters;
    private generateDetectionReasoning;
    private executeIteration;
    private calculateIterationProgress;
    private evaluateSuccessCriteria;
    private evaluateSingleCriterion;
    private detectStagnation;
    private calculateLoopMetrics;
}
/**
 * Factory per creare RalphLoopIntegration configurato
 */
export declare function createRalphLoopIntegration(config: PluginConfig, loopConfig?: Partial<RalphLoopConfig>): RalphLoopIntegration;
/**
 * Helper per validare criteri di successo
 */
export declare function validateSuccessCriteria(criteria: SuccessCriteria[]): string[];
/**
 * Helper per creare criteri predefiniti per task comuni
 */
export declare function createCommonCriteria(taskType: 'tdd' | 'api' | 'feature' | 'bugfix'): SuccessCriteria[];
//# sourceMappingURL=RalphLoopIntegration.d.ts.map