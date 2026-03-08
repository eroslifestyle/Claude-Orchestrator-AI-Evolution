# Plugin Hot Reload System

> Zero-downtime plugin updates with automatic file watching and version tracking.

---

## Overview

**File:** `lib/hot_reload.py`
**Facade Namespace:** `facade.hot_reload`
**Since:** V15.1.0

The PluginHotReloader provides automatic skill reload on file modification without requiring orchestrator restart.

---

## Features

| Feature | Description |
|---------|-------------|
| Hash-based change detection | SHA256 hashing for accurate change detection |
| Version tracking | Full version history with load counts and timestamps |
| Graceful reload | Zero-downtime updates with rollback support |
| File watching | Background thread monitors skill files |
| Dependency tracking | Track and notify dependent skills |
| Callback system | Register handlers for reload events |
| Error recovery | Automatic rollback after repeated failures |

---

## Quick Start

```python
from pathlib import Path
from lib.hot_reload import PluginHotReloader

# Basic usage with context manager
with PluginHotReloader(skills_dir=Path("skills")) as reloader:
    # Skills are now being watched
    skills = reloader.list_tracked_skills()
    print(f"Tracking {len(skills)