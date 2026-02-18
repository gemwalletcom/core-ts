export interface RelayQuotePostBodyParams {
    user: string;
    amount: string;
    originCurrency: string;
    destinationCurrency: string;
    originChainId: number;
    destinationChainId: number;
    recipient: string;
    tradeType: "EXACT_INPUT" | "EXACT_OUTPUT";
    appFee?: AppFee[];
    useDepositAddress?: boolean;
    topupGas?: boolean;
    refundTo?: string;
    slippageTolerance?: string;
}

export interface AppFee {
    recipient: string;
    fee: string;
}

export interface CurrencyMetadata {
    logoURI?: string;
    verified: boolean;
    isNative?: boolean;
}

export interface CurrencyInfo {
    chainId: number;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    metadata?: CurrencyMetadata;
}

export interface AmountDetails {
    currency: CurrencyInfo;
    amount: string;
    amountFormatted: string;
    amountUsd: string;
    minimumAmount: string;
}

export interface StepDataItem {
    from: string;
    to: string;
    data: string;
    value: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    chainId: number;
    gas?: string;
}

export interface StepItem {
    status: string;
    data: StepDataItem;
}

export interface Step {
    id: "deposit" | "approve" | "swap";
    kind: string;
    requestId?: string;
    items: StepItem[];
    depositAddress?: string;
}

export interface SlippageDetail {
    usd: string;
    value: string;
    percent: string;
}

export interface SlippageTolerance {
    origin: SlippageDetail;
    destination: SlippageDetail;
}

export interface QuoteDetails {
    operation: string;
    sender: string;
    recipient: string;
    currencyIn: AmountDetails;
    currencyOut: AmountDetails;
    currencyGasTopup?: AmountDetails;
    totalImpact?: { usd: string; percent: string };
    swapImpact?: { usd: string; percent: string };
    rate: string;
    slippageTolerance?: SlippageTolerance;
    timeEstimate?: number;
}

export interface RelayQuoteResponse {
    steps: Step[];
    details: QuoteDetails;
}
