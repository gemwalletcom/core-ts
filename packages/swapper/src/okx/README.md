# OKX Provider (Solana)

This provider implements Solana swap support against OKX DEX aggregator APIs.

## Scope

- `get_quote`: calls `/api/v6/dex/aggregator/quote`
- `get_quote_data`: calls `/api/v6/dex/aggregator/swap`
- Supports:
  - auto slippage (`autoSlippage: true`)
  - max auto slippage cap (`slippage_bps * 2` -> `maxAutoSlippagePercent`)
  - referral fee (`referral_bps` -> `feePercent`)
  - Solana referrer wallet (`fromTokenReferrerWalletAddress`)

## Auth and Security

- Headers are signed per request in `auth.ts` using HMAC-SHA256.
- Required env vars (server-side only):
  - `OKX_API_KEY`
  - `OKX_SECRET_KEY`
  - `OKX_API_PASSPHRASE`
  - `OKX_PROJECT_ID`
- Header keys sent to OKX follow their format:
  - `OK-ACCESS-KEY`
  - `OK-ACCESS-SIGN`
  - `OK-ACCESS-TIMESTAMP`
  - `OK-ACCESS-PASSPHRASE`
  - `OK-ACCESS-PROJECT`

## Data Flow

1. `OkxProvider.get_quote(...)`
2. Validate Solana assets and map native SOL to `11111111111111111111111111111111`
3. Request quote from `OkxClient`
4. Request swap data with `autoSlippage: true` to get OKX suggested slippage
5. Store OKX route in `quote.route_data` with:
   - `suggestedSlippagePercent`
   - `suggestedSlippageBps`
6. `OkxProvider.get_quote_data(...)`
7. Build swap request with auto slippage and optional referral data
8. Decode OKX base58 tx payload and return base64 `SwapQuoteData`

## Files

- `provider.ts`: protocol implementation and mapping logic
- `client.ts`: HTTP calls to OKX endpoints
- `auth.ts`: signature/header generation and env loading
- `model.ts`: OKX request/response models
- `integration.test.ts`: manual live test

## Manual Integration Test

Run only when credentials are available:

```bash
OKX_INTEGRATION_TEST=1 pnpm --filter @gemwallet/swapper test -- okx/integration.test.ts
```
