// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../../.env" });

import { Chain, QuoteRequest } from "@gemwallet/types";

import { BigIntMath } from "../bigint_math";
import { timedPromise } from "../debug";

const runIntegration = process.env.INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const OSMOSIS_ADDRESS = "osmo1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu";
const COSMOS_ADDRESS = "cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5z054l";

const OSMO_TO_ATOM_REQUEST: QuoteRequest = {
    from_address: OSMOSIS_ADDRESS,
    to_address: COSMOS_ADDRESS,
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
    from_value: "10000000",
    referral_bps: 0,
    slippage_bps: 100,
};

describeIntegration("Squid live integration", () => {
    jest.setTimeout(60_000);

    let provider: import("./provider").SquidProvider;

    beforeAll(async () => {
        const { SquidProvider } = await import("./provider");
        provider = new SquidProvider(process.env.SQUID_INTEGRATOR_ID || "");
    });

    it("fetches a live quote for 10 OSMO -> ATOM", async () => {
        const quote = await timedPromise("squid quote OSMO->ATOM", provider.get_quote(OSMO_TO_ATOM_REQUEST));

        expect(BigInt(quote.output_value) > 0).toBe(true);
        expect(quote.output_value).toMatch(/^\d+$/);
        expect(quote.output_min_value).toMatch(/^\d+$/);
        expect(quote.eta_in_seconds).toBeGreaterThan(0);

        const outputValue = BigIntMath.formatDecimals(quote.output_value, 6);
        console.log("Squid 10 OSMO -> ATOM output:", outputValue);
        console.log("Squid ETA:", quote.eta_in_seconds, "seconds");

        const routeData = quote.route_data as { estimate: { gasCosts: object[]; actions: object[] } };
        expect(routeData.estimate.gasCosts.length).toBeGreaterThan(0);
        expect(routeData.estimate.actions.length).toBeGreaterThan(0);
    });
});
