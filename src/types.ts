
export interface QuoteRequest {
    from_address: string,
    from_token: string;
    to_token: string;
    from_value: string;
    referral_address: string;
    referral_bps: number;
    slippage_bps: number;
}

export interface Quote {
    quote: QuoteRequest,
    output_value: string;
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