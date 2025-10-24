import { Chain } from './primitives';

export class AssetId {
    constructor(
        public chain: Chain,
        public tokenId?: string
    ) { }

    static fromString(asset: string): AssetId {
        const [chain, ...rest] = asset.split('_');
        const tokenId = rest.length ? rest.join('_') : undefined;
        return new AssetId(chain as Chain, tokenId);
    }

    toString(): string {
        return this.tokenId ? `${this.chain}_${this.tokenId}` : this.chain;
    }

    isNative(): boolean {
        return !this.tokenId;
    }

    isToken(): boolean {
        return !!this.tokenId;
    }

    getTokenId(): string {
        if (!this.tokenId) {
            throw new Error("Invalid token identifier for Solana asset");
        }
        return this.tokenId;
    }

    toJSON(): string {
        return this.toString();
    }
}
