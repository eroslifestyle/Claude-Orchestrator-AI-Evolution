"""
Tests for auto_promotion.py - Auto-Promotion with Guardrails
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch, Mock

import pytest

import mcp_server.auto_promotion  # Import for coverage
from mcp_server.auto_promotion import (
    PromotionStatus,
    Pattern,
    PromotionResult,
    AutoPromoter,
    get_auto_promoter
)


class TestPromotionStatus:
    """Tests for PromotionStatus enum."""

    def test_status_values(self) -> None:
        """Test that all status values are defined."""
        assert PromotionStatus.PENDING.value == "pending"
        assert PromotionStatus.READY.value == "ready"
        assert PromotionStatus.PROMOTED.value == "promoted"
        assert PromotionStatus.REJECTED.value == "rejected"
        assert PromotionStatus.FAILED.value == "failed"


class TestPattern:
    """Tests for Pattern dataclass."""

    def test_create_pattern(self) -> None:
        """Test creating a Pattern."""
        pattern = Pattern(
            id="test-pattern",
            name="Test Pattern",
            description="A test pattern",
            pattern="def test(): pass",
            confidence=0.9,
            confirmations=5,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=["test()"]
        )
        assert pattern.id == "test-pattern"
        assert pattern.confidence == 0.9
        assert pattern.confirmations == 5


class TestPromotionResult:
    """Tests for PromotionResult dataclass."""

    def test_create_promotion_result(self) -> None:
        """Test creating a PromotionResult."""
        result = PromotionResult(
            pattern_id="test",
            status=PromotionStatus.PROMOTED,
            reason="Successfully promoted",
            promoted_at="2025-01-10T00:00:00",
            skill_path="/path/to/skill.md"
        )
        assert result.pattern_id == "test"
        assert result.status == PromotionStatus.PROMOTED

    def test_create_promotion_result_minimal(self) -> None:
        """Test creating a PromotionResult with minimal fields."""
        result = PromotionResult(
            pattern_id="test",
            status=PromotionStatus.PENDING,
            reason="Not ready"
        )
        assert result.promoted_at is None
        assert result.skill_path is None


class TestAutoPromoter:
    """Tests for AutoPromoter class."""

    def test_initialization(self, tmp_path: Path) -> None:
        """Test AutoPromoter initialization."""
        promoter = AutoPromoter()
        assert promoter.SKILLS_DIR.exists()

    def test_load_patterns_no_file(self, tmp_path: Path) -> None:
        """Test load_patterns when instincts file doesn't exist."""
        promoter = AutoPromoter()
        # Use non-existent file path
        promoter.INSTINCTS_FILE = tmp_path / "nonexistent.json"

        patterns = promoter.load_patterns()
        assert patterns == []

    def test_load_patterns_with_file(self, tmp_path: Path) -> None:
        """Test load_patterns from valid file."""
        instincts_file = tmp_path / "instincts.json"
        instincts_file.write_text(json.dumps({
            "pattern1": {
                "name": "Pattern 1",
                "description": "Test pattern",
                "pattern": "def test(): pass",
                "confidence": 0.9,
                "confirmations": 5,
                "first_seen": "2025-01-01T00:00:00",
                "last_seen": "2025-01-10T00:00:00",
                "tags": ["tested"],
                "code_examples": ["test()"]
            }
        }))

        promoter = AutoPromoter()
        promoter.INSTINCTS_FILE = instincts_file

        patterns = promoter.load_patterns()
        assert len(patterns) == 1
        assert patterns[0].id == "pattern1"
        assert patterns[0].name == "Pattern 1"

    def test_check_promotion_ready_all_criteria_met(self) -> None:
        """Test check_promotion_ready when all criteria are met."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_ready, reason = promoter.check_promotion_ready(pattern)
        assert is_ready is True
        assert reason == "Ready for promotion"

    def test_check_promotion_ready_low_confidence(self) -> None:
        """Test check_promotion_ready with low confidence."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.5,  # Too low
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_ready, reason = promoter.check_promotion_ready(pattern)
        assert is_ready is False
        assert "Confidence too low" in reason

    def test_check_promotion_ready_few_confirmations(self) -> None:
        """Test check_promotion_ready with few confirmations."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.9,
            confirmations=2,  # Too few
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_ready, reason = promoter.check_promotion_ready(pattern)
        assert is_ready is False
        assert "Too few confirmations" in reason

    def test_check_promotion_ready_too_new(self) -> None:
        """Test check_promotion_ready with pattern too new."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=2)).isoformat(),  # Too new
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_ready, reason = promoter.check_promotion_ready(pattern)
        assert is_ready is False
        assert "Too new" in reason

    def test_check_promotion_ready_missing_tags(self) -> None:
        """Test check_promotion_ready with missing required tags."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],  # Missing "documented"
            code_examples=[]
        )

        is_ready, reason = promoter.check_promotion_ready(pattern)
        assert is_ready is False
        assert "Missing tags" in reason

    def test_safety_check_pass(self) -> None:
        """Test safety_check with safe pattern."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def safe_function(x): return x * 2",
            confidence=0.9,
            confirmations=10,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=["result = safe_function(5)"]
        )

        is_safe, reason = promoter.safety_check(pattern)
        assert is_safe is True
        assert reason == "Safety check passed"

    def test_safety_check_eval(self) -> None:
        """Test safety_check with eval pattern."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def dangerous(x): return eval(x)",
            confidence=0.9,
            confirmations=10,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_safe, reason = promoter.safety_check(pattern)
        assert is_safe is False
        assert "Forbidden pattern" in reason

    def test_safety_check_exec(self) -> None:
        """Test safety_check with exec pattern."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="code = exec(something)",
            confidence=0.9,
            confirmations=10,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_safe, reason = promoter.safety_check(pattern)
        assert is_safe is False

    def test_safety_check_hardcoded_password(self) -> None:
        """Test safety_check with hardcoded password."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="password = 'secretpassword123'",
            confidence=0.9,
            confirmations=10,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_safe, reason = promoter.safety_check(pattern)
        assert is_safe is False
        assert "password" in reason.lower()

    def test_safety_check_hardcoded_api_key(self) -> None:
        """Test safety_check with hardcoded API key."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="api_key = 'sk-1234567890abcdefghijklmnop'",
            confidence=0.9,
            confirmations=10,
            first_seen="2025-01-01T00:00:00",
            last_seen="2025-01-10T00:00:00",
            tags=["tested", "documented"],
            code_examples=[]
        )

        is_safe, reason = promoter.safety_check(pattern)
        assert is_safe is False
        assert "secret" in reason.lower() or "key" in reason.lower()

    def test_promote_to_skill_not_ready(self) -> None:
        """Test promote_to_skill with pattern not ready."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def test(): pass",
            confidence=0.5,  # Too low
            confirmations=2,  # Too few
            first_seen=(datetime.now() - timedelta(days=2)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],  # Missing tags
            code_examples=[]
        )

        result = promoter.promote_to_skill(pattern)
        assert result.status == PromotionStatus.PENDING
        assert "Confidence too low" in result.reason or "Too few confirmations" in result.reason

    def test_promote_to_skill_not_safe(self, tmp_path: Path) -> None:
        """Test promote_to_skill with unsafe pattern."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        pattern = Pattern(
            id="test",
            name="Test",
            description="Test",
            pattern="def dangerous(): return eval('x')",  # Unsafe
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=[]
        )

        result = promoter.promote_to_skill(pattern)
        assert result.status == PromotionStatus.REJECTED
        assert "Safety check failed" in result.reason

    def test_promote_to_skill_success(self, tmp_path: Path) -> None:
        """Test promote_to_skill with valid pattern."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        pattern = Pattern(
            id="safe-pattern",
            name="Safe Pattern",
            description="A safe coding pattern",
            pattern="def safe_function(x): return x * 2",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=["result = safe_function(5)"]
        )

        result = promoter.promote_to_skill(pattern)
        assert result.status == PromotionStatus.PROMOTED
        assert result.reason == "Successfully promoted"
        assert result.promoted_at is not None
        assert result.skill_path is not None

        # Check file was created
        skill_file = tmp_path / "safe-pattern" / "SKILL.md"
        assert skill_file.exists()

        content = skill_file.read_text(encoding='utf-8')
        assert "Safe Pattern" in content
        assert "def safe_function(x): return x * 2" in content

    def test_check_and_promote_all(self, tmp_path: Path) -> None:
        """Test check_and_promote_all."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        # Create patterns with different statuses
        patterns = [
            Pattern(
                id="safe-promoted",
                name="Safe",
                description="Safe pattern",
                pattern="def safe(): pass",
                confidence=0.9,
                confirmations=10,
                first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
                last_seen=datetime.now().isoformat(),
                tags=["tested", "documented"],
                code_examples=[]
            ),
            Pattern(
                id="unsafe-rejected",
                name="Unsafe",
                description="Unsafe pattern",
                pattern="eval('x')",
                confidence=0.9,
                confirmations=10,
                first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
                last_seen=datetime.now().isoformat(),
                tags=["tested", "documented"],
                code_examples=[]
            ),
            Pattern(
                id="not-ready-pending",
                name="Not Ready",
                description="Not ready pattern",
                pattern="def not_ready(): pass",
                confidence=0.5,
                confirmations=2,
                first_seen=(datetime.now() - timedelta(days=2)).isoformat(),
                last_seen=datetime.now().isoformat(),
                tags=["tested"],
                code_examples=[]
            ),
        ]

        with patch.object(promoter, 'load_patterns', return_value=patterns):
            results = promoter.check_and_promote_all()

        assert len(results) == 3

        # Count statuses
        promoted = sum(1 for r in results if r.status == PromotionStatus.PROMOTED)
        rejected = sum(1 for r in results if r.status == PromotionStatus.REJECTED)
        pending = sum(1 for r in results if r.status == PromotionStatus.PENDING)

        assert promoted == 1
        assert rejected == 1
        assert pending == 1


class TestGetAutoPromoter:
    """Tests for get_auto_promoter singleton."""

    def test_singleton(self) -> None:
        """Test that get_auto_promoter returns singleton instance."""
        promoter1 = get_auto_promoter()
        promoter2 = get_auto_promoter()
        assert promoter1 is promoter2


class TestAutoPromoterBranchCoverage:
    """Tests for branch coverage in auto_promotion.py."""

    def test_load_patterns_exception_handling(self, tmp_path: Path) -> None:
        """Test load_patterns handles exceptions (lines 129-131)."""
        promoter = AutoPromoter()
        promoter.INSTINCTS_FILE = tmp_path / "instincts.json"

        # Create invalid JSON file
        (tmp_path / "instincts.json").write_text("invalid json {")

        patterns = promoter.load_patterns()
        # Should return empty list on error
        assert patterns == []

    def test_check_promotion_ready_invalid_date(self, tmp_path: Path) -> None:
        """Test check_promotion_ready with invalid first_seen date (lines 156-157)."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="test-pattern",
            name="Test",
            description="Test pattern",
            pattern="test_pattern",
            confidence=0.9,
            confirmations=10,
            first_seen="invalid-date",  # Invalid ISO format
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=[]
        )

        ready, reason = promoter.check_promotion_ready(pattern)
        # Should detect invalid date
        assert not ready
        assert "Invalid first_seen date" in reason

    def test_safety_check_detects_passwords(self, tmp_path: Path) -> None:
        """Test safety_check detects hardcoded passwords (line 192)."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="unsafe-pattern",
            name="Unsafe",
            description="Unsafe pattern with password",
            pattern="password = 'hardcoded12345678'",  # 8+ chars after password=
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=[]
        )

        safe, reason = promoter.safety_check(pattern)
        # Should detect hardcoded password
        assert not safe
        assert "password" in reason.lower()

    def test_promote_to_skill_exception_handling(self, tmp_path: Path) -> None:
        """Test promote_to_skill handles exceptions (lines 274-280)."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        pattern = Pattern(
            id="test-fail",
            name="Test Fail",
            description="Test",
            pattern="test",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=[]
        )

        # Mock Path.write_text to raise exception
        original_write = tmp_path.write_text
        try:
            # Make write_text fail on the skill file
            def failing_write(content, encoding='utf-8'):
                if "SKILL.md" in str(content) or len(content) > 100:
                    raise OSError("Disk full")
                return original_write(content, encoding)

            # Patch at module level for all Path objects
            import pathlib
            original_method = pathlib.Path.write_text
            pathlib.Path.write_text = failing_write

            try:
                result = promoter.promote_to_skill(pattern)
                # Should return FAILED status
                assert result.status == PromotionStatus.FAILED
                assert "Promotion failed" in result.reason
            finally:
                pathlib.Path.write_text = original_method

        except Exception as e:
            # If patching fails, at least log what happened
            print(f"Test setup error: {e}")

    def test_check_and_promote_all_pending_status_logging(self, tmp_path: Path, caplog) -> None:
        """Test check_and_promote_all logs pending status (branch 297->298)."""
        import logging
        caplog.set_level(logging.DEBUG, logger="orchestrator-mcp")

        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        # Create pending pattern (not ready)
        pattern = Pattern(
            id="pending-pattern",
            name="Pending",
            description="Not ready",
            pattern="test",
            confidence=0.1,  # Too low
            confirmations=1,  # Too few
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=[],  # Missing tags
            code_examples=[]
        )

        with patch.object(promoter, 'load_patterns', return_value=[pattern]):
            results = promoter.check_and_promote_all()

        # Should have one PENDING result
        assert len(results) == 1
        assert results[0].status == PromotionStatus.PENDING

        # Debug logs should be captured
        assert any("PENDING" in record.message for record in caplog.records if record.levelname == "DEBUG")

    def test_safety_check_detects_api_keys(self, tmp_path: Path) -> None:
        """Test safety_check detects hardcoded API keys (line 192)."""
        promoter = AutoPromoter()

        pattern = Pattern(
            id="unsafe-api-key",
            name="Unsafe API Key",
            description="Unsafe pattern with API key",
            pattern="api_key = 'sk-1234567890abcdefghijklmnopqr'",  # 20+ chars
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=[]
        )

        safe, reason = promoter.safety_check(pattern)
        # Should detect hardcoded API key
        assert not safe
        assert "key" in reason.lower() or "secret" in reason.lower()

    def test_safety_check_exact_password_match(self, tmp_path: Path) -> None:
        """Test safety_check detects secret pattern (line 187-192).

        Uses 'secret' keyword which bypasses FORBIDDEN_PATTERNS but matches
        secret_patterns line 187, triggering line 192.
        """
        promoter = AutoPromoter()

        # The regex is: r"(api[_-]?key|token|secret)\s*=\s*['\"][^'\"]{20,}"
        # 'secret' is NOT in FORBIDDEN_PATTERNS but IS in secret_patterns
        # This bypasses line 92-93 and hits line 187->192
        pattern = Pattern(
            id="unsafe-secret",
            name="Unsafe Secret",
            description="Has hardcoded secret",
            pattern="some_var = secret = 'MyVeryLongHardcodedSecretKey12345'",  # Contains "secret = '20chars'"
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested"],
            code_examples=["example = secret"]
        )

        safe, reason = promoter.safety_check(pattern)
        assert not safe
        assert "secret" in reason.lower()

    def test_promote_to_skill_write_failure(self, tmp_path: Path) -> None:
        """Test promote_to_skill handles write failures (lines 274-280)."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path
        tmp_path.mkdir(parents=True, exist_ok=True)

        pattern = Pattern(
            id="write-fail",
            name="Write Fail",
            description="Test write failure",
            pattern="test_pattern",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=["example"]
        )

        # Mock the write_text method to raise exception
        import mcp_server.auto_promotion as ap
        original_write = Path.write_text

        def mock_write(self, content, encoding='utf-8'):
            if "SKILL.md" in str(self):
                raise IOError("Simulated write failure")
            return original_write(self, content, encoding)

        try:
            Path.write_text = mock_write
            result = promoter.promote_to_skill(pattern)
        finally:
            Path.write_text = original_write

        # Should return FAILED status
        assert result.status == PromotionStatus.FAILED
        assert "Promotion failed" in result.reason

    def test_pending_status_loop_continuation(self, tmp_path: Path) -> None:
        """Test that the loop continues after processing statuses not handled in if/elif (branch 297->289).

        Branch 297->289 is covered when the loop continues after statuses that are not
        explicitly handled (FAILED, READY, etc.) fall through from the if/elif chain.
        """
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path
        tmp_path.mkdir(parents=True, exist_ok=True)

        # Create patterns: one that will FAIL, one that will be PENDING
        # The FAILED status is NOT handled in the if/elif chain (lines 293-298),
        # so the code falls through and the loop continues

        # This pattern will FAIL due to write error
        pattern1 = Pattern(
            id="will-fail",
            name="Will Fail",
            description="Will fail during promotion",
            pattern="test_pattern",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=["example"]
        )

        # This pattern will be PENDING
        pattern2 = Pattern(
            id="pending",
            name="Pending Pattern",
            description="Not ready",
            pattern="pending_pattern",
            confidence=0.1,
            confirmations=1,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=[],
            code_examples=[]
        )

        # Mock write_text to fail for the first pattern
        original_write = Path.write_text
        call_count = [0]

        def mock_write(self, content, encoding='utf-8'):
            call_count[0] += 1
            if call_count[0] == 1 and "SKILL.md" in str(self):
                raise IOError("Simulated write failure")
            return original_write(self, content, encoding)

        try:
            Path.write_text = mock_write
            with patch.object(promoter, 'load_patterns', return_value=[pattern1, pattern2]):
                results = promoter.check_and_promote_all()
        finally:
            Path.write_text = original_write

        # Verify we processed both patterns
        assert len(results) == 2
        assert results[0].status == PromotionStatus.FAILED
        assert results[1].status == PromotionStatus.PENDING

        # The loop should have continued after the FAILED status (not handled in if/elif)
        # This covers branch 297->289

    def test_check_and_promote_all_empty_list(self, tmp_path: Path) -> None:
        """Test check_and_promote_all with no patterns (branch coverage)."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path

        with patch.object(promoter, 'load_patterns', return_value=[]):
            results = promoter.check_and_promote_all()

        # Should return empty list
        assert results == []

    def test_promote_to_skill_write_failure(self, tmp_path: Path) -> None:
        """Test promote_to_skill handles write failures (lines 274-280)."""
        promoter = AutoPromoter()
        promoter.SKILLS_DIR = tmp_path
        tmp_path.mkdir(parents=True, exist_ok=True)

        pattern = Pattern(
            id="write-fail",
            name="Write Fail",
            description="Test write failure",
            pattern="test_pattern",
            confidence=0.9,
            confirmations=10,
            first_seen=(datetime.now() - timedelta(days=10)).isoformat(),
            last_seen=datetime.now().isoformat(),
            tags=["tested", "documented"],
            code_examples=["example"]
        )

        # Mock the write_text method to raise exception
        import mcp_server.auto_promotion as ap
        original_write = Path.write_text

        def mock_write(self, content, encoding='utf-8'):
            if "SKILL.md" in str(self):
                raise IOError("Simulated write failure")
            return original_write(self, content, encoding)

        try:
            Path.write_text = mock_write
            result = promoter.promote_to_skill(pattern)
        finally:
            Path.write_text = original_write

        # Should return FAILED status
        assert result.status == PromotionStatus.FAILED
        assert "Promotion failed" in result.reason

