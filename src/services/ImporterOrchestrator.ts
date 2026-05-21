import type {
  AccountContext,
  ImportCommitResult,
  ImporterAuditEvent,
  ImporterAuditLogger,
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
  constructor(
    private readonly adapters: ImporterHostAdapters,
    private readonly auditLogger?: ImporterAuditLogger,
  ) {}

  detectMapping(
    account: AccountContext,
    csvContent: string,
  ): DetectMappingOutput {
    const output = {
      account,
      detection: this.adapters.mappingEngine.detectMapping(csvContent),
    };

    this.logAuditEventInBackground({
      type: "mapping_detected",
      atIso: new Date().toISOString(),
      accountId: account.id,
      metadata: {
        rowCount: this.countDataRows(csvContent),
        hasHeaders: output.detection.hasHeaders,
        detectedColumns: output.detection.columns.length,
      },
    });

    return output;
  }

  async previewMappedImport(
    input: PreviewMappedImportInput,
  ): Promise<PreviewMappedImportOutput> {
    try {
      const standardizedCsv = this.adapters.mappingEngine.applyMapping(
        input.csvContent,
        input.mapping,
        input.account.name,
      );

      const preview =
        await this.adapters.transactionImporter.previewImport(standardizedCsv);

      await this.safeLogAuditEvent({
        type: "import_previewed",
        atIso: new Date().toISOString(),
        accountId: input.account.id,
        metadata: {
          rowCount: preview.totalRows,
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          duplicateRows: preview.duplicateRows,
        },
      });

      return { standardizedCsv, preview };
    } catch (error) {
      await this.safeLogAuditEvent({
        type: "import_preview_error",
        atIso: new Date().toISOString(),
        accountId: input.account.id,
        metadata: {
          rowCount: this.countDataRows(input.csvContent),
          errorCode: this.getErrorCode(error),
          errorMessage: this.getErrorMessage(error),
        },
      });
      throw error;
    }
  }

  async commitMappedImport(
    input: CommitMappedImportInput,
  ): Promise<CommitMappedImportOutput> {
    try {
      const standardizedCsv = this.adapters.mappingEngine.applyMapping(
        input.csvContent,
        input.mapping,
        input.account.name,
      );

      const result =
        await this.adapters.transactionImporter.importTransactions(
          standardizedCsv,
        );

      await this.safeLogAuditEvent({
        type: "import_committed",
        atIso: new Date().toISOString(),
        accountId: input.account.id,
        metadata: {
          importedCount: result.importedCount,
          duplicateCount: result.duplicateCount,
          invalidCount: result.invalidCount,
          errorCode: result.errorCode ?? null,
        },
      });

      return { standardizedCsv, result };
    } catch (error) {
      await this.safeLogAuditEvent({
        type: "import_commit_error",
        atIso: new Date().toISOString(),
        accountId: input.account.id,
        metadata: {
          rowCount: this.countDataRows(input.csvContent),
          errorCode: this.getErrorCode(error),
          errorMessage: this.getErrorMessage(error),
        },
      });
      throw error;
    }
  }

  async pullFromHostSource(
    context: ImportSourceContext,
  ): Promise<SourcePullResult | null> {
    if (!this.adapters.transactionSourceAdapter) {
      return null;
    }

    try {
      const result =
        await this.adapters.transactionSourceAdapter.pullTransactions(context);

      await this.safeLogAuditEvent({
        type: "host_source_pulled",
        atIso: new Date().toISOString(),
        accountId: context.accountId,
        metadata: {
          pulledCount: result.transactions.length,
          sourceName: result.sourceName,
        },
      });

      return result;
    } catch (error) {
      await this.safeLogAuditEvent({
        type: "host_source_pull_error",
        atIso: new Date().toISOString(),
        accountId: context.accountId,
        metadata: {
          errorCode: this.getErrorCode(error),
          errorMessage: this.getErrorMessage(error),
        },
      });
      throw error;
    }
  }

  private logAuditEventInBackground(event: ImporterAuditEvent): void {
    void this.safeLogAuditEvent(event);
  }

  private async safeLogAuditEvent(event: ImporterAuditEvent): Promise<void> {
    if (!this.auditLogger) {
      return;
    }

    try {
      await this.auditLogger.logEvent(event);
    } catch {
      // Audit logging is best-effort and must never break import workflows.
    }
  }

  private countDataRows(csvContent: string): number {
    return csvContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;
  }

  private getErrorCode(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      return (error as { code: string }).code;
    }

    return "UNKNOWN_ERROR";
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
