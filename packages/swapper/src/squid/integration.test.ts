// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../../.env" });

import { BigIntMath } from "../bigint_math";
import { timedPromise } from "../debug";
import { SQUID_ATOM_TO_OSMO_REQUEST, SQUID_OSMO_TO_ATOM_REQUEST, OSMOSIS_TEST_ADDRESS } from "../testkit/mock";
import type { SquidRoute } from "./model";

const runIntegration = process.env.INTEGRATION_TEST === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

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
        const quote = await timedPromise("squid quote OSMO->ATOM", provider.get_quote(SQUID_OSMO_TO_ATOM_REQUEST));

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
        const quote = await provider.get_quote(SQUID_OSMO_TO_ATOM_REQUEST);
        const data = await provider.get_quote_data(quote);

        expect(data.dataType).toBe("contract");
        expect(data.gasLimit).toBeTruthy();

        const msg = JSON.parse(data.data);
        expect(msg.typeUrl).toBe("/cosmwasm.wasm.v1.MsgExecuteContract");
        expect(msg.value.contract).toBeTruthy();
        expect(msg.value.sender).toBe(OSMOSIS_TEST_ADDRESS);
        console.log("OSMO->ATOM data:", JSON.stringify(msg, null, 2));
    });

    it("fetches quote_data for ATOM -> OSMO (MsgTransfer)", async () => {
        const quote = await provider.get_quote(SQUID_ATOM_TO_OSMO_REQUEST);
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
