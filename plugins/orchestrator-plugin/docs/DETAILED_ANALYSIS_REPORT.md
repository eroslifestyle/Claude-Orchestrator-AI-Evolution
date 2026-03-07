# 📊 REPORT DETTAGLIATO CARTELLA .CLAUDE

**Data analisi:** 1 Febbraio 2026
**Percorso:** `c:\Users\LeoDg\.claude`

---

## 📈 SOMMARIO ESECUTIVO

| Metrica | Valore |
|---------|--------|
| **Totale cartelle** | 26 |
| **Totale file** | ~47,700 |
| **Spazio totale** | ~650 MB |
| **Cartella più grande** | plugins (265 MB) |
| **Progetti salvati** | 134 cartelle |

---

## 🏆 TOP 10 CARTELLE PER DIMENSIONE

| Pos | Cartella | File | Sottocartelle | Dimensione |
|-----|----------|------|---------------|------------|
| 1️⃣ | **plugins** | 40,931 | 9,285 | **265.41 MB** |
| 2️⃣ | **projects** | 640 | 134 | **265.61 MB** |
| 3️⃣ | **file-history** | 1,174 | 74 | **16.66 MB** |
| 4️⃣ | **simple-blog** | 3,318 | 360 | **16.38 MB** |
| 5️⃣ | **debug** | 244 | 0 | **10.82 MB** |
| 6️⃣ | **Sviluppo Plugin** | 428 | 89 | **7.75 MB** |
| 7️⃣ | **orchestrator-plugin-package** | 305 | 63 | **5.68 MB** |
| 8️⃣ | **todos** | 360 | 0 | **0.02 MB** |
| 9️⃣ | **shell-snapshots** | 69 | 0 | **0.02 MB** |
| 🔟 | **agents** | 60 | 8 | **0.91 MB** |

---

## 📁 ANALISI DETTAGLIATA PER CATEGORIA

### 🔧 PLUGINS (265.41 MB) - ✅ NECESSARIO
- **40,931 file** in 9,285 sottocartelle
- Contiene tutti i plugin installati
- **Plugin principale:** `orchestrator-plugin/`
- **Nota:** La maggior parte dello spazio è node_modules

### 📂 PROJECTS (265.61 MB) - ⚠️ DA RIVEDERE
- **640 file** in 134 cartelle progetto
- Contiene conversazioni e progetti passati
- **Raccomandazione:** Archiviare progetti vecchi (> 6 mesi)

### 📜 FILE-HISTORY (16.66 MB) - ℹ️ INFORMATIVO
- **1,174 file** in 74 sottocartelle
- Storia delle modifiche file
- Può essere pulito periodicamente

### 🎨 SIMPLE-BLOG (16.38 MB) - ❌ DA ELIMINARE
- **3,318 file** in 360 sottocartelle
- Progetto demo di test
- **Raccomandazione:** Eliminare se non più usato

### 🐛 DEBUG (10.82 MB) - ⚠️ DA PULIRE
- **244 file** di log/debug
- **Raccomandazione:** Pulire regolarmente

### 📦 SVILUPPO PLUGIN (7.75 MB) - ❌ OBSOLETO
- **428 file** in 89 sottocartelle
- Contiene la vecchia cartella `Orchestrator/` (bloccata)
- **Raccomandazione:** Eliminare dopo riavvio

### 📦 ORCHESTRATOR-PLUGIN-PACKAGE (5.68 MB) - ❌ DUPLICATO
- **305 file** in 63 sottocartelle
- Cartella intermedia di packaging
- **Raccomandazione:** ELIMINARE (già presente in plugins/)

### 🤖 AGENTS (0.91 MB) - ✅ PULITO
- **60 file** in 8 sottocartelle
- Agenti personalizzati
- Già pulito dagli skill duplicati

---

## 🗑️ CARTELLE VUOTE (Da Eliminare)

| Cartella | Files | Sottocartelle | Azione |
|----------|-------|---------------|--------|
| `.claude` | 0 | 0 | ❌ Elimina |
| `orchestrator` | 0 | 0 | ❌ Elimina |
| `skills` | 0 | 0 | ❌ Elimina |
| `telemetry` | 0 | 0 | ❌ Elimina |
| `session-env` | 0 | 89 | ⚠️ Contiene 89 sottocartelle vuote |
| `ide` | 2 | 0 | ⚠️ Contiene 2 file, da verificare |
| `monitoring` | 1 | 0 | ⚠️ Contiene 1 file, da verificare |

---

## 📄 FILE ROOT (Analisi)

| File | Dimensione | Tipo | Azione |
|-----|-----------|------|--------|
| `history.jsonl` | 55.9 KB | Log | ✅ Mantieni |
| `agent_monitor.py` | 24.4 KB | Script | ⚠️ Verifica utilità |
| `multi_task_tracker.py` | 20.9 KB | Script | ⚠️ Verifica utilità |
| `main_window.py` | 11.6 KB | Script | ⚠️ Verifica utilità |
| `temp_analysis.ps1` | 2.2 KB | Temp | ❌ Elimina (report già generato) |
| `nul` | 0.1 KB | ? | ❌ Elimina |
| `plugin-registry.json` | 2.6 KB | Config | ✅ Mantieni |
| `settings.anthropic.json.backup` | 0.3 KB | Backup | ❌ Elimina (vecchio) |
| `settings.zai.json.backup` | 0.4 KB | Backup | ❌ Elimina (vecchio) |
| `settings.json.backup` | 0.4 KB | Backup | ❌ Elimina (vecchio) |

---

## 🎯 RACCOMANDAZIONI PER PULIZIA

### 🟢 AZIONI IMMEDIATE (Rischio Basso)
1. ✅ Elimina file temporanei:
   - `temp_analysis.ps1`
   - `nul`
   - Backup vecchi settings

2. ✅ Elimina cartelle vuote:
   - `.claude/`
   - `orchestrator/`
   - `skills/`
   - `telemetry/`

3. ✅ Elimina cartella duplicata:
   - `orchestrator-plugin-package/` (5.68 MB)

### 🟡 AZIONI DA VERIFICARE (Rischio Medio)
1. ⚠️ `simple-blog/` - Progetto demo (16.38 MB)
2. ⚠️ `Sviluppo Plugin/Orchestrator/` - Cartella bloccata (vedi file _DA_ELIMINARE.md)
3. ⚠️ `debug/` - Log vecchi (10.82 MB)
4. ⚠️ File Python in root - Verifica se servono ancora

### 🔵 AZIONI FUTURE (Rischio Basso)
1. ℹ️ `projects/` - Archivia progetti > 6 mesi
2. ℹ️ `file-history/` - Pulisci periodically

---

## 📊 GRAFICO DISTRIBUZIONE SPAZIO

```
plugins ████████████████████████████████ 265 MB (41%)
projects ████████████████████████████████ 266 MB (41%)
file-history ████ 17 MB (3%)
simple-blog ████ 16 MB (2%)
debug ███ 11 MB (2%)
Sviluppo Plugin ██ 8 MB (1%)
orchestrator-package ██ 6 MB (1%)
altre █ 61 MB (9%)
```

---

## 💾 POTENZIALE RISPARMIO SPAZIO

| Azione | Spazio liberato |
|--------|-----------------|
| Elimina `orchestrator-plugin-package/` | +5.68 MB |
| Elimina `simple-blog/` (se non serve) | +16.38 MB |
| Pulisci `debug/` | +10.82 MB |
| Elimina file temp/backup | +0.5 MB |
| Pulisci `Sviluppo Plugin/` (dopo sblocco) | +7.75 MB |
| **TOTALE (conservativo)** | **~41 MB** |
| **TOTALE (aggressivo)** | **~300 MB** (incluso projects archiviato) |

---

## 📋 COMANDI PER PULIZIA

### Pulizia Conservativa
```powershell
# Rimuovi cartella duplicata
Remove-Item "c:\Users\LeoDg\.claude\orchestrator-plugin-package" -Recurse -Force

# Rimuovi file temporanei
Remove-Item "c:\Users\LeoDg\.claude\temp_analysis.ps1" -Force
Remove-Item "c:\Users\LeoDg\.claude\nul" -Force
Remove-Item "c:\Users\LeoDg\.claude\settings.*.backup" -Force

# Rimuovi cartelle vuote
Remove-Item "c:\Users\LeoDg\.claude\.claude" -Recurse -Force
Remove-Item "c:\Users\LeoDg\.claude\orchestrator" -Recurse -Force
Remove-Item "c:\Users\LeoDg\.claude\skills" -Recurse -Force
Remove-Item "c:\Users\LeoDg\.claude\telemetry" -Recurse -Force
```

### Pulizia Aggressiva (Dopo verifica)
```powershell
# Rimuovi demo project
Remove-Item "c:\Users\LeoDg\.claude\simple-blog" -Recurse -Force

# Pulisci debug
Remove-Item "c:\Users\LeoDg\.claude\debug\*" -Recurse -Force

# Script Python non più usati
Remove-Item "c:\Users\LeoDg\.claude\*.py" -Force
```

---

**Report generato automaticamente da:** Orchestrator SUPREMO Analysis System
**Data:** 2026-02-01 00:35:00
