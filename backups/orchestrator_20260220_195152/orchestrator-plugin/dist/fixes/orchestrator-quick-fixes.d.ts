/**
 * ORCHESTRATOR QUICK FIXES V1.0
 *
 * Script automatizzato per applicare fix critici al sistema orchestrator
 * Risolve problemi identificati durante stress testing
 *
 * FIX CATEGORIES:
 * 1. Agent File Validation (pre-execution check)
 * 2. Intelligent Fallback Mapping (L2→L1, L3→L1)
 * 3. Sub-Agent Spawning Control (disable quando non supportato)
 * 4. Circuit Breaker Pattern (prevent cascade failures)
 */
/**
 * Comprehensive fallback mapping for all sub-agents
 * Maps L2/L3 specialist agents → L1 general agents
 */
declare const FALLBACK_MAPPING: Record<string, string>;
/**
 * Domain-based fallback per agent sconosciuti
 */
declare const DOMAIN_FALLBACKS: Record<string, string>;
declare class OrchestratorQuickFixer {
    private agentBasePath;
    private validatedAgents;
    constructor();
    /**
     * FIX 1: Agent File Validation
     * Verifica esistenza agent prima di esecuzione
     */
    validateAgentFile(agentPath: string): Promise<boolean>;
    /**
     * FIX 2: Intelligent Fallback Agent Selection
     * Trova best fallback per agent mancante
     */
    getFallbackAgent(invalidAgent: string): string;
    /**
     * Fallback basato su livello gerarchico
     */
    private findLevelBasedFallback;
    /**
     * Trova agent L1 per dominio
     */
    private findDomainL1Agent;
    /**
     * FIX 3: Safe Agent Task Creation con Validation
     * Crea task solo con agent validati, applica fallback se necessario
     */
    createSafeAgentTask(taskConfig: {
        id: string;
        description: string;
        agentExpertFile: string;
        model: 'haiku' | 'sonnet' | 'opus';
        specialization: string;
        dependencies: string[];
        priority: 'CRITICA' | 'ALTA' | 'MEDIA';
        level: 1 | 2 | 3;
    }): Promise<any>;
    /**
     * FIX 4: Disable Sub-Agent Spawning
     * Disabilita spawning quando sub-agents non disponibili
     */
    shouldAllowSubSpawning(agentFile: string, availableSubAgents: string[]): boolean;
    /**
     * Ottieni lista sub-agents potenziali per un agent
     */
    private getPotentialSubAgents;
    /**
     * FIX 5: Get Available Agents (scan filesystem)
     */
    getAvailableAgents(): Promise<string[]>;
    /**
     * FIX 6: Adaptive Complexity Threshold
     * Adatta threshold basato su disponibilità sub-agents
     */
    getAdaptiveComplexityThreshold(agentFile: string, hasSubAgents: boolean): number;
    /**
     * UTILITY: Generate Fallback Report
     */
    generateFallbackReport(): string;
    private countMappingsForDomain;
}
export { OrchestratorQuickFixer, FALLBACK_MAPPING, DOMAIN_FALLBACKS };
//# sourceMappingURL=orchestrator-quick-fixes.d.ts.map