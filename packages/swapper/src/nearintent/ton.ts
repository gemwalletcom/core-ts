import { QuoteData, AssetId } from '@gemwallet/types';

/**
 * Builds transaction data for TON
 * Returns JSON metadata for client-side transaction building since TON transactions
 * require proper TON SDK integration with BOC (Bag of Cells) construction
 */
export function buildTonTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    return {
        to: depositAddress,
        value: amount,
        data: JSON.stringify({
            type: "ton_transfer",
            jettonMaster: fromAsset.isNative() ? null : fromAsset.tokenId,
            to: depositAddress,
            amount: amount,
            isNative: fromAsset.isNative(),
            comment: "Near Intents deposit", // TON supports text comments
        }),
    };
}

// If we wanted to implement proper TON transaction building in the future,
// we would need to:
// 1. Import @ton/ton and related TON SDK packages
// 2. Create proper Cell structures for native TON and Jetton transfers
// 3. Return BOC-encoded transaction data like Stonfi does
// 4. Handle wallet contracts and proper message construction