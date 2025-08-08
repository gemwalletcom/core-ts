import { Chain } from '@gemwallet/types';

// Mapping of our internal asset IDs to Near Intents asset IDs
export const NEAR_INTENTS_ASSETS: Partial<Record<Chain, Record<string, string>>> = {
    [Chain.Near]: {
        "near": "nep141:wrap.near",
    },

    [Chain.Ethereum]: {
        "ethereum": "nep141:eth.omft.near",
        "ethereum_0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", // USDC
        "ethereum_0xdac17f958d2ee523a2206206994597c13d831ec7": "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near", // USDT
    },

    [Chain.Bitcoin]: {
        "bitcoin": "nep141:btc.omft.near",
    },

    [Chain.Solana]: {
        "solana": "nep141:sol.omft.near",
        "solana_epjfwdd5aufqssqem2qn1xzybapC8g4wegggkzwytdt1v": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near", // USDC
        "solana_es9vmfrzaceRmjfrF4h2fyd4kconky11mccE8benwnYb": "nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near", // USDT
    },

    [Chain.Sui]: {
        "sui": "nep141:sui.omft.near",
    },

    [Chain.Arbitrum]: {
        "arbitrum": "nep141:arb.omft.near",
        "arbitrum_0xaf88d065e77c8cc2239327c5edb3a432268e5831": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", // USDC
        "arbitrum_0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": "nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near", // USDT
    },

    [Chain.Base]: {
        "base": "nep141:base.omft.near",
        "base_0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", // USDC
    },

    [Chain.Optimism]: {
        "optimism": "nep245:v2_1.omni.hot.tg:10_11111111111111111111",
        "optimism_0x0b2c639c533813f4aa9d7837caf62653d097ff85": "nep245:v2_1.omni.hot.tg:10_A2ewyUyDp6qsue1jqZsGypkCxRJ", // USDC
        "optimism_0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": "nep245:v2_1.omni.hot.tg:10_359RPSJVdTxwTJT9TyGssr2rFoWo", // USDT
    },

    [Chain.AvalancheC]: {
        "avalanchec": "nep245:v2_1.omni.hot.tg:43114_11111111111111111111",
        "avalanchec_0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": "nep245:v2_1.omni.hot.tg:43114_3atVJH3r5c4GqiSYmg9fECvjc47o", // USDC
        "avalanchec_0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7": "nep245:v2_1.omni.hot.tg:43114_372BeH7ENZieCaabwkbWkBiTTgXp", // USDT
    },

    [Chain.SmartChain]: {
        "smartchain": "nep245:v2_1.omni.hot.tg:56_11111111111111111111",
        "smartchain_0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "nep245:v2_1.omni.hot.tg:56_2w93GqMcEmQFDru84j3HZZWt557r", // USDC
        "smartchain_0x55d398326f99059ff775485246999027b3197955": "nep245:v2_1.omni.hot.tg:56_2CMMyVTGZkeyNZTSvS5sarzfir6g", // USDT
    },

    [Chain.Polygon]: {
        "polygon": "nep245:v2_1.omni.hot.tg:137_11111111111111111111", // Native POL (formerly MATIC)
        "polygon_0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": "nep245:v2_1.omni.hot.tg:137_qiStmoQJDQPTebaPjgx5VBxZv6L", // USDC
        "polygon_0xc2132d05d31c914a87c6611c10748aeb04b58e8f": "nep245:v2_1.omni.hot.tg:137_3hpYoaLtt8MP1Z2GH1U473DMRKgr", // USDT
    },

    [Chain.Ton]: {
        "ton": "nep245:v2_1.omni.hot.tg:1117_",
        "ton_eqcxe6mutqjkfngfaarotkovt1lzbadiix1kcixrv7nw2id_sds": "nep245:v2_1.omni.hot.tg:1117_3tsdfyziyc7EJbP2aULWSKU4toBaAcN4FdTgfm5W1mC4ouR", // USDT
    },

    [Chain.Tron]: {
        "tron": "nep141:tron.omft.near",
        "tron_tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t": "nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near", // USDT
    },

    [Chain.Doge]: {
        "doge": "nep141:doge.omft.near",
    },

    [Chain.Xrp]: {
        "xrp": "nep141:xrp.omft.near",
    },

    [Chain.Cardano]: {
        "cardano": "nep141:cardano.omft.near",
    },

    [Chain.Berachain]: {
        "berachain": "nep141:bera.omft.near",
    },

    [Chain.Gnosis]: {
        "gnosis": "nep141:gnosis.omft.near",
        "gnosis_0x2a22f9c3b484c3629090feed35f17ff8f88f76f0": "nep141:gnosis-0x2a22f9c3b484c3629090feed35f17ff8f88f76f0.omft.near", // USDC
    },

};

export function getNearIntentsAssetId(chain: Chain, assetId: string): string {
    const chainAssets = NEAR_INTENTS_ASSETS[chain];
    if (!chainAssets) {
        throw new Error(`Chain not supported by Near Intents: ${chain}`);
    }

    const nearAssetId = chainAssets[assetId.toLowerCase()];
    if (!nearAssetId) {
        throw new Error(`Asset not supported by Near Intents: ${assetId}. Only native tokens and major stablecoins (USDC, USDT) are currently supported.`);
    }

    return nearAssetId;
}