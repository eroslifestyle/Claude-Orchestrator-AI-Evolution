/**
 * ORCHESTRATOR V6.0 - Enhanced con Analysis Engine Intelligente
 *
 * Integra l'Analysis Layer 3-Tier per keyword extraction avanzata
 * Mantiene tutto il parallelismo multi-livello del V5.1 + intelligenza AI
 *
 * NUOVE FEATURES V6.0:
 * - AnalysisEngine 3-Tier integrato (Fast/Smart/Deep Path)
 * - Confidence-based decision making
 * - Domain classification intelligente
 * - Complexity assessment automatico
 * - Performance monitoring integrato
 *
 * REGOLE FONDAMENTALI MANTENUTE:
 * #1: MAI codifica direttamente - SEMPRE delega
 * #2: SEMPRE comunica tabella agent PRIMA di lanciare
 * #3: Parallelismo massimo per task indipendenti
 * #4: Usa Ralph Loop per task iterativi
 * #5: OGNI processo DEVE concludersi con documenter expert agent
 * #6: PRIMA di ogni task, verifica ERRORI RISOLTI
 */
import { AnalysisResult } from './analysis';
interface EnhancedKeywordAnalysis {
    keywords: string[];
    domini: string[];
    complessita: 'bassa' | 'media' | 'alta' | 'extreme';
    fileCount: number;
    isMultiDominio: boolean;
    analysisResult: AnalysisResult;
    overallConfidence: number;
    primaryDomain: string;
    secondaryDomains: string[];
    recommendedAgent: string;
    recommendedModel: 'haiku' | 'sonnet' | 'opus' | 'auto';
    complexityFactors: string[];
    shouldParallelize: boolean;
    estimatedTimeMinutes: number;
    processingTimeMs: number;
}
interface EnhancedAgentTask {
    id: string;
    description: string;
    agentExpertFile: string;
    model: 'haiku' | 'sonnet' | 'opus' | 'auto';
    specialization: string;
    dependencies: string[];
    priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
    level: 1 | 2 | 3;
    parentTaskId?: string;
    subTasks?: EnhancedAgentTask[];
    allowSubSpawning?: boolean;
    complexityThreshold?: number;
    maxSubTasks?: number;
    confidence: number;
    domain: string;
    keywordMatches: string[];
    analysisSource: 'fast' | 'smart' | 'deep' | 'fallback';
    complexityScore: number;
    contextFactors: string[];
}
interface EnhancedExecutionPlan {
    tasks: EnhancedAgentTask[];
    parallelBatches: EnhancedAgentTask[][];
    totalAgents: number;
    stimatedTime: string;
    documenterTask: EnhancedAgentTask;
    hierarchicalStructure: {
        level1Tasks: EnhancedAgentTask[];
        level2Tasks: EnhancedAgentTask[];
        level3Tasks: EnhancedAgentTask[];
        totalLevels: number;
        maxParallelism: number;
    };
    analysisResult: AnalysisResult;
    intelligentRouting: {
        analysisConfidence: number;
        primaryDomain: string;
        fallbacksUsed: string[];
        performanceMetrics: {
            analysisTimeMs: number;
            cacheHitRate: number;
            tierUsed: string;
        };
    };
}
declare class OrchestratorV60 {
    private analysisEngine;
    private taskLauncher;
    private progressTracker;
    private startupTime;
    private readonly KEYWORD_TO_EXPERT_MAPPING;
    private readonly EXPERT_TO_MODEL_MAPPING;
    constructor();
    /**
     * STEP 1: ANALISI INTELLIGENTE con Analysis Engine 3-Tier
     * Sostituisce il sistema keyword semplice con AI avanzata
     */
    analyzeTaskIntelligent(userRequest: string): Promise<EnhancedKeywordAnalysis>;
    /**
     * Fallback al sistema legacy quando Analysis Engine fallisce
     */
    private fallbackToLegacyAnalysis;
    /**
     * STEP 2: ROUTING INTELLIGENTE basato su Analysis Engine
     * Usa confidence scores e domain classification per routing preciso
     */
    routeToAgentsIntelligent(analysis: EnhancedKeywordAnalysis, userRequest: string): EnhancedAgentTask[];
    /**
     * Create enhanced task da domain classification
     */
    private createEnhancedTaskFromDomain;
    /**
     * Create fallback task quando Analysis Engine non produce risultati
     */
    private createFallbackTask;
    /**
     * STEP 3: COMUNICAZIONE PRE-LANCIO con Intelligence Insights
     * Mostra informazioni da Analysis Engine + legacy table
     */
    displayEnhancedExecutionPlan(tasks: EnhancedAgentTask[], analysis: EnhancedKeywordAnalysis): void;
    /**
     * Execute con performance monitoring
     */
    executeEnhanced(tasks: EnhancedAgentTask[], analysis: EnhancedKeywordAnalysis): Promise<void>;
    /**
     * Execute parallelo enhanced
     */
    private executeParallelEnhanced;
    /**
     * Execute enhanced task level
     */
    private executeEnhancedTaskLevel;
    /**
     * Execute enhanced individual agent
     */
    private executeEnhancedAgent;
    /**
     * Generate enhanced final report
     */
    private generateEnhancedReport;
    /**
     * MAIN ORCHESTRATION METHOD V6.0
     * Integra Analysis Engine con workflow esistente
     */
    orchestrateEnhanced(userRequest: string): Promise<void>;
    private getSpecializationFromDomain;
    private averageConfidence;
    private getSourceDistribution;
    private getAnalysisEngineMemory;
    private truncateText;
    private simulateExecution;
    /**
     * Get Analysis Engine health status
     */
    getAnalysisEngineHealth(): Promise<any>;
    /**
     * Reset Analysis Engine se necessario
     */
    resetAnalysisEngine(): void;
    /**
     * Get comprehensive system metrics
     */
    getSystemMetrics(): any;
}
export { OrchestratorV60, type EnhancedKeywordAnalysis, type EnhancedAgentTask, type EnhancedExecutionPlan };
//# sourceMappingURL=orchestrator-enhanced.d.ts.map