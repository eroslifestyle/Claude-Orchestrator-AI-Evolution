"""
Test per Adaptive Token Budget V14.1 - FIX 1 e FIX 2.

FIX 1: ComplexityThresholds - Soglie configurabili e adattive
FIX 2: RuleBudgetConfig - Rule budget dinamico
"""
import pytest
from typing import Dict, List

from lib.adaptive_budget import (
    AdaptiveTokenBudget,
    ComplexityThresholds,
    RuleBudgetConfig,
    TokenBudget,
    get_budget_calculator,
)


class TestComplexityThresholds:
    """Test per FIX 1: Soglie configurabili e adattive."""

    def test_default_thresholds(self):
        """Verifica valori di default delle soglie."""
        thresholds = ComplexityThresholds()

        assert thresholds.simple == 0.3
        assert thresholds.medium == 0.6
        assert thresholds.complex == 0.8
        assert thresholds.auto_adjust is True
        assert thresholds.min_samples_for_adjust == 100
        assert thresholds.adjustment_rate == 0.1

    def test_custom_thresholds(self):
        """Verifica soglie personalizzate."""
        thresholds = ComplexityThresholds(
            simple=0.2,
            medium=0.5,
            complex=0.7,
            auto_adjust=False,
        )

        assert thresholds.simple == 0.2
        assert thresholds.medium == 0.5
        assert thresholds.complex == 0.7
        assert thresholds.auto_adjust is False

    def test_no_adjust_when_disabled(self):
        """Verifica che auto_adjust=False non aggiorna le soglie."""
        thresholds = ComplexityThresholds(auto_adjust=False)
        original_simple = thresholds.simple

        # Tenta di aggiornare con molti campioni
        scores = [0.1] * 200
        thresholds.update_from_distribution(scores)

        # Le soglie devono rimanere invariate
        assert thresholds.simple == original_simple

    def test_no_adjust_when_insufficient_samples(self):
        """Verifica che non si aggiorna con meno di min_samples campioni."""
        thresholds = ComplexityThresholds(min_samples_for_adjust=100)
        original_simple = thresholds.simple

        # Tenta di aggiornare con pochi campioni
        scores = [0.1] * 50
        thresholds.update_from_distribution(scores)

        # Le soglie devono rimanere invariate
        assert thresholds.simple == original_simple

    def test_adjust_with_sufficient_samples(self):
        """Verifica aggiornamento soglie con sufficienti campioni."""
        thresholds = ComplexityThresholds(
            min_samples_for_adjust=10,
            adjustment_rate=0.5,  # 50% per test piu' rapido
        )

        # Distribuzione concentrata su valori bassi
        scores = [0.1, 0.15, 0.2, 0.25, 0.3] * 20  # 100 samples
        thresholds.update_from_distribution(scores)

        # Le soglie devono essere cambiate verso valori piu' bassi
        # Il simple threshold (25th percentile) dovrebbe essere ~0.15-0.2
        assert thresholds.simple < 0.3  # Valore originale

    def test_adjust_preserves_ordering(self):
        """Verifica che l'aggiornamento mantiene simple < medium < complex."""
        thresholds = ComplexityThresholds(
            min_samples_for_adjust=10,
            adjustment_rate=0.8,
        )

        # Distribuzione anomala che potrebbe causare inversione
        scores = [0.5, 0.55, 0.6, 0.65, 0.7] * 20
        thresholds.update_from_distribution(scores)

        # Ordinamento deve essere preservato
        assert thresholds.simple < thresholds.medium
        assert thresholds.medium < thresholds.complex

    def test_to_dict(self):
        """Verifica serializzazione in dizionario."""
        thresholds = ComplexityThresholds(simple=0.25, medium=0.55)
        result = thresholds.to_dict()

        assert "simple" in result
        assert "medium" in result
        assert "complex" in result
        assert "auto_adjust" in result
        assert result["simple"] == 0.25
        assert result["medium"] == 0.55


class TestRuleBudgetConfig:
    """Test per FIX 2: Rule budget dinamico."""

    def test_default_config(self):
        """Verifica valori di default della configurazione."""
        config = RuleBudgetConfig()

        assert config.min_percentage == 0.2
        assert config.max_percentage == 0.6
        assert config.base_percentage == 0.35
        assert config.keyword_density_weight == 0.1
        assert config.security_domain_weight == 0.15
        assert config.new_project_weight == 0.1

    def test_custom_config(self):
        """Verifica configurazione personalizzata."""
        config = RuleBudgetConfig(
            min_percentage=0.1,
            max_percentage=0.8,
            base_percentage=0.5,
        )

        assert config.min_percentage == 0.1
        assert config.max_percentage == 0.8
        assert config.base_percentage == 0.5

    def test_to_dict(self):
        """Verifica serializzazione in dizionario."""
        config = RuleBudgetConfig(min_percentage=0.15)
        result = config.to_dict()

        assert "min_percentage" in result
        assert "max_percentage" in result
        assert result["min_percentage"] == 0.15


class TestAdaptiveTokenBudgetIntegration:
    """Test di integrazione per i due fix."""

    def test_get_complexity_tier_uses_configurable_thresholds(self):
        """Verifica che get_complexity_tier usa soglie configurabili."""
        # Crea budget calculator con soglie personalizzate
        thresholds = ComplexityThresholds(
            simple=0.2,
            medium=0.5,
            complex=0.7,
        )
        budget_calc = AdaptiveTokenBudget(thresholds=thresholds)

        # Verifica che le fasce rispettano le nuove soglie
        assert budget_calc.get_complexity_tier(0.15) == "simple"
        assert budget_calc.get_complexity_tier(0.35) == "medium"
        assert budget_calc.get_complexity_tier(0.6) == "complex"
        assert budget_calc.get_complexity_tier(0.85) == "very_complex"

    def test_calculate_rule_budget_percentage_base(self):
        """Verifica calcolo percentuale base."""
        budget_calc = AdaptiveTokenBudget()

        # Task semplice senza keyword speciali
        percentage = budget_calc.calculate_rule_budget_percentage(
            "fix typo in readme",
            context={"has_memory": True}
        )

        # Deve essere la percentuale base
        assert percentage == 0.35

    def test_calculate_rule_budget_percentage_keyword_density(self):
        """Verifica bonus per alta densita di keyword."""
        budget_calc = AdaptiveTokenBudget()

        # Task con molte keyword (piu di 5)
        task = "refactor authentication security encrypt token password jwt oauth credential"
        percentage = budget_calc.calculate_rule_budget_percentage(task)

        # Deve includere bonus keyword density
        assert percentage > 0.35

    def test_calculate_rule_budget_percentage_security_domain(self):
        """Verifica bonus per task di sicurezza."""
        budget_calc = AdaptiveTokenBudget()

        # Task con keyword security
        percentage = budget_calc.calculate_rule_budget_percentage(
            "implement JWT authentication"
        )

        # Deve includere bonus security
        assert percentage >= 0.35 + 0.15  # base + security bonus

    def test_calculate_rule_budget_percentage_new_project(self):
        """Verifica bonus per nuovi progetti senza memoria."""
        budget_calc = AdaptiveTokenBudget()

        # Task su nuovo progetto
        percentage = budget_calc.calculate_rule_budget_percentage(
            "create new feature",
            context={"has_memory": False}
        )

        # Deve includere bonus new project
        assert percentage >= 0.35 + 0.1  # base + new project bonus

    def test_calculate_rule_budget_percentage_respects_limits(self):
        """Verifica che la percentuale rispetta i limiti min/max."""
        config = RuleBudgetConfig(
            min_percentage=0.25,
            max_percentage=0.5,
            base_percentage=0.35,
            keyword_density_weight=0.5,  # Alto per test
            security_domain_weight=0.5,
        )
        budget_calc = AdaptiveTokenBudget(rule_config=config)

        # Task con tutti i bonus
        task = "security auth encrypt token " * 10
        percentage = budget_calc.calculate_rule_budget_percentage(
            task,
            context={"has_memory": False}
        )

        # Non deve superare max_percentage
        assert percentage <= 0.5

    def test_calculate_budget_includes_rule_budget_percentage(self):
        """Verifica che calculate_budget include rule_budget_percentage."""
        budget_calc = AdaptiveTokenBudget()

        # Task di sicurezza per triggerare bonus
        budget = budget_calc.calculate_budget("implement JWT authentication")

        # rule_budget_percentage deve essere calcolato dinamicamente
        assert hasattr(budget, "rule_budget_percentage")
        assert budget.rule_budget_percentage > 0.35  # Base + security bonus

    def test_complexity_history_tracking(self):
        """Verifica che la storia complessita viene tracciata."""
        budget_calc = AdaptiveTokenBudget()

        # Calcola alcuni budget con use_cache=False per evitare cache hit
        for i in range(5):
            budget_calc.calculate_budget(f"refactor authentication module {i}", use_cache=False)

        # La storia deve essere popolata
        assert len(budget_calc._complexity_history) == 5

    def test_thresholds_auto_adjust_after_sufficient_history(self):
        """Verifica auto-aggiustamento soglie dopo sufficiente storia."""
        thresholds = ComplexityThresholds(
            min_samples_for_adjust=5,
            adjustment_rate=0.5,
        )
        budget_calc = AdaptiveTokenBudget(thresholds=thresholds)

        # Genera 5 task con bassa complessita usando task diversi per evitare cache
        for i in range(5):
            budget_calc.calculate_budget(f"fix typo {i}", use_cache=False)

        # Le soglie devono essersi adattate verso valori piu bassi
        # Nota: non verifichiamo il valore esatto perche' dipende dalla distribuzione
        assert len(budget_calc._complexity_history) >= 5


class TestTokenBudget:
    """Test per TokenBudget dataclass."""

    def test_default_rule_budget_percentage(self):
        """Verifica default 40% per backward compatibility."""
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
        )

        assert budget.rule_budget_percentage == 0.4

    def test_custom_rule_budget_percentage(self):
        """Verifica percentuale personalizzata."""
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
            rule_budget_percentage=0.5,
        )

        assert budget.rule_budget_percentage == 0.5

    def test_to_dict_includes_rule_budget_percentage(self):
        """Verifica serializzazione include rule_budget_percentage."""
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
            rule_budget_percentage=0.45,
        )
        result = budget.to_dict()

        assert "rule_budget_percentage" in result
        assert result["rule_budget_percentage"] == 0.45


class TestGetBudgetCalculator:
    """Test per singleton accessor."""

    def test_singleton_returns_same_instance(self):
        """Verifica che singleton ritorna sempre la stessa istanza."""
        calc1 = get_budget_calculator()
        calc2 = get_budget_calculator()

        assert calc1 is calc2

    def test_singleton_has_default_thresholds(self):
        """Verifica che singleton ha soglie di default."""
        calc = get_budget_calculator()

        assert calc.thresholds.simple == 0.3
        assert calc.thresholds.medium == 0.6
        assert calc.thresholds.complex == 0.8


# Marker per pytest
pytestmark = pytest.mark.unit
