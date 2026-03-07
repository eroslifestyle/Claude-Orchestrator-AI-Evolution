# TODOLIST - Claude Code Multi-Agent

> **Ultimo aggiornamento:** 2026-02-16 14:30 UTC
> **Aggiornato da:** Documenter Agent V2.4

---

## ✅ COMPLETATI

- [x] Setup dual provider (Anthropic + GLM-5) — 2026-02-16
- [x] Sincronizzazione completa Anthropic → GLM (158 agenti, 50 skills) — 2026-02-16
- [x] CHANGELOG.md aggiornato con sincronizzazione GLM — 2026-02-16
- [x] README-SETUP.md aggiornato con configurazione completa — 2026-02-16
- [x] Verifica integrità assets copiati (agents, skills, plugins) — 2026-02-16

## 🔄 IN CORSO

- [ ] (Nessun task attualmente in corso)

## ⏳ DA FARE

- [ ] Testa doppia istanza VS Code simultanea (Anthropic + GLM-5)
- [ ] Valida MCP plugins su istanza GLM-5
- [ ] Crea script di backup automatico per ~/.claude-glm-home/.claude
- [ ] Documenta performance comparison (Anthropic vs GLM-5) per modello futuro

## 🐛 BUG NOTI

- [ ] (Nessun bug noto al momento)

## 🛠️ ERRORI RISOLTI (NON RIPETERE)

| Data | Errore | Root Cause | Soluzione | File |
|------|--------|------------|-----------|------|
| 2026-02-16 | Path con spazi in bash Windows | Bash su Windows non interpreta correttamente `dir /B` | Usare `find` o `ls` con path quotato | CHANGELOG.md, README-SETUP.md |
| 2026-02-16 | HOME override per VS Code | VS Code extension non supporta flag `--settings` | Inject env vars via ProcessStartInfo (vsg) | Microsoft.PowerShell_profile.ps1 |
| 2026-02-16 | Doppio config file per GLM-5 | settings.local.json ignorato se settings.json non esiste | settings.json ha priorità, settings.local.json come fallback | ~/.claude-glm-home/.claude/ |

## 📚 LESSONS LEARNED

### ❌ Pattern da EVITARE
| Pattern | Perché Fallisce | Alternativa |
|---------|-----------------|-------------|
| HOME override per CLI | claude.exe non eredita HOME | Usa flag `--settings` nativo |
| Duplicare API keys tra provider | Risk di mescolare credenziali | Separare settings.json per provider |
| Presupporre stesso PATH per bash e PowerShell | Differenze sintassi cross-platform | Quotare percorsi con spazi |
| Sincronizzazione manuale di file | Inefficiente e soggetto a errori | Script di copia in parallelo |

### ✅ Pattern da SEGUIRE
| Pattern | Perché Funziona | Esempio |
|---------|-----------------|---------|
| Isolamento completo tra provider | Evita conflitti di configurazione | HOME=/path/to/different/home per vsg |
| settings.json per provider | Una config per provider = clarity | ~/.claude/ per Anthropic, ~/.claude-glm-home/ per GLM-5 |
| MCP plugins identici | Coerenza tra istanze | 6 plugin su entrambi |
| Flag `--settings` per claude.exe | Windows best practice | `ccg` usa `--settings` nativo |

## 💡 IDEE FUTURE

- Creare dashboard di sincronizzazione (monitoraggio assets tra Anthropic/GLM)
- Aggiungere script Python per validazione automatica integrità assets
- Implementare versioning semantico per agent updates (1.0.0-EMPEROR)
- Benchmarking performance: Anthropic vs GLM-5 per task categories

---

## STATISTICHE SINCRONIZZAZIONE

| Asset | Count | Data | Status |
|-------|-------|------|--------|
| Agenti L0/L1/L2 | 39 | 2026-02-16 | ✅ Sync |
| Agenti file | 158 | 2026-02-16 | ✅ Sync |
| Skills | 7 | 2026-02-16 | ✅ Sync |
| Skills file | 50 | 2026-02-16 | ✅ Sync |
| MCP Plugins | 6 | 2026-02-16 | ✅ Sync |
| Plugin file | 1 (v7.0) | 2026-02-16 | ✅ Sync |
| CLAUDE.md | 1 | 2026-02-16 | ✅ Sync |
| settings.local.json | 1 | 2026-02-16 | ✅ Sync |
| **TOTALE FILE** | **255** | **2026-02-16** | **✅ Sync** |
