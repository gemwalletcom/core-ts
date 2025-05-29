---
trigger: always_on
description: General coding style guide
---

# TypeScript Coding Style Guide (Concise)

## Principles
- Clarity, Readability, Consistency.
- Use modern TypeScript features.

## Language & Tooling
1.  **TypeScript Version:** Latest stable or project-specified.
2.  **ECMAScript Target:** Modern (e.g., ES2020+), per `tsconfig.json`.
3.  **Linting & Formatting:** ESLint & Prettier (via `.eslintrc.js`, `.prettierrc.js`). Run before commit.
4.  **Strict Mode:** Enable `"strict": true` in `tsconfig.json`.

## Naming Conventions
1.  **Variables/Functions:** `camelCase`.
2.  **Classes/Interfaces/Types/Enums:** `PascalCase`.
3.  **Constants:** `UPPER_SNAKE_CASE` (global), `camelCase` (local).
4.  **File Names:** `kebab-case.ts` (general) or `PascalCase.ts` (class/component files). Be consistent.
5.  **No Generic Names:** Avoid `util`, `utils`, `helper`, `common`. Be specific.

## Error Handling
1.  **Sync:** `try...catch`.
2.  **Async (Promises):** `async/await` with `try...catch` preferred. `.then().catch()` alternative.
3.  **Custom Errors:** Extend `Error` for specific conditions (e.g., `class NetworkError extends Error {...}`).

## Testing
1.  **Framework:** Jest.
2.  **Files:** `*.test.ts` or `*.spec.ts`.
3.  **Structure:** `describe` for groups, `it`/`test` for cases.
4.  **Async Tests:** `async/await`.
5.  **Data Integrity:** No shared test data modification. Avoid hardcoding in prod to pass tests.

## Documentation & Comments
1.  **Module Docs:** JSDoc (`/** @module ... */`) or leading comment block.
2.  **Code Comments (`//`):** Only for complex, non-obvious logic. Keep updated. Avoid redundant comments.

## Imports
1.  **Grouping/Order:** 1. External npm, 2. Internal packages/aliases, 3. Relative local. Alphabetize within groups.
2.  **Exports:** Prefer named exports. Default exports sparingly.
3.  **Path Aliases:** Use `tsconfig.json` aliases for clean imports.

## Types & Interfaces
1.  **Explicitness:** Explicit types for public API params, return types, class members.
2.  **`any` vs. `unknown`:** Avoid `any`. Use `unknown` with type checking. Prefer specific types/generics.
3.  **`interface` vs. `type`:** `interface` for object shapes, class implementations (extendable). `type` for unions, intersections, primitives, tuples, utility types.
4.  **`readonly`:** For properties not reassigned post-creation.

## Asynchronous Programming
1.  **`async/await`:** Preferred over raw Promise chains.
2.  **Promise Handling:** Always handle rejections (`try...catch` or `.catch()`).
3.  **Concurrency:** `Promise.all` / `Promise.allSettled` where appropriate.

## Modules
1.  **Syntax:** ES Modules (`import`/`export`).
2.  **Responsibility:** Single, well-defined.

## Immutability
1.  **Prefer Immutability:** Create new instances instead of direct modification.
    *   `ReadonlyArray<T>`, `readonly T[]`.
    *   Spread syntax: `{ ...obj, prop: newValue }`, `[...arr, newItem]`.
    *   Consider immutable libraries (Immer, Immutable.js) for complex state.

## Code Structure
1.  **File/Function Length:** Keep short and focused.
2.  **No Magic Values:** Use named constants.

## Best Practices
1.  **DRY:** Don't Repeat Yourself.
2.  **YAGNI:** You Aren't Gonna Need It.
3.  **SOLID:** Keep in mind for class/module design.