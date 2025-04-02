import { parseUnits } from "ethers";

/**
 * Converts a decimal string or number from one decimal precision to another
 * @param value The decimal to convert
 * @param toDecimals The target number of decimals
 * @param fromDecimals The source number of decimals (default is 18)
 * @returns A BigInt with the converted value
 */
export function parseDecimals(value: string | number, toDecimals: number, fromDecimals = 18): BigInt {
    const parsedValue = parseUnits(value.toString(), fromDecimals);
    const decimalDiff = fromDecimals - toDecimals;

    if (decimalDiff > 0) {
        return BigInt(parsedValue) / BigInt(10) ** BigInt(decimalDiff);
    } else if (decimalDiff < 0) {
        return BigInt(parsedValue) * BigInt(10) ** BigInt(Math.abs(decimalDiff));
    }

    return BigInt(parsedValue);
}
