import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { Chain, Quote, QuoteRequest } from "@gemwallet/types";

import { CetusAggregatorProvider, MayanProvider, Protocol, StonfiProvider } from "../packages/swapper/src";

const SOLANA_RPC = process.env.SOLANA_URL || "https://solana-rpc.publicnode.com";
const SUI_RPC = process.env.SUI_URL || "https://fullnode.mainnet.sui.io";
const TON_RPC = process.env.TON_URL || "https://toncenter.com";

const PROVIDER_FACTORY = {
    cetus: () => new CetusAggregatorProvider(SUI_RPC),
    mayan: () => new MayanProvider(SOLANA_RPC, SUI_RPC),
    stonfi_v2: () => new StonfiProvider(TON_RPC),
} satisfies Record<string, () => Protocol>;

type ProviderId = keyof typeof PROVIDER_FACTORY;
const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_FACTORY) as ProviderId[];
const STONFI_BENCH_WALLET_ADDRESS = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N";

const DEFAULT_REQUESTS: Partial<Record<ProviderId, QuoteRequest>> = {
    stonfi_v2: {
        from_address: STONFI_BENCH_WALLET_ADDRESS,
        to_address: STONFI_BENCH_WALLET_ADDRESS,
        from_asset: { id: Chain.Ton, symbol: "TON", decimals: 9 },
        to_asset: {
            id: `${Chain.Ton}_EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`,
            symbol: "USDT",
            decimals: 6,
        },
        from_value: "1000000000",
        referral_bps: 0,
        slippage_bps: 100,
        use_max_amount: false,
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

    const rawProvider = getValue("--provider") ?? "stonfi_v2";
    const iterations = Number(getValue("--iterations") ?? "2");
    const includeQuoteData = !args.includes("--skip-quote-data");
    const requestPath = getValue("--request");

    const providerId = SUPPORTED_PROVIDERS.find((value) => value === rawProvider);
    if (!providerId) {
        throw new Error(`Unsupported provider "${rawProvider}". Supported: ${SUPPORTED_PROVIDERS.join(", ")}`);
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
    process.stdout.write(`${label}: ${duration.toFixed(0)} ms\n`);
    return result;
}

function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.stack ?? error.message;
    }
    return String(error);
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
    process.stderr.write(`Benchmark failed: ${formatError(error)}\n`);
    process.exit(1);
});
