import Panora, { type PanoraConfig } from "@panoraexchange/swap-sdk";
import { QuoteRequest, Quote, SwapQuoteData, AssetId, Chain, SwapQuoteDataType } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { BigIntMath } from "../bigint_math";
import { getReferrerAddresses } from "../referrer";
import { type PanoraQuoteResponse, getPanoraQuoteEntry } from "./model";

const APTOS_NATIVE_COIN = "0x1::aptos_coin::AptosCoin";

export type PanoraProviderOptions = PanoraConfig & {
    integratorFeeAddress?: `0x${string}`;
};

export class PanoraProvider implements Protocol {
    private readonly client: Panora;
    private readonly integratorFeeAddress?: `0x${string}`;

    constructor(options: PanoraProviderOptions = {}) {
        const { integratorFeeAddress, ...config } = options;
        this.integratorFeeAddress = integratorFeeAddress ?? getReferrerAddresses().aptos;
        this.client = new Panora(config);
    }

    private mapAssetToTokenAddress(asset: AssetId): string {
        if (asset.chain !== Chain.Aptos) {
            throw new Error(`Unsupported chain: ${asset.chain}`);
        }

        if (asset.isNative()) {
            return APTOS_NATIVE_COIN;
        }

        return asset.tokenId!;
    }

    private buildIntegratorFeeParams(referralBps: number): {
        integratorFeePercentage?: string;
        integratorFeeAddress?: `0x${string}`;
    } {
        if (!this.integratorFeeAddress || referralBps <= 0) {
            return {};
        }

        const integratorFeePercentage = formatBpsAsPercent(referralBps);
        const integratorFeeValue = Number(integratorFeePercentage);
        if (!Number.isFinite(integratorFeeValue) || integratorFeeValue <= 0 || integratorFeeValue > 2) {
            return {};
        }

        return {
            integratorFeeAddress: this.integratorFeeAddress,
            integratorFeePercentage,
        };
    }

    async get_quote(request: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(request.from_asset.id);
        const toAsset = AssetId.fromString(request.to_asset.id);

        if (fromAsset.chain !== Chain.Aptos || toAsset.chain !== Chain.Aptos) {
            throw new Error("Panora only supports Aptos swaps");
        }

        const params = {
            fromTokenAddress: this.mapAssetToTokenAddress(fromAsset) as `0x${string}`,
            toTokenAddress: this.mapAssetToTokenAddress(toAsset) as `0x${string}`,
            fromTokenAmount: formatAmountForPanora(request.from_value, request.from_asset.decimals),
            toWalletAddress: request.to_address as `0x${string}`,
            slippagePercentage: formatBpsAsPercent(request.slippage_bps),
            ...this.buildIntegratorFeeParams(request.referral_bps),
        };

        const routeData = await this.client.getQuote({ params });
        const quoteEntry = getPanoraQuoteEntry(routeData);

        const outputValue = quoteEntry.toTokenAmount ?? (routeData as PanoraQuoteResponse).toTokenAmount;
        const outputMinValue = quoteEntry.minToTokenAmount ?? outputValue;

        if (!outputValue) {
            throw new Error("Panora quote response missing output amount");
        }

        const tokenDecimals =
            (routeData as PanoraQuoteResponse).toToken?.decimals ?? request.to_asset.decimals;
        const normalizedOutputValue = normalizeAmount(outputValue, tokenDecimals);
        const normalizedOutputMinValue = outputMinValue
            ? normalizeAmount(outputMinValue, tokenDecimals)
            : normalizedOutputValue;

        return {
            quote: request,
            output_value: normalizedOutputValue,
            output_min_value: normalizedOutputMinValue,
            route_data: routeData,
            eta_in_seconds: 0,
        };
    }

    async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
        const quoteEntry = getPanoraQuoteEntry(quote.route_data);

        if (!quoteEntry.txData) {
            throw new Error("Panora quote response missing transaction data");
        }

        const normalizedArguments = normalizePanoraArguments(
            quoteEntry.txData.function,
            quoteEntry.txData.arguments,
        );

        const payload = {
            type: "entry_function_payload",
            function: quoteEntry.txData.function,
            type_arguments: quoteEntry.txData.type_arguments,
            arguments: normalizedArguments,
        };

        return {
            to: "",
            value: "0",
            data: JSON.stringify(payload),
            dataType: SwapQuoteDataType.Contract,
        };
    }
}

function formatBpsAsPercent(bps: number): string {
    const rounded = Math.max(0, Math.round(bps));
    const whole = Math.floor(rounded / 100);
    const fraction = rounded % 100;

    if (fraction === 0) {
        return `${whole}`;
    }

    const fractionStr = fraction.toString().padStart(2, "0").replace(/0+$/, "");
    return `${whole}.${fractionStr}`;
}

function normalizeAmount(value: string, decimals: number): string {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed.includes(".")) {
        return trimmed;
    }
    return BigIntMath.parseDecimals(trimmed, decimals).toString();
}

function formatAmountForPanora(value: string, decimals: number): string {
    const raw = BigIntMath.parseString(value);
    if (decimals <= 0) {
        return raw.toString();
    }

    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = raw / divisor;
    const fraction = raw % divisor;
    if (fraction === BigInt(0)) {
        return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${whole.toString()}.${fractionStr}`;
}

const PANORA_ROUTER_ENTRY_PARAMS = [
    "0x1::option::Option<signer>",
    "address",
    "u64",
    "u8",
    "vector<u8>",
    "vector<vector<vector<u8>>>",
    "vector<vector<vector<u64>>>",
    "vector<vector<vector<bool>>>",
    "vector<vector<u8>>",
    "vector<vector<vector<address>>>",
    "vector<vector<address>>",
    "vector<vector<address>>",
    "0x1::option::Option<vector<vector<vector<vector<vector<u8>>>>>>",
    "vector<vector<vector<u64>>>",
    "0x1::option::Option<vector<vector<vector<u8>>>>",
    "address",
    "vector<u64>",
    "u64",
    "u64",
    "address",
];

type MoveType =
    | { kind: "option"; value: MoveType }
    | { kind: "vector"; value: MoveType }
    | { kind: "address" }
    | { kind: "signer" }
    | { kind: "primitive"; name: string };

function normalizePanoraArguments(functionId: string, args: unknown[]): unknown[] {
    const functionKey = functionId.split("::").slice(-2).join("::");
    if (functionKey !== "panora_swap::router_entry") {
        return args;
    }
    if (args.length !== PANORA_ROUTER_ENTRY_PARAMS.length) {
        return args;
    }

    return args.map((value, index) => coerceMoveValue(value, parseMoveType(PANORA_ROUTER_ENTRY_PARAMS[index])));
}

function parseMoveType(type: string): MoveType {
    const trimmed = type.trim();
    if (trimmed.startsWith("0x1::option::Option<") && trimmed.endsWith(">")) {
        return { kind: "option", value: parseMoveType(trimmed.slice("0x1::option::Option<".length, -1)) };
    }
    if (trimmed.startsWith("vector<") && trimmed.endsWith(">")) {
        return { kind: "vector", value: parseMoveType(trimmed.slice("vector<".length, -1)) };
    }
    if (trimmed === "address") {
        return { kind: "address" };
    }
    if (trimmed === "signer" || trimmed === "&signer") {
        return { kind: "signer" };
    }
    return { kind: "primitive", name: trimmed };
}

function coerceMoveValue(value: unknown, type: MoveType): unknown {
    switch (type.kind) {
        case "option":
            if (value === null || value === undefined) {
                return null;
            }
            return coerceMoveValue(value, type.value);
        case "vector":
            if (!Array.isArray(value)) {
                return [];
            }
            return value.map((entry) => coerceMoveValue(entry, type.value));
        case "address":
        case "signer":
            return String(value);
        case "primitive":
            if (type.name === "bool") {
                return Boolean(value);
            }
            if (type.name === "u8") {
                return coerceU8(value);
            }
            if (type.name.startsWith("u")) {
                return coerceUnsigned(value);
            }
            return value;
    }
}

function coerceUnsigned(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return Math.trunc(value).toString();
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    return String(value);
}

function coerceU8(value: unknown): number | string {
    if (typeof value === "number") {
        return Math.trunc(value);
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed, 16) : Number.parseInt(trimmed, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
        return trimmed;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : String(value);
}
