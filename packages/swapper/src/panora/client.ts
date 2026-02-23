const BASE_URL = "https://api.panora.exchange";
const HEADER_API_KEY = "x-api-key";

export interface PanoraClientConfig {
    apiKey: string;
}

export interface PanoraQuoteParams {
    fromTokenAddress: string;
    toTokenAddress: string;
    fromTokenAmount: string;
    toWalletAddress: string;
    slippagePercentage: string;
    integratorFeePercentage?: string;
    integratorFeeAddress?: string;
}

function buildQueryString(params: object): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return "";
    return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v).trim()])).toString();
}

export class PanoraClient {
    private readonly apiKey: string;

    constructor(config: PanoraClientConfig) {
        this.apiKey = config.apiKey;
    }

    async getQuote(params: PanoraQuoteParams): Promise<unknown> {
        const queryString = buildQueryString(params);

        const response = await fetch(`${BASE_URL}/swap${queryString}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [HEADER_API_KEY]: this.apiKey,
            },
            body: "{}",
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Panora API ${response.status}: ${text}`);
        }

        return response.json();
    }
}
