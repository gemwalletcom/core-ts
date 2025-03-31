export enum Chain {
    TON = 'ton',
}

export class Asset {
    constructor(
        public chain: Chain,
        public tokenId?: string
    ) {}

    static fromString(asset: string): Asset {
        const [chain, ...rest] = asset.split('_');
        const tokenId = rest.length ? rest.join('_') : undefined;
        return new Asset(chain as Chain, tokenId);
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
