/**
 * Orchestrator Config Command Handler
 * Configure orchestrator settings
 */

const { OrchestratorPlugin } = require('../dist/index.js');
const fs = require('fs');
const path = require('path');

async function handleOrchestratorConfigCommand(args, context) {
  try {
    const { setting, value } = args;
    const configPath = path.join(__dirname, '..', 'config', 'orchestrator-config.json');

    // Read current config
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (!setting) {
      // Show all settings
      return {
        success: true,
        config: config,
        message: `⚙️ ORCHESTRATOR CONFIGURATION\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `${JSON.stringify(config, null, 2)}\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `Usage: /orchestrator-config <setting> <value>`
      };
    }

    if (value === undefined) {
      // Show specific setting
      const currentValue = config[setting];
      return {
        success: true,
        setting: setting,
        value: currentValue,
        message: `⚙️ ${setting}: ${JSON.stringify(currentValue)}`
      };
    }

    // Update setting
    config[setting] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      setting: setting,
      oldValue: config[setting],
      newValue: value,
      message: `✅ Configuration updated: ${setting} = ${value}`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = { handleOrchestratorConfigCommand };
