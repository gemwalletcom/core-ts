import { Quote } from "@gemwallet/types";
import { BN } from "@coral-xyz/anchor";

import {
    calculateReferralFeeAmount,
    bnToNumberSafe,
    BASIS_POINTS_DENOMINATOR,
    MAX_SAFE_NUMBER_BN,
} from "./fee";
import { buildQuoteFixture } from "./testkit";

const buildQuote = (fromValue: string, referralBps: number): Quote =>
    buildQuoteFixture({ from_value: fromValue, referral_bps: referralBps });

describe("fee helpers", () => {
    it("computes referral fee using basis points", () => {
        const quote = buildQuote("100000", 25);
        const expected = new BN("100000").muln(25).divn(BASIS_POINTS_DENOMINATOR);

        const result = calculateReferralFeeAmount(quote);
        expect(result.toString()).toBe(expected.toString());
    });

    it("returns zero when referral bps is not set", () => {
        const quote = buildQuote("100000", 0);
        expect(calculateReferralFeeAmount(quote).isZero()).toBe(true);
    });

    it("throws when from_value is invalid", () => {
        const quote = buildQuote("invalid", 10);
        expect(() => calculateReferralFeeAmount(quote)).toThrow(/Invalid from_value/);
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
