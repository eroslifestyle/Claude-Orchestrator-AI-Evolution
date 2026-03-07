# Quick Start - Orchestrator V14.0.3 AI-NATIVE

## Cos'è l'Orchestrator

L'Orchestrator è un sistema che coordina automaticamente agenti specializzati per completare i tuoi task. Tu scrivi cosa vuoi in linguaggio naturale, lui decide quale agente usare e come eseguire il lavoro.

## Come Attivarlo

**Non c'è nulla da attivare.** Basta scrivere il tuo task normalmente:

```
Analizza il file src/main.py
```

```
Aggiungi un endpoint per creare utenti
```

```
Refactorizza la funzione calculateTotal
```

L'Orchestrator rileva automaticamente il tipo di task e lo assegna all'agente giusto.

## I 3 Agenti Core

| Agente | Quando lo Usa | Cosa Fa |
|--------|---------------|----------|
| **Analyzer** | "Analizza", "Esamina", "Cosa fa questo codice?" | Legge e spiega il codice, trova problemi, documenta |
| **Coder** | "Implementa", "Aggiungi", "Fix", "Refactor" | Scrive, modifica o sistema codice |
| **Reviewer** | "Review", "Controlla", "Verifica" | Controlla qualità, sicurezza, best practices |

## Esempio Pratico

**Tu scrivi:**
```
Analizza il file auth/service.py
```

**Cosa succede dietro le quinte:**

1. **Orchestrator** analizza la richiesta → tipo: "analisi codice"
2. Seleziona **Analyzer** come agente appropriato
3. **Analyzer** legge il file e produce:
   - Spiegazione del codice
   - Eventuali problemi trovati
   - Suggerimenti migliorativi
4. **Orchestrator** ti mostra il risultato in una tabella chiara

## Troubleshooting Base

### Problema: "L'Orchestrator non parte"
**Causa:** Hai scritto solo "ciao" o messaggi brevi senza task
**Soluzione:** Sii specifico: "Analizza auth.py" invece di "ciao"

### Problema: "Risposta troppo generica"
**Causa:** Manca contesto su file/cartella
**Soluzione:** Specifica sempre il percorso completo del file

### Problema: "Non fa quello che voglio"
**Causa:** Task ambiguo (es. "sistema il codice")
**Soluzione:** Sii specifico: "Fix il bug auth: manca validate_email()"

## Funzionalita AI-NATIVE (V14.0.3)

Orchestrator V14 include 4 moduli di auto-ottimizzazione:

### 1. Predictive Caching
Il sistema predice quali agent serviranno e li precarica.

### 2. Adaptive Budget
Calcola automaticamente il budget token in base alla complessita del task.

### 3. A/B Testing
Permette di testare diverse strategie di routing con analisi statistica.

### 4. Auto-Tuning
Ottimizza automaticamente i parametri del sistema usando Bayesian optimization.

### Prestazioni V14.0.3
- **9,015 ops/sec** throughput
- **0% error rate**
- **39.82 bytes/op** memoria

## Per Approfondire

- **Documentazione completa:** `docs/INDEX.md`
- **Agenti disponibili:** `docs/agents.md`
- **Regole di codice:** `rules/README.md`
- **Changelog:** `docs/changelog.md`

## Consigli Rapidi

✅ **DO:**
- Specifica sempre i percorsi completi dei file
- Sii specifico sul tipo di operazione (analizza, implementa, review)
- Fornisci contesto se il task è complesso

❌ **DON'T:**
- Aspettarti che l'Orchestrator legga nella mente
- Usare messaggi troppo vaghi ("fa questo")
- Dimenticare di indicare quale file modificare

---

**Versione:** 3.0.0
**Orchestrator:** V14.0.3 AI-NATIVE
**Lingua:** Italiano
