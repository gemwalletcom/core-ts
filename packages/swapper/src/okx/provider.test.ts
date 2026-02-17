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
  const client = { dex: { getQuote, getSwapData } } as unknown as OKXDexClient;
  const provider = new OkxProvider(client);
  return { provider, getQuote, getSwapData };
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
    getQuote.mockResolvedValue({
      code: "0",
      msg: "",
      data: [route],
    });
    getSwapData.mockResolvedValue({
      code: "0",
      msg: "",
      data: [
        {
          routerResult: route,
          tx: {
            to: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
            data: SOL_MINT,
            slippagePercent: "0.42",
            minReceiveAmount: "119500000",
          },
        },
      ],
    });

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

  it("uses auto slippage for quote data request", async () => {
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
      },
    };
    getSwapData.mockResolvedValue({
      code: "0",
      msg: "",
      data: [
        {
          routerResult: quote.route_data,
          tx: {
            to: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
            data: SOL_MINT,
            slippagePercent: "0.31",
          },
        },
      ],
    });

    await provider.get_quote_data(quote);

    const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
    expect(swapParams.autoSlippage).toBe(true);
    expect(swapParams.maxAutoSlippagePercent).toBe("3");
    expect(swapParams.slippagePercent).toBe("1.5");
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
    getSwapData.mockResolvedValue({
      code: "0",
      msg: "",
      data: [
        {
          routerResult: route,
          tx: {
            to: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
            data: SOL_MINT,
            minReceiveAmount: "119500000",
          },
        },
      ],
    });

    await provider.get_quote(createRequest(0));

    const swapParams = getSwapData.mock.calls[0][0] as Record<string, unknown>;
    expect(swapParams.slippagePercent).toBe("1");
    expect(swapParams.maxAutoSlippagePercent).toBeUndefined();
  });
});
