"""Pure Python Gaussian Process fallback for Orchestrator V14.0.3.

This module provides a simplified Gaussian Process implementation using
inverse distance weighting, suitable for environments where NumPy/SciPy
are not available. Performance is approximately 10x slower than NumPy
but fully functional.

Usage:
    from lib.gp_fallback import GaussianProcessFallback

    gp = GaussianProcessFallback(length_scale=0.5)
    gp.fit(X_train, y_train)
    means, variances = gp.predict(X_test)
"""

import math
from typing import List, Tuple, Optional


class GaussianProcessFallback:
    """Simplified Gaussian Process using inverse distance weighting.

    This is a pure Python fallback for environments without NumPy.
    Uses RBF kernel approximation via inverse distance weighting.

    Attributes:
        length_scale: RBF kernel length scale parameter (default: 0.5)
        X_train: Training feature matrix
        y_train: Training target values
    """

    def __init__(self, length_scale: float = 0.5) -> None:
        """Initialize the Gaussian Process.

        Args:
            length_scale: RBF kernel length scale. Larger values = smoother
                         predictions. Default 0.5 works well for normalized [0,1] data.
        """
        if length_scale <= 0:
            raise ValueError(f"length_scale must be positive, got {length_scale}")
        self.length_scale = length_scale
        self.X_train: List[List[float]] = []
        self.y_train: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]) -> "GaussianProcessFallback":
        """Fit the Gaussian Process to training data.

        Args:
            X: Training features, shape (n_samples, n_features)
            y: Training targets, shape (n_samples,)

        Returns:
            self for method chaining

        Raises:
            ValueError: If X and y have incompatible shapes or are empty
        """
        if not X or not y:
            raise ValueError("Training data cannot be empty")
        if len(X) != len(y):
            raise ValueError(
                f"X and y must have same length, got {len(X)} vs {len(y)}"
            )

        self.X_train = [list(x) for x in X]  # Deep copy
        self.y_train = list(y)
        return self

    def _euclidean_distance(self, x1: List[float], x2: List[float]) -> float:
        """Calculate Euclidean distance between two points.

        Args:
            x1: First point
            x2: Second point

        Returns:
            Euclidean distance
        """
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(x1, x2)))

    def _rbf_weight(self, x1: List[float], x2: List[float]) -> float:
        """Calculate RBF kernel weight between two points.

        Uses the formula: exp(-||x1 - x2||^2 / (2 * length_scale^2))

        Args:
            x1: First point
            x2: Second point

        Returns:
            RBF kernel weight (0 to 1)
        """
        dist_sq = sum((a - b) ** 2 for a, b in zip(x1, x2))
        return math.exp(-dist_sq / (2 * self.length_scale ** 2))

    def predict(self, X: List[List[float]]) -> Tuple[List[float], List[float]]:
        """Predict using inverse distance weighting.

        Args:
            X: Test features, shape (n_samples, n_features)

        Returns:
            Tuple of (means, variances), each of shape (n_samples,)

        Raises:
            ValueError: If model has not been fitted
        """
        if not self.X_train:
            raise ValueError("Model must be fitted before prediction")

        means: List[float] = []
        variances: List[float] = []

        for x in X:
            # Calculate RBF weights for all training points
            weights = [self._rbf_weight(x, x_train) for x_train in self.X_train]

            total_weight = sum(weights)

            if total_weight > 1e-10:
                # Weighted mean
                mean = sum(w * y for w, y in zip(weights, self.y_train)) / total_weight

                # Weighted variance
                variance = (
                    sum(w * (y - mean) ** 2 for w, y in zip(weights, self.y_train))
                    / total_weight
                )
            else:
                # Fallback: use simple mean if all weights are near zero
                mean = sum(self.y_train) / len(self.y_train) if self.y_train else 0.0
                variance = 1.0  # High uncertainty for extrapolation

            # Ensure non-negative variance with small epsilon for numerical stability
            means.append(mean)
            variances.append(max(variance, 1e-10))

        return means, variances

    def predict_single(self, x: List[float]) -> Tuple[float, float]:
        """Predict for a single point.

        Args:
            x: Single test point

        Returns:
            Tuple of (mean, variance)
        """
        means, variances = self.predict([x])
        return means[0], variances[0]


def has_numpy() -> bool:
    """Check if NumPy is available.

    Returns:
        True if NumPy can be imported, False otherwise
    """
    try:
        import numpy  # noqa: F401
        return True
    except ImportError:
        return False


def get_gp_implementation(length_scale: float = 0.5) -> object:
    """Get the best available GP implementation.

    Returns NumPy-based implementation if available, otherwise fallback.

    Args:
        length_scale: RBF kernel length scale

    Returns:
        GP implementation instance
    """
    if has_numpy():
        # Try to import the NumPy-based implementation
        try:
            from lib.auto_tuner import GaussianProcessRegressor

            return GaussianProcessRegressor(length_scale=length_scale)
        except ImportError:
            pass

    return GaussianProcessFallback(length_scale=length_scale)
