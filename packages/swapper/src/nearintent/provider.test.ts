import { NearIntentProvider } from './provider';
import { Chain, QuoteAsset } from '@gemwallet/types';

describe('NearIntentProvider', () => {
    let provider: NearIntentProvider;

    beforeEach(() => {
        provider = new NearIntentProvider();
    });

    describe('mapChainToBlockchain', () => {
        it('should map supported chains correctly', () => {
            expect(() => provider['mapChainToBlockchain'](Chain.Near)).not.toThrow();
            expect(() => provider['mapChainToBlockchain'](Chain.Ethereum)).not.toThrow();
            expect(() => provider['mapChainToBlockchain'](Chain.Bitcoin)).not.toThrow();
            expect(() => provider['mapChainToBlockchain'](Chain.Solana)).not.toThrow();
        });

        it('should throw for unsupported chains', () => {
            expect(() => provider['mapChainToBlockchain'](Chain.Algorand)).toThrow();
        });
    });

    describe('buildAssetId', () => {
        it('should build asset id correctly for native assets', () => {
            const mockNativeAsset = {
                chain: Chain.Near,
                tokenId: null,
                isNative: () => true,
                toString: () => 'near'
            };
            
            const result = provider['buildAssetId'](mockNativeAsset as any);
            expect(result).toBe('near');
        });

        it('should build asset id correctly for token assets', () => {
            const mockTokenAsset = {
                chain: Chain.Ethereum,
                tokenId: '0x1234567890abcdef',
                isNative: () => false,
                toString: () => 'ethereum:0x1234567890abcdef'
            };
            
            const result = provider['buildAssetId'](mockTokenAsset as any);
            expect(result).toBe('eth:0x1234567890abcdef');
        });
    });
});