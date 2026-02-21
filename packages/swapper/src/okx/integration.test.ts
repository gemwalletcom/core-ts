// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../../.env" });

import { Chain, QuoteRequest } from "@gemwallet/types";

import { createOkxEvmQuoteRequest, createSolanaUsdcQuoteRequest, XLAYER_USD0_ADDRESS } from "../testkit/mock";
import { OkxDexClient } from "./client";
import { CHAIN_INDEX } from "./constants";
import { OkxProvider } from "./provider";

const OKX_ENV_KEYS = ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_API_PASSPHRASE", "OKX_PROJECT_ID"];

function hasAuthEnv(): boolean {
    return OKX_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

const hasAuth = hasAuthEnv();
const runIntegration = process.env.INTEGRATION_TEST === "1" && hasAuth;
const itIntegration = runIntegration ? it : it.skip;

function createClient(): OkxDexClient {
    return new OkxDexClient({
        apiKey: process.env.OKX_API_KEY!,
        secretKey: process.env.OKX_SECRET_KEY!,
        apiPassphrase: process.env.OKX_API_PASSPHRASE!,
        projectId: process.env.OKX_PROJECT_ID!,
    });
}

const SOLANA_REQUEST: QuoteRequest = createSolanaUsdcQuoteRequest();

const XLAYER_NATIVE_TO_USD0_REQUEST: QuoteRequest = createOkxEvmQuoteRequest({
    from_value: "10000000000000000",
});

const XLAYER_NATIVE_TO_USD0_LARGE_REQUEST: QuoteRequest = createOkxEvmQuoteRequest({
    from_value: "100000000000000000",
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

    describe("EVM (XLayer)", () => {
        itIntegration("fetches a live quote for native to token swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(XLAYER_NATIVE_TO_USD0_REQUEST);

            expect(BigInt(quote.output_value) > BigInt(0)).toBe(true);
            expect(quote.route_data).toBeDefined();
        });

        itIntegration("builds quote data for native to token swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(XLAYER_NATIVE_TO_USD0_REQUEST);
            const quoteData = await provider.get_quote_data(quote);

            expect(quoteData.dataType).toBe("contract");
            expect(quoteData.data).toMatch(/^0x/);
            expect(quoteData.to).toMatch(/^0x/);
            expect(quoteData.value).toBeDefined();
        });

        itIntegration("builds quote data with gasLimit for larger native swap", async () => {
            const provider = new OkxProvider(process.env.SOLANA_URL || "https://solana-rpc.publicnode.com");
            const quote = await provider.get_quote(XLAYER_NATIVE_TO_USD0_LARGE_REQUEST);
            const quoteData = await provider.get_quote_data(quote);

            expect(quoteData.dataType).toBe("contract");
            expect(quoteData.data).toMatch(/^0x/);
            expect(quoteData.gasLimit).toBe("800000");
            expect(quoteData.approval).toBeUndefined();
        });
    });

    describe("Chain Data", () => {
        itIntegration("fetches XLayer approve spender address", async () => {
            const client = createClient();
            const response = await client.getChainData(CHAIN_INDEX[Chain.XLayer]);

            expect(response.code).toBe("0");
            expect(response.data.length).toBeGreaterThan(0);

            const chainData = response.data[0];
            console.log(`\nXLayer chain data:`);
            console.log(`  chainIndex: ${chainData.chainIndex}`);
            console.log(`  chainName: ${chainData.chainName}`);
            console.log(`  dexTokenApproveAddress: ${chainData.dexTokenApproveAddress}`);
        });
    });
});
