/**
 * Advanced Analytics Engine - Real-time Performance Monitoring
 *
 * Sistema analytics avanzato per orchestration metrics con:
 * - Performance monitoring real-time
 * - Success pattern analysis & failure root cause detection
 * - Agent performance scoring & optimization recommendations
 * - Predictive analytics per performance optimization
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
import type { PluginConfig } from '../types';
/**
 * Configurazione Analytics Engine
 */
export interface AnalyticsConfig {
    /** Abilita real-time monitoring */
    enableRealTimeMonitoring: boolean;
    /** Intervallo aggiornamento metrics (ms) */
    metricsUpdateInterval: number;
    /** Dimensione buffer per historical data */
    historyBufferSize: number;
    /** Abilita predictive analytics */
    enablePredictiveAnalytics: boolean;
    /** Soglia alert per performance degradation */
    performanceAlertThreshold: number;
    /** Abilita pattern detection automatico */
    enableAutoPatternDetection: boolean;
}
/**
 * Metriche performance orchestrazione
 */
export interface OrchestrationMetrics {
    /** Timestamp metric */
    timestamp: number;
    /** Session ID */
    sessionId: string;
    /** Task type */
    taskType: string;
    /** Numero agent coinvolti */
    agentCount: number;
    /** Tempo esecuzione totale (ms) */
    totalExecutionTime: number;
    /** Success rate */
    successRate: number;
    /** Throughput (tasks/minute) */
    throughput: number;
    /** Costo totale */
    totalCost: number;
    /** Error rate */
    errorRate: number;
    /** Resource utilization */
    resourceUtilization: ResourceMetrics;
    /** Agent performance */
    agentPerformance: AgentMetrics[];
}
/**
 * Metriche risorse sistema
 */
export interface ResourceMetrics {
    /** CPU utilization (%) */
    cpuUsage: number;
    /** Memory usage (MB) */
    memoryUsage: number;
    /** Token consumption */
    tokenUsage: number;
    /** API call count */
    apiCallCount: number;
    /** Network latency (ms) */
    networkLatency: number;
}
/**
 * Metriche performance agent
 */
export interface AgentMetrics {
    /** Agent name */
    agentName: string;
    /** Agent type/expert file */
    agentType: string;
    /** Model utilizzato */
    model: string;
    /** Execution time */
    executionTime: number;
    /** Success rate */
    successRate: number;
    /** Quality score */
    qualityScore: number;
    /** Cost efficiency */
    costEfficiency: number;
    /** Error count */
    errorCount: number;
    /** Task completion rate */
    completionRate: number;
}
/**
 * Pattern analysis result
 */
export interface PatternAnalysisResult {
    /** Pattern ID */
    id: string;
    /** Pattern type */
    type: 'success' | 'failure' | 'performance' | 'cost';
    /** Pattern description */
    description: string;
    /** Confidence score (0.0-1.0) */
    confidence: number;
    /** Frequency di occorrenza */
    frequency: number;
    /** Impact score */
    impact: number;
    /** Conditions che triggrano il pattern */
    conditions: Record<string, any>;
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Root cause analysis result
 */
export interface RootCauseAnalysis {
    /** Failure ID */
    failureId: string;
    /** Primary root cause */
    primaryCause: string;
    /** Contributing factors */
    contributingFactors: string[];
    /** Confidence score */
    confidence: number;
    /** Suggested fixes */
    suggestedFixes: string[];
    /** Prevention strategies */
    preventionStrategies: string[];
    /** Similar past failures */
    similarFailures: string[];
}
/**
 * Performance prediction result
 */
export interface PerformancePrediction {
    /** Task descriptor */
    taskDescriptor: string;
    /** Predicted execution time */
    predictedExecutionTime: number;
    /** Predicted success rate */
    predictedSuccessRate: number;
    /** Predicted cost */
    predictedCost: number;
    /** Confidence interval */
    confidenceInterval: {
        min: number;
        max: number;
    };
    /** Risk factors */
    riskFactors: string[];
    /** Optimization suggestions */
    optimizationSuggestions: string[];
}
/**
 * Analytics dashboard data
 */
export interface DashboardData {
    /** Current metrics snapshot */
    currentMetrics: OrchestrationMetrics;
    /** Historical trend data */
    trendData: TrendData;
    /** Top performing agents */
    topAgents: AgentMetrics[];
    /** Detected patterns */
    patterns: PatternAnalysisResult[];
    /** Active alerts */
    alerts: PerformanceAlert[];
    /** System health score */
    healthScore: number;
}
/**
 * Trend data for dashboard
 */
export interface TrendData {
    /** Time series labels */
    labels: string[];
    /** Success rate trend */
    successRateTrend: number[];
    /** Performance trend */
    performanceTrend: number[];
    /** Cost trend */
    costTrend: number[];
    /** Throughput trend */
    throughputTrend: number[];
}
/**
 * Performance alert
 */
export interface PerformanceAlert {
    /** Alert ID */
    id: string;
    /** Alert type */
    type: 'performance' | 'cost' | 'error' | 'resource';
    /** Severity level */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Alert message */
    message: string;
    /** Timestamp */
    timestamp: number;
    /** Metric value che ha triggerato l'alert */
    triggerValue: number;
    /** Threshold superata */
    threshold: number;
    /** Suggested actions */
    suggestedActions: string[];
}
export declare class AnalyticsEngine {
    private config;
    private analyticsConfig;
    private logger;
    private metricsBuffer;
    private patternDatabase;
    private alertsActive;
    private updateTimer?;
    constructor(config: PluginConfig, analyticsConfig?: Partial<AnalyticsConfig>);
    /**
     * Registra metrics di una orchestration
     */
    recordOrchestrationMetrics(metrics: OrchestrationMetrics): void;
    /**
     * Analizza performance trends
     */
    analyzePerformanceTrends(timeWindow?: number): TrendData;
    /**
     * Esegue root cause analysis su failures
     */
    performRootCauseAnalysis(failureMetrics: OrchestrationMetrics[]): Promise<RootCauseAnalysis[]>;
    /**
     * Genera performance predictions
     */
    generatePerformancePredictions(taskDescriptors: string[]): Promise<PerformancePrediction[]>;
    /**
     * Ottiene dashboard data completo
     */
    getDashboardData(): DashboardData;
    /**
     * Avvia monitoring engine
     */
    startMonitoring(): void;
    /**
     * Ferma monitoring engine
     */
    stopMonitoring(): void;
    /**
     * Cleanup resources
     */
    dispose(): void;
    private initializeEngine;
    private initializePatternTemplates;
    private performRealTimeAnalysis;
    private checkPerformanceAlerts;
    private updateAgentScores;
    private checkResourceUtilization;
    private detectPatterns;
    private analyzeIndividualFailure;
    private predictTaskPerformance;
    private extractTaskFeatures;
    private findSimilarTasks;
    private performPeriodicAnalysis;
    private getCurrentMetrics;
    private getTopPerformingAgents;
    private getDetectedPatterns;
    private calculateSystemHealthScore;
    private aggregateAgentMetrics;
    private createEmptyTrendData;
    private createDefaultMetrics;
}
/**
 * Factory per creare AnalyticsEngine configurato
 */
export declare function createAnalyticsEngine(config: PluginConfig, analyticsConfig?: Partial<AnalyticsConfig>): AnalyticsEngine;
/**
 * Helper per creare mock metrics per testing
 */
export declare function createMockMetrics(overrides?: Partial<OrchestrationMetrics>): OrchestrationMetrics;
//# sourceMappingURL=AnalyticsEngine.d.ts.map