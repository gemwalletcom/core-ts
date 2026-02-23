# OKX Provider

This provider implements swap support against OKX DEX aggregator APIs
using a thin HMAC-SHA256 authenticated HTTP client (`client.ts`).

## Scope

- `get_quote`: calls OKX DEX quote with auto-slippage
- `get_quote_data`: calls OKX DEX swap data and estimate compute unit for transaction building
- Supports:
    - auto slippage (`autoSlippage: true`)
    - max auto slippage cap (`slippage_bps * 2` -> `maxAutoSlippagePercent`)
    - slippage from request (`slippage_bps` -> `slippagePercent`, capped at 1%; defaults to 1% when not set)
    - referral fee (`referral_bps` -> `feePercent`)
    - Solana referrer wallet (`fromTokenReferrerWalletAddress`)
    - DEX filtering via `dexIds` (top Solana DEXes by TVL)

## Auth and Security

- Authentication is handled via HMAC-SHA256 request signing in `client.ts`.
- Required env vars (server-side only):
    - `OKX_API_KEY`
    - `OKX_SECRET_KEY`
    - `OKX_API_PASSPHRASE`
    - `OKX_PROJECT_ID`

## DEX Filtering

Quotes are limited to top Solana DEXes by TVL (see `constants.ts`):
Raydium, Orca, Meteora, Sanctum, PumpSwap, PancakeSwap V3, Phoenix, OpenBook V2.

The full liquidity list can be fetched via the OKX DEX API `/api/v6/dex/aggregator/all-tokens`.

## Data Flow

1. `OkxProvider.get_quote(...)`
2. Validate Solana assets and map native SOL to `11111111111111111111111111111111`
3. Request quote via `OkxDexClient.getQuote()` (filtered by `dexIds`)
4. Request swap data via `OkxDexClient.getSwapData()` with `autoSlippage: true`
5. Store OKX route in `quote.route_data`
6. `OkxProvider.get_quote_data(...)`
7. Build swap request with auto slippage and optional referral data
8. Decode OKX base58 tx payload and return base64 `SwapQuoteData`

## Files

- `constants.ts`: chain index, DEX IDs, and default slippage
- `provider.ts`: protocol implementation and mapping logic
- `model.ts`: `OkxRouteData` extension type
- `integration.test.ts`: manual live test

## Manual Integration Test

Run only when credentials are available:

```bash
OKX_INTEGRATION_TEST=1 pnpm --filter @gemwallet/swapper test -- okx/integration.test.ts
```
