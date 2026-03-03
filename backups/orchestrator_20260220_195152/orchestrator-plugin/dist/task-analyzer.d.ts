/**
 * TASK ANALYZER - Consolidated
 * ============================
 * Analisi task consolidata da:
 * - analysis/analysis-engine.ts
 * - analysis/KeywordExtractor.ts
 * - analysis/EnhancedKeywordExtractor.ts
 * - analysis/tiers/fast/smart/deep
 *
 * NO dipendenze esterne (no 'natural') - usa regex e pattern matching.
 *
 * @version 4.0.0
 */
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ModelType = 'haiku' | 'sonnet' | 'opus';
export interface AnalysisResult {
    keywords: string[];
    domains: string[];
    complexity: ComplexityLevel;
    suggestedAgent: string;
    suggestedModel: ModelType;
    confidence: number;
    reasoning: string;
}
export interface DomainMapping {
    keywords: string[];
    agent: string;
    model: ModelType;
    priority: number;
}
export declare class TaskAnalyzer {
    private cache;
    /**
     * Analizza una descrizione di task
     */
    analyze(description: string): AnalysisResult;
    /**
     * Estrae keywords dal testo
     */
    extractKeywords(text: string): string[];
    /**
     * Rileva i domini coinvolti
     */
    detectDomains(keywords: string[]): string[];
    /**
     * Valuta la complessità
     */
    assessComplexity(description: string, keywords: string[]): ComplexityLevel;
    /**
     * Determina il miglior agent
     */
    private determineBestAgent;
    /**
     * Modello per complessità
     */
    private getModelForComplexity;
    /**
     * Check se parola è significativa
     */
    private isSignificantWord;
    /**
     * Genera reasoning
     */
    private generateReasoning;
    /**
     * Suggerisci agent per descrizione
     */
    suggestAgent(description: string): string;
    /**
     * Suggerisci modello per descrizione
     */
    suggestModel(description: string): ModelType;
    /**
     * Clear cache
     */
    clearCache(): void;
}
export declare const taskAnalyzer: TaskAnalyzer;
export declare function analyzeTask(description: string): AnalysisResult;
export declare function suggestAgent(description: string): string;
export declare function suggestModel(description: string): ModelType;
//# sourceMappingURL=task-analyzer.d.ts.map