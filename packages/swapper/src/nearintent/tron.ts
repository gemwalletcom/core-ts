import { QuoteData, AssetId } from '@gemwallet/types';

/**
 * Builds transaction data for TRON
 * Handles both native TRX transfers and TRC20 token transfers
 */
export function buildTronTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string
): QuoteData {
    if (fromAsset.isNative()) {
        // Native TRX transfer
        return {
            to: depositAddress,
            value: amount,
            data: "0x",
        };
    } else {
        // TRC20 token transfer - similar to ERC20 but for TRON
        // transfer(address to, uint256 amount) = 0xa9059cbb
        const transferSelector = "0xa9059cbb";
        
        // Convert TRON address to hex format if needed
        const tronAddressHex = convertTronAddressToHex(depositAddress);
        const paddedAddress = tronAddressHex.replace("0x", "").replace("41", "").padStart(64, "0");
        const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
        const data = transferSelector + paddedAddress + paddedAmount;

        return {
            to: fromAsset.tokenId!,
            value: "0",
            data: data,
        };
    }
}

/**
 * Helper function to convert TRON base58 address to hex format
 * In production, this should use a proper TRON address library
 */
function convertTronAddressToHex(address: string): string {
    // If already hex format (starts with 0x or 41), return as-is
    if (address.startsWith('0x') || address.startsWith('41')) {
        return address.startsWith('0x') ? address : '0x' + address;
    }
    
    // For base58 addresses (starting with T), this is a placeholder
    // In production, use tronweb.address.toHex() or similar
    // For now, return the address as-is and let the client handle conversion
    return address;
}