import { QuoteData, AssetId } from '@gemwallet/types';
import { buildEvmTransferData } from '../chain/evm';

/**
 * Builds transaction data for EVM-compatible chains using common chain utilities
 * Handles both native token transfers and ERC20 token transfers
 */
export function buildEvmTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    return buildEvmTransferData(fromAsset, depositAddress, amount);
}