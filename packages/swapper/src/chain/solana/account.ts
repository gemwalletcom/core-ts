import { AssetId } from "@gemwallet/types";
import { WSOL_MINT } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { address as toAddress, type Address, type createSolanaRpc } from "@solana/kit";
import { fetchAllMint } from "@solana-program/token-2022";

type SolanaRpc = ReturnType<typeof createSolanaRpc>;

export function parsePublicKey(value: string): PublicKey {
    try {
        return new PublicKey(value);
    } catch {
        throw new Error("Invalid Solana address");
    }
}

export function getMintAddress(asset: AssetId): Address<string> {
    if (asset.isNative()) {
        return toAddress(WSOL_MINT.toBase58());
    }

    const tokenId = asset.getTokenId();

    parsePublicKey(tokenId);
    return toAddress(tokenId);
}

export async function resolveTokenProgram(
    rpc: SolanaRpc,
    mint: PublicKey,
): Promise<PublicKey> {
    const mintAccount = await fetchAllMint(rpc, [toAddress(mint.toBase58())]);
    if (mintAccount.length === 0) {
        throw new Error("Failed to fetch mint account data");
    }
    const account = mintAccount[0];

    if ("exists" in account) {
        if (!account.exists) {
            throw new Error("Mint account does not exist");
        }
        if (!account.programAddress) {
            throw new Error("Mint account missing program address");
        }
        return new PublicKey(account.programAddress);
    }

    return new PublicKey(account.programAddress);
}
