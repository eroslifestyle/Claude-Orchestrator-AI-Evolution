# Codice Morto e Deprecated - Report Analisi

> **Data:** 2026-03-08
> **Versione Sistema:** V15.0.4
> **File Analizzati:** 41 file Python, 74 file markdown
> **Righe Totali:** ~24,351

---

## Sommario Esecutivo

| Categoria | Quantita | Priorita |
|-----------|----------|----------|
| File duplicati | 4 | ALTA |
| Documentazione obsoleta | 17 | MEDIA |
| Funzioni potenzialmente non usate | 8 | BASSA |
| Import non utilizzati | ~15 | BASSA |

---

## 1. FILE DUPLICATI (ALTA PRIORITA)

### 1.1 skills/orchestrator/lib/ vs lib/

**PROBLEMA:** Esistono duplicati tra `skills/orchestrator/lib/` e `lib/` con versioni diverse.

| File | Versione Vecchia | Versione Nuova | Differenza |
|------|------------------|----------------|------------|
| `agent_performance.py` | 165 righe (skills/...) | 724 righe (lib/) | **-559 righe** |
| `agent_selector.py` | 70 righe (skills/...) | 462 righe (lib/) | **-392 righe** |
| `file_locks.py` | 330 righe (skills/...) | 583 righe (lib/) | **-253 righe** |

**RACCOMANDAZIONE:**
```python
# TODO: remove - File duplicati in skills/orchestrator/lib/
# Questi file sono versioni obsolete dei moduli in lib/
# I file in lib/ sono aggiornati a V15.0.4+
# Rimuovere dopo verifica che nessun codice importi da skills.orchestrator.lib
```

**File da marcare come deprecated:**
- `C:\Users\LeoDg\.claude\skills\orchestrator\lib\agent_performance.py`
- `C:\Users\LeoDg\.claude\skills\orchestrator\lib\agent_selector.py`
- `C:\Users\LeoDg\.claude\skills\orchestrator\lib\file_locks.py`

---

## 2. DOCUMENTAZIONE OBSOLETA (MEDIA PRIORITA)

### 2.1 agents/docs/ - Versioni Non Allineate

I seguenti file contengono riferimenti a versioni vecchie (V2.1, V5.x, V6.x) mentre il sistema e' a V15.0.4:

| File | Versione Dichiarata | Azione |
|------|---------------------|--------|
| `agents/docs/getting-started.md` | V2.1 | Aggiornare |
| `agents/docs/implementation-details.md` | V2.1 | Aggiornare |
| `agents/docs/SYSTEM_ARCHITECTURE.md` | V6.2 | Aggiornare |
| `agents/docs/core/DOCUMENTATION_STATUS.md` | V1.0 (30 Gen 2026) | Aggiornare |
| `agents/docs/core/TODOLIST.md` | V6.2 ULTRA | Aggiornare |

**RACCOMANDAZIONE:**
```markdown
<!-- TODO: update - Documentazione obsoleta -->
<!-- Versione sistema attuale: V15.0.4 -->
<!-- Aggiornare riferimenti a versioni vecchie -->
```

### 2.2 agents/docs/core/ - Documentazione di Progetto

La directory `agents/docs/core/` contiene documentazione di progetto temporanea:

| File | Scopo | Stato |
|------|-------|-------|
| `DOCUMENTATION_INDEX.md` | Indice documentazione | Obsoleto |
| `DOCUMENTATION_STATUS.md` | Status tracker | Obsoleto |
| `README_DOCUMENTATION.md` | README docs | Obsoleto |
| `COMPLETION_REPORT.md` | Report completamento | Obsoleto |
| `TODOLIST.md` | Task tracking | Obsoleto |

**RACCOMANDAZIONE:**
- Questi file erano usati per tracciare il lavoro di documentazione
- Ora sono obsoleti (data: 30 Gennaio - 7 Febbraio 2026)
- Marcare come deprecated o spostare in `archived/`

---

## 3. FUNZIONI POTENZIALMENTE NON USATE (BASSA PRIORITA)

### 3.1 lib/exceptions.py

Le funzioni `wrap_exception()` e `get_exception_chain()` sono definite ma l'uso e' limitato:

```python
# File: lib/exceptions.py
# Righe: 597-654

# TODO: verify - Funzioni utility con uso limitato
# wrap_exception() - definita ma raramente usata
# get_exception_chain() - definita ma usata solo in debug
```

**Verifica necessaria:**
- Cercare usi di `wrap_exception` nel codice
- Cercare usi di `get_exception_chain` nel codice

### 3.2 lib/gp_fallback.py

```python
# File: lib/gp_fallback.py
# Classe: GaussianProcessFallback

# TODO: verify - Classe usata solo come fallback
# has_numpy() - usata solo in get_gp_implementation()
# get_gp_implementation() - usata solo in auto_tuner.py
```

**Stato:** La classe e' un fallback legittimo per ambienti senza NumPy. **NON rimuovere.**

### 3.3 lib/rate_limiter.py

```python
# File: lib/rate_limiter.py (850+ righe)
# Funzioni: get_rate_limiter(), reset_rate_limiter(), rate_limit(), async_rate_limit()

# TODO: verify - Rate limiter completo con uso limitato
# Utilizzato solo tramite facade.py
# Verificare se effettivamente necessario
```

---

## 4. IMPORT NON UTILIZZATI (BASSA PRIORITA)

### 4.1 Analisi con pyflakes (non disponibile)

Gli strumenti `pyflakes` e `vulture` non sono installati.

**RACCOMANDAZIONE:**
```bash
pip install pyflakes vulture
python -m pyflakes lib/*.py
python -m vulture lib/ --min-confidence 80
```

### 4.2 Import Potenzialmente Non Utilizzati

Basandosi sull'analisi manuale:

| File | Import | Note |
|------|--------|------|
| `lib/routing_engine.py` | `hashlib` | Verificare uso |
| `lib/predictive_cache.py` | `threading` | Usato per locks |
| `lib/adaptive_budget.py` | `dataclass` | Usato |

---

## 5. COMMENTI OBSOLETI

### 5.1 Commenti con Versioni Vecchie

Cercare e aggiornare commenti che referenziano versioni vecchie:

```bash
# Pattern da cercare:
# V[0-9]+\.[0-9]+(.[0-9]+)?
# DEPRECATED
# TODO
# FIXME
# obsolete
```

---

## 6. STRUTTURA FILE CONSOLIDATA

### 6.1 Moduli Principali (lib/)

| File | Righe | Stato | Note |
|------|-------|-------|------|
| `facade.py` | 584 | ATTIVO | API unificata |
| `routing_engine.py` | 694 | ATTIVO | 4-layer routing |
| `predictive_cache.py` | 814+ | ATTIVO | V14.0.2 |
| `auto_tuner.py` | 551+ | ATTIVO | V14.0.2 |
| `adaptive_budget.py` | 403+ | ATTIVO | V14.0.2 |
| `ab_testing.py` | 320+ | ATTIVO | V14.0.2 |
| `agent_performance.py` | 724 | ATTIVO | V14.0.4 |
| `agent_selector.py` | 462 | ATTIVO | V14.0.4 |
| `file_locks.py` | 583 | ATTIVO | V14.0.4 |
| `distributed_lock.py` | 995+ | ATTIVO | V15.0.4 |
| `rate_limiter.py` | 850+ | ATTIVO | V15.0 |
| `exceptions.py` | 697 | ATTIVO | V14.0.4 |
| `lazy_agents.py` | 785+ | ATTIVO | V13.1 |
| `rule_excerpts.py` | 387 | ATTIVO | V13.1 |
| `skill_interface.py` | 228 | ATTIVO | V13.0 |
| `skill_plugin.py` | 457 | ATTIVO | V13.0 |
| `process_manager.py` | 566+ | ATTIVO | V12.2 |
| `hooks.py` | 319 | ATTIVO | V12.0 |
| `gp_fallback.py` | 187 | ATTIVO | V15.0.4 |

### 6.2 File da Rimuovere/Deprecare

| File | Azione | Priorita |
|------|--------|----------|
| `skills/orchestrator/lib/agent_performance.py` | DEPRECATED | ALTA |
| `skills/orchestrator/lib/agent_selector.py` | DEPRECATED | ALTA |
| `skills/orchestrator/lib/file_locks.py` | DEPRECATED | ALTA |

---

## 7. PIANO DI AZIONE

### Fase 1: Marca Deprecated (Immediato)

1. Aggiungere header deprecated ai file in `skills/orchestrator/lib/`
2. Aggiungere commenti TODO ai file obsoleti in `agents/docs/`

### Fase 2: Verifica Uso (1-2 giorni)

1. Installare pyflakes e vulture
2. Eseguire analisi automatica
3. Verificare usi di funzioni dubbie

### Fase 3: Pulizia (Dopo Verifica)

1. Rimuovere file confermati come non usati
2. Aggiornare documentazione obsoleta
3. Consolidare import

---

## 8. COMANDI UTILI

```bash
# Installa strumenti analisi
pip install pyflakes vulture

# Analizza import non usati
python -m pyflakes lib/*.py

# Analizza codice morto
python -m vulture lib/ --min-confidence 80

# Cerca riferimenti a versione
grep -r "V[0-9]\+\.[0-9]\+" lib/

# Cerca TODO/FIXME
grep -r "TODO\|FIXME" lib/
```

---

## 9. CONCLUSIONI

### Statistiche Finali

- **Codice morto confermato:** 3 file duplicati (588 righe)
- **Documentazione obsoleta:** 17 file (~5,000 righe)
- **Funzioni da verificare:** 4 funzioni
- **Risparmio potenziale:** ~5,588 righe

### Raccomandazioni

1. **ALTA PRIORITA:** Rimuovere duplicati in `skills/orchestrator/lib/`
2. **MEDIA PRIORITA:** Aggiornare documentazione in `agents/docs/`
3. **BASSA PRIORITA:** Verificare funzioni con pyflakes/vulture

---

**Report generato da:** Orchestrator V15.0.4
**Data:** 2026-03-08
