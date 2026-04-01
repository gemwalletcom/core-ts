import { Chain } from "@gemwallet/types";

import { ethCall } from "./rpc";

const ALLOWANCE_SELECTOR = "0xdd62ed3e";

function encodeAllowanceCall(owner: string, spender: string): string {
    const ownerPadded = owner.slice(2).toLowerCase().padStart(64, "0");
    const spenderPadded = spender.slice(2).toLowerCase().padStart(64, "0");
    return `${ALLOWANCE_SELECTOR}${ownerPadded}${spenderPadded}`;
}

export async function approvalRequired(
    chain: Chain,
    token: string,
    owner: string,
    spender: string,
    value: string,
): Promise<boolean> {
    try {
        const result = await ethCall(chain, token, encodeAllowanceCall(owner, spender));
        const allowance = result ? BigInt(result) : BigInt(0);
        return allowance < BigInt(value);
    } catch {
        return true;
    }
}
