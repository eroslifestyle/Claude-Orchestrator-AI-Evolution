"""Test per BackpressureController con threshold dinamici.

Test coverage:
- Threshold dinamici via update_thresholds()
- Metriche di overload
- Integrazione threshold dinamici con calcolo stato
- Validazione threshold

Version: V15.2.0
"""

import pytest
from datetime import datetime

from lib.backpressure import (
    BackpressureController,
    BackpressureConfig,
    OverloadMetrics,
    ThrottleState,
    CircuitState,
    reset_backpressure_controller,
)


@pytest.fixture(autouse=True)
def reset_controller():
    """Reset del controller prima e dopo ogni test."""
    reset_backpressure_controller()
    yield
    reset_backpressure_controller()


class TestBackpressureConfig:
    """Test per BackpressureConfig."""

    def test_default_values(self):
        """Verifica valori di default."""
        config = BackpressureConfig()
        assert config.cpu_threshold == 70.0
        assert config.cpu_critical == 90.0
        assert config.memory_threshold == 75.0
        assert config.memory_critical == 90.0
        assert config.error_rate_threshold == 0.1
        assert config.error_rate_critical == 0.25
        assert config.api_rate_threshold == 0.2

    def test_to_thresholds_dict_structure(self):
        """Verifica struttura del dizionario thresholds."""
        config = BackpressureConfig()
        thresholds = config.to_thresholds_dict()

        assert ThrottleState.NORMAL in thresholds
        assert ThrottleState.CAUTION in thresholds
        assert ThrottleState.WARNING in thresholds
        assert ThrottleState.CRITICAL in thresholds
        assert ThrottleState.EMERGENCY in thresholds

        # Verifica che WARNING usi i threshold configurati
        assert thresholds[ThrottleState.WARNING]["cpu"] == config.cpu_threshold
        assert thresholds[ThrottleState.WARNING]["memory"] == config.memory_threshold
        assert thresholds[ThrottleState.WARNING]["error_rate"] == config.error_rate_threshold

    def test_to_thresholds_dict_dynamic(self):
        """Verifica che thresholds rifletta configurazione custom."""
        config = BackpressureConfig(
            cpu_threshold=80.0,
            memory_threshold=85.0,
            error_rate_threshold=0.15,
        )
        thresholds = config.to_thresholds_dict()

        assert thresholds[ThrottleState.WARNING]["cpu"] == 80.0
        assert thresholds[ThrottleState.WARNING]["memory"] == 85.0
        assert thresholds[ThrottleState.WARNING]["error_rate"] == 0.15


class TestOverloadMetrics:
    """Test per OverloadMetrics."""

    def test_default_values(self):
        """Verifica valori di default."""
        metrics = OverloadMetrics()
        assert metrics.overload_count == 0
        assert metrics.total_overload_duration_sec == 0.0
        assert metrics.last_overload_timestamp is None
        assert metrics.peak_cpu_percent == 0.0
        assert metrics.peak_memory_percent == 0.0
        assert metrics.peak_error_rate == 0.0
        assert metrics.current_threshold_cpu == 70.0
        assert metrics.current_threshold_memory == 75.0
        assert metrics.threshold_adjustments == 0

    def test_to_dict(self):
        """Verifica conversione in dizionario."""
        metrics = OverloadMetrics(
            overload_count=5,
            total_overload_duration_sec=12.5,
            peak_cpu_percent=95.3,
            peak_memory_percent=88.7,
            threshold_adjustments=3,
        )
        result = metrics.to_dict()

        assert result["overload_count"] == 5
        assert result["total_overload_duration_sec"] == 12.5
        assert result["peak_cpu_percent"] == 95.3
        assert result["peak_memory_percent"] == 88.7
        assert result["threshold_adjustments"] == 3


class TestUpdateThresholds:
    """Test per update_thresholds()."""

    def test_update_single_threshold(self):
        """Test aggiornamento singolo threshold."""
        controller = BackpressureController()

        result = controller.update_thresholds(cpu_threshold=85.0)

        assert result["success"] is True
        assert result["changes"]["cpu_threshold"] == 85.0
        assert result["current_thresholds"]["cpu_threshold"] == 85.0

        # Verifica che il config sia aggiornato
        assert controller._config.cpu_threshold == 85.0

    def test_update_multiple_thresholds(self):
        """Test aggiornamento multipli threshold."""
        controller = BackpressureController()

        result = controller.update_thresholds(
            cpu_threshold=80.0,
            cpu_critical=95.0,
            memory_threshold=85.0,
            memory_critical=98.0,
        )

        assert result["success"] is True
        assert len(result["changes"]) == 4
        assert result["current_thresholds"]["cpu_threshold"] == 80.0
        assert result["current_thresholds"]["cpu_critical"] == 95.0
        assert result["current_thresholds"]["memory_threshold"] == 85.0
        assert result["current_thresholds"]["memory_critical"] == 98.0

    def test_update_error_rate_thresholds(self):
        """Test aggiornamento threshold error rate."""
        controller = BackpressureController()

        result = controller.update_thresholds(
            error_rate_threshold=0.15,
            error_rate_critical=0.4,
        )

        assert result["success"] is True
        assert result["current_thresholds"]["error_rate_threshold"] == 0.15
        assert result["current_thresholds"]["error_rate_critical"] == 0.4

    def test_update_api_rate_threshold(self):
        """Test aggiornamento threshold API rate."""
        controller = BackpressureController()

        result = controller.update_thresholds(api_rate_threshold=0.3)

        assert result["success"] is True
        assert result["current_thresholds"]["api_rate_threshold"] == 0.3

    def test_update_no_changes(self):
        """Test con nessun parametro passato."""
        controller = BackpressureController()

        result = controller.update_thresholds()

        assert result["success"] is True
        assert len(result["changes"]) == 0

    def test_invalid_cpu_threshold_too_high(self):
        """Test validazione: CPU threshold > 100."""
        controller = BackpressureController()

        with pytest.raises(ValueError, match="cpu_threshold deve essere 0-100"):
            controller.update_thresholds(cpu_threshold=150.0)

    def test_invalid_cpu_threshold_negative(self):
        """Test validazione: CPU threshold negativo."""
        controller = BackpressureController()

        with pytest.raises(ValueError, match="cpu_threshold deve essere 0-100"):
            controller.update_thresholds(cpu_threshold=-10.0)

    def test_invalid_memory_threshold(self):
        """Test validazione: memory threshold non valido."""
        controller = BackpressureController()

        with pytest.raises(ValueError, match="memory_threshold deve essere 0-100"):
            controller.update_thresholds(memory_threshold=110.0)

    def test_invalid_error_rate_threshold(self):
        """Test validazione: error rate threshold > 1."""
        controller = BackpressureController()

        with pytest.raises(ValueError, match="error_rate_threshold deve essere 0-1"):
            controller.update_thresholds(error_rate_threshold=1.5)

    def test_invalid_api_rate_threshold(self):
        """Test validazione: API rate threshold non valido."""
        controller = BackpressureController()

        with pytest.raises(ValueError, match="api_rate_threshold deve essere 0-1"):
            controller.update_thresholds(api_rate_threshold=-0.1)

    def test_threshold_warning_less_than_critical(self):
        """Test che WARNING threshold debba essere < CRITICAL."""
        controller = BackpressureController()

        # WARNING >= CRITICAL non e' valido
        with pytest.raises(ValueError, match="cpu_threshold deve essere < cpu_critical"):
            controller.update_thresholds(cpu_threshold=95.0, cpu_critical=90.0)


class TestDynamicThresholdsIntegration:
    """Test integrazione threshold dinamici con calcolo stato."""

    def test_state_uses_dynamic_thresholds(self):
        """Verifica che il calcolo stato usi i threshold dinamici."""
        controller = BackpressureController()

        # Imposta threshold custom
        controller.update_thresholds(cpu_threshold=60.0)

        # Aggiorna metriche CPU al 65% (sopra il nuovo threshold)
        controller.update_metrics(cpu_percent=65.0, memory_percent=50.0)

        # Dovrebbe essere in WARNING (65 > 60)
        assert controller.state == ThrottleState.WARNING

    def test_threshold_adjustment_affects_state_transition(self):
        """Verifica che aggiustamento threshold cambi le transizioni."""
        controller = BackpressureController()

        # CPU al 75% - con default threshold (70%) e' WARNING
        controller.update_metrics(cpu_percent=75.0, memory_percent=50.0)
        assert controller.state == ThrottleState.WARNING

        # Alza threshold a 80%
        controller.update_thresholds(cpu_threshold=80.0)

        # Ricalcola stato
        controller.update_metrics(cpu_percent=75.0, memory_percent=50.0)

        # Ora dovrebbe essere CAUTION (75 < 80 ma > 60)
        assert controller.state == ThrottleState.CAUTION


class TestOverloadMetricsTracking:
    """Test per tracciamento metriche di overload."""

    def test_overload_count_increases(self):
        """Verifica incremento contatore overload."""
        controller = BackpressureController()

        # Trigger overload passando in WARNING
        controller.update_metrics(cpu_percent=80.0, memory_percent=50.0)

        metrics = controller.get_overload_metrics()
        assert metrics.overload_count == 1

    def test_peak_cpu_tracking(self):
        """Verifica tracciamento picco CPU."""
        controller = BackpressureController()

        # CPU crescente
        controller.update_metrics(cpu_percent=60.0, memory_percent=50.0)
        controller.update_metrics(cpu_percent=75.0, memory_percent=50.0)
        controller.update_metrics(cpu_percent=85.0, memory_percent=50.0)

        metrics = controller.get_overload_metrics()
        assert metrics.peak_cpu_percent == 85.0

    def test_peak_memory_tracking(self):
        """Verifica tracciamento picco memoria."""
        controller = BackpressureController()

        controller.update_metrics(cpu_percent=50.0, memory_percent=70.0)
        controller.update_metrics(cpu_percent=50.0, memory_percent=85.0)
        controller.update_metrics(cpu_percent=50.0, memory_percent=90.0)

        metrics = controller.get_overload_metrics()
        assert metrics.peak_memory_percent == 90.0

    def test_peak_error_rate_tracking(self):
        """Verifica tracciamento picco error rate."""
        controller = BackpressureController()

        # Registra mix di errori e successi per avere error rate 0.5
        for _ in range(5):
            controller.record_error()
        for _ in range(5):
            controller.record_success()

        # Aggiorna metriche per calcolare stato e peak
        controller.update_metrics(cpu_percent=50.0, memory_percent=50.0)

        metrics = controller.get_overload_metrics()
        # Il peak error rate viene registrato durante i primi 5 errori (100% error rate)
        # perche' _calculate_state aggiorna peak prima di registrare i successi
        # Quindi peak_error_rate sara' 1.0 (il picco durante i soli errori)
        assert metrics.peak_error_rate == 1.0  # Peak durante i primi 5 errori consecutivi

    def test_threshold_adjustments_count(self):
        """Verifica contatore aggiustamenti threshold."""
        controller = BackpressureController()

        controller.update_thresholds(cpu_threshold=80.0)
        controller.update_thresholds(memory_threshold=85.0)

        metrics = controller.get_overload_metrics()
        assert metrics.threshold_adjustments == 2

    def test_current_threshold_tracking(self):
        """Verifica tracciamento threshold correnti."""
        controller = BackpressureController()

        controller.update_thresholds(cpu_threshold=85.0, memory_threshold=88.0)

        metrics = controller.get_overload_metrics()
        assert metrics.current_threshold_cpu == 85.0
        assert metrics.current_threshold_memory == 88.0


class TestGetStatistics:
    """Test per get_statistics con nuove metriche."""

    def test_statistics_includes_overload_metrics(self):
        """Verifica che statistiche includa overload_metrics."""
        controller = BackpressureController()

        stats = controller.get_statistics()

        assert "overload_metrics" in stats
        assert "overload_count" in stats["overload_metrics"]
        assert "peak_cpu_percent" in stats["overload_metrics"]
        assert "threshold_adjustments" in stats["overload_metrics"]

    def test_statistics_includes_all_config(self):
        """Verifica che statistiche includa tutta la config."""
        controller = BackpressureController()
        controller.update_thresholds(cpu_threshold=85.0)

        stats = controller.get_statistics()

        assert "cpu_threshold" in stats["config"]
        assert "cpu_critical" in stats["config"]
        assert "memory_threshold" in stats["config"]
        assert "memory_critical" in stats["config"]
        assert "error_rate_threshold" in stats["config"]
        assert "error_rate_critical" in stats["config"]
        assert "api_rate_threshold" in stats["config"]
        assert stats["config"]["cpu_threshold"] == 85.0


class TestResetWithDynamicThresholds:
    """Test per reset con threshold dinamici."""

    def test_reset_statistics_clears_overload_metrics(self):
        """Verifica che reset_statistics pulisca overload_metrics."""
        controller = BackpressureController()

        # Genera dati
        controller.update_metrics(cpu_percent=85.0, memory_percent=85.0)
        controller.update_thresholds(cpu_threshold=80.0)

        # Reset
        controller.reset_statistics()

        metrics = controller.get_overload_metrics()
        assert metrics.overload_count == 0
        assert metrics.peak_cpu_percent == 0.0
        assert metrics.threshold_adjustments == 0

    def test_full_reset_restores_default_thresholds(self):
        """Verifica che reset completo ripristini threshold di default."""
        controller = BackpressureController()

        # Modifica threshold
        controller.update_thresholds(cpu_threshold=85.0, memory_threshold=88.0)

        # Reset completo
        controller.reset()

        # Verifica threshold ripristinati
        assert controller._config.cpu_threshold == 70.0
        assert controller._config.memory_threshold == 75.0


# =============================================================================
# TEST RUNNER
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
