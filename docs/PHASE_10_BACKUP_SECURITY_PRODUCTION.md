# Phase 10 — Backup / Restore + Security + Production Configuration
Status: IMPLEMENTED IN SOURCE; NOT YET WINDOWS/HOSTING TESTED.

Requirements Freeze remains unchanged.

Implemented:
- Production startup refuses placeholder/missing DATABASE_URL or JWT_SECRET; production JWT secret must be >=32 characters.
- CORS allow-list via CORS_ORIGINS; basic HTTP security headers; Express fingerprint disabled.
- PostgreSQL custom-format backup script with SHA-256 sidecar and configurable retention.
- Restore script verifies checksum when present and performs explicit pg_restore.
- Nginx HTTPS/reverse-proxy template and systemd API service template.
- Daily-backup cron example. Exact deployment time can be adjusted by the provider; requirement is automatic daily backup.

Production validation still required:
1. Install dependencies and run typecheck/build.
2. Apply Prisma migrations to a staging PostgreSQL database.
3. Test backup -> destructive staging change -> restore -> data reconciliation.
4. Configure real domain/TLS and strong secrets outside source control.
5. Verify role/scope authorization, sync conflicts, offline restrictions and power-loss recovery.
6. Verify Windows Electron build/installer and hosted Web/PWA end-to-end.
7. Store at least one backup outside the primary server and test recovery from it.

No licensing/activation-key system is included.
