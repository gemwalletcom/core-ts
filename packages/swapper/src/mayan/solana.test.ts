import { Keypair, SystemProgram } from "@solana/web3.js";
import { createJitoTipInstruction, getJitoBudget, JITO_TIP_ACCOUNTS } from "../chain/solana/jito";

describe("getJitoBudget", () => {
    it("applies 70/30 split to priority fee", async () => {
        const budget = await getJitoBudget(100_000);

        expect(budget.priorityMicroLamports).toBe(30_000);
        expect(budget.tipLamports).toBeGreaterThanOrEqual(10_000);
    });

    it("enforces minimum priority fee of 1000 micro-lamports", async () => {
        const budget = await getJitoBudget(0);

        expect(budget.priorityMicroLamports).toBe(1000);
        expect(budget.tipLamports).toBeGreaterThanOrEqual(10_000);
    });
});

describe("createJitoTipInstruction", () => {
    it("creates a SystemProgram transfer to a known Jito tip account", () => {
        const payer = Keypair.generate().publicKey;
        const instruction = createJitoTipInstruction(payer, 10_000);

        expect(instruction.programId.equals(SystemProgram.programId)).toBe(true);
        expect(instruction.keys).toHaveLength(2);
        expect(instruction.keys[0].pubkey.equals(payer)).toBe(true);
        expect(instruction.keys[0].isSigner).toBe(true);
        expect(instruction.keys[0].isWritable).toBe(true);
        expect(JITO_TIP_ACCOUNTS).toContain(instruction.keys[1].pubkey.toBase58());
        expect(instruction.keys[1].isSigner).toBe(false);
        expect(instruction.keys[1].isWritable).toBe(true);
    });
});
