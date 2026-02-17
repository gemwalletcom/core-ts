# OKX Provider (Solana)

This provider implements Solana swap support against OKX DEX aggregator APIs
using the official `@okx-dex/okx-dex-sdk`.

## Scope

- `get_quote`: calls OKX DEX quote + swap data for auto-slippage
- `get_quote_data`: calls OKX DEX swap data for transaction building
- Supports:
  - auto slippage (`autoSlippage: true`)
  - max auto slippage cap (`slippage_bps * 2` -> `maxAutoSlippagePercent`)
  - referral fee (`referral_bps` -> `feePercent`)
  - Solana referrer wallet (`fromTokenReferrerWalletAddress`)

## Auth and Security

- Authentication is handled by the SDK's built-in HMAC-SHA256 signing.
- Required env vars (server-side only):
  - `OKX_API_KEY`
  - `OKX_SECRET_KEY`
  - `OKX_API_PASSPHRASE`
  - `OKX_PROJECT_ID`

## Data Flow

1. `OkxProvider.get_quote(...)`
2. Validate Solana assets and map native SOL to `11111111111111111111111111111111`
3. Request quote via `OKXDexClient.dex.getQuote()`
4. Request swap data via `OKXDexClient.dex.getSwapData()` with `autoSlippage: true`
5. Store OKX route in `quote.route_data` with:
   - `suggestedSlippagePercent`
   - `suggestedSlippageBps`
6. `OkxProvider.get_quote_data(...)`
7. Build swap request with auto slippage and optional referral data
8. Decode OKX base58 tx payload and return base64 `SwapQuoteData`

## Files

- `provider.ts`: protocol implementation and mapping logic
- `model.ts`: `OkxRouteData` extension type
- `integration.test.ts`: manual live test

## Manual Integration Test

Run only when credentials are available:

```bash
OKX_INTEGRATION_TEST=1 pnpm --filter @gemwallet/swapper test -- okx/integration.test.ts
```
