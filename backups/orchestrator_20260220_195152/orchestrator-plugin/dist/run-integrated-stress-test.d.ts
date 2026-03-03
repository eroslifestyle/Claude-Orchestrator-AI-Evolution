/**
 * INTEGRATED STRESS TEST RUNNER
 *
 * Esegue stress test completo con TUTTE le regole implementate:
 * 1. REGOLA PARALLELA: Esecuzione simultanea multi-agent multi-task
 * 2. REGOLA CONTEXT CLEAR: Clear conversazione prima di ogni agent
 * 3. REGOLA VISUALIZZAZIONE: Messaggi completi di tutto il lavoro
 *
 * @version 1.0
 * @date 2026-02-03
 */
interface StressTestConfig {
    totalTasks: number;
    maxConcurrentAgents: number;
    taskDurationMs: {
        min: number;
        max: number;
    };
    failureRate: number;
    withDependencies: boolean;
    dependencyProbability: number;
    verbose: boolean;
}
declare const DEFAULT_CONFIG: StressTestConfig;
export declare function runIntegratedStressTest(userConfig?: Partial<StressTestConfig>): Promise<{
    success: boolean;
    metrics: any;
    errors: Error[];
}>;
export { StressTestConfig, DEFAULT_CONFIG };
//# sourceMappingURL=run-integrated-stress-test.d.ts.map