import path from "node:path";
import dotenv from "dotenv";
import express from "express";

import { Quote, QuoteRequest, SwapperError, SwapQuoteData } from "@gemwallet/types";
import { StonfiProvider, Protocol, MayanProvider, CetusAggregatorProvider, RelayProvider, OrcaWhirlpoolProvider } from "@gemwallet/swapper";

if (process.env.NODE_ENV !== "production") {
    const rootEnvPath = path.resolve(__dirname, "../../..", ".env");
    dotenv.config({ path: rootEnvPath, override: false });
}

type ProxyResponse<T> = { ok: T } | { err: SwapperError } | { error: string };

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json());

const solanaRpc = process.env.SOLANA_URL || "https://solana-rpc.publicnode.com";
const API_VERSION = 1;

const providers: Record<string, Protocol> = {
    stonfi_v2: new StonfiProvider(process.env.TON_URL || "https://toncenter.com"),
    mayan: new MayanProvider(
        solanaRpc,
        process.env.SUI_URL || "https://fullnode.mainnet.sui.io"
    ),
    cetus: new CetusAggregatorProvider(process.env.SUI_URL || "https://fullnode.mainnet.sui.io"),
    relay: new RelayProvider(),
    orca: new OrcaWhirlpoolProvider(solanaRpc),
};

app.get("/", (_, res) => {
  res.json({
    providers: Object.keys(providers),
    version: process.env.npm_package_version,
  });
});

app.post("/:providerId/quote", async (req, res) => {
  const providerId = req.params.providerId;
  const provider = providers[providerId];
  const version = parseVersion(req.query.v);
  const objectResponse = version >= API_VERSION;

  if (!provider) {
    res.status(404).json(errorResponse({ type: "no_available_provider" }, `Provider ${providerId} not found`, objectResponse));
    return;
  }

  try {
    const request: QuoteRequest = req.body;

    const quote = await provider.get_quote(request);
    if (objectResponse) {
      res.json({ ok: quote } satisfies ProxyResponse<Quote>);
    } else {
      res.json(quote);
    }
  } catch (error) {
    if (!isProduction) {
      console.error("Error fetching quote via POST:", error);
      console.debug("Request metadata:", { providerId, hasBody: Boolean(req.body) });
    }
    res.status(500).json(errorResponse({ type: "compute_quote_error", message: "" }, error, objectResponse));
  }
});

app.post("/:providerId/quote_data", async (req, res) => {
  const providerId = req.params.providerId;
  const provider = providers[providerId];
  const version = parseVersion(req.query.v);
  const objectResponse = version >= API_VERSION;

  if (!provider) {
    res.status(404).json(errorResponse({ type: "no_available_provider" }, `Provider ${providerId} not found`, objectResponse));
    return;
  }
  const quote_request = req.body as Quote;

  try {

    const quote = await provider.get_quote_data(quote_request);
    if (objectResponse) {
      res.json({ ok: quote } satisfies ProxyResponse<SwapQuoteData>);
    } else {
      res.json(quote);
    }
  } catch (error) {
    if (!isProduction) {
      console.error("Error fetching quote data:", error);
      console.debug("Quote metadata:", { providerId, hasQuote: Boolean(quote_request) });
    }
    res.status(500).json(errorResponse({ type: "transaction_error", message: "" }, error, objectResponse));
  }
});

app.listen(PORT, () => {
  console.log(`swapper api is running on port ${PORT}.`);
});

function errorResponse(err: SwapperError, rawError: unknown, structured: boolean): ProxyResponse<never> {
  const message = extractMessage(rawError) ?? ("message" in err ? err.message : undefined);
  if (!structured) {
    return { error: message ?? "Unknown error occurred" };
  }
  if (isMessageError(err)) {
    return { err: { ...err, message: message ?? err.message ?? "" } };
  }
  return { err };
}

function parseVersion(raw: unknown): number {
  const num = typeof raw === "string" ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN;
  return Number.isFinite(num) ? num : 0;
}

function extractMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

function isMessageError(err: SwapperError): err is Extract<SwapperError, { message: string }> {
  return err.type === "compute_quote_error" || err.type === "transaction_error";
}
