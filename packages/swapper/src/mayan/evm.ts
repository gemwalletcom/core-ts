import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, getSwapFromEvmTxPayload } from "@mayanfinance/swap-sdk";
import { getReferrerAddresses } from "./referrer";

export function buildEvmQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
    const signerChainId = routeData.fromToken.chainId;
    const referralAddresses = getReferrerAddresses();
    const swapData = getSwapFromEvmTxPayload(routeData, request.from_address, request.to_address, referralAddresses, request.from_address, signerChainId, null, null);
    const value = BigInt(swapData.value || 0);

    if (swapData.to === undefined || swapData.data === null) {
        throw new Error("Invalid Mayan swap data");
    }

    return {
        to: swapData.to!.toString(),
        value: value.toString(),
        data: swapData.data?.toString() || "0x",
    };
}
