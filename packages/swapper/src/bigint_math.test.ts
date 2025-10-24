import { BigIntMath } from "./bigint_math";

describe("BigIntMath.parseDecimals", () => {
    const testCases = [
        {
            input: "0.1384511931777",
            decimals: 9,
            expected: "138451193",
        },
        {
            input: "0.13641535",
            decimals: 9,
            expected: "136415350",
        },
        {
            input: "0.0057851694487099925",
            decimals: 18,
            expected: "5785169448709992",
        },
        {
            input: "0.0057851694487099925",
            decimals: 9,
            expected: "5785169",
        },
        {
            input: "12.786941452973945",
            decimals: 18,
            expected: "12786941452973945000",
        },
        {
            input: "1000",
            decimals: 6,
            expected: "1000000000",
        },
        {
            input: "1.00",
            decimals: 0,
            expected: "1",
        },
    ];

    it.each(testCases)("parses $input with $decimals decimals to $expected", ({ input, decimals, expected }) => {
        const result = BigIntMath.parseDecimals(input, decimals);
        expect(result.toString()).toEqual(expected);
    });
});

describe("BigIntMath.parseString", () => {
    it.each([
        { value: "1", expected: 1n },
        { value: "0010", expected: 10n },
        { value: "  5000  ", expected: 5000n },
    ])("parses valid value $value to bigint $expected", ({ value, expected }) => {
        expect(BigIntMath.parseString(value)).toBe(expected);
    });

    it.each([
        { value: "", message: "Amount must be a valid integer string" },
        { value: " ", message: "Amount must be a valid integer string" },
        { value: "0", message: "Amount must be greater than zero" },
        { value: "-1", message: "Amount must be greater than zero" },
        { value: "1.5", message: "Amount must be a valid integer string" },
        { value: "abc", message: "Amount must be a valid integer string" },
    ])("throws for invalid value $value", ({ value, message }) => {
        expect(() => BigIntMath.parseString(value)).toThrow(message);
    });
});
