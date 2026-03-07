# Orchestrator V14.0 - ROADMAP DEVELOPER EXPERIENCE (Opzione C)

> Piano di sviluppo per debugging, monitoring e usabilita

---

## Overview

**Target:** Debugging avanz-the-board, monitoring dashboard, session resumption
**Durata stimata:** 5 settimane
**Prerequisiti:** V13.2 completato
**Dipendenze esterne:** Browser (React/Vue)

---

## Architettura Target

```
+--------------------------------------------------+
|              DASHBOARD WEB (React)                |
|                                                  |
|  +------------------+    +------------------+    |
|  | Agent Pool       |    | Task Queue       |    |
|  | Status Grid      |    | Timeline        |    |
|  +------------------+    +--------+---------+    |
|                                   |              |
|  +------------------+    +------------------+    |
|  | Token Usage      |    | Performance      |    |
|  | Meter           |    | Graphs           |    |
|  +--------+---------+    +------------------+    |
|           |                                      |
|  +--------v---------+    +------------------+    |
|  | Debug Mode       |    | Session          |    |
|  | (Step-through)   |    | Manager          |    |
|  +------------------+    +--------+---------+    |
+-----------------------------------|--------------+
                         WebSocket |
                                   v
+--------------------------------------------------+
|                  ORCHESTRATOR                    |
+--------------------------------------------------+
```

---

## Componenti da Sviluppare

### 1. Metrics Dashboard (2 settimane)

**File:** `lib/dashboard/` + `skills/orchestrator/dashboard/`

**Componenti:**

- **Backend:** WebSocket server per metriche real-time
- **Frontend:** React dashboard con Grafana-style charts
- **Features:**
  - Agent pool status (active/idle/error)
  - Task queue timeline
  - Token usage meter
  - Performance graphs (latency, throughput)
  - Debug mode toggle

**API:**
```python
# lib/dashboard/server.py
class DashboardServer:
    def __init__(self, port: int = 8765):
        self._websocket = WebSocketServer(port=port)
        self._metrics_buffer = deque(maxlen=1000)

    def broadcast_metrics(self, metrics: Dict) -> None:
        self._websocket.broadcast(json.dumps(metrics))

    def get_historical_metrics(self, minutes: int = 5) -> List[Dict]:
        return list(self._metrics_buffer)[-minutes:]
```

```python
# lib/dashboard/static/index.html
<!-- Dashboard UI -->
```

**Task:**
- [ ] Creare DashboardServer con WebSocket
- [ ] Creare Dashboard UI components
- [ ] Integrare con orchestrator metrics
- [ ] Test: real-time updates

---

### 2. Debug Mode Enhanced (1 settimana)

**File:** `lib/debug_mode.py`

**Funzionalita:**
- Step-through execution (pause tra ogni step)
- Stack trace inspection
- Variable inspection
- Decision logging (why agent X chosen)
- Performance profiling

**API:**
```python
class DebugController:
    def __init__(self, orchestrator):
        self._orchestrator = orchestrator
        self._breakpoints: Dict[str, Breakpoint] = {}
        self._call_stack: List[Dict] = []

    def step_through(self, step_number: int) -> None:
        """Pause execution at specific step."""
        self._breakpoints[step_number] = Breakpoint(step_number)
        self._orchestrator.pause()

    def inspect_variable(self, var_name: str) -> Any:
        """Inspect orchestrator variable."""
        return getattr(self._orchestrator, var_name, None)

    def get_decision_log(self) -> List[Dict]:
        """Get all routing decisions made."""
        return self._call_stack
```

**Task:**
- [ ] Implementare DebugController
- [ ] Aggiungere breakpoint system
- [ ] Integrare con SKILL.md steps
- [ ] Test: step-through funziona

---

### 3. Hook Integration Native (1 settimana)

**File:** `lib/hooks_integration.py`

**Obietivo:** Integrare orchestrator hooks con Claude Code native hooks system.

**Hook Mapping:**

| Orchestrator Hook | Claude Code Hook | File |
|-------------------|---------------------|------|
| PreStartup | PreToolUse | settings.json |
| SessionStart | PostToolUse | settings.json |
| PreToolUse | PreToolUse | settings.json |
| PostToolUse | PostToolUse | settings.json |
| SessionEnd | Stop | settings.json |

**API:**
```python
class HookManager:
    def __init__(self):
        self._hooks = self._load_hooks_from_settings()

    def _load_hooks_from_settings(self) -> Dict:
        """Load hooks from Claude Code settings.json."""
        # Read ~/.claude/settings.json
        # Parse hooks configuration
        # Return hook handlers
        pass

    def register_hook(self, event: str, handler: Callable) -> None:
        self._hooks[event] = handler

    def trigger_hook(self, event: str, context: Dict) -> Any:
        if event in self._hooks:
                return self._hooks[event](context)
        return None
```

**Task:**
- [ ] Implementare HookManager
- [ ] Mappare orchestrator hooks a settings.json format
- [ ] Integrare con SKILL.md steps
- [ ] Test: hooks triggered correttamente

---

### 4. Session Resumption (1 settimana)

**File:** `lib/session_resumption.py`

**Funzionalita:**
- Salva sessione completa su checkpoint
- Ripristina sessione da checkpoint
- Resume da interruzione
- Session versioning

**API:**
```python
class SessionManager:
    def __init__(self, checkpoint_dir: str):
        self._checkpoint_dir = Path(checkpoint_dir)

    def save_session(self, session_id: str, state: Dict) -> str:
        checkpoint_path = self._checkpoint_dir / f"{session_id}.json"
        with open(checkpoint_path, 'w') as f:
            json.dump(state, f, indent=2)
        return str(checkpoint_path)

    def load_session(self, session_id: str) -> Optional[Dict]:
        checkpoint_path = self._checkpoint_dir / f"{session_id}.json"
        if checkpoint_path.exists():
            return json.loads(checkpoint_path.read_text())
        return None

    def resume_session(self, session_id: str) -> bool:
        state = self.load_session(session_id)
        if state:
            # Ripristina stato
            return True
        return False
```

**Task:**
- [ ] Implementare SessionManager
- [ ] Integrare con checkpoint system esistente
- [ ] Aggiungere resume prompt
- [ ] Test: session persiste correttamente

---

## Integrazione con V13.2

### Modifiche a file esistenti

| File | Modifica |
|------|----------|
| `skills/orchestrator/SKILL.md` | + Dashboard endpoint |
| `lib/orchestrator.py` | + Debug mode support |
| `lib/checkpoint.py` | + Session resumption |

### Nuovi file

| Directory | File | Righe stimate |
|-----------|------|----------------|
| `lib/dashboard/` | server.py | 150 |
| `lib/dashboard/` | static/ | 500 (UI) |
| `lib/` | debug_mode.py | 200 |
| `lib/` | hooks_integration.py | 150 |
| `lib/` | session_resumption.py | 150 |

**Totale:** ~1150 nuove righe

---

## Metriche Target

| Metrica | V13.2 | V14.0 Target |
|---------|-------|--------------|
| Debugging time | Manuale | 50% riduzione |
| Visibility | Log-based | Dashboard real-time |
| Session recovery | Non | Automatico |
| Onboarding time | Alto | 30% riduzione |
| Test coverage | 15 test | 25+ test |

---

## Timeline

```
Settimana 1-2: Metrics Dashboard
  - Giorno 1-3:  DashboardServer + WebSocket
  - Giorno 4-6:  UI components
  - Giorno 7-10: Integration

Settimana 3: Debug Mode Enhanced
  - Giorno 1-3:  DebugController
  - Giorno 4-5:  Integration

Settimana 4: Hook Integration Native
  - Giorno 1-3:  HookManager
  - Giorno 4-5:  settings.json mapping

Settimana 5: Session Resumption + Integration
  - Giorno 1-2:  SessionManager
  - Giorno 3-4:  Integration tutti componenti
  - Giorno 5:    Docs + Release

Release V14.0 DX: Fine Settimana 5
```

---

## Come Iniziare

1. **Installare** dipendenze dashboard (se non presenti)
2. **Creare** lib/dashboard/ directory
3. **Implementare** DashboardServer con WebSocket
4. **Creare** UI components base
5. **Integrare** con orchestrator metrics

---

**Creato:** 2026-03-07
**Status:** PRONTO PER SVILUPPO
