/**
 * Cost Prediction ML Engine - Advanced Cost Forecasting System
 *
 * Sistema machine learning avanzato per:
 * - Accurate cost prediction con ML models (target: ±5% accuracy)
 * - Model complexity analysis per optimal model selection
 * - ROI prediction & cost-benefit analysis automation
 * - Dynamic pricing optimization basata su usage patterns
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
import type { PluginConfig } from '../types';
/**
 * Configurazione Cost Prediction Engine
 */
export interface CostPredictionConfig {
    /** Abilita ML-based predictions */
    enableMLPredictions: boolean;
    /** Target accuracy (0.0-1.0) */
    targetAccuracy: number;
    /** Training data minimum size */
    minTrainingDataSize: number;
    /** Model retraining frequency (ms) */
    modelRetrainingFrequency: number;
    /** Feature selection threshold */
    featureSelectionThreshold: number;
    /** Cross-validation folds */
    crossValidationFolds: number;
    /** Enable ensemble methods */
    enableEnsembleMethods: boolean;
}
/**
 * Cost prediction input features
 */
export interface CostFeatures {
    /** Task complexity score (0.0-1.0) */
    taskComplexity: number;
    /** Number of agents required */
    agentCount: number;
    /** Estimated execution time (ms) */
    estimatedExecutionTime: number;
    /** Model distribution (haiku/sonnet/opus percentages) */
    modelDistribution: ModelDistribution;
    /** Task type category */
    taskTypeCategory: TaskCategory;
    /** Historical cost patterns */
    historicalPatterns: HistoricalCostPattern[];
    /** System load factor */
    systemLoadFactor: number;
    /** Time of execution factor */
    timeOfExecutionFactor: number;
    /** User tier/plan */
    userTier: 'free' | 'pro' | 'enterprise';
    /** Feature complexity factors */
    featureComplexity: FeatureComplexityFactors;
}
/**
 * Model distribution for cost calculation
 */
export interface ModelDistribution {
    /** Percentage of haiku usage (0.0-1.0) */
    haikuPercentage: number;
    /** Percentage of sonnet usage (0.0-1.0) */
    sonnetPercentage: number;
    /** Percentage of opus usage (0.0-1.0) */
    opusPercentage: number;
}
/**
 * Task category for cost modeling
 */
export type TaskCategory = 'simple_coding' | 'complex_integration' | 'gui_development' | 'api_development' | 'database_operations' | 'testing_qa' | 'security_audit' | 'architecture_design' | 'machine_learning' | 'general_purpose';
/**
 * Historical cost pattern
 */
export interface HistoricalCostPattern {
    /** Pattern identifier */
    patternId: string;
    /** Similar task features */
    features: Partial<CostFeatures>;
    /** Actual cost recorded */
    actualCost: number;
    /** Execution timestamp */
    timestamp: number;
    /** Pattern strength/relevance */
    relevanceScore: number;
}
/**
 * Feature complexity factors
 */
export interface FeatureComplexityFactors {
    /** Code generation complexity */
    codeGenerationComplexity: number;
    /** Integration complexity */
    integrationComplexity: number;
    /** Domain knowledge requirement */
    domainKnowledgeRequirement: number;
    /** Error handling complexity */
    errorHandlingComplexity: number;
    /** Testing requirements */
    testingRequirements: number;
}
/**
 * Cost prediction result
 */
export interface CostPredictionResult {
    /** Predicted total cost */
    predictedCost: number;
    /** Prediction confidence (0.0-1.0) */
    confidence: number;
    /** Cost breakdown per component */
    costBreakdown: CostBreakdown;
    /** Prediction interval */
    predictionInterval: {
        lower: number;
        upper: number;
    };
    /** Contributing factors */
    contributingFactors: CostFactor[];
    /** Model used for prediction */
    modelUsed: string;
    /** Prediction timestamp */
    predictionTimestamp: number;
    /** Alternative scenarios */
    alternativeScenarios: AlternativeScenario[];
}
/**
 * Cost breakdown components
 */
export interface CostBreakdown {
    /** Model usage costs */
    modelCosts: {
        haiku: number;
        sonnet: number;
        opus: number;
    };
    /** Infrastructure costs */
    infrastructureCosts: number;
    /** Processing overhead */
    processingOverhead: number;
    /** Premium features cost */
    premiumFeaturesCost: number;
    /** Total base cost */
    totalBaseCost: number;
    /** Applied discounts */
    appliedDiscounts: number;
}
/**
 * Cost contributing factor
 */
export interface CostFactor {
    /** Factor name */
    name: string;
    /** Impact on cost (-1.0 to 1.0) */
    impact: number;
    /** Factor weight in prediction */
    weight: number;
    /** Description */
    description: string;
}
/**
 * Alternative cost scenario
 */
export interface AlternativeScenario {
    /** Scenario name */
    name: string;
    /** Modified features */
    modifications: Partial<CostFeatures>;
    /** Predicted cost for scenario */
    predictedCost: number;
    /** Cost savings compared to base */
    costSavings: number;
    /** Trade-offs description */
    tradeOffs: string[];
}
/**
 * ROI analysis result
 */
export interface ROIAnalysisResult {
    /** Task identifier */
    taskId: string;
    /** Expected benefits */
    expectedBenefits: {
        timeInvestment: number;
        qualityImprovement: number;
        errorReduction: number;
        maintenanceReduction: number;
    };
    /** Total expected value */
    expectedValue: number;
    /** Predicted cost */
    predictedCost: number;
    /** ROI ratio */
    roiRatio: number;
    /** Payback period (days) */
    paybackPeriod: number;
    /** Risk factors */
    riskFactors: string[];
    /** Recommendation */
    recommendation: 'proceed' | 'optimize' | 'reconsider';
}
/**
 * ML Model for cost prediction
 */
export interface CostPredictionModel {
    /** Model identifier */
    id: string;
    /** Model type */
    type: 'linear_regression' | 'random_forest' | 'neural_network' | 'ensemble';
    /** Model version */
    version: string;
    /** Training timestamp */
    trainedAt: number;
    /** Model parameters */
    parameters: ModelParameters;
    /** Model performance metrics */
    performance: ModelPerformanceMetrics;
    /** Feature importance scores */
    featureImportance: Record<string, number>;
    /** Model validation results */
    validationResults: ValidationResults;
}
/**
 * Model parameters (simplified representation)
 */
export interface ModelParameters {
    /** Model weights/coefficients */
    weights: number[];
    /** Bias terms */
    biases: number[];
    /** Feature scaling parameters */
    scaling: {
        mean: number[];
        standardDeviation: number[];
    };
    /** Hyperparameters */
    hyperparameters: Record<string, number>;
    /** Model architecture (for neural networks) */
    architecture?: {
        layers: number[];
        activationFunctions: string[];
        dropout: number[];
    };
}
/**
 * Model performance metrics
 */
export interface ModelPerformanceMetrics {
    /** Mean Absolute Error */
    mae: number;
    /** Mean Squared Error */
    mse: number;
    /** Root Mean Squared Error */
    rmse: number;
    /** Mean Absolute Percentage Error */
    mape: number;
    /** R-squared score */
    r2Score: number;
    /** Cross-validation scores */
    crossValidationScores: number[];
    /** Prediction accuracy within target threshold */
    accuracyWithinThreshold: number;
}
/**
 * Validation results
 */
export interface ValidationResults {
    /** Validation set size */
    validationSetSize: number;
    /** Out-of-sample predictions */
    outOfSamplePredictions: {
        predicted: number[];
        actual: number[];
    };
    /** Residual analysis */
    residualAnalysis: {
        mean: number;
        standardDeviation: number;
        skewness: number;
        kurtosis: number;
    };
    /** Feature stability scores */
    featureStability: Record<string, number>;
}
export declare class CostPredictionEngine {
    private config;
    private predictionConfig;
    private logger;
    private models;
    private trainingData;
    private costPatterns;
    private pricingConfig;
    private lastModelUpdate;
    constructor(config: PluginConfig, predictionConfig?: Partial<CostPredictionConfig>);
    /**
     * Predict cost per un task
     */
    predictCost(taskDescription: string, features: CostFeatures): Promise<CostPredictionResult>;
    /**
     * Learn from actual cost results
     */
    learnFromActualCost(features: CostFeatures, actualCost: number, taskId: string): Promise<void>;
    /**
     * Analyze ROI per un task
     */
    analyzeROI(taskDescription: string, features: CostFeatures, expectedBenefits: ROIAnalysisResult['expectedBenefits']): Promise<ROIAnalysisResult>;
    /**
     * Optimize cost per performance tradeoffs
     */
    optimizeCostPerformance(features: CostFeatures, constraints: {
        maxCost?: number;
        minPerformance?: number;
        maxExecutionTime?: number;
    }): Promise<{
        originalPrediction: CostPredictionResult;
        optimizedFeatures: CostFeatures;
        optimizedPrediction: CostPredictionResult;
        optimizationGains: {
            costReduction: number;
            performanceImpact: number;
            timeImpact: number;
        };
    }>;
    /**
     * Get model performance statistics
     */
    getModelPerformance(): {
        models: Array<{
            id: string;
            type: string;
            accuracy: number;
            mape: number;
            lastUpdated: number;
        }>;
        overallAccuracy: number;
        predictionCount: number;
        trainingDataSize: number;
    };
    private initializePricingConfig;
    private initializeModels;
    private createBaselineModel;
    private createEnsembleModel;
    private generateBaselineParameters;
    private preprocessFeatures;
    private encodeCategoricalFeature;
    private encodeUserTier;
    private getModelPredictions;
    private runModelPrediction;
    private linearRegressionPredict;
    private randomForestPredict;
    private neuralNetworkPredict;
    private ensemblePredictions;
    private calculateCostBreakdown;
    private calculateDiscounts;
    private calculatePredictionConfidence;
    private calculatePredictionInterval;
    private generateAlternativeScenarios;
    private identifyContributingFactors;
    private getBestModel;
    private getFallbackCostPrediction;
    private updateCostPatterns;
    private generatePatternId;
    private hashString;
    private shouldRetrain;
    private retrainModels;
    private retrainSingleModel;
    private retrainEnsembleModel;
    private calculateExpectedValue;
    private assessRiskFactors;
    private generateROIRecommendation;
    private findOptimalFeatures;
    private calculatePerformanceImpact;
    private calculateTimeImpact;
}
/**
 * Factory per creare CostPredictionEngine configurato
 */
export declare function createCostPredictionEngine(config: PluginConfig, predictionConfig?: Partial<CostPredictionConfig>): CostPredictionEngine;
/**
 * Helper per creare feature vector da task description
 */
export declare function extractCostFeaturesFromTask(taskDescription: string, estimatedAgentCount?: number): CostFeatures;
/**
 * Helper per validare cost features
 */
export declare function validateCostFeatures(features: CostFeatures): string[];
//# sourceMappingURL=CostPredictionEngine.d.ts.map