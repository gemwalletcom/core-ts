import axios from 'axios';
import type { RelayQuotePostBodyParams, RelayQuoteResponse } from './model';

const RELAY_API_BASE_URL = 'https://api.relay.link/';

export async function fetchQuote(
  params: RelayQuotePostBodyParams
): Promise<RelayQuoteResponse> {
  const apiUrl = `${RELAY_API_BASE_URL}quote`;

  try {
    console.log(`Fetching quote from: ${apiUrl} with body:`, JSON.stringify(params, null, 2));

    const response = await axios.post<RelayQuoteResponse>(apiUrl, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('Relay API error:', error.response?.status, error.response?.data);
      throw new Error(
        `Relay API request failed with status ${error.response?.status}: ${JSON.stringify(error.response?.data)}`
      );
    } else {
      console.error('Unexpected error fetching Relay quote:', error);
      throw new Error('An unexpected error occurred while fetching the quote from Relay.');
    }
  }
}
