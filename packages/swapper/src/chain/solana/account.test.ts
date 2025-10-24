import { PublicKey } from "@solana/web3.js";
import { resolveTokenProgram } from "./account";

jest.mock("@solana-program/token-2022", () => ({
    fetchAllMint: jest.fn(),
}));

const { fetchAllMint } = jest.requireMock("@solana-program/token-2022") as {
    fetchAllMint: jest.Mock;
};

describe("resolveTokenProgram", () => {
    type SolanaRpc = Parameters<typeof resolveTokenProgram>[0];
    const rpc = {} as SolanaRpc;
    const mint = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");

    beforeEach(() => {
        fetchAllMint.mockReset();
    });

    it("throws when mint does not exist", async () => {
        fetchAllMint.mockResolvedValue([{ exists: false }]);

        await expect(resolveTokenProgram(rpc, mint)).rejects.toThrow("Mint account does not exist");
    });

    it("throws when mint account response is empty", async () => {
        fetchAllMint.mockResolvedValue([]);

        await expect(resolveTokenProgram(rpc, mint)).rejects.toThrow(
            "Failed to fetch mint account data",
        );
    });

    it("returns the mint program when account exists", async () => {
        fetchAllMint.mockResolvedValue([
            {
                exists: true,
                programAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            },
        ]);

        const program = await resolveTokenProgram(rpc, mint);

        expect(program.toBase58()).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    });
});
