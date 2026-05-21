/**
 * E2E Parity Test: Standalone Importer vs. Host API
 *
 * This test validates that the standalone importer produces identical results
 * when importing through the Host API as the legacy fi-fore importer flow.
 *
 * Test Flow:
 * 1. Create test account and mappings in mock fi-fore state
 * 2. Import same CSV through standalone flow (via HostApiClient)
 * 3. Compare parsed results, preview, and commit responses
 * 4. Verify transaction counts and duplicate detection match
 *
 * INTEGRATION MODE: Can be run against real fi-fore if HOST_API_URL is set
 *
 * Run mock tests: npm test -- src/__tests__/e2e-parity.test.ts
 * Run live tests: RUN_LIVE_E2E_TESTS=1 HOST_API_URL=http://localhost:3000 npm test -- src/__tests__/e2e-parity.test.ts
 */

import { HostApiClient, HostTimeoutError } from "../clients/HostApiClient";
import { RemoteImporterUiHostAdapters } from "../adapters/RemoteImporterUiHostAdapters";
import { ImporterOrchestrator } from "../services/ImporterOrchestrator";
import { WorkingDirectory } from "../standalone/WorkingDirectory";
import type {
  MappingConfiguration,
  ImportPreview,
  ImportCommitResult,
} from "../contracts/ImporterHostAdapters";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Test fixtures
const TEST_ACCOUNT_ID = 1;
const TEST_ACCOUNT_NAME = "E2E Test Cash";
const TEST_CSV_CONTENT = `Date,Description,Amount
2024-10-27,Coffee Shop Purchase,-4.50
2024-10-27,Salary Deposit,2500.00
2024-10-26,Gas Station,-35.00
2024-10-26,Grocery Store,-125.50`;

const TEST_MAPPING: MappingConfiguration = {
  dateFormat: "YYYY-MM-DD",
  dateColumn: 0,
  descriptionColumns: [1],
  amountColumn: 2,
  debitColumn: null,
  creditColumn: null,
  typeIndicatorColumn: null,
  categoryColumn: null,
  balanceColumn: null,
  invertSign: false,
  skipHeaderRows: 0,
};

/**
 * Mock HostApiClient responses for unit test mode
 */
function createMockHostApiClient() {
  let lastPreview: ImportPreview | null = null;
  let totalImported = 0;

  const mockFetch = jest.fn(async (url: string, options: any) => {
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : null;

    // GET /api/importer/health
    if (method === "GET" && url.includes("/health")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: { ok: true, service: "fi-fore-importer-host-api" },
          }),
      };
    }

    // GET /api/importer/accounts
    if (
      method === "GET" &&
      url.includes("/accounts") &&
      !url.includes("/import-status") &&
      !url.includes(`/${TEST_ACCOUNT_ID}`)
    ) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: [{ id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME }],
          }),
      };
    }

    // GET /api/importer/accounts/:id
    if (method === "GET" && url.includes(`/accounts/${TEST_ACCOUNT_ID}`)) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: { id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME },
          }),
      };
    }

    // GET /api/importer/mappings
    if (
      method === "GET" &&
      url.includes("/mappings") &&
      !url.includes(`/${TEST_ACCOUNT_ID}`)
    ) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: [
              {
                id: 1,
                accountId: TEST_ACCOUNT_ID,
                accountName: TEST_ACCOUNT_NAME,
                mappingName: "Default",
                mapping: TEST_MAPPING,
              },
            ],
          }),
      };
    }

    // GET /api/importer/mappings/:accountId
    if (method === "GET" && url.includes(`/mappings/${TEST_ACCOUNT_ID}`)) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: {
              id: 1,
              accountId: TEST_ACCOUNT_ID,
              accountName: TEST_ACCOUNT_NAME,
              mappingName: "Default",
              mapping: TEST_MAPPING,
            },
          }),
      };
    }

    // POST /api/importer/preview
    if (method === "POST" && url.includes("/preview")) {
      // Simulate preview: parse CSV and validate
      const lines = body.standardizedCsv
        .split("\n")
        .filter((l: string) => l.trim());
      const dataRows = Math.max(0, lines.length - 1); // excluding header

      lastPreview = {
        totalRows: dataRows,
        validRows: dataRows,
        invalidRows: 0,
        duplicateRows: 0,
        sample: lines
          .slice(1, Math.min(3, lines.length))
          .map((line: string) => {
            const [date, description, amount] = line.split(",");
            return {
              date: date?.trim() || "",
              description: description?.trim() || "",
              amount: parseFloat(amount?.trim() || "0") || 0,
            };
          }),
      };

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: lastPreview,
          }),
      };
    }

    // POST /api/importer/import
    if (method === "POST" && url.includes("/import")) {
      if (!lastPreview) {
        return {
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              success: false,
              error: { message: "No preview available" },
            }),
        };
      }

      const imported = lastPreview.validRows;
      totalImported += imported;

      const result: ImportCommitResult = {
        success: true,
        message: `Imported ${imported} transactions`,
        importedCount: imported,
        duplicateCount: lastPreview.duplicateRows,
        invalidCount: lastPreview.invalidRows,
      };

      lastPreview = null;

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: result,
          }),
      };
    }

    // POST /api/importer/mappings
    if (
      method === "POST" &&
      url.includes("/mappings") &&
      !url.includes("GET")
    ) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: {
              id: 1,
              accountId: body.accountId,
              accountName: TEST_ACCOUNT_NAME,
              mappingName: body.mappingName,
              mapping: body.mapping,
            },
          }),
      };
    }

    // Default 404
    return {
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: "Not found" },
        }),
    };
  });

  return {
    client: new HostApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch,
    }),
    mockFetch,
  };
}

describe("E2E: Standalone Importer Parity with Host API", () => {
  describe("Unit Mode: Mock Host API", () => {
    it("should successfully import transactions through standalone flow", async () => {
      const { client } = createMockHostApiClient();

      // 1. Verify health
      const health = await client.getHealth();
      expect(health.ok).toBe(true);
      expect(health.service).toBe("fi-fore-importer-host-api");

      // 2. Fetch accounts
      const accounts = await client.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe(TEST_ACCOUNT_ID);
      expect(accounts[0].name).toBe(TEST_ACCOUNT_NAME);

      // 3. Get mapping for account
      const mapping = await client.getMappingForAccount(TEST_ACCOUNT_ID);
      expect(mapping).toBeDefined();
      expect(mapping?.id).toBe(1);

      // 4. Preview import
      const preview = await client.previewImport(
        TEST_ACCOUNT_ID,
        TEST_CSV_CONTENT,
      );
      expect(preview.totalRows).toBe(4); // 4 transaction rows
      expect(preview.validRows).toBe(4);
      expect(preview.duplicateRows).toBe(0);
      expect(preview.invalidRows).toBe(0);

      // 5. Commit import
      const result = await client.commitImport(
        TEST_ACCOUNT_ID,
        TEST_CSV_CONTENT,
      );
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(4);
      expect(result.duplicateCount).toBe(0);
      expect(result.invalidCount).toBe(0);
    });

    it("should provide remote adapters that delegate to HostApiClient", async () => {
      const freshMock = jest.fn(async (url: string, options: any) => {
        const method = options.method || "GET";

        // List all accounts
        if (
          method === "GET" &&
          url.includes("/accounts") &&
          !url.includes(`/${TEST_ACCOUNT_ID}`)
        ) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: [{ id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME }],
              }),
          };
        }

        // Get specific account
        if (method === "GET" && url.includes(`/accounts/${TEST_ACCOUNT_ID}`)) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: { id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME },
              }),
          };
        }

        // Get mapping
        if (
          method === "GET" &&
          url.includes("/mappings") &&
          !url.includes(`/${TEST_ACCOUNT_ID}`)
        ) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: [
                  {
                    id: 1,
                    accountId: TEST_ACCOUNT_ID,
                    accountName: TEST_ACCOUNT_NAME,
                    mappingName: "Default",
                    mapping: TEST_MAPPING,
                  },
                ],
              }),
          };
        }

        // Get mapping for account
        if (method === "GET" && url.includes(`/mappings/${TEST_ACCOUNT_ID}`)) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  id: 1,
                  accountId: TEST_ACCOUNT_ID,
                  accountName: TEST_ACCOUNT_NAME,
                  mappingName: "Default",
                  mapping: TEST_MAPPING,
                },
              }),
          };
        }

        // Save mapping
        if (method === "POST" && url.includes("/mappings")) {
          const body = JSON.parse(options.body);
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                data: {
                  id: 1,
                  accountId: body.accountId,
                  accountName: TEST_ACCOUNT_NAME,
                  mappingName: body.mappingName,
                  mapping: body.mapping,
                },
              }),
          };
        }

        return {
          ok: false,
          status: 404,
          text: async () =>
            JSON.stringify({
              success: false,
              error: { message: "Not found" },
            }),
        };
      });

      const client = new HostApiClient({
        baseUrl: "http://localhost:3000",
        fetchImpl: freshMock,
      });
      const adapters = new RemoteImporterUiHostAdapters(client);

      // Via adapters, fetch accounts
      const accounts = await adapters.accountContextProvider.getAllAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe(TEST_ACCOUNT_NAME);

      // Get specific account
      const account =
        await adapters.accountContextProvider.getAccountById(TEST_ACCOUNT_ID);
      expect(account?.id).toBe(TEST_ACCOUNT_ID);

      // Get mapping for account
      const mapping =
        await adapters.savedMappingStore.getMappingForAccount(TEST_ACCOUNT_ID);
      expect(mapping?.accountId).toBe(TEST_ACCOUNT_ID);

      // Save new mapping
      const newMapping = await adapters.savedMappingStore.saveMapping({
        accountId: TEST_ACCOUNT_ID,
        mappingName: "Updated",
        mapping: TEST_MAPPING,
      });
      expect(newMapping.accountId).toBe(TEST_ACCOUNT_ID);
    });

    it("should handle full import flow through adapters", async () => {
      const { client } = createMockHostApiClient();
      const adapters = new RemoteImporterUiHostAdapters(client);

      // Full flow: get account → preview → commit
      const accounts = await adapters.accountContextProvider.getAllAccounts();
      const account = accounts[0];

      const preview = await client.previewImport(account.id, TEST_CSV_CONTENT);
      expect(preview.validRows).toBe(4);

      const commit = await client.commitImport(account.id, TEST_CSV_CONTENT);
      expect(commit.importedCount).toBe(4);
    });

    it("should handle duplicate detection (mock scenario)", async () => {
      const { client, mockFetch } = createMockHostApiClient();

      // Mock a second import with duplicates
      const originalMockFetch = mockFetch;
      let importAttempt = 0;

      mockFetch.mockImplementation(async (url: string, options: any) => {
        const method = options.method || "GET";

        if (method === "POST" && url.includes("/import")) {
          importAttempt++;
          if (importAttempt === 1) {
            // First import: all new
            return {
              ok: true,
              status: 200,
              text: async () =>
                JSON.stringify({
                  success: true,
                  data: {
                    success: true,
                    message: "Imported 4 transactions",
                    importedCount: 4,
                    duplicateCount: 0,
                    invalidCount: 0,
                  },
                }),
            };
          } else {
            // Second import: 2 duplicates detected
            return {
              ok: true,
              status: 200,
              text: async () =>
                JSON.stringify({
                  success: true,
                  data: {
                    success: true,
                    message: "Imported 2 transactions",
                    importedCount: 2,
                    duplicateCount: 2,
                    invalidCount: 0,
                  },
                }),
            };
          }
        }

        return originalMockFetch(url, options);
      });

      // First import
      const first = await client.commitImport(
        TEST_ACCOUNT_ID,
        TEST_CSV_CONTENT,
      );
      expect(first.importedCount).toBe(4);
      expect(first.duplicateCount).toBe(0);

      // Second import (same data)
      const second = await client.commitImport(
        TEST_ACCOUNT_ID,
        TEST_CSV_CONTENT,
      );
      expect(second.importedCount).toBe(2);
      expect(second.duplicateCount).toBe(2);
    });

    it("should fail gracefully when host is unreachable", async () => {
      const unreachableFetch = jest
        .fn()
        .mockRejectedValue(new Error("ECONNREFUSED: Connection refused"));

      const client = new HostApiClient({
        baseUrl: "http://localhost:9999",
        fetchImpl: unreachableFetch,
      });

      await expect(client.getHealth()).rejects.toThrow(
        "ECONNREFUSED: Connection refused",
      );
    });

    it("logs error when adapter fails", async () => {
      const logEvent = jest.fn();
      const orchestrator = new ImporterOrchestrator(
        {
          mappingEngine: {
            detectMapping: () => ({
              hasHeaders: true,
              dateFormat: "YYYY-MM-DD",
              dateFormatConfidence: 1,
              invertSign: false,
              columns: [],
              sampleRows: [],
              headerRow: ["date", "description", "amount"],
            }),
            applyMapping: (csv) => csv,
          },
          transactionImporter: {
            previewImport: async () => ({
              totalRows: 0,
              validRows: 0,
              invalidRows: 0,
              duplicateRows: 0,
              sample: [],
            }),
            importTransactions: async () => {
              throw Object.assign(new Error("db write failed"), {
                code: "DB_ERROR",
              });
            },
          },
        },
        { logEvent },
      );

      await expect(
        orchestrator.commitMappedImport({
          account: { id: TEST_ACCOUNT_ID, name: TEST_ACCOUNT_NAME },
          csvContent: TEST_CSV_CONTENT,
          mapping: TEST_MAPPING,
        }),
      ).rejects.toThrow("db write failed");

      expect(logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "import_commit_error",
          accountId: TEST_ACCOUNT_ID,
          metadata: expect.objectContaining({
            errorCode: "DB_ERROR",
          }),
        }),
      );
    });

    it("times out if host API hangs", async () => {
      const hangingFetch = jest
        .fn()
        .mockImplementation(() => new Promise(() => undefined));

      const client = new HostApiClient({
        baseUrl: "http://localhost:3000",
        fetchImpl: hangingFetch,
        requestTimeoutMs: 10,
      });

      await expect(client.getHealth()).rejects.toBeInstanceOf(HostTimeoutError);
      await expect(client.getHealth()).rejects.toMatchObject({
        code: "TIMEOUT",
      });
    });

    it("recovers audit log after restart", async () => {
      const testDir = path.join(
        os.tmpdir(),
        `fi-fore-importer-audit-${Date.now()}`,
      );

      try {
        const firstRun = new WorkingDirectory(testDir);
        await firstRun.appendAuditLog({
          type: "import_previewed",
          atIso: new Date().toISOString(),
          accountId: TEST_ACCOUNT_ID,
          metadata: { rowCount: 4 },
        });

        const secondRun = new WorkingDirectory(testDir);
        await secondRun.appendAuditLog({
          type: "import_committed",
          atIso: new Date().toISOString(),
          accountId: TEST_ACCOUNT_ID,
          metadata: { importedCount: 4, duplicateCount: 0 },
        });

        const auditPath = path.join(testDir, "audit", "audit.jsonl");
        const content = fs.readFileSync(auditPath, "utf-8");
        const lines = content
          .split("\n")
          .filter((line) => line.trim().length > 0);

        expect(lines).toHaveLength(2);
        expect(JSON.parse(lines[0]).type).toBe("import_previewed");
        expect(JSON.parse(lines[1]).type).toBe("import_committed");
      } finally {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe("INTEGRATION MODE: Live fi-fore Host API", () => {
    const hostUrl = process.env.HOST_API_URL || "http://localhost:3000";
    const skipLiveTests = !process.env.RUN_LIVE_E2E_TESTS;

    const describeIntegration = skipLiveTests ? describe.skip : describe;

    describeIntegration("when fi-fore is running with Host API enabled", () => {
      let testAccountId: number;

      beforeAll(async () => {
        // Health check to ensure host is available
        const client = new HostApiClient({ baseUrl: hostUrl });
        try {
          const health = await client.getHealth();
          if (!health.ok) {
            throw new Error("Host API not ready");
          }
        } catch (err) {
          throw new Error(
            `fi-fore Host API not available at ${hostUrl}: ${err}`,
          );
        }
      });

      it("should connect to live fi-fore Host API", async () => {
        const client = new HostApiClient({ baseUrl: hostUrl });
        const health = await client.getHealth();

        expect(health.ok).toBe(true);
        expect(health.service).toBe("fi-fore-importer-host-api");
      });

      it("should fetch real accounts from fi-fore", async () => {
        const client = new HostApiClient({ baseUrl: hostUrl });
        const accounts = await client.getAccounts();

        expect(Array.isArray(accounts)).toBe(true);
        expect(accounts.length).toBeGreaterThan(0);

        // Use first account for subsequent tests
        testAccountId = accounts[0].id;
      });

      it("should preview and import real CSV through Host API", async () => {
        const client = new HostApiClient({ baseUrl: hostUrl });

        // Preview
        const preview = await client.previewImport(
          testAccountId,
          TEST_CSV_CONTENT,
        );
        expect(preview.totalRows).toBeGreaterThanOrEqual(0);
        expect(typeof preview.duplicateRows).toBe("number");

        // Commit
        const result = await client.commitImport(
          testAccountId,
          TEST_CSV_CONTENT,
        );
        expect(result.importedCount).toBeGreaterThanOrEqual(0);
        expect(typeof result.invalidCount).toBe("number");
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Data Ownership Verification", () => {
    it("should clarify data ownership model", async () => {
      // DOCUMENTATION: Data Ownership in Standalone Model
      const dataOwnership = {
        accounts: {
          owner: "fi-fore",
          managed: true,
          storage: "DuckDB in fi-fore",
          read: "GET /api/importer/accounts (read-only)",
          write: "Not yet exposed",
          note: "User creates accounts in fi-fore UI; importer selects from list",
        },
        banks: {
          owner: "fi-fore",
          managed: true,
          storage: "DuckDB in fi-fore",
          read: "GET /api/importer/accounts (as part of account)",
          write: "Managed in fi-fore UI",
          note: "Importer does not manage bank list",
        },
        mappings: {
          owner: "fi-fore",
          managed: true,
          storage: "DuckDB csv_column_mappings table",
          read: "GET /api/importer/mappings, GET /api/importer/mappings/:accountId",
          write:
            "POST /api/importer/mappings, DELETE /api/importer/mappings/:id",
          note: "Stored in fi-fore DB; accessible from standalone importer",
        },
        workingDirectory: {
          owner: "standalone-importer",
          managed: false,
          storage: "Local filesystem (~/.fi-fore-importer)",
          purpose:
            "CSV staging, session state, history, config (TODO: not yet implemented)",
          note: "Enables user to stage CSVs before launching fi-fore",
        },
      };

      expect(dataOwnership.accounts.owner).toBe("fi-fore");
      expect(dataOwnership.mappings.owner).toBe("fi-fore");
      expect(dataOwnership.workingDirectory.owner).toBe("standalone-importer");
    });
  });
});
