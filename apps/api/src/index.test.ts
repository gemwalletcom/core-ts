import { errorResponse, httpStatus } from "./error";
import { SwapperError } from "@gemwallet/types";

describe("httpStatus", () => {
  it.each([
    [400, { type: "input_amount_error", min_amount: "100" }],
    [404, { type: "no_quote_available" }],
    [500, { type: "compute_quote_error", message: "error" }],
  ] as const)("returns %i for %s", (expected, err) => {
    expect(httpStatus(err as SwapperError)).toBe(expected);
  });
});

describe("errorResponse", () => {
  it("wraps input_amount_error fields in message object", () => {
    const result = errorResponse({ type: "input_amount_error", min_amount: "19620000" }, null, true);
    expect(result).toEqual({ err: { type: "input_amount_error", message: { min_amount: "19620000" } } });
  });

  it("uses raw error message for compute_quote_error", () => {
    const result = errorResponse({ type: "compute_quote_error", message: "" }, new Error("fail"), true);
    expect(result).toEqual({ err: { type: "compute_quote_error", message: "fail" } });
  });

  it("returns plain error when not structured", () => {
    const result = errorResponse({ type: "compute_quote_error", message: "" }, new Error("fail"), false);
    expect(result).toEqual({ error: "fail" });
  });
});
