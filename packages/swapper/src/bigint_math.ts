export class BigIntMath {
    /**
     * Converts a decimal string or number to the specified decimal precision
     * @param value The decimal to convert
     * @param toDecimals The target number of decimals
     * @returns A BigInt with the converted value
     */
    static parseDecimals(value: string | number, toDecimals: number): bigint {
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

    /**
     * Returns the maximum of two BigInt values
     * @param a The first BigInt value
     * @param b The second BigInt value
     * @returns The maximum of the two values
     */
    static max(a: bigint, b: bigint): bigint {
        return a > b ? a : b;
    }

    /**
     * Increases a BigInt value by a specified percentage
     * @param value The BigInt value to increase
     * @param percentage The percentage to increase by (e.g., 20 for 20%)
     * @returns The increased BigInt value
     */
    static increaseByPercent(value: bigint, percentage: number): bigint {
        if (percentage < 0) {
            throw new Error("Percentage must be non-negative");
        }
        const multiplier = BigInt(100 + percentage);
        return (value * multiplier) / BigInt(100);
    }
}
