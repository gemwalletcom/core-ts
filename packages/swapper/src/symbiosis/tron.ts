import { QuoteData } from "@gemwallet/types";
import { SymbiosisTransactionData } from "../symbiosis/client";
import { keccak256 } from "js-sha3";

export const TronChainId = 728126428;

export class TronTxBuilder {
    private energyFee: number
    constructor(energyFee: number) {
        this.energyFee = energyFee;
    }

    buildTronQuoteData(txData: SymbiosisTransactionData): QuoteData {
        // Check for all required fields
        if (!txData.functionSelector || !txData.feeLimit || !txData.value || !txData.data || !txData.to) {
            throw new Error("Invalid transaction data for Tron quote: Missing required fields");
        }

        const { functionSelector, feeLimit, value, to, data } = txData;
        const hash = keccak256.create().update(functionSelector).hex();
        const methodId = "0x" + hash.slice(0, 8);
        const callData = methodId + data;

        return {
            to: to,
            value: value,
            data: callData,
            gasLimit: Math.ceil(feeLimit / this.energyFee).toString()
        };
    }
}