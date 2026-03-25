import { BigIntMath } from "../../bigint_math";
import { SUI_COIN_TYPE } from "./constants";

interface CoinRef {
    objectId: string;
    version: string;
    digest: string;
}

export interface SuiRpcClient {
    getReferenceGasPrice(): Promise<string | bigint>;
    getCoins(input: { owner: string; coinType: string; limit: number }): Promise<{
        data: { coinObjectId: string; version: string; digest: string }[];
    }>;
}

export interface SuiTransactionEffects {
    status: { status: string; error?: string };
    gasUsed: { computationCost: string; storageCost: string; storageRebate: string };
}

export interface SuiTransactionPrerequisites {
    gasPrice: bigint;
    coinRefs: CoinRef[];
}

export interface SuiTransactionBuilder {
    setSender(address: string): void;
    setGasPrice(price: bigint): void;
    setGasBudget(budget: bigint): void;
    setGasPayment(coins: CoinRef[]): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    build(options: { client: any }): Promise<Uint8Array>;
}

export async function getGasPriceAndCoinRefs(
    suiClient: SuiRpcClient,
    ownerAddress: string,
): Promise<SuiTransactionPrerequisites> {
    const [gasPrice, coins] = await Promise.all([
        suiClient.getReferenceGasPrice(),
        suiClient.getCoins({ owner: ownerAddress, coinType: SUI_COIN_TYPE, limit: 100 }),
    ]);

    const coinRefs = coins.data.map((coin) => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
    }));

    return { gasPrice: BigInt(gasPrice), coinRefs };
}

export function calculateGasBudget(effects: SuiTransactionEffects, increasePercentage: number = 20): bigint {
    const gasUsed = effects.gasUsed;
    const computationBudget = BigInt(gasUsed.computationCost);
    const storageBudget = BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);

    const baseBudget = BigIntMath.max(computationBudget, computationBudget + storageBudget);

    return BigIntMath.increaseByPercent(baseBudget, increasePercentage);
}

export function prefillTransaction(
    transaction: SuiTransactionBuilder,
    senderAddress: string,
    gasBudget: bigint,
    gasPrice: bigint,
    coinRefs: CoinRef[],
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
