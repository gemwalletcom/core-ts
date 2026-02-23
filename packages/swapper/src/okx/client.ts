import { buildHeaders, buildQueryString } from "./auth";
import type { OkxClientConfig } from "./auth";
import type { ChainData, OkxApiResponse, QuoteData, QuoteParams, SwapParams, TransactionData } from "./models";

const BASE_URL = "https://web3.okx.com";

export class OkxDexClient {
    private readonly config: OkxClientConfig;

    constructor(config: OkxClientConfig) {
        this.config = config;
    }

    async getQuote(params: QuoteParams): Promise<OkxApiResponse<QuoteData>> {
        return this.get("/api/v6/dex/aggregator/quote", params);
    }

    async getSwapData(params: SwapParams): Promise<OkxApiResponse<{ routerResult: QuoteData; tx: TransactionData }>> {
        return this.get("/api/v6/dex/aggregator/swap", params);
    }

    async getChainData(chainIndex: string): Promise<OkxApiResponse<ChainData>> {
        return this.get("/api/v6/dex/aggregator/supported/chain", { chainIndex });
    }

    private async get<T>(path: string, params: object): Promise<T> {
        const queryString = buildQueryString(params);
        const fullPath = path + queryString;
        const timestamp = new Date().toISOString();

        const response = await fetch(BASE_URL + fullPath, {
            method: "GET",
            headers: buildHeaders(this.config, timestamp, fullPath),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`OKX API ${response.status}: ${text}`);
        }

        const json = await response.json() as T;
        return json;
    }
}
