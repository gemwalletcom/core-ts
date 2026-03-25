import {
    AggregatorClient,
    Env,
    RouterDataV3,
    BuildFastRouterSwapParamsV3,
    CETUS,
    DEEPBOOKV2,
    DEEPBOOKV3,
    BLUEFIN,
} from "@cetusprotocol/aggregator-sdk";
import { QuoteRequest, Quote, SwapQuoteData, AssetId, SwapQuoteDataType } from "@gemwallet/types";
import { BN } from "bn.js";

// @ts-ignore — v2 ESM types unresolvable under moduleResolution "node"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
// @ts-ignore — v2 ESM types unresolvable under moduleResolution "node"
import { Transaction } from "@mysten/sui/transactions";

import { SUI_COIN_TYPE } from "../chain/sui/constants";
import { calculateGasBudget, prefillTransaction, getGasPriceAndCoinRefs } from "../chain/sui/tx_builder";
import { Protocol } from "../protocol";
import { getReferrerAddresses, CETUS_PARTNER_ID } from "../referrer";
import { bnReplacer, bnReviver } from "./bn_replacer";

export class CetusAggregatorProvider implements Protocol {
    private client: AggregatorClient;
    private suiRpcUrl: string;
    private overlayFeeReceiver: string;
    private readonly selectedProtocols: string[] = [CETUS, DEEPBOOKV2, DEEPBOOKV3, BLUEFIN];

    constructor(suiRpcUrl: string) {
        this.suiRpcUrl = suiRpcUrl;
        this.overlayFeeReceiver = getReferrerAddresses().sui;
        this.client = this.createClient();
    }

    createClient(address?: string, overlayFeeRate?: number, overlayFeeReceiver?: string) {
        return new AggregatorClient({
            client: new SuiJsonRpcClient({ network: "mainnet", url: this.suiRpcUrl }),
            env: Env.Mainnet,
            overlayFeeRate,
            overlayFeeReceiver,
            signer: address,
            partner: CETUS_PARTNER_ID,
        });
    }

    mapAssetToTokenId(asset: AssetId): string {
        if (asset.isNative()) {
            return SUI_COIN_TYPE;
        }
        return asset.tokenId!;
    }

    async get_quote(request: QuoteRequest): Promise<Quote> {
        const { from_asset, to_asset, from_value } = request;
        const fromAsset = AssetId.fromString(from_asset.id);
        const toAsset = AssetId.fromString(to_asset.id);

        try {
            const byAmountIn = true;
            const routeData = await this.client.findRouters({
                from: this.mapAssetToTokenId(fromAsset),
                target: this.mapAssetToTokenId(toAsset),
                amount: new BN(from_value),
                byAmountIn,
                providers: this.selectedProtocols,
            });

            if (!routeData) {
                throw new Error("Failed to fetch a valid quote");
            }

            if (routeData.error) {
                throw new Error(`Cetus get_quote failed: ${routeData.error.msg}`);
            }

            const rawOutputValue = BigInt(routeData.amountOut.toString(10));
            const referralValue = (rawOutputValue * BigInt(request.referral_bps)) / BigInt(10000);
            const minOutputValue = rawOutputValue - referralValue;

            const quoteResult: Quote = {
                quote: request,
                output_value: minOutputValue.toString(),
                output_min_value: minOutputValue.toString(),
                route_data: {
                    data: JSON.stringify(routeData, bnReplacer),
                },
                eta_in_seconds: 0,
            };

            return quoteResult;
        } catch (err: unknown) {
            if (err instanceof Error) {
                throw new Error(`Get Quote failed: ${err.message}`);
            }
            throw new Error(`Get Quote failed: ${err}`);
        }
    }

    async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
        const slippage_bps = quote.quote.slippage_bps;
        const routeDataString = (quote.route_data as { data: string }).data;

        let route_data: RouterDataV3;
        try {
            route_data = JSON.parse(routeDataString, bnReviver) as RouterDataV3;
        } catch (parseError) {
            throw new Error(`Failed to parse route data: ${parseError}`);
        }

        if (!route_data) {
            throw new Error("Missing route_data in quote object, cannot build transaction.");
        }

        try {
            const txb = new Transaction();
            const swapParams: BuildFastRouterSwapParamsV3 = {
                router: route_data,
                txb,
                slippage: slippage_bps / 10000,
            };

            const client = this.createClient(
                quote.quote.from_address,
                quote.quote.referral_bps / 10000,
                this.overlayFeeReceiver,
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const suiClient = (client as any).client;
            const gasPriceAndCoinRefsReq = getGasPriceAndCoinRefs(suiClient, quote.quote.from_address);
            const fastRouterSwapReq = client.fastRouterSwap(swapParams);
            const [{ gasPrice, coinRefs }] = await Promise.all([gasPriceAndCoinRefsReq, fastRouterSwapReq]);

            const result = await client.devInspectTransactionBlock(txb);
            if (result.error) {
                throw new Error(`Swap simulation failed: ${result.error}`);
            }
            if (result.effects.status.status !== "success") {
                throw new Error(`Swap simulation failed: ${result.effects.status.error}`);
            }

            const gasBudget = calculateGasBudget(result.effects);
            prefillTransaction(txb, quote.quote.from_address, gasBudget, gasPrice, coinRefs);
            const serializedTx = await txb.build({ client: suiClient });

            const quoteData: SwapQuoteData = {
                to: "",
                value: "0",
                data: Buffer.from(serializedTx).toString("base64"),
                dataType: SwapQuoteDataType.Contract,
                gasLimit: gasBudget.toString(10),
            };

            return quoteData;
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Get Quote Data failed: ${error.message}`);
            }
            throw new Error(`An unknown error occurred while building transaction data with Cetus: ${error}`);
        }
    }
}
