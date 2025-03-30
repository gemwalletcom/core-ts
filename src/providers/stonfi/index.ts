import { TonClient, toNano } from "@ton/ton";
import { DEX, pTON } from "@ston-fi/sdk";
import { StonApiClient } from '@ston-fi/api';
import { QuoteRequest, Quote, QuoteData, Chain } from "../../types";
import { Protocol } from "../protocol";

const client = new StonApiClient();

const TON_JETTON_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

const dexRouter = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC"
}).open(DEX.v2_2.Router.create(
        "EQCx0HDJ_DxLxDSQyfsEqHI8Rs65nygvdmeD9Ra7rY15OWN8")
);

const proxyTon = pTON.v2_1.create(
    "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S"
);

export class StonfiProvider implements Protocol {
    async get_quote(quoteRequest: QuoteRequest): Promise<Quote> {
        const swapDirectSimulation = await client.simulateSwap({ 
            offerAddress: quoteRequest.from_token, 
            offerUnits: quoteRequest.from_value, 
            askAddress: quoteRequest.to_token, 
            //referralAddress: quoteRequest.referral_address, 
            //referralFeeBps: quoteRequest.referral_bps.toString(), 
            slippageTolerance: (quoteRequest.slippage_bps / 10000).toString(),
        });

        console.log("swapDirectSimulation", swapDirectSimulation);

        return {
            quote: quoteRequest,
            output_value: swapDirectSimulation.askUnits,
            output_min_value: swapDirectSimulation.minAskUnits,
        }
    }

    async get_quote_data(quote: Quote): Promise<QuoteData> {
        // from ton to jetton
        if (quote.quote.from_token == TON_JETTON_ADDRESS) {
            const params = await dexRouter.getSwapTonToJettonTxParams({
                userWalletAddress: quote.quote.from_address,
                proxyTon,
                offerAmount: quote.quote.from_value,
                askJettonAddress: quote.quote.to_token,
                minAskAmount: quote.output_min_value,
                //referralAddress: quote.quote.referral_address,
                //referralValue: quote.quote.referral_bps,
            });
            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        } else if (quote.quote.to_token == TON_JETTON_ADDRESS) {
            const params = await dexRouter.getSwapJettonToTonTxParams({
                userWalletAddress: quote.quote.from_address,
                proxyTon,
                offerJettonAddress: quote.quote.from_token,
                offerAmount: quote.quote.from_value,
                minAskAmount: quote.quote.from_value,
                //referralAddress: quote.quote.referral_address,
                //referralValue: quote.quote.referral_bps,
            });
            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        } else if (quote.quote.to_token !== TON_JETTON_ADDRESS) {
            const params = await dexRouter.getSwapJettonToJettonTxParams({
                userWalletAddress: quote.quote.from_address,
                offerJettonAddress: quote.quote.from_token,
                offerAmount: quote.quote.from_value,
                askJettonAddress: quote.quote.to_token,
                minAskAmount: quote.quote.from_value,
                //referralAddress: quote.quote.referral_address,
                //referralValue: quote.quote.referral_bps, 
            });
            return {
                to: params.to.toString(), 
                value: params.value.toString(), 
                data: params.body.toBoc().toString('base64') 
            }; 
        }
    }
}
