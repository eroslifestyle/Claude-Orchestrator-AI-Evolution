# Rust Patterns and Rules

> Rust-specific standards. Supplements `rules/common/` rules.

---

## Style and Formatting

- Follow **Rust Style Guide** and use `rustfmt` (enforced in CI)
- Line length: **100 chars** (rustfmt default)
- Use `cargo clippy` for linting - address all warnings before merge
- Imports order: std > external crates > local modules (grouped with blank lines)
- Use `use` statements at module top, prefer `use crate::` for local imports

## Ownership and Borrowing

- **One owner** per value - understand ownership at compile time
- Borrowing rules: **multiple immutable OR one mutable**, never both
- Prefer borrowing (`&T`, `&mut T`) over transferring ownership
- Use `Clone` sparingly - expensive operations should be explicit
- Lifetimes: elide when obvious, annotate when compiler requires it
- Avoid `static` lifetime unless truly global state needed

## Error Handling

- Use `Result<T, E>` for recoverable errors, `panic!` for unrecoverable bugs
- Define custom error types with `thiserror` crate for libraries
- Use `anyhow` for application code (error propagation with context)
- Always handle `Result` - never use `.unwrap()` or `.expect()` in production
- Use `?` operator for error propagation (cleaner than match)
- Use `Option<T>` for nullable values, never use `null` pointers

## Async Patterns

- Use **tokio** as async runtime (industry standard)
- `async fn` returns `Future` - must be `.await`ed
- Use `tokio::spawn` for concurrent tasks (fire-and-forget)
- Use `tokio::join!` for concurrent futures (wait all)
- Use `tokio::select!` for racing futures (first wins)
- Set timeouts: `tokio::time::timeout(duration, future)`
- Never block async runtime: use `tokio::task::spawn_blocking` for CPU-heavy work

## Traits and Generics

- Prefer **traits over inheritance** (Rust has no inheritance)
- Use trait bounds: `fn process<T: Display + Clone>(item: T)`
- Use `where` clauses for complex bounds (more readable)
- Implement standard traits: `Debug`, `Clone`, `PartialEq`, `Serialize/Deserialize`
- Use `impl Trait` in return position for anonymous types
- Use generics for type-safe collections and algorithms

## Memory Management

- RAII pattern: resources cleaned up when dropped (no manual cleanup)
- Use `Box<T>` for heap allocation
- Use `Rc<T>` for shared ownership (single-threaded)
- Use `Arc<T>` for shared ownership (multi-threaded)
- Use `Cell<T>` and `RefCell<T>` for interior mutability (single-threaded)
- Use `Mutex<T>` and `RwLock<T>` for interior mutability (multi-threaded)
- Avoid raw pointers (`*const T`, `*mut T`) unless FFI or unsafe required

## Testing

- Use built-in `cargo test` framework
- Unit tests in same file: `#[cfg(test)] mod tests { ... }`
- Integration tests in `tests/` directory
- Use `#[test]` attribute for test functions
- Use `#[should_panic]` for panic testing
- Use `assert!`, `assert_eq!`, `assert_ne!` macros
- Use `#[test_case]` or `rstest` crate for parameterized tests
- Mock with `mockall` crate for trait mocking

## Documentation

- Use `///` for doc comments (rendered in rustdoc)
- Include examples in doc comments (tested by `cargo test --doc`)
- Use `//!` for module-level documentation
- Document public APIs: functions, structs, traits, enums
- Use `cargo doc --open` to preview documentation

## Project Structure

```
project/
  Cargo.toml
  Cargo.lock
  src/
    main.rs          # binary entry point
    lib.rs           # library entry point
    module1/
      mod.rs
      submodule.rs
    module2.rs
  tests/             # integration tests
    integration_test.rs
  benches/           # benchmarks (cargo bench)
    benchmark.rs
  examples/          # examples (cargo run --example)
    example.rs
```

- Use `Cargo.toml` for dependencies and metadata
- Commit `Cargo.lock` for binaries, ignore for libraries
- Use `src/lib.rs` + `src/main.rs` pattern for projects with both
- Module hierarchy mirrors file structure

## Dependencies

- Use `cargo add <crate>` to add dependencies
- Specify version constraints: `^1.2` (semver compatible), `=1.2` (exact)
- Use `[dev-dependencies]` for test-only crates
- Audit dependencies: `cargo audit` (security vulnerabilities)
- Keep dependencies minimal - Rust ecosystem is modular

## Performance

- Profile before optimizing: `cargo flamegraph`, `perf`
- Use `--release` for benchmarks and production builds
- Prefer stack allocation over heap (use arrays, not Vec when size known)
- Use iterators over loops (often optimized better)
- Use `Cow<str>` for borrowed/owned string flexibility
- Benchmark with `criterion` crate

## Safety

- **Unsafe code** requires justification: `// SAFETY: explanation`
- Minimize `unsafe` blocks - encapsulate in safe APIs
- Use `#[deny(unsafe_code)]` in libraries unless necessary
- FFI boundaries: validate all data crossing from C
- Use `miri` to detect undefined behavior in unsafe code
