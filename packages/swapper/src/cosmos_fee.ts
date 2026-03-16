import { Chain, QuoteRequest } from "@gemwallet/types";

import { SwapperException } from "./error";

// Swap tx fees: preload_gas_limit(2M) × 1.3 × base_fee / 200K
const COSMOS_SWAP_FEES: Record<string, bigint> = {
    [Chain.Cosmos]: BigInt("39000"),
    [Chain.Osmosis]: BigInt("130000"),
    [Chain.Celestia]: BigInt("39000"),
    [Chain.Injective]: BigInt("1300000000000000"),
    [Chain.Sei]: BigInt("1300000"),
    [Chain.Noble]: BigInt("325000"),
};

export function resolveCosmosMaxAmount(quoteRequest: QuoteRequest): string {
    if (!quoteRequest.use_max_amount) {
        return quoteRequest.from_value;
    }
    const chain = quoteRequest.from_asset.id.split("_")[0];
    const reservedFee = COSMOS_SWAP_FEES[chain];
    if (!reservedFee) {
        return quoteRequest.from_value;
    }
    const amount = BigInt(quoteRequest.from_value);
    if (amount <= reservedFee) {
        throw new SwapperException({ type: "input_amount_error", min_amount: reservedFee.toString() });
    }
    return (amount - reservedFee).toString();
}
