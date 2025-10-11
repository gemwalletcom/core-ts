import { BN } from "@coral-xyz/anchor";
import { Quote } from "@gemwallet/types";

export const BASIS_POINTS_DENOMINATOR = 10_000;
export const MAX_SAFE_NUMBER_BN = new BN(Number.MAX_SAFE_INTEGER.toString());

export function calculateReferralFeeLamports(quote: Quote): BN {
    const referralBps = quote.quote.referral_bps ?? 0;
    if (referralBps <= 0) {
        return new BN(0);
    }

    let fromAmount: BN;
    try {
        fromAmount = new BN(quote.quote.from_value);
    } catch {
        throw new Error("Invalid from_value provided for referral calculation");
    }

    if (fromAmount.isZero()) {
        return new BN(0);
    }

    return fromAmount.muln(referralBps).divn(BASIS_POINTS_DENOMINATOR);
}

export function bnToNumberSafe(value: BN): number {
    if (value.gt(MAX_SAFE_NUMBER_BN)) {
        throw new Error("Referral fee exceeds JavaScript safe integer range");
    }
    return value.toNumber();
}
