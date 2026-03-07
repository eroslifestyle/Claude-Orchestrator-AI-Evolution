# 🚀 Guida Pubblicazione GitHub - Orchestrator MCP Server

## ✅ Stato Attuale

- ✅ Git repository inizializzato
- ✅ Primo commit creato
- ✅ Script di push pronto
- ⏳ Repo GitHub da creare
- ⏳ Push da eseguire

---

## 📋 Passaggi da Seguire

### 1. Crea il Repository su GitHub

1. Vai su: https://github.com/new
2. Compila i campi:
   ```
   Repository name: orchestrator-mcp-server
   Description: MCP server for Claude Code Orchestrator Plugin - Always On Auto-Orchestration
   Visibility: ☑️ Public

   ☐ Add a README file  ← NON spuntare
   ☐ Add .gitignore     ← NON spuntare
   ☐ Choose a license   ← NON spuntare
   ```
3. Clicca **Create repository**

### 2. Esegui lo Script di Push

**Windows:**
```cmd
cd "c:\Users\LeoDg\.claude\plugins\orchestrator-plugin\mcp_server"
push_to_github.bat
```

**Linux/Mac:**
```bash
cd ~/.claude/plugins/orchestrator-plugin/mcp_server
chmod +x push_to_github.sh
./push_to_github.sh
```

Quando richiesto, incolla l'URL del tuo repo:
```
https://github.com/LeoDg/orchestrator-mcp-server
```

### 3. Verifica la Pubblicazione

Visita: https://github.com/LeoDg/orchestrator-mcp-server

Dovresti vedere:
- ✅ 8 file caricati
- ✅ README.md visibile
- ✅ Licenza MIT

### 4. Testa l'Installazione con UVX

```bash
uvx --from git+https://github.com/LeoDg/orchestrator-mcp-server orchestrator-mcp
```

Se funziona, vedrai il log del server MCP avviarsi.

### 5. Riavvia Claude Code

Chiudi e riapri Claude Code. Il server MCP si attiverà automaticamente e gli strumenti saranno disponibili.

---

## 🔧 Troubleshooting

### Errore: "gh: command not found"
- Normale, usa lo script `push_to_github.bat` invece

### Errore: "remote origin already exists"
```bash
cd mcp_server
git remote remove origin
# Riavvia lo script
```

### Errore: "Authentication failed"
Configura le credenziali Git:
```bash
git config --global credential.helper store
git push -u origin main
# Inserisci username e Personal Access Token
```

### Il server MCP non si avvia
1. Verifica che il repo sia pubblico
2. Controlla che `pyproject.toml` sia valido
3. Prova installazione manuale:
   ```bash
   pip install mcp
   python server.py
   ```

---

## 📦 File del Package

| File | Descrizione |
|------|-------------|
| `server.py` | Server MCP principale |
| `pyproject.toml` | Configurazione package Python |
| `README.md` | Documentazione |
| `LICENSE` | Licenza MIT |
| `__init__.py` | Init package |
| `MANIFEST.in` | Manifesto distribuzione |
| `.gitignore` | File da ignorare |
| `test_mcp_server.py` | Test suite |

---

## 🎯 Dopo la Pubblicazione

Una volta pubblicato, avrai accesso a questi strumenti MCP:

| Strumento | Descrizione |
|-----------|-------------|
| `orchestrator_analyze` | Analizza richiesta e genera piano |
| `orchestrator_execute` | Esegue orchestrazione |
| `orchestrator_status` | Stato sessioni |
| `orchestrator_agents` | Lista agenti disponibili |
| `orchestrator_list` | Sessioni recenti |
| `orchestrator_preview` | Anteprima dettagliata |
| `orchestrator_cancel` | Cancella sessione |

---

## 📝 Note

- Il repo deve essere **PUBLIC** per funzionare con `uvx`
- Se cambi username GitHub, aggiorna `.mcp.json` di conseguenza
- Il server è always-on come Serena, si attiva all'avvio di Claude Code
