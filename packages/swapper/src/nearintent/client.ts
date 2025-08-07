import type { 
    NearIntentQuoteRequest, 
    NearIntentQuoteResponse
} from './model';

const NEAR_INTENT_API_BASE_URL = 'https://1click.chaindefuser.com';

export class NearIntentClient {
    private baseUrl: string;
    private apiToken?: string;

    constructor(baseUrl: string = NEAR_INTENT_API_BASE_URL, apiToken?: string) {
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (this.apiToken) {
            headers['Authorization'] = `Bearer ${this.apiToken}`;
        }
        
        return headers;
    }

    async fetchQuote(params: NearIntentQuoteRequest): Promise<NearIntentQuoteResponse> {
        const apiUrl = `${this.baseUrl}/v0/quote`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = await response.text();
                }
                console.error('Near Intent API error:', response.status, errorData);
                throw new Error(
                    `Near Intent API request failed with status ${response.status}: ${JSON.stringify(errorData)}`
                );
            }

            return await response.json() as NearIntentQuoteResponse;
        } catch (error: any) {
            if (error instanceof Error && error.message.startsWith('Near Intent API request failed')) {
                throw error;
            }
            console.error('Unexpected error fetching Near Intent quote:', error);
            throw new Error(`An unexpected error occurred while fetching the quote from Near Intent: ${error.message}`);
        }
    }

}