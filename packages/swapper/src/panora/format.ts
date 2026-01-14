import { BigIntMath } from "../bigint_math";

export function formatBpsAsPercent(bps: number): string {
    const rounded = Math.max(0, Math.round(bps));
    const whole = Math.floor(rounded / 100);
    const fraction = rounded % 100;

    if (fraction === 0) {
        return `${whole}`;
    }

    const fractionStr = fraction.toString().padStart(2, "0").replace(/0+$/, "");
    return `${whole}.${fractionStr}`;
}

export function normalizeAmount(value: string, decimals: number): string {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed.includes(".")) {
        return trimmed;
    }
    return BigIntMath.parseDecimals(trimmed, decimals).toString();
}

export function formatAmountForPanora(value: string, decimals: number): string {
    const raw = BigIntMath.parseString(value);
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
