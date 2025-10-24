import { OrcaRouteData, type OrcaRouteDataType } from "./model";

describe("OrcaSwapRouteData", () => {
    const payload: OrcaRouteDataType = {
        poolAddress: "Pool123",
        inputMint: "MintIn",
        outputMint: "MintOut",
        amount: "1000",
        slippageBps: 100,
    };

    it("creates an instance from plain object", () => {
        const route = OrcaRouteData.from(payload);
        expect(route.poolAddress).toBe(payload.poolAddress);
        expect(route.toObject()).toEqual(payload);
    });

    it("returns same instance when passing OrcaSwapRouteData to from()", () => {
        const original = OrcaRouteData.create(payload);
        const result = OrcaRouteData.from(original);
        expect(result).toBe(original);
    });

    it("throws when input is not an object", () => {
        expect(() => OrcaRouteData.from(null)).toThrow("Invalid Orca route data");
    });
});
