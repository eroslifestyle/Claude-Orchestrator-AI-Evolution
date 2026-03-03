/**
 * ORCHESTRATOR STRESS TEST SUITE V1.0
 *
 * Testa resilienza fallback system quando 50+ agent non esistono
 * Misura performance degradation, recovery time, success rate
 *
 * OBIETTIVI:
 * - Validare fallback system in scenari estremi
 * - Misurare impact su performance
 * - Identificare breaking points
 * - Documentare behavior reale vs teorico
 */
interface StressTestConfig {
    name: string;
    description: string;
    nonExistentAgents: number;
    taskComplexity: 'low' | 'medium' | 'high' | 'extreme';
    expectedFallbacks: number;
    timeoutMinutes: number;
    parallelismLevel: 1 | 2 | 3;
    targetAgents: string[];
}
interface StressTestMetrics {
    totalTimeMs: number;
    theoreticalTimeMs: number;
    degradationPercent: number;
    fallbacksTriggered: number;
    fallbackSuccessRate: number;
    averageRecoveryTimeMs: number;
    fallbackCascades: number;
    agentsAttempted: number;
    agentsExecutedSuccessfully: number;
    agentsFailed: number;
    maxParallelAgents: number;
    actualParallelism: number;
    parallelEfficiency: number;
    costImpactPercent: number;
    peakMemoryMB: number;
    agentsValidated: number;
    agentsFoundValid: number;
    agentsNotFound: number;
    validationTimeMs: number;
}
interface StressTestAnalysis {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    strengths: string[];
    weaknesses: string[];
    criticalIssues: string[];
    recommendations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
interface StressTestResult {
    config: StressTestConfig;
    metrics: StressTestMetrics;
    analysis: StressTestAnalysis;
    success: boolean;
    startTime: string;
    endTime: string;
    logs: string[];
    errors: Error[];
}
declare const STRESS_TEST_SCENARIOS: StressTestConfig[];
declare class OrchestratorStressTester {
    private logs;
    private errors;
    private agentBasePath;
    constructor();
    /**
     * Esegue tutti i test di stress configurati
     */
    runAllStressTests(): Promise<StressTestResult[]>;
    /**
     * Esegue singolo stress test
     */
    runStressTest(config: StressTestConfig): Promise<StressTestResult>;
    /**
     * PHASE 1: Valida esistenza agent files
     */
    private validateAgents;
    /**
     * PHASE 2: Simula orchestrazione con agent mancanti
     */
    private simulateOrchestration;
    /**
     * PHASE 3: Testa fallback system
     */
    private testFallbackSystem;
    /**
     * Trova agent fallback per agent mancante
     */
    private findFallbackAgent;
    /**
     * Simula esecuzione agent (per timing realistico)
     */
    private simulateAgentExecution;
    /**
     * Calcola metriche complete
     */
    private calculateMetrics;
    /**
     * Analizza risultati e genera score
     */
    private analyzeResults;
    /**
     * Crea risultato failure
     */
    private createFailureResult;
    /**
     * Print test result summary
     */
    private printTestResult;
    /**
     * Print final summary across all tests
     */
    private printFinalSummary;
    /**
     * Utility: log messaggio
     */
    private log;
}
export { OrchestratorStressTester, STRESS_TEST_SCENARIOS, type StressTestConfig, type StressTestMetrics, type StressTestAnalysis, type StressTestResult };
//# sourceMappingURL=stress-test-suite.d.ts.map