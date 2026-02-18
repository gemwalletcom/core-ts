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
import {
  SOLANA_CHAIN_INDEX,
  SOLANA_NATIVE_TOKEN_ADDRESS,
  SOLANA_DEX_IDS_PARAM,
  DEFAULT_SLIPPAGE_PERCENT,
} from "./constants";
import { COMPUTE_UNIT_MULTIPLIER } from "../chain/solana/tx_builder";
import { BigIntMath } from "../bigint_math";

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

function buildSwapParams(request: QuoteRequest, route: QuoteData): SwapParams {
  return {
    chainIndex: SOLANA_CHAIN_INDEX,
    amount: request.from_value,
    fromTokenAddress: route.fromToken.tokenContractAddress,
    toTokenAddress: route.toToken.tokenContractAddress,
    userWalletAddress: request.from_address,
    dexIds: SOLANA_DEX_IDS_PARAM,
    slippagePercent: slippagePercent(request),
    autoSlippage: true,
    maxAutoSlippagePercent: maxAutoSlippagePercent(request),
    feePercent: referralFeePercent(request),
    fromTokenReferrerWalletAddress: referralFeeAddress(request),
  };
}

function minOutputValue(route: QuoteData, slippageBps: number): string {
  if (route.tx?.minReceiveAmount) {
    return route.tx.minReceiveAmount;
  }
  const bps = slippageBps > 0 ? slippageBps : 100;
  return BigIntMath.applySlippage(route.toTokenAmount, bps);
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

  private async estimateComputeUnitLimit(tx: TransactionData): Promise<string | undefined> {
    try {
      const result = await this.client.dex.getGasLimit({
        chainIndex: SOLANA_CHAIN_INDEX,
        fromAddress: tx.from,
        toAddress: tx.to,
        extJson: { inputData: tx.data },
      });

      if (result.code === "0") {
        const raw = Number(result.data[0]?.gasLimit);
        if (raw > 0) {
          return Math.ceil(raw * COMPUTE_UNIT_MULTIPLIER).toString();
        }
      }
    } catch {
      console.warn("Failed to estimate compute unit limit");
    }
    return undefined;
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
      dexIds: SOLANA_DEX_IDS_PARAM,
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

    return {
      quote: quoteRequest,
      output_value: route.toTokenAmount,
      output_min_value: minOutputValue(route, quoteRequest.slippage_bps),
      eta_in_seconds: 0,
      route_data: route,
    };
  }

  async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
    const route = quote.route_data as QuoteData | undefined;
    if (!route || !route.fromToken || !route.toToken) {
      throw new SwapperException({ type: "invalid_route" });
    }

    const response = await this.client.dex.getSwapData(buildSwapParams(quote.quote, route));

    if (response.code !== "0") {
      throw new SwapperException({
        type: "compute_quote_error",
        message: response.msg || "Failed to fetch OKX quote data",
      });
    }

    const swapData = response.data[0];
    if (!swapData?.tx?.data) {
      throw new SwapperException({ type: "invalid_route" });
    }

    const gasLimit = await this.estimateComputeUnitLimit(swapData.tx);

    let serializedBase64: string;
    try {
      serializedBase64 = Buffer.from(bs58.decode(swapData.tx.data)).toString("base64");
    } catch (error) {
      throw new SwapperException({
        type: "transaction_error",
        message: `invalid swap tx data: ${String(error)}`,
      });
    }

    return {
      to: swapData.tx.to,
      value: "0",
      data: serializedBase64,
      dataType: SwapQuoteDataType.Contract,
      gasLimit,
    };
  }
}
