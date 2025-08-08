import type {
    NearIntentsQuoteRequest,
    NearIntentsQuoteResponse
} from './model';

const NEAR_INTENTS_API_BASE_URL = 'https://1click.chaindefuser.com';

export class NearIntentsClient {
    private baseUrl: string;
    private apiToken?: string;

    constructor(baseUrl: string = NEAR_INTENTS_API_BASE_URL, apiToken?: string) {
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

    async fetchQuote(params: NearIntentsQuoteRequest): Promise<NearIntentsQuoteResponse> {
        const apiUrl = `${this.baseUrl}/v0/quote`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                // Read response as text first to avoid consuming body twice
                const responseText = await response.text();
                let errorMessage: string;
                
                try {
                    // Try to parse as JSON
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
                } catch (e) {
                    // If JSON parsing fails, use the raw text
                    errorMessage = responseText || `HTTP ${response.status} ${response.statusText}`;
                }
                
                console.error('Near Intents API error:', response.status, errorMessage);
                throw new Error(errorMessage);
            }

            return await response.json() as NearIntentsQuoteResponse;
        } catch (error: any) {
            if (error instanceof Error && !error.message.includes('An unexpected error occurred')) {
                throw error; // Re-throw API errors with extracted messages
            }
            console.error('Unexpected error fetching Near Intents quote:', error);
            throw new Error(`An unexpected error occurred while fetching the quote from Near Intents: ${error.message}`);
        }
    }

}