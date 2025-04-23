import express from "express";
import { Quote, QuoteRequest } from "@gemwallet/types";
import { StonfiProvider, Protocol, MayanProvider, SymbiosisProvider } from "@gemwallet/swapper";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const providers: Record<string, Protocol> = {
    stonfi_v2: new StonfiProvider(process.env.TON_URL || "https://toncenter.com"),
    mayan: new MayanProvider(
        process.env.SOLANA_URL || "https://solana-rpc.publicnode.com",
        process.env.SUI_URL || "https://fullnode.mainnet.sui.io"
    ),
    symbiosis: new SymbiosisProvider(process.env.TRON_URL || "https://api.trongrid.io"),
};

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
