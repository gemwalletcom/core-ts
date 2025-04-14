import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { SymbiosisTransactionData } from "../symbiosis/client";

interface TronSmartContractCall {
    contract_address: string,
    function_selector: string,
    parameter?: string,
    fee_limit?: number,
    call_value?: number,
    owner_address: string,
    visible?: boolean
}

export const TronChainId = 728126428;

export function buildTronQuoteData(request: QuoteRequest, txData: SymbiosisTransactionData): QuoteData {

    if (!txData.functionSelector || !txData.feeLimit || !txData.value) {
        throw new Error("Invalid transaction data");
    }

    const data: TronSmartContractCall = {
        contract_address: txData.to,
        function_selector: txData.functionSelector,
        parameter: txData.data,
        fee_limit: txData.feeLimit,
        call_value: parseInt(txData.value),
        owner_address: request.from_address,
    };

    return {
        to: txData.to,
        value: txData.value,
        data: JSON.stringify(data),
    };
}
