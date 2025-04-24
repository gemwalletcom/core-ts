import { AssetId, QuoteRequest, QuoteData } from "@gemwallet/types";
import { SymbiosisTransactionData } from "../symbiosis/client";
import { TronWeb } from 'tronweb';
import { TransactionWrapper } from "tronweb/lib/esm/types";
import createHash from 'keccak';

export const TronChainId = 728126428;
const TRON_ENERGY_PRICE = 280;

// Custom error for specific handling of energy estimation issues
class EnergyEstimationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EnergyEstimationError";
    }
}

export class TronTxBuilder {
    constructor(public tronWeb: TronWeb) { }

    async checkTokenAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
        const contract = await this.tronWeb.contract().at(tokenAddress);
        const allowance = await contract.methods.allowance(ownerAddress, spenderAddress).call();
        return allowance.toString();
    }

    async triggerConstantContract(
        contractAddress: string,
        functionSelector: string,
        issuerAddress: string,
        rawParameter?: string,
        callValue?: number | string,
        feeLimit?: number
    ): Promise<TransactionWrapper> {
        return this.tronWeb.transactionBuilder.triggerConstantContract(
            contractAddress,
            functionSelector,
            {
                rawParameter,
                callValue: typeof callValue === 'string' ? parseInt(callValue) : callValue,
                feeLimit,
                estimateEnergy: true // Use estimateEnergy for tronweb v6+
            },
            [],
            issuerAddress
        );
    }

    private _calculateFeeLimitFromTriggerResult(triggerResult: TransactionWrapper): number {
        if (!triggerResult.result.result) {
            const message = triggerResult.result.message ? Buffer.from(triggerResult.result.message, 'hex').toString() : "Contract call failed during energy estimation";
            throw new Error(message); // General contract error
        }

        if (triggerResult.energy_used && triggerResult.energy_used > 0) {
            const calculatedFee = triggerResult.energy_used * TRON_ENERGY_PRICE;
            console.log(`Calculated fee limit based on energy_used: ${calculatedFee} (Energy: ${triggerResult.energy_used})`);
            return calculatedFee;
        } else {
            throw new EnergyEstimationError("triggerConstantContract did not return positive energy_used");
        }
    }

    async buildTronQuoteData(quote: QuoteRequest, txData: SymbiosisTransactionData): Promise<QuoteData> {
        // Check for all required fields
        if (!txData.functionSelector || !txData.feeLimit || !txData.value || !txData.from || !txData.data || !txData.to) {
            throw new Error("Invalid transaction data for Tron quote: Missing required fields");
        }

        const { functionSelector, feeLimit, value, to, from, data } = txData;
        const methodId = "0x" + createHash('keccak256').update(functionSelector).digest().slice(0, 4);
        const callData = methodId + data;
        const fromAsset = AssetId.fromString(quote.from_asset.id);
        let finalFeeLimit = feeLimit;

        if (fromAsset.isNative()) {
            // For native swaps, energy estimation is mandatory. Let errors propagate.
            const triggerResult = await this.triggerConstantContract(
                to,
                functionSelector,
                from,
                data,
                value,
                feeLimit
            );
            finalFeeLimit = this._calculateFeeLimitFromTriggerResult(triggerResult);

        } else {
            // For non-native tokens
            const allowance = await this.checkTokenAllowance(fromAsset.tokenId!, from, to);
            const allowanceBigInt = BigInt(allowance);
            const valueBigInt = BigInt(value);

            if (allowanceBigInt >= valueBigInt) {
                console.log(`Allowance ${allowance} >= value ${value}. Calling triggerConstantContract to estimate energy.`);
                const triggerResult = await this.triggerConstantContract(
                    to,
                    functionSelector,
                    from,
                    data,
                    value,
                    feeLimit
                );
                finalFeeLimit = this._calculateFeeLimitFromTriggerResult(triggerResult);
            } else {
                console.log(`Allowance ${allowance} < value ${value}. Using input fee limit.`);
            }
        }

        return {
            to: to,
            value: value,
            data: callData,
            limit: finalFeeLimit.toString(),
        };
    }
}
