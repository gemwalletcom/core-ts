import { fetchQuote, ChainName, QuoteParams, QuoteOptions, Quote as MayanQuote } from "@mayanfinance/swap-sdk";
import { QuoteRequest, Quote, QuoteData, Asset, Chain } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { buildEvmQuoteData } from "./evm";
import { buildSolanaQuoteData } from "./solana";
import { parseDecimals } from "../bigint";

export class MayanProvider implements Protocol {
    private rpcEndpoint: string;
    constructor(rpcEndpoint: string) {
        this.rpcEndpoint = rpcEndpoint;
    }

    mapAssetToTokenId(asset: Asset): string {
        if (asset.isNative()) {
            if (asset.chain === Chain.Solana) {
                return "So11111111111111111111111111111111111111112";
            } else {
                return "0x0000000000000000000000000000000000000000";
            }
        }
        return asset.tokenId!;
    }

    mapChainToName(chain: Chain): ChainName {
        switch (chain) {
            case Chain.SmartChain:
                return "bsc";
            case Chain.AvalancheC:
                return "avalance" as ChainName;
            default:
                return chain as ChainName;
        }
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = Asset.fromString(quoteRequest.from_asset.toString());
        const toAsset = Asset.fromString(quoteRequest.to_asset.toString());

        const params: QuoteParams = {
            fromToken: this.mapAssetToTokenId(fromAsset),
            toToken: this.mapAssetToTokenId(toAsset),
            amountIn64: quoteRequest.from_value,
            fromChain: this.mapChainToName(fromAsset.chain),
            toChain: this.mapChainToName(toAsset.chain),
            slippageBps: "auto",
            referrer: quoteRequest.referral_address,
            referrerBps: quoteRequest.referral_bps
        }

        // explicitly set which types of quotes we want to fetch
        const options: QuoteOptions = {
            "wormhole": true,
            "swift": true,
            "gasless": false,
            "mctp": true,
            "shuttle": false,
            "fastMctp": true,
            "onlyDirect": false,
        }

        const quotes = await fetchQuote(params, options);

        if (!quotes || quotes.length === 0) {
            throw new Error("No quotes available");
        }

        const quote = quotes[0];

        const output_value = parseDecimals(quote.expectedAmountOut, quote.toToken.decimals);
        const output_min_value = parseDecimals(quote.minAmountOut, quote.toToken.decimals);

        return {
            quote: quoteRequest,
            output_value: output_value.toString(),
            output_min_value: output_min_value.toString(),
            route_data: quote
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = Asset.fromString(quote.quote.from_asset.toString());

        if (fromAsset.chain === Chain.Solana) {
            return buildSolanaQuoteData(quote.quote, quote.route_data as MayanQuote, this.rpcEndpoint);
        } else {
            return buildEvmQuoteData(quote.quote, quote.route_data as MayanQuote);
        }
    }
}
