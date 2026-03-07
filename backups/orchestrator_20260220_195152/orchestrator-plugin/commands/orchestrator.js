/**
 * Orchestrator Command Handler
 * Main command to coordinate multiple expert agents
 */

const { OrchestratorPlugin } = require('../dist/index.js');

async function handleOrchestratorCommand(args, context) {
  try {
    const {
      task,
      preview = false,
      parallel = 6,
      model = 'auto'
    } = args;

    if (!task) {
      return {
        success: false,
        error: 'Parameter "task" is required. Usage: /orchestrator "your task description"'
      };
    }

    const plugin = new OrchestratorPlugin();

    if (preview) {
      // Preview mode - show plan without execution
      const plan = await plugin.createExecutionPlan(task, {
        parallel,
        model
      });

      return {
        success: true,
        mode: 'preview',
        plan: {
          task,
          agents: plan.agents || [],
          estimatedCost: plan.estimatedCost || 0,
          estimatedTime: plan.estimatedTime || 0,
          parallelAgents: parallel
        },
        message: `📋 Execution Plan for: ${task}\n` +
                 `Agents: ${plan.agents?.length || 0}\n` +
                 `Parallel: ${parallel}\n` +
                 `Model: ${model}\n` +
                 `Est. Cost: ${plan.estimatedCost || 0}\n` +
                 `Est. Time: ${plan.estimatedTime || 0} min`
      };
    } else {
      // Execute orchestration
      const result = await plugin.orchestrate(task, {
        parallel,
        model
      });

      return {
        success: true,
        mode: 'execute',
        result: {
          task,
          agentsUsed: result.agents || [],
          executionTime: result.executionTime || 0,
          cost: result.cost || 0,
          output: result.output || ''
        },
        message: `✅ Orchestration completed for: ${task}\n` +
                 `Agents: ${result.agents?.length || 0}\n` +
                 `Time: ${result.executionTime || 0}s\n` +
                 `Cost: ${result.cost || 0}`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = { handleOrchestratorCommand };
