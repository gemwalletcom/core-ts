import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Percentage, ReadOnlyWallet, SimpleAccountFetcher } from "@orca-so/common-sdk";
import {
    buildWhirlpoolClient,
    DEFAULT_WHIRLPOOL_RETENTION_POLICY,
    ORCA_SUPPORTED_TICK_SPACINGS,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    PDAUtil,
    PoolUtil,
    PREFER_CACHE,
    UseFallbackTickArray,
    Whirlpool,
    WhirlpoolAccountFetcher,
    WhirlpoolAccountFetcherInterface,
    WhirlpoolClient,
    WhirlpoolContext,
    WhirlpoolData,
    swapQuoteByInputToken,
} from "@orca-so/whirlpools-sdk";
import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

import {
    AssetId,
    Chain,
    Quote,
    QuoteData,
    QuoteRequest,
} from "@gemwallet/types";
import { Protocol } from "../protocol";
import { getReferrerAddresses } from "../referrer";
import { OrcaSwapRouteData, isOrcaRouteData } from "./model";
import { calculateReferralFeeAmount, bnToNumberSafe } from "./fee";
import {
    getRecentBlockhash,
    setTransactionBlockhash,
    serializeTransaction,
    addComputeBudgetInstructions,
    getRecentPriorityFee,
} from "../chain/solana/tx_builder";
import { DEFAULT_COMMITMENT, WSOL_MINT } from "../chain/solana/constants";

type CachedPool = {
    poolAddress: string;
    tickSpacing: number;
};

export class OrcaWhirlpoolProvider implements Protocol {
    private readonly connection: Connection;
    private readonly fetcher: WhirlpoolAccountFetcherInterface;
    private readonly programId = ORCA_WHIRLPOOL_PROGRAM_ID;
    private readonly whirlpoolsConfig = ORCA_WHIRLPOOLS_CONFIG;
    private readonly poolCache: Map<string, CachedPool> = new Map();

    constructor(private readonly solanaRpcEndpoint: string) {
        this.connection = new Connection(this.solanaRpcEndpoint, {
            commitment: DEFAULT_COMMITMENT,
        });
        // Create a custom fetcher with caching enabled
        this.fetcher = new WhirlpoolAccountFetcher(
            this.connection,
            new SimpleAccountFetcher(
                this.connection,
                DEFAULT_WHIRLPOOL_RETENTION_POLICY,
            ),
        );
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

        if (
            fromAsset.chain !== Chain.Solana ||
            toAsset.chain !== Chain.Solana
        ) {
            throw new Error("Only Solana assets are supported by Orca");
        }

        const fromMint = this.getMintPublicKey(fromAsset);
        const toMint = this.getMintPublicKey(toAsset);
        const amountIn = this.parseAmount(quoteRequest.from_value);

        // Calculate referral fee and deduct it from swap amount
        const referralBps = quoteRequest.referral_bps ?? 0;
        const referralFee = amountIn.muln(referralBps).divn(10_000);
        const swapAmount = amountIn.sub(referralFee);

        const context = this.createContext(PublicKey.default);
        const client = buildWhirlpoolClient(context);

        const { whirlpool, data, tickSpacing } = await this.findBestPool(
            client,
            fromMint,
            toMint,
        );

        const slippage = Percentage.fromFraction(
            quoteRequest.slippage_bps,
            10_000,
        );
        const quote = await swapQuoteByInputTokenWithFallback(
            whirlpool,
            fromMint,
            swapAmount,
            slippage,
            this.programId,
            client.getFetcher(),
        );

        const routeData: OrcaSwapRouteData = {
            poolAddress: whirlpool.getAddress().toBase58(),
            tickSpacing,
            tokenMintA: data.tokenMintA.toBase58(),
            tokenMintB: data.tokenMintB.toBase58(),
            swap: {
                amount: quote.amount.toString(),
                otherAmountThreshold: quote.otherAmountThreshold.toString(),
                sqrtPriceLimit: quote.sqrtPriceLimit.toString(),
                amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
                aToB: quote.aToB,
                tickArrays: [
                    quote.tickArray0.toBase58(),
                    quote.tickArray1.toBase58(),
                    quote.tickArray2.toBase58(),
                ],
                supplementalTickArrays: quote.supplementalTickArrays?.map(
                    (addr) => addr.toBase58(),
                ),
            },
        };

        return {
            quote: quoteRequest,
            output_value: quote.estimatedAmountOut.toString(),
            output_min_value: quote.otherAmountThreshold.toString(),
            eta_in_seconds: 5,
            route_data: routeData,
        };
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        if (!isOrcaRouteData(quote.route_data)) {
            throw new Error("Invalid Orca route data");
        }

        const route = quote.route_data;
        let userPublicKey: PublicKey;
        try {
            userPublicKey = new PublicKey(quote.quote.from_address);
        } catch {
            throw new Error("Invalid Solana address for from_address");
        }

        const context = this.createContext(userPublicKey);
        const client = buildWhirlpoolClient(context);
        const poolAddress = new PublicKey(route.poolAddress);
        const whirlpool = await client.getPool(poolAddress, PREFER_CACHE);

        const swapInput = this.buildSwapInput(route);

        // Fetch swap transaction builder and priority fee in parallel
        const [txBuilder, priorityFee] = await Promise.all([
            whirlpool.swap(swapInput, userPublicKey),
            getRecentPriorityFee(this.connection),
        ]);

        // Add compute budget instructions with dynamic priority fee
        const computeBudgetInstructions = addComputeBudgetInstructions([], undefined, priorityFee);
        txBuilder.prependInstruction({
            instructions: computeBudgetInstructions,
            cleanupInstructions: [],
            signers: [],
        });

        // Add referral fee transfer AFTER the swap (so fee is only charged if swap succeeds)
        const referralFeeLamports = calculateReferralFeeAmount(quote);
        if (!referralFeeLamports.isZero()) {
            const referrer = getReferrerAddresses().solana;
            if (!referrer) {
                throw new Error("Missing Solana referral address");
            }

            const fromAsset = AssetId.fromString(quote.quote.from_asset.id);
            const referralInstruction = fromAsset.isNative()
                ? SystemProgram.transfer({
                    fromPubkey: userPublicKey,
                    toPubkey: new PublicKey(referrer),
                    lamports: bnToNumberSafe(referralFeeLamports),
                })
                : (() => {
                    const fromMint = this.getMintPublicKey(fromAsset);
                    const userTokenAccount = getAssociatedTokenAddressSync(
                        fromMint,
                        userPublicKey,
                    );
                    const referrerTokenAccount = getAssociatedTokenAddressSync(
                        fromMint,
                        new PublicKey(referrer),
                    );
                    return createTransferInstruction(
                        userTokenAccount,
                        referrerTokenAccount,
                        userPublicKey,
                        bnToNumberSafe(referralFeeLamports),
                    );
                })();

            // Append the referral transfer after the swap
            txBuilder.addInstruction({
                instructions: [referralInstruction],
                cleanupInstructions: [],
                signers: [],
            });
        }

        // Build transaction and fetch blockhash in parallel
        const [payload, { blockhash, lastValidBlockHeight }] = await Promise.all([
            txBuilder.build(),
            getRecentBlockhash(this.connection, DEFAULT_COMMITMENT),
        ]);

        const transaction = payload.transaction;

        // Set the recent blockhash for the transaction
        setTransactionBlockhash(transaction, blockhash, lastValidBlockHeight);

        // Sign with any signers returned by the builder (e.g., for token account creation)
        if (payload.signers && payload.signers.length > 0) {
            if (transaction instanceof Transaction) {
                transaction.partialSign(...payload.signers);
            } else {
                transaction.sign(payload.signers);
            }
        }

        // Serialize transaction
        const serialized = serializeTransaction(transaction);

        return {
            to: "",
            value: "0",
            data: serialized,
        };
    }

    private createContext(walletPublicKey: PublicKey): WhirlpoolContext {
        const wallet = new ReadOnlyWallet(walletPublicKey);
        const provider = new AnchorProvider(this.connection, wallet, {
            commitment: DEFAULT_COMMITMENT,
            preflightCommitment: DEFAULT_COMMITMENT,
        });

        return WhirlpoolContext.withProvider(
            provider,
            this.programId,
            this.fetcher,
        );
    }

    private async findBestPool(
        client: WhirlpoolClient,
        mintA: PublicKey,
        mintB: PublicKey,
    ): Promise<{ whirlpool: Whirlpool; data: WhirlpoolData; tickSpacing: number }> {
        const [canonicalA, canonicalB] = PoolUtil.orderMints(
            mintA.toBase58(),
            mintB.toBase58(),
        );
        const canonicalMintA = new PublicKey(canonicalA);
        const canonicalMintB = new PublicKey(canonicalB);
        const cacheKey = `${canonicalA}-${canonicalB}`;

        const fetcher = client.getFetcher();
        const cached = this.poolCache.get(cacheKey);
        if (cached) {
            const cachedAddress = new PublicKey(cached.poolAddress);
            // Fetch pool data and whirlpool in parallel
            const [cachedData, cachedWhirlpool] = await Promise.all([
                fetcher.getPool(cachedAddress, PREFER_CACHE),
                client.getPool(cachedAddress, PREFER_CACHE),
            ]);
            if (cachedData && cachedData.liquidity.gt(new BN(0))) {
                return {
                    whirlpool: cachedWhirlpool,
                    data: cachedData,
                    tickSpacing: cached.tickSpacing,
                };
            }
            this.poolCache.delete(cacheKey);
        }

        const candidateInfos = ORCA_SUPPORTED_TICK_SPACINGS.map(
            (tickSpacing) => ({
                tickSpacing,
                address: PDAUtil.getWhirlpool(
                    this.programId,
                    this.whirlpoolsConfig,
                    canonicalMintA,
                    canonicalMintB,
                    tickSpacing,
                ).publicKey,
            }),
        );

        let bestCandidate: {
            info: (typeof candidateInfos)[number];
            data: WhirlpoolData;
        } | null = null;

        const poolsMap = await fetcher.getPools(
            candidateInfos.map((candidate) => candidate.address),
            PREFER_CACHE,
        );

        for (const candidate of candidateInfos) {
            const poolData = poolsMap.get(candidate.address.toBase58());
            if (poolData && poolData.liquidity.gt(new BN(0))) {
                if (
                    !bestCandidate ||
                    poolData.liquidity.gt(bestCandidate.data.liquidity)
                ) {
                    bestCandidate = { info: candidate, data: poolData };
                }
            }
        }

        if (!bestCandidate) {
            throw new Error("No Orca whirlpool found for the provided assets");
        }

        const whirlpool = await client.getPool(
            bestCandidate.info.address,
            PREFER_CACHE,
        );

        this.poolCache.set(cacheKey, {
            poolAddress: bestCandidate.info.address.toBase58(),
            tickSpacing: bestCandidate.info.tickSpacing,
        });

        return {
            whirlpool,
            data: bestCandidate.data,
            tickSpacing: bestCandidate.info.tickSpacing,
        };
    }

    private parseAmount(value: string): BN {
        try {
            const amount = new BN(value);
            if (amount.lte(new BN(0))) {
                throw new Error("Amount must be greater than zero");
            }
            return amount;
        } catch {
            throw new Error("Invalid amount");
        }
    }

    private getMintPublicKey(asset: AssetId): PublicKey {
        if (asset.chain !== Chain.Solana) {
            throw new Error("Only Solana assets are supported by Orca");
        }

        if (asset.isNative()) {
            return WSOL_MINT;
        }

        if (!asset.tokenId) {
            throw new Error("Invalid token identifier for Solana asset");
        }

        try {
            return new PublicKey(asset.tokenId);
        } catch {
            throw new Error("Invalid SPL token address");
        }
    }

    private buildSwapInput(route: OrcaSwapRouteData) {
        const tickArrays = route.swap.tickArrays.map(
            (addr) => new PublicKey(addr),
        ) as [PublicKey, PublicKey, PublicKey];
        const supplementalTickArrays = route.swap.supplementalTickArrays?.map(
            (addr) => new PublicKey(addr),
        );

        return {
            amount: new BN(route.swap.amount),
            otherAmountThreshold: new BN(route.swap.otherAmountThreshold),
            sqrtPriceLimit: new BN(route.swap.sqrtPriceLimit),
            amountSpecifiedIsInput: route.swap.amountSpecifiedIsInput,
            aToB: route.swap.aToB,
            tickArray0: tickArrays[0],
            tickArray1: tickArrays[1],
            tickArray2: tickArrays[2],
            ...(supplementalTickArrays
                ? { supplementalTickArrays }
                : undefined),
        };
    }
}

async function swapQuoteByInputTokenWithFallback(
    whirlpool: Whirlpool,
    inputTokenMint: PublicKey,
    tokenAmount: BN,
    slippageTolerance: Percentage,
    programId: PublicKey,
    fetcher: WhirlpoolAccountFetcherInterface,
) {
    try {
        return await swapQuoteByInputToken(
            whirlpool,
            inputTokenMint,
            tokenAmount,
            slippageTolerance,
            programId,
            fetcher,
            PREFER_CACHE,
            UseFallbackTickArray.Situational,
        );
    } catch (error) {
        throw new Error(
            error instanceof Error
                ? error.message
                : "Unable to calculate Orca swap quote",
        );
    }
}
