import { Asset } from './asset';

export interface QuoteRequest {
    from_address: string;
    from_asset: Asset;
    to_asset: Asset;
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
    to: string;
    value: string;
    data: string;
}
