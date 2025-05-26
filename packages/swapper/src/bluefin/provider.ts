import { QuoteRequest, Quote, QuoteData, Protocol } from '../protocol';
import { BluefinClient, BluefinQuoteRequest, BluefinQuoteResponse } from './client';

export class BluefinProvider implements Protocol {
  private client: BluefinClient;
  public readonly name = 'Bluefin';

  constructor() {
    this.client = new BluefinClient();
  }

  /**
   * Fetches a quote from the Bluefin API.
   * @param quoteRequest - The quote request parameters.
   * @returns A promise that resolves to a Quote object.
   * @throws {Error} If the Bluefin API request fails or data is invalid.
   */
  async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
    const bluefinRequest: BluefinQuoteRequest = {
      tokenInType: quoteRequest.from_asset.id,
      tokenOutType: quoteRequest.to_asset.id,
      taker: quoteRequest.from_address,
      tokenInAmount: quoteRequest.from_value,
    };

    const bluefinResponse: BluefinQuoteResponse = await this.client.getQuote(bluefinRequest);

    const quote: Quote = {
      quote: quoteRequest,
      output_value: bluefinResponse.effectiveTokenOutAmount,
      
      // output_min_value: Calculate based on slippage_bps.
      // Bluefin's `effectiveTokenOutAmount` might not account for user-defined slippage.
      // Calculation: BigInt(effectiveTokenOutAmount) * BigInt(10000 - slippage_bps) / BigInt(10000)
      // Currently a placeholder; Bluefin might provide a slippage-adjusted value or this needs client-side calculation.
      output_min_value: bluefinResponse.effectiveTokenOutAmount, // Placeholder: needs proper slippage calculation

      route_data: {
        providerName: this.name,
        bluefinQuoteId: bluefinResponse.quoteId,
        bluefinSignature: bluefinResponse.signature,
        bluefinVault: bluefinResponse.vault,
        bluefinRawResponse: bluefinResponse, // Storing the full response for get_quote_data
      },
      eta_in_seconds: Math.floor((bluefinResponse.quoteExpiresAtUtcMillis - Date.now()) / 1000),
    };

    return quote;
  }

  /**
   * Constructs the transaction data for a Bluefin swap.
   * NOTE: This method is not yet fully implemented and requires details
   * on Sui transaction structure for Bluefin.
   * @param quote - The quote object containing route_data from Bluefin.
   * @returns A promise that resolves to QuoteData for the transaction.
   * @throws {Error} If route_data is invalid or implementation is incomplete.
   */
  async get_quote_data(quote: Quote): Promise<QuoteData> {
    const bluefinData = quote.route_data as {
        providerName: string;
        bluefinQuoteId: string;
        bluefinSignature: string;
        bluefinVault: string;
        bluefinRawResponse: BluefinQuoteResponse;
    };

    if (bluefinData.providerName !== this.name || !bluefinData.bluefinRawResponse) {
        throw new Error('Invalid route_data for BluefinProvider');
    }
    
    // const rawBluefinQuote = bluefinData.bluefinRawResponse;
    // TODO: Construct the Sui transaction object using rawBluefinQuote.
    // This involves:
    // 1. Identifying the target smart contract on Sui for Bluefin.
    // 2. Determining the function to call on the smart contract.
    // 3. Mapping fields from rawBluefinQuote to the required function arguments.
    // Example:
    // return {
    //   to: SUI_BLUEFIN_CONTRACT_ADDRESS, // Replace with actual address
    //   value: '0', // Typically 0 for token swaps
    //   data: encodeContractCallPayload(rawBluefinQuote), // Placeholder for actual encoding logic
    //   gas_limit: '1000000', // Estimate or configure
    // };

    console.warn('BluefinProvider.get_quote_data is not yet fully implemented.');
    // Placeholder: Actual implementation depends on Sui transaction structure for Bluefin.
    // Define `to`, `value`, `data` for a Bluefin swap on Sui.
    return Promise.reject(new Error('BluefinProvider.get_quote_data not fully implemented: Sui transaction construction needed.'));
  }
}
