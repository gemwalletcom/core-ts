import { Chain, Quote } from "@gemwallet/types";

import { calculateReferralFeeAmount } from "./index";
import { buildQuoteFixture } from "./test-utils";

describe("calculateReferralFeeAmount", () => {
    const baseQuote = buildQuoteFixture({
        from_asset: {
            id: Chain.Solana,
            symbol: "AAA",
            decimals: 9,
        },
        to_asset: {
            id: Chain.Solana,
            symbol: "SOL",
            decimals: 9,
        },
    });

    it("returns zero when referral_bps is zero", () => {
        const result = calculateReferralFeeAmount(baseQuote);
        expect(result.isZero()).toBe(true);
    });

    it("calculates fee amount using basis points", () => {
        const quote = buildQuoteFixture({
            from_asset: baseQuote.quote.from_asset,
            to_asset: baseQuote.quote.to_asset,
            from_value: "1000000",
            referral_bps: 50,
        });

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
