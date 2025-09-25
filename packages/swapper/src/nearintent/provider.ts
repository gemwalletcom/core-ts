import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, AssetId, Chain } from '@gemwallet/types';
import { NearIntentsClient } from './client';
import { NearIntentsQuoteRequest, NearIntentsQuoteResponse } from './model';
import { getReferrerAddresses } from '../referrer';
import { getNearIntentsAssetId } from './assets';
import { buildEvmTransactionData } from './evm';
import { buildSolanaTransactionData } from './solana';
import { buildSuiTransactionData } from './sui';
import { buildTronTransactionData } from './tron';
import { buildTonTransactionData } from './ton';
import { Connection } from '@solana/web3.js';
import { SuiClient } from '@mysten/sui/client';

export class NearIntentsProvider implements Protocol {
    private client: NearIntentsClient;
    private solanaConnection?: Connection;
    private suiClient?: SuiClient;

    constructor(baseUrl?: string, apiToken?: string, solanaRpcUrl?: string, suiRpcUrl?: string) {
        this.client = new NearIntentsClient(baseUrl, apiToken);
        
        if (solanaRpcUrl) {
            this.solanaConnection = new Connection(solanaRpcUrl, 'confirmed');
        }
        
        if (suiRpcUrl) {
            this.suiClient = new SuiClient({ url: suiRpcUrl });
        }
    }


    private buildAssetId(asset: AssetId): string {
        return getNearIntentsAssetId(asset.chain, asset.toString());
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);
        const referrerAddresses = getReferrerAddresses();

        const nearIntentsRequest: NearIntentsQuoteRequest = {
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
            deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
            quoteWaitingTimeMs: 1000,
            dry: true // Get quotes only
        };

        const response: NearIntentsQuoteResponse = await this.client.fetchQuote(nearIntentsRequest);

        return {
            quote: quoteRequest,
            output_value: response.quote.amountOut,
            output_min_value: response.quote.minAmountOut,
            eta_in_seconds: response.quote.timeEstimate,
            route_data: nearIntentsRequest
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const routeData = quote.route_data as NearIntentsQuoteRequest;
        const fromAsset = AssetId.fromString(quote.quote.from_asset.id);

        // Make another quote request with dry: false to get deposit address
        const quoteRequest: NearIntentsQuoteRequest = {
            ...routeData,
            dry: false
        };

        const response: NearIntentsQuoteResponse = await this.client.fetchQuote(quoteRequest);

        if (!response.quote.depositAddress || !response.quote.amountIn) {
            throw new Error("Failed to get deposit address from Near Intents API");
        }

        // Build transaction data based on the source chain
        return await this.buildTransactionData(
            fromAsset,
            response.quote.depositAddress,
            response.quote.amountIn,
            quote.quote.from_address
        );
    }

    private async buildTransactionData(
        fromAsset: AssetId,
        depositAddress: string,
        amount: string,
        fromAddress: string
    ): Promise<QuoteData> {
        switch (fromAsset.chain) {
            case Chain.Ethereum:
            case Chain.Arbitrum:
            case Chain.Base:
            case Chain.Optimism:
            case Chain.SmartChain:
            case Chain.AvalancheC:
                return buildEvmTransactionData(fromAsset, depositAddress, amount);
            
            case Chain.Solana:
                return await buildSolanaTransactionData(fromAsset, depositAddress, amount, fromAddress, this.solanaConnection);
            
            case Chain.Sui:
                return await buildSuiTransactionData(fromAsset, depositAddress, amount, fromAddress, this.suiClient);

            case Chain.Tron:
                return buildTronTransactionData(fromAsset, depositAddress, amount);

            case Chain.Ton:
                return await buildTonTransactionData(fromAsset, depositAddress, amount, fromAddress);
            
            default:
                // For unsupported chains, let the client handle the transaction building
                return {
                    to: depositAddress,
                    value: amount,
                    data: "0x",
                };
        }
    }
}