import path from "node:path";
import dotenv from "dotenv";
import express from "express";

import { Quote, QuoteRequest, SwapperError, SwapQuoteData } from "@gemwallet/types";
import { StonfiProvider, Protocol, MayanProvider, CetusAggregatorProvider, RelayProvider, OrcaWhirlpoolProvider, PanoraProvider, SwapperException } from "@gemwallet/swapper";
import versionInfo from "./version.json";

if (process.env.NODE_ENV !== "production") {
    const rootEnvPath = path.resolve(__dirname, "../../..", ".env");
    dotenv.config({ path: rootEnvPath, override: false });
}

type ProxyResponse<T> = { ok: T } | { err: SwapperError } | { error: string };
type ProviderRequest = express.Request & { provider?: Protocol; objectResponse?: boolean };

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
    panora: new PanoraProvider({ rpcUrl: process.env.APTOS_URL }),
};

app.get("/", (_, res) => {
  res.json({
    providers: Object.keys(providers),
    version: versionInfo.version,
    commit: versionInfo.commit,
  });
});

app.post("/:providerId/quote", withProvider, async (req: ProviderRequest, res) => {
  const provider = req.provider!;
  const objectResponse = req.objectResponse!;
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
      console.debug("Request metadata:", { providerId: req.params.providerId, hasBody: Boolean(req.body) });
    }
    const swapperError = SwapperException.isSwapperException(error)
      ? error.swapperError
      : { type: "compute_quote_error" as const, message: "" };
    res.status(httpStatus(swapperError)).json(errorResponse(swapperError, error, objectResponse));
  }
});

app.post("/:providerId/quote_data", withProvider, async (req: ProviderRequest, res) => {
  const provider = req.provider!;
  const objectResponse = req.objectResponse!;
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
      console.debug("Quote metadata:", { providerId: req.params.providerId, hasQuote: Boolean(quote_request) });
    }
    const swapperError = SwapperException.isSwapperException(error)
      ? error.swapperError
      : { type: "transaction_error" as const, message: "" };
    res.status(httpStatus(swapperError)).json(errorResponse(swapperError, error, objectResponse));
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

function httpStatus(err: SwapperError): number {
  switch (err.type) {
    case "input_amount_error":
    case "not_supported_chain":
    case "not_supported_asset":
    case "invalid_route":
      return 400;
    case "no_available_provider":
    case "no_quote_available":
      return 404;
    case "compute_quote_error":
    case "transaction_error":
      return 500;
  }
}

function withProvider(req: ProviderRequest, res: express.Response, next: express.NextFunction) {
  const providerId = req.params.providerId as string;
  const provider = providers[providerId];
  const version = parseVersion(req.query.v);
  const objectResponse = version >= API_VERSION;

  if (!provider) {
    res.status(404).json(errorResponse({ type: "no_available_provider" }, `Provider ${providerId} not found`, objectResponse));
    return;
  }

  req.provider = provider;
  req.objectResponse = objectResponse;
  next();
}
