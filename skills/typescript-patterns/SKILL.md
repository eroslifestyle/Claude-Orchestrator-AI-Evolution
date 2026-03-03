---
name: typescript-patterns
description: TypeScript best practices, patterns, and idioms. Auto-activated when working with .ts/.tsx files. Covers strict mode, React patterns, Node.js patterns.
user-invokable: false
metadata:
  keywords: [typescript, patterns, strict, best-practices]
---

# TypeScript Patterns & Best Practices

> **Detailed patterns:** See `rules/typescript/patterns.md` for comprehensive examples.

## Strict Configuration

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

## Types vs Interfaces

| Use | When |
|-----|------|
| `interface` | Object shapes, extendable contracts, class implementations |
| `type` | Unions, intersections, mapped types, conditional types |
| `const` object | Instead of `enum` (tree-shakeable, no runtime overhead) |

```typescript
interface User { readonly id: string; name: string; email: string }
type Result<T> = { ok: true; data: T } | { ok: false; error: Error };
const Status = { Active: "active", Inactive: "inactive" } as const;
type Status = (typeof Status)[keyof typeof Status];
```

## Generics

- Constrain with `extends` to narrow what's accepted
- Use `infer` in conditional types for extraction
- Avoid over-generic code -- only generalize when you have 2+ concrete uses

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

## Error Handling

### Result Type Pattern
Never throw for expected failures. Use discriminated unions.

```typescript
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };
type ApiError = { code: "NOT_FOUND"; resource: string } | { code: "VALIDATION"; fields: string[] };

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  const res = await fetch(`/api/users/${id}`);
  if (res.status === 404) return { ok: false, error: { code: "NOT_FOUND", resource: "user" } };
  return { ok: true, data: await res.json() };
}
```

### Runtime Validation with Zod
```typescript
import { z } from "zod";
const UserSchema = z.object({ id: z.string().uuid(), name: z.string().min(1), email: z.string().email() });
type User = z.infer<typeof UserSchema>;
function parseUser(data: unknown): Result<User> {
  const parsed = UserSchema.safeParse(data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: new Error(parsed.error.message) };
}
```

## React Patterns

### Component Definition
```typescript
interface ButtonProps { label: string; variant?: "primary" | "secondary"; onClick: () => void }
function Button({ label, variant = "primary", onClick }: ButtonProps) {
  return <button className={`btn btn-${variant}`} onClick={onClick}>{label}</button>;
}
```

### Custom Hooks for Logic Extraction
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

function useFetch<T>(url: string, schema: z.ZodType<T>) {
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({ data: null, error: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal }).then(r => r.json()).then(j => setState({ data: schema.parse(j), error: null, loading: false }))
      .catch(err => !controller.signal.aborted && setState({ data: null, error: err, loading: false }));
    return () => controller.abort();
  }, [url]);
  return state;
}
```

### Memo Only When Measured
```typescript
// WRONG - memo everything "just in case"
const Item = memo(({ name }: { name: string }) => <span>{name}</span>);
// CORRECT - memo expensive renders with profiler evidence
const ExpensiveChart = memo(function ExpensiveChart({ data }: ChartProps) { /* Heavy DOM/canvas */ });
```

## State Management

| Scale | Tool | When |
|-------|------|------|
| Component-local, simple | `useState` | Toggle, form field |
| Component-local, complex | `useReducer` | Form with validation, multi-step wizard |
| Shared across tree | `Zustand` or `Jotai` | Auth state, theme, cart |
| Server state | `TanStack Query` | API data with cache/refetch |

```typescript
// Zustand store
const useAuth = create<AuthStore>((set) => ({
  user: null,
  login: async (credentials) => set({ user: await api.login(credentials) }),
  logout: () => set({ user: null }),
}));
```

## API Layer

### tRPC for Full-Stack TypeScript
```typescript
// server
const appRouter = router({
  user: router({
    getById: procedure.input(z.object({ id: z.string() })).query(async ({ input }) => db.user.findUnique({ where: { id: input.id } })),
  }),
});
// client - fully typed, no codegen
const user = await trpc.user.getById.query({ id: "123" });
```

### Fetch with Validation
```typescript
async function apiClient<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    if (!res.ok) return { ok: false, error: new Error(`HTTP ${res.status}`) };
    return { ok: true, data: schema.parse(await res.json()) };
  } catch (err) { return { ok: false, error: err instanceof Error ? err : new Error(String(err)) }; }
}
```

## Testing

- **Vitest** as test framework (fast, ESM-native, Jest-compatible API)
- **Testing Library** for React components (user-centric queries)
- **MSW** (Mock Service Worker) for API mocking (intercepts at network level)

```typescript
// vitest test
describe("parseUser", () => {
  it("parses valid user data", () => {
    const result = parseUser({ id: "uuid", name: "Alice", email: "a@b.com", role: "admin" });
    expect(result.ok).toBe(true);
  });
});

// React component test
it("calls onClick when button is pressed", async () => {
  const handleClick = vi.fn();
  render(<Button label="Submit" onClick={handleClick} />);
  await userEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect(handleClick).toHaveBeenCalledOnce();
});
```

## Node.js Patterns

### Graceful Shutdown
```typescript
function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => { db.destroy().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => { console.error("Unhandled:", reason); shutdown("unhandledRejection"); });
```

### Async Error Handling in Express/Fastify
```typescript
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
}));
```

## Common Mistakes to Avoid

```typescript
// WRONG - any disables type checking
function parse(data: any) { return data.name; }

// CORRECT - use unknown and narrow (or zod)
function parse(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) return String((data as { name: unknown }).name);
  throw new Error("Invalid data");
}

// WRONG - crashes if user is null
const name = user.profile.name;

// CORRECT - safe access with fallback
const name = user?.profile?.name ?? "Unknown";

// WRONG - unhandled rejection
async function loadData() { const data = await fetch("/api/data"); }
loadData();

// CORRECT - handle errors
async function loadData() { try { return await (await fetch("/api/data")).json(); } catch (err) { console.error(err); return null; } }
void loadData();

// Use `never` to enforce exhaustive handling
type Shape = { kind: "circle"; radius: number } | { kind: "rect"; w: number; h: number };
function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.radius ** 2;
    case "rect": return shape.w * shape.h;
    default: const _exhaustive: never = shape; throw new Error(`Unhandled: ${_exhaustive}`);
  }
}
```
