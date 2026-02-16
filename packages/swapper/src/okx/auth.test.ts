import {
  OK_ACCESS_KEY,
  OK_ACCESS_PASSPHRASE,
  OK_ACCESS_PROJECT,
  OK_ACCESS_SIGN,
  OkxAuth,
} from "./auth";

describe("OkxAuth", () => {
  it("builds signed headers", () => {
    const auth = new OkxAuth({
      apiKey: "api-key",
      secretKey: "secret",
      apiPassphrase: "passphrase",
      projectId: "project-id",
    });

    const headers = auth.buildHeaders(
      "GET",
      "/api/v6/dex/aggregator/quote",
      "?chainIndex=501",
      "2026-02-16T00:00:00.000Z",
    );

    expect(headers[OK_ACCESS_KEY]).toBe("api-key");
    expect(headers[OK_ACCESS_PASSPHRASE]).toBe("passphrase");
    expect(headers[OK_ACCESS_PROJECT]).toBe("project-id");
    expect(headers[OK_ACCESS_SIGN]).toBe("t034LYistmn2EYXimh2NDXqTO39C5xVxPvwwRLBWDIM=");
  });
});
