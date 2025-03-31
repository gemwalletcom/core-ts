import { TonClient, toNano } from "@ton/ton";
import { DEX, pTON } from "@ston-fi/sdk";
import { StonApiClient } from '@ston-fi/api';
import { QuoteRequest, Quote, QuoteData, Chain, Asset } from "../../types";
import { Protocol } from "../protocol";

const client = new StonApiClient();

const TON_JETTON_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

const proxyTon = pTON.v2_1.create(
    "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S"
);

function getTokenAddress(asset: Asset): string {
    return asset.isNative() ? TON_JETTON_ADDRESS : asset.tokenId;
}

export class StonfiProvider implements Protocol {
    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const fromAsset = Asset.fromString(quoteRequest.from_asset.toString())
        const toAsset = Asset.fromString(quoteRequest.to_asset.toString())

        const swapDirectSimulation = await client.simulateSwap({ 
            offerAddress: getTokenAddress(fromAsset),
            offerUnits: quoteRequest.from_value, 
            askAddress: getTokenAddress(toAsset), 
            slippageTolerance: (quoteRequest.slippage_bps / 10000).toString(),
            referralAddress: quoteRequest.referral_address,
            referralFeeBps: quoteRequest.referral_bps.toString(),
        });

        console.log("swapDirectSimulation", swapDirectSimulation);

        return {
            quote: quoteRequest,
            output_value: swapDirectSimulation.askUnits,
            output_min_value: swapDirectSimulation.minAskUnits,
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        const fromAsset = Asset.fromString(quote.quote.from_asset.toString())
        const toAsset = Asset.fromString(quote.quote.to_asset.toString())
        const fromTokenAdddress = getTokenAddress(fromAsset)
        const toTokenAddress = getTokenAddress(toAsset)

        let pools = await client.getPoolsByAssetPair({
            asset0Address: fromTokenAdddress, 
            asset1Address: toTokenAddress
        });
        const [pool] = pools || [];
        if (!pool) throw new Error("No liquidity pools found for token pair");
        
        console.log("pool", pool);

        const dexRouter = new TonClient({
            endpoint: "https://toncenter.com/api/v2/jsonRPC"
        }).open(DEX.v2_2.Router.create(pool.routerAddress));

        // from ton to jetton
        if (fromAsset.isNative()) {
            const params = await dexRouter.getSwapTonToJettonTxParams({
                userWalletAddress: quote.quote.from_address,
                proxyTon,
                offerAmount: quote.quote.from_value,
                askJettonAddress: toTokenAddress,
                minAskAmount: quote.output_min_value,
                deadline: Math.floor(Date.now() / 1000) + 60 * 1000,
                referralAddress: quote.quote.referral_address,
                referralValue: quote.quote.referral_bps,
            });

            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        } else if (toAsset.isNative()) {
            const params = await dexRouter.getSwapJettonToTonTxParams({
                userWalletAddress: quote.quote.from_address,
                proxyTon,
                offerJettonAddress: fromTokenAdddress,
                offerAmount: quote.quote.from_value,
                minAskAmount: quote.output_min_value,
                referralAddress: quote.quote.referral_address,
                referralValue: quote.quote.referral_bps,
            });

            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        } else {
            const params = await dexRouter.getSwapJettonToJettonTxParams({
                userWalletAddress: quote.quote.from_address,
                offerJettonAddress: fromTokenAdddress,
                offerAmount: quote.quote.from_value,
                askJettonAddress: toTokenAddress,
                minAskAmount: quote.output_min_value,
                referralAddress: quote.quote.referral_address,
                referralValue: quote.quote.referral_bps,
            });

            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        }
    }
}
