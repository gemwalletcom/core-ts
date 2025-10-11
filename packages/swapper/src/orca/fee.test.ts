import { Chain, Quote } from "@gemwallet/types";
import { BN } from "@coral-xyz/anchor";

import {
    calculateReferralFeeLamports,
    bnToNumberSafe,
    BASIS_POINTS_DENOMINATOR,
    MAX_SAFE_NUMBER_BN,
} from "./fee";

function buildQuote(fromValue: string, referralBps: number): Quote {
    return {
        quote: {
            from_address: "ref-test-from",
            to_address: "ref-test-to",
            from_asset: {
                id: Chain.Solana,
                symbol: "SOL",
                decimals: 9,
            },
            to_asset: {
                id: Chain.Solana,
                symbol: "USDC",
                decimals: 6,
            },
            from_value: fromValue,
            referral_bps: referralBps,
            slippage_bps: 100,
        },
        output_value: "0",
        output_min_value: "0",
        eta_in_seconds: 0,
        route_data: {},
    };
}

describe("fee helpers", () => {
    it("computes referral fee using basis points", () => {
        const quote = buildQuote("100000", 25);
        const expected = new BN("100000").muln(25).divn(BASIS_POINTS_DENOMINATOR);

        const result = calculateReferralFeeLamports(quote);
        expect(result.toString()).toBe(expected.toString());
    });

    it("returns zero when referral bps is not set", () => {
        const quote = buildQuote("100000", 0);
        expect(calculateReferralFeeLamports(quote).isZero()).toBe(true);
    });

    it("throws when from_value is invalid", () => {
        const quote = buildQuote("invalid", 10);
        expect(() => calculateReferralFeeLamports(quote)).toThrow(/Invalid from_value/);
    });

    it("converts BN to number within safe range", () => {
        const safeValue = MAX_SAFE_NUMBER_BN.subn(1);
        expect(bnToNumberSafe(safeValue)).toBe(Number(safeValue.toString()));
    });

    it("throws when BN exceeds safe range", () => {
        const unsafe = MAX_SAFE_NUMBER_BN.addn(1);
        expect(() => bnToNumberSafe(unsafe)).toThrow(/safe integer range/);
    });
});
