export interface QuoteRequest {
    from_address: string;
    from_asset: string;
    to_asset: string;
    from_value: string;
    referral_address: string;
    referral_bps: number;
    slippage_bps: number;
}

export interface Quote {
    quote: QuoteRequest;
    output_value: string;
    output_min_value: string;
}

export interface QuoteDataRequest {
    quote: Quote;
}

export interface QuoteData {
    to: string,
    value: string,
    data: string;
}

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