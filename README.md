# SYSTEM Y’INTARA YA BWUZURI — Build 0.17 TypeScript Stack Migration

Technology freeze: React + TypeScript, Electron, React PWA, Node.js + TypeScript REST API, PostgreSQL.

This package is the new-stack migration baseline created from the supplied Build 0.17 WP1.2Q-D2-H C# source. It preserves the principal domain model and approved role/scope rules in a TypeScript/PostgreSQL architecture.

## Run for a programmer
1. Install Node.js LTS, npm, PostgreSQL and Git.
2. Copy `.env.example` to `.env`, set DATABASE_URL and JWT_SECRET.
3. Run `npm install`.
4. Run `npm run db:generate` then `npm run db:migrate`.
5. Run `npm run db:deploy` then `npm run db:seed`. The seed creates the six churches that share one PostgreSQL database and prints the local usernames. The password is `SEED_PASSWORD`.
6. Run API: `npm run dev:api`.
7. Run Web/PWA: `npm run dev:web` (http://localhost:5173). Desktop and Web/PWA may work offline after a Regional Leader approves the device.
8. Run the online-only mobile client: `npm run dev:mobile` (http://localhost:5174). It uses the same REST API and refuses offline sync.
9. Electron: set `BWUZURI_DEV_URL=http://localhost:5173` then `npm run dev:desktop`.

## Important status
This is a source migration, not a claim that every old WPF screen has already been recreated pixel-for-pixel. Core schema, authentication skeleton, hierarchy scope, member entry, church-only contribution entry, Regional budget creation, scoped Sabbath School entry, PWA and Electron shells are represented. Remaining UI forms/reports, full offline local DB conflict-resolution sync, backup UI, complete expenses/assets workflows, data migration from existing SQLite, and Windows installer runtime validation remain implementation/testing work.


## Phase 4
Budget + Contributions integration implemented in source. See `docs/PHASE_4_BUDGET_INTEGRATION.md`.

## Phase 5
Ishuri ryo ku Isabato API and role-scoped roll-up are implemented in source. See `docs/PHASE_5_SABBATH_SCHOOL.md`.


## Phase 8
Offline/online synchronization foundation is implemented in source. See `docs/PHASE_8_OFFLINE_ONLINE_SYNC.md`.


## Phase 9
Web/PWA + Electron Desktop integration is implemented in source. See `docs/PHASE_9_WEB_PWA_ELECTRON_INTEGRATION.md`.

## Phase 10 — production baseline
Backup/restore, production configuration and security baseline are documented in `docs/PHASE_10_BACKUP_SECURITY_PRODUCTION.md`. Production secrets must never be committed to source control.
