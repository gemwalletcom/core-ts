import { Chain, QuoteRequest } from "@gemwallet/types";

import { OrcaWhirlpoolProvider } from "./provider";

const runIntegration = process.env.ORCA_INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const SOLANA_MAINNET_RPC =
    process.env.ORCA_SOLANA_RPC || "https://solana-rpc.publicnode.com";

const WALLET_ADDRESS = "A21o4asMbFHYadqXdLusT9Bvx9xaC5YV9gcaidjqtdXC";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const REQUEST_TEMPLATE: QuoteRequest = {
    from_address: WALLET_ADDRESS,
    to_address: WALLET_ADDRESS,
    from_asset: {
        id: Chain.Solana,
        symbol: "SOL",
        decimals: 9,
    },
    to_asset: {
        id: `${Chain.Solana}_${USDC_MINT}`,
        symbol: "USDC",
        decimals: 6,
    },
    from_value: "1000000000",
    referral_bps: 50,
    slippage_bps: 100,
};

describeIntegration("Orca live integration", () => {
    jest.setTimeout(60_000);

    it("fetches a live quote and builds quote data", async () => {
        const provider = new OrcaWhirlpoolProvider(SOLANA_MAINNET_RPC);

        const quote = await provider.get_quote(REQUEST_TEMPLATE);

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.route_data).toBeDefined();

        console.log("quote", quote);

        const quoteData = await provider.get_quote_data(quote);

        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);

        console.log("quoteData", quoteData);
    });
});
