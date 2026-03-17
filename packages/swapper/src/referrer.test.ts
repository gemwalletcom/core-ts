import { AssetId, Chain } from "@gemwallet/types";

import { isPreferredFeeToken } from "./referrer";
import { SOLANA_USDC_MINT } from "./testkit/mock";

describe("isPreferredFeeToken", () => {
    it("returns true for native asset", () => {
        expect(isPreferredFeeToken(new AssetId(Chain.Solana), "SOL")).toBe(true);
    });

    it("returns true for USD token", () => {
        expect(isPreferredFeeToken(new AssetId(Chain.Solana, SOLANA_USDC_MINT), "USDC")).toBe(true);
    });

    it("returns true for USDT token", () => {
        expect(isPreferredFeeToken(new AssetId(Chain.Solana, "mint1"), "USDT")).toBe(true);
    });

    it("returns false for non-native non-USD token", () => {
        expect(isPreferredFeeToken(new AssetId(Chain.Solana, "mint1"), "BONK")).toBe(false);
    });
});
