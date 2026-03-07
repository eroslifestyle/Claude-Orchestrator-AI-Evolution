"use strict";
/**
 * Orchestrator Integration Tests - Complete Fase 2 Testing
 *
 * Test suite completa per verificare l'integrazione di tutti i componenti
 * del sistema: KeywordExtractor, AgentRouter, ModelSelector, DependencyGraphBuilder,
 * OrchestratorEngine e la loro interazione end-to-end.
 *
 * @version 1.0 - Fase 2 Integration Testing
 * @author Tester Expert Agent
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_BENCHMARKS = void 0;
const globals_1 = require("@jest/globals");
const orchestrator_engine_1 = require("../../core/orchestrator-engine");
const KeywordExtractor_1 = require("../../analysis/KeywordExtractor");
const AgentRouter_1 = require("../../routing/AgentRouter");
const ModelSelector_1 = require("../../routing/ModelSelector");
const DependencyGraphBuilder_1 = require("../../execution/DependencyGraphBuilder");
// =============================================================================
// TEST CONFIGURATION
// =============================================================================
const testConfig = {
    routing: {
        fallback_agent: 'coder',
        max_parallel_agents: 5,
        escalation_enabled: true,
        auto_documentation: true
    },
    performance: {
        max_planning_time: 30000,
        progress_update_interval: 1000,
        session_timeout: 300000
    },
    costs: {
        default_budget: 50,
        cost_alerts: true,
        model_costs: {
            haiku: 0.0008,
            sonnet: 0.008,
            opus: 0.08
        }
    },
    agents: [],
    keywords: []
};
// =============================================================================
// INTEGRATION TEST SCENARIOS
// =============================================================================
(0, globals_1.describe)('Orchestrator Integration Tests - Fase 2', () => {
    let orchestratorEngine;
    let testStartTime;
    (0, globals_1.beforeEach)(() => {
        orchestratorEngine = new orchestrator_engine_1.OrchestratorEngine(testConfig);
        testStartTime = Date.now();
    });
    (0, globals_1.afterEach)(() => {
        const testDuration = Date.now() - testStartTime;
        console.log(`Test completed in ${testDuration}ms`);
    });
    // =============================================================================
    // SINGLE DOMAIN TESTS
    // =============================================================================
    (0, globals_1.describe)('Single Domain Orchestration', () => {
        (0, globals_1.test)('GUI Domain - Simple UI Task', async () => {
            const request = 'Create a simple login dialog with PyQt5 that has username and password fields';
            const options = {
                maxParallel: 1,
                budget: 10,
                autoDocument: true
            };
            const result = await orchestratorEngine.orchestrate(request, options);
            // Assertions
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.sessionId).toBeDefined();
            (0, globals_1.expect)(result.metrics.totalCost).toBeLessThan(options.budget);
            (0, globals_1.expect)(result.documentation.contextHistoryUpdated).toBe(true);
            // Verify GUI domain detection
            (0, globals_1.expect)(result.executionPlan.tasks.length).toBeGreaterThan(0);
            const primaryTask = result.executionPlan.tasks[0];
            (0, globals_1.expect)(primaryTask.metadata.domain).toBe('gui');
            (0, globals_1.expect)(primaryTask.agentFile).toContain('gui-super-expert');
            console.log('✅ GUI Domain Test passed:', {
                tasksGenerated: result.executionPlan.tasks.length,
                totalCost: result.metrics.totalCost,
                executionTime: result.duration
            });
        });
        (0, globals_1.test)('Database Domain - Query Optimization', async () => {
            const request = 'Optimize the user authentication query and add proper indexing to the database schema';
            const options = {
                maxParallel: 1,
                budget: 15,
                modelPreference: 'sonnet'
            };
            const result = await orchestratorEngine.orchestrate(request, options);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.metrics.totalCost).toBeLessThan(options.budget);
            // Verify database domain detection
            const primaryTask = result.executionPlan.tasks[0];
            (0, globals_1.expect)(primaryTask.metadata.domain).toBe('database');
            (0, globals_1.expect)(primaryTask.agentFile).toContain('database_expert');
            (0, globals_1.expect)(primaryTask.model).toBe('sonnet'); // Preferred model
            console.log('✅ Database Domain Test passed:', {
                detectedDomain: primaryTask.metadata.domain,
                selectedModel: primaryTask.model,
                confidence: primaryTask.metadata.agentSelection.confidence
            });
        });
        (0, globals_1.test)('Security Domain - High Priority Handling', async () => {
            const request = 'Implement OAuth2 authentication with JWT tokens and secure session management';
            const options = {
                maxParallel: 1,
                budget: 20,
                escalateOnFailure: true
            };
            const result = await orchestratorEngine.orchestrate(request, options);
            (0, globals_1.expect)(result.success).toBe(true);
            // Verify security domain detection and priority handling
            const primaryTask = result.executionPlan.tasks[0];
            (0, globals_1.expect)(primaryTask.metadata.domain).toBe('security');
            (0, globals_1.expect)(primaryTask.agentFile).toContain('security_unified_expert');
            (0, globals_1.expect)(primaryTask.priority).toBe('CRITICA'); // Security should be critical
            console.log('✅ Security Domain Test passed:', {
                priority: primaryTask.priority,
                estimatedCost: primaryTask.estimatedCost,
                escalationEnabled: options.escalateOnFailure
            });
        });
    });
    // =============================================================================
    // MULTI-DOMAIN TESTS
    // =============================================================================
    (0, globals_1.describe)('Multi-Domain Orchestration', () => {
        (0, globals_1.test)('GUI + Database Integration', async () => {
            const request = 'Create a user management interface with PyQt5 that connects to SQLite database for CRUD operations';
            const options = {
                maxParallel: 3,
                budget: 25,
                autoDocument: true
            };
            const result = await orchestratorEngine.orchestrate(request, options);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.executionPlan.tasks.length).toBeGreaterThan(1);
            // Check for parallel batches
            (0, globals_1.expect)(result.executionPlan.parallelBatches.length).toBeGreaterThan(0);
            // Verify multi-domain detection
            const domains = result.executionPlan.tasks.map(t => t.metadata.domain);
            (0, globals_1.expect)(domains).toContain('gui');
            (0, globals_1.expect)(domains).toContain('database');
            // Check parallelism efficiency
            (0, globals_1.expect)(result.metrics.parallelismEfficiency).toBeGreaterThan(0);
            console.log('✅ Multi-Domain Test passed:', {
                domains: [...new Set(domains)],
                parallelBatches: result.executionPlan.parallelBatches.length,
                parallelismEfficiency: result.metrics.parallelismEfficiency
            });
        });
        (0, globals_1.test)('Full Stack Application - Complex Multi-Domain', async () => {
            const request = `
        Develop a complete trading application with:
        - PyQt5 GUI for charts and order placement
        - SQLite database for storing trade history
        - Security authentication with OAuth2
        - Integration with external trading API
        - Comprehensive testing suite
        - Complete documentation
      `;
            const options = {
                maxParallel: 5,
                budget: 50,
                timeLimit: 300,
                autoDocument: true,
                escalateOnFailure: true
            };
            const result = await orchestratorEngine.orchestrate(request, options);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.executionPlan.tasks.length).toBeGreaterThan(3);
            // Check domain diversity
            const domains = [...new Set(result.executionPlan.tasks.map(t => t.metadata.domain))];
            (0, globals_1.expect)(domains.length).toBeGreaterThan(2);
            // Verify dependency management
            (0, globals_1.expect)(result.executionPlan.dependencies.criticalPath.length).toBeGreaterThan(0);
            // Check cost optimization
            (0, globals_1.expect)(result.metrics.totalCost).toBeLessThan(options.budget);
            // Verify documentation task is included (REGOLA #5)
            const docTask = result.executionPlan.tasks.find(t => t.metadata.domain === 'documentation');
            (0, globals_1.expect)(docTask).toBeDefined();
            console.log('✅ Complex Multi-Domain Test passed:', {
                domains,
                totalTasks: result.executionPlan.tasks.length,
                criticalPathLength: result.executionPlan.dependencies.criticalPath.length,
                costEfficiency: result.metrics.totalCost / options.budget,
                documentationIncluded: !!docTask
            });
        });
    });
    // =============================================================================
    // COMPONENT INTEGRATION TESTS
    // =============================================================================
    (0, globals_1.describe)('Component Integration Verification', () => {
        (0, globals_1.test)('KeywordExtractor → AgentRouter Integration', async () => {
            const keywordExtractor = new KeywordExtractor_1.KeywordExtractor(testConfig);
            const agentRouter = new AgentRouter_1.AgentRouter();
            const request = 'Fix the database connection issue in the authentication module';
            // Test keyword extraction
            const keywordResult = await keywordExtractor.extractKeywords(request);
            (0, globals_1.expect)(keywordResult.keywords.length).toBeGreaterThan(0);
            (0, globals_1.expect)(keywordResult.overallConfidence).toBeGreaterThan(0.3);
            // Test domain detection
            const detectedDomains = await keywordExtractor.detectDomains(keywordResult.keywords);
            (0, globals_1.expect)(detectedDomains.length).toBeGreaterThan(0);
            // Test agent routing
            const routingDecision = await agentRouter.routeToAgents(detectedDomains, keywordResult.keywords, 'medium');
            (0, globals_1.expect)(routingDecision.primaryAgent).toBeDefined();
            (0, globals_1.expect)(routingDecision.confidence).toBeGreaterThan(0.5);
            console.log('✅ KeywordExtractor → AgentRouter Integration verified:', {
                extractedKeywords: keywordResult.keywords.length,
                detectedDomains: detectedDomains.length,
                routingConfidence: routingDecision.confidence,
                selectedAgent: routingDecision.primaryAgent.name
            });
        });
        (0, globals_1.test)('ModelSelector Integration with Complexity Assessment', async () => {
            const modelSelector = new ModelSelector_1.ModelSelector();
            // Test simple task
            const simpleCriteria = {
                complexity: 'low',
                domainRequirements: [{
                        domain: 'documentation',
                        requiresCreativity: false,
                        requiresPrecision: false,
                        requiresReasoning: false,
                        requiresSpeed: true,
                        criticalityLevel: 'low'
                    }],
                budgetConstraints: {
                    maxCostPerTask: 5,
                    dailyBudgetLimit: 50,
                    currentSpending: 0,
                    costSensitivity: 'high',
                    optimizationStrategy: 'cost_first'
                },
                performanceRequirements: {
                    maxLatencyMs: 30000,
                    throughputRequirement: 5,
                    concurrencyLevel: 1,
                    realTimeRequired: false
                },
                qualityRequirements: {
                    minAccuracy: 0.7,
                    consistencyImportance: 0.8,
                    innovationRequired: false,
                    riskTolerance: 'medium'
                },
                contextSize: 500,
                estimatedTokens: 1000
            };
            const simpleSelection = await modelSelector.selectModel(simpleCriteria);
            (0, globals_1.expect)(simpleSelection.selectedModel).toBe('haiku'); // Should select cost-efficient model
            // Test complex task
            const complexCriteria = {
                ...simpleCriteria,
                complexity: 'high',
                domainRequirements: [{
                        domain: 'architecture',
                        requiresCreativity: true,
                        requiresPrecision: true,
                        requiresReasoning: true,
                        requiresSpeed: false,
                        criticalityLevel: 'critical'
                    }],
                budgetConstraints: {
                    ...simpleCriteria.budgetConstraints,
                    optimizationStrategy: 'quality_first'
                }
            };
            const complexSelection = await modelSelector.selectModel(complexCriteria);
            (0, globals_1.expect)(['sonnet', 'opus']).toContain(complexSelection.selectedModel); // Should select capable model
            console.log('✅ ModelSelector Integration verified:', {
                simpleTask: simpleSelection.selectedModel,
                complexTask: complexSelection.selectedModel,
                costOptimization: simpleSelection.estimatedCost < complexSelection.estimatedCost
            });
        });
        (0, globals_1.test)('DependencyGraphBuilder Integration with Parallel Optimization', async () => {
            const dependencyBuilder = new DependencyGraphBuilder_1.DependencyGraphBuilder();
            const agentRouter = new AgentRouter_1.AgentRouter();
            // Create mock multi-domain scenario
            const mockDomains = [
                { name: 'gui', confidence: 0.8, matchedKeywords: ['interface'], suggestedAgent: 'gui-super-expert', suggestedModel: 'sonnet', priority: 'ALTA', weight: 0.8 },
                { name: 'database', confidence: 0.7, matchedKeywords: ['storage'], suggestedAgent: 'database_expert', suggestedModel: 'sonnet', priority: 'ALTA', weight: 0.7 },
                { name: 'testing', confidence: 0.6, matchedKeywords: ['test'], suggestedAgent: 'tester_expert', suggestedModel: 'sonnet', priority: 'MEDIA', weight: 0.6 }
            ];
            const mockRouting = await agentRouter.routeToAgents(mockDomains, [], 'medium');
            const dependencyGraph = await dependencyBuilder.buildDependencyGraph(mockDomains, [mockRouting], 'Build a web application with database backend and testing');
            (0, globals_1.expect)(dependencyGraph.nodes.size).toBeGreaterThan(0);
            (0, globals_1.expect)(dependencyGraph.executionPlan.batches.length).toBeGreaterThan(0);
            // Test parallel optimization
            const optimizedGraph = await dependencyBuilder.optimizeForParallelism(dependencyGraph, 3);
            (0, globals_1.expect)(optimizedGraph.parallelizationOpportunities.length).toBeGreaterThan(0);
            console.log('✅ DependencyGraphBuilder Integration verified:', {
                nodeCount: dependencyGraph.nodes.size,
                batchCount: dependencyGraph.executionPlan.batches.length,
                parallelOpportunities: optimizedGraph.parallelizationOpportunities.length,
                circularDependencies: dependencyGraph.circularDependencies.length
            });
        });
    });
    // =============================================================================
    // PERFORMANCE & SCALABILITY TESTS
    // =============================================================================
    (0, globals_1.describe)('Performance & Scalability', () => {
        (0, globals_1.test)('Large Request Processing', async () => {
            const largeRequest = `
        Develop a comprehensive enterprise application with the following components:
        ${Array(50).fill('Feature').map((_, i) => `- Feature ${i + 1}: Implementation required`).join('\n')}

        Additional requirements:
        - Multi-tenant architecture with role-based access control
        - Real-time notifications and messaging system
        - Advanced analytics and reporting dashboard
        - Mobile-responsive interface with offline capabilities
        - Microservices architecture with API gateway
        - Comprehensive security audit and penetration testing
        - Performance optimization and caching strategies
        - Complete CI/CD pipeline with automated testing
        - Documentation for all components and APIs
        - Load testing and scalability assessment
      `;
            const startTime = Date.now();
            const result = await orchestratorEngine.orchestrate(largeRequest, {
                maxParallel: 10,
                budget: 100,
                timeLimit: 600
            });
            const processingTime = Date.now() - startTime;
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
            (0, globals_1.expect)(result.executionPlan.tasks.length).toBeGreaterThan(5);
            console.log('✅ Large Request Performance Test passed:', {
                processingTime: `${processingTime}ms`,
                tasksGenerated: result.executionPlan.tasks.length,
                parallelBatches: result.executionPlan.parallelBatches.length,
                estimatedTotalTime: result.executionPlan.totalEstimate.time
            });
        });
        (0, globals_1.test)('Concurrent Session Handling', async () => {
            const requests = [
                'Create a simple calculator GUI',
                'Optimize database queries for user management',
                'Implement OAuth2 authentication',
                'Set up automated testing framework',
                'Generate API documentation'
            ];
            const startTime = Date.now();
            // Execute concurrent orchestrations
            const promises = requests.map(request => orchestratorEngine.orchestrate(request, { maxParallel: 2, budget: 10 }));
            const results = await Promise.all(promises);
            const processingTime = Date.now() - startTime;
            // All should succeed
            (0, globals_1.expect)(results.every(r => r.success)).toBe(true);
            // Should be faster than sequential processing
            (0, globals_1.expect)(processingTime).toBeLessThan(requests.length * 10000); // 10s per request max
            // All should have unique session IDs
            const sessionIds = results.map(r => r.sessionId);
            (0, globals_1.expect)(new Set(sessionIds).size).toBe(sessionIds.length);
            console.log('✅ Concurrent Session Test passed:', {
                processingTime: `${processingTime}ms`,
                sessionsProcessed: results.length,
                averageTimePerSession: `${processingTime / results.length}ms`,
                allSuccessful: results.every(r => r.success)
            });
        });
        (0, globals_1.test)('Budget Management and Cost Optimization', async () => {
            const expensiveRequest = 'Design complete microservices architecture with full security audit and performance testing';
            // Test with low budget - should optimize for cost
            const lowBudgetResult = await orchestratorEngine.orchestrate(expensiveRequest, {
                budget: 5,
                maxParallel: 1
            });
            (0, globals_1.expect)(lowBudgetResult.success).toBe(true);
            (0, globals_1.expect)(lowBudgetResult.metrics.totalCost).toBeLessThan(5);
            // Test with high budget - should optimize for quality
            const highBudgetResult = await orchestratorEngine.orchestrate(expensiveRequest, {
                budget: 50,
                maxParallel: 5
            });
            (0, globals_1.expect)(highBudgetResult.success).toBe(true);
            (0, globals_1.expect)(highBudgetResult.metrics.totalCost).toBeGreaterThan(lowBudgetResult.metrics.totalCost);
            console.log('✅ Budget Management Test passed:', {
                lowBudgetCost: lowBudgetResult.metrics.totalCost,
                highBudgetCost: highBudgetResult.metrics.totalCost,
                costScaling: (highBudgetResult.metrics.totalCost / lowBudgetResult.metrics.totalCost).toFixed(2),
                qualityImprovement: (highBudgetResult.aggregatedResult.qualityScore - lowBudgetResult.aggregatedResult.qualityScore).toFixed(2)
            });
        });
    });
    // =============================================================================
    // ERROR HANDLING & RECOVERY TESTS
    // =============================================================================
    (0, globals_1.describe)('Error Handling & Recovery', () => {
        (0, globals_1.test)('Invalid Request Handling', async () => {
            const invalidRequests = [
                '', // Empty request
                '...', // Meaningless request
                'asdjfklasjdflkjasdflkjasdf', // Random characters
            ];
            for (const request of invalidRequests) {
                const result = await orchestratorEngine.orchestrate(request, { budget: 5 });
                // Should not throw error, but handle gracefully
                (0, globals_1.expect)(result).toBeDefined();
                (0, globals_1.expect)(result.sessionId).toBeDefined();
                // Should use fallback strategy
                if (!result.success) {
                    (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
                }
            }
            console.log('✅ Invalid Request Handling verified');
        });
        (0, globals_1.test)('Preview Mode Functionality', async () => {
            const request = 'Create a user authentication system with database integration';
            const preview = await orchestratorEngine.preview(request, { maxParallel: 3 });
            (0, globals_1.expect)(preview).toBeDefined();
            (0, globals_1.expect)(preview.sessionId).toBeDefined();
            (0, globals_1.expect)(preview.tasks.length).toBeGreaterThan(0);
            (0, globals_1.expect)(preview.totalEstimate.cost).toBeGreaterThan(0);
            (0, globals_1.expect)(preview.totalEstimate.time).toBeGreaterThan(0);
            console.log('✅ Preview Mode Test passed:', {
                estimatedTasks: preview.tasks.length,
                estimatedCost: preview.totalEstimate.cost,
                estimatedTime: preview.totalEstimate.time,
                parallelBatches: preview.parallelBatches.length
            });
        });
    });
});
// =============================================================================
// HELPER FUNCTIONS FOR TESTING
// =============================================================================
function createMockRequest(domain, complexity = 'medium') {
    const templates = {
        gui: {
            low: 'Create a simple button',
            medium: 'Create a login dialog with username and password fields',
            high: 'Design a complex data visualization dashboard with real-time updates'
        },
        database: {
            low: 'Create a simple user table',
            medium: 'Optimize user authentication queries',
            high: 'Design a distributed database architecture with sharding'
        },
        security: {
            low: 'Add basic input validation',
            medium: 'Implement OAuth2 authentication',
            high: 'Conduct comprehensive security audit with penetration testing'
        }
    };
    return templates[domain]?.[complexity] || 'Generic task implementation';
}
async function measureExecutionTime(operation) {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
}
function validateOrchestratorResult(result) {
    return (typeof result.sessionId === 'string' &&
        typeof result.success === 'boolean' &&
        Array.isArray(result.taskResults) &&
        typeof result.metrics === 'object' &&
        typeof result.duration === 'number');
}
// =============================================================================
// PERFORMANCE BENCHMARKS
// =============================================================================
exports.PERFORMANCE_BENCHMARKS = {
    maxProcessingTime: {
        simple: 5000, // 5 seconds
        medium: 15000, // 15 seconds
        complex: 30000 // 30 seconds
    },
    maxCostPerTask: {
        haiku: 0.05,
        sonnet: 0.25,
        opus: 2.50
    },
    minParallelismEfficiency: 0.6, // 60% efficiency minimum
    minSuccessRate: 0.95 // 95% success rate minimum
};
//# sourceMappingURL=orchestrator-integration.test.js.map