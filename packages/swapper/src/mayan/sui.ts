import { QuoteData, QuoteRequest } from "@gemwallet/types";
import { Quote as MayanQuote, createSwapFromSuiMoveCalls } from "@mayanfinance/swap-sdk";
import { getReferrerAddresses } from "./referrer";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

export async function buildSuiQuoteData(request: QuoteRequest, routeData: MayanQuote, suiRpc: string): Promise<QuoteData> {
    const referrerAddresses = getReferrerAddresses();
    const suiClient = new SuiClient({ url: suiRpc });
    const suiTx: Transaction = await createSwapFromSuiMoveCalls(
        routeData,
        request.from_address,
        request.to_address,
        referrerAddresses, null,
        suiClient
    )
    const data = await suiTx.build({ client: suiClient });

    return {
        to: "",
        value: "0",
        data: Buffer.from(data).toString("base64"),
    };
}
