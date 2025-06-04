export interface RelayQuotePostBodyParams {
  user: string;                    // e.g., "0x000000000000000000000000000000000000dead"
  amount: string;                  // e.g., "1000000000000000000"
  originCurrency: string;          // e.g., "0x0000000000000000000000000000000000000000" (ETH)
  destinationCurrency: string;     // e.g., "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8" (BTC)
  originChainId: number;           // e.g., 1 (Ethereum)
  destinationChainId: number;      // e.g., 8253038 (Bitcoin)
  recipient: string;               // e.g., "bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa"
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  referrer?: string;                // e.g., "relay.link"
  referrerAddress?: string;         // e.g., "0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC"
  useDepositAddress?: boolean;      // e.g., false
  useExternalLiquidity?: boolean;   // e.g., false
  topupGas?: boolean;               // e.g., false
  slippageTolerance?: string;       // Optional: basis points (if not specified then the slippage tolerance is automatically calculated)
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
  id: string;
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
