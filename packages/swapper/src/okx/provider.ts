import { AssetId, Chain, Quote, QuoteRequest, SwapQuoteData, SwapQuoteDataType } from "@gemwallet/types";
import { OKXDexClient } from "@okx-dex/okx-dex-sdk";
import type { QuoteData, SwapParams, TransactionData } from "@okx-dex/okx-dex-sdk";
import bs58 from "bs58";

import { Connection, VersionedTransaction } from "@solana/web3.js";

import { BigIntMath } from "../bigint_math";
import { checkEvmApproval } from "../chain/evm/allowance";
import { DEFAULT_COMMITMENT } from "../chain/solana/constants";
import { estimateComputeUnitLimit as simulateComputeUnits } from "../chain/solana/tx_builder";
import { SwapperException } from "../error";
import { Protocol } from "../protocol";
import { getReferrerAddresses } from "../referrer";
import {
    CHAIN_INDEX,
    DEFAULT_SLIPPAGE_PERCENT,
    EVM_NATIVE_TOKEN_ADDRESS,
    SOLANA_DEX_IDS_PARAM,
    SOLANA_NATIVE_TOKEN_ADDRESS,
    evmGasLimit,
} from "./constants";

function bpsToPercent(bps: number): string {
    return (bps / 100).toString();
}

function chainIndex(chain: Chain): string {
    const index = CHAIN_INDEX[chain];
    if (!index) throw new SwapperException({ type: "not_supported_chain" });
    return index;
}

function isEvmChain(chain: Chain): boolean {
    return chain in CHAIN_INDEX && chain !== Chain.Solana;
}

function dexIds(chain: Chain): string | undefined {
    return chain === Chain.Solana ? SOLANA_DEX_IDS_PARAM : undefined;
}

function assetToTokenAddress(assetId: AssetId): string {
    if (assetId.chain === Chain.Solana) {
        return assetId.tokenId || SOLANA_NATIVE_TOKEN_ADDRESS;
    }
    if (isEvmChain(assetId.chain)) {
        return assetId.tokenId || EVM_NATIVE_TOKEN_ADDRESS;
    }
    throw new SwapperException({ type: "not_supported_chain" });
}

function referralFeePercent(request: QuoteRequest): string | undefined {
    if (request.referral_bps <= 0) {
        return undefined;
    }
    return bpsToPercent(request.referral_bps);
}

function referralFeeAddress(request: QuoteRequest, chain: Chain): string | undefined {
    if (request.referral_bps <= 0) {
        return undefined;
    }
    const referrers = getReferrerAddresses();
    switch (chain) {
        case Chain.Solana:
            return referrers.solana;
        default:
            return referrers.evm;
    }
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

function buildSwapParams(request: QuoteRequest, route: QuoteData, chain: Chain): SwapParams {
    return {
        chainIndex: chainIndex(chain),
        amount: request.from_value,
        fromTokenAddress: route.fromToken.tokenContractAddress,
        toTokenAddress: route.toToken.tokenContractAddress,
        userWalletAddress: request.from_address,
        dexIds: dexIds(chain),
        slippagePercent: slippagePercent(request),
        autoSlippage: true,
        maxAutoSlippagePercent: maxAutoSlippagePercent(request),
        feePercent: referralFeePercent(request),
        fromTokenReferrerWalletAddress: referralFeeAddress(request, chain),
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
    private readonly connection: Connection;

    constructor(solanaRpcEndpoint: string, client?: OKXDexClient) {
        this.connection = new Connection(solanaRpcEndpoint, { commitment: DEFAULT_COMMITMENT });

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

    private async estimateComputeUnitLimit(txData: string): Promise<string | undefined> {
        try {
            const bytes = bs58.decode(txData);
            const tx = VersionedTransaction.deserialize(bytes);
            const estimate = await simulateComputeUnits(this.connection, tx);
            return estimate?.toString();
        } catch (error) { void error; }
        return undefined;
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);
        const chain = fromAsset.chain;

        const fromTokenAddress = assetToTokenAddress(fromAsset);
        const toTokenAddress = assetToTokenAddress(toAsset);

        const response = await this.client.dex.getQuote({
            chainIndex: chainIndex(chain),
            amount: quoteRequest.from_value,
            fromTokenAddress,
            toTokenAddress,
            dexIds: dexIds(chain),
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

        const fromAsset = AssetId.fromString(quote.quote.from_asset.id);
        const chain = fromAsset.chain;
        const isTokenSwap = isEvmChain(chain) && !!fromAsset.tokenId;

        const [response, approveSpender] = await Promise.all([
            this.client.dex.getSwapData(buildSwapParams(quote.quote, route, chain)),
            isTokenSwap ? this.getApproveSpender(chain) : Promise.resolve(undefined),
        ]);

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

        if (isEvmChain(chain)) {
            return this.buildEvmQuoteData(swapData.tx, fromAsset, quote.quote.from_address, quote.quote.from_value, approveSpender);
        }

        return this.buildSolanaQuoteData(swapData.tx);
    }

    private async getApproveSpender(chain: Chain): Promise<string | undefined> {
        const chainData = await this.client.dex.getChainData(chainIndex(chain));
        return chainData.data?.[0]?.dexTokenApproveAddress ?? undefined;
    }

    private async buildEvmQuoteData(
        tx: TransactionData,
        fromAsset: AssetId,
        owner: string,
        fromValue: string,
        approveSpender?: string,
    ): Promise<SwapQuoteData> {
        const approval = await checkEvmApproval(fromAsset.chain, fromAsset.tokenId, owner, fromValue, approveSpender);
        return {
            to: tx.to,
            value: tx.value || "0",
            data: tx.data,
            dataType: SwapQuoteDataType.Contract,
            gasLimit: approval ? evmGasLimit(fromAsset.chain) : undefined,
            approval,
        };
    }

    private async buildSolanaQuoteData(tx: TransactionData): Promise<SwapQuoteData> {
        const gasLimit = await this.estimateComputeUnitLimit(tx.data);

        let serializedBase64: string;
        try {
            serializedBase64 = Buffer.from(bs58.decode(tx.data)).toString("base64");
        } catch (error) {
            throw new SwapperException({
                type: "transaction_error",
                message: `invalid swap tx data: ${String(error)}`,
            });
        }

        return {
            to: tx.to,
            value: "0",
            data: serializedBase64,
            dataType: SwapQuoteDataType.Contract,
            gasLimit,
        };
    }
}
