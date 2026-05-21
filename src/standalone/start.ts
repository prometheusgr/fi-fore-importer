import { HostApiClient } from "../clients/HostApiClient";
import { WorkingDirectoryManager } from "./WorkingDirectoryManager";
import { ensureHostAvailable } from "./hostHandshake";

function parseNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function main(): Promise<void> {
  // Initialize working directory
  const workingDir = new WorkingDirectoryManager();
  await workingDir.init();

  const baseDir = workingDir.getBaseDir();
  console.log(`[importer] working directory: ${baseDir}`);

  // Load or create config
  const config = await workingDir.getHostApiConfig();
  const hostBaseUrl = config.url || "http://localhost:3000";
  const hostToken = config.token;

  // Allow env vars to override config
  const resolvedHostUrl =
    process.env.HOST_API_URL ||
    process.env.IMPORTER_HOST_API_URL ||
    hostBaseUrl;
  const resolvedToken =
    process.env.HOST_API_TOKEN || process.env.IMPORTER_API_TOKEN || hostToken;

  const maxAttempts = parseNumberEnv(process.env.IMPORTER_HOST_MAX_ATTEMPTS, 5);
  const retryDelayMs = parseNumberEnv(
    process.env.IMPORTER_HOST_RETRY_DELAY_MS,
    750,
  );

  const client = new HostApiClient({
    baseUrl: resolvedHostUrl,
    token: resolvedToken,
  });

  await workingDir.appendLog(
    `Bootstrap started: host=${resolvedHostUrl}, workDir=${baseDir}`,
  );

  console.log(`[importer] checking host API at ${resolvedHostUrl} ...`);
  const result = await ensureHostAvailable(client, {
    maxAttempts,
    retryDelayMs,
  });

  if (!result.success) {
    const errorMsg = `host API unavailable after ${result.attempts} attempts: ${result.errorMessage}`;
    console.error(`[importer] ${errorMsg}`);
    await workingDir.appendLog(`Bootstrap failed: ${errorMsg}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[importer] host API ready (${result.health?.service || "unknown service"}) after ${result.attempts} attempt(s).`,
  );

  // Show what's available
  const stats = await workingDir.getStats();
  console.log(`[importer] working directory stats:`);
  console.log(
    `  - ${stats.csvCount} CSV file(s) staged (${formatBytes(stats.csvTotalSize)})`,
  );
  console.log(`  - ${stats.historyEntries} import(s) in history`);

  // List staged CSVs if any
  const csvs = await workingDir.listStagedCsvs();
  if (csvs.length > 0) {
    console.log(`[importer] staged CSVs:`);
    csvs.forEach((csv) => {
      console.log(`  - ${csv.name} (${formatBytes(csv.size)})`);
    });
  }

  console.log(`[importer] standalone runtime ready. type "help" for commands.`);
  await workingDir.appendLog(`Bootstrap complete: runtime ready`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "Unknown startup error";
  console.error(`[importer] startup failed: ${message}`);
  process.exitCode = 1;
});
