import type {
  AccountContext,
  AccountImportStatus,
  ImportCommitResult,
  ImportPreview,
  SaveMappingInput,
  SavedMappingRecord,
  SavedMappingSummary,
} from "../contracts/ImporterHostAdapters";

export interface HostHealth {
  ok: boolean;
  service?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error?: {
    message?: string;
    code?: string;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type HostErrorCode = "TIMEOUT" | "NOT_FOUND" | "NETWORK_ERROR";

type HostError = Error & { code?: HostErrorCode | string };

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export interface HostApiClientOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: FetchLike;
  requestTimeoutMs?: number;
}

export class HostTimeoutError extends Error {
  code: HostErrorCode;

  constructor(message: string) {
    super(message);
    this.name = "HostTimeoutError";
    this.code = "TIMEOUT";
  }
}

export class HostApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: HostApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );
    this.token = options.token;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000;
    this.fetchImpl =
      options.fetchImpl ||
      (globalThis.fetch as unknown as FetchLike) ||
      (() => {
        throw new Error("fetch is not available; provide fetchImpl");
      });
  }

  async getAccounts(): Promise<AccountContext[]> {
    return this.get<AccountContext[]>("/api/importer/accounts");
  }

  async getHealth(): Promise<HostHealth> {
    return this.get<HostHealth>("/api/importer/health");
  }

  async getAccountById(accountId: number): Promise<AccountContext | null> {
    try {
      return await this.get<AccountContext>(
        `/api/importer/accounts/${accountId}`,
      );
    } catch (err) {
      if (this.getErrorCode(err) === "NOT_FOUND") {
        return null;
      }
      throw err;
    }
  }

  async getAccountImportStatuses(): Promise<AccountImportStatus[]> {
    return this.get<AccountImportStatus[]>(
      "/api/importer/accounts/import-status",
    );
  }

  async getAllMappings(): Promise<SavedMappingSummary[]> {
    return this.get<SavedMappingSummary[]>("/api/importer/mappings");
  }

  async getMappingForAccount(
    accountId: number,
  ): Promise<SavedMappingRecord | null> {
    return this.get<SavedMappingRecord | null>(
      `/api/importer/mappings/${accountId}`,
    );
  }

  async saveMapping(input: SaveMappingInput): Promise<SavedMappingRecord> {
    return this.post<SavedMappingRecord>("/api/importer/mappings", input);
  }

  async deleteMapping(mappingId: number): Promise<void> {
    await this.del(`/api/importer/mappings/${mappingId}`);
  }

  async previewImport(
    accountId: number,
    standardizedCsv: string,
  ): Promise<ImportPreview> {
    return this.post<ImportPreview>("/api/importer/preview", {
      accountId,
      standardizedCsv,
    });
  }

  async commitImport(
    accountId: number,
    standardizedCsv: string,
  ): Promise<ImportCommitResult> {
    return this.post<ImportCommitResult>("/api/importer/import", {
      accountId,
      standardizedCsv,
    });
  }

  async touchImported(accountId: number): Promise<void> {
    await this.post<void>("/api/importer/touch-imported", {
      accountId,
    });
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, "GET");
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, "POST", body);
  }

  private async del(path: string): Promise<void> {
    await this.request<void>(path, "DELETE");
  }

  private async request<T>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchWithTimeout(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const raw = await response.text();
    let parsed: ApiResponse<T> | undefined;
    if (raw) {
      try {
        parsed = JSON.parse(raw) as ApiResponse<T>;
      } catch {
        const preview = raw.slice(0, 80).replace(/\s+/g, " ").trim();
        throw new Error(
          `Host API returned non-JSON response (preview: ${preview || "empty"}). Ensure fi-fore is running with FEATURE_IMPORTER_API_ENABLED=true and request /api/importer/* routes.`,
        );
      }
    }

    if (!response.ok) {
      const message =
        parsed && "error" in parsed && parsed.error?.message
          ? parsed.error.message
          : `Host API request failed (${response.status})`;
      const error = new Error(message) as HostError;
      if (response.status === 404) {
        error.code = "NOT_FOUND";
      }
      throw error;
    }

    if (!parsed || !("success" in parsed) || !parsed.success) {
      throw new Error("Invalid host API response payload");
    }

    return parsed.data;
  }

  private async fetchWithTimeout(
    path: string,
    init: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    },
  ): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new HostTimeoutError(
            `Host API request failed (TIMEOUT): exceeded ${this.requestTimeoutMs}ms`,
          ),
        );
      }, this.requestTimeoutMs);
    });

    try {
      return await Promise.race([
        this.fetchImpl(`${this.baseUrl}${path}`, init),
        timeoutPromise,
      ]);
    } catch (error) {
      if (error instanceof HostTimeoutError) {
        throw error;
      }

      const networkError =
        error instanceof Error
          ? (error as HostError)
          : (new Error(String(error)) as HostError);
      networkError.code = "NETWORK_ERROR";
      throw networkError;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private getErrorCode(error: unknown): string | undefined {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      return (error as { code: string }).code;
    }

    return undefined;
  }
}
