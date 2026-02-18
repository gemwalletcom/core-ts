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

const mockRoute = {
  fromTokenAmount: "1000000",
  toTokenAmount: "120000000",
  fromToken: { tokenContractAddress: SOL_MINT },
  toToken: { tokenContractAddress: USDC_MINT },
};

function mockSwapResponse(overrides?: Record<string, unknown>) {
  return {
    code: "0",
    msg: "",
    data: [
      {
        routerResult: mockRoute,
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

function mockQuote(request = createRequest()): Quote {
  return {
    quote: request,
    output_value: "120000000",
    output_min_value: "120000000",
    eta_in_seconds: 0,
    route_data: mockRoute,
  };
}

describe("OkxProvider", () => {
  describe("get_quote", () => {
    it("returns quote from getQuote", async () => {
      const { provider, getQuote, getSwapData } = createProvider();
      getQuote.mockResolvedValue({ code: "0", msg: "", data: [mockRoute] });

      const quote = await provider.get_quote(createRequest());

      expect(quote.output_value).toBe("120000000");
      expect(quote.output_min_value).toBe("118800000");
      expect(getSwapData).not.toHaveBeenCalled();
    });

    it("throws when no quote is available", async () => {
      const { provider, getQuote } = createProvider();
      getQuote.mockResolvedValue({ code: "0", msg: "", data: [] });

      await expect(provider.get_quote(createRequest())).rejects.toThrow();
    });
  });

  describe("get_quote_data", () => {
    it("calls getSwapData with auto slippage params", async () => {
      const { provider, getSwapData } = createProvider();
      getSwapData.mockResolvedValue(mockSwapResponse());

      await provider.get_quote_data(mockQuote());

      const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
      expect(swapParams.autoSlippage).toBe(true);
      expect(swapParams.maxAutoSlippagePercent).toBe("2");
      expect(swapParams.slippagePercent).toBe("1");
    });

    it("estimates compute unit limit via getGasLimit", async () => {
      const { provider, getSwapData, getGasLimit } = createProvider();
      getSwapData.mockResolvedValue(mockSwapResponse());

      const result = await provider.get_quote_data(mockQuote());

      expect(getGasLimit).toHaveBeenCalledWith({
        chainIndex: "501",
        fromAddress: "SenderAddress",
        toAddress: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
        extJson: { inputData: SOL_MINT },
      });
      expect(result.gasLimit).toBe("550000");
    });

    it("falls back to 1% slippage when slippage_bps is 0", async () => {
      const { provider, getSwapData } = createProvider();
      getSwapData.mockResolvedValue(mockSwapResponse());

      await provider.get_quote_data(mockQuote(createRequest(0)));

      const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
      expect(swapParams.slippagePercent).toBe("1");
      expect(swapParams.maxAutoSlippagePercent).toBeUndefined();
    });

    it("handles getGasLimit failure gracefully", async () => {
      const { provider, getSwapData, getGasLimit } = createProvider();
      getGasLimit.mockRejectedValue(new Error("API error"));
      getSwapData.mockResolvedValue(mockSwapResponse());

      const result = await provider.get_quote_data(mockQuote());

      expect(result.gasLimit).toBeUndefined();
    });
  });
});
