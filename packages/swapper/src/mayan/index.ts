import { fetchQuote, getSwapFromEvmTxPayload, ChainName, QuoteParams, QuoteOptions, Quote as MayanQuote, createSwapFromSolanaInstructions, ReferrerAddresses } from "@mayanfinance/swap-sdk";
import { QuoteRequest, Quote, QuoteData, Asset, Chain } from "@gemwallet/types";
import { Protocol } from "../protocol";
import { Connection, MessageV0, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

export class MayanProvider implements Protocol {

    private rpcEndpoint: string;
    constructor(rpcEndpoint: string) {
        this.rpcEndpoint = rpcEndpoint;
    }

    mapAssetToTokenId(asset: Asset): string {
        if (asset.isNative()) {
            if (asset.chain === Chain.SOLANA) {
                return "So11111111111111111111111111111111111111112";
            } else {
                return "0x0000000000000000000000000000000000000000";
            }
        }
        return asset.tokenId!;
    }

    mapChainToName(chain: Chain): ChainName {
        switch (chain) {
            case Chain.SMARTCHAIN:
                return "bsc";
            default:
                return chain as ChainName;
        }
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = Asset.fromString(quoteRequest.from_asset.toString());
        const toAsset = Asset.fromString(quoteRequest.to_asset.toString());

        const params: QuoteParams = {
            fromToken: this.mapAssetToTokenId(fromAsset),
            toToken: this.mapAssetToTokenId(toAsset),
            amountIn64: quoteRequest.from_value,
            fromChain: this.mapChainToName(fromAsset.chain),
            toChain: this.mapChainToName(toAsset.chain),
            slippageBps: "auto",
            referrer: quoteRequest.referral_address,
            referrerBps: quoteRequest.referral_bps
        }
        const options: QuoteOptions = {
            "swift": true,
            "fastMctp": false,
        }
        const quotes = await fetchQuote(params, options);

        if (!quotes || quotes.length === 0) {
            throw new Error("No quotes available");
        }

        const quote = quotes[0];

        return {
            quote: quoteRequest,
            output_value: quote.expectedAmountOut.toString(),
            output_min_value: quote.minAmountOut.toString(),
            route_data: quote
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = Asset.fromString(quote.quote.from_asset.toString());

        if (fromAsset.chain === Chain.SOLANA) {
            return this.buildSolanaQuoteData(quote.quote, quote.route_data as MayanQuote);
        } else {
            return this.buildEvmQuoteData(quote.quote, quote.route_data as MayanQuote);
        }
    }

    buildEvmQuoteData(request: QuoteRequest, routeData: MayanQuote): QuoteData {
        const signerChainId = routeData.fromToken.chainId;
        const swapData = getSwapFromEvmTxPayload(routeData, request.from_address, request.to_address, { evm: request.referral_address }, request.from_address, signerChainId, null, null);

        return {
            to: swapData.to?.toString() || "",
            value: swapData.value?.toString() || "0",
            data: swapData.data?.toString() || "0x",
        };
    }

    async buildSolanaQuoteData(request: QuoteRequest, routeData: MayanQuote): Promise<QuoteData> {
        const connection = new Connection(this.rpcEndpoint);
        const referrerAddresses = { solana: request.referral_address };
        const { serializedTrx } = await this.prepareSolanaSwapTransaction(
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

    async prepareSolanaSwapTransaction(
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
}
