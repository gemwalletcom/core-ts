import { PublicKey } from '@solana/web3.js';

/**
 * Native SOL token mint address (system program)
 */
export const SOL_NATIVE_MINT = '11111111111111111111111111111112';

/**
 * Associated Token Program ID
 */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * System Program ID
 */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * Typical transaction fees and limits
 */
export const DEFAULT_RECENT_BLOCKHASH_CACHE_TTL = 30 * 1000; // 30 seconds
export const DEFAULT_TOKEN_ACCOUNT_RENT_EXEMPT_MINIMUM = 2039280; // lamports
export const DEFAULT_COMPUTE_UNIT_PRICE = 1000000; // micro-lamports per compute unit