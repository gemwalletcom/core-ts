import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSolanaInstructions } from "@mayanfinance/swap-sdk";
import { Connection, MessageV0, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getReferrerAddresses } from "./referrer";

export async function buildSolanaQuoteData(request: QuoteRequest, routeData: MayanQuote, rpcEndpoint: string): Promise<QuoteData> {
    const connection = new Connection(rpcEndpoint);
    const referrerAddresses = getReferrerAddresses(request.referral);
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
        referrerAddresses, connection, { separateSwapTx: false });

    const swapper = new PublicKey(swapperWalletAddress);
    const feePayer = quote.gasless ? new PublicKey(quote.relayer) : swapper;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    let serializedTrx: Uint8Array;
    let isVersionedTransaction = false;

    if (lookupTables.length > 0) {
        isVersionedTransaction = true;
        const message = MessageV0.compile({
            instructions,
            payerKey: feePayer,
            recentBlockhash: blockhash,
            addressLookupTableAccounts: lookupTables,
        });
        const transaction = new VersionedTransaction(message);
        transaction.sign(signers);
        serializedTrx = transaction.serialize();
    } else {
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = feePayer;

        instructions.forEach(instruction => transaction.add(instruction));

        if (signers.length > 0) {
            transaction.partialSign(...signers);
        }

        serializedTrx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
    }

    return {
        serializedTrx,
        additionalInfo: {
            blockhash,
            lastValidBlockHeight,
            isVersionedTransaction,
            feePayer: feePayer.toBase58(),
        }
    };
}