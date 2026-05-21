import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ImporterAuditEvent } from "../contracts/ImporterHostAdapters";
import { resolveStagedCsvPath } from "./PathValidation";

export interface StagedCsv {
  name: string;
  size: number;
  path: string;
}

/**
 * Manages CSV file staging in the working directory.
 * Responsible for: list, read, stage, remove, move-to-done.
 * NOT responsible for: config, history, logging, stats.
 */
export class WorkingDirectory {
  private baseDir: string;
  private csvDir: string;
  private auditDir: string;
  private auditPath: string;

  constructor(workingDir?: string) {
    this.baseDir = workingDir
      ? path.resolve(workingDir)
      : process.env.FI_FORE_IMPORTER_HOME
        ? path.resolve(process.env.FI_FORE_IMPORTER_HOME)
        : path.join(os.homedir(), ".fi-fore-importer");
    this.csvDir = path.join(this.baseDir, "csv-uploads");
    this.auditDir = path.join(this.baseDir, "audit");
    this.auditPath = path.join(this.auditDir, "audit.jsonl");
  }

  async listStagedCsvs(): Promise<StagedCsv[]> {
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

  async appendAuditLog(event: ImporterAuditEvent): Promise<void> {
    this.ensureDirSync(this.auditDir);
    fs.appendFileSync(this.auditPath, `${JSON.stringify(event)}\n`, "utf-8");
  }

  private ensureDirSync(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
