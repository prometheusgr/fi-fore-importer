import * as fs from "fs";
import * as path from "path";

export interface ImportHistoryRecord {
  id: string;
  timestamp: string;
  csvFileName: string;
  csvSize: number;
  accountId: number;
  accountName: string;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  status: "success" | "failed";
  errorMessage?: string;
}

/**
 * Manages import history persistence.
 * Responsible for: append, query, filtering.
 * NOT responsible for: file system navigation, config, logging.
 */
export class ImportHistory {
  private historyPath: string;

  constructor(workingDir: string) {
    this.historyPath = path.join(workingDir, "history", "imports.jsonl");
  }

  async append(record: ImportHistoryRecord): Promise<void> {
    fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
    fs.appendFileSync(this.historyPath, `${JSON.stringify(record)}\n`, "utf-8");
  }

  async getRecent(limit?: number): Promise<ImportHistoryRecord[]> {
    if (!fs.existsSync(this.historyPath)) {
      return [];
    }

    const entries = fs
      .readFileSync(this.historyPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as ImportHistoryRecord)
      .reverse();

    if (limit) {
      return entries.slice(0, limit);
    }

    return entries;
  }

  async getForAccount(
    accountId: number,
    limit?: number,
  ): Promise<ImportHistoryRecord[]> {
    const records = await this.getRecent();
    const filtered = records.filter((record) => record.accountId === accountId);

    if (limit) {
      return filtered.slice(0, limit);
    }

    return filtered;
  }
}
