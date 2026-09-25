# Phase 5 — Ishuri ryo ku Isabato
Status: IMPLEMENTED IN SOURCE (not yet Windows/hosting tested)

Frozen requirements preserved:
- Statistics are entered at Itsinda level only.
- Entry date/time is generated automatically by the server; normal users do not type it.
- Itsinda account can create only for its own Itsinda.
- Read scope follows role: Itsinda → own Itsinda; Igihande → own Igihande; Itorero → own Itorero; Regional Leader/Admin → region.
- Aggregate statistics roll up through Itsinda → Igihande → Itorero → Intara via scoped summary API.
- No new fixed statistic names were invented in this phase: payload remains schema-flexible until the frozen UI field list is wired, preventing silent requirement changes.
- Existing syncId/revision fields remain for the offline/online synchronization phase.

API:
- POST /api/sabbath-school
- GET /api/sabbath-school
- GET /api/sabbath-school/summary?from=&to=
