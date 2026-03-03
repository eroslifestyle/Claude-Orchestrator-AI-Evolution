/**
 * Performance Benchmarks e Validazione Target
 *
 * Suite completa per validare i target di performance del sistema:
 * - Tier 1 Fast Path: <10ms, 70% coverage
 * - Tier 2 Smart Path: <50ms, 95% coverage
 * - Tier 3 Deep Path: <2s, 100% coverage
 * - Memory Usage: <100MB
 * - Cache Hit Rate: >80%
 * - Throughput: >100 req/sec
 *
 * @version 1.0 - Complete Performance Validation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
interface PerformanceTarget {
    name: string;
    target: number;
    unit: string;
    operator: '<' | '>' | '=' | '<=' | '>=';
    description: string;
}
declare const PERFORMANCE_TARGETS: PerformanceTarget[];
interface BenchmarkResult {
    name: string;
    value: number;
    unit: string;
    target: number;
    passed: boolean;
    details: any;
    percentile?: string;
}
interface PerformanceReport {
    timestamp: string;
    totalTestDuration: number;
    systemSpecs: SystemSpecs;
    results: BenchmarkResult[];
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
        passRate: number;
    };
    recommendations: string[];
}
interface SystemSpecs {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuModel: string;
    totalMemory: number;
    freeMemory: number;
}
declare class PerformanceBenchmarks {
    private results;
    private startTime;
    constructor();
    benchmarkFastPathPerformance(): Promise<BenchmarkResult[]>;
    benchmarkSmartPathPerformance(): Promise<BenchmarkResult[]>;
    benchmarkAnalysisEnginePerformance(): Promise<BenchmarkResult[]>;
    benchmarkMemoryUsage(): Promise<BenchmarkResult[]>;
    benchmarkThroughput(): Promise<BenchmarkResult[]>;
    benchmarkCachePerformance(): Promise<BenchmarkResult[]>;
    benchmarkOrchestratorIntegration(): Promise<BenchmarkResult[]>;
    runAllBenchmarks(): Promise<PerformanceReport>;
    private generatePerformanceReport;
    private displayResults;
    exportResults(report: PerformanceReport, filePath?: string): Promise<void>;
}
export { PerformanceBenchmarks, type PerformanceReport, type BenchmarkResult, type PerformanceTarget, PERFORMANCE_TARGETS };
//# sourceMappingURL=performance-benchmarks.d.ts.map