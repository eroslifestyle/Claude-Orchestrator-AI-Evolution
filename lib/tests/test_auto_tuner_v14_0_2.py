"""Test per AutoTuner V14.0.2 - GP e n_candidates adattivo.

Verifica:
1. GaussianProcessRegressor fit e predict
2. _adaptive_n_candidates() formula
3. _generate_candidates() con LHS
4. _ucb_suggest_with_gp() integration
"""

import pytest
import math
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    np = None
    HAS_NUMPY = False

from auto_tuner import (
    AutoTuner,
    AutoTunerConfig,
    GaussianProcessRegressor,
    TunableParameter
)


class TestGaussianProcessRegressor:
    """Test per la classe GaussianProcessRegressor."""

    @pytest.mark.skipif(not HAS_NUMPY, reason="NumPy not available")
    def test_gp_fit_creates_alpha(self):
        """GP fit deve creare _alpha per predictions."""
        gp = GaussianProcessRegressor(length_scale=0.5, noise=1e-6)

        # Training data: 3 points in 2D
        X = np.array([[0.0, 0.0], [0.5, 0.5], [1.0, 1.0]])
        y = np.array([0.0, 0.5, 1.0])

        gp.fit(X, y)

        assert gp._alpha is not None, "GP fit deve creare _alpha"
        assert len(gp._alpha) == 3, "Alpha deve avere stesso numero di punti"

    @pytest.mark.skipif(not HAS_NUMPY, reason="NumPy not available")
    def test_gp_predict_returns_mean_variance(self):
        """GP predict deve restituire mean e variance."""
        gp = GaussianProcessRegressor(length_scale=0.5, noise=1e-6)

        # Training data
        X_train = np.array([[0.0], [0.5], [1.0]])
        y_train = np.array([0.0, 0.5, 1.0])
        gp.fit(X_train, y_train)

        # Test point
        X_test = np.array([[0.25]])
        mu, var = gp.predict(X_test)

        assert len(mu) == 1, "Mean deve avere 1 elemento"
        assert len(var) == 1, "Variance deve avere 1 elemento"
        assert var[0] > 0, "Variance deve essere positiva"
        assert var[0] < 1.0, "Variance deve essere < 1 (posterior)"

    @pytest.mark.skipif(not HAS_NUMPY, reason="NumPy not available")
    def test_gp_predict_near_training_point_low_variance(self):
        """Punti vicini a training devono avere variance bassa."""
        gp = GaussianProcessRegressor(length_scale=0.5, noise=1e-6)

        X_train = np.array([[0.0], [1.0]])
        y_train = np.array([0.0, 1.0])
        gp.fit(X_train, y_train)

        # Test point esattamente su training
        X_test = np.array([[0.0]])
        mu, var_train = gp.predict(X_test)

        # Test point lontano da training
        X_test_far = np.array([[0.5]])
        mu_far, var_far = gp.predict(X_test_far)

        assert var_train[0] < var_far[0], \
            "Variance su training point deve essere minore di punto lontano"

    @pytest.mark.skipif(not HAS_NUMPY, reason="NumPy not available")
    def test_gp_rbf_kernel_shape(self):
        """RBF kernel deve restituire matrice corretta."""
        gp = GaussianProcessRegressor(length_scale=0.5)

        X1 = np.array([[0.0, 0.0], [1.0, 1.0]])  # 2 punti
        X2 = np.array([[0.5, 0.5]])               # 1 punto

        K = gp.rbf_kernel(X1, X2)

        assert K.shape == (2, 1), f"Kernel shape deve essere (2, 1), got {K.shape}"
        assert np.all(K > 0), "Kernel values devono essere positivi"
        assert np.all(K <= 1), "Kernel values devono essere <= 1 (RBF normalizzato)"

    def test_gp_predict_without_fit_returns_prior(self):
        """GP senza fit deve restituire prior (mean=0, var=1)."""
        gp = GaussianProcessRegressor()

        if HAS_NUMPY:
            X = np.array([[0.5]])
            mu, var = gp.predict(X)
            assert mu[0] == 0.0, "Prior mean deve essere 0"
            assert var[0] == 1.0, "Prior variance deve essere 1"


class TestAdaptiveNCandidates:
    """Test per _adaptive_n_candidates()."""

    def test_adaptive_n_candidates_dimensions(self):
        """n_candidates deve dipendere da dimensionalita."""
        # 4 parametri = 4 dimensioni
        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        n = tuner._adaptive_n_candidates()

        # Minimo: max(5, 4 * 2) = 8
        assert n >= 8, f"n_candidates deve essere >= 8 per 4 dimensioni, got {n}"
        assert n <= 100, "n_candidates deve essere <= 100 (max bound)"

    def test_adaptive_n_candidates_increases_with_few_observations(self):
        """Pochi observations = piu candidati (exploration)."""
        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        # 0 observations: early exploration
        tuner._observations_X = []
        n_early = tuner._adaptive_n_candidates()

        # 60 observations: exploitation
        tuner._observations_X = [[0.5, 0.5, 0.5, 0.5] for _ in range(60)]
        n_late = tuner._adaptive_n_candidates()

        assert n_early > n_late, \
            f"Early ({n_early}) deve essere > late ({n_late})"

    def test_adaptive_n_candidates_formula(self):
        """Verifica formula: sqrt(dimensions) * base_factor."""
        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        # 4 dimensioni, 0 observations -> base_factor = 10
        # Expected: sqrt(4) * 10 = 2 * 10 = 20
        # Bounds: max(5, 8) = 8, min(100, 20) = 20
        tuner._observations_X = []
        n = tuner._adaptive_n_candidates()

        # Con bounds: max(8, min(100, 20)) = 20
        assert n == 20, f"Expected 20, got {n}"


class TestGenerateCandidates:
    """Test per _generate_candidates()."""

    def test_generate_candidates_count(self):
        """Deve generare il numero richiesto di candidati."""
        config = AutoTunerConfig()
        tuner = AutoTuner(config)

        candidates = tuner._generate_candidates(15)

        assert len(candidates) == 15, f"Expected 15 candidates, got {len(candidates)}"

    def test_generate_candidates_in_bounds(self):
        """Candidati devono essere nei bounds dei parametri."""
        config = AutoTunerConfig()
        tuner = AutoTuner(config)

        candidates = tuner._generate_candidates(10)

        for candidate in candidates:
            for name, param in tuner._parameters.items():
                value = candidate.get(name)
                assert value is not None, f"Candidato deve avere {name}"
                assert param.min_value <= value <= param.max_value, \
                    f"{name}={value} fuori bounds [{param.min_value}, {param.max_value}]"

    def test_generate_candidates_diversity(self):
        """Candidati devono essere diversi (LHS property)."""
        config = AutoTunerConfig()
        tuner = AutoTuner(config)

        candidates = tuner._generate_candidates(20)

        # Controlla che non siano tutti uguali
        values = [c.get("cache_ttl") for c in candidates]
        unique_values = set(values)

        assert len(unique_values) > 1, "Candidati devono essere diversi"


class TestUCBSuggestWithGP:
    """Test per _ucb_suggest_with_gp()."""

    def test_ucb_suggest_returns_valid_params(self):
        """UCB deve restituire parametri validi."""
        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        # Aggiungi osservazioni minime
        for i in range(5):
            params = tuner._sample_random_params()
            tuner.record_outcome(params, {"success_rate": 0.8 + i * 0.02})

        suggested = tuner._ucb_suggest_with_gp()

        assert isinstance(suggested, dict), "Deve restituire dict"
        for name in tuner._parameters.keys():
            assert name in suggested, f"Deve includere {name}"

    def test_ucb_suggest_uses_gp_when_available(self):
        """UCB deve usare GP per predictions quando disponibile."""
        if not HAS_NUMPY:
            pytest.skip("NumPy not available")

        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        # Aggiungi osservazioni per triggerare GP
        for i in range(10):
            params = {
                "cache_ttl": 60 + i * 10,
                "batch_size": 20,
                "pool_size": 10,
                "preload_threshold": 0.7
            }
            tuner.record_outcome(params, {"success_rate": 0.5 + i * 0.04})

        # GP dovrebbe essere fitted
        assert tuner._gp._alpha is not None, "GP deve essere fitted dopo 10 observations"

        # UCB dovrebbe usare GP
        suggested = tuner._ucb_suggest_with_gp()
        assert suggested is not None

    def test_ucb_suggest_fallback_without_observations(self):
        """UCB deve fallback a random senza abbastanza osservazioni."""
        config = AutoTunerConfig(min_samples=10)
        tuner = AutoTuner(config)

        # Solo 2 osservazioni (< 3 minimo per GP)
        tuner.record_outcome(tuner._sample_random_params(), {"success_rate": 0.8})
        tuner.record_outcome(tuner._sample_random_params(), {"success_rate": 0.7})

        suggested = tuner._ucb_suggest_with_gp()

        # Deve comunque restituire qualcosa
        assert suggested is not None
        assert isinstance(suggested, dict)


class TestIntegration:
    """Test di integrazione completi."""

    def test_full_optimization_cycle(self):
        """Ciclo completo: suggest -> record -> suggest."""
        config = AutoTunerConfig(min_samples=3, max_history=50)
        tuner = AutoTuner(config)

        scores = []

        # Fase 1: Exploration (primi 5)
        for _ in range(5):
            params = tuner.suggest_parameters()
            score = 0.7 + 0.1 * (params.get("batch_size", 20) / 50)
            tuner.record_outcome(params, {"success_rate": score})
            scores.append(score)

        # Fase 2: Exploitation (altri 10)
        for _ in range(10):
            params = tuner.suggest_parameters()
            score = 0.7 + 0.1 * (params.get("batch_size", 20) / 50)
            tuner.record_outcome(params, {"success_rate": score})
            scores.append(score)

        # Verifica statistiche
        stats = tuner.get_stats()
        assert stats["iterations"] == 15
        assert stats["n_observations"] == 15
        assert stats["best_score"] is not None

        # Se NumPy disponibile, GP deve essere fitted
        if HAS_NUMPY:
            assert stats["gp_fitted"], "GP deve essere fitted dopo 15 observations"

    def test_kappa_decay(self):
        """kappa deve decadere dopo ogni UCB suggest."""
        config = AutoTunerConfig(min_samples=3)
        tuner = AutoTuner(config)

        # Aggiungi osservazioni
        for _ in range(5):
            params = tuner._sample_random_params()
            tuner.record_outcome(params, {"success_rate": 0.8})

        initial_kappa = tuner._kappa

        # Forza UCB suggest
        tuner._ucb_suggest_with_gp()

        assert tuner._kappa < initial_kappa, "kappa deve decadere"
        assert tuner._kappa >= 0.1, "kappa non deve scendere sotto 0.1"


class TestVectorConversion:
    """Test per conversioni parametri <-> vettore."""

    def test_params_to_vector_normalized(self):
        """_params_to_vector deve normalizzare in [0, 1]."""
        config = AutoTunerConfig()
        tuner = AutoTuner(config)

        # Parametri ai valori minimi
        params_min = {
            "cache_ttl": 30,
            "batch_size": 5,
            "pool_size": 5,
            "preload_threshold": 0.5
        }
        vector_min = tuner._params_to_vector(params_min)

        # Parametri ai valori massimi
        params_max = {
            "cache_ttl": 300,
            "batch_size": 50,
            "pool_size": 30,
            "preload_threshold": 0.9
        }
        vector_max = tuner._params_to_vector(params_max)

        assert all(0 <= v <= 1 for v in vector_min), "Vector min deve essere in [0, 1]"
        assert all(0 <= v <= 1 for v in vector_max), "Vector max deve essere in [0, 1]"

        # Minimi dovrebbero essere vicini a 0, massimi vicini a 1
        assert all(v < 0.1 for v in vector_min), "Vector min dovrebbe essere vicino a 0"
        assert all(v > 0.9 for v in vector_max), "Vector max dovrebbe essere vicino a 1"

    def test_vector_to_params_roundtrip(self):
        """Roundtrip params -> vector -> params deve preservare valori."""
        config = AutoTunerConfig()
        tuner = AutoTuner(config)

        original = {
            "cache_ttl": 150,
            "batch_size": 25,
            "pool_size": 15,
            "preload_threshold": 0.7
        }

        vector = tuner._params_to_vector(original)
        recovered = tuner._vector_to_params(vector)

        for name in original:
            assert abs(original[name] - recovered[name]) < 1, \
                f"Roundtrip error per {name}: {original[name]} != {recovered[name]}"


# ============================================================================
# Run tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
