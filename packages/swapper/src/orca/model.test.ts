import { OrcaSwapRouteData, type OrcaRouteDataType } from "./model";

describe("OrcaSwapRouteData", () => {
    const payload: OrcaRouteDataType = {
        poolAddress: "Pool123",
        inputMint: "MintIn",
        outputMint: "MintOut",
        amount: "1000",
        slippageBps: 100,
    };

    it("creates an instance from plain object", () => {
        const route = OrcaSwapRouteData.from(payload);
        expect(route.poolAddress).toBe(payload.poolAddress);
        expect(route.toObject()).toEqual(payload);
    });

    it("returns same instance when passing OrcaSwapRouteData to from()", () => {
        const original = OrcaSwapRouteData.create(payload);
        const result = OrcaSwapRouteData.from(original);
        expect(result).toBe(original);
    });

    it("throws when input is not an object", () => {
        expect(() => OrcaSwapRouteData.from(null)).toThrow("Invalid Orca route data");
    });
});
