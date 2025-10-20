import { QuoteRequest, Quote, SwapQuoteData } from "@gemwallet/types";

export interface Protocol {
    get_quote(quote: QuoteRequest): Promise<Quote>;
    get_quote_data(quote: Quote): Promise<SwapQuoteData>;
}
