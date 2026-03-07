"""
Rule Excerpts System V14.0
Pre-computed rule excerpts for token-efficient loading.

Each excerpt is ~500 tokens, categorized by task type.
Reduces I/O by 70% compared to loading full rule files.

V14.0 - Budget-aware loading con priorizzazione e troncamento
V13.1.1 - Added TTL-based cache invalidation (RE-1 fix)
"""
import json
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


# Default cache TTL in seconds (5 minutes)
DEFAULT_CACHE_TTL = 300

# Priorita delle categorie di regole
PRIORITY_ORDER: Dict[str, int] = {
    "security": 0,      # CRITICAL - sempre incluso
    "database": 1,      # HIGH
    "api": 1,           # HIGH
    "testing": 2,       # MEDIUM
    "git": 2,           # MEDIUM
    "python": 3,        # LOW
    "typescript": 3,    # LOW
    "go": 3,            # LOW
    "coding-style": 4,  # BASELINE - incluso solo se spazio
}

# Minimo token per excerpt utile (sotto questa soglia non troncare)
MIN_TRUNCATED_TOKENS = 50


@dataclass
class RuleExcerpt:
    """
    Rappresenta un excerpt di regola con metadata.

    Attributes:
        category: Categoria della regola (es. security, database)
        content: Testo dell'excerpt
        priority: Priorita (0 = CRITICAL, 1 = HIGH, 2 = MEDIUM, 3 = LOW)
        token_count: Numero stimato di token
    """
    category: str
    content: str
    priority: int
    token_count: int

    @classmethod
    def from_content(cls, category: str, content: str) -> "RuleExcerpt":
        """Crea un RuleExcerpt calcolando automaticamente i token."""
        # Stima token: parole * 1.3 (ratio medio tokens/words)
        token_count = int(len(content.split()) * 1.3)
        priority = PRIORITY_ORDER.get(category, 99)
        return cls(
            category=category,
            content=content,
            priority=priority,
            token_count=token_count
        )


# Excerpt categories mapped to task types
EXCERPT_CATEGORIES: Dict[str, List[str]] = {
    "security": ["security", "auth", "encryption", "password", "token", "jwt", "credential", "secret"],
    "database": ["database", "sql", "query", "schema", "migration", "index", "orm", "table"],
    "testing": ["test", "pytest", "mock", "coverage", "unit", "e2e", "tdd", "assertion"],
    "api": ["api", "rest", "endpoint", "http", "request", "response", "graphql", "json"],
    "git": ["git", "commit", "branch", "merge", "pr", "push", "pull", "checkout"],
    "python": ["python", "py", "async", "type hint", "import", "def", "class", "module"],
    "typescript": ["typescript", "ts", "tsx", "interface", "type", "generic", "zod"],
    "go": ["golang", "go", "goroutine", "channel", "struct", "method", "interface"],
}


class RuleExcerptManager:
    """
    Manages pre-computed rule excerpts for efficient loading.

    Singleton pattern ensures single instance across the application.
    Thread-safe for concurrent access.

    Usage:
        manager = RuleExcerptManager()
        excerpts = manager.get_excerpts_for_task("add JWT authentication to API")
    """

    _instance: Optional["RuleExcerptManager"] = None
    _lock: threading.RLock = threading.RLock()

    def __new__(cls) -> "RuleExcerptManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._excerpts: Dict[str, str] = {}
        self._index: Dict[str, List[str]] = {}
        self._cache_timestamp: float = 0.0
        self._cache_ttl: int = DEFAULT_CACHE_TTL
        self._load_excerpts()

    def _load_excerpts(self) -> None:
        """Load pre-computed excerpts from index file."""
        index_path = Path(__file__).parent / "rule_excerpts_index.json"
        if index_path.exists():
            try:
                with open(index_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._excerpts = data.get("excerpts", {})
                    self._index = data.get("index", {})
                    self._cache_timestamp = time.time()
            except (json.JSONDecodeError, IOError):
                # Fallback to empty state on error
                self._excerpts = {}
                self._index = {}
                self._cache_timestamp = 0.0

    def _is_cache_valid(self) -> bool:
        """
        Check if cache is still valid based on TTL.

        Returns:
            True if cache is fresh, False if expired or never loaded
        """
        if self._cache_timestamp == 0.0:
            return False
        return (time.time() - self._cache_timestamp) < self._cache_ttl

    def _ensure_cache_valid(self) -> None:
        """Reload cache if TTL expired."""
        if not self._is_cache_valid():
            self._load_excerpts()

    def invalidate_cache(self) -> None:
        """
        Force cache invalidation.

        Next access will trigger a reload from disk.
        """
        with self._lock:
            self._cache_timestamp = 0.0
            self._excerpts = {}
            self._index = {}

    def get_excerpts_for_task(self, task_description: str, max_tokens: int = 500) -> str:
        """
        Get relevant rule excerpts based on task description.

        Args:
            task_description: The task to find relevant rules for
            max_tokens: Maximum tokens to include (default 500)

        Returns:
            Concatenated rule excerpts relevant to the task
        """
        self._ensure_cache_valid()
        task_lower = task_description.lower()
        relevant_categories: set = set()

        # Detect relevant categories from task description
        for category, keywords in EXCERPT_CATEGORIES.items():
            for keyword in keywords:
                if keyword in task_lower:
                    relevant_categories.add(category)
                    break

        # Always include coding-style (baseline rules)
        relevant_categories.add("coding-style")

        # Build excerpt string within token budget
        result_parts: List[str] = []
        current_tokens = 0

        for category in sorted(relevant_categories):
            if category in self._excerpts:
                excerpt = self._excerpts[category]
                # Rough token estimate: words * 1.3 (average tokens per word)
                excerpt_tokens = int(len(excerpt.split()) * 1.3)
                if current_tokens + excerpt_tokens <= max_tokens:
                    result_parts.append(f"---{category.upper()} RULES---")
                    result_parts.append(excerpt)
                    result_parts.append("")
                    current_tokens += excerpt_tokens

        return "\n".join(result_parts).strip()

    def get_available_categories(self) -> List[str]:
        """Return list of available excerpt categories."""
        self._ensure_cache_valid()
        return list(self._excerpts.keys())

    def get_excerpt(self, category: str) -> Optional[str]:
        """Get a specific excerpt by category."""
        self._ensure_cache_valid()
        return self._excerpts.get(category)

    def get_excerpts(
        self,
        categories: Optional[List[str]] = None,
        max_tokens: int = 500
    ) -> List[RuleExcerpt]:
        """
        Ottiene excerpt con limite di token e priorizzazione.

        Gli excerpt sono ordinati per priorita (CRITICAL > HIGH > MEDIUM > LOW)
        e inclusi finche il budget lo permette. L'ultimo excerpt puo essere
        troncato se rimane spazio sufficiente (minimo 50 token).

        Args:
            categories: Categorie da includere (None = tutte)
            max_tokens: Budget massimo in token (default 500)

        Returns:
            Lista di RuleExcerpt rispettando il budget
        """
        self._ensure_cache_valid()

        # Se categorie non specificate, usa tutte quelle disponibili
        target_categories = categories if categories else list(self._excerpts.keys())

        # Crea oggetti RuleExcerpt e ordina per priorita
        all_excerpts: List[RuleExcerpt] = []
        for category in target_categories:
            if category in self._excerpts:
                excerpt = RuleExcerpt.from_content(category, self._excerpts[category])
                all_excerpts.append(excerpt)

        # Ordina per priorita (valore piu basso = priorita piu alta)
        all_excerpts.sort(key=lambda e: e.priority)

        # Seleziona excerpt rispettando il budget
        result: List[RuleExcerpt] = []
        total_tokens = 0

        for excerpt in all_excerpts:
            if total_tokens + excerpt.token_count <= max_tokens:
                # Excerpt completo nel budget
                result.append(excerpt)
                total_tokens += excerpt.token_count
            else:
                # Budget insufficiente per excerpt completo
                remaining = max_tokens - total_tokens
                if remaining >= MIN_TRUNCATED_TOKENS:
                    # Tronca ultimo excerpt se rimane spazio utile
                    truncated = self._truncate_excerpt(excerpt, remaining)
                    if truncated:
                        result.append(truncated)
                break

        return result

    def _truncate_excerpt(self, excerpt: RuleExcerpt, max_tokens: int) -> Optional[RuleExcerpt]:
        """
        Tronca excerpt rispettando limite token.

        Il troncamento e intelligente:
        1. Taglia per righe intere (non a meta riga)
        2. Preserva le regole piu importanti (prime righe)
        3. Aggiunge indicatore di troncamento se necessario

        Args:
            excerpt: Excerpt da troncare
            max_tokens: Token massimi disponibili

        Returns:
            RuleExcerpt troncato o None se non possibile
        """
        lines = excerpt.content.split("\n")
        truncated_lines: List[str] = []
        current_tokens = 0
        max_words = int(max_tokens / 1.3)  # Converti tokens in parole

        for line in lines:
            line_words = len(line.split())
            if current_tokens + int(line_words * 1.3) <= max_tokens:
                truncated_lines.append(line)
                current_tokens += int(line_words * 1.3)
            else:
                break

        if not truncated_lines:
            return None

        # Aggiungi indicatore di troncamento
        content = "\n".join(truncated_lines)
        if len(truncated_lines) < len(lines):
            content += "\n... [truncated]"

        return RuleExcerpt(
            category=excerpt.category,
            content=content,
            priority=excerpt.priority,
            token_count=current_tokens
        )

    def get_excerpts_as_string(
        self,
        categories: Optional[List[str]] = None,
        max_tokens: int = 500
    ) -> str:
        """
        Ottiene excerpt concatenati come stringa.

        Metodo di convenienza per compatibilita con codice esistente.

        Args:
            categories: Categorie da includere (None = tutte)
            max_tokens: Budget massimo in token (default 500)

        Returns:
            Stringa con tutti gli excerpt concatenati
        """
        excerpts = self.get_excerpts(categories=categories, max_tokens=max_tokens)

        result_parts: List[str] = []
        for excerpt in excerpts:
            result_parts.append(f"---{excerpt.category.upper()} RULES---")
            result_parts.append(excerpt.content)
            result_parts.append("")

        return "\n".join(result_parts).strip()

    def reload(self) -> bool:
        """
        Reload excerpts from disk (hot-reload support).

        Forces cache invalidation and reloads from disk.

        Returns:
            True if reload successful, False otherwise
        """
        with self._lock:
            try:
                self._excerpts = {}
                self._index = {}
                self._cache_timestamp = 0.0
                self._load_excerpts()
                return True
            except Exception as e:
                logger.warning(f"RuleExcerptManager: Failed to reload excerpts: {e}")
                return False

    def get_stats(self) -> Dict[str, object]:
        """
        Return statistics about loaded excerpts.

        Returns:
            Dict with categories count, total tokens, index entries,
            cache age, and TTL status
        """
        self._ensure_cache_valid()
        total_tokens = sum(
            int(len(excerpt.split()) * 1.3)
            for excerpt in self._excerpts.values()
        )
        cache_age = time.time() - self._cache_timestamp if self._cache_timestamp > 0 else 0
        return {
            "categories": len(self._excerpts),
            "total_tokens": total_tokens,
            "index_entries": sum(len(v) for v in self._index.values()),
            "cache_age_seconds": int(cache_age),
            "cache_ttl_seconds": self._cache_ttl,
            "cache_valid": self._is_cache_valid(),
        }


def get_rule_excerpts() -> RuleExcerptManager:
    """
    Singleton accessor for RuleExcerptManager.

    Returns:
        The singleton RuleExcerptManager instance
    """
    return RuleExcerptManager()
