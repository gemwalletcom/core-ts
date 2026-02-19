import { Chain, Quote } from "@gemwallet/types";
import type { OKXDexClient } from "@okx-dex/okx-dex-sdk";

import { createOkxEvmQuoteRequest, createSolanaUsdcQuoteRequest, MANTA_USDC_ADDRESS } from "../testkit/mock";
import { OkxProvider } from "./provider";

const SOL_MINT = "11111111111111111111111111111111";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createSolanaRequest(slippageBps = 100) {
    return createSolanaUsdcQuoteRequest({ slippage_bps: slippageBps });
}

function createProvider() {
    const getQuote = jest.fn();
    const getSwapData = jest.fn();
    const client = { dex: { getQuote, getSwapData } } as unknown as OKXDexClient;
    const provider = new OkxProvider("https://localhost:8899", client);
    return { provider, getQuote, getSwapData };
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
    toToken: { tokenContractAddress: MANTA_USDC_ADDRESS },
};

const evmTokenRoute = {
    fromTokenAmount: "1000000",
    toTokenAmount: "950000",
    fromToken: { tokenContractAddress: MANTA_USDC_ADDRESS },
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
            id: `${Chain.Manta}_${MANTA_USDC_ADDRESS}`,
            symbol: "USDC",
            decimals: 6,
        },
        to_asset: {
            id: Chain.Manta,
            symbol: "ETH",
            decimals: 18,
        },
        from_value: "1000000",
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
            it("returns quote from getQuote", async () => {
                const { provider, getQuote, getSwapData } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [solanaRoute] });

                const quote = await provider.get_quote(createSolanaRequest());

                expect(quote.output_value).toBe("120000000");
                expect(quote.output_min_value).toBe("118800000");
                expect(getSwapData).not.toHaveBeenCalled();
            });

            it("passes Solana chain index and dexIds", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [solanaRoute] });

                await provider.get_quote(createSolanaRequest());

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

            it("falls back to 1% slippage when slippage_bps is 0", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                await provider.get_quote_data(mockSolanaQuote(createSolanaRequest(0)));

                const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(swapParams.slippagePercent).toBe("1");
                expect(swapParams.maxAutoSlippagePercent).toBeUndefined();
            });

            it("handles simulation failure gracefully", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockSolanaSwapResponse());

                const result = await provider.get_quote_data(mockSolanaQuote());

                expect(result.gasLimit).toBeUndefined();
            });
        });
    });

    describe("EVM", () => {
        describe("get_quote", () => {
            it("returns quote with Manta chain index", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [evmRoute] });

                const quote = await provider.get_quote(createOkxEvmQuoteRequest());

                expect(quote.output_value).toBe("2500000000");
                const params = getQuote.mock.calls[0][0] as Record<string, unknown>;
                expect(params.chainIndex).toBe("169");
            });

            it("does not pass dexIds for EVM chains", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [evmRoute] });

                await provider.get_quote(createOkxEvmQuoteRequest());

                const params = getQuote.mock.calls[0][0] as Record<string, unknown>;
                expect(params.dexIds).toBeUndefined();
            });

            it("throws for unsupported chain", async () => {
                const { provider, getQuote } = createProvider();
                getQuote.mockResolvedValue({ code: "0", msg: "", data: [] });

                const request = createOkxEvmQuoteRequest({
                    from_asset: { id: Chain.Bitcoin, symbol: "BTC", decimals: 8 },
                });

                await expect(provider.get_quote(request)).rejects.toThrow();
            });
        });

        describe("get_quote_data", () => {
            it("returns hex data directly without base58 decoding", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                const result = await provider.get_quote_data(mockEvmQuote());

                expect(result.data).toBe("0xabcdef1234567890");
                expect(result.to).toBe("0xDEXRouterAddress");
                expect(result.value).toBe("1000000000000000000");
            });

            it("uses gas from tx response as gasLimit", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                const result = await provider.get_quote_data(mockEvmQuote());

                expect(result.gasLimit).toBe("250000");
            });

            it("uses gas from tx for EVM chains without RPC simulation", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                const result = await provider.get_quote_data(mockEvmQuote());

                expect(result.gasLimit).toBe("250000");
            });

            it("includes approval data for token swaps", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(
                    mockEvmSwapResponse({
                        from: "0x1234567890abcdef1234567890abcdef12345678",
                        to: "0xDEXRouterAddress",
                        data: "0xswapCalldata",
                        value: "0",
                        gas: "300000",
                    }),
                );

                const result = await provider.get_quote_data(mockEvmTokenQuote());

                expect(result.approval).toEqual({
                    token: MANTA_USDC_ADDRESS,
                    spender: "0xDEXRouterAddress",
                    value: "1000000",
                });
            });

            it("does not include approval data for native token swaps", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                const result = await provider.get_quote_data(mockEvmQuote());

                expect(result.approval).toBeUndefined();
            });

            it("passes EVM chain index in swap params", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                await provider.get_quote_data(mockEvmQuote());

                const params = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(params.chainIndex).toBe("169");
                expect(params.dexIds).toBeUndefined();
            });

            it("uses EVM referrer address", async () => {
                const { provider, getSwapData } = createProvider();
                getSwapData.mockResolvedValue(mockEvmSwapResponse());

                await provider.get_quote_data(mockEvmQuote());

                const params = getSwapData.mock.calls[0][0] as Record<string, unknown>;
                expect(params.fromTokenReferrerWalletAddress).toBe("0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC");
            });
        });
    });
});
