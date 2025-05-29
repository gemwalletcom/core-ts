import { TransactionEffects } from "@mysten/sui/client";
import { BN } from "bn.js";

export function CalculateGasBudget(gasUsed: TransactionEffects) {
    const computationBudget = new BN(gasUsed.gasUsed.computationCost);
    const storageCost = new BN(gasUsed.gasUsed.storageCost);
    const storageRebate = new BN(gasUsed.gasUsed.storageRebate);

    const budget = BN.max(computationBudget, computationBudget.add(storageCost).sub(storageRebate));
    return Math.floor(budget.muln(120).divn(100).toNumber());
}
