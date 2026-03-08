"""A/B Testing Framework for Orchestrator V14.0.3.

Features:
- Esperimenti con varianti A/B
- Assegnazione deterministica (hash-based, 50/50 split)
- Z-test per statistical significance (alpha = 0.05)
- Minimo 30 campioni per variante prima di valutare
- Thread-safe con RLock
- Persistenza JSON

Usage:
    from lib.ab_testing import ABTestingFramework, RoutingStrategy

    # Crea strategie
    control = RoutingStrategy("default", {"mode": "haiku"})
    treatment = RoutingStrategy("fast", {"mode": "haiku", "cache": True})

    # Crea framework ed esperimento
    ab = ABTestingFramework()
    exp = ab.create_experiment("routing_test", control, treatment)

    # Assegna variante (deterministica per user_id)
    variant = ab.assign_variant("routing_test", "user_123")

    # Registra risultato
    ab.record_result("routing_test", variant, success=True)

    # Ottieni risultato statistico
    result = ab.get_result("routing_test")
    if result and result.is_significant:
        print(f"Winner: {result.winner} (confidence: {result.confidence:.2%})")
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
import math
import threading
import time
import hashlib
import logging

logger = logging.getLogger(__name__)

# Costanti
MIN_SAMPLES_PER_VARIANT = 30
ALPHA = 0.05  # Soglia significativita statistica
Z_CRITICAL = 1.96  # Z-score critico per alpha = 0.05 (two-tailed)


@dataclass
class RoutingStrategy:
    """Strategia di routing da testare.

    Attributes:
        name: Nome identificativo della strategia
        params: Parametri della strategia (es. mode, cache_enabled, etc.)
    """
    name: str
    params: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "name": self.name,
            "params": self.params
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RoutingStrategy":
        """Crea da dizionario."""
        return cls(name=data["name"], params=data.get("params", {}))


@dataclass
class Experiment:
    """Esperimento A/B.

    Attributes:
        name: Nome identificativo dell'esperimento
        control: Strategia di controllo (variante A)
        treatment: Strategia di trattamento (variante B)
        samples_control: Numero di campioni nella variante di controllo
        samples_treatment: Numero di campioni nella variante di trattamento
        successes_control: Numero di successi nella variante di controllo
        successes_treatment: Numero di successi nella variante di trattamento
        created_at: Timestamp di creazione
        active: Se l'esperimento e attivo
    """
    name: str
    control: RoutingStrategy
    treatment: RoutingStrategy
    samples_control: int = 0
    samples_treatment: int = 0
    successes_control: int = 0
    successes_treatment: int = 0
    created_at: float = field(default_factory=time.time)
    active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "name": self.name,
            "control": self.control.to_dict(),
            "treatment": self.treatment.to_dict(),
            "samples_control": self.samples_control,
            "samples_treatment": self.samples_treatment,
            "successes_control": self.successes_control,
            "successes_treatment": self.successes_treatment,
            "created_at": self.created_at,
            "active": self.active
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Experiment":
        """Crea da dizionario."""
        return cls(
            name=data["name"],
            control=RoutingStrategy.from_dict(data["control"]),
            treatment=RoutingStrategy.from_dict(data["treatment"]),
            samples_control=data.get("samples_control", 0),
            samples_treatment=data.get("samples_treatment", 0),
            successes_control=data.get("successes_control", 0),
            successes_treatment=data.get("successes_treatment", 0),
            created_at=data.get("created_at", time.time()),
            active=data.get("active", True)
        )

    @property
    def total_samples(self) -> int:
        """Totale campioni raccolti."""
        return self.samples_control + self.samples_treatment

    @property
    def has_minimum_samples(self) -> bool:
        """Verifica se ci sono abbastanza campioni per valutazione statistica."""
        return (
            self.samples_control >= MIN_SAMPLES_PER_VARIANT and
            self.samples_treatment >= MIN_SAMPLES_PER_VARIANT
        )


@dataclass
class ExperimentResult:
    """Risultato di un esperimento A/B.

    Attributes:
        experiment_name: Nome dell'esperimento
        winner: Nome della variante vincente (o None se non determinato)
        confidence: Livello di confidenza (0.0 - 1.0)
        z_score: Z-score calcolato
        p_value: P-value calcolato
        is_significant: Se il risultato e statisticamente significativo
        control_rate: Tasso di successo del controllo
        treatment_rate: Tasso di successo del trattamento
        samples_control: Campioni nel controllo
        samples_treatment: Campioni nel trattamento
    """
    experiment_name: str
    winner: Optional[str]
    confidence: float
    z_score: float
    p_value: float
    is_significant: bool
    control_rate: float = 0.0
    treatment_rate: float = 0.0
    samples_control: int = 0
    samples_treatment: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario."""
        return {
            "experiment_name": self.experiment_name,
            "winner": self.winner,
            "confidence": self.confidence,
            "z_score": self.z_score,
            "p_value": self.p_value,
            "is_significant": self.is_significant,
            "control_rate": self.control_rate,
            "treatment_rate": self.treatment_rate,
            "samples_control": self.samples_control,
            "samples_treatment": self.samples_treatment
        }


class ABTestingFramework:
    """Framework per A/B testing di routing strategy.

    Implementa esperimenti A/B con:
    - Assegnazione deterministica basata su hash
    - Z-test per significativita statistica
    - Persistenza su disco
    - Thread-safety

    Example:
        >>> ab = ABTestingFramework()
        >>> control = RoutingStrategy("default", {"mode": "haiku"})
        >>> treatment = RoutingStrategy("cached", {"mode": "haiku", "cache": True})
        >>> ab.create_experiment("cache_test", control, treatment)
        >>> variant = ab.assign_variant("cache_test", "user_123")
        >>> ab.record_result("cache_test", variant, success=True)
    """

    def __init__(self, storage_path: Optional[str] = None):
        """Inizializza il framework A/B testing.

        Args:
            storage_path: Percorso file per persistenza (default: ~/.claude/data/ab_experiments.json)
        """
        self._experiments: Dict[str, Experiment] = {}
        self._storage_path = storage_path or str(
            Path.home() / ".claude" / "data" / "ab_experiments.json"
        )
        self._lock = threading.RLock()
        self._load()

    def create_experiment(
        self,
        name: str,
        control: RoutingStrategy,
        treatment: RoutingStrategy
    ) -> Experiment:
        """Crea un nuovo esperimento A/B.

        Args:
            name: Nome identificativo dell'esperimento
            control: Strategia di controllo (variante A)
            treatment: Strategia di trattamento (variante B)

        Returns:
            L'esperimento creato

        Raises:
            ValueError: Se esiste gia un esperimento con lo stesso nome
        """
        with self._lock:
            if name in self._experiments:
                raise ValueError(f"Esperimento '{name}' esiste gia")

            experiment = Experiment(
                name=name,
                control=control,
                treatment=treatment
            )
            self._experiments[name] = experiment
            self._save()

            logger.info(
                f"Creato esperimento A/B: {name} "
                f"(control={control.name}, treatment={treatment.name})"
            )
            return experiment

    def get_experiment(self, name: str) -> Optional[Experiment]:
        """Ottiene un esperimento per nome.

        Args:
            name: Nome dell'esperimento

        Returns:
            L'esperimento o None se non esiste
        """
        with self._lock:
            return self._experiments.get(name)

    def list_experiments(self, active_only: bool = True) -> List[Experiment]:
        """Lista tutti gli esperimenti.

        Args:
            active_only: Se True, ritorna solo esperimenti attivi

        Returns:
            Lista di esperimenti
        """
        with self._lock:
            experiments = list(self._experiments.values())
            if active_only:
                experiments = [e for e in experiments if e.active]
            return experiments

    def assign_variant(self, experiment_name: str, user_id: str) -> str:
        """Assegna una variante (control/treatment) in modo deterministico.

        L'assegnazione e basata su hash SHA-256 per garantire:
        - Determinismo: stesso user_id ottiene sempre la stessa variante
        - Distribuzione 50/50: split equilibrato tra varianti

        Args:
            experiment_name: Nome dell'esperimento
            user_id: Identificativo dell'utente

        Returns:
            "control" o "treatment"

        Raises:
            ValueError: Se l'esperimento non esiste o non e attivo
        """
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if experiment is None:
                raise ValueError(f"Esperimento '{experiment_name}' non trovato")
            if not experiment.active:
                raise ValueError(f"Esperimento '{experiment_name}' non e attivo")

            # Hash deterministico per assegnazione 50/50
            hash_input = f"{user_id}:{experiment_name}"
            hash_value = hashlib.sha256(hash_input.encode()).hexdigest()
            # Usa gli ultimi 8 caratteri come numero
            hash_int = int(hash_value[-8:], 16)

            # 50/50 split
            variant = "control" if hash_int % 2 == 0 else "treatment"
            return variant

    def record_result(
        self,
        experiment_name: str,
        variant: str,
        success: bool
    ) -> None:
        """Registra il risultato di un'esecuzione.

        Args:
            experiment_name: Nome dell'esperimento
            variant: "control" o "treatment"
            success: Se l'esecuzione e stata un successo

        Raises:
            ValueError: Se l'esperimento o la variante non sono validi
        """
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if experiment is None:
                raise ValueError(f"Esperimento '{experiment_name}' non trovato")

            if variant not in ("control", "treatment"):
                raise ValueError(f"Variante '{variant}' non valida")

            if variant == "control":
                experiment.samples_control += 1
                if success:
                    experiment.successes_control += 1
            else:
                experiment.samples_treatment += 1
                if success:
                    experiment.successes_treatment += 1

            self._save()

    def get_result(self, experiment_name: str) -> Optional[ExperimentResult]:
        """Calcola il risultato statistico di un esperimento.

        Esegue z-test per determinare se c'e una differenza statisticamente
        significativa tra le due varianti.

        Args:
            experiment_name: Nome dell'esperimento

        Returns:
            ExperimentResult con statistiche, o None se non ci sono abbastanza dati
        """
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if experiment is None:
                return None

            # Verifica campioni minimi
            if not experiment.has_minimum_samples:
                logger.debug(
                    f"Esperimento '{experiment_name}': campioni insufficienti "
                    f"(control={experiment.samples_control}, treatment={experiment.samples_treatment}, "
                    f"min={MIN_SAMPLES_PER_VARIANT})"
                )
                return ExperimentResult(
                    experiment_name=experiment_name,
                    winner=None,
                    confidence=0.0,
                    z_score=0.0,
                    p_value=1.0,
                    is_significant=False,
                    control_rate=0.0,
                    treatment_rate=0.0,
                    samples_control=experiment.samples_control,
                    samples_treatment=experiment.samples_treatment
                )

            # Calcola tassi di successo
            control_rate = (
                experiment.successes_control / experiment.samples_control
                if experiment.samples_control > 0 else 0.0
            )
            treatment_rate = (
                experiment.successes_treatment / experiment.samples_treatment
                if experiment.samples_treatment > 0 else 0.0
            )

            # Esegui z-test
            z_score, p_value = self._z_test(
                control_rate,
                treatment_rate,
                experiment.samples_control,
                experiment.samples_treatment
            )

            # Determina significativita
            is_significant = p_value < ALPHA
            confidence = 1.0 - p_value

            # Determina vincitore
            winner = None
            if is_significant:
                winner = "control" if control_rate > treatment_rate else "treatment"

            return ExperimentResult(
                experiment_name=experiment_name,
                winner=winner,
                confidence=confidence,
                z_score=z_score,
                p_value=p_value,
                is_significant=is_significant,
                control_rate=control_rate,
                treatment_rate=treatment_rate,
                samples_control=experiment.samples_control,
                samples_treatment=experiment.samples_treatment
            )

    def _z_test(
        self,
        p1: float,
        p2: float,
        n1: int,
        n2: int
    ) -> Tuple[float, float]:
        """Esegue z-test per due proporzioni.

        Formula:
            z = (p1 - p2) / sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
            dove p_pool = (x1 + x2) / (n1 + n2)

        Edge cases gestiti:
            - p_pool = 0: Tutti fallimenti -> z_score = 0, p_value = 1
              (nessuna differenza distinguibile, nessuna varianza)
            - p_pool = 1: Tutti successi -> z_score = 0, p_value = 1
              (nessuna differenza distinguibile, nessuna varianza)
            - se = 0: Standard error zero -> z_score = 0, p_value = 1
              (caso teorico, non dovrebbe verificarsi se p_pool != 0,1)

        Args:
            p1: Proporzione campione 1 (control)
            p2: Proporzione campione 2 (treatment)
            n1: Dimensione campione 1
            n2: Dimensione campione 2

        Returns:
            Tupla (z_score, p_value)
            - (0.0, 1.0) per edge cases (nessuna significativita)
        """
        # Pooled proportion
        p_pool = (p1 * n1 + p2 * n2) / (n1 + n2)

        # Edge case: tutti successi o tutti fallimenti
        # Quando p_pool = 0 o 1, non c'e varianza e non si puo
        # distinguere tra le varianti statisticamente
        if p_pool == 0 or p_pool == 1:
            logger.debug(
                f"Z-test edge case: p_pool={p_pool:.4f} "
                f"(p1={p1:.4f}, p2={p2:.4f}, n1={n1}, n2={n2})"
            )
            return 0.0, 1.0

        # Standard error
        se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))

        # Edge case: standard error zero (sicurezza aggiuntiva)
        if se == 0:
            logger.warning(
                f"Z-test edge case: se=0 nonostante p_pool={p_pool:.4f}"
            )
            return 0.0, 1.0

        # Z-score
        z_score = (p1 - p2) / se

        # P-value (two-tailed) usando funzione errore
        # Per z grande, p_value e molto piccolo
        p_value = 2 * (1 - self._normal_cdf(abs(z_score)))

        return z_score, p_value

    def _normal_cdf(self, x: float) -> float:
        """Cumulative distribution function per distribuzione normale standard.

        Approssimazione usando la funzione errore.

        Args:
            x: Valore

        Returns:
            CDF(x)
        """
        # Approssimazione della funzione errore
        # erf(x) = 2/sqrt(pi) * integral_0^x e^(-t^2) dt
        # CDF(x) = 0.5 * (1 + erf(x / sqrt(2)))

        # Costanti per approssimazione
        a1 = 0.254829592
        a2 = -0.284496736
        a3 = 1.421413741
        a4 = -1.453152027
        a5 = 1.061405429
        p = 0.3275911

        sign = 1 if x >= 0 else -1
        x = abs(x) / math.sqrt(2)

        t = 1.0 / (1.0 + p * x)
        y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)

        return 0.5 * (1.0 + sign * y)

    def stop_experiment(self, name: str) -> bool:
        """Ferma un esperimento attivo.

        Args:
            name: Nome dell'esperimento

        Returns:
            True se fermato, False se non esisteva

        Raises:
            ValueError: Se l'esperimento non esiste
        """
        with self._lock:
            experiment = self._experiments.get(name)
            if experiment is None:
                raise ValueError(f"Esperimento '{name}' non trovato")

            if not experiment.active:
                return False

            experiment.active = False
            self._save()

            logger.info(f"Esperimento '{name}' fermato")
            return True

    def delete_experiment(self, name: str) -> bool:
        """Elimina un esperimento.

        Args:
            name: Nome dell'esperimento

        Returns:
            True se eliminato, False se non esisteva
        """
        with self._lock:
            if name not in self._experiments:
                return False

            del self._experiments[name]
            self._save()

            logger.info(f"Esperimento '{name}' eliminato")
            return True

    def _load(self) -> None:
        """Carica esperimenti da disco."""
        try:
            path = Path(self._storage_path)
            if not path.exists():
                logger.debug(f"File storage non esistente: {self._storage_path}")
                return

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for name, exp_data in data.get("experiments", {}).items():
                self._experiments[name] = Experiment.from_dict(exp_data)

            logger.info(
                f"Caricati {len(self._experiments)} esperimenti da {self._storage_path}"
            )

        except Exception as e:
            logger.warning(f"Errore caricamento esperimenti: {e}")
            self._experiments = {}

    def _save(self) -> None:
        """Salva esperimenti su disco."""
        try:
            path = Path(self._storage_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            data = {
                "version": "1.0",
                "updated_at": time.time(),
                "experiments": {
                    name: exp.to_dict()
                    for name, exp in self._experiments.items()
                }
            }

            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            logger.debug(f"Salvati {len(self._experiments)} esperimenti")

        except Exception as e:
            logger.error(f"Errore salvataggio esperimenti: {e}")


# Funzioni utility per uso diretto

def create_routing_experiment(
    name: str,
    control_params: Dict[str, Any],
    treatment_params: Dict[str, Any],
    framework: Optional[ABTestingFramework] = None
) -> Experiment:
    """Crea un esperimento di routing strategy.

    Args:
        name: Nome dell'esperimento
        control_params: Parametri controllo
        treatment_params: Parametri trattamento
        framework: Framework esistente (o ne crea uno nuovo)

    Returns:
        Esperimento creato
    """
    ab = framework or ABTestingFramework()

    control = RoutingStrategy(f"{name}_control", control_params)
    treatment = RoutingStrategy(f"{name}_treatment", treatment_params)

    return ab.create_experiment(name, control, treatment)


def get_variant_for_user(
    experiment_name: str,
    user_id: str,
    framework: Optional[ABTestingFramework] = None
) -> str:
    """Ottiene la variante per un utente.

    Args:
        experiment_name: Nome esperimento
        user_id: ID utente
        framework: Framework esistente

    Returns:
        "control" o "treatment"
    """
    ab = framework or ABTestingFramework()
    return ab.assign_variant(experiment_name, user_id)


# Esportazioni pubbliche
__all__ = [
    "ABTestingFramework",
    "RoutingStrategy",
    "Experiment",
    "ExperimentResult",
    "create_routing_experiment",
    "get_variant_for_user",
    "MIN_SAMPLES_PER_VARIANT",
    "ALPHA",
    "Z_CRITICAL",
]
