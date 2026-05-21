import type { HostApiClient, HostHealth } from "../clients/HostApiClient";

export interface HostHandshakeOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
}

export interface HostHandshakeResult {
  success: boolean;
  attempts: number;
  health?: HostHealth;
  errorMessage?: string;
}

export async function ensureHostAvailable(
  client: Pick<HostApiClient, "getHealth">,
  options: HostHandshakeOptions = {},
): Promise<HostHandshakeResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 500;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const health = await client.getHealth();
      if (health.ok) {
        return {
          success: true,
          attempts: attempt,
          health,
        };
      }

      lastError = new Error("Host health endpoint responded with ok=false");
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return {
    success: false,
    attempts: maxAttempts,
    errorMessage:
      lastError instanceof Error
        ? lastError.message
        : "Unknown host availability error",
  };
}
