export type OrcaSwapRouteData = {
    poolAddress: string;
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps: number;
};

export function isOrcaRouteData(value: unknown): value is OrcaSwapRouteData {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Partial<OrcaSwapRouteData>;
    return (
        typeof candidate.poolAddress === "string" &&
        typeof candidate.inputMint === "string" &&
        typeof candidate.outputMint === "string" &&
        typeof candidate.amount === "string" &&
        typeof candidate.slippageBps === "number"
    );
}
