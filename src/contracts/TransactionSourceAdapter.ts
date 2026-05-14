export interface NormalizedImportedTransaction {
  externalId?: string;
  bookedAt: string;
  description: string;
  amount: number;
  currency?: string;
  balance?: number;
  category?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ImportSourceContext {
  accountId: number;
  fromDate?: string;
  toDate?: string;
}

export interface SourcePullResult {
  sourceName: string;
  transactions: NormalizedImportedTransaction[];
  rawArtifactPath?: string;
}

export interface TransactionSourceAdapter {
  pullTransactions(context: ImportSourceContext): Promise<SourcePullResult>;
}
