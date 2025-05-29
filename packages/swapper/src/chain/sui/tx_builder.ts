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
    const gasPrice = BigInt(await suiClient.getReferenceGasPrice());
    const coins = await suiClient.getCoins({ owner: ownerAddress, coinType: SUI_COIN_TYPE, limit: 100 });
    const coinRefs = coins.data.map(coin => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
    }));

    if (coinRefs.length === 0) {
        console.warn(`No SUI coins found for gas payment for address ${ownerAddress}. Ensure gas is provided by other means or use a different gas coin type.`);
    }

    return { gasPrice, coinRefs };
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

export async function buildSuiTransaction(
    suiClient: SuiClient,
    transactionBlock: Transaction,
    senderAddress: string,
    gasBudget: bigint,
    gasPrice: bigint,
    coinRefs: { objectId: string; version: string; digest: string }[]
): Promise<string> {
    try {
        transactionBlock.setSender(senderAddress);
        transactionBlock.setGasPrice(gasPrice);
        transactionBlock.setGasBudget(gasBudget);
        if (coinRefs.length > 0) {
            transactionBlock.setGasPayment(coinRefs);
        } else {
            throw new Error("No gas payment coins provided");
        }

        const serializedTx = await transactionBlock.build({ client: suiClient });
        return Buffer.from(serializedTx).toString("base64");
    } catch (error) {
        console.error("Error in buildSuiTransaction:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to build Sui transaction: ${error.message}`);
        }
        throw new Error(`Failed to build Sui transaction: ${error}`);
    }
}
