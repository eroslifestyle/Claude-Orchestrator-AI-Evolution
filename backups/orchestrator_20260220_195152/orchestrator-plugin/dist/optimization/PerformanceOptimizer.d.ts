/**
 * Performance Optimization Layer - Intelligent Orchestration Optimization
 *
 * Sistema avanzato per:
 * - Auto-tuning capabilities per orchestration parameters
 * - Dynamic load balancing tra agent instances
 * - Resource allocation optimization con predictive scaling
 * - Performance bottleneck identification e resolution
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
import type { PluginConfig } from '../types';
import type { OrchestrationMetrics } from '../analytics/AnalyticsEngine';
/**
 * Configurazione Performance Optimizer
 */
export interface PerformanceOptimizerConfig {
    /** Abilita auto-tuning automatico */
    enableAutoTuning: boolean;
    /** Abilita dynamic load balancing */
    enableLoadBalancing: boolean;
    /** Target performance improvement (%) */
    targetPerformanceImprovement: number;
    /** Optimization frequency (ms) */
    optimizationInterval: number;
    /** Resource utilization threshold */
    resourceUtilizationThreshold: number;
    /** Agent response time threshold (ms) */
    agentResponseTimeThreshold: number;
    /** Abilita predictive scaling */
    enablePredictiveScaling: boolean;
    /** Aggressive optimization mode */
    aggressiveOptimization: boolean;
}
/**
 * Optimization target metrics
 */
export interface OptimizationTargets {
    /** Target execution time (ms) */
    targetExecutionTime: number;
    /** Target success rate (0.0-1.0) */
    targetSuccessRate: number;
    /** Target cost per task */
    targetCostPerTask: number;
    /** Target throughput (tasks/minute) */
    targetThroughput: number;
    /** Target resource efficiency (0.0-1.0) */
    targetResourceEfficiency: number;
}
/**
 * Performance optimization strategy
 */
export interface OptimizationStrategy {
    /** Strategy name */
    name: string;
    /** Strategy type */
    type: 'parameter_tuning' | 'load_balancing' | 'resource_scaling' | 'agent_selection' | 'model_optimization';
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** Expected improvement (%) */
    expectedImprovement: number;
    /** Implementation cost/effort */
    implementationCost: 'low' | 'medium' | 'high';
    /** Risk level */
    riskLevel: 'low' | 'medium' | 'high';
    /** Strategy parameters */
    parameters: Record<string, any>;
    /** Applicability conditions */
    applicabilityConditions: string[];
}
/**
 * Agent load balancing configuration
 */
export interface LoadBalancingConfig {
    /** Load balancing algorithm */
    algorithm: 'round_robin' | 'least_connections' | 'weighted_response_time' | 'resource_aware' | 'ml_adaptive';
    /** Agent pool management */
    agentPoolManagement: {
        minAgents: number;
        maxAgents: number;
        scaleUpThreshold: number;
        scaleDownThreshold: number;
        cooldownPeriod: number;
    };
    /** Health check configuration */
    healthChecks: {
        enabled: boolean;
        interval: number;
        timeout: number;
        failureThreshold: number;
    };
}
/**
 * Resource allocation optimization
 */
export interface ResourceAllocation {
    /** CPU allocation per agent */
    cpuAllocation: Map<string, number>;
    /** Memory allocation per agent */
    memoryAllocation: Map<string, number>;
    /** Network bandwidth allocation */
    networkAllocation: Map<string, number>;
    /** Token budget allocation */
    tokenBudgetAllocation: Map<string, number>;
    /** Priority levels */
    priorityLevels: Map<string, number>;
}
/**
 * Performance bottleneck analysis
 */
export interface BottleneckAnalysis {
    /** Bottleneck ID */
    id: string;
    /** Bottleneck type */
    type: 'cpu' | 'memory' | 'network' | 'agent_capacity' | 'model_latency' | 'dependency_wait';
    /** Severity level */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Affected components */
    affectedComponents: string[];
    /** Impact metrics */
    impactMetrics: {
        performanceDegradation: number;
        costIncrease: number;
        userExperienceImpact: number;
    };
    /** Root cause analysis */
    rootCause: string;
    /** Recommended actions */
    recommendedActions: OptimizationAction[];
    /** Estimated resolution time */
    estimatedResolutionTime: number;
}
/**
 * Optimization action
 */
export interface OptimizationAction {
    /** Action ID */
    id: string;
    /** Action type */
    type: 'scale_up' | 'scale_down' | 'rebalance' | 'parameter_adjust' | 'agent_swap' | 'model_change';
    /** Action description */
    description: string;
    /** Parameters for action */
    parameters: Record<string, any>;
    /** Expected impact */
    expectedImpact: {
        performanceImprovement: number;
        costChange: number;
        riskLevel: number;
    };
    /** Execution priority */
    priority: number;
    /** Auto-executable flag */
    autoExecutable: boolean;
}
/**
 * Predictive scaling decision
 */
export interface PredictiveScalingDecision {
    /** Decision timestamp */
    timestamp: number;
    /** Predicted load */
    predictedLoad: {
        agentUtilization: number;
        requestVolume: number;
        resourceDemand: ResourceDemand;
    };
    /** Scaling recommendation */
    recommendation: {
        action: 'scale_up' | 'scale_down' | 'maintain';
        targetAgentCount: number;
        confidence: number;
        reasoning: string[];
    };
    /** Timing information */
    timing: {
        predictedPeakTime: number;
        preparationTime: number;
        executionDeadline: number;
    };
}
/**
 * Resource demand prediction
 */
export interface ResourceDemand {
    /** CPU demand (0.0-1.0) */
    cpuDemand: number;
    /** Memory demand (MB) */
    memoryDemand: number;
    /** Network demand (Mbps) */
    networkDemand: number;
    /** Token consumption rate */
    tokenConsumptionRate: number;
    /** Confidence in prediction */
    confidence: number;
}
/**
 * Optimization result
 */
export interface OptimizationResult {
    /** Optimization session ID */
    sessionId: string;
    /** Optimization timestamp */
    timestamp: number;
    /** Applied strategies */
    appliedStrategies: OptimizationStrategy[];
    /** Performance improvements */
    performanceImprovements: {
        executionTimeImprovement: number;
        successRateImprovement: number;
        costReduction: number;
        throughputImprovement: number;
        resourceEfficiencyGain: number;
    };
    /** Actions taken */
    actionsTaken: OptimizationAction[];
    /** Overall success */
    success: boolean;
    /** Lessons learned */
    lessonsLearned: string[];
}
export declare class PerformanceOptimizer {
    private config;
    private optimizerConfig;
    private logger;
    private optimizationTargets;
    private loadBalancingConfig;
    private resourceAllocation;
    private activeOptimizations;
    private performanceHistory;
    private optimizationTimer?;
    private lastOptimization;
    constructor(config: PluginConfig, optimizerConfig?: Partial<PerformanceOptimizerConfig>, targets?: Partial<OptimizationTargets>);
    /**
     * Analizza performance bottlenecks
     */
    analyzeBottlenecks(metrics: OrchestrationMetrics[]): Promise<BottleneckAnalysis[]>;
    /**
     * Genera optimization strategies
     */
    generateOptimizationStrategies(bottlenecks: BottleneckAnalysis[], currentMetrics: OrchestrationMetrics): Promise<OptimizationStrategy[]>;
    /**
     * Esegue optimization strategy
     */
    executeOptimization(strategies: OptimizationStrategy[], dryRun?: boolean): Promise<OptimizationResult>;
    /**
     * Predictive scaling decision
     */
    makePredictiveScalingDecision(currentMetrics: OrchestrationMetrics, forecastHorizon?: number): Promise<PredictiveScalingDecision>;
    /**
     * Optimize resource allocation
     */
    optimizeResourceAllocation(agents: string[], currentAllocation: ResourceAllocation, constraints: {
        totalCPU: number;
        totalMemory: number;
        totalBandwidth: number;
        totalTokenBudget: number;
    }): Promise<ResourceAllocation>;
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(currentMetrics: OrchestrationMetrics): Promise<{
        immediateActions: OptimizationAction[];
        shortTermStrategies: OptimizationStrategy[];
        longTermPlan: string[];
    }>;
    /**
     * Get performance statistics
     */
    getPerformanceStatistics(): {
        optimizationsApplied: number;
        averageImprovement: number;
        costSavings: number;
        uptime: number;
        bottlenecksResolved: number;
    };
    /**
     * Cleanup optimizer resources
     */
    dispose(): void;
    private initializeLoadBalancing;
    private initializeResourceAllocation;
    private startOptimizationEngine;
    private stopOptimizationEngine;
    private performPeriodicOptimization;
    private needsOptimization;
    private analyzeCPUBottleneck;
    private analyzeMemoryBottleneck;
    private analyzeAgentCapacityBottleneck;
    private analyzeModelLatencyBottleneck;
    private analyzeDependencyBottleneck;
    private createStrategiesForBottleneck;
    private mapActionToStrategyType;
    private generateGeneralOptimizationStrategies;
    private getImplementationCost;
    private shouldApplyStrategy;
    private evaluateCondition;
    private executeStrategy;
    private generateActionsForStrategy;
    private executeAction;
    private calculateBaselineMetrics;
    private calculateAverageMetrics;
    private updateImprovementMetrics;
    private extractLessonsLearned;
    private predictFutureLoad;
    private generateScalingRecommendation;
    private calculateScalingTiming;
    private getAgentPerformanceMap;
    private calculateAgentWeights;
    private allocateResource;
    private identifyImmediateActions;
    private generateLongTermPlan;
}
/**
 * Factory per creare PerformanceOptimizer configurato
 */
export declare function createPerformanceOptimizer(config: PluginConfig, optimizerConfig?: Partial<PerformanceOptimizerConfig>, targets?: Partial<OptimizationTargets>): PerformanceOptimizer;
/**
 * Helper per creare optimization targets da performance requirements
 */
export declare function createOptimizationTargets(requirements: {
    maxExecutionTime?: number;
    minSuccessRate?: number;
    maxCostPerTask?: number;
    minThroughput?: number;
}): OptimizationTargets;
/**
 * Helper per validare optimization strategy
 */
export declare function validateOptimizationStrategy(strategy: OptimizationStrategy): string[];
//# sourceMappingURL=PerformanceOptimizer.d.ts.map