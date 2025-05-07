import { fetchQuote } from './client';
import type { RelayQuotePostBodyParams } from './model';

describe('Relay Client - fetchQuote', () => {
  // Remove .skip to enable it for manual testing.
  it.skip('should fetch a quote from the Relay API', async () => {
    try {
      const params: RelayQuotePostBodyParams = {
        user: '0x000000000000000000000000000000000000dead',
        amount: '1000000000000000000', // 1 ETH
        originCurrency: '0x0000000000000000000000000000000000000000', // ETH on Mainnet
        destinationCurrency: 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8', // BTC
        originChainId: 1, // Ethereum Mainnet
        destinationChainId: 8253038, // Bitcoin
        recipient: 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa',
        tradeType: 'EXACT_INPUT',
        referrer: 'relay.link',
        useDepositAddress: false,
        useExternalLiquidity: false,
        topupGas: false,
        // slippage: '0.005', // Example slippage
      };

      console.log('Running test: Fetching quote with params:', JSON.stringify(params, null, 2));
      const quote = await fetchQuote(params);
      console.log('Test: Fetched Quote:', JSON.stringify(quote, null, 2));

      // Basic assertion: check if steps array exists and is not empty
      expect(quote).toBeDefined();
      expect(quote.steps).toBeInstanceOf(Array);
      expect(quote.steps.length).toBeGreaterThan(0);

    } catch (error) {
      console.error('Error in testFetchQuote (client.test.ts):', error);
      throw error;
    }
  });
});
