import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, getSwapFromEvmTxPayload } from "@mayanfinance/swap-sdk";

export function buildEvmQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
    const signerChainId = routeData.fromToken.chainId;
    const swapData = getSwapFromEvmTxPayload(routeData, request.from_address, request.to_address, { evm: request.referral_address }, request.from_address, signerChainId, null, null);

    return {
        to: swapData.to?.toString() || "",
        value: swapData.value?.toString() || "0",
        data: swapData.data?.toString() || "0x",
    };
}