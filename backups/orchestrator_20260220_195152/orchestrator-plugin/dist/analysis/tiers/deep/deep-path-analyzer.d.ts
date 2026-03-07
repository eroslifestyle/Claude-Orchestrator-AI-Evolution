/**
 * Tier 3 - Deep Path Analyzer (STUB)
 *
 * Placeholder per future Claude LLM integration
 * Target: <2s response time, 100% coverage, confidence threshold 0.5
 *
 * @version 1.0 - Stub Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
import { KeywordExtractionResult, GracefulPromise } from '../../types';
interface DeepPathInternalConfig {
    enabled: boolean;
    timeoutMs: number;
    confidenceThreshold: number;
    maxInputLength: number;
    llmProvider: 'claude' | 'openai' | 'local';
    modelName: string;
    maxTokens: number;
    temperature: number;
    fallbackBehavior: 'fail' | 'use-smart' | 'use-fast';
}
interface DeepPathMetrics {
    llmCalls: number;
    averageTokensUsed: number;
    averageResponseTime: number;
    apiCost: number;
    fallbackCount: number;
    successRate: number;
}
export declare class DeepPathAnalyzer {
    private config;
    private metrics;
    private startupTime;
    constructor(config?: Partial<DeepPathInternalConfig>);
    /**
     * Analizza testo con Deep Path (STUB - fallback a Smart Path)
     */
    analyze(_text: string): GracefulPromise<KeywordExtractionResult>;
    /**
     * Check se Deep Path può gestire questa richiesta (STUB)
     */
    canHandle(_text: string): boolean;
    /**
     * Get performance metrics (STUB)
     */
    getMetrics(): DeepPathMetrics;
    /**
     * IMPLEMENTAZIONE FUTURA:
     *
     * 1. Claude API Integration:
     *    - Configurare cliente Claude API
     *    - Implementare prompt engineering per keyword extraction
     *    - Gestire rate limiting e quotas
     *    - Caching semantico per evitare chiamate duplicate
     *
     * 2. Advanced Analysis:
     *    - Entity recognition
     *    - Intent classification
     *    - Context understanding
     *    - Multi-turn conversation analysis
     *
     * 3. Quality Assurance:
     *    - Confidence calibration
     *    - Result validation
     *    - A/B testing framework
     *    - Human feedback loop
     *
     * 4. Performance Optimization:
     *    - Prompt optimization
     *    - Batch processing
     *    - Async processing pipeline
     *    - Cost optimization
     *
     * 5. Integration Features:
     *    - Fallback coordination con Smart Path
     *    - Result enrichment
     *    - Multi-modal analysis (se richiesto)
     *    - Streaming responses per long text
     */
    /**
     * Create stub error result
     */
    private createStubErrorResult;
    /**
     * Get stub error message
     */
    private getStubErrorMessage;
}
export type { DeepPathInternalConfig, DeepPathMetrics };
//# sourceMappingURL=deep-path-analyzer.d.ts.map