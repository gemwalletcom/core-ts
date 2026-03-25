import { Chain } from "@gemwallet/types";

export const CHAIN_INDEX: Record<string, string> = {
    [Chain.Solana]: "501",
    [Chain.Ethereum]: "1",
    [Chain.SmartChain]: "56",
    [Chain.Polygon]: "137",
    [Chain.Arbitrum]: "42161",
    [Chain.Optimism]: "10",
    [Chain.Base]: "8453",
    [Chain.AvalancheC]: "43114",
    [Chain.OpBNB]: "204",
    [Chain.Fantom]: "250",
    [Chain.Gnosis]: "100",
    [Chain.Manta]: "169",
    [Chain.Blast]: "81457",
    [Chain.ZkSync]: "324",
    [Chain.Linea]: "59144",
    [Chain.Mantle]: "5000",
    [Chain.Celo]: "42220",
    [Chain.Sonic]: "146",
    [Chain.Abstract]: "2741",
    [Chain.Berachain]: "80094",
    [Chain.Unichain]: "130",
    [Chain.Monad]: "143",
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

export const SOLANA_CHAIN_INDEX = CHAIN_INDEX[Chain.Solana];
export const SOLANA_NATIVE_TOKEN_ADDRESS = "11111111111111111111111111111111";
export const SOLANA_DEX_IDS_PARAM = SOLANA_DEX_IDS.join(",");
export const DEFAULT_SLIPPAGE_PERCENT = "1";
const DEFAULT_EVM_GAS_LIMIT = "800000";
const EVM_GAS_LIMITS: Partial<Record<string, string>> = {
    [Chain.Manta]: "600000",
    [Chain.ZkSync]: "2000000",
    [Chain.Mantle]: "2000000000",
};

export function evmGasLimit(chain: Chain): string {
    return EVM_GAS_LIMITS[chain] ?? DEFAULT_EVM_GAS_LIMIT;
}
