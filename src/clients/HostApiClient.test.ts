import { HostApiClient, HostTimeoutError } from "./HostApiClient";

describe("HostApiClient", () => {
  it("adds bearer token header when configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: [] }),
    });

    const client = new HostApiClient({
      baseUrl: "http://localhost:3000",
      token: "abc123",
      fetchImpl: fetchMock,
    });

    await client.getAccounts();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/importer/accounts",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer abc123",
        }),
      }),
    );
  });

  it("reads health endpoint payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { ok: true, service: "fi-fore-importer-host-api" },
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });
    const health = await client.getHealth();

    expect(health.ok).toBe(true);
    expect(health.service).toBe("fi-fore-importer-host-api");
  });

  it("returns parsed data payload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: [{ id: 1, name: "Cash" }],
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });
    const accounts = await client.getAccounts();

    expect(accounts).toEqual([{ id: 1, name: "Cash" }]);
  });

  it("returns null when account lookup responds with not found", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: "Account not found: 42", code: "NOT_FOUND" },
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });

    await expect(client.getAccountById(42)).resolves.toBeNull();
  });

  it("preserves freshness metadata on import status responses", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: [
            {
              accountId: 1,
              accountName: "Cash",
              accountType: "cash",
              lastImportedAt: null,
              freshnessLabel: "Never",
              freshnessClass: "freshness-never",
            },
          ],
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });
    const statuses = await client.getAccountImportStatuses();

    expect(statuses).toEqual([
      {
        accountId: 1,
        accountName: "Cash",
        accountType: "cash",
        lastImportedAt: null,
        freshnessLabel: "Never",
        freshnessClass: "freshness-never",
      },
    ]);
  });

  it("returns null when an account has no saved mapping", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: null,
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });

    await expect(client.getMappingForAccount(42)).resolves.toBeNull();
  });

  it("throws API message on non-2xx response", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          success: false,
          error: { message: "Unauthorized importer API token" },
        }),
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });

    await expect(client.getAccounts()).rejects.toThrow(
      "Unauthorized importer API token",
    );
  });

  it("throws actionable error when host returns non-json", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<!DOCTYPE html><html><body>Not API</body></html>",
    });

    const client = new HostApiClient({ fetchImpl: fetchMock });

    await expect(client.getHealth()).rejects.toThrow(
      "Host API returned non-JSON response",
    );
  });

  it("sends accountId + standardizedCsv for commit import", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            success: true,
            message: "ok",
            importedCount: 1,
            duplicateCount: 0,
            invalidCount: 0,
          },
        }),
    });

    const client = new HostApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchMock,
    });

    await client.commitImport(42, "date,description,amount,account,category");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/importer/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          accountId: 42,
          standardizedCsv: "date,description,amount,account,category",
        }),
      }),
    );
  });

  it("sends accountId when touching imported freshness", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });

    const client = new HostApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchMock,
    });

    await client.touchImported(42);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/importer/touch-imported",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          accountId: 42,
        }),
      }),
    );
  });

  it("throws HostTimeoutError after configured timeout", async () => {
    const fetchMock = jest
      .fn()
      .mockImplementation(() => new Promise(() => undefined));

    const client = new HostApiClient({
      fetchImpl: fetchMock,
      requestTimeoutMs: 10,
    });

    await expect(client.getHealth()).rejects.toBeInstanceOf(HostTimeoutError);
    await expect(client.getHealth()).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    await expect(client.getHealth()).rejects.toThrow(
      "Host API request failed (TIMEOUT): exceeded 10ms",
    );
  });
});
