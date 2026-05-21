import { RemoteImporterUiHostAdapters } from "./RemoteImporterUiHostAdapters";

describe("RemoteImporterUiHostAdapters", () => {
  it("delegates account and mapping methods to HostApiClient", async () => {
    const client = {
      getAccounts: jest.fn().mockResolvedValue([{ id: 1, name: "Cash" }]),
      getAccountById: jest.fn().mockResolvedValue({ id: 1, name: "Cash" }),
      getAccountImportStatuses: jest.fn().mockResolvedValue([]),
      getAllMappings: jest.fn().mockResolvedValue([]),
      getMappingForAccount: jest.fn().mockResolvedValue(null),
      saveMapping: jest.fn().mockResolvedValue({ id: 10 }),
      deleteMapping: jest.fn().mockResolvedValue(undefined),
      previewImport: jest.fn().mockResolvedValue({}),
      commitImport: jest.fn().mockResolvedValue({
        importedCount: 1,
        invalidCount: 0,
      }),
      touchImported: jest.fn().mockResolvedValue(undefined),
    };

    const adapters = new RemoteImporterUiHostAdapters(client as any);

    await adapters.accountContextProvider.getAllAccounts();
    await adapters.accountContextProvider.getAccountById(1);
    await adapters.accountContextProvider.getAccountImportStatuses();
    await adapters.savedMappingStore.getAllMappings();
    await adapters.savedMappingStore.getMappingForAccount(1);
    await adapters.savedMappingStore.saveMapping({
      accountId: 1,
      mappingName: "Default",
      mapping: {
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
        skipHeaderRows: 1,
      },
    });
    await adapters.savedMappingStore.deleteMapping(10);

    expect(client.getAccounts).toHaveBeenCalled();
    expect(client.getAccountById).toHaveBeenCalledWith(1);
    expect(client.getAccountImportStatuses).toHaveBeenCalled();
    expect(client.getAllMappings).toHaveBeenCalled();
    expect(client.getMappingForAccount).toHaveBeenCalledWith(1);
    expect(client.saveMapping).toHaveBeenCalled();
    expect(client.deleteMapping).toHaveBeenCalledWith(10);
  });

  it("touches imported freshness when commit imports no rows", async () => {
    const client = {
      getAccounts: jest.fn(),
      getAccountById: jest.fn(),
      getAccountImportStatuses: jest.fn(),
      getAllMappings: jest.fn(),
      getMappingForAccount: jest.fn(),
      saveMapping: jest.fn(),
      deleteMapping: jest.fn(),
      previewImport: jest.fn(),
      commitImport: jest.fn().mockResolvedValue({
        importedCount: 0,
        invalidCount: 0,
        duplicateCount: 2,
        success: true,
        message: "All records already imported.",
      }),
      touchImported: jest.fn().mockResolvedValue(undefined),
    };

    const adapters = new RemoteImporterUiHostAdapters(client as any);

    await adapters.importExecutionStore.saveCommit({
      account: { id: 42, name: "Cash" },
      source: "csv",
      standardizedCsv: "date,description,amount,account,category",
      result: {
        success: true,
        message: "All records already imported.",
        importedCount: 0,
        duplicateCount: 2,
        invalidCount: 0,
      },
    });

    expect(client.commitImport).toHaveBeenCalledWith(
      42,
      "date,description,amount,account,category",
    );
    expect(client.touchImported).toHaveBeenCalledWith(42);
  });

  it("uses account id and standardized csv when saving preview/commit", async () => {
    const client = {
      getAccounts: jest.fn(),
      getAccountById: jest.fn(),
      getAccountImportStatuses: jest.fn(),
      getAllMappings: jest.fn(),
      getMappingForAccount: jest.fn(),
      saveMapping: jest.fn(),
      deleteMapping: jest.fn(),
      previewImport: jest.fn().mockResolvedValue({}),
      commitImport: jest.fn().mockResolvedValue({}),
    };

    const adapters = new RemoteImporterUiHostAdapters(client as any);

    await adapters.importExecutionStore.savePreview({
      account: { id: 42, name: "Cash" },
      source: "csv",
      standardizedCsv: "date,description,amount,account,category",
      preview: {
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        duplicateRows: 0,
        sample: [],
      },
    });

    await adapters.importExecutionStore.saveCommit({
      account: { id: 42, name: "Cash" },
      source: "csv",
      standardizedCsv: "date,description,amount,account,category",
      result: {
        success: true,
        message: "ok",
        importedCount: 1,
        duplicateCount: 0,
        invalidCount: 0,
      },
    });

    expect(client.previewImport).toHaveBeenCalledWith(
      42,
      "date,description,amount,account,category",
    );
    expect(client.commitImport).toHaveBeenCalledWith(
      42,
      "date,description,amount,account,category",
    );
  });
});
