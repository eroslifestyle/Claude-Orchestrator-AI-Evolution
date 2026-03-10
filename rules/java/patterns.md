# Java Patterns and Rules

> Java-specific standards. Supplements `rules/common/` rules.

---

## Style and Formatting

- Follow **Google Java Style Guide** or **Oracle Code Conventions**
- Use **google-java-format** or **Spotless** for formatting (enforced in CI)
- Line length: **100 chars** (Google style) or 120 (team preference)
- Indentation: 2 spaces (Google) or 4 spaces (Oracle)
- Imports order: static > java.* > javax.* > third-party > local
- Use meaningful names: no single-letter variables except loop counters
- Kebab-case for packages: `com.example.myapp.service`

## Class Design

- **One class per file** - file name matches class name
- Prefer **composition over inheritance**
- Apply **SOLID principles**:
  - Single Responsibility: one reason to change
  - Open/Closed: open for extension, closed for modification
  - Liskov Substitution: subtypes substitutable for base types
  - Interface Segregation: small, specific interfaces
  - Dependency Inversion: depend on abstractions, not concretions
- Use interfaces for API contracts
- Make fields `private` with getters/setters only when needed
- Prefer immutable objects: `final` fields, no setters

## Error Handling

- Use **checked exceptions** for recoverable conditions
- Use **unchecked exceptions** (RuntimeException) for programming errors
- Never catch `Exception` or `Throwable` broadly - catch specific types
- Always include context in exception messages
- Use custom exception classes for domain-specific errors
- Log and rethrow when you can't handle: `logger.error("msg", e); throw e;`
- Use `try-with-resources` for AutoCloseable resources

## Null Handling

- Prefer `Optional<T>` over `null` for return values
- Use `@Nullable` and `@NonNull` annotations (JSR-305 or JetBrains)
- Never pass `null` as parameter - use overloaded methods or builder
- Use `Objects.requireNonNull()` for parameter validation
- Avoid `Optional` in fields, method parameters, or collections

## Concurrency

- Use **ExecutorService** for thread pools (never create threads manually)
- Use **CompletableFuture** for async operations
- Use `var future = CompletableFuture.supplyAsync(() -> ...)`
- Prefer `parallelStream()` for CPU-bound parallelism
- Use `synchronized` blocks sparingly - prefer higher-level constructs
- Use `ReentrantLock`, `ReadWriteLock` for fine-grained control
- Use `ConcurrentHashMap` for thread-safe maps
- Use `AtomicInteger`, `AtomicReference` for atomic operations
- Always shut down ExecutorService: `executor.shutdown()`

## Collections

- Use **diamond operator**: `new ArrayList<>()` not `new ArrayList<String>()`
- Use `List.of()`, `Set.of()`, `Map.of()` for immutable collections (Java 9+)
- Prefer `List` over arrays for type safety
- Use `ArrayList` for random access, `LinkedList` for frequent insertions
- Use `HashMap` by default, `TreeMap` for sorted keys
- Use `EnumSet` and `EnumMap` for enum keys (highly optimized)

## Streams and Lambdas

- Use **streams** for transformations, loops for side effects
- Prefer method references: `list.stream().map(String::toUpperCase)`
- Use `filter`, `map`, `flatMap`, `reduce` for functional style
- Use `collect(Collectors.toList())` or `.toList()` (Java 16+)
- Avoid side effects in stream operations
- Use `Optional` with streams: `.findFirst()`, `.findAny()`

## Testing

- Use **JUnit 5** (`@Test`, `@BeforeEach`, `@AfterEach`)
- Use **Mockito** for mocking dependencies
- Use **AssertJ** for fluent assertions: `assertThat(actual).isEqualTo(expected)`
- One test class per production class: `UserServiceTest` for `UserService`
- Test naming: `methodName_givenCondition_expectedResult`
- Use `@ParameterizedTest` for data-driven tests
- Use `@Nested` for grouping related tests
- Target **80% code coverage** minimum

## Build Systems

### Maven
```
pom.xml
src/
  main/
    java/
    resources/
  test/
    java/
    resources/
```

### Gradle
```
build.gradle / build.gradle.kts
settings.gradle
src/
  main/
    java/
    resources/
  test/
    java/
    resources/
```

- Use dependency management: `spring-boot-dependencies` or `bom`
- Pin dependency versions in production
- Separate `compileOnly`, `implementation`, `testImplementation`

## Dependency Injection

- Use **constructor injection** (required dependencies)
- Use **setter injection** for optional dependencies
- Use `@Autowired` (Spring) or `@Inject` (Jakarta) - prefer constructor
- Avoid field injection (`@Autowired private Foo foo`)
- Use `@Qualifier` or `@Named` for multiple beans of same type

## Records and Pattern Matching (Java 17+)

- Use **records** for immutable data carriers: `record User(String name, int age) {}`
- Use **pattern matching** for `instanceof`:
  ```java
  if (obj instanceof String s) {
      System.out.println(s.length());
  }
  ```
- Use **sealed classes** for restricted hierarchies:
  ```java
  sealed interface Shape permits Circle, Rectangle {}
  ```

## Performance

- Use `StringBuilder` for string concatenation in loops
- Use primitive types over boxed types (`int` over `Integer`)
- Use connection pools for database connections (HikariCP)
- Profile before optimizing: VisualVM, JProfiler, async-profiler
- Use lazy initialization for expensive resources
- Cache wisely: use Caffeine or Guava Cache

## Logging

- Use **SLF4J** with **Logback** or **Log4j2**
- Never use `System.out.println()` in production
- Parameterized logging: `logger.debug("User {} logged in", userId)`
- Log levels: TRACE < DEBUG < INFO < WARN < ERROR
- Use structured logging (JSON) in production
- Never log sensitive data (passwords, tokens, PII)
