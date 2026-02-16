import bs58 from "bs58";

import {
  AssetId,
  Chain,
  Quote,
  QuoteRequest,
  SwapQuoteData,
  SwapQuoteDataType,
} from "@gemwallet/types";
import { Protocol } from "../protocol";
import { SwapperException } from "../error";
import { getReferrerAddresses } from "../referrer";
import {
  OKX_API_KEY,
  OKX_API_PASSPHRASE,
  OKX_PROJECT_ID,
  OKX_SECRET_KEY,
  OkxAuth,
} from "./auth";
import { OkxClient } from "./client";
import {
  OkxQuoteResponse,
  OkxSwapResponse,
  OkxSwapRequest,
} from "./model";

const SOLANA_SLIP44 = "501";
const SOLANA_NATIVE_TOKEN_ADDRESS = "11111111111111111111111111111111";

interface OkxRouteData extends OkxQuoteResponse {
  suggestedSlippagePercent?: string;
  suggestedSlippageBps?: number;
}

function isValidAddress(address: string): boolean {
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

function bpsToPercent(bps: number): string {
  const integer = Math.floor(bps / 100);
  const decimal = bps % 100;
  if (decimal === 0) {
    return `${integer}`;
  }
  return `${integer}.${decimal.toString().padStart(2, "0")}`.replace(/\.?0+$/, "");
}

function quoteSwapMode(): "exactIn" {
  return "exactIn";
}

function assetToTokenAddress(assetId: AssetId): string {
  if (assetId.chain !== Chain.Solana) {
    throw new SwapperException({ type: "not_supported_chain" });
  }
  if (!assetId.tokenId) {
    return SOLANA_NATIVE_TOKEN_ADDRESS;
  }
  if (!isValidAddress(assetId.tokenId)) {
    throw new SwapperException({
      type: "compute_quote_error",
      message: `Invalid address: ${assetId.tokenId}`,
    });
  }
  return assetId.tokenId;
}

function referralFeePercent(request: QuoteRequest): string | undefined {
  if (request.referral_bps <= 0) {
    return undefined;
  }
  return bpsToPercent(request.referral_bps);
}

function referralFeeAddress(request: QuoteRequest): string | undefined {
  if (request.referral_bps <= 0) {
    return undefined;
  }
  return getReferrerAddresses().solana || undefined;
}

function maxAutoSlippagePercent(request: QuoteRequest): string | undefined {
  if (request.slippage_bps <= 0) {
    return undefined;
  }
  return bpsToPercent(request.slippage_bps * 2);
}

function percentToBps(value: string): number | undefined {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0) {
    return undefined;
  }
  return Math.round(percent * 100);
}

function buildSwapRequest(request: QuoteRequest, route: OkxQuoteResponse): OkxSwapRequest {
  return {
    chainIndex: SOLANA_SLIP44,
    amount: request.from_value,
    swapMode: quoteSwapMode(),
    fromTokenAddress: route.fromToken.tokenContractAddress,
    toTokenAddress: route.toToken.tokenContractAddress,
    userWalletAddress: request.from_address,
    autoSlippage: true,
    maxAutoSlippagePercent: maxAutoSlippagePercent(request),
    feePercent: referralFeePercent(request),
    fromTokenReferrerWalletAddress: referralFeeAddress(request),
  };
}

function suggestedSlippage(response: OkxSwapResponse | undefined): {
  suggestedSlippagePercent?: string;
  suggestedSlippageBps?: number;
} {
  const value = response?.tx?.slippagePercent;
  if (!value) {
    return {};
  }

  const bps = percentToBps(value);
  return {
    suggestedSlippagePercent: value,
    suggestedSlippageBps: bps,
  };
}

export class OkxProvider implements Protocol {
  private readonly client: OkxClient;

  constructor(client?: OkxClient) {
    if (client) {
      this.client = client;
      return;
    }

    const requiredEnv = [OKX_API_KEY, OKX_SECRET_KEY, OKX_API_PASSPHRASE, OKX_PROJECT_ID];
    const missing = requiredEnv.filter((name) => !process.env[name]);

    if (missing.length > 0) {
      throw new Error(`Missing OKX auth env variables: ${missing.join(", ")}`);
    }

    this.client = new OkxClient(OkxAuth.fromEnv());
  }

  async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
    const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
    const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

    const response = await this.client.getQuote({
      chainIndex: SOLANA_SLIP44,
      amount: quoteRequest.from_value,
      swapMode: quoteSwapMode(),
      fromTokenAddress: assetToTokenAddress(fromAsset),
      toTokenAddress: assetToTokenAddress(toAsset),
      feePercent: referralFeePercent(quoteRequest),
    });

    if (response.code !== "0") {
      throw new SwapperException({
        type: "compute_quote_error",
        message: response.msg || "Failed to fetch OKX quote",
      });
    }

    const route = response.data[0];
    if (!route) {
      throw new SwapperException({ type: "no_quote_available" });
    }

    const swapResponse = await this.client.getSwap(buildSwapRequest(quoteRequest, route));

    if (swapResponse.code !== "0") {
      throw new SwapperException({
        type: "compute_quote_error",
        message: swapResponse.msg || "Failed to fetch OKX auto slippage suggestion",
      });
    }

    const routeData: OkxRouteData = {
      ...route,
      ...suggestedSlippage(swapResponse.data[0]),
    };

    return {
      quote: quoteRequest,
      output_value: route.toTokenAmount,
      output_min_value: route.toTokenAmount,
      eta_in_seconds: 0,
      route_data: routeData,
    };
  }

  async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
    const route = quote.route_data as OkxQuoteResponse | undefined;
    if (!route || !route.fromToken || !route.toToken) {
      throw new SwapperException({ type: "invalid_route" });
    }

    const swapRequest = buildSwapRequest(quote.quote, route);

    const response = await this.client.getSwap(swapRequest);

    if (response.code !== "0") {
      throw new SwapperException({
        type: "compute_quote_error",
        message: response.msg || "Failed to fetch OKX quote data",
      });
    }

    const data = response.data[0];
    if (!data || !data.tx || !data.tx.data) {
      throw new SwapperException({ type: "no_quote_available" });
    }

    let serializedBase64: string;
    try {
      serializedBase64 = Buffer.from(bs58.decode(data.tx.data)).toString("base64");
    } catch (error) {
      throw new SwapperException({
        type: "transaction_error",
        message: `invalid swap tx data: ${String(error)}`,
      });
    }

    return {
      to: data.tx.to,
      value: "0",
      data: serializedBase64,
      dataType: SwapQuoteDataType.Contract,
    };
  }
}
