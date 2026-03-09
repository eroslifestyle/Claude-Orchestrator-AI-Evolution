---
name: debugging
description: When to use this skill for systematic debugging including root cause analysis, error tracing, performance profiling, and memory leak detection
disable-model-invocation: false
user-invokable: true
allowed-tools: Read, Grep, Glob, Write, Bash
metadata:
  keywords: [debug, trace, error, fix]
---

# Debugging Skill

## Overview
Systematic debugging skill for root cause analysis, error tracing, performance profiling, and memory leak detection with comprehensive debugging strategies.

## Features
- Root cause analysis
- Error tracing and stack trace analysis
- Performance profiling
- Memory leak detection
- Debug visualization
- Automated debugging workflows

## Usage Examples

### Root Cause Analysis
```bash
/debugging analyze --error "Traceback" --file app.py
```

### Performance Profiling
```bash
/debugging profile --target app.py --duration 30
```

### Memory Leak Detection
```bash
/debugging memory --target app.py --iterations 100
```

## Implementation

### Root Cause Analyzer
```python
class RootCauseAnalyzer:
    """Analyzes and identifies root causes of errors"""

    def analyze_error_trace(self, error_trace):
        """Parse and analyze error traceback"""
        # Parse stack trace
        # Identify error location
        # Determine error type
        # Suggest root causes
        pass

    def categorize_error(self, error):
        """Categorize error type and severity"""
        categories = {
            'syntax': 'Syntax error',
            'runtime': 'Runtime error',
            'logic': 'Logic error',
            'resource': 'Resource error',
            'network': 'Network error',
            'security': 'Security error'
        }
        # Error categorization logic
        pass

    def suggest_solutions(self, error_type, context):
        """Provide solutions for identified errors"""
        # Solution database lookup
        # Context-aware suggestions
        # Implementation guidance
        pass
```

### Error Tracer
```python
class ErrorTracer:
    """Traces error execution paths"""

    def trace_execution(self, error_point):
        """Trace execution path to error point"""
        # Execution path reconstruction
        # Variable state analysis
        # Control flow tracking
        pass

    def create_error_report(self, error_data):
        """Generate comprehensive error report"""
        # Report formatting
        # Error visualization
        # Resolution steps
        pass

    def monitor_errors(self, threshold=10):
        """Monitor error frequency and patterns"""
        # Error frequency analysis
        # Pattern detection
        # Alert generation
        pass
```

### Performance Profiler
```python
class PerformanceProfiler:
    """Profiles application performance"""

    def profile_function(self, func, *args, **kwargs):
        """Profile individual function performance"""
        import time
        import cProfile
        import io
        import pstats

        pr = cProfile.Profile()
        pr.enable()

        result = func(*args, **kwargs)

        pr.disable()

        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
        ps.print_stats()

        return {
            'result': result,
            'profile': s.getvalue()
        }

    def profile_memory(self, func, *args, **kwargs):
        """Profile memory usage"""
        import tracemalloc

        tracemalloc.start()
        result = func(*args, **kwargs)
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        return {
            'result': result,
            'memory_current': current,
            'memory_peak': peak
        }
```

### Memory Leak Detector
```python
class MemoryLeakDetector:
    """Detects memory leaks in applications"""

    def track_memory_usage(self, process, iterations=100):
        """Track memory usage over time"""
        import psutil
        import time

        memory_usage = []
        for _ in range(iterations):
            memory_info = process.memory_info()
            memory_usage.append(memory_info.rss)
            time.sleep(1)

        return memory_usage

    def detect_leaks(self, memory_data):
        """Analyze memory data for leaks"""
        # Memory trend analysis
        # Leak detection algorithms
        # Memory growth rate calculation
        pass

    def create_memory_report(self, leak_data):
        """Generate memory leak report"""
        # Leak visualization
        # Recommendations
        # Fix strategies
        pass
```

## Debugging Strategies

### 5 Whys Technique
```python
class FiveWhysAnalyzer:
    """Implements 5 Whys root cause analysis"""

    def analyze(self, problem):
        """Apply 5 Whys technique"""
        whys = []
        current_problem = problem

        for i in range(5):
            why = self._ask_why(current_problem)
            whys.append(why)
            current_problem = why['answer']

            if self._is_root_cause(current_problem):
                break

        return whys
```

### Error Tree Analysis
```python
class ErrorTreeAnalyzer:
    """Creates error cause and effect trees"""

    def create_error_tree(self, error):
        """Create hierarchical error tree"""
        tree = {
            'error': error,
            'causes': [],
            'effects': []
        }

        # Identify causes
        causes = self._identify_causes(error)
        tree['causes'] = causes

        # Identify effects
        effects = self._identify_effects(error)
        tree['effects'] = effects

        return tree
```

### Debug Visualization
```python
class DebugVisualizer:
    """Creates debug visualizations"""

    def visualize_error_path(self, error_trace):
        """Visualize error execution path"""
        import matplotlib.pyplot as plt

        # Create visualization
        plt.figure(figsize=(12, 8))
        # Plot error path
        # Highlight error points
        # Add context information
        plt.savefig('error_path.png')

    def create_memory_chart(self, memory_data):
        """Create memory usage chart"""
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 6))
        plt.plot(memory_data)
        plt.title('Memory Usage Over Time')
        plt.xlabel('Time (seconds)')
        plt.ylabel('Memory (MB)')
        plt.savefig('memory_chart.png')
```

## Performance Profiling

### CPU Profiling
```python
def profile_cpu():
    """CPU profiling with cProfile"""
    import cProfile
    import pstats

    profiler = cProfile.Profile()
    profiler.enable()

    # Run your code here
    run_application()

    profiler.disable()

    # Print stats
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)  # Top 10 functions
```

### Memory Profiling
```python
def profile_memory():
    """Memory profiling with memory_profiler"""
    from memory_profiler import profile

    @profile
    def run_application():
        # Your code here
        pass

    run_application()
```

### Line Profiler
```python
def profile_lines():
    """Line-by-line profiling"""
    from line_profiler import LineProfiler

    def run_application():
        # Your code here
        pass

    profiler = LineProfiler()
    profiler_wrapper = profiler(run_application)
    profiler_wrapper()

    profiler.print_stats()
```

## Debug Tools

### Debug Logger
```python
import logging

class DebugLogger:
    """Enhanced logging for debugging"""

    def __init__(self, name='debug'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)

        # File handler
        fh = logging.FileHandler('debug.log')
        fh.setLevel(logging.DEBUG)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        ch.setFormatter(formatter)
        fh.setFormatter(formatter)

        self.logger.addHandler(ch)
        self.logger.addHandler(fh)

    def log_variable(self, name, value):
        """Log variable value"""
        self.logger.debug(f"{name}: {value}")

    def log_function_call(self, func_name, args, kwargs):
        """Log function call"""
        self.logger.debug(
            f"Calling {func_name} with args={args}, kwargs={kwargs}"
        )
```

### Debug Decorator
```python
def debug(func):
    """Debug function decorator"""
    import functools
    import time

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        # Log function call
        print(f"Calling {func.__name__}")

        # Execute function
        result = func(*args, **kwargs)

        # Log execution time
        end_time = time.time()
        print(f"{func.__name__} executed in {end_time - start_time:.4f} seconds")

        return result

    return wrapper
```

## Configuration

### .debugging.yml
```yaml
logging:
  level: "DEBUG"
  file: "debug.log"
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

profiling:
  cpu: true
  memory: true
  line_profiling: true
  output_dir: "./profiles/"

memory:
  tracking: true
  threshold_mb: 100
  check_interval: 5
  iterations: 100

error_handling:
  max_stack_depth: 10
  show_locals: true
  trace_format: "full"
```

## Command Line Interface

### Options
- `--target`: Target file or function
- `--type`: Debug type (error, performance, memory)
- `--duration`: Duration for profiling (seconds)
- `--output`: Output file path
- `--verbose`: Detailed output
- --threshold: Threshold for detection

### Commands
- `debugging analyze`: Analyze errors
- `debugging profile`: Profile performance
- `debugging memory`: Detect memory leaks
- `debugging trace`: Trace execution
- `debugging visualize`: Create visualizations

### Examples
```bash
# Analyze error
/debugging analyze --error "Traceback" --file app.py

# Profile performance
/debugging profile --target app.py --duration 30 --output profile.txt

# Detect memory leaks
/debugging memory --target app.py --iterations 100

# Trace execution path
/debugging trace --function "calculate_total" --module "math_utils"

# Create visualizations
/debugging visualize --type error --output error_visual.png
```

## Debugging Patterns

### Pattern 1: Incremental Debugging
```python
def incremental_debug(func):
    """Debug function step by step"""
    def wrapper(*args, **kwargs):
        print("Starting function execution...")

        # Step 1: Validate inputs
        print("Validating inputs...")
        # Validation logic

        # Step 2: Execute
        print("Executing function...")
        result = func(*args, **kwargs)

        # Step 3: Validate outputs
        print("Validating outputs...")
        # Output validation

        return result
    return wrapper
```

### Pattern 2: Context Debugging
```python
class ContextDebugger:
    """Debug with context awareness"""

    def __init__(self, context):
        self.context = context

    def debug_in_context(self, func, *args, **kwargs):
        """Debug function within context"""
        print(f"Context: {self.context}")
        print("Executing function...")

        result = func(*args, **kwargs)

        print("Function completed")
        return result
```

## Troubleshooting

### Common Issues
- **Performance overhead**: Use selective profiling
- **Memory leaks**: Check for circular references
- **Debug log flood**: Configure appropriate log levels
- **Profile inaccuracies**: Run multiple iterations

### Error Messages
- `Cannot profile function`: Check function accessibility
- **Memory limit exceeded**: Increase memory limits
- **Profile not generated**: Check permissions
- **Debug log too large**: Rotate logs

### Best Practices
1. **Reproduce the issue** consistently
2. **Isolate the problem** to specific code
3. **Use appropriate debugging tools**
4. **Document findings** during debugging
5. **Test fixes thoroughly** after resolution

## TOOL USE EXAMPLES

### Example 1: Stack Trace Analysis
**Tools**: Read, Grep, Bash
**Pattern**: Analisi traceback con ricerca nel codice

```markdown
# Step 1: Analizza lo stack trace fornito
Parse error: "File 'app.py', line 42, in process_user"

# Step 2: Leggi il file con errore contestualizzato
Use Read with file_path: "app.py" and offset: 35 and limit: 20
  -> Output: contesto attorno alla riga 42

# Step 3: Cerca definizioni correlate
Use Grep with pattern: "def process_user|class User" and path: "."

# Step 4: Verifica variabili coinvolte
Use Grep with pattern: "user_data|user_id" and path: "app.py" and output_mode: "content"
```

### Example 2: Performance Profiling Workflow
**Tools**: Bash, Read, Grep
**Pattern**: Profilazione con strumenti nativi

```markdown
# Step 1: Esegui profiler Python
Use Bash with command: "python -m cProfile -o profile.stats app.py"
  timeout: 60000

# Step 2: Analizza risultati
Use Bash with command: "python -c \"import pstats; p=pstats.Stats('profile.stats'); p.sort_stats('cumulative').print_stats(20)\""

# Step 3: Identifica funzioni lente
Use Grep with pattern: "def (slow_function|heavy_process)" and path: "src/"

# Step 4: Leggi funzioni target per ottimizzazione
Use Read with file_path: "src/processing.py"
```

### Example 3: Memory Leak Investigation
**Tools**: Bash, Read, Grep
**Pattern**: Rilevamento memory leak con tracemalloc

```markdown
# Step 1: Esegui con memory tracking
Use Bash with command: "python -c \"import tracemalloc; tracemalloc.start(); import app; app.run(); snapshot = tracemalloc.take_snapshot(); top = snapshot.statistics('lineno'); [print(stat) for stat in top[:10]]\""
  timeout: 30000

# Step 2: Cerca pattern problematici
Use Grep with pattern: "global\s+\w+\s*=|cache\[|_instances\s*=" and path: "src/"

# Step 3: Analizza classi con potenziali leak
Use Read with file_path: "src/cache.py"
  -> Look for: __del__ issues, circular refs, unbounded collections
```

### Example 4: Debugging Multi-File con Chaining
**Tools**: Read, Grep, Glob
**Pattern**: Tracciamento flusso attraverso piu file

```markdown
# Fase 1: Identifica punto di errore
Error: "AttributeError: 'NoneType' object has no attribute 'id'"

# Fase 2: Trova tutti i file coinvolti
Use Glob with pattern: "src/**/*user*.py"

# Fase 3: Cerca assegnazioni problematiche
Use Grep with pattern: "user\s*=\s*None|return None|\.user\s*=" and path: "src/"

# Fase 4: Leggi file con potenziali problemi
For each suspicious file:
  Use Read with file_path: "<file>"
  -> Trace: dove user viene settato a None

# Fase 5: Valida fix
Use Read with file_path: "src/services/user_service.py"
  -> Verify: null check prima dell'accesso
```

## BEST PRACTICES (Tool Usage)

- **Timeout appropriati**: Imposta timeout Bash per operazioni lunghe (>30s)
- **Lettura mirata**: Usa offset/limit per file grandi
- **Ricorsione controllata**: Usa Glob con pattern specifici per evitare troppi risultati
- **Log strutturato**: Usa Bash con redirect per catturare output
- **Processi isolati**: Ogni Bash call e' isolata, usa file per stato

## ERROR HANDLING (Tool Calls)

| Errore | Causa | Recovery |
|--------|-------|----------|
| `Command timeout` | Processo bloccato | Aumenta timeout o killa processo |
| `File not found` | Path relativo errato | Usa path assoluti |
| `Permission denied` | Privilegi insufficienti | Esegui con permessi adeguati |
| `Memory error` | Output troppo grande | Limita output con head/pipe |

```markdown
# Pattern: Safe Bash execution
1. Always set timeout for long-running commands
2. Capture stderr: command 2>&1
3. Use head/limit for large output: command | head -50
4. Check exit code: command && echo "SUCCESS" || echo "FAILED"
```