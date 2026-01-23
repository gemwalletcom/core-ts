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
    const match = message.match(/~?(\d+(?:\.\d+)?)\s*\w+\)/);
    return match ? BigIntMath.parseDecimals(match[1], decimals).toString() : null;
}

function extractErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error) {
        return typeof error.message === "string" ? error.message : undefined;
    }
    return undefined;
}
