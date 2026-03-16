interface LongValue {
    low: number;
    high: number;
}

function isLong(v: unknown): v is LongValue {
    return typeof v === "object" && v !== null && "low" in v && "high" in v;
}

export const Long = {
    toUint64(l: LongValue): string {
        const low = l.low >>> 0;
        const high = l.high >>> 0;
        return (BigInt(high) * BigInt(0x100000000) + BigInt(low)).toString();
    },

    deepConvert(obj: unknown): unknown {
        if (isLong(obj)) return this.toUint64(obj);
        if (Array.isArray(obj)) return obj.map((v) => this.deepConvert(v));
        if (typeof obj === "object" && obj !== null) {
            return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, this.deepConvert(v)]));
        }
        return obj;
    },
};
