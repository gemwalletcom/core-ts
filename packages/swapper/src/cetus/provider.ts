import { QuoteRequest, Quote, QuoteData } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { AggregatorClient, Env, RouterData } from "@cetusprotocol/aggregator-sdk";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { BN } from "bn.js";

export class CetusAggregatorProvider implements Protocol {
    private client: AggregatorClient;
    private suiClient: SuiClient;

    constructor(suiRpcUrl: string, overlayFeeRate?: number, overlayFeeReceiver?: string) {
        this.suiClient = new SuiClient({ url: suiRpcUrl });
        this.client = new AggregatorClient({
            client: this.suiClient,
            env: Env.Mainnet,
            ...(overlayFeeRate && overlayFeeReceiver && { overlayFeeRate, overlayFeeReceiver }),
        });
    }

    async get_quote(request: QuoteRequest): Promise<Quote> {
        console.log("CetusProvider get_quote called with:", request);

        const { from_asset, to_asset, from_value } = request;

        if (!from_asset?.id || !to_asset?.id || !from_value) {
            throw new Error(
                "Missing required parameters: from_asset.id, to_asset.id, or from_value",
            );
        }

        try {
            const byAmountIn = true;
            const routeResponse = await this.client.findRouters({
                from: from_asset.id,
                target: to_asset.id,
                amount: new BN(from_value),
                byAmountIn,
            });

            if (!routeResponse || !routeResponse.amountOut) {
                throw new Error("Failed to fetch a valid quote from Cetus API or amountOut is missing");
            }

            const quoteResult: Quote = {
                quote: request,
                output_value: routeResponse.amountOut.toString(),
                output_min_value: routeResponse.amountOut.toString(),
                route_data: routeResponse,
                eta_in_seconds: 0,
            };

            return quoteResult;
        } catch (error: any) {
            console.error("CetusProvider: Error in get_quote", error);
            // It's good practice to wrap provider-specific errors or re-throw a standardized error.
            throw new Error(`Cetus get_quote failed: ${error.message}`);
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        console.log("CetusProvider get_quote_data called with:", quote);

        const { route_data, quote: original_request } = quote;
        const { slippage_bps } = original_request;

        if (!route_data) {
            throw new Error("Missing route_data in quote object, cannot build transaction.");
        }

        try {
            const txb = new Transaction();
            const slippageDecimal = new BigNumber(slippage_bps).dividedBy(10000).toNumber();

            await this.client.fastRouterSwap({
                routers: route_data as RouterData,
                txb,
                slippage: slippageDecimal,
            });

            const transactionDataPayload = await txb.build();

            const quoteDataResult: QuoteData = {
                to: "",
                value: "0",
                data: Buffer.from(transactionDataPayload).toString("base64"),
            };

            return quoteDataResult;
        } catch (error) {
            console.error("Error building transaction data with Cetus:", error);
            if (error instanceof Error) {
                throw new Error(`Cetus API error in get_quote_data: ${error.message}`);
            }
            throw new Error("An unknown error occurred while building transaction data with Cetus");
        }
    }
}
