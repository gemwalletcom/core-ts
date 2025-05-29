import BN from "bn.js";

const bnFields = new Set(["amountIn", "amountOut"]);

export function bnReplacer(key: string, val: any) {
    if (bnFields.has(key)) {
        return new BN(val, "hex").toString(10);
    }
    return val;
}

export function bnReviver(key: string, val: any) {
    if (bnFields.has(key)) {
        return new BN(val, 10);
    }
    return val;
}
