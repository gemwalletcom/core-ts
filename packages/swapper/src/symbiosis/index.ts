import { Asset, Chain, Quote, QuoteData, QuoteRequest } from "@gemwallet/types";

import { Protocol } from "../protocol";
import { SymbiosisApiClient, DEFAULT_SYMBIOSIS_BASE_API_URL, SymbiosisApiResponse } from "./client";

export class SymbiosisProvider implements Protocol {
    private apiClient: SymbiosisApiClient;

    constructor(baseUrl: string = DEFAULT_SYMBIOSIS_BASE_API_URL) {
        this.apiClient = new SymbiosisApiClient(baseUrl);
    }

    private mapChainToSymbiosisApiChainId(chain: Chain): number {
        switch (chain) {
            case Chain.Tron: return 728126428;
            default: throw new Error(`Not enabled for chain: ${chain}`);
        }
    }

    private getApiTokenAddress(asset: Asset): string {
        if (asset.isNative()) {
            switch (asset.chain) {
                case Chain.Tron: return '';
                default: throw new Error(`Not enabled for chain: ${asset.chain}`);
            }
        }
        return asset.tokenId!;
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        console.log("SymbiosisProvider: Preparing quote request:", quoteRequest);

        const fromAsset = Asset.fromString(quoteRequest.from_asset);
        const toAsset = Asset.fromString(quoteRequest.to_asset);

        // Validate decimals before proceeding - check for undefined
        if (quoteRequest.from_asset_decimals === undefined) {
            throw new Error(`Missing required from_asset_decimals`);
        }
        if (quoteRequest.to_asset_decimals === undefined) {
            throw new Error(`Missing required to_asset_decimals`);
        }

        const fromChainId = this.mapChainToSymbiosisApiChainId(fromAsset.chain);
        const toChainId = this.mapChainToSymbiosisApiChainId(toAsset.chain);

        const apiRequestBody = {
            tokenAmountIn: {
                address: this.getApiTokenAddress(fromAsset),
                chainId: fromChainId,
                decimals: quoteRequest.from_asset_decimals,
                amount: quoteRequest.from_value,
            },
            tokenOut: {
                address: this.getApiTokenAddress(toAsset),
                chainId: toChainId,
                decimals: quoteRequest.to_asset_decimals,
            },
            from: quoteRequest.from_address,
            to: quoteRequest.to_address,
            slippage: parseInt(quoteRequest.slippage_bps.toString(), 10),
            partnerAddress: quoteRequest.referral_address || undefined,
            refundAddress: quoteRequest.from_address,
        };

        try {
            const swapResult = await this.apiClient.fetchSwapQuote(apiRequestBody);

            return {
                quote: quoteRequest,
                output_value: swapResult.tokenAmountOut.amount,
                output_min_value: swapResult.tokenAmountOutMin.amount,
                route_data: swapResult
            };

        } catch (error) {
            console.error("SymbiosisProvider: Error fetching quote from API client:", error);
            throw new Error(`Failed to get Symbiosis quote: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        console.log("SymbiosisProvider get_quote_data called with quote containing route_data:", quote.route_data);

        const apiResult = quote.route_data as SymbiosisApiResponse;
        const txData = apiResult?.tx;

        if (!txData || typeof txData.to !== 'string' || typeof txData.data !== 'string') {
            console.error("Missing or invalid tx data in Symbiosis route_data", apiResult);
            throw new Error("Missing or invalid transaction data in Symbiosis API response");
        }

        return {
            to: txData.to,
            value: txData.value?.toString() ?? "0",
            data: JSON.stringify(txData),
        };
    }
}
