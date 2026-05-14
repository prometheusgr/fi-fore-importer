# Repo Split Checklist

Use this checklist when promoting this seed into a standalone GitHub repository.

## 1. Create standalone repo copy

Run from fi-fore root:

```powershell
./scripts/export-importer-seed.ps1 -DestinationPath C:\Users\Beat\source\fi-fore-importer
```

Optional one-shot git init and push:

```powershell
./scripts/export-importer-seed.ps1 \
  -DestinationPath C:\Users\Beat\source\fi-fore-importer \
  -InitGit \
  -GitHubRepoUrl https://github.com/<owner>/fi-fore-importer.git
```

## 2. Harden standalone repo metadata

1. Set package privacy/publication flags as desired.
2. Add LICENSE.
3. Add SECURITY.md.
4. Add PRIVACY.md.
5. Add CONTRIBUTING.md.

## 3. Keep boundary intact

1. Keep Tellar and paid connector logic in fi-fore main app.
2. Keep importer package provider-agnostic.
3. Use host adapter boundary for any external source injection.

## 4. First post-split implementation

1. Port CsvMappingService with repository abstraction.
2. Add host adapters in fi-fore that map existing services to importer contracts.
3. Replace one bank import route path to consume orchestrator contracts.
4. Add unit tests for orchestrator and adapter mappings.

## 5. Verification before announcing

1. TypeScript build passes.
2. Import preview and commit behavior remains parity with baseline.
3. Signed artifacts and checksum docs are ready.
4. Trust docs are published.
