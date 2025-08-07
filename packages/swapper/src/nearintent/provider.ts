import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, AssetId } from '@gemwallet/types';
import { NearIntentClient } from './client';
import { NearIntentQuoteRequest, NearIntentQuoteResponse } from './model';
import { getReferrerAddresses } from '../referrer';
import { getNearIntentAssetId } from './assets';

export class NearIntentProvider implements Protocol {
    private client: NearIntentClient;

    constructor(baseUrl?: string, apiToken?: string) {
        this.client = new NearIntentClient(baseUrl, apiToken);
    }


    private buildAssetId(asset: AssetId): string {
        return getNearIntentAssetId(asset.chain, asset.toString());
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);
        const referrerAddresses = getReferrerAddresses();

        const nearIntentRequest: NearIntentQuoteRequest = {
            originAsset: this.buildAssetId(fromAsset),
            destinationAsset: this.buildAssetId(toAsset),
            amount: quoteRequest.from_value,
            recipient: quoteRequest.to_address,
            swapType: "EXACT_INPUT",
            slippageTolerance: quoteRequest.slippage_bps / 100,
            appFees: [{
                recipient: referrerAddresses.near,
                fee: quoteRequest.referral_bps
            }],
            depositType: "ORIGIN_CHAIN",
            refundTo: quoteRequest.from_address,
            refundType: "ORIGIN_CHAIN",
            recipientType: "DESTINATION_CHAIN",
            quoteWaitingTimeMs: 1000,
            dry: true // Get quotes only
        };

        const response: NearIntentQuoteResponse = await this.client.fetchQuote(nearIntentRequest);

        return {
            quote: quoteRequest,
            output_value: response.quote.amountOut,
            output_min_value: response.quote.minAmountOut,
            eta_in_seconds: response.quote.timeEstimate,
            route_data: nearIntentRequest
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const routeData = quote.route_data as NearIntentQuoteRequest;

        // Make another quote request with dry: false to get deposit address
        const quoteRequest: NearIntentQuoteRequest = {
            ...routeData,
            dry: false
        };

        const response: NearIntentQuoteResponse = await this.client.fetchQuote(quoteRequest);

        if (!response.quote.depositAddress || !response.quote.amountIn) {
            throw new Error("Failed to get deposit address from Near Intent API");
        }

        return {
            to: response.quote.depositAddress,
            value: response.quote.amountIn,
            data: "0x",
        };
    }
}