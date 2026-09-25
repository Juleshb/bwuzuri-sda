# Phase 6 — Expenses + Assets
Status: IMPLEMENTED IN SOURCE (not yet Windows/hosting tested)

Requirements freeze preserved. No new business requirement is introduced here.

## Expenses
- Church-scoped entry and listing.
- Regional Leader can view across the region.
- Church user can correct/cancel own church entries; cancellation preserves history rather than destructive deletion.
- Expense types remain configurable reference data.
- Duplicate submission protection uses submissionId.

## Assets
- Church-scoped asset register and categories.
- Regional Leader can view across the region.
- Church user can create/update/archive assets in own church.
- Revision increments on changes; archive avoids destructive deletion.

## UI/API
- React Expenses and Assets navigation now loads the real REST endpoints.
- API enforces role/scope; UI visibility is not treated as security.

## Still pending
Windows test, hosted PostgreSQL test, production migrations/seeding, polished forms, reports/PDF, offline sync and backup/restore validation.
