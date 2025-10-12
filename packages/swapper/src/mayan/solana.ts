import { QuoteRequest, QuoteData } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSolanaInstructions } from "@mayanfinance/swap-sdk";
import { Connection, MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getReferrerAddresses } from "../referrer";
import {
    getRecentBlockhash,
    serializeTransaction,
    addComputeBudgetInstructions,
    getRecentPriorityFee,
} from "../chain/solana/tx_builder";
import { DEFAULT_COMMITMENT } from "../chain/solana/constants";

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
        data: serializedTrx,
    };
}

async function prepareSolanaSwapTransaction(
    quote: MayanQuote,
    swapperWalletAddress: string,
    destinationAddress: string,
    referrerAddresses: ReferrerAddresses,
    connection: Connection,
): Promise<{
    serializedTrx: string,
    additionalInfo: {
        blockhash: string,
        lastValidBlockHeight: number,
        isVersionedTransaction: boolean,
        feePayer: string,
    }
}> {
    // Fetch instructions, blockhash, and priority fee in parallel
    const [swapData, { blockhash, lastValidBlockHeight }, priorityFee] = await Promise.all([
        createSwapFromSolanaInstructions(
            quote, swapperWalletAddress, destinationAddress,
            referrerAddresses, connection, {
            separateSwapTx: false,
        }),
        getRecentBlockhash(connection, DEFAULT_COMMITMENT),
        getRecentPriorityFee(connection),
    ]);

    let { instructions, signers, lookupTables } = swapData;

    if (quote.gasless) {
        throw new Error("Gasless swaps are not currently supported");
    }

    const swapper = new PublicKey(swapperWalletAddress);
    const feePayer = swapper;

    // Use MessageV0.compile as per the latest SDK pattern
    const message = MessageV0.compile({
        instructions,
        payerKey: feePayer,
        recentBlockhash: blockhash,
        addressLookupTableAccounts: lookupTables,
    });
    const transaction = new VersionedTransaction(message);
    transaction.sign(signers);

    const serializedTrx = serializeTransaction(transaction);

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