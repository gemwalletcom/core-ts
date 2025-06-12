import { QuoteRequest, Quote, QuoteData, AssetId } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { AggregatorClient, Env, RouterData } from "@cetusprotocol/aggregator-sdk";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from '@mysten/sui/transactions';
import { BN } from "bn.js";
import { SUI_COIN_TYPE } from "../chain/sui/constants";
import { bnReplacer, bnReviver } from "./bn_replacer";
import { calculateGasBudget, prefillTransaction, getGasPriceAndCoinRefs } from "../chain/sui/tx_builder";
import { getReferrerAddresses } from "../referrer";

export class CetusAggregatorProvider implements Protocol {
    private client: AggregatorClient;
    private suiClient: SuiClient;
    private overlayFeeReceiver: string;

    constructor(suiRpcUrl: string) {
        this.suiClient = new SuiClient({ url: suiRpcUrl });
        this.overlayFeeReceiver = getReferrerAddresses().sui;
        this.client = this.createClient();
    }

    createClient(address?: string, overlayFeeRate?: number, overlayFeeReceiver?: string) {
        return new AggregatorClient({
            client: this.suiClient,
            env: Env.Mainnet,
            overlayFeeRate,
            overlayFeeReceiver,
            signer: address,
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
            });

            if (!routeData) {
                throw new Error("Failed to fetch a valid quote");
            }

            if (routeData.error) {
                throw new Error(`Cetus get_quote failed: ${routeData.error.msg}`);
            }

            const rawOutputValue = BigInt(routeData.amountOut.toString(10));
            const referralValue = rawOutputValue * BigInt(request.referral_bps) / BigInt(10000);
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
            console.error("CetusProvider: Error in get_quote", err);
            if (err instanceof Error) {
                throw new Error(`Get Quote failed: ${err.message}`);
            }
            throw new Error(`Get Quote failed: ${err}`);
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const slippage_bps = quote.quote.slippage_bps;
        const route_data = JSON.parse((quote.route_data as { data: string }).data, bnReviver) as RouterData;

        if (!route_data) {
            throw new Error("Missing route_data in quote object, cannot build transaction.");
        }

        try {
            const txb = new Transaction();
            const swapParams = {
                routers: route_data,
                txb,
                slippage: slippage_bps / 10000,
                isMergeTragetCoin: true,
                refreshAllCoins: true
            };

            // create a new client with user's address as signer, overlay fee rate and overlay fee receiver
            const client = this.createClient(quote.quote.from_address, quote.quote.referral_bps / 10000, this.overlayFeeReceiver);

            const gasPriceAndCoinRefsReq = getGasPriceAndCoinRefs(this.suiClient, quote.quote.from_address);
            const fastRouterSwapReq = client.fastRouterSwap(swapParams);
            const [{ gasPrice, coinRefs }, swapResult] = await Promise.all([
                gasPriceAndCoinRefsReq,
                fastRouterSwapReq
            ]);

            // inspect transaction
            const result = await client.devInspectTransactionBlock(txb);
            if (result.error) {
                throw new Error(`Swap simulation failed: ${result.error}`);
            }
            if (result.effects.status.status !== "success") {
                throw new Error(`Swap simulation failed: ${result.effects.status.error}`);
            }

            // build transaction
            const gasBudget = calculateGasBudget(result.effects);
            prefillTransaction(txb, quote.quote.from_address, gasBudget, gasPrice, coinRefs);
            const serializedTx = await txb.build({ client: this.suiClient });

            // build quote data
            const quoteData: QuoteData = {
                to: "",
                value: "0",
                data: Buffer.from(serializedTx).toString("base64"),
            };

            return quoteData;
        } catch (error: unknown) {
            console.error("Error building transaction data with Cetus:", error);
            if (error instanceof Error) {
                throw new Error(`Get Quote Data failed: ${error.message}`);
            }
            throw new Error(`An unknown error occurred while building transaction data with Cetus: ${error}`);
        }
    }
}
