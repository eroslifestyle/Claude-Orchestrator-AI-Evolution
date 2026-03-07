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
import type { ModelType } from '../types';
import type { ComplexityLevel } from '../analysis/types';
interface ModelCapabilities {
    model: ModelType;
    costPer1kTokens: number;
    avgLatencyMs: number;
    maxContextTokens: number;
    reasoningCapability: number;
    creativityLevel: number;
    precisionLevel: number;
    multilingualSupport: number;
    codeGenerationQuality: number;
    problemSolvingStrength: number;
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
    throughputRequirement: number;
    concurrencyLevel: number;
    realTimeRequired: boolean;
}
interface QualityRequirements {
    minAccuracy: number;
    consistencyImportance: number;
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
type EscalationCondition = 'failure_rate_high' | 'quality_below_threshold' | 'complexity_underestimated' | 'processing_time_exceeded' | 'user_dissatisfaction' | 'cost_efficiency_poor';
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
    targetCostReduction: number;
    qualityTradeoffAcceptable: boolean;
    cachingEnabled: boolean;
    batchingEnabled: boolean;
    offPeakScheduling: boolean;
}
export declare class ModelSelector {
    private logger;
    private modelCapabilities;
    private performanceMetrics;
    private escalationHistory;
    private globalBudgetTracker;
    constructor();
    /**
     * Select optimal model based on task requirements
     */
    selectModel(criteria: ModelSelectionCriteria): Promise<ModelSelectionResult>;
    /**
     * Auto-escalate model based on failure patterns
     */
    autoEscalate(currentModel: ModelType, failureContext: FailureContext): Promise<ModelSelectionResult | null>;
    /**
     * Optimize model selection for cost efficiency
     */
    optimizeForCost(currentSelection: ModelSelectionResult, qualityThreshold?: number): Promise<ModelSelectionResult>;
    /**
     * Get model performance analytics
     */
    getModelAnalytics(): ModelAnalytics;
    private analyzeRequirements;
    private calculateModelScores;
    private applyBudgetConstraints;
    private selectPrimaryModel;
    private generateEscalationTriggers;
    private getNextModelUp;
    private getModelDowngrades;
    private initializeModelCapabilities;
    private initializePerformanceMetrics;
    private initializeBudgetTracker;
    private createEmergencySelection;
    private calculateSelectionConfidence;
    private generateAlternatives;
    private createFallbackPlan;
    private generateSelectionReasoning;
    private estimateModelExecution;
    private updateBudgetTracking;
    private findApplicableEscalationRule;
    private isInCooldownPeriod;
    private estimateEscalationCost;
    private canAffordEscalation;
    private recordEscalationEvent;
    private createEscalatedSelection;
    private calculateCostSavings;
    private assessDowngradeRisk;
    private createOptimizedSelection;
    private generateModelComparison;
    private analyzeEscalationPatterns;
    private calculateCostEfficiencyMetrics;
    private analyzeQualityTrends;
    private generateModelRecommendations;
}
interface FailureContext {
    reason: string;
    failureRate: number;
    qualityScore: number;
    processingTime: number;
    userFeedback?: string;
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
export declare function createModelSelector(): ModelSelector;
export type { ModelSelectionResult, ModelSelectionCriteria, ModelCapabilities, EscalationTrigger, ModelPerformanceMetrics, CostOptimizationStrategy };
//# sourceMappingURL=ModelSelector.d.ts.map