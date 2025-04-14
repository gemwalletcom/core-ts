import { AssetId, Chain } from './primitives';

export class Asset {
    constructor(
        public chain: Chain,
        public tokenId?: string
    ) { }

    static fromString(asset: string): Asset {
        const [chain, ...rest] = asset.split('_');
        const tokenId = rest.length ? rest.join('_') : undefined;
        return new Asset(chain as Chain, tokenId);
    }

    static fromAssetId(assetId: AssetId): Asset {
        return new Asset(assetId.chain, assetId.token_id);
    }

    toString(): string {
        return this.tokenId ? `${this.chain}_${this.tokenId}` : this.chain;
    }

    isNative(): boolean {
        return !this.tokenId;
    }

    toJSON(): string {
        return this.toString();
    }
}
