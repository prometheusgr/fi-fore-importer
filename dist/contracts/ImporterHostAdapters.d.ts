import type { TransactionSourceAdapter } from "./TransactionSourceAdapter";
export interface AccountContext {
    id: number;
    name: string;
}
export interface AccountImportStatus {
    accountId: number;
    accountName: string;
    accountType?: string;
    lastImportedAt?: string | null;
    freshnessLabel?: string;
    freshnessClass?: string;
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
    errorCode?: string;
    errorDetails?: Record<string, any>;
}
export interface SavedMappingSummary {
    id: number;
    accountId: number;
    accountName: string;
    mappingName: string;
}
export interface SavedMappingRecord extends SavedMappingSummary {
    mapping: MappingConfiguration;
}
export interface SaveMappingInput {
    accountId: number;
    mappingName: string;
    mapping: MappingConfiguration;
}
export interface PreviewPersistenceInput {
    account: AccountContext;
    source: "csv" | "browser";
    standardizedCsv: string;
    preview: ImportPreview;
}
export interface CommitPersistenceInput {
    account: AccountContext;
    source: "csv" | "browser";
    standardizedCsv: string;
    result: ImportCommitResult;
}
export interface BrowserSessionContext {
    account: AccountContext;
    bankId?: number;
}
export interface BrowserSessionHandle {
    sessionId: string;
    createdAtIso: string;
}
export interface ImporterAuditEvent {
    type: string;
    atIso: string;
    accountId?: number;
    metadata?: Record<string, string | number | boolean | null>;
}
export interface AccountContextProvider {
    getAllAccounts(): Promise<AccountContext[]>;
    getAccountById(accountId: number): Promise<AccountContext | null>;
    getAccountImportStatuses(): Promise<AccountImportStatus[]>;
}
export interface SavedMappingStore {
    getAllMappings(): Promise<SavedMappingSummary[]>;
    getMappingForAccount(accountId: number): Promise<SavedMappingRecord | null>;
    saveMapping(input: SaveMappingInput): Promise<SavedMappingRecord>;
    deleteMapping(mappingId: number): Promise<void>;
}
export interface ImportExecutionStore {
    savePreview(input: PreviewPersistenceInput): Promise<void>;
    saveCommit(input: CommitPersistenceInput): Promise<void>;
    touchImported(accountId: number): Promise<void>;
}
export interface BrowserSessionBridge {
    createSession(context: BrowserSessionContext): Promise<BrowserSessionHandle>;
    validateSession(sessionId: string): Promise<boolean>;
    closeSession(sessionId: string): Promise<void>;
}
export interface ImporterAuditLogger {
    logEvent(event: ImporterAuditEvent): Promise<void> | void;
}
export interface TransactionImporter {
    previewImport(standardizedCsv: string): Promise<ImportPreview>;
    importTransactions(standardizedCsv: string): Promise<ImportCommitResult>;
}
export interface ImporterUiHostAdapters {
    accountContextProvider: AccountContextProvider;
    savedMappingStore: SavedMappingStore;
    importExecutionStore: ImportExecutionStore;
    browserSessionBridge?: BrowserSessionBridge;
    auditLogger?: ImporterAuditLogger;
}
export interface ImporterHostAdapters {
    mappingEngine: MappingEngine;
    transactionImporter: TransactionImporter;
    transactionSourceAdapter?: TransactionSourceAdapter;
    uiHostAdapters?: ImporterUiHostAdapters;
}
/**
 * DEFERRED: Browser UI Adapters (to be implemented in Phase 3+)
 *
 * These interfaces are designed for a future browser-based importer UI.
 * CLI-only development should NOT use these.
 *
 * To be implemented when browser UI is built:
 * - BrowserSessionBridge
 * - ImporterAuditLogger
 * - PreviewPersistenceInput / CommitPersistenceInput
 */
//# sourceMappingURL=ImporterHostAdapters.d.ts.map