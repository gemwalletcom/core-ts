import { QuoteData, QuoteRequest } from "@gemwallet/types";
import { Quote as MayanQuote, ReferrerAddresses, createSwapFromSuiMoveCalls } from "@mayanfinance/swap-sdk";
import { getReferrerAddresses } from "@gemwallet/types/src/referrer";
import { DevInspectResults, SuiClient } from "@mysten/sui/client";
import { BigIntMath } from "../bigint_math";

export const SUI_COIN_TYPE = "0x2::sui::SUI";

function getGasBudget(inspectResult: DevInspectResults) {
    const gasUsed = inspectResult.effects.gasUsed;
    const computationBudget = BigInt(gasUsed.computationCost);
    const storageBudget = BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
    const gasBudget = BigIntMath.max(computationBudget, computationBudget + storageBudget);

    return BigIntMath.increaseByPercent(gasBudget, 20);
}

export async function buildSuiQuoteData(request: QuoteRequest, routeData: MayanQuote, suiRpc: string): Promise<QuoteData> {
    const referrerAddresses = getReferrerAddresses() as ReferrerAddresses;
    const suiClient = new SuiClient({ url: suiRpc });

    const priceReq = suiClient.getReferenceGasPrice();
    const coinsReq = suiClient.getCoins({ owner: request.from_address, coinType: SUI_COIN_TYPE, limit: 100 });
    const suiTxReq = createSwapFromSuiMoveCalls(
        routeData,
        request.from_address,
        request.to_address,
        referrerAddresses, null,
        suiClient
    );

    try {
        const [coins, suiTx, gasPrice] = await Promise.all([coinsReq, suiTxReq, priceReq]);
        const coinRefs = coins.data.map(coin => {
            return {
                objectId: coin.coinObjectId,
                version: coin.version,
                digest: coin.digest,
            }
        });
        const inspectResult = await suiClient.devInspectTransactionBlock({
            transactionBlock: suiTx,
            sender: request.from_address,
        });

        if (inspectResult.error) {
            throw new Error(`Failed to estimate gas budget: ${inspectResult.error}`);
        }

        suiTx.setSender(request.from_address);
        suiTx.setGasPrice(gasPrice);
        suiTx.setGasBudget(getGasBudget(inspectResult));
        suiTx.setGasPayment(coinRefs);
        const data = await suiTx.build({ client: suiClient });

        return {
            to: "",
            value: "0",
            data: Buffer.from(data).toString("base64"),
        };
    } catch (error) {
        throw new Error(`Failed to build Sui transaction: ${error}`);
    }
}
