import { fetchQuote, ChainName, QuoteParams, QuoteOptions, Quote as MayanQuote, ReferrerAddresses } from "@mayanfinance/swap-sdk";
import { QuoteRequest, Quote, QuoteData, AssetId, Chain } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { buildEvmQuoteData, EMPTY_ADDRESS } from "./evm";
import { buildSolanaQuoteData } from "./solana";
import { buildSuiQuoteData, SUI_COIN_TYPE } from "./sui";
import { BigIntMath } from "../bigint_math";
import { getReferrerAddresses } from "@gemwallet/types/src/referrer";

export class MayanProvider implements Protocol {
    private solanaRpc: string;
    private suiRpc: string;

    constructor(solanaRpc: string, suiRpc: string) {
        this.solanaRpc = solanaRpc;
        this.suiRpc = suiRpc;
    }

    mapAssetToTokenId(asset: AssetId): string {
        if (asset.isNative()) {
            if (asset.chain === Chain.Sui) {
                return SUI_COIN_TYPE;
            }
            return EMPTY_ADDRESS;
        }
        return asset.tokenId!;
    }

    mapChainToName(chain: Chain): ChainName {
        switch (chain) {
            case Chain.SmartChain:
                return "bsc";
            case Chain.AvalancheC:
                return "avalanche" as ChainName;
            default:
                return chain as ChainName;
        }
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);
        const referrerBps = quoteRequest.referral_bps;
        const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;

        const params: QuoteParams = {
            fromToken: this.mapAssetToTokenId(fromAsset),
            toToken: this.mapAssetToTokenId(toAsset),
            amountIn64: quoteRequest.from_value,
            fromChain: this.mapChainToName(fromAsset.chain),
            toChain: this.mapChainToName(toAsset.chain),
            slippageBps: "auto",
            referrer: referrerAddresses.solana!,
            referrerBps,
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

        const output_value = BigIntMath.parseDecimals(quote.expectedAmountOut, quote.toToken.decimals);
        const output_min_value = BigIntMath.parseDecimals(quote.minAmountOut, quote.toToken.decimals);

        return {
            quote: quoteRequest,
            output_value: output_value.toString(),
            output_min_value: output_min_value.toString(),
            eta_in_seconds: quote.etaSeconds,
            route_data: quote
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = AssetId.fromString(quote.quote.from_asset.id);

        if (fromAsset.chain === Chain.Solana) {
            return buildSolanaQuoteData(quote.quote, quote.route_data as MayanQuote, this.solanaRpc);
        } else if (fromAsset.chain === Chain.Sui) {
            return buildSuiQuoteData(quote.quote, quote.route_data as MayanQuote, this.suiRpc);
        } else {
            return buildEvmQuoteData(quote.quote, quote.route_data as MayanQuote);
        }
    }
}
