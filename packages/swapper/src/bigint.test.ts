import { parseDecimals } from "./bigint";

describe('BigInt parseDecimals tests', () => {
    const testCases = [
        {
            input: "0.1384511931777",
            decimals: 9,
            expected: "138451193"
        },
        {
            input: "0.13641535",
            decimals: 9,
            expected: "136415350"
        },
        {
            input: "0.0057851694487099925",
            decimals: 18,
            expected: "5785169448709992"
        },
        {
            input: "0.0057851694487099925",
            decimals: 9,
            expected: "5785169"
        },
        {
            input: "12.786941452973945",
            decimals: 18,
            expected: "12786941452973945000"
        },
        {
            input: "1000",
            decimals: 6,
            expected: "1000000000"
        },
        {
            input: "1.00",
            decimals: 0,
            expected: "1"
        }
    ];

    it.each(testCases)('parses $input with $decimals decimals to $expected', ({ input, decimals, expected }) => {
        const result = parseDecimals(input, decimals);
        expect(result.toString()).toEqual(expected);
    });
});
