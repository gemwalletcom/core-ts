export interface ReferralAddress {
  evm?: string;
  solana?: string;
  sui?: string;
  ton?: string;
  tron?: string;
}

export type QuoteRequest = {
  from_address: string;
  to_address: string;
  from_asset: {
    id: string;
    decimals: number;
    symbol: string;
  };
  to_asset: {
    id: string;
    decimals: number;
    symbol: string;
  };
  from_value: string;
  referral: {
    address: ReferralAddress;
    bps: number;
  };
  slippage_bps: number;
}

export interface Quote {
  quote: QuoteRequest;
  output_value: string;
  output_min_value: string;
  route_data: object;
  eta_in_seconds?: number;
}

export interface QuoteDataRequest {
  quote: Quote;
}

export interface QuoteData {
  to: string;
  value: string;
  data: string;
}
