export interface OkxApiResponse<T> {
    code: string;
    msg: string;
    data: T[];
}

export interface TokenInfo {
    tokenContractAddress: string;
    tokenSymbol: string;
    decimal: string;
    tokenUnitPrice: string;
}

export interface QuoteData {
    fromToken: TokenInfo;
    toToken: TokenInfo;
    fromTokenAmount: string;
    toTokenAmount: string;
    estimateGasFee: string;
    tx?: TransactionData;
}

export interface TransactionData {
    data: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    minReceiveAmount: string;
    slippagePercent: string;
    signatureData?: string[];
}

export interface QuoteParams {
    chainIndex: string;
    amount: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    slippagePercent: string;
    dexIds?: string;
    feePercent?: string;
    userWalletAddress?: string;
}

export interface SwapParams {
    chainIndex: string;
    amount: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    userWalletAddress: string;
    approveTransaction?: boolean;
    approveAmount?: string;
    slippagePercent?: string;
    autoSlippage?: boolean;
    maxAutoSlippagePercent?: string;
    dexIds?: string;
    feePercent?: string;
    fromTokenReferrerWalletAddress?: string;
    toTokenReferrerWalletAddress?: string;
}
