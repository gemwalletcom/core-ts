import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

import { OrcaWhirlpoolProvider, calculateReferralFeeAmount } from "./index";

const RPC_ENDPOINT = "https://example.invalid";

function createRequest(chain: Chain): QuoteRequest {
    return {
        from_address: "A1testfromAddress1111111111111111111111111",
        to_address: "A1testtoAddress11111111111111111111111111",
        from_asset: {
            id: chain,
            symbol: "AAA",
            decimals: 9,
        },
        to_asset: {
            id: Chain.Solana,
            symbol: "SOL",
            decimals: 9,
        },
        from_value: "1",
        referral_bps: 0,
        slippage_bps: 100,
    };
}

describe("OrcaWhirlpoolProvider", () => {
    it("rejects non-Solana assets", async () => {
        const provider = new OrcaWhirlpoolProvider(RPC_ENDPOINT);
        await expect(provider.get_quote(createRequest(Chain.Ethereum))).rejects.toThrow(
            /Only Solana assets are supported by Orca/,
        );
    });

    it("rejects invalid route data", async () => {
        const provider = new OrcaWhirlpoolProvider(RPC_ENDPOINT);
        const quote: Quote = {
            quote: createRequest(Chain.Solana),
            output_value: "0",
            output_min_value: "0",
            eta_in_seconds: 0,
            route_data: {},
        };

        await expect(provider.get_quote_data(quote)).rejects.toThrow(
            /Invalid Orca route data/,
        );
    });
});

describe("calculateReferralFeeAmount", () => {
    const baseQuote: Quote = {
        quote: createRequest(Chain.Solana),
        output_value: "0",
        output_min_value: "0",
        eta_in_seconds: 0,
        route_data: {},
    };

    it("returns zero when referral_bps is zero", () => {
        const result = calculateReferralFeeAmount(baseQuote);
        expect(result.isZero()).toBe(true);
    });

    it("calculates fee amount using basis points", () => {
        const quote: Quote = {
            ...baseQuote,
            quote: {
                ...baseQuote.quote,
                from_value: "1000000",
                referral_bps: 50,
            },
        };

        const result = calculateReferralFeeAmount(quote);
        expect(result.toString()).toBe("5000");
    });

    it("throws on invalid from_value", () => {
        const quote: Quote = {
            ...baseQuote,
            quote: {
                ...baseQuote.quote,
                from_value: "invalid",
                referral_bps: 100,
            },
        };

        expect(() => calculateReferralFeeAmount(quote)).toThrow(
            /Invalid from_value provided/
        );
    });
});
