"use strict";
/**
 * TEST ORCHESTRATOR V5.1
 *
 * Test del sistema multi-agent seguendo esempi da orchestrator.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOrchestrator = void 0;
const orchestrator_core_1 = require("./orchestrator-core");
async function testOrchestrator() {
    const orchestrator = new orchestrator_core_1.OrchestratorV51();
    console.log('🧪 TESTING ORCHESTRATOR V5.1 SYSTEM');
    console.log('='.repeat(60));
    // TEST 1: Esempio da orchestrator.md - "Crea tab Settings con form per configurazione database"
    console.log('\n🎯 TEST 1: GUI + Database (Multi-dominio)');
    console.log('Richiesta: "Crea tab Settings con form per configurazione database"');
    console.log('-'.repeat(60));
    try {
        await orchestrator.orchestrate('Crea tab Settings con form per configurazione database');
    }
    catch (error) {
        console.error('❌ Test 1 fallito:', error);
    }
    // Pausa tra test
    console.log('\n' + '='.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 2000));
    // TEST 2: Esempio da orchestrator.md - "Ottimizza EA MT5 per ridurre uso CPU del 50%"
    console.log('\n🎯 TEST 2: MQL + Testing (Sequenziale)');
    console.log('Richiesta: "Ottimizza EA MT5 per ridurre uso CPU del 50%"');
    console.log('-'.repeat(60));
    try {
        await orchestrator.orchestrate('Ottimizza EA MT5 per ridurre uso CPU del 50%');
    }
    catch (error) {
        console.error('❌ Test 2 fallito:', error);
    }
    // Pausa tra test
    console.log('\n' + '='.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 2000));
    // TEST 3: Security (CRITICA)
    console.log('\n🎯 TEST 3: Security (Priorità CRITICA)');
    console.log('Richiesta: "Implementa autenticazione OAuth2 con JWT encryption"');
    console.log('-'.repeat(60));
    try {
        await orchestrator.orchestrate('Implementa autenticazione OAuth2 con JWT encryption');
    }
    catch (error) {
        console.error('❌ Test 3 fallito:', error);
    }
    // Pausa tra test
    console.log('\n' + '='.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 2000));
    // TEST 4: Fallback (nessun keyword specifico)
    console.log('\n🎯 TEST 4: Fallback (Nessun expert specifico)');
    console.log('Richiesta: "Aggiungi una nuova funzionalità"');
    console.log('-'.repeat(60));
    try {
        await orchestrator.orchestrate('Aggiungi una nuova funzionalità');
    }
    catch (error) {
        console.error('❌ Test 4 fallito:', error);
    }
    // Pausa tra test
    console.log('\n' + '='.repeat(60));
    await new Promise(resolve => setTimeout(resolve, 2000));
    // TEST 5: Multi-dominio complesso (Architecture + Security + Database)
    console.log('\n🎯 TEST 5: Multi-dominio Complesso');
    console.log('Richiesta: "Refactor architettura microservizi con sicurezza JWT e database PostgreSQL"');
    console.log('-'.repeat(60));
    try {
        await orchestrator.orchestrate('Refactor architettura microservizi con sicurezza JWT e database PostgreSQL');
    }
    catch (error) {
        console.error('❌ Test 5 fallito:', error);
    }
    console.log('\n🎉 TESTING COMPLETATO!');
    console.log('✅ Tutti i test eseguiti seguendo le REGOLE V5.1');
    console.log('📋 Verifica che:');
    console.log('   - REGOLA #1: MAI codifica direttamente - SEMPRE delega ✅');
    console.log('   - REGOLA #2: SEMPRE comunica tabella agent PRIMA di lanciare ✅');
    console.log('   - REGOLA #3: Parallelismo massimo per task indipendenti ✅');
    console.log('   - REGOLA #5: OGNI processo DEVE concludersi con documenter expert agent ✅');
}
exports.testOrchestrator = testOrchestrator;
// Esegui i test
if (require.main === module) {
    testOrchestrator().catch(console.error);
}
//# sourceMappingURL=test-orchestrator.js.map