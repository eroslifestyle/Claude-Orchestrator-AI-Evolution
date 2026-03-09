"""Modello UltraTask per task gerarchici infiniti.

Questo modulo fornisce un modello di task gerarchico completo con:
- Struttura ricorsiva (task contiene subtask illimitati)
- Tracking depth, parent_id, children
- Supporto per 50+ agent/skill/plugin per task
- Status e Priority tracking
- Result aggregation da subtask
- Serializzazione JSON completa

Utilizzo:
    from lib.ultra_task import UltraTask, TaskStatus, TaskPriority

    # Crea task root
    task = UltraTask(
        name="Analisi codice",
        description="Analizza il codice del progetto"
    )

    # Aggiungi agent, skill, plugin
    task.add_agent("Coder", model="haiku", params={"timeout": 60})
    task.add_skill("code-review", args={"strict": True})
    task.add_plugin("analyzer", version="1.0.0", config={"rules": "strict"})

    # Spawna subtask
    subtask = task.spawn_subtask("Analisi moduli", "Analizza singoli moduli")

    # Naviga la gerarchia
    print(f"Root: {task.is_root()}")  # True
    print(f"Leaf: {subtask.is_leaf()}")  # True
    print(f"Total tasks: {task.count_total_tasks()}")  # 2

    # Serializza
    data = task.to_dict()
    restored = UltraTask.from_dict(data)

Version: V15.2.0
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


# =============================================================================
# ENUM
# =============================================================================

class TaskStatus(Enum):
    """Stato del task nel ciclo di vita.

    Stati:
        PENDING: Task creato, in attesa di esecuzione
        QUEUED: Task in coda per l'esecuzione
        RUNNING: Task in esecuzione
        SPAWNING: Task sta generando subtask
        COMPLETED: Task completato con successo
        FAILED: Task fallito con errore
        CANCELLED: Task annullato prima del completamento
    """
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    SPAWNING = "spawning"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """Priorita' del task per scheduling.

    Livelli:
        CRITICAL: Priorita' massima, esecuzione immediata
        HIGH: Alta priorita', esecuzione rapida
        NORMAL: Priorita' standard (default)
        LOW: Bassa priorita', esecuzione quando possibile
        BACKGROUND: Priorita' minima, esecuzione in background
    """
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3
    BACKGROUND = 4


# =============================================================================
# CONFIG DATACLASSES
# =============================================================================

@dataclass
class AgentConfig:
    """Configurazione di un agente assegnato al task.

    Attributes:
        agent_id: Identificativo univoco dell'agente (auto-generato)
        name: Nome dell'agente (es. "Coder", "Analyzer")
        model: Modello LLM da usare (es. "haiku", "opus")
        params: Parametri aggiuntivi per l'agente
    """
    name: str
    model: str = "haiku"
    params: Dict[str, Any] = field(default_factory=dict)
    agent_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        """Serializza la configurazione agente."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "model": self.model,
            "params": self.params,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentConfig":
        """Deserializza la configurazione agente."""
        return cls(
            agent_id=data.get("agent_id", str(uuid.uuid4())[:8]),
            name=data["name"],
            model=data.get("model", "haiku"),
            params=data.get("params", {}),
        )


@dataclass
class SkillConfig:
    """Configurazione di una skill assegnata al task.

    Attributes:
        skill_id: Identificativo univoco della skill (auto-generato)
        name: Nome della skill (es. "code-review", "testing-strategy")
        args: Argomenti per la skill
    """
    name: str
    args: Dict[str, Any] = field(default_factory=dict)
    skill_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        """Serializza la configurazione skill."""
        return {
            "skill_id": self.skill_id,
            "name": self.name,
            "args": self.args,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SkillConfig":
        """Deserializza la configurazione skill."""
        return cls(
            skill_id=data.get("skill_id", str(uuid.uuid4())[:8]),
            name=data["name"],
            args=data.get("args", {}),
        )


@dataclass
class PluginConfig:
    """Configurazione di un plugin assegnato al task.

    Attributes:
        plugin_id: Identificativo univoco del plugin (auto-generato)
        name: Nome del plugin (es. "analyzer", "formatter")
        version: Versione del plugin
        config: Configurazione specifica del plugin
    """
    name: str
    version: str = "1.0.0"
    config: Dict[str, Any] = field(default_factory=dict)
    plugin_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def to_dict(self) -> Dict[str, Any]:
        """Serializza la configurazione plugin."""
        return {
            "plugin_id": self.plugin_id,
            "name": self.name,
            "version": self.version,
            "config": self.config,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PluginConfig":
        """Deserializza la configurazione plugin."""
        return cls(
            plugin_id=data.get("plugin_id", str(uuid.uuid4())[:8]),
            name=data["name"],
            version=data.get("version", "1.0.0"),
            config=data.get("config", {}),
        )


# =============================================================================
# ULTRA TASK
# =============================================================================

@dataclass
class UltraTask:
    """Task gerarchico con supporto per struttura ricorsiva infinita.

    Questo modello supporta:
    - Alberi di task con profondita' illimitata
    - 50+ agent/skill/plugin per task
    - Tracking completo di stato e priorita'
    - Aggregazione risultati da subtask
    - Serializzazione JSON completa

    Attributes:
        task_id: Identificativo univoco del task (auto-generato UUID)
        name: Nome descrittivo del task
        description: Descrizione dettagliata del task
        depth: Profondita' nell'albero (0 = root, calcolato automaticamente)
        parent_id: ID del task genitore (None per root)
        children: Lista di subtask figli
        agents: Lista di configurazioni agent assegnate
        skills: Lista di configurazioni skill assegnate
        plugins: Lista di configurazioni plugin assegnate
        status: Stato corrente del task
        priority: Priorita' del task
        created_at: Timestamp di creazione
        updated_at: Timestamp di ultimo aggiornamento
        started_at: Timestamp di inizio esecuzione (None se non iniziato)
        completed_at: Timestamp di completamento (None se non completato)
        result: Risultato dell'esecuzione (se completato)
        error: Messaggio di errore (se fallito)
        subtask_results: Risultati aggregati dai subtask

    Example:
        # Crea albero di task
        root = UltraTask(name="Progetto", description="Analisi completa")
        root.add_agent("Coder", model="haiku")

        # Aggiungi subtask
        for i in range(5):
            sub = root.spawn_subtask(f"Task-{i}", f"Subtask {i}")
            sub.add_skill("testing-strategy")

        # Naviga
        print(f"Root: {root.is_root()}")  # True
        print(f"Total: {root.count_total_tasks()}")  # 6

        # Serializza
        data = root.to_dict()
        restored = UltraTask.from_dict(data)
    """
    # Identificazione
    name: str
    description: str = ""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])

    # Gerarchia
    depth: int = 0
    parent_id: Optional[str] = None
    children: List["UltraTask"] = field(default_factory=list)

    # Risorse (50+ per tipo supportati)
    agents: List[AgentConfig] = field(default_factory=list)
    skills: List[SkillConfig] = field(default_factory=list)
    plugins: List[PluginConfig] = field(default_factory=list)

    # Stato
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL

    # Timestamps
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Risultati
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    subtask_results: Dict[str, Any] = field(default_factory=dict)

    # Metadati aggiuntivi
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validazione post-inizializzazione."""
        # Assicura che le liste siano inizializzate
        if self.children is None:
            self.children = []
        if self.agents is None:
            self.agents = []
        if self.skills is None:
            self.skills = []
        if self.plugins is None:
            self.plugins = []
        if self.metadata is None:
            self.metadata = {}

    # =========================================================================
    # METODI PER AGGIUNGERE RISORSE
    # =========================================================================

    def add_agent(
        self,
        name: str,
        model: str = "haiku",
        params: Optional[Dict[str, Any]] = None,
    ) -> AgentConfig:
        """Aggiunge un agente al task.

        Args:
            name: Nome dell'agente (es. "Coder", "Analyzer")
            model: Modello LLM da usare (default: "haiku")
            params: Parametri aggiuntivi per l'agente

        Returns:
            La configurazione agente creata

        Example:
            task.add_agent("Coder", model="haiku", params={"timeout": 60})
        """
        agent = AgentConfig(
            name=name,
            model=model,
            params=params or {},
        )
        self.agents.append(agent)
        self._touch()
        return agent

    def add_skill(
        self,
        name: str,
        args: Optional[Dict[str, Any]] = None,
    ) -> SkillConfig:
        """Aggiunge una skill al task.

        Args:
            name: Nome della skill (es. "code-review")
            args: Argomenti per la skill

        Returns:
            La configurazione skill creata

        Example:
            task.add_skill("testing-strategy", args={"coverage": 80})
        """
        skill = SkillConfig(
            name=name,
            args=args or {},
        )
        self.skills.append(skill)
        self._touch()
        return skill

    def add_plugin(
        self,
        name: str,
        version: str = "1.0.0",
        config: Optional[Dict[str, Any]] = None,
    ) -> PluginConfig:
        """Aggiunge un plugin al task.

        Args:
            name: Nome del plugin
            version: Versione del plugin
            config: Configurazione specifica

        Returns:
            La configurazione plugin creata

        Example:
            task.add_plugin("analyzer", version="2.0", config={"rules": "strict"})
        """
        plugin = PluginConfig(
            name=name,
            version=version,
            config=config or {},
        )
        self.plugins.append(plugin)
        self._touch()
        return plugin

    # =========================================================================
    # METODI GERARCHICI
    # =========================================================================

    def spawn_subtask(
        self,
        name: str,
        description: str = "",
    ) -> "UltraTask":
        """Crea e aggiunge un subtask figlio.

        Il subtask eredita la priorita' del genitore e viene
        configurato automaticamente con depth corretto.

        Args:
            name: Nome del subtask
            description: Descrizione del subtask

        Returns:
            Il subtask creato

        Example:
            root = UltraTask(name="Progetto")
            sub1 = root.spawn_subtask("Task 1", "Primo subtask")
            sub2 = root.spawn_subtask("Task 2", "Secondo subtask")
            # root.depth = 0, sub1.depth = 1, sub2.depth = 1
        """
        subtask = UltraTask(
            name=name,
            description=description,
            depth=self.depth + 1,
            parent_id=self.task_id,
            priority=self.priority,  # Eredita priorita'
        )
        self.children.append(subtask)
        self._touch()
        return subtask

    def is_root(self) -> bool:
        """Verifica se questo task e' la radice dell'albero.

        Returns:
            True se il task non ha genitore (depth = 0)

        Example:
            root = UltraTask(name="Root")
            sub = root.spawn_subtask("Sub")
            assert root.is_root()  # True
            assert not sub.is_root()  # False
        """
        return self.parent_id is None and self.depth == 0

    def is_leaf(self) -> bool:
        """Verifica se questo task e' una foglia (senza figli).

        Returns:
            True se il task non ha figli

        Example:
            root = UltraTask(name="Root")
            sub = root.spawn_subtask("Sub")
            assert sub.is_leaf()  # True
            assert not root.is_leaf()  # False
        """
        return len(self.children) == 0

    def get_all_descendants(self) -> List["UltraTask"]:
        """Ottiene tutti i discendenti ricorsivamente.

        Attraversa l'albero in profondita' (DFS) raccogliendo
        tutti i task discendenti.

        Returns:
            Lista di tutti i task discendenti (esclude self)

        Example:
            root = UltraTask(name="Root")
            sub1 = root.spawn_subtask("Sub1")
            sub2 = root.spawn_subtask("Sub2")
            subsub = sub1.spawn_subtask("SubSub")

            descendants = root.get_all_descendants()
            # [sub1, subsub, sub2] - 3 task
        """
        descendants: List["UltraTask"] = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def count_total_tasks(self) -> int:
        """Conta il numero totale di task nell'albero (self + discendenti).

        Returns:
            Numero totale di task inclusi self e tutti i discendenti

        Example:
            root = UltraTask(name="Root")
            for i in range(5):
                root.spawn_subtask(f"Sub{i}")

            total = root.count_total_tasks()  # 6 (1 root + 5 sub)
        """
        return 1 + sum(child.count_total_tasks() for child in self.children)

    def get_depth_tree(self) -> Dict[int, List["UltraTask"]]:
        """Ottiene i task organizzati per livello di profondita'.

        Returns:
            Dizionario depth -> lista di task a quel livello

        Example:
            root = UltraTask(name="Root")
            sub1 = root.spawn_subtask("Sub1")
            sub2 = root.spawn_subtask("Sub2")
            subsub = sub1.spawn_subtask("SubSub")

            tree = root.get_depth_tree()
            # {0: [root], 1: [sub1, sub2], 2: [subsub]}
        """
        result: Dict[int, List["UltraTask"]] = {self.depth: [self]}

        for child in self.children:
            child_tree = child.get_depth_tree()
            for depth, tasks in child_tree.items():
                if depth not in result:
                    result[depth] = []
                result[depth].extend(tasks)

        return result

    # =========================================================================
    # METODI DI STATO
    # =========================================================================

    def update_status(self, new_status: TaskStatus) -> None:
        """Aggiorna lo stato del task con timestamp automatico.

        Args:
            new_status: Il nuovo stato da impostare

        Example:
            task.update_status(TaskStatus.RUNNING)
            task.update_status(TaskStatus.COMPLETED)
        """
        self.status = new_status
        self._touch()

        # Aggiorna timestamp specifici
        if new_status == TaskStatus.RUNNING and self.started_at is None:
            self.started_at = datetime.now()
        elif new_status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            if self.completed_at is None:
                self.completed_at = datetime.now()

    def _touch(self) -> None:
        """Aggiorna il timestamp di modifica."""
        self.updated_at = datetime.now()

    # =========================================================================
    # SERIALIZZAZIONE
    # =========================================================================

    def to_dict(self) -> Dict[str, Any]:
        """Serializza il task e tutti i suoi discendenti in dizionario.

        La serializzazione e' completa e ricorsiva, includendo
        tutti i children, agent, skill, plugin.

        Returns:
            Dizionario con tutti i dati del task

        Example:
            task = UltraTask(name="Test")
            task.add_agent("Coder")
            data = task.to_dict()

            # data contiene:
            # {
            #     "task_id": "...",
            #     "name": "Test",
            #     "agents": [{"name": "Coder", ...}],
            #     "children": [...],
            #     ...
            # }
        """
        return {
            # Identificazione
            "task_id": self.task_id,
            "name": self.name,
            "description": self.description,
            # Gerarchia
            "depth": self.depth,
            "parent_id": self.parent_id,
            "children": [child.to_dict() for child in self.children],
            # Risorse
            "agents": [a.to_dict() for a in self.agents],
            "skills": [s.to_dict() for s in self.skills],
            "plugins": [p.to_dict() for p in self.plugins],
            # Stato
            "status": self.status.value,
            "priority": self.priority.value,
            # Timestamps
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            # Risultati
            "result": self.result,
            "error": self.error,
            "subtask_results": self.subtask_results,
            # Metadati
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UltraTask":
        """Deserializza un task da dizionario.

        Ricostruisce completamente l'albero dei task includendo
        tutti i children, agent, skill, plugin.

        Args:
            data: Dizionario con i dati del task

        Returns:
            UltraTask ricostruito con tutti i discendenti

        Example:
            data = {
                "task_id": "abc123",
                "name": "Test",
                "agents": [{"name": "Coder", "model": "haiku", "params": {}}],
                "children": [...]
            }
            task = UltraTask.from_dict(data)
        """
        # Parsa timestamps
        created_at = datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now()
        updated_at = datetime.fromisoformat(data["updated_at"]) if "updated_at" in data else datetime.now()
        started_at = datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None
        completed_at = datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None

        # Crea il task
        task = cls(
            task_id=data.get("task_id", str(uuid.uuid4())[:12]),
            name=data["name"],
            description=data.get("description", ""),
            depth=data.get("depth", 0),
            parent_id=data.get("parent_id"),
            status=TaskStatus(data.get("status", "pending")),
            priority=TaskPriority(data.get("priority", 2)),
            created_at=created_at,
            updated_at=updated_at,
            started_at=started_at,
            completed_at=completed_at,
            result=data.get("result"),
            error=data.get("error"),
            subtask_results=data.get("subtask_results", {}),
            metadata=data.get("metadata", {}),
        )

        # Ripristina agent
        for agent_data in data.get("agents", []):
            task.agents.append(AgentConfig.from_dict(agent_data))

        # Ripristina skill
        for skill_data in data.get("skills", []):
            task.skills.append(SkillConfig.from_dict(skill_data))

        # Ripristina plugin
        for plugin_data in data.get("plugins", []):
            task.plugins.append(PluginConfig.from_dict(plugin_data))

        # Ripristina children ricorsivamente
        for child_data in data.get("children", []):
            child = cls.from_dict(child_data)
            task.children.append(child)

        return task

    # =========================================================================
    # METODI DI UTILITA'
    # =========================================================================

    def get_resource_counts(self) -> Dict[str, int]:
        """Conta le risorse assegnate al task.

        Returns:
            Dizionario con conteggio di agent, skill, plugin, children

        Example:
            task.add_agent("Coder")
            task.add_skill("review")
            task.spawn_subtask("Sub")

            counts = task.get_resource_counts()
            # {"agents": 1, "skills": 1, "plugins": 0, "children": 1}
        """
        return {
            "agents": len(self.agents),
            "skills": len(self.skills),
            "plugins": len(self.plugins),
            "children": len(self.children),
        }

    def get_total_resource_counts(self) -> Dict[str, int]:
        """Conta le risorse totali nell'albero (self + discendenti).

        Returns:
            Dizionario con conteggio totale di risorse

        Example:
            root.add_agent("Coder")
            sub = root.spawn_subtask("Sub")
            sub.add_agent("Analyzer")

            counts = root.get_total_resource_counts()
            # {"agents": 2, "skills": 0, "plugins": 0, "children": 1, "tasks": 2}
        """
        counts = self.get_resource_counts()
        counts["tasks"] = 1

        for child in self.children:
            child_counts = child.get_total_resource_counts()
            counts["agents"] += child_counts["agents"]
            counts["skills"] += child_counts["skills"]
            counts["plugins"] += child_counts["plugins"]
            counts["children"] += child_counts["children"]
            counts["tasks"] += child_counts["tasks"]

        return counts

    def aggregate_subtask_results(self) -> Dict[str, Any]:
        """Aggrega i risultati di tutti i subtask completati.

        Returns:
            Dizionario con risultati aggregati

        Example:
            root = UltraTask(name="Root")
            sub1 = root.spawn_subtask("Sub1")
            sub1.update_status(TaskStatus.COMPLETED)
            sub1.result = {"files": 5}

            sub2 = root.spawn_subtask("Sub2")
            sub2.update_status(TaskStatus.COMPLETED)
            sub2.result = {"files": 3}

            aggregated = root.aggregate_subtask_results()
            # {"completed": 2, "failed": 0, "results": {"Sub1": {...}, "Sub2": {...}}}
        """
        completed = 0
        failed = 0
        results: Dict[str, Any] = {}

        for child in self.children:
            if child.status == TaskStatus.COMPLETED:
                completed += 1
                results[child.name] = child.result
            elif child.status == TaskStatus.FAILED:
                failed += 1
                results[child.name] = {"error": child.error}

            # Aggrega ricorsivamente
            child_agg = child.aggregate_subtask_results()
            completed += child_agg["completed"]
            failed += child_agg["failed"]
            results.update(child_agg["results"])

        return {
            "completed": completed,
            "failed": failed,
            "results": results,
        }

    def find_task_by_id(self, task_id: str) -> Optional["UltraTask"]:
        """Cerca un task per ID nell'albero.

        Args:
            task_id: ID del task da cercare

        Returns:
            Il task trovato o None

        Example:
            root = UltraTask(name="Root")
            sub = root.spawn_subtask("Sub")

            found = root.find_task_by_id(sub.task_id)  # sub
            not_found = root.find_task_by_id("invalid")  # None
        """
        if self.task_id == task_id:
            return self

        for child in self.children:
            found = child.find_task_by_id(task_id)
            if found:
                return found

        return None

    def __repr__(self) -> str:
        """Rappresentazione stringa del task."""
        return (
            f"UltraTask(id={self.task_id}, name={self.name!r}, "
            f"depth={self.depth}, status={self.status.value}, "
            f"children={len(self.children)})"
        )


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Enum
    "TaskStatus",
    "TaskPriority",
    # Config
    "AgentConfig",
    "SkillConfig",
    "PluginConfig",
    # Task
    "UltraTask",
]
