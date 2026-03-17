import { Chain, Quote } from "@gemwallet/types";

import { createOkxEvmQuoteRequest, createSolanaUsdcQuoteRequest, SOLANA_USDC_MINT, XLAYER_USD0_ADDRESS } from "../testkit/mock";
import type { OkxDexClient } from "./client";

import { OkxProvider } from "./provider";

const SOL_MINT = "11111111111111111111111111111111";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createSolanaRequest(slippageBps = 100) {
    return createSolanaUsdcQuoteRequest({ slippage_bps: slippageBps });
}

const MOCK_APPROVE_ADDRESS = "0x57df6092665eb6058DE53939612413ff4B09114E";

function createProvider() {
    const getQuote = jest.fn();
    const getSwapData = jest.fn();
    const getChainData = jest.fn().mockResolvedValue({
        code: "0",
        data: [{ dexTokenApproveAddress: MOCK_APPROVE_ADDRESS }],
    });
    const client = { getQuote, getSwapData, getChainData } as unknown as OkxDexClient;
    const provider = new OkxProvider("https://localhost:8899", client);
    return { provider, getQuote, getSwapData, getChainData };
}

const solanaRoute = {
    fromTokenAmount: "1000000",
    toTokenAmount: "120000000",
    fromToken: { tokenContractAddress: SOL_MINT },
    toToken: { tokenContractAddress: USDC_MINT },
};

const evmRoute = {
    fromTokenAmount: "1000000000000000000",
    toTokenAmount: "2500000000",
    fromToken: { tokenContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" },
    toToken: { tokenContractAddress: XLAYER_USD0_ADDRESS },
};

const evmTokenRoute = {
    fromTokenAmount: "1000000000000000000",
    toTokenAmount: "950000000000000000",
    fromToken: { tokenContractAddress: XLAYER_USD0_ADDRESS },
    toToken: { tokenContractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" },
};

function mockSolanaSwapResponse(overrides?: Record<string, unknown>) {
    return {
        code: "0",
        msg: "",
        data: [
            {
                routerResult: solanaRoute,
                tx: {
                    from: "SenderAddress",
                    to: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
                    data: SOL_MINT,
                    slippagePercent: "0.42",
                    minReceiveAmount: "119500000",
                    ...overrides,
                },
            },
        ],
    };
}

function mockEvmSwapResponse(overrides?: Record<string, unknown>) {
    return {
        code: "0",
        msg: "",
        data: [
            {
                routerResult: evmRoute,
                tx: {
                    from: "0x1234567890abcdef1234567890abcdef12345678",
                    to: "0xDEXRouterAddress",
                    data: "0xabcdef1234567890",
                    value: "1000000000000000000",
                    gas: "250000",
                    ...overrides,
                },
            },
        ],
    };
}

function mockSolanaQuote(request = createSolanaRequest()): Quote {
    return {
        quote: request,
        output_value: "120000000",
        output_min_value: "120000000",
        eta_in_seconds: 0,
        route_data: solanaRoute,
    };
}

function mockEvmQuote(request = createOkxEvmQuoteRequest()): Quote {
    return {
        quote: request,
        output_value: "2500000000",
        output_min_value: "2475000000",
        eta_in_seconds: 0,
        route_data: evmRoute,
    };
}

function mockEvmTokenQuote(): Quote {
    const request = createOkxEvmQuoteRequest({
        from_asset: {
            id: `${Chain.XLayer}_${XLAYER_USD0_ADDRESS}`,
            symbol: "USD0",
            decimals: 18,
        },
        to_asset: {
            id: Chain.XLayer,
            symbol: "OKB",
            decimals: 18,
        },
        from_value: "1000000000000000000",
    });
    return {
        quote: request,
        output_value: "950000",
        output_min_value: "940000",
        eta_in_seconds: 0,
        route_data: evmTokenRoute,
    };
}

describe("OkxProvider", () => {
    describe("Solana", () => {
        describe("get_quote", () => {
            it("returns quote with chain index and dexIds", async () => {
                const { provider, getQuote, getSwapData } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [solanaRoute] });

                const quote = await provider.get_quote(createSolanaRequest());

                expect(quote.output_value).toBe("120000000");
                expect(quote.output_min_value).toBe("118800000");
                expect(getSwapData).not.toHaveBeenCalled();

                const params = getQuote.mock.calls[0][0] as Record<string, unknown>;
                expect(params.chainIndex).toBe("501");
                expect(params.dexIds).toBeDefined();
            });

            it("throws when no quote is available", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [] });

                await expect(provider.get_quote(createSolanaRequest())).rejects.toThrow();
            });
        });

        describe("get_quote_data", () => {
            it("calls getSwapData with auto slippage params", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                await provider.get_quote_data(mockSolanaQuote());

                const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(swapParams.autoSlippage).toBe(true);
                expect(swapParams.maxAutoSlippagePercent).toBe("2");
                expect(swapParams.slippagePercent).toBe("1");
            });

            it("returns undefined gasLimit when simulation fails", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                const result = await provider.get_quote_data(mockSolanaQuote());

                expect(result.gasLimit).toBeUndefined();
            });

            it("sets toTokenReferrerWalletAddress when toToken is native", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                const request = createSolanaUsdcQuoteRequest({
                    from_asset: { id: `${Chain.Solana}_${SOLANA_USDC_MINT}`, symbol: "USDC", decimals: 6 },
                    to_asset: { id: Chain.Solana, symbol: "SOL", decimals: 9 },
                });
                await provider.get_quote_data(mockSolanaQuote(request));

                const params = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(params.toTokenReferrerWalletAddress).toBe("5fmLrs2GuhfDP1B51ziV5Kd1xtAr9rw1jf3aQ4ihZ2gy");
                expect(params.fromTokenReferrerWalletAddress).toBeUndefined();
            });

            it("falls back to 1% slippage when slippage_bps is 0", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                await provider.get_quote_data(mockSolanaQuote(createSolanaRequest(0)));

                const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(swapParams.slippagePercent).toBe("1");
                expect(swapParams.maxAutoSlippagePercent).toBeUndefined();
            });
        });
    });

    describe("EVM", () => {
        describe("get_quote", () => {
            it("returns quote with XLayer chain index and no dexIds", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [evmRoute] });

                const quote = await provider.get_quote(createOkxEvmQuoteRequest());

                expect(quote.output_value).toBe("2500000000");
                const params = getQuote.mock.calls[0][0] as Record<string, unknown>;
                expect(params.chainIndex).toBe("196");
                expect(params.dexIds).toBeUndefined();
            });
        });

        describe("get_quote_data", () => {
            it("native swaps should not return gasLimit and approval", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                const result = await provider.get_quote_data(mockEvmQuote());

                expect(result.data).toBe("0xabcdef1234567890");
                expect(result.to).toBe("0xDEXRouterAddress");
                expect(result.value).toBe("1000000000000000000");
                expect(result.gasLimit).toBeUndefined();
                expect(result.approval).toBeUndefined();

                const params = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(params.fromTokenReferrerWalletAddress).toBe("0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC");
            });

            it("returns approval with spender from chain data for token swaps", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(
                    mockEvmSwapResponse({
                        data: "0xswapCalldata",
                        value: "0",
                    }),
                );

                const result = await provider.get_quote_data(mockEvmTokenQuote());

                expect(result.data).toBe("0xswapCalldata");
                expect(result.value).toBe("0");
                expect(result.gasLimit).toBe("800000");
                expect(result.approval).toEqual({
                    token: XLAYER_USD0_ADDRESS,
                    spender: MOCK_APPROVE_ADDRESS,
                    value: "1000000000000000000",
                });

                const params = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(params.toTokenReferrerWalletAddress).toBe("0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC");
                expect(params.fromTokenReferrerWalletAddress).toBeUndefined();
            });
        });
    });
});
