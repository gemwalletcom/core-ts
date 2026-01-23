import { SwapperException } from "../error";
import { BigIntMath } from "../bigint_math";

export function toMayanError(error: unknown, decimals: number): Error {
    if (SwapperException.isSwapperException(error)) {
        return error;
    }

    const message = extractErrorMessage(error);
    if (message) {
        const minAmount = extractMinAmount(message, decimals);
        if (minAmount !== undefined) {
            return new SwapperException({
                type: "input_amount_error",
                min_amount: minAmount,
            });
        }
        return new Error(message);
    }

    if (error instanceof Error) {
        return error;
    }
    return new Error("Unknown Mayan error");
}

function extractMinAmount(message: string, decimals: number): string | null | undefined {
    if (!message.includes("Amount too small")) {
        return undefined;
    }
    const match = message.match(/~?([\d.]+)\s*\w+\)/);
    return match ? BigIntMath.parseDecimals(match[1], decimals).toString() : null;
}

function extractErrorMessage(error: unknown): string | undefined {
    const payloadMessage = extractPayloadMessage(error);
    if (payloadMessage) return payloadMessage;

    if (error instanceof Error && error.message) return error.message;
    return undefined;
}

function extractPayloadMessage(error: unknown): string | undefined {
    if (!error || typeof error !== "object") return undefined;

    const obj = error as Record<string, unknown>;
    return typeof obj.message === "string" ? obj.message : undefined;
}
