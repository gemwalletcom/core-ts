// packages/swapper/src/bluefin/client.ts

export interface BluefinQuoteRequest {
  tokenInType: string;
  tokenOutType: string;
  taker: string;
  tokenInAmount: string;
}

export interface BluefinQuoteResponse {
  createdAtUtcMillis: number;
  effectivePrice: string;
  effectiveTokenOutAmount: string;
  quoteExpiresAtUtcMillis: number;
  quoteId: string;
  signature: string;
  taker: string;
  tokenInAmount: string;
  tokenInType: string;
  tokenOutAmount: string;
  tokenOutType: string;
  vault: string;
}

export class BluefinClient {
  private readonly baseUrl = 'https://spot.api.sui-prod.bluefin.io/api/quote/v1';

  async getQuote(request: BluefinQuoteRequest): Promise<BluefinQuoteResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://trade.bluefin.io/', // As per cURL example
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Bluefin API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json() as Promise<BluefinQuoteResponse>;
  }
}
