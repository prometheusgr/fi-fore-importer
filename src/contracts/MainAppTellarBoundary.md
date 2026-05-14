# Main App Tellar Boundary

Tellar is intentionally out of scope for this package.

## Rule

- This package stays provider-agnostic.
- The host app may pass transactions into importer flows through TransactionSourceAdapter.
- Tellar API clients and paid connector logic remain in the fi-fore main app.

## Why

- Keep open-source importer trust story simple and auditable.
- Isolate API credentials and paid concerns to host app.
- Allow fallback to manual/browser CSV import when host source is unavailable.
