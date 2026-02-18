import { QuoteRequest, SwapQuoteData, SwapQuoteDataType } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSolanaInstructions } from "@mayanfinance/swap-sdk";
import { Connection, MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";

import { DEFAULT_COMMITMENT } from "../chain/solana/constants";
import { getRecentBlockhash, serializeTransaction, findComputeUnitLimit } from "../chain/solana/tx_builder";
import { getReferrerAddresses } from "../referrer";

export async function buildSolanaQuoteData(
    request: QuoteRequest,
    routeData: MayanQuote,
    rpcEndpoint: string,
): Promise<SwapQuoteData> {
    const connection = new Connection(rpcEndpoint);
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const { serializedTrx, gasLimit } = await prepareSolanaSwapTransaction(
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
        gasLimit,
    };
}

async function prepareSolanaSwapTransaction(
    quote: MayanQuote,
    swapperWalletAddress: string,
    destinationAddress: string,
    referrerAddresses: ReferrerAddresses,
    connection: Connection,
): Promise<{
    serializedTrx: string;
    gasLimit: string | undefined;
    additionalInfo: {
        blockhash: string;
        lastValidBlockHeight: number;
        isVersionedTransaction: boolean;
        feePayer: string;
    };
}> {
    const [swapData, { blockhash, lastValidBlockHeight }] = await Promise.all([
        createSwapFromSolanaInstructions(
            quote,
            swapperWalletAddress,
            destinationAddress,
            referrerAddresses,
            connection,
            {
                separateSwapTx: false,
            },
        ),
        getRecentBlockhash(connection, DEFAULT_COMMITMENT),
    ]);

    if (quote.gasless) {
        throw new Error("Gasless swaps are not currently supported");
    }

    const { instructions, signers, lookupTables } = swapData;
    const gasLimit = findComputeUnitLimit(instructions);

    const swapper = new PublicKey(swapperWalletAddress);

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
        gasLimit,
        additionalInfo: {
            blockhash,
            lastValidBlockHeight,
            isVersionedTransaction: true,
            feePayer: swapper.toBase58(),
        },
    };
}
