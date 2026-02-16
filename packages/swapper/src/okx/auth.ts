import { createHmac } from "node:crypto";

export const OK_ACCESS_KEY = "OK-ACCESS-KEY";
export const OK_ACCESS_SECRET = "OK-ACCESS-SECRET";
export const OK_ACCESS_SIGN = "OK-ACCESS-SIGN";
export const OK_ACCESS_TIMESTAMP = "OK-ACCESS-TIMESTAMP";
export const OK_ACCESS_PASSPHRASE = "OK-ACCESS-PASSPHRASE";
export const OK_ACCESS_PROJECT = "OK-ACCESS-PROJECT";
export const OKX_API_KEY = "OKX_API_KEY";
export const OKX_SECRET_KEY = "OKX_SECRET_KEY";
export const OKX_API_PASSPHRASE = "OKX_API_PASSPHRASE";
export const OKX_PROJECT_ID = "OKX_PROJECT_ID";

export interface OkxAuthConfig {
  apiKey: string;
  secretKey: string;
  apiPassphrase: string;
  projectId: string;
}

export class OkxAuth {
  constructor(private readonly config: OkxAuthConfig) {}

  static fromEnv(): OkxAuth {
    return new OkxAuth({
      apiKey: process.env.OKX_API_KEY!,
      secretKey: process.env.OKX_SECRET_KEY!,
      apiPassphrase: process.env.OKX_API_PASSPHRASE!,
      projectId: process.env.OKX_PROJECT_ID!,
    });
  }

  buildHeaders(
    method: "GET" | "POST",
    requestPath: string,
    queryOrBody: string,
    timestamp = new Date().toISOString(),
  ): Record<string, string> {
    const message = `${timestamp}${method}${requestPath}${queryOrBody}`;
    const signature = createHmac("sha256", this.config.secretKey)
      .update(message)
      .digest("base64");

    return {
      "Content-Type": "application/json",
      [OK_ACCESS_KEY]: this.config.apiKey,
      [OK_ACCESS_SIGN]: signature,
      [OK_ACCESS_TIMESTAMP]: timestamp,
      [OK_ACCESS_PASSPHRASE]: this.config.apiPassphrase,
      [OK_ACCESS_PROJECT]: this.config.projectId,
    };
  }
}
