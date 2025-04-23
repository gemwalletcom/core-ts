import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, getSwapFromEvmTxPayload } from "@mayanfinance/swap-sdk";
import { getReferrerAddresses } from "../referrer";

export const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

export function buildEvmQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
    const signerChainId = routeData.fromToken.chainId;
    const referralAddresses = getReferrerAddresses() as ReferrerAddresses;
    const swapData = getSwapFromEvmTxPayload(routeData, request.from_address, request.to_address, referralAddresses, request.from_address, signerChainId, null, null);
    const value = BigInt(swapData.value || 0);

    if (swapData.to === null || swapData.data === null) {
        throw new Error("Invalid Mayan swap data");
    }

    return {
        to: swapData.to!.toString(),
        value: value.toString(),
        data: swapData.data?.toString() || "0x",
    };
}
