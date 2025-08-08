import { QuoteData, AssetId } from '@gemwallet/types';

/**
 * Builds transaction data for EVM-compatible chains (Ethereum, Arbitrum, Base, etc.)
 * Handles both native token transfers and ERC20 token transfers
 */
export function buildEvmTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    if (fromAsset.isNative()) {
        // Native token transfer (ETH, BNB, AVAX, etc.)
        return {
            to: depositAddress,
            value: amount,
            data: "0x",
        };
    } else {
        // ERC20 token transfer
        // transfer(address to, uint256 amount) = 0xa9059cbb
        const transferSelector = "0xa9059cbb";
        const paddedAddress = depositAddress.replace("0x", "").padStart(64, "0");
        const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
        const data = transferSelector + paddedAddress + paddedAmount;

        return {
            to: fromAsset.tokenId!,
            value: "0",
            data: data,
        };
    }
}