interface SymbiosisTokenAmount {
    symbol: string;
    address: string;
    amount: string;
    chainId: number;
    decimals: number;
}

interface SymbiosisTransactionData {
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
    estimatedTime?: number;                    // Optional: Estimated time for the transaction
}

export class SymbiosisApiClient {
    // Store the base URL, path is now separate
    constructor(private baseUrl: string) { }

    async fetchSwapQuote(requestBody: any): Promise<SymbiosisApiResponse> {
        console.log("SymbiosisApiClient: Sending Request:", JSON.stringify(requestBody));
        // Construct the full URL by combining base URL and path
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
                // Throw a specific error type if desired
                throw new Error(`Symbiosis API request failed with status ${response.status}: ${errorBody}`);
            }

            const swapResult: SymbiosisApiResponse = await response.json();
            console.log("SymbiosisApiClient: Received Response:", swapResult);

            if (!swapResult || !swapResult.tokenAmountOut?.amount || !swapResult.tokenAmountOutMin?.amount || !swapResult.tx) {
                console.error("Symbiosis API Client: Response missing required fields", swapResult);
                throw new Error("Incomplete data received from Symbiosis API");
            }

            return swapResult;

        } catch (error) {
            console.error("SymbiosisApiClient: Error during fetch:", error);
            if (error instanceof Error && error.message.startsWith('Symbiosis API request failed')) {
                throw error; // Propagate API error
            }
            throw new Error(`SymbiosisApiClient request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Default base API URL constant
export const DEFAULT_SYMBIOSIS_BASE_API_URL = "https://api.symbiosis.finance";
export const SYMBIOSIS_SWAP_PATH = "/crosschain/v1/swap";
