import { SwapperError } from "@gemwallet/types";

export class SwapperException extends Error {
    readonly swapperError: SwapperError;

    constructor(swapperError: SwapperError) {
        const rawMessage = "message" in swapperError ? swapperError.message : undefined;
        const message = typeof rawMessage === "string" && rawMessage ? rawMessage : swapperError.type;
        super(message);
        this.name = "SwapperException";
        this.swapperError = swapperError;
    }

    static isSwapperException(error: unknown): error is SwapperException {
        return error instanceof SwapperException;
    }
}
