import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { WorkingDirectory } from "./WorkingDirectory";

describe("WorkingDirectory audit trail", () => {
  it("appendAuditLog creates append-only audit.jsonl", async () => {
    const testDir = path.join(os.tmpdir(), `fi-fore-importer-wd-${Date.now()}`);

    try {
      const workingDirectory = new WorkingDirectory(testDir);

      await workingDirectory.appendAuditLog({
        type: "mapping_detected",
        atIso: "2026-01-01T00:00:00.000Z",
        accountId: 7,
        metadata: { rowCount: 10 },
      });

      await workingDirectory.appendAuditLog({
        type: "import_committed",
        atIso: "2026-01-01T00:01:00.000Z",
        accountId: 7,
        metadata: { importedCount: 8, duplicateCount: 2, errorCode: null },
      });

      const auditPath = path.join(testDir, "audit", "audit.jsonl");
      expect(fs.existsSync(auditPath)).toBe(true);

      const lines = fs
        .readFileSync(auditPath, "utf-8")
        .split("\n")
        .filter((line) => line.trim().length > 0);

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual(
        expect.objectContaining({ type: "mapping_detected", accountId: 7 }),
      );
      expect(JSON.parse(lines[1])).toEqual(
        expect.objectContaining({ type: "import_committed", accountId: 7 }),
      );
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});

describe("WorkingDirectory staged CSV path safety", () => {
  let testDir: string;
  let workingDirectory: WorkingDirectory;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `fi-fore-importer-wd-path-${Date.now()}`);
    workingDirectory = new WorkingDirectory(testDir);
    fs.mkdirSync(path.join(testDir, "csv-uploads"), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("rejects traversal in readStagedCsv", async () => {
    await expect(
      workingDirectory.readStagedCsv("../outside.csv"),
    ).rejects.toThrow("Invalid CSV file");
  });

  it("rejects sibling-prefix bypass in readStagedCsv", async () => {
    await expect(
      workingDirectory.readStagedCsv("../csv-uploads-evil/attack.csv"),
    ).rejects.toThrow("Invalid CSV file");
  });

  it("rejects traversal in removeStagedCsv", async () => {
    await expect(
      workingDirectory.removeStagedCsv("../outside.csv"),
    ).rejects.toThrow("Invalid CSV file");
  });

  it("rejects traversal in moveCSVToDone", async () => {
    await expect(
      workingDirectory.moveCSVToDone("../outside.csv"),
    ).rejects.toThrow("Invalid CSV file");
  });

  it("rejects traversal target in stageCSV", async () => {
    const sourceFile = path.join(testDir, "source.csv");
    fs.writeFileSync(sourceFile, "a,b\n1,2");

    await expect(
      workingDirectory.stageCSV(sourceFile, "../outside.csv"),
    ).rejects.toThrow("Invalid CSV file");
  });
});
