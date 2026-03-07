/**
 * SearchPoweredAnalytics - ML Analytics Engine con Serena Intelligence
 *
 * Implementazione AI Integration Expert per revolutionary analytics capabilities
 * basate su search pattern learning e real-time intelligence optimization.
 *
 * @version 2.0 - Serena Search Intelligence Integration
 * @author AI Integration Expert Agent (T4)
 * @date 30 Gennaio 2026
 */
import type { TaskResult } from '../types';
import { PluginLogger } from '../utils/logger';
interface SerenaSearchResult {
    pattern: string;
    searchTime: number;
    totalMatches: number;
    matches: Array<{
        filePath: string;
        lineNumber: number;
        matchingLine: string;
        contextBefore: string[];
        contextAfter: string[];
        confidence: number;
    }>;
}
interface SerenaPerformanceMetrics {
    searchTime: number;
    cacheHitRate: number;
    patternAccuracy: number;
    failoverRate: number;
    throughput: number;
    lastOptimization: Date;
}
declare class SerenaSearchIntegration {
    search(_params: any): Promise<SerenaSearchResult>;
    batchSearch(_params: any[]): Promise<SerenaSearchResult[]>;
    getMetrics(): SerenaPerformanceMetrics;
}
import { SmartAgentRouter } from '../routing/SmartAgentRouter';
import { EnhancedKeywordExtractor } from '../analysis/EnhancedKeywordExtractor';
interface SearchPatternAnalytics {
    patternFrequency: Record<string, number>;
    patternSuccessRate: Record<string, number>;
    patternPerformance: Record<string, PerformanceMetrics>;
    patternEvolution: PatternEvolution[];
    semanticClusters: SemanticCluster[];
    predictivePatterns: PredictivePattern[];
}
interface PerformanceMetrics {
    averageTime: number;
    successRate: number;
    qualityScore: number;
    costEfficiency: number;
    userSatisfaction: number;
    variance: number;
}
interface PatternEvolution {
    pattern: string;
    timeWindow: TimeWindow;
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
    emergingVariations: string[];
    deprecationRisk: number;
}
interface TimeWindow {
    start: Date;
    end: Date;
    duration: string;
    sampleSize: number;
}
interface SemanticCluster {
    centroid: string;
    members: string[];
    coherenceScore: number;
    businessValue: number;
    recommendedUsage: string;
    alternatives: string[];
}
interface PredictivePattern {
    inputPattern: string;
    predictedOutcome: string;
    accuracy: number;
    confidence: number;
    leadTime: number;
    actionableInsights: string[];
}
interface CodebaseIntelligence {
    complexityTrends: ComplexityTrend[];
    hotspotAnalysis: HotspotAnalysis;
    qualityMetrics: QualityMetrics;
    dependencyHealth: DependencyHealth;
    technicalDebtTracking: TechnicalDebtTracking;
    performanceInsights: CodebasePerformanceInsights;
}
interface ComplexityTrend {
    metric: 'cyclomatic' | 'cognitive' | 'dependency' | 'file_size';
    currentValue: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
    projectedValue: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
}
interface HotspotAnalysis {
    mostChangedFiles: FileChangeHotspot[];
    mostComplexFiles: FileComplexityHotspot[];
    dependencyHotspots: DependencyHotspot[];
    errorProneAreas: ErrorProneArea[];
    bottleneckFiles: BottleneckFile[];
}
interface FileChangeHotspot {
    filePath: string;
    changeFrequency: number;
    lastChanged: Date;
    changeType: 'bug_fix' | 'feature' | 'refactor' | 'mixed';
    riskScore: number;
    contributors: string[];
}
interface FileComplexityHotspot {
    filePath: string;
    complexityScore: number;
    lineCount: number;
    functionCount: number;
    maintainabilityIndex: number;
    technicalDebt: number;
}
interface DependencyHotspot {
    filePath: string;
    incomingDependencies: number;
    outgoingDependencies: number;
    cyclicDependencies: string[];
    instabilityIndex: number;
    changeImpact: number;
}
interface ErrorProneArea {
    location: string;
    errorRate: number;
    errorTypes: Record<string, number>;
    lastIncident: Date;
    affectedUsers: number;
    mitigationStrategies: string[];
}
interface BottleneckFile {
    filePath: string;
    performanceImpact: number;
    executionTime: number;
    memoryUsage: number;
    optimizationPotential: number;
    suggestedOptimizations: string[];
}
interface QualityMetrics {
    overallQuality: number;
    codeSmells: CodeSmellMetrics;
    testCoverage: TestCoverageMetrics;
    documentationQuality: DocumentationMetrics;
    codeConsistency: ConsistencyMetrics;
    securityScore: SecurityMetrics;
}
interface CodeSmellMetrics {
    totalSmells: number;
    smellsByType: Record<string, number>;
    smellDensity: number;
    criticalSmells: number;
    trendOverTime: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
}
interface TestCoverageMetrics {
    lineCoverage: number;
    branchCoverage: number;
    functionCoverage: number;
    uncoveredCriticalPaths: string[];
    testQuality: number;
    testMaintainability: number;
}
interface DocumentationMetrics {
    apiDocumentationCoverage: number;
    codeCommentDensity: number;
    readmeQuality: number;
    outdatedDocumentation: string[];
    missingDocumentation: string[];
    documentationConsistency: number;
}
interface ConsistencyMetrics {
    namingConsistency: number;
    codeStyleConsistency: number;
    architecturalConsistency: number;
    inconsistentAreas: InconsistentArea[];
    styleViolations: StyleViolation[];
}
interface InconsistentArea {
    area: string;
    inconsistencyType: 'naming' | 'style' | 'architecture';
    severity: 'low' | 'medium' | 'high';
    affectedFiles: string[];
    suggestedStandard: string;
}
interface StyleViolation {
    rule: string;
    count: number;
    locations: ViolationLocation[];
    autoFixable: boolean;
    priority: 'low' | 'medium' | 'high';
}
interface ViolationLocation {
    file: string;
    line: number;
    column: number;
    severity: 'info' | 'warning' | 'error';
    message: string;
}
interface SecurityMetrics {
    vulnerabilityCount: number;
    vulnerabilityTypes: Record<string, number>;
    securityScore: number;
    criticalVulnerabilities: number;
    securityTrend: 'improving' | 'degrading' | 'stable';
    lastSecurityAudit: Date;
}
interface DependencyHealth {
    outdatedDependencies: OutdatedDependency[];
    vulnerableDependencies: VulnerableDependency[];
    unusedDependencies: string[];
    dependencyConflicts: DependencyConflict[];
    licenseCompliance: LicenseCompliance;
    dependencyGraphHealth: DependencyGraphHealth;
}
interface OutdatedDependency {
    name: string;
    currentVersion: string;
    latestVersion: string;
    versionsbehind: number;
    updateRisk: 'low' | 'medium' | 'high';
    securityImplications: string[];
}
interface VulnerableDependency {
    name: string;
    version: string;
    vulnerabilityId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    fixedInVersion: string;
    exploitability: number;
}
interface DependencyConflict {
    dependency1: string;
    dependency2: string;
    conflictType: 'version' | 'license' | 'functionality';
    resolution: string;
    impact: 'low' | 'medium' | 'high';
}
interface LicenseCompliance {
    compatibleLicenses: string[];
    incompatibleLicenses: string[];
    unknownLicenses: string[];
    complianceRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
}
interface DependencyGraphHealth {
    graphComplexity: number;
    circularDependencies: number;
    maxDepth: number;
    fanIn: Record<string, number>;
    fanOut: Record<string, number>;
    stability: number;
}
interface TechnicalDebtTracking {
    totalDebt: TechnicalDebtSummary;
    debtByCategory: Record<string, number>;
    debtHotspots: TechnicalDebtHotspot[];
    debtTrends: TechnicalDebtTrend[];
    debtImpact: TechnicalDebtImpact;
    remediationPlan: RemediationPlan;
}
interface TechnicalDebtSummary {
    totalHours: number;
    totalCost: number;
    debtRatio: number;
    interestRate: number;
    payoffTime: number;
}
interface TechnicalDebtHotspot {
    location: string;
    debtHours: number;
    debtType: 'code_duplication' | 'complexity' | 'documentation' | 'testing' | 'architecture';
    priority: 'low' | 'medium' | 'high' | 'critical';
    remediationEffort: number;
    businessImpact: number;
}
interface TechnicalDebtTrend {
    timeWindow: TimeWindow;
    debtAdded: number;
    debtRemoved: number;
    netChange: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    velocity: number;
}
interface TechnicalDebtImpact {
    developmentVelocity: number;
    bugRate: number;
    maintenanceCost: number;
    teamMorale: number;
    customerSatisfaction: number;
}
interface RemediationPlan {
    prioritizedItems: PrioritizedDebtItem[];
    sprintRecommendations: SprintRecommendation[];
    resourceAllocation: ResourceAllocation;
    riskMitigation: RiskMitigation[];
    successMetrics: SuccessMetric[];
}
interface PrioritizedDebtItem {
    item: TechnicalDebtHotspot;
    priority: number;
    roi: number;
    dependencies: string[];
    blockers: string[];
    estimatedBenefit: EstimatedBenefit;
}
interface EstimatedBenefit {
    velocityImprovement: number;
    bugReduction: number;
    maintenanceReduction: number;
    qualityImprovement: number;
    teamSatisfactionIncrease: number;
}
interface SprintRecommendation {
    sprintNumber: number;
    recommendedItems: string[];
    effortRequired: number;
    expectedOutcome: string;
    riskLevel: 'low' | 'medium' | 'high';
    dependencies: string[];
}
interface ResourceAllocation {
    totalEffortRequired: number;
    recommendedTeamSize: number;
    skillsRequired: string[];
    timeframef: number;
    budgetRequired: number;
    externalResourcesNeeded: string[];
}
interface RiskMitigation {
    risk: string;
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
    contingency: string;
    owner: string;
}
interface SuccessMetric {
    metric: string;
    baseline: number;
    target: number;
    measurementMethod: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    responsibility: string;
}
interface CodebasePerformanceInsights {
    performanceHotspots: PerformanceHotspot[];
    memoryUsagePatterns: MemoryUsagePattern[];
    cpuUtilizationTrends: CPUUtilizationTrend[];
    networkPerformance: NetworkPerformance;
    databasePerformance: DatabasePerformance;
    cacheEfficiency: CacheEfficiency;
}
interface PerformanceHotspot {
    location: string;
    performanceImpact: number;
    averageExecutionTime: number;
    callFrequency: number;
    optimizationPotential: number;
    recommendedOptimizations: string[];
}
interface MemoryUsagePattern {
    component: string;
    memoryUsage: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    leakSuspicion: number;
    optimizationOpportunities: string[];
}
interface CPUUtilizationTrend {
    timeWindow: TimeWindow;
    averageUtilization: number;
    peakUtilization: number;
    utilizationTrend: 'increasing' | 'decreasing' | 'stable';
    bottleneckFunctions: string[];
}
interface NetworkPerformance {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    timeouts: number;
    networkBottlenecks: string[];
}
interface DatabasePerformance {
    queryPerformance: QueryPerformance[];
    connectionPoolHealth: ConnectionPoolHealth;
    indexEfficiency: IndexEfficiency[];
    transactionMetrics: TransactionMetrics;
}
interface QueryPerformance {
    query: string;
    averageExecutionTime: number;
    executionFrequency: number;
    performanceRank: number;
    optimizationRecommendations: string[];
}
interface ConnectionPoolHealth {
    poolSize: number;
    activeConnections: number;
    connectionUtilization: number;
    connectionLeaks: number;
    recommendedPoolSize: number;
}
interface IndexEfficiency {
    indexName: string;
    utilizationRate: number;
    performanceImpact: number;
    maintenanceCost: number;
    recommendation: 'keep' | 'optimize' | 'remove';
}
interface TransactionMetrics {
    averageTransactionTime: number;
    transactionThroughput: number;
    rollbackRate: number;
    deadlockCount: number;
    optimizationOpportunities: string[];
}
interface CacheEfficiency {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    cacheSize: number;
    optimalCacheSize: number;
    cacheOptimizations: string[];
}
interface RealTimeIntelligence {
    currentPerformance: CurrentPerformanceSnapshot;
    anomalyDetection: AnomalyDetection;
    predictiveAlerts: PredictiveAlert[];
    adaptiveRecommendations: AdaptiveRecommendation[];
    systemHealth: SystemHealthIndicator;
    intelligentNotifications: IntelligentNotification[];
}
interface CurrentPerformanceSnapshot {
    timestamp: Date;
    searchPerformance: SerenaPerformanceMetrics;
    agentPerformance: Record<string, number>;
    systemLoad: SystemLoad;
    userActivity: UserActivity;
    qualityMetrics: Record<string, number>;
}
interface SystemLoad {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
    activeProcesses: number;
}
interface UserActivity {
    activeUsers: number;
    requestsPerMinute: number;
    averageSessionDuration: number;
    mostUsedFeatures: string[];
    errorEncounters: number;
}
interface AnomalyDetection {
    detectedAnomalies: DetectedAnomaly[];
    anomalyScore: number;
    baselineVariance: number;
    suspiciousPatterns: SuspiciousPattern[];
    confidenceLevel: number;
}
interface DetectedAnomaly {
    type: 'performance' | 'usage' | 'error' | 'security' | 'resource';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    firstDetected: Date;
    frequency: number;
    affectedComponents: string[];
    possibleCauses: string[];
    recommendedActions: string[];
}
interface SuspiciousPattern {
    pattern: string;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    evidence: string[];
    monitoring: boolean;
}
interface PredictiveAlert {
    alertId: string;
    predictedIssue: string;
    probability: number;
    estimatedTimeToOccurrence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    preventionActions: string[];
    monitoringMetrics: string[];
}
interface AdaptiveRecommendation {
    recommendationId: string;
    type: 'optimization' | 'prevention' | 'enhancement' | 'maintenance';
    description: string;
    confidence: number;
    expectedBenefit: string;
    implementationEffort: 'low' | 'medium' | 'high';
    priority: number;
    dependencies: string[];
    timeline: string;
}
interface SystemHealthIndicator {
    overallHealth: number;
    healthTrend: 'improving' | 'degrading' | 'stable';
    criticalIssues: number;
    riskFactors: string[];
    healthByCategory: Record<string, number>;
    nextHealthCheck: Date;
}
interface IntelligentNotification {
    notificationId: string;
    type: 'alert' | 'recommendation' | 'insight' | 'achievement';
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    relevance: number;
    actionable: boolean;
    suggestedActions: string[];
    expiresAt: Date;
}
export declare class SearchPoweredAnalytics {
    private logger;
    private serenaIntegration;
    private smartRouter;
    private enhancedExtractor;
    private searchPatterns;
    private codebaseIntelligence;
    private realTimeIntelligence;
    private historicalData;
    private predictionModels;
    private anomalyDetectors;
    constructor(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, smartRouter: SmartAgentRouter, enhancedExtractor: EnhancedKeywordExtractor);
    /**
     * Analyze search patterns for intelligence insights
     */
    analyzeSearchPatterns(searchResults: SerenaSearchResult[], taskResults: TaskResult[]): Promise<SearchPatternAnalytics>;
    /**
     * Comprehensive codebase intelligence analysis
     */
    analyzeCodebaseIntelligence(): Promise<CodebaseIntelligence>;
    /**
     * Real-time intelligence monitoring and prediction
     */
    updateRealTimeIntelligence(): Promise<RealTimeIntelligence>;
    private calculatePatternPerformance;
    private calculatePatternSuccessRate;
    private analyzePatternEvolution;
    private generateSemanticClusters;
    private identifyPredictivePatterns;
    private analyzeComplexityTrends;
    private performHotspotAnalysis;
    private analyzeQualityMetrics;
    private analyzeDependencyHealth;
    private trackTechnicalDebt;
    private gatherPerformanceInsights;
    private capturePerformanceSnapshot;
    private detectAnomalies;
    private generatePredictiveAlerts;
    private generateAdaptiveRecommendations;
    private assessSystemHealth;
    private generateIntelligentNotifications;
    private startRealTimeAnalytics;
    private initializeCodebaseIntelligence;
    private initializeRealTimeIntelligence;
    private generateTimeKey;
    private getPatternHistory;
    private calculateUsageTrend;
    private calculatePerformanceTrend;
    private identifyPatternVariations;
    private calculateDeprecationRisk;
    private clusterPatternsBySemantic;
    private calculateClusterCoherence;
    private estimateBusinessValue;
    private generateUsageRecommendation;
    private findAlternativePatterns;
    private calculatePredictionAccuracy;
    private inferOutcome;
    private calculateLeadTime;
    private generateActionableInsights;
    private getHistoricalComplexity;
    private calculateTrend;
    private assessComplexityRisk;
    private generateComplexityRecommendations;
    private identifyMostChangedFiles;
    private identifyMostComplexFiles;
    private identifyDependencyHotspots;
    private identifyErrorProneAreas;
    private identifyBottleneckFiles;
    private calculateOverallQuality;
    private analyzeCodeSmells;
    private analyzeTestCoverage;
    private analyzeDocumentationQuality;
    private analyzeCodeConsistency;
    private analyzeSecurityMetrics;
    private identifyOutdatedDependencies;
    private identifyVulnerableDependencies;
    private identifyUnusedDependencies;
    private identifyDependencyConflicts;
    private analyzeLicenseCompliance;
    private analyzeDependencyGraphHealth;
    private calculateTechnicalDebt;
    private identifyDebtHotspots;
    private analyzeDebtTrends;
    private calculateDebtImpact;
    private createRemediationPlan;
    private identifyPerformanceHotspots;
    private analyzeMemoryUsagePatterns;
    private analyzeCPUTrends;
    private analyzeNetworkPerformance;
    private analyzeDatabasePerformance;
    private analyzeCacheEfficiency;
    private getCurrentAgentPerformance;
    private getCurrentSystemLoad;
    private getCurrentUserActivity;
    private getCurrentQualityMetrics;
    private getPerformanceBaseline;
    private identifyAnomalies;
    private identifySuspiciousPatterns;
    private calculateAnomalyScore;
    private calculateBaselineVariance;
    private calculateDetectionConfidence;
    private analyzeCurrentTrends;
    private generateAlertId;
    private mapRiskToSeverity;
    private gatherRecommendationContext;
    private identifyOptimizationOpportunities;
    private generateRecommendationId;
    private gatherHealthMetrics;
    private calculateOverallHealth;
    private calculateHealthTrend;
    private countCriticalIssues;
    private identifyRiskFactors;
    private calculateCategoryHealth;
    private gatherNotificationContext;
    private identifyRelevantEvents;
    private generateNotificationId;
    private calculateQualityScore;
    private calculateUserSatisfaction;
    private calculateVariance;
    getSearchPatternAnalytics(): Map<string, SearchPatternAnalytics>;
    getCodebaseIntelligence(): CodebaseIntelligence;
    getRealTimeIntelligence(): RealTimeIntelligence;
    generateAnalyticsReport(): Promise<{
        searchPatterns: SearchPatternAnalytics;
        codebaseIntelligence: CodebaseIntelligence;
        realTimeIntelligence: RealTimeIntelligence;
        executiveSummary: string;
    }>;
    private generateExecutiveSummary;
    private generateTopRecommendation;
}
export declare function createSearchPoweredAnalytics(logger: PluginLogger, serenaIntegration: SerenaSearchIntegration, smartRouter: SmartAgentRouter, enhancedExtractor: EnhancedKeywordExtractor): SearchPoweredAnalytics;
export type { SearchPatternAnalytics, CodebaseIntelligence, RealTimeIntelligence, PerformanceMetrics, TechnicalDebtTracking, QualityMetrics };
//# sourceMappingURL=SearchPoweredAnalytics.d.ts.map