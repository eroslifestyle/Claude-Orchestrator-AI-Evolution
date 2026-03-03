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
import type {
  OrchestrationMetrics,
  AgentMetrics,
  PerformanceAlert,
  PatternAnalysisResult
} from '../analytics/AnalyticsEngine';
import type { LearningResult } from '../learning/LearningEngine';
import type { CostPredictionResult } from '../ml/CostPredictionEngine';
import { PluginLogger } from '../utils/logger';

// =============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// =============================================================================

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

// =============================================================================
// PERFORMANCE OPTIMIZER CLASS
// =============================================================================

export class PerformanceOptimizer {
  private config: PluginConfig;
  private optimizerConfig: PerformanceOptimizerConfig;
  private logger: PluginLogger;
  private optimizationTargets: OptimizationTargets;
  private loadBalancingConfig: LoadBalancingConfig;
  private resourceAllocation: ResourceAllocation;
  private activeOptimizations: Map<string, OptimizationResult>;
  private performanceHistory: OrchestrationMetrics[];
  private optimizationTimer?: NodeJS.Timeout;
  private lastOptimization: number;

  constructor(
    config: PluginConfig,
    optimizerConfig?: Partial<PerformanceOptimizerConfig>,
    targets?: Partial<OptimizationTargets>
  ) {
    this.config = config;
    this.logger = new PluginLogger('PerformanceOptimizer');

    // Default configuration
    this.optimizerConfig = {
      enableAutoTuning: true,
      enableLoadBalancing: true,
      targetPerformanceImprovement: 25, // 25% improvement target
      optimizationInterval: 300000, // 5 minutes
      resourceUtilizationThreshold: 0.8,
      agentResponseTimeThreshold: 30000, // 30 seconds
      enablePredictiveScaling: true,
      aggressiveOptimization: false,
      ...optimizerConfig
    };

    // Default optimization targets
    this.optimizationTargets = {
      targetExecutionTime: 120000, // 2 minutes
      targetSuccessRate: 0.95,
      targetCostPerTask: 0.15,
      targetThroughput: 2.0, // 2 tasks per minute
      targetResourceEfficiency: 0.85,
      ...targets
    };

    this.activeOptimizations = new Map();
    this.performanceHistory = [];
    this.lastOptimization = 0;

    // Initialize configurations
    this.initializeLoadBalancing();
    this.initializeResourceAllocation();

    // Start optimization engine
    if (this.optimizerConfig.enableAutoTuning) {
      this.startOptimizationEngine();
    }

    this.logger.info('PerformanceOptimizer initialized', {
      autoTuning: this.optimizerConfig.enableAutoTuning,
      loadBalancing: this.optimizerConfig.enableLoadBalancing,
      targetImprovement: this.optimizerConfig.targetPerformanceImprovement
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Analizza performance bottlenecks
   */
  public async analyzeBottlenecks(
    metrics: OrchestrationMetrics[]
  ): Promise<BottleneckAnalysis[]> {
    const startTime = performance.now();
    this.logger.info('Analyzing performance bottlenecks', {
      metricsCount: metrics.length
    });

    const bottlenecks: BottleneckAnalysis[] = [];

    try {
      // 1. CPU bottleneck analysis
      const cpuBottleneck = this.analyzeCPUBottleneck(metrics);
      if (cpuBottleneck) bottlenecks.push(cpuBottleneck);

      // 2. Memory bottleneck analysis
      const memoryBottleneck = this.analyzeMemoryBottleneck(metrics);
      if (memoryBottleneck) bottlenecks.push(memoryBottleneck);

      // 3. Agent capacity bottleneck analysis
      const agentBottleneck = this.analyzeAgentCapacityBottleneck(metrics);
      if (agentBottleneck) bottlenecks.push(agentBottleneck);

      // 4. Model latency bottleneck analysis
      const modelBottleneck = this.analyzeModelLatencyBottleneck(metrics);
      if (modelBottleneck) bottlenecks.push(modelBottleneck);

      // 5. Dependency bottleneck analysis
      const dependencyBottleneck = this.analyzeDependencyBottleneck(metrics);
      if (dependencyBottleneck) bottlenecks.push(dependencyBottleneck);

      // Sort by severity and impact
      bottlenecks.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;

        return b.impactMetrics.performanceDegradation - a.impactMetrics.performanceDegradation;
      });

      const executionTime = performance.now() - startTime;
      this.logger.info('Bottleneck analysis completed', {
        bottleneckCount: bottlenecks.length,
        executionTime: Math.round(executionTime)
      });

      return bottlenecks;

    } catch (error) {
      this.logger.error('Error in bottleneck analysis', { error });
      return [];
    }
  }

  /**
   * Genera optimization strategies
   */
  public async generateOptimizationStrategies(
    bottlenecks: BottleneckAnalysis[],
    currentMetrics: OrchestrationMetrics
  ): Promise<OptimizationStrategy[]> {
    this.logger.info('Generating optimization strategies', {
      bottleneckCount: bottlenecks.length
    });

    const strategies: OptimizationStrategy[] = [];

    for (const bottleneck of bottlenecks) {
      const bottleneckStrategies = this.createStrategiesForBottleneck(bottleneck, currentMetrics);
      strategies.push(...bottleneckStrategies);
    }

    // Add general optimization strategies
    const generalStrategies = this.generateGeneralOptimizationStrategies(currentMetrics);
    strategies.push(...generalStrategies);

    // Rank strategies by expected ROI
    strategies.sort((a, b) => {
      const roiA = a.expectedImprovement / this.getImplementationCost(a.implementationCost);
      const roiB = b.expectedImprovement / this.getImplementationCost(b.implementationCost);
      return roiB - roiA;
    });

    this.logger.info('Generated optimization strategies', {
      strategyCount: strategies.length,
      topStrategy: strategies[0]?.name
    });

    return strategies.slice(0, 10); // Return top 10 strategies
  }

  /**
   * Esegue optimization strategy
   */
  public async executeOptimization(
    strategies: OptimizationStrategy[],
    dryRun: boolean = false
  ): Promise<OptimizationResult> {
    const sessionId = `opt_${Date.now()}`;
    const startTime = performance.now();

    this.logger.info('Executing optimization', {
      sessionId,
      strategyCount: strategies.length,
      dryRun
    });

    const result: OptimizationResult = {
      sessionId,
      timestamp: Date.now(),
      appliedStrategies: [],
      performanceImprovements: {
        executionTimeImprovement: 0,
        successRateImprovement: 0,
        costReduction: 0,
        throughputImprovement: 0,
        resourceEfficiencyGain: 0
      },
      actionsTaken: [],
      success: true,
      lessonsLearned: []
    };

    try {
      // Get baseline metrics
      const baselineMetrics = this.calculateBaselineMetrics();

      for (const strategy of strategies) {
        if (this.shouldApplyStrategy(strategy, baselineMetrics)) {
          const strategyResult = await this.executeStrategy(strategy, dryRun);

          if (strategyResult.success) {
            result.appliedStrategies.push(strategy);
            result.actionsTaken.push(...strategyResult.actions);

            // Update improvement metrics
            this.updateImprovementMetrics(result.performanceImprovements, strategyResult.improvements);

            this.logger.info('Strategy applied successfully', {
              strategyName: strategy.name,
              improvement: strategyResult.improvements
            });
          }
        }
      }

      // Calculate overall results
      result.success = result.appliedStrategies.length > 0;

      // Generate lessons learned
      result.lessonsLearned = this.extractLessonsLearned(result);

      // Store optimization result
      this.activeOptimizations.set(sessionId, result);

      const executionTime = performance.now() - startTime;
      this.logger.info('Optimization execution completed', {
        sessionId,
        success: result.success,
        strategiesApplied: result.appliedStrategies.length,
        executionTime: Math.round(executionTime)
      });

      return result;

    } catch (error) {
      this.logger.error('Error during optimization execution', { sessionId, error });
      result.success = false;
      return result;
    }
  }

  /**
   * Predictive scaling decision
   */
  public async makePredictiveScalingDecision(
    currentMetrics: OrchestrationMetrics,
    forecastHorizon: number = 3600000 // 1 hour
  ): Promise<PredictiveScalingDecision> {
    if (!this.optimizerConfig.enablePredictiveScaling) {
      throw new Error('Predictive scaling not enabled');
    }

    this.logger.info('Making predictive scaling decision', {
      forecastHorizon: forecastHorizon / 60000 // Convert to minutes
    });

    // Predict future load
    const predictedLoad = await this.predictFutureLoad(currentMetrics, forecastHorizon);

    // Generate scaling recommendation
    const recommendation = this.generateScalingRecommendation(currentMetrics, predictedLoad);

    // Calculate timing
    const timing = this.calculateScalingTiming(predictedLoad, recommendation);

    const decision: PredictiveScalingDecision = {
      timestamp: Date.now(),
      predictedLoad,
      recommendation,
      timing
    };

    this.logger.info('Predictive scaling decision made', {
      action: recommendation.action,
      confidence: recommendation.confidence,
      targetAgentCount: recommendation.targetAgentCount
    });

    return decision;
  }

  /**
   * Optimize resource allocation
   */
  public async optimizeResourceAllocation(
    agents: string[],
    currentAllocation: ResourceAllocation,
    constraints: {
      totalCPU: number;
      totalMemory: number;
      totalBandwidth: number;
      totalTokenBudget: number;
    }
  ): Promise<ResourceAllocation> {
    this.logger.info('Optimizing resource allocation', {
      agentCount: agents.length,
      constraints
    });

    const optimizedAllocation: ResourceAllocation = {
      cpuAllocation: new Map(),
      memoryAllocation: new Map(),
      networkAllocation: new Map(),
      tokenBudgetAllocation: new Map(),
      priorityLevels: new Map()
    };

    // Get agent performance metrics
    const agentPerformanceMap = this.getAgentPerformanceMap();

    // Calculate optimal allocation using weighted fair allocation
    const weights = this.calculateAgentWeights(agents, agentPerformanceMap);

    // Allocate CPU
    this.allocateResource(
      agents,
      weights,
      constraints.totalCPU,
      optimizedAllocation.cpuAllocation
    );

    // Allocate Memory
    this.allocateResource(
      agents,
      weights,
      constraints.totalMemory,
      optimizedAllocation.memoryAllocation
    );

    // Allocate Network Bandwidth
    this.allocateResource(
      agents,
      weights,
      constraints.totalBandwidth,
      optimizedAllocation.networkAllocation
    );

    // Allocate Token Budget
    this.allocateResource(
      agents,
      weights,
      constraints.totalTokenBudget,
      optimizedAllocation.tokenBudgetAllocation
    );

    // Set priority levels
    agents.forEach((agent, index) => {
      optimizedAllocation.priorityLevels.set(agent, weights.get(agent) || 1.0);
    });

    this.logger.info('Resource allocation optimized', {
      totalAgents: agents.length
    });

    return optimizedAllocation;
  }

  /**
   * Get optimization recommendations
   */
  public async getOptimizationRecommendations(
    currentMetrics: OrchestrationMetrics
  ): Promise<{
    immediateActions: OptimizationAction[];
    shortTermStrategies: OptimizationStrategy[];
    longTermPlan: string[];
  }> {
    this.logger.info('Generating optimization recommendations');

    // Analyze current state
    const bottlenecks = await this.analyzeBottlenecks([currentMetrics]);
    const strategies = await this.generateOptimizationStrategies(bottlenecks, currentMetrics);

    // Categorize recommendations
    const immediateActions = this.identifyImmediateActions(bottlenecks, currentMetrics);
    const shortTermStrategies = strategies.filter(s => s.implementationCost !== 'high').slice(0, 5);
    const longTermPlan = this.generateLongTermPlan(currentMetrics);

    return {
      immediateActions,
      shortTermStrategies,
      longTermPlan
    };
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStatistics(): {
    optimizationsApplied: number;
    averageImprovement: number;
    costSavings: number;
    uptime: number;
    bottlenecksResolved: number;
  } {
    const optimizations = Array.from(this.activeOptimizations.values());

    const averageImprovement = optimizations.length > 0
      ? optimizations.reduce((sum, opt) => sum + opt.performanceImprovements.executionTimeImprovement, 0) / optimizations.length
      : 0;

    const costSavings = optimizations.reduce((sum, opt) => sum + opt.performanceImprovements.costReduction, 0);

    return {
      optimizationsApplied: optimizations.length,
      averageImprovement,
      costSavings,
      uptime: Date.now() - this.lastOptimization,
      bottlenecksResolved: optimizations.reduce((sum, opt) => sum + opt.actionsTaken.length, 0)
    };
  }

  /**
   * Cleanup optimizer resources
   */
  public dispose(): void {
    this.stopOptimizationEngine();
    this.activeOptimizations.clear();
    this.performanceHistory = [];
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private initializeLoadBalancing(): void {
    this.loadBalancingConfig = {
      algorithm: 'resource_aware',
      agentPoolManagement: {
        minAgents: 1,
        maxAgents: 10,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3,
        cooldownPeriod: 300000 // 5 minutes
      },
      healthChecks: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 10000, // 10 seconds
        failureThreshold: 3
      }
    };

    this.logger.debug('Load balancing configuration initialized');
  }

  private initializeResourceAllocation(): void {
    this.resourceAllocation = {
      cpuAllocation: new Map(),
      memoryAllocation: new Map(),
      networkAllocation: new Map(),
      tokenBudgetAllocation: new Map(),
      priorityLevels: new Map()
    };

    this.logger.debug('Resource allocation initialized');
  }

  private startOptimizationEngine(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }

    this.optimizationTimer = setInterval(() => {
      this.performPeriodicOptimization();
    }, this.optimizerConfig.optimizationInterval);

    this.logger.info('Optimization engine started', {
      interval: this.optimizerConfig.optimizationInterval
    });
  }

  private stopOptimizationEngine(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = undefined;
    }
  }

  private async performPeriodicOptimization(): Promise<void> {
    if (this.performanceHistory.length === 0) return;

    try {
      const recentMetrics = this.performanceHistory.slice(-10);
      const avgMetrics = this.calculateAverageMetrics(recentMetrics);

      // Check if optimization is needed
      if (this.needsOptimization(avgMetrics)) {
        this.logger.info('Triggering periodic optimization');

        const bottlenecks = await this.analyzeBottlenecks(recentMetrics);
        if (bottlenecks.length > 0) {
          const strategies = await this.generateOptimizationStrategies(bottlenecks, avgMetrics);
          const autoStrategies = strategies.filter(s => s.riskLevel === 'low' && s.implementationCost === 'low');

          if (autoStrategies.length > 0) {
            await this.executeOptimization(autoStrategies.slice(0, 3));
          }
        }
      }

    } catch (error) {
      this.logger.error('Error in periodic optimization', { error });
    }
  }

  private needsOptimization(metrics: OrchestrationMetrics): boolean {
    return (
      metrics.successRate < this.optimizationTargets.targetSuccessRate ||
      metrics.totalExecutionTime > this.optimizationTargets.targetExecutionTime ||
      metrics.totalCost > this.optimizationTargets.targetCostPerTask ||
      metrics.resourceUtilization.cpuUsage > this.optimizerConfig.resourceUtilizationThreshold * 100
    );
  }

  private analyzeCPUBottleneck(metrics: OrchestrationMetrics[]): BottleneckAnalysis | null {
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.resourceUtilization.cpuUsage, 0) / metrics.length;

    if (avgCpuUsage > this.optimizerConfig.resourceUtilizationThreshold * 100) {
      return {
        id: 'cpu_bottleneck',
        type: 'cpu',
        severity: avgCpuUsage > 90 ? 'critical' : 'high',
        affectedComponents: ['orchestrator', 'agents'],
        impactMetrics: {
          performanceDegradation: (avgCpuUsage - 50) / 50 * 100,
          costIncrease: 15,
          userExperienceImpact: 25
        },
        rootCause: `High CPU utilization (${avgCpuUsage.toFixed(1)}%) causing performance degradation`,
        recommendedActions: [
          {
            id: 'scale_cpu',
            type: 'scale_up',
            description: 'Increase CPU allocation or add more agents',
            parameters: { cpuIncrease: 0.5, agentIncrease: 1 },
            expectedImpact: { performanceImprovement: 30, costChange: 20, riskLevel: 0.2 },
            priority: 1,
            autoExecutable: true
          }
        ],
        estimatedResolutionTime: 300000 // 5 minutes
      };
    }

    return null;
  }

  private analyzeMemoryBottleneck(metrics: OrchestrationMetrics[]): BottleneckAnalysis | null {
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.resourceUtilization.memoryUsage, 0) / metrics.length;

    if (avgMemoryUsage > 1500) { // > 1.5GB
      return {
        id: 'memory_bottleneck',
        type: 'memory',
        severity: avgMemoryUsage > 2000 ? 'critical' : 'high',
        affectedComponents: ['orchestrator'],
        impactMetrics: {
          performanceDegradation: (avgMemoryUsage - 1000) / 1000 * 100,
          costIncrease: 10,
          userExperienceImpact: 20
        },
        rootCause: `High memory usage (${avgMemoryUsage.toFixed(0)}MB) may cause performance issues`,
        recommendedActions: [
          {
            id: 'optimize_memory',
            type: 'parameter_adjust',
            description: 'Optimize memory usage and clear caches',
            parameters: { clearCaches: true, reduceBuffers: true },
            expectedImpact: { performanceImprovement: 25, costChange: 0, riskLevel: 0.1 },
            priority: 1,
            autoExecutable: true
          }
        ],
        estimatedResolutionTime: 60000 // 1 minute
      };
    }

    return null;
  }

  private analyzeAgentCapacityBottleneck(metrics: OrchestrationMetrics[]): BottleneckAnalysis | null {
    const avgAgentCount = metrics.reduce((sum, m) => sum + m.agentCount, 0) / metrics.length;
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.totalExecutionTime, 0) / metrics.length;

    // Check if we're consistently using many agents with long execution times
    if (avgAgentCount > 3 && avgExecutionTime > 180000) { // 3 minutes
      return {
        id: 'agent_capacity_bottleneck',
        type: 'agent_capacity',
        severity: 'medium',
        affectedComponents: ['agent_pool'],
        impactMetrics: {
          performanceDegradation: 20,
          costIncrease: 25,
          userExperienceImpact: 15
        },
        rootCause: 'High agent utilization with long execution times suggests capacity constraints',
        recommendedActions: [
          {
            id: 'optimize_agent_selection',
            type: 'agent_swap',
            description: 'Optimize agent selection for better performance',
            parameters: { preferFasterAgents: true, optimizeParallelism: true },
            expectedImpact: { performanceImprovement: 20, costChange: -5, riskLevel: 0.3 },
            priority: 2,
            autoExecutable: false
          }
        ],
        estimatedResolutionTime: 600000 // 10 minutes
      };
    }

    return null;
  }

  private analyzeModelLatencyBottleneck(metrics: OrchestrationMetrics[]): BottleneckAnalysis | null {
    // Analyze if model selection is causing latency
    const slowAgents = metrics.flatMap(m => m.agentPerformance)
      .filter(agent => agent.executionTime > this.optimizerConfig.agentResponseTimeThreshold);

    if (slowAgents.length > 0) {
      const avgSlowTime = slowAgents.reduce((sum, agent) => sum + agent.executionTime, 0) / slowAgents.length;

      return {
        id: 'model_latency_bottleneck',
        type: 'model_latency',
        severity: avgSlowTime > 60000 ? 'high' : 'medium',
        affectedComponents: slowAgents.map(a => a.agentName),
        impactMetrics: {
          performanceDegradation: (avgSlowTime - 30000) / 30000 * 100,
          costIncrease: 0,
          userExperienceImpact: 30
        },
        rootCause: `Slow agent responses averaging ${(avgSlowTime / 1000).toFixed(1)}s`,
        recommendedActions: [
          {
            id: 'optimize_model_selection',
            type: 'model_change',
            description: 'Switch to faster models for time-sensitive tasks',
            parameters: { preferHaiku: true, limitOpus: true },
            expectedImpact: { performanceImprovement: 40, costChange: -10, riskLevel: 0.2 },
            priority: 1,
            autoExecutable: true
          }
        ],
        estimatedResolutionTime: 120000 // 2 minutes
      };
    }

    return null;
  }

  private analyzeDependencyBottleneck(metrics: OrchestrationMetrics[]): BottleneckAnalysis | null {
    // Check for dependency-related delays (simplified analysis)
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;

    if (avgThroughput < this.optimizationTargets.targetThroughput * 0.7) {
      return {
        id: 'dependency_bottleneck',
        type: 'dependency_wait',
        severity: 'medium',
        affectedComponents: ['dependency_graph'],
        impactMetrics: {
          performanceDegradation: (this.optimizationTargets.targetThroughput - avgThroughput) / this.optimizationTargets.targetThroughput * 100,
          costIncrease: 5,
          userExperienceImpact: 20
        },
        rootCause: `Low throughput (${avgThroughput.toFixed(2)}) suggests dependency bottlenecks`,
        recommendedActions: [
          {
            id: 'optimize_parallelism',
            type: 'rebalance',
            description: 'Optimize task parallelization',
            parameters: { increaseParallelism: true, optimizeDependencies: true },
            expectedImpact: { performanceImprovement: 25, costChange: 5, riskLevel: 0.3 },
            priority: 2,
            autoExecutable: false
          }
        ],
        estimatedResolutionTime: 300000 // 5 minutes
      };
    }

    return null;
  }

  private createStrategiesForBottleneck(
    bottleneck: BottleneckAnalysis,
    metrics: OrchestrationMetrics
  ): OptimizationStrategy[] {
    const strategies: OptimizationStrategy[] = [];

    bottleneck.recommendedActions.forEach(action => {
      const strategy: OptimizationStrategy = {
        name: `Resolve ${bottleneck.type} bottleneck`,
        type: this.mapActionToStrategyType(action.type),
        priority: bottleneck.severity === 'critical' ? 'critical' : 'high',
        expectedImprovement: action.expectedImpact.performanceImprovement,
        implementationCost: action.expectedImpact.riskLevel > 0.5 ? 'high' : 'low',
        riskLevel: action.expectedImpact.riskLevel > 0.5 ? 'high' : 'low',
        parameters: action.parameters,
        applicabilityConditions: [`Bottleneck ${bottleneck.id} detected`]
      };

      strategies.push(strategy);
    });

    return strategies;
  }

  private mapActionToStrategyType(actionType: OptimizationAction['type']): OptimizationStrategy['type'] {
    const mapping: Record<OptimizationAction['type'], OptimizationStrategy['type']> = {
      'scale_up': 'resource_scaling',
      'scale_down': 'resource_scaling',
      'rebalance': 'load_balancing',
      'parameter_adjust': 'parameter_tuning',
      'agent_swap': 'agent_selection',
      'model_change': 'model_optimization'
    };

    return mapping[actionType] || 'parameter_tuning';
  }

  private generateGeneralOptimizationStrategies(metrics: OrchestrationMetrics): OptimizationStrategy[] {
    const strategies: OptimizationStrategy[] = [];

    // Cost optimization strategy
    if (metrics.totalCost > this.optimizationTargets.targetCostPerTask) {
      strategies.push({
        name: 'Cost Optimization',
        type: 'model_optimization',
        priority: 'medium',
        expectedImprovement: 15,
        implementationCost: 'low',
        riskLevel: 'low',
        parameters: { optimizeModelSelection: true, preferCostEffective: true },
        applicabilityConditions: ['High cost detected']
      });
    }

    // Performance optimization strategy
    if (metrics.totalExecutionTime > this.optimizationTargets.targetExecutionTime) {
      strategies.push({
        name: 'Performance Optimization',
        type: 'parameter_tuning',
        priority: 'high',
        expectedImprovement: 20,
        implementationCost: 'medium',
        riskLevel: 'medium',
        parameters: { optimizeParallelism: true, tuneCacheSettings: true },
        applicabilityConditions: ['Slow execution detected']
      });
    }

    // Success rate improvement
    if (metrics.successRate < this.optimizationTargets.targetSuccessRate) {
      strategies.push({
        name: 'Success Rate Improvement',
        type: 'agent_selection',
        priority: 'critical',
        expectedImprovement: 10,
        implementationCost: 'low',
        riskLevel: 'low',
        parameters: { improveAgentMatching: true, addFallbacks: true },
        applicabilityConditions: ['Low success rate detected']
      });
    }

    return strategies;
  }

  private getImplementationCost(cost: OptimizationStrategy['implementationCost']): number {
    const costMap = { low: 1, medium: 3, high: 5 };
    return costMap[cost];
  }

  private shouldApplyStrategy(strategy: OptimizationStrategy, metrics: OrchestrationMetrics): boolean {
    // Check applicability conditions
    return strategy.applicabilityConditions.every(condition => {
      return this.evaluateCondition(condition, metrics);
    });
  }

  private evaluateCondition(condition: string, metrics: OrchestrationMetrics): boolean {
    // Simple condition evaluation (would be more sophisticated in real implementation)
    if (condition.includes('High cost') && metrics.totalCost > this.optimizationTargets.targetCostPerTask) {
      return true;
    }
    if (condition.includes('Slow execution') && metrics.totalExecutionTime > this.optimizationTargets.targetExecutionTime) {
      return true;
    }
    if (condition.includes('Low success rate') && metrics.successRate < this.optimizationTargets.targetSuccessRate) {
      return true;
    }
    if (condition.includes('bottleneck')) {
      return true; // Assume bottleneck conditions are already validated
    }

    return false;
  }

  private async executeStrategy(
    strategy: OptimizationStrategy,
    dryRun: boolean
  ): Promise<{
    success: boolean;
    actions: OptimizationAction[];
    improvements: any;
  }> {
    this.logger.debug('Executing optimization strategy', {
      strategyName: strategy.name,
      dryRun
    });

    // Generate actions for strategy
    const actions = this.generateActionsForStrategy(strategy);

    if (dryRun) {
      return {
        success: true,
        actions,
        improvements: { improvement: strategy.expectedImprovement }
      };
    }

    // Execute actions
    let success = true;
    const executedActions: OptimizationAction[] = [];

    for (const action of actions) {
      if (action.autoExecutable || this.optimizerConfig.aggressiveOptimization) {
        const actionResult = await this.executeAction(action);
        if (actionResult.success) {
          executedActions.push(action);
        } else {
          success = false;
          break;
        }
      }
    }

    return {
      success,
      actions: executedActions,
      improvements: { improvement: strategy.expectedImprovement * (executedActions.length / actions.length) }
    };
  }

  private generateActionsForStrategy(strategy: OptimizationStrategy): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    // Generate actions based on strategy type
    switch (strategy.type) {
      case 'parameter_tuning':
        actions.push({
          id: `tune_${Date.now()}`,
          type: 'parameter_adjust',
          description: 'Tune orchestration parameters',
          parameters: strategy.parameters,
          expectedImpact: {
            performanceImprovement: strategy.expectedImprovement,
            costChange: 0,
            riskLevel: 0.2
          },
          priority: 1,
          autoExecutable: true
        });
        break;

      case 'resource_scaling':
        actions.push({
          id: `scale_${Date.now()}`,
          type: 'scale_up',
          description: 'Scale resources based on demand',
          parameters: strategy.parameters,
          expectedImpact: {
            performanceImprovement: strategy.expectedImprovement,
            costChange: 10,
            riskLevel: 0.3
          },
          priority: 1,
          autoExecutable: false
        });
        break;

      case 'model_optimization':
        actions.push({
          id: `model_${Date.now()}`,
          type: 'model_change',
          description: 'Optimize model selection',
          parameters: strategy.parameters,
          expectedImpact: {
            performanceImprovement: strategy.expectedImprovement,
            costChange: -5,
            riskLevel: 0.2
          },
          priority: 1,
          autoExecutable: true
        });
        break;
    }

    return actions;
  }

  private async executeAction(action: OptimizationAction): Promise<{ success: boolean }> {
    // Simulate action execution
    this.logger.debug('Executing optimization action', {
      actionId: action.id,
      actionType: action.type
    });

    // In real implementation, this would perform actual optimizations
    // For now, we simulate success
    return { success: true };
  }

  private calculateBaselineMetrics(): OrchestrationMetrics {
    if (this.performanceHistory.length === 0) {
      // Return default metrics
      return {
        timestamp: Date.now(),
        sessionId: 'baseline',
        taskType: 'baseline',
        agentCount: 2,
        totalExecutionTime: 120000,
        successRate: 0.85,
        throughput: 1.0,
        totalCost: 0.15,
        errorRate: 0.15,
        resourceUtilization: {
          cpuUsage: 50,
          memoryUsage: 512,
          tokenUsage: 1000,
          apiCallCount: 5,
          networkLatency: 150
        },
        agentPerformance: []
      };
    }

    return this.calculateAverageMetrics(this.performanceHistory.slice(-5));
  }

  private calculateAverageMetrics(metrics: OrchestrationMetrics[]): OrchestrationMetrics {
    if (metrics.length === 0) {
      return this.calculateBaselineMetrics();
    }

    const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      timestamp: Date.now(),
      sessionId: 'average',
      taskType: 'average',
      agentCount: Math.round(avg(metrics.map(m => m.agentCount))),
      totalExecutionTime: avg(metrics.map(m => m.totalExecutionTime)),
      successRate: avg(metrics.map(m => m.successRate)),
      throughput: avg(metrics.map(m => m.throughput)),
      totalCost: avg(metrics.map(m => m.totalCost)),
      errorRate: avg(metrics.map(m => m.errorRate)),
      resourceUtilization: {
        cpuUsage: avg(metrics.map(m => m.resourceUtilization.cpuUsage)),
        memoryUsage: avg(metrics.map(m => m.resourceUtilization.memoryUsage)),
        tokenUsage: avg(metrics.map(m => m.resourceUtilization.tokenUsage)),
        apiCallCount: avg(metrics.map(m => m.resourceUtilization.apiCallCount)),
        networkLatency: avg(metrics.map(m => m.resourceUtilization.networkLatency))
      },
      agentPerformance: []
    };
  }

  private updateImprovementMetrics(
    current: OptimizationResult['performanceImprovements'],
    addition: any
  ): void {
    if (addition.improvement) {
      current.executionTimeImprovement += addition.improvement;
    }
  }

  private extractLessonsLearned(result: OptimizationResult): string[] {
    const lessons: string[] = [];

    if (result.appliedStrategies.length > 0) {
      lessons.push(`Successfully applied ${result.appliedStrategies.length} optimization strategies`);
    }

    if (result.performanceImprovements.executionTimeImprovement > 20) {
      lessons.push('Significant performance improvements achieved through optimization');
    }

    if (result.performanceImprovements.costReduction > 10) {
      lessons.push('Cost optimization strategies proved effective');
    }

    return lessons;
  }

  private async predictFutureLoad(
    currentMetrics: OrchestrationMetrics,
    forecastHorizon: number
  ): Promise<PredictiveScalingDecision['predictedLoad']> {
    // Simplified load prediction (in real implementation, would use ML models)
    const baseUtilization = currentMetrics.resourceUtilization.cpuUsage / 100;
    const growthFactor = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation

    return {
      agentUtilization: Math.min(baseUtilization * growthFactor, 1.0),
      requestVolume: currentMetrics.throughput * growthFactor,
      resourceDemand: {
        cpuDemand: Math.min(baseUtilization * growthFactor, 1.0),
        memoryDemand: currentMetrics.resourceUtilization.memoryUsage * growthFactor,
        networkDemand: 10 * growthFactor, // Simplified
        tokenConsumptionRate: currentMetrics.resourceUtilization.tokenUsage * growthFactor,
        confidence: 0.75
      }
    };
  }

  private generateScalingRecommendation(
    currentMetrics: OrchestrationMetrics,
    predictedLoad: PredictiveScalingDecision['predictedLoad']
  ): PredictiveScalingDecision['recommendation'] {
    const currentAgentCount = currentMetrics.agentCount;
    let targetAgentCount = currentAgentCount;
    let action: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';

    if (predictedLoad.agentUtilization > this.loadBalancingConfig.agentPoolManagement.scaleUpThreshold) {
      action = 'scale_up';
      targetAgentCount = Math.min(
        currentAgentCount + 1,
        this.loadBalancingConfig.agentPoolManagement.maxAgents
      );
    } else if (predictedLoad.agentUtilization < this.loadBalancingConfig.agentPoolManagement.scaleDownThreshold) {
      action = 'scale_down';
      targetAgentCount = Math.max(
        currentAgentCount - 1,
        this.loadBalancingConfig.agentPoolManagement.minAgents
      );
    }

    return {
      action,
      targetAgentCount,
      confidence: predictedLoad.resourceDemand.confidence,
      reasoning: [
        `Predicted utilization: ${(predictedLoad.agentUtilization * 100).toFixed(1)}%`,
        `Current agents: ${currentAgentCount}, target: ${targetAgentCount}`,
        `Action: ${action} based on threshold analysis`
      ]
    };
  }

  private calculateScalingTiming(
    predictedLoad: PredictiveScalingDecision['predictedLoad'],
    recommendation: PredictiveScalingDecision['recommendation']
  ): PredictiveScalingDecision['timing'] {
    const now = Date.now();

    return {
      predictedPeakTime: now + 30 * 60 * 1000, // 30 minutes from now
      preparationTime: 5 * 60 * 1000, // 5 minutes to prepare
      executionDeadline: now + 25 * 60 * 1000 // Execute 5 minutes before peak
    };
  }

  private getAgentPerformanceMap(): Map<string, AgentMetrics> {
    const performanceMap = new Map<string, AgentMetrics>();

    // Get agent performance from recent metrics
    this.performanceHistory.slice(-5).forEach(metrics => {
      metrics.agentPerformance.forEach(agent => {
        if (performanceMap.has(agent.agentName)) {
          const existing = performanceMap.get(agent.agentName)!;
          // Update with moving average
          existing.successRate = (existing.successRate + agent.successRate) / 2;
          existing.executionTime = (existing.executionTime + agent.executionTime) / 2;
          existing.qualityScore = (existing.qualityScore + agent.qualityScore) / 2;
        } else {
          performanceMap.set(agent.agentName, { ...agent });
        }
      });
    });

    return performanceMap;
  }

  private calculateAgentWeights(
    agents: string[],
    performanceMap: Map<string, AgentMetrics>
  ): Map<string, number> {
    const weights = new Map<string, number>();

    agents.forEach(agent => {
      const performance = performanceMap.get(agent);
      let weight = 1.0; // Default weight

      if (performance) {
        // Weight based on performance metrics
        weight = (
          performance.successRate * 0.4 +
          performance.qualityScore * 0.3 +
          performance.costEfficiency * 0.2 +
          performance.completionRate * 0.1
        );
      }

      weights.set(agent, weight);
    });

    return weights;
  }

  private allocateResource(
    agents: string[],
    weights: Map<string, number>,
    totalResource: number,
    allocation: Map<string, number>
  ): void {
    const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);

    agents.forEach(agent => {
      const weight = weights.get(agent) || 1.0;
      const resourceShare = (weight / totalWeight) * totalResource;
      allocation.set(agent, resourceShare);
    });
  }

  private identifyImmediateActions(
    bottlenecks: BottleneckAnalysis[],
    metrics: OrchestrationMetrics
  ): OptimizationAction[] {
    const actions: OptimizationAction[] = [];

    // Add critical bottleneck actions
    bottlenecks
      .filter(b => b.severity === 'critical')
      .forEach(bottleneck => {
        actions.push(...bottleneck.recommendedActions.filter(a => a.autoExecutable));
      });

    // Add resource-based immediate actions
    if (metrics.resourceUtilization.cpuUsage > 90) {
      actions.push({
        id: 'immediate_cpu_relief',
        type: 'scale_up',
        description: 'Immediate CPU relief through resource scaling',
        parameters: { cpuIncrease: 0.3 },
        expectedImpact: { performanceImprovement: 25, costChange: 15, riskLevel: 0.2 },
        priority: 1,
        autoExecutable: true
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  private generateLongTermPlan(metrics: OrchestrationMetrics): string[] {
    const plan: string[] = [];

    plan.push('Implement comprehensive performance monitoring');
    plan.push('Develop predictive analytics for proactive optimization');

    if (metrics.totalCost > this.optimizationTargets.targetCostPerTask * 1.2) {
      plan.push('Establish cost governance and optimization policies');
    }

    if (metrics.successRate < this.optimizationTargets.targetSuccessRate) {
      plan.push('Invest in agent specialization and training data');
    }

    plan.push('Build automated optimization pipeline');
    plan.push('Create performance benchmarking and regression testing');

    return plan;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Factory per creare PerformanceOptimizer configurato
 */
export function createPerformanceOptimizer(
  config: PluginConfig,
  optimizerConfig?: Partial<PerformanceOptimizerConfig>,
  targets?: Partial<OptimizationTargets>
): PerformanceOptimizer {
  return new PerformanceOptimizer(config, optimizerConfig, targets);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper per creare optimization targets da performance requirements
 */
export function createOptimizationTargets(
  requirements: {
    maxExecutionTime?: number;
    minSuccessRate?: number;
    maxCostPerTask?: number;
    minThroughput?: number;
  }
): OptimizationTargets {
  return {
    targetExecutionTime: requirements.maxExecutionTime || 120000,
    targetSuccessRate: requirements.minSuccessRate || 0.95,
    targetCostPerTask: requirements.maxCostPerTask || 0.15,
    targetThroughput: requirements.minThroughput || 2.0,
    targetResourceEfficiency: 0.85
  };
}

/**
 * Helper per validare optimization strategy
 */
export function validateOptimizationStrategy(strategy: OptimizationStrategy): string[] {
  const errors: string[] = [];

  if (!strategy.name) errors.push('Strategy name required');
  if (strategy.expectedImprovement < 0) errors.push('Expected improvement must be positive');
  if (strategy.expectedImprovement > 100) errors.push('Expected improvement cannot exceed 100%');
  if (!strategy.applicabilityConditions || strategy.applicabilityConditions.length === 0) {
    errors.push('At least one applicability condition required');
  }

  return errors;
}