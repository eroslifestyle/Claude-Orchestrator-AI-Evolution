"""Test BudgetCache for V14.2.

Test suite per BudgetCache class con TTL e LRU eviction.

V14.2.0 - Budget caching for performance optimization.
"""
import pytest
import time
import threading
from typing import Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class TokenBudget:
    """Mock TokenBudget for testing."""
    base_tokens: int
    complexity_multiplier: float
    final_budget: int
    factors: Dict[str, float] = None
    rule_budget_percentage: float = 0.4


class BudgetCache:
    """Simplified BudgetCache for testing (copy of implementation)."""

    def __init__(self, max_size: int = 100, ttl_seconds: float = 300.0):
        from collections import OrderedDict
        self._cache: OrderedDict[str, Tuple[TokenBudget, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0

    def _make_key(self, task: str, context_keys: frozenset) -> str:
        import hashlib
        task_hash = hashlib.md5(task[:50].encode('utf-8'), usedforsecurity=False).hexdigest()[:16]
        context_hash = hashlib.md5(
            str(sorted(context_keys)).encode('utf-8'),
            usedforsecurity=False
        ).hexdigest()[:8]
        return f"{task_hash}_{context_hash}"

    def get(self, task: str, context_keys: frozenset) -> Optional[TokenBudget]:
        key = self._make_key(task, context_keys)
        with self._lock:
            if key in self._cache:
                budget, created = self._cache[key]
                if time.time() - created < self._ttl:
                    self._cache.move_to_end(key)
                    self._hits += 1
                    return budget
                else:
                    del self._cache[key]
                    self._misses += 1
            else:
                self._misses += 1
        return None

    def set(self, task: str, context_keys: frozenset, budget: TokenBudget) -> None:
        key = self._make_key(task, context_keys)
        with self._lock:
            if len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)
            self._cache[key] = (budget, time.time())

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def get_stats(self) -> Dict[str, object]:
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


class TestBudgetCache:
    """Test BudgetCache class."""

    def test_init_default_params(self):
        """Test inizializzazione con parametri default."""
        cache = BudgetCache()
        assert cache._max_size == 100
        assert cache._ttl == 300.0
        assert len(cache._cache) == 0
        assert cache._hits == 0
        assert cache._misses == 0

    def test_init_custom_params(self):
        """Test inizializzazione con parametri custom."""
        cache = BudgetCache(max_size=50, ttl_seconds=60.0)
        assert cache._max_size == 50
        assert cache._ttl == 60.0

    def test_make_key_consistency(self):
        """Test che la chiave e' consistente per stesso input."""
        cache = BudgetCache()
        context_keys = frozenset(["files", "agents"])

        key1 = cache._make_key("test task", context_keys)
        key2 = cache._make_key("test task", context_keys)

        assert key1 == key2

    def test_make_key_different_task(self):
        """Test che task diversi generano chiavi diverse."""
        cache = BudgetCache()
        context_keys = frozenset(["files"])

        key1 = cache._make_key("task one", context_keys)
        key2 = cache._make_key("task two", context_keys)

        assert key1 != key2

    def test_make_key_different_context(self):
        """Test che context diversi generano chiavi diverse."""
        cache = BudgetCache()

        key1 = cache._make_key("task", frozenset(["files"]))
        key2 = cache._make_key("task", frozenset(["agents"]))

        assert key1 != key2

    def test_set_and_get(self):
        """Test set e get base."""
        cache = BudgetCache()
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
            factors={"test": 0.5},
            rule_budget_percentage=0.4,
        )

        context_keys = frozenset(["files"])
        cache.set("test task", context_keys, budget)

        result = cache.get("test task", context_keys)
        assert result is not None
        assert result.final_budget == 750

    def test_get_cache_miss(self):
        """Test get su cache vuota."""
        cache = BudgetCache()
        result = cache.get("nonexistent", frozenset())
        assert result is None
        assert cache._misses == 1

    def test_get_cache_hit_updates_stats(self):
        """Test che cache hit aggiorna statistiche."""
        cache = BudgetCache()
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.0,
            final_budget=500,
            factors=None,
        )

        context_keys = frozenset()
        cache.set("task", context_keys, budget)

        # First get - hit
        result = cache.get("task", context_keys)
        assert result is not None
        assert cache._hits == 1

    def test_ttl_expiration(self):
        """Test che entry scadono dopo TTL."""
        cache = BudgetCache(ttl_seconds=0.1)  # 100ms TTL
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.0,
            final_budget=500,
            factors=None,
        )

        context_keys = frozenset()
        cache.set("task", context_keys, budget)

        # Get immediato - hit
        result = cache.get("task", context_keys)
        assert result is not None

        # Aspetta scadenza
        time.sleep(0.15)

        # Get dopo TTL - miss (entry scaduta)
        result = cache.get("task", context_keys)
        assert result is None
        assert cache._misses >= 1

    def test_lru_eviction(self):
        """Test LRU eviction quando cache e' piena."""
        cache = BudgetCache(max_size=3)

        # Aggiungi 4 entry (1 in piu' del max)
        for i in range(4):
            budget = TokenBudget(
                base_tokens=100 * (i + 1),
                complexity_multiplier=1.0,
                final_budget=100 * (i + 1),
                factors=None,
            )
            cache.set(f"task_{i}", frozenset([str(i)]), budget)

        # Cache dovrebbe avere max 3 entry
        assert len(cache._cache) == 3

        # La prima entry (task_0) dovrebbe essere stata rimossa
        result = cache.get("task_0", frozenset(["0"]))
        assert result is None

        # L'ultima entry (task_3) dovrebbe esistere
        result = cache.get("task_3", frozenset(["3"]))
        assert result is not None
        assert result.final_budget == 400

    def test_lru_access_order(self):
        """Test che LRU mantiene ordine corretto."""
        cache = BudgetCache(max_size=3)

        # Aggiungi 3 entry
        for i in range(3):
            budget = TokenBudget(
                base_tokens=100 * (i + 1),
                complexity_multiplier=1.0,
                final_budget=100 * (i + 1),
                factors=None,
            )
            cache.set(f"task_{i}", frozenset(), budget)

        # Accedi a task_0 (diventa piu' recente)
        cache.get("task_0", frozenset())

        # Aggiungi nuova entry (task_3)
        budget = TokenBudget(base_tokens=400, complexity_multiplier=1.0, final_budget=400, factors=None)
        cache.set("task_3", frozenset(), budget)

        # task_1 dovrebbe essere stata rimossa (era la meno recente)
        assert cache.get("task_1", frozenset()) is None
        # task_0 dovrebbe esistere (e' stata acceduta)
        assert cache.get("task_0", frozenset()) is not None

    def test_clear(self):
        """Test clear svuota la cache."""
        cache = BudgetCache()

        # Aggiungi alcune entry
        for i in range(5):
            budget = TokenBudget(base_tokens=100, complexity_multiplier=1.0, final_budget=100, factors=None)
            cache.set(f"task_{i}", frozenset(), budget)

        assert len(cache._cache) == 5

        cache.clear()

        assert len(cache._cache) == 0
        assert cache._hits == 0
        assert cache._misses == 0

    def test_get_stats(self):
        """Test statistiche cache."""
        cache = BudgetCache(max_size=10, ttl_seconds=60.0)

        # Aggiungi entry
        for i in range(5):
            budget = TokenBudget(base_tokens=100, complexity_multiplier=1.0, final_budget=100, factors=None)
            cache.set(f"task_{i}", frozenset(), budget)

        # Genera hit e miss
        cache.get("task_0", frozenset())  # hit
        cache.get("task_0", frozenset())  # hit
        cache.get("nonexistent", frozenset())  # miss

        stats = cache.get_stats()

        assert stats["size"] == 5
        assert stats["max_size"] == 10
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == pytest.approx(0.667, rel=0.01)
        assert stats["ttl_seconds"] == 60.0

    def test_cleanup_expired(self):
        """Test cleanup_expired rimuove solo entry scadute."""
        cache = BudgetCache(ttl_seconds=0.1)

        # Aggiungi entry
        for i in range(5):
            budget = TokenBudget(base_tokens=100, complexity_multiplier=1.0, final_budget=100, factors=None)
            cache.set(f"task_{i}", frozenset(), budget)

        assert len(cache._cache) == 5

        # Aspetta scadenza
        time.sleep(0.15)

        # Cleanup
        removed = cache.cleanup_expired()

        assert removed == 5
        assert len(cache._cache) == 0

    def test_thread_safety_concurrent_access(self):
        """Test thread safety con accessi concorrenti."""
        cache = BudgetCache()
        errors = []

        def writer_thread(task_id):
            try:
                for i in range(100):
                    budget = TokenBudget(
                        base_tokens=task_id * 100 + i,
                        complexity_multiplier=1.0,
                        final_budget=task_id * 100 + i,
                        factors=None,
                    )
                    cache.set(f"task_{task_id}_{i}", frozenset([str(task_id)]), budget)
            except Exception as e:
                errors.append(e)

        def reader_thread(task_id):
            try:
                for i in range(100):
                    cache.get(f"task_{task_id}_{i}", frozenset([str(task_id)]))
            except Exception as e:
                errors.append(e)

        threads = []
        for i in range(5):
            threads.append(threading.Thread(target=writer_thread, args=(i,)))
            threads.append(threading.Thread(target=reader_thread, args=(i,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
