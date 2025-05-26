import { QuoteRequest, Quote, QuoteData } from "@gemwallet/types";

// Re-export the types for other modules to use
export { QuoteRequest, Quote, QuoteData };

export interface Protocol {
    get_quote(quote: QuoteRequest): Promise<Quote>;
    get_quote_data(quote: Quote): Promise<QuoteData>;
}
