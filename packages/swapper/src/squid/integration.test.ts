// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../../.env" });

import { Chain, QuoteRequest } from "@gemwallet/types";

import { BigIntMath } from "../bigint_math";
import { timedPromise } from "../debug";
import type { SquidRoute } from "./model";

const runIntegration = process.env.INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const OSMOSIS_ADDRESS = "osmo1tkvyjqeq204rmrrz3w4hcrs336qahsfwn8m0ye";
const COSMOS_ADDRESS = "cosmos1tkvyjqeq204rmrrz3w4hcrs336qahsfwmugljt";

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

const ATOM_TO_OSMO_REQUEST: QuoteRequest = {
    from_address: COSMOS_ADDRESS,
    to_address: OSMOSIS_ADDRESS,
    from_asset: {
        id: Chain.Cosmos,
        symbol: "ATOM",
        decimals: 6,
    },
    to_asset: {
        id: Chain.Osmosis,
        symbol: "OSMO",
        decimals: 6,
    },
    from_value: "1000000",
    referral_bps: 0,
    slippage_bps: 100,
};

describeIntegration("Squid live integration", () => {
    jest.setTimeout(60_000);

    let provider: import("./provider").SquidProvider;

    beforeAll(async () => {
        const integratorId = process.env.SQUID_INTEGRATOR_ID;
        if (!integratorId) {
            throw new Error("Missing required environment variable: SQUID_INTEGRATOR_ID");
        }
        const { SquidProvider } = await import("./provider");
        provider = new SquidProvider(integratorId);
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

        const routeData = quote.route_data as SquidRoute;
        expect(routeData.estimate.toAmount).toBe(quote.output_value);
        expect(routeData.estimate.toAmountMin).toBe(quote.output_min_value);
    });

    it("fetches quote_data for OSMO -> ATOM (MsgExecuteContract)", async () => {
        const quote = await provider.get_quote(OSMO_TO_ATOM_REQUEST);
        const data = await provider.get_quote_data(quote);

        expect(data.dataType).toBe("contract");
        expect(data.gasLimit).toBeTruthy();

        const msg = JSON.parse(data.data);
        expect(msg.typeUrl).toBe("/cosmwasm.wasm.v1.MsgExecuteContract");
        expect(msg.value.contract).toBeTruthy();
        expect(msg.value.sender).toBe(OSMOSIS_ADDRESS);
        console.log("OSMO->ATOM data:", JSON.stringify(msg, null, 2));
    });

    it("fetches quote_data for ATOM -> OSMO (MsgTransfer)", async () => {
        const quote = await provider.get_quote(ATOM_TO_OSMO_REQUEST);
        const data = await provider.get_quote_data(quote);

        expect(data.dataType).toBe("contract");
        expect(data.gasLimit).toBeTruthy();

        const msg = JSON.parse(data.data);
        expect(msg.typeUrl).toBe("/ibc.applications.transfer.v1.MsgTransfer");
        expect(msg.value.sourcePort).toBe("transfer");
        expect(typeof msg.value.timeoutTimestamp).toBe("string");
        console.log("ATOM->OSMO data:", JSON.stringify(msg, null, 2));
    });
});
