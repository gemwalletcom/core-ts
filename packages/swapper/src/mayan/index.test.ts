import { toMayanError } from "./error";
import { SwapperException } from "../error";

describe('toMayanError', () => {
    it('converts "Amount too small (min ~0.01962 SOL)" to input_amount_error', () => {
        const result = toMayanError({ message: "Amount too small (min ~0.01962 SOL)" }, 9);

        expect((result as SwapperException).swapperError).toEqual({
            type: "input_amount_error",
            min_amount: "19620000",
        });
    });

    it('converts "Amount too small" without min to input_amount_error with null', () => {
        const result = toMayanError({ message: "Amount too small" }, 9);

        expect((result as SwapperException).swapperError).toEqual({
            type: "input_amount_error",
            min_amount: null,
        });
    });

    it('returns generic Error for non-amount errors', () => {
        const result = toMayanError({ message: "Network error" }, 9);

        expect(result).not.toBeInstanceOf(SwapperException);
        expect(result.message).toBe("Network error");
    });
});
