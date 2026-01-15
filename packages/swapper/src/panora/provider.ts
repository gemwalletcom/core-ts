import Panora, { type PanoraConfig } from "@panoraexchange/swap-sdk";
import { QuoteRequest, Quote, SwapQuoteData, AssetId, Chain, SwapQuoteDataType } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { getReferrerAddresses } from "../referrer";
import { type PanoraQuoteResponse, isPanoraQuoteResponse, getPanoraQuoteEntry } from "./model";
import { normalizePanoraArguments } from "./move";
import { BigIntMath } from "../bigint_math";

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
        if (asset.isNative()) {
            return APTOS_NATIVE_COIN;
        }

        return asset.tokenId!;
    }

    private buildIntegratorFeeParams(referralBps: number): {
        integratorFeePercentage?: string;
        integratorFeeAddress?: `0x${string}`;
    } {
        if (!this.integratorFeeAddress || referralBps <= 0 || referralBps > 200) {
            return {};
        }

        return {
            integratorFeeAddress: this.integratorFeeAddress,
            integratorFeePercentage: BigIntMath.bpsToPercent(referralBps),
        };
    }

    async get_quote(request: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(request.from_asset.id);
        const toAsset = AssetId.fromString(request.to_asset.id);

        const params = {
            fromTokenAddress: this.mapAssetToTokenAddress(fromAsset) as `0x${string}`,
            toTokenAddress: this.mapAssetToTokenAddress(toAsset) as `0x${string}`,
            fromTokenAmount: BigIntMath.formatDecimals(request.from_value, request.from_asset.decimals),
            toWalletAddress: request.to_address as `0x${string}`,
            slippagePercentage: BigIntMath.bpsToPercent(request.slippage_bps),
            ...this.buildIntegratorFeeParams(request.referral_bps),
        };

        const routeData = await this.client.getQuote({ params });

        if (!isPanoraQuoteResponse(routeData)) {
            throw new Error("Invalid Panora quote response");
        }

        const validatedRouteData = routeData as PanoraQuoteResponse;
        const quoteEntry = getPanoraQuoteEntry(validatedRouteData);
        const outputAmount = quoteEntry.toTokenAmount ?? validatedRouteData.toTokenAmount;
        const outputMinAmount = quoteEntry.minToTokenAmount ?? outputAmount;

        if (!outputAmount) {
            throw new Error("Panora quote response missing output amount");
        }

        const tokenDecimals = validatedRouteData.toToken?.decimals ?? request.to_asset.decimals;
        const outputValue = BigIntMath.parseDecimals(outputAmount, tokenDecimals);
        const outputMinValue = outputMinAmount
            ? BigIntMath.parseDecimals(outputMinAmount, tokenDecimals)
            : outputValue;

        return {
            quote: request,
            output_value: outputValue.toString(),
            output_min_value: outputMinValue.toString(),
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
