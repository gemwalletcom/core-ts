import type { SquidRouteRequest, SquidRouteResponse, SquidErrorResponse } from "./model";

const SQUID_API_BASE_URL = "https://v2.api.squidrouter.com";

export async function fetchRoute(
    params: SquidRouteRequest,
    integratorId: string,
): Promise<SquidRouteResponse> {
    const response = await fetch(`${SQUID_API_BASE_URL}/v2/route`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-integrator-id": integratorId,
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        let detail: string;
        try {
            const errorBody = (await response.json()) as SquidErrorResponse;
            detail = errorBody.errors?.[0]?.message || errorBody.message || response.statusText;
        } catch {
            detail = await response.text();
        }
        throw new Error(`Squid API error ${response.status}: ${detail}`);
    }

    return (await response.json()) as SquidRouteResponse;
}
