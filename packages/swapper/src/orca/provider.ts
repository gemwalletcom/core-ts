import { AssetId, Chain, Quote, QuoteRequest, SwapQuoteData, SwapQuoteDataType } from "@gemwallet/types";
import {
    addComputeBudgetInstructions,
    getRecentBlockhash,
    getRecentPriorityFee,
    serializeTransaction,
    setTransactionBlockhash,
} from "../chain/solana/tx_builder";
import { DEFAULT_COMMITMENT } from "../chain/solana/constants";
import { Protocol } from "../protocol";
import { getReferrerAddresses } from "../referrer";
import { calculateReferralFeeAmount, bnToNumberSafe } from "./fee";
import { OrcaSwapRouteData, isOrcaRouteData } from "./model";
import { BigIntMath } from "../bigint_math";
import { getMintAddress, parsePublicKey, resolveTokenProgram } from "../chain/solana/account";

import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

import {
    createSolanaRpc,
    address as toAddress,
    type Account,
    type Address,
    type TransactionSigner,
} from "@solana/kit";
import {
    orderMints,
    setNativeMintWrappingStrategy,
    setWhirlpoolsConfig,
    swapInstructions,
    WHIRLPOOLS_CONFIG_ADDRESS,
} from "@orca-so/whirlpools";
import {
    fetchAllMaybeTickArray,
    fetchAllMaybeWhirlpool,
    fetchOracle,
    fetchWhirlpool,
    getOracleAddress,
    getTickArrayAddress,
    getWhirlpoolAddress,
    type Whirlpool,
} from "@orca-so/whirlpools-client";
import {
    _TICK_ARRAY_SIZE,
    getTickArrayStartTickIndex,
    swapQuoteByInputToken,
    type ExactInSwapQuote,
} from "@orca-so/whirlpools-core";
import { fetchAllMint } from "@solana-program/token-2022";
import {
    AccountRole,
    type IAccountLookupMeta,
    type IAccountMeta,
    type IInstruction,
} from "@solana/instructions";

const POOL_CACHE_TTL_MS = 30_000;
const SUPPORTED_TICK_SPACINGS = [1, 2, 4, 8, 16, 64, 96, 128, 256, 32896];

type CachedPool = {
    account: Account<Whirlpool>;
    tickSpacing: number;
    lastUpdated: number;
};

type TickArrayData = {
    address: string;
    data: {
        startTickIndex: number;
        ticks: {
            initialized: boolean;
            liquidityNet: bigint;
            liquidityGross: bigint;
            feeGrowthOutsideA: bigint;
            feeGrowthOutsideB: bigint;
            rewardGrowthsOutside: [bigint, bigint, bigint];
        }[];
    };
};

type TransferFeeConfig = {
    feeBps: number;
    maxFee: bigint;
};

export class OrcaWhirlpoolProvider implements Protocol {
    private readonly connection: Connection;
    private readonly rpc: ReturnType<typeof createSolanaRpc>;
    private readonly poolCache: Map<string, CachedPool> = new Map();
    private readonly initPromise: Promise<void>;
    private priorityFeeCache: { value: number; expiresAt: number } | null = null;
    private supportedTickSpacings: number[] = [...SUPPORTED_TICK_SPACINGS];

    constructor(private readonly solanaRpcEndpoint: string) {
        this.connection = new Connection(this.solanaRpcEndpoint, {
            commitment: DEFAULT_COMMITMENT,
        });
        this.rpc = createSolanaRpc(this.solanaRpcEndpoint);
        this.initPromise = this.initialize();
    }

    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = AssetId.fromString(quoteRequest.from_asset.id);
        const toAsset = AssetId.fromString(quoteRequest.to_asset.id);

        await this.initPromise;

        const fromMintAddress = getMintAddress(fromAsset);
        const toMintAddress = getMintAddress(toAsset);

        const amountIn = BigIntMath.parseString(quoteRequest.from_value);
        const referralBps = BigInt(quoteRequest.referral_bps ?? 0);
        const referralFee = amountIn * referralBps / BigInt(10000);
        const swapAmount = amountIn - referralFee;
        if (swapAmount <= BigInt(0)) {
            throw new Error("Swap amount must be greater than zero");
        }

        const slippageBps = quoteRequest.slippage_bps ?? 100;

        const pool = await this.findBestPool(fromMintAddress, toMintAddress);
        const quoteResult = await this.buildExactInQuote(
            pool.account,
            fromMintAddress,
            swapAmount,
            slippageBps,
        );

        const routeData: OrcaSwapRouteData = {
            poolAddress: String(pool.account.address),
            inputMint: String(fromMintAddress),
            outputMint: String(toMintAddress),
            amount: swapAmount.toString(),
            slippageBps,
        };

        return {
            quote: quoteRequest,
            output_value: quoteResult.quote.tokenEstOut.toString(),
            output_min_value: quoteResult.quote.tokenMinOut.toString(),
            eta_in_seconds: 5,
            route_data: routeData,
        };
    }

    async get_quote_data(quote: Quote): Promise<SwapQuoteData> {
        if (!isOrcaRouteData(quote.route_data)) {
            throw new Error("Invalid Orca route data");
        }

        await this.initPromise;

        const route = quote.route_data;
        const userPublicKey = parsePublicKey(quote.quote.from_address);

        const inputMintAddress = toAddress(route.inputMint);
        const poolAddress = toAddress(route.poolAddress);
        const amount = BigIntMath.parseString(route.amount);
        const slippageBps = route.slippageBps ?? quote.quote.slippage_bps ?? 100;

        const signer = this.createPassthroughSigner(userPublicKey);

        const swapPromise = swapInstructions(
            this.rpc,
            { inputAmount: amount, mint: inputMintAddress },
            poolAddress,
            slippageBps,
            signer,
        );
        const priorityFeePromise = this.getPriorityFee();
        const blockhashPromise = getRecentBlockhash(
            this.connection,
            DEFAULT_COMMITMENT,
        );

        const [{ instructions }, priorityFee] = await Promise.all([
            swapPromise,
            priorityFeePromise,
        ]);

        const legacyInstructions = instructions.map((instruction) =>
            this.toLegacyInstruction(instruction),
        );

        const computeBudgetInstructions = addComputeBudgetInstructions(
            [],
            undefined,
            priorityFee,
        );

        const referralInstruction = await this.buildReferralInstruction(quote, userPublicKey);

        const transaction = new Transaction();
        transaction.add(...computeBudgetInstructions, ...legacyInstructions);

        if (referralInstruction) {
            transaction.add(referralInstruction);
        }

        transaction.feePayer = userPublicKey;

        const { blockhash, lastValidBlockHeight } = await blockhashPromise;

        setTransactionBlockhash(transaction, blockhash, lastValidBlockHeight);

        const serialized = serializeTransaction(transaction);

        return {
            to: "",
            value: "0",
            data: serialized,
            dataType: SwapQuoteDataType.Contract,
        };
    }

    private async initialize(): Promise<void> {
        await setWhirlpoolsConfig("solanaMainnet");
        setNativeMintWrappingStrategy("ata");
    }

    private async getPriorityFee(): Promise<number> {
        const now = Date.now();
        if (this.priorityFeeCache && now < this.priorityFeeCache.expiresAt) {
            return this.priorityFeeCache.value;
        }

        const value = await getRecentPriorityFee(this.connection);
        this.priorityFeeCache = {
            value,
            expiresAt: now + 3_000,
        };
        return value;
    }

    private async findBestPool(
        mintA: Address<string>,
        mintB: Address<string>,
    ): Promise<CachedPool> {
        const [orderedA, orderedB] = orderMints(mintA, mintB);
        const cacheKey = `${String(orderedA)}-${String(orderedB)}`;

        const cached = await this.validateCachedPool(cacheKey);
        if (cached) {
            return cached;
        }

        const candidateInfos = await Promise.all(
            this.supportedTickSpacings.map(async (tickSpacing) => {
                const [address] = await getWhirlpoolAddress(
                    WHIRLPOOLS_CONFIG_ADDRESS,
                    orderedA,
                    orderedB,
                    tickSpacing,
                );
                return { tickSpacing, address };
            }),
        );

        const poolAccounts = await fetchAllMaybeWhirlpool(
            this.rpc,
            candidateInfos.map((candidate) => candidate.address),
        );

        let best: { info: (typeof candidateInfos)[number]; account: Account<Whirlpool> } | null = null;

        for (let i = 0; i < poolAccounts.length; i++) {
            const account = poolAccounts[i];
            if (!account.exists) {
                continue;
            }

            if (account.data.liquidity <= BigInt(0)) {
                continue;
            }

            if (!best || account.data.liquidity > best.account.data.liquidity) {
                best = {
                    info: candidateInfos[i],
                    account,
                };
            }
        }

        if (!best) {
            throw new Error("No Orca whirlpool found for the provided assets");
        }

        const result: CachedPool = {
            account: best.account,
            tickSpacing: best.info.tickSpacing,
            lastUpdated: Date.now(),
        };

        this.poolCache.set(cacheKey, result);
        return result;
    }

    private async validateCachedPool(cacheKey: string): Promise<CachedPool | null> {
        const cached = this.poolCache.get(cacheKey);
        if (!cached) {
            return null;
        }

        const isFresh = Date.now() - cached.lastUpdated < POOL_CACHE_TTL_MS;
        if (isFresh && cached.account.data.liquidity > BigInt(0)) {
            return cached;
        }

        try {
            const refreshed = await fetchWhirlpool(this.rpc, cached.account.address);
            if (refreshed.data.liquidity > BigInt(0)) {
                const updated: CachedPool = {
                    account: refreshed,
                    tickSpacing: cached.tickSpacing,
                    lastUpdated: Date.now(),
                };
                this.poolCache.set(cacheKey, updated);
                return updated;
            }
        } catch {
            // ignore failures and fall through to invalidate cache entry
        }

        this.poolCache.delete(cacheKey);
        return null;
    }

    private async buildExactInQuote(
        whirlpool: Account<Whirlpool>,
        inputMint: Address<string>,
        amount: bigint,
        slippageBps: number,
    ): Promise<{ quote: ExactInSwapQuote }> {
        const [tickArrays, oracle, transferFees] = await Promise.all([
            this.fetchTickArrays(whirlpool),
            this.fetchOracleData(whirlpool),
            this.fetchTransferFees(whirlpool),
        ]);
        const specifiedTokenA = inputMint === whirlpool.data.tokenMintA;

        const timestamp = BigInt(Math.floor(Date.now() / 1_000));
        const quote = swapQuoteByInputToken(
            amount,
            specifiedTokenA,
            slippageBps,
            whirlpool.data,
            oracle ?? undefined,
            tickArrays.map((array) => array.data),
            timestamp,
            transferFees.tokenA ?? undefined,
            transferFees.tokenB ?? undefined,
        );

        return { quote };
    }

    private async fetchTickArrays(
        whirlpool: Account<Whirlpool>,
    ): Promise<TickArrayData[]> {
        const tickArrayStartIndex = getTickArrayStartTickIndex(
            whirlpool.data.tickCurrentIndex,
            whirlpool.data.tickSpacing,
        );
        const offset = whirlpool.data.tickSpacing * _TICK_ARRAY_SIZE();
        const indexes = [
            tickArrayStartIndex,
            tickArrayStartIndex + offset,
            tickArrayStartIndex + offset * 2,
            tickArrayStartIndex - offset,
            tickArrayStartIndex - offset * 2,
        ];

        const addresses = await Promise.all(
            indexes.map(async (startIndex) => {
                const [address] = await getTickArrayAddress(
                    whirlpool.address,
                    startIndex,
                );
                return String(address);
            }),
        );

        const accounts = await fetchAllMaybeTickArray(this.rpc, addresses.map((addr) => toAddress(addr)));

        return accounts.map((account, index): TickArrayData => {
            if (account.exists) {
                return {
                    address: String(account.address),
                    data: {
                        startTickIndex: account.data.startTickIndex,
                        ticks: account.data.ticks.map((tick) => ({
                            initialized: tick.initialized,
                            liquidityNet: tick.liquidityNet,
                            liquidityGross: tick.liquidityGross,
                            feeGrowthOutsideA: tick.feeGrowthOutsideA,
                            feeGrowthOutsideB: tick.feeGrowthOutsideB,
                            rewardGrowthsOutside: [
                                tick.rewardGrowthsOutside[0],
                                tick.rewardGrowthsOutside[1],
                                tick.rewardGrowthsOutside[2],
                            ],
                        })),
                    },
                };
            }

            return {
                address: addresses[index],
                data: this.createEmptyTickArrayData(indexes[index]),
            };
        });
    }

    private createEmptyTickArrayData(startTickIndex: number): TickArrayData["data"] {
        const ticks = Array.from({ length: _TICK_ARRAY_SIZE() }, () => ({
            initialized: false,
            liquidityNet: BigInt(0),
            liquidityGross: BigInt(0),
            feeGrowthOutsideA: BigInt(0),
            feeGrowthOutsideB: BigInt(0),
            rewardGrowthsOutside: [BigInt(0), BigInt(0), BigInt(0)] as [bigint, bigint, bigint],
        }));

        return {
            startTickIndex,
            ticks,
        };
    }

    private async fetchOracleData(
        whirlpool: Account<Whirlpool>,
    ): Promise<Awaited<ReturnType<typeof fetchOracle>>["data"] | null> {
        try {
            const feeTierIndex =
                whirlpool.data.feeTierIndexSeed[0] +
                whirlpool.data.feeTierIndexSeed[1] * 256;
            if (whirlpool.data.tickSpacing === feeTierIndex) {
                return null;
            }

            const [oracleAddress] = await getOracleAddress(whirlpool.address);
            const oracleAccount = await fetchOracle(this.rpc, oracleAddress);
            return oracleAccount.data;
        } catch {
            return null;
        }
    }

    private async fetchTransferFees(whirlpool: Account<Whirlpool>): Promise<{
        tokenA: TransferFeeConfig | null;
        tokenB: TransferFeeConfig | null;
    }> {
        const [mintA, mintB] = await fetchAllMint(this.rpc, [
            whirlpool.data.tokenMintA,
            whirlpool.data.tokenMintB,
        ]);
        const epochInfo = await this.rpc.getEpochInfo().send();

        return {
            tokenA: this.extractTransferFee(mintA, Number(epochInfo.epoch)),
            tokenB: this.extractTransferFee(mintB, Number(epochInfo.epoch)),
        };
    }

    private extractTransferFee(
        mint: Awaited<ReturnType<typeof fetchAllMint>>[number],
        currentEpoch: number,
    ): TransferFeeConfig | null {
        if (!mint) {
            return null;
        }

        if ("exists" in mint && !mint.exists) {
            return null;
        }

        const extensions = mint.data.extensions;
        if (!extensions || extensions.__option === "None") {
            return null;
        }

        const feeConfig = extensions.value.find(
            (extension: { __kind: string }) =>
                extension.__kind === "TransferFeeConfig",
        );
        if (!feeConfig) {
            return null;
        }

        const feeConfigData = feeConfig as unknown as {
            newerTransferFee: { epoch: number; transferFeeBasisPoints: number; maximumFee: bigint };
            olderTransferFee: { epoch: number; transferFeeBasisPoints: number; maximumFee: bigint };
        };

        const transferFee =
            currentEpoch >= feeConfigData.newerTransferFee.epoch
                ? feeConfigData.newerTransferFee
                : feeConfigData.olderTransferFee;

        return {
            feeBps: transferFee.transferFeeBasisPoints,
            maxFee: transferFee.maximumFee,
        };
    }

    private createPassthroughSigner(userPublicKey: PublicKey): TransactionSigner {
        const address = toAddress(userPublicKey.toBase58());
        return {
            address,
            async signTransactions<T extends readonly unknown[]>(transactions: T): Promise<T> {
                return transactions;
            },
        };
    }

    private toLegacyInstruction(instruction: IInstruction): TransactionInstruction {
        const keys =
            instruction.accounts?.map((account) =>
                this.toAccountMeta(account),
            ) ?? [];
        const data = instruction.data ? Buffer.from(instruction.data) : Buffer.alloc(0);

        return new TransactionInstruction({
            programId: new PublicKey(instruction.programAddress),
            keys,
            data,
        });
    }

    private toAccountMeta(
        account: IAccountMeta | IAccountLookupMeta,
    ): { pubkey: PublicKey; isSigner: boolean; isWritable: boolean } {
        const isSigner =
            account.role === AccountRole.READONLY_SIGNER ||
            account.role === AccountRole.WRITABLE_SIGNER;
        const isWritable =
            account.role === AccountRole.WRITABLE ||
            account.role === AccountRole.WRITABLE_SIGNER;

        return {
            pubkey: new PublicKey(account.address),
            isSigner,
            isWritable,
        };
    }

    private async buildReferralInstruction(
        quote: Quote,
        userPublicKey: PublicKey,
    ): Promise<TransactionInstruction | null> {
        const referralAmount = calculateReferralFeeAmount(quote);
        if (referralAmount.isZero()) {
            return null;
        }

        const referrer = getReferrerAddresses().solana;
        if (!referrer) {
            throw new Error("Missing Solana referral address");
        }

        const fromAsset = AssetId.fromString(quote.quote.from_asset.id);
        if (fromAsset.isNative()) {
            return SystemProgram.transfer({
                fromPubkey: userPublicKey,
                toPubkey: new PublicKey(referrer),
                lamports: bnToNumberSafe(referralAmount),
            });
        }

        const tokenId = fromAsset.tokenId;
        if (!tokenId) {
            throw new Error("Invalid token identifier for Solana asset");
        }

        const fromMintKey = parsePublicKey(tokenId);
        const programId = await resolveTokenProgram(this.rpc, fromMintKey);
        const userTokenAccount = getAssociatedTokenAddressSync(
            fromMintKey,
            userPublicKey,
            false,
            programId,
        );
        const referrerTokenAccount = getAssociatedTokenAddressSync(
            fromMintKey,
            new PublicKey(referrer),
            false,
            programId,
        );

        return createTransferInstruction(
            userTokenAccount,
            referrerTokenAccount,
            userPublicKey,
            bnToNumberSafe(referralAmount),
            [],
            programId,
        );
    }

}
