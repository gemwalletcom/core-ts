import { OrcaWhirlpoolProvider } from "./provider";
import { Quote } from "@gemwallet/types";
import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { buildQuoteFixture, createQuoteRequest, SOL_ASSET } from "./testkit";

jest.mock("@solana-program/token-2022", () => ({
    fetchAllMint: jest.fn(),
}));

const mockFetchAllMint = jest.requireMock("@solana-program/token-2022") as {
    fetchAllMint: jest.Mock;
};

const TEST_RPC = "https://example.org";

const TEST_LEGACY_MINT = "So11111111111111111111111111111111111111112";
const TEST_TOKEN2022_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";

function createQuote(mint: string, referralBps = 100): Quote {
    return buildQuoteFixture(
        {
            from_address: "9iqKg7nZFkC6xhnoWvyvCSdrgSX1uxPxL4X4fb97aotW",
            to_address: "9iqKg7nZFkC6xhnoWvyvCSdrgSX1uxPxL4X4fb97aotW",
            from_asset: {
                id: `solana_${mint}`,
                symbol: "SRC",
                decimals: 6,
            },
            to_asset: SOL_ASSET,
            from_value: "1000000",
            referral_bps: referralBps,
            slippage_bps: 100,
        },
        {
            eta_in_seconds: 5,
        },
    );
}

describe("OrcaWhirlpoolProvider.buildReferralInstruction", () => {
    let provider: OrcaWhirlpoolProvider;
    const userKey = new PublicKey("9iqKg7nZFkC6xhnoWvyvCSdrgSX1uxPxL4X4fb97aotW");

    beforeEach(() => {
        provider = new OrcaWhirlpoolProvider(TEST_RPC);
        jest.spyOn(provider as any, "getPriorityFee").mockResolvedValue(0);
        mockFetchAllMint.fetchAllMint?.mockReset?.();
    });

    it("returns null when referral amount is zero", async () => {
        const quote = createQuote(TEST_LEGACY_MINT, 0);

        // @ts-expect-error accessing private method for test purposes
        const instruction = await provider.buildReferralInstruction(quote, userKey);

        expect(instruction).toBeNull();
    });

    it("skips referral when mint uses token-2022 program", async () => {
        mockFetchAllMint.fetchAllMint.mockResolvedValue([
            {
                exists: true,
                programAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
            },
        ]);
        const quote = createQuote(TEST_TOKEN2022_MINT);

        // @ts-expect-error accessing private method for test purposes
        const instruction = await provider.buildReferralInstruction(quote, userKey);

        expect(instruction).toBeNull();
    });

    it("builds transfer instruction for legacy token program", async () => {
        mockFetchAllMint.fetchAllMint.mockResolvedValue([
            {
                exists: true,
                programAddress: TOKEN_PROGRAM_ID.toBase58(),
            },
        ]);
        const quote = createQuote(TEST_LEGACY_MINT);

        // @ts-expect-error accessing private method for test purposes
        const instruction = await provider.buildReferralInstruction(quote, userKey);

        expect(instruction).toBeInstanceOf(TransactionInstruction);
    });
});

describe("OrcaWhirlpoolProvider.get_quote referral handling", () => {
    let provider: OrcaWhirlpoolProvider;
    let capturedAmount: bigint | null;

    beforeEach(() => {
        provider = new OrcaWhirlpoolProvider(TEST_RPC);
        (provider as any).initPromise = Promise.resolve();
        capturedAmount = null;
        mockFetchAllMint.fetchAllMint.mockReset();

        jest
            .spyOn(provider as any, "buildExactInQuote")
            .mockImplementation(async (...args: unknown[]) => {
                const amount = args[2] as bigint;
                capturedAmount = amount;
                return {
                    quote: {
                        tokenEstOut: BigInt(5000),
                        tokenMinOut: BigInt(4000),
                    },
                };
            });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        capturedAmount = null;
    });

    it("reduces swap amount for legacy SPL tokens when referral applies", async () => {
        jest
            .spyOn(provider as any, "findBestPool")
            .mockResolvedValue({ account: { address: "PoolAddress" } });
        const mintProgramSpy = jest
            .spyOn(provider as any, "getTokenProgram")
            .mockResolvedValueOnce(TOKEN_PROGRAM_ID);

        const quote = await provider.get_quote(
            createQuoteRequest({
                from_asset: {
                    id: `solana_${TEST_LEGACY_MINT}`,
                    symbol: "SRC",
                    decimals: 6,
                },
                from_value: "1000000",
                referral_bps: 100,
            }),
        );

        expect(capturedAmount).toBe(BigInt(990000));
        expect(quote.route_data).toMatchObject({ amount: "990000" });
        expect(mintProgramSpy).toHaveBeenCalledWith(new PublicKey(TEST_LEGACY_MINT));
    });

    it("uses full input amount for Token-2022 tokens when referral cannot be collected", async () => {
        jest
            .spyOn(provider as any, "findBestPool")
            .mockResolvedValue({ account: { address: "PoolAddress" } });
        const getProgramSpy = jest
            .spyOn(provider as any, "getTokenProgram")
            .mockResolvedValueOnce(new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"));

        const quote = await provider.get_quote(
            createQuoteRequest({
                from_asset: {
                    id: `solana_${TEST_TOKEN2022_MINT}`,
                    symbol: "SRC",
                    decimals: 6,
                },
                from_value: "1000000",
                referral_bps: 100,
            }),
        );

        expect(capturedAmount).toBe(BigInt(1000000));
        expect(quote.route_data).toMatchObject({ amount: "1000000" });
        expect(getProgramSpy).toHaveBeenCalledWith(new PublicKey(TEST_TOKEN2022_MINT));
    });
});
