import { AssetId, Chain, Quote, QuoteData, QuoteRequest } from "@gemwallet/types";
import { getReferrerAddresses } from "../referrer";

import { Protocol } from "../protocol";
import { SymbiosisApiClient, SYMBIOSIS_BASE_URL, SymbiosisApiResponse } from "./client";
import { buildTronQuoteData, TronChainId } from "./tron";
import { TronWeb } from "tronweb";

export class SymbiosisProvider implements Protocol {
    private apiClient: SymbiosisApiClient;
    private tronweb: TronWeb;

    constructor(tronNode: string) {
        this.apiClient = new SymbiosisApiClient(SYMBIOSIS_BASE_URL);
        this.tronweb = new TronWeb(
            { fullHost: tronNode }
        );
    }

    private mapChainToSymbiosisApiChainId(chain: Chain): number {
        switch (chain) {
            case Chain.Tron: return TronChainId;
            default: throw new Error(`Not enabled for chain: ${chain}`);
        }
    }

    private getApiTokenAddress(asset: AssetId): string {
        if (asset.isNative()) {
            switch (asset.chain) {
                case Chain.Tron: return '';
                default: throw new Error(`Not enabled for chain: ${asset.chain}`);
            }
        }
        return asset.tokenId!;
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        // Use asset IDs from the nested objects
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

        // Validate nested decimals
        if (quoteRequest.from_asset.decimals === 0) {
            throw new Error(`Missing required from_asset.decimals`);
        }
        if (quoteRequest.to_asset.decimals === 0) {
            throw new Error(`Missing required to_asset.decimals`);
        }

        const fromChainId = this.mapChainToSymbiosisApiChainId(fromAsset.chain);
        const toChainId = this.mapChainToSymbiosisApiChainId(toAsset.chain);
        const referralAddresses = getReferrerAddresses();

        const apiRequestBody = {
            tokenAmountIn: {
                address: this.getApiTokenAddress(fromAsset),
                chainId: fromChainId,
                decimals: quoteRequest.from_asset.decimals,
                amount: quoteRequest.from_value,
            },
            tokenOut: {
                address: this.getApiTokenAddress(toAsset),
                chainId: toChainId,
                decimals: quoteRequest.to_asset.decimals,
            },
            from: quoteRequest.from_address,
            to: quoteRequest.to_address,
            slippage: quoteRequest.slippage_bps,
            partnerAddress: referralAddresses.tron || undefined,
            refundAddress: quoteRequest.from_address,
        };

        try {
            const swapResult = await this.apiClient.fetchSwapQuote(apiRequestBody);

            return {
                quote: quoteRequest,
                output_value: swapResult.tokenAmountOut.amount,
                output_min_value: swapResult.tokenAmountOutMin.amount,
                route_data: swapResult,
                eta_in_seconds: swapResult.estimatedTime ?? 0
            };

        } catch (error) {
            console.error("SymbiosisProvider: Error fetching quote from API client:", error);
            throw new Error(`Failed to get Symbiosis quote: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const response = quote.route_data as SymbiosisApiResponse;


        if (response.type !== Chain.Tron) {
            throw new Error("Symbiosis only supports Tron");
        }

        return buildTronQuoteData(this.tronweb, response.tx);
    }
}
