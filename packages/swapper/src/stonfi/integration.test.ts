import { Chain, QuoteRequest } from "@gemwallet/types";

import { StonfiProvider } from "./index";
import { createQuoteRequest, TON_ASSET, USDT_TON_ASSET } from "./testkit";

const runIntegration = process.env.STONFI_INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const TON_RPC_ENDPOINT =
    process.env.TON_URL || "https://toncenter.com";

// A valid TON wallet address for testing (TON Foundation address)
const WALLET_ADDRESS = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N";

const REQUEST_TEMPLATE: QuoteRequest = createQuoteRequest({
    from_address: WALLET_ADDRESS,
    to_address: WALLET_ADDRESS,
    from_asset: TON_ASSET,
    to_asset: USDT_TON_ASSET,
    from_value: "1000000000", // 1 TON
    referral_bps: 50,
    slippage_bps: 100,
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describeIntegration("Stonfi live integration", () => {
    jest.setTimeout(60_000);
    const provider = new StonfiProvider(TON_RPC_ENDPOINT);

    // Add delay between tests to avoid rate limiting from public RPC
    afterEach(async () => {
        await delay(2000);
    });

    it("fetches a live quote for TON -> USDT", async () => {
        const quote = await provider.get_quote(REQUEST_TEMPLATE);

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.output_min_value).toBeDefined();

        console.log("TON -> USDT quote", quote);
    });

    it("fetches a live quote and builds quote data for TON -> USDT", async () => {
        const quote = await provider.get_quote(REQUEST_TEMPLATE);

        expect(BigInt(quote.output_value) > 0).toBe(true);

        const quoteData = await provider.get_quote_data(quote);

        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);
        expect(quoteData.to).toBeDefined();
        expect(quoteData.value).toBeDefined();

        console.log("TON -> USDT quoteData", quoteData);
    });

    it("fetches a live quote and builds quote data for USDT -> TON", async () => {
        const reverseRequest = createQuoteRequest({
            from_address: WALLET_ADDRESS,
            to_address: WALLET_ADDRESS,
            from_asset: USDT_TON_ASSET,
            to_asset: TON_ASSET,
            from_value: "1000000", // 1 USDT
            referral_bps: 50,
            slippage_bps: 100,
        });

        const quote = await provider.get_quote(reverseRequest);

        expect(BigInt(quote.output_value) > 0).toBe(true);

        console.log("USDT -> TON quote", quote);

        const quoteData = await provider.get_quote_data(quote);

        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);

        console.log("USDT -> TON quoteData", quoteData);
    });

    it("fetches a live quote for jetton to jetton swap", async () => {
        const NOT_COIN = {
            id: `${Chain.Ton}_EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT`,
            symbol: "NOT",
            decimals: 9,
        };

        const jettonToJettonRequest = createQuoteRequest({
            from_address: WALLET_ADDRESS,
            to_address: WALLET_ADDRESS,
            from_asset: USDT_TON_ASSET,
            to_asset: NOT_COIN,
            from_value: "1000000", // 1 USDT
            referral_bps: 50,
            slippage_bps: 100,
        });

        const quote = await provider.get_quote(jettonToJettonRequest);

        expect(BigInt(quote.output_value) > 0).toBe(true);

        console.log("USDT -> NOT quote", quote);

        const quoteData = await provider.get_quote_data(quote);

        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);

        console.log("USDT -> NOT quoteData", quoteData);
    });
});
