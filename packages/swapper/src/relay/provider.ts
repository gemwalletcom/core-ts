import { Protocol } from '../protocol';
import { QuoteRequest, Quote, QuoteData, AssetId } from '@gemwallet/types';
import { fetchQuote } from './client';
import { RelayQuotePostBodyParams, RelayQuoteResponse, Step } from './model';
import { Chain } from '@gemwallet/types';
import { getReferrerAddresses } from '../referrer';

const RELAY_REFERRER = "gemwallet";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export class RelayProvider implements Protocol {
  constructor() { }

  mapChainToRelayChainId(chain: Chain): number {
    switch (chain) {
      case Chain.Ethereum:
        return 1;
      case Chain.Base:
        return 8453;
      case Chain.Berachain:
        return 80094;
      case Chain.Hyperliquid:
        return 999;
      case Chain.Manta:
        return 169;
      case Chain.Mantle:
        return 5000;
      case Chain.SmartChain:
        return 56;
      case Chain.Unichain:
        return 130;
      case Chain.Bitcoin:
        return 8253038;
      case Chain.Solana:
        return 792703809;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  mapAssetIdToCurrency(assetId: AssetId): string {
    switch (assetId.chain) {
      case Chain.Ethereum:
      case Chain.Base:
      case Chain.Berachain:
      case Chain.Hyperliquid:
      case Chain.Manta:
      case Chain.Mantle:
      case Chain.SmartChain:
      case Chain.Unichain:
        if (!assetId.tokenId) {
          return ZERO_ADDRESS;
        }
        return assetId.tokenId;
      case Chain.Bitcoin:
        return 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8';
      case Chain.Solana:
        return '11111111111111111111111111111111';
      default:
        throw new Error(`Unsupported asset: ${assetId.toString()}`);
    }
  }

  getReferrerAddress(chain: Chain): string {
    const referrers = getReferrerAddresses();
    switch (chain) {
      case Chain.Ethereum:
      case Chain.Base:
      case Chain.Berachain:
      case Chain.Hyperliquid:
      case Chain.Manta:
      case Chain.Mantle:
      case Chain.SmartChain:
      case Chain.Unichain:
        return referrers.evm;
      case Chain.Bitcoin:
        return referrers.bitcoin;
      case Chain.Solana:
        return referrers.solana;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }


  async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
    const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
    const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

    if (fromAsset.chain === Chain.Bitcoin || fromAsset.chain === Chain.Solana) {
      throw new Error('Swapping from Bitcoin or Solana is not supported yet');
    }

    const originChainId = this.mapChainToRelayChainId(fromAsset.chain);
    const destinationChainId = this.mapChainToRelayChainId(toAsset.chain);

    const relayParams: RelayQuotePostBodyParams = {
      user: quoteRequest.from_address,
      amount: quoteRequest.from_value,
      originCurrency: this.mapAssetIdToCurrency(fromAsset),
      destinationCurrency: this.mapAssetIdToCurrency(toAsset),
      originChainId: originChainId,
      destinationChainId: destinationChainId,
      recipient: quoteRequest.to_address,
      tradeType: 'EXACT_INPUT',
      referrer: RELAY_REFERRER,
      referrerAddress: this.getReferrerAddress(fromAsset.chain),
      refundTo: quoteRequest.from_address,
    };

    const relayResponse: RelayQuoteResponse = await fetchQuote(relayParams);

    const outputValue = relayResponse.details.currencyOut.amount;
    const outputMinValue = relayResponse.details.currencyOut.minimumAmount;

    return {
      quote: quoteRequest,
      output_value: outputValue,
      output_min_value: outputMinValue,
      route_data: relayResponse.steps,
      eta_in_seconds: relayResponse.details.timeEstimate || 0,
    };
  }

  async get_quote_data(quote: Quote): Promise<QuoteData> {
    if (!quote.route_data || !Array.isArray(quote.route_data)) {
      throw new Error('RelayProvider: Invalid route_data structure');
    }
    const steps = quote.route_data as Step[];
    // filter out approve step and get first transaction
    const filtered = steps.filter(step => step.id !== 'approve' && step.kind === 'transaction');
    if (filtered.length === 0) {
      throw new Error('RelayProvider: No steps found in quote data');
    }
    const stepItems = filtered[0].items;
    if (stepItems.length !== 1) {
      throw new Error('RelayProvider: expect only one transaction in the step');
    }
    const txData = stepItems[0].data;
    return {
      to: txData.to,
      value: txData.value,
      data: txData.data,
    };
  }
}
