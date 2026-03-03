#!/usr/bin/env ts-node
/**
 * ORCHESTRATOR VERIFICATION SCRIPT
 *
 * Verifica che l'installazione dell'orchestrator sia completa e funzionante.
 *
 * @version 4.0.0
 * @date 2026-02-03
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, passMsg: string, failMsg: string, isWarning = false): void {
  if (condition) {
    results.push({ name, status: 'pass', message: passMsg });
    console.log(`\x1b[32m[✓]\x1b[0m ${name}: ${passMsg}`);
  } else {
    results.push({ name, status: isWarning ? 'warn' : 'fail', message: failMsg });
    const color = isWarning ? '\x1b[33m' : '\x1b[31m';
    const icon = isWarning ? '!' : '✗';
    console.log(`${color}[${icon}]\x1b[0m ${name}: ${failMsg}`);
  }
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(ROOT_DIR, filePath));
}

function dirExists(dirPath: string): boolean {
  const fullPath = path.join(ROOT_DIR, dirPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ORCHESTRATOR PLUGIN - VERIFICATION v4.0                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

console.log('\n📦 PACKAGE FILES\n' + '─'.repeat(50));
check('package.json', fileExists('package.json'), 'Found', 'Missing - run npm init');
check('tsconfig.json', fileExists('tsconfig.json'), 'Found', 'Missing - TypeScript config needed');
check('README.md', fileExists('README.md'), 'Found', 'Missing - Documentation needed', true);
check('LICENSE', fileExists('LICENSE'), 'Found', 'Missing - License file recommended', true);

console.log('\n📁 DIRECTORIES\n' + '─'.repeat(50));
check('src/', dirExists('src'), 'Found', 'Missing - Source directory required');
check('dist/', dirExists('dist'), 'Found', 'Missing - Run npm run build');
check('config/', dirExists('config'), 'Found', 'Missing - Config directory required');
check('node_modules/', dirExists('node_modules'), 'Found', 'Missing - Run npm install');

console.log('\n⚙️ CORE MODULES\n' + '─'.repeat(50));
const coreFiles = [
  'src/execution/ParallelExecutionRule.ts',
  'src/execution/AgentContextManager.ts',
  'src/execution/ErrorRecoveryManager.ts',
  'src/execution/TokenBudgetManager.ts',
  'src/logging/OrchestratorVisualizer.ts'
];
for (const file of coreFiles) {
  const name = path.basename(file);
  check(name, fileExists(file), 'Found', 'Missing');
}

console.log('\n📋 CONFIGURATION\n' + '─'.repeat(50));
check('orchestrator-config.json', fileExists('config/orchestrator-config.json'), 'Found', 'Missing');
check('agent-registry.json', fileExists('config/agent-registry.json'), 'Found', 'Missing', true);
check('model-defaults.json', fileExists('config/model-defaults.json'), 'Found', 'Missing', true);

console.log('\n🧪 TEST FILES\n' + '─'.repeat(50));
check('stress-test', fileExists('src/run-integrated-stress-test.ts'), 'Found', 'Missing', true);
check('test suite', dirExists('tests'), 'Found', 'Missing - Tests recommended', true);

// Summary
console.log('\n' + '═'.repeat(60));
console.log(' VERIFICATION SUMMARY');
console.log('═'.repeat(60));

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warnings = results.filter(r => r.status === 'warn').length;

console.log(`\n  ✓ Passed:   ${passed}`);
console.log(`  ✗ Failed:   ${failed}`);
console.log(`  ! Warnings: ${warnings}`);
console.log(`  ─────────────`);
console.log(`  Total:      ${results.length}`);

if (failed === 0) {
  console.log(`
\x1b[32m╔══════════════════════════════════════════════════════════════════════════════╗
║                     ✓ VERIFICATION PASSED                                    ║
║                                                                              ║
║  L'orchestrator e pronto per l'uso!                                          ║
║                                                                              ║
║  Prossimi passi:                                                             ║
║    npm run stress-test    # Testa le performance                             ║
║    npm start              # Avvia l'orchestrator                             ║
╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`);
  process.exit(0);
} else {
  console.log(`
\x1b[31m╔══════════════════════════════════════════════════════════════════════════════╗
║                     ✗ VERIFICATION FAILED                                    ║
║                                                                              ║
║  Alcuni componenti sono mancanti. Esegui:                                    ║
║    npm run setup    # Per installare automaticamente                         ║
║                                                                              ║
║  Oppure manualmente:                                                         ║
║    npm install      # Installa dipendenze                                    ║
║    npm run build    # Compila TypeScript                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`);
  process.exit(1);
}
