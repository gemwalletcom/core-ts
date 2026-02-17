import bs58 from "bs58";
import { OKXDexClient } from "@okx-dex/okx-dex-sdk";
import type { QuoteData, SwapParams, TransactionData } from "@okx-dex/okx-dex-sdk";

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
import type { OkxRouteData } from "./model";

const SOLANA_CHAIN_INDEX = "501";
const SOLANA_NATIVE_TOKEN_ADDRESS = "11111111111111111111111111111111";

function isValidAddress(address: string): boolean {
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toString();
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

const DEFAULT_SLIPPAGE_PERCENT = "1";

function slippagePercent(request: QuoteRequest): string {
  if (request.slippage_bps <= 0) {
    return DEFAULT_SLIPPAGE_PERCENT;
  }
  const percent = request.slippage_bps / 100;
  return Math.min(percent, 1).toString();
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

function buildSwapParams(request: QuoteRequest, route: QuoteData): SwapParams {
  return {
    chainIndex: SOLANA_CHAIN_INDEX,
    amount: request.from_value,
    fromTokenAddress: route.fromToken.tokenContractAddress,
    toTokenAddress: route.toToken.tokenContractAddress,
    userWalletAddress: request.from_address,
    slippagePercent: slippagePercent(request),
    autoSlippage: true,
    maxAutoSlippagePercent: maxAutoSlippagePercent(request),
    feePercent: referralFeePercent(request),
    fromTokenReferrerWalletAddress: referralFeeAddress(request),
  };
}

function suggestedSlippage(tx: TransactionData | undefined): {
  suggestedSlippagePercent?: string;
  suggestedSlippageBps?: number;
} {
  const value = tx?.slippagePercent;
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
  private readonly client: OKXDexClient;

  constructor(client?: OKXDexClient) {
    if (client) {
      this.client = client;
      return;
    }

    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const apiPassphrase = process.env.OKX_API_PASSPHRASE;
    const projectId = process.env.OKX_PROJECT_ID;

    const missing = [
      !apiKey && "OKX_API_KEY",
      !secretKey && "OKX_SECRET_KEY",
      !apiPassphrase && "OKX_API_PASSPHRASE",
      !projectId && "OKX_PROJECT_ID",
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(`Missing OKX auth env variables: ${missing.join(", ")}`);
    }

    this.client = new OKXDexClient({
      apiKey: apiKey!,
      secretKey: secretKey!,
      apiPassphrase: apiPassphrase!,
      projectId: projectId!,
    });
  }

  async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
    const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
    const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

    const fromTokenAddress = assetToTokenAddress(fromAsset);
    const toTokenAddress = assetToTokenAddress(toAsset);

    const response = await this.client.dex.getQuote({
      chainIndex: SOLANA_CHAIN_INDEX,
      amount: quoteRequest.from_value,
      fromTokenAddress,
      toTokenAddress,
      slippagePercent: slippagePercent(quoteRequest),
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

    const swapResponse = await this.client.dex.getSwapData(
      buildSwapParams(quoteRequest, route),
    );

    if (swapResponse.code !== "0") {
      throw new SwapperException({
        type: "compute_quote_error",
        message: swapResponse.msg || "Failed to fetch OKX auto slippage suggestion",
      });
    }

    const swapData = swapResponse.data[0];
    const routeData: OkxRouteData = {
      ...route,
      ...suggestedSlippage(swapData?.tx),
    };
    const outputMinValue = swapData?.tx?.minReceiveAmount || route.toTokenAmount;

    return {
      quote: quoteRequest,
      output_value: route.toTokenAmount,
      output_min_value: outputMinValue,
      eta_in_seconds: 0,
      route_data: routeData,
    };
  }

  async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
    const route = quote.route_data as QuoteData | undefined;
    if (!route || !route.fromToken || !route.toToken) {
      throw new SwapperException({ type: "invalid_route" });
    }

    const response = await this.client.dex.getSwapData(
      buildSwapParams(quote.quote, route),
    );

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
