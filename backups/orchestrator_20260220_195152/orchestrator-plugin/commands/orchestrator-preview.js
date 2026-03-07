/**
 * Orchestrator Preview Command Handler
 * Show execution plan without running it
 */

const { OrchestratorPlugin } = require('../dist/index.js');

async function handleOrchestratorPreviewCommand(args, context) {
  try {
    const { task } = args;

    if (!task) {
      return {
        success: false,
        error: 'Parameter "task" is required. Usage: /orchestrator-preview "your task description"'
      };
    }

    const plugin = new OrchestratorPlugin();
    const plan = await plugin.createExecutionPlan(task, {
      parallel: 6,
      model: 'auto'
    });

    return {
      success: true,
      preview: {
        task,
        agents: plan.agents || [],
        estimatedCost: plan.estimatedCost || 0,
        estimatedTime: plan.estimatedTime || 0,
        recommendedModel: plan.recommendedModel || 'sonnet',
        complexity: plan.complexity || 'medium'
      },
      message: `📋 PREVIEW: ${task}\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `Agents: ${plan.agents?.length || 0} recommended\n` +
               `Complexity: ${plan.complexity || 'medium'}\n` +
               `Model: ${plan.recommendedModel || 'sonnet'}\n` +
               `Est. Cost: $${(plan.estimatedCost || 0).toFixed(4)}\n` +
               `Est. Time: ${plan.estimatedTime || 0} minutes\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = { handleOrchestratorPreviewCommand };
