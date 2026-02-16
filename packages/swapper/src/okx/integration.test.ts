import { Chain, QuoteRequest } from "@gemwallet/types";

import { OkxProvider } from "./provider";
import {
  OKX_API_KEY,
  OKX_API_PASSPHRASE,
  OKX_PROJECT_ID,
  OKX_SECRET_KEY,
} from "./auth";

function hasAuthEnv(): boolean {
  return Boolean(
    process.env[OKX_API_KEY] &&
    process.env[OKX_SECRET_KEY] &&
    process.env[OKX_API_PASSPHRASE] &&
    process.env[OKX_PROJECT_ID],
  );
}

const hasAuth = hasAuthEnv();
const runIntegration = process.env.OKX_INTEGRATION_TEST === "1" && hasAuth;
const describeIntegration = runIntegration ? describe : describe.skip;

const WALLET_ADDRESS = "7g2rVN8fAAQdPh1mkajpvELqYa3gWvFXJsBLnKfEQfqy";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const REQUEST_TEMPLATE: QuoteRequest = {
  from_address: WALLET_ADDRESS,
  to_address: WALLET_ADDRESS,
  from_asset: {
    id: Chain.Solana,
    symbol: "SOL",
    decimals: 9,
  },
  to_asset: {
    id: `${Chain.Solana}_${USDC_MINT}`,
    symbol: "USDC",
    decimals: 6,
  },
  from_value: "1000000",
  referral_bps: 50,
  slippage_bps: 100,
};

describeIntegration("OKX live integration", () => {
  jest.setTimeout(60_000);
  const provider = new OkxProvider();

  it("fetches a live quote and builds quote data", async () => {
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
