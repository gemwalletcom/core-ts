import { Chain } from "@gemwallet/types";

import { evmRpcUrl, jsonRpcCall } from "./jsonrpc";

export async function getErc20Allowance(rpcUrl: string, token: string, owner: string, spender: string): Promise<bigint> {
    const ownerPadded = owner.slice(2).toLowerCase().padStart(64, "0");
    const spenderPadded = spender.slice(2).toLowerCase().padStart(64, "0");
    const data = `0xdd62ed3e${ownerPadded}${spenderPadded}`;

    const result = await jsonRpcCall<string>(rpcUrl, "eth_call", [{ to: token, data }, "latest"]);
    if (!result || result === "0x") {
        return BigInt(0);
    }
    return BigInt(result);
}

export interface ApprovalResult {
    token: string;
    spender: string;
    value: string;
}

export async function checkEvmApproval(
    chain: Chain,
    tokenId: string | undefined,
    owner: string,
    fromValue: string,
    spender?: string,
): Promise<ApprovalResult | undefined> {
    if (!tokenId || !spender) {
        return undefined;
    }
    const rpcUrl = evmRpcUrl(chain);
    if (rpcUrl) {
        try {
            const allowance = await getErc20Allowance(rpcUrl, tokenId, owner, spender);
            if (allowance >= BigInt(fromValue)) {
                return undefined;
            }
        } catch { /* fall through to return approval */ }
    }
    return { token: tokenId, spender, value: fromValue };
}
