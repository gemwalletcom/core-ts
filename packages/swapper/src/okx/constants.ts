import { Chain } from "@gemwallet/types";

export const EVM_CHAIN_INDEX: Record<string, string> = {
    [Chain.Manta]: "169",
    [Chain.Mantle]: "5000",
    [Chain.XLayer]: "196",
};

export const EVM_NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const SOLANA_DEX_IDS = [
    "277", // Raydium
    "278", // Raydium CL
    "279", // Raydium Stable
    "343", // Raydium CPMM
    "72", // Orca
    "103", // Orca Whirlpools
    "284", // Meteora
    "338", // Meteora DLMM
    "372", // Sanctum
    "403", // Sanctum Infinity
    "444", // PumpSwap
    "483", // PancakeSwap V3
    "357", // Phoenix
    "345", // OpenBook V2
];

export const SOLANA_CHAIN_INDEX = "501";
export const SOLANA_NATIVE_TOKEN_ADDRESS = "11111111111111111111111111111111";
export const SOLANA_DEX_IDS_PARAM = SOLANA_DEX_IDS.join(",");
export const DEFAULT_SLIPPAGE_PERCENT = "1";
