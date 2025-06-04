import BN from "bn.js";
import { bnReplacer, bnReviver } from "./bn_replacer";

describe('BN Replacer', () => {
    it('Test BN type conversion', () => {
        const bn = new BN(123456789);
        const object = {
            amountIn: bn,
        };
        const json = JSON.stringify(object, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.amountIn).toEqual(bn);
    });
});
