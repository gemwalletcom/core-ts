import type { OKXDexClient } from "@okx-dex/okx-dex-sdk";
import { Quote } from "@gemwallet/types";

import { OkxProvider } from "./provider";
import { createSolanaUsdcQuoteRequest } from "../testkit/mock";

const SOL_MINT = "11111111111111111111111111111111";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createRequest(slippageBps = 100) {
  return createSolanaUsdcQuoteRequest({ slippage_bps: slippageBps });
}

function createProvider() {
  const getQuote = jest.fn();
  const getSwapData = jest.fn();
  const getGasLimit = jest.fn().mockResolvedValue({
    code: "0",
    msg: "",
    data: [{ gasLimit: "500000" }],
  });
  const client = { dex: { getQuote, getSwapData, getGasLimit } } as unknown as OKXDexClient;
  const provider = new OkxProvider(client);
  return { provider, getQuote, getSwapData, getGasLimit };
}

function mockSwapResponse(route: Record<string, unknown>, overrides?: Record<string, unknown>) {
  return {
    code: "0",
    msg: "",
    data: [
      {
        routerResult: route,
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

describe("OkxProvider", () => {
  it("uses auto slippage and exposes suggested slippage on quote route data", async () => {
    const { provider, getQuote, getSwapData } = createProvider();
    const route = {
      fromTokenAmount: "1000000",
      toTokenAmount: "120000000",
      fromToken: { tokenContractAddress: SOL_MINT },
      toToken: { tokenContractAddress: USDC_MINT },
    };
    getQuote.mockResolvedValue({ code: "0", msg: "", data: [route] });
    getSwapData.mockResolvedValue(mockSwapResponse(route));

    const quote = await provider.get_quote(createRequest());
    expect(quote.output_value).toBe("120000000");
    expect(quote.output_min_value).toBe("119500000");

    const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
    expect(swapParams.autoSlippage).toBe(true);
    expect(swapParams.maxAutoSlippagePercent).toBe("2");
    expect(swapParams.slippagePercent).toBe("1");

    const routeData = quote.route_data as Record<string, unknown>;
    expect(routeData.suggestedSlippagePercent).toBe("0.42");
    expect(routeData.suggestedSlippageBps).toBe(42);
  });

  it("estimates compute unit limit via getGasLimit", async () => {
    const { provider, getQuote, getSwapData, getGasLimit } = createProvider();
    const route = {
      fromTokenAmount: "1000000",
      toTokenAmount: "120000000",
      fromToken: { tokenContractAddress: SOL_MINT },
      toToken: { tokenContractAddress: USDC_MINT },
    };
    getQuote.mockResolvedValue({ code: "0", msg: "", data: [route] });
    getSwapData.mockResolvedValue(mockSwapResponse(route));

    const quote = await provider.get_quote(createRequest());

    expect(getGasLimit).toHaveBeenCalledWith({
      chainIndex: "501",
      fromAddress: "SenderAddress",
      toAddress: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
      extJson: { inputData: SOL_MINT },
    });

    const routeData = quote.route_data as Record<string, unknown>;
    expect(routeData.estimatedComputeUnits).toBe("550000");
  });

  it("passes estimated compute unit limit to get_quote_data swap params and response", async () => {
    const { provider, getSwapData } = createProvider();
    const quote: Quote = {
      quote: createRequest(150),
      output_value: "120000000",
      output_min_value: "120000000",
      eta_in_seconds: 0,
      route_data: {
        fromTokenAmount: "1000000",
        toTokenAmount: "120000000",
        fromToken: { tokenContractAddress: SOL_MINT },
        toToken: { tokenContractAddress: USDC_MINT },
        estimatedComputeUnits: "550000",
      },
    };
    getSwapData.mockResolvedValue(mockSwapResponse(quote.route_data as Record<string, unknown>));

    const result = await provider.get_quote_data(quote);

    const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
    expect(swapParams.computeUnitLimit).toBe("550000");
    expect(result.gasLimit).toBe("550000");
  });

  it("falls back to 1% slippage when slippage_bps is 0", async () => {
    const { provider, getQuote, getSwapData } = createProvider();
    const route = {
      fromTokenAmount: "1000000",
      toTokenAmount: "120000000",
      fromToken: { tokenContractAddress: SOL_MINT },
      toToken: { tokenContractAddress: USDC_MINT },
    };
    getQuote.mockResolvedValue({ code: "0", msg: "", data: [route] });
    getSwapData.mockResolvedValue(mockSwapResponse(route));

    await provider.get_quote(createRequest(0));

    const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
    expect(swapParams.slippagePercent).toBe("1");
    expect(swapParams.maxAutoSlippagePercent).toBeUndefined();
  });

  it("handles getGasLimit failure gracefully", async () => {
    const { provider, getQuote, getSwapData, getGasLimit } = createProvider();
    getGasLimit.mockRejectedValue(new Error("API error"));
    const route = {
      fromTokenAmount: "1000000",
      toTokenAmount: "120000000",
      fromToken: { tokenContractAddress: SOL_MINT },
      toToken: { tokenContractAddress: USDC_MINT },
    };
    getQuote.mockResolvedValue({ code: "0", msg: "", data: [route] });
    getSwapData.mockResolvedValue(mockSwapResponse(route));

    const quote = await provider.get_quote(createRequest());

    const routeData = quote.route_data as Record<string, unknown>;
    expect(routeData.estimatedComputeUnits).toBeUndefined();
  });
});
