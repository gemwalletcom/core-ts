import { QuoteRequest, Quote, SwapQuoteData, AssetId, Chain, SwapQuoteDataType } from "@gemwallet/types";

import { SwapperException } from "../error";
import { Protocol } from "../protocol";
import { fetchRoute } from "./client";
import { SquidRouteRequest } from "./model";

export class SquidProvider implements Protocol {
    private integratorId: string;

    constructor(integratorId: string) {
        this.integratorId = integratorId;
    }

    mapChainToSquidChainId(chain: Chain): string {
        switch (chain) {
            case Chain.Cosmos:
                return "cosmoshub-4";
            case Chain.Osmosis:
                return "osmosis-1";
            case Chain.Celestia:
                return "celestia";
            case Chain.Injective:
                return "injective-1";
            case Chain.Sei:
                return "pacific-1";
            case Chain.Noble:
                return "noble-1";
            default:
                throw new SwapperException({ type: "not_supported_chain" });
        }
    }

    mapAssetToSquidToken(assetId: AssetId): string {
        if (assetId.isNative()) {
            switch (assetId.chain) {
                case Chain.Cosmos:
                    return "uatom";
                case Chain.Osmosis:
                    return "uosmo";
                case Chain.Celestia:
                    return "utia";
                case Chain.Injective:
                    return "inj";
                case Chain.Sei:
                    return "usei";
                case Chain.Noble:
                    return "uusdc";
                default:
                    throw new SwapperException({ type: "not_supported_asset" });
            }
        }
        return assetId.getTokenId();
    }

    private buildRouteRequest(quoteRequest: QuoteRequest, quoteOnly: boolean): SquidRouteRequest {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

        return {
            fromChain: this.mapChainToSquidChainId(fromAsset.chain),
            toChain: this.mapChainToSquidChainId(toAsset.chain),
            fromToken: this.mapAssetToSquidToken(fromAsset),
            toToken: this.mapAssetToSquidToken(toAsset),
            fromAmount: quoteRequest.from_value,
            fromAddress: quoteRequest.from_address,
            toAddress: quoteRequest.to_address,
            slippageConfig: {
                autoMode: 1,
            },
            quoteOnly,
        };
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const params = this.buildRouteRequest(quoteRequest, true);
        const { route } = await fetchRoute(params, this.integratorId);

        return {
            quote: quoteRequest,
            output_value: route.estimate.toAmount,
            output_min_value: route.estimate.toAmountMin,
            route_data: {},
            eta_in_seconds: route.estimate.estimatedRouteDuration,
        };
    }

    async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
        const params = this.buildRouteRequest(quote.quote, false);
        const { route } = await fetchRoute(params, this.integratorId);
        const tx = route.transactionRequest;

        return {
            to: tx.target,
            value: tx.value,
            data: tx.data,
            dataType: SwapQuoteDataType.Contract,
            gasLimit: tx.gasLimit,
        };
    }
}
