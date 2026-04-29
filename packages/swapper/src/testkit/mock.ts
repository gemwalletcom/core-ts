import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

export const SOLANA_TEST_WALLET_ADDRESS = "7g2rVN8fAAQdPh1mkajpvELqYa3gWvFXJsBLnKfEQfqy";
export const APTOS_TEST_WALLET_ADDRESS = "0x4eb20e735591a85bb58921ef2e6b55c385bba10e817ffe1e02e50deb6c594aef";
export const TON_TEST_WALLET_ADDRESS = "UQDummyFromAddress1111111111111111111111111111";
export const TON_TEST_DESTINATION_ADDRESS = "UQDummyToAddress11111111111111111111111111111";

export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const APTOS_USDC_FA = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
export const APTOS_USDT_FA = "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b";

export const XLAYER_TEST_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
export const XLAYER_USD0_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736";

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

export const STONFI_QUOTE_REQUEST_TEMPLATE: QuoteRequest = {
    from_address: TON_TEST_WALLET_ADDRESS,
    to_address: TON_TEST_DESTINATION_ADDRESS,
    from_asset: TON_ASSET,
    to_asset: USDT_TON_ASSET,
    from_value: "1000000000",
    referral_bps: 0,
    slippage_bps: 100,
    use_max_amount: false,
};

export const OKX_SOLANA_USDC_REQUEST_TEMPLATE: QuoteRequest = {
    from_address: SOLANA_TEST_WALLET_ADDRESS,
    to_address: SOLANA_TEST_WALLET_ADDRESS,
    from_asset: {
        id: Chain.Solana,
        symbol: "SOL",
        decimals: 9,
    },
    to_asset: {
        id: `${Chain.Solana}_${SOLANA_USDC_MINT}`,
        symbol: "USDC",
        decimals: 6,
    },
    from_value: "1000000",
    referral_bps: 50,
    slippage_bps: 100,
    use_max_amount: false,
};

export const APTOS_USDC_REQUEST_TEMPLATE: QuoteRequest = {
    from_address: APTOS_TEST_WALLET_ADDRESS,
    to_address: APTOS_TEST_WALLET_ADDRESS,
    from_asset: {
        id: Chain.Aptos,
        symbol: "APT",
        decimals: 8,
    },
    to_asset: {
        id: `${Chain.Aptos}_${APTOS_USDC_FA}`,
        symbol: "USDC",
        decimals: 6,
    },
    from_value: "1000000000",
    referral_bps: 10,
    slippage_bps: 100,
    use_max_amount: false,
};

export const OKX_XLAYER_USD0_REQUEST_TEMPLATE: QuoteRequest = {
    from_address: XLAYER_TEST_WALLET_ADDRESS,
    to_address: XLAYER_TEST_WALLET_ADDRESS,
    from_asset: {
        id: Chain.XLayer,
        symbol: "OKB",
        decimals: 18,
    },
    to_asset: {
        id: `${Chain.XLayer}_${XLAYER_USD0_ADDRESS}`,
        symbol: "USD0",
        decimals: 18,
    },
    from_value: "1000000000000000000",
    referral_bps: 50,
    slippage_bps: 100,
    use_max_amount: false,
};

export function createOkxEvmQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return createQuoteRequest(OKX_XLAYER_USD0_REQUEST_TEMPLATE, overrides);
}

export function createQuoteRequest(base: QuoteRequest, overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return {
        ...base,
        ...overrides,
        from_asset: {
            ...base.from_asset,
            ...overrides.from_asset,
        },
        to_asset: {
            ...base.to_asset,
            ...overrides.to_asset,
        },
    };
}

export function buildQuoteFixture(
    baseRequest: QuoteRequest,
    requestOverrides: Partial<QuoteRequest> = {},
    quoteOverrides: Partial<Omit<Quote, "quote">> = {},
    etaInSeconds = 0,
): Quote {
    return {
        quote: createQuoteRequest(baseRequest, requestOverrides),
        output_value: "0",
        output_min_value: "0",
        eta_in_seconds: etaInSeconds,
        route_data: {},
        ...quoteOverrides,
    };
}

export function createStonfiQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return createQuoteRequest(STONFI_QUOTE_REQUEST_TEMPLATE, overrides);
}

export function buildStonfiQuoteFixture(
    requestOverrides: Partial<QuoteRequest> = {},
    quoteOverrides: Partial<Omit<Quote, "quote">> = {},
): Quote {
    return buildQuoteFixture(STONFI_QUOTE_REQUEST_TEMPLATE, requestOverrides, quoteOverrides, 3);
}

export function createSolanaUsdcQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return createQuoteRequest(OKX_SOLANA_USDC_REQUEST_TEMPLATE, overrides);
}

export function createAptosUsdcQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return createQuoteRequest(APTOS_USDC_REQUEST_TEMPLATE, overrides);
}
