import { createHmac } from "node:crypto";

export interface OkxClientConfig {
    apiKey: string;
    secretKey: string;
    apiPassphrase: string;
    projectId: string;
}

export function buildQueryString(params: object): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return "";
    return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

export function sign(timestamp: string, method: string, path: string, secretKey: string): string {
    return createHmac("sha256", secretKey).update(timestamp + method + path).digest("base64");
}

const HEADER_KEY = "OK-ACCESS-KEY";
const HEADER_SIGN = "OK-ACCESS-SIGN";
const HEADER_TIMESTAMP = "OK-ACCESS-TIMESTAMP";
const HEADER_PASSPHRASE = "OK-ACCESS-PASSPHRASE";
const HEADER_PROJECT = "OK-ACCESS-PROJECT";

export function buildHeaders(config: OkxClientConfig, timestamp: string, fullPath: string): Record<string, string> {
    return {
        "Content-Type": "application/json",
        [HEADER_KEY]: config.apiKey,
        [HEADER_SIGN]: sign(timestamp, "GET", fullPath, config.secretKey),
        [HEADER_TIMESTAMP]: timestamp,
        [HEADER_PASSPHRASE]: config.apiPassphrase,
        [HEADER_PROJECT]: config.projectId,
    };
}
