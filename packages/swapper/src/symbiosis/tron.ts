import { QuoteData } from "@gemwallet/types";
import { SymbiosisTransactionData } from "../symbiosis/client";
import { TronWeb } from 'tronweb';
import { TransactionContract, TriggerSmartContract } from "tronweb/lib/esm/types";

export const TronChainId = 728126428;

export async function buildTronQuoteData(tronWeb: TronWeb, txData: SymbiosisTransactionData): Promise<QuoteData> {

    if (!txData.functionSelector || !txData.feeLimit || !txData.value) {
        throw new Error("Invalid transaction data");
    }

    const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
        txData.to,
        txData.functionSelector,
        {
            rawParameter: txData.data,
            callValue: parseInt(txData.value),
            feeLimit: txData.feeLimit,
        },
        [],
        txData.from
    );

    if (!triggerResult.result.result && !triggerResult.result.message) {
        throw new Error("triggerSmartContract transaction failed");
    }
    const contractCall: TransactionContract<TriggerSmartContract> = triggerResult.transaction.raw_data.contract[0];
    const data = contractCall.parameter.value.data;
    if (!data) {
        throw new Error("Invalid triggerSmartContract transaction data");
    }
    return {
        to: txData.to,
        value: txData.value,
        data: "0x" + data,
        limit: txData.feeLimit.toString(),
    };
}
