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

    /**
     * Converts a raw integer value to a decimal string representation
     * @param value The raw integer value (as string or bigint)
     * @param decimals The number of decimal places
     * @returns A decimal string (e.g., "10.5" for value=10500000, decimals=6)
     */
    static formatDecimals(value: string | bigint, decimals: number): string {
        const raw = typeof value === "string" ? BigInt(value) : value;
        if (decimals <= 0) {
            return raw.toString();
        }

        const divisor = BigInt(10) ** BigInt(decimals);
        const whole = raw / divisor;
        const fraction = raw % divisor;
        if (fraction === BigInt(0)) {
            return whole.toString();
        }

        const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
        return `${whole.toString()}.${fractionStr}`;
    }

    /**
     * Converts basis points to a percentage string
     * @param bps Basis points (100 bps = 1%)
     * @returns Percentage string (e.g., 150 bps -> "1.5")
     */
    static bpsToPercent(bps: number): string {
        return (bps / 100).toString();
    }

    static parseString(value: string): bigint {
        const normalized = value.trim();
        if (normalized.length === 0) {
            throw new Error("Amount must be a valid integer string");
        }

        let parsed: bigint;
        try {
            parsed = BigInt(normalized);
        } catch {
            throw new Error("Amount must be a valid integer string");
        }

        if (parsed <= BigInt(0)) {
            throw new Error("Amount must be greater than zero");
        }

        return parsed;
    }
}
