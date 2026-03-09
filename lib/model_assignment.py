"""Dynamic Model Assignment System for Orchestrator V15.1.

Assegna dinamicamente il modello IA appropriato basandosi sulla complessita del task.
Integrato con AdaptiveTokenBudget per analisi complessita ottimizzata.

Features:
- Analisi complessita task (simple/medium/complex/very_complex)
- Assegnazione modello appropriato (haiku/sonnet/opus)
- Supporto override manuale
- Storicizzazione assegnazioni
- Integrazione con AdaptiveTokenBudget

Usage:
    assigner = DynamicModelAssigner()
    model = assigner.assign_model("refactor authentication module")
    # Returns: "sonnet" or "opus" based on complexity
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional
import time


class TaskComplexity(Enum):
    """Livelli di complessita del task."""
    SIMPLE = "simple"
    MEDIUM = "medium"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class TaskLevel(Enum):
    """Livelli di nesting del task."""
    TASK = "task"
    SUBTASK = "subtask"
    SUBSUBTASK = "subsubtask"


@dataclass
class AssignmentRecord:
    """Record di un'assegnazione modello effettuata.

    Attributes:
        task: Descrizione del task
        complexity: Livello di complessita calcolato
        model: Modello assegnato
        level: Livello task (task/subtask/subsubtask)
        estimated_tokens: Token stimati
        timestamp: Unix timestamp
        overridden: Se l'assegnazione e stata sovrascritta manualmente
    """
    task: str
    complexity: TaskComplexity
    model: str
    level: str
    estimated_tokens: int
    timestamp: float
    overridden: bool = False

    def to_dict(self) -> Dict[str, object]:
        """Converte in dizionario per serializzazione."""
        return {
            "task": self.task[:100],  # Truncate for storage
            "complexity": self.complexity.value,
            "model": self.model,
            "level": self.level,
            "estimated_tokens": self.estimated_tokens,
            "timestamp": self.timestamp,
            "overridden": self.overridden,
        }


@dataclass
class TaskAnalysisResult:
    """Risultato analisi complessita task.

    Attributes:
        complexity: Livello di complessita
        estimated_tokens: Token stimati
        file_count: Numero di file coinvolti
        dependency_count: Numero di dipendenze
        security_relevant: Se il task coinvolge sicurezza
    """
    complexity: TaskComplexity
    estimated_tokens: int
    file_count: int = 0
    dependency_count: int = 0
    security_relevant: bool = False


class TaskAnalyzer:
    """Analizza la complessita di un task.

    Utilizza euristiche e pattern matching per determinare:
    - Livello di complessita
    - Token stimati
    - Numero di dipendenze
    """

    # Soglie token per complessita
    TOKEN_THRESHOLDS = {
        TaskComplexity.SIMPLE: 1000,
        TaskComplexity.MEDIUM: 5000,
        TaskComplexity.COMPLEX: 15000,
        TaskComplexity.VERY_COMPLEX: float('inf'),
    }

    # Keyword che indicano alta complessita
    COMPLEX_KEYWORDS = frozenset({
        "refactor", "migrate", "architecture", "redesign",
        "microservice", "distributed", "scalability", "optimize",
        "security", "auth", "encrypt", "authentication", "authorization",
    })

    # Keyword che indicano task semplici
    SIMPLE_KEYWORDS = frozenset({
        "fix", "typo", "rename", "update", "add", "remove",
        "format", "lint", "style", "comment",
    })

    def analyze_complexity(
        self,
        task_description: str,
        context: Optional[Dict[str, object]] = None,
    ) -> TaskComplexity:
        """
        Analizza la complessita di un task.

        Args:
            task_description: Descrizione del task
            context: Contesto aggiuntivo (files, dependencies, etc.)

        Returns:
            TaskComplexity calcolato
        """
        context = context or {}

        # Token stimati
        tokens = self.estimate_tokens(task_description, context)

        # Conta file e dipendenze
        file_count = self._count_files(context)
        dep_count = self.count_dependencies(task_description, context)

        # Analizza keyword
        task_lower = task_description.lower()
        complex_score = sum(1 for kw in self.COMPLEX_KEYWORDS if kw in task_lower)
        simple_score = sum(1 for kw in self.SIMPLE_KEYWORDS if kw in task_lower)

        # Calcola score complessita
        complexity_score = 0.0

        # Contributo token (0-0.4)
        if tokens > 15000:
            complexity_score += 0.4
        elif tokens > 5000:
            complexity_score += 0.3
        elif tokens > 1000:
            complexity_score += 0.2
        else:
            complexity_score += 0.1

        # Contributo file (0-0.2)
        complexity_score += min(0.2, file_count / 10 * 0.2)

        # Contributo dipendenze (0-0.2)
        complexity_score += min(0.2, dep_count / 5 * 0.2)

        # Contributo keyword (0-0.2)
        if complex_score > simple_score + 1:
            complexity_score += 0.2
        elif complex_score > 0:
            complexity_score += 0.1

        # Determina livello
        if complexity_score < 0.3:
            return TaskComplexity.SIMPLE
        elif complexity_score < 0.5:
            return TaskComplexity.MEDIUM
        elif complexity_score < 0.75:
            return TaskComplexity.COMPLEX
        else:
            return TaskComplexity.VERY_COMPLEX

    def estimate_tokens(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
    ) -> int:
        """
        Stima i token necessari per il task.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo

        Returns:
            Token stimati
        """
        context = context or {}

        # Base: lunghezza descrizione
        base_tokens = len(task.split()) * 2  # ~2 token per parola

        # Aggiungi file
        files = context.get("files", [])
        if isinstance(files, list):
            # ~100 token per file (path + context)
            base_tokens += len(files) * 100

        # Aggiungi dipendenze
        deps = context.get("dependencies", [])
        if isinstance(deps, list):
            base_tokens += len(deps) * 50

        # Moltiplicatore per keyword complesse
        task_lower = task.lower()
        if any(kw in task_lower for kw in self.COMPLEX_KEYWORDS):
            base_tokens = int(base_tokens * 1.5)

        return base_tokens

    def count_dependencies(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
    ) -> int:
        """
        Conta le dipendenze del task.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo

        Returns:
            Numero di dipendenze
        """
        context = context or {}
        count = 0

        # Dipendenze esplicite nel context
        deps = context.get("dependencies", [])
        if isinstance(deps, list):
            count += len(deps)

        # Indicatori nel testo
        task_lower = task.lower()
        dependency_indicators = [
            "import", "require", "depends", "integrat",
            "connect", "api", "service", "module",
        ]
        for indicator in dependency_indicators:
            if indicator in task_lower:
                count += 1

        return count

    def _count_files(self, context: Dict[str, object]) -> int:
        """Conta i file nel context."""
        files = context.get("files", [])
        if isinstance(files, list):
            return len(files)
        return 0

    def is_security_relevant(self, task: str) -> bool:
        """
        Verifica se il task coinvolge la sicurezza.

        Args:
            task: Descrizione del task

        Returns:
            True se security-relevant
        """
        task_lower = task.lower()
        security_keywords = {
            "security", "auth", "encrypt", "decrypt",
            "password", "token", "jwt", "oauth", "credential",
            "secret", "key", "ssl", "tls", "certificate",
        }
        return any(kw in task_lower for kw in security_keywords)


class ModelAssignmentStrategy:
    """Strategia di assegnazione modello basata su complessita.

    Regole di assegnazione:
    - Simple (< 1000 tokens) -> haiku
    - Medium (1000-5000 tokens) -> haiku
    - Complex (5000-15000 tokens) -> sonnet
    - Very complex (> 15000 tokens, multi-file, security) -> opus
    """

    # Mapping complessita -> modello
    COMPLEXITY_MODEL_MAP = {
        TaskComplexity.SIMPLE: "haiku",
        TaskComplexity.MEDIUM: "haiku",
        TaskComplexity.COMPLEX: "sonnet",
        TaskComplexity.VERY_COMPLEX: "opus",
    }

    # Override per security
    SECURITY_MODEL_MAP = {
        TaskComplexity.SIMPLE: "haiku",
        TaskComplexity.MEDIUM: "sonnet",
        TaskComplexity.COMPLEX: "opus",
        TaskComplexity.VERY_COMPLEX: "opus",
    }

    def __init__(self, default_model: str = "haiku"):
        """
        Inizializza la strategia.

        Args:
            default_model: Modello di default per casi non mappati
        """
        self.default_model = default_model

    def assign(self, complexity: TaskComplexity) -> str:
        """
        Assegna il modello per un livello di complessita.

        Args:
            complexity: Livello di complessita

        Returns:
            Nome del modello
        """
        return self.COMPLEXITY_MODEL_MAP.get(complexity, self.default_model)

    def assign_with_security(
        self,
        complexity: TaskComplexity,
        security_relevant: bool = False,
    ) -> str:
        """
        Assegna modello considerando security.

        Args:
            complexity: Livello di complessita
            security_relevant: Se il task coinvolge sicurezza

        Returns:
            Nome del modello
        """
        if security_relevant:
            return self.SECURITY_MODEL_MAP.get(complexity, self.default_model)
        return self.assign(complexity)

    def get_model_for_task(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
        analyzer: Optional[TaskAnalyzer] = None,
    ) -> str:
        """
        Determina il modello per un task completo.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo
            analyzer: TaskAnalyzer da utilizzare (default: nuovo)

        Returns:
            Nome del modello
        """
        analyzer = analyzer or TaskAnalyzer()
        complexity = analyzer.analyze_complexity(task, context)
        security = analyzer.is_security_relevant(task)
        return self.assign_with_security(complexity, security)

    def get_model_for_subtask(
        self,
        parent_task: str,
        subtask: str,
        parent_model: Optional[str] = None,
    ) -> str:
        """
        Determina il modello per un subtask.

        I subtask ereditano o scalano down dal parent.

        Args:
            parent_task: Descrizione task parent
            subtask: Descrizione subtask
            parent_model: Modello assegnato al parent

        Returns:
            Nome del modello per il subtask
        """
        analyzer = TaskAnalyzer()

        # Analizza subtask
        subtask_complexity = analyzer.analyze_complexity(subtask)

        # Se parent e opus, subtask puo essere sonnet o haiku
        if parent_model == "opus":
            if subtask_complexity == TaskComplexity.VERY_COMPLEX:
                return "opus"
            return "sonnet"

        # Se parent e sonnet, subtask e haiku o sonnet
        if parent_model == "sonnet":
            if subtask_complexity in (TaskComplexity.COMPLEX, TaskComplexity.VERY_COMPLEX):
                return "sonnet"
            return "haiku"

        # Se parent e haiku, subtask e sempre haiku
        return "haiku"

    def get_model_for_subsubtask(
        self,
        parent: str,
        subtask: str,
        subsubtask: str,
    ) -> str:
        """
        Determina il modello per un sub-subtask.

        I sub-subtask sono sempre haiku salvo escalation.

        Args:
            parent: Task parent
            subtask: Subtask
            subsubtask: Sub-subtask

        Returns:
            "haiku" (sempre)
        """
        # Sub-subtask sempre haiku per efficienza
        return "haiku"


class DynamicModelAssigner:
    """Orchestrator per assegnazione dinamica modello.

    Integra TaskAnalyzer e ModelAssignmentStrategy con:
    - Supporto override manuale
    - Storico assegnazioni
    - Integrazione AdaptiveTokenBudget
    """

    def __init__(
        self,
        budget_calculator: Optional[object] = None,
        strategy: Optional[ModelAssignmentStrategy] = None,
        analyzer: Optional[TaskAnalyzer] = None,
        max_history: int = 100,
    ):
        """
        Inizializza l'assigner.

        Args:
            budget_calculator: AdaptiveTokenBudget instance (lazy load se None)
            strategy: ModelAssignmentStrategy (default: nuovo)
            analyzer: TaskAnalyzer (default: nuovo)
            max_history: Dimensione massima storico
        """
        self._budget_calculator = budget_calculator
        self.strategy = strategy or ModelAssignmentStrategy()
        self.analyzer = analyzer or TaskAnalyzer()
        self._history: List[AssignmentRecord] = []
        self._max_history = max_history
        self._overrides: Dict[str, str] = {}  # task_hash -> model

    @property
    def budget_calculator(self) -> object:
        """Lazy load di AdaptiveTokenBudget."""
        if self._budget_calculator is None:
            from lib.adaptive_budget import get_budget_calculator
            self._budget_calculator = get_budget_calculator()
        return self._budget_calculator

    def assign_model(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
        level: str = "task",
        override: Optional[str] = None,
    ) -> str:
        """
        Assegna il modello per un task.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo
            level: Livello task (task/subtask/subsubtask)
            override: Modello forzato (bypass analisi)

        Returns:
            Nome del modello assegnato
        """
        context = context or {}

        # Check override manuale
        if override:
            model = override
            complexity = TaskComplexity.SIMPLE  # Default per override
            estimated_tokens = 0
            is_overridden = True
        else:
            # Analizza complessita
            complexity = self.analyzer.analyze_complexity(task, context)
            estimated_tokens = self.analyzer.estimate_tokens(task, context)
            security = self.analyzer.is_security_relevant(task)

            # Assegna modello
            model = self.strategy.assign_with_security(complexity, security)
            is_overridden = False

        # Registra assegnazione
        record = AssignmentRecord(
            task=task,
            complexity=complexity,
            model=model,
            level=level,
            estimated_tokens=estimated_tokens,
            timestamp=time.time(),
            overridden=is_overridden,
        )
        self._add_to_history(record)

        return model

    def assign_for_level(
        self,
        task: str,
        level: TaskLevel,
        context: Optional[Dict[str, object]] = None,
        parent_model: Optional[str] = None,
    ) -> str:
        """
        Assegna modello considerando il livello di nesting.

        Args:
            task: Descrizione task
            level: Livello (TASK/SUBTASK/SUBSUBTASK)
            context: Contesto aggiuntivo
            parent_model: Modello del task parent

        Returns:
            Nome del modello
        """
        if level == TaskLevel.TASK:
            return self.assign_model(task, context, level="task")
        elif level == TaskLevel.SUBTASK:
            if parent_model:
                return self.strategy.get_model_for_subtask(
                    "", task, parent_model
                )
            return self.assign_model(task, context, level="subtask")
        else:  # SUBSUBTASK
            return "haiku"

    def get_assignment_history(self) -> List[AssignmentRecord]:
        """
        Ottiene lo storico delle assegnazioni.

        Returns:
            Lista di AssignmentRecord (piu recenti prima)
        """
        return list(reversed(self._history))

    def get_recent_assignments(self, count: int = 10) -> List[Dict[str, object]]:
        """
        Ottiene le ultime N assegnazioni come dict.

        Args:
            count: Numero di assegnazioni

        Returns:
            Lista di dict con assegnazioni
        """
        recent = self._history[-count:] if self._history else []
        return [r.to_dict() for r in reversed(recent)]

    def set_override(self, task_pattern: str, model: str) -> None:
        """
        Imposta override per task matching pattern.

        Args:
            task_pattern: Pattern da matchare (substring)
            model: Modello da usare
        """
        self._overrides[task_pattern] = model

    def clear_override(self, task_pattern: str) -> bool:
        """
        Rimuove un override.

        Args:
            task_pattern: Pattern da rimuovere

        Returns:
            True se rimosso, False se non esisteva
        """
        if task_pattern in self._overrides:
            del self._overrides[task_pattern]
            return True
        return False

    def get_stats(self) -> Dict[str, object]:
        """
        Ottiene statistiche sulle assegnazioni.

        Returns:
            Dict con statistiche
        """
        if not self._history:
            return {
                "total_assignments": 0,
                "model_distribution": {},
                "complexity_distribution": {},
                "override_count": 0,
            }

        model_counts: Dict[str, int] = {}
        complexity_counts: Dict[str, int] = {}
        override_count = 0

        for record in self._history:
            model_counts[record.model] = model_counts.get(record.model, 0) + 1
            complexity_counts[record.complexity.value] = (
                complexity_counts.get(record.complexity.value, 0) + 1
            )
            if record.overridden:
                override_count += 1

        return {
            "total_assignments": len(self._history),
            "model_distribution": model_counts,
            "complexity_distribution": complexity_counts,
            "override_count": override_count,
            "active_overrides": len(self._overrides),
        }

    def clear_history(self) -> int:
        """
        Pulisce lo storico delle assegnazioni.

        Returns:
            Numero di record rimossi
        """
        count = len(self._history)
        self._history.clear()
        return count

    def _add_to_history(self, record: AssignmentRecord) -> None:
        """Aggiunge record allo storico con LRU eviction."""
        self._history.append(record)
        # LRU eviction se supera limite
        while len(self._history) > self._max_history:
            self._history.pop(0)


# Istanza globale per uso diretto
_assigner: Optional[DynamicModelAssigner] = None


def get_model_assigner() -> DynamicModelAssigner:
    """
    Singleton accessor per DynamicModelAssigner.

    Returns:
        Istanza singleton di DynamicModelAssigner
    """
    global _assigner
    if _assigner is None:
        _assigner = DynamicModelAssigner()
    return _assigner


def assign_model(
    task: str,
    context: Optional[Dict[str, object]] = None,
    level: str = "task",
) -> str:
    """
    Funzione convenience per assegnazione rapida.

    Args:
        task: Descrizione del task
        context: Contesto aggiuntivo
        level: Livello task

    Returns:
        Nome del modello assegnato
    """
    return get_model_assigner().assign_model(task, context, level)
