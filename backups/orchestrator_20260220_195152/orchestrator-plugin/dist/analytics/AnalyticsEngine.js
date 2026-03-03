"use strict";
/**
 * Advanced Analytics Engine - Real-time Performance Monitoring
 *
 * Sistema analytics avanzato per orchestration metrics con:
 * - Performance monitoring real-time
 * - Success pattern analysis & failure root cause detection
 * - Agent performance scoring & optimization recommendations
 * - Predictive analytics per performance optimization
 *
 * @version 1.0 - Fase 3 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockMetrics = exports.createAnalyticsEngine = exports.AnalyticsEngine = void 0;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
// =============================================================================
// ANALYTICS ENGINE CLASS
// =============================================================================
class AnalyticsEngine {
    config;
    analyticsConfig;
    logger;
    metricsBuffer;
    patternDatabase;
    alertsActive;
    updateTimer;
    constructor(config, analyticsConfig) {
        this.config = config;
        this.logger = new logger_1.PluginLogger('AnalyticsEngine');
        // Default configuration
        this.analyticsConfig = {
            enableRealTimeMonitoring: true,
            metricsUpdateInterval: 5000, // 5 seconds
            historyBufferSize: 1000,
            enablePredictiveAnalytics: true,
            performanceAlertThreshold: 0.8,
            enableAutoPatternDetection: true,
            ...analyticsConfig
        };
        this.metricsBuffer = [];
        this.patternDatabase = new Map();
        this.alertsActive = new Map();
        this.initializeEngine();
        this.logger.info('AnalyticsEngine initialized', {
            realTimeMonitoring: this.analyticsConfig.enableRealTimeMonitoring,
            updateInterval: this.analyticsConfig.metricsUpdateInterval,
            bufferSize: this.analyticsConfig.historyBufferSize
        });
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Registra metrics di una orchestration
     */
    recordOrchestrationMetrics(metrics) {
        this.logger.debug('Recording orchestration metrics', {
            sessionId: metrics.sessionId,
            taskType: metrics.taskType,
            executionTime: metrics.totalExecutionTime,
            successRate: metrics.successRate
        });
        // Add to buffer
        this.metricsBuffer.push(metrics);
        // Maintain buffer size
        if (this.metricsBuffer.length > this.analyticsConfig.historyBufferSize) {
            this.metricsBuffer.shift();
        }
        // Real-time analysis
        if (this.analyticsConfig.enableRealTimeMonitoring) {
            this.performRealTimeAnalysis(metrics);
        }
        // Pattern detection
        if (this.analyticsConfig.enableAutoPatternDetection) {
            this.detectPatterns([metrics]);
        }
    }
    /**
     * Analizza performance trends
     */
    analyzePerformanceTrends(timeWindow // minutes
    ) {
        const windowMs = ((timeWindow || 60) * 60) * 1000;
        const cutoffTime = Date.now() - windowMs;
        const recentMetrics = this.metricsBuffer.filter(m => m.timestamp >= cutoffTime);
        if (recentMetrics.length === 0) {
            return this.createEmptyTrendData();
        }
        // Group by time intervals (5-minute buckets)
        const intervalMs = 5 * 60 * 1000;
        const intervals = new Map();
        recentMetrics.forEach(metric => {
            const interval = Math.floor(metric.timestamp / intervalMs) * intervalMs;
            if (!intervals.has(interval)) {
                intervals.set(interval, []);
            }
            intervals.get(interval).push(metric);
        });
        // Calculate trend data
        const sortedIntervals = Array.from(intervals.keys()).sort();
        const labels = sortedIntervals.map(interval => new Date(interval).toLocaleTimeString());
        const successRateTrend = sortedIntervals.map(interval => {
            const metrics = intervals.get(interval);
            return metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
        });
        const performanceTrend = sortedIntervals.map(interval => {
            const metrics = intervals.get(interval);
            const avgTime = metrics.reduce((sum, m) => sum + m.totalExecutionTime, 0) / metrics.length;
            return Math.max(0, 1 - (avgTime / 10000)); // Normalize to 0-1 (10s = 0)
        });
        const costTrend = sortedIntervals.map(interval => {
            const metrics = intervals.get(interval);
            return metrics.reduce((sum, m) => sum + m.totalCost, 0) / metrics.length;
        });
        const throughputTrend = sortedIntervals.map(interval => {
            const metrics = intervals.get(interval);
            return metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
        });
        return {
            labels,
            successRateTrend,
            performanceTrend,
            costTrend,
            throughputTrend
        };
    }
    /**
     * Esegue root cause analysis su failures
     */
    async performRootCauseAnalysis(failureMetrics) {
        const startTime = perf_hooks_1.performance.now();
        this.logger.info('Starting root cause analysis', {
            failureCount: failureMetrics.length
        });
        const analyses = [];
        for (const failure of failureMetrics) {
            const analysis = await this.analyzeIndividualFailure(failure);
            analyses.push(analysis);
        }
        const executionTime = perf_hooks_1.performance.now() - startTime;
        this.logger.info('Root cause analysis completed', {
            analysisCount: analyses.length,
            executionTime: Math.round(executionTime)
        });
        return analyses;
    }
    /**
     * Genera performance predictions
     */
    async generatePerformancePredictions(taskDescriptors) {
        if (!this.analyticsConfig.enablePredictiveAnalytics) {
            throw new Error('Predictive analytics not enabled');
        }
        const startTime = perf_hooks_1.performance.now();
        this.logger.info('Generating performance predictions', {
            taskCount: taskDescriptors.length
        });
        const predictions = [];
        for (const descriptor of taskDescriptors) {
            const prediction = await this.predictTaskPerformance(descriptor);
            predictions.push(prediction);
        }
        const executionTime = perf_hooks_1.performance.now() - startTime;
        this.logger.info('Performance predictions completed', {
            predictionCount: predictions.length,
            executionTime: Math.round(executionTime)
        });
        return predictions;
    }
    /**
     * Ottiene dashboard data completo
     */
    getDashboardData() {
        const currentMetrics = this.getCurrentMetrics();
        const trendData = this.analyzePerformanceTrends(60); // Last hour
        const topAgents = this.getTopPerformingAgents(5);
        const patterns = this.getDetectedPatterns();
        const alerts = Array.from(this.alertsActive.values());
        const healthScore = this.calculateSystemHealthScore();
        return {
            currentMetrics,
            trendData,
            topAgents,
            patterns,
            alerts,
            healthScore
        };
    }
    /**
     * Avvia monitoring engine
     */
    startMonitoring() {
        if (!this.analyticsConfig.enableRealTimeMonitoring) {
            this.logger.warn('Real-time monitoring not enabled');
            return;
        }
        if (this.updateTimer) {
            this.stopMonitoring();
        }
        this.updateTimer = setInterval(() => {
            this.performPeriodicAnalysis();
        }, this.analyticsConfig.metricsUpdateInterval);
        this.logger.info('Analytics monitoring started', {
            interval: this.analyticsConfig.metricsUpdateInterval
        });
    }
    /**
     * Ferma monitoring engine
     */
    stopMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = undefined;
            this.logger.info('Analytics monitoring stopped');
        }
    }
    /**
     * Cleanup resources
     */
    dispose() {
        this.stopMonitoring();
        this.metricsBuffer = [];
        this.patternDatabase.clear();
        this.alertsActive.clear();
    }
    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================
    initializeEngine() {
        // Initialize built-in pattern templates
        this.initializePatternTemplates();
        // Start monitoring if enabled
        if (this.analyticsConfig.enableRealTimeMonitoring) {
            setTimeout(() => this.startMonitoring(), 1000);
        }
        this.logger.debug('Analytics engine initialized');
    }
    initializePatternTemplates() {
        // Common performance patterns
        const patterns = [
            {
                id: 'slow_agent_pattern',
                type: 'performance',
                description: 'Agent consistently performing slowly',
                confidence: 0.8,
                frequency: 0,
                impact: 0.7,
                conditions: { avgExecutionTime: '>5000', occurrences: '>3' },
                recommendations: ['Consider model downgrade', 'Optimize prompt complexity']
            },
            {
                id: 'high_cost_pattern',
                type: 'cost',
                description: 'Unexpectedly high costs for task type',
                confidence: 0.75,
                frequency: 0,
                impact: 0.8,
                conditions: { costPerTask: '>$0.50', taskType: 'simple' },
                recommendations: ['Review model selection', 'Optimize task breakdown']
            },
            {
                id: 'serial_bottleneck_pattern',
                type: 'performance',
                description: 'Sequential execution causing delays',
                confidence: 0.85,
                frequency: 0,
                impact: 0.9,
                conditions: { parallelizableAgents: '>2', sequentialExecution: true },
                recommendations: ['Enable parallel execution', 'Review dependencies']
            }
        ];
        patterns.forEach(pattern => {
            this.patternDatabase.set(pattern.id, pattern);
        });
        this.logger.debug('Pattern templates initialized', {
            patternCount: patterns.length
        });
    }
    performRealTimeAnalysis(metrics) {
        // Check for performance alerts
        this.checkPerformanceAlerts(metrics);
        // Update agent performance scores
        this.updateAgentScores(metrics.agentPerformance);
        // Check resource utilization
        this.checkResourceUtilization(metrics.resourceUtilization);
    }
    checkPerformanceAlerts(metrics) {
        const alerts = [];
        // Success rate alert
        if (metrics.successRate < this.analyticsConfig.performanceAlertThreshold) {
            alerts.push({
                id: `success_rate_${metrics.sessionId}`,
                type: 'performance',
                severity: metrics.successRate < 0.5 ? 'critical' : 'high',
                message: `Low success rate detected: ${(metrics.successRate * 100).toFixed(1)}%`,
                timestamp: Date.now(),
                triggerValue: metrics.successRate,
                threshold: this.analyticsConfig.performanceAlertThreshold,
                suggestedActions: [
                    'Review agent selection logic',
                    'Check model appropriateness',
                    'Analyze failure patterns'
                ]
            });
        }
        // Execution time alert
        if (metrics.totalExecutionTime > 300000) { // 5 minutes
            alerts.push({
                id: `execution_time_${metrics.sessionId}`,
                type: 'performance',
                severity: metrics.totalExecutionTime > 600000 ? 'critical' : 'medium',
                message: `Long execution time: ${(metrics.totalExecutionTime / 1000).toFixed(1)}s`,
                timestamp: Date.now(),
                triggerValue: metrics.totalExecutionTime,
                threshold: 300000,
                suggestedActions: [
                    'Enable parallelization',
                    'Optimize agent selection',
                    'Review task complexity'
                ]
            });
        }
        // Cost alert
        if (metrics.totalCost > 1.0) { // $1.00
            alerts.push({
                id: `cost_${metrics.sessionId}`,
                type: 'cost',
                severity: metrics.totalCost > 5.0 ? 'critical' : 'medium',
                message: `High cost detected: $${metrics.totalCost.toFixed(2)}`,
                timestamp: Date.now(),
                triggerValue: metrics.totalCost,
                threshold: 1.0,
                suggestedActions: [
                    'Review model selection strategy',
                    'Optimize prompt efficiency',
                    'Consider cost-performance tradeoffs'
                ]
            });
        }
        // Store active alerts
        alerts.forEach(alert => {
            this.alertsActive.set(alert.id, alert);
            // Auto-expire alerts after 1 hour
            setTimeout(() => {
                this.alertsActive.delete(alert.id);
            }, 60 * 60 * 1000);
        });
        if (alerts.length > 0) {
            this.logger.warn('Performance alerts triggered', {
                alertCount: alerts.length,
                sessionId: metrics.sessionId
            });
        }
    }
    updateAgentScores(agentMetrics) {
        // This would update a persistent agent performance database
        // For now, just log significant performance changes
        agentMetrics.forEach(agent => {
            if (agent.successRate < 0.7) {
                this.logger.warn('Agent underperforming', {
                    agentName: agent.agentName,
                    successRate: agent.successRate,
                    qualityScore: agent.qualityScore
                });
            }
        });
    }
    checkResourceUtilization(resources) {
        // Check for resource bottlenecks
        if (resources.cpuUsage > 80) {
            this.alertsActive.set('cpu_high', {
                id: 'cpu_high',
                type: 'resource',
                severity: 'high',
                message: `High CPU usage: ${resources.cpuUsage}%`,
                timestamp: Date.now(),
                triggerValue: resources.cpuUsage,
                threshold: 80,
                suggestedActions: ['Reduce concurrent operations', 'Optimize processing logic']
            });
        }
        if (resources.memoryUsage > 1000) { // 1GB
            this.alertsActive.set('memory_high', {
                id: 'memory_high',
                type: 'resource',
                severity: 'medium',
                message: `High memory usage: ${resources.memoryUsage}MB`,
                timestamp: Date.now(),
                triggerValue: resources.memoryUsage,
                threshold: 1000,
                suggestedActions: ['Clear caches', 'Optimize data structures']
            });
        }
    }
    detectPatterns(newMetrics) {
        // This would implement sophisticated pattern detection
        // For now, implement basic detection for common patterns
        for (const metrics of newMetrics) {
            // Detect slow agent pattern
            const slowAgents = metrics.agentPerformance.filter(agent => agent.executionTime > 5000);
            if (slowAgents.length > 0) {
                const pattern = this.patternDatabase.get('slow_agent_pattern');
                if (pattern) {
                    pattern.frequency += slowAgents.length;
                    this.patternDatabase.set('slow_agent_pattern', pattern);
                }
            }
            // Detect high cost pattern
            if (metrics.totalCost > 0.5 && metrics.taskType === 'simple') {
                const pattern = this.patternDatabase.get('high_cost_pattern');
                if (pattern) {
                    pattern.frequency += 1;
                    this.patternDatabase.set('high_cost_pattern', pattern);
                }
            }
        }
    }
    async analyzeIndividualFailure(failure) {
        // Analyze failure patterns
        const failedAgents = failure.agentPerformance.filter(agent => agent.successRate < 0.5);
        const highErrorAgents = failure.agentPerformance.filter(agent => agent.errorCount > 0);
        // Primary cause identification
        let primaryCause = 'Unknown failure';
        const contributingFactors = [];
        if (failure.totalExecutionTime > 300000) {
            primaryCause = 'Execution timeout';
            contributingFactors.push('Long-running tasks');
        }
        else if (failedAgents.length > 0) {
            primaryCause = `Agent failure: ${failedAgents[0].agentName}`;
            contributingFactors.push('Agent selection mismatch');
        }
        else if (failure.errorRate > 0.5) {
            primaryCause = 'High error rate';
            contributingFactors.push('System instability');
        }
        // Resource issues
        if (failure.resourceUtilization.cpuUsage > 90) {
            contributingFactors.push('CPU bottleneck');
        }
        if (failure.resourceUtilization.memoryUsage > 2000) {
            contributingFactors.push('Memory exhaustion');
        }
        // Agent-specific issues
        if (highErrorAgents.length > 0) {
            contributingFactors.push(`Errors in ${highErrorAgents.length} agents`);
        }
        return {
            failureId: failure.sessionId,
            primaryCause,
            contributingFactors,
            confidence: 0.7, // Would be calculated based on evidence strength
            suggestedFixes: [
                'Review agent selection criteria',
                'Optimize task breakdown',
                'Check resource constraints'
            ],
            preventionStrategies: [
                'Implement pre-execution checks',
                'Add performance monitoring',
                'Create fallback strategies'
            ],
            similarFailures: [] // Would be populated from historical data
        };
    }
    async predictTaskPerformance(taskDescriptor) {
        // Simplified prediction based on historical patterns
        // In real implementation, this would use ML models
        // Extract features from task descriptor
        const features = this.extractTaskFeatures(taskDescriptor);
        // Find similar historical tasks
        const similarTasks = this.findSimilarTasks(features);
        // Calculate predictions
        const avgExecutionTime = similarTasks.length > 0
            ? similarTasks.reduce((sum, task) => sum + task.totalExecutionTime, 0) / similarTasks.length
            : 60000; // Default 1 minute
        const avgSuccessRate = similarTasks.length > 0
            ? similarTasks.reduce((sum, task) => sum + task.successRate, 0) / similarTasks.length
            : 0.85; // Default 85%
        const avgCost = similarTasks.length > 0
            ? similarTasks.reduce((sum, task) => sum + task.totalCost, 0) / similarTasks.length
            : 0.10; // Default $0.10
        // Risk factors
        const riskFactors = [];
        if (features.complexity > 0.7)
            riskFactors.push('High task complexity');
        if (features.agentCount > 3)
            riskFactors.push('Multiple agents required');
        if (features.keywordCount > 10)
            riskFactors.push('Complex requirements');
        return {
            taskDescriptor,
            predictedExecutionTime: avgExecutionTime,
            predictedSuccessRate: avgSuccessRate,
            predictedCost: avgCost,
            confidenceInterval: {
                min: avgExecutionTime * 0.7,
                max: avgExecutionTime * 1.3
            },
            riskFactors,
            optimizationSuggestions: [
                'Consider task decomposition',
                'Review model selection strategy',
                'Enable parallel execution where possible'
            ]
        };
    }
    extractTaskFeatures(taskDescriptor) {
        // Simple feature extraction
        const keywordCount = taskDescriptor.split(/\s+/).length;
        const complexity = Math.min(keywordCount / 100, 1.0);
        // Estimate agent count based on keywords
        const agentKeywords = ['GUI', 'API', 'database', 'test', 'security'];
        const agentCount = agentKeywords.filter(kw => taskDescriptor.toLowerCase().includes(kw.toLowerCase())).length || 1;
        // Determine task type
        let taskType = 'general';
        if (taskDescriptor.toLowerCase().includes('gui'))
            taskType = 'gui';
        else if (taskDescriptor.toLowerCase().includes('api'))
            taskType = 'api';
        else if (taskDescriptor.toLowerCase().includes('test'))
            taskType = 'testing';
        return { complexity, agentCount, keywordCount, taskType };
    }
    findSimilarTasks(features) {
        // Find similar tasks from historical data
        return this.metricsBuffer.filter(metrics => metrics.taskType === features.taskType &&
            Math.abs(metrics.agentCount - features.agentCount) <= 1).slice(-10); // Last 10 similar tasks
    }
    performPeriodicAnalysis() {
        if (this.metricsBuffer.length === 0)
            return;
        // Check system health
        const healthScore = this.calculateSystemHealthScore();
        if (healthScore < 0.7) {
            this.logger.warn('System health below threshold', {
                healthScore,
                metricsCount: this.metricsBuffer.length
            });
        }
        // Pattern detection on recent data
        const recentMetrics = this.metricsBuffer.slice(-10);
        this.detectPatterns(recentMetrics);
        // Cleanup old alerts
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        Array.from(this.alertsActive.entries()).forEach(([alertId, alert]) => {
            if (now - alert.timestamp > oneHour) {
                this.alertsActive.delete(alertId);
            }
        });
    }
    getCurrentMetrics() {
        if (this.metricsBuffer.length === 0) {
            return this.createDefaultMetrics();
        }
        const recent = this.metricsBuffer.slice(-10);
        // Aggregate recent metrics
        return {
            timestamp: Date.now(),
            sessionId: 'current',
            taskType: 'aggregate',
            agentCount: Math.round(recent.reduce((sum, m) => sum + m.agentCount, 0) / recent.length),
            totalExecutionTime: Math.round(recent.reduce((sum, m) => sum + m.totalExecutionTime, 0) / recent.length),
            successRate: recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length,
            throughput: recent.reduce((sum, m) => sum + m.throughput, 0) / recent.length,
            totalCost: recent.reduce((sum, m) => sum + m.totalCost, 0) / recent.length,
            errorRate: recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length,
            resourceUtilization: {
                cpuUsage: recent.reduce((sum, m) => sum + m.resourceUtilization.cpuUsage, 0) / recent.length,
                memoryUsage: recent.reduce((sum, m) => sum + m.resourceUtilization.memoryUsage, 0) / recent.length,
                tokenUsage: recent.reduce((sum, m) => sum + m.resourceUtilization.tokenUsage, 0) / recent.length,
                apiCallCount: recent.reduce((sum, m) => sum + m.resourceUtilization.apiCallCount, 0) / recent.length,
                networkLatency: recent.reduce((sum, m) => sum + m.resourceUtilization.networkLatency, 0) / recent.length
            },
            agentPerformance: this.aggregateAgentMetrics(recent)
        };
    }
    getTopPerformingAgents(limit) {
        const allAgents = this.metricsBuffer.flatMap(m => m.agentPerformance);
        // Group by agent name and calculate averages
        const agentGroups = new Map();
        allAgents.forEach(agent => {
            if (!agentGroups.has(agent.agentName)) {
                agentGroups.set(agent.agentName, []);
            }
            agentGroups.get(agent.agentName).push(agent);
        });
        // Calculate aggregate metrics
        const aggregatedAgents = Array.from(agentGroups.entries()).map(([name, agents]) => {
            const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
            return {
                agentName: name,
                agentType: agents[0].agentType,
                model: agents[0].model,
                executionTime: avg(agents.map(a => a.executionTime)),
                successRate: avg(agents.map(a => a.successRate)),
                qualityScore: avg(agents.map(a => a.qualityScore)),
                costEfficiency: avg(agents.map(a => a.costEfficiency)),
                errorCount: Math.round(avg(agents.map(a => a.errorCount))),
                completionRate: avg(agents.map(a => a.completionRate))
            };
        });
        // Sort by composite performance score
        return aggregatedAgents
            .sort((a, b) => {
            const scoreA = (a.successRate + a.qualityScore + a.costEfficiency + a.completionRate) / 4;
            const scoreB = (b.successRate + b.qualityScore + b.costEfficiency + b.completionRate) / 4;
            return scoreB - scoreA;
        })
            .slice(0, limit);
    }
    getDetectedPatterns() {
        return Array.from(this.patternDatabase.values())
            .filter(pattern => pattern.frequency > 0)
            .sort((a, b) => b.impact - a.impact);
    }
    calculateSystemHealthScore() {
        if (this.metricsBuffer.length === 0)
            return 1.0;
        const recent = this.metricsBuffer.slice(-5);
        const avgSuccessRate = recent.reduce((sum, m) => sum + m.successRate, 0) / recent.length;
        const avgErrorRate = recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length;
        const avgPerformanceScore = recent.reduce((sum, m) => {
            // Normalize execution time to 0-1 (10s = 0)
            const timeScore = Math.max(0, 1 - (m.totalExecutionTime / 10000));
            return sum + timeScore;
        }, 0) / recent.length;
        // Composite health score
        return (avgSuccessRate * 0.4) +
            ((1 - avgErrorRate) * 0.3) +
            (avgPerformanceScore * 0.3);
    }
    aggregateAgentMetrics(metrics) {
        const allAgents = metrics.flatMap(m => m.agentPerformance);
        const agentMap = new Map();
        allAgents.forEach(agent => {
            if (!agentMap.has(agent.agentName)) {
                agentMap.set(agent.agentName, []);
            }
            agentMap.get(agent.agentName).push(agent);
        });
        return Array.from(agentMap.entries()).map(([name, agents]) => {
            const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
            return {
                agentName: name,
                agentType: agents[0].agentType,
                model: agents[0].model,
                executionTime: avg(agents.map(a => a.executionTime)),
                successRate: avg(agents.map(a => a.successRate)),
                qualityScore: avg(agents.map(a => a.qualityScore)),
                costEfficiency: avg(agents.map(a => a.costEfficiency)),
                errorCount: Math.round(avg(agents.map(a => a.errorCount))),
                completionRate: avg(agents.map(a => a.completionRate))
            };
        });
    }
    createEmptyTrendData() {
        return {
            labels: [],
            successRateTrend: [],
            performanceTrend: [],
            costTrend: [],
            throughputTrend: []
        };
    }
    createDefaultMetrics() {
        return {
            timestamp: Date.now(),
            sessionId: 'default',
            taskType: 'none',
            agentCount: 0,
            totalExecutionTime: 0,
            successRate: 1.0,
            throughput: 0,
            totalCost: 0,
            errorRate: 0,
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: 0,
                tokenUsage: 0,
                apiCallCount: 0,
                networkLatency: 0
            },
            agentPerformance: []
        };
    }
}
exports.AnalyticsEngine = AnalyticsEngine;
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
/**
 * Factory per creare AnalyticsEngine configurato
 */
function createAnalyticsEngine(config, analyticsConfig) {
    return new AnalyticsEngine(config, analyticsConfig);
}
exports.createAnalyticsEngine = createAnalyticsEngine;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Helper per creare mock metrics per testing
 */
function createMockMetrics(overrides) {
    return {
        timestamp: Date.now(),
        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
        taskType: 'test',
        agentCount: 2,
        totalExecutionTime: 5000,
        successRate: 0.9,
        throughput: 1.2,
        totalCost: 0.15,
        errorRate: 0.1,
        resourceUtilization: {
            cpuUsage: 35,
            memoryUsage: 256,
            tokenUsage: 1500,
            apiCallCount: 5,
            networkLatency: 150
        },
        agentPerformance: [
            {
                agentName: 'TestAgent1',
                agentType: 'coder',
                model: 'sonnet',
                executionTime: 3000,
                successRate: 0.95,
                qualityScore: 0.85,
                costEfficiency: 0.8,
                errorCount: 0,
                completionRate: 1.0
            }
        ],
        ...overrides
    };
}
exports.createMockMetrics = createMockMetrics;
//# sourceMappingURL=AnalyticsEngine.js.map