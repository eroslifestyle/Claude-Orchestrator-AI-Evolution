/**
 * Ralph Loop Integration - Iterative Task Execution Engine
 *
 * Integrazione seamless con ralph-loop skill per task iterativi con:
 * - Auto-detection criteri di successo
 * - Progress tracking e convergence monitoring
 * - Loop termination intelligente
 * - Performance optimization
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */

import type {
  ExtractedKeyword
} from '../analysis/types';

import type { PluginConfig } from '../types';
import { PluginLogger } from '../utils/logger';

// =============================================================================
// RALPH LOOP INTEGRATION TYPES
// =============================================================================

/**
 * Configurazione Ralph Loop
 */
export interface RalphLoopConfig {
  /** Massimo numero di iterazioni permesse */
  maxIterations: number;
  /** Timeout per singola iterazione (ms) */
  iterationTimeoutMs: number;
  /** Soglia di convergenza (0.0-1.0) */
  convergenceThreshold: number;
  /** Numero massimo iterazioni senza progresso prima di fermarsi */
  maxStagnantIterations: number;
  /** Abilita monitoring avanzato */
  enableAdvancedMonitoring: boolean;
}

/**
 * Criteri di successo per terminazione loop
 */
export interface SuccessCriteria {
  /** ID univoco criterio */
  id: string;
  /** Descrizione human-readable */
  description: string;
  /** Pattern regex da matchare nell'output */
  pattern?: string;
  /** Test function personalizzato */
  testFn?: (output: string, context: LoopContext) => boolean;
  /** Peso criterio (0.0-1.0) */
  weight: number;
  /** Obbligatorio o opzionale */
  required: boolean;
}

/**
 * Context di esecuzione loop
 */
export interface LoopContext {
  /** Iterazione corrente */
  currentIteration: number;
  /** Timestamp avvio */
  startTime: number;
  /** Storia delle iterazioni */
  iterationHistory: LoopIteration[];
  /** Progress score aggregato */
  progressScore: number;
  /** Ultimo output significativo */
  lastOutput: string;
  /** Metadata aggiuntivi */
  metadata: Record<string, any>;
}

/**
 * Singola iterazione loop
 */
export interface LoopIteration {
  /** Numero iterazione */
  iteration: number;
  /** Timestamp */
  timestamp: number;
  /** Input prompt */
  input: string;
  /** Output prodotto */
  output: string;
  /** Score di progresso */
  progressScore: number;
  /** Criteri soddisfatti */
  satisfiedCriteria: string[];
  /** Tempo esecuzione (ms) */
  executionTime: number;
  /** Errori eventuali */
  errors?: string[];
}

/**
 * Risultato detection Ralph Loop
 */
export interface LoopDetectionResult {
  /** Dovrebbe usare Ralph Loop */
  shouldUseLoop: boolean;
  /** Confidence della detection (0.0-1.0) */
  confidence: number;
  /** Criteri di successo identificati */
  detectedCriteria: SuccessCriteria[];
  /** Max iterazioni stimato */
  estimatedMaxIterations: number;
  /** Timeout stimato per iterazione */
  estimatedIterationTimeout: number;
  /** Reasoning della decisione */
  reasoning: string;
}

/**
 * Risultato esecuzione Ralph Loop
 */
export interface RalphLoopResult {
  /** Successo finale */
  success: boolean;
  /** Numero iterazioni eseguite */
  iterationsExecuted: number;
  /** Tempo totale esecuzione */
  totalExecutionTime: number;
  /** Ragione terminazione */
  terminationReason: 'success' | 'maxIterations' | 'timeout' | 'stagnation' | 'error';
  /** Context finale */
  finalContext: LoopContext;
  /** Output finale */
  finalOutput: string;
  /** Performance metrics */
  metrics: RalphLoopMetrics;
}

/**
 * Metriche performance Ralph Loop
 */
export interface RalphLoopMetrics {
  /** Accuracy detection (se testable) */
  detectionAccuracy?: number;
  /** Velocità convergenza */
  convergenceRate: number;
  /** Efficienza iterazioni */
  iterationEfficiency: number;
  /** Score qualità finale */
  finalQualityScore: number;
  /** Resource utilization */
  resourceUtilization: {
    cpu: number;
    memory: number;
    tokens: number;
  };
}

// =============================================================================
// RALPH LOOP INTEGRATION CLASS
// =============================================================================

export class RalphLoopIntegration {
  private loopConfig: RalphLoopConfig;
  private logger: PluginLogger;
  private detectionPatterns: Map<string, RegExp>;
  private builtinCriteria: Map<string, SuccessCriteria>;

  constructor(config: PluginConfig, loopConfig?: Partial<RalphLoopConfig>) {
    this.logger = new PluginLogger('RalphLoopIntegration');

    // Default configuration
    this.loopConfig = {
      maxIterations: 35,
      iterationTimeoutMs: 30000,
      convergenceThreshold: 0.85,
      maxStagnantIterations: 5,
      enableAdvancedMonitoring: true,
      ...loopConfig
    };

    this.detectionPatterns = new Map();
    this.builtinCriteria = new Map();

    this.initializeDetectionPatterns();
    this.initializeBuiltinCriteria();

    this.logger.info('RalphLoopIntegration initialized', {
      maxIterations: this.loopConfig.maxIterations,
      convergenceThreshold: this.loopConfig.convergenceThreshold
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Detecta se il task dovrebbe usare Ralph Loop
   */
  public async detectLoopRequirement(
    taskDescription: string,
    extractedKeywords: ExtractedKeyword[]
  ): Promise<LoopDetectionResult> {
    const startTime = performance.now();
    this.logger.info('Starting Ralph Loop detection', {
      taskLength: taskDescription.length,
      keywordCount: extractedKeywords.length
    });

    try {
      // 1. Pattern-based detection
      const patternMatches = this.detectIterativePatterns(taskDescription);

      // 2. Keyword-based analysis
      const keywordScore = this.analyzeKeywordsForLoop(extractedKeywords);

      // 3. Success criteria detection
      const detectedCriteria = this.detectSuccessCriteria(taskDescription);

      // 4. Calcola confidence aggregato
      const confidence = this.calculateDetectionConfidence(
        patternMatches, keywordScore, detectedCriteria
      );

      // 5. Decision logic
      const shouldUseLoop = confidence >= 0.7 && detectedCriteria.length > 0;

      // 6. Stima parametri ottimali
      const estimatedParams = this.estimateLoopParameters(
        taskDescription, detectedCriteria, confidence
      );

      const result: LoopDetectionResult = {
        shouldUseLoop,
        confidence,
        detectedCriteria,
        estimatedMaxIterations: estimatedParams.maxIterations,
        estimatedIterationTimeout: estimatedParams.timeoutMs,
        reasoning: this.generateDetectionReasoning(
          patternMatches, keywordScore, detectedCriteria, confidence
        )
      };

      const executionTime = performance.now() - startTime;
      this.logger.info('Ralph Loop detection completed', {
        shouldUseLoop,
        confidence,
        criteriaCount: detectedCriteria.length,
        executionTime: Math.round(executionTime)
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error in Ralph Loop detection', { error: errorMessage });

      // Fallback: conservative detection
      return {
        shouldUseLoop: false,
        confidence: 0.0,
        detectedCriteria: [],
        estimatedMaxIterations: this.loopConfig.maxIterations,
        estimatedIterationTimeout: this.loopConfig.iterationTimeoutMs,
        reasoning: `Detection failed: ${errorMessage}`
      };
    }
  }

  /**
   * Esegue Ralph Loop con monitoring avanzato
   */
  public async executeRalphLoop(
    initialPrompt: string,
    successCriteria: SuccessCriteria[],
    options?: Partial<RalphLoopConfig>
  ): Promise<RalphLoopResult> {
    const startTime = performance.now();
    const config = { ...this.loopConfig, ...options };

    this.logger.info('Starting Ralph Loop execution', {
      promptLength: initialPrompt.length,
      criteriaCount: successCriteria.length,
      maxIterations: config.maxIterations
    });

    // Initialize context
    const context: LoopContext = {
      currentIteration: 0,
      startTime,
      iterationHistory: [],
      progressScore: 0.0,
      lastOutput: '',
      metadata: {}
    };

    let terminationReason: RalphLoopResult['terminationReason'] = 'error';

    try {
      // Main loop
      for (let i = 1; i <= config.maxIterations; i++) {
        context.currentIteration = i;
        this.logger.debug(`Ralph Loop iteration ${i}/${config.maxIterations}`);

        // Execute iteration
        const iteration = await this.executeIteration(
          initialPrompt, context, successCriteria, config
        );

        context.iterationHistory.push(iteration);
        context.lastOutput = iteration.output;
        context.progressScore = iteration.progressScore;

        // Check success criteria
        if (this.evaluateSuccessCriteria(successCriteria, iteration)) {
          terminationReason = 'success';
          this.logger.info(`Ralph Loop succeeded at iteration ${i}`);
          break;
        }

        // Check stagnation
        if (this.detectStagnation(context, config)) {
          terminationReason = 'stagnation';
          this.logger.warn(`Ralph Loop stagnated at iteration ${i}`);
          break;
        }

        // Check timeout
        if (performance.now() - startTime > config.iterationTimeoutMs * config.maxIterations) {
          terminationReason = 'timeout';
          this.logger.warn(`Ralph Loop timed out at iteration ${i}`);
          break;
        }
      }

      if (terminationReason === 'error') {
        terminationReason = 'maxIterations';
        this.logger.info('Ralph Loop reached maximum iterations');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error during Ralph Loop execution', { error: errorMessage });
      terminationReason = 'error';
    }

    // Generate final result
    const totalExecutionTime = performance.now() - startTime;
    const metrics = this.calculateLoopMetrics(context, totalExecutionTime);

    const result: RalphLoopResult = {
      success: terminationReason === 'success',
      iterationsExecuted: context.currentIteration,
      totalExecutionTime,
      terminationReason,
      finalContext: context,
      finalOutput: context.lastOutput,
      metrics
    };

    this.logger.info('Ralph Loop execution completed', {
      success: result.success,
      iterations: result.iterationsExecuted,
      totalTime: Math.round(totalExecutionTime),
      terminationReason
    });

    return result;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private initializeDetectionPatterns(): void {
    // Patterns che indicano necessità di iterazione
    const patterns = {
      'tdd_cycle': /\b(test[- ]driven|TDD|red[- ]green[- ]refactor|test.*pass|failing.*test)\b/gi,
      'iterative_dev': /\b(iterate|iteration|loop|repeat|until|while|refine|improve)\b/gi,
      'success_criteria': /\b(success|complete|done|finish|achieve|meet.*criteria|requirement.*met)\b/gi,
      'test_automation': /\b(automatic.*test|test.*suite|CI\/CD|build.*test|test.*runner)\b/gi,
      'feedback_loop': /\b(feedback|review|validate|check|verify|ensure)\b/gi,
      'feature_development': /\b(feature.*implement|greenfield|from.*scratch|new.*feature)\b/gi
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      this.detectionPatterns.set(key, pattern);
    });

    this.logger.debug('Detection patterns initialized', {
      patternCount: this.detectionPatterns.size
    });
  }

  private initializeBuiltinCriteria(): void {
    // Criteri predefiniti comuni
    const criteria: SuccessCriteria[] = [
      {
        id: 'tests_passing',
        description: 'All tests are passing',
        pattern: '(all.*tests?.*pass|tests?.*successful|no.*fail|green.*build)',
        weight: 1.0,
        required: false
      },
      {
        id: 'build_success',
        description: 'Build completed successfully',
        pattern: '(build.*success|compilation.*success|no.*error)',
        weight: 0.8,
        required: false
      },
      {
        id: 'feature_complete',
        description: 'Feature implementation complete',
        pattern: '(feature.*complete|implementation.*done|requirement.*met)',
        weight: 0.9,
        required: false
      },
      {
        id: 'api_working',
        description: 'API endpoints functional',
        pattern: '(API.*work|endpoint.*respond|request.*success)',
        weight: 0.7,
        required: false
      }
    ];

    criteria.forEach(criterion => {
      this.builtinCriteria.set(criterion.id, criterion);
    });

    this.logger.debug('Built-in criteria initialized', {
      criteriaCount: this.builtinCriteria.size
    });
  }

  private detectIterativePatterns(text: string): Map<string, number> {
    const matches = new Map<string, number>();

    for (const [patternName, pattern] of Array.from(this.detectionPatterns.entries())) {
      const patternMatches = Array.from(text.matchAll(pattern));
      matches.set(patternName, patternMatches.length);
    }

    return matches;
  }

  private analyzeKeywordsForLoop(keywords: ExtractedKeyword[]): number {
    // Keywords che indicano task iterativo
    const iterativeKeywords = [
      'test', 'tdd', 'iterate', 'loop', 'repeat', 'refactor',
      'improve', 'until', 'criteria', 'success', 'complete'
    ];

    const relevantKeywords = keywords.filter(kw =>
      iterativeKeywords.some(iterKw =>
        kw.text.toLowerCase().includes(iterKw) ||
        kw.synonyms.some(syn => syn.toLowerCase().includes(iterKw))
      )
    );

    const avgConfidence = relevantKeywords.length > 0
      ? relevantKeywords.reduce((sum, kw) => sum + kw.confidence, 0) / relevantKeywords.length
      : 0;

    return Math.min(avgConfidence * (relevantKeywords.length / keywords.length), 1.0);
  }

  private detectSuccessCriteria(text: string): SuccessCriteria[] {
    const detected: SuccessCriteria[] = [];

    // Check built-in criteria
    for (const [_, criterion] of Array.from(this.builtinCriteria.entries())) {
      if (criterion.pattern && new RegExp(criterion.pattern, 'i').test(text)) {
        detected.push({ ...criterion });
      }
    }

    // Extract custom criteria (sentences with "success", "complete", etc.)
    const successSentences = text.match(/[^.!?]*\b(success|complete|done|finish|achieve)\b[^.!?]*/gi);
    if (successSentences) {
      successSentences.forEach((sentence, index) => {
        detected.push({
          id: `custom_${index}`,
          description: sentence.trim(),
          pattern: sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          weight: 0.6,
          required: false
        });
      });
    }

    return detected;
  }

  private calculateDetectionConfidence(
    patternMatches: Map<string, number>,
    keywordScore: number,
    criteria: SuccessCriteria[]
  ): number {
    // Weight factors
    const patternWeight = 0.4;
    const keywordWeight = 0.3;
    const criteriaWeight = 0.3;

    // Pattern score
    const totalMatches = Array.from(patternMatches.values()).reduce((sum, count) => sum + count, 0);
    const patternScore = Math.min(totalMatches / 5.0, 1.0); // Normalize to 0-1

    // Criteria score
    const criteriaScore = Math.min(criteria.length / 3.0, 1.0); // Normalize to 0-1

    return (patternScore * patternWeight) +
           (keywordScore * keywordWeight) +
           (criteriaScore * criteriaWeight);
  }

  private estimateLoopParameters(
    text: string,
    criteria: SuccessCriteria[],
    confidence: number
  ): { maxIterations: number; timeoutMs: number } {
    // Base estimates
    let maxIterations = this.loopConfig.maxIterations;
    let timeoutMs = this.loopConfig.iterationTimeoutMs;

    // Adjust based on text complexity
    const textComplexity = text.length / 1000; // Rough complexity metric
    maxIterations = Math.max(Math.min(maxIterations + Math.floor(textComplexity * 5), 50), 10);

    // Adjust based on criteria count
    const criteriaAdjustment = criteria.length * 3;
    maxIterations = Math.min(maxIterations + criteriaAdjustment, 50);

    // Adjust timeout based on confidence (lower confidence = more time)
    timeoutMs = Math.floor(timeoutMs * (2 - confidence));

    return { maxIterations, timeoutMs };
  }

  private generateDetectionReasoning(
    patternMatches: Map<string, number>,
    keywordScore: number,
    criteria: SuccessCriteria[],
    confidence: number
  ): string {
    const reasons = [];

    if (confidence >= 0.8) {
      reasons.push('High confidence - strong iterative patterns detected');
    } else if (confidence >= 0.5) {
      reasons.push('Medium confidence - some iterative indicators found');
    } else {
      reasons.push('Low confidence - limited iterative patterns');
    }

    const topPatterns = Array.from(patternMatches.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => `${pattern}(${count})`);

    if (topPatterns.length > 0) {
      reasons.push(`Patterns: ${topPatterns.join(', ')}`);
    }

    if (keywordScore > 0.5) {
      reasons.push(`Strong keyword indicators (score: ${keywordScore.toFixed(2)})`);
    }

    if (criteria.length > 0) {
      reasons.push(`${criteria.length} success criteria identified`);
    }

    return reasons.join('; ');
  }

  private async executeIteration(
    prompt: string,
    context: LoopContext,
    criteria: SuccessCriteria[],
    config: RalphLoopConfig
  ): Promise<LoopIteration> {
    const iterationStart = performance.now();

    // Simulated execution - In real implementation, this would:
    // 1. Call the actual ralph-loop skill
    // 2. Execute the prompt with Claude
    // 3. Capture the output
    // 4. Evaluate progress

    // For now, simulate with a basic implementation
    const simulatedOutput = `Iteration ${context.currentIteration} output: Processing ${prompt.substring(0, 50)}...`;

    // Calculate progress score
    const progressScore = this.calculateIterationProgress(
      simulatedOutput, context, criteria
    );

    // Check which criteria are satisfied
    const satisfiedCriteria = criteria
      .filter(criterion => this.evaluateSingleCriterion(criterion, simulatedOutput, context))
      .map(criterion => criterion.id);

    const executionTime = performance.now() - iterationStart;

    return {
      iteration: context.currentIteration,
      timestamp: Date.now(),
      input: prompt,
      output: simulatedOutput,
      progressScore,
      satisfiedCriteria,
      executionTime
    };
  }

  private calculateIterationProgress(
    output: string,
    context: LoopContext,
    criteria: SuccessCriteria[]
  ): number {
    // Calculate progress based on multiple factors
    let progress = 0.0;

    // Factor 1: Criteria satisfaction
    const satisfiedCount = criteria.filter(criterion =>
      this.evaluateSingleCriterion(criterion, output, context)
    ).length;

    const criteriaProgress = criteria.length > 0 ? satisfiedCount / criteria.length : 0;
    progress += criteriaProgress * 0.6;

    // Factor 2: Output quality/length (proxy for progress)
    const outputQuality = Math.min(output.length / 500, 1.0); // Normalize
    progress += outputQuality * 0.2;

    // Factor 3: Improvement over previous iteration
    if (context.iterationHistory.length > 0) {
      const lastScore = context.iterationHistory[context.iterationHistory.length - 1].progressScore;
      const improvement = Math.max(0, progress - lastScore) / 0.1; // Normalize improvement
      progress += Math.min(improvement, 0.2);
    }

    return Math.min(progress, 1.0);
  }

  private evaluateSuccessCriteria(
    criteria: SuccessCriteria[],
    iteration: LoopIteration
  ): boolean {
    // All required criteria must be satisfied
    const requiredCriteria = criteria.filter(c => c.required);
    const requiredSatisfied = requiredCriteria.every(criterion =>
      iteration.satisfiedCriteria.includes(criterion.id)
    );

    if (requiredCriteria.length > 0 && !requiredSatisfied) {
      return false;
    }

    // Calculate weighted satisfaction score
    let totalWeight = 0;
    let satisfiedWeight = 0;

    criteria.forEach(criterion => {
      totalWeight += criterion.weight;
      if (iteration.satisfiedCriteria.includes(criterion.id)) {
        satisfiedWeight += criterion.weight;
      }
    });

    const satisfactionRate = totalWeight > 0 ? satisfiedWeight / totalWeight : 0;
    return satisfactionRate >= this.loopConfig.convergenceThreshold;
  }

  private evaluateSingleCriterion(
    criterion: SuccessCriteria,
    output: string,
    context: LoopContext
  ): boolean {
    // Pattern-based evaluation
    if (criterion.pattern && new RegExp(criterion.pattern, 'i').test(output)) {
      return true;
    }

    // Custom test function
    if (criterion.testFn) {
      try {
        return criterion.testFn(output, context);
      } catch (error) {
        this.logger.warn(`Error evaluating custom criterion ${criterion.id}`, { error });
        return false;
      }
    }

    return false;
  }

  private detectStagnation(context: LoopContext, config: RalphLoopConfig): boolean {
    if (context.iterationHistory.length < config.maxStagnantIterations) {
      return false;
    }

    // Check last N iterations for lack of progress
    const recentIterations = context.iterationHistory.slice(-config.maxStagnantIterations);
    const progressValues = recentIterations.map(iter => iter.progressScore);

    // Calculate variance in progress scores
    const avgProgress = progressValues.reduce((sum, score) => sum + score, 0) / progressValues.length;
    const variance = progressValues.reduce((sum, score) => sum + Math.pow(score - avgProgress, 2), 0) / progressValues.length;

    // Stagnation if low variance (little change) and low absolute progress
    return variance < 0.01 && avgProgress < this.loopConfig.convergenceThreshold;
  }

  private calculateLoopMetrics(
    context: LoopContext,
    totalTime: number
  ): RalphLoopMetrics {
    const iterations = context.iterationHistory;

    // Convergence rate (how quickly we approached success)
    const finalScore = context.progressScore;
    const convergenceRate = iterations.length > 1
      ? finalScore / iterations.length
      : finalScore;

    // Iteration efficiency (average progress per iteration)
    const totalProgress = iterations.reduce((sum, iter) => sum + iter.progressScore, 0);
    const iterationEfficiency = iterations.length > 0 ? totalProgress / iterations.length : 0;

    // Final quality score (based on final progress and criteria satisfaction)
    const finalIteration = iterations[iterations.length - 1];
    const finalQualityScore = finalIteration ? finalIteration.progressScore : 0;

    // Resource utilization (simulated)
    const avgIterationTime = iterations.length > 0
      ? iterations.reduce((sum, iter) => sum + iter.executionTime, 0) / iterations.length
      : 0;

    return {
      convergenceRate,
      iterationEfficiency,
      finalQualityScore,
      resourceUtilization: {
        cpu: Math.min(avgIterationTime / 1000, 1.0), // Normalize to 0-1
        memory: Math.min(iterations.length / 50, 1.0), // Rough estimate
        tokens: iterations.length * 1000 // Estimate
      }
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Factory per creare RalphLoopIntegration configurato
 */
export function createRalphLoopIntegration(
  config: PluginConfig,
  loopConfig?: Partial<RalphLoopConfig>
): RalphLoopIntegration {
  return new RalphLoopIntegration(config, loopConfig);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Helper per validare criteri di successo
 */
export function validateSuccessCriteria(criteria: SuccessCriteria[]): string[] {
  const errors: string[] = [];

  criteria.forEach((criterion, index) => {
    if (!criterion.id) {
      errors.push(`Criterion at index ${index} missing id`);
    }

    if (!criterion.description) {
      errors.push(`Criterion ${criterion.id} missing description`);
    }

    if (criterion.weight < 0 || criterion.weight > 1) {
      errors.push(`Criterion ${criterion.id} weight must be between 0 and 1`);
    }

    if (!criterion.pattern && !criterion.testFn) {
      errors.push(`Criterion ${criterion.id} must have either pattern or testFn`);
    }
  });

  return errors;
}

/**
 * Helper per creare criteri predefiniti per task comuni
 */
export function createCommonCriteria(taskType: 'tdd' | 'api' | 'feature' | 'bugfix'): SuccessCriteria[] {
  switch (taskType) {
    case 'tdd':
      return [
        {
          id: 'tests_green',
          description: 'All tests passing',
          pattern: '(all.*tests?.*pass|green.*build|tests?.*successful)',
          weight: 1.0,
          required: true
        },
        {
          id: 'coverage_good',
          description: 'Code coverage adequate',
          pattern: '(coverage.*\\d+%|coverage.*good|well.*tested)',
          weight: 0.7,
          required: false
        }
      ];

    case 'api':
      return [
        {
          id: 'endpoints_working',
          description: 'API endpoints responding',
          pattern: '(API.*working|endpoints?.*respond|requests?.*successful)',
          weight: 1.0,
          required: true
        },
        {
          id: 'validation_working',
          description: 'Input validation functional',
          pattern: '(validation.*working|input.*validated|sanitized)',
          weight: 0.8,
          required: false
        }
      ];

    case 'feature':
      return [
        {
          id: 'feature_functional',
          description: 'Feature working as expected',
          pattern: '(feature.*working|functionality.*complete|requirements?.*met)',
          weight: 1.0,
          required: true
        },
        {
          id: 'edge_cases_handled',
          description: 'Edge cases handled',
          pattern: '(edge.*cases?.*handled|error.*handling|robust)',
          weight: 0.6,
          required: false
        }
      ];

    case 'bugfix':
      return [
        {
          id: 'bug_resolved',
          description: 'Bug no longer reproducing',
          pattern: '(bug.*fixed|issue.*resolved|problem.*solved|no.*longer.*occurs)',
          weight: 1.0,
          required: true
        },
        {
          id: 'no_regressions',
          description: 'No new regressions introduced',
          pattern: '(no.*regressions?|existing.*tests.*pass|stable)',
          weight: 0.9,
          required: true
        }
      ];

    default:
      return [];
  }
}