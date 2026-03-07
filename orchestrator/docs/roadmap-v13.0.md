# Orchestrator V13.0 Design Document

> **Status:** DRAFT - Q2 2026 Target | **Last Updated:** 2026-03-07

## Overview

V13.0 introduce tre nuove funzionalità principali:

1. **Dynamic Agent Selection** - Routing ML-based per agente ottimale
2. **Decouple Skills (Plugin Architecture)** - Skills come plugin caricabili dinamicamente
3. **File Locks per Race Condition Prevention** - Prevenzione conflitti su task paralleli

---

## 1. Dynamic Agent Selection (ML-based Routing)

### Obiettivo
Selezionare automaticamente l'agente migliore basato su performance storica, contesto del task, e caratteristiche del workload.

### Design

**Agent Performance DB:**
```sql
CREATE TABLE agent_metrics (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    language VARCHAR(20),
    success BOOLEAN NOT NULL,
    duration_ms INTEGER,
    tokens_used INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**ML Model:**
- Input: [task_type, language, complexity, historical_metrics]
- Output: Agent recommendation + confidence score
- Training: Supervised learning da performance storica
- Retraining: Settimanale automatico

**Implementation:**
```python
class AgentSelector:
    def select_agent(self, task_context: TaskContext) -> str:
        features = self._extract_features(task_context)
        historical = self.db.query_agent_metrics(features.task_type)
        prediction = self.model.predict(features, historical)
        if prediction.confidence < 0.7:
            return self._rule_based_selection(features)
        return prediction.agent_name
```

### Challenges
- **Cold Start:** Nuovi agenti senza storico → usare AGENT_REGISTRY
- **Data Collection:** Tracking di tutti task (anche falliti)
- **Model Training:** Minimo 1000 task per type
- **Concept Drift:** Performance cambia → retraining automatico

---

## 2. Decouple Skills (Plugin Architecture)

### Obiettivo
Trasformare skills da hardcoded a plugin caricabili dinamicamente: hot-reload, skills terze parti, versioning, discovery automatico.

### Design

**Skill Interface:**
```python
class SkillInterface(Protocol):
    def execute(self, args: str) -> str: ...
    def metadata() -> SkillMetadata: ...

# load.py per discovery
def register() -> SkillInterface: return SkillInstance()
def metadata() -> dict: return {"name": "skill", "version": "13.0.0"}
```

**Directory:** `skills/{core,community}/{skill}/skill.py, load.py`

**Implementation:**
```python
class SkillLoader:
    def discover_skills(self, skills_dir: Path) -> Dict[str, SkillInterface]:
        skills = {}
        for skill_path in skills_dir.rglob("load.py"):
            module = importlib.load_module(skill_path)
            meta = module.metadata()
            self._check_deps(meta["dependencies"])
            skills[meta["name"]] = module.register()
        return skills

    def hot_reload(self, skill_name: str):
        importlib.reload(sys.modules[skill_name])
```

### Challenges
- **Dependency Conflicts:** Skills richiedono versioni diverse → virtual environments
- **Version Compatibility:** V12 skills in V13 → semantic versioning + deprecation
- **Hot-reload Safety:** Skill in uso → reference counting + lazy reload
- **Security:** Skills terze parti → code signing + sandbox

---

## 3. File Locks per Race Condition Prevention

### Obiettivo
Prevenire conflitti quando task paralleli modificano lo stesso file.

### Design

**Lock File:**
- `.lock` file per ogni file modificato
- Contiene: PID, timestamp, task_id, timeout
- Retry con exponential backoff

**Implementation:**
```python
class FileLockManager:
    def acquire(self, file_path: Path, task_id: str, timeout: int = 30) -> bool:
        lock_path = file_path.with_suffix(file_path.suffix + ".lock")
        try:
            lock_fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(lock_fd, json.dumps({
                "pid": os.getpid(), "task_id": task_id,
                "acquired_at": time.time(), "timeout": timeout
            }).encode())
            os.close(lock_fd)
            return True
        except OSError:
            if self._is_stale(lock_path):
                os.remove(lock_path)
                return self.acquire(file_path, task_id, timeout)
            return False

    def release(self, file_path: Path):
        lock_path = file_path.with_suffix(file_path.suffix + ".lock")
        try: os.remove(lock_path)
        except FileNotFoundError: pass
```

### Challenges
- **Deadlock:** Due task in attesa reciproca → timeout + detection
- **Distributed:** Multi-process → file-based (single-host), redis (distributed)
- **Stale Locks:** Process crash → timeout automatico + PID check
- **Performance:** Lock overhead → lock-free per letture

---

## 4. Timeline

| Milestone | Date | Dependencies |
|-----------|------|--------------|
| Design review | 2026-04-01 | - |
| Agent Performance DB | 2026-04-15 | Design approval |
| ML Model Training | 2026-05-01 | DB + 1000 tasks |
| Skill Interface | 2026-04-01 | - |
| Skill Loader MVP | 2026-04-30 | Interface spec |
| File Locks MVP | 2026-03-30 | - |
| Integration Tests | 2026-05-15 | All MVPs |
| **V13.0 Release** | **2026-06-01** | Tests + docs |

**Pre-requisiti:** Test coverage > 80%, performance baseline (V12.7), docs V12.x completati

---

## 5. Open Questions

### ML Framework?
scikit-learn (semplice) → XGBoost (se necessario). PyTorch overkill.

### Lock System?
File-based V13.0 MVP → Redis V13.1 (multi-host).

### Skill Backward Compatibility?
Adapter Layer + Deprecation Period (6 mesi).

---

**Version:** 1.0.0 | **Status:** DRAFT | **Next Review:** 2026-04-01
