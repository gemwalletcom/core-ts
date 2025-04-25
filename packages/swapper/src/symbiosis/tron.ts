import { QuoteData } from "@gemwallet/types";
import { SymbiosisTransactionData } from "../symbiosis/client";
import createHash from 'keccak';

export const TronChainId = 728126428;

export class TronTxBuilder {
    constructor() { }

    buildTronQuoteData(txData: SymbiosisTransactionData): QuoteData {
        // Check for all required fields
        if (!txData.functionSelector || !txData.feeLimit || !txData.value || !txData.data || !txData.to) {
            throw new Error("Invalid transaction data for Tron quote: Missing required fields");
        }

        const { functionSelector, feeLimit, value, to, data } = txData;
        const methodId = "0x" + createHash('keccak256').update(functionSelector).digest().subarray(0, 4).toString('hex');
        const callData = methodId + data;

        return {
            to: to,
            value: value,
            data: callData,
            limit: feeLimit.toString(),
        };
    }
}
