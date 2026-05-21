import { ImporterOrchestrator } from "./ImporterOrchestrator";
import type {
  AccountContext,
  ImporterHostAdapters,
  MappingConfiguration,
} from "../contracts/ImporterHostAdapters";

describe("ImporterOrchestrator audit logging", () => {
  const account: AccountContext = { id: 1, name: "Checking" };
  const mapping: MappingConfiguration = {
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

  const csv = "date,description,amount\n2026-01-01,Coffee,-3.20";

  function createAdapters(): ImporterHostAdapters {
    return {
      mappingEngine: {
        detectMapping() {
          return {
            hasHeaders: true,
            dateFormat: "YYYY-MM-DD",
            dateFormatConfidence: 1,
            invertSign: false,
            columns: [],
            sampleRows: [],
            headerRow: ["date", "description", "amount"],
          };
        },
        applyMapping(inputCsv: string) {
          return inputCsv;
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
    };
  }

  it("logs success events", async () => {
    const logEvent = jest.fn();
    const orchestrator = new ImporterOrchestrator(createAdapters(), {
      logEvent,
    });

    orchestrator.detectMapping(account, csv);
    await orchestrator.previewMappedImport({
      account,
      csvContent: csv,
      mapping,
    });
    await orchestrator.commitMappedImport({
      account,
      csvContent: csv,
      mapping,
    });

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mapping_detected",
        accountId: account.id,
      }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "import_previewed",
        accountId: account.id,
      }),
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "import_committed",
        accountId: account.id,
        metadata: expect.objectContaining({
          importedCount: 1,
        }),
      }),
    );
  });

  it("logs error events when importer fails", async () => {
    const adapters = createAdapters();
    const previewError = Object.assign(new Error("preview failed"), {
      code: "VALIDATION_ERROR",
    });
    adapters.transactionImporter.previewImport = async () => {
      throw previewError;
    };

    const logEvent = jest.fn();
    const orchestrator = new ImporterOrchestrator(adapters, { logEvent });

    await expect(
      orchestrator.previewMappedImport({
        account,
        csvContent: csv,
        mapping,
      }),
    ).rejects.toThrow("preview failed");

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "import_preview_error",
        accountId: account.id,
        metadata: expect.objectContaining({
          errorCode: "VALIDATION_ERROR",
        }),
      }),
    );
  });

  it("keeps detectMapping successful when audit logger rejects", async () => {
    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(createAdapters(), {
      logEvent,
    });

    const output = orchestrator.detectMapping(account, csv);
    await Promise.resolve();

    expect(output.account.id).toBe(account.id);
    expect(output.detection.hasHeaders).toBe(true);
  });

  it("keeps previewMappedImport successful when audit logger rejects", async () => {
    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(createAdapters(), {
      logEvent,
    });

    await expect(
      orchestrator.previewMappedImport({
        account,
        csvContent: csv,
        mapping,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        preview: expect.objectContaining({ totalRows: 1 }),
      }),
    );
  });

  it("preserves preview business error when both preview and audit logging fail", async () => {
    const adapters = createAdapters();
    adapters.transactionImporter.previewImport = async () => {
      throw new Error("preview failed");
    };

    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(adapters, { logEvent });

    await expect(
      orchestrator.previewMappedImport({
        account,
        csvContent: csv,
        mapping,
      }),
    ).rejects.toThrow("preview failed");
  });

  it("keeps commitMappedImport successful when audit logger rejects", async () => {
    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(createAdapters(), {
      logEvent,
    });

    await expect(
      orchestrator.commitMappedImport({
        account,
        csvContent: csv,
        mapping,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ importedCount: 1 }),
      }),
    );
  });

  it("preserves commit business error when both commit and audit logging fail", async () => {
    const adapters = createAdapters();
    adapters.transactionImporter.importTransactions = async () => {
      throw new Error("commit failed");
    };

    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(adapters, { logEvent });

    await expect(
      orchestrator.commitMappedImport({
        account,
        csvContent: csv,
        mapping,
      }),
    ).rejects.toThrow("commit failed");
  });

  it("keeps pullFromHostSource successful when audit logger rejects", async () => {
    const adapters = createAdapters();
    adapters.transactionSourceAdapter = {
      pullTransactions: async () => ({
        sourceName: "mock-source",
        transactions: [
          {
            bookedAt: "2026-01-01",
            description: "Coffee",
            amount: -3.2,
          },
        ],
      }),
    };

    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(adapters, { logEvent });

    await expect(
      orchestrator.pullFromHostSource({ accountId: account.id }),
    ).resolves.toEqual(
      expect.objectContaining({
        sourceName: "mock-source",
      }),
    );
  });

  it("preserves pull business error when both pull and audit logging fail", async () => {
    const adapters = createAdapters();
    adapters.transactionSourceAdapter = {
      pullTransactions: async () => {
        throw new Error("pull failed");
      },
    };

    const logEvent = jest.fn().mockRejectedValue(new Error("audit failed"));
    const orchestrator = new ImporterOrchestrator(adapters, { logEvent });

    await expect(
      orchestrator.pullFromHostSource({ accountId: account.id }),
    ).rejects.toThrow("pull failed");
  });
});
