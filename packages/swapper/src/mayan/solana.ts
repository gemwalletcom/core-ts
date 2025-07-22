import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSolanaInstructions } from "@mayanfinance/swap-sdk";
import { Connection, MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getReferrerAddresses } from "../referrer";

export async function buildSolanaQuoteData(request: QuoteRequest, routeData: MayanQuote, rpcEndpoint: string): Promise<QuoteData> {
    const connection = new Connection(rpcEndpoint);
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const { serializedTrx } = await prepareSolanaSwapTransaction(
        routeData,
        request.from_address,
        request.to_address,
        referrerAddresses,
        connection
    );

    return {
        to: "",
        value: "0",
        data: Buffer.from(serializedTrx).toString("base64"),
    };
}

async function prepareSolanaSwapTransaction(
    quote: MayanQuote,
    swapperWalletAddress: string,
    destinationAddress: string,
    referrerAddresses: ReferrerAddresses,
    connection: Connection,
): Promise<{
    serializedTrx: Uint8Array,
    additionalInfo: {
        blockhash: string,
        lastValidBlockHeight: number,
        isVersionedTransaction: boolean,
        feePayer: string,
    }
}> {
    const {
        instructions,
        signers,
        lookupTables,
    } = await createSwapFromSolanaInstructions(
        quote, swapperWalletAddress, destinationAddress,
        referrerAddresses, connection, {
            allowSwapperOffCurve: undefined,
            forceSkipCctpInstructions: undefined,
            separateSwapTx: false,
            usdcPermitSignature: undefined,
        });

    if (quote.gasless) {
        throw new Error("Gasless swaps are not currently supported");
    }

    const swapper = new PublicKey(swapperWalletAddress);
    const feePayer = swapper;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Use MessageV0.compile as per the latest SDK pattern
    const message = MessageV0.compile({
        instructions,
        payerKey: feePayer,
        recentBlockhash: blockhash,
        addressLookupTableAccounts: lookupTables,
    });
    const transaction = new VersionedTransaction(message);
    transaction.sign(signers);

    const serializedTrx = transaction.serialize();

    return {
        serializedTrx,
        additionalInfo: {
            blockhash,
            lastValidBlockHeight,
            isVersionedTransaction: true,
            feePayer: feePayer.toBase58(),
        }
    };
}