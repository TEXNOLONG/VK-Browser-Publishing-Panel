# VK Publisher

Веб-приложение для входа через VK ID и публикации записей на личной странице и в доступных сообществах.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/vk-publisher run dev` — run the web app (port 20526)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `VK_APP_ID`, `VK_APP_SECRET`, `VK_REDIRECT_URI`
- `VK_APP_SECRET` must be stored as a Replit Secret and never committed to `.replit`, `.env`, or source code. Replit injects `DATABASE_URL` and `SESSION_SECRET` automatically.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vk-publisher` — React/Vite web interface
- `artifacts/api-server` — Express API and VK ID OAuth callback
- `lib/api-spec/openapi.yaml` — API contract
- `lib/db/src/schema` — database schema
- `.env.example` — local environment variable template

## Architecture decisions

- VK OAuth uses a server-side authorization-code exchange for a Standalone VK application; VK access tokens are encrypted in the database.
- The API is exposed through the `/api` artifact route while the web app stays at `/`.
- Replit-managed `DATABASE_URL` and `SESSION_SECRET` are preferred over local values.

## Product

- Sign in with VK OAuth.
- Choose a personal page or managed community.
- Review and publish a text post.

## User preferences

- VK credentials should not be committed to the repository.

## Gotchas

- The VK trusted redirect URL must match `VK_REDIRECT_URI` exactly, including `/api/auth/vk/callback`.
- The current Replit dev domain is used in the checked-in non-secret redirect configuration; update it if the domain changes.
- The Standalone VK application must be allowed to request the `wall` permission; VK may require approval for this permission.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
