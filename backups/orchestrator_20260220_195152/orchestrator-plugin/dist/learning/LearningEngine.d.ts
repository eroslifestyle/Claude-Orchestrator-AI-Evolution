/**
 * Learning System Foundations - Adaptive Orchestration Intelligence
 *
 * Sistema di machine learning per:
 * - Migliorare accuracy di agent selection nel tempo
 * - Historical data collection & pattern recognition
 * - Adaptive routing algorithms basati su success rates
 * - Self-improving orchestration intelligence
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
import type { PluginConfig } from '../types';
import type { OrchestrationMetrics } from '../analytics/AnalyticsEngine';
/**
 * Configurazione Learning Engine
 */
export interface LearningConfig {
    /** Abilita learning automatico */
    enableAutoLearning: boolean;
    /** Dimensione training dataset minima */
    minTrainingDataSize: number;
    /** Frequency re-training models (ms) */
    retrainingInterval: number;
    /** Learning rate per adaptive algorithms */
    learningRate: number;
    /** Decay factor per historical data */
    dataDecayFactor: number;
    /** Abilita cross-validation */
    enableCrossValidation: boolean;
    /** Threshold per model confidence */
    confidenceThreshold: number;
}
/**
 * Training sample per machine learning
 */
export interface TrainingSample {
    /** ID univoco sample */
    id: string;
    /** Timestamp */
    timestamp: number;
    /** Input features */
    features: FeatureVector;
    /** Target output (success rate, cost, etc.) */
    target: number;
    /** Task context */
    context: TaskContext;
    /** Weight del sample nel training */
    weight: number;
}
/**
 * Feature vector per ML models
 */
export interface FeatureVector {
    /** Task complexity (0.0-1.0) */
    taskComplexity: number;
    /** Numero keywords estratte */
    keywordCount: number;
    /** Numero agent stimati */
    estimatedAgentCount: number;
    /** Task type encoding */
    taskTypeEncoding: number[];
    /** Historical success rate per questo task type */
    historicalSuccessRate: number;
    /** Average cost per questo task type */
    historicalCost: number;
    /** Time of day (normalized) */
    timeOfDay: number;
    /** System load factor */
    systemLoad: number;
    /** Custom domain features */
    domainFeatures: number[];
}
/**
 * Context del task per learning
 */
export interface TaskContext {
    /** Task description */
    description: string;
    /** Task type */
    taskType: string;
    /** Domain classification */
    domain: string;
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** User context */
    userContext?: Record<string, any>;
}
/**
 * Trained ML model
 */
export interface MLModel {
    /** Model ID */
    id: string;
    /** Model type */
    type: 'agent_selection' | 'cost_prediction' | 'performance_prediction' | 'success_prediction';
    /** Model version */
    version: string;
    /** Training timestamp */
    trainedAt: number;
    /** Model parameters/weights */
    parameters: ModelParameters;
    /** Performance metrics */
    performance: ModelPerformance;
    /** Feature importance scores */
    featureImportance: Record<string, number>;
}
/**
 * Model parameters (simplified representation)
 */
export interface ModelParameters {
    /** Weights matrix (flattened) */
    weights: number[];
    /** Bias terms */
    biases: number[];
    /** Normalization parameters */
    normalization: {
        mean: number[];
        std: number[];
    };
    /** Model hyperparameters */
    hyperparameters: Record<string, number>;
}
/**
 * Model performance metrics
 */
export interface ModelPerformance {
    /** Accuracy on validation set */
    accuracy: number;
    /** Precision score */
    precision: number;
    /** Recall score */
    recall: number;
    /** F1 score */
    f1Score: number;
    /** Mean Squared Error (per regressione) */
    mse?: number;
    /** R-squared score (per regressione) */
    r2Score?: number;
    /** Cross-validation scores */
    cvScores: number[];
}
/**
 * Learning improvement result
 */
export interface LearningResult {
    /** Improvement achieved */
    improvementAchieved: boolean;
    /** Previous performance metric */
    previousPerformance: number;
    /** New performance metric */
    newPerformance: number;
    /** Improvement percentage */
    improvementPercentage: number;
    /** Confidence in improvement */
    confidence: number;
    /** Training samples used */
    trainingSamplesCount: number;
    /** Training time (ms) */
    trainingTime: number;
}
/**
 * Agent selection recommendation
 */
export interface AgentSelectionRecommendation {
    /** Recommended agent */
    agentName: string;
    /** Agent expert file path */
    expertFile: string;
    /** Recommended model */
    model: 'haiku' | 'sonnet' | 'opus';
    /** Confidence score */
    confidence: number;
    /** Predicted success rate */
    predictedSuccessRate: number;
    /** Predicted execution time */
    predictedExecutionTime: number;
    /** Predicted cost */
    predictedCost: number;
    /** Reasoning */
    reasoning: string[];
}
/**
 * Historical pattern
 */
export interface HistoricalPattern {
    /** Pattern ID */
    id: string;
    /** Pattern description */
    description: string;
    /** Conditions che attivano il pattern */
    conditions: Record<string, any>;
    /** Expected outcome */
    expectedOutcome: {
        successRate: number;
        executionTime: number;
        cost: number;
    };
    /** Frequency di occorrenza */
    frequency: number;
    /** Last seen timestamp */
    lastSeen: number;
    /** Pattern strength (0.0-1.0) */
    strength: number;
}
export declare class LearningEngine {
    private config;
    private learningConfig;
    private logger;
    private trainingSamples;
    private models;
    private patterns;
    private lastRetraining;
    private learningStats;
    constructor(config: PluginConfig, learningConfig?: Partial<LearningConfig>);
    /**
     * Impara da orchestration results
     */
    learnFromOrchestration(taskDescription: string, metrics: OrchestrationMetrics): Promise<void>;
    /**
     * Predice optimal agent selection
     */
    predictOptimalAgentSelection(taskDescription: string, taskContext?: TaskContext): Promise<AgentSelectionRecommendation[]>;
    /**
     * Re-train tutti i models con nuovi data
     */
    retrainModels(): Promise<LearningResult[]>;
    /**
     * Ottieni learning statistics
     */
    getLearningStatistics(): {
        totalSamples: number;
        totalPredictions: number;
        predictionAccuracy: number;
        avgImprovement: number;
        modelsCount: number;
        patternsCount: number;
        lastRetraining: number;
    };
    /**
     * Esporta trained models per backup
     */
    exportModels(): string;
    /**
     * Importa trained models da backup
     */
    importModels(exportedData: string): boolean;
    /**
     * Cleanup learning engine
     */
    dispose(): void;
    private initializeLearningEngine;
    private initializeBaselineModels;
    private extractTaskFeatures;
    private extractDomainFeatures;
    private getHistoricalSuccessRate;
    private getHistoricalCost;
    private createTrainingSamples;
    private updateHistoricalPatterns;
    private generatePatternId;
    private hashString;
    private performIncrementalLearning;
    private trainModel;
    private getRelevantSamples;
    private simulateModelTraining;
    private generateModelParameters;
    private calculateFeatureImportance;
    private runPredictionModels;
    private runModelPrediction;
    private scoreToAgentRecommendation;
    private matchHistoricalPatterns;
    private combineRecommendations;
    private inferAgentFromPattern;
    private rankRecommendations;
    private getFallbackRecommendations;
    private schedulePeriodicRetraining;
}
/**
 * Factory per creare LearningEngine configurato
 */
export declare function createLearningEngine(config: PluginConfig, learningConfig?: Partial<LearningConfig>): LearningEngine;
/**
 * Helper per validare training samples
 */
export declare function validateTrainingSample(sample: TrainingSample): string[];
/**
 * Helper per normalizzare features
 */
export declare function normalizeFeatures(features: FeatureVector): FeatureVector;
//# sourceMappingURL=LearningEngine.d.ts.map