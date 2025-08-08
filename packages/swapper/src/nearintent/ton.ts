import { QuoteData, AssetId } from '@gemwallet/types';
import { buildTonTransferData, isValidTonAddress } from '../chain/ton';

/**
 * Builds transaction data for TON using common chain utilities
 * Creates proper TON transfer transactions with real seqno fetching using TonCenter API
 */
export async function buildTonTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string,
    fromAddress: string
): Promise<QuoteData> {
    if (!isValidTonAddress(depositAddress)) {
        throw new Error('Invalid TON deposit address format');
    }

    return await buildTonTransferData(
        fromAddress,
        fromAsset,
        depositAddress,
        amount
    );
}