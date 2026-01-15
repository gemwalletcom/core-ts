const PANORA_ROUTER_ENTRY_PARAMS = [
    "0x1::option::Option<signer>",
    "address",
    "u64",
    "u8",
    "vector<u8>",
    "vector<vector<vector<u8>>>",
    "vector<vector<vector<u64>>>",
    "vector<vector<vector<bool>>>",
    "vector<vector<u8>>",
    "vector<vector<vector<address>>>",
    "vector<vector<address>>",
    "vector<vector<address>>",
    "0x1::option::Option<vector<vector<vector<vector<vector<u8>>>>>>",
    "vector<vector<vector<u64>>>",
    "0x1::option::Option<vector<vector<vector<u8>>>>",
    "address",
    "vector<u64>",
    "u64",
    "u64",
    "address",
];

type MoveType =
    | { kind: "option"; value: MoveType }
    | { kind: "vector"; value: MoveType }
    | { kind: "address" }
    | { kind: "signer" }
    | { kind: "primitive"; name: string };

export function normalizePanoraArguments(functionId: string, args: unknown[]): unknown[] {
    const functionKey = functionId.split("::").slice(-2).join("::");
    if (functionKey !== "panora_swap::router_entry") {
        return args;
    }
    if (args.length !== PANORA_ROUTER_ENTRY_PARAMS.length) {
        return args;
    }

    return args.map((value, index) => coerceMoveValue(value, parseMoveType(PANORA_ROUTER_ENTRY_PARAMS[index])));
}

function parseMoveType(type: string): MoveType {
    const trimmed = type.trim();
    if (trimmed.startsWith("0x1::option::Option<") && trimmed.endsWith(">")) {
        return { kind: "option", value: parseMoveType(trimmed.slice("0x1::option::Option<".length, -1)) };
    }
    if (trimmed.startsWith("vector<") && trimmed.endsWith(">")) {
        return { kind: "vector", value: parseMoveType(trimmed.slice("vector<".length, -1)) };
    }
    if (trimmed === "address") {
        return { kind: "address" };
    }
    if (trimmed === "signer" || trimmed === "&signer") {
        return { kind: "signer" };
    }
    return { kind: "primitive", name: trimmed };
}

function coerceMoveValue(value: unknown, type: MoveType): unknown {
    switch (type.kind) {
        case "option":
            if (value === null || value === undefined) {
                return null;
            }
            return coerceMoveValue(value, type.value);
        case "vector":
            if (!Array.isArray(value)) {
                return [];
            }
            if (type.value.kind === "primitive" && type.value.name === "u8") {
                return normalizeU8Vector(value);
            }
            return value.map((entry) => coerceMoveValue(entry, type.value));
        case "address":
        case "signer":
            return String(value);
        case "primitive":
            if (type.name === "bool") {
                return Boolean(value);
            }
            if (type.name === "u8") {
                return coerceU8(value);
            }
            if (type.name.startsWith("u")) {
                return coerceUnsigned(value);
            }
            return value;
    }
}

function coerceUnsigned(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return Math.trunc(value).toString();
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    throw new Error(`Cannot coerce value of type ${typeof value} to an unsigned integer string.`);
}

function coerceU8(value: unknown): number {
    if (typeof value === "number") {
        return Math.trunc(value);
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") {
            throw new Error("Cannot coerce empty string to u8.");
        }
        const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed, 16) : Number.parseInt(trimmed, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    throw new Error(`Cannot coerce value of type ${typeof value} to u8.`);
}

function normalizeU8Vector(value: unknown[]): unknown {
    const bytes: number[] = [];
    for (const entry of value) {
        const parsed = parseU8(entry);
        if (parsed === null) {
            return value.map((item) => coerceU8(item));
        }
        bytes.push(parsed);
    }
    return `0x${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function parseU8(value: unknown): number | null {
    if (typeof value === "number") {
        const parsed = Math.trunc(value);
        return parsed >= 0 && parsed <= 255 ? parsed : null;
    }
    if (typeof value === "bigint") {
        const min = BigInt(0);
        const max = BigInt(255);
        if (value < min || value > max) {
            return null;
        }
        return Number(value);
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        const parsed = trimmed.startsWith("0x")
            ? Number.parseInt(trimmed, 16)
            : Number.parseInt(trimmed, 10);
        if (!Number.isFinite(parsed)) {
            return null;
        }
        const integer = Math.trunc(parsed);
        return integer >= 0 && integer <= 255 ? integer : null;
    }
    return null;
}
