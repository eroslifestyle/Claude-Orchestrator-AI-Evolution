/**
 * RESOURCE AUTO-SCALING MANAGER V6.0 - ML-POWERED PREDICTIVE SCALING
 *
 * Revolutionary dynamic resource allocation system that scales from static 6-agent
 * allocation to intelligent 64+ agent auto-scaling with machine learning-based prediction
 *
 * REVOLUTIONARY CAPABILITIES:
 * - ML-powered predictive scaling with demand forecasting
 * - Dynamic resource allocation based on real-time performance metrics
 * - Cost optimization algorithms for massive parallel execution
 * - Intelligent resource pooling with automatic rebalancing
 * - Predictive failure detection and proactive resource adjustment
 * - Multi-dimensional scaling (CPU, Memory, Tokens, Cost, Agents)
 *
 * PERFORMANCE TARGETS:
 * - Resource Management: Static → Dynamic ML-driven
 * - Scaling Response: Manual → Automatic <30 seconds
 * - Resource Efficiency: 85% → 95% utilization
 * - Cost Optimization: Basic → Advanced ML prediction
 * - Predictive Accuracy: N/A → 90%+ demand forecasting
 * - Waste Reduction: 15% → <5% resource waste
 *
 * @author Revolutionary AI Integration Expert (ai_integration_expert.md)
 * @version 6.0.0-revolutionary
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export interface ResourceDemand {
    timestamp: Date;
    agentCount: number;
    cpuRequirement: number;
    memoryRequirement: number;
    tokenRequirement: number;
    costBudget: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    duration: number;
    complexity: number;
    domain: string;
}
export interface ResourceCapacity {
    timestamp: Date;
    totalCPU: number;
    totalMemory: number;
    totalTokens: number;
    totalBudget: number;
    activeAgents: number;
    maxAgents: number;
    utilizationRate: number;
    efficiency: number;
    healthScore: number;
}
export interface ScalingPrediction {
    predictedDemand: ResourceDemand[];
    confidence: number;
    timeHorizon: number;
    keyFactors: PredictionFactor[];
    uncertaintyBounds: UncertaintyBounds;
    recommendedActions: ScalingAction[];
    riskAssessment: ScalingRisk[];
}
export interface PredictionFactor {
    factor: string;
    influence: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    evidence: string[];
    historicalAccuracy: number;
}
export interface UncertaintyBounds {
    lowerBound: ResourceDemand[];
    upperBound: ResourceDemand[];
    mostLikely: ResourceDemand[];
    confidenceLevel: number;
}
export interface ScalingAction {
    action: 'scale-up' | 'scale-down' | 'rebalance' | 'optimize' | 'maintain';
    targetAgents: number;
    targetResources: ResourceAllocation;
    priority: number;
    expectedBenefit: ScalingBenefit;
    estimatedCost: ScalingCost;
    riskLevel: number;
    timeframe: number;
    dependencies: string[];
}
export interface ScalingBenefit {
    performanceImprovement: number;
    costSavings: number;
    efficiencyGain: number;
    capacityIncrease: number;
    riskReduction: number;
    qualityImprovement: number;
}
export interface ScalingCost {
    directCost: number;
    opportunityCost: number;
    transitionCost: number;
    riskCost: number;
    maintenanceCost: number;
    totalCost: number;
}
export interface ScalingRisk {
    risk: string;
    probability: number;
    impact: number;
    category: 'performance' | 'cost' | 'stability' | 'quality' | 'security';
    mitigation: string;
    monitoringIndicators: string[];
    contingencyPlan: string;
}
export interface ResourceAllocation {
    agents: AgentAllocation[];
    totalCPU: number;
    totalMemory: number;
    totalTokens: number;
    totalCost: number;
    utilizationTarget: number;
    reserveCapacity: number;
}
export interface AgentAllocation {
    agentId: string;
    agentType: string;
    cpu: number;
    memory: number;
    tokens: number;
    cost: number;
    priority: number;
    specialization: string;
    efficiency: number;
}
export interface ScalingMetrics {
    timestamp: Date;
    scalingEvents: ScalingEvent[];
    performanceMetrics: PerformanceMetric[];
    costMetrics: CostMetric[];
    efficiencyMetrics: EfficiencyMetric[];
    predictionAccuracy: PredictionAccuracy[];
    learningProgress: LearningProgress;
}
export interface ScalingEvent {
    timestamp: Date;
    event: 'scale-up' | 'scale-down' | 'rebalance' | 'optimization';
    trigger: string;
    fromState: ResourceState;
    toState: ResourceState;
    duration: number;
    success: boolean;
    impact: ScalingImpact;
    lessonsLearned: string[];
}
export interface ResourceState {
    agents: number;
    cpu: number;
    memory: number;
    tokens: number;
    cost: number;
    utilization: number;
    efficiency: number;
}
export interface ScalingImpact {
    performanceChange: number;
    costChange: number;
    efficiencyChange: number;
    qualityChange: number;
    stabilityImpact: number;
    userSatisfaction: number;
}
export interface PerformanceMetric {
    timestamp: Date;
    metric: 'throughput' | 'latency' | 'error-rate' | 'quality-score';
    value: number;
    target: number;
    variance: number;
    trend: 'improving' | 'degrading' | 'stable';
}
export interface CostMetric {
    timestamp: Date;
    totalCost: number;
    costPerAgent: number;
    costPerTask: number;
    costEfficiency: number;
    budgetUtilization: number;
    waste: number;
}
export interface EfficiencyMetric {
    timestamp: Date;
    cpuEfficiency: number;
    memoryEfficiency: number;
    tokenEfficiency: number;
    agentEfficiency: number;
    overallEfficiency: number;
}
export interface PredictionAccuracy {
    timestamp: Date;
    predictedValue: number;
    actualValue: number;
    accuracy: number;
    metric: string;
    horizon: number;
    factors: string[];
}
export interface LearningProgress {
    modelsTrained: number;
    dataPointsCollected: number;
    averageAccuracy: number;
    improvementRate: number;
    confidenceLevel: number;
    nextTrainingScheduled: Date;
}
export interface MLModel {
    modelId: string;
    modelType: 'demand-prediction' | 'cost-optimization' | 'performance-forecasting' | 'anomaly-detection';
    algorithm: string;
    features: string[];
    trainingData: TrainingData;
    performance: ModelPerformance;
    lastTrained: Date;
    version: string;
    isActive: boolean;
}
export interface TrainingData {
    dataPoints: number;
    features: number;
    timeSpan: number;
    quality: number;
    lastUpdated: Date;
    sources: string[];
}
export interface ModelPerformance {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rmse: number;
    mae: number;
    validationScore: number;
    lastEvaluated: Date;
}
export interface FeatureImportance {
    feature: string;
    importance: number;
    correlation: number;
    stability: number;
    interpretation: string;
}
export interface AnomalyDetection {
    timestamp: Date;
    anomalyType: 'demand-spike' | 'performance-degradation' | 'cost-anomaly' | 'efficiency-drop';
    severity: number;
    confidence: number;
    affectedMetrics: string[];
    possibleCauses: string[];
    recommendedActions: string[];
    autoResponse: boolean;
}
/**
 * Revolutionary Resource Auto-Scaling Manager
 * ML-powered predictive scaling for 64+ agent coordination
 */
export declare class ResourceAutoScaler extends EventEmitter {
    private config;
    private mlModels;
    private historicalData;
    private capacityHistory;
    private scalingHistory;
    private predictionCache;
    private isLearning;
    private learningProgress;
    constructor(config: AutoScalerConfig);
    /**
     * REVOLUTIONARY MAIN METHOD: ML-Powered Predictive Scaling
     * Predicts resource needs and automatically scales infrastructure
     */
    predictAndScale(currentDemand: ResourceDemand, currentCapacity: ResourceCapacity, timeHorizon?: number): Promise<ScalingDecision>;
    /**
     * STEP 1: Collect and Preprocess Features for ML Models
     */
    private collectFeatures;
    /**
     * STEP 2: Generate ML-Based Predictions
     */
    private generateMLPrediction;
    /**
     * STEP 3: Analyze Current Resource Utilization
     */
    private analyzeResourceUtilization;
    /**
     * STEP 6: Generate Intelligent Scaling Recommendations
     */
    private generateScalingRecommendations;
    /**
     * STEP 8: Create Scaling Execution Plan
     */
    private createScalingExecutionPlan;
    private calculateBaseDemand;
    private calculateTrendMultiplier;
    private calculateSeasonalAdjustment;
    private calculateVolatilityFactor;
    private determinePriority;
    private calculatePredictionConfidence;
    private identifyKeyFactors;
    private calculateUncertaintyBounds;
    private calculateMemoryUtilization;
    private calculateTokenUtilization;
    private calculateUtilizationTrend;
    private calculateResourceAllocation;
    private optimizeResourceDistribution;
    private calculateROI;
    private createMaintainAction;
    private generateExecutionSteps;
    private generateExecutionTimeline;
    private createMonitoringPlan;
    private createRollbackPlan;
    private defineSuccessCriteria;
    private calculatePlanConfidence;
    private collectTemporalFeatures;
    private collectDemandFeatures;
    private collectCapacityFeatures;
    private collectHistoricalFeatures;
    private collectContextualFeatures;
    private collectPerformanceFeatures;
    private collectEnvironmentalFeatures;
    private calculateHistoricalAverage;
    private calculateHistoricalMax;
    private calculateDemandVariability;
    private detectAnomalies;
    private optimizeCostPerformanceTradeoffs;
    private assessScalingRisks;
    private createSafetyFallbackDecision;
    private initializeMLSystem;
    private startContinuousLearning;
    private setupPerformanceMonitoring;
    private performPeriodicLearning;
    private learnFromScalingDecision;
}
interface ScalingDecision {
    success: boolean;
    prediction: ScalingPrediction;
    recommendations: ScalingAction[];
    executionPlan: ScalingExecutionPlan;
    riskAssessment: any;
    analysisTime: number;
}
interface ScalingExecutionPlan {
    primaryAction: ScalingAction;
    alternativeActions: ScalingAction[];
    executionSteps: ExecutionStep[];
    timeline: ExecutionTimeline;
    monitoringPlan: MonitoringPlan;
    rollbackPlan: RollbackPlan;
    successCriteria: SuccessCriterion[];
    confidence: number;
}
interface ExecutionStep {
    step: string;
    duration: number;
    dependencies: string[];
}
interface ExecutionTimeline {
    startTime: Date;
    estimatedEndTime: Date;
    totalDuration: number;
    criticalPath: string[];
    milestones: Milestone[];
}
interface Milestone {
    name: string;
    time: Date;
}
interface MonitoringPlan {
    metrics: string[];
    frequency: number;
    alertThresholds: Record<string, number>;
    dashboardUrl: string;
    notificationChannels: string[];
}
interface RollbackPlan {
    triggers: string[];
    rollbackSteps: string[];
    estimatedRollbackTime: number;
    dataPreservation: boolean;
    testPlan: string;
}
interface SuccessCriterion {
    metric: string;
    target: number;
    tolerance: number;
    timeframe: number;
}
interface AutoScalerConfig {
    maxAgents: number;
    riskTolerance: number;
    learningEnabled: boolean;
    predictionHorizon: number;
    scalingThresholds: {
        scaleUpThreshold: number;
        scaleDownThreshold: number;
        emergencyThreshold: number;
    };
    costLimits: {
        dailyBudget: number;
        hourlyBudget: number;
        alertThreshold: number;
    };
}
export default ResourceAutoScaler;
//# sourceMappingURL=ResourceAutoScaler.d.ts.map