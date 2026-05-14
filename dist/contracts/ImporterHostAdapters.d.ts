import type { TransactionSourceAdapter } from "./TransactionSourceAdapter";
export interface AccountContext {
    id: number;
    name: string;
}
export interface MappingConfiguration {
    dateFormat: string;
    dateColumn: number;
    descriptionColumns: number[];
    amountColumn: number | null;
    debitColumn: number | null;
    creditColumn: number | null;
    typeIndicatorColumn: number | null;
    categoryColumn: number | null;
    balanceColumn: number | null;
    invertSign: boolean;
    skipHeaderRows: number;
}
export interface MappingDetectionResult {
    hasHeaders: boolean;
    dateFormat: string;
    dateFormatConfidence: number;
    invertSign: boolean;
    columns: Array<{
        index: number;
        role: string;
        confidence: number;
        header?: string;
    }>;
    sampleRows: string[][];
    headerRow: string[] | null;
}
export interface MappingEngine {
    detectMapping(csvContent: string): MappingDetectionResult;
    applyMapping(csvContent: string, mapping: MappingConfiguration, accountName: string): string;
}
export interface ImportPreview {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    sample: Array<{
        date: string;
        description: string;
        amount: number;
        category?: string;
    }>;
}
export interface ImportCommitResult {
    success: boolean;
    message: string;
    importedCount: number;
    duplicateCount: number;
    invalidCount: number;
}
export interface TransactionImporter {
    previewImport(csvContent: string): Promise<ImportPreview>;
    importTransactions(csvContent: string): Promise<ImportCommitResult>;
}
export interface ImporterHostAdapters {
    mappingEngine: MappingEngine;
    transactionImporter: TransactionImporter;
    transactionSourceAdapter?: TransactionSourceAdapter;
}
//# sourceMappingURL=ImporterHostAdapters.d.ts.map