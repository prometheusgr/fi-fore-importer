import * as fs from "fs";
import * as path from "path";

export interface HostApiConfig {
  url: string;
  token?: string;
}

/**
 * Manages runtime configuration from file and environment.
 * Responsible for: load, save, env var override.
 * NOT responsible for: directory creation, validation beyond syntax.
 */
export class RuntimeConfig {
  private configPath: string;

  constructor(workingDir: string) {
    this.configPath = path.join(workingDir, "config.json");
  }

  async load(): Promise<HostApiConfig> {
    const defaults: HostApiConfig = {
      url: "http://localhost:3000",
      token: undefined,
    };

    if (!fs.existsSync(this.configPath)) {
      return this.merge(defaults);
    }

    try {
      const fileConfig = JSON.parse(
        fs.readFileSync(this.configPath, "utf-8"),
      ) as HostApiConfig;
      return this.merge(fileConfig);
    } catch {
      return this.merge(defaults);
    }
  }

  async save(config: HostApiConfig): Promise<void> {
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Merge config file with environment overrides.
   * Priority: ENV > FILE > DEFAULTS
   */
  merge(
    fileConfig: HostApiConfig,
    overrides: Partial<HostApiConfig> = {},
  ): HostApiConfig {
    return {
      url:
        overrides.url ||
        process.env.HOST_API_URL ||
        fileConfig.url ||
        "http://localhost:3000",
      token: overrides.token || process.env.HOST_API_TOKEN || fileConfig.token,
    };
  }
}
