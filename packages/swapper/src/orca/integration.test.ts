import { Chain, QuoteRequest } from "@gemwallet/types";

import { OrcaWhirlpoolProvider } from "./provider";
import { createQuoteRequest } from "./testkit";

const runIntegration = process.env.ORCA_INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const SOLANA_MAINNET_RPC =
    process.env.SOLANA_RPC || "https://solana-rpc.publicnode.com";

const WALLET_ADDRESS = "A21o4asMbFHYadqXdLusT9Bvx9xaC5YV9gcaidjqtdXC";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PYUSD_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo";

const REQUEST_TEMPLATE: QuoteRequest = createQuoteRequest({
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
});

describeIntegration("Orca live integration", () => {
    jest.setTimeout(60_000);
    const provider = new OrcaWhirlpoolProvider(SOLANA_MAINNET_RPC);

    it("fetches a live quote and builds quote data", async () => {
        const quote = await provider.get_quote(REQUEST_TEMPLATE);

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.route_data).toBeDefined();

        console.log("quote", quote);

        const quoteData = await provider.get_quote_data(quote);

        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);

        console.log("quoteData", quoteData);
    });

    it("builds quote data for a Token-2022 mint", async () => {
        const token2022Request = createQuoteRequest({
            ...REQUEST_TEMPLATE,
            to_asset: {
                id: `${Chain.Solana}_${PYUSD_MINT}`,
                symbol: "PYUSD",
                decimals: 6,
            },
        });

        const quote = await provider.get_quote(token2022Request);

        expect(quote.route_data).toBeDefined();
        expect(quote.route_data && "outputMint" in quote.route_data
            ? quote.route_data.outputMint
            : null).toBe(PYUSD_MINT);

        const quoteData = await provider.get_quote_data(quote);
        expect(typeof quoteData.data).toBe("string");
        expect(quoteData.data.length).toBeGreaterThan(0);

        console.log("token2022 quote", quote);
        console.log("token2022 quoteData", quoteData);
    });
});
