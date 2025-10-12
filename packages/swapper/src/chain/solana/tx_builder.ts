import {
    Connection,
    ComputeBudgetProgram,
    TransactionInstruction,
    VersionedTransaction,
    Transaction,
} from "@solana/web3.js";

export const DEFAULT_COMPUTE_UNIT_LIMIT = 420_000;
export const DEFAULT_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = 50_000;
export const PRIORITY_FEE_PERCENTILE = 75;

export async function getRecentBlockhash(connection: Connection, commitment?: "confirmed" | "finalized") {
    return await connection.getLatestBlockhash(commitment || "confirmed");
}

export async function getRecentPriorityFee(connection: Connection): Promise<number> {
    try {
        const recentFees = await connection.getRecentPrioritizationFees();

        if (!recentFees || recentFees.length === 0) {
            return DEFAULT_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS;
        }

        const fees = recentFees
            .map(fee => fee.prioritizationFee)
            .filter(fee => fee > 0)
            .sort((a, b) => a - b);

        if (fees.length === 0) {
            return DEFAULT_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS;
        }

        const medianIndex = Math.floor(fees.length * (PRIORITY_FEE_PERCENTILE / 100));
        const medianFee = fees[medianIndex];

        const recommendedFee = Math.max(
            Math.ceil(medianFee * 1.2),
            1000
        );

        return recommendedFee;
    } catch (error) {
        console.warn("Failed to fetch recent prioritization fees, using default:", error);
        return DEFAULT_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS;
    }
}

export function createComputeUnitLimitInstruction(units: number): TransactionInstruction {
    return ComputeBudgetProgram.setComputeUnitLimit({ units });
}

export function createComputeUnitPriceInstruction(microLamports: number): TransactionInstruction {
    return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
}

export function addComputeBudgetInstructions(
    instructions: TransactionInstruction[],
    computeUnitLimit: number = DEFAULT_COMPUTE_UNIT_LIMIT,
    computeUnitPriceMicroLamports: number = DEFAULT_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS,
): TransactionInstruction[] {
    return [
        createComputeUnitLimitInstruction(computeUnitLimit),
        createComputeUnitPriceInstruction(computeUnitPriceMicroLamports),
        ...instructions,
    ];
}

export function setTransactionBlockhash(
    transaction: VersionedTransaction | Transaction,
    blockhash: string,
    lastValidBlockHeight: number,
): void {
    if (transaction instanceof VersionedTransaction) {
        transaction.message.recentBlockhash = blockhash;
    } else {
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
    }
}

export function serializeTransaction(transaction: VersionedTransaction | Transaction): string {
    const serialized =
        transaction instanceof VersionedTransaction
            ? transaction.serialize()
            : transaction.serialize({
                  requireAllSignatures: false,
              });
    return Buffer.from(serialized).toString("base64");
}
