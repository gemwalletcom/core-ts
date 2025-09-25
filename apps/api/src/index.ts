import express from "express";

import { Quote, QuoteRequest, DEFAULT_NODES } from "@gemwallet/types";
import { StonfiProvider, Protocol, MayanProvider, SymbiosisProvider, CetusAggregatorProvider, RelayProvider, NearIntentsProvider } from "@gemwallet/swapper";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const providers: Record<string, Protocol> = {
    stonfi_v2: new StonfiProvider(process.env.TON_URL || DEFAULT_NODES.TON_RPC),
    mayan: new MayanProvider(
        process.env.SOLANA_URL || DEFAULT_NODES.SOLANA,
        process.env.SUI_URL || DEFAULT_NODES.SUI
    ),
    symbiosis: new SymbiosisProvider(process.env.TRON_URL || DEFAULT_NODES.TRON),
    cetus: new CetusAggregatorProvider(process.env.SUI_URL || DEFAULT_NODES.SUI),
    relay: new RelayProvider(),
    near_intents: new NearIntentsProvider(
        process.env.NEAR_INTENT_URL || DEFAULT_NODES.NEAR_INTENT,
        process.env.NEAR_INTENT_API_TOKEN,
        process.env.SOLANA_URL || DEFAULT_NODES.SOLANA,
        process.env.SUI_URL || DEFAULT_NODES.SUI
    ),
};

app.get('/', (_, res) => {
    res.json({
        providers: Object.keys(providers),
        version: process.env.npm_package_version
    });
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
        console.error("Error fetching quote:", error instanceof Error ? error.message : error);
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
        console.error("Error fetching quote data:", error instanceof Error ? error.message : error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`swapper api is running on port ${PORT}.`);
});
