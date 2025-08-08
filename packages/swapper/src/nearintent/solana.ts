import { QuoteData, AssetId } from '@gemwallet/types';

/**
 * Builds transaction data for Solana
 * Returns JSON metadata for client-side transaction building since Solana transactions
 * require async operations with RPC calls and proper SDK integration
 */
export function buildSolanaTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string, 
    fromAddress: string
): QuoteData {
    return {
        to: depositAddress,
        value: amount,
        data: JSON.stringify({
            type: "solana_transfer",
            mint: fromAsset.isNative() ? "So11111111111111111111111111111111111111112" : fromAsset.tokenId,
            from: fromAddress,
            to: depositAddress,
            amount: amount,
            isNative: fromAsset.isNative()
        }),
    };
}