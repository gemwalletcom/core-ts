# Repository Guidelines

## Project Structure & Module Organization
- Monorepo via `pnpm` workspaces (`packages/*`, `apps/*`).
- `apps/api` — Express REST API (entry `src/index.ts`) → `dist/`.
- `packages/swapper` — protocol providers and swap logic (per‑provider subfolders) → `dist/`.
- `packages/types` — shared TypeScript definitions (entry `src/index.ts`) → `dist/`.
- Root `tsconfig.json` plus per‑package configs with references and path aliases.

## Build, Test, and Development Commands
- Install: `just install` or `pnpm install`.
- Build all: `just build` or `pnpm build` (packages then apps).
- Dev (watch): `just dev` or `pnpm dev`; API only: `pnpm --filter @gemwallet/api dev`.
- Run API: `just start` or `pnpm start:api` (serves from `apps/api/dist`).
- Test: `just test` or `pnpm test`; per‑package: `pnpm --filter @gemwallet/swapper test`.
- Docker: `just docker-build` then `just docker-run` (exposes `:3000`).

## Coding Style & Naming Conventions
- TypeScript strict mode; ES2020+/ESNext modules.
- 2‑space indent, double quotes, named exports when practical.
- Files: kebab‑case; tests end with `.test.ts`; entry files `index.ts`.
- Follow .windsurf style guide (imports grouped, explicit types for public APIs).

## Testing Guidelines
- Jest + `ts-jest` (Node env, ESM enabled).
- Co‑locate tests as `*.test.ts`; mock network/services in unit tests.
- No enforced coverage threshold; cover critical paths (providers, API routes).
- Run focused tests with `pnpm --filter <pkg> test`.

## Architecture Overview
- Providers implemented today: `stonfi_v2`, `mayan`, `symbiosis`, `cetus`, `relay`.
- API endpoints: `GET /` (providers, version), `POST /:providerId/quote`, `POST /:providerId/quote_data`.
- Keep provider interface consistent for quotes and transaction building.

## Commit & Pull Request Guidelines
- Prefer conventional style where helpful: `feat|fix|chore(scope): message`; keep messages imperative.
- PRs: small, focused; include description, linked issues/PRs, and test notes or screenshots for API responses.
- Must pass `pnpm build` and `pnpm test`; do not commit `dist/`.

## Security & Configuration Tips
- Configure via env vars used by API/providers: `PORT`, `TRON_URL`, `SOLANA_URL`, `SUI_URL`, `TON_URL`.
- Never commit secrets; use local `.env`. Add/update an `.env.example` when introducing new vars.

## Agent‑Specific Instructions (all code agents)
- Use `pnpm` workspace filters (`--filter`) and Justfile tasks; avoid changing file layout.
- Keep edits minimal and focused; update adjacent docs/tests when touching APIs or providers.
- Prefer mocks for external calls; do not add unvetted network dependencies.
- Reflect provider additions/removals in `apps/api/src/index.ts` and docs; exclude unimplemented protocols.
