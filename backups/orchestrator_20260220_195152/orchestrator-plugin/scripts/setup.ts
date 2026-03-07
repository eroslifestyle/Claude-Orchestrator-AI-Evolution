#!/usr/bin/env ts-node
/**
 * ORCHESTRATOR AUTO-SETUP SCRIPT
 *
 * Configura automaticamente il plugin orchestrator:
 * 1. Installa dipendenze
 * 2. Compila TypeScript
 * 3. Crea file di configurazione
 * 4. Verifica installazione
 *
 * @version 4.0.0
 * @date 2026-02-03
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins');

const DEFAULT_CONFIG = {
  version: '4.0.0',
  parallel: {
    maxConcurrentAgents: 64,
    enableAggressiveParallel: true,
    respectOnlyHardDependencies: true,
    minBatchSize: 1,
    maxBatchWaitMs: 5000
  },
  context: {
    clearBeforeEachExecution: true,
    maxTokensBeforeAutoClear: 50000,
    preserveSystemPrompt: true,
    preserveLastNTurns: 0,
    periodicCleanupIntervalMs: 60000
  },
  tokenBudget: {
    maxTokensPerConversation: 200000,
    greenThresholdPercent: 50,
    yellowThresholdPercent: 70,
    redThresholdPercent: 85,
    criticalThresholdPercent: 95,
    autoDecomposeOnRed: true,
    autoClearOnCritical: true
  },
  recovery: {
    maxRetries: 3,
    retryDelayMs: 1000,
    retryBackoffMultiplier: 2,
    maxRetryDelayMs: 30000,
    enableAutoEscalation: true,
    escalationThreshold: 2,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000
  },
  visualization: {
    enabled: true,
    showTimestamps: true,
    showAgentActivity: true,
    showTaskProgress: true,
    showPerformanceMetrics: true,
    showContextEvents: true,
    showDependencyFlow: true,
    showErrors: true,
    colorOutput: true,
    minLogLevel: 'INFO'
  },
  models: {
    default: 'sonnet',
    fallbackOrder: ['haiku', 'sonnet', 'opus'],
    costMultipliers: {
      haiku: 1,
      sonnet: 5,
      opus: 25
    }
  },
  agents: {
    fallbackMap: {
      'gui-expert': 'general-coder',
      'database-expert': 'general-coder',
      'security-expert': 'general-coder',
      'api-expert': 'integration-expert'
    }
  }
};

// =============================================================================
// UTILITIES
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  };
  const icons = {
    info: 'i',
    success: '✓',
    error: '✗',
    warn: '!'
  };
  console.log(`${colors[type]}[${icons[type]}]\x1b[0m ${message}`);
}

function runCommand(command: string, description: string): boolean {
  log(`${description}...`, 'info');
  try {
    execSync(command, { cwd: ROOT_DIR, stdio: 'inherit' });
    log(`${description} completato`, 'success');
    return true;
  } catch (error) {
    log(`${description} fallito: ${error}`, 'error');
    return false;
  }
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Creata directory: ${dir}`, 'success');
  }
}

function writeJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  log(`Scritto file: ${filePath}`, 'success');
}

// =============================================================================
// SETUP STEPS
// =============================================================================

async function step1_installDependencies(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(' STEP 1: Installazione Dipendenze');
  console.log('='.repeat(60) + '\n');

  return runCommand('npm install', 'Installazione dipendenze npm');
}

async function step2_buildProject(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(' STEP 2: Compilazione TypeScript');
  console.log('='.repeat(60) + '\n');

  return runCommand('npm run build', 'Compilazione progetto');
}

async function step3_createConfigs(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(' STEP 3: Creazione File di Configurazione');
  console.log('='.repeat(60) + '\n');

  try {
    // Ensure config directory
    ensureDir(CONFIG_DIR);

    // Write main config
    const configPath = path.join(CONFIG_DIR, 'orchestrator-config.json');
    writeJson(configPath, DEFAULT_CONFIG);

    // Write dist config
    const distConfigDir = path.join(ROOT_DIR, 'dist', 'config');
    ensureDir(distConfigDir);
    writeJson(path.join(distConfigDir, 'orchestrator-config.json'), DEFAULT_CONFIG);

    log('File di configurazione creati', 'success');
    return true;
  } catch (error) {
    log(`Errore creazione config: ${error}`, 'error');
    return false;
  }
}

async function step4_setupClaudeIntegration(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(' STEP 4: Integrazione con Claude Code');
  console.log('='.repeat(60) + '\n');

  try {
    // Check if Claude directory exists
    if (!fs.existsSync(CLAUDE_DIR)) {
      log(`Directory Claude non trovata: ${CLAUDE_DIR}`, 'warn');
      log('Saltando integrazione Claude (installa manualmente se necessario)', 'warn');
      return true;
    }

    // Ensure plugins directory
    ensureDir(PLUGINS_DIR);

    // Create symlink or copy
    const targetDir = path.join(PLUGINS_DIR, 'orchestrator-plugin');

    if (fs.existsSync(targetDir)) {
      log(`Plugin gia presente in: ${targetDir}`, 'info');
    } else {
      // Create plugin manifest in Claude plugins
      const manifestPath = path.join(targetDir);
      ensureDir(manifestPath);

      // Copy essential files
      const filesToCopy = ['package.json', 'plugin-manifest.json'];
      for (const file of filesToCopy) {
        const src = path.join(ROOT_DIR, file);
        const dest = path.join(targetDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          log(`Copiato: ${file}`, 'success');
        }
      }

      // Copy dist folder
      const distSrc = path.join(ROOT_DIR, 'dist');
      const distDest = path.join(targetDir, 'dist');
      if (fs.existsSync(distSrc)) {
        execSync(`cp -r "${distSrc}" "${distDest}"`, { stdio: 'pipe' });
        log('Copiata cartella dist', 'success');
      }
    }

    log('Integrazione Claude completata', 'success');
    return true;
  } catch (error) {
    log(`Errore integrazione Claude: ${error}`, 'warn');
    return true; // Non bloccare per errori di integrazione
  }
}

async function step5_verify(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log(' STEP 5: Verifica Installazione');
  console.log('='.repeat(60) + '\n');

  let success = true;

  // Check package.json
  const packagePath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(packagePath)) {
    log('package.json presente', 'success');
  } else {
    log('package.json mancante', 'error');
    success = false;
  }

  // Check node_modules
  const nodeModules = path.join(ROOT_DIR, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    log('node_modules presente', 'success');
  } else {
    log('node_modules mancante', 'error');
    success = false;
  }

  // Check dist
  const dist = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(dist)) {
    log('dist/ presente (build completato)', 'success');
  } else {
    log('dist/ mancante (build non completato)', 'error');
    success = false;
  }

  // Check config
  const configPath = path.join(CONFIG_DIR, 'orchestrator-config.json');
  if (fs.existsSync(configPath)) {
    log('orchestrator-config.json presente', 'success');
  } else {
    log('orchestrator-config.json mancante', 'error');
    success = false;
  }

  // Check key source files
  const keyFiles = [
    'src/execution/ParallelExecutionRule.ts',
    'src/execution/AgentContextManager.ts',
    'src/execution/ErrorRecoveryManager.ts',
    'src/execution/TokenBudgetManager.ts',
    'src/logging/OrchestratorVisualizer.ts'
  ];

  for (const file of keyFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      log(`${file} presente`, 'success');
    } else {
      log(`${file} mancante`, 'warn');
    }
  }

  return success;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ORCHESTRATOR PLUGIN - AUTO SETUP v4.0                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  const startTime = Date.now();
  let allSuccess = true;

  // Step 1: Install dependencies
  if (!(await step1_installDependencies())) {
    log('Setup interrotto: installazione dipendenze fallita', 'error');
    process.exit(1);
  }

  // Step 2: Build project
  if (!(await step2_buildProject())) {
    log('Warning: build fallito, continuando...', 'warn');
    allSuccess = false;
  }

  // Step 3: Create configs
  if (!(await step3_createConfigs())) {
    log('Warning: creazione config fallita', 'warn');
    allSuccess = false;
  }

  // Step 4: Claude integration
  await step4_setupClaudeIntegration();

  // Step 5: Verify
  const verified = await step5_verify();
  if (!verified) {
    allSuccess = false;
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log(' SETUP COMPLETATO');
  console.log('='.repeat(60));

  if (allSuccess) {
    console.log(`
✅ Setup completato con successo in ${duration}s

Prossimi passi:
  1. npm run stress-test    # Testa il sistema
  2. npm run verify         # Verifica installazione

Per utilizzare l'orchestrator:
  - Da Claude Code: /orchestrator "task description"
  - Programmaticamente: import { ... } from 'orchestrator-plugin/execution'
    `);
  } else {
    console.log(`
⚠️  Setup completato con warning in ${duration}s

Alcuni componenti potrebbero non funzionare correttamente.
Esegui: npm run verify per verificare lo stato.
    `);
  }

  process.exit(allSuccess ? 0 : 1);
}

// Run
main().catch((error) => {
  log(`Setup fallito: ${error}`, 'error');
  process.exit(1);
});
