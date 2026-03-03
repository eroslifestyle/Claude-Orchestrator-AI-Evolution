/**
 * SerenaIntegrationTest - Comprehensive Testing Suite
 *
 * Implementazione Tester Expert per comprehensive validation
 * della Serena Search Engine integration nel Claude Code Orchestrator.
 *
 * @version 1.0 - Serena Integration Testing (T7)
 * @author Tester Expert Agent
 * @date 30 Gennaio 2026
 */
interface TestSuite {
    suiteId: string;
    name: string;
    description: string;
    category: 'unit' | 'integration' | 'performance' | 'e2e';
    tests: TestCase[];
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
}
interface TestCase {
    testId: string;
    name: string;
    description: string;
    category: 'functionality' | 'performance' | 'reliability' | 'usability';
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeout: number;
    retries: number;
    setup?: () => Promise<void>;
    execute: () => Promise<TestResult>;
    teardown?: () => Promise<void>;
    dependencies: string[];
}
interface TestResult {
    testId: string;
    success: boolean;
    executionTime: number;
    assertions: AssertionResult[];
    performance: PerformanceTestResult;
    coverage: CoverageResult;
    errors: TestError[];
    warnings: TestWarning[];
    metadata: TestMetadata;
}
interface AssertionResult {
    assertionId: string;
    description: string;
    passed: boolean;
    expected: any;
    actual: any;
    message: string;
    stackTrace?: string;
}
interface PerformanceTestResult {
    searchTime: number;
    routingTime: number;
    analyticsTime: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
    latency: number;
    errorRate: number;
}
interface CoverageResult {
    linesCovered: number;
    totalLines: number;
    functionscovered: number;
    totalFunctions: number;
    branchesCovered: number;
    totalBranches: number;
    coveragePercent: number;
    uncoveredAreas: UncoveredArea[];
}
interface UncoveredArea {
    file: string;
    startLine: number;
    endLine: number;
    reason: string;
}
interface TestError {
    errorType: 'assertion' | 'timeout' | 'exception' | 'setup' | 'teardown';
    message: string;
    stackTrace: string;
    timestamp: Date;
    context: any;
}
interface TestWarning {
    warningType: 'performance' | 'deprecation' | 'compatibility' | 'best_practice';
    message: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
}
interface TestMetadata {
    environment: TestEnvironment;
    configuration: TestConfiguration;
    dependencies: TestDependency[];
    tags: string[];
    author: string;
    createdAt: Date;
    lastModified: Date;
}
interface TestEnvironment {
    os: string;
    nodeVersion: string;
    memoryAvailable: number;
    cpuCores: number;
    diskSpace: number;
}
interface TestConfiguration {
    serenaEnabled: boolean;
    searchOptimization: boolean;
    analyticsEnabled: boolean;
    performanceMonitoring: boolean;
    debugMode: boolean;
    mockMode: boolean;
}
interface TestDependency {
    name: string;
    version: string;
    type: 'runtime' | 'devtime' | 'test';
    optional: boolean;
}
interface TestExecutionReport {
    reportId: string;
    executionId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    suiteResults: TestSuiteResult[];
    overallResults: OverallTestResults;
    performanceBenchmarks: PerformanceBenchmark[];
    coverageReport: CoverageReport;
    regressionReport: RegressionReport;
    recommendations: TestRecommendation[];
    environment: TestEnvironment;
}
interface TestSuiteResult {
    suiteId: string;
    name: string;
    passed: boolean;
    testResults: TestResult[];
    setupTime: number;
    teardownTime: number;
    totalTime: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
}
interface OverallTestResults {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: number;
    averageExecutionTime: number;
    performanceScore: number;
    reliabilityScore: number;
    qualityScore: number;
}
interface PerformanceBenchmark {
    benchmarkId: string;
    name: string;
    category: 'search' | 'routing' | 'analytics' | 'optimization' | 'dashboard';
    baseline: number;
    current: number;
    improvement: number;
    target: number;
    status: 'exceeded' | 'met' | 'missed';
    unit: string;
}
interface CoverageReport {
    overallCoverage: number;
    componentCoverage: ComponentCoverage[];
    fileCoverage: FileCoverage[];
    recommendations: CoverageRecommendation[];
    trends: CoverageTrend[];
}
interface ComponentCoverage {
    componentName: string;
    coverage: number;
    linesTotal: number;
    linesCovered: number;
    functionsTotal: number;
    functionsCovered: number;
    criticalPaths: CriticalPath[];
}
interface FileCoverage {
    fileName: string;
    filePath: string;
    coverage: number;
    linesTotal: number;
    linesCovered: number;
    uncoveredLines: number[];
    complexity: number;
}
interface CriticalPath {
    pathName: string;
    description: string;
    covered: boolean;
    importance: 'low' | 'medium' | 'high' | 'critical';
    testCases: string[];
}
interface CoverageRecommendation {
    type: 'add_tests' | 'improve_existing' | 'remove_dead_code';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact: number;
    effort: 'low' | 'medium' | 'high';
    files: string[];
}
interface CoverageTrend {
    period: string;
    coverage: number;
    change: number;
    direction: 'improving' | 'degrading' | 'stable';
}
interface RegressionReport {
    hasRegressions: boolean;
    regressions: Regression[];
    performanceChanges: PerformanceChange[];
    compatibilityIssues: CompatibilityIssue[];
    recommendations: RegressionRecommendation[];
}
interface Regression {
    type: 'functionality' | 'performance' | 'api' | 'behavior';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedTests: string[];
    introducedBy: string;
    impact: string;
    fix: string;
}
interface PerformanceChange {
    metric: string;
    baseline: number;
    current: number;
    change: number;
    acceptable: boolean;
    threshold: number;
    impact: string;
}
interface CompatibilityIssue {
    component: string;
    issueType: 'breaking_change' | 'deprecation' | 'version_conflict';
    description: string;
    severity: 'low' | 'medium' | 'high';
    workaround: string;
    timeline: string;
}
interface RegressionRecommendation {
    action: 'fix_immediately' | 'investigate' | 'monitor' | 'accept_risk';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timeline: string;
    responsible: string;
    dependencies: string[];
}
interface TestRecommendation {
    category: 'coverage' | 'performance' | 'reliability' | 'maintainability';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    expectedBenefit: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    resources: string[];
}
export declare class SerenaIntegrationTest {
    private testSuites;
    private mockConfig;
    private mockLogger;
    private testResults;
    private benchmarkResults;
    constructor();
    /**
     * Execute comprehensive Serena integration test suite
     */
    executeComprehensiveTests(): Promise<TestExecutionReport>;
    /**
     * Execute specific test suite
     */
    private executeTestSuite;
    /**
     * Execute individual test case
     */
    private executeTestCase;
    private registerTestSuites;
    private registerSerenaSearchTests;
    private registerKeywordExtractorTests;
    private registerSmartRouterTests;
    private registerAnalyticsTests;
    private registerPerformanceTests;
    private registerDashboardTests;
    private registerE2ETests;
    private createBasicSearchTest;
    private createPatternSearchTest;
    private createBatchSearchTest;
    private createCachingTest;
    private createPerformanceTest;
    private createFailoverTest;
    private createSemanticExtractionTest;
    private createCodePatternTest;
    private createCrossFileAnalysisTest;
    private createConfidenceCalculationTest;
    private createRoutingDecisionTest;
    private createLoadBalancingTest;
    private createFailoverRoutingTest;
    private createPerformancePredictionTest;
    private createPatternAnalysisTest;
    private createAnomalyDetectionTest;
    private createPredictiveAnalyticsTest;
    private createReportGenerationTest;
    private createOptimizationExecutionTest;
    private createBenchmarkingTest;
    private createResourceOptimizationTest;
    private createCostOptimizationTest;
    private createDashboardInitializationTest;
    private createSearchInterfaceTest;
    private createAnalyticsVisualizationTest;
    private createUserInteractionTest;
    private createCompleteWorkflowTest;
    private createMultiUserTest;
    private createStressTest;
    private createRecoveryTest;
    private runPerformanceBenchmarks;
    private initializeTestEnvironment;
    private setupTestEnvironment;
    private teardownTestEnvironment;
    private createMockSerenaIntegration;
    private assert;
    private createSuccessTestResult;
    private createMockTestCase;
    private getEmptyPerformanceResult;
    private getEmptyCoverageResult;
    private createTestMetadata;
    private getTestEnvironment;
    private calculateOverallResults;
    private generateCoverageReport;
    private analyzeRegressions;
    private generateTestRecommendations;
    private generateExecutionId;
    private generateReportId;
    getTestSuites(): Map<string, TestSuite>;
    getTestResults(): Map<string, TestResult>;
    getBenchmarkResults(): PerformanceBenchmark[];
    runSpecificSuite(suiteId: string): Promise<TestSuiteResult>;
    runSpecificTest(testId: string): Promise<TestResult>;
}
export declare function createSerenaIntegrationTest(): SerenaIntegrationTest;
export type { TestSuite, TestCase, TestResult, TestExecutionReport, PerformanceBenchmark, CoverageReport, RegressionReport };
//# sourceMappingURL=SerenaIntegrationTest.d.ts.map