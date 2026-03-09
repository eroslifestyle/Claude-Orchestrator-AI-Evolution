"""
Test per WarmCacheManager - V17

Test coverage: 17 metodi implementati
"""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio

from lib.v17.cache import CacheEntry, CacheLayer, CacheStats, WarmCacheManager


# === Fixtures ===


@pytest.fixture
def temp_cache_dir():
    """Crea directory temporanea per test."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest_asyncio.fixture
async def cache(temp_cache_dir) -> AsyncGenerator[WarmCacheManager, None]:
    """Crea cache instance per test."""
    cache = WarmCacheManager(
        l1_max_size_mb=1,
        l2_max_size_mb=10,
        default_ttl_seconds=60,
        l2_path=temp_cache_dir / "cache",
    )
    await cache.initialize()
    yield cache


# === CacheEntry Tests ===


class TestCacheEntry:
    """Test per CacheEntry."""

    def test_to_dict(self):
        """Test serializzazione."""
        entry = CacheEntry(
            key="test_key",
            value={"data": "test"},
            created_at=1000.0,
            expires_at=2000.0,
            layer=CacheLayer.L1_MEMORY,
            hit_count=5,
            size_bytes=100,
            tags=["tag1", "tag2"],
        )
        result = entry.to_dict()
        assert result["key"] == "test_key"
        assert result["value"] == {"data": "test"}
        assert result["layer"] == "l1_memory"
        assert result["tags"] == ["tag1", "tag2"]

    def test_from_dict(self):
        """Test deserializzazione."""
        data = {
            "key": "test_key",
            "value": {"data": "test"},
            "created_at": 1000.0,
            "expires_at": 2000.0,
            "layer": "l2_disk",
            "hit_count": 3,
            "size_bytes": 50,
            "tags": ["tag1"],
        }
        entry = CacheEntry.from_dict(data)
        assert entry.key == "test_key"
        assert entry.value == {"data": "test"}
        assert entry.layer == CacheLayer.L2_DISK
        assert entry.hit_count == 3

    def test_is_expired_false(self):
        """Test is_expired quando non scaduta."""
        import time
        entry = CacheEntry(
            key="test",
            value="data",
            created_at=time.time(),
            expires_at=time.time() + 1000,
            layer=CacheLayer.L1_MEMORY,
        )
        assert entry.is_expired() is False

    def test_is_expired_true(self):
        """Test is_expired quando scaduta."""
        entry = CacheEntry(
            key="test",
            value="data",
            created_at=0.0,
            expires_at=1.0,
            layer=CacheLayer.L1_MEMORY,
        )
        assert entry.is_expired() is True


# === CacheStats Tests ===


class TestCacheStats:
    """Test per CacheStats."""

    def test_l1_hit_rate_zero(self):
        """Test hit rate con zero accessi."""
        stats = CacheStats()
        assert stats.l1_hit_rate == 0.0

    def test_l1_hit_rate_calculated(self):
        """Test hit rate calcolato."""
        stats = CacheStats(l1_hits=80, l1_misses=20)
        assert stats.l1_hit_rate == 0.8

    def test_total_hit_rate(self):
        """Test hit rate totale."""
        stats = CacheStats(l1_hits=50, l1_misses=10, l2_hits=30, l2_misses=10)
        assert stats.total_hit_rate == 0.8


# === WarmCacheManager Tests ===


class TestWarmCacheManager:
    """Test per WarmCacheManager."""

    @pytest.mark.asyncio
    async def test_initialize(self, temp_cache_dir):
        """Test inizializzazione cache."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        await cache.initialize()
        assert cache.l2_path.exists()

    @pytest.mark.asyncio
    async def test_set_and_get_l1(self, cache):
        """Test set e get in L1."""
        await cache.set("key1", {"value": "test"}, ttl_seconds=60)
        result = await cache.get("key1")
        assert result == {"value": "test"}

    @pytest.mark.asyncio
    async def test_set_and_get_l2(self, cache):
        """Test set e get in L2."""
        await cache.set("key2", "test_value", ttl_seconds=60, layer=CacheLayer.L2_DISK)
        result = await cache.get("key2")
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_get_missing_key(self, cache):
        """Test get con key mancante."""
        result = await cache.get("nonexistent", default="default_value")
        assert result == "default_value"

    @pytest.mark.asyncio
    async def test_get_expired_entry(self, cache):
        """Test get con entry scaduta."""
        await cache.set("expire_key", "value", ttl_seconds=0)
        await asyncio.sleep(0.1)
        result = await cache.get("expire_key", default="expired")
        assert result == "expired"

    @pytest.mark.asyncio
    async def test_get_or_compute_cache_hit(self, cache):
        """Test get_or_compute con cache hit."""
        await cache.set("compute_key", "cached_value", ttl_seconds=60)
        compute_called = False

        async def compute():
            nonlocal compute_called
            compute_called = True
            return "computed_value"

        result = await cache.get_or_compute("compute_key", compute)
        assert result == "cached_value"
        assert compute_called is False

    @pytest.mark.asyncio
    async def test_get_or_compute_cache_miss(self, cache):
        """Test get_or_compute con cache miss."""

        async def compute():
            return "computed_value"

        result = await cache.get_or_compute("new_key", compute, ttl_seconds=60)
        assert result == "computed_value"
        cached = await cache.get("new_key")
        assert cached == "computed_value"

    @pytest.mark.asyncio
    async def test_invalidate_existing(self, cache):
        """Test invalidazione entry esistente."""
        await cache.set("invalidate_key", "value", ttl_seconds=60)
        result = await cache.invalidate("invalidate_key")
        assert result is True
        cached = await cache.get("invalidate_key")
        assert cached is None

    @pytest.mark.asyncio
    async def test_invalidate_nonexistent(self, cache):
        """Test invalidazione entry inesistente."""
        result = await cache.invalidate("nonexistent_key")
        assert result is False

    @pytest.mark.asyncio
    async def test_invalidate_tag(self, cache):
        """Test invalidazione per tag."""
        await cache.set("key1", "value1", ttl_seconds=60, tags=["group_a"])
        await cache.set("key2", "value2", ttl_seconds=60, tags=["group_a"])
        await cache.set("key3", "value3", ttl_seconds=60, tags=["group_b"])
        removed = await cache.invalidate_tag("group_a")
        assert removed == 2
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None
        assert await cache.get("key3") == "value3"

    @pytest.mark.asyncio
    async def test_invalidate_pattern(self, cache):
        """Test invalidazione per pattern."""
        await cache.set("users:1", "user1", ttl_seconds=60)
        await cache.set("users:2", "user2", ttl_seconds=60)
        await cache.set("orders:1", "order1", ttl_seconds=60)
        removed = await cache.invalidate_pattern("users:*")
        assert removed == 2
        assert await cache.get("users:1") is None
        assert await cache.get("orders:1") == "order1"

    @pytest.mark.asyncio
    async def test_clear_all(self, cache):
        """Test clear di tutta la cache."""
        await cache.set("key1", "value1", ttl_seconds=60)
        await cache.set("key2", "value2", ttl_seconds=60)
        removed = await cache.clear()
        assert removed >= 2

    @pytest.mark.asyncio
    async def test_clear_l1_only(self, cache):
        """Test clear solo L1."""
        await cache.set("key1", "value1", ttl_seconds=60)
        await cache.set("key2", "value2", ttl_seconds=60, layer=CacheLayer.L2_DISK)
        removed = await cache.clear(CacheLayer.L1_MEMORY)
        assert removed == 1

    @pytest.mark.asyncio
    async def test_get_stats(self, cache):
        """Test get_stats."""
        await cache.set("key1", "value1", ttl_seconds=60)
        await cache.get("key1")
        await cache.get("nonexistent")
        stats = cache.get_stats()
        assert stats.l1_hits >= 1
        assert stats.l1_misses >= 1
        assert stats.entries >= 1

    @pytest.mark.asyncio
    async def test_warm(self, cache):
        """Test warm cache."""
        await cache.set("tool:query_api", {"name": "query_api"}, ttl_seconds=3600, layer=CacheLayer.L2_DISK)
        loaded = await cache.warm(["query_api"])
        assert loaded == 1
        result = await cache.get("tool:query_api")
        assert result == {"name": "query_api"}

    @pytest.mark.asyncio
    async def test_persist_and_load_l2(self, temp_cache_dir):
        """Test persist e load L2."""
        cache1 = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        await cache1.initialize()
        await cache1.set("persist_key", "persist_value", ttl_seconds=3600, layer=CacheLayer.L2_DISK)
        persisted = await cache1.persist_l2()
        assert persisted == 1

        cache2 = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        await cache2.initialize()
        result = await cache2.get("persist_key")
        assert result == "persist_value"

    @pytest.mark.asyncio
    async def test_lru_eviction(self, temp_cache_dir):
        """Test LRU eviction quando limite raggiunto."""
        cache = WarmCacheManager(
            l1_max_size_mb=0.001,
            l2_max_size_mb=1,
            l2_path=temp_cache_dir / "cache",
        )
        await cache.initialize()
        large_value = "x" * 500
        await cache.set("key1", large_value, ttl_seconds=60)
        await cache.set("key2", large_value, ttl_seconds=60)
        await cache.set("key3", large_value, ttl_seconds=60)
        stats = cache.get_stats()
        assert stats.evictions > 0 or stats.entries < 3


# === Edge Cases ===


class TestEdgeCases:
    """Test per casi limite."""

    @pytest.mark.asyncio
    async def test_concurrent_access(self, cache):
        """Test accesso concorrente."""

        async def set_value(i):
            await cache.set(f"concurrent_{i}", f"value_{i}", ttl_seconds=60)

        await asyncio.gather(*[set_value(i) for i in range(10)])
        for i in range(10):
            result = await cache.get(f"concurrent_{i}")
            assert result == f"value_{i}"

    @pytest.mark.asyncio
    async def test_unicode_keys_and_values(self, cache):
        """Test chiavi e valori unicode."""
        await cache.set("chiave_unicode", "valore_con_é_à_ù", ttl_seconds=60)
        result = await cache.get("chiave_unicode")
        assert result == "valore_con_é_à_ù"

    @pytest.mark.asyncio
    async def test_complex_nested_value(self, cache):
        """Test valore complesso nidificato."""
        complex_value = {
            "level1": {"level2": {"level3": ["a", "b", "c"], "number": 42}},
            "list": [1, 2, 3],
        }
        await cache.set("complex", complex_value, ttl_seconds=60)
        result = await cache.get("complex")
        assert result == complex_value

    @pytest.mark.asyncio
    async def test_empty_tags(self, cache):
        """Test con tags vuoti."""
        await cache.set("no_tags", "value", ttl_seconds=60, tags=[])
        result = await cache.get("no_tags")
        assert result == "value"

    @pytest.mark.asyncio
    async def test_multiple_tags(self, cache):
        """Test con multipli tags."""
        await cache.set("multi_tag", "value", ttl_seconds=60, tags=["tag1", "tag2", "tag3"])
        removed1 = await cache.invalidate_tag("tag1")
        assert removed1 == 1
        removed2 = await cache.invalidate_tag("tag2")
        assert removed2 == 0


# === Helper Methods Tests ===


class TestHelperMethods:
    """Test per metodi helper."""

    def test_calculate_size_string(self, temp_cache_dir):
        """Test calcolo size per stringa."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        size = cache._calculate_size("test string")
        assert size > 0

    def test_calculate_size_dict(self, temp_cache_dir):
        """Test calcolo size per dict."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        size = cache._calculate_size({"key": "value", "nested": {"a": 1}})
        assert size > 0

    def test_calculate_size_list(self, temp_cache_dir):
        """Test calcolo size per lista."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        size = cache._calculate_size([1, 2, 3, "test"])
        assert size > 0

    def test_add_to_tag_index(self, temp_cache_dir):
        """Test aggiunta a tag index."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        cache._add_to_tag_index("key1", ["tag1", "tag2"])
        assert "key1" in cache._tag_index.get("tag1", set())
        assert "key1" in cache._tag_index.get("tag2", set())

    def test_remove_from_tag_index(self, temp_cache_dir):
        """Test rimozione da tag index."""
        cache = WarmCacheManager(l2_path=temp_cache_dir / "cache")
        cache._add_to_tag_index("key1", ["tag1"])
        cache._remove_from_tag_index("key1", ["tag1"])
        assert "tag1" not in cache._tag_index or "key1" not in cache._tag_index.get("tag1", set())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
