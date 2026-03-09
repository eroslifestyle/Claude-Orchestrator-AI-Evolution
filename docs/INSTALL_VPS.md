---
title: Guida Installazione VPS - Orchestrator V17.0.0
version: V17.0.0
last_updated: 2026-03-09
language: it
module: orchestrator
tags: [installation, vps, deployment, setup, guide]
---

# Guida Installazione VPS - Orchestrator V17.0.0

> Guida completa per installare Orchestrator V17.0.0 su una nuova VPS Linux.

---

## Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Installazione Step-by-Step](#2-installazione-step-by-step)
3. [Configurazione](#3-configurazione)
4. [Verifica Installazione](#4-verifica-installazione)
5. [Troubleshooting](#5-troubleshooting)
6. [Aggiornamento](#6-aggiornamento)

---

## 1. Prerequisiti

### 1.1 Requisiti Hardware Minimi

| Componente | Minimo | Consigliato |
|------------|--------|-------------|
| CPU | 2 vCPU | 4+ vCPU |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| Rete | 100 Mbps | 1 Gbps |

### 1.2 Sistema Operativo Supportato

| OS | Versione | Stato |
|----|----------|-------|
| Ubuntu | 22.04 LTS / 24.04 LTS | Completo |
| Debian | 11 / 12 | Completo |
| CentOS | Stream 9 | Completo |
| Rocky Linux | 9 | Completo |
| Amazon Linux | 2023 | Completo |

### 1.3 Software Richiesto

```bash
# Versioni minime richieste
Python >= 3.10
Git >= 2.30
pip >= 22.0
```

### 1.4 Verifica Prerequisiti

```bash
# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Verifica Python
python3 --version
# Output atteso: Python 3.10.x o superiore

# Verifica pip
pip3 --version
# Output atteso: pip 22.x o superiore

# Verifica Git
git --version
# Output atteso: git version 2.30.x o superiore
```

### 1.5 Installazione Dipendenze di Sistema

```bash
# Ubuntu/Debian
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev

# CentOS/Rocky/RHEL
sudo dnf install -y \
    python3 \
    python3-pip \
    git \
    curl \
    wget \
    gcc \
    openssl-devel \
    libffi-devel \
    python3-devel
```

---

## 2. Installazione Step-by-Step

### 2.1 Metodo 1: Git Clone (Consigliato)

```bash
# Crea directory di lavoro
mkdir -p ~/.claude
cd ~/.claude

# Clona il repository
git clone https://github.com/tuo-username/claude-orchestrator.git .

# Oppure da URL specifico
git clone <repository-url> ~/.claude
```

### 2.2 Metodo 2: Download Archive

```bash
# Crea directory
mkdir -p ~/.claude
cd ~/.claude

# Download tarball
wget https://github.com/tuo-username/claude-orchestrator/archive/refs/tags/v17.0.0.tar.gz

# Estrai
tar -xzf v17.0.0.tar.gz --strip-components=1

# Rimuovi archive
rm v17.0.0.tar.gz
```

### 2.3 Metodo 3: pip Install (Se disponibile)

```bash
# Installa da PyPI (se pubblicato)
pip install claude-orchestrator==17.0.0

# Oppure da Git
pip install git+https://github.com/tuo-username/claude-orchestrator.git@v17.0.0
```

### 2.4 Setup Virtual Environment (Consigliato)

```bash
# Crea virtual environment
cd ~/.claude
python3 -m venv venv

# Attiva virtual environment
source venv/bin/activate

# Verifica attivazione
which python
# Output: /root/.claude/venv/bin/python
```

### 2.5 Installazione Dipendenze Python

```bash
# Se esiste requirements.txt
pip install -r requirements.txt

# Se esiste pyproject.toml
pip install -e .

# Dipendenze core (installazione manuale)
pip install \
    anthropic>=0.40.0 \
    structlog>=24.0.0 \
    pydantic>=2.0.0 \
    redis>=5.0.0 \
    aiohttp>=3.9.0 \
    prometheus-client>=0.19.0
```

### 2.6 Setup Directory Structure

```bash
# Crea directory necessarie
cd ~/.claude
mkdir -p \
    agents \
    skills \
    rules/common \
    rules/python \
    rules/typescript \
    rules/go \
    lib \
    lib/v17 \
    lib/tests \
    lib/metrics \
    docs \
    docs/orchestrator \
    learnings \
    cache \
    cache/tools \
    logs \
    tasks
```

### 2.7 Verifica Struttura

```bash
# Verifica struttura creata
tree ~/.claude -L 2
```

Struttura attesa:

```
~/.claude/
├── agents/              # 43 agent definitions
├── skills/              # 32 skills
├── rules/               # 11 rule files
│   ├── common/
│   ├── python/
│   ├── typescript/
│   └── go/
├── lib/                 # Core modules
│   ├── v17/            # V17 modules
│   ├── tests/          # Test files
│   └── metrics/        # Metrics collection
├── docs/               # Documentation
├── learnings/          # Learning data
├── cache/              # Tool cache
├── logs/               # Log files
└── tasks/              # Task tracking
```

---

## 3. Configurazione

### 3.1 Variabili d'Ambiente

```bash
# Aggiungi al file ~/.bashrc o ~/.zshrc
cat >> ~/.bashrc << 'EOF'

# Orchestrator V17 Configuration
export ORCHESTRATOR_VERSION="17.0.0"
export ORCHESTRATOR_HOME="$HOME/.claude"
export ORCHESTRATOR_LOG_LEVEL="INFO"
export ORCHESTRATOR_CACHE_DIR="$ORCHESTRATOR_HOME/cache"
export ORCHESTRATOR_LOG_DIR="$ORCHESTRATOR_HOME/logs"

# Claude API Configuration
export ANTHROPIC_API_KEY="your-api-key-here"

# Feature Flags V17
export V17_TOOL_CALLING="true"
export V17_STREAMING="true"
export V17_TOOL_SEARCH="true"
export V17_CACHE="true"

# Performance Settings
export ORCHESTRATOR_MAX_TASKS="50"
export ORCHESTRATOR_MAX_AGENTS="200"
export ORCHESTRATOR_WAVE_TIMEOUT="300"
EOF

# Ricarica configurazione
source ~/.bashrc
```

### 3.2 File di Configurazione Principale

```bash
# Crea file di configurazione
cat > ~/.claude/config.json << 'EOF'
{
    "version": "17.0.0",
    "environment": "production",

    "tool_calling": {
        "enabled": true,
        "batch_size": 100,
        "timeout_ms": 30000
    },

    "streaming": {
        "mode": "partial",
        "debug_mode": false
    },

    "cache": {
        "l1_max_size": 100,
        "l1_ttl_seconds": 3600,
        "l2_ttl_seconds": 21600,
        "warm_on_startup": true
    },

    "budget": {
        "core_default": 100000,
        "l1_default": 50000,
        "l2_default": 30000
    },

    "resilience": {
        "circuit_breaker_threshold": 5,
        "circuit_breaker_timeout": 60,
        "retry_max_attempts": 3,
        "retry_backoff_ms": 1000
    },

    "logging": {
        "level": "INFO",
        "format": "json",
        "file": "$ORCHESTRATOR_HOME/logs/orchestrator.log"
    },

    "metrics": {
        "enabled": true,
        "port": 9090,
        "path": "/metrics"
    }
}
EOF
```

### 3.3 Configurazione Redis (Opzionale ma Consigliato)

```bash
# Installa Redis
sudo apt install -y redis-server

# Avvia Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verifica connessione
redis-cli ping
# Output atteso: PONG

# Configura Orchestrator per usare Redis
cat >> ~/.claude/config.json << 'EOF'

    "redis": {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "password": null,
        "pool_size": 10
    }
EOF
```

### 3.4 Configurazione Prometheus (Opzionale)

```bash
# Scarica Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar -xzf prometheus-2.48.0.linux-amd64.tar.gz
sudo mv prometheus-2.48.0.linux-amd64 /opt/prometheus

# Configura Prometheus
cat > /opt/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'orchestrator'
    static_configs:
      - targets: ['localhost:9090']
EOF

# Avvia Prometheus
/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml &
```

### 3.5 Setup Systemd Service (Produzione)

```bash
# Crea servizio systemd
sudo cat > /etc/systemd/system/orchestrator.service << 'EOF'
[Unit]
Description=Orchestrator V17.0.0
After=network.target redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/.claude
Environment="PATH=/root/.claude/venv/bin"
Environment="ANTHROPIC_API_KEY=your-api-key"
ExecStart=/root/.claude/venv/bin/python -m lib.orchestrator_server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Ricarica systemd
sudo systemctl daemon-reload

# Abilita servizio
sudo systemctl enable orchestrator

# Avvia servizio
sudo systemctl start orchestrator
```

---

## 4. Verifica Installazione

### 4.1 Verifica File Core

```bash
# Verifica file essenziali
ls -la ~/.claude/CLAUDE.md
ls -la ~/.claude/skills/orchestrator/SKILL.md
ls -la ~/.claude/lib/facade.py
ls -la ~/.claude/lib/claude_tool_core.py

# Verifica moduli V17
ls -la ~/.claude/lib/v17/
```

Output atteso:

```
lib/v17/
├── __init__.py
├── claude_tool_registry.py
├── tool_discovery.py
├── resilience.py
├── cache.py
├── streaming.py
├── budget.py
├── executor.py
├── prometheus_exporter.py
├── websocket_server.py
├── metrics_dashboard.py
└── tests/
```

### 4.2 Verifica Import Python

```bash
cd ~/.claude
source venv/bin/activate

python3 << 'EOF'
# Test import facade
from lib.facade import facade
print("Facade import: OK")

# Test namespaces
print(f"Selection namespace: {hasattr(facade, 'selection')}")
print(f"Cache namespace: {hasattr(facade, 'cache')}")
print(f"Chaos namespace: {hasattr(facade, 'chaos')}")
print(f"Routing namespace: {hasattr(facade, 'routing')}")

# Test V17 imports
try:
    from lib.v17.claude_tool_registry import ClaudeToolRegistry
    print("V17 ClaudeToolRegistry: OK")
except ImportError as e:
    print(f"V17 import error: {e}")

# Test exceptions
from lib.facade import OrchestratorError, AgentError, LockError
print("Exceptions import: OK")

print("\nAll imports successful!")
EOF
```

### 4.3 Verifica Funzionalita Core

```bash
cd ~/.claude
source venv/bin/activate

python3 << 'EOF'
import asyncio
from lib.facade import facade, RoutingEngineV2, ChaosInjector

# Test Routing Engine
router = RoutingEngineV2()
print(f"Routing Engine: OK")

# Test Chaos Injector
injector = ChaosInjector()
print(f"Chaos Injector: OK")

# Test Cache (se configurato)
try:
    from lib.v17.cache import WarmCacheManager
    print("V17 Cache Manager: OK")
except Exception as e:
    print(f"Cache warning: {e}")

print("\nCore functionality verified!")
EOF
```

### 4.4 Esegui Test Suite

```bash
cd ~/.claude
source venv/bin/activate

# Esegui tutti i test
python -m pytest lib/tests/ -v --tb=short

# Esegui solo test V17
python -m pytest lib/v17/tests/ -v --tb=short

# Verifica coverage
python -m pytest lib/tests/ --cov=lib --cov-report=term-missing
```

### 4.5 Test Health Check

```bash
# Health check via API (se server attivo)
curl http://localhost:9090/health

# Output atteso:
# {"status": "healthy", "version": "17.0.0", "uptime": 123}

# Verifica metriche
curl http://localhost:9090/metrics | grep orchestrator
```

### 4.6 Checklist Verifica Finale

```bash
# Esegui checklist
cat << 'EOF'
CHECKLIST VERIFICA INSTALLAZIONE V17.0.0

[ ] Python 3.10+ installato
[ ] Virtual environment attivo
[ ] File CLAUDE.md presente
[ ] Directory agents/ con 43 agenti
[ ] Directory skills/ con 32 skill
[ ] Directory rules/ con 11 file regole
[ ] Directory lib/ con moduli core
[ ] Directory lib/v17/ con 7 moduli V17
[ ] Import facade funzionante
[ ] Import V17 modules funzionante
[ ] Redis connesso (se configurato)
[ ] Prometheus connesso (se configurato)
[ ] Test suite passa
[ ] Health check OK
[ ] Servizio systemd attivo (se configurato)

EOF
```

---

## 5. Troubleshooting

### 5.1 Errori Comuni

#### Errore: "ModuleNotFoundError: No module named 'lib'"

```bash
# Soluzione: Aggiungi path al PYTHONPATH
export PYTHONPATH="$HOME/.claude:$PYTHONPATH"

# Oppure aggiungi a ~/.bashrc
echo 'export PYTHONPATH="$HOME/.claude:$PYTHONPATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Errore: "Permission denied" su cache/

```bash
# Soluzione: Correggi permessi
chmod -R 755 ~/.claude/cache
chmod -R 755 ~/.claude/logs
chmod -R 755 ~/.claude/tasks
```

#### Errore: "Redis connection refused"

```bash
# Verifica Redis attivo
sudo systemctl status redis-server

# Se non attivo, avvia
sudo systemctl start redis-server

# Verifica connessione
redis-cli ping
```

#### Errore: "Circuit breaker open"

```bash
# Reset circuit breaker
redis-cli DEL "circuit_breaker:*"

# Oppure riavvia servizio
sudo systemctl restart orchestrator
```

#### Errore: "Token budget exceeded"

```bash
# Aumenta budget in config.json
# Modifica "budget" section:
#   "core_default": 150000,
#   "l1_default": 75000,
#   "l2_default": 50000

# Riavvia servizio
sudo systemctl restart orchestrator
```

### 5.2 Log Analysis

```bash
# Visualizza log in tempo reale
tail -f ~/.claude/logs/orchestrator.log

# Cerca errori
grep -i error ~/.claude/logs/orchestrator.log

# Cerca warning
grep -i warning ~/.claude/logs/orchestrator.log

# Ultimi 100 errori
tail -100 ~/.claude/logs/orchestrator.log | grep -i error
```

### 5.3 Debug Mode

```bash
# Abilita debug mode
export ORCHESTRATOR_LOG_LEVEL="DEBUG"
export V17_STREAMING="full"  # Full streaming per debug

# Riavvia con debug
python -m lib.orchestrator_server --debug
```

### 5.4 Reset Completo

```bash
# ATTENZIONE: Reset completo della cache
rm -rf ~/.claude/cache/*
rm -rf ~/.claude/logs/*
rm -rf ~/.claude/tasks/*

# Reset Redis
redis-cli FLUSHDB

# Riavvia servizio
sudo systemctl restart orchestrator
```

### 5.5 Supporto

| Canale | Contatto |
|--------|----------|
| GitHub Issues | https://github.com/tuo-username/claude-orchestrator/issues |
| Documentazione | ~/.claude/docs/ |
| Log File | ~/.claude/logs/orchestrator.log |
| Memory File | ~/.claude/memory/MEMORY.md |

---

## 6. Aggiornamento

### 6.1 Backup Pre-Aggornamento

```bash
# Backup configurazione
cp ~/.claude/config.json ~/.claude/config.json.backup

# Backup learnings
cp -r ~/.claude/learnings ~/.claude/learnings.backup

# Backup cache (opzionale)
cp -r ~/.claude/cache ~/.claude/cache.backup

# Backup completo
tar -czf orchestrator-backup-$(date +%Y%m%d).tar.gz -C ~/.claude .
```

### 6.2 Aggiornamento da Git

```bash
cd ~/.claude

# Salva modifiche locali
git stash

# Fetch ultima versione
git fetch --all

# Checkout versione specifica
git checkout v17.0.0

# Oppure aggiorna all'ultima
git pull origin main

# Ripristina modifiche locali
git stash pop

# Aggiorna dipendenze
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

### 6.3 Aggiornamento da pip

```bash
# Aggiorna all'ultima versione
pip install --upgrade claude-orchestrator

# Aggiorna a versione specifica
pip install claude-orchestrator==17.0.1
```

### 6.4 Post-Aggiornamento

```bash
# Verifica versione
python -c "from lib.facade import __version__; print(__version__)"

# Esegui migrazioni (se necessarie)
python -m lib.migrations.migrate

# Riavvia servizio
sudo systemctl restart orchestrator

# Verifica funzionamento
curl http://localhost:9090/health
```

### 6.5 Rollback

```bash
# Se aggiornamento fallisce, ripristina backup
cd ~/.claude

# Ripristina da backup
tar -xzf orchestrator-backup-YYYYMMDD.tar.gz -C ~/.claude

# Oppure torna a versione precedente
git checkout v16.0.0

# Riavvia servizio
sudo systemctl restart orchestrator
```

---

## Appendice A: Comandi Utili

```bash
# Status servizio
sudo systemctl status orchestrator

# Riavvio servizio
sudo systemctl restart orchestrator

# Visualizza log
journalctl -u orchestrator -f

# Verifica porte
netstat -tlnp | grep -E '(9090|6379)'

# Verifica processi
ps aux | grep orchestrator

# Memory usage
free -h

# Disk usage
df -h ~/.claude
```

---

## Appendice B: Metriche di Riferimento V17

| Metrica | Valore Target |
|---------|---------------|
| Token overhead | 1,500-5,000 (-85%) |
| Tool discovery | <5ms (95%) |
| Round-trips | 1 per N tools |
| Error recovery | 99.9% |
| Cache hit rate | 80%+ |
| Throughput | 9,000+ ops/sec |
| Memory per op | <40 bytes |
| Cold start | <100ms |

---

**Versione Documento:** V17.0.0
**Data:** 2026-03-09
**Autore:** Orchestrator Team
**Status:** Production Ready
