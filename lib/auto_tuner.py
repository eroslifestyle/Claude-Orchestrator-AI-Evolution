"""Auto-tuning Parameters for Orchestrator V14.0.3.

Bayesian optimization per parametri di sistema con apprendimento continuo.

Features:
- Gaussian Process con RBF kernel
- N_candidates adattivo basato su dimensionalita (5-100 range)
- Latin Hypercube Sampling per generazione candidati
- Parametri tunable: cache_ttl, batch_size, pool_size, preload_threshold
- Persistenza history su JSON
- Thread-safe with RLock
- Exploration/exploitation bilanciato with decay

Usage:
    tuner = AutoTuner()
    params = tuner.suggest_parameters()
    # ... usa i parametri ...
    tuner.record_outcome(params, {"success_rate": 0.95, "latency_ms": 120})
    best = tuner.get_best_parameters()
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime
import threading
import json
import random
import math
import time
import logging

# Setup logger
logger = logging.getLogger(__name__)

# Try to import numpy for GP (optional dependency)
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None  # type: ignore
    NUMPY_AVAILABLE = False
    logger.warning(
        "NumPy not available. AutoTuner will use fallback mode with reduced accuracy. "
        "Install NumPy for optimal performance: pip install numpy"
    )


# ============================================================================
# Dataclasses
# ============================================================================

@dataclass
class TunableParameter:
    """Parametro ottimizzabile con range e valore corrente.

    Attributes:
        name: Nome del parametro
        min_value: Valore minimo (inclusivo)
        max_value: Valore massimo (inclusivo)
        current_value: Valore attuale
        param_type: Tipo del parametro ('int', 'float')
    """
    name: str
    min_value: float
    max_value: float
    current_value: float
    param_type: str = "float"  # 'int' o 'float'

    def sample_random(self) -> float:
        """Campiona valore casuale nel range.

        Returns:
            Valore casuale uniforme nel range [min_value, max_value]
        """
        value = random.uniform(self.min_value, self.max_value)
        if self.param_type == "int":
            return round(value)
        return value

    def clamp(self, value: float) -> float:
        """Forza valore nel range valido.

        Args:
            value: Valore da clampare

        Returns:
            Valore clampato nel range [min_value, max_value]
        """
        value = max(self.min_value, min(self.max_value, value))
        if self.param_type == "int":
            return round(value)
        return value

    def to_dict(self) -> Dict[str, Any]:
        """Serializza in dizionario."""
        return {
            "name": self.name,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "current_value": self.current_value,
            "param_type": self.param_type
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TunableParameter':
        """Deserializza da dizionario."""
        return cls(**data)


@dataclass
class OptimizationResult:
    """Risultato di una configurazione testata.

    Attributes:
        params: Dizionario parametri -> valori
        score: Punteggio calcolato dalle metriche
        timestamp: Unix timestamp del test
        metrics: Metriche grezze usate per calcolare lo score
    """
    params: Dict[str, float]
    score: float
    timestamp: float
    metrics: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serializza in dizionario."""
        return {
            "params": self.params,
            "score": self.score,
            "timestamp": self.timestamp,
            "metrics": self.metrics
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OptimizationResult':
        """Deserializza da dizionario."""
        return cls(**data)


@dataclass
class AutoTunerConfig:
    """Configurazione per AutoTuner.

    Attributes:
        exploration_rate: Tasso iniziale di exploration (0-1)
        decay_rate: Fattore di decadimento exploration per campione
        min_samples: Minimo campioni prima di exploitation
        history_file: Path del file history JSON
        max_history: Massimo risultati in history (FIFO)
        gp_length_scale: Length scale per RBF kernel
        gp_noise: Noise term per stabilita numerica
    """
    exploration_rate: float = 0.3
    decay_rate: float = 0.02
    min_samples: int = 10
    history_file: str = ""
    max_history: int = 100
    gp_length_scale: float = 0.5
    gp_noise: float = 1e-6


# ============================================================================
# Gaussian Process Regressor (V14.0.2)
# ============================================================================

class GaussianProcessRegressor:
    """Simplified Gaussian Process con RBF kernel.

    V14.0.2: Implementazione completa per uncertainty quantification.

    **Fallback Mode (AT-E2 fix):**
    Quando NumPy non e disponibile, opera in modalita fallback:
    - predict() ritorna mean=0, variance=1 (prior generico)
    - rbf_kernel() ritorna None
    - La property `is_fallback_mode` indica lo stato

    Per prestazioni ottimali, installare NumPy: `pip install numpy`

    Attributes:
        length_scale: Scale parameter per RBF kernel
        noise: Noise term per stabilita numerica (regularization)
        is_fallback_mode: True se NumPy non disponibile
    """

    def __init__(self, length_scale: float = 0.5, noise: float = 1e-6):
        """Inizializza GP.

        Args:
            length_scale: Scale per RBF kernel (default: 0.5)
            noise: Noise term per stabilita (default: 1e-6)
        """
        self.length_scale = length_scale
        self.noise = noise
        self._numpy_available = NUMPY_AVAILABLE
        self.X_train: Optional[Any] = None  # np.ndarray when fitted
        self.y_train: Optional[Any] = None  # np.ndarray when fitted
        self._alpha: Optional[Any] = None   # Precomputed for predictions
        self._L: Optional[Any] = None       # Cholesky factor

        # AT-E2: Warning esplicito per utente finale
        if not self._numpy_available:
            logger.warning(
                "GaussianProcessRegressor initialized without NumPy. "
                "Using dummy fallback - predictions will be mean values only. "
                "For accurate predictions, install NumPy: pip install numpy"
            )

    @property
    def is_fallback_mode(self) -> bool:
        """Verifica se GP opera in modalita fallback (senza NumPy).

        Returns:
            True se NumPy non disponibile, False altrimenti
        """
        return not self._numpy_available

    def rbf_kernel(self, X1: Any, X2: Any) -> Any:
        """RBF (Radial Basis Function) kernel.

        Formula: K(x, x') = exp(-0.5 * ||x - x'||^2 / l^2)

        Args:
            X1: Prima matrice (n1, d)
            X2: Seconda matrice (n2, d)

        Returns:
            Kernel matrix (n1, n2)
        """
        if not NUMPY_AVAILABLE:
            return None

        # Calcola distanze quadrate
        # (x - y)^2 = x^2 + y^2 - 2xy
        X1_sq = np.sum(X1**2, axis=1, keepdims=True)
        X2_sq = np.sum(X2**2, axis=1)
        sq_dist = X1_sq + X2_sq - 2 * np.dot(X1, X2.T)
        sq_dist = np.maximum(sq_dist, 0)  # Numerical stability

        return np.exp(-0.5 * sq_dist / (self.length_scale ** 2))

    def fit(self, X: Any, y: Any) -> 'GaussianProcessRegressor':
        """Fit GP ai dati di training.

        Args:
            X: Training inputs (n, d)
            y: Training targets (n,)

        Returns:
            self per method chaining
        """
        if not NUMPY_AVAILABLE:
            return self

        self.X_train = X
        self.y_train = y

        n = len(X)

        # Kernel matrix + noise
        K = self.rbf_kernel(X, X)
        K += self.noise * np.eye(n)

        # Cholesky decomposition: K = L @ L.T
        try:
            self._L = np.linalg.cholesky(K)
            # Solve L @ L.T @ alpha = y
            self._alpha = np.linalg.solve(self._L.T, np.linalg.solve(self._L, y))
        except np.linalg.LinAlgError:
            # Fallback: pseudo-inverse se Cholesky fallisce
            logger.debug("Cholesky failed, using pseudo-inverse")
            self._L = None
            self._alpha = np.dot(np.linalg.pinv(K), y)

        return self

    def predict(self, X: Any) -> Tuple[Any, Any]:
        """Predici mean e variance per nuovi punti.

        Args:
            X: Test points (m, d)

        Returns:
            Tuple di (mean, variance) arrays (m,)
        """
        if not NUMPY_AVAILABLE or self.X_train is None:
            # Prior: mean=0, variance=1
            n = len(X) if NUMPY_AVAILABLE else 1
            zeros = np.zeros(n) if NUMPY_AVAILABLE else [0.0]
            ones = np.ones(n) if NUMPY_AVAILABLE else [1.0]
            return zeros, ones

        # Kernel train-test
        K_s = self.rbf_kernel(self.X_train, X)
        # Kernel test-test (solo diagonale per variance)
        K_ss_diag = np.ones(len(X))  # K(x, x) = 1 per RBF normalizzato

        # Posterior mean: mu = K_s.T @ alpha
        mu = np.dot(K_s.T, self._alpha)

        # Posterior variance: var = K_ss - K_s.T @ K^-1 @ K_s
        if self._L is not None:
            # Usa Cholesky per stabilita: v = L^-1 @ K_s
            v = np.linalg.solve(self._L, K_s)
            var = K_ss_diag - np.sum(v**2, axis=0)
        else:
            # Fallback: approximazione
            var = K_ss_diag * 0.5  # Uncertainty reduction

        # Assicura varianza positiva
        var = np.maximum(var, 1e-10)

        return mu, var


# ============================================================================
# AutoTuner - Bayesian Optimization
# ============================================================================

class AutoTuner:
    """Ottimizzatore automatico parametri con Bayesian optimization.

    Implementa:
    - Vero Gaussian Process con kernel RBF (V14.0.2)
    - N_candidates adattivo basato su dimensionalita (V14.0.2)
    - Latin Hypercube Sampling per candidati (V14.0.2)
    - Acquisition function: Upper Confidence Bound (UCB)
    - Exploration rate con decadimento temporale
    - Persistenza history su JSON
    - Thread-safe con RLock

    Parametri tunable di default:
    - cache_ttl: 30-300 secondi (default: 60)
    - batch_size: 5-50 (default: 20)
    - pool_size: 5-30 (default: 10)
    - preload_threshold: 0.5-0.9 (default: 0.7)

    Usage:
        tuner = AutoTuner()
        params = tuner.suggest_parameters()
        # ... esegui task con parametri ...
        tuner.record_outcome(params, {
            "success_rate": 0.95,
            "latency_ms": 120,
            "token_efficiency": 0.85
        })
        best = tuner.get_best_parameters()
    """

    # Parametri di default
    DEFAULT_PARAMETERS = [
        TunableParameter("cache_ttl", 30, 300, 60, "int"),
        TunableParameter("batch_size", 5, 50, 20, "int"),
        TunableParameter("pool_size", 5, 30, 10, "int"),
        TunableParameter("preload_threshold", 0.5, 0.9, 0.7, "float"),
    ]

    # Pesi per calcolo score
    METRIC_WEIGHTS = {
        "success_rate": 0.4,      # Piu alto = meglio
        "latency_ms": -0.0005,    # Piu basso = meglio (negativo)
        "token_efficiency": 0.3,  # Piu alto = meglio
        "error_rate": -0.3,       # Piu basso = meglio (negativo)
    }

    # Parametri kernel RBF
    RBF_LENGTH_SCALE = 0.5
    UCB_KAPPA = 2.0  # Bilanciamento exploration/exploitation

    def __init__(self, config: Optional[AutoTunerConfig] = None,
                 parameters: Optional[List[TunableParameter]] = None):
        """Inizializza AutoTuner.

        Args:
            config: Configurazione (usa default se None)
            parameters: Lista parametri tunable (usa default se None)
        """
        self._config = config or AutoTunerConfig()
        self._parameters = {p.name: p for p in (parameters or self.DEFAULT_PARAMETERS)}
        self._history: List[OptimizationResult] = []
        self._lock = threading.RLock()
        self._current_exploration_rate = self._config.exploration_rate
        self._iteration_count = 0

        # V14.0.2: GP e osservazioni per vero Bayesian optimization
        self._gp = GaussianProcessRegressor(
            length_scale=self._config.gp_length_scale,
            noise=self._config.gp_noise
        )
        self._observations_X: List[List[float]] = []  # Parametri normalizzati
        self._observations_y: List[float] = []         # Scores
        self._y_mean: float = 0.0
        self._y_std: float = 1.0
        self._kappa: float = self.UCB_KAPPA

        # Carica history da file se specificato
        if self._config.history_file:
            self._load_history()

    # ========================================================================
    # API Pubblica
    # ========================================================================

    def suggest_parameters(self) -> Dict[str, Any]:
        """Suggerisce prossimi parametri da testare.

        Strategia:
        1. Se < min_samples: exploration casuale
        2. Altrimenti: UCB con vero GP (V14.0.2)

        Returns:
            Dizionario parametro -> valore suggerito
        """
        with self._lock:
            self._iteration_count += 1

            # Aggiorna exploration rate con decay
            self._current_exploration_rate = max(
                0.05,  # Minimo exploration
                self._config.exploration_rate * math.exp(
                    -self._config.decay_rate * len(self._history)
                )
            )

            # Exploration: campione casuale
            if len(self._history) < self._config.min_samples:
                return self._sample_random_params()

            # Exploitation vs Exploration
            if random.random() < self._current_exploration_rate:
                return self._sample_random_params()

            # V14.0.2: UCB con vero GP
            return self._ucb_suggest_with_gp()

    def record_outcome(self, params: Dict[str, Any], metrics: Dict[str, float]) -> None:
        """Registra risultato di un test.

        Calcola score, aggiunge a history, aggiorna GP, salva su file.

        V14.0.2: Salva osservazioni per GP training.

        Args:
            params: Dizionario parametri usati
            metrics: Dizionario metriche misurate
        """
        with self._lock:
            # Calcola score dalle metriche
            score = self._calculate_score(metrics)

            # Crea risultato
            result = OptimizationResult(
                params={k: float(v) for k, v in params.items()},
                score=score,
                timestamp=time.time(),
                metrics=metrics
            )

            # Aggiungi a history (con limite FIFO)
            self._history.append(result)
            if len(self._history) > self._config.max_history:
                self._history.pop(0)

            # V14.0.2: Salva osservazione per GP
            X_normalized = self._params_to_vector(params)
            self._observations_X.append(X_normalized)
            self._observations_y.append(score)

            # Limita storia osservazioni
            max_obs = self._config.max_history
            if len(self._observations_X) > max_obs:
                self._observations_X = self._observations_X[-max_obs:]
                self._observations_y = self._observations_y[-max_obs:]

            # V14.0.2: Aggiorna GP
            self._bayesian_update()

            # Aggiorna current_value dei parametri
            for name, value in params.items():
                if name in self._parameters:
                    self._parameters[name].current_value = value

            # Salva su file
            if self._config.history_file:
                self._save_history()

    def get_best_parameters(self) -> Dict[str, Any]:
        """Restituisce i migliori parametri trovati.

        Returns:
            Dizionario parametro -> miglior valore
        """
        with self._lock:
            if not self._history:
                # Nessun dato: ritorna valori di default
                return {name: p.current_value for name, p in self._parameters.items()}

            # Trova risultato con score massimo
            best = max(self._history, key=lambda r: r.score)
            return best.params

    def get_stats(self) -> Dict[str, Any]:
        """Restituisce statistiche dell'ottimizzatore.

        Returns:
            Dizionario con statistiche
        """
        with self._lock:
            if not self._history:
                return {
                    "iterations": 0,
                    "exploration_rate": self._current_exploration_rate,
                    "best_score": None,
                    "avg_score": None,
                    "n_observations": 0,
                    "gp_fitted": False,
                    "kappa": self._kappa
                }

            scores = [r.score for r in self._history]
            return {
                "iterations": len(self._history),
                "exploration_rate": self._current_exploration_rate,
                "best_score": max(scores),
                "avg_score": sum(scores) / len(scores),
                "min_samples_threshold": self._config.min_samples,
                "parameters": {name: p.to_dict() for name, p in self._parameters.items()},
                "n_observations": len(self._observations_X),
                "gp_fitted": self._gp._alpha is not None,
                "kappa": self._kappa,
                "y_mean": self._y_mean,
                "y_std": self._y_std
            }

    def reset(self) -> None:
        """Resetta history e parametri."""
        with self._lock:
            self._history.clear()
            self._current_exploration_rate = self._config.exploration_rate
            self._iteration_count = 0

            # V14.0.2: Reset GP e osservazioni
            self._observations_X.clear()
            self._observations_y.clear()
            self._gp = GaussianProcessRegressor(
                length_scale=self._config.gp_length_scale,
                noise=self._config.gp_noise
            )
            self._y_mean = 0.0
            self._y_std = 1.0
            self._kappa = self.UCB_KAPPA

            # Reset parametri a default
            for name, param in self._parameters.items():
                param.current_value = (param.min_value + param.max_value) / 2
                if param.param_type == "int":
                    param.current_value = round(param.current_value)

    # ========================================================================
    # Metodi Privati
    # ========================================================================

    def _calculate_score(self, metrics: Dict[str, float]) -> float:
        """Calcola score singolo dalle metriche.

        Formula: sum(metric * weight) per ogni metrica nota

        Args:
            metrics: Dizionario metriche -> valori

        Returns:
            Score calcolato
        """
        score = 0.0
        for metric, weight in self.METRIC_WEIGHTS.items():
            if metric in metrics:
                score += metrics[metric] * weight
        return score

    def _sample_random_params(self) -> Dict[str, Any]:
        """Campiona parametri casuali uniformi.

        Returns:
            Dizionario parametro -> valore casuale
        """
        return {
            name: param.sample_random()
            for name, param in self._parameters.items()
        }

    # ========================================================================
    # V14.0.2: Metodi GP e Adattivi
    # ========================================================================

    def _params_to_vector(self, params: Dict[str, Any]) -> List[float]:
        """Converte dict parametri in vettore normalizzato [0, 1].

        Args:
            params: Dizionario parametro -> valore

        Returns:
            Lista di valori normalizzati
        """
        vector = []
        for name, param in self._parameters.items():
            value = params.get(name, param.current_value)
            # Normalizza a [0, 1]
            range_size = param.max_value - param.min_value
            if range_size > 0:
                normalized = (value - param.min_value) / range_size
            else:
                normalized = 0.5
            vector.append(normalized)
        return vector

    def _vector_to_params(self, vector: List[float]) -> Dict[str, Any]:
        """Converte vettore normalizzato in dict parametri.

        Args:
            vector: Lista di valori normalizzati [0, 1]

        Returns:
            Dizionario parametro -> valore denormalizzato
        """
        params = {}
        param_names = list(self._parameters.keys())
        for i, name in enumerate(param_names):
            param = self._parameters[name]
            normalized = vector[i] if i < len(vector) else 0.5
            # Denormalizza
            value = param.min_value + normalized * (param.max_value - param.min_value)
            if param.param_type == "int":
                value = round(value)
            params[name] = value
        return params

    def _adaptive_n_candidates(self) -> int:
        """Calcola numero di candidati adattivo basato su dimensionalita.

        Formula: sqrt(dimensions) * base_factor

        V14.0.2: Adattivo alla dimensionalita dello spazio parametri.

        Returns:
            Numero di candidati da generare
        """
        n_dimensions = len(self._parameters)
        n_observations = len(self._observations_X)

        # Base factor dipende da quante osservazioni abbiamo
        if n_observations < 10:
            # Early exploration: piu candidati
            base_factor = 10
        elif n_observations < 50:
            # Medium exploration
            base_factor = 5
        else:
            # Exploitation: meno candidati, piu precisione
            base_factor = 3

        # Formula: sqrt(dimensions) * factor
        n_candidates = int(math.sqrt(n_dimensions) * base_factor)

        # Bounds
        min_candidates = max(5, n_dimensions * 2)  # Almeno 2x dimensions
        max_candidates = 100  # Max per performance

        return max(min_candidates, min(max_candidates, n_candidates))

    def _generate_candidates(self, n_candidates: int) -> List[Dict[str, Any]]:
        """Genera candidati usando Latin Hypercube Sampling.

        V14.0.2: LHS per better coverage dello spazio parametri.

        Args:
            n_candidates: Numero di candidati da generare

        Returns:
            Lista di dict parametri candidati
        """
        n_dimensions = len(self._parameters)

        if not NUMPY_AVAILABLE:
            # Fallback: random uniform
            return [self._sample_random_params() for _ in range(n_candidates)]

        # Try Latin Hypercube Sampling
        try:
            from scipy.stats import qmc  # type: ignore
            sampler = qmc.LatinHypercube(d=n_dimensions)
            samples = sampler.random(n=n_candidates)
        except ImportError:
            # Fallback: random uniform numpy
            samples = np.random.uniform(0, 1, size=(n_candidates, n_dimensions))

        # Converti samples in parametri
        candidates = []
        for sample in samples:
            params = self._vector_to_params(sample.tolist())
            candidates.append(params)

        return candidates

    def _ucb_suggest_with_gp(self) -> Dict[str, Any]:
        """Suggerisce parametri usando UCB con vero GP.

        V14.0.2: Usa GP per uncertainty quantification reale.

        Returns:
            Dizionario parametro -> valore suggerito
        """
        if not self._history or len(self._observations_X) < 3:
            return self._sample_random_params()

        # Genera candidati con n adattivo
        n_candidates = self._adaptive_n_candidates()
        candidates = self._generate_candidates(n_candidates)

        if not NUMPY_AVAILABLE:
            # Fallback: usa vecchio metodo
            return self._ucb_suggest()

        best_score = -np.inf
        best_params = None

        for candidate in candidates:
            X_candidate = np.array(self._params_to_vector(candidate)).reshape(1, -1)

            # GP prediction
            mu, var = self._gp.predict(X_candidate)
            std = np.sqrt(var[0])

            # UCB: mu + kappa * std
            # Denormalizza mu per avere score reale
            mu_real = mu[0] * self._y_std + self._y_mean
            ucb_score = mu_real + self._kappa * std * self._y_std

            if ucb_score > best_score:
                best_score = ucb_score
                best_params = candidate

        # Decay exploration rate (kappa)
        self._kappa = max(0.1, self._kappa * 0.95)

        return best_params or self._sample_random_params()

    def _ucb_suggest(self) -> Dict[str, Any]:
        """Suggerisce parametri usando Upper Confidence Bound (fallback).

        Genera N candidati e seleziona quello con UCB massimo.
        UCB = mean_prediction + kappa * std_prediction

        Returns:
            Dizionario parametro -> valore suggerito
        """
        if not self._history:
            return self._sample_random_params()

        # Genera candidati con n adattivo
        n_candidates = self._adaptive_n_candidates()
        candidates = self._generate_candidates(n_candidates)

        # Calcola UCB per ogni candidato
        best_candidate = None
        best_ucb = float('-inf')

        for candidate in candidates:
            ucb = self._calculate_ucb(candidate)
            if ucb > best_ucb:
                best_ucb = ucb
                best_candidate = candidate

        return best_candidate or self._sample_random_params()

    def _calculate_ucb(self, candidate: Dict[str, Any]) -> float:
        """Calcola Upper Confidence Bound per un candidato.

        Usa kernel RBF per pesare similarity con history.

        Args:
            candidate: Dizionario parametro -> valore

        Returns:
            Valore UCB
        """
        if not self._history:
            return 0.0

        # Calcola pesi usando kernel RBF
        weights = []
        for result in self._history:
            similarity = self._rbf_kernel(candidate, result.params)
            weights.append(similarity)

        # Normalizza pesi
        total_weight = sum(weights)
        if total_weight == 0:
            return 0.0
        weights = [w / total_weight for w in weights]

        # Weighted mean e variance
        scores = [r.score for r in self._history]
        mean = sum(w * s for w, s in zip(weights, scores))
        variance = sum(w * (s - mean) ** 2 for w, s in zip(weights, scores))
        std = math.sqrt(variance) if variance > 0 else 0.0

        # UCB = mean + kappa * std
        return mean + self.UCB_KAPPA * std

    def _rbf_kernel(self, params1: Dict[str, Any], params2: Dict[str, Any]) -> float:
        """Kernel RBF (Radial Basis Function) tra due set di parametri.

        Formula: exp(-sum((x_i - y_i)^2) / (2 * length_scale^2))

        Args:
            params1: Primo set di parametri
            params2: Secondo set di parametri

        Returns:
            Similarita RBF [0, 1]
        """
        squared_dist = 0.0
        for name, param in self._parameters.items():
            v1 = params1.get(name, param.current_value)
            v2 = params2.get(name, param.current_value)
            # Normalizza per range
            range_size = param.max_value - param.min_value
            if range_size > 0:
                normalized_diff = (v1 - v2) / range_size
                squared_dist += normalized_diff ** 2

        return math.exp(-squared_dist / (2 * self.RBF_LENGTH_SCALE ** 2))

    def _bayesian_update(self) -> None:
        """Aggiorna il modello Gaussian Process con nuove osservazioni.

        V14.0.2: Implementazione completa con RBF kernel.
        """
        if len(self._observations_X) < 3:
            return  # Troppo poche osservazioni

        if not NUMPY_AVAILABLE:
            logger.debug("NumPy not available, skipping GP update")
            return

        try:
            # Converti a numpy arrays
            X = np.array(self._observations_X)
            y = np.array(self._observations_y)

            # Normalizza y per stabilita numerica
            self._y_mean = float(np.mean(y))
            self._y_std = float(np.std(y))
            if self._y_std < 1e-10:
                self._y_std = 1.0
            y_normalized = (y - self._y_mean) / self._y_std

            # Fit GP
            self._gp.fit(X, y_normalized)

            logger.debug(
                f"GP updated with {len(X)} observations, "
                f"y_mean={self._y_mean:.4f}, y_std={self._y_std:.4f}"
            )

        except Exception as e:
            logger.warning(f"GP update failed: {e}, using fallback")

    # ========================================================================
    # Persistenza
    # ========================================================================

    def _load_history(self) -> None:
        """Carica history da file JSON."""
        if not self._config.history_file:
            return

        path = Path(self._config.history_file)
        if not path.exists():
            return

        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self._history = [
                OptimizationResult.from_dict(r) for r in data.get("history", [])
            ]
        except (json.JSONDecodeError, KeyError, TypeError):
            self._history = []

    def _save_history(self) -> None:
        """Salva history su file JSON."""
        if not self._config.history_file:
            return

        path = Path(self._config.history_file)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "history": [r.to_dict() for r in self._history],
            "timestamp": datetime.now().isoformat(),
            "config": {
                "exploration_rate": self._config.exploration_rate,
                "decay_rate": self._config.decay_rate,
                "min_samples": self._config.min_samples
            }
        }

        # Scrivi in modo atomico (scrivi su temp, poi rinomina)
        temp_path = path.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            temp_path.replace(path)
        except Exception as e:
            # Cleanup temp file on error
            logger.warning(f"AutoTuner: Failed to save state to {path}: {e}")
            if temp_path.exists():
                temp_path.unlink()
            raise

    # ========================================================================
    # Context Manager
    # ========================================================================

    def __enter__(self) -> 'AutoTuner':
        """Supporto context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Cleanup su uscita context."""
        if self._config.history_file:
            self._save_history()


# ============================================================================
# Factory Function
# ============================================================================

def create_auto_tuner(history_path: Optional[str] = None) -> AutoTuner:
    """Crea AutoTuner con path history opzionale.

    Args:
        history_path: Path file history JSON (opzionale)

    Returns:
        Istanza AutoTuner configurata
    """
    config = AutoTunerConfig()
    if history_path:
        config.history_file = history_path
    return AutoTuner(config)
