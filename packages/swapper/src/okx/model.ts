export interface OkxApiResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export interface OkxToken {
  tokenContractAddress: string;
}

export interface OkxQuoteRequest {
  chainIndex: string;
  amount: string;
  swapMode: "exactIn" | "exactOut";
  fromTokenAddress: string;
  toTokenAddress: string;
  feePercent?: string;
}

export interface OkxQuoteResponse {
  fromTokenAmount: string;
  toTokenAmount: string;
  fromToken: OkxToken;
  toToken: OkxToken;
}

export interface OkxSwapRequest {
  chainIndex: string;
  amount: string;
  swapMode: "exactIn" | "exactOut";
  fromTokenAddress: string;
  toTokenAddress: string;
  slippagePercent?: string;
  userWalletAddress: string;
  autoSlippage?: boolean;
  maxAutoSlippagePercent?: string;
  feePercent?: string;
  fromTokenReferrerWalletAddress?: string;
}

export interface OkxSwapTx {
  to: string;
  data: string;
  slippagePercent?: string;
  minReceiveAmount?: string;
}

export interface OkxSwapResponse {
  routerResult: OkxQuoteResponse;
  tx: OkxSwapTx;
}
