import { QuoteData, AssetId } from '@gemwallet/types';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
    buildSolTransferTransaction, 
    buildSplTokenTransferTransaction,
    serializeTransactionToBase64,
    isValidSolanaAddress,
    getSolanaTransactionPrerequisites
} from '../chain/solana';

/**
 * Builds transaction data for Solana using common chain utilities
 * Creates a proper transfer transaction and returns it as base64 encoded transaction bytes
 */
export async function buildSolanaTransactionData(
    fromAsset: AssetId, 
    depositAddress: string, 
    amount: string,
    fromAddress: string,
    connection?: Connection
): Promise<QuoteData> {
    // Validate deposit address
    if (!isValidSolanaAddress(depositAddress)) {
        throw new Error('Invalid Solana deposit address format');
    }

    if (!connection) {
        throw new Error('Solana connection required for transaction building');
    }

    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(depositAddress);
    const { recentBlockhash } = await getSolanaTransactionPrerequisites(connection);

    if (fromAsset.isNative()) {
        const lamports = Number(amount);
        const transaction = buildSolTransferTransaction(
            fromPubkey,
            toPubkey,
            lamports,
            recentBlockhash
        );

        return {
            to: "",
            value: "0",
            data: serializeTransactionToBase64(transaction),
        };
    } else {
        const mintPubkey = new PublicKey(fromAsset.tokenId!);
        const transaction = await buildSplTokenTransferTransaction(
            connection,
            mintPubkey,
            fromPubkey,
            toPubkey,
            BigInt(amount),
            recentBlockhash
        );

        return {
            to: "",
            value: "0",
            data: serializeTransactionToBase64(transaction),
        };
    }
}