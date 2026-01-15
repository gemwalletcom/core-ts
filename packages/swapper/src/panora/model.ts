import { isRecord } from "../guards";

export type PanoraTxData = {
    function: string;
    type_arguments: unknown[];
    arguments: unknown[];
};

export type PanoraToken = {
    decimals: number;
};

export type PanoraQuoteEntry = {
    toTokenAmount?: string;
    minToTokenAmount?: string;
    txData?: PanoraTxData;
};

export type PanoraQuoteResponse = {
    toToken?: PanoraToken;
    toTokenAmount?: string;
    quotes: PanoraQuoteEntry[];
};

export function isPanoraQuoteResponse(value: unknown): value is PanoraQuoteResponse {
    if (!isRecord(value)) {
        return false;
    }
    const quotes = value.quotes;
    if (!Array.isArray(quotes) || quotes.length === 0) {
        return false;
    }
    return true;
}

export function getPanoraQuoteEntry(value: unknown): PanoraQuoteEntry {
    if (!isRecord(value)) {
        throw new Error("Invalid Panora quote data");
    }

    const quotes = value.quotes;
    if (!Array.isArray(quotes) || quotes.length === 0) {
        throw new Error("Panora quote data missing quotes");
    }

    return quotes[0] as PanoraQuoteEntry;
}
