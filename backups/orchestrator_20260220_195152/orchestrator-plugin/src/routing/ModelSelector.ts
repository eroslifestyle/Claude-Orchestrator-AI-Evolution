/**
 * ModelSelector - Intelligent Model Selection & Auto-Escalation
 *
 * Implementazione Claude Systems Expert con algoritmo di selezione
 * haiku/sonnet/opus, auto-escalation logic e cost optimization.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author Claude Systems Expert Agent
 * @date 30 Gennaio 2026
 */

import type {
  ModelType
} from '../types';

import type {
  ComplexityLevel
} from '../analysis/types';

import { PluginLogger } from '../utils/logger';

// =============================================================================
// MODEL SELECTION INTERFACES
// =============================================================================

interface ModelCapabilities {
  model: ModelType;
  costPer1kTokens: number;
  avgLatencyMs: number;
  maxContextTokens: number;
  reasoningCapability: number; // 0.0-1.0
  creativityLevel: number; // 0.0-1.0
  precisionLevel: number; // 0.0-1.0
  multilingualSupport: number; // 0.0-1.0
  codeGenerationQuality: number; // 0.0-1.0
  problemSolvingStrength: number; // 0.0-1.0
}

interface ModelSelectionCriteria {
  complexity: ComplexityLevel;
  domainRequirements: DomainRequirement[];
  budgetConstraints: BudgetConstraints;
  performanceRequirements: PerformanceRequirements;
  qualityRequirements: QualityRequirements;
  contextSize: number;
  estimatedTokens: number;
}

interface DomainRequirement {
  domain: string;
  requiresCreativity: boolean;
  requiresPrecision: boolean;
  requiresReasoning: boolean;
  requiresSpeed: boolean;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface BudgetConstraints {
  maxCostPerTask: number;
  dailyBudgetLimit: number;
  currentSpending: number;
  costSensitivity: 'low' | 'medium' | 'high';
  optimizationStrategy: 'cost_first' | 'balanced' | 'quality_first';
}

interface PerformanceRequirements {
  maxLatencyMs: number;
  throughputRequirement: number; // tasks/minute
  concurrencyLevel: number;
  realTimeRequired: boolean;
}

interface QualityRequirements {
  minAccuracy: number; // 0.0-1.0
  consistencyImportance: number; // 0.0-1.0
  innovationRequired: boolean;
  riskTolerance: 'low' | 'medium' | 'high';
}

interface ModelSelectionResult {
  selectedModel: ModelType;
  confidence: number;
  reasoning: string;
  alternatives: ModelAlternative[];
  estimatedCost: number;
  estimatedLatency: number;
  escalationTriggers: EscalationTrigger[];
  fallbackPlan: ModelFallbackPlan;
}

interface ModelAlternative {
  model: ModelType;
  score: number;
  reason: string;
  costDelta: number;
  qualityDelta: number;
}

interface EscalationTrigger {
  condition: EscalationCondition;
  fromModel: ModelType;
  toModel: ModelType;
  threshold: number;
  autoTrigger: boolean;
  cooldownMinutes: number;
}

type EscalationCondition =
  | 'failure_rate_high'
  | 'quality_below_threshold'
  | 'complexity_underestimated'
  | 'processing_time_exceeded'
  | 'user_dissatisfaction'
  | 'cost_efficiency_poor';

interface ModelFallbackPlan {
  fallbackSequence: ModelType[];
  fallbackCriteria: string[];
  emergencyModel: ModelType;
  maxFallbackAttempts: number;
}

interface ModelPerformanceMetrics {
  model: ModelType;
  successRate: number;
  avgQualityScore: number;
  avgLatency: number;
  avgCostPerTask: number;
  escalationRate: number;
  userSatisfactionScore: number;
  totalUsage: number;
  failurePatterns: FailurePattern[];
}

interface FailurePattern {
  description: string;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  suggestedEscalation: ModelType;
  preventionStrategy: string;
}

interface CostOptimizationStrategy {
  strategy: 'aggressive' | 'balanced' | 'conservative';
  targetCostReduction: number; // percentage
  qualityTradeoffAcceptable: boolean;
  cachingEnabled: boolean;
  batchingEnabled: boolean;
  offPeakScheduling: boolean;
}

// =============================================================================
// MODEL SELECTOR CLASS
// =============================================================================

export class ModelSelector {
  private logger: PluginLogger;
  private modelCapabilities: Map<ModelType, ModelCapabilities>;
  private performanceMetrics: Map<ModelType, ModelPerformanceMetrics>;
  private escalationHistory: EscalationEvent[];
  private globalBudgetTracker!: BudgetTracker;

  constructor() {
    this.logger = new PluginLogger('ModelSelector');
    this.modelCapabilities = new Map();
    this.performanceMetrics = new Map();
    this.escalationHistory = [];

    this.initializeModelCapabilities();
    this.initializePerformanceMetrics();
    this.initializeBudgetTracker();

    this.logger.info('ModelSelector initialized with intelligent selection algorithms');
  }

  // =============================================================================
  // PUBLIC SELECTION API
  // =============================================================================

  /**
   * Select optimal model based on task requirements
   */
  async selectModel(criteria: ModelSelectionCriteria): Promise<ModelSelectionResult> {
    this.logger.debug('Starting model selection', { criteria });

    try {
      // Analyze task requirements
      const requirements = this.analyzeRequirements(criteria);

      // Calculate model scores
      const modelScores = this.calculateModelScores(requirements);

      // Apply budget constraints
      const budgetFilteredScores = this.applyBudgetConstraints(modelScores, criteria.budgetConstraints);

      // Select primary model
      const selectedModel = this.selectPrimaryModel(budgetFilteredScores);

      // Calculate confidence and alternatives
      const confidence = this.calculateSelectionConfidence(selectedModel, budgetFilteredScores);
      const alternatives = this.generateAlternatives(budgetFilteredScores, selectedModel);

      // Generate escalation triggers
      const escalationTriggers = this.generateEscalationTriggers(selectedModel, criteria);

      // Create fallback plan
      const fallbackPlan = this.createFallbackPlan(selectedModel, alternatives);

      // Generate reasoning
      const reasoning = this.generateSelectionReasoning(selectedModel, requirements, confidence);

      // Estimate costs and latency
      const { cost, latency } = this.estimateModelExecution(selectedModel, criteria);

      const result: ModelSelectionResult = {
        selectedModel,
        confidence,
        reasoning,
        alternatives,
        estimatedCost: cost,
        estimatedLatency: latency,
        escalationTriggers,
        fallbackPlan
      };

      // Update budget tracking
      this.updateBudgetTracking(selectedModel, cost);

      this.logger.info('Model selection completed', {
        selectedModel,
        confidence,
        estimatedCost: cost
      });

      return result;

    } catch (error) {
      this.logger.error('Model selection failed', { error, criteria });
      return this.createEmergencySelection();
    }
  }

  /**
   * Auto-escalate model based on failure patterns
   */
  async autoEscalate(
    currentModel: ModelType,
    failureContext: FailureContext
  ): Promise<ModelSelectionResult | null> {
    this.logger.debug('Evaluating auto-escalation', { currentModel, failureContext });

    const escalationRule = this.findApplicableEscalationRule(currentModel, failureContext);
    if (!escalationRule) {
      this.logger.debug('No escalation rule applicable');
      return null;
    }

    // Check cooldown period
    if (this.isInCooldownPeriod(escalationRule)) {
      this.logger.debug('Escalation in cooldown period');
      return null;
    }

    // Check budget constraints for escalation
    const targetModel = escalationRule.toModel;
    const escalationCost = this.estimateEscalationCost(currentModel, targetModel);

    if (!this.canAffordEscalation(escalationCost)) {
      this.logger.warn('Cannot afford model escalation', {
        from: currentModel,
        to: targetModel,
        cost: escalationCost
      });
      return null;
    }

    // Record escalation event
    this.recordEscalationEvent({
      timestamp: new Date(),
      fromModel: currentModel,
      toModel: targetModel,
      reason: failureContext.reason,
      automatic: true,
      cost: escalationCost
    });

    this.logger.info('Auto-escalating model', {
      from: currentModel,
      to: targetModel,
      reason: failureContext.reason
    });

    // Create escalated selection
    return this.createEscalatedSelection(targetModel, escalationRule, failureContext);
  }

  /**
   * Optimize model selection for cost efficiency
   */
  async optimizeForCost(
    currentSelection: ModelSelectionResult,
    qualityThreshold: number = 0.8
  ): Promise<ModelSelectionResult> {
    this.logger.debug('Optimizing model selection for cost', {
      currentModel: currentSelection.selectedModel,
      currentCost: currentSelection.estimatedCost
    });

    const optimizationResults: ModelOptimizationResult[] = [];

    // Test downgrade options
    const downgrades = this.getModelDowngrades(currentSelection.selectedModel);

    for (const downgrade of downgrades) {
      const performance = this.performanceMetrics.get(downgrade);
      if (performance && performance.avgQualityScore >= qualityThreshold) {
        const costSavings = this.calculateCostSavings(currentSelection.selectedModel, downgrade);
        optimizationResults.push({
          model: downgrade,
          costSavings,
          qualityImpact: performance.avgQualityScore,
          riskLevel: this.assessDowngradeRisk(currentSelection.selectedModel, downgrade)
        });
      }
    }

    // Select best optimization
    if (optimizationResults.length > 0) {
      const bestOptimization = optimizationResults.reduce((best, current) =>
        current.costSavings > best.costSavings ? current : best
      );

      if (bestOptimization.costSavings > 0.20) { // 20% savings threshold
        return this.createOptimizedSelection(bestOptimization, currentSelection);
      }
    }

    return currentSelection; // No optimization beneficial
  }

  /**
   * Get model performance analytics
   */
  getModelAnalytics(): ModelAnalytics {
    const analytics: ModelAnalytics = {
      modelComparison: this.generateModelComparison(),
      escalationAnalysis: this.analyzeEscalationPatterns(),
      costEfficiencyMetrics: this.calculateCostEfficiencyMetrics(),
      qualityTrends: this.analyzeQualityTrends(),
      recommendations: this.generateModelRecommendations()
    };

    return analytics;
  }

  // =============================================================================
  // PRIVATE SELECTION LOGIC
  // =============================================================================

  private analyzeRequirements(criteria: ModelSelectionCriteria): TaskRequirements {
    const requirements: TaskRequirements = {
      creativity: 0,
      reasoning: 0,
      precision: 0,
      speed: 0,
      costSensitivity: 0
    };

    // Analyze complexity impact
    const complexityWeights: Record<ComplexityLevel, { reasoning: number; creativity: number; precision: number; speed: number }> = {
      low: { reasoning: 0.3, creativity: 0.2, precision: 0.6, speed: 0.8 },
      medium: { reasoning: 0.6, creativity: 0.4, precision: 0.7, speed: 0.6 },
      high: { reasoning: 0.8, creativity: 0.7, precision: 0.8, speed: 0.4 },
      extreme: { reasoning: 1.0, creativity: 0.9, precision: 0.9, speed: 0.2 }
    };

    const weights = complexityWeights[criteria.complexity];
    Object.assign(requirements, weights);

    // Analyze domain requirements
    criteria.domainRequirements.forEach(domain => {
      if (domain.requiresCreativity) requirements.creativity += 0.2;
      if (domain.requiresPrecision) requirements.precision += 0.2;
      if (domain.requiresReasoning) requirements.reasoning += 0.2;
      if (domain.requiresSpeed) requirements.speed += 0.2;
    });

    // Apply budget sensitivity
    const budgetSensitivity = {
      low: 0.2,
      medium: 0.5,
      high: 0.8
    };
    requirements.costSensitivity = budgetSensitivity[criteria.budgetConstraints.costSensitivity];

    // Normalize requirements to 0-1 range
    Object.keys(requirements).forEach(key => {
      requirements[key as keyof TaskRequirements] = Math.min(requirements[key as keyof TaskRequirements], 1.0);
    });

    return requirements;
  }

  private calculateModelScores(requirements: TaskRequirements): Map<ModelType, number> {
    const scores = new Map<ModelType, number>();

    Array.from(this.modelCapabilities.entries()).forEach(([model, capabilities]) => {
      const score =
        capabilities.creativityLevel * requirements.creativity * 0.25 +
        capabilities.reasoningCapability * requirements.reasoning * 0.25 +
        capabilities.precisionLevel * requirements.precision * 0.25 +
        (1 - capabilities.avgLatencyMs / 10000) * requirements.speed * 0.15 + // Speed inverse to latency
        (1 - capabilities.costPer1kTokens / 0.15) * requirements.costSensitivity * 0.1; // Cost inverse

      scores.set(model, Math.max(0, Math.min(1, score)));
    });

    return scores;
  }

  private applyBudgetConstraints(
    modelScores: Map<ModelType, number>,
    budgetConstraints: BudgetConstraints
  ): Map<ModelType, number> {
    const constrainedScores = new Map<ModelType, number>();

    Array.from(modelScores.entries()).forEach(([model, score]) => {
      const capabilities = this.modelCapabilities.get(model)!;
      const estimatedCost = capabilities.costPer1kTokens * 10; // Assume 10k tokens avg

      // Check if model is within budget
      if (estimatedCost <= budgetConstraints.maxCostPerTask) {
        // Apply budget optimization strategy
        let adjustedScore = score;

        if (budgetConstraints.optimizationStrategy === 'cost_first') {
          adjustedScore *= (1 - estimatedCost / budgetConstraints.maxCostPerTask);
        } else if (budgetConstraints.optimizationStrategy === 'balanced') {
          adjustedScore *= (1 - (estimatedCost / budgetConstraints.maxCostPerTask) * 0.5);
        }
        // 'quality_first' keeps original score

        constrainedScores.set(model, adjustedScore);
      }
    });

    return constrainedScores;
  }

  private selectPrimaryModel(modelScores: Map<ModelType, number>): ModelType {
    if (modelScores.size === 0) return 'haiku'; // Emergency fallback

    let bestModel: ModelType = 'haiku';
    let bestScore = -1;

    Array.from(modelScores.entries()).forEach(([model, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    });

    return bestModel;
  }

  private generateEscalationTriggers(
    selectedModel: ModelType,
    criteria: ModelSelectionCriteria
  ): EscalationTrigger[] {
    const triggers: EscalationTrigger[] = [];

    // Always include failure rate trigger
    triggers.push({
      condition: 'failure_rate_high',
      fromModel: selectedModel,
      toModel: this.getNextModelUp(selectedModel),
      threshold: 0.3, // 30% failure rate
      autoTrigger: true,
      cooldownMinutes: 10
    });

    // Add quality trigger for high-precision tasks
    const hasPrecisionRequirement = criteria.domainRequirements.some(d => d.requiresPrecision);
    if (hasPrecisionRequirement) {
      triggers.push({
        condition: 'quality_below_threshold',
        fromModel: selectedModel,
        toModel: this.getNextModelUp(selectedModel),
        threshold: 0.8, // 80% quality threshold
        autoTrigger: true,
        cooldownMinutes: 15
      });
    }

    // Add complexity trigger for complex tasks
    if (criteria.complexity === 'high' || criteria.complexity === 'extreme') {
      triggers.push({
        condition: 'complexity_underestimated',
        fromModel: selectedModel,
        toModel: 'opus', // Go straight to opus for complex tasks
        threshold: 0.7,
        autoTrigger: false, // Manual approval for opus
        cooldownMinutes: 30
      });
    }

    return triggers;
  }

  private getNextModelUp(currentModel: ModelType): ModelType {
    const hierarchy: ModelType[] = ['haiku', 'sonnet', 'opus'];
    const currentIndex = hierarchy.indexOf(currentModel);

    if (currentIndex < hierarchy.length - 1) {
      return hierarchy[currentIndex + 1];
    }

    return currentModel; // Already at top
  }

  private getModelDowngrades(currentModel: ModelType): ModelType[] {
    const hierarchy: ModelType[] = ['haiku', 'sonnet', 'opus'];
    const currentIndex = hierarchy.indexOf(currentModel);

    return hierarchy.slice(0, currentIndex);
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeModelCapabilities(): void {
    // Claude model capabilities based on Claude Systems Expert knowledge
    this.modelCapabilities.set('haiku', {
      model: 'haiku',
      costPer1kTokens: 0.0008,
      avgLatencyMs: 800,
      maxContextTokens: 200000,
      reasoningCapability: 0.6,
      creativityLevel: 0.4,
      precisionLevel: 0.7,
      multilingualSupport: 0.8,
      codeGenerationQuality: 0.6,
      problemSolvingStrength: 0.5
    });

    this.modelCapabilities.set('sonnet', {
      model: 'sonnet',
      costPer1kTokens: 0.008,
      avgLatencyMs: 1500,
      maxContextTokens: 200000,
      reasoningCapability: 0.8,
      creativityLevel: 0.7,
      precisionLevel: 0.85,
      multilingualSupport: 0.9,
      codeGenerationQuality: 0.85,
      problemSolvingStrength: 0.8
    });

    this.modelCapabilities.set('opus', {
      model: 'opus',
      costPer1kTokens: 0.08,
      avgLatencyMs: 3000,
      maxContextTokens: 200000,
      reasoningCapability: 0.95,
      creativityLevel: 0.95,
      precisionLevel: 0.9,
      multilingualSupport: 0.95,
      codeGenerationQuality: 0.9,
      problemSolvingStrength: 0.95
    });

    this.logger.debug('Model capabilities initialized');
  }

  private initializePerformanceMetrics(): void {
    // Initialize with baseline metrics
    ['haiku', 'sonnet', 'opus'].forEach(model => {
      this.performanceMetrics.set(model as ModelType, {
        model: model as ModelType,
        successRate: 0.85,
        avgQualityScore: 0.8,
        avgLatency: this.modelCapabilities.get(model as ModelType)?.avgLatencyMs || 1000,
        avgCostPerTask: this.modelCapabilities.get(model as ModelType)?.costPer1kTokens || 0.01,
        escalationRate: 0.1,
        userSatisfactionScore: 0.8,
        totalUsage: 0,
        failurePatterns: []
      });
    });

    this.logger.debug('Performance metrics initialized');
  }

  private initializeBudgetTracker(): void {
    this.globalBudgetTracker = {
      dailyLimit: 100.0, // $100 daily limit
      currentSpending: 0.0,
      remainingBudget: 100.0,
      spendingByModel: new Map(),
      projectedSpending: 0.0
    };

    this.logger.debug('Budget tracker initialized');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private createEmergencySelection(): ModelSelectionResult {
    return {
      selectedModel: 'haiku',
      confidence: 0.1,
      reasoning: 'Emergency fallback selection due to selection failure',
      alternatives: [],
      estimatedCost: 0.01,
      estimatedLatency: 1000,
      escalationTriggers: [],
      fallbackPlan: {
        fallbackSequence: ['haiku'],
        fallbackCriteria: ['emergency'],
        emergencyModel: 'haiku',
        maxFallbackAttempts: 1
      }
    };
  }

  // Additional methods would be implemented here...
  // Due to length constraints, showing key structure and primary methods

  // =============================================================================
  // MISSING METHOD IMPLEMENTATIONS
  // =============================================================================

  private calculateSelectionConfidence(
    selectedModel: ModelType,
    modelScores: Map<ModelType, number>
  ): number {
    const score = modelScores.get(selectedModel) || 0;
    const totalScore = Array.from(modelScores.values()).reduce((sum, s) => sum + s, 0);
    return totalScore > 0 ? score / totalScore : 0.5;
  }

  private generateAlternatives(
    modelScores: Map<ModelType, number>,
    selectedModel: ModelType
  ): ModelAlternative[] {
    const alternatives: ModelAlternative[] = [];
    const sortedModels = Array.from(modelScores.entries())
      .filter(([model]) => model !== selectedModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    for (const [model, score] of sortedModels) {
      const capabilities = this.modelCapabilities.get(model)!;
      alternatives.push({
        model,
        score,
        reason: `Alternative model with ${score.toFixed(2)} score`,
        costDelta: capabilities.costPer1kTokens - (this.modelCapabilities.get(selectedModel)?.costPer1kTokens || 0),
        qualityDelta: capabilities.reasoningCapability - (this.modelCapabilities.get(selectedModel)?.reasoningCapability || 0)
      });
    }

    return alternatives;
  }

  private createFallbackPlan(
    selectedModel: ModelType,
    alternatives: ModelAlternative[]
  ): ModelFallbackPlan {
    const fallbackSequence: ModelType[] = [];

    if (selectedModel !== 'haiku') {
      fallbackSequence.push('haiku');
    }
    if (selectedModel === 'opus' && alternatives.length > 0) {
      fallbackSequence.push(alternatives[0].model);
    }

    return {
      fallbackSequence,
      fallbackCriteria: ['model_failure', 'quality_threshold', 'cost_limit'],
      emergencyModel: 'haiku',
      maxFallbackAttempts: 3
    };
  }

  private generateSelectionReasoning(
    selectedModel: ModelType,
    requirements: TaskRequirements,
    confidence: number
  ): string {
    const capabilities = this.modelCapabilities.get(selectedModel)!;
    let reasoning = `Selected ${selectedModel} based on requirements: `;

    if (requirements.reasoning > 0.7) {
      reasoning += `high reasoning need (${capabilities.reasoningCapability.toFixed(2)} capability), `;
    }
    if (requirements.creativity > 0.7) {
      reasoning += `high creativity need (${capabilities.creativityLevel.toFixed(2)} capability), `;
    }
    if (requirements.costSensitivity > 0.5) {
      reasoning += `cost optimization (${capabilities.costPer1kTokens.toFixed(4)}/1k tokens), `;
    }

    reasoning += `overall confidence: ${confidence.toFixed(2)}`;
    return reasoning;
  }

  private estimateModelExecution(
    selectedModel: ModelType,
    criteria: ModelSelectionCriteria
  ): { cost: number; latency: number } {
    const capabilities = this.modelCapabilities.get(selectedModel)!;
    const estimatedTokens = criteria.estimatedTokens || 10000;
    const cost = (capabilities.costPer1kTokens * estimatedTokens) / 1000;
    const latency = capabilities.avgLatencyMs * (1 + (criteria.complexity === 'high' ? 0.5 : 0));

    return { cost, latency };
  }

  private updateBudgetTracking(selectedModel: ModelType, cost: number): void {
    const currentSpending = this.globalBudgetTracker.spendingByModel.get(selectedModel) || 0;
    this.globalBudgetTracker.spendingByModel.set(selectedModel, currentSpending + cost);
    this.globalBudgetTracker.currentSpending += cost;
    this.globalBudgetTracker.remainingBudget = this.globalBudgetTracker.dailyLimit - this.globalBudgetTracker.currentSpending;
    this.globalBudgetTracker.projectedSpending += cost;
  }

  private findApplicableEscalationRule(
    currentModel: ModelType,
    failureContext: FailureContext
  ): EscalationTrigger | null {
    // Simple escalation rule based on failure rate
    if (failureContext.failureRate > 0.3) {
      return {
        condition: 'failure_rate_high',
        fromModel: currentModel,
        toModel: this.getNextModelUp(currentModel),
        threshold: 0.3,
        autoTrigger: true,
        cooldownMinutes: 10
      };
    }
    return null;
  }

  private isInCooldownPeriod(escalationRule: EscalationTrigger): boolean {
    // Check if escalation is in cooldown (simplified implementation)
    const recentEscalations = this.escalationHistory.filter(
      event => event.toModel === escalationRule.toModel &&
      (Date.now() - event.timestamp.getTime()) < escalationRule.cooldownMinutes * 60 * 1000
    );
    return recentEscalations.length > 0;
  }

  private estimateEscalationCost(fromModel: ModelType, toModel: ModelType): number {
    const fromCapabilities = this.modelCapabilities.get(fromModel)!;
    const toCapabilities = this.modelCapabilities.get(toModel)!;
    return toCapabilities.costPer1kTokens - fromCapabilities.costPer1kTokens;
  }

  private canAffordEscalation(escalationCost: number): boolean {
    return this.globalBudgetTracker.remainingBudget >= escalationCost;
  }

  private recordEscalationEvent(event: EscalationEvent): void {
    this.escalationHistory.push(event);
    // Limit history size
    if (this.escalationHistory.length > 1000) {
      this.escalationHistory = this.escalationHistory.slice(-500);
    }
  }

  private createEscalatedSelection(
    targetModel: ModelType,
    escalationRule: EscalationTrigger,
    failureContext: FailureContext
  ): ModelSelectionResult {
    return {
      selectedModel: targetModel,
      confidence: 0.8,
      reasoning: `Escalated from ${escalationRule.fromModel} due to ${failureContext.reason}`,
      alternatives: [],
      estimatedCost: this.modelCapabilities.get(targetModel)?.costPer1kTokens || 0,
      estimatedLatency: this.modelCapabilities.get(targetModel)?.avgLatencyMs || 1000,
      escalationTriggers: [escalationRule],
      fallbackPlan: {
        fallbackSequence: [escalationRule.fromModel],
        fallbackCriteria: ['escalation_failure'],
        emergencyModel: 'haiku',
        maxFallbackAttempts: 2
      }
    };
  }

  private calculateCostSavings(currentModel: ModelType, targetModel: ModelType): number {
    const currentCost = this.modelCapabilities.get(currentModel)?.costPer1kTokens || 0;
    const targetCost = this.modelCapabilities.get(targetModel)?.costPer1kTokens || 0;
    return currentCost - targetCost;
  }

  private assessDowngradeRisk(currentModel: ModelType, targetModel: ModelType): 'low' | 'medium' | 'high' {
    const hierarchy: ModelType[] = ['haiku', 'sonnet', 'opus'];
    const currentIndex = hierarchy.indexOf(currentModel);
    const targetIndex = hierarchy.indexOf(targetModel);
    const difference = currentIndex - targetIndex;

    if (difference <= 1) return 'low';
    if (difference === 2) return 'medium';
    return 'high';
  }

  private createOptimizedSelection(
    optimization: ModelOptimizationResult,
    currentSelection: ModelSelectionResult
  ): ModelSelectionResult {
    return {
      ...currentSelection,
      selectedModel: optimization.model,
      estimatedCost: currentSelection.estimatedCost - optimization.costSavings,
      reasoning: `Optimized for cost: ${optimization.costSavings.toFixed(4)} savings with ${optimization.riskLevel} risk`
    };
  }

  private generateModelComparison(): ModelComparison[] {
    const comparisons: ModelComparison[] = [];
    Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
      comparisons.push({
        model,
        usage: metrics.totalUsage,
        successRate: metrics.successRate,
        avgCost: metrics.avgCostPerTask,
        avgQuality: metrics.avgQualityScore
      });
    });
    return comparisons.sort((a, b) => b.usage - a.usage);
  }

  private analyzeEscalationPatterns(): EscalationAnalysis {
    const recentEscalations = this.escalationHistory.slice(-100);
    const totalEscalations = recentEscalations.length;
    const escalationRate = totalEscalations / Math.max(1, this.performanceMetrics.size);

    const commonTriggers = recentEscalations
      .reduce((acc, event) => {
        acc[event.reason] = (acc[event.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const costImpact = recentEscalations.reduce((sum, event) => sum + event.cost, 0);

    return {
      totalEscalations,
      escalationRate,
      commonTriggers: Object.keys(commonTriggers).sort((a, b) => commonTriggers[b] - commonTriggers[a]),
      costImpact
    };
  }

  private calculateCostEfficiencyMetrics(): CostEfficiencyMetrics {
    const costPerSuccessfulTask = new Map<ModelType, number>();
    const qualityCostRatio = new Map<ModelType, number>();
    const optimalModelByBudget: ModelType[] = [];

    Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
      const costPerTask = metrics.avgCostPerTask / Math.max(metrics.successRate, 0.1);
      costPerSuccessfulTask.set(model, costPerTask);
      qualityCostRatio.set(model, metrics.avgQualityScore / Math.max(costPerTask, 0.01));

      if (metrics.avgCostPerTask < 0.05 && metrics.avgQualityScore > 0.8) {
        optimalModelByBudget.push(model);
      }
    });

    return {
      costPerSuccessfulTask,
      qualityCostRatio,
      optimalModelByBudget
    };
  }

  private analyzeQualityTrends(): QualityTrend[] {
    const trends: QualityTrend[] = [];
    Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
      trends.push({
        model,
        period: 'current',
        avgQuality: metrics.avgQualityScore,
        trend: metrics.avgQualityScore > 0.8 ? 'stable' : 'improving'
      });
    });
    return trends;
  }

  private generateModelRecommendations(): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = [];

    Array.from(this.performanceMetrics.entries()).forEach(([model, metrics]) => {
      if (metrics.escalationRate > 0.2) {
        recommendations.push({
          type: 'quality_improvement',
          description: `Consider upgrading ${model} due to high escalation rate`,
          priority: 'medium',
          expectedBenefit: 'Reduced escalations and improved success rate'
        });
      }

      if (metrics.avgCostPerTask > 0.1) {
        recommendations.push({
          type: 'cost_optimization',
          description: `Consider optimizing ${model} usage for cost efficiency`,
          priority: 'low',
          expectedBenefit: 'Reduced operational costs'
        });
      }
    });

    return recommendations;
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface TaskRequirements {
  creativity: number;
  reasoning: number;
  precision: number;
  speed: number;
  costSensitivity: number;
}

interface FailureContext {
  reason: string;
  failureRate: number;
  qualityScore: number;
  processingTime: number;
  userFeedback?: string;
}

interface EscalationEvent {
  timestamp: Date;
  fromModel: ModelType;
  toModel: ModelType;
  reason: string;
  automatic: boolean;
  cost: number;
}

interface BudgetTracker {
  dailyLimit: number;
  currentSpending: number;
  remainingBudget: number;
  spendingByModel: Map<ModelType, number>;
  projectedSpending: number;
}

interface ModelOptimizationResult {
  model: ModelType;
  costSavings: number;
  qualityImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ModelAnalytics {
  modelComparison: ModelComparison[];
  escalationAnalysis: EscalationAnalysis;
  costEfficiencyMetrics: CostEfficiencyMetrics;
  qualityTrends: QualityTrend[];
  recommendations: ModelRecommendation[];
}

interface ModelComparison {
  model: ModelType;
  usage: number;
  successRate: number;
  avgCost: number;
  avgQuality: number;
}

interface EscalationAnalysis {
  totalEscalations: number;
  escalationRate: number;
  commonTriggers: string[];
  costImpact: number;
}

interface CostEfficiencyMetrics {
  costPerSuccessfulTask: Map<ModelType, number>;
  qualityCostRatio: Map<ModelType, number>;
  optimalModelByBudget: ModelType[];
}

interface QualityTrend {
  model: ModelType;
  period: string;
  avgQuality: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface ModelRecommendation {
  type: 'cost_optimization' | 'quality_improvement' | 'usage_pattern';
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedBenefit: string;
}

// =============================================================================
// FACTORY & EXPORTS
// =============================================================================

export function createModelSelector(): ModelSelector {
  return new ModelSelector();
}

export type {
  ModelSelectionResult,
  ModelSelectionCriteria,
  ModelCapabilities,
  EscalationTrigger,
  ModelPerformanceMetrics,
  CostOptimizationStrategy
};