import { SwapperException } from "../error";
import type { SquidRouteRequest, SquidRouteResponse, SquidErrorResponse } from "./model";

const SQUID_API_BASE_URL = "https://v2.api.squidrouter.com";

export async function fetchRoute(params: SquidRouteRequest, integratorId: string): Promise<SquidRouteResponse> {
    const response = await fetch(`${SQUID_API_BASE_URL}/v2/route`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-integrator-id": integratorId,
        },
        body: JSON.stringify(params),
    });
    const responseText = await response.text();

    if (!response.ok) {
        let detail: string;
        try {
            const errorBody = JSON.parse(responseText) as SquidErrorResponse;
            detail = errorBody.errors?.[0]?.message || errorBody.message || response.statusText;
        } catch {
            detail = responseText || response.statusText;
        }
        throw new SwapperException({
            type: "compute_quote_error",
            message: `Squid API error ${response.status}: ${detail}`,
        });
    }

    try {
        return JSON.parse(responseText) as SquidRouteResponse;
    } catch {
        throw new SwapperException({
            type: "compute_quote_error",
            message: "Squid API returned an invalid response",
        });
    }
}
