/**
 * ADVANCED RESOURCE MANAGEMENT SYSTEM V7.0
 *
 * Sistema avanzato per gestione risorse con:
 * - Dynamic resource allocation e auto-scaling
 * - Smart load balancing e capacity planning
 * - Predictive resource management con ML
 * - Multi-tier resource optimization
 * - Cost-aware resource scheduling
 * - Real-time monitoring e alerting
 *
 * @author Livello 5 Resource Expert
 * @version 7.0.0-resource-master
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { ExecutionMetrics } from './parallel-execution-engine';
export interface ResourceManagementConfig {
    resourceLimits: ResourceLimits;
    allocationStrategies: AllocationStrategy[];
    scalingConfig: AutoScalingConfig;
    monitoringConfig: ResourceMonitoringConfig;
    optimizationConfig: ResourceOptimizationConfig;
    costConfig: CostManagementConfig;
    quotaConfig: QuotaManagementConfig;
}
export interface ResourceLimits {
    memory: ResourceLimit;
    cpu: ResourceLimit;
    tokens: ResourceLimit;
    cost: ResourceLimit;
    network: ResourceLimit;
    storage: ResourceLimit;
    concurrency: ConcurrencyLimit;
}
export interface ResourceLimit {
    soft: number;
    hard: number;
    burst: number;
    burstDuration: number;
    unit: string;
}
export interface ConcurrencyLimit {
    maxConcurrentTasks: number;
    maxConcurrentBatches: number;
    maxConcurrentAgents: number;
    priorityLevels: PriorityLevelConfig[];
}
export interface PriorityLevelConfig {
    level: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
    weight: number;
    maxConcurrency: number;
    resourceSharePercentage: number;
}
export interface AllocationStrategy {
    name: string;
    type: 'round_robin' | 'weighted' | 'priority' | 'resource_aware' | 'cost_optimized' | 'ml_predicted';
    enabled: boolean;
    configuration: AllocationStrategyConfig;
    conditions: AllocationCondition[];
}
export interface AllocationStrategyConfig {
    weightingFactors: WeightingFactors;
    optimizationGoals: OptimizationGoal[];
    constraints: AllocationConstraint[];
    adaptiveParameters: AdaptiveParameters;
}
export interface WeightingFactors {
    taskPriority: number;
    resourceEfficiency: number;
    costOptimization: number;
    executionTime: number;
    queueTime: number;
    resourceAvailability: number;
}
export interface OptimizationGoal {
    type: 'minimize_cost' | 'minimize_time' | 'maximize_throughput' | 'maximize_efficiency' | 'balance_all';
    weight: number;
    target: number;
    tolerance: number;
}
export interface AllocationConstraint {
    type: 'resource_limit' | 'cost_budget' | 'time_deadline' | 'dependency' | 'affinity';
    value: any;
    enforced: boolean;
    priority: number;
}
export interface AdaptiveParameters {
    learningRate: number;
    adaptationPeriod: number;
    historyWindow: number;
    enableMLPrediction: boolean;
    confidenceThreshold: number;
}
export interface AllocationCondition {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    timeWindow?: number;
}
export interface AutoScalingConfig {
    enabled: boolean;
    scaleUpTriggers: ScalingTrigger[];
    scaleDownTriggers: ScalingTrigger[];
    scalingPolicies: ScalingPolicy[];
    cooldownPeriods: CooldownConfig;
    safetyLimits: ScalingSafetyLimits;
}
export interface ScalingTrigger {
    metric: ScalingMetric;
    threshold: number;
    operator: '>' | '<' | '>=' | '<=';
    evaluationPeriod: number;
    breachDuration: number;
    actions: ScalingAction[];
}
export interface ScalingMetric {
    name: 'cpu_utilization' | 'memory_utilization' | 'queue_length' | 'response_time' | 'error_rate' | 'cost_rate';
    source: 'system' | 'application' | 'custom';
    aggregation: 'avg' | 'max' | 'min' | 'sum' | 'p50' | 'p90' | 'p95' | 'p99';
    unit: string;
}
export interface ScalingAction {
    type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
    magnitude: number;
    unit: 'percentage' | 'absolute' | 'instances';
    targetResource: string;
    maxChange: number;
}
export interface ScalingPolicy {
    name: string;
    type: 'step' | 'target_tracking' | 'predictive';
    targetValue?: number;
    scaleUpAdjustment: number;
    scaleDownAdjustment: number;
    cooldownUp: number;
    cooldownDown: number;
}
export interface CooldownConfig {
    scaleUpCooldown: number;
    scaleDownCooldown: number;
    emergencyOverride: boolean;
    emergencyThresholds: EmergencyThreshold[];
}
export interface EmergencyThreshold {
    metric: string;
    criticalValue: number;
    overrideCooldown: boolean;
    emergencyActions: string[];
}
export interface ScalingSafetyLimits {
    minInstances: number;
    maxInstances: number;
    maxScaleUpPercent: number;
    maxScaleDownPercent: number;
    maxConcurrentScaling: number;
}
export interface ResourceMonitoringConfig {
    metricsCollection: MetricsCollectionConfig;
    alerting: ResourceAlertConfig;
    reporting: ResourceReportingConfig;
    retention: DataRetentionConfig;
}
export interface MetricsCollectionConfig {
    interval: number;
    detailedMetrics: boolean;
    customMetrics: CustomMetric[];
    aggregationPeriods: number[];
    enablePredictiveMetrics: boolean;
}
export interface CustomMetric {
    name: string;
    type: 'gauge' | 'counter' | 'histogram' | 'summary';
    description: string;
    unit: string;
    labels: string[];
    collector: string;
}
export interface ResourceAlertConfig {
    enabledAlerts: ResourceAlert[];
    escalationPolicy: AlertEscalationPolicy;
    notificationChannels: NotificationChannel[];
    alertDeduplication: boolean;
    alertGrouping: boolean;
}
export interface ResourceAlert {
    name: string;
    condition: AlertCondition;
    severity: AlertSeverity;
    message: string;
    actions: AlertAction[];
    cooldown: number;
}
export interface AlertCondition {
    metric: string;
    operator: string;
    threshold: number;
    duration: number;
    comparison: 'absolute' | 'percentage' | 'rate';
}
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export interface AlertAction {
    type: 'notification' | 'auto_scale' | 'throttle' | 'reject_requests' | 'custom';
    parameters: Record<string, any>;
    delay: number;
}
export interface AlertEscalationPolicy {
    levels: EscalationLevel[];
    timeouts: number[];
    skipConditions: SkipCondition[];
}
export interface EscalationLevel {
    level: number;
    recipients: string[];
    actions: string[];
    timeout: number;
}
export interface SkipCondition {
    condition: string;
    skipToLevel?: number;
}
export interface NotificationChannel {
    type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
    configuration: Record<string, any>;
    enabled: boolean;
    rateLimits: RateLimit[];
}
export interface RateLimit {
    period: number;
    maxNotifications: number;
    burstSize?: number;
}
export interface ResourceReportingConfig {
    enabledReports: ResourceReport[];
    schedules: ReportSchedule[];
    formats: ('json' | 'csv' | 'html' | 'pdf')[];
    destinations: ReportDestination[];
}
export interface ResourceReport {
    name: string;
    type: 'utilization' | 'cost' | 'efficiency' | 'capacity' | 'trends';
    metrics: string[];
    timeRange: string;
    aggregation: string;
}
export interface ReportSchedule {
    reportName: string;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    timezone?: string;
}
export interface ReportDestination {
    type: 'file' | 'email' | 'webhook' | 's3' | 'database';
    configuration: Record<string, any>;
}
export interface DataRetentionConfig {
    rawDataRetention: number;
    aggregatedDataRetention: number;
    alertDataRetention: number;
    reportDataRetention: number;
    compressionEnabled: boolean;
    archivalPolicy: ArchivalPolicy;
}
export interface ArchivalPolicy {
    enabled: boolean;
    archiveAfter: number;
    compressionRatio: number;
    restoreTimeRTO: number;
}
export interface ResourceOptimizationConfig {
    optimizationStrategies: OptimizationStrategy[];
    scheduledOptimization: OptimizationSchedule;
    realTimeOptimization: RealTimeOptimizationConfig;
    costOptimization: CostOptimizationConfig;
    performanceOptimization: PerformanceOptimizationConfig;
}
export interface OptimizationStrategy {
    name: string;
    type: 'rightsizing' | 'scheduling' | 'placement' | 'pooling' | 'caching';
    enabled: boolean;
    triggers: OptimizationTrigger[];
    parameters: OptimizationParameters;
    expectedGains: ExpectedGains;
}
export interface OptimizationTrigger {
    condition: string;
    frequency: string;
    threshold: number;
    enabledPeriods: TimePeriod[];
}
export interface TimePeriod {
    start: string;
    end: string;
    daysOfWeek: number[];
    timezone: string;
}
export interface OptimizationParameters {
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    safetyMargin: number;
    rollbackThreshold: number;
    validationPeriod: number;
    monitoringDuration: number;
}
export interface ExpectedGains {
    costReduction: number;
    performanceImprovement: number;
    resourceEfficiency: number;
    confidence: number;
}
export interface OptimizationSchedule {
    enabled: boolean;
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
    maintenanceWindows: MaintenanceWindow[];
    exclusionPeriods: TimePeriod[];
}
export interface MaintenanceWindow {
    name: string;
    schedule: string;
    duration: number;
    allowedOperations: string[];
    rollbackTime: number;
}
export interface RealTimeOptimizationConfig {
    enabled: boolean;
    responsiveness: 'low' | 'medium' | 'high' | 'ultra';
    decisionInterval: number;
    adaptationRate: number;
    stabilityPeriod: number;
}
export interface CostOptimizationConfig {
    targetCostReduction: number;
    budgetConstraints: BudgetConstraint[];
    spotInstanceUsage: SpotInstanceConfig;
    reservedCapacityPlanning: ReservedCapacityConfig;
}
export interface BudgetConstraint {
    type: 'daily' | 'weekly' | 'monthly' | 'total';
    limit: number;
    alertThresholds: number[];
    enforceLimit: boolean;
}
export interface SpotInstanceConfig {
    enabled: boolean;
    maxSpotPercentage: number;
    fallbackStrategy: 'on_demand' | 'reserved' | 'hybrid';
    bidStrategy: 'conservative' | 'aggressive';
}
export interface ReservedCapacityConfig {
    enabled: boolean;
    planningHorizon: number;
    utilizationTarget: number;
    renewalStrategy: 'automatic' | 'manual' | 'hybrid';
}
export interface PerformanceOptimizationConfig {
    targetMetrics: PerformanceTarget[];
    bottleneckDetection: BottleneckDetectionConfig;
    autoTuning: AutoTuningConfig;
}
export interface PerformanceTarget {
    metric: string;
    target: number;
    tolerance: number;
    priority: number;
}
export interface BottleneckDetectionConfig {
    enabled: boolean;
    detectionAlgorithms: string[];
    analysisWindow: number;
    sensitivityLevel: number;
}
export interface AutoTuningConfig {
    enabled: boolean;
    parameters: TunableParameter[];
    explorationStrategy: 'random' | 'genetic' | 'gradient' | 'bayesian';
    stabilizationPeriod: number;
}
export interface TunableParameter {
    name: string;
    type: 'continuous' | 'discrete' | 'categorical';
    range: [number, number] | string[];
    current: number | string;
    impact: number;
}
export interface CostManagementConfig {
    budgetManagement: BudgetManagementConfig;
    costAllocation: CostAllocationConfig;
    costOptimization: CostOptimizationStrategies;
    chargeback: ChargebackConfig;
}
export interface BudgetManagementConfig {
    budgets: Budget[];
    alerting: BudgetAlertConfig;
    enforcement: BudgetEnforcementConfig;
    forecasting: BudgetForecastingConfig;
}
export interface Budget {
    name: string;
    type: 'project' | 'user' | 'department' | 'total';
    amount: number;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    currency: string;
    startDate: Date;
    endDate?: Date;
    rollover: boolean;
}
export interface BudgetAlertConfig {
    thresholds: number[];
    recipients: string[];
    includeProjection: boolean;
    includeRecommendations: boolean;
}
export interface BudgetEnforcementConfig {
    enforceAtThreshold: number;
    gracePeriod: number;
    escalationActions: BudgetEscalationAction[];
}
export interface BudgetEscalationAction {
    threshold: number;
    action: 'warn' | 'throttle' | 'block' | 'approval_required';
    parameters: Record<string, any>;
}
export interface BudgetForecastingConfig {
    enabled: boolean;
    forecastHorizon: number;
    confidenceLevel: number;
    includeTrends: boolean;
    includeSeasonality: boolean;
}
export interface CostAllocationConfig {
    allocationMethods: CostAllocationMethod[];
    taggingStrategy: TaggingStrategy;
    reportingGranularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}
export interface CostAllocationMethod {
    name: string;
    type: 'equal' | 'proportional' | 'usage_based' | 'priority_based';
    factors: AllocationFactor[];
    weight: number;
}
export interface AllocationFactor {
    name: string;
    weight: number;
    metric: string;
}
export interface TaggingStrategy {
    requiredTags: string[];
    defaultTags: Record<string, string>;
    hierarchicalTags: HierarchicalTag[];
}
export interface HierarchicalTag {
    name: string;
    levels: string[];
    separator: string;
}
export interface CostOptimizationStrategies {
    rightSizing: RightSizingConfig;
    scheduling: SchedulingOptimizationConfig;
    resourcePooling: ResourcePoolingConfig;
}
export interface RightSizingConfig {
    enabled: boolean;
    analysisWindow: number;
    utilizationThreshold: number;
    costSavingsThreshold: number;
    recommendationConfidence: number;
}
export interface SchedulingOptimizationConfig {
    enabled: boolean;
    flexibleDeadlines: boolean;
    costTiers: CostTier[];
    offPeakDiscounts: OffPeakDiscount[];
}
export interface CostTier {
    name: string;
    pricePerUnit: number;
    availability: number;
    performanceMultiplier: number;
}
export interface OffPeakDiscount {
    period: TimePeriod;
    discount: number;
    applicableResources: string[];
}
export interface ResourcePoolingConfig {
    enabled: boolean;
    poolingStrategies: PoolingStrategy[];
    sharing: SharingConfig;
}
export interface PoolingStrategy {
    name: string;
    type: 'static' | 'dynamic' | 'adaptive';
    resources: string[];
    allocationPolicy: string;
}
export interface SharingConfig {
    enableResourceSharing: boolean;
    sharingPolicies: SharingPolicy[];
    isolationLevel: 'none' | 'soft' | 'hard';
}
export interface SharingPolicy {
    resourceType: string;
    sharingRatio: number;
    priorityOrdering: string[];
    preemptionRules: PreemptionRule[];
}
export interface PreemptionRule {
    trigger: string;
    action: 'graceful_preempt' | 'immediate_preempt' | 'negotiate' | 'reschedule';
    notificationPeriod: number;
}
export interface ChargebackConfig {
    enabled: boolean;
    chargebackModels: ChargebackModel[];
    reportingPeriod: 'daily' | 'weekly' | 'monthly';
    approvalWorkflow: boolean;
}
export interface ChargebackModel {
    name: string;
    type: 'actual' | 'allocated' | 'showback';
    allocationRules: AllocationRule[];
    adjustments: CostAdjustment[];
}
export interface AllocationRule {
    resource: string;
    method: 'direct' | 'proportional' | 'time_based' | 'usage_based';
    factors: string[];
}
export interface CostAdjustment {
    name: string;
    type: 'markup' | 'discount' | 'fixed_fee';
    value: number;
    conditions: string[];
}
export interface QuotaManagementConfig {
    quotas: ResourceQuota[];
    enforcement: QuotaEnforcementConfig;
    monitoring: QuotaMonitoringConfig;
    flexibility: QuotaFlexibilityConfig;
}
export interface ResourceQuota {
    name: string;
    resourceType: string;
    limit: number;
    unit: string;
    scope: 'user' | 'project' | 'department' | 'global';
    priority: number;
    transferable: boolean;
}
export interface QuotaEnforcementConfig {
    strictEnforcement: boolean;
    gracePeriod: number;
    overagePolicy: OveragePolicy;
    exemptions: QuotaExemption[];
}
export interface OveragePolicy {
    allowOverage: boolean;
    maxOveragePercentage: number;
    overagePenalty: number;
    overageApproval: boolean;
}
export interface QuotaExemption {
    criteria: string;
    exemptionType: 'temporary' | 'permanent';
    duration?: number;
    approvalRequired: boolean;
}
export interface QuotaMonitoringConfig {
    trackingInterval: number;
    forecastOverage: boolean;
    alertThresholds: number[];
    reportingLevel: 'detailed' | 'summary';
}
export interface QuotaFlexibilityConfig {
    enableBorrowing: boolean;
    borrowingRules: BorrowingRule[];
    pooledQuotas: PooledQuota[];
}
export interface BorrowingRule {
    source: string;
    maxBorrowPercentage: number;
    returnPeriod: number;
    interestRate: number;
}
export interface PooledQuota {
    name: string;
    contributors: string[];
    allocationMethod: string;
    rebalancingFrequency: number;
}
export interface ResourceState {
    timestamp: Date;
    resources: ResourceTypeState[];
    overall: OverallResourceState;
    predictions: ResourcePredictions;
    alerts: ResourceAlert[];
    recommendations: ResourceRecommendation[];
}
export interface ResourceTypeState {
    type: string;
    current: ResourceUsage;
    allocated: ResourceUsage;
    available: ResourceUsage;
    reserved: ResourceUsage;
    efficiency: number;
    utilization: number;
    cost: number;
    trends: ResourceTrend;
}
export interface ResourceUsage {
    value: number;
    unit: string;
    percentage: number;
    normalized: number;
}
export interface ResourceTrend {
    shortTerm: TrendIndicator;
    mediumTerm: TrendIndicator;
    longTerm: TrendIndicator;
}
export interface TrendIndicator {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
    confidence: number;
    acceleration: number;
}
export interface OverallResourceState {
    healthScore: number;
    efficiency: number;
    utilization: number;
    sustainability: number;
    costEffectiveness: number;
    bottlenecks: Bottleneck[];
    capacityStatus: CapacityStatus;
}
export interface Bottleneck {
    resource: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    estimatedResolution: number;
    recommendations: string[];
}
export interface CapacityStatus {
    overall: 'abundant' | 'adequate' | 'constrained' | 'critical';
    projectedExhaustion?: Date;
    recommendedActions: CapacityAction[];
}
export interface CapacityAction {
    type: 'scale_up' | 'optimize' | 'redistribute' | 'defer';
    urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    estimatedCost: number;
    estimatedBenefit: number;
}
export interface ResourcePredictions {
    timeHorizon: number;
    predictions: ResourcePrediction[];
    confidence: number;
    assumptions: string[];
    riskFactors: RiskFactor[];
    recommendations?: ResourceRecommendation[] | ScalingRecommendation[];
    generatedAt?: Date;
    [key: string]: any;
}
export interface ResourcePrediction {
    resource: string;
    projectedUsage: TimeSeries;
    projectedCost: TimeSeries;
    peakTimes: PeakPeriod[];
    scalingRecommendations: ScalingRecommendation[];
}
export interface TimeSeries {
    data: DataPoint[];
    metadata: TimeSeriesMetadata;
}
export interface DataPoint {
    timestamp: Date;
    value: number;
    confidence?: number;
}
export interface TimeSeriesMetadata {
    resolution: number;
    aggregation: string;
    source: string;
    quality: number;
}
export interface PeakPeriod {
    start: Date;
    end: Date;
    peakValue: number;
    probability: number;
    recommended: RecommendedAction[];
}
export interface RecommendedAction {
    action: string;
    timing: string;
    impact: number;
    cost: number;
}
export interface ScalingRecommendation {
    trigger: Date;
    action: ScalingAction;
    justification: string;
    alternatives: AlternativeAction[];
}
export interface AlternativeAction {
    action: string;
    tradeoffs: string[];
    suitability: number;
}
export interface RiskFactor {
    factor: string;
    probability: number;
    impact: number;
    mitigation: string[];
}
export interface ResourceRecommendation {
    id: string;
    type: 'optimization' | 'scaling' | 'reallocation' | 'cost_reduction';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: RecommendationImpact;
    implementation: ImplementationPlan;
    risks: string[];
    dependencies: string[];
}
export interface RecommendationImpact {
    costSavings: number;
    performanceImprovement: number;
    reliabilityImprovement: number;
    implementationCost: number;
    paybackPeriod: number;
}
export interface ImplementationPlan {
    steps: ImplementationStep[];
    estimatedDuration: number;
    requiredApprovals: string[];
    rollbackPlan: string[];
}
export interface ImplementationStep {
    step: string;
    duration: number;
    dependencies: string[];
    risks: string[];
    validation: string[];
}
export declare class AdvancedResourceManagementSystem extends EventEmitter {
    private config;
    private logger;
    private currentState;
    private resourceMonitor;
    private allocationEngine;
    private scalingManager;
    private optimizationEngine;
    private costManager;
    private quotaManager;
    private predictiveAnalyzer;
    private alertManager;
    private reportingEngine;
    private resourcePools;
    private allocationRequests;
    private monitoringTimer?;
    constructor(config: ResourceManagementConfig);
    /**
     * RESOURCE ALLOCATION
     * Allocates resources for task execution with intelligent optimization
     */
    allocateResources(request: ResourceAllocationRequest): Promise<ResourceAllocationResult>;
    /**
     * RESOURCE DEALLOCATION
     * Releases resources after task completion
     */
    deallocateResources(allocationId: string, usage?: ActualResourceUsage): Promise<ResourceDeallocationResult>;
    /**
     * DYNAMIC SCALING
     * Automatically scales resources based on demand
     */
    handleScalingDecision(metrics: ExecutionMetrics): Promise<ScalingDecisionResult>;
    /**
     * OPTIMIZATION ENGINE
     * Continuously optimizes resource allocation and usage
     */
    performOptimization(scope: 'immediate' | 'scheduled' | 'comprehensive'): Promise<OptimizationResult>;
    /**
     * PREDICTIVE ANALYTICS
     * Provides future resource requirements predictions
     */
    generateResourcePredictions(timeHorizon: number, workloadForecast?: WorkloadForecast): Promise<ResourcePredictions>;
    /**
     * MONITORING AND ALERTING
     */
    private startMonitoring;
    private performMonitoringCycle;
    private initializeResourceState;
    private generateRequestId;
    private analyzeResourceAvailability;
    private validateAllocation;
    private reserveResources;
    private updateResourceState;
    private getAllocation;
    private analyzeResourceUsage;
    private releaseResources;
    private updateEfficiencyMetrics;
    private generateUsageRecommendations;
    private analyzeUtilization;
    private validateScalingPlan;
    private executeScaling;
    private gatherHistoricalData;
    private generatePredictiveRecommendations;
    private handleAlerts;
    private shouldUpdatePredictions;
    private updatePredictions;
    private createQuotaRejectionResult;
    private createValidationFailureResult;
    private createReservationFailureResult;
    private createAllocationErrorResult;
    /**
     * CLEANUP
     */
    destroy(): void;
}
export interface ResourceAllocationRequest {
    taskId?: string;
    batchId?: string;
    requiredResources: RequiredResources;
    priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
    deadline?: Date;
    constraints?: AllocationConstraint[];
    preferences?: AllocationPreference[];
}
export interface RequiredResources {
    memory?: number;
    cpu?: number;
    tokens?: number;
    maxCost?: number;
    duration?: number;
}
export interface AllocationPreference {
    type: string;
    value: any;
    weight: number;
}
export interface ResourceAllocationResult {
    success: boolean;
    requestId: string;
    allocation?: any;
    strategy?: string;
    reservationId?: string;
    allocationTime: number;
    expirationTime?: Date;
    error?: string;
    message?: string;
    metadata?: Record<string, any>;
}
export interface ActualResourceUsage {
    memory: number;
    cpu: number;
    tokens: number;
    duration: number;
    cost: number;
}
export interface ResourceDeallocationResult {
    success: boolean;
    allocationId: string;
    usageAnalysis: any;
    recommendations: ResourceRecommendation[];
    deallocationTime: number;
    costSavings: number;
    efficiencyScore: number;
}
export interface ScalingDecisionResult {
    scaleRequired: boolean;
    reason?: string;
    scalingPlan?: any;
    scalingResult?: any;
    currentUtilization: any;
    estimatedImpact?: any;
}
export interface OptimizationResult {
    success: boolean;
    scope: string;
    opportunitiesFound: number;
    optimizationsApplied: number;
    estimatedSavings: number;
    optimizationTime: number;
    details?: OptimizationActionResult[];
    nextOptimizationWindow?: Date;
}
export interface OptimizationActionResult {
    action: string;
    success: boolean;
    estimatedSavings: number;
    actualSavings?: number;
    implementationTime: number;
    rollbackAvailable?: boolean;
}
export interface WorkloadForecast {
    expectedTasks: number;
    peakPeriods: Date[];
    seasonalFactors: SeasonalFactor[];
    specialEvents: SpecialEvent[];
}
export interface SeasonalFactor {
    period: 'hourly' | 'daily' | 'weekly' | 'monthly';
    multiplier: number;
    confidence: number;
}
export interface SpecialEvent {
    name: string;
    startTime: Date;
    endTime: Date;
    expectedImpact: number;
    resourceRequirements?: RequiredResources;
}
export interface AllocationRequest {
    id: string;
    timestamp: Date;
    status: 'processing' | 'allocated' | 'failed' | 'expired';
    taskId?: string;
    batchId?: string;
    requiredResources: RequiredResources;
    priority: string;
}
export interface ResourcePool {
    id: string;
    type: string;
    capacity: number;
    available: number;
    reserved: number;
    allocations: Map<string, any>;
    efficiency: number;
}
export default AdvancedResourceManagementSystem;
//# sourceMappingURL=resource-management-system.d.ts.map