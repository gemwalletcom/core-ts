import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, AssetId, Chain } from '@gemwallet/types';
import { NearIntentsClient } from './client';
import { NearIntentsQuoteRequest, NearIntentsQuoteResponse } from './model';
import { getReferrerAddresses } from '../referrer';
import { getNearIntentsAssetId } from './assets';

export class NearIntentsProvider implements Protocol {
    private client: NearIntentsClient;

    constructor(baseUrl?: string, apiToken?: string) {
        this.client = new NearIntentsClient(baseUrl, apiToken);
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
        return this.buildTransactionData(
            fromAsset,
            response.quote.depositAddress,
            response.quote.amountIn,
            quote.quote.from_address
        );
    }

    private buildTransactionData(
        fromAsset: AssetId,
        depositAddress: string,
        amount: string,
        fromAddress: string
    ): QuoteData {
        switch (fromAsset.chain) {
            case Chain.Ethereum:
            case Chain.Arbitrum:
            case Chain.Base:
            case Chain.Optimism:
            case Chain.SmartChain:
            case Chain.AvalancheC:
                return this.buildEvmTransactionData(fromAsset, depositAddress, amount);
            
            case Chain.Solana:
                return this.buildSolanaTransactionData(fromAsset, depositAddress, amount, fromAddress);
            
            case Chain.Sui:
                return this.buildSuiTransactionData(fromAsset, depositAddress, amount);

            case Chain.Tron:
                return this.buildTronTransactionData(fromAsset, depositAddress, amount);

            case Chain.Ton:
                return this.buildTonTransactionData(fromAsset, depositAddress, amount);
            
            default:
                throw new Error(`Unsupported chain for Near Intents: ${fromAsset.chain}`);
        }
    }

    private buildEvmTransactionData(fromAsset: AssetId, depositAddress: string, amount: string): QuoteData {
        if (fromAsset.isNative()) {
            // Native token transfer (ETH, BNB, AVAX, etc.)
            return {
                to: depositAddress,
                value: amount,
                data: "0x",
            };
        } else {
            // ERC20 token transfer
            // transfer(address to, uint256 amount) = 0xa9059cbb
            const transferSelector = "0xa9059cbb";
            const paddedAddress = depositAddress.replace("0x", "").padStart(64, "0");
            const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
            const data = transferSelector + paddedAddress + paddedAmount;

            return {
                to: fromAsset.tokenId!,
                value: "0",
                data: data,
            };
        }
    }

    private buildSolanaTransactionData(fromAsset: AssetId, depositAddress: string, amount: string, fromAddress: string): QuoteData {
        // For Solana, we return placeholder data since building a complete transaction
        // requires async operations with RPC calls. This would need to be handled
        // by the client with proper Solana SDK integration.
        return {
            to: depositAddress,
            value: amount,
            data: JSON.stringify({
                type: "solana_transfer",
                mint: fromAsset.isNative() ? "So11111111111111111111111111111111111111112" : fromAsset.tokenId,
                from: fromAddress,
                to: depositAddress,
                amount: amount,
                isNative: fromAsset.isNative()
            }),
        };
    }

    private buildSuiTransactionData(fromAsset: AssetId, depositAddress: string, amount: string): QuoteData {
        // For Sui, we return placeholder data since building a complete transaction
        // requires async operations with RPC calls. This would need to be handled
        // by the client with proper Sui SDK integration.
        return {
            to: depositAddress,
            value: amount,
            data: JSON.stringify({
                type: "sui_transfer",
                coinType: fromAsset.isNative() ? "0x2::sui::SUI" : fromAsset.tokenId,
                to: depositAddress,
                amount: amount,
                isNative: fromAsset.isNative()
            }),
        };
    }

    private buildTronTransactionData(fromAsset: AssetId, depositAddress: string, amount: string): QuoteData {
        if (fromAsset.isNative()) {
            // Native TRX transfer
            return {
                to: depositAddress,
                value: amount,
                data: "0x",
            };
        } else {
            // TRC20 token transfer - similar to ERC20 but for TRON
            // transfer(address to, uint256 amount) = 0xa9059cbb
            const transferSelector = "0xa9059cbb";
            // TRON addresses need to be converted to hex format (41 prefix + 20 bytes)
            const tronAddressHex = depositAddress.length === 34 ? 
                this.base58ToHex(depositAddress) : depositAddress;
            const paddedAddress = tronAddressHex.replace("0x", "").replace("41", "").padStart(64, "0");
            const paddedAmount = BigInt(amount).toString(16).padStart(64, "0");
            const data = transferSelector + paddedAddress + paddedAmount;

            return {
                to: fromAsset.tokenId!,
                value: "0",
                data: data,
            };
        }
    }

    private buildTonTransactionData(fromAsset: AssetId, depositAddress: string, amount: string): QuoteData {
        // For TON, we return placeholder data since building a complete transaction
        // requires TON SDK integration with proper message construction.
        return {
            to: depositAddress,
            value: amount,
            data: JSON.stringify({
                type: "ton_transfer",
                tokenContract: fromAsset.isNative() ? null : fromAsset.tokenId,
                to: depositAddress,
                amount: amount,
                isNative: fromAsset.isNative()
            }),
        };
    }

    // Helper method to convert TRON base58 address to hex
    private base58ToHex(base58: string): string {
        // This is a simplified conversion - in practice, you'd use a proper base58 library
        // For now, we'll just return as-is and let the client handle the conversion
        return base58;
    }
}