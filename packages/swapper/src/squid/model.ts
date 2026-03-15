export interface SquidRouteRequest {
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
    slippageConfig: {
        autoMode: number;
    };
    quoteOnly?: boolean;
}

export interface SquidEstimate {
    toAmount: string;
    toAmountMin: string;
    estimatedRouteDuration: number;
}

export interface SquidTransactionRequest {
    target: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
}

export interface SquidRoute {
    estimate: SquidEstimate;
    transactionRequest?: SquidTransactionRequest;
}

export interface SquidRouteResponse {
    route: SquidRoute;
}

export interface SquidErrorResponse {
    errors?: { message: string }[];
    message?: string;
}
