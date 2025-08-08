# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo for GemWallet's crypto swap aggregation service. The architecture consists of:

- **API app** (`apps/api`) - Express.js server exposing swap quote endpoints
- **Swapper package** (`packages/swapper`) - Core swap logic with protocol providers
- **Types package** (`packages/types`) - Shared TypeScript definitions

## Development Commands

```bash
# Setup and dependencies
just install          # Install all dependencies
pnpm install          # Alternative install method

# Development
just dev              # Start all services in development mode
just dev:api          # Start only the API server

# Build and production
just build            # Build all packages
just start            # Start production API server

# Testing and maintenance
just test             # Run test suite
just clean            # Clean build artifacts

# Docker operations
just docker-build     # Build Docker image
just docker-run       # Run containerized application
```

## Architecture

### Swap Providers
The swapper package implements multiple protocol providers:
- **Stonfi** - TON blockchain DEX
- **Mayan** - Cross-chain swaps (Solana/Sui)
- **Symbiosis** - Tron network integration
- **Cetus** - Sui DEX aggregator
- **Relay** - Cross-chain bridging protocol
- **Near Intent** - Cross-chain intent-based swaps via 1Click API

Each provider implements a common interface for quotes and transaction building.

#### Adding New Swap Providers

To add a new swap provider, follow this structured approach using the established patterns:

**1. Create Provider Structure**
Create a new folder in `packages/swapper/src/` following the pattern of existing providers (e.g., `relay`, `nearintent`):
```
packages/swapper/src/newprovider/
├── model.ts      # TypeScript interfaces and types
├── client.ts     # API client with HTTP logic
├── provider.ts   # Protocol implementation
├── index.ts      # Module exports
└── provider.test.ts  # Unit tests
```

**2. Define Types (`model.ts`)**
Define all API request/response interfaces and data structures:
```typescript
export interface NewProviderQuoteRequest {
    // API-specific request structure
}

export interface NewProviderQuoteResponse {
    // API-specific response structure
}
```

**3. Implement Client (`client.ts`)**
Create a dedicated client class for API interactions:
```typescript
export class NewProviderClient {
    constructor(private baseUrl: string, private apiKey?: string) {}
    
    async fetchQuote(params: NewProviderQuoteRequest): Promise<NewProviderQuoteResponse> {
        // HTTP request implementation with error handling
    }
}
```

**4. Create Provider (`provider.ts`)**
Implement the Protocol interface:
```typescript
export class NewProvider implements Protocol {
    private client: NewProviderClient;
    
    constructor(baseUrl?: string, apiKey?: string) {
        this.client = new NewProviderClient(baseUrl, apiKey);
    }
    
    async get_quote(request: QuoteRequest): Promise<Quote> {
        // Transform request, call client, transform response
    }
    
    async get_quote_data(quote: Quote): Promise<QuoteData> {
        // Extract transaction data from quote
    }
}
```

**5. Export Modules (`index.ts`)**
```typescript
export * from './model';
export * from './client';
export * from './provider';
```

**6. Register Provider**
- Add to `SwapProvider` enum in `packages/types/src/primitives.ts`
- Export from `packages/swapper/src/index.ts`
- Register in API at `apps/api/src/index.ts`

**Example: Near Intents Provider**
```typescript
// In apps/api/src/index.ts
const providers: Record<string, Protocol> = {
    // ... other providers
    near_intents: new NearIntentsProvider(
        process.env.NEAR_INTENT_URL || "https://1click.chaindefuser.com",
        process.env.NEAR_INTENT_API_TOKEN
    ),
};
```

**7. Testing**
- Write unit tests for provider methods
- Test chain mapping and asset ID building logic
- Verify error handling and edge cases

This pattern ensures consistent code organization, proper separation of concerns, and maintainable provider implementations.

### API Structure
- `GET /` - Returns available providers and version info
- `POST /:providerId/quote` - Get swap quote from specific provider
- `POST /:providerId/quote_data` - Get transaction calldata for swap

### Package Organization
Uses pnpm workspaces with packages referenced by `@gemwallet/*` naming convention. The monorepo structure allows shared types and utilities across the API and swapper logic.

## Technology Stack

- **TypeScript 5.8** with ESNext modules
- **pnpm** for package management and workspaces
- **Express.js** for API server
- **Jest** for testing
- **Just** command runner for task automation

## Logging Guidelines

### Logging Standards
- Use `console.error()` for errors and exceptions
- Use `console.log()` sparingly, only for essential information
- Avoid debug logs in production code
- Keep log messages concise and meaningful

### When to Log
**Always log:**
- API server startup messages
- HTTP API errors with clear error descriptions
- External API failures with provider context
- Critical errors that affect user experience

**Avoid logging:**
- Debug information and internal state
- Request/response bodies (privacy concerns)
- Verbose operational details
- Success cases (unless specifically needed)

### Log Format Examples
```typescript
// Good: Clear, concise error logging
console.error("Error fetching quote:", error instanceof Error ? error.message : error);
console.error("Near Intents API error:", response.status, errorMessage);

// Avoid: Debug logs and verbose information
console.log("Request body:", req.body); // Privacy risk
console.log("swapDirectSimulation", swapDirectSimulation); // Debug noise
```

## Code Comments Guidelines

### Commenting Standards
- Use JSDoc comments (`/** */`) for functions, classes, and interfaces
- Use inline comments (`//`) sparingly for complex business logic only
- Avoid obvious comments that restate what the code does
- Focus comments on **why** not **what**

### When to Comment
**Always comment:**
- Complex business logic or algorithms
- Non-obvious workarounds or hacks
- External API integrations and data mappings
- Public functions and interfaces with JSDoc
- Regex patterns and complex conditions

**Avoid commenting:**
- Simple variable assignments
- Obvious function calls or operations
- Code that is self-explanatory
- Implementation details that change frequently

### Comment Format Examples
```typescript
// Good: Explains business logic and context
/**
 * Builds transaction data for EVM-compatible chains using common chain utilities
 * Handles both native token transfers and ERC20 token transfers
 */
export function buildEvmTransactionData(asset: AssetId, depositAddress: string, amount: string): QuoteData {
    return buildEvmTransferData(asset, depositAddress, amount);
}

// Good: Explains non-obvious mapping
export const NEAR_INTENTS_ASSETS = {
    [Chain.Ethereum]: {
        "ethereum": "nep141:eth.omft.near",
        "ethereum_0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", // USDC
    }
};

// Avoid: States the obvious
const paddedAmount = BigInt(amount).toString(16).padStart(64, '0'); // Convert amount to hex and pad to 32 bytes
if (!connection) { // Check if connection exists
    throw new Error('Solana connection required for transaction building');
}
```

### JSDoc Standards
```typescript
/**
 * Converts TRON base58 address to hex format using TronWeb
 * @param address - TRON address in base58 or hex format
 * @returns Hex formatted address with 0x prefix
 * @throws Error if address format is invalid or conversion fails
 */
function convertTronAddressToHex(address: string): string {
    // Implementation...
}
```