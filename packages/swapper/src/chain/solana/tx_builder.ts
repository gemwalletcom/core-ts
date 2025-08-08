import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from './constants';

export interface SolanaTransactionPrerequisites {
    recentBlockhash: string;
    lastValidBlockHeight: number;
}

export interface TokenAccountInfo {
    address: PublicKey;
    exists: boolean;
    needsCreation: boolean;
}

/**
 * Fetches recent blockhash and block height for transaction building
 */
export async function getSolanaTransactionPrerequisites(
    connection: Connection
): Promise<SolanaTransactionPrerequisites> {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    
    return {
        recentBlockhash: blockhash,
        lastValidBlockHeight,
    };
}

/**
 * Gets or creates associated token account information
 */
export async function getOrCreateTokenAccount(
    connection: Connection,
    mint: PublicKey,
    owner: PublicKey,
    payer: PublicKey
): Promise<TokenAccountInfo> {
    const associatedTokenAddress = await getAssociatedTokenAddress(
        mint,
        owner,
        false, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
        await getAccount(connection, associatedTokenAddress, 'confirmed', TOKEN_PROGRAM_ID);
        return {
            address: associatedTokenAddress,
            exists: true,
            needsCreation: false,
        };
    } catch (error) {
        if (
            error instanceof TokenAccountNotFoundError ||
            error instanceof TokenInvalidAccountOwnerError
        ) {
            return {
                address: associatedTokenAddress,
                exists: false,
                needsCreation: true,
            };
        }
        throw error;
    }
}

/**
 * Builds a native SOL transfer transaction
 */
export function buildSolTransferTransaction(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    lamports: number,
    recentBlockhash: string
): Transaction {
    const transaction = new Transaction({
        recentBlockhash,
        feePayer: fromPubkey,
    });

    const instruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
    });

    transaction.add(instruction);
    return transaction;
}

/**
 * Builds an SPL token transfer transaction
 */
export async function buildSplTokenTransferTransaction(
    connection: Connection,
    mint: PublicKey,
    fromOwner: PublicKey,
    toOwner: PublicKey,
    amount: bigint,
    recentBlockhash: string
): Promise<Transaction> {
    const transaction = new Transaction({
        recentBlockhash,
        feePayer: fromOwner,
    });

    // Get source token account
    const fromTokenAccount = await getOrCreateTokenAccount(connection, mint, fromOwner, fromOwner);
    
    // Get destination token account
    const toTokenAccount = await getOrCreateTokenAccount(connection, mint, toOwner, fromOwner);

    // Add instruction to create destination token account if needed
    if (toTokenAccount.needsCreation) {
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
            fromOwner, // payer
            toTokenAccount.address,
            toOwner, // owner
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createAccountInstruction);
    }

    // Add transfer instruction
    const transferInstruction = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromOwner,
        amount,
        [],
        TOKEN_PROGRAM_ID
    );
    transaction.add(transferInstruction);

    return transaction;
}

/**
 * Serializes a transaction to base64 format for external signing
 */
export function serializeTransactionToBase64(transaction: Transaction): string {
    const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });
    return serializedTx.toString('base64');
}

/**
 * Estimates transaction size and fees
 */
export function estimateTransactionFee(transaction: Transaction): number {
    // Base fee for signature
    const baseFee = 5000; // 0.000005 SOL
    
    // Additional fee per instruction
    const instructionFee = transaction.instructions.length * 0;
    
    return baseFee + instructionFee;
}

/**
 * Validates Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Converts lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
}

/**
 * Converts SOL to lamports
 */
export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
}