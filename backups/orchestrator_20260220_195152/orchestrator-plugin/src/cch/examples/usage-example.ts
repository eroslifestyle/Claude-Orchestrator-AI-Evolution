/**
 * CCH USAGE EXAMPLES
 * ==================
 *
 * Comprehensive examples demonstrating the Central Communication Hub usage:
 * - Basic setup and initialization
 * - Message pub/sub
 * - Request routing
 * - Context pooling
 * - Fault-tolerant execution
 * - Monitoring and observability
 *
 * @version 1.0.0
 * @date 01 February 2026
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  CentralCommunicationHub,
  createHub,
  createDevHub,
  createProductionHub
} from '../CentralCommunicationHub';

import {
  type TaskRequest,
  type RoutingDecision
} from '../routing/UnifiedRouterEngine';

import {
  type CleanContext
} from '../pool/ContextPoolManager';

import {
  type RetryPolicy
} from '../fault/FaultToleranceLayer';

// ============================================================================
// EXAMPLE 1: BASIC SETUP
// ============================================================================

/**
 * Example 1: Basic Hub Setup
 *
 * Demonstrates the simplest way to create and use the CCH.
 */
async function example1_BasicSetup(): Promise<void> {
  console.log('\n=== Example 1: Basic Setup ===\n');

  // Create a hub with default configuration
  const hub = await createHub({
    storagePath: './cch-example-data'
  });

  // The hub is now ready to use
  console.log('Hub initialized!');

  // Check the status
  console.log(hub.getStatusSummary());

  // Clean shutdown
  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 2: MESSAGE PUB/SUB
// ============================================================================

/**
 * Example 2: Message Publishing and Subscription
 *
 * Demonstrates the pub/sub message pattern.
 */
async function example2_MessagePubSub(): Promise<void> {
  console.log('\n=== Example 2: Message Pub/Sub ===\n');

  const hub = await createDevHub();

  // Subscribe to agent task messages
  const subscription1 = hub.subscribe('agent.task.*', async (message) => {
    console.log(`[Subscriber 1] Received task:`, message.payload);
  });

  // Subscribe to all agent messages
  const subscription2 = hub.subscribe('agent.#', async (message) => {
    console.log(`[Subscriber 2] Agent message:`, message.topic);
  });

  // Publish messages
  await hub.publish('agent.task.gui', {
    type: 'gui_task',
    description: 'Create a main window',
    priority: 'high'
  });

  await hub.publish('agent.task.database', {
    type: 'database_task',
    description: 'Design user table schema'
  });

  await hub.publish('agent.status', {
    message: 'System healthy'
  });

  // Wait for message delivery
  await new Promise(resolve => setTimeout(resolve, 500));

  // Unsubscribe
  subscription1.unsubscribe();
  subscription2.unsubscribe();

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 3: REQUEST ROUTING
// ============================================================================

/**
 * Example 3: Request Routing
 *
 * Demonstrates intelligent request routing to appropriate agents.
 */
async function example3_RequestRouting(): Promise<void> {
  console.log('\n=== Example 3: Request Routing ===\n');

  const hub = await createDevHub();

  // Warmup the router with common requests
  await hub.warmupCache([
    { request: 'Create a GUI component' },
    { request: 'Design a database schema' },
    { request: 'Implement authentication' }
  ]);

  // Route various requests
  const requests: TaskRequest[] = [
    { request: 'Create a PyQt5 main window' },
    { request: 'Design a SQLite schema for users' },
    { request: 'Implement JWT authentication' },
    { request: 'Write unit tests for the API' },
    { request: 'Debug the memory leak in the service' }
  ];

  for (const req of requests) {
    const decision: RoutingDecision = hub.route(req);

    console.log(`\nRequest: "${req.request}"`);
    console.log(`  Agent:     ${decision.agentFile}`);
    console.log(`  Model:     ${decision.model}`);
    console.log(`  Priority:  ${decision.priority}`);
    console.log(`  Confidence: ${decision.confidence.toFixed(2)}`);
    console.log(`  Cache Hit: ${decision.cacheHit ? 'Yes' : 'No'}`);
    console.log(`  Time:      ${decision.decisionTime}ms`);

    if (decision.reasoning) {
      console.log(`  Reasoning: ${decision.reasoning}`);
    }

    if (decision.fallbackAgents.length > 0) {
      console.log(`  Fallbacks: ${decision.fallbackAgents.join(', ')}`);
    }
  }

  // Get router statistics
  const routerStats = hub.getRouterStats();
  console.log('\n--- Router Statistics ---');
  console.log(`Total Requests:  ${routerStats.totalRequests}`);
  console.log(`Cache Hits:      ${routerStats.cacheHits}`);
  console.log(`Cache Misses:    ${routerStats.cacheMisses}`);
  console.log(`Hit Rate:        ${(routerStats.cacheHitRate * 100).toFixed(1)}%`);

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 4: CONTEXT POOLING
// ============================================================================

/**
 * Example 4: Context Pool Management
 *
 * Demonstrates efficient context acquisition and reuse.
 */
async function example4_ContextPooling(): Promise<void> {
  console.log('\n=== Example 4: Context Pooling ===\n');

  const hub = await createDevHub();

  // Preload contexts for common agent types
  await hub.preloadContexts(['gui', 'database', 'security', 'coder']);

  console.log('Contexts preloaded for: gui, database, security, coder');

  // Acquire contexts
  const guiContext = await hub.acquireContext('gui');
  const dbContext = await hub.acquireContext('database');

  console.log('\n--- GUI Context ---');
  console.log(`ID:           ${guiContext.id}`);
  console.log(`Agent Type:   ${guiContext.agentType}`);
  console.log(`Usage Count:  ${guiContext.usageCount}`);
  console.log(`State:        ${guiContext.state}`);
  console.log(`Expertise:    ${guiContext.expertise.substring(0, 80)}...`);

  console.log('\n--- Database Context ---');
  console.log(`ID:           ${dbContext.id}`);
  console.log(`Agent Type:   ${dbContext.agentType}`);
  console.log(`Usage Count:  ${dbContext.usageCount}`);

  // Release contexts back to pool
  await hub.releaseContext(guiContext);
  await hub.releaseContext(dbContext);

  console.log('\nContexts released back to pool');

  // Acquire again - should reuse the same contexts
  const guiContext2 = await hub.acquireContext('gui');

  console.log(`\nReacquired GUI context - same ID: ${guiContext2.id === guiContext.id}`);
  console.log(`New usage count: ${guiContext2.usageCount}`);

  await hub.releaseContext(guiContext2);

  // Get pool statistics
  const poolStats = hub.getPoolStats();
  console.log('\n--- Pool Statistics ---');
  console.log(`Total Contexts:    ${poolStats.totalContexts}`);
  console.log(`Available:         ${poolStats.availableContexts}`);
  console.log(`Acquired:          ${poolStats.acquiredContexts}`);
  console.log(`Hit Rate:          ${(poolStats.hitRate * 100).toFixed(1)}%`);
  console.log(`Contexts Created:  ${poolStats.contextsCreated}`);
  console.log(`Contexts Reused:   ${poolStats.contextsReused}`);
  console.log(`Memory Usage:      ${(poolStats.estimatedMemoryUsage / 1024).toFixed(2)} KB`);

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 5: FAULT TOLERANT EXECUTION
// ============================================================================

/**
 * Example 5: Fault-Tolerant Execution
 *
 * Demonstrates circuit breaker and retry patterns.
 */
async function example5_FaultTolerantExecution(): Promise<void> {
  console.log('\n=== Example 5: Fault Tolerant Execution ===\n');

  const hub = await createDevHub();

  // Example 1: Simple execution with automatic retry
  console.log('--- Example 5.1: Simple Execution ---');

  let attemptCount = 0;

  const result1 = await hub.execute('api-service', async () => {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}...`);

    if (attemptCount < 3) {
      throw new Error('Service temporarily unavailable');
    }

    return 'Success!';
  });

  console.log(`Result: ${result1}`);
  console.log(`Total attempts: ${attemptCount}`);

  // Example 2: Circuit breaker demonstration
  console.log('\n--- Example 5.2: Circuit Breaker ---');

  // Trigger circuit to open
  console.log('Triggering failures to open circuit...');

  for (let i = 0; i < 10; i++) {
    try {
      await hub.execute('unstable-service', async () => {
        throw new Error('Service down');
      });
    } catch (error) {
      // Expected failures
    }
  }

  const circuitState = hub.getCircuitState('unstable-service');
  console.log(`Circuit state: ${circuitState}`);

  // Try to execute - should fail fast
  const startTime = Date.now();
  try {
    await hub.execute('unstable-service', async () => {
      return 'Should not execute';
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`Rejected in ${duration}ms (fast fail)`);
  }

  // Example 3: Custom retry policy
  console.log('\n--- Example 5.3: Custom Retry Policy ---');

  const customRetry: RetryPolicy = {
    maxAttempts: 5,
    initialDelay: 100,
    maxDelay: 1000,
    multiplier: 2,
    jitter: true
  };

  let customAttempts = 0;

  const result2 = await hub.execute('custom-policy-service', async () => {
    customAttempts++;
    if (customAttempts < 4) {
      throw new Error('Not yet');
    }
    return 'Finally succeeded!';
  }, customRetry);

  console.log(`Result: ${result2} after ${customAttempts} attempts`);

  // Get service metrics
  const metrics = hub.getServiceMetrics('unstable-service');
  console.log('\n--- Service Metrics ---');
  if (metrics) {
    console.log(`Total Calls:      ${metrics.totalCalls}`);
    console.log(`Successful:       ${metrics.successfulCalls}`);
    console.log(`Failed:           ${metrics.failedCalls}`);
    console.log(`Rejected:         ${metrics.rejectedCalls}`);
    console.log(`Failure Rate:     ${(metrics.failureRate * 100).toFixed(1)}%`);
  }

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 6: END-TO-END TASK EXECUTION
// ============================================================================

/**
 * Example 6: End-to-End Task Execution
 *
 * Demonstrates the complete workflow from request to result.
 */
async function example6_EndToEndExecution(): Promise<void> {
  console.log('\n=== Example 6: End-to-End Task Execution ===\n');

  const hub = await createDevHub();
  await hub.preloadContexts(['gui', 'database', 'coder']);

  // Define a task request
  const request: TaskRequest = {
    request: 'Create a PyQt5 window with a login form',
    domain: 'gui',
    complexity: 'medium',
    maxCost: 50,
    maxTime: 30000
  };

  console.log(`Request: "${request.request}"`);

  // Execute with routing and context
  const result = await hub.executeWithRouting(request, async (context) => {
    console.log('\n--- Execution Context ---');
    console.log(`Agent Type:    ${context.agentType}`);
    console.log(`Context ID:    ${context.cleanContext.id}`);
    console.log(`Trace ID:      ${context.traceId}`);
    console.log(`Correlation ID: ${context.correlationId}`);

    console.log('\n--- Routing Decision ---');
    console.log(`Agent:         ${context.routing.agentFile}`);
    console.log(`Model:         ${context.routing.model}`);
    console.log(`Confidence:    ${context.routing.confidence.toFixed(2)}`);

    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 50));

    // Return the result
    return {
      code: 'class LoginForm(QDialog): ...',
      files: ['login_form.py'],
      tests: ['test_login_form.py']
    };
  });

  console.log('\n--- Execution Result ---');
  console.log(`Success:        ${result.success}`);
  console.log(`Execution Time: ${result.executionTime.toFixed(2)}ms`);
  console.log(`Retries:        ${result.retries}`);

  if (result.success && result.data) {
    console.log(`\nGenerated Code:`);
    console.log(result.data.code);
  }

  // Get overall hub statistics
  const stats = hub.getStats();
  console.log('\n--- Hub Statistics ---');
  console.log(`Uptime:         ${(stats.uptime / 1000).toFixed(1)}s`);
  console.log(`Messages Sent:  ${stats.queue.totalPublished}`);
  console.log(`Routes Made:    ${stats.router.totalRequests}`);
  console.log(`Contexts Used:  ${stats.pool.totalContexts}`);
  console.log(`Health Status:  ${stats.health.status}`);

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 7: OBSERVABILITY AND MONITORING
// ============================================================================

/**
 * Example 7: Observability and Monitoring
 *
 * Demonstrates metrics, logging, and alerting.
 */
async function example7_Observability(): Promise<void> {
  console.log('\n=== Example 7: Observability and Monitoring ===\n');

  const hub = await createDevHub();

  // Record custom metrics
  console.log('--- Recording Metrics ---');

  for (let i = 0; i < 100; i++) {
    hub.increment('tasks.processed', 1, { type: 'gui' });
    hub.histogram('tasks.duration', Math.random() * 100, { type: 'gui' });
  }

  hub.gauge('active.connections', 42);
  hub.gauge('memory.usage', 0.65);

  console.log('Metrics recorded');

  // Logging
  console.log('\n--- Logging ---');

  hub.log('info', 'Task started', { taskId: 'task-123' });
  hub.log('debug', 'Processing data', { items: 5 });
  hub.log('warn', 'High memory usage detected', { usage: '85%' });

  console.log('Logs created');

  // Distributed tracing
  console.log('\n--- Distributed Tracing ---');

  const om = hub.getOM();

  const parentSpan = om.startSpan('task.execution');
  parentSpan.tags = { taskId: 'task-123' };

  const childSpan1 = om.startSpan('acquire.context', parentSpan);
  om.finishSpan(childSpan1);

  const childSpan2 = om.startSpan('execute.logic', parentSpan);
  om.finishSpan(childSpan2);

  om.finishSpan(parentSpan);

  console.log(`Trace ID: ${parentSpan.traceId}`);
  console.log(`Parent Span: ${parentSpan.spanId}`);
  console.log(`Total Duration: ${parentSpan.duration}ms`);

  // Alerting
  console.log('\n--- Alerting ---');

  hub.addAlertRule({
    id: 'error-rate-alert',
    name: 'High Error Rate',
    type: 'threshold',
    metricName: 'tasks.errors',
    threshold: 10,
    comparison: 'gte',
    severity: 'warning',
    enabled: true,
    cooldownMs: 60000
  });

  hub.addAlertRule({
    id: 'latency-anomaly',
    name: 'Latency Anomaly',
    type: 'anomaly',
    metricName: 'tasks.duration',
    severity: 'warning',
    enabled: true,
    cooldownMs: 120000
  });

  console.log('Alert rules configured');

  // Check alerts
  const alerts = hub.checkAlerts();
  console.log(`Active alerts: ${alerts.length}`);

  // Export observability data
  console.log('\n--- Export Data ---');

  const jsonData = hub.exportObservabilityData('json');
  console.log(`JSON export size: ${jsonData.length} bytes`);

  const promData = hub.exportObservabilityData('prometheus');
  console.log(`Prometheus export size: ${promData.length} bytes`);

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 8: AGENT COORDINATION
// ============================================================================

/**
 * Example 8: Multi-Agent Coordination
 *
 * Demonstrates coordinating work across multiple agent types.
 */
async function example8_AgentCoordination(): Promise<void> {
  console.log('\n=== Example 8: Multi-Agent Coordination ===\n');

  const hub = await createDevHub();
  await hub.preloadContexts(['gui', 'database', 'security']);

  // Subscribe to coordination topic
  hub.subscribe('coordination.progress', async (msg) => {
    console.log(`  [Progress] ${msg.payload}`);
  });

  // Complex task requiring multiple agents
  const taskRequest = 'Create a user authentication system with GUI';

  console.log(`Task: ${taskRequest}\n`);

  // Step 1: Route to database agent for schema
  console.log('Step 1: Database Design');
  const dbResult = await hub.executeWithRouting(
    { request: `Design database schema for: ${taskRequest}` },
    async (ctx) => {
      await hub.publish('coordination.progress', {
        step: 1,
        agent: ctx.agentType,
        status: 'Designing schema...'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        schema: 'users(id, email, password_hash, created_at)',
        indexes: ['email_unique']
      };
    }
  );

  console.log(`  -> ${dbResult.success ? 'Success' : 'Failed'} (${dbResult.executionTime.toFixed(0)}ms)`);

  // Step 2: Route to security agent for authentication
  console.log('\nStep 2: Security Implementation');
  const secResult = await hub.executeWithRouting(
    { request: `Implement JWT authentication for: ${taskRequest}` },
    async (ctx) => {
      await hub.publish('coordination.progress', {
        step: 2,
        agent: ctx.agentType,
        status: 'Implementing JWT...'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        method: 'JWT',
        algorithm: 'HS256',
        tokenExpiry: '1h'
      };
    }
  );

  console.log(`  -> ${secResult.success ? 'Success' : 'Failed'} (${secResult.executionTime.toFixed(0)}ms)`);

  // Step 3: Route to GUI agent for the interface
  console.log('\nStep 3: GUI Implementation');
  const guiResult = await hub.executeWithRouting(
    { request: `Create login form GUI for: ${taskRequest}` },
    async (ctx) => {
      await hub.publish('coordination.progress', {
        step: 3,
        agent: ctx.agentType,
        status: 'Creating login form...'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        framework: 'PyQt5',
        widgets: ['QLineEdit', 'QPushButton', 'QLabel'],
        files: ['login_dialog.py']
      };
    }
  );

  console.log(`  -> ${guiResult.success ? 'Success' : 'Failed'} (${guiResult.executionTime.toFixed(0)}ms)`);

  // Summary
  console.log('\n--- Coordination Summary ---');
  const totalTime = dbResult.executionTime + secResult.executionTime + guiResult.executionTime;
  console.log(`Total time: ${totalTime.toFixed(0)}ms`);
  console.log(`All steps completed: ${dbResult.success && secResult.success && guiResult.success}`);

  await new Promise(resolve => setTimeout(resolve, 500));
  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 9: REAL-TIME UPDATES
// ============================================================================

/**
 * Example 9: Real-Time Message Updates
 *
 * Demonstrates real-time communication patterns.
 */
async function example9_RealTimeUpdates(): Promise<void> {
  console.log('\n=== Example 9: Real-Time Updates ===\n');

  const hub = await createDevHub();

  // Subscribe to different update channels
  const subscriptions = [
    hub.subscribe('updates.status.*', async (msg) => {
      console.log(`[STATUS] ${msg.payload}`);
    }),

    hub.subscribe('updates.progress.*', async (msg) => {
      console.log(`[PROGRESS] ${(msg.payload as any).percent}%`);
    }),

    hub.subscribe('updates.error.*', async (msg) => {
      console.log(`[ERROR] ${(msg.payload as any).message}`);
    })
  ];

  // Simulate a long-running task with progress updates
  console.log('Starting long-running task...\n');

  const taskId = `task-${Date.now()}`;

  // Initial status
  await hub.publish(`updates.status.${taskId}`, {
    message: 'Task started'
  });

  // Simulate progress
  for (let i = 1; i <= 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));

    if (i === 5) {
      // Simulate a warning
      await hub.publish(`updates.status.${taskId}`, {
        message: 'Processing slower than expected'
      });
    }

    await hub.publish(`updates.progress.${taskId}`, {
      percent: i * 10,
      step: i
    });
  }

  // Completion
  await hub.publish(`updates.status.${taskId}`, {
    message: 'Task completed successfully'
  });

  // Wait for message delivery
  await new Promise(resolve => setTimeout(resolve, 500));

  // Cleanup
  subscriptions.forEach(sub => sub.unsubscribe());

  await hub.shutdown();
}

// ============================================================================
// EXAMPLE 10: ERROR HANDLING AND RECOVERY
// ============================================================================

/**
 * Example 10: Error Handling and Recovery
 *
 * Demonstrates comprehensive error handling patterns.
 */
async function example10_ErrorHandling(): Promise<void> {
  console.log('\n=== Example 10: Error Handling and Recovery ===\n');

  const hub = await createDevHub();

  // Example 1: Handle service failures gracefully
  console.log('--- Example 10.1: Graceful Degradation ---');

  let failCount = 0;

  const result1 = await hub.execute('primary-service', async () => {
    failCount++;
    if (failCount <= 2) {
      throw new Error('Primary service unavailable');
    }
    return 'Primary service recovered';
  }).catch((error) => {
    console.log(`  Primary failed, using fallback: ${error.message}`);
    return 'Fallback result';
  });

  console.log(`Result: ${result1}`);

  // Example 2: Dead Letter Queue handling
  console.log('\n--- Example 10.2: Dead Letter Queue ---');

  // Publish messages that will fail
  hub.subscribe('dlq.test.*', async () => {
    throw new Error('Processing failed');
  });

  for (let i = 0; i < 5; i++) {
    await hub.publish(`dlq.test.${i}`, { index: i });
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check DLQ
  const umq = hub.getUMQ();
  const dlqMessages = umq.getDeadLetterMessages();
  console.log(`Messages in DLQ: ${dlqMessages.length}`);

  // Example 3: Health-aware routing
  console.log('\n--- Example 10.3: Health-Aware Routing ---');

  // Check health before routing
  const health = hub.getHealth();
  console.log(`System health: ${health.status}`);

  if (health.status !== 'healthy') {
    console.log('  System degraded, using safer routing options');

    // Use fallback routing
    const safeRequest: TaskRequest = {
      request: 'Simple task',
      complexity: 'low' // Lower complexity for degraded system
    };

    const decision = hub.route(safeRequest);
    console.log(`  Routed to: ${decision.agentFile} (safe option)`);
  }

  // Example 4: Circuit state monitoring
  console.log('\n--- Example 10.4: Circuit Monitoring ---');

  const criticalServices = ['database', 'cache', 'api'];

  for (const service of criticalServices) {
    const state = hub.getCircuitState(service);
    console.log(`  ${service}: ${state}`);

    if (state === 'OPEN') {
      console.log(`    WARNING: ${service} circuit is OPEN`);
      console.log(`    Attempting reset...`);
      hub.resetCircuit(service);
    }
  }

  await hub.shutdown();
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

/**
 * Run all examples
 */
async function runAllExamples(): Promise<void> {
  const examples = [
    { name: 'Basic Setup', fn: example1_BasicSetup },
    { name: 'Message Pub/Sub', fn: example2_MessagePubSub },
    { name: 'Request Routing', fn: example3_RequestRouting },
    { name: 'Context Pooling', fn: example4_ContextPooling },
    { name: 'Fault Tolerant Execution', fn: example5_FaultTolerantExecution },
    { name: 'End-to-End Execution', fn: example6_EndToEndExecution },
    { name: 'Observability', fn: example7_Observability },
    { name: 'Agent Coordination', fn: example8_AgentCoordination },
    { name: 'Real-Time Updates', fn: example9_RealTimeUpdates },
    { name: 'Error Handling', fn: example10_ErrorHandling }
  ];

  console.log('\n' + '='.repeat(80));
  console.log('          CCH - CENTRAL COMMUNICATION HUB');
  console.log('                 USAGE EXAMPLES');
  console.log('='.repeat(80));

  // Run examples
  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`\nError in ${example.name}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('All examples completed!');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  example1_BasicSetup,
  example2_MessagePubSub,
  example3_RequestRouting,
  example4_ContextPooling,
  example5_FaultTolerantExecution,
  example6_EndToEndExecution,
  example7_Observability,
  example8_AgentCoordination,
  example9_RealTimeUpdates,
  example10_ErrorHandling,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example error:', error);
      process.exit(1);
    });
}
