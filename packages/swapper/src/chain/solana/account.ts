import { AssetId } from "@gemwallet/types";
import { WSOL_MINT } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { address as toAddress, type Address, type createSolanaRpc } from "@solana/kit";
import { fetchAllMint } from "@solana-program/token-2022";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
    const account = mintAccount[0];

    if (account && "exists" in account && account.exists) {
        return new PublicKey(account.programAddress);
    }

    return TOKEN_PROGRAM_ID;
}
