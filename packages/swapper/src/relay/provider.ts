import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, QuoteAsset } from '@gemwallet/types';
import { fetchQuote } from './client';
import { RelayQuotePostBodyParams, RelayQuoteResponse, Step, StepDataItem } from './model';

export class RelayProvider implements Protocol {
  constructor() {
  }

  async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
    // FIXME map Chain to chain_id
    // FIXME map AssetId to currency
    // FIXME pass referrerAddress
    const originChainId = 1;
    const destinationChainId = 1;

    const relayParams: RelayQuotePostBodyParams = {
      user: quoteRequest.from_address,
      amount: quoteRequest.from_value,
      originCurrency: quoteRequest.from_asset.id,
      destinationCurrency: quoteRequest.to_asset.id,
      originChainId: originChainId,
      destinationChainId: destinationChainId,
      recipient: quoteRequest.to_address,
      tradeType: 'EXACT_INPUT',
      referrer: 'gemwallet',
      slippage: quoteRequest.slippage_bps ? (quoteRequest.slippage_bps / 10000).toString() : undefined,
    };

    const relayResponse: RelayQuoteResponse = await fetchQuote(relayParams);

    const outputValue = relayResponse.details.currencyOut.amount;
    const outputMinValue = relayResponse.details.currencyOut.minimumAmount || outputValue;

    return {
      quote: quoteRequest,
      output_value: outputValue,
      output_min_value: outputMinValue,
      route_data: relayResponse.steps,
      eta_in_seconds: relayResponse.details.timeEstimate || 0,
    };
  }

  async get_quote_data(quote: Quote): Promise<QuoteData> {
    const steps = quote.route_data as RelayQuoteResponse['steps'];

    // Find the first step of kind 'transaction'
    const firstTransactionStep = steps?.find(step => step.kind === 'transaction');
    const firstTransactionStepItem = firstTransactionStep?.items?.[0];

    if (firstTransactionStepItem && firstTransactionStepItem.data) {
      const txData = firstTransactionStepItem.data as StepDataItem;
      return {
        to: txData.to,
        value: txData.value || '0',
        data: txData.data || '0x',
      };
    }

    console.warn('RelayProvider: Could not derive QuoteData from the provided Quote object.', quote);
    throw new Error('RelayProvider: Unable to derive transaction data from the quote.');
  }
}
