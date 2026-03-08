"""Adaptive Token Budget System for Orchestrator V14.0.3.

Calcola budget token dinamico basato su complessità del task.
Integrato con RuleExcerptManager per ottimizzazione automatica.

Features:
- Soglie configurabili e adattive
- Rule budget dinamico (20-60%)
- BudgetCache con TTL 5min e LRU eviction
- AI-Native Orchestrator support
"""
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
import hashlib
import re
import threading
import time

from lib.rule_excerpts import RuleExcerptManager, EXCERPT_CATEGORIES


# Costanti per range budget
MIN_BUDGET = 200
MAX_BUDGET = 1500
DEFAULT_BUDGET = 500

# Soglie complessità (mantenute per backward compatibility)
COMPLEXITY_SIMPLE = 0.3      # 0.0-0.3: 200-400 token
COMPLEXITY_MEDIUM = 0.6      # 0.3-0.6: 400-800 token
COMPLEXITY_COMPLEX = 0.8     # 0.6-0.8: 800-1200 token
# 0.8-1.0: 1200-1500 token

# Pesi per fattori di complessità
WEIGHT_KEYWORDS = 0.30
WEIGHT_DEPENDENCIES = 0.25
WEIGHT_AGENTS = 0.25
WEIGHT_FILES = 0.20

# Precompiled regex patterns for performance (V14.0.1)
# Compilati una volta all'import invece di ricompilare ad ogni ricerca
_COMPILED_DEPENDENCY_PATTERNS = tuple(
    re.compile(p) for p in [
        r"import\s+\w+",
        r"from\s+\w+\s+import",
        r"require\s*\(\s*['\"]",
        r"use\s+\w+",
        r"depends\s+on",
        r"dependency",
        r"integrat(?:e|ion|ing)",
    ]
)

_COMPILED_AGENT_PATTERNS = tuple(
    re.compile(p) for p in [
        r"parallel",
        r"concurrent",
        r"multiple\s+agents?",
        r"orchestrat(?:e|or|ing)",
        r"coordinat(?:e|ing)",
        r"delegat(?:e|ing)",
        r"subagent",
        r"multi-agent",
    ]
)

_COMPILED_COMPLEX_TASK_PATTERNS = tuple(
    re.compile(p) for p in [
        r"refactor",
        r"migrate?",
        r"architect(?:ure)?",
        r"design\s+pattern",
        r"security\s+audit",
        r"performance\s+optimiz",
        r"full-stack",
        r"end-to-end",
        r"microservice",
        r"distributed",
    ]
)

# Pattern originali mantenuti per backward compatibility e documentazione
DEPENDENCY_PATTERNS = [
    r"import\s+\w+",
    r"from\s+\w+\s+import",
    r"require\s*\(\s*['\"]",
    r"use\s+\w+",
    r"depends\s+on",
    r"dependency",
    r"integrat(?:e|ion|ing)",
]

# Pattern per rilevamento agenti multipli
AGENT_PATTERNS = [
    r"parallel",
    r"concurrent",
    r"multiple\s+agents?",
    r"orchestrat(?:e|or|ing)",
    r"coordinat(?:e|ing)",
    r"delegat(?:e|ing)",
    r"subagent",
    r"multi-agent",
]

# Pattern per task complessi
COMPLEX_TASK_PATTERNS = [
    r"refactor",
    r"migrate?",
    r"architect(?:ure)?",
    r"design\s+pattern",
    r"security\s+audit",
    r"performance\s+optimiz",
    r"full-stack",
    r"end-to-end",
    r"microservice",
    r"distributed",
]


@dataclass
class TokenBudget:
    """
    Budget token calcolato per un task.

    Attributes:
        base_tokens: Token base iniziali
        complexity_multiplier: Moltiplicatore basato su complessità
        final_budget: Budget finale calcolato
        factors: Fattori di complessità individuali
        rule_budget_percentage: Percentuale allocata per regole (V14.1)
    """
    base_tokens: int
    complexity_multiplier: float
    final_budget: int
    factors: Dict[str, float] = field(default_factory=dict)
    rule_budget_percentage: float = 0.4  # Default 40%

    def to_dict(self) -> Dict[str, object]:
        """Converte in dizionario per serializzazione."""
        return {
            "base_tokens": self.base_tokens,
            "complexity_multiplier": self.complexity_multiplier,
            "final_budget": self.final_budget,
            "factors": self.factors,
            "rule_budget_percentage": self.rule_budget_percentage,
        }


class BudgetCache:
    """
    Cache per TokenBudget calcolati con TTL e LRU eviction.

    Memorizza i budget calcolati per evitare ricalcolo su task simili.
    Utilizza hash del task + context per identificare pattern.

    V14.2.0 - Performance optimization per AgentSelector.

    Attributes:
        max_size: Dimensione massima cache (default 100)
        ttl_seconds: Time-to-live in secondi (default 300 = 5 minuti)
    """

    def __init__(self, max_size: int = 100, ttl_seconds: float = 300.0):
        """
        Inizializza la cache.

        Args:
            max_size: Numero massimo di entry (LRU eviction quando pieno)
            ttl_seconds: TTL in secondi (default 5 minuti)
        """
        self._cache: OrderedDict[str, Tuple[TokenBudget, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = threading.RLock()
        # Metriche per monitoraggio
        self._hits = 0
        self._misses = 0

    def _make_key(self, task: str, context_keys: frozenset) -> str:
        """
        Crea chiave cache da task e context.

        Args:
            task: Descrizione del task
            context_keys: Chiavi del context (frozenset per hashabilita)

        Returns:
            Chiave hash per la cache
        """
        # Hash del task (primi 50 char per stabilita)
        task_hash = hashlib.md5(task[:50].encode('utf-8'), usedforsecurity=False).hexdigest()[:16]
        # Hash del context keys
        context_hash = hashlib.md5(
            str(sorted(context_keys)).encode('utf-8'),
            usedforsecurity=False
        ).hexdigest()[:8]
        return f"{task_hash}_{context_hash}"

    def get(self, task: str, context_keys: frozenset) -> Optional[TokenBudget]:
        """
        Ottiene budget dalla cache se valido.

        Args:
            task: Descrizione del task
            context_keys: Chiavi del context

        Returns:
            TokenBudget se in cache e non scaduto, None altrimenti
        """
        key = self._make_key(task, context_keys)
        with self._lock:
            if key in self._cache:
                budget, created = self._cache[key]
                # Verifica TTL
                if time.time() - created < self._ttl:
                    # Move to end per LRU
                    self._cache.move_to_end(key)
                    self._hits += 1
                    return budget
                else:
                    # Scaduto, rimuovi
                    del self._cache[key]
                    self._misses += 1
            else:
                self._misses += 1
        return None

    def set(self, task: str, context_keys: frozenset, budget: TokenBudget) -> None:
        """
        Memorizza budget in cache.

        Args:
            task: Descrizione del task
            context_keys: Chiavi del context
            budget: Budget calcolato da memorizzare
        """
        key = self._make_key(task, context_keys)
        with self._lock:
            # LRU eviction se pieno
            if len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)  # Rimuovi il piu vecchio
            self._cache[key] = (budget, time.time())

    def clear(self) -> None:
        """Pulisce tutta la cache."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def get_stats(self) -> Dict[str, object]:
        """
        Ottiene statistiche della cache.

        Returns:
            Dizionario con hits, misses, size, hit_rate
        """
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0.0
            return {
                "hits": self._hits,
                "misses": self._misses,
                "size": len(self._cache),
                "max_size": self._max_size,
                "hit_rate": round(hit_rate, 3),
                "ttl_seconds": self._ttl,
            }

    def cleanup_expired(self) -> int:
        """
        Rimuove entry scadute dalla cache.

        Returns:
            Numero di entry rimosse
        """
        removed = 0
        current_time = time.time()
        with self._lock:
            keys_to_remove = [
                key for key, (_, created) in self._cache.items()
                if current_time - created >= self._ttl
            ]
            for key in keys_to_remove:
                del self._cache[key]
                removed += 1
        return removed


@dataclass
class ComplexityThresholds:
    """
    Soglie di complessità configurabili e adattive (V14.1).

    Le soglie si adattano automaticamente alla distribuzione storica
    dei punteggi di complessità per una migliore segmentazione.

    Attributes:
        simple: Soglia per task semplici (default 0.3)
        medium: Soglia per task medi (default 0.6)
        complex: Soglia per task complessi (default 0.8)
        auto_adjust: Se True, adatta soglie alla distribuzione storica
        min_samples_for_adjust: Campioni minimi per auto-aggiustamento
        adjustment_rate: Tasso di aggiustamento (0.1 = 10% per update)
    """
    simple: float = 0.3
    medium: float = 0.6
    complex: float = 0.8

    # Parametri adattivi
    auto_adjust: bool = True
    min_samples_for_adjust: int = 100
    adjustment_rate: float = 0.1

    def update_from_distribution(self, complexity_scores: List[float]) -> None:
        """
        Aggiusta soglie basandosi sulla distribuzione storica.

        Args:
            complexity_scores: Lista storica dei punteggi di complessità
        """
        if not self.auto_adjust or len(complexity_scores) < self.min_samples_for_adjust:
            return

        # Calcola percentili dalla distribuzione
        sorted_scores = sorted(complexity_scores)
        n = len(sorted_scores)

        # Nuove soglie basate su percentili
        new_simple = sorted_scores[int(n * 0.25)]  # 25th percentile
        new_medium = sorted_scores[int(n * 0.50)]  # 50th percentile (mediana)
        new_complex = sorted_scores[int(n * 0.75)]  # 75th percentile

        # Aggiustamento graduale (EMA-like)
        self.simple = self.simple * (1 - self.adjustment_rate) + new_simple * self.adjustment_rate
        self.medium = self.medium * (1 - self.adjustment_rate) + new_medium * self.adjustment_rate
        self.complex = self.complex * (1 - self.adjustment_rate) + new_complex * self.adjustment_rate

        # Assicura ordinamento corretto: simple < medium < complex
        if self.simple >= self.medium:
            self.medium = self.simple + 0.1
        if self.medium >= self.complex:
            self.complex = self.medium + 0.1

    def to_dict(self) -> Dict[str, object]:
        """Converte in dizionario per serializzazione."""
        return {
            "simple": round(self.simple, 3),
            "medium": round(self.medium, 3),
            "complex": round(self.complex, 3),
            "auto_adjust": self.auto_adjust,
            "min_samples_for_adjust": self.min_samples_for_adjust,
            "adjustment_rate": self.adjustment_rate,
        }


@dataclass
class RuleBudgetConfig:
    """
    Configurazione per rule budget dinamico (V14.1).

    Calcola la percentuale di budget da allocare per le regole
    in base alle caratteristiche del task.

    Attributes:
        min_percentage: Percentuale minima (default 20%)
        max_percentage: Percentuale massima (default 60%)
        base_percentage: Percentuale base (default 35%)
        keyword_density_weight: Bonus per alta densità keyword
        security_domain_weight: Bonus per task di sicurezza
        new_project_weight: Bonus per progetti senza memoria
    """
    min_percentage: float = 0.2   # Min 20%
    max_percentage: float = 0.6   # Max 60%
    base_percentage: float = 0.35  # Base 35%

    # Fattori moltiplicativi
    keyword_density_weight: float = 0.1   # +10% per alta densità keyword
    security_domain_weight: float = 0.15  # +15% per security tasks
    new_project_weight: float = 0.1       # +10% per nuovi progetti

    def to_dict(self) -> Dict[str, object]:
        """Converte in dizionario per serializzazione."""
        return {
            "min_percentage": self.min_percentage,
            "max_percentage": self.max_percentage,
            "base_percentage": self.base_percentage,
            "keyword_density_weight": self.keyword_density_weight,
            "security_domain_weight": self.security_domain_weight,
            "new_project_weight": self.new_project_weight,
        }


class AdaptiveTokenBudget:
    """
    Calcola budget token adattivo basato su complessità del task.

    Il budget varia da 200 a 1500 token in base a:
    - Numero di keyword rilevanti nel task
    - Profondità delle dipendenze
    - Numero di agenti coinvolti
    - Numero di file da elaborare

    V14.2 Features:
    - BudgetCache per evitare ricalcolo su task simili

    V14.1 Features:
    - Soglie di complessità configurabili e adattive
    - Rule budget dinamico invece di 40% fisso

    Usage:
        budget_calc = AdaptiveTokenBudget()
        budget = budget_calc.calculate_budget(
            "refactor authentication module with JWT",
            {"files": ["auth.py", "jwt_handler.py"]}
        )
        print(budget.final_budget)  # es: 850
    """

    def __init__(
        self,
        min_budget: int = MIN_BUDGET,
        max_budget: int = MAX_BUDGET,
        default_budget: int = DEFAULT_BUDGET,
        thresholds: Optional[ComplexityThresholds] = None,
        rule_config: Optional[RuleBudgetConfig] = None,
        cache_size: int = 100,
        cache_ttl_seconds: float = 300.0,
    ) -> None:
        """
        Inizializza il calcolatore di budget.

        Args:
            min_budget: Budget minimo (default 200)
            max_budget: Budget massimo (default 1500)
            default_budget: Budget di default (default 500)
            thresholds: Soglie di complessità configurabili (V14.1)
            rule_config: Configurazione rule budget dinamico (V14.1)
            cache_size: Dimensione cache (default 100) - V14.2
            cache_ttl_seconds: TTL cache in secondi (default 300) - V14.2
        """
        self.min_budget = min_budget
        self.max_budget = max_budget
        self.default_budget = default_budget
        self.thresholds = thresholds or ComplexityThresholds()
        self.rule_config = rule_config or RuleBudgetConfig()
        self._rule_manager: Optional[RuleExcerptManager] = None
        self._complexity_history: List[float] = []  # Per adattamento soglie
        # V14.2: Budget cache
        self._cache = BudgetCache(max_size=cache_size, ttl_seconds=cache_ttl_seconds)

    @property
    def rule_manager(self) -> RuleExcerptManager:
        """Lazy load del RuleExcerptManager."""
        if self._rule_manager is None:
            self._rule_manager = RuleExcerptManager()
        return self._rule_manager

    def calculate_budget(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
        use_cache: bool = True,
    ) -> TokenBudget:
        """
        Calcola il budget token ottimale per il task.

        V14.2: Utilizza cache per evitare ricalcolo su task simili.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo (files, agents, dependencies)
            use_cache: Se True, utilizza cache (default True)

        Returns:
            TokenBudget con budget calcolato e fattori
        """
        context = context or {}

        # V14.2: Check cache first
        if use_cache:
            context_keys = frozenset(context.keys()) if context else frozenset()
            cached = self._cache.get(task, context_keys)
            if cached is not None:
                return cached

        # Calcola complessità (0.0 - 1.0)
        complexity = self._assess_complexity(task, context)

        # Calcola moltiplicatore (1.0 - 7.5x)
        # 0.0 -> 1.0x, 1.0 -> 7.5x
        complexity_multiplier = 1.0 + (complexity * 6.5)

        # Calcola budget finale
        base = self.default_budget
        final_budget = int(base * complexity_multiplier)

        # Clamp ai limiti
        final_budget = max(self.min_budget, min(self.max_budget, final_budget))

        # Calcola rule budget percentage dinamico (V14.1)
        rule_budget_percentage = self.calculate_rule_budget_percentage(task, context)

        # Raccogli fattori per debug/logging
        factors = {
            "keyword_score": self._count_keywords(task),
            "dependency_score": self._check_dependencies(task, context),
            "agent_score": self._estimate_agents(task, context),
            "file_score": self._count_files(context),
            "complexity_raw": complexity,
        }

        # Aggiungi complessità alla storia per adattamento soglie (V14.1)
        self._complexity_history.append(complexity)
        # Limita dimensione storia per memoria
        if len(self._complexity_history) > 1000:
            self._complexity_history = self._complexity_history[-1000:]

        # Adatta soglie periodicamente (V14.1)
        if len(self._complexity_history) >= self.thresholds.min_samples_for_adjust:
            self.thresholds.update_from_distribution(self._complexity_history)

        budget = TokenBudget(
            base_tokens=base,
            complexity_multiplier=round(complexity_multiplier, 2),
            final_budget=final_budget,
            factors=factors,
            rule_budget_percentage=rule_budget_percentage,
        )

        # V14.2: Memorizza in cache
        if use_cache:
            context_keys = frozenset(context.keys()) if context else frozenset()
            self._cache.set(task, context_keys, budget)

        return budget

    def _assess_complexity(
        self,
        task: str,
        context: Dict[str, object],
    ) -> float:
        """
        Valuta la complessità del task.

        Returns:
            Score di complessità tra 0.0 e 1.0
        """
        # Calcola singoli fattori normalizzati (0.0 - 1.0)
        keyword_score = self._count_keywords(task)
        dependency_score = self._check_dependencies(task, context)
        agent_score = self._estimate_agents(task, context)
        file_score = self._count_files(context)

        # Media ponderata
        complexity = (
            keyword_score * WEIGHT_KEYWORDS +
            dependency_score * WEIGHT_DEPENDENCIES +
            agent_score * WEIGHT_AGENTS +
            file_score * WEIGHT_FILES
        )

        # Bonus per task intrinsecamente complessi (usa regex precompilate)
        task_lower = task.lower()
        for pattern in _COMPILED_COMPLEX_TASK_PATTERNS:
            if pattern.search(task_lower):
                complexity = min(1.0, complexity + 0.15)
                break

        return round(complexity, 3)

    def _count_keywords(self, task: str) -> float:
        """
        Conta keyword rilevanti nel task.

        Più keyword = più contesto necessario.

        Returns:
            Score normalizzato 0.0 - 1.0
        """
        task_lower = task.lower()
        keyword_count = 0

        # Conta keyword da tutte le categorie
        for keywords in EXCERPT_CATEGORIES.values():
            for keyword in keywords:
                if keyword in task_lower:
                    keyword_count += 1

        # Normalizza: ~15 keyword = score 1.0
        return min(1.0, keyword_count / 15.0)

    def _check_dependencies(
        self,
        task: str,
        context: Dict[str, object],
    ) -> float:
        """
        Valuta profondità dipendenze.

        Più dipendenze = più token per regole e contesto.

        Returns:
            Score normalizzato 0.0 - 1.0
        """
        task_lower = task.lower()
        dependency_matches = 0

        # Conta pattern di dipendenza nel task (usa regex precompilate)
        for pattern in _COMPILED_DEPENDENCY_PATTERNS:
            if pattern.search(task_lower):
                dependency_matches += 1

        # Conta dipendenze esplicite nel contesto
        explicit_deps = context.get("dependencies", [])
        if isinstance(explicit_deps, list):
            dependency_matches += len(explicit_deps)

        # Normalizza: ~10 dipendenze = score 1.0
        return min(1.0, dependency_matches / 10.0)

    def _estimate_agents(
        self,
        task: str,
        context: Dict[str, object],
    ) -> float:
        """
        Stima numero di agenti coinvolti.

        Più agenti = più token per coordinamento.

        Returns:
            Score normalizzato 0.0 - 1.0
        """
        task_lower = task.lower()
        agent_indicators = 0

        # Conta indicatori di multi-agent (usa regex precompilate)
        for pattern in _COMPILED_AGENT_PATTERNS:
            if pattern.search(task_lower):
                agent_indicators += 1

        # Conta agenti espliciti nel contesto
        explicit_agents = context.get("agents", [])
        if isinstance(explicit_agents, list):
            agent_indicators += len(explicit_agents)

        # Conta file multipli (probabile multi-agent)
        files = context.get("files", [])
        if isinstance(files, list) and len(files) > 3:
            agent_indicators += 1

        # Normalizza: ~5 indicatori = score 1.0
        return min(1.0, agent_indicators / 5.0)

    def _count_files(self, context: Dict[str, object]) -> float:
        """
        Conta file da elaborare.

        Più file = più contesto necessario.

        Returns:
            Score normalizzato 0.0 - 1.0
        """
        files = context.get("files", [])
        if not isinstance(files, list):
            return 0.0

        file_count = len(files)

        # Normalizza: ~8 file = score 1.0
        return min(1.0, file_count / 8.0)

    def get_complexity_tier(self, complexity: float) -> str:
        """
        Ritorna la fascia di complessità usando soglie configurabili (V14.1).

        Args:
            complexity: Score di complessità (0.0 - 1.0)

        Returns:
            Fascia: "simple", "medium", "complex", "very_complex"
        """
        # Usa soglie configurabili invece di costanti hardcoded
        if complexity < self.thresholds.simple:
            return "simple"
        elif complexity < self.thresholds.medium:
            return "medium"
        elif complexity < self.thresholds.complex:
            return "complex"
        else:
            return "very_complex"

    def get_budget_for_tier(self, tier: str) -> int:
        """
        Ritorna il budget tipico per una fascia.

        Args:
            tier: Fascia di complessità

        Returns:
            Budget in token
        """
        tier_budgets = {
            "simple": 300,       # 200-400 range
            "medium": 600,       # 400-800 range
            "complex": 1000,     # 800-1200 range
            "very_complex": 1350, # 1200-1500 range
        }
        return tier_budgets.get(tier, self.default_budget)

    def calculate_rule_budget_percentage(
        self,
        task: str,
        context: Optional[Dict[str, object]] = None,
        config: Optional[RuleBudgetConfig] = None,
    ) -> float:
        """
        Calcola percentuale dinamica per rule budget (V14.1).

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo (opzionale)
            config: Configurazione rule budget (default: self.rule_config)

        Returns:
            Percentuale tra min_percentage e max_percentage
        """
        config = config or self.rule_config
        context = context or {}
        base = config.base_percentage

        # Keyword density: +bonus se molte keyword rilevanti
        keyword_count = 0
        task_lower = task.lower()
        for keywords in EXCERPT_CATEGORIES.values():
            for keyword in keywords:
                if keyword in task_lower:
                    keyword_count += 1

        if keyword_count > 5:
            base += config.keyword_density_weight

        # Security domain: +bonus per task di sicurezza
        security_keywords = {"security", "auth", "encrypt", "token", "password", "jwt", "oauth", "credential"}
        if any(kw in task_lower for kw in security_keywords):
            base += config.security_domain_weight

        # New project: +bonus se non c'è memoria progetto
        if not context.get("has_memory", True):
            base += config.new_project_weight

        # Clamp ai limiti configurati
        return max(config.min_percentage, min(config.max_percentage, base))

    def get_optimized_rules(
        self,
        task: str,
        budget: Optional[TokenBudget] = None,
        context: Optional[Dict[str, object]] = None,
    ) -> str:
        """
        Ritorna regole ottimizzate per il budget calcolato (V14.1).

        Args:
            task: Descrizione del task
            budget: Budget calcolato (se None, calcola automaticamente)
            context: Contesto aggiuntivo per rule budget dinamico

        Returns:
            Regole estratte entro il budget
        """
        if budget is None:
            budget = self.calculate_budget(task)

        # Calcola percentuale dinamica invece di 40% fisso
        rule_percentage = self.calculate_rule_budget_percentage(task, context)
        rule_budget = int(budget.final_budget * rule_percentage)

        return self.rule_manager.get_excerpts_for_task(
            task,
            max_tokens=rule_budget,
        )

    def get_cache_stats(self) -> Dict[str, object]:
        """
        Ottiene statistiche della cache (V14.2).

        Returns:
            Dizionario con statistiche cache
        """
        return self._cache.get_stats()

    def clear_cache(self) -> None:
        """Pulisce la cache dei budget (V14.2)."""
        self._cache.clear()

    def cleanup_cache(self) -> int:
        """
        Rimuove entry scadute dalla cache (V14.2).

        Returns:
            Numero di entry rimosse
        """
        return self._cache.cleanup_expired()


# Istanza globale per uso diretto
_budget_calculator: Optional[AdaptiveTokenBudget] = None


def get_budget_calculator() -> AdaptiveTokenBudget:
    """
    Singleton accessor per AdaptiveTokenBudget.

    Returns:
        Istanza singleton di AdaptiveTokenBudget
    """
    global _budget_calculator
    if _budget_calculator is None:
        _budget_calculator = AdaptiveTokenBudget()
    return _budget_calculator
