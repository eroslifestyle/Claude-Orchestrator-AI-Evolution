"""
Warm Cache Manager - V17

Cache gerarchica L1+L2 per tools frequenti.

L1 (In-Memory): Ultra-veloce, limite 100MB
L2 (Disk/Redis): Persistente, limite 1GB

Example:
    >>> from lib.v17 import WarmCacheManager
    >>> cache = WarmCacheManager()
    >>> await cache.initialize()
    >>>
    >>> # Warm cache con tools frequenti
    >>> await cache.warm(["query_api", "query_db"])
    >>>
    >>> # Get con fallback
    >>> result = await cache.get_or_compute(
    ...     key="users_list",
    ...     compute=lambda: fetch_users(),
    ...     ttl_seconds=300,
    ... )
"""

from __future__ import annotations

import asyncio
import fnmatch
import hashlib
import json
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable, Coroutine

if TYPE_CHECKING:
    pass

__all__ = [
    "WarmCacheManager",
    "CacheLayer",
    "CacheEntry",
    "CacheStats",
]


class CacheLayer(Enum):
    """Layer della cache."""

    L1_MEMORY = "l1_memory"  # In-memory cache
    L2_DISK = "l2_disk"  # Disk-based cache
    L2_REDIS = "l2_redis"  # Redis cache


@dataclass(slots=True)
class CacheEntry:
    """
    Entry della cache.

    Attributes:
        key: Chiave univoca
        value: Valore cachato
        created_at: Timestamp creazione
        expires_at: Timestamp scadenza
        layer: Layer dove e' stored
        hit_count: Numero di hit
        size_bytes: Dimensione in bytes
        tags: Tag per invalidazione group
    """

    key: str
    value: Any
    created_at: float
    expires_at: float
    layer: CacheLayer
    hit_count: int = 0
    size_bytes: int = 0
    tags: list[str] = field(default_factory=list)

    def is_expired(self) -> bool:
        """Verifica se l'entry e' scaduta."""
        return time.time() > self.expires_at

    def to_dict(self) -> dict[str, Any]:
        """Serializza entry per storage."""
        return {
            "key": self.key,
            "value": self.value,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "layer": self.layer.value,
            "hit_count": self.hit_count,
            "size_bytes": self.size_bytes,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "CacheEntry":
        """Deserializza entry da storage."""
        return cls(
            key=data["key"],
            value=data["value"],
            created_at=data["created_at"],
            expires_at=data["expires_at"],
            layer=CacheLayer(data["layer"]),
            hit_count=data.get("hit_count", 0),
            size_bytes=data.get("size_bytes", 0),
            tags=data.get("tags", []),
        )


@dataclass(slots=True)
class CacheStats:
    """
    Statistiche cache.

    Attributes:
        l1_hits: Hit in L1
        l1_misses: Miss in L1
        l2_hits: Hit in L2
        l2_misses: Miss in L2
        evictions: Entry rimosse
        size_bytes: Dimensione attuale
        entries: Numero entry
    """

    l1_hits: int = 0
    l1_misses: int = 0
    l2_hits: int = 0
    l2_misses: int = 0
    evictions: int = 0
    size_bytes: int = 0
    entries: int = 0

    @property
    def l1_hit_rate(self) -> float:
        """Hit rate L1 (0.0-1.0)."""
        total = self.l1_hits + self.l1_misses
        return self.l1_hits / total if total > 0 else 0.0

    @property
    def total_hit_rate(self) -> float:
        """Hit rate totale (L1+L2)."""
        total_hits = self.l1_hits + self.l2_hits
        total_misses = self.l1_misses + self.l2_misses
        total = total_hits + total_misses
        return total_hits / total if total > 0 else 0.0


@dataclass
class WarmCacheManager:
    """
    Cache manager gerarchico L1+L2.

    Features:
    - Warm cache: precarica tools frequenti
    - Automatic promotion: L2 -> L1 su hit
    - TTL support: scadenza automatica
    - Tag-based invalidation
    - Size-based eviction (LRU)
    - Persistence: L2 su disk o Redis

    Example:
        >>> cache = WarmCacheManager(
        ...     l1_max_size_mb=100,
        ...     l2_max_size_mb=1000,
        ...     default_ttl_seconds=300,
        ... )
        >>> await cache.initialize()
        >>>
        >>> # Warm cache
        >>> await cache.warm(["query_api", "query_db"])
        >>>
        >>> # Get or compute
        >>> result = await cache.get_or_compute(
        ...     key="users:active",
        ...     compute=lambda: db.query("SELECT * FROM users WHERE active"),
        ...     ttl_seconds=60,
        ...     tags=["users", "db"],
        ... )
        >>>
        >>> # Invalidate by tag
        >>> await cache.invalidate_tag("users")
    """

    # Config - L1 (Hot Cache)
    l1_max_size_mb: int = 100
    l1_max_entries: int = 1000  # Max 1000 entries in L1
    l1_default_ttl_seconds: int = 300  # 5 minutes TTL for L1

    # Config - L2 (Warm Cache)
    l2_max_size_mb: int = 1000
    l2_max_entries: int = 10000  # Max 10000 entries in L2
    l2_default_ttl_seconds: int = 3600  # 1 hour TTL for L2
    l2_path: Path = field(default_factory=lambda: Path(".cache/v17"))

    # Legacy compatibility
    default_ttl_seconds: int = 300  # Deprecated: use l1_default_ttl_seconds

    # Storage - OrderedDict per LRU efficiente
    _l1_cache: OrderedDict[str, CacheEntry] = field(default_factory=OrderedDict)
    _l2_cache: OrderedDict[str, CacheEntry] = field(default_factory=OrderedDict)
    _tag_index: dict[str, set[str]] = field(default_factory=lambda: {})
    _stats: CacheStats = field(default_factory=CacheStats)

    # Locks
    _l1_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _l2_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def initialize(self) -> None:
        """
        Inizializza la cache.

        Crea directory L2 se necessario, carica cache persistente.
        """
        # Crea directory L2 se non esiste
        self.l2_path.mkdir(parents=True, exist_ok=True)

        # Carica cache persistente da disco
        await self.load_l2()

        # Aggiorna statistiche
        self._update_stats()

    async def warm(
        self,
        keys: list[str],
        loader: Callable[[str], Coroutine[Any, Any, Any]] | None = None,
    ) -> int:
        """
        Precarica dati nella cache L1.

        Args:
            keys: Chiavi da precaricare
            loader: Funzione async per caricare dato mancante (opzionale)

        Returns:
            Numero di entry caricate con successo

        Example:
            >>> async def load_tool(name: str):
            ...     return await fetch_tool_definition(name)
            >>> await cache.warm(["query_api", "query_db"], loader=load_tool)
        """
        loaded = 0

        for key in keys:
            # Cerca prima in L2
            async with self._l2_lock:
                l2_entry = self._l2_cache.get(key)

            if l2_entry and not l2_entry.is_expired():
                # Promuovi a L1
                if await self._promote_to_l1(key):
                    loaded += 1
            elif loader is not None:
                # Carica usando il loader fornito
                try:
                    value = await loader(key)
                    await self.set(
                        key,
                        value,
                        ttl_seconds=self.l1_default_ttl_seconds,
                        layer=CacheLayer.L1_MEMORY,
                    )
                    loaded += 1
                except Exception:
                    # Skip se il loader fallisce
                    pass

        return loaded

    async def get(
        self,
        key: str,
        default: Any = None,
    ) -> Any | None:
        """
        Ottiene valore dalla cache (L1 -> L2).

        Args:
            key: Chiave univoca
            default: Valore default se non trovato

        Returns:
            Valore cachato o default
        """
        # Cerca in L1 prima
        async with self._l1_lock:
            l1_entry = self._l1_cache.get(key)

            if l1_entry is not None:
                if l1_entry.is_expired():
                    # Rimuovi entry scaduta
                    del self._l1_cache[key]
                    self._stats.l1_misses += 1
                else:
                    # Hit in L1 - sposta in fondo per LRU
                    l1_entry.hit_count += 1
                    self._stats.l1_hits += 1
                    # Move to end for LRU (most recently used)
                    self._l1_cache.move_to_end(key)
                    return l1_entry.value

        # Cerca in L2
        async with self._l2_lock:
            l2_entry = self._l2_cache.get(key)

            if l2_entry is not None:
                if l2_entry.is_expired():
                    # Rimuovi entry scaduta
                    del self._l2_cache[key]
                    self._remove_from_tag_index(key, l2_entry.tags)
                    self._stats.l2_misses += 1
                else:
                    # Hit in L2 - promuovi a L1 e aggiorna LRU
                    l2_entry.hit_count += 1
                    self._stats.l2_hits += 1
                    # Move to end for LRU
                    self._l2_cache.move_to_end(key)
                    await self._promote_to_l1(key)
                    return l2_entry.value

        # Miss totale
        self._stats.l1_misses += 1
        return default

    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: int | None = None,
        tags: list[str] | None = None,
        layer: CacheLayer = CacheLayer.L1_MEMORY,
    ) -> bool:
        """
        Imposta valore in cache.

        Args:
            key: Chiave univoca
            value: Valore da cachare
            ttl_seconds: TTL override (usa default se None)
            tags: Tag per invalidazione group
            layer: Layer target (L1 o L2)

        Returns:
            True se salvato con successo
        """
        ttl = ttl_seconds or self.default_ttl_seconds
        tags = tags or []
        now = time.time()
        size_bytes = self._calculate_size(value)

        entry = CacheEntry(
            key=key,
            value=value,
            created_at=now,
            expires_at=now + ttl,
            layer=layer,
            hit_count=0,
            size_bytes=size_bytes,
            tags=tags,
        )

        if layer == CacheLayer.L1_MEMORY:
            async with self._l1_lock:
                # Verifica limite entries
                if len(self._l1_cache) >= self.l1_max_entries and key not in self._l1_cache:
                    await self._evict_lru_entries(layer, 1)

                # Verifica limite size
                max_bytes = self.l1_max_size_mb * 1024 * 1024
                current_size = sum(e.size_bytes for e in self._l1_cache.values())

                if current_size + size_bytes > max_bytes:
                    bytes_needed = size_bytes
                    await self._evict_lru(layer, bytes_needed)

                # Rimuovi vecchia entry se esiste
                if key in self._l1_cache:
                    old_entry = self._l1_cache[key]
                    self._remove_from_tag_index(key, old_entry.tags)

                self._l1_cache[key] = entry
                # Move to end for LRU
                self._l1_cache.move_to_end(key)
                self._add_to_tag_index(key, tags)
        else:
            async with self._l2_lock:
                # Verifica limite entries
                if len(self._l2_cache) >= self.l2_max_entries and key not in self._l2_cache:
                    await self._evict_lru_entries(layer, 1)

                # Verifica limite size
                max_bytes = self.l2_max_size_mb * 1024 * 1024
                current_size = sum(e.size_bytes for e in self._l2_cache.values())

                if current_size + size_bytes > max_bytes:
                    bytes_needed = size_bytes
                    await self._evict_lru(layer, bytes_needed)

                # Rimuovi vecchia entry se esiste
                if key in self._l2_cache:
                    old_entry = self._l2_cache[key]
                    self._remove_from_tag_index(key, old_entry.tags)

                self._l2_cache[key] = entry
                # Move to end for LRU
                self._l2_cache.move_to_end(key)
                self._add_to_tag_index(key, tags)

        self._update_stats()
        return True

    async def get_or_compute(
        self,
        key: str,
        compute: Callable[[], Coroutine[Any, Any, Any]],
        ttl_seconds: int | None = None,
        tags: list[str] | None = None,
    ) -> Any:
        """
        Ottiene dalla cache o computa se mancante.

        Pattern cache-aside con automatic caching.

        Args:
            key: Chiave univoca
            compute: Funzione async per computare valore
            ttl_seconds: TTL per nuovo valore
            tags: Tag per invalidazione

        Returns:
            Valore cachato o computato

        Example:
            >>> result = await cache.get_or_compute(
            ...     key="users:active",
            ...     compute=lambda: db.query("..."),
            ...     ttl_seconds=60,
            ... )
        """
        # Cerca in cache
        result = await self.get(key, default=None)

        if result is not None:
            return result

        # Computa valore
        computed = await compute()

        # Salva in cache
        await self.set(key, computed, ttl_seconds, tags)

        return computed

    async def invalidate(self, key: str) -> bool:
        """
        Invalida entry dalla cache (L1 + L2).

        Args:
            key: Chiave da invalidare

        Returns:
            True se rimossa, False se non esisteva
        """
        removed = False
        tags_to_clean: list[str] = []

        # Rimuovi da L1
        async with self._l1_lock:
            if key in self._l1_cache:
                entry = self._l1_cache.pop(key)
                tags_to_clean = entry.tags
                removed = True

        # Rimuovi da L2
        async with self._l2_lock:
            if key in self._l2_cache:
                entry = self._l2_cache.pop(key)
                if not tags_to_clean:
                    tags_to_clean = entry.tags
                removed = True

        # Pulisci tag index
        if tags_to_clean:
            self._remove_from_tag_index(key, tags_to_clean)

        if removed:
            self._update_stats()

        return removed

    async def invalidate_tag(self, tag: str) -> int:
        """
        Invalida tutte le entry con un tag.

        Args:
            tag: Tag da invalidare

        Returns:
            Numero di entry rimosse
        """
        keys_to_remove = self._tag_index.get(tag, set()).copy()
        removed = 0

        for key in keys_to_remove:
            if await self.invalidate(key):
                removed += 1

        return removed

    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalida entry matching pattern.

        Args:
            pattern: Pattern glob (es. "users:*")

        Returns:
            Numero di entry rimosse
        """
        removed = 0

        # Trova matching keys in L1
        async with self._l1_lock:
            l1_keys = list(self._l1_cache.keys())

        # Trova matching keys in L2
        async with self._l2_lock:
            l2_keys = list(self._l2_cache.keys())

        all_keys = set(l1_keys) | set(l2_keys)
        matching_keys = fnmatch.filter(all_keys, pattern)

        for key in matching_keys:
            if await self.invalidate(key):
                removed += 1

        return removed

    async def clear(self, layer: CacheLayer | None = None) -> int:
        """
        Svuota la cache.

        Args:
            layer: Layer specifico o None per tutti

        Returns:
            Numero di entry rimosse
        """
        removed = 0

        if layer is None or layer == CacheLayer.L1_MEMORY:
            async with self._l1_lock:
                removed += len(self._l1_cache)
                self._l1_cache.clear()

        if layer is None or layer in (CacheLayer.L2_DISK, CacheLayer.L2_REDIS):
            async with self._l2_lock:
                removed += len(self._l2_cache)
                self._l2_cache.clear()

        # Reset tag index
        if layer is None:
            self._tag_index.clear()

        self._update_stats()
        return removed

    def get_stats(self) -> CacheStats:
        """
        Ottiene statistiche cache.

        Returns:
            CacheStats con hit/miss/size
        """
        return CacheStats(
            l1_hits=self._stats.l1_hits,
            l1_misses=self._stats.l1_misses,
            l2_hits=self._stats.l2_hits,
            l2_misses=self._stats.l2_misses,
            evictions=self._stats.evictions,
            size_bytes=self._stats.size_bytes,
            entries=self._stats.entries,
        )

    async def _evict_lru(self, layer: CacheLayer, bytes_needed: int) -> int:
        """
        Evict entry LRU per fare spazio (size-based).

        Args:
            layer: Layer target
            bytes_needed: Bytes necessari

        Returns:
            Bytes liberati
        """
        freed_bytes = 0

        if layer == CacheLayer.L1_MEMORY:
            cache = self._l1_cache
        else:
            cache = self._l2_cache

        # OrderedDict: first items are LRU
        while freed_bytes < bytes_needed and cache:
            # Pop first (oldest/least recently used)
            key, entry = cache.popitem(last=False)
            self._remove_from_tag_index(key, entry.tags)
            freed_bytes += entry.size_bytes
            self._stats.evictions += 1

        return freed_bytes

    async def _evict_lru_entries(self, layer: CacheLayer, count: int) -> int:
        """
        Evict N entry LRU (count-based).

        Args:
            layer: Layer target
            count: Numero di entry da rimuovere

        Returns:
            Numero di entry rimosse
        """
        evicted = 0

        if layer == CacheLayer.L1_MEMORY:
            cache = self._l1_cache
        else:
            cache = self._l2_cache

        # OrderedDict: first items are LRU
        for _ in range(min(count, len(cache))):
            if not cache:
                break
            key, entry = cache.popitem(last=False)
            self._remove_from_tag_index(key, entry.tags)
            self._stats.evictions += 1
            evicted += 1

        return evicted

    def _calculate_size(self, value: Any) -> int:
        """
        Calcola dimensione di un valore.

        Args:
            value: Valore da misurare

        Returns:
            Dimensione in bytes
        """
        try:
            # Serializza in JSON e misura
            json_str = json.dumps(value, default=str, ensure_ascii=False)
            return len(json_str.encode("utf-8"))
        except (TypeError, ValueError):
            # Fallback: repr
            return len(repr(value).encode("utf-8"))

    async def _promote_to_l1(self, key: str) -> bool:
        """
        Promuove entry da L2 a L1.

        Args:
            key: Chiave dell'entry

        Returns:
            True se promossa con successo
        """
        async with self._l2_lock:
            l2_entry = self._l2_cache.get(key)

            if l2_entry is None or l2_entry.is_expired():
                return False

        async with self._l1_lock:
            # Verifica limite entries
            if len(self._l1_cache) >= self.l1_max_entries:
                await self._evict_lru_entries(CacheLayer.L1_MEMORY, 1)

            # Verifica spazio size
            max_bytes = self.l1_max_size_mb * 1024 * 1024
            current_size = sum(e.size_bytes for e in self._l1_cache.values())

            if current_size + l2_entry.size_bytes > max_bytes:
                await self._evict_lru(CacheLayer.L1_MEMORY, l2_entry.size_bytes)

            # Crea entry L1
            l1_entry = CacheEntry(
                key=l2_entry.key,
                value=l2_entry.value,
                created_at=l2_entry.created_at,
                expires_at=l2_entry.expires_at,
                layer=CacheLayer.L1_MEMORY,
                hit_count=l2_entry.hit_count,
                size_bytes=l2_entry.size_bytes,
                tags=l2_entry.tags,
            )

            self._l1_cache[key] = l1_entry
            self._l1_cache.move_to_end(key)

        return True

    async def persist_l2(self) -> int:
        """
        Persiste L2 cache su disco.

        Returns:
            Numero di entry persistite
        """
        cache_file = self.l2_path / "cache.json"

        async with self._l2_lock:
            entries = []
            for entry in self._l2_cache.values():
                if not entry.is_expired():
                    entries.append(entry.to_dict())

        # Scrivi su disco
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)
            return len(entries)
        except (OSError, IOError):
            return 0

    async def load_l2(self) -> int:
        """
        Carica L2 cache da disco.

        Returns:
            Numero di entry caricate
        """
        cache_file = self.l2_path / "cache.json"

        if not cache_file.exists():
            return 0

        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            loaded = 0
            async with self._l2_lock:
                for entry_data in data:
                    try:
                        entry = CacheEntry.from_dict(entry_data)
                        if not entry.is_expired():
                            self._l2_cache[entry.key] = entry
                            self._add_to_tag_index(entry.key, entry.tags)
                            loaded += 1
                    except (KeyError, ValueError):
                        # Skip entry invalida
                        continue

            self._update_stats()
            return loaded
        except (OSError, IOError, json.JSONDecodeError):
            return 0

    # === Helper methods ===

    def _add_to_tag_index(self, key: str, tags: list[str]) -> None:
        """Aggiunge key al tag index."""
        for tag in tags:
            if tag not in self._tag_index:
                self._tag_index[tag] = set()
            self._tag_index[tag].add(key)

    def _remove_from_tag_index(self, key: str, tags: list[str]) -> None:
        """Rimuove key dal tag index."""
        for tag in tags:
            if tag in self._tag_index:
                self._tag_index[tag].discard(key)
                if not self._tag_index[tag]:
                    del self._tag_index[tag]

    def _update_stats(self) -> None:
        """Aggiorna statistiche cache."""
        l1_size = sum(e.size_bytes for e in self._l1_cache.values())
        l2_size = sum(e.size_bytes for e in self._l2_cache.values())

        self._stats.size_bytes = l1_size + l2_size
        self._stats.entries = len(self._l1_cache) + len(self._l2_cache)
