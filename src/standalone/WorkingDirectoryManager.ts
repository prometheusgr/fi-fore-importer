import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolveStagedCsvPath } from "./PathValidation";

export interface ImportHistory {
  id: string;
  timestamp: string;
  csvFileName: string;
  csvSize: number;
  accountId: number;
  accountName: string;
  mappingId?: number;
  mappingName?: string;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  status: "success" | "failed";
  errorMessage?: string;
}

export interface SessionState {
  accountId?: number;
  accountName?: string;
  csvFileName?: string;
  csvContent?: string;
  previewState?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  };
  selectedMappingId?: number;
  selectedMappingName?: string;
}

export interface HostApiConfig {
  url: string;
  token?: string;
}

export class WorkingDirectoryManager {
  private readonly baseDir: string;
  private readonly csvDir: string;
  private readonly sessionDir: string;
  private readonly historyDir: string;
  private readonly logsDir: string;
  private readonly configPath: string;
  private readonly sessionPath: string;
  private readonly historyPath: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir
      ? path.resolve(baseDir)
      : process.env.FI_FORE_IMPORTER_HOME
        ? path.resolve(process.env.FI_FORE_IMPORTER_HOME)
        : path.join(os.homedir(), ".fi-fore-importer");

    this.csvDir = path.join(this.baseDir, "csv-uploads");
    this.sessionDir = path.join(this.baseDir, "session");
    this.historyDir = path.join(this.baseDir, "history");
    this.logsDir = path.join(this.baseDir, "logs");
    this.configPath = path.join(this.baseDir, "config.json");
    this.sessionPath = path.join(this.sessionDir, "session.json");
    this.historyPath = path.join(this.historyDir, "imports.jsonl");
  }

  async init(): Promise<void> {
    this.ensureDirSync(this.baseDir);
    this.ensureDirSync(this.csvDir);
    this.ensureDirSync(this.sessionDir);
    this.ensureDirSync(this.historyDir);
    this.ensureDirSync(this.logsDir);

    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: HostApiConfig = {
        url: process.env.HOST_API_URL || "http://localhost:3000",
        token: process.env.HOST_API_TOKEN,
      };
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
    }

    if (!fs.existsSync(this.sessionPath)) {
      fs.writeFileSync(this.sessionPath, JSON.stringify({}, null, 2));
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getCsvDir(): string {
    return this.csvDir;
  }

  async listStagedCsvs(): Promise<
    Array<{ name: string; size: number; path: string }>
  > {
    this.ensureDirSync(this.csvDir);

    const files = fs.readdirSync(this.csvDir);
    return files
      .filter((name) => name.endsWith(".csv"))
      .map((name) => {
        const filePath = path.join(this.csvDir, name);
        const stat = fs.statSync(filePath);
        return {
          name,
          size: stat.size,
          path: filePath,
        };
      })
      .sort((a, b) => b.size - a.size);
  }

  async readStagedCsv(fileName: string): Promise<string> {
    const filePath = resolveStagedCsvPath(this.csvDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${fileName}`);
    }

    return fs.readFileSync(filePath, "utf-8");
  }

  async stageCSV(sourcePath: string, fileName?: string): Promise<string> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    this.ensureDirSync(this.csvDir);

    const targetFileName = fileName || path.basename(sourcePath);
    const targetPath = resolveStagedCsvPath(this.csvDir, targetFileName);
    fs.copyFileSync(sourcePath, targetPath);
    return targetPath;
  }

  async removeStagedCsv(fileName: string): Promise<void> {
    const filePath = resolveStagedCsvPath(this.csvDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async moveCSVToDone(fileName: string): Promise<void> {
    const doneDir = path.join(this.csvDir, "done");
    this.ensureDirSync(doneDir);

    const sourcePath = resolveStagedCsvPath(this.csvDir, fileName);
    const targetPath = resolveStagedCsvPath(doneDir, fileName);
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, targetPath);
    }
  }

  async loadSession(): Promise<SessionState> {
    if (!fs.existsSync(this.sessionPath)) {
      return {};
    }

    try {
      return JSON.parse(
        fs.readFileSync(this.sessionPath, "utf-8"),
      ) as SessionState;
    } catch {
      return {};
    }
  }

  async saveSession(state: SessionState): Promise<void> {
    this.ensureDirSync(this.sessionDir);
    fs.writeFileSync(this.sessionPath, JSON.stringify(state, null, 2));
  }

  async clearSession(): Promise<void> {
    if (fs.existsSync(this.sessionPath)) {
      fs.unlinkSync(this.sessionPath);
    }
  }

  async appendHistory(record: ImportHistory): Promise<void> {
    this.ensureDirSync(this.historyDir);
    fs.appendFileSync(this.historyPath, `${JSON.stringify(record)}\n`);
  }

  async getHistory(limit?: number): Promise<ImportHistory[]> {
    if (!fs.existsSync(this.historyPath)) {
      return [];
    }

    const lines = fs
      .readFileSync(this.historyPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as ImportHistory);

    if (limit) {
      return lines.slice(-limit).reverse();
    }

    return lines.reverse();
  }

  async getHostApiConfig(): Promise<HostApiConfig> {
    if (!fs.existsSync(this.configPath)) {
      return {
        url: process.env.HOST_API_URL || "http://localhost:3000",
        token: process.env.HOST_API_TOKEN,
      };
    }

    try {
      return JSON.parse(
        fs.readFileSync(this.configPath, "utf-8"),
      ) as HostApiConfig;
    } catch {
      return {
        url: process.env.HOST_API_URL || "http://localhost:3000",
        token: process.env.HOST_API_TOKEN,
      };
    }
  }

  async saveHostApiConfig(config: HostApiConfig): Promise<void> {
    this.ensureDirSync(this.baseDir);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  async appendLog(message: string): Promise<void> {
    this.ensureDirSync(this.logsDir);
    const logPath = path.join(this.logsDir, "importer.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  }

  async getLogs(lines?: number): Promise<string[]> {
    const logPath = path.join(this.logsDir, "importer.log");

    if (!fs.existsSync(logPath)) {
      return [];
    }

    const allLines = fs
      .readFileSync(logPath, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0);

    if (lines) {
      return allLines.slice(-lines);
    }

    return allLines;
  }

  async getStats(): Promise<{
    csvCount: number;
    csvTotalSize: number;
    historyEntries: number;
    logSize: number;
  }> {
    const csvs = await this.listStagedCsvs();
    const history = await this.getHistory();

    let logSize = 0;
    const logPath = path.join(this.logsDir, "importer.log");
    if (fs.existsSync(logPath)) {
      logSize = fs.statSync(logPath).size;
    }

    return {
      csvCount: csvs.length,
      csvTotalSize: csvs.reduce((sum, file) => sum + file.size, 0),
      historyEntries: history.length,
      logSize,
    };
  }

  async cleanup(): Promise<void> {
    await this.clearSession();

    const logPath = path.join(this.logsDir, "importer.log");
    if (fs.existsSync(logPath)) {
      const stat = fs.statSync(logPath);
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - stat.mtime.getTime() > oneWeekMs) {
        fs.unlinkSync(logPath);
      }
    }
  }

  private ensureDirSync(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export { WorkingDirectoryManager as WorkingDirectory };
