# GitHub Actions Badges

## Badge Markdown per README

Aggiungi questi badge al tuo README.md:

```markdown
# Orchestrator V15.0.4

[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
[![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml)
[![Release](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## Badge Compatti (Singola Riga)

```markdown
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml) [![Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml) [![Release](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/release.yml) [![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## Badge con Branch Specifico

```markdown
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
```

## Badge con Event Filter

```markdown
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
```

---

## Istruzioni per Attivazione

### 1. Sostituire Placeholder
Sostituire `YOUR_USERNAME` e `YOUR_REPO` con i valori reali:
- Per questo progetto: `YOUR_USERNAME` = `LeoDg` (o il tuo username GitHub)
- `YOUR_REPO` = nome del repository (es. `claude-orchestrator`)

### 2. Codecov Setup
1. Creare account su [codecov.io](https://codecov.io)
2. Collegare repository GitHub
3. Generare `CODECOV_TOKEN` da Settings > Upload Tokens
4. Aggiungere token come Secret in GitHub:
   - Repository > Settings > Secrets and variables > Actions
   - Nuovo secret: `CODECOV_TOKEN`

### 3. PyPI Publishing (Opzionale)
Per abilitare pubblicazione automatica su PyPI:
1. Creare account su [pypi.org](https://pypi.org)
2. Generare API token da Account settings > API tokens
3. Aggiungere token come Secret: `PYPI_API_TOKEN`
4. Decommentare job `pypi` in `release.yml`

### 4. Workflow Permissions
Assicurarsi che i workflow abbiano permessi corretti:
- Repository > Settings > Actions > General
- Workflow permissions: Read and write permissions
- Allow GitHub Actions to create and approve pull requests: ON

---

## Matrix Coverage

| OS | Python Versions |
|----|-----------------|
| Ubuntu Latest | 3.10, 3.11, 3.12, 3.13, 3.14 |
| Windows Latest | 3.10, 3.11, 3.12, 3.13, 3.14 |
| macOS Latest | 3.10, 3.11, 3.12, 3.13, 3.14 |

**Totale:** 15 combinazioni (3 OS x 5 Python)
