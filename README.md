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

## Architecture: CLI-First Design

The standalone importer is designed for CLI-first development:

- **WorkingDirectory**: CSV staging and local file operations
- **ImportHistory**: Import record persistence
- **RuntimeConfig**: Configuration management
- **HostApiClient**: Remote API communication
- **ImporterOrchestrator**: Business logic (mapping + import)

Browser UI support is deferred until Phase 3+. At that time, extend `ImporterHostAdapters` with:

- `BrowserSessionBridge` for session management
- `ImporterAuditLogger` for audit trails
- Browser-specific persistence adapters

See `src/standalone/examples/cli-usage.ts` for a minimal CLI setup example.

## Development & Testing

### TypeScript Configuration Strategy

This project uses a **layered TypeScript configuration** to keep production builds strict while enabling rich type support for tests:

- **tsconfig.json** (production): Strict mode, excludes test files, emits to `dist/`
- **tsconfig.test.json** (tests): Extends production config, adds Jest globals (`describe`, `it`, `expect`), no emit

This separation ensures:

- Production builds include only shipping code and declarations
- Test files have full type information for Jest globals
- The editor (tsserver) recognizes Jest types without polluting production build

### Scripts for Development & CI

```bash
# Production code only (strict, no test globals)
npm run typecheck        # Type-check production code (tsconfig.json)
npm run build            # Compile production code to dist/

# Test code (with Jest types)
npm run test:typecheck   # Type-check test files (tsconfig.test.json)
npm test                 # Run tests via jest
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Both (useful for CI)
npm run typecheck:all    # Run both production and test type-checking
```

### Recommended Local Workflow

Before committing:

```bash
npm run typecheck:all    # Catch type errors early
npm test                 # Ensure tests pass
npm run build            # Verify production build succeeds
```

### Troubleshooting

**Q: My editor shows "Cannot find name 'describe'" in test files.**  
**A:** Ensure your editor uses the workspace TypeScript version (not a global install). In VS Code, use the "TypeScript: Select TypeScript Version" command and choose "Use Workspace Version". The tsconfig.test.json should be picked up automatically for test files.

**Q: Jest fails with "Cannot find module 'jest'"**  
**A:** Run `npm install` to ensure all devDependencies are installed.

**Q: Types seem out of sync after updating dependencies**  
**A:** Run `npm run typecheck:all` to verify both production and test type-checking. If issues persist, run `npm install` again to sync node_modules.

### ts-jest Configuration

Jest is configured via `jest.config.js` to use the dedicated `tsconfig.test.json`. This ensures:

- ts-jest has access to Jest types for proper transformation
- Test files compile with the correct type context
- No test-specific types leak into production code
