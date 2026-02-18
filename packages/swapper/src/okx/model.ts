import type { QuoteData } from "@okx-dex/okx-dex-sdk";

export interface OkxRouteData extends QuoteData {
  suggestedSlippagePercent?: string;
  suggestedSlippageBps?: number;
  estimatedComputeUnits?: string;
}
