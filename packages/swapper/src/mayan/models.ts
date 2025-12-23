export type ErrorData = {
    code?: string;
    msg?: string;
    message?: string;
    data?: {
        minAmountIn?: number;
    };
};

export function isErrorData(value: unknown): value is ErrorData {
    if (!value || typeof value !== "object") return false;
    const obj = value as Record<string, unknown>;
    return typeof obj.code === "string" || typeof obj.msg === "string" || typeof obj.message === "string";
}
