import { QuoteData, AssetId } from '@gemwallet/types';

/**
 * Builds transaction data for Sui
 * Returns JSON metadata for client-side transaction building since Sui transactions
 * require async operations with RPC calls and proper SDK integration
 */
export function buildSuiTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    return {
        to: depositAddress,
        value: amount,
        data: JSON.stringify({
            type: "sui_transfer",
            coinType: fromAsset.isNative() ? "0x2::sui::SUI" : fromAsset.tokenId,
            to: depositAddress,
            amount: amount,
            isNative: fromAsset.isNative()
        }),
    };
}