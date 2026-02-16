import { OkxAuth } from "./auth";
import {
  OkxApiResponse,
  OkxQuoteRequest,
  OkxQuoteResponse,
  OkxSwapRequest,
  OkxSwapResponse,
} from "./model";

const OKX_API_BASE_URL = "https://web3.okx.com";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) {
      search.append(key, String(value));
    }
  });
  return search.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OKX API request failed with status ${response.status}: ${body}`);
  }
  return (await response.json()) as T;
}

export class OkxClient {
  constructor(
    private readonly auth: OkxAuth,
    private readonly baseUrl = process.env.OKX_API_BASE_URL || OKX_API_BASE_URL,
  ) {}

  private async get<T>(
    requestPath: string,
    params: object,
  ): Promise<T> {
    const query = toQueryString(params);
    const queryWithPrefix = `?${query}`;
    const url = `${this.baseUrl}${requestPath}${queryWithPrefix}`;
    const headers = this.auth.buildHeaders("GET", requestPath, queryWithPrefix);
    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    return parseResponse<T>(response);
  }

  getQuote(request: OkxQuoteRequest): Promise<OkxApiResponse<OkxQuoteResponse[]>> {
    return this.get("/api/v6/dex/aggregator/quote", request);
  }

  getSwap(request: OkxSwapRequest): Promise<OkxApiResponse<OkxSwapResponse[]>> {
    return this.get("/api/v6/dex/aggregator/swap", request);
  }
}
