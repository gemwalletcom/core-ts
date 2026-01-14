import Panora, { type PanoraConfig } from "@panoraexchange/swap-sdk";
import { QuoteRequest, Quote, SwapQuoteData, AssetId, Chain, SwapQuoteDataType } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { getReferrerAddresses } from "../referrer";
import { type PanoraQuoteResponse, getPanoraQuoteEntry } from "./model";
import { formatBpsAsPercent, normalizeAmount, formatAmountForPanora } from "./format";
import { normalizePanoraArguments } from "./move";

const APTOS_NATIVE_COIN = "0x1::aptos_coin::AptosCoin";

export type PanoraProviderOptions = PanoraConfig & {
    integratorFeeAddress?: `0x${string}`;
};

export class PanoraProvider implements Protocol {
    private readonly client: Panora;
    private readonly integratorFeeAddress?: `0x${string}`;

    constructor(options: PanoraProviderOptions = {}) {
        const { integratorFeeAddress, ...config } = options;
        this.integratorFeeAddress = integratorFeeAddress ?? getReferrerAddresses().aptos;
        this.client = new Panora(config);
    }

    private mapAssetToTokenAddress(asset: AssetId): string {
        if (asset.chain !== Chain.Aptos) {
            throw new Error(`Unsupported chain: ${asset.chain}`);
        }

        if (asset.isNative()) {
            return APTOS_NATIVE_COIN;
        }

        return asset.tokenId!;
    }

    private buildIntegratorFeeParams(referralBps: number): {
        integratorFeePercentage?: string;
        integratorFeeAddress?: `0x${string}`;
    } {
        if (!this.integratorFeeAddress || referralBps <= 0) {
            return {};
        }

        const integratorFeePercentage = formatBpsAsPercent(referralBps);
        const integratorFeeValue = Number(integratorFeePercentage);
        if (!Number.isFinite(integratorFeeValue) || integratorFeeValue <= 0 || integratorFeeValue > 2) {
            return {};
        }

        return {
            integratorFeeAddress: this.integratorFeeAddress,
            integratorFeePercentage,
        };
    }

    async get_quote(request: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(request.from_asset.id);
        const toAsset = AssetId.fromString(request.to_asset.id);

        if (fromAsset.chain !== Chain.Aptos || toAsset.chain !== Chain.Aptos) {
            throw new Error("Panora only supports Aptos swaps");
        }

        const params = {
            fromTokenAddress: this.mapAssetToTokenAddress(fromAsset) as `0x${string}`,
            toTokenAddress: this.mapAssetToTokenAddress(toAsset) as `0x${string}`,
            fromTokenAmount: formatAmountForPanora(request.from_value, request.from_asset.decimals),
            toWalletAddress: request.to_address as `0x${string}`,
            slippagePercentage: formatBpsAsPercent(request.slippage_bps),
            ...this.buildIntegratorFeeParams(request.referral_bps),
        };

        const routeData = await this.client.getQuote({ params });
        const quoteEntry = getPanoraQuoteEntry(routeData);

        const outputValue = quoteEntry.toTokenAmount ?? (routeData as PanoraQuoteResponse).toTokenAmount;
        const outputMinValue = quoteEntry.minToTokenAmount ?? outputValue;

        if (!outputValue) {
            throw new Error("Panora quote response missing output amount");
        }

        const tokenDecimals =
            (routeData as PanoraQuoteResponse).toToken?.decimals ?? request.to_asset.decimals;
        const normalizedOutputValue = normalizeAmount(outputValue, tokenDecimals);
        const normalizedOutputMinValue = outputMinValue
            ? normalizeAmount(outputMinValue, tokenDecimals)
            : normalizedOutputValue;

        return {
            quote: request,
            output_value: normalizedOutputValue,
            output_min_value: normalizedOutputMinValue,
            route_data: routeData,
            eta_in_seconds: 0,
        };
    }

    async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
        const quoteEntry = getPanoraQuoteEntry(quote.route_data);

        if (!quoteEntry.txData) {
            throw new Error("Panora quote response missing transaction data");
        }

        const normalizedArguments = normalizePanoraArguments(
            quoteEntry.txData.function,
            quoteEntry.txData.arguments,
        );

        const payload = {
            type: "entry_function_payload",
            function: quoteEntry.txData.function,
            type_arguments: quoteEntry.txData.type_arguments,
            arguments: normalizedArguments,
        };

        return {
            to: "",
            value: "0",
            data: JSON.stringify(payload),
            dataType: SwapQuoteDataType.Contract,
        };
    }
}
