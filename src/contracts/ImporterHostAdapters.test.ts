import {
  type AccountContext,
  type CommitPersistenceInput,
  type ImporterHostAdapters,
  type ImporterUiHostAdapters,
  type PreviewPersistenceInput,
  ImporterOrchestrator,
} from "../index";

describe("Importer host contracts", () => {
  function buildUiHostAdapters(): ImporterUiHostAdapters {
    return {
      accountContextProvider: {
        async getAllAccounts() {
          return [{ id: 1, name: "Checking" }];
        },
        async getAccountById(accountId: number) {
          if (accountId === 1) {
            return { id: 1, name: "Checking" };
          }

          return null;
        },
        async getAccountImportStatuses() {
          return [
            {
              accountId: 1,
              accountName: "Checking",
              freshnessLabel: "Fresh",
              freshnessClass: "fresh",
            },
          ];
        },
      },
      savedMappingStore: {
        async getAllMappings() {
          return [];
        },
        async getMappingForAccount() {
          return null;
        },
        async saveMapping(input) {
          return {
            id: 1,
            accountId: input.accountId,
            accountName: "Checking",
            mappingName: input.mappingName,
            mapping: input.mapping,
          };
        },
        async deleteMapping() {
          return;
        },
      },
      importExecutionStore: {
        async savePreview(_input: PreviewPersistenceInput) {
          return;
        },
        async saveCommit(_input: CommitPersistenceInput) {
          return;
        },
        async touchImported() {
          return;
        },
      },
      browserSessionBridge: {
        async createSession() {
          return {
            sessionId: "session-1",
            createdAtIso: "2026-01-01T00:00:00.000Z",
          };
        },
        async validateSession() {
          return true;
        },
        async closeSession() {
          return;
        },
      },
      auditLogger: {
        logEvent() {
          return;
        },
      },
    };
  }

  function buildHostAdapters(): ImporterHostAdapters {
    return {
      mappingEngine: {
        detectMapping(csvContent: string) {
          return {
            hasHeaders: true,
            dateFormat: "YYYY-MM-DD",
            dateFormatConfidence: 0.8,
            invertSign: false,
            columns: [],
            sampleRows: [[csvContent]],
            headerRow: null,
          };
        },
        applyMapping(csvContent: string) {
          return csvContent;
        },
      },
      transactionImporter: {
        async previewImport() {
          return {
            totalRows: 1,
            validRows: 1,
            invalidRows: 0,
            duplicateRows: 0,
            sample: [],
          };
        },
        async importTransactions() {
          return {
            success: true,
            message: "ok",
            importedCount: 1,
            duplicateCount: 0,
            invalidCount: 0,
          };
        },
      },
      uiHostAdapters: buildUiHostAdapters(),
    };
  }

  it("supports additive uiHostAdapters without impacting orchestrator behavior", () => {
    const orchestrator = new ImporterOrchestrator(buildHostAdapters());
    const account: AccountContext = { id: 1, name: "Checking" };

    const output = orchestrator.detectMapping(account, "date,amount");

    expect(output.account).toEqual(account);
    expect(output.detection.hasHeaders).toBe(true);
  });
});
