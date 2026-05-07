# Trua IO

AI-powered autonomous email outreach SaaS for Tanzanian businesses — contact management, AI email drafting in English/Swahili, campaign scheduling, and analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)
- Frontend: React 19 + Vite 7 + Tailwind v4 + shadcn/ui
- AI: Anthropic Claude (via `@workspace/integrations-anthropic-ai`)
- Auth: Clerk (via `@clerk/express` on server, `@clerk/react` on frontend)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (organizations, contacts, campaigns, emails, templates, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers (contacts, campaigns, emails, analytics, templates, org, anthropic)
- `artifacts/trua-io/src/pages/` — React pages (Dashboard, Contacts, Campaigns, Emails, Analytics, AiBot, Settings, LandingPage)
- `artifacts/trua-io/src/components/AppLayout.tsx` — black sidebar with teal accents
- `artifacts/trua-io/src/index.css` — brand theme (Electric Teal + warm off-white)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks. Never hand-write API hooks.
- Each user gets their own organization auto-created on first Clerk login (see `auth.ts` → `resolveOrg`)
- AI email drafting uses Claude 3.5 Sonnet; AI enrichment uses Claude 3.5 Haiku (cheaper for bulk ops)
- Streaming SSE for AI chat bot — backend streams tokens, frontend reads EventSource-style
- Conversations table is org-agnostic (no orgId) — shared across the workspace; add orgId if multi-tenant isolation is needed

## Product

- **Landing page**: Public marketing with CTA to sign up
- **Dashboard**: KPI stats (contacts, campaigns, email metrics, hot/qualified leads) + recent campaigns
- **Contacts**: List/search/add/delete contacts; AI enrichment per contact (industry, lead score, stage)
- **Campaigns**: Create, run, pause, delete campaigns; track send/open/reply counts
- **Emails**: AI draft emails in English or Swahili via Claude; review and send; view email history
- **Analytics**: Charts for email timeline, contact stage breakdown, open/reply rates
- **AI Assistant**: Claude-powered chat bot with streaming; conversation history sidebar
- **Settings**: Org name, from name/email, domain, locale, daily send limit; PDPA 2022 compliance info

## User preferences

- Brand: Black (#000000) sidebar + Electric Teal (#1D9E75) primary, warm off-white (#F1EFE8) background
- Fonts: Sora (display/headings) + DM Sans (body)
- PDPA 2022 compliance required on all email sends (unsubscribe links included in AI prompts)

## Gotchas

- After editing OpenAPI spec, always run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks
- `integrations-anthropic-ai` is source-exported (no dist) — do NOT add it to root `tsconfig.json` references
- The `AbortError` in `lib/integrations-anthropic-ai/src/batch/utils.ts` must be imported as a named import from `p-retry`, not accessed as `pRetry.AbortError`
- Clerk auto-creates org + member on first login — no manual org provisioning needed
- AI chat uses SSE streaming via raw `fetch` (not React Query) because Orval doesn't support streaming

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
