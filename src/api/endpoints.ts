/**
 * Catawiki HTTP endpoints, discovered by observing live network traffic.
 *
 * Centralised so the API specs and the route-mocking specs share one
 * definition — if a path moves, exactly one line changes here.
 */

/** Request paths, relative to `baseURL`, for direct API calls. */
export const Endpoints = {
    /** Autocomplete suggestions for the header search field. */
    searchSuggest: '/buyer/api/v1/search/suggest',
} as const;

/** Glob patterns for `page.route()` interception. */
export const RoutePatterns = {
    /**
     * Bid history for a single lot. Server-rendered on first paint, then
     * refreshed client-side from this endpoint — see the mock specs.
     */
    lotBids: '**/buyer/api/v3/lots/*/bids*',
} as const;

/** Shape of a single `search/suggest` entry, as returned by the live API. */
export interface SuggestEntry {
    highlighted: string | null;
    text: string;
    entity: {
        type: string;
        value: string | null;
        url?: string;
        id?: number;
    };
}

/** Top-level `search/suggest` payload. `query_terms` is absent for some queries. */
export interface SuggestResponse {
    query_terms?: SuggestEntry[];
}
