# ORCHESTRATOR SUPREMO - Progress Display System
# Mostra progressi in tempo reale durante l'esecuzione parallela

from typing import List, Dict
import json
from datetime import datetime

class ProgressDisplay:
    """Display progress for parallel task execution"""

    def __init__(self):
        self.tasks = []
        self.completed = []
        self.in_progress = []
        self.failed = []

    def show_header(self, request: str):
        """Mostra header quando l'orchestrator si attiva"""
        print("\n" + "="*70)
        print("  🎯 ORCHESTRATOR SUPREMO - AUTO-ACTIVATED")
        print("="*70)
        print(f"  Request: {request[:60]}...")
        print(f"  Mode: UNLIMITED PARALLELISM")
        print(f"  Started: {datetime.now().strftime('%H:%M:%S')}")
        print("="*70 + "\n")

    def show_discovery(self, task_count: int):
        """Mostra task scoperti"""
        print(f"📊 Tasks discovered: {task_count}")
        print(f"⚡ Parallel execution: STARTED\n")

    def show_progress(self):
        """Mostra stato corrente"""
        total = len(self.tasks)
        done = len(self.completed)
        active = len(self.in_progress)
        failed = len(self.failed)

        bar_length = 40
        filled = int(bar_length * done / total) if total > 0 else 0
        bar = "█" * filled + "░" * (bar_length - filled)

        print(f"\r  Progress: [{bar}] {done}/{total} | ✅ {done} | ⏳ {active} | ❌ {failed}", end="", flush=True)

    def show_completion(self):
        """Mostra riepilogo finale"""
        print("\n\n" + "="*70)
        print("  ✅ ORCHESTRATION COMPLETE")
        print("="*70)
        print(f"  Total tasks: {len(self.tasks)}")
        print(f"  Completed: {len(self.completed)}")
        print(f"  Failed: {len(self.failed)}")
        print(f"  Duration: {datetime.now().strftime('%H:%M:%S')}")
        print("="*70 + "\n")
