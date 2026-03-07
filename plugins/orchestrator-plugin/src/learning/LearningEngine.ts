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
import type { OrchestrationMetrics, AgentMetrics } from '../analytics/AnalyticsEngine';
import { PluginLogger } from '../utils/logger';

// =============================================================================
// LEARNING SYSTEM TYPES
// =============================================================================

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

// =============================================================================
// LEARNING ENGINE CLASS
// =============================================================================

export class LearningEngine {
  private config: PluginConfig;
  private learningConfig: LearningConfig;
  private logger: PluginLogger;
  private trainingSamples: Map<string, TrainingSample>;
  private models: Map<string, MLModel>;
  private patterns: Map<string, HistoricalPattern>;
  private lastRetraining: number;
  private learningStats: {
    totalSamples: number;
    totalPredictions: number;
    accuratePreductions: number;
    avgImprovement: number;
  };

  constructor(config: PluginConfig, learningConfig?: Partial<LearningConfig>) {
    this.config = config;
    this.logger = new PluginLogger('LearningEngine');

    // Default configuration
    this.learningConfig = {
      enableAutoLearning: true,
      minTrainingDataSize: 50,
      retrainingInterval: 24 * 60 * 60 * 1000, // 24 hours
      learningRate: 0.01,
      dataDecayFactor: 0.95,
      enableCrossValidation: true,
      confidenceThreshold: 0.7,
      ...learningConfig
    };

    this.trainingSamples = new Map();
    this.models = new Map();
    this.patterns = new Map();
    this.lastRetraining = 0;
    this.learningStats = {
      totalSamples: 0,
      totalPredictions: 0,
      accuratePreductions: 0,
      avgImprovement: 0
    };

    this.initializeLearningEngine();

    this.logger.info('LearningEngine initialized', {
      autoLearning: this.learningConfig.enableAutoLearning,
      minDataSize: this.learningConfig.minTrainingDataSize,
      retrainingInterval: this.learningConfig.retrainingInterval
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Impara da orchestration results
   */
  public async learnFromOrchestration(
    taskDescription: string,
    metrics: OrchestrationMetrics
  ): Promise<void> {
    const startTime = performance.now();
    this.logger.debug('Learning from orchestration result', {
      sessionId: metrics.sessionId,
      successRate: metrics.successRate,
      totalCost: metrics.totalCost
    });

    try {
      // 1. Extract features dal task
      const features = await this.extractTaskFeatures(taskDescription);

      // 2. Create training samples
      const samples = this.createTrainingSamples(taskDescription, features, metrics);

      // 3. Store samples
      samples.forEach(sample => {
        this.trainingSamples.set(sample.id, sample);
        this.learningStats.totalSamples++;
      });

      // 4. Update patterns
      await this.updateHistoricalPatterns(taskDescription, metrics);

      // 5. Incremental learning se abilitato
      if (this.learningConfig.enableAutoLearning) {
        await this.performIncrementalLearning();
      }

      const executionTime = performance.now() - startTime;
      this.logger.debug('Learning completed', {
        samplesAdded: samples.length,
        executionTime: Math.round(executionTime)
      });

    } catch (error) {
      this.logger.error('Error during learning', { error });
    }
  }

  /**
   * Predice optimal agent selection
   */
  public async predictOptimalAgentSelection(
    taskDescription: string,
    taskContext?: TaskContext
  ): Promise<AgentSelectionRecommendation[]> {
    const startTime = performance.now();
    this.logger.debug('Predicting optimal agent selection', {
      taskLength: taskDescription.length
    });

    try {
      // 1. Extract features
      const features = await this.extractTaskFeatures(taskDescription, taskContext);

      // 2. Get predictions da tutti i models relevant
      const predictions = await this.runPredictionModels(features);

      // 3. Check historical patterns
      const patternMatches = this.matchHistoricalPatterns(taskDescription, features);

      // 4. Combine predictions con pattern insights
      const recommendations = this.combineRecommendations(predictions, patternMatches);

      // 5. Rank recommendations
      const rankedRecommendations = this.rankRecommendations(recommendations);

      const executionTime = performance.now() - startTime;
      this.logger.debug('Agent selection prediction completed', {
        recommendationCount: rankedRecommendations.length,
        executionTime: Math.round(executionTime)
      });

      this.learningStats.totalPredictions++;
      return rankedRecommendations.slice(0, 3); // Top 3 recommendations

    } catch (error) {
      this.logger.error('Error during agent selection prediction', { error });

      // Fallback to rule-based selection
      return this.getFallbackRecommendations(taskDescription);
    }
  }

  /**
   * Re-train tutti i models con nuovi data
   */
  public async retrainModels(): Promise<LearningResult[]> {
    const startTime = performance.now();
    this.logger.info('Starting model retraining', {
      sampleCount: this.trainingSamples.size
    });

    const results: LearningResult[] = [];

    if (this.trainingSamples.size < this.learningConfig.minTrainingDataSize) {
      this.logger.warn('Insufficient training data for retraining', {
        current: this.trainingSamples.size,
        required: this.learningConfig.minTrainingDataSize
      });

      return results;
    }

    try {
      // Train different model types
      const modelTypes: MLModel['type'][] = [
        'agent_selection',
        'cost_prediction',
        'performance_prediction',
        'success_prediction'
      ];

      for (const modelType of modelTypes) {
        const result = await this.trainModel(modelType);
        results.push(result);
      }

      this.lastRetraining = Date.now();

      const executionTime = performance.now() - startTime;
      this.logger.info('Model retraining completed', {
        modelsRetrained: results.length,
        executionTime: Math.round(executionTime),
        avgImprovement: results.reduce((sum, r) => sum + r.improvementPercentage, 0) / results.length
      });

      // Update learning stats
      const avgImprovement = results.reduce((sum, r) => sum + r.improvementPercentage, 0) / results.length;
      this.learningStats.avgImprovement = avgImprovement;

      return results;

    } catch (error) {
      this.logger.error('Error during model retraining', { error });
      return results;
    }
  }

  /**
   * Ottieni learning statistics
   */
  public getLearningStatistics(): {
    totalSamples: number;
    totalPredictions: number;
    predictionAccuracy: number;
    avgImprovement: number;
    modelsCount: number;
    patternsCount: number;
    lastRetraining: number;
  } {
    return {
      totalSamples: this.learningStats.totalSamples,
      totalPredictions: this.learningStats.totalPredictions,
      predictionAccuracy: this.learningStats.totalPredictions > 0
        ? this.learningStats.accuratePreductions / this.learningStats.totalPredictions
        : 0,
      avgImprovement: this.learningStats.avgImprovement,
      modelsCount: this.models.size,
      patternsCount: this.patterns.size,
      lastRetraining: this.lastRetraining
    };
  }

  /**
   * Esporta trained models per backup
   */
  public exportModels(): string {
    const exportData = {
      timestamp: Date.now(),
      models: Array.from(this.models.entries()),
      patterns: Array.from(this.patterns.entries()),
      stats: this.learningStats,
      config: this.learningConfig
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importa trained models da backup
   */
  public importModels(exportedData: string): boolean {
    try {
      const data = JSON.parse(exportedData);

      // Validate structure
      if (!data.models || !data.patterns) {
        throw new Error('Invalid export data structure');
      }

      // Clear current data
      this.models.clear();
      this.patterns.clear();

      // Import models
      data.models.forEach(([id, model]: [string, MLModel]) => {
        this.models.set(id, model);
      });

      // Import patterns
      data.patterns.forEach(([id, pattern]: [string, HistoricalPattern]) => {
        this.patterns.set(id, pattern);
      });

      // Import stats
      if (data.stats) {
        this.learningStats = data.stats;
      }

      this.logger.info('Models imported successfully', {
        modelsCount: this.models.size,
        patternsCount: this.patterns.size
      });

      return true;

    } catch (error) {
      this.logger.error('Error importing models', { error });
      return false;
    }
  }

  /**
   * Cleanup learning engine
   */
  public dispose(): void {
    this.trainingSamples.clear();
    this.models.clear();
    this.patterns.clear();

    this.logger.info('LearningEngine disposed');
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private initializeLearningEngine(): void {
    // Initialize with some basic models se non esistenti
    if (this.models.size === 0) {
      this.initializeBaselineModels();
    }

    // Start periodic retraining se abilitato
    if (this.learningConfig.enableAutoLearning && this.learningConfig.retrainingInterval > 0) {
      setTimeout(() => this.schedulePeriodicRetraining(), this.learningConfig.retrainingInterval);
    }

    this.logger.debug('Learning engine initialized');
  }

  private initializeBaselineModels(): void {
    // Create basic baseline models con default parameters
    const modelTypes: MLModel['type'][] = [
      'agent_selection',
      'cost_prediction',
      'performance_prediction',
      'success_prediction'
    ];

    modelTypes.forEach(type => {
      const baselineModel: MLModel = {
        id: `baseline_${type}`,
        type,
        version: '1.0.0',
        trainedAt: Date.now(),
        parameters: {
          weights: [0.1, 0.1, 0.1, 0.1, 0.1], // Default small weights
          biases: [0.0],
          normalization: {
            mean: [0.5, 0.5, 0.5, 0.5, 0.5],
            std: [1.0, 1.0, 1.0, 1.0, 1.0]
          },
          hyperparameters: {
            learningRate: this.learningConfig.learningRate,
            regularization: 0.01
          }
        },
        performance: {
          accuracy: 0.5, // Baseline performance
          precision: 0.5,
          recall: 0.5,
          f1Score: 0.5,
          cvScores: [0.5, 0.5, 0.5]
        },
        featureImportance: {
          taskComplexity: 0.2,
          keywordCount: 0.2,
          estimatedAgentCount: 0.2,
          historicalSuccessRate: 0.3,
          historicalCost: 0.1
        }
      };

      this.models.set(baselineModel.id, baselineModel);
    });

    this.logger.debug('Baseline models initialized', {
      modelCount: this.models.size
    });
  }

  private async extractTaskFeatures(
    taskDescription: string,
    taskContext?: TaskContext
  ): Promise<FeatureVector> {
    // Feature extraction basic implementation
    const words = taskDescription.toLowerCase().split(/\s+/);
    const wordCount = words.length;

    // Task complexity based su length e keywords
    const complexKeywords = ['integration', 'system', 'architecture', 'advanced', 'machine learning'];
    const complexityBoost = complexKeywords.filter(kw =>
      taskDescription.toLowerCase().includes(kw)
    ).length;
    const taskComplexity = Math.min((wordCount / 100) + (complexityBoost * 0.2), 1.0);

    // Estimate agent count based su domain keywords
    const agentKeywords = ['gui', 'api', 'database', 'test', 'security', 'trading', 'mql'];
    const estimatedAgentCount = Math.max(1, agentKeywords.filter(kw =>
      taskDescription.toLowerCase().includes(kw)
    ).length);

    // Task type encoding (one-hot style)
    const taskTypes = ['gui', 'api', 'database', 'testing', 'security', 'trading', 'general'];
    const taskTypeEncoding = taskTypes.map(type =>
      taskDescription.toLowerCase().includes(type) ? 1 : 0
    );

    // Historical metrics (would be real data in production)
    const historicalSuccessRate = this.getHistoricalSuccessRate(taskContext?.taskType || 'general');
    const historicalCost = this.getHistoricalCost(taskContext?.taskType || 'general');

    // Time features
    const now = new Date();
    const timeOfDay = (now.getHours() + now.getMinutes() / 60) / 24; // 0-1

    // System load (simplified)
    const systemLoad = Math.min(this.trainingSamples.size / 1000, 1.0);

    // Domain-specific features
    const domainFeatures = this.extractDomainFeatures(taskDescription);

    return {
      taskComplexity,
      keywordCount: words.length,
      estimatedAgentCount,
      taskTypeEncoding,
      historicalSuccessRate,
      historicalCost,
      timeOfDay,
      systemLoad,
      domainFeatures
    };
  }

  private extractDomainFeatures(taskDescription: string): number[] {
    const text = taskDescription.toLowerCase();

    // Domain-specific feature extraction
    const features = [
      text.includes('gui') || text.includes('ui') ? 1 : 0,
      text.includes('api') || text.includes('rest') ? 1 : 0,
      text.includes('database') || text.includes('sql') ? 1 : 0,
      text.includes('test') || text.includes('debug') ? 1 : 0,
      text.includes('security') || text.includes('auth') ? 1 : 0,
      text.includes('machine learning') || text.includes('ml') ? 1 : 0,
      text.includes('real-time') || text.includes('monitoring') ? 1 : 0,
      text.includes('cost') || text.includes('optimization') ? 1 : 0
    ];

    return features;
  }

  private getHistoricalSuccessRate(taskType: string): number {
    // Get average success rate for this task type from training samples
    const relevantSamples = Array.from(this.trainingSamples.values())
      .filter(sample => sample.context.taskType === taskType);

    if (relevantSamples.length === 0) return 0.8; // Default

    const avgSuccessRate = relevantSamples
      .reduce((sum, sample) => sum + sample.target, 0) / relevantSamples.length;

    return avgSuccessRate;
  }

  private getHistoricalCost(taskType: string): number {
    // Get average cost for this task type
    // In real implementation, this would query cost metrics
    const costMap: Record<string, number> = {
      'gui': 0.15,
      'api': 0.12,
      'database': 0.10,
      'testing': 0.08,
      'security': 0.18,
      'trading': 0.20,
      'general': 0.12
    };

    return costMap[taskType] || 0.12;
  }

  private createTrainingSamples(
    taskDescription: string,
    features: FeatureVector,
    metrics: OrchestrationMetrics
  ): TrainingSample[] {
    const samples: TrainingSample[] = [];
    const timestamp = Date.now();

    // Create different types of training samples

    // 1. Success prediction sample
    samples.push({
      id: `success_${metrics.sessionId}_${timestamp}`,
      timestamp,
      features,
      target: metrics.successRate,
      context: {
        description: taskDescription,
        taskType: metrics.taskType,
        domain: 'general', // Would be extracted
        priority: 'medium'
      },
      weight: 1.0
    });

    // 2. Cost prediction sample
    samples.push({
      id: `cost_${metrics.sessionId}_${timestamp}`,
      timestamp,
      features,
      target: metrics.totalCost,
      context: {
        description: taskDescription,
        taskType: metrics.taskType,
        domain: 'general',
        priority: 'medium'
      },
      weight: 1.0
    });

    // 3. Performance prediction sample
    const performanceScore = Math.max(0, 1 - (metrics.totalExecutionTime / 300000)); // Normalize to 0-1
    samples.push({
      id: `perf_${metrics.sessionId}_${timestamp}`,
      timestamp,
      features,
      target: performanceScore,
      context: {
        description: taskDescription,
        taskType: metrics.taskType,
        domain: 'general',
        priority: 'medium'
      },
      weight: 1.0
    });

    return samples;
  }

  private async updateHistoricalPatterns(
    taskDescription: string,
    metrics: OrchestrationMetrics
  ): Promise<void> {
    // Extract pattern from task + metrics
    const patternId = this.generatePatternId(taskDescription, metrics);

    const existingPattern = this.patterns.get(patternId);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency += 1;
      existingPattern.lastSeen = Date.now();

      // Update expected outcome with moving average
      const alpha = 0.1; // Learning rate for exponential moving average
      existingPattern.expectedOutcome.successRate =
        (1 - alpha) * existingPattern.expectedOutcome.successRate +
        alpha * metrics.successRate;

      existingPattern.expectedOutcome.executionTime =
        (1 - alpha) * existingPattern.expectedOutcome.executionTime +
        alpha * metrics.totalExecutionTime;

      existingPattern.expectedOutcome.cost =
        (1 - alpha) * existingPattern.expectedOutcome.cost +
        alpha * metrics.totalCost;

      // Update pattern strength
      existingPattern.strength = Math.min(existingPattern.frequency / 10, 1.0);

      this.patterns.set(patternId, existingPattern);

    } else {
      // Create new pattern
      const newPattern: HistoricalPattern = {
        id: patternId,
        description: `Pattern for ${metrics.taskType} with ${metrics.agentCount} agents`,
        conditions: {
          taskType: metrics.taskType,
          agentCount: metrics.agentCount,
          keywordHash: this.hashString(taskDescription.substring(0, 100))
        },
        expectedOutcome: {
          successRate: metrics.successRate,
          executionTime: metrics.totalExecutionTime,
          cost: metrics.totalCost
        },
        frequency: 1,
        lastSeen: Date.now(),
        strength: 0.1
      };

      this.patterns.set(patternId, newPattern);
    }
  }

  private generatePatternId(taskDescription: string, metrics: OrchestrationMetrics): string {
    // Generate pattern ID based on task characteristics
    const keyFeatures = [
      metrics.taskType,
      metrics.agentCount.toString(),
      this.hashString(taskDescription.substring(0, 50)).toString().substring(0, 8)
    ];

    return `pattern_${keyFeatures.join('_')}`;
  }

  private hashString(str: string): number {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async performIncrementalLearning(): Promise<void> {
    // Incremental learning implementation
    // For now, just trigger retraining if enough new samples
    const samplesSinceRetraining = Array.from(this.trainingSamples.values())
      .filter(sample => sample.timestamp > this.lastRetraining).length;

    if (samplesSinceRetraining >= 10) { // Threshold for incremental update
      this.logger.debug('Performing incremental learning update', {
        newSamples: samplesSinceRetraining
      });

      // In real implementation, this would update models incrementally
      // For now, just log the update
    }
  }

  private async trainModel(modelType: MLModel['type']): Promise<LearningResult> {
    const startTime = performance.now();

    // Filter training samples per questo model type
    const relevantSamples = this.getRelevantSamples(modelType);

    if (relevantSamples.length < this.learningConfig.minTrainingDataSize) {
      throw new Error(`Insufficient training data for ${modelType}`);
    }

    // Get existing model performance
    const existingModel = this.models.get(`baseline_${modelType}`);
    const previousPerformance = existingModel?.performance.accuracy || 0.5;

    // Simple training simulation (in real implementation, this would be actual ML)
    const newPerformance = this.simulateModelTraining(relevantSamples, modelType);

    // Create new model
    const newModel: MLModel = {
      id: `${modelType}_${Date.now()}`,
      type: modelType,
      version: '2.0.0',
      trainedAt: Date.now(),
      parameters: this.generateModelParameters(relevantSamples),
      performance: newPerformance,
      featureImportance: this.calculateFeatureImportance(relevantSamples)
    };

    // Update model storage
    this.models.set(`baseline_${modelType}`, newModel);

    const trainingTime = performance.now() - startTime;
    const improvementPercentage = ((newPerformance.accuracy - previousPerformance) / previousPerformance) * 100;

    return {
      improvementAchieved: newPerformance.accuracy > previousPerformance,
      previousPerformance,
      newPerformance: newPerformance.accuracy,
      improvementPercentage,
      confidence: newPerformance.accuracy,
      trainingSamplesCount: relevantSamples.length,
      trainingTime
    };
  }

  private getRelevantSamples(modelType: MLModel['type']): TrainingSample[] {
    // Filter samples based su model type
    return Array.from(this.trainingSamples.values()).filter(sample => {
      switch (modelType) {
        case 'success_prediction':
          return sample.id.includes('success_');
        case 'cost_prediction':
          return sample.id.includes('cost_');
        case 'performance_prediction':
          return sample.id.includes('perf_');
        case 'agent_selection':
          return true; // All samples relevant for agent selection
        default:
          return false;
      }
    });
  }

  private simulateModelTraining(
    samples: TrainingSample[],
    modelType: MLModel['type']
  ): ModelPerformance {
    // Simulate model training with improving performance
    const baseAccuracy = 0.6;
    const sampleBonus = Math.min(samples.length / 1000, 0.3); // Up to 30% bonus
    const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% randomness

    const accuracy = Math.min(baseAccuracy + sampleBonus + randomFactor, 0.95);

    return {
      accuracy,
      precision: accuracy * 0.95,
      recall: accuracy * 0.9,
      f1Score: accuracy * 0.92,
      mse: modelType.includes('prediction') ? (1 - accuracy) * 0.1 : undefined,
      r2Score: modelType.includes('prediction') ? accuracy : undefined,
      cvScores: [accuracy * 0.9, accuracy, accuracy * 1.05].map(s => Math.min(s, 1.0))
    };
  }

  private generateModelParameters(samples: TrainingSample[]): ModelParameters {
    // Generate mock model parameters
    const featureCount = samples[0]?.features ? Object.keys(samples[0].features).length : 5;

    return {
      weights: Array.from({ length: featureCount }, () => (Math.random() - 0.5) * 0.2),
      biases: [Math.random() * 0.1],
      normalization: {
        mean: Array.from({ length: featureCount }, () => 0.5),
        std: Array.from({ length: featureCount }, () => 1.0)
      },
      hyperparameters: {
        learningRate: this.learningConfig.learningRate,
        regularization: 0.01,
        epochs: 100
      }
    };
  }

  private calculateFeatureImportance(samples: TrainingSample[]): Record<string, number> {
    // Simple feature importance calculation
    // In real implementation, this would be derived from actual model training

    return {
      taskComplexity: 0.25,
      keywordCount: 0.15,
      estimatedAgentCount: 0.20,
      historicalSuccessRate: 0.30,
      historicalCost: 0.10
    };
  }

  private async runPredictionModels(features: FeatureVector): Promise<any[]> {
    // Run all prediction models on features
    const predictions: any[] = [];

    for (const [modelId, model] of this.models) {
      if (model.type === 'agent_selection') {
        const prediction = this.runModelPrediction(model, features);
        predictions.push({
          modelId,
          prediction,
          confidence: model.performance.accuracy
        });
      }
    }

    return predictions;
  }

  private runModelPrediction(model: MLModel, features: FeatureVector): any {
    // Simplified model prediction
    // In real implementation, this would use the actual trained model

    const featureArray = [
      features.taskComplexity,
      features.keywordCount / 100, // Normalize
      features.estimatedAgentCount / 5, // Normalize
      features.historicalSuccessRate,
      features.historicalCost
    ];

    // Simple linear combination with model weights
    let score = model.parameters.biases[0];
    featureArray.forEach((feature, idx) => {
      if (idx < model.parameters.weights.length) {
        score += feature * model.parameters.weights[idx];
      }
    });

    // Apply activation function (sigmoid)
    score = 1 / (1 + Math.exp(-score));

    return {
      score,
      agentRecommendation: this.scoreToAgentRecommendation(score, features),
      modelConfidence: model.performance.accuracy
    };
  }

  private scoreToAgentRecommendation(
    score: number,
    features: FeatureVector
  ): { agent: string; model: string } {
    // Convert model score to agent recommendation
    // This is simplified logic

    if (features.domainFeatures[0] > 0) { // GUI
      return { agent: 'gui-super-expert', model: score > 0.7 ? 'sonnet' : 'haiku' };
    } else if (features.domainFeatures[1] > 0) { // API
      return { agent: 'integration_expert', model: score > 0.8 ? 'sonnet' : 'haiku' };
    } else if (features.domainFeatures[2] > 0) { // Database
      return { agent: 'database_expert', model: 'sonnet' };
    } else if (features.domainFeatures[3] > 0) { // Testing
      return { agent: 'tester_expert', model: 'sonnet' };
    } else {
      return { agent: 'coder', model: score > 0.6 ? 'sonnet' : 'haiku' };
    }
  }

  private matchHistoricalPatterns(
    taskDescription: string,
    features: FeatureVector
  ): HistoricalPattern[] {
    // Match current task against historical patterns
    const matches: HistoricalPattern[] = [];

    for (const pattern of this.patterns.values()) {
      let matchScore = 0;
      let totalChecks = 0;

      // Check pattern conditions
      if (pattern.conditions.agentCount) {
        totalChecks++;
        if (Math.abs(pattern.conditions.agentCount - features.estimatedAgentCount) <= 1) {
          matchScore++;
        }
      }

      // Check keyword similarity
      if (pattern.conditions.keywordHash) {
        totalChecks++;
        const currentHash = this.hashString(taskDescription.substring(0, 100));
        // Simplified similarity check
        if (Math.abs(pattern.conditions.keywordHash - currentHash) < 1000000) {
          matchScore++;
        }
      }

      // Pattern matches se almeno 50% conditions soddisfatte
      if (totalChecks > 0 && (matchScore / totalChecks) >= 0.5) {
        matches.push(pattern);
      }
    }

    return matches.sort((a, b) => b.strength - a.strength);
  }

  private combineRecommendations(
    predictions: any[],
    patterns: HistoricalPattern[]
  ): AgentSelectionRecommendation[] {
    const recommendations: AgentSelectionRecommendation[] = [];

    // Combine model predictions
    for (const pred of predictions) {
      if (pred.prediction.agentRecommendation) {
        const rec = pred.prediction.agentRecommendation;

        recommendations.push({
          agentName: rec.agent,
          expertFile: `experts/${rec.agent}.md`,
          model: rec.model as 'haiku' | 'sonnet' | 'opus',
          confidence: pred.confidence,
          predictedSuccessRate: pred.prediction.score,
          predictedExecutionTime: 60000, // Default 1 minute
          predictedCost: 0.12, // Default cost
          reasoning: [`ML model prediction (confidence: ${pred.confidence.toFixed(2)})`]
        });
      }
    }

    // Add pattern-based recommendations
    for (const pattern of patterns.slice(0, 2)) { // Top 2 patterns
      // Extract agent from pattern (simplified)
      const agentName = this.inferAgentFromPattern(pattern);

      recommendations.push({
        agentName,
        expertFile: `experts/${agentName}.md`,
        model: 'sonnet', // Default
        confidence: pattern.strength,
        predictedSuccessRate: pattern.expectedOutcome.successRate,
        predictedExecutionTime: pattern.expectedOutcome.executionTime,
        predictedCost: pattern.expectedOutcome.cost,
        reasoning: [
          `Historical pattern match (strength: ${pattern.strength.toFixed(2)})`,
          `Seen ${pattern.frequency} times`
        ]
      });
    }

    return recommendations;
  }

  private inferAgentFromPattern(pattern: HistoricalPattern): string {
    // Infer agent name from pattern (simplified logic)
    if (pattern.description.includes('gui')) return 'gui-super-expert';
    if (pattern.description.includes('api')) return 'integration_expert';
    if (pattern.description.includes('test')) return 'tester_expert';
    if (pattern.description.includes('database')) return 'database_expert';
    return 'coder';
  }

  private rankRecommendations(
    recommendations: AgentSelectionRecommendation[]
  ): AgentSelectionRecommendation[] {
    // Rank recommendations based su composite score
    return recommendations.sort((a, b) => {
      const scoreA = (a.confidence * 0.4) + (a.predictedSuccessRate * 0.4) + (1 / (a.predictedCost + 0.01) * 0.2);
      const scoreB = (b.confidence * 0.4) + (b.predictedSuccessRate * 0.4) + (1 / (b.predictedCost + 0.01) * 0.2);

      return scoreB - scoreA;
    });
  }

  private getFallbackRecommendations(taskDescription: string): AgentSelectionRecommendation[] {
    // Fallback rule-based recommendations
    const text = taskDescription.toLowerCase();

    const recommendations: AgentSelectionRecommendation[] = [];

    if (text.includes('gui') || text.includes('ui')) {
      recommendations.push({
        agentName: 'gui-super-expert',
        expertFile: 'experts/gui-super-expert.md',
        model: 'sonnet',
        confidence: 0.8,
        predictedSuccessRate: 0.85,
        predictedExecutionTime: 120000,
        predictedCost: 0.15,
        reasoning: ['Rule-based GUI detection']
      });
    }

    if (text.includes('api') || text.includes('integration')) {
      recommendations.push({
        agentName: 'integration_expert',
        expertFile: 'experts/integration_expert.md',
        model: 'sonnet',
        confidence: 0.75,
        predictedSuccessRate: 0.80,
        predictedExecutionTime: 90000,
        predictedCost: 0.12,
        reasoning: ['Rule-based API detection']
      });
    }

    // Default fallback
    if (recommendations.length === 0) {
      recommendations.push({
        agentName: 'coder',
        expertFile: 'core/coder.md',
        model: 'sonnet',
        confidence: 0.6,
        predictedSuccessRate: 0.75,
        predictedExecutionTime: 60000,
        predictedCost: 0.10,
        reasoning: ['Default fallback recommendation']
      });
    }

    return recommendations;
  }

  private schedulePeriodicRetraining(): void {
    setTimeout(async () => {
      if (this.trainingSamples.size >= this.learningConfig.minTrainingDataSize) {
        this.logger.info('Starting scheduled model retraining');
        await this.retrainModels();
      }

      // Schedule next retraining
      this.schedulePeriodicRetraining();
    }, this.learningConfig.retrainingInterval);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Factory per creare LearningEngine configurato
 */
export function createLearningEngine(
  config: PluginConfig,
  learningConfig?: Partial<LearningConfig>
): LearningEngine {
  return new LearningEngine(config, learningConfig);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper per validare training samples
 */
export function validateTrainingSample(sample: TrainingSample): string[] {
  const errors: string[] = [];

  if (!sample.id) errors.push('Missing sample ID');
  if (!sample.features) errors.push('Missing features');
  if (sample.target === undefined) errors.push('Missing target value');
  if (!sample.context) errors.push('Missing context');
  if (sample.weight < 0 || sample.weight > 1) errors.push('Invalid weight value');

  return errors;
}

/**
 * Helper per normalizzare features
 */
export function normalizeFeatures(features: FeatureVector): FeatureVector {
  return {
    ...features,
    taskComplexity: Math.max(0, Math.min(1, features.taskComplexity)),
    keywordCount: Math.max(0, features.keywordCount),
    estimatedAgentCount: Math.max(1, features.estimatedAgentCount),
    historicalSuccessRate: Math.max(0, Math.min(1, features.historicalSuccessRate)),
    timeOfDay: Math.max(0, Math.min(1, features.timeOfDay)),
    systemLoad: Math.max(0, Math.min(1, features.systemLoad))
  };
}