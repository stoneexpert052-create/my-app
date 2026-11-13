'use server';
/**
 * @fileOverview An AI flow for generating simulated real-time market rates.
 *
 * - getMarketRates - A function that returns a list of current market rates for various commodities.
 * - MarketRate - The type for a single market rate item.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketRateSchema = z.object({
  item: z.string().describe('The name of the commodity or currency (e.g., "Cement", "Gold", "USD").'),
  rate: z.string().describe('The current rate or price of the item as a formatted string (e.g., "PKR 1,250 / bag", "$1 = PKR 278.50").'),
  change: z.string().optional().describe('A string indicating the direction and magnitude of the change, if any (e.g., "+0.50" or "-1.5%").'),
  changeDirection: z.enum(['up', 'down', 'none']).optional().describe('The direction of the price change.'),
});
export type MarketRate = z.infer<typeof MarketRateSchema>;

const MarketRatesOutputSchema = z.object({
    rates: z.array(MarketRateSchema)
});
export type MarketRatesOutput = z.infer<typeof MarketRatesOutputSchema>;


export async function getMarketRates(): Promise<MarketRate[]> {
  const result = await getMarketRatesFlow();
  return result.rates;
}

const prompt = ai.definePrompt({
  name: 'marketRatesPrompt',
  output: { schema: MarketRatesOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are a financial data analyst for a Pakistani construction materials website. Your task is to generate a list of current, realistic (but simulated) market rates for today.

Please provide rates for the following items:
1.  Cement (per bag in PKR)
2.  Steel/Iron (per Ton in PKR)
3.  Gold (per Tola in PKR)
4.  USD to PKR exchange rate
5.  Petrol (per litre in PKR)

Base your generated rates on the general economic trends in Pakistan for early 2025. For each item, provide a realistic current rate, and a small, believable daily change (either positive or negative). The change should be formatted appropriately (e.g., currency amount, percentage).`,
});

const getMarketRatesFlow = ai.defineFlow(
  {
    name: 'getMarketRatesFlow',
    inputSchema: z.void(),
    outputSchema: MarketRatesOutputSchema,
  },
  async () => {
    const { output } = await prompt();
    return output!;
  }
);
