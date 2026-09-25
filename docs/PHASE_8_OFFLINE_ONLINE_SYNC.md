# Phase 8 — Offline / Online / Synchronization
Status: IMPLEMENTED IN SOURCE (not yet Windows/hosting tested)

Frozen requirements preserved:
- Electron Desktop and approved Web/PWA devices can continue offline and synchronize when connectivity returns.
- Mobile app remains online-only.
- A strange/shared computer must not be used for offline data entry. Offline queueing requires an authenticated, explicitly trusted device.
- PostgreSQL remains the central source of truth.
- Retry safety uses stable operation/submission identifiers and server receipts to reduce duplicate writes.

Implemented foundation:
- PWA application-shell service worker.
- Local pending-write queue and persistent device identifier.
- Trusted-device gate for offline entry.
- Automatic/manual queue flush primitives when online.
- REST sync receipt and incremental-change endpoints.
- Existing `syncId`, `submissionId`, `SyncOutboxItem`, and `SyncReceipt` schema retained.

Still required before release: conflict-policy tests per module, encrypted desktop local store, full background-sync wiring to every form, Windows sleep/power-loss tests, multi-device concurrency tests, and hosted end-to-end validation.
