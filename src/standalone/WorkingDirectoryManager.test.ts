import {
  WorkingDirectoryManager,
  SessionState,
  ImportHistory,
} from "./WorkingDirectoryManager";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("WorkingDirectoryManager", () => {
  let manager: WorkingDirectoryManager;
  let testDir: string;

  beforeEach(async () => {
    // Use temp directory for testing
    testDir = path.join(os.tmpdir(), `fi-fore-importer-test-${Date.now()}`);
    manager = new WorkingDirectoryManager(testDir);
    await manager.init();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    it("should create directory structure", async () => {
      expect(fs.existsSync(path.join(testDir, "csv-uploads"))).toBe(true);
      expect(fs.existsSync(path.join(testDir, "session"))).toBe(true);
      expect(fs.existsSync(path.join(testDir, "history"))).toBe(true);
      expect(fs.existsSync(path.join(testDir, "logs"))).toBe(true);
    });

    it("should create default config.json", async () => {
      const configPath = path.join(testDir, "config.json");
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.url).toBe("http://localhost:3000");
    });

    it("should create empty session.json", async () => {
      const sessionPath = path.join(testDir, "session", "session.json");
      expect(fs.existsSync(sessionPath)).toBe(true);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session).toEqual({});
    });

    it("should not overwrite existing config", async () => {
      const configPath = path.join(testDir, "config.json");
      const customConfig = { url: "http://custom:9000", token: "abc123" };
      fs.writeFileSync(configPath, JSON.stringify(customConfig));

      const manager2 = new WorkingDirectoryManager(testDir);
      await manager2.init();

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.url).toBe("http://custom:9000");
      expect(config.token).toBe("abc123");
    });
  });

  describe("CSV staging", () => {
    it("should list staged CSVs", async () => {
      fs.writeFileSync(
        path.join(testDir, "csv-uploads", "test1.csv"),
        "a,b,c\n1,2,3",
      );
      fs.writeFileSync(
        path.join(testDir, "csv-uploads", "test2.csv"),
        "x,y,z\n",
      );

      const csvs = await manager.listStagedCsvs();
      expect(csvs).toHaveLength(2);
      expect(csvs.map((c) => c.name)).toContain("test1.csv");
      expect(csvs.map((c) => c.name)).toContain("test2.csv");
    });

    it("should read staged CSV content", async () => {
      const content = "Date,Amount\n2024-01-01,100";
      fs.writeFileSync(path.join(testDir, "csv-uploads", "test.csv"), content);

      const read = await manager.readStagedCsv("test.csv");
      expect(read).toBe(content);
    });

    it("should stage a CSV file from source path", async () => {
      const sourceFile = path.join(os.tmpdir(), "source.csv");
      fs.writeFileSync(sourceFile, "a,b\n1,2");

      try {
        const targetPath = await manager.stageCSV(sourceFile, "staged.csv");
        expect(targetPath).toContain("csv-uploads");
        expect(fs.existsSync(targetPath)).toBe(true);

        const content = fs.readFileSync(targetPath, "utf-8");
        expect(content).toBe("a,b\n1,2");
      } finally {
        if (fs.existsSync(sourceFile)) {
          fs.unlinkSync(sourceFile);
        }
      }
    });

    it("should remove staged CSV", async () => {
      fs.writeFileSync(path.join(testDir, "csv-uploads", "test.csv"), "data");

      await manager.removeStagedCsv("test.csv");
      expect(fs.existsSync(path.join(testDir, "csv-uploads", "test.csv"))).toBe(
        false,
      );
    });

    it("should move CSV to done directory", async () => {
      const csvPath = path.join(testDir, "csv-uploads", "test.csv");
      fs.writeFileSync(csvPath, "data");

      await manager.moveCSVToDone("test.csv");

      expect(fs.existsSync(csvPath)).toBe(false);
      expect(
        fs.existsSync(path.join(testDir, "csv-uploads", "done", "test.csv")),
      ).toBe(true);
    });

    it("should prevent directory traversal", async () => {
      await expect(
        manager.readStagedCsv("../../../etc/passwd"),
      ).rejects.toThrow("Invalid CSV file");
    });

    it("should prevent sibling-prefix bypass on read", async () => {
      await expect(
        manager.readStagedCsv("../csv-uploads-evil/bypass.csv"),
      ).rejects.toThrow("Invalid CSV file");
    });

    it("should prevent directory traversal on remove", async () => {
      await expect(manager.removeStagedCsv("../outside.csv")).rejects.toThrow(
        "Invalid CSV file",
      );
    });

    it("should prevent directory traversal on move", async () => {
      await expect(manager.moveCSVToDone("../outside.csv")).rejects.toThrow(
        "Invalid CSV file",
      );
    });

    it("should prevent directory traversal target in stage", async () => {
      const sourceFile = path.join(
        os.tmpdir(),
        `stage-source-${Date.now()}.csv`,
      );
      fs.writeFileSync(sourceFile, "a,b\n1,2");

      try {
        await expect(
          manager.stageCSV(sourceFile, "../outside.csv"),
        ).rejects.toThrow("Invalid CSV file");
      } finally {
        if (fs.existsSync(sourceFile)) {
          fs.unlinkSync(sourceFile);
        }
      }
    });
  });

  describe("session management", () => {
    it("should load and save session state", async () => {
      const state: SessionState = {
        accountId: 1,
        accountName: "Checking",
        csvFileName: "test.csv",
      };

      await manager.saveSession(state);
      const loaded = await manager.loadSession();

      expect(loaded).toEqual(state);
    });

    it("should return empty session if not found", async () => {
      const manager2 = new WorkingDirectoryManager(
        path.join(os.tmpdir(), "non-existent"),
      );
      const session = await manager2.loadSession();
      expect(session).toEqual({});
    });

    it("should clear session", async () => {
      await manager.saveSession({ accountId: 1 });
      const sessionPath = path.join(testDir, "session", "session.json");
      expect(fs.existsSync(sessionPath)).toBe(true);

      await manager.clearSession();
      expect(fs.existsSync(sessionPath)).toBe(false);
    });

    it("should preserve session across multiple saves", async () => {
      const state1: SessionState = { accountId: 1, accountName: "Checking" };
      await manager.saveSession(state1);

      const state2: SessionState = { ...state1, csvFileName: "test.csv" };
      await manager.saveSession(state2);

      const loaded = await manager.loadSession();
      expect(loaded.accountId).toBe(1);
      expect(loaded.csvFileName).toBe("test.csv");
    });
  });

  describe("import history", () => {
    it("should append import history", async () => {
      const record: ImportHistory = {
        id: "imp-001",
        timestamp: new Date().toISOString(),
        csvFileName: "test.csv",
        csvSize: 1024,
        accountId: 1,
        accountName: "Checking",
        importedCount: 5,
        duplicateCount: 1,
        invalidCount: 0,
        status: "success",
      };

      await manager.appendHistory(record);

      const history = await manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("imp-001");
    });

    it("should retrieve history in reverse order (most recent first)", async () => {
      const record1: ImportHistory = {
        id: "imp-001",
        timestamp: "2024-01-01T00:00:00Z",
        csvFileName: "test1.csv",
        csvSize: 1024,
        accountId: 1,
        accountName: "Checking",
        importedCount: 5,
        duplicateCount: 0,
        invalidCount: 0,
        status: "success",
      };

      const record2: ImportHistory = {
        id: "imp-002",
        timestamp: "2024-01-02T00:00:00Z",
        csvFileName: "test2.csv",
        csvSize: 2048,
        accountId: 1,
        accountName: "Checking",
        importedCount: 10,
        duplicateCount: 1,
        invalidCount: 0,
        status: "success",
      };

      await manager.appendHistory(record1);
      await manager.appendHistory(record2);

      const history = await manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe("imp-002"); // Most recent first
      expect(history[1].id).toBe("imp-001");
    });

    it("should limit history results", async () => {
      for (let i = 0; i < 10; i++) {
        await manager.appendHistory({
          id: `imp-${i}`,
          timestamp: new Date().toISOString(),
          csvFileName: `test${i}.csv`,
          csvSize: 1024,
          accountId: 1,
          accountName: "Checking",
          importedCount: 5,
          duplicateCount: 0,
          invalidCount: 0,
          status: "success",
        });
      }

      const history = await manager.getHistory(3);
      expect(history).toHaveLength(3);
    });

    it("should return empty history if file doesn't exist", async () => {
      const history = await manager.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe("host API config", () => {
    it("should get host API config", async () => {
      const config = await manager.getHostApiConfig();
      expect(config.url).toBe("http://localhost:3000");
    });

    it("should save host API config", async () => {
      const newConfig = { url: "http://custom:9000", token: "xyz789" };
      await manager.saveHostApiConfig(newConfig);

      const loaded = await manager.getHostApiConfig();
      expect(loaded.url).toBe("http://custom:9000");
      expect(loaded.token).toBe("xyz789");
    });

    it("should read config from env vars if file not found", async () => {
      process.env.HOST_API_URL = "http://env:5000";
      process.env.HOST_API_TOKEN = "env-token";

      const manager2 = new WorkingDirectoryManager(
        path.join(os.tmpdir(), "no-config-dir"),
      );
      const config = await manager2.getHostApiConfig();

      expect(config.url).toBe("http://env:5000");
      expect(config.token).toBe("env-token");

      delete process.env.HOST_API_URL;
      delete process.env.HOST_API_TOKEN;
    });
  });

  describe("logging", () => {
    it("should append log messages", async () => {
      await manager.appendLog("Test message 1");
      await manager.appendLog("Test message 2");

      const logs = await manager.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[logs.length - 1]).toContain("Test message 2");
    });

    it("should limit log results", async () => {
      for (let i = 0; i < 10; i++) {
        await manager.appendLog(`Message ${i}`);
      }

      const logs = await manager.getLogs(3);
      expect(logs).toHaveLength(3);
    });

    it("should return empty logs if file doesn't exist", async () => {
      const logs = await manager.getLogs();
      expect(logs).toEqual([]);
    });
  });

  describe("statistics", () => {
    it("should calculate storage stats", async () => {
      fs.writeFileSync(
        path.join(testDir, "csv-uploads", "test.csv"),
        "a,b,c\n1,2,3",
      );
      await manager.appendHistory({
        id: "imp-001",
        timestamp: new Date().toISOString(),
        csvFileName: "test.csv",
        csvSize: 100,
        accountId: 1,
        accountName: "Checking",
        importedCount: 1,
        duplicateCount: 0,
        invalidCount: 0,
        status: "success",
      });

      const stats = await manager.getStats();
      expect(stats.csvCount).toBe(1);
      expect(stats.csvTotalSize).toBeGreaterThan(0);
      expect(stats.historyEntries).toBe(1);
    });
  });

  describe("cleanup", () => {
    it("should clean up temporary files", async () => {
      await manager.saveSession({ accountId: 1 });
      await manager.appendLog("Test");

      await manager.cleanup();

      const session = await manager.loadSession();
      expect(session).toEqual({});
    });
  });

  describe("directory resolution", () => {
    it("should use FI_FORE_IMPORTER_HOME env var if set", () => {
      process.env.FI_FORE_IMPORTER_HOME = "/custom/path";
      const manager2 = new WorkingDirectoryManager();
      expect(manager2.getBaseDir()).toBe(path.resolve("/custom/path"));
      delete process.env.FI_FORE_IMPORTER_HOME;
    });

    it("should use default home directory", () => {
      const manager2 = new WorkingDirectoryManager();
      const expected = path.join(os.homedir(), ".fi-fore-importer");
      expect(manager2.getBaseDir()).toBe(expected);
    });

    it("should use explicit path if provided", () => {
      const customPath = "/explicit/path";
      const manager2 = new WorkingDirectoryManager(customPath);
      expect(manager2.getBaseDir()).toBe(path.resolve(customPath));
    });
  });
});
