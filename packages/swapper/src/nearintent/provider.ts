import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, AssetId, Chain } from '@gemwallet/types';
import { NearIntentClient } from './client';
import { NearIntentQuoteRequest, NearIntentQuoteResponse } from './model';
import { getReferrerAddresses } from '../referrer';

export class NearIntentProvider implements Protocol {
    private client: NearIntentClient;

    constructor(baseUrl?: string, apiToken?: string) {
        this.client = new NearIntentClient(baseUrl, apiToken);
    }

    private mapChainToBlockchain(chain: Chain): string {
        switch (chain) {
            case Chain.Ethereum:
                return "eth";
            case Chain.Arbitrum:
                return "arb";
            case Chain.Bitcoin:
                return "btc";
            case Chain.Solana:
                return "sol";
            case Chain.Berachain:
                return "bera";
            case Chain.SmartChain:
                return "bsc";
            case Chain.Polygon:
                return "pol";
            case Chain.Optimism:
                return "op";
            case Chain.AvalancheC:
                return "avax";
            default:
                // For chains where enum value matches blockchain identifier
                const supportedChains = ["near", "base", "ton", "doge", "xrp", "gnosis", "tron", "sui", "cardano"];
                if (supportedChains.includes(chain)) {
                    return chain;
                }
                throw new Error(`Unsupported chain: ${chain}`);
        }
    }

    private buildAssetId(asset: AssetId): string {
        const blockchain = this.mapChainToBlockchain(asset.chain);
        
        if (asset.isNative()) {
            return blockchain;
        }
        
        return `${blockchain}:${asset.tokenId}`;
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
            slippageTolerance: quoteRequest.slippage_bps / 100, // Convert basis points to percentage
            appFees: [{
                recipient: referrerAddresses.near,
                fee: quoteRequest.referral_bps
            }]
        };

        const quoteResponse: NearIntentQuoteResponse = await this.client.fetchQuote(nearIntentRequest);

        return {
            quote: quoteRequest,
            output_value: quoteResponse.outputAmount,
            output_min_value: quoteResponse.outputAmountMin,
            eta_in_seconds: quoteResponse.estimatedSwapTime,
            route_data: {
                depositAddress: quoteResponse.depositAddress
            }
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const routeData = quote.route_data as { depositAddress: string };
        
        return {
            to: routeData.depositAddress,
            value: quote.quote.from_value,
            data: "0x",
            gasLimit: undefined
        };
    }
}