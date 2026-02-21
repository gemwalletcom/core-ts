import { buildHeaders, buildQueryString, sign } from "./auth";

describe("OKX auth", () => {
    describe("buildQueryString", () => {
        it("returns empty string for empty params", () => {
            expect(buildQueryString({})).toBe("");
        });

        it("builds query string from params", () => {
            const qs = buildQueryString({ chainIndex: "501", amount: "1000" });
            expect(qs).toBe("?chainIndex=501&amount=1000");
        });

        it("filters out undefined and null values", () => {
            const qs = buildQueryString({ chainIndex: "501", dexIds: undefined, feePercent: null });
            expect(qs).toBe("?chainIndex=501");
        });

        it("encodes special characters", () => {
            const qs = buildQueryString({ key: "a b&c" });
            expect(qs).toBe("?key=a%20b%26c");
        });
    });

    describe("sign", () => {
        it("produces stable HMAC-SHA256 signature", () => {
            const sig = sign("2026-01-01T00:00:00.000Z", "GET", "/api/v6/dex/aggregator/quote?chainIndex=501", "test-secret");
            expect(sig).toBe(sign("2026-01-01T00:00:00.000Z", "GET", "/api/v6/dex/aggregator/quote?chainIndex=501", "test-secret"));
            expect(typeof sig).toBe("string");
            expect(sig.length).toBeGreaterThan(0);
        });

        it("changes with different timestamps", () => {
            const sig1 = sign("2026-01-01T00:00:00.000Z", "GET", "/path", "secret");
            const sig2 = sign("2026-01-02T00:00:00.000Z", "GET", "/path", "secret");
            expect(sig1).not.toBe(sig2);
        });

        it("changes with different paths", () => {
            const sig1 = sign("2026-01-01T00:00:00.000Z", "GET", "/path-a", "secret");
            const sig2 = sign("2026-01-01T00:00:00.000Z", "GET", "/path-b", "secret");
            expect(sig1).not.toBe(sig2);
        });

        it("changes with different secrets", () => {
            const sig1 = sign("2026-01-01T00:00:00.000Z", "GET", "/path", "secret-a");
            const sig2 = sign("2026-01-01T00:00:00.000Z", "GET", "/path", "secret-b");
            expect(sig1).not.toBe(sig2);
        });
    });

    describe("buildHeaders", () => {
        it("includes all required OKX headers", () => {
            const config = {
                apiKey: "test-key",
                secretKey: "test-secret",
                apiPassphrase: "test-pass",
                projectId: "test-project",
            };
            const headers = buildHeaders(config, "2026-01-01T00:00:00.000Z", "/api/v6/dex/aggregator/quote");

            expect(headers["OK-ACCESS-KEY"]).toBe("test-key");
            expect(headers["OK-ACCESS-PASSPHRASE"]).toBe("test-pass");
            expect(headers["OK-ACCESS-PROJECT"]).toBe("test-project");
            expect(headers["OK-ACCESS-TIMESTAMP"]).toBe("2026-01-01T00:00:00.000Z");
            expect(headers["OK-ACCESS-SIGN"]).toBeDefined();
            expect(headers["Content-Type"]).toBe("application/json");
        });

        it("sign matches HMAC-SHA256 of timestamp+method+path", () => {
            const config = {
                apiKey: "k",
                secretKey: "my-secret",
                apiPassphrase: "p",
                projectId: "proj",
            };
            const timestamp = "2026-01-01T00:00:00.000Z";
            const path = "/api/v6/dex/aggregator/quote?chainIndex=501";
            const headers = buildHeaders(config, timestamp, path);

            expect(headers["OK-ACCESS-SIGN"]).toBe(sign(timestamp, "GET", path, "my-secret"));
        });
    });
});
