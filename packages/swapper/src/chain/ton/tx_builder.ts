import { AssetId, QuoteData, DEFAULT_NODES } from '@gemwallet/types';
import { 
    beginCell, 
    Address, 
    toNano
} from '@ton/ton';
import { JETTON_OPCODES, TON_DEFAULTS } from './constants';

export interface TonTransactionPrerequisites {
    seqno: number;
    balance: string;
}

/**
 * Fetches wallet seqno and balance using TonCenter API
 */
export async function getTonTransactionPrerequisites(
    walletAddress: string
): Promise<TonTransactionPrerequisites> {
    try {
        const response = await fetch(`${DEFAULT_NODES.TON_RPC}/api/v2/getWalletInformation?address=${walletAddress}`);
        
        if (!response.ok) {
            throw new Error(`TonCenter API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(`TonCenter API error: ${data.error || 'Unknown error'}`);
        }
        
        return {
            seqno: data.result.seqno || 0,
            balance: data.result.balance || '0',
        };
    } catch (error) {
        throw new Error(`Failed to fetch TON prerequisites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Builds transaction data for native TON transfers
 */
export function buildTonNativeTransferData(
    toAddress: string,
    amount: string,
    seqno: number
): QuoteData {
    const cell = beginCell()
        .storeUint(seqno, 32) // Real seqno from wallet
        .storeUint(TON_DEFAULTS.MODE, 8) // mode
        .storeRef(
            beginCell()
                .storeAddress(Address.parse(toAddress))
                .storeCoins(BigInt(amount))
                .storeUint(0, 1) // empty body
                .endCell()
        )
        .endCell();
    
    return {
        to: toAddress,
        value: amount,
        data: cell.toBoc({ idx: false }).toString('base64')
    };
}

/**
 * Builds transaction data for Jetton (token) transfers
 */
export function buildJettonTransferData(
    jettonWalletAddress: string,
    toAddress: string,
    amount: string,
    seqno: number
): QuoteData {
    // Create jetton transfer body
    const jettonTransferBody = beginCell()
        .storeUint(JETTON_OPCODES.TRANSFER, 32) // jetton transfer opcode
        .storeUint(0, 64) // query_id
        .storeCoins(BigInt(amount)) // jetton amount
        .storeAddress(Address.parse(toAddress)) // destination
        .storeAddress(null) // response_destination (null = no response)
        .storeUint(0, 1) // custom_payload (empty)
        .storeCoins(TON_DEFAULTS.FORWARD_TON_AMOUNT) // forward_ton_amount
        .storeUint(0, 1) // forward_payload (empty)
        .endCell();

    const cell = beginCell()
        .storeUint(seqno, 32) // Real seqno from wallet
        .storeUint(TON_DEFAULTS.MODE, 8) // mode
        .storeRef(
            beginCell()
                .storeAddress(Address.parse(jettonWalletAddress)) // jetton wallet address
                .storeCoins(toNano(TON_DEFAULTS.JETTON_GAS)) // TON amount for gas
                .storeRef(jettonTransferBody)
                .endCell()
        )
        .endCell();
    
    return {
        to: jettonWalletAddress,
        value: TON_DEFAULTS.JETTON_GAS,
        data: cell.toBoc({ idx: false }).toString('base64')
    };
}

/**
 * Builds transaction data for either native or Jetton transfers
 */
export async function buildTonTransferData(
    fromAddress: string,
    asset: AssetId,
    toAddress: string,
    amount: string
): Promise<QuoteData> {
    // Fetch real seqno from wallet using TonCenter API
    const { seqno } = await getTonTransactionPrerequisites(fromAddress);
    
    if (asset.isNative()) {
        return buildTonNativeTransferData(toAddress, amount, seqno);
    } else {
        return buildJettonTransferData(asset.tokenId!, toAddress, amount, seqno);
    }
}

/**
 * Validates TON address format
 */
export function isValidTonAddress(address: string): boolean {
    try {
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Converts nanotons to TON
 */
export function nanotoTon(nanotons: string | number | bigint): number {
    return Number(nanotons) / 1_000_000_000;
}

/**
 * Converts TON to nanotons
 */
export function tonToNano(ton: string | number): string {
    return toNano(ton).toString();
}