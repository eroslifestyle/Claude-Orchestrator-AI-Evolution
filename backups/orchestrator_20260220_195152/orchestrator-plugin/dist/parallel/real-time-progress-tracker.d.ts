/**
 * REAL-TIME PROGRESS TRACKER V7.0
 *
 * Sistema avanzato per tracking real-time del progresso con:
 * - Live metrics streaming
 * - Performance analytics in tempo reale
 * - Predictive completion estimations
 * - Interactive dashboard integration
 * - Multi-level progress visualization
 *
 * @author Livello 5 Progress Expert
 * @version 7.0.0-realtime
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { Task, TaskResult } from '../types';
import type { ExecutionBatch, ExecutionMetrics, ResourceUtilization } from './parallel-execution-engine';
export interface RealTimeProgressConfig {
    updateIntervalMs: number;
    metricsRetentionPeriod: number;
    predictionWindowMs: number;
    alertThresholds: ProgressAlertThresholds;
    visualizationConfig: VisualizationConfig;
    streamingConfig: StreamingConfig;
}
export interface ProgressAlertThresholds {
    slowTaskThreshold: number;
    errorRateThreshold: number;
    resourceUsageThreshold: number;
    estimationDeviationThreshold: number;
}
export interface VisualizationConfig {
    enableLiveCharts: boolean;
    chartUpdateInterval: number;
    maxDataPoints: number;
    enableHeatmap: boolean;
    enableGanttView: boolean;
}
export interface StreamingConfig {
    enableWebSocket: boolean;
    webSocketPort: number;
    enableServerSentEvents: boolean;
    maxConcurrentConnections: number;
}
export interface RealTimeUpdate {
    timestamp: Date;
    sessionId: string;
    updateType: ProgressUpdateType;
    data: ProgressUpdateData;
    metrics: LiveMetrics;
    predictions: ProgressPredictions;
    alerts: ProgressAlert[];
}
export type ProgressUpdateType = 'task_started' | 'task_progress' | 'task_completed' | 'batch_started' | 'batch_completed' | 'milestone_reached' | 'alert_triggered' | 'metrics_updated';
export interface ProgressUpdateData {
    taskId?: string;
    batchId?: string;
    progress?: number;
    status?: string;
    details?: Record<string, any>;
    duration?: number;
    success?: boolean;
    tasksCount?: number;
    tasksCompleted?: number;
    type?: string;
    [key: string]: any;
}
export interface LiveMetrics {
    execution: ExecutionMetrics;
    performance: PerformanceMetrics;
    resource: ResourceMetrics;
    quality: QualityMetrics;
    temporal: TemporalMetrics;
}
export interface PerformanceMetrics {
    tasksPerSecond: number;
    averageTaskDuration: number;
    medianTaskDuration: number;
    p95TaskDuration: number;
    throughputTrend: TrendData[];
    efficiencyScore: number;
    bottleneckAnalysis: BottleneckInfo[];
}
export interface ResourceMetrics {
    current: ResourceUtilization;
    peak: ResourceUtilization;
    average: ResourceUtilization;
    trends: ResourceTrends;
    predictions: ResourcePredictions;
    efficiency: ResourceEfficiencyMetrics;
}
export interface QualityMetrics {
    successRate: number;
    errorRate: number;
    retryRate: number;
    qualityScore: number;
    issuesDetected: number;
    qualityTrends: QualityTrendData[];
}
export interface TemporalMetrics {
    totalElapsedTime: number;
    estimatedRemainingTime: number;
    estimatedCompletionTime: Date;
    scheduleDeviation: number;
    timelineAccuracy: number;
    milestones: MilestoneProgress[];
}
export interface TrendData {
    timestamp: Date;
    value: number;
    trend: 'up' | 'down' | 'stable';
    changeRate: number;
}
export interface BottleneckInfo {
    type: 'cpu' | 'memory' | 'network' | 'dependency' | 'coordination';
    severity: 'low' | 'medium' | 'high' | 'critical';
    location: string;
    impact: number;
    suggestion: string;
}
export interface ResourceTrends {
    memory: TrendData[];
    cpu: TrendData[];
    tokens: TrendData[];
    cost: TrendData[];
}
export interface ResourcePredictions {
    peakMemoryPrediction: number;
    peakCpuPrediction: number;
    totalCostPrediction: number;
    resourceExhaustionRisk: number;
    recommendations?: string[];
    [key: string]: any;
}
export interface ResourceEfficiencyMetrics {
    memoryEfficiency: number;
    cpuEfficiency: number;
    costEfficiency: number;
    overallEfficiency: number;
}
export interface QualityTrendData {
    timestamp: Date;
    successRate: number;
    errorRate: number;
    qualityScore: number;
}
export interface MilestoneProgress {
    id: string;
    name: string;
    targetProgress: number;
    actualProgress: number;
    estimatedCompletion: Date;
    status: 'pending' | 'active' | 'completed' | 'delayed';
}
export interface ProgressPredictions {
    completionTime: CompletionPrediction;
    resource: ResourcePredictions;
    quality: QualityPrediction;
    risks: RiskPrediction[];
}
export interface CompletionPrediction {
    estimatedCompletion: Date;
    confidence: number;
    factors: PredictionFactor[];
    scenarios: CompletionScenario[];
}
export interface PredictionFactor {
    name: string;
    weight: number;
    impact: number;
    description: string;
}
export interface CompletionScenario {
    name: string;
    probability: number;
    completionTime: Date;
    description: string;
}
export interface QualityPrediction {
    expectedSuccessRate: number;
    riskOfMajorFailure: number;
    qualityTrend: 'improving' | 'declining' | 'stable';
    interventionRecommendations: string[];
}
export interface RiskPrediction {
    type: 'schedule' | 'budget' | 'quality' | 'resource';
    probability: number;
    impact: number;
    description: string;
    mitigation: string;
    earlyWarningIndicators: string[];
}
export interface ProgressAlert {
    id: string;
    type: 'warning' | 'error' | 'info' | 'critical';
    severity: number;
    title: string;
    message: string;
    source: string;
    timestamp: Date;
    acknowledged: boolean;
    actionRequired: boolean;
    suggestedActions: string[];
    relatedData?: Record<string, any>;
}
export interface ProgressVisualization {
    type: 'timeline' | 'gantt' | 'heatmap' | 'metrics' | 'network';
    data: VisualizationData;
    config: VisualizationSettings;
}
export interface VisualizationData {
    series: VisualizationSeries[];
    annotations: VisualizationAnnotation[];
    metadata: Record<string, any>;
}
export interface VisualizationSeries {
    name: string;
    type: 'line' | 'bar' | 'area' | 'scatter';
    data: VisualizationPoint[];
    color: string;
    unit: string;
}
export interface VisualizationPoint {
    x: number | Date;
    y: number;
    label?: string;
    metadata?: Record<string, any>;
}
export interface VisualizationAnnotation {
    type: 'milestone' | 'alert' | 'event';
    position: number | Date;
    text: string;
    color: string;
}
export interface VisualizationSettings {
    width: number;
    height: number;
    timeRange: [Date, Date];
    autoScale: boolean;
    showPredictions: boolean;
    theme: 'light' | 'dark' | 'auto';
}
export declare class RealTimeProgressTracker extends EventEmitter {
    private config;
    private logger;
    private sessionId;
    private startTime;
    private tasks;
    private batches;
    private metricsHistory;
    private alertManager;
    private predictor;
    private visualizer;
    private streamingManager;
    private updateTimer?;
    constructor(sessionId: string, config: RealTimeProgressConfig);
    /**
     * INITIALIZE TRACKING
     * Setup real-time monitoring and streaming
     */
    private initializeTracking;
    /**
     * TRACK TASK LIFECYCLE
     * Comprehensive tracking of task execution with real-time updates
     */
    trackTaskStarted(task: Task): Promise<void>;
    trackTaskProgress(taskId: string, progress: number, details?: Record<string, any>): Promise<void>;
    trackTaskCompleted(taskId: string, result: TaskResult): Promise<void>;
    /**
     * TRACK BATCH LIFECYCLE
     */
    trackBatchStarted(batch: ExecutionBatch): Promise<void>;
    trackBatchCompleted(batch: ExecutionBatch): Promise<void>;
    /**
     * GENERATE LIVE METRICS
     * Creates comprehensive real-time metrics snapshot
     */
    private generateLiveMetrics;
    /**
     * PERIODIC UPDATE
     * Performs scheduled updates and maintenance
     */
    private performPeriodicUpdate;
    /**
     * VISUALIZATION METHODS
     */
    generateVisualization(type: string, timeRange?: [Date, Date]): Promise<ProgressVisualization>;
    generateDashboardData(): Promise<DashboardData>;
    private setupEventListeners;
    private emitUpdate;
    private storeMetricsSnapshot;
    private cleanupOldData;
    private calculateAverageExecutionTime;
    private calculateAverageBatchTime;
    private calculateCurrentResourceUtilization;
    private calculateCostEfficiency;
    private calculateParallelismEfficiency;
    private calculateMedianDuration;
    private calculateP95Duration;
    private getThroughputTrend;
    private calculateOverallEfficiency;
    private analyzeBottlenecks;
    private estimateBatchDuration;
    private calculateBatchEfficiency;
    private calculatePeakResourceUsage;
    private calculateAverageResourceUsage;
    private getResourceTrends;
    private calculateResourceEfficiency;
    private calculateQualityScore;
    private countIssuesDetected;
    private getQualityTrends;
    private calculateScheduleDeviation;
    private calculateTimelineAccuracy;
    private getMilestoneProgress;
    private generateSummary;
    private generateRecommendations;
    /**
     * CLEANUP
     */
    destroy(): void;
}
interface DashboardData {
    sessionId: string;
    lastUpdate: Date;
    metrics: LiveMetrics;
    predictions: ProgressPredictions;
    alerts: ProgressAlert[];
    visualizations: {
        timeline: ProgressVisualization;
        metrics: ProgressVisualization;
        heatmap: ProgressVisualization;
    };
    summary: any;
    recommendations: any[];
}
export default RealTimeProgressTracker;
//# sourceMappingURL=real-time-progress-tracker.d.ts.map