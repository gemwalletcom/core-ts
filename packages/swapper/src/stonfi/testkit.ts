import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

export const TON_ASSET = {
    id: Chain.Ton,
    symbol: "TON",
    decimals: 9,
};

export const USDT_TON_ASSET = {
    id: `${Chain.Ton}_EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`,
    symbol: "USDT",
    decimals: 6,
};

export function createQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    const base: QuoteRequest = {
        from_address: "UQDummyFromAddress1111111111111111111111111111",
        to_address: "UQDummyToAddress11111111111111111111111111111",
        from_asset: TON_ASSET,
        to_asset: USDT_TON_ASSET,
        from_value: "1000000000", // 1 TON
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
        eta_in_seconds: 3,
        route_data: {},
        ...quoteOverrides,
    };
}
