export interface NearIntentAppFee {
    recipient: string;
    fee: number; // basis points
}

export interface NearIntentQuoteRequest {
    originAsset: string;
    destinationAsset: string;
    amount: string;
    recipient: string;
    swapType: "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT";
    slippageTolerance?: number;
    appFees?: NearIntentAppFee[];
    depositType?: string;
    refundTo?: string;
    refundType?: string;
    recipientType?: string;
    deadline?: string;
    quoteWaitingTimeMs?: number;
    dry?: boolean;
}

export interface NearIntentQuoteResponse {
    quote: {
        amountIn: string;
        minAmountIn: string;
        amountOut: string;
        minAmountOut: string;
        timeEstimate: number;
        deadline: string;
        timeWhenInactive: string;
        depositAddress?: string;
    };
    quoteRequest: NearIntentQuoteRequest;
}