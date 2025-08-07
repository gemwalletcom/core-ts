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

**Example: Near Intent Provider**
```typescript
// In apps/api/src/index.ts
const providers: Record<string, Protocol> = {
    // ... other providers
    near_intent: new NearIntentProvider(
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