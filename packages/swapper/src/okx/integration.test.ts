import { QuoteRequest } from "@gemwallet/types";

import { OkxProvider } from "./provider";
import { createSolanaUsdcQuoteRequest } from "../testkit/mock";

const OKX_ENV_KEYS = ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_API_PASSPHRASE", "OKX_PROJECT_ID"];

function hasAuthEnv(): boolean {
  return OKX_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

const hasAuth = hasAuthEnv();
const runIntegration = process.env.OKX_INTEGRATION_TEST === "1" && hasAuth;
const itIntegration = runIntegration ? it : it.skip;

const REQUEST_TEMPLATE: QuoteRequest = createSolanaUsdcQuoteRequest();

describe("OKX live integration", () => {
  jest.setTimeout(60_000);

  itIntegration("fetches a live quote and builds quote data", async () => {
    const provider = new OkxProvider();
    const quote = await provider.get_quote(REQUEST_TEMPLATE);

    expect(BigInt(quote.output_value) > BigInt(0)).toBe(true);
    expect(quote.route_data).toBeDefined();

    const quoteData = await provider.get_quote_data(quote);

    expect(quoteData.dataType).toBe("contract");
    expect(typeof quoteData.data).toBe("string");
    expect(quoteData.data.length).toBeGreaterThan(0);
    expect(typeof quoteData.to).toBe("string");
    expect(quoteData.to.length).toBeGreaterThan(0);

    const serialized = Buffer.from(quoteData.data, "base64");
    expect(serialized.length).toBeGreaterThan(0);
  });
});
