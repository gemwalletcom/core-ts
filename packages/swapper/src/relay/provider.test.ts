import { AssetId } from "@gemwallet/types";
import { Chain } from "@gemwallet/types";

import { RelayProvider } from "./provider";

describe("RelayProvider", () => {
    it("Test mapAssetIdToCurrency", () => {
        const provider = new RelayProvider();
        const assetId = new AssetId(Chain.Hyperliquid);

        expect(provider.mapAssetIdToCurrency(assetId)).toBe("0x0000000000000000000000000000000000000000");
    });
});
