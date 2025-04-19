import express from "express";
import { Quote, QuoteRequest, ReferralAddress, SwapProvider } from "@gemwallet/types";
import { StonfiProvider, Protocol, MayanProvider } from "@gemwallet/swapper";
import { SymbiosisProvider } from "@gemwallet/swapper/src/symbiosis";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const stonfiV2Provider = new StonfiProvider(process.env.TON_URL || "https://toncenter.com");

const providers: Record<string, Protocol> = {
    stonfi_v2: stonfiV2Provider,
    stonfiv2: stonfiV2Provider,
    mayan: new MayanProvider(
        process.env.SOLANA_URL || "https://solana-rpc.publicnode.com",
        process.env.SUI_URL || "https://fullnode.mainnet.sui.io"
    ),
    symbiosis: new SymbiosisProvider(process.env.TRON_URL || "https://api.trongrid.io"),
};

app.get('/:providerId/quote', async (req, res) => {
    const providerId = req.params.providerId;
    const provider = providers[providerId];

    if (!provider) {
        res.status(404).json({ error: `Provider ${providerId} not found` });
        return;
    }

    try {
        // Construct ReferralAddress based on legacy parameter and provider
        let referralAddress: string = '';
        const legacyReferralAddr = req.query.referral_address as string | undefined;
        if (legacyReferralAddr) {
            if (providerId === SwapProvider.StonFiV2) {
                referralAddress = legacyReferralAddr;
            } else if (providerId === SwapProvider.Mayan) {
                referralAddress = legacyReferralAddr;
            }
        }

        // Construct QuoteRequest using legacy query parameters
        const request: QuoteRequest = {
            from_address: req.query.from_address as string,
            to_address: req.query.to_address as string,
            from_asset: {
                asset_id: req.query.from_asset as string,
                decimals: parseInt(req.query.from_asset_decimals as string) || 0,
                symbol: "",
            },
            to_asset: {
                asset_id: req.query.to_asset as string,
                decimals: parseInt(req.query.to_asset_decimals as string) || 0,
                symbol: "",
            },
            from_value: req.query.from_value as string,
            referral: {
                address: {
                    evm: referralAddress,
                    solana: referralAddress,
                    sui: referralAddress,
                    ton: referralAddress,
                    tron: referralAddress,
                },
                bps: parseInt(req.query.referral_bps as string) || 0,
            },
            slippage_bps: parseInt(req.query.slippage_bps as string) || 0,
        };

        const quote = await provider.get_quote(request);
        res.json(quote);
    } catch (error) {
        console.log(`Error fetching quote for provider ${providerId}:`, error);
        console.log("Request query:", req.query);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});

app.post('/:providerId/quote', async (req, res) => {
    const providerId = req.params.providerId;
    const provider = providers[providerId];

    if (!provider) {
        res.status(404).json({ error: `Provider ${providerId} not found` });
        return;
    }

    try {
        const request: QuoteRequest = req.body;

        const quote = await provider.get_quote(request);
        res.json(quote);
    } catch (error) {
        console.log("Error fetching quote via POST:", error);
        console.log("Request body:", req.body);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});

app.post('/:providerId/quote_data', async (req, res) => {
    const providerId = req.params.providerId;
    const provider = providers[providerId];

    if (!provider) {
        res.status(404).json({ error: `Provider ${providerId} not found` });
        return;
    }
    const quote_request = req.body as Quote;

    try {

        const quote = await provider.get_quote_data(quote_request);
        res.json(quote);
    } catch (error) {
        console.log("quote_request", quote_request);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}!`);
});
