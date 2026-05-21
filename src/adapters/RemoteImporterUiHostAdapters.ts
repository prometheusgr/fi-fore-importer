import type {
  ImporterUiHostAdapters,
  PreviewPersistenceInput,
  CommitPersistenceInput,
  SaveMappingInput,
} from "../contracts/ImporterHostAdapters";
import type { HostApiClient } from "../clients/HostApiClient";

export class RemoteImporterUiHostAdapters implements ImporterUiHostAdapters {
  constructor(private readonly hostApiClient: HostApiClient) {}

  readonly accountContextProvider = {
    getAllAccounts: async () => this.hostApiClient.getAccounts(),

    getAccountById: async (accountId: number) =>
      this.hostApiClient.getAccountById(accountId),

    getAccountImportStatuses: async () =>
      this.hostApiClient.getAccountImportStatuses(),
  };

  readonly savedMappingStore = {
    getAllMappings: async () => this.hostApiClient.getAllMappings(),

    getMappingForAccount: async (accountId: number) =>
      this.hostApiClient.getMappingForAccount(accountId),

    saveMapping: async (input: SaveMappingInput) =>
      this.hostApiClient.saveMapping(input),

    deleteMapping: async (mappingId: number) =>
      this.hostApiClient.deleteMapping(mappingId),
  };

  readonly importExecutionStore = {
    savePreview: async (input: PreviewPersistenceInput): Promise<void> => {
      await this.hostApiClient.previewImport(
        input.account.id,
        input.standardizedCsv,
      );
    },

    saveCommit: async (input: CommitPersistenceInput): Promise<void> => {
      const result = await this.hostApiClient.commitImport(
        input.account.id,
        input.standardizedCsv,
      );

      if (result.importedCount === 0 && result.invalidCount === 0) {
        await this.hostApiClient.touchImported(input.account.id);
      }
    },

    touchImported: async (accountId: number): Promise<void> => {
      await this.hostApiClient.touchImported(accountId);
    },
  };
}
