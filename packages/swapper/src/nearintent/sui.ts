import { QuoteData, AssetId } from '@gemwallet/types';
import { SuiClient } from '@mysten/sui/client';
import { buildSuiTransferData, isValidSuiAddress } from '../chain/sui/tx_builder';

/**
 * Builds transaction data for Sui using common chain utilities
 * Creates proper transfer transactions with real gas price and coin references
 */
export async function buildSuiTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string,
    fromAddress: string,
    suiClient?: SuiClient
): Promise<QuoteData> {
    if (!isValidSuiAddress(depositAddress)) {
        throw new Error('Invalid Sui deposit address format');
    }

    if (!suiClient) {
        throw new Error('Sui client required for transaction building');
    }

    return await buildSuiTransferData(
        suiClient,
        fromAddress,
        fromAsset,
        depositAddress,
        amount
    );
}