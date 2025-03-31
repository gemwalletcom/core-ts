import { Asset, Chain } from './asset';

describe('Asset', () => {
    // ...existing test code from types.test.ts for Asset...
    describe('constructor', () => {
        it('should create Asset with chain only', () => {
            const asset = new Asset(Chain.TON);
            expect(asset.chain).toBe(Chain.TON);
            expect(asset.tokenId).toBeUndefined();
        });

        it('should create Asset with chain and tokenId', () => {
            const asset = new Asset(Chain.TON, 'TOKEN123');
            expect(asset.chain).toBe(Chain.TON);
            expect(asset.tokenId).toBe('TOKEN123');
        });
    });

    describe('fromString', () => {
        it('should parse native asset string', () => {
            const asset = Asset.fromString('ton');
            expect(asset.chain).toBe(Chain.TON);
            expect(asset.tokenId).toBeUndefined();
        });

        it('should parse token asset string', () => {
            const asset = Asset.fromString('ton_TOKEN123');
            expect(asset.chain).toBe(Chain.TON);
            expect(asset.tokenId).toBe('TOKEN123');
        });

        it('should handle tokenId with underscores', () => {
            const asset = Asset.fromString('ton_TOKEN_123_ABC');
            expect(asset.chain).toBe(Chain.TON);
            expect(asset.tokenId).toBe('TOKEN_123_ABC');
        });
    });

    describe('toString', () => {
        it('should convert native asset to string', () => {
            const asset = new Asset(Chain.TON);
            expect(asset.toString()).toBe('ton');
        });

        it('should convert token asset to string', () => {
            const asset = new Asset(Chain.TON, 'TOKEN123');
            expect(asset.toString()).toBe('ton_TOKEN123');
        });
    });

    describe('isNative', () => {
        it('should return true for native asset', () => {
            const asset = new Asset(Chain.TON);
            expect(asset.isNative()).toBe(true);
        });

        it('should return false for token asset', () => {
            const asset = new Asset(Chain.TON, 'TOKEN123');
            expect(asset.isNative()).toBe(false);
        });
    });

    describe('toJSON', () => {
        it('should serialize native asset', () => {
            const asset = new Asset(Chain.TON);
            expect(asset.toJSON()).toBe('ton');
        });

        it('should serialize token asset', () => {
            const asset = new Asset(Chain.TON, 'TOKEN123');
            expect(asset.toJSON()).toBe('ton_TOKEN123');
        });
    });
});
