import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { Chain, Quote, QuoteRequest } from "@gemwallet/types";
import {
    CetusAggregatorProvider,
    MayanProvider,
    OrcaWhirlpoolProvider,
    Protocol,
    RelayProvider,
    StonfiProvider,
} from "../packages/swapper/src";

const SOLANA_RPC = process.env.SOLANA_URL || "https://solana-rpc.publicnode.com";
const SUI_RPC = process.env.SUI_URL || "https://fullnode.mainnet.sui.io";
const TON_RPC = process.env.TON_URL || "https://toncenter.com";

const PROVIDER_FACTORY = {
    orca: () => new OrcaWhirlpoolProvider(SOLANA_RPC),
    cetus: () => new CetusAggregatorProvider(SUI_RPC),
    mayan: () => new MayanProvider(SOLANA_RPC, SUI_RPC),
    relay: () => new RelayProvider(),
    stonfi_v2: () => new StonfiProvider(TON_RPC),
} satisfies Record<string, () => Protocol>;

type ProviderId = keyof typeof PROVIDER_FACTORY;
const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_FACTORY) as ProviderId[];

const DEFAULT_REQUESTS: Partial<Record<ProviderId, QuoteRequest>> = {
    orca: {
        from_address: "A21o4asMbFHYadqXdLusT9Bvx9xaC5YV9gcaidjqtdXC",
        to_address: "A21o4asMbFHYadqXdLusT9Bvx9xaC5YV9gcaidjqtdXC",
        from_asset: { id: Chain.Solana, symbol: "SOL", decimals: 9 },
        to_asset: {
            id: `${Chain.Solana}_EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
            symbol: "USDC",
            decimals: 6,
        },
        from_value: "100000000",
        referral_bps: 0,
        slippage_bps: 100,
    },
};

type CliOptions = {
    providerId: ProviderId;
    iterations: number;
    includeQuoteData: boolean;
    requestPath?: string;
};

function parseArgs(argv: string[]): CliOptions {
    const args = argv.slice(2);
    const getValue = (key: string): string | undefined => {
        const prefix = `${key}=`;
        const match = args.find((arg) => arg.startsWith(prefix));
        if (match) {
            return match.slice(prefix.length);
        }
        const index = args.findIndex((arg) => arg === key);
        if (index >= 0) {
            return args[index + 1];
        }
        return undefined;
    };

    const rawProvider = getValue("--provider") ?? "orca";
    const iterations = Number(getValue("--iterations") ?? "2");
    const includeQuoteData = !args.includes("--skip-quote-data");
    const requestPath = getValue("--request");

    const providerId = SUPPORTED_PROVIDERS.find(
        (value) => value === rawProvider,
    );
    if (!providerId) {
        throw new Error(
            `Unsupported provider "${rawProvider}". Supported: ${SUPPORTED_PROVIDERS.join(", ")}`,
        );
    }

    return {
        providerId,
        iterations: Number.isFinite(iterations) && iterations > 0 ? iterations : 2,
        includeQuoteData,
        requestPath,
    };
}

function loadRequest(opts: CliOptions): QuoteRequest {
    if (opts.requestPath) {
        const resolved = path.resolve(process.cwd(), opts.requestPath);
        const raw = fs.readFileSync(resolved, "utf8");
        return JSON.parse(raw) as QuoteRequest;
    }

    const fallback = DEFAULT_REQUESTS[opts.providerId];
    if (!fallback) {
        throw new Error("Provide --request <path to QuoteRequest JSON> for this provider");
    }
    return fallback;
}

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(0)} ms`);
    return result;
}

async function main() {
    const opts = parseArgs(process.argv);
    const provider = PROVIDER_FACTORY[opts.providerId]();
    const request = loadRequest(opts);

    let lastQuote: Quote | null = null;
    for (let i = 0; i < opts.iterations; i++) {
        lastQuote = await time(`quote#${i + 1}`, () => provider.get_quote(request));
    }

    if (opts.includeQuoteData && lastQuote) {
        await time("quote_data", () => provider.get_quote_data(lastQuote as Quote));
    }
}

main().catch((error) => {
    console.error("Benchmark failed:", error);
    process.exit(1);
});
