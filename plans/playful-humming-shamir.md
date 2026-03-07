# PLAN: Adattamento Prezzi Broker V23

## Context

**Problema:** I segnali arrivano da broker esterni con prezzi che non corrispondono al broker dell'utente. Quando il segnale dice EURUSD BUY a 1.1000 con TP1=1.1026, ma il prezzo live è 1.1020, il TP viene eseguito solo 6 pips sopra invece di 26 pips.

**Soluzione:** Nuova opzione che ricalcola SL/TP mantenendo le distanze in pips originali, applicandole al prezzo live del broker.

**File:** `E:\Dropbox\1_Forex\Programmazione\Copier\MasterCopy\METATRADER\EXPERTS\MT5\Mt5_TgCopy.mq5`

---

## Implementazione

### 1. Nuovi Input Parameters (dopo linea 89)

```mql5
//=== ADATTAMENTO PREZZI BROKER V23 ===
input group "=== ADATTAMENTO PREZZI BROKER V23 ===";
input bool InpAdattaPrezziBroker = false;       // Adatta prezzi al broker (mantiene distanze pips)
input double InpSogliaAdattamentoPips = 10.0;   // Soglia minima pips per attivare
```

### 2. Nuova Funzione (dopo linea 2726, dopo CalcolaTPAuto)

```mql5
//+------------------------------------------------------------------+
//| AdattaPrezziAlBroker V23                                         |
//| Ricalcola SL/TP dal prezzo live mantenendo distanze pips originali|
//+------------------------------------------------------------------+
void AdattaPrezziAlBroker(string simboloBroker, double prezzoCorrente, SSegnaleTrade &segnale)
{
   if(!InpAdattaPrezziBroker) return;

   double punto = symbol_cache.GetSymbolPoint(simboloBroker);
   int cifre = symbol_cache.GetSymbolDigits(simboloBroker);

   if(punto <= 0) {
      LogPrint("ADATTA PREZZI: ERRORE - punto non valido per " + simboloBroker, true);
      return;
   }

   // Calcola differenza in pips
   double differenzaPips = MathAbs(prezzoCorrente - segnale.ingressoMin) / punto / 10;

   // Salta se sotto soglia
   if(differenzaPips < InpSogliaAdattamentoPips) {
      if(InpModoLog == LOG_VERBOSE)
         LogPrint("ADATTA PREZZI: Diff " + DoubleToString(differenzaPips,1) + " pips sotto soglia");
      return;
   }

   // Calcola distanze originali in pips
   double distanzaSL_pips = 0, distanzaTP1_pips = 0, distanzaTP2_pips = 0, distanzaTP3_pips = 0;

   if(segnale.stopLoss > 0)
      distanzaSL_pips = MathAbs(segnale.ingressoMin - segnale.stopLoss) / punto / 10;
   if(segnale.tp1 > 0)
      distanzaTP1_pips = MathAbs(segnale.tp1 - segnale.ingressoMin) / punto / 10;
   if(segnale.tp2 > 0)
      distanzaTP2_pips = MathAbs(segnale.tp2 - segnale.ingressoMin) / punto / 10;
   if(segnale.tp3 > 0)
      distanzaTP3_pips = MathAbs(segnale.tp3 - segnale.ingressoMin) / punto / 10;

   LogPrint("ADATTA PREZZI V23: Entry segnale " + DoubleToString(segnale.ingressoMin, cifre) +
            " → Live " + DoubleToString(prezzoCorrente, cifre) + " (" + DoubleToString(differenzaPips,1) + " pips)");

   // Applica al prezzo live
   if(segnale.tipo == "BUY") {
      if(distanzaSL_pips > 0)
         segnale.stopLoss = NormalizeDouble(prezzoCorrente - (distanzaSL_pips * punto * 10), cifre);
      if(distanzaTP1_pips > 0)
         segnale.tp1 = NormalizeDouble(prezzoCorrente + (distanzaTP1_pips * punto * 10), cifre);
      if(distanzaTP2_pips > 0)
         segnale.tp2 = NormalizeDouble(prezzoCorrente + (distanzaTP2_pips * punto * 10), cifre);
      if(distanzaTP3_pips > 0)
         segnale.tp3 = NormalizeDouble(prezzoCorrente + (distanzaTP3_pips * punto * 10), cifre);
   }
   else if(segnale.tipo == "SELL") {
      if(distanzaSL_pips > 0)
         segnale.stopLoss = NormalizeDouble(prezzoCorrente + (distanzaSL_pips * punto * 10), cifre);
      if(distanzaTP1_pips > 0)
         segnale.tp1 = NormalizeDouble(prezzoCorrente - (distanzaTP1_pips * punto * 10), cifre);
      if(distanzaTP2_pips > 0)
         segnale.tp2 = NormalizeDouble(prezzoCorrente - (distanzaTP2_pips * punto * 10), cifre);
      if(distanzaTP3_pips > 0)
         segnale.tp3 = NormalizeDouble(prezzoCorrente - (distanzaTP3_pips * punto * 10), cifre);
   }

   segnale.ingressoMin = prezzoCorrente;

   LogPrint("   ADATTATI: SL=" + DoubleToString(segnale.stopLoss, cifre) +
            " TP1=" + DoubleToString(segnale.tp1, cifre));
}
```

### 3. Hook Point in ProcessaSegnale() (linea 1818)

**Inserire dopo il blocco `prezzoInRange` e PRIMA della correzione XAUUSD:**

```mql5
   // === ADATTAMENTO PREZZI BROKER V23 ===
   if(InpAdattaPrezziBroker)
   {
      AdattaPrezziAlBroker(simboloBroker, prezzoCorrente, segnale);
   }
   // === FINE ADATTAMENTO ===
```

### 4. Versione Header (linea 7)

```mql5
#property version   "23.0"
```

Aggiungere descrizione:
```mql5
#property description "V23: Adattamento prezzi broker - mantiene distanze pips originali"
```

---

## Punti di Modifica

| Location | Riga | Azione |
|----------|------|--------|
| Input parameters | Dopo 89 | Aggiungere input group |
| Nuova funzione | Dopo 2726 | Aggiungere `AdattaPrezziAlBroker()` |
| ProcessaSegnale hook | 1818 | Chiamata alla funzione |
| Header versione | 7 | `version "23.0"` |

---

## Esempio Funzionamento

**Input:**
- Segnale: EURUSD BUY entry=1.1000, SL=1.0975 (-25 pips), TP1=1.1026 (+26 pips)
- Prezzo live broker: 1.1020
- `InpAdattaPrezziBroker = true`
- `InpSogliaAdattamentoPips = 10`

**Output (dopo adattamento):**
- Entry: 1.1020 (prezzo live)
- SL: 1.0995 (-25 pips da 1.1020)
- TP1: 1.1046 (+26 pips da 1.1020)

---

## Compatibilità

| Componente | Impatto |
|------------|---------|
| MODE_DINAMICA | Compatibile |
| MODE_TRE_ORDINI | Compatibile |
| MODE_XFUNDED | Compatibile |
| Correzione XAUUSD | Fallback (non si attiva se prezzi già adattati) |
| Comportamento esistente | Inalterato (default `false`) |

---

## Verification

1. **Compilazione:** MetaEditor F7 - nessun errore
2. **Test manuale:**
   - Attivare `InpAdattaPrezziBroker = true`
   - Inviare segnale con prezzo diverso dal live
   - Verificare log "ADATTA PREZZI V23"
   - Controllare ordine aperto con SL/TP corretti
3. **Test regressione:**
   - Con feature disattivata, comportamento identico a V22

---

## Files da Modificare

- `E:\Dropbox\1_Forex\Programmazione\Copier\MasterCopy\METATRADER\EXPERTS\MT5\Mt5_TgCopy.mq5`
