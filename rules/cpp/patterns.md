# C++ Patterns and Rules

> C++-specific standards. Supplements `rules/common/` rules.

---

## Style and Formatting

- Follow a consistent style: **LLVM**, **Google**, or **ISO C++ Core Guidelines**
- Use **clang-format** for formatting (enforced in CI)
- Line length: **100-120 chars** (team preference)
- Naming conventions (pick one style, be consistent):
  - snake_case for functions/variables (STL style)
  - camelCase for functions/variables (Google style)
  - PascalCase for types/classes
- Use meaningful names: no single-letter variables except loop counters
- `const` and `constexpr` wherever possible

## Memory Management

- **RAII**: Resource Acquisition Is Initialization - tie resource lifetime to object
- Use **smart pointers**: `std::unique_ptr` (exclusive), `std::shared_ptr` (shared)
- Never use `new`/`delete` directly - use `std::make_unique`, `std::make_shared`
- Prefer stack allocation over heap allocation
- Use `std::vector` instead of C arrays
- Use `std::string` and `std::string_view` instead of `char*`
- Avoid raw pointers for ownership - only for non-owning references
- Use `gsl::owner<T*>` (Guidelines Support Library) if raw ownership needed

## Error Handling

- Use **exceptions** for exceptional conditions (not for control flow)
- Throw by value, catch by `const` reference: `catch (const std::exception& e)`
- Use standard exception hierarchy: `std::runtime_error`, `std::logic_error`
- Define custom exceptions inheriting from `std::exception`
- Use `noexcept` for functions that cannot throw
- Use `std::optional<T>` for values that may be absent (C++17)
- Use `std::expected<T, E>` for fallible operations (C++23)
- Always clean up resources in destructors (RAII)

## Modern C++ Features

- Prefer **C++17** minimum, **C++20** for new projects
- Use `auto` for type deduction: `auto value = getValue();`
- Use `auto&` and `const auto&` for references in range-for
- Use range-based for loops: `for (const auto& item : container)`
- Use structured bindings: `auto [key, value] = *map.begin();`
- Use `constexpr` for compile-time evaluation
- Use `if constexpr` for compile-time branching
- Use `[[nodiscard]]` for return values that shouldn't be ignored
- Use `enum class` instead of plain `enum`

## Concurrency

- Use `std::thread` for basic threading
- Prefer `std::jthread` (C++20) for auto-joining threads
- Use `std::async` for async operations: `auto future = std::async(std::launch::async, func)`
- Use `std::mutex`, `std::shared_mutex` for synchronization
- Use `std::lock_guard`, `std::unique_lock`, `std::shared_lock` (RAII)
- Use `std::atomic<T>` for lock-free atomic operations
- Use `std::condition_variable` for thread signaling
- Prefer `std::latch` and `std::barrier` (C++20) for coordination
- Avoid data races - use `std::atomic` or mutexes

## Containers and Algorithms

- Use STL containers: `vector`, `string`, `map`, `unordered_map`, `set`
- Use `std::vector` as default container (contiguous memory, cache-friendly)
- Use `reserve()` when size is known to avoid reallocations
- Use STL algorithms over manual loops: `std::find`, `std::transform`, `std::sort`
- Use `<algorithm>` and `<numeric>` headers
- Use `std::ranges` (C++20) for composable algorithms
- Prefer `std::string_view` for read-only string references (no allocation)

## Testing

- Use **Google Test** (gtest) or **Catch2** as test framework
- Use **Google Mock** (gmock) for mocking (with gtest)
- One test file per source file: `user_test.cpp` for `user.cpp`
- Test naming: `TEST(UserTest, GetUser_ReturnsUser_WhenIdValid)`
- Use test fixtures for common setup: `class UserTest : public ::testing::Test`
- Use `ASSERT_*` for fatal failures, `EXPECT_*` for non-fatal
- Target **80% code coverage** minimum
- Use `ctest` or `bazel test` for running tests

## Build Systems

### CMake
```
CMakeLists.txt
src/
  main.cpp
  module.cpp
  module.hpp
include/
  module.hpp
tests/
  test_module.cpp
```

### Meson
```
meson.build
src/
tests/
```

- Use modern CMake: `target_link_libraries`, `target_include_directories`
- Use `FetchContent` or `find_package` for dependencies
- Enable warnings: `-Wall -Wextra -Wpedantic -Werror`
- Use sanitizers in debug: `-fsanitize=address,undefined`

## Documentation

- Use **Doxygen** for API documentation
- Document public APIs: classes, functions, constants
- Use `///` or `/** */` style comments
- Include `@brief`, `@param`, `@return`, `@throws` tags
- Generate docs with: `doxygen Doxyfile`

## Performance

- Profile before optimizing: `perf`, `Valgrind`, `VTune`
- Use `-O2` or `-O3` for release builds
- Use move semantics: `std::move()` for rvalue transfers
- Avoid unnecessary copies: pass by `const&` for read-only
- Use `std::string_view` instead of `const std::string&` parameters
- Use `reserve()` for containers when size is known
- Prefer `emplace_back()` over `push_back()` for in-place construction
- Use `constexpr` for compile-time computations

## Safety

- Enable sanitizers in CI: AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan)
- Use static analysis: `clang-tidy`, `cppcheck`, `PVS-Studio`
- Use `gsl::span` instead of pointer+size pairs
- Validate all external input
- Use `std::array` instead of C arrays
- Avoid C-style casts - use `static_cast`, `dynamic_cast`, `reinterpret_cast`
- Use `[[maybe_unused]]` for intentionally unused variables

## Headers and Includes

- Use `#pragma once` or include guards
- Order includes: corresponding header > project headers > STL > external
- Use forward declarations when possible (reduce compile time)
- Minimize includes in header files
- Use `#include <>` for system headers, `#include ""` for project headers

## Project Structure

```
project/
  CMakeLists.txt
  src/
    main.cpp
    module/
      module.cpp
      module.hpp
  include/
    project/
      public_header.hpp
  tests/
    test_main.cpp
    test_module.cpp
  third_party/
  docs/
  README.md
```

- Separate public headers in `include/`
- Keep implementation details in `src/`
- Tests mirror source structure
- Use `third_party/` for vendored dependencies
