import { SwapQuoteData, QuoteRequest, SwapQuoteDataType } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSuiMoveCalls } from "@mayanfinance/swap-sdk";

// @ts-ignore — v2 ESM types unresolvable under moduleResolution "node"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

import { calculateGasBudget, prefillTransaction, getGasPriceAndCoinRefs } from "../chain/sui/tx_builder";
import { getReferrerAddresses } from "../referrer";

export async function buildSuiQuoteData(
    request: QuoteRequest,
    routeData: MayanQuote,
    suiRpc: string,
): Promise<SwapQuoteData> {
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const suiClient = new SuiJsonRpcClient({ network: "mainnet", url: suiRpc });

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [suiTx, { gasPrice, coinRefs }] = await Promise.all([
            createSwapFromSuiMoveCalls(
                routeData,
                request.from_address,
                request.to_address,
                referrerAddresses,
                null,
                suiClient as any,
            ),
            getGasPriceAndCoinRefs(suiClient, request.from_address),
        ]);

        const inspectResult = await suiClient.devInspectTransactionBlock({
            sender: request.from_address,
            transactionBlock: suiTx,
        });

        if (inspectResult.error) {
            throw new Error(`Failed to estimate gas budget: ${inspectResult.error}`);
        }
        if (inspectResult.effects.status.status !== "success") {
            throw new Error(`Transaction simulation failed: ${inspectResult.effects.status.error}`);
        }

        const gasBudget = calculateGasBudget(inspectResult.effects);
        prefillTransaction(suiTx, request.from_address, gasBudget, gasPrice, coinRefs);
        const serializedTx = await suiTx.build({ client: suiClient });

        return {
            to: "",
            value: "0",
            data: Buffer.from(serializedTx).toString("base64"),
            dataType: SwapQuoteDataType.Contract,
            gasLimit: gasBudget.toString(10),
        };
    } catch (error) {
        throw new Error(`Failed to build Sui transaction: ${error}`);
    }
}
