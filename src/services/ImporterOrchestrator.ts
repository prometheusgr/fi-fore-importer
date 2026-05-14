import type {
  AccountContext,
  ImportCommitResult,
  ImporterHostAdapters,
  ImportPreview,
  MappingConfiguration,
  MappingDetectionResult,
} from "../contracts/ImporterHostAdapters";
import type {
  ImportSourceContext,
  SourcePullResult,
} from "../contracts/TransactionSourceAdapter";

export interface DetectMappingOutput {
  account: AccountContext;
  detection: MappingDetectionResult;
}

export interface PreviewMappedImportInput {
  account: AccountContext;
  csvContent: string;
  mapping: MappingConfiguration;
}

export interface PreviewMappedImportOutput {
  standardizedCsv: string;
  preview: ImportPreview;
}

export interface CommitMappedImportInput {
  account: AccountContext;
  csvContent: string;
  mapping: MappingConfiguration;
}

export interface CommitMappedImportOutput {
  standardizedCsv: string;
  result: ImportCommitResult;
}

export class ImporterOrchestrator {
  constructor(private readonly adapters: ImporterHostAdapters) {}

  detectMapping(
    account: AccountContext,
    csvContent: string,
  ): DetectMappingOutput {
    return {
      account,
      detection: this.adapters.mappingEngine.detectMapping(csvContent),
    };
  }

  async previewMappedImport(
    input: PreviewMappedImportInput,
  ): Promise<PreviewMappedImportOutput> {
    const standardizedCsv = this.adapters.mappingEngine.applyMapping(
      input.csvContent,
      input.mapping,
      input.account.name,
    );

    const preview =
      await this.adapters.transactionImporter.previewImport(standardizedCsv);

    return { standardizedCsv, preview };
  }

  async commitMappedImport(
    input: CommitMappedImportInput,
  ): Promise<CommitMappedImportOutput> {
    const standardizedCsv = this.adapters.mappingEngine.applyMapping(
      input.csvContent,
      input.mapping,
      input.account.name,
    );

    const result =
      await this.adapters.transactionImporter.importTransactions(
        standardizedCsv,
      );

    return { standardizedCsv, result };
  }

  async pullFromHostSource(
    context: ImportSourceContext,
  ): Promise<SourcePullResult | null> {
    if (!this.adapters.transactionSourceAdapter) {
      return null;
    }

    return this.adapters.transactionSourceAdapter.pullTransactions(context);
  }
}
