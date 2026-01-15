import { Chain, QuoteRequest } from "@gemwallet/types";

const runIntegration = process.env.PANORA_INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const APTOS_USDC_FA = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
const APTOS_USDT_FA = "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b";
const WALLET_ADDRESS = "0x4eb20e735591a85bb58921ef2e6b55c385bba10e817ffe1e02e50deb6c594aef";

const APT_DECIMALS = 8;
const USDC_DECIMALS = 6;
const USDT_DECIMALS = 6;

const REQUEST_TEMPLATE: QuoteRequest = {
    from_address: WALLET_ADDRESS,
    to_address: WALLET_ADDRESS,
    from_asset: {
        id: Chain.Aptos,
        symbol: "APT",
        decimals: APT_DECIMALS,
    },
    to_asset: {
        id: `${Chain.Aptos}_${APTOS_USDC_FA}`,
        symbol: "USDC",
        decimals: USDC_DECIMALS,
    },
    from_value: "1000000000",
    referral_bps: 10,
    slippage_bps: 100,
};

describeIntegration("Panora live integration", () => {
    jest.setTimeout(60_000);

    let provider: import("./provider").PanoraProvider;

    beforeAll(async () => {
        const { PanoraProvider } = await import("./provider");
        provider = new PanoraProvider({
            panoraApiKey: process.env.PANORA_API_KEY,
            rpcUrl: process.env.APTOS_RPC,
        });
    });

    function formatAmount(value: string, decimals: number): string {
        const raw = BigInt(value);
        if (decimals <= 0) {
            return raw.toString();
        }
        const divisor = BigInt(10) ** BigInt(decimals);
        const whole = raw / divisor;
        const fraction = raw % divisor;
        const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
        if (!fractionStr) {
            return whole.toString();
        }
        return `${whole.toString()}.${fractionStr}`;
    }

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

        const outputValue = formatAmount(quote.output_value, USDC_DECIMALS);
        const outputMinValue = formatAmount(quote.output_min_value, USDC_DECIMALS);
        console.log("Panora 10 APT -> USDC output:", outputValue);
        console.log("Panora 10 APT -> USDC min:", outputMinValue);
        expect(Number(outputValue)).toBeGreaterThan(10);

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

        const outputValue = formatAmount(quote.output_value, APT_DECIMALS);
        const outputMinValue = formatAmount(quote.output_min_value, APT_DECIMALS);
        console.log("Panora 4 USDT -> APT output:", outputValue);
        console.log("Panora 4 USDT -> APT min:", outputMinValue);
        expect(Number(outputValue)).toBeGreaterThan(1);
    });
});
