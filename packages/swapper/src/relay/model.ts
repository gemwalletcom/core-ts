export interface RelayQuotePostBodyParams {
  user: string;                    // Address that is depositing funds on the origin chain and submitting transactions or signatures
  amount: string;                  // e.g., "1000000000000000000"
  originCurrency: string;          // e.g., "0x0000000000000000000000000000000000000000" (ETH)
  destinationCurrency: string;     // e.g., "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8" (BTC)
  originChainId: number;           // e.g., 1 (Ethereum)
  destinationChainId: number;      // e.g., 8253038 (Bitcoin)
  recipient: string;               // Address that is receiving the funds on the destination chain, if not specified then this will default to the user address
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  referrer?: string;                // e.g., "relay.link"
  referrerAddress?: string;         // e.g., "0x0D9DAB1A248f63B0a48965bA8435e4de7497a3dC"
  useDepositAddress?: boolean;      // Enable this to use a deposit address when bridging, in scenarios where calldata cannot be sent alongside the transaction. only works on native currency bridges.
  topupGas?: boolean;               // If set, the destination fill will include a gas topup to the recipient (only supported for EVM chains if the requested currency is not the gas currency on the destination chain)
  refundTo?: string;                // Address to send the refund to in the case of failure, if not specified then the recipient address or user address is used
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
  id: 'deposit' | 'approve' | 'swap';
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
