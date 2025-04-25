interface SymbiosisTokenAmount {
    symbol: string;
    address: string;
    amount: string;
    chainId: number;
    decimals: number;
}

export interface SymbiosisTransactionData {
    chainId: number;
    data: string;
    to: string;
    value?: string;
    functionSelector?: string;
    feeLimit?: number;
    from?: string;
}

export interface SymbiosisApiResponse {
    tokenAmountOut: SymbiosisTokenAmount;      // REQUIRED: Details of the output token amount
    tokenAmountOutMin: SymbiosisTokenAmount;   // REQUIRED: Details of the minimum output amount
    tx: SymbiosisTransactionData;              // REQUIRED: Transaction data for execution
    type: string;                              // REQUIRED: Type of the transaction, tron etc
    approveTo?: string;                        // Optional: Contract address to approve
    estimatedTime?: number;                    // Optional: Estimated time for the transaction
}

export const SYMBIOSIS_BASE_URL = "https://api.symbiosis.finance";
export const SYMBIOSIS_SWAP_PATH = "/crosschain/v1/swap";

export class SymbiosisApiClient {
    constructor(private baseUrl: string) { }

    async fetchSwapQuote(requestBody: any): Promise<SymbiosisApiResponse> {
        const fullUrl = this.baseUrl + SYMBIOSIS_SWAP_PATH;
        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Symbiosis API Client error ${response.status}: ${errorBody}`);
                throw new Error(`Symbiosis API request failed with status ${response.status}: ${errorBody}`);
            }

            const swapResult: SymbiosisApiResponse = await response.json();

            if (!swapResult || !swapResult.tokenAmountOut?.amount || !swapResult.tokenAmountOutMin?.amount || !swapResult.tx) {
                console.error("Symbiosis API Client: Response missing required fields", swapResult);
                throw new Error("Incomplete data received from Symbiosis API");
            }

            return swapResult;

        } catch (error) {
            console.error("SymbiosisApiClient: Error during fetch:", error);
            if (error instanceof Error && error.message.startsWith('Symbiosis API request failed')) {
                throw error;
            }
            throw new Error(`SymbiosisApiClient request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}


