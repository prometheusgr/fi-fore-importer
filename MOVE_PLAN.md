# Importer Extraction Move Plan

This map is for moving importer code from the main app into this package.

## First vertical slice

1. routes: move bank import and bank setup routes
2. services: move CSV mapping service and importer orchestration entry points
3. views: move bank import, bank setup, and bank browser views
4. public controller: move bank browser controller (or rewrite as package asset)
5. tests: move importer-focused unit/integration tests

## Completed in-repo seed work

1. Created package entrypoint and TypeScript build scaffold
2. Added transaction source adapter contract
3. Added host adapter interfaces for mapping and import orchestration
4. Added ImporterOrchestrator service that composes host-provided adapters
5. Documented explicit boundary: Tellar remains in fi-fore main app

## Next concrete move

1. Port CsvMappingService into package with repository abstraction
2. Add a host-side adapter in fi-fore that maps TransactionService methods to package TransactionImporter
3. Replace one route path in bank import flow to use ImporterOrchestrator for preview/commit
4. Add unit tests for ImporterOrchestrator (preview, commit, no-source, source-present)

## Candidate source files

- src/routes/bankImport.ts
- src/routes/banks.ts
- src/services/CsvMappingService.ts
- src/views/CsvMappingView.ts
- src/views/BankSetupView.ts
- src/views/BankBrowserView.ts
- public/bank-browser-controller.js

## Keep in main app (for now)

- src/main.ts (Electron lifecycle and IPC host)
- src/preload.ts (renderer bridge)
- Tellar integration and paid connector orchestration

## Contract boundary

The package should expose:

- importer route factory
- importer service interfaces
- transaction source adapter interface
- normalized transaction types and import result types

The host app should provide:

- persistence adapter
- account context and permission state
- optional transaction source adapter implementation (for Tellar)
