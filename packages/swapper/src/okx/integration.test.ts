import { Chain, QuoteRequest } from "@gemwallet/types";

import { createOkxEvmQuoteRequest, createSolanaUsdcQuoteRequest, MANTA_USDC_ADDRESS } from "../testkit/mock";
import { OkxProvider } from "./provider";

const OKX_ENV_KEYS = ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_API_PASSPHRASE", "OKX_PROJECT_ID"];

function hasAuthEnv(): boolean {
    return OKX_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

const hasAuth = hasAuthEnv();
const runIntegration = process.env.OKX_INTEGRATION_TEST === "1" && hasAuth;
const itIntegration = runIntegration ? it : it.skip;

const SOLANA_REQUEST: QuoteRequest = createSolanaUsdcQuoteRequest();

const MANTA_NATIVE_TO_USDC_REQUEST: QuoteRequest = createOkxEvmQuoteRequest({
    from_value: "10000000000000000",
});

const MANTA_USDC_TO_NATIVE_REQUEST: QuoteRequest = createOkxEvmQuoteRequest({
    from_asset: {
        id: `${Chain.Manta}_${MANTA_USDC_ADDRESS}`,
        symbol: "USDC",
        decimals: 6,
    },
    to_asset: {
        id: Chain.Manta,
        symbol: "ETH",
        decimals: 18,
    },
    from_value: "1000000",
});

describe("OKX live integration", () => {
    jest.setTimeout(60_000);

    describe("Solana", () => {
        itIntegration("fetches a live quote and builds quote data", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(SOLANA_REQUEST);

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

    describe("EVM (Manta)", () => {
        itIntegration("fetches a live quote for native to token swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(MANTA_NATIVE_TO_USDC_REQUEST);

            expect(BigInt(quote.output_value) > BigInt(0)).toBe(true);
            expect(quote.route_data).toBeDefined();
        });

        itIntegration("builds quote data for native to token swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(MANTA_NATIVE_TO_USDC_REQUEST);
            const quoteData = await provider.get_quote_data(quote);

            expect(quoteData.dataType).toBe("contract");
            expect(quoteData.data).toMatch(/^0x/);
            expect(quoteData.to).toMatch(/^0x/);
            expect(quoteData.value).toBeDefined();
            expect(quoteData.approval).toBeUndefined();
        });

        itIntegration("builds quote data with approval for token to native swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(MANTA_USDC_TO_NATIVE_REQUEST);
            const quoteData = await provider.get_quote_data(quote);

            expect(quoteData.dataType).toBe("contract");
            expect(quoteData.data).toMatch(/^0x/);
            expect(quoteData.approval).toBeDefined();
            expect(quoteData.approval!.token).toBe(MANTA_USDC_ADDRESS);
            expect(quoteData.approval!.spender).toMatch(/^0x/);
            expect(quoteData.approval!.value).toBe("1000000");
        });
    });
});
