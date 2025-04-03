/**
 * Converts a decimal string or number to the specified decimal precision
 * @param value The decimal to convert
 * @param toDecimals The target number of decimals
 * @returns A BigInt with the converted value
 */
export function parseDecimals(value: string | number, toDecimals: number): bigint {
    const stringValue = value.toString();
    const decimalParts = stringValue.split('.');

    // Handle decimal numbers
    if (decimalParts[1]) {
        const decimals = decimalParts[1];
        const actualDecimals = decimals.length;
        const wholeNumberPart = decimalParts[0];

        // Remove decimal point
        const integerPart = wholeNumberPart === '0' ? '' : wholeNumberPart;
        const fullInteger = `${integerPart}${decimals}`;

        // Convert to target decimals
        const decimalDiff = actualDecimals - toDecimals;
        if (decimalDiff > 0) {
            // Need to remove some decimals (round down)
            return BigInt(fullInteger) / BigInt(10 ** decimalDiff);
        } else if (decimalDiff < 0) {
            // Need to add more decimals
            return BigInt(fullInteger) * BigInt(10 ** Math.abs(decimalDiff));
        }
        return BigInt(fullInteger);
    }

    // Handle whole numbers
    return BigInt(decimalParts[0]) * BigInt(10 ** toDecimals);
}
