---
name: go-patterns
description: Go best practices, idioms, and patterns. Auto-activated when working with .go files. Covers error handling, concurrency, interfaces, testing.
user-invokable: false
metadata:
  keywords: [go, golang, patterns, idioms]
---

# Go Patterns & Best Practices

> **Detailed patterns:** See `rules/go/patterns.md` for comprehensive examples.

## Error Handling

- **Always** check returned errors -- never discard with `_`
- Wrap errors with context: `fmt.Errorf("doing X: %w", err)`
- Use `errors.Is` / `errors.As` for comparison (works through wrapping)
- Define sentinel errors for expected, recoverable cases

```go
var ErrNotFound = errors.New("not found")

func GetUser(ctx context.Context, id string) (*User, error) {
    if err := row.Scan(&u.ID, &u.Name); err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("get user %s: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return &u, nil
}

// Caller checks with errors.Is
if errors.Is(err, ErrNotFound) { http.Error(w, "Not found", 404) }
```

### Custom Error Types
```go
type ValidationError struct { Field, Message string }
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}
// Check with errors.As
var valErr *ValidationError
if errors.As(err, &valErr) { /* handle */ }
```

## Interfaces

- Define interfaces **at the consumer site**, not the producer
- Keep interfaces small: 1-3 methods (single responsibility)
- **Accept interfaces, return structs**

```go
// WRONG - large interface at producer
type UserService interface {
    GetUser(ctx context.Context, id string) (*User, error)
    CreateUser(ctx context.Context, u *User) error
    // ... more methods
}

// CORRECT - small interface at consumer
type UserGetter interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

func NewHandler(users UserGetter) *Handler { return &Handler{users: users} }
```

## Concurrency

### Goroutines + Channels
```go
func processItems(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // limit concurrent goroutines
    for _, item := range items {
        g.Go(func() error { return processOne(ctx, item) })
    }
    return g.Wait()
}
```

### Context for Cancellation
```go
func longOperation(ctx context.Context) error {
    for i := range 1000 {
        select {
        case <-ctx.Done(): return ctx.Err()
        default: if err := doStep(i); err != nil { return fmt.Errorf("step %d: %w", i, err) }
        }
    }
    return nil
}
// Caller: ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
```

### Worker Pool
```go
func workerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, workers int) {
    var wg sync.WaitGroup
    for range workers {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done(): return
                case results <- process(job):
                }
            }
        }()
    }
    wg.Wait(); close(results)
}
```

## Struct Design

### Functional Options Pattern
```go
type Server struct { addr string; readTimeout time.Duration; logger *slog.Logger }
type Option func(*Server)

func WithReadTimeout(d time.Duration) Option { return func(s *Server) { s.readTimeout = d } }
func WithLogger(l *slog.Logger) Option { return func(s *Server) { s.logger = l } }

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{addr: addr, readTimeout: 5 * time.Second, logger: slog.Default()}
    for _, opt := range opts { opt(s) }
    return s
}
// Usage: srv := NewServer(":8080", WithReadTimeout(10*time.Second), WithLogger(myLogger))
```

### Embedding for Composition
```go
type BaseRepository struct { db *sql.DB }
func (r *BaseRepository) execContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
    return r.db.ExecContext(ctx, query, args...)
}

type UserRepository struct { BaseRepository }
func (r *UserRepository) Create(ctx context.Context, u *User) error {
    _, err := r.execContext(ctx, "INSERT INTO users (name, email) VALUES ($1, $2)", u.Name, u.Email)
    return err
}
```

## Testing

### Table-Driven Tests
```go
func TestParseAmount(t *testing.T) {
    tests := []struct { name string; input string; want float64; wantErr bool }{
        {"valid integer", "100", 100.0, false},
        {"empty string", "", 0, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAmount(tt.input)
            if tt.wantErr { require.Error(t, err); return }
            require.NoError(t, err); assert.InDelta(t, tt.want, got, 0.001)
        })
    }
}
```

### HTTP Testing
```go
func TestGetUserHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/users/123", nil)
    rec := httptest.NewRecorder()
    handler.GetUser(rec, req)
    assert.Equal(t, http.StatusOK, rec.Code)
}
```

## Performance

| Technique | Impact |
|-----------|--------|
| `sync.Pool` | Reduces allocations for frequently created objects |
| `strings.Builder` | O(n) string concatenation vs O(n^2) with `+` |
| `make([]T, 0, cap)` | Pre-allocate slices when size known |
| `sync.Map` | Concurrent map for read-heavy workloads |

```go
// Pre-allocate slices
ids := make([]string, 0, len(users))

// strings.Builder for concatenation
var b strings.Builder
for i, cond := range conditions { if i > 0 { b.WriteString(" AND ") }; b.WriteString(cond) }

// sync.Pool for reducing GC
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}
```

## Project Layout

```
myproject/
    cmd/api/main.go           # Entrypoint (thin: parse config, wire deps)
    internal/user/            # Private packages (handler, service, repository, model)
    pkg/httputil/             # Only if truly reusable across projects
    go.mod, go.sum
```

## Dependency Injection

```go
// Constructor Injection (preferred)
type OrderService struct { repo OrderRepository; notifier Notifier; logger *slog.Logger }
func NewOrderService(repo OrderRepository, notifier Notifier, logger *slog.Logger) *OrderService {
    return &OrderService{repo: repo, notifier: notifier, logger: logger}
}

// Wire for compile-time DI (larger projects)
//go:build wireinject
func InitializeApp(cfg Config) (*App, error) {
    wire.Build(NewDB, NewUserRepo, NewUserService, NewHandler, NewApp)
    return nil, nil
}
```

## Logging with slog

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
logger.Info("user created", slog.String("user_id", user.ID), slog.Duration("latency", elapsed))
```

## Common Mistakes to Avoid

```go
// WRONG - goroutine blocks forever if nobody reads ch
func generate() <-chan int {
    ch := make(chan int)
    go func() { for i := 0; ; i++ { ch <- i } }()
    return ch
}

// CORRECT - use context for cancellation
func generate(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; ; i++ { select { case <-ctx.Done(): return; case ch <- i: } }
    }()
    return ch
}

// WRONG - data race on counter
var counter int
for range 100 { go func() { counter++ }() }

// CORRECT - use atomic
var counter atomic.Int64
for range 100 { go func() { counter.Add(1) }() }

// WRONG - defer in loop (resources not released until function returns)
for _, p := range paths { f, _ := os.Open(p); defer f.Close(); process(f) }

// CORRECT - use closure to scope defer
for _, p := range paths {
    if err := func() error { f, _ := os.Open(p); defer f.Close(); return process(f) }(); err != nil {
        return err
    }
}

// WRONG - nil pointer on interface
var d Doer = (*MyStruct)(nil) // d != nil, but d.Do() panics!

// CORRECT - check the concrete value
func process(d Doer) error { if d == nil { return errors.New("nil doer") }; return d.Do() }
```
