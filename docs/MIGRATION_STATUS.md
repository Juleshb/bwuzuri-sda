# Migration status — Build 0.17 TS Stack

## Migrated architecture
- React + TypeScript UI/PWA
- Electron desktop shell
- Node.js + TypeScript REST API
- PostgreSQL Prisma schema
- JWT authentication baseline
- Role/scope enforcement baseline
- Core entities: Churches, Sections, Groups, Members, Users, Contributions, Expenses, Assets, Budgets, Sabbath School, Sync queue/receipts

## Rules represented
- Regional Leader: region-wide view/report and Budget administration.
- Church: contribution entry and church finance/member operations.
- Section/Group: scoped member enrollment; no contribution entry.
- Group: scoped Sabbath School aggregate entry with server-generated date.
- Contribution stores Section/Group-at-entry historical scope.
- Phone uniqueness and submission idempotency are database-backed baselines.

## Must still be completed before production
- Recreate all mature WPF forms and printable PDF/report layouts in React.
- Complete Expenses/Assets CRUD permissions and cancellation/change history.
- Complete Budget allocation/achievement/report UI and contribution-derived progress.
- Implement robust offline local database + outbox/inbox sync, retries, conflict policy and trusted-device rule.
- Write/import SQLite -> PostgreSQL migration with reconciliation report.
- Seed the six churches and current hierarchy/users safely.
- Automated PostgreSQL backup/restore scripts and tested restore drill.
- Security hardening: production secrets, HTTPS reverse proxy, refresh/session policy, rate limiting, audit/security logs.
- Automated tests and Windows/PWA/mobile integration tests.
- Build/sign/test Electron Windows installer.

Do not delete the supplied C# Build 0.17 source until feature/data parity has been verified.
