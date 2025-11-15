'use server';
/**
 * @fileOverview A conversational AI flow for answering user questions about their resume and a job description.
 *
 * - askArty - A function that handles the conversational Q&A.
 * - AskArtyInput - The input type for the askArty function.
 * - AskArtyOutput - The return type for the askArty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskArtyInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
  resumeText: z.string().describe('The text content of the resume.'),
  jobDescriptionText: z.string().describe('The text content of the job description.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The previous conversation history.'),
});
export type AskArtyInput = z.infer<typeof AskArtyInputSchema>;

const AskArtyOutputSchema = z.object({
  answer: z.string().describe("Arty's answer to the user's question."),
});
export type AskArtyOutput = z.infer<typeof AskArtyOutputSchema>;

export async function askArty(input: AskArtyInput): Promise<AskArtyOutput> {
  return askArtyFlow(input);
}

const askArtyPrompt = ai.definePrompt({
  name: 'askArtyPrompt',
  input: {schema: AskArtyInputSchema},
  output: {schema: AskArtyOutputSchema},
  prompt: `You are Arty, a friendly and direct career advisor robot. Your goal is to help the user improve their resume and understand how it compares to a job description.

Answer the user's question based *only* on the provided resume and job description. Be concise, helpful, and answer in markdown. If the question is outside the scope of the resume or job description, politely state that you can only answer questions related to those documents.

{{#if chatHistory}}
Here is the conversation history:
{{#each chatHistory}}
{{role}}: {{{content}}}
{{/each}}
{{/if}}

Resume:
{{{resumeText}}}

Job Description:
{{{jobDescriptionText}}}

User's Question:
"{{{question}}}"

Your Answer (as Arty):
`,
});

const askArtyFlow = ai.defineFlow(
  {
    name: 'askArtyFlow',
    inputSchema: AskArtyInputSchema,
    outputSchema: AskArtyOutputSchema,
  },
  async input => {
    const {output} = await askArtyPrompt(input);
    return output!;
  }
);
