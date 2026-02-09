import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

export const JITO_TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

const JITO_TIP_FLOOR_URL = "https://bundles.jito.wtf/api/v1/bundles/tip_floor";
const MIN_JITO_TIP_LAMPORTS = 10_000;
const LAMPORTS_PER_SOL = 1_000_000_000;

// Jito recommends 70% tip / 30% priority fee split
const PRIORITY_RATIO = 0.3;

export interface JitoBudget {
    tipLamports: number;
    priorityMicroLamports: number;
}

export async function fetchTipFloorLamports(): Promise<number> {
    try {
        const response = await fetch(JITO_TIP_FLOOR_URL);
        if (!response.ok) {
            console.warn(`[jito] tip_floor request failed: ${response.status}`);
            return MIN_JITO_TIP_LAMPORTS;
        }
        const data = await response.json();
        const entry = Array.isArray(data) ? data[0] : data;
        const tipSol = entry?.landed_tips_75th_percentile;
        if (typeof tipSol !== "number" || !Number.isFinite(tipSol) || tipSol <= 0) {
            return MIN_JITO_TIP_LAMPORTS;
        }
        const tipLamports = Math.ceil(tipSol * LAMPORTS_PER_SOL);
        return Math.max(tipLamports, MIN_JITO_TIP_LAMPORTS);
    } catch (error) {
        console.warn("[jito] failed to fetch tip floor, using minimum:", error);
        return MIN_JITO_TIP_LAMPORTS;
    }
}

export async function getJitoBudget(estimatedPriorityMicroLamports: number): Promise<JitoBudget> {
    const tipFloor = await fetchTipFloorLamports();
    const priorityMicroLamports = Math.max(Math.ceil(estimatedPriorityMicroLamports * PRIORITY_RATIO), 1000);
    return { tipLamports: tipFloor, priorityMicroLamports };
}

export function createJitoTipInstruction(
    fromPubkey: PublicKey,
    lamports: number,
): TransactionInstruction {
    const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
    return SystemProgram.transfer({
        fromPubkey,
        toPubkey: new PublicKey(tipAccount),
        lamports,
    });
}
