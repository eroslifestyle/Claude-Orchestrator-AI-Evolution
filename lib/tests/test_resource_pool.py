"""Test per ResourcePool - Gestione risorse ultra-massive parallel execution.

Test coverage:
- Inizializzazione pool
- Acquisizione/rilascio risorse
- Priority queue
- Memory guard
- Rate limiting
- Cleanup stale
- Thread safety

Author: Claude Code Coder Agent
Version: 1.0.0
"""

import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from lib.resource_pool import (
    ResourcePool,
    ResourceType,
    ResourceState,
    PooledResource,
    RateLimitTracker,
    ResourcePoolError,
    ResourceAcquisitionError,
    get_resource_pool,
    reset_resource_pool,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
async def pool():
    """Crea un pool pulito per ogni test."""
    p = ResourcePool()
    await p.initialize({"max_resources": 100, "max_memory_percent": 90})
    yield p
    await p.shutdown()


@pytest.fixture
async def singleton_pool():
    """Resetta e ottiene il singleton pool."""
    await reset_resource_pool()
    p = await get_resource_pool({"max_resources": 50})
    yield p
    await reset_resource_pool()


# =============================================================================
# TEST INIZIALIZZAZIONE
# =============================================================================

@pytest.mark.asyncio
async def test_initialize_default():
    """Test inizializzazione con valori default."""
    pool = ResourcePool()
    await pool.initialize({})

    assert pool._max_resources == 1000
    assert pool._max_memory_percent == 80.0
    assert pool._running is True

    await pool.shutdown()


@pytest.mark.asyncio
async def test_initialize_custom():
    """Test inizializzazione con valori custom."""
    pool = ResourcePool()
    await pool.initialize({
        "max_resources": 500,
        "max_memory_percent": 75.0
    })

    assert pool._max_resources == 500
    assert pool._max_memory_percent == 75.0

    await pool.shutdown()


@pytest.mark.asyncio
async def test_initialize_with_api_limits():
    """Test inizializzazione con rate limit API."""
    pool = ResourcePool()
    await pool.initialize({
        "api_limits": {
            "openai": 100,
            "anthropic": 50
        }
    })

    assert "openai" in pool._rate_limiters
    assert "anthropic" in pool._rate_limiters
    assert pool._rate_limiters["openai"].requests_per_second == 100

    await pool.shutdown()


@pytest.mark.asyncio
async def test_initialize_invalid_config():
    """Test inizializzazione con configurazione invalida."""
    from lib.exceptions import ConfigurationError

    pool = ResourcePool()

    with pytest.raises(ConfigurationError):
        await pool.initialize({"max_resources": 0})

    with pytest.raises(ConfigurationError):
        await pool.initialize({"max_memory_percent": 150})


# =============================================================================
# TEST ACQUISIZIONE RISORSE
# =============================================================================

@pytest.mark.asyncio
async def test_acquire_release(pool):
    """Test acquisizione e rilascio risorsa."""
    resource = await pool.acquire(ResourceType.AGENT, "test_task")

    assert resource is not None
    assert resource.resource_type == ResourceType.AGENT
    assert resource.state == ResourceState.ALLOCATED
    assert resource.allocated_to == "test_task"

    # Rilascia
    result = await pool.release(resource.resource_id)
    assert result is True

    # Verifica stato
    stats = await pool.get_stats()
    assert stats["allocated"] == 0


@pytest.mark.asyncio
async def test_acquire_with_priority(pool):
    """Test acquisizione con priorita diverse."""
    # Acquisisci con priorita bassa
    low = await pool.acquire(ResourceType.AGENT, "low", priority=1)
    # Acquisisci con priorita alta
    high = await pool.acquire(ResourceType.AGENT, "high", priority=10)

    assert low.priority == 1
    assert high.priority == 10

    await pool.release(low.resource_id)
    await pool.release(high.resource_id)


@pytest.mark.asyncio
async def test_acquire_exhaust_pool():
    """Test esaurimento pool."""
    small_pool = ResourcePool()
    await small_pool.initialize({"max_resources": 2})

    # Acquisisci tutte
    r1 = await small_pool.acquire(ResourceType.AGENT, "t1")
    r2 = await small_pool.acquire(ResourceType.AGENT, "t2")

    # Pool esaurito
    r3 = await small_pool.acquire(ResourceType.AGENT, "t3", timeout=0.5)
    assert r3 is None

    # Rilascia una
    await small_pool.release(r1.resource_id)

    # Ora dovrebbe essere disponibile
    r4 = await small_pool.acquire(ResourceType.AGENT, "t4", timeout=1.0)
    assert r4 is not None

    await small_pool.shutdown()


@pytest.mark.asyncio
async def test_release_nonexistent(pool):
    """Test rilascio risorsa inesistente."""
    result = await pool.release("nonexistent_id")
    assert result is False


# =============================================================================
# TEST PRIORITY QUEUE
# =============================================================================

@pytest.mark.asyncio
async def test_priority_queue_order():
    """Test ordine priority queue."""
    pool = ResourcePool()
    await pool.initialize({"max_resources": 3})

    # Crea risorse con priorita diverse
    await pool._create_resource(ResourceType.AGENT, priority=5)
    await pool._create_resource(ResourceType.AGENT, priority=1)
    await pool._create_resource(ResourceType.AGENT, priority=10)

    # Acquisisci - dovrebbe dare la priorita alta prima
    r1 = await pool.acquire(ResourceType.AGENT, "t1")
    assert r1.priority == 10  # Alta priorita prima

    r2 = await pool.acquire(ResourceType.AGENT, "t2")
    assert r2.priority == 5

    r3 = await pool.acquire(ResourceType.AGENT, "t3")
    assert r3.priority == 1

    await pool.release(r1.resource_id)
    await pool.release(r2.resource_id)
    await pool.release(r3.resource_id)
    await pool.shutdown()


# =============================================================================
# TEST RATE LIMITING
# =============================================================================

@pytest.mark.asyncio
async def test_rate_limit_allow():
    """Test rate limit - richieste permesse."""
    pool = ResourcePool()
    await pool.initialize({
        "api_limits": {"test_api": 10}
    })

    # Prime richieste dovrebbero essere permesse
    for _ in range(5):
        assert await pool.check_rate_limit("test_api") is True

    await pool.shutdown()


@pytest.mark.asyncio
async def test_rate_limit_register():
    """Test registrazione rate limiter."""
    pool = ResourcePool()
    await pool.initialize({})

    pool.register_api_rate_limit("new_api", 50)

    assert "new_api" in pool._rate_limiters
    assert pool._rate_limiters["new_api"].requests_per_second == 50

    await pool.shutdown()


# =============================================================================
# TEST STATISTICHE
# =============================================================================

@pytest.mark.asyncio
async def test_get_stats(pool):
    """Test ottenimento statistiche."""
    # Acquisisci alcune risorse
    r1 = await pool.acquire(ResourceType.AGENT, "t1")
    r2 = await pool.acquire(ResourceType.SKILL, "t2")

    stats = await pool.get_stats()

    assert "total_resources" in stats
    assert "available" in stats
    assert "allocated" in stats
    assert stats["allocated"] == 2

    await pool.release(r1.resource_id)
    await pool.release(r2.resource_id)

    stats = await pool.get_stats()
    assert stats["allocated"] == 0


@pytest.mark.asyncio
async def test_metrics_tracking(pool):
    """Test tracking metriche."""
    r1 = await pool.acquire(ResourceType.AGENT, "t1")
    r2 = await pool.acquire(ResourceType.SKILL, "t2")

    metrics = pool._metrics

    assert metrics.total_acquired == 2
    assert metrics.current_allocated == 2
    assert metrics.peak_allocated == 2

    await pool.release(r1.resource_id)

    assert metrics.total_released == 1
    assert metrics.current_allocated == 1

    await pool.release(r2.resource_id)


# =============================================================================
# TEST CONTEXT MANAGER
# =============================================================================

@pytest.mark.asyncio
async def test_context_manager(pool):
    """Test context manager per acquisizione automatica."""
    async with pool.acquire_context(ResourceType.AGENT, "ctx_test") as res:
        assert res is not None
        assert res.state == ResourceState.ALLOCATED
        # Dentro il context, risorsa allocata
        stats = await pool.get_stats()
        assert stats["allocated"] >= 1

    # Fuori dal context, rilasciata automaticamente
    stats = await pool.get_stats()
    # La risorsa e stata rilasciata
    assert res.state == ResourceState.AVAILABLE


# =============================================================================
# TEST CLEANUP STALE
# =============================================================================

@pytest.mark.asyncio
async def test_cleanup_stale():
    """Test cleanup risorse stale."""
    pool = ResourcePool()
    await pool.initialize({})

    # Crea risorsa
    resource = await pool._create_resource(ResourceType.AGENT)

    # Simula stale (modifica last_used_at)
    pool._resources[resource.resource_id].last_used_at = time.time() - 400

    # Cleanup
    cleaned = await pool._cleanup_stale_unlocked()

    assert cleaned == 1
    assert resource.resource_id not in pool._resources

    await pool.shutdown()


# =============================================================================
# TEST SINGLETON
# =============================================================================

@pytest.mark.asyncio
async def test_singleton():
    """Test singleton pattern."""
    await reset_resource_pool()

    p1 = await get_resource_pool({"max_resources": 100})
    p2 = await get_resource_pool()

    assert p1 is p2

    await reset_resource_pool()


# =============================================================================
# TEST SHUTDOWN
# =============================================================================

@pytest.mark.asyncio
async def test_shutdown():
    """Test shutdown pulito."""
    pool = ResourcePool()
    await pool.initialize({})

    # Acquisisci risorse
    r1 = await pool.acquire(ResourceType.AGENT, "t1")
    r2 = await pool.acquire(ResourceType.SKILL, "t2")

    # Shutdown
    await pool.shutdown()

    # Verifica pulizia
    assert len(pool._resources) == 0
    assert len(pool._allocated) == 0
    assert pool._running is False


# =============================================================================
# TEST CONCORRENZA
# =============================================================================

@pytest.mark.asyncio
async def test_concurrent_acquire():
    """Test acquisizione concorrente."""
    pool = ResourcePool()
    await pool.initialize({"max_resources": 50})

    async def acquire_and_release(task_id):
        resource = await pool.acquire(ResourceType.AGENT, f"task_{task_id}")
        if resource:
            await asyncio.sleep(0.01)  # Simula lavoro
            await pool.release(resource.resource_id)
            return True
        return False

    # Lancia 20 task concorrenti
    tasks = [acquire_and_release(i) for i in range(20)]
    results = await asyncio.gather(*tasks)

    # Tutti dovrebbero aver acquisito con successo
    assert sum(results) >= 15  # Almeno 15 su 20

    # Verifica consistenza
    stats = await pool.get_stats()
    assert stats["allocated"] == 0

    await pool.shutdown()


# =============================================================================
# TEST RATE LIMIT TRACKER
# =============================================================================

def test_rate_limit_tracker_basic():
    """Test base del RateLimitTracker."""
    tracker = RateLimitTracker("test", requests_per_second=10)

    # Prime acquisizioni dovrebbero funzionare
    for _ in range(5):
        assert tracker.acquire(1) is True


def test_rate_limit_tracker_exhaust():
    """Test esaurimento token."""
    tracker = RateLimitTracker("test", requests_per_second=10, tokens=5)

    # Usa tutti i token
    for _ in range(5):
        assert tracker.acquire(1) is True

    # Ora dovrebbe fallire
    assert tracker.acquire(1) is False


# =============================================================================
# TEST POOLED RESOURCE
# =============================================================================

def test_pooled_resource_is_available():
    """Test is_available()."""
    resource = PooledResource(
        resource_id="test",
        resource_type=ResourceType.AGENT
    )

    assert resource.is_available() is True

    resource.state = ResourceState.ALLOCATED
    assert resource.is_available() is False


def test_pooled_resource_is_stale():
    """Test is_stale()."""
    resource = PooledResource(
        resource_id="test",
        resource_type=ResourceType.AGENT
    )

    assert resource.is_stale(timeout=300) is False

    # Simula vecchia
    resource.last_used_at = time.time() - 400
    assert resource.is_stale(timeout=300) is True


# =============================================================================
# TEST MEMORY GUARD (MOCKED)
# =============================================================================

@pytest.mark.asyncio
async def test_memory_guard_no_psutil():
    """Test memory guard quando psutil non disponibile."""
    pool = ResourcePool()
    await pool.initialize({})

    # Mock psutil non disponibile
    with patch('lib.resource_pool.PSUTIL_AVAILABLE', False):
        # Non dovrebbe crashare
        await pool._check_memory_and_cleanup()

    await pool.shutdown()


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
