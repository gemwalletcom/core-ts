export interface NearIntentAsset {
    asset_id: string;
    symbol: string;
    name: string;
    decimals: number;
    blockchain: string;
    contract_address?: string;
}

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
}

export interface NearIntentQuoteResponse {
    originAsset: NearIntentAsset;
    destinationAsset: NearIntentAsset;
    amount: string;
    outputAmount: string;
    outputAmountMin: string;
    depositAddress: string;
    estimatedSwapTime: number;
    fee: string;
    feePercent: number;
    slippageTolerance: number;
    swapType: string;
    quoteId: string;
    expiresAt: string;
}