/**
 * TON network configuration
 */
export const TON_CONFIG = {
    MAINNET_ENDPOINT: 'https://toncenter.com/api/v2/jsonRPC',
    DEFAULT_WORKCHAIN: 0,
} as const;

/**
 * Jetton (token) opcodes
 */
export const JETTON_OPCODES = {
    TRANSFER: 0x0f8a7ea5,
} as const;

/**
 * Common transaction parameters
 */
export const TON_DEFAULTS = {
    MODE: 3, // Pay gas fees separately
    JETTON_GAS: '50000000', // 0.05 TON in nanotons
    FORWARD_TON_AMOUNT: 1, // 1 nanoton for notification
} as const;