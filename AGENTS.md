# Repository Guidelines

## Project Structure & Module Organization
- Root: workspace orchestrator (`package.json` with workspaces), shared tools in `.specify/`, future shared packages under `packages/`.
- `apps/web`: Next.js 15 app. Routes and API handlers in `apps/web/src/app`, global styles in `apps/web/src/app/globals.css`, reusable UI in `apps/web/src/components` (tests in `__tests__/`), domain helpers in `apps/web/src/lib` and `apps/web/src/utils`, DB schema in `apps/web/src/db`, ETL jobs in `apps/web/src/etl`.
- `apps/web/drizzle`: generated migrations; `apps/web/drizzle.config.ts` configures paths.
- `apps/web/public`: static assets.
- Aliases: `@/*` points to `apps/web/src/*` (see `apps/web/tsconfig.json` and `apps/web/vitest.config.ts`).

## Build, Test, and Development Commands
- From repo root: `yarn dev|lint|build|start|test|test:all` forward to the web app workspace.
- In `apps/web`: `yarn dev` (Turbopack), `yarn lint`, `yarn build`, `yarn start`.
- Tests (Vitest): `yarn test`, `yarn test:watch`, `yarn test:ui`, `yarn test:coverage`, `yarn test:all` (tests then build).
- ETL/DB: `yarn db:push`, `yarn db:gen`, `yarn etl:symbols`, `yarn etl:daily-prices`, `yarn etl:daily-ma`, `yarn etl:quarterly-financials` (backfill variants available).

## Coding Style & Naming Conventions
- TypeScript strict mode; React components/hook files use PascalCase/components and `useX` hook names.
- ESLint extends `next/core-web-vitals` + `next/typescript`; run `npx eslint . --max-warnings=0` inside `apps/web` before PRs.
- Prefer typed props and functional components; avoid `any` unless necessary.
- Tailwind + shadcn/ui patterns; keep class composition readable and colocate component-specific styles.

## Testing Guidelines
- Stack: Vitest + Testing Library + JSDOM (`apps/web/vitest.setup.ts` preloads matchers/cleanup).
- Locations: unit tests in `apps/web/src/lib/__tests__/`, API tests in `apps/web/src/app/api/**/__tests__/`, component tests next to components.
- Naming: mirror source with `.test.ts`/`.test.tsx`; use descriptive `describe/it`.
- Coverage expectations: ~90% core logic, 80% API, 70% components (see `TESTING.md` for details).

## Commit & Pull Request Guidelines
- Commit style: `type: summary` with optional issue/PR tag (e.g., `feat: 티커 검색 필터 추가 (#8)`); keep commits scoped and imperative.
- PRs should include what/why, test commands/results (screenshots for UI), linked issues, and any schema/ETL impacts.
- Run `yarn test` (and `yarn build` when touching runtime/config) before review; note any failing/skipped tests.

## Security & Configuration Tips
- Copy `apps/web/env.example` to `apps/web/.env.local`; never commit secrets. Required keys: `FMP_API_KEY`, `DATABASE_URL`.
- Use Node 20.19+ (see engines). After schema changes, run `yarn db:push`; validate ETL/backfill commands against non-production data before deployment.
