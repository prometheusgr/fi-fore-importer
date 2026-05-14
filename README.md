# fi-fore-importer (seed)

This folder is a seed for extracting the importer into its own repository.

## Scope

Included:

- Bank browser driven statement download/import flow
- CSV mapping and normalization flow
- Import preview and commit flow
- Import-specific tests and docs

Excluded:

- Tellar integration (stays in the main fi-fore app)
- Main app billing or paid API orchestration

## Design rule

The importer package is provider-agnostic. The host app can inject transaction sources through an adapter contract.

## Next actions

1. Port importer-owned files listed in MOVE_PLAN.md.
2. Replace direct ServiceContainer usage with explicit constructor/factory dependencies.
3. Wire fi-fore host app to consume this package through a thin adapter.
4. Move this folder into its own GitHub repository when the first vertical slice passes tests.

For the exact split workflow, see REPO_SPLIT_CHECKLIST.md.

Quick command from fi-fore root:

```powershell
./scripts/export-importer-seed.ps1 -DestinationPath C:\Users\Beat\source\fi-fore-importer
```

## Current status

This seed now contains the first adapter boundary slice:

- TransactionSourceAdapter contract
- Host adapter contracts for mapping and import preview/commit
- ImporterOrchestrator service that composes injected adapters

This lets the main app keep Tellar integration while this package remains Tellar-agnostic.

## Minimal usage sketch

```ts
import { ImporterOrchestrator } from "@fi-fore/importer";

const orchestrator = new ImporterOrchestrator({
  mappingEngine,
  transactionImporter,
  transactionSourceAdapter, // optional
});
```
