import { QuoteRequest, SwapQuoteData, SwapQuoteDataType } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSolanaInstructions } from "@mayanfinance/swap-sdk";
import { Connection, MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getReferrerAddresses } from "../referrer";
import {
    getRecentBlockhash,
    serializeTransaction,
} from "../chain/solana/tx_builder";
import { createJitoTipInstruction, fetchTipFloorLamports } from "../chain/solana/jito";
import { DEFAULT_COMMITMENT } from "../chain/solana/constants";

export async function buildSolanaQuoteData(request: QuoteRequest, routeData: MayanQuote, rpcEndpoint: string): Promise<SwapQuoteData> {
    const connection = new Connection(rpcEndpoint);
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const { serializedTrx } = await prepareSolanaSwapTransaction(
        routeData,
        request.from_address,
        request.to_address,
        referrerAddresses,
        connection,
    );

    return {
        to: "",
        value: "0",
        data: serializedTrx,
        dataType: SwapQuoteDataType.Contract,
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
    const [swapData, tipLamports] = await Promise.all([
        createSwapFromSolanaInstructions(
            quote, swapperWalletAddress, destinationAddress,
            referrerAddresses, connection, {
            separateSwapTx: false,
        }),
        fetchTipFloorLamports(),
    ]);

    if (quote.gasless) {
        throw new Error("Gasless swaps are not currently supported");
    }

    const { instructions, signers, lookupTables } = swapData;

    const swapper = new PublicKey(swapperWalletAddress);

    if (tipLamports > 0) {
        instructions.push(createJitoTipInstruction(swapper, tipLamports));
    }

    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash(connection, DEFAULT_COMMITMENT);

    const message = MessageV0.compile({
        instructions,
        payerKey: swapper,
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
            feePayer: swapper.toBase58(),
        }
    };
}
