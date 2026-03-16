import { AssetId, Chain } from "@gemwallet/types";

import { createQuoteRequest, OSMOSIS_TEST_ADDRESS, SQUID_OSMO_TO_ATOM_REQUEST } from "../testkit/mock";
import { SquidProvider } from "./provider";

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

            const request = createQuoteRequest(SQUID_OSMO_TO_ATOM_REQUEST);
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

            jest.spyOn(global, "fetch").mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRoute),
            } as Response);

            const quote = {
                quote: createQuoteRequest(SQUID_OSMO_TO_ATOM_REQUEST),
                output_value: "500000",
                output_min_value: "495000",
                route_data: mockRoute.route,
                eta_in_seconds: 60,
            };

            const data = await provider.get_quote_data(quote);

            expect(JSON.parse(data.data)).toEqual(JSON.parse(cosmosMsg));
            expect(data.gasLimit).toBe("500000");
            expect(data.dataType).toBe("contract");
        });

        it("normalizes Long.js timeoutTimestamp to string", async () => {
            const dataWithLong = JSON.stringify({
                typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
                value: {
                    sourcePort: "transfer",
                    sourceChannel: "channel-141",
                    token: { denom: "uatom", amount: "1000000" },
                    sender: "cosmos1test",
                    receiver: "osmo1test",
                    timeoutTimestamp: { low: -72998656, high: 412955876, unsigned: false },
                    memo: "",
                },
            });

            const mockRoute = {
                route: {
                    estimate: { toAmount: "500000", toAmountMin: "495000", estimatedRouteDuration: 60 },
                    transactionRequest: { target: "", data: dataWithLong, value: "0", gasLimit: "500000", gasPrice: "0.03uatom" },
                },
            };

            jest.spyOn(global, "fetch").mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(mockRoute),
            } as Response);

            const quote = {
                quote: createQuoteRequest(SQUID_OSMO_TO_ATOM_REQUEST),
                output_value: "500000",
                output_min_value: "495000",
                route_data: mockRoute.route,
                eta_in_seconds: 60,
            };

            const data = await provider.get_quote_data(quote);
            const parsed = JSON.parse(data.data);

            expect(parsed.value.timeoutTimestamp).toBe("1773631986332999936");
        });
    });
});
