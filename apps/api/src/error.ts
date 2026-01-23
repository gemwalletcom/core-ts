import { SwapperError } from "@gemwallet/types";
import { Response } from "express";

type ErrorResponse = { type: string; message: string | object };
export type ProxyErrorResponse = { err: ErrorResponse } | { error: string };

export function errorResponse(err: SwapperError, rawError: unknown, structured: boolean): ProxyErrorResponse {
  const rawMessage = extractMessage(rawError);
  if (!structured) {
    return { error: rawMessage ?? ("message" in err ? err.message : undefined) ?? "Unknown error occurred" };
  }
  if (hasStringMessage(err)) {
    return { err: { type: err.type, message: rawMessage ?? err.message ?? "" } };
  }
  const { type, ...rest } = err;
  return { err: { type, message: rest } };
}

export function httpStatus(err: SwapperError): number {
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
    default:
      return 500;
  }
}

function extractMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

function hasStringMessage(err: SwapperError): err is Extract<SwapperError, { message: string }> {
  return err.type === "compute_quote_error" || err.type === "transaction_error";
}

export function sendErrorResponse(
  res: Response,
  swapperError: SwapperError,
  rawError: unknown,
  objectResponse: boolean
) {
  res.status(httpStatus(swapperError)).json(errorResponse(swapperError, rawError, objectResponse));
}
