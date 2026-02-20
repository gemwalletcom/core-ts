import { Chain } from "@gemwallet/types";

const DEFAULT_RPC_URLS: Partial<Record<string, string>> = {
    [Chain.Manta]: "https://pacific-rpc.manta.network/http",
    [Chain.Mantle]: "https://rpc.mantle.xyz",
    [Chain.XLayer]: "https://rpc.xlayer.tech",
};

export function evmRpcUrl(chain: Chain): string | undefined {
    const envKey = `${chain.toUpperCase()}_URL`;
    return process.env[envKey] || DEFAULT_RPC_URLS[chain];
}

interface JsonRpcResponse<T> {
    result?: T;
    error?: { code: number; message: string };
}

export async function jsonRpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T | undefined> {
    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = (await response.json()) as JsonRpcResponse<T>;
    return json.result;
}
