export type OrcaSwapRouteData = {
    poolAddress: string;
    swap: {
        amount: string;
        otherAmountThreshold: string;
        sqrtPriceLimit: string;
        amountSpecifiedIsInput: boolean;
        aToB: boolean;
        tickArrays: [string, string, string];
        supplementalTickArrays?: string[];
    };
};

export function isOrcaRouteData(value: unknown): value is OrcaSwapRouteData {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<OrcaSwapRouteData>;
    if (typeof candidate.poolAddress !== "string") {
        return false;
    }

    const swap = candidate.swap as OrcaSwapRouteData["swap"] | undefined;
    if (!swap) {
        return false;
    }

    if (
        typeof swap.amount !== "string" ||
        typeof swap.otherAmountThreshold !== "string" ||
        typeof swap.sqrtPriceLimit !== "string" ||
        typeof swap.amountSpecifiedIsInput !== "boolean" ||
        typeof swap.aToB !== "boolean" ||
        !Array.isArray(swap.tickArrays) ||
        swap.tickArrays.length !== 3 ||
        swap.tickArrays.some((addr) => typeof addr !== "string")
    ) {
        return false;
    }

    if (
        swap.supplementalTickArrays &&
        (!Array.isArray(swap.supplementalTickArrays) ||
            swap.supplementalTickArrays.some(
                (addr) => typeof addr !== "string",
            ))
    ) {
        return false;
    }

    return true;
}
