# Phase 9 — Web/PWA + Electron Desktop Integration
Status: IMPLEMENTED IN SOURCE (not yet Windows/hosting tested)

## Implemented
- One React/TypeScript UI is shared by browser/PWA and Electron Desktop.
- Electron loads the compiled React app and preserves context isolation + sandboxing.
- External HTTP(S) links are opened outside the desktop shell.
- Runtime detects Desktop / installed PWA / browser and online/offline state.
- Returning online triggers the existing synchronization queue flush.
- Web/PWA and Desktop continue to use the same REST API, permissions, PostgreSQL central model and Phase 8 sync layer.

## Frozen rules preserved
- No approved Build 0.17 business requirement is changed by this integration.
- Mobile remains online-only and is not implemented by this phase.
- Offline use remains subject to the approved/trusted-device rule from Phase 8.

## Still required before release
Windows build/install test, PWA install/update test, hosted API end-to-end test, offline conflict/power-loss testing, and installer signing/production configuration.
