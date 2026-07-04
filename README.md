# Trua

**Email campaign management with built-in compliance tracking — multi-tenant CRM for organizations running marketing campaigns that need to stay CASL/anti-spam compliant.**

[![Status](https://img.shields.io/badge/status-active_development-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## What this is

Trua is a multi-tenant (organization-based) email marketing and CRM platform where compliance isn't an afterthought — it's tracked as ongoing progress alongside the campaigns themselves. Each organization manages its own contacts, campaigns, email templates, and team, with AI assistance (Anthropic) built into the workflow and compliance progress tracked per-org rather than checked once and forgotten.

This is conceptually related to `CanCompliance` (both deal with Canadian anti-spam/compliance concerns) but structured differently — Trua is a full multi-tenant campaign platform with compliance as one tracked dimension, while CanCompliance is a standalone compliance-scanning tool. Worth clarifying whether these are meant to converge, stay separate, or if one supersedes the other.

---

## Core Features

- **Multi-tenant organizations** — each org has isolated contacts, campaigns, and team
- **Campaigns** — email campaign creation and management
- **Contacts** — contact list management
- **Email templates** — reusable template library
- **Compliance progress tracking** — ongoing compliance status per organization, not a one-time check
- **Analytics** — campaign performance tracking
- **AI assistance** — Anthropic-powered features in the campaign workflow
- **Team management** — multi-user access per organization

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express, pnpm monorepo |
| Database / ORM | Drizzle ORM |
| Auth | Custom auth middleware (org-scoped) |
| AI | Anthropic |

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 18+
- **pnpm** (enforced via preinstall check)
- A database configured for Drizzle ORM
- Anthropic API key for AI features

### Installation

```bash
git clone https://github.com/creova-gif/Trua-IO.git
cd Trua-IO
pnpm install
pnpm run build
```

---

## Roadmap / Status

Core routes implemented: analytics, campaigns, compliance (progress tracking), contacts, emails, org, team, templates, plus Anthropic integration. A `.env.example` should be added for onboarding.

## Contributing

This is a private, proprietary CREOVA product. External contributions are not accepted at this time.

## License

Proprietary — All Rights Reserved. See `LICENSE`.

## Credits

Built by CREOVA. Product lead: Justin Mafie.
