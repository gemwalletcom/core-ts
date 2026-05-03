const MAX_DECIMALS = 32;

function decimalScale(decimals: number): bigint {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
        throw new Error(`Decimals must be an integer between 0 and ${MAX_DECIMALS}`);
    }

    return BigInt(10) ** BigInt(decimals);
}

export class BigIntMath {
    static parseDecimals(value: string | number, toDecimals: number): bigint {
        const scale = decimalScale(toDecimals);
        const stringValue = value.toString();
        const decimalParts = stringValue.split(".");

        if (decimalParts[1]) {
            const decimals = decimalParts[1];
            const actualDecimals = decimals.length;
            const wholeNumberPart = decimalParts[0];

            const integerPart = wholeNumberPart === "0" ? "" : wholeNumberPart;
            const fullInteger = `${integerPart}${decimals}`;

            const decimalDiff = actualDecimals - toDecimals;
            if (decimalDiff > 0) {
                const truncated = fullInteger.slice(0, -decimalDiff);
                return truncated === "" || truncated === "-" ? BigInt(0) : BigInt(truncated);
            } else if (decimalDiff < 0) {
                return BigInt(fullInteger) * decimalScale(Math.abs(decimalDiff));
            }
            return BigInt(fullInteger);
        }

        return BigInt(decimalParts[0]) * scale;
    }

    static max(a: bigint, b: bigint): bigint {
        return a > b ? a : b;
    }

    static increaseByPercent(value: bigint, percentage: number): bigint {
        if (percentage < 0) {
            throw new Error("Percentage must be non-negative");
        }
        const multiplier = BigInt(100 + percentage);
        return (value * multiplier) / BigInt(100);
    }

    static formatDecimals(value: string | bigint, decimals: number): string {
        const divisor = decimalScale(decimals);
        const raw = typeof value === "string" ? BigInt(value) : value;
        if (decimals === 0) {
            return raw.toString();
        }

        const whole = raw / divisor;
        const fraction = raw % divisor;
        if (fraction === BigInt(0)) {
            return whole.toString();
        }

        let fractionStr = fraction.toString().padStart(decimals, "0");
        while (fractionStr.endsWith("0")) {
            fractionStr = fractionStr.slice(0, -1);
        }

        return `${whole.toString()}.${fractionStr}`;
    }

    static bpsToPercent(bps: number): string {
        return (bps / 100).toString();
    }

    static applySlippage(value: string, bps: number): string {
        return ((BigInt(value) * BigInt(10000 - bps)) / BigInt(10000)).toString();
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
