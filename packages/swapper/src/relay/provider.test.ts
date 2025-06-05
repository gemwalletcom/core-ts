import { RelayProvider } from './provider';
import { AssetId } from '@gemwallet/types';
import { Chain } from '@gemwallet/types';

describe('RelayProvider', () => {
    it('Test mapAssetIdToCurrency', () => {
        const provider = new RelayProvider();
        let assetId = new AssetId(Chain.Hyperliquid);

        expect(provider.mapAssetIdToCurrency(assetId)).toBe('0x0000000000000000000000000000000000000000');

        assetId = new AssetId(Chain.Bitcoin);
        expect(provider.mapAssetIdToCurrency(assetId)).toBe('bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8');

        assetId = new AssetId(Chain.Solana);
        expect(provider.mapAssetIdToCurrency(assetId)).toBe('11111111111111111111111111111111');
    });
});
