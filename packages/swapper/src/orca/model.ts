export type OrcaRouteDataType = {
    poolAddress: string;
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export class OrcaSwapRouteData {
    private constructor(
        public readonly poolAddress: string,
        public readonly inputMint: string,
        public readonly outputMint: string,
        public readonly amount: string,
        public readonly slippageBps: number,
    ) {}

    static create(fields: OrcaRouteDataType): OrcaSwapRouteData {
        return new OrcaSwapRouteData(
            fields.poolAddress,
            fields.inputMint,
            fields.outputMint,
            fields.amount,
            fields.slippageBps,
        );
    }

    static from(value: unknown): OrcaSwapRouteData {
        if (value instanceof OrcaSwapRouteData) {
            return value;
        }

        if (!isRecord(value)) {
            throw new Error("Invalid Orca route data");
        }

        const fields = value as OrcaRouteDataType;

        return new OrcaSwapRouteData(
            fields.poolAddress,
            fields.inputMint,
            fields.outputMint,
            fields.amount,
            fields.slippageBps,
        );
    }

    toObject(): OrcaRouteDataType {
        return {
            poolAddress: this.poolAddress,
            inputMint: this.inputMint,
            outputMint: this.outputMint,
            amount: this.amount,
            slippageBps: this.slippageBps,
        };
    }

    toJSON(): OrcaRouteDataType {
        return this.toObject();
    }
}
