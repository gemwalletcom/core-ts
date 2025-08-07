import { NearIntentProvider } from './provider';
import { getNearIntentAssetId } from './assets';
import { Chain, AssetId } from '@gemwallet/types';

describe('NearIntentProvider', () => {
    let provider: NearIntentProvider;

    beforeEach(() => {
        provider = new NearIntentProvider();
    });


    describe('buildAssetId', () => {
        it('should build asset id correctly for native Near', () => {
            const nativeAsset = new AssetId(Chain.Near);

            const result = provider['buildAssetId'](nativeAsset);
            expect(result).toBe('near');
        });

        it('should build asset id correctly for native ETH', () => {
            const nativeAsset = new AssetId(Chain.Ethereum);

            const result = provider['buildAssetId'](nativeAsset);
            expect(result).toBe('nep141:eth.omft.near');
        });

        it('should throw for unsupported asset', () => {
            const unsupportedAsset = new AssetId(Chain.Ethereum, '0x1234567890abcdef');

            expect(() => provider['buildAssetId'](unsupportedAsset))
                .toThrow('Asset not supported by Near Intent');
        });
    });
});

describe('getNearIntentAssetId', () => {
    describe('Native tokens', () => {
        it('should map native NEAR correctly', () => {
            expect(getNearIntentAssetId(Chain.Near, 'near')).toBe('near');
        });

        it('should map native ETH correctly', () => {
            expect(getNearIntentAssetId(Chain.Ethereum, 'ethereum')).toBe('nep141:eth.omft.near');
        });

        it('should map native BTC correctly', () => {
            expect(getNearIntentAssetId(Chain.Bitcoin, 'bitcoin')).toBe('nep141:btc.omft.near');
        });

        it('should map native SOL correctly', () => {
            expect(getNearIntentAssetId(Chain.Solana, 'solana')).toBe('nep141:sol.omft.near');
        });

        it('should map native ARB ETH correctly', () => {
            expect(getNearIntentAssetId(Chain.Arbitrum, 'arbitrum')).toBe('nep141:arb.omft.near');
        });
    });

    describe('Stablecoins', () => {
        it('should map Ethereum USDC correctly', () => {
            expect(getNearIntentAssetId(Chain.Ethereum, 'ethereum_0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'))
                .toBe('nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near');
        });

        it('should map Ethereum USDT correctly', () => {
            expect(getNearIntentAssetId(Chain.Ethereum, 'ethereum_0xdAC17F958D2ee523a2206206994597C13D831ec7'))
                .toBe('nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near');
        });

        it('should map Arbitrum USDC correctly', () => {
            expect(getNearIntentAssetId(Chain.Arbitrum, 'arbitrum_0xaf88d065e77c8cC2239327C5EDb3A432268e5831'))
                .toBe('nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near');
        });

        it('should map Base USDC correctly', () => {
            expect(getNearIntentAssetId(Chain.Base, 'base_0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'))
                .toBe('nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near');
        });

        it('should handle case insensitive matching', () => {
            expect(getNearIntentAssetId(Chain.Ethereum, 'ethereum_0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'))
                .toBe('nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near');
        });
    });

    describe('Error handling', () => {
        it('should throw for unsupported chain', () => {
            expect(() => getNearIntentAssetId(Chain.Aptos, 'aptos'))
                .toThrow('Chain not supported by Near Intent: aptos');
        });

        it('should throw for unsupported asset', () => {
            expect(() => getNearIntentAssetId(Chain.Ethereum, 'ethereum_0xinvalidaddress'))
                .toThrow('Asset not supported by Near Intent: ethereum_0xinvalidaddress');
        });

        it('should provide helpful error message for unsupported tokens', () => {
            expect(() => getNearIntentAssetId(Chain.Ethereum, 'ethereum_0x1234567890abcdef'))
                .toThrow('Only native tokens and major stablecoins (USDC, USDT) are currently supported');
        });
    });
});