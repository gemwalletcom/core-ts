import { Chain } from "@gemwallet/types";

interface JsonRpcResponse {
    result?: string;
}

export function rpcUrl(chain: Chain): string {
    return process.env[`${chain.toUpperCase()}_URL`] || `https://gemnodes.com/${chain}`;
}

export async function ethCall(chain: Chain, to: string, data: string): Promise<string | undefined> {
    const response = await fetch(rpcUrl(chain), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [{ to, data }, "latest"],
        }),
    });
    const json = (await response.json()) as JsonRpcResponse;
    return json.result && json.result !== "0x" ? json.result : undefined;
}
