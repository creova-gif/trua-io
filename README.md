# Trua

**Email campaign management with built-in compliance tracking — multi-tenant CRM for organizations running marketing campaigns that need to stay CASL/anti-spam compliant.**

[![Status](https://img.shields.io/badge/status-active_development-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

## Overview

A multi-tenant email marketing and CRM platform where compliance is tracked as ongoing progress alongside campaigns, not an afterthought.

## Problem

Organizations running email marketing campaigns need to track CASL/anti-spam compliance, but most CRM/campaign tools treat compliance as a separate, manual checklist rather than integrating it into the campaign workflow itself.

## Solution

Each organization manages its own contacts, campaigns, and email templates with compliance progress tracked natively, in a properly multi-tenant architecture with real API-layer authorization.

## Architecture

Pnpm monorepo. Authentication is Clerk-based, not Supabase Auth — real authorization lives entirely in the Node API server's `authMiddleware`, which resolves organization ID from a database membership lookup, never from client input (verified across all 8 route files). Thirteen real business tables (campaigns, contacts, conversations, emails, organizations, members, etc.) previously had anon/authenticated grants that would have exposed them to unauthenticated CRUD if RLS were ever disabled — these grants have been revoked.

## Technology Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Backend | Node (`artifacts/api-server`) |
| Auth | Clerk |
| Database | Supabase Postgres |

## Getting Started

```bash
pnpm install --frozen-lockfile
pnpm build
```

## Security

Because auth is Clerk-based, standard `auth.uid()`-based RLS policies won't work without additional Clerk↔Supabase JWT integration, which is not currently set up. The API server's middleware is the actual security boundary — treat it as such, not the database's RLS layer.

## Project Status

Active development. Real business logic and real authorization exist; the RLS gap has been closed at the grants level (anon/authenticated access revoked), though defense-in-depth RLS policies proper would require the Clerk JWT integration.

## Roadmap

- [ ] Clerk↔Supabase JWT integration for real RLS policies (optional hardening, not currently blocking)

## Contributing

Private, proprietary CREOVA product.

## License

Proprietary — All Rights Reserved.

## Author / Organization

Built by [Justin Mafie](https://github.com/creova-gif) under CREOVA.

## Documentation

See `CLAUDE.md` for AI-agent-specific notes on the Clerk auth boundary.
