import type { AccountContext, ImportCommitResult, ImporterHostAdapters, ImportPreview, MappingConfiguration, MappingDetectionResult } from "../contracts/ImporterHostAdapters";
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
    constructor(adapters: ImporterHostAdapters);
    detectMapping(account: AccountContext, csvContent: string): DetectMappingOutput;
    previewMappedImport(input: PreviewMappedImportInput): Promise<PreviewMappedImportOutput>;
    commitMappedImport(input: CommitMappedImportInput): Promise<CommitMappedImportOutput>;
    pullFromHostSource(context: ImportSourceContext): Promise<SourcePullResult | null>;
}
//# sourceMappingURL=ImporterOrchestrator.d.ts.map