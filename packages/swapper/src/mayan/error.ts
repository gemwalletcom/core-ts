export enum MayanErrorCode {
    AmountTooSmall = "AMOUNT_TOO_SMALL",
}

export type ErrorData = {
    code?: MayanErrorCode | string;
    message?: string;
    data?: unknown;
};

export function toMayanError(error: unknown): Error {
    const message = extractErrorMessage(error);
    if (message) {
        return new Error(message);
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error("Unknown Mayan error");
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
