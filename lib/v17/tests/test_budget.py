"""
Tests for Hierarchical Budget Manager - V17

Run with: pytest lib/v17/tests/test_budget.py -v
"""

import asyncio
import time

import pytest

from lib.v17.budget import (
    BudgetAllocation,
    BudgetAlert,
    BudgetContextManager,
    BudgetExhaustedError,
    BudgetReport,
    BudgetTier,
    BudgetThrottledError,
    BudgetUsage,
    DEFAULT_TIER_BUDGETS,
    HierarchicalBudgetManager,
    WARNING_THRESHOLD,
    THROTTLE_THRESHOLD,
    CRITICAL_THRESHOLD,
)


class TestBudgetTier:
    """Tests for BudgetTier enum."""

    def test_tier_values(self) -> None:
        """Verify tier values."""
        assert BudgetTier.CORE.value == "core"
        assert BudgetTier.L1.value == "l1"
        assert BudgetTier.L2.value == "l2"
        assert BudgetTier.PLUGIN.value == "plugin"
        assert BudgetTier.CUSTOM.value == "custom"

    def test_default_budgets_exist(self) -> None:
        """Verify default budgets for all tiers."""
        assert BudgetTier.CORE in DEFAULT_TIER_BUDGETS
        assert BudgetTier.L1 in DEFAULT_TIER_BUDGETS
        assert BudgetTier.L2 in DEFAULT_TIER_BUDGETS
        assert BudgetTier.PLUGIN in DEFAULT_TIER_BUDGETS
        assert BudgetTier.CUSTOM in DEFAULT_TIER_BUDGETS


class TestBudgetAllocation:
    """Tests for BudgetAllocation dataclass."""

    def test_allocation_creation(self) -> None:
        """Test basic allocation creation."""
        allocation = BudgetAllocation(
            agent_name="core/coder.md",
            tier=BudgetTier.CORE,
            total=100_000,
        )

        assert allocation.agent_name == "core/coder.md"
        assert allocation.tier == BudgetTier.CORE
        assert allocation.total == 100_000
        assert allocation.used == 0
        assert allocation.reserved == 0
        assert allocation.available == 100_000
        assert allocation.utilization == 0.0

    def test_allocation_available(self) -> None:
        """Test available calculation."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=300,
            reserved=200,
        )

        assert allocation.available == 500

    def test_allocation_utilization(self) -> None:
        """Test utilization calculation."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=500,
        )

        assert allocation.utilization == 0.5

    def test_allocation_is_exhausted(self) -> None:
        """Test exhausted detection."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=900,
            reserved=100,
        )

        assert allocation.is_exhausted()

    def test_allocation_is_warning(self) -> None:
        """Test warning threshold detection."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=800,
        )

        assert allocation.is_warning()
        assert not allocation.is_throttled()

    def test_allocation_is_throttled(self) -> None:
        """Test throttle threshold detection."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=900,
        )

        assert allocation.is_throttled()

    def test_allocation_is_critical(self) -> None:
        """Test critical threshold detection."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=950,
        )

        assert allocation.is_critical()

    def test_allocation_to_dict(self) -> None:
        """Test serialization to dict."""
        allocation = BudgetAllocation(
            agent_name="test",
            tier=BudgetTier.CORE,
            total=1000,
            used=500,
        )

        data = allocation.to_dict()

        assert data["agent_name"] == "test"
        assert data["tier"] == "core"
        assert data["total"] == 1000
        assert data["used"] == 500
        assert data["utilization"] == 0.5


class TestBudgetUsage:
    """Tests for BudgetUsage dataclass."""

    def test_usage_creation(self) -> None:
        """Test basic usage creation."""
        usage = BudgetUsage(
            agent_name="test",
            amount=100,
            timestamp=time.time(),
            operation="test_op",
        )

        assert usage.agent_name == "test"
        assert usage.amount == 100
        assert usage.operation == "test_op"
        assert not usage.committed

    def test_usage_to_dict(self) -> None:
        """Test serialization to dict."""
        usage = BudgetUsage(
            agent_name="test",
            amount=100,
            timestamp=time.time(),
        )

        data = usage.to_dict()

        assert data["agent_name"] == "test"
        assert data["amount"] == 100


class TestBudgetAlert:
    """Tests for BudgetAlert dataclass."""

    def test_alert_creation(self) -> None:
        """Test basic alert creation."""
        alert = BudgetAlert(
            agent_name="test",
            alert_type="warning",
            threshold=0.8,
            current_value=0.85,
            message="Test alert",
        )

        assert alert.agent_name == "test"
        assert alert.alert_type == "warning"
        assert alert.timestamp > 0

    def test_alert_to_dict(self) -> None:
        """Test serialization to dict."""
        alert = BudgetAlert(
            agent_name="test",
            alert_type="critical",
            threshold=0.95,
            current_value=0.97,
            message="Critical!",
        )

        data = alert.to_dict()

        assert data["agent_name"] == "test"
        assert data["alert_type"] == "critical"


class TestHierarchicalBudgetManager:
    """Tests for HierarchicalBudgetManager."""

    @pytest.mark.asyncio
    async def test_initialize(self) -> None:
        """Test manager initialization."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=500_000)

        assert manager.is_initialized
        assert manager.global_budget == 500_000

    @pytest.mark.asyncio
    async def test_get_budget_core_agent(self) -> None:
        """Test getting budget for core agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        allocation = await manager.get_budget("core/coder.md")

        assert allocation.agent_name == "core/coder.md"
        assert allocation.tier == BudgetTier.CORE
        assert allocation.total >= 60_000

    @pytest.mark.asyncio
    async def test_get_budget_l1_agent(self) -> None:
        """Test getting budget for L1 agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        allocation = await manager.get_budget("experts/database_expert.md")

        assert allocation.agent_name == "experts/database_expert.md"
        assert allocation.tier == BudgetTier.L1
        assert allocation.total == DEFAULT_TIER_BUDGETS[BudgetTier.L1][0]

    @pytest.mark.asyncio
    async def test_get_budget_l2_agent(self) -> None:
        """Test getting budget for L2 agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        allocation = await manager.get_budget("experts/L2/gui-layout-specialist.md")

        assert allocation.agent_name == "experts/L2/gui-layout-specialist.md"
        assert allocation.tier == BudgetTier.L2
        assert allocation.total == DEFAULT_TIER_BUDGETS[BudgetTier.L2][0]

    @pytest.mark.asyncio
    async def test_get_budget_same_agent_twice(self) -> None:
        """Test getting budget twice returns same allocation."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        allocation1 = await manager.get_budget("core/coder.md")
        allocation2 = await manager.get_budget("core/coder.md")

        assert allocation1.agent_name == allocation2.agent_name

    @pytest.mark.asyncio
    async def test_reserve_success(self) -> None:
        """Test successful reserve."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")

        result = await manager.reserve("core/coder.md", 1000)

        assert result is True

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.reserved == 1000

    @pytest.mark.asyncio
    async def test_reserve_insufficient_budget(self) -> None:
        """Test reserve with insufficient budget."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        allocation = await manager.get_budget("core/coder.md")

        with pytest.raises(BudgetExhaustedError):
            await manager.reserve("core/coder.md", allocation.total + 1000)

    @pytest.mark.asyncio
    async def test_commit_success(self) -> None:
        """Test successful commit."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)

        await manager.commit("core/coder.md", 800)

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 800

    @pytest.mark.asyncio
    async def test_commit_less_than_reserved(self) -> None:
        """Test commit less than reserved."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 500)

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 500

    @pytest.mark.asyncio
    async def test_rollback_success(self) -> None:
        """Test successful rollback."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.rollback("core/coder.md")

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.reserved == 0
        assert allocation.used == 0

    @pytest.mark.asyncio
    async def test_check_budget_available(self) -> None:
        """Test check budget availability."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        allocation = await manager.get_budget("core/coder.md")

        result = await manager.check_budget("core/coder.md", allocation.total)
        assert result is True

        result = await manager.check_budget("core/coder.md", allocation.total + 1)
        assert result is False

    @pytest.mark.asyncio
    async def test_get_usage(self) -> None:
        """Test getting usage."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 800)

        usage = manager.get_usage("core/coder.md")
        assert usage is not None
        assert usage.used == 800

    @pytest.mark.asyncio
    async def test_get_usage_nonexistent(self) -> None:
        """Test getting usage for non-existent agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        usage = manager.get_usage("nonexistent/agent.md")
        assert usage is None

    @pytest.mark.asyncio
    async def test_get_all_usage(self) -> None:
        """Test getting all usage."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.get_budget("experts/database_expert.md")

        all_usage = manager.get_all_usage()

        assert "core/coder.md" in all_usage
        assert "experts/database_expert.md" in all_usage

    @pytest.mark.asyncio
    async def test_reset_agent(self) -> None:
        """Test reset single agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 800)

        await manager.reset("core/coder.md")

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 0
        assert allocation.reserved == 0

    @pytest.mark.asyncio
    async def test_reset_all(self) -> None:
        """Test reset all agents."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 800)

        await manager.get_budget("experts/database_expert.md")
        await manager.reserve("experts/database_expert.md", 500)

        await manager.reset_all()

        all_usage = manager.get_all_usage()
        for allocation in all_usage.values():
            assert allocation.used == 0
            assert allocation.reserved == 0

    @pytest.mark.asyncio
    async def test_rebalance(self) -> None:
        """Test rebalance functionality."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        # Create some allocations
        await manager.get_budget("core/coder.md")
        await manager.get_budget("experts/database_expert.md")

        result = await manager.rebalance()

        assert "timestamp" in result
        assert "reallocations" in result
        assert "tier_summaries" in result

    @pytest.mark.asyncio
    async def test_get_summary(self) -> None:
        """Test get summary."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.get_budget("experts/database_expert.md")

        summary = manager.get_summary()

        assert "global" in summary
        assert "by_tier" in summary
        assert "by_status" in summary
        assert "agent_count" in summary
        assert summary["agent_count"] == 2

    @pytest.mark.asyncio
    async def test_alert_on_warning(self) -> None:
        """Test alert generation on warning threshold."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        alerts_received = []

        def alert_callback(alert: BudgetAlert) -> None:
            alerts_received.append(alert)

        manager.register_alert_callback(alert_callback)

        # Get budget and use 80%+
        allocation = await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", int(allocation.total * 0.85))

        # Should have generated warning alert
        assert len(alerts_received) > 0

    @pytest.mark.asyncio
    async def test_context_manager_success(self) -> None:
        """Test context manager with successful operation."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")

        async with manager.use_budget("core/coder.md", 1000):
            pass  # Simulated successful operation

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 1000

    @pytest.mark.asyncio
    async def test_context_manager_failure(self) -> None:
        """Test context manager with failed operation."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")

        try:
            async with manager.use_budget("core/coder.md", 1000):
                raise RuntimeError("Simulated failure")
        except RuntimeError:
            pass

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 0  # Should be rolled back

    @pytest.mark.asyncio
    async def test_set_agent_budget(self) -> None:
        """Test setting custom budget for agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        manager.set_agent_budget("custom/agent.md", 75_000)

        allocation = await manager.get_budget("custom/agent.md")
        assert allocation.total == 75_000

    @pytest.mark.asyncio
    async def test_set_agent_budget_with_tier(self) -> None:
        """Test setting custom budget with tier."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        manager.set_agent_budget("test/agent.md", 50_000, BudgetTier.L1)

        allocation = await manager.get_budget("test/agent.md")
        assert allocation.total == 50_000
        assert allocation.tier == BudgetTier.L1

    @pytest.mark.asyncio
    async def test_global_budget_tracking(self) -> None:
        """Test global budget tracking."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        initial_available = manager.global_available

        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 1000)

        assert manager.global_used == 1000
        assert manager.global_available == initial_available - 1000

    @pytest.mark.asyncio
    async def test_get_history(self) -> None:
        """Test getting usage history."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", 1000)
        await manager.commit("core/coder.md", 800)

        history = manager.get_history("core/coder.md")

        assert len(history) > 0
        assert any(u.agent_name == "core/coder.md" for u in history)

    @pytest.mark.asyncio
    async def test_get_alerts(self) -> None:
        """Test getting alerts."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        allocation = await manager.get_budget("core/coder.md")
        await manager.reserve("core/coder.md", int(allocation.total * 0.95))

        alerts = manager.get_alerts()

        assert len(alerts) > 0


class TestBudgetContextManager:
    """Tests for BudgetContextManager."""

    @pytest.mark.asyncio
    async def test_manual_commit(self) -> None:
        """Test manual commit in context."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")

        async with manager.use_budget("core/coder.md", 1000) as ctx:
            await ctx.commit(800)

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 800

    @pytest.mark.asyncio
    async def test_manual_rollback(self) -> None:
        """Test manual rollback in context."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        await manager.get_budget("core/coder.md")

        async with manager.use_budget("core/coder.md", 1000) as ctx:
            await ctx.rollback()

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 0


class TestExceptions:
    """Tests for custom exceptions."""

    def test_budget_exhausted_error(self) -> None:
        """Test BudgetExhaustedError."""
        error = BudgetExhaustedError("test/agent.md", 100, 500)

        assert error.agent_name == "test/agent.md"
        assert error.available == 100
        assert error.requested == 500
        assert "Budget exhausted" in str(error)

    def test_budget_throttled_error(self) -> None:
        """Test BudgetThrottledError."""
        error = BudgetThrottledError("test/agent.md", 0.95)

        assert error.agent_name == "test/agent.md"
        assert error.utilization == 0.95
        assert "throttled" in str(error)


class TestConcurrency:
    """Tests for concurrent operations."""

    @pytest.mark.asyncio
    async def test_concurrent_reserves(self) -> None:
        """Test concurrent reserve operations."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=10_000_000)
        await manager.get_budget("core/coder.md")

        async def reserve_and_commit(amount: int) -> int:
            await manager.reserve("core/coder.md", amount)
            await asyncio.sleep(0.01)  # Simulate work
            await manager.commit("core/coder.md", amount)
            return amount

        # Run multiple concurrent operations
        results = await asyncio.gather(
            reserve_and_commit(1000),
            reserve_and_commit(1000),
            reserve_and_commit(1000),
        )

        assert sum(results) == 3000

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 3000

    @pytest.mark.asyncio
    async def test_concurrent_different_agents(self) -> None:
        """Test concurrent operations on different agents."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=10_000_000)

        async def use_agent(agent_name: str, amount: int) -> None:
            await manager.get_budget(agent_name)
            await manager.reserve(agent_name, amount)
            await manager.commit(agent_name, amount)

        await asyncio.gather(
            use_agent("core/coder.md", 1000),
            use_agent("core/analyzer.md", 1000),
            use_agent("experts/database_expert.md", 1000),
        )

        all_usage = manager.get_all_usage()
        assert len(all_usage) == 3


class TestV17API:
    """Tests for V17 API methods."""

    @pytest.mark.asyncio
    async def test_allocate_method(self) -> None:
        """Test allocate() method."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        # Alloca budget per nuovo agente
        allocation = manager.allocate("custom/new_agent.md", 75_000)

        assert allocation.agent_name == "custom/new_agent.md"
        assert allocation.total == 75_000
        assert allocation.allocated == 75_000
        assert allocation.remaining == 75_000

    @pytest.mark.asyncio
    async def test_allocate_existing_agent(self) -> None:
        """Test allocate() on existing agent updates budget."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        # Prima allocazione
        allocation1 = manager.allocate("core/coder.md", 60_000)
        assert allocation1.total == 60_000

        # Aggiorna allocazione
        allocation2 = manager.allocate("core/coder.md", 80_000)
        assert allocation2.total == 80_000

    @pytest.mark.asyncio
    async def test_consume_success(self) -> None:
        """Test consume() with sufficient budget."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        manager.allocate("core/coder.md", 50_000)

        # Consuma token
        result = manager.consume("core/coder.md", 1000)

        assert result is True

        allocation = manager.get_usage("core/coder.md")
        assert allocation is not None
        assert allocation.used == 1000
        assert allocation.consumed == 1000

    @pytest.mark.asyncio
    async def test_consume_insufficient_budget(self) -> None:
        """Test consume() with insufficient budget."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        manager.allocate("core/coder.md", 1000)

        # Tenta di consumare piu' del disponibile
        result = manager.consume("core/coder.md", 2000)

        assert result is False

        allocation = manager.get_usage("core/coder.md")
        assert allocation.used == 0

    @pytest.mark.asyncio
    async def test_get_remaining_global(self) -> None:
        """Test get_remaining() for global budget."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        remaining = manager.get_remaining()
        assert remaining == 1_000_000

        manager.allocate("core/coder.md", 50_000)
        manager.consume("core/coder.md", 5000)

        remaining = manager.get_remaining()
        assert remaining == 995_000

    @pytest.mark.asyncio
    async def test_get_remaining_agent(self) -> None:
        """Test get_remaining() for specific agent."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)
        manager.allocate("core/coder.md", 50_000)

        remaining = manager.get_remaining("core/coder.md")
        assert remaining == 50_000

        manager.consume("core/coder.md", 10000)

        remaining = manager.get_remaining("core/coder.md")
        assert remaining == 40_000

    @pytest.mark.asyncio
    async def test_get_remaining_nonexistent_agent(self) -> None:
        """Test get_remaining() for non-existent agent returns tier default."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        # Per agente non esistente, ritorna default del tier
        remaining = manager.get_remaining("core/unknown.md")
        # CORE tier default e' 60_000
        assert remaining >= 60_000

    def test_adjust_simple(self) -> None:
        """Test adjust() for simple task (complexity 0)."""
        manager = HierarchicalBudgetManager()
        # Non serve initialize per adjust()

        simple_budget = manager.adjust(0.0)
        # Con complexity 0, dovrebbe ritornare il base budget
        assert simple_budget >= 10_000

    def test_adjust_complex(self) -> None:
        """Test adjust() for complex task (complexity 1.0)."""
        manager = HierarchicalBudgetManager()

        complex_budget = manager.adjust(1.0)
        # Con complexity 1.0, budget dovrebbe essere ~2x base
        assert complex_budget >= 20_000

    def test_adjust_negative(self) -> None:
        """Test adjust() with negative complexity."""
        manager = HierarchicalBudgetManager()

        reduced_budget = manager.adjust(-0.5)
        # Con complexity -0.5, budget dovrebbe essere ~0.5x base
        assert reduced_budget >= 10_000  # Min clamp

    def test_adjust_clamp_max(self) -> None:
        """Test adjust() clamps to max."""
        manager = HierarchicalBudgetManager()

        huge_budget = manager.adjust(10.0)  # Way above max
        # Dovrebbe essere clamped a max_budget
        assert huge_budget <= 500_000

    @pytest.mark.asyncio
    async def test_get_report(self) -> None:
        """Test get_report() method."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        # Crea alcune allocazioni
        manager.allocate("core/coder.md", 50_000)
        manager.allocate("experts/database_expert.md", 30_000)
        manager.consume("core/coder.md", 5000)

        report = manager.get_report()

        assert report.global_total == 1_000_000
        assert report.global_used == 5000
        assert report.global_remaining == 995_000
        assert "core/coder.md" in report.by_agent
        assert "experts/database_expert.md" in report.by_agent
        assert report.by_agent["core/coder.md"]["consumed"] == 5000
        assert report.by_agent["core/coder.md"]["percentage_used"] == 10.0

    @pytest.mark.asyncio
    async def test_get_report_by_tier(self) -> None:
        """Test get_report() aggregates by tier."""
        manager = HierarchicalBudgetManager()
        await manager.initialize(global_budget=1_000_000)

        manager.allocate("core/coder.md", 60_000)
        manager.allocate("core/analyzer.md", 40_000)
        manager.consume("core/coder.md", 10000)
        manager.consume("core/analyzer.md", 5000)

        report = manager.get_report()

        assert "core" in report.by_tier
        assert report.by_tier["core"]["agent_count"] == 2
        assert report.by_tier["core"]["used"] == 15000

    def test_budget_allocation_properties(self) -> None:
        """Test BudgetAllocation V17 properties."""
        allocation = BudgetAllocation(
            agent_name="test/agent.md",
            tier=BudgetTier.CORE,
            total=100000,
            used=25000,
        )

        # V17 alias properties
        assert allocation.allocated == 100000
        assert allocation.consumed == 25000
        assert allocation.remaining == 75000
        assert allocation.percentage_used == 25.0

    def test_budget_report_to_dict(self) -> None:
        """Test BudgetReport serialization."""
        report = BudgetReport(
            global_total=1_000_000,
            global_used=500_000,
            global_remaining=500_000,
            global_utilization=0.5,
            by_agent={"test": {"allocated": 1000}},
            by_tier={"core": {"total": 1000}},
            alerts=[{"type": "warning"}],
        )

        data = report.to_dict()

        assert data["global_total"] == 1_000_000
        assert data["global_utilization"] == 0.5
        assert "test" in data["by_agent"]
        assert "core" in data["by_tier"]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
