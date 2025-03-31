import express, { Request, Response } from "express";
import { QuoteDataRequest, Quote, QuoteRequest, Asset } from "@swap-providers/types";
import { StonfiProvider } from "@swap-providers/swapper";
import { Protocol } from "@swap-providers/swapper";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const providers: Record<string, Protocol> = {
    stonfi_v2: new StonfiProvider(process.env.TON_URL || "https://toncenter.com"),
};

app.get('/:providerId/quote', async (req, res) => {
    const provider = providers[req.params.providerId];
    
    if (!provider) {
        res.status(404).json({ error: `Provider ${req.params.providerId} not found` });
    }

    try {
        let request: QuoteRequest = {
            from_address: req.query.from_address as string,
            from_asset: req.query.from_asset as string,
            to_asset: req.query.to_asset as string,
            from_value: req.query.from_value as string,
            referral_address: req.query.referral_address as string,
            referral_bps: parseInt(req.query.referral_bps as string),
            slippage_bps: parseInt(req.query.slippage_bps as string),
        };

        console.log("request: ", req.query);
        const quote = await provider.get_quote(request);
        res.json(quote);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});

app.post('/:providerId/quote_data', async (req, res) => {
    const provider = providers[req.params.providerId];
    console.log(req.query);
    
    if (!provider) {
        res.status(404).json({ error: `Provider ${req.params.providerId} not found` });
    }
    const quote_request = req.body as Quote;

    console.log("quote_request", quote_request);

    try {
        const quote = await provider.get_quote_data(quote_request);
        res.json(quote);
    } catch (error) {
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