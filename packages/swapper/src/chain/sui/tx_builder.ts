import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { AssetId, QuoteData } from '@gemwallet/types';
import { BigIntMath } from "../../bigint_math";
import { SUI_COIN_TYPE } from "./constants";

export interface SuiTransactionPrerequisites {
    gasPrice: bigint;
    coinRefs: { objectId: string; version: string; digest: string }[];
}

/**
 * Fetches gas price and coin references for transaction building
 */
export async function getSuiTransactionPrerequisites(
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

/**
 * Builds transaction data for native SUI transfers
 */
export async function buildSuiNativeTransferData(
    suiClient: SuiClient,
    fromAddress: string,
    toAddress: string,
    amount: string
): Promise<QuoteData> {
    const tx = new Transaction();
    
    // Native SUI transfer using splitCoins and transferObjects
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], toAddress);
    
    // Get transaction prerequisites
    const { gasPrice, coinRefs } = await getSuiTransactionPrerequisites(suiClient, fromAddress);
    
    // Set transaction parameters
    tx.setSender(fromAddress);
    tx.setGasPrice(gasPrice);
    tx.setGasBudget(1000000); // 1M gas units
    
    if (coinRefs.length > 0) {
        tx.setGasPayment(coinRefs);
    }
    
    // Serialize the transaction
    const serializedTx = await tx.build({ client: suiClient });
    
    return {
        to: toAddress,
        value: "0", // Sui handles amounts in transaction data
        data: Buffer.from(serializedTx).toString('base64'),
    };
}

/**
 * Builds transaction data for custom coin transfers
 */
export async function buildSuiCoinTransferData(
    suiClient: SuiClient,
    fromAddress: string,
    toAddress: string,
    amount: string,
    coinType: string
): Promise<QuoteData> {
    const tx = new Transaction();
    
    // Fetch coins of specific type for the sender
    const coins = await suiClient.getCoins({ 
        owner: fromAddress, 
        coinType: coinType,
        limit: 50 
    });
    
    if (coins.data.length === 0) {
        throw new Error(`No coins of type ${coinType} found for address ${fromAddress}`);
    }
    
    // Use the first available coin object
    const coinObject = coins.data[0];
    
    // Custom coin transfer using actual coin object
    tx.moveCall({
        target: '0x2::pay::split_and_transfer',
        typeArguments: [coinType],
        arguments: [
            tx.object(coinObject.coinObjectId),
            tx.pure.u64(amount),
            tx.pure.address(toAddress),
        ],
    });
    
    // Get transaction prerequisites
    const { gasPrice, coinRefs } = await getSuiTransactionPrerequisites(suiClient, fromAddress);
    
    // Set transaction parameters
    tx.setSender(fromAddress);
    tx.setGasPrice(gasPrice);
    tx.setGasBudget(1000000); // 1M gas units
    
    if (coinRefs.length > 0) {
        tx.setGasPayment(coinRefs);
    }
    
    // Serialize the transaction
    const serializedTx = await tx.build({ client: suiClient });
    
    return {
        to: toAddress,
        value: "0",
        data: Buffer.from(serializedTx).toString('base64'),
    };
}

/**
 * Builds transaction data for either native or custom coin transfers
 */
export async function buildSuiTransferData(
    suiClient: SuiClient,
    fromAddress: string,
    asset: AssetId,
    toAddress: string,
    amount: string
): Promise<QuoteData> {
    if (asset.isNative()) {
        return await buildSuiNativeTransferData(suiClient, fromAddress, toAddress, amount);
    } else {
        return await buildSuiCoinTransferData(suiClient, fromAddress, toAddress, amount, asset.tokenId!);
    }
}

/**
 * Validates Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
    // Sui addresses start with 0x and are 66 characters long (including 0x)
    return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Legacy functions for backwards compatibility
 */
export const getGasPriceAndCoinRefs = getSuiTransactionPrerequisites;

export function calculateGasBudget(
    gasUsed: any,
    increasePercentage: number = 20
): bigint {
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
