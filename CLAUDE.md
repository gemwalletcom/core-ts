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
- **Bluefin** - New protocol addition

Each provider implements a common interface for quotes and transaction building.

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