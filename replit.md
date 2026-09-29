# VK Publisher

Веб-приложение для входа через VK и публикации записей на личной странице и в доступных сообществах.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/vk-publisher run dev` — run the web app (port 20526)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `VK_APP_ID`, `VK_APP_SECRET`, `VK_REDIRECT_URI`, `VK_COMMUNITY_ID`
- `VK_APP_SECRET` must be stored as a Replit Secret and never committed to `.replit`, `.env`, or source code. Replit injects `DATABASE_URL` and `SESSION_SECRET` automatically.
- `VK_COMMUNITY_TOKEN` must be stored as a Replit Secret; `VK_COMMUNITY_ID` is the numeric ID of the community that token belongs to.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vk-publisher` — React/Vite web interface
- `artifacts/api-server` — Express API and VK OAuth callback
- `lib/api-spec/openapi.yaml` — API contract
- `lib/db/src/schema` — database schema
- `.env.example` — local environment variable template

## Architecture decisions

- VK ID uses Authorization Code + PKCE for sign-in and destination discovery; VK ID tokens are encrypted in the database.
- Community publication uses a separate `VK_COMMUNITY_TOKEN` stored as a Replit Secret because community wall.post calls must use a community token.
- The API is exposed through the `/api` artifact route while the web app stays at `/`.
- Replit-managed `DATABASE_URL` and `SESSION_SECRET` are preferred over local values.

## Product

- Sign in with VK.
- Choose a personal page or managed community.
- Review and publish a text post.

## User preferences

- VK credentials should not be committed to the repository.

## Gotchas

- The VK trusted redirect URL must match `VK_REDIRECT_URI` exactly, including `/api/auth/vk/callback`.
- The current Replit dev domain is used in the checked-in non-secret redirect configuration; update it if the domain changes.
- Personal-wall publishing is intentionally disabled because VK ID tokens cannot call `wall.post`. Community publishing uses `VK_COMMUNITY_TOKEN` and `VK_COMMUNITY_ID`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
