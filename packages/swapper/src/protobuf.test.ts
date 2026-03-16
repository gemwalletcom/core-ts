import { Long } from "./protobuf";

describe("Long", () => {
    it("converts Long.js objects to uint64 strings", () => {
        expect(Long.toUint64({ low: -72998656, high: 412955876 })).toBe("1773631986332999936");
    });

    it("leaves plain values unchanged", () => {
        expect(Long.deepConvert(42)).toBe(42);
        expect(Long.deepConvert("hello")).toBe("hello");
    });

    it("recurses into nested objects", () => {
        const input = { a: { low: 1, high: 0 }, b: "keep" };
        expect(Long.deepConvert(input)).toEqual({ a: "1", b: "keep" });
    });
});
