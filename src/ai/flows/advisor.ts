'use server';
/**
 * @fileOverview AI Financial Advisor flow.
 *
 * - getFinancialAdvice - Suggests plans based on user balance.
 */

import { ai, z } from '@/ai/genkit';
import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const AdviceInputSchema = z.object({
  balance: z.number().describe('The user\'s current wallet balance.'),
  userName: z.string().describe('The name of the user.'),
});

const AdviceOutputSchema = z.object({
  greeting: z.string().describe('Friendly personalized greeting.'),
  recommendation: z.string().describe('Reasoning for the suggested strategy.'),
  suggestedPlanNames: z.array(z.string()).describe('Names of plans the user should consider.'),
  tip: z.string().describe('A pro-tip for financial growth.'),
});

const getAvailablePlans = ai.defineTool(
  {
    name: 'getAvailablePlans',
    description: 'Returns the current list of available investment plans and their prices.',
    inputSchema: z.void(),
    outputSchema: z.array(z.object({
        name: z.string(),
        price: z.number(),
        dailyIncome: z.number(),
        validity: z.number(),
        stock: z.number().optional()
    })),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const plansCol = collection(firestore, 'investmentPlans');
    const snapshot = await getDocs(plansCol);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            name: data.name,
            price: data.price,
            dailyIncome: data.dailyIncome,
            validity: data.validity,
            stock: data.stock
        };
    }).filter(p => (p.stock === undefined || p.stock > 0));
  }
);

const advisorPrompt = ai.definePrompt({
  name: 'financialAdvisor',
  input: { schema: AdviceInputSchema },
  output: { schema: AdviceOutputSchema },
  tools: [getAvailablePlans],
  prompt: `You are the Grow Money AI Advisor. Your goal is to help {{{userName}}} grow their wealth.
  
User Balance: ₹{{{balance}}}

Use the getAvailablePlans tool to see what is currently available in the market. 
Based on their balance, suggest one or two plans they can afford right now or a strategy to save up for a bigger plan.

Be encouraging, professional, and concise. Don't give legal advice, only platform-specific investment suggestions.`,
});

export async function getFinancialAdvice(input: z.infer<typeof AdviceInputSchema>) {
    const { output } = await advisorPrompt(input);
    if (!output) throw new Error("No advice generated");
    return output;
}
