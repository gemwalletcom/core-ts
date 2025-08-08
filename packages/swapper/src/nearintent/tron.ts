import { QuoteData, AssetId } from '@gemwallet/types';
import { buildTronTransferData } from '../chain/tron';

/**
 * Builds transaction data for TRON using common chain utilities
 * Handles both native TRX transfers and TRC20 token transfers
 */
export function buildTronTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    return buildTronTransferData(fromAsset, depositAddress, amount);
}