# Test Coverage - Orchestrator

> Version: 1.0.0
> Last Updated: 2026-03-07
> Status: DRAFT

---

## Overview

Documento di definizione test per verificare il funzionamento dell'orchestrator.

---

## 1. Unit Tests

Test per singole funzioni/logica interna dell'orchestrator.

### 1.1 Profile Detection
- **Descrizione:** Verifica rilevamento profilo corretto (cca/ccg)
- **Input:** File `.current-provider` o `settings.json`
- **Output:** Profilo corretto selezionato
- **Test Cases:**
  - [ ] `.current-provider` contiene "claude" → profile cca
  - [ ] `.current-provider` contiene "zai" → profile ccg
  - [ ] Nessun file → fallback su default
  - [ ] File corrotto → fallback su default

### 1.2 Language Detection
- **Descrizione:** Verifica rilevamento lingua risposta
- **Input:** Messaggio utente, OS locale
- **Output:** Lingua rilevata (it/en)
- **Test Cases:**
  - [ ] Messaggio italiano → lingua it
  - [ ] Messaggio inglese → lingua en
  - [ ] OS locale it-IT → lingua it
  - [ ] OS locale en-US → lingua en

### 1.3 Agent Routing
- **Descrizione:** Verifica routing task all'agent corretto
- **Input:** Task description
- **Output:** Agent selezionato
- **Test Cases:**
  - [ ] "Analizza codice" → Analyzer agent
  - [ ] "Scrivi test" → Coder agent
  - [ ] "Fai review" → Reviewer agent
  - [ ] Task sconosciuto → Orchestrator fallback

### 1.4 Task Decomposition
- **Descrizione:** Verifica scomposizione task complesso
- **Input:** Task multi-step
- **Output:** Sotto-task table
- **Test Cases:**
  - [ ] Task con 3 passaggi → 3 sub-task
  - [ ] Task con dipendenze → ordinamento corretto
  - [ ] Task parallelo → parallel flag true

### 1.5 Rules Loading
- **Descrizione:** Verifica caricamento regole contestuale
- **Input:** Task type + file types
- **Output:** Regole caricate
- **Test Cases:**
  - [ ] Task Python → coding-style.md + python/patterns.md
  - [ ] Task SQL → database.md + security.md
  - [ ] Task semplice → solo coding-style.md

---

## 2. Integration Tests

Test per flussi completi end-to-end.

### 2.1 Task Semplice
- **Scenario:** Utente chiede "Analizza questo file Python"
- **Expected:** Delega a Analyzer agent con contesto corretto
- **Verify:**
  - [ ] Agent corretto selezionato
  - [ ] Context injection funzionante
  - [ ] Regole Python caricate
  - [ ] Risposta ricevuta

### 2.2 Task Parallelo
- **Scenario:** "Analizza questi 3 file e scrivi test per ciascuno"
- **Expected:** 3 agenti lanciati in parallelo
- **Verify:**
  - [ ] 3 sub-task nella table
  - [ ] Tutti parallel = true
  - [ ] Tutti completati
  - [ ] Nessun conflitto

### 2.3 Task con Dipendenze
- **Scenario:** "Refactor X, poi aggiorna test, poi aggiorna docs"
- **Expected:** Esecuzione sequenziale ordinata
- **Verify:**
  - [ ] Dipendenze correttamente marcate
  - [ ] Ordine esecuzione rispettato
  - [ ] Skip se precedente fallisce

### 2.4 Error Recovery
- **Scenario:** Agent fallisce, fallback chain attiva
- **Expected:** Tentativo con agent alternativo
- **Verify:**
  - [ ] Errore rilevato
  - [ ] Fallback agent chiamato
  - [ ] Log fallback presente
  - [ ] Task completato o report errore

### 2.5 Multi-Profile Routing
- **Scenario:** Task richiede tool specifico profilo
- **Expected:** Tool set corretto caricato
- **Verify:**
  - [ ] Profile cca → tool nativi + MCP
  - [ ] Profile ccg → tool Z.AI + nativi
  - [ ] Tool filtrati correttamente

---

## 3. Regression Tests

Test per evitare bug già risolti tornino.

### 3.1 Version Alignment
- **Descrizione:** Tutti i version reference allineati
- **Verify:**
  - [ ] SKILL.md version == changelog.md latest
  - [ ] MEMORY.md version == SKILL.md version
  - [ ] Nessun file con version obsoleto

### 3.2 Agent Count
- **Descrizione:** Numero agenti corretto (43)
- **Verify:**
  - [ ] 6 core agents
  - [ ] 22 L1 agents
  - [ ] 15 L2 agents
  - [ ] Total = 43

### 3.3 Skills Count
- **Descrizione:** Numero skills corretto (26)
- **Verify:**
  - [ ] 7 core skills
  - [ ] 8 workflow skills
  - [ ] 6 utility skills
  - [ ] 3 language skills
  - [ ] 2 learning skills
  - [ ] Total = 26

### 3.4 Documentation Coherence
- **Descrizione:** Documentazione coerente
- **Verify:**
  - [ ] INDEX.md conta 18 docs
  - [ ] Tutti i docs esistono
  - [ ] Nessun doc orfano

### 3.5 Tool Filtering
- **Descrizione:** Tool set corretto per profilo
- **Verify:**
  - [ ] tool_sets.json valido
  - [ ] Profile cca non ha tool Z.AI
  - [ ] Profile ccg ha tutti tool Z.AI

---

## 4. Test Matrix

| Test Type | Count | Priority | Status |
|-----------|-------|----------|--------|
| Unit | 15 | HIGH | TODO |
| Integration | 10 | HIGH | TODO |
| Regression | 5 | MEDIUM | TODO |
| **TOTAL** | **30** | - | **TODO** |

---

## 5. Come Eseguire i Test

### 5.1 Manual Testing

Attualmente eseguibili osservando il comportamento dell'orchestrator:

```bash
# Test profile detection
echo "claude" > .current-provider
# Avviare orchestrator e verificare tool set caricato

# Test language detection
# Mandare messaggio in italiano, verificare risposta in italiano

# Test agent routing
# Chiedere "Analizza codice", verificare Analyzer agent selezionato
```

### 5.2 Automated Testing (TODO)

Implementare suite pytest automatizzata:

```python
# tests/test_orchestrator.py
def test_profile_detection():
    assert detect_profile(".current-provider") == "cca"

def test_language_detection():
    assert detect_language("analizza questo") == "it"

def test_agent_routing():
    assert route_agent("analizza codice") == "analyzer"
```

**Status:** Da implementare

---

## 6. Maintenance

- Aggiornare test matrix quando nuovi test aggiunti
- Aggiornare expected counts quando agent/skills modificati
- Versionare questo file con changelog

---

**EOF**
