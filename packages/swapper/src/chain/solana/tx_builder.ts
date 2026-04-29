import {
    Connection,
    ComputeBudgetProgram,
    MessageV0,
    TransactionInstruction,
    VersionedTransaction,
    Transaction,
} from "@solana/web3.js";

const COMPUTE_UNIT_MULTIPLIER = 1.1;

export async function getRecentBlockhash(connection: Connection, commitment?: "confirmed" | "finalized") {
    return await connection.getLatestBlockhash(commitment || "confirmed");
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
