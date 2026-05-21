/**
 * Example: CLI-only Importer Setup
 *
 * This is documentation. Do not import into production code.
 * Shows the minimal setup needed for a CLI flow (no browser, no sessions, no audit).
 */
import { HostApiClient } from "../../clients/HostApiClient";
import { RemoteImporterUiHostAdapters } from "../../adapters/RemoteImporterUiHostAdapters";
import { ImporterOrchestrator } from "../../services/ImporterOrchestrator";
import { WorkingDirectory } from "../WorkingDirectory";
import { ImportHistory } from "../ImportHistory";
import { RuntimeConfig } from "../RuntimeConfig";
import { ensureHostAvailable } from "../hostHandshake";

async function cliWorkflow() {
  // 1. Initialize local resources
  const workingDirPath = process.env.FI_FORE_IMPORTER_HOME || process.cwd();
  const workDir = new WorkingDirectory(workingDirPath);
  const history = new ImportHistory(workingDirPath);
  const config = new RuntimeConfig(workingDirPath);

  // 2. Connect to host
  const cfg = await config.load();
  const client = new HostApiClient({ baseUrl: cfg.url, token: cfg.token });
  const hostOk = await ensureHostAvailable(client);
  if (!hostOk.success) {
    throw new Error(`Host unavailable: ${hostOk.errorMessage}`);
  }

  // 3. Set up adapters and orchestrator (NO browser-specific adapters)
  const uiAdapters = new RemoteImporterUiHostAdapters(client);
  const orchestrator = new ImporterOrchestrator({
    mappingEngine: {
      detectMapping() {
        throw new Error("Provide a real mapping engine in production");
      },
      applyMapping() {
        throw new Error("Provide a real mapping engine in production");
      },
    },
    transactionImporter: {
      async previewImport() {
        throw new Error("Provide a real transaction importer in production");
      },
      async importTransactions() {
        throw new Error("Provide a real transaction importer in production");
      },
    },
  });

  void uiAdapters;
  void orchestrator;

  // 4. Import CSV
  const csvs = await workDir.listStagedCsvs();
  if (csvs.length === 0) {
    throw new Error("No staged CSV files found");
  }
  const csvContent = await workDir.readStagedCsv(csvs[0].name);
  await client.previewImport(1, csvContent);
  const result = await client.commitImport(1, csvContent);

  // 5. Record history
  await history.append({
    id: `imp-${Date.now()}`,
    timestamp: new Date().toISOString(),
    csvFileName: csvs[0].name,
    csvSize: csvs[0].size,
    accountId: 1,
    accountName: "Checking",
    importedCount: result.importedCount,
    duplicateCount: result.duplicateCount,
    invalidCount: result.invalidCount,
    status: result.success ? "success" : "failed",
  });
}
