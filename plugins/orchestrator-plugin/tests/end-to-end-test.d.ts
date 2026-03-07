/**
 * End-to-End Test del Sistema Completo
 *
 * Testa l'integrazione completa:
 * - Analysis Engine 3-Tier
 * - OrchestratorV60 Enhanced
 * - Parallelismo Multi-Livello
 * - AI-based Routing
 * - Performance Monitoring
 *
 * @version 1.0 - Complete System Test
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
interface TestScenario {
    name: string;
    request: string;
    expectedDomains: string[];
    expectedComplexity: 'bassa' | 'media' | 'alta' | 'extreme';
    expectedAgentCount: number;
    description: string;
}
declare const testScenarios: TestScenario[];
declare class AnalysisEngineTests {
    private analysisEngine;
    constructor();
    runIndividualTests(): Promise<void>;
    private validateExpectations;
    private mapComplexityLevel;
}
declare class OrchestratorEnhancedTests {
    private orchestrator;
    constructor();
    runOrchestratorTests(): Promise<void>;
    private testOrchestratorAnalysisAndRouting;
    private validateRoutingResults;
}
declare class IntegrationTests {
    runFullIntegrationTest(): Promise<void>;
    private validatePerformanceTargets;
}
declare function runCompleteTestSuite(): Promise<void>;
export { runCompleteTestSuite, AnalysisEngineTests, OrchestratorEnhancedTests, IntegrationTests, testScenarios };
//# sourceMappingURL=end-to-end-test.d.ts.map