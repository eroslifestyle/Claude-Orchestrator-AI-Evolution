/**
 * Orchestrator Agents Command Handler
 * List available expert agents and their specializations
 */

const { OrchestratorPlugin } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');

async function handleOrchestratorAgentsCommand(args, context) {
  try {
    const plugin = new OrchestratorPlugin();
    const agentsPath = path.join(__dirname, '..', 'config', 'agent-registry.json');

    // Load agent registry
    const registry = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    const agents = [];

    // Core agents
    if (registry.core) {
      registry.core.forEach(agent => {
        agents.push({
          name: agent.name,
          role: agent.role,
          specialization: agent.specialization,
          model: agent.defaultModel,
          keywords: agent.keywords,
          type: 'core'
        });
      });
    }

    // Expert agents
    if (registry.experts) {
      registry.experts.forEach(agent => {
        agents.push({
          name: agent.name,
          role: agent.role,
          specialization: agent.specialization,
          model: agent.defaultModel,
          keywords: agent.keywords,
          type: 'expert'
        });
      });
    }

    const message = `🤖 AVAILABLE EXPERT AGENTS\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `Total: ${agents.length} agents\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                   agents.map(a => `${a.type === 'core' ? '⭐' : '🎯'} ${a.name}\n` +
                             `   Role: ${a.role}\n` +
                             `   Specialization: ${a.specialization}\n` +
                             `   Model: ${a.model}\n` +
                             `   Keywords: ${a.keywords?.join(', ') || 'N/A'}`).join('\n\n') +
                   `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return {
      success: true,
      agents: agents,
      count: agents.length,
      message
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = { handleOrchestratorAgentsCommand };
