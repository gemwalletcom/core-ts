import { AssetId, Chain, QuoteRequest } from "@gemwallet/types";

import { createQuoteRequest } from "../testkit/mock";
import { SquidProvider } from "./provider";

const COSMOS_TEST_ADDRESS = "cosmos1qwerty12345test";
const OSMOSIS_TEST_ADDRESS = "osmo1qwerty12345test";

const SQUID_COSMOS_QUOTE_REQUEST: QuoteRequest = {
    from_address: OSMOSIS_TEST_ADDRESS,
    to_address: COSMOS_TEST_ADDRESS,
    from_asset: {
        id: Chain.Osmosis,
        symbol: "OSMO",
        decimals: 6,
    },
    to_asset: {
        id: Chain.Cosmos,
        symbol: "ATOM",
        decimals: 6,
    },
    from_value: "1000000",
    referral_bps: 0,
    slippage_bps: 100,
};

describe("SquidProvider", () => {
    const provider = new SquidProvider("test-integrator");

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("mapChainToSquidChainId", () => {
        it("maps supported Cosmos chains", () => {
            expect(provider.mapChainToSquidChainId(Chain.Cosmos)).toBe("cosmoshub-4");
            expect(provider.mapChainToSquidChainId(Chain.Osmosis)).toBe("osmosis-1");
            expect(provider.mapChainToSquidChainId(Chain.Celestia)).toBe("celestia");
            expect(provider.mapChainToSquidChainId(Chain.Injective)).toBe("injective-1");
            expect(provider.mapChainToSquidChainId(Chain.Sei)).toBe("pacific-1");
            expect(provider.mapChainToSquidChainId(Chain.Noble)).toBe("noble-1");
        });

        it("throws for unsupported chains", () => {
            expect(() => provider.mapChainToSquidChainId(Chain.Solana)).toThrow();
        });
    });

    describe("mapAssetToSquidToken", () => {
        it("maps native Cosmos assets to denoms", () => {
            expect(provider.mapAssetToSquidToken(AssetId.fromString("cosmos"))).toBe("uatom");
            expect(provider.mapAssetToSquidToken(AssetId.fromString("osmosis"))).toBe("uosmo");
            expect(provider.mapAssetToSquidToken(AssetId.fromString("celestia"))).toBe("utia");
            expect(provider.mapAssetToSquidToken(AssetId.fromString("noble"))).toBe("uusdc");
        });

        it("returns tokenId for non-native assets", () => {
            const ibc = "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2";
            expect(provider.mapAssetToSquidToken(AssetId.fromString(`osmosis_${ibc}`))).toBe(ibc);
        });
    });

    describe("get_quote", () => {
        it("constructs a valid quote request", async () => {
            const mockRoute = {
                route: {
                    estimate: {
                        toAmount: "500000",
                        toAmountMin: "495000",
                        estimatedRouteDuration: 60,
                    },
                    transactionRequest: {},
                    params: {},
                },
            };

            const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRoute),
            } as Response);

            const request = createQuoteRequest(SQUID_COSMOS_QUOTE_REQUEST);
            const quote = await provider.get_quote(request);

            expect(quote.output_value).toBe("500000");
            expect(quote.output_min_value).toBe("495000");
            expect(quote.eta_in_seconds).toBe(60);
            expect(quote.route_data).toEqual(mockRoute.route);

            const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(body.fromChain).toBe("osmosis-1");
            expect(body.toChain).toBe("cosmoshub-4");
            expect(body.fromToken).toBe("uosmo");
            expect(body.toToken).toBe("uatom");
            expect(body.quoteOnly).toBe(true);
        });
    });

    describe("get_quote_data", () => {
        it("fetches and returns cosmos transaction data", async () => {
            const cosmosMsg = JSON.stringify({
                typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
                value: {
                    sender: OSMOSIS_TEST_ADDRESS,
                    contract: "osmo1squid_multicall_contract",
                    msg: "{}",
                    funds: [{ denom: "uosmo", amount: "1000000" }],
                },
            });

            const mockRoute = {
                route: {
                    estimate: {
                        toAmount: "500000",
                        toAmountMin: "495000",
                        estimatedRouteDuration: 60,
                    },
                    transactionRequest: {
                        routeType: "COSMOS_ONLY",
                        target: "",
                        data: cosmosMsg,
                        value: "0",
                        gasLimit: "500000",
                        gasPrice: "0.025uosmo",
                    },
                    params: {},
                },
            };

            const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRoute),
            } as Response);

            const quote = {
                quote: createQuoteRequest(SQUID_COSMOS_QUOTE_REQUEST),
                output_value: "500000",
                output_min_value: "495000",
                route_data: mockRoute.route,
                eta_in_seconds: 60,
            };

            const data = await provider.get_quote_data(quote);

            expect(data.data).toBe(cosmosMsg);
            expect(data.gasLimit).toBe("500000");
            expect(data.dataType).toBe("contract");
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });
});
