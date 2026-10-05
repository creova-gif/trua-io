# CLAUDE.md — trua-io

Instructions for AI coding agents working in this repository.

## Project Overview

Email campaign SaaS, pnpm monorepo. Real business data: campaigns, contacts, conversations, email templates, organizations, members — 13 real tables, all previously exposed to full unauthenticated CRUD via anon/authenticated grants (now revoked).

## Architecture — Authentication

Uses **Clerk**, not Supabase Auth. This means standard `auth.uid()`-based RLS policies do not work here without additional Clerk↔Supabase JWT integration, which has not been set up. All real authorization currently lives in the Node `artifacts/api-server`'s `authMiddleware` — verified consistent across all 8 route files (org ID is always derived from a DB membership lookup, never taken from client input). Treat this middleware as the actual security boundary, not RLS.

## Repository Structure

- Pnpm workspace monorepo — use `pnpm install --frozen-lockfile` and `pnpm build`, not `npm`.
- `artifacts/api-server/src/lib/auth.ts` — `requireAuth` and `resolveOrg` are the real security-critical functions. Any new route must use both, following the existing pattern exactly.

## Security

anon/authenticated table grants were revoked from all 13 business tables — they should stay revoked. If you add a new table, do not grant anon/authenticated access to it; all access should flow through the API server using the service-role key.

## AI Agent Rules

- Do not add Supabase RLS policies assuming `auth.uid()` will be populated — it won't be, since auth is Clerk-based. If real defense-in-depth RLS is wanted, that requires the Clerk JWT integration first, not standalone policies.
- New routes must call `requireAuth`/`resolveOrg` the same way existing routes do.

## Definition of Done

`pnpm build` passes. New routes follow the existing auth middleware pattern. No new anon/authenticated grants on business tables.
