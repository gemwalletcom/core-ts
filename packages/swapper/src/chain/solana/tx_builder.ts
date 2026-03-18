import {
    Connection,
    ComputeBudgetProgram,
    MessageV0,
    PublicKey,
    TransactionInstruction,
    VersionedTransaction,
    Transaction,
} from "@solana/web3.js";

export const DEFAULT_COMPUTE_UNIT_LIMIT = 420_000;
export const DEFAULT_COMPUTE_UNIT_PRICE = 50_000;
export const COMPUTE_UNIT_MULTIPLIER = 1.1;
export const PRIORITY_FEE_PERCENTILE = 75;

export async function getRecentBlockhash(connection: Connection, commitment?: "confirmed" | "finalized") {
    return await connection.getLatestBlockhash(commitment || "confirmed");
}

export async function getRecentPriorityFee(
    connection: Connection,
    lockedWritableAccounts?: PublicKey[],
): Promise<number> {
    try {
        const config = lockedWritableAccounts ? { lockedWritableAccounts } : undefined;
        const recentFees = await connection.getRecentPrioritizationFees(config);

        if (!recentFees || recentFees.length === 0) {
            return DEFAULT_COMPUTE_UNIT_PRICE;
        }

        const fees = recentFees
            .map((fee) => fee.prioritizationFee)
            .filter((fee) => fee > 0)
            .sort((a, b) => a - b);

        if (fees.length === 0) {
            return DEFAULT_COMPUTE_UNIT_PRICE;
        }

        const percentileIndex = Math.floor(fees.length * (PRIORITY_FEE_PERCENTILE / 100));
        const percentileFee = fees[Math.min(percentileIndex, fees.length - 1)];

        const recommendedFee = Math.max(Math.ceil(percentileFee * 1.2), 1000);

        return recommendedFee;
    } catch (error) {
        void error;
        return DEFAULT_COMPUTE_UNIT_PRICE;
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
    computeUnitPriceMicroLamports: number = DEFAULT_COMPUTE_UNIT_PRICE,
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

const COMPUTE_BUDGET_PROGRAM_ID = ComputeBudgetProgram.programId;
const SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT = 2;

export function findComputeUnitLimit(instructions: TransactionInstruction[]): string | undefined {
    for (const ix of instructions) {
        if (!ix.programId.equals(COMPUTE_BUDGET_PROGRAM_ID)) continue;
        if (ix.data.length >= 5 && ix.data[0] === SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT) {
            const units = ix.data.readUInt32LE(1);
            return units.toString();
        }
    }
    return undefined;
}

export async function estimateComputeUnitLimit(
    connection: Connection,
    transaction: Transaction | VersionedTransaction,
): Promise<number | undefined> {
    try {
        const versionedTx =
            transaction instanceof VersionedTransaction
                ? transaction
                : new VersionedTransaction(
                      MessageV0.compile({
                          payerKey: transaction.feePayer!,
                          instructions: transaction.instructions,
                          recentBlockhash: transaction.recentBlockhash!,
                      }),
                  );
        const response = await connection.simulateTransaction(versionedTx, {
            replaceRecentBlockhash: true,
            sigVerify: false,
        });
        if (response.value.err) {
            return undefined;
        }
        if (response.value.unitsConsumed && response.value.unitsConsumed > 0) {
            return Math.ceil(response.value.unitsConsumed * COMPUTE_UNIT_MULTIPLIER);
        }
    } catch (error) {
        void error;
    }
    return undefined;
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
