import BN from "bn.js";

const bnFields = new Set(["amountIn", "amountOut"]);

export function bnReplacer(key: string, val: any) {
    if (bnFields.has(key) && val instanceof BN) {
        return val.toString(16);
    }
    if (val instanceof Map) {
        return { __map: Array.from(val.entries()) };
    }
    return val;
}

export function bnReviver(key: string, val: any) {
    if (bnFields.has(key) && typeof val === 'string') {
        return new BN(val, 16);
    }
    if (val && typeof val === 'object' && val.__map && Array.isArray(val.__map)) {
        return new Map(val.__map);
    }
    return val;
}