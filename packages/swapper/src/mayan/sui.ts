import { QuoteData, QuoteRequest } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSuiMoveCalls } from "@mayanfinance/swap-sdk";
import { SuiClient } from "@mysten/sui/client";
import { getReferrerAddresses } from "../referrer";
import { SUI_COIN_TYPE } from "../chain/sui/constants";
import { calculateGasBudget, prefillTransaction, getGasPriceAndCoinRefs } from "../chain/sui/tx_builder";

export async function buildSuiQuoteData(request: QuoteRequest, routeData: MayanQuote, suiRpc: string): Promise<QuoteData> {
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const suiClient = new SuiClient({ url: suiRpc });

    try {

        const [suiTx, { gasPrice, coinRefs }] = await Promise.all([
            createSwapFromSuiMoveCalls(
                routeData,
                request.from_address,
                request.to_address,
                referrerAddresses,
                null,
                suiClient
            ),
            getGasPriceAndCoinRefs(suiClient, request.from_address)
        ]);

        const inspectResult = await suiClient.devInspectTransactionBlock({
            transactionBlock: suiTx,
            sender: request.from_address,
        });

        if (inspectResult.error) {
            throw new Error(`Failed to estimate gas budget: ${inspectResult.error}`);
        }
        if (inspectResult.effects.status.status !== 'success') {
            throw new Error(`Transaction simulation failed: ${inspectResult.effects.status.error}`);
        }

        const gasBudget = calculateGasBudget(inspectResult.effects);
        prefillTransaction(suiTx, request.from_address, gasBudget, gasPrice, coinRefs);
        const serializedTx = await suiTx.build({ client: suiClient });

        return {
            to: "",
            value: "0",
            data: Buffer.from(serializedTx).toString("base64"),
        };
    } catch (error) {
        throw new Error(`Failed to build Sui transaction: ${error}`);
    }
}
