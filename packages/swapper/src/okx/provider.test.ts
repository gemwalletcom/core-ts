import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

import { OkxClient } from "./client";
import { OkxProvider } from "./provider";

const WALLET_ADDRESS = "7g2rVN8fAAQdPh1mkajpvELqYa3gWvFXJsBLnKfEQfqy";
const SOL_MINT = "11111111111111111111111111111111";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createRequest(slippageBps = 100): QuoteRequest {
  return {
    from_address: WALLET_ADDRESS,
    to_address: WALLET_ADDRESS,
    from_asset: {
      id: Chain.Solana,
      symbol: "SOL",
      decimals: 9,
    },
    to_asset: {
      id: `${Chain.Solana}_${USDC_MINT}`,
      symbol: "USDC",
      decimals: 6,
    },
    from_value: "1000000",
    referral_bps: 50,
    slippage_bps: slippageBps,
  };
}

function createProvider() {
  const getQuote = jest.fn();
  const getSwap = jest.fn();
  const provider = new OkxProvider({ getQuote, getSwap } as unknown as OkxClient);
  return { provider, getQuote, getSwap };
}

describe("OkxProvider", () => {
  it("uses auto slippage and exposes suggested slippage on quote route data", async () => {
    const { provider, getQuote, getSwap } = createProvider();
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
    getSwap.mockResolvedValue({
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

    const swapRequest = getSwap.mock.calls[0][0] as Record<string, unknown>;
    expect(swapRequest.autoSlippage).toBe(true);
    expect(swapRequest.maxAutoSlippagePercent).toBe("2");
    expect(swapRequest.slippagePercent).toBeUndefined();

    const routeData = quote.route_data as Record<string, unknown>;
    expect(routeData.suggestedSlippagePercent).toBe("0.42");
    expect(routeData.suggestedSlippageBps).toBe(42);
  });

  it("uses auto slippage for quote data request", async () => {
    const { provider, getSwap } = createProvider();
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
    getSwap.mockResolvedValue({
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

    const swapRequest = getSwap.mock.calls[0][0] as Record<string, unknown>;
    expect(swapRequest.autoSlippage).toBe(true);
    expect(swapRequest.maxAutoSlippagePercent).toBe("3");
    expect(swapRequest.slippagePercent).toBeUndefined();
  });
});
