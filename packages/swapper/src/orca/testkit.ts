import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

const DEFAULT_FROM_ADDRESS = "A1testfromAddress1111111111111111111111111";
const DEFAULT_TO_ADDRESS = "A1testtoAddress11111111111111111111111111";

export const SOL_ASSET = {
    id: Chain.Solana,
    symbol: "SOL",
    decimals: 9,
};

export const USDC_SOL_ASSET = {
    id: Chain.Solana,
    symbol: "USDC",
    decimals: 6,
};

export function createQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    const base: QuoteRequest = {
        from_address: DEFAULT_FROM_ADDRESS,
        to_address: DEFAULT_TO_ADDRESS,
        from_asset: SOL_ASSET,
        to_asset: USDC_SOL_ASSET,
        from_value: "1",
        referral_bps: 0,
        slippage_bps: 100,
    };

    return {
        ...base,
        ...overrides,
        from_asset: {
            ...base.from_asset,
            ...(overrides.from_asset ?? {}),
        },
        to_asset: {
            ...base.to_asset,
            ...(overrides.to_asset ?? {}),
        },
    };
}

export function buildQuoteFixture(
    requestOverrides: Partial<QuoteRequest> = {},
    quoteOverrides: Partial<Omit<Quote, "quote">> = {},
): Quote {
    return {
        quote: createQuoteRequest(requestOverrides),
        output_value: "0",
        output_min_value: "0",
        eta_in_seconds: 0,
        route_data: {},
        ...quoteOverrides,
    };
}
