import BN from "bn.js";
import { bnReplacer, bnReviver } from "./bn_replacer";

describe('BN Replacer', () => {
    it('Test BN type conversion for amountIn', () => {
        const bn = new BN(123456789);
        const object = {
            amountIn: bn,
        };
        const json = JSON.stringify(object, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.amountIn).toEqual(bn);
        expect(parsed.amountIn).toBeInstanceOf(BN);
    });

    it('Test BN type conversion for amountOut', () => {
        const bn = new BN('3b9aca00', 16);
        const object = {
            amountOut: bn,
        };
        const json = JSON.stringify(object, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.amountOut).toEqual(bn);
        expect(parsed.amountOut).toBeInstanceOf(BN);
    });

    it('Test Map serialization and deserialization', () => {
        const map = new Map([
            ['aggregator_v3', '0x07c27e879ba9282506284b0fef26d393978906fc9496550d978c6f493dbfa3e5']
        ]);
        const object = {
            packages: map,
        };
        const json = JSON.stringify(object, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.packages).toEqual(map);
        expect(parsed.packages).toBeInstanceOf(Map);
        expect(parsed.packages.get('aggregator_v3')).toBe('0x07c27e879ba9282506284b0fef26d393978906fc9496550d978c6f493dbfa3e5');
    });

    it('Test complex object with both BN and Map', () => {
        const amountIn = new BN('3b9aca00', 16);
        const amountOut = new BN('32987a', 16);
        const packages = new Map([
            ['aggregator_v3', '0x07c27e879ba9282506284b0fef26d393978906fc9496550d978c6f493dbfa3e5']
        ]);
        
        const routeData = {
            amountIn,
            amountOut,
            packages,
            byAmountIn: true,
        };

        const json = JSON.stringify(routeData, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.amountIn).toEqual(amountIn);
        expect(parsed.amountOut).toEqual(amountOut);
        expect(parsed.packages).toEqual(packages);
        expect(parsed.packages).toBeInstanceOf(Map);
        expect(parsed.byAmountIn).toBe(true);
    });

    it('Test empty Map serialization', () => {
        const emptyMap = new Map();
        const object = {
            packages: emptyMap,
        };
        const json = JSON.stringify(object, bnReplacer);
        const parsed = JSON.parse(json, bnReviver);

        expect(parsed.packages).toEqual(emptyMap);
        expect(parsed.packages).toBeInstanceOf(Map);
        expect(parsed.packages.size).toBe(0);
    });
});
