"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImporterOrchestrator = void 0;
class ImporterOrchestrator {
    constructor(adapters, auditLogger) {
        this.adapters = adapters;
        this.auditLogger = auditLogger;
    }
    detectMapping(account, csvContent) {
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
    async previewMappedImport(input) {
        try {
            const standardizedCsv = this.adapters.mappingEngine.applyMapping(input.csvContent, input.mapping, input.account.name);
            const preview = await this.adapters.transactionImporter.previewImport(standardizedCsv);
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
        }
        catch (error) {
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
    async commitMappedImport(input) {
        try {
            const standardizedCsv = this.adapters.mappingEngine.applyMapping(input.csvContent, input.mapping, input.account.name);
            const result = await this.adapters.transactionImporter.importTransactions(standardizedCsv);
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
        }
        catch (error) {
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
    async pullFromHostSource(context) {
        if (!this.adapters.transactionSourceAdapter) {
            return null;
        }
        try {
            const result = await this.adapters.transactionSourceAdapter.pullTransactions(context);
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
        }
        catch (error) {
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
    logAuditEventInBackground(event) {
        void this.safeLogAuditEvent(event);
    }
    async safeLogAuditEvent(event) {
        if (!this.auditLogger) {
            return;
        }
        try {
            await this.auditLogger.logEvent(event);
        }
        catch {
            // Audit logging is best-effort and must never break import workflows.
        }
    }
    countDataRows(csvContent) {
        return csvContent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0).length;
    }
    getErrorCode(error) {
        if (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            typeof error.code === "string") {
            return error.code;
        }
        return "UNKNOWN_ERROR";
    }
    getErrorMessage(error) {
        return error instanceof Error ? error.message : String(error);
    }
}
exports.ImporterOrchestrator = ImporterOrchestrator;
