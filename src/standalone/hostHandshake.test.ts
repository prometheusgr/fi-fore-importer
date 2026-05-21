import { ensureHostAvailable } from "./hostHandshake";

describe("ensureHostAvailable", () => {
  it("returns success when host health is ok", async () => {
    const client = {
      getHealth: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await ensureHostAvailable(client as any, {
      maxAttempts: 1,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(client.getHealth).toHaveBeenCalledTimes(1);
  });

  it("retries until host becomes available", async () => {
    const client = {
      getHealth: jest
        .fn()
        .mockRejectedValueOnce(new Error("connection refused"))
        .mockResolvedValueOnce({
          ok: true,
          service: "fi-fore-importer-host-api",
        }),
    };

    const result = await ensureHostAvailable(client as any, {
      maxAttempts: 2,
      retryDelayMs: 1,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(client.getHealth).toHaveBeenCalledTimes(2);
  });

  it("returns failure after exhausting attempts", async () => {
    const client = {
      getHealth: jest.fn().mockRejectedValue(new Error("host unavailable")),
    };

    const result = await ensureHostAvailable(client as any, {
      maxAttempts: 2,
      retryDelayMs: 1,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.errorMessage).toBe("host unavailable");
  });
});
