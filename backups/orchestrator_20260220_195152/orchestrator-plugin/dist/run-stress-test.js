/**
 * Stress Test Runner
 * Esegue lo stress test dell'orchestrator integrato
 */
// Use require for CommonJS compatibility
const { runStressTest } = require('./orchestrator-integrated');
console.log('🚀 Avvio stress test orchestrator...\n');
runStressTest({
    rootTasks: 6,
    maxDepth: 4,
    maxConcurrent: 10
}).then((stats) => {
    console.log('\n✅ Stress test completato con successo!');
    console.log(`📊 Risultato finale: ${stats.completed}/${stats.totalTasks} task completati`);
    process.exit(0);
}).catch((err) => {
    console.error('❌ Errore:', err);
    process.exit(1);
});
//# sourceMappingURL=run-stress-test.js.map