import { DevInspectResults, SuiClient, TransactionEffects } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { BigIntMath } from "../../bigint_math";
import { SUI_COIN_TYPE } from "./constants";

export interface SuiTransactionPrerequisites {
    gasPrice: bigint;
    coinRefs: { objectId: string; version: string; digest: string }[];
}

export async function getGasPriceAndCoinRefs(
    suiClient: SuiClient,
    ownerAddress: string
): Promise<SuiTransactionPrerequisites> {

    const [gasPrice, coins] = await Promise.all([
        suiClient.getReferenceGasPrice(),
        suiClient.getCoins({ owner: ownerAddress, coinType: SUI_COIN_TYPE, limit: 100 })
    ]);

    const coinRefs = coins.data.map(coin => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
    }));

    return { gasPrice: BigInt(gasPrice), coinRefs };
}

export function calculateGasBudget(
    transactionEffects: TransactionEffects,
    increasePercentage: number = 20
): bigint {
    const gasUsed = transactionEffects.gasUsed;
    const computationBudget = BigInt(gasUsed.computationCost);
    const storageBudget = BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);

    const baseBudget = BigIntMath.max(computationBudget, computationBudget + storageBudget);

    return BigIntMath.increaseByPercent(baseBudget, increasePercentage);
}

export function prefillTransaction(
    transaction: Transaction,
    senderAddress: string,
    gasBudget: bigint,
    gasPrice: bigint,
    coinRefs: { objectId: string; version: string; digest: string }[]
) {

    transaction.setSender(senderAddress);
    transaction.setGasPrice(gasPrice);
    transaction.setGasBudget(gasBudget);
    if (coinRefs.length > 0) {
        transaction.setGasPayment(coinRefs);
    } else {
        throw new Error("No gas payment coins provided");
    }
}
