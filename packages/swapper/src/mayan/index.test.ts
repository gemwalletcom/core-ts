import { SwapperException } from "../error";
import { toMayanError } from "./error";

describe("toMayanError", () => {
    it('converts "Amount too small (min ~0.01962 SOL)" to input_amount_error', () => {
        const result = toMayanError({ message: "Amount too small (min ~0.01962 SOL)" }, 9);

        expect((result as SwapperException).swapperError).toEqual({
            type: "input_amount_error",
            message: { min_amount: "19620000" },
        });
    });

    it('converts "Amount too small" without min to input_amount_error without min_amount', () => {
        const result = toMayanError({ message: "Amount too small" }, 9);

        expect((result as SwapperException).swapperError).toEqual({
            type: "input_amount_error",
            message: {},
        });
    });

    it("returns generic Error for non-amount errors", () => {
        const result = toMayanError({ message: "Network error" }, 9);

        expect(result).not.toBeInstanceOf(SwapperException);
        expect(result.message).toBe("Network error");
    });
});
