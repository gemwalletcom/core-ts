import type { RelayQuotePostBodyParams, RelayQuoteResponse } from './model';

const RELAY_API_BASE_URL = 'https://api.relay.link/';

export async function fetchQuote(
  params: RelayQuotePostBodyParams
): Promise<RelayQuoteResponse> {
  const apiUrl = `${RELAY_API_BASE_URL}quote`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, use text
        errorData = await response.text();
      }
      console.error('Relay API error:', response.status, errorData);
      throw new Error(
        `Relay API request failed with status ${response.status}: ${JSON.stringify(errorData)}`
      );
    }

    return await response.json() as RelayQuoteResponse;
  } catch (error: any) {
    // Handle network errors or other issues not caught by !response.ok
    if (error instanceof Error && error.message.startsWith('Relay API request failed')) {
      throw error; // Re-throw errors already processed from the API response
    }
    console.error('Unexpected error fetching Relay quote:', error);
    throw new Error(`An unexpected error occurred while fetching the quote from Relay: ${error.message}`);
  }
}
