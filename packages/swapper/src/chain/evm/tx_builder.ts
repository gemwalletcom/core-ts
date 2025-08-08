import { AssetId, QuoteData } from '@gemwallet/types';
import { ERC20_TRANSFER_SELECTOR } from './constants';

/**
 * Builds transaction data for native token transfers on EVM chains
 */
export function buildNativeTransferData(
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
 * Builds transaction data for ERC20 token transfers
 */
export function buildErc20TransferData(
    tokenAddress: string,
    toAddress: string,
    amount: string
): QuoteData {
    const paddedToAddress = toAddress.replace('0x', '').padStart(64, '0');
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    const data = ERC20_TRANSFER_SELECTOR + paddedToAddress + paddedAmount;

    return {
        to: tokenAddress,
        value: '0',
        data: data,
    };
}

/**
 * Builds transaction data for either native or ERC20 transfers
 */
export function buildEvmTransferData(
    asset: AssetId,
    toAddress: string,
    amount: string
): QuoteData {
    if (asset.isNative()) {
        return buildNativeTransferData(toAddress, amount);
    } else {
        return buildErc20TransferData(asset.tokenId!, toAddress, amount);
    }
}

