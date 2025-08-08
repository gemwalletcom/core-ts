import { AssetId, QuoteData } from '@gemwallet/types';
import { ERC20_TRANSFER_SELECTOR } from '../evm/constants';
import TronWeb from 'tronweb';

/**
 * Builds transaction data for native TRX transfers
 */
export function buildTrxTransferData(
    toAddress: string,
    amount: string
): QuoteData {
    return {
        to: toAddress,
        value: amount,
        data: '0x',
    };
}

/**
 * Builds transaction data for TRC20 token transfers
 */
export function buildTrc20TransferData(
    tokenAddress: string,
    toAddress: string,
    amount: string
): QuoteData {
    const tronAddressHex = convertTronAddressToHex(toAddress);
    const paddedAddress = tronAddressHex.replace('0x', '').replace('41', '').padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    const data = ERC20_TRANSFER_SELECTOR + paddedAddress + paddedAmount;

    return {
        to: tokenAddress,
        value: '0',
        data: data,
    };
}

/**
 * Builds transaction data for either native or TRC20 transfers
 */
export function buildTronTransferData(
    asset: AssetId,
    toAddress: string,
    amount: string
): QuoteData {
    if (asset.isNative()) {
        return buildTrxTransferData(toAddress, amount);
    } else {
        return buildTrc20TransferData(asset.tokenId!, toAddress, amount);
    }
}

/**
 * Converts TRON base58 address to hex format using TronWeb
 */
function convertTronAddressToHex(address: string): string {
    if (address.startsWith('0x') || address.startsWith('41')) {
        return address.startsWith('0x') ? address : '0x' + address;
    }
    
    if (address.startsWith('T')) {
        try {
            const hexAddress = TronWeb.utils.address.toHex(address);
            return hexAddress;
        } catch (error) {
            throw new Error(`Failed to convert TRON address to hex: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    throw new Error(`Invalid TRON address format: ${address}`);
}