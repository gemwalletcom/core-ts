// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../../.env" });

import { Chain, QuoteRequest } from "@gemwallet/types";

import { BigIntMath } from "../bigint_math";
import { APTOS_USDT_FA, createAptosUsdcQuoteRequest } from "../testkit/mock";

const runIntegration = process.env.INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const APT_DECIMALS = 8;
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;

const REQUEST_TEMPLATE: QuoteRequest = createAptosUsdcQuoteRequest();

describeIntegration("Panora live integration", () => {
    jest.setTimeout(60_000);

    let provider: import("./provider").PanoraProvider;

    beforeAll(async () => {
        const { PanoraProvider } = await import("./provider");
        provider = new PanoraProvider({
            apiKey: process.env.PANORA_API_KEY,
        });
    });

    it("fetches a live quote and wraps tx data (10 APT -> USDC)", async () => {
        const quote = await provider.get_quote(REQUEST_TEMPLATE);

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.output_value).toMatch(/^\d+$/);
        expect(quote.output_min_value).toMatch(/^\d+$/);
        expect(quote.route_data).toBeDefined();

        const quoteData = await provider.get_quote_data(quote);
        const payload = JSON.parse(quoteData.data) as {
            type: string;
            function: string;
            type_arguments: string[];
            arguments: unknown[];
        };

        const outputValue = BigIntMath.formatDecimals(quote.output_value, USDC_DECIMALS);
        const outputMinValue = BigIntMath.formatDecimals(quote.output_min_value, USDC_DECIMALS);
        console.log("Panora 10 APT -> USDC output:", outputValue);
        console.log("Panora 10 APT -> USDC min:", outputMinValue);
        expect(Number(outputValue)).toBeGreaterThan(0);

        expect(payload.type).toBe("entry_function_payload");
        expect(payload.function).toBeDefined();
        expect(Array.isArray(payload.type_arguments)).toBe(true);
        expect(Array.isArray(payload.arguments)).toBe(true);
    });

    it("fetches a live quote for USDT -> APT", async () => {
        const request: QuoteRequest = {
            ...REQUEST_TEMPLATE,
            from_asset: {
                id: `${Chain.Aptos}_${APTOS_USDT_FA}`,
                symbol: "USDT",
                decimals: USDT_DECIMALS,
            },
            to_asset: {
                id: Chain.Aptos,
                symbol: "APT",
                decimals: APT_DECIMALS,
            },
            from_value: "4000000",
        };

        const quote = await provider.get_quote(request);

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.output_value).toMatch(/^\d+$/);
        expect(quote.output_min_value).toMatch(/^\d+$/);

        const outputValue = BigIntMath.formatDecimals(quote.output_value, APT_DECIMALS);
        const outputMinValue = BigIntMath.formatDecimals(quote.output_min_value, APT_DECIMALS);
        console.log("Panora 4 USDT -> APT output:", outputValue);
        console.log("Panora 4 USDT -> APT min:", outputMinValue);
        expect(Number(outputValue)).toBeGreaterThan(1);
    });
});
