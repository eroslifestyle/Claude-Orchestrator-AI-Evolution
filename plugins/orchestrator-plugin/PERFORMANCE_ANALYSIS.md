# ORCHESTRATOR V12.6 - ANALISI PERFORMANCE

**Data:** 2026-03-06
**Versione:** 12.6.0
**Moduli analizzati:** 13 file Python (5205 righe totali)

---

## 1. TABELLA VALUTAZIONE PERFORMANCE PER MODULO

| Modulo | Righe | Complessità Algoritmica | I/O Operations | Concurrency | Performance | Note |
|--------|-------|------------------------|---------------|-------------|-------------|-------|
| **server.py** | 1639 | O(n) keyword scan | File I/O (sessions) | Async | ⚠️ MEDIA | Core orchestration |
| **model_selector.py** | 517 | O(1) lookup + O(n) scan | File I/O (mappings) | Sync | ✅ OTTIMA | Cache intelligente |
| **session_manager.py** | 407 | O(n) sessions + O(1) checkpoint | File I/O (checkpoints) | Sync | ✅ OTTIMA | Checkpoint every 3 ops |
| **agent_permissions.py** | 411 | O(1) dict lookup | None | Sync | ✅ OTTIMA | Singleton pattern |
| **auto_promotion.py** | 381 | O(n) pattern matching | File I/O (patterns) | Sync | ⚠️ MEDIA | Safety checks heavy |
| **context_tiers.py** | 352 | O(n) context analysis | None | Sync | ✅ OTTIMA | Pre-computed tiers |
| **session_resume.py** | 342 | O(n) session scan | File I/O (sessions) | Sync | ✅ OTTIMA | Cached results |
| **context_scorer.py** | 280 | O(n×m) scoring | None | Sync | ⚠️ MEDIA | Multi-factor scoring |
| **model_selector_sync.py** | 238 | O(n) mapping build | File I/O (JSON) | Sync | ✅ OTTIMA | One-time load |
| **activation.py** | 220 | O(n) regex scan | None | Sync | ✅ OTTIMA | Early exit optimization |
| **__init__.py** | 78 | - | - | - | ✅ OTTIMA | Lazy imports |
| **version.py** | 24 | O(1) | File I/O (version) | Sync | ✅ OTTIMA | Simple version check |
| **run_fixed_server.py** | 17 | O(1) | - | Sync | ✅ OTTIMA | Entry point wrapper |

---

## 2. ANALISI DETTAGLIATA PER MODULO

### 2.1 server.py (1639 righe) - Core Orchestration Engine

**Complessità Algoritmica:**
- `analyze_request()`: O(n×m) dove n = keywords, m = domains
- `generate_execution_plan()`: O(n) per keyword matching
- `_calculate_estimated_time()`: O(n) con n = tasks
- `format_plan_table()`: O(n) con n = tasks
- `cleanup_orphan_processes()`: O(p) dove p = process attivi
- `cleanup_temp_files()`: O(d×p) dove d = directories, p = patterns

**Operazioni I/O:**
- ✅ `_load_sessions()`: File read (session persistence)
- ✅ `_save_sessions()`: File write (limitato a ultimi 50)
- ⚠️ `cleanup_orphan_processes()`: Subprocess spawn (potenzialmente lento)
- ⚠️ `cleanup_temp_files()`: Glob + file operations (I/O pesante)

**Gestione Stato:**
- ✅ Singleton `engine` globale
- ✅ Sessions in dict (O(1) lookup)
- ⚠️ Nessun lock per accesso concorrente a `sessions`

**Performance Issues:**
1. **NO LOCKING su sessions** - Race condition possibile se chiamate concorrenti
2. **Keyword scan** - 159 keywords check per request (O(n))
3. **Cleanup operations** - Sincrone e potenzialmente lente

**Valutazione:** ⚠️ **MEDIA** - Funzionale ma con potenziali race conditions

---

### 2.2 model_selector.py (517 righe) - Intelligent Model Selection

**Complessità Algoritmica:**
- `get_model_for_agent_file()`: O(1) average case (dict lookup)
- `get_model_for_request()`: O(n×m) dove n = keywords, m = domains
- `analyze_request_keywords()`: O(n×k) dove n = keywords, k = keyword length
- `calculate_request_complexity()`: O(n) con n = tokens

**Operazioni I/O:**
- ✅ `load_keyword_model_mappings()`: One-time file load
- ✅ Cache dopo primo load

**Gestione Stato:**
- ✅ Singleton `_model_selector`
- ✅ Cache per `keyword_model_mappings` e `unified_agent_model_map`
- ✅ Pre-computed `AGENT_MODEL_DEFAULTS`

**Ottimizzazioni:**
- ✅ Memoization su agent_model_map
- ✅ Early return per esplicit model
- ✅ Lazy loading dei mappings

**Valutazione:** ✅ **OTTIMA** - Ben ottimizzato con cache e O(1) lookup

---

### 2.3 session_manager.py (407 righe) - Session Persistence

**Complessità Algoritmica:**
- `create_session()`: O(1) + O(1) checkpoint
- `add_task()`: O(1)
- `update_task()`: O(1) + O(1) checkpoint ogni 3 calls
- `get_session()`: O(1) dict lookup
- `cleanup_old_checkpoints()`: O(d) dove d = files da cancellare
- `_save_sessions()`: O(1) ma con I/O

**Operazioni I/O:**
- ✅ Checkpoint every 3 task updates (auto)
- ✅ Session persistence to JSON
- ⚠️ `cleanup_old_checkpoints()`: File glob + delete

**Gestione Stato:**
- ✅ Singleton `session_manager`
- ✅ `_checkpoint_counters` per tracking
- ⚠️ Nessun lock per accesso concorrente

**Performance Issues:**
1. **NO LOCKING** - Race condition su `_active_sessions` e `_checkpoint_counters`
2. **Checkpoint sincrono** - Blocca durante file I/O

**Valutazione:** ✅ **OTTIMA** - Ben strutturato ma manca thread safety

---

### 2.4 agent_permissions.py (411 righe) - Sub-agent Tool Permissions

**Complessità Algoritmica:**
- `get_permission_level()`: O(1) dict lookup + O(k) substring check per L2
  - L2 mapping: O(1) con 15 keys
  - Fallback: O(1) default READ
- `can_agent_use_tool()`: O(1) dict lookup + O(t) dove t = tools in level
- `get_allowed_tools()`: O(t) dove t = tools
- `inject_tool_permissions_into_agent_prompt()`: O(t) string building

**Operazioni I/O:**
- ✅ None (tranne config load a startup)

**Gestione Stato:**
- ✅ Singleton `_permission_manager`
- ✅ Pre-computed `MCP_TOOLS_BY_LEVEL`
- ✅ Pre-computed `DEFAULT_PERMISSIONS`

**Ottimizzazioni:**
- ✅ Dict lookup ovunque (O(1))
- ✅ Pre-computed tool lists per permission level
- ✅ L2 mapping per optimization

**Valutazione:** ✅ **OTTIMA** - Design eccellente con O(1) lookup

---

### 2.5 auto_promotion.py (381 righe) - Auto-promotion with Guardrails

**Complessità Algoritmica:**
- `check_promotion_ready()`: O(n×m×p) dove n = confirmations, m = criteri, p = pattern checks
- `safety_check()`: O(p) dove p = patterns da controllare
- `promote_to_skill()`: O(1) + file I/O

**Operazioni I/O:**
- ⚠️ Pattern file I/O (`auto_promote_patterns.json`)
- ⚠️ Skill file write (pesante)

**Gestione Stato:**
- ✅ Singleton `_auto_promoter`
- ✅ Cache per `_patterns`

**Performance Issues:**
1. **Heavy safety checks** - 10+ pattern regex per promotion
2. **File I/O sincrono** - Blocca durante write
3. **No parallel processing** - Sequential checks

**Valutazione:** ⚠️ **MEDIA** - Funzionale ma safety checks pesanti

---

### 2.6 context_tiers.py (352 righe) - Tiered Context Injection

**Complessità Algoritmica:**
- `get_context_tier()`: O(n×m) scoring n factors con m rules
- `build_context_injection()`: O(t) dove t = token count
- `calculate_complexity_score()`: O(n) linear scan

**Operazioni I/O:**
- ✅ None (tutto in-memory)

**Gestione Stato:**
- ✅ Pre-computed tier thresholds
- ✅ No mutable state

**Ottimizzazioni:**
- ✅ Early exit per low complexity
- ✇ Tier pre-calculati

**Valutazione:** ✅ **OTTIMA** - Design pulito senza I/O

---

### 2.7 session_resume.py (342 righe) - Session Resume Handler

**Complessità Algoritmica:**
- `has_resumable_sessions()`: O(n) session scan
- `get_resumable_sessions()`: O(n×m) dove n = sessions, m = filters
- `get_pending_tasks()`: O(t) dove t = tasks per session
- `get_session_summary()`: O(t) string formatting

**Operazioni I/O:**
- ✅ Session load from `SessionManager` (cached)

**Gestione Stato:**
- ✅ Singleton `resume_handler`
- ✅ Cached `resumable_sessions`

**Ottimizzazioni:**
- ✅ Cache su `resumable_sessions`
- ✅ Lazy session loading

**Valutazione:** ✅ **OTTIMA** - Ben ottimizzato con cache

---

### 2.8 context_scorer.py (280 righe) - Context Scoring System

**Complessità Algoritmica:**
- `is_context_sufficient()`: O(n×m×p) multi-factor scoring
  - n = factors (file count, domain count, etc.)
  - m = weights
  - p = patterns
- `get_clarifying_questions()`: O(n) question generation

**Operazioni I/O:**
- ✅ None (tutto in-memory)

**Gestione Stato:**
- ✅ Stateless (tutte funzioni pure)

**Performance Issues:**
1. **Multi-factor scoring** - 5+ factors per call
2. **Pattern matching** - Regex per ogni fattore

**Valutazione:** ⚠️ **MEDIA** - Accettabile ma potrebbe essere ottimizzato

---

### 2.9 model_selector_sync.py (238 righe) - Keyword Synchronization

**Complessità Algoritmica:**
- `load_keyword_model_mappings()`: O(1) con file I/O
- `create_unified_agent_model_map()`: O(n) dove n = mappings
- `verify_keyword_mappings_usage()`: O(1) file check

**Operazioni I/O:**
- ✅ One-time file load at startup

**Gestione Stato:**
- ✅ Global variables (pre-computed)

**Valutazione:** ✅ **OTTIMA** - One-time overhead, O(1) runtime

---

### 2.10 activation.py (220 righe) - Conditional Activation

**Complessità Algoritmica:**
- `detect_task_complexity()`: O(n) regex scan
  - Multiple regex patterns
  - Early exit optimization

**Operazioni I/O:**
- ✅ None (tutto in-memory)

**Gestione Stato:**
- ✅ Stateless

**Ottimizzazioni:**
- ✅ Early exit per trivial tasks
- ✓ Pre-compiled regex patterns

**Valutazione:** ✅ **OTTIMA** - Design efficiente con early exit

---

## 3. ANALISI CONCORSO E THREAD SAFETY

### 3.1 Problemi di Concorrenza Identificati

| Modulo | Problema | Severità | Fix Suggerito |
|--------|----------|----------|---------------|
| **server.py** | `sessions` dict senza lock | 🔴 ALTA | Aggiungere `threading.RLock()` |
| **server.py** | `_save_sessions()` senza lock | 🔴 ALTA | Aggiungere lock per write |
| **session_manager.py** | `_active_sessions` senza lock | 🔴 ALTA | Aggiungere `threading.RLock()` |
| **session_manager.py** | `_checkpoint_counters` senza lock | 🟡 MEDIA | Aggiungere lock |
| **auto_promotion.py** | File I/O sincrono durante promotion | 🟡 MEDIA | Rendere async |

### 3.2 Race Conditions Potenziali

1. **Session Creation Race:**
   ```python
   # Thread 1: create_session() → _save_sessions()
   # Thread 2: create_session() → _save_sessions()
   # RISULTATO: Ultimo write vince, session persa
   ```

2. **Task Update Counter Race:**
   ```python
   # Thread 1: update_task() → _checkpoint_counters[session] += 1
   # Thread 2: update_task() → _checkpoint_counters[session] += 1
   # RISULTATO: Counter non accurato
   ```

---

## 4. ANALISI MEMORY USAGE

### 4.1 Memory Allocation Patterns

| Modulo | Pattern | Potenziale Issue |
|--------|---------|-------------------|
| **server.py** | Dict di sessions (illimitato) | ⚠️ Memory leak se sessions non pulite |
| **server.py** | 159 keyword mappings | ✅ Static, OK |
| **model_selector.py** | Cache mappings | ✅ Static, OK |
| **session_manager.py** | Checkpoint files (su disco) | ✅ Pulito periodicamente |
| **auto_promotion.py** | Pattern cache | ✅ Static, OK |

### 4.2 Memory Leak Risks

1. **Sessions senza cleanup:**
   - `_save_sessions()` tiene solo ultimi 50
   - Ma `self.sessions` cresce indefinitamente
   - **Fix:** Aggiungere `cleanup_old_sessions()` automatico

2. **Checkpoint accumulation:**
   - File checkpoint non sono automaticamente puliti
   - Solo `cleanup_old_checkpoints()` manuale
   - **Fix:** Chiamare automaticamente all'avvio

---

## 5. ANALISI I/O PERFORMANCE

### 5.1 Operazioni I/O Critiche

| Operazione | Frequenza | Durata Stimata | Bottleneck? |
|------------|-----------|----------------|-------------|
| `generate_execution_plan()` | Per richiesta | ~10-50ms | ⚠️ Sì (keyword scan) |
| `_save_sessions()` | Ogni 3 task | ~5-20ms | ⚠️ Sì (file write) |
| `cleanup_orphan_processes()` | Post-orchestration | ~100-500ms | 🔴 Sì (subprocess) |
| `cleanup_temp_files()` | Post-orchestration | ~50-200ms | ⚠️ Sì (glob + delete) |
| `load_keyword_model_mappings()` | Startup | ~10ms | ✅ No (one-time) |
| `promote_to_skill()` | On-demand | ~20-50ms | ⚠️ Sì (file write) |

### 5.2 I/O Optimization Opportunities

1. **Async I/O per session persistence:**
   ```python
   # ATTUALMENTO:
   def _save_sessions(self):
       with open(SESSIONS_FILE, 'w') as f:
           json.dump(data, f)  # Blocca!

   # FIX SUGGERITO:
   async def _save_sessions_async(self):
       async with aiofiles_open(SESSIONS_FILE, 'w') as f:
           await f.write(json.dumps(data))
   ```

2. **Bulk operations per cleanup:**
   ```python
   # ATTUALMENTO: File per file
   for match in matches:
       os.remove(match)  # N system calls!

   # FIX SUGGERITO:
   import shutil
   for batch in batches:
       shutil.rmtree(batch)  # 1 system call
   ```

---

## 6. CLASSAMENTO FINALE PER PERFORMANCE

### 6.1 Top Performers (Ottimo)

| Modulo | Score | Motivo |
|--------|-------|--------|
| **agent_permissions.py** | ⭐⭐⭐⭐⭐ | O(1) lookup, no I/O, clean design |
| **model_selector_sync.py** | ⭐⭐⭐⭐⭐ | One-time load, O(1) runtime |
| **version.py** | ⭐⭐⭐⭐⭐ | Simple O(1) check |
| **activation.py** | ⭐⭐⭐⭐⭐ | Early exit, O(n) con n piccolo |
| **context_tiers.py** | ⭐⭐⭐⭐ | Pre-computed, no I/O |

### 6.2 Good Performers (Buono)

| Modulo | Score | Motivo |
|--------|-------|--------|
| **session_resume.py** | ⭐⭐⭐⭐ | Cached results, minor I/O |
| **session_manager.py** | ⭐⭐⭐⭐ | Checkpoint efficient, needs locks |
| **model_selector.py** | ⭐⭐⭐⭐ | Well cached, minor scans |
| **__init__.py** | ⭐⭐⭐⭐ | Lazy imports OK |

### 6.3 Medium Performers (Accettabile ma migliorabile)

| Modulo | Score | Problema Principale |
|--------|-------|-------------------|
| **context_scorer.py** | ⭐⭐⭐ | Multi-factor scoring pesante |
| **auto_promotion.py** | ⭐⭐⭐ | Heavy safety checks, sync I/O |
| **server.py** | ⭐⭐⭐ | No thread safety, some O(n) ops |

---

## 7. RACCOMANDAZIONI PER MIGLIORAMENTO

### 7.1 Critiche (Alta Priorità)

1. **Aggiungere Thread Safety a `server.py`:**
   ```python
   import threading

   class OrchestratorEngine:
       def __init__(self):
           self._lock = threading.RLock()
           self.sessions = {}

       def get_session(self, session_id):
           with self._lock:
               return self.sessions.get(session_id)
   ```

2. **Implementare Session Cleanup:**
   ```python
   def cleanup_old_sessions(self, max_age_hours=24):
       """Remove sessions older than max_age_hours."""
       now = datetime.now()
       to_remove = [
           sid for sid, s in self.sessions.items()
           if (now - s.started_at).total_seconds() > max_age_hours * 3600
       ]
       for sid in to_remove:
           del self.sessions[sid]
   ```

### 7.2 Importanti (Media Priorità)

1. **Async I/O per file operations:**
   - `aiofiles` per session persistence
   - Async subprocess per cleanup operations

2. **Bulk operations per cleanup:**
   - Batch file deletion
   - Parallel process termination

### 7.3 Nice to Have (Bassa Priorità)

1. **Metrics collection:**
   - Track execution times
   - Monitor session counts
   - Alert on memory thresholds

2. **Caching optimization:**
   - LRU cache per keyword matching
   - Pre-compute common request patterns

---

## 8. CONCLUSIONI

### Performance Totale dell'Orchestrator: **⭐⭐⭐⭐ (4/5)**

**Punti di Forza:**
- ✅ Ottima cache strategy (model_selector, permissions)
- ✅ Early exit optimization (activation)
- ✅ Efficient dict lookups ovunque
- ✅ Singleton pattern ben usato

**Punti di Debolezza:**
- ⚠️ **NO THREAD SAFETY** - Race conditions su sessions e task updates
- ⚠️ Sync I/O bloccanti (file writes, subprocess)
- ⚠️ Memory growth potenziale (sessions non limitate)
- ⚠️ No metrics/monitoring

**Stima Performance Operativa:**
- **Cold start:** ~50-100ms (load configs, cache)
- **Execution plan generation:** ~10-50ms (keyword scan)
- **Session persistence:** ~5-20ms per checkpoint
- **Total overhead per request:** ~20-100ms

**Verdetto Finale:**
L'orchestrator è **ben progettato e performante** per l'uso singolo-thread. Tuttavia, **non è thread-safe** e potrebbe avere problemi in scenari concorrenti. Con i fix suggeriti (thread safety, async I/O, cleanup), raggiungerebbe **⭐⭐⭐⭐⭐ (5/5)**.

---

**Report Generato:** 2026-03-06
**Autore:** Claude (GLM-4.7)
**Versione Orchestrator:** 12.6.0
