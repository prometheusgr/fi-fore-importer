# Standalone Importer: Data Ownership Model

## Overview

The standalone importer follows a **hybrid ownership model** where:

- **fi-fore** manages persistent data (accounts, banks, mappings) in its DuckDB database
- **Standalone importer** manages local session state (working files, preview state, history)
- **Communication** happens through the Host API (`/api/importer/*` endpoints)

---

## Data Ownership by Domain

### 1. **Accounts** — Owned by fi-fore

| Property              | Owner   | Storage                            | Importer Access                                | Notes                               |
| --------------------- | ------- | ---------------------------------- | ---------------------------------------------- | ----------------------------------- |
| Account list          | fi-fore | DuckDB                             | Read-only via `GET /api/importer/accounts`     | User creates accounts in fi-fore UI |
| Account details       | fi-fore | DuckDB                             | Read-only via `GET /api/importer/accounts/:id` | Importer displays; cannot modify    |
| Last import timestamp | fi-fore | DuckDB `accounts.last_imported_at` | Read via status endpoint                       | Updated after successful import     |

**Workflow:**

1. User creates account in fi-fore (e.g., "Checking", "Credit Card")
2. Standalone importer fetches account list via `GET /api/importer/accounts`
3. User selects account to import into
4. After import, fi-fore updates `last_imported_at`

---

### 2. **Banks** — Owned by fi-fore

| Property     | Owner   | Storage              | Importer Access          | Notes                                              |
| ------------ | ------- | -------------------- | ------------------------ | -------------------------------------------------- |
| Bank list    | fi-fore | DuckDB `banks` table | Read-only (via accounts) | Standalone importer does not manage banks          |
| Bank details | fi-fore | DuckDB               | Read-only (via accounts) | Account references its bank; importer doesn't edit |

**Workflow:**

1. Banks are defined in fi-fore (e.g., "Chase", "Wells Fargo", "AMEX")
2. Accounts reference a bank
3. Standalone importer displays account/bank info but doesn't create banks
4. To import into a new bank, user must first create account in fi-fore

---

### 3. **CSV Column Mappings** — Owned by fi-fore

| Property          | Owner   | Storage                                          | Importer Access                          | Notes                                       |
| ----------------- | ------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| Saved mappings    | fi-fore | DuckDB `csv_column_mappings` table               | Full read/write via Host API             | Mappings are per-account                    |
| Mapping data      | fi-fore | `{ account_id, mapping_name, date_column, ... }` | Accessible as `MappingConfiguration`     | Persisted in fi-fore DB                     |
| Mapping lifecycle | fi-fore | Query/insert/delete                              | `GET/POST/DELETE /api/importer/mappings` | Importer can manage but doesn't own storage |

**Workflow:**

1. Standalone importer fetches mappings for account: `GET /api/importer/mappings/:accountId`
2. If no mapping exists, user detects/creates one
3. Importer saves mapping: `POST /api/importer/mappings` → saved to fi-fore
4. Next import for same account reuses mapping
5. User can delete mapping: `DELETE /api/importer/mappings/:id`

**Host API Endpoints for Mappings:**

```
GET    /api/importer/mappings              # List all saved mappings
GET    /api/importer/mappings/:accountId   # Get mapping for specific account
POST   /api/importer/mappings              # Save new/updated mapping
DELETE /api/importer/mappings/:id          # Delete mapping
```

---

### 4. **Working Directory** — Owned by Standalone Importer _(NEW)_

| Property         | Owner      | Storage                     | Purpose                                     | Notes                                              |
| ---------------- | ---------- | --------------------------- | ------------------------------------------- | -------------------------------------------------- |
| CSV staging area | Standalone | Local filesystem            | Hold user-uploaded CSVs before import       | Enables "do-now" workflow before launching fi-fore |
| Session state    | Standalone | Local filesystem + memory   | Current preview, selected mapping, progress | Transient; cleared after commit or on exit         |
| Import history   | Standalone | Local filesystem            | Log of past imports (size, date, status)    | For user reference and debugging                   |
| Config/auth      | Standalone | Local filesystem + env vars | Host API URL, bearer token, preferences     | User sets via env or config file                   |

**Directory Structure (Default: `~/.fi-fore-importer/`):**

```
~/.fi-fore-importer/
├── csv-uploads/          # Staging area for user CSVs
│   ├── transactions-2024.csv
│   ├── statements.csv
│   └── ...
├── session/
│   ├── current-preview.json   # Active preview state (temp)
│   └── current-mapping.json   # Selected mapping (temp)
├── history/
│   ├── imports.jsonl          # Line-delimited import history
│   └── ...
├── config.json                # Host API URL, token, preferences
└── logs/
    ├── importer.log           # Runtime logs
    └── ...
```

**Why Local Storage?**

- User can prepare CSVs **before** launching fi-fore
- Session state survives app restarts (partial recovery)
- No network calls needed for local staging
- Privacy: CSVs don't live in cloud or in fi-fore until explicitly imported

---

## Host API Boundary

### What Crosses the API

**Importer → fi-fore (requests):**

- `GET /api/importer/accounts` — list all accounts
- `GET /api/importer/mappings/:accountId` — get saved mapping
- `POST /api/importer/mappings` — save mapping
- `POST /api/importer/preview` — parse CSV and show preview
- `POST /api/importer/import` — commit import to transactions

**fi-fore → Importer (responses):**

- Account/bank/mapping metadata
- Preview data (row count, samples, duplicates detected)
- Import result (success, imported count, last_imported_at)

### What Does NOT Cross the API

- Raw CSV file contents (except as POST body for preview/import)
- Working directory files (session state, history, logs)
- Browser-based interactive workflows (that stay within importer UI)

---

## Data Flow: Full Standalone Import Workflow

```
User Action                 Data Location           Importer Action
─────────────────────────────────────────────────────────────────────
1. Select CSV file      →   CSV-uploads/          Stage in working dir
2. Launch importer      →   Session (memory)       Read config (env/file)
3. Connect to fi-fore   →   Network + Health       GET /api/importer/health
4. Fetch accounts       →   fi-fore (DuckDB)       GET /api/importer/accounts
5. User picks account   →   Session (memory)       Display options
6. Detect mapping       →   Session (memory)       Auto-detect or load saved
7. Preview import       →   Session (memory)       POST /api/importer/preview
8. Review changes       →   Session (memory)       Display preview
9. Confirm import       →   Network request        POST /api/importer/import
10. Success            →   fi-fore (DuckDB)       Transactions created
                        →   Session (memory)       Update session state
11. Save mapping        →   fi-fore (DuckDB)       POST /api/importer/mappings (optional)
12. Log history         →   history/imports.jsonl  Append import record
13. Next file or exit   →   CSV-uploads/          Clean staging or prepare next
```

---

## Next Steps: Working Directory Implementation

### Phase 1: Basic Working Directory (TODO)

- [x] Design data ownership model (this document)
- [x] Create E2E parity tests (validates Host API contracts)
- [ ] Implement `WorkingDirectoryManager` class
  - Location: `src/standalone/WorkingDirectoryManager.ts`
  - Methods: `init()`, `getCsvPath()`, `saveSession()`, `loadSession()`, `getHistory()`
- [ ] Add env var support: `FI_FORE_IMPORTER_HOME` (default: `~/.fi-fore-importer`)
- [ ] Implement CSV staging: `readStaged()`, `listStaged()`, `moveToDone()`

### Phase 2: Session Persistence (TODO)

- [ ] Save/restore preview state across restarts
- [ ] Persist selected mapping ID to avoid re-detection
- [ ] Track import history (size, date, status, account)

### Phase 3: CLI & Runtime Shell (TODO)

- [ ] Build interactive REPL for standalone importer
- [ ] Commands: `list`, `import`, `map`, `history`, `config`
- [ ] Show import progress and status

### Phase 4: Integration Tests (TODO)

- [ ] E2E test with real fi-fore instance (if Host API running)
- [ ] Verify working directory creation, CSV staging, history logging
- [ ] Test session recovery (import crashes, manual restart)

---

## Configuration

### Environment Variables

```bash
# Host API location and auth
HOST_API_URL=http://localhost:3000
HOST_API_TOKEN=optional-bearer-token

# Working directory
FI_FORE_IMPORTER_HOME=~/.fi-fore-importer
```

### Config File (Optional)

```json
{
  "hostApiUrl": "http://localhost:3000",
  "hostApiToken": "optional-bearer-token",
  "workingDir": "~/.fi-fore-importer",
  "autoDetectMappings": true
}
```

---

## Security & Privacy

1. **CSV files are never sent to cloud** — only staged locally until imported
2. **Mappings are encrypted in transit** — sent via HTTPS to localhost
3. **Bearer token is optional** — for dev/local use; can add in production
4. **Working directory is local** — no cloud sync
5. **Import history is local** — logs stay on user's machine

---

## Summary: Data Ownership Matrix

| Data           | Owner    | Storage           | Importer Reads  | Importer Writes |
| -------------- | -------- | ----------------- | --------------- | --------------- |
| Accounts       | fi-fore  | DuckDB            | ✓               | ✗               |
| Banks          | fi-fore  | DuckDB            | ✓ (via account) | ✗               |
| Mappings       | fi-fore  | DuckDB            | ✓               | ✓ (via API)     |
| CSV staging    | Importer | Local FS          | ✓               | ✓               |
| Session state  | Importer | Local FS + Memory | ✓               | ✓               |
| Import history | Importer | Local FS          | ✓               | ✓               |
| Transactions   | fi-fore  | DuckDB            | ✗               | ✓ (via import)  |

---

## References

- **Host API**: `src/routes/importerApi.ts` (fi-fore)
- **HostApiClient**: `src/clients/HostApiClient.ts` (importer)
- **E2E Tests**: `src/__tests__/e2e-parity.test.ts` (importer)
- **Contracts**: `src/contracts/ImporterHostAdapters.ts` (importer)
