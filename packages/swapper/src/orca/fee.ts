import { BN } from "@coral-xyz/anchor";
import { AssetId, Quote } from "@gemwallet/types";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { parsePublicKey } from "../chain/solana/account";

export const BASIS_POINTS_DENOMINATOR = 10_000;
export const MAX_SAFE_NUMBER_BN = new BN(Number.MAX_SAFE_INTEGER.toString());

export function calculateReferralFeeAmount(quote: Quote): BN {
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

export async function applyReferralFee(
    asset: AssetId,
    amountIn: bigint,
    referralBps: bigint,
    resolveProgram: (mint: PublicKey) => Promise<PublicKey>,
): Promise<bigint> {
    if (referralBps <= BigInt(0)) {
        return amountIn;
    }

    if (asset.isNative()) {
        const referralFee = amountIn * referralBps / BigInt(10_000);
        return amountIn - referralFee;
    }

    const tokenId = asset.getTokenId();
    const mintKey = parsePublicKey(tokenId);
    const programId = await resolveProgram(mintKey);
    if (!programId.equals(TOKEN_PROGRAM_ID)) {
        return amountIn;
    }

    const referralFee = amountIn * referralBps / BigInt(10_000);
    return amountIn - referralFee;
}
