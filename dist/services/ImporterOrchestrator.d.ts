import type { AccountContext, ImportCommitResult, ImporterAuditLogger, ImporterHostAdapters, ImportPreview, MappingConfiguration, MappingDetectionResult } from "../contracts/ImporterHostAdapters";
import type { ImportSourceContext, SourcePullResult } from "../contracts/TransactionSourceAdapter";
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
export declare class ImporterOrchestrator {
    private readonly adapters;
    private readonly auditLogger?;
    constructor(adapters: ImporterHostAdapters, auditLogger?: ImporterAuditLogger | undefined);
    detectMapping(account: AccountContext, csvContent: string): DetectMappingOutput;
    previewMappedImport(input: PreviewMappedImportInput): Promise<PreviewMappedImportOutput>;
    commitMappedImport(input: CommitMappedImportInput): Promise<CommitMappedImportOutput>;
    pullFromHostSource(context: ImportSourceContext): Promise<SourcePullResult | null>;
    private logAuditEventInBackground;
    private safeLogAuditEvent;
    private countDataRows;
    private getErrorCode;
    private getErrorMessage;
}
//# sourceMappingURL=ImporterOrchestrator.d.ts.map