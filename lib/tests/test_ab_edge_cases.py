#!/usr/bin/env python
"""Unit tests for AB Testing Framework edge cases - Bug ABE1 fix.

Tests for division by zero in _z_test when p_pool == 0 or 1.

Run with: pytest test_ab_edge_cases.py -v
"""

import sys
import os
import tempfile
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_testing import ABTestingFramework, RoutingStrategy


class TestZTestEdgeCases:
    """Test edge cases in _z_test method."""

    @pytest.fixture
    def ab_framework(self):
        """Crea un framework A/B con storage temporaneo."""
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            test_path = f.name
        ab = ABTestingFramework(storage_path=test_path)
        yield ab
        # Cleanup
        try:
            os.unlink(test_path)
        except OSError:
            pass

    def test_z_test_all_failures(self, ab_framework):
        """Test _z_test quando entrambe le varianti hanno solo fallimenti (p_pool = 0).

        Edge case: p_pool = 0 -> z_score = 0, p_value = 1
        """
        control = RoutingStrategy('control', {'mode': 'haiku'})
        treatment = RoutingStrategy('treatment', {'mode': 'haiku'})
        ab_framework.create_experiment('all_failures', control, treatment)

        # Registra solo fallimenti per entrambe le varianti
        for i in range(60):
            variant = ab_framework.assign_variant('all_failures', f'user_{i}')
            ab_framework.record_result('all_failures', variant, success=False)

        result = ab_framework.get_result('all_failures')

        # Con tutti fallimenti, p_pool = 0 -> z_score = 0, p_value = 1
        assert result is not None
        assert result.z_score == 0.0, f"Expected z_score=0.0, got {result.z_score}"
        assert result.p_value == 1.0, f"Expected p_value=1.0, got {result.p_value}"
        assert not result.is_significant, "Should not be significant when all failures"
        assert result.winner is None, "No winner when all failures"

    def test_z_test_all_successes(self, ab_framework):
        """Test _z_test quando entrambe le varianti hanno solo successi (p_pool = 1).

        Edge case: p_pool = 1 -> z_score = 0, p_value = 1
        """
        control = RoutingStrategy('control', {'mode': 'haiku'})
        treatment = RoutingStrategy('treatment', {'mode': 'haiku'})
        ab_framework.create_experiment('all_successes', control, treatment)

        # Registra solo successi per entrambe le varianti
        for i in range(60):
            variant = ab_framework.assign_variant('all_successes', f'user_{i}')
            ab_framework.record_result('all_successes', variant, success=True)

        result = ab_framework.get_result('all_successes')

        # Con tutti successi, p_pool = 1 -> z_score = 0, p_value = 1
        assert result is not None
        assert result.z_score == 0.0, f"Expected z_score=0.0, got {result.z_score}"
        assert result.p_value == 1.0, f"Expected p_value=1.0, got {result.p_value}"
        assert not result.is_significant, "Should not be significant when all successes"
        assert result.winner is None, "No winner when all successes"

    def test_z_test_mixed_extremes(self, ab_framework):
        """Test _z_test con una variante tutti successi e l'altra tutti fallimenti.

        Questo caso NON dovrebbe causare divisione per zero perche p_pool != 0 e != 1.
        """
        control = RoutingStrategy('control', {'mode': 'haiku'})
        treatment = RoutingStrategy('treatment', {'mode': 'opus'})
        ab_framework.create_experiment('mixed_extremes', control, treatment)

        # Registra 30 fallimenti per control
        for i in range(30):
            variant = ab_framework.assign_variant('mixed_extremes', f'control_user_{i}')
            # Forza assegnazione a control
            if variant == 'control':
                ab_framework.record_result('mixed_extremes', variant, success=False)
            else:
                # Registra come treatment con successo
                ab_framework.record_result('mixed_extremes', variant, success=True)

        # Registra altri 30 successi per treatment
        for i in range(30, 60):
            variant = ab_framework.assign_variant('mixed_extremes', f'treatment_user_{i}')
            if variant == 'treatment':
                ab_framework.record_result('mixed_extremes', variant, success=True)
            else:
                ab_framework.record_result('mixed_extremes', variant, success=False)

        result = ab_framework.get_result('mixed_extremes')

        # Il test dovrebbe completarsi senza errori
        assert result is not None
        # Non verifichiamo i valori specifici perche dipendono dalla distribuzione
        # ma verifichiamo che non ci siano errori
        assert isinstance(result.z_score, float)
        assert isinstance(result.p_value, float)

    def test_z_test_direct_call(self, ab_framework):
        """Test diretto del metodo _z_test per edge cases."""
        # Test p_pool = 0 (entrambe le proporzioni = 0)
        z_score, p_value = ab_framework._z_test(0.0, 0.0, 30, 30)
        assert z_score == 0.0
        assert p_value == 1.0

        # Test p_pool = 1 (entrambe le proporzioni = 1)
        z_score, p_value = ab_framework._z_test(1.0, 1.0, 30, 30)
        assert z_score == 0.0
        assert p_value == 1.0

        # Test casi normali
        z_score, p_value = ab_framework._z_test(0.5, 0.6, 100, 100)
        assert isinstance(z_score, float)
        assert isinstance(p_value, float)
        assert 0.0 <= p_value <= 1.0

    def test_z_test_small_samples(self, ab_framework):
        """Test _z_test con campioni piccoli ma che soddisfano il minimo."""
        control = RoutingStrategy('control', {'mode': 'haiku'})
        treatment = RoutingStrategy('treatment', {'mode': 'haiku'})
        ab_framework.create_experiment('small_samples', control, treatment)

        # Esattamente 30 campioni per variante (minimo richiesto)
        for i in range(60):
            variant = ab_framework.assign_variant('small_samples', f'user_{i}')
            # Successi misti
            success = (i % 2 == 0)
            ab_framework.record_result('small_samples', variant, success=success)

        result = ab_framework.get_result('small_samples')

        # Dovrebbe funzionare senza errori
        assert result is not None
        assert isinstance(result.z_score, float)
        assert isinstance(result.p_value, float)


class TestABFrameworkValidation:
    """Test validazione input ABTestingFramework."""

    @pytest.fixture
    def ab_framework(self):
        """Crea un framework A/B con storage temporaneo."""
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            test_path = f.name
        ab = ABTestingFramework(storage_path=test_path)
        yield ab
        try:
            os.unlink(test_path)
        except OSError:
            pass

    def test_invalid_variant_raises_error(self, ab_framework):
        """Test che variante non valida sollevi errore."""
        control = RoutingStrategy('control', {})
        treatment = RoutingStrategy('treatment', {})
        ab_framework.create_experiment('test', control, treatment)

        with pytest.raises(ValueError, match="non valida"):
            ab_framework.record_result('test', 'invalid_variant', success=True)

    def test_nonexistent_experiment_raises_error(self, ab_framework):
        """Test che esperimento inesistente sollevi errore."""
        with pytest.raises(ValueError, match="non trovato"):
            ab_framework.assign_variant('nonexistent', 'user_123')

    def test_duplicate_experiment_raises_error(self, ab_framework):
        """Test che creare esperimento duplicato sollevi errore."""
        control = RoutingStrategy('control', {})
        treatment = RoutingStrategy('treatment', {})
        ab_framework.create_experiment('duplicate', control, treatment)

        with pytest.raises(ValueError, match="esiste gia"):
            ab_framework.create_experiment('duplicate', control, treatment)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
