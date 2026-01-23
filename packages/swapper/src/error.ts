import { SwapperError } from "@gemwallet/types";

export class SwapperException extends Error {
    readonly swapperError: SwapperError;

    constructor(swapperError: SwapperError) {
        const message = "message" in swapperError && swapperError.message
            ? swapperError.message
            : swapperError.type;
        super(message);
        this.name = "SwapperException";
        this.swapperError = swapperError;
    }

    static isSwapperException(error: unknown): error is SwapperException {
        return error instanceof SwapperException;
    }
}
