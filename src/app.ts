import express, { Request, Response } from "express";
import { QuoteDataRequest, Quote, QuoteRequest} from "./types";
import { StonfiProvider } from "./providers/stonfi";
import { Protocol } from "./providers/protocol";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const providers: Record<string, Protocol> = {
    stonfi: new StonfiProvider(),
};

app.get('/v1/:providerId/quote', async (req, res) => {
    const provider = providers[req.params.providerId];
    
    if (!provider) {
        res.status(404).json({ error: `Provider ${req.params.providerId} not found` });
    }

    let request: QuoteRequest =  {
        from_address: req.query.from_address as string,
        from_token: req.query.from_token as string,
        to_token: req.query.to_token as string,
        from_value: req.query.from_value as string,
        referral_address: req.query.referral_address as string,
        referral_bps: parseInt(req.query.referral_bps as string),
        slippage_bps: parseInt(req.query.slippage_bps as string),
    };

    console.log("request: ", req.query);

    try {
        const quote = await provider.get_quote(request);
        res.json(quote);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/v1/:providerId/quote_data', async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}!`);
});

