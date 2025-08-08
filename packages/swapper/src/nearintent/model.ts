export interface NearIntentsAppFee {
    recipient: string;
    fee: number; // basis points
}

export interface NearIntentsQuoteRequest {
    originAsset: string;
    destinationAsset: string;
    amount: string;
    recipient: string;
    swapType: "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT";
    slippageTolerance?: number;
    appFees?: NearIntentsAppFee[];
    depositType?: string;
    refundTo?: string;
    refundType?: string;
    recipientType?: string;
    deadline?: string;
    quoteWaitingTimeMs?: number;
    dry?: boolean;
}

export interface NearIntentsQuoteResponse {
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
    quoteRequest: NearIntentsQuoteRequest;
}